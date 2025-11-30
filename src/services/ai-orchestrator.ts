/**
 * AI Orchestrator Service
 * Uses DeepSeek Chat for tool-calling decisions
 * 
 * This is a PLANNER only - it decides what data to fetch.
 * The actual response generation is done by Qwen.
 */

import { createOpenRouterClient, OPENROUTER_MODELS, OPENROUTER_PRICING } from './openrouter-client';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// TOOL DEFINITIONS (OpenAI-compatible JSON Schema)
// ═══════════════════════════════════════════════════════════

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'lookup_vocabulary',
      description: 'Look up a vocabulary item by its numeric row ID (1-indexed). Use this when the user asks about a specific row number, ID, or entry number.',
      parameters: {
        type: 'object',
        properties: {
          id: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 10000,
            description: 'The row/ID number of the vocabulary item'
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_vocabulary',
      description: 'Search vocabulary by hanzi characters, pinyin, or English meaning. Use for fuzzy searches when the user wants to find words.',
      parameters: {
        type: 'object',
        properties: {
          query: { 
            type: 'string',
            description: 'Search query - can be hanzi, pinyin, or English'
          },
          hskLevel: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 9,
            description: 'Optional HSK level filter'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 20,
            description: 'Max results to return (default 10)'
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_lesson',
      description: 'Get a specific lesson by its lesson number. Includes all lesson blocks (vocabulary, grammar, reading, quiz).',
      parameters: {
        type: 'object',
        properties: {
          lessonNumber: { 
            type: 'integer', 
            minimum: 1,
            description: 'The lesson number'
          },
          hskLevel: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 9,
            description: 'Optional HSK level filter'
          },
        },
        required: ['lessonNumber'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_lessons',
      description: 'List all available lessons, optionally filtered by HSK level.',
      parameters: {
        type: 'object',
        properties: {
          hskLevel: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 9,
            description: 'Optional HSK level filter'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50,
            description: 'Max results to return (default 30)'
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_story',
      description: 'Get a story by its title (partial match). Includes all sentences.',
      parameters: {
        type: 'object',
        properties: {
          title: { 
            type: 'string',
            description: 'Story title or partial title'
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_stories',
      description: 'List all available stories, optionally filtered by HSK level.',
      parameters: {
        type: 'object',
        properties: {
          hskLevel: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 9,
            description: 'Optional HSK level filter'
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 50,
            description: 'Max results to return (default 30)'
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_curriculum_stats',
      description: 'Get overall curriculum statistics: total vocabulary, lessons, stories, and units.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_hsk_overview',
      description: 'Get an overview of content for a specific HSK level.',
      parameters: {
        type: 'object',
        properties: {
          level: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 9,
            description: 'HSK level (1-9)'
          },
        },
        required: ['level'],
      },
    },
  },
  // ═══════════════════════════════════════════════════════════
  // SEMANTIC SEARCH TOOLS (Vectorize)
  // ═══════════════════════════════════════════════════════════
  {
    type: 'function' as const,
    function: {
      name: 'semantic_search',
      description: 'Search content by meaning/concept using AI. Use when user wants to find content by topic, theme, emotion, or meaning rather than exact text. Examples: "words about emotions", "vocabulary for food", "lessons covering travel", "happy words", "greetings".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of what to find (e.g., "words about emotions", "travel vocabulary")'
          },
          type: {
            type: 'string',
            enum: ['vocabulary', 'lesson', 'story'],
            description: 'Type of content to search (optional, searches all if not specified)'
          },
          hskLevel: {
            type: 'integer',
            minimum: 1,
            maximum: 9,
            description: 'Filter by HSK level (optional)'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            description: 'Max results (default 10)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_similar',
      description: 'Find content similar to a specific item. Use when user wants recommendations like "words similar to 高兴", "stories like X", "related vocabulary".',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['vocabulary', 'lesson', 'story'],
            description: 'Type of content'
          },
          id: {
            type: 'string',
            description: 'ID of the item to find similar content for'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Max similar items to return (default 5)'
          }
        },
        required: ['type', 'id']
      }
    }
  },
];

// System prompt that constrains DeepSeek to ONLY plan tools
const PLANNER_SYSTEM_PROMPT = `You are a tool planner for HanziMaster, a Chinese learning platform.

Your ONLY job is to decide which tools to call and with what arguments.

RULES:
1. For questions about specific row numbers ("row 156", "ID 475", "entry 23"), use lookup_vocabulary with that ID.
2. For exact text searches (specific hanzi/pinyin/English), use search_vocabulary.
3. For questions about lessons ("lesson 1", "what's in lesson 3"), use get_lesson.
4. For listing content ("show all lessons", "what stories do you have"), use list_lessons or list_stories.
5. For statistics ("how many words", "curriculum overview"), use get_curriculum_stats.
6. For HSK-specific questions ("HSK 1 content", "what's in HSK 2"), use get_hsk_overview.
7. **For concept/meaning searches** ("words about emotions", "happy vocabulary", "greetings", "food words", "travel-related"), use semantic_search. This finds content by meaning, not exact text.
8. **For similarity searches** ("words similar to 高兴", "vocabulary like this", "related words"), use find_similar.

IMPORTANT: Prefer semantic_search over search_vocabulary when the user is asking about topics, themes, or concepts rather than specific text matches.

If the user's question can be answered from general Chinese knowledge without database lookup (grammar explanations, translations, general advice), respond with exactly: NO_TOOLS_NEEDED

You must NOT answer the user's question directly. Only plan which tools to call.
The final user-facing answer is generated by another model.`;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface OrchestratorResult {
  toolCalls: ToolCall[];
  orchestratorTokens: number;
  orchestratorCost: number;
}

// ═══════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Decide which tools to call based on user message
 */
export async function decideTools(
  userMessage: string,
  openrouterApiKey: string,
  requestId: string
): Promise<OrchestratorResult> {
  const client = createOpenRouterClient(openrouterApiKey);
  
  const messages = [
    { role: 'system' as const, content: PLANNER_SYSTEM_PROMPT },
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const startTime = Date.now();
    
    const completion = await client.chat.completions.create({
      model: OPENROUTER_MODELS.DEEPSEEK_CHAT,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1, // Low temp for deterministic tool selection
      max_tokens: 500,  // Don't need much for tool calls
    });

    const latencyMs = Date.now() - startTime;
    const msg = completion.choices[0]?.message;
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    
    const pricing = OPENROUTER_PRICING[OPENROUTER_MODELS.DEEPSEEK_CHAT];
    const cost = (inputTokens / 1_000_000) * pricing.input + 
                 (outputTokens / 1_000_000) * pricing.output;

    logWithContext('info', 'ai.orchestrator.complete', {
      requestId,
      meta: { 
        tokens: totalTokens, 
        cost, 
        latencyMs,
        hasToolCalls: !!(msg?.tool_calls?.length),
      },
    });

    // Check for NO_TOOLS_NEEDED response
    if (typeof msg?.content === 'string' && msg.content.includes('NO_TOOLS_NEEDED')) {
      return { 
        toolCalls: [], 
        orchestratorTokens: totalTokens,
        orchestratorCost: cost,
      };
    }

    // No tool calls returned
    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      return { 
        toolCalls: [], 
        orchestratorTokens: totalTokens,
        orchestratorCost: cost,
      };
    }

    // Parse tool calls
    const toolCalls = msg.tool_calls.map(tc => ({
      name: tc.function.name,
      args: safeParseArgs(tc.function.arguments),
    }));

    logWithContext('info', 'ai.orchestrator.tools_decided', {
      requestId,
      meta: { tools: toolCalls.map(t => t.name) },
    });

    return { 
      toolCalls, 
      orchestratorTokens: totalTokens,
      orchestratorCost: cost,
    };

  } catch (err) {
    logWithContext('error', 'ai.orchestrator.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    // Return empty on failure - let Qwen handle without context
    return { toolCalls: [], orchestratorTokens: 0, orchestratorCost: 0 };
  }
}

/**
 * Safely parse and validate tool arguments
 */
function safeParseArgs(raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw);
    
    // Clamp numeric values to safe ranges
    if (typeof parsed.id === 'number') {
      parsed.id = Math.max(1, Math.min(Math.floor(parsed.id), 10000));
    }
    if (typeof parsed.lessonNumber === 'number') {
      parsed.lessonNumber = Math.max(1, Math.min(Math.floor(parsed.lessonNumber), 1000));
    }
    if (typeof parsed.hskLevel === 'number') {
      parsed.hskLevel = Math.max(1, Math.min(Math.floor(parsed.hskLevel), 9));
    }
    if (typeof parsed.level === 'number') {
      parsed.level = Math.max(1, Math.min(Math.floor(parsed.level), 9));
    }
    if (typeof parsed.limit === 'number') {
      parsed.limit = Math.max(1, Math.min(Math.floor(parsed.limit), 50));
    }
    
    // Sanitize strings (remove potential injection)
    if (typeof parsed.query === 'string') {
      parsed.query = parsed.query.slice(0, 100).trim();
    }
    if (typeof parsed.title === 'string') {
      parsed.title = parsed.title.slice(0, 200).trim();
    }
    
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Check if we should use the orchestrator for this message
 * Skip orchestrator for pure conversational queries
 */
export function shouldUseOrchestrator(message: string): boolean {
  const lower = message.toLowerCase();
  
  // Skip for very short messages (likely greetings)
  if (message.length < 10) return false;
  
  // Skip for obvious greetings/thanks
  if (/^(hi|hello|thanks|thank you|ok|okay|yes|no|sure)/i.test(lower)) return false;
  
  // Use orchestrator for data-related queries
  const dataIndicators = [
    /row|id|entry|#\d+|\d+/,           // ID lookups
    /vocab|word|character|hanzi/i,      // Vocabulary queries
    /lesson|unit|课/i,                  // Lesson queries
    /story|stories|故事/i,              // Story queries
    /how many|count|total|statistic/i,  // Stats queries
    /hsk\s*\d|level\s*\d/i,             // HSK queries
    /list|show|all|what.*have/i,        // Listing queries
    /find|search|look.*up/i,            // Search queries
  ];
  
  return dataIndicators.some(pattern => pattern.test(message));
}



