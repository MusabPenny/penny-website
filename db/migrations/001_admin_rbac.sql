-- New private application tables only. Existing objects with these names cause
-- a failure for manual inspection; nothing is dropped or silently overwritten.
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  object_id uuid NOT NULL,
  email varchar(320),
  display_name varchar(200) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DISABLED')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, object_id)
);
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(64) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(64) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  action varchar(64) NOT NULL,
  target_type varchar(64) NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet
);
CREATE INDEX app_users_status_idx ON public.app_users(status);
CREATE INDEX app_users_created_idx ON public.app_users(created_at DESC);
CREATE INDEX user_roles_role_idx ON public.user_roles(role_id);
CREATE INDEX role_permissions_permission_idx ON public.role_permissions(permission_id);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs(actor_user_id, created_at DESC);

-- Keep admin data inaccessible through the public Supabase Data API.
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_users, public.roles, public.permissions, public.user_roles, public.role_permissions, public.audit_logs FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.app_users, public.roles, public.permissions, public.user_roles, public.role_permissions, public.audit_logs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.app_users, public.roles, public.permissions, public.user_roles, public.role_permissions, public.audit_logs FROM authenticated;
  END IF;
END $$;

-- Dedicated NOLOGIN privilege group. Provision a separate runtime login and
-- grant membership out of band; do not give the web runtime table ownership.
CREATE ROLE penny_website_backend NOLOGIN;
GRANT USAGE ON SCHEMA public TO penny_website_backend;
GRANT SELECT ON public.app_users, public.roles, public.permissions, public.user_roles, public.role_permissions, public.audit_logs TO penny_website_backend;
GRANT INSERT ON public.app_users, public.roles, public.permissions, public.user_roles, public.role_permissions, public.audit_logs TO penny_website_backend;
GRANT UPDATE ON public.app_users, public.roles TO penny_website_backend;
GRANT DELETE ON public.user_roles, public.role_permissions TO penny_website_backend;
CREATE POLICY backend_access ON public.app_users TO penny_website_backend USING(true) WITH CHECK(true);
CREATE POLICY backend_access ON public.roles TO penny_website_backend USING(true) WITH CHECK(true);
CREATE POLICY backend_access ON public.permissions TO penny_website_backend USING(true) WITH CHECK(true);
CREATE POLICY backend_access ON public.user_roles TO penny_website_backend USING(true) WITH CHECK(true);
CREATE POLICY backend_access ON public.role_permissions TO penny_website_backend USING(true) WITH CHECK(true);
CREATE POLICY backend_access ON public.audit_logs TO penny_website_backend USING(true) WITH CHECK(true);

INSERT INTO public.permissions(key, description) VALUES
 ('dashboard.read','Pregled dashboarda'), ('users.read','Pregled korisnika'),
 ('users.approve','Odobravanje korisnika'), ('users.disable','Deaktivacija korisnika'),
 ('users.manage_roles','Dodjela i uklanjanje uloga'), ('roles.read','Pregled uloga'),
 ('roles.manage','Upravljanje dozvolama uloga'), ('audit.read','Pregled audit loga');
INSERT INTO public.roles(name, description) VALUES
 ('SUPER_ADMIN','Sve definisane dozvole; kontrolisano inicijalizovanje'),
 ('ADMIN','Eksplicitno dodijeljene administrativne dozvole'),
 ('USER','Osnovni pristup po odobrenju administratora');
INSERT INTO public.role_permissions(role_id, permission_id)
 SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p WHERE r.name='SUPER_ADMIN';
-- ADMIN and USER deliberately start without permissions. No user is seeded.
