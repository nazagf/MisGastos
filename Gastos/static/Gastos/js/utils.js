/* ============================================
   MisGastos — Utility Functions
   ============================================ */

(function() {
  'use strict';

  // Category definitions
  // Cohesive warm palette tuned to the "estado de cuenta" theme
  const CATEGORIES = {
    tarjetas: { name: 'Tarjetas', icon: '💳', color: '#a9781f' },
    servicios: { name: 'Servicios', icon: '🏠', color: '#4a6fa0' },
    alimentos: { name: 'Alimentos', icon: '🛒', color: '#5a8a5b' },
    productos: { name: 'Productos', icon: '📦', color: '#c77d3a' },
    transporte: { name: 'Transporte', icon: '🚗', color: '#a64b3a' },
    salud: { name: 'Salud', icon: '🏥', color: '#a6547e' },
    educacion: { name: 'Educación', icon: '🎓', color: '#3e8a8a' },
    entretenimiento: { name: 'Entretenimiento', icon: '🎮', color: '#c25b4e' },
    otros: { name: 'Otros', icon: '📋', color: '#8a8175' }
  };

  // Payment methods
  const PAYMENT_METHODS = {
    efectivo: { name: 'Efectivo', icon: '💵' },
    debito: { name: 'Débito', icon: '💳' },
    credito: { name: 'Crédito', icon: '💳' },
    transferencia: { name: 'Transferencia', icon: '🏦' }
  };

  // Month names in Spanish
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const SHORT_MONTH_NAMES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  /**
   * Format a number as Argentine Peso currency
   */
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format a date string to a human-readable Spanish format
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month}, ${year}`;
  }

  /**
   * Format date in short format: "3 Jul"
   */
  function formatDateShort(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]}`;
  }

  /**
   * Get month name from index (0-based)
   */
  function getMonthName(monthIndex) {
    return MONTH_NAMES[monthIndex];
  }

  /**
   * Get short month name
   */
  function getShortMonthName(monthIndex) {
    return SHORT_MONTH_NAMES[monthIndex];
  }

  /**
   * Get current month and year
   */
  function getCurrentMonthYear() {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  }

  /**
   * Generate a unique ID
   */
  function generateId() {
    return crypto.randomUUID();
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  async function runAction(button, action) {
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try {
      await action();
    } catch (error) {
      showToast(error.message || 'No se pudo completar la operación.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  /**
   * Get the number of days in a month
   */
  function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Format month/year label
   */
  function formatMonthYear(month, year) {
    return `${MONTH_NAMES[month]} ${year}`;
  }

  /**
   * Show a toast notification
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = document.createElement('span');
    icon.textContent = icons[type] || icons.info;
    const text = document.createElement('span');
    text.textContent = message;
    toast.append(icon, text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Animate a number counting up
   */
  function animateValue(element, start, end, duration = 800) {
    const startTime = performance.now();
    const isNegative = end < 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      element.textContent = formatCurrency(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Export to global scope
  window.Utils = {
    escapeHTML,
    runAction,
    CATEGORIES,
    PAYMENT_METHODS,
    MONTH_NAMES,
    SHORT_MONTH_NAMES,
    formatCurrency,
    formatDate,
    formatDateShort,
    getMonthName,
    getShortMonthName,
    getCurrentMonthYear,
    generateId,
    getDaysInMonth,
    formatMonthYear,
    showToast,
    animateValue
  };

})();
