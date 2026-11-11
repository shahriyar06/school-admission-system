import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { STUDENT_A, STUDENT_B } from '@/test/fixtures'
import { advanceTime, useAdvancingFakeTimers } from '@/test/helpers'
import { API, db, seedClass, seedHold } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/render'

const renderMe = (studentId?: string) => renderWithProviders(undefined, { route: '/me', studentId })

// Protita row ekta shadcn Card; list er moddhe class er nam er order
function rowNames() {
  return screen
    .getAllByRole('link', { name: /বিস্তারিত|ভর্তি ফি দিতে যান/ })
    .map((link) => link.closest('[data-slot="card"]')!.querySelector('span.font-medium')!.textContent)
}

describe('MyHoldsPage', () => {
  it("Rule 4: with an id already in localStorage (refresh / browser restart) it lists that student's holds, newest first", async () => {
    const a = seedClass({ name: 'Class A', totalSeats: 5 })
    const b = seedClass({ name: 'Class B', totalSeats: 5 })
    const c = seedClass({ name: 'Class C', totalSeats: 5 })
    seedHold({ classId: a.id, studentId: STUDENT_A, status: 'CONFIRMED' }) // purono
    seedHold({ classId: b.id, studentId: STUDENT_B }) // onno student er
    seedHold({ classId: c.id, studentId: STUDENT_A }) // notun

    // Kono UI step chara sudhu localStorage e ID: page refresh er moto
    renderMe(STUDENT_A)

    await screen.findByText('Class C')
    expect(rowNames()).toEqual(['Class C', 'Class A'])
    expect(screen.queryByText('Class B')).not.toBeInTheDocument()
    expect(db.requests.find((r) => r.path === '/me/holds')?.studentId).toBe(STUDENT_A)

    const newest = screen.getByText('Class C').closest<HTMLElement>('[data-slot="card"]')!
    expect(within(newest).getByTitle('HELD')).toHaveTextContent('অপেক্ষমাণ')
    expect(within(newest).getByText('মেয়াদ শেষ হতে বাকি:')).toBeInTheDocument()
    expect(within(newest).getByRole('link', { name: 'ভর্তি ফি দিতে যান' })).toHaveAttribute('href', expect.stringMatching(/^\/holds\//))
    const older = screen.getByText('Class A').closest<HTMLElement>('[data-slot="card"]')!
    expect(within(older).getByTitle('CONFIRMED')).toHaveTextContent('নিশ্চিত')
    expect(within(older).getByRole('link', { name: 'বিস্তারিত' })).toBeInTheDocument()
  })

  it('HELD row countdown switches to EXPIRED when time passes (no reload)', async () => {
    useAdvancingFakeTimers()
    const cls = seedClass({ name: 'Short Hold', totalSeats: 1 })
    seedHold({ classId: cls.id, studentId: STUDENT_A, expiresInMs: 4000 })
    renderMe(STUDENT_A)

    const row = (await screen.findByText('Short Hold')).closest<HTMLElement>('[data-slot="card"]')!
    expect(within(row).getByTitle('HELD')).toBeInTheDocument()

    await advanceTime(5000)
    await waitFor(() => expect(within(row).getByTitle('EXPIRED')).toHaveTextContent('মেয়াদোত্তীর্ণ'))
    expect(within(row).queryByText('মেয়াদ শেষ হতে বাকি:')).not.toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'বিস্তারিত' })).toBeInTheDocument()
  })

  it('no student id → prompt to enter it, and /me/holds is not called', async () => {
    renderMe()
    expect(await screen.findByText('আপনার আবেদন দেখতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।')).toBeInTheDocument()
    expect(db.requests.some((r) => r.path === '/me/holds')).toBe(false)
  })

  it('saving an id in the header loads that student\'s holds (query key includes the id)', async () => {
    const cls = seedClass({ name: 'Mine Later', totalSeats: 2 })
    seedHold({ classId: cls.id, studentId: STUDENT_B })
    const { user } = renderMe()
    await user.type(screen.getByLabelText('Student ID (জন্ম নিবন্ধন নম্বর)'), STUDENT_B)
    await user.click(screen.getByRole('button', { name: 'সংরক্ষণ' }))
    expect(await screen.findByText('Mine Later')).toBeInTheDocument()
  })

  it('empty state: "আপনার কোনো আবেদন নেই" with a link to the class list', async () => {
    renderMe(STUDENT_A)
    expect(await screen.findByText('আপনার কোনো আবেদন নেই')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ক্লাস তালিকায় যান' })).toHaveAttribute('href', '/')
  })

  it('network error → Bengali alert with retry; retry recovers', async () => {
    const cls = seedClass({ name: 'Recovered', totalSeats: 2 })
    seedHold({ classId: cls.id, studentId: STUDENT_A })
    server.use(http.get(`${API}/me/holds`, () => HttpResponse.error()))
    const { user } = renderMe(STUDENT_A)

    expect(await screen.findByText('আপনার আবেদন আনা যায়নি')).toBeInTheDocument()
    expect(screen.getByText('সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।')).toBeInTheDocument()

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }))
    expect(await screen.findByText('Recovered')).toBeInTheDocument()
  })
})
