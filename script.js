// Sophrosyne RSS Reader - Modern JavaScript
// Based on FormBiz.biz design system
// by Sophrosyne AI Lab

class SophrosyneRSSReader {
    constructor() {
        this.feeds = [];
        this.articles = [];
        this.currentFeed = null;
        this.currentArticle = null;
        this.readArticles = new Set();
        this.settings = this.loadSettings();
        
        // CORS 프록시 목록 (백업 체인)
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://test.cors.workers.dev/?',
            ''  // 직접 요청 시도
        ];
        
        this.parser = new RSSParser({
            customFields: {
                item: [
                    ['media:content', 'mediaContent', { keepArray: true }],
                    ['content:encoded', 'contentEncoded'],
                    ['description', 'description'],
                    ['dc:creator', 'creator']
                ]
            }
        });
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFeeds();
        this.loadReadArticles();
        this.loadFromURL();
        this.applyTheme();
    }
    
    setupEventListeners() {
        // 테마 토글
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 설정 모달
        document.getElementById('settings-toggle').addEventListener('click', () => {
            this.showSettings();
        });
        
        document.getElementById('close-settings').addEventListener('click', () => {
            this.hideSettings();
        });
        
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('cancel-settings').addEventListener('click', () => {
            this.hideSettings();
        });
        
        // 피드 추가
        document.getElementById('add-feed-btn').addEventListener('click', () => {
            this.showFeedForm();
        });
        
        document.getElementById('add-feed-submit').addEventListener('click', () => {
            this.addFeed();
        });
        
        document.getElementById('add-feed-cancel').addEventListener('click', () => {
            this.hideFeedForm();
        });
        
        // OPML 업로드
        document.getElementById('opml-upload').addEventListener('change', (e) => {
            this.handleOPMLUpload(e);
        });
        
        // 기타 버튼들
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshCurrentFeed();
        });
        
        document.getElementById('mark-all-read').addEventListener('click', () => {
            this.markAllRead();
        });
        
        document.getElementById('export-opml').addEventListener('click', () => {
            this.exportOPML();
        });
        
        document.getElementById('clear-cache').addEventListener('click', () => {
            this.clearCache();
        });
        
        // 기사 내용 닫기
        document.getElementById('close-article').addEventListener('click', () => {
            this.closeArticle();
        });
        
        // 읽음/안읽음 표시
        document.getElementById('mark-read-btn').addEventListener('click', () => {
            this.markCurrentArticleRead();
        });
        
        document.getElementById('mark-unread-btn').addEventListener('click', () => {
            this.markCurrentArticleUnread();
        });
        
        // 공유
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareCurrentArticle();
        });
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // 모바일 메뉴
        this.setupMobileMenu();
        
        // Enter 키로 피드 추가
        document.getElementById('feed-url-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addFeed();
            }
        });
        
        // 모바일에서 헤더 클릭으로 상세 닫기
        document.getElementById('main-header').addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 && 
                document.getElementById('article-content').classList.contains('show')) {
                this.closeArticle();
            }
        });
        
        // 모달 외부 클릭으로 닫기
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideSettings();
            }
        });
    }
    
    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('show');
        });
        
        // 사이드바 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
    }
    
    // 테마 관리
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveSettingsToStorage();
        this.showToast(`${this.settings.theme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다`, 'success');
    }
    
    applyTheme() {
        const html = document.documentElement;
        const themeIcon = document.querySelector('.theme-icon');
        
        if (this.settings.theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️';
        } else {
            html.setAttribute('data-theme', 'light');
            if (themeIcon) themeIcon.textContent = '🌙';
        }
        
        // 메타 테마 색상 업데이트
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = this.settings.theme === 'dark' ? '#1e293b' : '#0ea5e9';
        }
    }
    
    // 설정 관리
    loadSettings() {
        const defaultSettings = {
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            cacheTTL: 60,
            responseLimit: 100,
            blocklist: '',
            autoMarkRead: false,
            hideReadPosts: false
        };
        
        try {
            const saved = localStorage.getItem('sophrosyne-rss-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    }
    
    saveSettingsToStorage() {
        localStorage.setItem('sophrosyne-rss-settings', JSON.stringify(this.settings));
    }
    
    showSettings() {
        document.getElementById('cache-ttl').value = this.settings.cacheTTL;
        document.getElementById('response-limit').value = this.settings.responseLimit;
        document.getElementById('blocklist').value = this.settings.blocklist;
        document.getElementById('auto-mark-read').checked = this.settings.autoMarkRead;
        document.getElementById('hide-read-posts').checked = this.settings.hideReadPosts;
        document.getElementById('settings-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    hideSettings() {
        document.getElementById('settings-modal').style.display = 'none';
        document.body.style.overflow = '';
    }
    
    saveSettings() {
        this.settings.cacheTTL = parseInt(document.getElementById('cache-ttl').value) || 60;
        this.settings.responseLimit = parseInt(document.getElementById('response-limit').value) || 100;
        this.settings.blocklist = document.getElementById('blocklist').value;
        this.settings.autoMarkRead = document.getElementById('auto-mark-read').checked;
        this.settings.hideReadPosts = document.getElementById('hide-read-posts').checked;
        
        this.saveSettingsToStorage();
        this.hideSettings();
        this.updateArticleList();
        this.showToast('설정이 저장되었습니다', 'success');
    }
    
    // 피드 관리
    showFeedForm() {
        document.getElementById('feed-form').style.display = 'block';
        document.getElementById('feed-url-input').focus();
    }
    
    hideFeedForm() {
        document.getElementById('feed-form').style.display = 'none';
        document.getElementById('feed-url-input').value = '';
    }
    
    async addFeed() {
        const url = document.getElementById('feed-url-input').value.trim();
        if (!url) {
            this.showToast('RSS URL을 입력해주세요', 'error');
            return;
        }
        
        // URL 유효성 검사
        try {
            new URL(url);
        } catch {
            this.showToast('올바른 URL을 입력해주세요', 'error');
            return;
        }
        
        // 중복 확인
        if (this.feeds.some(feed => feed.url === url)) {
            this.showToast('이미 추가된 피드입니다', 'error');
            return;
        }
        
        this.showLoading('피드를 추가하는 중...');
        
        try {
            const feedData = await this.fetchFeed(url);
            const feed = {
                id: Date.now().toString(),
                url: url,
                title: feedData.title || '제목 없음',
                description: feedData.description || '',
                articles: feedData.items || [],
                addedDate: new Date()
            };
            
            this.feeds.push(feed);
            this.saveFeeds();
            this.renderFeeds();
            this.hideFeedForm();
            this.hideLoading();
            this.showToast(`"${feed.title}" 피드가 추가되었습니다`, 'success');
        } catch (error) {
            this.hideLoading();
            console.error('Feed add error:', error);
            this.showToast('피드 추가 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }
    
    deleteFeed(feedId) {
        const feed = this.feeds.find(f => f.id === feedId);
        if (!feed) return;
        
        if (!confirm(`"${feed.title}" 피드를 삭제하시겠습니까?`)) return;
        
        this.feeds = this.feeds.filter(feed => feed.id !== feedId);
        this.saveFeeds();
        this.renderFeeds();
        
        // 현재 선택된 피드가 삭제된 경우 초기화
        if (this.currentFeed && this.currentFeed.id === feedId) {
            this.currentFeed = null;
            this.currentArticle = null;
            document.getElementById('current-feed-title').textContent = '피드를 선택하세요';
            document.getElementById('article-items').innerHTML = `
                <div class="welcome-message">
                    <h3>Sophrosyne RSS Reader에 오신 것을 환영합니다!</h3>
                    <p>왼쪽 사이드바에서 RSS 피드를 추가하여 시작하세요.</p>
                    <div class="features-list">
                        <div class="feature-item">📡 RSS/Atom 피드 지원</div>
                        <div class="feature-item">📁 OPML 파일 가져오기/내보내기</div>
                        <div class="feature-item">🌙 다크/라이트 모드 <span class="shortcut-inline">(T)</span></div>
                        <div class="feature-item">⌨️ 키보드 단축키 지원 <span class="shortcut-inline">(J/K 이동)</span></div>
                        <div class="feature-item">📱 모바일 최적화</div>
                        <div class="feature-item">⚡ 오프라인 캐싱</div>
                    </div>
                </div>
            `;
            this.closeArticle();
        }
        
        this.showToast('피드가 삭제되었습니다', 'success');
    }
    
    async fetchFeed(url) {
        let lastError;
        
        // 캐시 확인
        const cached = this.getCache(url);
        if (cached) {
            console.log(`캐시된 피드 사용: ${url}`);
            return cached;
        }
        
        // 프록시 체인으로 시도
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxy = this.corsProxies[i];
            const proxyUrl = proxy + encodeURIComponent(url);
            
            try {
                console.log(`프록시 ${i + 1} 시도: ${proxy || 'Direct'}`);
                const response = await this.fetchWithLimit(proxyUrl, this.settings.responseLimit);
                
                if (response.ok) {
                    const data = await response.text();
                    const feedData = await this.parser.parseString(data);
                    
                    // 캐시 저장
                    this.setCache(url, feedData);
                    console.log(`프록시 ${i + 1} 성공: ${proxy || 'Direct'}`);
                    return feedData;
                }
            } catch (error) {
                lastError = error;
                console.log(`프록시 ${i + 1} 실패:`, error.message);
                continue;
            }
        }
        
        throw new Error(lastError?.message || '모든 프록시에서 피드를 가져오지 못했습니다');
    }
    
    async fetchWithLimit(url, limitKB) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Sophrosyne RSS Reader/1.0'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('요청 시간이 초과되었습니다');
            }
            throw error;
        }
    }
    
    // 캐시 관리
    getCacheKey(url) {
        return `sophrosyne-rss-cache-${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
    }
    
    setCache(url, data) {
        if (this.settings.cacheTTL === 0) return;
        
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(this.getCacheKey(url), JSON.stringify(cacheData));
        } catch (error) {
            console.warn('캐시 저장 실패:', error);
        }
    }
    
    getCache(url) {
        if (this.settings.cacheTTL === 0) return null;
        
        try {
            const cached = localStorage.getItem(this.getCacheKey(url));
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const elapsed = Date.now() - cacheData.timestamp;
            const maxAge = this.settings.cacheTTL * 60 * 1000;
            
            if (elapsed > maxAge) {
                localStorage.removeItem(this.getCacheKey(url));
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            return null;
        }
    }
    
    clearCache() {
        const keys = Object.keys(localStorage);
        let cleared = 0;
        keys.forEach(key => {
            if (key.startsWith('sophrosyne-rss-cache-')) {
                localStorage.removeItem(key);
                cleared++;
            }
        });
        this.showToast(`${cleared}개의 캐시 항목이 삭제되었습니다`, 'success');
    }
    
    // OPML 처리
    async handleOPMLUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showLoading('OPML 파일을 처리하는 중...');
        
        try {
            const content = await this.readFile(file);
            const feeds = this.parseOPML(content);
            let added = 0;
            let skipped = 0;
            
            for (const feed of feeds) {
                try {
                    // 중복 확인
                    if (this.feeds.some(f => f.url === feed.xmlUrl)) {
                        skipped++;
                        continue;
                    }
                    
                    const feedData = await this.fetchFeed(feed.xmlUrl);
                    this.feeds.push({
                        id: Date.now().toString() + Math.random(),
                        url: feed.xmlUrl,
                        title: feedData.title || feed.title,
                        description: feedData.description || '',
                        articles: feedData.items || [],
                        addedDate: new Date()
                    });
                    added++;
                } catch (error) {
                    console.warn(`피드 추가 실패: ${feed.title}`, error);
                    skipped++;
                }
            }
            
            this.saveFeeds();
            this.renderFeeds();
            this.hideLoading();
            
            let message = `${added}개의 피드가 추가되었습니다`;
            if (skipped > 0) {
                message += ` (${skipped}개 건너뜀)`;
            }
            this.showToast(message, 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('OPML 파일 처리 중 오류가 발생했습니다', 'error');
        }
        
        event.target.value = '';
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    parseOPML(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');
        
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('OPML 파싱 오류');
        }
        
        const outlines = doc.querySelectorAll('outline[xmlUrl]');
        return Array.from(outlines).map(outline => ({
            title: outline.getAttribute('text') || outline.getAttribute('title') || '제목 없음',
            xmlUrl: outline.getAttribute('xmlUrl'),
            htmlUrl: outline.getAttribute('htmlUrl') || outline.getAttribute('xmlUrl')
        }));
    }
    
    exportOPML() {
        if (this.feeds.length === 0) {
            this.showToast('내보낼 피드가 없습니다', 'error');
            return;
        }
        
        const opml = this.generateOPML();
        const blob = new Blob([opml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sophrosyne-rss-feeds-${new Date().toISOString().split('T')[0]}.opml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('OPML 파일이 다운로드되었습니다', 'success');
    }
    
    generateOPML() {
        const feeds = this.feeds.map(feed => 
            `    <outline text="${this.escapeXml(feed.title)}" xmlUrl="${this.escapeXml(feed.url)}" htmlUrl="${this.escapeXml(feed.url)}"/>`
        ).join('\n');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Sophrosyne RSS Reader Feeds</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <ownerName>Sophrosyne AI Lab</ownerName>
  </head>
  <body>
${feeds}
  </body>
</opml>`;
    }
    
    escapeXml(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
    }
    
    // 날짜 포맷팅
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}${month}${day} ${hours}:${minutes}:${seconds}`;
    }
    
    // 피드 및 기사 렌더링
    renderFeeds() {
        const feedList = document.getElementById('feed-list');
        
        if (this.feeds.length === 0) {
            feedList.innerHTML = `
                <div class="welcome-message">
                    <p>피드를 추가하여 시작하세요</p>
                </div>
            `;
            return;
        }
        
        feedList.innerHTML = '';
        
        this.feeds.forEach(feed => {
            const feedElement = document.createElement('div');
            feedElement.className = 'feed-item';
            feedElement.innerHTML = `
                <div class="feed-icon">📡</div>
                <div class="feed-info">
                    <div class="feed-name">${this.escapeHtml(feed.title)}</div>
                    <div class="feed-count">${feed.articles.length}개 항목</div>
                    <div class="feed-date">${this.formatDate(feed.addedDate)}</div>
                </div>
                <button class="feed-delete" title="피드 삭제">✕</button>
            `;
            
            // 피드 선택 이벤트
            feedElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('feed-delete')) {
                    this.selectFeed(feed, feedElement);
                }
            });
            
            // 피드 삭제 이벤트
            const deleteBtn = feedElement.querySelector('.feed-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFeed(feed.id);
            });
            
            feedList.appendChild(feedElement);
        });
    }
    
    selectFeed(feed, element) {
        this.currentFeed = feed;
        
        // 활성 피드 표시
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (element) {
            element.classList.add('active');
        }
        
        this.renderArticles();
        
        // 모바일에서 사이드바 닫기
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('show');
        }
    }
    
    renderArticles() {
        if (!this.currentFeed) return;
        
        document.getElementById('current-feed-title').textContent = this.currentFeed.title;
        
        const articleItems = document.getElementById('article-items');
        articleItems.innerHTML = '';
        
        let articles = [...this.currentFeed.articles];
        
        // 필터링
        if (this.settings.blocklist.trim()) {
            const blocklist = this.settings.blocklist.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
            articles = articles.filter(article => {
                const content = `${article.title} ${article.contentSnippet || ''}`.toLowerCase();
                return !blocklist.some(word => content.includes(word));
            });
        }
        
        if (this.settings.hideReadPosts) {
            articles = articles.filter(article => !this.readArticles.has(article.link));
        }
        
        // 정렬 (최신순)
        articles.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        
        if (articles.length === 0) {
            articleItems.innerHTML = `
                <div class="welcome-message">
                    <h3>표시할 기사가 없습니다</h3>
                    <p>필터 설정을 확인해보세요</p>
                </div>
            `;
            return;
        }
        
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article-item';
            
            const isRead = this.readArticles.has(article.link);
            if (isRead) {
                articleElement.classList.add('read');
            } else {
                articleElement.classList.add('unread');
            }
            
            const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';
            
            articleElement.innerHTML = `
                <div class="article-title">${this.escapeHtml(article.title || '제목 없음')}</div>
                <div class="article-meta">
                    <span>${pubDate}</span>
                    <span>${this.escapeHtml(article.creator || this.currentFeed.title)}</span>
                </div>
                <div class="article-excerpt">${this.escapeHtml(this.truncateText(article.contentSnippet || article.description || '', 150))}</div>
            `;
            
            articleElement.addEventListener('click', () => {
                this.selectArticle(article, articleElement);
            });
            
            articleItems.appendChild(articleElement);
        });
    }
    
    updateArticleList() {
        if (this.currentFeed) {
            this.renderArticles();
        }
    }
    
    selectArticle(article, element) {
        this.currentArticle = article;
        
        // 활성 기사 표시
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
        
        this.renderArticleContent();
        this.updateReadUnreadButtons();
        
        // 자동 읽음 표시
        if (this.settings.autoMarkRead) {
            this.markArticleRead(article.link);
            element.classList.remove('unread');
            element.classList.add('read');
        }
        
        // 모바일에서 기사 내용 표시
        if (window.innerWidth <= 1024) {
            document.getElementById('article-content').classList.add('show');
            document.getElementById('main-header').classList.add('article-open');
        }
    }
    
    updateReadUnreadButtons() {
        if (!this.currentArticle) return;
        
        const isRead = this.readArticles.has(this.currentArticle.link);
        const readBtn = document.getElementById('mark-read-btn');
        const unreadBtn = document.getElementById('mark-unread-btn');
        
        if (isRead) {
            readBtn.style.display = 'none';
            unreadBtn.style.display = 'inline-flex';
        } else {
            readBtn.style.display = 'inline-flex';
            unreadBtn.style.display = 'none';
        }
    }
    
    renderArticleContent() {
        if (!this.currentArticle) return;
        
        document.getElementById('article-content-header').style.display = 'flex';
        
        const contentBody = document.getElementById('article-content-body');
        const article = this.currentArticle;
        
        const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'short'
        }) : '';
        
        const content = article.contentEncoded || article.content || article.description || '';
        
        contentBody.innerHTML = `
            <div class="article-content-inner">
                <h1>${this.escapeHtml(article.title || '제목 없음')}</h1>
                <div class="article-meta">
                    <div><strong>작성:</strong> ${this.escapeHtml(article.creator || this.currentFeed.title)}</div>
                    <div><strong>발행:</strong> ${pubDate}</div>
                    <div><a href="${article.link}" target="_blank" rel="noopener">원문 보기 →</a></div>
                </div>
                <div class="article-body">${this.sanitizeHtml(content)}</div>
            </div>
        `;
    }
    
    closeArticle() {
        document.getElementById('article-content').classList.remove('show');
        document.getElementById('article-content-header').style.display = 'none';
        document.getElementById('main-header').classList.remove('article-open');
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
        this.currentArticle = null;
        
        // 기본 플레이스홀더 표시
        document.getElementById('article-content-body').innerHTML = `
            <div class="content-placeholder">
                <h3>📖 기사를 선택해주세요</h3>
                <p>왼쪽 목록에서 읽고 싶은 기사를 클릭하거나 <span class="shortcut-inline">J/K</span> 키로 이동하세요.</p>
            </div>
        `;
    }
    
    // 읽음 표시 관리
    markCurrentArticleRead() {
        if (!this.currentArticle) return;
        
        this.markArticleRead(this.currentArticle.link);
        this.updateCurrentArticleUI();
        this.updateReadUnreadButtons();
        this.showToast('읽음으로 표시되었습니다', 'success');
    }
    
    markCurrentArticleUnread() {
        if (!this.currentArticle) return;
        
        this.markArticleUnread(this.currentArticle.link);
        this.updateCurrentArticleUI();
        this.updateReadUnreadButtons();
        this.showToast('안 읽음으로 표시되었습니다', 'success');
    }
    
    updateCurrentArticleUI() {
        const activeElement = document.querySelector('.article-item.active');
        if (!activeElement) return;
        
        const isRead = this.readArticles.has(this.currentArticle.link);
        if (isRead) {
            activeElement.classList.remove('unread');
            activeElement.classList.add('read');
        } else {
            activeElement.classList.remove('read');
            activeElement.classList.add('unread');
        }
    }
    
    markArticleRead(link) {
        this.readArticles.add(link);
        this.saveReadArticles();
    }
    
    markArticleUnread(link) {
        this.readArticles.delete(link);
        this.saveReadArticles();
    }
    
    markAllRead() {
        if (!this.currentFeed) return;
        
        let marked = 0;
        this.currentFeed.articles.forEach(article => {
            if (!this.readArticles.has(article.link)) {
                this.readArticles.add(article.link);
                marked++;
            }
        });
        
        this.saveReadArticles();
        this.renderArticles();
        this.showToast(`${marked}개의 기사를 읽음으로 표시했습니다`, 'success');
    }
    
    loadReadArticles() {
        try {
            const saved = localStorage.getItem('sophrosyne-rss-read');
            if (saved) {
                this.readArticles = new Set(JSON.parse(saved));
            }
        } catch (error) {
            console.warn('읽음 표시 로드 실패:', error);
        }
    }
    
    saveReadArticles() {
        try {
            localStorage.setItem('sophrosyne-rss-read', JSON.stringify([...this.readArticles]));
        } catch (error) {
            console.warn('읽음 표시 저장 실패:', error);
        }
    }
    
    // 기타 기능
    shareCurrentArticle() {
        if (!this.currentArticle) return;
        
        const shareData = {
            title: this.currentArticle.title,
            text: this.currentArticle.contentSnippet || '',
            url: this.currentArticle.link
        };
        
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData).catch(console.error);
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(this.currentArticle.link).then(() => {
                this.showToast('링크가 클립보드에 복사되었습니다', 'success');
            }).catch(() => {
                this.showToast('링크 복사에 실패했습니다', 'error');
            });
        } else {
            this.showToast('공유 기능을 지원하지 않습니다', 'error');
        }
    }
    
    async refreshCurrentFeed() {
        if (!this.currentFeed) {
            this.showToast('선택된 피드가 없습니다', 'error');
            return;
        }
        
        this.showLoading('피드를 새로고침하는 중...');
        
        try {
            // 캐시 삭제
            localStorage.removeItem(this.getCacheKey(this.currentFeed.url));
            
            const feedData = await this.fetchFeed(this.currentFeed.url);
            const oldCount = this.currentFeed.articles.length;
            this.currentFeed.articles = feedData.items || [];
            const newCount = this.currentFeed.articles.length;
            
            this.saveFeeds();
            this.renderFeeds();
            this.renderArticles();
            this.hideLoading();
            
            const diff = newCount - oldCount;
            if (diff > 0) {
                this.showToast(`${diff}개의 새 기사를 발견했습니다`, 'success');
            } else if (diff === 0) {
                this.showToast('새로운 기사가 없습니다', 'success');
            } else {
                this.showToast('피드가 새로고침되었습니다', 'success');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Feed refresh error:', error);
            this.showToast('피드 새로고침 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }
    
    // 키보드 단축키
    handleKeyboard(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        
        switch (event.key) {
            case 'r':
            case 'R':
                event.preventDefault();
                this.refreshCurrentFeed();
                break;
            case 'm':
            case 'M':
                event.preventDefault();
                this.markCurrentArticleRead();
                break;
            case 'u':
            case 'U':
                event.preventDefault();
                this.markCurrentArticleUnread();
                break;
            case 'Escape':
                event.preventDefault();
                this.closeArticle();
                this.hideSettings();
                break;
            case 'j':
            case 'J':
                event.preventDefault();
                this.selectNextArticle();
                break;
            case 'k':
            case 'K':
                event.preventDefault();
                this.selectPreviousArticle();
                break;
            case 't':
            case 'T':
                event.preventDefault();
                this.toggleTheme();
                break;
        }
    }
    
    selectNextArticle() {
        const articles = document.querySelectorAll('.article-item');
        const current = document.querySelector('.article-item.active');
        if (!current && articles.length > 0) {
            articles[0].click();
        } else if (current) {
            const next = current.nextElementSibling;
            if (next && next.classList.contains('article-item')) {
                next.click();
            }
        }
    }
    
    selectPreviousArticle() {
        const current = document.querySelector('.article-item.active');
        if (current) {
            const prev = current.previousElementSibling;
            if (prev && prev.classList.contains('article-item')) {
                prev.click();
            }
        }
    }
    
    // 저장소 관리
    saveFeeds() {
        try {
            localStorage.setItem('sophrosyne-rss-feeds', JSON.stringify(this.feeds));
        } catch (error) {
            console.warn('피드 저장 실패:', error);
        }
    }
    
    loadFeeds() {
        try {
            const saved = localStorage.getItem('sophrosyne-rss-feeds');
            if (saved) {
                this.feeds = JSON.parse(saved).map(feed => ({
                    ...feed,
                    addedDate: feed.addedDate ? new Date(feed.addedDate) : new Date()
                }));
                this.renderFeeds();
            }  
        } catch (error) {
            console.warn('피드 로드 실패:', error);
        }
    }
    
    // URL 상태 관리
    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const feedUrls = params.get('feeds');
        
        if (feedUrls && this.feeds.length === 0) {
            const urls = feedUrls.split(',');
            urls.forEach(async (url) => {
                if (url.trim()) {
                    document.getElementById('feed-url-input').value = url.trim();
                    await this.addFeed();
                }
            });
        }
    }
    
    updateURL() {
        if (this.feeds.length > 0) {
            const feedUrls = this.feeds.map(f => f.url).join(',');
            const url = new URL(window.location);
            url.searchParams.set('feeds', feedUrls);
            history.replaceState(null, '', url);
        }
    }
    
    // UI 헬퍼
    showLoading(message = '로딩 중...') {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('p').textContent = message;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
        document.body.style.overflow = '';
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
    
    // 텍스트 처리
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        
        // 위험한 요소 제거
        const dangerous = div.querySelectorAll('script, object, embed, iframe, form, input, button');
        dangerous.forEach(el => el.remove());
        
        // 모든 링크에 안전한 속성 추가
        const links = div.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // 이미지 로딩 오류 처리
        const images = div.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', () => {
                img.style.display = 'none';
            });
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });
        
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.sophrosyneRSS = new SophrosyneRSSReader();
    
    // 시스템 테마 변경 감지
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('sophrosyne-rss-settings')) {
            window.sophrosyneRSS.settings.theme = e.matches ? 'dark' : 'light';
            window.sophrosyneRSS.applyTheme();
        }
    });
});

// 서비스 워커 업데이트 감지
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}