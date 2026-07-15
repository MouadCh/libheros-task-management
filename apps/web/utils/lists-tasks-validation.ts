import {
  LIST_FIELD_LIMITS,
  LISTS_TASKS_UI_MESSAGES,
  TASK_FIELD_LIMITS,
} from '../constants/lists-tasks.constants';
import type { CreateListPayload, CreateTaskPayload, UpdateTaskPayload } from '../types/lists-tasks';

export type FieldErrors = Partial<Record<string, string>>;

export function validateCreateListPayload(payload: CreateListPayload): FieldErrors {
  const errors: FieldErrors = {};
  const name = payload.name.trim();

  if (!name) {
    errors.name = LISTS_TASKS_UI_MESSAGES.listNameRequired;
  } else if (name.length > LIST_FIELD_LIMITS.nameMaxLength) {
    errors.name = LISTS_TASKS_UI_MESSAGES.listNameTooLong;
  }

  return errors;
}

export function validateCreateTaskPayload(payload: CreateTaskPayload): FieldErrors {
  const errors: FieldErrors = {};
  const shortDescription = payload.shortDescription.trim();

  if (!shortDescription) {
    errors.shortDescription = LISTS_TASKS_UI_MESSAGES.shortDescriptionRequired;
  } else if (shortDescription.length > TASK_FIELD_LIMITS.shortDescriptionMaxLength) {
    errors.shortDescription = LISTS_TASKS_UI_MESSAGES.shortDescriptionTooLong;
  }

  if (
    payload.longDescription &&
    payload.longDescription.length > TASK_FIELD_LIMITS.longDescriptionMaxLength
  ) {
    errors.longDescription = LISTS_TASKS_UI_MESSAGES.longDescriptionTooLong;
  }

  if (!payload.dueDate) {
    errors.dueDate = LISTS_TASKS_UI_MESSAGES.dueDateRequired;
  } else if (Number.isNaN(Date.parse(payload.dueDate))) {
    errors.dueDate = LISTS_TASKS_UI_MESSAGES.dueDateInvalid;
  }

  return errors;
}

export function validateUpdateTaskPayload(payload: UpdateTaskPayload): FieldErrors {
  const errors: FieldErrors = {};

  if (payload.shortDescription !== undefined) {
    const shortDescription = payload.shortDescription.trim();
    if (!shortDescription) {
      errors.shortDescription = LISTS_TASKS_UI_MESSAGES.shortDescriptionRequired;
    } else if (shortDescription.length > TASK_FIELD_LIMITS.shortDescriptionMaxLength) {
      errors.shortDescription = LISTS_TASKS_UI_MESSAGES.shortDescriptionTooLong;
    }
  }

  if (
    payload.longDescription != null &&
    payload.longDescription.length > TASK_FIELD_LIMITS.longDescriptionMaxLength
  ) {
    errors.longDescription = LISTS_TASKS_UI_MESSAGES.longDescriptionTooLong;
  }

  if (payload.dueDate !== undefined) {
    if (!payload.dueDate) {
      errors.dueDate = LISTS_TASKS_UI_MESSAGES.dueDateRequired;
    } else if (Number.isNaN(Date.parse(payload.dueDate))) {
      errors.dueDate = LISTS_TASKS_UI_MESSAGES.dueDateInvalid;
    }
  }

  return errors;
}
