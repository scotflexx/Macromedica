-- SECURITY: legacy rdv-lifecycle RPCs had no role or clinic guard.
--
-- start_consultation(p_rdv_id) and complete_consultation(p_rdv_id) are
-- SECURITY DEFINER, executable by every authenticated user, and only check the
-- rdv's arrival_status. Reproduced (rolled-back test): a doctor of clinic B moved
-- clinic A's WAITING appointment to IN_CONSULTATION and then completed it
-- (status='completed', payment_status='UNPAID'). The same calls also succeeded as
-- the anonymous role (no login, only the public key shipped in the frontend),
-- because both functions were executable by anon and never checked auth.uid().
--
-- The frontend never calls them: the src/lib/api.ts wrappers are dead code, and
-- ConsultationWorkspace uses the 7-argument complete_consultation(uuid, text, ...)
-- overload, which is guarded and is NOT touched here. Revoking is therefore the
-- least invasive fix and matches 20260913020000_lock_down_legacy_salle_attente_rpcs.
--
-- If an rdv-based lifecycle is wanted later, reintroduce it with
-- mm_assert_role + mm_assert_same_clinic like mm_mark_appointment_arrived.

revoke execute on function public.start_consultation(uuid) from public, anon, authenticated;
revoke execute on function public.complete_consultation(uuid) from public, anon, authenticated;
