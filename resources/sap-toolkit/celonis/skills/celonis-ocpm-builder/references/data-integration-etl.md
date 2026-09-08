# Data Integration: ETL & Extraction

## data-integration/etl/etl-engine

# ETL Engine

The Celonis ETL Engine transforms your raw source data into Data Models for use in the Celonis Platform. This engine is built state-of-the-art cloud-native technologies and improves the latency for extractions, transformations, and data model loads. The benefits of this engine includes higher data volume processing and increased data freshness. Through horizontal scaling and elasticity improvements, you can get more value out of Celonis by scaling your use cases or adding new ones, without impacting the latency of your existing implementations.

## How the ETL Engine works

The ETL Engine is not directly exposed or represented in the Celonis Platform UI. You interact with it by writing SQL transformations and running them in the Extractions Editor or through your data jobs.

For an overview of the SQL syntax used with the ETL Engine, see: [ETL Engine SQL Syntax](etl-engine-sql.html "ETL Engine SQL Syntax").

The ETL Engine is involved in all three steps of the Celonis data pipeline:

- **Extractions**: Data is ingested into the Celonis Platform and stored there.
- **Transformations**: The ETL Engine transforms the data into objects and event data using SQL transformations.
- **Data Model loads**: A data model (perspective) is built from the object and events and exported from the data platform before being loaded into the Process Query Engine.

The following illustration visualizes the Celonis data pipeline from a functional architecture and where the ETL engine is located:

## Benefits of using the ETL Engine

The benefits of using the ETL Engine include:

- **Load responsiveness**: Ensure optimal performance and maintain it at peak times.
- **Predictable latencies**: Seamlessly accommodate growing data volumes and changing analytical needs. Add new use cases or scale existing ones while keeping predictable and stable data pipeline runtimes for all your Celonis use cases.
- **Large data volumes**: Run ETL workloads for large data volumes with billions of records in new record times (confirmed by internal benchmarks).
- **Lowest latencies**: Fast data processing, enabling near real-time data refresh rates, and enabling operational Celonis use cases.


---

## data-integration/etl/etl-engine-best-practice

# ETL Engine best practice

When writing ETL Engine SQL, consider the following best practice:

Expand all

