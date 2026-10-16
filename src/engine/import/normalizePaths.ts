export const DEFAULT_IGNORE_DIRS = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  'out',
  'target',
  'vendor',
];

export const SENSITIVE_PATTERNS = [
  /^\.env($|\..+)/i,
  /\.(pem|key|p12|pfx|pkcs12)$/i,
  /^(id_rsa|id_ed25519|id_ecdsa)$/i,
];

export function normalizePath(path: string): string {
  // Convert Windows backslashes
  let normalized = path.replace(/\\/g, '/');

  // Strip leading slashes and ./
  normalized = normalized.replace(/^(\.\/|\/)+/, '');

  // Normalize multi-slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Segments resolution
  const segments = normalized.split('/');
  const safeSegments: string[] = [];

  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (safeSegments.length > 0) {
        safeSegments.pop();
      } else {
        // Path traversal attempt outside root
        throw new Error(`Path traversal outside boundary: ${path}`);
      }
    } else {
      safeSegments.push(seg);
    }
  }

  return safeSegments.join('/');
}

export function isPathIgnored(
  relativePath: string,
  customIgnoreDirs: string[] = []
): { ignored: boolean; reason?: string } {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split('/');
  const filename = segments[segments.length - 1];

  // Check sensitive files
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(filename)) {
      return { ignored: true, reason: 'Sensitive security file skipped (.env / keys)' };
    }
  }

  // Check default ignore dirs
  const allIgnoreDirs = [...DEFAULT_IGNORE_DIRS, ...customIgnoreDirs];
  for (const dir of allIgnoreDirs) {
    if (segments.includes(dir)) {
      return { ignored: true, reason: `Ignored directory: ${dir}` };
    }
  }

  return { ignored: false };
}
