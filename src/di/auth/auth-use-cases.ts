import { createLoginUseCase } from "@/src/application/auth/use-case-factory/create-auth-use-cases";
import { authApiAdapter } from "@/src/infrastructure/api/auth/auth-api-adapter";

export const login = createLoginUseCase(authApiAdapter);
