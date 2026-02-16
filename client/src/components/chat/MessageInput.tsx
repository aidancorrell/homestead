import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useChannelStore } from '../../stores/channelStore';

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const channelName = useChannelStore((s) => s.activeChannel?.name);

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;

    const socket = getSocket();
    socket?.emit('message:send', { channelId, content: trimmed });
    setContent('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    // Emit typing event (throttled)
    if (!typingTimeoutRef.current) {
      const socket = getSocket();
      socket?.emit('message:typing', channelId);
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = undefined;
      }, 2000);
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-end gap-2 rounded-lg bg-bg-light px-4 py-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName || 'channel'}`}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-30"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
