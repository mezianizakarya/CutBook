-- ============================================================================
-- Fine-grained onboarding progress.
--
-- Mirrored from Clerk unsafe_metadata.onboardingStep by the Clerk webhook
-- (service_role). NOT writable by clients — mirror-only, same as
-- onboarding_completed. "complete" == every step done.
-- ============================================================================

alter table public.profiles
  add column onboarding_step text
    constraint profiles_onboarding_step_check
    check (onboarding_step in ('basics', 'professional', 'shop', 'complete'));
