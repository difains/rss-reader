# 📡 Sophrosyne RSS Reader

**Modern, clean RSS reader built by Sophrosyne AI Lab**

## ✨ Features

- 🌐 **Cross-platform**: Works on desktop, tablet, and mobile
- 📱 **PWA Support**: Install as an app on any device
- 🌙 **Dark/Light Mode**: Automatic theme switching with manual toggle
- 📡 **Multiple Protocols**: RSS, Atom, and JSON feeds
- 📁 **OPML Support**: Import/export feed lists
- ⚡ **Offline Reading**: Full offline support with smart caching
- 🔍 **Smart Filtering**: Keyword blocking and content filtering
- 📖 **Reading Management**: Mark as read/unread, hide read posts
- ⌨️ **Keyboard Shortcuts**: Navigate efficiently with hotkeys
- 🔄 **Auto Refresh**: Configurable feed refresh intervals
- 💾 **Local Storage**: All data stored locally, no server required
- 🚀 **Fast & Lightweight**: Optimized for performance
- 🎨 **Modern Design**: Based on FormBiz.biz design system

## 🚀 Quick Start

### Option 1: GitHub Pages Deployment

1. **Fork this repository** or **download the files**
2. **Upload to your GitHub repository**:
   ```
   your-repo/
   ├── index.html
   ├── style.css
   ├── script.js
   ├── manifest.json
   ├── sw.js
   └── README.md
   ```
3. **Enable GitHub Pages** in repository settings
4. **Access your RSS reader** at `https://yourusername.github.io/your-repo`

### Option 2: Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/sophrosyne-rss-reader.git
   cd sophrosyne-rss-reader
   ```

2. **Serve locally** (any method):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (with npx)
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```

3. **Open in browser**: `http://localhost:8000`

## 📖 How to Use

### Adding Feeds

1. **Click "+ 추가" button** in the sidebar
2. **Enter RSS/Atom URL** (e.g., `https://news.ycombinator.com/rss`)
3. **Press Enter** or **click "추가"** to add the feed

### Importing OPML

1. **Click "📁 OPML 파일 업로드"**
2. **Select your OPML file** exported from Feedly, Inoreader, etc.
3. **Feeds will be automatically imported**

### ⌨️ Keyboard Shortcuts

| Key | Action | Location |
|-----|--------|----------|
| `T` | Toggle dark/light theme | Theme button |
| `R` | Refresh current feed | Refresh button |
| `M` | Mark current article as read | Read button |
| `U` | Mark current article as unread | Unread button |
| `J` | Next article | Article navigation |
| `K` | Previous article | Article navigation |
| `Enter` | Add feed (when in input) | Feed form |
| `Escape` | Close article/modal | Close buttons |

*Note: Keyboard shortcuts are displayed next to relevant buttons in the interface*

### Settings

Access settings by clicking the ⚙️ icon:

- **Cache TTL**: How long to cache feeds (0 = no cache)
- **Response Limit**: Maximum download size per feed (prevents timeouts)
- **Blocklist**: Keywords to filter out (comma-separated)
- **Auto Mark Read**: Automatically mark articles as read when opened
- **Hide Read Posts**: Hide articles marked as read

## ⚠️ Important Notice

**Data is stored locally in your browser and is NOT saved to any database.**

**🔴 Important**: Make sure to regularly download your OPML file and re-upload it when needed, as browser data can be cleared!

The info tooltip (ℹ️) next to "피드 목록" will remind you of this.

## 🔧 Technical Details

### Architecture

- **Frontend-only**: No backend server required
- **Progressive Web App**: Installable on any device
- **Service Worker**: Offline support and caching
- **Local Storage**: All data stored in browser
- **CORS Proxy Chain**: Multiple fallback proxies for feed fetching

### CORS Proxy Handling

The app uses multiple CORS proxies with automatic failover:

1. `https://api.allorigins.win/get?url=` (Primary)
2. `https://corsproxy.io/?` (Backup 1)
3. `https://test.cors.workers.dev/?` (Backup 2)
4. Direct request (if CORS is allowed)

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11.3+)
- **Opera**: Full support

### Performance

- **Lightweight**: ~150KB total size
- **Fast Loading**: Service Worker pre-caching
- **Efficient**: Response size limiting prevents timeouts
- **Optimized**: FormBiz design system with minimal dependencies

## 📁 File Structure

```
sophrosyne-rss-reader/
├── index.html          # Main HTML file
├── style.css           # FormBiz design system CSS
├── script.js           # Main application logic
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── README.md          # This file
└── LICENSE            # MIT License
```

## 🎨 Design System

This RSS reader uses the **FormBiz.biz design system** with:

