import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePronunciationTips } from '@/hooks/use-pronunciation-tips'
import type { PronunciationTipsResponse } from '@/lib/ai-service'

interface PronunciationTipsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  word: string
  cachedData?: PronunciationTipsResponse
  onCacheData?: (word: string, data: PronunciationTipsResponse) => void
}

export function PronunciationTipsModal({ open, onOpenChange, word, cachedData, onCacheData }: PronunciationTipsModalProps) {
  const { data, loading, error, fetchPronunciationTips, clearData, setData } = usePronunciationTips()
  const hasFetchedRef = useRef(false)

  // Only use data if it belongs to the current word (check the word field in the data)
  const displayData = (cachedData?.word === word ? cachedData : null) || (data?.word === word ? data : null)

  // Load cached data when word changes
  useEffect(() => {
    if (cachedData && cachedData.word === word) {
      setData(cachedData)
      hasFetchedRef.current = true
    } else {
      clearData()
      hasFetchedRef.current = false
    }
  }, [word, cachedData, setData, clearData])

  // Auto-fetch when modal opens if no cached data
  useEffect(() => {
    if (open && !cachedData && !hasFetchedRef.current && !loading && !error) {
      hasFetchedRef.current = true
      fetchPronunciationTips(word).then((result) => {
        if (result && onCacheData) {
          onCacheData(word, result)
        }
      })
    }
  }, [open, word, cachedData, loading, error, fetchPronunciationTips, onCacheData])

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
                  {displayData.syllables.map((syllable, i) => (
                    <Badge key={i} variant="secondary">{syllable}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pronunciation Tips */}
              <div>
                <h4 className="text-sm font-medium mb-2">Pronunciation Tips</h4>
                <ul className="space-y-2">
                  {displayData.pronunciation_tips.map((tip, i) => (
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
                  {displayData.memory_aids.map((aid, i) => (
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
                      {displayData.common_mistakes.map((mistake, i) => (
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

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
