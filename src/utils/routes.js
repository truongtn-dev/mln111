export function normalizePath(pathname = window.location.pathname) {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p
}

export function isAdminRoute(pathname = window.location.pathname) {
  return normalizePath(pathname) === '/admin'
}

export function navigateTo(path) {
  const target = path.startsWith('/') ? path : `/${path}`
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
