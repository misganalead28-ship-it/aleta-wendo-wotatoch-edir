import { useState } from 'react';
import { Megaphone, MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import type {
  AnnouncementNotice,
  AuthSession,
  IddirDatabase,
  NoticeCategory,
} from '../../types';
import {
  NOTICE_CATEGORY_AM,
  ROLE_LABELS_AM,
  formatDateTimeAm,
} from '../../i18n';

interface Props {
  session: AuthSession;
  db: IddirDatabase;
  onPublishNotice: (payload: {
    category: NoticeCategory;
    title: string;
    message: string;
    eventDate?: string;
    location?: string;
  }) => void;
  onRequestDeleteNotice: (notice: AnnouncementNotice) => void;
  onSubmitInquiry: (payload: { subject: string; message: string }) => void;
  onRespondInquiry: (inquiryId: string, responseText: string) => void;
}

export function AnnouncementsView({
  session,
  db,
  onPublishNotice,
  onRequestDeleteNotice,
  onSubmitInquiry,
  onRespondInquiry,
}: Props) {
  const canPublish =
    session.role === 'public_relations' ||
    session.role === 'secretary' ||
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';

  const canRespondInquiries =
    session.role === 'public_relations' ||
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'admin';

  // Regular members see only their own submitted inquiries
  const visibleInquiries =
    session.role === 'member'
      ? db.inquiries.filter(
          (i) => i.memberId === session.memberId || i.memberId === session.userId
        )
      : db.inquiries;

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [nCategory, setNCategory] = useState<NoticeCategory>('general');
  const [nTitle, setNTitle] = useState('');
  const [nMessage, setNMessage] = useState('');
  const [nDate, setNDate] = useState(new Date().toISOString().slice(0, 10));
  const [nLocation, setNLocation] = useState('');

  // Inquiry submission state
  const [iSubject, setISubject] = useState('');
  const [iMessage, setIMessage] = useState('');

  // PR response draft per inquiry
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  function handleNoticeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nTitle.trim() || !nMessage.trim()) return;
    onPublishNotice({
      category: nCategory,
      title: nTitle,
      message: nMessage,
      eventDate: nDate,
      location: nLocation,
    });
    setShowNoticeForm(false);
    setNTitle('');
    setNMessage('');
    setNLocation('');
  }

  function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!iSubject.trim() || !iMessage.trim()) return;
    onSubmitInquiry({ subject: iSubject, message: iMessage });
    setISubject('');
    setIMessage('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#111815] flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#14532D]" />
            የዕድሩ ማስታወቂያዎች፣ የሐዘን/የደስታ ጥሪዎች እና የአባላት ጥያቄዎች
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            በህዝብ ግንኙነት እና በአመራር የሚተላለፉ ይፋዊ መልዕክቶች እና የአባላት መስተንግዶ መድረክ
          </p>
        </div>

        {canPublish && (
          <button
            type="button"
            onClick={() => setShowNoticeForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
          >
            <Plus className="w-3.5 h-3.5" />
            አዲስ ማስታወቂያ / ጥሪ አውጣ
          </button>
        )}
      </div>

      {/* Publish Notice Form */}
      {canPublish && showNoticeForm && (
        <form
          onSubmit={handleNoticeSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">አዲስ ማስታወቂያ ወይም ጥሪ ማውጫ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ምድብ *</label>
              <select
                value={nCategory}
                onChange={(e) => setNCategory(e.target.value as NoticeCategory)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white"
              >
                {Object.entries(NOTICE_CATEGORY_AM).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ቀን</label>
              <input
                type="date"
                value={nDate}
                onChange={(e) => setNDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ቦታ</label>
              <input
                type="text"
                value={nLocation}
                onChange={(e) => setNLocation(e.target.value)}
                placeholder="ለምሳሌ፡ ቀበሌ 01 አዳራሽ"
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-[#374151] mb-1">ርዕስ *</label>
              <input
                type="text"
                required
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-[#374151] mb-1">ዝርዝር መልዕክት *</label>
              <textarea
                rows={3}
                required
                value={nMessage}
                onChange={(e) => setNMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNoticeForm(false)}
              className="px-4 py-2 text-xs border border-[#D1D5DB] rounded-lg"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              ማስታወቂያውን አውጣ
            </button>
          </div>
        </form>
      )}

      {/* Notices Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {db.announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white border border-[#E2E6E1] rounded-xl p-5 flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    ann.category === 'bereavement'
                      ? 'text-[#DC2626]'
                      : ann.category === 'joy'
                      ? 'text-[#16A34A]'
                      : ann.category === 'urgent'
                      ? 'text-[#B45309]'
                      : 'text-[#14532D]'
                  }`}
                >
                  {NOTICE_CATEGORY_AM[ann.category]}
                </span>
                <span className="font-mono-tabular text-[#6B7280]">
                  {ann.eventDate || formatDateTimeAm(ann.createdAt)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#111815]">{ann.title}</h3>
              <p className="text-xs text-[#4B5563] leading-relaxed whitespace-pre-line">
                {ann.message}
              </p>
              {ann.location && (
                <p className="text-[11px] text-[#6B7280]">ቦታ: {ann.location}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-[11px] text-[#6B7280]">
              <span>
                አቅራቢ: {ann.authorName} ({ROLE_LABELS_AM[ann.authorRole]})
              </span>
              {canPublish && (
                <button
                  type="button"
                  onClick={() => onRequestDeleteNotice(ann)}
                  className="inline-flex items-center gap-1 text-[#DC2626] hover:underline font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  ሰርዝ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Member Inquiries & PR Feedback Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        {session.role !== 'auditor' && (
          <form
            onSubmit={handleInquirySubmit}
            className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold text-[#111815] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#14532D]" />
              ለህዝብ ግንኙነት ጥያቄ / አስተያየት ላክ
            </h3>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ርዕስ *</label>
              <input
                type="text"
                required
                value={iSubject}
                onChange={(e) => setISubject(e.target.value)}
                placeholder="የጥያቄው አጭር ርዕስ"
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">ዝርዝር መልዕክት *</label>
              <textarea
                rows={3}
                required
                value={iMessage}
                onChange={(e) => setIMessage(e.target.value)}
                placeholder="ጥያቄዎን ወይም አስተያየትዎን እዚህ ይጻፉ..."
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <Send className="w-3.5 h-3.5" />
              ጥያቄውን ላክ
            </button>
          </form>
        )}

        <div
          className={`bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4 ${
            session.role === 'auditor' ? 'lg:col-span-2' : ''
          }`}
        >
          <h3 className="text-sm font-semibold text-[#111815]">
            {session.role === 'member'
              ? `የእኔ ጥያቄዎችና የተሰጡ ምላሾች (${visibleInquiries.length})`
              : `የአባላት ጥያቄዎችና የህዝብ ግንኙነት ምላሾች (${visibleInquiries.length})`}
          </h3>

          {visibleInquiries.length === 0 ? (
            <p className="text-xs text-[#6B7280]">እስካሁን የቀረበ ጥያቄ የለም።</p>
          ) : (
            <div className="space-y-3">
              {visibleInquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="border border-[#E5E7EB] rounded-lg p-4 space-y-2 bg-[#F9FAFB]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#111815]">
                      {inq.memberName}{' '}
                      <span className="font-mono-tabular text-[#6B7280]">({inq.memberCode})</span>
                    </span>
                    <span
                      className={`font-semibold ${
                        inq.status === 'responded' ? 'text-[#16A34A]' : 'text-[#B45309]'
                      }`}
                    >
                      {inq.status === 'responded' ? 'ምላሽ ተሰጥቷል' : 'ምላሽ የሚጠብቅ'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#14532D]">{inq.subject}</p>
                  <p className="text-xs text-[#374151]">{inq.message}</p>

                  {inq.responseText && (
                    <div className="bg-white border border-[#E5E7EB] rounded-md p-3 text-xs space-y-1">
                      <p className="font-semibold text-[#14532D]">
                        የአመራር / የህዝብ ግንኙነት ምላሽ ({inq.respondedByName}):
                      </p>
                      <p className="text-[#374151]">{inq.responseText}</p>
                    </div>
                  )}

                  {canRespondInquiries && inq.status === 'open' && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[inq.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [inq.id]: e.target.value }))
                        }
                        placeholder="ይፋዊ ምላሽ ይጻፉ..."
                        className="flex-1 px-3 py-1.5 text-xs border border-[#D1D5DB] rounded-md bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const text = replyDrafts[inq.id]?.trim();
                          if (!text) return;
                          onRespondInquiry(inq.id, text);
                          setReplyDrafts((prev) => ({ ...prev, [inq.id]: '' }));
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-[#14532D] text-white rounded-md hover:bg-[#166534]"
                      >
                        ምላሽ ላክ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
