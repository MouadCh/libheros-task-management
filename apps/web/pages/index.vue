<script setup lang="ts">
import { LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';
import { useListsStore } from '~/stores/lists';
import { useTasksStore } from '~/stores/tasks';

definePageMeta({
  middleware: 'auth',
});

const listsStore = useListsStore();
const tasksStore = useTasksStore();

const listsOpen = ref(false);
const detailOpen = ref(false);

const confirmOpen = ref(false);
const confirmBusy = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const pendingAction = ref<null | (() => Promise<void>)>(null);

watch(
  () => listsStore.selectedListId,
  async (listId) => {
    if (!listId) {
      tasksStore.resetForList(null);
      return;
    }

    try {
      await tasksStore.fetchTasks(listId);
    } catch {
      // Store surfaces error.
    }
  },
);

watch(
  () => tasksStore.selectedTaskId,
  (taskId) => {
    if (taskId) {
      detailOpen.value = true;
    }
  },
);

watch([listsOpen, detailOpen], ([lists, detail]) => {
  if (!import.meta.client) {
    return;
  }
  document.body.classList.toggle('overflow-hidden', lists || detail);
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.classList.remove('overflow-hidden');
  }
});

onMounted(async () => {
  try {
    await listsStore.fetchLists();
  } catch {
    // Store surfaces error.
  }
});

function requestDeleteList(listId: string, listName: string): void {
  confirmTitle.value = LISTS_TASKS_UI_MESSAGES.deleteListTitle;
  confirmMessage.value = `${LISTS_TASKS_UI_MESSAGES.deleteListBody} (“${listName}”)`;
  pendingAction.value = async () => {
    await listsStore.deleteList(listId);
  };
  confirmOpen.value = true;
}

function requestDeleteTask(taskId: string, title: string): void {
  confirmTitle.value = LISTS_TASKS_UI_MESSAGES.deleteTaskTitle;
  confirmMessage.value = `${LISTS_TASKS_UI_MESSAGES.deleteTaskBody} (“${title}”)`;
  pendingAction.value = async () => {
    await tasksStore.deleteTask(taskId);
    detailOpen.value = false;
  };
  confirmOpen.value = true;
}

async function onConfirm(): Promise<void> {
  if (!pendingAction.value) {
    return;
  }

  confirmBusy.value = true;
  try {
    await pendingAction.value();
    confirmOpen.value = false;
    pendingAction.value = null;
  } catch {
    // Keep modal open; store error shown in panels.
  } finally {
    confirmBusy.value = false;
  }
}

function onCancelConfirm(): void {
  if (confirmBusy.value) {
    return;
  }
  confirmOpen.value = false;
  pendingAction.value = null;
}

async function onToggleComplete(taskId: string, completed: boolean): Promise<void> {
  try {
    await tasksStore.setTaskCompleted(taskId, completed);
  } catch {
    // Store surfaces error.
  }
}

function onSelectTask(taskId: string): void {
  tasksStore.selectTask(taskId);
}

function closeListsDrawer(): void {
  listsOpen.value = false;
}

function closeDetailDrawer(): void {
  detailOpen.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }
  if (confirmOpen.value) {
    return;
  }
  if (listsOpen.value) {
    closeListsDrawer();
  }
  if (detailOpen.value) {
    closeDetailDrawer();
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50" @keydown="onKeydown">
    <TasksAppHeader
      :lists-open="listsOpen"
      :detail-open="detailOpen"
      show-list-toggle
      :show-detail-toggle="Boolean(tasksStore.selectedTaskId)"
      @toggle-lists="listsOpen = !listsOpen"
      @toggle-detail="detailOpen = !detailOpen"
    />

    <div class="relative mx-auto flex w-full max-w-7xl flex-1 overflow-hidden">
      <!-- Mobile lists backdrop -->
      <div
        v-if="listsOpen"
        class="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        aria-hidden="true"
        @click="closeListsDrawer"
      />

      <!-- Single lists panel: drawer on mobile, column on md+ -->
      <aside
        id="lists-panel"
        class="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-4 transition-transform md:static md:z-0 md:w-60 md:max-w-none md:translate-x-0 md:shrink-0"
        :class="listsOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
        :role="listsOpen ? 'dialog' : undefined"
        :aria-modal="listsOpen ? 'true' : undefined"
        aria-label="Task lists"
      >
        <div class="mb-3 flex items-center justify-between md:hidden">
          <p class="text-sm font-semibold text-slate-900">Lists</p>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="closeListsDrawer"
          >
            Close
          </button>
        </div>
        <TasksListsSidebar :request-delete="requestDeleteList" @selected="closeListsDrawer" />
      </aside>

      <main class="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6" aria-label="Tasks">
        <template v-if="!listsStore.selectedListId">
          <p class="text-sm text-slate-600">{{ LISTS_TASKS_UI_MESSAGES.noListSelected }}</p>
        </template>

        <template v-else>
          <div>
            <h1 class="text-xl font-semibold text-slate-900">
              {{ listsStore.selectedList?.name ?? 'Tasks' }}
            </h1>
            <p class="mt-1 text-sm text-slate-600">Active and completed tasks for this list.</p>
          </div>

          <p
            v-if="tasksStore.error"
            class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
            role="alert"
          >
            {{ tasksStore.error }}
          </p>

          <TasksTaskCreateForm />

          <p v-if="tasksStore.isLoading" class="text-sm text-slate-500">Loading tasks…</p>

          <template v-else>
            <TasksTaskListSection
              title="Active"
              :empty-message="LISTS_TASKS_UI_MESSAGES.noActiveTasks"
              :tasks="tasksStore.activeTasks"
              :selected-task-id="tasksStore.selectedTaskId"
              @select="onSelectTask"
              @toggle-complete="onToggleComplete"
            />

            <TasksTaskListSection
              title="Completed"
              :empty-message="LISTS_TASKS_UI_MESSAGES.noCompletedTasks"
              :tasks="tasksStore.completedTasks"
              :selected-task-id="tasksStore.selectedTaskId"
              @select="onSelectTask"
              @toggle-complete="onToggleComplete"
            />
          </template>
        </template>
      </main>

      <!-- Mobile detail backdrop -->
      <div
        v-if="detailOpen"
        class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        aria-hidden="true"
        @click="closeDetailDrawer"
      />

      <!-- Single detail panel: drawer below lg, column on lg+ -->
      <aside
        id="task-detail-panel"
        class="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white p-4 transition-transform lg:static lg:z-0 lg:w-80 lg:max-w-none lg:translate-x-0 lg:shrink-0"
        :class="detailOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
        :role="detailOpen ? 'dialog' : undefined"
        :aria-modal="detailOpen ? 'true' : undefined"
        aria-label="Task details"
      >
        <div class="mb-3 flex items-center justify-between lg:hidden">
          <p class="text-sm font-semibold text-slate-900">Task details</p>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="closeDetailDrawer"
          >
            Close
          </button>
        </div>
        <TasksTaskDetailPanel :request-delete="requestDeleteTask" />
      </aside>
    </div>

    <UiConfirmModal
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :busy="confirmBusy"
      @confirm="onConfirm"
      @cancel="onCancelConfirm"
    />
  </div>
</template>
