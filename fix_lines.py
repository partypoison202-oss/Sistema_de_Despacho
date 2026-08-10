with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'r') as f:
    lines = f.readlines()

c_block = lines[1267:1279]
r_block = lines[1279:1382]
t_block = lines[1382:1510]
co_block = lines[1510:1524]

def to_str(block):
    return "".join(block)

c_str = to_str(c_block)
r_str = to_str(r_block)
t_str = to_str(t_block)
co_str = to_str(co_block)

t_str = t_str.replace('style={{ marginTop: \'0.85rem\' }}', '', 1)
c_str = c_str.replace('<div className="info-card__item">', '<div className="info-card__item" style={{ marginTop: \'0.85rem\' }}>')

combined = t_str + c_str + r_str + co_str

new_lines = lines[:1267] + [combined] + lines[1524:]
final_content = "".join(new_lines)

final_content = final_content.replace('Hora de Acople', 'Hora de Desincorporación')
final_content = final_content.replace('Hora de acople registrada.', 'Hora de desincorporación registrada.')

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'w') as f:
    f.write(final_content)

print("Line-based reorder done!")
