export function avatarUrl(mediaId: string | null | undefined): string | undefined {
  return mediaId ? `/api/media/${mediaId}` : undefined;
}
