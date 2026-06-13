import { useState, useMemo } from 'react'
import {
  BookOpen, Brain, Layers, Zap, RotateCcw, ChevronLeft,
  Sparkles, Target, Clock, CheckCircle2, Circle, GraduationCap,
} from 'lucide-react'
import { loadProgress, getStats, resetProgress, filterQuestions, STATUS, getCardProgress,
} from '../study/progress'
import FlashcardStudy from './study/FlashcardStudy'
import LearnStudy from './study/LearnStudy'
import MatchStudy from './study/MatchStudy'
import QuizStudy from './study/QuizStudy'
import Footer from './Footer'

const MODES = [
  {
    id: 'flashcard',
    icon: Layers,
    title: 'Thẻ ghi nhớ',
    desc: 'Lật thẻ · Đánh dấu đã thuộc / chưa thuộc',
    color: '#ffd166',
    tag: 'Ghi nhớ cơ bản',
  },
  {
    id: 'learn',
    icon: Brain,
    title: 'Học',
    desc: 'Trả lời trắc nghiệm · Ưu tiên câu chưa thuộc',
    color: '#06d6a0',
    tag: 'Active recall',
  },
  {
    id: 'match',
    icon: Target,
    title: 'Ghép cặp',
    desc: 'Nối câu hỏi với đáp án đúng · Tính thời gian',
    color: '#4cc9f0',
    tag: 'Trí nhớ dài hạn',
  },
  {
    id: 'quiz',
    icon: Zap,
    title: 'Kiểm tra nhanh',
    desc: '10 câu liên tiếp · Xem % hoàn thành',
    color: '#e63946',
    tag: 'Ôn tập',
  },
]

export default function StudyHub({ questions, onBack }) {
  const [mode, setMode] = useState(null)
  const [progress, setProgress] = useState(loadProgress)
  const [filter, setFilter] = useState('all')

  const stats = useMemo(() => getStats(questions, progress), [questions, progress])
  const filtered = useMemo(
    () => filterQuestions(questions, progress, filter),
    [questions, progress, filter]
  )

  const refreshProgress = () => setProgress(loadProgress())

  const handleReset = () => {
    if (window.confirm('Xóa toàn bộ tiến độ học? Hành động này không thể hoàn tác.')) {
      setProgress(resetProgress())
    }
  }

  if (mode === 'flashcard') {
    return (
      <FlashcardStudy
        questions={filtered.length ? filtered : questions}
        progress={progress}
        onProgress={setProgress}
        onBack={() => { setMode(null); refreshProgress() }}
      />
    )
  }
  if (mode === 'learn') {
    return (
      <LearnStudy
        questions={questions}
        progress={progress}
        onProgress={setProgress}
        onBack={() => { setMode(null); refreshProgress() }}
      />
    )
  }
  if (mode === 'match') {
    return (
      <MatchStudy
        questions={questions}
        progress={progress}
        onProgress={setProgress}
        onBack={() => { setMode(null); refreshProgress() }}
      />
    )
  }
  if (mode === 'quiz') {
    return (
      <QuizStudy
        questions={questions}
        progress={progress}
        onProgress={setProgress}
        onBack={() => { setMode(null); refreshProgress() }}
      />
    )
  }

  return (
    <div className="study-hub">
      <div className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}><ChevronLeft size={18} /> Trang chủ</button>
        <span className="screen-title"><GraduationCap size={20} style={{ verticalAlign: -4, marginRight: 6 }} />Học thông minh</span>
        <button className="btn btn-ghost" onClick={handleReset} title="Reset tiến độ">
          <RotateCcw size={16} /> Reset
        </button>
      </div>

      {/* Progress dashboard */}
      <div className="study-dashboard">
        <div className="study-ring-wrap">
          <div className="study-ring" style={{ '--pct': stats.pct }}>
            <div className="study-ring-inner">
              <span className="study-ring-num">{stats.pct}%</span>
              <span className="study-ring-lbl">Đã thuộc</span>
            </div>
          </div>
        </div>
        <div className="study-status-grid">
          <div className="study-status-card new">
            <Circle size={18} />
            <div>
              <strong>{stats.fresh}</strong>
              <span>Chưa học</span>
            </div>
          </div>
          <div className="study-status-card learning">
            <Clock size={18} />
            <div>
              <strong>{stats.learning}</strong>
              <span>Đang học</span>
            </div>
          </div>
          <div className="study-status-card mastered">
            <CheckCircle2 size={18} />
            <div>
              <strong>{stats.mastered}</strong>
              <span>Đã thuộc</span>
            </div>
          </div>
        </div>
        {stats.dueReview > 0 && (
          <div className="study-due-banner">
            <Sparkles size={16} />
            {stats.dueReview} câu cần ôn lại hôm nay (spaced repetition)
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="study-filter-row">
        <span className="study-filter-label">Bộ thẻ:</span>
        {[
          { id: 'all', label: `Tất cả (${stats.total})` },
          { id: 'unlearned', label: 'Chưa thuộc' },
          { id: 'new', label: 'Mới' },
          { id: 'learning', label: 'Đang học' },
          { id: 'mastered', label: 'Đã thuộc' },
          { id: 'review', label: 'Cần ôn' },
        ].map((f) => (
          <button
            key={f.id}
            className={`study-filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="study-filter-hint">
        {filter === 'all'
          ? `Học toàn bộ ${questions.length} câu`
          : `${filtered.length} câu trong bộ lọc "${fLabel(filter)}"`}
      </p>

      {/* Mode cards */}
      <div className="study-modes-grid">
        {MODES.map((m) => {
          const Icon = m.icon
          const disabled = filter !== 'all' && filtered.length === 0
          return (
            <button
              key={m.id}
              className="study-mode-card"
              disabled={disabled}
              onClick={() => setMode(m.id)}
            >
              <div className="study-mode-icon" style={{ background: `${m.color}22`, color: m.color }}>
                <Icon size={26} />
              </div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
              <span className="study-mode-tag" style={{ borderColor: `${m.color}44`, color: m.color }}>
                {m.tag}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card study-tips">
        <BookOpen size={20} color="#ffd166" />
        <div>
          <h4>Mẹo nhớ lâu (như Quizlet)</h4>
          <ul>
            <li><strong>Thẻ:</strong> Tự nhớ trước khi lật — active recall mạnh nhất.</li>
            <li><strong>Học:</strong> Hệ thống ưu tiên câu sai & câu mới (spaced repetition).</li>
            <li><strong>Ghép cặp:</strong> Kết nối câu hỏi ↔ đáp án giúp não tạo liên kết.</li>
            <li>Đánh dấu <em>Đã thuộc</em> chỉ khi trả lời được không cần nhìn đáp án.</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function fLabel(id) {
  const map = {
    all: 'Tất cả', new: 'Chưa học', learning: 'Đang học',
    mastered: 'Đã thuộc', review: 'Cần ôn', unlearned: 'Chưa thuộc',
  }
  return map[id] || id
}
