function ListBlock({ title, items }) {
  if (!items?.length) {
    return null
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="text-sm leading-relaxed text-slate-800">{items.join(' · ')}</p>
    </div>
  )
}

function CompactMetrics({ title, rows }) {
  if (!rows?.length) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="min-w-0">
            <dt className="truncate text-xs text-slate-500">{row.label}</dt>
            <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Spinner({ className = '' }) {
  return (
    <div
      className={`h-10 w-10 shrink-0 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

function IntakeProgress({ fileName }) {
  const steps = [
    { id: 'pdf', label: 'PDF received', done: true, active: false },
    {
      id: 'parse',
      label: 'Extracting problem list, meds, and labs',
      done: false,
      active: true,
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:flex-row sm:items-start sm:text-left">
      <Spinner />
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Reading chart</p>
          {fileName && (
            <p className="mt-2 truncate text-sm font-medium text-slate-900" title={fileName}>
              {fileName}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            Pulling a structured snapshot you can verify before choosing a regimen. Usually ~30 seconds.
          </p>
        </div>
        <ul className="space-y-2 text-left text-sm">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? 'bg-emerald-500 text-white'
                    : step.active
                      ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-400 ring-offset-2'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step.done ? '✓' : step.active ? '…' : ''}
              </span>
              <span
                className={
                  step.active ? 'font-semibold text-slate-900' : step.done ? 'text-slate-700' : 'text-slate-400'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PatientSnapshot({ profile }) {
  return (
    <div className="grid gap-5">
      <div className="border-b border-slate-200/80 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Patient snapshot</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{profile.patientName}</h3>
        <p className="mt-1 text-sm text-slate-700">
          {[profile.age ? `${profile.age}y` : null, profile.sex, profile.chiefConcern].filter(Boolean).join(' · ')}
        </p>
        {profile.summary && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-4" title={profile.summary}>
            {profile.summary}
          </p>
        )}
      </div>

      <CompactMetrics title="Vitals & measurements" rows={profile.vitals} />
      <CompactMetrics title="Labs" rows={profile.labs} />

      <div className="grid gap-4 border-t border-slate-200/80 pt-4 sm:grid-cols-3 sm:gap-6">
        <ListBlock title="Problems" items={profile.diagnoses} />
        <ListBlock title="Medications" items={profile.medications} />
        <ListBlock title="Allergies" items={profile.allergies} />
      </div>
    </div>
  )
}

function ProfileCard({
  embedded = false,
  fileName,
  profile,
  isParsing,
  isLoadingRecommendations = false,
  onSelectFile,
  error,
}) {
  const shell = embedded
    ? 'flex flex-col'
    : 'flex flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur'

  const intakeBusy = isParsing || isLoadingRecommendations
  const hasStartedIntake = Boolean(fileName)

  return (
    <section className={shell}>
      {!embedded && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-teal-700">Phase 1</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Upload and parse</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              The document becomes the source of truth. No manual intake clutter, just one uploaded chart packet.
            </p>
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden rounded-[1.75rem] transition-[box-shadow,border-color] duration-300 ${
          hasStartedIntake
            ? 'border border-slate-200 bg-slate-50/90 shadow-sm'
            : 'border-2 border-dashed border-slate-300 bg-linear-to-br from-slate-50 via-white to-teal-50/40 hover:border-teal-400 hover:bg-teal-50/25'
        }`}
      >
        {!hasStartedIntake ? (
          <label className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center px-6 py-12 text-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onSelectFile(file)
                }
              }}
              className="hidden"
            />
            <p className="text-lg font-semibold text-slate-900">Drop PDF here or click to upload</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              One clinical PDF per run. This panel becomes your patient snapshot after parsing.
            </p>
          </label>
        ) : (
          <>
            {profile && isLoadingRecommendations && (
              <div className="flex items-center gap-3 border-b border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-950 sm:px-5">
                <Spinner className="!h-5 !w-5 border-teal-200 border-t-teal-700" />
                <span>
                  <span className="font-semibold">Drafting medication comparisons</span>
                  <span className="text-teal-800"> — review the snapshot below while options generate.</span>
                </span>
              </div>
            )}

            <div className="p-5 sm:p-6">
              {!profile && isParsing && <IntakeProgress fileName={fileName} />}

              {!profile && !isParsing && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-sm text-slate-600">
                  <p>Couldn&apos;t build a snapshot from this file.</p>
                  <label className="cursor-pointer rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          onSelectFile(file)
                        }
                      }}
                    />
                    Try another PDF
                  </label>
                </div>
              )}

              {profile && <PatientSnapshot profile={profile} />}
            </div>

            {!intakeBusy && (
              <div className="border-t border-slate-200/80 bg-white/60 px-5 py-3 text-center sm:px-6">
                <label className="cursor-pointer text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 transition hover:text-teal-950">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        onSelectFile(file)
                      }
                    }}
                  />
                  Replace PDF
                </label>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </section>
  )
}

export default ProfileCard
