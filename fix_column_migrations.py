import os
import re

migrations_dir = "laravel-api/database/migrations"

# These methods add columns to existing tables (NOT drop, rename, index, etc.)
ADD_COLUMN_METHODS = [
    "boolean", "string", "text", "longText", "mediumText", "tinyText",
    "integer", "bigInteger", "unsignedBigInteger", "unsignedInteger",
    "tinyInteger", "smallInteger", "mediumInteger",
    "float", "double", "decimal",
    "date", "time", "dateTime", "timestamp",
    "json", "jsonb", "uuid", "enum", "char",
    "binary", "ipAddress", "macAddress", "year",
    "morphs", "nullableMorphs", "uuidMorphs",
]

# Pattern to match $table->someMethod('colname', ...)
# We only want lines that ADD columns (not drop, rename, index, etc.)
COL_PATTERN = re.compile(
    r"(\s+)\$table->(" + "|".join(ADD_COLUMN_METHODS) + r")\('([^']+)'([^;]*)\)([^;]*);",
)


def wrap_with_has_column(content):
    """Wraps each addColumn call in Schema::table closures with hasColumn checks."""
    lines = content.split("\n")
    result = []
    inside_schema_table = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Detect Schema::table opening
        if "Schema::table(" in line and "function (Blueprint $table)" in line:
            inside_schema_table = True
            result.append(line)
            i += 1
            continue

        # Detect closure closing })
        if inside_schema_table and re.match(r"\s*\}\);", line):
            inside_schema_table = False
            result.append(line)
            i += 1
            continue

        # Inside a Schema::table block, wrap column additions
        if inside_schema_table:
            m = COL_PATTERN.match(line)
            if m:
                indent = m.group(1)
                method = m.group(2)
                col_name = m.group(3)
                rest_args = m.group(4)
                modifiers = m.group(5)

                full_stmt = f"{indent}$table->{method}('{col_name}'{rest_args}){modifiers};"
                wrapped = (
                    f"{indent}if (!Schema::hasColumn($table->getTable(), '{col_name}')) {{\n"
                    f"{indent}    $table->{method}('{col_name}'{rest_args}){modifiers};\n"
                    f"{indent}}}"
                )
                result.append(wrapped)
                i += 1
                continue

        result.append(line)
        i += 1

    return "\n".join(result)


fixed_count = 0
for filename in sorted(os.listdir(migrations_dir)):
    if not filename.endswith(".php"):
        continue
    filepath = os.path.join(migrations_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Skip if already has hasColumn OR has no Schema::table
    if "Schema::hasColumn" in content or "Schema::table" not in content:
        continue

    new_content = wrap_with_has_column(content)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed: {filename}")
        fixed_count += 1

print(f"\nTotal fixed: {fixed_count} migrations")
