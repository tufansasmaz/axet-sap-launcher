# Celonis Platform Skills Reference

> A comprehensive Claude Code skills file for working with the Celonis Process Mining & Execution Management platform.
> Based on the complete Celonis documentation (1,395 pages, May 2026).

---

## Platform Overview

Celonis is a process mining and execution management platform. It connects to enterprise source systems (SAP, Salesforce, ServiceNow, databases), ingests event logs, reconstructs business processes, and enables analysis, optimization, and automation.

**Core workflow**: Source System -> Data Integration -> Data Model -> Process Mining -> Analysis/Studio -> Action/Automation

**Key components**:
- **Data Integration**: Connectors, extraction, transformation, replication, data pools
- **Data Model**: Table relationships that PQL queries run against (implicit joins, no FROM/JOIN needed)
- **Studio**: Low-code app builder for dashboards, views, analyses, knowledge models
- **PQL (Process Query Language)**: The analytical query language -- read-only, column-based, process-mining-native
- **Action Engine / Action Flows**: Automation layer connecting insights to actions
- **Knowledge Models**: Central business logic layer (KPIs, attributes, filters, variables)

---

## Process Query Language (PQL)

PQL is NOT SQL. Key differences:
- No `FROM`, `JOIN`, or `GROUP BY` clauses -- the data model handles all table relationships implicitly
- Read-only: no INSERT, UPDATE, DELETE, CREATE
- Column references use double quotes: `"Table"."Column"`
- String literals use single quotes: `'value'`
- Grouping is implicit: non-aggregated columns become groupers automatically
- All filters are order-independent (stable) and propagate across joins

### Basic Syntax

```pql
-- Column reference
"Activities"."ACTIVITY"

-- Aggregation (implicit GROUP BY on non-aggregated columns)
COUNT("Activities"."ACTIVITY")
SUM("Orders"."Amount")
AVG("Activities"."THROUGHPUT_TIME")
MIN("Activities"."EVENTTIME")
MAX("Activities"."EVENTTIME")
MEDIAN("Orders"."Amount")
STDEV("Orders"."Amount")

-- String aggregation
STRING_AGG("Activities"."ACTIVITY", ' -> ')

-- Counting distinct
COUNT(DISTINCT "Activities"."ACTIVITY")
```

### CASE WHEN

```pql
CASE
  WHEN "Orders"."Amount" > 10000 THEN 'High'
  WHEN "Orders"."Amount" > 1000 THEN 'Medium'
  ELSE 'Low'
END
```

### FILTER

```pql
-- Basic filter
FILTER "Activities"."COUNTRY" IN ('US', 'DE');

-- Forced filter (cannot be overridden by user selections)
FILTER FORCED "Activities"."STATUS" = 'Active';

-- Filter with aggregation
SUM("Orders"."Amount", FILTER "Orders"."Type" = 'Purchase')
```

### Pull-Up Functions (PU_)

The signature Celonis capability -- cross-table nested aggregation without subqueries. PU_ functions are calculated once and ignore global filters.

**Syntax**: `PU_X("target_table", "source_table"."column" [, filter_condition])`

```pql
-- Sum of activity durations per case
PU_SUM("Cases", "Activities"."Duration")

-- Count activities per case with filter
PU_COUNT("Cases", "Activities"."ACTIVITY", "Activities"."Status" = 'Complete')

-- Available PU_ functions:
-- PU_SUM, PU_COUNT, PU_AVG, PU_MAX, PU_MIN
-- PU_FIRST, PU_LAST, PU_MEDIAN, PU_MODE
-- PU_STRING_AGG, PU_QUANTILE, PU_TRIMMED_MEAN
```

### Process Mining Functions

```pql
-- Throughput time (case start to specific activity)
CALC_THROUGHPUT(CASE_START TO LAST_OCCURRENCE['Approve'],
  REMAP_TIMESTAMPS("Activities"."EVENTTIME", DAYS))

-- OCPM throughput
CALC_THROUGHPUT("ObjectTable",
  FIRST_OCCURRENCE['Create'] TO LAST_OCCURRENCE['Close'], DAYS)

-- Rework count
CALC_REWORK("Activities"."ACTIVITY")

-- Activity ordering
INDEX_ACTIVITY_ORDER("Activities"."ACTIVITY")

-- Source/target activity pairs
SOURCE("Activities"."ACTIVITY") || ' -> ' || TARGET("Activities"."ACTIVITY")

-- Process pattern matching
MATCH_PROCESS("Activities"."ACTIVITY",
  NODE ['Create PO'] AS src,
  NODE ['Approve PO'] AS tgt
  CONNECTED BY DIRECT [src, tgt])

-- Regex-based process matching
MATCH_PROCESS_REGEX("Activities"."ACTIVITY", '.*Create.*Approve.*Close.*')

-- Variant detection
VARIANT("Activities"."ACTIVITY")
```

