import { db as firestoreDb } from '../firebase';
import { getCurrentMonthKey, formatMonthLabelAm } from '../i18n';
import type {
  AnnouncementNotice,
  ApprovalStatus,
  AuditTrailEntry,
  AuthSession,
  BylawRule,
  CommitteeTask,
  ContributionRecord,
  ContributionType,
  DependentInfo,
  ExpenseCategory,
  ExpenseRecord,
  IddirDatabase,
  IddirMember,
  JournalEntry,
  JournalLine,
  MeetingMinute,
  MemberInquiry,
  MemberStatus,
  NoticeCategory,
  OfficialLetter,
  PaymentAuthorizationStatus,
  PaymentMethod,
  UserAccount,
  UserRole,
} from '../types';
import { getAccountByCode } from './accountingEngine';

export const ASSETS_IMG = {
  emblem: '/src/assets/images/association_emblem_1795457872105.jpg',
  heroBanner: '/src/assets/images/hero_community_banner_1795457872441.jpg',
  maleAvatar: '/src/assets/images/member_portrait_male_1795457873368.jpg',
  femaleAvatar: '/src/assets/images/member_portrait_female_1795457874208.jpg',
};

const STORAGE_KEY = 'aleta_iddir_management_db_v3';

export const INITIAL_ADMIN_USERNAME = 'admin';
export const INITIAL_ADMIN_PASSWORD =
  (import.meta.env.VITE_INITIAL_ADMIN_PASSWORD as string | undefined)?.trim() || 'admin123';

