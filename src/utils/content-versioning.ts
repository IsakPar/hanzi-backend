/**
 * Content Versioning Utilities
 * 
 * Tracks content changes to ensure user progress remains meaningful
 * when lesson/story content is updated.
 */

/**
 * Generate SHA256 hash of content for change detection
 */
export async function generateContentHash(content: unknown): Promise<string> {
  const jsonString = JSON.stringify(content, null, 0); // Deterministic JSON
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if content has changed by comparing hashes
 */
export function hasContentChanged(oldHash: string | null, newHash: string): boolean {
  if (!oldHash) return true; // No previous hash = new content
  return oldHash !== newHash;
}

/**
 * Determine if change is significant enough to require user review
 * 
 * Minor changes (typo fixes) don't require review
 * Major changes (new blocks, changed answers) do
 */
export function isSignificantChange(
  oldBlocks: unknown[] | null,
  newBlocks: unknown[]
): boolean {
  if (!oldBlocks) return false; // First version, no review needed
  
  // Count blocks
  const oldCount = oldBlocks.length;
  const newCount = newBlocks.length;
  
  // More than 20% change in block count = significant
  if (Math.abs(oldCount - newCount) > oldCount * 0.2) {
    return true;
  }
  
  // If block count changed at all, consider significant for now
  if (oldCount !== newCount) {
    return true;
  }
  
  return false;
}

/**
 * Version info returned to mobile app
 */
export interface ContentVersionInfo {
  currentVersion: number;
  contentHash: string;
  userCompletedVersion: number | null;
  needsReview: boolean;
  hasUpdates: boolean; // true if currentVersion > userCompletedVersion
}

/**
 * Compare user's completed version with current content version
 */
export function getVersionInfo(
  currentVersion: number,
  contentHash: string,
  userCompletedVersion: number | null,
  needsReview: boolean
): ContentVersionInfo {
  return {
    currentVersion,
    contentHash,
    userCompletedVersion,
    needsReview,
    hasUpdates: userCompletedVersion !== null && currentVersion > userCompletedVersion,
  };
}

