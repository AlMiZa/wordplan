import { useState } from 'react'
import { IconLogout } from '@tabler/icons-react'
import { useUser } from '@/contexts/UserContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LanguageSelectionModal } from '@/components/LanguageSelectionModal'
import { TARGET_LANGUAGES } from '@/types/languages'

export default function SettingsPage() {
  const { profile, signOut } = useUser()
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  console.log('Settings page - profile:', profile)

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const currentLanguage = profile?.target_language
    ? TARGET_LANGUAGES[profile.target_language as keyof typeof TARGET_LANGUAGES]
    : null

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your preferences and profile settings</p>
        </div>

        {/* Target Language Setting */}
        <Card>
          <CardHeader>
            <CardTitle>Target Language</CardTitle>
            <CardDescription>
              The language you want to learn. Phrases will be generated in both English and your target language.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentLanguage ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentLanguage.flag}</span>
                  <div>
                    <p className="font-medium text-lg">{currentLanguage.name}</p>
                    <p className="text-sm text-muted-foreground">Currently selected</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowLanguageModal(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">No language selected</p>
                  <p className="text-sm text-muted-foreground">Select a target language to get started</p>
                </div>
                <Button onClick={() => setShowLanguageModal(true)}>
                  Select Language
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">About Bilingual Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                When you select a target language, the AI will generate phrases in both English and your chosen language.
                This helps you learn vocabulary and sentence structures in context.
              </p>
              <p>
                Currently supported languages:
              </p>
              <div className="flex gap-2 flex-wrap pt-2">
                {Object.entries(TARGET_LANGUAGES).map(([key, { name, flag }]) => (
                  <Badge key={key} variant="secondary">
                    {flag} {name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Selection Modal */}
        <LanguageSelectionModal
          open={showLanguageModal}
          onOpenChange={setShowLanguageModal}
        />

        {/* Account Actions */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Account Actions</CardTitle>
            <CardDescription>
              Manage your account session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <IconLogout className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
