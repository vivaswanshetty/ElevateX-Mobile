import { io, Socket } from "socket.io-client";
import { API_URL } from "./api"; // to check our base url or define one

const SOCKET_URL = API_URL;

class SocketService {
  public socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      // add auth or queries if your backend needs it
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket server", this.socket?.id);
      this.socket?.emit("join_user_room", userId);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
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
