import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMessageStore } from '../../stores/messageStore';
import { useChannelStore } from '../../stores/channelStore';
import { useAuthStore } from '../../stores/authStore';
import { getSocket } from '../../lib/socket';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import type { Message } from '../../types/models';

const EMPTY_MESSAGES: Message[] = [];

export function MessageArea() {
  const { channelId } = useParams<{ channelId: string }>();
  const messages = useMessageStore((s) => channelId ? (s.messagesByChannel[channelId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES);
  const canLoadMore = useMessageStore((s) => channelId ? (s.hasMore[channelId] ?? true) : false);
  const fetchMessages = useMessageStore((s) => s.fetchMessages);
  const getTypingUsers = useMessageStore((s) => s.getTypingUsers);
  const setActiveChannel = useChannelStore((s) => s.setActiveChannel);
  const currentUsername = useAuthStore((s) => s.user?.username);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  const typingUsers = channelId ? getTypingUsers(channelId).filter((u) => u !== currentUsername) : [];

  // Join socket room and fetch messages for this channel
  useEffect(() => {
    if (!channelId) return;
    setActiveChannel(channelId);

    const socket = getSocket();
    socket?.emit('channel:join', channelId);

    // Always fetch for this channel on mount
    fetchMessages(channelId);

    return () => {
      socket?.emit('channel:leave', channelId);
    };
  }, [channelId, setActiveChannel, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleLoadMore = useCallback(async () => {
    if (!channelId || !canLoadMore || messages.length === 0) return;
    const container = containerRef.current;
    if (container) prevScrollHeight.current = container.scrollHeight;

    await fetchMessages(channelId, messages[0]?.id);

    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight.current;
      }
    });
  }, [channelId, canLoadMore, messages, fetchMessages]);

  // Scroll-to-top detection for loading more
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      if (container!.scrollTop < 50 && canLoadMore) {
        handleLoadMore();
      }
    }
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [handleLoadMore, canLoadMore]);

  if (!channelId) return null;

  const channelName = useChannelStore.getState().activeChannel?.name;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2">
        {canLoadMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button onClick={handleLoadMore} className="text-sm text-accent hover:underline">
              Load more messages
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full items-end pb-4">
            <p className="text-text-muted">
              This is the beginning of <strong>#{channelName}</strong>. Say something!
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHeader =
            !prev ||
            prev.author_id !== msg.author_id ||
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

          return (
            <MessageItem key={msg.id} message={msg} showHeader={showHeader} />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-text-muted">
          <span className="font-medium">{typingUsers.join(', ')}</span>
          {typingUsers.length === 1 ? ' is' : ' are'} typing...
        </div>
      )}

      <MessageInput channelId={channelId} />
    </div>
  );
}
