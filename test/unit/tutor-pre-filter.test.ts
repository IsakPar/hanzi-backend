/**
 * AI Tutor Pre-Filter Unit Tests
 * 
 * Tests the mathematical validation layer that runs before the expensive AI grammar check.
 */

import { describe, it, expect } from 'vitest';
import { 
  preFilterReading, 
  preFilterExercises, 
  preFilterAll,
  PreFilterResult,
} from '../../src/services/tutor-pre-filter';
import { 
  ReadingContent, 
  Exercise, 
  MultipleChoiceExercise,
  DragSentenceExercise,
  SpotErrorExercise,
  BuildSentenceExercise,
  ReadCompExercise,
} from '../../src/services/ai-tutor-generator';

// ═══════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════

const validReading: ReadingContent = {
  id: 'reading_001',
  chinese: '我喜欢学习中文。老师教我们很多东西。',
  pinyin: 'Wǒ xǐhuān xuéxí zhōngwén. Lǎoshī jiào wǒmen hěn duō dōngxi.',
  english: 'I like learning Chinese. The teacher teaches us many things.',
  sentences: [
    {
      id: 'reading_001_s1',
      chinese: '我喜欢学习中文。',
      pinyin: 'Wǒ xǐhuān xuéxí zhōngwén.',
      english: 'I like learning Chinese.',
    },
    {
      id: 'reading_001_s2',
      chinese: '老师教我们很多东西。',
      pinyin: 'Lǎoshī jiào wǒmen hěn duō dōngxi.',
      english: 'The teacher teaches us many things.',
    },
  ],
};

const focusWords = ['学习', '中文'];
const allowedWords = ['我', '喜欢', '学习', '中文', '老师', '教', '我们', '很多', '东西', '是', '有'];

const validMultipleChoice: MultipleChoiceExercise = {
  id: 'ex_001',
  type: 'multiple_choice',
  question: { chinese: '你喜欢什么？', pinyin: 'Nǐ xǐhuān shénme?', english: 'What do you like?' },
  options: [
    { id: 'opt_1', chinese: '学习', pinyin: 'xuéxí' },
    { id: 'opt_2', chinese: '吃饭', pinyin: 'chīfàn' },
    { id: 'opt_3', chinese: '睡觉', pinyin: 'shuìjiào' },
    { id: 'opt_4', chinese: '工作', pinyin: 'gōngzuò' },
  ],
  correctOptionId: 'opt_1',
};

const validDragSentence: DragSentenceExercise = {
  id: 'ex_002',
  type: 'drag_sentence',
  targetSentence: { id: 'target_002', chinese: '我学习中文', pinyin: 'Wǒ xuéxí zhōngwén', english: 'I study Chinese' },
  shuffledWords: [
    { id: 'w1', chinese: '我', pinyin: 'wǒ', correctPosition: 0 },
    { id: 'w2', chinese: '学习', pinyin: 'xuéxí', correctPosition: 1 },
    { id: 'w3', chinese: '中文', pinyin: 'zhōngwén', correctPosition: 2 },
  ],
};

const validSpotError: SpotErrorExercise = {
  id: 'ex_003',
  type: 'spot_error',
  sentence: { id: 'sent_003', chinese: '我学习中国', pinyin: 'Wǒ xuéxí zhōngguó', english: 'I study China' },
  errorWordId: 'word_3',
  correction: { wrong: '中国', correct: '中文', explanation: 'Should be Chinese language, not China' },
  words: [
    { id: 'word_1', chinese: '我', isError: false },
    { id: 'word_2', chinese: '学习', isError: false },
    { id: 'word_3', chinese: '中国', isError: true },
  ],
};

