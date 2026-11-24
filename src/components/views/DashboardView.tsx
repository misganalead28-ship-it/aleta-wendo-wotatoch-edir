import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileImage,
  FileText,
  IdCard,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type {
  AppTab,
  ApprovalStatus,
  AuthSession,
  IddirDatabase,
  IddirMember,
  MemberOutstandingSummary,
  PaymentAuthorizationStatus,
} from '../../types';
import {
  APPROVAL_STATUS_AM,
  CONTRIBUTION_TYPE_AM,
  MEMBER_STATUS_AM,
  NOTICE_CATEGORY_AM,
  PAYMENT_METHOD_AM,
  ROLE_LABELS_AM,
  formatCurrencyETB,
  formatDateTimeAm,
  formatMonthLabelAm,
  getCurrentMonthKey,
} from '../../i18n';
import { ASSETS_IMG } from '../../services/iddirStore';
import type { PrintableDocument } from '../ReceiptPrintModal';

interface Props {
  session: AuthSession;
  db: IddirDatabase;
  ownMember?: IddirMember;
  ownOutstanding?: MemberOutstandingSummary | null;
  onNavigate: (tab: AppTab) => void;
  onOpenIdCard: (member: IddirMember) => void;
  onAuthorizeMemberPayment: (
    contributionId: string,
    decision: Exclude<PaymentAuthorizationStatus, 'pending'>
  ) => void;
  onApproveExpense: (expenseId: string, decision: Exclude<ApprovalStatus, 'pending'>) => void;
  onApproveMinute: (minuteId: string, decision: Exclude<ApprovalStatus, 'pending'>) => void;
  onPrintDocument: (doc: PrintableDocument) => void;
}

