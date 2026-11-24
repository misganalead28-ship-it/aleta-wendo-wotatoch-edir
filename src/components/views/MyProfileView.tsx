import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileImage,
  IdCard,
  Loader2,
  Printer,
  Send,
  Upload,
  Users,
} from 'lucide-react';
import type {
  ContributionRecord,
  ContributionType,
  IddirMember,
  MemberOutstandingSummary,
  PaymentMethod,
} from '../../types';
import {
  CONTRIBUTION_TYPE_AM,
  ETHIOPIAN_BANKS_AM,
  MEMBER_STATUS_AM,
  PAYMENT_AUTH_STATUS_AM,
  PAYMENT_METHOD_AM,
  RELATIONSHIP_AM,
  formatCurrencyETB,
  formatMonthLabelAm,
  getCurrentMonthKey,
} from '../../i18n';
import { ASSETS_IMG } from '../../services/iddirStore';
import { compressImageFile } from '../../utils/validation';
import type { PrintableDocument } from '../ReceiptPrintModal';

interface Props {
  member?: IddirMember;
  ownContributions: ContributionRecord[];
  outstanding: MemberOutstandingSummary | null;
  onSubmitPayment: (payload: {
    monthKey: string;
    type: ContributionType;
    amount: number;
    paymentMethod: PaymentMethod;
    bankName: string;
    referenceCode: string;
    receiptImageUrl?: string;
    notes?: string;
  }) => ContributionRecord | null;
  onOpenIdCard: (member: IddirMember) => void;
  onPrintDocument: (doc: PrintableDocument) => void;
}

