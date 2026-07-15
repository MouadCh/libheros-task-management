import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { TaskDto } from '@libheros/contracts';
import { useApiClient } from '../composables/useApiClient';
import { LISTS_TASKS_UI_MESSAGES } from '../constants/lists-tasks.constants';
import type { CreateTaskPayload, UpdateTaskPayload } from '../types/lists-tasks';
import { getApiErrorMessage } from '../utils/api-error';
import { sortTaskDtos, splitTasksByStatus } from '../utils/task-split';

export const useTasksStore = defineStore('tasks', () => {
  const listId = ref<string | null>(null);
  const tasks = ref<TaskDto[]>([]);
  const selectedTaskId = ref<string | null>(null);
  const isLoading = ref(false);
  const isMutating = ref(false);
  const error = ref<string | null>(null);
  const fetchGeneration = ref(0);

  const selectedTask = computed(
    () => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  );

  const tasksByStatus = computed(() => splitTasksByStatus(tasks.value));
  const activeTasks = computed(() => tasksByStatus.value.active);
  const completedTasks = computed(() => tasksByStatus.value.completed);

  function clearError(): void {
    error.value = null;
  }

  function clearSelection(): void {
    selectedTaskId.value = null;
  }

  function selectTask(taskId: string | null): void {
    selectedTaskId.value = taskId;
  }

  function upsertTask(task: TaskDto): void {
    const index = tasks.value.findIndex((item) => item.id === task.id);
    const next =
      index === -1
        ? [...tasks.value, task]
        : tasks.value.map((item, i) => (i === index ? task : item));
    tasks.value = sortTaskDtos(next);
  }

  function resetForList(nextListId: string | null): void {
    fetchGeneration.value += 1;
    listId.value = nextListId;
    tasks.value = [];
    selectedTaskId.value = null;
    error.value = null;
    isLoading.value = false;
  }

  async function fetchTasks(nextListId: string): Promise<void> {
    const generation = fetchGeneration.value + 1;
    fetchGeneration.value = generation;
    listId.value = nextListId;
    selectedTaskId.value = null;
    isLoading.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      const result = await api.listTasks(nextListId);

      if (generation !== fetchGeneration.value) {
        return;
      }

      tasks.value = sortTaskDtos(result);
    } catch (err) {
      if (generation !== fetchGeneration.value) {
        return;
      }

      tasks.value = [];
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.loadTasksFailed);
      throw err;
    } finally {
      if (generation === fetchGeneration.value) {
        isLoading.value = false;
      }
    }
  }

  async function createTask(payload: CreateTaskPayload): Promise<TaskDto> {
    if (!listId.value) {
      throw new Error('No list selected');
    }

    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      const created = await api.createTask(listId.value, payload);
      upsertTask(created);
      selectedTaskId.value = created.id;
      return created;
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.createTaskFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<TaskDto> {
    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      const updated = await api.updateTask(taskId, payload);
      upsertTask(updated);
      return updated;
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.updateTaskFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  async function setTaskCompleted(taskId: string, completed: boolean): Promise<TaskDto> {
    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      const updated = await api.updateTaskStatus(taskId, { completed });
      upsertTask(updated);
      return updated;
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.updateStatusFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  async function deleteTask(taskId: string): Promise<void> {
    isMutating.value = true;
    error.value = null;

    try {
      const api = useApiClient();
      await api.deleteTask(taskId);
      tasks.value = tasks.value.filter((task) => task.id !== taskId);
      if (selectedTaskId.value === taskId) {
        selectedTaskId.value = null;
      }
    } catch (err) {
      error.value = getApiErrorMessage(err, LISTS_TASKS_UI_MESSAGES.deleteTaskFailed);
      throw err;
    } finally {
      isMutating.value = false;
    }
  }

  return {
    listId,
    tasks,
    selectedTaskId,
    selectedTask,
    activeTasks,
    completedTasks,
    isLoading,
    isMutating,
    error,
    fetchGeneration,
    clearError,
    clearSelection,
    selectTask,
    resetForList,
    fetchTasks,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
  };
});
