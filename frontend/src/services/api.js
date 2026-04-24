const API_BASE = 'http://localhost:4000/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: getHeaders()
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Generic CRUD
  getAll: (resource) => request(`/${resource}`),
  getOne: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, data) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),

  // AI endpoints
  aiVehicleRecommend: (data) => request('/vehicles/ai-recommend', { method: 'POST', body: JSON.stringify(data) }),
  aiRouteOptimize: (data) => request('/routes/ai-optimize', { method: 'POST', body: JSON.stringify(data) }),
  aiChargingRecommend: (data) => request('/charging-stations/ai-recommend', { method: 'POST', body: JSON.stringify(data) }),
  aiCostAnalyze: (data) => request('/cost-analysis/ai-analyze', { method: 'POST', body: JSON.stringify(data) }),
  aiBatteryPredict: (data) => request('/battery-health/ai-predict', { method: 'POST', body: JSON.stringify(data) }),
  aiEnergyForecast: (data) => request('/energy-forecast/ai-forecast', { method: 'POST', body: JSON.stringify(data) }),
  aiTransitionPlan: (data) => request('/transition-plans/ai-plan', { method: 'POST', body: JSON.stringify(data) }),
  aiCarbonCalculate: (data) => request('/carbon-footprint/ai-calculate', { method: 'POST', body: JSON.stringify(data) }),
  aiMaintenancePredict: (data) => request('/maintenance/ai-predict', { method: 'POST', body: JSON.stringify(data) }),
  aiDriverOptimize: (data) => request('/driver-assignment/ai-optimize', { method: 'POST', body: JSON.stringify(data) }),
  aiBudgetOptimize: (data) => request('/budget/ai-optimize', { method: 'POST', body: JSON.stringify(data) }),
  aiComplianceCheck: (data) => request('/compliance/ai-check', { method: 'POST', body: JSON.stringify(data) }),
  aiTripPlan: (data) => request('/trip-planner/ai-plan', { method: 'POST', body: JSON.stringify(data) }),
  aiInsights: (data) => request('/analytics/ai-insights', { method: 'POST', body: JSON.stringify(data) }),

  // AI Center
  getAIFeatures: () => request('/ai/features'),
  aiChat: (data) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAnalytics: () => request('/analytics'),
};

export default api;
