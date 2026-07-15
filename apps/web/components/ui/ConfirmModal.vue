<script setup lang="ts">
import { LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';

const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogRef = ref<HTMLElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(): HTMLElement[] {
  if (!dialogRef.value) {
    return [];
  }
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused.value = document.activeElement as HTMLElement | null;
      await nextTick();
      getFocusableElements()[0]?.focus();
      return;
    }

    previouslyFocused.value?.focus?.();
  },
);

function requestCancel(): void {
  if (props.busy) {
    return;
  }
  emit('cancel');
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    requestCancel();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      @keydown="onKeydown"
      @click.self="requestCancel"
    >
      <div
        ref="dialogRef"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg ring-1 ring-slate-200"
      >
        <h2 id="confirm-title" class="text-lg font-semibold text-slate-900">
          {{ title }}
        </h2>
        <p id="confirm-message" class="mt-2 text-sm text-slate-600">
          {{ message }}
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
            :disabled="busy"
            @click="requestCancel"
          >
            {{ cancelLabel ?? LISTS_TASKS_UI_MESSAGES.cancel }}
          </button>
          <button
            type="button"
            class="rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 disabled:opacity-60"
            :disabled="busy"
            :aria-busy="busy"
            @click="emit('confirm')"
          >
            {{ confirmLabel ?? LISTS_TASKS_UI_MESSAGES.confirmDelete }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
