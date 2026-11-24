import { useState } from 'react';
import { Calendar, CheckCircle2, FileText, ListTodo, Plus, Printer } from 'lucide-react';
import type {
  ApprovalStatus,
  AuthSession,
  CommitteeTask,
  IddirDatabase,
} from '../../types';
import { APPROVAL_STATUS_AM } from '../../i18n';
import type { PrintableDocument } from '../ReceiptPrintModal';

interface Props {
  session: AuthSession;
  db: IddirDatabase;
  onCreateMinute: (payload: {
    title: string;
    meetingDate: string;
    location: string;
    attendeesCount: number;
    agenda: string;
    minutesBody: string;
    decisions: string;
  }) => void;
  onApproveMinute: (minuteId: string, decision: Exclude<ApprovalStatus, 'pending'>) => void;
  onCreateLetter: (payload: {
    recipient: string;
    subject: string;
    body: string;
    memberId?: string;
  }) => void;
  onCreateTask: (payload: {
    title: string;
    description: string;
    assignedToName: string;
    dueDate: string;
  }) => void;
  onUpdateTaskStatus: (taskId: string, status: CommitteeTask['status']) => void;
  onPrintDocument: (doc: PrintableDocument) => void;
}

const TASK_STATUS_AM: Record<CommitteeTask['status'], string> = {
  todo: 'ያልተጀመረ',
  in_progress: 'በሂደት ላይ',
  done: 'ተጠናቋል',
};

