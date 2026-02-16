import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useServerStore } from '../../stores/serverStore';
import { useUIStore } from '../../stores/uiStore';
import { Tooltip } from '../ui/Tooltip';
import { ServerIcon } from '../server/ServerIcon';

export function ServerSidebar() {
  const { servers, activeServerId, fetchServers, setActiveServer } = useServerStore();
  const setShowCreateServer = useUIStore((s) => s.setShowCreateServer);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServers();
  }, []);

  function handleServerClick(serverId: string) {
    setActiveServer(serverId);
    navigate(`/channels/${serverId}`);
  }

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 overflow-y-auto bg-bg-darkest py-3">
      {servers.map((server) => (
        <Tooltip key={server.id} content={server.name} side="right">
          <button
            onClick={() => handleServerClick(server.id)}
            className="relative"
          >
            <ServerIcon
              name={server.name}
              iconUrl={server.icon_url}
              active={server.id === activeServerId}
            />
            {server.id === activeServerId && (
              <div className="absolute left-0 top-1/2 h-10 w-1 -translate-x-[2px] -translate-y-1/2 rounded-r-full bg-text-primary" />
            )}
          </button>
        </Tooltip>
      ))}

      <div className="mx-auto my-1 h-px w-8 bg-border-subtle" />

      <Tooltip content="Add a Server" side="right">
        <button
          onClick={() => setShowCreateServer(true)}
          className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-bg-medium text-success transition-all hover:rounded-[16px] hover:bg-success hover:text-white"
        >
          <Plus size={24} />
        </button>
      </Tooltip>
    </div>
  );
}
