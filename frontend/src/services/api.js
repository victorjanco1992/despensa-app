// frontend/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL;

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
  const response = await fetch(`${API_URL}/productos`);
  return response.json();
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
  const response = await fetch(`${API_URL}/clientes`);
  return response.json();
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
  const response = await fetch(`${API_URL}/cuentas/${clienteId}`);
  return response.json();
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

// ==================== TRANSFERENCIAS (SOLO LECTURA) ====================
export const getTransferencias = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({ page, limit, search });
  const response = await fetch(`${API_URL}/transferencias?${params}`);
  return response.json();
};

export const sincronizarMercadoPago = async () => {
  const response = await fetch(`${API_URL}/transferencias/sincronizar`);
  return response.json();
};

// ==================== LISTA DE COMPRAS ====================

export const getListaCompras = async () => {
  const response = await fetch(`${API_URL}/lista-compras`);
  return response.json();
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
