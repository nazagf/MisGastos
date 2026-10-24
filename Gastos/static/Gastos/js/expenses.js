/* ============================================
   MisGastos — Expenses Module
   ============================================ */

(function() {
  'use strict';

  let currentSort = { field: 'date', direction: 'desc' };
  let currentFilters = { search: '', category: '', paymentMethod: '' };

  /**
   * Render the expenses section
   */
  function render(month, year) {
    renderFilters();
    renderTable(month, year);
  }

  /**
   * Render filter controls
   */
  function renderFilters() {
    const bar = document.getElementById('expenses-filters');
    if (!bar) return;

    bar.innerHTML = `
      <div class="flex flex-col sm:flex-row gap-4 w-full">
        <div class="flex-1 relative">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
          <input type="text" id="expense-search" class="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="Buscar gastos..." value="${Utils.escapeHTML(currentFilters.search)}">
        </div>
        <div class="flex gap-4 w-full sm:w-auto">
          <select id="filter-category" class="w-full sm:w-48 px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Todas las categorías</option>
            ${Object.entries(Utils.CATEGORIES).map(([key, cat]) =>
              `<option value="${key}" ${currentFilters.category === key ? 'selected' : ''}>${cat.icon} ${cat.name}</option>`
            ).join('')}
          </select>
          <select id="filter-payment" class="w-full sm:w-48 px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Todos los medios</option>
            ${Object.entries(Utils.PAYMENT_METHODS).map(([key, pm]) =>
              `<option value="${key}" ${currentFilters.paymentMethod === key ? 'selected' : ''}>${pm.icon} ${Utils.escapeHTML(pm.name)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;

    // Bind filter events
    document.getElementById('expense-search').addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      const { month, year } = window.App.getCurrentPeriod();
      renderTable(month, year);
    });

    document.getElementById('filter-category').addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      const { month, year } = window.App.getCurrentPeriod();
      renderTable(month, year);
    });

    document.getElementById('filter-payment').addEventListener('change', (e) => {
      currentFilters.paymentMethod = e.target.value;
      const { month, year } = window.App.getCurrentPeriod();
      renderTable(month, year);
    });
  }

  /**
   * Render the expenses table
   */
  function renderTable(month, year) {
    const container = document.getElementById('expenses-table-container');
    if (!container) return;

    let expenses = Storage.getExpenses(month, year);

    // Apply filters
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      expenses = expenses.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    if (currentFilters.category) {
      expenses = expenses.filter(e => e.category === currentFilters.category);
    }
    if (currentFilters.paymentMethod) {
      expenses = expenses.filter(e => e.paymentMethod === currentFilters.paymentMethod);
    }

    // Apply sorting
    expenses.sort((a, b) => {
      let valA, valB;
      switch (currentSort.field) {
        case 'date':
          valA = new Date(a.date); valB = new Date(b.date);
          break;
        case 'amount':
          valA = a.amount; valB = b.amount;
          break;
        case 'description':
          valA = a.description.toLowerCase(); valB = b.description.toLowerCase();
          break;
        case 'category':
          valA = a.category; valB = b.category;
          break;
        default:
          valA = new Date(a.date); valB = new Date(b.date);
      }
      const cmp = valA > valB ? 1 : valA < valB ? -1 : 0;
      return currentSort.direction === 'desc' ? -cmp : cmp;
    });

    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <div class="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-text-muted text-3xl">search_off</span>
          </div>
          <h3 class="text-lg font-semibold text-text-main">No se encontraron gastos</h3>
          <p class="text-text-muted mt-2 text-sm">Probá ajustando los filtros o agregá un nuevo gasto</p>
        </div>
      `;
      return;
    }

    // Calculate total of filtered expenses
    const filteredTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    const sortIcon = (field) => {
      if (currentSort.field !== field) return '';
      return currentSort.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const sortClass = (field) => currentSort.field === field ? 'sorted' : '';

    container.innerHTML = `
      <div class="w-full">
        <table>
          <thead>
            <tr>
              <th class="cursor-pointer hover:bg-surface-alt transition-colors ${sortClass('date')}" data-sort="date">Fecha${sortIcon('date')}</th>
              <th class="cursor-pointer hover:bg-surface-alt transition-colors ${sortClass('description')}" data-sort="description">Descripción${sortIcon('description')}</th>
              <th class="cursor-pointer hover:bg-surface-alt transition-colors ${sortClass('category')}" data-sort="category">Categoría${sortIcon('category')}</th>
              <th>Medio de pago</th>
              <th class="cursor-pointer hover:bg-surface-alt transition-colors text-right ${sortClass('amount')}" data-sort="amount">Monto${sortIcon('amount')}</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(exp => {
              const cat = Utils.CATEGORIES[exp.category] || Utils.CATEGORIES.otros;
              const pm = Utils.PAYMENT_METHODS[exp.paymentMethod] || { name: exp.paymentMethod, icon: '💰' };
              return `
                <tr>
                  <td class="text-text-muted">${Utils.formatDateShort(exp.date)}</td>
                  <td>
                    <div class="font-medium text-text-main">${Utils.escapeHTML(exp.description)}</div>
                    ${exp.notes ? `<div class="text-xs text-text-muted mt-1">${Utils.escapeHTML(exp.notes)}</div>` : ''}
                  </td>
                  <td>
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-surface-alt text-text-main border border-border">
                      <span class="mr-1.5">${cat.icon}</span> ${cat.name}
                    </span>
                  </td>
                  <td>
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-surface-alt text-text-main border border-border">
                      <span class="mr-1.5">${pm.icon}</span> ${Utils.escapeHTML(pm.name)}
                    </span>
                  </td>
                  <td class="text-right font-semibold font-mono text-text-main">${Utils.formatCurrency(exp.amount)}</td>
                  <td>
                    <div class="flex justify-end gap-2">
                      <button class="text-text-muted hover:text-accent transition-colors" data-action="edit" data-expense-id="${Utils.escapeHTML(exp.id)}" title="Editar">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button class="text-text-muted hover:text-danger transition-colors" data-action="delete" data-expense-id="${Utils.escapeHTML(exp.id)}" title="Eliminar">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="font-semibold text-right text-text-muted py-4">
                Total (${expenses.length} gastos):
              </td>
              <td class="text-right font-bold text-lg font-mono text-text-main py-4">
                ${Utils.formatCurrency(filteredTotal)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    container.querySelectorAll('button[data-expense-id]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.expenseId;
        if (button.dataset.action === 'edit') openEditModal(id);
        else confirmDelete(id);
      });
    });

    // Bind sort events
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.field === field) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.direction = 'desc';
        }
        renderTable(month, year);
      });
    });
  }

  /**
   * Open the Add Expense modal
   */
  function openAddModal() {
    if (!Storage.isReady()) {
      Utils.showToast('Esperá a que se carguen los datos.', 'warning');
      return;
    }
    const { month, year } = window.App.getCurrentPeriod();
    const today = new Date();
    const defaultDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    showModal('Agregar Gasto', null, defaultDate);
  }

  /**
   * Open the Edit Expense modal
   */
  function openEditModal(id) {
    const expense = Storage.getExpenseById(id);
    if (!expense) return;
    showModal('Editar Gasto', expense);
  }

  /**
   * Show the expense form modal
   */
  function showModal(title, expense, defaultDate) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = title;

    const isEdit = !!expense;
    const date = expense ? expense.date : (defaultDate || '');
    const desc = expense ? expense.description : '';
    const amount = expense ? expense.amount : '';
    const cat = expense ? expense.category : '';
    const pm = expense ? expense.paymentMethod : '';
    const notes = expense ? (expense.notes || '') : '';

    modalBody.innerHTML = `
      <form id="expense-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-main mb-1">Descripción *</label>
          <input type="text" id="exp-description" value="${Utils.escapeHTML(desc)}" placeholder="Ej: Supermercado Carrefour" required class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-main mb-1">Monto *</label>
            <input type="number" id="exp-amount" value="${Utils.escapeHTML(amount)}" placeholder="0" min="0.01" step="0.01" required class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-main mb-1">Fecha *</label>
            <input type="date" id="exp-date" value="${Utils.escapeHTML(date)}" required class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-main mb-1">Categoría *</label>
            <select id="exp-category" required class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
              <option value="">Seleccionar...</option>
              ${Object.entries(Utils.CATEGORIES).map(([key, c]) =>
                `<option value="${key}" ${cat === key ? 'selected' : ''}>${c.icon} ${c.name}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-main mb-1">Medio de Pago *</label>
            <select id="exp-payment" required class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent !m-0">
              <option value="">Seleccionar...</option>
              ${Object.entries(Utils.PAYMENT_METHODS).map(([key, p]) =>
                `<option value="${key}" ${pm === key ? 'selected' : ''}>${p.icon} ${p.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-main mb-1">Notas (opcional)</label>
          <textarea id="exp-notes" placeholder="Algún detalle adicional..." class="w-full px-3 py-2 bg-white border border-border rounded-md text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y min-h-[80px] !m-0">${Utils.escapeHTML(notes)}</textarea>
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-expense">${isEdit ? 'Guardar Cambios' : 'Agregar Gasto'}</button>
    `;

    // Bind save
    document.getElementById('btn-save-expense').addEventListener('click', () => {
      saveExpense(isEdit ? expense.id : null);
    });

    // Enter key to submit
    document.getElementById('expense-form').addEventListener('submit', e => {
      e.preventDefault();
      saveExpense(isEdit ? expense.id : null);
    });
    document.getElementById('expense-form').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        saveExpense(isEdit ? expense.id : null);
      }
    });

    overlay.classList.add('show');

    // Focus first input
    setTimeout(() => {
      document.getElementById('exp-description').focus();
    }, 100);
  }

  /**
   * Save expense (add or update)
   */
  function saveExpense(editId) {
    const description = document.getElementById('exp-description').value.trim();
    const amount = document.getElementById('exp-amount').value;
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const paymentMethod = document.getElementById('exp-payment').value;
    const notes = document.getElementById('exp-notes').value.trim();

    // Validation
    if (!description || !amount || !date || !category || !paymentMethod) {
      Utils.showToast('Completá todos los campos obligatorios', 'warning');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Utils.showToast('El monto debe ser mayor a 0', 'warning');
      return;
    }

    const expenseData = { description, amount, date, category, paymentMethod, notes };

    Utils.runAction(document.getElementById('btn-save-expense'), async () => {
      if (editId) await Storage.updateExpense(editId, expenseData);
      else await Storage.addExpense(expenseData);
      Utils.showToast(editId ? 'Gasto actualizado correctamente' : 'Gasto agregado correctamente', 'success');
      window.App.closeModal();
      window.App.refreshCurrentView();
    });
  }

  /**
   * Confirm and delete an expense
   */
  function confirmDelete(id) {
    const expense = Storage.getExpenseById(id);
    if (!expense) return;

    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = 'Eliminar Gasto';

    modalBody.innerHTML = `
      <div class="flex flex-col items-center text-center p-4">
        <div class="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-danger text-3xl">warning</span>
        </div>
        <p class="text-text-main mb-2">
          ¿Estás seguro de que querés eliminar <strong>"${Utils.escapeHTML(expense.description)}"</strong>
          por <strong class="font-mono text-lg">${Utils.formatCurrency(expense.amount)}</strong>?
        </p>
        <p class="text-text-muted text-sm">
          Esta acción no se puede deshacer.
        </p>
      </div>
    `;

    modalFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="btn-confirm-delete">Eliminar</button>
    `;

    document.getElementById('btn-confirm-delete').addEventListener('click', event => {
      Utils.runAction(event.currentTarget, async () => {
        await Storage.deleteExpense(id);
        Utils.showToast('Gasto eliminado', 'success');
        window.App.closeModal();
        window.App.refreshCurrentView();
      });
    });

    overlay.classList.add('show');
  }

  // Export
  window.Expenses = {
    render,
    openAddModal,
    openEditModal,
    confirmDelete
  };

})();
