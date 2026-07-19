export const getURL = () => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000/';
  url = url.includes('http') ? url : `https://${url}`;
  url = url.endsWith('/') ? url : `${url}/`;
  return url;
};

export const getAuthCallbackURL = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  return `${getURL()}auth/callback`;
};
