// Jonmo nibondhon number: thik 17 ta ASCII digit (backend er StudentIdRules er moto)
export const STUDENT_ID_LENGTH = 17

const pattern = /^[0-9]{17}$/

export function isValidStudentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && pattern.test(value)
}
