import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { resetDb } from './msw/handlers'
import { server } from './msw/server'

// jsdom e nai, kintu Radix (Dialog) / sonner lage
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, writable: true })
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

const proto = Element.prototype as Element & Record<string, unknown>
proto.scrollIntoView ??= function scrollIntoView() {}
proto.hasPointerCapture ??= function hasPointerCapture() {
  return false
}
proto.setPointerCapture ??= function setPointerCapture() {}
proto.releasePointerCapture ??= function releasePointerCapture() {}

// Handler na thaka request e test fail korbe, jate bhul URL dhora pore
// msw v3 e option er nam onUnhandledFrame (v2 te chilo onUnhandledRequest)
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  // sonner er toast global state e thake, notun Toaster mount hole ager test er toast abar dekhay
  toast.dismiss()
  cleanup()
  localStorage.clear()
  server.resetHandlers()
  resetDb()
  vi.useRealTimers()
})

afterAll(() => server.close())
