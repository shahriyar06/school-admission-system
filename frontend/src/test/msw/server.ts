import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Node e fetch dhore MSW handler theke uttor dey, asol backend lage na
export const server = setupServer(...handlers)
