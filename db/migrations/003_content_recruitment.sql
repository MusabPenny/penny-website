INSERT INTO public.permissions(key,description) VALUES
 ('jobs.manage','Upravljanje oglasima za posao'),
 ('applications.manage','Pregled i obrada prijava'),
 ('content.manage','Novosti, katalozi, akcije i dokumenti');
INSERT INTO public.roles(name,description) VALUES ('MARKETING','Novosti, katalozi, akcije i javni dokumenti; bez prijava kandidata');
INSERT INTO public.role_permissions(role_id,permission_id)
 SELECT r.id,p.id FROM public.roles r CROSS JOIN public.permissions p
 WHERE (r.name IN ('SUPER_ADMIN','ADMIN') AND p.key IN ('jobs.manage','applications.manage','content.manage','dashboard.read'))
 OR (r.name='MARKETING' AND p.key IN ('dashboard.read','content.manage')) ON CONFLICT DO NOTHING;

CREATE TABLE public.site_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('job','news','catalog','promotion','document','partner')),
 slug text NOT NULL CHECK(slug ~ '^[a-z0-9][a-z0-9-]{0,149}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 200),
 summary text NOT NULL DEFAULT '' CHECK(length(summary)<=1000),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=50000),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
 starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 asset_path text, asset_name text, asset_mime text,
 source_url text, location text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,slug), CHECK(ends_at IS NULL OR ends_at>starts_at)
);
CREATE INDEX site_entries_public_idx ON public.site_entries(kind,status,starts_at DESC);
CREATE TABLE public.candidate_applications (
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('job','internship')),
 job_id uuid REFERENCES public.site_entries(id) ON DELETE RESTRICT,
 job_title text NOT NULL,
 first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL,
 answers jsonb NOT NULL, attachments jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','REVIEWING','SHORTLISTED','ACCEPTED','REJECTED')),
 notes text NOT NULL DEFAULT '',
 consent_at timestamptz NOT NULL DEFAULT now(), privacy_version text NOT NULL DEFAULT '2026-10-29',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX candidate_applications_created_idx ON public.candidate_applications(created_at DESC);
CREATE INDEX candidate_applications_email_idx ON public.candidate_applications(lower(email),created_at DESC);
CREATE TABLE public.site_form_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, attempts int NOT NULL
);
ALTER TABLE public.site_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_form_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_entries,public.candidate_applications,public.site_form_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.site_entries,public.candidate_applications,public.site_form_limits TO service_role;
GRANT DELETE ON public.candidate_applications TO service_role;

CREATE FUNCTION public.penny_public_entries(p_kind text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(e ORDER BY e.starts_at DESC,e.id),'[]') FROM public.site_entries e
 WHERE e.status='PUBLISHED' AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now()) AND (p_kind IS NULL OR e.kind=p_kind);
$$;

