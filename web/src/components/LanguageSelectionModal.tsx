import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/UserContext'
import { TARGET_LANGUAGES, type TargetLanguage } from '@/types/languages'

interface LanguageSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isFirstTime?: boolean
}

export function LanguageSelectionModal({ open, onOpenChange, isFirstTime = false }: LanguageSelectionModalProps) {
  const { updateTargetLanguage } = useUser()
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOk = async () => {
    if (!selectedLanguage) return

    setIsSaving(true)
    setError(null)
    try {
      await updateTargetLanguage(selectedLanguage)
      // Close modal on success
      onOpenChange(false)

      if (isFirstTime) {
        navigate('/dashboard')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save language selection'
      setError(message)
      console.error('Failed to update target language:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedLanguage(null)
    setError(null)
    onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedLanguage(null)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Target Language</DialogTitle>
          <DialogDescription>
            {isFirstTime
              ? 'Welcome! Please choose the language you want to learn. This will personalize your experience.'
              : 'Choose the language you want to learn. Phrases will be generated in both English and your target language.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          {Object.entries(TARGET_LANGUAGES).map(([key, { name, flag }]) => {
            const isSelected = selectedLanguage === key
            return (
              <Button
                key={key}
                variant={isSelected ? "default" : "outline"}
                className={`w-full h-auto py-3 px-4 justify-start text-left transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedLanguage(key as TargetLanguage)}
              >
                <span className="text-2xl mr-3">{flag}</span>
                <span className="text-base font-medium">{name}</span>
                {isSelected && (
                  <span className="ml-auto text-lg">✓</span>
                )}
              </Button>
            )
          })}
        </div>

        {isFirstTime && (
          <p className="mt-4 text-xs text-muted-foreground">
            You can always change this preference later in Settings.
          </p>
        )}

        {error && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleOk}
            disabled={!selectedLanguage || isSaving}
          >
            {isSaving ? 'Saving...' : 'OK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
