export type UserRole =
  | 'admin'
  | 'chairperson'
  | 'vice_chairperson'
  | 'treasurer'
  | 'secretary'
  | 'auditor'
  | 'public_relations'
  | 'committee_member'
  | 'member';

export type MemberStatus = 'active' | 'suspended';

export type AppTab =
  | 'dashboard'
  | 'members'
  | 'my_profile'
  | 'finance'
  | 'meetings'
  | 'announcements'
  | 'bylaws'
  | 'audit';

export interface DependentInfo {
  id: string;
  fullName: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  age: number;
  notes?: string;
}

export interface IddirMember {
  id: string;
  memberCode: string;
  fullName: string;
  phone: string;
  subCity: string;
  kebele: string;
  addressNote?: string;
  joinDate: string;
  status: MemberStatus;
  photoUrl?: string;
  monthlyDuesRate: number;
  dependents: DependentInfo[];
  guarantorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserRole;
  memberId?: string;
  displayName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ContributionType = 'monthly' | 'bereavement' | 'penalty' | 'registration';
export type PaymentMethod = 'telebirr' | 'bank_transfer' | 'cash';
export type PaymentAuthorizationStatus = 'pending' | 'authorized' | 'rejected';

export interface ContributionRecord {
  id: string;
  receiptNumber: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  monthKey: string; // YYYY-MM
  periodLabel: string;
  type: ContributionType;
  amount: number;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceCode: string;
  receiptImageUrl?: string;
  notes?: string;
  submittedByMember?: boolean;
  authorizationStatus: PaymentAuthorizationStatus;
  authorizedByUid?: string;
  authorizedByName?: string;
  authorizedAt?: string;
  rejectionReason?: string;
  recordedByUid: string;
  recordedByName: string;
  recordedAt: string;
}

export type ExpenseCategory = 'bereavement_aid' | 'medical_aid' | 'wedding_gift' | 'operations' | 'equipment';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseRecord {
  id: string;
  voucherNumber: string;
  category: ExpenseCategory;
  title: string;
  description: string;
  beneficiaryName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceCode?: string;
  approvalStatus: ApprovalStatus;
  approvedByName?: string;
  recordedByUid: string;
  recordedByName: string;
  expenseDate: string;
  createdAt: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface LedgerAccount {
  code: string;
  nameAm: string;
  category: AccountCategory;
  normalSide: 'debit' | 'credit';
}

export interface JournalLine {
  accountCode: string;
  accountNameAm: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference: string;
  description: string;
  sourceType: 'contribution' | 'expense' | 'manual';
  sourceId?: string;
  lines: JournalLine[];
  createdByName: string;
  authorizedByName?: string;
  createdAt: string;
}

export interface MemberArrearsItem {
  monthKey: string;
  periodLabel: string;
  duesAmount: number;
  penaltyAmount: number;
  isOverdue: boolean;
}

export interface MemberOutstandingSummary {
  memberId: string;
  unpaidMonths: MemberArrearsItem[];
  totalUnpaidDues: number;
  totalPenalties: number;
  totalOutstanding: number;
  pendingSubmittedAmount: number;
  pendingSubmittedCount: number;
  authorizedPaidTotal: number;
  currentMonthPaid: boolean;
}

export interface MeetingMinute {
  id: string;
  meetingNumber: string;
  title: string;
  meetingDate: string;
  location: string;
  attendeesCount: number;
  agenda: string;
  minutesBody: string;
  decisions: string;
  approvalStatus: ApprovalStatus;
  approvedByName?: string;
  recordedByUid: string;
  recordedByName: string;
  createdAt: string;
}

export interface OfficialLetter {
  id: string;
  letterNumber: string;
  recipient: string;
  subject: string;
  body: string;
  issueDate: string;
  memberId?: string;
  issuedByName: string;
  createdAt: string;
}

export type NoticeCategory = 'bereavement' | 'joy' | 'urgent' | 'general';

export interface AnnouncementNotice {
  id: string;
  category: NoticeCategory;
  title: string;
  message: string;
  eventDate?: string;
  location?: string;
  approvalStatus: ApprovalStatus;
  authorUid: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
}

export interface MemberInquiry {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  subject: string;
  message: string;
  status: 'open' | 'responded';
  responseText?: string;
  respondedByName?: string;
  createdAt: string;
}

export interface CommitteeTask {
  id: string;
  title: string;
  description: string;
  assignedRole: UserRole;
  assignedToName: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'done';
  updatedAt: string;
}

export interface BylawRule {
  id: string;
  articleNumber: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface AuditTrailEntry {
  id: string;
  actorUid: string;
  actorUsername: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  summary: string;
  timestamp: string;
}

export interface IddirDatabase {
  version: number;
  associationName: string;
  monthlyDuesAmount: number;
  latePenaltyAmount: number;
  members: IddirMember[];
  users: UserAccount[];
  contributions: ContributionRecord[];
  expenses: ExpenseRecord[];
  manualJournalEntries: JournalEntry[];
  minutes: MeetingMinute[];
  letters: OfficialLetter[];
  announcements: AnnouncementNotice[];
  inquiries: MemberInquiry[];
  tasks: CommitteeTask[];
  bylaws: BylawRule[];
  auditLogs: AuditTrailEntry[];
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  memberId?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}
