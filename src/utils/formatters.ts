export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm)) + ' ' + sizes[safeI];
}

export function formatSpeed(filesPerSec: number): string {
  if (filesPerSec >= 1000) {
    return `${(filesPerSec / 1000).toFixed(1)}k files/s`;
  }
  return `${Math.round(filesPerSec)} files/s`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
