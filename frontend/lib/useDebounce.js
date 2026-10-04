import { useEffect, useState } from 'react'

// Returns a copy of `value` that only updates `delay` ms after it stops changing.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id) // cancel the pending update if value changes again
  }, [value, delay])
  return debounced
}