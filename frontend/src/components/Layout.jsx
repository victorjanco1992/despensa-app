// frontend/src/components/Layout.jsx
import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Layout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const handleLogin = () => {
    navigate('/login');
    setMenuOpen(false);
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="bg-blue-600 text-white p-4 shadow-lg fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <h1 className="text-2xl font-bold">🏪 Despensa Khaluby</h1>

          {/* Botón hamburguesa (solo móvil) */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-3xl focus:outline-none"
            aria-label="Abrir menú"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Menú de escritorio */}
          <div className="hidden md:flex gap-4 items-center">
            <Link to="/" className="hover:underline">Inicio</Link>
            <Link to="/productos" className="hover:underline">Productos</Link>
            <Link to="/clientes" className="hover:underline">Clientes</Link>
            <Link to="/cuentas" className="hover:underline">Cuentas</Link>
            <Link to="/transferencias" className="hover:underline">Transferencias</Link>

            {isAuthenticated ? (
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
              >
                Salir
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
              >
                🔐 Admin
              </button>
            )}
          </div>
        </div>

        {/* Menú móvil desplegable */}
        <div
          className={`md:hidden bg-blue-700 transition-all duration-300 overflow-hidden ${
            menuOpen ? 'max-h-96 opacity-100 py-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col items-center space-y-3">
            <Link to="/" onClick={closeMenu} className="hover:underline">
              Inicio
            </Link>
            <Link to="/productos" onClick={closeMenu} className="hover:underline">
              Productos
            </Link>
            <Link to="/clientes" onClick={closeMenu} className="hover:underline">
              Clientes
            </Link>
            <Link to="/cuentas" onClick={closeMenu} className="hover:underline">
              Cuentas
            </Link>
            <Link to="/transferencias" onClick={closeMenu} className="hover:underline">
              Transferencias
            </Link>

            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded w-32"
              >
                Salir
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded w-32"
              >
                🔐 Admin
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Contenido principal (con padding para el navbar fijo) */}
      <main className="container mx-auto p-4 pt-24">
        <Outlet />
      </main>
    </div>
  );
}
