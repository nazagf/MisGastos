/* Datos en memoria: el servidor confirma cada cambio antes de mostrarlo. */
(function() {
  'use strict';

  const API_BASE = '/api';
  let cachedExpenses = [];
  let cachedBudgets = {};
  let cachedSettings = {};
  let ready = false;
  let pendingWrite = Promise.resolve();

  async function request(path, { method = 'GET', data } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error('Tu sesión venció. Volvé a ingresar.');
        throw new Error(payload.error || `El servidor rechazó la operación (${response.status}).`);
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) {
        throw new Error('No se pudo confirmar la operación. Revisá la conexión y recargá antes de reintentar.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function write(operation) {
    if (!ready) return Promise.reject(new Error('Esperá a que se carguen los datos.'));
    const result = pendingWrite.then(operation);
    pendingWrite = result.catch(() => {});
    return result;
  }

  function acceptSnapshot(data) {
    cachedExpenses = data.expenses;
    cachedBudgets = data.budgets;
    cachedSettings = data.settings;
  }

  async function loadDataFromServer() {
    const data = await request('/backup');
    acceptSnapshot(data);
    ready = true;
  }

  function getAllExpenses() {
    return structuredClone(cachedExpenses);
  }

  function getExpenses(month, year) {
    return getAllExpenses().filter(exp => {
      const date = new Date(exp.date + 'T12:00:00');
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  function getExpenseById(id) {
    const expense = cachedExpenses.find(exp => exp.id === id);
    return expense ? structuredClone(expense) : undefined;
  }

  function addExpense(expense) {
    const data = { ...expense, id: expense.id || Utils.generateId() };
    return write(async () => {
      const saved = await request('/expenses', { method: 'POST', data });
      cachedExpenses = [...cachedExpenses.filter(exp => exp.id !== saved.id), saved];
      return structuredClone(saved);
    });
  }

  function updateExpense(id, updates) {
    return write(async () => {
      const saved = await request(`/expenses/${encodeURIComponent(id)}`, { method: 'PUT', data: updates });
      cachedExpenses = cachedExpenses.map(exp => exp.id === id ? saved : exp);
      return structuredClone(saved);
    });
  }

  function deleteExpense(id) {
    return write(async () => {
      await request(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
      cachedExpenses = cachedExpenses.filter(exp => exp.id !== id);
    });
  }

  function getBudgets(month, year) {
    return structuredClone(cachedBudgets[`${year}-${month}`] || { total: 0, categories: {} });
  }

  function setBudgets(month, year, budgetData) {
    const key = `${year}-${month}`;
    return write(async () => {
      const saved = await request('/budgets', {
        method: 'POST', data: { yearMonth: key, ...budgetData }
      });
      cachedBudgets[key] = saved;
    });
  }

  function exportAllData() {
    return structuredClone({ version: 1, exportedAt: new Date().toISOString(),
      expenses: cachedExpenses, budgets: cachedBudgets, settings: cachedSettings });
  }

  function importAllData(data, mode = 'replace') {
    return write(async () => {
      const saved = await request('/backup', { method: 'POST', data: { mode, data } });
      acceptSnapshot(saved);
    });
  }

  async function initSampleData() {
    const { month, year } = Utils.getCurrentMonthYear();
    const date = `${year}-${String(month + 1).padStart(2, '0')}-14`;
    const samples = [
      { description: 'Supermercado', amount: 45200, category: 'alimentos', paymentMethod: 'debito' },
      { description: 'Factura de luz', amount: 18500, category: 'servicios', paymentMethod: 'transferencia' },
      { description: 'Transporte', amount: 3200, category: 'transporte', paymentMethod: 'efectivo' }
    ].map(exp => ({ ...exp, date, notes: '', id: Utils.generateId() }));
    await importAllData({ expenses: samples,
      budgets: { [`${year}-${month}`]: { total: 300000, categories: { alimentos: 120000 } } },
      settings: {} });
  }

  function clearAllData() {
    return write(async () => {
      await request('/expenses', { method: 'DELETE' });
      acceptSnapshot({ expenses: [], budgets: {}, settings: {} });
    });
  }

  function getSpendingSummary(month, year) {
    const expenses = getExpenses(month, year);
    const summary = {
      total: 0,
      byCategory: {},
      byPaymentMethod: {},
      count: expenses.length
    };

    // Initialize categories
    Object.keys(Utils.CATEGORIES).forEach(cat => {
      summary.byCategory[cat] = 0;
    });

    Object.keys(Utils.PAYMENT_METHODS).forEach(pm => {
      summary.byPaymentMethod[pm] = 0;
    });

    expenses.forEach(exp => {
      summary.total += exp.amount;
      summary.byCategory[exp.category] = (summary.byCategory[exp.category] || 0) + exp.amount;
      summary.byPaymentMethod[exp.paymentMethod] = (summary.byPaymentMethod[exp.paymentMethod] || 0) + exp.amount;
    });

    return summary;
  }

  /**
   * Get daily accumulation for the month (for line chart)
   */
  function getDailyAccumulation(month, year) {
    const expenses = getExpenses(month, year);
    const daysInMonth = Utils.getDaysInMonth(month, year);
    const dailyTotals = new Array(daysInMonth).fill(0);

    expenses.forEach(exp => {
      const day = new Date(exp.date + 'T12:00:00').getDate();
      dailyTotals[day - 1] += exp.amount;
    });

    // Accumulate
    const accumulated = [];
    let sum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      sum += dailyTotals[i];
      accumulated.push(sum);
    }

    return accumulated;
  }

  /**
   * Get monthly totals for the last N months
   */
  function getMonthlyTotals(count = 6) {
    const result = [];
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();

    for (let i = 0; i < count; i++) {
      const expenses = getExpenses(month, year);
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      result.unshift({
        month,
        year,
        total,
        label: Utils.getShortMonthName(month)
      });

      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
    }

    return result;
  }

  // Export
  window.Storage = {
    isReady: () => ready,
    loadDataFromServer,
    getAllExpenses,
    getExpenses,
    getExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    getBudgets,
    setBudgets,
    exportAllData,
    importAllData,
    initSampleData,
    clearAllData,
    getSpendingSummary,
    getDailyAccumulation,
    getMonthlyTotals
  };

})();
