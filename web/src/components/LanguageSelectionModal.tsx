import { useNavigate } from 'react-router-dom'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

  const handleLanguageSelect = async (language: TargetLanguage) => {
    console.log('Language selected:', language, 'isFirstTime:', isFirstTime)
    try {
      await updateTargetLanguage(language)
      console.log('Language updated successfully, closing modal')
      onOpenChange(false)

      if (isFirstTime) {
        console.log('Navigating to dashboard')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Failed to update target language:', error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
          {Object.entries(TARGET_LANGUAGES).map(([key, { name, flag }]) => (
            <Button
              key={key}
              variant="outline"
              className="w-full h-auto py-4 px-6 justify-start text-left hover:bg-accent"
              onClick={() => handleLanguageSelect(key as TargetLanguage)}
            >
              <span className="text-3xl mr-4">{flag}</span>
              <span className="text-lg font-medium">{name}</span>
            </Button>
          ))}
        </div>

        {isFirstTime && (
          <p className="mt-6 text-sm text-muted-foreground">
            You can always change this preference later in Settings.
          </p>
        )}
      </SheetContent>
    </Sheet>
  )
}
