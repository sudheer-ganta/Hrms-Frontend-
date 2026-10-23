import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Pencil, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useDataVersion } from '../../services/dataSync';
import { errorMessage } from '../../lib/apiError';
import type { RulesDocument } from '../../types';

/**
 * Read-only rulebook. The server writes every sentence from the live settings and payroll ruleset,
 * so what is shown here is what attendance and payroll actually apply.
 */
export const RulesTab: React.FC = () => {
  const dataVersion = useDataVersion();
  const [doc, setDoc] = useState<RulesDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    setError(null);
    try {
      setDoc(await api.getRules());
    } catch (err) {
      setError(errorMessage(err, 'Could not load the rules.'));
    }
  };

  useEffect(() => {
    load();
  }, [dataVersion]);

  const sections = useMemo(() => {
    if (!doc) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return doc.sections;
    return doc.sections
      .map((s) => ({
        ...s,
        rules: s.rules.filter((r) => `${s.title} ${r.title} ${r.detail}`.toLowerCase().includes(needle)),
      }))
      .filter((s) => s.rules.length > 0);
  }, [doc, query]);

  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3">
        <span>{error}</span>
        <button type="button" onClick={load} className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!doc) {
    return <div className="py-16 text-center text-xs text-slate-400 font-semibold">Loading the rules…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-slate-700 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-heading font-bold text-brand-700 text-sm">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <span>Company rules, in one place</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          Everything below is how attendance and payroll work right now. It is written by the system from the live settings, so
          it always matches what is actually applied. To change a number, use the tab named under each heading.
        </p>
        <p className="text-[11px] text-slate-500 font-mono">Settings version {doc.policyVersion} · Payroll rules {doc.payrollRulesVersion}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the rules (e.g. Sunday, PF, late)"
          aria-label="Search the rules"
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {sections.length === 0 && <div className="py-10 text-center text-xs text-slate-400 font-semibold">No rule matches "{query}".</div>}

      {sections.map((section) => (
        <section key={section.id} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-heading font-extrabold text-slate-900">{section.title}</h2>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 w-fit">
              <Pencil className="w-3 h-3" />
              {section.editableIn ? `Change in: ${section.editableIn}` : 'Fixed in the payroll rules'}
            </span>
          </div>
          <dl className="divide-y divide-slate-100">
            {section.rules.map((rule) => (
              <div key={rule.title} className="py-3 grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-1 md:gap-6">
                <dt className="text-xs font-heading font-bold text-slate-800">{rule.title}</dt>
                <dd className="text-xs text-slate-600 leading-relaxed">{rule.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
};
