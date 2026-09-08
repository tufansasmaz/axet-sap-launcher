# PQL: Aggregation Functions

## pql/aggregation/aggregation

# Aggregation

## Description

All aggregation functions have in common that they calculate a single value from a set of values, for example multiple rows from an input column.


---

## pql/aggregation/moving/moving_avg

# MOVING\_AVG

## Description

This function calculates the average for each window. It can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
MOVING_AVG ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving average for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_AVG ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | 100.0 | | 1 | 200.0 | | 2 | 350.0 | | 3 | 350.0 | | 4 | 400.0 | | |

|  |
| --- |
| **[2]**  Moving average for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_AVG ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400.0 | | 3 | 350.0 | | 4 | 400.0 | | |

|  |
| --- |
| **[3]**  Moving average for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value larger than 300 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" > 300; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_AVG ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 2 | 400.0 | | 4 | 450.0 | | |

## See also:

- [AVG](avg.html "AVG")


---

## pql/aggregation/moving/moving_count

# MOVING\_COUNT

## Description

This function counts the values for each window. It can be applied to any data type.

## Syntax

```
MOVING_COUNT ( table.column, start, end )
```

## NULL handling

NULL values are not counted. If all values of a group are NULL, the result for this group is 0.

## Examples

|  |
| --- |
| **[1]**  Count of values for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 100 | | 2 | 400 | | 3 | 300 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 1 | | 1 | 2 | | 2 | 2 | | 3 | 2 | | 4 | 2 | | |

|  |
| --- |
| **[2]**  Count of values for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 0 | | 1 | 0 | | 2 | 1 | | 3 | 2 | | 4 | 2 | | |

|  |
| --- |
| **[3]**  Count of values for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 400 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 400; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 300 | | 3 | 400 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 2 | 1 | | 4 | 2 | | |

## See also:

- [COUNT](count.html "COUNT")


---

## pql/aggregation/moving/moving_count_distinct

# MOVING\_COUNT\_DISTINCT

## Description

This function counts the distinct values for each window. It can be applied to any data type.

## Syntax

```
MOVING_COUNT_DISTINCT ( table.column, start, end )
```

## NULL handling

NULL values are not counted. If all values of a group are NULL, the result for this group is 0.

## Examples

|  |
| --- |
| **[1]**  Count of distinct values for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT_DISTINCT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 100 | | 2 | 400 | | 3 | 300 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 1 | | 1 | 1 | | 2 | 2 | | 3 | 2 | | 4 | 1 | | |

|  |
| --- |
| **[2]**  Count of distinct values for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT_DISTINCT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 0 | | 1 | 0 | | 2 | 1 | | 3 | 2 | | 4 | 1 | | |

|  |
| --- |
| **[3]**  Count of distinct values for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 400 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 400; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_COUNT_DISTINCT ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | 100 | | 2 | 400 | | 3 | 300 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 1 | | 3 | 2 | | 4 | 1 | | |

## See also:

- [COUNT DISTINCT](count-distinct.html "COUNT DISTINCT")


---

## pql/aggregation/moving/moving_max

# MOVING\_MAX

## Description

Calculates the maximum for each window. It can be applied to any data type.

## Syntax

