import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'output',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'My Mini Funnel Dashboard',
    description: 'Quick access to your funnel stats, leads, and copy links from anywhere',
    version: '1.0.0',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://app.myminifunnel.com/*', 'https://app.base44.com/*'],
    icons: {
      16: 'icon/16.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    // No default_popup - we'll inject a sidebar instead
    action: {
      default_title: 'Toggle My Mini Funnel Dashboard',
    },
  },
});
