/**
 * Realtime socket lifecycle hooks.
 * Phase 7 will wire Socket.IO connect/disconnect here.
 */
export function useRealtime() {
  function disconnect(): void {
    // No-op until Phase 7 WebSocket client ships.
  }

  return {
    disconnect,
  };
}
