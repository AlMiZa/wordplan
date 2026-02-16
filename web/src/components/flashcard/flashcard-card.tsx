import { useState } from 'react'
import { IconBook, IconTrash, IconRotate } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { WordPair } from '@/lib/ai-service'

interface FlashcardCardProps {
  wordPair: WordPair
  onDelete?: (id: string) => void
  studyMode?: boolean
}

export function FlashcardCard({ wordPair, onDelete, studyMode = false }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-0">
        {/* Flashcard with flip animation */}
        <div
          className={`relative min-h-[200px] cursor-pointer transition-all duration-500 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={studyMode ? handleFlip : undefined}
        >
          {/* Front side (source word) */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${
              isFlipped ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <IconBook className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Translate</span>
            </div>
            <h3 className="text-3xl font-bold text-center">{wordPair.source_word}</h3>
            {studyMode && (
              <p className="mt-4 text-sm text-muted-foreground">Click to see translation</p>
            )}
          </div>

          {/* Back side (translation) */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-6 bg-muted/50 ${
              !isFlipped ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <IconBook className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Translation</span>
            </div>
            <h3 className="text-3xl font-bold text-center">{wordPair.translated_word}</h3>
            {wordPair.context_sentence && (
              <p className="mt-4 text-center text-sm italic text-muted-foreground">
                "{wordPair.context_sentence}"
              </p>
            )}
            {studyMode && (
              <p className="mt-4 text-sm text-muted-foreground">Click to go back</p>
            )}
          </div>
        </div>

        {/* Action buttons (not in study mode) */}
        {!studyMode && (
          <div className="absolute top-2 right-2 flex gap-1">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(wordPair.id)
                }}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
