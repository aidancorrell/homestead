import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, X } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useChannelStore } from '../../stores/channelStore';
import type { Message } from '../../types/models';
import api from '../../lib/api';

interface MessageInputProps {
  channelId: string;
  editingMessage?: Message | null;
  onEditCancel?: () => void;
  onEditComplete?: () => void;
}

export function MessageInput({ channelId, editingMessage, onEditCancel, onEditComplete }: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const channelName = useChannelStore((s) => s.activeChannel?.name);

  const isEditing = !!editingMessage;

  // When entering edit mode, populate the textarea
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (isEditing && editingMessage) {
      // Edit mode: send via REST
      api.patch(`/channels/${channelId}/messages/${editingMessage.id}`, { content: trimmed })
        .then(() => onEditComplete?.())
        .catch((err) => console.error('Failed to edit message:', err));
    } else {
      // Normal mode: send via socket
      const socket = getSocket();
      socket?.emit('message:send', { channelId, content: trimmed });
    }

    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleCancel() {
    setContent('');
    onEditCancel?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      handleCancel();
    }
  }

  function handleInput() {
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    // Emit typing event (throttled) — only in normal mode
    if (!isEditing && !typingTimeoutRef.current) {
      const socket = getSocket();
      socket?.emit('message:typing', channelId);
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = undefined;
      }, 2000);
    }
  }

  return (
    <div className="theme-canvas-text px-4 pb-4">
      {isEditing && (
        <div className="mb-1 flex items-center gap-2 rounded-t-[var(--radius-md)] bg-accent/10 px-3 py-1.5 text-xs text-accent">
          <span>Editing message</span>
          <span className="text-text-muted">— press Escape to cancel</span>
          <button onClick={handleCancel} className="ml-auto text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        </div>
      )}
      <div className={`theme-glow-border flex items-end gap-2 bg-bg-light px-4 py-2 ${isEditing ? 'rounded-b-[var(--radius-md)]' : 'rounded-[var(--radius-md)]'}`}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isEditing ? 'Edit your message...' : `Message #${channelName || 'channel'}`}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="rounded-[var(--radius-sm)] p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-30"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
