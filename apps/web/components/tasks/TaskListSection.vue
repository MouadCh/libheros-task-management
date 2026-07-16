<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import type { TaskDto } from '@libheros/contracts';

const props = withDefaults(
  defineProps<{
    title: string;
    emptyMessage: string;
    tasks: TaskDto[];
    selectedTaskId: string | null;
    /** When true, section starts collapsed and can be toggled (PDF: completed tasks). */
    collapsible?: boolean;
    defaultExpanded?: boolean;
  }>(),
  {
    collapsible: false,
    defaultExpanded: true,
  },
);

defineEmits<{
  select: [taskId: string];
  toggleComplete: [taskId: string, completed: boolean];
}>();

const expanded = ref(props.defaultExpanded);
const panelId = useId();

watch(
  () => props.defaultExpanded,
  (value) => {
    if (!props.collapsible) {
      expanded.value = true;
      return;
    }
    expanded.value = value;
  },
);

function toggleExpanded(): void {
  if (!props.collapsible) {
    return;
  }
  expanded.value = !expanded.value;
}
</script>

<template>
  <section class="space-y-3" :aria-label="title">
    <div v-if="collapsible" class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="group flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lh-teal"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="toggleExpanded"
      >
        <span
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-lh-line bg-white text-xs text-lh-teal-deep transition group-hover:border-lh-teal/40"
          aria-hidden="true"
        >
          {{ expanded ? '▾' : '▸' }}
        </span>
        <span class="lh-kicker">{{ title }}</span>
        <span
          class="rounded-full bg-lh-teal-soft px-2 py-0.5 text-xs font-semibold text-lh-teal-deep"
        >
          {{ tasks.length }}
        </span>
      </button>
    </div>
    <h3 v-else class="lh-kicker">
      {{ title }}
    </h3>

    <div v-show="!collapsible || expanded" :id="panelId">
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
    </div>
  </section>
</template>
