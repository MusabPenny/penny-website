-- Preserve existing ads for HR review; require a deadline on future publication/edits.
CREATE FUNCTION penny_admin.require_job_deadline() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.kind='job' AND NEW.status='PUBLISHED' AND NEW.ends_at IS NULL THEN
  RAISE EXCEPTION 'JOB_DEADLINE_REQUIRED';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER require_job_deadline BEFORE INSERT OR UPDATE ON public.site_entries
 FOR EACH ROW EXECUTE FUNCTION penny_admin.require_job_deadline();

CREATE TABLE public.recruitment_mail_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 sender text NOT NULL DEFAULT '',
 recipients text[] NOT NULL DEFAULT '{}',
 candidate_confirmation boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.recruitment_mail_settings(singleton) VALUES(true);
CREATE TABLE public.recruitment_mail_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
 audience text NOT NULL CHECK(audience IN ('hr','candidate')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','failed','uncertain')),
 attempts int NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(application_id,audience)
);
ALTER TABLE public.recruitment_mail_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_mail_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recruitment_mail_settings,public.recruitment_mail_queue FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,UPDATE ON public.recruitment_mail_settings TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recruitment_mail_queue TO service_role;

CREATE FUNCTION penny_admin.queue_application_mail() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE settings public.recruitment_mail_settings;
BEGIN
 SELECT * INTO settings FROM public.recruitment_mail_settings WHERE singleton;
 IF settings.enabled THEN
  INSERT INTO public.recruitment_mail_queue(application_id,audience) VALUES(NEW.id,'hr');
  IF settings.candidate_confirmation THEN
   INSERT INTO public.recruitment_mail_queue(application_id,audience) VALUES(NEW.id,'candidate');
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER queue_application_mail AFTER INSERT ON public.candidate_applications
 FOR EACH ROW EXECUTE FUNCTION penny_admin.queue_application_mail();

CREATE FUNCTION public.penny_recruitment_mail(p_tenant_id uuid,p_object_id uuid,p_action text,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; addresses text[]; sender_address text; enabled_value boolean;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id);
 PERFORM penny_admin.check_permission(actor,'applications.manage');
 IF p_action='save' THEN
  SELECT coalesce(array_agg(DISTINCT lower(trim(value))),'{}') INTO addresses FROM jsonb_array_elements_text(p_payload->'recipients');
  sender_address:=lower(trim(coalesce(p_payload->>'sender','')));
  enabled_value:=coalesce((p_payload->>'enabled')::boolean,false);
  IF cardinality(addresses)>20 OR EXISTS(SELECT 1 FROM unnest(addresses) a WHERE length(a)>320 OR a !~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$')
    OR (sender_address<>'' AND (length(sender_address)>320 OR sender_address !~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$'))
    OR (enabled_value AND (sender_address='' OR cardinality(addresses)=0)) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  UPDATE public.recruitment_mail_settings SET enabled=enabled_value,sender=sender_address,recipients=addresses,
   candidate_confirmation=coalesce((p_payload->>'candidate_confirmation')::boolean,false),updated_at=clock_timestamp() WHERE singleton;
  PERFORM penny_admin.audit((actor->>'id')::uuid,'RECRUITMENT_MAIL_SETTINGS','settings',NULL,jsonb_build_object('enabled',enabled_value,'recipient_count',cardinality(addresses)));
 ELSIF p_action='retry' THEN
  -- Never automatically repeat an ambiguous Graph timeout: delivery may have happened.
  IF NOT EXISTS(SELECT 1 FROM public.recruitment_mail_queue WHERE id=(p_payload->>'id')::uuid AND status IN ('pending','failed')) THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  PERFORM penny_admin.audit((actor->>'id')::uuid,'RECRUITMENT_MAIL_RETRY','notification',(p_payload->>'id')::uuid,'{}');
  RETURN p_payload;
 ELSIF p_action<>'read' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 RETURN jsonb_build_object('settings',(SELECT to_jsonb(s) FROM public.recruitment_mail_settings s WHERE singleton),
  'queue',coalesce((SELECT jsonb_agg(q) FROM (SELECT id,application_id,audience,status,attempts,updated_at FROM public.recruitment_mail_queue ORDER BY updated_at DESC LIMIT 50) q),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.penny_recruitment_mail(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.penny_recruitment_mail(uuid,uuid,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
