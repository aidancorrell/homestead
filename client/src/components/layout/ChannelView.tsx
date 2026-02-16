import { useParams } from 'react-router-dom';
import { useChannelStore } from '../../stores/channelStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { ChatHeader } from '../chat/ChatHeader';
import { MessageArea } from '../chat/MessageArea';
import { VoiceView } from '../voice/VoiceView';

export function ChannelView() {
  const { channelId } = useParams<{ channelId: string }>();
  const channels = useChannelStore((s) => s.channels);
  const voiceChannelId = useVoiceStore((s) => s.channelId);

  const channel = channels.find((c) => c.id === channelId);

  // Show voice view if this channel is a voice channel and we're connected to it
  if (channel?.type === 'voice' && voiceChannelId === channelId) {
    return <VoiceView />;
  }

  // Show voice view even if we navigated to a voice channel but haven't connected yet
  if (channel?.type === 'voice') {
    return <VoiceView />;
  }

  // Default: text chat
  return (
    <>
      <ChatHeader />
      <MessageArea />
    </>
  );
}
