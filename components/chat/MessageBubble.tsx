import { format } from "date-fns";
import { FileText, Download } from "lucide-react";

interface MessageBubbleProps {
  message: any;
  isOwn:   boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isImageFile = (url?: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} animate-fadeIn`}>
      {/* Avatar (only for received messages) */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs uppercase shrink-0 self-end">
          {message.sender?.name ? message.sender.name.charAt(0) : "U"}
        </div>
      )}

      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {/* Sender name (in group chats for received messages) */}
        {!isOwn && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1 font-medium">{message.sender?.name}</span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed overflow-hidden transition-colors ${
            isOwn
              ? "bg-indigo-600 dark:bg-indigo-500 text-white rounded-br-sm"
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-750 rounded-bl-sm"
          }`}
        >
          {/* File attachment preview if present */}
          {message.fileUrl && (
            <div className="mb-2">
              {isImageFile(message.fileUrl) ? (
                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || "Uploaded image"}
                    className="max-h-60 max-w-full rounded-lg object-contain hover:opacity-95 transition bg-black/5"
                  />
                </a>
              ) : (
                <a
                  href={message.fileUrl}
                  download={message.fileName || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition ${
                    isOwn
                      ? "bg-indigo-700/60 hover:bg-indigo-700 text-white"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <FileText size={18} className="shrink-0" />
                  <span className="truncate max-w-[180px]">{message.fileName || "Download Attachment"}</span>
                  <Download size={14} className="shrink-0 ml-auto" />
                </a>
              )}
            </div>
          )}

          {/* Text content if present */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
          {message.createdAt
            ? format(new Date(message.createdAt), "h:mm a")
            : ""}
        </span>
      </div>
    </div>
  );
}
