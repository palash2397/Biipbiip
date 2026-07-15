import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  getServer() {
    return this.server;
  }

  emitToUser(userId: string, event: string, data: any) {
    if (!this.server) return;

    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToRide(rideId: string, event: string, data: any) {
    if (!this.server) return;

    this.server.to(`ride:${rideId}`).emit(event, data);
  }
}
