import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, Timer, Trophy, RotateCcw } from 'lucide-react'
import { shuffle, getAnswerText } from '../../utils'
import { markKnown, markUnknown } from '../../study/progress'
import Footer from '../Footer'

const PAIRS = 4

function truncate(text, max = 70) {
  if (text.length <= max) return text
  return text.slice(0, max).trim() + '…'
}

export default function MatchStudy({ questions, progress, onProgress, onBack }) {
  const [round, setRound] = useState(1)

  const roundQuestions = useMemo(
    () => shuffle(questions).slice(0, PAIRS),
    [questions, round]
  )

  const tiles = useMemo(() => {
    const qs = roundQuestions.map((q, i) => ({
      id: `q-${i}`,
      qid: q.id,
      type: 'question',
      text: truncate(q.question),
      full: q,
    }))
    const ans = roundQuestions.map((q, i) => ({
      id: `a-${i}`,
      qid: q.id,
      type: 'answer',
      text: truncate(getAnswerText(q), 55),
      full: q,
    }))
    return shuffle([...qs, ...ans])
  }, [roundQuestions, round])

  const [selected, setSelected] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrongFlash, setWrongFlash] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [won, setWon] = useState(false)

  useEffect(() => {
    if (won) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [won])

  const handleTile = useCallback((tile) => {
    if (matched.has(tile.id) || wrongFlash) return

    if (!selected) {
      setSelected(tile)
      return
    }

    if (selected.id === tile.id) {
      setSelected(null)
      return
    }

    if (selected.type === tile.type) {
      setSelected(tile)
      return
    }

    const qTile = selected.type === 'question' ? selected : tile
    const aTile = selected.type === 'answer' ? selected : tile

    if (qTile.qid === aTile.qid) {
      const next = new Set(matched)
      next.add(qTile.id)
      next.add(aTile.id)
      setMatched(next)
      setSelected(null)
      onProgress((prev) => markKnown(prev, qTile.qid))
      if (next.size === tiles.length) setWon(true)
    } else {
      setWrongFlash(`${selected.id}-${tile.id}`)
      onProgress((prev) => markUnknown(prev, qTile.qid))
      setTimeout(() => {
        setWrongFlash(null)
        setSelected(null)
      }, 600)
    }
  }, [selected, matched, wrongFlash, tiles.length, progress, onProgress])

  const newRound = () => {
    setRound((r) => r + 1)
    setMatched(new Set())
    setSelected(null)
    setSeconds(0)
    setWon(false)
  }

  const fmt = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <>
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Hub</button>
        <span className="screen-title">Ghép cặp</span>
        <div className="timer"><Timer size={14} /> {fmt}</div>
      </div>

      <p className="study-counter">
        Ghép {PAIRS} cặp câu hỏi ↔ đáp án · Vòng {round}
        <span className="match-progress"> ({matched.size / 2}/{PAIRS})</span>
      </p>

      {won ? (
        <div className="card match-win-card">
          <Trophy size={52} color="#ffd166" />
          <h2>Xuất sắc!</h2>
          <p>Hoàn thành trong <strong>{fmt}</strong></p>
          <div className="actions-center">
            <button className="btn btn-primary" onClick={newRound}>
              <RotateCcw size={16} /> Vòng mới
            </button>
            <button className="btn btn-secondary" onClick={onBack}>Về Hub</button>
          </div>
        </div>
      ) : (
        <div className="match-grid">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.id)
            const isSelected = selected?.id === tile.id
            const isWrong = wrongFlash && wrongFlash.includes(tile.id)

            return (
              <button
                key={tile.id}
                className={`match-tile ${tile.type} ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                disabled={isMatched}
                onClick={() => handleTile(tile)}
              >
                <span className="match-tile-type">{tile.type === 'question' ? 'Câu hỏi' : 'Đáp án'}</span>
                <span className="match-tile-text">{tile.text}</span>
              </button>
            )
          })}
        </div>
      )}

      <p className="flash-hint">Chọn 1 câu hỏi rồi chọn đáp án tương ứng</p>
      <Footer />
    </>
  )
}
