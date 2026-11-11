import { act, screen, within } from '@testing-library/react'
import { vi } from 'vitest'

// Fake timer, kintu asol somoy o choltey thake: MSW, React Query, user-event kaj kore
export function useAdvancingFakeTimers() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
}

export async function advanceTime(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

// Class card (shadcn Card, data-slot="card") nam diye
export async function findClassCard(name: string) {
  const title = await screen.findByText(name)
  const card = title.closest<HTMLElement>('[data-slot="card"]')
  if (!card) throw new Error(`card for ${name} not found`)
  return card
}

// Card er "মোট / অপেক্ষমাণ / নিশ্চিত / খালি" box er songkha (Bangla digit)
export function statValue(card: HTMLElement, label: string) {
  const labelEl = within(card).getByText(label)
  return labelEl.nextElementSibling?.textContent ?? ''
}
