import raw from '../../data/quizlet_questions.json'

export const meta = raw.meta
export const questions = raw.questions

/** Câu có đủ phương án để thi / học trắc nghiệm */
export function gradableQuestions(list = questions) {
  return list.filter(
    (q) =>
      q.type !== 'open' &&
      Array.isArray(q.options) &&
      q.options.length > 0 &&
      Array.isArray(q.correctAnswers) &&
      q.correctAnswers.length > 0
  )
}
