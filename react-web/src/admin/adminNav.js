/** Admin drawer & dashboard quick links (System Administrator only). */
export const ADMIN_NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/', icon: 'home' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard/admin', icon: 'dashboard' },
  { id: 'users', label: 'Users', path: '/dashboard/admin/users', icon: 'users' },
  { id: 'properties', label: 'Properties', path: '/dashboard/admin/properties', icon: 'property' },
  { id: 'verification', label: 'Verify Users', path: '/dashboard/admin/verification', icon: 'shield' },
  { id: 'database', label: 'Database', path: '/dashboard/admin/database', icon: 'database' },
  { id: 'settings', label: 'Settings', path: '/dashboard/admin/settings', icon: 'settings' },
]

export const ADMIN_QUICK_ACTIONS = [
  {
    id: 'settings',
    title: 'Settings',
    hint: 'Pin campus coordinates for all universities',
    path: '/dashboard/admin/settings',
    icon: 'settings',
  },
  {
    id: 'database',
    title: 'Database',
    hint: 'Browse and edit whitelisted tables without phpMyAdmin',
    path: '/dashboard/admin/database',
    icon: 'database',
  },
  {
    id: 'users',
    title: 'Users',
    hint: 'Manage student and landlord accounts',
    path: '/dashboard/admin/users',
    icon: 'users',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    hint: 'Administrator overview',
    path: '/dashboard/admin',
    icon: 'dashboard',
  },
  {
    id: 'home',
    title: 'Public site',
    hint: 'View the student-facing landing page',
    path: '/',
    icon: 'home',
  },
]
