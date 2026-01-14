/**
 * Background service worker
 * Handles auth token storage, API calls, and sidebar toggling
 */

// API configuration
const API_CONFIG = {
  serverUrl: 'https://app.base44.com',
  appId: '6901efa51535', // My Mini Funnel app ID
};

// Cache for extension data
let cachedData: ExtensionData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

interface AuthData {
  token: string;
  appId?: string;
  serverUrl?: string;
}

interface ExtensionData {
  stats: {
    totalViews: number;
    totalLeads: number;
    conversionRate: string;
    activeFunnels: number;
  };
  funnels: Array<{
    id: string;
    name: string;
    short_code?: string;
    shortURL?: string;
    is_published: boolean;
    view_count: number;
  }>;
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    created_date: string;
    funnel_name: string;
  }>;
  user: {
    email: string;
    name: string;
  };
}

export default defineBackground(() => {
  // Track the tab that initiated the connection flow
  let connectingFromTabId: number | null = null;

  // Handle extension icon click - toggle sidebar
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.url) return;

    // Skip non-injectable pages (Chrome protected pages + Base44 dev environment)
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('https://chrome.google.com/') ||
      tab.url.startsWith('https://chromewebstore.google.com/') ||
      tab.url.startsWith('https://app.base44.com/')
    ) {
      return;
    }

    // Try to toggle existing sidebar, or inject and toggle
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
    } catch {
      // Content script not loaded - inject it first
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/sidebar.js'],
        });
        // Small delay for script initialization, then toggle
        await new Promise(resolve => setTimeout(resolve, 100));
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
      } catch (e) {
        console.error('[MMF] Failed to inject sidebar:', e);
      }
    }
  });

  // Listen for messages from content script and sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_TOKEN_FOUND') {
      handleAuthToken(message.data);
      // Auto-close the ExtensionConnect tab and open sidebar on original tab
      if (sender.tab?.id && sender.tab.url?.includes('ExtensionConnect')) {
        const originalTabId = connectingFromTabId;
        connectingFromTabId = null;

        setTimeout(async () => {
          // Close the ExtensionConnect tab
          chrome.tabs.remove(sender.tab!.id!).catch(() => {});

          // Open sidebar on the original tab
          if (originalTabId) {
            try {
              // Focus the original tab
              await chrome.tabs.update(originalTabId, { active: true });
              // Inject and show sidebar
              await chrome.scripting.executeScript({
                target: { tabId: originalTabId },
                files: ['content-scripts/sidebar.js'],
              });
              await new Promise(resolve => setTimeout(resolve, 100));
              await chrome.tabs.sendMessage(originalTabId, { type: 'TOGGLE_SIDEBAR' });
            } catch (e) {
              // Tab might be closed or not injectable
            }
          }
        }, 800);
      }
      sendResponse({ success: true });
      return;
    }

    if (message.type === 'GET_EXTENSION_DATA') {
      fetchExtensionData()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
    }

    if (message.type === 'GET_AUTH_STATUS') {
      chrome.storage.local.get(['authToken', 'userData'], (result) => {
        sendResponse({
          isConnected: !!result.authToken,
          user: result.userData,
        });
      });
      return true;
    }

    if (message.type === 'DISCONNECT') {
      chrome.storage.local.remove(['authToken', 'appId', 'serverUrl', 'userData'], () => {
        cachedData = null;
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === 'REFRESH_DATA') {
      cachedData = null;
      lastFetchTime = 0;
      fetchExtensionData()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.type === 'OPEN_APP') {
      // Save the current tab so we can return to it after auth
      if (sender.tab?.id) {
        connectingFromTabId = sender.tab.id;
      }
      chrome.tabs.create({ url: 'https://app.myminifunnel.com/ExtensionConnect' });
      sendResponse({ success: true });
      return;
    }
  });
});

// Handle auth token received from content script
async function handleAuthToken(data: AuthData) {
  const { token, appId, serverUrl } = data;
  if (!token) return;

  // Store auth data
  await chrome.storage.local.set({
    authToken: token,
    appId: appId || API_CONFIG.appId,
    serverUrl: serverUrl || API_CONFIG.serverUrl,
  });

  // Prefetch data for faster first load
  fetchExtensionData().catch(() => {});
}

// Fetch extension data from Base44 backend
async function fetchExtensionData(): Promise<ExtensionData> {
  // Check cache
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  // Get stored auth
  const { authToken, appId, serverUrl } = await chrome.storage.local.get([
    'authToken',
    'appId',
    'serverUrl',
  ]);

  if (!authToken) {
    throw new Error('Not connected. Please open My Mini Funnel app first.');
  }

  const baseUrl = serverUrl || API_CONFIG.serverUrl;
  const appIdentifier = appId || API_CONFIG.appId;
  const url = `${baseUrl}/api/apps/${appIdentifier}/functions/getExtensionData`;

  // Call getExtensionData function
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'X-Access-Token': authToken,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    if (response.status === 401) {
      await chrome.storage.local.remove(['authToken', 'userData']);
      throw new Error('Session expired. Please log in to My Mini Funnel again.');
    }
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();

  // Handle Base44 response format
  const data: ExtensionData = result.data || result;

  // Cache the data
  cachedData = data;
  lastFetchTime = now;

  // Store user data for quick access
  if (data.user) {
    await chrome.storage.local.set({ userData: data.user });
  }

  return data;
}
