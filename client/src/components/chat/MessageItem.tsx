import { Pencil, Trash2 } from 'lucide-react';
import type { Message } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  isOwnMessage: boolean;
  onEditStart: (message: Message) => void;
  onDelete: (message: Message) => void;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ActionButtons({ message, onEditStart, onDelete }: { message: Message; onEditStart: (m: Message) => void; onDelete: (m: Message) => void }) {
  return (
    <div className="absolute -top-3 right-2 hidden gap-0.5 rounded-[var(--radius-sm)] border border-border-subtle bg-bg-medium p-0.5 shadow-[var(--shadow-card)] group-hover:flex">
      <button
        onClick={() => onEditStart(message)}
        className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-bg-light hover:text-text-primary"
        title="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onDelete(message)}
        className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-bg-light hover:text-danger"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EditedTag() {
  return <span className="ml-1 text-[10px] text-text-muted">(edited)</span>;
}

export function MessageItem({ message, showHeader, isOwnMessage, onEditStart, onDelete }: MessageItemProps) {
  const author = message.author;

  if (showHeader) {
    return (
      <div className="group relative mt-4 flex gap-3 rounded-[var(--radius-sm)] px-1 py-0.5 first:mt-0 hover:bg-bg-dark/30">
        <Avatar
          name={author?.display_name || author?.username || 'Unknown'}
          src={author?.avatar_url}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-text-primary">
              {author?.display_name || author?.username || 'Unknown'}
            </span>
            <span className="text-xs text-text-muted">{formatTime(message.created_at)}</span>
          </div>
          <div className="text-sm text-text-secondary">
            <MarkdownRenderer content={message.content} />
            {message.edited_at && <EditedTag />}
          </div>
        </div>
        {isOwnMessage && <ActionButtons message={message} onEditStart={onEditStart} onDelete={onDelete} />}
      </div>
    );
  }

  return (
    <div className="group relative flex gap-3 rounded-[var(--radius-sm)] px-1 py-0.5 hover:bg-bg-dark/30">
      <div className="w-10 shrink-0" />
      <div className="min-w-0 flex-1 text-sm text-text-secondary">
        <MarkdownRenderer content={message.content} />
        {message.edited_at && <EditedTag />}
      </div>
      {isOwnMessage && <ActionButtons message={message} onEditStart={onEditStart} onDelete={onDelete} />}
    </div>
  );
}
