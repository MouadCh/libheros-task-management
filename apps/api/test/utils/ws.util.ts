import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import { buildAppUrl, DEFAULT_APP_HOST } from '@libheros/contracts';
import { io, type Socket } from 'socket.io-client';
import type { App } from 'supertest/types';
import { WS_AUTH_TOKEN_KEY } from '../../src/realtime/constants/realtime.constants';
import {
  WS_E2E_CONNECT_TIMEOUT_MS,
  WS_E2E_ERROR_MESSAGES,
  WS_E2E_EVENT_TIMEOUT_MS,
  WS_E2E_TRANSPORT,
} from '../constants/ws-e2e.constants';

export function getWebSocketBaseUrl(app: INestApplication<App>): string {
  const address = (app.getHttpServer() as HttpServer).address() as AddressInfo | string | null;

  if (!address || typeof address === 'string') {
    throw new Error(WS_E2E_ERROR_MESSAGES.listenRequired);
  }

  return buildAppUrl({ host: DEFAULT_APP_HOST, port: address.port });
}

function createSocketClient(baseUrl: string, auth?: Record<string, string>): Socket {
  return io(baseUrl, {
    ...(auth ? { auth } : {}),
    transports: [WS_E2E_TRANSPORT],
    forceNew: true,
  });
}

export async function connectAuthenticatedSocket(
  baseUrl: string,
  accessToken: string,
): Promise<Socket> {
  const socket = createSocketClient(baseUrl, { [WS_AUTH_TOKEN_KEY]: accessToken });
  await waitForSocketConnect(socket);
  return socket;
}

export async function connectUnauthenticatedSocket(baseUrl: string): Promise<Socket> {
  const socket = createSocketClient(baseUrl);
  await waitForSocketConnectAttempt(socket);
  return socket;
}

export async function connectInvalidTokenSocket(
  baseUrl: string,
  accessToken: string,
): Promise<Socket> {
  const socket = createSocketClient(baseUrl, { [WS_AUTH_TOKEN_KEY]: accessToken });
  await waitForSocketConnectAttempt(socket);
  return socket;
}

export function waitForSocketConnect(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(WS_E2E_ERROR_MESSAGES.connectTimeout));
    }, WS_E2E_CONNECT_TIMEOUT_MS);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once('connect_error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export function waitForSocketConnectAttempt(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, WS_E2E_CONNECT_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };

    const onConnect = (): void => {
      cleanup();
      resolve();
    };

    const onConnectError = (): void => {
      cleanup();
      resolve();
    };

    const onDisconnect = (): void => {
      cleanup();
      resolve();
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
  });
}

export function waitForSocketEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(WS_E2E_ERROR_MESSAGES.eventTimeout(event)));
    }, WS_E2E_EVENT_TIMEOUT_MS);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export function emitWithAck<TPayload, TResponse>(
  socket: Socket,
  event: string,
  payload: TPayload,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(WS_E2E_EVENT_TIMEOUT_MS)
      .emit(event, payload, (error: Error, response: TResponse) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      });
  });
}

export async function closeSocket(socket: Socket): Promise<void> {
  if (!socket.connected) {
    socket.removeAllListeners();
    return;
  }

  await new Promise<void>((resolve) => {
    socket.once('disconnect', () => resolve());
    socket.disconnect();
  });
}

export function waitForEventPropagationGrace(graceMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, graceMs);
  });
}
