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
          <button class="btn-secondary w-full flex items-center justify-center" id="btn-load-demo" onclick="ExportImport.loadSampleData()">
            <span class="material-symbols-outlined mr-2 text-[20px]">auto_awesome</span> Cargar Demo
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Export expenses as CSV
   */
  function csvCell(value) {
    const text = String(value ?? '');
    // Evita que una descripción se interprete como fórmula al abrirla en Excel.
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    const expenses = Storage.getAllExpenses();
    if (!expenses.length) return Utils.showToast('No hay gastos para exportar', 'warning');
    const rows = [['Fecha', 'Descripción', 'Monto', 'Categoría', 'Medio de Pago', 'Notas'],
      ...expenses.map(exp => [exp.date, exp.description, exp.amount,
        Utils.CATEGORIES[exp.category]?.name || exp.category,
        Utils.PAYMENT_METHODS[exp.paymentMethod]?.name || exp.paymentMethod, exp.notes || ''])];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadFile('\uFEFF' + csv, `misgastos_${formatFileDate()}.csv`, 'text/csv;charset=utf-8');
    Utils.showToast('CSV exportado correctamente', 'success');
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false, closedQuote = false;
    text = text.replace(/^\uFEFF/, '');
    function finishField() { row.push(field); field = ''; closedQuote = false; }
    function finishRow() {
      finishField();
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    }
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (char === '"') { quoted = false; closedQuote = true; }
        else field += char;
      } else if (char === ',') finishField();
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        finishRow();
      } else if (closedQuote) {
        throw new Error('El CSV contiene caracteres después del cierre de comillas.');
      } else if (char === '"') {
        if (field) throw new Error('El CSV contiene comillas sin escapar.');
        quoted = true;
      } else field += char;
    }
    if (quoted) throw new Error('El CSV tiene comillas sin cerrar.');
    if (field || row.length || closedQuote) finishRow();
    return rows;
  }

  async function importCSV(input) {
    const file = input.files[0];
    if (!file) return;
    await Utils.runAction(input, async () => {
      if (file.size > 2 * 1024 * 1024) throw new Error('El archivo no puede superar 2 MB.');
      const rows = parseCSV(await file.text());
      if (rows.length < 2) throw new Error('El archivo CSV está vacío.');
      const normalize = value => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const categoryMap = Object.fromEntries(Object.entries(Utils.CATEGORIES).flatMap(([key, cat]) =>
        [[normalize(cat.name), key], [key, key]]));
      const paymentMap = Object.fromEntries(Object.entries(Utils.PAYMENT_METHODS).flatMap(([key, method]) =>
        [[normalize(method.name), key], [key, key]]));
      const headers = rows[0].map(normalize);
      if (headers[0] !== 'fecha' || headers[1] !== 'descripcion' || headers[2] !== 'monto') {
        throw new Error('El CSV debe comenzar con Fecha, Descripción y Monto.');
      }
      const expenses = rows.slice(1).map((row, index) => {
        if (row.length < 4 || row.length > 6) throw new Error(`Fila ${index + 2}: columnas inválidas.`);
        const category = categoryMap[normalize(row[3])];
        const paymentMethod = paymentMap[normalize(row[4] || 'efectivo')];
        if (!category || !paymentMethod) throw new Error(`Fila ${index + 2}: categoría o medio de pago desconocido.`);
        return { id: Utils.generateId(), date: row[0].trim(), description: row[1].trim(),
          amount: row[2].trim(), category, paymentMethod, notes: row[5] || '' };
      });
      await Storage.importAllData({ expenses }, 'merge');
      Utils.showToast(`Se importaron ${expenses.length} gastos correctamente`, 'success');
      window.App.refreshCurrentView();
      render();
    });
    input.value = '';
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
  async function importJSON(input) {
    const file = input.files[0];
    if (!file) return;
    if (!window.confirm('¿Reemplazar todos tus datos con este backup? Exportá una copia antes de continuar.')) {
      input.value = '';
      return;
    }
    await Utils.runAction(input, async () => {
      if (file.size > 2 * 1024 * 1024) throw new Error('El archivo no puede superar 2 MB.');
      let data;
      try { data = JSON.parse(await file.text()); }
      catch { throw new Error('El archivo no contiene un JSON válido.'); }
      await Storage.importAllData(data);
      Utils.showToast(`Backup restaurado: ${data.expenses.length} gastos cargados`, 'success');
      window.App.refreshCurrentView();
      render();
    });
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

    document.getElementById('btn-confirm-clear').addEventListener('click', event => {
      Utils.runAction(event.currentTarget, async () => {
        await Storage.clearAllData();
        Utils.showToast('Todos los datos fueron eliminados', 'success');
        window.App.closeModal();
        window.App.refreshCurrentView();
        render();
      });
    });

    overlay.classList.add('show');
  }

  /**
   * Load sample data
   */
  async function loadSampleData() {
    if (!window.confirm('Los datos de ejemplo reemplazarán tus gastos actuales. ¿Continuar?')) return;
    await Utils.runAction(document.getElementById('btn-load-demo'), async () => {
      await Storage.initSampleData();
      Utils.showToast('Datos de ejemplo cargados', 'success');
      window.App.refreshCurrentView();
      render();
    });
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
    parseCSV,
    exportCSV,
    importCSV,
    exportJSON,
    importJSON,
    confirmClearAll,
    loadSampleData
  };

})();
