// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Registrar Service Worker para funcionalidad offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope);
        
        // Verificar actualizaciones cada 1 hora
        setInterval(() => {
          registration.update();
        }, 3600000);
      })
      .catch((error) => {
        console.error('❌ Error registrando Service Worker:', error);
      });
  });

  // Escuchar cambios en el estado de conexión
  window.addEventListener('online', () => {
    console.log('✅ Conexión restaurada');
    // Mostrar notificación de éxito
    showConnectionNotification('online');
  });

  window.addEventListener('offline', () => {
    console.log('⚠️ Sin conexión - Modo offline activado');
    // Mostrar notificación de offline
    showConnectionNotification('offline');
  });
}

// Función para mostrar notificaciones de conexión
function showConnectionNotification(status) {
  const notification = document.createElement('div');
  notification.className = `
    fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-2xl z-50 
    transform transition-all duration-300 animate-bounce
    ${status === 'online' 
      ? 'bg-green-500 text-white' 
      : 'bg-yellow-500 text-white'
    }
  `;
  
  notification.innerHTML = status === 'online'
    ? `
      <div class="flex items-center gap-3">
        <span class="text-2xl">✅</span>
        <div>
          <p class="font-bold">Conexión Restaurada</p>
          <p class="text-sm opacity-90">Sincronizando datos...</p>
        </div>
      </div>
    `
    : `
      <div class="flex items-center gap-3">
        <span class="text-2xl">⚠️</span>
        <div>
          <p class="font-bold">Sin Conexión</p>
          <p class="text-sm opacity-90">Usando datos locales</p>
        </div>
      </div>
    `;

  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Inicializar IndexedDB al cargar la aplicación
import { offlineStorage } from './services/offlineStorage';
offlineStorage.initDB()
  .then(() => console.log('✅ IndexedDB inicializado'))
  .catch((error) => console.error('❌ Error inicializando IndexedDB:', error));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
