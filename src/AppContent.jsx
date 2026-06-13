import { useState, useEffect } from 'react'
import { LogOut, Menu, X, Home as HomeIcon, AlertCircle, RefreshCw, GraduationCap, Timer } from 'lucide-react'
import Home from './components/Home'
import StudyHub from './components/StudyHub'
import Exam from './components/Exam'
import Results from './components/Results'
import Footer from './components/Footer'
import { useAuth } from './auth/AuthContext'
import { loadHistory, saveHistory } from './utils'

export default function AppContent() {
  const { user, questions, questionsLoading, questionsError, logout, loadQuestions } = useAuth()
  const [screen, setScreen] = useState('home')
  const [history, setHistory] = useState(loadHistory)
  const [examResult, setExamResult] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [screen])

  const handleExamFinish = (result) => {
    saveHistory(result)
    setHistory(loadHistory())
    setExamResult(result)
    setScreen('results')
  }

  if (questionsError) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--narrow">
          <AlertCircle size={40} color="#ffd166" />
          <h2>Không tải được câu hỏi</h2>
          <p className="auth-sub">{questionsError}</p>
          {questionsError.includes('QUESTIONS_FILE_ID') && (
            <p className="auth-sub">
              Admin: upload <code>data/questions.json</code> lên Google Drive → copy ID file →
              dán vào <code>QUESTIONS_FILE_ID</code> trong Apps Script → deploy lại.
            </p>
          )}
          <div className="auth-form" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-primary auth-submit" onClick={() => loadQuestions()}>
              <RefreshCw size={18} /> Thử lại
            </button>
            <button type="button" className="btn btn-secondary auth-submit" onClick={logout}>
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!questions || questionsLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Đang tải ngân hàng câu hỏi...</p>
      </div>
    )
  }

  return (
    <div className="app-shell protected-content">
      <header className="app-header">
        <div className="app-header-bar">
          <div className="logo" onClick={() => setScreen('home')} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setScreen('home')}>
            <div className="logo-icon">MLN</div>
            <div className="logo-text">
              <h1>MLN111</h1>
              <p className="hide-mobile">Triết học Mác — Lênin</p>
            </div>
          </div>

          <nav className="header-nav hide-mobile" aria-label="Điều hướng chính">
            <button type="button" className={`header-nav-link ${screen === 'home' ? 'active' : ''}`}
              onClick={() => setScreen('home')}>
              <HomeIcon size={16} /> Trang chủ
            </button>
            <button type="button" className={`header-nav-link ${screen === 'study' ? 'active' : ''}`}
              onClick={() => setScreen('study')}>
              <GraduationCap size={16} /> Học
            </button>
            <button type="button" className={`header-nav-link ${screen === 'exam' || screen === 'results' ? 'active' : ''}`}
              onClick={() => setScreen('exam')}>
              <Timer size={16} /> Thi thử
            </button>
          </nav>

          <div className="header-actions">
            <div className="user-chip hide-mobile" title={user?.email}>
              <span className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              <span className="user-name">{user?.name}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-logout hide-mobile" onClick={logout} title="Đăng xuất">
              <LogOut size={18} />
              <span>Thoát</span>
            </button>
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
              <span className="user-avatar user-avatar--lg">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              <div>
                <p className="mobile-drawer-user">{user?.name}</p>
                <p className="mobile-drawer-email">{user?.email}</p>
              </div>
            </div>
            <button type="button" className={`mobile-drawer-link ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
              <HomeIcon size={18} /> Trang chủ
            </button>
            <button type="button" className={`mobile-drawer-link ${screen === 'study' ? 'active' : ''}`} onClick={() => setScreen('study')}>
              <GraduationCap size={18} /> Học thông minh
            </button>
            <button type="button" className={`mobile-drawer-link ${screen === 'exam' || screen === 'results' ? 'active' : ''}`} onClick={() => setScreen('exam')}>
              <Timer size={18} /> Thi thử
            </button>
            <button type="button" className="mobile-drawer-link danger" onClick={logout}>
              <LogOut size={18} /> Đăng xuất
            </button>
          </nav>
        </>
      )}

      <main className="app-main">
        {screen === 'home' && (
          <Home questions={questions} history={history}
            onStartFlashcard={() => setScreen('study')} onStartExam={() => setScreen('exam')} />
        )}
        {screen === 'study' && <StudyHub questions={questions} onBack={() => setScreen('home')} />}
        {screen === 'exam' && (
          <Exam allQuestions={questions} onFinish={handleExamFinish} onBack={() => setScreen('home')} />
        )}
        {screen === 'results' && examResult && (
          <Results result={examResult}
            onRetry={() => { setExamResult(null); setScreen('exam') }}
            onHome={() => setScreen('home')} />
        )}
      </main>

      {screen === 'home' && <Footer />}
    </div>
  )
}
