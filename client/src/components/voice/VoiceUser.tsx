import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface VoiceUserProps {
  username: string;
  isSpeaking: boolean;
}

export function VoiceUser({ username, isSpeaking }: VoiceUserProps) {
  return (
    <div className="flex items-center gap-2 rounded px-1 py-0.5">
      <div className={cn(
        'rounded-full ring-2',
        isSpeaking ? 'ring-status-online' : 'ring-transparent',
      )}>
        <Avatar name={username} size="sm" />
      </div>
      <span className="text-sm text-text-secondary">{username}</span>
    </div>
  );
}
