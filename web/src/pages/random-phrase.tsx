import { useEffect } from 'react'
import { useRandomPhrase } from '@/hooks/use-random-phrase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TARGET_LANGUAGES } from '@/types/languages'

export default function RandomPhrasePage() {
  const { phrase, phraseTargetLang, targetLanguage, words, loading, error, generatePhrase } = useRandomPhrase()

  // Generate initial phrase on component mount
  useEffect(() => {
    generatePhrase()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const targetLanguageInfo = targetLanguage
    ? TARGET_LANGUAGES[targetLanguage as keyof typeof TARGET_LANGUAGES]
    : null

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Random Phrase Generator</CardTitle>
            <CardDescription>
              Generate creative phrases using three random words from the database
              {targetLanguageInfo && ` (Bilingual: English + ${targetLanguageInfo.name})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Random Words Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Selected Words:</h3>
              <div className="flex gap-2 flex-wrap">
                {loading && words.length === 0 ? (
                  <>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </>
                ) : (
                  words.map((word) => (
                    <Badge key={word.id} variant="secondary" className="text-base px-3 py-1">
                      {word.word}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Generated Phrase Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Generated Phrase:</h3>
              <div className="rounded-lg border bg-muted/50 p-6 min-h-[120px] flex flex-col items-center justify-center">
                {loading ? (
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : error ? (
                  <div className="text-center space-y-2">
                    <p className="text-destructive font-medium">Error generating phrase</p>
                    <p className="text-sm text-muted-foreground">{error.message}</p>
                  </div>
                ) : phrase ? (
                  <div className="text-center space-y-4 w-full">
                    {/* English Phrase */}
                    <div>
                      <Badge variant="outline" className="mb-2">English</Badge>
                      <p className="text-lg leading-relaxed">{phrase}</p>
                    </div>

                    {/* Target Language Phrase */}
                    {phraseTargetLang && (
                      <>
                        <div className="border-t border-muted-foreground/20 my-3" />
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {targetLanguageInfo?.flag} {targetLanguageInfo?.name || 'Translation'}
                          </Badge>
                          <p className="text-lg leading-relaxed">{phraseTargetLang}</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center">
                    Click "Generate New Phrase" to start
                  </p>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={generatePhrase}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate New Phrase'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This feature pulls three random words from the database and uses AI to create
                a creative phrase that incorporates all three words.
              </p>
              {targetLanguageInfo ? (
                <p>
                  Each generation is personalized based on your user profile context and provided
                  in both English and {targetLanguageInfo.name} for a bilingual learning experience.
                </p>
              ) : (
                <p>
                  Each generation is personalized based on your user profile context. Select a target
                  language in Settings to enable bilingual generation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
