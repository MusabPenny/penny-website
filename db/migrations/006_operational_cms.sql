INSERT INTO public.permissions(key,description) VALUES('directory.manage','Uređivanje lokacija i tima');
INSERT INTO public.role_permissions(role_id,permission_id) SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permissions p WHERE r.name IN ('ADMIN','SUPER_ADMIN') AND p.key='directory.manage';

CREATE TABLE public.site_directory (
 kind text NOT NULL CHECK(kind IN ('location','member')), id text NOT NULL CHECK(id ~ '^[a-z0-9][a-z0-9-]{0,149}$'),
 data jsonb NOT NULL CHECK(octet_length(data::text)<20000), published boolean NOT NULL DEFAULT true,
 position int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,id)
);
ALTER TABLE public.site_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_directory FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.site_directory TO service_role;
CREATE FUNCTION public.penny_directory_public(p_kind text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'data',data) ORDER BY position,id),'[]') FROM public.site_directory WHERE kind=p_kind AND published;
$$;
CREATE FUNCTION public.penny_directory_admin(p_tenant_id uuid,p_object_id uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; item public.site_directory; target text; k text; d jsonb;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id); PERFORM penny_admin.check_permission(actor,'directory.manage');
 k:=p_payload->>'kind';
 IF k NOT IN ('location','member') THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 IF p_action='save' THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(20261029,6);
  target:=p_payload->>'id'; d:=p_payload->'data';
  SELECT * INTO item FROM public.site_directory WHERE kind=k AND id=target;
  IF FOUND AND item.updated_at IS DISTINCT FROM (p_payload->>'version')::timestamptz THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  IF length(coalesce(d->>'name','')) NOT BETWEEN 2 AND 200 OR octet_length(d::text)>=20000 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  INSERT INTO public.site_directory(kind,id,data,published,position) VALUES(k,target,d,coalesce((p_payload->>'published')::boolean,true),coalesce((p_payload->>'position')::int,0))
  ON CONFLICT(kind,id) DO UPDATE SET data=EXCLUDED.data,published=EXCLUDED.published,position=EXCLUDED.position,updated_at=clock_timestamp();
  IF k='member' THEN
   UPDATE public.site_directory SET data=jsonb_set(data,'{departmentName}',to_jsonb(d->>'departmentName')),updated_at=clock_timestamp()
    WHERE kind='member' AND data->>'departmentId'=d->>'departmentId' AND data->>'departmentName' IS DISTINCT FROM d->>'departmentName';
  END IF;
  PERFORM penny_admin.audit((actor->>'id')::uuid,'DIRECTORY_SAVE','directory',NULL,jsonb_build_object('kind',k,'id',target));
 ELSIF p_action<>'list' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 RETURN coalesce((SELECT jsonb_agg(x ORDER BY position,id) FROM public.site_directory x WHERE kind=k),'[]'::jsonb);
END; $$;

CREATE TABLE public.site_slug_history(kind text NOT NULL,slug text NOT NULL,entry_id uuid NOT NULL REFERENCES public.site_entries(id) ON DELETE CASCADE,PRIMARY KEY(kind,slug));
ALTER TABLE public.site_slug_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_slug_history FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.site_slug_history TO service_role;
CREATE FUNCTION penny_admin.remember_content_slug() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.site_slug_history WHERE kind=NEW.kind AND slug=NEW.slug AND entry_id<>NEW.id) THEN RAISE EXCEPTION 'SLUG_RESERVED'; END IF;
 IF TG_OP='UPDATE' AND OLD.slug<>NEW.slug THEN
  INSERT INTO public.site_slug_history(kind,slug,entry_id) VALUES(OLD.kind,OLD.slug,OLD.id) ON CONFLICT(kind,slug) DO NOTHING;
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER remember_content_slug BEFORE INSERT OR UPDATE ON public.site_entries FOR EACH ROW EXECUTE FUNCTION penny_admin.remember_content_slug();

CREATE FUNCTION public.penny_read_entries(p_kind text DEFAULT NULL,p_slug text DEFAULT NULL,p_limit int DEFAULT 100,p_offset int DEFAULT 0,p_summary boolean DEFAULT true) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(CASE WHEN p_summary THEN to_jsonb(x)||jsonb_build_object('body','') ELSE to_jsonb(x) END),'[]') FROM (
  SELECT e.* FROM public.site_entries e WHERE e.status='PUBLISHED' AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now()) AND (p_kind IS NULL OR e.kind=p_kind)
  AND (p_slug IS NULL OR e.slug=p_slug OR EXISTS(SELECT 1 FROM public.site_slug_history h WHERE h.kind=e.kind AND h.slug=p_slug AND h.entry_id=e.id))
  ORDER BY e.starts_at DESC,e.id LIMIT greatest(1,least(p_limit,500)) OFFSET greatest(0,p_offset)
 ) x;
