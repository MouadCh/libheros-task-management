<script setup lang="ts">
import { TASK_FIELD_LIMITS } from '~/constants/lists-tasks.constants';
import { useTasksStore } from '~/stores/tasks';
import { defaultDueDateLocalValue, toIsoDueDate } from '~/utils/due-date';
import type { FieldErrors } from '~/utils/lists-tasks-validation';
import { validateCreateTaskPayload } from '~/utils/lists-tasks-validation';

const tasksStore = useTasksStore();

const form = reactive({
  shortDescription: '',
  longDescription: '',
  dueDate: defaultDueDateLocalValue(),
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
    form.dueDate = defaultDueDateLocalValue();
    fieldErrors.value = {};
  } catch {
    // Store surfaces error.
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form class="lh-panel space-y-3 p-4" novalidate @submit.prevent="onSubmit">
    <h3 class="font-display text-base font-semibold text-lh-ink">Add task</h3>
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
      class="lh-btn-primary"
      :disabled="isSubmitting || tasksStore.isMutating"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Creating…' : 'Create task' }}
    </button>
  </form>
</template>
