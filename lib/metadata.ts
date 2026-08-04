import type { Role } from "./roles";

declare global {
  interface UserUnsafeMetadata {
    role?: Role;
    profileCompleted?: boolean;
    disabled?: boolean;
    phone?: string;
    onboardingStep?: string;
  }
}

export interface OnboardingMetadata {
  role?: Role;
  profileCompleted?: boolean;
  disabled?: boolean;
  phone?: string;
  onboardingStep?: string;
}
