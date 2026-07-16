<script setup lang="ts">
import type { TaskDto } from '@libheros/contracts';

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
  <section class="space-y-3" :aria-label="title">
    <h3 class="lh-kicker">{{ title }}</h3>
    <p v-if="tasks.length === 0" class="text-sm text-lh-muted">
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
  </section>
</template>
