import { cn } from '../../lib/utils';

interface ServerIconProps {
  name: string;
  iconUrl?: string | null;
  active?: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ServerIcon({ name, iconUrl, active }: ServerIconProps) {
  const base = 'flex h-12 w-12 items-center justify-center transition-all overflow-hidden border border-transparent';

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className={cn(
          base,
          active
            ? 'rounded-[var(--radius-server-active)] border-accent'
            : 'rounded-[var(--radius-server-inactive)] hover:rounded-[var(--radius-server-active)] hover:border-accent',
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        base,
        'bg-bg-medium text-sm font-semibold',
        active
          ? 'rounded-[var(--radius-server-active)] border-accent bg-accent text-white'
          : 'rounded-[var(--radius-server-inactive)] hover:rounded-[var(--radius-server-active)] hover:border-accent hover:bg-accent hover:text-white',
      )}
    >
      {getInitials(name)}
    </div>
  );
}
