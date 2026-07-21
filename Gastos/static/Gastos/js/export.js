/* ============================================
   MisGastos — Export/Import Module
   ============================================ */

(function() {
  'use strict';

  /**
   * Render the export/import section
   */
  function render() {
    const container = document.getElementById('export-content');
    if (!container) return;

    const allExpenses = Storage.getAllExpenses();

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Export CSV -->
        <div class="p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-accent mr-3">description</span>
            <h3 class="text-lg font-semibold text-text-main">Exportar CSV</h3>
          </div>
          <p class="text-sm text-text-muted mb-6 flex-1">
            Descargá todos tus gastos en formato CSV compatible con Excel y Google Sheets.
          </p>
          <button class="btn-primary w-full flex items-center justify-center" onclick="ExportImport.exportCSV()" ${allExpenses.length === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined mr-2 text-[20px]">download</span> Descargar CSV
          </button>
          <div class="mt-3 text-xs text-center text-text-muted">
            ${allExpenses.length} gastos para exportar
          </div>
        </div>

        <!-- Import CSV -->
        <div class="p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-accent mr-3">upload_file</span>
            <h3 class="text-lg font-semibold text-text-main">Importar CSV</h3>
          </div>
          <p class="text-sm text-text-muted mb-6 flex-1">
            Cargá gastos desde un archivo CSV. Debe tener columnas: fecha, descripción, monto, categoría, medio_pago.
          </p>
          <div class="relative w-full">
            <button class="btn-secondary w-full flex items-center justify-center relative z-10 pointer-events-none">
              <span class="material-symbols-outlined mr-2 text-[20px]">upload</span> Seleccionar CSV
            </button>
            <input type="file" accept=".csv" onchange="ExportImport.importCSV(this)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
          </div>
        </div>

        <!-- Export JSON (Backup) -->
        <div class="p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-accent mr-3">save</span>
            <h3 class="text-lg font-semibold text-text-main">Backup (JSON)</h3>
          </div>
          <p class="text-sm text-text-muted mb-6 flex-1">
            Exportá todos tus datos (gastos, presupuestos y configuración) como un archivo de backup JSON.
          </p>
          <button class="btn-primary w-full flex items-center justify-center" onclick="ExportImport.exportJSON()" ${allExpenses.length === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined mr-2 text-[20px]">download</span> Descargar Backup
          </button>
        </div>

        <!-- Import JSON (Restore) -->
        <div class="p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-accent mr-3">settings_backup_restore</span>
            <h3 class="text-lg font-semibold text-text-main">Restaurar Backup</h3>
          </div>
          <p class="text-sm text-text-muted mb-6 flex-1">
            Restaurá tus datos desde un archivo JSON. <strong class="text-warning">⚠️ Reemplazará tus datos actuales.</strong>
          </p>
          <div class="relative w-full">
            <button class="btn-secondary w-full flex items-center justify-center relative z-10 pointer-events-none !text-warning !border-warning/30 hover:!bg-warning/5">
              <span class="material-symbols-outlined mr-2 text-[20px]">upload</span> Seleccionar JSON
            </button>
            <input type="file" accept=".json" onchange="ExportImport.importJSON(this)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
          </div>
        </div>

        <!-- Clear All Data -->
        <div class="p-6 bg-danger/5 border border-danger/20 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-danger mr-3">delete_forever</span>
            <h3 class="text-lg font-semibold text-danger">Borrar Todo</h3>
          </div>
          <p class="text-sm text-text-main mb-6 flex-1">
            Eliminá todos los gastos y presupuestos.
            <strong class="text-danger block mt-1">Esta acción es irreversible.</strong>
          </p>
          <button class="btn-danger w-full flex items-center justify-center mt-auto" onclick="ExportImport.confirmClearAll()">
            <span class="material-symbols-outlined mr-2 text-[20px]">delete</span> Borrar Todo
          </button>
        </div>

        <!-- Load Sample Data -->
        <div class="p-6 bg-surface-alt/50 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div class="flex items-center mb-4">
            <span class="material-symbols-outlined text-3xl text-text-muted mr-3">science</span>
            <h3 class="text-lg font-semibold text-text-main">Datos de Ejemplo</h3>
          </div>
          <p class="text-sm text-text-muted mb-6 flex-1">
            Cargá datos de ejemplo para probar la aplicación.
          </p>
          <button class="btn-secondary w-full flex items-center justify-center" onclick="ExportImport.loadSampleData()">
            <span class="material-symbols-outlined mr-2 text-[20px]">auto_awesome</span> Cargar Demo
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Export expenses as CSV
   */
  function exportCSV() {
    const expenses = Storage.getAllExpenses();
    if (expenses.length === 0) {
      Utils.showToast('No hay gastos para exportar', 'warning');
      return;
    }

    const headers = ['Fecha', 'Descripción', 'Monto', 'Categoría', 'Medio de Pago', 'Notas'];
    const rows = expenses.map(exp => [
      exp.date,
      `"${exp.description.replace(/"/g, '""')}"`,
      exp.amount,
      Utils.CATEGORIES[exp.category]?.name || exp.category,
      Utils.PAYMENT_METHODS[exp.paymentMethod]?.name || exp.paymentMethod,
      `"${(exp.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `misgastos_${formatFileDate()}.csv`, 'text/csv');
    Utils.showToast('CSV exportado correctamente', 'success');
  }

  /**
   * Import expenses from CSV
   */
  function importCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());

        if (lines.length < 2) {
          Utils.showToast('El archivo CSV está vacío', 'error');
          return;
        }

        // Skip header
        let imported = 0;
        const categoryMap = {};
        Object.entries(Utils.CATEGORIES).forEach(([key, cat]) => {
          categoryMap[cat.name.toLowerCase()] = key;
        });

        const paymentMap = {};
        Object.entries(Utils.PAYMENT_METHODS).forEach(([key, pm]) => {
          paymentMap[pm.name.toLowerCase()] = key;
        });

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 4) continue;

          const date = cols[0]?.trim();
          const description = cols[1]?.trim();
          const amount = parseFloat(cols[2]);
          const categoryName = cols[3]?.trim().toLowerCase();
          const paymentName = cols[4]?.trim().toLowerCase() || 'efectivo';
          const notes = cols[5]?.trim() || '';

          if (!date || !description || isNaN(amount)) continue;

          const category = categoryMap[categoryName] || 'otros';
          const paymentMethod = paymentMap[paymentName] || 'efectivo';

          Storage.addExpense({ date, description, amount, category, paymentMethod, notes });
          imported++;
        }

        Utils.showToast(`Se importaron ${imported} gastos correctamente`, 'success');
        window.App.refreshCurrentView();
        render();
      } catch (err) {
        Utils.showToast('Error al leer el archivo CSV', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Export all data as JSON backup
   */
  function exportJSON() {
    const data = Storage.exportAllData();
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `misgastos_backup_${formatFileDate()}.json`, 'application/json');
    Utils.showToast('Backup exportado correctamente', 'success');
  }

  /**
   * Import data from JSON backup
   */
  function importJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        Storage.importAllData(data);
        Utils.showToast(`Backup restaurado: ${data.expenses.length} gastos cargados`, 'success');
        window.App.refreshCurrentView();
        render();
      } catch (err) {
        Utils.showToast('Error al importar el backup: formato inválido', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  /**
   * Confirm and clear all data
   */
  function confirmClearAll() {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = 'Borrar Todos los Datos';
    modalBody.innerHTML = `
      <div class="flex flex-col items-center text-center p-4">
        <div class="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-danger text-3xl">delete_forever</span>
        </div>
        <p class="text-text-main mb-4">
          ¿Estás seguro de que querés <strong class="text-danger">borrar todos los datos</strong>?
        </p>
        <p class="text-sm text-text-muted mb-2">
          Se eliminarán todos los gastos, presupuestos y configuraciones.
        </p>
        <p class="text-sm font-semibold text-danger">
          Esta acción no se puede deshacer.
        </p>
      </div>
    `;
    modalFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="btn-confirm-clear">Sí, Borrar Todo</button>
    `;

    document.getElementById('btn-confirm-clear').addEventListener('click', () => {
      Storage.clearAllData();
      Utils.showToast('Todos los datos fueron eliminados', 'success');
      window.App.closeModal();
      window.App.refreshCurrentView();
      render();
    });

    overlay.classList.add('show');
  }

  /**
   * Load sample data
   */
  function loadSampleData() {
    Storage.clearAllData();
    Storage.initSampleData();
    Utils.showToast('Datos de ejemplo cargados', 'success');
    window.App.refreshCurrentView();
    render();
  }

  /**
   * Download a file
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Format date for file naming
   */
  function formatFileDate() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  // Export
  window.ExportImport = {
    render,
    exportCSV,
    importCSV,
    exportJSON,
    importJSON,
    confirmClearAll,
    loadSampleData
  };

})();
