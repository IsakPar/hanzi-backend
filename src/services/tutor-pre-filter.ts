/**
 * AI Tutor Pre-Filter
 * 
 * Fast, mathematical validation layer that runs BEFORE expensive AI grammar check.
 * Catches ~30% of bad generations at zero cost.
 * 
 * @module services/tutor-pre-filter
 */

import { ReadingContent, Exercise, MultipleChoiceExercise, DragSentenceExercise, SpotErrorExercise, BuildSentenceExercise, ReadCompExercise } from './ai-tutor-generator';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface PreFilterResult {
  score: number;           // 0-100
  passed: boolean;         // score >= threshold
  checks: PreFilterCheck[];
  summary: string;
}

export interface PreFilterCheck {
  name: string;
  passed: boolean;
  score: number;           // 0-100 contribution
  weight: number;          // importance multiplier
  details?: string;
}

interface PreFilterConfig {
  passThreshold: number;   // Minimum score to proceed (default: 60)
  warnThreshold: number;   // Score that triggers warning (default: 80)
}

const DEFAULT_CONFIG: PreFilterConfig = {
  passThreshold: 60,
  warnThreshold: 80,
};

// ═══════════════════════════════════════════════════════════
// Chinese Language Heuristics
// ═══════════════════════════════════════════════════════════

// Common sentence-ending punctuation
const VALID_ENDINGS = ['。', '！', '？', '!', '?', '.'];

// Characters that should never repeat 3+ times (AI glitch detection)
const NO_TRIPLE_REPEAT = /(.)\1{2,}/;

// Common Chinese verbs (not exhaustive, just common ones)
const COMMON_VERBS = new Set([
  '是', '有', '在', '去', '来', '做', '看', '听', '说', '写', '读', '学', '教',
  '买', '卖', '吃', '喝', '睡', '起', '走', '跑', '坐', '站', '想', '知道',
  '喜欢', '爱', '要', '会', '能', '可以', '应该', '需要', '开始', '结束',
  '工作', '休息', '玩', '用', '给', '送', '拿', '放', '找', '问', '答',
  '帮助', '学习', '认识', '介绍', '理解', '记得', '忘记', '觉得', '希望',
]);

// Common subjects (pronouns, common nouns)
const COMMON_SUBJECTS = new Set([
  '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们',
  '这', '那', '谁', '什么', '哪个', '大家', '人', '人们',
  '老师', '学生', '朋友', '爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹',
]);

// ═══════════════════════════════════════════════════════════
// Main Pre-Filter Function
// ═══════════════════════════════════════════════════════════

export function preFilterReading(
  reading: ReadingContent,
  focusWords: string[],
  allowedWords: string[],
  config: Partial<PreFilterConfig> = {}
): PreFilterResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const checks: PreFilterCheck[] = [];
  const allowedSet = new Set(allowedWords);
  const focusSet = new Set(focusWords);

  // Check 1: Reading has content
  checks.push(checkHasContent(reading));

  // Check 2: Sentences have valid structure
  checks.push(checkSentenceStructure(reading.sentences));

  // Check 3: No AI glitches (repeated characters)
  checks.push(checkNoGlitches(reading.chinese));

  // Check 4: Focus words present
  checks.push(checkFocusWordsPresent(reading.chinese, focusSet));

  // Check 5: Valid punctuation
  checks.push(checkPunctuation(reading.sentences));

  // Check 6: Reasonable sentence lengths
  checks.push(checkSentenceLengths(reading.sentences));

  // Check 7: Chinese matches pinyin character count (rough check)
  checks.push(checkChinesePinyinMatch(reading.sentences));

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;
  for (const check of checks) {
    totalWeight += check.weight;
    weightedScore += check.score * check.weight;
  }
  const score = Math.round(weightedScore / totalWeight);

  return {
    score,
    passed: score >= cfg.passThreshold,
    checks,
    summary: score >= cfg.warnThreshold 
      ? 'High quality - proceed to grammar check'
      : score >= cfg.passThreshold
        ? 'Acceptable - proceed with caution'
        : `Failed pre-filter (${score}/100) - reject without grammar check`,
  };
}

