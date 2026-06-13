import { useState, useEffect, useRef } from 'react'
import { Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { pickExamQuestions, formatTime, checkAnswer, shuffle } from '../utils'

const EXAM_DURATION = 90 * 60
const EXAM_COUNT = 60

function computeResult(questions, answers, timeUsed) {
  const details = questions.map((question) => {
    const userAnswer = answers[question.id] || []
    const isCorrect = checkAnswer(question, userAnswer)
    return { question, userAnswer, isCorrect }
  })
  const correct = details.filter((d) => d.isCorrect).length
  const total = questions.length
  return {
    correct,
    total,
    score: Math.round((correct / total) * 100),
    timeUsed,
    details,
  }
}

export default function Exam({ allQuestions, onFinish, onBack }) {
  const [questions] = useState(() =>
    pickExamQuestions(allQuestions, EXAM_COUNT).map((q) => ({
      ...q,
      options: shuffle(q.options),
    }))
  )
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const submitted = useRef(false)
  const answersRef = useRef(answers)
  answersRef.current = answers

  const q = questions[current]
  const selected = answers[q?.id] || []

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          if (!submitted.current) {
            submitted.current = true
            onFinish(computeResult(questions, answersRef.current, EXAM_DURATION))
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [questions, onFinish])

  const handleSelect = (key) => {
    setAnswers((prev) => {
      const cur = prev[q.id] || []
      if (q.type === 'yes_no' || q.correctAnswers.length === 1) {
        return { ...prev, [q.id]: [key] }
      }
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
      return { ...prev, [q.id]: next }
    })
  }

  const handleSubmit = () => {
    if (submitted.current) return
    if (!window.confirm('Nộp bài thi? Bạn sẽ không thể sửa sau khi nộp.')) return
    submitted.current = true
    onFinish(computeResult(questions, answers, EXAM_DURATION - timeLeft))
  }

  const timerClass = timeLeft <= 300 ? 'timer danger' : timeLeft <= 600 ? 'timer warning' : 'timer'
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.length > 0).length

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>← Thoát</button>
        <span className="screen-title">Thi thử · {questions.length} câu</span>
        <div className={timerClass}>
          <Clock size={16} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
      </div>

      <div className="question-card">
        <div className="question-meta">
          <span className={`q-badge ${q.type === 'yes_no' ? 'yn' : 'mc'}`}>
            {q.type === 'yes_no' ? 'Đúng / Sai' : q.correctAnswers.length > 1 ? `Trắc nghiệm · ${q.correctAnswers.length} đáp án` : 'Trắc nghiệm'}
          </span>
          <span className="q-number">Câu {current + 1} / {questions.length}</span>
        </div>
        <p className="question-text">{q.question}</p>
        {q.correctAnswers.length > 1 && (
          <p className="multi-select-hint">
            Chọn {q.correctAnswers.length} đáp án · Đã chọn {selected.length}/{q.correctAnswers.length}
          </p>
        )}
        <div className="options-list">
          {q.options.map((opt) => (
            <button
              key={opt.key}
              className={`option-btn ${selected.includes(opt.key) ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.key)}
            >
              <span className="option-key">{opt.key}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="question-dots">
        {questions.map((item, i) => (
          <button
            key={item.id}
            className={`dot ${i === current ? 'active' : ''} ${answers[item.id]?.length ? 'answered' : ''}`}
            onClick={() => setCurrent(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="nav-row">
        <button className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          <ChevronLeft size={18} /> Trước
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Đã trả lời: {answeredCount}/{questions.length}
        </span>
        {current < questions.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setCurrent((c) => c + 1)}>
            Tiếp <ChevronRight size={18} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Send size={16} /> Nộp bài
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={handleSubmit}>
          <Send size={16} /> Nộp bài sớm
        </button>
      </div>
    </>
  )
}
