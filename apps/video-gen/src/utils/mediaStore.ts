import { get, set, del } from 'idb-keyval';

export async function saveMediaFile(id: string, file: File | Blob) {
  const canonicalKey = id.startsWith('media_') ? id : `media_${id}`;
  await set(canonicalKey, file);
  // Also store under double-prefixed key for backwards compatibility
  await set(`media_${canonicalKey}`, file);
}

export async function getMediaFile(id: string): Promise<File | Blob | undefined> {
  if (!id) return undefined;
  
  // Try all possible key variations (canonical, raw, prefixed, double-prefixed)
  const candidateKeys = [
    id.startsWith('media_') ? id : `media_${id}`,
    `media_${id}`,
    id,
    `media_media_${id.replace(/^media_/, '')}`,
    `media_${id.replace(/^media_/, '')}`,
    id.replace(/^media_/, '')
  ];

  for (const key of candidateKeys) {
    try {
      const file = await get(key);
      if (file && (file instanceof Blob || file.size > 0)) {
        return file;
      }
    } catch {}
  }

  return undefined;
}

export async function deleteMediaFile(id: string) {
  const candidateKeys = [
    id.startsWith('media_') ? id : `media_${id}`,
    `media_${id}`,
    id,
    `media_media_${id.replace(/^media_/, '')}`,
    `media_${id.replace(/^media_/, '')}`,
  ];
  for (const key of candidateKeys) {
    try {
      await del(key);
    } catch {}
  }
}

export async function saveAudioFile(file: File | Blob) {
  await set('omlila_audio_file', file);
}

export async function getAudioFile(): Promise<File | Blob | undefined> {
  return await get('omlila_audio_file');
}
