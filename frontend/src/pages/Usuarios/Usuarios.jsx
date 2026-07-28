import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import './Usuarios.css';
import API_BASE from '../../config/api';

export default function Usuarios() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    nombre_completo: '',
    usuario: '',
    contrasena: '',
    rol_id: '',
    foto_url: null, // URL de la foto actual (para edición)
  });

  // Estado para la imagen seleccionada (archivo y previsualización)
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const formatRoleName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/users/roles`, { headers: { Authorization: `Bearer ${token}` } }),
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

  // Manejar apertura del modal (edición o creación)
  const handleOpenModal = (user = null) => {
    if (user) {
      setFormData({
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        contrasena: '', // No mostrar contraseña
        rol_id: user.rol_id,
        foto_url: user.foto_url || null, // Cargar foto existente
      });
      // Si hay foto, mostrarla como previsualización (opcional)
      if (user.foto_url) {
        setPreviewUrl(user.foto_url);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setFormData({
        id: null,
        nombre_completo: '',
        usuario: '',
        contrasena: '',
        rol_id: '',
        foto_url: null,
      });
      setPreviewUrl(null);
    }
    setSelectedFile(null); // Limpiar archivo seleccionado
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Manejar cierre del modal (limpieza)
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    // Liberar la URL de previsualización si fue creada con createObjectURL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  // Manejar cambio de archivo (input file)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo y tamaño (opcional, puedes hacerlo también en el backend)
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: 'warning',
          title: 'Formato no soportado',
          text: 'Solo se permiten imágenes JPG, PNG, GIF o WEBP.',
          confirmButtonColor: '#c5a059',
        });
        e.target.value = ''; // Limpiar input
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'Archivo demasiado grande',
          text: 'El tamaño máximo permitido es 2 MB.',
          confirmButtonColor: '#c5a059',
        });
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      // Crear URL para previsualización
      const objectUrl = URL.createObjectURL(file);
      // Si ya había una previsualización de blob, revocarla
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(objectUrl);
    } else {
      setSelectedFile(null);
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      // Si estábamos editando y teníamos foto guardada, mantenerla
      if (formData.foto_url) {
        setPreviewUrl(formData.foto_url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUsernameChange = (e) => {
    // Forzar minúsculas y sin espacios para evitar errores de capa 8
    const val = e.target.value.replace(/\s+/g, '').toLowerCase();
    setFormData({ ...formData, usuario: val });
  };

  // Envío del formulario (con FormData)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const url = formData.id
      ? `${API_BASE}/api/users/${formData.id}`
      : `${API_BASE}/api/users`;
    
    // PHP/Laravel no procesa multipart/form-data nativamente en solicitudes PUT.
    // Usamos el método POST real y agregamos '_method=PUT' para spoofing en Laravel.
    const method = 'POST';

    // Construir FormData
    const formDataToSend = new FormData();
    formDataToSend.append('nombre_completo', formData.nombre_completo);
    formDataToSend.append('usuario', formData.usuario);
    if (formData.contrasena) {
      formDataToSend.append('contrasena', formData.contrasena);
    }
    formDataToSend.append('rol_id', formData.rol_id);

    // Si se seleccionó un archivo, lo agregamos
    if (selectedFile) {
      formDataToSend.append('foto', selectedFile); // Nombre del campo esperado en el backend
    }

    if (formData.id) {
      formDataToSend.append('_method', 'PUT'); // Emulación de PUT en Laravel
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          // No incluir 'Content-Type' para que el navegador lo ponga con el boundary
        },
        body: formDataToSend,
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = data.message || 'Error al guardar el usuario';
        // Si hay errores de validación (Laravel HTTP 422)
        if (data.errors) {
          const firstError = Object.values(data.errors)[0][0];
          errorMessage = firstError;
        } else if (errorMessage.includes('SQLSTATE') || errorMessage.includes('Datatype mismatch')) {
          errorMessage =
            'Ocurrió un error interno en el servidor al intentar guardar. Contacte al soporte técnico.';
        }
        Swal.fire({
          icon: 'error',
          title: 'Datos inválidos',
          text: errorMessage,
          confirmButtonColor: '#c5a059',
        });
        setIsSubmitting(false);
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Usuario guardado',
        html: !formData.id
          ? `El usuario <b>${formData.usuario}</b> ha sido creado.<br/><br/>Contraseña de acceso: <b>${formData.contrasena}</b><br/><br/><small style="color: #666;">Copia estas credenciales y envíalas al empleado.</small>`
          : 'Los datos del usuario han sido actualizados.',
        confirmButtonColor: '#c5a059',
      });

      // Cerrar modal y limpiar estados
      handleCloseModal();
      fetchData(); // Refrescar la tabla
    } catch (_err) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambiar estado activo/inactivo
  const handleToggleActive = async (user) => {
    if (user.role?.nombre?.toLowerCase() === 'administrador') {
      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'El usuario administrador no puede ser desactivado.',
        confirmButtonColor: '#c5a059',
      });
      return;
    }

    if (user.activo) {
      const result = await Swal.fire({
        title: '¿Dar de baja a este usuario?',
        text: `¿Estás seguro que deseas poner inactivo a ${user.nombre_completo || user.usuario}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#c5a059',
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar',
      });
      if (!result.isConfirmed) return;
    } else {
      const result = await Swal.fire({
        title: '¿Reactivar a este usuario?',
        text: `¿Estás seguro que deseas poner activo nuevamente a ${user.nombre_completo || user.usuario}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#c5a059',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, reactivar',
        cancelButtonText: 'Cancelar',
      });
      if (!result.isConfirmed) return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ activo: !user.activo }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'No se pudo cambiar el estado', 'error');
      }
    } catch (_err) {
      Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
    }
  };

  // Eliminar usuario
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_BASE}/api/users/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
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

  // Filtrado y ordenamiento de usuarios
  const filteredUsers = users
    .filter(
      (user) =>
        user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const isAdminA = a.role?.nombre?.toLowerCase() === 'administrador';
      const isAdminB = b.role?.nombre?.toLowerCase() === 'administrador';

      if (isAdminA && !isAdminB) return -1;
      if (!isAdminA && isAdminB) return 1;

      if (a.activo && !b.activo) return -1;
      if (!a.activo && b.activo) return 1;

      return a.nombre_completo.localeCompare(b.nombre_completo);
    });

  // Validación del formulario
  const isFormValid =
    formData.nombre_completo.trim() !== '' &&
    formData.usuario.trim() !== '' &&
    formData.rol_id !== '' &&
    (formData.id || formData.contrasena.length >= 6);

  return (
    <div className="usuarios-page">
      <Header title="Gestión de Usuarios" eyebrow="Administración del Sistema" hideLogos={true} />

      <main className="usuarios-container">
        <div className="usuarios-header-actions">
          <div className="search-container">
            <svg
              className="search-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, usuario o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="usuarios-actions">
            <button
              className="btn-primary"
              onClick={() => handleOpenModal()}
              style={{ backgroundColor: '#c29b53', color: '#fff' }}
            >
              + Nuevo Usuario
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span
              className="spinner"
              style={{
                borderColor: 'rgba(96, 26, 42, 0.2)',
                borderTopColor: 'var(--color-maroon)',
                width: '3rem',
                height: '3rem',
                borderWidth: '4px',
              }}
            ></span>
            <p style={{ marginTop: '1rem', color: '#666', fontWeight: 'bold' }}>
              Cargando datos de usuarios...
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Foto {/* Nueva columna */}</th>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre_completo} size={40} />
                      </td>
                      <td>{user.nombre_completo}</td>
                      <td>{user.usuario}</td>
                      <td>
                        <span className="role-badge">{formatRoleName(user.role?.nombre)}</span>
                      </td>
                      <td>
                        <button
                          className={`status-badge ${user.activo ? 'active' : 'inactive'}`}
                          disabled={togglingUserId === user.id}
                          onClick={() => {
                            setTogglingUserId(user.id);
                            handleToggleActive(user).finally(() => setTogglingUserId(null));
                          }}
                        >
                          {togglingUserId === user.id ? (
                            <>
                              <span
                                className="spinner"
                                style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}
                              ></span>{' '}
                              Cambiando...
                            </>
                          ) : user.activo ? (
                            'Activo'
                          ) : (
                            'Inactivo'
                          )}
                        </button>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon-action btn-icon-edit"
                          onClick={() => handleOpenModal(user)}
                          title="Editar"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          className="btn-icon-action btn-icon-delete"
                          onClick={() => handleDelete(user.id)}
                          title="Eliminar"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de creación/edición */}
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
                  onChange={(e) =>
                    setFormData({ ...formData, nombre_completo: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                  placeholder="Ej. Juan Pérez"
                />
                <span className="form-hint">Nombre real del empleado.</span>
              </div>

              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input
                  type="text"
                  value={formData.usuario}
                  onChange={handleUsernameChange}
                  required
                  disabled={isSubmitting}
                  placeholder="Ej. juanperez"
                  autoComplete="username"
                />
                <span className="form-hint">
                  Se usará para iniciar sesión. Sin espacios y en minúsculas.
                </span>
              </div>

              <div className="form-group">
                <label>Contraseña {formData.id && '(Opcional para mantener la actual)'}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.contrasena}
                    onChange={(e) =>
                      setFormData({ ...formData, contrasena: e.target.value })
                    }
                    required={!formData.id}
                    disabled={isSubmitting}
                    placeholder={
                      formData.id ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'
                    }
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <span
                  className="form-hint"
                  style={{
                    color:
                      formData.contrasena && formData.contrasena.length < 6 ? 'red' : 'inherit',
                  }}
                >
                  Debe contener al menos 6 caracteres.
                </span>
              </div>

              <div className="form-group">
                <label>Rol</label>
                <select
                  value={formData.rol_id}
                  onChange={(e) => setFormData({ ...formData, rol_id: e.target.value })}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {formatRoleName(role.nombre)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo para foto de perfil */}
              <div className="form-group">
                <label>Foto de perfil</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                {previewUrl && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      style={{
                        maxWidth: '100px',
                        maxHeight: '100px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                )}
                <span className="form-hint">Formatos: JPG, PNG, GIF, WEBP (máx. 2 MB)</span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isSubmitting || !isFormValid}
                  style={{ opacity: !isFormValid || isSubmitting ? 0.6 : 1 }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner"
                        style={{ width: '1.2rem', height: '1.2rem', borderWidth: '3px' }}
                      ></span>{' '}
                      Guardando...
                    </>
                  ) : (
                    'Guardar Usuario'
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