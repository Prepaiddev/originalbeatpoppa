export function getInitials(nameOrEmail: string | undefined): string {
  if (!nameOrEmail) return '?';
  
  // Remove email domain if it's an email
  const name = nameOrEmail.split('@')[0];
  
  const parts = name.trim().split(/[\s_-]+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
