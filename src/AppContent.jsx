import { useState, useEffect } from 'react'
import { Menu, X, Home as HomeIcon, GraduationCap, Timer, BookOpen } from 'lucide-react'
import Home from './components/Home'
import StudyHub from './components/StudyHub'
import Exam from './components/Exam'
import Results from './components/Results'
import Footer from './components/Footer'
import { gradableQuestions } from './data/questions'
import { loadHistory, saveHistory } from './utils'
import { loadSession, saveSession } from './study/session'

export default function AppContent({ questions, meta }) {
  const examPool = gradableQuestions(questions)
  const [screen, setScreen] = useState(() => {
    const saved = loadSession().screen
    return saved === 'study' ? 'study' : 'home'
  })
  const [history, setHistory] = useState(loadHistory)
  const [examResult, setExamResult] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [screen])

  useEffect(() => {
    const persist = screen === 'results' ? 'home' : screen
    saveSession({ screen: persist })
  }, [screen])

  const handleExamFinish = (result) => {
    saveHistory(result)
    setHistory(loadHistory())
    setExamResult(result)
    setScreen('results')
  }

  const nav = (target) => () => setScreen(target)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-bar">
          <div className="logo" onClick={nav('home')} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setScreen('home')}>
            <div className="logo-icon">MLN</div>
            <div className="logo-text">
              <h1>MLN111</h1>
              <p className="hide-mobile">Triết học Mác — Lênin</p>
            </div>
          </div>

          <nav className="header-nav hide-mobile" aria-label="Điều hướng chính">
            <button type="button" className={`header-nav-link ${screen === 'home' ? 'active' : ''}`} onClick={nav('home')}>
              <HomeIcon size={16} /> Trang chủ
            </button>
            <button type="button" className={`header-nav-link ${screen === 'study' ? 'active' : ''}`} onClick={nav('study')}>
              <GraduationCap size={16} /> Học
            </button>
            <button type="button" className={`header-nav-link ${screen === 'exam' || screen === 'results' ? 'active' : ''}`} onClick={nav('exam')}>
              <Timer size={16} /> Thi thử
            </button>
          </nav>

          <div className="header-actions">
            <div className="bank-chip hide-mobile" title={meta?.title}>
              <BookOpen size={14} />
              <span>{questions.length} câu</span>
            </div>
            <button type="button" className="btn btn-ghost mobile-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button type="button" className="mobile-drawer-backdrop" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />
          <nav className="mobile-drawer">
            <div className="mobile-drawer-head">
              <div className="logo-icon logo-icon--sm">MLN</div>
              <div>
                <p className="mobile-drawer-user">{meta?.title || 'MLN111'}</p>
                <p className="mobile-drawer-email">{questions.length} câu hỏi · Offline</p>
              </div>
            </div>
            <button type="button" className={`mobile-drawer-link ${screen === 'home' ? 'active' : ''}`} onClick={nav('home')}>
              <HomeIcon size={18} /> Trang chủ
            </button>
            <button type="button" className={`mobile-drawer-link ${screen === 'study' ? 'active' : ''}`} onClick={nav('study')}>
              <GraduationCap size={18} /> Học thông minh
            </button>
            <button type="button" className={`mobile-drawer-link ${screen === 'exam' || screen === 'results' ? 'active' : ''}`} onClick={nav('exam')}>
              <Timer size={18} /> Thi thử 60 câu
            </button>
          </nav>
        </>
      )}

      <main className="app-main">
        {screen === 'home' && (
          <Home
            questions={questions}
            examPool={examPool}
            meta={meta}
            history={history}
            onStartFlashcard={() => setScreen('study')}
            onStartExam={() => setScreen('exam')}
          />
        )}
        {screen === 'study' && (
          <StudyHub questions={questions} onBack={() => setScreen('home')} />
        )}
        {screen === 'exam' && (
          <Exam allQuestions={examPool} onFinish={handleExamFinish} onBack={() => setScreen('home')} />
        )}
        {screen === 'results' && examResult && (
          <Results
            result={examResult}
            onRetry={() => { setExamResult(null); setScreen('exam') }}
            onHome={() => setScreen('home')}
          />
        )}
      </main>

      {screen === 'home' && <Footer />}
    </div>
  )
}
