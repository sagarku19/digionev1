-- Function hardening: remove EXECUTE from PUBLIC/anon/authenticated on
-- SECURITY DEFINER / trigger functions so they cannot be invoked directly
-- by untrusted roles. Triggers still fire (they run as the table owner),
-- and service-role retains execute.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_confirmed() from public, anon, authenticated;
revoke execute on function public.sum_bucket_bytes_for_prefix(text, text) from public, anon, authenticated;
