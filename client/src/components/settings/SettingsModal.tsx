import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { AudioSettings } from './AudioSettings';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

export function SettingsModal() {
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', { display_name: displayName });
      useAuthStore.setState({ user: { ...user!, ...data } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setShowSettings(false);
  }

  return (
    <Modal open onClose={() => setShowSettings(false)} title="Settings">
      <div className="flex flex-col gap-6">
        {/* Profile section */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Profile</h3>
          <div className="flex items-center gap-4 rounded-lg bg-bg-darkest p-4">
            <Avatar name={user.display_name} src={user.avatar_url} size="lg" status={user.status} />
            <div>
              <p className="font-semibold text-text-primary">{user.display_name}</p>
              <p className="text-sm text-text-muted">#{user.username}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-2">
          <Input
            id="display-name"
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Button
            onClick={handleSave}
            disabled={saving || displayName === user.display_name}
            size="sm"
            className="self-end"
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-subtle" />

        {/* Audio settings */}
        <AudioSettings />

        {/* Divider */}
        <div className="h-px bg-border-subtle" />

        {/* Logout */}
        <Button variant="danger" onClick={handleLogout} className="w-full">
          <LogOut size={16} className="mr-2" />
          Log Out
        </Button>
      </div>
    </Modal>
  );
}
