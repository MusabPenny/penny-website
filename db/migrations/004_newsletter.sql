CREATE TABLE public.newsletter_subscribers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 subscribed_at timestamptz NOT NULL DEFAULT now(), unsubscribed_at timestamptz
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_subscribers FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.newsletter_subscribers TO service_role;
CREATE FUNCTION public.penny_newsletter(p_action text,p_payload jsonb,p_tenant_id uuid DEFAULT NULL,p_object_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor jsonb; token uuid; target uuid;
BEGIN
 IF p_action='subscribe' THEN
  IF length(p_payload->>'email')>320 OR p_payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  INSERT INTO public.newsletter_subscribers(email) VALUES(lower(p_payload->>'email'))
  ON CONFLICT(email) DO UPDATE SET subscribed_at=now(),unsubscribed_at=NULL,unsubscribe_token=gen_random_uuid()
  RETURNING unsubscribe_token INTO token; RETURN jsonb_build_object('token',token);
 ELSIF p_action='unsubscribe' THEN
  UPDATE public.newsletter_subscribers SET unsubscribed_at=now() WHERE unsubscribe_token=(p_payload->>'token')::uuid;
  RETURN '{}'::jsonb;
 END IF;
 actor:=penny_admin.app_user(p_tenant_id,p_object_id);
 PERFORM penny_admin.check_permission(actor,'content.manage');
 IF p_action='list' THEN
  RETURN coalesce((SELECT jsonb_agg(x) FROM (SELECT id,email,subscribed_at,unsubscribed_at FROM public.newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 500) x),'[]'::jsonb);
 ELSIF p_action='delete' THEN
  target:=(p_payload->>'id')::uuid;
  DELETE FROM public.newsletter_subscribers WHERE id=target;
  PERFORM penny_admin.audit((actor->>'id')::uuid,'NEWSLETTER_DELETE','subscriber',target,'{}');RETURN '{}'::jsonb;
 END IF;
 RAISE EXCEPTION 'INVALID_INPUT';
END; $$;
REVOKE ALL ON FUNCTION public.penny_newsletter(text,jsonb,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.penny_newsletter(text,jsonb,uuid,uuid) TO service_role;
