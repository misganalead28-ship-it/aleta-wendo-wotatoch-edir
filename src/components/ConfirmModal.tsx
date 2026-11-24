import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'አረጋግጥ',
  cancelLabel = 'ተወው',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white border border-[#E2E6E1] rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${danger ? 'text-[#DC2626]' : 'text-[#B45309]'}`}
            />
            <h3 className="text-base font-semibold text-[#111815]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-[#6B7280] hover:text-[#111815] rounded-lg hover:bg-[#F3F4F6]"
            aria-label="ዝጋ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#4B5563] leading-relaxed">{description}</p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] text-[#374151] bg-white rounded-lg hover:bg-[#F9FAFB]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors ${
              danger
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#14532D] hover:bg-[#166534]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
