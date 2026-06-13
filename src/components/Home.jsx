import { Timer, Trophy, Zap, GraduationCap } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { loadProgress, getStats } from '../study/progress'

export default function Home({ questions, history, onStartFlashcard, onStartExam }) {
  const mc = questions.filter((q) => q.type === 'multiple_choice').length
  const yn = questions.filter((q) => q.type === 'yes_no').length
  const best = history.length ? Math.max(...history.map((h) => h.score)) : null
  const attempts = history.length

  const [progress, setProgress] = useState(loadProgress)
  useEffect(() => {
    const sync = () => setProgress(loadProgress())
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  const studyStats = useMemo(() => getStats(questions, progress), [questions, progress])

  return (
    <>
      <div className="home-welcome">
        <h2>Chào mừng trở lại</h2>
        <p>Ôn {questions.length} câu Triết học M-L — học thông minh hoặc thi thử 60 câu / 90 phút.</p>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="num">{questions.length}</div>
          <div className="label">Tổng câu hỏi</div>
        </div>
        <div className="stat-box">
          <div className="num">{studyStats.pct}%</div>
          <div className="label">Đã thuộc</div>
        </div>
        <div className="stat-box">
          <div className="num">{studyStats.fresh + studyStats.learning}</div>
          <div className="label">Cần ôn</div>
        </div>
        <div className="stat-box">
          <div className="num">{best !== null ? `${best}%` : '—'}</div>
          <div className="label">Điểm thi cao</div>
        </div>
      </div>

      <div className="card-grid">
        <div className="mode-card flashcard" onClick={onStartFlashcard} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onStartFlashcard()}>
          <div className="icon-wrap"><GraduationCap size={26} color="#ffd166" /></div>
          <h3>Học thông minh</h3>
          <p>Flashcard · Học · Ghép cặp · Kiểm tra — theo dõi % đã thuộc, chưa học, spaced repetition.</p>
          <span className="badge">Quizlet-style · {studyStats.mastered}/{studyStats.total} thuộc</span>
        </div>

        <div className="mode-card exam" onClick={onStartExam} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onStartExam()}>
          <div className="icon-wrap"><Timer size={26} color="#e63946" /></div>
          <h3>Thi thử</h3>
          <p>60 câu / 90 phút — đề trộn ngẫu nhiên mỗi lần thi. Làm bài nhiều lần không giới hạn.</p>
          <span className="badge">60 câu · 90 phút · Trộn đề</span>
        </div>
      </div>

      <div className="card home-feature-card">
        <div className="home-feature-inner">
          <Zap size={22} color="#ffd166" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3>4 chế độ học nhớ lâu</h3>
            <ul className="home-feature-list">
              <li><strong>Thẻ ghi nhớ:</strong> Lật thẻ, đánh dấu Đã thuộc / Chưa thuộc.</li>
              <li><strong>Học:</strong> Trắc nghiệm ưu tiên câu mới & cần ôn lại.</li>
              <li><strong>Ghép cặp:</strong> Nối câu hỏi với đáp án — tăng liên kết trí nhớ.</li>
              <li><strong>Kiểm tra nhanh:</strong> 10 câu liên tiếp, xem % ngay.</li>
            </ul>
          </div>
        </div>
      </div>

      {attempts > 0 && (
        <>
          <h2 className="section-title"><Trophy size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Lịch sử thi ({attempts} lần)</h2>
          <div className="history-list">
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="history-item">
                <span>{new Date(h.date).toLocaleString('vi-VN')}</span>
                <span className="score">{h.correct}/{h.total} · {h.score}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