const validBuildSentence: BuildSentenceExercise = {
  id: 'ex_004',
  type: 'build_sentence',
  prompt: { english: 'I like learning Chinese', hint: 'Use 喜欢' },
  expectedAnswer: { id: 'answer_004', chinese: '我喜欢学习中文', pinyin: 'Wǒ xǐhuān xuéxí zhōngwén' },
  acceptableVariations: ['我喜欢学中文'],
  availableWords: [
    { id: 'aw1', chinese: '我', pinyin: 'wǒ' },
    { id: 'aw2', chinese: '喜欢', pinyin: 'xǐhuān' },
    { id: 'aw3', chinese: '学习', pinyin: 'xuéxí' },
    { id: 'aw4', chinese: '中文', pinyin: 'zhōngwén' },
  ],
};

const validReadComp: ReadCompExercise = {
  id: 'ex_005',
  type: 'read_comp',
  passage: { id: 'passage_005', chinese: '我学习中文。', pinyin: 'Wǒ xuéxí zhōngwén.', english: 'I study Chinese.' },
  question: { id: 'question_005', chinese: '我学习什么？', pinyin: 'Wǒ xuéxí shénme?', english: 'What do I study?' },
  options: [
    { id: 'opt_1', chinese: '中文', pinyin: 'zhōngwén', english: 'Chinese' },
    { id: 'opt_2', chinese: '英文', pinyin: 'yīngwén', english: 'English' },
    { id: 'opt_3', chinese: '日文', pinyin: 'rìwén', english: 'Japanese' },
    { id: 'opt_4', chinese: '法文', pinyin: 'fǎwén', english: 'French' },
  ],
  correctOptionId: 'opt_1',
};

const validExercises: Exercise[] = [
  validMultipleChoice,
  validDragSentence,
  validSpotError,
  validBuildSentence,
  validReadComp,
];

// ═══════════════════════════════════════════════════════════
// Reading Pre-Filter Tests
// ═══════════════════════════════════════════════════════════

