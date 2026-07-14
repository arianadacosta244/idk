import { useEffect, useMemo, useRef, useState } from 'react'
import type { Course } from '../data/courses/types'

interface CourseSelectorProps {
  courses: Course[]
  selected: Course | null
  onSelect: (course: Course) => void
}

export function CourseSelector({ courses, selected, onSelect }: CourseSelectorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q),
    )
  }, [courses, query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function choose(course: Course) {
    onSelect(course)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const course = results[highlight]
      if (course) choose(course)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        placeholder="Pesquisar curso… (ex: Informática)"
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          setHighlight(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm text-stone-800
          shadow-sm outline-none placeholder:text-stone-400 focus:border-primary
          dark:border-primary-light/20 dark:bg-stone-800 dark:text-stone-100"
      />
      {open && (
        <ul
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-primary/20
            bg-white py-1 shadow-lg dark:border-primary-light/20 dark:bg-stone-800"
        >
          {results.length === 0 && (
            <li className="px-4 py-2 text-sm text-stone-400">Nenhum curso encontrado.</li>
          )}
          {results.map((course, i) => (
            <li key={course.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(course)}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  i === highlight
                    ? 'bg-primary-soft text-primary'
                    : 'text-stone-700 dark:text-stone-200'
                }`}
              >
                <span className="font-medium">{course.shortName}</span>
                <span className="ml-2 text-stone-400">{course.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
