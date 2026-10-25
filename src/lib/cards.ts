import type {
  CardColor,
  CardKind,
  CardNetwork,
  Currency,
  FinancialCard,
} from '../types'
import { CARD_COLORS, CARD_KINDS, CURRENCIES, NETWORKS } from '../types'

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  other: 'Card',
}

export const NETWORK_MARKS: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'mastercard',
  amex: 'AMEX',
  discover: 'DISCOVER',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  other: 'CARD',
}

export const KIND_LABELS: Record<CardKind, string> = {
  credit: 'Credit',
  debit: 'Debit',
  prepaid: 'Prepaid',
}

export const COLOR_LABELS: Record<CardColor, string> = {
  midnight: 'Midnight',
  ocean: 'Ocean',
  violet: 'Violet',
  emerald: 'Emerald',
  sunset: 'Sunset',
  rose: 'Rose',
  graphite: 'Graphite',
}

/** Keep only digits; card fields never accept letters. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Detect the card network from its issuer identification number. Returns
 * "other" for anything we cannot recognise with confidence.
 */
export function detectNetwork(cardNumber: string): CardNetwork {
  const digits = digitsOnly(cardNumber)
  if (!digits) return 'other'

  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return 'mastercard'
  }
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return 'discover'
  if (/^35(2[89]|[3-8]\d)/.test(digits)) return 'jcb'
  if (/^62/.test(digits)) return 'unionpay'
  return 'other'
}

/** Luhn checksum — catches most typos and made-up numbers. */
export function passesLuhn(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber)
  if (digits.length < 12 || digits.length > 19) return false

  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = Number(digits[i])
    if (double) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
    double = !double
  }
  return sum % 10 === 0
}

export function last4Of(cardNumber: string): string {
  return digitsOnly(cardNumber).slice(-4)
}

/** Group digits the way they are printed on the physical card. */
export function formatCardNumber(cardNumber: string): string {
  const digits = digitsOnly(cardNumber).slice(0, 19)
  const groups = detectNetwork(digits) === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3]
  const parts: string[] = []
  let index = 0
  for (const size of groups) {
    if (index >= digits.length) break
    parts.push(digits.slice(index, index + size))
    index += size
  }
  if (index < digits.length) parts.push(digits.slice(index))
  return parts.join(' ')
}

export function maskedNumber(last4: string): string {
  return `•••• •••• •••• ${last4}`
}

export function expiryLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
}

/** A card is valid through the final second of its expiry month. */
export function isExpired(
  month: number,
  year: number,
  now: Date = new Date(),
): boolean {
  const endOfMonth = new Date(year, month, 1)
  return endOfMonth.getTime() <= now.getTime()
}

export function daysUntilExpiry(
  month: number,
  year: number,
  now: Date = new Date(),
): number {
  const endOfMonth = new Date(year, month, 1)
  return Math.ceil((endOfMonth.getTime() - now.getTime()) / 86_400_000)
}

export function isExpiringSoon(
  month: number,
  year: number,
  withinDays = 60,
  now: Date = new Date(),
): boolean {
  const days = daysUntilExpiry(month, year, now)
  return days >= 0 && days <= withinDays
}

/** Round to cents to avoid floating point drift. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Parse a money field typed by hand. An empty value means "not set" and
 * clears the amount, so only explicit numbers reach storage.
 */
export function parseMoneyInput(raw: string): {
  value?: number
  error?: string
} {
  const trimmed = raw.trim()
  if (!trimmed) return {}
  const normalised = trimmed.replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) {
    return { error: 'Use digits only, for example 2500 or 2500.50' }
  }
  const value = Number(normalised)
  if (!Number.isFinite(value) || value > 100_000_000) {
    return { error: 'Enter an amount below 100,000,000' }
  }
  return { value: roundMoney(value) }
}

export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

/**
 * Label for the money figure on a card. Credit cards show what is owed;
 * debit and prepaid cards show the funds currently on them.
 */
export function balanceCaption(kind: CardKind): string {
  return kind === 'credit' ? 'Balance owed' : 'Available balance'
}

/** Short caption for the figure printed on the card artwork. */
export function balanceCaptionShort(kind: CardKind): string {
  return kind === 'credit' ? 'Balance' : 'Available'
}

/**
 * Credit still available to spend, i.e. limit minus what is owed. Null when
 * the card has no usable limit or is not a credit card.
 */
export function availableCredit(card: FinancialCard): number | null {
  if (card.kind !== 'credit' || !card.creditLimit || card.creditLimit <= 0) {
    return null
  }
  return roundMoney(Math.max(0, card.creditLimit - (card.balance ?? 0)))
}

export function utilizationPercent(card: FinancialCard): number | null {
  if (card.kind !== 'credit' || !card.creditLimit || card.creditLimit <= 0) {
    return null
  }
  const balance = card.balance ?? 0
  return (balance / card.creditLimit) * 100
}

/** Next statement due date for a credit card, or null when no due day is set. */
export function nextDueDate(
  card: FinancialCard,
  now: Date = new Date(),
): Date | null {
  if (card.kind !== 'credit' || !card.dueDay) return null

  const build = (year: number, monthIndex: number): Date => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    return new Date(year, monthIndex, Math.min(card.dueDay ?? 1, lastDay))
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = build(now.getFullYear(), now.getMonth())
  if (thisMonth >= today) return thisMonth

  const nextMonthIndex = now.getMonth() + 1
  return build(
    now.getFullYear() + Math.floor(nextMonthIndex / 12),
    nextMonthIndex % 12,
  )
}

export function dueLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === 'string' && CARD_KINDS.includes(value as CardKind)
}

export function isCardNetwork(value: unknown): value is CardNetwork {
  return typeof value === 'string' && NETWORKS.includes(value as CardNetwork)
}

export function isCardColor(value: unknown): value is CardColor {
  return typeof value === 'string' && CARD_COLORS.includes(value as CardColor)
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && CURRENCIES.includes(value as Currency)
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `card_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
