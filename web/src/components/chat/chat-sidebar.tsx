import { useEffect } from 'react'
import { IconMessage, IconTrash, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Chat } from '@/lib/ai-service'

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId: string | null
  loading: boolean
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
}

export function ChatSidebar({
  chats,
  currentChatId,
  loading,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col border-r bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewChat}
          title="New chat"
        >
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">Loading chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <IconMessage className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No chats yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  currentChatId === chat.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50'
                }`}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="flex-1 truncate text-left"
                >
                  {chat.title || 'New Chat'}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChat(chat.id)
                  }}
                  title="Delete chat"
                >
                  <IconTrash className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
