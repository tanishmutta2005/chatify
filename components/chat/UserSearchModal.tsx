"use client";
import { useState, useEffect } from "react";
import { Search, X, Users, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import React from "react";

interface UserSearchModalProps {
  onClose:       () => void;
  onChatCreated: (chat: any) => void;
  setChats:      React.Dispatch<React.SetStateAction<any[]>>;
}

export function UserSearchModal({ onClose, onChatCreated, setChats }: UserSearchModalProps) {
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState<any[]>([]);
  const [groupResults, setGroupResults] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [creating,     setCreating]     = useState<string | null>(null);

  // Group creation state
  const [mode,          setMode]          = useState<"dm" | "group">("dm");
  const [groupName,     setGroupName]     = useState("");
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Search users and groups (fetch on load or when typing)
  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const url = query.trim()
          ? `/api/users?search=${encodeURIComponent(query.trim())}`
          : `/api/users`;

        const [usersRes, chatsRes] = await Promise.all([
          fetch(url),
          fetch("/api/chats"),
        ]);

        if (isMounted) {
          if (usersRes.ok) {
            const data = await usersRes.json();
            setResults(Array.isArray(data) ? data : []);
          } else {
            setResults([]);
          }

          if (chatsRes.ok) {
            const chats = await chatsRes.json();
            if (Array.isArray(chats)) {
              const q = query.trim().toLowerCase();
              const groups = chats.filter((c: any) => c.isGroup);
              if (q) {
                setGroupResults(groups.filter((g: any) => (g.groupName || "").toLowerCase().includes(q)));
              } else {
                setGroupResults(groups);
              }
            } else {
              setGroupResults([]);
            }
          }
        }
      } catch (err) {
        console.error("Error searching users/groups:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, query.trim() ? 300 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Start 1-on-1 chat
  const startDM = async (userId: string) => {
    setCreating(userId);
    const res  = await fetch("/api/chats", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    const chat = await res.json();
    setCreating(null);
    if (res.ok) {
      onChatCreated(chat);
      onClose();
    } else {
      toast.error("Failed to create chat");
    }
  };

  // Create group chat
  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      toast.error("Enter a group name and select at least 2 members");
      return;
    }
    setCreating("group");
    const res = await fetch("/api/chats/group", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: groupName, members: selectedUsers.map((u) => u._id) }),
    });
    const chat = await res.json();
    setCreating(null);
    if (res.ok) {
      setChats((prev) => [chat, ...prev]);
      onChatCreated(chat);
      onClose();
    } else {
      toast.error(chat.error || "Failed to create group");
    }
  };

  const toggleUser = (user: any) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-3">
            <button
              onClick={() => setMode("dm")}
              className={`text-sm font-semibold px-3 py-1 rounded-lg transition ${mode === "dm" ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              💬 Direct Message
            </button>
            <button
              onClick={() => setMode("group")}
              className={`text-sm font-semibold px-3 py-1 rounded-lg transition ${mode === "group" ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              <Users size={14} className="inline mr-1" /> New Group
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-hidden flex-1">
          {/* Group name input */}
          {mode === "group" && (
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          )}

          {/* Selected users (group mode) */}
          {mode === "group" && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u._id}
                  onClick={() => toggleUser(u)}
                  className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-300 transition"
                >
                  {u.name} ✕
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={mode === "group" ? "Search users to add to group..." : "Search users or groups..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1 space-y-3">
            {loading && (
              <div className="text-center py-6">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              </div>
            )}

            {/* Groups section (only in DM/Search mode) */}
            {mode === "dm" && groupResults.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1.5">
                  Your Groups
                </p>
                <div className="space-y-1">
                  {groupResults.map((group) => (
                    <div
                      key={group._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                      onClick={() => {
                        onChatCreated(group);
                        onClose();
                      }}
                    >
                      {group.groupAvatar ? (
                        <img
                          src={group.groupAvatar}
                          alt={group.groupName}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                          {group.groupName ? group.groupName.charAt(0) : "G"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{group.groupName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {group.members?.length || 0} members
                        </p>
                      </div>
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md font-medium">
                        Open
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users section */}
            <div>
              {mode === "dm" && groupResults.length > 0 && results.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1.5">
                  Users
                </p>
              )}

              {!loading && results.length === 0 && (mode === "group" || groupResults.length === 0) && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
                  {query ? `No results found for "${query}"` : "No other users registered yet"}
                </p>
              )}

              <div className="space-y-1">
                {results.map((user) => {
                  const isSelected = selectedUsers.find((u) => u._id === user._id);
                  return (
                    <div
                      key={user._id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/30" : ""}`}
                      onClick={() => mode === "dm" ? startDM(user._id) : toggleUser(user)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs uppercase">
                        {user.name ? user.name.charAt(0) : "U"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.name}</p>
                      </div>
                      {mode === "dm" && (
                        creating === user._id
                          ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          : <UserPlus size={16} className="text-indigo-500" />
                      )}
                      {mode === "group" && isSelected && (
                        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create group button */}
          {mode === "group" && (
            <button
              onClick={createGroup}
              disabled={creating === "group"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60 shadow-sm hover:shadow"
            >
              {creating === "group" ? "Creating..." : `Create Group (${selectedUsers.length} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
