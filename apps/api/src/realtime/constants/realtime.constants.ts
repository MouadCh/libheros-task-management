export { WS_AUTH_TOKEN_KEY } from '@libheros/contracts';

export const WS_ACK_SUCCESS_RESPONSE = { success: true } as const;

export function buildWsJoinFailureResponse(message: string): {
  success: false;
  message: string;
} {
  return { success: false, message };
}
