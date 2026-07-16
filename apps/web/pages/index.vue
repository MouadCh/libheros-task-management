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

function isMdUp(): boolean {
  if (!import.meta.client) {
    return false;
  }
  return window.matchMedia('(min-width: 768px)').matches;
}

function isLgUp(): boolean {
  if (!import.meta.client) {
    return false;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

function syncBodyScrollLock(): void {
  if (!import.meta.client) {
    return;
  }
  const lockLists = listsOpen.value && !isMdUp();
  const lockDetail = detailOpen.value && !isLgUp();
  document.body.classList.toggle('overflow-hidden', lockLists || lockDetail);
}

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

watch([listsOpen, detailOpen], () => {
  syncBodyScrollLock();
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.classList.remove('overflow-hidden');
  }
});

onMounted(async () => {
  // Desktop starts with the bandeau open; mobile starts collapsed (drawer).
  if (isMdUp()) {
    listsOpen.value = true;
  }

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

function onListSelected(): void {
  // Keep the bandeau open on desktop; close the mobile drawer after pick.
  if (!isMdUp()) {
    closeListsDrawer();
  }
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
  <div class="flex min-h-screen flex-col" @keydown="onKeydown">
    <TasksAppHeader
      :lists-open="listsOpen"
      :detail-open="detailOpen"
      show-list-toggle
      :show-detail-toggle="Boolean(tasksStore.selectedTaskId)"
      @toggle-lists="listsOpen = !listsOpen"
      @toggle-detail="detailOpen = !detailOpen"
    />

    <div class="relative mx-auto flex w-full max-w-7xl flex-1 overflow-hidden px-0 md:px-3 md:pb-4">
      <!-- Mobile lists backdrop -->
      <div
        v-if="listsOpen"
        class="fixed inset-0 z-30 bg-lh-ink/35 backdrop-blur-[2px] md:hidden"
        aria-hidden="true"
        @click="closeListsDrawer"
      />

      <!-- Retractable lists bandeau: drawer on mobile, collapsible column on md+ -->
      <aside
        id="lists-panel"
        class="fixed inset-y-0 left-0 z-40 flex max-w-[85vw] flex-col border-r border-lh-line/80 bg-white/95 shadow-lh backdrop-blur-md transition-[transform,width,opacity,padding,margin] duration-200 ease-out md:static md:z-0 md:shrink-0 md:rounded-2xl md:border md:shadow-lh-sm"
        :class="
          listsOpen
            ? 'w-72 translate-x-0 p-4 md:my-3 md:w-64 md:opacity-100'
            : 'pointer-events-none w-72 -translate-x-full p-4 opacity-100 md:my-0 md:w-0 md:overflow-hidden md:border-0 md:p-0 md:opacity-0 md:shadow-none'
        "
        :aria-hidden="listsOpen ? undefined : 'true'"
        :role="listsOpen && !isMdUp() ? 'dialog' : undefined"
        :aria-modal="listsOpen && !isMdUp() ? 'true' : undefined"
        aria-label="Task lists"
      >
        <div class="mb-3 flex items-center justify-between">
          <p class="font-display text-sm font-semibold text-lh-ink">Lists</p>
          <button type="button" class="lh-btn-ghost px-2 py-1" @click="closeListsDrawer">
            Close
          </button>
        </div>
        <TasksListsSidebar :request-delete="requestDeleteList" @selected="onListSelected" />
      </aside>

      <main
        class="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 md:my-3 md:rounded-2xl md:border md:border-lh-line/70 md:bg-white/70 md:p-6 md:shadow-lh-sm md:backdrop-blur-sm"
        aria-label="Tasks"
      >
        <template v-if="!listsStore.selectedListId">
          <div class="lh-fade-in flex max-w-md flex-col gap-3 py-8">
            <p class="lh-kicker">Workspace</p>
            <h1 class="font-display text-3xl font-semibold tracking-tight text-lh-ink">
              Choose a list to begin
            </h1>
            <p class="text-sm leading-relaxed text-lh-muted">
              {{ LISTS_TASKS_UI_MESSAGES.noListSelected }}
            </p>
          </div>
        </template>

        <template v-else>
          <div class="lh-fade-in">
            <p class="lh-kicker">Active list</p>
            <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-lh-ink">
              {{ listsStore.selectedList?.name ?? 'Tasks' }}
            </h1>
            <p class="mt-2 text-sm text-lh-muted">
              Active and completed tasks — updates sync in realtime.
            </p>
          </div>

          <p v-if="tasksStore.error" class="lh-alert-error" role="alert">
            {{ tasksStore.error }}
          </p>

          <TasksTaskCreateForm />

          <p v-if="tasksStore.isLoading" class="text-sm text-lh-muted">Loading tasks…</p>

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
              :title="LISTS_TASKS_UI_MESSAGES.completedSectionTitle"
              :empty-message="LISTS_TASKS_UI_MESSAGES.noCompletedTasks"
              :tasks="tasksStore.completedTasks"
              :selected-task-id="tasksStore.selectedTaskId"
              collapsible
              :default-expanded="false"
              @select="onSelectTask"
              @toggle-complete="onToggleComplete"
            />
          </template>
        </template>
      </main>

      <!-- Mobile detail backdrop -->
      <div
        v-if="detailOpen"
        class="fixed inset-0 z-30 bg-lh-ink/35 backdrop-blur-[2px] lg:hidden"
        aria-hidden="true"
        @click="closeDetailDrawer"
      />

      <!-- Single detail panel: drawer below lg, column on lg+ -->
      <aside
        id="task-detail-panel"
        class="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-lh-line/80 bg-white/95 p-4 shadow-lh backdrop-blur-md transition-transform lg:static lg:z-0 lg:my-3 lg:ml-0 lg:w-80 lg:max-w-none lg:translate-x-0 lg:shrink-0 lg:rounded-2xl lg:border lg:shadow-lh-sm"
        :class="detailOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
        :role="detailOpen ? 'dialog' : undefined"
        :aria-modal="detailOpen ? 'true' : undefined"
        aria-label="Task details"
      >
        <div class="mb-3 flex items-center justify-between lg:hidden">
          <p class="font-display text-sm font-semibold text-lh-ink">Task details</p>
          <button type="button" class="lh-btn-ghost px-2 py-1" @click="closeDetailDrawer">
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
