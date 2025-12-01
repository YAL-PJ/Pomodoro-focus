# ✅ Pre-Deployment Checklist

## Before You Deploy

### Required Changes

- [ ] **Create Google Form for Feedback**
  - Go to https://forms.google.com/
  - Create feedback form
  - Copy the shareable link
  - Update in `index.html` (search for `YOUR_GOOGLE_FORM_ID`)

### After First Deployment

- [ ] **Update URLs**
  - Get your Netlify URL (e.g., `my-pomodoro.netlify.app`)
  - Replace `yoursite.netlify.app` in:
    - [ ] `index.html` (multiple places in meta tags)
    - [ ] `robots.txt`
    - [ ] `sitemap.xml`
  
- [ ] **Change Site Name** (in Netlify)
  - Go to Site settings → General → Change site name
  - Pick something memorable

### Optional But Recommended

- [ ] **Create OG Image** (1200x630px)
  - Add tomato emoji and app name
  - Name it `og-image.png`
  - Upload to Netlify

- [ ] **Test on Mobile**
  - Check all buttons work
  - Verify sounds play
  - Test dark mode

- [ ] **Update sitemap lastmod date**
  - Change date in `sitemap.xml` to today's date

### SEO Setup (After Launch)

- [ ] **Submit to Google Search Console**
  - Add property
  - Submit sitemap
  
- [ ] **Test Page Speed**
  - Go to https://pagespeed.web.dev/
  - Enter your URL
  - Aim for 90+ score

- [ ] **Check Accessibility**
  - Go to https://wave.webaim.org/
  - Enter your URL
  - Fix any errors

### Marketing (Optional)

- [ ] Share on Twitter
- [ ] Share on Reddit (r/productivity, r/SideProject)
- [ ] Submit to ProductHunt
- [ ] Submit to Hacker News Show HN

## Files Included

✅ `index.html` - Main application
✅ `netlify.toml` - Netlify configuration
✅ `robots.txt` - SEO crawler instructions
✅ `sitemap.xml` - SEO sitemap
✅ `manifest.json` - PWA support
✅ `README.md` - Project documentation
✅ `DEPLOYMENT_GUIDE.md` - This guide

## What's Already Optimized

✅ SEO meta tags
✅ Open Graph tags (social sharing)
✅ Accessibility (ARIA labels)
✅ Dark mode
✅ Responsive design
✅ Fast loading
✅ Security headers
✅ No dependencies
✅ Local storage for preferences

## Ready to Deploy?

Once you've checked the "Required Changes" above:

1. Go to https://app.netlify.com/drop
2. Drag all files
3. Wait 30 seconds
4. Your site is LIVE! 🎉

Then come back and do the "After First Deployment" tasks.

---

**Questions?** Check DEPLOYMENT_GUIDE.md for detailed instructions!
