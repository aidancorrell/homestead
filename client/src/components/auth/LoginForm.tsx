import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/channels/@me');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg-darkest theme-ink-wash">
      <div className="theme-clip-panel theme-glow-border theme-ink-wash w-full max-w-sm rounded-[var(--radius-md)] bg-bg-medium p-8 shadow-[var(--shadow-popup)]">
        <h1 className="theme-heading mb-2 text-center text-2xl font-bold text-text-primary font-[var(--font-heading)] tracking-[var(--heading-tracking)]">Welcome back!</h1>
        <p className="mb-6 text-center text-sm text-text-secondary">Log in to Homestead</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Need an account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
