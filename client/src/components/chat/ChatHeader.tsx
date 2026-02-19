import { Hash } from 'lucide-react';
import { useChannelStore } from '../../stores/channelStore';

export function ChatHeader() {
  const activeChannel = useChannelStore((s) => s.activeChannel);

  if (!activeChannel) return null;

  return (
    <div className="theme-canvas-text flex h-12 items-center border-b border-border-subtle px-4">
      <Hash size={20} className="mr-2 text-text-muted" />
      <span className="font-semibold text-text-primary">{activeChannel.name}</span>
    </div>
  );
}
