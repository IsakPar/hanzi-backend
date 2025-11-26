export type ContentType = 'audiobook' | 'text' | 'video';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface UploadContentParams {
  file: ArrayBuffer;
  fileName: string;
  fileType: string;
  fileSize: number;
  metadata: {
    title: string;
    subtitle?: string;
    author?: string;
    narrator?: string;
    description?: string;
    contentType: ContentType;
    hskLevel?: number;
    difficulty?: Difficulty;
    targetAudience?: 'kids' | 'teens' | 'adults';
    category?: string;
    genre?: string;
    seriesName?: string;
    seriesOrder?: number;
    duration?: number;
    pageCount?: number;
    language?: string;
    tags?: string[];
  };
}

export interface SearchContentParams {
  contentType?: ContentType;
  hskLevel?: number;
  category?: string;
  genre?: string;
  difficulty?: Difficulty | string;
  tags?: string[];
  query?: string;
  isFeatured?: boolean;
  isFree?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'popular' | 'rating' | 'title';
  includeUnpublished?: boolean;
}

export interface UpdateContentMetadata {
  title?: string;
  subtitle?: string;
  author?: string;
  narrator?: string;
  description?: string;
  hskLevel?: number;
  difficulty?: string;
  category?: string;
  genre?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  isFree?: boolean;
  requiresPremium?: boolean;
  tags?: string[];
}

export interface ContentVisibilityOptions {
  includeUnpublished?: boolean;
}

