export function mapAuthError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unexpected authentication error.");
}
