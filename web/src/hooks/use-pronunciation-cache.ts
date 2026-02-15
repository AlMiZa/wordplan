import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PronunciationTipsCacheEntry {
  id: string
  user_id: string
  word: string
  phonetic_transcription: string
  syllables: string[]
  pronunciation_tips: string[]
  memory_aids: string[]
  common_mistakes: string[]
  created_at: string
  updated_at: string
}

export function usePronunciationCache(word: string) {
  const queryClient = useQueryClient()

  // Fetch cached pronunciation tips
  const { data: cachedData, isLoading: isCheckingCache } = useQuery({
    queryKey: ['pronunciation_tips_cache', word],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pronunciation_tips_cache')
        .select('*')
        .eq('word', word)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No cache entry found
          return null
        }
        throw error
      }
      return data as PronunciationTipsCacheEntry
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  // Save to cache mutation
  const { mutate: saveToCache } = useMutation({
    mutationFn: async (data: Omit<PronunciationTipsCacheEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('pronunciation_tips_cache')
        .upsert({
          user_id: user.id,
          ...data,
        }, {
          onConflict: 'user_id,word'
        })

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch the cache query
      queryClient.invalidateQueries({ queryKey: ['pronunciation_tips_cache', word] })
    },
  })

  return {
    cachedData,
    isCheckingCache,
    saveToCache,
  }
}
