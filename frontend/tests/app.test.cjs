const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');

const month = 6, year = 2026;
const attack = '<img src=x onerror="window.compromised=true">';
const baseExpense = { id: 'g1', description: 'Café', amount: 10.25, category: 'alimentos',
  paymentMethod: 'efectivo', date: '2026-07-18', notes: '' };

function setup(t, expenses = [baseExpense]) {
  const dom = new JSDOM(`<!doctype html><meta name="csrf-token" content="csrf-test">
    <div id="toast-container"></div><div id="expenses-filters"></div>
    <div id="expenses-table-container"></div><div id="recent-transactions"></div>
    <div id="budget-overview"></div><div id="budget-form-container"></div>
    <div id="export-content"></div><div id="modal-overlay"><h2 id="modal-title"></h2>
    <div id="modal-body"></div><div id="modal-footer"></div></div>`,
    { url: 'https://gastos.example.test', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const window = dom.window;
  window.structuredClone = structuredClone;
  window.AbortController = AbortController;
  window.crypto.randomUUID = randomUUID;
  window.confirm = () => true;
  window.App = { getCurrentPeriod: () => ({ month, year }), refreshCurrentView() {},
    closeModal() { window.document.getElementById('modal-overlay').classList.remove('show'); } };
  const requests = [];
  let responder = () => ({ status: 200, data: { version: 1, expenses: structuredClone(expenses), budgets: {}, settings: {} } });
  window.fetch = async (url, options) => {
    requests.push({ url, options });
    const { status, data } = await responder(url, options);
    return { status, ok: status >= 200 && status < 300, json: async () => data };
  };
  for (const script of ['utils', 'storage', 'expenses', 'budgets', 'dashboard', 'export']) {
    window.eval(readFileSync(`Gastos/static/Gastos/js/${script}.js`, 'utf8'));
  }
  return { window, requests, respond(fn) { responder = fn; },
    ready: () => window.Storage.loadDataFromServer() };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('HTTP rejection leaves the confirmed cache unchanged', async t => {
  const app = setup(t);
  await app.ready();
  app.respond(() => ({ status: 400, data: { error: 'Monto inválido' } }));
  await assert.rejects(app.window.Storage.addExpense({ ...baseExpense, id: 'bad' }), /Monto inválido/);
  await assert.rejects(app.window.Storage.updateExpense('g1', { ...baseExpense, amount: -1 }), /Monto inválido/);
  await assert.rejects(app.window.Storage.deleteExpense('g1'), /Monto inválido/);
  await assert.rejects(app.window.Storage.clearAllData(), /Monto inválido/);
  assert.equal(app.window.Storage.getAllExpenses().length, 1);
  assert.equal(app.window.Storage.getExpenseById('g1').amount, 10.25);
});

test('network failures do not become successful local writes', async t => {
  const app = setup(t);
  await app.ready();
  app.respond(() => { throw new TypeError('Offline'); });
  await assert.rejects(app.window.Storage.addExpense({ ...baseExpense, id: 'offline' }));
  assert.equal(app.window.Storage.getAllExpenses().length, 1);
  assert.equal(app.window.localStorage.length, 0);
});

test('successful writes use canonical server values and include CSRF', async t => {
  const app = setup(t);
  await app.ready();
  const saved = { ...baseExpense, id: 'new', amount: 12.5, description: 'Normalizada' };
  app.respond(() => ({ status: 201, data: saved }));
  await app.window.Storage.addExpense({ ...saved, amount: '12.50' });
  assert.equal(app.window.Storage.getExpenseById('new').description, 'Normalizada');
  const request = app.requests.at(-1);
  assert.equal(request.options.headers['X-CSRFToken'], 'csrf-test');
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(app.window.localStorage.length, 0);
});

test('mutations cannot start before initial server loading succeeds', async t => {
  const app = setup(t);
  await assert.rejects(app.window.Storage.clearAllData(), /carguen/);
  assert.equal(app.requests.length, 0);
});

test('restores only replace the local snapshot after server confirmation', async t => {
  const app = setup(t);
  await app.ready();
  app.respond(() => ({ status: 400, data: { error: 'Backup inválido' } }));
  await assert.rejects(app.window.Storage.importAllData({ expenses: [] }), /Backup inválido/);
  assert.equal(app.window.Storage.getAllExpenses().length, 1);
});

test('table, dashboard, edit and delete dialogs render hostile fields as text', async t => {
  const item = { ...baseExpense, description: attack, notes: '</textarea>' + attack,
    id: "legacy'\" onclick='alert(1)" };
  const app = setup(t, [item]);
  await app.ready();
  const { window } = app;
  window.Expenses.render(month, year);
  window.Dashboard.render(month, year);
  assert.equal(window.document.querySelectorAll('img').length, 0);
  assert.ok(window.document.getElementById('expenses-table-container').textContent.includes(attack));
  window.Expenses.openEditModal(item.id);
  assert.equal(window.document.getElementById('exp-description').value, attack);
  assert.equal(window.document.getElementById('exp-notes').value, item.notes);
  assert.equal(window.document.querySelectorAll('img').length, 0);
  window.Expenses.confirmDelete(item.id);
  assert.equal(window.document.querySelectorAll('img').length, 0);
  assert.ok(window.document.getElementById('modal-body').textContent.includes(attack));
});

test('toasts never interpret error text as HTML', t => {
  const { window } = setup(t);
  window.Utils.showToast(attack, 'error');
  assert.equal(window.document.querySelectorAll('#toast-container img').length, 0);
  assert.ok(window.document.getElementById('toast-container').textContent.includes(attack));
});

test('expense form keeps its draft and reports failure instead of success', async t => {
  const app = setup(t);
  await app.ready();
  app.respond(() => ({ status: 500, data: { error: 'No se pudo guardar' } }));
  app.window.Expenses.openAddModal();
  const document = app.window.document;
  for (const [id, value] of Object.entries({ 'exp-description': 'Mi gasto', 'exp-amount': '25.50',
    'exp-date': '2026-07-18', 'exp-category': 'alimentos', 'exp-payment': 'efectivo' })) {
    document.getElementById(id).value = value;
  }
  document.getElementById('btn-save-expense').click();
  await settle();
  assert.equal(document.querySelectorAll('.toast.success').length, 0);
  assert.ok(document.getElementById('toast-container').textContent.includes('No se pudo guardar'));
  assert.equal(document.getElementById('exp-description').value, 'Mi gasto');
  assert.ok(document.getElementById('modal-overlay').classList.contains('show'));
  assert.equal(document.getElementById('btn-save-expense').disabled, false);
});

test('CSV parsing preserves quoted commas, multiline notes and escaped quotes', t => {
  const { window } = setup(t);
  const rows = window.ExportImport.parseCSV('\uFEFFFecha,Descripción,Monto\r\n2026-07-18,"Café, pan",10.25,"Línea 1\nLínea ""2"""\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1][1], 'Café, pan');
  assert.equal(rows[1][3], 'Línea 1\nLínea "2"');
  assert.throws(() => window.ExportImport.parseCSV('a,"unterminated'), /comillas/);
});

test('failed budget save leaves the previous budget intact', async t => {
  const app = setup(t);
  await app.ready();
  app.respond(() => ({ status: 400, data: { error: 'Monto inválido' } }));
  app.window.Budgets.render(month, year);
  app.window.document.getElementById('budget-total').value = '-10';
  app.window.document.getElementById('btn-save-budgets').click();
  await settle();
  assert.equal(app.window.Storage.getBudgets(month, year).total, 0);
  assert.equal(app.window.document.querySelectorAll('.toast.success').length, 0);
  assert.equal(app.window.document.getElementById('budget-total').value, '-10');
});
