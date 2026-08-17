import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../../config/api';
import './FormularioBitacora.css';

const FormularioBitacora = ({ onClose = () => {}, onSave = () => {} }) => {
  const [formData, setFormData] = useState({
    corrida: '',
    ruta: '',
    unidad: '',
    cambio_1: '',
    cambio_2: '',
    cambio_3: '',
    cambio_4: '',
    id_vespertino: '',
    id_matutino: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [unidadesAgrupadas, setUnidadesAgrupadas] = useState([]);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const fetchTipo = async (tipo) => {
          const res = await fetch(`${API_BASE}/api/unidades/listar/${tipo}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) return { tipo: tipo.toUpperCase(), data: [] };
          const data = await res.json();
          return { 
            tipo: tipo.toUpperCase(), 
            data: data.filter(u => u.estatus === 'operacion') 
          };
        };

        const [urbanuss, zafiro, orion, vagoneta] = await Promise.all([
          fetchTipo('urbanuss'),
          fetchTipo('zafiro'),
          fetchTipo('orion'),
          fetchTipo('vagoneta')
        ]);

        setUnidadesAgrupadas([urbanuss, zafiro, orion, vagoneta]);
      } catch (err) {
        console.error('Error fetching unidades:', err);
      }
    };
    fetchUnidades();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto-fill corrida and ruta if unidad is selected
      if (name === 'unidad') {
        let selectedUnit = null;
        for (const grupo of unidadesAgrupadas) {
          const unit = grupo.data.find(u => u.numero_eco === value);
          if (unit) {
            selectedUnit = unit;
            break;
          }
        }
        
        if (selectedUnit) {
          if (selectedUnit.ruta) newData.ruta = selectedUnit.ruta;
          if (selectedUnit.corridas) newData.corrida = String(selectedUnit.corridas);
        }
      }
      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.unidad.trim()) newErrors.unidad = 'La unidad es obligatoria';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const endpoint = `${API_BASE}/api/bitacoras`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al guardar la bitácora');
      }

      const data = await response.json();
      Swal.fire('Éxito', 'Bitácora guardada correctamente.', 'success');
      if (onSave) onSave(data);
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.message || 'Ocurrió un error al guardar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Determine current selected unit type to filter rutas
  let selectedTipo = '';
  for (const grupo of unidadesAgrupadas) {
    if (grupo.data.some(u => u.numero_eco === formData.unidad)) {
      selectedTipo = grupo.tipo;
      break;
    }
  }

  const isTroncal = selectedTipo === 'URBANUSS';
  const isAlimentadora = selectedTipo && selectedTipo !== 'URBANUSS';

  return (
    <div className="bitacora-overlay">
      <div className="bitacora-modal">
        <div className="bitacora-header">
          <h1>Nueva Bitácora</h1>
          <button className="bitacora-close" onClick={onClose}>×</button>
        </div>

        <form className="bitacora-form" onSubmit={handleSubmit}>
          
          <div className="form-group-row">
            <div className="form-group">
              <label>Unidad Original</label>
              <select
                name="unidad"
                value={formData.unidad}
                onChange={handleChange}
                className={errors.unidad ? 'input-error' : ''}
                required
              >
                <option value="">Seleccionar unidad</option>
                {unidadesAgrupadas.map(grupo => (
                  grupo.data.length > 0 && (
                    <optgroup key={grupo.tipo} label={grupo.tipo}>
                      {grupo.data.map(u => (
                        <option key={u.numero_eco} value={u.numero_eco}>{u.numero_eco}</option>
                      ))}
                    </optgroup>
                  )
                ))}
              </select>
              {errors.unidad && <span className="error-message">{errors.unidad}</span>}
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Corrida</label>
              <input
                type="text"
                name="corrida"
                value={formData.corrida}
                onChange={handleChange}
                placeholder="Ej. 1, 2, 3..."
                required
              />
            </div>
            <div className="form-group">
              <label>Ruta (Troncal)</label>
              <select
                name="ruta"
                value={formData.ruta}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar ruta</option>
                {(!selectedTipo || isTroncal) && (
                  <optgroup label="Troncales">
                    <option value="T01">T01</option>
                    <option value="T02">T02</option>
                    <option value="T04">T04</option>
                    <option value="T05">T05</option>
                  </optgroup>
                )}
                {(!selectedTipo || isAlimentadora) && (
                  <optgroup label="Alimentadoras">
                    <option value="1A-MATILDE IDA">1A-MATILDE IDA</option>
                    <option value="1B-MATILDE REGRESO">1B-MATILDE REGRESO</option>
                    <option value="2A-SAN ALFONSO - MATILDE">2A-SAN ALFONSO - MATILDE</option>
                    <option value="2B-FRACC. VILLA FONTANA - JAGUEY T.">2B-FRACC. VILLA FONTANA - JAGUEY T.</option>
                    <option value="2D-PRIV. PORTOBELLO - TÉLLEZ">2D-PRIV. PORTOBELLO - TÉLLEZ</option>
                    <option value="2E-CETRAM TELLEZ - AMORES DE DON JUAN">2E-CETRAM TELLEZ - AMORES DE DON JUAN</option>
                    <option value="3-REAL DE TOLEDO - EFRÉN REBOLLEDO">3-REAL DE TOLEDO - EFRÉN REBOLLEDO</option>
                    <option value="4-FRACC. LOMAS DE PLATA - T. EDAD">4-FRACC. LOMAS DE PLATA - T. EDAD</option>
                    <option value="5- PARQUE URBANO - E.MEXICANO">5- PARQUE URBANO - E.MEXICANO</option>
                    <option value="6-HOGARES UNIÓN - E. MEXICANO">6-HOGARES UNIÓN - E. MEXICANO</option>
                    <option value="7-RANCHO LA COLONIA - E. F. ÁNGELES">7-RANCHO LA COLONIA - E. F. ÁNGELES</option>
                    <option value="8-LOS TUZOS - E. JUAN C. DORIA">8-LOS TUZOS - E. JUAN C. DORIA</option>
                    <option value="9-PITAHAYAS - E. C. JUSTICIA">9-PITAHAYAS - E. C. JUSTICIA</option>
                    <option value="10-PASEO DE CAMELINAS - E. C. JUSTICIA">10-PASEO DE CAMELINAS - E. C. JUSTICIA</option>
                    <option value="11-EL HUIXMÍ - E. C. JUSTICIA">11-EL HUIXMÍ - E. C. JUSTICIA</option>
                    <option value="12-LA COLONIA - E. JUAN C. DORIA">12-LA COLONIA - E. JUAN C. DORIA</option>
                    <option value="13-EL VENADO - E. HOSPITALES">13-EL VENADO - E. HOSPITALES</option>
                    <option value="14-SAN PEDRO NOPALCALCO - E. BICENTENARIO">14-SAN PEDRO NOPALCALCO - E. BICENTENARIO</option>
                    <option value="15A-LA LOMA-CENTRAL DE AUTOBUSES">15A-LA LOMA-CENTRAL DE AUTOBUSES</option>
                    <option value="15B-ABETOS - E. C. DE AUTOBUSES">15B-ABETOS - E. C. DE AUTOBUSES</option>
                    <option value="15C-FRACC. COLOSIO - E. C. DE AUTOBUSES">15C-FRACC. COLOSIO - E. C. DE AUTOBUSES</option>
                    <option value="16-SAN CARLOS - E. ZONA PLATEADA">16-SAN CARLOS - E. ZONA PLATEADA</option>
                    <option value="17-TEZONTLE - AV. UNIVERSIDAD">17-TEZONTLE - AV. UNIVERSIDAD</option>
                    <option value="19-PARQUE DE POBLAMIENTO 1 Y 2">19-PARQUE DE POBLAMIENTO 1 Y 2</option>
                    <option value="20B-RUTA INCLUYENTE PONIENTE - ORIENTE">20B-RUTA INCLUYENTE PONIENTE - ORIENTE</option>
                  </optgroup>
                )}
              </select>
            </div>
          </div>



          <div className="form-group-row">
            <div className="form-group">
              <label>Cambio 1</label>
              <input
                type="text"
                name="cambio_1"
                value={formData.cambio_1}
                onChange={handleChange}
                placeholder="No. Eco"
              />
            </div>
            <div className="form-group">
              <label>Cambio 2</label>
              <input
                type="text"
                name="cambio_2"
                value={formData.cambio_2}
                onChange={handleChange}
                placeholder="No. Eco"
              />
            </div>
          </div>
          
          <div className="form-group-row">
            <div className="form-group">
              <label>Cambio 3</label>
              <input
                type="text"
                name="cambio_3"
                value={formData.cambio_3}
                onChange={handleChange}
                placeholder="No. Eco"
              />
            </div>
            <div className="form-group">
              <label>Cambio 4</label>
              <input
                type="text"
                name="cambio_4"
                value={formData.cambio_4}
                onChange={handleChange}
                placeholder="No. Eco"
              />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>ID Matutino</label>
              <input
                type="text"
                name="id_matutino"
                value={formData.id_matutino}
                onChange={handleChange}
                placeholder="Ej: ID Matutino"
              />
            </div>
            <div className="form-group">
              <label>ID Vespertino</label>
              <input
                type="text"
                name="id_vespertino"
                value={formData.id_vespertino}
                onChange={handleChange}
                placeholder="Ej: ID Vespertino"
              />
            </div>
          </div>

          <div className="bitacora-actions">
            <button type="button" className="bitacora-btn bitacora-btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bitacora-btn bitacora-btn--primary" disabled={loading}>
              {loading ? <span className="bitacora-spinner"></span> : null}
              {loading ? 'Guardando...' : 'Guardar Bitácora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioBitacora;