"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X, UserMinus, UserPlus, Edit2, LogOut, Trash2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import { AddMemberModal } from "./AddMemberModal";

interface GroupInfoDrawerProps {
  chat:    any;
  setChat: (chat: any) => void;
  onClose: () => void;
}

export function GroupInfoDrawer({ chat, setChat, onClose }: GroupInfoDrawerProps) {
  const { data: session }     = useSession();
  const router                = useRouter();
  const [editing,  setEditing]  = useState(false);
  const [newName,  setNewName]  = useState(chat.groupName || "");
  const [showAdd,  setShowAdd]  = useState(false);
  const [loading,  setLoading]  = useState<string | null>(null);

  const isAdmin = chat.admin?._id === session?.user.id || chat.admin === session?.user.id;

  // Permanently delete group (admin only)
  const handleDeleteGroup = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${chat.groupName}"? This will delete the group, all its messages, and remove all members permanently.`)) {
      return;
    }
    setLoading("deleteGroup");
    try {
      const res = await fetch(`/api/chats/group/${chat._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      setLoading(null);
      if (res.ok) {
        toast.success("Group permanently deleted");
        getSocket().emit("groupDeleted", { chatId: chat._id, memberIds: data.memberIds });
        onClose();
        router.push("/");
      } else {
        toast.error(data.error || "Failed to delete group");
      }
    } catch (err) {
      setLoading(null);
      toast.error("Error deleting group");
    }
  };

  // Rename group
  const handleRename = async () => {
    if (!newName.trim()) return;
    setLoading("rename");
    const res = await fetch("/api/chats/rename", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chatId: chat._id, groupName: newName }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) {
      setChat(data);
      getSocket().emit("groupUpdated", data);
      setEditing(false);
      toast.success("Group renamed");
    } else {
      toast.error(data.error || "Failed to rename");
    }
  };

  // Remove member (admin only)
  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from the group?`)) return;
    setLoading(userId);
    const res = await fetch("/api/chats/groupremove", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chatId: chat._id, userId }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) {
      setChat(data);
      getSocket().emit("groupUpdated", data);
      toast.success(`${userName} removed`);
    } else {
      toast.error(data.error || "Failed to remove member");
    }
  };

  // Leave group (self)
  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    setLoading("leave");
    const res = await fetch("/api/chats/groupremove", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chatId: chat._id, userId: session?.user.id }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) {
      getSocket().emit("groupUpdated", data);
      toast.success("You left the group");
      window.location.href = "/";
    } else {
      toast.error(data.error || "Failed to leave group");
    }
  };

  if (!chat.isGroup) {
    // 1-on-1 chat info
    const other = chat.members?.find((m: any) => m._id !== session?.user.id);
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 border-l border-transparent dark:border-gray-800 text-gray-900 dark:text-gray-100 w-80 h-full p-6 shadow-2xl transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">Contact Info</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><X size={20} /></button>
          </div>
          <div className="text-center">
            <img src={other?.avatar} alt={other?.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-gray-100 dark:border-gray-700" />
            <p className="font-bold text-xl text-gray-900 dark:text-gray-100">{other?.name}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 border-l border-transparent dark:border-gray-800 text-gray-900 dark:text-gray-100 w-80 h-full flex flex-col shadow-2xl transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">Group Info</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Group avatar & name */}
            <div className="text-center">
              <img src={chat.groupAvatar} alt={chat.groupName} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-gray-100 dark:border-gray-700" />
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button onClick={handleRename} disabled={loading === "rename"} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded-lg transition">
                    {loading === "rename" ? "..." : "Save"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <p className="font-bold text-xl text-gray-900 dark:text-gray-100">{chat.groupName}</p>
                  {isAdmin && (
                    <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-gray-400 dark:text-gray-500 text-sm">{chat.members?.length} members</p>
              {isAdmin && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full mt-1 inline-block">You are admin</span>}
            </div>

            {/* Add member button (admin only) */}
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 justify-center bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-sm py-2 rounded-xl transition"
              >
                <UserPlus size={16} /> Add Member
              </button>
            )}

            {/* Members list */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Members</p>
              {chat.members?.map((member: any) => {
                const memberId = member._id;
                const isSelf   = memberId === session?.user.id;
                const memberIsAdmin = memberId === (chat.admin?._id || chat.admin);

                return (
                  <div key={memberId} className="flex items-center gap-3 py-2">
                    <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-gray-800" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{member.name} {isSelf && "(You)"}</p>
                    </div>
                    {memberIsAdmin && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">Admin</span>
                    )}
                    {/* Admin can remove non-admin members */}
                    {isAdmin && !isSelf && !memberIsAdmin && (
                      <button
                        onClick={() => handleRemove(memberId, member.name)}
                        disabled={loading === memberId}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                        title={`Remove ${member.name}`}
                      >
                        {loading === memberId
                          ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <UserMinus size={16} />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer actions: Leave group (member) or Delete group permanently (admin) */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            {!isAdmin ? (
              <button
                onClick={handleLeave}
                disabled={loading === "leave"}
                className="w-full flex items-center gap-2 justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 py-2 rounded-xl transition text-sm font-medium"
              >
                <LogOut size={16} /> {loading === "leave" ? "Leaving..." : "Leave Group"}
              </button>
            ) : (
              <button
                onClick={handleDeleteGroup}
                disabled={loading === "deleteGroup"}
                className="w-full flex items-center gap-2 justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 py-2.5 rounded-xl transition text-sm font-semibold disabled:opacity-50"
              >
                {loading === "deleteGroup" ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} /> Delete Group Permanently
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add member modal */}
      {showAdd && (
        <AddMemberModal
          chatId={chat._id}
          existingMemberIds={chat.members?.map((m: any) => (m._id || m).toString()) || []}
          onClose={() => setShowAdd(false)}
          onMemberAdded={(updatedChat) => {
            setChat(updatedChat);
            getSocket().emit("groupUpdated", updatedChat);
          }}
        />
      )}
    </>
  );
}
