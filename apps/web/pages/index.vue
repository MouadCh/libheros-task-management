<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  middleware: 'auth',
});

const authStore = useAuthStore();
const isLoggingOut = ref(false);

async function onLogout(): Promise<void> {
  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    isLoggingOut.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-8">
    <div class="mx-auto flex max-w-3xl flex-col gap-6">
      <header class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Libheros Task Management</h1>
          <p class="mt-2 text-slate-600">You are signed in. The task interface ships in Phase 6.</p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
          :disabled="isLoggingOut"
          @click="onLogout"
        >
          {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </header>

      <section
        v-if="authStore.user"
        class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        aria-labelledby="profile-heading"
      >
        <h2 id="profile-heading" class="text-lg font-medium text-slate-900">Profile</h2>
        <dl class="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt class="font-medium text-slate-500">Name</dt>
            <dd>{{ authStore.user.firstName }} {{ authStore.user.lastName }}</dd>
          </div>
          <div>
            <dt class="font-medium text-slate-500">Email</dt>
            <dd>{{ authStore.user.email }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </main>
</template>
