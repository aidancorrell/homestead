import { Mic, MicOff, Headphones, HeadphoneOff, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useUIStore } from '../../stores/uiStore';
import { toggleMute, toggleDeafen } from '../../lib/voiceManager';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';

export function UserPanel() {
  const user = useAuthStore((s) => s.user);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isDeafened = useVoiceStore((s) => s.isDeafened);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const setShowSettings = useUIStore((s) => s.setShowSettings);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 border-t border-border-subtle bg-bg-darkest/50 p-2">
      <Avatar name={user.display_name} src={user.avatar_url} size="sm" status={user.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{user.display_name}</p>
        <p className="truncate text-xs text-text-muted">#{user.username}</p>
      </div>
      <div className="flex gap-1">
        {voiceChannelId && (
          <Tooltip content={isMuted ? 'Unmute' : 'Mute'} side="top">
            <button
              onClick={toggleMute}
              className={`rounded p-1.5 ${isMuted ? 'text-danger' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </Tooltip>
        )}
        {voiceChannelId && (
          <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'} side="top">
            <button
              onClick={toggleDeafen}
              className={`rounded p-1.5 ${isDeafened ? 'text-danger' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
            </button>
          </Tooltip>
        )}
        <Tooltip content="Settings" side="top">
          <button
            onClick={() => setShowSettings(true)}
            className="rounded p-1.5 text-text-secondary hover:text-text-primary"
          >
            <Settings size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
