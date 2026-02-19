import { useNavigate } from 'react-router-dom';
import { Hash, Volume2 } from 'lucide-react';
import type { Channel } from '../../types/models';
import { useChannelStore } from '../../stores/channelStore';
import { useServerStore } from '../../stores/serverStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { joinVoiceChannel } from '../../lib/voiceManager';
import { VoiceChannel } from '../voice/VoiceChannel';
import { cn } from '../../lib/utils';

interface ChannelItemProps {
  channel: Channel;
  active: boolean;
}

export function ChannelItem({ channel, active }: ChannelItemProps) {
  const setActiveChannel = useChannelStore((s) => s.setActiveChannel);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const navigate = useNavigate();

  const isConnectedVoice = channel.type === 'voice' && voiceChannelId === channel.id;

  function handleClick() {
    if (channel.type === 'text') {
      setActiveChannel(channel.id);
      navigate(`/channels/${activeServerId}/${channel.id}`);
    } else if (channel.type === 'voice') {
      setActiveChannel(channel.id);
      navigate(`/channels/${activeServerId}/${channel.id}`);
      if (voiceChannelId !== channel.id) {
        joinVoiceChannel(channel.id);
      }
    }
  }

  const Icon = channel.type === 'text' ? Hash : Volume2;

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors',
          active
            ? 'bg-bg-light text-text-primary'
            : 'text-text-secondary hover:bg-bg-light/50 hover:text-text-primary',
          isConnectedVoice && 'bg-bg-light',
        )}
      >
        <Icon
          size={18}
          className={cn('shrink-0', isConnectedVoice ? 'text-status-online' : 'text-text-muted')}
        />
        <span className={cn('truncate text-sm', isConnectedVoice && 'text-status-online font-medium')}>
          {channel.name}
        </span>
        {isConnectedVoice && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-status-online">
            Live
          </span>
        )}
      </button>
      {isConnectedVoice && <VoiceChannel channelId={channel.id} />}
    </div>
  );
}
