import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STUDENT_ID_STORAGE_KEY } from '@/features/student/StudentContext'
import { STUDENT_A, STUDENT_B } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { AppHeader } from './AppHeader'

const idInput = () => screen.getByLabelText('Student ID (জন্ম নিবন্ধন নম্বর)')
const saveButton = () => screen.getByRole('button', { name: 'সংরক্ষণ' })

describe('AppHeader: title, navigation and the Student ID box', () => {
  it('shows the app title and all navigation links', () => {
    renderWithProviders(<AppHeader />)
    expect(screen.getByRole('link', { name: 'স্কুল ভর্তি' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'ক্লাস তালিকা' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'আমার আবেদন' })).toHaveAttribute('href', '/me')
    expect(screen.getByRole('link', { name: 'ক্লাস তৈরি (Admin)' })).toHaveAttribute('href', '/admin/classes/new')
  })

  it('highlights the active route', () => {
    renderWithProviders(<AppHeader />, { route: '/me' })
    expect(screen.getByRole('link', { name: 'আমার আবেদন' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'ক্লাস তালিকা' })).not.toHaveAttribute('aria-current')
  })

  it('save is disabled until exactly 17 digits, with a live validation message', async () => {
    const { user } = renderWithProviders(<AppHeader />)
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।')).toBeInTheDocument()

    await user.type(idInput(), '12345')
    expect(screen.getByText('আরও ১২টি অঙ্ক বাকি (৫/১৭)।')).toBeInTheDocument()
    expect(idInput()).toHaveAttribute('aria-invalid', 'true')
    expect(saveButton()).toBeDisabled()

    await user.type(idInput(), 'A')
    expect(screen.getByText('শুধু সংখ্যা (০-৯) দিন।')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.clear(idInput())
    await user.type(idInput(), STUDENT_A)
    expect(screen.getByText('নম্বরটি সঠিক।')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('input is limited to 17 characters', async () => {
    const { user } = renderWithProviders(<AppHeader />)
    await user.type(idInput(), `${STUDENT_A}999`)
    expect(idInput()).toHaveValue(STUDENT_A)
  })

  it('Bangla digits are converted to ASCII digits', async () => {
    const { user } = renderWithProviders(<AppHeader />)
    await user.type(idInput(), '২০১৫২৬৯১২৩৪৫৬৭৮৯০')
    expect(idInput()).toHaveValue(STUDENT_A)
    expect(saveButton()).toBeEnabled()
  })

  it('saving shows the saved id, stores it, and shows a toast', async () => {
    const { user } = renderWithProviders(<AppHeader />)
    await user.type(idInput(), STUDENT_A)
    await user.click(saveButton())

    expect(screen.getByText(STUDENT_A)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'পরিবর্তন' })).toBeInTheDocument()
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBe(STUDENT_A)
    expect(await screen.findByText('Student ID সংরক্ষণ করা হয়েছে।')).toBeInTheDocument()
  })

  it('change flow: পরিবর্তন → new id → saved; বাতিল keeps the old id', async () => {
    const { user } = renderWithProviders(<AppHeader />, { studentId: STUDENT_A })
    expect(screen.getByText(STUDENT_A)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'পরিবর্তন' }))
    expect(idInput()).toHaveValue(STUDENT_A)
    await user.click(screen.getByRole('button', { name: 'বাতিল' }))
    expect(screen.getByText(STUDENT_A)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'পরিবর্তন' }))
    await user.clear(idInput())
    await user.type(idInput(), STUDENT_B)
    await user.click(saveButton())
    expect(screen.getByText(STUDENT_B)).toBeInTheDocument()
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBe(STUDENT_B)
  })

  it('মুছে ফেলুন clears the saved id', async () => {
    const { user } = renderWithProviders(<AppHeader />, { studentId: STUDENT_A })
    await user.click(screen.getByRole('button', { name: 'পরিবর্তন' }))
    await user.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }))
    expect(localStorage.getItem(STUDENT_ID_STORAGE_KEY)).toBeNull()
    expect(idInput()).toHaveValue('')
  })

  describe('QA fixes', () => {
    it('"আমার আবেদন" is highlighted on /holds/:holdId pages', () => {
      renderWithProviders(<AppHeader />, { route: '/holds/00000000-0000-0000-0000-000000000001' })
      expect(screen.getByRole('link', { name: 'আমার আবেদন' })).toHaveAttribute('data-active', 'true')
      expect(screen.getByRole('link', { name: 'ক্লাস তালিকা' })).not.toHaveAttribute('data-active')
    })

    it('mobile nav: 3 equal-width grid items, no horizontal scroll; same accessible names', () => {
      renderWithProviders(<AppHeader />)
      const nav = screen.getByRole('navigation', { name: 'প্রধান মেনু' })
      expect(nav).toHaveClass('grid', 'grid-cols-3')
      expect(nav.className).not.toMatch(/overflow-x-auto/)
      for (const name of ['ক্লাস তালিকা', 'আমার আবেদন', 'ক্লাস তৈরি (Admin)']) {
        expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
      }
    })

    it('more than 17 digits set programmatically (bypassing maxlength) is rejected', () => {
      renderWithProviders(<AppHeader />)
      fireEvent.change(idInput(), { target: { value: `${STUDENT_A}99` } })
      expect(screen.getByText('সর্বোচ্চ ১৭টি অঙ্ক দেওয়া যাবে (এখন ১৯টি)।')).toBeInTheDocument()
      expect(screen.queryByText('নম্বরটি সঠিক।')).not.toBeInTheDocument()
      expect(idInput()).toHaveAttribute('aria-invalid', 'true')
      expect(saveButton()).toBeDisabled()
    })
  })
})
