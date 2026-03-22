/**
 * Maps regimen names to static demo artwork (generic icons — not brand packaging).
 * Extend the rules list as your sample PDF / model output adds new drug names.
 */
const RULES = [
  { re: /lisinopril|enalapril|ramipril|benazepril|captopril|ace\b/i, src: '/demo/drugs/tablet.svg' },
  { re: /losartan|valsartan|irbesartan|olmesartan|telmisartan|arb\b/i, src: '/demo/drugs/capsule.svg' },
  { re: /amlodipine|nifedipine|diltiazem|verapamil|ccb\b|calcium/i, src: '/demo/drugs/tablet.svg' },
  { re: /metformin|glipizide|glimepiride|empagliflozin|dapagliflozin|sglt|sulfonylurea/i, src: '/demo/drugs/capsule.svg' },
  { re: /atorvastatin|rosuvastatin|simvastatin|pravastatin|statin/i, src: '/demo/drugs/tablet.svg' },
  { re: /insulin|glargine|lispro|degludec|semaglutide|tirzepatide|ozempic|wegovy|mounjaro/i, src: '/demo/drugs/injection.svg' },
  { re: /montelukast|leukotriene/i, src: '/demo/drugs/tablet.svg' },
  { re: /albuterol|budesonide|fluticasone|tiotropium|breo|symbicort|advair|formoterol|inhal/i, src: '/demo/drugs/inhaler.svg' },
  { re: /metoprolol|atenolol|bisoprolol|carvedilol|nebivolol|beta[\s-]?blocker/i, src: '/demo/drugs/tablet.svg' },
  { re: /famotidine|cimetidine|ranitidine|h2\b/i, src: '/demo/drugs/capsule.svg' },
  { re: /acetaminophen|paracetamol/i, src: '/demo/drugs/tablet.svg' },
  { re: /midodrine|fludrocortisone|droxidopa/i, src: '/demo/drugs/tablet.svg' },
  { re: /furosemide|hydrochlorothiazide|chlorthalidone|spironolactone|diuretic|hctz\b/i, src: '/demo/drugs/vial.svg' },
  { re: /apixaban|rivaroxaban|dabigatran|edoxaban|warfarin|anticoag/i, src: '/demo/drugs/tablet.svg' },
  { re: /omeprazole|pantoprazole|ppi\b/i, src: '/demo/drugs/capsule.svg' },
]

export function drugDemoImageSrc(drugName) {
  const name = String(drugName || '').trim()
  if (!name) {
    return '/demo/drugs/default.svg'
  }
  for (const { re, src } of RULES) {
    if (re.test(name)) {
      return src
    }
  }
  return '/demo/drugs/default.svg'
}
