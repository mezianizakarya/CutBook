import { isClerkAPIResponseError } from "@clerk/expo";

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
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
