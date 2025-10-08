export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option (0-3)
}

export interface Quiz {
  id: string;
  courseId: string;
  subtopicIndex: number;
  subtopicTitle: string;
  language: 'english' | 'sinhala' | 'tamil';
  questions: QuizQuestion[];
  createdAt: Date;
}

export interface QuizAttempt {
  quizId: string;
  courseId: string;
  subtopicIndex: number;
  userId: string;
  answers: number[]; // user's selected answers
  score: number;
  passed: boolean; // true if score >= 70%
  completedAt: Date;
}

export interface CourseProgress {
  courseId: string;
  userId: string;
  completedSubtopics: number[]; // array of subtopic indices
  progress: number; // percentage (0-100)
  lastUpdated: Date;
}