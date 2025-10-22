import { useState, useEffect } from 'react';
import { 
  getClientes, 
  getProductos, 
  getCuentaCliente, 
  addProductoCuenta, 
  actualizarPrecios, 
  cancelarCuenta,
  deleteItemCuenta 
} from '../services/api';
import { useAuthStore } from '../stores/authStore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = 'http://localhost:3001/api';

export default function CuentasCorrientes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentaItems, setCuentaItems] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductoSueltoModal, setShowProductoSueltoModal] = useState(false);
  const [showClientesModal, setShowClientesModal] = useState(false);
  
  const [nuevoItem, setNuevoItem] = useState({
    producto_id: '',
    cantidad: '',
    es_gramos: false
  });

  const [productoSuelto, setProductoSuelto] = useState({
    nombre: '',
    precio: '',
    cantidad: 1
  });

  useEffect(() => {
    cargarClientes();
    cargarProductos();
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

  const cargarClientes = async () => {
    try {
      const data = await getClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarCuentaCliente = async (clienteId) => {
    try {
      const data = await getCuentaCliente(clienteId);
      setCuentaItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar cuenta del cliente:', error);
      setCuentaItems([]);
    }
  };

  const handleSeleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setShowClientesModal(false);
    await cargarCuentaCliente(cliente.id);
  };

  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    
    try {
      let cantidadFinal = parseFloat(nuevoItem.cantidad);
      
      if (nuevoItem.es_gramos) {
        cantidadFinal = cantidadFinal / 1000;
      }

      await addProductoCuenta({
        cliente_id: clienteSeleccionado.id,
        producto_id: nuevoItem.producto_id,
        cantidad: cantidadFinal
      });

      setShowAddModal(false);
      setNuevoItem({ producto_id: '', cantidad: '', es_gramos: false });
      await cargarCuentaCliente(clienteSeleccionado.id);
    } catch (error) {
      console.error('Error al agregar producto:', error);
      alert('Error al agregar producto a la cuenta');
    }
  };

  const handleAgregarProductoSuelto = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/cuentas/producto-suelto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteSeleccionado.id,
          nombre: productoSuelto.nombre,
          precio: parseFloat(productoSuelto.precio),
          cantidad: parseFloat(productoSuelto.cantidad)
        }),
      });

      if (response.ok) {
        setShowProductoSueltoModal(false);
        setProductoSuelto({ nombre: '', precio: '', cantidad: 1 });
        await cargarCuentaCliente(clienteSeleccionado.id);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Error al agregar producto suelto'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar producto suelto');
    }
  };

  const handleActualizarPrecios = async () => {
    if (confirm('¿Actualizar todos los precios según el catálogo actual?')) {
      try {
        await actualizarPrecios(clienteSeleccionado.id);
        await cargarCuentaCliente(clienteSeleccionado.id);
        alert('Precios actualizados correctamente');
      } catch (error) {
        console.error('Error al actualizar precios:', error);
        alert('Error al actualizar precios');
      }
    }
  };

  const handleCancelarCuenta = async () => {
    if (confirm('¿Cancelar toda la cuenta? Esto eliminará todos los items.')) {
      try {
        await cancelarCuenta(clienteSeleccionado.id);
        setCuentaItems([]);
        alert('Cuenta cancelada');
      } catch (error) {
        console.error('Error al cancelar cuenta:', error);
        alert('Error al cancelar cuenta');
      }
    }
  };

  const handleEliminarItem = async (itemId) => {
    if (confirm('¿Eliminar este item?')) {
      try {
        await deleteItemCuenta(itemId);
        await cargarCuentaCliente(clienteSeleccionado.id);
      } catch (error) {
        console.error('Error al eliminar item:', error);
        alert('Error al eliminar el item');
      }
    }
  };

  const calcularTotal = () => {
    if (!Array.isArray(cuentaItems) || cuentaItems.length === 0) return '0.00';
    return cuentaItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0).toFixed(2);
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Cuenta Corriente', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 14, 30);
    doc.text(`DNI: ${clienteSeleccionado.dni}`, 14, 37);
    doc.text(`Domicilio: ${clienteSeleccionado.domicilio || 'N/A'}`, 14, 44);
    doc.text(`Teléfono: ${clienteSeleccionado.telefono || 'N/A'}`, 14, 51);
    
    const tableData = cuentaItems.map(item => [
      item.producto_nombre,
      item.cantidad,
      item.unidad,
      `$${parseFloat(item.precio_unitario).toFixed(2)}`,
      `$${parseFloat(item.subtotal).toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 60,
      head: [['Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal']],
      body: tableData,
    });
    
    const finalY = doc.lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text(`TOTAL: $${calcularTotal()}`, 14, finalY + 10);
    
    doc.save(`cuenta_${clienteSeleccionado.nombre.replace(/\s/g, '_')}.pdf`);
  };

  const enviarWhatsApp = () => {
    const total = calcularTotal();
    const mensaje = `Hola! Te envío el detalle de tu cuenta corriente.\nCliente: ${clienteSeleccionado.nombre}\nTotal: $${total}`;
    const telefono = '5492616239777';
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
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

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">💳 Cuentas Corrientes</h1>

      {!isAuthenticated && (
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-800 text-sm sm:text-base">
            ⚠️ <strong>Modo Solo Lectura:</strong> Estás viendo las cuentas corrientes. 
            Para agregar productos o modificar cuentas, <span className="font-semibold">debes iniciar sesión como administrador</span>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de clientes - Desktop */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">Seleccionar Cliente</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clientes.map(cliente => (
                <button
                  key={cliente.id}
                  onClick={() => handleSeleccionarCliente(cliente)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    clienteSeleccionado?.id === cliente.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-semibold">{cliente.nombre}</div>
                  <div className="text-sm opacity-75">DNI: {cliente.dni}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botón selector de clientes - Mobile */}
        <div className="lg:hidden">
          <button
            onClick={() => setShowClientesModal(true)}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-between"
          >
            <span>
              {clienteSeleccionado ? clienteSeleccionado.nombre : 'Seleccionar Cliente'}
            </span>
            <span>▼</span>
          </button>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-2">
          {clienteSeleccionado ? (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{clienteSeleccionado.nombre}</h2>
                  <p className="text-gray-600 text-sm sm:text-base">DNI: {clienteSeleccionado.dni}</p>
                </div>
                {isAuthenticated && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base"
                    >
                      + Producto
                    </button>
                    <button
                      onClick={() => setShowProductoSueltoModal(true)}
                      className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base"
                    >
                      💵 Suelto
                    </button>
                  </div>
                )}
              </div>

              {cuentaItems.length > 0 ? (
                <>
                  {/* Vista Desktop - Tabla */}
                  <div className="hidden md:block overflow-x-auto mb-6">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Producto</th>
                          <th className="px-4 py-2 text-right">Cantidad</th>
                          <th className="px-4 py-2 text-right">Precio Unit.</th>
                          <th className="px-4 py-2 text-right">Subtotal</th>
                          {isAuthenticated && <th className="px-4 py-2 text-center">Acción</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cuentaItems.map(item => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-3">{item.producto_nombre}</td>
                            <td className="px-4 py-3 text-right">
                              {item.unidad === 'kg' && item.cantidad < 1 
                                ? `${(item.cantidad * 1000).toFixed(0)}g`
                                : `${item.cantidad} ${item.unidad}`
                              }
                            </td>
                            <td className="px-4 py-3 text-right">${parseFloat(item.precio_unitario).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold">${parseFloat(item.subtotal).toFixed(2)}</td>
                            {isAuthenticated && (
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleEliminarItem(item.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  Eliminar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="3" className="px-4 py-3 text-right font-bold text-lg">TOTAL:</td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                            ${calcularTotal()}
                          </td>
                          {isAuthenticated && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Vista Mobile - Cards */}
                  <div className="md:hidden space-y-3 mb-6">
                    {cuentaItems.map(item => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800 flex-1 mr-2">{item.producto_nombre}</h4>
                          {isAuthenticated && (
                            <button
                              onClick={() => handleEliminarItem(item.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Cantidad:</span>
                            <p className="font-medium">
                              {item.unidad === 'kg' && item.cantidad < 1 
                                ? `${(item.cantidad * 1000).toFixed(0)}g`
                                : `${item.cantidad} ${item.unidad}`
                              }
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Precio Unit.:</span>
                            <p className="font-medium">${parseFloat(item.precio_unitario).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-semibold">Subtotal:</span>
                            <span className="text-lg font-bold text-green-600">
                              ${parseFloat(item.subtotal).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800">TOTAL:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${calcularTotal()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={generarPDF}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base"
                    >
                      📄 Generar PDF
                    </button>
                    <button
                      onClick={enviarWhatsApp}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base"
                    >
                      📱 Enviar WhatsApp
                    </button>
                    {isAuthenticated && (
                      <>
                        <button
                          onClick={handleActualizarPrecios}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base"
                        >
                          🔄 Actualizar Precios
                        </button>
                        <button
                          onClick={handleCancelarCuenta}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm sm:text-base"
                        >
                          ❌ Cancelar Cuenta
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl sm:text-6xl mb-4">📝</div>
                  <p className="text-lg sm:text-xl font-semibold mb-2">Cuenta vacía</p>
                  <p className="text-sm">No hay productos en la cuenta corriente</p>
                  {isAuthenticated && (
                    <p className="text-sm mt-2">Haz clic en "+ Producto" para agregar items</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <div className="text-4xl sm:text-6xl mb-4">👈</div>
              <p className="text-lg sm:text-xl">Selecciona un cliente para ver su cuenta</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Selector de Clientes - Mobile */}
      {showClientesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Seleccionar Cliente</h2>
                <button
                  onClick={() => setShowClientesModal(false)}
                  className="text-2xl text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-70px)] p-4">
              <div className="space-y-2">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => handleSeleccionarCliente(cliente)}
                    className={`w-full text-left p-4 rounded-lg transition ${
                      clienteSeleccionado?.id === cliente.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">{cliente.nombre}</div>
                    <div className="text-sm opacity-75">DNI: {cliente.dni}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Producto */}
      {showAddModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Agregar Producto del Catálogo</h2>
            <form onSubmit={handleAgregarProducto}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Buscar Producto</label>
                <input
                  type="text"
                  value={searchProducto}
                  onChange={(e) => setSearchProducto(e.target.value)}
                  placeholder="Escribe para buscar..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <p className="text-base sm:text-lg">{productoSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-600">
                    ${productoSeleccionado.precio} por {productoSeleccionado.unidad}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Cantidad</label>
                <input
                  type="number"
                  step="0.001"
                  value={nuevoItem.cantidad}
                  onChange={(e) => setNuevoItem({...nuevoItem, cantidad: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder={nuevoItem.es_gramos ? "Ej: 250 (gramos)" : "Ej: 2"}
                />
              </div>

              {productoSeleccionado?.unidad === 'kg' && (
                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={nuevoItem.es_gramos}
                      onChange={(e) => setNuevoItem({...nuevoItem, es_gramos: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 text-sm sm:text-base">La cantidad está en gramos</span>
                  </label>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {nuevoItem.es_gramos 
                      ? '(Se convertirá automáticamente a kg)' 
                      : '(Ingresa directamente en kg)'
                    }
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNuevoItem({ producto_id: '', cantidad: '', es_gramos: false });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nuevoItem.producto_id || !nuevoItem.cantidad}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:bg-gray-400"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto Suelto */}
      {showProductoSueltoModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">💵 Producto Suelto</h2>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">Para productos no registrados en el catálogo (ej: $1000 de pan)</p>
            
            <form onSubmit={handleAgregarProductoSuelto}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Descripción *</label>
                <input
                  type="text"
                  value={productoSuelto.nombre}
                  onChange={(e) => setProductoSuelto({...productoSuelto, nombre: e.target.value})}
                  placeholder="Ej: Pan, Fiado, etc."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Precio Total *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productoSuelto.precio}
                  onChange={(e) => setProductoSuelto({...productoSuelto, precio: e.target.value})}
                  placeholder="1000.00"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Este monto se agregará directamente a la cuenta
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Cantidad</label>
                <input
                  type="number"
                  step="1"
                  value={productoSuelto.cantidad}
                  onChange={(e) => setProductoSuelto({...productoSuelto, cantidad: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Normalmente 1, pero puedes ajustarlo si necesitas
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductoSueltoModal(false);
                    setProductoSuelto({ nombre: '', precio: '', cantidad: 1 });
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
