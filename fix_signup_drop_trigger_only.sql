-- Minimal fix if the full trigger script fails in SQL Editor.
-- Run this alone — signup will work via the frontend fallback in SignupPage.tsx.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
