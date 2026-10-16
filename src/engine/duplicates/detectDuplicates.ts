import type {
  SourceFileRecord,
  DuplicateGroup,
  DuplicateOccurrence,
  ProjectId,
} from '../../types/domain';

export interface DuplicateDetectionOptions {
  minLines?: number;
  similarityThreshold?: number;
}

// Tokenize and normalize code into structural tokens
function normalizeCodeLines(code: string): Array<{ line: number; normalized: string; original: string }> {
  const lines = code.split('\n');
  const result: Array<{ line: number; normalized: string; original: string }> = [];

  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'import',
    'export', 'default', 'new', 'this', 'typeof', 'instanceof', 'try', 'catch',
    'finally', 'throw', 'async', 'await', 'true', 'false', 'null', 'undefined',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines, comments, and trivial imports
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed === '}' ||
      trimmed === '{' ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export {')
    ) {
      continue;
    }

    // Normalize strings & numbers
    let normalized = trimmed
      .replace(/(['"`])(?:(?=(\\?))\2.)*?\1/g, 'STR')
      .replace(/\b\d+(\.\d+)?\b/g, 'NUM');

    // Normalize identifiers (variable names) that are not language keywords
    normalized = normalized.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, token => {
      return KEYWORDS.has(token) ? token : 'ID';
    });

    normalized = normalized.replace(/\s+/g, ' ');

    result.push({
      line: i + 1,
      normalized,
      original: raw,
    });
  }

  return result;
}

export function detectDuplicates(
  projectId: ProjectId,
  sourceFiles: SourceFileRecord[],
  fileContentsMap: Map<string, string>,
  options: DuplicateDetectionOptions = {}
): DuplicateGroup[] {
  const minLines = options.minLines || 6;
  const chunkMap = new Map<string, Array<{ fileId: string; relativePath: string; startLine: number; endLine: number; snippet: string }>>();

  for (const file of sourceFiles) {
    const content = fileContentsMap.get(file.relativePath);
    if (!content) continue;

    const normalizedLines = normalizeCodeLines(content);
    if (normalizedLines.length < minLines) continue;

    // Sliding window of `minLines`
    for (let i = 0; i <= normalizedLines.length - minLines; i++) {
      const window = normalizedLines.slice(i, i + minLines);
      const structuralFingerprint = window.map(w => w.normalized).join(';');

      // Only check non-trivial blocks
      if (structuralFingerprint.length < 50) continue;

      let list = chunkMap.get(structuralFingerprint);
      if (!list) {
        list = [];
        chunkMap.set(structuralFingerprint, list);
      }

      const startLine = window[0].line;
      const endLine = window[window.length - 1].line;
      const snippet = window.map(w => w.original).join('\n');

      // Prevent overlapping blocks within same file
      const hasOverlap = list.some(
        item => item.fileId === file.id && Math.abs(item.startLine - startLine) < minLines
      );
      if (!hasOverlap) {
        list.push({
          fileId: file.id,
          relativePath: file.relativePath,
          startLine,
          endLine,
          snippet,
        });
      }
    }
  }

  // Filter groups with 2 or more occurrences
  const duplicateGroups: DuplicateGroup[] = [];
  let groupCounter = 1;

  for (const [fingerprint, occurrences] of chunkMap.entries()) {
    if (occurrences.length >= 2) {
      // Calculate token count approx
      const tokenCount = fingerprint.split(';').length * 4;

      const dupOccurrences: DuplicateOccurrence[] = occurrences.map(occ => ({
        fileId: occ.fileId,
        relativePath: occ.relativePath,
        startLine: occ.startLine,
        endLine: occ.endLine,
        codeSnippet: occ.snippet,
      }));

      duplicateGroups.push({
        id: `dup-${projectId}-${groupCounter++}`,
        projectId,
        tokenCount,
        lineCount: minLines,
        similarity: 100, // exact structural token match
        occurrences: dupOccurrences,
        fingerprint,
      });

      if (duplicateGroups.length >= 50) break; // Keep most significant groups
    }
  }

  return duplicateGroups;
}
