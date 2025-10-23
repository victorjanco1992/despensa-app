// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hora, setHora] = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    const actualizarHoraYFecha = () => {
      // Configuración de formato
      const opcionesHora = {
        timeZone: 'America/Argentina/Mendoza',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // formato 24 horas
      };
      const opcionesFecha = {
        timeZone: 'America/Argentina/Mendoza',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      };
      // Obtener hora y fecha locales en Mendoza
      const ahora = new Date();
      const horaLocal = ahora.toLocaleTimeString('es-AR', opcionesHora);
      const fechaLocal = ahora.toLocaleDateString('es-AR', opcionesFecha);
      // Capitalizar la primera letra del día
      const fechaFormateada = fechaLocal.charAt(0).toUpperCase() + fechaLocal.slice(1);
      setHora(horaLocal);
      setFecha(fechaFormateada);
    };

    actualizarHoraYFecha();
    const intervalo = setInterval(actualizarHoraYFecha, 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Reloj y Fecha - Siempre visible */}
      <div className="mb-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-7xl tracking-wider font-mono">
            {hora}
          </span>
          <span className="text-blue-100 text-2xl mt-4 font-medium">
            {fecha}
          </span>
          <span className="text-blue-200 text-sm mt-2">
            📍 Hora actual en Mendoza, Argentina
          </span>
        </div>
      </div>

      {/* Botones de acceso rápido - Solo para admin */}
      {isAuthenticated && (
        <>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/productos" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-200">
              <div className="text-4xl mb-4">📦</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Productos</h2>
              <p className="text-gray-600">Gestionar catálogo de productos</p>
            </Link>

            <Link to="/clientes" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-200">
              <div className="text-4xl mb-4">👥</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Clientes</h2>
              <p className="text-gray-600">Administrar clientes</p>
            </Link>

            <Link to="/cuentas" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-200">
              <div className="text-4xl mb-4">💳</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Cuentas Corrientes</h2>
              <p className="text-gray-600">Control de deudas y compras fiadas</p>
            </Link>

            <Link to="/transferencias" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-200">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Transferencias</h2>
              <p className="text-gray-600">Registro de pagos</p>
            </Link>
          </div>

        </>
      )}

    </div>
  );
}
