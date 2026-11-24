import blueprint from '../../firebase-blueprint.json';

export const ADMIN_EMAIL = 'Misganalead28@gmail.com';
export const DEFAULT_MONTHLY_DUES_ETB = 500;
export const DEFAULT_LATE_PENALTY_ETB = 50;

export const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;
export const MEMBER_CODE_PATTERN = /^[A-Z0-9\-]+$/;

export const LIMITS = {
  memberCodeMax: blueprint.entities.MemberProfile.properties.memberCode.maxLength ?? 32,
  fullNameMax: blueprint.entities.MemberProfile.properties.fullName.maxLength ?? 100,
  phoneMax: blueprint.entities.MemberProfile.properties.phone.maxLength ?? 30,
  addressMax: blueprint.entities.MemberProfile.properties.address.maxLength ?? 200,
  photoUrlMax: blueprint.entities.MemberProfile.properties.photoUrl.maxLength ?? 350000,
  receiptUrlMax: blueprint.entities.Contribution.properties.receiptImageUrl.maxLength ?? 450000,
  notesMax: blueprint.entities.Contribution.properties.notes.maxLength ?? 500,
  transactionRefMax: blueprint.entities.Contribution.properties.transactionRef.maxLength ?? 80,
  claimTitleMax: blueprint.entities.BenefitClaim.properties.title.maxLength ?? 150,
  claimDescMax: blueprint.entities.BenefitClaim.properties.description.maxLength ?? 1000,
  minutesMax: blueprint.entities.Meeting.properties.minutes.maxLength ?? 8000,
  announcementMax: blueprint.entities.Announcement.properties.message.maxLength ?? 2000,
  bylawContentMax: blueprint.entities.BylawArticle.properties.content.maxLength ?? 5000,
  auditSummaryMax: blueprint.entities.AuditLog.properties.summary.maxLength ?? 500,
};

export function clampStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  return cleaned || `id_${Date.now()}`;
}

export function sanitizeMemberCode(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .slice(0, LIMITS.memberCodeMax);
  return cleaned.length >= 3 ? cleaned : `AWY-${Date.now().toString().slice(-6)}`;
}

export function formatETB(amount: number): string {
  return new Intl.NumberFormat('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ETB';
}

export function isSafeImageUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/src/assets/')) return true;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function emailToInviteId(email: string): string {
  const normalized = email.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]/g, '_').slice(0, 100);
  return `inv_${safe}`;
}

export async function compressImageFile(
  file: File,
  maxBytes = 240000,
  maxDimension = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const dimensions = [maxDimension, 760, 560, 400];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        let bestDataUrl = '';
        for (const dim of dimensions) {
          let { width, height } = img;
          if (width > dim || height > dim) {
            const ratio = Math.min(dim / width, dim / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.82;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > maxBytes && quality > 0.25) {
            quality -= 0.14;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          bestDataUrl = dataUrl;
          if (dataUrl.length <= maxBytes) {
            resolve(dataUrl);
            return;
          }
        }

        if (bestDataUrl && bestDataUrl.length <= maxBytes) {
          resolve(bestDataUrl);
          return;
        }
        reject(new Error('Image is too large even after compression. Please pick a smaller image.'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const escapeCell = (cell: string | number | boolean) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
}
