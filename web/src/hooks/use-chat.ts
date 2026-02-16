import { useState, useCallback, useEffect } from 'react'
import {
  getChats,
  createChat,
  deleteChat,
  sendChatMessage,
  getChatMessages,
  type Chat,
  type ChatMessage,
} from '@/lib/ai-service'

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Load all chats on mount
  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getChats()
      setChats(data)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      setLoading(true)
      const data = await getChatMessages(chatId)
      setMessages(data)

      // Update current chat
      const chat = chats.find((c) => c.id === chatId)
      if (chat) {
        setCurrentChat(chat)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }, [chats])

  const createNewChat = useCallback(async () => {
    try {
      const newChat = await createChat()
      setChats((prev) => [newChat, ...prev])
      setCurrentChat(newChat)
      setMessages([])
      return newChat
    } catch (error) {
      console.error('Failed to create chat:', error)
      throw error
    }
  }, [])

  const selectChat = useCallback(async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChat(chat)
      await loadMessages(chatId)
    }
  }, [chats, loadMessages])

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId)
      setChats((prev) => prev.filter((c) => c.id !== chatId))

      // Clear current chat if it was deleted
      if (currentChat?.id === chatId) {
        setCurrentChat(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }, [currentChat])

  const sendMessage = useCallback(async (message: string) => {
    if (sending) return

    try {
      setSending(true)

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chat_id: currentChat?.id || '',
        role: 'user',
        content: { content: message },
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Send message and get AI response
      const response = await sendChatMessage(currentChat?.id || null, message)

      // Update messages with the AI response
      setMessages((prev) => [...prev, response])

      // Update current chat if it was a new chat
      if (!currentChat) {
        const newChats = await getChats()
        setChats(newChats)
        // Set the current chat from response
        const updatedChat = newChats.find((c) => c.id === response.chat_id)
        if (updatedChat) {
          setCurrentChat(updatedChat)
        }
      } else {
        // Update the chat's updated_at timestamp
        setChats((prev) =>
          prev.map((c) =>
            c.id === currentChat.id
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          )
        )
      }

      return response
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    } finally {
      setSending(false)
    }
  }, [currentChat, sending])

  return {
    chats,
    currentChat,
    messages,
    loading,
    sending,
    loadChats,
    loadMessages,
    createNewChat,
    selectChat,
    deleteChat: handleDeleteChat,
    sendMessage,
  }
}
