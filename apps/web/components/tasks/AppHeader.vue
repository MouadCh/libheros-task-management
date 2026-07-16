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
    class="sticky top-0 z-20 border-b border-lh-line/80 bg-white/80 px-4 py-3 shadow-lh-sm backdrop-blur-md"
  >
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <button
          v-if="showListToggle"
          type="button"
          class="lh-btn-ghost px-2.5 py-1.5"
          :aria-expanded="listsOpen"
          aria-controls="lists-panel"
          :aria-label="listsOpen ? 'Hide lists sidebar' : 'Show lists sidebar'"
          @click="emit('toggle-lists')"
        >
          Lists
        </button>
        <span class="lh-brand-mark hidden sm:inline-flex" aria-hidden="true">lh</span>
        <div class="min-w-0">
          <p class="truncate font-display text-base font-semibold tracking-tight text-lh-ink">
            libheros <span class="text-lh-teal">Tasks</span>
          </p>
          <p v-if="authStore.user" class="truncate text-xs text-lh-muted">
            {{ authStore.user.firstName }} {{ authStore.user.lastName }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="showDetailToggle"
          type="button"
          class="lh-btn-ghost px-2.5 py-1.5 lg:hidden"
          :aria-expanded="detailOpen"
          aria-controls="task-detail-panel"
          @click="emit('toggle-detail')"
        >
          Detail
        </button>
        <button type="button" class="lh-btn-ghost" :disabled="isLoggingOut" @click="onLogout">
          {{ isLoggingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>
    </div>
  </header>
</template>
