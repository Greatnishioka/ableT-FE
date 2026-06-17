import type { LoginCommand } from "@/src/application/ports/auth/auth-repository";
import { AuthEmailAddress } from "@/src/domain/auth/value-object/auth-email-address";
import { AuthPassword } from "@/src/domain/auth/value-object/auth-password";
import type { LoginViewModel } from "@/src/presentation/login/view-model/login-view-model";

export function toLoginCommand(viewModel: LoginViewModel): LoginCommand {
  return {
    email: AuthEmailAddress.create(viewModel.email),
    password: AuthPassword.create(viewModel.password),
  };
}