CREATE FUNCTION public.penny_content_execute(p_tenant_id uuid,p_object_id uuid,p_action text,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; item public.site_entries; candidate public.candidate_applications; result jsonb; required_key text; target uuid;
BEGIN
 actor:=penny_admin.app_user(p_tenant_id,p_object_id);
 IF p_action IN ('entries','save','archive') THEN
  required_key:=CASE WHEN p_payload->>'kind'='job' THEN 'jobs.manage' ELSE 'content.manage' END;
 ELSE required_key:='applications.manage'; END IF;
 PERFORM penny_admin.check_permission(actor,required_key);
 IF p_action='entries' THEN
  SELECT coalesce(jsonb_agg(e ORDER BY e.updated_at DESC),'[]') INTO result FROM public.site_entries e WHERE e.kind=p_payload->>'kind'; RETURN result;
 ELSIF p_action IN ('save','archive') THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(20261029,1);
  target:=coalesce(nullif(p_payload->>'id','')::uuid,gen_random_uuid());
  SELECT * INTO item FROM public.site_entries WHERE id=target;
  IF FOUND AND item.kind<>p_payload->>'kind' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF FOUND AND item.updated_at IS DISTINCT FROM (p_payload->>'version')::timestamptz THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  IF p_action='archive' THEN
   UPDATE public.site_entries SET status='ARCHIVED',updated_at=clock_timestamp() WHERE id=target RETURNING to_jsonb(site_entries.*) INTO result;
   IF result IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  ELSE
   INSERT INTO public.site_entries(id,kind,slug,title,summary,body,status,starts_at,ends_at,asset_path,asset_name,asset_mime,source_url,location)
   VALUES(target,p_payload->>'kind',p_payload->>'slug',p_payload->>'title',coalesce(p_payload->>'summary',''),coalesce(p_payload->>'body',''),p_payload->>'status',coalesce((p_payload->>'starts_at')::timestamptz,now()),(p_payload->>'ends_at')::timestamptz,p_payload->>'asset_path',p_payload->>'asset_name',p_payload->>'asset_mime',p_payload->>'source_url',coalesce(p_payload->>'location',''))
   ON CONFLICT(id) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,summary=EXCLUDED.summary,body=EXCLUDED.body,status=EXCLUDED.status,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,asset_path=EXCLUDED.asset_path,asset_name=EXCLUDED.asset_name,asset_mime=EXCLUDED.asset_mime,source_url=EXCLUDED.source_url,location=EXCLUDED.location,updated_at=clock_timestamp()
   RETURNING to_jsonb(site_entries.*) INTO result;
  END IF;
  PERFORM penny_admin.audit((actor->>'id')::uuid,'CONTENT_'||upper(p_action),'content',target,jsonb_build_object('kind',p_payload->>'kind','status',result->>'status'));
  RETURN result;
 ELSIF p_action='applications' THEN
  SELECT coalesce(jsonb_agg(x),'[]') INTO result FROM (
   SELECT a.id,a.kind,a.job_title,a.first_name,a.last_name,a.email,a.status,a.created_at FROM public.candidate_applications a
   WHERE (coalesce(p_payload->>'status','')='' OR a.status=p_payload->>'status')
   AND (coalesce(p_payload->>'kind','')='' OR a.kind=p_payload->>'kind')
   ORDER BY a.created_at DESC,a.id LIMIT 25 OFFSET ((greatest(1,least(10000,coalesce((p_payload->>'page')::int,1)))-1)*25)
  ) x; RETURN result;
 ELSIF p_action IN ('application','application_update','application_delete') THEN
  target:=(p_payload->>'id')::uuid;
  SELECT * INTO candidate FROM public.candidate_applications WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  IF p_action='application_update' THEN
   IF length(coalesce(p_payload->>'notes',''))>10000 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
   UPDATE public.candidate_applications SET status=p_payload->>'status',notes=coalesce(p_payload->>'notes',''),updated_at=clock_timestamp() WHERE id=target RETURNING * INTO candidate;
  ELSIF p_action='application_delete' THEN
   DELETE FROM public.candidate_applications WHERE id=target;
  END IF;
  PERFORM penny_admin.audit((actor->>'id')::uuid,upper(p_action),'application',target,'{}');
  RETURN to_jsonb(candidate);
 END IF;
 RAISE EXCEPTION 'INVALID_INPUT';
END; $$;

CREATE FUNCTION public.penny_form_reserve(p_key text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n int;
BEGIN
 IF p_key !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 INSERT INTO public.site_form_limits(key,window_start,attempts) VALUES(p_key,now(),1)
 ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN site_form_limits.window_start<now()-interval '1 hour' THEN 1 ELSE site_form_limits.attempts+1 END,
 window_start=CASE WHEN site_form_limits.window_start<now()-interval '1 hour' THEN now() ELSE site_form_limits.window_start END RETURNING attempts INTO n;
 IF n>5 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
END; $$;

CREATE FUNCTION public.penny_submit_application(p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target uuid; title text; attachment jsonb;
BEGIN
 IF p_payload->>'kind' NOT IN ('job','internship') OR length(p_payload->>'email')>320 OR length(p_payload->>'first_name') NOT BETWEEN 1 AND 100 OR length(p_payload->>'last_name') NOT BETWEEN 1 AND 100 OR octet_length((p_payload->'answers')::text)>50000 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 target:=(p_payload->>'id')::uuid;
 IF p_payload->>'kind'='job' AND nullif(p_payload->>'job_id','') IS NOT NULL THEN
  SELECT e.title INTO title FROM public.site_entries e WHERE e.id=(p_payload->>'job_id')::uuid AND e.kind='job' AND e.status='PUBLISHED' AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now()) FOR SHARE;
  IF title IS NULL THEN RAISE EXCEPTION 'JOB_CLOSED'; END IF;
 ELSE title:=CASE WHEN p_payload->>'kind'='internship' THEN 'Stručna praksa' ELSE 'Otvorena prijava' END; END IF;
 IF jsonb_array_length(p_payload->'attachments')>3 THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 FOR attachment IN SELECT value FROM jsonb_array_elements(p_payload->'attachments') LOOP
  IF attachment->>'path' NOT LIKE target::text||'/%' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 END LOOP;
 INSERT INTO public.candidate_applications(id,kind,job_id,job_title,first_name,last_name,email,answers,attachments)
 VALUES(target,p_payload->>'kind',nullif(p_payload->>'job_id','')::uuid,title,p_payload->>'first_name',p_payload->>'last_name',p_payload->>'email',p_payload->'answers',p_payload->'attachments');
 RETURN target;
END; $$;
REVOKE ALL ON FUNCTION public.penny_public_entries(text),public.penny_content_execute(uuid,uuid,text,jsonb),public.penny_form_reserve(text),public.penny_submit_application(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.penny_public_entries(text),public.penny_content_execute(uuid,uuid,text,jsonb),public.penny_form_reserve(text),public.penny_submit_application(jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
