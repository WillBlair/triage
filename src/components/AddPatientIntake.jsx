import ProfileCard from './ProfileCard'

export const DEFAULT_INTAKE_FORM = {
  visitDate: '',
  sessionLabel: '',
  documentType: 'discharge',
}

const DOCUMENT_TYPES = [
  { value: 'discharge', label: 'Discharge summary' },
  { value: 'clinic', label: 'Clinic / ambulatory note' },
  { value: 'hp', label: 'H&P or consult' },
  { value: 'labs_only', label: 'Labs / imaging packet' },
  { value: 'other', label: 'Other' },
]

function FieldLabel({ id, children, optional }) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {optional ? <span className="font-normal normal-case text-slate-400"> (optional)</span> : null}
    </label>
  )
}

export default function AddPatientIntake({ intakeForm, onIntakeChange, ...profileCardProps }) {
  const patch = (updates) => onIntakeChange((prev) => ({ ...prev, ...updates }))

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Chart document &amp; extract</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Upload one clinical PDF. The structured snapshot below is generated from the document.
          </p>
        </div>
        <ProfileCard {...profileCardProps} embedded />
      </div>

      <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-semibold text-slate-900">Encounter context</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Session metadata and clinical framing. Stored with this browser session only.
          </p>
        </div>
        <div className="mt-5 grid gap-5">
          <div>
            <FieldLabel id="intake-visit-date" optional>
              Visit / encounter date
            </FieldLabel>
            <input
              id="intake-visit-date"
              type="date"
              value={intakeForm.visitDate}
              onChange={(e) => patch({ visitDate: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <FieldLabel id="intake-session-label" optional>
              Session label
            </FieldLabel>
            <input
              id="intake-session-label"
              type="text"
              placeholder="e.g. MRN last-4, bed, initials"
              value={intakeForm.sessionLabel}
              onChange={(e) => patch({ sessionLabel: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <FieldLabel id="intake-doc-type">Chart document type</FieldLabel>
            <select
              id="intake-doc-type"
              value={intakeForm.documentType}
              onChange={(e) => patch({ documentType: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            >
              {DOCUMENT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}
