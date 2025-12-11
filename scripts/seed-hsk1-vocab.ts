/**
 * HSK1 Vocabulary Seeding Script
 * 
 * Parses the newhsk1.md file and seeds vocabulary into D1 database.
 * Handles:
 * - Variants (爸爸｜爸 → two entries)
 * - POS markers (白（形）→ strips to 白)
 * - Tab-separated format
 * 
 * Usage:
 *   npx wrangler d1 execute hanzimaster-db --local --file=./scripts/seed-hsk1-vocab.sql
 *   OR
 *   npx tsx scripts/seed-hsk1-vocab.ts --output=seed-vocab.sql
 */

import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const INPUT_FILE = path.join(__dirname, '../../newhsk1.md');
const OUTPUT_SQL_FILE = path.join(__dirname, 'seed-hsk1-vocab.sql');

// Use HSK level 10 as a staging level for new vocab
// This keeps it separate from existing HSK 1 (level 1) for comparison
// After verification, we'll migrate level 10 → 1 and delete old level 1
const HSK_LEVEL = 10;

// ═══════════════════════════════════════════════════════════
// PARSING UTILITIES
// ═══════════════════════════════════════════════════════════

interface RawVocabEntry {
  no: number;
  chinese: string;
  pinyin: string;
  english: string;
}

interface VocabEntry {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  pos: string | null;
  tonePattern: string | null;
}

/**
 * Strip POS markers like （形）, （量）, （动）, （名）, （副）, （代）, etc.
 */
function stripPosMarker(text: string): { clean: string; pos: string | null } {
  const posMatch = text.match(/[（(]([形量动名副代数])[）)]/);
  const pos = posMatch ? posMatch[1] : null;
  const clean = text.replace(/[（(][形量动名副代数][）)]/g, '').trim();
  
  // Map Chinese POS to English
  const posMap: Record<string, string> = {
    '形': 'adjective',
    '量': 'measure',
    '动': 'verb',
    '名': 'noun',
    '副': 'adverb',
    '代': 'pronoun',
    '数': 'number',
  };
  
  return { clean, pos: pos ? posMap[pos] || pos : null };
}

/**
 * Split variants like "爸爸｜爸" into separate entries
 */
function splitVariants(chinese: string, pinyin: string): Array<{ chinese: string; pinyin: string }> {
  // Handle full-width separator ｜ or regular |
  const chineseParts = chinese.split(/[｜|]/).map(s => s.trim()).filter(Boolean);
  const pinyinParts = pinyin.split(/[｜|]/).map(s => s.trim()).filter(Boolean);
  
  // If only one Chinese but multiple pinyin (like "白 (bái)" having tone info)
  if (chineseParts.length === 1) {
    return [{ chinese: chineseParts[0], pinyin: pinyinParts[0] || pinyin }];
  }
  
  // Map each variant
  return chineseParts.map((ch, idx) => ({
    chinese: ch,
    pinyin: pinyinParts[idx] || pinyinParts[0] || pinyin,
  }));
}

/**
 * Extract tone pattern from pinyin (e.g., "nǐ hǎo" → "3-3")
 */
function extractTonePattern(pinyin: string): string | null {
  const toneMarks: Record<string, number> = {
    'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
    'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
    'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
    'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
    'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
    'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
  };

  const syllables = pinyin.toLowerCase().split(/\s+/);
  const tones: number[] = [];

  for (const syllable of syllables) {
    let foundTone = 5; // Default to neutral tone
    for (const char of syllable) {
      if (toneMarks[char]) {
        foundTone = toneMarks[char];
        break;
      }
    }
    tones.push(foundTone);
  }

  return tones.length > 0 ? tones.join('-') : null;
}

/**
 * Guess category from English meaning
 */
