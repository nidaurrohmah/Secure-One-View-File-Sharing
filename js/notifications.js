const Notifications = {
  getAll() {
    const shares = [...Share.receivedCache, ...Share.sentCache];
    return shares
      .slice()
      .sort((a, b) => new Date(b.viewedAt || b.createdAt) - new Date(a.viewedAt || a.createdAt))
      .map((share) => ({
        id: share.id,
        read: true,
        icon: share.status === "viewed" ? "👁️" : "📧",
        title: share.status === "pending" ? "File siap dibuka" : `Status ${share.status}`,
        message: `${share.fileName} • ${share.senderEmail || share.recipientEmail}`,
        createdAt: share.viewedAt || share.createdAt
      }));
  },

  getUnread() {
    return [];
  },

  updateBadge() {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    badge.textContent = "0";
    badge.classList.add("hidden");
  },

  renderPanel() {
    const list = document.getElementById("notif-list");
    if (!list) return;
    const notifs = this.getAll().slice(0, 20);
    if (!notifs.length) {
      list.innerHTML = `<div class="empty-state" style="padding:30px 20px"><div class="empty-icon">🔔</div><p>Belum ada notifikasi</p></div>`;
      return;
    }
    list.innerHTML = notifs.map((n) => `
      <div class="notif-item">
        <span class="notif-item-icon">${n.icon}</span>
        <div class="notif-item-body">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-msg">${n.message}</div>
          <div class="notif-item-time">${Utils.timeAgo(n.createdAt)}</div>
        </div>
      </div>`).join("");
  },

  markRead() {},
  markAllRead() {},
  addSystem() {},
  notifyFileReceived() {},
  notifyFileViewed() {},
  notifyFileExpired() {}
};

window.Notifications = Notifications;
