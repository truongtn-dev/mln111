import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { shuffle, checkAnswer, getAnswerText } from '../../utils'
import { buildLearnQueue, markQuizResult, getStats } from '../../study/progress'
import Footer from '../Footer'

export default function LearnStudy({ questions, progress, onProgress, onBack }) {
  const [queue] = useState(() => buildLearnQueue(questions, progress, 25))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [session, setSession] = useState({ correct: 0, wrong: 0 })

  const q = queue[index]
  const shuffledOpts = useMemo(
    () => (q ? shuffle(q.options) : []),
    [q?.id]
  )

  const stats = getStats(questions, progress)

  const handlePick = (key) => {
    if (revealed || !q) return
    setSelected(key)
    setRevealed(true)
    const ok = checkAnswer(q, [key])
    onProgress((prev) => markQuizResult(prev, q.id, ok))
    setSession((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }))
  }

  const next = () => {
    if (index >= queue.length - 1) return
    setIndex((i) => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (!q) {
    return (
      <div className="study-empty">
        <p>Không có câu để học.</p>
        <button className="btn btn-primary" onClick={onBack}>Quay lại</button>
      </div>
    )
  }

  const isLast = index >= queue.length - 1
  const done = revealed && isLast

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Hub</button>
        <span className="screen-title">Chế độ Học</span>
        <span className="learn-score">{session.correct}/{session.correct + session.wrong} đúng</span>
      </div>

      <div className="learn-progress-header">
        <div className="learn-mini-ring" style={{ '--pct': stats.pct }}>
          <span>{stats.pct}%</span>
        </div>
        <div>
          <p className="learn-progress-title">Tiến độ tổng: {stats.mastered}/{stats.total} đã thuộc</p>
          <p className="learn-progress-sub">Câu {index + 1}/{queue.length} · Ưu tiên câu mới & cần ôn</p>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((index + (revealed ? 1 : 0)) / queue.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="card learn-done-card">
          <CheckCircle size={48} color="#06d6a0" />
          <h2>Hoàn thành phiên học!</h2>
          <p>Đúng {session.correct} · Sai {session.wrong}</p>
          <p className="learn-done-pct">Tiến độ mới: <strong>{getStats(questions, progress).pct}%</strong> đã thuộc</p>
          <button className="btn btn-primary" onClick={onBack}>Về Hub học</button>
        </div>
      ) : (
        <>
          <div className="question-card learn-card">
            <div className="question-meta">
              <span className={`q-badge ${q.type === 'yes_no' ? 'yn' : 'mc'}`}>
                {q.type === 'yes_no' ? 'Đ/S' : 'TN'}
              </span>
            </div>
            <p className="question-text">{q.question}</p>
            <div className="options-list">
              {shuffledOpts.map((opt) => {
                let cls = 'option-btn'
                if (revealed) {
                  if (q.correctAnswers.includes(opt.key)) cls += ' correct'
                  else if (selected === opt.key) cls += ' wrong'
                } else if (selected === opt.key) cls += ' selected'

                return (
                  <button
                    key={opt.key}
                    className={cls}
                    disabled={revealed}
                    onClick={() => handlePick(opt.key)}
                  >
                    <span className="option-key">{opt.key}</span>
                    <span className="option-text">{opt.text}</span>
                    {revealed && q.correctAnswers.includes(opt.key) && <CheckCircle size={18} color="#06d6a0" />}
                    {revealed && selected === opt.key && !q.correctAnswers.includes(opt.key) && (
                      <XCircle size={18} color="#ef476f" />
                    )}
                  </button>
                )
              })}
            </div>
            {revealed && (
              <div className={`learn-feedback ${checkAnswer(q, [selected]) ? 'ok' : 'bad'}`}>
                {checkAnswer(q, [selected]) ? (
                  <><CheckCircle size={18} /> Chính xác! Streak tăng.</>
                ) : (
                  <><XCircle size={18} /> Sai rồi — đáp án: <strong>{getAnswerText(q)}</strong></>
                )}
              </div>
            )}
          </div>

          {revealed && !isLast && (
            <div className="actions-center">
              <button className="btn btn-primary" onClick={next}>
                Câu tiếp <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <Footer />
    </>
  )
}
