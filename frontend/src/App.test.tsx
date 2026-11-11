import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

// Asol App (BrowserRouter soho), jsdom er URL bodle route dekhi
function openAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App routing', () => {
  afterEach(() => window.history.pushState({}, '', '/'))

  it('unknown route → Bengali 404 page with a link home', async () => {
    openAt('/this/does/not/exist')
    expect(await screen.findByText('পাতাটি খুঁজে পাওয়া যায়নি')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ক্লাস তালিকায় ফিরে যান' })).toHaveAttribute('href', '/')
  })

  it('header with all navigation links is present on every page', async () => {
    openAt('/this/does/not/exist')
    await screen.findByText('পাতাটি খুঁজে পাওয়া যায়নি')
    expect(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ক্লাস তালিকা' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'আমার আবেদন' })).toHaveAttribute('href', '/me')
    expect(screen.getByRole('link', { name: 'ক্লাস তৈরি (Admin)' })).toHaveAttribute('href', '/admin/classes/new')
  })

  it.each([
    ['/', 'ক্লাস তালিকা', 'heading'],
    ['/me', 'আমার আবেদন', 'heading'],
    ['/admin/classes/new', 'নতুন ক্লাস তৈরি (Admin)', 'text'],
  ] as const)('route %s renders its screen', async (path, title, kind) => {
    openAt(path)
    if (kind === 'heading') expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    else expect(await screen.findByText(title)).toBeInTheDocument()
  })
})
