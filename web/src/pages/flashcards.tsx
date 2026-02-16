import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSchool, IconList, IconBook } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlashcardList } from '@/components/flashcard/flashcard-list'
import { FlashcardStudy } from '@/components/flashcard/flashcard-study'
import { useWordPairs } from '@/hooks/use-word-pairs'

export default function FlashcardsPage() {
  const navigate = useNavigate()
  const { wordPairs, loading, fetchWordPairs, removeWordPair } = useWordPairs()
  const [studyMode, setStudyMode] = useState(false)

  useEffect(() => {
    fetchWordPairs()
  }, [fetchWordPairs])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this flashcard?')) {
      await removeWordPair(id)
    }
  }

  const handleStartChat = () => {
    navigate('/chat')
  }

  if (studyMode && wordPairs.length > 0) {
    return (
      <div className="container mx-auto py-8">
        <FlashcardStudy
          wordPairs={wordPairs}
          onExit={() => setStudyMode(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
        <p className="text-muted-foreground">
          Study your saved vocabulary words with interactive flashcards
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">
            <IconList className="mr-2 h-4 w-4" />
            My Flashcards
          </TabsTrigger>
          <TabsTrigger value="study" disabled={wordPairs.length === 0}>
            <IconSchool className="mr-2 h-4 w-4" />
            Study Mode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{wordPairs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Last Added</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {wordPairs.length > 0
                    ? new Date(wordPairs[wordPairs.length - 1].created_at).toLocaleDateString()
                    : 'Never'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Study Ready</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setStudyMode(true)}
                  disabled={wordPairs.length === 0}
                  className="w-full"
                >
                  <IconSchool className="mr-2 h-4 w-4" />
                  Start Study
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Flashcard list */}
          <FlashcardList
            wordPairs={wordPairs}
            loading={loading}
            onDelete={handleDelete}
            onAddNew={handleStartChat}
          />
        </TabsContent>

        <TabsContent value="study">
          <Card>
            <CardHeader>
              <CardTitle>Study Mode</CardTitle>
              <CardDescription>
                {wordPairs.length === 0
                  ? 'Add flashcards from the chat to start studying'
                  : `${wordPairs.length} cards to study`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wordPairs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <IconBook className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Start chatting to save vocabulary words to your flashcard deck.
                  </p>
                  <Button onClick={handleStartChat}>
                    <IconBook className="mr-2 h-4 w-4" />
                    Go to Chat
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Button
                    size="lg"
                    onClick={() => setStudyMode(true)}
                  >
                    <IconSchool className="mr-2 h-4 w-4" />
                    Start Study Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
