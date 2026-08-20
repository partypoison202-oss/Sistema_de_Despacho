import os
import re

mdir = "laravel-api/database/migrations"
files = sorted(os.listdir(mdir))

tables_created = {}  # table -> [migration_files]
tables_altered = {}  # table -> [migration_files]

for f in files:
    path = os.path.join(mdir, f)
    content = open(path, encoding="utf-8").read()
    creates = re.findall(r"Schema::create\('([^']+)'", content)
    alters  = re.findall(r"Schema::table\('([^']+)'", content)
    for t in creates:
        tables_created.setdefault(t, []).append(f)
    for t in alters:
        tables_altered.setdefault(t, []).append(f)

print("=== TABLAS CREADAS (Schema::create) ===")
for t, files_list in sorted(tables_created.items()):
    flag = " <-- DUPLICADO" if len(files_list) > 1 else ""
    print(f"  {t}: {len(files_list)} vez(ces){flag}")
    for mf in files_list:
        print(f"      {mf}")

print("\n=== TABLAS CON ALTER (Schema::table) ===")
for t, files_list in sorted(tables_altered.items()):
    print(f"  {t}: modificada en {len(files_list)} migracion(es)")
    for mf in files_list:
        print(f"      {mf}")
