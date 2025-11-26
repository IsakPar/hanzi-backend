# Stories API Documentation

## Overview

The Stories API provides endpoints for managing reading comprehension content with sentence-by-sentence breakdowns, vocabulary glossaries, and comprehension questions.

**Base URL**: `/v1/stories`  
**Authentication**: Admin role required (JWT token)

---

## API Endpoints

### Story CRUD

#### **GET /v1/stories**
List and search stories

**Query Parameters:**
- `hsk_level` (number, optional): Filter by HSK level (1-6)
- `difficulty` (string, optional): Filter by difficulty ("easy", "medium", "hard")
- `topic` (string, optional): Filter by topic
- `query` (string, optional): Search in title and description
- `published` (boolean, optional): Filter by published status
- `limit` (number, optional): Max results (default: 50, max: 100)
- `offset` (number, optional): Pagination offset

**Response:**
```json
{
  "stories": [
    {
      "id": "story123",
      "title": "A Day in Beijing",
      "subtitle": "Daily Life Story",
      "author": "Teacher Li",
      "contentLibraryId": "content456",
      "description": "Learn about daily routines in Beijing",
      "topic": "daily_life",
      "hskLevel": 2,
      "difficulty": "easy",
      "estimatedMinutes": 15,
      "coverImageR2Key": "images/stories/story123.jpg",
      "isPublished": true,
      "publishedAt": "2025-11-24T10:00:00.000Z",
      "createdAt": "2025-11-20T08:00:00.000Z",
      "updatedAt": "2025-11-24T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### **POST /v1/stories**
Create a new story

**Request Body:**
```json
{
  "title": "A Day in Beijing",
  "subtitle": "Daily Life Story",
  "author": "Teacher Li",
  "contentLibraryId": "content456",
  "description": "Learn about daily routines in Beijing",
  "topic": "daily_life",
  "hskLevel": 2,
  "difficulty": "easy",
  "estimatedMinutes": 15
}
```

**Response:** (201 Created)
```json
{
  "story": { /* Full story object */ }
}
```

---

#### **GET /v1/stories/:id**
Get story with all details (sentences, vocabulary, questions)

**Response:**
```json
{
  "story": {
    "id": "story123",
    "title": "A Day in Beijing",
    /* ... metadata ... */
    "sentences": [
      {
        "id": "sent1",
        "storyId": "story123",
        "orderIndex": 0,
        "chinese": "我每天早上七点起床。",
        "pinyin": "Wǒ měitiān zǎoshang qī diǎn qǐchuáng.",
        "english": "I wake up at 7am every morning.",
        "audioR2Key": "stories/sentences/story123/sent1.mp3",
        "createdAt": "2025-11-20T08:00:00.000Z"
      }
    ],
    "vocabulary": [
      {
        "storyId": "story123",
        "vocabId": "vocab789",
        "contextSentence": "我每天早上七点起床。",
        "hanzi": "起床",
        "pinyin": "qǐchuáng",
        "english": "to wake up",
        "hskLevel": 1
      }
    ],
    "questions": [
      {
        "id": "q1",
        "storyId": "story123",
        "orderIndex": 0,
        "question": "作者每天几点起床？",
        "questionEnglish": "What time does the author wake up?",
        "questionType": "multiple_choice",
        "options": ["6:00", "7:00", "8:00", "9:00"],
        "correctAnswer": "7:00",
        "explanation": "文中说"我每天早上七点起床"",
        "createdAt": "2025-11-20T08:00:00.000Z"
      }
    ]
  }
}
```

---

#### **PUT /v1/stories/:id**
Update story metadata

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "hskLevel": 3,
  "isPublished": true
}
```

**Response:**
```json
{ "success": true }
```

---

#### **DELETE /v1/stories/:id**
Delete a story (cascades to sentences, vocabulary, questions)

**Response:**
```json
{ "success": true }
```

---

### Sentences

#### **POST /v1/stories/:id/sentences**
Add a sentence to the story

**Request Body:**
```json
{
  "chinese": "我每天早上七点起床。",
  "pinyin": "Wǒ měitiān zǎoshang qī diǎn qǐchuáng.",
  "english": "I wake up at 7am every morning.",
  "audioR2Key": "stories/sentences/story123/sent1.mp3"
}
```

**Response:** (201 Created)
```json
{
  "sentence": { /* Full sentence object with auto-assigned orderIndex */ }
}
```

---

#### **PUT /v1/stories/:id/sentences/:sentenceId**
Update a sentence

**Request Body:** (all fields optional)
```json
{
  "chinese": "我每天早上六点起床。",
  "pinyin": "Wǒ měitiān zǎoshang liù diǎn qǐchuáng.",
  "english": "I wake up at 6am every morning."
}
```

**Response:**
```json
{ "success": true }
```

---

#### **DELETE /v1/stories/:id/sentences/:sentenceId**
Delete a sentence

**Response:**
```json
{ "success": true }
```

---

#### **POST /v1/stories/:id/sentences/reorder**
Reorder sentences (drag and drop)

**Request Body:**
```json
{
  "sentenceIds": ["sent3", "sent1", "sent2"]
}
```

**Response:**
```json
{ "success": true }
```

---

### Vocabulary

#### **POST /v1/stories/:id/vocabulary**
Add vocabulary word to story glossary

**Request Body:**
```json
{
  "vocabId": "vocab789",
  "contextSentence": "我每天早上七点起床。"
}
```

