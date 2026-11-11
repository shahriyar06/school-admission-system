import { describe, expect, it } from 'vitest'
import { ApiError, NETWORK_ERROR, getErrorMessage, isApiError } from './api-error'

describe('getErrorMessage: every backend code becomes a friendly Bengali message', () => {
  it.each([
    ['NO_SEATS', 409, 'দুঃখিত, এই ক্লাস এ আর কোনো সিট খালি নেই।'],
    ['ALREADY_APPLIED', 409, 'এই ক্লাস এ আপনার একটি চলমান আবেদন বা নিশ্চিত ভর্তি আগে থেকেই আছে।'],
    ['INVALID_STUDENT_ID', 400, 'সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।'],
    ['INVALID_HOLD_STATE', 409, 'এই আবেদনের মেয়াদ শেষ হয়ে গেছে অথবা এটি আর সক্রিয় নেই।'],
    ['FORBIDDEN', 403, 'এই আবেদনটি অন্য একজন শিক্ষার্থীর, আপনি এটি পরিবর্তন করতে পারবেন না।'],
    ['CLASS_NOT_FOUND', 404, 'এই ক্লাস টি খুঁজে পাওয়া যায়নি।'],
    ['HOLD_NOT_FOUND', 404, 'এই আবেদনটি খুঁজে পাওয়া যায়নি।'],
    ['BAD_REQUEST', 400, 'অনুরোধটি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।'],
    ['INTERNAL_ERROR', 500, 'সার্ভার এ একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'],
    [NETWORK_ERROR, 0, 'সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।'],
  ])('%s → Bengali message', (code, status, expected) => {
    expect(getErrorMessage(new ApiError(status, code))).toBe(expected)
  })

  it('VALIDATION_ERROR includes the field details sent by the server', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'The request is invalid.', {
      totalSeats: ['totalSeats must be a whole number.'],
    })
    expect(getErrorMessage(error)).toBe(
      'দেওয়া তথ্য সঠিক নয়। অনুগ্রহ করে আবার দেখে নিন। (totalSeats must be a whole number.)',
    )
  })

  it('VALIDATION_ERROR without field details shows the server detail', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Total seats must be greater than 0.')
    expect(getErrorMessage(error)).toContain('(Total seats must be greater than 0.)')
  })

  it('VALIDATION_ERROR with no detail at all shows only the generic validation text', () => {
    expect(getErrorMessage(new ApiError(400, 'VALIDATION_ERROR'))).toBe('দেওয়া তথ্য সঠিক নয়। অনুগ্রহ করে আবার দেখে নিন।')
  })

  it('unknown 5xx code falls back to the server-error message', () => {
    expect(getErrorMessage(new ApiError(503, 'SOMETHING_NEW'))).toBe(
      'সার্ভার এ একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    )
  })

  it('unknown 4xx code falls back to a generic Bengali message', () => {
    expect(getErrorMessage(new ApiError(418, 'TEAPOT'))).toBe('কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')
  })

  it.each([new Error('boom'), 'string error', null, undefined, { code: 'NO_SEATS' }])(
    'non-ApiError input (%s) → generic Bengali message, never throws',
    (input) => {
      expect(getErrorMessage(input)).toBe('কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')
    },
  )

  it('isApiError distinguishes ApiError from other errors', () => {
    expect(isApiError(new ApiError(400, 'X'))).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
  })
})
