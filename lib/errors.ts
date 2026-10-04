// A failure the person can act on. It carries a code, not English text, so the page can word it
// in the reader's language (see the `errors` maps in lib/i18n/messages).
export class UserError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export const errorCode = (e: unknown, fallback = "failed") => (e instanceof UserError ? e.code : fallback);
