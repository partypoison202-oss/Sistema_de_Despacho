import re

with open('frontend/src/pages/MesadeControl/UnitInfoPanelMesaControl.jsx', 'r') as f:
    content = f.read()

# Add instruction to Conductor dropdowns
content = re.sub(
    r"(\{\s*(?:platConductorDropdown|dropdownOperadorOpen)\s*&&\s*\([\s\S]*?</div>\s*\)\s*\})\s*</div>",
    r"\1\n                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>* Seleccione un conductor de la lista.</p>\n                </div>",
    content
)

# Add instruction to Ruta dropdowns
content = re.sub(
    r"(\{\s*(?:platRutaDropdown|dropdownRutaOpen)\s*&&\s*\([\s\S]*?</div>\s*\)\s*\})\s*</div>",
    r"\1\n                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>* Seleccione una ruta de la lista.</p>\n                </div>",
    content
)

# Add instruction to Unidad Reserva dropdowns
content = re.sub(
    r"(\{\s*dropdownEcoOpen\s*&&\s*\([\s\S]*?</div>\s*\)\s*\})\s*</div>",
    r"\1\n                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>* Seleccione una unidad de la lista.</p>\n                </div>",
    content
)

# Ensure "Seleccione una unidad en reserva..." is SELECCIONAR
content = re.sub(r"\{unidadReemplazoSeleccionada \? unidadReemplazoSeleccionada\.display : 'Seleccione una unidad en reserva\.\.\.'\}", r"{unidadReemplazoSeleccionada ? unidadReemplazoSeleccionada.display : 'SELECCIONAR'}", content)

with open('frontend/src/pages/MesadeControl/UnitInfoPanelMesaControl.jsx', 'w') as f:
    f.write(content)

