import type { CurricularUnit } from '../data/courses/types'
import { recentAcademicYears } from '../lib/academicYear'
import type { UnitRecord } from '../lib/unitRecord'

interface UnitsTableProps {
  units: CurricularUnit[]
  records: Record<string, UnitRecord>
  currentAcademicYear: string | null
  onChangeRecord: (code: string, patch: Partial<UnitRecord>) => void
}

function groupUnits(units: CurricularUnit[]) {
  const years = new Map<number, Map<number, CurricularUnit[]>>()
  for (const unit of units) {
    if (!years.has(unit.year)) years.set(unit.year, new Map())
    const semesters = years.get(unit.year)!
    if (!semesters.has(unit.semester)) semesters.set(unit.semester, [])
    semesters.get(unit.semester)!.push(unit)
  }
  return [...years.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, semesters]) => ({
      year,
      semesters: [...semesters.entries()].sort(([a], [b]) => a - b),
    }))
}

export function UnitsTable({ units, records, currentAcademicYear, onChangeRecord }: UnitsTableProps) {
  const grouped = groupUnits(units)
  const yearOptions = currentAcademicYear ? recentAcademicYears(currentAcademicYear, 8) : []

  return (
    <div className="space-y-6">
      {grouped.map(({ year, semesters }) => (
        <div key={year}>
          <h3 className="mb-2 font-display text-sm font-semibold tracking-wide text-primary">
            {year}º Ano
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {semesters.map(([semester, semesterUnits]) => (
              <div
                key={semester}
                className="rounded-2xl border border-primary/20 bg-white/70 p-3 dark:border-primary-light/20 dark:bg-stone-800/50"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                  {semester}º Semestre
                </p>
                <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                  {semesterUnits.map((unit) => {
                    const record = records[unit.code]
                    const grade = record?.grade ?? null
                    const failed = grade !== null && grade < 10
                    const approved = grade !== null && grade >= 10
                    return (
                      <li key={unit.code} className="flex flex-wrap items-center gap-2 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-stone-700 dark:text-stone-200">{unit.name}</p>
                          <p className="text-xs text-stone-400">{unit.ects} ECTS</p>
                        </div>
                        {failed && (
                          <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[11px] font-medium text-bad">
                            reprovado
                          </span>
                        )}
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={20}
                          step={1}
                          placeholder="—"
                          value={grade ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === '') {
                              onChangeRecord(unit.code, { grade: null })
                              return
                            }
                            const n = Number(raw)
                            onChangeRecord(unit.code, { grade: Number.isNaN(n) ? null : n })
                          }}
                          className="w-16 rounded-lg border border-primary/20 bg-white px-2 py-1 text-right text-sm
                            outline-none focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
                        />
                        {approved && (
                          <div className="flex w-full flex-wrap items-center gap-2 pl-0 text-xs text-stone-500 dark:text-stone-400">
                            <label className="flex items-center gap-1">
                              ano letivo:
                              <select
                                value={record?.academicYear ?? ''}
                                onChange={(e) =>
                                  onChangeRecord(unit.code, { academicYear: e.target.value || null })
                                }
                                className="rounded-md border border-primary/20 bg-white px-1.5 py-0.5 text-xs
                                  outline-none focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
                              >
                                <option value="">— por definir —</option>
                                {yearOptions.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={record?.alreadyImproved ?? false}
                                onChange={(e) =>
                                  onChangeRecord(unit.code, { alreadyImproved: e.target.checked })
                                }
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              já fui a melhoria
                            </label>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
