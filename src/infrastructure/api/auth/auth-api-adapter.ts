import type { AuthRepository } from "@/src/application/auth/ports/auth-repository";
import { AuthenticationFailedError } from "@/src/application/auth/error/auth-errors";
import { mapAuthError } from "@/src/infrastructure/api/auth/mappers/auth-error-mapper";
import { Fetcher } from "@/src/shared/api/client";

export const authApiAdapter: AuthRepository = {
  async login(command) {
    try {
      const { error, response } = await Fetcher.POST("/api/login", {
        body: {
          email: command.email.value,
          password: command.password.value,
        },
      });

      if (!error) {
        return;
      }

      if (response.status === 422) {
        throw new AuthenticationFailedError();
      }

      throw new Error(`Login request failed with status ${response.status}.`);
    } catch (error) {
      throw mapAuthError(error);
    }
  },
};
