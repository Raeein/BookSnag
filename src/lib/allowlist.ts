const ALLOWED_HOSTS = [
  'goldenaudiobook.com',
  'goldenaudiobooks.com',
  'dailyaudiobooks.com',
  'ipaudio.club',
  'archive.org',
]

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
]

export function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase()
  return ALLOWED_HOSTS.some(domain => h === domain || h.endsWith('.' + domain))
}

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === '::1' || h === '[::1]') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true
  if (h.startsWith('fe80:')) return true
  return PRIVATE_IPV4.some(rx => rx.test(h))
}

export class UrlRejectedError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function assertAllowedUrl(raw: string | null | undefined): URL {
  if (!raw || typeof raw !== 'string') {
    throw new UrlRejectedError('URL required.', 400)
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UrlRejectedError('Invalid URL.', 400)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlRejectedError('Only http and https URLs are allowed.', 400)
  }
  if (isPrivateHost(url.hostname)) {
    throw new UrlRejectedError('Private and loopback addresses are not allowed.', 400)
  }
  if (!isAllowedHost(url.hostname)) {
    throw new UrlRejectedError('This URL is not on the allowlist of supported sites.', 403)
  }
  return url
}