**Response:** (201 Created)
```json
{ "success": true }
```

---

#### **DELETE /v1/stories/:id/vocabulary/:vocabId**
Remove vocabulary word from story

**Response:**
```json
{ "success": true }
```

---

### Questions

#### **POST /v1/stories/:id/questions**
Add a comprehension question

**Request Body:**
```json
{
  "question": "作者每天几点起床？",
  "questionEnglish": "What time does the author wake up?",
  "questionType": "multiple_choice",
  "options": ["6:00", "7:00", "8:00", "9:00"],
  "correctAnswer": "7:00",
  "explanation": "文中说"我每天早上七点起床""
}
```

**Question Types:**
- `multiple_choice`: Provide `options` array
- `true_false`: Options should be ["True", "False"]
- `short_answer`: No options, free text answer

**Response:** (201 Created)
```json
{
  "question": { /* Full question object with auto-assigned orderIndex */ }
}
```

---

#### **PUT /v1/stories/:id/questions/:questionId**
Update a question

**Request Body:** (all fields optional)
```json
{
  "question": "Updated question text",
  "correctAnswer": "8:00"
}
```

**Response:**
```json
{ "success": true }
```

---

#### **DELETE /v1/stories/:id/questions/:questionId**
Delete a question

**Response:**
```json
{ "success": true }
```

---

### File Uploads

#### **POST /v1/stories/:id/cover**
Upload cover image for story

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `cover`: Image file (PNG, JPEG, WebP, max 5MB)

**Response:**
```json
{
  "success": true,
  "r2Key": "images/stories/story123.jpg"
}
```

---

#### **POST /v1/stories/:id/sentences/:sentenceId/audio**
Upload audio for a sentence

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `audio`: Audio file (MP3, M4A, WAV, max 10MB)

**Response:**
```json
{
  "success": true,
  "r2Key": "stories/sentences/story123/sent1.mp3"
}
```

---

## Database Schema

### `stories` Table
```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  content_library_id TEXT,  -- Optional link to full audiobook/PDF
  description TEXT,
  topic TEXT,
  hsk_level INTEGER NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  estimated_minutes INTEGER,
  cover_image_r2_key TEXT,
  is_published INTEGER DEFAULT 0,
  published_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
```

### `story_sentences` Table
```sql
CREATE TABLE story_sentences (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  chinese TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  english TEXT NOT NULL,
  audio_r2_key TEXT,
  created_at INTEGER,
  UNIQUE(story_id, order_index)
);
```

### `story_vocabulary` Table (Junction)
```sql
CREATE TABLE story_vocabulary (
  story_id TEXT NOT NULL,
  vocab_id TEXT NOT NULL,
  context_sentence TEXT,
  PRIMARY KEY (story_id, vocab_id)
);
```

### `story_questions` Table
```sql
CREATE TABLE story_questions (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  question_english TEXT,
  question_type TEXT DEFAULT 'multiple_choice',
  options TEXT,  -- JSON array
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at INTEGER
);
```

---

## R2 File Paths

| Content Type | Path Pattern | Example |
|--------------|--------------|---------|
| Story cover | `images/stories/{storyId}.{ext}` | `images/stories/story123.jpg` |
| Sentence audio | `stories/sentences/{storyId}/{sentenceId}.{ext}` | `stories/sentences/story123/sent1.mp3` |
| Full audiobook | `stories/audio/{storyId}.{ext}` | `stories/audio/story123.mp3` |
| Full text | `stories/text/{storyId}.{ext}` | `stories/text/story123.pdf` |

---

## Example Workflow

### Creating a Complete Story

```bash
# 1. Create story
curl -X POST http://localhost:8787/v1/stories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "A Day in Beijing",
    "hskLevel": 2,
    "difficulty": "easy",
    "estimatedMinutes": 15
  }'
# Returns: {"story": {"id": "story123", ...}}

# 2. Add sentences
curl -X POST http://localhost:8787/v1/stories/story123/sentences \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chinese": "我每天早上七点起床。",
    "pinyin": "Wǒ měitiān zǎoshang qī diǎn qǐchuáng.",
    "english": "I wake up at 7am every morning."
  }'

# 3. Upload sentence audio
curl -X POST http://localhost:8787/v1/stories/story123/sentences/sent1/audio \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "audio=@sentence1.mp3"

# 4. Add vocabulary
curl -X POST http://localhost:8787/v1/stories/story123/vocabulary \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vocabId": "vocab789",
    "contextSentence": "我每天早上七点起床。"
  }'

# 5. Add question
curl -X POST http://localhost:8787/v1/stories/story123/questions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "作者每天几点起床？",
    "questionType": "multiple_choice",
    "options": ["6:00", "7:00", "8:00", "9:00"],
    "correctAnswer": "7:00"
  }'

# 6. Upload cover
curl -X POST http://localhost:8787/v1/stories/story123/cover \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "cover=@cover.jpg"

# 7. Publish
curl -X PUT http://localhost:8787/v1/stories/story123 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isPublished": true}'
```

---

## Migration Command

To apply the stories schema to your database:

```bash
# Development (local)
npx wrangler d1 execute hanzimaster-db --local --file=drizzle/0010_add_stories.sql

# Production
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0010_add_stories.sql
```

---

## Analytics Events

The following events are tracked in `system_events`:
- `story.create` - Story created
- `story.update` - Story metadata updated
- `story.delete` - Story deleted

