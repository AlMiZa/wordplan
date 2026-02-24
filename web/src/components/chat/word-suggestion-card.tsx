import { useState } from 'react'
import { IconBook, IconCheck, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { sendChatMessage } from '@/lib/ai-service'

interface WordSuggestionCardProps {
  word: string
  translation: string
  example: string
}

export function WordSuggestionCard({
  word,
  translation,
  example,
}: WordSuggestionCardProps) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saved || saving) return

    setSaving(true)
    try {
      // Send a message to trigger the save_word_pair tool
      await sendChatMessage(
        null,
        `Save "${word}" → "${translation}" to my list. Example: ${example}`
      )
      setSaved(true)
    } catch (error) {
      console.error('Failed to save word pair:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Word and translation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconBook className="h-5 w-5 text-primary" />
          <div>
            <span className="font-semibold">{word}</span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="text-muted-foreground">{translation}</span>
          </div>
        </div>
        <Button
          variant={saved ? 'default' : 'outline'}
          size="sm"
          onClick={handleSave}
          disabled={saved || saving}
          className="shrink-0"
        >
          {saved ? (
            <>
              <IconCheck className="mr-1 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <IconPlus className="mr-1 h-4 w-4" />
              Add to list
            </>
          )}
        </Button>
      </div>

      {/* Example sentence */}
      {example && (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-xs italic text-muted-foreground">
            "{example}"
          </p>
        </div>
      )}
    </div>
  )
}
