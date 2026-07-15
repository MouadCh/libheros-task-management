<script setup lang="ts">
import type { TaskDto } from '@libheros/contracts';
import { LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';

defineProps<{
  title: string;
  emptyMessage: string;
  tasks: TaskDto[];
  selectedTaskId: string | null;
}>();

defineEmits<{
  select: [taskId: string];
  toggleComplete: [taskId: string, completed: boolean];
}>();
</script>

<template>
  <section class="space-y-2" :aria-label="title">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">{{ title }}</h3>
    <p v-if="tasks.length === 0" class="text-sm text-slate-600">
      {{ emptyMessage }}
    </p>
    <ul v-else class="space-y-2" role="list">
      <li v-for="task in tasks" :key="task.id">
        <TasksTaskRow
          :task="task"
          :selected="selectedTaskId === task.id"
          @select="$emit('select', $event)"
          @toggle-complete="(id, completed) => $emit('toggleComplete', id, completed)"
        />
      </li>
    </ul>
    <span class="sr-only">{{ LISTS_TASKS_UI_MESSAGES.noActiveTasks }}</span>
  </section>
</template>
