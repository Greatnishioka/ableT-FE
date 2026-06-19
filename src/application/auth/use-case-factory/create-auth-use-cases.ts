import type {
  AuthRepository,
  LoginCommand,
} from "@/src/application/auth/ports/auth-repository";

type AuthUseCases = {
  [K in keyof AuthRepository]: AuthRepository[K];
};

export function createAuthUseCases(authRepository: AuthRepository): AuthUseCases {
  return {
    login: async (command: LoginCommand) => {
      await authRepository.login(command);
    }
  };
}
