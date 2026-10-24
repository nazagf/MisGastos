/* ============================================
   MisGastos — Main App (Router & Init)
   ============================================ */

(function() {
  'use strict';

  let currentView = 'dashboard';
  let currentMonth;
  let currentYear;

  /**
   * Initialize the app
   */
  async function init() {
    // Set current month/year
    const { month, year } = Utils.getCurrentMonthYear();
    currentMonth = month;
    currentYear = year;

    // Load data from PostgreSQL server first
    try {
      await Storage.loadDataFromServer();
    } catch (error) {
      document.getElementById('load-message').textContent = error.message;
      document.getElementById('retry-load').hidden = false;
      return;
    }
    document.getElementById('load-status').hidden = true;
    document.querySelector('main').hidden = false;

    // Setup navigation
    setupNavigation();

    // Setup month selector
    updateMonthLabel();

    // Setup mobile menu
    setupMobileMenu();

    // Setup modal close
    setupModal();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Render initial view
    navigateTo('dashboard');
  }

  /**
   * Setup sidebar navigation
   */
  function setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        navigateTo(view);

        // Close mobile menu
        document.querySelector('.sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay').classList.remove('show');
      });
    });

    // Month navigation buttons
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      updateMonthLabel();
      refreshCurrentView();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      updateMonthLabel();
      refreshCurrentView();
    });

    // Add expense FAB
    const fab = document.getElementById('fab-add');
    if (fab) {
      fab.addEventListener('click', () => {
        Expenses.openAddModal();
      });
    }
  }

  /**
   * Navigate to a view
   */
  function navigateTo(view) {
    currentView = view;

    // Update nav active state
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Show/hide sections
    document.querySelectorAll('.page-section').forEach(section => {
      section.classList.toggle('active', section.id === `section-${view}`);
    });

    // Render the view
    renderView(view);
  }

  /**
   * Render a specific view
   */
  function renderView(view) {
    switch (view) {
      case 'dashboard':
        Dashboard.render(currentMonth, currentYear);
        break;
      case 'expenses':
        Expenses.render(currentMonth, currentYear);
        break;
      case 'budgets':
        Budgets.render(currentMonth, currentYear);
        break;
      case 'export':
        ExportImport.render();
        break;
    }
  }

  /**
   * Refresh the current view
   */
  function refreshCurrentView() {
    renderView(currentView);
  }

  /**
   * Update the month label in sidebar
   */
  function updateMonthLabel() {
    const label = document.getElementById('month-label');
    if (label) {
      label.textContent = Utils.formatMonthYear(currentMonth, currentYear);
    }
  }

  /**
   * Get current period
   */
  function getCurrentPeriod() {
    return { month: currentMonth, year: currentYear };
  }

  /**
   * Setup mobile menu
   */
  function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  }

  /**
   * Setup modal close behavior
   */
  function setupModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }
  }

  /**
   * Close the modal
   */
  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape to close modal
      if (e.key === 'Escape') {
        closeModal();
      }

      // Ctrl/Cmd + N to add expense
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        Expenses.openAddModal();
      }
    });
  }

  // Export
  window.App = {
    init,
    navigateTo,
    refreshCurrentView,
    getCurrentPeriod,
    closeModal
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pageshow', event => {
    if (event.persisted) window.location.reload();
  });

})();
