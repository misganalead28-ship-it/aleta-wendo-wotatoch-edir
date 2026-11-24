import { formatMonthLabelAm, getCurrentMonthKey } from '../i18n';
import type {
  ContributionRecord,
  ExpenseCategory,
  ExpenseRecord,
  IddirDatabase,
  IddirMember,
  JournalEntry,
  LedgerAccount,
  MemberArrearsItem,
  MemberOutstandingSummary,
  PaymentMethod,
} from '../types';

export const CHART_OF_ACCOUNTS: LedgerAccount[] = [
  { code: '1010', nameAm: 'በእጅ ያለ ጥሬ ገንዘብ', category: 'asset', normalSide: 'debit' },
  { code: '1020', nameAm: 'የባንክ ሂሳብ (CBE / ንግድ ባንኮች)', category: 'asset', normalSide: 'debit' },
  { code: '1030', nameAm: 'የቴሌብር ሂሳብ', category: 'asset', normalSide: 'debit' },
  { code: '3010', nameAm: 'የዕድር መጠባበቂያ ካፒታል', category: 'equity', normalSide: 'credit' },
  { code: '4010', nameAm: 'የወርሃዊ መዋጮ ገቢ', category: 'revenue', normalSide: 'credit' },
  { code: '4020', nameAm: 'የሐዘን መዋጮ ገቢ', category: 'revenue', normalSide: 'credit' },
  { code: '4030', nameAm: 'የቅጣት እና የመመዝገቢያ ገቢ', category: 'revenue', normalSide: 'credit' },
  { code: '5010', nameAm: 'የሐዘን ዕርዳታ ወጪ', category: 'expense', normalSide: 'debit' },
  { code: '5020', nameAm: 'የሕክምና እና የሠርግ ድጋፍ ወጪ', category: 'expense', normalSide: 'debit' },
  { code: '5030', nameAm: 'የጽሕፈት፣ የንብረት እና የአስተዳደር ወጪ', category: 'expense', normalSide: 'debit' },
];

export function getAccountByCode(code: string): LedgerAccount {
  return (
    CHART_OF_ACCOUNTS.find((a) => a.code === code) || {
      code,
      nameAm: code,
      category: 'asset',
      normalSide: 'debit',
    }
  );
}

function getCashAccountForMethod(method: PaymentMethod): LedgerAccount {
  if (method === 'bank_transfer') return getAccountByCode('1020');
  if (method === 'telebirr') return getAccountByCode('1030');
  return getAccountByCode('1010');
}

function getRevenueAccountForContribution(c: ContributionRecord): LedgerAccount {
  if (c.type === 'bereavement') return getAccountByCode('4020');
  if (c.type === 'penalty' || c.type === 'registration') return getAccountByCode('4030');
  return getAccountByCode('4010');
}

function getExpenseAccountForCategory(category: ExpenseCategory): LedgerAccount {
  if (category === 'bereavement_aid') return getAccountByCode('5010');
  if (category === 'medical_aid' || category === 'wedding_gift') return getAccountByCode('5020');
  return getAccountByCode('5030');
}

