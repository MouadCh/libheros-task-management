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
    ? 'Use your email and password to access your task lists.'
    : 'Register to start organizing and synchronizing your tasks.',
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
  <main class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div class="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div class="mb-6">
        <p class="text-sm font-medium uppercase tracking-wide text-slate-500">Libheros</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">{{ heading }}</h1>
        <p class="mt-2 text-sm text-slate-600">{{ description }}</p>
      </div>

      <AuthSessionErrorBanner />

      <div
        class="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
        role="tablist"
        aria-label="Authentication mode"
        @keydown="onTabKeydown"
      >
        <button
          :id="loginTabId"
          type="button"
          role="tab"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === AUTH_UI_MODE.login
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === AUTH_UI_MODE.register
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
    </div>
  </main>
</template>
