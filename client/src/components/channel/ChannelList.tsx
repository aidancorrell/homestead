import { useChannelStore } from '../../stores/channelStore';
import { ChannelItem } from './ChannelItem';

export function ChannelList() {
  const channels = useChannelStore((s) => s.channels);
  const activeChannelId = useChannelStore((s) => s.activeChannelId);

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div className="flex flex-col gap-0.5">
      {textChannels.map((channel) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          active={channel.id === activeChannelId}
        />
      ))}
      {voiceChannels.length > 0 && (
        <>
          <div className="mt-4 mb-1 px-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Voice Channels
            </span>
          </div>
          {voiceChannels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              active={channel.id === activeChannelId}
            />
          ))}
        </>
      )}
    </div>
  );
}
