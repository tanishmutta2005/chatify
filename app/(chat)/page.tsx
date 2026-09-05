export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-950 p-6 transition-colors">
      <div className="text-center max-w-sm animate-fadeIn">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">No chat selected</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Select an existing conversation from the left or click <span className="font-semibold text-indigo-600 dark:text-indigo-400">New chat</span> to message someone.
        </p>
      </div>
    </div>
  );
}
