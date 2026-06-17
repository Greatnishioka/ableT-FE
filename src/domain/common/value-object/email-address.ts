export class EmailAddress {
  protected constructor(readonly value: string) {}

  static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      throw new Error("Email address is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Email address format is invalid.");
    }

    return new EmailAddress(normalized);
  }
}
