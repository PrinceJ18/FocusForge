/**
 * Safely extracts a human-readable message from an unknown caught value.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String(err.message);
  return 'An unexpected error occurred';
}
