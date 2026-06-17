import type { AuthEmailAddress } from "@/src/domain/auth/value-object/auth-email-address";
import type { AuthPassword } from "@/src/domain/auth/value-object/auth-password";

export type LoginCommand = {
  email: AuthEmailAddress;
  password: AuthPassword;
};

export interface AuthRepository {
  login(command: LoginCommand): Promise<void>;
}
