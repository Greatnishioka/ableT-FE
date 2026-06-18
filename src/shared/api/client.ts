import createClient from "openapi-fetch";

import { apiBaseUrl } from "@/src/shared/config/api-config";
import type { paths } from "@/src/shared/api/schema";

// 腐敗防止層の入り口です。もし、APIクライアントの実装を差し替える必要が出てきた場合は、
// このファイルもしくはinfrastructureのファイルのみを編集すれば問題ないようにする。
export const Fetcher = createClient<paths>({
  baseUrl: apiBaseUrl,
  credentials: "include",
});
