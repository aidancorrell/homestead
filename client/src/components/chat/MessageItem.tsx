import type { Message } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
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

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const author = message.author;

  if (showHeader) {
    return (
      <div className="mt-4 flex gap-3 first:mt-0">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 py-0.5 hover:bg-bg-dark/30">
      <div className="w-10 shrink-0" />
      <div className="min-w-0 flex-1 text-sm text-text-secondary">
        <MarkdownRenderer content={message.content} />
      </div>
    </div>
  );
}
