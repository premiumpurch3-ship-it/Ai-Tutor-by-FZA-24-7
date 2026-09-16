export interface GradableQuestion {
  id: string;
  correct_option_index: number;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedIndex: number;
}

export interface GradedAnswer {
  question_id: string;
  selected_index: number;
  is_correct: boolean;
}

export interface GradeResult {
  score: number;
  total: number;
  gradedAnswers: GradedAnswer[];
}

/**
 * Pure, server-side scoring — the single source of truth for quiz results.
 * Never trust a score computed on the client; always regrade from the
 * question bank's correct_option_index like this.
 */
export function gradeQuiz(questions: GradableQuestion[], answers: SubmittedAnswer[]): GradeResult {
  const correctMap = new Map(questions.map((q) => [q.id, q.correct_option_index]));

  let score = 0;
  const gradedAnswers: GradedAnswer[] = answers.map((a) => {
    const isCorrect = correctMap.get(a.questionId) === a.selectedIndex;
    if (isCorrect) score += 1;
    return { question_id: a.questionId, selected_index: a.selectedIndex, is_correct: isCorrect };
  });

  return { score, total: questions.length, gradedAnswers };
}
