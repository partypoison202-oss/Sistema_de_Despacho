import os
import re

migrations_dir = "laravel-api/database/migrations"
for filename in os.listdir(migrations_dir):
    if not filename.endswith(".php"): continue
    filepath = os.path.join(migrations_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    
    def replace_create(match):
        table_name = match.group(1)
        body = match.group(2)
        return f"if (!Schema::hasTable('{table_name}')) {{\n            Schema::create('{table_name}', function (Blueprint $table) {{{body}}});\n        }}"

    if "Schema::hasTable" not in content:
        content = re.sub(r"Schema::create\('([^']+)',\s*function\s*\(Blueprint\s+\$table\)\s*\{(.*?)\}\);", replace_create, content, flags=re.DOTALL)

    if content != original_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filename}")
