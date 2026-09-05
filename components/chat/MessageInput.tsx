"use client";
import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Send, Paperclip, X, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface MessageInputProps {
  onSend:   (content: string, fileData?: { fileUrl: string; fileName: string } | null) => void;
  onTyping: () => void;
}

export function MessageInput({ onSend, onTyping }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ fileUrl: string; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB");
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
        setAttachedFile({ fileUrl: data.fileUrl, fileName: data.fileName });
        toast.success("File attached!");
      } else {
        toast.error(data.error || "Failed to upload file");
      }
    } catch (err) {
      toast.error("Upload error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed && !attachedFile) return;

    onSend(trimmed, attachedFile);
    setValue("");
    setAttachedFile(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      {/* Attached file preview tag */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-1.5 w-fit max-w-full animate-fadeIn">
          <FileText size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200 truncate max-w-[200px]">
            {attachedFile.fileName}
          </span>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 ml-1 p-0.5"
            title="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 transition-colors">
        {/* Hidden file input for gallery/folder picking */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Paperclip button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-1.5 rounded-lg disabled:opacity-50 shrink-0"
          title="Attach file or photo"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>

        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); onTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none max-h-32 py-1"
          style={{ lineHeight: "1.5" }}
        />

        <button
          onClick={handleSend}
          disabled={(!value.trim() && !attachedFile) || uploading}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl p-2 transition shrink-0 active:scale-95 shadow-sm"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 pl-1">Shift+Enter for new line • Attach files up to 10MB</p>
    </div>
  );
}
