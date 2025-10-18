// frontend/src/pages/CuentasCorrientes.jsx
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
    const data = await getClientes();
    setClientes(data);
  };

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
  };

  const cargarCuentaCliente = async (clienteId) => {
    const data = await getCuentaCliente(clienteId);
    setCuentaItems(data);
  };

  const handleSeleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    await cargarCuentaCliente(cliente.id);
  };

  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    
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
    cargarCuentaCliente(clienteSeleccionado.id);
  };

  const handleAgregarProductoSuelto = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3001/api/cuentas/producto-suelto', {
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
        cargarCuentaCliente(clienteSeleccionado.id);
      } else {
        alert('Error al agregar producto suelto');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar producto suelto');
    }
  };

  const handleActualizarPrecios = async () => {
    if (confirm('¿Actualizar todos los precios según el catálogo actual?')) {
      await actualizarPrecios(clienteSeleccionado.id);
      cargarCuentaCliente(clienteSeleccionado.id);
      alert('Precios actualizados correctamente');
    }
  };

  const handleCancelarCuenta = async () => {
    if (confirm('¿Cancelar toda la cuenta? Esto eliminará todos los items.')) {
      await cancelarCuenta(clienteSeleccionado.id);
      setCuentaItems([]);
      alert('Cuenta cancelada');
    }
  };

  const handleEliminarItem = async (itemId) => {
    if (confirm('¿Eliminar este item?')) {
      await deleteItemCuenta(itemId);
      cargarCuentaCliente(clienteSeleccionado.id);
    }
  };

  const calcularTotal = () => {
    return cuentaItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2);
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Cuenta Corriente', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 14, 30);
    doc.text(`DNI: ${clienteSeleccionado.dni}`, 14, 37);
    doc.text(`Domicilio: ${clienteSeleccionado.domicilio}`, 14, 44);
    doc.text(`Teléfono: ${clienteSeleccionado.telefono}`, 14, 51);
    
    const tableData = cuentaItems.map(item => [
      item.producto_nombre,
      item.cantidad,
      item.unidad,
      `$${item.precio_unitario.toFixed(2)}`,
      `$${item.subtotal.toFixed(2)}`
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">💳 Cuentas Corrientes</h1>

      {!isAuthenticated && (
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-800">
            ⚠️ <strong>Modo Solo Lectura:</strong> Estás viendo las cuentas corrientes. 
            Para agregar productos o modificar cuentas, <span className="font-semibold">debes iniciar sesión como administrador</span>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
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

        <div className="lg:col-span-2">
          {clienteSeleccionado ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{clienteSeleccionado.nombre}</h2>
                  <p className="text-gray-600">DNI: {clienteSeleccionado.dni}</p>
                </div>
                {isAuthenticated && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      + Producto
                    </button>
                    <button
                      onClick={() => setShowProductoSueltoModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                    >
                      💵 Suelto
                    </button>
                  </div>
                )}
              </div>

              {cuentaItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto mb-6">
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
                            <td className="px-4 py-3 text-right">${item.precio_unitario.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
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
                          <td colSpan={isAuthenticated ? "3" : "3"} className="px-4 py-3 text-right font-bold text-lg">TOTAL:</td>
                          <td className="px-4 py-3 text-right font-bold text-lg text-green-600">
                            ${calcularTotal()}
                          </td>
                          {isAuthenticated && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={generarPDF}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      📄 Generar PDF
                    </button>
                    <button
                      onClick={enviarWhatsApp}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                    >
                      📱 Enviar WhatsApp
                    </button>
                    {isAuthenticated && (
                      <>
                        <button
                          onClick={handleActualizarPrecios}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                        >
                          🔄 Actualizar Precios
                        </button>
                        <button
                          onClick={handleCancelarCuenta}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                        >
                          ❌ Cancelar Cuenta
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No hay productos en la cuenta corriente
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">👈</div>
              <p className="text-xl">Selecciona un cliente para ver su cuenta</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Agregar Producto del Catálogo</h2>
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
                  <p className="font-semibold">Producto seleccionado:</p>
                  <p className="text-lg">{productoSeleccionado.nombre}</p>
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
                    <span className="text-gray-700">La cantidad está en gramos</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
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

      {showProductoSueltoModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-2">💵 Producto Suelto</h2>
            <p className="text-gray-600 mb-4">Para productos no registrados en el catálogo (ej: $1000 de pan)</p>
            
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
                <p className="text-sm text-gray-500 mt-1">
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
                <p className="text-sm text-gray-500 mt-1">
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