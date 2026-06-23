import { Timer, Trophy, Zap, GraduationCap, Sparkles, BookMarked } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { loadProgress, getStats, subscribeProgress } from '../study/progress'

export default function Home({ questions, examPool, meta, history, onStartFlashcard, onStartExam }) {
  const mc = examPool.length
  const best = history.length ? Math.max(...history.map((h) => h.score)) : null
  const attempts = history.length

  const [progress, setProgress] = useState(loadProgress)
  useEffect(() => {
    setProgress(loadProgress())
    return subscribeProgress(setProgress)
  }, [])

  const studyStats = useMemo(() => getStats(questions, progress), [questions, progress])

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-glow" aria-hidden />
        <div className="home-hero-content">
          <span className="home-hero-badge">
            <Sparkles size={14} /> Bộ câu Quizlet · NHUNG HOÀNG
          </span>
          <h2 className="home-hero-title">{meta?.title || 'MLN111'}</h2>
          <p className="home-hero-desc">
            Ôn đủ <strong>{questions.length}</strong> câu từ bộ Quizlet NHUNG HOÀNG — học flashcard thông minh
            hoặc thi thử <strong>60 câu / 90 phút</strong> (trộn từ {mc} câu trắc nghiệm).
          </p>
          <div className="home-hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onStartFlashcard}>
              <GraduationCap size={20} /> Bắt đầu học
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={onStartExam}>
              <Timer size={20} /> Thi thử ngay
            </button>
          </div>
        </div>
      </section>

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
          <p>Flashcard · Học · Ghép cặp · Kiểm tra — spaced repetition theo dõi tiến độ từng câu.</p>
          <span className="badge">{studyStats.mastered}/{studyStats.total} đã thuộc</span>
        </div>

        <div className="mode-card exam" onClick={onStartExam} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onStartExam()}>
          <div className="icon-wrap"><Timer size={26} color="#e63946" /></div>
          <h3>Thi thử</h3>
          <p>60 câu ngẫu nhiên · 90 phút — mô phỏng đề thi thật. Làm lại không giới hạn, đề mới mỗi lần.</p>
          <span className="badge">60 câu · 90 phút · {mc} câu trắc nghiệm</span>
        </div>
      </div>

      <div className="card home-feature-card">
        <div className="home-feature-inner">
          <BookMarked size={22} color="#4cc9f0" style={{ flexShrink: 0, marginTop: 2 }} />
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
          <h2 className="section-title">
            <Trophy size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Lịch sử thi ({attempts} lần)
          </h2>
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
