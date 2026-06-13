import { Code2, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-glow" aria-hidden />
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <span className="app-footer-logo">MLN</span>
          <div>
            <p className="app-footer-title">MLN111 · Triết học Mác-Lênin</p>
            <p className="app-footer-tagline">
              <Sparkles size={12} /> Spaced repetition · Flashcard · Thi thử
            </p>
          </div>
        </div>
        <div className="app-footer-credit">
          <Code2 size={14} />
          <p>
            Phát triển bởi <strong>Nguyễn Thành Trương</strong>
            <span className="app-footer-role">Software Engineering</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
