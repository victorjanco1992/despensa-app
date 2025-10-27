// frontend/src/services/api.js
import { offlineStorage } from './offlineStorage';

const API_URL = import.meta.env.VITE_API_URL;

// Wrapper para peticiones con caché automática
const fetchWithCache = async (url, options = {}, storeName = null) => {
  try {
    // Intentar petición normal
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si es GET y tenemos storeName, guardar en caché
    if ((!options.method || options.method === 'GET') && storeName) {
      await offlineStorage.save(storeName, data);
    }
    
    return { data, fromCache: false, error: null };
  } catch (error) {
    console.warn(`Error en petición a ${url}, buscando en caché...`, error);
    
    // Si falla, intentar obtener de caché
    if (storeName) {
      const cachedData = await offlineStorage.get(storeName);
      if (cachedData && cachedData.length > 0) {
        return { data: cachedData, fromCache: true, error: null };
      }
    }
    
    return { data: null, fromCache: false, error: error.message };
  }
};

// ==================== LOGIN ====================
export const login = async (password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.json();
};

// ==================== PRODUCTOS ====================
export const getProductos = async () => {
  const result = await fetchWithCache(`${API_URL}/productos`, {}, 'productos');
  return result.data || [];
};

export const createProducto = async (producto) => {
  const response = await fetch(`${API_URL}/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(producto),
  });
  return response.json();
};

export const updateProducto = async (id, producto) => {
  const response = await fetch(`${API_URL}/productos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(producto),
  });
  return response.json();
};

export const deleteProducto = async (id) => {
  const response = await fetch(`${API_URL}/productos/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

// ==================== CLIENTES ====================
export const getClientes = async () => {
  const result = await fetchWithCache(`${API_URL}/clientes`, {}, 'clientes');
  return result.data || [];
};

export const createCliente = async (cliente) => {
  const response = await fetch(`${API_URL}/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cliente),
  });
  return response.json();
};

export const updateCliente = async (id, cliente) => {
  const response = await fetch(`${API_URL}/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cliente),
  });
  return response.json();
};

export const deleteCliente = async (id) => {
  const response = await fetch(`${API_URL}/clientes/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

// ==================== CUENTAS CORRIENTES ====================
export const getCuentaCliente = async (clienteId) => {
  const result = await fetchWithCache(
    `${API_URL}/cuentas/${clienteId}`, 
    {}, 
    `cuenta_${clienteId}`
  );
  return result.data || [];
};

export const addProductoCuenta = async (data) => {
  const response = await fetch(`${API_URL}/cuentas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const actualizarPrecios = async (clienteId) => {
  const response = await fetch(`${API_URL}/cuentas/${clienteId}/actualizar-precios`, {
    method: 'PUT',
  });
  return response.json();
};

export const cancelarCuenta = async (clienteId) => {
  const response = await fetch(`${API_URL}/cuentas/${clienteId}/cancelar`, {
    method: 'DELETE',
  });
  return response.json();
};

export const deleteItemCuenta = async (itemId) => {
  const response = await fetch(`${API_URL}/cuentas/item/${itemId}`, {
    method: 'DELETE',
  });
  return response.json();
};

// ==================== TRANSFERENCIAS ====================
export const getTransferencias = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({ page, limit, search });
  const result = await fetchWithCache(
    `${API_URL}/transferencias?${params}`, 
    {}, 
    'transferencias'
  );
  return result.data || { transferencias: [], total: 0, page: 1, totalPages: 1 };
};

export const sincronizarMercadoPago = async () => {
  const response = await fetch(`${API_URL}/transferencias/sincronizar`);
  return response.json();
};

// ==================== LISTA DE COMPRAS ====================
export const getListaCompras = async () => {
  const result = await fetchWithCache(`${API_URL}/lista-compras`, {}, 'listaCompras');
  return result.data || [];
};

export const addItemListaCompras = async (data) => {
  const response = await fetch(`${API_URL}/lista-compras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const toggleCompradoItem = async (id) => {
  const response = await fetch(`${API_URL}/lista-compras/${id}/toggle`, {
    method: 'PUT',
  });
  return response.json();
};

export const updateItemListaCompras = async (id, data) => {
  const response = await fetch(`${API_URL}/lista-compras/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteItemListaCompras = async (id) => {
  const response = await fetch(`${API_URL}/lista-compras/${id}`, {
    method: 'DELETE',
  });
  return response.json();
};

export const limpiarListaComprada = async () => {
  const response = await fetch(`${API_URL}/lista-compras/comprados/limpiar`, {
    method: 'DELETE',
  });
  return response.json();
};

export const marcarTodoComprado = async () => {
  const response = await fetch(`${API_URL}/lista-compras/marcar-todo-comprado`, {
    method: 'PUT',
  });
  return response.json();
};

export const verificarConfigMP = async () => {
  const response = await fetch(`${API_URL}/transferencias/verificar-config`);
  return response.json();
};

// Función auxiliar para verificar estado de conexión
export const checkConnectionStatus = () => {
  return offlineStorage.isOnline();
};