export function buildGeneralJournal(db: IddirDatabase): JournalEntry[] {
  const entries: JournalEntry[] = [];

  // 1. Authorized Contributions -> Dr Cash/Bank/Telebirr, Cr Revenue
  db.contributions.forEach((con, idx) => {
    if (con.authorizationStatus !== 'authorized') return;
    const cashAcc = getCashAccountForMethod(con.paymentMethod);
    const revAcc = getRevenueAccountForContribution(con);
    entries.push({
      id: `jr_con_${con.id}`,
      entryNumber: `JRN-C-${String(db.contributions.length - idx).padStart(3, '0')}`,
      date: con.recordedAt.slice(0, 10),
      reference: con.receiptNumber,
      description: `${con.memberName} (${con.memberCode}) — ${con.periodLabel}`,
      sourceType: 'contribution',
      sourceId: con.id,
      lines: [
        {
          accountCode: cashAcc.code,
          accountNameAm: cashAcc.nameAm,
          debit: con.amount,
          credit: 0,
        },
        {
          accountCode: revAcc.code,
          accountNameAm: revAcc.nameAm,
          debit: 0,
          credit: con.amount,
        },
      ],
      createdByName: con.recordedByName,
      authorizedByName: con.authorizedByName,
      createdAt: con.authorizedAt || con.recordedAt,
    });
  });

  // 2. Approved Expenses -> Dr Expense, Cr Cash/Bank/Telebirr
  db.expenses.forEach((exp: ExpenseRecord, idx: number) => {
    if (exp.approvalStatus !== 'approved') return;
    const expAcc = getExpenseAccountForCategory(exp.category);
    const cashAcc = getCashAccountForMethod(exp.paymentMethod);
    entries.push({
      id: `jr_exp_${exp.id}`,
      entryNumber: `JRN-E-${String(db.expenses.length - idx).padStart(3, '0')}`,
      date: exp.expenseDate,
      reference: exp.voucherNumber,
      description: `${exp.title}${exp.beneficiaryName ? ` · ${exp.beneficiaryName}` : ''}`,
      sourceType: 'expense',
      sourceId: exp.id,
      lines: [
        {
          accountCode: expAcc.code,
          accountNameAm: expAcc.nameAm,
          debit: exp.amount,
          credit: 0,
        },
        {
          accountCode: cashAcc.code,
          accountNameAm: cashAcc.nameAm,
          debit: 0,
          credit: exp.amount,
        },
      ],
      createdByName: exp.recordedByName,
      authorizedByName: exp.approvedByName,
      createdAt: exp.createdAt,
    });
  });

  // 3. Manual Balanced Journal Entries
  (db.manualJournalEntries || []).forEach((manual) => {
    entries.push(manual);
  });

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface LedgerRow {
  entryId: string;
  entryNumber: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function buildAccountLedger(
  journalEntries: JournalEntry[],
  accountCode: string
): {
  account: LedgerAccount;
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
} {
  const account = getAccountByCode(accountCode);
  const chronological = [...journalEntries].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const rows: LedgerRow[] = [];

  for (const entry of chronological) {
    for (const line of entry.lines) {
      if (line.accountCode !== accountCode) continue;
      totalDebit += line.debit;
      totalCredit += line.credit;
      if (account.normalSide === 'debit') {
        running += line.debit - line.credit;
      } else {
        running += line.credit - line.debit;
      }
      rows.push({
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        date: entry.date,
        reference: entry.reference,
        description: entry.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance: running,
      });
    }
  }

  return {
    account,
    rows,
    totalDebit,
    totalCredit,
    endingBalance: running,
  };
}

export interface TrialBalanceRow {
  account: LedgerAccount;
  totalDebitMovement: number;
  totalCreditMovement: number;
  debitBalance: number;
  creditBalance: number;
}

export function buildTrialBalance(journalEntries: JournalEntry[]): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const movementMap = new Map<string, { dr: number; cr: number }>();
  CHART_OF_ACCOUNTS.forEach((acc) => movementMap.set(acc.code, { dr: 0, cr: 0 }));

  for (const entry of journalEntries) {
    for (const line of entry.lines) {
      const curr = movementMap.get(line.accountCode) || { dr: 0, cr: 0 };
      curr.dr += line.debit;
      curr.cr += line.credit;
      movementMap.set(line.accountCode, curr);
    }
  }

  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const acc of CHART_OF_ACCOUNTS) {
    const mv = movementMap.get(acc.code) || { dr: 0, cr: 0 };
    const net = mv.dr - mv.cr;
    const debitBalance = net > 0 ? net : 0;
    const creditBalance = net < 0 ? Math.abs(net) : 0;
    totalDebit += debitBalance;
    totalCredit += creditBalance;
    rows.push({
      account: acc,
      totalDebitMovement: mv.dr,
      totalCreditMovement: mv.cr,
      debitBalance,
      creditBalance,
    });
  }

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

export function buildIncomeAndBalanceSummary(trialBalanceRows: TrialBalanceRow[]) {
  const revenueRows = trialBalanceRows.filter((r) => r.account.category === 'revenue');
  const expenseRows = trialBalanceRows.filter((r) => r.account.category === 'expense');
  const assetRows = trialBalanceRows.filter((r) => r.account.category === 'asset');
  const equityRows = trialBalanceRows.filter((r) => r.account.category === 'equity');

  const totalRevenue = revenueRows.reduce(
    (s, r) => s + r.creditBalance - r.debitBalance,
    0
  );
  const totalExpenses = expenseRows.reduce(
    (s, r) => s + r.debitBalance - r.creditBalance,
    0
  );
  const netSurplus = totalRevenue - totalExpenses;
  const totalAssets = assetRows.reduce(
    (s, r) => s + r.debitBalance - r.creditBalance,
    0
  );
  const totalEquityBase = equityRows.reduce(
    (s, r) => s + r.creditBalance - r.debitBalance,
    0
  );

  return {
    revenueRows,
    expenseRows,
    assetRows,
    totalRevenue,
    totalExpenses,
    netSurplus,
    totalAssets,
    totalEquityAndSurplus: totalEquityBase + netSurplus,
  };
}

function getRecentMonthsWindow(joinDate: string, count = 4): string[] {
  const now = new Date();
  const joinMonth = joinDate.slice(0, 7);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key >= joinMonth) {
      months.push(key);
    }
  }
  return months;
}

