import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { useChannelStore } from '../../stores/channelStore';
import { useServerStore } from '../../stores/serverStore';

export function CreateChannelModal() {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [error, setError] = useState('');
  const setShowCreateChannel = useUIStore((s) => s.setShowCreateChannel);
  const createChannel = useChannelStore((s) => s.createChannel);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const fetchServer = useServerStore((s) => s.fetchServer);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeServerId) return;
    setError('');
    try {
      await createChannel(activeServerId, name.toLowerCase().replace(/\s+/g, '-'), type);
      await fetchServer(activeServerId);
      setShowCreateChannel(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      setError(msg);
    }
  }

  return (
    <Modal open onClose={() => setShowCreateChannel(false)} title="Create Channel">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === 'text' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setType('text')}
          >
            Text
          </Button>
          <Button
            type="button"
            variant={type === 'voice' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setType('voice')}
          >
            Voice
          </Button>
        </div>

        <Input
          id="channel-name"
          label="Channel Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="new-channel"
          required
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full">
          Create Channel
        </Button>
      </form>
    </Modal>
  );
}
