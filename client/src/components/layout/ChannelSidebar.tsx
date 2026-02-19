import { useEffect } from 'react';
import { Plus, ChevronDown, PhoneOff, Signal } from 'lucide-react';
import { useServerStore } from '../../stores/serverStore';
import { useChannelStore } from '../../stores/channelStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useUIStore } from '../../stores/uiStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { leaveVoiceChannel } from '../../lib/voiceManager';
import { ChannelList } from '../channel/ChannelList';
import { UserPanel } from './UserPanel';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';

export function ChannelSidebar() {
  const activeServer = useServerStore((s) => s.activeServer);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setChannels = useChannelStore((s) => s.setChannels);
  const channels = useChannelStore((s) => s.channels);
  const voiceChannelId = useVoiceStore((s) => s.channelId);
  const setShowCreateChannel = useUIStore((s) => s.setShowCreateChannel);
  const setShowInviteModal = useUIStore((s) => s.setShowInviteModal);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  const members = activeServer?.members || [];
  const onlineMembers = members.filter((m) => onlineUsers.has(m.user_id));
  const offlineMembers = members.filter((m) => !onlineUsers.has(m.user_id));

  const voiceChannelName = voiceChannelId
    ? channels.find((c) => c.id === voiceChannelId)?.name
    : null;

  useEffect(() => {
    if (activeServer?.channels) {
      setChannels(activeServer.channels);
    }
  }, [activeServer?.channels]);

  if (!activeServerId) {
    return (
      <div className="flex w-60 flex-col bg-bg-medium">
        <div className="flex h-12 items-center border-b border-border-subtle px-4">
          <span className="text-sm font-semibold text-text-primary">Homestead</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-text-muted">
          Select or create a server to get started
        </div>
        <UserPanel />
      </div>
    );
  }

  return (
    <div className="flex w-60 flex-col bg-bg-medium">
      {/* Server header */}
      <button
        onClick={() => setShowInviteModal(true)}
        className="flex h-12 items-center justify-between border-b border-border-subtle px-4 transition-colors hover:bg-bg-light"
      >
        <span className="truncate text-sm font-semibold text-text-primary">
          {activeServer?.name || 'Loading...'}
        </span>
        <ChevronDown size={16} className="text-text-secondary" />
      </button>

      {/* Channel list + Members */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Channels
          </span>
          <Tooltip content="Create Channel" side="top">
            <button
              onClick={() => setShowCreateChannel(true)}
              className="rounded p-0.5 text-text-muted hover:text-text-secondary"
            >
              <Plus size={16} />
            </button>
          </Tooltip>
        </div>
        <ChannelList />

        {/* Members */}
        {members.length > 0 && (
          <div className="mt-4">
            {onlineMembers.length > 0 && (
              <>
                <div className="mb-1 px-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Online — {onlineMembers.length}
                  </span>
                </div>
                {onlineMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 rounded px-2 py-1">
                    <Avatar
                      src={m.avatar_url}
                      name={m.display_name || m.username}
                      size="sm"
                      status="online"
                    />
                    <span className="truncate text-sm text-text-primary">
                      {m.display_name || m.username}
                    </span>
                  </div>
                ))}
              </>
            )}
            {offlineMembers.length > 0 && (
              <>
                <div className="mb-1 mt-3 px-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Offline — {offlineMembers.length}
                  </span>
                </div>
                {offlineMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 rounded px-2 py-1 opacity-50">
                    <Avatar
                      src={m.avatar_url}
                      name={m.display_name || m.username}
                      size="sm"
                      status="offline"
                    />
                    <span className="truncate text-sm text-text-muted">
                      {m.display_name || m.username}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Voice connected banner */}
      {voiceChannelId && (
        <div className="border-t border-border-subtle bg-bg-darkest/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Signal size={16} className="text-status-online" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-status-online">Voice Connected</p>
              <p className="truncate text-[11px] text-text-muted">{voiceChannelName || 'Unknown channel'}</p>
            </div>
            <Tooltip content="Disconnect" side="top">
              <button
                onClick={leaveVoiceChannel}
                className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg-light hover:text-danger"
              >
                <PhoneOff size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <UserPanel />
    </div>
  );
}
