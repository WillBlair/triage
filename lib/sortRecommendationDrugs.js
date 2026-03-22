/**
 * Order drugs for display: rank 1 = strongest model-assessed fit for the patient.
 * Uses fitScore (higher first), then nominal-fit flag, then name.
 */
export function sortDrugsByModelFitRank(drugs) {
  if (!Array.isArray(drugs)) {
    return drugs
  }
  return [...drugs].sort((a, b) => {
    const sa = Number(a?.fitScore)
    const sb = Number(b?.fitScore)
    const na = Number.isFinite(sa) ? sa : 0
    const nb = Number.isFinite(sb) ? sb : 0
    if (nb !== na) {
      return nb - na
    }
    const fa = Boolean(a?.isNominalFit ?? a?.isRecommended) ? 1 : 0
    const fb = Boolean(b?.isNominalFit ?? b?.isRecommended) ? 1 : 0
    if (fb !== fa) {
      return fb - fa
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''))
  })
}
