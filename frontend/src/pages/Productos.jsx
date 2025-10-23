// frontend/src/pages/Productos.jsx
import { useState, useEffect } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function Productos() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [productos, setProductos] = useState([]);
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const itemsPerPage = 9;

  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    unidad: 'unidad'
  });

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    const filtered = productos.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProductos(filtered);
    setCurrentPage(0);
  }, [searchTerm, productos]);

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
    setFilteredProductos(data);
  };

  const handleActualizar = async () => {
    setActualizando(true);
    
    try {
      await cargarProductos();
      
      // Mostrar mensaje de éxito
      const mensaje = document.createElement('div');
      mensaje.className = 'fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
      mensaje.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-2xl">✅</span>
          <div>
            <p class="font-bold">¡Productos actualizados!</p>
            <p class="text-sm opacity-90">Se cargaron los últimos cambios</p>
          </div>
        </div>
      `;
      document.body.appendChild(mensaje);
      setTimeout(() => mensaje.remove(), 3000);
      
    } catch (error) {
      console.error('Error al actualizar productos:', error);
      alert('Error al actualizar los productos');
    } finally {
      setActualizando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingId) {
      await updateProducto(editingId, formData);
    } else {
      await createProducto(formData);
    }

    setShowModal(false);
    resetForm();
    cargarProductos();
  };

  const handleEdit = (producto) => {
    setFormData({
      nombre: producto.nombre,
      precio: producto.precio,
      unidad: producto.unidad
    });
    setEditingId(producto.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este producto?')) {
      await deleteProducto(id);
      cargarProductos();
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', precio: '', unidad: 'unidad' });
    setEditingId(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Paginación
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">📦 Productos</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Botón Actualizar - Siempre visible */}
          <button
            onClick={handleActualizar}
            disabled={actualizando}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Recargar productos"
          >
            <span className={actualizando ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </span>
          </button>
          
          {/* Botón Nuevo Producto - Solo para admin */}
          {isAuthenticated && (
            <button
              onClick={openNewModal}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold whitespace-nowrap"
            >
              + Nuevo
            </button>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-800 text-sm sm:text-base">
            📋 <strong>Modo Vista:</strong> Estás viendo el catálogo de productos. 
            Para administrar el catálogo, <span className="font-semibold">inicia sesión como administrador</span>.
          </p>
        </div>
      )}

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grilla de productos 3x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {currentProductos.map(producto => (
          <div key={producto.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-gray-800 mb-2">{producto.nombre}</h3>
            <p className="text-2xl font-semibold text-green-600 mb-2">
              ${producto.precio}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Unidad: <span className="font-semibold">{producto.unidad}</span>
            </p>
            
            {isAuthenticated && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(producto)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(producto.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded text-sm"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {currentProductos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="w-full sm:w-auto px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal - Solo visible en modo admin */}
      {showModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Unidad de medida</label>
                <select
                  value={formData.unidad}
                  onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="litros">Litros</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
