export type UserRole = 'aloka' | 'staff';

export const USER_ROLE_STORAGE_KEY = 'sinhala_lottery_user_role';

export function getStoredUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(USER_ROLE_STORAGE_KEY);
    if (val === 'aloka' || val === 'staff') return val;
  } catch {}
  return null;
}

export function setStoredUserRole(role: UserRole | null) {
  if (typeof window === 'undefined') return;
  try {
    if (role) {
      localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(USER_ROLE_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('lottery_user_role_changed', { detail: { role } }));
  } catch {}
}
