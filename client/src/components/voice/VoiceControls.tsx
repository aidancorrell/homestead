import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff } from 'lucide-react';
import { leaveVoiceChannel, toggleMute, toggleDeafen } from '../../lib/voiceManager';
import { useVoiceStore } from '../../stores/voiceStore';
import { Tooltip } from '../ui/Tooltip';

export function VoiceControls() {
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isDeafened = useVoiceStore((s) => s.isDeafened);

  return (
    <div className="mt-1 flex items-center gap-1">
      <Tooltip content={isMuted ? 'Unmute' : 'Mute'} side="top">
        <button
          onClick={toggleMute}
          className={`rounded p-1.5 transition-colors ${
            isMuted ? 'bg-danger/20 text-danger' : 'text-text-secondary hover:bg-bg-light hover:text-text-primary'
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </Tooltip>

      <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'} side="top">
        <button
          onClick={toggleDeafen}
          className={`rounded p-1.5 transition-colors ${
            isDeafened ? 'bg-danger/20 text-danger' : 'text-text-secondary hover:bg-bg-light hover:text-text-primary'
          }`}
        >
          {isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
        </button>
      </Tooltip>

      <Tooltip content="Disconnect" side="top">
        <button
          onClick={leaveVoiceChannel}
          className="rounded bg-danger/20 p-1.5 text-danger transition-colors hover:bg-danger hover:text-white"
        >
          <PhoneOff size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
