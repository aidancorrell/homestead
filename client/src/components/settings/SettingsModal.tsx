import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { AudioSettings } from './AudioSettings';
import { ThemeSettings } from './ThemeSettings';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          <div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-bg-darkest p-4">
            <Avatar name={user.display_name} src={user.avatar_url} size="lg" status={user.status} />
            <div>
              <p className="font-semibold text-text-primary">{user.display_name}</p>
              <p className="text-sm text-text-muted">#{user.username}</p>

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

        {/* Change Password */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Change Password</h3>
          <div className="flex flex-col gap-2">
            <Input
              id="current-password"
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              id="new-password"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              id="confirm-password"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {pwMessage && (
              <p className={`text-xs ${pwMessage.type === 'error' ? 'text-danger' : 'text-status-online'}`}>
                {pwMessage.text}
              </p>
            )}
            <Button
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  setPwMessage({ type: 'error', text: 'Passwords do not match' });
                  return;
                }
                if (newPassword.length < 8) {
                  setPwMessage({ type: 'error', text: 'Password must be at least 8 characters' });
                  return;
                }
                setPwSaving(true);
                setPwMessage(null);
                try {
                  await api.patch('/users/me/password', { currentPassword, newPassword });
                  setPwMessage({ type: 'success', text: 'Password changed successfully' });
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                } catch (err: any) {
                  setPwMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
                } finally {
                  setPwSaving(false);
                }
              }}
              disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
              className="self-end"
            >
              {pwSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-subtle" />

        {/* Theme settings */}
        <ThemeSettings />

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
