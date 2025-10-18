// frontend/src/pages/Transferencias.jsx
import { useState, useEffect } from 'react';

export default function Transferencias() {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    cargarTransferencias();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // Auto-actualizar cada 10 segundos solo si no estás buscando
    if (!searchTerm) {
      const interval = setInterval(() => {
        cargarTransferencias();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [searchTerm, currentPage]);

  const cargarTransferencias = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });
      
      const response = await fetch(`http://localhost:3001/api/transferencias?${params}`);
      const data = await response.json();
      
      if (data.transferencias) {
        setTransferencias(data.transferencias);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        setTransferencias(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar transferencias:', error);
      setTransferencias([]);
      setLoading(false);
    }
  };

  const sincronizarMercadoPago = async () => {
    setSincronizando(true);
    try {
      const response = await fetch('http://localhost:3001/api/transferencias/sincronizar');
      const data = await response.json();
      
      if (response.ok) {
        // Volver a la primera página y recargar
        setCurrentPage(1);
        await cargarTransferencias();
        
        if (data.nuevas > 0) {
          // Mostrar notificación
          const mensaje = document.createElement('div');
          mensaje.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
          mensaje.textContent = `✅ ${data.nuevas} transferencias nuevas`;
          document.body.appendChild(mensaje);
          setTimeout(() => mensaje.remove(), 3000);
        } else {
          // Sin transferencias nuevas
          const mensaje = document.createElement('div');
          mensaje.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          mensaje.textContent = '✓ Sincronizado - Sin novedades';
          document.body.appendChild(mensaje);
          setTimeout(() => mensaje.remove(), 2000);
        }
      } else {
        console.error('Error al sincronizar:', data);
        alert(`❌ ${data.mensaje || data.error}`);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('❌ Error al conectar con Mercado Pago. Verifica tu token en el archivo .env');
    } finally {
      setSincronizando(false);
    }
  };

  const formatearFecha = (fechaHora) => {
    try {
      // La fecha viene en formato ISO de Mercado Pago: "2024-01-15T14:30:00.000-04:00"
      const fecha = new Date(fechaHora);
      
      const dia = fecha.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      });
      
      const hora = fecha.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      
      return { dia, hora };
    } catch (error) {
      console.error('Error al formatear fecha:', error, fechaHora);
      return { dia: 'N/A', hora: 'N/A' };
    }
  };

  const obtenerFuente = (observaciones) => {
    if (!observaciones) return { texto: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
    
    if (observaciones.includes('FUENTE:')) {
      const fuente = observaciones.split('FUENTE:')[1].split('|')[0];
      
      switch(fuente) {
        case 'Transferencia Alias':
          return { texto: '💸 Alias', color: 'bg-green-100 text-green-800' };
        case 'Transferencia':
          return { texto: '💰 Transferencia', color: 'bg-blue-100 text-blue-800' };
        case 'QR':
          return { texto: '📱 QR', color: 'bg-purple-100 text-purple-800' };
        case 'Tarjeta':
          return { texto: '💳 Tarjeta', color: 'bg-yellow-100 text-yellow-800' };
        case 'POS/Point':
          return { texto: '🏪 POS', color: 'bg-orange-100 text-orange-800' };
        default:
          return { texto: fuente, color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    return { texto: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Volver a la primera página al buscar
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Cargando transferencias...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Transferencias Recibidas</h1>
        <button
          onClick={sincronizarMercadoPago}
          disabled={sincronizando}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sincronizando ? (
            <>
              <span className="animate-spin">⏳</span>
              Sincronizando...
            </>
          ) : (
            <>
              🔄 Sincronizar Mercado Pago
            </>
          )}
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
        />
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            {total > 0 
              ? `Encontrados: ${total} resultado${total !== 1 ? 's' : ''}`
              : 'No se encontraron resultados'
            }
          </p>
        )}
      </div>

      {/* Lista de transferencias */}
      {transferencias.length > 0 ? (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-left font-semibold">Fuente</th>
                  <th className="px-6 py-4 text-left font-semibold">Día</th>
                  <th className="px-6 py-4 text-left font-semibold">Hora</th>
                  <th className="px-6 py-4 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map((transferencia, index) => {
                  const { dia, hora } = formatearFecha(transferencia.fecha_hora);
                  const fuente = obtenerFuente(transferencia.observaciones);
                  
                  return (
                    <tr 
                      key={transferencia.id} 
                      className={`border-t hover:bg-green-50 transition ${
                        index === 0 && currentPage === 1 && !searchTerm ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {transferencia.nombre}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${fuente.color} px-3 py-1 rounded-full text-sm font-semibold`}>
                          {fuente.texto}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{dia}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{hora}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600 text-xl">
                        ${parseFloat(transferencia.monto).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                ← Anterior
              </button>
              
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Mostrar solo páginas cercanas (máximo 7 botones)
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg font-semibold ${
                          currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 3 ||
                    pageNum === currentPage + 3
                  ) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 bg-gray-50 px-6 py-3 text-sm text-gray-600 rounded-lg text-center">
            Mostrando página {currentPage} de {totalPages} • Total: {total} transferencias
            {!searchTerm && ' • Actualización automática cada 10 segundos'}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <div className="text-6xl mb-4">💸</div>
          <p className="text-xl font-semibold mb-2">
            {searchTerm ? 'No se encontraron resultados' : 'No hay transferencias registradas'}
          </p>
          <p className="text-sm text-gray-400">
            {searchTerm 
              ? 'Intenta con otro nombre' 
              : 'Haz clic en "Sincronizar Mercado Pago" para obtener tus transferencias'
            }
          </p>
        </div>
      )}
    </div>
  );
}