export function DashboardView({
  session,
  db,
  ownMember,
  ownOutstanding,
  onNavigate,
  onOpenIdCard,
  onAuthorizeMemberPayment,
  onApproveExpense,
  onApproveMinute,
  onPrintDocument,
}: Props) {
  const currentMonth = getCurrentMonthKey();
  const currentMonthLabel = formatMonthLabelAm(currentMonth);

  // Strict Member-only Personal Dashboard (never reads other members' data)
  if (session.role === 'member') {
    const paidThisMonth = ownOutstanding?.currentMonthPaid ?? false;
    const totalPaid = ownOutstanding?.authorizedPaidTotal ?? 0;
    const totalOutstanding = ownOutstanding?.totalOutstanding ?? 0;
    const pendingCount = ownOutstanding?.pendingSubmittedCount ?? 0;
    const latestNotices = db.announcements.slice(0, 4);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
          <div className="p-6 flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#14532D]">
                እንኳን ደህና መጡ · {ROLE_LABELS_AM[session.role]}
              </p>
              <h2 className="text-2xl font-bold text-[#111815] mt-1">
                {ownMember?.fullName || session.displayName}
              </h2>
              <p className="text-sm text-[#4B5563] mt-1">
                ወርሃዊና ሌሎች ክፍያዎችን ይፈጽሙ፣ የባንክ ደረሰኝ ያያይዙ፣ ያልተከፈለ ውዝፍና ቅጣትዎን እዚህ ይከታተሉ።
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('my_profile')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                ክፍያ ፈጽም / የባንክ ደረሰኝ አያይዝ
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {ownMember && (
                <button
                  type="button"
                  onClick={() => onOpenIdCard(ownMember)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
                >
                  <IdCard className="w-4 h-4 text-[#14532D]" />
                  ዲጂታል መታወቂያ
                </button>
              )}
            </div>
          </div>

          <div className="relative min-h-[170px] bg-[#14532D]">
            <img
              src={ASSETS_IMG.heroBanner}
              alt="የዕድር ማህበረሰብ"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-5 flex flex-col justify-end text-white">
              <p className="text-xs text-[#FDE68A] font-medium">የአባልነት መለያ</p>
              <p className="text-lg font-bold font-mono-tabular">
                {ownMember?.memberCode || 'አልተገናኘም'}
              </p>
              {ownMember && (
                <p className="text-xs text-white/90 mt-0.5">
                  ሁኔታ: {MEMBER_STATUS_AM[ownMember.status]} · የቤተሰብ ተጠቃሚዎች: {ownMember.dependents.length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
            <p className="text-xs text-[#6B7280]">የ{currentMonthLabel} ወርሃዊ መዋጮ</p>
            <div className="mt-2 flex items-center gap-2">
              {paidThisMonth ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <span className="text-base font-bold text-[#16A34A]">ተከፍሏል</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-[#B45309]" />
                  <span className="text-base font-bold text-[#B45309]">አልተከፈለም</span>
                </>
              )}
            </div>
            {pendingCount > 0 && (
              <p className="text-[11px] text-[#14532D] mt-1">
                ማጽደቂያ የሚጠብቅ የተላከ ደረሰኝ: {pendingCount}
              </p>
            )}
          </div>

          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
            <p className="text-xs text-[#6B7280]">ውዝፍና ቅጣት (Outstanding Balance)</p>
            <p
              className={`text-xl font-bold font-mono-tabular mt-2 ${
                totalOutstanding > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
              }`}
            >
              {formatCurrencyETB(totalOutstanding)}
            </p>
            {ownOutstanding && (
              <p className="text-[11px] text-[#4B5563] mt-1">
                ውዝፍ: {formatCurrencyETB(ownOutstanding.totalUnpaidDues)} · ቅጣት:{' '}
                {formatCurrencyETB(ownOutstanding.totalPenalties)}
              </p>
            )}
          </div>

          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
            <p className="text-xs text-[#6B7280]">ጠቅላላ የጸደቀ ክፍያ</p>
            <p className="text-xl font-bold font-mono-tabular text-[#111815] mt-2">
              {formatCurrencyETB(totalPaid)}
            </p>
            <p className="text-[11px] text-[#6B7280] mt-1">
              {ownMember
                ? `ወርሃዊ መደበኛ ክፍያ: ${formatCurrencyETB(ownMember.monthlyDuesRate)}`
                : ''}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111815] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#14532D]" />
              የዕድር ማስታወቂያዎችና የሐዘን/የደስታ ጥሪዎች
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('announcements')}
              className="text-xs font-medium text-[#14532D] hover:underline"
            >
              ሁሉንም ይመልከቱ
            </button>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {latestNotices.map((notice) => (
              <div key={notice.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      notice.category === 'bereavement'
                        ? 'text-[#DC2626]'
                        : notice.category === 'joy'
                        ? 'text-[#16A34A]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {NOTICE_CATEGORY_AM[notice.category]}
                  </span>
                  <span className="font-mono-tabular text-[#6B7280]">
                    {notice.eventDate || formatDateTimeAm(notice.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#111815]">{notice.title}</p>
                <p className="text-xs text-[#4B5563] leading-relaxed">{notice.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Leadership / Committee / Staff Dashboard
  const activeMembers = db.members.filter((m) => m.status === 'active');
  const suspendedMembers = db.members.filter((m) => m.status === 'suspended');
  const authorizedContributions = db.contributions.filter(
    (c) => c.authorizationStatus === 'authorized'
  );
  const pendingPayments = db.contributions.filter(
    (c) => c.authorizationStatus === 'pending'
  );

  const paidMemberIdsThisMonth = new Set(
    authorizedContributions
      .filter((c) => c.monthKey === currentMonth && c.type === 'monthly')
      .map((c) => c.memberId)
  );
  const paidCount = activeMembers.filter((m) => paidMemberIdsThisMonth.has(m.id)).length;
  const unpaidCount = Math.max(0, activeMembers.length - paidCount);

  const totalIncome = authorizedContributions.reduce((sum, c) => sum + c.amount, 0);
  const monthlyCollection = authorizedContributions
    .filter((c) => c.monthKey === currentMonth)
    .reduce((sum, c) => sum + c.amount, 0);
  const approvedExpenses = db.expenses
    .filter((e) => e.approvalStatus === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - approvedExpenses;

  const pendingExpenses = db.expenses.filter((e) => e.approvalStatus === 'pending');
  const pendingMinutes = db.minutes.filter((m) => m.approvalStatus === 'pending');
  const openInquiries = db.inquiries.filter((i) => i.status === 'open');
  const pendingTasks = db.tasks.filter((t) => t.status !== 'done');

  const canApproveDecisions =
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';

  const canViewFinance =
    session.role === 'admin' ||
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'treasurer' ||
    session.role === 'auditor';

  return (
    <div className="space-y-6">
      {/* Executive / Role Header Card */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#14532D]">
            የሥራ መድረክ · {ROLE_LABELS_AM[session.role]}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111815] mt-1">
            እንኳን ደህና መጡ፣ {session.displayName}
          </h2>
          <p className="text-xs text-[#4B5563] mt-1">
            {db.associationName} · የ{currentMonthLabel} ወርሃዊ አጠቃላይ ዕይታ
            {session.role === 'auditor' ? ' (ለማንበብ እና ለኦዲት ማረጋገጫ ብቻ)' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canViewFinance && (
            <button
              type="button"
              onClick={() =>
                onPrintDocument({
                  kind: 'financial_summary',
                  monthLabel: currentMonthLabel,
                  totalIncome,
                  totalApprovedExpenses: approvedExpenses,
                  netBalance,
                  paidCount,
                  unpaidCount,
                  recentContributions: authorizedContributions,
                  recentExpenses: db.expenses,
                  preparedBy: `${session.displayName} (${ROLE_LABELS_AM[session.role]})`,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
            >
              <FileText className="w-3.5 h-3.5 text-[#14532D]" />
              የፋይናንስና ኦዲት ማጠቃለያ አትም
            </button>
          )}
          {session.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Users className="w-3.5 h-3.5" />
              አባላትና ዩዘሮችን ያስተዳድሩ
            </button>
          )}
          {session.role === 'treasurer' && (
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <CreditCard className="w-3.5 h-3.5" />
              ፋይናንስ፣ ጆርናልና ሌጀር
            </button>
          )}
          {session.role === 'vice_chairperson' && pendingPayments.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              የአባላት ክፍያ አውቶራይዝ ({pendingPayments.length})
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>ጠቅላላ የተመዘገቡ አባላት</span>
            <Users className="w-4 h-4 text-[#14532D]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#111815] mt-2">
            {db.members.length}
          </p>
          <p className="text-xs text-[#4B5563] mt-1">
            ንቁ: <span className="text-[#16A34A] font-medium">{activeMembers.length}</span> ·
            የታገዱ: <span className="text-[#D97706] font-medium">{suspendedMembers.length}</span>
          </p>
        </div>

        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>የ{currentMonthLabel} ክፍያ ሁኔታ</span>
            <ClipboardCheck className="w-4 h-4 text-[#14532D]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#111815] mt-2">
            {paidCount} / {activeMembers.length}
          </p>
          <p className="text-xs text-[#4B5563] mt-1">
            የጸደቀላቸው: <span className="text-[#16A34A] font-medium">{paidCount}</span> ·
            ያልከፈሉ: <span className="text-[#DC2626] font-medium">{unpaidCount}</span>
          </p>
        </div>

        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>የወሩ የጸደቀ ገቢ እና ወጪ</span>
            <Wallet className="w-4 h-4 text-[#B45309]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#14532D] mt-2">
            {formatCurrencyETB(monthlyCollection)}
          </p>
          <p className="text-xs text-[#4B5563] mt-1">
            የጸደቀ ወጪ: <span className="font-mono-tabular">{formatCurrencyETB(approvedExpenses)}</span>
          </p>
        </div>

        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>የተጣራ የዕድር ቀሪ ሂሳብ</span>
            <ShieldCheck className="w-4 h-4 text-[#14532D]" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-[#111815] mt-2">
            {formatCurrencyETB(netBalance)}
          </p>
          <p className="text-xs text-[#4B5563] mt-1">
            ማጽደቂያ የሚጠብቁ ክፍያዎች: <strong className="text-[#B45309]">{pendingPayments.length}</strong>
          </p>
        </div>
      </div>

      {/* Pending Member Payment Authorizations & Leadership Approvals */}
      {canApproveDecisions &&
        (pendingPayments.length > 0 || pendingExpenses.length > 0 || pendingMinutes.length > 0) && (
          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#111815]">
                የአውቶራይዜሽን እና የአመራር ማጽደቂያ የሚጠብቁ ጉዳዮች (
                {pendingPayments.length + pendingExpenses.length + pendingMinutes.length})
              </h3>
              <span className="text-xs text-[#B45309] font-medium">
                ምክትል ሰብሳቢ / ሰብሳቢ ማጽደቂያ
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingPayments.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-[#14532D]/25 rounded-lg p-4 space-y-2.5 bg-[#F0FDF4]/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular font-semibold text-[#14532D]">
                      {sub.receiptNumber} · የአባል ክፍያ አውቶራይዜሽን
                    </span>
                    <span className="font-mono-tabular font-bold text-[#111815]">
                      {formatCurrencyETB(sub.amount)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#111815]">
                    {sub.memberName} ({sub.memberCode})
                  </p>
                  <p className="text-xs text-[#4B5563]">
                    {CONTRIBUTION_TYPE_AM[sub.type]} · {sub.periodLabel} ·{' '}
                    {sub.bankName || PAYMENT_METHOD_AM[sub.paymentMethod]} · ማጣቀሻ:{' '}
                    <span className="font-mono-tabular font-medium">{sub.referenceCode}</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {sub.receiptImageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPrintDocument({ kind: 'receipt_image', contribution: sub })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D] hover:underline"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        የባንክ ደረሰኝ እይ
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#6B7280]">በማጣቀሻ ቁጥር ያረጋግጡ</span>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAuthorizeMemberPayment(sub.id, 'rejected')}
                        className="px-2.5 py-1 text-xs font-medium border border-[#DC2626]/30 text-[#DC2626] bg-white rounded-md hover:bg-[#FEF2F2]"
                      >
                        ውድቅ
                      </button>
                      <button
                        type="button"
                        onClick={() => onAuthorizeMemberPayment(sub.id, 'authorized')}
                        className="px-2.5 py-1 text-xs font-medium bg-[#14532D] text-white rounded-md hover:bg-[#166534]"
                      >
                        አውቶራይዝ አድርግ
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="border border-[#E5E7EB] rounded-lg p-4 space-y-2.5 bg-[#F9FAFB]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular font-semibold text-[#B45309]">
                      {exp.voucherNumber} · {APPROVAL_STATUS_AM[exp.approvalStatus]}
                    </span>
                    <span className="font-mono-tabular font-bold text-[#111815]">
                      {formatCurrencyETB(exp.amount)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#111815]">{exp.title}</p>
                  <p className="text-xs text-[#4B5563]">{exp.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#6B7280]">
                      ያቀረበው: {exp.recordedByName}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApproveExpense(exp.id, 'rejected')}
                        className="px-2.5 py-1 text-xs font-medium border border-[#DC2626]/30 text-[#DC2626] bg-white rounded-md hover:bg-[#FEF2F2]"
                      >
                        ውድቅ አድርግ
                      </button>
                      <button
                        type="button"
                        onClick={() => onApproveExpense(exp.id, 'approved')}
                        className="px-2.5 py-1 text-xs font-medium bg-[#14532D] text-white rounded-md hover:bg-[#166534]"
                      >
                        አጽድቅ
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingMinutes.map((min) => (
                <div
                  key={min.id}
                  className="border border-[#E5E7EB] rounded-lg p-4 space-y-2.5 bg-[#F9FAFB]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#B45309]">
                      {min.meetingNumber} · {APPROVAL_STATUS_AM[min.approvalStatus]}
                    </span>
                    <span className="font-mono-tabular text-[#6B7280]">{min.meetingDate}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#111815]">{min.title}</p>
                  <p className="text-xs text-[#4B5563]">{min.decisions}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#6B7280]">ፀሐፊ: {min.recordedByName}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApproveMinute(min.id, 'rejected')}
                        className="px-2.5 py-1 text-xs font-medium border border-[#DC2626]/30 text-[#DC2626] bg-white rounded-md hover:bg-[#FEF2F2]"
                      >
                        መልስ
                      </button>
                      <button
                        type="button"
                        onClick={() => onApproveMinute(min.id, 'approved')}
                        className="px-2.5 py-1 text-xs font-medium bg-[#14532D] text-white rounded-md hover:bg-[#166534]"
                      >
                        ቃለ-ጉባኤውን አጽድቅ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Role-Focused Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111815]">
              የቅርብ ጊዜ ማስታወቂያዎች እና የአባላት ጥያቄዎች
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('announcements')}
              className="text-xs font-medium text-[#14532D] hover:underline"
            >
              ወደ ማስታወቂያዎች ሂድ
            </button>
          </div>
          <p className="text-xs text-[#6B7280]">
            ምላሽ የሚጠብቁ የአባላት ጥያቄዎች: <strong className="text-[#111815]">{openInquiries.length}</strong>
          </p>
          <div className="divide-y divide-[#E5E7EB]">
            {db.announcements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#14532D]">
                    {NOTICE_CATEGORY_AM[ann.category]}
                  </span>
                  <span className="font-mono-tabular text-[#6B7280]">
                    {ann.eventDate || formatDateTimeAm(ann.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#111815] mt-0.5">{ann.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111815]">
              {session.role === 'auditor'
                ? 'የቅርብ ጊዜ የኦዲትና የክትትል መዝገብ'
                : 'የኮሚቴ ተግባራትና የስብሰባ ሁኔታ'}
            </h3>
            <button
              type="button"
              onClick={() =>
                onNavigate(session.role === 'auditor' ? 'audit' : 'meetings')
              }
              className="text-xs font-medium text-[#14532D] hover:underline"
            >
              ዝርዝር ይመልከቱ
            </button>
          </div>

          {session.role === 'auditor' ? (
            <div className="divide-y divide-[#E5E7EB]">
              {db.auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#111815]">{log.action}</span>
                    <span className="font-mono-tabular text-[#6B7280]">
                      {formatDateTimeAm(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-[#4B5563] mt-0.5">{log.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] pb-2">
                በሂደት ላይ ያሉ የኮሚቴ ተግባራት: <strong className="text-[#111815]">{pendingTasks.length}</strong>
              </p>
              {db.tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="py-2.5 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111815]">{task.title}</span>
                    <span className="font-mono-tabular text-[#6B7280]">{task.dueDate}</span>
                  </div>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    ኃላፊ: {task.assignedToName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
