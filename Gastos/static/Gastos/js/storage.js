/* ============================================
   MisGastos — Storage Layer (Cached + PostgreSQL API Backend)
   ============================================ */

(function() {
  'use strict';

  const STORAGE_KEYS = {
    expenses: 'misgastos_expenses',
    budgets: 'misgastos_budgets',
    settings: 'misgastos_settings',
    initialized: 'misgastos_initialized'
  };

  const API_BASE = '/api';

  // In-memory cache for synchronous reads
  let cachedExpenses = [];
  let cachedBudgets = {};
  let cachedSettings = {};

  /**
   * Load all data from PostgreSQL server, with localStorage fallback
   */
  async function loadDataFromServer() {
    try {
      console.log('Cargando datos desde el servidor API PostgreSQL...');
      
      // Fetch expenses
      const expRes = await fetch(`${API_BASE}/expenses`);
      if (!expRes.ok) throw new Error('Error al obtener gastos del servidor');
      cachedExpenses = await expRes.ok ? await expRes.json() : [];

      // Fetch budgets
      const budRes = await fetch(`${API_BASE}/budgets`);
      if (!budRes.ok) throw new Error('Error al obtener presupuestos del servidor');
      cachedBudgets = await budRes.json();

      // Fetch settings
      const setRes = await fetch(`${API_BASE}/settings`);
      if (!setRes.ok) throw new Error('Error al obtener configuraciones del servidor');
      cachedSettings = await setRes.json();

      // Update backup local storage copy
      localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(cachedExpenses));
      localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(cachedBudgets));
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(cachedSettings));
      localStorage.setItem(STORAGE_KEYS.initialized, 'true');
      
      console.log('Datos cargados de PostgreSQL correctamente.');
    } catch (err) {
      console.warn('No se pudo conectar con el servidor backend. Usando respaldo de localStorage:', err);
      // Fallback to local storage
      const localExp = localStorage.getItem(STORAGE_KEYS.expenses);
      cachedExpenses = localExp ? JSON.parse(localExp) : [];

      const localBud = localStorage.getItem(STORAGE_KEYS.budgets);
      cachedBudgets = localBud ? JSON.parse(localBud) : {};

      const localSet = localStorage.getItem(STORAGE_KEYS.settings);
      cachedSettings = localSet ? JSON.parse(localSet) : {};
    }
  }

  /**
   * Get all expenses
   */
  function getAllExpenses() {
    return cachedExpenses;
  }

  /**
   * Get expenses filtered by month and year
   */
  function getExpenses(month, year) {
    return cachedExpenses.filter(exp => {
      // Handle YYYY-MM-DD string date safely
      const date = new Date(exp.date + 'T12:00:00');
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  /**
   * Get a single expense by ID
   */
  function getExpenseById(id) {
    return cachedExpenses.find(exp => exp.id === id);
  }

  /**
   * Add a new expense (Optimistic update + Async POST)
   */
  function addExpense(expense) {
    const newExpense = {
      id: expense.id || Utils.generateId(),
      description: expense.description,
      amount: parseFloat(expense.amount),
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      date: expense.date,
      notes: expense.notes || '',
      createdAt: new Date().toISOString()
    };

    // Update in-memory cache
    cachedExpenses.push(newExpense);

    // Save local storage backup
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(cachedExpenses));

    // Send to Postgres backend asynchronously
    fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    }).catch(err => console.error('Error al guardar gasto en el backend (se guardó localmente):', err));

    return newExpense;
  }

  /**
   * Update an existing expense (Optimistic update + Async PUT)
   */
  function updateExpense(id, updates) {
    const index = cachedExpenses.findIndex(exp => exp.id === id);
    if (index === -1) return null;

    cachedExpenses[index] = {
      ...cachedExpenses[index],
      ...updates,
      amount: parseFloat(updates.amount),
      updatedAt: new Date().toISOString()
    };

    // Save local storage backup
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(cachedExpenses));

    // Send to Postgres backend asynchronously
    fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cachedExpenses[index])
    }).catch(err => console.error('Error al actualizar gasto en el backend:', err));

    return cachedExpenses[index];
  }

  /**
   * Delete an expense by ID (Optimistic update + Async DELETE)
   */
  function deleteExpense(id) {
    const originalLength = cachedExpenses.length;
    cachedExpenses = cachedExpenses.filter(exp => exp.id !== id);

    if (cachedExpenses.length === originalLength) return false;

    // Save local storage backup
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(cachedExpenses));

    // Send to Postgres backend asynchronously
    fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error al eliminar gasto en el backend:', err));

    return true;
  }

  /**
   * Get budgets for a specific month/year
   */
  function getBudgets(month, year) {
    const key = `${year}-${month}`;
    return cachedBudgets[key] || { total: 0, categories: {} };
  }

  /**
   * Set budget for a specific month/year (Optimistic update + Async POST)
   */
  function setBudgets(month, year, budgetData) {
    const key = `${year}-${month}`;
    cachedBudgets[key] = budgetData;

    // Save local storage backup
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(cachedBudgets));

    // Send to Postgres backend asynchronously
    fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yearMonth: key,
        total: parseFloat(budgetData.total),
        categories: budgetData.categories
      })
    }).catch(err => console.error('Error al guardar presupuesto en el backend:', err));
  }

  /**
   * Export all data as JSON
   */
  function exportAllData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: cachedExpenses,
      budgets: cachedBudgets,
      settings: cachedSettings
    };
  }

  /**
   * Import all data from JSON
   */
  async function importAllData(data) {
    if (!data || !data.expenses) {
      throw new Error('Formato de datos inválido');
    }
    
    cachedExpenses = data.expenses;
    if (data.budgets) cachedBudgets = data.budgets;
    if (data.settings) cachedSettings = data.settings;

    // Save to local storage backup
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(cachedExpenses));
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(cachedBudgets));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(cachedSettings));

    // Send everything to backend
    try {
      console.log('Importando datos al servidor backend...');
      
      // Upload expenses one-by-one or via setup script
      for (const exp of cachedExpenses) {
        await fetch(`${API_BASE}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exp)
        });
      }

      // Upload budgets
      for (const [key, val] of Object.entries(cachedBudgets)) {
        await fetch(`${API_BASE}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yearMonth: key,
            total: val.total,
            categories: val.categories
          })
        });
      }

      // Upload settings
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: cachedSettings })
      });

      console.log('Importación en el servidor completada con éxito.');
    } catch (err) {
      console.error('Error sincronizando los datos importados con el servidor backend:', err);
    }
  }

  /**
   * Generate sample data for first-time use
   */
  async function initSampleData() {
    // Only initialize if we have zero expenses loaded
    if (cachedExpenses.length > 0) return false;
    if (localStorage.getItem(STORAGE_KEYS.initialized) === 'true') return false;

    console.log('Generando datos de muestra iniciales...');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    function randomDate(month, year) {
      const day = Math.floor(Math.random() * 28) + 1;
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }

    const sampleExpenses = [
      { description: 'Supermercado Carrefour', amount: 45200, category: 'alimentos', paymentMethod: 'debito', date: randomDate(currentMonth, currentYear) },
      { description: 'Factura de Luz', amount: 18500, category: 'servicios', paymentMethod: 'transferencia', date: randomDate(currentMonth, currentYear) },
      { description: 'Netflix', amount: 6499, category: 'servicios', paymentMethod: 'credito', date: randomDate(currentMonth, currentYear) },
      { description: 'Spotify', amount: 3499, category: 'servicios', paymentMethod: 'credito', date: randomDate(currentMonth, currentYear) },
      { description: 'Nafta YPF', amount: 32000, category: 'transporte', paymentMethod: 'debito', date: randomDate(currentMonth, currentYear) },
      { description: 'Resumen Visa', amount: 85000, category: 'tarjetas', paymentMethod: 'transferencia', date: randomDate(currentMonth, currentYear) },
      { description: 'Verdulería', amount: 12300, category: 'alimentos', paymentMethod: 'efectivo', date: randomDate(currentMonth, currentYear) },
      { description: 'Zapatillas Nike', amount: 95000, category: 'productos', paymentMethod: 'credito', date: randomDate(currentMonth, currentYear) },
      { description: 'Obra Social', amount: 35000, category: 'salud', paymentMethod: 'transferencia', date: randomDate(currentMonth, currentYear) },
      { description: 'Delivery PedidosYa', amount: 8900, category: 'alimentos', paymentMethod: 'credito', date: randomDate(currentMonth, currentYear) },
      
      { description: 'Supermercado Día', amount: 38000, category: 'alimentos', paymentMethod: 'debito', date: randomDate(prevMonth, prevYear) },
      { description: 'Factura de Luz', amount: 16200, category: 'servicios', paymentMethod: 'transferencia', date: randomDate(prevMonth, prevYear) },
      { description: 'Nafta Shell', amount: 28000, category: 'transporte', paymentMethod: 'debito', date: randomDate(prevMonth, prevYear) }
    ];

    // Bulk upload them
    for (const exp of sampleExpenses) {
      addExpense(exp);
    }

    // Set sample budgets for current month
    const budgetKey = `${currentYear}-${currentMonth}`;
    const budgetData = {
      total: 500000,
      categories: {
        tarjetas: 100000,
        servicios: 70000,
        alimentos: 120000,
        productos: 80000,
        transporte: 50000,
        salud: 50000,
        otros: 30000
      }
    };
    setBudgets(currentMonth, currentYear, budgetData);

    localStorage.setItem(STORAGE_KEYS.initialized, 'true');
    return true;
  }

  /**
   * Clear all data
   */
  function clearAllData() {
    cachedExpenses = [];
    cachedBudgets = {};
    cachedSettings = {};
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    // Clear in backend in background
    fetch(`${API_BASE}/expenses`, { method: 'DELETE' }).catch(err => console.error(err));
  }

  /**
   * Get spending summary for a given month/year
   */
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
