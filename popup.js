const delay = ms => new Promise(r => setTimeout(r, ms));

document.getElementById('startBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.textContent = 'Checking page...';

  let tabs = await chrome.tabs.query({url: "*://*.youtube.com/feed/channels*"});
  let targetTab;

  if (tabs.length > 0) {
    targetTab = tabs[0];
    await chrome.tabs.update(targetTab.id, {active: true});
    status.textContent = 'Page detected ✅';
  } else {
    targetTab = await chrome.tabs.create({url: 'https://www.youtube.com/feed/channels', active: true});
    status.textContent = 'Opening page...';
    await delay(6000);
  }

  await chrome.scripting.executeScript({
    target: {tabId: targetTab.id},
    func: injectRealUnsubModal
  });

  status.textContent = '✅ Modal ready!';
  setTimeout(() => window.close(), 1200);
});

function injectRealUnsubModal() {
  try {
    const delay = ms => new Promise(r => setTimeout(r, ms));

    function getAllChannels() {
      return Array.from(document.querySelectorAll('ytd-channel-renderer'))
        .map(item => ({
          name: item.querySelector('#channel-title yt-formatted-string, #text')?.textContent?.trim() || 'Unknown',
          element: item
        }))
        .filter(ch => {
          const hasSubscribed = ch.element.querySelector('button[aria-label*="Subscribed"]') ||
                                ch.element.querySelector('.yt-spec-touch-feedback-shape--touch-response') &&
                                !ch.element.querySelector('.yt-spec-touch-feedback-shape--touch-response-inverse');
          return hasSubscribed;
        });
    }

    async function unsubscribeOne(item) {
      let subscribedFill = item.querySelector('.yt-spec-touch-feedback-shape--touch-response .yt-spec-touch-feedback-shape__fill');
      if (subscribedFill) subscribedFill.click();
      else {
        let subBtn = item.querySelector('button[aria-label*="Subscribed"]');
        if (subBtn) subBtn.click();
      }
      await delay(380);

      let menuItem = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer')).find(el => {
        const text = el.querySelector('yt-formatted-string');
        return text && text.textContent.trim() === 'Unsubscribe';
      });
      if (menuItem) menuItem.click();
      await delay(10);

      await delay(10);
      let confirmFills = document.querySelectorAll('yt-confirm-dialog-renderer .yt-spec-touch-feedback-shape__fill');
      if (confirmFills.length > 0) confirmFills[confirmFills.length - 1].click();
      await delay(10);
    }

    function createModal() {

  let old = document.getElementById('hvsModal');
  if (old) old.remove();

  let oldOverlay = document.getElementById('hvsOverlay');
  if (oldOverlay) oldOverlay.remove();

  // Overlay (click-through safe)
  const overlay = document.createElement('div');
  overlay.id = 'hvsOverlay';
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.6);
    backdrop-filter:blur(6px);
    z-index:999997;
  `;
  document.body.appendChild(overlay);

  // Modal
  const modal = document.createElement('div');
  modal.id = 'hvsModal';
  modal.style.cssText = `
    position:fixed;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    width:760px;
    max-width:92vw;
    height:88vh;
    max-height:92vh;
    border-radius:22px;
    background:linear-gradient(145deg,#141e30,#243b55);
    box-shadow:0 25px 60px rgba(0,0,0,0.8);
    display:flex;
    flex-direction:column;
    overflow:hidden;
    z-index:999999;
    font-family:Segoe UI, sans-serif;
    color:white;
  `;

  modal.innerHTML = `
    <div id="modalHeader" style="
      padding:20px;
      text-align:center;
      font-size:22px;
      font-weight:bold;
      background:linear-gradient(90deg,#ff004c,#ff6a00);
      cursor:grab;
      user-select:none;
    ">
      🚀 HVS Mass Unsubscribe
    </div>

    <div style="
      padding:16px;
      display:flex;
      gap:12px;
      justify-content:center;
      flex-wrap:wrap;
      background:rgba(255,255,255,0.05);
    ">
      <button id="selectAll" class="hvsBtn green">Select All</button>
      <button id="autoLoad" class="hvsBtn blue">Load All</button>
      <button id="refresh" class="hvsBtn orange">Refresh</button>
      <button id="close" class="hvsBtn red">Close</button>
    </div>

    <div id="tableArea" style="
      flex:1;
      overflow-y:auto;
      padding:20px;
      background:rgba(0,0,0,0.35);
    "></div>

    <div style="
      padding:20px;
      text-align:center;
      background:rgba(255,255,255,0.05);
      border-top:1px solid rgba(255,255,255,0.08);
    ">
      <button id="unsubBtn" class="hvsBtn red large">
        Unsubscribe Selected
      </button>
      <div id="statusLine" style="
        margin-top:15px;
        font-size:15px;
        color:#00ff9d;
      "></div>
    </div>
  `;

  document.body.appendChild(modal);

  /* ---------- Button Styling ---------- */
  const style = document.createElement('style');
  style.innerHTML = `
    .hvsBtn{
      padding:10px 24px;
      border:none;
      border-radius:30px;
      font-weight:600;
      cursor:pointer;
      color:white;
      transition:.3s;
      box-shadow:0 6px 18px rgba(0,0,0,.4);
    }
    .hvsBtn.large{
      padding:16px 50px;
      font-size:17px;
    }
    .green{background:linear-gradient(90deg,#00c853,#64dd17);}
    .blue{background:linear-gradient(90deg,#2979ff,#448aff);}
    .orange{background:linear-gradient(90deg,#ff9100,#ffb300);}
    .red{background:linear-gradient(90deg,#ff1744,#ff5252);}

    .hvsBtn:hover{
      transform:translateY(-3px);
      box-shadow:0 12px 28px rgba(0,0,0,.6);
    }
  `;
  document.head.appendChild(style);

  /* ---------- FIX: Ensure overlay doesn't block modal ---------- */
  modal.addEventListener('click', e => e.stopPropagation());
  overlay.addEventListener('click', () => {
    modal.remove();
    overlay.remove();
  });

  /* ---------- DRAG FIX ---------- */
  const header = modal.querySelector('#modalHeader');
  let isDragging = false, offsetX, offsetY;

  header.addEventListener('mousedown', e => {
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    modal.style.transform = 'none';
    modal.style.left = rect.left + 'px';
    modal.style.top = rect.top + 'px';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    modal.style.left = (e.clientX - offsetX) + 'px';
    modal.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => isDragging = false);

  /* ---------- BUTTON EVENTS (NOW SAFE) ---------- */
  modal.querySelector('#close').addEventListener('click', (e) => {
  e.stopPropagation();
  modal.remove();
  overlay.remove();
});

  document.getElementById('refresh').onclick = renderTable;

  document.getElementById('selectAll').onclick = () => {
    const boxes = document.querySelectorAll('.chBox');
    const allChecked = [...boxes].every(b => b.checked);
    boxes.forEach(b => b.checked = !allChecked);
  };

  document.getElementById('autoLoad').onclick = autoLoadMore;

  document.getElementById('unsubBtn').onclick = startRealUnsub;

  renderTable();
}

    function renderTable() {
      const channels = getAllChannels();
      const area = document.getElementById('tableArea');
      if (channels.length === 0) {
        area.innerHTML = '<p style="text-align:center;color:#0f0;font-size:18px;">✅ Sab channels unsub ho gaye! List empty.</p>';
        return;
      }
      let html = `<table style="width:100%;color:white;border-collapse:collapse;">
        <thead><tr style="background:#222;"><th><input type="checkbox" id="masterCheck"></th><th style="text-align:left;padding:10px;">Channel Name</th></tr></thead>
        <tbody>`;
      channels.forEach((ch, i) => {
        html += `<tr style="border-bottom:1px solid #333;">
          <td style="padding:10px;"><input type="checkbox" class="chBox" data-index="${i}"></td>
          <td style="padding:10px;">${ch.name || 'Channel ' + (i+1)}</td></tr>`;
      });
      html += `</tbody></table>`;
      area.innerHTML = html;

      document.getElementById('masterCheck').onchange = e => {
        document.querySelectorAll('.chBox').forEach(cb => cb.checked = e.target.checked);
      };
    }

    async function startRealUnsub() {
      const selected = Array.from(document.querySelectorAll('.chBox:checked')).map(cb => parseInt(cb.dataset.index));
      const all = getAllChannels();
      const valid = selected.filter(idx => idx >= 0 && idx < all.length);
      if (valid.length === 0) return alert('Please select at least one channel to unsubscribe.');

      const status = document.getElementById('statusLine');
      status.textContent = `Processing ${valid.length}...`;

      for (let i = 0; i < valid.length; i++) {
        const idx = valid[i];
        const name = all[idx]?.name || 'Unknown';
        status.textContent = `Unsubbing (${i+1}/${valid.length}): ${name}`;
        await unsubscribeOne(all[idx].element);
        await delay(30 + Math.random() * 1);
        renderTable();
      }
      status.textContent = '✅ All real unsub done! List auto updated.';
    }

    async function autoLoadMore() {
      const btn = document.getElementById('autoLoad');
      btn.textContent = 'Loading...';
      let last = 0;
      const int = setInterval(() => {
        window.scrollBy(0, 3000);
        if (document.documentElement.scrollHeight === last) {
          clearInterval(int);
          window.scrollTo(0,0);
          btn.textContent = '✅ Loaded!';
          setTimeout(() => btn.textContent = '🔄 Load All Subs', 2000);
          renderTable();
        }
        last = document.documentElement.scrollHeight;
      }, 900);
    }

    setTimeout(createModal, 1500);

  } catch(e) {
    alert('Error: ' + e.message + '\nCtrl+R kar do');
  }
}