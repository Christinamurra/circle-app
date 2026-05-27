export function load(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val !== null ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function remove(key) {
  localStorage.removeItem(key)
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}
