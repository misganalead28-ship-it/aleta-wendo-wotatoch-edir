import { useMemo, useState } from 'react';
import {
  Camera,
  Download,
  Edit3,
  IdCard,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import type {
  AuthSession,
  DependentInfo,
  IddirDatabase,
  IddirMember,
  MemberStatus,
  UserAccount,
  UserRole,
} from '../../types';
import {
  ALL_ROLES,
  MEMBER_STATUS_AM,
  RELATIONSHIP_AM,
  ROLE_LABELS_AM,
  formatCurrencyETB,
  formatMonthLabelAm,
  getCurrentMonthKey,
} from '../../i18n';
import { ASSETS_IMG } from '../../services/iddirStore';
import {
  clampStr,
  compressImageFile,
  exportRowsToCsv,
  isSafeImageUrl,
  LIMITS,
} from '../../utils/validation';

interface Props {
  session: AuthSession;
  db: IddirDatabase;
  onUpsertMember: (payload: {
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
  }) => void;
  onRequestToggleMemberStatus: (member: IddirMember, nextStatus: MemberStatus) => void;
  onSaveUserAccount: (payload: {
    userId?: string;
    username: string;
    password?: string;
    role: UserRole;
    memberId?: string;
    displayName: string;
    active: boolean;
  }) => Promise<boolean>;
  onRequestToggleUserActive: (user: UserAccount, nextActive: boolean) => void;
  onRequestResetDemoData: () => void;
  onOpenIdCard: (member: IddirMember) => void;
}

export function MembersAdminView({
  session,
  db,
  onUpsertMember,
  onRequestToggleMemberStatus,
  onSaveUserAccount,
  onRequestToggleUserActive,
  onRequestResetDemoData,
  onOpenIdCard,
}: Props) {
  const isAdmin = session.role === 'admin';
  const currentMonth = getCurrentMonthKey();

  const [subTab, setSubTab] = useState<'members' | 'users'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Member Form State
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | undefined>(undefined);
  const [mCode, setMCode] = useState('');
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('+2519');
  const [mSubCity, setMSubCity] = useState('አለታ ወንዶ');
  const [mKebele, setMKebele] = useState('ቀበሌ 01');
  const [mAddressNote, setMAddressNote] = useState('');
  const [mJoinDate, setMJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [mStatus, setMStatus] = useState<MemberStatus>('active');
  const [mDuesRate, setMDuesRate] = useState(String(db.monthlyDuesAmount));
  const [mGuarantor, setMGuarantor] = useState('');
  const [mPhotoUrl, setMPhotoUrl] = useState('');
  const [mDependents, setMDependents] = useState<DependentInfo[]>([]);
  const [photoUploadErr, setPhotoUploadErr] = useState('');

  // User Credential Form State (Admin-only)
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | undefined>(undefined);
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('member');
  const [uMemberId, setUMemberId] = useState('');
  const [uDisplayName, setUDisplayName] = useState('');
  const [uActive, setUActive] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  const paidMemberIdsThisMonth = useMemo(() => {
    return new Set(
      db.contributions
        .filter((c) => c.monthKey === currentMonth && c.type === 'monthly')
        .map((c) => c.memberId)
    );
  }, [db.contributions, currentMonth]);

  const userByMemberId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    db.users.forEach((u) => {
      if (u.memberId) map.set(u.memberId, u);
    });
    return map;
  }, [db.users]);

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return db.members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      const isPaid = paidMemberIdsThisMonth.has(m.id);
      if (paymentFilter === 'paid' && !isPaid) return false;
      if (paymentFilter === 'unpaid' && isPaid) return false;
      if (!q) return true;
      const linkedUser = userByMemberId.get(m.id);
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.kebele.toLowerCase().includes(q) ||
        (linkedUser?.username.toLowerCase().includes(q) ?? false)
      );
    });
  }, [db.members, searchTerm, statusFilter, paymentFilter, paidMemberIdsThisMonth, userByMemberId]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return db.users.filter((u) => {
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        ROLE_LABELS_AM[u.role].toLowerCase().includes(q)
      );
    });
  }, [db.users, searchTerm]);

  function openNewMemberForm() {
    setEditingMemberId(undefined);
    setMCode(`EDR-2026-${String(db.members.length + 1).padStart(3, '0')}`);
    setMName('');
    setMPhone('+2519');
    setMSubCity('አለታ ወንዶ');
    setMKebele('ቀበሌ 01');
    setMAddressNote('');
    setMJoinDate(new Date().toISOString().slice(0, 10));
    setMStatus('active');
    setMDuesRate(String(db.monthlyDuesAmount));
    setMGuarantor('');
    setMPhotoUrl('');
    setMDependents([]);
    setPhotoUploadErr('');
    setShowMemberForm(true);
  }

  function openEditMemberForm(m: IddirMember) {
    setEditingMemberId(m.id);
    setMCode(m.memberCode);
    setMName(m.fullName);
    setMPhone(m.phone);
    setMSubCity(m.subCity);
    setMKebele(m.kebele);
    setMAddressNote(m.addressNote || '');
    setMJoinDate(m.joinDate);
    setMStatus(m.status);
    setMDuesRate(String(m.monthlyDuesRate));
    setMGuarantor(m.guarantorName || '');
    setMPhotoUrl(m.photoUrl || '');
    setMDependents(m.dependents || []);
    setPhotoUploadErr('');
    setShowMemberForm(true);
  }

  async function handleMemberPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploadErr('');
    try {
      const compressed = await compressImageFile(file, 160000, 512);
      setMPhotoUrl(clampStr(compressed, LIMITS.photoUrlMax));
    } catch {
      setPhotoUploadErr('የተመረጠውን ፎቶ ማስተካከል አልተቻለም። እባክዎ አነስ ያለ ፎቶ ይምረጡ።');
    }
  }

  function addDependentRow() {
    setMDependents((prev) => [
      ...prev,
      {
        id: `dep_${Date.now().toString(36)}_${prev.length}`,
        fullName: '',
        relationship: 'child',
        age: 10,
      },
    ]);
  }

  function updateDependentRow(id: string, patch: Partial<DependentInfo>) {
    setMDependents((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDependentRow(id: string) {
    setMDependents((prev) => prev.filter((d) => d.id !== id));
  }

  function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mName.trim() || !mCode.trim()) return;
    const validDependents = mDependents
      .filter((d) => d.fullName.trim().length > 0)
      .map((d) => ({ ...d, fullName: d.fullName.trim(), age: Math.max(0, Number(d.age) || 0) }));
    onUpsertMember({
      id: editingMemberId,
      memberCode: mCode,
      fullName: mName,
      phone: mPhone,
      subCity: mSubCity,
      kebele: mKebele,
      addressNote: mAddressNote,
      joinDate: mJoinDate,
      status: mStatus,
      monthlyDuesRate: Number(mDuesRate) || db.monthlyDuesAmount,
      guarantorName: mGuarantor,
      photoUrl: mPhotoUrl || undefined,
      dependents: validDependents,
    });
    setShowMemberForm(false);
  }

  function openNewUserForm(preselectMember?: IddirMember) {
    setEditingUserId(undefined);
    setUUsername(
      preselectMember
        ? preselectMember.memberCode.toLowerCase().replace(/[^a-z0-9]/g, '')
        : ''
    );
    setUPassword('');
    setURole('member');
    setUMemberId(preselectMember?.id || '');
    setUDisplayName(preselectMember?.fullName || '');
    setUActive(true);
    setSubTab('users');
    setShowUserForm(true);
  }

  function openEditUserForm(u: UserAccount) {
    setEditingUserId(u.id);
    setUUsername(u.username);
    setUPassword('');
    setURole(u.role);
    setUMemberId(u.memberId || '');
    setUDisplayName(u.displayName);
    setUActive(u.active);
    setSubTab('users');
    setShowUserForm(true);
  }

  async function handleUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingUser(true);
    try {
      const ok = await onSaveUserAccount({
        userId: editingUserId,
        username: uUsername,
        password: uPassword,
        role: uRole,
        memberId: uMemberId || undefined,
        displayName: uDisplayName,
        active: uActive,
      });
      if (ok) {
        setShowUserForm(false);
        setUPassword('');
      }
    } finally {
      setSavingUser(false);
    }
  }

  function handleExportMembersCsv() {
    exportRowsToCsv(
      `iddir-members-${new Date().toISOString().slice(0, 10)}.csv`,
      ['መለያ ቁጥር', 'ሙሉ ስም', 'ስልክ', 'አድራሻ', 'የመግቢያ ቀን', 'ሁኔታ', 'የቤተሰብ ብዛት', 'የወሩ ክፍያ'],
      filteredMembers.map((m) => [
        m.memberCode,
        m.fullName,
        m.phone,
        `${m.subCity} ${m.kebele}`,
        m.joinDate,
        MEMBER_STATUS_AM[m.status],
        m.dependents.length,
        paidMemberIdsThisMonth.has(m.id) ? 'ተከፍሏል' : 'አልተከፈለም',
      ])
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action & Sub-Navigation Card */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#111815] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#14532D]" />
              {isAdmin ? 'የአባላት፣ የዩዘር መለያ እና የስልጣን ሚና አስተዳደር' : 'የዕድር አባላት ማውጫ'}
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              {isAdmin
                ? 'አባላትን ይመዝግቡ፣ የቤተሰብ ተጠቃሚዎችን ያስተካክሉ፣ እና ለአባላትና ለኮሚቴ አባላት የመግቢያ ዩዘርና ሚና ይመድቡ።'
                : 'የተመዘገቡ አባላትን ዝርዝር፣ የወሩን የመዋጮ ሁኔታ እና ዲጂታል መታወቂያ ይመልከቱ።'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('members');
                    openNewMemberForm();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  አዲስ አባል መዝግብ
                </button>
                <button
                  type="button"
                  onClick={() => openNewUserForm()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#14532D] text-[#14532D] bg-white rounded-lg hover:bg-[#F0FDF4]"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  አዲስ ዩዘር ፍጠር
                </button>
                <button
                  type="button"
                  onClick={onRequestResetDemoData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#D1D5DB] text-[#4B5563] bg-white rounded-lg hover:bg-[#F9FAFB]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  የናሙና መረጃን መልስ
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleExportMembersCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
            >
              <Download className="w-3.5 h-3.5" />
              CSV አውርድ
            </button>
          </div>
        </div>

        {/* Sub-Tabs for Admin vs Leadership */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('members')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                subTab === 'members'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              የአባላት ዝርዝር ({db.members.length})
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSubTab('users')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  subTab === 'users'
                    ? 'bg-[#14532D] text-white border-[#14532D]'
                    : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
                }`}
              >
                የተጠቃሚ መለያዎች እና ሚናዎች ({db.users.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="በስም፣ በስልክ፣ በመለያ ቁጥር ወይም በዩዘር ስም ፈልግ..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            {subTab === 'members' && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')
                  }
                  className="px-2.5 py-1.5 text-xs border border-[#D1D5DB] rounded-lg bg-white"
                >
                  <option value="all">ሁሉም ሁኔታ</option>
                  <option value="active">ንቁ አባላት</option>
                  <option value="suspended">የታገዱ አባላት</option>
                </select>
                <select
                  value={paymentFilter}
                  onChange={(e) =>
                    setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')
                  }
                  className="px-2.5 py-1.5 text-xs border border-[#D1D5DB] rounded-lg bg-white"
                >
                  <option value="all">የ{formatMonthLabelAm(currentMonth)} ክፍያ: ሁሉም</option>
                  <option value="paid">የወሩን የከፈሉ</option>
                  <option value="unpaid">የወሩን ያልከፈሉ</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin Member Registration / Edit Modal Form */}
      {isAdmin && showMemberForm && subTab === 'members' && (
        <form
          onSubmit={handleMemberSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="text-sm font-semibold text-[#111815]">
              {editingMemberId ? 'የአባል መረጃ ማስተካከያ' : 'አዲስ የዕድር አባል መመዝገቢያ'}
            </h3>
            <button
              type="button"
              onClick={() => setShowMemberForm(false)}
              className="text-xs text-[#6B7280] hover:text-[#111815]"
            >
              ዝጋ
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የአባል መለያ ቁጥር *
              </label>
              <input
                type="text"
                required
                value={mCode}
                onChange={(e) => setMCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ሙሉ ስም *</label>
              <input
                type="text"
                required
                value={mName}
                onChange={(e) => setMName(e.target.value)}
                placeholder="ለምሳሌ፡ አቶ አበበ ከበደ"
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ስልክ ቁጥር *</label>
              <input
                type="text"
                required
                value={mPhone}
                onChange={(e) => setMPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ከተማ / ክፍለ ከተማ *
              </label>
              <input
                type="text"
                required
                value={mSubCity}
                onChange={(e) => setMSubCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ቀበሌ *</label>
              <input
                type="text"
                required
                value={mKebele}
                onChange={(e) => setMKebele(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ልዩ አድራሻ</label>
              <input
                type="text"
                value={mAddressNote}
                onChange={(e) => setMAddressNote(e.target.value)}
                placeholder="የሰፈር ስም ወይም ምልክት"
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የመግቢያ ቀን *</label>
              <input
                type="date"
                required
                value={mJoinDate}
                onChange={(e) => setMJoinDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ሁኔታ</label>
              <select
                value={mStatus}
                onChange={(e) => setMStatus(e.target.value as MemberStatus)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                <option value="active">{MEMBER_STATUS_AM.active}</option>
                <option value="suspended">{MEMBER_STATUS_AM.suspended}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ወርሃዊ መዋጮ (ብር)
              </label>
              <input
                type="number"
                min={0}
                value={mDuesRate}
                onChange={(e) => setMDuesRate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ዋስ / አስተዋዋቂ
              </label>
              <input
                type="text"
                value={mGuarantor}
                onChange={(e) => setMGuarantor(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 pt-4">
              <img
                src={isSafeImageUrl(mPhotoUrl) ? mPhotoUrl : ASSETS_IMG.maleAvatar}
                alt="የአባል ፎቶ"
                className="w-12 h-12 rounded-lg object-cover border border-[#E5E7EB]"
              />
              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D1D5DB] rounded-lg bg-white hover:bg-[#F9FAFB] cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-[#14532D]" />
                  የአባል ፎቶ አስገባ / ቀይር
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMemberPhotoSelect}
                    className="hidden"
                  />
                </label>
                {photoUploadErr && (
                  <p className="text-[11px] text-[#DC2626] mt-1">{photoUploadErr}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dependents Builder */}
          <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#111815]">
                የቤተሰብ አባላት እና ተጠቃሚዎች ({mDependents.length})
              </h4>
              <button
                type="button"
                onClick={addDependentRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                ተጠቃሚ ጨምር
              </button>
            </div>
            {mDependents.map((dep) => (
              <div
                key={dep.id}
                className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_90px_40px] gap-2 items-center"
              >
                <input
                  type="text"
                  value={dep.fullName}
                  onChange={(e) => updateDependentRow(dep.id, { fullName: e.target.value })}
                  placeholder="የቤተሰብ አባል ሙሉ ስም"
                  className="px-3 py-1.5 text-xs border border-[#D1D5DB] rounded-lg"
                />
                <select
                  value={dep.relationship}
                  onChange={(e) =>
                    updateDependentRow(dep.id, {
                      relationship: e.target.value as DependentInfo['relationship'],
                    })
                  }
                  className="px-2.5 py-1.5 text-xs border border-[#D1D5DB] rounded-lg bg-white"
                >
                  {Object.entries(RELATIONSHIP_AM).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={dep.age}
                  onChange={(e) =>
                    updateDependentRow(dep.id, { age: Number(e.target.value) || 0 })
                  }
                  placeholder="ዕድሜ"
                  className="px-2.5 py-1.5 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeDependentRow(dep.id)}
                  className="p-1.5 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg justify-self-center"
                  aria-label="አስወግድ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowMemberForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg text-[#374151]"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              {editingMemberId ? 'ለውጡን አስቀምጥ' : 'አባሉን መዝግብ'}
            </button>
          </div>
        </form>
      )}

      {/* Admin User Credential & Role Assignment Form */}
      {isAdmin && showUserForm && subTab === 'users' && (
        <form
          onSubmit={handleUserSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="text-sm font-semibold text-[#111815]">
              {editingUserId
                ? 'የተጠቃሚ መለያ፣ የይለፍ ቃል እና ሚና ማስተካከያ'
                : 'ለአባል ወይም ለኮሚቴ አዲስ ዩዘር እና ሚና መስጫ'}
            </h3>
            <button
              type="button"
              onClick={() => setShowUserForm(false)}
              className="text-xs text-[#6B7280] hover:text-[#111815]"
            >
              ዝጋ
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የተመዘገበ አባል አያይዝ (አማራጭ)
              </label>
              <select
                value={uMemberId}
                onChange={(e) => {
                  const id = e.target.value;
                  setUMemberId(id);
                  const found = db.members.find((m) => m.id === id);
                  if (found && !uDisplayName.trim()) {
                    setUDisplayName(found.fullName);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                <option value="">-- ከአባል ጋር ያልተገናኘ --</option>
                {db.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberCode} · {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የሚታይ ሙሉ ስም *
              </label>
              <input
                type="text"
                required
                value={uDisplayName}
                onChange={(e) => setUDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የስልጣን ሚና (Role) *
              </label>
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS_AM[role]} ({role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የመግቢያ ዩዘር ስም (Username) *
              </label>
              <input
                type="text"
                required
                value={uUsername}
                onChange={(e) => setUUsername(e.target.value)}
                placeholder="ለምሳሌ፡ abebe"
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                {editingUserId
                  ? 'አዲስ የይለፍ ቃል (ለመቀየር ብቻ ይሙሉ)'
                  : 'የመግቢያ የይለፍ ቃል (Password) *'}
              </label>
              <input
                type="password"
                required={!editingUserId}
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                placeholder={editingUserId ? 'ካልተቀየረ ባዶ ይተዉት' : 'ቢያንስ 4 ፊደል'}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="userActiveToggle"
                type="checkbox"
                checked={uActive}
                onChange={(e) => setUActive(e.target.checked)}
                className="w-4 h-4 accent-[#14532D]"
              />
              <label htmlFor="userActiveToggle" className="text-xs font-medium text-[#111815]">
                መለያው ንቁ ነው (መግባት ይችላል)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUserForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg text-[#374151]"
            >
              ተወው
            </button>
            <button
              type="submit"
              disabled={savingUser}
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] disabled:opacity-60"
            >
              {savingUser ? 'በማስቀመጥ ላይ...' : editingUserId ? 'ዩዘሩን አዘምን' : 'ዩዘር ፍጠር'}
            </button>
          </div>
        </form>
      )}

      {/* Members Table */}
      {subTab === 'members' && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 font-medium">አባል</th>
                  <th className="px-4 py-3 font-medium">ስልክ እና አድራሻ</th>
                  <th className="px-4 py-3 font-medium">የቤተሰብ ተጠቃሚ</th>
                  <th className="px-4 py-3 font-medium">የ{formatMonthLabelAm(currentMonth)} ክፍያ</th>
                  <th className="px-4 py-3 font-medium">ሁኔታ</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">ዩዘር / ሚና</th>}
                  <th className="px-4 py-3 font-medium text-right">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-[#6B7280]">
                      ከፍለጋው ጋር የሚዛመድ አባል አልተገኘም።
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const paid = paidMemberIdsThisMonth.has(m.id);
                    const linkedUser = userByMemberId.get(m.id);
                    return (
                      <tr key={m.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={isSafeImageUrl(m.photoUrl) ? m.photoUrl : ASSETS_IMG.maleAvatar}
                              alt={m.fullName}
                              className="w-9 h-9 rounded-lg object-cover border border-[#E5E7EB] shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-[#111815]">{m.fullName}</p>
                              <p className="font-mono-tabular text-[11px] text-[#6B7280]">
                                {m.memberCode} · ገባ: {m.joinDate}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono-tabular text-[#111815]">{m.phone}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {m.subCity} · {m.kebele}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono-tabular text-[#4B5563]">
                          {m.dependents.length} ሰው · {formatCurrencyETB(m.monthlyDuesRate)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span className={paid ? 'text-[#16A34A]' : 'text-[#B45309]'}>
                            {paid ? 'ተከፍሏል' : 'አልተከፈለም'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span
                            className={
                              m.status === 'active' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                            }
                          >
                            {MEMBER_STATUS_AM[m.status]}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            {linkedUser ? (
                              <div>
                                <span className="font-mono-tabular font-medium text-[#111815]">
                                  @{linkedUser.username}
                                </span>
                                <span className="block text-[11px] text-[#14532D]">
                                  {ROLE_LABELS_AM[linkedUser.role]}
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openNewUserForm(m)}
                                className="text-[#14532D] font-medium hover:underline"
                              >
                                + ዩዘር ስጥ
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenIdCard(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F3F4F6]"
                            >
                              <IdCard className="w-3.5 h-3.5 text-[#14532D]" />
                              መታወቂያ
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditMemberForm(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F3F4F6]"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  አስተካክል
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRequestToggleMemberStatus(
                                      m,
                                      m.status === 'active' ? 'suspended' : 'active'
                                    )
                                  }
                                  className={`px-2.5 py-1 border rounded-md font-medium ${
                                    m.status === 'active'
                                      ? 'border-[#DC2626]/30 text-[#DC2626] hover:bg-[#FEF2F2]'
                                      : 'border-[#16A34A]/30 text-[#16A34A] hover:bg-[#F0FDF4]'
                                  }`}
                                >
                                  {m.status === 'active' ? 'አግድ' : 'አንቃ'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Users & Credentials Table */}
      {isAdmin && subTab === 'users' && (
        <div className="bg-white border border-[#E2E6E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-3 font-medium">የተጠቃሚ ስም (Username)</th>
                  <th className="px-4 py-3 font-medium">ሙሉ ስም</th>
                  <th className="px-4 py-3 font-medium">የተመደበ ሚና</th>
                  <th className="px-4 py-3 font-medium">የተገናኘ አባል</th>
                  <th className="px-4 py-3 font-medium">ሁኔታ</th>
                  <th className="px-4 py-3 font-medium text-right">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredUsers.map((u) => {
                  const linked = u.memberId
                    ? db.members.find((m) => m.id === u.memberId)
                    : undefined;
                  return (
                    <tr key={u.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3 font-mono-tabular font-semibold text-[#111815]">
                        @{u.username}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111815]">{u.displayName}</td>
                      <td className="px-4 py-3 font-medium text-[#14532D]">
                        {ROLE_LABELS_AM[u.role]}
                      </td>
                      <td className="px-4 py-3 font-mono-tabular text-[#4B5563]">
                        {linked ? `${linked.memberCode} · ${linked.fullName}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={u.active ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                          {u.active ? 'ንቁ' : 'የታገደ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditUserForm(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F3F4F6]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            ሚና / የይለፍ ቃል ቀይር
                          </button>
                          {u.id !== session.userId && (
                            <button
                              type="button"
                              onClick={() => onRequestToggleUserActive(u, !u.active)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-md font-medium ${
                                u.active
                                  ? 'border-[#DC2626]/30 text-[#DC2626] hover:bg-[#FEF2F2]'
                                  : 'border-[#16A34A]/30 text-[#16A34A] hover:bg-[#F0FDF4]'
                              }`}
                            >
                              {u.active ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  አግድ
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  አንቃ
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
