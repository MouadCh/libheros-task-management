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
    class="flex items-start gap-2 rounded-lg border px-3 py-2"
    :class="
      selected
        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
        : 'border-slate-200 bg-white hover:border-slate-300'
    "
  >
    <input
      :id="`task-complete-${task.id}`"
      type="checkbox"
      class="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
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
      class="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      :aria-current="selected ? 'true' : undefined"
      @click="emit('select', task.id)"
    >
      <p
        class="truncate text-sm font-medium text-slate-900"
        :class="{ 'line-through text-slate-500': isCompleted }"
      >
        {{ task.shortDescription }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500">Due {{ formatDueDate(task.dueDate) }}</p>
    </button>
  </div>
</template>
