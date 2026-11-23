/**
 * SD MATCH (Smart Digital Make A Match) - MIN 1 ENDE
 * Definisi Tipe Database PostgreSQL & Supabase
 */

export type UserRole = 'guru' | 'murid' | 'admin';
export type CognitiveLevel = 'Easy' | 'Medium' | 'HOTS';
export type ArgumentType = 'voice' | 'text';
export type SessionStatus = 'in_progress' | 'completed' | 'reviewed';
export type PlayerMode = 'individual' | 'group';

export interface SubjectItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  topics: string[];
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  role: UserRole;
  school: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  created_by?: string | null;
  subject: string;
  topic?: string;
  difficulty_level: CognitiveLevel;
  question_text: string;
  question_image_url?: string | null;
  answer_text: string;
  answer_image_url?: string | null;
  explanation: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionInsert {
  id?: string;
  created_by?: string | null;
  subject: string;
  topic?: string;
  difficulty_level: CognitiveLevel;
  question_text: string;
  question_image_url?: string | null;
  answer_text: string;
  answer_image_url?: string | null;
  explanation: string;
  is_active?: boolean;
}

export interface QuestionUpdate {
  subject?: string;
  topic?: string;
  difficulty_level?: CognitiveLevel;
  question_text?: string;
  question_image_url?: string | null;
  answer_text?: string;
  answer_image_url?: string | null;
  explanation?: string;
  is_active?: boolean;
}

export interface GameSession {
  id: string;
  room_code: string;
  student_name: string;
  student_class: string;
  player_mode?: PlayerMode;
  group_members?: string;
  subject?: string;
  topic?: string;
  student_id?: string | null;
  difficulty_level: CognitiveLevel;
  total_questions: number;
  correct_answers: number;
  time_limit_seconds: number;
  time_spent_seconds: number;
  
  // 4 Komponen Penilaian SD Match
  score_pairing: number;        // Bobot 40%
  score_argumentation: number;  // Bobot 30%
  score_activity: number;       // Bobot 20%
  score_time: number;           // Bobot 10%
  final_score: number;          // Total (100%)
  
  status: SessionStatus;
  teacher_feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  completed_at?: string | null;
  answers?: SessionAnswer[];
}

export interface GameSessionInsert {
  id?: string;
  room_code?: string;
  student_name: string;
  student_class: string;
  player_mode?: PlayerMode;
  group_members?: string;
  subject?: string;
  topic?: string;
  student_id?: string | null;
  difficulty_level: CognitiveLevel;
  total_questions: number;
  correct_answers?: number;
  time_limit_seconds?: number;
  time_spent_seconds?: number;
  score_pairing?: number;
  score_argumentation?: number;
  score_activity?: number;
  score_time?: number;
  final_score?: number;
  status?: SessionStatus;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_answer_text: string;
  is_correct: boolean;
  argument_type: ArgumentType;
  argument_text?: string | null;
  argument_audio_url?: string | null;
  argument_score: number;
  teacher_comment?: string | null;
  submitted_at: string;
  question?: Question;
}

export interface SessionAnswerInsert {
  id?: string;
  session_id: string;
  question_id: string;
  user_answer_text: string;
  is_correct: boolean;
  argument_type: ArgumentType;
  argument_text?: string | null;
  argument_audio_url?: string | null;
  argument_score?: number;
  teacher_comment?: string | null;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Supabase Database Schema Typing (kompatibel Supabase v2)
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      questions: {
        Row: Question;
        Insert: QuestionInsert;
        Update: QuestionUpdate;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSession;
        Insert: GameSessionInsert;
        Update: Partial<GameSession>;
        Relationships: [];
      };
      session_answers: {
        Row: SessionAnswer;
        Insert: SessionAnswerInsert;
        Update: Partial<SessionAnswer>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      cognitive_level: CognitiveLevel;
      argument_type: ArgumentType;
      session_status: SessionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
