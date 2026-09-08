# Data Modeling & OCPM

## data-modeling/celosql/celosql-language-reference

# CeloSQL Language Reference

CeloSQL is a specialized SQL dialect used for object-centric data transformations. It acts as the bridge between user-defined logic and high-performance engine execution, allowing you to build complex models without worrying about the underlying infrastructure.

Currently, CeloSQL is exclusively supported within the Objects and Events UI to define your transformation logic. The CeloSQL syntax is loosely based on Vertica SQL. This provides a familiar environment for those who regularly work with standard analytical SQL and minimizes the learning curve to start data modeling.

The most powerful aspect of CeloSQL is its portability. During the publishing and deployment phases, the system automatically transpiles your code to match the requirements of the underlying data infrastructure. CeloSQL handles this translation seamlessly, ensuring your logic is optimized for all supported execution environments. Crucially, CeloSQL is designed for functional parity, ensuring consistent results across all supported processing layers.

For detailed information on supported syntax and logic, refer to the following:

- [Data Types and Literals](data-types.html "Data Types")
- [Operators](operators.html "Operators")
- [Functions](functions.html "Functions")


---

## data-modeling/ocpm/creating-ids-for-objects-and-events

# Creating IDs for objects and events

Unique IDs are required for all objects and events to ensure the accuracy of metrics and KPIs. To prevent perspective load failures, verify that no duplicate IDs exist within an event type before selecting **Load Data Model** in the data pool.

In your transformations, the best practice to create the ID is to concatenate the name of the object type or event type with the primary key field (or fields) from the source data, and use the result as the ID. Use single quotes around the name of the object type or event type to identify it as a string. For example:

```
'Report_' || "Report ID" AS "ID"
```

When concatenating IDs, it is recommended that you use delimiters such as “::” to enable better parsing of that data. For example:

```
SELECT <%=sourceSystem%> || '::' || "EKKO"."MANDT" || '::' || "EKKO"."EBELN"
   AS "ID",
```

The query engine uses object and event IDs for partitioning. To optimize performance during data retrieval, your IDs should be meaningful and include expressions found in other columns and tables. That helps the query engine relate the columns to each other in order to produce more specific partitions. If the source system data uses random UUIDs in the ID column, you should avoid using that column by itself and instead create a new ID column by concatenating it with columns that are present in other tables too.

**Important**

Though meaningful IDs produce useful partitions, try to keep the overall length of the ID as short as you can - don’t include every possible expression. The ID length has a performance impact for running transformations, not only for creating the objects and events themselves, but also when the ID is used as a foreign key in relationship columns and tables for other objects and events.

If you’re using data from more than one source system to create objects and events, you might have duplicated identifiers across the source systems. You can handle this by concatenating a unique name or identifier for each source system instance as part of your event ID. The Celonis catalog transformations use a local parameter `sourceSystem`, the value of which is prepended to the ID for an object type or event type, for example:

```
SELECT <%=sourceSystem%> || 'Contract_' || "EKKO"."MANDT" || "EKKO"."EBELN"
  AS "ID",
```

If you have multiple copies of the Celonis catalog transformations for the same process for different source system connections, set the `sourceSystem` parameter to a unique name for each source system instance. For custom transformations, you can do the same thing with your IDs, either using a local parameter or hard-coding a source system name.

**Important**

Though the source system names need to be unique, remember to keep the names you use as short as possible, to minimize the overall length of the ID string. You don't need to use the full name of the system - a single letter will do as long as it's different.

You might still see duplicate IDs if you have either of these situations:

- Duplicate records in the source system data.
- Including the same data in more than one way.

Including the same data in more than one way can happen if, for example:

- You include the same source system data set in two different sets of pre-transformed data, and use them both in transformations to create events.
- You take data for an attribute of an object type from a different data table, and inadvertently create duplicates during the join - maybe by populating the attribute from the row level data rather than the header data.

Situations like this create a representation of the same real event more than once in the system. This isn't correct, and you should change the setup of your transformations so it doesn't happen - for example, by adding a filter condition.

## Related topics

- [Running transformations](running-transformation-data-jobs.html "Running transformation data jobs")
- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Transformations](troubleshooting-transformations.html "Troubleshooting transformations")


---

## data-modeling/ocpm/data-modeling-assistant-for-objects-and-events

# Model with AI in Objects and Events

**This feature is currently available as a Private Preview only**

During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.