export function MyProfileView({
  member,
  ownContributions,
  outstanding,
  onSubmitPayment,
  onOpenIdCard,
  onPrintDocument,
}: Props) {
  const currentMonth = getCurrentMonthKey();

  // Member Payment Submission State
  const defaultMonth =
    outstanding?.unpaidMonths[0]?.monthKey || currentMonth;
  const [pType, setPType] = useState<ContributionType>('monthly');
  const [pMonthKey, setPMonthKey] = useState(defaultMonth);
  const [pAmount, setPAmount] = useState(
    String(member?.monthlyDuesRate || 500)
  );
  const [pMethod, setPMethod] = useState<PaymentMethod>('bank_transfer');
  const [pBankName, setPBankName] = useState(ETHIOPIAN_BANKS_AM[0]);
  const [pRef, setPRef] = useState('');
  const [pNotes, setPNotes] = useState('');
  const [pReceiptImg, setPReceiptImg] = useState<string>('');
  const [extractingReceipt, setExtractingReceipt] = useState(false);
  const [receiptHint, setReceiptHint] = useState('');

  if (!member) {
    return (
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-8 text-center space-y-2">
        <p className="text-base font-semibold text-[#111815]">
          የአባልነት ፕሮፋይል ከዚህ መለያ ጋር አልተገናኘም
        </p>
        <p className="text-xs text-[#4B5563]">
          እባክዎ የአባልነት መዝገብዎን እንዲያገናኙልዎ የሲስተም አድሚንን ያነጋግሩ።
        </p>
      </div>
    );
  }

  async function handleReceiptFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReceiptHint('');
    try {
      const compressed = await compressImageFile(file, 320000, 1000);
      setPReceiptImg(compressed);
      setExtractingReceipt(true);
      try {
        const res = await fetch('/api/extract-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: compressed }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            transactionRef?: string;
            amount?: number;
            paymentMethod?: PaymentMethod;
            summary?: string;
          };
          if (data.transactionRef) setPRef(data.transactionRef);
          if (data.amount && data.amount > 0) setPAmount(String(data.amount));
          if (data.paymentMethod) {
            setPMethod(data.paymentMethod);
            if (data.paymentMethod === 'telebirr') {
              setPBankName('ቴሌብር (Telebirr)');
            }
          }
          setReceiptHint(
            data.transactionRef
              ? `ከደረሰኙ የተነበበ ማጣቀሻ: ${data.transactionRef}${data.summary ? ` (${data.summary})` : ''}`
              : 'ደረሰኙ ተያይዟል። እባክዎ መጠን እና ማጣቀሻውን ያረጋግጡ።'
          );
        } else {
          setReceiptHint('ደረሰኙ ተያይዟል። የግብይት ማጣቀሻ ቁጥሩን በእጅ ያስገቡ።');
        }
      } catch {
        setReceiptHint('ደረሰኙ ተያይዟል። የግብይት ማጣቀሻ ቁጥሩን ያረጋግጡ።');
      } finally {
        setExtractingReceipt(false);
      }
    } catch {
      setReceiptHint('የተመረጠውን የደረሰኝ ምስል መጫን አልተቻለም። እባክዎ አነስ ያለ ፋይል ይምረጡ።');
    }
  }

  function handlePrefillUnpaid(monthKey: string, duesAmount: number, penaltyAmount: number) {
    setPType('monthly');
    setPMonthKey(monthKey);
    setPAmount(String(duesAmount));
    setPNotes(
      penaltyAmount > 0
        ? `የ${formatMonthLabelAm(monthKey)} ውዝፍ መዋጮ (ቅጣት: ${penaltyAmount} ብር ይጨምራል)`
        : `የ${formatMonthLabelAm(monthKey)} ወርሃዊ መዋጮ`
    );
    const formEl = document.getElementById('member-payment-form');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = onSubmitPayment({
      monthKey: pMonthKey,
      type: pType,
      amount: Number(pAmount) || member?.monthlyDuesRate || 500,
      paymentMethod: pMethod,
      bankName: pBankName,
      referenceCode: pRef,
      receiptImageUrl: pReceiptImg || undefined,
      notes: pNotes,
    });
    if (created) {
      setPRef('');
      setPNotes('');
      setPReceiptImg('');
      setReceiptHint('');
    }
  }

  const paidThisMonth = outstanding?.currentMonthPaid ?? false;
  const totalOutstanding = outstanding?.totalOutstanding ?? 0;

  return (
    <div className="space-y-6">
      {/* Personal Profile Card */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={member.photoUrl || ASSETS_IMG.maleAvatar}
              alt={member.fullName}
              className="w-16 h-16 rounded-xl object-cover border border-[#E2E6E1]"
            />
            <div>
              <p className="text-xs font-mono-tabular font-semibold text-[#14532D]">
                {member.memberCode}
              </p>
              <h2 className="text-xl font-bold text-[#111815]">{member.fullName}</h2>
              <p className="text-xs text-[#4B5563]">
                ሁኔታ:{' '}
                <span
                  className={`font-semibold ${
                    member.status === 'active' ? 'text-[#16A34A]' : 'text-[#D97706]'
                  }`}
                >
                  {MEMBER_STATUS_AM[member.status]}
                </span>{' '}
                · የተመዘገቡበት ቀን:{' '}
                <span className="font-mono-tabular">{member.joinDate}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenIdCard(member)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] self-start sm:self-center"
          >
            <IdCard className="w-4 h-4" />
            ዲጂታል መታወቂያ አሳይ
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#E5E7EB] text-xs">
          <div>
            <span className="text-[#6B7280] block">ስልክ ቁጥር</span>
            <span className="font-mono-tabular font-semibold text-[#111815] mt-0.5 block">
              {member.phone}
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] block">አድራሻ (ክፍለ ከተማ / ቀበሌ)</span>
            <span className="font-semibold text-[#111815] mt-0.5 block">
              {member.subCity} · {member.kebele}
              {member.addressNote ? ` (${member.addressNote})` : ''}
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] block">ዋስ / አስተዋዋቂ</span>
            <span className="font-semibold text-[#111815] mt-0.5 block">
              {member.guarantorName || 'አልተመዘገበም'}
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] block">ወርሃዊ የመዋጮ መጠን</span>
            <span className="font-mono-tabular font-semibold text-[#14532D] mt-0.5 block">
              {formatCurrencyETB(member.monthlyDuesRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Outstanding Balance, Arrears & Penalty Breakdown */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#111815]">
              ያልተከፈለ ውዝፍ፣ ቅጣት እና ጠቅላላ ቀሪ ሂሳብ (Outstanding Balance)
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              ያልተከፈሉ ወርሃዊ መዋጮዎች፣ የዘገየ ክፍያ ቅጣቶች እና ማጽደቂያ የሚጠብቁ የተላኩ ክፍያዎች
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#6B7280] block">ጠቅላላ የሚፈለግ ቀሪ ሂሳብ</span>
            <span
              className={`text-xl font-bold font-mono-tabular ${
                totalOutstanding > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
              }`}
            >
              {formatCurrencyETB(totalOutstanding)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5">
            <span className="text-[11px] text-[#6B7280] block">ያልተከፈለ ውዝፍ መዋጮ</span>
            <span className="text-base font-bold font-mono-tabular text-[#111815] mt-1 block">
              {formatCurrencyETB(outstanding?.totalUnpaidDues || 0)}
            </span>
          </div>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5">
            <span className="text-[11px] text-[#6B7280] block">የዘገየ ክፍያ ቅጣት</span>
            <span className="text-base font-bold font-mono-tabular text-[#B45309] mt-1 block">
              {formatCurrencyETB(outstanding?.totalPenalties || 0)}
            </span>
          </div>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5">
            <span className="text-[11px] text-[#6B7280] block">ማጽደቂያ የሚጠብቅ ክፍያ</span>
            <span className="text-base font-bold font-mono-tabular text-[#14532D] mt-1 block">
              {formatCurrencyETB(outstanding?.pendingSubmittedAmount || 0)}
            </span>
          </div>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5">
            <span className="text-[11px] text-[#6B7280] block">ጠቅላላ የጸደቀ ክፍያ</span>
            <span className="text-base font-bold font-mono-tabular text-[#16A34A] mt-1 block">
              {formatCurrencyETB(outstanding?.authorizedPaidTotal || 0)}
            </span>
          </div>
        </div>

        {outstanding && outstanding.unpaidMonths.length > 0 ? (
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">ያልተከፈለ ወር</th>
                  <th className="px-3.5 py-2.5 font-medium">ሁኔታ</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">መደበኛ መዋጮ</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">ቅጣት</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">ድምር</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">እርምጃ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {outstanding.unpaidMonths.map((item) => (
                  <tr key={item.monthKey} className="hover:bg-[#F9FAFB]">
                    <td className="px-3.5 py-2.5 font-medium text-[#111815]">
                      {item.periodLabel}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`font-semibold ${
                          item.isOverdue ? 'text-[#DC2626]' : 'text-[#B45309]'
                        }`}
                      >
                        {item.isOverdue ? 'ውዝፍ (ቀነ-ገደብ አልፏል)' : 'የወሩ ክፍያ'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono-tabular">
                      {formatCurrencyETB(item.duesAmount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono-tabular text-[#B45309]">
                      {formatCurrencyETB(item.penaltyAmount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono-tabular font-semibold text-[#111815]">
                      {formatCurrencyETB(item.duesAmount + item.penaltyAmount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handlePrefillUnpaid(
                            item.monthKey,
                            item.duesAmount,
                            item.penaltyAmount
                          )
                        }
                        className="text-xs font-medium text-[#14532D] hover:underline"
                      >
                        ክፈል
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[#16A34A] font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>ምንም ያልተከፈለ ውዝፍ ወይም ቅጣት የለብዎትም!</span>
          </div>
        )}
      </div>

      {/* Member Payment Submission & Bank Receipt Upload Form */}
      <form
        id="member-payment-form"
        onSubmit={handleSubmit}
        className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#111815] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#14532D]" />
              ወርሃዊና ሌሎች ክፍያዎችን መፈጸሚያ (የባንክ ደረሰኝ መላኪያ)
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              በባንክ ወይም በቴሌብር ከከፈሉ በኋላ የደረሰኙን ፎቶ በማያያዝ ለምክትል ሰብሳቢ ማረጋገጫ (Authorization) ይላኩ።
            </p>
          </div>
          {outstanding && outstanding.totalPenalties > 0 && (
            <button
              type="button"
              onClick={() => {
                setPType('penalty');
                setPMonthKey(currentMonth);
                setPAmount(String(outstanding.totalPenalties));
                setPNotes('የዘገየ ክፍያ ቅጣት መክፈያ');
              }}
              className="px-3 py-1.5 text-xs font-medium border border-[#B45309]/40 text-[#B45309] rounded-lg hover:bg-[#FFFBEB]"
            >
              ቅጣቱን ({formatCurrencyETB(outstanding.totalPenalties)}) ሙላ
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              የክፍያ ዓይነት *
            </label>
            <select
              value={pType}
              onChange={(e) => {
                const nextType = e.target.value as ContributionType;
                setPType(nextType);
                if (nextType === 'penalty' && outstanding?.totalPenalties) {
                  setPAmount(String(outstanding.totalPenalties));
                } else if (nextType === 'monthly') {
                  setPAmount(String(member.monthlyDuesRate));
                }
              }}
              className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
            >
              {Object.entries(CONTRIBUTION_TYPE_AM).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              የሚሸፍነው ወር *
            </label>
            <input
              type="month"
              required
              value={pMonthKey}
              onChange={(e) => setPMonthKey(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              የተከፈለ መጠን (ብር) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={pAmount}
              onChange={(e) => setPAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              የክፍያ መንገድ *
            </label>
            <select
              value={pMethod}
              onChange={(e) => {
                const m = e.target.value as PaymentMethod;
                setPMethod(m);
                if (m === 'telebirr') setPBankName('ቴሌብር (Telebirr)');
                else if (m === 'cash') setPBankName('ጥሬ ገንዘብ (በጽ/ቤት)');
                else setPBankName(ETHIOPIAN_BANKS_AM[0]);
              }}
              className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
            >
              {Object.entries(PAYMENT_METHOD_AM).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              ባንክ / የክፍያ አገልግሎት *
            </label>
            <select
              value={pBankName}
              onChange={(e) => setPBankName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
            >
              {ETHIOPIAN_BANKS_AM.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              የግብይት ማጣቀሻ / FT ቁጥር *
            </label>
            <input
              type="text"
              value={pRef}
              onChange={(e) => setPRef(e.target.value)}
              placeholder="ከደረሰኙ በራስ-ሰር ይሞላል ወይም እዚህ ይጻፉ"
              className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
            />
          </div>
        </div>

        {/* Receipt Attachment Area */}
        <div className="border border-dashed border-[#CBD5E1] rounded-xl p-4 bg-[#F9FAFB] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#111815]">
                በባንክ ወይም በቴሌብር የከፈሉበትን ደረሰኝ ፎቶ እዚህ ያያይዙ (Attach Bank Receipt)
              </p>
              <p className="text-[11px] text-[#6B7280]">
                ደረሰኙን ሲያያይዙ የግብይት ማጣቀሻ ቁጥሩ እና መጠኑ በራስ-ሰር እንዲነበብ ይሞከራል።
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#14532D] text-[#14532D] rounded-lg hover:bg-[#F0FDF4] cursor-pointer">
              {extractingReceipt ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {extractingReceipt ? 'ደረሰኙን በማንበብ ላይ...' : 'የባንክ ደረሰኝ አያይዝ'}
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptFileChange}
                className="hidden"
              />
            </label>
          </div>

          {receiptHint && (
            <p className="text-xs font-medium text-[#14532D]">{receiptHint}</p>
          )}

          {pReceiptImg && (
            <div className="flex items-center gap-3 pt-1">
              <img
                src={pReceiptImg}
                alt="የተያያዘ የባንክ ደረሰኝ"
                className="w-20 h-20 object-cover rounded-lg border border-[#D1D5DB] bg-white"
              />
              <button
                type="button"
                onClick={() => setPReceiptImg('')}
                className="text-xs text-[#DC2626] hover:underline"
              >
                ፎቶውን አስወግድ
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#374151] mb-1">
              ተጨማሪ ማስታወሻ (አማራጭ)
            </label>
            <input
              type="text"
              value={pNotes}
              onChange={(e) => setPNotes(e.target.value)}
              placeholder="ለምሳሌ፡ የወሩ መዋጮ እና ቅጣት"
              className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={extractingReceipt}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg hover:bg-[#166534] disabled:opacity-60 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            ክፍያውን እና ደረሰኙን ላክ
          </button>
        </div>
      </form>

      {/* Dependents List */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#111815] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#14532D]" />
          የተመዘገቡ የቤተሰብ አባላትና ተጠቃሚዎች ({member.dependents.length})
        </h3>
        {member.dependents.length === 0 ? (
          <p className="text-xs text-[#6B7280]">እስካሁን የተመዘገበ የቤተሰብ ተጠቃሚ የለም።</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {member.dependents.map((dep) => (
              <div
                key={dep.id}
                className="border border-[#E5E7EB] rounded-lg p-3 bg-[#F9FAFB] text-xs space-y-1"
              >
                <p className="font-semibold text-[#111815]">{dep.fullName}</p>
                <p className="text-[#4B5563]">
                  ዝምድና: {RELATIONSHIP_AM[dep.relationship]} · ዕድሜ:{' '}
                  <span className="font-mono-tabular">{dep.age}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Own Contribution History */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#111815]">
              የግል የመዋጮ ክፍያ ታሪክ እና የተላኩ ደረሰኞች
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              በምክትል ሰብሳቢ የጸደቁ ክፍያዎች ወዲያውኑ ወደ ኦፊሴላዊ ሂሳብዎ ይገባሉ።
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {paidThisMonth ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span className="text-[#16A34A]">
                  የ{formatMonthLabelAm(currentMonth)} መዋጮ ተከፍሏል
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-[#B45309]" />
                <span className="text-[#B45309]">
                  የ{formatMonthLabelAm(currentMonth)} መዋጮ ገና አልጸደቀም
                </span>
              </>
            )}
          </div>
        </div>

        {ownContributions.length === 0 ? (
          <p className="text-xs text-[#6B7280]">እስካሁን የተመዘገበ የክፍያ ታሪክ የለም።</p>
        ) : (
          <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">ደረሰኝ ቁጥር</th>
                  <th className="px-3.5 py-2.5 font-medium">ወር / ዓይነት</th>
                  <th className="px-3.5 py-2.5 font-medium">ባንክ / ማጣቀሻ</th>
                  <th className="px-3.5 py-2.5 font-medium">የማረጋገጫ ሁኔታ</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">መጠን</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">ደረሰኝ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {ownContributions.map((con) => (
                  <tr key={con.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-3.5 py-2.5 font-mono-tabular font-medium text-[#111815]">
                      {con.receiptNumber}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="block font-medium text-[#111815]">{con.periodLabel}</span>
                      <span className="text-[11px] text-[#6B7280]">
                        {CONTRIBUTION_TYPE_AM[con.type]}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="block text-[#111815]">
                        {con.bankName || PAYMENT_METHOD_AM[con.paymentMethod]}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#6B7280]">
                        {con.referenceCode}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          con.authorizationStatus === 'authorized'
                            ? 'text-[#16A34A]'
                            : con.authorizationStatus === 'rejected'
                            ? 'text-[#DC2626]'
                            : 'text-[#B45309]'
                        }`}
                      >
                        {con.authorizationStatus === 'pending' && (
                          <Clock className="w-3 h-3" />
                        )}
                        {PAYMENT_AUTH_STATUS_AM[con.authorizationStatus]}
                      </span>
                      {con.authorizedByName && (
                        <span className="block text-[11px] text-[#6B7280]">
                          በ{con.authorizedByName}
                        </span>
                      )}
                      {con.rejectionReason && (
                        <span className="block text-[11px] text-[#DC2626]">
                          ምክንያት: {con.rejectionReason}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono-tabular font-semibold text-[#14532D]">
                      {formatCurrencyETB(con.amount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {con.receiptImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onPrintDocument({ kind: 'receipt_image', contribution: con })
                            }
                            className="inline-flex items-center gap-1 text-[#4B5563] hover:text-[#111815]"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            የባንክ ፎቶ
                          </button>
                        )}
                        {con.authorizationStatus === 'authorized' && (
                          <button
                            type="button"
                            onClick={() =>
                              onPrintDocument({ kind: 'receipt', contribution: con })
                            }
                            className="inline-flex items-center gap-1 text-[#14532D] hover:underline font-medium"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            አትም
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
