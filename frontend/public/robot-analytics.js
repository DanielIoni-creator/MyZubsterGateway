let revenueChart;

function initGoogleAnalytics() {
  const params = new URLSearchParams(window.location.search);
  const measurementId = params.get('ga') || document.querySelector('meta[name="google-analytics-id"]').content;
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function table(headers, rows) {
  const head = `<thead><tr>${headers.map(item => `<th>${item}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map(row => `<tr>${row.map(item => `<td>${item}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${head}${body}</table>`;
}

async function load() {
  const status = document.getElementById('status');
  status.textContent = 'Loading...';
  try {
    const response = await fetch('/api/robot/analytics/summary');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    const data = payload.data;
    document.getElementById('robots').textContent = data.byRobot.length;
    document.getElementById('jobs').textContent = data.byRobot.reduce((sum, item) => sum + item.jobsCompleted, 0);
    document.getElementById('events').textContent = data.totalEvents;
    document.getElementById('categories').innerHTML = table(
      ['Category', 'Revenue', 'Cost', 'ROI'],
      data.byCategory.map(item => [item.key, `${item.revenueMYZ} MYZ`, `${item.costMYZ} MYZ`, item.roiPercent === null ? 'n/a' : `${item.roiPercent}%`])
    );
    document.getElementById('posts').innerHTML = table(
      ['Post', 'Robot', 'Engagement', 'Rate'],
      data.topPosts.map(item => [item.postId, item.robotId, item.engagement, `${item.engagementRate}%`])
    );
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(document.getElementById('revenue-chart'), {
      type: 'bar',
      data: { labels: data.byRobot.map(item => item.key), datasets: [{ label: 'MYZ revenue', data: data.byRobot.map(item => item.revenueMYZ), backgroundColor: '#138675' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    status.textContent = `Updated ${new Date(data.generatedAt).toLocaleString()}`;
  } catch (error) { status.textContent = error.message; }
}

initGoogleAnalytics();
document.getElementById('refresh').addEventListener('click', load);
load();