[## Basic efficiency: DISTINCT & UNION](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394097634163_body)

**Goal**: Avoid accidental data shuffles.

In distributed systems like Spark, removing duplicates is expensive because it requires moving data across the network (Shuffle) to compare rows.

### DISTINCT

- **The issue**: `SELECT DISTINCT` forces a huge shuffle of your entire dataset.
- **Best practice**: Only use `DISTINCT` if you have verified that duplicates actually exist. Never use it "just in case."

### UNION vs. UNION ALL

**UNION**: Appends data `AND` removes duplicates. (Slow: Requires Shuffle).

- **Best practice:** Fast append. Handle duplicates later only if needed.

  ```
  SELECT * FROM table_A
  UNION ALL
  SELECT * FROM table_B;
  ```
- **Avoid this**: Triggers a heavy shuffle to check for duplicates

  ```
  SELECT * FROM table_A
  UNION
  SELECT * FROM table_B;
  ```

[## Column selection: Avoid SELECT \*](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394126406192_body)

**Goal**: Reduce the amount of data Spark reads from the disk.

Spark uses **Columnar Storage** (Parquet/Delta). This means every column is stored separately on the hard drive.

- **Best practice**: `SELECT id`, status (Reads only the files you need).
- **Avoid this**: `SELECT *` (Reads every single column file, even unused ones).

[## Filtering: LEFT ANTI JOIN vs. NOT IN](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394126498939_body)

**Goal**: Filter out rows that exist in another table (e.g., "Get customers who have never placed an order").

- **Best practice**: Both of the following methods are safe and efficient. Spark's optimizer (Catalyst) converts `NOT EXISTS` into the same efficient execution plan (Anti Join) as the explicit join syntax. Spark reads the Left table (Customers) and attempts to find a match in the Right table (Orders). If a match is found, the row is discarded. If no match is found, the row is kept. This process is highly optimized and ignores `NULL` values safely.

  - **Option A**: LEFT ANTI JOIN (Explicit) - Think of this as efficient subtraction.

    ```
    SELECT * FROM customers c
    LEFT ANTI JOIN orders o
    ON c.customer_id = o.customer_id;
    ```
  - **Option B**: NOT EXISTS (Standard SQL) - This is safer than NOT IN because it handles NULLs correctly and allows Spark to optimize.

    ```
    SELECT * FROM customers c
    WHERE NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE c.customer_id = o.customer_id
    );
    ```
- **Avoid this**: Using `NOT IN` with a subquery is dangerous. If the subquery contains even a single `NULL` value, Spark often falls back to a slow, single-threaded process (Cartesian Product) to handle the logic.

  ```
  SELECT * FROM customers
  WHERE customer_id NOT IN (SELECT customer_id FROM orders);
  ```

[## Filter: LEFT SEMI JOIN vs. EXISTS vs. IN v. INNER JOIN](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id23544243108119_body)

**Goal**: Filter rows to keep only those that exist in another table (e.g., "Get the details of customers who have placed at least one order").

**Best Practice**: `LEFT SEMI JOIN`, `EXISTS`, or `IN` - All three of these methods are safe and highly efficient. Spark's optimizer converts `EXISTS` and `IN` into the exact same execution plan as `LEFT SEMI JOIN`.

**How it works**: Spark reads the Left table (Customers) and searches the Right table (Orders). The massive advantage here is that Spark stops searching the moment it finds the very first match. Because it doesn't merge the data, it completely prevents row duplication and saves a tremendous amount of processing time.

- **Option A** - `LEFT SEMI JOIN` (Explicit): Think of this as a highly efficient filter rather than a data merge. It explicitly tells Spark you only care about returning data from the left side.

  ```
  -- ✅ BEST PRACTICE: Fast, explicit, and prevents duplication
  SELECT c.* FROM customers c
  LEFT SEMI JOIN orders o
    ON c.customer_id = o.customer_id;
  ```
- **Option B** - `EXISTS` (Standard SQL): This reads naturally and is highly optimized by Spark, making it an excellent choice for complex subqueries.

  ```
  -- ✅ BEST PRACTICE: Excellent readability for complex subqueries
  SELECT * FROM customers c
  WHERE EXISTS (
      SELECT 1 FROM orders o
      WHERE c.customer_id = o.customer_id
  );
  ```
- **Option C** - `IN` (Standard SQL): Works the exact same way as `EXISTS` for positive checks. While good for simple subqueries, it is also the best choice when filtering against a hardcoded list of values.

  ```
  -- ✅ BEST PRACTICE: Perfect for simple subqueries or hardcoded lists

  -- Using IN with a subquery
  SELECT * FROM customers
  WHERE customer_id IN (SELECT customer_id FROM orders);

  -- Using IN with a hardcoded list
  SELECT * FROM customers
  WHERE status IN ('active', 'pending_renewal');
  ```

[## De-duplication: Window functions vs. self-joins](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394126882573_body)

**Goal**: Get the "latest," "largest," or "most recent" record for every group.

- **Best practice**: Use ROW\_NUMBER() to rank items in a single pass.

  ```
  WITH RankedUpdates AS (
      SELECT
          user_id, status, updated_at,
          ROW_NUMBER() OVER (
              PARTITION BY user_id
              ORDER BY updated_at DESC
          ) as rn
      FROM user_updates
  )
  SELECT user_id, status, updated_at
  FROM RankedUpdates
  WHERE rn = 1;
  ```

  **Window frames (Ascending vs. Descending)**

  If you are using running totals or sliding windows (e.g., SUM(...) OVER ...), the direction of your sort matters significantly:

  - **The trap**: Using ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING (looking forward) often forces Spark to abandon the fast Vectorized/Photon engine and fall back to slow Java row-by-row processing.
  - **The fix**: Always try to look backwards. If you need to look forward, simply reverse your sort order and look backwards.

    Example:

    - **Fast**: `ORDER BY date DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
    - **Slow**: `ORDER BY date ASC ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING`
- **Avoid this**: Finding the "Max Date" and then joining the table back to itself forces Spark to read the data twice and perform a heavy shuffle.

[## Speed: Filter early, filter often](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394127077167_body)

**Goal**: Speed up queries by eliminating data before processing it.

- **Best practice:** Filter on columns as they exist in the source data. This allows Spark to skip reading entire files or partitions ("Partition Pruning").

  Spark reads only relevant data first:

  ```
  SELECT *, TO_DATE(timestamp_col) as evt_date
  FROM huge_event_log
  WHERE timestamp_col LIKE '2024-01-01%
  ```
- **Avoid this**: Applying filters after heavy transformations forces Spark to process the entire dataset, only to throw most of it away later.

  Parses all timestamps before filtering:

  ```
  SELECT * FROM (
    SELECT *, TO_DATE(timestamp_col) as evt_date
    FROM huge_event_log
  )
  WHERE evt_date = '2024-01-01';
  ```

[## Sorting in CTEs: Avoid Unnecessary ORDER BY in CTEs and Subqueries](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id23555006850794_body)

**Goal**: Eliminate sorts that do real work, waste resources but provide no benefit, because the engine discards their order on the next operation.

In Spark, sorting is one of the most expensive operations: it forces a global shuffle across all executors and consumes significant CPU and memory. The trap is that an `ORDER BY` placed inside a CTE or subquery is not preserved once the result feeds into the next step (a `JOIN`, `GROUP BY`, or another `SELECT`). Spark's optimizer treats intermediate ordering as meaningless because the next shuffle will rearrange the rows anyway.

**The result**: you pay the full sort cost and gain nothing.

**Rule of thumb**: `ORDER BY` is only meaningful in the final outer `SELECT` that produces user-facing results.

**The problems It causes**:

- **Wasted Shuffle**: A global sort triggers a full data shuffle across the cluster, even though the result is immediately reshuffled by the next join or aggregation.
- **Misleading Code**: Future readers assume the ordering matters and are afraid to touch it, even though it has no effect.
- **Slower Plans**: Optimizers will sometimes preserve the requested sort even when they don't need to, blocking other optimizations like broadcast joins.

**Best practice**: (Drop the Sort Entirely) - Remove the `ORDER BY`. The query produces identical results and skips the shuffle.

```
-- ✅ BESTPRACTICE: Same result, one less shuffle
WITH active_products AS (
  SELECT product_id, product_name, category
  FROM dim_products
  WHERE is_active = TRUE
)
SELECT s.transaction_id, p.product_name
FROM sales s
LEFT JOIN active_products p
  ON s.product_id = p.product_id;
```

**Avoid this**: (Sort Inside a CTE Used by a Join) - The `ORDER BY` is wasted — the next `JOIN` reshuffles the rows by product\_id, destroying any ordering by category, product\_name.

[## Data modification: DELETE vs. MERGE](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394127766667_body)

**Goal**: Remove rows efficiently.

**Rule**: Use `DELETE` for simple logic (e.g., date ranges). Use `MERGE` when removing a list or joining to another table.

**Why**: `MERGE` is optimized for "Join-based" updates. `DELETE` with subqueries (`IN` or `EXISTS`) can be slower and harder for the optimizer to execute efficiently.

- **Best practice**: Use `MERGE` to join and delete in one optimized step.

  Efficient join based delete:

  ```
  MERGE INTO huge_table target
  USING banned_users source
  ON target.user_id = source.user_id
  WHEN MATCHED THEN DELETE;
  ```
- **Avoid this**: Using subqueries inside `DELETE` is often inefficient.

  ```
  DELETE FROM huge_table
  WHERE EXISTS (
     SELECT 1 FROM banned_users b
     WHERE huge_table.user_id = b.user_id
  );
  ```

[## String operations: Joins & filters](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394128069751_body)

**Goal**: Avoid expensive "Fuzzy Matching" (LIKE, %, Regex) which forces slow table scans and loops.

- **Case A:** Joining Tables (Avoid Non-Equi Joins) - Spark is optimized for Equi-Joins (where Key A = Key B). If you use `LIKE` in a Join, Spark falls back to a Nested Loop Join, which is extremely slow.

  - **Best practice**: Refactor the join key using `LPAD` or `SUBSTRING` to force an exact match.

    Enables fast Hash Joins by forcing '=':

    ```
    SELECT * FROM huge_invoices a
    JOIN huge_customers b
    ```

    Example: Pad the shorter code to match the longer ID:

    ```
    ON a.invoice_id = lpad(b.customer_code, 10, '0');
    ```
  - **Avoid this**: Forces a Nested Loop Join (Timeout Risk)

    ```
    SELECT * FROM huge_invoices a
    JOIN huge_customers b
    ON a.invoice_id LIKE concat('%', b.customer_code);
    ```
- **Case B:** Complex Filtering (Preprocess Logic). If you have complex logic (regex/case statements) in a `WHERE` clause, Spark has to evaluate it for every single row at runtime.

  - **Best practice**: Extract the logic into a clean column once using a Temporary View or Table, then filter on that simple column.

    - **1. Preprocess**: Extract logic into a clean column:

      ```
      CREATE OR REPLACE TEMP VIEW CleanLogs AS
      SELECT *,
        CASE
          WHEN message RLIKE 'Error-[0-9]+' OR message LIKE '%CRITICAL%' THEN 'High'
          ELSE 'Low'
        END as urgency
      FROM huge_logs;
      ```
    - **2. Analyze: Fast filtering on the new simple column**:

      ```
      SELECT * FROM CleanLogs WHERE urgency = 'High';
      ```

[## Table management: CREATE OR REPLACE vs. DROP](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394128502036_body)

**Goal**: Update a table's structure without breaking concurrent queries or losing history.

- **Best practice**: `CREATE OR REPLACE TABLE` ... (Atomic swap; zero downtime).QL

  ```
  CREATE OR REPLACE TABLE my_table
  AS SELECT * FROM ...;
  ```
- **Avoid this**: `DROP TABLE ...` followed by `CREATE TABLE ...` (Causes downtime and "Table Not Found" errors).

[## Table definition: Typed Nulls (Avoid NullType)](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235394129254759_body)

**Goal**: Prevent "Dead End" columns that cause `UNION` failures and schema evolution crashes.

When you define a table (especially using `CREATE TABLE AS SELECT` or `CTAS`) and include a column defined simply as `NULL` without a cast, Spark infers the data type as `NullType` (or `VoidType`). This is a "silent killer" in pipelines.

**The problems it causes**:

- **Union mismatches**: If you try to UNION this table with another table where the column is populated (e.g., it is a String), Spark will crash. The engine cannot automatically reconcile the difference between a "typed" column (String) and a "void" column (`NullType`) in strict mode.
- **Schema evolution crashes**: If you try to append real data to this table later, the merge will fail because `NullType` cannot safely evolve into `StringType` automatically.

- **Best practice**: Always cast explicit `NULLs` to their intended future type.

  ```
  CREATE TABLE good_table AS
  SELECT
      id,
      CAST(NULL as STRING) as status_code,
      CAST(NULL as INT) as retry_count
  FROM source_data;
  ```
- **Avoid this**; Spark creates a "dead" column that breaks future Unions.

  Table A has `status_code` as `NullType`:

  ```
  SELECT id, NULL as status_code FROM table_A
  UNION ALL
  ```

  Table B has `status_code` as `StringType` -> `CRASH`

  ```
  SELECT id, 'Active' as status_code FROM table_B;
  ```

[## Window functions: Deterministic ordering (tie-breaking)](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235442298801597_body)

**Goal**: Guarantee reproducible results in rankings and running totals by eliminating random row shuffling.

Window functions (like `ROW_NUMBER`, `RANK`, or running `SUM`) rely entirely on the sequence rows defined in the `OVER` clause. If your `ORDER BY` clause contains duplicate values and lacks a unique tie-breaker, the SQL engine is free to shuffle the rows arbitrarily within those duplicates.

**The problems it causes**:

- **Non-deterministic results**: Running the same query twice on the exact same data can produce different results. For example, a record might be ranked #1 in the first run and #2 in the second run if they share the same sorting value.
- **Data consistency errors**: In pagination or deduplication logic (e.g., "Keep only the latest record"), a lack of a tie-breaker means the "winner" is chosen randomly, leading to data loss or "flickering" datasets.

**Best practice**: Always add a column with unique values (like a Primary Key or UUID) to the `ORDER BY` clause to act as a tie-breaker.

```
SELECT
    event_id,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY
            created_at,      -- Primary sort
            event_id         -- ✅ Tie-breaker forces stable, deterministic order
    ) as event_rank
FROM user_events;
```

**Avoid this**: Relying on a non-unique column alone leaves the sort order ambiguous.

```
-- ⚠️ 'created_at' may have duplicates (multiple events per second).
-- The engine arbitrarily decides which row comes first for the same timestamp.
SELECT
    event_id,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) as event_rank -- ⚠️ Non-deterministic!
FROM user_events;
```

[## Handling hierarchical data: Recursive CTEs](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id23544234059574_body)

**Goal**: Query hierarchical data, such as traversing an employee org chart, or resolving a bill of materials.

**How it works**: A Recursive Common Table Expression (CTE) is a query that references itself. Think of it as a loop inside SQL. It consists of two parts connected by a UNION ALL:

1. **The anchor member**: The starting point (e.g., finding the CEO who has no manager). Spark runs this first.
2. **The recursive member**: The looping step. It takes the results from the previous step and uses them to find the next level of data. The loop stops when a step returns zero new rows.

**The problems it causes**:

- **Infinite Loops & The "Rule of 100"**: If your data has circular references (e.g., A manages B, and B manages A), the query will loop endlessly. By default, Spark has a hard limit of 100 recursive iterations. If a query requires more than 100 loops, it will fail.
- **Implicit Row Limits:** Recursive CTEs have a default generation limit of 1 million rows. If your results exceed this limit, the query will also fail

**Best Practice 1** - **Safe Recursivity (Depth Control & Row Limits)** : When using recursive CTEs, always create a depth counter in your anchor step, increment it in the recursive step, and add a hard stop in your `WHERE` clause. To bypass the implicit 1-million-row limit, append a `LIMIT ALL` to your final `SELECT`.

```
-- ✅ BEST PRACTICE: Safe recursion with depth control and bypassed limits
WITH RECURSIVE org_chart AS (
    -- 1. THE ANCHOR: Start with the top of the hierarchy (Depth = 1)
    SELECT employee_id, manager_id, name, 1 AS depth
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 2. THE RECURSIVE: Join the previous results back to the table
    SELECT e.employee_id, e.manager_id, e.name, oc.depth + 1
    FROM employees e
    JOIN org_chart oc
      ON e.manager_id = oc.employee_id
    -- BEST PRACTICE: Stop the loop safely before the 100-iteration hard limit
    WHERE oc.depth < 10
)
-- BEST PRACTICE: Overcome the implicit 1M row limit for large results
SELECT * FROM org_chart
LIMIT ALL
```

**Best Practice 2 - The Stepped CTE Approach (For Combinations)**: If you must use recursive CTEs to generate thousands of combinations (like dates), break the recursion into smaller hierarchical steps and multiply them using a `CROSS JOIN`. Since the maximum number of days in a month is 31, no single CTE will ever exceed the 100-loop limit.

```
-- ✅ BEST PRACTICE: Stepped CTEs keep individual loops safely under the 100 limit
WITH RECURSIVE years AS (
    SELECT 2024 AS yr UNION ALL SELECT yr + 1 FROM years WHERE yr < 2030
),
months AS (
    SELECT 1 AS mth UNION ALL SELECT mth + 1 FROM months WHERE mth < 12
),
days AS (
    SELECT 1 AS dy UNION ALL SELECT dy + 1 FROM days WHERE dy < 31
)
-- Combine them to generate dates using concat() and try_to_timestamp()
-- try_to_timestamp safely returns NULL for invalid dates (like Feb 30),
-- preventing strict-mode crashes.
SELECT try_to_timestamp(concat(yr, '-', mth, '-', dy), 'yyyy-M-d') AS calendar_date
FROM years
CROSS JOIN months
CROSS JOIN days
WHERE try_to_timestamp(concat(yr, '-', mth, '-', dy), 'yyyy-M-d') IS NOT NULL
ORDER BY calendar_date;
```

**Best Practice 3 - Native Functions (Highly Recommended for Sequences)**: While the stepped CTE approach works, this process has a native, highly optimized way to generate tables without using recursion at all. Use `sequence()` to generate an array, and `explode()` to turn it into rows. The fastest, cleanest way to generate dates in Spark which generates 10 years of days instantly with zero recursion

```
SELECT explode(
    sequence(try_to_timestamp('2020-01-01'), try_to_timestamp('2030-12-31'), INTERVAL 1 DAY)
) AS calendar_date;
```

**Avoid this**: Linear Recursion & 100 Iterations. Do not use open-ended recursion, and don't use a Recursive CTE for operations that require more than 100 linear steps (like generating a calendar day-by-day).

```
-- ⚠️ AVOID THIS: Fails because generating a year of days takes 365 loops (> 100 limit)
WITH RECURSIVE calendar AS (
    SELECT try_to_timestamp('2024-01-01') AS cal_date
    UNION ALL
    SELECT date_add(cal_date, 1)
    FROM calendar
    WHERE cal_date < try_to_timestamp('2024-12-31')
)
SELECT * FROM calendar;
```

[## Intermediate data: Temporary views vs. physical tables (for non-OCPM transformations)](#UUID-93423d96-20c0-f099-6165-531e23cdfe79_section-id235442340635657_body)

**Goal**: Choose the most efficient way to store intermediate data based on query cost and how often the data is reused in your transformation.

Because Spark evaluates `TEMP VIEW` lazily, the underlying logic is recalculated every single time the view is queried. Deciding when to use a view versus writing a physical table (checkpointing) is critical for the transformation performance.

**The problems it causes**:

- **Massive recomputation**: Relying on a `TEMP VIEW` for complex queries (massive joins, heavy aggregations) that are referenced multiple times downstream forces Spark to re-execute the expensive operations from scratch every single time.
- **Wasted I/O**: Conversely, writing simple, single-use transformations to a physical table wastes disk I/O, storage space, and slows down the transformation with unnecessary write operations.

**Best Practice - Match the Tool to the Task**: Default to a `TEMP VIEW` for lightweight logic. If the query is heavy `AND` reused, save it as a physical table to act as a "checkpoint," trading a one-time disk write for massive CPU savings.

```
-- ✅ BEST PRACTICE: Option A - Temporary View (The Lightweight Default)
-- Fast, zero I/O, and self-cleaning. Perfect for simple filters or single-use logic.
CREATE OR REPLACE TEMP VIEW clean_users AS
SELECT * FROM raw_users WHERE email IS NOT NULL;


-- ✅ BEST PRACTICE: Option B - Physical Table (The "Checkpoint")
-- Computes the expensive math ONCE and saves it to disk.

CREATE TABLE heavy_math_checkpoint AS
SELECT customer_id, complex_heavy_aggregation(history) AS score
FROM massive_transaction_table
GROUP BY customer_id;

-- These subsequent queries are now fast because the operations are already done
SELECT * FROM heavy_math_checkpoint WHERE score > 90;
SELECT AVG(score) FROM heavy_math_checkpoint;

-- Explicitly clean up at the end of the transformation
DROP TABLE heavy_math_checkpoint;
```


---

## data-integration/etl/etl-engine-sql

# ETL Engine SQL Syntax

SQL is a module for working with structured data. This ETL Engine SQL syntax describes the SQL syntax in detail and provides usage examples when applicable.

This document provides a list of Data Definition, Manipulation, Retrieval, and Auxiliary Statements that can be used for the ETL Engine with case-centric data models only.

Expand all

[## Data Definition Statements (DDL)](#UUID-3009a52f-97c0-c012-63fb-42986a439071_section-idm235017402939746_body)

Data Definition Statements are used to create or modify the structure of database objects in a database.

Spark SQL supports the following Data Definition Statements:

### CREATE table

THE CREATE TABLE statement defines a table in an existing database:

```
CREATE TABLE student (id INT, name STRING, age INT);

CREATE TABLE student (id INT, name STRING) PARTITIONED BY (age INT);

CREATE TABLE Student_Dupli like Student;
```

### DROP table

DROP TABLE deletes the table and removes the directory associated with it from the file system if the table is not an EXTERNAL table. If the table is not present, it throws an exception.

In case of an external table, only the associated metadata information is removed from the metastore database.

If the table is cached, the command uncaches it and all its dependents.

```
DROP TABLE employeetable;

DROP TABLE userdb.employeetable;

DROP TABLE employeetable;

DROP TABLE IF EXISTS employeetable;

DROP TABLE employeetable PURGE;

TRUNCATE TABLE Student partition(age=10);
```

### ALTER table

THE ALTER TABLE statement changes the schema or properties of a table.

```
ALTER TABLE Student RENAME TO StudentInfo;

ALTER TABLE StudentInfo ADD columns (LastName string, DOB timestamp);

ALTER TABLE StudentInfo DROP columns (LastName, DOB);

ALTER TABLE StudentInfo DROP columns (LastName, DOB);

ALTER TABLE StudentInfo DROP column (LastName);

ALTER TABLE StudentInfo RENAME COLUMN name TO FirstName;

ALTER TABLE Teacher CLUSTER BY (gender, country);
```

### DESCRIBE table

DESCRIBE TABLE statement returns the basic metadata information of a table. The metadata information includes column name, column type and column comment. Optionally a partition spec or column name may be specified to return the metadata pertaining to a partition or column respectively.

```
DESCRIBE TABLE EXTENDED tempdb1.v2;

DESC TABLE EXTENDED tempdb1.v2;

DESC TABLE EXTENDED tempdb1.v2;

DESC TABLE EXTENDED tempdb1.v2;

DESC TABLE EXTENDED tempdb1.v2;

DESC TABLE EXTENDED open_orders;

CREATE OR REPLACE VIEW open_orders WITH SCHEMA EVOLUTION AS SELECT * FROM orders WHERE status = 'open';

CREATE OR REPLACE VIEW open_orders AS SELECT * FROM orders WHERE status = 'open';

DROP VIEW employeeView;

DROP VIEW userdb.employeeView;

DROP VIEW employeeView;

DROP VIEW IF EXISTS employeeView;

ALTER VIEW tempdb1.v1 RENAME TO tempdb1.v2;

ALTER VIEW tempdb1.v2 AS SELECT * FROM tempdb1.v1;
```

[## Data Manipulation Statements (DML)](#UUID-3009a52f-97c0-c012-63fb-42986a439071_section-idm235017402984532_body)

Data Manipulation Statements are used to add, change, or delete data.

SQL supports the following Data Manipulation Statements:

### INSERT table

The INSERT statement inserts new rows into a table or overwrites the existing data in the table. The inserted rows can be specified by value expressions or the result of a query.

```
INSERT INTO students VALUES('Amy Smith', '123 Park Ave, San Jose', 111111);

INSERT INTO students VALUES('Bob Brown', '456 Taylor St, Cupertino', 222222),('Cathy Johnson', '789 Race Ave, Palo Alto', 333333);

INSERT INTO students PARTITION (student_id = 444444)SELECT name, address FROM persons WHERE name = 'Dora Williams';

INSERT INTO students TABLE visiting_students;

INSERT INTO students PARTITION (birthday = date'2019') VALUES('Amy Smith', '123 Park Ave, San Jose');

INSERT INTO students (address, name, student_id) VALUES('Hangzhou, China', 'Kent Yao', 11215016);

INSERT INTO students PARTITION (student_id = 11215017) (address, name) VALUES('Hangzhou, China', 'Kent Yao Jr.');

INSERT OVERWRITE students VALUES ('Ashua Hill', '456 Erica Ct, Cupertino', 111111), ('Brian Reed', '723 Kern Ave, Palo Alto', 222222);

INSERT OVERWRITE students PARTITION (student_id = 222222)BY NAME SELECT 'Unknown' as address, name FROM persons WHERE name = 'Dora Williams';

INSERT INTO students PARTITION (student_id = 222222) BY NAME  SELECT address, name FROM persons WHERE name = 'Dora Williams';

INSERT OVERWRITE students PARTITION (student_id = 222222) BY NAME SELECT 'Unknown' as address, name FROM persons WHERE name = 'Dora Williams';

INSERT INTO persons REPLACE WHERE ssn = 123456789 SELECT * FROM persons2;

INSERT OVERWRITE students TABLE visiting_students;

CREATE TABLE students (name STRING, address  STRING) PARTITIONED BY (birthday DATE);

INSERT INTO students PARTITION (birthday = date'2019')VALUES ('Amy Smith', '123 Park Ave, San Jose');

INSERT OVERWRITE students PARTITION (birthday = date'2019') VALUES('Jason Wang', '908 Bird St, Saratoga');

INSERT OVERWRITE students (address, name, student_id) VALUES('Hangzhou, China', 'Kent Yao', 11215016);

INSERT OVERWRITE students PARTITION (student_id = 11215016) (address, name) VALUES    ('Hangzhou, China', 'Kent Yao Jr.');
```

### UPDATE table

Updates the column values for the rows that match a predicate. When no predicate is provided, update the column values for all rows.

```
> UPDATE events SET eventType = 'click' WHERE eventType = 'clk';

> UPDATE all_events SET session_time = 0, ignored = true WHERE session_time < (SELECT min(session_time) FROM good_events);

> UPDATE orders AS t1 SET order_status = 'returned' WHERE EXISTS (SELECT oid FROM returned_orders WHERE t1.oid = oid);

> UPDATE events SET category = 'undefined' WHERE category NOT IN (SELECT category FROM events2 WHERE date > '2001-01-01');

> UPDATE events SET ignored = DEFAULTWHERE eventType = 'unknown';
```

### DELETE table

Deletes the rows that match a predicate. When no predicate is provided, it deletes all rows.

```
DELETE FROM events WHERE date < '2017-01-01';

DELETE FROM all_events WHERE session_time < (SELECT min(session_time) FROM good_events);

DELETE FROM orders AS t1 WHERE EXISTS (SELECT oid FROM returned_orders WHERE t1.oid = oid);

DELETE FROM events WHERE category NOT IN (SELECT category FROM events2 WHERE date > '2001-01-01');
```

### MERGE INTO

Merges a set of updates, insertions, and deletions based on a source table into a target Delta table.

```
MERGE INTO target USING source ON target.key = source.key WHEN MATCHED THEN DELETE;

MERGE INTO target USING source ON target.key = source.key WHEN MATCHED AND target.updated_at < source.updated_at THEN UPDATE SET *;

MERGE INTO target USING source ON target.key = source.key WHEN MATCHED AND target.marked_for_deletion THEN DELETE WHEN MATCHED THEN UPDATE SET target.updated_at = source.updated_at, target.value = DEFAULT;

MERGE INTO target USING source ON target.key = source.key WHEN NOT MATCHED THEN INSERT *;

MERGE INTO target USING source ON target.key = source.key WHEN NOT MATCHED BY TARGET AND source.created_at > now() - INTERVAL “1” DAY THEN INSERT (created_at, value) VALUES (source.created_at, DEFAULT);

MERGE INTO target USING source ON target.key = source.key WHEN NOT MATCHED BY SOURCE THEN DELETE;

MERGE INTO target USING source ON target.key = source.key WHEN NOT MATCHED BY SOURCE AND target.marked_for_deletion THEN DELETE WHEN NOT MATCHED BY SOURCE THEN UPDATE SET target.value = DEFAULT;
```

[## Data Retrieval Statements](#UUID-3009a52f-97c0-c012-63fb-42986a439071_section-idm235017545335854_body)

Spark supports `SELECT` statement that is used to retrieve rows from one or more tables according to the specified clauses. The full syntax and brief description of supported clauses are explained in SELECT section. The SQL statements related to SELECT are also included in this section. Sql also provides the ability to generate logical and physical plan for a given query using EXPLAIN statement.

[## Operators](#UUID-3009a52f-97c0-c012-63fb-42986a439071_section-idm23501754538126_body)

An SQL operator is a symbol specifying an action performed on one or more expressions. Operators are represented by special characters or by keywords.

### Operator precdence

When a complex expression has multiple operators, operator precedence determines the sequence of operations in the expression. For example, in expression `1 + 2 * 3,` `*` has higher precedence than `+`, so the expression is evaluated as `1 + (2 * 3) = 7`. The order of execution can significantly affect the resulting value.

Operators have the precedence levels shown in the following table. An operator on higher precedence is evaluated before an operator on a lower level. In the following table, the operators in descending order of precedence, a.k.a. 1 is the highest level. Operators listed on the same table cell have the same precedence and are evaluated from left to right or right to left based on the associativity.

Filter

- Precedence
- Operator
- Operation
- Associativity

| Precedence | Operator | Operation | Associativity |
| --- | --- | --- | --- |
| 1 | .  []  :: | member access  element access  cast | Left to right |
| 2 | +  -  ~ | unary plus  unary minus  bitwise NOT | Right to left |
| 3 | \*  /  %  DIV | multiplication  division, modulo  integral division | Left to right |
| 4 | +  -  || | addition  subtraction  concatenation | Left to right |
| 5 | <<  >> | bitwise shift left  bitwise shift right | Left to right |
| 6 | & | bitwise AND | Left to right |
| 7 | ^ | bitwise XOR(exclusive or) | Left to right |
| 8 | | | bitwise OR(inclusive or) | Left to right |
| 9 | =, ==  <>, !=  <, < =  >, >= | comparison operators | Left to right |
| 10 | NOT, !  EXISTS | logical NOT  existence | Right to left |
| 11 | BETWEEN  IN  RLIKE, REGEXP  ILIKE  LIKE  IS [NULL, TRUE, FALSE]  IS DISTINCT FROM | other predicates | Left to right |
| 12 | AND | conjunction | Left to right |
| 13 | OR | disjunction | Left to right |

| Precedence | Operator | Operation | Associativity |
| --- | --- | --- | --- |
| 1 | .  []  :: | member access  element access  cast | Left to right |
| 2 | +  -  ~ | unary plus  unary minus  bitwise NOT | Right to left |
| 3 | \*  /  %  DIV | multiplication  division, modulo  integral division | Left to right |
| 4 | +  -  || | addition  subtraction  concatenation | Left to right |
| 5 | <<  >> | bitwise shift left  bitwise shift right | Left to right |
| 6 | & | bitwise AND | Left to right |
| 7 | ^ | bitwise XOR(exclusive or) | Left to right |
| 8 | | | bitwise OR(inclusive or) | Left to right |
| 9 | =, ==  <>, !=  <, < =  >, >= | comparison operators | Left to right |
| 10 | NOT, !  EXISTS | logical NOT  existence | Right to left |
| 11 | BETWEEN  IN  RLIKE, REGEXP  ILIKE  LIKE  IS [NULL, TRUE, FALSE]  IS DISTINCT FROM | other predicates | Left to right |
| 12 | AND | conjunction | Left to right |
| 13 | OR | disjunction | Left to right |

[## Functions](#UUID-3009a52f-97c0-c012-63fb-42986a439071_section-idm235017545420522_body)

The following SQL functions can be used:

Filter

- Function
- Description
- Example

| Function | Description | Example |
| --- | --- | --- |
| `ABS()` | abs(expr) - Returns the absolute value of the numeric or interval value. | ``` > SELECT abs(-1); ```  Result: 1  ``` > SELECT abs(INTERVAL -'1-1' YEAR TO MONTH); ```  Result: 1-1 |
| `ADD_MONTHS()` | add\_months(start\_date, num\_months) - Returns the date that isnum\_monthsafterstart\_date. | ``` > SELECT add_months('2016-08-31', 1); ```  Result: 2016-09-30 |
| `AGGREGATE()` | aggregate(expr, start, merge, finish) - Applies a binary operator to an initial state and all elements in the array, and reduces this to a single state. The final state is converted into the final result by applying a finish function. | ``` > SELECT aggregate(array(1, 2, 3), 0, (acc, x) -> acc + x); ```  Result: 6  ``` > SELECT aggregate(array(1, 2, 3), 0, (acc, x) -> acc + x, acc -> acc * 10); ```  Result: 60 |
| `AND()` | expr1 and expr2 - Logical AND. | ``` > SELECT true and true; ```  Result: true  ``` > SELECT true and false; ```  Result: false  ``` > SELECT true and NULL; ```  Result: NULL  ``` > SELECT false and NULL; ```  Result: False |
| `ANY()` | any(expr) - Returns true if at least one value of expr is true. | ``` > SELECT any(col) FROM VALUES (true), (false), (false) AS tab(col); ```  Result: true  ``` > SELECT any(col) FROM VALUES (NULL), (true), (false) AS tab(col); ```  Result: true  ``` > SELECT any(col) FROM VALUES (false), (false), (NULL) AS tab(col); ```  Result: false |
| `ANY_VALUE()` | any\_value(expr[, isIgnoreNull]) - Returns some value ofexprfor a group of rows. IfisIgnoreNullis true, returns only non-null values. | ``` > SELECT any_value(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 10  ``` > SELECT any_value(col) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: NULL  ``` > SELECT any_value(col, true) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: 5 |
| `ARRAY()` | array(expr, ...) - Returns an array with the given elements. | ``` > SELECT array(1, 2, 3); ```  Result: [1,2,3] |
| `AVG()` | avg(expr) - Returns the mean calculated from values of a group. | ``` > SELECT avg(col) FROM VALUES (1), (2), (3) AS tab(col); ```  Result: 2.0  ``` > SELECT avg(col) FROM VALUES (1), (2), (NULL) AS tab(col); ```  Result: 1.5 |
| `BASE64()` | base64(bin) - Converts the argument from a binary b into a base 64 string. | ``` > SELECT base64('Spark SQL'); ```  Result: U3BhcmsgU1FM  ``` > SELECT base64(x'537061726b2053514c'); ```  Result: U3BhcmsgU1FM |
| `BETWEEN()` | input [NOT] between lower AND upper - evaluate if input is [not] in between lower and upper | ``` > SELECT 0.5 between 0.1 AND 1.0; ```  Result: true |
| `BOOL_AND()` | bool\_and(expr) - Returns true if all values of expr are true. | ``` > SELECT bool_and(col) FROM VALUES (true), (true), (true) AS tab(col); ```  Result: true  ``` > SELECT bool_and(col) FROM VALUES (NULL), (true), (true) AS tab(col); ```  Result: true  ``` > SELECT bool_and(col) FROM VALUES (true), (false), (true) AS tab(col); ```  Result: false |
| `BOOL_OR()` | bool\_or(expr) - Returns true if at least one value of expr is true. | ``` > SELECT bool_or(col) FROM VALUES (true), (false), (false) AS tab(col); ```  Result: true  ``` > SELECT bool_or(col) FROM VALUES (NULL), (true), (false) AS tab(col); ```  Result: true  ``` > SELECT bool_or(col) FROM VALUES (false), (false), (NULL) AS tab(col); ```  Result: false |
| `CASE()` | CASE expr1 WHEN expr2 THEN expr3 [WHEN expr4 THEN expr5]\* [ELSE expr6] END - Whenexpr1=expr2, returnsexpr3; whenexpr1=expr4, returnexpr5; else returnexpr6. | ``` > SELECT CASE col1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' ELSE '?' END FROM VALUES 1, 2, 3; ```  Result: one  two  ?  ``` > SELECT CASE col1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' END FROM VALUES 1, 2, 3; ```  Result: one  two  NULL |
| `CAST()` | cast(expr AS type) - Casts the valueexprto the target data typetype.expr::typealternative casting syntax is also supported. | ``` > SELECT cast('10' as int); ```  Result: 10  ``` > SELECT '10' :: int; ```  Result: 10 |
| `CHAR()` | char(expr) - Returns the ASCII character having the binary equivalent to expr. If n is larger than 256 the result is equivalent to chr(n % 256) | ``` > SELECT char(65); ```  Result: A |
| `CHAR_LENGTH()` | char\_length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT char_length('Spark SQL '); ```  Result: 10  ``` > SELECT char_length(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `CHARACTER_LENGTH()` | character\_length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT character_length('Spark SQL '); ```  Result: 10  ``` > SELECT character_length(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `CHR()` | chr(expr) - Returns the ASCII character having the binary equivalent to expr. If n is larger than 256 the result is equivalent to chr(n % 256) | ``` > SELECT chr(65); ```  Result: A |
| `COALESCE()` | coalesce(expr1, expr2, ...) - Returns the first non-null argument if exists. Otherwise, null. | ``` > SELECT coalesce(NULL, 1, NULL); ```  Result: 1 |
| `CONCAT()` | concat(col1, col2, ..., colN) - Returns the concatenation of col1, col2, ..., colN. | ``` > SELECT concat('Spark', 'SQL'); ```  Result: SparkSQL  ``` > SELECT concat(array(1, 2, 3), array(4, 5), array(6)); ```  Result: [1,2,3,4,5,6] |
| `CONCAT_WS()` | concat\_ws(sep[, str | array(str)]+) - Returns the concatenation of the strings separated bysep, skipping null values. | ``` > SELECT concat_ws(' ', 'Spark', 'SQL'); ```  Result: Spark SQL  ``` > SELECT concat_ws('s'); ```  Result:  ``` > SELECT concat_ws('/', 'foo', null, 'bar'); ```  Result: foo/bar  ``` > SELECT concat_ws(null, 'Spark', 'SQL'); ```  Result: NULL |
| `CONTAINS()` | contains(left, right) - Returns a boolean. The value is True if right is found inside left.Returns NULL if either input expression is NULL. Otherwise, returns False.Both left or right must be of STRING or BINARY type. | ``` > SELECT contains('Spark SQL', 'Spark'); ```  Result: true  ``` > SELECT contains('Spark SQL', 'SPARK'); ```  Result: false  ``` > SELECT contains('Spark SQL', null); ```  Result: NULL  ``` > SELECT contains(x'537061726b2053514c', x'537061726b'); ```  Result: true |
| `COUNT()` | count(\*) - Returns the total number of retrieved rows, including rows containing null. | ``` > SELECT count(*) FROM VALUES (NULL), (5), (5), (20) AS tab(col); ```  Result: 4  ``` > SELECT count(col) FROM VALUES (NULL), (5), (5), (20) AS tab(col); ```  Result: 3  ``` > SELECT count(DISTINCT col) FROM VALUES (NULL), (5), (5), (10) AS tab(col); ```  Result: 2 |
| `CURRENT_DATE()` | current\_date() - Returns the current date at the start of query evaluation. All calls of current\_date within the same query return the same value. | ``` > SELECT current_date(); ```  Result: 2020-04-25  ``` > SELECT current_date; ```  Result: 2020-04-25 |
| `CURRENT_SCHEMA()` | current\_schema() - Returns the current database. | ``` > SELECT current_schema(); ```  Result: default |
| `CURRENT_TIMESTAMP()` | current\_timestamp() - Returns the current timestamp at the start of query evaluation. All calls of current\_timestamp within the same query return the same value. | ``` > SELECT current_timestamp(); ```  Result: 2020-04-25 15:49:11.914  ``` > SELECT current_timestamp; ```  Result: 2020-04-25 15:49:11.914 |
| `DATE()` | date(expr) - Casts the value expr to the target data typedate. | ``` > SELECT DATE('2016-07-30'); ```  Result: 2016-07-31 |
| `DATE_DIFF()` | date\_diff(endDate, startDate) - Returns the number of days from startDate to endDate. | ``` > SELECT date_diff('2009-07-31', '2009-07-30'); ```  Result: 1  ``` > SELECT date_diff('2009-07-30', '2009-07-31'); ```  Result: -1 |
| `DATE_TRUNC()` | date\_trunc(fmt, ts) - Returns timestamptstruncated to the unit specified by the format modelfmt. | ``` > SELECT date_trunc('YEAR', '2015-03-05T09:32:05.359'); ```  Result: 2015-01-01 00:00:00  ``` > SELECT date_trunc('MM', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-01 00:00:00  ``` > SELECT date_trunc('DD', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-05 00:00:00  ``` > SELECT date_trunc('HOUR', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-05 09:00:00  ``` > SELECT date_trunc('MILLISECOND', '2015-03-05T09:32:05.123456'); ```  Result: 2015-03-05 09:32:05.123 |
| `DATEADD()` | dateadd(start\_date, num\_days) - Returns the date that is num\_days after start\_date. | ``` > SELECT dateadd('2016-07-30', 1); ```  Result: 2016-07-31 |
| `DATEDIFF()` | datediff(endDate, startDate) - Returns the number of days from startDate to endDate. | ``` > SELECT datediff('2009-07-31', '2009-07-30'); ```  Result: 1  ``` > SELECT datediff('2009-07-30', '2009-07-31'); ```  Result: -1 |
| `DAY()` | day(date) - Returns the day of month of the date/timestamp. | ``` > SELECT day('2009-07-30'); ```  Result: 30 |
| `DAYOFMONTH()` | dayofmonth(date) - Returns the day of month of the date/timestamp. | ``` > SELECT dayofmonth('2009-07-30'); ```  Result: 30 |
| `DAYOFWEEK()` | dayofweek(date) - Returns the day of the week for date/timestamp (1 = Sunday, 2 = Monday, ..., 7 = Saturday). | ``` > SELECT dayofweek('2009-07-30'); ```  Result: 5 |
| `DAYOFYEAR()` | dayofyear(date) - Returns the day of year of the date/timestamp. | ``` > SELECT dayofyear('2016-04-09'); ```  Result: 100 |
| `DECODE()` | decode(bin, charset) - Decodes the first argument using the second argument character set. If either argument is null, the result will also be null. | ``` > SELECT decode(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc  ``` > SELECT decode(2, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle', 'Non domestic'); ```  Result: San Francisco  ``` > SELECT decode(6, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle', 'Non domestic'); ```  Result: Non domestic  ``` > SELECT decode(6, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle'); ```  Result: NULL  ``` > SELECT decode(null, 6, 'Spark', NULL, 'SQL', 4, 'rocks'); ```  Result: SQL |
| `DIV()` | expr1 div expr2 - Divide expr1 by expr2. It returns NULL if an operand is NULL or expr2 is 0. The result is casted to long. | ``` > SELECT 3 div 2; ```  Result: 1  ``` > SELECT INTERVAL '1-1' YEAR TO MONTH div INTERVAL '-1' MONTH; ```  Result: -13 |
| `ENCODE()` | encode(str, charset) - Encodes the first argument using the second argument character set. If either argument is null, the result will also be null. | ``` > SELECT encode('abc', 'utf-8'); ```  Result: abc |
| `EXISTS()` | exists(expr, pred) - Tests whether a predicate holds for one or more elements in the array. | ``` > SELECT exists(array(1, 2, 3), x -> x % 2 == 0); ```  Result: true  ``` > SELECT exists(array(1, 2, 3), x -> x % 2 == 10); ```  Result: false  ``` > SELECT exists(array(1, null, 3), x -> x % 2 == 0); ```  Result: NULL  ``` > SELECT exists(array(0, null, 2, 3, null), x -> x IS NULL); ```  Result: true  ``` > SELECT exists(array(1, 2, 3), x -> x IS NULL); ```  Result: false |
| `EXTRACT()` | extract(field FROM source) - Extracts a part of the date/timestamp or interval source. | ``` > SELECT extract(YEAR FROM TIMESTAMP '2019-08-12 01:00:00.123456'); ```  Result: 2019  ``` > SELECT extract(week FROM timestamp'2019-08-12 01:00:00.123456'); ```  Result: 33  ``` > SELECT extract(doy FROM DATE'2019-08-12'); ```  Result: 224  ``` > SELECT extract(SECONDS FROM timestamp'2019-10-01 00:00:01.000001'); ```  Result: 1.000001  ``` > SELECT extract(days FROM interval 5 days 3 hours 7 minutes); ```  Result: 5  ``` > SELECT extract(seconds FROM interval 5 hours 30 seconds 1 milliseconds 1 microseconds); ```  Result: 30.001001  ``` > SELECT extract(MONTH FROM INTERVAL '2021-11' YEAR TO MONTH); ```  Result: 11  ``` > SELECT extract(MINUTE FROM INTERVAL '123 23:55:59.002001' DAY TO SECOND); ```  Result: 55 |
| `FIRST()` | first(expr[, isIgnoreNull]) - Returns the first value of expr for a group of rows. If is IgnoreNull is true, returns only non-null values. | ``` > SELECT first(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 10  ``` > SELECT first(col) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: NULL  ``` > SELECT first(col, true) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: 5 |
| `HEX()` | hex(expr) - Converts expr to hexadecimal. | ``` > SELECT hex(17); ```  Result: 11  ``` > SELECT hex('Spark SQL'); ```  Result: 537061726B2053514C |
| `HOUR()` | hour(timestamp) - Returns the hour component of the string/timestamp. | ``` > SELECT hour('2009-07-30 12:58:59'); ```  Result: 12 |
| `IF()` | if(expr1, expr2, expr3) - If expr1 evaluates to true, then returns expr2; otherwise returns expr3. | ``` > SELECT if(1 < 2, 'a', 'b'); ```  Result: a |
| `IFNULL()` | ifnull(expr1, expr2) - Returns expr2 if expr1is null, or expr1 otherwise. | ``` > SELECT ifnull(NULL, array('2')); ```  Result: ["2"] |
| `ILIKE()` | str ilike pattern[ ESCAPE escape] - Returns true if str matches pattern with escapecase-insensitively, null if any arguments are null, false otherwise. | ``` > SELECT ilike('Spark', '_Park'); ```  Result: true  ``` > SELECT '\\\\abc' AS S, S ilike r'\\\\abc', S ilike '\\\\\\\\abc'; ```  Result: \abc true true  ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT '%SystemDrive%\\Users\\John' ilike '\\%SystemDrive\\%\\\\users%'; ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT '%SystemDrive%\\\\USERS\\\\John' ilike r'%SystemDrive%\\\\Users%'; ```  Result: true  ``` > SELECT '%SystemDrive%/Users/John' ilike '/%SYSTEMDrive/%//Users%' ESCAPE '/'; ```  Result: true |
| `IN()` | expr1 in(expr2, expr3, ...) - Returns true if expr equals to any valN. | ``` > SELECT 1 in(1, 2, 3); ```  Result: true  ``` > SELECT 1 in(2, 3, 4); ```  Result: false  ``` > SELECT named_struct('a', 1, 'b', 2) in(named_struct('a', 1, 'b', 1), named_struct('a', 1, 'b', 3)); ```  Result: false  ``` > SELECT named_struct('a', 1, 'b', 2) in(named_struct('a', 1, 'b', 2), named_struct('a', 1, 'b', 3)); ```  Result: true |
| `INSTR()` | instr(str, substr) - Returns the (1-based) index of the first occurrence of substrin str. | ``` > SELECT instr('SparkSQL', 'SQL'); ```  Result: 6 |
| `LAG()` | lag(input[, offset[, default]]) - Returns the value of input at the offsetth row before the current row in the window. The default value of offset is 1 and the default value of default is null. If the value of input at the offsetth row is null, null is returned. If there is no such offset row (e.g., when the offset is 1, the first row of the window does not have any previous row), default is returned. | ``` > SELECT a, b, lag(b) OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 NULL  A1 1 1  A1 2 1  A2 3 NULL |
| `LAST()` | last(expr[, isIgnoreNull]) - Returns the last value of expr for a group of rows. If is Ignore Null is true, returns only non-null values. | ``` > SELECT last(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 20  ``` > SELECT last(col) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: NULL  ``` > SELECT last(col, true) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: 5 |
| `LAST_DAY()` | last\_day(date) - Returns the last day of the month which the date belongs to. | ``` > SELECT last_day('2009-01-12'); ```  Result: 2009-01-31 |
| `LAST_VALUE()` | last\_value(expr[, isIgnoreNull]) - Returns the last value of expr for a group of rows. If is IgnoreNull is true, returns only non-null values. | ``` > SELECT last_value(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 20  ``` > SELECT last_value(col) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: NULL  ``` > SELECT last_value(col, true) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: 5 |
| `LEFT()` | left(str, len) - Returns the left most len (lencan be string type) characters from the stringstr,if len is less or equal than 0 the result is an empty string. | ``` > SELECT left('Spark SQL', 3); ```  Result: Spa  ``` > SELECT left(encode('Spark SQL', 'utf-8'), 3); ```  Result: Spa |
| `LEN()` | len(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT len('Spark SQL '); ```  Result: 10  ``` > SELECT len(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `LENGTH()` | length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT length('Spark SQL '); ```  Result: 10  ``` > SELECT length(x'537061726b2053514c'); ```  Result: 10  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 9  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `LIKE()` | str like pattern[ ESCAPE escape] - Returns true if str matches pattern with escape, null if any arguments are null, false otherwise. | ``` > SELECT like('Spark', '_park'); ```  Result: true  ``` > SELECT '\\\\abc' AS S, S like r'\\\\abc', S like '\\\\\\\\abc'; ```  Result: \abc true true  ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT '%SystemDrive%\\Users\\John' like '\\%SystemDrive\\%\\\\Users%'; ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT '%SystemDrive%\\\\Users\\\\John' like r'%SystemDrive%\\\\Users%'; ```  Result: true  ``` > SELECT '%SystemDrive%/Users/John' like '/%SystemDrive/%//Users%' ESCAPE '/'; ```  Result: true |
| `LISTAGG()` | listagg(expr[, delimiter])[ WITHIN GROUP (ORDER BY key [ASC | DESC] [,...])] - Returnsthe concatenation of non-NULL input values, separated by the delimiter ordered by key. If all values are NULL, NULL is returned. | ``` > SELECT listagg(col) FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: abc  ``` > SELECT listagg(col) WITHIN GROUP (ORDER BY col DESC) FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: cba  ``` > SELECT listagg(col) FROM VALUES ('a'), (NULL), ('b') AS tab(col); ```  Result: ab  ``` > SELECT listagg(col) FROM VALUES ('a'), ('a') AS tab(col); ```  Result: aa  ``` > SELECT listagg(DISTINCT col) FROM VALUES ('a'), ('a'), ('b') AS tab(col); ```  Result: ab  ``` > SELECT listagg(col, ', ') FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: a, b, c  ``` > SELECT listagg(col) FROM VALUES (NULL), (NULL) AS tab(col); ```  Result: NULL |
| `LOG()` | log(base, expr) - Returns the logarithm of expr with base. | ``` > SELECT log(10, 100); ```  Result: 2.0 |
| `LOG2()` | log2(expr) - Returns the logarithm of expr with base 2. | ``` > SELECT log2(2); ```  Result: 1.0 |
| `LOWER()` | lower(str) - Returns str with all characters changed to lowercase. | ``` > SELECT lower('SparkSql'); ```  Result: sparksql |
| `LPAD()` | lpad(str, len[, pad]) - Returnsstr, left-padded with pad to a length o flen.If str is longer than len, the return value is shortened to len characters or bytes. If pad is not specified, str will be padded to the left with space characters if it is a character string, and with zeros if it is a byte sequence. | ``` > SELECT lpad('hi', 5, '??'); ```  Result: ???hi  ``` > SELECT lpad('hi', 1, '??'); ```  Result: h  ``` > SELECT lpad('hi', 5); ```  Result: hi  ``` > SELECT hex(lpad(unhex('aabb'), 5)); ```  Result: 000000AABB  ``` > SELECT hex(lpad(unhex('aabb'), 5, unhex('1122'))); ```  Result: 112211AABB |
| `LTRIM()` | ltrim(str) - Removes the leading space characters from str. | ``` > SELECT ltrim('    SparkSQL   '); ```  Result: SparkSQL |
| `MEDIAN()` | median(col) - Returns the median of numeric or ANSI interval columncol. | ``` > SELECT median(col) FROM VALUES (0), (10) AS tab(col); ```  Result: 5.0  ``` > SELECT median(col) FROM VALUES (INTERVAL '0' MONTH), (INTERVAL '10' MONTH) AS tab(col); ```  Result: 0-5 |
| `MIN()` | min(expr) - Returns the minimum value of expr. | ``` > SELECT min(col) FROM VALUES (10), (-1), (20) AS tab(col); ```  Result: -1 |
| `MINUTE()` | minute(timestamp) - Returns the minute component of the string/timestamp. | ``` > SELECT minute('2009-07-30 12:58:59'); ```  Result: 58 |
| `MOD()` | expr1 % expr2, or mod(expr1, expr2) - Returns the remainder after expr1/expr2. | ``` > SELECT 2 % 1.8; ```  Result: 0.2  ``` > SELECT MOD(2, 1.8); ```  Result: 0.2 |
| `MONTH()` | month(date) - Returns the month component of the date/timestamp. | ``` > SELECT month('2016-07-30'); ```  Result: 7 |
| `MONTHS_BETWEEN()` | months\_between(timestamp1, timestamp2[, roundOff]) - If timestamp 1is later than timestamp 2, then the result is positive. If timestamp1 and timestamp2are on the same day of month, or both are the last day of month, time of day will be ignored. Otherwise, the difference is calculated based on 31 days per month, and rounded to 8 digits unless roundOff=false. | ``` > SELECT months_between('1997-02-28 10:30:00', '1996-10-30'); ```  Result: 3.94959677  ``` > SELECT months_between('1997-02-28 10:30:00', '1996-10-30', false); ```  Result: 3.9495967741935485 |
| `NOT()` | not expr - Logical not. | ``` > SELECT not true; ```  Result: false  ``` > SELECT not false; ```  Result: true  ``` > SELECT not NULL; ```  Result: NULL |
| `NOW()` | now() - Returns the current timestamp at the start of query evaluation. | ``` > SELECT now(); ```  Result: 2020-04-25 15:49:11.914 |
| `NULLIF()` | nullif(expr1, expr2) - Returns null if expr1 equals to expr2, or expr1 otherwise. | ``` > SELECT nullif(2, 2); ```  Result: NULL |
| `OR()` | expr1 or expr2 - Logical OR. | ``` > SELECT true or false; ```  Result: true  ``` > SELECT false or false; ```  Result: false  ``` > SELECT true or NULL; ```  Result: true  ``` > SELECT false or NULL; ```  Result: NULL |
| `POSITION()` | position(substr, str[, pos]) - Returns the position of the first occurrence of substrin str after positionpos. The given pos and return value are 1-based. | ``` > SELECT position('bar', 'foobarbar'); ```  Result: 4  ``` > SELECT position('bar', 'foobarbar', 5); ```  Result: 7  ``` > SELECT POSITION('bar' IN 'foobarbar'); ```  Result: 4 |
| `POWER()` | power(expr1, expr2) - Raises expr1 to the power of expr2. | ``` > SELECT power(2, 3); ```  Result: 8.0 |
| `RAND()` | rand([seed]) - Returns a random value with independent and identically distributed (i.i.d.) uniformly distributed values in [0, 1). | ``` > SELECT rand(); ```  Result: 0.9629742951434543  ``` > SELECT rand(0); ```  Result: 0.7604953758285915  ``` > SELECT rand(null); ```  Result: 0.7604953758285915 |
| `RANDN()` | randn([seed]) - Returns a random value with independent and identically distributed (i.i.d.) values drawn from the standard normal distribution. | ``` > SELECT randn(); ```  Result: -0.3254147983080288  ``` > SELECT randn(0); ```  Result: 1.6034991609278433  ``` > SELECT randn(null); ```  Result: 1.6034991609278433 |
| `RANDOM()` | random([seed]) - Returns a random value with independent and identically distributed (i.i.d.) uniformly distributed values in [0, 1). | ``` > SELECT random(); ```  Result: 0.9629742951434543  ``` > SELECT random(0); ```  Result: 0.7604953758285915  ``` > SELECT random(null); ```  Result: 0.7604953758285915 |
| `RANK()` | rank() - Computes the rank of a value in a group of values. The result is one plus the numberof rows preceding or equal to the current row in the ordering of the partition. The values will produce gaps in the sequence. | ``` > SELECT a, b, rank(b) OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 1  A1 1 1  A1 2 3  A2 3 1 |
| `REGEXP_EXTRACT()` | regexp\_extract(str, regexp[, idx]) - Extract the first string in the str that match the reg exp expression and corresponding to the regex group index. | ``` > SELECT regexp_extract('100-200', '(\\\\d+)-(\\\\d+)', 1); ```  Result: 100  ``` > SELECT regexp_extract('100-200', r'(\\d+)-(\\d+)', 1); ```  Result: 100 |
| `REGEXP_EXTRACT_ALL()` | regexp\_extract\_all(str, regexp[, idx]) - Extract all strings in the str that match the reg exp expression and corresponding to the regex group index. | ``` > SELECT regexp_extract_all('100-200, 300-400', '(\\\\d+)-(\\\\d+)', 1); ```  Result: ["100","300"]  ``` > SELECT regexp_extract_all('100-200, 300-400', r'(\\d+)-(\\d+)', 1); ```  Result: ["100","300"] |
| `REGEXP_LIKE()` | regexp\_like(str, regexp) - Returns true if str matches reg exp, or false otherwise. | ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT regexp_like('%SystemDrive%\\Users\\John', '%SystemDrive%\\\\Users.*'); ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; Result: spark.sql.parser.escapedStringLiterals  false ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT regexp_like('%SystemDrive%\\\\Users\\\\John', '%SystemDrive%\\\\\\\\Users.*'); ```  Result: true  ``` > SELECT regexp_like('%SystemDrive%\\\\Users\\\\John', r'%SystemDrive%\\\\Users.*'); ```  Result: true |
| `REPLACE()` | replace(str, search[, replace]) - Replaces all occurrences of search with replace. | ``` > SELECT replace('ABCabc', 'abc', 'DEF'); ```  Result: ABCDEF |
| `RIGHT()` | right(str, len) - Returns the rightmostlen(lencan be string type) characters from the string str, if len is less or equal than 0 the result is an empty string. | ``` > SELECT right('Spark SQL', 3); ```  Result: SQL |
| `RLIKE()` | rlike(str, regexp) - Returns true if str matches reg exp, or false otherwise. | ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT rlike('%SystemDrive%\\Users\\John', '%SystemDrive%\\\\Users.*'); ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT rlike('%SystemDrive%\\\\Users\\\\John', '%SystemDrive%\\\\\\\\Users.*'); ```  Result: true  ``` > SELECT rlike('%SystemDrive%\\\\Users\\\\John', r'%SystemDrive%\\\\Users.*'); ```  Result: true |
| `ROUND()` | round(expr, d) - Returns expr rounded to decimal places using HALF\_UP rounding mode. | ``` > SELECT round(2.5, 0); ```  Result: 3 |
| `ROW_NUMBER()` | row\_number() - Assigns a unique, sequential number to each row, starting with one,according to the ordering of rows within the window partition. | ``` > SELECT a, b, row_number() OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 1  A1 1 2  A1 2 3  A2 3 1 |
| `SECOND()` | second(timestamp) - Returns the second component of the string/timestamp. | ``` > SELECT second('2009-07-30 12:58:59'); ```  Result: 59 |
| `SEQUENCE()` | sequence(start, stop, step) - Generates an array of elements from start to stop (inclusive), incrementing by step. The type of the returned elements is the same as the type of argument expressions. | ``` > SELECT sequence(1, 5); ```  Result: [1,2,3,4,5]  ``` > SELECT sequence(5, 1); ```  Result: [5,4,3,2,1]  ``` > SELECT sequence(to_date('2018-01-01'), to_date('2018-03-01'), interval 1 month); ```  Result: [2018-01-01,2018-02-01,2018-03-01]  ``` > SELECT sequence(to_date('2018-01-01'), to_date('2018-03-01'), interval '0-1' year to month); ```  Result: [2018-01-01,2018-02-01,2018-03-01] |
| `SHA()` | sha(expr) - Returns a sha1 hash value as a hex string of the expr. | ``` > SELECT sha('Spark'); ```  Result: 85f5955f4b27a9a4c2aab6ffe5d7189fc298b92c |
| `SHIFTLEFT()` | base shiftleft exp - Bitwise left shift. | ``` > SELECT shiftleft(2, 1); ```  Result: 4  ``` > SELECT 2 << 1; ```  Result: 4 |
| `SHIFTRIGHT()` | base shiftright expr - Bitwise (signed) right shift. | ``` > SELECT shiftright(4, 1); ```  Result: 2  ``` > SELECT 4 >> 1; ```  Result: 2 |
| `SPLIT()` | split(str, regex, limit) - Splits str around occurrences that match reg ex and returns an array with a length of at most limit | ``` > SELECT split('oneAtwoBthreeC', '[ABC]'); ```  Result: ["one","two","three",""]  ``` > SELECT split('oneAtwoBthreeC', '[ABC]', -1); ```  Result: ["one","two","three",""]  ``` > SELECT split('oneAtwoBthreeC', '[ABC]', 2); ```  Result: ["one","twoBthreeC"] |
| `SPLIT_PART()` | split\_part(str, delimiter, partNum) - Splits str by delimiter and return requested part of the split (1-based). If any input is null, returns null. If part Num is out of range of split parts, returns empty string. If part Num is 0 ,throws an error. If part Num is negative, the parts are counted backward from the end of the string. If the delimiter is an empty string, the str is not split. | ``` > SELECT split_part('11.12.13', '.', 3); ```  Result: 13 |
| `SUBSTRING()` | substring(str, pos[, len]) - Returns the substring of str that starts at pos and is of length len, or the slice of byte array that starts at pos and is of length len. | ``` > SELECT substring('Spark SQL', 5); ```  Result: k SQL  ``` > SELECT substring('Spark SQL', -3); ```  Result: SQL  ``` > SELECT substring('Spark SQL', 5, 1); ```  Result: k  ``` > SELECT substring('Spark SQL' FROM 5); ```  Result: k SQL  ``` > SELECT substring('Spark SQL' FROM -3); ```  Result: SQL  ``` > SELECT substring('Spark SQL' FROM 5 FOR 1); ```  Result: k  ``` > SELECT substring(encode('Spark SQL', 'utf-8'), 5); ```  Result: k SQL |
| `SUM()` | sum(expr) - Returns the sum calculated from values of a group. | ``` > SELECT sum(col) FROM VALUES (5), (10), (15) AS tab(col); ```  Result: 30  ``` > SELECT sum(col) FROM VALUES (NULL), (10), (15) AS tab(col); ```  Result: 25  ``` > SELECT sum(col) FROM VALUES (NULL), (NULL) AS tab(col); ```  Result: NULL |
| `TO_CHAR()` | to\_char(expr, format) - Convertexprto a string based on theformat. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input value, generating a result string of the same length as the corresponding sequence in the format string. The result string is left-padded with zeros if the 0/9 sequence comprises more digits than the matching part of the decimal value, starts with 0, and is before the decimal point. Otherwise, it is padded with spaces. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' prints '+' for positive values but 'MI' prints a space. 'PR': Only allowed at the end of the format string; specifies that the result string will be wrapped by angle brackets if the input value is negative. ('&lt;1&gt;'). Ifexpris a datetime,formatshall be a valid datetime pattern, seeDatetime Patterns. Ifexpris a binary, it is converted to a string in one of the formats: 'base64': a base 64 string. 'hex': a string in the hexadecimal format. 'utf-8': the input binary is decoded to UTF-8 string. | ``` > SELECT to_char(454, '999'); ```  Result: 454  ``` > SELECT to_char(454.00, '000D00'); ```  Result: 454.00  ``` > SELECT to_char(12454, '99G999'); ```  Result: 12,454  ``` > SELECT to_char(78.12, '$99.99'); ```  Result: $78.12  ``` > SELECT to_char(-12454.8, '99G999D9S'); ```  Result: 12,454.8-  ``` > SELECT to_char(date'2016-04-08', 'y'); ```  Result: 2016  ``` > SELECT to_char(x'537061726b2053514c', 'base64'); ```  Result: U3BhcmsgU1FM  ``` > SELECT to_char(x'537061726b2053514c', 'hex'); ```  Result: 537061726B2053514C  ``` > SELECT to_char(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc |
| `TO_DATE()` | to\_date(date\_str[, fmt]) - Parses the date\_str expression with the fmt expression to a date. Returns null with invalid input. By default, it follows casting rules to a date if the fmt is omitted. | ``` > SELECT to_date('2009-07-30 04:17:52'); ```  Result: 2009-07-30  ``` > SELECT to_date('2016-12-31', 'yyyy-MM-dd'); ```  Result: 2016-12-31 |
| `TO_NUMBER()` | to\_number(expr, fmt) - Convert string 'expr' to a number based on the string format 'fmt'. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input string. If the 0/9 sequence starts with 0 and is before the decimal point, it can only match a digit sequence of the same size. Otherwise, if the sequence starts with 9 or is after the decimal point, it can match a digit sequence that has the same or smaller size. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. 'expr' must match the grouping separator relevant for the size of the number. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' allows '-' but 'MI' does not. 'PR': Only allowed at the end of the format string; specifies that 'expr' indicates a negative number with wrapping angled brackets. ('&lt;1&gt;'). | ``` > SELECT to_number('454', '999'); ```  Result: 454  ``` > SELECT to_number('454.00', '000.00'); ```  Result: 454.00  ``` > SELECT to_number('12,454', '99,999'); ```  Result: 12454  ``` > SELECT to_number('$78.12', '$99.99'); ```  Result: 78.12  ``` > SELECT to_number('12,454.8-', '99,999.9S'); ```  Result: -12454.8 |
| `TO_TIMESTAMP()` | to\_timestamp(timestamp\_str[, fmt]) - Parses thetimestamp\_strexpression with thefmtexpression to a timestamp. Returns null with invalid input. By default, it follows casting rules to a timestamp if thefmtis omitted. The result data type is consistent with the value of configurationspark.sql.timestampType. | ``` > SELECT to_timestamp('2016-12-31 00:12:00'); ```  Result: 2016-12-31 00:12:00  ``` > SELECT to_timestamp('2016-12-31', 'yyyy-MM-dd'); ```  Result: 2016-12-31 00:00:00 |
| `TO\_UNIX\_TIMESTAMP()` | Converts a timestamp or date string to a UNIX timestamp (seconds since 1970-01-01 00:00:00 UTC). If a format string fmt is provided, it is used to parse the input. Returns null with invalid input. | ``` SELECT TO_UNIX_TIMESTAMP('2026-03-17 11:00:00'to\_unix\_timestamp(\[timeExp\[, fmt\]\]) ```  Result: 1773745200 |
| `TO_VARCHAR()` | to\_varchar(expr, format) - Convertexprto a string based on theformat. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input value, generating a result string of the same length as the corresponding sequence in the format string. The result string is left-padded with zeros if the 0/9 sequence comprises more digits than the matching part of the decimal value, starts with 0, and is before the decimal point. Otherwise, it is padded with spaces. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' prints '+' for positive values but 'MI' prints a space. 'PR': Only allowed at the end of the format string; specifies that the result string will be wrapped by angle brackets if the input value is negative. ('&lt;1&gt;'). Ifexpris a datetime,formatshall be a valid datetime pattern, seeDatetime Patterns. Ifexpris a binary, it is converted to a string in one of the formats: 'base64': a base 64 string. 'hex': a string in the hexadecimal format. 'utf-8': the input binary is decoded to UTF-8 string. | ``` > SELECT to_varchar(454, '999'); ```  Result: 454  ``` > SELECT to_varchar(454.00, '000D00'); ```  Result: 454.00  ``` > SELECT to_varchar(12454, '99G999'); ```  Result: 12,454  ``` > SELECT to_varchar(78.12, '$99.99'); ```  Result: $78.12  ``` > SELECT to_varchar(-12454.8, '99G999D9S'); ```  Result: 12,454.8-  ``` > SELECT to_varchar(date'2016-04-08', 'y'); ```  Result: 2016  ``` > SELECT to_varchar(x'537061726b2053514c', 'base64'); ```  Result: U3BhcmsgU1FM  ``` > SELECT to_varchar(x'537061726b2053514c', 'hex'); ```  Result: 537061726B2053514C  ``` > SELECT to_varchar(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc |
| `TRIM()` | trim(str) - Removes the leading and trailing space characters fromstr. | ``` > SELECT trim('    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(BOTH FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(LEADING FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(TRAILING FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim('SL' FROM 'SSparkSQLS'); ```  Result: parkSQ  ``` > SELECT trim(BOTH 'SL' FROM 'SSparkSQLS'); ```  Result: parkSQ  ``` > SELECT trim(LEADING 'SL' FROM 'SSparkSQLS'); ```  Result: parkSQLS  ``` > SELECT trim(TRAILING 'SL' FROM 'SSparkSQLS'); ```  Result: SSparkSQ |
| `TRUNC()` | trunc(date, fmt) - Returns date with the time portion of the day truncated to the unit specified by the format model fmt. | ``` > SELECT trunc('2019-08-04', 'week'); ```  Result: 2019-07-29  ``` > SELECT trunc('2019-08-04', 'quarter'); ```  Result: 2019-07-01  ``` > SELECT trunc('2009-02-12', 'MM'); ```  Result: 2009-02-01  ``` > SELECT trunc('2015-10-27', 'YEAR'); ```  Result: 2015-01-01 |
| `TRY\_TO\_TIMESTAMP()` | Parses the timestamp\\_str expression with the fmt expression to a timestamp. Returns null with invalid input instead of throwing an error. By default, it follows casting rules to a timestamp if the fmt is omitted. This is the error-safe version of to\\_timestamp. | ``` try\_to\_timestamp(timestamp\_str\[, fmt\]) ```  Result: NULL |
| `UNIX_DATE()` | unix\_date(date) - Returns the number of days since 1970-01-01. | ``` > SELECT unix_date(DATE("1970-01-02")); ```  Result: 1 |
| `UNIX_SECONDS()` | unix\_seconds(timestamp) - Returns the number of seconds since 1970-01-01 00:00:00 UTC. Truncates higher levels of precision. | ``` > SELECT unix_seconds(TIMESTAMP('1970-01-01 00:00:01Z')); ```  Result: 1 |
| `UNIX_TIMESTAMP()` | unix\_timestamp([timeExp[, fmt]]) - Returns the UNIX timestamp of current or specified time. | ``` > SELECT unix_timestamp(); ```  Result: 1476884637  ``` > SELECT unix_timestamp('2016-04-08', 'yyyy-MM-dd'); ```  Result: 1460041200 |
| `UPPER()` | upper(str) - Returns str with all characters changed to uppercase. | ``` > SELECT upper('SparkSql'); ```  Result: SPARKSQL |
| `UUID()` | uuid() - Returns an universally unique identifier (UUID) string. The value is returned as a canonical UUID 36-character string. | ``` > SELECT uuid(); ```  Result: 46707d92-02f4-4817-8116-a4c3b23e6266 |
| `WEEKDAY()` | weekday(date) - Returns the day of the week for date/timestamp (0 = Monday, 1 = Tuesday, ..., 6 = Sunday). | ``` > SELECT weekday('2009-07-30'); ```  Result: 3 |
| `WEEKOFYEAR()` | weekofyear(date) - Returns the week of the year of the given date. A week is considered to start on a Monday and week 1 is the first week with &gt;3 days. | ``` > SELECT weekofyear('2008-02-20'); ```  Result: 8 |
| `WHEN()` | CASE WHEN expr1 THEN expr2 [WHEN expr3 THEN expr4]\* [ELSE expr5] END - Whenexpr1= true, returns expr2; else when expr3= true, returns expr4; else returns expr5. | ``` > SELECT CASE WHEN 1 > 0 THEN 1 WHEN 2 > 0 THEN 2.0 ELSE 1.2 END; ```  Result: 1.0  ``` > SELECT CASE WHEN 1 < 0 THEN 1 WHEN 2 > 0 THEN 2.0 ELSE 1.2 END; ```  Result: 2.0  ``` > SELECT CASE WHEN 1 < 0 THEN 1 WHEN 2 < 0 THEN 2.0 END; ```  Result: NULL |
| `YEARS()` | year(date) - Returns the year component of the date/timestamp. | ``` > SELECT year('2016-07-30'); ```  Result: 2016 |

| Function | Description | Example |
| --- | --- | --- |
| `ABS()` | abs(expr) - Returns the absolute value of the numeric or interval value. | ``` > SELECT abs(-1); ```  Result: 1  ``` > SELECT abs(INTERVAL -'1-1' YEAR TO MONTH); ```  Result: 1-1 |
| `ADD_MONTHS()` | add\_months(start\_date, num\_months) - Returns the date that isnum\_monthsafterstart\_date. | ``` > SELECT add_months('2016-08-31', 1); ```  Result: 2016-09-30 |
| `AGGREGATE()` | aggregate(expr, start, merge, finish) - Applies a binary operator to an initial state and all elements in the array, and reduces this to a single state. The final state is converted into the final result by applying a finish function. | ``` > SELECT aggregate(array(1, 2, 3), 0, (acc, x) -> acc + x); ```  Result: 6  ``` > SELECT aggregate(array(1, 2, 3), 0, (acc, x) -> acc + x, acc -> acc * 10); ```  Result: 60 |
| `AND()` | expr1 and expr2 - Logical AND. | ``` > SELECT true and true; ```  Result: true  ``` > SELECT true and false; ```  Result: false  ``` > SELECT true and NULL; ```  Result: NULL  ``` > SELECT false and NULL; ```  Result: False |
| `ANY()` | any(expr) - Returns true if at least one value of expr is true. | ``` > SELECT any(col) FROM VALUES (true), (false), (false) AS tab(col); ```  Result: true  ``` > SELECT any(col) FROM VALUES (NULL), (true), (false) AS tab(col); ```  Result: true  ``` > SELECT any(col) FROM VALUES (false), (false), (NULL) AS tab(col); ```  Result: false |
| `ANY_VALUE()` | any\_value(expr[, isIgnoreNull]) - Returns some value ofexprfor a group of rows. IfisIgnoreNullis true, returns only non-null values. | ``` > SELECT any_value(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 10  ``` > SELECT any_value(col) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: NULL  ``` > SELECT any_value(col, true) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: 5 |
| `ARRAY()` | array(expr, ...) - Returns an array with the given elements. | ``` > SELECT array(1, 2, 3); ```  Result: [1,2,3] |
| `AVG()` | avg(expr) - Returns the mean calculated from values of a group. | ``` > SELECT avg(col) FROM VALUES (1), (2), (3) AS tab(col); ```  Result: 2.0  ``` > SELECT avg(col) FROM VALUES (1), (2), (NULL) AS tab(col); ```  Result: 1.5 |
| `BASE64()` | base64(bin) - Converts the argument from a binary b into a base 64 string. | ``` > SELECT base64('Spark SQL'); ```  Result: U3BhcmsgU1FM  ``` > SELECT base64(x'537061726b2053514c'); ```  Result: U3BhcmsgU1FM |
| `BETWEEN()` | input [NOT] between lower AND upper - evaluate if input is [not] in between lower and upper | ``` > SELECT 0.5 between 0.1 AND 1.0; ```  Result: true |
| `BOOL_AND()` | bool\_and(expr) - Returns true if all values of expr are true. | ``` > SELECT bool_and(col) FROM VALUES (true), (true), (true) AS tab(col); ```  Result: true  ``` > SELECT bool_and(col) FROM VALUES (NULL), (true), (true) AS tab(col); ```  Result: true  ``` > SELECT bool_and(col) FROM VALUES (true), (false), (true) AS tab(col); ```  Result: false |
| `BOOL_OR()` | bool\_or(expr) - Returns true if at least one value of expr is true. | ``` > SELECT bool_or(col) FROM VALUES (true), (false), (false) AS tab(col); ```  Result: true  ``` > SELECT bool_or(col) FROM VALUES (NULL), (true), (false) AS tab(col); ```  Result: true  ``` > SELECT bool_or(col) FROM VALUES (false), (false), (NULL) AS tab(col); ```  Result: false |
| `CASE()` | CASE expr1 WHEN expr2 THEN expr3 [WHEN expr4 THEN expr5]\* [ELSE expr6] END - Whenexpr1=expr2, returnsexpr3; whenexpr1=expr4, returnexpr5; else returnexpr6. | ``` > SELECT CASE col1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' ELSE '?' END FROM VALUES 1, 2, 3; ```  Result: one  two  ?  ``` > SELECT CASE col1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' END FROM VALUES 1, 2, 3; ```  Result: one  two  NULL |
| `CAST()` | cast(expr AS type) - Casts the valueexprto the target data typetype.expr::typealternative casting syntax is also supported. | ``` > SELECT cast('10' as int); ```  Result: 10  ``` > SELECT '10' :: int; ```  Result: 10 |
| `CHAR()` | char(expr) - Returns the ASCII character having the binary equivalent to expr. If n is larger than 256 the result is equivalent to chr(n % 256) | ``` > SELECT char(65); ```  Result: A |
| `CHAR_LENGTH()` | char\_length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT char_length('Spark SQL '); ```  Result: 10  ``` > SELECT char_length(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `CHARACTER_LENGTH()` | character\_length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT character_length('Spark SQL '); ```  Result: 10  ``` > SELECT character_length(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `CHR()` | chr(expr) - Returns the ASCII character having the binary equivalent to expr. If n is larger than 256 the result is equivalent to chr(n % 256) | ``` > SELECT chr(65); ```  Result: A |
| `COALESCE()` | coalesce(expr1, expr2, ...) - Returns the first non-null argument if exists. Otherwise, null. | ``` > SELECT coalesce(NULL, 1, NULL); ```  Result: 1 |
| `CONCAT()` | concat(col1, col2, ..., colN) - Returns the concatenation of col1, col2, ..., colN. | ``` > SELECT concat('Spark', 'SQL'); ```  Result: SparkSQL  ``` > SELECT concat(array(1, 2, 3), array(4, 5), array(6)); ```  Result: [1,2,3,4,5,6] |
| `CONCAT_WS()` | concat\_ws(sep[, str | array(str)]+) - Returns the concatenation of the strings separated bysep, skipping null values. | ``` > SELECT concat_ws(' ', 'Spark', 'SQL'); ```  Result: Spark SQL  ``` > SELECT concat_ws('s'); ```  Result:  ``` > SELECT concat_ws('/', 'foo', null, 'bar'); ```  Result: foo/bar  ``` > SELECT concat_ws(null, 'Spark', 'SQL'); ```  Result: NULL |
| `CONTAINS()` | contains(left, right) - Returns a boolean. The value is True if right is found inside left.Returns NULL if either input expression is NULL. Otherwise, returns False.Both left or right must be of STRING or BINARY type. | ``` > SELECT contains('Spark SQL', 'Spark'); ```  Result: true  ``` > SELECT contains('Spark SQL', 'SPARK'); ```  Result: false  ``` > SELECT contains('Spark SQL', null); ```  Result: NULL  ``` > SELECT contains(x'537061726b2053514c', x'537061726b'); ```  Result: true |
| `COUNT()` | count(\*) - Returns the total number of retrieved rows, including rows containing null. | ``` > SELECT count(*) FROM VALUES (NULL), (5), (5), (20) AS tab(col); ```  Result: 4  ``` > SELECT count(col) FROM VALUES (NULL), (5), (5), (20) AS tab(col); ```  Result: 3  ``` > SELECT count(DISTINCT col) FROM VALUES (NULL), (5), (5), (10) AS tab(col); ```  Result: 2 |
| `CURRENT_DATE()` | current\_date() - Returns the current date at the start of query evaluation. All calls of current\_date within the same query return the same value. | ``` > SELECT current_date(); ```  Result: 2020-04-25  ``` > SELECT current_date; ```  Result: 2020-04-25 |
| `CURRENT_SCHEMA()` | current\_schema() - Returns the current database. | ``` > SELECT current_schema(); ```  Result: default |
| `CURRENT_TIMESTAMP()` | current\_timestamp() - Returns the current timestamp at the start of query evaluation. All calls of current\_timestamp within the same query return the same value. | ``` > SELECT current_timestamp(); ```  Result: 2020-04-25 15:49:11.914  ``` > SELECT current_timestamp; ```  Result: 2020-04-25 15:49:11.914 |
| `DATE()` | date(expr) - Casts the value expr to the target data typedate. | ``` > SELECT DATE('2016-07-30'); ```  Result: 2016-07-31 |
| `DATE_DIFF()` | date\_diff(endDate, startDate) - Returns the number of days from startDate to endDate. | ``` > SELECT date_diff('2009-07-31', '2009-07-30'); ```  Result: 1  ``` > SELECT date_diff('2009-07-30', '2009-07-31'); ```  Result: -1 |
| `DATE_TRUNC()` | date\_trunc(fmt, ts) - Returns timestamptstruncated to the unit specified by the format modelfmt. | ``` > SELECT date_trunc('YEAR', '2015-03-05T09:32:05.359'); ```  Result: 2015-01-01 00:00:00  ``` > SELECT date_trunc('MM', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-01 00:00:00  ``` > SELECT date_trunc('DD', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-05 00:00:00  ``` > SELECT date_trunc('HOUR', '2015-03-05T09:32:05.359'); ```  Result: 2015-03-05 09:00:00  ``` > SELECT date_trunc('MILLISECOND', '2015-03-05T09:32:05.123456'); ```  Result: 2015-03-05 09:32:05.123 |
| `DATEADD()` | dateadd(start\_date, num\_days) - Returns the date that is num\_days after start\_date. | ``` > SELECT dateadd('2016-07-30', 1); ```  Result: 2016-07-31 |
| `DATEDIFF()` | datediff(endDate, startDate) - Returns the number of days from startDate to endDate. | ``` > SELECT datediff('2009-07-31', '2009-07-30'); ```  Result: 1  ``` > SELECT datediff('2009-07-30', '2009-07-31'); ```  Result: -1 |
| `DAY()` | day(date) - Returns the day of month of the date/timestamp. | ``` > SELECT day('2009-07-30'); ```  Result: 30 |
| `DAYOFMONTH()` | dayofmonth(date) - Returns the day of month of the date/timestamp. | ``` > SELECT dayofmonth('2009-07-30'); ```  Result: 30 |
| `DAYOFWEEK()` | dayofweek(date) - Returns the day of the week for date/timestamp (1 = Sunday, 2 = Monday, ..., 7 = Saturday). | ``` > SELECT dayofweek('2009-07-30'); ```  Result: 5 |
| `DAYOFYEAR()` | dayofyear(date) - Returns the day of year of the date/timestamp. | ``` > SELECT dayofyear('2016-04-09'); ```  Result: 100 |
| `DECODE()` | decode(bin, charset) - Decodes the first argument using the second argument character set. If either argument is null, the result will also be null. | ``` > SELECT decode(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc  ``` > SELECT decode(2, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle', 'Non domestic'); ```  Result: San Francisco  ``` > SELECT decode(6, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle', 'Non domestic'); ```  Result: Non domestic  ``` > SELECT decode(6, 1, 'Southlake', 2, 'San Francisco', 3, 'New Jersey', 4, 'Seattle'); ```  Result: NULL  ``` > SELECT decode(null, 6, 'Spark', NULL, 'SQL', 4, 'rocks'); ```  Result: SQL |
| `DIV()` | expr1 div expr2 - Divide expr1 by expr2. It returns NULL if an operand is NULL or expr2 is 0. The result is casted to long. | ``` > SELECT 3 div 2; ```  Result: 1  ``` > SELECT INTERVAL '1-1' YEAR TO MONTH div INTERVAL '-1' MONTH; ```  Result: -13 |
| `ENCODE()` | encode(str, charset) - Encodes the first argument using the second argument character set. If either argument is null, the result will also be null. | ``` > SELECT encode('abc', 'utf-8'); ```  Result: abc |
| `EXISTS()` | exists(expr, pred) - Tests whether a predicate holds for one or more elements in the array. | ``` > SELECT exists(array(1, 2, 3), x -> x % 2 == 0); ```  Result: true  ``` > SELECT exists(array(1, 2, 3), x -> x % 2 == 10); ```  Result: false  ``` > SELECT exists(array(1, null, 3), x -> x % 2 == 0); ```  Result: NULL  ``` > SELECT exists(array(0, null, 2, 3, null), x -> x IS NULL); ```  Result: true  ``` > SELECT exists(array(1, 2, 3), x -> x IS NULL); ```  Result: false |
| `EXTRACT()` | extract(field FROM source) - Extracts a part of the date/timestamp or interval source. | ``` > SELECT extract(YEAR FROM TIMESTAMP '2019-08-12 01:00:00.123456'); ```  Result: 2019  ``` > SELECT extract(week FROM timestamp'2019-08-12 01:00:00.123456'); ```  Result: 33  ``` > SELECT extract(doy FROM DATE'2019-08-12'); ```  Result: 224  ``` > SELECT extract(SECONDS FROM timestamp'2019-10-01 00:00:01.000001'); ```  Result: 1.000001  ``` > SELECT extract(days FROM interval 5 days 3 hours 7 minutes); ```  Result: 5  ``` > SELECT extract(seconds FROM interval 5 hours 30 seconds 1 milliseconds 1 microseconds); ```  Result: 30.001001  ``` > SELECT extract(MONTH FROM INTERVAL '2021-11' YEAR TO MONTH); ```  Result: 11  ``` > SELECT extract(MINUTE FROM INTERVAL '123 23:55:59.002001' DAY TO SECOND); ```  Result: 55 |
| `FIRST()` | first(expr[, isIgnoreNull]) - Returns the first value of expr for a group of rows. If is IgnoreNull is true, returns only non-null values. | ``` > SELECT first(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 10  ``` > SELECT first(col) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: NULL  ``` > SELECT first(col, true) FROM VALUES (NULL), (5), (20) AS tab(col); ```  Result: 5 |
| `HEX()` | hex(expr) - Converts expr to hexadecimal. | ``` > SELECT hex(17); ```  Result: 11  ``` > SELECT hex('Spark SQL'); ```  Result: 537061726B2053514C |
| `HOUR()` | hour(timestamp) - Returns the hour component of the string/timestamp. | ``` > SELECT hour('2009-07-30 12:58:59'); ```  Result: 12 |
| `IF()` | if(expr1, expr2, expr3) - If expr1 evaluates to true, then returns expr2; otherwise returns expr3. | ``` > SELECT if(1 < 2, 'a', 'b'); ```  Result: a |
| `IFNULL()` | ifnull(expr1, expr2) - Returns expr2 if expr1is null, or expr1 otherwise. | ``` > SELECT ifnull(NULL, array('2')); ```  Result: ["2"] |
| `ILIKE()` | str ilike pattern[ ESCAPE escape] - Returns true if str matches pattern with escapecase-insensitively, null if any arguments are null, false otherwise. | ``` > SELECT ilike('Spark', '_Park'); ```  Result: true  ``` > SELECT '\\\\abc' AS S, S ilike r'\\\\abc', S ilike '\\\\\\\\abc'; ```  Result: \abc true true  ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT '%SystemDrive%\\Users\\John' ilike '\\%SystemDrive\\%\\\\users%'; ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT '%SystemDrive%\\\\USERS\\\\John' ilike r'%SystemDrive%\\\\Users%'; ```  Result: true  ``` > SELECT '%SystemDrive%/Users/John' ilike '/%SYSTEMDrive/%//Users%' ESCAPE '/'; ```  Result: true |
| `IN()` | expr1 in(expr2, expr3, ...) - Returns true if expr equals to any valN. | ``` > SELECT 1 in(1, 2, 3); ```  Result: true  ``` > SELECT 1 in(2, 3, 4); ```  Result: false  ``` > SELECT named_struct('a', 1, 'b', 2) in(named_struct('a', 1, 'b', 1), named_struct('a', 1, 'b', 3)); ```  Result: false  ``` > SELECT named_struct('a', 1, 'b', 2) in(named_struct('a', 1, 'b', 2), named_struct('a', 1, 'b', 3)); ```  Result: true |
| `INSTR()` | instr(str, substr) - Returns the (1-based) index of the first occurrence of substrin str. | ``` > SELECT instr('SparkSQL', 'SQL'); ```  Result: 6 |
| `LAG()` | lag(input[, offset[, default]]) - Returns the value of input at the offsetth row before the current row in the window. The default value of offset is 1 and the default value of default is null. If the value of input at the offsetth row is null, null is returned. If there is no such offset row (e.g., when the offset is 1, the first row of the window does not have any previous row), default is returned. | ``` > SELECT a, b, lag(b) OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 NULL  A1 1 1  A1 2 1  A2 3 NULL |
| `LAST()` | last(expr[, isIgnoreNull]) - Returns the last value of expr for a group of rows. If is Ignore Null is true, returns only non-null values. | ``` > SELECT last(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 20  ``` > SELECT last(col) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: NULL  ``` > SELECT last(col, true) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: 5 |
| `LAST_DAY()` | last\_day(date) - Returns the last day of the month which the date belongs to. | ``` > SELECT last_day('2009-01-12'); ```  Result: 2009-01-31 |
| `LAST_VALUE()` | last\_value(expr[, isIgnoreNull]) - Returns the last value of expr for a group of rows. If is IgnoreNull is true, returns only non-null values. | ``` > SELECT last_value(col) FROM VALUES (10), (5), (20) AS tab(col); ```  Result: 20  ``` > SELECT last_value(col) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: NULL  ``` > SELECT last_value(col, true) FROM VALUES (10), (5), (NULL) AS tab(col); ```  Result: 5 |
| `LEFT()` | left(str, len) - Returns the left most len (lencan be string type) characters from the stringstr,if len is less or equal than 0 the result is an empty string. | ``` > SELECT left('Spark SQL', 3); ```  Result: Spa  ``` > SELECT left(encode('Spark SQL', 'utf-8'), 3); ```  Result: Spa |
| `LEN()` | len(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT len('Spark SQL '); ```  Result: 10  ``` > SELECT len(x'537061726b2053514c'); ```  Result: 9  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 10  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `LENGTH()` | length(expr) - Returns the character length of string data or number of bytes of binary data. The length of string data includes the trailing spaces. The length of binary data includes binary zeros. | ``` > SELECT length('Spark SQL '); ```  Result: 10  ``` > SELECT length(x'537061726b2053514c'); ```  Result: 10  ``` > SELECT CHAR_LENGTH('Spark SQL '); ```  Result: 9  ``` > SELECT CHARACTER_LENGTH('Spark SQL '); ```  Result: 10 |
| `LIKE()` | str like pattern[ ESCAPE escape] - Returns true if str matches pattern with escape, null if any arguments are null, false otherwise. | ``` > SELECT like('Spark', '_park'); ```  Result: true  ``` > SELECT '\\\\abc' AS S, S like r'\\\\abc', S like '\\\\\\\\abc'; ```  Result: \abc true true  ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT '%SystemDrive%\\Users\\John' like '\\%SystemDrive\\%\\\\Users%'; ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT '%SystemDrive%\\\\Users\\\\John' like r'%SystemDrive%\\\\Users%'; ```  Result: true  ``` > SELECT '%SystemDrive%/Users/John' like '/%SystemDrive/%//Users%' ESCAPE '/'; ```  Result: true |
| `LISTAGG()` | listagg(expr[, delimiter])[ WITHIN GROUP (ORDER BY key [ASC | DESC] [,...])] - Returnsthe concatenation of non-NULL input values, separated by the delimiter ordered by key. If all values are NULL, NULL is returned. | ``` > SELECT listagg(col) FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: abc  ``` > SELECT listagg(col) WITHIN GROUP (ORDER BY col DESC) FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: cba  ``` > SELECT listagg(col) FROM VALUES ('a'), (NULL), ('b') AS tab(col); ```  Result: ab  ``` > SELECT listagg(col) FROM VALUES ('a'), ('a') AS tab(col); ```  Result: aa  ``` > SELECT listagg(DISTINCT col) FROM VALUES ('a'), ('a'), ('b') AS tab(col); ```  Result: ab  ``` > SELECT listagg(col, ', ') FROM VALUES ('a'), ('b'), ('c') AS tab(col); ```  Result: a, b, c  ``` > SELECT listagg(col) FROM VALUES (NULL), (NULL) AS tab(col); ```  Result: NULL |
| `LOG()` | log(base, expr) - Returns the logarithm of expr with base. | ``` > SELECT log(10, 100); ```  Result: 2.0 |
| `LOG2()` | log2(expr) - Returns the logarithm of expr with base 2. | ``` > SELECT log2(2); ```  Result: 1.0 |
| `LOWER()` | lower(str) - Returns str with all characters changed to lowercase. | ``` > SELECT lower('SparkSql'); ```  Result: sparksql |
| `LPAD()` | lpad(str, len[, pad]) - Returnsstr, left-padded with pad to a length o flen.If str is longer than len, the return value is shortened to len characters or bytes. If pad is not specified, str will be padded to the left with space characters if it is a character string, and with zeros if it is a byte sequence. | ``` > SELECT lpad('hi', 5, '??'); ```  Result: ???hi  ``` > SELECT lpad('hi', 1, '??'); ```  Result: h  ``` > SELECT lpad('hi', 5); ```  Result: hi  ``` > SELECT hex(lpad(unhex('aabb'), 5)); ```  Result: 000000AABB  ``` > SELECT hex(lpad(unhex('aabb'), 5, unhex('1122'))); ```  Result: 112211AABB |
| `LTRIM()` | ltrim(str) - Removes the leading space characters from str. | ``` > SELECT ltrim('    SparkSQL   '); ```  Result: SparkSQL |
| `MEDIAN()` | median(col) - Returns the median of numeric or ANSI interval columncol. | ``` > SELECT median(col) FROM VALUES (0), (10) AS tab(col); ```  Result: 5.0  ``` > SELECT median(col) FROM VALUES (INTERVAL '0' MONTH), (INTERVAL '10' MONTH) AS tab(col); ```  Result: 0-5 |
| `MIN()` | min(expr) - Returns the minimum value of expr. | ``` > SELECT min(col) FROM VALUES (10), (-1), (20) AS tab(col); ```  Result: -1 |
| `MINUTE()` | minute(timestamp) - Returns the minute component of the string/timestamp. | ``` > SELECT minute('2009-07-30 12:58:59'); ```  Result: 58 |
| `MOD()` | expr1 % expr2, or mod(expr1, expr2) - Returns the remainder after expr1/expr2. | ``` > SELECT 2 % 1.8; ```  Result: 0.2  ``` > SELECT MOD(2, 1.8); ```  Result: 0.2 |
| `MONTH()` | month(date) - Returns the month component of the date/timestamp. | ``` > SELECT month('2016-07-30'); ```  Result: 7 |
| `MONTHS_BETWEEN()` | months\_between(timestamp1, timestamp2[, roundOff]) - If timestamp 1is later than timestamp 2, then the result is positive. If timestamp1 and timestamp2are on the same day of month, or both are the last day of month, time of day will be ignored. Otherwise, the difference is calculated based on 31 days per month, and rounded to 8 digits unless roundOff=false. | ``` > SELECT months_between('1997-02-28 10:30:00', '1996-10-30'); ```  Result: 3.94959677  ``` > SELECT months_between('1997-02-28 10:30:00', '1996-10-30', false); ```  Result: 3.9495967741935485 |
| `NOT()` | not expr - Logical not. | ``` > SELECT not true; ```  Result: false  ``` > SELECT not false; ```  Result: true  ``` > SELECT not NULL; ```  Result: NULL |
| `NOW()` | now() - Returns the current timestamp at the start of query evaluation. | ``` > SELECT now(); ```  Result: 2020-04-25 15:49:11.914 |
| `NULLIF()` | nullif(expr1, expr2) - Returns null if expr1 equals to expr2, or expr1 otherwise. | ``` > SELECT nullif(2, 2); ```  Result: NULL |
| `OR()` | expr1 or expr2 - Logical OR. | ``` > SELECT true or false; ```  Result: true  ``` > SELECT false or false; ```  Result: false  ``` > SELECT true or NULL; ```  Result: true  ``` > SELECT false or NULL; ```  Result: NULL |
| `POSITION()` | position(substr, str[, pos]) - Returns the position of the first occurrence of substrin str after positionpos. The given pos and return value are 1-based. | ``` > SELECT position('bar', 'foobarbar'); ```  Result: 4  ``` > SELECT position('bar', 'foobarbar', 5); ```  Result: 7  ``` > SELECT POSITION('bar' IN 'foobarbar'); ```  Result: 4 |
| `POWER()` | power(expr1, expr2) - Raises expr1 to the power of expr2. | ``` > SELECT power(2, 3); ```  Result: 8.0 |
| `RAND()` | rand([seed]) - Returns a random value with independent and identically distributed (i.i.d.) uniformly distributed values in [0, 1). | ``` > SELECT rand(); ```  Result: 0.9629742951434543  ``` > SELECT rand(0); ```  Result: 0.7604953758285915  ``` > SELECT rand(null); ```  Result: 0.7604953758285915 |
| `RANDN()` | randn([seed]) - Returns a random value with independent and identically distributed (i.i.d.) values drawn from the standard normal distribution. | ``` > SELECT randn(); ```  Result: -0.3254147983080288  ``` > SELECT randn(0); ```  Result: 1.6034991609278433  ``` > SELECT randn(null); ```  Result: 1.6034991609278433 |
| `RANDOM()` | random([seed]) - Returns a random value with independent and identically distributed (i.i.d.) uniformly distributed values in [0, 1). | ``` > SELECT random(); ```  Result: 0.9629742951434543  ``` > SELECT random(0); ```  Result: 0.7604953758285915  ``` > SELECT random(null); ```  Result: 0.7604953758285915 |
| `RANK()` | rank() - Computes the rank of a value in a group of values. The result is one plus the numberof rows preceding or equal to the current row in the ordering of the partition. The values will produce gaps in the sequence. | ``` > SELECT a, b, rank(b) OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 1  A1 1 1  A1 2 3  A2 3 1 |
| `REGEXP_EXTRACT()` | regexp\_extract(str, regexp[, idx]) - Extract the first string in the str that match the reg exp expression and corresponding to the regex group index. | ``` > SELECT regexp_extract('100-200', '(\\\\d+)-(\\\\d+)', 1); ```  Result: 100  ``` > SELECT regexp_extract('100-200', r'(\\d+)-(\\d+)', 1); ```  Result: 100 |
| `REGEXP_EXTRACT_ALL()` | regexp\_extract\_all(str, regexp[, idx]) - Extract all strings in the str that match the reg exp expression and corresponding to the regex group index. | ``` > SELECT regexp_extract_all('100-200, 300-400', '(\\\\d+)-(\\\\d+)', 1); ```  Result: ["100","300"]  ``` > SELECT regexp_extract_all('100-200, 300-400', r'(\\d+)-(\\d+)', 1); ```  Result: ["100","300"] |
| `REGEXP_LIKE()` | regexp\_like(str, regexp) - Returns true if str matches reg exp, or false otherwise. | ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT regexp_like('%SystemDrive%\\Users\\John', '%SystemDrive%\\\\Users.*'); ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; Result: spark.sql.parser.escapedStringLiterals  false ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT regexp_like('%SystemDrive%\\\\Users\\\\John', '%SystemDrive%\\\\\\\\Users.*'); ```  Result: true  ``` > SELECT regexp_like('%SystemDrive%\\\\Users\\\\John', r'%SystemDrive%\\\\Users.*'); ```  Result: true |
| `REPLACE()` | replace(str, search[, replace]) - Replaces all occurrences of search with replace. | ``` > SELECT replace('ABCabc', 'abc', 'DEF'); ```  Result: ABCDEF |
| `RIGHT()` | right(str, len) - Returns the rightmostlen(lencan be string type) characters from the string str, if len is less or equal than 0 the result is an empty string. | ``` > SELECT right('Spark SQL', 3); ```  Result: SQL |
| `RLIKE()` | rlike(str, regexp) - Returns true if str matches reg exp, or false otherwise. | ``` > SET spark.sql.parser.escapedStringLiterals=true; ```  Result: spark.sql.parser.escapedStringLiterals true  ``` > SELECT rlike('%SystemDrive%\\Users\\John', '%SystemDrive%\\\\Users.*'); ```  Result: true  ``` > SET spark.sql.parser.escapedStringLiterals=false; ```  Result: spark.sql.parser.escapedStringLiterals false  ``` > SELECT rlike('%SystemDrive%\\\\Users\\\\John', '%SystemDrive%\\\\\\\\Users.*'); ```  Result: true  ``` > SELECT rlike('%SystemDrive%\\\\Users\\\\John', r'%SystemDrive%\\\\Users.*'); ```  Result: true |
| `ROUND()` | round(expr, d) - Returns expr rounded to decimal places using HALF\_UP rounding mode. | ``` > SELECT round(2.5, 0); ```  Result: 3 |
| `ROW_NUMBER()` | row\_number() - Assigns a unique, sequential number to each row, starting with one,according to the ordering of rows within the window partition. | ``` > SELECT a, b, row_number() OVER (PARTITION BY a ORDER BY b) FROM VALUES ('A1', 2), ('A1', 1), ('A2', 3), ('A1', 1) tab(a, b); ```  Result: A1 1 1  A1 1 2  A1 2 3  A2 3 1 |
| `SECOND()` | second(timestamp) - Returns the second component of the string/timestamp. | ``` > SELECT second('2009-07-30 12:58:59'); ```  Result: 59 |
| `SEQUENCE()` | sequence(start, stop, step) - Generates an array of elements from start to stop (inclusive), incrementing by step. The type of the returned elements is the same as the type of argument expressions. | ``` > SELECT sequence(1, 5); ```  Result: [1,2,3,4,5]  ``` > SELECT sequence(5, 1); ```  Result: [5,4,3,2,1]  ``` > SELECT sequence(to_date('2018-01-01'), to_date('2018-03-01'), interval 1 month); ```  Result: [2018-01-01,2018-02-01,2018-03-01]  ``` > SELECT sequence(to_date('2018-01-01'), to_date('2018-03-01'), interval '0-1' year to month); ```  Result: [2018-01-01,2018-02-01,2018-03-01] |
| `SHA()` | sha(expr) - Returns a sha1 hash value as a hex string of the expr. | ``` > SELECT sha('Spark'); ```  Result: 85f5955f4b27a9a4c2aab6ffe5d7189fc298b92c |
| `SHIFTLEFT()` | base shiftleft exp - Bitwise left shift. | ``` > SELECT shiftleft(2, 1); ```  Result: 4  ``` > SELECT 2 << 1; ```  Result: 4 |
| `SHIFTRIGHT()` | base shiftright expr - Bitwise (signed) right shift. | ``` > SELECT shiftright(4, 1); ```  Result: 2  ``` > SELECT 4 >> 1; ```  Result: 2 |
| `SPLIT()` | split(str, regex, limit) - Splits str around occurrences that match reg ex and returns an array with a length of at most limit | ``` > SELECT split('oneAtwoBthreeC', '[ABC]'); ```  Result: ["one","two","three",""]  ``` > SELECT split('oneAtwoBthreeC', '[ABC]', -1); ```  Result: ["one","two","three",""]  ``` > SELECT split('oneAtwoBthreeC', '[ABC]', 2); ```  Result: ["one","twoBthreeC"] |
| `SPLIT_PART()` | split\_part(str, delimiter, partNum) - Splits str by delimiter and return requested part of the split (1-based). If any input is null, returns null. If part Num is out of range of split parts, returns empty string. If part Num is 0 ,throws an error. If part Num is negative, the parts are counted backward from the end of the string. If the delimiter is an empty string, the str is not split. | ``` > SELECT split_part('11.12.13', '.', 3); ```  Result: 13 |
| `SUBSTRING()` | substring(str, pos[, len]) - Returns the substring of str that starts at pos and is of length len, or the slice of byte array that starts at pos and is of length len. | ``` > SELECT substring('Spark SQL', 5); ```  Result: k SQL  ``` > SELECT substring('Spark SQL', -3); ```  Result: SQL  ``` > SELECT substring('Spark SQL', 5, 1); ```  Result: k  ``` > SELECT substring('Spark SQL' FROM 5); ```  Result: k SQL  ``` > SELECT substring('Spark SQL' FROM -3); ```  Result: SQL  ``` > SELECT substring('Spark SQL' FROM 5 FOR 1); ```  Result: k  ``` > SELECT substring(encode('Spark SQL', 'utf-8'), 5); ```  Result: k SQL |
| `SUM()` | sum(expr) - Returns the sum calculated from values of a group. | ``` > SELECT sum(col) FROM VALUES (5), (10), (15) AS tab(col); ```  Result: 30  ``` > SELECT sum(col) FROM VALUES (NULL), (10), (15) AS tab(col); ```  Result: 25  ``` > SELECT sum(col) FROM VALUES (NULL), (NULL) AS tab(col); ```  Result: NULL |
| `TO_CHAR()` | to\_char(expr, format) - Convertexprto a string based on theformat. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input value, generating a result string of the same length as the corresponding sequence in the format string. The result string is left-padded with zeros if the 0/9 sequence comprises more digits than the matching part of the decimal value, starts with 0, and is before the decimal point. Otherwise, it is padded with spaces. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' prints '+' for positive values but 'MI' prints a space. 'PR': Only allowed at the end of the format string; specifies that the result string will be wrapped by angle brackets if the input value is negative. ('&lt;1&gt;'). Ifexpris a datetime,formatshall be a valid datetime pattern, seeDatetime Patterns. Ifexpris a binary, it is converted to a string in one of the formats: 'base64': a base 64 string. 'hex': a string in the hexadecimal format. 'utf-8': the input binary is decoded to UTF-8 string. | ``` > SELECT to_char(454, '999'); ```  Result: 454  ``` > SELECT to_char(454.00, '000D00'); ```  Result: 454.00  ``` > SELECT to_char(12454, '99G999'); ```  Result: 12,454  ``` > SELECT to_char(78.12, '$99.99'); ```  Result: $78.12  ``` > SELECT to_char(-12454.8, '99G999D9S'); ```  Result: 12,454.8-  ``` > SELECT to_char(date'2016-04-08', 'y'); ```  Result: 2016  ``` > SELECT to_char(x'537061726b2053514c', 'base64'); ```  Result: U3BhcmsgU1FM  ``` > SELECT to_char(x'537061726b2053514c', 'hex'); ```  Result: 537061726B2053514C  ``` > SELECT to_char(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc |
| `TO_DATE()` | to\_date(date\_str[, fmt]) - Parses the date\_str expression with the fmt expression to a date. Returns null with invalid input. By default, it follows casting rules to a date if the fmt is omitted. | ``` > SELECT to_date('2009-07-30 04:17:52'); ```  Result: 2009-07-30  ``` > SELECT to_date('2016-12-31', 'yyyy-MM-dd'); ```  Result: 2016-12-31 |
| `TO_NUMBER()` | to\_number(expr, fmt) - Convert string 'expr' to a number based on the string format 'fmt'. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input string. If the 0/9 sequence starts with 0 and is before the decimal point, it can only match a digit sequence of the same size. Otherwise, if the sequence starts with 9 or is after the decimal point, it can match a digit sequence that has the same or smaller size. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. 'expr' must match the grouping separator relevant for the size of the number. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' allows '-' but 'MI' does not. 'PR': Only allowed at the end of the format string; specifies that 'expr' indicates a negative number with wrapping angled brackets. ('&lt;1&gt;'). | ``` > SELECT to_number('454', '999'); ```  Result: 454  ``` > SELECT to_number('454.00', '000.00'); ```  Result: 454.00  ``` > SELECT to_number('12,454', '99,999'); ```  Result: 12454  ``` > SELECT to_number('$78.12', '$99.99'); ```  Result: 78.12  ``` > SELECT to_number('12,454.8-', '99,999.9S'); ```  Result: -12454.8 |
| `TO_TIMESTAMP()` | to\_timestamp(timestamp\_str[, fmt]) - Parses thetimestamp\_strexpression with thefmtexpression to a timestamp. Returns null with invalid input. By default, it follows casting rules to a timestamp if thefmtis omitted. The result data type is consistent with the value of configurationspark.sql.timestampType. | ``` > SELECT to_timestamp('2016-12-31 00:12:00'); ```  Result: 2016-12-31 00:12:00  ``` > SELECT to_timestamp('2016-12-31', 'yyyy-MM-dd'); ```  Result: 2016-12-31 00:00:00 |
| `TO\_UNIX\_TIMESTAMP()` | Converts a timestamp or date string to a UNIX timestamp (seconds since 1970-01-01 00:00:00 UTC). If a format string fmt is provided, it is used to parse the input. Returns null with invalid input. | ``` SELECT TO_UNIX_TIMESTAMP('2026-03-17 11:00:00'to\_unix\_timestamp(\[timeExp\[, fmt\]\]) ```  Result: 1773745200 |
| `TO_VARCHAR()` | to\_varchar(expr, format) - Convertexprto a string based on theformat. Throws an exception if the conversion fails. The format can consist of the following characters, case insensitive: '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the format string matches a sequence of digits in the input value, generating a result string of the same length as the corresponding sequence in the format string. The result string is left-padded with zeros if the 0/9 sequence comprises more digits than the matching part of the decimal value, starts with 0, and is before the decimal point. Otherwise, it is padded with spaces. '.' or 'D': Specifies the position of the decimal point (optional, only allowed once). ',' or 'G': Specifies the position of the grouping (thousands) separator (,). There must be a 0 or 9 to the left and right of each grouping separator. '$': Specifies the location of the $ currency sign. This character may only be specified once. 'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at the beginning or end of the format string). Note that 'S' prints '+' for positive values but 'MI' prints a space. 'PR': Only allowed at the end of the format string; specifies that the result string will be wrapped by angle brackets if the input value is negative. ('&lt;1&gt;'). Ifexpris a datetime,formatshall be a valid datetime pattern, seeDatetime Patterns. Ifexpris a binary, it is converted to a string in one of the formats: 'base64': a base 64 string. 'hex': a string in the hexadecimal format. 'utf-8': the input binary is decoded to UTF-8 string. | ``` > SELECT to_varchar(454, '999'); ```  Result: 454  ``` > SELECT to_varchar(454.00, '000D00'); ```  Result: 454.00  ``` > SELECT to_varchar(12454, '99G999'); ```  Result: 12,454  ``` > SELECT to_varchar(78.12, '$99.99'); ```  Result: $78.12  ``` > SELECT to_varchar(-12454.8, '99G999D9S'); ```  Result: 12,454.8-  ``` > SELECT to_varchar(date'2016-04-08', 'y'); ```  Result: 2016  ``` > SELECT to_varchar(x'537061726b2053514c', 'base64'); ```  Result: U3BhcmsgU1FM  ``` > SELECT to_varchar(x'537061726b2053514c', 'hex'); ```  Result: 537061726B2053514C  ``` > SELECT to_varchar(encode('abc', 'utf-8'), 'utf-8'); ```  Result: abc |
| `TRIM()` | trim(str) - Removes the leading and trailing space characters fromstr. | ``` > SELECT trim('    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(BOTH FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(LEADING FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim(TRAILING FROM '    SparkSQL   '); ```  Result: SparkSQL  ``` > SELECT trim('SL' FROM 'SSparkSQLS'); ```  Result: parkSQ  ``` > SELECT trim(BOTH 'SL' FROM 'SSparkSQLS'); ```  Result: parkSQ  ``` > SELECT trim(LEADING 'SL' FROM 'SSparkSQLS'); ```  Result: parkSQLS  ``` > SELECT trim(TRAILING 'SL' FROM 'SSparkSQLS'); ```  Result: SSparkSQ |
| `TRUNC()` | trunc(date, fmt) - Returns date with the time portion of the day truncated to the unit specified by the format model fmt. | ``` > SELECT trunc('2019-08-04', 'week'); ```  Result: 2019-07-29  ``` > SELECT trunc('2019-08-04', 'quarter'); ```  Result: 2019-07-01  ``` > SELECT trunc('2009-02-12', 'MM'); ```  Result: 2009-02-01  ``` > SELECT trunc('2015-10-27', 'YEAR'); ```  Result: 2015-01-01 |
| `TRY\_TO\_TIMESTAMP()` | Parses the timestamp\\_str expression with the fmt expression to a timestamp. Returns null with invalid input instead of throwing an error. By default, it follows casting rules to a timestamp if the fmt is omitted. This is the error-safe version of to\\_timestamp. | ``` try\_to\_timestamp(timestamp\_str\[, fmt\]) ```  Result: NULL |
| `UNIX_DATE()` | unix\_date(date) - Returns the number of days since 1970-01-01. | ``` > SELECT unix_date(DATE("1970-01-02")); ```  Result: 1 |
| `UNIX_SECONDS()` | unix\_seconds(timestamp) - Returns the number of seconds since 1970-01-01 00:00:00 UTC. Truncates higher levels of precision. | ``` > SELECT unix_seconds(TIMESTAMP('1970-01-01 00:00:01Z')); ```  Result: 1 |
| `UNIX_TIMESTAMP()` | unix\_timestamp([timeExp[, fmt]]) - Returns the UNIX timestamp of current or specified time. | ``` > SELECT unix_timestamp(); ```  Result: 1476884637  ``` > SELECT unix_timestamp('2016-04-08', 'yyyy-MM-dd'); ```  Result: 1460041200 |
| `UPPER()` | upper(str) - Returns str with all characters changed to uppercase. | ``` > SELECT upper('SparkSql'); ```  Result: SPARKSQL |
| `UUID()` | uuid() - Returns an universally unique identifier (UUID) string. The value is returned as a canonical UUID 36-character string. | ``` > SELECT uuid(); ```  Result: 46707d92-02f4-4817-8116-a4c3b23e6266 |
| `WEEKDAY()` | weekday(date) - Returns the day of the week for date/timestamp (0 = Monday, 1 = Tuesday, ..., 6 = Sunday). | ``` > SELECT weekday('2009-07-30'); ```  Result: 3 |
| `WEEKOFYEAR()` | weekofyear(date) - Returns the week of the year of the given date. A week is considered to start on a Monday and week 1 is the first week with &gt;3 days. | ``` > SELECT weekofyear('2008-02-20'); ```  Result: 8 |
| `WHEN()` | CASE WHEN expr1 THEN expr2 [WHEN expr3 THEN expr4]\* [ELSE expr5] END - Whenexpr1= true, returns expr2; else when expr3= true, returns expr4; else returns expr5. | ``` > SELECT CASE WHEN 1 > 0 THEN 1 WHEN 2 > 0 THEN 2.0 ELSE 1.2 END; ```  Result: 1.0  ``` > SELECT CASE WHEN 1 < 0 THEN 1 WHEN 2 > 0 THEN 2.0 ELSE 1.2 END; ```  Result: 2.0  ``` > SELECT CASE WHEN 1 < 0 THEN 1 WHEN 2 < 0 THEN 2.0 END; ```  Result: NULL |
| `YEARS()` | year(date) - Returns the year component of the date/timestamp. | ``` > SELECT year('2016-07-30'); ```  Result: 2016 |


---

## data-integration/etl/migrating-to-etl

# Migrating from Vertica to the ETL Engine

Migrating to the ETL Engine replaces the traditional Vertica-based processing layer with a cloud-native execution environment. This transition optimizes resource management and provides a seamless path for translating legacy Vertica SQL transformations into high-performance SparkSQL jobs.

Before migrating your data to the ETL Engine, you need to review and complete the necessary pre-migration steps:

Expand all

[## Before you begin](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293739328215_body)

1. Before initiating the migration, define a complete, end-to-end migration plan. This plan must include all relevant Data Pools (DP).

   This should include:

   - **Identify scope**: Clearly define which Data Pools need to be migrated.
   - **Decommission review**: Just as important, identify any Data Pools that are no longer in use so they can be excluded from the migration scope.
   - **Full migration goal**: Remember, the ultimate goal is a full migration of all necessary Data Pools so that we can successfully deactivate Vertica upon completion.

   **Note**

   Make sure you are not doing any changes on the original data pool while you migrate it as those changes won’t be reflected in the migrated data pool.
2. **Request migration feature enablement**: You must request feature enablement to activate the "Migration button”. Create a Support ticket and provide the following details:

   - **Team URL**: The web address of the team being migrated.
   - **Migration team emails**: Email addresses of all users who will perform the migration.

[## Mandatory migration steps](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293739408052_body)

This is broken down into the following steps:

[### Step 1: Copying the existing Data Pool configuration and auto-translate all transformations](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293773588708_body)

In this step, you'll copy the whole configuration of a data pool to a new ETL Engine data pool. This includes extractions, data jobs, schedules, data models, Replication Cockpit, data pool parameters etc.

1. From the data pool, click **Migrate to Celocore**.
2. Most Vertica SQL transformations (~90%) translate to SparkSQL automatically. For those note translated:

   - **Manual review**: Any transformations that cannot be converted automatically will be flagged for your review.

     - See: [SparkSQL](etl-engine-sql.html "ETL Engine SQL Syntax") syntax and [common translation issues](known-transpilation-issues.html "Known transpilation issues") for more details.
   - **Objects & Events**: No action is required. These translate automatically upon your first deployment after migration.

     - See: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models").
3. Set a new name for the copied data pool, that consists of the “old name + (Celocore)”. You can change this name later if needed. This modal also shows a warning in case the data pool you are copying has imported data connections.

   **Note**

   The fact that we highlight imported connections is relevant as data connection sharing between data pools is not supported between a Vertica and an ETL Engine data pool. That means in case you have a use case data pool and an extraction data pool, you have to migrate both.
4. Disable all schedules in the copied data pool to avoid:

   - New data being pushed into the data pool.
   - Continuous data job failures during the migration.

[### Step 2: Copying a snapshot of the existing data to the ETL Engine](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293773635064_body)

This process creates a point-in-time copy of your Vertica data and moves it into the ETL Engine data pool.

Before completing this step, you should consider:

- **Point-in-Time Awareness**: Understand that any data extracted into Vertica after this snapshot begins will not be included in the copy.
- **Gap Closure**: Note that the first scheduled delta extraction in the new ETL Engine pool will automatically sync any data missed during this window.

To copy a snap of your existing data:

1. **Select tables for migration**: By default, all tables are selected and sorted by their data-connection name. Review the list and confirm the selection of tables you wish to copy.
2. **Initiate and monitor copy**: Click **Start migration**.

   You don't need to keep the window open. You may safely close the modal and return later while the process runs in the background.
3. **Review completion status**: Once the process finishes, review the copy status for each individual table.
4. **Handle failures or updates (If necessary)**:

   - **Retry**: Use the retry option for any tables that failed to copy.
   - **Repeat**: If significant time has passed and you need a fresher snapshot before going live, you can repeat the entire snapshot process.

**Note**

Do not enable the "Double Ingestion" feature until after you have completed Step 3 (Validating data). Enabling it too early will cause row-count mismatches during validation because the ETL Engine pool will contain more current data than the original Vertica snapshot.

[### Step 3: Validating data](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293773700128_body)

This process ensures data integrity by comparing the new ETL Engine data pool against the snapshot copied from the Vertica data pool.

You can also select to run a validation only on a per data connection / schema and even table basis:

1. **Trigger data validation**: From the migration wizard, click **Start Validation**.

   You can choose to run validation for the entire pool or narrow the scope to specific data connections, schemas, or individual tables.
2. **Monitor automated checks**: The system will automatically perform the following four checks in sequence:

   1. Existence: Does the table exist in the new pool?
   2. Schema: Is the table structure/schema identical?
   3. Row Count: Do the total number of records match?
   4. Row-by-Row: Does the actual data within the rows match exactly?
3. **Review results in SQL editor**: The results for each of the validation checks are shown in the SQL editor with information which of the checks failed and in which transformations the table is used. In case of a row count mismatch we are exposing the row counts of both tables side by side.
4. **Investigate and resolve mismatches**: You can also see a side by side comparison of the tables (original + migrated) when clicking on a failed table. By default, we only show columns with mismatches and mismatching records are highlighted in red. You can drill down by sorting or filtering the side by side view.

**The most important rule of validation is the snapshot comparison**: It's vital to understand what data is being compared:

- **The validation snapshot**: The validation check only compares the data in your new ETL Engine Data Pool against the initial data snapshot we took from the old Vertica environment.
- **What is ignored**: Any new data that was extracted into the old environment after the initial data copy has no impact on the validation.

  **CRITICAL WARNING**: Wait to enable double ingestion! Don't turn on the "Double Ingestion" feature yet. If you enable it, new data will immediately begin flowing into your new ETL Engine data pool, causing it to have more records than the original snapshot. This will automatically cause the validation check (specifically the row count) to fail. The best practice is to ensure all tables pass validation before activating double ingestion.

The most likely reason for the validation of a table to fail is that the SQL produces a different output. Using the “Referenced in” information in the validation summary allows you to trace back where a specific table gets referenced and fix the SQL. Once you have done that and rerun this transformation, we suggest you to also rerun the validation for that specific table. This might be an iterative process so potentially you need to go through this cycle a few times.

[### Step 4: Setting up data connections to source systems and start extractions](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293773743489_body)

Because security credentials (passwords, API keys, and SSH private keys) are not transferred during the migration for security reasons, you must manually re-authenticate your source systems in the new environment.

To set up your data connections, see: [Connecting data sources](connecting-data-sources.html "Connecting data sources").

[### Step 5: Moving old data models to new data pools to keep relationships with Studio assets and augmented attributes](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293773841743_body)

This final step redirects your front-end assets and data models to the new ETL Engine environment. Because the Data Model ID is preserved, this process is largely automated.

1. **Relink the Data Model**: Move the data model from the original Vertica data pool to the new ETL Engine data pool.
2. **Verify automatic redirection**: Confirm that Studio assets, augmented attributes, and saved formulas now point to the ETL Engine data. No manual editing of individual assets is required.
3. **Validate external integrations**: Since the Data Model ID is kept, verify that existing PyCelonis scripts or external applications (e.g., Intelligence API) continue to function without code changes.

If you want to do additional validation you can also do the following:

- Create a copy of one Analysis/ View and link it to the new ETL Engine data model and compare the KPIs.
- If those look fine, then trigger the step above to use the data pool to populate this production data model.

**Note**

If you notice discrepancies after the move, you can temporarily move the data model back to the original Vertica data pool to restore the previous state.

[## Optional migration steps](#UUID-5eace268-29a1-cca8-6757-bafe50c7b5c5_section-id235293739787434_body)

The following steps are optional:

- **Re-establish the imported data connections**: If the data pool you migrated contained previously imported data connections, those connections will break during migration and appear as “Dummy Connection” with the type “Not Available.” You can easily repair them within the ETL engine's data pool by opening the three-dot menu on the broken connection, selecting Edit, and choosing the new source data connection to import.

  This process preserves the original connection ID, ensuring that all transformations and data jobs referencing that connection continue to function without any changes.
- **Translate an individual transformation manually**: In case the translation for a transformation fails, you can always retrigger it via the transformation workbench using smaller increments by highlighting only a selection of the statements within one transformation.
- **Double ingestion**: For cases where the extraction pool cannot be fully migrated because e.g. it is using Replication Cockpit which is powering a lot of other data pools, we’ve built a mechanism to keep the Vertica and the ETL Engine pool in sync by pushing any incoming new data automatically into both data pools. This mechanism can be enabled on a data connection and even on a table level. Any errors in the double ingestion will be visible in this UI. In case the Vertica and ETL Engine data pool run out of sync due to an error, an initial copy of the data (see step 1) is required.

## Related topics

- [ETL Engine SQL Syntax](etl-engine-sql.html "ETL Engine SQL Syntax")
- [Known transpilation issues](known-transpilation-issues.html "Known transpilation issues")
- [Best practice](etl-engine-best-practice.html "ETL Engine best practice")


---

## data-integration/extraction/adding-custom-tables-and-columns-to-coupa-extraction

# Adding custom tables and columns to Coupa extraction

When connecting your Coupa tenant to the Celonis Platform , you can also supply a custom JSON configuration. This custom JSON configuration enables you to add custom tables and columns to be extracted from your Coupa tenant in addition to those supported by default.

To learn how to connect to your Coupa tenant, see: [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)").

Expand all

[## Formatting your JSON](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4522893897899234220576539837_body)

When formatting your JSON string, the following components are needed:

[### General structure](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4572466452192034220578939286_body)

The metadata JSON should contain the following objects:

- **version**: This should be the value of the Coupa API version that you're using.
- **metadataSources**: This is the URL used to access the table over Coupa API and the table names to which the URL applies.
- **resources**: List of tables and custom objects.

And the example of how the JSON is formatted:

```
{
  "version": "R27",
  "metadataSources": [

   ],
   "resources": [

   ]
}
```

[### Metadata sources](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4601803815739234220578997137_body)

Your metadata sources should then be added using the following objects:

- **Resource\_name\_value**: This should be a URL.
- **display\_name\_value**: This can be a text-based name for the source.

And the example of how the JSON is formatted:

```
{
 "url": "resource_name_value",
 "targetResources": [
   "display_name_value"
 ]
}
```

[### Resources](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4601803862027234220579037705_body)

The resource section is where you can detail your columns, nested fields and nested arrays. To do this, you need the following objects:

- **displayName**: Custom name of the table where the resource will be extracted to.
- **availableSince**: Supported version of the Coupa API.
- **resource**: Resource name in the Coupa tenant.

And the example of how the JSON is formatted:

```
{
      "displayName": "display_name_value",
      "availableSince": "R21",
      "resource": "resource_name_value",
......
}
```

[### Columns](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4608875484936034220579070767_body)

This section should include the columns you want to extract from your Coupa tenant, with the following information needed:

- Column name
- Column type
- Primary key (added as primaryKey = true value)

The backend will add the foreign key for the nested tables. It is also possible to add the field with nested fields as a column instead of creating nested fields in the configuration. However, the values of the columns will be JSON string.

And the example for how the JSON is formatted:

```
{
"resources": [
  {
      .....
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "primaryKey": true
        },
{
          "name": "ColumnA",
          "type": "Type"
        },
    {
          "name": "ColumnB",
          "type": "Type"
        },
    ....
      ],
      .....
   }
```

[### Nested fields](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4601803914412834220579110398_body)

This section should include any nested fields you want to extract from your Coupa tenant. The following objects are needed:

- **column\_name\_nested\_field**: The name for the new column of the nested field, added using the format: (column name + \_ + nested field name)
- **column\_name**: Column name of the table which has nested fields.
- **nested\_field**: Nested field name.

And the example for how the JSON is formatted:

```
{
  "resources": [
    {
     ............
      "nestedFields": [
        {
          "name": "column_name_nested_field",
          "pathToField": [
            "nested_field"
          ],
          "parentName": "column_name",
          "type": "TYPE"
        }
      ]
    ............
  ]
}
```

[### Nested arrays](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-idm4572466459105634220579147698_body)

In the nested array, you need to mention all the fields which have nested fields in the nested fields section. Otherwise, you should add them to the column section to be able to see them in the nested table. If the columns of the nested table will have a list of objects, you need to add a new nested array to the nested array configuration.

The following objects are needed for this:

- **main\_table\_name\_column\_name**: The name for the nested table, using the format: (display name of the table + \_ + column name).
- **column\_name**: The column name in the table which has the list of objects.

And the example for how the JSON is formatted:

```
{
  "resources": [
    {
      ............
      "nestedArrays": [
        {
          "nestedTableName": "main_table_name_column_name",
          "path": [
            "column_name"
          ],
          "columns": [
            {
              "name": "id",
              "type": "INTEGER"
            }
          ],
          "nestedFields": [
            ............
          ],
          "nestedArrays": [
            ............
          ]
        }
      ]
    }
  ]
}
```

## Example JSON scripts

This section contains examples of custom JSON configuration to extend what data can be extracted from your Coupa tenant.

[### Configuring multi-level nested arrays](#UUID-13d6bfe7-6e64-db8b-1416-5b44d6bb2833_section-id235210535583411_body)

The following example shows a configuration of a parent table (`invoices`), a corresponding child table (`invoice_lines`), and a grandchild table (`tax_lines`), where:

- `invoices`: Parent table in this configuration.
- `invoice_lines`: Child table of `invoices`, located in a `nestedArrays`.

  .
- `tax_lines`: Grandchild of `invoices` and child table of `invoice_lines`, located in a nested `nestedArrays` section.

```
{
  "resources": [
    {
      "displayName": "invoices",
      "resource": "invoices",
      "columns": [
        {
          "name": "id",
          "type": "STRING",
          "primaryKey": true
        },
        {
          "name": "first_custom_column",
          "type": "STRING"
        }
      ],
      "nestedFields": [
        {
          "name": "account_type_id",
          "pathToField": [
            "id"
          ],
          "parentName": "account-type",
          "type": "INTEGER"
        },
        {
          "name": "first_custom_description_1",
          "pathToField": [
            "custom-description-1"
          ],
          "parentName": "custom-fields",
          "type": "STRING"
        }
      ],
      "nestedArrays": [
        {
          "nestedTableName": "invoice_lines",
          "path": [
            "invoice-lines"
          ],
          "columns": [
            {
              "name": "id",
              "type": "INTEGER",
              "primaryKey": true
            }
          ],
          "nestedFields": [
            {
              "name": "currency_id",
              "pathToField": [
                "id"
              ],
              "parentName": "currency",
              "type": "INTEGER"
            }
          ],
          "nestedArrays": [
            {
              "nestedTableName": "tax_lines",
              "path": [
                "invoice-lines",
                "tax-lines"
              ],
              "columns": [
                {
                  "name": "id",
                  "type": "INTEGER",
                  "primaryKey": true
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

[### Customizing metadata](#id488919_body)

The following is an example of how you can use the payment API to customize your metadata JSON:

```
{
  "version": "R27",
  "metadataSources": [
    {
      "url": "payments",
      "targetResources": [
        "payments"
      ]
    }
  ],
  "resources": [
    {
      "displayName": "payments",
      "availableSince": "R21",
      "resource": "payments",
      "filteringEnabled": true,
      "fieldSelectionEnabled": true,
      "paginationEnabled": true,
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "primaryKey": true
        },
        {
          "name": "created-at",
          "type": "DATETIME"
        },
        {
          "name": "updated-at",
          "type": "DATETIME"
        },
        {
          "name": "status",
          "type": "STRING"
        },
        {
          "name": "pay-from-total",
          "type": "DECIMAL"
        },
        {
          "name": "pay-to-total",
          "type": "DECIMAL"
        }
      ],
      "nestedFields": [
        {
          "name": "created-by_email",
          "pathToField": [
            "email"
          ],
          "parentName": "created-by",
          "type": "STRING"
        },
        {
          "name": "created-by_employee-number",
          "pathToField": [
            "employee-number"
          ],
          "parentName": "created-by",
          "type": "STRING"
        }
      ]
    }
  ]
}
```

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/extraction/creating-extraction-tasks-using-the-visual-editor

# Creating extraction tasks using the visual editor

As the name suggests, extraction tasks allow you to select the data tables to be extracted from your source system (and imported into the Celonis Platform). When configuring your extractions, you can apply time filters, add pseudonymization, and join tables to each other.

You can either create extraction tasks manually using the visual editor from your data jobs or edit existing extraction tasks (whether originally manually created or as part of a process connector).

In addition to the visual editor, you can also create extraction tasks using the Extractions Editor and AI Assistant, see: [Extractions Editor and AI Assistant overview](extractions-editor-and-ai-assistant-overview.html "Extractions Editor and AI Assistant overview").

**Note**

The extraction features and settings available are dependent on the source system you are connecting to. For an overview of supported features, see:

- [Cloud based source system feature overview](connecting-to-applications.html "Connecting to applications")
- [Database source system feature overview](connecting-to-databases.html "Connecting to databases")

For a video overview of extraction tasks:

Expand all

[## Creating and managing extraction tasks using the visual editor](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm454907337839043417211178032_body)

To create an extraction tasks from your data pool diagram using the visual editor:

1. Click **Data Jobs** and select an existing data connection scope.
2. In the extraction row, click **+ Add**.

   |  |
   | --- |
   |  |
3. Add an extraction task name (an internal reference only) and click **Save**.

   |  |
   | --- |
   |  |

   The task is created and displayed.
4. Edit your extraction task configuration, parameters, and extraction settings as required. See: [Extraction task configuration](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4630013060465634172111826613 "Extraction task configuration").

[## Managing existing extraction tasks](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_UUID-50cf7b84-6f2c-b9c3-304d-bc9164ac83b9_body)

You can manage existing extraction tasks by clicking **Options**.

|  |
| --- |
|  |

You have the following options here:

- **Rename**: Update the name of the extraction task.
- **Enable / disable**: Control whether the extraction task should be enabled or disabled for executions.
- **Move up / down**: Change the order in which this task is performed in a full execution.
- **Duplicate**: Create a copy of the extraction task in the existing data job.
- **Execute**: This allows you to manually execute just this task on demand. For more information about executing data jobs, see: [Executing data jobs](executing-data-jobs.html "Executing data jobs").
- **Execute from here**: This allows you to manually execute this and all following tasks on demand. For more information about executing data jobs, see: [Executing data jobs](executing-data-jobs.html "Executing data jobs").
- **Convert to template /copy to regular task:** The task becomes a template and can be added to other data jobs or used to extend the template. If the task is already a template, you can create a regular task from it. For more information about task templates, see: [Creating data job task templates](creating-task-templates.html "Creating data job task templates").
- **Delete**: This deletes the task and all associated content, with no recovery possible.
- **Download table configuration**: This gives you offline access to a zipped file containing any relevant Excel workbook copies of your table configuration.

[## Extraction task configuration](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4630013060465634172111826613_body)

When creating or edit an existing extraction task, you have the following configuration options available:

- [Table configuration](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4630017347867234172169466594 "Table configuration")

  - [Removing duplicate records](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4557808221118434327767012874 "Removing duplicate records")
  - [Join configuration](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4546987749124834172169608716 "Join configuration")
  - [Time filter](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4630017406646434172169736331 "Time filter")
  - [Additional filter](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4549073467532834172169796784 "Additional filter")
- [Extraction settings - Debug mode, delta load configuration, connector parameters](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_UUID-01e08ea2-8c7c-499d-7f5a-4da16ac5cbae "Extraction settings - Debug mode, delta load configuration, connector parameters")
- [Extraction parameters](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_UUID-34a94fa0-4f4a-fb34-68bb-6df7cc0ec144 "Extraction parameters")
- [Extraction preview](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm234545159374314 "Extraction preview")
- [Extraction progression logs](creating-extraction-tasks-using-the-visual-editor.html#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm234571836976088 "Extraction progression logs")

### Table configuration

This is where you select and configure the data tables you want to extract. Depending on your data connection type, you have the following table configuration options:

- **Column subset**: Specify which columns should be extracted by clicking Configure next to the column count.
- **Pseudonymized columns**: As part of the advanced settings for data connections, you can pseudonymiz the data you extract using SHA-1, SHA-256 (with and without salt), and SHA-512 (with and without salt) algorithms. If you select to pseudonymize your data, values as displayed in the source system will be replaced with hashed values.

  Pseudonymization happens during the data extraction. Celonis requests source system data, then pseudonymizes that data upon receipt, converts it into parquet format, and then ingests this into the Celonis Platform.
- **Primary key columns**: You can explicitly specify which columns should be used as primary key columns during a delta load. This is only necessary if the source system does not provide this information on its own. Overriding the primary key columns does not change how data is stored in the database. It is only used for delta loads and not saved.

[#### Removing duplicate records](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4557808221118434327767012874_body)

**Note**

There are several reasons duplicate records can appear on the table. One of the reasons is sanitization of records carried out by the data ingestion process.

Sanitization logic removes characters from categories: Cf, Co, Cs, Cn (Other, not assigned) and replaces line endings with \n. The sanitization is done to ensure there are no errors while uploading data to Celonis.

We have observed that these characters appear in Primary Key columns and as we remove them the records are flagged as duplicates. It is recommended that users select primary keys carefully that have true unique values. In other words, the two primary key records ideally do not differ just by one special character. We also recognise that in some cases special characters are unavoidable.

In that case, we recommend that users add another column to the primary key (eventually have a Composite Key).

We are looking for ways to get rid of this logic. This requires a deep investigation so that we do not introduce any issues. Until then please follow the recommendation to avoid running into issues.

You can remove duplicate records when executing your JDBC extraction tasks by selecting the ordering column to be used:

|  |
| --- |
|  |

This feature uses the primary key configuration to determine what records are duplicated and then removes that duplicate based on the ordering column in descending order. As a result, we recommend using a timestamped column as your ordering column. When two or more duplicates are found, the oldest record will be removed.

In this example, we're using the columns MANDT, EBELN, and EBELP.

|  |
| --- |
|  |

[#### Join configuration](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4546987749124834172169608716_body)

You can add one or multiple join partners to the table. Each join partner can either be joined through the primary keys of the tables or through a custom join path. In order for the primary key join to work, the primary keys of the table to be joined need to be included in the primary keys of the base table. You can also add a filter for each joined table.

When creating joins in your extraction, you use child tables and parent tables:

- **Child tables**: To be extracted table.
- **Parent tables**: Joined table to filter the child table.

These tables are then executed in the following order:

1. The extraction will first apply the indicated filters on the parent table as visible on the right hand side.
2. The join of the parent table to the child table is conducted. This join is based on java and is mostly comparable with an inner join in SQL.
3. The additional filters are applied to the table resulting after the join.

You then have the following additional information:

- "Use primary key" means the parent primary key.
- If you join a child (n) table to a to be extracted parent (1) table on the primary key the extracted table will contain duplicates.
- If there are several parent tables, the parents are filtered and then joined top down, before the resulting table is joined to the child.

[#### Time filter](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4630017406646434172169736331_body)

- **Creation date filter**: A filter on a data column that will be used in both full and delta loads. This filter will be combined with the "Filter Statement" under "Additional Filters" with an AND condition. So both conditions must be met.
- **Change date filter**: A filter on a date column that automatically looks for the maximum date in the existing table and sets a filter to only extract data newer than this maximum date. This filter will be combined with the "Delta Filter Statement" under "Additional Filters" with an AND condition.

[#### Additional filter](#UUID-c4d81d09-02fb-0392-9397-e900c6f0292a_section-idm4549073467532834172169796784_body)

- **Filter statement**: Using SQL syntax, specify which rows will be extracted. For example:

  ```
  COLUMN_A > 1 AND COLUMN_B IN ('example1', 'example2')
  ```
- **Delta filter**: Using SQL syntax, specify which additional filters should be applied when the job executes a delta load. This filter statement is combined with the normal filter with the logical AND operator. For example:

  ```
  COLUMN_A > 1 AND COLUMN_B IN ('example1', 'example2')
  ```

|  |
| --- |
|  |

### Extraction parameters

By creating and managing extraction parameters, you can control which data is extracted from your source system based on matches to your criteria.

When creating extraction parameters, you can select between private, public, and dynamic:

- **Dynamic extraction parameters**: Delta filters are used to define which entries in the table are loaded in the delta load. Best practice is to use dynamic parameters with the operation type FIND\_MAX for delta filters as they indicate the maximum value of a defined column. If the indicated table does not exist in the Celonis Platform or is empty, the DEFINED VALUE is utilized. If this VALUE does not exist, the DEFAULT VALUE is utilized.
- **Private (static / default)**: Only admins can see and edit; value is fixed.
- **Public (static)**: Admins can see/edit; but other users (when installing connectors or similar) might also have ability to see/edit in some contexts.

**Table and column references**

When adding your table and column references to your extraction parameter configuration, enter the name only. Adding {brackets} or “NAME“ will result in an error.

For example, the table NAME should be added as: NAME, rather than "NAME" or {NAME}.

### Extraction settings - Debug mode, delta load configuration, connector parameters

The available extraction settings depend on the source system that you're connecting to.

- **Debug mode**: Once enabled, the debug mode provides detailed log information for the data extraction job and will be displayed in the execution logs. This allows for more transparency and easier troubleshooting. This mode is active for three days and the logs created are then deleted.
- **Convert to a delete job**: Converts the extraction task in the data job to a deletion task. All records found by this extraction task will be deleted from your data pool.
- **Delta load configuration**: Select from either:

  - **Option A - Standard**: The delta load will be cancelled, when metadata in your source system changes (i.e. new columns) compared to already extracted data in the IBC. Metadata changes will not be ignored. A full reload or manual changes of your table is necessary to clear this conflict.
  - **Option B - Including metadata changes**: The delta load will include metadata changes (i.e. new columns) and run through with a warning. Only delta loaded rows will include data for the newly added columns. Rows which are not part of the delta load will have the newly added columns nullified. This can lead to inconsistency in your data. A full load is recommended for data consistency.
- **Connector parameters**: The following connector parameters can be configured:

  - **Batch size**: Allows specifying the batch size (in records) for one extraction request.
  - **Max string length**: Allows the modification of the default length (80 characters) of String-type columns.This is configured using the parameter: MAX\_STRING\_LENGTH
  - **Binary data type handling**: Table column with binary data type can be represented in two ways: UTF- 8 or HEX\_NOTATION. Depending on the value specified here the binary value will be converted.
  - **Change default metadata source**: Depending on your database, you can select from:

    - **DRIVER\_METADATA**: This metadata source is supported by all source systems and mostly it is the default one. Here the driver internally runs the metadata Query against the source system and fetches the result set.
    - **SAMPLE\_QUERY**: This metadata source is supported by all source systems. This also works the same as driver metadata, only the query used is different.
    - **INFORMATION\_SCHEMA**: This metadata source is supported mainly by Oracle system. And it's a default metadata source for Oracle 11g.
    - **PG\_CATALOG**: This metadata source is supported by Amazon Redshift. And it's a default metadata source.
  - **Limit total number**: Set the maximum number of records to be extracted per job.

### Extraction preview

Extraction preview is available only for JDBC connections. For the complete list of functionalities available for our commonly supported databases connections, see [Databases](connecting-to-databases.html "Connecting to databases").

### Extraction progression logs

The extraction progression logs are a visual mechanism to let the user know that the extraction is progressing well. The logs are shown for every 100k records and are independent of the batch size.

|  |
| --- |
|  |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating extraction tasks using the Extractions Editor and AI Assistant](extractions-editor.html "Creating extraction tasks using the Extractions Editor and AI Assistant")
- [Creating transformation tasks](creating-transformation-tasks.html "Creating transformation tasks")


---

## data-integration/extraction/data-extractions-and-transformations-for-object-centric-process-mining

# Data extractions and transformations for object-centric process mining

Celonis uses extraction and transformation tasks to convert your business data into an [object-centric data model](ocdm.html "Object-centric data model (OCDM)"), giving you a flexible, system-agnostic view of processes across your organization. You can use predefined extractions and transformations or create custom versions suited to your source systems. The data you extract and transform is then stored in an object-centric data pool.

The flow of data here is displayed in this diagram:

- **Connect**: The first stage is for your source system to be connected to the Celonis Platform. The method of connection depends on the source system you're connecting to, with further details explained here: [Connecting data sources](connecting-data-sources.html "Connecting data sources").
- **Extract**: Once you've connected your source system to the Celonis Platform, you can then use data jobs (known as extraction tasks) to extract that data. Extraction tasks pull relevant data from your source systems (like SAP ECC, Oracle EBS, or other databases) so that it can be transformed into the object-centric model. See: [Extractions](data-extractions-and-transformations-for-object-centric-process-mining.html#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119513846 "Extractions")
- **Transform**: With the data from your source systems available to the Celonis Platform, you can then use transformation tasks to convert that data into objects, events, changes, and relationships. See: [Transformations](data-extractions-and-transformations-for-object-centric-process-mining.html#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119559548 "Transformations").
- **Store**: The objects, events, changes, and relationships that are created from your data are stored in a database in an OCPM data pool. See: [Object-centric data pool](data-extractions-and-transformations-for-object-centric-process-mining.html#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119603404 "Object-centric data pool").

Expand all

[## Extractions](#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119513846_body)

Extractions pull relevant business data from your source systems (like SAP ECC, Oracle EBS, or other databases) and prepare it for transformation into the object-centric model. Think of extractions as data collection pipelines: they gather the right data without altering it.

Extraction tasks work by:

1. **Identify relevant tables and columns**: They locate the source tables that contain the information you need (e.g., invoices, purchase orders, shipments) and then select the attributes to extract (e.g., document ID, vendor, date).
2. **Extracting raw data**: The raw data is then pulled into the Celonis Platform so that transformations can process it. This data is kept unaltered, so it's not turned into objects or events at this stage.

### Using predefined extractions or creating custom extractions

- **Predefined extractions**: Use predefined extractions when you work with standard processes like Accounts Payable, Order Management, or Procurement. They automatically know which tables and fields to pull from SAP ECC or Oracle EBS.
- **Creating custom extractions**: Create custom extractions when your source system isn’t covered, or you have custom tables, attributes, or business processes. Define the tables and columns to extract using SQL, and combine them with custom transformations to populate new objects or events.

[## Transformations](#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119559548_body)

Transformation tasks take the raw data from extractions and turn it into objects, events, changes, and relationships in your object-centric model. They shape your data so you can analyze processes effectively.

Transformation tasks work by:

1. **Creating objects**: Transformation task map raw source data to object types (e.g., invoices, purchase orders, shipments) and then identify changes to each object and store them in change tables.
2. **Creating events**: The tasks use objects and their changes to generate events that reflect real business actions. They then assign attributes to each event, such as timestamps, IDs, or amounts.

An example of transformations within **Objects and Events**:

### Customizing or extending transformations

While we recommend starting with predefined transformations when possible, as they cover common processes and speed up implementation, you also have the option to customize or extend transformation tasks. This allows you to combine custom SQL with predefined transformations to fit your business requirements.

- **Customize transformations** when you need to adjust how Celonis populates objects or events (e.g., missing data, table joins, or ID mappings).
- **Extend transformations** to populate custom attributes or create new object/event types without replacing the original logic.

[## Object-centric data pool](#UUID-4a9252f5-2359-39d1-313d-2cc15855858f_section-id235358119603404_body)

The object-centric data pool is where Celonis stores all your object-centric data: objects, events, changes, relationships, and transformations. Each object and event type gets its own table, and changes or relationships are tracked in supporting tables. By default, a single shared model lives in each data pool, giving you a central workspace and a single source of truth.

The data pool supports development (test) and production (read-only) environments, so you can safely build and validate transformations before using them in production. You control access with data pool permissions, and URLs or API calls always point to the correct model.

For most users, start with a single data pool and model. Enable multiple models only if you need strict data separation for compliance or organizational reasons. Remember: object-centric and case-centric assets can coexist in the same data pool, but each model must be entirely one type or the other.

## Related topics

- [Transformations](creating-custom-transformations.html "Creating custom transformations")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-integration/extraction/digital-twin-extraction

# Digital twin extraction

**Process Simulation in maintenance mode**

Process Simulation is currently in maintenance mode. While existing simulations remain accessible, the creation of new Digital Twin Extractions may be limited. We recommend validating your current model configurations before running new simulation scenarios.

Digital Twin Extraction converts historical event data into a simulation-ready process model. By completing a linear sequence of configuration steps—from initial data mapping to refining branch probabilities—you create a validated virtual replica of your 'as-is' process for dynamic bottleneck and scenario analysis.

Expand all

[## Before you begin](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-id235497716925319_body)

Before creating a digital twin extraction, you need to either create a Studio Space and Package or have access to an existing package.

- [Spaces](creating-and-managing-spaces.html "Creating and managing spaces")
- [Packages](creating-packages.html "Creating packages")

[## Creating a digital twin extraction](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-id235497727097682_body)

To create a digital twin extraction:

1. Click **Studio** and open the Studio space and package you want to create your digital twin extraction in.
2. Click **+ Assets** and select **Simulation**.
3. Configure the following:

   - **Name**: This is where you give your simulation a recognizable title. You should choose something descriptive so that you and your teammates can easily identify what process or "what-if" scenario this simulation is intended to model.
   - **Key**: This is a unique identifier used by the system to reference this specific asset. While the name is for humans, the key is for the platform's internal logic. It is usually auto-generated based on the Name, but you can customize it if you have specific naming conventions.
   - **Knowledge Model:** You need to select the source of truth for your data here. By picking a Knowledge Model, you are telling the simulation which records, attributes, and KPIs it should use to build the Digital Twin.
   - **Activity Table**: Here, you specify the event log from your data model. You are selecting the table that contains your process steps (activities) and timestamps, which allows the simulation to understand the sequence and duration of your actual business process.
4. Click **Create**.

The digital twin extraction wizard loads, guiding you through the following sections:

[### Data check - Simulation parameters](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-id235497731785627_body)

This first step in the wizard, Data Check, serves as the foundational setup for your simulation. Its primary purpose is to map your raw data to the specific attributes the "Digital Twin" needs to run accurately.

Here’s a breakdown of what you are doing in this section:

- **Mapping parameters**: You are identifying the "Who" (User ID), the "How" (User Type), and the "When" (Event time start) of your process. This allows the simulation to distinguish between manual and automated work and understand the actual duration of tasks.
- **Currency configuration**: You are setting the financial baseline so that any cost-based KPIs generated by the simulation are reflected in your preferred currency.
- **Data validation**: The "Data Check" acts as a quality gate. As you can see from the Warning on your screen, it proactively flags issues—like timestamps being rounded to the day—that might prevent the simulation from providing the granular insights you need.

By completing this step, you ensure that the simulation is built on a high-fidelity representation of your actual business operations.

[### Configuring filters](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549774635380_body)

In this step, you can filter your data model based on time or a custom PQL expression (e.g. filter only on a specific country).

On top of that, you can define the granularity of your Digital Twin model, by selecting more or less Activities and Variants.

Note that increasing Activities and Variants increase the configuration complexity.

|  |
| --- |
|  |

**Note**

Use the **Apply Filters** button to reduce the scope of your Process. You can restrict to a specific time interval or use a custom PQL Filter for this purpose. The data filters define the process based on which the Digital Twin is built.

**Note**

Selecting only the activities and variants of interest will reduce the complexity of the model. The non-selected activities and variants are only silently ignored, but are not filtered out of the model.

**Advanced:**

- For the Date Filter the latest 4 months are selected by default
- After applying the Data Filters the Activities are sorted by occurrence and the top activities that cover at least 80% of the total events are selected by default
- Given both the Filters and the Selected Activities the top Variants are selected that cover at least 70% of the cases

  Note that by decreasing the number of selected activities the number of variants decreases and the size of the top variants increases.

  For example in a process with:

  - a set of activities: (A, B, C, D)
  - and cases: (A-B-C-D, A-C, A-B-D-C, A-C, A-B-A),

  the variant (A-C)

  - covers 20% of the cases if the selected activities are A, C and D,
  - but 80% if the selected activities are only A and C.

[### Configuring incoming cases](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549774731212_body)

#### Case Generation Calendar

The calendar hours per week define during which hours new cases arrive to the system per day of the week. You can adjust the hours with the *From* and *To* dropdowns or exclude a day with the slider.

#### Cases per day

The cases per day define the volume of incoming cases and has to be a positive number. If you want zero cases arriving on one day, you need to deactivate the day.

**Note**

The total case input quantity per day of the week depends only on the 'Cases per day' and is not affected by changes on the calendar

Advanced:

You can get into the expert mode and define your arrival process more granular by clicking on a specific day of the week.

In the expert mode it is possible to also adjust the distribution of the inter-arrival times between two consecutive incoming cases, with respect to the calendar hours and the average cases per week.

This means you can directly adjust the distribution type and the standard deviation of the inter-arrival steps. The mean of the distribution is calculated as the ratio of the calendars duration at this day divided by the number of cases arriving.

[### Configuring resources](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549774846250_body)

#### Resource Pools

A Resource Pool is a set of resources that work on specific Activities. You can have only one Pool if the resources work through all of the Activities in the process, or split the Activities in more granular Teams. Each Activity can be assigned to maximum one Pool.

**Note**

Activities that are not assigned to any Resource Pool will be considered as passive activities, will consume no resources, have no Queuing or Processing time. Typical example of a passive Activity is "Due Date passed", which is an Activity happening automatically in the system.

|  |
| --- |
|  |

#### Advanced

**Without User ID**

In case the user ID column is not available (not configured in initial configuration screen) all activities are assigned to the same pool by default.

**With User ID**

- Given the User ID the Activities are clustered based on the User performing each Activity each time. All possible cluster options are returned and can be selected by adjusting the number of resource pools, where the best fit is selected by default.
- You can still make changes by drag and dropping Activities from one Pool to another.
- All Activities that do not consume any resources and have no Processing time belong under "Unassigned".
- All activities that have no values in the User ID column or are always performed by a system user (in case the User Type column is available) will be placed under "Unassigned" by default.

[### Configuring processing times](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549774915548_body)

#### Automation Rate

The Automation Rate defines how many of the cases will be performed manually and how many will be performed by a system user. An Automation Rate of 100% means the activity is fully automated. Manually performed cases will occupy a resource to be processed for a duration defined by the corresponding Processing Time, while automated ones require no resources and have zero Processing Time. Automation Rates can only be estimated if the User Type and the Manual users where set in the first step of the DTE.

#### Processing Times

The time a resource will be occupied in order for a case to be processed by the corresponding Activity and for the case to be able to move to the next task. Processing Times can only be estimated if either one of the Event time start or the User ID columns was provided.

#### Processing Times estimation with Event time start

In case the Start times are available, the time difference (End time) - (Start time) is extracted for each Activity and a distribution is fitted and returned as default recommendation.

#### Processing Times estimation with User ID

In case the Start times are not available but the User ID column is, a user tracking approach is used. The users operating the most activities are tracked and the time steps between finishing consecutive Tasks is used to estimate the Processing Times.

**Example:**

A user performing consecutive the Activities A,B and C having End times 10:00, 10:10 and 11:00 respectively indicates that it took them 10 minutes to perform Activity B and 50 minutes to perform Activity C.

After aggregating over many users, preprocessing to account for outliers and batch jobs a distribution is fitted and returned as a recommendation.

#### Automation Rate

If the User Type column is provided, the ratio of events performed by system users divided by the total number of events per Activity is extracted per Activity. System users is the complementary of the Manual Users defined in the initial config step, including missing values ('-').

[### Configuring pool details](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549774997804_body)

#### Workload Analysis (called 'FTE configuration' in scenario configuration)

##### Vacation

The vacation days per FTE per year. By default, set to 30 days.

##### Working hours per week

The hours each FTE works in one week, by default set to 40 hours.

##### Workload Analysis

The Workload Analysis shows the Estimated Effective Weekly Workload based on the Occurrence of each Activity (as extracted from the data) together with the corresponding Processing Time and Automation Rate. Use this calculation to sanity-check the number of FTE you enter above.

**Note**

The Workload Analysis is not available in the scenario configuration; it is only shown at Digital Twin configuration.

##### Full Time Employees

For each Pool the number of FTEs has to be passed. This number corresponds to Full Time equivalent of employees working on the process as defined by the Data Filters in the first step and processing the Activities that are assigned to this Pool. This means that a Pool with 10 part time employees (working 50%) and 6 full time working half of their time on other processes have an equivalent of 8 FTEs. Note that, similar to the incoming cases, the variant selection is not relevant for the number of FTEs, but rather the whole process defined by the Data Filters.

#### Work Calendar

##### Work Hours

The working hours/work calendar defines the business hours, i.e. during which hours the resources are allowed to work. Not necessarily all resources will work during the whole work calendar. The number of FTEs together with working hours per week and the vacation days per year define the total labor force of each pool which is spread across the work calendar

#### Work Cost

Cost

The cost needed for one hour of work of one FTE of the given Pool.

Advanced:

The number of FTEs is a parameter that is not extracted from the data and has a big impact on the outcome of the simulation. Make sure that resources provided in this step are sufficient for the workload they have, which is relative to the number of incoming cases and the Processing times of the Activities of each Pool.

Use the Workload Analysis as additional input. The Estimated Effective Weekly Workload probably does not perfectly match with the actual FTE value.

[### Configuring branches](#UUID-d8fc7a37-07d0-82d9-f100-d585000649ba_section-idm1763549775100484_body)

#### Probability

The Branching Probabilities define the next Activity a case will reach after it is finished being processed by the Activity before. The sum of the Probabilities for all Branches leaving one Activity must always be 100%.

#### Enabling Time

The Enabling Time is the time a case needs from the moment it is finished being processed by an Activity until it can be processed by the next Activity. Enabling time is what is left from the Throughput Time after removing the Processing and the Queuing time. Examples would be a transport time between stations or the time waiting for a customer to reply.

Similar to the Processing Time it is stochastically defined through a distribution type, a mean and a standard deviation.

## Related topics

- [Process Simulation](process-simulation.html "Process Simulation")
- [Scenario simulation](process-simulation---scenario-simulation.html "Process Simulation - Scenario Simulation")
- [Results](process-simulation-results.html "Process Simulation results")


---

## data-integration/extraction/enabling-partitioned-extractions-of-large-tables

# Enabling partitioned extractions of large tables

When you're looking at extracting large tables of data from your source system, you should consider using partitioned extractions. This allows you to chunk your data jobs into smaller batches which can then be extracted either in parallel or sequentially. These batches are then merged into a single table in the Celonis Platform and function in the same way as tables extracted in full.

By partitioning your data jobs, you're able to both reduce the extraction time and limit the chances of failure (often caused by high data volumes). The number of concurrently running extractions will be limited by the limit of parallel executions in your Data Connection settings. So even if you have 32 partitions, only the maximum allowed number will be run in parallel. The rest will be queued. This can potentially limit the performance gains.

Partitioning of extractions is supported only when the extraction mode is set to "Full Load".

Expand all

[## Supported source systems](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm23486203019943_body)

The following source systems support partitioned extractions of large tables:

- Salesforce
- SAP
- ServiceNow
- JDBC (databases)

[## Enabling and configuring the partitions](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4575753330281634306749162168_body)

The partitioning is set up at the table level and in the data job extraction task:

1. Open the Table Configuration for the table you want to partition and toggle **Enable Partitioned Extraction**:

   |  |
   | --- |
   |  |
2. Click **Configure**.

   |  |
   | --- |
   |  |
3. Follow the guided wizard, with further help for each step of the wizard provided below.

[### Step 1: Generate partitions from range or manually](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4593739511950434311805354186_body)

The first step is to define whether the partitions are dynamically generated from a user-specified range, manually, or from an existing time filter.

- **From a range**:The partitions are generated dynamically before each extraction run. For example, when the lower range is bound to a parameter and the upper one is NOW(), the partition ranges will change automatically depending on when the extraction is run.

  When configuring the partition from a range, you need to define:

  - The key column on which to partition, i.e. CreationDate. See: [Step 2: Key column selection](enabling-partitioned-extractions-of-large-tables.html#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4515107967638434311805417549 "Step 2: Key column selection").
  - The lower and upper bounds of the range, i.e. 01.01.2020 - NOW(). See: [Step 3: Range configuration](enabling-partitioned-extractions-of-large-tables.html#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4519248602737634313630485422 "Step 3: Range configuration").
  - Number of partitions - Automatically Calculated or Fixed. See: [Step 4: Number of partitions](enabling-partitioned-extractions-of-large-tables.html#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4633765157355234313630567825 "Step 4: Number of partitions").
- **Manually**: When the Manual option is selected, you must define each partition yourself by defining the filters.

  |  |
  | --- |
  |  |
- **Existing Time Filter**: When the table you're partitioning has a time filter, the partition range and the column are automatically selected.

  As a result, you see the additional option:

  |  |
  | --- |
  |  |

[### Step 2: Key column selection](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4515107967638434311805417549_body)

For the partitions to be generated dynamically from a range, you need to select the key column. This column should be of Date or Numeric type, so that equal partition ranges can be generated automatically.

The more equal the data is distributed across partitions, the more effective the extractions will be. The “creation date” columns are typically the best candidates for this.

|  |
| --- |
|  |

[### Step 3: Range configuration](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4519248602737634313630485422_body)

After the key column, you need to define the lower and upper bounds of the range. The bounds can be based on:

- Data job parameters, i.e. StartDate.
- Dynamic parameter NOW().
- Hardcoded.

If you want to run a rolling extraction, i.e. extract 1 year of data on a monthly basis, you will need to apply an offset from NOW(). The offset is not directly supported, but as a workaround you can write a transformation that calculates the offset date in vertica every day, i.e. NOW()-365, and then assign it to a parameter. Afterwards, you can use this parameter as the lower bound in your range.

|  |
| --- |
|  |

[### Step 4: Number of partitions](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4633765157355234313630567825_body)

To partition the date range, the formula needs the number of chunks. It can be either calculated automatically on runtime or be fixed.

If automatic: the range will be split into quarters. This option is recommended when you have a dynamic range which changes on each runtime.

|  |
| --- |
|  |

[### Optional: Table selection for joins](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4519248591404834313681529328_body)

When extracting joined tables, you need to select which table to generate your partitions on (either the main table or the join partner).

For example: CDPOS has no date field to run the partitions against it, and therefore we recommend joining on CDHDR to be able to filter on the UDATE.

[### Running the extraction](#UUID-ef368e94-7c3a-ce03-bcde-931642b8d434_section-idm4633764733945634313738642026_body)

When the partitioning is active, the table is extracted in several chunks and then merged via a transformation. This is captured in the Data Job logs.

For each partition, a separate extraction task is created as if it is a table of its own. The table is pushed to the Celonis Platform as an independent table.

For example, if you are extracting table BKPF from SAP ECC with 4 partitions, then the extraction will create four jobs and upon completion four tables in the cloud - BKPF\_0, BKPF\_1, BKPF\_2 and BKPF3.

Once the extraction has finished, a merge transformation is executed to combine these tables into a single one, in this case BKPF. The partitioned tables are then cleaned after five days.

|  |
| --- |
|  |

## Related topics

- [Extractor Builder authentication methods](2761128.html "Extractor Builder authentication methods")
- [Extractor Builder AI Assistant](extractor-builder.html#UUID-e3ab34e4-c36b-2d37-dc2d-89deaf0b6591_UUID-47d58755-86dc-e562-ffb8-e3d3e7314a8e "Extractor Builder AI Assistant")
- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")


---

## data-integration/extraction/executing-delta-extractions

# Executing delta extractions

For a stable and optimized data pipeline, we recommend executing delta extractions from your source system using SQL upserts. SQL upserts eliminate the need for multiple checks and separate insert or update operations, making your code more concise and efficient.

Before introducing SQL upserts, you should understand the difference between delta and full load extractions:

Expand all

[## Executing delta extractions as opposed full load extractions](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm234432837322601_body)

When extracting data from your source systems into the Celonis Platform, you can either execute full load or delta extractions.

- A **full load** extraction creates or replaces all of the data in one or more tables on the Celonis Platform by copying all of the data in the scope of one or more Process Mining Use Cases from a source system into the Celonis Platform. Full load extractions are typically done when setting up a new data model, during initial data loads, or when a complete refresh of the data is required. You should also do a full load extraction if you need to identify and remove any deleted records.
- **Delta extractions** refer to the process of identifying and extracting only the data that has changed (added or updated) since the last extraction or data refresh. This is particularly useful in ETL (Extract, Transform, Load) processes and in scenarios where real-time or near-real-time data updates are required.

[## Using SQL upserts for delta extractions](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm234432850295221_body)

Upsert is slang for a database MERGE operation, combining the words “update” and “insert”. Using SQL upsets allow you to perform either an update or an insert on a table based on a specified primary key value. If the primary key value already exists in a row, the upsert will update the row, and if the value does not exist, it will insert a new row.

As an example, when managing customer contact data:

- **Updated records**: An existing customer contact has been updated since the last data extraction was run, such as a change of address. This is identified by the primary key value and the record against that value is updated.
- **Insert records**: A new customer has been signed and their contact details have been added. As the record is new, no primary key value exists in the row and therefore a new row is added and the new primary key is stored.

As a basic process diagram:

|  |
| --- |
|  |

### Performing SQL upserts

Performing SQL upserts can be done using different SQL dialects.

Below are examples for three popular SQL databases: PostgreSQL, MySQL, and SQLite.

[#### PostgreSQL upsert example](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm234432853497134_body)

PostgreSQL provides the **INSERT ... ON CONFLICT** statement to perform upserts.

```
-- Create a table for demonstration
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100)
);

-- Upsert example
INSERT INTO customers (customer_name, email)
VALUES (customer1, 'customer1@customer.com')
ON CONFLICT (customer_name)
DO UPDATE SET email = EXCLUDED.email;
```

[#### MySQL upsert example](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm23443285355906_body)

MySQL uses the **INSERT ... ON DUPLICATE KEY UPDATE** statement for upserts.

```
-- Create a table for demonstration
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(50) UNIQUE,
    email VARCHAR(100)
);

-- Upsert example
INSERT INTO customers (customer_name, email)
VALUES (customer1, 'customer1@customer.com')
ON DUPLICATE KEY UPDATE email = VALUES(email);
```

[#### SQLite upsert example](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm234432853609102_body)

SQLite uses the **INSERT OR REPLACE INTO** or the **INSERT ... ON CONFLICT** statement for upserts.

```
-- Create a table for demonstration
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT
);

-- Upsert example using INSERT OR REPLACE
INSERT OR REPLACE INTO users (id, customer_name, email)
VALUES ((SELECT id FROM users WHERE customer_name = customer1), customer1, 'customer1@customer.com');

-- Alternative upsert using INSERT ... ON CONFLICT
INSERT INTO users (customer_name, email)
VALUES ('customer1', 'customer1@customer.com')
ON CONFLICT(customer_name) DO UPDATE SET email=excluded.email;
```

[## Delta extraction configuration](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm23443283930299_body)

When executing delta extractions, you have the following options:

- [Delta transformations in the data model](executing-delta-extractions.html#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm4655010699102434192636525392 "Delta transformations in the data model")
- [Adding epoch timestamp](executing-delta-extractions.html#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm4655963189520034192636575332 "Adding epoch timestamp")
- [Setting identifiers](executing-delta-extractions.html#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_UUID-b26b804d-13b5-941d-53e3-539654625c4d "Setting an identifier for tables within a data model")

[### Delta transformations in the data model](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm4655010699102434192636525392_body)

Delta transformations allow you to identify which rows changed in a data model table since the last successful data model load, so these must be configured for your data jobs.

[### Adding epoch timestamp](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-idm4655963189520034192636575332_body)

The final tables used for the process data model are often based on views. Views in Vertica do not have the epoch timestamp column included automatically (like tables). For the delta data model load to work, all view-based tables in the data model need to have an epoch column. This epoch column needs to be added manually by adapting the SQL scripts in the workbench.

Epoch represents a logical timestamp for the data in Vertica, which is implicitly stored for every row in a table. The epoch advances when the data is committed with a DML operation (Insert, Update, Merge, Copy, Delete). This approach allows for efficient detection of changed rows in Vertica.

For view definitions, there are three cases:

#### Simple views

For a simple view, the epoch can be projected as follows in SQL (shortened example):

```
DROP VIEW IF EXISTS P2P_MARC;

CREATE VIEW P2P_MARC AS(
SELECT
     MARC.*,
     epoch
FROM
     MARC AS MARC
...);
```

#### UNION ALL views

For views based on a UNION ALL of multiple tables, the epoch is projected as follows in SQL:

```
DROP VIEW IF EXISTS BKPF_UNION;

CREATE VIEW BKPF_UNION AS(
SELECT *, epoch from BKPF_BSIK
UNION ALL
SELECT *, epoch from BKPF_BSAK
);
```

#### JOIN views

For views based on JOINS, the minimum epoch needs to be projected from the underlying base tables as follows in SQL:

```
DROP VIEW IF EXISTS P2P_EKPO;

CREATE VIEW P2P_EKPO AS(
SELECT
      ...
      EKPO.epoch
   FROM
      EKPO AS EKPO
      JOIN P2P_EKPO_STAGING ON 1=1
...
);
```

### Setting an identifier for tables within a data model

Identifiers allow you to identify unique rows in each table, enabling you to merge the deltas to the existing and loaded data model. You must set identifiers for every table within your data model.

For data models created from process connectors, you may find that the identifier has already been set as part of the guided configuration. You can edit or update identifiers using the same steps below if needed.

[#### Setting an identifier](#UUID-23af8e4e-c229-99ba-656a-0def18f52a68_section-id235504442811975_body)

To set identifiers from your data pool diagram:

1. Click **Data Models**.

   |  |
   | --- |
   |  |
2. Select the data model you want to use for delta loads, opening the data model diagram.
3. For each database table, click **Set Identifier**.

   |  |
   | --- |
   |  |
4. Select the identifier(s) you want to use for this table:

   |  |
   | --- |
   |  |
5. Click **Save**.

   The identifier(s) are now configured for this table, with the key icon indicating this in the data model diagram:

   |  |
   | --- |
   |  |

You can edit existing identifiers from your data model diagram by clicking **Options - Edit**:

|  |
| --- |
|  |

## Related topics

- [Executing data jobs](executing-data-jobs.html "Executing data jobs")
- [Modeling your data](modeling-your-data.html "Modeling your data")
- [Monitoring your data integrations](monitoring-your-data-integrations.html "Monitoring your data integrations")


---

## data-integration/extraction/extractions-editor

# Creating extraction tasks using the Extractions Editor and AI Assistant

**Privacy Statement and Customer Consent**

- The Extractions Editor is designed for read-only access and supporting queries intended to retrieve data without modification. It is configured to limit access to resources within the user’s existing permissions.
- You agree to follow best safety and security practices and use a least privileged database user in Celonis Platform to connect to your cloud or on-prem databases and least privileged operating system user to run queries on your database systems.
- You accept responsibility for your input queries and data transmissions to the AI Assistant, including any impacts on your infrastructure and data.

Extraction tasks allow you to select the data tables to be extracted from your source system (and imported into the Celonis Platform). You can now create, validate, and preview extraction tasks for JDBC source systems using the Extractions Editor and AI Assistant, allowing you to dynamically write SELECT SQL queries and use your source system's SQL dialect.

For more information about the Extractions Editor and AI Assistant see: [Extractions Editor and AI Assistant overview](extractions-editor-and-ai-assistant-overview.html "Extractions Editor and AI Assistant overview")

And for a video demo of these features:

Click for sound

1:17

●●●●●●

Introduction to SQL Editor Features

Joining Tables for Efficient Data Extraction

Utilizing SQL Syntax and Functions

Setting Up Delta Extractions

Previewing and Counting Records

Leveraging AI for SQL Generation

Expand all

[## Before you begin](#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm234618098731804_body)

Before using the Extractions Editor and AI Assistant, you must complete the following prerequisites:

- **JDBC extractor**: If you're currently connecting to your source system using the JDBC extractor, you must update the extractor to version 3.0.0 in order to use the Extractions Editor and AI Assistant.

  For more information, see: [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors").
- **On-premise extractor**: If you're currently connecting to your source system using an on-premise extractor, you must update the extractor to the latest version in order to use the Extractions Editor and AI Assistant.

  For more information, see: [On-premise extractors](on-premise-extractors.html "On-premise extractors").
- **AI Assistant**: You must enable the AI Assistant in your Admin settings.

  For more information, see: [AI Settings](ai-settings.html "AI Settings").

[## Creating and managing extraction tasks for JDBC using the Extractions Editor and AI Assistant](#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm234569679693129_body)

To create extraction tasks using the Extractions Editor and AI Assistant from your Data Pool diagram:

1. Click **Data Jobs** and select an existing data connection scope.

   |  |
   | --- |
   |  |
2. In the extraction row, click **+ Add**.

   |  |
   | --- |
   |  |
3. Enter an extraction task name, select **SQL editor**, and then click **Save**.

   |  |
   | --- |
   |  |

   The SQL editor loads.
4. Using the Extractions Editor and AI Assistant, configure your extraction task by writing an SQL statement.

   For more information about the features available here and the task settings, see: [Extraction task configuration and settings](extractions-editor.html#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm234569827478755 "Extraction task configuration and settings").
5. Click **Save**.

The extraction task is saved and can be managed in the following ways:

[### Managing existing extraction tasks](#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_UUID-50cf7b84-6f2c-b9c3-304d-bc9164ac83b9_body)

You can manage existing extraction tasks by clicking **Options**.

|  |
| --- |
|  |

You have the following options here:

- **Rename**: Update the name of the extraction task.
- **Enable / disable**: Control whether the extraction task should be enabled or disabled for executions.
- **Move up / down**: Change the order in which this task is performed in a full execution.
- **Duplicate**: Create a copy of the extraction task in the existing data job.
- **Execute**: This allows you to manually execute just this task on demand. For more information about executing data jobs, see: [Executing data jobs](executing-data-jobs.html "Executing data jobs").
- **Execute from here**: This allows you to manually execute this and all following tasks on demand. For more information about executing data jobs, see: [Executing data jobs](executing-data-jobs.html "Executing data jobs").
- **Convert to template /copy to regular task:** The task becomes a template and can be added to other data jobs or used to extend the template. If the task is already a template, you can create a regular task from it. For more information about task templates, see: [Creating data job task templates](creating-task-templates.html "Creating data job task templates").
- **Delete**: This deletes the task and all associated content, with no recovery possible.
- **Download table configuration**: This gives you offline access to a zipped file containing any relevant Excel workbook copies of your table configuration.

[## Extraction task configuration and settings](#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm234569827478755_body)

- [Extractions Editor and AI Assistant features](extractions-editor.html#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm23456985465742 "Extractions Editor and AI Assistant features")
- [Extraction settings - Debug mode, delta load configuration, connector parameters](extractions-editor.html#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_UUID-01e08ea2-8c7c-499d-7f5a-4da16ac5cbae "Extraction settings - Debug mode, delta load configuration, connector parameters")

### Extractions Editor and AI Assistant features

When using the SQL editor and AI Assistant to create your extraction tasks, the following features are available:

- **Schema explorer**: The schema explorer allows you to search for and select tables from your Data Model.
- **Target table configuration**: This allows you to setup and configure the table into which your extracted data will be imported. You can assign primary keys and select if the column should be pseudonymized. It’s mandatory to provide the name for the table.
- **Validate SQL**: This validates your current SQL statement and either confirms that it would successfully run or highlights errors for you to address. Please note, this feature is still under development and will be updated further soon.
- **Preview SQL**: This runs your current SQL statement and gives you a preview of the extraction tasks and their associated logs. This is not a complete extraction, we only run the query with a limit of 100 records to ensure the query works and can fetch the data, once extraction is saved and executed.
- **Download SQL**: This gives you offline access to your SQL statement as a .sql file.
- **AI Assistant**: To generate an SQL query using the AI Assistant, you select the tables you would like to include in the query and then type prompts. We recommend keeping the selection limited to 4-5 tables for optimal performance.
- **Undo / redo**: Efficiently undo or redo the most recent changes to your SQL statement.

### Extraction settings - Debug mode, delta load configuration, connector parameters

The available extraction settings depend on the source system that you're connecting to.

- **Debug mode**: Once enabled, the debug mode provides detailed log information for the data extraction job and will be displayed in the execution logs. This allows for more transparency and easier troubleshooting. This mode is active for three days and the logs created are then deleted.
- **Convert to a delete job**: Converts the extraction task in the data job to a deletion task. All records found by this extraction task will be deleted from your data pool.
- **Delta load configuration**: Select from either:

  - **Option A - Standard**: The delta load will be cancelled, when metadata in your source system changes (i.e. new columns) compared to already extracted data in the IBC. Metadata changes will not be ignored. A full reload or manual changes of your table is necessary to clear this conflict.
  - **Option B - Including metadata changes**: The delta load will include metadata changes (i.e. new columns) and run through with a warning. Only delta loaded rows will include data for the newly added columns. Rows which are not part of the delta load will have the newly added columns nullified. This can lead to inconsistency in your data. A full load is recommended for data consistency.
- **Connector parameters**: The following connector parameters can be configured:

  - **Batch size**: Allows specifying the batch size (in records) for one extraction request.
  - **Max string length**: Allows the modification of the default length (80 characters) of String-type columns.This is configured using the parameter: MAX\_STRING\_LENGTH
  - **Binary data type handling**: Table column with binary data type can be represented in two ways: UTF- 8 or HEX\_NOTATION. Depending on the value specified here the binary value will be converted.
  - **Change default metadata source**: Depending on your database, you can select from:

    - **DRIVER\_METADATA**: This metadata source is supported by all source systems and mostly it is the default one. Here the driver internally runs the metadata Query against the source system and fetches the result set.
    - **SAMPLE\_QUERY**: This metadata source is supported by all source systems. This also works the same as driver metadata, only the query used is different.
    - **INFORMATION\_SCHEMA**: This metadata source is supported mainly by Oracle system. And it's a default metadata source for Oracle 11g.
    - **PG\_CATALOG**: This metadata source is supported by Amazon Redshift. And it's a default metadata source.
  - **Limit total number**: Set the maximum number of records to be extracted per job.

[## Extractions Editor and AI Assistant best practice](#UUID-c0201ac9-9362-7ece-cb33-35b85b2c277b_section-idm234620276798197_body)

When using the Extractions Editor and AI Assistant, we recommend the following best practice:

### Extracting nested records from BigQuery

You can place your own free-form SQL into the Extractions Editor and then perform an extraction. Initial testing below, was using the UNNEST Keyword in the BigQuery SQL Syntax and verifying the data was loading in the desired format.

|  |
| --- |
|  |

### Using dynamic parameters

After you create a dynamic parameter, use a placeholder in the following format to reference it in the query:

```
<%=parameter_placeholder%>
```

**Important**

If your dynamic parameter represents a date/time or string, wrap the placeholder in single quotes:

```
'<%=parameter_placeholder%>'
```

Failing to do this may produce runtime errors. For numeric values (e.g., `INT`, `DECIMAL`, `FLOAT`), single quotes are not required.

When using a dynamic parameter in a SQL query, its behavior depends on the type of extraction being run:

- **Full extraction:** The **Default value** of the parameter is used.
- **Delta extraction:** The most recent value of the parameter is used.

This enables you to run or schedule the same extraction for both delta and full extractions without additional configuration.

**Note**

This dynamic parameter behavior applies only to the Extraction Editor, because the extraction is performed using an SQL query as the sole input.

### Be mindful of the quotes around tables (or any objects in the query)

Some database systems support single or double quotes around tables and fields and some don’t. There is another category of systems that support backticks (Example - BigQuery). In the Extractions Editor, there could be errors thrown if you do not use the right quotation marks around the tables or fields.

### Creating a dynamic parameter before writing the query

We recommend that you create a dynamic parameter before you write the query. This way you can schedule a full extraction and a delta extraction using one query. The full extraction (first time) will take the default value of the parameter. After the full extraction the new value of the parameter will be taken resulting in a filter that can subsequently extract delta records.

## Related topics

- [Extractor Builder authentication methods](2761128.html "Extractor Builder authentication methods")
- [Extractor Builder AI Assistant](extractor-builder.html#UUID-e3ab34e4-c36b-2d37-dc2d-89deaf0b6591_UUID-47d58755-86dc-e562-ffb8-e3d3e7314a8e "Extractor Builder AI Assistant")
- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")


---

## data-integration/extraction/extractions-editor-and-ai-assistant-overview

# Extractions Editor and AI Assistant overview

Extraction tasks allow you to select the data tables to be extracted from your source system (and imported into the Celonis Platform). You can now create, validate, and preview your extraction tasks using the Extractions Editor and AI Assistant allowing you to dynamically write SELECT SQL queries and use your source system's SQL dialect.

For guidance on using the Extractions Editor and AI Assistant, see: [Creating extraction tasks using the Extractions Editor and AI Assistant](extractions-editor.html "Creating extraction tasks using the Extractions Editor and AI Assistant").

And for further details about creating extraction tasks using the existing visual editor, see: [Creating extraction tasks using the visual editor](creating-extraction-tasks-using-the-visual-editor.html "Creating extraction tasks using the visual editor").

And for a video demo of this feature:

Click for sound

1:17

●●●●●●

Introduction to SQL Editor Features

Joining Tables for Efficient Data Extraction

Utilizing SQL Syntax and Functions

Setting Up Delta Extractions

Previewing and Counting Records

Leveraging AI for SQL Generation

Expand all

[## What are the Extractions Editor and AI Assistant?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580148144471_body)

The Extractions Editor and AI Assistant offer full control to the users who are configuring extractions. You can now write (or generate) an extraction query as you would on your source system to fetch data. This means more power and flexibility for you, allowing you to use your source system specific SQL functions and JOINS. The AI Assistant not only generates the query but also helps in validating a written query by detecting syntax errors.

[## What challenges are the Extractions Editor and AI Assistant solving for you?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580148188803_body)

Source systems have multiple tables housing various objects and events from different processes. And when connecting to your JDBC databases, our current wizard based approach helps you configure your extractions. While this is relatively easy to use, there are also trade offs for you:

- You could only extract one table at a time, resulting in a larger number of transformations before creating the required data model.
- You had limited data filtering capability because of negligible support for specific source system SQL dialect.
- You needed to traverse a page long GUI with multiple inputs to configure an extraction.

[## What are the benefits of using the Extractions Editor and AI Assistant?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580148226368_body)

- **Flexibility and control**: Using the Extractions Editor, you configure extractions by simply writing a SELECT SQL Query leveraging the SQL dialect of your source system. You join multiple tables existing on your source system already on the extraction phase thereby reducing the need for multiple transformations.
- **Time savings**: There's now a step reduction in extracted data volume and the time to data model creation.
- **AI Assistant**: SQL queries can also be generated and validated using our AI Assistant . Very useful for those who'd like to transfer the task of writing the actual SQL query (remember those cryptic column names on your tables?) all by yourself. The AI Assistant has the context of your tables and happily generates the query for you.

[## Is the Extractions Editor replacing the current visual (wizard based) configuration?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580354482972_body)

Not in the short term. The wizard based configuration will stay as it is for now. We will notify in due course of time when we want to deprecate the visual mode.

[## What is the difference between an extraction created using visual mode vs an extraction created using the Extractions Editor?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580354540856_body)

When you create an extraction using visual mode, you can add several source system tables as a part of that task. Next, you have to configure each of those tables separately using the visual wizard of their own. During the extraction execution, all the tables included in the configuration are extracted to vertica, based on the way you entered inputs during the visual mode.

On the other hand, the extraction task created using the Extractions Editor is “one SELECT Query”. This may refer to a SELECT statement pertaining to one table or you could use a JOIN and combine data from multiple tables. In essence, one extraction task results in one target table in Vertica.

[## Can I switch between the two modes?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370525035_body)

No, both extraction modes work independently of each other as far as configuration is concerned. And extraction created using one mode cannot be converted to another.

However, given the properties of your target table you can replicate a visual mode extraction using the Extractions Editor. For example - you have four tables that you are extracting from your source system. Then you are eventually  joining those tables during transformations into one table in Vertica. You can use the Extractions Editor to create one extraction referring to the eventual target table.

[## Are there any prerequisites before using the Extractions Editor and AI Assistant?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234618109560608_body)

If you're currently connecting to your source system using the JDBC extractor, you must update the extractor to version 3.0.0 in order to use the Extractions Editor and AI Assistant.

For more information about installing and updating the JDBC extractor to version 3.0.0, see: [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors").

[## How can I configure delta extractions using the Extractions Editor?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370746034_body)

You can create a dynamic parameter and use that in the SQL query. As a result the SELECT statement will control what you want to extract from your source tables.

[## What is a target table?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370805055_body)

This refers to the table in vertica that stores your extraction data. In contrast to visual mode, where you could configure the target table as a part of the wizard, the Extractions Editor allows you to to configure the target table once you have finalized your query. With the Extractions Editor, you have to provide a name for the target table.

[## Using the Extractions Editor, how do I type-cast the columns and anonymise the data?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370857326_body)

With the Extractions Editor, the recommendation is to use SQL query to perform these functions.

[## Is the AI Assistant provided with the Extractions Editor or I can use them separately?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370911719_body)

You can choose to enable the Extractions Editor without the AI Assistant. However, it doesn’t work the other way around.

[## Is there an additional charge for using the Extractions Editor and AI Assistant?](#UUID-d2bda212-4add-5737-0132-2de12a8642c1_section-idm234580370966553_body)

There is no additional charge for using the Extractions Editor and AI Assistant.

## Related topics

- [Creating extraction tasks using the Extractions Editor and AI Assistant](extractions-editor.html "Creating extraction tasks using the Extractions Editor and AI Assistant")
- [Creating transformation tasks](creating-transformation-tasks.html "Creating transformation tasks")
- [Executing data jobs](executing-data-jobs.html "Executing data jobs")


---

## data-integration/extraction/extraction-task-best-practice

# Extraction task best practice

When creating and configuring your extraction tasks, we have the following best practice recommendations:

Expand all

[## Always define primary keys](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm235079185485109_body)

The purpose of primary keys are to ensure data integrity by providing a unique identifier for every record. **Before extraction**, as applicable for your data source, you must define the primary key for each extraction job.

**Note**

In some extractors, such as with SAP or Oracle, primary keys are taken directly from the source system. In others, such as Microsoft SQL Server (MSSQL), you may need to assign them manually.

Setting the primary key in advance plays a critical role in optimizing extraction behavior for different load types:

- Full Loads: Primary keys allows the underlying database to set the indexes properly, which improves the overall performance.
- Delta Loads: Primary keys prevents duplicate records and data inconsistency.

To assign a primary key in an extractor, click on the **Configure** button, and then select the required columns as **Primary**.

**Important**

When assigning primary keys, **always** ensure the selected column or combination of columns uniquely identifies each record and does not allow duplicates.

[## Enabling parallel table extractions](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4578479658147234241324029838_body)

You can enable parallel table extraction for existing connections or when adding a new cloud connection via the advance settings of your data connection. You can extract a maximum of ten tables in parallel. Increasing the number of parallel requests allows you to speed up the extraction, though it can be limited by the source system. Note that multiple parallel requests could be sent for a single table, as well as that the response for a single request could include multiple (sub-)tables.

|  |
| --- |
|  |

### Parallel SAP table extractions

For SAP extractions, we check the number of parallel extractions per hostname. Even if you define multiple connections or multiple extraction jobs, the number of parallel table extractions per hostname globally limits the parallelism. The number of parallel running jobs does not increase the limit of parallel running table extractions but only generates a queue. To achieve a higher throughput, you can slowly increase the value of parallel extractions up to a maximum of 30. Always check the extraction times, CPU load and memory usage on the source system and on the extractor server. CPU load and memory usage will increase on both systems due to higher parallelism and overload will make the extraction more inefficient.

### Parallel JDBC table extractions

For JDBC extractions, we check the number of parallel extractions per job. By running multiple jobs at the same time, we can achieve many times the maximum parallel table extractions defined in the JDBC connection. This makes load planning more difficult. It is therefore advisable to use clever time management to avoid configuring overlapping JDBC extractions per source system and Extractor server and instead slowly increase the number of parallel table extractions without overloading CPU and memory on the source system and on the extractor server.

[## Joins in the extraction](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4592483201494434241324071256_body)

When creating joins in your extraction, you use child tables and parent tables:

- **Child tables:** To be extracted table.
- **Parent tables**: Joined table to filter the child table.

These are then executed in the following order:

1. The extraction will first apply the indicated filters on the parent table as visible on the right hand side.
2. The join of the parent table to the child table is conducted. This join is based on java and is mostly comparable with an inner join in SQL.
3. The additional filters are applied to the table resulting after the join.

You then have the following additional information:

- "Use primary key" means the parent primary key.
- If you join a child (n) table to a to be extracted parent (1) table on the primary key the extracted table will contain duplicates.
- If there are several parent tables, the parents are filtered and then joined top down, before the resulting table is joined to the child.

[## Replacing cluster tables in SAP](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4613409283992034241324107568_body)

SAP ECC stores so-called "transparent" and "cluster" tables. The extraction of cluster tables requires significantly more time than the extraction of transparent tables. Therefore, cluster tables should be excluded/replaced if possible.

For more information, see: [Replacing SAP cluster tables (BSEG)](replacing-sap-cluster-tables--bseg-.html "Replacing SAP cluster tables (BSEG)")

[## Using delta filters with dynamic parameters](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4613409312476834241323988992_body)

Delta filters are used to define which entries in the table are loaded in the delta load. Best practice is to use dynamic parameters with the operation type FIND\_MAX for delta filters as they indicate the maximum value of a defined column. If the indicated table does not exist in the Celonis Platform or is empty, the DEFINED VALUE is utilized. If this VALUE does not exist, the DEFAULT VALUE is utilized.

[## VARCHAR optimization](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4592483552176034241324146012_body)

During a full extraction, Celonis checks the size of the actual contents in any VARCHAR column that is at least 64 characters wide and resizes the column as needed to fit the contents. This significantly improves performance since tables with oversized columns can lead to performance issues during transformation and data loads. For delta extractions, columns are automatically enlarged if necessary.

As a result, the column size can change depending on the content. If your transformation code relies on the original column widths, you can override this feature at the beginning of your transformation phase such as:

```
ALTER TABLE table_name ALTER COLUMN colum_name SET DATA TYPE VARCHAR (original column size);
```

When creating new tables during the transformation phase, it is better to use a dynamic column length:

```
CREATE TABLE new_table AS
SELECT column1, column2 FROM table2;
```

Rather than a static one, such as:

```
CREATE TABLE new_table (
       column1 VARCHAR(original column size)
       column2 VARCHAR(original column size)
);
INSERT INTO new_table (column_name)
SELECT column1, column2 FROM table2;
```

[## VARCHAR limitations](#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm235015641298155_body)

The Celonis Platform limits the maximum length of characters in a column to 65,0000 bytes. The actual number of characters stored will vary depending on the specific characters and the encoding used.

If your source system contains more than 65,000 bytes in a specific column, the data will be automatically truncated, and the extraction will finish successfully.

## Related topics

- [System requirements](system-requirements-of-an-on-premise-extractor-server.html "On-premise extractor (legacy) system requirements")
- [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor")
- [Connecting multiple teams](how-do-i-connect-to-multiple-teams-with-the-same-extractor-.html "Connecting multiple teams to the same extractor")


---

## data-integration/extraction/one-time-extraction-from-sap-ecc-or-sap-s-4hana

# One-time extraction from SAP ECC or SAP S/4HANA

While we recommend that you create a continuous connection between the Celonis Platform and SAP ECC or SAP S/4HANA, you can also perform a one-time data extraction from these systems. This involves creating and executing an ABAP report (a GUI program) that runs directly in your SAP system to create CSV files. These CSV files can then be imported into your Celonis Platform using the file uploader.

This is a four stage process, with your SAP Basis team supporting with the third stage:

|  |
| --- |
|  |

For a video overview of the process:

Expand all

[## Step 1: Defining the data scope](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4575678614563234170554028917_body)

The first stage of the process is to define your data scope and the extraction metadata. This specifies which data is extracted from your SAP system and configures how this data is outputted. This includes your data tables, columns, filters, and the pseudonymization options.

To define your data scope, we recommend using a process connector template that includes a one-time ABAP extraction template. This enables you to define your data scope within the Celonis Platform.

For example, the SAP Order-to-Cash process includes the one-time ABAP extraction template:

|  |
| --- |
|  |

However, should your chosen process connector template not include the ABAP extraction template, you must manually define your data scope using Excel. You can also edit the Excel if you want to extend your data scope.

To define your data scope:

1. From your Data Pool overview screen, click **+ New Data Pool** and select **Start with a Process Connector Template**.
2. Search for your required process connector and then click **Install Process Connector**.

   |  |
   | --- |
   |  |

   The process connector installs and your data pool diagram is displayed.
3. From your data pool diagram, click **Data Jobs**.
4. Either use the ABAP template or manually define your data scope:

   1. **If an ABAP extraction template is available for your connector**:

      Click on **ABAP one time extraction** and then click on the available extraction.

      |  |
      | --- |
      |  |

      You can now define the data scope for the existing tables within the browser. This includes configuring the table, editing the parameters, and configuring the extraction settings.
   2. **Alternatively, if an ABAP template is not available for your connector or you would like to manually define your data scope:**

      Click on an existing data job, ideally one that is listed as full extraction or similar. Then select the available extractor and click **Options - Download Table Configuration**.

      |  |
      | --- |
      |  |

      For more information, see: [Manually defining the data scope in Excel](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4566296033910434171869544248 "Manually defining the data scope in Excel").
5. Once your data scope is defined, either using the browser or in the Excel file, continue to [Step 2: Generating and downloading the ABAP report](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4630017290723234170554076222 "Step 2: Generating and downloading the ABAP report").

[### Manually defining the data scope in Excel](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4566296033910434171869544248_body)

When manually defining or extending your data scope in Excel, the table configuration zip file you download and extract has two files:

- **Table-ABAP-Configuration.xlsx**
- Table-Configuration.xlsx

You need to use the ABAP configuration file, giving you access to all the tables and their configurations. When editing the file make sure to keep the formatting and syntax rules, especially for the filters and join conditions. It is a good idea to generate the file from a template and use it as a starting point.

In the Excel, each row represents a table with the following details:

- **Table**: The data table you’re extracting from your SAP system.
- **Filter**: The filters you want to apply to the extracted table.
- **Column**: The columns from the table that you want to extract. An asterisk (\*) indicates that you want to extract all columns, with specific columns only being defined by a comma-separated list.
- **Columns to pseudonymize**: A comma-separated list of columns that you want to hash, removing personal information.
- **Join table**: The table you want to join on to the existing table for filtering purposes.
- **Join table filter**: The filters you want to apply to the tables joined in the previous column.
- **PK\_JOIN**: Indicate whether the joined table should be included in the primary key or not.
- **Parent / child**: If the join is not on the primary keys, then the comma-separated list of the columns on which the join should be done. The join operator is always =, and the condition is AND. Parent is the table on which the join is done, and the child is the extracted table (column A).

[## Step 2: Generating and downloading the ABAP report](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4630017290723234170554076222_body)

After defining your data scope, you now need to generate and download the ABAP report. The process for generating and downloading this report depends on whether you defined your data scope using the extraction template in the browser or using the Excel file:

[### Using the extraction template in the browser](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4499452354420834171934865013_body)

1. From the extraction view of the data job, click **Options - Generate and download ABAP Report**.

   |  |
   | --- |
   |  |

   The ABAP Generator window is displayed.
2. Select the SAP version you are using and then choose how many tables you want to include per report.
3. Click **Generate**.

   The report generates and is automatically downloaded. You can now send this file to your SAP Basis team and they can follow the steps provided here: [Step 3: Generating ABAP output in SAP](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4566295975360034170554130908 "Step 3: Generating ABAP output in SAP").

[### Using the Excel file](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4629977546572834171934937568_body)

1. From your data pool diagram, click **Data Connections**.
2. Click **+ Add Data Connection** and select **Upload Files**.
3. Click **Open SAP ABAP Generator**.
4. Upload the Excel file and verify the SAP version you’re using and choose how many tables you want to include per report.
5. Click **Generate**.

The report generates and is automatically downloaded. You can now send this file to your SAP Basis team and they can follow the steps provided here: [Step 3: Generating ABAP output in SAP](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4566295975360034170554130908 "Step 3: Generating ABAP output in SAP").

[## Step 3: Generating ABAP output in SAP](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm4566295975360034170554130908_body)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With access to the SAP ABAP report created in the previous stage, you can now generate the ABAP output in your SAP source system. This involves creating an executable programme that extracts the data information required by the Celonis Platform.

To generate the ABAP output in your SAP source system:

1. Open transaction SE38.
2. Create a new program:

   - **Name**: Z\_DATENABZUG\_XXX (the name has to begin with Y or Z)
   - **Subobjects**: Source Code
   - **Title**: Data Export (or similar)
   - **Program type**: Executable program
3. Create the report as a local object, avoiding the need for a change request.
4. Insert the code of the generated ABAP report into the input field. We recommend using Windows Editor or Notebook + for this.
5. Click **Activate** (or press Ctrl + F3). The program is activated and starts running.
6. Click **Direct Processing** (or press F8) to continue processing when required.
7. When prompted, you have the following configuration options:

   - **File path**: This specifies the target path for the download. The report is created in the SAP system, not your local machine. By default, the file is extracted to the HOME\_DIR in your SAP system, which is system and user-specific.

     You can check the location of the HOME\_DIR by using the SAP transaction AL11.
   - **Dry run**: This runs a test on the required tables, giving you information if something is incorrectly configured.
   - **Records per file**: This is the number of records exported per CSV file.
   - **Pseudonomizer secret**: Enter any columns that need to be pseudonymized, with each column set to a secret string.
   - **Compression type**: Select from the types available.
   - **Tables**: Select each table you want to extract and then upload to the Celonis Platform.
8. Click **Execute extraction in background** and select the time the background job should start.

   The job runs at the time selected and can be verified by using transaction SM37. Once extracted, the files can be accessed in the SAP file system at the file path specified in step 7. These can files can then be uploaded to the Celonis Platform.

[## Step 4: Uploading files to Celonis Platform](#UUID-6d67d19c-8cd4-6aac-7973-8790a4a9f067_section-idm456629597904163417055416803_body)

With access to the ABAP output from the SAP system, you can now upload those files into the Celonis Platform.

For more information about uploading files, see: [Uploading data files](uploading-data-files.html "Uploading data files").

## Related topics

- .[Uploading data files](uploading-data-files.html "Uploading data files"):
- [Local extraction](local-extractor-for-sap-ecc-and-sap-s-4hana.html "Local extractor for SAP ECC and SAP S/4HANA")
- [RFC module](rfc-module-overview.html "RFC module")


---

## data-integration/extraction/optimizing-sap-ariba-extractions

# Optimizing SAP Ariba extractions

When configuring your SAP Ariba extractions, we recommend considering the following information:

## Filters

The SAP Ariba Extractor only allows date filters that need to be provided in a certain format:

- Filters in the "Filter Statement" section need to be in the following format: createdDateFrom >= DATE(<your from-date>) AND createdDateTo < DATE(<your to-date>). The filter needs to have at least the "createdDateFrom" part, the "createdDateTo" part can be removed if not needed.
- Filters in the "Delta Filter Statement" section need to be in the following format: updatedDateFrom >= DATE(<your from-date>) AND updatedDateTo < DATE(<your to-date>). The filter needs to have at least the "updatedDateFrom" part, the "updatedDateTo" part can be removed if not needed.

**Warning**

You cannot have a filter in the "Filter Statement" and "Delta Filter Statement" sections simultaneously. It needs to be either one or the other. Also, the filter that is being used needs to match your selection of executing a delta or a full load. E.g. if the "Filter Statement" section contains an entry, you can only execute a full load. If the "Delta Filter Statement" section contains an entry, you can only execute a delta load.

## Include metadata changes

If the delta load fails with an error that the metadata has changed, you've got the option to include metadata changes that prevent you from doing a complete reload of all data. Specifically, the delta load will include metadata changes (i.e. new columns) and run through with a warning. Only delta loaded rows will include data for the newly added columns. Rows that are not part of the delta load will have the newly added columns nullified. This can lead to inconsistency in your data. A full load is recommended for data consistency.

This can be done in the extraction settings:

|  |
| --- |
|  |

## Ignore records with warnings

As there can be several fields in the view templates that produce an invalid .json response causing the extraction to fail, we have implemented the option to ignore invalid records from the response. This will allow you to successfully run the extraction without failure, but the extracted data will be incomplete data. This option can be enabled on a table basis in the table configuration:

|  |
| --- |
|  |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/extraction/real-time-extractions-through-replication-cockpit

# Real time extractions through Replication Cockpit

The Replication Cockpit enables you to execute real time extractions from your source systems based on triggers. This ensures that your using the latest data in the Celonis Platform with minimal setup and maintenance system.

During the startup of the database extractor server, a request to integration will be made to get a list of real-time extractions that need to be executed.

- For uplinked database servers: Only the real-time tables where the data sources uses that uplink, will be retrieved
- For the cloud database servers: All the real-time tables where the data source connection type is direct

For the retrieved real-time tables, a continuous extraction will be created.

- This extraction will query the corresponding change log table where CEL\_EXTRACTED=false
- Extracted data will be inserted into replicated tables using the real-time service
- The inserted records are then streamed to the Transformation Service, where the records are processed according to the transformation logic of each table, as defined in EC.
- The transformed records are inserted/merged into the transformed tables

Expand all

[## Supported source systems](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm4570456477049634326370303348_body)

You can use the Replication Cockpit for real time extractions from the following source systems:

- Azure SQL
- Azure Synapse
- Microsoft SQL Server
- Oracle
- Oracle 11g
- SAP S/4HANA
- SAP S/4HANA (Encrypted)

[## Setting up real time extractions](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm4620904756761634326377608049_body)

When configuring the real time extractions, the following steps are needed for data pools where the Replication Cockpit is configured:

- Activating the live extraction mode in the Celonis Platform.
- Creating the changelog tables to store the changes in the source system (performed in the database).
- Installing triggers to monitor the changes in the source systems (performed in the database).

[### Step 1: Activating live extraction mode](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm4514461481566434326394165442_body)

The first step is to activate the live extraction mode in the Celonis Platform:

1. From your data pool diagram, click **Data Connections** and open the required data connection.
2. Enable **Live Data**.

[### Step 2: Creating the changelog tables](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm4543271272430434326394465781_body)

The tables which should be extracted need to be added to the Replication Cockpit.

Database tables in the Replication Cockpit have four options in the context menu:

- **Start**: Starts the real-time extraction for that table
- **Stop**: Stops the real-time extraction for that table
- **Delete**: Deletes the table from the real-time cockpit
- **Trigger Code**: This option will display the “Create Table” statement for a changelog table and a “Create Trigger” statement. The statement ist dynamically generated according to the table and database type and copy&paste of the statement should work without any modification.

[### Step 3: Installing triggers](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm4543271352003234326394509589_body)

Initially, in order to start a real-time extraction for the table, users need to execute the trigger code that is supplied with the table in the Replication Cockpit.

Trigger code will have two separate statements:

- “Create Table” statement for a changelog table:

  - This table should not exist before there “create if not exists” should not be used.
  - This table will contain the changes for that specific table
  - This table will be named as CEL\_CL\_{TARGET\_TABLE\_NAME}
  - This table will have the following structure;

    - CEL\_ID (varchar 40): Random UUID serves as the primary key for the table
    - ROW\_ID (varchar 255): Unique identifier for the record being changed
    - CEL\_CHANGE\_TYPE (type enum(‘I’, ‘U’,’D’)): Defined type of the change either Insert, Update or Delete
    - CEL\_CHANGE\_DATE (type datetime): Timestamp of the change
    - CEL\_EXTRACTED (type boolean): if it is already extracted or not
- “Trigger Table” statement to create the trigger:

  - This statement can be ignored if a trigger already exists with the same name
  - This trigger will insert the changes to the change log table for the corresponding table.
  - This trigger will be named as CEL\_TR\_{TARGET\_TABLE\_NAME}

[### Frequently Asked Questions](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm235014140607727_body)

[#### How does the Replication Cockpit work for JDBC connections?](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm235014141051005_body)

The process is the same as for the replication from SAP:

1. A CL tables and respective triggers are created in the database.
2. The changes are being tracked in the CL tables.
3. On each extraction, an inner join will be done between the main and CL tables to capture the delta.

[#### What is the difference between \_CELONIS\_TMP\_XXX\_NEW\_DATA and \_CELONIS\_TMP\_XXX\_TRANSFORM\_DATA?](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm235014141177703_body)

You should always select from the \_CELONIS\_TMP\_XXX\_TRANSFORM\_DATA (explained [here](https://docs.celonis.com/en/01---real-time-transformations-for-data-model-tables.html)). It gives a guarantee that the same record will be process only once. XXX\_NEW\_DATA exposes all the “staged” records to the query and will result in processing the same record more than once. This might lead to slower transformation runtime and the same record being processed multiple times.

[#### What is the role of the Dependency Transformation Offset value?](#UUID-88f065d0-3614-bfb4-a0e0-66dec06ba527_section-idm235014141273372_body)

The records in the dependent tables are processed with the defined offset to make sure that the “late arriving” records have been properly captured.

## Related topics

- [Prerequisites and setup checklist](setting-up-the-replication-cockpit---prerequisites-and-setup-checklist.html "Setting up the Replication Cockpit - Prerequisites and setup checklist")
- [Setting up the Replication Cockpit](set-up-sap-real-time-extension.html "Setting up the Replication Cockpit")
- [Monitoring and operations](replication-cockpit---monitoring-and-operations.html "Replication Cockpit - Monitoring and operations")


---

## data-integration/extraction/troubleshooting-data-extraction-and-pre-processing

# Troubleshooting data extraction and pre-processing

Expand all

[## Extracted data into an existing data pool that is not the OCPM data pool](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-4bab6762-8261-727a-30b9-c08da6300b61_body)

If you used Celonis before object-centric process mining (OCPM), you may already have extractions set up. You can make this data available to the OCPM data pool by exporting the data connection from the source data pool and importing it into the OCPM data pool. See: [Sharing data between data pools](sharing-data-between-data-pools.html "Sharing data between data pools")

If you plan to run case-centric and object-centric mining in parallel, we recommend using a single extraction data pool that holds all data connections and extractions, and feeding multiple transformation data pools—including the OCPM and case-centric ones. Export the data from the extraction data pool and import it into each transformation data pool.

If you’re not already using this setup, the move to OCPM is a good time to adopt it, as it reduces data duplication, APC usage, source-system load, and overall complexity.

To import data from an existing Data Pool to the OCPM Data Pool, follow these steps:

1. In your existing Data Pool, click on the context menu for the Data Connection (the three vertical dots), and select **Share Data with other Data Pools**.

   |  |
   | --- |
   |  |
2. In the Share Data with other Data Pools window, select the OCPM Data Pool as the target, and share all the tables in the Data Connection.

   |  |
   | --- |
   |  |
3. Go to the OCPM Data Pool, create a new Data Connection, and select **Import data from another Data Pool**. Select the Data Connection you have just shared and click **Synchronize**. The views are automatically created in the OCPM Data Pool.

   **Tip**

   You can’t export a Data Connection from the OCPM Data Pool and share it with another Data Pool, so this procedure doesn’t work the other way around.

Because you are importing the data to the OCPM Data Pool as views:

- Changes to the data in the tables that you already shared from your existing Data Pool (for example, new records being extracted) are automatically reflected in the views in the OCPM Data Pool.
- You’ll need to synchronize the import again if the structure of the shared tables changes, or if you add or remove tables from the Data Connection in the existing Data Pool. To pick up the changes, select the Data Connection in the OCPM Data Pool and click **Synchronize**.
- Any SQL statements you run against the imported views in the OCPM Data Pool do not impact the tables in the existing Data Pool.
- Your APC isn’t impacted by the views, which are essentially just stored SQL queries.

[## Pre-processing raw data before transforming it into objects and events](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-b0939bf1-a404-8b4d-30cc-7d45cd004908_body)

If you need to pre-process source data (filtering, type changes, renaming, etc.) but want to use Celonis’ supplied object and event transformations, keep the standard source table names. Using alternative names (e.g., TMP\_BSEG instead of BSEG) requires creating and maintaining custom overwrites.

To pre-process while preserving standard names:

1. Create a dummy data connection in the OCPM data pool to open a pre-processing scope.
2. Build transformations in the global scope that read the source data and write views into the pre-processing scope with the same names as the original tables.
3. Apply your SQL pre-processing inside these view definitions.
4. Deploy the Celonis-supplied object/event transformations to the pre-processing scope so they run on your processed data.

Views keep the data dynamic and avoid APC usage, but heavy logic in views can slow downstream transformations. If you see performance issues in the ocpm-data-job, switch from views to tables in the pre-processing scope and run ANALYZE STATISTICS on them.

### Setting up a dummy data connection

To set up the dummy Data Connection, follow these steps:

1. In Data Integration or from the Objects & Events dashboard, navigate to the OCPM Data Pool.
2. Select **Data Connections**.
3. Click **Add Data Connection**.
4. Select **Connect to Data Source**. The following steps work for SAP or Database - select whichever matches your context best.
5. Select an uplink (the status doesn’t matter here, as the uplink doesn’t have to be live) and click **Next**.
6. Give your connection a name - we’ve used “Pre-Processing”.
7. Insert dummy values for the remaining mandatory fields, as we’ve done in this example.

   |  |
   | --- |
   |  |
8. Click **Save**.
9. When you see the connection test error message ("Connection test failed, please check the Data Connector's configuration...") ,click **Save Anyway**. This isn’t a live connection.
10. Check the connection overview for the OCPM Data Pool, and verify that the dummy Data Connection is present.

    |  |
    | --- |
    |  |

### Creating the transformations that pre-process the data

To create the transformations that pre-process the data, follow these steps:

1. Create a new data job in the global scope of the OCPM Data Pool. You need to use the global scope because it is the only place with access to both the source data and the pre-processing scope.

   |  |
   | --- |
   |  |
2. For every view that you need in the pre-processing scope, create a transformation in the pre-processing data job containing SQL code based on the following template:

   ```
   DROP VIEW IF EXISTS <%=DATASOURCE:PREPROCESSING_SCOPE%>."TABLE";
   CREATE OR REPLACE VIEW <%=DATASOURCE:PREPROCESSING_SCOPE%>."TABLE" AS (
       SELECT *
       FROM <%=DATASOURCE:SOURCE_SCOPE%>."TABLE"
   );
   ```

   Give your views the same names as the tables in the source data. For example:

   ```
   DROP VIEW IF EXISTS <%=DATASOURCE:PRE-PROCESSING%>."CDHDR";
   CREATE OR REPLACE VIEW <%=DATASOURCE:PRE-PROCESSING%>."CDHDR" AS (
       SELECT *
       FROM <%=DATASOURCE:SAP_ECC%>."CDHDR"
   );
   ```
3. Add any pre-processing that you want to do for the data in each table, in the SELECT statement for the corresponding view, so that the view in the pre-processing scope will contain the pre-processed data. Here are some examples of pre-processing for common troubleshooting situations. You might also want to combine the different templates below.

   - Rename a table to the name expected by the Celonis transformations (see [The table names or column data types in the extracted data differ from the SAP standard](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-394a79f3-440a-8e69-64c4-d9241912bf4b "The table names or column data types in the extracted data differ from the SAP standard")).

     ```
     DROP VIEW IF EXISTS <%=DATASOURCE:PREPROCESSING_SCOPE%>."NEW_NAME";
     CREATE OR REPLACE VIEW <%=DATASOURCE:PREPROCESSING_SCOPE%>."NEW_NAME" AS (
         SELECT *
         FROM <%=DATASOURCE:SOURCE_SCOPE%>."OLD_NAME"
     );
     ```
   - Convert a column data type to the type expected by the Celonis transformations, using CAST (see [The table names or column data types in the extracted data differ from the SAP standard](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-394a79f3-440a-8e69-64c4-d9241912bf4b "The table names or column data types in the extracted data differ from the SAP standard")).

     ```
     DROP VIEW IF EXISTS <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF";
     CREATE OR REPLACE VIEW <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF" AS (
         SELECT
             MANDT,
             CAST(BUKRS AS VARCHAR),
             BELNR,
             GJAHR,
             ...
         FROM <%=DATASOURCE:SOURCE_SCOPE%>."BKPF"
     );
     ```
   - Replace NULL values for a primary key (here, the accounting document number BKPF-BELNR) with an empty string, using the COALESCE() function. Don’t use ISNULL or IFNULL, as these functions are not supported for object-centric transformations. (See [Error message: Cannot set a NOT NULL column (ID) to a NULL value in INSERT/UPDATE statement.](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-8349c7bc-a29d-9deb-fde3-88af8ccba7d0 "Error message: Cannot set a NOT NULL column (ID) to a NULL value in INSERT/UPDATE statement.").)

     ```
     DROP VIEW IF EXISTS <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF";
     CREATE OR REPLACE VIEW <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF" AS (
         SELECT
             MANDT,
             BUKRS,
             COALESCE(BELNR,''),
             GJAHR,
             ...
         FROM <%=DATASOURCE:SOURCE_SCOPE%>."BKPF"
     );
     ```
   - Include only data starting with the year 2023 in a view (see [Creating objects and events for a limited data scope](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-56c0f685-f924-3c07-b0eb-8b5a41b0be41 "Creating objects and events for a limited data scope")).

     ```
     DROP VIEW IF EXISTS <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF";
     CREATE OR REPLACE VIEW <%=DATASOURCE:PREPROCESSING_SCOPE%>."BKPF" AS (
         SELECT *
         FROM <%=DATASOURCE:SOURCE_SCOPE%>."BKPF"
         WHERE GJAHR >= '2023'
     );
     ```
4. When you’ve created all the transformations, run the pre-processing data job to create the views in the pre-processing scope in the OCPM Data Pool, and verify that they contain the required changes.
5. In the OCPM Data Pool, schedule the pre-processing data job to run before the OCPM data job (ocpm-data-job).

To deploy the Celonis-supplied transformations for objects and events to the pre-processing scope, follow the steps in [Quickstart: Extract and transform your data into objects and events](quickstart--extract-and-transform-your-data-into-objects-and-events.html "Quickstart: Extract and transform your data into objects and events"), but in Stage 2 (*Enable the processes you want*), select your dummy Data Connection for the pre-processing scope, instead of the Data Connection for your source system. Then the Celonis-supplied transformations for the objects and events in the process will be deployed to the pre-processing scope and operate on your pre-processed data.

[## Creating objects and events for a limited data scope](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-56c0f685-f924-3c07-b0eb-8b5a41b0be41_body)

To limit your data scope (e.g., to one year) for performance or other reasons, you normally apply filters in the extraction. If you must keep extracting full tables to avoid impacting other use cases, restrict the data during pre-processing instead, using the method in [Troubleshooting – Data Extraction – Pre-processing raw data](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-b0939bf1-a404-8b4d-30cc-7d45cd004908 "Pre-processing raw data before transforming it into objects and events") (includes an example for filtering to 2023).

If no other use cases require the full dataset, simply filter the extraction directly in the OCPM data pool using the visual editor’s filter settings.

[## Extracting data from multiple source systems (for example, separate SAP instances)](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-52843529-6bc5-11aa-8cf2-7679ed10806b_body)

If your data comes from multiple source systems (e.g., SAP Spain, SAP Germany, SAP France, or different system types like SAP ECC and Oracle EBS), you can deploy the same process transformations for each source system. The OCPM data job (ocpm-data-job) then merges all source data into a single table per object or event type.

First, ensure all source tables are in the OCPM data pool. You can either set up a data connection for each system directly or export/import it from another data pool.

Once each data connection is in the OCPM data pool, install the required processes from the catalog for each connection. The data job merges all source systems’ data into unified tables for objects and events.

[## Not all tables required by the Celonis transformations were extracted](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-9fd7f367-06d4-04dd-abab-7224ca6718ab_body)

Celonis-supplied transformations need specific tables and columns. If you reuse a dataset created for case-centric processing, it may not include everything required.

When you publish the OCPM data job, Celonis adds `transformation_initialize_source_tables` to create empty placeholder tables for any missing ones required by Celonis-supplied transformations. This prevents failures, but placeholder tables contain no data, meaning objects and events based on them aren't created.

To see which objects and events are affected, open the Data Model load details and check the row counts. A count of 0 means no records were available. This transformation does not handle missing columns. If a required table is missing columns, its transformation will fail and indicate the first missing column. Update your extraction to include the missing fields.

|  |
| --- |
|  |

[## The table names or column data types in the extracted data differ from the SAP standard](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-394a79f3-440a-8e69-64c4-d9241912bf4b_body)

The Celonis-supplied transformations from the processes in the catalog require the standard table names and column data types used in the source system. If your tables have had a prefix added to the table name (for example SAP\_VBAK) or use an alternative table name, or if you have columns with nonstandard data types, there are several possible solutions:

1. Rename the tables or change the column data types during extraction. This is the easiest solution, but you can only do it if you aren't using the tables and columns for any other use case that requires the existing setup.

   - To rename a table, in the extraction configuration, select the checkbox **Rename target table** for any tables that need renaming, as shown in this example. Then carry out a full load to re-extract the table with the new name.

     |  |
     | --- |
     |  |
   - To change a column's data type, go to the extraction configuration where the table containing the column is defined, and click on the column configuration. Adjust the data types and click **Confirm**. Save the updated settings, then carry out a full load to re-extract the column with the new data type.

     **Note**

     Extractors don’t support all types of conversions. For example, you couldn’t convert a VARCHAR into a DATE. Also, not all extractors allow data type conversions at all. If you can’t do the conversion you want with the extractor you’re using, you’ll need to try one of the other solutions.

     |  |
     | --- |
     |  |
2. Rename the tables or change the column data types during a pre-processing stage. If you need to pre-process the data for other reasons as well, this is a convenient solution, and it works for shared tables.
3. Create partial overwrites or full overwrites to replace the Celonis-supplied transformations. You can create a partial overwrite to change the definition of an individual column, or a full overwrite to change the name of a table.

   **Important**

   Creating a full overwrite of a transformation for a Celonis object or event type prevents it from receiving future updates from the Celonis catalog. New properties added to the object or event type will not be populated, and related apps may not function. If a full overwrite is used, you must manually track and apply future updates. Whenever possible, make changes during extraction or pre-processing instead.

   |  |
   | --- |
   |  |

[## Error message: Cannot set a NOT NULL column (ID) to a NULL value in INSERT/UPDATE statement.](#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-8349c7bc-a29d-9deb-fde3-88af8ccba7d0_body)

Celonis-supplied transformations enforce primary keys. If a primary key column in the source data contains NULL values, the OCPM data job (ocpm-data-job) fails with an error such as: “ERROR: Cannot set a NOT NULL column (ID) to a NULL value in INSERT/UPDATE statement.”

To fix this, we suggest:

1. During table extraction, remove records with NULL values in primary key columns using the filter settings described in [Creating extraction tasks using the visual editor](creating-extraction-tasks-using-the-visual-editor.html "Creating extraction tasks using the visual editor"). If these records are needed for your analysis, replace NULLs with empty strings or another placeholder to prevent transformation failures.
2. Replace NULL values during a pre-processing stage. This works well for shared tables and when pre-processing is needed for other purposes. Use the COALESCE() function to replace NULLs in primary key columns with an empty string. Avoid ISNULL or IFNULL, as they are not supported for object-centric transformations.
3. Create a full overwrite of the Celonis-supplied transformation to change the primary key or other settings. This replaces the original transformation entirely, but careful configuration is required to avoid unintended consequences.

   **Important**

   Full overwrites block future catalog updates; make changes during extraction or pre-processing whenever possible.

   |  |
   | --- |
   |  |

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

