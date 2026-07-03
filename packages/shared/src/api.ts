/** 웹 ↔ BFF 간 tRPC 마운트 경로 계약 */
export const TRPC_ENDPOINT = '/trpc';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
