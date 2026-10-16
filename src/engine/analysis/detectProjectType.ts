import type { ParsedPackageJson } from '../parser/parsePackageJson';

export function detectProjectType(
  pkg: ParsedPackageJson | null,
  allPaths: string[]
): string {
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next']) return 'Next.js Application';
    if (deps['nuxt']) return 'Nuxt.js Application';
    if (deps['@remix-run/react']) return 'Remix Application';
    if (deps['react']) return deps['vite'] ? 'Vite + React SPA' : 'React Application';
    if (deps['vue']) return 'Vue.js Application';
    if (deps['svelte']) return 'Svelte Application';
    if (deps['express'] || deps['fastify'] || deps['koa'] || deps['@nestjs/core']) return 'Node.js Backend / API';
    if (deps['typescript']) return 'TypeScript Library';
  }

  const hasTs = allPaths.some(p => p.endsWith('.ts') || p.endsWith('.tsx'));
  const hasJsx = allPaths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx'));

  if (hasJsx && hasTs) return 'TypeScript React Project';
  if (hasTs) return 'TypeScript Project';
  if (hasJsx) return 'JavaScript React Project';
  return 'JavaScript Project';
}
