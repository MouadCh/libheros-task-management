<script setup lang="ts">
import type { TaskDto } from '@libheros/contracts';
import { TaskStatus } from '~/constants/task-status';

const props = defineProps<{
  task: TaskDto;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [taskId: string];
  toggleComplete: [taskId: string, completed: boolean];
}>();

function formatDueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const isCompleted = computed(() => props.task.status === TaskStatus.COMPLETED);
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-xl border px-3.5 py-3 transition"
    :class="
      selected
        ? 'border-lh-teal bg-lh-teal-soft/50 shadow-lh-sm ring-1 ring-lh-teal/40'
        : 'border-lh-line/80 bg-white/90 hover:border-lh-teal/40 hover:shadow-lh-sm'
    "
  >
    <input
      :id="`task-complete-${task.id}`"
      type="checkbox"
      class="mt-1 h-4 w-4 rounded border-lh-line text-lh-teal focus:ring-lh-teal/40"
      :checked="isCompleted"
      :aria-label="
        isCompleted
          ? `Mark ${task.shortDescription} as active`
          : `Complete ${task.shortDescription}`
      "
      @change="emit('toggleComplete', task.id, ($event.target as HTMLInputElement).checked)"
    />
    <button
      type="button"
      class="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lh-teal"
      :aria-current="selected ? 'true' : undefined"
      @click="emit('select', task.id)"
    >
      <p
        class="truncate text-sm font-semibold text-lh-ink"
        :class="{ 'text-lh-muted line-through': isCompleted }"
      >
        {{ task.shortDescription }}
      </p>
      <p class="mt-0.5 text-xs text-lh-muted">Due {{ formatDueDate(task.dueDate) }}</p>
    </button>
  </div>
</template>
