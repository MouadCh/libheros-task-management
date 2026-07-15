/**
 * Realtime socket lifecycle hooks.
 * Client singleton lives in utils/realtime-client.ts.
 */
import {
  connectRealtime,
  disconnectRealtime,
  syncRealtimeAccessToken,
  syncRealtimeListRoom,
} from '../utils/realtime-client';

export function useRealtime() {
  function connect(): void {
    connectRealtime();
  }

  function disconnect(): void {
    disconnectRealtime();
  }

  function syncListRoom(listId: string | null): void {
    syncRealtimeListRoom(listId);
  }

  function syncAccessToken(): void {
    syncRealtimeAccessToken();
  }

  return {
    connect,
    disconnect,
    syncListRoom,
    syncAccessToken,
  };
}