```
MOVING_MAX ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving max for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MAX ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 400 | | 4 | 500 | | |

|  |
| --- |
| **[2]**  Moving max for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MAX ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 400 | | 4 | 500 | | |

|  |
| --- |
| **[3]**  Moving max for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MAX ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 2 | 400 | | 4 | 400 | | |

## See also:

- [MAX](max.html "MAX")


---

## pql/aggregation/moving/moving_median

# MOVING\_MEDIAN

## Description

This function calculates the median for each window. It can be applied to any data type.

## Syntax

```
MOVING_MEDIAN ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving median for current row, one row above and one row after. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MEDIAN ( "Table1"."INCOME" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 300 | | 1 | 300 | | 2 | 300 | | 3 | 400 | | 4 | 500 | | |

|  |
| --- |
| **[2]**  Moving median for current row, one row above and one row after with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MEDIAN ( "Table1"."INCOME" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | *null* | | 1 | 400 | | 2 | 400 | | 3 | 400 | | 4 | 500 | | |

|  |
| --- |
| **[3]**  Moving median for current row, one row above and one row after. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MEDIAN ( "Table1"."INCOME" , - 1 , 1 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 2 | 400 | | 4 | 400 | | |

## See also:

- [MEDIAN](median.html "MEDIAN")


---

## pql/aggregation/moving/moving_min

# MOVING\_MIN

## Description

Calculates the minimum for each window. It can be applied to any data type.

## Syntax

```
MOVING_MIN ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving min for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MIN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 100 | | 1 | 100 | | 2 | 300 | | 3 | 300 | | 4 | 300 | | |

|  |
| --- |
| **[2]**  Moving min for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MIN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 300 | | |

|  |
| --- |
| **[3]**  Moving min for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_MIN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 300 | | 3 | 500 | | 4 | 400 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 2 | 300 | | 4 | 300 | | |

## See also:

- [MIN](min.html "MIN")


---

## pql/aggregation/moving/moving_stdev

# MOVING\_STDEV

## Description

This function calculates the standard deviation for each window. It can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
MOVING_STDEV ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Standard deviation for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_STDEV ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | 141.42 | | 2 | 70.71 | | 3 | 70.71 | | 4 | 141.42 | | |

|  |
| --- |
| **[2]**  Standard deviation for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_STDEV ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | *null* | | 3 | 70.71 | | 4 | 141.42 | | |

|  |
| --- |
| **[3]**  Standard deviation for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_STDEV ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 2 | *null* | | 4 | 70.71 | | |

## See also:

- [STDEV](stdev.html "STDEV")


---

## pql/aggregation/moving/moving_sum

# MOVING\_SUM

## Description

Calculates the sum for each window. It can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
MOVING_SUM ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving sum for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_SUM ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 100 | | 1 | 400 | | 2 | 700 | | 3 | 700 | | 4 | 800 | | |

|  |
| --- |
| **[2]**  Moving sum for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_SUM ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 700 | | 4 | 800 | | |

|  |
| --- |
| **[3]**  Moving sum for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_SUM ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 2 | 400 | | 4 | 700 | | |

## See also:

- [RUNNING\_SUM](running_sum.html "RUNNING_SUM")
- [SUM](sum.html "SUM")


---

## pql/aggregation/moving/moving_trimmed_mean

# MOVING\_TRIMMED\_MEAN

## Description

Calculates the trimmed mean with a cut off of 10% for each window. It can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
MOVING_TRIMMED_MEAN ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Examples

|  |
| --- |
| **[1]**  Moving trimmed mean for current row and one row above. Window is too small to do any trimming. Therefore the result is the same as for an average. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_TRIMMED_MEAN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | 100.0 | | 1 | 200.0 | | 2 | 350.0 | | 3 | 350.0 | | 4 | 400.0 | | |

|  |
| --- |
| **[2]**  Moving trimmed mean for current row and one row above with null values. Window is too small to do any trimming. Therefore the result is the same as for an average. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_TRIMMED_MEAN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400.0 | | 3 | 350.0 | | 4 | 400.0 | | |

|  |
| --- |
| **[3]**  Moving trimmed mean for current row and one row above. Window is too small to do any trimming. Therefore the result is the same as for an average. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_TRIMMED_MEAN ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 2 | 400.0 | | 4 | 350.0 | | |

## See also:

- [TRIMMED\_MEAN](trimmed_mean.html "TRIMMED_MEAN")


---

## pql/aggregation/moving/moving_var

# MOVING\_VAR

## Description

Calculates the variance for each window. It can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
MOVING_VAR ( table.column, start, end )
```

## NULL handling

NULL values are ignored, so they do not influence the result. If all the values of a group are NULL, the result for this group is also NULL.

## Tips

A group with only one non-NULL value will give the result NULL, since variance of one value only is undefined.

## Examples

|  |
| --- |
| **[1]**  Moving variance for current row and one row above. |
| | Query | | --- | | **Column1**  ``` "TABLE1"."MONTH" ```  **Column2**  ``` MOVING_VAR ( "TABLE1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | 100 | | 1 | 300 | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | 20000.0 | | 2 | 5000.0 | | 3 | 5000.0 | | 4 | 20000.0 | | |

|  |
| --- |
| **[2]**  Moving variance for current row and one row above with null values. |
| | Query | | --- | | **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_VAR ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 300 | | 4 | 500 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | *null* | | 3 | 5000.0 | | 4 | 20000.0 | | |

|  |
| --- |
| **[3]**  Moving variance for current row and one row above. A [FILTER](filter.html "FILTER") is applied, such that only rows with an INCOME value less than 500 are taken into account. |
| | Query | | --- | | **Filter**  ``` FILTER "Table1"."INCOME" < 500; ```  **Column1**  ``` "Table1"."MONTH" ```  **Column2**  ``` MOVING_VAR ( "Table1"."INCOME" , - 1 , 0 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | MONTH : int | INCOME : int | | --- | --- | | 1 | *null* | | 1 | *null* | | 2 | 400 | | 3 | 500 | | 4 | 300 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 2 | *null* | | 4 | 5000.0 | | |

## See also:

- [VAR](var.html "VAR")


---

## pql/aggregation/moving-aggregation

# Moving Aggregation

## Description

Moving operators calculate a value across a range of neighboring rows. A range of neighboring rows, used for the calculation of a moving operator result is called window.

Moving operators take filters, selections and sorting into account. Values which are filtered out are not part of the result and which values are part of a window depends on the sorting. Therefore if a filter, selection or the sorting is changed an window aggregation is recalculated.

## Syntax

```
MOVING_X ( table.column, start, end )
```

- **MOVING\_X** is one of:

  - [MOVING\_AVG](moving_avg.html "MOVING_AVG")
  - [MOVING\_COUNT\_DISTINCT](moving_count_distinct.html "MOVING_COUNT_DISTINCT")
  - [MOVING\_COUNT](moving_count.html "MOVING_COUNT")
  - [MOVING\_MAX](moving_max.html "MOVING_MAX")
  - [MOVING\_MEDIAN](moving_median.html "MOVING_MEDIAN")
  - [MOVING\_MIN](moving_min.html "MOVING_MIN")
  - [MOVING\_STDEV](moving_stdev.html "MOVING_STDEV")
  - [MOVING\_SUM](moving_sum.html "MOVING_SUM")
  - [MOVING\_TRIMMED\_MEAN](moving_trimmed_mean.html "MOVING_TRIMMED_MEAN")
  - [MOVING\_VAR](moving_var.html "MOVING_VAR")
- **start**: Start of the window (including), relative to the current row ([INT](int.html "INT")).
- **end**: End of the window (including), relative to the current row ([INT](int.html "INT")).

Please note: The maximum window size [START, END] is limited to 1000.


---

## pql/aggregation/pull-up/pu_avg

# PU\_AVG

## Description

Calculates the average of the specified source column for each element in the given target table.

Like the regular [AVG](avg.html "AVG") operator, the column can either be an [INT](int.html "INT") or [FLOAT](float.html "FLOAT") column. The data type of the result is always a [FLOAT](float.html "FLOAT").

## Syntax

```
PU_AVG ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Calculate the average of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_AVG ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | '001' | 400.0 | | '002' | 300.0 | | '003' | 200.0 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding average case table value is smaller than 300: |
| | Query | | --- | | **Filter**  ``` FILTER PU_AVG ( "companyDetail" , "caseTable"."value" ) < 300; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all average case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_AVG ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : float | | --- | | 400.0 | | |

|  |
| --- |
| **[4]**  Calculate the average of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_AVG ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | '001' | 200.0 | | '002' | 300.0 | | '003' | 200.0 | | |

|  |
| --- |
| **[5]**  Calculate the average of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_AVG ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | '001' | *null* | | '002' | 300.0 | | '003' | 200.0 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the average of all connected values in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_AVG ( "B" , "C"."VALUE" ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | 200.0 | | 2 | 350.0 | | |

|  |
| --- |
| **[7]**  For each case ID, calculate the average of the case table values for the associated company code using `DOMAIN_TABLE`: |
| | Query | | --- | | **Column1**  ``` "caseTable"."caseId" ```  **Column2**  ``` PU_AVG ( DOMAIN_TABLE ( "caseTable"."companyCode" ) , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | 400.0 | | 2 | 400.0 | | 3 | 400.0 | | 4 | 300.0 | | 5 | 300.0 | | 6 | 200.0 | | |

## See also:

- [AVG](avg.html "AVG")


---

## pql/aggregation/pull-up/pu_count

# PU\_COUNT

## Description

Calculates the number of elements in the specified source column for each element in the given target table.

PU\_COUNT can be applied on any data type. The data type of the result is always an [INT](int.html "INT").

## Syntax

```
PU_COUNT ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## Use Cases

- `PU_COUNT` can be used for [Fallback Status](examples-and-use-cases.html "Examples and Use Cases").

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), 0 will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Count the number of cases for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_COUNT ( "companyDetail" , "caseTable"."companyCode" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 3 | | '002' | 2 | | '003' | 1 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding number of case table values is smaller than 2: |
| | Query | | --- | | **Filter**  ``` FILTER PU_COUNT ( "companyDetail" , "caseTable"."value" ) < 2; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all number of case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_COUNT ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 3 | | |

|  |
| --- |
| **[4]**  Count the number of cases which have a value larger than 300 for each company code. All case table values for company codes '002' and '003' are filtered out, which means that in these cases, 0 is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_COUNT ( "companyDetail" , "caseTable"."companyCode" , "caseTable"."value" > 300 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 2 | | '002' | 0 | | '003' | 0 | | |

|  |
| --- |
| **[5]**  Example over three tables: For each entry in table B, count the number of values that are less than 300 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_COUNT ( "B" , "C"."VALUE" , "C"."VALUE" < 300 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 3 | | 2 | 1 | | |

## See also:

- [COUNT](count.html "COUNT")
- [PU\_COUNT\_DISTINCT](pu_count_distinct.html "PU_COUNT_DISTINCT")


---

## pql/aggregation/pull-up/pu_count_distinct

# PU\_COUNT\_DISTINCT

## Description

Calculates the number of distinct elements in the specified source column for each element in the given target table.

PU\_COUNT\_DISTINCT can be applied on any data type. The data type of the result is always an [INT](int.html "INT").

**Warning**

This operator supports both exact and approximate calculations. By default, calculations are exact to ensure precision and compliance with the SOC 1 (Service Organization Control) standard. However, we recommend using approximate calculations whenever possible, as they provide significant performance gains with minimal impact on accuracy. To enable this mode, use the `APPROX` keyword.

## Syntax

```
PU_COUNT_DISTINCT ( [APPROX|EXACT] target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), 0 will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Count the number of distinct values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_COUNT_DISTINCT ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 3 | | '002' | 1 | | '003' | 1 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding distinct number of case table values is smaller than 2: |
| | Query | | --- | | **Filter**  ``` FILTER PU_COUNT_DISTINCT ( "companyDetail" , "caseTable"."value" ) < 2; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '002' | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all distinct number of case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_COUNT_DISTINCT ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 3 | | |

|  |
| --- |
| **[4]**  Count the number of distinct values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_COUNT_DISTINCT ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 1 | | '002' | 1 | | '003' | 1 | | |

|  |
| --- |
| **[5]**  Count the number of distinct values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, 0 is returned: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_COUNT_DISTINCT ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 0 | | '002' | 1 | | '003' | 1 | | |

## See also:

- [COUNT DISTINCT](count-distinct.html "COUNT DISTINCT")
- [PU\_COUNT](pu_count.html "PU_COUNT")


---

## pql/aggregation/pull-up/pu_first

# PU\_FIRST

## Description

Returns the first element of the specified source column for each element in the given target table. An `order by` expression can be set to define the order that should be used to determine the first element.

PU\_FIRST can be applied on any data type. The data type of the result is the same as the input column data type.

## Syntax

```
PU_FIRST ( target_table, source_table.column [, filter_expression] [, ORDER BY source_table.column [ASC|DESC] ] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.
- **ORDER BY** (optional): Elements of the specified column are used to determine the first element. `ASC` or `DESC` can be specified to use ascending or descending ordering. If the order direction is not specified, the ascending (`ASC`) order is used. Using `PU_FIRST` with descending order is equivalent to using [PU\_LAST](pu_last.html "PU_LAST") with ascending order.

**Warning**

**Ordering without explicit ORDER BY:**

There is no guarantee on the order of the result returned if no explicit ORDER BY column is given. The only clearly defined cases without ORDER BY are when:

1. using it on a table with implicit sorting (e.g., an activity table).

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Use Cases

- `PU_FIRST` can be used for [Multiple Invoices per Case](multiple-invoices-per-case.html "Multiple Invoices per Case").

## Examples

|  |
| --- |
| **[1]**  Return the case ID of the smallest case table value for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_FIRST ( "companyDetail" , "caseTable"."caseId" , order by "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 100 | | 5 | '002' | 500 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 100 | | 5 | '002' | 500 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 3 | | '002' | 4 | | '003' | 6 | | |

|  |
| --- |
| **[2]**  Return the eventtime of the first activity for each case: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_FIRST ( "companyDetail" , "activityTable"."eventtime" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 : date | | --- | --- | | 1 | Fri Jan 01 2016 00:00:00.000 | | 2 | Fri Jan 01 2016 12:30:00.000 | | |

|  |
| --- |
| **[3]**  Return the eventtime of the first activity that contains a 'B' for each case: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_FIRST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 : date | | --- | --- | | 1 | Tue Feb 02 2016 14:00:00.000 | | 2 | Fri Jan 01 2016 13:00:00.000 | | |

|  |
| --- |
| **[4]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the cases are filtered such that the eventtime of the first activity that contains a 'B' happens after January 31st, 2016. |
| | Query | | --- | | **Filter**  ``` FILTER PU_FIRST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) > {d '2016-01-31' }; ```  **Column1**  ``` "companyDetail"."caseId" ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | | --- | | 1 | | |

|  |
| --- |
| **[5]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [median](median.html "MEDIAN") of the eventtimes of the first activity for each case that contains a 'B' is calculated: |
| | Query | | --- | | **Column1**  ``` MEDIAN ( PU_FIRST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : date | | --- | | Tue Feb 02 2016 14:00:00.000 | | |

|  |
| --- |
| **[6]**  Return the eventtime of the first activity that contains a 'X' for each case. As there exists no such activity, all activity table values are filtered out, which means that in both cases NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_FIRST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'X' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 | | --- | --- | | 1 | null | | 2 | null | | |

## See also:

- [PU\_LAST](pu_last.html "PU_LAST")
- [FIRST](first.html "FIRST")
- [LAST](last.html "LAST")
- [PU\_MIN](pu_min.html "PU_MIN")


---

## pql/aggregation/pull-up/pu_last

# PU\_LAST

## Description

Returns the last element of the specified source column for each element of the given target table. An `order by` expression can be set to define the order that should be used to determine the last element.

PU\_LAST can be applied on any data type. The data type of the result is the same as the input column data type.

## Syntax

```
PU_LAST ( target_table, source_table.column [, filter_expression] [, ORDER BY source_table.column [ASC|DESC] ] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.
- **ORDER BY** (optional): Elements of the specified column are used to determine the last element. `ASC` or `DESC` can be specified to use ascending or descending ordering. If the order direction is not specified, the ascending (`ASC`) order is used. Using `PU_LAST` with descending order is equivalent to using [PU\_FIRST](pu_first.html "PU_FIRST") with ascending order.

**Warning**

**Ordering without explicit ORDER BY:**

There is no guarantee on the order of the result returned if no explicit ORDER BY column is given. The only clearly defined cases without ORDER BY are when:

1. using it on a table with implicit sorting (e.g., an activity table).

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Use Cases

- `PU_LAST` can be used for [Multiple Invoices per Case](multiple-invoices-per-case.html "Multiple Invoices per Case").

## Examples

|  |
| --- |
| **[1]**  Return the case ID of the largest case table value for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_LAST ( "companyDetail" , "caseTable"."caseId" , order by "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 100 | | 5 | '002' | 500 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 100 | | 5 | '002' | 500 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 1 | | '002' | 5 | | '003' | 6 | | |

|  |
| --- |
| **[2]**  Return the eventtime of the last activity for each case: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_LAST ( "companyDetail" , "activityTable"."eventtime" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 : date | | --- | --- | | 1 | Sat Apr 02 2016 16:00:00.000 | | 2 | Fri Jan 01 2016 17:00:00.000 | | |

|  |
| --- |
| **[3]**  Return the eventtime of the last activity that contains a 'B' for each case: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_LAST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 : date | | --- | --- | | 1 | Sat Apr 02 2016 16:00:00.000 | | 2 | Fri Jan 01 2016 13:00:00.000 | | |

|  |
| --- |
| **[4]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the cases are filtered such that the eventtime of the last activity that contains a 'B' happens after 1st of March, 2016. |
| | Query | | --- | | **Filter**  ``` FILTER PU_LAST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) > {d '2016-03-01' }; ```  **Column1**  ``` "companyDetail"."caseId" ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | | --- | | 1 | | |

|  |
| --- |
| **[5]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [median](median.html "MEDIAN") of the eventtimes of the last activity for each case that contains a 'B' is calculated: |
| | Query | | --- | | **Column1**  ``` MEDIAN ( PU_LAST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'B' ) ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : date | | --- | | Sat Apr 02 2016 16:00:00.000 | | |

|  |
| --- |
| **[6]**  Return the eventtime of the last activity that contains a 'X' for each case. As there exists no such activity, all activity table values are filtered out, which means that in both cases NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."caseId" ```  **Column2**  ``` PU_LAST ( "companyDetail" , "activityTable"."eventtime" , "activityTable"."activity" LIKE 'X' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 00:00:00.000 | | 1 | 'B' | Tue Feb 02 2016 14:00:00.000 | | 1 | 'C' | Sat Apr 02 2016 15:00:00.000 | | 1 | 'B' | Sat Apr 02 2016 16:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 12:30:00.000 | | 2 | 'B' | Fri Jan 01 2016 13:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 15:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 17:00:00.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | **Result**  | Column1 : int | Column2 | | --- | --- | | 1 | null | | 2 | null | | |

## See also:

- [PU\_FIRST](pu_first.html "PU_FIRST")
- [LAST](last.html "LAST")
- [FIRST](first.html "FIRST")
- [PU\_MAX](pu_max.html "PU_MAX")


---

## pql/aggregation/pull-up/pu_max

# PU\_MAX

## Description

Calculates the maximum of the specified source column for each element in the given target table.

Like the regular [MAX](max.html "MAX") operator, PU\_MAX can be applied on any data type. The data type of the result is the same as the input column data type.

## Syntax

```
PU_MAX ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Use Cases

- `PU_MAX` can be used for [Throughput Times](throughput-times.html "Throughput Times").

## Examples

|  |
| --- |
| **[1]**  Calculate the maximum of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MAX ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 600 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding maximum case table value is smaller than 600: |
| | Query | | --- | | **Filter**  ``` FILTER PU_MAX ( "companyDetail" , "caseTable"."value" ) < 600; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '002' | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [sum](sum.html "SUM") of all maximum case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` SUM ( PU_MAX ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 1100 | | |

|  |
| --- |
| **[4]**  Calculate the maximum of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MAX ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the maximum of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MAX ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the maximum of the values that are smaller than 500 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_MAX ( "B" , "C"."VALUE" , "C"."VALUE" < 500 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 400 | | 2 | 200 | | |

## See also:

- [MAX](max.html "MAX")
- [PU\_LAST](pu_last.html "PU_LAST")


---

## pql/aggregation/pull-up/pu_median

# PU\_MEDIAN

## Description

Calculates the median of the specified source column for each element in the given target table.

The median is the middle element of a group. If the group has an even number of elements, the upper value of the two middle values is taken as the median.

Like the regular [MEDIAN](median.html "MEDIAN") operator, the column can either be an [INT](int.html "INT"), [FLOAT](float.html "FLOAT") or [DATE](date.html "DATE") column. The data type of the result is the same as the input column data type.

**Warning**

This operator supports both exact and approximate calculations. By default, calculations are exact to ensure precision and compliance with the SOC 1 (Service Organization Control) standard. However, we recommend using approximate calculations whenever possible, as they provide significant performance gains with minimal impact on accuracy. To enable this mode, use the `APPROX` keyword.

## Syntax

```
PU_MEDIAN ( [APPROX|EXACT] target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Calculate the maximum of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MEDIAN ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 400 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding median case table value is smaller than 300: |
| | Query | | --- | | **Filter**  ``` FILTER PU_MEDIAN ( "companyDetail" , "caseTable"."value" ) < 300; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all median case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_MEDIAN ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 400 | | |

|  |
| --- |
| **[4]**  Calculate the median of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MEDIAN ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the median of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MEDIAN ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the median of the values that are larger than 100 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_MEDIAN ( "B" , "C"."VALUE" , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 400 | | 2 | 500 | | |

## See also:

- [MEDIAN](median.html "MEDIAN")


---

## pql/aggregation/pull-up/pu_min

# PU\_MIN

## Description

Calculates the minimum of the specified source column for each element in the given target table.

Like the regular [MIN](min.html "MIN") operator, PU\_MIN can be applied on any data type. The data type of the result is the same as the input column data type.

## Syntax

```
PU_MIN ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Use Cases

- `PU_MIN` can be used for [Throughput Times](throughput-times.html "Throughput Times").

## Examples

|  |
| --- |
| **[1]**  Calculate the minimum of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MIN ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding minimum case table value is smaller than 300: |
| | Query | | --- | | **Filter**  ``` FILTER PU_MIN ( "companyDetail" , "caseTable"."value" ) < 300; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '001' | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [sum](sum.html "SUM") of all minimum case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` SUM ( PU_MIN ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 700 | | |

|  |
| --- |
| **[4]**  Calculate the minimum of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MIN ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the minimum of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MIN ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the minimum of the values that are larger than 100 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_MIN ( "B" , "C"."VALUE" , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 200 | | 2 | 200 | | |

## See also:

- [MIN](min.html "MIN")
- [PU\_FIRST](pu_first.html "PU_FIRST")


---

## pql/aggregation/pull-up/pu_mode

# PU\_MODE

## Description

Calculates the mode of the specified source column for each element in the given target table. For multi-modal input, where there are several result candidates, the element with the smallest value is chosen. For elements of type [STRING](string.html "STRING"), the smallest value is determined by its lexicographical order.

## Syntax

```
PU_MODE ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Calculate the mode of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "caseTable"."companyCode" ```  **Column2**  ``` PU_MODE ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : string - companyCode : string - value : int  | caseId : string | companyCode : string | value : int | | --- | --- | --- | | '1' | '001' | 200 | | '2' | '001' | 200 | | '3' | '001' | 100 | | '4' | '002' | 200 | | '5' | '002' | 150 | | '6' | '002' | 150 | | '7' | '003' | 150 | | '8' | '003' | 500 | | '9' | '003' | 500 | | '10' | '003' | 200 |   | caseId : string | companyCode : string | value : int | | --- | --- | --- | | '1' | '001' | 200 | | '2' | '001' | 200 | | '3' | '001' | 100 | | '4' | '002' | 200 | | '5' | '002' | 150 | | '6' | '002' | 150 | | '7' | '003' | 150 | | '8' | '003' | 500 | | '9' | '003' | 500 | | '10' | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'DE' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '001' | 200 | | '001' | 200 | | '002' | 150 | | '002' | 150 | | '002' | 150 | | '003' | 500 | | '003' | 500 | | '003' | 500 | | '003' | 500 | | |

|  |
| --- |
| **[2]**  Calculate the mode of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "caseTable"."companyCode" ```  **Column2**  ``` PU_MODE ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : string - companyCode : string - value : int  | caseId : string | companyCode : string | value : int | | --- | --- | --- | | '1' | '001' | 100 | | '2' | '001' | 200 | | '3' | '001' | 300 | | '4' | '002' | 400 | | '5' | '002' | 500 | | '6' | '002' | 600 | | '7' | '003' | 700 | | '8' | '003' | 800 | | '9' | '003' | 900 | | '10' | '003' | 1000 |   | caseId : string | companyCode : string | value : int | | --- | --- | --- | | '1' | '001' | 100 | | '2' | '001' | 200 | | '3' | '001' | 300 | | '4' | '002' | 400 | | '5' | '002' | 500 | | '6' | '002' | 600 | | '7' | '003' | 700 | | '8' | '003' | 800 | | '9' | '003' | 900 | | '10' | '003' | 1000 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 100 | | '001' | 100 | | '001' | 100 | | '002' | 400 | | '002' | 400 | | '002' | 400 | | '003' | 700 | | '003' | 700 | | '003' | 700 | | '003' | 700 | | |

|  |
| --- |
| **[3]**  Find the most frequent value per data type. |
| | Query | | --- | | **Column1**  ``` PU_MODE ( "group" , "values"."integer" ) ```  **Column2**  ``` PU_MODE ( "group" , "values"."string" ) ```  **Column3**  ``` PU_MODE ( "group" , "values"."float" ) ```  **Column4**  ``` PU_MODE ( "group" , "values"."date" ) ``` | |
| | Input | Output | | --- | --- | | **group**  | id : int | | --- | | 1 | | 2 | | 3 | | 4 |    **values**  Filter  - group : int - integer : int - string : string - float : float - date : date  | group : int | integer : int | string : string | float : float | date : date | | --- | --- | --- | --- | --- | | 1 | 1 | 'A' | 1.0 | Wed Jan 01 2025 00:00:00.000 | | 2 | 2 | 'B' | 2.0 | Thu Jan 02 2025 00:00:00.000 | | 2 | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 2 | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 3 | 5 | 'E' | 5.0 | Sun Jan 05 2025 00:00:00.000 | | 3 | 4 | 'D' | 4.0 | Sat Jan 04 2025 00:00:00.000 | | 4 | *null* | *null* | *null* | *null* |   | group : int | integer : int | string : string | float : float | date : date | | --- | --- | --- | --- | --- | | 1 | 1 | 'A' | 1.0 | Wed Jan 01 2025 00:00:00.000 | | 2 | 2 | 'B' | 2.0 | Thu Jan 02 2025 00:00:00.000 | | 2 | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 2 | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 3 | 5 | 'E' | 5.0 | Sun Jan 05 2025 00:00:00.000 | | 3 | 4 | 'D' | 4.0 | Sat Jan 04 2025 00:00:00.000 | | 4 | *null* | *null* | *null* | *null* |        **Foreign Keys**  |  |  | | --- | --- | | group.id | values.group | | **Result**  Filter  - Column1 : int - Column2 : string - Column3 : float - Column4 : date  | Column1 : int | Column2 : string | Column3 : float | Column4 : date | | --- | --- | --- | --- | | 1 | 'A' | 1.0 | Wed Jan 01 2025 00:00:00.000 | | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 4 | 'D' | 4.0 | Sat Jan 04 2025 00:00:00.000 | | *null* | *null* | *null* | *null* |   | Column1 : int | Column2 : string | Column3 : float | Column4 : date | | --- | --- | --- | --- | | 1 | 'A' | 1.0 | Wed Jan 01 2025 00:00:00.000 | | 3 | 'C' | 3.0 | Fri Jan 03 2025 00:00:00.000 | | 4 | 'D' | 4.0 | Sat Jan 04 2025 00:00:00.000 | | *null* | *null* | *null* | *null* | | |

|  |
| --- |
| **[4]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all mode case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_MODE ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 300 | | |

|  |
| --- |
| **[5]**  Calculate the mode of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MODE ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Calculate the mode of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_MODE ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 300 | | '003' | 200 | | |

## See also:

- [MODE](mode.html "MODE")


---

## pql/aggregation/pull-up/pu_product

# PU\_PRODUCT

## Description

Calculates the product of the specified source column for each element in the given target table.

Like the regular [PRODUCT](product.html "PRODUCT") operator, the column can either be an [INT](int.html "INT") or [FLOAT](float.html "FLOAT") column. The data type of the result is the same as the input column data type.

## Syntax

```
PU_PRODUCT ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Calculate the product of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_PRODUCT ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 48000000 | | '002' | 90000 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding product of case table values is smaller than 100000: |
| | Query | | --- | | **Filter**  ``` FILTER PU_PRODUCT ( "companyDetail" , "caseTable"."value" ) < 100000; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '002' | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all accumulated case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_PRODUCT ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 48000000 | | |

|  |
| --- |
| **[4]**  Calculate the product of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_PRODUCT ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 90000 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the product of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_PRODUCT ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 90000 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the product of the values that are larger than 100 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_PRODUCT ( "B" , "C"."VALUE" , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 80000 | | 2 | 100000 | | |

## See also:

- [PRODUCT](product.html "PRODUCT")


---

## pql/aggregation/pull-up/pu_quantile

# PU\_QUANTILE

## Description

Calculates the quantile of the specified source column for each element in the given target table.

Like the regular [QUANTILE](quantile.html "QUANTILE") operator, the column can either be an [INT](int.html "INT"), [FLOAT](float.html "FLOAT") or [DATE](date.html "DATE") column. The data type of the result is the same as the input column data type. The given quantile has to be an expression that results in a constant float number between 0 (same as [PU\_MIN](pu_min.html "PU_MIN")) and 1.0 (same as [PU\_MAX](pu_max.html "PU_MAX")).

**Warning**

This operator supports both exact and approximate calculations. By default, calculations are exact to ensure precision and compliance with the SOC 1 (Service Organization Control) standard. However, we recommend using approximate calculations whenever possible, as they provide significant performance gains with minimal impact on accuracy. To enable this mode, use the `APPROX` keyword.

## Syntax

```
PU_QUANTILE ( [APPROX|EXACT] target_table, source_table.column, quantile [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **quantile**: Quantile expression that results in a constant [FLOAT](float.html "FLOAT") value between 0.0 and 1.0 (both inclusive).
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist. The quantile parameter is not allowed to be NULL.

## Examples

|  |
| --- |
| **[1]**  Calculate the 0.5 quantile of the case table values for each company code. This produces the same result as [PU\_MEDIAN](pu_median.html "PU_MEDIAN") since QUANTILE(0.5) == MEDIAN(): |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.5 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 400 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding 0.5 quantile of the case table values is smaller than 300: |
| | Query | | --- | | **Filter**  ``` FILTER PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.5 ) < 300; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all 0.5 quantiles of the case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.5 ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 400 | | |

|  |
| --- |
| **[4]**  Calculate the 0.0 quantile of the case table values for each company code. This produces the same result as [PU\_MIN](pu_min.html "PU_MIN") since QUANTILE(0.0) == MIN(): |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.0 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the 1.0 quantile of the case table values for each company code. This produces the same result as [PU\_MAX](pu_max.html "PU_MAX") since QUANTILE(1.0) == MAX(): |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 1.0 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 600 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Calculate the 0.5 quantile of the case table values for each company code. Only consider cases with an ID larger than 2. This produces the same result as [PU\_MEDIAN](pu_median.html "PU_MEDIAN") since QUANTILE(0.5) == MEDIAN(): |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.5 , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[7]**  Calculate the 0.5 quantile of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. This produces the same result as [PU\_MEDIAN](pu_median.html "PU_MEDIAN") since QUANTILE(0.5) == MEDIAN(): |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.5 , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[8]**  Calculate the 0.25 quantile of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 0.25 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 300 | | '003' | 200 | | |

|  |
| --- |
| **[9]**  Example over three tables: For each entry in table B, calculate the 0.5 quantile of the values that are larger than 100 in table C. This produces the same result as [PU\_MEDIAN](pu_median.html "PU_MEDIAN") since QUANTILE(0.5) == MEDIAN(): Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_QUANTILE ( "B" , "C"."VALUE" , 0.5 , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 400 | | 2 | 500 | | |

|  |
| --- |
| **[10]**  Calculate the 0.5 quantile of the case table values using a division as the quantile parameter: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_QUANTILE ( "companyDetail" , "caseTable"."value" , 50 / 100 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 400 | | '002' | 300 | | '003' | 200 | | |

## See also:

- [QUANTILE](quantile.html "QUANTILE")


---

## pql/aggregation/pull-up/pu_stdev

# PU\_STDEV

## Description

Calculates the standard deviation of the specified source column per each group of samples per group in the given target table. The standard deviation is using the "n-1" method. Standard deviation can be applied to [INT](int.html "INT") or [FLOAT](float.html "FLOAT") columns.

## Syntax

```
PU_STDEV ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  This example shows a calculation of the standard variance of the values from the "Table"."values" column per row of table "Country". If we have a table of countries (DE, FR, US) and values in a corresponding table, standard variances are calculated for all samples in the corresponding table belonging to one country, i.e. standard variance for all samples belonging to DE, standard variance for US, and so on. |
| | Query | | --- | | **Column1**  ``` "Country"."name" ```  **Column2**  ``` PU_STDEV ( Country , "Table"."values" ) ``` | |
| | Input | Output | | --- | --- | | **Country**  | name : string | | --- | | 'DE' | | 'FR' | | 'US' |    **Table**  | country : string | values : float | | --- | --- | | 'US' | 10.0 | | 'DE' | 40.0 | | 'DE' | 50.0 | | 'FR' | 50.0 | | 'US' | 20.0 | | 'US' | 30.0 |        **Foreign Keys**  |  |  | | --- | --- | | Country.name | Table.country | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | 'DE' | 7.071 | | 'FR' | 0.0 | | 'US' | 10.0 | | |

|  |
| --- |
| **[2]**  This example shows a calculation of the standard variance with null values, grouped by country. |
| | Query | | --- | | **Column1**  ``` "Country"."name" ```  **Column2**  ``` PU_STDEV ( Country , "Table"."values" ) ``` | |
| | Input | Output | | --- | --- | | **Country**  | name : string | | --- | | 'DE' | | 'FR' | | 'US' |    **Table**  | country : string | values : float | | --- | --- | | 'DE' | 10.0 | | 'DE' | *null* | | 'DE' | 20.0 | | 'FR' | *null* | | 'FR' | *null* | | 'US' | 10.0 | | 'US' | 20.0 | | 'US' | 30.0 |        **Foreign Keys**  |  |  | | --- | --- | | Country.name | Table.country | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | 'DE' | 7.071 | | 'FR' | *null* | | 'US' | 10.0 | | |

|  |
| --- |
| **[3]**  This example shows a calculation of the standard variance of the values from the "Table"."values" column per row of table "Country", but only consider the cases values are greater than 15. |
| | Query | | --- | | **Column1**  ``` "Country"."name" ```  **Column2**  ``` PU_STDEV ( Country , "Table"."values" , "Table"."values" > 15 ) ``` | |
| | Input | Output | | --- | --- | | **Country**  | name : string | | --- | | 'DE' | | 'FR' | | 'US' |    **Table**  | country : string | values : float | | --- | --- | | 'US' | 10.0 | | 'DE' | 10.0 | | 'DE' | 20.0 | | 'FR' | 14.0 | | 'DE' | 50.0 | | 'FR' | 50.0 | | 'US' | 15.0 | | 'DE' | 5.0 | | 'US' | 20.0 | | 'FR' | 16.0 | | 'US' | 30.0 |        **Foreign Keys**  |  |  | | --- | --- | | Country.name | Table.country | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | 'DE' | 21.213 | | 'FR' | 24.041 | | 'US' | 7.071 | | |

|  |
| --- |
| **[4]**  PU-functions can be used in a FILTER. In this example, the company codes are filtered such that the corresponding standard variance of case table value is greater than 150. |
| | Query | | --- | | **Filter**  ``` FILTER PU_STDEV ( "companyDetail" , "caseTable"."value" ) > 150; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : float  | caseId : int | companyCode : string | value : float | | --- | --- | --- | | 1 | '001' | 600.0 | | 2 | '001' | 400.0 | | 3 | '001' | 200.0 | | 4 | '002' | 300.0 | | 5 | '002' | 300.0 | | 6 | '003' | 200.0 |   | caseId : int | companyCode : string | value : float | | --- | --- | --- | | 1 | '001' | 600.0 | | 2 | '001' | 400.0 | | 3 | '001' | 200.0 | | 4 | '002' | 300.0 | | 5 | '002' | 300.0 | | 6 | '003' | 200.0 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '001' | | |

## See also:

- [STDEV](stdev.html "STDEV")


---

## pql/aggregation/pull-up/pu_string_agg

# PU\_STRING\_AGG

## Description

The PU\_STRING\_AGG operator returns the concatenation of strings from the specified source column for each element in the given target table. The delimiter will be always inserted between the concatenation of the strings. Multiple `order by` expressions can be used in order to determine the order of the concatenation.

The PU\_STRING\_AGG function can only be applied to [STRING](string.html "STRING")s.

## Syntax

```
PU_STRING_AGG ( target_table, source_table.column, delimiter [, filter_expression ] [, ORDER BY source_table.column [ASC|DESC] ] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **delimiter**: A delimiter [STRING](string.html "STRING") what should be used to separate the strings in the result.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.
- **ORDER BY** (optional): Elements of the specified column are used to determine the order in which the strings should be concatenated in the result. After the column, ASC (for ascending direction) or DESC (descending direction) can be specified. If the order direction is not specified, the ascending (ASC) order is used.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  Aggregate the activity column per case. |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG ( "caseTable" , "activityTable"."activity" , ' - ' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date  | caseId : string | activity : string | timestamp : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 15:00:00.000 | | '2' | 'C' | Fri Jan 04 2019 03:00:00.000 | | '2' | 'D' | Sat Jan 05 2019 05:00:00.000 |   | caseId : string | activity : string | timestamp : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 15:00:00.000 | | '2' | 'C' | Fri Jan 04 2019 03:00:00.000 | | '2' | 'D' | Sat Jan 05 2019 05:00:00.000 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'A - B' | | 'C - D' | | |

|  |
| --- |
| **[2]**  Aggregate the activity column per casewith respect to the ascending sorted order of value 2 and the descending sorted order of value 1. |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG ( "caseTable" , "activityTable"."activity" , ' | ' , ORDER BY "activityTable"."value2" ASC , "activityTable"."value1" DESC ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date - value1 : int - value2 : int  | caseId : string | activity : string | timestamp : date | value1 : int | value2 : int | | --- | --- | --- | --- | --- | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 7 | 10 | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 31 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 62 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 12 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 14 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 3 | 9 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 31 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 15 | 9 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 4 | 21 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 8 | 32 |   | caseId : string | activity : string | timestamp : date | value1 : int | value2 : int | | --- | --- | --- | --- | --- | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 7 | 10 | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 31 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 62 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 12 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 14 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 3 | 9 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 31 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 15 | 9 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 4 | 21 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 8 | 32 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'B | A' | | 'F | D | E | C | G' | | 'X | Y | Z' | | |

|  |
| --- |
| **[3]**  Aggregate the activity column per case with respect to the ascending sorted order of value while only the activities which have a value between 10 and 30 are concatenated. |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG ( "caseTable" , "activityTable"."activity" , ' | ' , "activityTable"."value" BETWEEN 10 AND 30 , ORDER BY "activityTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date - value : int  | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 17 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 21 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |   | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 17 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 21 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'B | A' | | 'F | C | G' | | 'Y' | | |

|  |
| --- |
| **[4]**  Aggregate the activities per case where `country` is not 'FR' while the aggregation of the activities happens with respect to the ascending order of the `eventtimes` from the `activityTable` |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG ( "companyDetail" , "activityTable"."activity" , ',' , "companyDetail"."country" <> 'FR' , ORDER BY "activityTable"."eventtime" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'B' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:46:40.000 | | 2 | 'A' | Thu Dec 31 2015 22:30:00.000 | | 2 | 'E' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'F' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 3 | 'A' | Fri Jan 01 2016 03:46:40.000 | | 3 | 'H' | Fri Jan 01 2016 06:33:20.000 | | 4 | 'A' | Thu Dec 31 2015 22:15:00.000 | | 5 | 'A' | Thu Dec 31 2015 22:16:40.000 | | 5 | 'B' | Thu Dec 31 2015 22:18:20.000 | | 5 | 'C' | Thu Dec 31 2015 22:20:00.000 | | 6 | 'A' | Thu Dec 31 2015 22:14:10.000 | | 7 | 'A' | Fri Jan 01 2016 17:40:00.000 | | 8 | 'A' | Fri Jan 01 2016 20:26:40.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'B' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:46:40.000 | | 2 | 'A' | Thu Dec 31 2015 22:30:00.000 | | 2 | 'E' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'F' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 3 | 'A' | Fri Jan 01 2016 03:46:40.000 | | 3 | 'H' | Fri Jan 01 2016 06:33:20.000 | | 4 | 'A' | Thu Dec 31 2015 22:15:00.000 | | 5 | 'A' | Thu Dec 31 2015 22:16:40.000 | | 5 | 'B' | Thu Dec 31 2015 22:18:20.000 | | 5 | 'C' | Thu Dec 31 2015 22:20:00.000 | | 6 | 'A' | Thu Dec 31 2015 22:14:10.000 | | 7 | 'A' | Fri Jan 01 2016 17:40:00.000 | | 8 | 'A' | Fri Jan 01 2016 20:26:40.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' | | 3 | 'UK' | | 4 | 'DE' | | 5 | 'US' | | 6 | 'FR' | | 7 | 'DE' | | 8 | 'US' |    **companyResource**  | caseId : int | resource : int | | --- | --- | | 1 | 500 | | 2 | 400 | | 3 | 100 | | 4 | -400 | | 5 | 50 | | 6 | 0 | | 7 | 10 | | 8 | 5000 |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | companyResource.caseId | activityTable.caseId | | **Result**  | Column1 : string | | --- | | 'A,B,C' | | 'A,E,F,G' | | 'A,H' | | 'A' | | 'A,B,C' | | *null* | | 'A' | | 'A' | | |

|  |
| --- |
| **[5]**  You can use [INDEX\_ORDER](index_order.html "INDEX_ORDER") to aggregate only distinct values. This example calculates the distinct currencies involved in each case. |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG ( "caseTable" , "activityTable"."currency" , '-' , INDEX_ORDER ( "activityTable"."currency" , PARTITION BY ( "caseTable"."caseId" , "activityTable"."currency" ) ) = 1 ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - timestamp : date - currency : string  | caseId : int | activity : string | timestamp : date | currency : string | | --- | --- | --- | --- | | 1 | 'A' | Sat Jan 04 2020 22:00:00.000 | 'EUR' | | 1 | 'B' | Sun Jan 05 2020 22:00:00.000 | 'USD' | | 1 | 'C' | Mon Jan 06 2020 22:00:00.000 | 'EUR' | | 1 | 'B' | Tue Jan 07 2020 22:00:00.000 | 'EUR' | | 2 | 'A' | Wed Jan 08 2020 22:00:00.000 | 'USD' | | 2 | 'B' | Thu Jan 09 2020 22:00:00.000 | 'USD' |   | caseId : int | activity : string | timestamp : date | currency : string | | --- | --- | --- | --- | | 1 | 'A' | Sat Jan 04 2020 22:00:00.000 | 'EUR' | | 1 | 'B' | Sun Jan 05 2020 22:00:00.000 | 'USD' | | 1 | 'C' | Mon Jan 06 2020 22:00:00.000 | 'EUR' | | 1 | 'B' | Tue Jan 07 2020 22:00:00.000 | 'EUR' | | 2 | 'A' | Wed Jan 08 2020 22:00:00.000 | 'USD' | | 2 | 'B' | Thu Jan 09 2020 22:00:00.000 | 'USD' |    **caseTable**  | caseId : int | values : int | | --- | --- | | 1 | 100 | | 2 | 200 |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'EUR-USD' | | 'USD' | | |

## See also:

- [CONCAT](concat.html "CONCAT")
- [VARIANT](variant.html "VARIANT")
- [STRING\_AGG](string_agg.html "STRING_AGG")


---

## pql/aggregation/pull-up/pu_string_agg_distinct

# PU\_STRING\_AGG\_DISTINCT

## Description

The `STRING_AGG DISTINCT` operator returns the concatenation of distinct strings from the specified source column for each element in a group. The delimiter is inserted between the concatenated strings. Multiple `ORDER BY` expressions can be used to specify the concatenation order.

The `STRING_AGG DISTINCT` function can only be applied to [STRING](string.html "STRING") columns.

## Syntax

```
PU_STRING_AGG_DISTINCT ( target_table, source_table.column, delimiter [, filter_expression ] [, ORDER BY source_table.column [ASC|DESC] ] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
  - Currently [TIMELINE\_TABLE](timeline_column---timeline_table.html "TIMELINE_COLUMN - TIMELINE_TABLE") is not supported.
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **delimiter**: A delimiter [STRING](string.html "STRING") what should be used to separate the strings in the result.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.
- **ORDER BY** (optional): Elements of the specified column are used to determine the order in which the strings should be concatenated in the result. After the column, ASC (for ascending direction) or DESC (descending direction) can be specified. If the order direction is not specified, the ascending (ASC) order is used.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]** |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG_DISTINCT ( "caseTable" , "activityTable"."activity" , ' - ' ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date - value : int  | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '1' | 'B' | Mon Jan 06 2020 00:00:00.000 | 14 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 37 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'X' | Wed Jan 08 2020 01:00:00.000 | 18 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |   | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '1' | 'B' | Mon Jan 06 2020 00:00:00.000 | 14 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 37 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'X' | Wed Jan 08 2020 01:00:00.000 | 18 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'A - B' | | 'C - D' | | |

|  |
| --- |
| **[2]** |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG_DISTINCT ( "caseTable" , "activityTable"."activity" , ' | ' , ORDER BY "activityTable"."value2" ASC , "activityTable"."value1" DESC ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date - value1 : int - value2 : int  | caseId : string | activity : string | timestamp : date | value1 : int | value2 : int | | --- | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 31 | 15 | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 33 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 62 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 12 | 19 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 17 | 8 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 14 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 3 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 15 | 9 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 4 | 21 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 31 | 9 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 7 | 10 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 8 | 32 |   | caseId : string | activity : string | timestamp : date | value1 : int | value2 : int | | --- | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 31 | 15 | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 33 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 62 | 12 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 12 | 19 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 17 | 8 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 14 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 3 | 9 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 15 | 9 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 4 | 21 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 31 | 9 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 7 | 10 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 8 | 32 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'B | A' | | 'C | F | D | E | G' | | 'X | Y | Z' | | |

|  |
| --- |
| **[3]** |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG_DISTINCT ( "caseTable" , "activityTable"."activity" , ' | ' , "activityTable"."value" BETWEEN 10 AND 30 , ORDER BY "activityTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : string - activity : string - timestamp : date - value : int  | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '1' | 'B' | Mon Jan 06 2020 00:00:00.000 | 14 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 14 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 17 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 21 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'X' | Wed Jan 08 2020 01:00:00.000 | 18 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |   | caseId : string | activity : string | timestamp : date | value : int | | --- | --- | --- | --- | | '1' | 'A' | Sat Jan 04 2020 22:00:00.000 | 15 | | '1' | 'B' | Sun Jan 05 2020 23:00:00.000 | 12 | | '1' | 'B' | Mon Jan 06 2020 00:00:00.000 | 14 | | '2' | 'C' | Mon Jan 06 2020 12:00:00.000 | 19 | | '2' | 'D' | Mon Jan 06 2020 14:00:00.000 | 34 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 9 | | '2' | 'E' | Mon Jan 06 2020 20:00:00.000 | 14 | | '2' | 'F' | Wed Jan 08 2020 08:00:00.000 | 17 | | '2' | 'G' | Wed Jan 08 2020 10:00:00.000 | 21 | | '3' | 'Y' | Thu Jan 02 2020 12:00:00.000 | 10 | | '3' | 'X' | Tue Jan 07 2020 01:00:00.000 | 9 | | '3' | 'X' | Wed Jan 08 2020 01:00:00.000 | 18 | | '3' | 'Z' | Thu Jan 09 2020 12:00:00.000 | 32 |    **caseTable**  | caseId : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | activityTable.caseId | caseTable.caseId | | **Result**  | Column1 : string | | --- | | 'B | A' | | 'E | F | C | G' | | 'Y | X' | | |

|  |
| --- |
| **[4]** |
| | Query | | --- | | **Column1**  ``` PU_STRING_AGG_DISTINCT ( "companyDetail" , "activityTable"."activity" , ',' , "companyDetail"."country" <> 'FR' , ORDER BY "activityTable"."eventtime" ) ``` | |
| | Input | Output | | --- | --- | | **activityTable**  Filter  - caseId : int - activity : string - eventtime : date  | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'B' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:46:40.000 | | 2 | 'A' | Thu Dec 31 2015 22:30:00.000 | | 2 | 'E' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'F' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 3 | 'A' | Fri Jan 01 2016 03:46:40.000 | | 3 | 'H' | Fri Jan 01 2016 06:33:20.000 | | 4 | 'A' | Thu Dec 31 2015 22:15:00.000 | | 5 | 'A' | Thu Dec 31 2015 22:16:40.000 | | 5 | 'B' | Thu Dec 31 2015 22:18:20.000 | | 5 | 'C' | Thu Dec 31 2015 22:20:00.000 | | 6 | 'A' | Thu Dec 31 2015 22:14:10.000 | | 7 | 'A' | Fri Jan 01 2016 17:40:00.000 | | 8 | 'A' | Fri Jan 01 2016 20:26:40.000 |   | caseId : int | activity : string | eventtime : date | | --- | --- | --- | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'A' | Thu Dec 31 2015 22:13:20.000 | | 1 | 'B' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:46:40.000 | | 2 | 'A' | Thu Dec 31 2015 22:30:00.000 | | 2 | 'E' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'F' | Thu Dec 31 2015 22:46:40.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 2 | 'G' | Thu Dec 31 2015 23:03:20.000 | | 3 | 'A' | Fri Jan 01 2016 03:46:40.000 | | 3 | 'H' | Fri Jan 01 2016 06:33:20.000 | | 4 | 'A' | Thu Dec 31 2015 22:15:00.000 | | 5 | 'A' | Thu Dec 31 2015 22:16:40.000 | | 5 | 'B' | Thu Dec 31 2015 22:18:20.000 | | 5 | 'C' | Thu Dec 31 2015 22:20:00.000 | | 6 | 'A' | Thu Dec 31 2015 22:14:10.000 | | 7 | 'A' | Fri Jan 01 2016 17:40:00.000 | | 8 | 'A' | Fri Jan 01 2016 20:26:40.000 |    **companyDetail**  | caseId : int | country : string | | --- | --- | | 1 | 'DE' | | 2 | 'DE' | | 3 | 'UK' | | 4 | 'DE' | | 5 | 'US' | | 6 | 'FR' | | 7 | 'DE' | | 8 | 'US' |    **companyResource**  | caseId : int | resource : int | | --- | --- | | 1 | 500 | | 2 | 400 | | 3 | 100 | | 4 | -400 | | 5 | 50 | | 6 | 0 | | 7 | 10 | | 8 | 5000 |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.caseId | activityTable.caseId | | companyResource.caseId | activityTable.caseId | | **Result**  | Column1 : string | | --- | | 'A,B,C' | | 'A,E,F,G' | | 'A,H' | | 'A' | | 'A,B,C' | | *null* | | 'A' | | 'A' | | |

## See also:

- [STRING\_AGG DISTINCT](string_agg-distinct.html "STRING_AGG DISTINCT")


---

## pql/aggregation/pull-up/pu_sum

# PU\_SUM

## Description

Calculates the sum of the specified source column for each element in the given target table.

Like the regular [SUM](sum.html "SUM") operator, the column can either be an [INT](int.html "INT") or [FLOAT](float.html "FLOAT") column. The data type of the result is the same as the input column data type.

## Syntax

```
PU_SUM ( target_table, source_table.column [, filter_expression] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Use Cases

- `PU_SUM` can be used for [Revenue per Country](examples-and-use-cases.html "Examples and Use Cases").

## Examples

|  |
| --- |
| **[1]**  Calculate the sum of the case table values for each company code: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_SUM ( "companyDetail" , "caseTable"."value" ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 1200 | | '002' | 600 | | '003' | 200 | | |

|  |
| --- |
| **[2]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding sum of case table values is smaller than 800: |
| | Query | | --- | | **Filter**  ``` FILTER PU_SUM ( "companyDetail" , "caseTable"."value" ) < 800; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '002' | | '003' | | |

|  |
| --- |
| **[3]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all accumulated case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_SUM ( "companyDetail" , "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : int | | --- | | 1200 | | |

|  |
| --- |
| **[4]**  Calculate the sum of the case table values for each company code. Only consider cases with an ID larger than 2: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_SUM ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 2 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | 200 | | '002' | 600 | | '003' | 200 | | |

|  |
| --- |
| **[5]**  Calculate the sum of the case table values for each company code. Only consider cases with an ID larger than 3. All case table values for companyCode '001' are filtered out, which means that in this case, NULL is returned. |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_SUM ( "companyDetail" , "caseTable"."value" , "caseTable"."caseID" > 3 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '001' | *null* | | '002' | 600 | | '003' | 200 | | |

|  |
| --- |
| **[6]**  Example over three tables: For each entry in table B, calculate the sum of the values that are larger than 100 in table C. Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_SUM ( "B" , "C"."VALUE" , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : int | | --- | --- | | 1 | 600 | | 2 | 700 | | |

## See also:

- [SUM](sum.html "SUM")


---

## pql/aggregation/pull-up/pu_trimmed_mean

# PU\_TRIMMED\_MEAN

## Description

Calculates the trimmed mean of the specified source column for each element in the given target table.

Like the regular [TRIMMED\_MEAN](trimmed_mean.html "TRIMMED_MEAN") operator, the column can either be an [INT](int.html "INT") or [FLOAT](float.html "FLOAT") column. The data type of the result is always a [FLOAT](float.html "FLOAT") column.

Lower and upper cutoff get rounded to the next smaller whole row number for the specified source column (e.g. Trimmed mean over a source column with 42 rows and a lower & upper cutoff of 10% will result in the cut of the upper & lower 4 rows). By default 5% of the lower and upper values are cut off.

If the number of cut upper & lower rows is greater or equal to the number of rows in the source column, trimmed mean returns 0.

The values of the specified source column are sorted in descending order before the cutoffs are applied.

## Syntax

```
PU_TRIMMED_MEAN ( target_table, source_table.column [, lower_cutoff [, upper_cutoff ] ] [, filter_expression ] )
```

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **lower\_cutoff** (optional): [INT](int.html "INT") between 0 and 100.
- **upper\_cutoff** (optional): [INT](int.html "INT") between 0 and 100.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), NULL will be returned. NULL values in the source table column are treated as if the row does not exist.

## Examples

|  |
| --- |
| **[1]**  A simple example that mimics the example shown for the standard [TRIMMED\_MEAN](trimmed_mean.html "TRIMMED_MEAN") operator. The values equals or above 100 and equals or below -100 are cut off. The mean is calculated over the values 1, 2, 3 and 4. |
| | Query | | --- | | **Column1**  ``` PU_TRIMMED_MEAN ( CONSTANT ( ) , "Table1"."Value" , 30 , 30 ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | Value : int | | --- | | 102 | | 101 | | 100 | | 4 | | 3 | | 2 | | 1 | | -100 | | -101 | | -102 | | **Result**  | Column1 : float | | --- | | 2.5 | | |

|  |
| --- |
| **[2]**  Calculate the trimmed mean of the case table values for each company code with the lower cutoff & upper cutoff set to 20%: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_TRIMMED_MEAN ( "companyDetail" , "caseTable"."value" , 20 , 20 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | '001' | 450.0 | | '002' | 375.0 | | '003' | 200.0 | | |

|  |
| --- |
| **[3]**  PU-functions can be used in a [FILTER](filter.html "FILTER"). In this example, the company codes are filtered such that the corresponding trimmed mean with an upper cutoff of 20% of the case table values is smaller than 300: |
| | Query | | --- | | **Filter**  ``` FILTER PU_TRIMMED_MEAN ( "companyDetail" , "caseTable"."value" , 0 , 20 ) < 300; ```  **Column1**  ``` "companyDetail"."companyCode" ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | | --- | | '003' | | |

|  |
| --- |
| **[4]**  PU-functions can be used inside another [aggregation function](aggregation.html "Aggregation"). In this example, the [maximum](max.html "MAX") value of all trimmed means with an upper cutoff of 20% of the case table values for each company code is calculated: |
| | Query | | --- | | **Column1**  ``` MAX ( PU_TRIMMED_MEAN ( "companyDetail" , "caseTable"."value" , 0 , 20 ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : float | | --- | | 400.0 | | |

|  |
| --- |
| **[5]**  Calculate the trimmed mean with a lower & upper cutoff of 20% of the case table values for each company code. Only consider cases with an ID smaller or equal to 10. In this example, NULL is returned for companyCode '003' because the number of cases after filtering is 0: |
| | Query | | --- | | **Column1**  ``` "companyDetail"."companyCode" ```  **Column2**  ``` PU_TRIMMED_MEAN ( "companyDetail" , "caseTable"."value" , 20 , 20 , "caseTable"."caseID" <= 10 ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : string | Column2 : float | | --- | --- | | '001' | 450.0 | | '002' | 300.0 | | '003' | *null* | | |

|  |
| --- |
| **[6]**  Example where CONSTANT() is passed as the first argument instead of a regular table from the Data Model or DOMAIN\_TABLE. The result is an aggregate and can be used together with other aggregate values. Here, the result of the PU\_TRIMMED\_MEAN operator is added to the result of the SUM operator: |
| | Query | | --- | | **Column1**  ``` ADD ( PU_TRIMMED_MEAN ( CONSTANT ( ) , "caseTable"."value" , 20 , 20 ) , SUM ( "caseTable"."value" ) ) ``` | |
| | Input | Output | | --- | --- | | **caseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | *null* | | 4 | '001' | 500 | | 5 | '001' | 200 | | 6 | '001' | 300 | | 7 | '001' | *null* | | 8 | '001' | 600 | | 9 | '002' | 300 | | 10 | '002' | 300 | | 11 | '002' | 500 | | 12 | '002' | 100 | | 13 | '002' | *null* | | 14 | '002' | 400 | | 15 | '002' | 500 | | 16 | '003' | 200 | | 17 | '003' | 400 | | 18 | '003' | 100 | | 19 | '003' | 100 | | 20 | '003' | *null* |    **companyDetail**  | companyCode : string | country : string | | --- | --- | | '001' | 'DE' | | '002' | 'DE' | | '003' | 'US' |        **Foreign Keys**  |  |  | | --- | --- | | companyDetail.companyCode | caseTable.companyCode | | **Result**  | Column1 : float | | --- | | 5850.0 | | |

|  |
| --- |
| **[7]**  Example over three tables: For each entry in table B, calculate the trimmed mean with default lower & upper cutoffs of 5% of the values that are larger than 100 in table C. In this case, a lower & upper cutoff of 5% is rounded to 0 rows, which produces the same result as [PU\_AVG](pu_avg.html "PU_AVG"). Tables B and C do not have a direct connection, but are connected via table A: |
| | Query | | --- | | **Column1**  ``` "B"."B_KEY" ```  **Column2**  ``` PU_TRIMMED_MEAN ( "B" , "C"."VALUE" , "C"."VALUE" > 100 ) ``` | |
| | Input | Output | | --- | --- | | **A**  Filter  - B\_KEY : int - C\_KEY : string - VALUE : int  | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |   | B\_KEY : int | C\_KEY : string | VALUE : int | | --- | --- | --- | | 1 | 'A' | 100 | | 1 | 'B' | 200 | | 2 | 'C' | 300 | | 2 | 'D' | 400 | | 3 | 'E' | 500 | | 3 | 'F' | 600 |    **B**  | B\_KEY : int | | --- | | 1 | | 2 |    **C**  | C\_KEY : string | VALUE : int | | --- | --- | | 'A' | 400 | | 'A' | 100 | | 'A' | 200 | | 'B' | 100 | | 'C' | 200 | | 'D' | 500 |        **Foreign Keys**  |  |  | | --- | --- | | A.C\_KEY | C.C\_KEY | | B.B\_KEY | A.B\_KEY | | **Result**  | Column1 : int | Column2 : float | | --- | --- | | 1 | 300.0 | | 2 | 350.0 | | |

## See also:

- [TRIMMED\_MEAN](trimmed_mean.html "TRIMMED_MEAN")


---

## pql/aggregation/pull-up-aggregation

# Pull Up Aggregation

## Description

The Pull-Up-functions allow you to aggregate a column based on another table. You can define the target table to which the entries of a column from another table are pulled, and you can explicitly define on which basis calculations are executed.

Pull-Up-functions are used to achieve nested aggregations and filters on aggregations. Both cannot be done by standard aggregations. Celonis deliberately does not support nested standard aggregations in order to avoid subqueries which would significantly increase the language complexity. Applying filters on [standard aggregations](standard-aggregation.html "Standard Aggregation") is not supported because the resulting filters would not be stable, as explained in [filters](filter.html "FILTER").

The Pull-Up-functions support nested aggregations and filters on aggregations by applying filters differently than the [standard aggregations](standard-aggregation.html "Standard Aggregation"). Standard aggregations take the current filter state into account and recalculate their result every time a filter changes. In contrast to that the Pull-Up-functions ignore the global filter state and are calculated only once. Actually Pull-Up-functions dynamically extend a data model. Therefore the result of a Pull-Up-function can be used like a column of a table. For example it can be used as an input for another aggregation or as basis for a filter.

Filter expressions can be defined to specify which values should be taken into account for the aggregation.

A **1:N** relationship between the target table and the table of the specified source column is required.

For a **1:N:1** relationship, the [BIND](bind.html "BIND") operator can be used in PU-functions. It binds the values of the right table to the middle table, hence these values can be used then. An example can be found in the [BIND](bind.html "BIND") documentation.

## Syntax

```
PU_X ( target_table, source_table.column [, filter_expression] )
```

- [PU\_AVG](pu_avg.html "PU_AVG")
- [PU\_COUNT\_DISTINCT](pu_count_distinct.html "PU_COUNT_DISTINCT")
- [PU\_COUNT](pu_count.html "PU_COUNT")
- [PU\_SUM](pu_sum.html "PU_SUM")
- [PU\_PRODUCT](pu_product.html "PU_PRODUCT")
- [PU\_MAX](pu_max.html "PU_MAX")
- [PU\_MEDIAN](pu_median.html "PU_MEDIAN")
- [PU\_MODE](pu_mode.html "PU_MODE")
- [PU\_MIN](pu_min.html "PU_MIN")
- [PU\_STDEV](pu_stdev.html "PU_STDEV")

```
PU_X ( target_table, source_table.column [, filter_expression] [, ORDER BY source_table.column] )
```

- [PU\_FIRST](pu_first.html "PU_FIRST")
- [PU\_LAST](pu_last.html "PU_LAST")

```
PU_QUANTILE ( target_table, source_table.column, quantile [, filter_expression] )
```

- [PU\_QUANTILE](pu_quantile.html "PU_QUANTILE")

```
PU_TRIMMED_MEAN ( target_table, source_table.column [, lower_cutoff [, upper_cutoff ] ] [, filter_expression ] )
```

- [PU\_TRIMMED\_MEAN](pu_trimmed_mean.html "PU_TRIMMED_MEAN")

```
PU_STRING_AGG ( target_table, source_table.column, delimiter [, filter_expression] [, ORDER BY source_table.column [ASC|DESC] ] )
```

- [PU\_STRING\_AGG](pu_string_agg.html "PU_STRING_AGG")

The following arguments can be passed to all PU-functions:

- **target\_table**: The table to which the aggregation result should be pulled. This can be:

  - a table from the data model. It needs to be, directly or indirectly, connected to the *source\_table*, and there must be a 1:N relationship between the *target\_table* and the *source\_table*. Further documentation about join relationships can be found in [Join functionality](join-functionality.html "Join functionality").
  - [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE") or [CONSTANT](constant.html "CONSTANT") (see [Pull Up Aggregation Table Options](pull-up-aggregation---table-options.html "Pull Up Aggregation - Table Options")).
- **source\_table.column**: The column which should be aggregated for every row of the *target\_table*.
- **filter\_expression** (optional): An optional filter expression to specify which values of the *source\_table.column* should be taken into account for the aggregation.

## Filter behavior

The way PU-functions handle filters is different compared to the standard aggregation. In contrast to the standard aggregation, PU-functions ignore filters, meaning that if a filter or a selection is changed, the result of the PU-function is not recalculated. Another difference to the standard aggregation is that it is possible to filter on the result of a PU-function.

PU-functions can be made [FILTER](filter.html "FILTER")-aware by using [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL") inside the input column. In that case, however, it is not possible anymore to filter on the result of the PU-function. Please also read the documentation of [FILTER\_TO\_NULL](filter_to_null.html "FILTER_TO_NULL") about further possible side effects when using that functionality.

## NULL handling

If no value in the source table column exists for the element in the target table (either because all values of the source table are filtered out, or because no corresponding value exists in the first place), 0 ([PU\_COUNT](pu_count.html "PU_COUNT"), [PU\_COUNT\_DISTINCT](pu_count_distinct.html "PU_COUNT_DISTINCT")) or NULL (all other PU-functions) will be returned. NULL values in the source table column are treated as if the row does not exist.

## See also:

- [Comparison Operators](comparison-operators-3327154.html "Comparison Operators")
- [Standard Aggregation](standard-aggregation.html "Standard Aggregation")


---

## pql/aggregation/pull-up-aggregation---table-options

# Pull Up Aggregation - Table Options

## Description

Besides using a table from the data model as a target table inside a PU-function, generated tables can be passed.

In the first argument of every PU-function, a target table needs to be specified, which is the table to which the aggregated values are pulled. This target table can be a table from the data model, or it can be one of the following two special table options:

- [CONSTANT](constant.html "CONSTANT"): Aggregates all values of a column to one single value, without any grouping.
- [DOMAIN\_TABLE](domain_table.html "DOMAIN_TABLE"): Creates a temporary table from various column(s). For example, this can be used if values of a column should be aggregated based on a column of the same table.


---

## pql/aggregation/standard-aggregation

# Standard Aggregation

## Description

Standard aggregation functions group input rows together and calculate a single value for each group.

Which rows are aggregated into a single value is defined by the grouper columns. Every column within one query that is not an aggregation is a grouper column. If no grouper is defined, all values are aggregated into one group.

The fact that grouper columns are defined implicitly is a main difference to SQL. While all other aggregation behavior sticks to SQL, PQL aggregations have no 'GROUP BY' clause.

Aggregations take filters and selections into account. Values which are filtered out are not part of the result. Therefore, if a filter or a selection is changed, every aggregation is recalculated.

## Implicit Joining

Please be aware that [implicit joining](join-functionality.html "Join functionality") of all the columns in the aggregation query is done before the actual aggregations are performed.

## Example

|  |
| --- |
| **[1]**  This is an example for a standard aggregation. Column1 is the grouper column. The distinct values of "Table1.Country" define the groups in the result. COUNT("Table1"."Values") in Column2 defines how the values of each group are aggregated. Here, all rows in one group are counted. |
| | Query | | --- | | **Column1**  ``` "Table1"."Country" ```  **Column2**  ``` COUNT ( "Table1"."Values" ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  | Country : string | Values : int | | --- | --- | | 'US' | 3 | | 'DE' | 10 | | 'DE' | 5 | | 'FR' | 5 | | 'US' | 4 | | 'US' | 3 | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | 'DE' | 2 | | 'FR' | 1 | | 'US' | 3 | | |


---

## pql/aggregation/window-aggregation

# Window Aggregation

## Description

Window functions calculate an aggregate value based on a range of neighboring rows.

- [Moving Aggregation Functions](moving-aggregation.html "Moving Aggregation") calculate a value across a range of neighboring rows. A range of neighboring rows used for the calculation of a moving operator result is called window.
- [RUNNING\_TOTAL](running_total.html "RUNNING_TOTAL") sums up all entries of a given column and returns all intermediate sums.


---

