"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatList } from "@/components/chat/ChatList";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats]               = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Check if user has a specific chat open (e.g. /[chatId])
  const isChatOpen = pathname !== "/" && pathname !== "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  useEffect(() => {
    if (!session) return;
    fetchChats();
  }, [session]);

  const fetchChats = async () => {
    const res = await fetch("/api/chats");
    const data = await res.json();
    if (res.ok) setChats(data);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* ── Left Sidebar (Full width on mobile when on '/', hidden on mobile when inside a chat) ── */}
      <div
        className={`${
          isChatOpen ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-88 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col shrink-0 transition-colors duration-200 h-full`}
      >
        <ChatList
          chats={chats}
          setChats={setChats}
          notifications={notifications}
          setNotifications={setNotifications}
        />
      </div>

      {/* ── Main Content (Hidden on mobile when on '/', full screen when inside a chat) ── */}
      <div
        className={`${
          isChatOpen ? "flex" : "hidden md:flex"
        } flex-1 flex-col overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-200 h-full`}
      >
        {children}
      </div>
    </div>
  );
}
