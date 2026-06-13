export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickExamQuestions(all, count = 60) {
  const shuffled = shuffle(all)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function checkAnswer(question, selected) {
  const correct = question.correctAnswers
  if (!selected || selected.length === 0) return false
  if (selected.length !== correct.length) return false
  return selected.every((k) => correct.includes(k))
}

export function isMultiSelect(question) {
  return question.correctAnswers.length > 1
}

export function getOptionLabel(options, key) {
  const opt = options.find((o) => o.key === key)
  return opt ? `${key.toUpperCase()}. ${opt.text}` : key.toUpperCase()
}

export function getAnswerText(question) {
  return question.correctAnswers
    .map((k) => {
      const opt = question.options.find((o) => o.key === k)
      return opt ? `${k.toUpperCase()}. ${opt.text}` : k.toUpperCase()
    })
    .join(' · ')
}

const HISTORY_KEY = 'mln111_exam_history'

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveHistory(entry) {
  const history = loadHistory()
  history.unshift({ ...entry, id: Date.now(), date: new Date().toISOString() })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

export function getBestScore(history) {
  if (!history.length) return null
  return Math.max(...history.map((h) => h.score))
}
