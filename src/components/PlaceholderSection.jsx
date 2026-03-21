export default function PlaceholderSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10 sm:px-8">
      {title ? (
        <h3 className="font-serif text-lg font-semibold text-slate-900">{title}</h3>
      ) : null}
      <div className={`text-sm leading-relaxed text-slate-600 ${title ? 'mt-3' : ''}`}>{children}</div>
    </div>
  )
}
