import { EmailAddress } from "@/src/domain/common/value-object/email-address";

export class AuthEmailAddress extends EmailAddress {
  private constructor(readonly value: string) {
    super(value);
  }
}
