import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  CreditCard,
  IdCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  ShieldCheck,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  AnnouncementNotice,
  AppTab,
  ApprovalStatus,
  AuthSession,
  CommitteeTask,
  ContributionRecord,
  ContributionType,
  DependentInfo,
  ExpenseCategory,
  IddirDatabase,
  IddirMember,
  MemberStatus,
  NoticeCategory,
  PaymentAuthorizationStatus,
  PaymentMethod,
  ToastMessage,
  UserAccount,
  UserRole,
} from './types';
import {
  ASSOCIATION_SUBTITLE_AM,
  ROLE_LABELS_AM,
  SYSTEM_NAME_AM,
} from './i18n';
import { calculateMemberOutstandingBalance } from './services/accountingEngine';
import {
  ASSETS_IMG,
  INITIAL_ADMIN_PASSWORD,
  INITIAL_ADMIN_USERNAME,
  appendAuditLog,
  approveExpenseByLeadership,
  approveMinuteByLeadership,
  authenticateUser,
  authorizeMemberPaymentByLeadership,
  createCommitteeTask,
  createLetterBySecretary,
  createMinuteBySecretary,
  createOrUpdateUserByAdmin,
  deleteNotice,
  iddirProvider,
  publishNotice,
  recordContributionByTreasurer,
  recordExpenseByTreasurer,
  recordManualJournalEntry,
  respondToInquiryByPR,
  submitMemberInquiry,
  submitMemberPayment,
  toggleMemberStatusByAdmin,
  updateCommitteeTaskStatus,
  upsertBylawRule,
  upsertMemberByAdmin,
} from './services/iddirStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmModal } from './components/ConfirmModal';
import { DigitalIdCardModal } from './components/DigitalIdCardModal';
import { ReceiptPrintModal, type PrintableDocument } from './components/ReceiptPrintModal';
import { DashboardView } from './components/views/DashboardView';
import { MembersAdminView } from './components/views/MembersAdminView';
import { MyProfileView } from './components/views/MyProfileView';
import { FinanceAuditView } from './components/views/FinanceAuditView';
import { MeetingsTasksView } from './components/views/MeetingsTasksView';
import { AnnouncementsView } from './components/views/AnnouncementsView';
import { BylawsView } from './components/views/BylawsView';
import { AuditTrailView } from './components/views/AuditTrailView';

interface NavModule {
  id: AppTab;
  label: string;
  icon: typeof LayoutDashboard;
}

const ROLE_ALLOWED_TABS: Record<UserRole, AppTab[]> = {
  admin: ['dashboard', 'members', 'finance', 'meetings', 'announcements', 'bylaws', 'audit'],
  chairperson: ['dashboard', 'members', 'finance', 'meetings', 'announcements', 'bylaws', 'audit'],
  vice_chairperson: ['dashboard', 'members', 'finance', 'meetings', 'announcements', 'bylaws', 'audit'],
  treasurer: ['dashboard', 'finance', 'announcements', 'bylaws'],
  secretary: ['dashboard', 'members', 'meetings', 'announcements', 'bylaws'],
  auditor: ['dashboard', 'finance', 'audit', 'announcements', 'bylaws'],
  public_relations: ['dashboard', 'announcements', 'bylaws'],
  committee_member: ['dashboard', 'meetings', 'announcements', 'bylaws'],
  member: ['dashboard', 'my_profile', 'announcements', 'bylaws'],
};

function getTabLabel(tab: AppTab, role: UserRole): string {
  switch (tab) {
    case 'dashboard':
      return 'ዋና ገጽ';
    case 'members':
      return role === 'admin' ? 'አባላት እና ዩዘሮች' : 'የአባላት ማውጫ';
    case 'my_profile':
      return 'የእኔ ፕሮፋይል እና ክፍያ';
    case 'finance':
      return role === 'auditor' ? 'ኦዲት እና ፋይናንስ' : 'ፋይናንስ እና መዋጮ';
    case 'meetings':
      return role === 'committee_member' ? 'ቃለ-ጉባኤ እና ተግባራት' : 'ቃለ-ጉባኤ እና ደብዳቤ';
    case 'announcements':
      return 'ማስታወቂያዎች';
    case 'bylaws':
      return 'መተዳደሪያ ደንብ';
    case 'audit':
      return 'የክትትል መዝገብ';
  }
}