function guessCategory(english: string, hanzi: string): string {
  const lowEng = english.toLowerCase();
  const lowHanzi = hanzi;
  
  // Time-related
  if (/\b(day|week|month|year|morning|evening|night|afternoon|noon|time|today|tomorrow|yesterday|hour|minute|second|date)\b/.test(lowEng)) {
    return 'time';
  }
  
  // Numbers
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|zero|half)\b/.test(lowEng) || /^[一二三四五六七八九十百零半两]$/.test(lowHanzi)) {
    return 'numbers';
  }
  
  // Family
  if (/\b(father|mother|dad|mom|brother|sister|son|daughter|grandma|grandpa|family|child|children|kid|parent)\b/.test(lowEng)) {
    return 'family';
  }
  
  // Food & Drink
  if (/\b(eat|drink|food|rice|noodle|bread|fruit|meat|tea|milk|egg|water|meal|breakfast|lunch|dinner|restaurant|yummy|bun)\b/.test(lowEng)) {
    return 'food';
  }
  
  // Places
  if (/\b(school|university|hospital|airport|station|store|shop|library|cinema|home|house|room|building|place|location|hotel|mall)\b/.test(lowEng)) {
    return 'places';
  }
  
  // Transportation
  if (/\b(car|bus|train|plane|fly|drive|taxi|ticket|road|walk)\b/.test(lowEng)) {
    return 'transportation';
  }
  
  // Directions
  if (/\b(north|south|east|west|left|right|front|back|inside|outside|above|below|beside|middle)\b/.test(lowEng)) {
    return 'directions';
  }
  
  // Weather
  if (/\b(weather|rain|wind|cold|hot|warm|sun|snow)\b/.test(lowEng)) {
    return 'weather';
  }
  
  // Body
  if (/\b(body|hand|mouth|eye|head)\b/.test(lowEng)) {
    return 'body';
  }
  
  // People
  if (/\b(person|people|man|woman|boy|girl|friend|teacher|student|doctor|worker|sir|miss|classmate)\b/.test(lowEng)) {
    return 'people';
  }
  
  // Actions / Verbs
  if (/\b(go|come|do|make|see|look|hear|listen|speak|say|talk|read|write|study|learn|teach|think|know|remember|forget|want|like|love|help|give|take|buy|sell|open|close|wait|sit|stand|run|walk|sleep|rest|wear|wash|play|sing|call|ask|answer|tell|meet|use|try)\b/.test(lowEng)) {
    return 'actions';
  }
  
  // Adjectives
  if (/\b(big|small|good|bad|new|old|fast|slow|high|low|long|short|easy|hard|difficult|happy|busy|tired|hungry|thirsty|clean|right|wrong|important|famous|beautiful|interesting)\b/.test(lowEng)) {
    return 'adjectives';
  }
  
  // Pronouns & Basic words
  if (/\b(i|you|he|she|it|we|they|this|that|what|who|which|where|how|when|why)\b/.test(lowEng)) {
    return 'pronouns';
  }
  
  // Greetings & Polite expressions
  if (/\b(hello|goodbye|bye|thank|sorry|please|welcome|excuse)\b/.test(lowEng)) {
    return 'greetings';
  }
  
  // Objects / Things
  if (/\b(book|phone|computer|television|table|chair|door|bed|clothes|bag|cup|money|ticket|map|flower|tree|ball)\b/.test(lowEng)) {
    return 'objects';
  }
  
  // Default
  return 'general';
}

/**
 * Escape single quotes for SQL
 */
function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

// ═══════════════════════════════════════════════════════════
// MAIN PARSING LOGIC
// ═══════════════════════════════════════════════════════════

function parseMarkdownFile(filePath: string): RawVocabEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const entries: RawVocabEntry[] = [];
  
  for (const line of lines) {
    // Skip header and empty lines
    if (!line.trim() || line.startsWith('No') || line.startsWith('---')) continue;
    
    // Parse tab-separated values
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    
    const no = parseInt(parts[0], 10);
    if (isNaN(no)) continue;
    
    entries.push({
      no,
      chinese: parts[1].trim(),
      pinyin: parts[2].trim(),
      english: parts[3].trim(),
    });
  }
  
  return entries;
}

function processEntries(rawEntries: RawVocabEntry[]): VocabEntry[] {
  const processed: VocabEntry[] = [];
  const seenHanzi = new Set<string>();
  
  for (const raw of rawEntries) {
    // Strip POS marker
    const { clean: cleanChinese, pos } = stripPosMarker(raw.chinese);
    
    // Split variants
    const variants = splitVariants(cleanChinese, raw.pinyin);
    
    for (const variant of variants) {
      // Clean up pinyin (remove extra parentheses content)
      let cleanPinyin = variant.pinyin.replace(/[（(][^）)]*[）)]/g, '').trim();
      
      // Skip if we've already seen this hanzi (avoid duplicates)
      if (seenHanzi.has(variant.chinese)) {
        console.log(`  Skipping duplicate: ${variant.chinese}`);
        continue;
      }
      seenHanzi.add(variant.chinese);
      
      const tonePattern = extractTonePattern(cleanPinyin);
      const category = guessCategory(raw.english, variant.chinese);
      
      processed.push({
        id: nanoid(12),
        hanzi: variant.chinese,
        pinyin: cleanPinyin,
        english: raw.english,
        category,
        hskLevel: HSK_LEVEL,
        pos,
        tonePattern,
      });
    }
  }
  
  return processed;
}

