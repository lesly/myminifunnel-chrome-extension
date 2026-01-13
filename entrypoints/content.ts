/**
 * Content script for app.myminifunnel.com
 * Reads auth token from localStorage and sends to background script
 */
export default defineContentScript({
  matches: ['https://app.myminifunnel.com/*'],
  runAt: 'document_idle',

  main() {
    // Get auth data from localStorage
    function getAuthData() {
      return {
        token: localStorage.getItem('base44_access_token'),
        appId: localStorage.getItem('base44_app_id'),
        serverUrl: localStorage.getItem('base44_server_url'),
      };
    }

    // Send auth token to background script
    function sendAuthToken() {
      const authData = getAuthData();
      if (authData.token) {
        chrome.runtime.sendMessage({
          type: 'AUTH_TOKEN_FOUND',
          data: authData,
        });
      }
    }

    // Send immediately on load
    sendAuthToken();

    // Also listen for storage changes (in case user logs in/out)
    window.addEventListener('storage', (e) => {
      if (e.key === 'base44_access_token') {
        sendAuthToken();
      }
    });

    // Listen for requests from popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'GET_AUTH_TOKEN') {
        sendResponse({ data: getAuthData() });
      }
    });
  },
});
