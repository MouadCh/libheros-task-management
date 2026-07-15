<script setup lang="ts">
import { TASK_FIELD_LIMITS } from '~/constants/lists-tasks.constants';
import { useTasksStore } from '~/stores/tasks';
import { toIsoDueDate } from '~/utils/due-date';
import type { FieldErrors } from '~/utils/lists-tasks-validation';
import { validateCreateTaskPayload } from '~/utils/lists-tasks-validation';

const tasksStore = useTasksStore();

const form = reactive({
  shortDescription: '',
  longDescription: '',
  dueDate: '',
});

const fieldErrors = ref<FieldErrors>({});
const isSubmitting = ref(false);

async function onSubmit(): Promise<void> {
  const dueDateIso = toIsoDueDate(form.dueDate) ?? '';
  fieldErrors.value = validateCreateTaskPayload({
    shortDescription: form.shortDescription,
    longDescription: form.longDescription || undefined,
    dueDate: dueDateIso,
  });

  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  isSubmitting.value = true;
  try {
    await tasksStore.createTask({
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim() || undefined,
      dueDate: dueDateIso,
    });
    form.shortDescription = '';
    form.longDescription = '';
    form.dueDate = '';
    fieldErrors.value = {};
  } catch {
    // Store surfaces error.
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form
    class="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    novalidate
    @submit.prevent="onSubmit"
  >
    <h3 class="text-sm font-semibold text-slate-900">Add task</h3>
    <AuthTextField
      id="task-short-description"
      v-model="form.shortDescription"
      label="Short description"
      :maxlength="TASK_FIELD_LIMITS.shortDescriptionMaxLength"
      :disabled="isSubmitting || tasksStore.isMutating"
      :error="fieldErrors.shortDescription"
      required
    />
    <UiTextArea
      id="task-long-description"
      v-model="form.longDescription"
      label="Long description"
      :maxlength="TASK_FIELD_LIMITS.longDescriptionMaxLength"
      :disabled="isSubmitting || tasksStore.isMutating"
      :error="fieldErrors.longDescription"
      :rows="3"
    />
    <AuthTextField
      id="task-due-date"
      v-model="form.dueDate"
      label="Due date"
      type="datetime-local"
      :disabled="isSubmitting || tasksStore.isMutating"
      :error="fieldErrors.dueDate"
      required
    />
    <button
      type="submit"
      class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
      :disabled="isSubmitting || tasksStore.isMutating"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Creating…' : 'Create task' }}
    </button>
  </form>
</template>
