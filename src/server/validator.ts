import { countWords } from '../shared/schemas.ts';

export interface ValidationOptions {
  protectedTerms?: string[];
  preserveStructure?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedText: string;
  warnings: string[];
  warningCategories: string[];
  droppedUrls: string[];
  droppedCitations: string[];
  droppedCodeSpans: string[];
  missingProtectedTerms: string[];
  numericalDiscrepancies: string[];
  needsRetry: boolean;
  retryReason?: string;
  restoredEntitiesCount: number;
  placeholderIntegrityVerified: boolean;
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
  sessionNonce: string;
}

export interface RestorationResult {
  restoredText: string;
  restoredCount: number;
  missingEntities: ProtectedEntity[];
  duplicatedEntities: ProtectedEntity[];
  warnings: string[];
  placeholderIntegrityVerified: boolean;
}

const URL_REGEX = /https?:\/\/[^\s)\]]+/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;
const DISPLAY_MATH_REGEX = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/g;
const INLINE_MATH_CANDIDATE_REGEX = /\$(?![0-9])([^$\n]+?)\$/g;
const NUMBER_PERCENT_CURRENCY_REGEX = /(?:\$|€|£)?\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g;

// Robust citation regex covering numeric [1, 2], and APA/Harvard (Smith, 2020), (Smith & Jones, 2021), (Vaswani et al., 2017)
const CITATION_REGEX =
  /(?:\[\d+(?:[,\s–-]+\d+)*\]|\[[A-Z][a-zA-Z]+(?:\s+et\s+al\.?|,?\s+(?:and|&)\s+[A-Z][a-zA-Z]+)?,?\s*\d{4}[a-z]?\]|\([A-Z][a-zA-Z]+(?:\s+et\s+al\.?|,?\s+(?:and|&)\s+[A-Z][a-zA-Z]+)?,?\s*\d{4}[a-z]?\))/g;

function isLikelyLatexMath(interior: string): boolean {
  // Contains LaTeX backslash command, super/subscripts, or math relation operators
  return (
    interior.includes('\\') ||
    /[=+\-*/^_<>≤≥±≈]/.test(interior) ||
    /^(?:[a-zA-Z]|[a-zA-Z]_\d+|[a-zA-Z]\^[0-9a-zA-Z])$/.test(interior.trim())
  );
}

/**
 * Stage D: Deterministic Protected Content Extraction.
 * Replaces URLs, citations, code blocks, and formulas with collision-proof placeholders.
 */
