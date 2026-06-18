export function validateKeywordPhrase(value: string): { ok: boolean; message?: string; normalized?: string } {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return { ok: false, message: '❌ Kalit so\'z bo\'sh bo\'lmasin.' };
  if (normalized.length < 2) return { ok: false, message: '❌ Kalit so\'z juda qisqa.' };
  if (normalized.length > 64) return { ok: false, message: '❌ Kalit so\'z juda uzun (max 64).' };
  if (!/^[\p{L}\p{N}\s+\-_'`ʻʼ’]+$/u.test(normalized)) {
    return { ok: false, message: '❌ Kalit so\'zda ruxsat etilmagan belgilar bor.' };
  }
  return { ok: true, normalized };
}

export function validateLocationName(value: string): { ok: boolean; message?: string; normalized?: string } {
  const normalized = (value || '').trim();
  if (!normalized) return { ok: false, message: '❌ Joy nomi bo\'sh bo\'lmasin.' };
  if (normalized.length < 2) return { ok: false, message: '❌ Joy nomi juda qisqa.' };
  if (normalized.length > 80) return { ok: false, message: '❌ Joy nomi juda uzun (max 80).' };
  if (!/^[\p{L}\p{N}\s.,'`ʻʼ’\-()]+$/u.test(normalized)) {
    return { ok: false, message: '❌ Joy nomida ruxsat etilmagan belgilar bor.' };
  }
  return { ok: true, normalized };
}
