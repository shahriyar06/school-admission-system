import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

// Flag true thakle render e throw kore
const state = { broken: true }
function Fragile() {
  if (state.broken) throw new Error('render exploded')
  return <p>সব ঠিক আছে</p>
}

describe('ErrorBoundary: a render error never leaves a blank page', () => {
  beforeEach(() => {
    state.broken = true
    // React render error console e log kore, test output porishkar rakhi
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders the Bengali fallback card instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByText('দুঃখিত, কিছু একটা সমস্যা হয়েছে')).toBeInTheDocument()
    expect(screen.getByText(/এই অংশটি দেখাতে সমস্যা হচ্ছে/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('"আবার চেষ্টা করুন" re-renders the children once the problem is gone', async () => {
    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    state.broken = false
    await user.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }))
    expect(screen.getByText('সব ঠিক আছে')).toBeInTheDocument()
    expect(screen.queryByText('দুঃখিত, কিছু একটা সমস্যা হয়েছে')).not.toBeInTheDocument()
  })

  it('renders children normally when nothing throws', () => {
    state.broken = false
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByText('সব ঠিক আছে')).toBeInTheDocument()
  })
})
