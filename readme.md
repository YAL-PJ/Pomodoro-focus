# Focus Pomodoro Timer 🍅👑

A beautifully designed, minimalist Pomodoro timer to boost your productivity. Features customizable work sessions, break reminders, achievement sounds, and a delightful tomato crown mascot!

## ✨ Features

- **Beautiful & Minimal Design** - Clean interface with dark mode support
- **Customizable Timers** - Adjust work, short break, and long break durations
- **Smart Sound System** - Choose which sounds you want:
  - Soft ticking sounds
  - Happy ticks for the last 3 minutes
  - Minute achievement chimes
  - 5-minute celebration melodies
  - Victory fanfare on completion
- **Progress Tracking** - See how many Pomodoros you've completed
- **Responsive Design** - Works perfectly on desktop and mobile
- **Accessibility** - Full ARIA labels and keyboard navigation support
- **No Signup Required** - Start using immediately, all data saved locally

## 🚀 Deploy to Netlify

### Option 1: Deploy via Netlify Drop (Easiest)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop the entire project folder
3. Your site will be live instantly!

### Option 2: Deploy via Git (Recommended for updates)

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pomodoro-timer.git
   git push -u origin main
   ```

2. **Connect to Netlify:**
   - Go to [Netlify](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select your repository
   - Click "Deploy site"

3. **Done!** Your site will be live at `https://yoursite.netlify.app`

### Option 3: Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and deploy:**
   ```bash
   netlify login
   netlify init
   netlify deploy --prod
   ```

## 🎨 Customization

### Update Site Name
After deployment, go to **Site settings** → **General** → **Change site name**

### Add Custom Domain
Go to **Domain settings** → **Add custom domain**

### Set Up Feedback Form
Replace the Google Forms link in `index.html`:
```html
<button class="feedback-btn" onclick="window.open('YOUR_FORM_URL', '_blank')">
```

**To create a feedback form:**
1. Go to [Google Forms](https://forms.google.com/)
2. Create a new form with fields like:
   - Name (optional)
   - Email (optional)
   - Feedback Type (Bug/Feature/Other)
   - Message
3. Click "Send" → Get shareable link
4. Replace `YOUR_GOOGLE_FORM_ID` in index.html

### Update Social Media Images
Create an `og-image.png` (1200x630px) and add it to your project for better social sharing.

## 📱 SEO Optimization

The site includes:
- ✅ Meta tags (title, description)
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card tags
- ✅ JSON-LD structured data
- ✅ Robots.txt
- ✅ Sitemap.xml
- ✅ Semantic HTML
- ✅ Fast loading time

## ♿ Accessibility Features

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Skip to main content link
- High contrast mode support
- Sufficient color contrast ratios

## 🔒 Security

- Security headers configured in `netlify.toml`
- CSP (Content Security Policy) ready
- XSS protection enabled
- No external dependencies or tracking

## 📊 Analytics (Optional)

To add analytics, insert before `</body>`:

**Google Analytics:**
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_ID');
</script>
```

**Plausible (Privacy-friendly):**
```html
<script defer data-domain="yoursite.com" src="https://plausible.io/js/script.js"></script>
```

## 🛠️ Technical Details

- **Framework:** Vanilla JavaScript (no dependencies!)
- **Size:** ~15KB (super lightweight)
- **Browser Support:** All modern browsers
- **Offline:** Works offline after first load (PWA-ready)

## 📝 License

Feel free to use this project for personal or commercial purposes!

## 🙏 Credits

Created with focus and tomatoes 🍅👑

---

**Need help?** Open an issue or submit feedback through the app!
