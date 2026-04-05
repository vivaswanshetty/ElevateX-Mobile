import { io, Socket } from "socket.io-client";
import { API_URL } from "./api"; // to check our base url or define one

const SOCKET_URL = API_URL;

class SocketService {
  public socket: Socket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.userId = userId;
    this.reconnectAttempts = 0;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket server", this.socket?.id);
      this.reconnectAttempts = 0;
      this.socket?.emit("join_user_room", userId);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from socket server:", reason);
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      console.warn(`Socket connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitTyping(recipientId: string, senderName: string) {
    this.socket?.emit("typing", { recipientId, senderName });
  }

  emitStopTyping(recipientId: string) {
    this.socket?.emit("stop_typing", { recipientId });
  }
}

export const socketService = new SocketService();
