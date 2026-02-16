import { PhoneOff, Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useChannelStore } from '../../stores/channelStore';
import { leaveVoiceChannel, toggleMute, toggleDeafen } from '../../lib/voiceManager';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/utils';

export function VoiceView() {
  const participants = useVoiceStore((s) => s.participants);
  const speaking = useVoiceStore((s) => s.speaking);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isDeafened = useVoiceStore((s) => s.isDeafened);
  const activeChannel = useChannelStore((s) => s.activeChannel);

  // Determine grid layout based on participant count
  const count = participants.length;
  const gridClass =
    count <= 1
      ? 'grid-cols-1'
      : count <= 4
        ? 'grid-cols-2'
        : count <= 9
          ? 'grid-cols-3'
          : 'grid-cols-4';

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-border-subtle px-4">
        <span className="font-semibold text-text-primary">
          {activeChannel?.name || 'Voice Channel'}
        </span>
        <span className="ml-2 text-sm text-text-muted">
          {count} {count === 1 ? 'participant' : 'participants'}
        </span>
      </div>

      {/* Grid of participants */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className={cn('grid w-full max-w-4xl gap-4', gridClass)}>
          {participants.map((p) => {
            const isSpeaking = speaking.has(p.userId);
            return (
              <div
                key={p.userId}
                className={cn(
                  'flex aspect-video flex-col items-center justify-center rounded-xl bg-bg-medium transition-all duration-200',
                  isSpeaking
                    ? 'ring-[3px] ring-status-online shadow-lg shadow-status-online/20'
                    : 'ring-2 ring-border-subtle',
                )}
              >
                <div className={cn(
                  'rounded-full transition-all duration-200',
                  isSpeaking && 'ring-4 ring-status-online/30',
                )}>
                  <Avatar name={p.username} size="xl" />
                </div>
                <p className={cn(
                  'mt-3 text-sm font-medium',
                  isSpeaking ? 'text-status-online' : 'text-text-secondary',
                )}>
                  {p.username}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 border-t border-border-subtle bg-bg-darkest/50 p-4">
        <Tooltip content={isMuted ? 'Unmute' : 'Mute'} side="top">
          <button
            onClick={toggleMute}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              isMuted
                ? 'bg-danger text-white'
                : 'bg-bg-light text-text-primary hover:bg-bg-lighter',
            )}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </Tooltip>

        <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'} side="top">
          <button
            onClick={toggleDeafen}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              isDeafened
                ? 'bg-danger text-white'
                : 'bg-bg-light text-text-primary hover:bg-bg-lighter',
            )}
          >
            {isDeafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
          </button>
        </Tooltip>

        <Tooltip content="Disconnect" side="top">
          <button
            onClick={leaveVoiceChannel}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff size={20} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