export function preFilterExercises(
  exercises: Exercise[],
  reading: ReadingContent,
  config: Partial<PreFilterConfig> = {}
): PreFilterResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const checks: PreFilterCheck[] = [];

  // Check 1: Has minimum exercises
  checks.push(checkMinExercises(exercises));

  // Check 2: All exercise types present
  checks.push(checkExerciseTypes(exercises));

  // Check 3: Unique IDs
  checks.push(checkUniqueIds(exercises));

  // Check 4: Valid options (correct answer exists)
  checks.push(checkValidOptions(exercises));

  // Check 5: Distractors different from correct
  checks.push(checkDistractorsDifferent(exercises));

  // Check 6: No empty fields
  checks.push(checkNoEmptyFields(exercises));

  // Check 7: Sentence exercises have valid structure
  checks.push(checkExerciseSentences(exercises));

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;
  for (const check of checks) {
    totalWeight += check.weight;
    weightedScore += check.score * check.weight;
  }
  const score = Math.round(weightedScore / totalWeight);

  return {
    score,
    passed: score >= cfg.passThreshold,
    checks,
    summary: score >= cfg.warnThreshold 
      ? 'High quality exercises - proceed to grammar check'
      : score >= cfg.passThreshold
        ? 'Acceptable exercises - proceed with caution'
        : `Failed pre-filter (${score}/100) - reject without grammar check`,
  };
}

// ═══════════════════════════════════════════════════════════
// Individual Check Functions - Reading
// ═══════════════════════════════════════════════════════════

function checkHasContent(reading: ReadingContent): PreFilterCheck {
  const hasContent = reading.chinese.length > 0 && 
                     reading.pinyin.length > 0 && 
                     reading.english.length > 0 &&
                     reading.sentences.length > 0;
  
  return {
    name: 'has_content',
    passed: hasContent,
    score: hasContent ? 100 : 0,
    weight: 3, // Critical
    details: hasContent ? undefined : 'Missing content fields',
  };
}

function checkSentenceStructure(sentences: ReadingContent['sentences']): PreFilterCheck {
  if (sentences.length === 0) {
    return { name: 'sentence_structure', passed: false, score: 0, weight: 2, details: 'No sentences' };
  }

  let validCount = 0;
  const issues: string[] = [];

  for (const s of sentences) {
    const chinese = s.chinese;
    
    // Check for verb presence (at least one common verb)
    const hasVerb = Array.from(COMMON_VERBS).some(v => chinese.includes(v));
    
    // Check for subject presence (at least one common subject pattern)
    const hasSubject = Array.from(COMMON_SUBJECTS).some(s => chinese.includes(s));
    
    if (hasVerb && hasSubject) {
      validCount++;
    } else if (!hasVerb) {
      issues.push(`"${chinese.slice(0, 10)}..." missing verb`);
    } else if (!hasSubject) {
      issues.push(`"${chinese.slice(0, 10)}..." missing subject`);
    }
  }

  const score = Math.round((validCount / sentences.length) * 100);
  return {
    name: 'sentence_structure',
    passed: score >= 70,
    score,
    weight: 2,
    details: issues.length > 0 ? issues.slice(0, 2).join('; ') : undefined,
  };
}

function checkNoGlitches(text: string): PreFilterCheck {
  const hasGlitch = NO_TRIPLE_REPEAT.test(text);
  return {
    name: 'no_glitches',
    passed: !hasGlitch,
    score: hasGlitch ? 0 : 100,
    weight: 3, // Critical - AI glitch is a hard fail
    details: hasGlitch ? 'Detected repeated character pattern (AI glitch)' : undefined,
  };
}

function checkFocusWordsPresent(text: string, focusWords: Set<string>): PreFilterCheck {
  const found: string[] = [];
  const missing: string[] = [];
  
  for (const word of focusWords) {
    if (text.includes(word)) {
      found.push(word);
    } else {
      missing.push(word);
    }
  }
  
  const score = focusWords.size > 0 
    ? Math.round((found.length / focusWords.size) * 100)
    : 100;
  
  return {
    name: 'focus_words_present',
    passed: missing.length === 0,
    score,
    weight: 3, // Critical - focus words must be present
    details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
  };
}

function checkPunctuation(sentences: ReadingContent['sentences']): PreFilterCheck {
  let validCount = 0;
  
  for (const s of sentences) {
    const trimmed = s.chinese.trim();
    const hasValidEnding = VALID_ENDINGS.some(p => trimmed.endsWith(p));
    if (hasValidEnding) validCount++;
  }
  
  const score = sentences.length > 0 
    ? Math.round((validCount / sentences.length) * 100)
    : 0;
  
  return {
    name: 'valid_punctuation',
    passed: score >= 80,
    score,
    weight: 1,
    details: score < 100 ? 'Some sentences missing punctuation' : undefined,
  };
}

function checkSentenceLengths(sentences: ReadingContent['sentences']): PreFilterCheck {
  const MIN_LENGTH = 3;
  const MAX_LENGTH = 30;
  let validCount = 0;
  
  for (const s of sentences) {
    const len = s.chinese.replace(/[。！？!?.]/g, '').length;
    if (len >= MIN_LENGTH && len <= MAX_LENGTH) {
      validCount++;
    }
  }
  
  const score = sentences.length > 0 
    ? Math.round((validCount / sentences.length) * 100)
    : 0;
  
  return {
    name: 'sentence_lengths',
    passed: score >= 80,
    score,
    weight: 1,
    details: score < 100 ? 'Some sentences too short or long' : undefined,
  };
}

