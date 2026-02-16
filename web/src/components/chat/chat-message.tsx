import { IconUser, IconRobot } from '@tabler/icons-react'
import { WordSuggestionCard } from './word-suggestion-card'
import type { ChatMessage } from '@/lib/ai-service'

interface ChatMessageProps {
  message: ChatMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // For user messages, content is { content: string }
  // For assistant messages, content is TutorResponseContent
  const messageContent =
    message.role === 'user'
      ? (message.content as { content: string }).content
      : (message.content as { response_type: string; content: string }).content

  const response_type =
    message.role === 'assistant'
      ? (message.content as { response_type: string }).response_type
      : 'text'

  const response_data =
    message.role === 'assistant'
      ? (message.content as { data?: { word?: string; translation?: string; example?: string } }).data
      : undefined

  return (
    <div
      className={`flex gap-3 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <IconRobot className="h-5 w-5 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Word suggestion card */}
        {!isUser && response_type === 'word_suggestion' && response_data ? (
          <WordSuggestionCard
            word={response_data.word || ''}
            translation={response_data.translation || ''}
            example={response_data.example || ''}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <IconUser className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
