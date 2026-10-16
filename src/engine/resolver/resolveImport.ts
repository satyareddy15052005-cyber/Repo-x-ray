import type { ResolutionStatus } from '../../types/domain';
import type { ParsedTsConfig } from '../parser/parseProjectConfig';

export interface ResolveResult {
  resolutionStatus: ResolutionStatus;
  targetPath?: string;
  externalPackage?: string;
}

const CANDIDATE_EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
];

export function extractPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return specifier;
  }
  return specifier.split('/')[0];
}

export function resolveImport(
  sourcePath: string,
  specifier: string,
  allFilesSet: Set<string>,
  tsConfig?: ParsedTsConfig | null
): ResolveResult {
  // If specifier is empty
  if (!specifier.trim()) {
    return { resolutionStatus: 'unresolved' };
  }

  // 1. Check relative imports (starts with ./ or ../)
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const resolved = resolveRelativePath(sourcePath, specifier, allFilesSet);
    if (resolved) {
      return { resolutionStatus: 'internal', targetPath: resolved };
    }
    return { resolutionStatus: 'unresolved' };
  }

  // 2. Check path aliases from tsconfig (e.g. @/* or ~/*)
  if (tsConfig && tsConfig.paths) {
    for (const [aliasPattern, targetPatterns] of Object.entries(tsConfig.paths)) {
      const match = matchAliasPattern(specifier, aliasPattern);
      if (match !== null) {
        for (const targetPattern of targetPatterns) {
          const replaced = targetPattern.replace('*', match);
          const candidateBase = tsConfig.baseUrl ? `${tsConfig.baseUrl}/${replaced}` : replaced;
          const cleanCandidate = cleanPath(candidateBase);

          const resolved = resolveWithExtensions(cleanCandidate, allFilesSet);
          if (resolved) {
            return { resolutionStatus: 'internal', targetPath: resolved };
          }
        }
      }
    }
  }

  // 3. Check tsConfig.baseUrl direct imports
  if (tsConfig && tsConfig.baseUrl) {
    const cleanBase = cleanPath(`${tsConfig.baseUrl}/${specifier}`);
    const resolved = resolveWithExtensions(cleanBase, allFilesSet);
    if (resolved) {
      return { resolutionStatus: 'internal', targetPath: resolved };
    }
  }

  // 4. Check if specifier directly matches a known workspace file
  const directMatch = resolveWithExtensions(cleanPath(specifier), allFilesSet);
  if (directMatch) {
    return { resolutionStatus: 'internal', targetPath: directMatch };
  }

  // 5. Bare import -> external package
  // Bare imports don't start with / or ./ or ../
  if (!specifier.startsWith('/') && !specifier.startsWith('.')) {
    const pkgName = extractPackageName(specifier);
    return {
      resolutionStatus: 'external',
      externalPackage: pkgName,
    };
  }

  return { resolutionStatus: 'unresolved' };
}

function resolveRelativePath(
  sourcePath: string,
  specifier: string,
  allFilesSet: Set<string>
): string | null {
  const sourceDir = getDirectory(sourcePath);
  const combined = sourceDir ? `${sourceDir}/${specifier}` : specifier;
  const clean = cleanPath(combined);

  // If the import ends in .js or .jsx, it could be TypeScript ESM mapping to .ts or .tsx
  if (clean.endsWith('.js') || clean.endsWith('.jsx')) {
    const withoutExt = clean.substring(0, clean.lastIndexOf('.'));
    const tsCandidate = resolveWithExtensions(withoutExt, allFilesSet);
    if (tsCandidate) return tsCandidate;
  }

  return resolveWithExtensions(clean, allFilesSet);
}

function resolveWithExtensions(basePath: string, allFilesSet: Set<string>): string | null {
  for (const ext of CANDIDATE_EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (allFilesSet.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function matchAliasPattern(specifier: string, pattern: string): string | null {
  if (pattern === specifier) return '';
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    if (specifier.startsWith(prefix)) {
      return specifier.slice(prefix.length);
    }
  }
  return null;
}

function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return path.substring(0, lastSlash);
}

function cleanPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  const segments = normalized.split('/');
  const stack: string[] = [];

  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(seg);
    }
  }

  return stack.join('/');
}
