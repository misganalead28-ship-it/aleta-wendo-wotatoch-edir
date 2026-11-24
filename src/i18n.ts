import type {
  AccountCategory,
  ApprovalStatus,
  ContributionType,
  DependentInfo,
  ExpenseCategory,
  MemberStatus,
  NoticeCategory,
  PaymentAuthorizationStatus,
  PaymentMethod,
  UserRole,
} from './types';

export const SYSTEM_NAME_AM = 'የዕድር አስተዳደር ሲስተም';
export const ASSOCIATION_SUBTITLE_AM = 'የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር';

export const ROLE_LABELS_AM: Record<UserRole, string> = {
  admin: 'አድሚን',
  chairperson: 'ሰብሳቢ',
  vice_chairperson: 'ምክትል ሰብሳቢ',
  treasurer: 'ገንዘብ ያዥ',
  secretary: 'ፀሐፊ',
  auditor: 'ኦዲተር',
  public_relations: 'ህዝብ ግንኙነት',
  committee_member: 'የኮሚቴ አባል',
  member: 'ተራ አባል',
};

export const ALL_ROLES: UserRole[] = [
  'admin',
  'chairperson',
  'vice_chairperson',
  'treasurer',
  'secretary',
  'auditor',
  'public_relations',
  'committee_member',
  'member',
];

export const MEMBER_STATUS_AM: Record<MemberStatus, string> = {
  active: 'ንቁ አባል',
  suspended: 'የታገደ',
};

export const RELATIONSHIP_AM: Record<DependentInfo['relationship'], string> = {
  spouse: 'የትዳር አጋር',
  child: 'ልጅ',
  parent: 'ወላጅ',
  sibling: 'ወንድም / እህት',
  other: 'ሌላ ተጠቃሚ',
};

export const CONTRIBUTION_TYPE_AM: Record<ContributionType, string> = {
  monthly: 'ወርሃዊ መዋጮ',
  bereavement: 'የሐዘን መዋጮ',
  penalty: 'የዘገየ ክፍያ ቅጣት',
  registration: 'የመመዝገቢያ / ልዩ ክፍያ',
};

export const PAYMENT_METHOD_AM: Record<PaymentMethod, string> = {
  telebirr: 'ቴሌብር',
  bank_transfer: 'የባንክ ዝውውር',
  cash: 'ጥሬ ገንዘብ',
};

export const PAYMENT_AUTH_STATUS_AM: Record<PaymentAuthorizationStatus, string> = {
  pending: 'ማጽደቂያ የሚጠብቅ',
  authorized: 'የጸደቀ (Authorized)',
  rejected: 'ውድቅ የተደረገ',
};

export const EXPENSE_CATEGORY_AM: Record<ExpenseCategory, string> = {
  bereavement_aid: 'የሐዘን ዕርዳታ ክፍያ',
  medical_aid: 'የሕክምና ድጋፍ',
  wedding_gift: 'የደስታ / የሠርግ ድጋፍ',
  operations: 'የጽሕፈትና የአስተዳደር ወጪ',
  equipment: 'የዕድር ንብረት / ድንኳን ጥገና',
};

export const APPROVAL_STATUS_AM: Record<ApprovalStatus, string> = {
  pending: 'ውሳኔ የሚጠብቅ',
  approved: 'የጸደቀ',
  rejected: 'ውድቅ የተደረገ',
};

export const NOTICE_CATEGORY_AM: Record<NoticeCategory, string> = {
  bereavement: 'የሐዘን ጥሪ',
  joy: 'የደስታ ጥሪ',
  urgent: 'አስቸኳይ ማስታወቂያ',
  general: 'መደበኛ ማስታወቂያ',
};

export const ACCOUNT_CATEGORY_AM: Record<AccountCategory, string> = {
  asset: 'ሀብት (Asset)',
  liability: 'ዕዳ (Liability)',
  equity: 'ካፒታል / መጠባበቂያ',
  revenue: 'ገቢ (Revenue)',
  expense: 'ወጪ (Expense)',
};

export const ETHIOPIAN_BANKS_AM: string[] = [
  'የኢትዮጵያ ንግድ ባንክ (CBE)',
  'ቴሌብር (Telebirr)',
  'አዋሽ ባንክ (Awash Bank)',
  'ዳሽን ባንክ (Dashen Bank)',
  'አቢሲኒያ ባንክ (Bank of Abyssinia)',
  'ንብ ኢንተርናሽናል ባንክ',
  'ጥሬ ገንዘብ (በጽ/ቤት)',
];

export function formatCurrencyETB(amount: number): string {
  return `${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ብር`;
}

export function formatMonthLabelAm(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const months: Record<string, string> = {
    '01': 'ጥር',
    '02': 'የካቲት',
    '03': 'መጋቢት',
    '04': 'ሚያዝያ',
    '05': 'ግንቦት',
    '06': 'ሰኔ',
    '07': 'ሐምሌ',
    '08': 'ነሐሴ',
    '09': 'መስከረም',
    '10': 'ጥቅምት',
    '11': 'ህዳር',
    '12': 'ታህሳስ',
  };
  return `${months[month] || month} ${year}`;
}

export function formatDateTimeAm(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.toISOString().slice(0, 10)} · ${d.toTimeString().slice(0, 5)}`;
  } catch {
    return iso;
  }
}

export function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}
