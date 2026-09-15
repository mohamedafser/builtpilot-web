-- Fix public client portal: security-definer RPCs were still subject to RLS,
-- so a valid share link looked invalid. Safe to re-run.

alter function public.lookup_client_portal(text) security definer;
alter function public.lookup_client_portal(text) set search_path = public;
alter function public.lookup_client_portal(text) set row_security = off;

alter function public.resolve_client_portal(text) security definer;
alter function public.resolve_client_portal(text) set search_path = public;
alter function public.resolve_client_portal(text) set row_security = off;

alter function public.client_portal_reports(text, integer, integer) security definer;
alter function public.client_portal_reports(text, integer, integer) set search_path = public;
alter function public.client_portal_reports(text, integer, integer) set row_security = off;

alter function public.client_portal_report(text, uuid) security definer;
alter function public.client_portal_report(text, uuid) set search_path = public;
alter function public.client_portal_report(text, uuid) set row_security = off;

alter function public.client_portal_report_manpower(text, uuid) security definer;
alter function public.client_portal_report_manpower(text, uuid) set search_path = public;
alter function public.client_portal_report_manpower(text, uuid) set row_security = off;

alter function public.client_portal_photos(text, integer, integer) security definer;
alter function public.client_portal_photos(text, integer, integer) set search_path = public;
alter function public.client_portal_photos(text, integer, integer) set row_security = off;

alter function public.client_portal_boq_items(text) security definer;
alter function public.client_portal_boq_items(text) set search_path = public;
alter function public.client_portal_boq_items(text) set row_security = off;

alter function public.client_portal_measurements(text, integer, integer) security definer;
alter function public.client_portal_measurements(text, integer, integer) set search_path = public;
alter function public.client_portal_measurements(text, integer, integer) set row_security = off;

alter function public.client_portal_quotation(text) security definer;
alter function public.client_portal_quotation(text) set search_path = public;
alter function public.client_portal_quotation(text) set row_security = off;

alter function public.client_portal_quotation_items(text) security definer;
alter function public.client_portal_quotation_items(text) set search_path = public;
alter function public.client_portal_quotation_items(text) set row_security = off;

alter function public.client_portal_cost_totals(text) security definer;
alter function public.client_portal_cost_totals(text) set search_path = public;
alter function public.client_portal_cost_totals(text) set row_security = off;

grant execute on function public.resolve_client_portal(text)
  to anon, authenticated;
grant execute on function public.client_portal_reports(text, integer, integer)
  to anon, authenticated;
grant execute on function public.client_portal_report(text, uuid)
  to anon, authenticated;
grant execute on function public.client_portal_report_manpower(text, uuid)
  to anon, authenticated;
grant execute on function public.client_portal_photos(text, integer, integer)
  to anon, authenticated;
grant execute on function public.client_portal_boq_items(text)
  to anon, authenticated;
grant execute on function public.client_portal_measurements(text, integer, integer)
  to anon, authenticated;
grant execute on function public.client_portal_quotation(text)
  to anon, authenticated;
grant execute on function public.client_portal_quotation_items(text)
  to anon, authenticated;
grant execute on function public.client_portal_cost_totals(text)
  to anon, authenticated;

notify pgrst, 'reload schema';
