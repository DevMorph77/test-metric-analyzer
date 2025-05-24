const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="/public/style.css">
</head>
<body>
  <h1>Test Metrics Dashboard</h1>

  <div class="kpis">
    <div class="card">
      <h2>Total Tests</h2>
      <p id="totalTests">-</p>
    </div>
    <div class="card">
      <h2>Total Steps</h2>
      <p id="totalSteps">-</p>
    </div>
    <div class="card">
      <h2>Total Cases</h2>
      <p id="totalCases">-</p>
    </div>
  </div>

  <canvas id="barChart" height="200"></canvas>
  <div id="error" class="error" style="display:none;">Failed to load metrics.</div>

  <div id="moduleDetail" style="display: none; margin-top: 40px;">
    <h2>Module Details: <span id="detailModuleName"></span></h2>
    <div id="detailContent"></div>
  </div>

  <script>
    let myChart;
    let testMetricsData = {};

    fetch('/test-metrics.json')
      .then(res => res.json())
      .then(data => {
        testMetricsData = data;
        const total = data._total || {};
        document.getElementById('totalTests').textContent = total.totalTests || 0;
        document.getElementById('totalSteps').textContent = total.totalTestSteps || 0;
        document.getElementById('totalCases').textContent = total.totalTestCases || 0;

        const labels = [];
        const values = [];
        const stepValues = [];

        for (const [key, value] of Object.entries(data)) {
          if (key !== '_total') {
            labels.push(key.split('/').pop());
            values.push(value.totalTests);
            stepValues.push(value.totalTestSteps);
          }
        }

        const ctx = document.getElementById('barChart');
        myChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Total Tests',
                data: values,
                backgroundColor: '#4c9aff',
                borderRadius: 6
              },
              {
                label: 'Total Steps',
                data: stepValues,
                backgroundColor: '#00bcd4',
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label: ctx => \`\${ctx.dataset.label}: \${ctx.parsed.y}\`
                }
              }
            },
            scales: {
              x: {
                stacked: true,
                title: { display: true, text: 'Module' }
              },
              y: {
                stacked: true,
                title: { display: true, text: 'Count' },
                beginAtZero: true
              }
            },
            onClick: (e) => {
              const activeElements = myChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
              if (activeElements.length > 0) {
                const firstElementIndex = activeElements[0].index;
                const moduleName = myChart.data.labels[firstElementIndex];
                displayModuleDetails(moduleName);
              }
            }
          }
        });
      })
      .catch(err => {
        console.error(err);
        document.getElementById('error').style.display = 'block';
      });

    function displayModuleDetails(moduleName) {
      const detailArea = document.getElementById('moduleDetail');
      const detailName = document.getElementById('detailModuleName');
      const detailContent = document.getElementById('detailContent');

      detailName.textContent = moduleName;

      const moduleData = testMetricsData[moduleName];
      if (moduleData) {
        detailContent.innerHTML = \`
          <p>Total Tests: \${moduleData.totalTests}</p>
          <p>Total Steps: \${moduleData.totalTestSteps}</p>
          <p>Total Cases: \${moduleData.totalTestCases}</p>
        \`;
      } else {
        detailContent.innerHTML = '<p>Details not found for ' + moduleName + '</p>';
      }

      detailArea.style.display = 'block';
    }
  </script>
</body>
</html>
`;

module.exports = htmlTemplate;
