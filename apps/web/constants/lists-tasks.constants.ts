export const LIST_FIELD_LIMITS = {
  nameMaxLength: 100,
} as const;

export const TASK_FIELD_LIMITS = {
  shortDescriptionMaxLength: 200,
  longDescriptionMaxLength: 5000,
} as const;

export const LISTS_TASKS_UI_MESSAGES = {
  listNameRequired: 'List name is required.',
  listNameTooLong: 'List name must be at most 100 characters.',
  shortDescriptionRequired: 'Short description is required.',
  shortDescriptionTooLong: 'Short description must be at most 200 characters.',
  longDescriptionTooLong: 'Long description must be at most 5000 characters.',
  dueDateRequired: 'Due date is required.',
  dueDateInvalid: 'Enter a valid due date.',
  loadListsFailed: 'Unable to load lists. Please try again.',
  createListFailed: 'Unable to create the list. Please try again.',
  deleteListFailed: 'Unable to delete the list. Please try again.',
  loadTasksFailed: 'Unable to load tasks. Please try again.',
  createTaskFailed: 'Unable to create the task. Please try again.',
  updateTaskFailed: 'Unable to update the task. Please try again.',
  updateStatusFailed: 'Unable to update task status. Please try again.',
  deleteTaskFailed: 'Unable to delete the task. Please try again.',
  noLists: 'Create a list to start organizing tasks.',
  noListSelected: 'Select a list to view its tasks.',
  noActiveTasks: 'No active tasks in this list.',
  noCompletedTasks: 'No completed tasks yet.',
  completedSectionTitle: 'My completed tasks',
  noTaskSelected: 'Select a task to view and edit details.',
  createdAtLabel: 'Created',
  statusLabel: 'Status',
  statusActive: 'Active',
  statusCompleted: 'Completed',
  deleteListTitle: 'Delete list?',
  deleteListBody: 'This permanently deletes the list and all of its tasks.',
  deleteTaskTitle: 'Delete task?',
  deleteTaskBody: 'This permanently deletes the selected task.',
  confirmDelete: 'Delete',
  cancel: 'Cancel',
} as const;