export function calculateMemberOutstandingBalance(
  db: IddirDatabase,
  member: IddirMember
): MemberOutstandingSummary {
  const currentMonth = getCurrentMonthKey();
  const billingMonths = getRecentMonthsWindow(member.joinDate, 4);

  const memberContribs = db.contributions.filter((c) => c.memberId === member.id);
  const authorizedContribs = memberContribs.filter(
    (c) => c.authorizationStatus === 'authorized'
  );
  const pendingContribs = memberContribs.filter(
    (c) => c.authorizationStatus === 'pending'
  );

  const paidMonthlySet = new Set(
    authorizedContribs.filter((c) => c.type === 'monthly').map((c) => c.monthKey)
  );
  const paidPenaltyTotal = authorizedContribs
    .filter((c) => c.type === 'penalty')
    .reduce((sum, c) => sum + c.amount, 0);

  const unpaidMonths: MemberArrearsItem[] = [];
  const penaltyPerMonth = db.latePenaltyAmount || 50;

  for (const mk of billingMonths) {
    if (!paidMonthlySet.has(mk)) {
      const isOverdue = mk < currentMonth;
      unpaidMonths.push({
        monthKey: mk,
        periodLabel: formatMonthLabelAm(mk),
        duesAmount: member.monthlyDuesRate,
        penaltyAmount: isOverdue ? penaltyPerMonth : 0,
        isOverdue,
      });
    }
  }

  const totalUnpaidDues = unpaidMonths.reduce((s, item) => s + item.duesAmount, 0);
  const grossPenalties = unpaidMonths.reduce((s, item) => s + item.penaltyAmount, 0);
  const totalPenalties = Math.max(0, grossPenalties - paidPenaltyTotal);
  const totalOutstanding = totalUnpaidDues + totalPenalties;

  return {
    memberId: member.id,
    unpaidMonths,
    totalUnpaidDues,
    totalPenalties,
    totalOutstanding,
    pendingSubmittedAmount: pendingContribs.reduce((s, c) => s + c.amount, 0),
    pendingSubmittedCount: pendingContribs.length,
    authorizedPaidTotal: authorizedContribs.reduce((s, c) => s + c.amount, 0),
    currentMonthPaid: paidMonthlySet.has(currentMonth),
  };
}
