const byId = id => document.getElementById(id);
let account = null;

function showNotice(message, isError = false) {
  const notice = byId('notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.hidden = false;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload.data;
}

function renderDashboard() {
  byId('shop-id').textContent = account.shopId;
  byId('available-credit').textContent = `${account.creditsAvailableMYZ} MYZ`;
  byId('referral-count').textContent = account.referralCount;
  byId('used-credit').textContent = `${account.creditsUsedMYZ} MYZ`;
  byId('referral-url').value = account.referralUrl;

  const history = byId('referral-history');
  history.replaceChildren(...account.referrals.map(referral => {
    const row = document.createElement('tr');
    [
      referral.referredShopId,
      referral.referredWalletAddress,
      `${referral.rewardMYZ} MYZ`,
      new Date(referral.creditedAt).toLocaleDateString()
    ].forEach(value => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    return row;
  }));
  byId('empty-history').hidden = account.referrals.length > 0;
  byId('login-view').hidden = true;
  byId('dashboard-view').hidden = false;
}

byId('shop-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    account = await request('/api/referrals/shops', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form))
    });
    renderDashboard();
  } catch (error) { showNotice(error.message, true); }
});

byId('credit-form').addEventListener('submit', async event => {
  event.preventDefault();
  const amountMYZ = Number(new FormData(event.currentTarget).get('amountMYZ'));
  try {
    const result = await request(`/api/referrals/shops/${encodeURIComponent(account.shopId)}/credits/apply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: account.walletAddress, amountMYZ })
    });
    account.creditsAvailableMYZ = result.creditsAvailableMYZ;
    account.creditsUsedMYZ = result.creditsUsedMYZ;
    renderDashboard();
    event.currentTarget.reset();
    showNotice(`${result.appliedMYZ} MYZ credit applied`);
  } catch (error) { showNotice(error.message, true); }
});

byId('copy-link').addEventListener('click', async () => {
  await navigator.clipboard.writeText(account.referralUrl);
  showNotice('Referral link copied');
});
byId('switch-shop').addEventListener('click', () => {
  account = null;
  byId('dashboard-view').hidden = true;
  byId('login-view').hidden = false;
});

const referralMatch = window.location.pathname.match(/^\/referral\/([^/]+)$/);
if (referralMatch) {
  const code = decodeURIComponent(referralMatch[1]);
  byId('login-view').hidden = true;
  byId('signup-view').hidden = false;
  byId('referral-code').textContent = `Referral ${code}`;
  byId('signup-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await request('/api/referrals/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...Object.fromEntries(new FormData(event.currentTarget)) })
      });
      event.currentTarget.hidden = true;
      byId('signup-title').textContent = 'Referral registered';
      byId('continue-link').hidden = false;
    } catch (error) { showNotice(error.message, true); }
  });
}
