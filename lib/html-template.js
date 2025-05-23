const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      margin: 40px auto;
      max-width: 1000px;
      padding: 0 20px;
      background: #f5f7fa;
      color: #333;
    }

    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 30px;
    }

    .kpis {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 40px;
    }

    .card {
      flex: 1;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }

    .card h2 {
      font-size: 1.2em;
      color: #888;
      margin-bottom: 10px;
    }

    .card p {
      font-size: 2em;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }

    canvas {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .error {
      color: red;
      text-align: center;
      margin-top: 20px;
      font-weight: bold;
    }
  </style>
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

  <script>
    fetch('/test-metrics.json')
      .then(res => res.json())
      .then(data => {
        const total = data._total || {};
        document.getElementById('totalTests').textContent = total.totalTests || 0;
        document.getElementById('totalSteps').textContent = total.totalTestSteps || 0;
        document.getElementById('totalCases').textContent = total.totalTestCases || 0;

        const labels = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
          if (key !== '_total') {
            labels.push(key.split('/').pop());
            values.push(value.totalTests);
          }
        }

        new Chart(document.getElementById('barChart'), {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Total Tests per Module',
              data: values,
              backgroundColor: '#4c9aff',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => \`\${ctx.parsed.y} tests\`
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Module' }},
              y: { title: { display: true, text: 'Tests' }, beginAtZero: true }
            }
          }
        });
      })
      .catch(err => {
        console.error(err);
        document.getElementById('error').style.display = 'block';
      });
  </script>
</body>
</html>
`;

module.exports = htmlTemplate;
