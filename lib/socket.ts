import { io, Socket } from "socket.io-client";

// Singleton — reuse same socket instance across the app
let socket: Socket;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string, {
      autoConnect: false,    // connect manually after login
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};
