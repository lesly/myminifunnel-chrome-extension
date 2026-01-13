var sidebar=(function(){"use strict";function D(i){return i}const k={matches:["<all_urls>"],runAt:"document_idle",main(){let i=!1,e=null,n=null,s=null;chrome.runtime.onMessage.addListener((t,o,a)=>{t.type==="TOGGLE_SIDEBAR"&&(c(),a({success:!0}))});function c(){i?g():v()}function v(){e||I(),e.classList.add("mmf-sidebar-visible"),n.classList.add("mmf-overlay-visible"),i=!0,x()}function g(){e?.classList.remove("mmf-sidebar-visible"),n?.classList.remove("mmf-overlay-visible"),i=!1,m()}function I(){const t=document.createElement("style");t.textContent=R(),document.head.appendChild(t),n=document.createElement("div"),n.className="mmf-overlay",n.addEventListener("click",g),document.body.appendChild(n),e=document.createElement("div"),e.className="mmf-sidebar",e.innerHTML=z(),document.body.appendChild(e),A()}function A(){e?.querySelector(".mmf-close-btn")?.addEventListener("click",g),e?.querySelector(".mmf-connect-btn")?.addEventListener("click",()=>{M()}),e?.querySelector(".mmf-refresh-btn")?.addEventListener("click",()=>{x(!0)}),e?.querySelector(".mmf-disconnect-btn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"DISCONNECT"}),y()}),e?.querySelector(".mmf-copy-link-btn")?.addEventListener("click",()=>{$()}),e?.querySelector(".mmf-copy-embed-btn")?.addEventListener("click",()=>{N()}),e?.querySelector(".mmf-funnel-select")?.addEventListener("change",()=>{})}async function x(t=!1){e?.querySelector(".mmf-content");const o=e?.querySelector(".mmf-loading"),a=e?.querySelector(".mmf-connect-screen"),l=e?.querySelector(".mmf-dashboard");if(!(await chrome.runtime.sendMessage({type:"GET_AUTH_STATUS"})).isConnected){y();return}o?.classList.add("mmf-visible"),l?.classList.remove("mmf-visible"),a?.classList.remove("mmf-visible");try{const r=await chrome.runtime.sendMessage({type:t?"REFRESH_DATA":"GET_EXTENSION_DATA"});r.success&&r.data?_(r.data):S(r.error||"Failed to load data")}catch{S("Connection error")}o?.classList.remove("mmf-visible")}function y(){m(),e?.querySelector(".mmf-loading")?.classList.remove("mmf-visible"),e?.querySelector(".mmf-dashboard")?.classList.remove("mmf-visible"),e?.querySelector(".mmf-connect-screen")?.classList.add("mmf-visible");const t=e?.querySelector(".mmf-connect-btn"),o=e?.querySelector(".mmf-waiting");t&&(t.style.display="inline-block",t.disabled=!1),o?.classList.remove("mmf-visible")}function M(){const t=e?.querySelector(".mmf-connect-btn"),o=e?.querySelector(".mmf-waiting");t&&(t.style.display="none"),o?.classList.add("mmf-visible"),chrome.runtime.sendMessage({type:"OPEN_APP"}),q()}function q(){m();let t=0;const o=30;s=setInterval(async()=>{if(t++,(await chrome.runtime.sendMessage({type:"GET_AUTH_STATUS"})).isConnected){m(),x();return}if(t>=o){m();const l=e?.querySelector(".mmf-waiting");l&&(l.innerHTML=`
              <p>Connection timed out.</p>
              <button class="mmf-retry-btn">Try Again</button>
            `,l.querySelector(".mmf-retry-btn")?.addEventListener("click",()=>{y()}))}},2e3)}function m(){s&&(clearInterval(s),s=null)}function S(t){const o=e?.querySelector(".mmf-error");o&&(o.textContent=t,o.classList.add("mmf-visible"))}function _(t){const o=e?.querySelector(".mmf-dashboard");if(!o)return;const a=o.querySelector(".mmf-stats");a&&(a.innerHTML=`
          <div class="mmf-stat">
            <div class="mmf-stat-value">${t.stats.totalViews.toLocaleString()}</div>
            <div class="mmf-stat-label">Views</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${t.stats.totalLeads.toLocaleString()}</div>
            <div class="mmf-stat-label">Leads</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${t.stats.conversionRate}%</div>
            <div class="mmf-stat-label">Conv.</div>
          </div>
          <div class="mmf-stat">
            <div class="mmf-stat-value">${t.stats.activeFunnels}</div>
            <div class="mmf-stat-label">Active</div>
          </div>
        `);const l=o.querySelector(".mmf-funnel-select");l&&t.funnels&&(l.innerHTML=t.funnels.map(r=>`<option value="${r.id}" data-shortcode="${r.short_code||""}" data-shorturl="${r.shortURL||""}">${r.name}${r.is_published?"":" (Draft)"}</option>`).join(""));const d=o.querySelector(".mmf-leads-list");d&&(t.recentLeads&&t.recentLeads.length>0?d.innerHTML=t.recentLeads.map(r=>`
              <div class="mmf-lead">
                <div class="mmf-lead-avatar">${r.name?.charAt(0)?.toUpperCase()||"?"}</div>
                <div class="mmf-lead-info">
                  <div class="mmf-lead-name">${r.name||"Anonymous"}</div>
                  <div class="mmf-lead-meta">${r.funnel_name||""}</div>
                </div>
              </div>
            `).join(""):d.innerHTML='<div class="mmf-empty">No leads yet</div>'),e?.querySelector(".mmf-connect-screen")?.classList.remove("mmf-visible"),o.classList.add("mmf-visible")}function E(){const t=e?.querySelector(".mmf-funnel-select");if(!t||!t.value)return null;const o=t.options[t.selectedIndex],a=o.dataset.shorturl,l=o.dataset.shortcode,d=t.value;let r="";a?r=a:l?r=`https://app.myminifunnel.com/f/${l}`:r=`https://app.myminifunnel.com/publicfunnel?slug=${d}`;const U=`<iframe src="${r}" width="100%" height="600" frameborder="0"></iframe>`;return{url:r,embed:U}}async function $(){const t=E();t&&(await navigator.clipboard.writeText(t.url),L(".mmf-copy-link-btn"))}async function N(){const t=E();t&&(await navigator.clipboard.writeText(t.embed),L(".mmf-copy-embed-btn"))}function L(t){const o=e?.querySelector(t);if(o){const a=o.textContent;o.textContent="Copied!",o.classList.add("mmf-copied"),setTimeout(()=>{o.textContent=a,o.classList.remove("mmf-copied")},2e3)}}function z(){return`
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
      `}function R(){return`
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
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .mmf-stat {
          background: white;
          border-radius: 8px;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .mmf-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #124170;
        }

        .mmf-stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
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
          background: linear-gradient(135deg, #67C090, #26667F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          flex-shrink: 0;
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
      `}}},w=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome;function f(i,...e){}const C={debug:(...i)=>f(console.debug,...i),log:(...i)=>f(console.log,...i),warn:(...i)=>f(console.warn,...i),error:(...i)=>f(console.error,...i)};class b extends Event{constructor(e,n){super(b.EVENT_NAME,{}),this.newUrl=e,this.oldUrl=n}static EVENT_NAME=h("wxt:locationchange")}function h(i){return`${w?.runtime?.id}:sidebar:${i}`}function T(i){let e,n;return{run(){e==null&&(n=new URL(location.href),e=i.setInterval(()=>{let s=new URL(location.href);s.href!==n.href&&(window.dispatchEvent(new b(s,n)),n=s)},1e3))}}}class p{constructor(e,n){this.contentScriptName=e,this.options=n,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}static SCRIPT_STARTED_MESSAGE_TYPE=h("wxt:content-script-started");isTopFrame=window.self===window.top;abortController;locationWatcher=T(this);receivedMessageIds=new Set;get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return w.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener("abort",e),()=>this.signal.removeEventListener("abort",e)}block(){return new Promise(()=>{})}setInterval(e,n){const s=setInterval(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearInterval(s)),s}setTimeout(e,n){const s=setTimeout(()=>{this.isValid&&e()},n);return this.onInvalidated(()=>clearTimeout(s)),s}requestAnimationFrame(e){const n=requestAnimationFrame((...s)=>{this.isValid&&e(...s)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(e,n){const s=requestIdleCallback((...c)=>{this.signal.aborted||e(...c)},n);return this.onInvalidated(()=>cancelIdleCallback(s)),s}addEventListener(e,n,s,c){n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(n.startsWith("wxt:")?h(n):n,s,{...c,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),C.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:p.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(e){const n=e.data?.type===p.SCRIPT_STARTED_MESSAGE_TYPE,s=e.data?.contentScriptName===this.contentScriptName,c=!this.receivedMessageIds.has(e.data?.messageId);return n&&s&&c}listenForNewerScripts(e){let n=!0;const s=c=>{if(this.verifyScriptStartedEvent(c)){this.receivedMessageIds.add(c.data.messageId);const v=n;if(n=!1,v&&e?.ignoreFirstEvent)return;this.notifyInvalidated()}};addEventListener("message",s),this.onInvalidated(()=>removeEventListener("message",s))}}function G(){}function u(i,...e){}const F={debug:(...i)=>u(console.debug,...i),log:(...i)=>u(console.log,...i),warn:(...i)=>u(console.warn,...i),error:(...i)=>u(console.error,...i)};return(async()=>{try{const{main:i,...e}=k,n=new p("sidebar",e);return await i(n)}catch(i){throw F.error('The content script "sidebar" crashed on startup!',i),i}})()})();
sidebar;