import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { STUDENT_A, STUDENT_B } from '@/test/fixtures'
import { advanceTime, useAdvancingFakeTimers } from '@/test/helpers'
import { API, countRequests, db, holdDto, problem, seedClass, seedHold } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/render'

const EXPIRED_TEXT = 'আবেদনের মেয়াদ শেষ হয়ে গেছে, সিট অন্যদের জন্য খুলে দেওয়া হয়েছে।'
const feeButton = () => screen.getByRole('button', { name: /ভর্তি ফি দিন|ফি দেওয়া হচ্ছে/ })
const cancelTrigger = () => screen.queryByRole('button', { name: 'আবেদন বাতিল করুন' })

// studentId: null = kono ID save nai (undefined dile default STUDENT_A boshe jeto)
function setup({ studentId = STUDENT_A as string | null, owner = STUDENT_A, expiresInMs = 600_000 } = {}) {
  const cls = seedClass({ name: 'Class 6 - Morning Shift', totalSeats: 5 })
  const hold = seedHold({ classId: cls.id, studentId: owner, expiresInMs })
  const utils = renderWithProviders(undefined, { route: `/holds/${hold.holdId}`, studentId: studentId ?? undefined })
  return { ...utils, cls, hold }
}

describe('HoldDetailPage', () => {
  it('shows class name, Student ID, HELD badge and a live countdown', async () => {
    const { hold } = setup()
    expect(await screen.findByText('Class 6 - Morning Shift')).toBeInTheDocument()
    expect(screen.getByTitle('HELD')).toHaveTextContent('অপেক্ষমাণ')
    expect(screen.getByText('মেয়াদ শেষ হতে বাকি:')).toBeInTheDocument()
    expect(screen.getByText(/^(১০:০০|০৯:৫৯)$/)).toBeInTheDocument()
    expect(screen.getAllByText(STUDENT_A).length).toBeGreaterThan(0)
    expect(screen.getByText(hold.holdId)).toBeInTheDocument()
    expect(screen.getByText(/বাংলাদেশ সময়/)).toBeInTheDocument()
    expect(feeButton()).toBeEnabled()
  })

  it('Rule 2: at expiry the page shows EXPIRED WITHOUT reload, "ভর্তি ফি দিন" is disabled and no confirm is sent', async () => {
    useAdvancingFakeTimers()
    const { user } = setup({ expiresInMs: 5000 })
    await screen.findByText('মেয়াদ শেষ হতে বাকি:')
    expect(feeButton()).toBeEnabled()
    const page = screen.getByText('Class 6 - Morning Shift')

    await advanceTime(6000)

    expect(await screen.findByTitle('EXPIRED')).toHaveTextContent('মেয়াদোত্তীর্ণ')
    expect(screen.getByText(EXPIRED_TEXT, { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('মেয়াদ শেষ হতে বাকি:')).not.toBeInTheDocument()
    expect(feeButton()).toBeDisabled()
    expect(cancelTrigger()).not.toBeInTheDocument()
    // Ekoi DOM node: page reload / remount hoyni
    expect(screen.getByText('Class 6 - Morning Shift')).toBe(page)

    await user.click(feeButton())
    expect(countRequests('POST', '/confirm')).toBe(0)
    // Countdown 0 hole server theke o notun status ana hoy
    await waitFor(() => expect(countRequests('GET', '/holds/')).toBeGreaterThanOrEqual(2))
  })

  it('confirm success → CONFIRMED badge, success alert and toast; actions disappear', async () => {
    const { user, hold } = setup()
    await user.click(await screen.findByRole('button', { name: 'ভর্তি ফি দিন' }))

    expect(await screen.findByTitle('CONFIRMED')).toHaveTextContent('নিশ্চিত')
    expect(screen.getByText('ভর্তি ফি পাওয়া গেছে। এই ক্লাসে আপনার সিট নিশ্চিত।')).toBeInTheDocument()
    expect(screen.getAllByText('ভর্তি নিশ্চিত হয়েছে').length).toBeGreaterThanOrEqual(2) // alert title + toast
    expect(screen.queryByRole('button', { name: 'ভর্তি ফি দিন' })).not.toBeInTheDocument()
    expect(cancelTrigger()).not.toBeInTheDocument()
    expect(db.holds.find((h) => h.holdId === hold.holdId)?.status).toBe('CONFIRMED')
    expect(db.requests.find((r) => r.path.endsWith('/confirm'))?.studentId).toBe(STUDENT_A)
  })

  it('confirm twice is prevented while the request is pending (one POST only)', async () => {
    let calls = 0
    server.use(
      http.post(`${API}/holds/:holdId/confirm`, async ({ params }) => {
        calls += 1
        await delay(300)
        const h = db.holds.find((x) => x.holdId === params.holdId)!
        h.status = 'CONFIRMED'
        return HttpResponse.json(holdDto(h))
      }),
    )
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'ভর্তি ফি দিন' }))

    const pending = screen.getByRole('button', { name: 'ফি দেওয়া হচ্ছে…' })
    expect(pending).toBeDisabled()
    expect(cancelTrigger()).toBeDisabled()
    await user.click(pending)
    await user.click(pending)

    expect(await screen.findByTitle('CONFIRMED')).toBeInTheDocument()
    expect(calls).toBe(1)
  })

  it('confirm → 409 INVALID_HOLD_STATE (expired on the server) shows the Bengali message and refetches', async () => {
    server.use(
      http.post(`${API}/holds/:holdId/confirm`, ({ params }) => {
        // Server er ghori age: server e expire hoye geche
        db.holds.find((x) => x.holdId === params.holdId)!.status = 'EXPIRED'
        return problem(409, 'INVALID_HOLD_STATE', 'Hold cannot be confirmed because it is EXPIRED.')
      }),
    )
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'ভর্তি ফি দিন' }))

    expect(await screen.findByText('এই আবেদনের মেয়াদ শেষ হয়ে গেছে অথবা এটি আর সক্রিয় নেই।')).toBeInTheDocument()
    expect(await screen.findByTitle('EXPIRED')).toBeInTheDocument()
    expect(feeButton()).toBeDisabled()
  })

  it('cancel opens a confirm dialog; "না, ফিরে যান" sends nothing; "হ্যাঁ, বাতিল করুন" sends DELETE → CANCELLED', async () => {
    const { user, hold } = setup()
    await user.click(await screen.findByRole('button', { name: 'আবেদন বাতিল করুন' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('আপনি কি নিশ্চিত?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'না, ফিরে যান' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(countRequests('DELETE', '/holds/')).toBe(0)
    expect(screen.getByTitle('HELD')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'আবেদন বাতিল করুন' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'হ্যাঁ, বাতিল করুন' }))

    expect(await screen.findByTitle('CANCELLED')).toHaveTextContent('বাতিল')
    expect(screen.getByText('এই আবেদনটি বাতিল করা হয়েছে।')).toBeInTheDocument()
    expect(await screen.findByText('আবেদন বাতিল করা হয়েছে, সিটটি অন্যদের জন্য খুলে দেওয়া হয়েছে।')).toBeInTheDocument()
    expect(countRequests('DELETE', '/holds/')).toBe(1)
    expect(db.holds.find((h) => h.holdId === hold.holdId)?.status).toBe('CANCELLED')
    expect(screen.queryByRole('button', { name: 'ভর্তি ফি দিন' })).not.toBeInTheDocument()
  })

  it('cancel fails (409, already confirmed in another tab) → Bengali toast, dialog closes, fresh status shown', async () => {
    server.use(
      http.delete(`${API}/holds/:holdId`, ({ params }) => {
        db.holds.find((x) => x.holdId === params.holdId)!.status = 'CONFIRMED'
        return problem(409, 'INVALID_HOLD_STATE', 'Hold cannot be cancelled because it is CONFIRMED.')
      }),
    )
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'আবেদন বাতিল করুন' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'হ্যাঁ, বাতিল করুন' }))

    expect(await screen.findByText('এই আবেদনের মেয়াদ শেষ হয়ে গেছে অথবা এটি আর সক্রিয় নেই।')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByTitle('CONFIRMED')).toBeInTheDocument()
  })

  it("another student's hold → warning; fee disabled, no cancel, nothing sent", async () => {
    const { user } = setup({ studentId: STUDENT_B, owner: STUDENT_A })
    expect(await screen.findByText('এই আবেদনটি আপনার নয়')).toBeInTheDocument()
    expect(feeButton()).toBeDisabled()
    expect(cancelTrigger()).not.toBeInTheDocument()
    await user.click(feeButton())
    expect(countRequests('POST', '/confirm')).toBe(0)
  })

  it('no student id saved → actions disabled with a hint to enter it', async () => {
    setup({ studentId: null })
    expect(await screen.findByText('Student ID দেওয়া হয়নি')).toBeInTheDocument()
    expect(screen.getByText(/ভর্তি ফি দিতে বা বাতিল করতে উপরে যে Student ID দিয়ে আবেদন করেছিলেন সেটি দিন/)).toBeInTheDocument()
    expect(feeButton()).toBeDisabled()
    expect(cancelTrigger()).not.toBeInTheDocument()
  })

  it('a CONFIRMED hold from earlier shows the success state (no countdown, no actions)', async () => {
    const cls = seedClass({ name: 'Done Class', totalSeats: 2 })
    const hold = seedHold({ classId: cls.id, studentId: STUDENT_A, status: 'CONFIRMED', expiresInMs: -60_000 })
    renderWithProviders(undefined, { route: `/holds/${hold.holdId}`, studentId: STUDENT_A })
    expect(await screen.findByTitle('CONFIRMED')).toBeInTheDocument()
    expect(screen.queryByText('মেয়াদ শেষ হতে বাকি:')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ভর্তি ফি দিন' })).not.toBeInTheDocument()
  })

  it.each([
    ['unknown GUID (404 HOLD_NOT_FOUND)', '00000000-0000-0000-0000-000000000000'],
    ['not a GUID (404, empty body)', 'not-a-guid'],
  ])('%s → "আবেদন পাওয়া যায়নি" with a link to /me', async (_label, id) => {
    renderWithProviders(undefined, { route: `/holds/${id}`, studentId: STUDENT_A })
    expect(await screen.findByText('আবেদন পাওয়া যায়নি')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: 'আমার সব আবেদন' })
    expect(links[0]).toHaveAttribute('href', '/me')
  })

  it('server down on load → Bengali error with retry, never blank', async () => {
    server.use(http.get(`${API}/holds/:holdId`, () => HttpResponse.error()))
    renderWithProviders(undefined, { route: `/holds/${crypto.randomUUID()}`, studentId: STUDENT_A })
    expect(await screen.findByText('আবেদনের তথ্য আনা যায়নি')).toBeInTheDocument()
    expect(screen.getByText('সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeInTheDocument()
  })
})
