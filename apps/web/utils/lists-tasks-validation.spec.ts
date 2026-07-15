import { describe, expect, it } from 'bun:test';
import { LIST_FIELD_LIMITS } from '../constants/lists-tasks.constants';
import { validateCreateListPayload, validateCreateTaskPayload } from './lists-tasks-validation';

describe('lists-tasks-validation', () => {
  it('rejects empty and oversized list names', () => {
    expect(validateCreateListPayload({ name: '   ' }).name).toBeDefined();
    expect(
      validateCreateListPayload({ name: 'a'.repeat(LIST_FIELD_LIMITS.nameMaxLength + 1) }).name,
    ).toBeDefined();
    expect(validateCreateListPayload({ name: 'Inbox' })).toEqual({});
  });

  it('rejects invalid task due dates', () => {
    expect(
      validateCreateTaskPayload({
        shortDescription: 'Buy milk',
        dueDate: '',
      }).dueDate,
    ).toBeDefined();

    expect(
      validateCreateTaskPayload({
        shortDescription: 'Buy milk',
        dueDate: 'not-a-date',
      }).dueDate,
    ).toBeDefined();

    expect(
      validateCreateTaskPayload({
        shortDescription: 'Buy milk',
        dueDate: '2026-06-15T10:30:00.000Z',
      }),
    ).toEqual({});
  });
});
