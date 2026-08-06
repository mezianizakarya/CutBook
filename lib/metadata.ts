import type { Role } from "./roles";

declare global {
  interface UserUnsafeMetadata {
    role?: Role;
    roleUpdatedAt?: number;
    profileCompleted?: boolean;
    disabled?: boolean;
    phone?: string;
    onboardingStep?: string;
  }
}

export interface OnboardingMetadata {
  role?: Role;
  roleUpdatedAt?: number;
  profileCompleted?: boolean;
  disabled?: boolean;
  phone?: string;
  onboardingStep?: string;
}
