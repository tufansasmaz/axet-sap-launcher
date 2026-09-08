# PQL: Core, Datetime, Math, Logical, Window, Data Types

## pql/pql-editor-overview

# PQL editor overview

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The PQL editor enables you to run studio analysis reports, with the following supported features:

## 1) Code Auto-completion

|  |
| --- |
|  |

Get context-sensitive code suggestions as you type or when triggered with **Ctrl+Space**. To toggle the details window for a completion item, navigate upon it with **Up**/**Down** arrow buttons and hit **Ctrl+Space** again. To apply the completion, hit **Enter**. Some of the types of completion items are **Function**, **Column**, **Table**, **Keyword**.

For **Function** completions, the details window contains brief documentation and when the completion is applied, the corresponding code snippet with parameter placeholders is inserted.

## 2) Code Diagnostics

|  |
| --- |
|  |

|  |
| --- |
|  |

With code diagnostics, you can spot the PQL syntax errors quickly. As you type, automatically **Errors** are highlighted with red color whereas **warnings** are highlighted with yellow color. Warnings do not indicate a broken PQL query but point out deprecated/discouraged usages in the language. Hover over the diagnostic annotations to learn details about them. Use a mini-map on the right-hand-side of the editor to quickly identify lines with syntax errors.

## 3) Code Formatting

|  |
| --- |
|  |

A PQL query is formatted by hitting the keyboard shortcut **Ctrl+Shift+I.** If the query is short, formatting may yield a result where it's fitted into a single line. The formatting strategy tries to place 120 characters in a line before attempting to push the query contents to a new line. If the query is valid but incomplete, formatting is still possible. In certain cases where there are many syntax errors, formatting cannot be performed. In these cases document does not change even if **Ctrl+Shift+I** is hit.

## 4) Code Folding

|  |
| --- |
|  |

Some symbols/keywords in PQL define a block of code that can be folded. For example a pair of parentheses or **CASE** and **END.** When these symbols occur in different lines, the new PQL editor can fold those lines when the arrow buttons next to the corresponding line number are clicked. Typically formatting your query helps to find out about the folding blocks. This feature is useful when one wants to focus on a particular fragment of the code as an unimportant query can be folded away. Another use case is to explore a large PQL query.

In the command palette (triggered with **F1**) there are a number of useful commands related to code folding: **Fold all**, **Unfold all**, etc.

## 5) Miscellaneous Features

### Editor Commands

There are a variety of commands packed within the new PQL editor. The complete list can be displayed in the **Command Palette** that is triggered with **F1.** Some of the common keyboard shortcuts/commands improving productivity are:

|  |
| --- |
|  |

|  |
| --- |
|  |

### Mini-map

Displayed on the right-hand side of the editor. Shows a zoomed-out version of the editor. Useful when navigating a long query.

### Zoom in/out

Scroll your mouse wheel while holding the **Ctrl** button to increase/decrease the editor font size.

### Copy/Paste with Style

Editor contents are copied as rich text instead of plain text. Therefore when pasted to another document/text editor that supports rich texts (for example Google Docs), style is retained.


---

## pql/pql-function-library

# PQL Function Library

## Description

PQL provides a wide variety of functions and operators that can be used within a query.

This sections contains all available functions and operators. In contrast to operators, functions obey a strict syntax of listing function parameters - especially the more complex ones like [CASE WHEN](case-when.html "CASE WHEN").

### Deprecated Operators

You might find that some of your favorite operators have an annotation that marks them as being deprecated. This means there is a new operator that can be used for solving the same problem. The new operator probably supports more functionality, can be more performant or easier to use. If an operator is marked as deprecated, we recommend to use the new operator, which should be linked in the documentation. There will be no new features added to the deprecated operator, only to the replacement. As long as it is not marked with a removal date, we do not plan to remove the operator any time soon, so you don't have to migrate to the replacement.

### Operator Precedence

If an expression contains more than one operator, the operators are evaluated in order of operator precedence. To influence the evaluation order you can use parentheses which have the highest operator precedence and are evaluated first. Operators with the same operator precedence are evaluated from left to right.

#### Expressions

| Precedence | Operator | Operation |
| --- | --- | --- |
| Highest | `()` | parentheses |
|  | `+`, `-` | unary positive and negative operator |
|  | `*`, `/`, `%` | multiplication, division, modulo |
|  | `+`, `-` | addition, subtraction |
|  | `||` | concatenation |
| Lowest | `=`, `!=`, `<`, `≤`, `>`, `≥` | equal, not equal, less than, less than or equal, greater than, greater than or equal |

#### Logical Expressions

| Precedence | Operator | Operation |
| --- | --- | --- |
| Highest | `()`, `NOT()` | parentheses, parentheses with logical negation |
|  | `AND` | conjunction |
| Lowest | `OR` | disjunction |


---

## pql/pql-performance-optimization-guide

# PQL performance optimization guide

## Description

As the complexity of the PQL queries grows, you might experience a decline in query performance. A noticeably prolonged query runtime is the main sign of bad performance. On the front-end side, when looking at a dashboard, it might happen that some of the components take longer to load or, in the worst case scenario, if the query gets rejected/fails - the view does not load at all.

For this reason, it might be helpful for you to learn some basics about what happens in the background when a PQL query is executed. We will also cover some good practices which you should use when writing queries or creating dashboards.

## Understanding the connection between front-end and PQL queries

### From front-end components to queries

What do our users' dashboards look like? They can be very diverse. In Celonis we have created plenty of components which you can add to your dashboard to describe your process in a way that best fits your needs. This means you can choose between many charts and tables, process or KPI components. In addition, you could decide to define a specific [component filter or sheet filter](filter.html "FILTER").

What is important to understand is that whatever components you use to design a dashboard - all of them will translate into one or multiple PQL queries. Depending on the complexity, they can take more or less time to execute. Simple front-end components and the corresponding query:

```
FILTER KPI ("kpi_formula", VARIABLE('DE')) = 1
```

```
TABLE( "activities"."case_id" AS "case_id", "activities"."activity" AS "activity", "activities"."country_id" AS "country_id", KPI("kpi_formula", VARIABLE ('DE')) AS "kpi with var" ) ORDER BY KPI("kpi_formula", VARIABLE ('DE')) DESC LIMIT 400;
```

### Designing performant Views and Boards

What choices could you make in your dashboard design to improve the performance? More complex dashboards mean more queries that need to be executed which in turn often leads to longer runtimes. The solution is - try to keep your boards as clean and simple as possible.

**Note: If there is more data that you want to explore, but your dashboard is already over-crowded or loading too slowly - try to spend some time thinking about the information you want to see, try to group it into meaningful sections, and create separate dashboards from there.**

Additional tips that could help improve your dashboard's performance:

- Hide columns by default and only show them when needed. This lets you concentrate on the necessary information and also improves the performance of your dashboards. This is where you can find these options in Analysis and Views:

  **Analysis (under General Options)**

  **View (under Settings > Columns)**
- When you have large columns that you want to analyze - try not to visualize columns in their entirety in your dashboard. Instead, try using the "limit" option to show only a specific number of rows. Another option to use is "scrolling" (the alternative option in Analysis after "limit") or "pagination" (in Views) - this way you will be able to view your data by scrolling or clicking through pages. When you enable these options, your data gets loaded in smaller batches making your front-end experience smoother. This is where you can find these options in Analysis and Views:

  **Analysis (under Advanced Options)**

  **View limit (under Settings > Data settings)**

  **View pagination (under Settings > Style > Pagination)**
- Avoid using the distinct values option when not absolutely necessary. Remember that the rows are often already distinct, especially so when the number of columns is high. This is where you can find the "distinct values" option in Analysis and Views:

  **Analysis (under Advanced Options)**

  **View (under Settings > Data settings)**

## Understanding caching

### What is caching

To make queries execute faster we use caching. A cache is a temporary storage. Caching is the process of storing the result of a query (or parts of the query) in cache so that the same query can be answered in the future without being executed again. The result is then just recalled from the cache.

**Note: Loading results from cache may not always be instantaneous. In order to make the best usage of the limited cached capacity, cached columns that are not accessed for 5 minutes are compressed to preserve space. In addition, if they are not accessed for 30 minutes they get moved from the in-memory cache to disk. This means that you might experience a delay when accessing cached results that have not been used for a while, because they have to be decompressed or even read from disk before they can be used again.**

### Cache warmup

Cache warmup happens at the end of the data model load whenever new data is loaded. The aim of cache warmup is to offer the fastest possible query runtime. What this means is that we gather the statistics about the most computationally-intensive queries and we execute those queries right after the data model load. The results are then stored in cache and can be recalled anytime, which offers a smooth front-end experience.

**Note: The data model load will not be shown as complete until the cache warmup is finished as well. This can be very important if you have frequent data model loads. In that case it makes sense to think about the tradeoff between the time needed to finish the data model load and to run the queries afterwards. Longer query warmup will in most cases make the query execution more efficient, but it is not a "one-size-fits-all" and it might not make sense for every single data model.**

**We can enable or disable your query warmup upon request. Also upon request, we can adjust your query warmup duration and make it longer or shorter.**

### Breakdown of the query runtime

Query runtime is the time between sending the query and receiving the result.

Runtime consists of multiple steps, however the execution of the query usually takes the longest.

The time of execution can increase if the query is very long, if queries are written so that they cannot be cached or if some of the less performant operators are used.

Note that it can happen in extreme cases that other steps take a significant amount of time as well. Parsing and compilation can take more time, for example, when the query is extremely long.

**Note: Long queries are often generated when you overuse or excessively nest the KPIs. In PQL we have implemented optimizations to improve the execution of queries with KPIs. However, it is good practice to keep in check what your KPIs are supposed to calculate as deep nesting can often be simplified.**

Steps performed during the query runtime and the average percentage each step takes in the overall runtime:

| Step | AVG [%] |
| --- | --- |
| Routing | 4.1 |
| Parsing | 0.9 |
| Compilation | 5 |
| Execution | 90 |

### Writing cache efficient queries

When exactly do the results of your query get cached? When the computation of the result does not depend on the current filter state.

Some functions take filters into account and others do not.

[Standard aggregation](standard-aggregation.html "Standard Aggregation") (for example, [AVG](avg.html "AVG")) take filters and selections into account. Values that are filtered out are not a part of the result. That means that the results of standard aggregations are not cached.

On the other hand, [PU-functions](pull-up-aggregation.html "Pull Up Aggregation") (for example, [PU\_AVG](pu_avg.html "PU_AVG")) ignore filters. This means that if the filter changes, the result of a PU function will not be affected and also will not be recalculated - the result of a PU-function can be cached. Very important to note here is that caching PU-functions becomes impossible once you decide to use another operator inside the PU function which takes filters into account. This table shows some examples of queries which are cached and some which are not cached. The last example shows the previously mentioned example when the cacheability stops because of [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL") used inside the function.

Filter

- Query
- Cached?
- Reason

| Query | Cached? | Reason |
| --- | --- | --- |
| "Table"."Price" + "Table"."Tax" | cached | Filter independent operator, so it gets cached. |
| CASE WHEN "Table"."Type" = 'T1' THEN 1 ELSE NULL END | cached | If CASE WHEN statements are filter-independent, then the result of CASE WHEN will also be cached. |
| AVG("Table"."Price") | not cached | Standard aggregations take filters into account, so the result will not be cached here. |
| PU\_AVG("TargetTable", "Table"."Value") | cached | PU-functions do not take filters into account, so this will be cached. |
| PU\_AVG("TargetTable", FILTER\_TO\_NULL("Table"."Value")) | not cached | FILTER\_TO\_NULL makes PU functions filter-dependent, so this will not be cached. |

| Query | Cached? | Reason |
| --- | --- | --- |
| "Table"."Price" + "Table"."Tax" | cached | Filter independent operator, so it gets cached. |
| CASE WHEN "Table"."Type" = 'T1' THEN 1 ELSE NULL END | cached | If CASE WHEN statements are filter-independent, then the result of CASE WHEN will also be cached. |
| AVG("Table"."Price") | not cached | Standard aggregations take filters into account, so the result will not be cached here. |
| PU\_AVG("TargetTable", "Table"."Value") | cached | PU-functions do not take filters into account, so this will be cached. |
| PU\_AVG("TargetTable", FILTER\_TO\_NULL("Table"."Value")) | not cached | FILTER\_TO\_NULL makes PU functions filter-dependent, so this will not be cached. |

For complex expressions composed of filter-dependent and filter-independent operators, only sub expressions that do not contain a filter-dependent operator will be cached.

Consider the following expressions:

```
100 * AVG (CASE WHEN "ACTIVITIES"."USER_TYPE" = 'B' THEN 1.0 ELSE 0.0 END)
```

[CASE WHEN](case-when.html "CASE WHEN") is filter independent and will be cached. However, AVG cannot be cached and therefore the surrounding multiplication cannot be cached:

A rule of thumb here is to avoid computations on the result of a non-cached operator whenever possible. In this case, we can get the same result by performing the multiplication before the AVG:

#### Recalculating operations on filter changes

Some operators require recalculation whenever a filter changes. This can have a negative effect on performance. The following operators fall into this category:

- [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL")
- [Standard Aggregation](standard-aggregation.html "Standard Aggregation")
- [Moving Aggregation](moving-aggregation.html "Moving Aggregation")
- [MINUTE\_NOW](minute_now.html "MINUTE_NOW")
- [Filtered KMEANS](kmeans.html "KMEANS")
- [Filtered LINEAR REGRESSION](linear_regression.html "LINEAR_REGRESSION")
- [Filtered ABC](abc.html "ABC")

#### Filter propagation

Filter propagation is necessary if there are one or more tables on which a filter is applied, which are not the same as the result table. In that case we propagate the filters to the result table along the join graph.

Excessive filter propagation can have a negative impact on performance. This is the case for the [UNION\_ALL](union_all.html "UNION_ALL") operator with an increased number of input arguments. Here filters set on tables joined to any input argument are propagated to the UNION\_ALL table.

For this reason, even though the UNION\_ALL operator allows up to 16 input arguments, it is recommended to use as few inputs as possible.

## Using PU-functions effectively

As mentioned before, PU-functions are mostly cached. Additionally, they can be nested into other aggregations or other PU-functions. This gives better query performance. Take a look at the example below.

If we want to calculate a maximum of all activities per CaseType, we could choose one of these options:

| Option 1 | Option 2 |
| --- | --- |
| "Cases"."CaseType", MAX("Activites"."Value") | "Cases"."CaseType", MAX(PU\_MAX("Cases","Activites"."Value")) |

Option 2 allows you to lower the dimension you are calculating on by first pulling up the values to the table representing cases. The non-cached [MAX](max.html "MAX") operator is then only calculated on the "Cases" table, instead of on all of the values in the "Activities" table.

Since activity tables are usually much larger than case tables, this can greatly reduce the runtime of the query. The following graph shows the speedup factor depending on how large the "Activities" table is compared to the "Cases" table:

### Understanding the effect of [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL")

FILTER\_TO\_NULL is used to make operators that otherwise ignore filters, aware of them. FILTER\_TO\_NULL by itself is not slow, but as a result of using it, all subsequent computations cannot be cached and need to be recomputed every time a filter changes, which causes a drop in performance.

For this reason, you should not use FILTER\_TO\_NULL unless it is unavoidable. If you cannot avoid using FILTER\_TO\_NULL, then you should try to use it at the latest possible point in the query, as that might allow the caching of at least some of the operations which happen before FILTER\_TO\_NULL.

Consider the following two expressions that always have the same result:

|  |  |
| --- | --- |
| PU\_FIRST ( "Table1", UPPER ( FILTER\_TO\_NULL ( "Table2"."Column1" ))) | Whenever you decide to change the filter state, both the UPPER and PU\_FIRST operators have to be recomputed because they occur after the FILTER\_TO\_NULL. |
| PU\_FIRST ( "Table1", FILTER\_TO\_NULL ( UPPER ( "Table2"."Column1" ))) | By moving the UPPER operator inside the FILTER\_TO\_NULL, we can now cache the result of UPPER. If you change the filter, the PU\_FIRST operator has to be recomputed. |

When using PU-functions you have the option to add a FILTER parameter as one of the arguments of the operator call. Try to go for this option over using FILTER\_TO\_NULL directly on the input column. When adding the filter parameter to a PU-function, the result will be cached as long as the filter parameter is not modified.

| Bad for performance | A better alternative |
| --- | --- |
| FILTER "caseTable"."caseID" > 2; | PU\_MAX ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) |
| PU\_MAX ( "companyDetail" , FILTER\_TO\_NULL("caseTable"."value") ) |

**Note: You should always avoid using FILTER\_TO\_NULL in a FILTER statement. FILTERs might be propagated to multiple queries and if there is a FILTER\_TO\_NULL in the FILTER statement, all of those queries will have to be recalculated and the information will not be cached efficiently.**

## Preferring performant operations

Different PQL operators can often be used to compute the same result. However, the runtime of these operators can differ considerably. In the following sections, we use the term "expensive" to express that an operation/function has a longer runtime. Equivalently, we refer to more performant functions as "less expensive". Choosing the less expensive function can help you improve the performance of your queries.

### Choosing between [standard aggregations](standard-aggregation.html "Standard Aggregation")

While standard aggregations are sometimes used interchangeably, some are less expensive than others. We can roughly divide aggregations into two categories:

|  |  |
| --- | --- |
| Simple Aggregations | COUNT, MIN, MAX, SUM, AVG, PRODUCT. |
| Complex Aggregations | MEDIAN, QUANTILE, MODE, COUNT\_DISTINCT, TRIMMED\_MEAN. |

Complex aggregations require more steps to be computed and can be quite expensive in comparison. The following graph gives you an idea about how expensive different standard aggregations are:

#### [COUNT](count.html "COUNT") vs. [COUNT ( DISTINCT )](count-distinct.html "COUNT DISTINCT")

COUNT is significantly less expensive then COUNT ( DISTINCT ). **When you have a choice, you should always opt for COUNT.**

##### Example 1:

Table1

| Column1: int |
| --- |
| 1 |
| 2 |
| 3 |

Column1 is a key column in Table1.

|  |  |
| --- | --- |
| Query1 | ``` COUNT ( DISTINCT "Table1"."Column1" ) ``` |
| Query2 | ``` COUNT ( "Table1"."Column1" ) ``` |

| COUNT (DISTINCT "Table1"."Column1"): int | COUNT ("Table1"."Column1"): int |
| --- | --- |
| 3 | 3 |

When counting a key column, the values are guaranteed to be distinct. In such cases, using DISTINCT is unnecessary.

##### Example 2:

Table1

Filter

- Column1: int
- Column2: int
- Column3: int

| Column1: int | Column2: int | Column3: int |
| --- | --- | --- |
| 1 | 1 | 2 |
| 1 | 1 | 1 |
| 1 | 2 | 2 |
| 2 | 1 | 1 |

| Column1: int | Column2: int | Column3: int |
| --- | --- | --- |
| 1 | 1 | 2 |
| 1 | 1 | 1 |
| 1 | 2 | 2 |
| 2 | 1 | 1 |

Column1, Column2, and Column3 together form a key of Table1.

|  |  |
| --- | --- |
| Query1 | ``` "Table1"."Column1", "Table1"."Column2", COUNT ( DISTINCT "Table1"."Column3" ) ``` |
| Query2 | ``` "Table1"."Column1", "Table1"."Column2", COUNT ( "Table1"."Column3" ) ``` |

| COUNT (DISTINCT "Table1"."Column3"): int | COUNT ("Table1"."Column3"): int |
| --- | --- |
| 2 | 2 |
| 1 | 1 |
| 1 | 1 |

If the dimension columns in combination with the argument column form a key of the common table, it is guaranteed that COUNT and COUNT ( DISTINCT ... ) will deliver the same result.

With more dimension columns, this key condition is more likely to be satisfied.

##### Example 3:

|  |  |
| --- | --- |
| Query1 | ``` "Table1"."Column1", CASE WHEN COUNT ( DISTINCT "Table1"."Column2" ) > 0 THEN 'YES' ELSE 'NO' END ``` |
| Query2 | ``` "Table1"."Column1", CASE WHEN COUNT ( "Table1"."Column2" ) > 0 THEN THEN 'YES' ELSE 'NO' END ``` |

COUNT ( DISTINCT "Table1"."Column2" ) > 0 and COUNT ( "Table1"."Column2" ) > 0 are always equivalent. Since Query2 is faster than Query1, using DISTINCT in such cases is unnecessary.

#### [AVG](avg.html "AVG") vs. [MEDIAN](median.html "MEDIAN")

Calculating the MEDIAN needs the data to be sorted. As a result it is significantly more expensive than the AVG operator. **When you have a choice, you should always opt for AVG.**

##### Example:

Table1

| Column1: int |
| --- |
| 5 |
| 1 |
| 5 |
| 1 |
| 3 |

| MEDIAN ("Table1"."Column1"): int | AVG ("Table1"."Column1"): float |
| --- | --- |
| 3 | 3 |

In a uniform or normal distribution, average provides a very good estimation of the median. In such cases you can choose AVG over MEDIAN. However, when data is skewed the result can be way off.

#### [COUNT](count.html "COUNT") vs. [SUM](sum.html "SUM")

Sometimes the result given by COUNT could be obtained using SUM instead. However, COUNT is less expensive and should be preferred in these situations.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` SUM ( CASE WHEN "Table"."Column" = 'A' THEN 1 ELSE 0 END ) ``` |
| Query2 | ``` COUNT ( CASE WHEN "Table"."Column" = 'A' THEN 1 ELSE NULL END ) ``` |

Both Query1 and Query2 give the same result, but Query2 is much faster.

### Choosing between [PU-functions](pull-up-aggregation.html "Pull Up Aggregation")

Similar to standard aggregations, PU-functions with different cost can be used to compute the same result. Generally the same preferences that apply to standard aggregation, also apply to PU-functions.

#### [PU\_COUNT](pu_count.html "PU_COUNT") vs. [PU\_COUNT\_DISTINCT](pu_count_distinct.html "PU_COUNT_DISTINCT")

Counting only distinct values is significantly more expensive. When possible, you should choose PU\_COUNT over PU\_COUNT\_DISTINCT.

##### Example 1:

Table1

| Column1: int |
| --- |
| 1 |
| 2 |

Table2

| Column1: int | Column2: int |
| --- | --- |
| 1 | 1 |
| 1 | 2 |
| 1 | 3 |
| 2 | 4 |
| 2 | 5 |

Column2 is a key column in Table2.

| PU\_COUNT ("Table1", "Table2"."Column2"): int | PU\_COUNT\_DISTINCT ("Table1", "Table2"."Column2"): int |
| --- | --- |
| 3 | 3 |
| 2 | 2 |

When counting a key column, PU\_COUNT and PU\_COUNT\_DISTINCT always have the same result.

##### Example 2:

|  |  |
| --- | --- |
| Query1 | ``` FILTER PU_COUNT ( "Table1", "Table2"."Column1" ) > 0 ``` |
| Query2 | ``` FILTER PU_COUNT_DISTINCT ( "Table1", "Table2"."Column1" ) > 0 ``` |

When the purpose of counting is to check if there is at least one value, using DISTINCT is not needed and just makes the performance worse.

#### [PU\_AVG](pu_avg.html "PU_AVG") vs. [PU\_MEDIAN](pu_median.html "PU_MEDIAN")

PU\_MEDIAN is significantly more expensive than the PU\_AVG since it requires sorting. When possible, you should opt for PU\_AVG.

##### Example:

Table1

| Column1: int |
| --- |
| 1 |

Table2

| Column1: int | Column2: int |
| --- | --- |
| 1 | 5 |
| 1 | 1 |
| 1 | 5 |
| 1 | 1 |
| 1 | 3 |

| PU\_AVG ("Table1", "Table2"."Column2"): float | PU\_MEDIAN ("Table1", "Table2"."Column2"): int |
| --- | --- |
| 3 | 3 |

In a perfectly symmetrical distribution like the one in Table2.Column2, the average and the median will be equal.

#### [PU\_COUNT](pu_count.html "PU_COUNT") vs [PU\_SUM](pu_sum.html "PU_SUM")

PU\_COUNT is less expensive than PU\_SUM. When possible, you should opt for PU\_COUNT.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` PU_SUM ( "Table1"."Column1", CASE WHEN "Table2"."Column1" = 'A' THEN 1 ELSE 0 END ) ``` |
| Query2 | ``` PU_COUNT ( "Table1"."Column1", CASE WHEN "Table2"."Column1" = 'A' THEN 1 ELSE NULL END ) ``` |

Both Query1 and Query2 give the same result, but Query2 is much faster.

### Choosing less expensive expressions

In order to compute something, there is often more than one expression that can be used. These expressions could be a single operator or a combination thereof. Following is a list of preferences when there are multiple equivalent options to choose from, based on the performance of each option.

#### Prefer [REMAP\_VALUES](remap_values.html "REMAP_VALUES") over [CASE WHEN](case-when.html "CASE WHEN")

REMAP\_VALUES and CASE WHEN can be used to obtain the same results. However REMAP\_VALUES is less expensive than CASE WHEN.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` CASE WHEN "Table"."Currency" = 'EUR' THEN 'Euro' WHEN "Table"."Currency" = 'USD' THEN 'US Dollar' ELSE 'Other' END ``` |
| Query2 | ``` REMAP_VALUES ( "Table"."Currency", [ 'EUR' , 'Euro' ], [ 'USD', 'US Dollar' ], 'Other' ) ``` |

Both Query1 and Query2 give the same result, but Query2 is faster.

**Note: you should also prefer REMAP\_INTS to CASE WHEN.**

#### Prefer [=](comparison-operators-3327154.html "Comparison Operators") over [LIKE](like.html "LIKE")

The LIKE operator can be used to check for string equality. However, the = operator performs the job in a simpler and less expensive way.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` "Activities"."Activity" LIKE 'A' ``` |
| Query2 | ``` "Activities"."Activity" = 'A' ``` |

Both Query1 and Query2 give the same result, but Query2 is faster.

**Note: you should also prefer != over NOT LIKE when possible.**

#### Prefer [IN](in.html "IN") over [IN\_LIKE](in_like.html "IN_LIKE")

The IN\_LIKE operator can be used to check whether a string value is equal to at least one of multiple string matches. However, the IN operator performs the job in a simpler and less expensive way.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` "Activities"."Activity" IN_LIKE ( 'A', 'B' ) ``` |
| Query2 | ``` "Activities"."Activity" IN ( 'A', 'B' ) ``` |

Both Query1 and Query2 give the same result, but Query2 is faster.

**Note: you should also prefer NOT IN over NOT IN\_LIKE when possible.**

#### Prefer mapping to INTEGER over mapping to STRING

Sometimes the return type of an expression is not important for the result. For example, this is the case when the goal is to count the number of values in the result. In such situations prefer using INTEGER over STRING since it is a less expensive data type.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` COUNT ( DISTINCT CASE WHEN condition THEN string_column ELSE constant END ) ``` |
| Query2 | ``` COUNT ( DISTINCT CASE WHEN condition THEN int_column ELSE constant END ) ``` |

Both Query1 and Query2 give the same result, but Query2 is faster.

#### Prefer process operators over non-process equivalents

Sometimes process operators and non-process operators can be used to compute the same result. However, process operators are usually orders of magnitude faster.

| Non-process operators | Process operators |
| --- | --- |
| [PU\_STRING\_AGG](pu_string_agg.html "PU_STRING_AGG") | [VARIANT](variant.html "VARIANT") |
| [LEAD](lead.html "LEAD")/[LAG](lag.html "LAG") | [ACTIVITY\_LEAD](activity_lead.html "ACTIVITY_LEAD")/[ACTIVITY\_LAG](activity_lag.html "ACTIVITY_LAG"), [SOURCE/TARGET](link_path_source---link_path_target.html "LINK_PATH_SOURCE - LINK_PATH_TARGET") |
| [INDEX\_ORDER](index_order.html "INDEX_ORDER") | [INDEX\_ACTIVITY\_ORDER](index_activity_order.html "INDEX_ACTIVITY_ORDER") |

### Choosing shorter expressions

Many conditional operators can be replaced with the CASE WHEN operator to achieve the same result. However, the specific operators have a reduced syntax that can help you make your PQL queries clean and understandable.

As a rule of thumb, you should always prefer shorter queries over longer ones, as this likely translates to better performance.

#### Prefer [GREATEST](greatest.html "GREATEST")/[LEAST](least.html "LEAST") over [CASE WHEN](case-when.html "CASE WHEN")

The GREATEST and LEAST operators offer a more concise syntax compared to CASE WHEN. In addition, they are a lot more intuitive if you have to compare more than two columns.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` GREATEST ( "Table1"."Column1" , "Table1"."Column2" ) ``` |
| Query2 | ``` CASE WHEN "Table1"."Column1" >= "Table1"."Column2" THEN "Table1"."Column1" ELSE "Table1"."Column2" END ``` |

With just two columns, Query2 is already twice as long as Query1. Adding more columns will increase the difference in length exponentially.

#### Prefer [COALESCE](coalesce.html "COALESCE") over [CASE WHEN](case-when.html "CASE WHEN")

The COALESCE operator might be a good and more intuitive alternative to CASE WHEN statements for its reduced syntax.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` COALESCE ( "Table1"."Column1" , "Table1"."Column2" , 0 ) ``` |
| Query2 | ``` CASE WHEN "Table1"."Column1" IS NOT NULL THEN "Table1"."Column1" WHEN "Table1"."Column2" IS NOT NULL THEN "Table1"."Column2" ELSE 0 END ``` |

With only two columns, Query2 is more than twice as long as Query1.

#### Prefer PU-filter over [CASE WHEN](case-when.html "CASE WHEN")

When writing a PU function with a CASE WHEN as the input column where the ELSE section of the CASE WHEN returns a NULL, you can improve the performance by using the filter argument of a PU function instead.

The version with a filter argument is more performant, because it does not require creating a column for the CASE WHEN - requiring less memory and resulting in a faster execution.

##### Example:

|  |  |
| --- | --- |
| Query1 | ``` PU_SUM ( "Table1" , CASE WHEN "Table2"."Column1" IN ('a', 'b', 'c') THEN "Table2"."Column2" ELSE NULL END ) ``` |
| Query2 | ``` PU_SUM ( "Table1" , "Table2"."Column2", "Table2"."Column1" IN ('a', 'b', 'c') ) ``` |

### Summary

| Prefer | over |
| --- | --- |
| COUNT | COUNT ( DISTINCT ) |
| AVG | MEDIAN |
| COUNT | SUM |
| PU\_COUNT | PU\_COUNT\_DISTINCT |
| PU\_AVG | PU\_MEDIAN |
| PU\_COUNT | PU\_SUM |
| REMAP\_VALUES | CASE WHEN |
| = | LIKE |
| IN | IN\_LIKE |
| mapping to integer | mapping to string |
| process operators | non-process operators |
| GREATEST / LEAST | CASE WHEN |
| COALESCE | CASE WHEN |
| PU-filter | CASE WHEN |

## Being aware of expensive operations

Some complex PQL operators perform heavy computations and may require excessive CPU time. Being aware of such operators can help you distinguish the queries where a long runtime is unavoidable from the ones where investigating the query performance and optimizing it could be useful.

The following operators are generally considered expensive:

- [IN\_LIKE](in_like.html "IN_LIKE") / [LIKE](like.html "LIKE") / [PATINDEX](patindex.html "PATINDEX"): when matching against complex patterns
- [CURRENCY\_CONVERT](currency_convert.html "CURRENCY_CONVERT") / [CURRENCY\_CONVERT\_SAP](currency_convert_sap.html "CURRENCY_CONVERT_SAP")
- [Window operators](window.html "Window")
- Calendar operators: when using complex [calendars](datetime-calendars.html "DateTime Calendars")
- [UNIQUE\_ID](unique_id.html "UNIQUE_ID")
- [TIMELINE\_COLUMN / TIMELINE\_TABLE](timeline_column---timeline_table.html "TIMELINE_COLUMN - TIMELINE_TABLE")
- [ABC](abc.html "ABC")
- [KMEANS](kmeans.html "KMEANS")
- [LINEAR REGRESSION](linear_regression.html "LINEAR_REGRESSION")
- [CLUSTER\_STRINGS](cluster_strings.html "CLUSTER_STRINGS")
- [MATCH\_STRINGS](match_strings.html "MATCH_STRINGS")
- [CLUSTER\_VARIANTS](cluster_variants.html "CLUSTER_VARIANTS")
- [CONFORMANCE](conformance.html "CONFORMANCE")
- [ESTIMATE\_CLUSTER\_PARAMS](estimate_cluster_params.html "ESTIMATE_CLUSTER_PARAMS")
- [MATCH\_PROCESS\_REGEX](match_process_regex.html "MATCH_PROCESS_REGEX")
- [LINK\_PATH](link_path.html "LINK_PATH")

**Note: If the execution time of some of the stated operators exceeds 10 minutes, the execution stops and an error is reported.**

## Key takeaways

These practices can enhance the performance of your dashboards and Apps:

- Avoid overloading analyses sheets and views.
- Use PU-functions to aggregate data into smaller tables.
- Apply aggregations and FILTER\_TO\_NULL as "late" as possible.
- Use less expensive standard aggregations.
- Prefer less expensive operations.

## Additional resources

- For more details and examples you can refer to the [Performance Optimization in PQL academy course](https://academy.celonis.com/courses/performance-optimization-in-pql).
- For more information about the individual PQL operators you can refer to the [PQL documentation](pql---process-query-language.html "PQL - Process Query Language").


---

## pql/pql---process-query-language

# PQL - Process Query Language

## Description

The Process Query Language (PQL) is the analytical backbone of the Celonis platform, and empowers you to translate complex business questions into actionable process insights.

PQL is purpose-built to transform data into specific actions by helping you:

- Measure process health and define custom KPIs.
- Pinpoint bottlenecks across your process flow.
- Standardize analytical logic across all analyses and automations.

PQL's unique features are the composability of functions and the support for specialized Process Mining operators that allow you to quickly calculate metrics directly from your event log based business data. These functions enable cross-table calculations across your entire data model, a capability that is very tedious and error-prone with standard SQL. PQL also natively supports Object-Centric Process Mining (OCPM).

**Tip**

Object-Centric Process Mining (OCPM) involves analyzing processes that span multiple related business objects simultaneously (like an Order, an Invoice, and a Delivery). For a deeper dive into OCPM and how to leverage its advantages, see [OCPM Perspective](ocpm-perspective.html "OCPM Perspective").

## PQL vs SQL: What are the differences

While PQL offers a familiar syntax for users with SQL experience, it fundamentally differs from traditional SQL by prioritizing process context and data integrity over database manipulation. By abstracting away traditional database operations to focus strictly on process analytics, PQL evaluates queries against the Celonis data modeldefining case-level and activity-level relationships through expressions that are column-based and easily composable. These design choices optimize analysis performance and stability while ensuring that queries remain grounded in the specific structural logic of the business process.

While PQL shares syntax with SQL, it differs along key strategic dimensions to optimize for data analytics with a focus on Process Mining:

- **Domain-Specific:** PQL offers specialized Process Mining operators that are not available in SQL. This enables you to focus on behavioral patterns and performance metrics.
- **No Data Manipulation Language (DML):** PQL is a read-only querying language. All data updates must originate from source systems, ensuring data integrity.
- **No Data Definition Language (DDL):** The data model is created via a visual editor. This simplifies authoring, allowing you to focus on analysis rather than schema design.
- **Language Scope:** PQL does not support all operators available in SQL; development is driven strictly by customer requirements for target use cases. This focuses the language on efficient process analysis.

## Getting started with PQL

This section contains resources to help get you started with PQL.

### PQL in practice

PQL statements are essentially formulas that define a single value, metric, or filter for an analysis. Unlike SQL, which requires you to define data sources with `SELECT...FROM..WHERE...JOIN...ON...`, PQL statements omit these clauses because the data model (tables and joins) is already set up within the Celonis platform. Your focus shifts entirely to the calculation logic that answers a business question.

The statements fall into the following main categories **Basic data retrieval and nested aggregation** and **Specialized process operators**. The following sections describe both.

**Tip**

By leveraging both basic functions and specialized operators, you can transform complex business questions into quantifiable analytical metrics. The PQL documentation contains extensive examples and use cases showing how combining various operators, complex process related questions can be answered. For more information, see [Examples and Use Cases](examples-and-use-cases.html "Examples and Use Cases").

#### Basic data retrieval and nested aggregation

PQL begins with simple aggregation, similar to SQL. The true power lies in Pull-Up (PU) functions, which allow arbitrarily nested aggregation across different data levels. This simplifies complex, multi-level analysis well beyond standard SQL capabilities. For example:

Filter

- Category
- PQL Example Statement
- Result and Purpose

| **Category** | **PQL Example Statement** | **Result and Purpose** |
| --- | --- | --- |
| Simple Aggregation | ``` SUM("Book"."PageCount") ``` | The total number of pages for all Books in the dataset. |
| Filtering | ``` FILTER "Book"."Title" = 'Invoice Process Guidelines' ``` | Only includes data related to the book `Invoice Process Guidelines` in the calculation. |
| Pull-Up Aggregation | ``` SUM( PU_COUNT ( "Book", "Chapter"."Title" ) ) ``` | Calculates the total number of Chapters of all Books in the dataset, linking two distinct tables. |

| **Category** | **PQL Example Statement** | **Result and Purpose** |
| --- | --- | --- |
| Simple Aggregation | ``` SUM("Book"."PageCount") ``` | The total number of pages for all Books in the dataset. |
| Filtering | ``` FILTER "Book"."Title" = 'Invoice Process Guidelines' ``` | Only includes data related to the book `Invoice Process Guidelines` in the calculation. |
| Pull-Up Aggregation | ``` SUM( PU_COUNT ( "Book", "Chapter"."Title" ) ) ``` | Calculates the total number of Chapters of all Books in the dataset, linking two distinct tables. |

#### Specialized process operators

These unique PQL functions are purpose-built for the chronological nature of event log data, enabling complex process-centric metrics that simplify process mining logic.

Filter

- Category
- PQL Example Statement
- Result and Purpose

| **Category** | **PQL Example Statement** | **Result and Purpose** |
| --- | --- | --- |
| Process Metric | ``` CALC_REWORK ( "e_celonis_Event"."Activity" ) ``` | Counts the number of times an activity was repeated within a case (rework), a core process metric. |
| OCPM | ``` CALC_THROUGHPUT ( "o_celonis_Object", FIRST_OCCURRENCE [ 'e_celonis_ModifyObject' ] TO LAST_OCCURRENCE [ 'e_celonis_ModifyObject' ] , DAYS ) ``` | Calculate the days between the first and last occurrence of a specific event type (`e_celonis_ModifyObject`), enabling Object-Centric Process Mining. |

| **Category** | **PQL Example Statement** | **Result and Purpose** |
| --- | --- | --- |
| Process Metric | ``` CALC_REWORK ( "e_celonis_Event"."Activity" ) ``` | Counts the number of times an activity was repeated within a case (rework), a core process metric. |
| OCPM | ``` CALC_THROUGHPUT ( "o_celonis_Object", FIRST_OCCURRENCE [ 'e_celonis_ModifyObject' ] TO LAST_OCCURRENCE [ 'e_celonis_ModifyObject' ] , DAYS ) ``` | Calculate the days between the first and last occurrence of a specific event type (`e_celonis_ModifyObject`), enabling Object-Centric Process Mining. |

### PQL optimization

When working with PQL, it is important to understand how the complexity of your PQL queries can affect results and performance. For more information on optimizing your PQL queries, see [PQL performance optimization guide](pql-performance-optimization-guide.html "PQL performance optimization guide").

### Celonis Academy PQL training

To deepen your understanding of PQL, we suggest exploring PQL training offered by the Celonis Academy. It offers guided learning paths, hands-on exercises, and advanced training dedicated to PQL and process analytics, from beginner to expert level.

If you are just starting out with PQL, we suggest the following courses:

- [Introduction to PQL and the Celonis PQL Engine](https://academy.celonis.com/courses/pql-and-the-celonis-pql-engine-an-introduction)
- [Create your first PQL Queries](https://academy.celonis.com/courses/create-your-first-pql-queries)
- [Write PQL in Views](https://academy.celonis.com/courses/draft-write-pql-in-views)

For intermediate users, there are [multiple courses available](https://academy.celonis.com/catalog?searchString=PQL&activeType=1_13_academy_celonis&from=0&sortby=_score&orderBy=desc&pageNo=1&aggregations=%5B%7B%22type%22%3A%22_index%22%2C%22filter%22%3A%5B%221_13_academy_celonis%22%5D%7D%2C%7B%22type%22%3A%221_13_academy_celonis___content_items___customField__product%22%2C%22filter%22%3A%5B%22PQL%22%5D%7D%2C%7B%22type%22%3A%221_13_academy_celonis___content_items___customField__level%22%2C%22filter%22%3A%5B%22Intermediate%22%5D%7D%5D&uid=db0bb26e-354b-11f0-87be-0242ac120002&resultsPerPage=12&exactPhrase=&withOneOrMore=&withoutTheWords=&pageSize=12&language=en&suCaseCreate=false) that build on core concepts.

For experienced users, there are [expert courses](https://academy.celonis.com/catalog?searchString=PQL&activeType=1_13_academy_celonis&from=0&sortby=_score&orderBy=desc&pageNo=1&aggregations=%5B%7B%22type%22%3A%22_index%22%2C%22filter%22%3A%5B%221_13_academy_celonis%22%5D%7D%2C%7B%22type%22%3A%221_13_academy_celonis___content_items___customField__product%22%2C%22filter%22%3A%5B%22PQL%22%5D%7D%2C%7B%22type%22%3A%221_13_academy_celonis___content_items___customField__level%22%2C%22filter%22%3A%5B%22Advanced%22%5D%7D%5D&uid=db0bb26e-354b-11f0-87be-0242ac120002&resultsPerPage=12&exactPhrase=&withOneOrMore=&withoutTheWords=&pageSize=12&language=en&suCaseCreate=false) focused on advanced PQL techniques and solving real world use cases.


---

## pql/static-pql-functions

# Static PQL Functions

## Description

Static PQL functions provide a lightweight way to check general properties of a data model or expression before actually executing a PQL query. For example, you can check the data type of a data model column and based on the type modify the actual PQL query to be executed.

The following static PQL functions are available:

- [ARGUMENT\_COUNT](argument_count.html "ARGUMENT_COUNT") counts the number of arguments passed to it.
- [COLUMN\_TYPE](column_type.html "COLUMN_TYPE") returns the data type of a data model column.
- [IF](if.html "IF") evaluates a list of static conditions and replaces itself with the query for the first static condition that is true.
- [STATIC CASE WHEN](static-case-when.html "STATIC CASE WHEN") evaluates a list of static conditions and replaces itself with the expression for the first static condition that is true.

## Example - Preventing empty IN statements

Suppose you want to sum the total order amount for several countries (per country). The countries are selected from a drop-down menu and passed to the query as an array variable. If no country is selected, we want the total order amount for all countries. We can use the static PQL functions [IF](if.html "IF") and [ARGUMENT\_COUNT](argument_count.html "ARGUMENT_COUNT") to achieve this:

|  |
| --- |
| **[1]**  Suppose the user selected the country 'DE'. |
| | Query | | --- | | **KPI "selected\_country"**  ``` {p1} ```  **If**  ``` IF ARGUMENT_COUNT ( 'DE' ) > 0 THEN FILTER "Orders"."Country" IN ( KPI ( "selected_country" , 'DE' ) ) ; END; ```  **Column1**  ``` "Orders"."Country" ```  **Column2**  ``` SUM ( "Orders"."Amount" ) ``` | |
| | Input | Output | | --- | --- | | **Orders**  | Country : string | Amount : int | | --- | --- | | 'DE' | 10 | | 'US' | 15 | | 'US' | 5 | | 'DE' | 10 | | 'DE' | 5 | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | 'DE' | 25 | | |

|  |
| --- |
| **[2]**  Suppose the user did not select any country. |
| | Query | | --- | | **KPI "selected\_country"**  ``` {p1} ```  **If**  ``` IF ARGUMENT_COUNT ( ) > 0 THEN FILTER "Orders"."Country" IN ( ) ; END; ```  **Column1**  ``` "Orders"."Country" ```  **Column2**  ``` SUM ( "Orders"."Amount" ) ``` | |
| | Input | Output | | --- | --- | | **Orders**  | Country : string | Amount : int | | --- | --- | | 'DE' | 10 | | 'US' | 15 | | 'US' | 5 | | 'DE' | 10 | | 'DE' | 5 | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | 'DE' | 25 | | 'US' | 20 | | |

This is how the query would actually look like with an Analysis frontend variable:

```
IF ARGUMENT_COUNT ( <%=COUNTRIES%> ) > 0 THEN FILTER "Orders"."Country" IN ( <%=COUNTRIES%> ) ; END ;
```

## Example - Converting an unknown type

|  |
| --- |
| **[3]**  [TO\_STRING](to_string.html "TO_STRING") does not support [FLOAT](float.html "FLOAT") and [STRING](string.html "STRING") columns as inputs, and it requires an additional format argument for [DATE](date.html "DATE") inputs. With [STATIC CASE WHEN](static-case-when.html "STATIC CASE WHEN") and [COLUMN\_TYPE](column_type.html "COLUMN_TYPE"), we can write a string conversion query that is independent of the data type of a column. |
| | Query | | --- | | **Column1**  ``` STATIC CASE WHEN COLUMN_TYPE ( "Table"."Column" ) = 'INT' THEN TO_STRING ( "Table"."Column" ) WHEN COLUMN_TYPE ( "Table"."Column" ) = 'DATE' THEN TO_STRING ( "Table"."Column" , FORMAT ( '%Y-%m-%d' ) ) WHEN COLUMN_TYPE ( "Table"."Column" ) = 'FLOAT' THEN CONCAT ( '' , "Table"."Column" ) ELSE "Table"."Column" END ``` | |
| | Input | Output | | --- | --- | | **Table**  | Column : int | | --- | | 1 | | 2 | | 3 | | **Result**  | Column1 : string | | --- | | '1' | | '2' | | '3' | | |


---

## pql/using-the-pql-editor

# Using the PQL editor

The PQL editor enables you to translate process-related business questions into queries, which are then executed by a custom-built query engine. This editor can now be accessed directly from your View layout builder, helping you create detailed Views with your data.

|  |
| --- |
|  |

For more information about PQL, see: [PQL - Process Query Language](https://docs.celonis.com/en/pql---process-query-language.html)

Click for sound

1:21

Expand all

[## Accessing the PQL editor from a View component](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4556731590440034001320681753_body)

You can access the PQL editor using View components where data fields can be selected by either clicking the **PQL editor** button directly or when adding data to a setting (such as a table column):

|  |
| --- |
|  |

## PQL editor enhanced options

When using the PQL editor, you have the following enhanced options:

[### PQL reference library](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm456630811035043400153659284_body)

To assist you when writing PQL expressions, an interactive PQL reference library is available within the editor.

Click **PQL Ref** to browse the references and then click the syntax to add it to the current line in the editor.

|  |
| --- |
|  |

You can also access inline PQL suggestions using CTRL + SPACE within the editor:

|  |
| --- |
|  |

[### Data and variables](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4583642376366434001387455736_body)

The data and variables displayed in the PQL editor are imported from Knowledge Models and package variables within the same package. They can be added to the PQL editor by clicking on them (adding them without any transformations) or you can click the **+**  icon to apply aggregate functions to the data added.

The aggregate functions include: count, count distinct, min., max., and median.

|  |
| --- |
|  |

[### Edit metrics and save new metrics to Knowledge Model](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4607968563987234001503970061_body)

When using the editor to create or edit PQL expressions, you are prompted to save the result as a metric to your knowledge model. This allows the metric to then be used and referenced in other assets using that knowledge model.

To save a metric to your Knowledge Model from within the editor, click **Save to**:

|  |
| --- |
|  |

You're then in **Knowledge Edit Mode**, giving you the ability to edit the metadata associated with the new metric and, if necessary, the option to further edit the PQL expression.

Note that the new metric must have an ID before it can be saved and added to the Knowledge Model.

|  |
| --- |
|  |

[### Aggregation selector for common table](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-id235129600301444_body)

The common table is the table against which your query is executed. It can be either a physical table from the Data Model or a virtual table (i.e., not materialized in the Data Model). Choosing the right common table is crucial for obtaining semantically correct results.

For example, when counting sales orders, the results will vary depending on the chosen common table. If you use the sales order items table as the common table, each order will appear once for every item it contains. This can lead to over counting sales orders, since a single order with multiple items would be counted multiple times.

In Celonis PQL, when you define or use a common table, you often need to decide how the data from that table should be aggregated before it can be used in components. To help with this, an aggregation selector is available in the PQL editor whenever a common table can be referenced.

When a common table can be referenced, the aggregation selector works as follows:

- If the common table has a direct 1:N relationship to the source column, then the functions menu offers to apply PU functions.
- If the common table has a indirect 1:N relationship to the source column, then the functions menu offers PU functions for every relevant connection.

In this example, the common table is 'Books' and the aggregation selector can be used to perform a pull up aggregation of the data:

[### Run PQL queries and error handling](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4566308191723234001535121625_body)

You can now execute PQL queries and see the live results within the table whenever changes are made.

Click **Run PQL** when prompted or use the keyboard shortcut CTRL + ENTER.

|  |
| --- |
|  |

After executing the query, either the table will update with the results or you will be shown a PQL error message with further information.

In this example, there is a syntax error in line 1.

|  |
| --- |
|  |

[### Quick filters and sorting](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4587466482627234146302422002_body)

Click the filters icon to quickly filter your content based on data types and sources. You can also use this feature to manage how your data is sorted.

|  |
| --- |
|  |

[### Custom formatting cheat sheet](#UUID-0a810432-93c4-d090-4e7b-9194784fe28e_section-idm4575310010060834146302509163_body)

When using custom formatting, a cheat sheet displays the options you have available for that data type: (also copied below):

|  |
| --- |
|  |

#### Number formats

Number formatting uses the [d3 Number format](https://github.com/d3/d3-3.x-api-reference/blob/master/Formatting.md). You can use the following rules in your formula:

The format specifier is modeled after Python 3.1's built-in format specification mini-language. The general form of a specifier is:

```
[fill][align][sign][symbol][width][,][.precision][type]
```

**The available type values are:**

- Exponent ("e") - Uses Number.toExponential.
- General ("g") - Uses Number.toPrecision.
- Fixed ("f") - Uses Number.toFixed.
- integer ("d") - Uses Number.toString.
- rounded ("r") - round to [.precision] significant digits, padding with zeroes where necessary in similar fashion to fixed ("f"). If no precision is specified, falls back to general notation.
- Percentage ("%") - like fixed, but multiply by 100 and suffix with "%".
- rounded percentage ("p") - like percentage, but rounded "%".
- binary ("b") - Displays the number in base 2.
- octal ("o") - Displays the number in base 8.
- hexadecimal ("x") - Displays the number in base 16, using lower-case letters for the digits above 9.
- hexadecimal ("X") - Displays the number in base 16, using upper-case letters for the digits above 9.
- character ("c") - Converts the integer to the corresponding unicode character before printing.
- SI prefix ("s") - like rounded, but with a unit suffixed such as "9.5M" for mega, or "1.00µ" for micro.

The type "n" is also supported as shorthand for ",g".

**The [fill] can be**:

Any character other than "{" or "}". The presence of a [fill] character is signaled by the character following it, which must be one of the align options.

**The alignment can be:**

- ("<") Aligned left.
- (">") Aligned right (default)
- ("^") Central alignment

**The prefix can be:**

- plus ("+") - a sign should be used for both positive and negative numbers.
- minus ("-") - a sign should be used for both positive and negative numbers.
- space (" ") - a leading space should be used on positive numbers and a minus sign on negative numbers.

**The symbol can be:**

- currency ("$")
- base ("#") - for binary, octal, or hexadecimal output, prefix by "0b", "0o", or "0x", respectively.
- The "0" option enables zero-padding.

The width defines the minimum field width. If not specified, then the width will be determined by the content.

The comma (",") option enables the use of a comma for a thousands separator.

The precision indicates how many digits should be displayed after the decimal point for a value formatted with types "f" and "%", or before and after the decimal point for a value formatted with types "g", "r" and "p".

#### Date formats

Date formatting uses the [D3 Time Format](https://github.com/d3/d3-3.x-api-reference/blob/master/Time-Formatting.md). You can use the following rules in your formula:

- %a - abbreviated weekday name.
- %A - full weekday name.
- %b - abbreviated month name.
- %B - full month name.
- %c - date and time, as "%a %b %e %H:%M:%S %Y".
- %d - zero-padded day of the month as a decimal number [01,31].
- %e - space-padded day of the month as a decimal number [ 1,31]; equivalent to %\_d.
- %H - hour (24-hour clock) as a decimal number [00,23].
- %I - hour (12-hour clock) as a decimal number [01,12].
- %j - day of the year as a decimal number [001,366].
- %m - month as a decimal number [01,12].
- %M - minute as a decimal number [00,59].
- %L - milliseconds as a decimal number [000, 999].
- %p - either AM or PM.
- %S - second as a decimal number [00,61].
- %U - week number of the year (Sunday as the first day of the week) as a decimal number [00,53].
- %V - week of the year as a zero-padded decimal number, ranging from 01 to 53.
- %w - weekday as a decimal number [0(Sunday),6].
- %W - week number of the year (Monday as the first day of the week) as a decimal number [00,53].
- %x - date, as "%m/%d/%Y".
- %X - Time as "%H:%M:%S".
- %y - year without century as a decimal number [00,99].
- %Y - year with century as a decimal number.
- %Z - time zone offset, such as "-0700".
- %% - a literal "%" character.

## Related topics

- [PQL - Process Query Language](https://docs.celonis.com/en/pql---process-query-language.html)
- [Examples and Use Cases](https://docs.celonis.com/en/examples-and-use-cases.html)
- [FAQ - Process Query Language](https://docs.celonis.com/en/faq---process-query-language.html)


---

## pql/data-flow/data-flow

# Data Flow

## Description

This section contains data flow operators.

The following functions are available:

- [BIND](bind.html "BIND") pulls a column to a specified table.
- [BIND\_FILTERS](bind_filters.html "BIND_FILTERS") pulls a filter to a specified table.
- [CASE WHEN](case-when.html "CASE WHEN") evaluates a list of conditions and returns result expressions based on these conditions.
- [COALESCE](coalesce.html "COALESCE") returns the first input value which is not NULL of a set of values.
- [FILTER](filter.html "FILTER") can be defined as Analysis filters, Sheet filters or Component filters and are applied to the input tables before the actual query.
- [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL") propagates the [FILTER](filter.html "FILTER") to the specified column by setting all violating rows to [NULL.](null.html "NULL")
- [GREATEST](greatest.html "GREATEST") returns the greatest element that is not NULL from a set of values.
- [LEAST](least.html "LEAST") returns the least element that is not NULL from a set of values.
- [LOOKUP](lookup.html "LOOKUP") returns values retrieved from a different table for which no join path exists in the data model.
- [MULTI CASE WHEN](multi-case-when.html "MULTI CASE WHEN") returns a new column containing all `THEN` values for which the respective `WHEN` conditions evaluated to true.
- [REMAP\_VALUES](remap_values.html "REMAP_VALUES") and [REMAP\_INTS](remap_ints.html "REMAP_INTS") can be used to map values of a column to other values.
- [UNIQUE\_ID](unique_id.html "UNIQUE_ID") returns a unique non-negative [INT](int.html "INT") for each unique tuple in the combination of the input columns.


---

## pql/data-types/data-type-conversion

# Data Type Conversion

## Description

[Data type](data-types-3326971.html "Data Types") conversion can be explicit by using custom functions, or implicit depending on context.

## Explicit conversion

Currently, the following explicit data type conversion functions are available:

- [TO\_DATE](to_date.html "TO_DATE") converts [STRING](string.html "STRING") input to [DATE](date.html "DATE") output.
- [TO\_FLOAT](to_float.html "TO_FLOAT") converts [STRING](string.html "STRING") input to [FLOAT](float.html "FLOAT") output.
- [TO\_INT](to_int.html "TO_INT") converts [STRING](string.html "STRING") input to [INT](int.html "INT") output.
- [TO\_STRING](to_string.html "TO_STRING") converts [INT](int.html "INT") or [DATE](date.html "DATE") input to [STRING](string.html "STRING") output.

## Implicit conversion

In some functions and operators, there will be an implicit data type conversion which is done internally, without any loss of information in the output. Examples include:

- The [CONCAT](concat.html "CONCAT") function (operator syntax: `||`) will implicitly convert [INT](int.html "INT") and [FLOAT](float.html "FLOAT") input to [STRING](string.html "STRING") output.
- The [mathematical functions](math.html "Math") [ADD](add.html "ADD"), [SUB](sub.html "SUB"), [MULT](mult.html "MULT"), and [DIV](div.html "DIV") (operator syntax: `+`, `-`, `*` and `/`) will implicitly convert an [INT](int.html "INT") operand to [FLOAT](float.html "FLOAT") output, if the other operand is a [FLOAT](float.html "FLOAT").

## Other functions with type changes

There are a number of other functions which take one data type as input, and return another. These are not conversion functions, since the semantics of the functions inherently imply a loss of information. Examples include:

- [FLOOR](floor.html "FLOOR") and [ROUND](round.html "ROUND"): [FLOAT](float.html "FLOAT") input and returns [INT](int.html "INT") output.
- [DATE projection](datetime-projection.html "DateTime Projection") functions, such as [CALENDAR\_WEEK](calendar_week.html "CALENDAR_WEEK"), [HOURS](hours.html "HOURS") and [YEAR](year.html "YEAR") will extract part of the [DATE](date.html "DATE") input and return that information as an [INT](int.html "INT").

Specifically for [DATE](date.html "DATE") handling, functions are available which use a non-DATE type as input or output:

- [ADD\_SECONDS](add_seconds.html "ADD_SECONDS") converts [INT](int.html "INT") input to [DATE](date.html "DATE") output. Similar conversions are available in the other [DateTime Modification](datetime-modification.html "DateTime Modification") functions.
- [SECONDS\_BETWEEN](seconds_between.html "SECONDS_BETWEEN") converts [DATE](date.html "DATE") input to [FLOAT](float.html "FLOAT") output. Similar conversions are available in the other [DateTime Difference](datetime-difference.html "DateTime Difference") functions.


---

## pql/data-types/data-types

# Data Types

## Input and Output Types

CeloSQL supports the following input / output data types. All types are nullable.

| Data Type | Description |
| --- | --- |
| [BIGINT](bigint-type.html "BIGINT Type") | Represents 8-byte signed integer numbers |
| [BOOLEAN](boolean-type.html "BOOLEAN Type") | Represents boolean values: TRUE, FALSE, NULL |
| [DATE](date-type.html "DATE Type") | Represents year, month, day, without time zone, e.g. 2025-01-01 |
| [DECIMAL(p, s)](decimal-type.html "DECIMAL Type") | Represents numbers with maximum precision `p` and fixed scale `s` |
| [DOUBLE](double-type.html "DOUBLE Type") | Represents 8-byte double-precision floating point numbers |
| [TIMESTAMP](timestamp-types.html "TIMESTAMP Types") | Represents year, month, day, hour, minute, second, up to 6-digit fractional second, without time zone, e.g. `2025-01-01 12:00:00.123456` |
| [TIMESTAMP WITH TIME ZONE](timestamp-types.html "TIMESTAMP Types") | Represents year, month, day, hour, minute, second, up to 6-digit fractional second, and time zone, e.g. `2025-01-01 12:00:00.123456 UTC` |
| [VARBINARY](varbinary-type.html "VARBINARY Type") | Represents a variable length byte sequence values |
| [VARCHAR](varchar-type.html "VARCHAR Type") | Represents variable length character strings |
| [INTERVAL [X TO Y]](interval-types.html "INTERVAL types") | Represents a time interval measured in units X to Y. |
| [TIME](time-type.html "TIME type") | Represents a time of day without timezone |
| BINARY\* | Represents byte sequence values |
| CHAR\* | Represents fixed length character strings |
| TIME WITH TIME ZONE+ | Represents A time of day with a timezone |

+: these types are marked as deprecated and support will be removed.

\*: These types are marked as deprecated for input / output types, but still supported as In-SQL types.

## In-SQL Types

CeloSQL supports the following types within SQL statements, but not as input or output types.

| Data Type | Description |
| --- | --- |
| INTEGER | Represents a 4-byte signed integer numbers |


---

## pql/data-types/data-types-3326971

# Data Types

## Description

As input to functions, Celonis supports columns from tables in the Data Model and constants. Every column or constant has a certain data type. The data types of table columns are defined during the Data Model setup.

The supported data types in Celonis are [STRING](string.html "STRING"), [INT](int.html "INT"), [FLOAT](float.html "FLOAT") and [DATE](date.html "DATE") for columns and constants. If a value is unknown or does not exist, it is represented by [NULL](null.html "NULL").

[Data Type Conversion](data-type-conversion.html "Data Type Conversion") describes different methods for explicit and implicit conversion between these data types.


---

## pql/datetime/datetime

# DateTime

## Description

This section includes a variety of datetime functions.

- [Datetime Calendars](datetime-calendars.html "DateTime Calendars") allow to use a restricted date calculation based on the specified calendar configuration.
- [DateTime Constant Functions](datetime-constant.html "DateTime Constant") allow to use the current date or time in a query.
- [DateTime Difference Functions](datetime-difference.html "DateTime Difference") can be used to calculate the time difference between two [DATE](date.html "DATE")s.
- [DateTime Modification Functions](datetime-modification.html "DateTime Modification") can be used to modify [DATE](date.html "DATE")s.
- [DateTime Projection Functions](datetime-projection.html "DateTime Projection") contains functions to extract the different parts from a [DATE](date.html "DATE") and to map [DATE](date.html "DATE")s to other data types and vice versa.
- [DateTime Rounding Functions](datetime-rounding.html "DateTime Rounding") can be used to round [DATE](date.html "DATE") values.
- [TIMELINE\_COLUMN and TIMELINE\_TABLE](timeline_column---timeline_table.html "TIMELINE_COLUMN - TIMELINE_TABLE") can be used to create a continuous timeline for a given time unit (e.g., days). They can be used to aggregate values from one or multiple tables onto one common time axis.

## Time zone identifiers

The IANA Time Zone Database supports many different time zone names. Using Germany as an example, the time zone `CET` is the standard time zone and `CEST` is the daylight saving time zone. By using the uniform naming convention in the database, any daylight saving time will *automatically* be respected by the operator if the given country or area is currently in daylight saving time.

The uniform naming convention is structured as `<area>/<location>` which will represent a country or major area, for Germany that would be `Europe/Berlin`.

Valid time zone abbreviations are:

- `CET`
- `CST6CDT`
- `EET`
- `EST5EDT`
- `GB`
- `GMT`
- `GMT0`
- `NZ`
- `NZ-CHAT`
- `MET`
- `MST7MDT`
- `PRC`
- `PST8PDT`
- `ROK`
- `UCT`
- `UTC`
- `W-SU`
- `WET`

An error will be returned if the given time zone identifier is invalid or ambiguous.

## See also:

- [DATE](date.html "DATE")


---

## pql/datetime/datetime-calendars

# DateTime Calendars

## Description

DateTime Calendars can be used to define the calendar which is used for [DATE](date.html "DATE") calculations.

- [FACTORY\_CALENDAR](factory_calendar.html "FACTORY_CALENDAR") is used to create a factory calendar. A factory calendar specifies on which exact time intervals (e.g., [2020-01-30 09:21:30.500..2020-01-30 15:00:00.000]) work is done.
- [INTERSECT](intersect.html "INTERSECT") is used to intersect two arbitrary calendars. The type of the intersected calendar depends on its input calendars.
- [WEEKDAY\_CALENDAR](weekday_calendar.html "WEEKDAY_CALENDAR") is used to create a weekday calendar. A weekday calendar specifies on which weekdays (e.g., 'Monday') work is done. Additionally, the weekday calendar can be used to specify shifts (e.g., '06:30-17:00') for each weekday.
- [WORKDAY\_CALENDAR](workday_calendar.html "WORKDAY_CALENDAR") is used to create a workday calendar. A workday calendar is based on the SAP TFACS table (sometimes called SAP Factory calendar) and specifies on which full days work is done (e.g., natively assumes 24 hours of working time). It gets its data on working days (and non-working days such as weekends and public holidays) from a given TFACS table.

## See also:

- [REMAP\_TIMESTAMPS](remap_timestamps.html "REMAP_TIMESTAMPS")


---

## pql/datetime/datetime-constant

# DateTime Constant

## Description

DateTime Constant Functions allow to use the current date or time in a query.

Currently, two functions are available:

- [TODAY](today.html "TODAY") returns the current date.
- [HOUR\_NOW](hour_now.html "HOUR_NOW") returns the hour of the current date.
- [MINUTE\_NOW](minute_now.html "MINUTE_NOW") returns the minute of the current date.


---

## pql/datetime/datetime-difference

# DateTime Difference

## Description

DateTime Difference Functions can be used to calculate the time difference between two [DATE](date.html "DATE")s.

- [MILLIS\_BETWEEN](millis_between.html "MILLIS_BETWEEN"), [SECONDS\_BETWEEN](seconds_between.html "SECONDS_BETWEEN"), [MINUTES\_BETWEEN](minutes_between.html "MINUTES_BETWEEN"), [HOURS\_BETWEEN](hours_between.html "HOURS_BETWEEN"), [DAYS\_BETWEEN](days_between.html "DAYS_BETWEEN"), [MONTHS\_BETWEEN](months_between.html "MONTHS_BETWEEN") and [YEARS\_BETWEEN](years_between.html "YEARS_BETWEEN") calculate the difference between two [DATE](date.html "DATE")s in the corresponding time unit.
- [DATEDIFF](datediff.html "DATEDIFF") also calculates the difference between two [DATE](date.html "DATE")s; the time unit can be specified as an argument.
- [WORKDAYS\_BETWEEN](workdays_between.html "WORKDAYS_BETWEEN") calculates the number of workdays between two [DATE](date.html "DATE")s using a specified TFACS style calendar table.
- [DATE\_BETWEEN](date_between.html "DATE_BETWEEN") checks whether a [DATE](date.html "DATE") is between two other [DATE](date.html "DATE")s.


---

## pql/datetime/datetime-modification

# DateTime Modification

## Description

DateTime Constant Functions can be used to modify [DATE](date.html "DATE")s.

- [ADD\_MILLIS](add_millis.html "ADD_MILLIS"), [ADD\_SECONDS](add_seconds.html "ADD_SECONDS"), [ADD\_MINUTES](add_minutes.html "ADD_MINUTES"), [ADD\_HOURS](add_hours.html "ADD_HOURS"), [ADD\_DAYS](add_days.html "ADD_DAYS"), [ADD\_MONTHS](add_months.html "ADD_MONTHS") and [ADD\_YEARS](add_years.html "ADD_YEARS") add a specified value of the corresponding time unit to a [DATE](date.html "DATE").
- [ADD\_WORKDAYS](add_workdays.html "ADD_WORKDAYS") adds a specified number of workdays to a [DATE](date.html "DATE") using a specified [TFACS style calendar table](workday_calendar.html "WORKDAY_CALENDAR").
- [CONVERT\_TIMEZONE](convert_timezone.html "CONVERT_TIMEZONE") converts a [DATE](date.html "DATE") input from specified timezone (or UTC timezone if not specified) to another specified timezone.


---

## pql/datetime/datetime-operators

# Datetime Operators

Datetime operators allow arithmetic operations on date and timestamp values. These operators enable adding or subtracting intervals from datetime values and calculating differences between datetime values.

## Supported Operations

Filter

- Operation
- Result Type
- Description

| Operation | Result Type | Description |
| --- | --- | --- |
| `DATE + INTERVAL` | `TIMESTAMP` | Add an interval to a date |
| `DATE - INTERVAL` | `TIMESTAMP` | Subtract an interval from a date |
| `TIMESTAMP + INTERVAL` | `TIMESTAMP` | Add an interval to a timestamp |
| `TIMESTAMP - INTERVAL` | `TIMESTAMP` | Subtract an interval from a timestamp |
| `INTERVAL + INTERVAL` | `INTERVAL` | Add an interval to another interval |
| `INTERVAL - INTERVAL` | `INTERVAL` | Subtract an interval from another interval |
| `DATE + TIME` | `TIMESTAMP` | Combine a date and time into a timestamp |

| Operation | Result Type | Description |
| --- | --- | --- |
| `DATE + INTERVAL` | `TIMESTAMP` | Add an interval to a date |
| `DATE - INTERVAL` | `TIMESTAMP` | Subtract an interval from a date |
| `TIMESTAMP + INTERVAL` | `TIMESTAMP` | Add an interval to a timestamp |
| `TIMESTAMP - INTERVAL` | `TIMESTAMP` | Subtract an interval from a timestamp |
| `INTERVAL + INTERVAL` | `INTERVAL` | Add an interval to another interval |
| `INTERVAL - INTERVAL` | `INTERVAL` | Subtract an interval from another interval |
| `DATE + TIME` | `TIMESTAMP` | Combine a date and time into a timestamp |

## Examples

### Adding Intervals to Dates

```
-- Example 1: Add days to a date
> SELECT DATE '2025-01-15' + INTERVAL '10' DAY;
2025-01-25 00:00:00

-- Example 2: Add months to a date
> SELECT DATE '2025-01-15' + INTERVAL '3' MONTH;
2025-04-15 00:00:00

-- Example 3: Add years to a date
> SELECT DATE '2025-01-15' + INTERVAL '2' YEAR;
2027-01-15 00:00:00
```

### Subtracting Intervals from Dates

```
-- Example 4: Subtract days from a date
> SELECT DATE '2025-01-15' - INTERVAL '10' DAY;
2025-01-05 00:00:00

-- Example 5: Subtract months from a date
> SELECT DATE '2025-01-15' - INTERVAL '3' MONTH;
2024-10-15 00:00:00

-- Example 6: Subtract years from a date
> SELECT DATE '2025-01-15' - INTERVAL '2' YEAR;
2023-01-15 00:00:00
```

### Adding Intervals to Timestamps

```
-- Example 7: Add hours to a timestamp
> SELECT TIMESTAMP '2025-01-15 10:30:00' + INTERVAL '5' HOUR;
2025-01-15 15:30:00

-- Example 8: Add days and hours to a timestamp
> SELECT TIMESTAMP '2025-01-15 10:30:00' + INTERVAL '1 12:00:00' DAY TO SECOND;
2025-01-16 22:30:00
```

### Subtracting Intervals from Timestamps

```
-- Example 9: Subtract hours from a timestamp
> SELECT TIMESTAMP '2025-01-15 10:30:00' - INTERVAL '5' HOUR;
2025-01-15 05:30:00

-- Example 10: Subtract days and hours from a timestamp
> SELECT TIMESTAMP '2025-01-15 10:30:00' - INTERVAL '1 12:00:00' DAY TO SECOND;
2025-01-13 22:30:00
```

### Combining Date and Time

```
-- Example 11: Combine date and time
> SELECT DATE '2025-01-15' + TIME '14:30:00';
2025-01-15 14:30:00
```

## See Also

- [INTERVAL types](interval-types.html "INTERVAL types")
- [TIMESTAMPADD function](timestampadd-function.html "TIMESTAMPADD function")
- [TIMESTAMPDIFF function](timestampdiff-function.html "TIMESTAMPDIFF function")
- [DATEDIFF function](datediff-function.html "DATEDIFF function")


---

## pql/datetime/datetime-projection

# DateTime Projection

## Description

DateTime Projection Functions contains functions to extract the different parts from a [DATE](date.html "DATE") and to map [DATE](date.html "DATE")s to other data types and vice versa.

- [MILLIS](millis.html "MILLIS"), [SECONDS](seconds.html "SECONDS"), [HOURS](hours.html "HOURS"), [DAY](day.html "DAY"), [MONTH](month.html "MONTH") and [YEAR](year.html "YEAR") extract the corresponding date part from a [DATE](date.html "DATE").
- [CALENDAR\_WEEK](calendar_week.html "CALENDAR_WEEK"), [DAY\_OF\_WEEK](day_of_week.html "DAY_OF_WEEK"), [DAYS\_IN\_MONTH](days_in_month.html "DAYS_IN_MONTH") and [QUARTER](quarter.html "QUARTER") return the corresponding information about a [DATE](date.html "DATE").
- [DATE\_MATCH](date_match.html "DATE_MATCH") checks whether a [DATE](date.html "DATE") matches a specified pattern.
- [REMAP\_TIMESTAMPS](remap_timestamps.html "REMAP_TIMESTAMPS") counts time units in specified intervals.
- [TO\_DATE](to_date.html "TO_DATE") converts a string into a [DATE](date.html "DATE").


---

## pql/datetime/datetime-rounding

# DateTime Rounding

## Description

DateTime rounding functions round down the subordinates of the chosen time unit into the ground state. They can be applied to [DATE](date.html "DATE") columns and always return a [DATE](date.html "DATE") column.

The ground states are:

- **MONTH**: 01
- **DAY**: 01
- **HOUR**: 00
- **MINUTE**: 00
- **SECOND**: 00
- **MILLISECOND**: 000

The following functions are available:

- [ROUND\_SECOND](round_second.html "ROUND_SECOND"), [ROUND\_MINUTE](round_minute.html "ROUND_MINUTE"), [ROUND\_HOUR](round_hour.html "ROUND_HOUR"), [ROUND\_DAY](round_day.html "ROUND_DAY"), [ROUND\_MONTH](round_month.html "ROUND_MONTH"), [ROUND\_QUARTER](round_quarter.html "ROUND_QUARTER") and [ROUND\_YEAR](round_year.html "ROUND_YEAR") round down the subordinates of the respective time unit into the ground state.
- The [ROUND\_WEEK](round_week.html "ROUND_WEEK") function is handled slightly different: This function also rounds down the HOUR, MINUTE, SECOND and MILLISECOND values, but the DAY value will not be in its ground state. Instead, the day will be chosen as the Monday of the week of that date.


---

## pql/logical/logical

# Logical

## Description

Logical operators are used to combine boolean expressions into a more complex boolean expressions.

In this section [AND](and.html "AND"), [OR](or.html "OR") and [NOT](not.html "NOT") are described.

Logical operator precedence is documented in the [Functions and Operators](pql-function-library.html "PQL Function Library") section.

Logical operators can be used within one of the following contexts, which can evaluate a Boolean expression:

- [CASE WHEN](case-when.html "CASE WHEN") (in the `WHEN` conditions)
- [FILTER](filter.html "FILTER")
- [Pull-Up-Functions](pull-up-aggregation.html "Pull Up Aggregation") (in the filter argument)
- [BIND\_FILTERS](bind_filters.html "BIND_FILTERS") (in the filter argument)
- [CALC\_REWORK](calc_rework.html "CALC_REWORK") (in the filter argument)


---

## pql/logical/logical-operators

# Logical Operators

Logical operators are used to combine or negate boolean expressions. They are essential for building complex conditions in `WHERE` clauses, `CASE` expressions, and other conditional constructs.

## Supported Operators

| Operator | Description |
| --- | --- |
| `AND` | Returns `TRUE` if both operands are `TRUE` |
| `OR` | Returns `TRUE` if at least one operand is `TRUE` |
| `NOT` | Negates a boolean expression |

## Syntax

```
boolean_expression AND boolean_expression
boolean_expression OR boolean_expression
NOT boolean_expression
```

## Truth Tables

### AND Operator

Filter

- A
- B
- A AND B

| A | B | A AND B |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | FALSE | FALSE |
| TRUE | NULL | NULL |
| FALSE | TRUE | FALSE |
| FALSE | FALSE | FALSE |
| FALSE | NULL | FALSE |
| NULL | TRUE | NULL |
| NULL | FALSE | FALSE |
| NULL | NULL | NULL |

| A | B | A AND B |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | FALSE | FALSE |
| TRUE | NULL | NULL |
| FALSE | TRUE | FALSE |
| FALSE | FALSE | FALSE |
| FALSE | NULL | FALSE |
| NULL | TRUE | NULL |
| NULL | FALSE | FALSE |
| NULL | NULL | NULL |

### OR Operator

Filter

- A
- B
- A OR B

| A | B | A OR B |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | FALSE | TRUE |
| TRUE | NULL | TRUE |
| FALSE | TRUE | TRUE |
| FALSE | FALSE | FALSE |
| FALSE | NULL | NULL |
| NULL | TRUE | TRUE |
| NULL | FALSE | NULL |
| NULL | NULL | NULL |

| A | B | A OR B |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | FALSE | TRUE |
| TRUE | NULL | TRUE |
| FALSE | TRUE | TRUE |
| FALSE | FALSE | FALSE |
| FALSE | NULL | NULL |
| NULL | TRUE | TRUE |
| NULL | FALSE | NULL |
| NULL | NULL | NULL |

### NOT Operator

| A | NOT A |
| --- | --- |
| TRUE | FALSE |
| FALSE | TRUE |
| NULL | NULL |

## Operator Precedence

1. `NOT` (highest precedence)
2. `AND`
3. `OR` (lowest precedence)

Use parentheses to override default precedence when needed.

## Examples

### AND Operator

```
-- Example 1: Both conditions must be true
> SELECT * FROM employees
  WHERE department_id = 10 AND salary > 50000;

-- Example 2: Multiple AND conditions
> SELECT * FROM orders
  WHERE status = 'completed' AND amount > 100 AND order_date >= '2025-01-01';
```

### OR Operator

```
-- Example 3: Either condition can be true
> SELECT * FROM products
  WHERE category = 'Electronics' OR category = 'Appliances';

-- Example 4: Combining OR with other conditions
> SELECT * FROM employees
  WHERE (department_id = 10 OR department_id = 20) AND salary > 50000;
```

### NOT Operator

```
-- Example 5: Negate a condition
> SELECT * FROM orders
  WHERE NOT status = 'cancelled';

-- Example 6: NOT with IN operator
> SELECT * FROM products
  WHERE NOT category IN ('Discontinued', 'Archived');

-- Example 7: NOT with LIKE operator
> SELECT * FROM employees
  WHERE NOT name LIKE 'Test%';
```

### Complex Expressions

```
-- Example 8: Combining AND, OR, and NOT with parentheses
> SELECT * FROM orders
  WHERE (status = 'pending' OR status = 'processing')
    AND NOT customer_id IS NULL
    AND amount > 0;
```


---

## pql/math/math

# Math

## Description

This section comprises standard mathematical functions including basic arithmetic operations.

All functions and operators can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns, or constants. For the type of the resulting column, please see the documentation for that function.


---

## pql/math/mathematical-operators

# Mathematical Operators

Mathematical operators perform arithmetic operations on numeric values. CeloSQL supports standard mathematical operations for numeric data types.

## Supported Operators

Filter

- Operator
- Description
- Example

| Operator | Description | Example |
| --- | --- | --- |
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `-` | Unary minus (negation) | `-a` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulo (remainder) | `a % b` |

| Operator | Description | Example |
| --- | --- | --- |
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `-` | Unary minus (negation) | `-a` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulo (remainder) | `a % b` |

## Operator Precedence

1. `-` Unary minus (highest precedence)
2. `*`, `/`, `%` Multiplication, division, modulo
3. `+`, `-` Addition, subtraction (lowest precedence)

Use parentheses to override default precedence when needed.

## Returns

### Division Operator (`/`)

- Always returns a `DOUBLE` type result.

### Other Operators (`+`, `-`, `*`, `%`)

- Mixed types are promoted to the more precise type
- Returns `NULL` if any operand is `NULL`.

## Limits

- Division by zero returns `inf` (positive infinity) for positive dividends, `-inf` for negative dividends, and `NaN` for `0/0`.
- Integer overflow will result in an error.
- Division always returns `DOUBLE` type, not integer division.

## Examples

### Basic Arithmetic

```
-- Example 1: Addition
> SELECT 1 + 1;
2

-- Example 2: Subtraction
> SELECT 1 - 1;
0

-- Example 3: Multiplication
> SELECT 1 * 2;
2

-- Example 4: Division (returns DOUBLE)
> SELECT 1 / 2;
0.5

-- Example 5: Division by zero returns infinity
> SELECT 5 / 0;
inf

> SELECT -5 / 0;
-inf

-- Example 6: Zero divided by zero returns NaN
> SELECT 0 / 0;
NaN
```

### Unary Minus

```
-- Example 6: Negation
> SELECT -10;
-10
```

### Decimal Arithmetic

```
-- Example 7: Division with decimals
> SELECT CAST(10 AS DECIMAL(10,2)) / CAST(3 AS DECIMAL(10,2));
3.33

-- Example 8: Precise decimal operations
> SELECT CAST(0.1 AS DECIMAL(10,2)) + CAST(0.2 AS DECIMAL(10,2));
0.30
```

### NULL Handling

```
-- Example 15: NULL in arithmetic returns NULL
> SELECT 10 + NULL;
NULL

> SELECT NULL * 5;
NULL
```

## See Also

- [ABS function](abs-function.html "ABS function")
- [POWER function](power-function.html "POWER function")
- [SQRT function](sqrt-function.html "SQRT function")
- [ROUND function](round-function.html "ROUND function")


---

## pql/math/math-functions

# Math functions

Use a math function to apply mathematical operations to data. For example, math functions let you get an average of an array, round a value up or down, or change the format of a number (1 000 000 to 1,000,000 or 1.000.000). Below is a list of supported math functions and a brief description of each one.

Expand all

[## **abs** (number)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-d34c318a-a7b0-d74a-de18-4bbdfc07c05e_body)

Returns the absolute value of an integer.

`abs(` -5 `)`

= 5

`abs(` 5 `)`

= 5

`abs(` 0 `)`

= 0

`abs(` -3.7 `)`

= 3.7

[## **average** ([array of values]) average(value1; [value2], ...)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-864a7908-42b5-f388-c7fd-ec9e533c426c_body)

Returns the average value of the numeric values in a specific array, or the average value of numerical values entered individually.

[## **ceil** (number)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-27bea3b1-868f-321e-c151-b74df1193b24_body)

Returns the smallest integer greater than or equal to a specified number.

`ceil(` 1.2 `)`

= 2

`ceil(` 4 `)`

= 4

[## **floor** (number)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-443aae2b-e3e3-8dba-cf6e-0e768c01e60d_body)

Returns the largest integer less than or equal to a specified number.

`floor(` 1.2 `)`

= 1

`floor(` 1.9 `)`

= 1

`floor(` 4 `)`

= 4

[## **formatNumber** (number; decimalPOINTS; [decimalSeparator]; [thousandsSeparator])](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-8a6e6a6f-9a7d-5981-4ce8-f39f3384e729_body)

Returns a number in the requested format. Decimal point is `,` by default, Thousands separator is `.` by default.

`formatNumber(` 123456789 `;` 3 `;` , `;` . `)`

= 123.456.789,000

[## **max** ([array of values]), max(value1;value2; ...)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-8d58ceba-562a-2bd0-2f5c-ff130897c38b_body)

Returns the largest number in a specified array, or the largest number among numbers entered individually.

[## **median** ([array of values])](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-c2affe56-ff27-f20d-0b0f-5cdae27f5493_body)

Returns the median of the values in a specified array, or the median of numbers entered individually.

`median(` 3; 5; 7 `)`

= 5

`median(` 2; 3; 5; 8 `)`

= 4

`median(` 2.5; 3.5; 2; 4.5; 1 `)`

= 2.5

[## **min** ([array of values]), min(value1;value2; ...)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-66a63984-f99b-3e74-0ab6-4cdf3569ebfc_body)

Returns the smallest number in a specified array, or the smallest number among numbers entered individually.

[## **parseNumber** (number; decimal separator)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-df15d26c-5725-4eba-08d5-7504a8f795b7_body)

Parses a string with a number and returns the number.

Example: `parseNumber(` 1 756,456 `;` , `)`

[## **round** (number)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-3dda882d-79a6-ed60-3e1f-502c97f9a6f4_body)

Rounds a numeric value to the nearest integer.

`round(` 1.2 `)`

= 1

`round(` 1.5 `)`

= 2

`round(` 1.7 `)`

= 2

`round(` 2 `)`

= 2

[## **stdevP** ([array of values])](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-ab98fc40-f11f-6257-58fd-241c4e1fbe5d_body)

Returns the standard deviation of a specified array of population values, or the standard deviation of numbers entered individually.

`stdevP(` 1; 2; 3; 4; 5`)`

= 1.4142135623730951

`stdevP(` {{array}} `)`

[## **stdevS** ([array of values])](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-80012623-858c-2551-372d-ab7dc94fb9c5_body)

Returns the standard deviation of a specified array of sample values, or the standard deviation of numbers entered individually.

`stdevS(` 1; 2; 3; 4; 5`)`

= 1.5811388300841898

`stdevS(` {{array}} `)`

[## **sum** ([array of values]), sum(value1;value2; ...)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-7e2f678c-6360-616e-1798-a156afb12d09_body)

Returns the sum of the values in a specified array, or the sum of numbers entered individually.

[## **trunc** (number)](#UUID-d45127a2-9e4d-e2db-6508-4b72d74303fd_UUID-8eed3a7a-0c98-9113-1b4f-7aa739724370_body)

Truncates a number to an integer by removing the fractional part of the number.

`trunc(` 3.789`)`

= 3

`trunc(` 3.789; 2`)`

= 3.78

`trunc(` -3.789; 2 `)`

= -3.7

`trunc(` 123.456; -2 `)`

= 100


---

## pql/predicate/predicate

# Predicate

## Description

Predicate functions and operators check if the input argument satisfies a condition.

### Predicate Function

The [ISNULL](isnull.html "ISNULL") function checks if the input value is NULL and returns 1 if the input value is NULL, and 0 (as an [INT](int.html "INT")) otherwise.

### Predicate Operators

Predicate operators return `true` if the respective condition is fulfilled, and `false` otherwise:

- [IN](in.html "IN") can be used to match the values of a column with a list of match values.
- In contrast to [IN](in.html "IN"), [MULTI\_IN](multi_in.html "MULTI_IN") matches a list of tuples.
- [LIKE](like.html "LIKE") returns `true` if the value of a column matches the given pattern.
- [IN\_LIKE](in_like.html "IN_LIKE") predicate determines whether one of the multiple right string patterns matches the left expression.
- The [BETWEEN](between.html "BETWEEN") operator matches an inclusive range between two given values.
- In contrast to the [ISNULL](isnull.html "ISNULL") function, which returns an [INT](int.html "INT"), the [IS NULL](is-null.html "IS NULL") operator returns `true` if the input is NULL, and `false` otherwise.

The output of `IN`, `MULTI_IN`, `LIKE`, `IN_LIKE`, `BETWEEN` and `IS NULL` can be negated by using `NOT IN`, `NOT MULTI_IN`, `NOT LIKE`, `NOT IN_LIKE`, `NOT BETWEEN` and `IS NOT NULL` respectively.

[IN](in.html "IN"), [MULTI\_IN](multi_in.html "MULTI_IN"), [LIKE](like.html "LIKE"), [IN\_LIKE](in_like.html "IN_LIKE"), [BETWEEN](between.html "BETWEEN") and [IS NULL](is-null.html "IS NULL") can be used within one of the following contexts, which can evaluate a boolean expression:

- [CASE WHEN](case-when.html "CASE WHEN") (in the `WHEN` conditions)
- [FILTER](filter.html "FILTER")
- [Pull-Up-Functions](pull-up-aggregation.html "Pull Up Aggregation") (in the filter argument)
- [BIND\_FILTERS](bind_filters.html "BIND_FILTERS") (in the filter argument)
- [CALC\_REWORK](calc_rework.html "CALC_REWORK") (in the filter argument)

Predicate operators can be combined with [logical operators](logical.html "Logical") to more complex boolean expressions.


---

## pql/window/window

# Window

## Description

Window functions and operators perform calculations in a partitioned table.

The following window functions are available:

- [INDEX\_ORDER](index_order.html "INDEX_ORDER") indexes rows inside a partition based on the provided sorting.
- [INTERPOLATE](interpolate.html "INTERPOLATE") interpolates missing values inside a partition with `CONSTANT` or `LINEAR` slope.
- [LEAD](lead.html "LEAD") and [LAG](lag.html "LAG") can be used to reference a following or previous row for every input row inside the partition.
- [RUNNING\_SUM](running_sum.html "RUNNING_SUM") returns the sum of the previous rows inside the partition.
- [WINDOW\_AVG](window_avg.html "WINDOW_AVG") calculates the average inside a user-defined sliding window.


---

## pql/window/window_avg

# WINDOW\_AVG

## Description

WINDOW\_AVG can be used to calculate the average over a user-defined window. It is possible to specify a column based ordering and partitioning.

The output type is [FLOAT](float.html "FLOAT").

## Syntax

```
WINDOW_AVG ( column, start, end [, ORDER BY ( sort_column [sorting], ... )] [, PARTITION BY ( partition_column, ... )] )
```

- **column**: The non-constant input column where values should be averaged. Supported input types: [INT](int.html "INT"), [FLOAT](float.html "FLOAT")
- **start**: Amount of rows where the window should start, relative to the window. Must be of type [INT](int.html "INT").
- **end**: Amount of rows where the window should end, relative to the window. Must be of type [INT](int.html "INT").
- **sort\_column**: Optional non-constant sorting column to specify an order.
- **sorting**: Each of these columns can have an optional tag specifying the ordering of the column. Default is ascending:

  - **ASC**: Ascending order
  - **DESC**: Descending order
- **partition\_column**: Optional non-constant partition column to specify groups in which `WINDOW_AVG` should operate.

**Warning**

**Ordering without explicit ORDER BY:**

There is no guarantee on the order of the result returned if no explicit ORDER BY column is given. The only clearly defined cases without ORDER BY are when:

1. using it on a table with implicit sorting (e.g., an activity table).
2. using to access a grouper dimension or a value depending on a grouper dimension, e.g.:

   1. `"TABLE"."COLUMN"`
   2. `WINDOW_AVG ( "TABLE"."COLUMN" + 1 )`

One or more columns can be given to specify an ordering. This tells the `WINDOW_AVG` function what the preceding/following element actually is. Optionally every column can be tagged as ascending or descending. The partition columns specify groups. The `WINDOW_AVG` function operates independently within every group. This means when an ordering is given it is applied within every group.

## NULL handling

NULL values are ignored, meaning that even if they are inside the window, they do not influence the result of the average. If all values of a window are NULL, the result for this window is also NULL.

## Examples

### Basic usage

|  |
| --- |
| **[1]**  WINDOW\_AVG with [INT](int.html "INT") values, taking the current and the row afterwards into consideration. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , 0 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | | --- | | 1 | | 2 | | 3 | | 5 | | 7 | | 8 | | 8 | | 9 | | **Result**  | Column1 : float | | --- | | 1.5 | | 2.5 | | 4.0 | | 6.0 | | 7.5 | | 8.0 | | 8.5 | | 9.0 | | |

|  |
| --- |
| **[2]**  WINDOW\_AVG with [INT](int.html "INT") values, taking the current and the previous row into consideration. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | | --- | | 1 | | 2 | | 3 | | 5 | | 7 | | 8 | | 8 | | 9 | | **Result**  | Column1 : float | | --- | | 1.0 | | 1.5 | | 2.5 | | 4.0 | | 6.0 | | 7.5 | | 8.0 | | 8.5 | | |

|  |
| --- |
| **[3]**  WINDOW\_AVG with negative and zero [INT](int.html "INT") values. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | | --- | | -3 | | 0 | | 6 | | -3 | | 0 | | **Result**  | Column1 : float | | --- | | -1.5 | | 1.0 | | 1.0 | | 1.0 | | -1.5 | | |

### Advanced usage (e.g. showing NULL handling)

|  |
| --- |
| **[4]**  WINDOW\_AVG with [FLOAT](float.html "FLOAT") values and NULL occurrences. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : float | | --- | | 4.0 | | *null* | | 11.0 | | 8.0 | | 8.0 | | *null* | | 4.0 | | 1.0 | | **Result**  | Column1 : float | | --- | | 4.0 | | 7.5 | | 9.5 | | 9.0 | | 8.0 | | 6.0 | | 2.5 | | 2.5 | | |

|  |
| --- |
| **[5]**  WINDOW\_AVG with a leading NULL. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 2 , 2 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | | --- | | *null* | | 1 | | 2 | | 3 | | 4 | | 9 | | 1 | | -3 | | **Result**  | Column1 : float | | --- | | 1.5 | | 2.0 | | 2.5 | | 3.8 | | 3.8 | | 2.8 | | 2.75 | | 2.33333333333 | | |

|  |
| --- |
| **[6]**  WINDOW\_AVG with NULL occurrences. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | | --- | | 6 | | 5 | | *null* | | *null* | | *null* | | 5 | | 2 | | **Result**  | Column1 : float | | --- | | 5.5 | | 5.5 | | 5.0 | | *null* | | 5.0 | | 3.5 | | 3.5 | | |

### Ordering, Partitioning

|  |
| --- |
| **[7]**  WINDOW\_AVG with an ORDER BY clause. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 1 , ORDER BY ( "Table"."order" DESC ) ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | order : int | | --- | --- | | 6 | 3 | | 5 | 2 | | 8 | 5 | | 10 | 1 | | 1 | 4 | | **Result**  | Column1 : float | | --- | | 4.0 | | 7.0 | | 4.5 | | 7.5 | | 5.0 | | |

|  |
| --- |
| **[8]**  WINDOW\_AVG with a PARTITION BY clause. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table"."values" , - 1 , 1 , PARTITION BY ( "Table"."fruit" ) ) ``` | |
| | Input | Output | | --- | --- | | **Table**  | values : int | fruit : string | | --- | --- | | 6 | 'Apple' | | 5 | 'Apple' | | 8 | 'Strawberry' | | 10 | 'Orange' | | 1 | 'Strawberry' | | **Result**  | Column1 : float | | --- | | 5.5 | | 5.5 | | 4.5 | | 10.0 | | 4.5 | | |

|  |
| --- |
| **[9]**  WINDOW\_AVG with multiple orders and partition clauses. |
| | Query | | --- | | **Column1**  ``` WINDOW_AVG ( "Table1"."value" , - 1 , 1 , ORDER BY ( "Table1"."year" ASC , "Table1"."column" DESC ) , PARTITION BY ( "Table1"."Country" , "Table1"."State" ) ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - column : int - year : date - value : float - Country : string - State : string  | column : int | year : date | value : float | Country : string | State : string | | --- | --- | --- | --- | --- | | 4 | Tue Dec 31 2002 00:00:00.000 | *null* | 'Germany' | 'Bavaria' | | 2 | Fri Dec 31 1999 00:00:00.000 | 2.0 | 'Germany' | 'Berlin' | | 2 | Mon Dec 31 2001 00:00:00.000 | 3.0 | 'Germany' | 'Bavaria' | | 1 | Fri Dec 31 1999 00:00:00.000 | *null* | 'Germany' | 'Bavaria' | | 1 | Fri Dec 31 1999 00:00:00.000 | 5.0 | 'USA' | 'California' | | 1 | Sun Dec 31 2000 00:00:00.000 | 6.0 | 'Germany' | 'Berlin' | | 5 | Tue Dec 31 2002 00:00:00.000 | *null* | 'USA' | 'California' | | 6 | Mon Dec 31 2001 00:00:00.000 | *null* | 'Germany' | 'Berlin' | | 1 | Tue Dec 31 2002 00:00:00.000 | 9.0 | 'Germany' | 'Bavaria' | | 7 | Wed Dec 31 2003 00:00:00.000 | 10.0 | 'USA' | 'California' |   | column : int | year : date | value : float | Country : string | State : string | | --- | --- | --- | --- | --- | | 4 | Tue Dec 31 2002 00:00:00.000 | *null* | 'Germany' | 'Bavaria' | | 2 | Fri Dec 31 1999 00:00:00.000 | 2.0 | 'Germany' | 'Berlin' | | 2 | Mon Dec 31 2001 00:00:00.000 | 3.0 | 'Germany' | 'Bavaria' | | 1 | Fri Dec 31 1999 00:00:00.000 | *null* | 'Germany' | 'Bavaria' | | 1 | Fri Dec 31 1999 00:00:00.000 | 5.0 | 'USA' | 'California' | | 1 | Sun Dec 31 2000 00:00:00.000 | 6.0 | 'Germany' | 'Berlin' | | 5 | Tue Dec 31 2002 00:00:00.000 | *null* | 'USA' | 'California' | | 6 | Mon Dec 31 2001 00:00:00.000 | *null* | 'Germany' | 'Berlin' | | 1 | Tue Dec 31 2002 00:00:00.000 | 9.0 | 'Germany' | 'Bavaria' | | 7 | Wed Dec 31 2003 00:00:00.000 | 10.0 | 'USA' | 'California' | | **Result**  | Column1 : float | | --- | | 6.0 | | 4.0 | | 3.0 | | 3.0 | | 5.0 | | 4.0 | | 7.5 | | 6.0 | | 9.0 | | 10.0 | | |


---

