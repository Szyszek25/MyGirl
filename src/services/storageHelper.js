import { File } from 'expo-file-system/next';

export function resolveContentType(uri, fallback = 'image/jpeg') {
  if (!uri || typeof uri !== 'string') return fallback;
  const clean = uri.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  if (clean.endsWith('.m4a')) return 'audio/m4a';
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.webm')) return 'audio/webm';
  return fallback;
}

export function extensionForContentType(type = 'image/jpeg') {
  const clean = (type || '').toLowerCase();
  if (clean.includes('png')) return 'png';
  if (clean.includes('webp')) return 'webp';
  if (clean.includes('gif')) return 'gif';
  if (clean.includes('mp4')) return 'mp4';
  if (clean.includes('quicktime') || clean.includes('mov')) return 'mov';
  if (clean.includes('m4a')) return 'm4a';
  if (clean.includes('mpeg') || clean.includes('mp3')) return 'mp3';
  if (clean.includes('webm')) return 'webm';
  return 'jpg';
}

/**
 * Reads local URI as ArrayBuffer using expo-file-system for reliable MIME type.
 * Fixes React Native fetch().blob() sending text/plain for file:// URIs.
 */
export async function uriToUploadPayload(uri, fallbackType = 'image/jpeg') {
  const contentType = resolveContentType(uri, fallbackType);
  const file = new File(uri);
  const base64 = await file.readAsStringAsync({ encoding: 'base64' });
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
  return { buffer, contentType };
}