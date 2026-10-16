export interface ParsedPackageJson {
  name: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  allExternalPackages: Set<string>;
}

export function parsePackageJson(content: string): ParsedPackageJson | null {
  try {
    const pkg = JSON.parse(content);
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const peerDeps = pkg.peerDependencies || {};

    const allExternalPackages = new Set<string>([
      ...Object.keys(deps),
      ...Object.keys(devDeps),
      ...Object.keys(peerDeps),
    ]);

    return {
      name: pkg.name || 'unnamed-project',
      version: pkg.version,
      dependencies: deps,
      devDependencies: devDeps,
      peerDependencies: peerDeps,
      allExternalPackages,
    };
  } catch {
    return null;
  }
}