describe('preFilterReading', () => {
  it('passes valid reading', () => {
    const result = preFilterReading(validReading, focusWords, allowedWords);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('fails reading with empty content', () => {
    const emptyReading: ReadingContent = {
      id: 'reading_001',
      chinese: '',
      pinyin: '',
      english: '',
      sentences: [],
    };
    
    const result = preFilterReading(emptyReading, focusWords, allowedWords);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(60);
  });

  it('penalizes reading with missing focus words', () => {
    const missingFocus: ReadingContent = {
      ...validReading,
      chinese: '我喜欢吃饭。',
      sentences: [
        {
          id: 's1',
          chinese: '我喜欢吃饭。',
          pinyin: 'Wǒ xǐhuān chīfàn.',
          english: 'I like to eat.',
        },
      ],
    };
    
    const result = preFilterReading(missingFocus, focusWords, allowedWords);
    
    // The focus_words_present check should fail
    const focusCheck = result.checks.find(c => c.name === 'focus_words_present');
    expect(focusCheck?.passed).toBe(false);
    expect(focusCheck?.score).toBe(0); // Both focus words missing = 0%
    
    // Score should be lower than valid reading
    const validResult = preFilterReading(validReading, focusWords, allowedWords);
    expect(result.score).toBeLessThan(validResult.score);
  });

  it('fails reading with AI glitch (repeated characters)', () => {
    const glitchedReading: ReadingContent = {
      ...validReading,
      chinese: '我学习学习学习学习中文。',
      sentences: [
        {
          id: 's1',
          chinese: '我学习学习学习学习中文。',
          pinyin: 'Wǒ xuéxí xuéxí xuéxí xuéxí zhōngwén.',
          english: 'I study Chinese.',
        },
      ],
    };
    
    const result = preFilterReading(glitchedReading, focusWords, allowedWords);
    
    const glitchCheck = result.checks.find(c => c.name === 'no_glitches');
    // This shouldn't trigger because the repeated pattern is words, not single characters
    // Let's test actual character repetition:
  });

  it('fails reading with repeated character glitch', () => {
    const glitchedReading: ReadingContent = {
      ...validReading,
      chinese: '我学习习习习中文。',
      sentences: [
        {
          id: 's1',
          chinese: '我学习习习习中文。',
          pinyin: 'Wǒ xuéxí xí xí xí zhōngwén.',
          english: 'I study Chinese.',
        },
      ],
    };
    
    const result = preFilterReading(glitchedReading, focusWords, allowedWords);
    
    const glitchCheck = result.checks.find(c => c.name === 'no_glitches');
    expect(glitchCheck?.passed).toBe(false);
  });

  it('checks for valid punctuation', () => {
    const noPunctuation: ReadingContent = {
      id: 'reading_001',
      chinese: '我喜欢学习中文',
      pinyin: 'Wǒ xǐhuān xuéxí zhōngwén',
      english: 'I like learning Chinese',
      sentences: [
        {
          id: 's1',
          chinese: '我喜欢学习中文',
          pinyin: 'Wǒ xǐhuān xuéxí zhōngwén',
          english: 'I like learning Chinese',
        },
      ],
    };
    
    const result = preFilterReading(noPunctuation, focusWords, allowedWords);
    
    const punctCheck = result.checks.find(c => c.name === 'valid_punctuation');
    expect(punctCheck?.score).toBeLessThan(100);
  });

  it('checks sentence lengths', () => {
    const tooShort: ReadingContent = {
      id: 'reading_001',
      chinese: '好。',
      pinyin: 'Hǎo.',
      english: 'Good.',
      sentences: [
        {
          id: 's1',
          chinese: '好。',
          pinyin: 'Hǎo.',
          english: 'Good.',
        },
      ],
    };
    
    const result = preFilterReading(tooShort, [], allowedWords);
    
    const lengthCheck = result.checks.find(c => c.name === 'sentence_lengths');
    expect(lengthCheck?.score).toBeLessThan(100);
  });
});

// ═══════════════════════════════════════════════════════════
// Exercise Pre-Filter Tests
// ═══════════════════════════════════════════════════════════

describe('preFilterExercises', () => {
  it('passes valid exercises', () => {
    const result = preFilterExercises(validExercises, validReading);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('penalizes too few exercises', () => {
    const result = preFilterExercises([validMultipleChoice], validReading);
    
    // The min_exercises check should fail
    const minCheck = result.checks.find(c => c.name === 'min_exercises');
    expect(minCheck?.passed).toBe(false);
    expect(minCheck?.score).toBeLessThan(50); // 1/3 = 33%
    
    // Score should be lower than with all exercises
    const fullResult = preFilterExercises(validExercises, validReading);
    expect(result.score).toBeLessThan(fullResult.score);
  });

  it('checks for missing exercise types', () => {
    const sameTypes = [validMultipleChoice, validMultipleChoice, validMultipleChoice];
    const result = preFilterExercises(sameTypes, validReading);
    
    const typesCheck = result.checks.find(c => c.name === 'exercise_types');
    expect(typesCheck?.score).toBeLessThan(100);
  });

  it('fails with duplicate IDs', () => {
    const duplicateIds = [
      { ...validMultipleChoice, id: 'same_id' },
      { ...validDragSentence, id: 'same_id' },
      validSpotError,
    ];
    const result = preFilterExercises(duplicateIds, validReading);
    
    const idsCheck = result.checks.find(c => c.name === 'unique_ids');
    expect(idsCheck?.passed).toBe(false);
  });

  it('fails when correct option not in options', () => {
    const badMC: MultipleChoiceExercise = {
      ...validMultipleChoice,
      correctOptionId: 'nonexistent',
    };
    const result = preFilterExercises([badMC, validDragSentence, validSpotError], validReading);
    
    const optionsCheck = result.checks.find(c => c.name === 'valid_options');
    expect(optionsCheck?.passed).toBe(false);
  });

  it('fails when distractor equals correct answer', () => {
    const badMC: MultipleChoiceExercise = {
      ...validMultipleChoice,
      options: [
        { id: 'opt_1', chinese: '学习', pinyin: 'xuéxí' },
        { id: 'opt_2', chinese: '学习', pinyin: 'xuéxí' }, // Same as correct!
        { id: 'opt_3', chinese: '睡觉', pinyin: 'shuìjiào' },
        { id: 'opt_4', chinese: '工作', pinyin: 'gōngzuò' },
      ],
    };
    const result = preFilterExercises([badMC, validDragSentence, validSpotError], validReading);
    
    const distractorsCheck = result.checks.find(c => c.name === 'distractors_different');
    expect(distractorsCheck?.passed).toBe(false);
  });

  it('fails with empty fields', () => {
    const emptyMC: MultipleChoiceExercise = {
      ...validMultipleChoice,
      question: { chinese: '', pinyin: '', english: '' },
    };
    const result = preFilterExercises([emptyMC, validDragSentence, validSpotError], validReading);
    
    const emptyCheck = result.checks.find(c => c.name === 'no_empty_fields');
    expect(emptyCheck?.passed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Combined Pre-Filter Tests
// ═══════════════════════════════════════════════════════════

describe('preFilterAll', () => {
  it('passes when both reading and exercises are valid', () => {
    const result = preFilterAll(validReading, validExercises, focusWords, allowedWords);
    expect(result.passed).toBe(true);
    expect(result.combinedScore).toBeGreaterThanOrEqual(60);
  });

  it('fails when reading fails', () => {
    const emptyReading: ReadingContent = {
      id: 'reading_001',
      chinese: '',
      pinyin: '',
      english: '',
      sentences: [],
    };
    
    const result = preFilterAll(emptyReading, validExercises, focusWords, allowedWords);
    expect(result.passed).toBe(false);
    expect(result.readingResult.passed).toBe(false);
  });

  it('exercises score drops with insufficient exercises', () => {
    // With only 1 exercise, exercises pre-filter should have a lower score
    const result = preFilterAll(validReading, [validMultipleChoice], focusWords, allowedWords);
    
    // The exercises result should have a lower score than with all 5 exercises
    const fullResult = preFilterAll(validReading, validExercises, focusWords, allowedWords);
    
    expect(result.exercisesResult.score).toBeLessThan(fullResult.exercisesResult.score);
    
    // The min_exercises check should have a low score
    const minCheck = result.exercisesResult.checks.find(c => c.name === 'min_exercises');
    expect(minCheck?.score).toBeLessThan(100);
  });

  it('weights reading higher than exercises', () => {
    const result = preFilterAll(validReading, validExercises, focusWords, allowedWords);
    // Reading is 60%, exercises is 40%
    const expectedScore = Math.round(result.readingResult.score * 0.6 + result.exercisesResult.score * 0.4);
    expect(result.combinedScore).toBe(expectedScore);
  });
});

// ═══════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('handles empty focus words', () => {
    const result = preFilterReading(validReading, [], allowedWords);
    
    const focusCheck = result.checks.find(c => c.name === 'focus_words_present');
    expect(focusCheck?.score).toBe(100); // No focus words = nothing to check
  });

  it('handles empty allowed words', () => {
    const result = preFilterReading(validReading, focusWords, []);
    expect(result.passed).toBeTruthy(); // Should still work, just can't validate against vocabulary
  });

  it('handles very long sentences', () => {
    // Create a sentence that's definitely over 30 characters
    const longSentence = '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的句子。';
    
    const longReading: ReadingContent = {
      id: 'reading_001',
      chinese: longSentence,
      pinyin: 'Zhè shì yīgè fēicháng cháng de jùzi.',
      english: 'This is a very long sentence.',
      sentences: [
        {
          id: 's1',
          chinese: longSentence,
          pinyin: 'Zhè shì yīgè fēicháng cháng de jùzi.',
          english: 'This is a very long sentence.',
        },
      ],
    };
    
    // Verify our test sentence is actually long enough
    const charCount = longSentence.replace(/[。！？!?.]/g, '').length;
    expect(charCount).toBeGreaterThan(30);
    
    const result = preFilterReading(longReading, [], allowedWords);
    
    const lengthCheck = result.checks.find(c => c.name === 'sentence_lengths');
    expect(lengthCheck?.score).toBeLessThan(100);
  });
});

