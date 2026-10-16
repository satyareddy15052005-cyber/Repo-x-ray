import { unzipSync, strFromU8 } from 'fflate';
import { normalizePath, isPathIgnored } from './normalizePaths';

export interface UnzippedFile {
  relativePath: string;
  content: string;
  byteSize: number;
}

export function extractZipArchive(
  arrayBuffer: ArrayBuffer
): { files: UnzippedFile[]; ignoredCount: number; errors: string[] } {
  const uint8 = new Uint8Array(arrayBuffer);
  const errors: string[] = [];
  const results: UnzippedFile[] = [];
  let ignoredCount = 0;

  let unzippedEntries: Record<string, Uint8Array>;
  try {
    unzippedEntries = unzipSync(uint8);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to extract ZIP archive: ${msg}`);
  }

  const entries = Object.entries(unzippedEntries);

  for (const [rawPath, data] of entries) {
    // Skip directory entries ending with /
    if (rawPath.endsWith('/')) continue;

    try {
      const normalized = normalizePath(rawPath);
      const { ignored } = isPathIgnored(normalized);
      if (ignored) {
        ignoredCount++;
        continue;
      }

      // Read text content safely
      const content = strFromU8(data);
      results.push({
        relativePath: normalized,
        content,
        byteSize: data.byteLength,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error reading entry "${rawPath}": ${msg}`);
    }
  }

  return { files: results, ignoredCount, errors };
}
