// Backend er ProblemDetails theke banano error, sathe "code" (exp: "NO_SEATS")
export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, string[]>

  constructor(status: number, code: string, message?: string, details?: Record<string, string[]>) {
    super(message ?? code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR'

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const messages: Record<string, string> = {
  NO_SEATS: 'দুঃখিত, এই ক্লাস এ আর কোনো সিট খালি নেই।',
  ALREADY_APPLIED: 'এই ক্লাস এ আপনার একটি চলমান আবেদন বা নিশ্চিত ভর্তি আগে থেকেই আছে।',
  INVALID_STUDENT_ID: 'সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।',
  INVALID_HOLD_STATE: 'এই আবেদনের মেয়াদ শেষ হয়ে গেছে অথবা এটি আর সক্রিয় নেই।',
  FORBIDDEN: 'এই আবেদনটি অন্য একজন শিক্ষার্থীর, আপনি এটি পরিবর্তন করতে পারবেন না।',
  CLASS_NOT_FOUND: 'এই ক্লাস টি খুঁজে পাওয়া যায়নি।',
  HOLD_NOT_FOUND: 'এই আবেদনটি খুঁজে পাওয়া যায়নি।',
  VALIDATION_ERROR: 'দেওয়া তথ্য সঠিক নয়। অনুগ্রহ করে আবার দেখে নিন।',
  BAD_REQUEST: 'অনুরোধটি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।',
  INTERNAL_ERROR: 'সার্ভার এ একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
  [NETWORK_ERROR]: 'সার্ভার এর সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।',
}

const fallbackMessage = 'কিছু একটা সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'

// Je kono error ke user er jonno Bangla message e convert kore
export function getErrorMessage(error: unknown): string {
  if (!isApiError(error)) return fallbackMessage

  if (error.code === 'VALIDATION_ERROR') {
    // Field er detail thakle (exp: "totalSeats must be a whole number.") seta o dekhai
    const fieldMessages = Object.values(error.details ?? {}).flat()
    if (fieldMessages.length > 0) return `${messages.VALIDATION_ERROR} (${fieldMessages.join(' ')})`
    // Domain validation e detail e asol karon thake (exp: "Total seats must be greater than 0.")
    if (error.message && error.message !== error.code) {
      return `${messages.VALIDATION_ERROR} (${error.message})`
    }
  }

  if (messages[error.code]) return messages[error.code]
  if (error.status >= 500) return messages.INTERNAL_ERROR
  return fallbackMessage
}
