import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, type Socket } from 'socket.io';
import {
  WS_CLIENT_EVENTS,
  WS_SERVER_EVENTS,
  type ListCreatedPayload,
  type ListDeletedPayload,
  type TaskCompletedPayload,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskDto,
  type TaskListDto,
  type TaskStatus,
  type TaskUpdatedPayload,
} from '@libheros/contracts';
import { AppConfigService } from '../common/config/app-config.service';
import type { AccessTokenPayload } from '../auth/utils/token-payload.util';
import { ListsRepository } from '../lists/lists.repository';
import { LIST_NOT_FOUND_MESSAGE } from '../lists/constants/lists.constants';
import { ListJoinDto } from './dto/list-join.dto';
import { ListLeaveDto } from './dto/list-leave.dto';
import {
  WS_AUTH_TOKEN_KEY,
  WS_ACK_SUCCESS_RESPONSE,
  buildWsJoinFailureResponse,
} from './constants/realtime.constants';
import {
  clearActiveListId,
  clearSocketState,
  getActiveListId,
  getSocketUserId,
  setActiveListId,
  setSocketState,
  tryGetSocketState,
} from './types/authenticated-socket.types';
import { buildListRoom, buildUserRoom } from './utils/room.util';
import { getWebSocketCorsOrigins } from './utils/ws-cors.util';

@WebSocketGateway({
  cors: {
    origin: getWebSocketCorsOrigins(),
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
    private readonly listsRepository: ListsRepository,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token = this.extractAccessToken(client);
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.appConfig.jwtAccessSecret,
      });

      setSocketState(client, { userId: payload.sub });
      void client.join(buildUserRoom(payload.sub));
    } catch {
      this.logger.debug('Rejected unauthenticated WebSocket connection');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const state = tryGetSocketState(client);

    if (!state) {
      return;
    }

    if (state.activeListId) {
      void client.leave(buildListRoom(state.activeListId));
    }

    clearSocketState(client);
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.LIST_JOIN)
  async handleListJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ListJoinDto,
  ): Promise<{ success: true } | { success: false; message: string }> {
    const userId = getSocketUserId(client);
    const list = await this.listsRepository.findByIdForUser(payload.listId, userId);

    if (!list) {
      return buildWsJoinFailureResponse(LIST_NOT_FOUND_MESSAGE);
    }

    await this.leaveActiveListRoom(client);
    await client.join(buildListRoom(payload.listId));
    setActiveListId(client, payload.listId);

    return WS_ACK_SUCCESS_RESPONSE;
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.LIST_LEAVE)
  async handleListLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ListLeaveDto,
  ): Promise<{ success: true }> {
    await client.leave(buildListRoom(payload.listId));

    if (getActiveListId(client) === payload.listId) {
      clearActiveListId(client);
    }

    return WS_ACK_SUCCESS_RESPONSE;
  }

  emitTaskCreated(listId: string, task: TaskDto): void {
    const payload: TaskCreatedPayload = {
      listId,
      task,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildListRoom(listId)).emit(WS_SERVER_EVENTS.TASK_CREATED, payload);
  }

  emitTaskUpdated(listId: string, task: TaskDto): void {
    const payload: TaskUpdatedPayload = {
      listId,
      task,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildListRoom(listId)).emit(WS_SERVER_EVENTS.TASK_UPDATED, payload);
  }

  emitTaskDeleted(listId: string, taskId: string): void {
    const payload: TaskDeletedPayload = {
      listId,
      taskId,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildListRoom(listId)).emit(WS_SERVER_EVENTS.TASK_DELETED, payload);
  }

  emitTaskCompleted(
    listId: string,
    taskId: string,
    status: TaskStatus,
    completedAt: string | null,
  ): void {
    const payload: TaskCompletedPayload = {
      listId,
      taskId,
      status,
      completedAt,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildListRoom(listId)).emit(WS_SERVER_EVENTS.TASK_COMPLETED, payload);
  }

  emitListCreated(userId: string, list: TaskListDto): void {
    const payload: ListCreatedPayload = {
      list,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildUserRoom(userId)).emit(WS_SERVER_EVENTS.LIST_CREATED, payload);
  }

  emitListDeleted(userId: string, listId: string): void {
    const payload: ListDeletedPayload = {
      listId,
      occurredAt: new Date().toISOString(),
    };

    this.server.to(buildUserRoom(userId)).emit(WS_SERVER_EVENTS.LIST_DELETED, payload);
  }

  private extractAccessToken(client: Socket): string {
    const auth = client.handshake.auth as Partial<Record<typeof WS_AUTH_TOKEN_KEY, unknown>>;
    const token = auth[WS_AUTH_TOKEN_KEY];

    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Missing access token');
    }

    return token;
  }

  private async leaveActiveListRoom(client: Socket): Promise<void> {
    const activeListId = getActiveListId(client);

    if (!activeListId) {
      return;
    }

    await client.leave(buildListRoom(activeListId));
    clearActiveListId(client);
  }
}
