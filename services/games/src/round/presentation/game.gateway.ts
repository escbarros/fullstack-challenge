import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.join('game');
  }

  emitRoundBetting(payload: { roundId: string; seedHash: string; bettingEndsAt: Date | string }) {
    this.server.to('game').emit('round:betting', {
      ...payload,
      bettingEndsAt: payload.bettingEndsAt instanceof Date ? payload.bettingEndsAt.toISOString() : payload.bettingEndsAt,
    });
  }

  emitRoundStarted(payload: { roundId: string; startedAt: Date | string }) {
    this.server.to('game').emit('round:started', {
      ...payload,
      startedAt: payload.startedAt instanceof Date ? payload.startedAt.toISOString() : payload.startedAt,
    });
  }

  emitRoundCrashed(payload: {
    roundId: string;
    crashPoint: number;
    serverSeed: string;
    clientSeed: string;
    seedHash: string;
  }) {
    this.server.to('game').emit('round:crashed', payload);
  }

  emitRoundBet(payload: {
    roundId: string;
    playerId: string;
    username: string;
    amountCents: number;
    status: string;
  }) {
    this.server.to('game').emit('round:bet', payload);
  }

  emitRoundCashout(payload: {
    roundId: string;
    playerId: string;
    username: string;
    cashoutMultiplier: number;
    payoutCents: number;
  }) {
    this.server.to('game').emit('round:cashout', payload);
  }

  emitRoundTick(payload: { roundId: string; elapsedMs: number }) {
    this.server.to('game').emit('round:tick', payload);
  }
}