### Datetime Functions

```pql
-- Difference between timestamps
DATEDIFF(dd, "Activities"."START", "Activities"."END")
-- Units: ss (seconds), mi (minutes), hh (hours), dd (days), ww (weeks), mm (months), yy (years)

-- Date modification
DATEADD(dd, 30, "Orders"."OrderDate")

-- Rounding
DATE_ROUND("Activities"."EVENTTIME", DAY)
DATE_ROUND("Activities"."EVENTTIME", MONTH)

-- Extraction
YEAR("Orders"."Date")
MONTH("Orders"."Date")
DAY("Orders"."Date")
HOUR("Activities"."EVENTTIME")

-- Calendar-aware calculations (using workday calendars)
REMAP_TIMESTAMPS("Activities"."EVENTTIME", DAYS)
```

### Moving & Window Aggregation

```pql
-- Moving average (last 7 entries)
MOVING_AVG("KPI"."Value", 7)
MOVING_SUM("KPI"."Value", 7)
MOVING_COUNT("KPI"."Value", 7)
MOVING_MAX("KPI"."Value", 7)
MOVING_MIN("KPI"."Value", 7)
```

### Static PQL (Compile-Time)

```pql
-- Conditional logic evaluated at compile time
IF ARGUMENT_COUNT(<%=myVariable%>) > 0
  THEN FILTER "Table"."Col" IN (<%=myVariable%>);
END;

-- Column type checking
COLUMN_TYPE("Table"."Column")

-- Static CASE WHEN
STATIC CASE WHEN <%=mode%> = 'detail' THEN "Table"."DetailCol"
            ELSE "Table"."SummaryCol" END
```

### String Functions

```pql
CONCAT("Table"."FirstName", ' ', "Table"."LastName")
LEFT("Table"."Code", 3)
RIGHT("Table"."Code", 2)
SUBSTRING("Table"."Code", 1, 5)
LEN("Table"."Name")
UPPER("Table"."Name")
LOWER("Table"."Name")
TRIM("Table"."Name")
REPLACE("Table"."Name", 'old', 'new')
```

### Null Handling

```pql
COALESCE("Table"."Col1", "Table"."Col2", 'default')
ISNULL("Table"."Column")
IS NOT NULL
```

### KPI References

```pql
-- Reference a Knowledge Model KPI in a query
KPI("kpi_id")
KPI("kpi_id", VARIABLE('param_name'))
```

---

## Data Model Concepts

- **Tables** are connected via 1:N relationships (foreign keys defined in the data model, not in PQL)
- **Activity table**: Must have `CASE_ID`, `ACTIVITY`, `EVENTTIME` (timestamp) columns minimum
- **Case table**: One row per case, linked to activity table via CASE_ID
- PQL automatically traverses defined relationships -- no explicit JOINs needed
- **BIND operator**: Used for 1:N:1 relationship paths when the default path is ambiguous
- **Object-Centric Data Model (OCDM)**: Events can involve multiple object types simultaneously (vs traditional single-case model)

### Object-Centric Process Mining (OCPM)

- Objects exist independently -- not tied to a single case
- Events can reference multiple objects of different types
- More realistic modeling of real business processes (e.g., one invoice can relate to multiple purchase orders)
- Uses **Perspectives** to define which objects and events to analyze
- PQL syntax is similar but references object tables instead of case tables

---

## Knowledge Models

Central business logic layer in Studio. Contains:

- **KPIs**: Named PQL formulas (e.g., "On-Time Delivery Rate") reusable across all views/analyses
- **Calculated Attributes**: Derived columns computed via PQL
- **Augmented Attributes**: AI/ML-enhanced data attributes
- **Filters**: Predefined filter conditions
- **Variables**: Parameterized inputs for dynamic queries
- **Records**: Structured data definitions linking to data model tables

KPIs and attributes defined here are referenced across Studio views, analyses, and Action Flows.

---

## Studio

Low-code development environment for building process mining apps.

**Asset types**: Views, Analyses, Knowledge Models, Action Flows, Skills, Packages

**Views**: Drag-and-drop dashboards on a grid-based canvas. Components include:
- Charts (line, bar, pie, donut, area)
- Tables (OLAP, pivot, standard)
- Single KPI displays
- Process Explorer (visual process flow)
- Variant Explorer (process variant comparison)
- Conformance Checker (actual vs. target process)
- Interactive elements (buttons, dropdowns, date pickers)

**Packages**: Bundled collections of assets for distribution and reuse across teams.

---

## Automation

### Action Flows
Visual automation builder with 60+ connectors:
- **Enterprise**: SAP S/4HANA, Salesforce, ServiceNow, Workday, Oracle
- **Productivity**: Slack, Microsoft 365, Google Workspace, Jira
- **RPA**: UiPath, Automation Anywhere
- **Data**: Snowflake, BigQuery, custom REST APIs

