import re

with open('frontend/src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx', 'r') as f:
    content = f.read()

start_marker = '<h3 className="info-card__title">Servicio Activo</h3>\n          </div>\n          <div className="info-card__body">'
end_marker = '{/* CARD 2: DETALLES DE DESPACHO (EXCEL) */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    exit(1)
    
start_idx += len(start_marker)

# We want to extract the content up to the closing divs of info-card__body
body_content = content[start_idx:end_idx]

# The blocks start with {/* 1. Conductor Asignado */}, {/* 2. Número de Tarjetón (Editable) */}, etc.
p1 = body_content.find('{/* 1. Conductor Asignado */}')
p2 = body_content.find('{/* 2. Número de Tarjetón (Editable) */}')
p3 = body_content.find('{/* 3. Corrida */}')
p4 = body_content.find('{/* 4. Ruta Asignada */}')

# Find the end of p4 (it ends before the last two closing divs: </div> </div>)
# Actually, we can just find the last </div>
closing_idx = body_content.rfind('</div>\n          </div>\n        </div>')

if closing_idx == -1:
    # Try another matching
    closing_idx = body_content.rfind('</div>\n          </div>')

# Let's just slice them using the positions
b1 = body_content[p1:p2]
b2 = body_content[p2:p3]
b3 = body_content[p3:p4]
b4 = body_content[p4:closing_idx]
remainder = body_content[closing_idx:]

# Fix Margins!
# Current order: 1 (no margin), 2 (no margin), 3 (marginTop: 0.85rem), 4 (marginTop: 0.85rem)
# Desired order: 
# Tarjeton (no margin)
# Conductor (marginTop: 0.85rem)
# Ruta (marginTop: 0.85rem)
# Corrida (marginTop: 0.85rem)

# 1. Conductor Asignado:
b1 = b1.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>')
# 2. Tarjetón:
b2 = b2.replace('<div className="info-card__item">', '<div className="info-card__item">') # keep no margin
# 3. Corrida:
# already has marginTop: 0.85rem
# 4. Ruta Asignada:
# already has marginTop: 0.85rem

# New order: Tarjeton, Conductor, Ruta, Corrida
# Note: the spaces before the comments might be messed up if we don't pad them correctly.
# Each block starts with a comment.
# Let's ensure proper spacing.
# Actually they all start with a newline and spaces.

new_body_content = "\n            " + b2.strip() + "\n\n            " + b1.strip() + "\n\n            " + b4.strip() + "\n\n            " + b3.strip() + "\n" + remainder

new_content = content[:start_idx] + new_body_content + content[end_idx:]

with open('frontend/src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx', 'w') as f:
    f.write(new_content)

print("Reorder successful!")
