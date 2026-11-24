import { useMemo, useState } from 'react';
import { Download, Search, ShieldCheck } from 'lucide-react';
import type { AuditTrailEntry } from '../../types';
import { ROLE_LABELS_AM, formatDateTimeAm } from '../../i18n';
import { exportRowsToCsv } from '../../utils/validation';

interface Props {
  auditLogs: AuditTrailEntry[];
}

export function AuditTrailView({ auditLogs }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>('all');

  const targetTypes = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.targetType));
    return ['all', ...Array.from(set)];
  }, [auditLogs]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (targetFilter !== 'all' && entry.targetType !== targetFilter) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.actorUsername.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, searchTerm, targetFilter]);

  function handleExportCsv() {
    exportRowsToCsv(
      `iddir-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['ጊዜ', 'ፈጻሚ', 'የተጠቃሚ ስም', 'ሚና', 'ተግባር', 'ምድብ', 'ዝርዝር'],
      filtered.map((l) => [
        formatDateTimeAm(l.timestamp),
        l.actorName,
        l.actorUsername,
        ROLE_LABELS_AM[l.actorRole],
        l.action,
        l.targetType,
        l.summary,
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E6E1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#111815] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#14532D]" />
              የሲስተም የክትትልና የኦዲት መዝገብ (Audit Trail)
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              በሲስተሙ ውስጥ የሚፈጸሙ የአባላት፣ የክፍያ፣ የወጪ፣ የቃለ-ጉባኤ እና የዩዘር ለውጦች በሙሉ በራስ-ሰር ይመዘገባሉ።
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#D1D5DB] bg-white text-[#111815] rounded-lg hover:bg-[#F9FAFB]"
          >
            <Download className="w-3.5 h-3.5" />
            CSV አውርድ
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="በፈጻሚ ስም፣ በተግባር ወይም በዝርዝር ይፈልጉ..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </div>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg bg-white focus:outline-none focus:border-[#14532D]"
          >
            {targetTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'ሁሉም ምድቦች' : type}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-[#E5E7EB] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">ቀንና ሰዓት</th>
                <th className="px-3.5 py-2.5 font-medium">ፈጻሚ እና ሚና</th>
                <th className="px-3.5 py-2.5 font-medium">ምድብ</th>
                <th className="px-3.5 py-2.5 font-medium">ተግባር</th>
                <th className="px-3.5 py-2.5 font-medium">ዝርዝር መግለጫ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-6 text-center text-[#6B7280]">
                    ከፍለጋው ጋር የሚዛመድ የክትትል መዝገብ አልተገኘም።
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-3.5 py-2.5 font-mono-tabular text-[#6B7280] whitespace-nowrap">
                      {formatDateTimeAm(entry.timestamp)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-semibold text-[#111815]">{entry.actorName}</span>
                      <span className="block text-[11px] text-[#6B7280]">
                        @{entry.actorUsername} · {ROLE_LABELS_AM[entry.actorRole]}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-[#14532D]">
                      {entry.targetType}
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-[#111815]">{entry.action}</td>
                    <td className="px-3.5 py-2.5 text-[#4B5563]">{entry.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
