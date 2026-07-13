import type { CreateListDto } from '../../lists/dto/create-list.dto';
import type { RegisterDto } from '../../auth/dto/register.dto';
import type { CreateTaskDto } from '../../tasks/dto/create-task.dto';

export const listsTestData = {
  listName: 'Courses',
  duplicateListName: 'courses',
  taskShortDescription: 'Buy milk',
  taskDueDate: '2026-12-31T12:00:00.000Z',
  taskDueDateEarlier: '2026-06-01T12:00:00.000Z',
  taskDueDateLater: '2026-12-01T12:00:00.000Z',
  secondTaskShortDescription: 'Read chapter 1',
  updatedShortDescription: 'Buy oat milk',
} as const;

export const secondaryAuthUser = {
  firstName: 'Marie',
  lastName: 'Martin',
  rawEmail: 'Marie.Martin@Example.com',
  normalizedEmail: 'marie.martin@example.com',
  password: 'SecurePass2',
} as const;

export function buildCreateListPayload(overrides: Partial<CreateListDto> = {}): CreateListDto {
  return {
    name: listsTestData.listName,
    ...overrides,
  };
}

export function buildCreateTaskPayload(overrides: Partial<CreateTaskDto> = {}): CreateTaskDto {
  return {
    shortDescription: listsTestData.taskShortDescription,
    dueDate: listsTestData.taskDueDate,
    ...overrides,
  };
}

export function buildSecondaryRegisterPayload(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    firstName: secondaryAuthUser.firstName,
    lastName: secondaryAuthUser.lastName,
    email: secondaryAuthUser.rawEmail,
    emailConfirmation: secondaryAuthUser.rawEmail,
    password: secondaryAuthUser.password,
    passwordConfirmation: secondaryAuthUser.password,
    ...overrides,
  };
}
