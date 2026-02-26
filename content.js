const delay = ms => new Promise(r => setTimeout(r, ms));

function getAllChannels() {
  return Array.from(document.querySelectorAll('ytd-channel-renderer')).map(item => ({
    name: item.querySelector('#channel-title, yt-formatted-string')?.textContent?.trim() || 'Unknown',
    element: item
  })).filter(c => c.name !== 'Unknown');
}

let channels = [];

function createModal() {
  let modal = document.getElementById('massUnsubModal');
  if (modal) { modal.remove(); }

  modal = document.createElement('div');
  modal.id = 'massUnsubModal';
  modal.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:80vh;background:white;border:3px solid #c00;border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.5);z-index:99999;overflow:hidden;display:flex;flex-direction:column;`;
  
  modal.innerHTML = `
    <div style="background:#c00;color:white;padding:15px;font-size:18px;text-align:center;">\u{1F4CB} Mass Unsubscribe Manager</div>
    <div style="padding:10px;background:#f0f0f0;display:flex;justify-content:space-between;">
      <button id="selectAllBtn" style="padding:8px 15px;">Select All</button>
      <button id="refreshBtn" style="padding:8px 15px;">\u{1F504} Refresh List</button>
      <button id="closeBtn" style="padding:8px 15px;">Close</button>
    </div>
    <div style="flex:1;overflow:auto;padding:10px;" id="tableContainer"></div>
    <div style="padding:15px;background:#f0f0f0;text-align:center;">
      <button id="massUnsubBtn" style="padding:12px 30px;background:#c00;color:white;border:none;border-radius:6px;font-size:16px;">\u{1F6AB} Unsubscribe Selected</button>
      <div id="status" style="margin-top:10px;font-size:14px;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // events
  document.getElementById('closeBtn').onclick = () => modal.remove();
  document.getElementById('refreshBtn').onclick = () => { channels = getAllChannels(); renderTable(); };
  document.getElementById('selectAllBtn').onclick = toggleSelectAll;
  document.getElementById('massUnsubBtn').onclick = startMassUnsub;
  renderTable();
}

function renderTable() {
  const container = document.getElementById('tableContainer');
  let html = `<table style="width:100%;border-collapse:collapse;"><tr><th><input type="checkbox" id="masterCheck"></th><th>Channel Name</th></tr>`;
  channels.forEach((ch, i) => {
    html += `<tr><td><input type="checkbox" class="chCheck" data-index="${i}"></td><td>${ch.name}</td></tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;

  document.getElementById('masterCheck').onchange = e => {
    document.querySelectorAll('.chCheck').forEach(cb => cb.checked = e.target.checked);
  };
}

function toggleSelectAll() {
  const allChecked = Array.from(document.querySelectorAll('.chCheck')).every(cb => cb.checked);
  document.querySelectorAll('.chCheck').forEach(cb => cb.checked = !allChecked);
}

async function startMassUnsub() {
  const selected = Array.from(document.querySelectorAll('.chCheck:checked')).map(cb => parseInt(cb.dataset.index));
  if (selected.length === 0) { alert('Koi channel select nahi kiya'); return; }

  const status = document.getElementById('status');
  status.textContent = `Processing ${selected.length} channels...`;

  for (let idx of selected) {
    status.textContent = `Unsubscribing: ${channels[idx].name} (${selected.indexOf(idx)+1}/${selected.length})`;
    await unsubscribeOne(channels[idx].element);
    await delay(10 + Math.random()*1); // safe delay
  }
  status.textContent = '\u2705 Done! Refresh page to see updated list.';
  setTimeout(() => { channels = getAllChannels(); renderTable(); }, 2000);
}

async function unsubscribeOne(item) {
  // Subscribed button click (new 2026 style)
  let subBtn = item.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button, [aria-label*="Subscribed"]');
  if (subBtn) subBtn.click();
  await delay(10);

  // Unsubscribe menu item
  let unsubTexts = document.querySelectorAll('yt-formatted-string, tp-yt-paper-item');
  for (let el of unsubTexts) {
    if (el.textContent.trim() === 'Unsubscribe') {
      el.click(); break;
    }
  }
  await delay(10);

  // Confirm
  let confirm = document.querySelector('#confirm-button, [aria-label*="Unsubscribe"] button, tp-yt-paper-button');
  if (confirm) confirm.click();
}
// Floating start button
function addFloatingButton() {
  let btn = document.createElement('button');
  btn.textContent = '\u{1F4CB} Mass Unsub Manager';
  btn.style.cssText = `position:fixed;bottom:30px;right:30px;z-index:99999;padding:15px 20px;background:#c00;color:white;border:none;border-radius:50px;font-size:16px;box-shadow:0 4px 15px rgba(0,0,0,0.4);cursor:pointer;`;
  btn.onclick = () => {
    channels = getAllChannels();
    if (channels.length === 0) {
      alert('Kuch channels nahi dikhe – page ko thoda scroll karke "Show more" dabao phir try karo');
      return;
    }
    createModal();
  };
  document.body.appendChild(btn);
}

// Auto load all channels (scroll to bottom)
function autoScrollToLoadAll() {
  let lastHeight = 0;
  const scrollInterval = setInterval(() => {
    window.scrollBy(0, 800);
    if (document.documentElement.scrollHeight === lastHeight) {
      clearInterval(scrollInterval);
      window.scrollTo(0, 0);
      alert('\u2705 All channels loaded! Please click on floating button to open manager.');
    }
    lastHeight = document.documentElement.scrollHeight;
  }, 900);
}

// Init
setTimeout(() => {
  addFloatingButton();
  // optional auto-scroll button bhi add kar sakte ho agar chaho
}, 3000);