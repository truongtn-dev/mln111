import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, CheckCircle, Trophy } from 'lucide-react'
import { shuffle, checkAnswer, getAnswerText, isMultiSelect } from '../../utils'
import { buildLearnQueue, markQuizResult, getStats, loadProgress } from '../../study/progress'
import { loadSession, patchSessionMode, restoreQuestionList, clampIndex } from '../../study/session'
import Footer from '../Footer'

const QUIZ_SIZE = 10

export default function QuizStudy({ questions, progress, onProgress, onBack }) {
  const saved = loadSession().quiz

  const [quiz] = useState(() => {
    const restored = restoreQuestionList(questions, saved?.questionIds)
    return restored || buildLearnQueue(questions, progress, QUIZ_SIZE)
  })
  const [index, setIndex] = useState(() => clampIndex(saved?.index, quiz.length))
  const [answers, setAnswers] = useState(saved?.answers || {})
  const [pending, setPending] = useState(saved?.pending || [])
  const [finished, setFinished] = useState(Boolean(saved?.finished))

  const q = quiz[index]
  const multi = q ? isMultiSelect(q) : false
  const shuffledOpts = useMemo(() => (q ? shuffle(q.options) : []), [q?.id])

  useEffect(() => {
    patchSessionMode('quiz', {
      questionIds: quiz.map((item) => item.id),
      index,
      answers,
      pending,
      finished,
    })
  }, [quiz, index, answers, pending, finished])

  const finalize = (picked) => {
    const next = { ...answers, [q.id]: picked }
    setAnswers(next)
    const ok = checkAnswer(q, picked)
    onProgress((prev) => markQuizResult(prev, q.id, ok))
    setPending([])

    if (index >= quiz.length - 1) {
      setFinished(true)
    } else {
      setTimeout(() => setIndex((i) => i + 1), 500)
    }
  }

  const handlePick = (key) => {
    if (answers[q.id] !== undefined || finished) return
    if (multi) {
      setPending((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      )
      return
    }
    finalize([key])
  }

  const handleConfirm = () => {
    if (!multi || pending.length !== q.correctAnswers.length) return
    finalize(pending)
  }

  const results = useMemo(() => {
    let correct = 0
    quiz.forEach((item) => {
      if (checkAnswer(item, answers[item.id])) correct++
    })
    return { correct, total: quiz.length, pct: Math.round((correct / quiz.length) * 100) }
  }, [quiz, answers, finished])

  const stats = getStats(questions, loadProgress())

  if (finished) {
    return (
      <>
        <div className="screen-header">
          <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Hub</button>
          <span className="screen-title">Kết quả kiểm tra</span>
        </div>
        <div className="card quiz-result-card">
          <Trophy size={44} color="#ffd166" />
          <div className="score-circle" style={{ '--pct': results.pct }}>
            <span>{results.pct}%</span>
          </div>
          <h2>{results.correct}/{results.total} câu đúng</h2>
          <p>Tiến độ học: <strong>{stats.pct}%</strong> đã thuộc ({stats.mastered}/{stats.total})</p>
          <div className="quiz-review-list">
            {quiz.map((item, i) => {
              const ok = checkAnswer(item, answers[item.id])
              return (
                <div key={item.id} className={`review-item ${ok ? 'correct' : 'wrong'}`}>
                  <div className="review-q">{i + 1}. {item.question}</div>
                  <div className="review-ans">
                    {ok ? '✓ ' : '✗ '}
                    {ok ? 'Đúng' : `Sai — ${getAnswerText(item)}`}
                  </div>
                </div>
              )
            })}
          </div>
          <button className="btn btn-primary" onClick={onBack}>Về Hub học</button>
        </div>
        <Footer />
      </>
    )
  }

  const picked = answers[q?.id]

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Hub</button>
        <span className="screen-title">Kiểm tra nhanh</span>
        <span className="learn-score">{index + 1}/{quiz.length}</span>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((index + 1) / quiz.length) * 100}%` }} />
      </div>

      <div className="question-card">
        <p className="question-text">{q.question}</p>
        {multi && picked === undefined && (
          <p className="multi-select-hint">
            Chọn đủ {q.correctAnswers.length} đáp án rồi bấm Xác nhận ({pending.length}/{q.correctAnswers.length})
          </p>
        )}
        <div className="options-list">
          {shuffledOpts.map((opt) => {
            let cls = 'option-btn'
            if (picked !== undefined) {
              if (q.correctAnswers.includes(opt.key)) cls += ' correct'
              else if (picked.includes(opt.key)) cls += ' wrong'
            } else if (pending.includes(opt.key)) {
              cls += ' selected'
            }
            return (
              <button
                key={opt.key}
                className={cls}
                disabled={picked !== undefined}
                onClick={() => handlePick(opt.key)}
              >
                <span className="option-key">{opt.key}</span>
                <span className="option-text">{opt.text}</span>
                {picked !== undefined && q.correctAnswers.includes(opt.key) && (
                  <CheckCircle size={18} color="#06d6a0" />
                )}
              </button>
            )
          })}
        </div>
        {multi && picked === undefined && (
          <div className="actions-center multi-confirm-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending.length !== q.correctAnswers.length}
              onClick={handleConfirm}
            >
              Xác nhận ({pending.length}/{q.correctAnswers.length})
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
