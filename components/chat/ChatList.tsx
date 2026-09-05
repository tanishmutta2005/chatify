"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, LogOut, Users, MessageCircle, Bell, Settings, Sun, Moon } from "lucide-react";
import { UserSearchModal } from "./UserSearchModal";
import { ProfileModal } from "./ProfileModal";
import { useSocket } from "@/hooks/useSocket";
import { getSocket } from "@/lib/socket";
import { useTheme } from "@/components/theme/ThemeProvider";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

import React from "react";
interface ChatListProps {
  chats:            any[];
  setChats:         React.Dispatch<React.SetStateAction<any[]>>;
  notifications:    any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

export function ChatList({ chats, setChats, notifications, setNotifications }: ChatListProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const router            = useRouter();
  const pathname          = usePathname();
  const [showSearch,  setShowSearch]  = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Live: update chat list when a new message arrives (even if not in that chat)
  const handleMessageReceived = useCallback((message: any) => {
    const chatId = message.chat._id;

    // If chat window is NOT open for this chat → add notification
    if (!pathname?.includes(chatId)) {
      setNotifications((prev: any[]) => {
        const already = prev.find((n: any) => n.chat._id === chatId);
        if (already) return prev;
        return [...prev, message];
      });

      toast.custom((t) => (
        <div
          className={`bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 cursor-pointer ${t.visible ? "opacity-100" : "opacity-0"}`}
          onClick={() => { router.push(`/${chatId}`); toast.dismiss(t.id); }}
        >
          <img
            src={message.sender.avatar}
            alt={message.sender.name}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <p className="font-semibold text-sm">{message.sender.name}</p>
            <p className="text-xs text-gray-300 truncate max-w-[180px]">{message.content}</p>
          </div>
        </div>
      ), { duration: 4000 });
    }

    // Move chat to top of list with latestMessage updated
    setChats((prev: any[]) => {
      const updated = prev.map((c: any) =>
        c._id === chatId ? { ...c, latestMessage: message, updatedAt: new Date().toISOString() } : c
      );
      return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, [pathname]);

  const handleOnlineUsers = useCallback((userIds: string[]) => {
    setOnlineUsers(userIds || []);
  }, []);

  const handleGroupDeleted = useCallback((chatId: string) => {
    setChats((prev: any[]) => prev.filter((c: any) => c._id !== chatId));
    setNotifications((prev: any[]) => prev.filter((n: any) => n.chat._id !== chatId));
    if (pathname?.includes(chatId)) {
      toast("This group chat was deleted by the admin", { icon: "ℹ️" });
      router.push("/");
    }
  }, [pathname, router, setChats, setNotifications]);

  const handleGroupUpdated = useCallback((updatedChat: any) => {
    if (!updatedChat?._id || !session?.user?.id) return;
    const currentUserId = session.user.id;
    const isMember = updatedChat.members?.some((m: any) => {
      const id = (m._id || m).toString();
      return id === currentUserId;
    });

    setChats((prev: any[]) => {
      const existing = prev.find((c: any) => c._id === updatedChat._id);
      if (isMember) {
        if (!existing) {
          // User was just added to this group! Notify them and add group to retained chats
          toast.success(`You were added to the group "${updatedChat.groupName}"!`, {
            duration: 5000,
            icon: "👥",
          });
          return [updatedChat, ...prev];
        } else {
          // Update existing group in list
          return prev.map((c: any) => (c._id === updatedChat._id ? { ...c, ...updatedChat } : c));
        }
      } else {
        // User is not an active member anymore, update member list in chat
        return prev.map((c: any) => (c._id === updatedChat._id ? { ...c, ...updatedChat } : c));
      }
    });
  }, [session?.user?.id, setChats]);

  useSocket({
    onMessageReceived: handleMessageReceived,
    onOnlineUsers: handleOnlineUsers,
    onGroupUpdated: handleGroupUpdated,
    onGroupDeleted: handleGroupDeleted,
  });

  const getChatName = (chat: any) => {
    if (chat.isGroup) return chat.groupName;
    const currentId = session?.user?.id?.toString();
    const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
    return other?.name || "Unknown";
  };

  const getChatAvatar = (chat: any) => {
    if (chat.isGroup) return chat.groupAvatar;
    const currentId = session?.user?.id?.toString();
    const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
    return other?.avatar || "";
  };

  const isChatOnline = (chat: any) => {
    const currentId = session?.user?.id?.toString();
    if (!chat.isGroup) {
      const other = chat.members?.find((m: any) => (m._id || m)?.toString() !== currentId);
      const otherId = (other?._id || other)?.toString();
      return otherId ? onlineUsers.includes(otherId) : false;
    }
    // For group chat: considered online if any other member is currently online
    return chat.members?.some((m: any) => {
      const memberId = (m._id || m)?.toString();
      return memberId !== currentId && onlineUsers.includes(memberId);
    });
  };

  const getUnreadCount = (chat: any) => {
    return notifications.filter((n: any) => n.chat._id === chat._id).length;
  };

  const handleChatClick = (chatId: string) => {
    // Clear notifications for this chat
    setNotifications((prev: any[]) => prev.filter((n: any) => n.chat._id !== chatId));
    router.push(`/${chatId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 cursor-pointer p-1.5 -ml-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition group min-w-0"
            title="Click to edit profile & photo"
          >
            <div className="relative shrink-0">
              {session?.user?.avatar ? (
                <img
                  src={session.user.avatar}
                  alt={session.user.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {session?.user.name ? session.user.name.charAt(0) : "U"}
                </div>
              )}
              {/* Online indicator on self profile icon */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                {session?.user.name}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Theme toggle button */}
            <button
              onClick={toggleTheme}
              className="text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition duration-200"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun size={18} className="animate-spin-once text-amber-400" />
              ) : (
                <Moon size={18} className="text-gray-500" />
              )}
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Edit Profile"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => {
                const socket = getSocket();
                if (session?.user?.id) {
                  socket.emit("userLogout", session.user.id);
                }
                socket.disconnect();
                signOut({ callbackUrl: "/login" });
              }}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm px-3 py-2 rounded-xl transition"
          >
            <Search size={16} /> New chat
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-sm px-3 py-2 rounded-xl transition font-medium"
            title="New group"
          >
            <Users size={16} /> Group
          </button>
        </div>
      </div>

      {/* ── Chat List ── */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-12 px-4 animate-fadeIn">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
            No chats yet. Search for a user to start!
          </div>
        )}
        {chats.map((chat) => {
          const unread    = getUnreadCount(chat);
          const isActive  = pathname === `/${chat._id}`;
          const lastMsg   = chat.latestMessage;

          return (
            <div
              key={chat._id}
              onClick={() => handleChatClick(chat._id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150 border-b border-gray-50 dark:border-gray-800/50 ${
                isActive ? "bg-indigo-50/80 dark:bg-indigo-950/50" : ""
              }`}
            >
              <div className="relative shrink-0">
                {getChatAvatar(chat) ? (
                  <img
                    src={getChatAvatar(chat)}
                    alt={getChatName(chat)}
                    className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 border border-gray-100 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm uppercase">
                    {getChatName(chat) ? getChatName(chat).charAt(0) : "C"}
                  </div>
                )}
                {/* Bottom-right green/red online indicator */}
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
                    isChatOnline(chat) ? "bg-emerald-500" : "bg-rose-400"
                  }`}
                  title={isChatOnline(chat) ? "Online" : "Offline"}
                />

                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                    {unread}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className={`text-sm font-semibold truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-100"}`}>
                    {getChatName(chat)}
                  </p>
                  {lastMsg?.createdAt && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-1">
                      {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {lastMsg
                    ? `${lastMsg.sender?.name?.split(" ")[0]}: ${lastMsg.content}`
                    : "No messages yet"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {showSearch && (
        <UserSearchModal
          onClose={() => setShowSearch(false)}
          onChatCreated={(chat) => {
            setChats((prev: any[]) => {
              const exists = prev.find((c: any) => c._id === chat._id);
              return exists ? prev : [chat, ...prev];
            });
            router.push(`/${chat._id}`);
          }}
          setChats={setChats}
        />
      )}

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
