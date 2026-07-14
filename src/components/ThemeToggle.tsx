interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-white text-lg
        shadow-sm transition hover:scale-105 hover:border-primary dark:border-primary-light/30 dark:bg-stone-800"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