If you would like to use this feature, create a Support ticket at [Celonis Support](https://support.celonis.com/).

For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types")

The AI-powered Celonis Assistant in the Objects and Events module recommends a set of objects and events and the associated attributes and relationships based on your intended use case and the available data. The Celonis Assistant builds an initial model that you can conversationally refine by using the chat to explain what you do or don’t need in the model. You can also upload files and other examples to help explain to the Celonis Assistant what you need in your data model and then allow the Celonis Assistant to build it for you.

Expand all

[## Creating the initial model](#UUID-8d10cbbd-4927-5ebc-2862-25c5c73a980d_section-id235257628678727_body)

To create the initial model for your team:

1. To access the Celonis Assistant, click the **Celonis Assistant** button on the menu and then use the dropdown at the bottom to select "Model with AI".
2. Use the chat feature to describe your request or use case in the prompt field in the chat window on the left. Click the icon to upload any attachments such as diagrams or process flows that help describe what you need in your model.

   |  |
   | --- |
   |  |
3. Click **Submit**. The Celonis Assistant will build the initial model based on your inputs. For each build, the Celonis Assistant will indicate the number of objects and events created for this model.

The Celonis Assistant will create an initial model that serves as the starting point for your OCDM model. You can then continue using the chat functionality to adjust the recommended data model by adding, removing, or configuring the objects and events in the initial model.

[## Refining the model and publishing](#UUID-8d10cbbd-4927-5ebc-2862-25c5c73a980d_section-id235257630118678_body)

The initial model from the Celonis Assistant is a starting template, not a finished product. Using the chat functionality, you can refine it by adding context, modifying or removing objects and events, and introducing new ones as needed. This lets you incrementally shape the model by describing your requirements to the Celonis Assistant rather than building it from scratch.

Each time you submit a message to the Celonis Assistant with more information, the model will be regenerated based on your request. The explanation of the current model will be updated in the chat to explain what objects and events are included, the associated attributes, and a description of the primary relationships in the model.

**Note**

You will still be able to view previous iterations of the model in the chat and return to those configurations if a change doesn’t have the expected result by clicking the **Switch to this result** button.

|  |
| --- |
|  |

Once you are satisfied with the configuration of your model, you can add the  currently displayed model directly into your environment by clicking the **Build result** button. If you revert to a previous version of the model and then click the **Build result** button, that previous version you selected will be built into your environment.

## Related topics

- [Modeling objects and events](modeling-objects-and-events.html "Modeling objects and events")
- [Object and Event IDs](creating-ids-for-objects-and-events.html "Creating IDs for objects and events")
- [Objects and Events](troubleshooting-for-modeling-objects-and-events.html "Troubleshooting for modeling objects and events")


---

## data-modeling/ocpm/modeling-objects-and-events

# Modeling objects and events

Object-centric modeling is the foundation of how Celonis understands and analyzes processes. By modeling **objects** (like orders, invoices, or deliveries) and **events** (the activities that happen to them over time), you give the Celonis Platform the structure it needs to uncover process flows, dependencies, and performance insights across your data.

Whether you’re just getting started or refining an existing model, the topics below will help you understand the core ideas and put them into practice:

## Objects

Objects represent real-world business entities that participate in processes, such as orders, invoices, customers, deliveries, or employees. Objects form the structural backbone of object-centric process mining (OCPM) by defining what a process acts on. Each object belongs to an object type, which defines how the object is uniquely identified, which attributes describe it, and how it relates to events and other objects. When you create an object type and populate it through transformations, Celonis creates one object instance for each unique object ID found in the source data.

To learn more about creating and modeling objects, see: [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types").

## Events

Events represent actions related to business entities, such as orders being created, invoices paid, or deliveries shipped. Events form the chronological backbone of process mining by capturing what happens and when. Each event belongs to an event type, which defines its identifier, attributes, and links to objects and other events. Celonis creates one event instance for each unique row in the source data.

To learn more about creating and modeling events, see: [Events](creating-and-importing-events.html "Creating and importing events")

## Transformations

Custom transformations take your extracted business data and map it into Celonis so that objects, events, and relationships can be used in analyses. They can include scripts for object and event attributes, many-to-many relationships, and (for objects only) changes to object attributes over time. These transformations ensure that your extracted business data is structured correctly so Celonis features and analyses can use it effectively.

To learn more about creating and running transformations, see: [Transformations](creating-custom-transformations.html "Creating custom transformations").

## Perspectives

A perspective is a way to look at your process data from a specific angle. It shows which object types (for example, Purchase Orders or Vendors), event types (such as Order Created or Invoice Paid), and the relationships between them are included in the analysis. Perspectives help you focus on the part of the process that matters for your question, without changing the underlying data model. This makes it easier to analyze complex processes that involve multiple objects.

To learn more about creating and using perspectives, see: [Perspectives](using-objects-and-events-for-process-mining.html "Creating and extending perspectives").


---

## data-modeling/ocpm/object-centric-process-mining

# Objects and Events

**Objects and Events** provide the foundation for object-centric process mining in the Celonis Platform. They allow you to model and analyze how multiple business entities interact across processes, without forcing data into a single, linear case structure.

When working with **Objects and Events**, the following content is available:

## Getting started with Object-Centric Process Mining

This section includes:

- Understanding the difference between object-centric and case-centric process mining.
- Learning the key concepts involved with object-centric process mining.
- Configuring core processes

For more information, see: [Getting started](object-centric-process-mining-overview.html "Getting started with object-centric process mining").

## Quickstart: Extract and transform your data into objects and events

While you can configure your own object-centric data model (OCDM), the quickest way to start modeling objects and events is to use the Celonis provided core processes. These core processes provide you with the object types, event types, relationships, and perspectives for your chosen process. You can then use these assets to view your Process Intelligence Graph and then create content using Celonis Platform features such as Studio.

To learn more, see: [Quickstart: Extract and transform your data into objects and events](quickstart--extract-and-transform-your-data-into-objects-and-events.html "Quickstart: Extract and transform your data into objects and events").

## Modeling objects and events

Understand how to create objects and events, configure perspectives, and version and deploy your object-centric data models.

For more information, see: [Modeling objects and events](modeling-objects-and-events.html "Modeling objects and events").

## Troubleshooting

These topics provide troubleshooting tips and best practices for building object-centric data models. They cover the most common scenarios you’ll encounter and explains how to navigate them efficiently.

- [Data extraction and pre-processing](troubleshooting-data-extraction-and-pre-processing.html "Troubleshooting data extraction and pre-processing")
- [Objects and Events](troubleshooting-for-modeling-objects-and-events.html "Troubleshooting for modeling objects and events")
- [Transformations](troubleshooting-transformations.html "Troubleshooting transformations")
- [Perspectives](troubleshooting-perspectives.html "Troubleshooting perspectives")
- [Views and Analyses](troubleshooting-views-and-analyses.html "Troubleshooting Views and Analyses")

## Service and data permissions

Access to **Objects and Events** depends on your role and data pool permissions. Analysts and Admins can work with Objects and Events, while Members interact with applications and assets built on published perspectives.

To learn more about permissions, see: [Service permissions](data-permissions-for-object-centric-process-mining.html "Object-centric process mining service permissions").


---

## data-modeling/ocpm/object-centric-process-mining-database-tables

# Object-centric process mining database tables

The OCDM Schema is the underlying database structure for your Object-Centric Process Mining (OCPM) Data Pool.

While this reference details the specific tables within the schema, you typically won't need to interact with them directly. You can easily create, update, and manage all tables using our visual editors, which handle the complex database mapping for you.

Each table name is made up of these components:

- One or more letter prefixes that show what type of table this is.
- The namespace for the table's content. `celonis` is for object types, event types, and relationships from the Celonis catalog, and `custom` is for object types, event types, and relationships that you've created. Apps can have their own namespaces for app-specific object types, event types, and relationships, such as `DuplicateInvoiceChecker` for the Duplicate Invoice Checker app.
- The name of the object type, event type, or relationship that the table holds data for. Relationship tables are only used for many-to-many relationships (m:n). The data for one-to-many relationships (1:m and m:1) is stored in a column in the table for the object type or event type.
- For an object type that's embedded in a perspective, a suffix of a double underscore followed by the name of the relationship that the object type was embedded with (for example, `__approver`).

[Object-centric process mining table prefixes](object-centric-process-mining-database-tables.html#UUID-e154f2b9-f69e-819f-0fbb-a9991e85eada_table-idm1643368834744390 "Table 19. Object-centric process mining table prefixes") lists the possible letter prefixes for table names. They can be combined with each other to give a complete description of the table. For example:

- `c_o` at the start of a table name means it's a table of changes (`c`) to objects of the specified type (`o`).
- `t_r_o` at the start of a table name means it's a table of object to object relationships (`r_o`) , and it's in the development environment (`t`).

**Note**

Tables in the parallel database for the development environment have the extra prefix `t_`. When you write transformations, don't include the `t_` prefix - we'll rewrite the transformation to add it if it's for the development environment. Where we do include a table with a `t_` prefix in a data job, don't alter or remove it from the transformation.

Filter

- Table
- Table name prefix
- Row contains

Table 19. Object-centric process mining table prefixes

| Table | Table name prefix | Row contains |
| --- | --- | --- |
| Object type | o\_ | One object and the current values of its attributes |
| Event type | e\_ | One event and the current values of its attributes |
| Object to object relationship table | r\_o\_ | One relationship between two objects |
| Event to object relationship table | r\_e\_ | One relationship between one event and one object |
| Change table | c\_ | One change to one row of the table that makes up the rest of the table name (such as an object type table) |
| Table in test schema | t\_ | The normal contents of the named table, but it's in the development environment, not the production environment |
| Extension table | x\_ | Only visible in limited contexts |

| Table | Table name prefix | Row contains |
| --- | --- | --- |
| Object type | o\_ | One object and the current values of its attributes |
| Event type | e\_ | One event and the current values of its attributes |
| Object to object relationship table | r\_o\_ | One relationship between two objects |
| Event to object relationship table | r\_e\_ | One relationship between one event and one object |
| Change table | c\_ | One change to one row of the table that makes up the rest of the table name (such as an object type table) |
| Table in test schema | t\_ | The normal contents of the named table, but it's in the development environment, not the production environment |
| Extension table | x\_ | Only visible in limited contexts |




## CELONIS\_CALENDAR table

The CELONIS\_CALENDAR table replaces the functionality provided by the Vertica-specific operator TIMESERIES, which is not supported for object-centric process mining. The table contains dates in the range 1 January 1980 to 31 December 2030, which you can use for time series analytics. For example, here’s how to generate this date interval starting from 2017-01-01 and ending on 2017-01-05:

```
Date
2017-01-01 00:00:00
2017-01-02 00:00:00
2017-01-03 00:00:00
2017-01-04 00:00:00
2017-01-05 00:00:00
```

The SQL statements to do this with TIMESERIES would be:

```
WITH "TimeSlice" AS 
(
   SELECT CAST('2017-01-01 00:00:00' AS TIMESTAMP) AS "TS" --StartDate
   UNION
   SELECT CAST('2017-01-05 00:00:00' AS TIMESTAMP) AS "TS" --EndDate
)
SELECT "Date" 
FROM "TimeSlice"
TIMESERIES "Date" AS '1 DAY' OVER (ORDER BY "TS")
```

With the CELONIS\_CALENDAR table, you’d use these statements:

```
SELECT CAST("Date" AS TIMESTAMP)
FROM "CELONIS_CALENDAR" 
WHERE "Date" >='2017-01-01' AND DATE <='2017-01-05'
ORDER BY "Date"
```

For each date in the range, the CELONIS\_CALENDAR table includes the attributes Date (date), Year (integer), Quarter (integer), Month (integer), Week (integer), Day (integer), DayOfWeek (integer), IsWeekend (boolean), FirstDayOfMonth (date), LastDayOfMonth (date), FirstDayOfWeek (date), LastDayOfWeek (date), DayName (varchar), and MonthName (varchar).

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/object-centric-process-mining-overview

# Getting started with object-centric process mining

Object-centric process mining (OCPM) analyzes how multiple business objects (such as orders, invoices, deliveries, and payments) interact over time. Unlike traditional case-centric mining, events are not forced into a single case. Instead, events are linked to the objects they affect, giving you a complete and realistic view of how processes actually run.

Object-centric process mining helps you:

- Understand complex, interconnected processes.
- Analyze processes from multiple perspectives (order, invoice, supplier, customer).
- Avoid data duplication and misleading results caused by case definitions.
- Discover bottlenecks, rework, and dependencies that case-centric models miss.

If your process involves many-to-many relationships (for example, one order with multiple invoices or deliveries), object-centric mining is the right approach.

Expand all

[## Difference between case-centric process mining and object-centric process mining](#UUID-4434c62b-42cd-ad52-01fa-f07b872eeea0_section-id235356172548693_body)

Case-centric process mining follows a single “thread” of events, whereas object-centric process mining connects events to all relevant objects, giving a realistic view of how processes actually work.

- **Case-centric**: Case-centric process mining examines a process from the viewpoint of a single case, such as one order or one invoice. Each event belongs to only one case, making it easy to analyze simple, linear processes, however, it can miss complexity when multiple objects interact.

  For example, one case is one linear chain of events:

  |  |
  | --- |
  |  |
- **Object-centric:** Whereas object-centric process mining looks at processes across multiple connected objects, like orders, invoices, deliveries, and payments. Events can link to several objects at once, giving a more complete picture of real-world processes with many interactions.

  The example object-centric version shows two invoices for the same order because, in real business processes, this happens frequently. Reasons for this could include, an order being partially invoiced, items billed at different times, corrections or additional charges resulting in multiple invoices, and different deliveries from the same order invoiced separately.

  |  |
  | --- |
  |  |

[## Key concepts involved with OCPM](#UUID-4434c62b-42cd-ad52-01fa-f07b872eeea0_section-id235355985477977_body)

Before working with OCPM, we recommend understanding the key concepts involved:

- **Objects**: These are the key business entities you work with, such as Orders, Invoices, Customers, or Suppliers. They exist over time and often connect to many other objects. In object-centric process mining, they serve as anchors that help you understand how work flows through your business.
- **Events**: Actions or state changes that happen to one or more objects, such as Invoice Created, Order Shipped, or Payment Received. Each event has a timestamp and can link to multiple objects at once, capturing real-world interactions without duplicating events across cases.
- **Relationships**: Connections between objects that show how they are related, for example, which invoices belong to an order or which deliveries fulfill it. These links are critical for understanding dependencies, handovers, and many-to-many interactions, forming the foundation for meaningful object-centric analysis.

Example of an object in the Celonis Platform:

Example of an event in the Celonis Platform:

To learn more about objects, events, and relationships see: [Objects, events, and relationships](objects-events.html "Objects, events, and relationships")

- **Object-centric data model (OCDM)**: A structure that combines objects, events, and relationships into a single framework. Celonis provides a prebuilt model with commonly used object and event types to help you get started quickly, ensuring consistency and enabling reusable analytics across processes.

  To learn more about the object-centric data model, see: [Object-centric data model (OCDM)](ocdm.html "Object-centric data model (OCDM)").
- **Perspectives**: Views that determine which objects, events, and relationships are relevant for a specific process or analysis. They let you examine the same data from different angles, such as order-centric, invoice-centric, or supplier-centric, guiding how Celonis applications visualize and analyze processes.

  To learn more about perspectives, see: [Perspectives and event logs](perspectives.html "Perspectives and event logs").

An example of a duplicate invoice checker in the Celonis Platform:

[## Configuring your OCDM using Celonis core processes](#UUID-4434c62b-42cd-ad52-01fa-f07b872eeea0_section-id235356083312571_body)

While you can configure your own object-centric data model (OCDM), the quickest way to start modeling objects and events is to use the Celonis provided core processes. These core processes provide you with the object types, event types, relationships, and perspectives for your chosen process. You can then use these assets to view your Process Intelligence Graph and then create content using Celonis Platform features such as Studio.

The following core processes can be enabled for your team:

- Accounts payable
- Accounts receivable
- Inventory management
- Order management
- Procurement

To learn more about using these core processes, see: [Quickstart: Extract and transform your data into objects and events](quickstart--extract-and-transform-your-data-into-objects-and-events.html "Quickstart: Extract and transform your data into objects and events").


---

## data-modeling/ocpm/ocdm

# Object-centric data model (OCDM)

An object-centric data model in the Celonis platform represents business processes by modeling all relevant business objects and their relationships in a single, unified structure. Instead of focusing on a single case notion, such as an order or a ticket, the object-centric model captures multiple interconnected objects (for example, orders, deliveries, invoices, and payments) and their events. This approach enables a more realistic and complete view of complex, end-to-end processes, supporting deeper analysis, transparency, and more accurate insights across the process landscape.

An example of the graph view of an object-centric data model:

## Viewing the object-centric data model

Within **Objects and Events**, you can view your object-centric data model in the following ways:

Expand all

[### Graph view](#UUID-55ca16a0-6b35-91c8-30c2-dbd7c1cee8f8_section-id235356454351015_body)

The graph view is a visual representation of your object-centric data model. It shows object types as nodes and relationships as lines, making it easier to understand how objects and events are connected across your processes.

To access the graph view from the dashboard, click **View Graph**:

|  |
| --- |
|  |

When viewing the graph, you have the following features:

- **Navigation tools**: The Graph view displays object types as nodes and their relationships as lines. You can pan by dragging the gray background and zoom using the controls at the bottom of the model. Drag objects to reposition them, or click **Auto align** to restore the optimized layout.

  |  |
  | --- |
  |  |
- **Search**: Search for any object type or event type and see its details.

  |  |
  | --- |
  |  |
- **Filters**: Select **Add a filter** to create your own combination of filters by namespace (Celonis or custom), tags, or object types. You can only have one active filter of each kind.
- **Presets**: Presets make it easy to switch between different process views without manually reapplying filters. Click **+ Save** to

[### List view](#UUID-55ca16a0-6b35-91c8-30c2-dbd7c1cee8f8_section-id23535645445101_body)

The object-centric data model can also be viewed as a list of objects and events, accessed by clicking either **Objects** or **Events** from the dashboard:

When viewing the list, you have the following features:

- **Search**: Search for any object type or event type and see its details.

  |  |
  | --- |
  |  |
- **Filter**: Select an existing category and filter to narrow down the list of objects or events. Click **+** to add your own custom filter category.

  |  |
  | --- |
  |  |
- **Sort**: Sort the list of objects and events based on alphabetical, creation date, or date last modified.

  |  |
  | --- |
  |  |
- **View in Graph**: Click **View in Graph** to view that object or event in the graph view of the OCDM.

  |  |
  | --- |
  |  |

## Comparing the object-centric data model to a case-centric data model

When considering if an object-centric data model makes sense for your use cases, consider the following:

Filter

- Feature
- Object-centric data model
- Case-centric data model

| Feature | Object-centric data model | Case-centric data model |
| --- | --- | --- |
| Core concept | Multiple business objects interact in one process, giving you a network of connected object lifecycles. | One case ID represents the process instance, showing you a single, linear flow. |
| Data structure | - Multiple object tables - One or more event tables - Events can be linked to multiple objects - Object-to-object relationships preserved | - One event table - One case ID - Events belong to exactly one case - Other entities are flattened into attributes |
| Handling complexity | - **1-to-many relationships**: Supported. - **Many-to-many relationships**: Supported. - **Rework / partial flows**: Supported. - **Parallel activities**: Supported. | - **1-to-many relationships**: Not supported, the relationships are flattened or duplicated. - **Many-to-many relationships**: Not supported. - **Rework / partial flows**: Results are distorted. - **Parallel activities**: While supported, they're difficult to model effectively. |
| Data quality and accuracy | Using object-centric data models has some of the following data quality advantages:  - No duplication - Real timestamps - True process paths - Accurate KPIs (lead time, rework, automation) | When using case-centric data models, you may experience some of the following data quality issues:  - Event duplication - Artificial event ordering - Inflated lead times - Incorrect conformance results |

| Feature | Object-centric data model | Case-centric data model |
| --- | --- | --- |
| Core concept | Multiple business objects interact in one process, giving you a network of connected object lifecycles. | One case ID represents the process instance, showing you a single, linear flow. |
| Data structure | - Multiple object tables - One or more event tables - Events can be linked to multiple objects - Object-to-object relationships preserved | - One event table - One case ID - Events belong to exactly one case - Other entities are flattened into attributes |
| Handling complexity | - **1-to-many relationships**: Supported. - **Many-to-many relationships**: Supported. - **Rework / partial flows**: Supported. - **Parallel activities**: Supported. | - **1-to-many relationships**: Not supported, the relationships are flattened or duplicated. - **Many-to-many relationships**: Not supported. - **Rework / partial flows**: Results are distorted. - **Parallel activities**: While supported, they're difficult to model effectively. |
| Data quality and accuracy | Using object-centric data models has some of the following data quality advantages:  - No duplication - Real timestamps - True process paths - Accurate KPIs (lead time, rework, automation) | When using case-centric data models, you may experience some of the following data quality issues:  - Event duplication - Artificial event ordering - Inflated lead times - Incorrect conformance results |

## Related topics

- [Modeling objects and events](modeling-objects-and-events.html "Modeling objects and events")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/ocpm-perspective

# OCPM Perspective

## Description

This section describes the main components of an object centric process mining (OCPM) based perspective. The object-centric process mining perspectives will be the successors of data models to leverage the advantages which are offered by using a holistic model which contains all business objects, event types and the information about how these are related to each other. In the new OCPM environment, you create perspectives by selecting the objects, events and relationships you want to work with. A detailed description of perspectives including their concept and the documentation of the required tasks can be found [here](https://docs.celonis.com/en/perspectives.html). The focus of this document is to describe the components of the perspectives, to describe the differences between OCPM perspectives and (case-centric) data models and to demonstrate with some examples the consequences of using different projections when the perspective was defined.

## Benefits of OCPM perspectives

There are numerous benefits to customers when using OCPM based perspectives like simplified transformations, dynamic perspectives, incremental expansion of additional tables and attributes (instead of duplicating existing data models). As discussed very intensely in the scientific community, perspectives also address the common problem of event divergence (when duplicating the header-based events on the item level) or event convergence (when event information is lost because e.g. schedule-line based event information needs to be attached to item-level cases). With object-centric process mining, events are related to objects instead of to a single case, making it possible to fully view complex and interacting processes from any angle.

More information can be found in the [Object-centric process mining overview section](https://docs.celonis.com/en/object-centric-process-mining-overview.html) of the documentation.

## Components of OCPM

The following section provides a technical description of what is being automatically generated after the user completed modeling the [objects and events](https://docs.celonis.com/en/objects-and-events.html) as well as the [relationships](https://docs.celonis.com/en/relationships-between-objects-and-events.html) between these. The idea is to provide users who are used to working with the case-centric data model editor the key changes after the introduction of object-centric process mining modeling. The layer in which these tables are defined is hidden to the user. Consequently, the user can only define object and event tables as well as information about how these items are related to each other. The generated tables in the backend can be classified into the following categories:

- **object tables**: The object tables list all instances of existing objects. The only required column is the unique object `ID` column. The objects can be e.g. customers, sales order, sales order items or invoices. Additionally, attribute columns can provide additional information about each object instance (like prices for materials, currencies for customers, addresses for vendors). Please note that the object tables cannot be marked as case tables as before, since there is no case concept in OCPM models anymore. Instead, objects are defined and contribute individually to the perspective of the respective business process.
- **event type tables**: This table lists all instances of independent events for one event type. The listed events are identified by an unique `ID` and a timestamp column. Additional attribute columns are also possible to add additional information about the event instance.
- **relation tables**: events can either be connected directly to the respective objects or via mapping tables. The idea behind the relation tables is the fact that events are often not only directly bound to one object (former: one case), but there exist many relations between events and objects. The creation of a delivery item is e.g. highly relevant for the delivery (item) objects (otherwise the item would not exist), but in order to calculate e.g. an open order ratio, a link between the create delivery item event table and the sales order item table is necessary which is provided by the relation table. Since there is very often not a 1:1 relation between sales order items and delivery items given, the mapping table provides the necessary information about how objects and events are connected. There is a distinction between object-to-object relationship tables and object-to-event relationship tables, but the functionality remains the same.
- **change tables**: Object changes are stored in so-called change tables which are directly joined to object tables.

## Structure of new OCPM perspective

One of the main advantages in Object centric process mining is the fact that events (former activities) are not directly linked to a respective case table. As in real life business processes, events can be bound to several objects and need to be stored independently from objects as long as possible.

It depends on the actual use-case, context and on the business process how events need to be handled and how to calculate KPIs on them. As an example, delivery creation events can either be interesting from the logistics perspective (how many delivery items have been created, what amount of effort was required), especially, if more than one delivery was required for a sales order item. On the other hand, from an order management perspective, the exact number of created deliveries is irrelevant but what counts is just if the order item was completely delivered.

## Differences between Data Models and OCPM perspectives

The most important difference between data models and perspectives is the fact that

- **Activity Tables are split up in event type tables**: The former activity tables will be split up in event type tables: For each distinct activity name, there will be a new event type table. Therefore, since the former activity column would entail redundant information, the event table will be named after the respective activity name. The new tables will be called event\_type tables. The syntax is as follows: `e_<namespace>_<EventName>`.
- **event\_type table joins**: Event type tables can be either directly joined to object tables or they can be connected using a relation table. Since each event can be relevant to various objects, relationship tables (also called mapping tables) can be used to store this information about how the event types and the objects are connected.
- **no user access to event-type and relationship tables**: In OCPM perspectives, not all tables will be visible and accessible to users. The event-type tables and relationship tables will be hidden from the user and only accessible through the [CREATE\_EVENTLOG](create_eventlog.html "CREATE_EVENTLOG") operator. The main idea behind this is the fact that all events only make sense in the context of the lead objects which they are connected to. In case event instances which are not linked to any object will not be accessible and cannot be considered in any event count operation.

The following figures summarize the differences between the two data models. In Fig.1 tables can be classified as activity or case tables and need to be connected via their join relationship. Every table defined in the data model can be accessed via PQL queries directly from the frontend components.

In contrast to data model definitions, object-centric perspectives are defined as a subset of centrally defined objects, events and their relations. The automatically generated tables can be classified in object tables, event tables and relationship tables. Event and relationship tables are hidden tables and cannot be accessed directly with PQL queries in the frontend. Instead, accessing the event tables is only possible by defining a lead object which is the starting point of a user's perspective and by using the [CREATE\_EVENTLOG](create_eventlog.html "CREATE_EVENTLOG") operator. By using this operator, there is no limitation of functionalities when accessing the former activity tables: The user can entirely re-build the activity table and use all functionalities and operators which have been available accessing the well known activity tables in data models.

**Fig.1:** EMS 1 data model components including activity tables, case tables and other object tables. All types of tables are configurable and accessible by the users and can be used in PQL statements.

**Fig.2:** When defining and using OCPM perspectives, the relationship tables and event type tables will be created in the data model but not directly be accessible with PQL operators except by using the CREATE\_EVENTLOG operator.

## Examples

In the following example there is a data model defined which consists of a sales order header and item table, a delivery table as well as three event type tables being connected to two relationship tables. The three event types can have sales order header, sales order items or deliveries as lead objects. The examples are intended to demonstrate how the result tables of the [CREATE\_EVENTLOG](create_eventlog.html "CREATE_EVENTLOG") operators change when using different methods to create an eventlog from event tables:

- case-centric data model: Activity table
- object-centric perspective: Using sales order items as leading object
- object-centric perspective: Using delivery items as leading object

### 1. Activity Table in case-centric data models:

The following query (and all wrapping PQL operators) can be used in analyses to access the activity table.

**Fig3.:** The direct table access of `COUNT("_CEL_O2C_ACTIVITIES"."CASE_ID")` in the data models returns a row count of 10:

```
COUNT(CREATE_EVENTLOG ("o_celonis_Sales_Order_Item", INCLUDE [ "e_celonis_Create_Sales_Order", "e_celonis_Create_Sales_Order_Item", "e_celonis_Create_Delivery" ]))
```

### 2. object-centric perspective: Using sales order items as leading object

When using the sales order items as leading objects, the `LEAD_OBJECT_ID` is generated by the [CREATE\_EVENTLOG](create_eventlog.html "CREATE_EVENTLOG") operator from the primary key of the sales order item table.

The result is very similar to the data model example (in which the step of connecting to lead objects is already done in the transformations):

- The number of rows does not change and is still 10.
- The `ACTIVITY` column is auto generated by using the event type table name.
- All other column names originate from the event table column names.

The `ACTIVITY_TABLE.ACTIVITY_COLUMN` statement can be replaced with the [CREATE\_EVENTLOG](create_eventlog.html "CREATE_EVENTLOG") statement to get the same results compared to using an activity table.

### 3. object-centric perspective: Using delivery items as leading object

When using the sales order items as leading objects, the `LEAD_OBJECT_ID` is generated from the primary key of the delivery item table.

```
COUNT(CREATE_EVENTLOG (" o_celonis_Sales_Order_Item ", INCLUDE [ " e_celonis_Create_Sales_Order ", " e_celonis_Create_Sales_Order_Item ", " e_celonis_Create_Delivery " ])."LEAD_OBJECT_ID" ) = 10
```

Since the "create delivery events" are directly connected to the delivery table, the duplication of events (also called divergence) is not necessary anymore. Therefore, the result table has one row missing compared to the other example.

```
COUNT(CREATE_EVENTLOG ("o_celonis_Delivery_Item", INCLUDE [ "e_celonis_Create_Sales_Order", "e_celonis_Create_Sales_Order_Item", "e_celonis_Create_Delivery" ])."LEAD_OBJECT_ID" ) = 9
```


---

## data-modeling/ocpm/perspectives

# Perspectives and event logs

In Object-Centric Process Mining (OCPM), a perspective is a way to look at your process data from a specific angle. It shows which object types (for example, Purchase Orders or Vendors), event types (such as Order Created or Invoice Paid), and the relationships between them are included in the analysis. Perspectives help you focus on the part of the process that matters for your question, without changing the underlying data model. This makes it easier to analyze complex processes that involve multiple objects.

Celonis provides prebuilt perspectives for common business processes, including: Accounts Payable, Accounts Receivable, Inventory Management, Order Management, and Procurement.

When a process is enabled, Celonis automatically applies the corresponding perspective, configuring the required object types, event types, and relationships. These perspectives can be extended by adding additional objects, events, or relationships, or users can create fully custom perspectives using the **Perspective Builder**.

You can also add perspectives to your dashboard when installing an object-centric version of an application. In this example, a duplicate invoice checker perspective is used:

## Key components of perspectives

When creating or using a perspective, you have the following key components:

- **Object types**: These are the entities in your model (for example, Order, Invoice, Customer).

  - You choose which object types to include.
  - One object type is usually your starting point.
  - Included object types can:

    - Have relationships.
    - Have event logs.
    - Be explored further in the graph.
- **Object-to-object relationships**: These define how object types are connected.

  - Only one relationship per object pair can be included.
  - Relationships determine: How objects relate in the graph and how events can be traced across objects.
  - Relationships can be: Included, excluded, replaced by embedded objects.
- **Embedded objects**: These are context-only copies of object types. Embedded objects are used to add context without expanding the graph and break cycles (when object-to-object relationships form a closed loop).

  - Embedded objects: Don’t appear as standalone objects and can’t have event logs or additional relationships.
- **Event logs**: These define the process view of the perspective. Each event log includes:

  - A lead object (Case Key).
  - A set of events.
  - Optional event attributes.
  - One event log must be marked as the default.
- **Graph**: The graph is the visual representation of the perspective. Users interact with the graph to build and validate the perspective. The graph shows:

  - Included objects.
  - Embedded objects.
  - Included relationships.
  - Cycles and disconnected groups.

## Event logs created from perspectives

Some Celonis apps, such as the Supply Chain Network Visibility App and object-centric Starter Kits, work directly with perspectives. Other apps, including Process Explorer, Process Adherence Manager, and case-centric Starter Kits, use event logs that are created from perspectives.

Event logs reorganize the data from a perspective around a single object. They collect all events related to that object and arrange them into a chronological sequence, allowing the app to track the object’s lifecycle from start to end.

When working with event logs:

- Celonis automatically creates one event log per object type in a perspective. These system-generated event logs are prefixed with `el_` and can be used as-is. For more advanced or extended analyses, you can create custom event logs, which are prefixed with `el__`.
- You can choose any object type as the lead object and create multiple event logs for the same object type.
- Event logs allow you to filter and subset events using attributes. Additional details for analysis are available in the `_ActivityDetails` columns.
- For apps or features that require a single default event log, you must create a custom event log and mark it as the default. System-generated event logs cannot be set as the default.
- Event logs populate activity tables in Studio and can be analyzed using views, PQL, or created dynamically with `CREATE_EVENTLOG`.

## Related topics

- [Perspectives](using-objects-and-events-for-process-mining.html "Creating and extending perspectives")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/quickstart--extract-and-transform-your-data-into-objects-and-events

# Quickstart: Extract and transform your data into objects and events

While you can configure your own object-centric data model (OCDM), the quickest way to start modeling objects and events is to use the Celonis provided core processes. These core processes provide you with the object types, event types, relationships, and perspectives for your chosen process. You can then use these assets to view your Process Intelligence Graph and then create content using Celonis Platform features such as Studio.

To use your data for modeling objects and events, you need to create a connection between your data source and the Celonis Platform. The commonly supported connections are:

- **SAP ECC / Oracle EBS**: Celonis supplies prebuilt extractions and transformations for SAP ECC and Oracle EBS systems. These are available by downloading the extraction package from the Celonis Marketplace. For the steps, see: [Quickstart for SAP ECC and Oracle EBS](quickstart--extract-and-transform-your-data-into-objects-and-events.html#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4593366769342433741990233359 "Quickstart for SAP ECC and Oracle EBS").
- **Other source systems**: For other source systems, you can use the supplied extractor or create one with the Extractor Builder. You then import your data tables or upload a sample file, before creating SQL transformations using the editor. For the steps, see: [Quickstart for other source systems](quickstart--extract-and-transform-your-data-into-objects-and-events.html#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4593366870993633742164586904 "Quickstart for other source systems").

Expand all

[## Quickstart for SAP ECC and Oracle EBS](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4593366769342433741990233359_body)

When connecting your SAP ECC or Oracle EBS accounts to the Celonis Platform, follow these steps to start modeling your objects and events:

[### Step 1: Configuring the connection and extracting your data](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-id235292502143543_body)

To start, you need to establish a connection between your source system and the Celonis Platform. Once established, you then need to extract the data that you want to model and then share that data to the object-centric data pool.

1. From the Celonis Marketplace, find the object-centric extractor for your system and click **Get it now**.

   For example, the OCPM Extractions SAP ECC Order Management:

   |  |
   | --- |
   |  |
2. In the install wizard, choose whether you want to install the extractor with or without a Data Connection to the source system, then click **Start installation**.

   - **With a data connection**: The extractor sets up a data pool, connects to the source system, and uses data jobs and schedules to pull the required data from the Celonis catalog. It includes predefined parameters to customize which data to extract for analysis.
   - **Without a data connection**: The installation creates a data pool from which you need to then configure a data connection.

     - For SAP ECC, see: [SAP ECC and S/4 HANA (on-prem + private cloud)](connecting-to-sap-ecc-and-s-4-hana-on-prem-and-private-cloud.html "Connecting to SAP ECC and S/4 HANA (on-prem + private cloud)").
     - For Oracle EBS, see: [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS").

   |  |
   | --- |
   |  |
3. *Optional*: If your objects and events require additional data from any other source systems, add further data connections to them. You can reuse the data jobs that the extractor supplies.
4. Run the data jobs to extract your source system data into the extraction data pool.

   For more information about data jobs, see: [Executing data jobs](executing-data-jobs.html "Executing data jobs").
5. Share the data from the extraction data pool into the the data pool where you’re working with objects and events.

   - From the main menu, click **Data** - **Objects and Events** and then click **Dashboards** - **OCPM Data Pool**. When you do this for the first time, the OCPM Data Pool is created in your team.
   - From the main menu, click **Data - Data Integration** and select your OCPM data pool.

[### Step 2: Enabling core processes](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm460717451864483399094379213_body)

Now that you have access to an OCPM data pool, you need to enable the core processes that you want to work with. To do this:

1. Click **Data - Objects and Events** and select the data pool you want to use.
2. Click **+ Add from catalog**.

   |  |
   | --- |
   |  |
3. Click the name of any of the Celonis processes, such as Procurement, and use the **Enable process** slider to enable it.

   |  |
   | --- |
   |  |

   The Celonis object types, event types, relationships, and perspective for that process are enabled.
4. To add the Celonis transformations, select your data connection from the dropdown and click **Add**.

   For each process, enable either SAP ECC or Oracle EBS transformations—never both on the same connection. If you have multiple source systems, create a separate data connection for each one.

   |  |
   | --- |
   |  |
5. **Optional**: Set the **Source system parameter** to the desired source system:

   **Note**

   The **Source system parameter** is a global configuration parameter. Configuring it will override local parameters within all individual transformations in the process.
6. **Optional**: If your source system lacks some data needed for Celonis objects or events, you can enable **Skip missing data** to let transformations run despite errors.

   - **Missing columns**: Your objects and events will be created with null values in these fields.
   - **Required columns with mismatched data types**: These are automatically converted to the expected format.

   |  |
   | --- |
   |  |
7. You can now create a version of the data model. To do this, click **Data - Objects and Events** and then click **Create version**.

   To learn more about creating versions and deploying them to production, see: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
8. You can now deploy the latest version to production. To do this, click **Deploy** and then follow the wizard.

[### Step 3: Running the extractions and transformations](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4543400398329633742037824475_body)

The final step is to run your extractions and transformations, which pull raw data from your source systems and convert it into a usable format in the Celonis Platform.

To run your extractions and transformations:

1. Click **Data - Data Integration** and select the object-centric data pool you deployed in the previous steps.
2. Click **Data Jobs**, opening the overview of your configured data jobs.

   You should have at least two data jobs listed here (your extraction package's data jobs might have different names to the example):

   - **ocpm-data-job**: This contains the predefined transformations which can be used for productive uses.
   - **test: ocpm-data-job**: This contains transformations which can be used in your development environment and for testing purposes.
3. For each of the data jobs listed, click **Options - Execute Data Jobs**.

   If you’re extracting data from more than one source system, you’ll need to repeat this for each source system.
4. To run the extractions, click **Full Load**, then **Execute Selection**.

   The extractions now run, taking your raw data and transforming it into usable content in the Celonis Platform.

[## Quickstart for other source systems](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4593366870993633742164586904_body)

Use the following steps to extract and transform data from non-SAP ECC or Oracle EBS source systems.

[### Step 1: Extracting your data into an OCPM data pool](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4567261659105633742183401963_body)

To start with, you need to create an object-centric process mining data pool. The method you use here depends on how your Celonis Platform data pools are currently configured:

- **Creating a new data connection**: If your data is not currently in the Celonis Platform or you want to create a data connection just for your objects and events, see: [Connecting data sources](connecting-data-sources.html "Connecting data sources").
- **Copying data from an existing data pool**: If you already have the data in a Celonis Platform data pool, you can copy this into the OCPM data pool. To do this, see: [Sharing data between data pools](sharing-data-between-data-pools.html "Sharing data between data pools").

Once you've established a connection between your source system and the Celonis Platform, you then need to extract your data from it into the data pool. To do this from your data pool diagram:

1. Click **Data Jobs** and then **Add Data Job**.

   |  |
   | --- |
   |  |
2. Name the data job and specify your Data Connection.
3. Select your new data job, and select the Add Tables button to create an extraction task.

   Add the tables that you need from your source system via your Data Connection, and configure any options and filters that you need for your data.

[### Step 2: Enabling core processes](#id528342_body)

Now that you have access to an OCPM data pool, you need to enable the core processes that you want to work with. To do this:

1. Click **Data - Objects and Events** and select the OCPM data pool you want to use.
2. Click **+ Add from catalog**.

   |  |
   | --- |
   |  |
3. Click the name of any of the Celonis processes, such as Procurement, and use the **Enable process** slider to enable it.

   |  |
   | --- |
   |  |

   The Celonis object types, event types, relationships, and perspective for that process are enabled.
4. To add the Celonis transformations, select your data connection from the dropdown and click **Add**.

   For each process, enable either SAP ECC or Oracle EBS transformations—never both on the same connection. If you have multiple source systems, create a separate data connection for each one.

   |  |
   | --- |
   |  |
5. **Optional**: If your source system lacks some data needed for Celonis objects or events, you can enable Skip missing data to let transformations run despite errors.

   |  |
   | --- |
   |  |
6. You can now create a version of the data model. To do this, click **Data - Objects and Events** and then click **Create version**.

   To learn more about creating versions and deploying them to production, see: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
7. You can now deploy the latest version to production. To do this, click **Deploy** and then follow the wizard.

[### Step 3: Creating custom transformations and running extractions](#id528388_body)

The final step is to create your custom transformations and then run your extractions. This pulls raw data from your source systems and convert it into a usable format in the Celonis Platform. To do this:

1. Follow the instructions in [Transformations](creating-custom-transformations.html "Creating custom transformations") to create your own SQL transformations to map your extracted data to the object-centric data model. You’ll need to do this for the Celonis object types and event types in your selected processes, as well as for any custom types that you create.
2. Click **Data - Data Integration** and select the object-centric data pool you deployed in the previous steps.
3. Click **Data Jobs**, opening the overview of your configured data jobs.
4. For each of the data jobs listed, click **Options - Execute Data Jobs**.

   If you’re extracting data from more than one source system, you’ll need to repeat this for each source system.
5. To run the extractions, click **Full Load**, then **Execute Selection**.

   The extractions now run, taking your raw data and transforming it into usable content in the Celonis Platform.
6. Follow the [Suggested steps after extracting your data](quickstart--extract-and-transform-your-data-into-objects-and-events.html#UUID-6073660b-1e61-d04e-7084-aa1b61737569_N1764783270255 "Suggested steps after extracting your data").

[## Suggested steps after extracting your data](#UUID-6073660b-1e61-d04e-7084-aa1b61737569_N1764783270255_body)

- Set up a schedule to run your data pipeline regularly. See: [Scheduling the execution of data jobs](scheduling-the-execution-of-data-jobs.html "Scheduling the execution of data jobs").
- When available, apply updates to the object types and event types that you've installed from the Celonis catalog. See: [Core process catalog](using-the-objects-and-events-catalog.html "Using the Objects and Events catalog").
- Customize and extend the object-centric data model for your business’s specific needs. See: [Extending or editing existing objects and events](creating-custom-object-types-and-custom-event-types.html#UUID-c62f456f-4581-292f-9911-efbaa4411c8b_UUID-74179387-d296-e5c7-9acc-d32f05c68907 "Extending or editing existing objects and events").
- Analyze your business processes using the objects and events you’ve built. See: [Views](creating-views.html "Creating and configuring Views").


---

## data-modeling/ocpm/troubleshooting-for-modeling-objects-and-events

# Troubleshooting for modeling objects and events

When modeling objects and events in the Celonis Platform, you may encounter the following issues:

Expand all

[## No attribute for sorting activities with the same timestamp in case-centric data models](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-9458f838-61d4-f7e6-177f-84abbf91b928_body)

There is currently no built-in sorting feature for events with the same timestamp. You can work around this by creating a partial overwrite of the transformation for the event type, and adding one second to the time recorded for the activity that you want to place later in the sequence.

Use the INTERVAL function to do this, for example:

```
CAST(table.some_column AS TIMESTAMP) + INTERVAL '1' SECOND
```

Don’t use TIMESTAMPADD(), which is not supported for object-centric transformations. With the added second, the activities will be displayed in the expected sequence in Process Explorer.

[## Error message: “An EntityValidationBulkException occurred”](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-555b4236-f26e-6ba5-489a-2ad4af468ca9_body)

The cause of this error message is probably that the object type or event type is still linked to something else in the object-centric data model. An object type or event type needs to be fully separated from any dependencies and links before you can delete it. Here’s the places to check:

- Your perspectives, including event logs and relationships. The object type or event type might still be present in a perspective. For an event type, check any custom event logs.
- Your event types, including relationships and transformations. An object type might still have a relationship to one or more event types, and the table might be used in the transformation to populate an event type.
- Your object types, including relationships and transformations. An object type might still have a relationship to another object type. The transformation for the object type might be used in a transformation for a relationship.

When you try to delete an object with remaining dependencies, the menu now also shows which of these dependencies you have to resolve first.

[## Error message: “Error occurred. Event was not updated”](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-a2fafc4f-f63f-321c-dc7e-6b540bd63d53_body)

You can’t add custom attributes or custom relationships to Celonis event types. If you need to do this, it’s possible to replicate the Celonis event type as a custom event type, and then create the relationship between the object type and the new custom event type. You’ll need to create a custom perspective to incorporate your custom event type.

[## Error message relating to a lock timeout issue or conflict](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-7d2aa55c-46b3-6554-be59-399cb3c68bc0_body)

If you see one of these error messages when you use the Publish operation in the Objects & Events environment, it means that another Publish operation is already running:

- "Lock 'sync-lock-...' was not released within timeout"
- "Conflict Remote application on http://[TeamURL]/ems2-factory-execution/api/internal/ocpm[POST] responded with 409 : Data models permits a single update at a time"

When the previous Publish operation has been completed, the error is automatically resolved and you can use the Publish operation again.

[## Error message: "Failed to publish data models. Validation failed for factory..."](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-0643d63a-d2fa-df4c-a5ac-24edf0cbdcb9_body)

When you use the Publish operation in the Objects & Events environment to publish to development or production, Celonis validates the SQL statements in the transformations you are trying to publish. The error message "Failed to publish data models. Validation failed for factory..." means that a transformation failed this validation. The error message includes a link to the transformation in the SQL editor, so you can fix the errors.

When you preview the transformation script containing the error in the SQL editor, you’ll see a similar error message to the one that you saw during the publishing process.

There are two main categories of errors:

- SQL syntax errors.
- SQL semantics errors.

To fix SQL syntax errors:

- Check your SQL script for syntax errors like spelling mistakes in keywords, for example SELCET instead of SELECT).
- Check for missing or extra commas.
- Check for misspelling of table or column names.

To fix SQL semantic errors:

- Check that all the tables and columns you are referencing exist in the selected data source. If they don’t, see [I have not extracted all the tables that are used in the Celonis transformations](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-9fd7f367-06d4-04dd-abab-7224ca6718ab "Not all tables required by the Celonis transformations were extracted") for guidance on how to handle this.
- Check that all the functions you are using are allowed. If a function is not allowed, the error message will say so. See [Vertica-specific SQL functions aren't supported for object-centric process mining](troubleshooting-transformations.html#UUID-7918cba9-d005-f3d2-2e91-5176e0e7b896_UUID-304b98be-31e1-c05a-8267-65331cba18c1 "Vertica-specific SQL functions aren't supported for object-centric process mining") for guidance on how to handle this.
- Check the data type of the columns in your source system data, and the data type of the object or event attributes they are populating, and make sure they match. If there’s a mismatch, you either need to change the data type for the attribute, or adjust the data type of the source column, as described in [The table names or column data types in my extracted data are different to the SAP standard (for example, because I am extracting it from a Data Lake)](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-394a79f3-440a-8e69-64c4-d9241912bf4b "The table names or column data types in the extracted data differ from the SAP standard").

[## Error message: “Object reference ‘*object name*’ with namespace 'custom' for relationship '*relationship name*' with namespace 'custom' not found.”](#UUID-0d7b83c8-d222-cd80-f9f4-e7d2bfc78593_UUID-899bcc7c-7a64-89a2-fbee-a6f707ddb913_body)

This error message is returned when your customization can’t be validated because  the object-centric data model still contains references to an object type that has been deleted. The error message does not refer to the object that you were editing at the time, because the object-centric data model is validated as a whole when you add a custom item to it.

The object type named in the error message is the one that has been deleted. To resolve the error:

1. Create or re-create a temporary custom object type with the name that was given as the object reference in the error message.
2. Navigate to the object to object relationships of the temporary object type.
3. You should see one or more relationships listed for the temporary object type. Delete them.
4. Now delete the temporary object type.

You should now be able to add the customization that you were trying to add.

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/troubleshooting-object-centric-process-mining

# Troubleshooting object-centric process mining

These topics provide troubleshooting tips and best practices for building object-centric data models. They cover the most common scenarios you’ll encounter and explains how to navigate them efficiently.

- [Data extraction and pre-processing](troubleshooting-data-extraction-and-pre-processing.html "Troubleshooting data extraction and pre-processing")
- [Objects and Events](troubleshooting-for-modeling-objects-and-events.html "Troubleshooting for modeling objects and events")
- [Transformations](troubleshooting-transformations.html "Troubleshooting transformations")
- [Perspectives](troubleshooting-perspectives.html "Troubleshooting perspectives")
- [Views and Analyses](troubleshooting-views-and-analyses.html "Troubleshooting Views and Analyses")

The **Issues to Fix** list on the Objects and Events dashboard highlights any critical issues that need your attention. Click an issue to see details and go straight to where it can be fixed. If there are no critical issues, the dashboard will let you know.


---

## data-modeling/ocpm/troubleshooting-perspectives

# Troubleshooting perspectives

When loading perspectives into a data pool, you may encounter the following issues:

Expand all

[## Error message: “The load failed... Please swap the join relationship in the Datamodel”](#UUID-b419a2a4-63bb-f0bb-2302-8e38707a8d86_UUID-8366ebb9-3077-0184-4de6-5f96e8d34990_body)

For object-centric process mining perspectives, join relationships in the data model are generated automatically from the object relationships in the Process Intelligence Graph. This error usually occurs when there are duplicate keys on the “1” side of the specified join.

**Solution**:

1. Check the records in the object type or event type table referenced in the error message and in the source system data.
2. Remove or handle duplicate keys before loading the data:

   - Filter duplicates during data extraction, or
   - Remove duplicates during pre-processing.

For instructions on pre-processing raw data before transforming it into objects and events, see: [Pre-processing raw data before transforming it into objects and events](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-b0939bf1-a404-8b4d-30cc-7d45cd004908 "Pre-processing raw data before transforming it into objects and events")

[## Error message: “The export failed: There is no column on the table to export for schema … and table …”](#UUID-b419a2a4-63bb-f0bb-2302-8e38707a8d86_UUID-a6eaff42-f16c-7736-8a4e-f2569afbe204_body)

The error usually occurs when the listed tables are empty. Verify that the transformation responsible for creating and populating these tables ran successfully and produced data.

[## Error message: “Could not execute foreign key join: there are duplicates on both sides of the specified key relationship.”](#UUID-b419a2a4-63bb-f0bb-2302-8e38707a8d86_UUID-aa0f4745-91b5-6e7a-3b89-36d0a3e4b32c_body)

This error message names two tables. At least one of these tables should not contain multiple records for the same key - that is, the relationship between these objects should be a 1:n relationship. Follow this procedure to eliminate the duplicates:

1. Identify the object that is the 1 side of the relationship. For that object, run the following code to identify if the unexpected duplicates are present in your source system data:

   ```
   SELECT DISTINCT [The raw columns that constitute your Object ID] AS
   "object_id", COUNT(*) AS "id_count" 
   FROM [The raw tables that constitute your FROM Statement on the object transformation]
   --ANY WHERE STATEMENT ON THE OBJECT TRANSFORMATION     
     GROUP BY object_id      
     HAVING COUNT(*) > 1
   ```

   For example, here’s the code to run for the Customer object:

   ```
   SELECT DISTINCT 'Customer_' || "KNA1"."MANDT" || "KNA1"."KUNNR" AS
   "object_id", COUNT(*) AS "id_count"
   FROM "KNA1"
   GROUP BY "object_id"
   HAVING COUNT(*) > 1
   ```
2. If this query returns any results, investigate those in the source system. You can use filtering during data extraction to remove unwanted duplicate records, or remove the duplicates in pre-processing. [I want to pre-process my raw data before transforming it into objects and events](troubleshooting-data-extraction-and-pre-processing.html#UUID-6e9cc24e-21c0-55e0-3e49-0bf72b2cd935_UUID-b0939bf1-a404-8b4d-30cc-7d45cd004908 "Pre-processing raw data before transforming it into objects and events") explains how to set up a pre-processing stage.
3. If the query returns no results, try to join the main object table and the custom attribute table together and check if that query identifies any duplicates:

   ```
   WITH TMPTABLE AS (
   SELECT [Columns that delineate the ID value] AS "object_id"
   FROM Table)
   SELECT DISTINCT object_id,
   COUNT* AS id_count
   FROM TMPTABLE
   GROUP BY object_id
   HAVING COUNT*> 1
   ```
4. If you find duplicates from this query, the issue is likely that multiple custom attribute values are being generated for an individual object instance. These custom attributes are stored in a separate table named `x_custom_celonis_<ObjectName>` (in production). This separate table is only joined to the main object table during the data model load. This join could potentially also create the duplicates mentioned in the error message. In this case, review the transformation for the custom attribute and eliminate the duplicates.

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/using-objects-and-events-for-process-mining

# Creating and extending perspectives

In Object-Centric Process Mining (OCPM), a perspective is a way to look at your process data from a specific angle. It shows which object types (for example, Purchase Orders or Vendors), event types (such as Order Created or Invoice Paid), and the relationships between them are included in the analysis. Perspectives help you focus on the part of the process that matters for your question, without changing the underlying data model. This makes it easier to analyze complex processes that involve multiple objects.

When a process is enabled, Celonis automatically applies the corresponding perspective, configuring the required object types, event types, and relationships. These perspectives can be extended by adding additional objects, events, or relationships, or users can create fully custom perspectives using the perspective builder.

The following is an example of a checked invoice perspective:

|  |
| --- |
|  |

To learn more about perspectives and their key components, see: [Perspectives and event logs](perspectives.html "Perspectives and event logs").

Expand all

[## Creating custom perspectives](#UUID-645fd144-c37a-0e3b-7009-cafdfe8ee4b0_section-id235401323080447_body)

**Event log creation is moving**

Event log creation in the Perspective Builder is being discontinued and replaced by a more powerful experience in the Knowledge Model. To avoid workflow interruptions, begin using the Knowledge Model going forward.

To start using the event log builder, see: [Event logs (object-centric)](eventlogs-oc.html "Knowledge Model - Event Logs (object-centric)").

To create a custom perspective from the **Object and Events** dashboard:

1. Click **Perspectives**.
2. Click **+ Create Perspective**.

   |  |
   | --- |
   |  |
3. Add a **Perspective name** and click **Create**.

   Perspective names must begin with a letter, and only contain alphanumeric characters.
4. Choose a starting object type from the **Objects** panel (search or browse).

   Selecting an object adds it to the graph and opens its details panel.
5. Use the perspective builder to continue modelling. The best method is to use the graph view to work your way out from your starting object type by exploring the adjacent object types.

   The following features can help you model:

   - **Linking adjacent objects**: After adding an object to the perspective, adjacent objects are automatically suggested. Click + to choose the linking strategy for the relationships between them.

     |  |
     | --- |
     |  |
   - **Embedded objects**: These are context-only copies of object types. Embedded objects are used to add context without expanding the graph and break cycles (when object-to-object relationships form a closed loop). Embedded object don't appear as standalone objects and can’t have event logs or additional relationships.
   - **Object-to-object relationships**: These define how object types are connected.
   - **Excluding / removing objects**: To exclude or remove an object from the perspective, click the Object and then click **Exclude**.

     Excluding an object also:

     - Removes embedded objects.
     - Removes event logs where it is the lead object.
     - Requires updating event logs where it’s referenced.

     |  |
     | --- |
     |  |
   - **View controls**: Choose how the perspective builder responds to your added object and configured relationships.

     |  |
     | --- |
     |  |
6. When you've configured your perspective, click **Save**.

   Your new perspective appears in the list of perspectives in the Perspectives view. If you need to make any further changes to it, select its name and click Edit.
7. To use this perspective, create a version of your object-centric data model and then deploy it to development or production.

   See: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models").

[## Extending perspectives](#UUID-645fd144-c37a-0e3b-7009-cafdfe8ee4b0_section-id235401324986516_body)

You can extend perspectives to tailor analyses to your specific use case by adding custom KPIs, dimensions, filters, and visualizations on top of standard content. Extensions let you adapt out-of-the-box perspectives without changing the underlying data model.

To extend perspectives from the **Objects and Events** dashboard:

1. Click **Perspectives**.
2. For the perspective you want to extend, click **Options - Extend**.
3. Add an extension name and click **Next**.
4. Configure the extension using the same features as outlined in [Creating custom perspectives](using-objects-and-events-for-process-mining.html#UUID-645fd144-c37a-0e3b-7009-cafdfe8ee4b0_section-id235401323080447 "Creating custom perspectives").
5. When you've configured your extended perspective, click **Save**.

   Your extended perspective appears in the list of perspectives in the Perspectives view. If you need to make any further changes to it, select its name and click Edit.
6. To use this perspective, create a version of your object-centric data model and then deploy it to development or production.

   See: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models").

[## Using aliases in perspectives](#UUID-645fd144-c37a-0e3b-7009-cafdfe8ee4b0_section-id235406176349238_body)

**This feature is currently available as a Public Preview only**

During a Public Preview, only eligible customers can access this feature. Additionally, there may be minor updates to the functionality and design of these features when they are released in General Availability.

For more information about our Public Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types").

You can enable and use aliases in your perspectives, allowing you to use your preferred terminology on top of Celonis objects and events. An alias is an alternative name or label you give to something so it’s easier to understand, remember, or use. In Celonis, aliases can be used for:

- Making technical or system-generated names more human-readable.
- Allowing different teams or users at your company to use their own terminology without changing your underlying system.
- Supporting flexibility when the same data or object is used in multiple contexts.

To configure aliases for your perspectives from the **Objects and Events** dashboard:

1. Click **Perspectives**.
2. On the perspective you'd like to use aliases for, click **Options - Enable display names**.
3. Open the perspective, then for any object you want to name, click **Options - Edit display name**.
4. Edit the name and click **Accept** to confirm.

The alias / display name will now be used in this perspective.

## Related topics

- [Perspectives and event logs](perspectives.html "Perspectives and event logs")
- [Perspectives](troubleshooting-perspectives.html "Troubleshooting perspectives")
- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")


---

## data-modeling/ocpm/using-the-objects-and-events-catalog

# Using the Objects and Events catalog

While you can configure your own object-centric data model (OCDM), an efficient way to begin modeling objects and events is by using the Celonis-provided core processes in the **Catalog**. These core processes include predefined object types, event types, relationships, and perspectives for your selected process, which you can use to explore the Process Intelligence Graph and build content with Celonis Platform features such as Studio.

The following core processes can be enabled and configured for your team within the **Catalog**:

- Accounts payable
- Accounts receivable
- Inventory management
- Order management
- Procurement

Expand all

[## Accessing and using the catalog](#UUID-3b5f5a49-23f7-d1a5-5bee-14dd0af08ede_section-id235404437965407_body)

To access the catalog from the Objects and Events dashboard, click **Catalog**:

You then have access to the following features:

- **Celonis provided core processes**: Enable, configure, or disable the Celonis-provided core processes. See: [Enabling core processes](enabling-and-configuring-core-processes.html "Enabling and configuring core processes").
- **Celonis provided core process version**: Displays the version of the Celonis-provided core processes currently used by your **Objects and Events** dashboard.
- **Auto-update**: Enable Auto-update to automatically apply minor or patched new versions to all Celonis Catalog processes. Auto-update is off by default and, when enabled, suppresses update notifications on the dashboard.

  If you disable auto-update, a notification indicates when a new version of the Celonis catalog comes out, and you can choose to update manually.
- **Release notes**: Provides a link to the latest release notes for the version you are using.

[## Manually updating the catalog](#UUID-3b5f5a49-23f7-d1a5-5bee-14dd0af08ede_section-id235404438184956_body)

**Important**

Updating the Celonis Catalog version changes the object-centric data model in your development environment. This may introduce behavior changes or new attributes. Full details of the changes are listed in the release note for that version.

When a new Celonis Catalog version is available, an update message appears next to the current version on the **Objects and Events** dashboard.

To update your catalog:

1. Click **Update**.

   |  |
   | --- |
   |  |
2. Review the release notes and acknowledge the disclaimer about how updating the catalog impacts your existing content.
3. **For catalog versions 3.0.0 or higher only**: Select which version of the release to update to.

   For catalog versions below 3.0.0: Click Update
4. Click **Update catalog**.

   |  |
   | --- |
   |  |
5. After the update completes successfully, verify the object-centric data model in your development environment.

   - **Verify core model**: Check object types, event types, relationships, and transformations against the release notes.
   - **Review customizations**: Ensure any added attributes or relationships are still correct and relevant.
   - **Check transformations**: Confirm partial/full overwrites remain appropriate; for full overwrites, populate any new attributes with SQL as needed.
6. To use the latest catalog version, create a version of your object-centric data model and then deploy it to development or production.

   See: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models").

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## data-modeling/ocpm/version-deploy-ocdm

# Versioning and deploying object-centric data models

You can create and deploy numbered versions of your object-centric data models (OCDM) using built-in versioning and deployment tools. These tools let you test and deploy versions across development and production environments, giving you the option to review version histories and roll back to previous versions when needed.

The same versioning and deployment workflow is available in Studio, offering consistent benefits when creating and managing Studio packages and assets. See: [Versioning and deploying packages](version-deploy.html "Versioning and deploying packages")

For a video overview of the versioning and deployment features:

Click for sound

5:25

●●●●●●●●●●

Introduction to Celonis Release Management

Understanding the Testing Process

Version Creation and Management

Deploying Changes to Production

Version History and Comparison

Transitioning to Studio for App Management

Creating and Managing App Versions

Deploying Apps for End Users

Auditing and Tracking App Versions

Ensuring Governance in Release Management

## The benefits of versioning OCDM

Creating and managing multiple versions of OCDM in the Celonis Platform provides significant benefits, particularly around governance, reliability, and iterative development. These benefits include:

- **Review and compare changes**

  - Inspect and review all asset changes while in draft.
  - Compare versions side-by-side to view detailed changes.
- **Streamline version management**

  - Create new versions with an optional, auto-generated description.
  - Select the specific changes you want to bundle into a single version.
  - Access the Version History and load any past version into a draft for inspection or hot fixes.
- **Efficiently deploy versions**

  - Deploy versions with a comparison to what is currently active.
  - View the Deployment History, track their status, and re-deploy if needed.

Expand all

[## Creating an OCDM version](#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-idm1763529757051976_body)

You can create an OCDM version from within the **Objects & Events** area, generating a timestamped snapshot of its assets. Versions can then be deployed to target environments, loaded into draft, and compared with other versions.

Creating a version takes a snapshot of the assets and doesn't deploy the changes to a data pool yet. This is done via a separate deploy step, with further details provided here: [Deploying an OCDM version to development or production](version-deploy-ocdm.html#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-id235297572247398 "Deploying an OCDM version to development or production").

For the video overview of these features:

To create an OCDM version from your dashboard:

1. Click **Create version**, opening the versioning window.

   The indicator shows the number of updated assets since the last version was created.
2. Configure your version using the following features:

   - **Include / exclude assets**: Manually select and deselect asset changes to include in this version, with plain text search and configurable filters available for more complex packages.
   - **Version number format**: Enter a version number, an internal reference for the OCDM. We recommend using the format: MAJOR.MINOR.PATCH (e.g 1.0.0). See: .
   - **Summary of changes**: Add a summary of changes for the version for future reference, including an auto-generated summary option if required. Best practice is to add a meaningful description. This helps your team understand what's included in this version without having to look at every single asset.
   - **Open deployment after creating the version**: If selected, the deployment step opens after the version is created.

   |  |
   | --- |
   |  |
3. Click **Create Version**.

   The OCDM version is created and available in the **Package History** area:
4. *Optional*: If you have selected to open deployment after creating this version, continue to the steps provided in [Deploying an OCDM version to development or production](version-deploy-ocdm.html#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-id235297572247398 "Deploying an OCDM version to development or production").

### OCDM version status

When creating, editing, or viewing OCDM versions, the following status are available:

- **Draft**: This data model is currently being edited and the changes made are not yet visible to end-users. OCDM are considered as draft before they are first deployed and also when subsequently creating a new version of a deployed OCDM.
- **Version**: This is a numbered and timestamped copy of the OCDM at the time it was created. Versions can be viewed, edited into new versions, compared to other versions, and then deployed.
- **Deployed version**: This is a version of the OCDM that has been deployed to a production data pool, making it usable in other areas of the Celonis Platform.

### OCDM version number format

For the version number format, we recommend using: MAJOR.MINOR.PATCH (e.g 1.0.0)

- **Major**: A breaking change in the OCDM.
- **Minor**: Tweaks in the objects and events that won’t that won't change the overall set up of the OCDM. Examples include editing an object and adding a custom event.
- **Patch**: Very small changes, such as bug fixes, that may go unnoticed to your end-users. Examples include an update to the calculation of an event or changes in titles.

For example: 4.3.5 would be the fourth major version, the third minor release of that version, and the fifth patch of that release.

[## Deploying an OCDM version to development or production](#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-id235297572247398_body)

After creating an OCDM version, you can begin deploying to both the development and production environments.

- **Development**: Deploying to development adds data jobs labeled `test:ocpm-data-job` to your data pool. These jobs can then be executed to transform data for testing purposes.
- **Production**: Deploying to production adds data jobs labeled `ocpm-data-job` to your data pool. These jobs can then be executed to transform data for productive use.

|  |
| --- |
|  |

For the video overview of these features:

You can start the data model deployment process in three ways:

1. Choose from one of the following options:

   1. **As part of the versioning workflow**: When creating a version, you can select **Open deployment after creating the version**. This opens the deployment window after the version is created.

      |  |
      | --- |
      |  |
   2. **From the Objects & Events top bar**: While viewing any page, click **Deploy**:

      |  |
      | --- |
      |  |
   3. **From the Package History area**: When viewing any page, click **Package History** and then **Options - Deploy version** on the package version you want to deploy:

      |  |
      | --- |
      |  |
2. With the deployment window option, select from:

   - **Version to deploy**: Choose the numbered version to deploy.
   - **Target**: Choose from development and production environments.

     |  |
     | --- |
     |  |
3. Click **Deploy**.

   The deployment process starts, with the status displayed in a pop-up.
4. Once successfully deployed, click **Go to Data Pool** to see the latest version.

   **OCDM version and Celonis Processes version**

   In the example screenshot, you'll see two version numbers. These versions are independent of each other:

   - **OCDM version**: This is version 1.0.1 of the OCDM, with the releases managed by you.
   - **Celonis Processes version**: This is version 2.0.5 of the Celonis Processes that you've installed, with the releases managed centrally by Celonis.

[## Managing existing OCDM versions and deployments](#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-idm1763529764133464_body)

You can manage existing OCDM versions and deployments by clicking **Package History**:

In the **Package History** area, you then have the following management options:

- **Versions**: Each OCDM version has the following options:

  - **Deploy version**: Make this version available in the respective environment in the data pool. See: [Deploying an OCDM version to development or production](version-deploy-ocdm.html#UUID-560a2185-1896-f10b-17c6-0336cbac2be7_section-id235297572247398 "Deploying an OCDM version to development or production").
  - **Compare version**: Run a 1:1 comparison between available versions of this OCDM, showing you the differences between them.
  - **Load version**: Open a draft version of this OCDM, giving you the ability to make changes from the timestamped version you've selected.

  |  |
  | --- |
  |  |
- **Deployments**: Each deployed OCDM version has the following options:

  - **Re-deploy version**: Choose a previously deployed version of the package to re-deploy to production. This feature is useful when you have incorrectly deployed a version or want to fall back to a previous one.
  - **Open deployed version in Development / Production**: Click **Go to deployed target** to open the deployed version of this OCDM.

  |  |
  | --- |
  |  |

## Related topics

- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")
- [Enabling core processes](enabling-and-configuring-core-processes.html "Enabling and configuring core processes")


---