### Color Palette
- **Primary**: Sky Blue (#0ea5e9) - Modern, trustworthy
- **Secondary**: Slate Gray - Professional, readable
- **Success**: Emerald Green - Positive actions
- **Warning**: Amber - Notifications
- **Error**: Red - Error states

### Typography
- **Font Family**: Apple system fonts for native feel
- **Scale**: 12px to 48px systematic sizing
- **Weights**: 400 (normal) to 700 (bold)

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Hover effects, consistent spacing
- **Tooltips**: Informative, accessible
- **Shortcuts**: Keyboard-friendly design

## 🛠 Customization

### Adding Custom Themes

Edit `style.css` to add new color schemes:

```css
[data-theme="custom"] {
    --color-primary-500: #your-color;
    --bg-primary: #your-bg;
    /* ... more variables */
}
```

### Custom CORS Proxies

Edit the `corsProxies` array in `script.js`:

```javascript
this.corsProxies = [
    'https://your-cors-proxy.com/?url=',
    'https://api.allorigins.win/get?url=',
    // ... more proxies
];
```

### Extending Functionality

The app is built with a modular class structure. Key methods:

- `fetchFeed(url)`: Fetch and parse RSS feed
- `addFeed()`: Add new feed
- `renderArticles()`: Render article list
- `selectArticle(article)`: Display article content
- `toggleTheme()`: Switch between light/dark themes

## 🔒 Privacy & Security

- **No Data Collection**: All data stays in your browser
- **No Analytics**: No tracking or analytics
- **Local Storage Only**: Feeds and settings stored locally
- **HTTPS Only**: Secure connections for all requests
- **Content Sanitization**: HTML content is sanitized for security
- **No Database**: Data is not persisted on any server

## 🐛 Troubleshooting

### Feed Won't Load

1. **Check URL**: Ensure it's a valid RSS/Atom feed
2. **CORS Issues**: Try a different feed to test proxies
3. **Network**: Check internet connection
4. **Cache**: Clear cache in settings (button available)

### App Won't Install

1. **HTTPS Required**: Must be served over HTTPS
2. **Manifest**: Check manifest.json is accessible
3. **Service Worker**: Check sw.js loads without errors

### Performance Issues

1. **Reduce Cache TTL**: Lower cache time in settings
2. **Response Limit**: Reduce response size limit
3. **Clear Cache**: Use "캐시 지우기" button
4. **Browser Storage**: Clear browser data if needed

### Data Loss Prevention

1. **Regular OPML Export**: Download your feeds regularly
2. **Browser Settings**: Don't clear site data
3. **Bookmark Important Feeds**: Keep backup of URLs
4. **Multiple Browsers**: Use across different browsers as backup

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/sophrosyne-rss-reader.git
cd sophrosyne-rss-reader

# Serve locally
python -m http.server 8000

# Open http://localhost:8000
```

### Code Style

- **ES6+ JavaScript**: Modern syntax preferred
- **CSS Variables**: Use design tokens
- **Semantic HTML**: Accessible markup
- **Progressive Enhancement**: Works without JavaScript basics

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏢 About Sophrosyne AI Lab

Sophrosyne AI Lab develops innovative digital solutions focusing on user experience and performance. We believe in creating tools that are:

- **Simple yet powerful**
- **Privacy-focused**
- **Open source**
- **User-centric**
- **Beautifully designed**

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/sophrosyne-rss-reader/issues)
- **Documentation**: This README
- **Updates**: Watch this repository for updates

## 🎯 Roadmap

- [ ] **Feed Categories**: Organize feeds into folders
- [ ] **Search**: Full-text search across articles
- [ ] **Sync**: Optional cloud sync for multiple devices
- [ ] **Themes**: More color schemes and customization
- [ ] **Notifications**: Browser notifications for new articles
- [ ] **Export**: Export articles to various formats
- [ ] **Statistics**: Reading analytics and insights
- [ ] **Mobile App**: Native mobile applications

## 🆕 Recent Updates

### v2.0.0 - Modern Design Update
- **FormBiz Design System**: Complete UI overhaul
- **Enhanced Keyboard Shortcuts**: All shortcuts visible in UI
- **Improved Tooltips**: Better user guidance
- **Dark Mode**: Fully functional theme switching
- **Better Accessibility**: Screen reader and keyboard support
- **Performance**: Faster loading and better caching

### Previous Versions
- **v1.0.0**: Initial release with basic RSS functionality
- **v1.1.0**: Added OPML support and offline caching
- **v1.2.0**: Mobile optimization and PWA features

---

## 💡 Tips & Tricks

### Power User Features

1. **Bulk Operations**: Select multiple articles with Shift+Click
2. **Quick Navigation**: Use J/K keys like Vim for article browsing
3. **Feed Management**: Regular OPML exports for backup
4. **Performance**: Adjust cache settings based on usage
5. **Keyboard First**: Most actions have keyboard shortcuts

### Sample RSS Feeds to Try

```
https://news.ycombinator.com/rss
https://dev.to/feed
https://feeds.bbci.co.uk/news/rss.xml
https://rss.cnn.com/rss/edition.rss
https://feeds.feedburner.com/TechCrunch
```

---

**Made with ❤️ by Sophrosyne AI Lab**

*"Clean code, clean feeds, clean mind"*

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-02 | FormBiz design system, keyboard shortcuts UI, tooltips |
| 1.2.0 | 2025-09-15 | PWA support, mobile optimization |
| 1.1.0 | 2025-09-01 | OPML support, caching improvements |
| 1.0.0 | 2025-08-15 | Initial release |