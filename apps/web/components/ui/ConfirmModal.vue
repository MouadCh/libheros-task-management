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
      class="fixed inset-0 z-50 flex items-center justify-center bg-lh-ink/40 p-4 backdrop-blur-[2px]"
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
        class="lh-panel w-full max-w-md p-6 shadow-lh lh-fade-in"
      >
        <h2 id="confirm-title" class="font-display text-lg font-semibold text-lh-ink">
          {{ title }}
        </h2>
        <p id="confirm-message" class="mt-2 text-sm text-lh-muted">
          {{ message }}
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="lh-btn-ghost" :disabled="busy" @click="requestCancel">
            {{ cancelLabel ?? LISTS_TASKS_UI_MESSAGES.cancel }}
          </button>
          <button
            type="button"
            class="lh-btn-danger-solid"
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
