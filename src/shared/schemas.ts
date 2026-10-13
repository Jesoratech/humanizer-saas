import { z } from 'zod';

// ── Writing Tones ──
export const TONES = [
  'professional',
  'academic',
  'conversational',
  'simple',
  'marketing',
  'creative',
] as const;

export type Tone = (typeof TONES)[number];

export const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professional',
  academic: 'Academic',
  conversational: 'Conversational',
  simple: 'Simple & Clear',
  marketing: 'Marketing',
  creative: 'Creative',
};

export const TONE_DESCRIPTIONS: Record<Tone, string> = {
  professional: 'Polished, clear, and appropriately formal',
  academic: 'Scholarly tone with precise terminology',
  conversational: 'Natural and direct, like talking to a colleague',
  simple: 'Plain language that anyone can understand',
  marketing: 'Persuasive and compelling without being pushy',
  creative: 'Expressive and engaging with room for flair',
};

// ── Editing Strengths ──
export const STRENGTHS = ['light', 'balanced', 'strong'] as const;
export type Strength = (typeof STRENGTHS)[number];

export const STRENGTH_LABELS: Record<Strength, string> = {
  light: 'Light',
  balanced: 'Balanced',
  strong: 'Strong',
};

export const STRENGTH_DESCRIPTIONS: Record<Strength, string> = {
  light: 'Fix awkward language while staying close to the original',
  balanced: 'Improve flow, clarity, and readability',
  strong: 'Permit a more substantial rewrite while preserving meaning',
};

// ── Audiences ──
export const AUDIENCES = [
  'general',
  'technical',
  'business',
  'academic',
  'casual',
] as const;

export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  general: 'General',
  technical: 'Technical',
  business: 'Business',
  academic: 'Academic',
  casual: 'Casual',
};

// ── Zod Schemas ──
export const humanizeRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(20000, 'Text is too long'),
  tone: z.enum(TONES),
  audience: z.enum(AUDIENCES),
  strength: z.enum(STRENGTHS),
  preserveStructure: z.boolean().default(true),
});

export type HumanizeRequest = z.infer<typeof humanizeRequestSchema>;

export interface HumanizeResponse {
  rewrittenText: string;
  provider: string;
  requestId: string;
  warnings: string[];
  metadata: {
    originalWordCount: number;
    rewrittenWordCount: number;
    tone: Tone;
    strength: Strength;
    audience: Audience;
  };
}

export interface UsageData {
  date: string;
  dailyLimit: number;
  requestsUsed: number;
  requestsRemaining: number;
  wordsUsed: number;
  maxWordsPerRequest: number;
}

export interface ApiError {
  error: string;
  code: string;
  requestId?: string;
  details?: string;
}

export const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  category: z.enum([
    'quality',
    'accuracy',
    'tone',
    'speed',
    'ui',
    'other',
  ]),
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less')
    .optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackSchema>;

// ── Utility ──
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

// ── App Config (non-secret, shared) ──
export const APP_CONFIG = {
  name: 'Humanly',
  tagline: 'Write naturally. Sound like you.',
  description:
    'AI-powered writing editor that improves clarity, flow, and naturalness while preserving your voice and meaning.',
  maxWordsDefault: 800,
  betaDailyRequestsDefault: 3,
} as const;
