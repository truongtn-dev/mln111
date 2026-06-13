import { useState, useMemo } from 'react'
import { ChevronLeft, CheckCircle, Trophy } from 'lucide-react'
import { shuffle, checkAnswer, getAnswerText } from '../../utils'
import { buildLearnQueue, markQuizResult, getStats, loadProgress } from '../../study/progress'
import Footer from '../Footer'

const QUIZ_SIZE = 10

export default function QuizStudy({ questions, progress, onProgress, onBack }) {
  const [quiz] = useState(() => buildLearnQueue(questions, progress, QUIZ_SIZE))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [finished, setFinished] = useState(false)

  const q = quiz[index]
  const shuffledOpts = useMemo(() => (q ? shuffle(q.options) : []), [q?.id])

  const handlePick = (key) => {
    if (answers[q.id] !== undefined) return
    const next = { ...answers, [q.id]: key }
    setAnswers(next)
    const ok = checkAnswer(q, [key])
    onProgress((prev) => markQuizResult(prev, q.id, ok))

    if (index >= quiz.length - 1) {
      setTimeout(() => setFinished(true), 400)
    } else {
      setTimeout(() => setIndex((i) => i + 1), 500)
    }
  }

  const results = useMemo(() => {
    let correct = 0
    quiz.forEach((item) => {
      if (checkAnswer(item, [answers[item.id]])) correct++
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
              const ok = checkAnswer(item, [answers[item.id]])
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
        <div className="options-list">
          {shuffledOpts.map((opt) => {
            let cls = 'option-btn'
            if (picked !== undefined) {
              if (q.correctAnswers.includes(opt.key)) cls += ' correct'
              else if (picked === opt.key) cls += ' wrong'
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
      </div>

      <Footer />
    </>
  )
}
