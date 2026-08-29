import { get, set, del } from 'idb-keyval';

export async function saveMediaFile(id: string, file: File | Blob) {
  await set(`media_${id}`, file);
}

export async function getMediaFile(id: string): Promise<File | Blob | undefined> {
  return await get(`media_${id}`);
}

export async function deleteMediaFile(id: string) {
  await del(`media_${id}`);
}

export async function saveAudioFile(file: File | Blob) {
  await set('omlila_audio_file', file);
}

export async function getAudioFile(): Promise<File | Blob | undefined> {
  return await get('omlila_audio_file');
}
