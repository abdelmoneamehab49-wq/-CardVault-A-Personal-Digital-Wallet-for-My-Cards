import { describe, expect, it } from 'vitest'
import type { FinancialCard } from '../types'
import {
  availableCredit,
  balanceCaption,
  daysUntilExpiry,
  detectNetwork,
  formatCardNumber,
  formatMoney,
  isExpired,
  isExpiringSoon,
  last4Of,
  nextDueDate,
  parseMoneyInput,
  passesLuhn,
  utilizationPercent,
} from './cards'

function makeCard(overrides: Partial<FinancialCard> = {}): FinancialCard {
  return {
    id: 'card-1',
    nickname: 'Everyday',
    bank: 'Test Bank',
    holder: 'ALEX MORGAN',
    network: 'visa',
    kind: 'credit',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2030,
    currency: 'USD',
    creditLimit: 10000,
    balance: 2500,
    dueDay: 15,
    color: 'midnight',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('detectNetwork', () => {
  it('recognises the major networks', () => {
    expect(detectNetwork('4242 4242 4242 4242')).toBe('visa')
    expect(detectNetwork('5555 5555 5555 4444')).toBe('mastercard')
    expect(detectNetwork('2221 0000 0000 0009')).toBe('mastercard')
    expect(detectNetwork('3782 822463 10005')).toBe('amex')
    expect(detectNetwork('6011 1111 1111 1117')).toBe('discover')
    expect(detectNetwork('3530 1113 3330 0000')).toBe('jcb')
    expect(detectNetwork('6250 9412 3456 7890')).toBe('unionpay')
  })

  it('falls back to "other" for unknown or empty input', () => {
    expect(detectNetwork('9999 0000 0000 0000')).toBe('other')
    expect(detectNetwork('')).toBe('other')
  })
})

describe('passesLuhn', () => {
  it('accepts valid test numbers', () => {
    expect(passesLuhn('4242424242424242')).toBe(true)
    expect(passesLuhn('378282246310005')).toBe(true)
    expect(passesLuhn('5555555555554444')).toBe(true)
  })

  it('rejects typos, short numbers and letters', () => {
    expect(passesLuhn('4242424242424241')).toBe(false)
    expect(passesLuhn('1234')).toBe(false)
    expect(passesLuhn('not-a-card-number')).toBe(false)
  })
})

describe('formatting', () => {
  it('groups digits for standard cards and Amex', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005')
    expect(formatCardNumber('4242-4242')).toBe('4242 4242')
  })

  it('keeps only the final four digits', () => {
    expect(last4Of('4242 4242 4242 9876')).toBe('9876')
  })

  it('parses money fields, treating blank input as unset', () => {
    expect(parseMoneyInput('')).toEqual({})
    expect(parseMoneyInput('1,250.50')).toEqual({ value: 1250.5 })
    expect(parseMoneyInput('0')).toEqual({ value: 0 })
    expect(parseMoneyInput('12.345').error).toBeTruthy()
    expect(parseMoneyInput('-5').error).toBeTruthy()
    expect(parseMoneyInput('abc').error).toBeTruthy()
  })

  it('formats money in the card currency', () => {
    expect(formatMoney(2500, 'USD')).toContain('2,500')
    expect(formatMoney(10.5, 'USD')).toContain('10.5')
  })
})

describe('expiry', () => {
  const now = new Date(2026, 5, 15)

  it('treats a card as valid through the end of its expiry month', () => {
    expect(isExpired(6, 2026, now)).toBe(false)
    expect(isExpired(5, 2026, now)).toBe(true)
  })

  it('reports imminent expiries without flagging expired cards', () => {
    expect(isExpiringSoon(7, 2026, 60, now)).toBe(true)
    expect(isExpiringSoon(12, 2027, 60, now)).toBe(false)
    expect(isExpiringSoon(4, 2026, 60, now)).toBe(false)
    expect(daysUntilExpiry(7, 2026, now)).toBeGreaterThan(0)
  })
})

describe('credit helpers', () => {
  it('calculates utilisation for credit cards only', () => {
    expect(utilizationPercent(makeCard())).toBe(25)
    expect(utilizationPercent(makeCard({ balance: 12000 }))).toBe(120)
    expect(
      utilizationPercent(makeCard({ kind: 'debit', creditLimit: 1000 })),
    ).toBeNull()
    expect(utilizationPercent(makeCard({ creditLimit: 0 }))).toBeNull()
  })

  it('labels balances for credit and cash cards', () => {
    expect(balanceCaption('credit')).toBe('Balance owed')
    expect(balanceCaption('debit')).toBe('Available balance')
    expect(balanceCaption('prepaid')).toBe('Available balance')
  })

  it('reports credit still available and never goes negative', () => {
    expect(availableCredit(makeCard())).toBe(7500)
    expect(availableCredit(makeCard({ balance: 12000 }))).toBe(0)
    expect(availableCredit(makeCard({ balance: undefined }))).toBe(10000)
    expect(availableCredit(makeCard({ kind: 'debit' }))).toBeNull()
    expect(availableCredit(makeCard({ creditLimit: undefined }))).toBeNull()
  })

  it('finds the next due date, clamping to the end of short months', () => {
    const due = nextDueDate(makeCard({ dueDay: 31 }), new Date(2026, 1, 10))
    expect(due?.getMonth()).toBe(1)
    expect(due?.getDate()).toBe(28)

    const rolled = nextDueDate(makeCard({ dueDay: 15 }), new Date(2026, 5, 20))
    expect(rolled?.getMonth()).toBe(6)
    expect(rolled?.getDate()).toBe(15)

    expect(nextDueDate(makeCard({ kind: 'debit' }))).toBeNull()
  })
})
