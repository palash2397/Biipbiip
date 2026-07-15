import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { SocketService } from './socket.service';

@WebSocketGateway({
  path: '/viamo/socket.io',
  cors: {
    origin: '*',
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly socketService: SocketService,
  ) {}

  afterInit(server: Server) {
    this.socketService.setServer(server);

    server.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Token not found'));
        }

        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });

        socket.data.user = payload;

        next();
      } catch (error) {
        next(new Error('Invalid or expired token'));
      }
    });
  }

  async handleConnection(client: Socket) {
    const user = client.data.user;

    if (!user?.id) {
      client.disconnect();
      return;
    }

    await client.join(`user:${user.id}`);

    console.log(`Socket connected: ${user.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRide')
  async joinRide(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      rideId: string;
    },
  ) {
    await client.join(`ride:${data.rideId}`);

    return {
      success: true,
      message: 'Ride joined successfully',
    };
  }
}
