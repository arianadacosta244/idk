import { useCallback, useEffect, useRef, useState } from 'react'

function readValue<T>(key: string, initialValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : initialValue
  } catch {
    return initialValue
  }
}

/**
 * Estado sincronizado com localStorage. Se `key` mudar (ex: trocar de curso),
 * o valor é recarregado da nova chave em vez de continuar com o estado antigo.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readValue(key, initialValue))
  const keyRef = useRef(key)

  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key
      setValue(readValue(key, initialValue))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setAndStore = useCallback((updater: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(next))
      } catch {
        /* localStorage indisponível (modo privado, quota, etc.) — ignora */
      }
      return next
    })
  }, [])

  return [value, setAndStore] as const
}
