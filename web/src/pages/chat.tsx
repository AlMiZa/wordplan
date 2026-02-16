import { useEffect, useRef } from 'react'
import { useChat } from '@/hooks/use-chat'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatMessage } from '@/components/chat/chat-message'
import { ChatInput } from '@/components/chat/chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'

export default function ChatPage() {
  const {
    chats,
    currentChat,
    messages,
    loading,
    sending,
    createNewChat,
    selectChat,
    deleteChat,
    renameChat,
    sendMessage,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = async () => {
    await createNewChat()
  }

  const handleSendMessage = async (message: string) => {
    await sendMessage(message)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        currentChatId={currentChat?.id || null}
        loading={loading}
        onSelectChat={selectChat}
        onNewChat={handleNewChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {currentChat ? (
          <>
            {/* Chat header */}
            <div className="border-b bg-muted/10 px-6 py-4">
              <h1 className="text-xl font-semibold">{currentChat.title || 'Chat'}</h1>
              <p className="text-sm text-muted-foreground">
                Ask about translations, vocabulary, grammar, and more
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-3xl">💬</span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Start a conversation</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Ask me anything about language learning! I can help with translations,
                      vocabulary suggestions, grammar explanations, and more.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {sending && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                        </div>
                        <span>Thinking...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <ChatInput onSend={handleSendMessage} disabled={sending} />
          </>
        ) : (
          // Empty state - no chat selected
          <div className="flex flex-1 items-center justify-center p-8">
            <Card className="max-w-md p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Welcome to Smart Tutor</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Your AI-powered language tutor is ready to help! Create a new chat to get started.
              </p>
              <button
                onClick={handleNewChat}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start New Chat
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
