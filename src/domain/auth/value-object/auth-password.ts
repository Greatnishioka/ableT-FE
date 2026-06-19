import { Password } from "@/src/domain/common/value-object/password";

export class AuthPassword extends Password {
  private constructor(readonly value: string) {
    super(value);
  }

  static create(value: string): AuthPassword {
    const password = Password.create(value);

    return new AuthPassword(password.value);
  }
}
