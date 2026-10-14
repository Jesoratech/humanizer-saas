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

// ── Document Types ──
export const DOCUMENT_TYPES = [
  'general_prose',
  'academic_abstract',
  'literature_review',
  'methodology',
  'discussion_conclusion',
  'professional_email',
  'technical_doc',
  'marketing_copy',
  'conversational',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  general_prose: 'General Prose',
  academic_abstract: 'Academic Abstract',
  literature_review: 'Literature Review',
  methodology: 'Methodology',
  discussion_conclusion: 'Discussion & Conclusion',
  professional_email: 'Professional Email',
  technical_doc: 'Technical Documentation',
  marketing_copy: 'Marketing Copy',
  conversational: 'Conversational Writing',
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  general_prose: 'Clear exposition, balanced tone, and natural narrative cadence',
  academic_abstract: 'Dense, scholarly summary highlighting research objective, method, and key findings',
  literature_review: 'Critical synthesis of prior work with scholarly attribution and contextual nuance',
  methodology: 'Rigorous procedural clarity with exact parameters, conditions, and instruments',
  discussion_conclusion: 'Analytical interpretation of results, limitations, and implications without over-claiming',
  professional_email: 'Polite, clear, and actionable business correspondence with defined next steps',
  technical_doc: 'Unambiguous precision preserving exact identifiers, commands, and specifications',
  marketing_copy: 'Persuasive, value-oriented prose highlighting benefits without hyperbole',
  conversational: 'Warm, approachable, and relatable voice with organic human phrasing',
};

// ── Voice Preferences ──
export const FORMALITY_LEVELS = ['informal', 'neutral', 'formal'] as const;
export type FormalityLevel = (typeof FORMALITY_LEVELS)[number];

export const DIRECTNESS_LEVELS = ['diplomatic', 'balanced', 'direct'] as const;
export type DirectnessLevel = (typeof DIRECTNESS_LEVELS)[number];

export const CONCISENESS_LEVELS = ['expansive', 'balanced', 'concise'] as const;
export type ConcisenessLevel = (typeof CONCISENESS_LEVELS)[number];

export const TECHNICAL_DEPTH_LEVELS = ['layperson', 'general', 'expert'] as const;
export type TechnicalDepthLevel = (typeof TECHNICAL_DEPTH_LEVELS)[number];

export const voicePreferencesSchema = z.object({
  formality: z.enum(FORMALITY_LEVELS).optional(),
  directness: z.enum(DIRECTNESS_LEVELS).optional(),
  conciseness: z.enum(CONCISENESS_LEVELS).optional(),
  technicalDepth: z.enum(TECHNICAL_DEPTH_LEVELS).optional(),
});

export type VoicePreferences = z.infer<typeof voicePreferencesSchema>;

// ── Prompt Versions ──
export const PROMPT_VERSIONS = ['v1', 'v2', 'v3'] as const;
export type PromptVersion = (typeof PROMPT_VERSIONS)[number];

// ── Zod Schemas ──
export const humanizeRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(20000, 'Text is too long')
    .refine((val) => val.trim().length > 0, {
      message: 'Text cannot be empty or whitespace only',
    }),
  tone: z.enum(TONES),
  audience: z.enum(AUDIENCES),
  strength: z.enum(STRENGTHS),
  documentType: z.enum(DOCUMENT_TYPES).optional().default('general_prose'),
  voicePreferences: voicePreferencesSchema.optional(),
  preserveStructure: z.boolean().default(true),
  userIntent: z
    .string()
    .max(500, 'Intent description must be 500 characters or less')
    .optional(),
  protectedTerms: z
    .array(z.string().max(100))
    .max(30, 'Maximum 30 protected terms')
    .optional(),
  promptVersion: z.enum(PROMPT_VERSIONS).optional().default('v3'),
});

export type HumanizeRequest = z.input<typeof humanizeRequestSchema>;
export type HumanizeRequestParsed = z.infer<typeof humanizeRequestSchema>;

export interface HumanizeResponseMetadata {
  originalWordCount: number;
  rewrittenWordCount: number;
  tone: Tone;
  strength: Strength;
  audience: Audience;
  documentType: DocumentType;
  voicePreferences?: VoicePreferences;
  durationMs: number;
  model: string;
  hasAuthorIntent: boolean;
  intentIncludedInPrompt: boolean;
  hasVoicePreferences: boolean;
  extractedEntitiesCount: number;
  restoredEntitiesCount: number;
  placeholderIntegrityVerified: boolean;
  warningCategories: string[];
  preservedEntitiesCount: number;
  flaggedEntitiesCount: number;
}

export interface HumanizeResponse {
  rewrittenText: string;
  provider: string;
  requestId: string;
  promptVersion: PromptVersion;
  warnings: string[];
  metadata: HumanizeResponseMetadata;
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

export const FEEDBACK_CATEGORIES = [
  'meaning_changed',
  'too_formal',
  'too_casual',
  'too_verbose',
  'unclear_wording',
  'awkward_result',
  'good_result',
  'quality',
  'accuracy',
  'tone',
  'speed',
  'ui',
  'other',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  category: z.enum(FEEDBACK_CATEGORIES),
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
