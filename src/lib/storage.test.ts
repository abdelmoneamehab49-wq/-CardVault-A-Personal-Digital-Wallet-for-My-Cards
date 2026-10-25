import { describe, expect, it } from 'vitest'
import { parseCard } from './storage'

const stored = {
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
  notes: 'Travel card',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('parseCard', () => {
  it('accepts a well-formed stored card', () => {
    const parsed = parseCard(stored)
    expect(parsed).not.toBeNull()
    expect(parsed?.last4).toBe('4242')
    expect(parsed?.creditLimit).toBe(10000)
  })

  it('drops full card numbers and unknown properties', () => {
    const parsed = parseCard({
      ...stored,
      number: '4242424242424242',
      cvv: '123',
    })
    expect(parsed).not.toBeNull()
    expect(parsed && 'number' in parsed).toBe(false)
    expect(parsed && 'cvv' in parsed).toBe(false)
  })

  it('rejects malformed records instead of rendering them', () => {
    expect(parseCard(null)).toBeNull()
    expect(parseCard({ ...stored, last4: '42' })).toBeNull()
    expect(parseCard({ ...stored, expiryMonth: 13 })).toBeNull()
    expect(parseCard({ ...stored, currency: 'BTC' })).toBeNull()
    expect(parseCard({ ...stored, network: 'diners' })).toBeNull()
    expect(parseCard({ ...stored, nickname: '   ' })).toBeNull()
    expect(parseCard({ ...stored, creditLimit: 'lots' })).toBeNull()
    expect(parseCard({ ...stored, dueDay: 32 })).toBeNull()
    expect(parseCard({ ...stored, createdAt: 'not-a-date' })).toBeNull()
  })
})
