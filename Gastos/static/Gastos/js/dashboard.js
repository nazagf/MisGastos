/* ============================================
   MisGastos — Dashboard Module
   ============================================ */

(function() {
  'use strict';

  let doughnutChart = null;
  let barChart = null;
  let lineChart = null;

  /**
   * Render the complete dashboard
   */
  function render(month, year) {
    renderKPIs(month, year);
    renderCharts(month, year);
    renderRecentTransactions(month, year);
  }

  /**
   * Render KPI cards
   */
  function renderKPIs(month, year) {
    const summary = Storage.getSpendingSummary(month, year);
    const budgets = Storage.getBudgets(month, year);

    // Total KPI
    const totalEl = document.getElementById('kpi-total-value');
    if (totalEl) {
      Utils.animateValue(totalEl, 0, summary.total, 1000);
    }

    // Budget progress
    const budgetBar = document.getElementById('kpi-budget-bar');
    const budgetText = document.getElementById('kpi-budget-text');
    if (budgets.total > 0 && budgetBar && budgetText) {
      const pct = (summary.total / budgets.total) * 100;
      budgetBar.style.width = Math.min(pct, 100) + '%';
      budgetBar.className = 'budget-bar-fill ' + (pct > 100 ? 'danger' : pct > 80 ? 'warning' : 'ok');
      budgetText.textContent = `${Math.round((summary.total / budgets.total) * 100)}% del presupuesto`;
      budgetText.className = 'kpi-change ' + (pct > 100 ? 'negative' : pct > 80 ? 'negative' : 'positive');
    } else if (budgetText) {
      budgetText.textContent = 'Sin presupuesto definido';
      budgetText.className = 'kpi-change';
      if (budgetBar) budgetBar.style.width = '0%';
    }

    // Category KPIs
    const kpiCategories = ['tarjetas', 'servicios', 'alimentos', 'productos'];
    kpiCategories.forEach(cat => {
      const el = document.getElementById(`kpi-${cat}-value`);
      if (el) {
        Utils.animateValue(el, 0, summary.byCategory[cat] || 0, 800);
      }
    });

    // Transaction count
    const countEl = document.getElementById('kpi-count');
    if (countEl) {
      countEl.textContent = `${summary.count} transacciones`;
    }
  }

  /**
   * Render all charts
   */
  function renderCharts(month, year) {
    renderDoughnutChart(month, year);
    renderBarChart();
    renderLineChart(month, year);
  }

  /**
   * Render doughnut chart — spending by category
   */
  function renderDoughnutChart(month, year) {
    const ctx = document.getElementById('chart-doughnut');
    if (!ctx) return;

    const summary = Storage.getSpendingSummary(month, year);
    const cats = Object.keys(Utils.CATEGORIES);
    const data = cats.map(c => summary.byCategory[c] || 0);
    const labels = cats.map(c => Utils.CATEGORIES[c].icon + ' ' + Utils.CATEGORIES[c].name);
    const colors = cats.map(c => Utils.CATEGORIES[c].color);

    // Filter out zero values
    const filtered = { labels: [], data: [], colors: [] };
    data.forEach((val, i) => {
      if (val > 0) {
        filtered.labels.push(labels[i]);
        filtered.data.push(val);
        filtered.colors.push(colors[i]);
      }
    });

    if (doughnutChart) doughnutChart.destroy();

    doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: filtered.labels,
        datasets: [{
          data: filtered.data,
          backgroundColor: filtered.colors.map(c => c + '99'),
          borderColor: filtered.colors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#7c7365',
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 10
            }
          },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#171310',
            bodyColor: '#7c7365',
            borderColor: '#e7ded0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            callbacks: {
              label: function(context) {
                const value = Utils.formatCurrency(context.parsed);
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((context.parsed / total) * 100).toFixed(1);
                return ` ${value} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render bar chart — monthly comparison
   */
  function renderBarChart() {
    const ctx = document.getElementById('chart-bar');
    if (!ctx) return;

    const monthlyData = Storage.getMonthlyTotals(6);

    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(d => d.label),
        datasets: [{
          label: 'Gasto mensual',
          data: monthlyData.map(d => d.total),
          backgroundColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1
              ? 'rgba(169, 120, 31, 0.85)'
              : 'rgba(169, 120, 31, 0.22)'
          ),
          borderColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1
              ? '#a9781f'
              : 'rgba(169, 120, 31, 0.5)'
          ),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#171310',
            bodyColor: '#7c7365',
            borderColor: '#e7ded0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: function(context) {
                return ' ' + Utils.formatCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#7c7365',
              font: { family: 'Inter', size: 11 }
            }
          },
          y: {
            grid: {
              color: '#e7ded0',
              drawBorder: false,
              borderDash: [4, 4]
            },
            ticks: {
              color: '#7c7365',
              font: { family: 'Inter', size: 11 },
              callback: function(value) {
                return Utils.formatCurrency(value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render line chart — daily accumulation
   */
  function renderLineChart(month, year) {
    const ctx = document.getElementById('chart-line');
    if (!ctx) return;

    const accumulated = Storage.getDailyAccumulation(month, year);
    const daysInMonth = Utils.getDaysInMonth(month, year);
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Budget line
    const budgets = Storage.getBudgets(month, year);
    const budgetLine = budgets.total > 0
      ? new Array(daysInMonth).fill(budgets.total)
      : null;

    if (lineChart) lineChart.destroy();

    const datasets = [{
      label: 'Gasto acumulado',
      data: accumulated,
      borderColor: '#a9781f',
      backgroundColor: 'rgba(169, 120, 31, 0.10)',
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#a9781f',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2
    }];

    if (budgetLine) {
      datasets.push({
        label: 'Presupuesto',
        data: budgetLine,
        borderColor: 'rgba(178, 58, 46, 0.55)',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false
      });
    }

    lineChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            labels: {
              color: '#7c7365',
              font: { family: 'Inter', size: 11 },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#171310',
            bodyColor: '#7c7365',
            borderColor: '#e7ded0',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              title: function(tooltipItems) {
                return `Día ${tooltipItems[0].label}`;
              },
              label: function(context) {
                return ` ${context.dataset.label}: ${Utils.formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#7c7365',
              font: { family: 'Inter', size: 10 },
              maxTicksLimit: 15
            }
          },
          y: {
            grid: {
              color: '#e7ded0',
              drawBorder: false,
              borderDash: [4, 4]
            },
            ticks: {
              color: '#7c7365',
              font: { family: 'Inter', size: 11 },
              callback: function(value) {
                return Utils.formatCurrency(value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Render recent transactions list
   */
  function renderRecentTransactions(month, year) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;

    const expenses = Storage.getExpenses(month, year);
    // Sort by date descending, take last 8
    const recent = expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center bg-surface-alt/20">
          <div class="w-12 h-12 bg-surface-alt rounded-full flex items-center justify-center mb-3">
            <span class="material-symbols-outlined text-text-muted text-2xl">inbox</span>
          </div>
          <h3 class="text-base font-medium text-text-main">Sin transacciones</h3>
          <p class="text-text-muted text-sm mt-1">Agregá tu primer gasto para empezar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(exp => {
      const cat = Utils.CATEGORIES[exp.category] || Utils.CATEGORIES.otros;
      return `
        <div class="flex items-center justify-between p-4 border-b border-border bg-white hover:bg-surface-alt/50 transition-colors last:border-b-0">
          <div class="flex items-center flex-1 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0" style="background: ${cat.color}15; color: ${cat.color}">
              <span class="text-lg">${cat.icon}</span>
            </div>
            <div class="truncate pr-4">
              <div class="text-sm font-semibold text-text-main truncate">${Utils.escapeHTML(exp.description)}</div>
              <div class="text-xs text-text-muted mt-0.5">${Utils.formatDateShort(exp.date)} · ${cat.name}</div>
            </div>
          </div>
          <div class="text-sm font-bold font-mono text-text-main flex-shrink-0">-${Utils.formatCurrency(exp.amount)}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Destroy all charts (cleanup)
   */
  function destroy() {
    if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
    if (barChart) { barChart.destroy(); barChart = null; }
    if (lineChart) { lineChart.destroy(); lineChart = null; }
  }

  // Export
  window.Dashboard = {
    render,
    destroy
  };

})();
