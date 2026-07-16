<script setup lang="ts">
import { nextTick } from 'vue';
import { AUTH_UI_MODE, type AuthUiMode } from '~/constants/auth.constants';

definePageMeta({
  middleware: 'guest',
});

const mode = ref<AuthUiMode>(AUTH_UI_MODE.login);
const loginTabId = 'auth-tab-login';
const registerTabId = 'auth-tab-register';
const loginPanelId = 'auth-panel-login';
const registerPanelId = 'auth-panel-register';

const heading = computed(() =>
  mode.value === AUTH_UI_MODE.login ? 'Sign in' : 'Create your account',
);

const description = computed(() =>
  mode.value === AUTH_UI_MODE.login
    ? 'Access your lists and stay in sync across devices.'
    : 'Join in a minute and start organizing what matters.',
);

function selectMode(next: AuthUiMode): void {
  mode.value = next;

  void nextTick(() => {
    const tabId = next === AUTH_UI_MODE.login ? loginTabId : registerTabId;
    document.getElementById(tabId)?.focus();
  });
}

function onTabKeydown(event: KeyboardEvent): void {
  if (
    event.key !== 'ArrowLeft' &&
    event.key !== 'ArrowRight' &&
    event.key !== 'Home' &&
    event.key !== 'End'
  ) {
    return;
  }

  event.preventDefault();

  if (event.key === 'Home' || event.key === 'ArrowLeft') {
    selectMode(AUTH_UI_MODE.login);
    return;
  }

  selectMode(AUTH_UI_MODE.register);
}
</script>

<template>
  <main
    class="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6"
  >
    <div
      class="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lh-teal/20 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-lh-coral/15 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <section class="lh-fade-in px-2 text-center lg:px-4 lg:text-left">
        <div class="mb-5 inline-flex items-center gap-3">
          <span class="lh-brand-mark" aria-hidden="true">lh</span>
          <p class="lh-brand">libheros</p>
        </div>
        <h1
          class="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-lh-ink sm:text-5xl"
        >
          Tasks,
          <span class="bg-gradient-to-r from-lh-teal to-lh-teal-deep bg-clip-text text-transparent">
            closer
          </span>
          to your day.
        </h1>
        <p class="mx-auto mt-4 max-w-md text-base leading-relaxed text-lh-muted lg:mx-0">
          A calm workspace for lists and realtime sync — inspired by how
          <a
            class="font-semibold text-lh-teal-deep underline decoration-lh-teal/30 underline-offset-4 transition hover:decoration-lh-teal"
            href="https://www.libheros.fr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            libheros
          </a>
          brings care closer to people.
        </p>
      </section>

      <section class="lh-panel lh-fade-in-delay p-6 sm:p-8">
        <p class="lh-kicker">Welcome</p>
        <h2 class="mt-2 font-display text-2xl font-semibold text-lh-ink">{{ heading }}</h2>
        <p class="mt-2 text-sm text-lh-muted">{{ description }}</p>

        <div class="mt-6">
          <AuthSessionErrorBanner />
        </div>

        <div
          class="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-lh-surface-2 p-1"
          role="tablist"
          aria-label="Authentication mode"
          @keydown="onTabKeydown"
        >
          <button
            :id="loginTabId"
            type="button"
            role="tab"
            class="rounded-lg px-3 py-2.5 text-sm font-semibold transition"
            :class="
              mode === AUTH_UI_MODE.login
                ? 'bg-white text-lh-ink shadow-lh-sm'
                : 'text-lh-muted hover:text-lh-ink'
            "
            :aria-selected="mode === AUTH_UI_MODE.login"
            :aria-controls="loginPanelId"
            :tabindex="mode === AUTH_UI_MODE.login ? 0 : -1"
            @click="selectMode(AUTH_UI_MODE.login)"
          >
            Sign in
          </button>
          <button
            :id="registerTabId"
            type="button"
            role="tab"
            class="rounded-lg px-3 py-2.5 text-sm font-semibold transition"
            :class="
              mode === AUTH_UI_MODE.register
                ? 'bg-white text-lh-ink shadow-lh-sm'
                : 'text-lh-muted hover:text-lh-ink'
            "
            :aria-selected="mode === AUTH_UI_MODE.register"
            :aria-controls="registerPanelId"
            :tabindex="mode === AUTH_UI_MODE.register ? 0 : -1"
            @click="selectMode(AUTH_UI_MODE.register)"
          >
            Register
          </button>
        </div>

        <div
          v-if="mode === AUTH_UI_MODE.login"
          :id="loginPanelId"
          role="tabpanel"
          :aria-labelledby="loginTabId"
        >
          <AuthLoginForm />
        </div>
        <div v-else :id="registerPanelId" role="tabpanel" :aria-labelledby="registerTabId">
          <AuthRegisterForm />
        </div>
      </section>
    </div>
  </main>
</template>
