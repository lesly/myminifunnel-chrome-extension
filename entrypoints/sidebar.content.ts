/**
 * Sidebar content script
 * Injects a sliding sidebar into any webpage
 */

interface Funnel {
  id: string;
  name: string;
  short_code?: string;
  shortURL?: string;
  is_published: boolean;
  view_count: number;
}

interface ExtensionData {
  stats: {
    totalViews: number;
    totalLeads: number;
    conversionRate: string;
    activeFunnels: number;
  };
  funnels: Funnel[];
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    created_date: string;
    funnel_name: string;
    country_code?: string;
  }>;
  user: {
    email: string;
    name: string;
  };
}

export default defineContentScript({
  matches: [], // Empty - never auto-inject, only via chrome.scripting.executeScript()
  runAt: 'document_idle',

  main() {
    let sidebarVisible = false;
    let sidebarEl: HTMLElement | null = null;
    let overlayEl: HTMLElement | null = null;
    let authPollingInterval: ReturnType<typeof setInterval> | null = null;

    // Convert country code to flag emoji (e.g., "FR" -> "🇫🇷")
    function countryCodeToFlag(code: string): string {
      if (!code || code.length !== 2) return '';
      const codePoints = code
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    }

    // Format date to short format (e.g., "Jan 14, 2026")
    function formatDate(dateStr: string): string {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return '';
      }
    }

    // Listen for toggle message from background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_SIDEBAR') {
        toggleSidebar();
        sendResponse({ success: true });
      }
    });

    function toggleSidebar() {
      if (sidebarVisible) {
        hideSidebar();
      } else {
        showSidebar();
      }
    }

    function showSidebar() {
      if (!sidebarEl) {
        createSidebar();
      }
      sidebarEl!.classList.add('mmf-sidebar-visible');
      overlayEl!.classList.add('mmf-overlay-visible');
      sidebarVisible = true;
      loadData();
    }

    function hideSidebar() {
      sidebarEl?.classList.remove('mmf-sidebar-visible');
      overlayEl?.classList.remove('mmf-overlay-visible');
      sidebarVisible = false;
      stopAuthPolling();
    }

    function createSidebar() {
      // Inject styles
      const style = document.createElement('style');
      style.textContent = getSidebarStyles();
      document.head.appendChild(style);

      // Create overlay
      overlayEl = document.createElement('div');
      overlayEl.className = 'mmf-overlay';
      overlayEl.addEventListener('click', hideSidebar);
      document.body.appendChild(overlayEl);

      // Create sidebar
      sidebarEl = document.createElement('div');
      sidebarEl.className = 'mmf-sidebar';
      sidebarEl.innerHTML = getSidebarHTML();
      document.body.appendChild(sidebarEl);

      // Add event listeners
      setupEventListeners();
    }

    function setupEventListeners() {
      // Close button
      sidebarEl?.querySelector('.mmf-close-btn')?.addEventListener('click', hideSidebar);

      // Connect button
      sidebarEl?.querySelector('.mmf-connect-btn')?.addEventListener('click', () => {
        startConnectionFlow();
      });

      // Refresh button
      sidebarEl?.querySelector('.mmf-refresh-btn')?.addEventListener('click', () => {
        loadData(true);
      });

      // Disconnect button
      sidebarEl?.querySelector('.mmf-disconnect-btn')?.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
        showConnectScreen();
      });

      // Copy link button
      sidebarEl?.querySelector('.mmf-copy-link-btn')?.addEventListener('click', () => {
        copySelectedFunnelLink();
      });

      // Copy embed button
      sidebarEl?.querySelector('.mmf-copy-embed-btn')?.addEventListener('click', () => {
        copySelectedFunnelEmbed();
      });

      // Funnel select
      sidebarEl?.querySelector('.mmf-funnel-select')?.addEventListener('change', () => {
        // Update buttons state
      });
    }

    async function loadData(refresh = false) {
      const contentEl = sidebarEl?.querySelector('.mmf-content');
      const loadingEl = sidebarEl?.querySelector('.mmf-loading');
      const connectEl = sidebarEl?.querySelector('.mmf-connect-screen');
      const dashboardEl = sidebarEl?.querySelector('.mmf-dashboard');

      // Check auth status first
      const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

      if (!authStatus.isConnected) {
        showConnectScreen();
        return;
      }

      // Show loading
      loadingEl?.classList.add('mmf-visible');
      dashboardEl?.classList.remove('mmf-visible');
      connectEl?.classList.remove('mmf-visible');

      try {
        const response = await chrome.runtime.sendMessage({
          type: refresh ? 'REFRESH_DATA' : 'GET_EXTENSION_DATA',
        });

        if (response.success && response.data) {
          renderDashboard(response.data);
        } else {
          showError(response.error || 'Failed to load data');
        }
      } catch (error) {
        showError('Connection error');
      }

      loadingEl?.classList.remove('mmf-visible');
    }

    function showConnectScreen() {
      stopAuthPolling();
      sidebarEl?.querySelector('.mmf-loading')?.classList.remove('mmf-visible');
      sidebarEl?.querySelector('.mmf-dashboard')?.classList.remove('mmf-visible');
      sidebarEl?.querySelector('.mmf-connect-screen')?.classList.add('mmf-visible');
      // Reset to initial state
      const connectBtn = sidebarEl?.querySelector('.mmf-connect-btn') as HTMLButtonElement;
      const waitingEl = sidebarEl?.querySelector('.mmf-waiting');
      if (connectBtn) {
        connectBtn.style.display = 'inline-block';
        connectBtn.disabled = false;
      }
      waitingEl?.classList.remove('mmf-visible');
    }

    function startConnectionFlow() {
      // Show waiting state
      const connectBtn = sidebarEl?.querySelector('.mmf-connect-btn') as HTMLButtonElement;
      const waitingEl = sidebarEl?.querySelector('.mmf-waiting');

      if (connectBtn) {
        connectBtn.style.display = 'none';
      }
      waitingEl?.classList.add('mmf-visible');

      // Open the app
      chrome.runtime.sendMessage({ type: 'OPEN_APP' });

      // Start polling for connection
      startAuthPolling();
    }

    function startAuthPolling() {
      stopAuthPolling();
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds total (2s intervals)

      authPollingInterval = setInterval(async () => {
        attempts++;

        const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

        if (authStatus.isConnected) {
          stopAuthPolling();
          loadData();
          return;
        }

        if (attempts >= maxAttempts) {
          stopAuthPolling();
          // Show timeout message
          const waitingEl = sidebarEl?.querySelector('.mmf-waiting');
          if (waitingEl) {
            waitingEl.innerHTML = `
              <p>Connection timed out.</p>
              <button class="mmf-retry-btn">Try Again</button>
            `;
            waitingEl.querySelector('.mmf-retry-btn')?.addEventListener('click', () => {
              showConnectScreen();
            });
          }
        }
      }, 2000);
    }

    function stopAuthPolling() {
      if (authPollingInterval) {
        clearInterval(authPollingInterval);
        authPollingInterval = null;
      }
    }

    function showError(message: string) {
      const errorEl = sidebarEl?.querySelector('.mmf-error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('mmf-visible');
      }
    }

    function renderDashboard(data: ExtensionData) {
      const dashboardEl = sidebarEl?.querySelector('.mmf-dashboard');
      if (!dashboardEl) return;

      // Update stats
      const statsEl = dashboardEl.querySelector('.mmf-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="mmf-stat">
            <div class="mmf-stat-value">${data.stats.totalViews.toLocaleString()}</div>
            <div class="mmf-stat-label">Views</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${data.stats.totalLeads.toLocaleString()}</div>
            <div class="mmf-stat-label">Leads</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${data.stats.conversionRate}%</div>
            <div class="mmf-stat-label">Conv.</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${data.stats.activeFunnels}</div>
            <div class="mmf-stat-label">Active</div>
          </div>
        `;
      }

      // Update funnel select
      const selectEl = dashboardEl.querySelector('.mmf-funnel-select') as HTMLSelectElement;
      if (selectEl && data.funnels) {
        selectEl.innerHTML = data.funnels
          .map(
            (f) =>
              `<option value="${f.id}" data-shortcode="${f.short_code || ''}" data-shorturl="${f.shortURL || ''}">${f.name}${!f.is_published ? ' (Draft)' : ''}</option>`
          )
          .join('');
      }

      // Update leads list
      const leadsEl = dashboardEl.querySelector('.mmf-leads-list');
      if (leadsEl) {
        if (data.recentLeads && data.recentLeads.length > 0) {
          leadsEl.innerHTML = data.recentLeads
            .map(
              (lead) => `
              <div class="mmf-lead">
                <img class="mmf-lead-avatar" src="https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(lead.email || lead.name || 'user')}" alt="${lead.name || 'Contact'}" />
                <div class="mmf-lead-info">
                  <div class="mmf-lead-name">${lead.name || 'Anonymous'}</div>
                  <div class="mmf-lead-meta">${lead.funnel_name || ''}</div>
                </div>
                <div class="mmf-lead-right">
                  ${lead.country_code ? `<span class="mmf-lead-flag">${countryCodeToFlag(lead.country_code)}</span>` : ''}
                  ${lead.created_date ? `<span class="mmf-lead-date">${formatDate(lead.created_date)}</span>` : ''}
                </div>
              </div>
            `
            )
            .join('');
        } else {
          leadsEl.innerHTML = '<div class="mmf-empty">No leads yet</div>';
        }
      }

      // Show dashboard
      sidebarEl?.querySelector('.mmf-connect-screen')?.classList.remove('mmf-visible');
      dashboardEl.classList.add('mmf-visible');
    }

    function getSelectedFunnel(): { url: string; embed: string } | null {
      const selectEl = sidebarEl?.querySelector('.mmf-funnel-select') as HTMLSelectElement;
      if (!selectEl || !selectEl.value) return null;

      const option = selectEl.options[selectEl.selectedIndex];
      const shortUrl = option.dataset.shorturl;
      const shortCode = option.dataset.shortcode;
      const id = selectEl.value;

      let url = '';
      if (shortUrl) {
        url = shortUrl;
      } else if (shortCode) {
        url = `https://app.myminifunnel.com/f/${shortCode}`;
      } else {
        url = `https://app.myminifunnel.com/publicfunnel?slug=${id}`;
      }

      const embed = `<iframe src="${url}" width="100%" height="600" frameborder="0"></iframe>`;

      return { url, embed };
    }

    async function copySelectedFunnelLink() {
      const funnel = getSelectedFunnel();
      if (!funnel) return;

      await navigator.clipboard.writeText(funnel.url);
      showCopiedFeedback('.mmf-copy-link-btn');
    }

    async function copySelectedFunnelEmbed() {
      const funnel = getSelectedFunnel();
      if (!funnel) return;

      await navigator.clipboard.writeText(funnel.embed);
      showCopiedFeedback('.mmf-copy-embed-btn');
    }

    function showCopiedFeedback(selector: string) {
      const btn = sidebarEl?.querySelector(selector);
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('mmf-copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('mmf-copied');
        }, 2000);
      }
    }

    function getSidebarHTML() {
      return `
        <div class="mmf-header">
          <div class="mmf-logo">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="url(#mmfgrad)" />
              <path d="M16 20L24 28L32 20" stroke="white" stroke-width="3" stroke-linecap="round" />
              <defs>
                <linearGradient id="mmfgrad" x1="0" y1="0" x2="48" y2="48">
                  <stop stop-color="#67C090" />
                  <stop offset="1" stop-color="#26667F" />
                </linearGradient>
              </defs>
            </svg>
            <span>Dashboard</span>
          </div>
          <div class="mmf-header-actions">
            <button class="mmf-icon-btn mmf-refresh-btn" title="Refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
            <button class="mmf-icon-btn mmf-disconnect-btn" title="Disconnect">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <button class="mmf-icon-btn mmf-close-btn" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="mmf-content">
          <div class="mmf-loading">
            <div class="mmf-spinner"></div>
            <p>Loading...</p>
          </div>

          <div class="mmf-connect-screen">
            <div class="mmf-connect-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="url(#mmfgrad2)" />
                <path d="M16 20L24 28L32 20" stroke="white" stroke-width="3" stroke-linecap="round" />
                <defs>
                  <linearGradient id="mmfgrad2" x1="0" y1="0" x2="48" y2="48">
                    <stop stop-color="#67C090" />
                    <stop offset="1" stop-color="#26667F" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>My Mini Funnel</h3>
            <p>Connect your account to view stats and manage funnels.</p>
            <button class="mmf-connect-btn">Connect Account</button>
            <div class="mmf-waiting">
              <div class="mmf-spinner"></div>
              <p>Waiting for you to log in...</p>
              <p class="mmf-waiting-hint">Log in to the app in the new tab, then come back here.</p>
            </div>
          </div>

          <div class="mmf-dashboard">
            <div class="mmf-stats"></div>

            <div class="mmf-section">
              <label class="mmf-label">Select Funnel</label>
              <select class="mmf-funnel-select"></select>
            </div>

            <div class="mmf-copy-actions">
              <button class="mmf-copy-btn mmf-copy-link-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copy Link
              </button>
              <button class="mmf-copy-btn mmf-copy-embed-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16,18 22,12 16,6" />
                  <polyline points="8,6 2,12 8,18" />
                </svg>
                Copy Embed
              </button>
            </div>

            <div class="mmf-section">
              <div class="mmf-section-header">
                <label class="mmf-label">Recent Leads</label>
                <a href="https://app.myminifunnel.com/contacts" target="_blank" class="mmf-view-all">View All</a>
              </div>
              <div class="mmf-leads-list"></div>
            </div>
          </div>

          <div class="mmf-error"></div>
        </div>

        <div class="mmf-footer">
          <a href="https://app.myminifunnel.com" target="_blank">Open Full Dashboard</a>
        </div>
      `;
    }

    function getSidebarStyles() {
      return `
        .mmf-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 2147483646;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }

        .mmf-overlay.mmf-overlay-visible {
          opacity: 1;
          visibility: visible;
        }

        .mmf-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 360px;
          height: 100vh;
          background: #FFF9F5;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          z-index: 2147483647;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s ease;
        }

        .mmf-sidebar.mmf-sidebar-visible {
          transform: translateX(0);
        }

        .mmf-sidebar * {
          box-sizing: border-box;
        }

        .mmf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          background: white;
        }

        .mmf-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
          color: #124170;
        }

        .mmf-header-actions {
          display: flex;
          gap: 4px;
        }

        .mmf-icon-btn {
          background: none;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          color: #6b7280;
          transition: background 0.2s, color 0.2s;
        }

        .mmf-icon-btn:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .mmf-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .mmf-loading, .mmf-connect-screen, .mmf-dashboard, .mmf-error {
          display: none;
        }

        .mmf-loading.mmf-visible, .mmf-connect-screen.mmf-visible, .mmf-dashboard.mmf-visible, .mmf-error.mmf-visible {
          display: block;
        }

        .mmf-loading {
          text-align: center;
          padding: 40px 0;
          color: #6b7280;
        }

        .mmf-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #26667F;
          border-radius: 50%;
          animation: mmf-spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes mmf-spin {
          to { transform: rotate(360deg); }
        }

        .mmf-connect-screen {
          text-align: center;
          padding: 40px 20px;
        }

        .mmf-connect-logo {
          margin-bottom: 16px;
        }

        .mmf-connect-screen h3 {
          font-size: 20px;
          font-weight: 600;
          color: #124170;
          margin: 0 0 8px;
        }

        .mmf-connect-screen p {
          color: #6b7280;
          margin: 0 0 20px;
        }

        .mmf-connect-btn {
          background: linear-gradient(135deg, #67C090, #26667F);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .mmf-connect-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(103, 192, 144, 0.3);
        }

        .mmf-waiting {
          display: none;
          text-align: center;
          padding: 20px 0;
        }

        .mmf-waiting.mmf-visible {
          display: block;
        }

        .mmf-waiting p {
          margin: 8px 0 0;
          color: #1f2937;
        }

        .mmf-waiting-hint {
          font-size: 12px;
          color: #6b7280 !important;
        }

        .mmf-retry-btn {
          background: #26667F;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 12px;
        }

        .mmf-retry-btn:hover {
          background: #1d4f63;
        }

        .mmf-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .mmf-stat {
          background: white;
          border-radius: 8px;
          padding: 14px 12px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .mmf-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #124170;
        }

        .mmf-stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }

        .mmf-section {
          margin-bottom: 16px;
        }

        .mmf-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .mmf-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .mmf-section-header .mmf-label {
          margin-bottom: 0;
        }

        .mmf-view-all {
          font-size: 12px;
          color: #26667F;
          text-decoration: none;
        }

        .mmf-view-all:hover {
          text-decoration: underline;
        }

        .mmf-funnel-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          color: #1f2937;
        }

        .mmf-funnel-select:focus {
          outline: none;
          border-color: #26667F;
        }

        .mmf-copy-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .mmf-copy-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mmf-copy-btn:hover {
          border-color: #26667F;
          color: #26667F;
        }

        .mmf-copy-btn.mmf-copied {
          background: #67C090;
          border-color: #67C090;
          color: white;
        }

        .mmf-leads-list {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .mmf-lead {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mmf-lead:last-child {
          border-bottom: none;
        }

        .mmf-lead-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          object-fit: cover;
        }

        .mmf-lead-info {
          flex: 1;
          min-width: 0;
        }

        .mmf-lead-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mmf-lead-meta {
          font-size: 12px;
          color: #6b7280;
        }

        .mmf-lead-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          flex-shrink: 0;
        }

        .mmf-lead-flag {
          font-size: 16px;
          line-height: 1;
        }

        .mmf-lead-date {
          font-size: 11px;
          color: #9ca3af;
          white-space: nowrap;
        }

        .mmf-empty {
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
        }

        .mmf-error {
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 13px;
          text-align: center;
        }

        .mmf-footer {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          background: white;
        }

        .mmf-footer a {
          font-size: 13px;
          color: #26667F;
          text-decoration: none;
          font-weight: 500;
        }

        .mmf-footer a:hover {
          text-decoration: underline;
        }
      `;
    }
  },
});
