import { BANK_ID, getSavedBankId, setSavedBankId } from './session'

const PROGRESS_KEY = 'mln111_study_progress'

export const STATUS = { NEW: 'new', LEARNING: 'learning', MASTERED: 'mastered' }

function empty() {
  return { status: STATUS.NEW, correct: 0, wrong: 0, streak: 0, lastReview: null, nextReview: null }
}

export function loadProgress() {
  try {
    const bank = getSavedBankId()
    if (bank && bank !== BANK_ID) {
      return {}
    }
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveProgress(data) {
  setSavedBankId(BANK_ID)
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data))
}

/** Đồng bộ tiến độ khi tab khác / F5 cập nhật localStorage */
export function subscribeProgress(onChange) {
  const handler = (e) => {
    if (e.key === PROGRESS_KEY || e.key === null) onChange(loadProgress())
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function getCardProgress(progress, id) {
  return progress[id] || empty()
}

export function markKnown(progress, id) {
  const p = { ...getCardProgress(progress, id) }
  p.correct += 1
  p.streak += 1
  p.lastReview = Date.now()
  if (p.streak >= 2 && p.wrong <= p.correct) {
    p.status = STATUS.MASTERED
    p.nextReview = Date.now() + 3 * 24 * 60 * 60 * 1000
  } else {
    p.status = STATUS.LEARNING
    p.nextReview = Date.now() + 24 * 60 * 60 * 1000
  }
  const next = { ...progress, [id]: p }
  saveProgress(next)
  return next
}

export function markUnknown(progress, id) {
  const p = { ...getCardProgress(progress, id) }
  p.wrong += 1
  p.streak = 0
  p.status = STATUS.LEARNING
  p.lastReview = Date.now()
  p.nextReview = Date.now() + 10 * 60 * 1000
  const next = { ...progress, [id]: p }
  saveProgress(next)
  return next
}

export function markQuizResult(progress, id, isCorrect) {
  return isCorrect ? markKnown(progress, id) : markUnknown(progress, id)
}

export function getStats(questions, progress) {
  let mastered = 0
  let learning = 0
  let fresh = 0
  let dueReview = 0
  const now = Date.now()

  for (const q of questions) {
    const p = getCardProgress(progress, q.id)
    if (p.status === STATUS.MASTERED) mastered++
    else if (p.status === STATUS.LEARNING) learning++
    else fresh++
    if (p.nextReview && p.nextReview <= now && p.status !== STATUS.NEW) dueReview++
  }

  const total = questions.length
  const pct = total ? Math.round((mastered / total) * 100) : 0

  return { total, mastered, learning, fresh, dueReview, pct }
}

export function filterQuestions(questions, progress, filter) {
  const now = Date.now()
  switch (filter) {
    case 'new':
      return questions.filter((q) => getCardProgress(progress, q.id).status === STATUS.NEW)
    case 'learning':
      return questions.filter((q) => getCardProgress(progress, q.id).status === STATUS.LEARNING)
    case 'mastered':
      return questions.filter((q) => getCardProgress(progress, q.id).status === STATUS.MASTERED)
    case 'review':
      return questions.filter((q) => {
        const p = getCardProgress(progress, q.id)
        return p.nextReview && p.nextReview <= now && p.status !== STATUS.NEW
      })
    case 'unlearned':
      return questions.filter((q) => getCardProgress(progress, q.id).status !== STATUS.MASTERED)
    default:
      return questions
  }
}

/** Prioritize cards for active recall (Quizlet Learn style). */
export function buildLearnQueue(questions, progress, limit = 20) {
  const now = Date.now()
  const scored = questions.map((q) => {
    const p = getCardProgress(progress, q.id)
    let score = 0
    if (p.status === STATUS.NEW) score += 100
    if (p.status === STATUS.LEARNING) score += 80
    if (p.nextReview && p.nextReview <= now) score += 120
    if (p.wrong > p.correct) score += 40
    score += Math.random() * 15
    return { q, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.q)
}

export function resetProgress() {
  saveProgress({})
  return {}
}

export function mergeProgress(updater) {
  const next = typeof updater === 'function' ? updater(loadProgress()) : updater
  saveProgress(next)
  return next
}

export function statusLabel(status) {
  if (status === STATUS.MASTERED) return 'Đã thuộc'
  if (status === STATUS.LEARNING) return 'Đang học'
  return 'Chưa học'
}

export function statusColor(status) {
  if (status === STATUS.MASTERED) return 'var(--success)'
  if (status === STATUS.LEARNING) return 'var(--accent)'
  return 'var(--text-muted)'
}
