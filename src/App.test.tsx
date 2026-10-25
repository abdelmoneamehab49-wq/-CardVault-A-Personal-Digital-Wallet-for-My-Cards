// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

const STORAGE_KEY = 'cardvault.cards.v1'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

async function fillNewCard(
  user: ReturnType<typeof userEvent.setup>,
  {
    number = '4242424242424242',
    name = 'Everyday spending',
    holder = 'Alex Morgan',
  } = {},
) {
  await user.click(
    screen.getByRole('button', { name: /add your first card/i }),
  )
  const dialog = screen.getByRole('dialog', { name: /add a card/i })
  await user.type(
    within(dialog).getByLabelText(/^card number$/i),
    number,
  )
  await user.type(within(dialog).getByLabelText(/^card name$/i), name)
  await user.type(
    within(dialog).getByLabelText(/^cardholder name$/i),
    holder,
  )
  await user.type(
    within(dialog).getByLabelText(/^credit limit$/i),
    '10000',
  )
  await user.type(
    within(dialog).getByLabelText(/^current balance$/i),
    '2500',
  )
  return dialog
}

describe('CardVault', () => {
  it('adds a card and never persists the full number', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    expect(
      screen.getByText(/no cards in your vault yet/i),
    ).toBeInTheDocument()

    const dialog = await fillNewCard(user)
    await user.click(within(dialog).getByRole('button', { name: /^add card$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Everyday spending' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/4242/).length).toBeGreaterThan(0)
    expect(screen.getByText(/25% of limit used/i)).toBeInTheDocument()
    expect(screen.getByText(/balance owed/i)).toBeInTheDocument()
    expect(screen.getAllByText(/2,500/).length).toBeGreaterThanOrEqual(2)

    const stored = window.localStorage.getItem(STORAGE_KEY) ?? ''
    expect(stored).toContain('"last4":"4242"')
    expect(stored).not.toContain('4242424242424242')
    expect(stored).not.toContain('cvv')

    unmount()
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'Everyday spending' }),
    ).toBeInTheDocument()
  })

  it('shows an available balance for debit cards', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /add your first card/i }),
    )
    const dialog = screen.getByRole('dialog', { name: /add a card/i })
    await user.type(
      within(dialog).getByLabelText(/^card number$/i),
      '5555555555554444',
    )
    await user.type(within(dialog).getByLabelText(/^card name$/i), 'Travel debit')
    await user.type(
      within(dialog).getByLabelText(/^cardholder name$/i),
      'Alex Morgan',
    )
    await user.click(within(dialog).getByRole('radio', { name: /^debit$/i }))
    await user.type(
      within(dialog).getByLabelText(/^available balance$/i),
      '850',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /^add card$/i }),
    )

    const item = screen
      .getByRole('heading', { name: 'Travel debit' })
      .closest('li')
    expect(item).not.toBeNull()
    const card = within(item as HTMLElement)
    expect(card.getByText(/available balance/i)).toBeInTheDocument()
    // The figure is printed on the card artwork and in the details panel.
    expect(card.getAllByText(/850/).length).toBe(2)

    const stored = window.localStorage.getItem(STORAGE_KEY) ?? ''
    expect(stored).toContain('"kind":"debit"')
    expect(stored).toContain('"balance":850')
  })

  it('updates a balance inline without opening the edit dialog', async () => {
    const user = userEvent.setup()
    render(<App />)

    const dialog = await fillNewCard(user)
    await user.click(within(dialog).getByRole('button', { name: /^add card$/i }))

    const item = screen
      .getByRole('heading', { name: 'Everyday spending' })
      .closest('li') as HTMLElement
    const card = within(item)

    await user.click(
      card.getByRole('button', { name: /update balance for everyday spending/i }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const input = card.getByLabelText(/^balance owed$/i)
    await user.clear(input)
    await user.type(input, 'abc')
    await user.click(card.getByRole('button', { name: /^save$/i }))
    expect(card.getByRole('alert')).toHaveTextContent(/digits only/i)
    expect(card.getByLabelText(/^balance owed$/i)).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, '1800.50')
    await user.click(card.getByRole('button', { name: /^save$/i }))

    expect(card.queryByRole('alert')).not.toBeInTheDocument()
    expect(card.getAllByText(/1,800/).length).toBe(2)
    expect(card.getByText(/18% of limit used/i)).toBeInTheDocument()

    let stored = window.localStorage.getItem(STORAGE_KEY) ?? ''
    expect(stored).toContain('"balance":1800.5')

    await user.click(
      card.getByRole('button', { name: /update balance for everyday spending/i }),
    )
    await user.clear(card.getByLabelText(/^balance owed$/i))
    await user.click(card.getByRole('button', { name: /^save$/i }))

    expect(card.getByText(/no balance recorded yet/i)).toBeInTheDocument()
    expect(card.queryAllByText(/1,800/).length).toBe(0)
    stored = window.localStorage.getItem(STORAGE_KEY) ?? ''
    expect(stored).not.toContain('"balance"')
  })

  it('validates the card number before saving', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /add your first card/i }),
    )
    const dialog = screen.getByRole('dialog', { name: /add a card/i })
    await user.type(
      within(dialog).getByLabelText(/^card number$/i),
      '4242424242424241',
    )
    await user.type(within(dialog).getByLabelText(/^card name$/i), 'Typo card')
    await user.click(within(dialog).getByRole('button', { name: /^add card$/i }))

    expect(
      screen.getByText(/review the highlighted fields/i),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/does not pass the card checksum/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('filters, edits and removes a card', async () => {
    const user = userEvent.setup()
    render(<App />)

    const dialog = await fillNewCard(user)
    await user.click(within(dialog).getByRole('button', { name: /^add card$/i }))

    await user.type(screen.getByLabelText(/search cards/i), 'no-such-card')
    expect(
      screen.getByText(/no cards match these filters/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^clear filters$/i }))
    expect(
      screen.getByRole('heading', { name: 'Everyday spending' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /edit everyday spending/i }),
    )
    const editDialog = screen.getByRole('dialog', { name: /edit card/i })
    const nameInput = within(editDialog).getByLabelText(/^card name$/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Daily card')
    await user.click(
      within(editDialog).getByRole('button', { name: /save changes/i }),
    )

    expect(
      screen.getByRole('heading', { name: 'Daily card' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Everyday spending')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /delete daily card/i }),
    )
    const confirm = screen.getByRole('alertdialog')
    await user.click(
      within(confirm).getByRole('button', { name: /remove card/i }),
    )

    expect(
      screen.getByText(/no cards in your vault yet/i),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })
})