Trigger types: Scheduled, after data job completion, manual, event-driven

### Action Engine
Connects process intelligence findings to targeted corrective actions.

### Skills
Reusable automation tasks that can be triggered from Studio views or Action Flows.

---

## Data Integration

### Connectors (60+)
- **Databases**: Amazon Redshift, Athena, Azure SQL, Synapse, BigQuery, Databricks, Hive, MySQL, Oracle, PostgreSQL, Snowflake, SQL Server, Teradata
- **Applications**: SAP ECC, SAP S/4HANA, Salesforce, ServiceNow, Workday, Oracle EBS
- **File-based**: CSV, Parquet, SFTP, Azure Blob, S3, Google Cloud Storage

### Pipeline
1. **Extraction**: Pull data from source systems using extractor templates
2. **Transformation**: Clean, enrich, and reshape data within Celonis
3. **Loading**: Populate data models for analysis
4. **Replication**: Keep data in sync with source systems (incremental/full)

### Data Pools
Storage layer managing ingested data. Supports multiple data connections, scheduling, and data job orchestration.

---

## AI Capabilities

- **Process Copilot**: Conversational AI interface -- ask questions about your process data in natural language
- **Insight Explorer**: Automated discovery of process insights and anomalies
- **Annotation Builder**: LLM-powered data enrichment (classify, extract, summarize unstructured data)
- **AI Tools in Views**: AI-assisted component configuration and PQL generation

---

## Administration

- **SSO/SAML**: Enterprise single sign-on integration
- **OAuth**: API authentication for external integrations
- **API Keys**: Programmatic access to Celonis APIs
- **Teams & Permissions**: Role-based access control (Admin, Analyst, Viewer, etc.)
- **Audit Logs**: Track all platform activities and changes
- **On-Prem Clients**: Secure data extraction from on-premises systems behind firewalls

---

## Common PQL Patterns & Recipes

### Throughput Time Between Two Activities
```pql
AVG(CALC_THROUGHPUT(
  FIRST_OCCURRENCE['Create Order'] TO LAST_OCCURRENCE['Deliver'],
  REMAP_TIMESTAMPS("Activities"."EVENTTIME", DAYS)))
```

### Cases with Rework
```pql
FILTER CALC_REWORK("Activities"."ACTIVITY") > 0;
COUNT("Cases"."CASE_ID")
```

### Top N Bottleneck Activities
```pql
-- Activities with highest average duration
AVG(DATEDIFF(hh,
  SOURCE("Activities"."EVENTTIME"),
  TARGET("Activities"."EVENTTIME")))
```

### Process Conformance Rate
```pql
-- Percentage of cases following the target process
ROUND(
  COUNT(CASE WHEN MATCH_PROCESS_REGEX("Activities"."ACTIVITY",
    '.*Create.*Approve.*Ship.*Invoice.*') THEN 1 END)
  * 100.0 / COUNT("Cases"."CASE_ID"), 2)
```

### Automation Rate
```pql
ROUND(
  SUM(CASE WHEN "Activities"."USER_TYPE" = 'SYSTEM' THEN 1 ELSE 0 END)
  * 100.0 / COUNT("Activities"."ACTIVITY"), 2)
```

### SLA Compliance
```pql
ROUND(
  COUNT(CASE WHEN CALC_THROUGHPUT(CASE_START TO CASE_END,
    REMAP_TIMESTAMPS("Activities"."EVENTTIME", DAYS)) <= 5 THEN 1 END)
  * 100.0 / COUNT("Cases"."CASE_ID"), 2)
```

### First-Time-Right Rate
```pql
ROUND(
  COUNT(CASE WHEN CALC_REWORK("Activities"."ACTIVITY") = 0 THEN 1 END)
  * 100.0 / COUNT("Cases"."CASE_ID"), 2)
```

---

## Tips & Best Practices

- Use **PU_ functions** instead of nested subqueries -- they're optimized for Celonis's engine
- Always use **Knowledge Model KPIs** for reusable metrics instead of hardcoding PQL in views
- **FILTER FORCED** for security/compliance filters that users cannot override
- Use **workday calendars** with REMAP_TIMESTAMPS for accurate business-day throughput
- **OCPM** is preferred for complex processes involving multiple object types (e.g., Order-to-Cash with orders, deliveries, invoices)
- Keep **data transformations** in the data pipeline, not in PQL queries -- better performance
- Use **Static PQL** for compile-time optimizations when queries depend on user-selected variables
- **Variant analysis** is the fastest way to identify process deviations
- **Conformance checking** against a target model quantifies process compliance

---

*Generated from Celonis documentation (1,395 pages) | May 2026*
*For Claude Code: place this file in your project root as CLAUDE.md or import with @celonis-skills.md*
