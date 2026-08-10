import re

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'r') as f:
    content = f.read()

# Define the start markers
body_start = '<div className="info-card__body">'

# We will use regex to extract the 4 blocks
conductor_regex = re.compile(r'(<div className="info-card__item">\s*<span className="info-card__label">Conductor Asignado</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
ruta_regex = re.compile(r'(<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>\s*<span className="info-card__label">Ruta Asignada</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
tarjeton_regex = re.compile(r'(<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>\s*<span className="info-card__label">Número de Tarjetón</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)
corrida_regex = re.compile(r'(<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>\s*<span className="info-card__label">Corrida</span>.*?</div>\s*</div>\s*</div>\s*)', re.DOTALL)

# Extract them
c_match = conductor_regex.search(content)
r_match = ruta_regex.search(content)
t_match = tarjeton_regex.search(content)
co_match = corrida_regex.search(content)

c_block = c_match.group(1)
r_block = r_match.group(1)
t_block = t_match.group(1)
co_block = co_match.group(1)

# Remove them from the original content body
# Be careful: we only want to replace them inside info-card__body
# Actually, they are unique enough that we can just replace them with empty string in the whole file
new_content = content.replace(c_block, '').replace(r_block, '').replace(t_block, '').replace(co_block, '')

# Now find where to insert them back
# We insert them right after <div className="info-card__body">
insert_pos = new_content.find(body_start) + len(body_start) + 1

# Adjust styles for first item vs others
t_block = t_block.replace('style={{ marginTop: \'0.85rem\' }}', '', 1) # first
c_block = c_block.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>', 1)

# New order: Tarjeton, Conductor, Corrida, Ruta
combined_blocks = t_block + c_block + co_block + r_block

final_content = new_content[:insert_pos] + combined_blocks + new_content[insert_pos:]

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'w') as f:
    f.write(final_content)

print("Reordered successfully!")
