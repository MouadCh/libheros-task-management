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
  <nav class="flex h-full flex-col gap-5" aria-label="Task lists">
    <div>
      <h2 class="lh-kicker">Lists</h2>
      <p v-if="listsStore.isLoading" class="mt-3 text-sm text-lh-muted">Loading lists…</p>
      <p v-else-if="listsStore.lists.length === 0" class="mt-3 text-sm text-lh-muted">
        {{ LISTS_TASKS_UI_MESSAGES.noLists }}
      </p>
      <ul v-else class="mt-3 space-y-1.5" role="list">
        <li v-for="list in listsStore.lists" :key="list.id">
          <div
            class="group flex items-center gap-1 rounded-xl transition"
            :class="
              listsStore.selectedListId === list.id
                ? 'bg-gradient-to-r from-lh-teal to-lh-teal-deep text-white shadow-lh-sm'
                : 'text-lh-ink hover:bg-lh-teal-soft/70'
            "
          >
            <button
              type="button"
              class="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lh-teal"
              :aria-current="listsStore.selectedListId === list.id ? 'true' : undefined"
              @click="onSelect(list.id)"
            >
              {{ list.name }}
            </button>
            <button
              type="button"
              class="mr-1.5 rounded-lg px-2 py-1 text-xs font-medium opacity-80 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lh-teal"
              :class="
                listsStore.selectedListId === list.id
                  ? 'text-white/90 hover:bg-white/10'
                  : 'text-lh-muted hover:bg-white/60'
              "
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

    <p v-if="listsStore.error" class="lh-alert-error" role="alert">
      {{ listsStore.error }}
    </p>
  </nav>
</template>
