import type { FinancialCard } from '../types'
import {
  isCardColor,
  isCardKind,
  isCardNetwork,
  isCurrency,
} from './cards'

const STORAGE_KEY = 'cardvault.cards.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return (
    value === undefined || (typeof value === 'number' && Number.isFinite(value))
  )
}

/**
 * Validate a persisted record before trusting it. Anything malformed is
 * discarded rather than rendered, so a hand-edited localStorage cannot break
 * the UI or smuggle a full card number into state.
 */
export function parseCard(value: unknown): FinancialCard | null {
  if (!isRecord(value)) return null

  const {
    id,
    nickname,
    bank,
    holder,
    network,
    kind,
    last4,
    expiryMonth,
    expiryYear,
    currency,
    creditLimit,
    balance,
    dueDay,
    color,
    notes,
    createdAt,
    updatedAt,
  } = value

  if (typeof id !== 'string' || !id) return null
  if (typeof nickname !== 'string' || !nickname.trim()) return null
  if (typeof bank !== 'string' || typeof holder !== 'string') return null
  if (!isCardNetwork(network) || !isCardKind(kind) || !isCardColor(color)) {
    return null
  }
  if (!isCurrency(currency)) return null
  if (typeof last4 !== 'string' || !/^\d{4}$/.test(last4)) return null
  if (
    typeof expiryMonth !== 'number' ||
    !Number.isInteger(expiryMonth) ||
    expiryMonth < 1 ||
    expiryMonth > 12
  ) {
    return null
  }
  if (
    typeof expiryYear !== 'number' ||
    !Number.isInteger(expiryYear) ||
    expiryYear < 2000 ||
    expiryYear > 2100
  ) {
    return null
  }
  if (!isOptionalNumber(creditLimit)) return null
  if (!isOptionalNumber(balance)) return null
  if (
    !isOptionalNumber(dueDay) ||
    (dueDay !== undefined &&
      (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31))
  ) {
    return null
  }
  if (typeof notes !== 'string') return null
  if (!isIsoDate(createdAt) || !isIsoDate(updatedAt)) return null

  return {
    id,
    nickname: nickname.trim(),
    bank: bank.trim(),
    holder: holder.trim(),
    network,
    kind,
    last4,
    expiryMonth,
    expiryYear,
    currency,
    creditLimit:
      creditLimit === undefined ? undefined : Math.max(0, creditLimit),
    balance: balance === undefined ? undefined : Math.max(0, balance),
    dueDay,
    color,
    notes,
    createdAt,
    updatedAt,
  }
}

export function loadCards(): FinancialCard[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(parseCard)
      .filter((card): card is FinancialCard => card !== null)
  } catch {
    return []
  }
}

export function saveCards(cards: FinancialCard[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    return true
  } catch {
    return false
  }
}

export { STORAGE_KEY }
