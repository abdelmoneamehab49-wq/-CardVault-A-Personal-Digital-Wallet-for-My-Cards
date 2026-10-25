import type { FinancialCard } from '../types'
import {
  NETWORK_LABELS,
  NETWORK_MARKS,
  balanceCaptionShort,
  expiryLabel,
  formatMoney,
  maskedNumber,
} from '../lib/cards'
import { ContactlessIcon } from './icons'

interface CardVisualProps {
  card: FinancialCard
  preview?: boolean
}

export function CardVisual({ card, preview = false }: CardVisualProps) {
  const networkLabel = NETWORK_LABELS[card.network]

  return (
    <div
      className={`card-visual card-visual--${card.color}${
        card.balance !== undefined ? ' card-visual--balance' : ''
      }${preview ? ' card-visual--preview' : ''}`}
    >
      <span className="card-visual__glow" aria-hidden="true" />
      <span className="card-visual__rings" aria-hidden="true" />

      <div className="card-visual__top">
        <span className="card-visual__bank" title={card.bank || networkLabel}>
          {card.bank || networkLabel}
        </span>
        <span
          className={`card-mark card-mark--${card.network}`}
          aria-label={networkLabel}
        >
          {NETWORK_MARKS[card.network]}
        </span>
      </div>

      <div className="card-visual__middle" aria-hidden="true">
        <span className="card-chip">
          <span className="card-chip__line" />
          <span className="card-chip__line" />
        </span>
        <ContactlessIcon className="card-visual__contactless" />
      </div>

      <p className="card-visual__number">{maskedNumber(card.last4)}</p>

      {card.balance !== undefined ? (
        <p className="card-visual__balance">
          <span className="card-visual__caption">
            {balanceCaptionShort(card.kind)}
          </span>
          <span className="card-visual__balance-value">
            {formatMoney(card.balance, card.currency)}
          </span>
        </p>
      ) : null}

      <div className="card-visual__bottom">
        <div className="card-visual__field">
          <span className="card-visual__caption">Card holder</span>
          <span className="card-visual__value">
            {card.holder || 'Your name'}
          </span>
        </div>
        <div className="card-visual__field card-visual__field--expiry">
          <span className="card-visual__caption">Valid thru</span>
          <span className="card-visual__value">
            {expiryLabel(card.expiryMonth, card.expiryYear)}
          </span>
        </div>
      </div>
    </div>
  )
}
