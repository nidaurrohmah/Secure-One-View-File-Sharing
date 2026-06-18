// =============================================
// UTILS.JS — Shared utility functions
// Shared UI helpers
// =============================================

const Utils = {
  // Generate UUID v4
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // Generate secure share token
  generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  // Format file size
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // Format date
  formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    if (hrs < 24) return `${hrs} jam lalu`;
    return `${days} hari lalu`;
  },

  // File type icon
  fileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
      mp4: '🎬', avi: '🎬', mov: '🎬', mkv: '🎬',
      mp3: '🎵', wav: '🎵', ogg: '🎵',
      zip: '📦', rar: '📦', '7z': '📦',
      xls: '📊', xlsx: '📊', csv: '📊',
      ppt: '📋', pptx: '📋',
      js: '💻', html: '💻', css: '💻', json: '💻', py: '💻',
    };
    return icons[ext] || '📎';
  },

  // Get initials from name
  initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  // Truncate string
  truncate(str, n = 30) {
    return str && str.length > n ? str.slice(0, n) + '…' : str;
  },

  // Show toast notification
  toast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

    const icons = { success: '✅', warning: '⚠️', danger: '❌', info: 'ℹ️', sns: '📧' };
    const titles = { success: 'Berhasil', warning: 'Peringatan', danger: 'Error', info: 'Info', sns: 'SNS Notification' };

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title || titles[type] || 'Info'}</div>
        <div class="toast-msg">${message}</div>
      </div>`;
    container.appendChild(t);
    setTimeout(() => {
      t.classList.add('removing');
      setTimeout(() => t.remove(), 350);
    }, 4000);
  },

  // Redirect
  redirect(path) { window.location.href = path; },

  // Get query param
  param(key) {
    return new URLSearchParams(window.location.search).get(key);
  },

  // Confirm dialog (simple)
  async confirm(message) {
    return window.confirm(message);
  }
};

window.Utils = Utils;
