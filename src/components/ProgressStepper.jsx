import { SECTION } from '../constants/navigation'

const STEPS = [
  { id: SECTION.ADD_PATIENT, label: 'Intake' },
  { id: SECTION.RECOMMENDATIONS, label: 'Compare' },
  { id: SECTION.SIMULATION, label: 'Monitor' },
  { id: SECTION.PRESCRIPTION, label: 'Handoff' },
]

export default function ProgressStepper({ activeSection }) {
  const hiddenSections = [
    SECTION.PROFILES,
    SECTION.SETTINGS,
    SECTION.DOCTOR_PROFILE,
    SECTION.FOLLOW_UP,
  ]

  if (hiddenSections.includes(activeSection)) {
    return null
  }

  const currentIndex = STEPS.findIndex((s) => s.id === activeSection)

  return (
    <div className="mb-5 mt-0 w-full px-2 sm:px-4">
      <nav aria-label="Progress">
        <ol role="list" className="relative flex items-center justify-between w-full">
          {/* Background Bar */}
          <div
            className="absolute left-0 top-1/2 -mt-[1px] h-0.5 w-full bg-slate-200"
            aria-hidden="true"
          />

          {/* Progress Bar */}
          <div
            className="absolute left-0 top-1/2 -mt-[1px] h-0.5 bg-teal-500 transition-all duration-500 ease-in-out"
            style={{
              width: currentIndex >= 0 ? `${(currentIndex / (STEPS.length - 1)) * 100}%` : '0%',
            }}
            aria-hidden="true"
          />

          {STEPS.map((step, stepIdx) => {
            const isCompleted = currentIndex > stepIdx
            const isCurrent = currentIndex === stepIdx

            return (
              <li key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-300 ${
                    isCompleted
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : isCurrent
                        ? 'border-2 border-teal-600 bg-white text-teal-700 shadow-md shadow-teal-600/10 ring-4 ring-teal-50'
                        : 'border-[1.5px] border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[11px] font-bold">{stepIdx + 1}</span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-4 w-max text-[11px] tracking-wide transition-colors duration-300 ${
                    isCurrent
                      ? 'font-bold text-teal-800'
                      : isCompleted
                        ? 'font-semibold text-teal-700'
                        : 'font-medium text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
