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
  <form class="space-y-2" novalidate @submit.prevent="onSubmit">
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
      class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
      :disabled="isSubmitting || listsStore.isMutating"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Adding…' : 'Add list' }}
    </button>
    <p class="sr-only">{{ LISTS_TASKS_UI_MESSAGES.listNameRequired }}</p>
  </form>
</template>
