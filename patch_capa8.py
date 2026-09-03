import re

with open('frontend/src/pages/MesadeControl/UnitInfoPanelMesaControl.jsx', 'r') as f:
    content = f.read()

# Replace "Seleccione un conductor..." inside the span with "SELECCIONAR"
content = re.sub(r"\? conductoresDisponibles\.find\(c => c\.id == platConductor\)\?\.nombre \+ ` \(\$\{platConductor\}\)` : 'Seleccione un conductor\.\.\.'\}",
                 r"? conductoresDisponibles.find(c => c.id == platConductor)?.nombre + ` (${platConductor})` : 'SELECCIONAR'}", content)

content = re.sub(r"\{platRuta \|\| 'Seleccione una ruta\.\.\.'\}", r"{platRuta || 'SELECCIONAR'}", content)
content = re.sub(r"\{reemplazoForm\.ruta \|\| 'Seleccione una ruta\.\.\.'\}", r"{reemplazoForm.ruta || 'SELECCIONAR'}", content)


# Remove the "Seleccione un..." buttons from the top of the dropdowns
# The regex looks for <button ...> Seleccione una ruta... </button>
content = re.sub(r"<button\s+type=\"button\"\s+className=\"dropdown-menu__item[^\>]+>[^<]*Seleccione una ruta\.\.\.[^<]*</button>", "", content)
content = re.sub(r"<button\s+type=\"button\"\s+className=\"dropdown-menu__item[^\>]+>[^<]*Seleccione un conductor\.\.\.[^<]*</button>", "", content)

# Insert the capa 8 instructions after the dropdown menus
# We look for the closing div of the dropdown menu:
#       </div>
#     )}
#   </div>
# And replace with:
#       </div>
#     )}
#   </div>
#   <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>* Seleccione de la lista.</p>

# Actually, it's easier to just find the places manually. Let's do a simple replace on the string where we render the button:
with open('frontend/src/pages/MesadeControl/UnitInfoPanelMesaControl.jsx', 'w') as f:
    f.write(content)

