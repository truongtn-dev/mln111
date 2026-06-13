import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Shuffle, ThumbsDown, ThumbsUp, RotateCcw } from 'lucide-react'
import { shuffle, getAnswerText } from '../../utils'
import { markKnown, markUnknown, getCardProgress, statusLabel, STATUS } from '../../study/progress'
import Footer from '../Footer'

export default function FlashcardStudy({ questions, progress, onProgress, onBack }) {
  const [deck, setDeck] = useState(() => shuffle(questions))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionKnown, setSessionKnown] = useState(0)

  const q = deck[index]
  const cardProg = q ? getCardProgress(progress, q.id) : null

  const masteredInDeck = useMemo(
    () => deck.filter((d) => getCardProgress(progress, d.id).status === STATUS.MASTERED).length,
    [deck, progress]
  )

  const go = useCallback((dir) => {
    setFlipped(false)
    setIndex((i) => {
      const next = i + dir
      if (next < 0) return deck.length - 1
      if (next >= deck.length) return 0
      return next
    })
  }, [deck.length])

  useEffect(() => {
    const handler = (e) => {
      if (!flipped && e.key === ' ') { e.preventDefault(); setFlipped(true); return }
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, flipped])

  const handleKnow = () => {
    onProgress((prev) => markKnown(prev, q.id))
    setSessionKnown((s) => s + 1)
    setFlipped(false)
    go(1)
  }

  const handleDontKnow = () => {
    onProgress((prev) => markUnknown(prev, q.id))
    setFlipped(false)
    go(1)
  }

  const reshuffle = () => {
    setDeck(shuffle(questions))
    setIndex(0)
    setFlipped(false)
  }

  if (!q) {
    return (
      <div className="study-empty">
        <p>Không có câu hỏi trong bộ lọc này.</p>
        <button className="btn btn-primary" onClick={onBack}>Quay lại</button>
      </div>
    )
  }

  const answerText = getAnswerText(q)

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Hub</button>
        <span className="screen-title">Thẻ ghi nhớ</span>
        <button className="btn btn-ghost" onClick={reshuffle}><Shuffle size={16} /> Trộn</button>
      </div>

      <div className="study-session-bar">
        <div className="study-session-stat">
          <span className="lbl">Tiến độ bộ</span>
          <span className="val">{masteredInDeck}/{deck.length} thuộc</span>
        </div>
        <div className="study-session-stat">
          <span className="lbl">Phiên này</span>
          <span className="val">{sessionKnown} đã thuộc</span>
        </div>
        <div className="study-session-stat">
          <span className="lbl">Thẻ hiện tại</span>
          <span className={`val status-${cardProg.status}`}>{statusLabel(cardProg.status)}</span>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${((index + 1) / deck.length) * 100}%` }} />
      </div>
      <p className="study-counter">Câu {index + 1} / {deck.length}</p>

      <div className="flashcard-container flashcard-container-lg">
        <div
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => !flipped && setFlipped(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !flipped && setFlipped(true)}
        >
          <div className="flashcard-face front">
            <div className="flashcard-label">
              {q.type === 'yes_no' ? 'Đúng / Sai' : 'Trắc nghiệm'}
            </div>
            <div className="flashcard-content flashcard-q">{q.question}</div>
            {!flipped && (
              <div className="flashcard-tap-hint">
                <RotateCcw size={14} /> Nhấn để lật thẻ
              </div>
            )}
            {q.type === 'multiple_choice' && (
              <div className="flashcard-options-preview">
                {q.options.map((o) => (
                  <div key={o.key} className="flashcard-opt-line">
                    <span className="key">{o.key.toUpperCase()}</span>
                    <span>{o.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flashcard-face back">
            <div className="flashcard-label success">Đáp án đúng</div>
            <div className="flashcard-content">
              {q.correctAnswers.map((k) => (
                <div key={k} className="answer-highlight">
                  <div className="key">{k.toUpperCase()}</div>
                  <div>{answerText}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="flashcard-grade-row">
          <button className="btn-grade dont-know" onClick={handleDontKnow}>
            <ThumbsDown size={20} />
            <span>Chưa thuộc</span>
            <small>Sẽ ôn lại sớm</small>
          </button>
          <button className="btn-grade know" onClick={handleKnow}>
            <ThumbsUp size={20} />
            <span>Đã thuộc</span>
            <small>Tăng % tiến độ</small>
          </button>
        </div>
      ) : (
        <p className="flash-hint">Space để lật · ← → chuyển câu (không lưu tiến độ)</p>
      )}

      <div className="nav-row" style={{ marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={() => go(-1)}>
          <ChevronLeft size={18} /> Trước
        </button>
        <button className="btn btn-primary" onClick={() => go(1)}>
          Tiếp <ChevronRight size={18} />
        </button>
      </div>

      <Footer />
    </>
  )
}
