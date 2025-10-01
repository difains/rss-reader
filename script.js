// Sophrosyne RSS Reader - Main JavaScript
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
        this.updateTheme();
        this.loadFromURL();
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
        
        // 읽음 표시
        document.getElementById('mark-read-btn').addEventListener('click', () => {
            this.markCurrentArticleRead();
        });
        
        // 공유
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareCurrentArticle();
        });
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // 모바일 사이드바 토글
        this.setupMobileMenu();
    }
    
    setupMobileMenu() {
        const headerControls = document.querySelector('.header-controls');
        const sidebar = document.getElementById('sidebar');
        
        if (window.innerWidth <= 768) {
            headerControls.addEventListener('click', (e) => {
                if (e.target === headerControls || e.target.textContent === '☰') {
                    sidebar.classList.toggle('show');
                }
            });
            
            // 사이드바 외부 클릭 시 닫기
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !headerControls.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            });
        }
    }
    
    // 설정 관리
    loadSettings() {
        const defaultSettings = {
            theme: 'light',
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
    }
    
    hideSettings() {
        document.getElementById('settings-modal').style.display = 'none';
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
    
    // 테마 관리
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.updateTheme();
        this.saveSettingsToStorage();
    }
    
    updateTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = this.settings.theme === 'light' ? '🌙' : '☀️';
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
        if (!url) return;
        
        this.showLoading('피드를 추가하는 중...');
        
        try {
            const feedData = await this.fetchFeed(url);
            const feed = {
                id: Date.now().toString(),
                url: url,
                title: feedData.title || '제목 없음',
                description: feedData.description || '',
                articles: feedData.items || []
            };
            
            this.feeds.push(feed);
            this.saveFeeds();
            this.renderFeeds();
            this.hideFeedForm();
            this.hideLoading();
            this.showToast(`"${feed.title}" 피드가 추가되었습니다`, 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('피드 추가 중 오류가 발생했습니다: ' + error.message, 'error');
        }
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
                console.log(`프록시 ${i + 1} 시도: ${proxy}`);
                const response = await this.fetchWithLimit(proxyUrl, this.settings.responseLimit);
                
                if (response.ok) {
                    const data = await response.text();
                    const feedData = await this.parser.parseString(data);
                    
                    // 캐시 저장
                    this.setCache(url, feedData);
                    console.log(`프록시 ${i + 1} 성공: ${proxy}`);
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
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // 캐시 관리
    getCacheKey(url) {
        return `sophrosyne-rss-cache-${btoa(url)}`;
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
        keys.forEach(key => {
            if (key.startsWith('sophrosyne-rss-cache-')) {
                localStorage.removeItem(key);
            }
        });
        this.showToast('캐시가 삭제되었습니다', 'success');
    }
    
    // OPML 처리
    async handleOPMLUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showLoading('OPML 파일을 처리하는 중...');
        
        try {
            const content = await this.readFile(file);
            const feeds = this.parseOPML(content);
            
            for (const feed of feeds) {
                try {
                    const feedData = await this.fetchFeed(feed.xmlUrl);
                    this.feeds.push({
                        id: Date.now().toString() + Math.random(),
                        url: feed.xmlUrl,
                        title: feedData.title || feed.title,
                        description: feedData.description || '',
                        articles: feedData.items || []
                    });
                } catch (error) {
                    console.warn(`피드 추가 실패: ${feed.title}`, error);
                }
            }
            
            this.saveFeeds();
            this.renderFeeds();
            this.hideLoading();
            this.showToast(`${feeds.length}개의 피드가 추가되었습니다`, 'success');
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
    
    // 피드 및 기사 렌더링
    renderFeeds() {
        const feedList = document.getElementById('feed-list');
        feedList.innerHTML = '';
        
        this.feeds.forEach(feed => {
            const feedElement = document.createElement('div');
            feedElement.className = 'feed-item';
            feedElement.innerHTML = `
                <div class="feed-icon">📡</div>
                <div class="feed-info">
                    <div class="feed-name">${this.escapeHtml(feed.title)}</div>
                    <div class="feed-count">${feed.articles.length}개 항목</div>
                </div>
            `;
            
            feedElement.addEventListener('click', () => {
                this.selectFeed(feed);
            });
            
            feedList.appendChild(feedElement);
        });
    }
    
    selectFeed(feed) {
        this.currentFeed = feed;
        
        // 활성 피드 표시
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
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
        
        let articles = this.currentFeed.articles;
        
        // 필터링
        if (this.settings.blocklist) {
            const blocklist = this.settings.blocklist.toLowerCase().split(',').map(s => s.trim());
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
        
        articles.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.className = 'article-item';
            if (this.readArticles.has(article.link)) {
                articleElement.classList.add('read');
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
    
    selectArticle(article, element) {
        this.currentArticle = article;
        
        // 활성 기사 표시
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
        
        this.renderArticleContent();
        
        // 자동 읽음 표시
        if (this.settings.autoMarkRead) {
            this.markArticleRead(article.link);
            element.classList.add('read');
        }
        
        // 모바일에서 기사 내용 표시
        if (window.innerWidth <= 1024) {
            document.getElementById('article-content').classList.add('show');
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
            minute: '2-digit'
        }) : '';
        
        const content = article.contentEncoded || article.content || article.description || '';
        
        contentBody.innerHTML = `
            <div class="article-content-inner">
                <h1>${this.escapeHtml(article.title || '제목 없음')}</h1>
                <div class="article-meta">
                    <div>작성: ${this.escapeHtml(article.creator || this.currentFeed.title)}</div>
                    <div>발행: ${pubDate}</div>
                    <div><a href="${article.link}" target="_blank" rel="noopener">원문 보기 →</a></div>
                </div>
                <div class="article-body">${this.sanitizeHtml(content)}</div>
            </div>
        `;
    }
    
    closeArticle() {
        document.getElementById('article-content').classList.remove('show');
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
        this.currentArticle = null;
    }
    
    // 읽음 표시 관리
    markCurrentArticleRead() {
        if (!this.currentArticle) return;
        
        this.markArticleRead(this.currentArticle.link);
        document.querySelector('.article-item.active')?.classList.add('read');
        this.showToast('읽음으로 표시되었습니다', 'success');
    }
    
    markArticleRead(link) {
        this.readArticles.add(link);
        this.saveReadArticles();
    }
    
    markAllRead() {
        if (!this.currentFeed) return;
        
        this.currentFeed.articles.forEach(article => {
            this.readArticles.add(article.link);
        });
        
        this.saveReadArticles();
        this.renderArticles();
        this.showToast('모든 기사를 읽음으로 표시했습니다', 'success');
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
        
        if (navigator.share) {
            navigator.share({
                title: this.currentArticle.title,
                url: this.currentArticle.link
            });
        } else {
            navigator.clipboard.writeText(this.currentArticle.link).then(() => {
                this.showToast('링크가 클립보드에 복사되었습니다', 'success');
            });
        }
    }
    
    async refreshCurrentFeed() {
        if (!this.currentFeed) return;
        
        this.showLoading('피드를 새로고침하는 중...');
        
        try {
            // 캐시 삭제
            localStorage.removeItem(this.getCacheKey(this.currentFeed.url));
            
            const feedData = await this.fetchFeed(this.currentFeed.url);
            this.currentFeed.articles = feedData.items || [];
            
            this.saveFeeds();
            this.renderFeeds();
            this.renderArticles();
            this.hideLoading();
            this.showToast('피드가 새로고침되었습니다', 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('피드 새로고침 중 오류가 발생했습니다', 'error');
        }
    }
    
    // 키보드 단축키
    handleKeyboard(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        
        switch (event.key) {
            case 'r':
                this.refreshCurrentFeed();
                break;
            case 'm':
                this.markCurrentArticleRead();
                break;
            case 'Escape':
                this.closeArticle();
                break;
            case 'j':
                this.selectNextArticle();
                break;
            case 'k':
                this.selectPreviousArticle();
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
            if (next) next.click();
        }
    }
    
    selectPreviousArticle() {
        const current = document.querySelector('.article-item.active');
        if (current) {
            const prev = current.previousElementSibling;
            if (prev) prev.click();
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
                this.feeds = JSON.parse(saved);
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
        
        if (feedUrls) {
            const urls = feedUrls.split(',');
            urls.forEach(url => {
                document.getElementById('feed-url-input').value = url.trim();
                this.addFeed();
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
    }
    
    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // 텍스트 처리
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        
        // 위험한 요소 제거
        const dangerous = div.querySelectorAll('script, object, embed, iframe');
        dangerous.forEach(el => el.remove());
        
        // 이미지 로딩 오류 처리
        const images = div.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', () => {
                img.style.display = 'none';
            });
        });
        
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.sophrosyneRSS = new SophrosyneRSSReader();
});