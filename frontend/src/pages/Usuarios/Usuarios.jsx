import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import './Usuarios.css';
import API_BASE from '../../config/api';


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

  const [isSubmitting, setIsSubmitting] = useState(false);
const [togglingUserId, setTogglingUserId] = useState(null);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/users/roles`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      setUsers(usersData);
      setRoles(rolesData);
    } catch (_err) {
      console.error('Error fetching data:', _err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
   
  }, []);

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
    setIsSubmitting(true);
    const url = formData.id 
      ? `${API_BASE}/api/users/${formData.id}` 
      : `${API_BASE}/api/users`;
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
        let errorMessage = data.message || 'Error al guardar el usuario';
        
        // Si hay errores de validación (Laravel HTTP 422), los mostramos detalladamente
        if (data.errors) {
          const firstError = Object.values(data.errors)[0][0]; // Toma el primer error del backend
          errorMessage = firstError;
        } else if (errorMessage.includes('SQLSTATE') || errorMessage.includes('Datatype mismatch')) {
          // Ocultar errores crudos de base de datos a los usuarios
          errorMessage = 'Ocurrió un error interno en el servidor al intentar guardar. Contacte al soporte técnico.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Datos inválidos',
          text: errorMessage,
          confirmButtonColor: '#c5a059'
        });
        setIsSubmitting(false);
        return;
      }

      Swal.fire('Éxito', 'Usuario guardado correctamente', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (_err) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
  // Prevent toggling active state for Administrador role
  if (user.role?.nombre?.toLowerCase() === 'administrador') {
    Swal.fire({
      icon: 'warning',
      title: 'Acción no permitida',
      text: 'El usuario administrador no puede ser desactivado.',
      confirmButtonColor: '#c5a059'
    });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ activo: !user.activo })
    });

    if (res.ok) {
      // Refresh data from server to reflect the new state
      await fetchData();
    } else {
      const err = await res.json();
      Swal.fire('Error', err.message || 'No se pudo cambiar el estado', 'error');
    }
  } catch (_err) {
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
        const res = await fetch(`${API_BASE}/api/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          Swal.fire('Eliminado', 'El usuario ha sido eliminado.', 'success');
          fetchData();
        }
      } catch (_err) {
        Swal.fire('Error', 'No se pudo eliminar el usuario', 'error');
      }
    }
  };

  return (
    <div className="usuarios-page">
      <Header title="Gestión de Usuarios" eyebrow="Administración del Sistema" hideLogos={true} />
      
      <main className="usuarios-container">
        <div className="usuarios-actions">
          <button className="btn-primary" onClick={() => handleOpenModal()} style={{ backgroundColor: '#c29b53', color: '#fff' }}>
            + Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '3rem', height: '3rem', borderWidth: '4px' }}></span>
            <p style={{ marginTop: '1rem', color: '#666', fontWeight: 'bold' }}>Cargando datos de usuarios...</p>
          </div>
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
                      <button                    className={`status-badge ${user.activo ? 'active' : 'inactive'}`}
                    disabled={togglingUserId === user.id}
                    onClick={() => {
                      setTogglingUserId(user.id);
                      handleToggleActive(user).finally(() => setTogglingUserId(null));
                    }}
                      >
                      {togglingUserId === user.id ? (
                        <><span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></span> Cambiando...</>
                      ) : (
                        user.activo ? 'Activo' : 'Inactivo'
                      )}
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
                <label>Nombre Completo (Ej. Juan Pérez)</label>
                <input 
                  type="text" 
                  value={formData.nombre_completo}
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                  required 
                  disabled={isSubmitting}
                  placeholder="Ingrese el nombre completo del empleado"
                />
              </div>
              <div className="form-group">
                <label>Nombre de Usuario (Para iniciar sesión)</label>
                <input 
                  type="text" 
                  value={formData.usuario}
                  onChange={e => setFormData({...formData, usuario: e.target.value})}
                  required 
                  disabled={isSubmitting}
                  placeholder="Ej. juanperez123"
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <label>Contraseña {formData.id && '(Dejar en blanco para mantener)'} <span style={{fontSize: '0.85em', color: '#666', fontWeight: 'normal'}}>- Mínimo 6 caracteres</span></label>
                <input 
                  type="password" 
                  value={formData.contrasena}
                  onChange={e => setFormData({...formData, contrasena: e.target.value})}
                  required={!formData.id} 
                  disabled={isSubmitting}
                  placeholder={formData.id ? "Nueva contraseña (opcional)" : "Mínimo 6 caracteres"}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select 
                  value={formData.rol_id}
                  onChange={e => setFormData({...formData, rol_id: e.target.value})}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '3px' }}></span> Guardando...</>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
