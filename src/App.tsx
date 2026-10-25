import { useCallback, useMemo, useState } from 'react'
import type { CardDraft, CardKind, CardNetwork, FinancialCard } from './types'
import { KIND_LABELS, NETWORK_LABELS, utilizationPercent } from './lib/cards'
import { useCards } from './hooks/useCards'
import { CardForm } from './components/CardForm'
import { CardItem } from './components/CardItem'
import { ConfirmDialog } from './components/ConfirmDialog'
import { StatsBar } from './components/StatsBar'
import {
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  SlidersIcon,
  SparkIcon,
  WalletIcon,
} from './components/icons'

type SortKey = 'recent' | 'name' | 'expiry' | 'utilization'

type DialogState =
  | { mode: 'add' }
  | { mode: 'edit'; card: FinancialCard }
  | { mode: 'delete'; card: FinancialCard }
  | null

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'expiry', label: 'Expiring soonest' },
  { value: 'utilization', label: 'Highest utilisation' },
]

export default function App() {
  const { cards, storageAvailable, addCard, updateCard, setBalance, removeCard } =
    useCards()
  const [query, setQuery] = useState('')
  const [networkFilter, setNetworkFilter] = useState<'all' | CardNetwork>('all')
  const [kindFilter, setKindFilter] = useState<'all' | CardKind>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [dialog, setDialog] = useState<DialogState>(null)

  const closeDialog = useCallback(() => setDialog(null), [])

  const counts = useMemo(
    () => ({
      credit: cards.filter((card) => card.kind === 'credit').length,
      debit: cards.filter((card) => card.kind === 'debit').length,
      prepaid: cards.filter((card) => card.kind === 'prepaid').length,
    }),
    [cards],
  )

  const visibleCards = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = cards.filter((card) => {
      if (networkFilter !== 'all' && card.network !== networkFilter) return false
      if (kindFilter !== 'all' && card.kind !== kindFilter) return false
      if (!needle) return true
      const haystack = [
        card.nickname,
        card.bank,
        card.holder,
        card.last4,
        NETWORK_LABELS[card.network],
        KIND_LABELS[card.kind],
        card.notes,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.nickname.localeCompare(b.nickname)
        case 'expiry':
          return (
            a.expiryYear * 12 +
            a.expiryMonth -
            (b.expiryYear * 12 + b.expiryMonth)
          )
        case 'utilization':
          return (utilizationPercent(b) ?? -1) - (utilizationPercent(a) ?? -1)
        case 'recent':
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })
  }, [cards, query, networkFilter, kindFilter, sort])

  const filtersActive =
    query.trim() !== '' || networkFilter !== 'all' || kindFilter !== 'all'

  function resetFilters() {
    setQuery('')
    setNetworkFilter('all')
    setKindFilter('all')
    setSort('recent')
  }

  function handleCreate(draft: CardDraft) {
    addCard(draft)
    setDialog(null)
  }

  function handleUpdate(draft: CardDraft) {
    if (dialog?.mode === 'edit') updateCard(dialog.card.id, draft)
    setDialog(null)
  }

  function handleDelete() {
    if (dialog?.mode === 'delete') removeCard(dialog.card.id)
    setDialog(null)
  }

  const summary = [
    counts.credit ? `${counts.credit} credit` : '',
    counts.debit ? `${counts.debit} debit` : '',
    counts.prepaid ? `${counts.prepaid} prepaid` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="app-shell">
      <div className="ambient" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#main">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            Card<span>Vault</span>
          </span>
        </a>
        <div className="site-header__actions">
          <span className="privacy-pill">
            <ShieldIcon />
            Stored on this device
          </span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setDialog({ mode: 'add' })}
          >
            <PlusIcon />
            Add card
          </button>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <p className="eyebrow">
            <SparkIcon />
            Personal card wallet
          </p>
          <h1>
            Every card.
            <br />
            <span className="gradient-text">One calm view.</span>
          </h1>
          <p className="hero__copy">
            Keep your Visa, Mastercard, Amex and every other card organised in
            one private dashboard. Track expiry dates, credit limits and
            utilisation — without handing over your card details.
          </p>
          <ul className="trust-row">
            <li>
              <LockIcon /> Full numbers never stored
            </li>
            <li>
              <ShieldIcon /> Private by design
            </li>
            <li>
              <WalletIcon /> Saves in this browser
            </li>
          </ul>
        </section>

        {!storageAvailable ? (
          <div className="banner banner--warning" role="alert">
            <strong>Could not save to this browser.</strong> Your changes will
            disappear when the page reloads. Check that storage is enabled and
            you are not in a private window.
          </div>
        ) : null}

        {cards.length > 0 ? <StatsBar cards={cards} /> : null}

        <section className="wallet" aria-labelledby="wallet-title">
          <div className="wallet__header">
            <div>
              <h2 id="wallet-title">Your cards</h2>
              <p>
                {cards.length === 0
                  ? 'Nothing here yet — your wallet is ready when you are.'
                  : summary}
              </p>
            </div>
            {cards.length > 0 ? (
              <span className="wallet__count">
                {visibleCards.length} of {cards.length}
              </span>
            ) : null}
          </div>

          {cards.length > 0 ? (
            <div className="toolbar">
              <div className="search">
                <SearchIcon />
                <label htmlFor="card-search" className="sr-only">
                  Search cards
                </label>
                <input
                  id="card-search"
                  type="search"
                  placeholder="Search name, bank or last four digits"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="toolbar__filters">
                <span className="select-wrap">
                  <SlidersIcon />
                  <select
                    aria-label="Filter by card network"
                    value={networkFilter}
                    onChange={(event) =>
                      setNetworkFilter(
                        event.target.value as 'all' | CardNetwork,
                      )
                    }
                  >
                    <option value="all">All networks</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="jcb">JCB</option>
                    <option value="unionpay">UnionPay</option>
                    <option value="other">Other</option>
                  </select>
                </span>
                <select
                  className="select-plain"
                  aria-label="Filter by card type"
                  value={kindFilter}
                  onChange={(event) =>
                    setKindFilter(event.target.value as 'all' | CardKind)
                  }
                >
                  <option value="all">All types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="prepaid">Prepaid</option>
                </select>
                <select
                  className="select-plain"
                  aria-label="Sort cards"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {filtersActive || sort !== 'recent' ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {cards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-stack" aria-hidden="true">
                <span className="empty-stack__card empty-stack__card--back" />
                <span className="empty-stack__card empty-stack__card--middle" />
                <span className="empty-stack__card empty-stack__card--front">
                  <span className="empty-stack__chip" />
                  <span className="empty-stack__number">•••• 4242</span>
                </span>
              </div>
              <h2>No cards in your vault yet</h2>
              <p>
                Add a credit, debit or prepaid card to keep its expiry date,
                limits and notes in one tidy place.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setDialog({ mode: 'add' })}
              >
                <PlusIcon />
                Add your first card
              </button>
              <p className="empty-state__note">
                <LockIcon />
                Only the last four digits are saved — never the full number.
              </p>
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="no-results">
              <SearchIcon />
              <h2>No cards match these filters</h2>
              <p>Try a different search, network or card type.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="card-grid">
              {visibleCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onEdit={(selected) =>
                    setDialog({ mode: 'edit', card: selected })
                  }
                  onDelete={(selected) =>
                    setDialog({ mode: 'delete', card: selected })
                  }
                  onSetBalance={setBalance}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <span className="brand__text">
            Card<span>Vault</span>
          </span>
          <p>
            A personal card organiser. Not affiliated with Visa, Mastercard or
            any bank.
          </p>
        </div>
        <p className="site-footer__privacy">
          <LockIcon />
          Everything is saved in this browser&apos;s local storage. Clearing
          site data removes your wallet.
        </p>
      </footer>

      {dialog?.mode === 'add' ? (
        <CardForm onSubmit={handleCreate} onClose={closeDialog} />
      ) : null}

      {dialog?.mode === 'edit' ? (
        <CardForm
          card={dialog.card}
          onSubmit={handleUpdate}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.mode === 'delete' ? (
        <ConfirmDialog
          title="Remove this card?"
          message={`“${dialog.card.nickname}” ending ${dialog.card.last4} will be removed from this browser. This cannot be undone.`}
          confirmLabel="Remove card"
          onConfirm={handleDelete}
          onCancel={closeDialog}
        />
      ) : null}
    </div>
  )
}
