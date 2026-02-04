import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

  const handleOk = async () => {
    if (!selectedLanguage) return

    setIsSaving(true)
    try {
      await updateTargetLanguage(selectedLanguage)
      onOpenChange(false)

      if (isFirstTime) {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Failed to update target language:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedLanguage(null)
    onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedLanguage(null)
    }
    onOpenChange(open)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Select Your Target Language</SheetTitle>
          <SheetDescription>
            {isFirstTime
              ? 'Welcome! Please choose the language you want to learn. This will personalize your experience.'
              : 'Choose the language you want to learn. Phrases will be generated in both English and your target language.'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {Object.entries(TARGET_LANGUAGES).map(([key, { name, flag }]) => {
            const isSelected = selectedLanguage === key
            return (
              <Button
                key={key}
                variant={isSelected ? "default" : "outline"}
                className={`w-full h-auto py-4 px-6 justify-start text-left transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedLanguage(key as TargetLanguage)}
              >
                <span className="text-3xl mr-4">{flag}</span>
                <span className="text-lg font-medium">{name}</span>
                {isSelected && (
                  <span className="ml-auto text-xl">✓</span>
                )}
              </Button>
            )
          })}
        </div>

        {isFirstTime && (
          <p className="mt-6 text-sm text-muted-foreground">
            You can always change this preference later in Settings.
          </p>
        )}

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
