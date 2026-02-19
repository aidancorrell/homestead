import { Routes, Route } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { ServerSidebar } from './ServerSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { ChannelView } from './ChannelView';
import { CreateServerModal } from '../server/CreateServerModal';
import { InviteModal } from '../server/InviteModal';
import { CreateChannelModal } from '../channel/CreateChannelModal';
import { SettingsModal } from '../settings/SettingsModal';
import { useUIStore } from '../../stores/uiStore';

export function AppLayout() {
  useSocket();

  const showCreateServer = useUIStore((s) => s.showCreateServer);
  const showInviteModal = useUIStore((s) => s.showInviteModal);
  const showCreateChannel = useUIStore((s) => s.showCreateChannel);
  const showSettings = useUIStore((s) => s.showSettings);

  return (
    <div className="flex h-screen">
      <ServerSidebar />
      <ChannelSidebar />
      <div className="flex flex-1 flex-col bg-bg-dark theme-canvas-text theme-canvas-texture">
        <Routes>
          <Route
            path=":serverId/:channelId"
            element={<ChannelView />}
          />
          <Route
            path="*"
            element={
              <div className="flex flex-1 items-center justify-center theme-canvas-text-muted">
                <div className="text-center">
                  <h2 className="theme-heading mb-2 text-2xl font-bold theme-canvas-text-secondary font-[var(--font-heading)] tracking-[var(--heading-tracking)]">Welcome to Homestead</h2>
                  <p>Select a server and channel to start chatting</p>
                </div>
              </div>
            }
          />
        </Routes>
      </div>

      {showCreateServer && <CreateServerModal />}
      {showInviteModal && <InviteModal />}
      {showCreateChannel && <CreateChannelModal />}
      {showSettings && <SettingsModal />}
    </div>
  );
}
