import { useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconRotateCw } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { FlashcardCard } from './flashcard-card'
import type { WordPair } from '@/lib/ai-service'

interface FlashcardStudyProps {
  wordPairs: WordPair[]
  onExit: () => void
}

export function FlashcardStudy({ wordPairs, onExit }: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [studied, setStudied] = useState<Set<string>>(new Set())

  const currentCard = wordPairs[currentIndex]
  const progress = ((studied.size + 1) / wordPairs.length) * 100

  const handleNext = () => {
    if (currentIndex < wordPairs.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleShuffle = () => {
    // Shuffle studied cards to the end
    const newStudied = new Set(studied)
    newStudied.add(currentCard.id)
    setStudied(newStudied)

    // Move to next card
    if (currentIndex < wordPairs.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // All cards studied
      setCurrentIndex(0)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setStudied(new Set())
  }

  if (wordPairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No flashcards to study.</p>
        <Button onClick={onExit} className="mt-4">
          Exit Study Mode
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onExit}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Exit Study Mode
        </Button>
        <div className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {wordPairs.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <FlashcardCard wordPair={currentCard} studyMode />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleShuffle}
          disabled={currentIndex === wordPairs.length - 1}
        >
          <IconRotateCw className="mr-2 h-4 w-4" />
          Mark as Learned
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleNext}
          disabled={currentIndex === wordPairs.length - 1}
        >
          Next
          <IconArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Complete message */}
      {currentIndex === wordPairs.length - 1 && studied.size > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            🎉 You've studied all {wordPairs.length} cards!
          </p>
          <Button variant="outline" onClick={handleRestart}>
            <IconRotateCw className="mr-2 h-4 w-4" />
            Study Again
          </Button>
        </div>
      )}
    </div>
  )
}
