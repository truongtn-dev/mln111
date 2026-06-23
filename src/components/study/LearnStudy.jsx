import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { shuffle, checkAnswer, getAnswerText, isMultiSelect } from '../../utils'
import { buildLearnQueue, markQuizResult, getStats } from '../../study/progress'
import { loadSession, patchSessionMode, restoreQuestionList, clampIndex } from '../../study/session'
import Footer from '../Footer'

export default function LearnStudy({ questions, progress, onProgress, onBack }) {
  const saved = loadSession().learn

  const [queue] = useState(() => {
    const restored = restoreQuestionList(questions, saved?.questionIds)
    return restored || buildLearnQueue(questions, progress, 25)
  })
  const [index, setIndex] = useState(() => clampIndex(saved?.index, queue.length))
  const [selected, setSelected] = useState(saved?.selected || [])
  const [revealed, setRevealed] = useState(Boolean(saved?.revealed))
  const [session, setSession] = useState(saved?.session || { correct: 0, wrong: 0 })

  const q = queue[index]
  const multi = q ? isMultiSelect(q) : false
  const shuffledOpts = useMemo(
    () => (q ? shuffle(q.options) : []),
    [q?.id]
  )

  const stats = getStats(questions, progress)

  useEffect(() => {
    patchSessionMode('learn', {
      questionIds: queue.map((item) => item.id),
      index,
      selected,
      revealed,
      session,
    })
  }, [queue, index, selected, revealed, session])

  const finalize = (picked) => {
    if (revealed || !q) return
    setSelected(picked)
    setRevealed(true)
    const ok = checkAnswer(q, picked)
    onProgress((prev) => markQuizResult(prev, q.id, ok))
    setSession((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }))
  }

  const handlePick = (key) => {
    if (revealed || !q) return
    if (multi) {
      setSelected((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      )
      return
    }
    finalize([key])
  }

  const handleConfirm = () => {
    if (!multi || selected.length !== q.correctAnswers.length) return
    finalize(selected)
  }

  const next = () => {
    if (index >= queue.length - 1) return
    setIndex((i) => i + 1)
    setSelected([])
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
                {q.type === 'yes_no' ? 'Đ/S' : multi ? `TN · ${q.correctAnswers.length} đáp án` : 'TN'}
              </span>
            </div>
            <p className="question-text">{q.question}</p>
            {multi && !revealed && (
              <p className="multi-select-hint">
                Chọn đủ {q.correctAnswers.length} đáp án rồi bấm Xác nhận ({selected.length}/{q.correctAnswers.length})
              </p>
            )}
            <div className="options-list">
              {shuffledOpts.map((opt) => {
                let cls = 'option-btn'
                if (revealed) {
                  if (q.correctAnswers.includes(opt.key)) cls += ' correct'
                  else if (selected.includes(opt.key)) cls += ' wrong'
                } else if (selected.includes(opt.key)) cls += ' selected'

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
                    {revealed && selected.includes(opt.key) && !q.correctAnswers.includes(opt.key) && (
                      <XCircle size={18} color="#ef476f" />
                    )}
                  </button>
                )
              })}
            </div>
            {!revealed && multi && (
              <div className="actions-center multi-confirm-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selected.length !== q.correctAnswers.length}
                  onClick={handleConfirm}
                >
                  Xác nhận ({selected.length}/{q.correctAnswers.length})
                </button>
              </div>
            )}
            {revealed && (
              <div className={`learn-feedback ${checkAnswer(q, selected) ? 'ok' : 'bad'}`}>
                {checkAnswer(q, selected) ? (
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
