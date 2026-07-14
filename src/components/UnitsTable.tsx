import type { CurricularUnit } from '../data/courses/types'

interface UnitsTableProps {
  units: CurricularUnit[]
  grades: Record<string, number | null>
  onChangeGrade: (code: string, grade: number | null) => void
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

export function UnitsTable({ units, grades, onChangeGrade }: UnitsTableProps) {
  const grouped = groupUnits(units)

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
                    const grade = grades[unit.code] ?? null
                    const failed = grade !== null && grade < 10
                    return (
                      <li key={unit.code} className="flex items-center gap-3 py-1.5">
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
                              onChangeGrade(unit.code, null)
                              return
                            }
                            const n = Number(raw)
                            onChangeGrade(unit.code, Number.isNaN(n) ? null : n)
                          }}
                          className="w-16 rounded-lg border border-primary/20 bg-white px-2 py-1 text-right text-sm
                            outline-none focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
                        />
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
