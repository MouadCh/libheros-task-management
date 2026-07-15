import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { TaskListDto } from '@libheros/contracts';
import { useApiClient } from '../composables/useApiClient';
import { LISTS_TASKS_UI_MESSAGES } from '../constants/lists-tasks.constants';
import { getApiErrorMessage } from '../utils/api-error';
import { useTasksStore } from './tasks';

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
      applyListCreated(created);
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
      applyListDeleted(listId);
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.deleteListFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  function applyListCreated(list: TaskListDto): void {
    const index = lists.value.findIndex((item) => item.id === list.id);
    if (index === -1) {
      lists.value = [...lists.value, list];
      return;
    }

    lists.value = lists.value.map((item, i) => (i === index ? list : item));
  }

  function applyListDeleted(listIdToRemove: string): void {
    lists.value = lists.value.filter((list) => list.id !== listIdToRemove);

    const tasksStore = useTasksStore();
    if (tasksStore.listId === listIdToRemove) {
      tasksStore.resetForList(null);
    }

    if (selectedListId.value === listIdToRemove) {
      selectedListId.value = lists.value[0]?.id ?? null;
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
    applyListCreated,
    applyListDeleted,
  };
});
