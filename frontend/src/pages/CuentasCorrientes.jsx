// frontend/src/pages/CuentasCorrientes.jsx
import { useState, useEffect } from 'react';
import { 
  getClientes, 
  getProductos, 
  getCuentaCliente, 
  addProductoCuenta, 
  actualizarPrecios, 
  cancelarCuenta,
  deleteItemCuenta,
  getAbonos,
  addAbono,
  deleteAbono
} from '../services/api';
import { useAuthStore } from '../stores/authStore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL;

export default function CuentasCorrientes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentaItems, setCuentaItems] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductoSueltoModal, setShowProductoSueltoModal] = useState(false);
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);

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

  const [nuevoAbono, setNuevoAbono] = useState({
    monto: '',
    observacion: ''
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
      const [dataCuenta, dataAbonos] = await Promise.all([
        getCuentaCliente(clienteId),
        getAbonos(clienteId)
      ]);
      setCuentaItems(Array.isArray(dataCuenta) ? dataCuenta : []);
      setAbonos(Array.isArray(dataAbonos) ? dataAbonos : []);
    } catch (error) {
      console.error('Error al cargar cuenta del cliente:', error);
      setCuentaItems([]);
      setAbonos([]);
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
      if (nuevoItem.es_gramos) cantidadFinal = cantidadFinal / 1000;

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

  const handleAgregarAbono = async (e) => {
    e.preventDefault();
    try {
      await addAbono({
        cliente_id: clienteSeleccionado.id,
        monto: parseFloat(nuevoAbono.monto),
        observacion: nuevoAbono.observacion
      });
      setShowAbonoModal(false);
      setNuevoAbono({ monto: '', observacion: '' });
      await cargarCuentaCliente(clienteSeleccionado.id);
    } catch (error) {
      console.error('Error al registrar abono:', error);
      alert('Error al registrar abono');
    }
  };

  const handleEliminarAbono = async (id) => {
    if (confirm('¿Eliminar este abono?')) {
      try {
        await deleteAbono(id);
        await cargarCuentaCliente(clienteSeleccionado.id);
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono');
      }
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
    if (confirm('¿Cancelar toda la cuenta? Esto eliminará todos los productos y abonos.')) {
      try {
        await cancelarCuenta(clienteSeleccionado.id);
        setCuentaItems([]);
        setAbonos([]);
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

  // ── Totales ──────────────────────────────────────────────
  const calcularBruto = () =>
    cuentaItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0).toFixed(2);

  const calcularTotalAbonos = () =>
    abonos.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0).toFixed(2);

  const calcularTotal = () => {
    const bruto = cuentaItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const totalAbonos = abonos.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0);
    return Math.max(0, bruto - totalAbonos).toFixed(2);
  };

  // ── Lista cronológica combinada (productos + abonos) ─────
  const movimientosCombinados = [
    ...cuentaItems.map(item => ({
      id: `prod-${item.id}`,
      tipo: 'producto',
      descripcion: item.producto_nombre,
      detalle: item.unidad === 'kg' && item.cantidad < 1
        ? `${(item.cantidad * 1000).toFixed(0)}g`
        : `${item.cantidad} ${item.unidad}`,
      precio_unitario: item.precio_unitario,
      monto: item.subtotal,
      fecha: item.fecha,
      itemId: item.id
    })),
    ...abonos.map(a => ({
      id: `abono-${a.id}`,
      tipo: 'abono',
      descripcion: '💰 Abono',
      detalle: a.observacion || '',
      precio_unitario: null,
      monto: a.monto,
      fecha: a.fecha_hora,
      itemId: a.id
    }))
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // ── PDF ──────────────────────────────────────────────────
  const generarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Cuenta Corriente', 14, 20);

    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 14, 30);
    doc.text(`DNI: ${clienteSeleccionado.dni}`, 14, 37);
    doc.text(`Domicilio: ${clienteSeleccionado.domicilio || 'N/A'}`, 14, 44);
    doc.text(`Teléfono: ${clienteSeleccionado.telefono || 'N/A'}`, 14, 51);

    const tableData = movimientosCombinados.map(mov => [
      mov.fecha ? new Date(mov.fecha).toLocaleString('es-AR') : '-',
      mov.descripcion + (mov.detalle ? ` (${mov.detalle})` : ''),
      mov.precio_unitario != null ? `$${parseFloat(mov.precio_unitario).toFixed(2)}` : '-',
      (mov.tipo === 'abono' ? '- ' : '+ ') + `$${parseFloat(mov.monto).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 60,
      head: [['Fecha y hora', 'Descripción', 'P. Unit.', 'Monto']],
      body: tableData,
      styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY || 60;
    doc.setFontSize(11);
    doc.text(`Subtotal productos: $${calcularBruto()}`, 14, finalY + 10);
    if (abonos.length > 0) {
      doc.text(`Total abonos: - $${calcularTotalAbonos()}`, 14, finalY + 17);
    }
    doc.setFontSize(14);
    doc.text(`TOTAL DEUDA: $${calcularTotal()}`, 14, finalY + (abonos.length > 0 ? 27 : 20));

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
    setNuevoItem({ ...nuevoItem, producto_id: producto.id });
    setSearchProducto('');
    setProductosFiltrados([]);
  };

  const productoSeleccionado = productos.find(p => p.id === parseInt(nuevoItem.producto_id));

  const hayMovimientos = movimientosCombinados.length > 0;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">💳 Cuentas Corrientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Panel clientes — Desktop */}
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

        {/* Selector clientes — Mobile */}
        <div className="lg:hidden">
          <button
            onClick={() => setShowClientesModal(true)}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-between"
          >
            <span>{clienteSeleccionado ? clienteSeleccionado.nombre : 'Seleccionar Cliente'}</span>
            <span>▼</span>
          </button>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-2">
          {clienteSeleccionado ? (
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">

              {/* Cabecera cliente + botones */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{clienteSeleccionado.nombre}</h2>
                  <p className="text-gray-600 text-sm sm:text-base">DNI: {clienteSeleccionado.dni}</p>
                </div>
                {isAuthenticated && (
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                    <button
                      onClick={() => setShowAbonoModal(true)}
                      className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base"
                    >
                      💰 Abono
                    </button>
                  </div>
                )}
              </div>

              {hayMovimientos ? (
                <>
                  {/* ── TABLA DESKTOP ── */}
                  <div className="hidden md:block overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Fecha y hora</th>
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-right">P. Unit.</th>
                          <th className="px-3 py-2 text-right">Monto</th>
                          {isAuthenticated && <th className="px-3 py-2 text-center">Acción</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosCombinados.map(mov => (
                          <tr
                            key={mov.id}
                            className={`border-t ${mov.tipo === 'abono' ? 'bg-green-50' : 'bg-red-50'}`}
                          >
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                              {mov.fecha ? new Date(mov.fecha).toLocaleString('es-AR') : '-'}
                            </td>
                            <td className={`px-3 py-2 font-medium ${mov.tipo === 'abono' ? 'text-green-700' : 'text-red-700'}`}>
                              {mov.descripcion}
                              {mov.detalle && (
                                <span className="text-gray-500 font-normal ml-1">({mov.detalle})</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {mov.precio_unitario != null
                                ? `$${parseFloat(mov.precio_unitario).toFixed(2)}`
                                : ''}
                            </td>
                            <td className={`px-3 py-2 text-right font-bold ${mov.tipo === 'abono' ? 'text-green-600' : 'text-red-600'}`}>
                              {mov.tipo === 'abono' ? '−' : '+'}${parseFloat(mov.monto).toFixed(2)}
                            </td>
                            {isAuthenticated && (
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() =>
                                    mov.tipo === 'abono'
                                      ? handleEliminarAbono(mov.itemId)
                                      : handleEliminarItem(mov.itemId)
                                  }
                                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                                >
                                  Eliminar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-300">
                        <tr className="bg-gray-50">
                          <td colSpan="3" className="px-3 py-2 text-right text-gray-500">Subtotal productos:</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">${calcularBruto()}</td>
                          {isAuthenticated && <td></td>}
                        </tr>
                        {abonos.length > 0 && (
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-3 py-2 text-right text-gray-500">Total abonos:</td>
                            <td className="px-3 py-2 text-right font-semibold text-green-600">− ${calcularTotalAbonos()}</td>
                            {isAuthenticated && <td></td>}
                          </tr>
                        )}
                        <tr className="bg-blue-50">
                          <td colSpan="3" className="px-3 py-3 text-right font-bold text-lg">TOTAL DEUDA:</td>
                          <td className="px-3 py-3 text-right font-bold text-lg text-blue-700">${calcularTotal()}</td>
                          {isAuthenticated && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* ── CARDS MOBILE ── */}
                  <div className="md:hidden space-y-2 mb-6">
                    {movimientosCombinados.map(mov => (
                      <div
                        key={mov.id}
                        className={`rounded-lg p-3 border ${
                          mov.tipo === 'abono'
                            ? 'bg-green-50 border-green-300'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-semibold text-sm ${mov.tipo === 'abono' ? 'text-green-700' : 'text-red-700'}`}>
                            {mov.descripcion}
                          </span>
                          <span className={`font-bold ml-2 ${mov.tipo === 'abono' ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.tipo === 'abono' ? '−' : '+'}${parseFloat(mov.monto).toFixed(2)}
                          </span>
                        </div>
                        {mov.detalle && mov.tipo === 'producto' && (
                          <p className="text-xs text-gray-500">
                            {mov.detalle} · ${parseFloat(mov.precio_unitario).toFixed(2)}/u
                          </p>
                        )}
                        {mov.detalle && mov.tipo === 'abono' && (
                          <p className="text-xs text-gray-500">{mov.detalle}</p>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-400">
                            {mov.fecha ? new Date(mov.fecha).toLocaleString('es-AR') : '-'}
                          </span>
                          {isAuthenticated && (
                            <button
                              onClick={() =>
                                mov.tipo === 'abono'
                                  ? handleEliminarAbono(mov.itemId)
                                  : handleEliminarItem(mov.itemId)
                              }
                              className="text-gray-400 hover:text-red-500 text-xs"
                            >
                              ✕ Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Resumen mobile */}
                    <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 space-y-1">
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Subtotal productos</span>
                        <span>${calcularBruto()}</span>
                      </div>
                      {abonos.length > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Total abonos</span>
                          <span>− ${calcularTotalAbonos()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2 mt-1">
                        <span>TOTAL DEUDA</span>
                        <span>${calcularTotal()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acciones */}
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

      {/* ── MODAL SELECTOR CLIENTES — Mobile ── */}
      {showClientesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Seleccionar Cliente</h2>
                <button onClick={() => setShowClientesModal(false)} className="text-2xl text-gray-500">✕</button>
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

      {/* ── MODAL AGREGAR PRODUCTO DEL CATÁLOGO ── */}
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
                        <div className="text-sm text-gray-600">${producto.precio} - {producto.unidad}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {productoSeleccionado && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-sm">Producto seleccionado:</p>
                  <p className="text-base sm:text-lg">{productoSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-600">${productoSeleccionado.precio} por {productoSeleccionado.unidad}</p>
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
                  placeholder={nuevoItem.es_gramos ? 'Ej: 250 (gramos)' : 'Ej: 2'}
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
                    {nuevoItem.es_gramos ? '(Se convertirá automáticamente a kg)' : '(Ingresa directamente en kg)'}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setNuevoItem({ producto_id: '', cantidad: '', es_gramos: false }); }}
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

      {/* ── MODAL PRODUCTO SUELTO ── */}
      {showProductoSueltoModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">💵 Producto Suelto</h2>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              Para productos no registrados en el catálogo (ej: $1000 de pan)
            </p>
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
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Este monto se agregará directamente a la cuenta</p>
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
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Normalmente 1, pero puedes ajustarlo si necesitas</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowProductoSueltoModal(false); setProductoSuelto({ nombre: '', precio: '', cantidad: 1 }); }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ABONO ── */}
      {showAbonoModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">💰 Registrar Abono</h2>
            <form onSubmit={handleAgregarAbono} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={nuevoAbono.monto}
                  onChange={(e) => setNuevoAbono({ ...nuevoAbono, monto: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observación (opcional)</label>
                <input
                  type="text"
                  value={nuevoAbono.observacion}
                  onChange={(e) => setNuevoAbono({ ...nuevoAbono, observacion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="ej: efectivo, seña, etc."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAbonoModal(false); setNuevoAbono({ monto: '', observacion: '' }); }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
