import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import './Usuarios.css';

export default function Usuarios() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    nombre_completo: '',
    usuario: '',
    contrasena: '',
    rol_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('http://localhost:8000/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/users/roles', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setFormData({
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        contrasena: '', // No mostrar contraseña
        rol_id: user.rol_id
      });
    } else {
      setFormData({
        id: null,
        nombre_completo: '',
        usuario: '',
        contrasena: '',
        rol_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = formData.id 
      ? `http://localhost:8000/api/users/${formData.id}` 
      : 'http://localhost:8000/api/users';
    const method = formData.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire('Error', data.message || 'Error al guardar el usuario', 'error');
        return;
      }

      Swal.fire('Éxito', 'Usuario guardado correctamente', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      Swal.fire('Error', 'Error de conexión', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ activo: !user.activo })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`http://localhost:8000/api/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          Swal.fire('Eliminado', 'El usuario ha sido eliminado.', 'success');
          fetchData();
        }
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar el usuario', 'error');
      }
    }
  };

  return (
    <div className="usuarios-page">
      <Header />
      
      <main className="usuarios-container">
        <div className="usuarios-header">
          <h1>Gestión de Usuarios</h1>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            + Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <div className="table-responsive">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.nombre_completo}</td>
                    <td>{user.usuario}</td>
                    <td><span className="role-badge">{user.role?.nombre}</span></td>
                    <td>
                      <button 
                        className={`status-badge ${user.activo ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-edit" onClick={() => handleOpenModal(user)}>Editar</button>
                      <button className="btn-delete" onClick={() => handleDelete(user.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{formData.id ? 'Editar Usuario' : 'Crear Usuario'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.nombre_completo}
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input 
                  type="text" 
                  value={formData.usuario}
                  onChange={e => setFormData({...formData, usuario: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Contraseña {formData.id && '(Dejar en blanco para mantener)'}</label>
                <input 
                  type="password" 
                  value={formData.contrasena}
                  onChange={e => setFormData({...formData, contrasena: e.target.value})}
                  required={!formData.id} 
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select 
                  value={formData.rol_id}
                  onChange={e => setFormData({...formData, rol_id: e.target.value})}
                  required
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
