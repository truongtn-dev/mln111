import AppContent from './AppContent'
import { questions, meta } from './data/questions'

export default function App() {
  return <AppContent questions={questions} meta={meta} />
}
