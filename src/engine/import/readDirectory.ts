import { normalizePath, isPathIgnored } from './normalizePaths';

export interface DirectoryFileEntry {
  relativePath: string;
  content: string;
  byteSize: number;
}

export async function readFileInputFileList(
  fileList: FileList,
  onProgress?: (read: number, total: number) => void
): Promise<{ files: DirectoryFileEntry[]; ignoredCount: number; errors: string[] }> {
  const files: DirectoryFileEntry[] = [];
  const errors: string[] = [];
  let ignoredCount = 0;
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;

    try {
      const normalized = normalizePath(path);
      const { ignored } = isPathIgnored(normalized);
      if (ignored) {
        ignoredCount++;
        continue;
      }

      const content = await file.text();
      files.push({
        relativePath: normalized,
        content,
        byteSize: file.size,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Could not read file "${path}": ${msg}`);
    }

    if (onProgress && i % 10 === 0) {
      onProgress(i + 1, total);
    }
  }

  if (onProgress) {
    onProgress(total, total);
  }

  return { files, ignoredCount, errors };
}

// Support for File System Access API (showDirectoryPicker)
export async function readFileSystemDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  basePath = '',
  onProgress?: (count: number) => void
): Promise<{ files: DirectoryFileEntry[]; ignoredCount: number; errors: string[] }> {
  const files: DirectoryFileEntry[] = [];
  const errors: string[] = [];
  let ignoredCount = 0;

  async function walk(handle: FileSystemDirectoryHandle, currentPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [name, entry] of (handle as any).entries()) {
      const itemPath = currentPath ? `${currentPath}/${name}` : name;
      try {
        const normalized = normalizePath(itemPath);
        const { ignored } = isPathIgnored(normalized);
        if (ignored) {
          ignoredCount++;
          continue;
        }

        if (entry.kind === 'directory') {
          await walk(entry as FileSystemDirectoryHandle, itemPath);
        } else if (entry.kind === 'file') {
          const file = await (entry as FileSystemFileHandle).getFile();
          const content = await file.text();
          files.push({
            relativePath: normalized,
            content,
            byteSize: file.size,
          });
          if (onProgress && files.length % 10 === 0) {
            onProgress(files.length);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed reading "${itemPath}": ${msg}`);
      }
    }
  }

  await walk(dirHandle, basePath);
  return { files, ignoredCount, errors };
}
