// frontend/src/services/offlineStorage.js

const DB_NAME = 'DespensaDB';
const DB_VERSION = 1;

// Inicializar IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Crear stores si no existen
      if (!db.objectStoreNames.contains('productos')) {
        db.createObjectStore('productos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clientes')) {
        db.createObjectStore('clientes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cuentas')) {
        db.createObjectStore('cuentas', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transferencias')) {
        db.createObjectStore('transferencias', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('listaCompras')) {
        db.createObjectStore('listaCompras', { keyPath: 'id' });
      }
      
      // Store para metadatos
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
};

// Guardar datos en IndexedDB
const saveToIndexedDB = async (storeName, data) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Si es un array, guardar cada elemento
    if (Array.isArray(data)) {
      // Limpiar store antes de guardar nuevos datos
      await store.clear();
      for (const item of data) {
        await store.put(item);
      }
    } else {
      await store.put(data);
    }

    // Guardar timestamp de última actualización
    const metaTransaction = db.transaction(['metadata'], 'readwrite');
    const metaStore = metaTransaction.objectStore('metadata');
    await metaStore.put({
      key: `${storeName}_lastUpdate`,
      timestamp: Date.now()
    });

    return true;
  } catch (error) {
    console.error(`Error guardando en IndexedDB (${storeName}):`, error);
    return false;
  }
};

// Leer datos de IndexedDB
const getFromIndexedDB = async (storeName) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error leyendo de IndexedDB (${storeName}):`, error);
    return [];
  }
};

// Obtener último timestamp de actualización
const getLastUpdate = async (storeName) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(`${storeName}_lastUpdate`);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.timestamp : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return null;
  }
};

// Verificar si hay conexión a internet
const isOnline = () => {
  return navigator.onLine;
};

// Exportar funciones
export const offlineStorage = {
  save: saveToIndexedDB,
  get: getFromIndexedDB,
  getLastUpdate,
  isOnline,
  initDB
};

// Función auxiliar para formatear tiempo transcurrido
export const getTimeSinceUpdate = (timestamp) => {
  if (!timestamp) return 'Nunca';
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
};
