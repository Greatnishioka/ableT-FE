import { createLoginUseCase } from "@/src/application/auth/login";
import { authApiAdapter } from "@/src/infrastructure/api/auth/auth-api-adapter";

export const login = createLoginUseCase(authApiAdapter);
