import type {
  AuthRepository,
  LoginCommand,
} from "@/src/application/ports/auth/auth-repository";

export function createLoginUseCase(authRepository: AuthRepository) {
  return async function login(command: LoginCommand): Promise<void> {
    await authRepository.login(command);
  };
}
