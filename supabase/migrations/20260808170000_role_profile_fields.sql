-- ============================================================================
-- Barber professional fields (role-specific onboarding).
--
-- specialty + years_of_experience are filled in by barbers during the
-- "professional" onboarding step. Null for customers/owners.
-- ============================================================================

alter table public.profiles
  add column specialty text,
  add column years_of_experience integer
    constraint profiles_years_of_experience_check
    check (years_of_experience between 0 and 100);
