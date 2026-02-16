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
  const base = 'flex h-12 w-12 items-center justify-center transition-all overflow-hidden';

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className={cn(base, active ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]')}
      />
    );
  }

  return (
    <div
      className={cn(
        base,
        'bg-bg-medium text-sm font-semibold text-text-primary',
        active
          ? 'rounded-[16px] bg-accent text-white'
          : 'rounded-[24px] hover:rounded-[16px] hover:bg-accent hover:text-white',
      )}
    >
      {getInitials(name)}
    </div>
  );
}
