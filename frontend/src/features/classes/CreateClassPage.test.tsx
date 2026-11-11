import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, countRequests, db, problem } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/render'

const nameInput = () => screen.getByLabelText('ক্লাস এর নাম')
const seatsInput = () => screen.getByLabelText('মোট সিট সংখ্যা')
const submit = () => screen.getByRole('button', { name: 'ক্লাস তৈরি করুন' })

function renderPage() {
  return renderWithProviders(undefined, { route: '/admin/classes/new' })
}

describe('CreateClassPage (school admin): create a class from the UI', () => {
  it('shows the shift helper text and starts with submit disabled', () => {
    renderPage()
    expect(screen.getByText(/প্রতিটি shift আলাদা ক্লাস হিসেবে তৈরি করুন/)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('valid submit → POST with trimmed name and a number, success toast, navigates to /', async () => {
    const { user } = renderPage()
    // type er bodole paste: Docker load e protita okkhor er event e 5s timeout hoto
    await user.click(nameInput())
    await user.paste('   Class 6 - Morning Shift   ')
    await user.type(seatsInput(), '40')
    expect(submit()).toBeEnabled()
    await user.click(submit())

    expect(await screen.findByText('ক্লাস তৈরি হয়েছে')).toBeInTheDocument()
    // React Router v7 navigation transition e hoy, tai opekkha kori
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'))
    const post = db.requests.find((r) => r.method === 'POST' && r.path === '/classes')
    expect(post?.body).toEqual({ name: 'Class 6 - Morning Shift', totalSeats: 40 })
    // Notun class list e dekha jay
    expect(await screen.findByText('Class 6 - Morning Shift')).toBeInTheDocument()
  })

  it('Bangla digits in the seat count are accepted', async () => {
    const { user } = renderPage()
    await user.type(nameInput(), 'Class 7')
    await user.type(seatsInput(), '৩৫')
    await user.click(submit())
    await screen.findByText('ক্লাস তৈরি হয়েছে')
    expect(db.classes[0]).toMatchObject({ name: 'Class 7', totalSeats: 35 })
  })

  it.each([
    ['empty name (only spaces)', '   ', '10', 'ক্লাস এর নাম দিন।'],
    ['name longer than 200 chars', 'x'.repeat(201), '10', 'নাম সর্বোচ্চ ২০০ অক্ষরের হতে পারে (এখন ২০১)।'],
    ['0 seats', 'Class 6', '0', 'কমপক্ষে ১টি সিট দিতে হবে।'],
    ['10001 seats', 'Class 6', '10001', 'সর্বোচ্চ ১০,০০০টি সিট দেওয়া যাবে।'],
    ['1.5 seats', 'Class 6', '1.5', 'সিট সংখ্যা একটি পূর্ণ সংখ্যা হতে হবে (যেমন ৪০)। দশমিক বা অক্ষর চলবে না।'],
    ['letters as seats', 'Class 6', 'abc', 'সিট সংখ্যা একটি পূর্ণ সংখ্যা হতে হবে (যেমন ৪০)। দশমিক বা অক্ষর চলবে না।'],
    ['negative seats', 'Class 6', '-3', 'সিট সংখ্যা একটি পূর্ণ সংখ্যা হতে হবে (যেমন ৪০)। দশমিক বা অক্ষর চলবে না।'],
  ])('invalid: %s → inline Bengali message, submit disabled, no API call', async (_label, name, seats, message) => {
    const { user } = renderPage()
    // paste: ekbare pura text (201 ta char type korte coverage mode e 5s timeout par hoye jay)
    await user.click(nameInput())
    await user.paste(name)
    await user.type(seatsInput(), seats)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    await user.click(submit())
    // Enter chaplei form submit hoy na
    await user.type(seatsInput(), '{Enter}')
    expect(countRequests('POST', '/classes')).toBe(0)
  })

  it('empty seat count after touching the field → "মোট সিট সংখ্যা দিন।"', async () => {
    const { user } = renderPage()
    await user.click(seatsInput())
    await user.tab()
    expect(screen.getByText('মোট সিট সংখ্যা দিন।')).toBeInTheDocument()
  })

  it('server VALIDATION_ERROR is shown in Bengali with the field details (inline + toast)', async () => {
    server.use(
      http.post(`${API}/classes`, () =>
        problem(400, 'VALIDATION_ERROR', 'The request is invalid.', { name: ['Class name already exists.'] }),
      ),
    )
    const { user } = renderPage()
    await user.type(nameInput(), 'Class 6')
    await user.type(seatsInput(), '10')
    await user.click(submit())

    expect(await screen.findByText('ক্লাস তৈরি করা যায়নি')).toBeInTheDocument()
    const expected = 'দেওয়া তথ্য সঠিক নয়। অনুগ্রহ করে আবার দেখে নিন। (Class name already exists.)'
    expect((await screen.findAllByText(expected)).length).toBeGreaterThanOrEqual(1)
    // Page ei thake, navigate kore na
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/classes/new')
  })
})
