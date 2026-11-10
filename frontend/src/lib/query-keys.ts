// Sob query key ekjaygay. Prefix diye invalidate kora jay:
// exp: invalidate(['classes']) dile list ar sob detail eksathe refresh hobe
export const queryKeys = {
  classes: {
    all: ['classes'] as const,
    list: () => ['classes', 'list'] as const,
    detail: (classId: string) => ['classes', 'detail', classId] as const,
  },
  holds: {
    all: ['holds'] as const,
    detail: (holdId: string) => ['holds', 'detail', holdId] as const,
    mine: (studentId: string) => ['holds', 'mine', studentId] as const,
  },
}
