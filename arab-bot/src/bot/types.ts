import { QuizQuestion } from '../services/gemini.js';

export interface QuizAttemptRecord {
  question: string;
  topic?: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  userAnswerText: string;
  correctAnswerText: string;
  explanation: string;
}

export interface UserSessionState {
  state?: 'idle' | 'waiting_group_code' | 'waiting_admin_password' | 'taking_test' | 'waiting_review_text' | 'selecting_ai_tutor_book' | 'chatting_with_gemini' | 'chatting_with_ai_tutor';
  selectedStudentId?: number;
  isAdmin?: boolean;
  activeTutorBookId?: number;
  activeTutorBookTitle?: string;
  activeTutorBookContent?: string;
  activeTutorQuestion?: string;
  testQuestions?: QuizQuestion[];
  testCurrentIndex?: number;
  testScore?: number;
  isDailyTest?: boolean;
  testAcademyGroupId?: number;
  testAttempts?: QuizAttemptRecord[];
  lastQuizAttempts?: QuizAttemptRecord[];
  lastQuizLevelTitle?: string;
  lastQuizScore?: number;
  lastQuizTotal?: number;
  lastQuizPercentage?: number;
  lastQuizComment?: string;
}
