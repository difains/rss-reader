// Sophrosyne RSS Reader - Service Worker
// by Sophrosyne AI Lab

const CACHE_NAME = 'sophrosyne-rss-v1.0.0';
const STATIC_CACHE_NAME = 'sophrosyne-rss-static-v1.0.0';
const DATA_CACHE_NAME = 'sophrosyne-rss-data-v1.0.0';

// 캐시할 정적 파일들
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/rss-parser@3/dist/rss-parser.min.js'
];

// 설치 이벤트
self.addEventListener('install', event => {
    console.log('[SW] 설치 중...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[SW] 정적 파일 캐싱 중...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] 설치 완료');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] 설치 실패:', error);
            })
    );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
    console.log('[SW] 활성화 중...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 이전 버전 캐시 삭제
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DATA_CACHE_NAME && 
                            cacheName !== CACHE_NAME) {
                            console.log('[SW] 이전 캐시 삭제:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] 활성화 완료');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('[SW] 활성화 실패:', error);
            })
    );
});

// 요청 가로채기
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // HTML 요청 처리 (App Shell)
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            const responseToCache = response.clone();
                            caches.open(STATIC_CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(() => {
                            // 오프라인 시 메인 페이지 반환
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }
    
    // RSS 피드 요청 처리
    if (isRSSRequest(request)) {
        event.respondWith(
            handleRSSRequest(request)
        );
        return;
    }
    
    // CORS 프록시 요청 처리
    if (isCORSProxyRequest(request)) {
        event.respondWith(
            handleCORSProxyRequest(request)
        );
        return;
    }
    
    // 정적 파일 요청 처리
    if (isStaticFile(request)) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            
                            const responseToCache = response.clone();
                            caches.open(STATIC_CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, responseToCache);
                                });
                            
                            return response;
                        });
                })
        );
        return;
    }
    
    // 기타 요청은 네트워크 우선
    event.respondWith(
        fetch(request)
            .catch(() => {
                return caches.match(request);
            })
    );
});

// RSS 요청 처리
async function handleRSSRequest(request) {
    const cacheKey = request.url;
    
    try {
        // 캐시 확인
        const cache = await caches.open(DATA_CACHE_NAME);
        const cached = await cache.match(cacheKey);
        
        if (cached) {
            const cacheDate = cached.headers.get('sw-cache-date');
            if (cacheDate) {
                const cacheTime = new Date(cacheDate).getTime();
                const now = Date.now();
                const maxAge = 30 * 60 * 1000; // 30분
                
                if (now - cacheTime < maxAge) {
                    console.log('[SW] RSS 캐시 사용:', cacheKey);
                    return cached;
                }
            }
        }
        
        // 네트워크에서 가져오기
        const response = await fetch(request);
        
        if (response.ok) {
            // 응답 복사 및 캐시 저장
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-date', new Date().toISOString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            cache.put(cacheKey, cachedResponse);
            console.log('[SW] RSS 캐시 저장:', cacheKey);
        }
        
        return response;
    } catch (error) {
        console.error('[SW] RSS 요청 실패:', error);
        
        // 캐시된 버전 반환 (있는 경우)
        const cache = await caches.open(DATA_CACHE_NAME);
        const cached = await cache.match(cacheKey);
        if (cached) {
            console.log('[SW] 오프라인 RSS 캐시 사용:', cacheKey);
            return cached;
        }
        
        throw error;
    }
}

// CORS 프록시 요청 처리
async function handleCORSProxyRequest(request) {
    const cacheKey = request.url;
    
    try {
        // 캐시 확인 (더 짧은 캐시 시간)
        const cache = await caches.open(DATA_CACHE_NAME);
        const cached = await cache.match(cacheKey);
        
        if (cached) {
            const cacheDate = cached.headers.get('sw-cache-date');
            if (cacheDate) {
                const cacheTime = new Date(cacheDate).getTime();
                const now = Date.now();
                const maxAge = 10 * 60 * 1000; // 10분
                
                if (now - cacheTime < maxAge) {
                    console.log('[SW] CORS 프록시 캐시 사용:', cacheKey);
                    return cached;
                }
            }
        }
        
        // 네트워크에서 가져오기
        const response = await fetch(request);
        
        if (response.ok) {
            // 응답 복사 및 캐시 저장
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-date', new Date().toISOString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            cache.put(cacheKey, cachedResponse);
            console.log('[SW] CORS 프록시 캐시 저장:', cacheKey);
        }
        
        return response;
    } catch (error) {
        console.error('[SW] CORS 프록시 요청 실패:', error);
        
        // 캐시된 버전 반환 (있는 경우)
        const cache = await caches.open(DATA_CACHE_NAME);
        const cached = await cache.match(cacheKey);
        if (cached) {
            console.log('[SW] 오프라인 CORS 프록시 캐시 사용:', cacheKey);
            return cached;
        }
        
        throw error;
    }
}

// 요청 타입 확인 함수들
function isRSSRequest(request) {
    const url = request.url.toLowerCase();
    return url.includes('.xml') || 
           url.includes('rss') || 
           url.includes('feed') || 
           url.includes('atom');
}

function isCORSProxyRequest(request) {
    const url = request.url.toLowerCase();
    return url.includes('allorigins.win') ||
           url.includes('corsproxy.io') ||
           url.includes('cors.workers.dev') ||
           url.includes('cors-anywhere');
}

function isStaticFile(request) {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop();
    const staticExtensions = ['css', 'js', 'json', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2'];
    return staticExtensions.includes(extension) || url.hostname === 'cdn.jsdelivr.net';
}

// 백그라운드 동기화 (선택적)
self.addEventListener('sync', event => {
    console.log('[SW] 백그라운드 동기화:', event.tag);
    
    if (event.tag === 'feed-sync') {
        event.waitUntil(syncFeeds());
    }
});

async function syncFeeds() {
    try {
        // 클라이언트에게 피드 동기화 요청
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_FEEDS',
                timestamp: Date.now()
            });
        });
        console.log('[SW] 피드 동기화 완료');
    } catch (error) {
        console.error('[SW] 피드 동기화 실패:', error);
    }
}

// 푸시 알림 처리 (향후 확장용)
self.addEventListener('push', event => {
    console.log('[SW] 푸시 메시지 수신:', event);
    
    const options = {
        body: '새로운 RSS 기사가 있습니다!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'rss-notification',
        renotify: true,
        actions: [
            {
                action: 'open',
                title: '읽기',
                icon: '/action-open.png'
            },
            {
                action: 'dismiss',
                title: '닫기',
                icon: '/action-dismiss.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Sophrosyne RSS Reader', options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('[SW] 알림 클릭:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 메시지 처리
self.addEventListener('message', event => {
    console.log('[SW] 메시지 수신:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.includes('sophrosyne-rss')) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// 에러 처리
self.addEventListener('error', event => {
    console.error('[SW] 에러 발생:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] 처리되지 않은 Promise 거부:', event.reason);
    event.preventDefault();
});

console.log('[SW] Sophrosyne RSS Reader Service Worker 로드됨');