/**
 * Chinese Text Tokenizer
 * 
 * Uses Maximum Forward Match (MFM) algorithm with curriculum vocabulary.
 * This is deterministic and uses our exact vocabulary as the dictionary.
 * 
 * Perfect for Cloudflare Workers (pure JS, no native deps).
 */

export interface Token {
  wordId: string | null;  // null if not in curriculum
  hanzi: string;
}

/**
 * Chinese tokenizer using Maximum Forward Match algorithm.
 * Segments text using curriculum vocabulary as dictionary.
 */
export class ChineseTokenizer {
  private dictionary: Map<string, string>;  // hanzi -> vocabId
  private maxWordLength: number;
  
  // Common punctuation to skip (using Unicode escapes for compatibility)
  private static PUNCTUATION = new Set([
    '\uFF0C', '\u3002', '\uFF01', '\uFF1F', '\u3001', '\uFF1B', '\uFF1A',  // ，。！？、；：
    '\u201C', '\u201D', '\u2018', '\u2019',  // ""''
    '\uFF08', '\uFF09', '\u3010', '\u3011', '\u300A', '\u300B',  // （）【】《》
    '\u2026', '\u2014', '\u00B7',  // …—·
    ',', '.', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']',
    '<', '>', '-', '_', ' ', '\n', '\t', '\r'
  ]);
  
  constructor() {
    this.dictionary = new Map();
    this.maxWordLength = 1;
  }
  
  /**
   * Load vocabulary into the dictionary.
   * Call this with all curriculum words before tokenizing.
   */
  loadVocabulary(words: Array<{ id: string; hanzi: string }>) {
    this.dictionary.clear();
    this.maxWordLength = 1;
    
    for (const word of words) {
      this.dictionary.set(word.hanzi, word.id);
      if (word.hanzi.length > this.maxWordLength) {
        this.maxWordLength = word.hanzi.length;
      }
    }
  }
  
  /**
   * Tokenize Chinese text using Maximum Forward Match.
   * 
   * Algorithm:
   * 1. Start at position 0
   * 2. Try to match longest word starting at current position
   * 3. If match found, add token and advance by word length
   * 4. If no match, treat single character as unknown token
   * 5. Repeat until end of text
   */
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    
    while (pos < text.length) {
      const char = text[pos];
      
      // Skip punctuation and whitespace
      if (ChineseTokenizer.PUNCTUATION.has(char)) {
        pos++;
        continue;
      }
      
      // Try to find longest matching word
      let matched = false;
      
      for (let len = Math.min(this.maxWordLength, text.length - pos); len >= 1; len--) {
        const candidate = text.substring(pos, pos + len);
        const wordId = this.dictionary.get(candidate);
        
        if (wordId !== undefined) {
          tokens.push({ wordId, hanzi: candidate });
          pos += len;
          matched = true;
          break;
        }
      }
      
      // No match - single character as unknown
      if (!matched) {
        // Skip if it's a non-Chinese character
        if (this.isChineseChar(char)) {
          tokens.push({ wordId: null, hanzi: char });
        }
        pos++;
      }
    }
    
    return tokens;
  }
  
  /**
   * Check if a character is Chinese.
   */
  private isChineseChar(char: string): boolean {
    const code = char.charCodeAt(0);
    // CJK Unified Ideographs: U+4E00 to U+9FFF
    // CJK Extension A: U+3400 to U+4DBF
    return (code >= 0x4E00 && code <= 0x9FFF) || 
           (code >= 0x3400 && code <= 0x4DBF);
  }
  
  /**
   * Get dictionary info.
   */
  getInfo(): { wordCount: number; maxWordLength: number } {
    return {
      wordCount: this.dictionary.size,
      maxWordLength: this.maxWordLength,
    };
  }
}

// Singleton instance for reuse across requests
let tokenizerInstance: ChineseTokenizer | null = null;

/**
 * Get or create tokenizer instance.
 */
export function getTokenizer(): ChineseTokenizer {
  if (!tokenizerInstance) {
    tokenizerInstance = new ChineseTokenizer();
  }
  return tokenizerInstance;
}

/**
 * Tokenize text with vocabulary.
 * Convenience function that creates tokenizer, loads vocab, and tokenizes.
 */
export function tokenizeWithVocabulary(
  text: string, 
  vocabulary: Array<{ id: string; hanzi: string }>
): Token[] {
  const tokenizer = getTokenizer();
  tokenizer.loadVocabulary(vocabulary);
  return tokenizer.tokenize(text);
}

