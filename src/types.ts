export const NETWORKS = [
  'visa',
  'mastercard',
  'amex',
  'discover',
  'jcb',
  'unionpay',
  'other',
] as const
export type CardNetwork = (typeof NETWORKS)[number]

export const CARD_KINDS = ['credit', 'debit', 'prepaid'] as const
export type CardKind = (typeof CARD_KINDS)[number]

export const CARD_COLORS = [
  'midnight',
  'ocean',
  'violet',
  'emerald',
  'sunset',
  'rose',
  'graphite',
] as const
export type CardColor = (typeof CARD_COLORS)[number]

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'AED',
  'CAD',
  'AUD',
  'SGD',
  'JPY',
  'CHF',
  'SAR',
  'NGN',
] as const
export type Currency = (typeof CURRENCIES)[number]

export interface FinancialCard {
  id: string
  /** User-facing label, e.g. "Everyday spending". */
  nickname: string
  bank: string
  holder: string
  network: CardNetwork
  kind: CardKind
  /** Only the final four digits are ever stored. */
  last4: string
  expiryMonth: number
  expiryYear: number
  currency: Currency
  creditLimit?: number
  /** Amount currently owed on a credit card. */
  balance?: number
  /** Statement due day of month (1–31) for credit cards. */
  dueDay?: number
  color: CardColor
  notes: string
  createdAt: string
  updatedAt: string
}

export type CardDraft = Omit<FinancialCard, 'id' | 'createdAt' | 'updatedAt'>

export interface CardFormValues extends Omit<CardDraft, 'network' | 'last4'> {
  /** Full number is used only in memory to validate and derive the last four digits. */
  cardNumber: string
}
