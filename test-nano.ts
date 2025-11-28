/**
 * Simple test script for GPT-5-nano
 * Run with: npx tsx test-nano.ts
 */

import OpenAI from 'openai';

async function testNano() {
  // Get API key from environment or wrangler secrets
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not set');
    console.log('Run: export OPENAI_API_KEY=your-key-here');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('🧪 Testing GPT-5-nano...\n');

  try {
    // Test 1: Simple text generation
    console.log('Test 1: Simple text generation');
    const response1 = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'user', content: 'Say hello in Chinese with pinyin' }
      ],
      max_completion_tokens: 100,
    });
    console.log('Response:', response1.choices[0]?.message?.content);
    console.log('---\n');

    // Test 2: JSON generation
    console.log('Test 2: JSON generation');
    const response2 = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'user', content: 'Return JSON: {"hello": "你好", "pinyin": "nǐ hǎo"}' }
      ],
      max_completion_tokens: 100,
    });
    console.log('Response:', response2.choices[0]?.message?.content);
    console.log('---\n');

    // Test 3: Chinese lesson
    console.log('Test 3: Chinese lesson generation');
    const response3 = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: 'You are a Chinese tutor. Respond with JSON.' },
        { role: 'user', content: 'Write a sentence using 学习. Return: {"chinese": "...", "pinyin": "...", "english": "..."}' }
      ],
      max_completion_tokens: 200,
    });
    console.log('Response:', response3.choices[0]?.message?.content);
    console.log('---\n');

    // Test 4: With response_format
    console.log('Test 4: With response_format (if supported)');
    try {
      const response4 = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'user', content: 'Return: {"test": "hello"}' }
        ],
        max_completion_tokens: 50,
        response_format: { type: 'json_object' },
      });
      console.log('Response:', response4.choices[0]?.message?.content);
    } catch (e) {
      console.log('❌ response_format not supported:', (e as Error).message);
    }

    console.log('\n✅ Tests complete!');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testNano();

