/* ============================================
   MisGastos — Budgets Module
   ============================================ */

(function() {
  'use strict';

  /**
   * Render the budgets section
   */
  function render(month, year) {
    renderBudgetOverview(month, year);
    renderBudgetForm(month, year);
  }

  /**
   * Render the budget overview with progress bars
   */
  function renderBudgetOverview(month, year) {
    const container = document.getElementById('budget-overview');
    if (!container) return;

    const budgets = Storage.getBudgets(month, year);
    const summary = Storage.getSpendingSummary(month, year);

    // Total budget card
    let totalHTML = '';
    if (budgets.total > 0) {
      const totalPct = Math.round((summary.total / budgets.total) * 100);
      const totalStatus = totalPct >= 100 ? 'danger' : totalPct >= 80 ? 'warning' : 'ok';

      totalHTML = `
        <div class="p-5 bg-surface-alt/50 rounded-lg border border-border mb-8 border-l-4 ${totalStatus === 'danger' ? 'border-l-danger' : totalStatus === 'warning' ? 'border-l-warning' : 'border-l-success'}">
          <div class="flex justify-between items-end mb-4">
            <div class="text-lg font-semibold text-text-main flex items-center">
              <span class="mr-2">💰</span> Presupuesto Total del Mes
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold font-mono text-text-main leading-tight">${Utils.formatCurrency(summary.total)}</div>
              <div class="text-sm text-text-muted">de ${Utils.formatCurrency(budgets.total)}</div>
            </div>
          </div>
          <div class="budget-bar-track bg-border rounded-full h-2.5 w-full overflow-hidden">
            <div class="budget-bar-fill h-full transition-all duration-300 ${totalStatus === 'danger' ? 'bg-danger' : totalStatus === 'warning' ? 'bg-warning' : 'bg-success'}" style="width:${Math.min(totalPct, 100)}%"></div>
          </div>
          <div class="flex justify-between items-center text-xs font-medium mt-2 ${totalStatus === 'danger' ? 'text-danger' : totalStatus === 'warning' ? 'text-warning' : 'text-success'}">
            <span>${totalPct}% utilizado</span>
            <span>${totalPct >= 100 ? '¡Presupuesto superado!' : `Quedan ${Utils.formatCurrency(budgets.total - summary.total)}`}</span>
          </div>
        </div>
      `;
    }

    // Category budgets
    const categoryCards = Object.entries(Utils.CATEGORIES).map(([key, cat]) => {
      const spent = summary.byCategory[key] || 0;
      const budget = (budgets.categories && budgets.categories[key]) || 0;

      if (budget === 0 && spent === 0) return '';

      const pct = budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0);
      const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'ok';

      return `
        <div class="p-4 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <div class="flex items-center text-text-main font-medium">
              <span class="text-xl mr-2">${cat.icon}</span>
              ${cat.name}
            </div>
            <div class="text-right">
              <div class="font-mono font-semibold" style="color:${cat.color}">${Utils.formatCurrency(spent)}</div>
              ${budget > 0 ? `<div class="text-xs text-text-muted mt-0.5">de ${Utils.formatCurrency(budget)}</div>` : '<div class="text-xs text-text-muted mt-0.5">Sin presupuesto</div>'}
            </div>
          </div>
          ${budget > 0 ? `
            <div class="budget-bar-track bg-border rounded-full h-1.5 w-full overflow-hidden mb-1">
              <div class="budget-bar-fill h-full transition-all duration-300 ${status === 'danger' ? 'bg-danger' : status === 'warning' ? 'bg-warning' : ''}" style="width:${Math.min(pct, 100)}%; ${status === 'ok' ? `background:${cat.color}` : ''}"></div>
            </div>
            <div class="text-xs font-semibold text-right ${status === 'danger' ? 'text-danger' : status === 'warning' ? 'text-warning' : 'text-text-muted'}">${pct}%</div>
          ` : `
            <div class="budget-bar-track bg-border rounded-full h-1.5 w-full overflow-hidden">
              <div class="budget-bar-fill bg-border w-full"></div>
            </div>
          `}
        </div>
      `;
    }).filter(Boolean);

    container.innerHTML = `
      ${totalHTML}
      ${categoryCards.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${categoryCards.join('')}
        </div>
      ` : `
        <div class="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
          <div class="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-text-muted text-3xl">bar_chart</span>
          </div>
          <h3 class="text-lg font-semibold text-text-main">Sin presupuestos configurados</h3>
          <p class="text-text-muted mt-2 text-sm max-w-sm">Configurá tus presupuestos abajo para empezar a controlar tus gastos</p>
        </div>
      `}
    `;
  }

  /**
   * Render the budget configuration form
   */
  function renderBudgetForm(month, year) {
    const container = document.getElementById('budget-form-container');
    if (!container) return;

    const budgets = Storage.getBudgets(month, year);

    container.innerHTML = `
      <div class="w-full">
        <div class="flex items-center mb-6 pb-4 border-b border-border">
          <span class="material-symbols-outlined mr-2 text-text-muted">settings</span>
          <h3 class="text-lg font-semibold text-text-main">Configurar Presupuestos — ${Utils.formatMonthYear(month, year)}</h3>
        </div>

        <div class="mb-8 p-4 bg-surface-alt/30 border border-border rounded-lg">
          <label class="block text-sm font-semibold text-text-main mb-2">Presupuesto Total del Mes</label>
          <div class="relative max-w-xs">
            <span class="absolute left-3 top-2 text-text-muted font-bold">$</span>
            <input type="number" id="budget-total"
              value="${Utils.escapeHTML(budgets.total || '')}"
              placeholder="Ej: 500000" min="0" step="0.01"
              class="w-full pl-8 pr-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
          </div>
          <p class="text-xs text-text-muted mt-2">Opcional. Si no ingresás un total, se calculará sumando las categorías.</p>
        </div>

        <h4 class="text-sm font-semibold text-text-main mb-4 uppercase tracking-wider">Presupuesto por Categoría</h4>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          ${Object.entries(Utils.CATEGORIES).map(([key, cat]) => `
            <div class="flex flex-col">
              <label class="flex items-center text-sm font-medium text-text-main mb-2">
                <span class="mr-2 text-lg">${cat.icon}</span> ${cat.name}
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-text-muted">$</span>
                <input type="number" id="budget-cat-${key}"
                  value="${Utils.escapeHTML((budgets.categories && budgets.categories[key]) || '')}"
                  placeholder="0" min="0" step="0.01"
                  class="w-full pl-8 pr-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
              </div>
            </div>
          `).join('')}
        </div>

        <div class="flex gap-3 pt-6 border-t border-border">
          <button class="btn-primary flex items-center" id="btn-save-budgets">
            <span class="material-symbols-outlined text-[18px] mr-2">save</span> Guardar Presupuestos
          </button>
          <button class="btn-secondary" id="btn-clear-budgets">Limpiar Todo</button>
        </div>
      </div>
    `;

    // Bind save
    document.getElementById('btn-save-budgets').addEventListener('click', () => {
      saveBudgets(month, year);
    });

    // Bind clear
    document.getElementById('btn-clear-budgets').addEventListener('click', event => {
      Utils.runAction(event.currentTarget, async () => {
        const budgetData = { total: 0, categories: {} };
        await Storage.setBudgets(month, year, budgetData);
        Utils.showToast('Presupuestos limpiados', 'info');
        render(month, year);
      });
    });
  }

  /**
   * Save budgets from form
   */
  function saveBudgets(month, year) {
    const total = Number(document.getElementById('budget-total').value);
    const categories = {};

    Object.keys(Utils.CATEGORIES).forEach(key => {
      const input = document.getElementById(`budget-cat-${key}`);
      if (input && input.value) {
        categories[key] = Number(input.value);
      }
    });

    const effectiveTotal = total || Object.values(categories).reduce((sum, value) => sum + value, 0);
    Utils.runAction(document.getElementById('btn-save-budgets'), async () => {
      await Storage.setBudgets(month, year, { total: Math.round(effectiveTotal * 100) / 100, categories });
      Utils.showToast('Presupuestos guardados correctamente', 'success');
      render(month, year);
    });
  }

  // Export
  window.Budgets = {
    render
  };

})();
