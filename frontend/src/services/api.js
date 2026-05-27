// Detecta automaticamente se está na nuvem (Vite ou CRA) ou usa o localhost como plano B
const API_URL =
  import.meta.env?.VITE_API_URL ||
  process.env?.REACT_APP_API_URL ||
  'https://sistema-de-pedidos-9hgz.onrender.com'; // Seu link do Render como padrão universal

export const api = {
  get: async (endpoint, token = null) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  patch: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (endpoint, token = null) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};