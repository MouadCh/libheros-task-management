import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { TaskListDto } from '@libheros/contracts';
import { useApiClient } from '../composables/useApiClient';
import { LISTS_TASKS_UI_MESSAGES } from '../constants/lists-tasks.constants';
import { getApiErrorMessage } from '../utils/api-error';

export const useListsStore = defineStore('lists', () => {
  const lists = ref<TaskListDto[]>([]);
  const selectedListId = ref<string | null>(null);
  const isLoading = ref(false);
  const isMutating = ref(false);
  const error = ref<string | null>(null);

  const selectedList = computed(
    () => lists.value.find((list) => list.id === selectedListId.value) ?? null,
  );

  function clearError(): void {
    error.value = null;
  }

  function selectList(listId: string | null): void {
    selectedListId.value = listId;
  }

  async function fetchLists(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      lists.value = await api.listLists();

      if (lists.value.length === 0) {
        selectedListId.value = null;
        return;
      }

      const stillSelected = lists.value.some((list) => list.id === selectedListId.value);
      if (!stillSelected) {
        selectedListId.value = lists.value[0]?.id ?? null;
      }
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.loadListsFailed);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createList(name: string): Promise<TaskListDto> {
    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      const created = await api.createList({ name });
      lists.value = [...lists.value, created];
      selectedListId.value = created.id;
      return created;
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.createListFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  async function deleteList(listId: string): Promise<void> {
    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      await api.deleteList(listId);
      lists.value = lists.value.filter((list) => list.id !== listId);

      if (selectedListId.value === listId) {
        selectedListId.value = lists.value[0]?.id ?? null;
      }
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.deleteListFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  return {
    lists,
    selectedListId,
    selectedList,
    isLoading,
    isMutating,
    error,
    clearError,
    selectList,
    fetchLists,
    createList,
    deleteList,
  };
});
