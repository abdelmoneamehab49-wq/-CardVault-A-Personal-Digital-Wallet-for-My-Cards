import type { FinancialCard } from '../types'
import {
  formatMoney,
  isExpired,
  isExpiringSoon,
} from '../lib/cards'
import {
  AlertIcon,
  CreditCardIcon,
  WalletIcon,
} from './icons'

interface StatsBarProps {
  cards: FinancialCard[]
}

export function StatsBar({ cards }: StatsBarProps) {
  const creditCards = cards.filter((card) => card.kind === 'credit')
  const limitedCards = creditCards.filter(
    (card) => card.creditLimit !== undefined && card.creditLimit > 0,
  )
  const currencies = new Set(limitedCards.map((card) => card.currency))
  const singleCurrency = currencies.size === 1 ? [...currencies][0] : null
  const totalLimit = limitedCards.reduce(
    (sum, card) => sum + (card.creditLimit ?? 0),
    0,
  )
  const totalBalance = creditCards.reduce(
    (sum, card) => sum + (card.balance ?? 0),
    0,
  )
  const expiring = cards.filter((card) =>
    isExpiringSoon(card.expiryMonth, card.expiryYear, 60),
  ).length
  const expired = cards.filter((card) =>
    isExpired(card.expiryMonth, card.expiryYear),
  ).length

  const kindHint = [
    creditCards.length ? `${creditCards.length} credit` : '',
    cards.filter((card) => card.kind === 'debit').length
      ? `${cards.filter((card) => card.kind === 'debit').length} debit`
      : '',
    cards.filter((card) => card.kind === 'prepaid').length
      ? `${cards.filter((card) => card.kind === 'prepaid').length} prepaid`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="stats" aria-label="Wallet summary">
      <article className="stat">
        <span className="stat__icon">
          <WalletIcon />
        </span>
        <p className="stat__label">Cards in vault</p>
        <p className="stat__value">{cards.length}</p>
        <p className="stat__hint">{kindHint || 'Add a card to begin'}</p>
      </article>

      <article className="stat">
        <span className="stat__icon">
          <CreditCardIcon />
        </span>
        <p className="stat__label">Credit limit</p>
        <p className="stat__value">
          {limitedCards.length === 0
            ? '—'
            : singleCurrency
              ? formatMoney(totalLimit, singleCurrency)
              : 'Mixed'}
        </p>
        <p className="stat__hint">
          {limitedCards.length === 0
            ? 'No credit cards yet'
            : currencies.size > 1
              ? `Across ${currencies.size} currencies`
              : `Across ${limitedCards.length} ${
                  limitedCards.length === 1 ? 'card' : 'cards'
                }`}
        </p>
      </article>

      <article className="stat">
        <span className="stat__icon">
          <CreditCardIcon />
        </span>
        <p className="stat__label">Outstanding</p>
        <p className="stat__value">
          {creditCards.length === 0
            ? '—'
            : singleCurrency
              ? formatMoney(totalBalance, singleCurrency)
              : 'Mixed'}
        </p>
        <p className="stat__hint">
          {creditCards.length === 0
            ? 'Nothing owed'
            : totalLimit > 0 && singleCurrency
              ? `${Math.round((totalBalance / totalLimit) * 100)}% utilisation`
              : 'Credit balances'}
        </p>
      </article>

      <article className="stat">
        <span className={`stat__icon${expiring > 0 ? ' stat__icon--warning' : ''}`}>
          <AlertIcon />
        </span>
        <p className="stat__label">Expiring soon</p>
        <p className="stat__value">{expiring}</p>
        <p className="stat__hint">
          {expired > 0
            ? `${expired} already expired`
            : 'In the next 60 days'}
        </p>
      </article>
    </section>
  )
}
