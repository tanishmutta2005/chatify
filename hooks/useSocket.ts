"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { Socket } from "socket.io-client";

interface UseSocketOptions {
  onMessageReceived?: (message: any) => void;
  onTyping?:          () => void;
  onStopTyping?:      () => void;
  onGroupUpdated?:    (chat: any) => void;
  onGroupDeleted?:    (chatId: string) => void;
  onOnlineUsers?:     (userIds: string[]) => void;
  currentChatId?:     string;
}

export function useSocket({
  onMessageReceived,
  onTyping,
  onStopTyping,
  onGroupUpdated,
  onGroupDeleted,
  onOnlineUsers,
  currentChatId,
}: UseSocketOptions) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Connect and register user
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("setup", session.user.id);
    socket.emit("getOnlineUsers");

    // Join the active chat room
    if (currentChatId) {
      socket.emit("joinChat", currentChatId);
    }

    return () => {
      if (currentChatId) socket.emit("leaveChat", currentChatId);
    };
  }, [session?.user?.id, currentChatId]);

  // ── Attach event listeners ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    if (onMessageReceived) socket.on("messageReceived", onMessageReceived);
    if (onTyping)          socket.on("typing",          onTyping);
    if (onStopTyping)      socket.on("stopTyping",      onStopTyping);
    if (onGroupUpdated)    socket.on("groupUpdated",    onGroupUpdated);
    if (onGroupDeleted)    socket.on("groupDeleted",    onGroupDeleted);
    if (onOnlineUsers)     socket.on("onlineUsers",     onOnlineUsers);

    return () => {
      socket.off("messageReceived", onMessageReceived);
      socket.off("typing",          onTyping);
      socket.off("stopTyping",      onStopTyping);
      socket.off("groupUpdated",    onGroupUpdated);
      if (onGroupDeleted) socket.off("groupDeleted", onGroupDeleted);
      if (onOnlineUsers) socket.off("onlineUsers", onOnlineUsers);
    };
  }, [onMessageReceived, onTyping, onStopTyping, onGroupUpdated, onGroupDeleted, onOnlineUsers]);

  return socketRef.current;
}
