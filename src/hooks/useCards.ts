import { useCallback, useEffect, useState } from 'react'
import type { CardDraft, FinancialCard } from '../types'
import { createId } from '../lib/cards'
import { loadCards, saveCards } from '../lib/storage'

export interface UseCardsResult {
  cards: FinancialCard[]
  storageAvailable: boolean
  addCard: (draft: CardDraft) => void
  updateCard: (id: string, draft: CardDraft) => void
  /** Change only the balance, e.g. from the inline editor on a card. */
  setBalance: (id: string, balance: number | undefined) => void
  removeCard: (id: string) => void
}

export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<FinancialCard[]>(loadCards)
  const [storageAvailable, setStorageAvailable] = useState(true)

  useEffect(() => {
    setStorageAvailable(saveCards(cards))
  }, [cards])

  const addCard = useCallback((draft: CardDraft) => {
    const now = new Date().toISOString()
    const card: FinancialCard = {
      ...draft,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    }
    setCards((current) => [card, ...current])
  }, [])

  const updateCard = useCallback((id: string, draft: CardDraft) => {
    setCards((current) =>
      current.map((card) =>
        card.id === id
          ? { ...card, ...draft, updatedAt: new Date().toISOString() }
          : card,
      ),
    )
  }, [])

  const setBalance = useCallback((id: string, balance: number | undefined) => {
    setCards((current) =>
      current.map((card) =>
        card.id === id
          ? { ...card, balance, updatedAt: new Date().toISOString() }
          : card,
      ),
    )
  }, [])

  const removeCard = useCallback((id: string) => {
    setCards((current) => current.filter((card) => card.id !== id))
  }, [])

  return {
    cards,
    storageAvailable,
    addCard,
    updateCard,
    setBalance,
    removeCard,
  }
}