export interface IddirDataProvider {
  readonly driverName: 'localStorage' | 'firestore';
  load(): Promise<IddirDatabase>;
  save(data: IddirDatabase): Promise<void>;
  reset(): Promise<IddirDatabase>;
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function createSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2, 14);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}::${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback for non-secure contexts
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function buildSeedDatabase(): Promise<IddirDatabase> {
  const now = new Date();
  const isoNow = now.toISOString();
  const currentMonth = getCurrentMonthKey();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const members: IddirMember[] = [
    {
      id: 'mem_001',
      memberCode: 'EDR-2026-001',
      fullName: 'አቶ ምስጋና አለሙ',
      phone: '+251916001101',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 01',
      addressNote: 'ማዕከላዊ ሰፈር',
      joinDate: '2022-09-11',
      status: 'active',
      photoUrl: ASSETS_IMG.maleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ አበበ ታደሰ',
      dependents: [
        { id: 'dep_1', fullName: 'ወ/ሮ ትግስት በቀለ', relationship: 'spouse', age: 31 },
        { id: 'dep_2', fullName: 'ዳዊት ምስጋና', relationship: 'child', age: 7 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_002',
      memberCode: 'EDR-2026-002',
      fullName: 'ወ/ሮ ሰላም ታደሰ',
      phone: '+251911223344',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 02',
      addressNote: 'ገበያ ዳር',
      joinDate: '2023-01-15',
      status: 'active',
      photoUrl: ASSETS_IMG.femaleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ ምስጋና አለሙ',
      dependents: [
        { id: 'dep_3', fullName: 'አቶ ብርሃኑ ገዛኸኝ', relationship: 'spouse', age: 35 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_003',
      memberCode: 'EDR-2026-003',
      fullName: 'አቶ ዳንኤል ተስፋዬ',
      phone: '+251922334455',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 01',
      addressNote: 'አዲስ ከተማ',
      joinDate: '2023-04-02',
      status: 'active',
      photoUrl: ASSETS_IMG.maleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'ወ/ሮ ሰላም ታደሰ',
      dependents: [
        { id: 'dep_4', fullName: 'ወ/ሮ ራሄል ደምሴ', relationship: 'spouse', age: 29 },
        { id: 'dep_5', fullName: 'ቤተልሔም ዳንኤል', relationship: 'child', age: 4 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_004',
      memberCode: 'EDR-2026-004',
      fullName: 'ወ/ሪት ሜሮን ኃይሉ',
      phone: '+251933445566',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 03',
      addressNote: 'መናኸሪያ አካባቢ',
      joinDate: '2023-07-19',
      status: 'active',
      photoUrl: ASSETS_IMG.femaleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ ዳንኤል ተስፋዬ',
      dependents: [
        { id: 'dep_6', fullName: 'ወ/ሮ አስቴር ሞላ', relationship: 'parent', age: 58 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_005',
      memberCode: 'EDR-2026-005',
      fullName: 'አቶ ዮሐንስ ከበደ',
      phone: '+251944556677',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 02',
      addressNote: 'ሆስፒታል ፊት ለፊት',
      joinDate: '2024-02-10',
      status: 'active',
      photoUrl: ASSETS_IMG.maleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'ወ/ሪት ሜሮን ኃይሉ',
      dependents: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_006',
      memberCode: 'EDR-2026-006',
      fullName: 'ወ/ሮ ሃና ግርማ',
      phone: '+251955667788',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 04',
      addressNote: 'ጊዮርጊስ ሰፈር',
      joinDate: '2024-05-20',
      status: 'active',
      photoUrl: ASSETS_IMG.femaleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ ዮሐንስ ከበደ',
      dependents: [
        { id: 'dep_7', fullName: 'አቶ ሳሙኤል ታዬ', relationship: 'spouse', age: 34 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_007',
      memberCode: 'EDR-2026-007',
      fullName: 'አቶ ታሪኩ መኮንን',
      phone: '+251966778899',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 01',
      addressNote: 'ትምህርት ቤት ጀርባ',
      joinDate: '2024-09-01',
      status: 'active',
      photoUrl: ASSETS_IMG.maleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ ምስጋና አለሙ',
      dependents: [
        { id: 'dep_8', fullName: 'ወ/ሮ መቅደስ አሰፋ', relationship: 'spouse', age: 27 },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_008',
      memberCode: 'EDR-2026-008',
      fullName: 'አቶ ጌታቸው በላይ',
      phone: '+251977889900',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 03',
      addressNote: 'ቡና ቦርድ አካባቢ',
      joinDate: '2025-01-12',
      status: 'active',
      photoUrl: ASSETS_IMG.maleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'ወ/ሮ ሃና ግርማ',
      dependents: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'mem_009',
      memberCode: 'EDR-2026-009',
      fullName: 'ወ/ሮ ፍቅርተ ዘውዴ',
      phone: '+251988990011',
      subCity: 'አለታ ወንዶ',
      kebele: 'ቀበሌ 02',
      addressNote: 'ባንክ ጀርባ',
      joinDate: '2025-03-08',
      status: 'suspended',
      photoUrl: ASSETS_IMG.femaleAvatar,
      monthlyDuesRate: 500,
      guarantorName: 'አቶ ታሪኩ መኮንን',
      dependents: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const makeUser = async (
    id: string,
    username: string,
    role: UserRole,
    displayName: string,
    memberId?: string
  ): Promise<UserAccount> => {
    const salt = createSalt();
    const hash = await hashPassword(INITIAL_ADMIN_PASSWORD, salt);
    return {
      id,
      username,
      passwordSalt: salt,
      passwordHash: hash,
      role,
      memberId,
      displayName,
      active: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    };
  };

  const users: UserAccount[] = await Promise.all([
    makeUser('usr_admin', INITIAL_ADMIN_USERNAME, 'admin', 'የሲስተም አድሚን'),
    makeUser('usr_chair', 'sebsabi', 'chairperson', 'አቶ ምስጋና አለሙ', 'mem_001'),
    makeUser('usr_vchair', 'msebsabi', 'vice_chairperson', 'ወ/ሮ ሰላም ታደሰ', 'mem_002'),
    makeUser('usr_treas', 'genzeb', 'treasurer', 'አቶ ዳንኤል ተስፋዬ', 'mem_003'),
    makeUser('usr_sec', 'tsehafi', 'secretary', 'ወ/ሪት ሜሮን ኃይሉ', 'mem_004'),
    makeUser('usr_aud', 'auditor', 'auditor', 'አቶ ዮሐንስ ከበደ', 'mem_005'),
    makeUser('usr_pr', 'hizb', 'public_relations', 'ወ/ሮ ሃና ግርማ', 'mem_006'),
    makeUser('usr_comm', 'komite', 'committee_member', 'አቶ ታሪኩ መኮንን', 'mem_007'),
    makeUser('usr_mem1', 'abal1', 'member', 'አቶ ጌታቸው በላይ', 'mem_008'),
  ]);

  const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoKey = `${twoMonthsAgoDate.getFullYear()}-${String(
    twoMonthsAgoDate.getMonth() + 1
  ).padStart(2, '0')}`;

  const contributions: ContributionRecord[] = [
    {
      id: 'con_1',
      receiptNumber: 'RCP-2026-0101',
      memberId: 'mem_001',
      memberCode: 'EDR-2026-001',
      memberName: 'አቶ ምስጋና አለሙ',
      monthKey: currentMonth,
      periodLabel: formatMonthLabelAm(currentMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'telebirr',
      bankName: 'ቴሌብር (Telebirr)',
      referenceCode: 'TLB-8842190',
      notes: 'ወቅታዊ ክፍያ',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: isoNow,
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: isoNow,
    },
    {
      id: 'con_2',
      receiptNumber: 'RCP-2026-0102',
      memberId: 'mem_002',
      memberCode: 'EDR-2026-002',
      memberName: 'ወ/ሮ ሰላም ታደሰ',
      monthKey: currentMonth,
      periodLabel: formatMonthLabelAm(currentMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'bank_transfer',
      bankName: 'የኢትዮጵያ ንግድ ባንክ (CBE)',
      referenceCode: 'CBE-9921045',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: isoNow,
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: isoNow,
    },
    {
      id: 'con_3',
      receiptNumber: 'RCP-2026-0103',
      memberId: 'mem_003',
      memberCode: 'EDR-2026-003',
      memberName: 'አቶ ዳንኤል ተስፋዬ',
      monthKey: currentMonth,
      periodLabel: formatMonthLabelAm(currentMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'telebirr',
      bankName: 'ቴሌብር (Telebirr)',
      referenceCode: 'TLB-7741002',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: isoNow,
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: isoNow,
    },
    {
      id: 'con_4',
      receiptNumber: 'RCP-2026-0080',
      memberId: 'mem_008',
      memberCode: 'EDR-2026-008',
      memberName: 'አቶ ጌታቸው በላይ',
      monthKey: twoMonthsAgoKey,
      periodLabel: formatMonthLabelAm(twoMonthsAgoKey),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'cash',
      bankName: 'ጥሬ ገንዘብ (በጽ/ቤት)',
      referenceCode: 'CSH-00412',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: twoMonthsAgoDate.toISOString(),
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: twoMonthsAgoDate.toISOString(),
    },
    {
      id: 'con_5',
      receiptNumber: 'RCP-2026-0088',
      memberId: 'mem_004',
      memberCode: 'EDR-2026-004',
      memberName: 'ወ/ሪት ሜሮን ኃይሉ',
      monthKey: prevMonth,
      periodLabel: formatMonthLabelAm(prevMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'telebirr',
      bankName: 'ቴሌብር (Telebirr)',
      referenceCode: 'TLB-5519083',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: prevDate.toISOString(),
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: prevDate.toISOString(),
    },
    {
      id: 'con_6',
      receiptNumber: 'RCP-2026-0089',
      memberId: 'mem_008',
      memberCode: 'EDR-2026-008',
      memberName: 'አቶ ጌታቸው በላይ',
      monthKey: prevMonth,
      periodLabel: formatMonthLabelAm(prevMonth),
      type: 'bereavement',
      amount: 300,
      paymentMethod: 'bank_transfer',
      bankName: 'የኢትዮጵያ ንግድ ባንክ (CBE)',
      referenceCode: 'CBE-6620194',
      notes: 'ድንገተኛ የሐዘን መዋጮ',
      authorizationStatus: 'authorized',
      authorizedByUid: 'usr_treas',
      authorizedByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedAt: prevDate.toISOString(),
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      recordedAt: prevDate.toISOString(),
    },
    {
      id: 'con_7',
      receiptNumber: 'SUB-2026-0105',
      memberId: 'mem_004',
      memberCode: 'EDR-2026-004',
      memberName: 'ወ/ሪት ሜሮን ኃይሉ',
      monthKey: currentMonth,
      periodLabel: formatMonthLabelAm(currentMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'bank_transfer',
      bankName: 'የኢትዮጵያ ንግድ ባንክ (CBE)',
      referenceCode: 'FT2608914421',
      notes: 'በCBE ሞባይል ባንኪንግ የተላከ የወሩ መዋጮ — የምክትል ሰብሳቢ ማረጋገጫ የሚጠብቅ',
      submittedByMember: true,
      authorizationStatus: 'pending',
      recordedByUid: 'usr_sec',
      recordedByName: 'ወ/ሪት ሜሮን ኃይሉ',
      recordedAt: isoNow,
    },
    {
      id: 'con_8',
      receiptNumber: 'SUB-2026-0106',
      memberId: 'mem_006',
      memberCode: 'EDR-2026-006',
      memberName: 'ወ/ሮ ሃና ግርማ',
      monthKey: currentMonth,
      periodLabel: formatMonthLabelAm(currentMonth),
      type: 'monthly',
      amount: 500,
      paymentMethod: 'telebirr',
      bankName: 'ቴሌብር (Telebirr)',
      referenceCode: 'TLB-90451288',
      notes: 'በቴሌብር የተከፈለ የወሩ መዋጮ',
      submittedByMember: true,
      authorizationStatus: 'pending',
      recordedByUid: 'usr_pr',
      recordedByName: 'ወ/ሮ ሃና ግርማ',
      recordedAt: isoNow,
    },
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp_1',
      voucherNumber: 'VCH-2026-001',
      category: 'equipment',
      title: 'የዕድር ድንኳን እና ወንበር ጥገና',
      description: 'ለሁለት ትላልቅ ድንኳኖች የብረት ምሰሶ እና የሸራ ጥገና ወጪ',
      beneficiaryName: 'አለታ ወንዶ ብረታ ብረት ሥራ',
      amount: 1200,
      paymentMethod: 'cash',
      referenceCode: 'VCH-001',
      approvalStatus: 'approved',
      approvedByName: 'አቶ ምስጋና አለሙ',
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      expenseDate: prevDate.toISOString().slice(0, 10),
      createdAt: prevDate.toISOString(),
    },
    {
      id: 'exp_2',
      voucherNumber: 'VCH-2026-002',
      category: 'bereavement_aid',
      title: 'ለአባል ቤተሰብ የሐዘን ድጋፍ ጥያቄ',
      description: 'ለአባል ቤተሰብ የሐዘን መርጃ የሚውል ክፍያ የሰብሳቢ ማረጋገጫ የሚጠብቅ',
      beneficiaryName: 'ወ/ሮ ሃና ግርማ',
      amount: 3500,
      paymentMethod: 'bank_transfer',
      referenceCode: 'REQ-2026-09',
      approvalStatus: 'pending',
      recordedByUid: 'usr_treas',
      recordedByName: 'አቶ ዳንኤል ተስፋዬ',
      expenseDate: isoNow.slice(0, 10),
      createdAt: isoNow,
    },
  ];

  const minutes: MeetingMinute[] = [
    {
      id: 'min_1',
      meetingNumber: 'ቃለ-ጉባኤ ቁ. 04/2018',
      title: 'ወርሃዊ የአመራር ኮሚቴ እና የሂሳብ ግምገማ ስብሰባ',
      meetingDate: prevDate.toISOString().slice(0, 10),
      location: 'አለታ ወንዶ የወጣቶች ማዕከል አዳራሽ',
      attendeesCount: 8,
      agenda: '1. የወሩ መዋጮ አሰባሰብ ግምገማ\n2. የድንኳን ንብረት ቁጥጥር\n3. የአዳዲስ አባላት ምዝገባ',
      minutesBody:
        'ኮሚቴው የወሩን የቴሌብር እና የባንክ ገቢ በዝርዝር ገምግሟል። ዘግይተው በሚከፈሉ መዋጮዎች ላይ የዕድሩ ደንብ በሚፈቅደው መሠረት ክትትል እንዲደረግ ተወስኗል።',
      decisions: '1. የድንኳን ጥገና በ1,200 ብር እንዲከናወን ጸድቋል።\n2. የኦንላይን ደረሰኝ መዝገብ እንዲጠናከር ተወስኗል።',
      approvalStatus: 'approved',
      approvedByName: 'አቶ ምስጋና አለሙ',
      recordedByUid: 'usr_sec',
      recordedByName: 'ወ/ሪት ሜሮን ኃይሉ',
      createdAt: prevDate.toISOString(),
    },
    {
      id: 'min_2',
      meetingNumber: 'ቃለ-ጉባኤ ቁ. 05/2018',
      title: 'የልዩ ዕርዳታ እና የጠቅላላ ጉባኤ ዝግጅት ስብሰባ',
      meetingDate: isoNow.slice(0, 10),
      location: 'የዕድሩ ጽሕፈት ቤት',
      attendeesCount: 7,
      agenda: '1. የጠቅላላ ጉባኤ ቀን መወሰን\n2. የሐዘን ዕርዳታ ጥያቄ ውሳኔ',
      minutesBody:
        'የቀረበው የሐዘን ዕርዳታ ጥያቄ ተመርምሮ ለሰብሳቢ እና ምክትል ሰብሳቢ የመጨረሻ ማጽደቂያ ቀርቧል።',
      decisions: 'ጠቅላላ ጉባኤው በሚቀጥለው እሁድ ከጠዋቱ 3:00 ሰዓት እንዲካሄድ ረቂቅ ውሳኔ ቀርቧል።',
      approvalStatus: 'pending',
      recordedByUid: 'usr_sec',
      recordedByName: 'ወ/ሪት ሜሮን ኃይሉ',
      createdAt: isoNow,
    },
  ];

  const letters: OfficialLetter[] = [
    {
      id: 'ltr_1',
      letterNumber: 'ዕድር/014/2018',
      recipient: 'ለአለታ ወንዶ ከተማ አስተዳደር የወጣቶች ጽ/ቤት',
      subject: 'የጠቅላላ ጉባኤ አዳራሽ ትብብር ጥያቄ',
      body: 'የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር መደበኛ ጠቅላላ ጉባኤ ለማካሄድ የማዕከሉን አዳራሽ ለግማሽ ቀን እንዲፈቅዱልን በአክብሮት እንጠይቃለን።',
      issueDate: isoNow.slice(0, 10),
      issuedByName: 'ወ/ሪት ሜሮን ኃይሉ',
      createdAt: isoNow,
    },
  ];

  const announcements: AnnouncementNotice[] = [
    {
      id: 'ann_1',
      category: 'general',
      title: 'የወሩ ወርሃዊ መዋጮ ማሳሰቢያ',
      message: 'ውድ የዕድራችን አባላት፤ የወሩን መደበኛ 500 ብር መዋጮ እስከ ወሩ 10ኛው ቀን ድረስ በቴሌብር ወይም በባንክ በመክፈል ደረሰኝ ለገንዘብ ያዥ እንድታስመዘግቡ እናሳስባለን።',
      eventDate: isoNow.slice(0, 10),
      location: 'የዕድሩ ጽሕፈት ቤት',
      approvalStatus: 'approved',
      authorUid: 'usr_pr',
      authorName: 'ወ/ሮ ሃና ግርማ',
      authorRole: 'public_relations',
      createdAt: isoNow,
    },
    {
      id: 'ann_2',
      category: 'joy',
      title: 'የደስታ ጥሪ — የአባል ሠርግ ሥነ-ሥርዓት',
      message: 'የአባላችን የአቶ ታሪኩ መኮንን ቤተሰብ የደስታ ሠርግ በመጪው እሁድ ከቀኑ 6:00 ሰዓት ጀምሮ ስለሚከበር ሁሉም አባላት በአንድነት እንድንገኝ ጥሪ ተላልፏል።',
      eventDate: new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10),
      location: 'ቀበሌ 01 አዳራሽ',
      approvalStatus: 'approved',
      authorUid: 'usr_pr',
      authorName: 'ወ/ሮ ሃና ግርማ',
      authorRole: 'public_relations',
      createdAt: isoNow,
    },
  ];

  const inquiries: MemberInquiry[] = [
    {
      id: 'inq_1',
      memberId: 'mem_008',
      memberName: 'አቶ ጌታቸው በላይ',
      memberCode: 'EDR-2026-008',
      subject: 'የቤተሰብ ተጠቃሚ መመዝገቢያ ጥያቄ',
      message: 'አዲስ የተወለደችውን ልጄን በዕድሩ የቤተሰብ ዝርዝር ውስጥ ለማካተት ምን ሰነድ ማምጣት አለብኝ?',
      status: 'open',
      createdAt: isoNow,
    },
  ];

  const tasks: CommitteeTask[] = [
    {
      id: 'tsk_1',
      title: 'የዕድሩን ድንኳኖችና ወንበሮች ቆጠራ ማጠናቀቅ',
      description: 'በቀበሌ 01 መጋዘን የሚገኙ 3 ድንኳኖች እና 150 ወንበሮች ሁኔታ በዝርዝር መፈተሽ',
      assignedRole: 'committee_member',
      assignedToName: 'አቶ ታሪኩ መኮንን',
      dueDate: new Date(now.getTime() + 4 * 86400000).toISOString().slice(0, 10),
      status: 'in_progress',
      updatedAt: isoNow,
    },
    {
      id: 'tsk_2',
      title: 'የጠቅላላ ጉባኤ አዳራሽ ዝግጅት',
      description: 'የመቀመጫ እና የድምጽ ማጉያ ዝግጅት ከህዝብ ግንኙነት ጋር ማስተባበር',
      assignedRole: 'committee_member',
      assignedToName: 'አቶ ታሪኩ መኮንን',
      dueDate: new Date(now.getTime() + 6 * 86400000).toISOString().slice(0, 10),
      status: 'todo',
      updatedAt: isoNow,
    },
  ];

  const bylaws: BylawRule[] = [
    {
      id: 'byl_1',
      articleNumber: 'አንቀጽ 1',
      title: 'የዕድሩ ስያሜ፣ ዓላማ እና የአባልነት መስፈርት',
      content:
        'ይህ መረዳጃ ዕድር «የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር» ተብሎ ይጠራል። ዋና ዓላማው አባላት በሐዘን፣ በደስታ እና በድንገተኛ ችግር ጊዜ በአንድነት እንዲረዳዱ ማድረግ ነው። ዕድሜው 18 ዓመትና ከዚያ በላይ የሆነ ማንኛውም አባል የዕድሩን ደንብ ተቀብሎ በዋስትና መመዝገብ ይችላል።',
      updatedAt: isoNow,
    },
    {
      id: 'byl_2',
      articleNumber: 'አንቀጽ 2',
      title: 'ወርሃዊ መዋጮ እና የክፍያ ቀነ-ገደብ',
      content:
        'እያንዳንዱ ንቁ አባል በየወሩ እስከ 10ኛው ቀን ድረስ 500 ብር መደበኛ መዋጮ በቴሌብር፣ በባንክ ዝውውር ወይም በጥሬ ገንዘብ መክፈል አለበት። ከቀነ-ገደቡ በኋላ ለሚዘገይ ክፍያ 50 ብር ቅጣት ይታሰባል። ለተከታታይ 3 ወራት ያልከፈለ አባል በኮሚቴ ውሳኔ ሊታገድ ይችላል።',
      updatedAt: isoNow,
    },
    {
      id: 'byl_3',
      articleNumber: 'አንቀጽ 3',
      title: 'የሐዘን፣ የሕክምና እና የደስታ ድጋፍ አፈጻጸም',
      content:
        'የተመዘገቡ የቤተሰብ ተጠቃሚዎች (የትዳር አጋር፣ ልጆች እና ወላጆች) በዕድሩ ደንብ መሠረት ለሐዘን እስከ 15,000 ብር፣ ለድንገተኛ ሕክምና እስከ 8,000 ብር እና ለአባል ሠርግ 5,000 ብር ድጋፍ ይሰጣቸዋል።',
      updatedAt: isoNow,
    },
  ];

  const auditLogs: AuditTrailEntry[] = [
    {
      id: 'aud_1',
      actorUid: 'usr_admin',
      actorUsername: 'admin',
      actorName: 'የሲስተም አድሚን',
      actorRole: 'admin',
      action: 'ሲስተም ተጀምሯል',
      targetType: 'ሲስተም',
      summary: 'የዕድር አስተዳደር ሲስተም መነሻ አባላት፣ ሚናዎች እና የፋይናንስ መዝገብ ተዘጋጅቷል።',
      timestamp: isoNow,
    },
  ];

  const manualJournalEntries: JournalEntry[] = [
    {
      id: 'jrn_seed_open',
      entryNumber: 'JRN-M-001',
      date: twoMonthsAgoDate.toISOString().slice(0, 10),
      reference: 'OPEN-2026',
      description: 'የዕድር መነሻ የባንክ መጠባበቂያ ቀሪ ሂሳብ',
      sourceType: 'manual',
      lines: [
        {
          accountCode: '1020',
          accountNameAm: 'የባንክ ሂሳብ (CBE / ንግድ ባንኮች)',
          debit: 15000,
          credit: 0,
        },
        {
          accountCode: '3010',
          accountNameAm: 'የዕድር መጠባበቂያ ካፒታል',
          debit: 0,
          credit: 15000,
        },
      ],
      createdByName: 'አቶ ዳንኤል ተስፋዬ',
      authorizedByName: 'አቶ ምስጋና አለሙ',
      createdAt: twoMonthsAgoDate.toISOString(),
    },
  ];

  return {
    version: 3,
    associationName: 'የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር',
    monthlyDuesAmount: 500,
    latePenaltyAmount: 50,
    members,
    users,
    contributions,
    expenses,
    manualJournalEntries,
    minutes,
    letters,
    announcements,
    inquiries,
    tasks,
    bylaws,
    auditLogs,
  };
}

class LocalStorageIddirProvider implements IddirDataProvider {
  readonly driverName = 'localStorage' as const;

  async load(): Promise<IddirDatabase> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as IddirDatabase;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.contributions)) {
          return {
            ...parsed,
            version: 3,
            latePenaltyAmount: parsed.latePenaltyAmount || 50,
            manualJournalEntries: Array.isArray(parsed.manualJournalEntries)
              ? parsed.manualJournalEntries
              : [],
            contributions: parsed.contributions.map((c) => ({
              ...c,
              authorizationStatus: c.authorizationStatus || 'authorized',
            })),
          };
        }
      }
    } catch {
      // Fallback to clean seed
    }
    const seeded = await buildSeedDatabase();
    await this.save(seeded);
    return seeded;
  }

  async save(data: IddirDatabase): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async reset(): Promise<IddirDatabase> {
    const seeded = await buildSeedDatabase();
    await this.save(seeded);
    return seeded;
  }
}

/**
 * Cloud-ready provider placeholder referencing the configured Firebase Firestore instance (`firestoreDb`).
 * Swap active provider when moving from offline-first localStorage mode to cloud sync.
 */
export function getConfiguredFirestoreRef() {
  return firestoreDb;
}

export const iddirProvider: IddirDataProvider = new LocalStorageIddirProvider();

function assertRole(session: AuthSession, allowed: UserRole[], actionLabel: string): void {
  if (!allowed.includes(session.role)) {
    throw new Error(`ይህን ተግባር («${actionLabel}») ለማከናወን የስልጣን ፈቃድ የለዎትም።`);
  }
}

export function appendAuditLog(
  db: IddirDatabase,
  session: AuthSession,
  action: string,
  targetType: string,
  summary: string
): AuditTrailEntry[] {
  const entry: AuditTrailEntry = {
    id: generateId('aud'),
    actorUid: session.userId,
    actorUsername: session.username,
    actorName: session.displayName,
    actorRole: session.role,
    action,
    targetType,
    summary,
    timestamp: new Date().toISOString(),
  };
  return [entry, ...db.auditLogs].slice(0, 400);
}

export async function authenticateUser(
  db: IddirDatabase,
  username: string,
  password: string
): Promise<AuthSession> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error('እባክዎ የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ።');
  }
  const account = db.users.find((u) => u.username.toLowerCase() === normalized);
  if (!account) {
    throw new Error('የተጠቃሚ ስም ወይም የይለፍ ቃል ትክክል አይደለም።');
  }
  if (!account.active) {
    throw new Error('ይህ የተጠቃሚ መለያ ታግዷል። እባክዎ አድሚንን ያነጋግሩ።');
  }
  const valid = await verifyPassword(password, account.passwordSalt, account.passwordHash);
  if (!valid) {
    throw new Error('የተጠቃሚ ስም ወይም የይለፍ ቃል ትክክል አይደለም።');
  }
  if (account.memberId) {
    const linkedMember = db.members.find((m) => m.id === account.memberId);
    if (linkedMember && linkedMember.status === 'suspended') {
      throw new Error('የአባልነት ሁኔታዎ በእገዳ ላይ ስለሆነ መግባት አይችሉም።');
    }
  }
  return {
    userId: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    memberId: account.memberId,
  };
}

// =========================================================================
// Admin-Only Member & Credential Mutations
// =========================================================================

export function upsertMemberByAdmin(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    id?: string;
    memberCode: string;
    fullName: string;
    phone: string;
    subCity: string;
    kebele: string;
    addressNote?: string;
    joinDate: string;
    status: MemberStatus;
    monthlyDuesRate: number;
    guarantorName?: string;
    photoUrl?: string;
    dependents: DependentInfo[];
  }
): IddirDatabase {
  assertRole(session, ['admin'], 'አባል መመዝገብ / ማስተካከል');
  const now = new Date().toISOString();
  const cleanCode = payload.memberCode.trim().toUpperCase();

  if (payload.id) {
    const updatedMembers = db.members.map((m) =>
      m.id === payload.id
        ? {
            ...m,
            ...payload,
            memberCode: cleanCode,
            updatedAt: now,
          }
        : m
    );
    const updatedUsers = db.users.map((u) =>
      u.memberId === payload.id
        ? { ...u, displayName: payload.fullName.trim(), updatedAt: now }
        : u
    );
    return {
      ...db,
      members: updatedMembers,
      users: updatedUsers,
      auditLogs: appendAuditLog(
        db,
        session,
        'የአባል መረጃ ተሻሽሏል',
        'አባል',
        `${cleanCode} (${payload.fullName}) — ሁኔታ: ${payload.status}`
      ),
    };
  }

  const newMember: IddirMember = {
    id: generateId('mem'),
    memberCode: cleanCode,
    fullName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    subCity: payload.subCity.trim(),
    kebele: payload.kebele.trim(),
    addressNote: payload.addressNote?.trim() || '',
    joinDate: payload.joinDate,
    status: payload.status,
    photoUrl: payload.photoUrl || ASSETS_IMG.maleAvatar,
    monthlyDuesRate: Math.max(0, Number(payload.monthlyDuesRate) || db.monthlyDuesAmount),
    guarantorName: payload.guarantorName?.trim() || '',
    dependents: payload.dependents,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...db,
    members: [newMember, ...db.members],
    auditLogs: appendAuditLog(
      db,
      session,
      'አዲስ አባል ተመዝግቧል',
      'አባል',
      `${newMember.memberCode} — ${newMember.fullName}`
    ),
  };
}

export function toggleMemberStatusByAdmin(
  db: IddirDatabase,
  session: AuthSession,
  memberId: string,
  nextStatus: MemberStatus
): IddirDatabase {
  assertRole(session, ['admin'], 'የአባልነት ሁኔታ መቀየር');
  const target = db.members.find((m) => m.id === memberId);
  if (!target) throw new Error('አባሉ አልተገኘም።');
  const now = new Date().toISOString();
  return {
    ...db,
    members: db.members.map((m) =>
      m.id === memberId ? { ...m, status: nextStatus, updatedAt: now } : m
    ),
    auditLogs: appendAuditLog(
      db,
      session,
      nextStatus === 'suspended' ? 'አባል ታግዷል' : 'አባል ነቅቷል',
      'አባል',
      `${target.memberCode} (${target.fullName}) -> ${nextStatus}`
    ),
  };
}

export async function createOrUpdateUserByAdmin(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    userId?: string;
    username: string;
    password?: string;
    role: UserRole;
    memberId?: string;
    displayName: string;
    active: boolean;
  }
): Promise<IddirDatabase> {
  assertRole(session, ['admin'], 'የዩዘር መለያ እና ሚና ማስተዳደር');
  const cleanUsername = payload.username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    throw new Error('የተጠቃሚ ስም ቢያንስ 3 ፊደላት መሆን አለበት።');
  }

  const duplicate = db.users.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.id !== payload.userId
  );
  if (duplicate) {
    throw new Error('ይህ የተጠቃሚ ስም (Username) ቀድሞ ተይዟል።');
  }

  const now = new Date().toISOString();

  if (payload.userId) {
    const existing = db.users.find((u) => u.id === payload.userId);
    if (!existing) throw new Error('ተጠቃሚው አልተገኘም።');
    let passwordSalt = existing.passwordSalt;
    let passwordHash = existing.passwordHash;
    if (payload.password && payload.password.trim().length > 0) {
      if (payload.password.trim().length < 4) {
        throw new Error('የይለፍ ቃል ቢያንስ 4 ፊደላት መሆን አለበት።');
      }
      passwordSalt = createSalt();
      passwordHash = await hashPassword(payload.password.trim(), passwordSalt);
    }

    const updatedUsers = db.users.map((u) =>
      u.id === payload.userId
        ? {
            ...u,
            username: cleanUsername,
            passwordSalt,
            passwordHash,
            role: payload.role,
            memberId: payload.memberId || undefined,
            displayName: payload.displayName.trim(),
            active: payload.active,
            updatedAt: now,
          }
        : u
    );

    return {
      ...db,
      users: updatedUsers,
      auditLogs: appendAuditLog(
        db,
        session,
        'የተጠቃሚ መለያ/ሚና ተቀይሯል',
        'ተጠቃሚ',
        `Username: ${cleanUsername}, ሚና: ${payload.role}, ንቁ: ${payload.active ? 'አዎ' : 'አይ'}`
      ),
    };
  }

  if (!payload.password || payload.password.trim().length < 4) {
    throw new Error('ለአዲስ ተጠቃሚ ቢያንስ 4 ፊደል ያለው የይለፍ ቃል ያስገቡ።');
  }

  const salt = createSalt();
  const hash = await hashPassword(payload.password.trim(), salt);
  const newUser: UserAccount = {
    id: generateId('usr'),
    username: cleanUsername,
    passwordSalt: salt,
    passwordHash: hash,
    role: payload.role,
    memberId: payload.memberId || undefined,
    displayName: payload.displayName.trim(),
    active: payload.active,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...db,
    users: [newUser, ...db.users],
    auditLogs: appendAuditLog(
      db,
      session,
      'አዲስ ዩዘር ተፈጥሯል',
      'ተጠቃሚ',
      `Username: ${cleanUsername} -> ሚና: ${payload.role}`
    ),
  };
}

// =========================================================================
// Member Payment Submission & Vice-Chairperson / Leadership Authorization
// =========================================================================

export function submitMemberPayment(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    monthKey: string;
    type: ContributionType;
    amount: number;
    paymentMethod: PaymentMethod;
    bankName: string;
    referenceCode: string;
    receiptImageUrl?: string;
    notes?: string;
  }
): { nextDb: IddirDatabase; created: ContributionRecord } {
  if (!session.memberId) {
    throw new Error('ክፍያ ለመላክ መለያዎ ከአባልነት መዝገብ ጋር መገናኘት አለበት።');
  }
  const member = db.members.find((m) => m.id === session.memberId);
  if (!member) throw new Error('የአባልነት መዝገብዎ አልተገኘም።');
  if (!payload.referenceCode.trim() && !payload.receiptImageUrl) {
    throw new Error('እባክዎ የባንክ ደረሰኝ ፎቶ ያያይዙ ወይም የግብይት ማጣቀሻ ቁጥር ያስገቡ።');
  }

  const amount = Math.max(1, Number(payload.amount) || 0);
  const receiptNumber = `SUB-${new Date().getFullYear()}-${String(
    db.contributions.length + 101
  ).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const created: ContributionRecord = {
    id: generateId('con'),
    receiptNumber,
    memberId: member.id,
    memberCode: member.memberCode,
    memberName: member.fullName,
    monthKey: payload.monthKey,
    periodLabel: formatMonthLabelAm(payload.monthKey),
    type: payload.type,
    amount,
    paymentMethod: payload.paymentMethod,
    bankName: payload.bankName.trim(),
    referenceCode: payload.referenceCode.trim() || receiptNumber,
    receiptImageUrl: payload.receiptImageUrl,
    notes: payload.notes?.trim() || '',
    submittedByMember: true,
    authorizationStatus: 'pending',
    recordedByUid: session.userId,
    recordedByName: session.displayName,
    recordedAt: now,
  };

  return {
    created,
    nextDb: {
      ...db,
      contributions: [created, ...db.contributions],
      auditLogs: appendAuditLog(
        db,
        session,
        'አባል ክፍያና ደረሰኝ ልኳል',
        'ክፍያ',
        `${receiptNumber} · ${member.fullName} · ${amount} ብር (${created.periodLabel}) — የምክትል ሰብሳቢ አውቶራይዜሽን ይጠብቃል`
      ),
    },
  };
}

export function authorizeMemberPaymentByLeadership(
  db: IddirDatabase,
  session: AuthSession,
  contributionId: string,
  decision: Exclude<PaymentAuthorizationStatus, 'pending'>,
  rejectionReason?: string
): IddirDatabase {
  assertRole(
    session,
    ['vice_chairperson', 'chairperson', 'admin'],
    'የአባል ክፍያን አውቶራይዝ ማድረግ'
  );
  const target = db.contributions.find((c) => c.id === contributionId);
  if (!target) throw new Error('የክፍያ መዝገቡ አልተገኘም።');
  if (target.authorizationStatus !== 'pending') {
    throw new Error('ይህ ክፍያ ቀድሞ ውሳኔ ተሰጥቶበታል።');
  }

  const now = new Date().toISOString();
  const updatedContributions = db.contributions.map((c) =>
    c.id === contributionId
      ? {
          ...c,
          authorizationStatus: decision,
          authorizedByUid: session.userId,
          authorizedByName: session.displayName,
          authorizedAt: now,
          rejectionReason:
            decision === 'rejected' ? rejectionReason?.trim() || 'ደረሰኙ አልተረጋገጠም' : undefined,
        }
      : c
  );

  return {
    ...db,
    contributions: updatedContributions,
    auditLogs: appendAuditLog(
      db,
      session,
      decision === 'authorized'
        ? 'የአባል ክፍያ አውቶራይዝ ተደርጓል'
        : 'የአባል ክፍያ ውድቅ ተደርጓል',
      'ክፍያ',
      `${target.receiptNumber} · ${target.memberName} · ${target.amount} ብር (${target.periodLabel})`
    ),
  };
}

// =========================================================================
// Treasurer & Leadership Finance Mutations (Auditor is strictly read-only)
// =========================================================================

export function recordContributionByTreasurer(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    memberId: string;
    monthKey: string;
    type: ContributionType;
    amount: number;
    paymentMethod: PaymentMethod;
    bankName?: string;
    referenceCode: string;
    receiptImageUrl?: string;
    notes?: string;
  }
): { nextDb: IddirDatabase; created: ContributionRecord } {
  assertRole(session, ['treasurer', 'admin'], 'መዋጮ መመዝገብ');
  const member = db.members.find((m) => m.id === payload.memberId);
  if (!member) throw new Error('አባሉ አልተገኘም።');
  const amount = Math.max(1, Number(payload.amount) || 0);
  const receiptNumber = `RCP-${new Date().getFullYear()}-${String(
    db.contributions.length + 101
  ).padStart(4, '0')}`;
  const now = new Date().toISOString();
  const created: ContributionRecord = {
    id: generateId('con'),
    receiptNumber,
    memberId: member.id,
    memberCode: member.memberCode,
    memberName: member.fullName,
    monthKey: payload.monthKey,
    periodLabel: formatMonthLabelAm(payload.monthKey),
    type: payload.type,
    amount,
    paymentMethod: payload.paymentMethod,
    bankName: payload.bankName?.trim() || undefined,
    referenceCode: payload.referenceCode.trim() || receiptNumber,
    receiptImageUrl: payload.receiptImageUrl,
    notes: payload.notes?.trim() || '',
    submittedByMember: false,
    authorizationStatus: 'authorized',
    authorizedByUid: session.userId,
    authorizedByName: session.displayName,
    authorizedAt: now,
    recordedByUid: session.userId,
    recordedByName: session.displayName,
    recordedAt: now,
  };

  return {
    created,
    nextDb: {
      ...db,
      contributions: [created, ...db.contributions],
      auditLogs: appendAuditLog(
        db,
        session,
        'መዋጮ ተመዝግቧል',
        'ክፍያ',
        `${receiptNumber} · ${member.fullName} · ${amount} ብር (${created.periodLabel})`
      ),
    },
  };
}

export function recordManualJournalEntry(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    date: string;
    reference: string;
    description: string;
    lines: Array<{ accountCode: string; debit: number; credit: number }>;
  }
): IddirDatabase {
  assertRole(session, ['treasurer', 'admin'], 'የጆርናል መዝገብ መመዝገብ');
  const cleanLines: JournalLine[] = payload.lines
    .map((l) => {
      const acc = getAccountByCode(l.accountCode);
      return {
        accountCode: acc.code,
        accountNameAm: acc.nameAm,
        debit: Math.max(0, Number(l.debit) || 0),
        credit: Math.max(0, Number(l.credit) || 0),
      };
    })
    .filter((l) => l.debit > 0 || l.credit > 0);

  if (cleanLines.length < 2) {
    throw new Error('የጆርናል መዝገብ ቢያንስ 2 መስመሮች (ዴቢት እና ክሬዲት) ሊኖሩት ይገባል።');
  }
  const totalDr = cleanLines.reduce((s, l) => s + l.debit, 0);
  const totalCr = cleanLines.reduce((s, l) => s + l.credit, 0);
  if (totalDr <= 0 || Math.abs(totalDr - totalCr) > 0.01) {
    throw new Error('የጆርናል መዝገቡ ሚዛናዊ አይደለም (ጠቅላላ ዴቢት ከጠቅላላ ክሬዲት ጋር እኩል መሆን አለበት)።');
  }

  const entryNumber = `JRN-M-${String((db.manualJournalEntries?.length || 0) + 1).padStart(3, '0')}`;
  const created: JournalEntry = {
    id: generateId('jrn'),
    entryNumber,
    date: payload.date,
    reference: payload.reference.trim() || entryNumber,
    description: payload.description.trim(),
    sourceType: 'manual',
    lines: cleanLines,
    createdByName: session.displayName,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    manualJournalEntries: [created, ...(db.manualJournalEntries || [])],
    auditLogs: appendAuditLog(
      db,
      session,
      'የማስተካከያ ጆርናል ተመዝግቧል',
      'ሂሳብ',
      `${entryNumber} · ${created.description} · ${totalDr} ብር`
    ),
  };
}

export function recordExpenseByTreasurer(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    category: ExpenseCategory;
    title: string;
    description: string;
    beneficiaryName?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceCode?: string;
    expenseDate: string;
  }
): IddirDatabase {
  assertRole(session, ['treasurer', 'admin'], 'ወጪ መመዝገብ');
  const voucherNumber = `VCH-${new Date().getFullYear()}-${String(
    db.expenses.length + 1
  ).padStart(3, '0')}`;
  const amount = Math.max(1, Number(payload.amount) || 0);
  const created: ExpenseRecord = {
    id: generateId('exp'),
    voucherNumber,
    category: payload.category,
    title: payload.title.trim(),
    description: payload.description.trim(),
    beneficiaryName: payload.beneficiaryName?.trim() || '',
    amount,
    paymentMethod: payload.paymentMethod,
    referenceCode: payload.referenceCode?.trim() || voucherNumber,
    approvalStatus: 'pending',
    recordedByUid: session.userId,
    recordedByName: session.displayName,
    expenseDate: payload.expenseDate,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    expenses: [created, ...db.expenses],
    auditLogs: appendAuditLog(
      db,
      session,
      'የወጪ መዝገብ ቀርቧል',
      'ወጪ',
      `${voucherNumber} · ${created.title} · ${amount} ብር`
    ),
  };
}

export function approveExpenseByLeadership(
  db: IddirDatabase,
  session: AuthSession,
  expenseId: string,
  decision: Exclude<ApprovalStatus, 'pending'>
): IddirDatabase {
  assertRole(session, ['chairperson', 'vice_chairperson', 'admin'], 'ወጪ ማጽደቅ');
  const exp = db.expenses.find((e) => e.id === expenseId);
  if (!exp) throw new Error('የወጪ መዝገቡ አልተገኘም።');
  return {
    ...db,
    expenses: db.expenses.map((e) =>
      e.id === expenseId
        ? { ...e, approvalStatus: decision, approvedByName: session.displayName }
        : e
    ),
    auditLogs: appendAuditLog(
      db,
      session,
      decision === 'approved' ? 'ወጪ ጸድቋል' : 'ወጪ ውድቅ ተደርጓል',
      'ወጪ',
      `${exp.voucherNumber} (${exp.title}) — ${exp.amount} ብር`
    ),
  };
}

// =========================================================================
// Secretary & Leadership Minutes / Letters / Bylaws
// =========================================================================

export function createMinuteBySecretary(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    title: string;
    meetingDate: string;
    location: string;
    attendeesCount: number;
    agenda: string;
    minutesBody: string;
    decisions: string;
  }
): IddirDatabase {
  assertRole(session, ['secretary', 'chairperson', 'vice_chairperson', 'admin'], 'ቃለ-ጉባኤ መመዝገብ');
  const num = `ቃለ-ጉባኤ ቁ. ${String(db.minutes.length + 4).padStart(2, '0')}/2018`;
  const created: MeetingMinute = {
    id: generateId('min'),
    meetingNumber: num,
    title: payload.title.trim(),
    meetingDate: payload.meetingDate,
    location: payload.location.trim(),
    attendeesCount: Math.max(1, Number(payload.attendeesCount) || 1),
    agenda: payload.agenda.trim(),
    minutesBody: payload.minutesBody.trim(),
    decisions: payload.decisions.trim(),
    approvalStatus:
      session.role === 'chairperson' || session.role === 'vice_chairperson' ? 'approved' : 'pending',
    approvedByName:
      session.role === 'chairperson' || session.role === 'vice_chairperson'
        ? session.displayName
        : undefined,
    recordedByUid: session.userId,
    recordedByName: session.displayName,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    minutes: [created, ...db.minutes],
    auditLogs: appendAuditLog(
      db,
      session,
      'ቃለ-ጉባኤ ተመዝግቧል',
      'ስብሰባ',
      `${num} · ${created.title}`
    ),
  };
}

export function approveMinuteByLeadership(
  db: IddirDatabase,
  session: AuthSession,
  minuteId: string,
  decision: Exclude<ApprovalStatus, 'pending'>
): IddirDatabase {
  assertRole(session, ['chairperson', 'vice_chairperson', 'admin'], 'ቃለ-ጉባኤ ማጽደቅ');
  const target = db.minutes.find((m) => m.id === minuteId);
  if (!target) throw new Error('ቃለ-ጉባኤው አልተገኘም።');
  return {
    ...db,
    minutes: db.minutes.map((m) =>
      m.id === minuteId
        ? { ...m, approvalStatus: decision, approvedByName: session.displayName }
        : m
    ),
    auditLogs: appendAuditLog(
      db,
      session,
      decision === 'approved' ? 'ቃለ-ጉባኤ ጸድቋል' : 'ቃለ-ጉባኤ ተመልሷል',
      'ስብሰባ',
      `${target.meetingNumber} · ${target.title}`
    ),
  };
}

export function createLetterBySecretary(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    recipient: string;
    subject: string;
    body: string;
    memberId?: string;
  }
): IddirDatabase {
  assertRole(session, ['secretary', 'admin'], 'ደብዳቤ ማዘጋጀት');
  const letterNumber = `ዕድር/${String(db.letters.length + 14).padStart(3, '0')}/2018`;
  const created: OfficialLetter = {
    id: generateId('ltr'),
    letterNumber,
    recipient: payload.recipient.trim(),
    subject: payload.subject.trim(),
    body: payload.body.trim(),
    issueDate: new Date().toISOString().slice(0, 10),
    memberId: payload.memberId,
    issuedByName: session.displayName,
    createdAt: new Date().toISOString(),
  };
  return {
    ...db,
    letters: [created, ...db.letters],
    auditLogs: appendAuditLog(
      db,
      session,
      'ኦፊሴላዊ ደብዳቤ ተዘጋጅቷል',
      'ደብዳቤ',
      `${letterNumber} · ለ${created.recipient} (${created.subject})`
    ),
  };
}

// =========================================================================
// Announcements, Bereavement/Joy Notices & Inquiries (PR / Secretary / Leaders)
// =========================================================================

export function publishNotice(
  db: IddirDatabase,
  session: AuthSession,
  payload: {
    category: NoticeCategory;
    title: string;
    message: string;
    eventDate?: string;
    location?: string;
  }
): IddirDatabase {
  assertRole(
    session,
    ['public_relations', 'secretary', 'chairperson', 'vice_chairperson', 'admin'],
    'ማስታወቂያ / ጥሪ ማውጣት'
  );
  const created: AnnouncementNotice = {
    id: generateId('ann'),
    category: payload.category,
    title: payload.title.trim(),
    message: payload.message.trim(),
    eventDate: payload.eventDate?.trim() || '',
    location: payload.location?.trim() || '',
    approvalStatus: 'approved',
    authorUid: session.userId,
    authorName: session.displayName,
    authorRole: session.role,
    createdAt: new Date().toISOString(),
  };

  return {
    ...db,
    announcements: [created, ...db.announcements],
    auditLogs: appendAuditLog(
      db,
      session,
      'ማስታወቂያ ወጥቷል',
      'ማስታወቂያ',
      `${created.title}`
    ),
  };
}

export function deleteNotice(
  db: IddirDatabase,
  session: AuthSession,
  noticeId: string
): IddirDatabase {
  assertRole(
    session,
    ['public_relations', 'secretary', 'chairperson', 'vice_chairperson', 'admin'],
    'ማስታወቂያ መሰረዝ'
  );
  const target = db.announcements.find((a) => a.id === noticeId);
  return {
    ...db,
    announcements: db.announcements.filter((a) => a.id !== noticeId),
    auditLogs: appendAuditLog(
      db,
      session,
      'ማስታወቂያ ተሰርዟል',
      'ማስታወቂያ',
      target?.title || noticeId
    ),
  };
}

export function submitMemberInquiry(
  db: IddirDatabase,
  session: AuthSession,
  payload: { subject: string; message: string }
): IddirDatabase {
  const member = session.memberId
    ? db.members.find((m) => m.id === session.memberId)
    : undefined;
  const created: MemberInquiry = {
    id: generateId('inq'),
    memberId: member?.id || session.userId,
    memberName: member?.fullName || session.displayName,
    memberCode: member?.memberCode || session.username.toUpperCase(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  return {
    ...db,
    inquiries: [created, ...db.inquiries],
    auditLogs: appendAuditLog(
      db,
      session,
      'የአባል ጥያቄ ቀርቧል',
      'ጥያቄ',
      `${created.memberName} — ${created.subject}`
    ),
  };
}

export function respondToInquiryByPR(
  db: IddirDatabase,
  session: AuthSession,
  inquiryId: string,
  responseText: string
): IddirDatabase {
  assertRole(
    session,
    ['public_relations', 'chairperson', 'vice_chairperson', 'admin'],
    'ለአባል ጥያቄ ምላሽ መስጠት'
  );
  const target = db.inquiries.find((i) => i.id === inquiryId);
  return {
    ...db,
    inquiries: db.inquiries.map((i) =>
      i.id === inquiryId
        ? {
            ...i,
            status: 'responded',
            responseText: responseText.trim(),
            respondedByName: session.displayName,
          }
        : i
    ),
    auditLogs: appendAuditLog(
      db,
      session,
      'ለአባል ጥያቄ ምላሽ ተሰጥቷል',
      'ጥያቄ',
      target ? `${target.memberName}: ${target.subject}` : inquiryId
    ),
  };
}

// =========================================================================
// Committee Tasks & Bylaws
// =========================================================================

export function createCommitteeTask(
  db: IddirDatabase,
  session: AuthSession,
  payload: { title: string; description: string; assignedToName: string; dueDate: string }
): IddirDatabase {
  assertRole(session, ['chairperson', 'vice_chairperson', 'secretary', 'admin'], 'የኮሚቴ ተግባር መስጠት');
  const created: CommitteeTask = {
    id: generateId('tsk'),
    title: payload.title.trim(),
    description: payload.description.trim(),
    assignedRole: 'committee_member',
    assignedToName: payload.assignedToName.trim(),
    dueDate: payload.dueDate,
    status: 'todo',
    updatedAt: new Date().toISOString(),
  };
  return {
    ...db,
    tasks: [created, ...db.tasks],
    auditLogs: appendAuditLog(
      db,
      session,
      'የኮሚቴ ተግባር ተመድቧል',
      'ተግባር',
      `${created.title} (${created.assignedToName})`
    ),
  };
}

export function updateCommitteeTaskStatus(
  db: IddirDatabase,
  session: AuthSession,
  taskId: string,
  status: CommitteeTask['status']
): IddirDatabase {
  assertRole(
    session,
    ['committee_member', 'chairperson', 'vice_chairperson', 'secretary', 'admin'],
    'የኮሚቴ ተግባር ሁኔታ መቀየር'
  );
  const target = db.tasks.find((t) => t.id === taskId);
  return {
    ...db,
    tasks: db.tasks.map((t) =>
      t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t
    ),
    auditLogs: appendAuditLog(
      db,
      session,
      'የኮሚቴ ተግባር ተሻሽሏል',
      'ተግባር',
      `${target?.title || taskId} -> ${status}`
    ),
  };
}

export function upsertBylawRule(
  db: IddirDatabase,
  session: AuthSession,
  payload: { articleNumber: string; title: string; content: string }
): IddirDatabase {
  assertRole(session, ['chairperson', 'vice_chairperson', 'secretary', 'admin'], 'መተዳደሪያ ደንብ መጨመር');
  const created: BylawRule = {
    id: generateId('byl'),
    articleNumber: payload.articleNumber.trim(),
    title: payload.title.trim(),
    content: payload.content.trim(),
    updatedAt: new Date().toISOString(),
  };
  return {
    ...db,
    bylaws: [...db.bylaws, created],
    auditLogs: appendAuditLog(
      db,
      session,
      'የመተዳደሪያ ደንብ አንቀጽ ተጨምሯል',
      'ደንብ',
      `${created.articleNumber}: ${created.title}`
    ),
  };
}
