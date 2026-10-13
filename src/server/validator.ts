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
  restoredEntitiesCount: number;
}

export interface ProtectedEntity {
  id: string;
  type: 'code_block' | 'inline_code' | 'math' | 'url' | 'citation';
  original: string;
  placeholder: string;
}

export interface ExtractionResult {
  processedText: string;
  entities: ProtectedEntity[];
}

export interface RestorationResult {
  restoredText: string;
  restoredCount: number;
  missingEntities: ProtectedEntity[];
  duplicatedEntities: ProtectedEntity[];
  warnings: string[];
}

const URL_REGEX = /https?:\/\/[^\s)\]]+/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;
const CITATION_REGEX =
  /\[(?:\d+(?:[,\s–-]+\d+)*|[A-Za-z]+ et al\.,?\s*\d{4})\]|\([A-Za-z]+ et al\.,?\s*\d{4}\)|\([A-Za-z]+ & [A-Za-z]+,?\s*\d{4}\)/g;
const DISPLAY_MATH_REGEX = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/g;
const INLINE_MATH_REGEX = /\$(?![0-9])([^$\n]+?)\$/g;
const NUMBER_PERCENT_CURRENCY_REGEX = /(?:\$|€|£)?\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g;

/**
 * Stage D: Deterministic Protected Content Extraction.
 * Replaces URLs, citations, code blocks, and formulas with collision-proof placeholders.
 */
export function extractProtectedEntities(text: string): ExtractionResult {
  if (!text) return { processedText: '', entities: [] };

  const entities: ProtectedEntity[] = [];
  let workingText = text;
  let counter = 0;

  // 1. Code blocks first
  workingText = workingText.replace(CODE_BLOCK_REGEX, (match) => {
    const id = `__HUMANLY_PROT_CODE_BLOCK_${counter++}__`;
    entities.push({ id, type: 'code_block', original: match, placeholder: id });
    return id;
  });

  // 2. Inline code snippets
  workingText = workingText.replace(INLINE_CODE_REGEX, (match) => {
    const id = `__HUMANLY_PROT_INLINE_CODE_${counter++}__`;
    entities.push({ id, type: 'inline_code', original: match, placeholder: id });
    return id;
  });

  // 3. Display Math formulas ($$...$$ or \[...\])
  workingText = workingText.replace(DISPLAY_MATH_REGEX, (match) => {
    const id = `__HUMANLY_PROT_MATH_${counter++}__`;
    entities.push({ id, type: 'math', original: match, placeholder: id });
    return id;
  });

  // 4. Inline LaTeX math formulas ($...$ not starting with numbers)
  workingText = workingText.replace(INLINE_MATH_REGEX, (match) => {
    const id = `__HUMANLY_PROT_MATH_${counter++}__`;
    entities.push({ id, type: 'math', original: match, placeholder: id });
    return id;
  });

  // 5. URLs
  workingText = workingText.replace(URL_REGEX, (match) => {
    const id = `__HUMANLY_PROT_URL_${counter++}__`;
    entities.push({ id, type: 'url', original: match, placeholder: id });
    return id;
  });

  // 6. Academic citations ([1], (Author et al., 2024))
  workingText = workingText.replace(CITATION_REGEX, (match) => {
    const id = `__HUMANLY_PROT_CITE_${counter++}__`;
    entities.push({ id, type: 'citation', original: match, placeholder: id });
    return id;
  });

  return { processedText: workingText, entities };
}

/**
 * Stage G: Deterministic Content Restoration.
 * Restores exact extracted tokens from placeholders and verifies single-use integrity.
 */
