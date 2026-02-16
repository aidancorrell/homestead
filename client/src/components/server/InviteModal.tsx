import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';

export function InviteModal() {
  const setShowInviteModal = useUIStore((s) => s.setShowInviteModal);
  const activeServer = useServerStore((s) => s.activeServer);
  const regenerateInvite = useServerStore((s) => s.regenerateInvite);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(activeServer?.invite_code || '');

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!activeServer) return;
    const newCode = await regenerateInvite(activeServer.id);
    setInviteCode(newCode);
  }

  return (
    <Modal open onClose={() => setShowInviteModal(false)} title="Invite Friends">
      <p className="mb-4 text-sm text-text-secondary">
        Share this invite code with your friends so they can join <strong>{activeServer?.name}</strong>.
      </p>

      <div className="flex items-center gap-2 rounded-md bg-bg-darkest p-3">
        <code className="flex-1 font-mono text-lg text-text-primary">{inviteCode}</code>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRegenerate}>
          <RefreshCw size={16} />
        </Button>
      </div>
    </Modal>
  );
}