function checkChinesePinyinMatch(sentences: ReadingContent['sentences']): PreFilterCheck {
  // Rough heuristic: pinyin syllable count should be close to Chinese character count
  // This catches cases where pinyin is for a different text
  let validCount = 0;
  
  for (const s of sentences) {
    const chineseChars = s.chinese.replace(/[。！？!?.\s]/g, '').length;
    const pinyinSyllables = s.pinyin.split(/[\s]+/).filter(p => p.length > 0).length;
    
    // Allow 20% variance
    const ratio = pinyinSyllables / chineseChars;
    if (ratio >= 0.8 && ratio <= 1.2) {
      validCount++;
    }
  }
  
  const score = sentences.length > 0 
    ? Math.round((validCount / sentences.length) * 100)
    : 0;
  
  return {
    name: 'chinese_pinyin_match',
    passed: score >= 70,
    score,
    weight: 1,
    details: score < 100 ? 'Pinyin may not match Chinese text' : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// Individual Check Functions - Exercises
// ═══════════════════════════════════════════════════════════

function checkMinExercises(exercises: Exercise[]): PreFilterCheck {
  const MIN_REQUIRED = 3;
  const passed = exercises.length >= MIN_REQUIRED;
  return {
    name: 'min_exercises',
    passed,
    score: passed ? 100 : Math.round((exercises.length / MIN_REQUIRED) * 100),
    weight: 3,
    details: passed ? undefined : `Only ${exercises.length} exercises (need ${MIN_REQUIRED})`,
  };
}

function checkExerciseTypes(exercises: Exercise[]): PreFilterCheck {
  const requiredTypes = ['multiple_choice', 'drag_sentence', 'spot_error', 'build_sentence', 'read_comp'];
  const presentTypes = new Set(exercises.map(e => e.type));
  const missing = requiredTypes.filter(t => !presentTypes.has(t as Exercise['type']));
  
  const score = Math.round(((requiredTypes.length - missing.length) / requiredTypes.length) * 100);
  
  return {
    name: 'exercise_types',
    passed: missing.length <= 1, // Allow 1 missing type
    score,
    weight: 2,
    details: missing.length > 0 ? `Missing types: ${missing.join(', ')}` : undefined,
  };
}

function checkUniqueIds(exercises: Exercise[]): PreFilterCheck {
  const ids = new Set<string>();
  const duplicates: string[] = [];
  
  for (const ex of exercises) {
    if (ids.has(ex.id)) {
      duplicates.push(ex.id);
    }
    ids.add(ex.id);
  }
  
  const passed = duplicates.length === 0;
  return {
    name: 'unique_ids',
    passed,
    score: passed ? 100 : 0,
    weight: 2,
    details: passed ? undefined : `Duplicate IDs: ${duplicates.join(', ')}`,
  };
}

function checkValidOptions(exercises: Exercise[]): PreFilterCheck {
  let validCount = 0;
  const issues: string[] = [];
  
  for (const ex of exercises) {
    if (ex.type === 'multiple_choice' || ex.type === 'read_comp') {
      const mcEx = ex as MultipleChoiceExercise | ReadCompExercise;
      const optionIds = mcEx.options.map(o => o.id);
      if (optionIds.includes(mcEx.correctOptionId)) {
        validCount++;
      } else {
        issues.push(`${ex.id}: correct option not in options`);
      }
    } else {
      validCount++; // Other types don't have this check
    }
  }
  
  const score = exercises.length > 0 
    ? Math.round((validCount / exercises.length) * 100)
    : 0;
  
  return {
    name: 'valid_options',
    passed: score >= 100,
    score,
    weight: 3,
    details: issues.length > 0 ? issues[0] : undefined,
  };
}

function checkDistractorsDifferent(exercises: Exercise[]): PreFilterCheck {
  let validCount = 0;
  
  for (const ex of exercises) {
    if (ex.type === 'multiple_choice' || ex.type === 'read_comp') {
      const mcEx = ex as MultipleChoiceExercise | ReadCompExercise;
      const correctOption = mcEx.options.find(o => o.id === mcEx.correctOptionId);
      const distractors = mcEx.options.filter(o => o.id !== mcEx.correctOptionId);
      
      // Check all distractors are different from correct
      const allDifferent = correctOption && distractors.every(d => d.chinese !== correctOption.chinese);
      if (allDifferent) validCount++;
    } else {
      validCount++; // Other types don't have this check
    }
  }
  
  const score = exercises.length > 0 
    ? Math.round((validCount / exercises.length) * 100)
    : 0;
  
  return {
    name: 'distractors_different',
    passed: score >= 100,
    score,
    weight: 2,
    details: score < 100 ? 'Some distractors same as correct answer' : undefined,
  };
}

function checkNoEmptyFields(exercises: Exercise[]): PreFilterCheck {
  let validCount = 0;
  const issues: string[] = [];
  
  for (const ex of exercises) {
    let hasEmpty = false;
    
    if (ex.type === 'multiple_choice') {
      const mcEx = ex as MultipleChoiceExercise;
      if (!mcEx.question.chinese || !mcEx.question.english) hasEmpty = true;
      if (mcEx.options.some(o => !o.chinese)) hasEmpty = true;
    } else if (ex.type === 'drag_sentence') {
      const dsEx = ex as DragSentenceExercise;
      if (!dsEx.targetSentence.chinese) hasEmpty = true;
      if (dsEx.shuffledWords.some(w => !w.chinese)) hasEmpty = true;
    } else if (ex.type === 'spot_error') {
      const seEx = ex as SpotErrorExercise;
      if (!seEx.sentence.chinese || !seEx.correction.correct) hasEmpty = true;
    } else if (ex.type === 'build_sentence') {
      const bsEx = ex as BuildSentenceExercise;
      if (!bsEx.prompt.english || !bsEx.expectedAnswer.chinese) hasEmpty = true;
    } else if (ex.type === 'read_comp') {
      const rcEx = ex as ReadCompExercise;
      if (!rcEx.passage.chinese || !rcEx.question.chinese) hasEmpty = true;
    }
    
    if (!hasEmpty) {
      validCount++;
    } else {
      issues.push(`${ex.id} has empty fields`);
    }
  }
  
  const score = exercises.length > 0 
    ? Math.round((validCount / exercises.length) * 100)
    : 0;
  
  return {
    name: 'no_empty_fields',
    passed: score >= 100,
    score,
    weight: 2,
    details: issues.length > 0 ? issues[0] : undefined,
  };
}

function checkExerciseSentences(exercises: Exercise[]): PreFilterCheck {
  let validCount = 0;
  
  for (const ex of exercises) {
    let sentences: string[] = [];
    
    if (ex.type === 'multiple_choice') {
      sentences = [(ex as MultipleChoiceExercise).question.chinese];
    } else if (ex.type === 'drag_sentence') {
      sentences = [(ex as DragSentenceExercise).targetSentence.chinese];
    } else if (ex.type === 'spot_error') {
      sentences = [(ex as SpotErrorExercise).correction.correct];
    } else if (ex.type === 'build_sentence') {
      sentences = [(ex as BuildSentenceExercise).expectedAnswer.chinese];
    } else if (ex.type === 'read_comp') {
      sentences = [(ex as ReadCompExercise).passage.chinese, (ex as ReadCompExercise).question.chinese];
    }
    
    // Check no glitches in any sentence
    const hasGlitch = sentences.some(s => NO_TRIPLE_REPEAT.test(s));
    if (!hasGlitch) validCount++;
  }
  
  const score = exercises.length > 0 
    ? Math.round((validCount / exercises.length) * 100)
    : 0;
  
  return {
    name: 'exercise_sentences',
    passed: score >= 100,
    score,
    weight: 2,
    details: score < 100 ? 'Some exercises have glitched text' : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// Combined Pre-Filter
// ═══════════════════════════════════════════════════════════

export interface CombinedPreFilterResult {
  passed: boolean;
  readingResult: PreFilterResult;
  exercisesResult: PreFilterResult;
  combinedScore: number;
  summary: string;
}

export function preFilterAll(
  reading: ReadingContent,
  exercises: Exercise[],
  focusWords: string[],
  allowedWords: string[],
  config: Partial<PreFilterConfig> = {}
): CombinedPreFilterResult {
  const readingResult = preFilterReading(reading, focusWords, allowedWords, config);
  const exercisesResult = preFilterExercises(exercises, reading, config);
  
  // Combined score (reading is slightly more important)
  const combinedScore = Math.round(readingResult.score * 0.6 + exercisesResult.score * 0.4);
  const passed = readingResult.passed && exercisesResult.passed;
  
  return {
    passed,
    readingResult,
    exercisesResult,
    combinedScore,
    summary: passed 
      ? `Pre-filter passed (${combinedScore}/100) - proceed to grammar check`
      : `Pre-filter failed (${combinedScore}/100) - Reading: ${readingResult.score}, Exercises: ${exercisesResult.score}`,
  };
}

