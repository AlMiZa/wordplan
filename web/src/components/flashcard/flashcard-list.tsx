import { IconPlus, IconBookOpen } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { FlashcardCard } from './flashcard-card'
import type { WordPair } from '@/lib/ai-service'

interface FlashcardListProps {
  wordPairs: WordPair[]
  loading?: boolean
  onAddNew?: () => void
  onDelete?: (id: string) => void
}

export function FlashcardList({ wordPairs, loading, onAddNew, onDelete }: FlashcardListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading flashcards...</p>
      </div>
    )
  }

  if (wordPairs.length === 0) {
    return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <IconBookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
      <p className="max-w-md text-sm text-muted-foreground mb-6">
        Save vocabulary words from the chat to build your personalized flashcard deck.
      </p>
      {onAddNew && (
        <Button onClick={onAddNew}>
          <IconPlus className="mr-2 h-4 w-4" />
          Start Chat
        </Button>
      )}
    </div>
  )
  }

  return (
    <div className="space-y-4">
      {wordPairs.map((wordPair) => (
        <FlashcardCard
          key={wordPair.id}
          wordPair={wordPair}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
