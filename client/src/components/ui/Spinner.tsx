import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-bg-lighter border-t-accent', sizeClass[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}
