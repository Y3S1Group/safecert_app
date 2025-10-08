import { DocumentPickerAsset } from "expo-document-picker";

// Type for PDFs in Firestore (after upload - all URLs are strings)
export type StoredPDFs = {
  english: string | null;
  sinhala: string | null;
  tamil: string | null;
};

// Type for PDFs in the form (before upload - can be DocumentPickerAsset or string)
export type FormPDFs = {
  english: DocumentPickerAsset | string | null;
  sinhala: DocumentPickerAsset | string | null;
  tamil: DocumentPickerAsset | string | null;
};

// Subtopic type for forms (when creating/editing)
export type SubtopicForm = {
  title: string;
  description: string;
  pdfs: FormPDFs;
};

// Subtopic type for stored data (in Firestore)
export type Subtopic = {
  title: string;
  description: string;
  pdfs: StoredPDFs;
  createdAt?: any; // Firestore Timestamp
};

// Course type for stored data (in Firestore)
export type Course = {
  id?: string;
  title: string;
  description: string;
  subtopics: Subtopic[];
  subtopicsCount?: number;
  createdAt?: any; // Firestore Timestamp
  createdBy?: string;
};

// Course type for forms (when creating)
export type CourseForm = {
  title: string;
  description: string;
  subtopics: SubtopicForm[];
};