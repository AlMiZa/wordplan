export type TargetLanguage = 'polish' | 'belarusian' | 'italian'

export const TARGET_LANGUAGES: Record<TargetLanguage, { name: string; flag: string }> = {
  polish: { name: 'Polish', flag: '🇵🇱' },
  belarusian: { name: 'Belarusian', flag: '🇧🇾' },
  italian: { name: 'Italian', flag: '🇮🇹' }
} as const
