import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Printer, ShieldCheck, X } from 'lucide-react';
import type { IddirMember } from '../types';
import {
  ASSOCIATION_SUBTITLE_AM,
  MEMBER_STATUS_AM,
  SYSTEM_NAME_AM,
} from '../i18n';
import { ASSETS_IMG } from '../services/iddirStore';
import { clampStr, compressImageFile, isSafeImageUrl, LIMITS } from '../utils/validation';

interface Props {
  member: IddirMember;
  canEditPhoto?: boolean;
  onUpdatePhoto?: (memberId: string, photoDataUrl: string) => void;
  onClose: () => void;
}

export function DigitalIdCardModal({
  member,
  canEditPhoto = false,
  onUpdatePhoto,
  onClose,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const [emblemError, setEmblemError] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string>(member.photoUrl || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState('');
  const [photoError, setPhotoError] = useState(false);

  const qrPayload = JSON.stringify({
    association: ASSOCIATION_SUBTITLE_AM,
    code: member.memberCode,
    name: member.fullName,
    status: MEMBER_STATUS_AM[member.status],
    joined: member.joinDate,
  });

  const activePhoto = customPhoto || member.photoUrl;
  const photoSrc =
    !imgError && isSafeImageUrl(activePhoto) ? activePhoto : ASSETS_IMG.maleAvatar;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpdatePhoto) return;
    setUploadingPhoto(true);
    setPhotoFeedback('');
    setPhotoError(false);
    try {
      const compressed = await compressImageFile(file, 160000, 512);
      const safePhoto = clampStr(compressed, LIMITS.photoUrlMax);
      onUpdatePhoto(member.id, safePhoto);
      setCustomPhoto(safePhoto);
      setImgError(false);
      setPhotoFeedback('የመታወቂያ ፎቶ በተሳካ ሁኔታ ተቀምጧል።');
    } catch {
      setPhotoError(true);
      setPhotoFeedback('ፎቶውን ማስገባት አልተቻለም። እባክዎ አነስ ያለ የምስል ፋይል ይምረጡ።');
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ዲጂታል የአባልነት መታወቂያ"
    >
      <div className="bg-white border border-[#E2E6E1] rounded-2xl max-w-xl w-full overflow-hidden">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-[#E2E6E1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#14532D]" />
            <h3 className="text-base font-semibold text-[#111815]">
              ዲጂታል የአባልነት መታወቂያ
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {canEditPhoto && onUpdatePhoto && (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB] cursor-pointer whitespace-nowrap shrink-0">
                <Camera className="w-3.5 h-3.5 text-[#14532D]" />
                {uploadingPhoto ? 'በመጫን ላይ...' : 'ፎቶ አስገባ / ቀይር'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              መታወቂያ አትም
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#4B5563] hover:text-[#111815] rounded-lg hover:bg-[#F3F4F6] transition-colors"
              aria-label="ዝጋ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#F7F8F6] space-y-3">
          {photoFeedback && (
            <p
              className={`no-print text-xs font-medium text-center ${
                photoError ? 'text-[#DC2626]' : 'text-[#16A34A]'
              }`}
            >
              {photoFeedback}
            </p>
          )}

          <div className="print-only-card bg-white border border-[#D1D5DB] rounded-xl overflow-hidden">
            <div className="bg-[#14532D] text-white px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {!emblemError ? (
                  <img
                    src={ASSETS_IMG.emblem}
                    alt="የዕድር አርማ"
                    referrerPolicy="no-referrer"
                    onError={() => setEmblemError(true)}
                    className="w-11 h-11 rounded-lg object-cover bg-white p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-[#0F3F22] flex items-center justify-center text-xs font-bold shrink-0">
                    ዕድር
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#FDE68A] truncate">
                    {ASSOCIATION_SUBTITLE_AM}
                  </p>
                  <p className="text-[11px] text-white/90 truncate">{SYSTEM_NAME_AM}</p>
                </div>
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-[#FDE68A] shrink-0">
                {member.memberCode}
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-[104px_1fr_108px] gap-5 items-center">
              <div className="relative w-[104px] h-[120px] rounded-lg overflow-hidden border border-[#E2E6E1] bg-[#F3F4F6] mx-auto sm:mx-0">
                <img
                  src={photoSrc}
                  alt={member.fullName}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 text-left">
                <div>
                  <p className="text-xs text-[#6B7280]">ሙሉ ስም</p>
                  <p className="text-base font-bold text-[#111815] leading-snug">
                    {member.fullName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-xs">
                  <div>
                    <span className="text-[#6B7280] block">ሁኔታ</span>
                    <span
                      className={`font-semibold ${
                        member.status === 'active' ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      {MEMBER_STATUS_AM[member.status]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">የመግቢያ ቀን</span>
                    <span className="font-mono-tabular font-medium text-[#111815]">
                      {member.joinDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">ስልክ ቁጥር</span>
                    <span className="font-mono-tabular font-medium text-[#111815]">
                      {member.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">አድራሻ</span>
                    <span className="font-medium text-[#111815]">
                      {member.subCity} · {member.kebele}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-2.5 mx-auto sm:mx-0">
                <QRCodeSVG value={qrPayload} size={88} level="M" />
                <span className="font-mono-tabular text-[10px] text-[#4B5563] mt-1.5">
                  {member.memberCode}
                </span>
              </div>
            </div>

            <div className="px-5 py-2.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>ተጠቃሚ የቤተሰብ አባላት: {member.dependents.length}</span>
              <span>ሕጋዊ የዕድር ዲጂታል መታወቂያ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
