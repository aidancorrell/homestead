import { useThemeStore, type Theme } from '../../stores/themeStore';
import { cn } from '../../lib/utils';

const themes: {
  id: Theme;
  label: string;
  description: string;
  colors: { bg: string; sidebar: string; panel: string; accent: string; text: string; muted: string; border: string };
  radius: string;
  clipPath?: string;
  shadow: string;
  headingFont: string;
  scanlines?: boolean;
}[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Familiar & balanced',
    colors: { bg: '#1a1a2e', sidebar: '#0f0f1a', panel: '#25253e', accent: '#7c5cbf', text: '#e8e8f0', muted: '#6a6a82', border: '#3a3a5c' },
    radius: '8px',
    shadow: '0 1px 3px rgba(0,0,0,0.3)',
    headingFont: 'Inter, sans-serif',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'HUD interface, neon glow',
    colors: { bg: '#0a0a18', sidebar: '#05050d', panel: '#0d1020', accent: '#00f7ff', text: '#d0e8ff', muted: '#3a6080', border: 'rgba(0,247,255,0.3)' },
    radius: '0px',
    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
    shadow: '0 0 12px rgba(0,247,255,0.2)',
    headingFont: 'Share Tech Mono, monospace',
    scanlines: true,
  },
  {
    id: 'tsushima',
    label: 'Tsushima',
    description: 'Ink & crimson, atmospheric',
    colors: { bg: '#121210', sidebar: '#0a0a0a', panel: '#1c1b18', accent: '#c23030', text: '#e8e4dc', muted: '#605848', border: '#3a3530' },
    radius: '4px',
    shadow: '0 2px 8px rgba(0,0,0,0.6)',
    headingFont: 'Noto Serif JP, serif',
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
              'flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 p-3 transition-colors cursor-pointer',
              theme === t.id
                ? 'border-accent bg-bg-darkest'
                : 'border-border-subtle bg-bg-darkest hover:border-border-default',
            )}
          >
            {/* Mini app mockup */}
            <div
              className="relative flex h-20 w-full overflow-hidden"
              style={{
                backgroundColor: t.colors.bg,
                borderRadius: t.radius,
                border: `1px solid ${t.colors.border}`,
                boxShadow: t.shadow,
                clipPath: t.clipPath,
              }}
            >
              {/* Sidebar strip */}
              <div className="w-[22%] flex flex-col items-center gap-1.5 py-2" style={{ backgroundColor: t.colors.sidebar }}>
                <div className="h-3.5 w-3.5" style={{ backgroundColor: t.colors.accent, borderRadius: t.radius || '4px' }} />
                <div className="h-3.5 w-3.5 opacity-40" style={{ backgroundColor: t.colors.muted, borderRadius: '50%' }} />
                <div className="h-3.5 w-3.5 opacity-30" style={{ backgroundColor: t.colors.muted, borderRadius: '50%' }} />
              </div>
              {/* Channel sidebar */}
              <div className="w-[30%] flex flex-col gap-1 py-2 px-1" style={{ backgroundColor: t.colors.panel, borderRight: `1px solid ${t.colors.border}` }}>
                <div className="h-1.5 w-8" style={{ backgroundColor: t.colors.text, opacity: 0.7, fontFamily: t.headingFont }} />
                <div className="h-1 w-10 opacity-40" style={{ backgroundColor: t.colors.muted, borderRadius: '2px' }} />
                <div className="h-1 w-8 opacity-30" style={{ backgroundColor: t.colors.muted, borderRadius: '2px' }} />
                <div className="mt-auto h-2 w-full" style={{ backgroundColor: t.colors.accent, borderRadius: t.radius, opacity: 0.5 }} />
              </div>
              {/* Main content */}
              <div className="flex flex-1 flex-col justify-between py-2 px-1.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.colors.accent, opacity: 0.6 }} />
                    <div className="h-1 w-8" style={{ backgroundColor: t.colors.text, opacity: 0.6 }} />
                  </div>
                  <div className="h-1 w-full opacity-30" style={{ backgroundColor: t.colors.muted }} />
                  <div className="h-1 w-3/4 opacity-20" style={{ backgroundColor: t.colors.muted }} />
                </div>
                {/* Input bar */}
                <div className="mt-1 h-2.5 w-full" style={{ backgroundColor: t.colors.panel, borderRadius: t.radius, border: `1px solid ${t.colors.border}` }} />
              </div>
              {/* Scanlines overlay for cyberpunk */}
              {t.scanlines && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,247,255,0.04) 2px, rgba(0,247,255,0.04) 4px)',
                  }}
                />
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  'text-xs font-medium',
                  theme === t.id ? 'text-text-primary' : 'text-text-secondary',
                )}
                style={{ fontFamily: t.headingFont }}
              >
                {t.label}
              </span>
              <span className="text-[10px] text-text-muted leading-tight text-center">{t.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
