// Jonmo nibondhon number: thik 17 ta ASCII digit (backend er StudentIdRules er moto)
export const STUDENT_ID_LENGTH = 17

const pattern = /^[0-9]{17}$/

export function isValidStudentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && pattern.test(value)
}

// Onner ID puro na dekhiye mask: prothom 4 + bullet + shesh 4 (exp: 2015•••••••••0001)
export function maskStudentId(value: string): string {
  if (value.length <= 8) return value
  return value.slice(0, 4) + '•'.repeat(value.length - 8) + value.slice(-4)
}