$$;
CREATE FUNCTION public.penny_browse_entries(p_tenant_id uuid,p_object_id uuid,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; result jsonb; k text:=p_payload->>'kind'; skip int:=greatest(0,least(9999,coalesce((p_payload->>'page')::int,1)-1))*10;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id); PERFORM penny_admin.check_permission(actor,CASE WHEN k='job' THEN 'jobs.manage' ELSE 'content.manage' END);
 WITH filtered AS (
 SELECT e.*,CASE WHEN e.status<>'PUBLISHED' THEN e.status WHEN e.starts_at>now() THEN 'SCHEDULED' WHEN e.ends_at<=now() THEN 'EXPIRED' ELSE 'PUBLISHED' END state
 FROM public.site_entries e WHERE e.kind=k
 AND (coalesce(p_payload->>'id','')='' OR e.id::text=p_payload->>'id')
 AND NOT EXISTS(SELECT 1 FROM regexp_split_to_table(trim(coalesce(p_payload->>'query','')),'\s+') word WHERE word<>'' AND position(translate(lower(word),'đščćž','dsccz') IN translate(lower(e.title||' '||e.location||' '||coalesce(e.asset_name,'')),'đščćž','dsccz'))=0)
 ), matched AS (SELECT * FROM filtered WHERE coalesce(p_payload->>'status','')='' OR state=p_payload->>'status'), page AS (
 SELECT * FROM matched ORDER BY
 CASE WHEN p_payload->>'sort'='title' THEN title END,
 CASE WHEN p_payload->>'sort'='oldest' THEN starts_at END ASC,
 CASE WHEN p_payload->>'sort'='updated' THEN updated_at END DESC,
 starts_at DESC,id LIMIT 10 OFFSET skip)
 SELECT jsonb_build_object('entries',coalesce((SELECT jsonb_agg(to_jsonb(page)-'state'||CASE WHEN coalesce(p_payload->>'id','')='' THEN jsonb_build_object('body','') ELSE '{}'::jsonb END) FROM page),'[]'),'total',(SELECT count(*) FROM matched),
 'missingDeadlines',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title)) FROM public.site_entries WHERE kind=k AND status='PUBLISHED' AND ends_at IS NULL),'[]')) INTO result;
 RETURN result;
END; $$;
CREATE FUNCTION public.penny_browse_subscribers(p_tenant_id uuid,p_object_id uuid,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; result jsonb;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id); PERFORM penny_admin.check_permission(actor,'content.manage');
 WITH filtered AS (SELECT id,email,subscribed_at,unsubscribed_at FROM public.newsletter_subscribers
 WHERE position(lower(coalesce(p_payload->>'query','')) IN lower(email))>0
 AND (coalesce(p_payload->>'status','')='' OR CASE WHEN unsubscribed_at IS NULL THEN 'active' ELSE 'inactive' END=p_payload->>'status')),
 page AS (SELECT * FROM filtered ORDER BY subscribed_at DESC,id LIMIT 15 OFFSET greatest(0,least(9999,coalesce((p_payload->>'page')::int,1)-1))*15)
 SELECT jsonb_build_object('entries',coalesce((SELECT jsonb_agg(page) FROM page),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result; RETURN result;
END; $$;

ALTER TABLE public.recruitment_mail_queue ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX recruitment_mail_due_idx ON public.recruitment_mail_queue(next_attempt_at) WHERE status IN ('pending','failed');
CREATE FUNCTION public.penny_mail_workspace(p_tenant_id uuid,p_object_id uuid,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; result jsonb;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id); PERFORM penny_admin.check_permission(actor,'applications.manage');
 WITH filtered AS (SELECT * FROM public.recruitment_mail_queue WHERE coalesce(p_payload->>'status','')='' OR status=p_payload->>'status'), page AS (
 SELECT * FROM filtered ORDER BY updated_at DESC,id LIMIT 25 OFFSET greatest(0,least(9999,coalesce((p_payload->>'page')::int,1)-1))*25)
 SELECT jsonb_build_object('settings',(SELECT to_jsonb(s) FROM public.recruitment_mail_settings s WHERE singleton),'queue',coalesce((SELECT jsonb_agg(page) FROM page),'[]'),'total',(SELECT count(*) FROM filtered)) INTO result; RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.penny_directory_public(text),public.penny_directory_admin(uuid,uuid,text,jsonb),public.penny_read_entries(text,text,int,int,boolean),public.penny_browse_entries(uuid,uuid,jsonb),public.penny_browse_subscribers(uuid,uuid,jsonb),public.penny_mail_workspace(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.penny_directory_public(text),public.penny_directory_admin(uuid,uuid,text,jsonb),public.penny_read_entries(text,text,int,int,boolean),public.penny_browse_entries(uuid,uuid,jsonb),public.penny_browse_subscribers(uuid,uuid,jsonb),public.penny_mail_workspace(uuid,uuid,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
