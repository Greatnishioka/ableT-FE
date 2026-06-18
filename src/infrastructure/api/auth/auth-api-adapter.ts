import type { AuthRepository } from "@/src/application/auth/ports/auth-repository";
import { AuthenticationFailedError } from "@/src/application/auth/error/auth-errors";
import { mapAuthError } from "@/src/infrastructure/api/auth/mappers/auth-error-mapper";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password123";

export const authApiAdapter: AuthRepository = {
  async login(command) {
    try {
      await wait(300);

      if (
        command.email.value !== DEMO_EMAIL ||
        command.password.value !== DEMO_PASSWORD
      ) {
        throw new AuthenticationFailedError();
      }
    } catch (error) {
      throw mapAuthError(error);
    }
  },
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
