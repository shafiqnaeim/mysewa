/** Admin drawer & dashboard quick links (System Administrator only). */
export const ADMIN_NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/', icon: 'home' },
  { id: 'dashboard', label: 'myDashboard', path: '/admin', icon: 'dashboard' },
  { id: 'database', label: 'myDatabase', path: '/admin/database', icon: 'database' },
  { id: 'settings', label: 'mySettings', path: '/admin/settings', icon: 'settings' },
]

export const ADMIN_QUICK_ACTIONS = [
  {
    id: 'settings',
    title: 'mySettings',
    hint: 'Pin campus coordinates for all universities',
    path: '/admin/settings',
    icon: 'settings',
  },
  {
    id: 'database',
    title: 'myDatabase',
    hint: 'Browse and edit whitelisted tables without phpMyAdmin',
    path: '/admin/database',
    icon: 'database',
  },
  {
    id: 'dashboard',
    title: 'myDashboard',
    hint: 'Administrator overview',
    path: '/admin',
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
