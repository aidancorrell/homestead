import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceUser } from './VoiceUser';
import { VoiceControls } from './VoiceControls';

interface VoiceChannelProps {
  channelId: string;
}

export function VoiceChannel({ channelId: _channelId }: VoiceChannelProps) {
  const participants = useVoiceStore((s) => s.participants);
  const speaking = useVoiceStore((s) => s.speaking);

  return (
    <div className="ml-6 flex flex-col gap-1 py-1">
      {participants.map((p) => (
        <VoiceUser
          key={p.userId}
          username={p.username}
          isSpeaking={speaking.has(p.userId)}
        />
      ))}
      <VoiceControls />
    </div>
  );
}
