@echo off
REM Deploy MacroMedica edge functions (requires Supabase CLI: npm i -g supabase)
REM Link once: supabase login && supabase link --project-ref YOUR_PROJECT_REF

where supabase >nul 2>&1
if errorlevel 1 (
  echo Supabase CLI not found. Install: npm install -g supabase
  echo Or deploy manually in Dashboard: Project ^> Edge Functions
  exit /b 1
)

supabase functions deploy invite-secretary --no-verify-jwt
supabase functions deploy set-pin --no-verify-jwt
supabase functions deploy verify-pin --no-verify-jwt

echo Done. Edge functions deployed.
