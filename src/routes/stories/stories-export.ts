/**
 * Stories Export Routes
 * Template and export functionality
 */

import { Hono } from 'hono';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { logWithContext } from '../../utils/logger';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

/**
 * GET /stories/template
 * Get a valid, importable template with example values
 */
app.get('/template', (c) => {
  return c.json({
    title: "A Day at the Park",
    subtitle: "Daily Life Story",
    author: "Teacher Li",
    description: "A short story about going to the park on a sunny day. Great for HSK 2 learners practicing daily vocabulary.",
    topic: "daily_life",
    hskLevel: 2,
    difficulty: "medium",
    pauseBetweenSegmentsMs: 500,
    estimatedMinutes: 5,
    segments: [
      {
        chinese: "今天天气很好。",
        pinyin: "jīntiān tiānqì hěn hǎo.",
        english: "Today the weather is very nice."
      },
      {
        chinese: "我和朋友去公园。",
        pinyin: "wǒ hé péngyou qù gōngyuán.",
        english: "My friend and I go to the park."
      },
      {
        chinese: "公园里有很多人。",
        pinyin: "gōngyuán lǐ yǒu hěn duō rén.",
        english: "There are many people in the park."
      },
      {
        chinese: "小孩子在玩游戏。",
        pinyin: "xiǎo háizi zài wán yóuxì.",
        english: "Children are playing games."
      },
      {
        chinese: "我们在草地上休息。",
        pinyin: "wǒmen zài cǎodì shàng xiūxi.",
        english: "We rest on the grass."
      },
      {
        chinese: "这是很开心的一天！",
        pinyin: "zhè shì hěn kāixīn de yī tiān!",
        english: "This is a very happy day!"
      }
    ],
    practiceBlocks: [
      {
        type: "exercise_multiple_choice",
        content: {
          question: "今天天气怎么样？",
          questionEnglish: "How is the weather today?",
          options: [
            { text: "很好", isCorrect: true },
            { text: "不好", isCorrect: false },
            { text: "很冷", isCorrect: false },
            { text: "很热", isCorrect: false }
          ],
          explanation: "故事说：今天天气很好。"
        }
      },
      {
        type: "exercise_multiple_choice",
        content: {
          question: "他们去哪里？",
          questionEnglish: "Where do they go?",
          options: [
            { text: "学校", isCorrect: false },
            { text: "公园", isCorrect: true },
            { text: "图书馆", isCorrect: false },
            { text: "商店", isCorrect: false }
          ],
          explanation: "故事说：我和朋友去公园。"
        }
      },
      {
        type: "exercise_multiple_choice",
        content: {
          question: "小孩子在做什么？",
          questionEnglish: "What are the children doing?",
          options: [
            { text: "看书", isCorrect: false },
            { text: "吃饭", isCorrect: false },
            { text: "玩游戏", isCorrect: true },
            { text: "睡觉", isCorrect: false }
          ],
          explanation: "故事说：小孩子在玩游戏。"
        }
      },
      {
        type: "exercise_drag_sentence",
        content: {
          prompt: "Put the words in order:",
          promptEnglish: "Arrange to say: We rest on the grass.",
          words: ["我们", "在", "草地上", "休息"],
          correctOrder: [0, 1, 2, 3]
        }
      }
    ]
  });
});

/**
 * GET /stories/:id/export
 * Export story as JSON
 * - Default: Clean template (no IDs, no system fields) for authors
 * - ?full=true: Full backup with all fields
 */
app.get('/:id/export', async (c) => {
  const id = c.req.param('id');
  const full = c.req.query('full') === 'true';
  const { stories } = getServices(c.env);

  try {
    const story = await stories.getStoryWithDetails(id);
    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }

    if (full) {
      // Full backup format (includes IDs, timestamps)
      return c.json({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        story: {
          id: story.id,
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          description: story.description,
          topic: story.topic,
          hskLevel: story.hskLevel,
          difficulty: story.difficulty,
          pauseBetweenSegmentsMs: (story as any).pauseBetweenSegmentsMs || 500,
          estimatedMinutes: story.estimatedMinutes,
          isPublished: story.isPublished,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          segments: story.sentences.map(s => ({
            id: s.id,
            orderIndex: s.orderIndex,
            chinese: s.chinese,
            pinyin: s.pinyin,
            english: s.english,
            audioR2Key: s.audioR2Key,
            audioDurationMs: (s as any).audioDurationMs,
          })),
          practiceBlocks: story.practiceBlocks || [],
        },
      });
    }

    // Clean author template (no IDs, no system fields)
    return c.json({
      title: story.title,
      subtitle: story.subtitle || undefined,
      author: story.author || undefined,
      description: story.description || undefined,
      topic: story.topic || undefined,
      hskLevel: story.hskLevel,
      difficulty: story.difficulty,
      pauseBetweenSegmentsMs: (story as any).pauseBetweenSegmentsMs || 500,
      estimatedMinutes: story.estimatedMinutes || undefined,
      segments: story.sentences.map(s => ({
        chinese: s.chinese,
        pinyin: s.pinyin,
        english: s.english,
      })),
      practiceBlocks: story.practiceBlocks || [],
    });
  } catch (err) {
    logWithContext('error', 'stories.export_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Export failed' }, 500);
  }
});

export default app;

