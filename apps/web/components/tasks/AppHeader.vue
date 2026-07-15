<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

defineProps<{
  listsOpen?: boolean;
  detailOpen?: boolean;
  showListToggle?: boolean;
  showDetailToggle?: boolean;
}>();

const emit = defineEmits<{
  'toggle-lists': [];
  'toggle-detail': [];
}>();

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
  <header
    class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
  >
    <div class="flex min-w-0 items-center gap-2">
      <button
        v-if="showListToggle"
        type="button"
        class="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:hidden"
        :aria-expanded="listsOpen"
        aria-controls="lists-panel"
        @click="emit('toggle-lists')"
      >
        Lists
      </button>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">Libheros Tasks</p>
        <p v-if="authStore.user" class="truncate text-xs text-slate-500">
          {{ authStore.user.firstName }} {{ authStore.user.lastName }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        v-if="showDetailToggle"
        type="button"
        class="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:hidden"
        :aria-expanded="detailOpen"
        aria-controls="task-detail-panel"
        @click="emit('toggle-detail')"
      >
        Detail
      </button>
      <button
        type="button"
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
        :disabled="isLoggingOut"
        @click="onLogout"
      >
        {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
      </button>
    </div>
  </header>
</template>
