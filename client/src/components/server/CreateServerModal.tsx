import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';

export function CreateServerModal() {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const setShowCreateServer = useUIStore((s) => s.setShowCreateServer);
  const { createServer, joinServer, setActiveServer } = useServerStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'create') {
        const server = await createServer(name);
        setActiveServer(server.id);
        navigate(`/channels/${server.id}`);
      } else {
        const server = await joinServer(inviteCode);
        setActiveServer(server.id);
        navigate(`/channels/${server.id}`);
      }
      setShowCreateServer(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      setError(msg);
    }
  }

  return (
    <Modal open onClose={() => setShowCreateServer(false)} title={mode === 'create' ? 'Create a Server' : 'Join a Server'}>
      <div className="mb-4 flex gap-2">
        <Button
          variant={mode === 'create' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('create')}
        >
          Create
        </Button>
        <Button
          variant={mode === 'join' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setMode('join')}
        >
          Join
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'create' ? (
          <Input
            id="server-name"
            label="Server Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Server"
            required
          />
        ) : (
          <Input
            id="invite-code"
            label="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="abc123XY"
            required
          />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full">
          {mode === 'create' ? 'Create Server' : 'Join Server'}
        </Button>
      </form>
    </Modal>
  );
}
