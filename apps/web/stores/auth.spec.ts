import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import type { UserDto } from '@libheros/contracts';
import { clearSession } from '../utils/auth-session';

const mockDisconnect = mock(() => undefined);
const mockNavigateTo = mock(() => Promise.resolve());

const mockApi = {
  refresh: mock(() => Promise.resolve({ accessToken: 'token' })),
  me: mock(() => Promise.resolve({} as UserDto)),
  login: mock(() => Promise.resolve({ accessToken: 'token', user: {} as UserDto })),
  register: mock(() => Promise.resolve({ accessToken: 'token', user: {} as UserDto })),
  logout: mock(() => Promise.resolve({ success: true as const })),
};

mock.module('../composables/useApiClient', () => ({
  useApiClient: () => mockApi,
}));

mock.module('../composables/useRealtime', () => ({
  useRealtime: () => ({ disconnect: mockDisconnect }),
}));

mock.module('nuxt/app', () => ({
  navigateTo: mockNavigateTo,
}));

const sampleUser: UserDto = {
  id: 'user-1',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearSession();
    mockApi.refresh.mockReset();
    mockApi.me.mockReset();
    mockApi.login.mockReset();
    mockApi.register.mockReset();
    mockApi.logout.mockReset();
    mockDisconnect.mockReset();
    mockNavigateTo.mockReset();
  });

  it('does not wipe a login that completes while bootstrap refresh is in flight', async () => {
    const { useAuthStore } = await import('./auth');
    const store = useAuthStore();

    let resolveRefresh!: (value: { accessToken: string }) => void;
    mockApi.refresh.mockImplementation(
      () =>
        new Promise<{ accessToken: string }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockApi.login.mockResolvedValue({
      accessToken: 'login-token',
      user: sampleUser,
    });

    const bootstrapPromise = store.bootstrap();
    await store.login({ email: sampleUser.email, password: 'SecurePass1' });

    expect(store.isAuthenticated).toBe(true);
    expect(store.accessToken).toBe('login-token');

    resolveRefresh({ accessToken: 'stale-bootstrap-token' });
    await bootstrapPromise;

    expect(store.isAuthenticated).toBe(true);
    expect(store.accessToken).toBe('login-token');
    expect(store.user).toEqual(sampleUser);
    expect(store.status).toBe('ready');
  });

  it('clears the access token when me fails after refresh', async () => {
    const { useAuthStore } = await import('./auth');
    const store = useAuthStore();

    mockApi.refresh.mockResolvedValue({ accessToken: 'access-token' });
    mockApi.me.mockRejectedValue(new Error('network unavailable'));

    await store.bootstrap();

    expect(store.accessToken).toBeNull();
    expect(store.user).toBeNull();
    expect(store.status).toBe('error');
    expect(store.isAuthenticated).toBe(false);
  });

  it('loads me with skipAuthRefresh during refreshSession to avoid deadlock', async () => {
    const { useAuthStore } = await import('./auth');
    const store = useAuthStore();

    mockApi.refresh.mockResolvedValue({ accessToken: 'rotated-token' });
    mockApi.me.mockResolvedValue(sampleUser);

    const token = await store.refreshSession();

    expect(token).toBe('rotated-token');
    expect(mockApi.me).toHaveBeenCalledWith({ skipAuthRefresh: true });
    expect(store.user).toEqual(sampleUser);
    expect(store.status).toBe('ready');
  });

  it('single-flights concurrent refreshSession calls', async () => {
    const { useAuthStore } = await import('./auth');
    const store = useAuthStore();

    let resolveRefresh!: (value: { accessToken: string }) => void;
    mockApi.refresh.mockImplementation(
      () =>
        new Promise<{ accessToken: string }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockApi.me.mockResolvedValue(sampleUser);

    const first = store.refreshSession();
    const second = store.refreshSession();

    resolveRefresh({ accessToken: 'once' });
    await expect(Promise.all([first, second])).resolves.toEqual(['once', 'once']);
    expect(mockApi.refresh).toHaveBeenCalledTimes(1);
  });

  it('retryBootstrap re-runs after an error status', async () => {
    const { useAuthStore } = await import('./auth');
    const store = useAuthStore();

    mockApi.refresh
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ accessToken: 'ok-token' });
    mockApi.me.mockResolvedValue(sampleUser);

    await store.bootstrap();
    expect(store.status).toBe('error');

    await store.retryBootstrap();

    expect(store.status).toBe('ready');
    expect(store.isAuthenticated).toBe(true);
    expect(mockApi.refresh).toHaveBeenCalledTimes(2);
  });
});
