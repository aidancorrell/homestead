import { useThemeStore, type Theme } from '../../stores/themeStore';
import { cn } from '../../lib/utils';

const themes: { id: Theme; label: string; colors: { bg: string; accent: string; text: string } }[] = [
  {
    id: 'default',
    label: 'Default',
    colors: { bg: '#1a1a2e', accent: '#7c5cbf', text: '#e8e8f0' },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    colors: { bg: '#0f0f1e', accent: '#ff2a6d', text: '#e0f0ff' },
  },
  {
    id: 'japandi',
    label: 'Japandi',
    colors: { bg: '#1e1b18', accent: '#7a9a6e', text: '#e8e0d6' },
  },
];

export function ThemeSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Theme</h3>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors cursor-pointer',
              theme === t.id
                ? 'border-accent bg-bg-darkest'
                : 'border-border-subtle bg-bg-darkest hover:border-border-default',
            )}
          >
            {/* Color preview swatch */}
            <div
              className="flex h-10 w-full overflow-hidden rounded-md"
              style={{ backgroundColor: t.colors.bg }}
            >
              <div className="w-1/3" style={{ backgroundColor: t.colors.bg }} />
              <div className="flex w-2/3 flex-col items-start justify-center gap-1 px-2">
                <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: t.colors.text, opacity: 0.8 }} />
                <div className="h-1.5 w-5 rounded-full" style={{ backgroundColor: t.colors.accent }} />
              </div>
            </div>
            <span className={cn(
              'text-xs font-medium',
              theme === t.id ? 'text-text-primary' : 'text-text-secondary',
            )}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
