export interface ParsedTsConfig {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export function parseTsConfig(content: string): ParsedTsConfig | null {
  try {
    // Strip comments (// ... and /* ... */)
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1'); // remove trailing commas

    const json = JSON.parse(cleaned);
    const compilerOptions = json.compilerOptions || {};

    return {
      baseUrl: compilerOptions.baseUrl,
      paths: compilerOptions.paths,
    };
  } catch {
    return null;
  }
}
