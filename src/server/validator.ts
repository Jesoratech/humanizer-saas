import { countWords } from '../shared/schemas.ts';

export interface ValidationOptions {
  protectedTerms?: string[];
  preserveStructure?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedText: string;
  warnings: string[];
  droppedUrls: string[];
  droppedCitations: string[];
  droppedCodeSpans: string[];
  missingProtectedTerms: string[];
  numericalDiscrepancies: string[];
  needsRetry: boolean;
  retryReason?: string;
}

const URL_REGEX = /https?:\/\/[^\s)\]]+/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;
const CITATION_REGEX = /\[(?:\d+(?:[,\s–-]+\d+)*|[A-Za-z]+ et al\.,?\s*\d{4})\]|\([A-Za-z]+ et al\.,?\s*\d{4}\)/g;
const NUMBER_PERCENT_CURRENCY_REGEX = /(?:\$|€|£)?\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g;

export function validateRewrite(
  originalText: string,
  rawRewrittenText: string,
  options: ValidationOptions = {}
): ValidationResult {
  const warnings: string[] = [];
  const droppedUrls: string[] = [];
  const droppedCitations: string[] = [];
  const droppedCodeSpans: string[] = [];
  const missingProtectedTerms: string[] = [];
  const numericalDiscrepancies: string[] = [];

  // 1. Basic Existence and Non-Empty Validation
  if (!rawRewrittenText || !rawRewrittenText.trim()) {
    return {
      isValid: false,
      sanitizedText: '',
      warnings: ['Model produced an empty response.'],
      droppedUrls,
      droppedCitations,
      droppedCodeSpans,
      missingProtectedTerms,
      numericalDiscrepancies,
      needsRetry: true,
      retryReason: 'EMPTY_OUTPUT',
    };
  }

  // 2. Sanitize any accidental wrapper markers
  let sanitized = rawRewrittenText.trim();
  sanitized = sanitized.replace(/^<draft_to_edit>\s*/i, '').replace(/\s*<\/draft_to_edit>$/i, '');
  if (sanitized.startsWith('```') && sanitized.endsWith('```')) {
    // Only strip fences if the original did not start with ```
    if (!originalText.trim().startsWith('```')) {
      sanitized = sanitized.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }
  }

  // Check if sanitized text collapsed to empty
  if (!sanitized) {
    return {
      isValid: false,
      sanitizedText: '',
      warnings: ['Model output contained only wrapper markers without prose.'],
      droppedUrls,
      droppedCitations,
      droppedCodeSpans,
      missingProtectedTerms,
      numericalDiscrepancies,
      needsRetry: true,
      retryReason: 'EMPTY_OUTPUT',
    };
  }

  // 3. Degenerate repetition check
  const sentences = sanitized.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 10);
  for (let i = 0; i < sentences.length - 2; i++) {
    if (sentences[i] === sentences[i + 1] && sentences[i + 1] === sentences[i + 2]) {
      warnings.push('Detected repetitive phrasing loop in output.');
      return {
        isValid: false,
        sanitizedText: sanitized,
        warnings,
        droppedUrls,
        droppedCitations,
        droppedCodeSpans,
        missingProtectedTerms,
        numericalDiscrepancies,
        needsRetry: true,
        retryReason: 'REPETITIVE_LOOP',
      };
    }
  }

  // 4. URL preservation check
  const originalUrls = Array.from(new Set(originalText.match(URL_REGEX) || []));
  for (const url of originalUrls) {
    if (!sanitized.includes(url)) {
      droppedUrls.push(url);
    }
  }
  if (droppedUrls.length > 0) {
    warnings.push(`Protected URL(s) missing from rewrite: ${droppedUrls.join(', ')}`);
  }

  // 5. Code block & span preservation check
  const originalCodeBlocks = Array.from(new Set(originalText.match(CODE_BLOCK_REGEX) || []));
  for (const block of originalCodeBlocks) {
    if (!sanitized.includes(block)) {
      droppedCodeSpans.push(block);
    }
  }
  const originalInlineCodes = Array.from(new Set(originalText.match(INLINE_CODE_REGEX) || []));
  for (const inline of originalInlineCodes) {
    if (!sanitized.includes(inline)) {
      droppedCodeSpans.push(inline);
    }
  }
  if (droppedCodeSpans.length > 0) {
    warnings.push(`Protected code snippet(s) modified or omitted.`);
  }

  // 6. Citation preservation check
  const originalCitations = Array.from(new Set(originalText.match(CITATION_REGEX) || []));
  for (const cite of originalCitations) {
    if (!sanitized.includes(cite)) {
      droppedCitations.push(cite);
    }
  }
  if (droppedCitations.length > 0) {
    warnings.push(`Academic citation(s) missing from rewrite: ${droppedCitations.join(', ')}`);
  }

  // 7. Protected terms check
  if (options.protectedTerms && options.protectedTerms.length > 0) {
    const lowerSanitized = sanitized.toLowerCase();
    for (const term of options.protectedTerms) {
      const cleanTerm = term.trim();
      if (!cleanTerm) continue;
      if (!lowerSanitized.includes(cleanTerm.toLowerCase())) {
        missingProtectedTerms.push(cleanTerm);
      }
    }
    if (missingProtectedTerms.length > 0) {
      warnings.push(`Protected term(s) not found in rewrite: ${missingProtectedTerms.join(', ')}`);
    }
  }

  // 8. Numerical preservation check
  const origNumbers = Array.from(new Set(originalText.match(NUMBER_PERCENT_CURRENCY_REGEX) || []));
  const newNumbers = new Set(sanitized.match(NUMBER_PERCENT_CURRENCY_REGEX) || []);
  const missingNumbers = origNumbers.filter((n) => !newNumbers.has(n));
  if (missingNumbers.length > 0) {
    // Only warn if significant specific numbers (e.g. 3.14, $450) disappeared
    numericalDiscrepancies.push(...missingNumbers);
    if (missingNumbers.length <= 4) {
      warnings.push(`Review numbers: ${missingNumbers.join(', ')} may have been modified.`);
    } else {
      warnings.push(`Multiple numerical figures from the draft were altered or omitted.`);
    }
  }

  // 9. Length disparity warnings
  const origWords = countWords(originalText);
  const newWords = countWords(sanitized);

  if (origWords > 15) {
    if (newWords < origWords * 0.45) {
      warnings.push('The rewrite is significantly shorter than the original draft (<45% word count).');
    } else if (newWords > origWords * 1.65) {
      warnings.push('The rewrite expanded the text by more than 65%.');
    }
  }

  // Decide if an automatic retry is justified (only for objective drops of critical entities like URLs or empty output)
  const needsRetry = droppedUrls.length > 0 && originalUrls.length <= 3;
  const retryReason = needsRetry ? 'DROPPED_URLS' : undefined;

  return {
    isValid: true,
    sanitizedText: sanitized,
    warnings,
    droppedUrls,
    droppedCitations,
    droppedCodeSpans,
    missingProtectedTerms,
    numericalDiscrepancies,
    needsRetry,
    retryReason,
  };
}
