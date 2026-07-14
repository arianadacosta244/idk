export interface UnitRecord {
  code: string
  grade: number | null
  /** "2024/2025"; null enquanto o aluno não indicar quando fez a UC. */
  academicYear: string | null
  alreadyImproved: boolean
}

export function emptyUnitRecord(code: string): UnitRecord {
  return { code, grade: null, academicYear: null, alreadyImproved: false }
}
