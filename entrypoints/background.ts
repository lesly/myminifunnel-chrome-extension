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
  console.log('[MMF] Background service worker started');

  // Handle extension icon click - toggle sidebar
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      // Send message to content script to toggle sidebar
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
      } catch {
        // Content script not loaded yet, inject it first
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/sidebar.js'],
        });
        // Try again after injection
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_SIDEBAR' });
          } catch (e) {
            console.error('[MMF] Failed to toggle sidebar:', e);
          }
        }, 100);
      }
    }
  });

  // Listen for messages from content script and sidebar
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'AUTH_TOKEN_FOUND') {
      handleAuthToken(message.data);
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

  // Fetch initial data
  try {
    await fetchExtensionData();
  } catch (error) {
    console.error('[MMF] Initial fetch failed:', error);
  }
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

  console.log('[MMF] Auth data:', { hasToken: !!authToken, appId, serverUrl });

  if (!authToken) {
    throw new Error('Not connected. Please open My Mini Funnel app first.');
  }

  const baseUrl = serverUrl || API_CONFIG.serverUrl;
  const appIdentifier = appId || API_CONFIG.appId;
  const url = `${baseUrl}/api/apps/${appIdentifier}/functions/getExtensionData`;

  console.log('[MMF] Calling:', url);

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

  console.log('[MMF] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MMF] Error response:', errorText);

    if (response.status === 401) {
      await chrome.storage.local.remove(['authToken', 'userData']);
      throw new Error('Session expired. Please log in to My Mini Funnel again.');
    }
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('[MMF] Result:', result);

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
