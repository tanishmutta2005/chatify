import { createServer } from "http";
import { Server, Socket } from "socket.io";

// ── Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ── HTTP + Socket.io setup ───────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6, // 1 MB max payload
});

// ── In-memory: userId → Set<socketId> mapping ───────────────
const onlineUsers = new Map<string, Set<string>>();

const broadcastOnlineUsers = () => {
  const userIds = Array.from(onlineUsers.keys());
  io.emit("onlineUsers", userIds);
};

// ── Connection handler ───────────────────────────────────────
io.on("connection", (socket: Socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`);

  // ── 1. User setup — called right after login ──────────────
  socket.on("setup", (userId: string) => {
    if (!userId) return;
    let sockets = onlineUsers.get(userId);
    if (!sockets) {
      sockets = new Set<string>();
      onlineUsers.set(userId, sockets);
    }
    sockets.add(socket.id);
    socket.join(userId); // personal room for DMs
    socket.emit("connected");
    broadcastOnlineUsers();
    console.log(`[SOCKET] User ${userId} registered (${socket.id}). Online users total: ${onlineUsers.size}`);
  });

  // ── 1b. User manual logout / disconnect ───────────────────
  socket.on("userLogout", (userId: string) => {
    if (!userId) return;
    onlineUsers.delete(userId);
    socket.leave(userId);
    broadcastOnlineUsers();
    console.log(`[SOCKET] User ${userId} logged out. Online users total: ${onlineUsers.size}`);
  });

  // ── Request online users list on demand ───────────────────
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // ── 2. Join a chat room ───────────────────────────────────
  socket.on("joinChat", (chatId: string) => {
    socket.join(chatId);
  });

  // ── 3. Leave a chat room ──────────────────────────────────
  socket.on("leaveChat", (chatId: string) => {
    socket.leave(chatId);
  });

  // ── 4. Typing indicators ──────────────────────────────────
  socket.on("typing", (chatId: string) => {
    socket.to(chatId).emit("typing");
  });

  socket.on("stopTyping", (chatId: string) => {
    socket.to(chatId).emit("stopTyping");
  });

  // ── 5. Send message ───────────────────────────────────────
  socket.on("sendMessage", (message: any) => {
    if (!message?.chat?.members || !message?.sender?._id) return;
    if (!message?.content && !message?.fileUrl) return;

    if (message.content && (typeof message.content !== "string" || message.content.length > 2000)) return;

    const chat = message.chat;

    chat.members.forEach((member: any) => {
      const memberId = member._id || member;
      if (memberId.toString() === message.sender._id.toString()) return;

      io.to(memberId.toString()).emit("messageReceived", message);
    });
  });

  // ── 6. Group updated (member added/removed/renamed) ───────
  socket.on("groupUpdated", (updatedChat: any) => {
    if (!updatedChat?.members) return;
    updatedChat.members.forEach((member: any) => {
      const memberId = member._id || member;
      io.to(memberId.toString()).emit("groupUpdated", updatedChat);
    });
  });

  // ── 6b. Group permanently deleted by admin ─────────────────
  socket.on("groupDeleted", ({ chatId, memberIds }: { chatId: string; memberIds?: string[] }) => {
    if (!chatId) return;
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach((mId) => {
        io.to(mId.toString()).emit("groupDeleted", chatId);
      });
    } else {
      io.emit("groupDeleted", chatId);
    }
  });

  // ── 7. Disconnect ─────────────────────────────────────────
  socket.on("disconnect", () => {
    onlineUsers.forEach((sockets, uId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(uId);
          console.log(`[SOCKET] User ${uId} disconnected (no active sockets left)`);
        }
      }
    });
    broadcastOnlineUsers();
  });
});

// ── Start server ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`✅ Socket.io server running on port ${PORT}`);
});
