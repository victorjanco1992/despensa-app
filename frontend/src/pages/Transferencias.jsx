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
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    cargarTransferencias();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (!searchTerm) {
      const interval = setInterval(() => {
        cargarTransferencias();
      }, 30000); // Cada 30 segundos
      
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
      
      const response = await fetch(`${API_URL}/transferencias?${params}`);
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
      const response = await fetch(`${API_URL}/transferencias/sincronizar`);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentPage(1);
        await cargarTransferencias();
        
        if (data.nuevas > 0) {
          const mensaje = document.createElement('div');
          mensaje.className = 'fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce';
          mensaje.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-2xl">✅</span>
              <div>
                <p class="font-bold">${data.nuevas} transferencia${data.nuevas > 1 ? 's' : ''} nueva${data.nuevas > 1 ? 's' : ''}</p>
                <p class="text-sm opacity-90">Sincronizado correctamente</p>
              </div>
            </div>
          `;
          document.body.appendChild(mensaje);
          setTimeout(() => mensaje.remove(), 4000);
        } else {
          const mensaje = document.createElement('div');
          mensaje.className = 'fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
          mensaje.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-2xl">✓</span>
              <div>
                <p class="font-bold">Sin transferencias nuevas</p>
                <p class="text-sm opacity-90">Todo está actualizado</p>
              </div>
            </div>
          `;
          document.body.appendChild(mensaje);
          setTimeout(() => mensaje.remove(), 3000);
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
      const fecha = new Date(fechaHora);
      
      // Formatear en zona horaria de Argentina
      const dia = fecha.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      
      const hora = fecha.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      
      return { dia, hora };
    } catch (error) {
      console.error('Error al formatear fecha:', error, fechaHora);
      return { dia: 'N/A', hora: 'N/A' };
    }
  };

  const obtenerFuente = (observaciones) => {
    if (!observaciones) return { texto: 'Desconocido', emoji: '❓', color: 'bg-gray-100 text-gray-800' };
    
    if (observaciones.includes('FUENTE:')) {
      const fuente = observaciones.split('FUENTE:')[1].split('|')[0];
      
      switch(fuente) {
        case 'Transferencia Alias':
          return { texto: 'Alias', emoji: '💸', color: 'bg-green-100 text-green-800' };
        case 'Transferencia':
          return { texto: 'Transferencia', emoji: '💰', color: 'bg-blue-100 text-blue-800' };
        case 'QR':
          return { texto: 'QR', emoji: '📱', color: 'bg-purple-100 text-purple-800' };
        case 'Tarjeta':
          return { texto: 'Tarjeta', emoji: '💳', color: 'bg-yellow-100 text-yellow-800' };
        case 'POS/Point':
          return { texto: 'POS', emoji: '🏪', color: 'bg-orange-100 text-orange-800' };
        default:
          return { texto: fuente, emoji: '💵', color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    return { texto: 'Desconocido', emoji: '❓', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl text-gray-600">Cargando transferencias...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">💰 Transferencias MP</h1>
          <p className="text-sm text-gray-600 mt-1">Sincronización con Mercado Pago</p>
        </div>
        <button
          onClick={sincronizarMercadoPago}
          disabled={sincronizando}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {sincronizando ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              <span className="text-sm sm:text-base">Sincronizando...</span>
            </>
          ) : (
            <>
              <span className="text-xl">🔄</span>
              <span className="text-sm sm:text-base">Sincronizar</span>
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base sm:text-lg"
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
          {/* Vista Desktop - Tabla */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Nombre</th>
                  <th className="px-6 py-4 text-left font-semibold">Método</th>
                  <th className="px-6 py-4 text-left font-semibold">Fecha</th>
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
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{transferencia.nombre}</div>
                        {index === 0 && currentPage === 1 && !searchTerm && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Más reciente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${fuente.color} px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1`}>
                          <span>{fuente.emoji}</span>
                          <span>{fuente.texto}</span>
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

          {/* Vista Mobile - Cards */}
          <div className="md:hidden space-y-4 mb-6">
            {transferencias.map((transferencia, index) => {
              const { dia, hora } = formatearFecha(transferencia.fecha_hora);
              const fuente = obtenerFuente(transferencia.observaciones);
              
              return (
                <div 
                  key={transferencia.id} 
                  className={`bg-white rounded-lg shadow-md p-4 ${
                    index === 0 && currentPage === 1 && !searchTerm ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-1">
                        {transferencia.nombre}
                      </h3>
                      {index === 0 && currentPage === 1 && !searchTerm && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                          Más reciente
                        </span>
                      )}
                    </div>
                    <span className={`${fuente.color} px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2`}>
                      {fuente.emoji} {fuente.texto}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-600 text-xs">📅 Fecha</span>
                      <p className="font-medium text-gray-800 mt-1">{dia}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-600 text-xs">🕐 Hora</span>
                      <p className="font-medium text-gray-800 font-mono mt-1">{hora}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t-2 border-green-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-semibold">Monto recibido:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${parseFloat(transferencia.monto).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                ← Anterior
              </button>
              
              <div className="flex gap-2 flex-wrap justify-center">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 sm:px-4 py-2 rounded-lg font-semibold ${
                          currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 rounded-lg text-center shadow-inner">
            <p className="font-semibold">📊 Página {currentPage} de {totalPages} • Total: {total} transferencias</p>
            {!searchTerm && (
              <p className="mt-1 text-gray-500">
                🔄 Actualización automática cada 30 segundos
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center text-gray-500">
          <div className="text-4xl sm:text-6xl mb-4">💸</div>
          <p className="text-lg sm:text-xl font-semibold mb-2">
            {searchTerm ? 'No se encontraron resultados' : 'No hay transferencias registradas'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {searchTerm 
              ? 'Intenta con otro nombre' 
              : 'Haz clic en "Sincronizar" para obtener tus transferencias desde Mercado Pago'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={sincronizarMercadoPago}
              disabled={sincronizando}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 inline-flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Sincronizar ahora</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
