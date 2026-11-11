import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { STUDENT_A, STUDENT_B } from '@/test/fixtures'
import { advanceTime, findClassCard, statValue, useAdvancingFakeTimers } from '@/test/helpers'
import { API, countRequests, db, problem, seedClass, seedHold } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/render'

const renderList = (studentId?: string) => renderWithProviders(undefined, { route: '/', studentId })
const applyButton = (card: HTMLElement) => within(card).getByRole('button', { name: 'আবেদন করুন' })

describe('ClassListPage', () => {
  it('renders total / held / confirmed / available for each class (Bangla digits)', async () => {
    const a = seedClass({ name: 'Class 6 - Morning Shift', totalSeats: 5 })
    seedClass({ name: 'Class 6 - Day Shift', totalSeats: 3 })
    seedHold({ classId: a.id, studentId: STUDENT_B })
    seedHold({ classId: a.id, studentId: '20152691234567892', status: 'CONFIRMED' })
    renderList()

    const morning = await findClassCard('Class 6 - Morning Shift')
    expect(statValue(morning, 'মোট')).toBe('৫')
    expect(statValue(morning, 'অপেক্ষমাণ')).toBe('১')
    expect(statValue(morning, 'নিশ্চিত')).toBe('১')
    expect(statValue(morning, 'খালি')).toBe('৩')

    const day = await findClassCard('Class 6 - Day Shift')
    expect(statValue(day, 'মোট')).toBe('৩')
    expect(statValue(day, 'খালি')).toBe('৩')
    expect(screen.getByText('প্রতি ৩ সেকেন্ডে আপডেট হয়', { exact: false })).toBeInTheDocument()
  })

  it('Rule 3: seat counts update WITHOUT reload when the polling interval passes', async () => {
    useAdvancingFakeTimers()
    const c = seedClass({ name: 'Class 8', totalSeats: 2 })
    renderList()
    const card = await findClassCard('Class 8')
    expect(statValue(card, 'অপেক্ষমাণ')).toBe('০')
    expect(statValue(card, 'খালি')).toBe('২')
    const fetchesBefore = countRequests('GET', '/classes')

    // UI er baire onno student hold nilo (onno browser / tab)
    seedHold({ classId: c.id, studentId: STUDENT_B })
    seedHold({ classId: c.id, studentId: '20152691234567892' })

    await advanceTime(3100)
    await waitFor(() => expect(statValue(card, 'অপেক্ষমাণ')).toBe('২'))
    expect(statValue(card, 'খালি')).toBe('০')
    expect(within(card).getByText('সিট নেই')).toBeInTheDocument()
    expect(applyButton(card)).toBeDisabled()
    expect(countRequests('GET', '/classes')).toBeGreaterThan(fetchesBefore)
  })

  it('apply is disabled without a saved student id, with a hint and an alert', async () => {
    seedClass({ name: 'Class 6', totalSeats: 5 })
    renderList()
    const card = await findClassCard('Class 6')
    expect(applyButton(card)).toBeDisabled()
    expect(within(card).getByText('আবেদন করতে উপরে Student ID দিন।')).toBeInTheDocument()
    expect(screen.getByText('আবেদন করতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।')).toBeInTheDocument()
  })

  it('apply is disabled when no seat is available ("সিট নেই")', async () => {
    const c = seedClass({ name: 'Full Class', totalSeats: 1 })
    seedHold({ classId: c.id, studentId: STUDENT_B })
    renderList(STUDENT_A)
    const card = await findClassCard('Full Class')
    expect(within(card).getByText('সিট নেই')).toBeInTheDocument()
    expect(applyButton(card)).toBeDisabled()
    expect(within(card).getByText('এই ক্লাস এ এখন কোনো সিট খালি নেই।')).toBeInTheDocument()
  })

  it('apply success → POST with X-Student-Id, success toast, navigates to /holds/:id', async () => {
    const c = seedClass({ name: 'Class 9', totalSeats: 5 })
    const { user } = renderList(STUDENT_A)
    const card = await findClassCard('Class 9')
    await user.click(applyButton(card))

    expect(await screen.findByText('আবেদন সফল হয়েছে, আপনার জন্য একটি সিট রাখা হয়েছে।')).toBeInTheDocument()
    const hold = db.holds.find((h) => h.classId === c.id)
    expect(hold?.studentId).toBe(STUDENT_A)
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(`/holds/${hold!.holdId}`))
    expect(db.requests.find((r) => r.method === 'POST' && r.path.endsWith('/holds'))?.studentId).toBe(STUDENT_A)
  })

  it('existing active hold → "আপনার আবেদন দেখুন" link instead of apply', async () => {
    const c = seedClass({ name: 'Class 10', totalSeats: 5 })
    const hold = seedHold({ classId: c.id, studentId: STUDENT_A })
    renderList(STUDENT_A)
    const card = await findClassCard('Class 10')
    const link = await within(card).findByRole('link', { name: 'আপনার আবেদন দেখুন' })
    expect(link).toHaveAttribute('href', `/holds/${hold.holdId}`)
    expect(within(card).queryByRole('button', { name: 'আবেদন করুন' })).not.toBeInTheDocument()
    expect(within(card).getByTitle('HELD')).toHaveTextContent('অপেক্ষমাণ')
  })

  it('a CONFIRMED hold also shows the link; an expired / cancelled one does not', async () => {
    const confirmed = seedClass({ name: 'Confirmed Class', totalSeats: 5 })
    const expired = seedClass({ name: 'Expired Class', totalSeats: 5 })
    seedHold({ classId: confirmed.id, studentId: STUDENT_A, status: 'CONFIRMED' })
    seedHold({ classId: expired.id, studentId: STUDENT_A, expiresInMs: -1000 })
    renderList(STUDENT_A)

    const c1 = await findClassCard('Confirmed Class')
    expect(await within(c1).findByRole('link', { name: 'আপনার আবেদন দেখুন' })).toBeInTheDocument()
    const c2 = await findClassCard('Expired Class')
    expect(applyButton(c2)).toBeEnabled()
  })

  it.each([
    ['NO_SEATS', 'No seats available in this class.', 'দুঃখিত, এই ক্লাস এ আর কোনো সিট খালি নেই।'],
    ['ALREADY_APPLIED', 'Student already has an active hold for this class.', 'এই ক্লাস এ আপনার একটি চলমান আবেদন বা নিশ্চিত ভর্তি আগে থেকেই আছে।'],
  ])('Rule 5: 409 %s → Bengali toast, stays on the list and refetches classes', async (code, detail, message) => {
    seedClass({ name: 'Race Class', totalSeats: 1 })
    server.use(http.post(`${API}/classes/:classId/holds`, () => problem(409, code, detail)))
    const { user } = renderList(STUDENT_A)
    const card = await findClassCard('Race Class')
    const fetchesBefore = countRequests('GET', '/classes')
    await user.click(applyButton(card))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByTestId('location').textContent).toBe('/')
    await waitFor(() => expect(countRequests('GET', '/classes')).toBeGreaterThan(fetchesBefore))
  })

  it('Rule 5: 400 INVALID_STUDENT_ID from the server → Bengali toast', async () => {
    seedClass({ name: 'Class 11', totalSeats: 3 })
    server.use(
      http.post(`${API}/classes/:classId/holds`, () => problem(400, 'INVALID_STUDENT_ID', 'X-Student-Id must be exactly 17 digits.')),
    )
    const { user } = renderList(STUDENT_A)
    await user.click(applyButton(await findClassCard('Class 11')))
    expect(await screen.findByText('সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।')).toBeInTheDocument()
  })

  it('Rule 5: server down → Bengali error alert (not a blank page); retry recovers', async () => {
    seedClass({ name: 'Back Again', totalSeats: 2 })
    server.use(http.get(`${API}/classes`, () => HttpResponse.error()))
    const { user } = renderList()

    expect(await screen.findByText('ক্লাস তালিকা আনা যায়নি')).toBeInTheDocument()
    expect(screen.getByText('সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ক্লাস তালিকা' })).toBeInTheDocument()

    server.resetHandlers() // server abar chalu
    await user.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }))
    expect(await findClassCard('Back Again')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('ক্লাস তালিকা আনা যায়নি')).not.toBeInTheDocument())
  })

  it('Rule 5: server goes down after data loaded → keeps the last data and shows a Bengali alert', async () => {
    useAdvancingFakeTimers()
    seedClass({ name: 'Cached Class', totalSeats: 2 })
    renderList()
    await findClassCard('Cached Class')

    server.use(http.get(`${API}/classes`, () => HttpResponse.error()))
    await advanceTime(3100)
    expect(await screen.findByText('সর্বশেষ তথ্য আনা যাচ্ছে না, আগের তথ্য দেখানো হচ্ছে')).toBeInTheDocument()
    expect(screen.getByText('Cached Class')).toBeInTheDocument()
  })

  it('apply while the server is down → Bengali network toast', async () => {
    seedClass({ name: 'Class 12', totalSeats: 3 })
    const { user } = renderList(STUDENT_A)
    const card = await findClassCard('Class 12')
    server.use(http.post(`${API}/classes/:classId/holds`, () => HttpResponse.error()))
    await user.click(applyButton(card))
    expect(await screen.findAllByText('সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।')).not.toHaveLength(0)
  })

  it('empty state: "এখনো কোনো ক্লাস তৈরি হয়নি" with a link to the admin page', async () => {
    renderList()
    expect(await screen.findByText('এখনো কোনো ক্লাস তৈরি হয়নি')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ক্লাস তৈরি করুন (Admin)' })).toHaveAttribute('href', '/admin/classes/new')
  })

  describe('QA fixes: offline state', () => {
    it('poll fails → "অফলাইন" chip instead of LIVE, hint hidden, apply disabled with a hint; recovers automatically', async () => {
      useAdvancingFakeTimers()
      seedClass({ name: 'Offline Class', totalSeats: 3 })
      renderList(STUDENT_A)
      const card = await findClassCard('Offline Class')
      expect(applyButton(card)).toBeEnabled()
      expect(screen.getByText('প্রতি ৩ সেকেন্ডে আপডেট হয়', { exact: false })).toBeInTheDocument()

      server.use(http.get(`${API}/classes`, () => HttpResponse.error()))
      await advanceTime(3100)
      expect(await screen.findByText('অফলাইন')).toBeInTheDocument()
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
      expect(screen.queryByText('প্রতি ৩ সেকেন্ডে আপডেট হয়', { exact: false })).not.toBeInTheDocument()
      const offlineCard = await findClassCard('Offline Class')
      expect(applyButton(offlineCard)).toBeDisabled()
      expect(within(offlineCard).getByText('সার্ভার এর সাথে সংযোগ ফিরলে আবেদন করা যাবে।')).toBeInTheDocument()

      // Server fire ele porer poll e nijei abar chalu
      server.resetHandlers()
      await advanceTime(3100)
      await waitFor(() => expect(screen.queryByText('অফলাইন')).not.toBeInTheDocument())
      expect(screen.getByText('Live')).toBeInTheDocument()
      expect(applyButton(await findClassCard('Offline Class'))).toBeEnabled()
    })
  })
})
