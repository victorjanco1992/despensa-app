// frontend/src/components/OfflineIndicator.jsx
import { useState, useEffect } from 'react';
import { offlineStorage, getTimeSinceUpdate } from '../services/offlineStorage';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdates, setLastUpdates] = useState({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar timestamps de última actualización
    loadLastUpdates();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadLastUpdates = async () => {
    const stores = ['productos', 'clientes', 'transferencias', 'listaCompras'];
    const updates = {};

    for (const store of stores) {
      const timestamp = await offlineStorage.getLastUpdate(store);
      updates[store] = timestamp;
    }

    setLastUpdates(updates);
  };

  if (isOnline) {
    return null; // No mostrar nada cuando hay conexión
  }

  return (
    <>
      {/* Banner principal de offline */}
      <div className="fixed top-16 left-0 right-0 bg-yellow-500 text-white px-4 py-2 shadow-lg z-40">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Modo Sin Conexión</p>
              <p className="text-xs opacity-90">Mostrando datos guardados localmente</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
          >
            {showDetails ? 'Ocultar' : 'Ver'} detalles
          </button>
        </div>
      </div>

      {/* Panel de detalles desplegable */}
      {showDetails && (
        <div className="fixed top-32 left-0 right-0 bg-white shadow-xl z-40 border-t-2 border-yellow-500">
          <div className="container mx-auto p-4">
            <h3 className="font-bold text-gray-800 mb-3">
              📊 Estado de Datos en Caché
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(lastUpdates).map(([store, timestamp]) => (
                <div key={store} className="bg-gray-50 rounded p-3">
                  <p className="text-sm font-semibold text-gray-700 capitalize">
                    {store === 'listaCompras' ? 'Lista de Compras' : store}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {timestamp ? getTimeSinceUpdate(timestamp) : 'Sin datos'}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="text-blue-800">
                <strong>💡 Nota:</strong> Los datos se sincronizarán automáticamente cuando recuperes la conexión.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