function getTabIcon(tab: AppTab) {
  switch (tab) {
    case 'dashboard':
      return LayoutDashboard;
    case 'members':
      return Users;
    case 'my_profile':
      return UserIcon;
    case 'finance':
      return CreditCard;
    case 'meetings':
      return Calendar;
    case 'announcements':
      return Megaphone;
    case 'bylaws':
      return BookOpen;
    case 'audit':
      return ShieldCheck;
  }
}

function MainApp() {
  const [db, setDb] = useState<IddirDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  // Minimal Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Modals & Toasts
  const [idCardMember, setIdCardMember] = useState<IddirMember | null>(null);
  const [printableDoc, setPrintableDoc] = useState<PrintableDocument | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'አረጋግጥ',
    onConfirm: () => {},
  });

  useEffect(() => {
    let mounted = true;
    iddirProvider
      .load()
      .then((loaded) => {
        if (mounted) {
          setDb(loaded);
          setLoadingDb(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingDb(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function pushToast(type: ToastMessage['type'], text: string) {
    const id = `tst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  async function commitDb(nextDb: IddirDatabase, successMessage?: string) {
    setDb(nextDb);
    await iddirProvider.save(nextDb);
    if (successMessage) {
      pushToast('success', successMessage);
    }
  }

  function runGuarded(fn: (currentDb: IddirDatabase, currentSession: AuthSession) => {
    nextDb: IddirDatabase;
    message?: string;
  }) {
    if (!db || !session) return false;
    try {
      const { nextDb, message } = fn(db, session);
      void commitDb(nextDb, message);
      return true;
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'ተግባሩን ማከናወን አልተቻለም።');
      return false;
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const authSession = await authenticateUser(db, loginUsername, loginPassword);
      setSession(authSession);
      setActiveTab('dashboard');
      setLoginPassword('');
      pushToast(
        'success',
        `እንኳን ደህና መጡ፣ ${authSession.displayName} (${ROLE_LABELS_AM[authSession.role]})`
      );
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'መግባት አልተቻለም።');
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setActiveTab('dashboard');
    setIdCardMember(null);
    setPrintableDoc(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
  }

  const allowedTabs = useMemo<NavModule[]>(() => {
    if (!session) return [];
    return ROLE_ALLOWED_TABS[session.role].map((id) => ({
      id,
      label: getTabLabel(id, session.role),
      icon: getTabIcon(id),
    }));
  }, [session]);

  const effectiveTab: AppTab = useMemo(() => {
    if (!session) return 'dashboard';
    const allowed = ROLE_ALLOWED_TABS[session.role];
    return allowed.includes(activeTab) ? activeTab : 'dashboard';
  }, [session, activeTab]);

  const ownMember = useMemo(() => {
    if (!db || !session?.memberId) return undefined;
    return db.members.find((m) => m.id === session.memberId);
  }, [db, session]);

  const ownOutstanding = useMemo(() => {
    if (!db || !ownMember) return null;
    return calculateMemberOutstandingBalance(db, ownMember);
  }, [db, ownMember]);

  if (loadingDb || !db) {
    return (
      <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E2E6E1] rounded-xl px-6 py-5 text-sm text-[#4B5563]">
          የዕድር አስተዳደር ሲስተም በመጫን ላይ ነው...
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. Minimal Login Screen (Only Username, Password, and Login button)
  // =========================================================================
  if (!session) {
    return (
      <div className="min-h-screen bg-[#F7F8F6] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E2E6E1] rounded-2xl p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <img
              src={ASSETS_IMG.emblem}
              alt={ASSOCIATION_SUBTITLE_AM}
              className="w-16 h-16 rounded-xl object-cover border border-[#E2E6E1]"
            />
            <div>
              <h1 className="text-xl font-bold text-[#111815]">{SYSTEM_NAME_AM}</h1>
              <p className="text-xs text-[#14532D] font-medium mt-0.5">
                {db.associationName}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-[#374151] mb-1.5"
              >
                የተጠቃሚ ስም
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="የተጠቃሚ ስምዎን ያስገቡ"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-[#374151] mb-1.5"
              >
                የይለፍ ቃል
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="የይለፍ ቃልዎን ያስገቡ"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            {loginError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs rounded-lg px-3.5 py-2.5">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {loggingIn ? 'በማረጋገጥ ላይ...' : 'ግባ'}
            </button>
          </form>

          {/* Small non-intrusive dev/setup hint */}
          <p className="text-[11px] text-center text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
            የመጀመሪያ የአድሚን መግቢያ (ለሙከራ): የተጠቃሚ ስም{' '}
            <span className="font-mono-tabular font-semibold text-[#374151]">
              {INITIAL_ADMIN_USERNAME}
            </span>{' '}
            · የይለፍ ቃል{' '}
            <span className="font-mono-tabular font-semibold text-[#374151]">
              {INITIAL_ADMIN_PASSWORD}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. Authenticated Workspace with Horizontal Module Bar & Strict RBAC
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#111815] flex flex-col">
      {/* Top Header */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-[#E2E6E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={ASSETS_IMG.emblem}
              alt={db.associationName}
              className="w-9 h-9 rounded-lg object-cover border border-[#E2E6E1] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111815] truncate">{SYSTEM_NAME_AM}</p>
              <p className="text-[11px] text-[#4B5563] truncate">{db.associationName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-[#111815]">{session.displayName}</p>
              <p className="text-[11px] font-medium text-[#14532D]">
                {ROLE_LABELS_AM[session.role]}
              </p>
            </div>

            {ownMember && (
              <button
                type="button"
                onClick={() => setIdCardMember(ownMember)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
              >
                <IdCard className="w-3.5 h-3.5 text-[#14532D]" />
                <span className="hidden md:inline">የእኔ መታወቂያ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#DC2626]/30 text-[#DC2626] bg-white rounded-lg hover:bg-[#FEF2F2] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              ውጣ
            </button>
          </div>
        </div>

        {/* Horizontal Module Bar */}
        <nav
          aria-label="ዋና ሞጁሎች"
          className="border-t border-[#E5E7EB] bg-[#F9FAFB] overflow-x-auto"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 py-2">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = effectiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#14532D] text-white'
                      : 'text-[#374151] hover:bg-white hover:text-[#111815]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {effectiveTab === 'dashboard' && (
          <DashboardView
            session={session}
            db={db}
            ownMember={ownMember}
            ownOutstanding={ownOutstanding}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenIdCard={(m) => setIdCardMember(m)}
            onAuthorizeMemberPayment={(
              contributionId,
              decision: Exclude<PaymentAuthorizationStatus, 'pending'>
            ) =>
              runGuarded((curr, sess) => ({
                nextDb: authorizeMemberPaymentByLeadership(curr, sess, contributionId, decision),
                message:
                  decision === 'authorized'
                    ? 'የአባሉ ክፍያ አውቶራይዝ ተደርጎ ወደ ሂሳብ መዝገብ ገብቷል።'
                    : 'የአባሉ ክፍያ ውድቅ ተደርጓል።',
              }))
            }
            onApproveExpense={(expenseId, decision: Exclude<ApprovalStatus, 'pending'>) =>
              runGuarded((curr, sess) => ({
                nextDb: approveExpenseByLeadership(curr, sess, expenseId, decision),
                message:
                  decision === 'approved' ? 'ወጪው በተሳካ ሁኔታ ጸድቋል።' : 'ወጪው ውድቅ ተደርጓል።',
              }))
            }
            onApproveMinute={(minuteId, decision: Exclude<ApprovalStatus, 'pending'>) =>
              runGuarded((curr, sess) => ({
                nextDb: approveMinuteByLeadership(curr, sess, minuteId, decision),
                message:
                  decision === 'approved' ? 'ቃለ-ጉባኤው ጸድቋል።' : 'ቃለ-ጉባኤው እንዲስተካከል ተመልሷል።',
              }))
            }
            onPrintDocument={(doc) => setPrintableDoc(doc)}
          />
        )}

        {effectiveTab === 'members' &&
          (session.role === 'admin' ||
            session.role === 'chairperson' ||
            session.role === 'vice_chairperson' ||
            session.role === 'secretary') && (
            <MembersAdminView
              session={session}
              db={db}
              onUpsertMember={(payload: {
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
              }) =>
                runGuarded((curr, sess) => ({
                  nextDb: upsertMemberByAdmin(curr, sess, payload),
                  message: payload.id
                    ? 'የአባል መረጃ ተሻሽሏል።'
                    : 'አዲስ አባል በተሳካ ሁኔታ ተመዝግቧል።',
                }))
              }
              onRequestToggleMemberStatus={(member, nextStatus) =>
                setConfirmState({
                  open: true,
                  title:
                    nextStatus === 'suspended' ? 'አባልን ማገድ ያረጋግጡ' : 'አባልን መልሶ ማንቃት ያረጋግጡ',
                  description: `${member.fullName} (${member.memberCode}) ሁኔታ ወደ «${
                    nextStatus === 'suspended' ? 'የታገደ' : 'ንቁ አባል'
                  }» ይቀየራል።`,
                  confirmLabel: nextStatus === 'suspended' ? 'አግድ' : 'አንቃ',
                  danger: nextStatus === 'suspended',
                  onConfirm: () => {
                    setConfirmState((prev) => ({ ...prev, open: false }));
                    runGuarded((curr, sess) => ({
                      nextDb: toggleMemberStatusByAdmin(curr, sess, member.id, nextStatus),
                      message:
                        nextStatus === 'suspended' ? 'አባሉ ታግዷል።' : 'አባሉ እንደገና ነቅቷል።',
                    }));
                  },
                })
              }
              onSaveUserAccount={async (payload) => {
                if (!db || !session) return false;
                try {
                  const nextDb = await createOrUpdateUserByAdmin(db, session, payload);
                  await commitDb(
                    nextDb,
                    payload.userId
                      ? 'የተጠቃሚ መለያ እና ሚና ተዘምኗል።'
                      : 'አዲስ የተጠቃሚ መለያ ተፈጥሯል።'
                  );
                  return true;
                } catch (err) {
                  pushToast(
                    'error',
                    err instanceof Error ? err.message : 'የተጠቃሚ መለያውን ማስቀመጥ አልተቻለም።'
                  );
                  return false;
                }
              }}
              onRequestToggleUserActive={(user: UserAccount, nextActive: boolean) =>
                setConfirmState({
                  open: true,
                  title: nextActive ? 'ዩዘር ማንቃት' : 'ዩዘር ማገድ',
                  description: `@${user.username} (${user.displayName}) መግቢያ ${
                    nextActive ? 'እንዲነቃ' : 'እንዲታገድ'
                  } እርግጠኛ ነዎት?`,
                  confirmLabel: nextActive ? 'አንቃ' : 'አግድ',
                  danger: !nextActive,
                  onConfirm: async () => {
                    setConfirmState((prev) => ({ ...prev, open: false }));
                    if (!db || !session) return;
                    try {
                      const nextDb = await createOrUpdateUserByAdmin(db, session, {
                        userId: user.id,
                        username: user.username,
                        role: user.role,
                        memberId: user.memberId,
                        displayName: user.displayName,
                        active: nextActive,
                      });
                      await commitDb(
                        nextDb,
                        nextActive ? 'ዩዘሩ ነቅቷል።' : 'ዩዘሩ ታግዷል።'
                      );
                    } catch (err) {
                      pushToast(
                        'error',
                        err instanceof Error ? err.message : 'ተግባሩን ማከናወን አልተቻለም።'
                      );
                    }
                  },
                })
              }
              onRequestResetDemoData={() =>
                setConfirmState({
                  open: true,
                  title: 'የናሙና መረጃን ወደ መነሻ መመለስ',
                  description:
                    'ሁሉም የአባላት፣ የክፍያ እና የተጠቃሚ ለውጦች ወደ መጀመሪያው የሙከራ መረጃ ይመለሳሉ። ይቀጥሉ?',
                  confirmLabel: 'መረጃውን መልስ',
                  danger: true,
                  onConfirm: async () => {
                    setConfirmState((prev) => ({ ...prev, open: false }));
                    const resetDb = await iddirProvider.reset();
                    setDb(resetDb);
                    pushToast('info', 'የሲስተሙ መረጃ ወደ መነሻው ተመልሷል።');
                  },
                })
              }
              onOpenIdCard={(m) => setIdCardMember(m)}
            />
          )}

        {effectiveTab === 'my_profile' && session.role === 'member' && (
          <MyProfileView
            member={ownMember}
            ownContributions={
              ownMember ? db.contributions.filter((c) => c.memberId === ownMember.id) : []
            }
            outstanding={ownOutstanding}
            onSubmitPayment={(payload) => {
              if (!db || !session) return null;
              try {
                const { nextDb, created } = submitMemberPayment(db, session, payload);
                void commitDb(
                  nextDb,
                  `ክፍያዎ (${created.receiptNumber}) ለምክትል ሰብሳቢ አውቶራይዜሽን ተልኳል።`
                );
                return created;
              } catch (err) {
                pushToast(
                  'error',
                  err instanceof Error ? err.message : 'ክፍያውን መላክ አልተቻለም።'
                );
                return null;
              }
            }}
            onOpenIdCard={(m) => setIdCardMember(m)}
            onPrintDocument={(doc) => setPrintableDoc(doc)}
          />
        )}

        {effectiveTab === 'finance' &&
          (session.role === 'admin' ||
            session.role === 'chairperson' ||
            session.role === 'vice_chairperson' ||
            session.role === 'treasurer' ||
            session.role === 'auditor') && (
            <FinanceAuditView
              session={session}
              db={db}
              onRecordContribution={(payload: {
                memberId: string;
                monthKey: string;
                type: ContributionType;
                amount: number;
                paymentMethod: PaymentMethod;
                bankName?: string;
                referenceCode: string;
                notes?: string;
              }) => {
                if (!db || !session) return null;
                try {
                  const { nextDb, created } = recordContributionByTreasurer(db, session, payload);
                  void commitDb(nextDb, `የክፍያ ደረሰኝ ${created.receiptNumber} ተመዝግቧል።`);
                  return created;
                } catch (err) {
                  pushToast('error', err instanceof Error ? err.message : 'ክፍያውን መመዝገብ አልተቻለም።');
                  return null;
                }
              }}
              onAuthorizeMemberPayment={(contributionId, decision, rejectionReason) =>
                runGuarded((curr, sess) => ({
                  nextDb: authorizeMemberPaymentByLeadership(
                    curr,
                    sess,
                    contributionId,
                    decision,
                    rejectionReason
                  ),
                  message:
                    decision === 'authorized'
                      ? 'የአባሉ ክፍያ አውቶራይዝ ተደርጎ ወደ ጆርናልና ሌጀር ገብቷል።'
                      : 'የአባሉ ክፍያ ውድቅ ተደርጓል።',
                }))
              }
              onRecordExpense={(payload: {
                category: ExpenseCategory;
                title: string;
                description: string;
                beneficiaryName?: string;
                amount: number;
                paymentMethod: PaymentMethod;
                referenceCode?: string;
                expenseDate: string;
              }) =>
                runGuarded((curr, sess) => ({
                  nextDb: recordExpenseByTreasurer(curr, sess, payload),
                  message: 'የወጪ ጥያቄው ለአመራር ማጽደቂያ ቀርቧል።',
                }))
              }
              onApproveExpense={(expenseId, decision) =>
                runGuarded((curr, sess) => ({
                  nextDb: approveExpenseByLeadership(curr, sess, expenseId, decision),
                  message:
                    decision === 'approved' ? 'ወጪው ጸድቋል።' : 'ወጪው ውድቅ ተደርጓል።',
                }))
              }
              onRecordManualJournal={(payload) =>
                runGuarded((curr, sess) => ({
                  nextDb: recordManualJournalEntry(curr, sess, payload),
                  message: 'የማስተካከያ ጆርናል መዝገብ ተመዝግቧል።',
                }))
              }
              onPrintDocument={(doc) => setPrintableDoc(doc)}
            />
          )}

        {effectiveTab === 'meetings' &&
          (session.role === 'admin' ||
            session.role === 'chairperson' ||
            session.role === 'vice_chairperson' ||
            session.role === 'secretary' ||
            session.role === 'committee_member') && (
            <MeetingsTasksView
              session={session}
              db={db}
              onCreateMinute={(payload) =>
                runGuarded((curr, sess) => ({
                  nextDb: createMinuteBySecretary(curr, sess, payload),
                  message: 'ቃለ-ጉባኤው ተመዝግቧል።',
                }))
              }
              onApproveMinute={(minuteId, decision) =>
                runGuarded((curr, sess) => ({
                  nextDb: approveMinuteByLeadership(curr, sess, minuteId, decision),
                  message:
                    decision === 'approved' ? 'ቃለ-ጉባኤው ጸድቋል።' : 'ቃለ-ጉባኤው ተመልሷል።',
                }))
              }
              onCreateLetter={(payload) =>
                runGuarded((curr, sess) => ({
                  nextDb: createLetterBySecretary(curr, sess, payload),
                  message: 'ኦፊሴላዊ ደብዳቤው ተዘጋጅቷል።',
                }))
              }
              onCreateTask={(payload) =>
                runGuarded((curr, sess) => ({
                  nextDb: createCommitteeTask(curr, sess, payload),
                  message: 'የኮሚቴ ተግባር ተመድቧል።',
                }))
              }
              onUpdateTaskStatus={(taskId, status: CommitteeTask['status']) =>
                runGuarded((curr, sess) => ({
                  nextDb: updateCommitteeTaskStatus(curr, sess, taskId, status),
                  message: 'የተግባሩ ሁኔታ ተዘምኗል።',
                }))
              }
              onPrintDocument={(doc) => setPrintableDoc(doc)}
            />
          )}

        {effectiveTab === 'announcements' && (
          <AnnouncementsView
            session={session}
            db={db}
            onPublishNotice={(payload: {
              category: NoticeCategory;
              title: string;
              message: string;
              eventDate?: string;
              location?: string;
            }) =>
              runGuarded((curr, sess) => ({
                nextDb: publishNotice(curr, sess, payload),
                message: 'ማስታወቂያው ለአባላት ተለቋል።',
              }))
            }
            onRequestDeleteNotice={(notice: AnnouncementNotice) =>
              setConfirmState({
                open: true,
                title: 'ማስታወቂያ መሰረዝ',
                description: `«${notice.title}» የሚለውን ማስታወቂያ ለመሰረዝ እርግጠኛ ነዎት?`,
                confirmLabel: 'ሰርዝ',
                danger: true,
                onConfirm: () => {
                  setConfirmState((prev) => ({ ...prev, open: false }));
                  runGuarded((curr, sess) => ({
                    nextDb: deleteNotice(curr, sess, notice.id),
                    message: 'ማስታወቂያው ተሰርዟል።',
                  }));
                },
              })
            }
            onSubmitInquiry={(payload) =>
              runGuarded((curr, sess) => ({
                nextDb: submitMemberInquiry(curr, sess, payload),
                message: 'ጥያቄዎ ለህዝብ ግንኙነት ተልኳል።',
              }))
            }
            onRespondInquiry={(inquiryId, responseText) =>
              runGuarded((curr, sess) => ({
                nextDb: respondToInquiryByPR(curr, sess, inquiryId, responseText),
                message: 'ለጥያቄው ይፋዊ ምላሽ ተልኳል።',
              }))
            }
          />
        )}

        {effectiveTab === 'bylaws' && (
          <BylawsView
            session={session}
            bylaws={db.bylaws}
            onAddBylaw={(payload) =>
              runGuarded((curr, sess) => ({
                nextDb: upsertBylawRule(curr, sess, payload),
                message: 'አዲስ የመተዳደሪያ ደንብ አንቀጽ ተጨምሯል።',
              }))
            }
          />
        )}

        {effectiveTab === 'audit' &&
          (session.role === 'admin' ||
            session.role === 'auditor' ||
            session.role === 'chairperson' ||
            session.role === 'vice_chairperson') && (
            <AuditTrailView auditLogs={db.auditLogs} />
          )}
      </main>

      {/* Printable Modals */}
      {idCardMember && (
        <DigitalIdCardModal
          member={idCardMember}
          canEditPhoto={session.role === 'admin'}
          onUpdatePhoto={(memberId, photoDataUrl) => {
            runGuarded((curr, sess) => {
              const updatedMembers = curr.members.map((m) =>
                m.id === memberId
                  ? { ...m, photoUrl: photoDataUrl, updatedAt: new Date().toISOString() }
                  : m
              );
              const target = curr.members.find((m) => m.id === memberId);
              const nextDb: IddirDatabase = {
                ...curr,
                members: updatedMembers,
                auditLogs: appendAuditLog(
                  curr,
                  sess,
                  'የመታወቂያ ፎቶ ተዘምኗል',
                  'አባል',
                  target ? `${target.memberCode} (${target.fullName})` : memberId
                ),
              };
              return { nextDb, message: 'የመታወቂያ ፎቶ ተቀምጧል።' };
            });
            setIdCardMember((prev) =>
              prev && prev.id === memberId ? { ...prev, photoUrl: photoDataUrl } : prev
            );
          }}
          onClose={() => setIdCardMember(null)}
        />
      )}

      <ReceiptPrintModal
        documentData={printableDoc}
        onClose={() => setPrintableDoc(null)}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="no-print fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`bg-white border rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2.5 shadow-sm ${
                toast.type === 'error'
                  ? 'border-[#DC2626]/40 text-[#B91C1C]'
                  : 'border-[#14532D]/30 text-[#14532D]'
              }`}
            >
              {toast.type === 'error' ? (
                <XCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
              )}
              <span>{toast.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
