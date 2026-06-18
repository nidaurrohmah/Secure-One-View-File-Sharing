const Auth = {
  usersCache: [],

  init() {},

  normalizeUser(user) {
    const name = user.name || user.email || "User";
    return {
      userId: user.userId || user.id,
      id: user.userId || user.id,
      email: user.email,
      name,
      role: user.role || "user",
      avatar: user.avatar || Utils.initials(name)
    };
  },

  async register(name, email, password) {
    try {
      const result = await Api.post("/auth/register", { name, email, password });
      const user = this.normalizeUser(result.user);
      Api.setSession(result.token, user);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  async login(email, password) {
    try {
      const result = await Api.post("/auth/login", { email, password });
      const user = this.normalizeUser(result.user);
      Api.setSession(result.token, user);
      return { ok: true, session: this.getSession() };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  },

  logout() {
    Api.clearSession();
  },

  getSession() {
    const user = Api.getUser();
    const token = Api.getToken();
    if (!user || !token) return null;
    return {
      userId: user.userId || user.id,
      id: user.userId || user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      avatar: user.avatar || Utils.initials(user.name),
      token
    };
  },

  requireAuth() {
    const session = this.getSession();
    if (!session) {
      Utils.redirect(location.pathname.includes("/pages/") ? "login.html" : "pages/login.html");
      return null;
    }
    return session;
  },

  async loadUsers() {
    const result = await Api.get("/users");
    this.usersCache = (result.users || []).map((user) => this.normalizeUser(user));
    return this.usersCache;
  },

  getUsers() {
    return this.usersCache;
  },

  getOtherUsers(currentUserId) {
    return this.usersCache.filter((u) => u.id !== currentUserId && u.userId !== currentUserId);
  },

  getUserById(id) {
    return this.usersCache.find((u) => u.id === id || u.userId === id) || null;
  },

  getUserByEmail(email) {
    return this.usersCache.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }
};

window.Auth = Auth;
