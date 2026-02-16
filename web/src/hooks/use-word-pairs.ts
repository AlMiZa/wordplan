import { useState, useCallback } from 'react'
import { getWordPairs, deleteWordPair, type WordPair } from '@/lib/ai-service'

export function useWordPairs() {
  const [wordPairs, setWordPairs] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWordPairs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWordPairs()
      setWordPairs(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch word pairs'
      setError(message)
      console.error('Error fetching word pairs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const removeWordPair = useCallback(async (wordPairId: string) => {
    try {
      await deleteWordPair(wordPairId)
      setWordPairs((prev) => prev.filter((wp) => wp.id !== wordPairId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete word pair'
      setError(message)
      console.error('Error deleting word pair:', err)
      throw err
    }
  }, [])

  return {
    wordPairs,
    loading,
    error,
    fetchWordPairs,
    removeWordPair,
  }
}
