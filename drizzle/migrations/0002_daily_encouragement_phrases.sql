CREATE TABLE public.daily_phrases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 text text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_phrases TO authenticated;
GRANT ALL ON public.daily_phrases TO service_role;
ALTER TABLE public.daily_phrases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active phrases" ON public.daily_phrases FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage phrases" ON public.daily_phrases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.get_daily_phrase()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
 SELECT text FROM public.daily_phrases
 WHERE active AND auth.uid() IS NOT NULL
 ORDER BY md5(((now() AT TIME ZONE 'America/Sao_Paulo')::date)::text || id::text), id
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_daily_phrase() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_phrase() TO authenticated, service_role;