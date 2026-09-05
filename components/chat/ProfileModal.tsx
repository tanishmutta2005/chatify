"use client";
import { useState, useRef, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { X, Camera, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { data: session, update } = useSession();
  const [avatar, setAvatar] = useState<string>(session?.user?.avatar || "");
  const [name, setName] = useState<string>(session?.user?.name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvatar(data.fileUrl);
        toast.success("Image selected! Click Save to apply.");
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (err) {
      toast.error("Error uploading image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar, name }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update client-side session so changes reflect immediately
        if (update) {
          await update({
            ...session,
            user: {
              ...session?.user,
              avatar,
              name,
            },
          });
        }
        toast.success("Profile updated!");
        onClose();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Profile Picture with Camera overlay */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-900 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl uppercase shadow-sm">
                {name ? name.charAt(0) : "U"}
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200">
              {uploading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Camera size={22} />
                  <span className="text-[10px] font-medium mt-1">Change</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition"
          >
            {uploading ? "Uploading..." : "Select from Gallery / Folder"}
          </button>

          {/* Name input */}
          <div className="w-full mt-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="Your name"
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Username (Private / Login Only)</label>
            <input
              type="text"
              disabled
              value={`@${session?.user?.username || ""}`}
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
