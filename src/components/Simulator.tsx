import { useMemo } from 'react'
import type { CurricularUnit } from '../data/courses/types'
import { type GradedUnit, simulateTarget, sortByImpact } from '../lib/gpa'

interface SimulatorProps {
  completed: GradedUnit[]
  remainingUnits: CurricularUnit[]
  target: number
  onChangeTarget: (value: number) => void
  fixedGrades: Record<string, number | null>
  onChangeFixed: (code: string, grade: number | null) => void
}

export function Simulator({
  completed,
  remainingUnits,
  target,
  onChangeTarget,
  fixedGrades,
  onChangeFixed,
}: SimulatorProps) {
  const sorted = useMemo(() => sortByImpact(remainingUnits), [remainingUnits])

  const result = useMemo(
    () =>
      simulateTarget({
        target,
        completed,
        remaining: sorted.map((u) => ({ ects: u.ects, fixedGrade: fixedGrades[u.code] ?? null })),
      }),
    [target, completed, sorted, fixedGrades],
  )

  if (remainingUnits.length === 0) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-white/70 p-4 text-sm text-stone-500 dark:border-primary-light/20 dark:bg-stone-800/50">
        Já preencheste a nota de todas as UCs — não há mais nada para simular. 🎉
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Quero que a média final fique em</span>
        <input
          type="number"
          step={0.1}
          min={0}
          max={20}
          value={target}
          onChange={(e) => onChangeTarget(Number(e.target.value))}
          className="w-20 rounded-lg border border-primary/20 bg-white px-2 py-1 text-center font-semibold
            outline-none focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
        />
        <span>valores.</span>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-white/70 dark:border-primary-light/20 dark:bg-stone-800/50">
        <p className="border-b border-stone-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-400 dark:border-primary-light/20">
          UCs por fazer, ordenadas por impacto (ECTS)
        </p>
        <ul className="divide-y divide-stone-100 dark:divide-stone-700">
          {sorted.map((unit) => {
            const fixed = fixedGrades[unit.code] ?? null
            return (
              <li key={unit.code} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-stone-700 dark:text-stone-200">{unit.name}</p>
                  <p className="text-xs text-stone-400">{unit.ects} ECTS</p>
                </div>
                {fixed === null && result.requiredGradeRounded !== null && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                    precisas de {result.requiredGradeRounded}
                  </span>
                )}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  step={1}
                  placeholder="hipótese"
                  value={fixed ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      onChangeFixed(unit.code, null)
                      return
                    }
                    const n = Number(raw)
                    onChangeFixed(unit.code, Number.isNaN(n) ? null : n)
                  }}
                  className="w-20 rounded-lg border border-primary/20 bg-white px-2 py-1 text-right text-sm
                    outline-none placeholder:text-xs focus:border-primary dark:border-primary-light/25 dark:bg-stone-900"
                />
              </li>
            )
          })}
        </ul>
      </div>

      <div
        className={`flex flex-wrap items-center gap-4 rounded-2xl p-4 ${
          result.possible ? 'bg-good-soft' : 'bg-bad-soft'
        }`}
      >
        <div
          className={`font-display text-3xl font-bold ${result.possible ? 'text-good' : 'text-bad'}`}
        >
          {result.requiredGradeRounded ?? (result.requiredGrade !== null ? '20+' : '—')}
        </div>
        <p className="max-w-md text-sm text-stone-700 dark:text-stone-200">{result.message}</p>
      </div>
    </div>
  )
}
