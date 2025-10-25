// frontend/src/pages/ListaCompras.jsx
import { useState, useEffect } from 'react';
import { 
  getProductos, 
  getListaCompras, 
  addItemListaCompras, 
  toggleCompradoItem,
  updateItemListaCompras,
  deleteItemListaCompras,
  limpiarListaComprada,
  marcarTodoComprado
} from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function ListaCompras() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [productos, setProductos] = useState([]);
  const [listaCompras, setListaCompras] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductoTemporalModal, setShowProductoTemporalModal] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  
  const [nuevoItem, setNuevoItem] = useState({
    producto_id: '',
    cantidad: '',
    precio_mayorista: '',
    es_gramos: false
  });

  const [productoTemporal, setProductoTemporal] = useState({
    nombre: '',
    cantidad: '',
    precio_mayorista: '',
    es_gramos: false
  });

  useEffect(() => {
    cargarProductos();
    cargarLista();
  }, []);

  useEffect(() => {
    if (searchProducto) {
      const filtered = productos.filter(p => 
        p.nombre.toLowerCase().includes(searchProducto.toLowerCase())
      );
      setProductosFiltrados(filtered);
    } else {
      setProductosFiltrados([]);
    }
  }, [searchProducto, productos]);

  const cargarProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarLista = async () => {
    try {
      const data = await getListaCompras();
      setListaCompras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar lista de compras:', error);
    }
  };

  const handleAgregarItem = async (e) => {
    e.preventDefault();
    
    try {
      let cantidadFinal = parseFloat(nuevoItem.cantidad);
      
      if (nuevoItem.es_gramos) {
        cantidadFinal = cantidadFinal / 1000;
      }

      await addItemListaCompras({
        producto_id: nuevoItem.producto_id,
        cantidad: cantidadFinal,
        precio_mayorista: parseFloat(nuevoItem.precio_mayorista) || 0
      });

      setShowAddModal(false);
      setNuevoItem({ producto_id: '', cantidad: '', precio_mayorista: '', es_gramos: false });
      setSearchProducto('');
      await cargarLista();
    } catch (error) {
      console.error('Error al agregar item:', error);
      alert('Error al agregar item a la lista');
    }
  };

  const handleAgregarProductoTemporal = async (e) => {
    e.preventDefault();
    
    try {
      let cantidadFinal = parseFloat(productoTemporal.cantidad);
      
      if (productoTemporal.es_gramos) {
        cantidadFinal = cantidadFinal / 1000;
      }

      // Agregar directamente a lista de compras sin crear en productos
      await addItemListaCompras({
        nombre_temporal: productoTemporal.nombre,
        unidad_temporal: productoTemporal.es_gramos ? 'kg' : 'unidad',
        cantidad: cantidadFinal,
        precio_mayorista: parseFloat(productoTemporal.precio_mayorista) || 0
      });

      setShowProductoTemporalModal(false);
      setProductoTemporal({ nombre: '', cantidad: '', precio_mayorista: '', es_gramos: false });
      await cargarLista();
    } catch (error) {
      console.error('Error al agregar producto temporal:', error);
      alert('Error al agregar producto temporal a la lista');
    }
  };

  const handleToggleComprado = async (id) => {
    try {
      await toggleCompradoItem(id);
      await cargarLista();
    } catch (error) {
      console.error('Error al marcar item:', error);
    }
  };

  const handleEditarItem = (item) => {
    setEditingItem({
      ...item,
      es_gramos: item.unidad === 'kg' && item.cantidad < 1
    });
    setShowEditModal(true);
  };

  const handleActualizarItem = async (e) => {
    e.preventDefault();
    
    try {
      let cantidadFinal = parseFloat(editingItem.cantidad);
      
      if (editingItem.es_gramos && editingItem.unidad === 'kg') {
        cantidadFinal = cantidadFinal / 1000;
      }

      await updateItemListaCompras(editingItem.id, {
        cantidad: cantidadFinal,
        precio_mayorista: parseFloat(editingItem.precio_mayorista) || 0
      });

      setShowEditModal(false);
      setEditingItem(null);
      await cargarLista();
    } catch (error) {
      console.error('Error al actualizar item:', error);
      alert('Error al actualizar item');
    }
  };

  const handleEliminarItem = async (id) => {
    if (confirm('¿Eliminar este item de la lista?')) {
      try {
        await deleteItemListaCompras(id);
        await cargarLista();
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
    }
  };

  const handleLimpiarComprados = async () => {
    if (confirm('¿Eliminar todos los productos ya comprados?')) {
      try {
        await limpiarListaComprada();
        await cargarLista();
      } catch (error) {
        console.error('Error al limpiar lista:', error);
      }
    }
  };

  const handleMarcarTodoComprado = async () => {
    if (confirm('¿Marcar toda la lista como comprada?')) {
      try {
        await marcarTodoComprado();
        await cargarLista();
      } catch (error) {
        console.error('Error al marcar todo:', error);
      }
    }
  };

  const seleccionarProductoDesdeSearch = (producto) => {
    setNuevoItem({
      ...nuevoItem,
      producto_id: producto.id
    });
    setSearchProducto('');
    setProductosFiltrados([]);
  };

  const productoSeleccionado = productos.find(p => p.id === parseInt(nuevoItem.producto_id));

  const itemsPendientes = listaCompras.filter(item => !item.comprado);
  const itemsComprados = listaCompras.filter(item => item.comprado);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🛒 Lista de Compras</h1>
          <p className="text-sm text-gray-600 mt-1">Lista para comprar en el mayorista</p>
        </div>
        {isAuthenticated && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold"
            >
              + Producto Catálogo
            </button>
            <button
              onClick={() => setShowProductoTemporalModal(true)}
              className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold"
            >
              💡 Producto Temporal
            </button>
          </div>
        )}
      </div>

      {/* Resumen y Acciones */}
      {isAuthenticated && itemsPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="mb-4">
            <p className="text-sm opacity-90">Productos pendientes:</p>
            <p className="text-4xl font-bold">{itemsPendientes.length}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleMarcarTodoComprado}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              ✅ Marcar Todo Comprado
            </button>
            <button
              onClick={handleLimpiarComprados}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              🗑️ Limpiar Lista Comprada
            </button>
          </div>
        </div>
      )}

      {/* Lista de Productos Pendientes */}
      {itemsPendientes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📋</span>
            <span>Por Comprar ({itemsPendientes.length})</span>
          </h2>
          
          <div className="space-y-3">
            {itemsPendientes.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComprado(item.id)}
                    className="mt-1 w-6 h-6 rounded border-2 border-gray-300 hover:border-green-500 flex items-center justify-center flex-shrink-0"
                  >
                    {item.comprado && <span className="text-green-600 text-lg">✓</span>}
                  </button>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-800 mb-1 flex items-center gap-2 flex-wrap">
                      <span>{item.producto_nombre}</span>
                      {item.es_temporal && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Temporal
                        </span>
                      )}
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-blue-50 rounded p-2">
                        <span className="text-gray-600 text-xs block mb-1">Cantidad</span>
                        <p className="font-semibold text-blue-700">
                          {item.unidad === 'kg' && item.cantidad < 1 
                            ? `${(item.cantidad * 1000).toFixed(0)}g`
                            : `${item.cantidad} ${item.unidad}`
                          }
                        </p>
                      </div>
                      
                      <div className="bg-green-50 rounded p-2">
                        <span className="text-gray-600 text-xs block mb-1">Precio Mayorista</span>
                        <p className="font-semibold text-green-700">
                          {item.precio_mayorista > 0 
                            ? `$${parseFloat(item.precio_mayorista).toFixed(2)}`
                            : 'Ticket'
                          }
                        </p>
                      </div>
                      
                      {item.precio_mayorista > 0 && (
                        <div className="bg-purple-50 rounded p-2">
                          <span className="text-gray-600 text-xs block mb-1">Subtotal</span>
                          <p className="font-semibold text-purple-700">
                            ${(parseFloat(item.precio_mayorista) * parseFloat(item.cantidad)).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  {isAuthenticated && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEditarItem(item)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleEliminarItem(item.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Productos Comprados */}
      {itemsComprados.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>✅</span>
            <span>Comprados ({itemsComprados.length})</span>
          </h2>
          
          <div className="space-y-3">
            {itemsComprados.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg shadow p-4 opacity-75">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComprado(item.id)}
                    className="mt-1 w-6 h-6 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-white text-lg">✓</span>
                  </button>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-600 mb-1 line-through flex items-center gap-2 flex-wrap">
                      <span>{item.producto_nombre}</span>
                      {item.es_temporal && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                          Temporal
                        </span>
                      )}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Cantidad:</span>
                        <p className="font-medium text-gray-600">
                          {item.unidad === 'kg' && item.cantidad < 1 
                            ? `${(item.cantidad * 1000).toFixed(0)}g`
                            : `${item.cantidad} ${item.unidad}`
                          }
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-500 text-xs">Precio:</span>
                        <p className="font-medium text-gray-600">
                          {item.precio_mayorista > 0 
                            ? `$${parseFloat(item.precio_mayorista).toFixed(2)}`
                            : 'Ticket'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  {isAuthenticated && (
                    <button
                      onClick={() => handleEliminarItem(item.id)}
                      className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {listaCompras.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-xl font-semibold mb-2">Lista vacía</p>
          <p className="text-sm mb-6">Agrega productos que necesitas comprar en el mayorista</p>
          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                + Producto del Catálogo
              </button>
              <button
                onClick={() => setShowProductoTemporalModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                💡 Producto Temporal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Agregar Producto del Catálogo */}
      {showAddModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Agregar a Lista de Compras</h2>
            <form onSubmit={handleAgregarItem}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Buscar Producto</label>
                <input
                  type="text"
                  value={searchProducto}
                  onChange={(e) => setSearchProducto(e.target.value)}
                  placeholder="Escribe para buscar..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                
                {productosFiltrados.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {productosFiltrados.map(producto => (
                      <button
                        key={producto.id}
                        type="button"
                        onClick={() => seleccionarProductoDesdeSearch(producto)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                      >
                        <div className="font-semibold">{producto.nombre}</div>
                        <div className="text-sm text-gray-600">
                          ${producto.precio} - {producto.unidad}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {productoSeleccionado && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-sm">Producto seleccionado:</p>
                  <p className="text-lg">{productoSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-600">
                    Precio venta: ${productoSeleccionado.precio} por {productoSeleccionado.unidad}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Cantidad</label>
                <input
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  value={nuevoItem.cantidad}
                  onChange={(e) => setNuevoItem({...nuevoItem, cantidad: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                  required
                  placeholder={nuevoItem.es_gramos ? "250" : "2"}
                />
              </div>

              {productoSeleccionado?.unidad === 'kg' && (
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={nuevoItem.es_gramos}
                      onChange={(e) => setNuevoItem({...nuevoItem, es_gramos: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">La cantidad está en gramos</span>
                  </label>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Precio Mayorista (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={nuevoItem.precio_mayorista}
                  onChange={(e) => setNuevoItem({...nuevoItem, precio_mayorista: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                  placeholder="0.00 (dejar vacío para 'Ticket')"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {productoSeleccionado?.unidad === 'kg' 
                    ? 'Precio por kg en el mayorista'
                    : 'Precio por unidad en el mayorista'
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNuevoItem({ producto_id: '', cantidad: '', precio_mayorista: '', es_gramos: false });
                    setSearchProducto('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nuevoItem.producto_id || !nuevoItem.cantidad}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg disabled:bg-gray-400"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Item */}
      {showEditModal && editingItem && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Editar Item</h2>
            <form onSubmit={handleActualizarItem}>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-lg">{editingItem.producto_nombre}</p>
                <p className="text-sm text-gray-600">Unidad: {editingItem.unidad}</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Cantidad</label>
                <input
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  value={editingItem.es_gramos && editingItem.unidad === 'kg' 
                    ? (editingItem.cantidad * 1000).toFixed(0)
                    : editingItem.cantidad
                  }
                  onChange={(e) => setEditingItem({
                    ...editingItem, 
                    cantidad: editingItem.es_gramos && editingItem.unidad === 'kg'
                      ? parseFloat(e.target.value) || 0
                      : parseFloat(e.target.value) || 0
                  })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  required
                />
              </div>

              {editingItem.unidad === 'kg' && (
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingItem.es_gramos}
                      onChange={(e) => {
                        const esGramos = e.target.checked;
                        setEditingItem({
                          ...editingItem, 
                          es_gramos: esGramos,
                          cantidad: esGramos 
                            ? editingItem.cantidad * 1000 
                            : editingItem.cantidad / 1000
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">La cantidad está en gramos</span>
                  </label>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Precio Mayorista
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={editingItem.precio_mayorista}
                  onChange={(e) => setEditingItem({...editingItem, precio_mayorista: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dejar en 0 para mostrar "Ticket"
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                  </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto Temporal */}
      {showProductoTemporalModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">💡 Producto Temporal</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Para productos que no están en tu catálogo (ej: Huevos, Azúcar, etc.)
            </p>
            
            <form onSubmit={handleAgregarProductoTemporal}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Nombre del Producto *</label>
                <input
                  type="text"
                  value={productoTemporal.nombre}
                  onChange={(e) => setProductoTemporal({...productoTemporal, nombre: e.target.value})}
                  placeholder="Ej: Huevos, Azúcar, Harina..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Cantidad *</label>
                <input
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  value={productoTemporal.cantidad}
                  onChange={(e) => setProductoTemporal({...productoTemporal, cantidad: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                  required
                  placeholder={productoTemporal.es_gramos ? "250" : "2"}
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productoTemporal.es_gramos}
                    onChange={(e) => setProductoTemporal({...productoTemporal, es_gramos: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">La cantidad está en gramos</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {productoTemporal.es_gramos 
                    ? 'Se convertirá automáticamente a kg' 
                    : 'Ingresa en unidades o kg según corresponda'
                  }
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Precio Mayorista (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={productoTemporal.precio_mayorista}
                  onChange={(e) => setProductoTemporal({...productoTemporal, precio_mayorista: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                  placeholder="0.00 (dejar vacío para 'Ticket')"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Precio estimado del mayorista (opcional)
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-yellow-800">
                  ℹ️ <strong>Nota:</strong> Este producto es temporal y solo existirá en la lista de compras. 
                  No se agregará a tu catálogo de productos para venta.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductoTemporalModal(false);
                    setProductoTemporal({ nombre: '', cantidad: '', precio_mayorista: '', es_gramos: false });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
