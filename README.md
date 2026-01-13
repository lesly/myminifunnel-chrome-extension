# My Mini Funnel Dashboard - Chrome Extension

Quick access to your funnel stats, leads, and copy links from any webpage.

## About My Mini Funnel

[My Mini Funnel](https://myminifunnel.com) helps coaches, consultants, and creators build beautiful quizzes and calculators that turn website visitors into leads. Create interactive lead magnets in minutes, embed them anywhere, and watch your email list grow.

This Chrome extension gives you instant access to your funnel performance without leaving whatever page you're working on.

## Features

- **Real-time stats**: Views, Leads, Conversion Rate, Active Funnels
- **Funnel selector**: Switch between funnels
- **Quick copy**: Funnel URL or embed code in one click
- **Recent leads**: See your latest 5 leads
- **Right sidebar UI**: Clean interface that slides in from the right

## Tech Stack

- [WXT](https://wxt.dev/) - Next-gen web extension framework
- React 19
- TypeScript
- Manifest V3

## Development

```bash
# Install dependencies
bun install

# Start dev server with hot reload
bun run dev

# Build for Chrome
bun run build

# Build for Firefox
bun run build:firefox

# Create zip for store submission
bun run zip
```

## Project Structure

```
entrypoints/
├── background.ts      # Service worker - handles API calls & auth
├── content.ts         # Runs on app.myminifunnel.com - extracts auth token
└── sidebar.content.ts # Injects sidebar UI into any webpage
public/
└── icon/              # Extension icons (16, 32, 48, 96, 128px)
```

## How It Works

1. **Authentication**: Content script on `app.myminifunnel.com` reads the auth token from localStorage and sends it to the background service worker.

2. **Sidebar**: When user clicks the extension icon, a sidebar slides in from the right with their dashboard.

3. **API Calls**: Background service worker makes authenticated calls to fetch your stats and leads.

## Generate Icons

1. Open `public/icon/generate-icons.html` in Chrome
2. Click each download button (16, 32, 48, 96, 128)
3. Save to `public/icon/` folder

## Build Output

- Chrome: `output/chrome-mv3/`
- Firefox: `output/firefox-mv2/`

## Related

- [My Mini Funnel](https://myminifunnel.com) - Build lead magnets in minutes
