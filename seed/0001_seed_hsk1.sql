-- Seed Lessons
INSERT INTO lessons (id, title, hsk_level, difficulty, is_published, description) 
VALUES ('hsk1-L1', 'Greetings & Basics', 1, 'easy', 1, 'Master the art of saying hello in Chinese.');

-- Seed Blocks
-- 1. Hero
INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content) 
VALUES ('b1', 'hsk1-L1', 'hero', 0, '{"title": "你好 (Nǐ hǎo)", "subtitle": "The most common greeting in China.", "image": "https://example.com/hello.png"}');

-- 2. Vocabulary
INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content) 
VALUES ('b2', 'hsk1-L1', 'vocabulary', 1, '{"words": [{"hanzi": "你", "pinyin": "nǐ", "meaning": "you"}, {"hanzi": "好", "pinyin": "hǎo", "meaning": "good"}, {"hanzi": "你好", "pinyin": "nǐ hǎo", "meaning": "hello"}]}');

-- 3. Grammar
INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content) 
VALUES ('b3', 'hsk1-L1', 'grammar', 2, '{"title": "Subject + Verb + Object", "description": "Chinese sentence structure is SVO, just like English.", "examples": [{"hanzi": "我爱你", "pinyin": "Wǒ ài nǐ", "translation": "I love you"}]}');

-- 4. Quiz
INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content) 
VALUES ('b4', 'hsk1-L1', 'quiz', 3, '{"question": "How do you say \"Hello\"?", "options": ["你好", "再见", "谢谢"], "answer": "你好"}');

-- 5. Summary
INSERT INTO lesson_blocks (id, lesson_id, type, order_index, content) 
VALUES ('b5', 'hsk1-L1', 'summary', 4, '{"title": "Great Job!", "stats": {"words": 3, "xp": 50}}');

