# ABAP SQL Reference for ADT Freestyle Queries

ABAP SQL is **different from standard SQL**. The freestyle endpoint (`/sap/bc/adt/datapreview/freestyle`) has specific rules.

---

## Row Limiting

Do NOT use `LIMIT`, `TOP N`, or `UP TO N ROWS` in the query text. Row count is controlled by the `--max-rows` CLI argument (maps to `rowNumber` HTTP parameter).

---

## Key Syntax Differences from Standard SQL

| Feature | Standard SQL | ABAP SQL |
|---------|-------------|----------|
| Sort order | `ORDER BY col DESC` | `ORDER BY col DESCENDING` |
| Sort order | `ORDER BY col ASC` | `ORDER BY col ASCENDING` |
| Column qualifier | `table.column` | `table~column` (tilde!) |
| Row limit | `LIMIT N` / `TOP N` | Use `--max-rows` parameter |
| Pattern escape | `\` | `#` (e.g., `LIKE '%#_%' ESCAPE '#'`) |
| Boolean true | `TRUE` | `'X'` |
| Boolean false | `FALSE` | `' '` or `''` |
| Statement end | `;` | No semicolons |
| INTO clause | Standard | Not needed (endpoint handles it) |

---

## Supported Features with Examples

### Basic SELECT

```sql
SELECT * FROM ZAI_T_CONFIG
SELECT col1, col2, col3 FROM mytable
SELECT DISTINCT col1 FROM mytable
```

### WHERE Clause

```sql
WHERE col = 'value'
WHERE col LIKE '%pattern%'
WHERE col BETWEEN 10 AND 20
WHERE col IN ('A', 'B', 'C')
WHERE col IS NULL
WHERE col IS NOT NULL
```

### ORDER BY (use ASCENDING/DESCENDING, not ASC/DESC)

```sql
ORDER BY col1 DESCENDING
ORDER BY col1 ASCENDING, col2 DESCENDING
```

### Aggregations + GROUP BY

```sql
SELECT carrid, COUNT( * ) AS cnt, SUM( price ) AS total
  FROM sflight GROUP BY carrid HAVING COUNT( * ) > 5
```

### JOINs (use tilde for column qualification)

```sql
SELECT a~col1, b~col2 FROM table1 AS a
  INNER JOIN table2 AS b ON a~id = b~id
```

### CASE Expressions

```sql
SELECT CASE WHEN amount < 100 THEN 'Low' ELSE 'High' END AS category FROM mytable
```

### Subqueries (max 9 nested)

```sql
SELECT * FROM sflight WHERE carrid IN ( SELECT carrid FROM scarr )
```

### UNION (ABAP 7.50+)

```sql
SELECT col1 FROM table1 UNION ALL SELECT col1 FROM table2
```

---

## Script Output Formats

Both `run_sql_query.py` and `run_data_preview.py` support:

| Argument | Values | Description |
|----------|--------|-------------|
| `--format` | `table` (default), `json`, `csv` | Output format |
| `--max-col-width` | Integer (default: 50) | Max column width in table mode |
| `--columns` | `COL1,COL2,...` | Comma-separated column filter |
| `--where` | SQL condition | WHERE clause filter (`run_data_preview.py` only) |

### Choosing the Right Output

- **User asks to see/show/read rows:** Use `--max-col-width 9999` or `--format json` for full content
- **User asks to list/check/overview:** Default truncation (`--max-col-width 50`) is fine
- **Wide text columns** (RESPONSE, QUERY): Use `--format json` or `--columns` to select specific fields

---

## Quick Examples

```bash
# Basic query (table format)
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_CONFIG" --max-rows 10 --cwd "C:\project"

# JSON output
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_sql_query.py --query "SELECT * FROM ZAI_T_CONFIG" --max-rows 10 --format json --cwd "C:\project"

# Data preview with WHERE filter
cd "${SAP_ADT_SCRIPTS_DIR}" && python run_data_preview.py --object-name ZAI_T_HISTORY --max-rows 5 --where "MODEL = 'gpt-5.2-chat'" --format table --cwd "C:\project"
```
