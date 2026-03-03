// Default secret path used for the admin dashboard
export const DEFAULT_ADMIN_SECRET_PATH = 'beatpoppa-secured';

// Helper to get admin links
export const getAdminLink = (path: string, customPath?: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const secretPath = customPath || DEFAULT_ADMIN_SECRET_PATH;
  return `/${secretPath}${cleanPath === '/' ? '' : cleanPath}`;
};