export function extractProtectedEntities(
  text: string,
  options?: { sessionNonce?: string }
): ExtractionResult {
  if (!text) return { processedText: '', entities: [], sessionNonce: '' };

  const entities: ProtectedEntity[] = [];
  const sessionNonce =
    options?.sessionNonce || Math.random().toString(36).substring(2, 8).toUpperCase();
  let workingText = text;
  let counter = 0;

  // 1. Code blocks first (avoids inner backtick/URL collisions)
  workingText = workingText.replace(CODE_BLOCK_REGEX, (match) => {
    const id = `__HUMANLY_PROT_${sessionNonce}_CODE_BLOCK_${counter++}__`;
    entities.push({ id, type: 'code_block', original: match, placeholder: id });
    return id;
  });

  // 2. Inline code snippets
  workingText = workingText.replace(INLINE_CODE_REGEX, (match) => {
    const id = `__HUMANLY_PROT_${sessionNonce}_INLINE_CODE_${counter++}__`;
    entities.push({ id, type: 'inline_code', original: match, placeholder: id });
    return id;
  });

  // 3. Display Math formulas ($$...$$ or \[...\])
  workingText = workingText.replace(DISPLAY_MATH_REGEX, (match) => {
    const id = `__HUMANLY_PROT_${sessionNonce}_MATH_${counter++}__`;
    entities.push({ id, type: 'math', original: match, placeholder: id });
    return id;
  });

  // 4. Inline LaTeX math formulas ($...$ not starting with numbers and containing math syntax)
  workingText = workingText.replace(INLINE_MATH_CANDIDATE_REGEX, (match, interior: string) => {
    if (isLikelyLatexMath(interior)) {
      const id = `__HUMANLY_PROT_${sessionNonce}_MATH_${counter++}__`;
      entities.push({ id, type: 'math', original: match, placeholder: id });
      return id;
    }
    return match;
  });

  // 5. URLs with adjacent punctuation protection
  workingText = workingText.replace(URL_REGEX, (match) => {
    // Preserve trailing sentence punctuation (.,;:!?) outside the URL token
    const trailingPunctMatch = match.match(/[.,;:!?]+$/);
    const trailingPunct = trailingPunctMatch ? trailingPunctMatch[0] : '';
    const cleanUrl = match.slice(0, match.length - trailingPunct.length);

    const id = `__HUMANLY_PROT_${sessionNonce}_URL_${counter++}__`;
    entities.push({ id, type: 'url', original: cleanUrl, placeholder: id });
    return id + trailingPunct;
  });

  // 6. Academic citations ([1], (Author et al., 2024), (Smith, 2020))
  workingText = workingText.replace(CITATION_REGEX, (match) => {
    const id = `__HUMANLY_PROT_${sessionNonce}_CITE_${counter++}__`;
    entities.push({ id, type: 'citation', original: match, placeholder: id });
    return id;
  });

  return { processedText: workingText, entities, sessionNonce };
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

  if (duplicatedEntities.length > 0) {
    warnings.push(`One or more protected placeholders were duplicated by the model.`);
  }

  // Clean any un-restored placeholder tokens belonging specifically to this session's entities
  for (const entity of entities) {
    if (restoredText.includes(entity.placeholder)) {
      restoredText = restoredText.replaceAll(entity.placeholder, '');
    }
  }

  const placeholderIntegrityVerified =
    entities.length === 0 || (missingEntities.length === 0 && duplicatedEntities.length === 0);

  return {
    restoredText,
    restoredCount,
    missingEntities,
    duplicatedEntities,
    warnings,
    placeholderIntegrityVerified,
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
  const warningCategories: string[] = [];
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
      warningCategories: ['EMPTY_OUTPUT'],
      droppedUrls,
      droppedCitations,
      droppedCodeSpans,
      missingProtectedTerms,
      numericalDiscrepancies,
      needsRetry: true,
      retryReason: 'EMPTY_OUTPUT',
      restoredEntitiesCount: 0,
      placeholderIntegrityVerified: false,
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
      warningCategories: ['EMPTY_OUTPUT'],
      droppedUrls,
      droppedCitations,
      droppedCodeSpans,
      missingProtectedTerms,
      numericalDiscrepancies,
      needsRetry: true,
      retryReason: 'EMPTY_OUTPUT',
      restoredEntitiesCount: 0,
      placeholderIntegrityVerified: false,
    };
  }

  // 3. Degenerate repetition check
  const sentences = sanitized.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 10);
  for (let i = 0; i < sentences.length - 2; i++) {
    if (sentences[i] === sentences[i + 1] && sentences[i + 1] === sentences[i + 2]) {
      warnings.push('Detected repetitive phrasing loop in output.');
      warningCategories.push('REPETITIVE_LOOP');
      return {
        isValid: false,
        sanitizedText: sanitized,
        warnings,
        warningCategories,
        droppedUrls,
        droppedCitations,
        droppedCodeSpans,
        missingProtectedTerms,
        numericalDiscrepancies,
        needsRetry: true,
        retryReason: 'REPETITIVE_LOOP',
        restoredEntitiesCount: 0,
        placeholderIntegrityVerified: false,
      };
    }
  }

  // 4. Restore protected entities if provided
  let restoredCount = 0;
  let placeholderIntegrityVerified = true;
  if (entities.length > 0) {
    const restoration = restoreProtectedEntities(sanitized, entities);
    sanitized = restoration.restoredText;
    restoredCount = restoration.restoredCount;
    placeholderIntegrityVerified = restoration.placeholderIntegrityVerified;
    if (restoration.warnings.length > 0) {
      warnings.push(...restoration.warnings);
      warningCategories.push('PLACEHOLDER_INTEGRITY');
    }
  }

  // 5. URL preservation check
  const originalUrls = Array.from(new Set(originalText.match(URL_REGEX) || [])).map((u) =>
    u.replace(/[.,;:!?]+$/, '')
  );
  for (const url of originalUrls) {
    if (!sanitized.includes(url)) {
      droppedUrls.push(url);
    }
  }
  if (droppedUrls.length > 0 && !warnings.some((w) => w.includes('Protected URL(s) missing'))) {
    warnings.push(`Protected URL(s) missing from rewrite: ${droppedUrls.join(', ')}`);
    warningCategories.push('DROPPED_URLS');
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
    warningCategories.push('DROPPED_CODE');
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
    warningCategories.push('DROPPED_CITATIONS');
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
      warningCategories.push('MISSING_PROTECTED_TERMS');
    }
  }

  // 9. Numerical figures preservation check
  const origNumbers = Array.from(new Set(originalText.match(NUMBER_PERCENT_CURRENCY_REGEX) || []));
  const newNumbers = new Set(sanitized.match(NUMBER_PERCENT_CURRENCY_REGEX) || []);
  const missingNumbers = origNumbers.filter((n) => !newNumbers.has(n));
  if (missingNumbers.length > 0) {
    numericalDiscrepancies.push(...missingNumbers);
    warningCategories.push('NUMERICAL_DISCREPANCY');
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
      warningCategories.push('LENGTH_COLLAPSE');
    } else if (newWords > origWords * 1.65) {
      warnings.push('The rewrite expanded the text by more than 65%.');
      warningCategories.push('LENGTH_EXPANSION');
    }
  }

  // Decide if an automatic retry is justified (only for objective drops of critical entities like URLs or empty output)
  const needsRetry = droppedUrls.length > 0 && originalUrls.length <= 3;
  const retryReason = needsRetry ? 'DROPPED_URLS' : undefined;

  return {
    isValid: true,
    sanitizedText: sanitized,
    warnings,
    warningCategories: Array.from(new Set(warningCategories)),
    droppedUrls,
    droppedCitations,
    droppedCodeSpans,
    missingProtectedTerms,
    numericalDiscrepancies,
    needsRetry,
    retryReason,
    restoredEntitiesCount: restoredCount,
    placeholderIntegrityVerified,
  };
}
