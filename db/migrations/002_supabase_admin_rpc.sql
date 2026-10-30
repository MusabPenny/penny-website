-- Admin access over Supabase Data API. No Supabase Auth session is involved.
-- RPC callers must hold the server-only secret key; identity arguments MUST
-- come from the verified Auth.js session, never from browser form fields.
CREATE SCHEMA penny_admin;
REVOKE ALL ON SCHEMA penny_admin FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA penny_admin TO service_role;

CREATE FUNCTION penny_admin.app_user(p_tenant uuid, p_object uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT to_jsonb(u) || jsonb_build_object(
   'roles', ARRAY(SELECT r.name FROM public.roles r JOIN public.user_roles ur ON ur.role_id=r.id WHERE ur.user_id=u.id ORDER BY r.name),
   'permissions', ARRAY(SELECT DISTINCT p.key FROM public.permissions p JOIN public.role_permissions rp ON rp.permission_id=p.id JOIN public.user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=u.id ORDER BY p.key)
 ) FROM public.app_users u WHERE u.tenant_id=p_tenant AND u.object_id=p_object;
$$;
CREATE FUNCTION penny_admin.check_permission(p_actor jsonb, p_permission text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF p_actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT401', MESSAGE='UNAUTHENTICATED'; END IF;
 IF p_actor->>'status' <> 'APPROVED' OR NOT (p_actor->'permissions' ? p_permission) THEN
   RAISE EXCEPTION USING ERRCODE='PT403', MESSAGE='FORBIDDEN';
 END IF;
END;
$$;
CREATE FUNCTION penny_admin.audit(p_actor uuid, p_action text, p_type text, p_target uuid, p_details jsonb DEFAULT '{}')
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 INSERT INTO public.audit_logs(actor_user_id,action,target_type,target_id,details) VALUES(p_actor,p_action,p_type,p_target,p_details);
$$;
CREATE FUNCTION penny_admin.protect_superadmin(p_target jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF p_target->>'status'='APPROVED' AND p_target->'roles' ? 'SUPER_ADMIN'
 AND (SELECT count(*) FROM public.app_users u JOIN public.user_roles ur ON ur.user_id=u.id JOIN public.roles r ON r.id=ur.role_id WHERE u.status='APPROVED' AND r.name='SUPER_ADMIN') <= 1 THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='LAST_SUPERADMIN';
 END IF;
END;
$$;

CREATE FUNCTION public.penny_admin_execute(p_tenant_id uuid, p_object_id uuid, p_action text, p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 actor jsonb; target jsonb; target_id uuid; role_record public.roles;
 role_keys text[]; previous_keys text[]; new_keys text[];
 result jsonb; new_status text; changed integer; role_id uuid;
 query_text text; filter_status text; page_offset integer;
BEGIN
 IF p_action IN ('login','login_denied','logout','approve','disable','assign','remove','permissions') THEN
   PERFORM pg_catalog.pg_advisory_xact_lock(20261020,1);
 END IF;
 IF p_action='login_denied' THEN
   PERFORM penny_admin.audit(NULL,'LOGIN_DENIED','identity',NULL,'{"reason":"INVALID_IDENTITY_OR_ACCESS_ROLE"}');
   RETURN 'null'::jsonb;
 END IF;
 IF p_tenant_id IS NULL OR p_object_id IS NULL THEN
   RAISE EXCEPTION USING ERRCODE='PT401', MESSAGE='UNAUTHENTICATED';
 END IF;
 IF p_action='login' THEN
   INSERT INTO public.app_users(tenant_id,object_id,email,display_name)
   VALUES(p_tenant_id,p_object_id,left(p_payload->>'email',320),coalesce(left(p_payload->>'displayName',200),'Microsoft korisnik'))
   ON CONFLICT(tenant_id,object_id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,updated_at=now();
   actor := penny_admin.app_user(p_tenant_id,p_object_id);
   IF actor->>'status'='APPROVED' THEN
     UPDATE public.app_users SET last_login_at=now() WHERE id=(actor->>'id')::uuid;
   END IF;
   PERFORM penny_admin.audit((actor->>'id')::uuid,CASE WHEN actor->>'status'='APPROVED' THEN 'LOGIN_SUCCESS' ELSE 'LOGIN_DENIED' END,'user',(actor->>'id')::uuid,jsonb_build_object('reason',actor->>'status'));
   RETURN penny_admin.app_user(p_tenant_id,p_object_id);
 END IF;
 actor := penny_admin.app_user(p_tenant_id,p_object_id);
 IF p_action='user' THEN RETURN actor; END IF;
 IF p_action='logout' THEN
   IF actor IS NOT NULL THEN PERFORM penny_admin.audit((actor->>'id')::uuid,'LOGOUT','user',(actor->>'id')::uuid); END IF;
   RETURN 'null'::jsonb;
 END IF;

 IF p_action='users' THEN
   PERFORM penny_admin.check_permission(actor,'users.read');
   query_text := '%' || left(coalesce(p_payload->>'query',''),100) || '%';
   filter_status := coalesce(p_payload->>'status','');
   IF filter_status NOT IN ('','PENDING','APPROVED','DISABLED') THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT'; END IF;
   page_offset := (greatest(1,least(10000,coalesce((p_payload->>'page')::int,1)))-1)*25;
   SELECT jsonb_build_object('total',(SELECT count(*) FROM public.app_users u WHERE (u.display_name ILIKE query_text OR coalesce(u.email,'') ILIKE query_text) AND (filter_status='' OR u.status=filter_status)),
     'users',coalesce((SELECT jsonb_agg(penny_admin.app_user(x.tenant_id,x.object_id)) FROM (SELECT u.tenant_id,u.object_id FROM public.app_users u WHERE (u.display_name ILIKE query_text OR coalesce(u.email,'') ILIKE query_text) AND (filter_status='' OR u.status=filter_status) ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET page_offset) x),'[]')) INTO result;
   RETURN result;
 ELSIF p_action='roles' THEN
   IF actor->>'status'='APPROVED' AND actor->'permissions' ? 'users.manage_roles' THEN NULL;
   ELSE PERFORM penny_admin.check_permission(actor,'roles.read'); END IF;
   SELECT coalesce(jsonb_agg(x ORDER BY x.name),'[]') INTO result FROM (
     SELECT r.*,ARRAY(SELECT p.key FROM public.permissions p JOIN public.role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=r.id ORDER BY p.key) AS permissions FROM public.roles r
   ) x;
   RETURN result;
 ELSIF p_action='audit' THEN
   PERFORM penny_admin.check_permission(actor,'audit.read');
   page_offset := (greatest(1,least(10000,coalesce((p_payload->>'page')::int,1)))-1)*30;
   SELECT coalesce(jsonb_agg(x),'[]') INTO result FROM (
     SELECT a.*,u.display_name AS actor_name FROM public.audit_logs a LEFT JOIN public.app_users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC,a.id LIMIT 30 OFFSET page_offset
   ) x;
   RETURN result;
 ELSIF p_action='counts' THEN
   PERFORM penny_admin.check_permission(actor,'users.read');
   SELECT jsonb_build_object('total',count(*),'approved',count(*) FILTER(WHERE status='APPROVED'),'pending',count(*) FILTER(WHERE status='PENDING'),'disabled',count(*) FILTER(WHERE status='DISABLED')) INTO result FROM public.app_users;
   RETURN result;
 END IF;

 IF p_action IS NULL OR p_action NOT IN ('approve','disable','assign','remove','permissions') THEN
   RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT';
 END IF;
 PERFORM penny_admin.check_permission(actor,CASE p_action WHEN 'approve' THEN 'users.approve' WHEN 'disable' THEN 'users.disable' WHEN 'permissions' THEN 'roles.manage' ELSE 'users.manage_roles' END);
 target_id := (p_payload->>'targetId')::uuid;
 IF target_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT'; END IF;
 IF p_action='permissions' THEN
   SELECT * INTO role_record FROM public.roles r WHERE r.id=target_id;
   IF NOT FOUND OR role_record.name='SUPER_ADMIN' THEN RAISE EXCEPTION USING ERRCODE='PT403',MESSAGE='FORBIDDEN'; END IF;
   IF jsonb_typeof(p_payload->'keys') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT'; END IF;
   SELECT coalesce(array_agg(k),'{}') INTO new_keys FROM jsonb_array_elements_text(p_payload->'keys') k;
   IF cardinality(new_keys) <> (SELECT count(DISTINCT k) FROM unnest(new_keys) k)
     OR EXISTS(SELECT 1 FROM unnest(new_keys) k WHERE NOT EXISTS(SELECT 1 FROM public.permissions p WHERE p.key=k)) THEN
     RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT';
   END IF;
   SELECT coalesce(array_agg(p.key),'{}') INTO previous_keys FROM public.permissions p JOIN public.role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=target_id;
   IF EXISTS(SELECT 1 FROM unnest(new_keys || previous_keys) k WHERE NOT (actor->'permissions' ? k)) THEN RAISE EXCEPTION USING ERRCODE='PT403',MESSAGE='FORBIDDEN'; END IF;
   IF EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=(actor->>'id')::uuid AND ur.role_id=target_id) THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='SELF_CHANGE'; END IF;
   DELETE FROM public.role_permissions rp WHERE rp.role_id=target_id;
   INSERT INTO public.role_permissions(role_id,permission_id) SELECT target_id,p.id FROM public.permissions p WHERE p.key=ANY(new_keys);
   PERFORM penny_admin.audit((actor->>'id')::uuid,'ROLE_PERMISSIONS_UPDATED','role',target_id,jsonb_build_object('before',previous_keys,'after',new_keys));
   RETURN 'null'::jsonb;
 END IF;
 SELECT penny_admin.app_user(u.tenant_id,u.object_id) INTO target FROM public.app_users u WHERE u.id=target_id;
 IF target IS NULL THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT'; END IF;
 IF target->'roles' ? 'SUPER_ADMIN' AND NOT (actor->'roles' ? 'SUPER_ADMIN') THEN RAISE EXCEPTION USING ERRCODE='PT403',MESSAGE='FORBIDDEN'; END IF;
 IF p_action IN ('approve','disable') THEN
   new_status := CASE WHEN p_action='approve' THEN 'APPROVED' ELSE 'DISABLED' END;
   IF p_action='disable' THEN PERFORM penny_admin.protect_superadmin(target); END IF;
   IF target_id=(actor->>'id')::uuid THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='SELF_CHANGE'; END IF;
   IF target->>'status'=new_status THEN RETURN 'null'::jsonb; END IF;
   UPDATE public.app_users SET status=new_status,updated_at=now() WHERE id=target_id;
   PERFORM penny_admin.audit((actor->>'id')::uuid,CASE WHEN p_action='approve' THEN 'USER_APPROVED' ELSE 'USER_DISABLED' END,'user',target_id,jsonb_build_object('before',target->>'status','after',new_status));
   RETURN 'null'::jsonb;
 END IF;
 role_id := (p_payload->>'roleId')::uuid;
 SELECT * INTO role_record FROM public.roles r WHERE r.id=role_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='INVALID_INPUT'; END IF;
 IF role_record.name='SUPER_ADMIN' AND NOT (actor->'roles' ? 'SUPER_ADMIN') THEN RAISE EXCEPTION USING ERRCODE='PT403',MESSAGE='FORBIDDEN'; END IF;
 SELECT coalesce(array_agg(p.key),'{}') INTO role_keys FROM public.permissions p JOIN public.role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=role_record.id;
 IF EXISTS(SELECT 1 FROM unnest(role_keys) k WHERE NOT (actor->'permissions' ? k)) THEN RAISE EXCEPTION USING ERRCODE='PT403',MESSAGE='FORBIDDEN'; END IF;
 IF p_action='remove' AND role_record.name='SUPER_ADMIN' THEN PERFORM penny_admin.protect_superadmin(target); END IF;
 IF target_id=(actor->>'id')::uuid THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='SELF_CHANGE'; END IF;
 IF p_action='assign' THEN
   INSERT INTO public.user_roles(user_id,role_id,assigned_by) VALUES(target_id,role_record.id,(actor->>'id')::uuid) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_roles ur WHERE ur.user_id=target_id AND ur.role_id=role_record.id;
 END IF;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed>0 THEN PERFORM penny_admin.audit((actor->>'id')::uuid,CASE WHEN p_action='assign' THEN 'ROLE_ASSIGNED' ELSE 'ROLE_REMOVED' END,'user',target_id,jsonb_build_object('roleId',role_record.id,'roleName',role_record.name)); END IF;
 RETURN 'null'::jsonb;
END;
$$;

-- Manual bootstrap only: private schema, NO grant to the web service role.
CREATE FUNCTION penny_admin.bootstrap(p_tenant uuid,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE user_id uuid; super_role uuid;
BEGIN
 IF p_tenant IS NULL OR p_object IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(20261020,1);
 INSERT INTO public.app_users(tenant_id,object_id,display_name,status) VALUES(p_tenant,p_object,'Inicijalni superadministrator','APPROVED') ON CONFLICT(tenant_id,object_id) DO UPDATE SET status='APPROVED',updated_at=now() RETURNING id INTO user_id;
 INSERT INTO public.roles(name,description) VALUES('SUPER_ADMIN','Sve definisane dozvole') ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id INTO super_role;
 INSERT INTO public.role_permissions(role_id,permission_id) SELECT super_role,p.id FROM public.permissions p ON CONFLICT DO NOTHING;
 INSERT INTO public.user_roles(user_id,role_id,assigned_by) VALUES(user_id,super_role,user_id) ON CONFLICT DO NOTHING;
 PERFORM penny_admin.audit(user_id,'SUPERADMIN_BOOTSTRAPPED','user',user_id,'{"source":"manual-script"}');
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA penny_admin FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION penny_admin.app_user(uuid,uuid),penny_admin.check_permission(jsonb,text),penny_admin.audit(uuid,text,text,uuid,jsonb),penny_admin.protect_superadmin(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.penny_admin_execute(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.penny_admin_execute(uuid,uuid,text,jsonb) TO service_role;
REVOKE ALL ON public.app_users,public.roles,public.permissions,public.user_roles,public.role_permissions,public.audit_logs FROM service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.app_users,public.roles,public.permissions,public.user_roles,public.role_permissions,public.audit_logs TO service_role;
GRANT INSERT,UPDATE ON public.app_users TO service_role;
GRANT INSERT,DELETE ON public.user_roles,public.role_permissions TO service_role;
GRANT INSERT ON public.audit_logs TO service_role;
NOTIFY pgrst, 'reload schema';
