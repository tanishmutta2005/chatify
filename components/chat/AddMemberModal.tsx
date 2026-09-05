"use client";
import { useState, useEffect } from "react";
import { Search, X, UserPlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface AddMemberModalProps {
  chatId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onMemberAdded: (updatedChat: any) => void;
}

export function AddMemberModal({
  chatId,
  existingMemberIds,
  onClose,
  onMemberAdded,
}: AddMemberModalProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const url = query.trim()
          ? `/api/users?search=${encodeURIComponent(query.trim())}`
          : `/api/users`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : []);
        } else if (isMounted) {
          setUsers([]);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, query.trim() ? 300 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleAddMember = async (userId: string, userName: string) => {
    setAddingId(userId);
    try {
      const res = await fetch("/api/chats/groupadd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, userId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${userName} added to group!`);
        onMemberAdded(data);
        onClose();
      } else {
        toast.error(data.error || "Failed to add user");
      }
    } catch (err) {
      toast.error("Error adding member");
    } finally {
      setAddingId(null);
    }
  };

  // Filter out members who are already active in the group
  const availableUsers = users.filter(
    (u) => !existingMemberIds.includes(u._id.toString())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Add Member to Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-hidden flex-1">
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              autoFocus
            />
          </div>

          {/* User Results */}
          <div className="overflow-y-auto flex-1 max-h-64">
            {loading && (
              <div className="text-center py-6">
                <Loader2 size={22} className="animate-spin text-indigo-500 mx-auto" />
              </div>
            )}

            {!loading && availableUsers.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
                {query ? `No users found for "${query}"` : "All registered users are already in this group"}
              </p>
            )}

            {availableUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs uppercase">
                  {user.name ? user.name.charAt(0) : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                </div>
                <button
                  onClick={() => handleAddMember(user._id, user.name)}
                  disabled={addingId === user._id}
                  className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                >
                  {addingId === user._id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={14} /> Add
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
