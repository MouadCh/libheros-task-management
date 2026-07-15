export const WS_AUTH_TOKEN_KEY = 'token';

export const WS_ACK_SUCCESS_RESPONSE = { success: true } as const;

export function buildWsJoinFailureResponse(message: string): {
  success: false;
  message: string;
} {
  return { success: false, message };
}
