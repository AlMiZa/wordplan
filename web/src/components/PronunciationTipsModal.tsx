import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePronunciationTips } from '@/hooks/use-pronunciation-tips'
import { usePronunciationCache } from '@/hooks/use-pronunciation-cache'

interface PronunciationTipsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  word: string
}

export function PronunciationTipsModal({ open, onOpenChange, word }: PronunciationTipsModalProps) {
  const { data, loading, error, fetchPronunciationTips, clearData } = usePronunciationTips()
  const { cachedData, isCheckingCache, saveToCache } = usePronunciationCache(word)
  const hasFetchedRef = useRef(false)

  // Use cache data if available, otherwise use fetched data
  const displayData = cachedData || data

  // Auto-fetch when modal opens if no cached data
  useEffect(() => {
    if (open && !cachedData && !hasFetchedRef.current && !loading && !error && !isCheckingCache) {
      hasFetchedRef.current = true
      fetchPronunciationTips(word).then((result) => {
        // Save to cache when new data is fetched
        if (result && !result.cached) {
          saveToCache({
            word: result.word,
            phonetic_transcription: result.phonetic_transcription,
            syllables: result.syllables,
            pronunciation_tips: result.pronunciation_tips,
            memory_aids: result.memory_aids,
            common_mistakes: result.common_mistakes,
          })
        }
      })
    }
  }, [open, word, cachedData, loading, error, isCheckingCache, fetchPronunciationTips, saveToCache])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      clearData()
      hasFetchedRef.current = false
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pronunciation Tips for "{word}"</DialogTitle>
          <DialogDescription>Expert guidance on how to pronounce this word correctly</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading pronunciation tips...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {displayData && !loading && (
            <div className="space-y-6">
              {/* Phonetic Transcription */}
              <div>
                <h4 className="text-sm font-medium mb-2">Phonetic Transcription</h4>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-lg">{displayData.phonetic_transcription}</code>
                </div>
              </div>

              {/* Syllables */}
              <div>
                <h4 className="text-sm font-medium mb-2">Syllables</h4>
                <div className="flex flex-wrap gap-2">
                  {displayData.syllables.map((syllable: string, i: number) => (
                    <Badge key={i} variant="secondary">{syllable}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pronunciation Tips */}
              <div>
                <h4 className="text-sm font-medium mb-2">Pronunciation Tips</h4>
                <ul className="space-y-2">
                  {displayData.pronunciation_tips.map((tip: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Memory Aids */}
              <div>
                <h4 className="text-sm font-medium mb-2">Memory Aids</h4>
                <ul className="space-y-2">
                  {displayData.memory_aids.map((aid: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span>{aid}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Mistakes */}
              {displayData.common_mistakes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Mistakes to Avoid</h4>
                    <ul className="space-y-2">
                      {displayData.common_mistakes.map((mistake: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-600">•</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
