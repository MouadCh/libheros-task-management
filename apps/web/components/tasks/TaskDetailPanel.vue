<script setup lang="ts">
import { TASK_FIELD_LIMITS, LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';
import { TaskStatus } from '~/constants/task-status';
import { useTasksStore } from '~/stores/tasks';
import { toDatetimeLocalValue, toIsoDueDate } from '~/utils/due-date';
import type { FieldErrors } from '~/utils/lists-tasks-validation';
import { validateUpdateTaskPayload } from '~/utils/lists-tasks-validation';

const props = defineProps<{
  requestDelete: (taskId: string, title: string) => void;
}>();

const tasksStore = useTasksStore();

const form = reactive({
  shortDescription: '',
  longDescription: '',
  dueDate: '',
});

const fieldErrors = ref<FieldErrors>({});
const formError = ref<string | null>(null);
const isSaving = ref(false);

watch(
  () => tasksStore.selectedTask,
  (task) => {
    fieldErrors.value = {};
    formError.value = null;
    if (!task) {
      form.shortDescription = '';
      form.longDescription = '';
      form.dueDate = '';
      return;
    }

    form.shortDescription = task.shortDescription;
    form.longDescription = task.longDescription ?? '';
    form.dueDate = toDatetimeLocalValue(task.dueDate);
  },
  { immediate: true },
);

const isCompleted = computed(() => tasksStore.selectedTask?.status === TaskStatus.COMPLETED);

async function onSave(): Promise<void> {
  const task = tasksStore.selectedTask;
  if (!task) {
    return;
  }

  const dueDateIso = toIsoDueDate(form.dueDate) ?? '';
  const payload = {
    shortDescription: form.shortDescription.trim(),
    longDescription: form.longDescription.trim() ? form.longDescription.trim() : null,
    dueDate: dueDateIso,
  };

  fieldErrors.value = validateUpdateTaskPayload(payload);
  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  isSaving.value = true;
  formError.value = null;
  try {
    await tasksStore.updateTask(task.id, payload);
  } catch {
    formError.value = tasksStore.error ?? LISTS_TASKS_UI_MESSAGES.updateTaskFailed;
  } finally {
    isSaving.value = false;
  }
}

async function onToggleComplete(): Promise<void> {
  const task = tasksStore.selectedTask;
  if (!task) {
    return;
  }

  try {
    await tasksStore.setTaskCompleted(task.id, !isCompleted.value);
  } catch {
    formError.value = tasksStore.error ?? LISTS_TASKS_UI_MESSAGES.updateStatusFailed;
  }
}

function onDelete(): void {
  const task = tasksStore.selectedTask;
  if (!task) {
    return;
  }
  props.requestDelete(task.id, task.shortDescription);
}
</script>

<template>
  <div class="flex h-full flex-col gap-4" aria-label="Task details">
    <template v-if="!tasksStore.selectedTask">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h2>
      <p class="text-sm text-slate-600">{{ LISTS_TASKS_UI_MESSAGES.noTaskSelected }}</p>
    </template>

    <template v-else>
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Details</h2>
        <button
          type="button"
          class="text-sm text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          @click="tasksStore.clearSelection()"
        >
          Close
        </button>
      </div>

      <p
        v-if="formError"
        class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
        role="alert"
      >
        {{ formError }}
      </p>

      <form class="space-y-3" novalidate @submit.prevent="onSave">
        <AuthTextField
          id="detail-short-description"
          v-model="form.shortDescription"
          label="Short description"
          :maxlength="TASK_FIELD_LIMITS.shortDescriptionMaxLength"
          :disabled="isSaving || tasksStore.isMutating"
          :error="fieldErrors.shortDescription"
          required
        />
        <UiTextArea
          id="detail-long-description"
          v-model="form.longDescription"
          label="Long description"
          :maxlength="TASK_FIELD_LIMITS.longDescriptionMaxLength"
          :disabled="isSaving || tasksStore.isMutating"
          :error="fieldErrors.longDescription"
        />
        <AuthTextField
          id="detail-due-date"
          v-model="form.dueDate"
          label="Due date"
          type="datetime-local"
          :disabled="isSaving || tasksStore.isMutating"
          :error="fieldErrors.dueDate"
          required
        />

        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
            :disabled="isSaving || tasksStore.isMutating"
            :aria-busy="isSaving"
          >
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
            :disabled="tasksStore.isMutating"
            :aria-pressed="isCompleted"
            @click="onToggleComplete"
          >
            {{ isCompleted ? 'Mark active' : 'Mark completed' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 disabled:opacity-60"
            :disabled="tasksStore.isMutating"
            @click="onDelete"
          >
            Delete
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
