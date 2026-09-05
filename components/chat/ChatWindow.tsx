"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { GroupInfoDrawer } from "./GroupInfoDrawer";
import { useSocket } from "@/hooks/useSocket";
import { getSocket } from "@/lib/socket";
import { Info, ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function ChatWindow({ chatId }: { chatId: string }) {
  const { data: session }     = useSession();
  const router                = useRouter();
  const [chat, setChat]       = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const typingTimeout           = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat info and messages
  useEffect(() => {
    if (!chatId) return;
    setLoading(true);

    const fetchData = async () => {
      const [chatsRes, msgsRes] = await Promise.all([
        fetch("/api/chats"),
        fetch(`/api/messages/${chatId}`),
      ]);

      if (chatsRes.ok) {
        const chats = await chatsRes.json();
        const found = chats.find((c: any) => c._id === chatId);
        setChat(found);
      }

      if (msgsRes.ok) {
        setMessages(await msgsRes.json());
      }
      setLoading(false);
    };

    fetchData();
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Socket handlers
  const handleMessageReceived = useCallback((message: any) => {
    if (message.chat._id === chatId) {
      setMessages((prev) => [...prev, message]);
    }
  }, [chatId]);

  const handleTyping    = useCallback(() => setIsTyping(true),  []);
  const handleStopTyping = useCallback(() => setIsTyping(false), []);
  const handleOnlineUsers = useCallback((userIds: string[]) => {
    setOnlineUsers(userIds || []);
  }, []);

  const handleGroupUpdated = useCallback((updatedChat: any) => {
    if (updatedChat?._id === chatId) {
      setChat(updatedChat);
    }
  }, [chatId]);

  useSocket({
    onMessageReceived: handleMessageReceived,
    onTyping:          handleTyping,
    onStopTyping:      handleStopTyping,
    onOnlineUsers:     handleOnlineUsers,
    onGroupUpdated:    handleGroupUpdated,
    currentChatId:     chatId,
  });

  // Send message
  const handleSend = async (content: string, fileData?: { fileUrl: string; fileName: string } | null) => {
    const socket = getSocket();
    socket.emit("stopTyping", chatId);

    const res = await fetch("/api/messages", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        chatId,
        content,
        fileUrl: fileData?.fileUrl || null,
        fileName: fileData?.fileName || null,
      }),
    });

    if (!res.ok) { toast.error("Failed to send message"); return; }

    const message = await res.json();
    setMessages((prev) => [...prev, message]);

    // Emit to socket so recipients get it in real-time
    socket.emit("sendMessage", { ...message, chat });
  };

  // Clear messages inside chat for this user only
  const handleClearMessages = async () => {
    if (!confirm("Clear all messages in this chat for you? (The chat will remain and messages won't be deleted for other users)")) {
      return;
    }

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
        toast.success("Messages cleared for you");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to clear messages");
      }
    } catch (err) {
      toast.error("Error clearing messages");
    }
  };

  // Typing indicator emit
  const handleTypingEvent = () => {
    const socket = getSocket();
    socket.emit("typing", chatId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("stopTyping", chatId), 2000);
  };

  const getChatName = () => {
    if (!chat) return "";
    if (chat.isGroup) return chat.groupName;
    const currentId = session?.user?.id?.toString();
    const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
    return other?.name || "Chat";
  };

  const getChatAvatar = () => {
    if (!chat) return "";
    if (chat.isGroup) return chat.groupAvatar;
    const currentId = session?.user?.id?.toString();
    const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
    return other?.avatar || "";
  };

  const isChatOnline = () => {
    if (!chat) return false;
    const currentId = session?.user?.id?.toString();
    if (!chat.isGroup) {
      const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
      const otherId = (other?._id || other)?.toString();
      return otherId ? onlineUsers.includes(otherId) : false;
    }
    return chat.members?.some((m: any) => {
      const memberId = (m._id || m)?.toString();
      return memberId !== currentId && onlineUsers.includes(memberId);
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* ── Chat Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-colors duration-200">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 md:hidden p-1 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="relative shrink-0">
          {getChatAvatar() ? (
            <img
              src={getChatAvatar()}
              alt={getChatName()}
              className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm uppercase shrink-0">
              {getChatName() ? getChatName().charAt(0) : "C"}
            </div>
          )}
          {/* Bottom-right green/red dot in header */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
              isChatOnline() ? "bg-emerald-500" : "bg-rose-400"
            }`}
            title={isChatOnline() ? "Online" : "Offline"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{getChatName()}</p>
          {isTyping && <p className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse">typing...</p>}
          {!isTyping && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {chat?.isGroup
                ? `${chat.members?.length} members • ${isChatOnline() ? "Active now" : "Offline"}`
                : isChatOnline() ? "Online" : "Offline"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleClearMessages}
            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
            title="Clear messages for me"
          >
            <Trash2 size={19} />
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Chat info"
          >
            <Info size={19} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-gray-50/60 dark:bg-gray-950 transition-colors duration-200">
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender._id === session?.user.id}
          />
        ))}
        {isTyping && (
          <div className="flex items-end gap-2 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms"   }} />
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input or Removed Notice ── */}
      {chat?.isGroup && !chat.members?.some((m: any) => (m._id || m) === session?.user.id) ? (
        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          You are no longer a member of this group. You can only view past messages from when you were a member.
        </div>
      ) : (
        <MessageInput onSend={handleSend} onTyping={handleTypingEvent} />
      )}

      {/* ── Group Info Drawer ── */}
      {showInfo && chat && (
        <GroupInfoDrawer
          chat={chat}
          setChat={setChat}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}