export function MeetingsTasksView({
  session,
  db,
  onCreateMinute,
  onApproveMinute,
  onCreateLetter,
  onCreateTask,
  onUpdateTaskStatus,
  onPrintDocument,
}: Props) {
  const canWriteMinutes =
    session.role === 'secretary' ||
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';
  const canApproveMinutes =
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';
  const canWriteLetters = session.role === 'secretary' || session.role === 'admin';
  const canAssignTasks =
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'secretary' ||
    session.role === 'admin';
  const canUpdateTasks =
    canAssignTasks || session.role === 'committee_member';

  const [subTab, setSubTab] = useState<'minutes' | 'letters' | 'tasks'>(
    session.role === 'committee_member' ? 'tasks' : 'minutes'
  );

  // Minute form
  const [showMinForm, setShowMinForm] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mLoc, setMLoc] = useState('የዕድሩ ጽሕፈት ቤት');
  const [mAttendees, setMAttendees] = useState('7');
  const [mAgenda, setMAgenda] = useState('');
  const [mBody, setMBody] = useState('');
  const [mDecisions, setMDecisions] = useState('');

  // Letter form
  const [showLetterForm, setShowLetterForm] = useState(false);
  const [lRecipient, setLRecipient] = useState('');
  const [lSubject, setLSubject] = useState('');
  const [lBody, setLBody] = useState('');
  const [lMemberId, setLMemberId] = useState('');

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tAssignee, setTAssignee] = useState('አቶ ታሪኩ መኮንን');
  const [tDue, setTDue] = useState(new Date().toISOString().slice(0, 10));

  function submitMinute(e: React.FormEvent) {
    e.preventDefault();
    if (!mTitle.trim() || !mBody.trim()) return;
    onCreateMinute({
      title: mTitle,
      meetingDate: mDate,
      location: mLoc,
      attendeesCount: Number(mAttendees) || 1,
      agenda: mAgenda,
      minutesBody: mBody,
      decisions: mDecisions,
    });
    setShowMinForm(false);
    setMTitle('');
    setMAgenda('');
    setMBody('');
    setMDecisions('');
  }

  function submitLetter(e: React.FormEvent) {
    e.preventDefault();
    if (!lRecipient.trim() || !lSubject.trim() || !lBody.trim()) return;
    onCreateLetter({
      recipient: lRecipient,
      subject: lSubject,
      body: lBody,
      memberId: lMemberId || undefined,
    });
    setShowLetterForm(false);
    setLRecipient('');
    setLSubject('');
    setLBody('');
    setLMemberId('');
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!tTitle.trim()) return;
    onCreateTask({
      title: tTitle,
      description: tDesc,
      assignedToName: tAssignee,
      dueDate: tDue,
    });
    setShowTaskForm(false);
    setTTitle('');
    setTDesc('');
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Action Bar */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('minutes')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
              subTab === 'minutes'
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            ቃለ-ጉባኤዎች ({db.minutes.length})
          </button>
          {session.role !== 'committee_member' && (
            <button
              type="button"
              onClick={() => setSubTab('letters')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                subTab === 'letters'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              ኦፊሴላዊ ደብዳቤዎች ({db.letters.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setSubTab('tasks')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
              subTab === 'tasks'
                ? 'bg-[#14532D] text-white border-[#14532D]'
                : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            የኮሚቴ ተግባራት ({db.tasks.length})
          </button>
        </div>

        <div>
          {subTab === 'minutes' && canWriteMinutes && (
            <button
              type="button"
              onClick={() => setShowMinForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Plus className="w-3.5 h-3.5" />
              አዲስ ቃለ-ጉባኤ መዝግብ
            </button>
          )}
          {subTab === 'letters' && canWriteLetters && (
            <button
              type="button"
              onClick={() => setShowLetterForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Plus className="w-3.5 h-3.5" />
              አዲስ ደብዳቤ አዘጋጅ
            </button>
          )}
          {subTab === 'tasks' && canAssignTasks && (
            <button
              type="button"
              onClick={() => setShowTaskForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Plus className="w-3.5 h-3.5" />
              የኮሚቴ ተግባር ስጥ
            </button>
          )}
        </div>
      </div>

      {/* Minutes Form */}
      {subTab === 'minutes' && canWriteMinutes && showMinForm && (
        <form
          onSubmit={submitMinute}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">አዲስ የስብሰባ ቃለ-ጉባኤ መመዝገቢያ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">የስብሰባው ርዕስ *</label>
              <input
                type="text"
                required
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ቀን *</label>
              <input
                type="date"
                required
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የተሳታፊ ብዛት</label>
              <input
                type="number"
                min={1}
                value={mAttendees}
                onChange={(e) => setMAttendees(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-[#374151] mb-1">ቦታ</label>
              <input
                type="text"
                value={mLoc}
                onChange={(e) => setMLoc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">አጀንዳዎች</label>
              <textarea
                rows={3}
                value={mAgenda}
                onChange={(e) => setMAgenda(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">የተላለፉ ውሳኔዎች *</label>
              <textarea
                rows={3}
                required
                value={mDecisions}
                onChange={(e) => setMDecisions(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-[#374151] mb-1">
                የስብሰባው ዝርዝር ቃለ-ጉባኤ *
              </label>
              <textarea
                rows={4}
                required
                value={mBody}
                onChange={(e) => setMBody(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowMinForm(false)}
              className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              ቃለ-ጉባኤውን መዝግብ
            </button>
          </div>
        </form>
      )}

      {/* Letter Form */}
      {subTab === 'letters' && canWriteLetters && showLetterForm && (
        <form
          onSubmit={submitLetter}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">ኦፊሴላዊ የዕድር ደብዳቤ ማዘጋጃ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ተቀባይ (ለ) *</label>
              <input
                type="text"
                required
                value={lRecipient}
                onChange={(e) => setLRecipient(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                ተያያዥ አባል (አማራጭ)
              </label>
              <select
                value={lMemberId}
                onChange={(e) => setLMemberId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                <option value="">-- የለም --</option>
                {db.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberCode} · {m.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">ጉዳዩ *</label>
              <input
                type="text"
                required
                value={lSubject}
                onChange={(e) => setLSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">የደብዳቤው ይዘት *</label>
              <textarea
                rows={4}
                required
                value={lBody}
                onChange={(e) => setLBody(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLetterForm(false)}
              className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              ደብዳቤውን አዘጋጅ
            </button>
          </div>
        </form>
      )}

      {/* Task Form */}
      {subTab === 'tasks' && canAssignTasks && showTaskForm && (
        <form
          onSubmit={submitTask}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">ለኮሚቴ አባል ተግባር መመደቢያ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">የተግባሩ ርዕስ *</label>
              <input
                type="text"
                required
                value={tTitle}
                onChange={(e) => setTTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">የማጠናቀቂያ ቀን *</label>
              <input
                type="date"
                required
                value={tDue}
                onChange={(e) => setTDue(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ኃላፊ</label>
              <input
                type="text"
                required
                value={tAssignee}
                onChange={(e) => setTAssignee(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">መግለጫ</label>
              <input
                type="text"
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowTaskForm(false)}
              className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              ተግባሩን ስጥ
            </button>
          </div>
        </form>
      )}

      {/* Minutes List */}
      {subTab === 'minutes' && (
        <div className="space-y-4">
          {db.minutes.map((min) => (
            <div
              key={min.id}
              className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[#14532D]">{min.meetingNumber}</span>
                  <span className="text-[#9CA3AF]">·</span>
                  <span className="font-mono-tabular text-[#6B7280]">{min.meetingDate}</span>
                  <span className="text-[#9CA3AF]">·</span>
                  <span className="text-[#4B5563]">
                    {min.location} (ተሳታፊ: {min.attendeesCount})
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    min.approvalStatus === 'approved'
                      ? 'text-[#16A34A]'
                      : min.approvalStatus === 'rejected'
                      ? 'text-[#DC2626]'
                      : 'text-[#B45309]'
                  }`}
                >
                  {APPROVAL_STATUS_AM[min.approvalStatus]}
                </span>
              </div>

              <h3 className="text-base font-semibold text-[#111815]">{min.title}</h3>

              {min.agenda && (
                <div className="text-xs text-[#4B5563] whitespace-pre-line">
                  <strong className="text-[#111815]">አጀንዳ:</strong>
                  {'\n'}
                  {min.agenda}
                </div>
              )}

              <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                {min.minutesBody}
              </p>

              {min.decisions && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 text-xs text-[#111815] whitespace-pre-line">
                  <strong>ውሳኔዎች:</strong> {min.decisions}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
                <span>
                  ፀሐፊ: {min.recordedByName}
                  {min.approvedByName ? ` · ያጸደቀው: ${min.approvedByName}` : ''}
                </span>
                {canApproveMinutes && min.approvalStatus === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveMinute(min.id, 'rejected')}
                      className="px-2.5 py-1 border border-[#DC2626]/30 text-[#DC2626] rounded hover:bg-[#FEF2F2]"
                    >
                      መልስ
                    </button>
                    <button
                      type="button"
                      onClick={() => onApproveMinute(min.id, 'approved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#14532D] text-white rounded hover:bg-[#166534]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      አጽድቅ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Letters List */}
      {subTab === 'letters' && session.role !== 'committee_member' && (
        <div className="space-y-4">
          {db.letters.map((ltr) => (
            <div
              key={ltr.id}
              className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono-tabular font-semibold text-[#14532D]">
                  ቁጥር: {ltr.letterNumber}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-[#6B7280]">{ltr.issueDate}</span>
                  <button
                    type="button"
                    onClick={() => onPrintDocument({ kind: 'letter', letter: ltr })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D1D5DB] rounded-md text-[#111815] hover:bg-[#F9FAFB]"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#14532D]" />
                    ደብዳቤ አትም
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#6B7280]">ለ: {ltr.recipient}</p>
              <h3 className="text-sm font-semibold text-[#111815]">{ltr.subject}</h3>
              <p className="text-xs text-[#4B5563] leading-relaxed whitespace-pre-line">
                {ltr.body}
              </p>
              <p className="text-[11px] text-[#6B7280] pt-1">
                ያዘጋጀው: {ltr.issuedByName}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Committee Tasks List */}
      {subTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    task.status === 'done'
                      ? 'text-[#16A34A]'
                      : task.status === 'in_progress'
                      ? 'text-[#B45309]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {TASK_STATUS_AM[task.status]}
                </span>
                <span className="font-mono-tabular text-[#6B7280]">
                  ማጠናቀቂያ: {task.dueDate}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#111815]">{task.title}</h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">{task.description}</p>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] text-xs">
                <span className="text-[#6B7280]">ኃላፊ: {task.assignedToName}</span>
                {canUpdateTasks && (
                  <select
                    value={task.status}
                    onChange={(e) =>
                      onUpdateTaskStatus(task.id, e.target.value as CommitteeTask['status'])
                    }
                    className="px-2.5 py-1 text-xs border border-[#D1D5DB] rounded-md bg-white"
                  >
                    <option value="todo">ያልተጀመረ</option>
                    <option value="in_progress">በሂደት ላይ</option>
                    <option value="done">ተጠናቋል</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
