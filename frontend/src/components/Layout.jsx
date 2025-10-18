// frontend/src/components/Layout.jsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Layout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🏪 Despensa Khaluby</h1>
          <div className="flex gap-4 items-center">
            {/* Inicio siempre visible */}
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
      </nav>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}