import { isClerkAPIResponseError } from "@clerk/expo";
import { t } from "@/lib/i18n";

export type ClerkLikeError = {
  code: string;
  message: string;
  longMessage?: string;
};

/** Prefer the user-friendly longMessage, falling back to the developer message. */
export function errorMessage(error: ClerkLikeError | null | undefined): string | null {
  if (!error) {
    return null;
  }
  return error.longMessage ?? error.message;
}

/** Formats any thrown value into a user-friendly message. */
export function errorMessageFromUnknown(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors?.[0];
    if (first?.longMessage) {
      return first.longMessage;
    }
    if (first?.message) {
      return first.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object") {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  console.error("Unhandled error thrown in app:", error);
  return t("common.error");
}
