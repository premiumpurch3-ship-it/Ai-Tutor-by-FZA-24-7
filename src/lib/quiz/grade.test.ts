import { describe, it, expect } from "vitest";
import { gradeQuiz } from "@/lib/quiz/grade";

describe("gradeQuiz", () => {
  const questions = [
    { id: "q1", correct_option_index: 2 },
    { id: "q2", correct_option_index: 0 },
    { id: "q3", correct_option_index: 1 },
  ];

  it("scores all-correct answers as full marks", () => {
    const result = gradeQuiz(questions, [
      { questionId: "q1", selectedIndex: 2 },
      { questionId: "q2", selectedIndex: 0 },
      { questionId: "q3", selectedIndex: 1 },
    ]);
    expect(result.score).toBe(3);
    expect(result.total).toBe(3);
    expect(result.gradedAnswers.every((a) => a.is_correct)).toBe(true);
  });

  it("scores partial-correct answers accurately", () => {
    const result = gradeQuiz(questions, [
      { questionId: "q1", selectedIndex: 0 }, // wrong
      { questionId: "q2", selectedIndex: 0 }, // correct
      { questionId: "q3", selectedIndex: 1 }, // correct
    ]);
    expect(result.score).toBe(2);
    expect(result.total).toBe(3);
  });

  it("does not let a client-supplied score or extra answers affect the total", () => {
    const result = gradeQuiz(questions, [
      { questionId: "q1", selectedIndex: 2 },
      { questionId: "unknown-question-id", selectedIndex: 0 }, // not a real question
    ]);
    // The bogus question id can never match, so it's graded incorrect —
    // it cannot inflate the score, and total always reflects the real bank.
    expect(result.total).toBe(3);
    expect(result.score).toBe(1);
  });

  it("returns zero score for an empty answer set", () => {
    const result = gradeQuiz(questions, []);
    expect(result.score).toBe(0);
    expect(result.total).toBe(3);
  });
});
