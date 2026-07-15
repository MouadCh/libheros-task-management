import { TaskStatus, type TaskDto, type TaskListDto } from '@libheros/contracts';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime.publisher';

describe('RealtimePublisher', () => {
  let publisher: RealtimePublisher;
  let gateway: jest.Mocked<RealtimeGateway>;

  const task: TaskDto = {
    id: 'task-1',
    listId: 'list-1',
    shortDescription: 'Buy milk',
    longDescription: null,
    dueDate: '2026-12-31T12:00:00.000Z',
    status: TaskStatus.ACTIVE,
    completedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const list: TaskListDto = {
    id: 'list-1',
    name: 'Courses',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    gateway = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdated: jest.fn(),
      emitTaskDeleted: jest.fn(),
      emitTaskCompleted: jest.fn(),
      emitListCreated: jest.fn(),
      emitListDeleted: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;

    publisher = new RealtimePublisher(gateway);
  });

  it('delegates task events to the gateway', () => {
    publisher.emitTaskCreated('list-1', task);
    publisher.emitTaskUpdated('list-1', task);
    publisher.emitTaskDeleted('list-1', task.id);
    publisher.emitTaskCompleted(
      'list-1',
      task.id,
      TaskStatus.COMPLETED,
      '2026-01-03T00:00:00.000Z',
    );

    expect(gateway.emitTaskCreated).toHaveBeenCalledWith('list-1', task);
    expect(gateway.emitTaskUpdated).toHaveBeenCalledWith('list-1', task);
    expect(gateway.emitTaskDeleted).toHaveBeenCalledWith('list-1', task.id);
    expect(gateway.emitTaskCompleted).toHaveBeenCalledWith(
      'list-1',
      task.id,
      TaskStatus.COMPLETED,
      '2026-01-03T00:00:00.000Z',
    );
  });

  it('delegates list events to the gateway', () => {
    publisher.emitListCreated('user-1', list);
    publisher.emitListDeleted('user-1', list.id);

    expect(gateway.emitListCreated).toHaveBeenCalledWith('user-1', list);
    expect(gateway.emitListDeleted).toHaveBeenCalledWith('user-1', list.id);
  });
});
