import re
with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'r') as f:
    content = f.read()

# Conflict 1: simple addition from origin/main
content = re.sub(r'<<<<<<< HEAD\n=======\n(.*?)\n>>>>>>> origin/main', r'\1', content, flags=re.DOTALL)

# Conflict 2: esAlimentadora vs useMemo
c2_regex = re.compile(r'<<<<<<< HEAD\n(.*?esAlimentadora.*?)\n=======\n(.*?)>>>>>>> origin/main', re.DOTALL)
def c2_replace(match):
    es_al_line = [line for line in match.group(1).split('\n') if 'esAlimentadora =' in line]
    es_al = es_al_line[0] if es_al_line else ""
    return es_al + "\n" + match.group(2)
content = c2_regex.sub(c2_replace, content)

# Conflict 3: Swal text vs queryClient update
c3_regex = re.compile(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/main', re.DOTALL)
def c3_replace(match):
    res = match.group(2).replace('Hora de acople registrada.', 'Hora de desincorporación registrada.')
    return res
content = c3_regex.sub(c3_replace, content)

with open('frontend/src/pages/Encierro/DetalleUnidadEncierro.jsx', 'w') as f:
    f.write(content)

