import * as FileSystem from 'expo-file-system/legacy';

function normalizeUri(uri: string): string {
  return uri.startsWith('/') ? 'file://' + uri : uri;
}

export async function fileToBase64(uri: string, mimeType = 'audio/m4a'): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(normalizeUri(uri), {
    encoding: 'base64' as any,
  });
  return `data:${mimeType};base64,${base64}`;
}

export async function base64ToTempFile(dataUrl: string, ext: string, key: string): Promise<string> {
  const b64 = dataUrl.split(',')[1];
  const path = FileSystem.cacheDirectory + key + '.' + ext;
  await FileSystem.writeAsStringAsync(path, b64, {
    encoding: 'base64' as any,
  });
  return path;
}
