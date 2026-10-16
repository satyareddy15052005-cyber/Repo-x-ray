export const ANALYZABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.substring(lastDot).toLowerCase();
}

export function isAnalyzableFile(path: string): boolean {
  const ext = getFileExtension(path);
  return ANALYZABLE_EXTENSIONS.has(ext);
}

export function isConfigFile(path: string): boolean {
  const filename = path.split('/').pop()?.toLowerCase() || '';
  return (
    filename === 'package.json' ||
    filename === 'tsconfig.json' ||
    filename.startsWith('tsconfig.') && filename.endsWith('.json') ||
    filename === 'jsconfig.json'
  );
}

export function isLikelyEntryPoint(path: string): boolean {
  const lower = path.toLowerCase();
  const filename = lower.split('/').pop() || '';
  return (
    filename === 'main.tsx' ||
    filename === 'main.ts' ||
    filename === 'main.jsx' ||
    filename === 'main.js' ||
    filename === 'index.tsx' ||
    filename === 'index.ts' ||
    filename === 'index.jsx' ||
    filename === 'index.js' ||
    filename === 'app.tsx' ||
    filename === 'app.jsx' ||
    lower.includes('pages/_app') ||
    lower.includes('app/layout.') ||
    lower.includes('app/page.')
  );
}
