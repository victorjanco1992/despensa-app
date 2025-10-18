// frontend/src/pages/Clientes.jsx
import { useState, useEffect } from 'react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function Clientes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    domicilio: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const data = await getClientes();
    setClientes(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateCliente(editingId, formData);
      } else {
        await createCliente(formData);
      }
      setShowModal(false);
      resetForm();
      cargarClientes();
    } catch (error) {
      alert('Error al guardar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setFormData({
      nombre: cliente.nombre,
      dni: cliente.dni,
      domicilio: cliente.domicilio || '',
      telefono: cliente.telefono || '',
      email: cliente.email || ''
    });
    setEditingId(cliente.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este cliente? Esto también eliminará su cuenta corriente.')) {
      await deleteCliente(id);
      cargarClientes();
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', dni: '', domicilio: '', telefono: '', email: '' });
    setEditingId(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">👥 Clientes</h1>
        {isAuthenticated && (
          <button
            onClick={openNewModal}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            + Nuevo Cliente
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-800">
            📋 <strong>Modo Vista:</strong> Estás viendo la lista de clientes. 
            Para agregar o modificar clientes, <span className="font-semibold">inicia sesión como administrador</span>.
          </p>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">DNI</th>
              <th className="px-4 py-3 text-left">Domicilio</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Email</th>
              {isAuthenticated && <th className="px-4 py-3 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{cliente.nombre}</td>
                <td className="px-4 py-3">{cliente.dni}</td>
                <td className="px-4 py-3">{cliente.domicilio}</td>
                <td className="px-4 py-3">{cliente.telefono}</td>
                <td className="px-4 py-3">{cliente.email}</td>
                {isAuthenticated && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {clientes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay clientes registrados
          </div>
        )}
      </div>

      {/* Modal - Solo visible en modo admin */}
      {showModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">DNI *</label>
                <input
                  type="text"
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Domicilio</label>
                <input
                  type="text"
                  value={formData.domicilio}
                  onChange={(e) => setFormData({...formData, domicilio: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}