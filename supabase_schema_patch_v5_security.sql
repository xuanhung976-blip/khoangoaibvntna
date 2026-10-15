-- SECURITY CUTOVER
-- Chỉ chạy sau khi Vercel đã có SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY,
-- và frontend đã dùng /api/clinical cho dữ liệu bệnh nhân.

BEGIN;

DO $security_cutover$
DECLARE
  table_name text;
  protected_tables text[] := ARRAY[
    'patients', 'users', 'vip_patients', 'daily_on_call', 'daily_briefing',
    'scientific_meetings', 'new_techniques', 'communication_contents',
    'five_s_zones', 'five_s_evaluations', 'five_s_improvements',
    'system_configs', 'logs', 'staff_tasks', 'role_permissions'
  ];
BEGIN
  FOREACH table_name IN ARRAY protected_tables LOOP
    IF to_regclass('public.' || quote_ident(table_name)) IS NOT NULL THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Allow public read/write on ' || table_name,
        table_name
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
        table_name
      );
    END IF;
  END LOOP;
END
$security_cutover$;

-- service_role vẫn truy cập qua API server và bypass RLS theo thiết kế Supabase.
COMMIT;

-- Kiểm tra sau khi chạy:
-- SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';
-- SET ROLE anon; SELECT count(*) FROM public.patients; -- phải bị từ chối
