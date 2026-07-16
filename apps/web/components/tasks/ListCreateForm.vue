<script setup lang="ts">
import { LIST_FIELD_LIMITS, LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';
import { useListsStore } from '~/stores/lists';
import type { FieldErrors } from '~/utils/lists-tasks-validation';
import { validateCreateListPayload } from '~/utils/lists-tasks-validation';

const listsStore = useListsStore();

const name = ref('');
const fieldErrors = ref<FieldErrors>({});
const isSubmitting = ref(false);

async function onSubmit(): Promise<void> {
  fieldErrors.value = validateCreateListPayload({ name: name.value });
  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  isSubmitting.value = true;
  try {
    await listsStore.createList(name.value.trim());
    name.value = '';
    fieldErrors.value = {};
  } catch {
    // Store surfaces error message.
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form class="lh-panel-muted space-y-2 p-3" novalidate @submit.prevent="onSubmit">
    <AuthTextField
      id="new-list-name"
      v-model="name"
      label="New list"
      :maxlength="LIST_FIELD_LIMITS.nameMaxLength"
      :disabled="isSubmitting || listsStore.isMutating"
      :error="fieldErrors.name"
      required
    />
    <button
      type="submit"
      class="lh-btn-accent w-full"
      :disabled="isSubmitting || listsStore.isMutating"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Adding…' : 'Add list' }}
    </button>
    <p v-if="fieldErrors.name" class="sr-only">
      {{ LISTS_TASKS_UI_MESSAGES.listNameRequired }}
    </p>
  </form>
</template>
