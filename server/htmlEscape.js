/** Escape text for safe inclusion in HTML bodies (email templates, etc.). */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Allow only http(s) URLs for link hrefs (blocks javascript:, data:, etc.). */
export function isSafeHttpUrl(url) {
  if (typeof url !== 'string') return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
