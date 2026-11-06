/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

const CACHE = 'pulsex-v1'
const manifest = self.__WB_MANIFEST || []
const urls = manifest.map((e) => e.url)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(urls.filter((u) => !u.endsWith('.map'))).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

// Network-first for navigation, cache-first for built assets
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html').then((r) => r ?? caches.match('index.html')).then((r) => r ?? Response.error())))
    return
  }
  event.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok && new URL(req.url).pathname.startsWith('/assets/')) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
      }
      return res
    })),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url: string = (event.notification.data && event.notification.data.url) || '/#/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      const target = new URL(url, self.location.origin).href
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url })
          await client.focus()
          return
        }
      }
      await self.clients.openWindow(target)
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
