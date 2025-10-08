export function normalizeUrl(input: string): string {
  let normalized = input.toLowerCase().trim();

  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  // Validate that we have a domain
  if (!normalized || normalized.startsWith('/') || !normalized.includes('.')) {
    throw new Error('Invalid URL: must contain a valid domain');
  }

  // Basic domain validation - should have at least one dot and valid characters
  const domainPart = normalized.split('/')[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domainPart)) {
    throw new Error('Invalid URL: domain format is invalid');
  }

  return normalized;
}

export function isUrlAllowed(url: string, allowedUrls: string[]): boolean {
  try {
    const normalizedUrl = normalizeUrl(url);

    for (const allowedUrl of allowedUrls) {
      if (matchesAllowedUrl(normalizedUrl, allowedUrl)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function matchesAllowedUrl(url: string, allowedUrl: string): boolean {
  const urlParts = url.split('/');
  const allowedParts = allowedUrl.split('/');

  const domain = urlParts[0];
  const allowedDomain = allowedParts[0];
  const path = urlParts.slice(1).join('/');
  const allowedPath = allowedParts.slice(1).join('/');

  if (!isDomainAllowed(domain, allowedDomain)) {
    return false;
  }

  if (!isPathAllowed(path, allowedPath)) {
    return false;
  }

  return true;
}

function isDomainAllowed(domain: string, allowedDomain: string): boolean {
  // Exact match
  if (domain === allowedDomain) {
    return true;
  }

  // Subdomain match - message domain should end with ".allowedDomain"
  // This prevents bypass attempts like "evil-alloweddomain.com"
  if (domain.endsWith(`.${allowedDomain}`)) {
    return true;
  }

  return false;
}

function isPathAllowed(path: string, allowedPath: string): boolean {
  // If no specific path is required, any path is allowed
  if (!allowedPath) {
    return true;
  }

  // Allowed path must be prefix of message path
  // This allows "allowed.com/path" to match "allowed.com/path/subpath"
  // but not "allowed.com/otherpath"
  if (!path.startsWith(allowedPath)) {
    return false;
  }

  return true;
}

export function extractUrlsFromMessage(content: string): string[] {
  const URL_REGEX = /https?:\/\/(?:www\.)?[\w#%+.:=@~-]{1,256}\.[\d()A-Za-z]{1,6}\b[\w#%&()+./:=?@~-]*/g;
  return content.match(URL_REGEX) || [];
}
