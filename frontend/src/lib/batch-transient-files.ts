const transientBatchFiles = new Map<string, File[]>();

export function setTransientBatchFiles(entries: Record<string, File[]>): void {
  Object.entries(entries).forEach(([key, files]) => {
    transientBatchFiles.set(key, files);
  });
}

export function getTransientBatchFiles(key: string): File[] {
  return transientBatchFiles.get(key) ?? [];
}

export function clearTransientBatchFiles(keys?: string[]): void {
  if (!keys || keys.length === 0) {
    transientBatchFiles.clear();
    return;
  }
  keys.forEach((key) => transientBatchFiles.delete(key));
}