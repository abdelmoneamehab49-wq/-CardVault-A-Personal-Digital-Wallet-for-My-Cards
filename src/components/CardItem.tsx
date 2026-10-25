import { useState, type FormEvent } from 'react'
import type { FinancialCard } from '../types'
import {
  KIND_LABELS,
  NETWORK_LABELS,
  availableCredit,
  balanceCaption,
  daysUntilExpiry,
  dueLabel,
  expiryLabel,
  formatMoney,
  isExpired,
  isExpiringSoon,
  nextDueDate,
  parseMoneyInput,
  utilizationPercent,
} from '../lib/cards'
import { AlertIcon, CalendarIcon, PencilIcon, TrashIcon } from './icons'
import { CardVisual } from './CardVisual'

interface CardItemProps {
  card: FinancialCard
  onEdit: (card: FinancialCard) => void
  onDelete: (card: FinancialCard) => void
  onSetBalance: (id: string, balance: number | undefined) => void
}

export function CardItem({
  card,
  onEdit,
  onDelete,
  onSetBalance,
}: CardItemProps) {
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceDraft, setBalanceDraft] = useState('')
  const [balanceError, setBalanceError] = useState('')

  const expired = isExpired(card.expiryMonth, card.expiryYear)
  const expiringSoon = isExpiringSoon(card.expiryMonth, card.expiryYear, 60)
  const daysLeft = daysUntilExpiry(card.expiryMonth, card.expiryYear)
  const utilization = utilizationPercent(card)
  const due = nextDueDate(card)
  const balance = card.balance ?? 0
  const hasBalance = card.balance !== undefined
  const available = availableCredit(card)
  const utilClass =
    utilization === null
      ? ''
      : utilization >= 75
        ? ' is-high'
        : utilization >= 30
          ? ' is-medium'
          : ' is-low'

  function startBalanceEdit() {
    setBalanceDraft(card.balance !== undefined ? String(card.balance) : '')
    setBalanceError('')
    setEditingBalance(true)
  }

  function cancelBalanceEdit() {
    setEditingBalance(false)
    setBalanceError('')
  }

  function saveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseMoneyInput(balanceDraft)
    if (parsed.error) {
      setBalanceError(parsed.error)
      return
    }
    onSetBalance(card.id, parsed.value)
    setEditingBalance(false)
    setBalanceError('')
  }

  const balanceId = `balance-${card.id}`

  return (
    <li className="card-item">
      <div className="card-item__visual">
        <CardVisual card={card} />
        {expired ? (
          <span className="status-badge status-badge--danger">Expired</span>
        ) : expiringSoon ? (
          <span className="status-badge status-badge--warning">
            Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </span>
        ) : null}
      </div>

      <div className="card-item__body">
        <div className="card-item__heading">
          <div className="card-item__titles">
            <h3>{card.nickname}</h3>
            <p>
              {card.bank || NETWORK_LABELS[card.network]} · •••• {card.last4}
            </p>
          </div>
          <span className={`kind-tag kind-tag--${card.kind}`}>
            {KIND_LABELS[card.kind]}
          </span>
        </div>

        <div className="card-item__balance">
          <div className="card-item__balance-head">
            {editingBalance ? (
              <label className="card-item__balance-label" htmlFor={balanceId}>
                {balanceCaption(card.kind)}
              </label>
            ) : (
              <p className="card-item__balance-label">
                {balanceCaption(card.kind)}
              </p>
            )}
            {!editingBalance ? (
              <button
                type="button"
                className="card-item__balance-edit"
                onClick={startBalanceEdit}
                aria-label={`Update balance for ${card.nickname}`}
                title="Update balance"
              >
                <PencilIcon />
              </button>
            ) : null}
          </div>

          {editingBalance ? (
            <form className="balance-editor" onSubmit={saveBalance} noValidate>
              <div className="balance-editor__row">
                <input
                  id={balanceId}
                  name="balance"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0.00"
                  value={balanceDraft}
                  onChange={(event) => {
                    setBalanceDraft(event.target.value)
                    setBalanceError('')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') cancelBalanceEdit()
                  }}
                  aria-invalid={Boolean(balanceError)}
                  aria-describedby={
                    balanceError
                      ? `${balanceId}-error`
                      : `${balanceId}-hint`
                  }
                />
                <button type="submit" className="btn btn--primary btn--small">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={cancelBalanceEdit}
                >
                  Cancel
                </button>
              </div>
              {balanceError ? (
                <p
                  className="field__error"
                  id={`${balanceId}-error`}
                  role="alert"
                >
                  {balanceError}
                </p>
              ) : (
                <p className="card-item__balance-meta" id={`${balanceId}-hint`}>
                  In {card.currency} · leave empty to clear
                </p>
              )}
            </form>
          ) : hasBalance ? (
            <>
              <p className="card-item__balance-value">
                {formatMoney(balance, card.currency)}
              </p>
              {available !== null ? (
                <p className="card-item__balance-meta">
                  {formatMoney(available, card.currency)} still available
                </p>
              ) : null}

              {card.kind === 'credit' &&
              card.creditLimit &&
              utilization !== null ? (
                <div className="utilization">
                  <div
                    className="utilization__track"
                    role="img"
                    aria-label={`${Math.round(
                      utilization,
                    )}% of credit limit used`}
                  >
                    <span
                      className={`utilization__fill${utilClass}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <p className="utilization__caption">
                    {Math.round(utilization)}% of limit used
                    {utilization > 100 ? ' · over limit' : ''}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="card-item__balance-meta">No balance recorded yet.</p>
          )}
        </div>

        <ul className="card-item__facts">
          <li>
            <CalendarIcon />
            Expires {expiryLabel(card.expiryMonth, card.expiryYear)}
          </li>
          {due ? (
            <li>
              <AlertIcon />
              Payment due {dueLabel(due)}
            </li>
          ) : null}
        </ul>

        {card.notes ? <p className="card-item__notes">{card.notes}</p> : null}

        <div className="card-item__actions">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onEdit(card)}
            aria-label={`Edit ${card.nickname}`}
          >
            <PencilIcon />
            Edit
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small btn--danger"
            onClick={() => onDelete(card)}
            aria-label={`Delete ${card.nickname}`}
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}
