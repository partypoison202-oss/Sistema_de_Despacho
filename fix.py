import re

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'r') as f:
    content = f.read()

body_regex = re.compile(r'(<div className="info-card__body">)(.*?)(<div className="info-card">\s*<div className="info-card__header">)', re.DOTALL)
body_match = body_regex.search(content)

if not body_match:
    print("Not found")
    exit(1)

body_inner = body_match.group(2)

c_regex = re.compile(r'(<div className="info-card__item".*?>\s*<span className="info-card__label">Conductor Asignado</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
r_regex = re.compile(r'(<div className="info-card__item".*?>\s*<span className="info-card__label">Ruta Asignada</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
t_regex = re.compile(r'(<div className="info-card__item".*?>\s*<span className="info-card__label">Número de Tarjetón</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
co_regex = re.compile(r'(<div className="info-card__item".*?>\s*<span className="info-card__label">Corrida</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)

c_block = c_regex.search(body_inner).group(1)
r_block = r_regex.search(body_inner).group(1)
t_block = t_regex.search(body_inner).group(1)
co_block = co_regex.search(body_inner).group(1)

# Clean out existing style={{ marginTop: '0.85rem' }} just to be safe
c_block = c_block.replace(' style={{ marginTop: \'0.85rem\' }}', '')
r_block = r_block.replace(' style={{ marginTop: \'0.85rem\' }}', '')
t_block = t_block.replace(' style={{ marginTop: \'0.85rem\' }}', '')
co_block = co_block.replace(' style={{ marginTop: \'0.85rem\' }}', '')

# Apply new margins
c_block = c_block.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>')
r_block = r_block.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>')
co_block = co_block.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>')

# COMBINE
new_inner = "\n" + t_block + c_block + r_block + co_block

new_content = content[:body_match.start(2)] + new_inner + content[body_match.end(2):]

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'w') as f:
    f.write(new_content)

print("Done properly!")
