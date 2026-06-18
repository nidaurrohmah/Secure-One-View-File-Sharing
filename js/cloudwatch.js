const CloudWatch = {
  monitoringCache: null,

  async refresh() {
    this.monitoringCache = await Api.get("/monitoring");
    return this.monitoringCache;
  },

  log(service, action, message, metadata = {}, level = "INFO") {
    console.log(`[${level}] ${service}:${action}`, message, metadata);
  },

  getLogs(limit = 100) {
    const recent = this.monitoringCache?.recent || [];
    return recent.slice(0, limit).map((item, index) => ({
      id: `${index}-${item.timestamp}`,
      timestamp: item.timestamp || new Date().toISOString(),
      level: "INFO",
      service: item.service || "AWS",
      action: item.action || "EVENT",
      message: item.message || "-"
    }));
  },

  getStats() {
    const services = this.monitoringCache?.services || {};
    const byService = {};
    Object.entries(services).forEach(([key, value]) => {
      byService[key] = Number(value.count) || 1;
    });
    return { total: Object.values(byService).reduce((a, b) => a + b, 0), byService, byLevel: { INFO: 0, WARNING: 0, ERROR: 0 } };
  }
};

window.CloudWatch = CloudWatch;
