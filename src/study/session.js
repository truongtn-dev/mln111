const SESSION_KEY = 'mln111_study_session'
const BANK_KEY = 'mln111_study_bank'

export const BANK_ID = 'mln111_quizlet_571'

const DEFAULT_SESSION = {
  screen: 'home',
  hub: { mode: null, filter: 'all' },
  flashcard: null,
  learn: null,
  quiz: null,
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return { ...DEFAULT_SESSION }
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SESSION }
  }
}

export function saveSession(patch) {
  const next = { ...loadSession(), ...patch, updatedAt: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function patchSessionMode(mode, data) {
  return saveSession({ [mode]: data })
}

export function clearStudySession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSavedBankId() {
  return localStorage.getItem(BANK_KEY)
}

export function setSavedBankId(id) {
  localStorage.setItem(BANK_KEY, id)
}

/** Khôi phục danh sách câu hỏi từ id đã lưu */
export function restoreQuestionList(questions, savedIds) {
  if (!Array.isArray(savedIds) || !savedIds.length) return null
  const map = new Map(questions.map((q) => [q.id, q]))
  const restored = savedIds.map((id) => map.get(id)).filter(Boolean)
  if (!restored.length) return null
  return restored
}

export function clampIndex(index, length) {
  if (!length) return 0
  const n = Number(index)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, length - 1)
}
