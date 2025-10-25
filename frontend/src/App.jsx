// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import CuentasCorrientes from './pages/CuentasCorrientes';
import Transferencias from './pages/Transferencias';
import ListaCompras from './pages/ListaCompras';
import Layout from './components/Layout';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <InstallPWA />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas accesibles siempre (con o sin login) */}
        <Route path="/" element={<Layout />}>
          {/* Dashboard siempre accesible - muestra reloj y mensaje según autenticación */}
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="cuentas" element={<CuentasCorrientes />} />
          <Route path="transferencias" element={<Transferencias />} />
          <Route path="lista-compras" element={<ListaCompras />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