export function restoreProtectedEntities(
  rewrittenText: string,
  entities: ProtectedEntity[]
): RestorationResult {
  let restoredText = rewrittenText;
  let restoredCount = 0;
  const missingEntities: ProtectedEntity[] = [];
  const duplicatedEntities: ProtectedEntity[] = [];
  const warnings: string[] = [];

  for (const entity of entities) {
    if (!restoredText.includes(entity.placeholder)) {
      missingEntities.push(entity);
      continue;
    }

    // Check count of placeholder occurrences
    const occurrences = restoredText.split(entity.placeholder).length - 1;
    if (occurrences > 1) {
      duplicatedEntities.push(entity);
    }

    // Replace all occurrences with exact original token (using fn to avoid $$ replacement escape sequence)
    restoredText = restoredText.replaceAll(entity.placeholder, () => entity.original);
    restoredCount++;
  }

  // Handle missing entities
  if (missingEntities.length > 0) {
    const missingUrls = missingEntities.filter((e) => e.type === 'url').map((e) => e.original);
    const missingCitations = missingEntities.filter((e) => e.type === 'citation').map((e) => e.original);
    const missingCode = missingEntities
      .filter((e) => e.type === 'code_block' || e.type === 'inline_code')
      .map((e) => e.original);
    const missingMath = missingEntities.filter((e) => e.type === 'math').map((e) => e.original);

    if (missingUrls.length > 0) {
      warnings.push(`Protected URL(s) missing from rewrite: ${missingUrls.join(', ')}`);
    }
    if (missingCitations.length > 0) {
      warnings.push(`Academic citation(s) missing from rewrite: ${missingCitations.join(', ')}`);
    }
    if (missingCode.length > 0) {
      warnings.push(`Protected code snippet(s) modified or omitted.`);
    }
    if (missingMath.length > 0) {
      warnings.push(`Mathematical expression(s) missing from rewrite: ${missingMath.join(', ')}`);
    }
  }

  // Clean any hallucinated placeholder tokens
  restoredText = restoredText.replace(/__HUMANLY_PROT_[A-Z_0-9]+__/g, '');

  return {
    restoredText,
    restoredCount,
    missingEntities,
    duplicatedEntities,
    warnings,
  };
}

/**
 * Stage F & H: Structural Validation and Quality Checks.
 */
export function validateRewrite(
  originalText: string,
  rawRewrittenText: string,
  options: ValidationOptions = {},
  entities: ProtectedEntity[] = []
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
      restoredEntitiesCount: 0,
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
      restoredEntitiesCount: 0,
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
        restoredEntitiesCount: 0,
      };
    }
  }

  // 4. Restore protected entities if provided
  let restoredCount = 0;
  if (entities.length > 0) {
    const restoration = restoreProtectedEntities(sanitized, entities);
    sanitized = restoration.restoredText;
    restoredCount = restoration.restoredCount;
    warnings.push(...restoration.warnings);
  }

  // 5. URL preservation check
  const originalUrls = Array.from(new Set(originalText.match(URL_REGEX) || []));
  for (const url of originalUrls) {
    if (!sanitized.includes(url)) {
      droppedUrls.push(url);
    }
  }
  if (droppedUrls.length > 0 && !warnings.some((w) => w.includes('Protected URL(s) missing'))) {
    warnings.push(`Protected URL(s) missing from rewrite: ${droppedUrls.join(', ')}`);
  }

  // 6. Code block & span preservation check
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
  if (droppedCodeSpans.length > 0 && !warnings.some((w) => w.includes('code snippet'))) {
    warnings.push(`Protected code snippet(s) modified or omitted.`);
  }

  // 7. Citation preservation check
  const originalCitations = Array.from(new Set(originalText.match(CITATION_REGEX) || []));
  for (const cite of originalCitations) {
    if (!sanitized.includes(cite)) {
      droppedCitations.push(cite);
    }
  }
  if (droppedCitations.length > 0 && !warnings.some((w) => w.includes('citation'))) {
    warnings.push(`Academic citation(s) missing from rewrite: ${droppedCitations.join(', ')}`);
  }

  // 8. Protected terms check
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

  // 9. Numerical figures preservation check
  const origNumbers = Array.from(new Set(originalText.match(NUMBER_PERCENT_CURRENCY_REGEX) || []));
  const newNumbers = new Set(sanitized.match(NUMBER_PERCENT_CURRENCY_REGEX) || []);
  const missingNumbers = origNumbers.filter((n) => !newNumbers.has(n));
  if (missingNumbers.length > 0) {
    numericalDiscrepancies.push(...missingNumbers);
    if (missingNumbers.length <= 4) {
      warnings.push(`Review numbers: ${missingNumbers.join(', ')} may have been modified.`);
    } else {
      warnings.push(`Multiple numerical figures from the draft were altered or omitted.`);
    }
  }

  // 10. Length disparity warnings
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
    restoredEntitiesCount: restoredCount,
  };
}
