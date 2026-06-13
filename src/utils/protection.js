let active = false

const BLOCK_KEYS = new Set([
  'F12', 'F11', 'F7',
])

function onKeyDown(e) {
  if (!active) return

  if (e.key === 'F12' || BLOCK_KEYS.has(e.key)) {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    if (['u', 's', 'p', 'a', 'c', 'v', 'i', 'j', 'k'].includes(k)) {
      if (k !== 'c' && k !== 'v' && k !== 'a') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }
    if (e.shiftKey && ['i', 'j', 'c'].includes(k)) {
      e.preventDefault()
      return false
    }
  }
}

export function enableProtection() {
  if (active) return
  active = true
  document.body.classList.add('protected')
  document.addEventListener('keydown', onKeyDown, true)
}

export function disableProtection() {
  active = false
  document.body.classList.remove('protected')
  document.removeEventListener('keydown', onKeyDown, true)
}
