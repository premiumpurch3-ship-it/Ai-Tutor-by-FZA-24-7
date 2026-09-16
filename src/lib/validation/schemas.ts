import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

export const generateLessonSchema = z.object({
  documentId: z.string().uuid(),
  topic: z.string().max(200).optional(),
});

export const generateSummarySchema = z.object({
  documentId: z.string().uuid(),
  scope: z.enum(["document", "chapter", "topic"]).default("document"),
  topic: z.string().max(200).optional(),
});

export const generateQuizSchema = z.object({
  documentId: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionCount: z.number().int().min(3).max(20).default(5),
  topic: z.string().max(200).optional(),
});

export const submitQuizSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedIndex: z.number().int().min(0).max(9),
    })
  ),
});

export const generateFlashcardsSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(3).max(40).default(10),
  topic: z.string().max(200).optional(),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: z.string().uuid(),
  result: z.enum(["known", "unknown"]),
});

export const createStudyPlanSchema = z.object({
  subjectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  goal: z.string().max(500).optional(),
  examDate: z.string().optional(),
  hoursPerWeek: z.number().positive().max(80).optional(),
  documentId: z.string().uuid().optional(),
});

export const uploadDocumentSchema = z.object({
  subjectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
});
