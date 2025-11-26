-- Seed Tags for Content Library

-- Topic Tags
INSERT INTO tags (id, name, slug, category, color, description) VALUES
('tag_greetings', 'Greetings', 'greetings', 'topic', '#3B82F6', 'Basic greetings and introductions'),
('tag_travel', 'Travel', 'travel', 'topic', '#10B981', 'Travel-related vocabulary and phrases'),
('tag_food', 'Food & Dining', 'food', 'topic', '#F59E0B', 'Food, restaurants, and cooking'),
('tag_business', 'Business', 'business', 'topic', '#6366F1', 'Business and professional settings'),
('tag_family', 'Family', 'family', 'topic', '#EC4899', 'Family relationships and home life'),
('tag_school', 'School & Education', 'school', 'topic', '#8B5CF6', 'School, studying, and education'),
('tag_shopping', 'Shopping', 'shopping', 'topic', '#EF4444', 'Shopping and commerce'),
('tag_health', 'Health', 'health', 'topic', '#14B8A6', 'Health, medicine, and wellness'),
('tag_weather', 'Weather', 'weather', 'topic', '#06B6D4', 'Weather and seasons'),
('tag_hobbies', 'Hobbies', 'hobbies', 'topic', '#84CC16', 'Hobbies and leisure activities');

-- Grammar Tags
INSERT INTO tags (id, name, slug, category, color, description) VALUES
('tag_measure_words', 'Measure Words', 'measure-words', 'grammar', '#FB923C', 'Chinese measure words (量词)'),
('tag_particle_de', 'Particle 的/得/地', 'particle-de', 'grammar', '#F472B6', 'Usage of 的, 得, and 地'),
('tag_aspect_markers', 'Aspect Markers', 'aspect-markers', 'grammar', '#A78BFA', 'Completion and continuation markers'),
('tag_questions', 'Question Forms', 'questions', 'grammar', '#60A5FA', 'Different question structures'),
('tag_comparisons', 'Comparisons', 'comparisons', 'grammar', '#34D399', 'Comparative sentences'),
('tag_passive_voice', 'Passive Voice', 'passive-voice', 'grammar', '#FBBF24', 'Passive constructions with 被');

-- Skill Tags
INSERT INTO tags (id, name, slug, category, color, description) VALUES
('tag_listening', 'Listening', 'listening', 'skill', '#3B82F6', 'Listening comprehension practice'),
('tag_speaking', 'Speaking', 'speaking', 'skill', '#10B981', 'Speaking and pronunciation'),
('tag_reading', 'Reading', 'reading', 'skill', '#F59E0B', 'Reading comprehension'),
('tag_writing', 'Writing', 'writing', 'skill', '#EC4899', 'Writing practice');

-- Genre Tags (for audiobooks/texts)
INSERT INTO tags (id, name, slug, category, color, description) VALUES
('tag_fiction', 'Fiction', 'fiction', 'genre', '#8B5CF6', 'Fictional stories and novels'),
('tag_nonfiction', 'Non-Fiction', 'nonfiction', 'genre', '#6366F1', 'Non-fiction books and articles'),
('tag_history', 'History', 'history', 'genre', '#EF4444', 'Historical content'),
('tag_biography', 'Biography', 'biography', 'genre', '#14B8A6', 'Biographical works'),
('tag_science', 'Science', 'science', 'genre', '#06B6D4', 'Science and technology'),
('tag_philosophy', 'Philosophy', 'philosophy', 'genre', '#84CC16', 'Philosophy and thought'),
('tag_poetry', 'Poetry', 'poetry', 'genre', '#FB923C', 'Classical and modern poetry'),
('tag_folklore', 'Folklore', 'folklore', 'genre', '#F472B6', 'Traditional stories and folklore'),
('tag_news', 'News', 'news', 'genre', '#A78BFA', 'Current events and news'),
('tag_podcast', 'Podcast', 'podcast', 'genre', '#60A5FA', 'Podcast episodes'),
('tag_kids', 'Kids', 'kids', 'genre', '#34D399', 'Content for children');