function generateSQL(entries: VocabEntry[]): string {
  const lines: string[] = [];
  
  // Header comment
  lines.push('-- HSK1 (v3.0) Vocabulary Seed Script - STAGING at Level 10');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push(`-- Total entries: ${entries.length}`);
  lines.push('-- ');
  lines.push('-- This seeds vocab at HSK level 10 for side-by-side comparison');
  lines.push('-- with existing HSK level 1 vocabulary.');
  lines.push('-- ');
  lines.push('-- After verification, run:');
  lines.push('--   1. Transfer audio/tags from level 1 to matching level 10 words');
  lines.push('--   2. UPDATE vocabulary SET hsk_level = 1 WHERE hsk_level = 10;');
  lines.push('--   3. DELETE FROM vocabulary WHERE hsk_level = 1 AND id NOT IN (new IDs);');
  lines.push('');
  
  // Step 1: Clear any previous level 10 staging data (safe to re-run)
  lines.push('-- STEP 1: Clear any previous level 10 staging data');
  lines.push('DELETE FROM vocabulary WHERE hsk_level = 10;');
  lines.push('');
  
  // Step 2: Insert new vocabulary at level 10
  lines.push('-- STEP 2: Insert new HSK1 (v3.0) vocabulary at staging level 10');
  
  for (const entry of entries) {
    const sql = `INSERT INTO vocabulary (id, hanzi, pinyin, english, category, hsk_level, pos, tone_pattern) VALUES ('${entry.id}', '${escapeSql(entry.hanzi)}', '${escapeSql(entry.pinyin)}', '${escapeSql(entry.english)}', '${escapeSql(entry.category)}', ${entry.hskLevel}, ${entry.pos ? `'${escapeSql(entry.pos)}'` : 'NULL'}, ${entry.tonePattern ? `'${entry.tonePattern}'` : 'NULL'});`;
    lines.push(sql);
  }
  
  lines.push('');
  lines.push('-- Done! Now go to Vocab Manager and select "HSK 1 (v3.0)" to see the new words.');
  lines.push('-- Compare with "HSK 1 (Old)" to verify everything looks correct.');
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════

function main() {
  console.log('🚀 HSK1 Vocabulary Seeder');
  console.log('========================\n');
  
  // Check if input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  console.log(`📖 Reading: ${INPUT_FILE}`);
  const rawEntries = parseMarkdownFile(INPUT_FILE);
  console.log(`   Found ${rawEntries.length} raw entries\n`);
  
  console.log('🔧 Processing entries...');
  const processed = processEntries(rawEntries);
  console.log(`   Generated ${processed.length} vocabulary entries\n`);
  
  // Category breakdown
  const categoryCount: Record<string, number> = {};
  for (const entry of processed) {
    categoryCount[entry.category] = (categoryCount[entry.category] || 0) + 1;
  }
  console.log('📊 Category breakdown:');
  for (const [cat, count] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count}`);
  }
  console.log('');
  
  // Generate SQL
  console.log('📝 Generating SQL...');
  const sql = generateSQL(processed);
  
  // Write to file
  fs.writeFileSync(OUTPUT_SQL_FILE, sql);
  console.log(`✅ SQL written to: ${OUTPUT_SQL_FILE}\n`);
  
  // Instructions
  console.log('═══════════════════════════════════════════════');
  console.log('NEXT STEPS:');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('1. Review the generated SQL file');
  console.log('');
  console.log('2. Run against LOCAL database:');
  console.log('   npx wrangler d1 execute hanzimaster-db --local --file=./scripts/seed-hsk1-vocab.sql');
  console.log('');
  console.log('3. Run against PRODUCTION database:');
  console.log('   npx wrangler d1 execute hanzimaster-db --remote --file=./scripts/seed-hsk1-vocab.sql');
  console.log('');
  console.log('⚠️  WARNING: This will DELETE all existing HSK1 vocabulary!');
  console.log('');
}

main();

