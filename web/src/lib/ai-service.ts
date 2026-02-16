import { supabase } from './supabase'

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'

export interface RandomPhraseResponse {
  phrase: string
  phrase_target_lang: string | null
  target_language: string | null
  words_used: string[]
}

export interface PronunciationTipsResponse {
  word: string
  phonetic_transcription: string
  syllables: string[]
  pronunciation_tips: string[]
  memory_aids: string[]
  common_mistakes: string[]
  cached?: boolean
}

// Chat types
export type ResponseType = 'text' | 'word_suggestion' | 'save_confirmation' | 'error'

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface TutorResponseContent {
  response_type: ResponseType
  content: string
  data?: {
    word?: string
    translation?: string
    example?: string
  }
  tool_calls?: ToolCall[]
}

export interface ChatMessage {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: TutorResponseContent | { content: string }
  created_at: string
}

export interface Chat {
  id: string
  user_id: string
  title?: string
  created_at: string
  updated_at: string
}

/**
 * Generate a random phrase using the AI service
 * @param words - Array of words to use in the phrase
 * @returns Promise with the generated phrase and words used
 */
export async function generateRandomPhrase(words: string[]): Promise<RandomPhraseResponse> {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to generate phrases')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/random-phrase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ words }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to generate phrase: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get pronunciation tips for a word
 * @param word - The word to get pronunciation tips for
 * @returns Promise with pronunciation tips data
 */
export async function getPronunciationTips(word: string): Promise<PronunciationTipsResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get pronunciation tips')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/pronunciation-tips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ word }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get pronunciation tips: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Send a message to the chat tutor
 * @param chatId - The ID of the chat (or null for new chat)
 * @param message - The message to send
 * @returns Promise with the assistant's response message
 */
export async function sendChatMessage(
  chatId: string | null,
  message: string
): Promise<ChatMessage> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to chat')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      chat_id: chatId,
      message,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to send message: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all chats for the current user
 * @returns Promise with list of chats
 */
export async function getChats(): Promise<Chat[]> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get chats')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/chats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get chats: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create a new chat
 * @param title - Optional title for the chat
 * @returns Promise with the created chat
 */
export async function createChat(title?: string): Promise<Chat> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to create chat')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to create chat: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a chat
 * @param chatId - The ID of the chat to delete
 * @returns Promise that resolves when the chat is deleted
 */
export async function deleteChat(chatId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to delete chat')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/chats/${chatId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to delete chat: ${response.statusText}`)
  }
}

/**
 * Get messages for a chat
 * @param chatId - The ID of the chat
 * @returns Promise with list of messages
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get chat messages')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/chats/${chatId}/messages`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get chat messages: ${response.statusText}`)
  }

  return response.json()
}

// Word pairs types
export interface WordPair {
  id: string
  user_id: string
  source_word: string
  translated_word: string
  context_sentence: string | null
  created_at: string
}

/**
 * Get all word pairs for the current user
 * @returns Promise with list of word pairs
 */
export async function getWordPairs(): Promise<WordPair[]> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get word pairs')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get word pairs: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a word pair
 * @param wordPairId - The ID of the word pair to delete
 * @returns Promise that resolves when the word pair is deleted
 */
export async function deleteWordPair(wordPairId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to delete word pair')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs/${wordPairId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to delete word pair: ${response.statusText}`)
  }
}
