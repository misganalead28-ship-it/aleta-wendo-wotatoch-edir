import { useMemo, useState } from 'react';
import {
  BookMarked,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  Layers,
  Plus,
  Printer,
  Scale,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import type {
  ApprovalStatus,
  AuthSession,
  ContributionRecord,
  ContributionType,
  ExpenseCategory,
  IddirDatabase,
  PaymentAuthorizationStatus,
  PaymentMethod,
} from '../../types';
import {
  ACCOUNT_CATEGORY_AM,
  APPROVAL_STATUS_AM,
  CONTRIBUTION_TYPE_AM,
  ETHIOPIAN_BANKS_AM,
  EXPENSE_CATEGORY_AM,
  PAYMENT_AUTH_STATUS_AM,
  PAYMENT_METHOD_AM,
  ROLE_LABELS_AM,
  formatCurrencyETB,
  formatMonthLabelAm,
  getCurrentMonthKey,
} from '../../i18n';
import {
  CHART_OF_ACCOUNTS,
  buildAccountLedger,
  buildGeneralJournal,
  buildIncomeAndBalanceSummary,
  buildTrialBalance,
} from '../../services/accountingEngine';
import { exportRowsToCsv } from '../../utils/validation';
import type { PrintableDocument } from '../ReceiptPrintModal';

interface Props {
  session: AuthSession;
  db: IddirDatabase;
  onRecordContribution: (payload: {
    memberId: string;
    monthKey: string;
    type: ContributionType;
    amount: number;
    paymentMethod: PaymentMethod;
    bankName?: string;
    referenceCode: string;
    notes?: string;
  }) => ContributionRecord | null;
  onAuthorizeMemberPayment: (
    contributionId: string,
    decision: Exclude<PaymentAuthorizationStatus, 'pending'>,
    rejectionReason?: string
  ) => void;
  onRecordExpense: (payload: {
    category: ExpenseCategory;
    title: string;
    description: string;
    beneficiaryName?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceCode?: string;
    expenseDate: string;
  }) => void;
  onApproveExpense: (expenseId: string, decision: Exclude<ApprovalStatus, 'pending'>) => void;
  onRecordManualJournal: (payload: {
    date: string;
    reference: string;
    description: string;
    lines: Array<{ accountCode: string; debit: number; credit: number }>;
  }) => boolean;
  onPrintDocument: (doc: PrintableDocument) => void;
}

type FinanceSubTab =
  | 'contributions'
  | 'authorizations'
  | 'expenses'
  | 'journal'
  | 'ledger'
  | 'trial_balance';

export function FinanceAuditView({
  session,
  db,
  onRecordContribution,
  onAuthorizeMemberPayment,
  onRecordExpense,
  onApproveExpense,
  onRecordManualJournal,
  onPrintDocument,
}: Props) {
  const currentMonth = getCurrentMonthKey();
  const isAuditor = session.role === 'auditor';
  const canRecordFinance = session.role === 'treasurer' || session.role === 'admin';
  const canAuthorizePayments =
    session.role === 'vice_chairperson' ||
    session.role === 'chairperson' ||
    session.role === 'admin';
  const canApproveExpense =
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';

  const pendingMemberPayments = useMemo(
    () => db.contributions.filter((c) => c.authorizationStatus === 'pending'),
    [db.contributions]
  );

  const [subTab, setSubTab] = useState<FinanceSubTab>(
    session.role === 'vice_chairperson' && pendingMemberPayments.length > 0
      ? 'authorizations'
      : 'contributions'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('1020');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  // Contribution Form
  const [showConForm, setShowConForm] = useState(false);
  const [cMemberId, setCMemberId] = useState(db.members[0]?.id || '');
  const [cMonthKey, setCMonthKey] = useState(currentMonth);
  const [cType, setCType] = useState<ContributionType>('monthly');
  const [cAmount, setCAmount] = useState(String(db.monthlyDuesAmount));
  const [cMethod, setCMethod] = useState<PaymentMethod>('telebirr');
  const [cBank, setCBank] = useState('ቴሌብር (Telebirr)');
  const [cRef, setCRef] = useState('');
  const [cNotes, setCNotes] = useState('');

  // Expense Form
  const [showExpForm, setShowExpForm] = useState(false);
  const [eCategory, setECategory] = useState<ExpenseCategory>('bereavement_aid');
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eBeneficiary, setEBeneficiary] = useState('');
  const [eAmount, setEAmount] = useState('');
  const [eMethod, setEMethod] = useState<PaymentMethod>('bank_transfer');
  const [eRef, setERef] = useState('');
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));

  // Manual Journal Entry Form
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [jDate, setJDate] = useState(new Date().toISOString().slice(0, 10));
  const [jRef, setJRef] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jDebitAcc, setJDebitAcc] = useState('1020');
  const [jCreditAcc, setJCreditAcc] = useState('1010');
  const [jAmount, setJAmount] = useState('');

  const activeMembers = useMemo(
    () => db.members.filter((m) => m.status === 'active'),
    [db.members]
  );

  const authorizedContributions = useMemo(
    () => db.contributions.filter((c) => c.authorizationStatus === 'authorized'),
    [db.contributions]
  );

  const paidIdsThisMonth = useMemo(() => {
    return new Set(
      authorizedContributions
        .filter((c) => c.monthKey === currentMonth && c.type === 'monthly')
        .map((c) => c.memberId)
    );
  }, [authorizedContributions, currentMonth]);

  const paidMembers = activeMembers.filter((m) => paidIdsThisMonth.has(m.id));
  const unpaidMembers = activeMembers.filter((m) => !paidIdsThisMonth.has(m.id));

  // Accounting Engine Computations
  const journalEntries = useMemo(() => buildGeneralJournal(db), [db]);
  const ledgerData = useMemo(
    () => buildAccountLedger(journalEntries, selectedLedgerAccount),
    [journalEntries, selectedLedgerAccount]
  );
  const trialBalance = useMemo(() => buildTrialBalance(journalEntries), [journalEntries]);
  const statements = useMemo(
    () => buildIncomeAndBalanceSummary(trialBalance.rows),
    [trialBalance.rows]
  );

  const availableMonths = useMemo(() => {
    const set = new Set(db.contributions.map((c) => c.monthKey));
    return ['all', ...Array.from(set).sort().reverse()];
  }, [db.contributions]);

  const filteredContributions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return db.contributions.filter((c) => {
      if (monthFilter !== 'all' && c.monthKey !== monthFilter) return false;
      if (!q) return true;
      return (
        c.memberName.toLowerCase().includes(q) ||
        c.memberCode.toLowerCase().includes(q) ||
        c.receiptNumber.toLowerCase().includes(q) ||
        c.referenceCode.toLowerCase().includes(q)
      );
    });
  }, [db.contributions, searchTerm, monthFilter]);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return db.expenses.filter((e) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.voucherNumber.toLowerCase().includes(q) ||
        (e.beneficiaryName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [db.expenses, searchTerm]);

  const filteredJournal = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return journalEntries;
    return journalEntries.filter(
      (j) =>
        j.entryNumber.toLowerCase().includes(q) ||
        j.reference.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.lines.some((l) => l.accountNameAm.toLowerCase().includes(q))
    );
  }, [journalEntries, searchTerm]);

  function handleContributionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = onRecordContribution({
      memberId: cMemberId,
      monthKey: cMonthKey,
      type: cType,
      amount: Number(cAmount) || db.monthlyDuesAmount,
      paymentMethod: cMethod,
      bankName: cBank,
      referenceCode: cRef,
      notes: cNotes,
    });
    if (created) {
      setShowConForm(false);
      setCRef('');
      setCNotes('');
    }
  }

  function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eTitle.trim() || !eAmount) return;
    onRecordExpense({
      category: eCategory,
      title: eTitle,
      description: eDesc,
      beneficiaryName: eBeneficiary,
      amount: Number(eAmount) || 0,
      paymentMethod: eMethod,
      referenceCode: eRef,
      expenseDate: eDate,
    });
    setShowExpForm(false);
    setETitle('');
    setEDesc('');
    setEBeneficiary('');
    setEAmount('');
    setERef('');
  }

  function handleManualJournalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(jAmount) || 0;
    if (amt <= 0 || !jDesc.trim() || jDebitAcc === jCreditAcc) return;
    const ok = onRecordManualJournal({
      date: jDate,
      reference: jRef,
      description: jDesc,
      lines: [
        { accountCode: jDebitAcc, debit: amt, credit: 0 },
        { accountCode: jCreditAcc, debit: 0, credit: amt },
      ],
    });
    if (ok) {
      setShowJournalForm(false);
      setJRef('');
      setJDesc('');
      setJAmount('');
    }
  }

  function handleExportCsv() {
    if (subTab === 'contributions' || subTab === 'authorizations') {
      exportRowsToCsv(
        `iddir-contributions-${new Date().toISOString().slice(0, 10)}.csv`,
        ['ደረሰኝ', 'መለያ ቁጥር', 'አባል', 'ወር', 'ዓይነት', 'ባንክ / መንገድ', 'ማጣቀሻ', 'መጠን (ብር)', 'ሁኔታ'],
        filteredContributions.map((c) => [
          c.receiptNumber,
          c.memberCode,
          c.memberName,
          c.periodLabel,
          CONTRIBUTION_TYPE_AM[c.type],
          c.bankName || PAYMENT_METHOD_AM[c.paymentMethod],
          c.referenceCode,
          c.amount,
          PAYMENT_AUTH_STATUS_AM[c.authorizationStatus],
        ])
      );
    } else if (subTab === 'expenses') {
      exportRowsToCsv(
        `iddir-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
        ['ቫውቸር', 'ምድብ', 'ርዕስ', 'ተቀባይ', 'ቀን', 'መጠን (ብር)', 'ሁኔታ', 'ያቀረበው'],
        filteredExpenses.map((e) => [
          e.voucherNumber,
          EXPENSE_CATEGORY_AM[e.category],
          e.title,
          e.beneficiaryName || '',
          e.expenseDate,
          e.amount,
          APPROVAL_STATUS_AM[e.approvalStatus],
          e.recordedByName,
        ])
      );
    } else if (subTab === 'journal') {
      const flatRows: (string | number | boolean)[][] = [];
      filteredJournal.forEach((j) => {
        j.lines.forEach((l) => {
          flatRows.push([
            j.entryNumber,
            j.date,
            j.reference,
            j.description,
            l.accountCode,
            l.accountNameAm,
            l.debit,
            l.credit,
          ]);
        });
      });
      exportRowsToCsv(
        `iddir-general-journal-${new Date().toISOString().slice(0, 10)}.csv`,
        ['መለያ', 'ቀን', 'ማጣቀሻ', 'መግለጫ', 'የሂሳብ ኮድ', 'የሂሳብ መደብ', 'ዴቢት', 'ክሬዲት'],
        flatRows
      );
    } else if (subTab === 'ledger') {
      exportRowsToCsv(
        `iddir-ledger-${ledgerData.account.code}-${new Date().toISOString().slice(0, 10)}.csv`,
        ['ቀን', 'ጆርናል', 'ማጣቀሻ', 'መግለጫ', 'ዴቢት', 'ክሬዲት', 'ቀሪ ባላንስ'],
        ledgerData.rows.map((r) => [
          r.date,
          r.entryNumber,
          r.reference,
          r.description,
          r.debit,
          r.credit,
          r.runningBalance,
        ])
      );
    } else {
      exportRowsToCsv(
        `iddir-trial-balance-${new Date().toISOString().slice(0, 10)}.csv`,
        ['ኮድ', 'የሂሳብ መደብ', 'ምድብ', 'ዴቢት ባላንስ', 'ክሬዲት ባላንስ'],
        trialBalance.rows.map((r) => [
          r.account.code,
          r.account.nameAm,
          ACCOUNT_CATEGORY_AM[r.account.category],
          r.debitBalance,
          r.creditBalance,
        ])
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Auditor Read-only Notice */}
      {isAuditor && (
        <div className="bg-[#FFFBEB] border border-[#F59E0B]/40 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-[#92400E]">
          <Eye className="w-4 h-4 shrink-0" />
          <span>
            <strong>የኦዲተር እይታ — ለማንበብ፣ ለማጣራት እና ለማተም ብቻ:</strong> ኦዲተር መዋጮዎችን፣ የባንክ ደረሰኞችን፣ ጆርናልን፣ ሌጀርን እና ትራያል ባላንስን መመርመርና CSV/PDF ማውጣት ይችላል፤ ነገር ግን መረጃ መቀየር አይችልም።
          </span>
        </div>
      )}

      {/* Accounting Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-4">
          <p className="text-xs text-[#6B7280]">ጠቅላላ የጸደቀ ገቢ</p>
          <p className="text-lg font-bold font-mono-tabular text-[#14532D] mt-1">
            {formatCurrencyETB(statements.totalRevenue)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            ማጽደቂያ የሚጠብቅ: {pendingMemberPayments.length} ክፍያ
          </p>
        </div>
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-4">
          <p className="text-xs text-[#6B7280]">ጠቅላላ የጸደቀ ወጪ</p>
          <p className="text-lg font-bold font-mono-tabular text-[#B45309] mt-1">
            {formatCurrencyETB(statements.totalExpenses)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            የተጣራ ትርፍ/ተረፍ: {formatCurrencyETB(statements.netSurplus)}
          </p>
        </div>
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-4">
          <p className="text-xs text-[#6B7280]">ጠቅላላ የባንክ፣ ቴሌብርና ጥሬ ገንዘብ ሀብት</p>
          <p className="text-lg font-bold font-mono-tabular text-[#111815] mt-1">
            {formatCurrencyETB(statements.totalAssets)}
          </p>
          <p className="text-[11px] text-[#16A34A] mt-0.5">
            {trialBalance.isBalanced ? 'ትራያል ባላንስ የተመጣጠነ ነው' : 'ያልተመጣጠነ ሂሳብ'}
          </p>
        </div>
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-4">
          <p className="text-xs text-[#6B7280]">የ{formatMonthLabelAm(currentMonth)} ወርሃዊ መዋጮ</p>
          <p className="text-sm font-semibold text-[#111815] mt-1.5">
            የከፈሉ: <span className="text-[#16A34A] font-mono-tabular">{paidMembers.length}</span> ·
            ያልከፈሉ: <span className="text-[#DC2626] font-mono-tabular">{unpaidMembers.length}</span>
          </p>
        </div>
      </div>

      {/* Controls & Accounting Sub-Module Bar */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubTab('contributions')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'contributions'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              መዋጮዎች ({db.contributions.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('authorizations')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'authorizations'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              የአባላት ክፍያ አውቶራይዜሽን ({pendingMemberPayments.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('expenses')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'expenses'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              ወጪዎች ({db.expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('journal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'journal'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              ጆርናል ({journalEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'ledger'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ሌጀር (Ledger)
            </button>
            <button
              type="button"
              onClick={() => setSubTab('trial_balance')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'trial_balance'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              ትራያል ባላንስ እና መግለጫዎች
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canRecordFinance && !isAuditor && subTab === 'contributions' && (
              <button
                type="button"
                onClick={() => setShowConForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
              >
                <Plus className="w-3.5 h-3.5" />
                መዋጮ መዝግብ
              </button>
            )}
            {canRecordFinance && !isAuditor && subTab === 'expenses' && (
              <button
                type="button"
                onClick={() => setShowExpForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
              >
                <Wallet className="w-3.5 h-3.5" />
                ወጪ መዝግብ
              </button>
            )}
            {canRecordFinance && !isAuditor && subTab === 'journal' && (
              <button
                type="button"
                onClick={() => setShowJournalForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                የማስተካከያ ጆርናል መዝግብ
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onPrintDocument({
                  kind: 'financial_summary',
                  monthLabel: formatMonthLabelAm(currentMonth),
                  totalIncome: statements.totalRevenue,
                  totalApprovedExpenses: statements.totalExpenses,
                  netBalance: statements.totalAssets,
                  paidCount: paidMembers.length,
                  unpaidCount: unpaidMembers.length,
                  recentContributions: authorizedContributions,
                  recentExpenses: db.expenses,
                  preparedBy: `${session.displayName} (${ROLE_LABELS_AM[session.role]})`,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
            >
              <Printer className="w-3.5 h-3.5 text-[#14532D]" />
              ሪፖርት አትም
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {(subTab === 'contributions' || subTab === 'expenses' || subTab === 'journal') && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="በአባል ስም፣ በደረሰኝ/ቫውቸር፣ በጆርናል ወይም በማጣቀሻ ፈልግ..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            {subTab === 'contributions' && (
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {availableMonths.map((mk) => (
                  <option key={mk} value={mk}>
                    {mk === 'all' ? 'ሁሉም ወራት' : formatMonthLabelAm(mk)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Record Contribution Form (Treasurer / Admin) */}
      {canRecordFinance && !isAuditor && showConForm && subTab === 'contributions' && (
        <form
          onSubmit={handleContributionSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">አዲስ የአባል መዋጮ መመዝገቢያ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">አባል *</label>
              <select
                value={cMemberId}
                onChange={(e) => setCMemberId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {db.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberCode} · {m.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ወር (YYYY-MM) *</label>
              <input
                type="month"
                required
                value={cMonthKey}
                onChange={(e) => setCMonthKey(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የክፍያ ዓይነት *</label>
              <select
                value={cType}
                onChange={(e) => setCType(e.target.value as ContributionType)}
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
              <label className="block text-xs font-medium text-[#374151] mb-1">መጠን (ብር) *</label>
              <input
                type="number"
                required
                min={1}
                value={cAmount}
                onChange={(e) => setCAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የክፍያ መንገድ *</label>
              <select
                value={cMethod}
                onChange={(e) => {
                  const m = e.target.value as PaymentMethod;
                  setCMethod(m);
                  if (m === 'telebirr') setCBank('ቴሌብር (Telebirr)');
                  else if (m === 'cash') setCBank('ጥሬ ገንዘብ (በጽ/ቤት)');
                  else setCBank(ETHIOPIAN_BANKS_AM[0]);
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
                ማጣቀሻ ቁጥር (Reference)
              </label>
              <input
                type="text"
                value={cRef}
                onChange={(e) => setCRef(e.target.value)}
                placeholder="ለምሳሌ፡ TLB-440219"
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-[#374151] mb-1">ማስታወሻ</label>
              <input
                type="text"
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              መዝግብና ወደ ጆርናል አስገባ
            </button>
          </div>
        </form>
      )}

      {/* Record Expense Form (Treasurer / Admin) */}
      {canRecordFinance && !isAuditor && showExpForm && subTab === 'expenses' && (
        <form
          onSubmit={handleExpenseSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">አዲስ የወጪ / የዕርዳታ ጥያቄ መመዝገቢያ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የወጪ ምድብ *</label>
              <select
                value={eCategory}
                onChange={(e) => setECategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {Object.entries(EXPENSE_CATEGORY_AM).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ርዕስ *</label>
              <input
                type="text"
                required
                value={eTitle}
                onChange={(e) => setETitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ተቀባይ አካል / አባል</label>
              <input
                type="text"
                value={eBeneficiary}
                onChange={(e) => setEBeneficiary(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">መጠን (ብር) *</label>
              <input
                type="number"
                required
                min={1}
                value={eAmount}
                onChange={(e) => setEAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የክፍያ መንገድ *</label>
              <select
                value={eMethod}
                onChange={(e) => setEMethod(e.target.value as PaymentMethod)}
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
              <label className="block text-xs font-medium text-[#374151] mb-1">ቀን *</label>
              <input
                type="date"
                required
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-[#374151] mb-1">ዝርዝር መግለጫ</label>
              <textarea
                rows={2}
                value={eDesc}
                onChange={(e) => setEDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowExpForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              ለማጽደቅ አቅርብ
            </button>
          </div>
        </form>
      )}

      {/* Manual Balanced Journal Entry Form (Treasurer / Admin) */}
      {canRecordFinance && !isAuditor && showJournalForm && subTab === 'journal' && (
        <form
          onSubmit={handleManualJournalSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-[#111815]">
              የማስተካከያ ወይም የዝውውር ጆርናል መመዝገቢያ (Double-Entry)
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              ለምሳሌ፡ ከጥሬ ገንዘብ ወደ ባንክ ማስገባት፣ ከቴሌብር ወደ ባንክ ማዛወር ወይም የባንክ አገልግሎት ክፍያ መመዝገብ
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ቀን *</label>
              <input
                type="date"
                required
                value={jDate}
                onChange={(e) => setJDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ማጣቀሻ ቁጥር</label>
              <input
                type="text"
                value={jRef}
                onChange={(e) => setJRef(e.target.value)}
                placeholder="ለምሳሌ፡ TRF-004"
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">መጠን (ብር) *</label>
              <input
                type="number"
                required
                min={1}
                value={jAmount}
                onChange={(e) => setJAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ዴቢት የሚደረግ ሂሳብ (Debit Account) *
              </label>
              <select
                value={jDebitAcc}
                onChange={(e) => setJDebitAcc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {CHART_OF_ACCOUNTS.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} · {acc.nameAm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ክሬዲት የሚደረግ ሂሳብ (Credit Account) *
              </label>
              <select
                value={jCreditAcc}
                onChange={(e) => setJCreditAcc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {CHART_OF_ACCOUNTS.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} · {acc.nameAm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">መግለጫ *</label>
              <input
                type="text"
                required
                value={jDesc}
                onChange={(e) => setJDesc(e.target.value)}
                placeholder="የዝውውሩ ወይም የማስተካከያው ምክንያት"
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          {jDebitAcc === jCreditAcc && (
            <p className="text-xs text-[#DC2626]">
              ዴቢት እና ክሬዲት የሂሳብ መደቦች የተለያዩ መሆን አለባቸው።
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJournalForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              disabled={jDebitAcc === jCreditAcc}
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] disabled:opacity-50"
            >
              ጆርናሉን መዝግብ
            </button>
          </div>
        </form>
      )}

      {/* Member Payment Authorizations Queue (Vice Chairperson / Chairperson / Admin) */}
      {subTab === 'authorizations' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[#111815]">
              በአባላት የተላኩ የባንክ ደረሰኞች እና ክፍያዎች የአውቶራይዜሽን መድረክ
            </h3>
            <p className="text-xs text-[#4B5563]">
              አባላት በባንክ ወይም በቴሌብር ከፍለው ደረሰኝ ሲልኩ፣ ምክትል ሰብሳቢ (ወይም ሰብሳቢ) ደረሰኙን አረጋግጠው አውቶራይዝ ሲያደርጉት ክፍያው በቀጥታ ወደ ጆርናል፣ ሌጀር እና ትራያል ባላንስ ይገባል።
            </p>
          </div>

          {pendingMemberPayments.length === 0 ? (
            <div className="bg-white border border-[#E2E6E1] rounded-xl p-8 text-center text-xs text-[#6B7280]">
              በአሁኑ ሰዓት የአውቶራይዜሽን ውሳኔ የሚጠብቅ የአባል ክፍያ የለም።
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingMemberPayments.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono-tabular text-xs font-semibold text-[#B45309]">
                        {sub.receiptNumber} · ማጽደቂያ የሚጠብቅ
                      </span>
                      <h4 className="text-sm font-bold text-[#111815] mt-0.5">
                        {sub.memberName}{' '}
                        <span className="font-mono-tabular font-normal text-xs text-[#6B7280]">
                          ({sub.memberCode})
                        </span>
                      </h4>
                    </div>
                    <span className="text-base font-bold font-mono-tabular text-[#14532D]">
                      {formatCurrencyETB(sub.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3">
                    <div>
                      <span className="text-[#6B7280] block">ዓይነትና ወር</span>
                      <span className="font-medium text-[#111815]">
                        {CONTRIBUTION_TYPE_AM[sub.type]} · {sub.periodLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">ባንክ / መንገድ</span>
                      <span className="font-medium text-[#111815]">
                        {sub.bankName || PAYMENT_METHOD_AM[sub.paymentMethod]}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#6B7280] block">የግብይት ማጣቀሻ (Reference)</span>
                      <span className="font-mono-tabular font-semibold text-[#111815]">
                        {sub.referenceCode}
                      </span>
                    </div>
                    {sub.notes && (
                      <div className="col-span-2 text-[#4B5563]">
                        ማስታወሻ: {sub.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {sub.receiptImageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPrintDocument({ kind: 'receipt_image', contribution: sub })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
                      >
                        <FileImage className="w-3.5 h-3.5 text-[#14532D]" />
                        የተያያዘውን የባንክ ደረሰኝ እይ
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#6B7280]">
                        የደረሰኝ ፎቶ አልተያያዘም (በማጣቀሻ ቁጥር ያረጋግጡ)
                      </span>
                    )}
                  </div>

                  {canAuthorizePayments && !isAuditor && (
                    <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
                      <input
                        type="text"
                        value={rejectionReasons[sub.id] || ''}
                        onChange={(e) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [sub.id]: e.target.value,
                          }))
                        }
                        placeholder="ውድቅ ከሆነ ምክንያቱን እዚህ ይጻፉ (አማራጭ)"
                        className="w-full px-3 py-1.5 text-xs border border-[#D1D5DB] rounded-lg"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onAuthorizeMemberPayment(
                              sub.id,
                              'rejected',
                              rejectionReasons[sub.id]
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#DC2626]/30 text-[#DC2626] bg-white rounded-lg hover:bg-[#FEF2F2]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          ውድቅ አድርግ
                        </button>
                        <button
                          type="button"
                          onClick={() => onAuthorizeMemberPayment(sub.id, 'authorized')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          አውቶራይዝ አድርግ (አጽድቅ)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unpaid Members Tracker for Current Month */}
      {subTab === 'contributions' && unpaidMembers.length > 0 && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-[#B45309]">
            የ{formatMonthLabelAm(currentMonth)} ወርሃዊ መዋጮ ገና ያልጸደቀላቸው ንቁ አባላት ({unpaidMembers.length}):
          </p>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            {unpaidMembers.map((m) => `${m.fullName} (${m.memberCode})`).join(' · ')}
          </p>
        </div>
      )}

      {/* Contributions Table */}
      {subTab === 'contributions' && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 font-medium">ደረሰኝ ቁጥር</th>
                  <th className="px-4 py-3 font-medium">አባል</th>
                  <th className="px-4 py-3 font-medium">ወር / ዓይነት</th>
                  <th className="px-4 py-3 font-medium">ባንክ / ማጣቀሻ</th>
                  <th className="px-4 py-3 font-medium">አውቶራይዜሽን</th>
                  <th className="px-4 py-3 font-medium text-right">መጠን</th>
                  <th className="px-4 py-3 font-medium text-right">ሰነድ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">
                      የተመዘገበ የመዋጮ ክፍያ አልተገኘም።
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3 font-mono-tabular font-semibold text-[#111815]">
                        {c.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#111815]">{c.memberName}</p>
                        <p className="font-mono-tabular text-[11px] text-[#6B7280]">
                          {c.memberCode}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#111815]">{c.periodLabel}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {CONTRIBUTION_TYPE_AM[c.type]}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#111815]">
                          {c.bankName || PAYMENT_METHOD_AM[c.paymentMethod]}
                        </p>
                        <p className="font-mono-tabular text-[11px] text-[#6B7280]">
                          {c.referenceCode}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            c.authorizationStatus === 'authorized'
                              ? 'text-[#16A34A]'
                              : c.authorizationStatus === 'rejected'
                              ? 'text-[#DC2626]'
                              : 'text-[#B45309]'
                          }`}
                        >
                          {c.authorizationStatus === 'pending' && <Clock className="w-3 h-3" />}
                          {PAYMENT_AUTH_STATUS_AM[c.authorizationStatus]}
                        </span>
                        {c.authorizedByName && (
                          <span className="block text-[11px] text-[#6B7280]">
                            በ{c.authorizedByName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-[#14532D]">
                        {formatCurrencyETB(c.amount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {c.receiptImageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                onPrintDocument({ kind: 'receipt_image', contribution: c })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F3F4F6]"
                            >
                              <FileImage className="w-3.5 h-3.5 text-[#14532D]" />
                              ቅጂ
                            </button>
                          )}
                          {c.authorizationStatus === 'authorized' && (
                            <button
                              type="button"
                              onClick={() =>
                                onPrintDocument({ kind: 'receipt', contribution: c })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F3F4F6]"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#14532D]" />
                              አትም
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      {subTab === 'expenses' && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 font-medium">ቫውቸር</th>
                  <th className="px-4 py-3 font-medium">ርዕስ እና ምድብ</th>
                  <th className="px-4 py-3 font-medium">ተቀባይ</th>
                  <th className="px-4 py-3 font-medium">ቀን</th>
                  <th className="px-4 py-3 font-medium text-right">መጠን</th>
                  <th className="px-4 py-3 font-medium">ሁኔታ</th>
                  {canApproveExpense && !isAuditor && (
                    <th className="px-4 py-3 font-medium text-right">ውሳኔ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 font-mono-tabular font-semibold text-[#111815]">
                      {e.voucherNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111815]">{e.title}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {EXPENSE_CATEGORY_AM[e.category]}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#4B5563]">{e.beneficiaryName || '—'}</td>
                    <td className="px-4 py-3 font-mono-tabular text-[#6B7280]">
                      {e.expenseDate}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-[#B45309]">
                      {formatCurrencyETB(e.amount)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <span
                        className={
                          e.approvalStatus === 'approved'
                            ? 'text-[#16A34A]'
                            : e.approvalStatus === 'rejected'
                            ? 'text-[#DC2626]'
                            : 'text-[#B45309]'
                        }
                      >
                        {APPROVAL_STATUS_AM[e.approvalStatus]}
                      </span>
                      {e.approvedByName && (
                        <span className="block text-[11px] font-normal text-[#6B7280]">
                          በ{e.approvedByName}
                        </span>
                      )}
                    </td>
                    {canApproveExpense && !isAuditor && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {e.approvalStatus === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onApproveExpense(e.id, 'rejected')}
                              className="px-2 py-1 border border-[#DC2626]/30 text-[#DC2626] rounded hover:bg-[#FEF2F2]"
                            >
                              ውድቅ
                            </button>
                            <button
                              type="button"
                              onClick={() => onApproveExpense(e.id, 'approved')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#14532D] text-white rounded hover:bg-[#166534]"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              አጽድቅ
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#9CA3AF]">ተጠናቋል</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General Journal View */}
      {subTab === 'journal' && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111815]">
              ጠቅላላ የሂሳብ ጆርናል (General Journal — Double-Entry)
            </h3>
            <span className="text-xs text-[#6B7280]">
              የጸደቁ ገቢዎች፣ ወጪዎች እና የማስተካከያ መዝገቦች
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 font-medium">መለያ / ቀን</th>
                  <th className="px-4 py-3 font-medium">ማጣቀሻና መግለጫ</th>
                  <th className="px-4 py-3 font-medium">የሂሳብ መደብ (Account)</th>
                  <th className="px-4 py-3 font-medium text-right">ዴቢት (Debit)</th>
                  <th className="px-4 py-3 font-medium text-right">ክሬዲት (Credit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredJournal.map((entry) =>
                  entry.lines.map((line, lineIdx) => (
                    <tr
                      key={`${entry.id}_${lineIdx}`}
                      className={lineIdx === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}
                    >
                      <td className="px-4 py-2.5 font-mono-tabular whitespace-nowrap">
                        {lineIdx === 0 ? (
                          <div>
                            <span className="font-semibold text-[#111815] block">
                              {entry.entryNumber}
                            </span>
                            <span className="text-[11px] text-[#6B7280]">{entry.date}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        {lineIdx === 0 ? (
                          <div>
                            <span className="font-mono-tabular text-[11px] text-[#14532D] font-semibold">
                              {entry.reference}
                            </span>
                            <p className="text-[#111815]">{entry.description}</p>
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          line.credit > 0 ? 'pl-8 text-[#4B5563]' : 'font-medium text-[#111815]'
                        }`}
                      >
                        <span className="font-mono-tabular text-[#6B7280] mr-1.5">
                          {line.accountCode}
                        </span>
                        {line.accountNameAm}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular font-medium text-[#111815]">
                        {line.debit > 0 ? formatCurrencyETB(line.debit) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular font-medium text-[#14532D]">
                        {line.credit > 0 ? formatCurrencyETB(line.credit) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General Ledger View */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111815]">
                ጠቅላላ ሌጀር (General Ledger)
              </h3>
              <p className="text-xs text-[#4B5563] mt-0.5">
                የእያንዳንዱን የሂሳብ መደብ ዝርዝር እንቅስቃሴ እና ወቅታዊ ባላንስ ይመልከቱ
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white font-medium"
              >
                {CHART_OF_ACCOUNTS.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.nameAm}
                  </option>
                ))}
              </select>
              <div className="text-right">
                <span className="text-[11px] text-[#6B7280] block">የመዝጊያ ባላንስ</span>
                <span className="text-sm font-bold font-mono-tabular text-[#14532D]">
                  {formatCurrencyETB(ledgerData.endingBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3 font-medium">ቀን</th>
                    <th className="px-4 py-3 font-medium">ጆርናል / ማጣቀሻ</th>
                    <th className="px-4 py-3 font-medium">መግለጫ</th>
                    <th className="px-4 py-3 font-medium text-right">ዴቢት</th>
                    <th className="px-4 py-3 font-medium text-right">ክሬዲት</th>
                    <th className="px-4 py-3 font-medium text-right">ቀሪ ባላንስ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {ledgerData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                        በዚህ የሂሳብ መደብ ውስጥ የተመዘገበ ግብይት የለም።
                      </td>
                    </tr>
                  ) : (
                    ledgerData.rows.map((row) => (
                      <tr key={`${row.entryId}_${row.reference}`} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3 font-mono-tabular text-[#6B7280]">
                          {row.date}
                        </td>
                        <td className="px-4 py-3 font-mono-tabular">
                          <span className="font-semibold text-[#111815]">{row.entryNumber}</span>
                          <span className="block text-[11px] text-[#6B7280]">
                            {row.reference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#374151]">{row.description}</td>
                        <td className="px-4 py-3 text-right font-mono-tabular">
                          {row.debit > 0 ? formatCurrencyETB(row.debit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-tabular">
                          {row.credit > 0 ? formatCurrencyETB(row.credit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-[#111815]">
                          {formatCurrencyETB(row.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-[#F9FAFB] border-t border-[#E5E7EB] font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-[#111815]">
                      ጠቅላላ ድምር ({ledgerData.account.code} · {ledgerData.account.nameAm})
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular">
                      {formatCurrencyETB(ledgerData.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular">
                      {formatCurrencyETB(ledgerData.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-[#14532D]">
                      {formatCurrencyETB(ledgerData.endingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance & Financial Statements */}
      {subTab === 'trial_balance' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#111815]">
                  ትራያል ባላንስ (Trial Balance)
                </h3>
                <p className="text-xs text-[#4B5563]">
                  የሁሉም የሂሳብ መደቦች የተጣራ ዴቢት እና ክሬዲት ሚዛን ማረጋገጫ
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  trialBalance.isBalanced ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {trialBalance.isBalanced
                  ? 'ሚዛናዊ ነው (ዴቢት = ክሬዲት)'
                  : 'ሚዛናዊ አይደለም'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3 font-medium">ኮድ</th>
                    <th className="px-4 py-3 font-medium">የሂሳብ መደብ</th>
                    <th className="px-4 py-3 font-medium">ምድብ</th>
                    <th className="px-4 py-3 font-medium text-right">ዴቢት ባላንስ (ETB)</th>
                    <th className="px-4 py-3 font-medium text-right">ክሬዲት ባላንስ (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {trialBalance.rows.map((r) => (
                    <tr key={r.account.code} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-2.5 font-mono-tabular font-semibold text-[#14532D]">
                        {r.account.code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#111815]">
                        {r.account.nameAm}
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280]">
                        {ACCOUNT_CATEGORY_AM[r.account.category]}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular">
                        {r.debitBalance > 0 ? formatCurrencyETB(r.debitBalance) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-tabular">
                        {r.creditBalance > 0 ? formatCurrencyETB(r.creditBalance) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F9FAFB] border-t-2 border-[#D1D5DB] font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-[#111815]">
                      ጠቅላላ ትራያል ባላንስ ድምር
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-[#111815]">
                      {formatCurrencyETB(trialBalance.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-[#14532D]">
                      {formatCurrencyETB(trialBalance.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Income Statement & Balance Sheet Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-[#111815]">
                የገቢ እና የወጪ መግለጫ (Income Statement)
              </h4>
              <div className="divide-y divide-[#E5E7EB] text-xs">
                {statements.revenueRows.map((r) => (
                  <div key={r.account.code} className="py-2 flex justify-between">
                    <span className="text-[#374151]">{r.account.nameAm}</span>
                    <span className="font-mono-tabular font-medium text-[#16A34A]">
                      {formatCurrencyETB(r.creditBalance - r.debitBalance)}
                    </span>
                  </div>
                ))}
                <div className="py-2 flex justify-between font-semibold text-[#111815]">
                  <span>ጠቅላላ ገቢ</span>
                  <span className="font-mono-tabular">
                    {formatCurrencyETB(statements.totalRevenue)}
                  </span>
                </div>
                {statements.expenseRows.map((r) => (
                  <div key={r.account.code} className="py-2 flex justify-between">
                    <span className="text-[#374151]">{r.account.nameAm}</span>
                    <span className="font-mono-tabular font-medium text-[#B45309]">
                      ({formatCurrencyETB(r.debitBalance - r.creditBalance)})
                    </span>
                  </div>
                ))}
                <div className="py-2.5 flex justify-between font-bold text-sm text-[#14532D]">
                  <span>የተጣራ ትርፍ / ተረፍ (Net Surplus)</span>
                  <span className="font-mono-tabular">
                    {formatCurrencyETB(statements.netSurplus)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-semibold text-[#111815]">
                የሀብት እና የካፒታል መግለጫ (Balance Sheet)
              </h4>
              <div className="divide-y divide-[#E5E7EB] text-xs">
                {statements.assetRows.map((r) => (
                  <div key={r.account.code} className="py-2 flex justify-between">
                    <span className="text-[#374151]">
                      {r.account.code} · {r.account.nameAm}
                    </span>
                    <span className="font-mono-tabular font-medium text-[#111815]">
                      {formatCurrencyETB(r.debitBalance - r.creditBalance)}
                    </span>
                  </div>
                ))}
                <div className="py-2.5 flex justify-between font-bold text-[#14532D]">
                  <span>ጠቅላላ ሀብት (Total Assets)</span>
                  <span className="font-mono-tabular">
                    {formatCurrencyETB(statements.totalAssets)}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-[#374151]">መነሻ የዕድር መጠባበቂያ ካፒታል + የተጣራ ተረፍ</span>
                  <span className="font-mono-tabular font-bold text-[#111815]">
                    {formatCurrencyETB(statements.totalEquityAndSurplus)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
