import type { Socket } from 'socket.io';

export interface AuthenticatedSocketState {
  userId: string;
  activeListId?: string;
}

const socketStateByClient = new WeakMap<Socket, AuthenticatedSocketState>();

export function setSocketState(socket: Socket, state: AuthenticatedSocketState): void {
  socketStateByClient.set(socket, state);
}

export function tryGetSocketState(socket: Socket): AuthenticatedSocketState | undefined {
  return socketStateByClient.get(socket);
}

export function getSocketState(socket: Socket): AuthenticatedSocketState {
  const state = tryGetSocketState(socket);

  if (!state) {
    throw new Error('Unauthenticated socket');
  }

  return state;
}

export function clearSocketState(socket: Socket): void {
  socketStateByClient.delete(socket);
}

export function getSocketUserId(socket: Socket): string {
  return getSocketState(socket).userId;
}

export function getActiveListId(socket: Socket): string | undefined {
  return getSocketState(socket).activeListId;
}

export function setActiveListId(socket: Socket, listId: string): void {
  const state = getSocketState(socket);
  state.activeListId = listId;
  socketStateByClient.set(socket, state);
}

export function clearActiveListId(socket: Socket): void {
  const state = getSocketState(socket);
  delete state.activeListId;
  socketStateByClient.set(socket, state);
}
