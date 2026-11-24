import { Printer, X } from 'lucide-react';
import type { ContributionRecord, ExpenseRecord, OfficialLetter } from '../types';
import {
  ASSOCIATION_SUBTITLE_AM,
  CONTRIBUTION_TYPE_AM,
  PAYMENT_METHOD_AM,
  formatCurrencyETB,
  formatDateTimeAm,
} from '../i18n';

export type PrintableDocument =
  | { kind: 'receipt'; contribution: ContributionRecord }
  | { kind: 'receipt_image'; contribution: ContributionRecord }
  | { kind: 'letter'; letter: OfficialLetter }
  | {
      kind: 'financial_summary';
      monthLabel: string;
      totalIncome: number;
      totalApprovedExpenses: number;
      netBalance: number;
      paidCount: number;
      unpaidCount: number;
      recentContributions: ContributionRecord[];
      recentExpenses: ExpenseRecord[];
      preparedBy: string;
    };

interface Props {
  documentData: PrintableDocument | null;
  onClose: () => void;
}

export function ReceiptPrintModal({ documentData, onClose }: Props) {
  if (!documentData) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="የህትመት ሰነድ"
    >
      <div className="bg-white border border-[#E2E6E1] rounded-2xl max-w-2xl w-full overflow-hidden my-auto">
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#E2E6E1]">
          <h3 className="text-base font-semibold text-[#111815]">
            {documentData.kind === 'receipt'
              ? 'የክፍያ ደረሰኝ'
              : documentData.kind === 'receipt_image'
              ? 'የተያያዘ የባንክ / ቴሌብር ደረሰኝ ቅጂ'
              : documentData.kind === 'letter'
              ? 'ኦፊሴላዊ የዕድር ደብዳቤ'
              : 'ወርሃዊ የፋይናንስና ኦዲት ማጠቃለያ'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Printer className="w-3.5 h-3.5" />
              አትም / PDF አስቀምጥ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#4B5563] hover:text-[#111815] rounded-lg hover:bg-[#F3F4F6]"
              aria-label="ዝጋ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#F7F8F6]">
          <div className="print-only-card bg-white border border-[#D1D5DB] rounded-xl p-6 space-y-5">
            <div className="border-b border-[#E5E7EB] pb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#14532D]">{ASSOCIATION_SUBTITLE_AM}</p>
                <h4 className="text-lg font-bold text-[#111815] mt-0.5">
                  {documentData.kind === 'receipt'
                    ? 'ኦፊሴላዊ የገቢ ደረሰኝ'
                    : documentData.kind === 'receipt_image'
                    ? 'በአባል የተያያዘ የባንክ / ቴሌብር ደረሰኝ'
                    : documentData.kind === 'letter'
                    ? 'የጽሕፈት ቤት ኦፊሴላዊ ደብዳቤ'
                    : `የፋይናንስና ኦዲት ሪፖርት — ${documentData.monthLabel}`}
                </h4>
              </div>
              <div className="text-right text-xs text-[#6B7280] font-mono-tabular">
                {(documentData.kind === 'receipt' || documentData.kind === 'receipt_image') && (
                  <>
                    <p className="font-semibold text-[#111815]">
                      {documentData.contribution.receiptNumber}
                    </p>
                    <p>{formatDateTimeAm(documentData.contribution.recordedAt)}</p>
                  </>
                )}
                {documentData.kind === 'letter' && (
                  <>
                    <p className="font-semibold text-[#111815]">
                      ቁጥር: {documentData.letter.letterNumber}
                    </p>
                    <p>ቀን: {documentData.letter.issueDate}</p>
                  </>
                )}
                {documentData.kind === 'financial_summary' && (
                  <p>ቀን: {new Date().toISOString().slice(0, 10)}</p>
                )}
              </div>
            </div>

            {documentData.kind === 'receipt_image' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#6B7280] block">አባል</span>
                    <span className="font-semibold text-[#111815]">
                      {documentData.contribution.memberName} ({documentData.contribution.memberCode})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">መጠን እና ወር</span>
                    <span className="font-semibold font-mono-tabular text-[#14532D]">
                      {formatCurrencyETB(documentData.contribution.amount)} ·{' '}
                      {documentData.contribution.periodLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">ባንክ / መንገድ</span>
                    <span className="font-medium text-[#111815]">
                      {documentData.contribution.bankName ||
                        PAYMENT_METHOD_AM[documentData.contribution.paymentMethod]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">የግብይት ማጣቀሻ (Reference)</span>
                    <span className="font-mono-tabular font-semibold text-[#111815]">
                      {documentData.contribution.referenceCode}
                    </span>
                  </div>
                </div>
                {documentData.contribution.receiptImageUrl ? (
                  <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-[#F9FAFB] flex justify-center p-2">
                    <img
                      src={documentData.contribution.receiptImageUrl}
                      alt="የባንክ ደረሰኝ"
                      className="max-h-[420px] object-contain rounded"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280] py-6 text-center">
                    የተያያዘ የደረሰኝ ፎቶ የለም።
                  </p>
                )}
              </div>
            )}

            {documentData.kind === 'receipt' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#6B7280]">የከፋይ አባል ስም</p>
                    <p className="font-semibold text-[#111815]">
                      {documentData.contribution.memberName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">የአባል መለያ ቁጥር</p>
                    <p className="font-mono-tabular font-semibold text-[#111815]">
                      {documentData.contribution.memberCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">የክፍያ ዓይነት</p>
                    <p className="font-medium text-[#111815]">
                      {CONTRIBUTION_TYPE_AM[documentData.contribution.type]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">የሚሸፍነው ወር</p>
                    <p className="font-medium text-[#111815]">
                      {documentData.contribution.periodLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">የክፍያ መንገድ</p>
                    <p className="font-medium text-[#111815]">
                      {PAYMENT_METHOD_AM[documentData.contribution.paymentMethod]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">ማጣቀሻ ቁጥር (Reference)</p>
                    <p className="font-mono-tabular font-medium text-[#111815]">
                      {documentData.contribution.referenceCode}
                    </p>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#374151]">ጠቅላላ የተከፈለ መጠን</span>
                  <span className="text-xl font-bold font-mono-tabular text-[#14532D]">
                    {formatCurrencyETB(documentData.contribution.amount)}
                  </span>
                </div>

                {documentData.contribution.notes && (
                  <p className="text-xs text-[#4B5563]">
                    ማስታወሻ: {documentData.contribution.notes}
                  </p>
                )}

                <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>የመዘገበው ገንዘብ ያዥ: {documentData.contribution.recordedByName}</span>
                  <span>የዕድሩ ማኅተም እና ፊርማ</span>
                </div>
              </div>
            )}

            {documentData.kind === 'letter' && (
              <div className="space-y-4 text-sm text-[#111815]">
                <div>
                  <p className="text-xs text-[#6B7280]">ለ:</p>
                  <p className="font-semibold">{documentData.letter.recipient}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">ጉዳዩ:</p>
                  <p className="font-semibold underline">{documentData.letter.subject}</p>
                </div>
                <div className="leading-relaxed whitespace-pre-line text-[#374151] py-2">
                  {documentData.letter.body}
                </div>
                <div className="pt-6 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>ያዘጋጀው ፀሐፊ: {documentData.letter.issuedByName}</span>
                  <span>ከሰላምታ ጋር · የዕድሩ አመራር</span>
                </div>
              </div>
            )}

            {documentData.kind === 'financial_summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3">
                    <p className="text-xs text-[#6B7280]">ጠቅላላ ገቢ</p>
                    <p className="text-base font-bold font-mono-tabular text-[#14532D] mt-0.5">
                      {formatCurrencyETB(documentData.totalIncome)}
                    </p>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3">
                    <p className="text-xs text-[#6B7280]">የጸደቀ ወጪ</p>
                    <p className="text-base font-bold font-mono-tabular text-[#B45309] mt-0.5">
                      {formatCurrencyETB(documentData.totalApprovedExpenses)}
                    </p>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3">
                    <p className="text-xs text-[#6B7280]">የተጣራ ቀሪ ሂሳብ</p>
                    <p className="text-base font-bold font-mono-tabular text-[#111815] mt-0.5">
                      {formatCurrencyETB(documentData.netBalance)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#4B5563]">
                  የወሩ የመዋጮ ሁኔታ: የከፈሉ አባላት {documentData.paidCount} · ያልከፈሉ አባላት{' '}
                  {documentData.unpaidCount}
                </p>

                <div>
                  <p className="text-xs font-semibold text-[#111815] mb-2">
                    የቅርብ ጊዜ መዋጮዎች ({documentData.recentContributions.length})
                  </p>
                  <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F9FAFB] text-[#6B7280]">
                        <tr>
                          <th className="px-3 py-2 font-medium">ደረሰኝ</th>
                          <th className="px-3 py-2 font-medium">አባል</th>
                          <th className="px-3 py-2 font-medium">ወር</th>
                          <th className="px-3 py-2 font-medium text-right">መጠን</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {documentData.recentContributions.slice(0, 8).map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-2 font-mono-tabular">{c.receiptNumber}</td>
                            <td className="px-3 py-2">{c.memberName}</td>
                            <td className="px-3 py-2">{c.periodLabel}</td>
                            <td className="px-3 py-2 text-right font-mono-tabular font-medium">
                              {formatCurrencyETB(c.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>ሪፖርቱን ያዘጋጀው / ያየው: {documentData.preparedBy}</span>
                  <span>{ASSOCIATION_SUBTITLE_AM}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
