import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import type {
  CardColor,
  CardDraft,
  CardKind,
  Currency,
  FinancialCard,
} from '../types'
import { CARD_COLORS, CARD_KINDS, CURRENCIES } from '../types'
import {
  COLOR_LABELS,
  KIND_LABELS,
  detectNetwork,
  digitsOnly,
  formatCardNumber,
  isExpired,
  last4Of,
  parseMoneyInput,
  passesLuhn,
} from '../lib/cards'
import { CardVisual } from './CardVisual'
import { LockIcon, XIcon } from './icons'

interface FormState {
  nickname: string
  bank: string
  holder: string
  kind: CardKind
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  currency: Currency
  creditLimit: string
  balance: string
  dueDay: string
  color: CardColor
  notes: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

interface CardFormProps {
  card?: FinancialCard
  onSubmit: (draft: CardDraft) => void
  onClose: () => void
}

function initialState(card?: FinancialCard): FormState {
  const now = new Date()
  return {
    nickname: card?.nickname ?? '',
    bank: card?.bank ?? '',
    holder: card?.holder ?? '',
    kind: card?.kind ?? 'credit',
    cardNumber: '',
    expiryMonth: String(card?.expiryMonth ?? now.getMonth() + 1),
    expiryYear: String(card?.expiryYear ?? now.getFullYear() + 3),
    currency: card?.currency ?? 'USD',
    creditLimit:
      card?.creditLimit !== undefined ? String(card.creditLimit) : '',
    balance: card?.balance !== undefined ? String(card.balance) : '',
    dueDay: card?.dueDay !== undefined ? String(card.dueDay) : '',
    color: card?.color ?? 'midnight',
    notes: card?.notes ?? '',
  }
}

const FIELD_ORDER: (keyof FormState)[] = [
  'cardNumber',
  'nickname',
  'bank',
  'holder',
  'expiryMonth',
  'expiryYear',
  'currency',
  'creditLimit',
  'balance',
  'dueDay',
  'notes',
]

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function CardForm({ card, onSubmit, onClose }: CardFormProps) {
  const [values, setValues] = useState<FormState>(() => initialState(card))
  const [errors, setErrors] = useState<FormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const currentYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: 21 }, (_, index) => currentYear - 5 + index),
    [currentYear],
  )

  useEffect(() => {
    const firstField = formRef.current?.querySelector<HTMLElement>(
      'input, select, textarea',
    )
    firstField?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const digits = digitsOnly(values.cardNumber)
    const nickname = values.nickname.trim()
    const bank = values.bank.trim()
    const holder = values.holder.trim()
    const month = Number(values.expiryMonth)
    const year = Number(values.expiryYear)

    if (digits) {
      if (digits.length < 12 || digits.length > 19) {
        nextErrors.cardNumber = 'Card numbers contain 12 to 19 digits.'
      } else if (!passesLuhn(digits)) {
        nextErrors.cardNumber =
          'That number does not pass the card checksum — check for a typo.'
      }
    } else if (!card) {
      nextErrors.cardNumber = 'Enter the card number.'
    }

    if (!nickname) {
      nextErrors.nickname = 'Give this card a name, for example “Everyday spending”.'
    } else if (nickname.length > 40) {
      nextErrors.nickname = 'Keep the name under 40 characters.'
    }
    if (bank.length > 40) {
      nextErrors.bank = 'Keep the bank name under 40 characters.'
    }
    if (holder.length > 60) {
      nextErrors.holder = 'Keep the cardholder name under 60 characters.'
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      nextErrors.expiryMonth = 'Choose a valid month.'
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      nextErrors.expiryYear = 'Choose a valid year.'
    } else if (!nextErrors.expiryMonth && isExpired(month, year)) {
      nextErrors.expiryYear = 'That expiry date has passed.'
    }

    let limit: number | undefined
    let balance: number | undefined
    let dueDay: number | undefined

    // Every card can record a balance: money owed on credit, funds held on
    // debit and prepaid cards.
    const parsedBalance = parseMoneyInput(values.balance)
    if (parsedBalance.error) nextErrors.balance = parsedBalance.error
    balance = parsedBalance.value

    if (values.kind === 'credit') {
      const parsedLimit = parseMoneyInput(values.creditLimit)
      if (parsedLimit.error) nextErrors.creditLimit = parsedLimit.error
      limit = parsedLimit.value

      const dueRaw = values.dueDay.trim()
      if (dueRaw) {
        const parsedDue = Number(dueRaw)
        if (!Number.isInteger(parsedDue) || parsedDue < 1 || parsedDue > 31) {
          nextErrors.dueDay = 'Use a day between 1 and 31.'
        } else {
          dueDay = parsedDue
        }
      }
    }

    if (values.notes.length > 200) {
      nextErrors.notes = 'Keep notes under 200 characters.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key])
      if (firstInvalid) {
        requestAnimationFrame(() => {
          document.getElementById(firstInvalid)?.focus()
        })
      }
      return
    }

    const draft: CardDraft = {
      nickname,
      bank,
      holder,
      network: digits ? detectNetwork(digits) : (card?.network ?? 'other'),
      kind: values.kind,
      last4: digits ? last4Of(digits) : (card?.last4 ?? ''),
      expiryMonth: month,
      expiryYear: year,
      currency: values.currency,
      creditLimit: values.kind === 'credit' ? limit : undefined,
      balance,
      dueDay: values.kind === 'credit' ? dueDay : undefined,
      color: values.color,
      notes: values.notes.trim(),
    }
    onSubmit(draft)
  }

  const previewDigits = digitsOnly(values.cardNumber)
  const previewCard: FinancialCard = {
    id: 'preview',
    nickname: values.nickname || 'New card',
    bank: values.bank,
    holder: values.holder,
    network: previewDigits
      ? detectNetwork(previewDigits)
      : (card?.network ?? 'other'),
    kind: values.kind,
    last4: previewDigits ? last4Of(previewDigits) : (card?.last4 ?? '0000'),
    expiryMonth: Number(values.expiryMonth) || 1,
    expiryYear: Number(values.expiryYear) || currentYear,
    currency: values.currency,
    creditLimit: undefined,
    balance: parseMoneyInput(values.balance).value,
    
    dueDay: undefined,
    color: values.color,
    notes: '',
    createdAt: '',
    updatedAt: '',
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="dialog dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-form-title"
      >
        <button
          type="button"
          className="icon-button dialog__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <XIcon />
        </button>

        <div className="dialog__layout">
          <aside className="dialog__preview">
            <p className="dialog__preview-label">Live preview</p>
            <CardVisual card={previewCard} preview />
            <p className="privacy-note">
              <LockIcon />
              <span>
                Only the last four digits are kept on this device. Full card
                numbers, CVVs and PINs are never stored.
              </span>
            </p>
          </aside>

          <form
            ref={formRef}
            className="card-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <header className="card-form__header">
              <p className="eyebrow">{card ? 'Update details' : 'New card'}</p>
              <h2 id="card-form-title">
                {card ? 'Edit card' : 'Add a card'}
              </h2>
              <p>
                Track limits, expiry dates and notes without keeping sensitive
                card data.
              </p>
            </header>

            {hasErrors ? (
              <p className="form-alert" role="alert">
                Please review the highlighted fields.
              </p>
            ) : null}

            <div className="form-grid">
              <div className="form-grid__full">
                <Field
                  id="cardNumber"
                  label="Card number"
                  error={errors.cardNumber}
                  hint={
                    card
                      ? `Ending ${card.last4} is saved. Leave blank to keep it, or enter a new number to replace it.`
                      : 'Used once to detect the network and keep the last four digits.'
                  }
                >
                  <div className="input-with-icon">
                    <input
                      id="cardNumber"
                      name="cardNumber"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder={
                        card
                          ? `•••• •••• •••• ${card.last4}`
                          : '4242 4242 4242 4242'
                      }
                      value={formatCardNumber(values.cardNumber)}
                      onChange={(event) =>
                        setField(
                          'cardNumber',
                          digitsOnly(event.target.value).slice(0, 19),
                        )
                      }
                      aria-invalid={Boolean(errors.cardNumber)}
                      aria-describedby={
                        errors.cardNumber ? 'cardNumber-error' : undefined
                      }
                    />
                    {previewDigits ? (
                      <span className="input-with-icon__badge">
                        {detectNetwork(previewDigits) === 'other'
                          ? 'Card'
                          : detectNetwork(previewDigits).toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                </Field>
              </div>

              <Field
                id="nickname"
                label="Card name"
                error={errors.nickname}
                hint="How you recognise it in your wallet."
              >
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  maxLength={40}
                  placeholder="Everyday spending"
                  value={values.nickname}
                  onChange={(event) => setField('nickname', event.target.value)}
                  aria-invalid={Boolean(errors.nickname)}
                  aria-describedby={
                    errors.nickname ? 'nickname-error' : 'nickname-hint'
                  }
                />
              </Field>

              <Field
                id="bank"
                label="Bank or issuer"
                error={errors.bank}
                hint="Optional."
              >
                <input
                  id="bank"
                  name="bank"
                  type="text"
                  maxLength={40}
                  placeholder="Chase, HSBC, Emirates NBD…"
                  value={values.bank}
                  onChange={(event) => setField('bank', event.target.value)}
                  aria-invalid={Boolean(errors.bank)}
                />
              </Field>

              <div className="form-grid__full">
                <Field
                  id="holder"
                  label="Cardholder name"
                  error={errors.holder}
                  hint="Printed on the card. Optional."
                >
                  <input
                    id="holder"
                    name="holder"
                    type="text"
                    maxLength={60}
                    autoComplete="cc-name"
                    placeholder="ALEX MORGAN"
                    value={values.holder}
                    onChange={(event) => setField('holder', event.target.value)}
                    aria-invalid={Boolean(errors.holder)}
                  />
                </Field>
              </div>

              <fieldset className="segmented-field form-grid__full">
                <legend>Card type</legend>
                <div className="segmented">
                  {CARD_KINDS.map((kind) => (
                    <label
                      key={kind}
                      className={`segmented__option${
                        values.kind === kind ? ' is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={kind}
                        checked={values.kind === kind}
                        onChange={() => setField('kind', kind)}
                      />
                      <span>{KIND_LABELS[kind]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <span className="field__label" id="expiry-label">
                  Expiry date
                </span>
                <div
                  className="expiry-inputs"
                  role="group"
                  aria-labelledby="expiry-label"
                >
                  <select
                    id="expiryMonth"
                    name="expiryMonth"
                    aria-label="Expiry month"
                    value={values.expiryMonth}
                    onChange={(event) =>
                      setField('expiryMonth', event.target.value)
                    }
                    aria-invalid={Boolean(errors.expiryMonth)}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {String(month).padStart(2, '0')}
                        </option>
                      ),
                    )}
                  </select>
                  <select
                    id="expiryYear"
                    name="expiryYear"
                    aria-label="Expiry year"
                    value={values.expiryYear}
                    onChange={(event) =>
                      setField('expiryYear', event.target.value)
                    }
                    aria-invalid={Boolean(errors.expiryYear)}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.expiryMonth || errors.expiryYear ? (
                  <p className="field__error" role="alert">
                    {errors.expiryMonth ?? errors.expiryYear}
                  </p>
                ) : (
                  <p className="field__hint">MM / YYYY on the front.</p>
                )}
              </div>

              <Field id="currency" label="Currency">
                <select
                  id="currency"
                  name="currency"
                  value={values.currency}
                  onChange={(event) =>
                    setField('currency', event.target.value as Currency)
                  }
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="balance"
                label={
                  values.kind === 'credit'
                    ? 'Current balance'
                    : 'Available balance'
                }
                error={errors.balance}
                hint={
                  values.kind === 'credit'
                    ? 'What you owe right now. Optional.'
                    : 'What is on the card right now. Optional.'
                }
              >
                <input
                  id="balance"
                  name="balance"
                  type="text"
                  inputMode="decimal"
                  placeholder={values.kind === 'credit' ? '1250' : '850'}
                  value={values.balance}
                  onChange={(event) => setField('balance', event.target.value)}
                  aria-invalid={Boolean(errors.balance)}
                />
              </Field>

              {values.kind === 'credit' ? (
                <>
                  <Field
                    id="creditLimit"
                    label="Credit limit"
                    error={errors.creditLimit}
                    hint="Optional, used for utilisation."
                  >
                    <input
                      id="creditLimit"
                      name="creditLimit"
                      type="text"
                      inputMode="decimal"
                      placeholder="10000"
                      value={values.creditLimit}
                      onChange={(event) =>
                        setField('creditLimit', event.target.value)
                      }
                      aria-invalid={Boolean(errors.creditLimit)}
                    />
                  </Field>

                  <Field
                    id="dueDay"
                    label="Statement due day"
                    error={errors.dueDay}
                    hint="Day of the month, 1–31. Optional."
                  >
                    <input
                      id="dueDay"
                      name="dueDay"
                      type="number"
                      min={1}
                      max={31}
                      placeholder="15"
                      value={values.dueDay}
                      onChange={(event) =>
                        setField('dueDay', event.target.value)
                      }
                      aria-invalid={Boolean(errors.dueDay)}
                    />
                  </Field>
                </>
              ) : null}

              <fieldset className="color-field form-grid__full">
                <legend>Card style</legend>
                <div className="swatches">
                  {CARD_COLORS.map((color) => (
                    <label
                      key={color}
                      className={`swatch swatch--${color}${
                        values.color === color ? ' is-selected' : ''
                      }`}
                      title={COLOR_LABELS[color]}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        checked={values.color === color}
                        onChange={() => setField('color', color)}
                        className="sr-only"
                      />
                      <span className="swatch__dot" aria-hidden="true" />
                      <span className="sr-only">{COLOR_LABELS[color]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field form-grid__full">
                <label htmlFor="notes">
                  Notes <span className="field__optional">optional</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={200}
                  placeholder="Travel card, no foreign transaction fees…"
                  value={values.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  aria-invalid={Boolean(errors.notes)}
                />
                <p className="field__hint field__hint--count">
                  {values.notes.length}/200
                </p>
                {errors.notes ? (
                  <p className="field__error" role="alert">
                    {errors.notes}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="card-form__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                {card ? 'Save changes' : 'Add card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
