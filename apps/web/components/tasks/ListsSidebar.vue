<script setup lang="ts">
import { LISTS_TASKS_UI_MESSAGES } from '~/constants/lists-tasks.constants';
import { useListsStore } from '~/stores/lists';

defineProps<{
  requestDelete: (listId: string, listName: string) => void;
}>();

const emit = defineEmits<{
  selected: [];
}>();

const listsStore = useListsStore();

function onSelect(listId: string): void {
  listsStore.selectList(listId);
  emit('selected');
}
</script>

<template>
  <nav class="flex h-full flex-col gap-4" aria-label="Task lists">
    <div>
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Lists</h2>
      <p v-if="listsStore.isLoading" class="mt-2 text-sm text-slate-500">Loading lists…</p>
      <p v-else-if="listsStore.lists.length === 0" class="mt-2 text-sm text-slate-600">
        {{ LISTS_TASKS_UI_MESSAGES.noLists }}
      </p>
      <ul v-else class="mt-3 space-y-1" role="list">
        <li v-for="list in listsStore.lists" :key="list.id">
          <div
            class="group flex items-center gap-1 rounded-md"
            :class="
              listsStore.selectedListId === list.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-800 hover:bg-slate-100'
            "
          >
            <button
              type="button"
              class="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              :aria-current="listsStore.selectedListId === list.id ? 'page' : undefined"
              @click="onSelect(list.id)"
            >
              {{ list.name }}
            </button>
            <button
              type="button"
              class="mr-1 rounded px-2 py-1 text-xs opacity-80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              :class="listsStore.selectedListId === list.id ? 'text-white' : 'text-slate-600'"
              :aria-label="`Delete list ${list.name}`"
              @click="requestDelete(list.id, list.name)"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>

    <TasksListCreateForm />

    <p
      v-if="listsStore.error"
      class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
      role="alert"
    >
      {{ listsStore.error }}
    </p>
  </nav>
</template>
