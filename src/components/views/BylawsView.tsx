import { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import type { AuthSession, BylawRule } from '../../types';

interface Props {
  session: AuthSession;
  bylaws: BylawRule[];
  onAddBylaw: (payload: { articleNumber: string; title: string; content: string }) => void;
}

export function BylawsView({ session, bylaws, onAddBylaw }: Props) {
  const canEdit =
    session.role === 'admin' ||
    session.role === 'chairperson' ||
    session.role === 'vice_chairperson' ||
    session.role === 'secretary';

  const [showForm, setShowForm] = useState(false);
  const [articleNumber, setArticleNumber] = useState(`አንቀጽ ${bylaws.length + 1}`);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!articleNumber.trim() || !title.trim() || !content.trim()) return;
    onAddBylaw({ articleNumber, title, content });
    setArticleNumber(`አንቀጽ ${bylaws.length + 2}`);
    setTitle('');
    setContent('');
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#111815] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#14532D]" />
            የዕድሩ መተዳደሪያ ደንብ እና ሕግጋት
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            ሁሉም አባላትና የኮሚቴ አባላት የሚገዙበት የዕድር መተዳደሪያ ደንብ ዝርዝር
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'ዝጋ' : 'አዲስ አንቀጽ ጨምር'}
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#111815]">አዲስ የመተዳደሪያ ደንብ አንቀጽ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">አንቀጽ ቁጥር</label>
              <input
                type="text"
                required
                value={articleNumber}
                onChange={(e) => setArticleNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#374151] mb-1">ርዕስ</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ለምሳሌ፡ የንብረት አጠቃቀም መመሪያ"
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">የአንቀጹ ዝርዝር ይዘት</label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium border border-[#D1D5DB] rounded-lg text-[#374151]"
            >
              ተወው
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              አንቀጹን አስቀምጥ
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {bylaws.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#14532D]">{rule.articleNumber}</span>
              <span className="text-[11px] font-mono-tabular text-[#6B7280]">
                የተሻሻለው: {rule.updatedAt.slice(0, 10)}
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#111815]">{rule.title}</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line">
              {rule.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
