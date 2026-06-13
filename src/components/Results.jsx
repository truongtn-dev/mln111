import { useState } from 'react'
import { Trophy, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { formatTime, getOptionLabel } from '../utils'

export default function Results({ result, onRetry, onHome }) {
  const [showReview, setShowReview] = useState(false)
  const { correct, total, score, timeUsed, details } = result
  const wrong = details.filter((d) => !d.isCorrect)

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <Trophy size={40} color="#ffd166" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Kết quả thi thử</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
        Thời gian làm bài: {formatTime(timeUsed)}
      </p>

      <div className="score-circle" style={{ '--pct': score }}>
        <span>{score}%</span>
      </div>

      <div className="results-grid">
        <div className="result-stat">
          <div className="val green">{correct}</div>
          <div className="lbl">Đúng</div>
        </div>
        <div className="result-stat">
          <div className="val red">{total - correct}</div>
          <div className="lbl">Sai</div>
        </div>
        <div className="result-stat">
          <div className="val gold">{total}</div>
          <div className="lbl">Tổng câu</div>
        </div>
      </div>

      <p style={{ fontSize: '0.95rem', marginBottom: 20 }}>
        {score >= 80 ? '🎉 Xuất sắc! Bạn đã nắm vững kiến thức.' :
         score >= 60 ? '👍 Khá tốt! Ôn thêm một chút nữa nhé.' :
         score >= 40 ? '📚 Cần ôn tập thêm. Hãy dùng flashcard!' :
         '💪 Đừng nản! Ôn lại từng chương và thi lại.'}
      </p>

      <div className="actions-center">
        <button className="btn btn-primary" onClick={onRetry}>
          <RotateCcw size={16} /> Thi lại (đề mới)
        </button>
        <button className="btn btn-secondary" onClick={onHome}>
          <Home size={16} /> Trang chủ
        </button>
      </div>

      {wrong.length > 0 && (
        <>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 28, width: '100%' }}
            onClick={() => setShowReview((s) => !s)}
          >
            {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showReview ? 'Ẩn' : 'Xem'} {wrong.length} câu sai
          </button>

          {showReview && (
            <div style={{ textAlign: 'left', marginTop: 16, maxHeight: 400, overflowY: 'auto' }}>
              {wrong.map(({ question, userAnswer }, i) => (
                <div key={question.id} className="review-item wrong">
                  <div className="review-q">{i + 1}. {question.question}</div>
                  <div className="review-ans">
                    Bạn chọn: {userAnswer.length ? userAnswer.map((k) => getOptionLabel(question.options, k)).join('; ') : '(bỏ trống)'}
                    <br />
                    <strong>Đáp án: {question.correctAnswers.map((k) => getOptionLabel(question.options, k)).join('; ')}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
