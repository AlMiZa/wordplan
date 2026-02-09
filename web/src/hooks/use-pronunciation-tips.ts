import { useState } from 'react'
import { getPronunciationTips } from '@/lib/ai-service'
import type { PronunciationTipsResponse } from '@/lib/ai-service'

export function usePronunciationTips() {
  const [data, setData] = useState<PronunciationTipsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentWord, setCurrentWord] = useState<string | null>(null)

  const fetchPronunciationTips = async (word: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await getPronunciationTips(word)
      setData(result)
      setCurrentWord(word)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pronunciation tips'
      setError(message)
      console.error('Error fetching pronunciation tips:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const clearData = () => {
    setData(null)
    setError(null)
    setCurrentWord(null)
  }

  return {
    data,
    loading,
    error,
    fetchPronunciationTips,
    clearData,
    setData,
    currentWord,
  }
}
