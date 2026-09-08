# PQL: Process Functions (Part 2)

## pql/process/managing-actions-in-process-navigator

# Managing actions in Process Navigator

In Process Navigator, actions are used to keep track of all comments, requests and feedback that have been assigned to you. You can also assign actions to yourself, thereby creating a list with all of your work tasks.

Expand all

[## Viewing actions](#UUID-7c807556-bb04-33fc-7b97-186872e6f77c_section-idm4575568106001634282559036044_body)

Click the actions icon see all your actions. You can view your actions and add new actions in **My Overview**.

[## Adding actions](#UUID-7c807556-bb04-33fc-7b97-186872e6f77c_section-idm4587881718108834282559400208_body)

1. Click the actions icon.

   The **Actions** page opens.
2. Click the blue new icon.

   An Action form opens.
3. Complete the Action form, making sure you include a description of your action.
4. Click **Save action**.

   An action is added to the **Action Center** of the person you assigned the action too. If you’ve chosen to inform other people too, they and the assignee will also receive an email.

[## Using action statuses](#UUID-7c807556-bb04-33fc-7b97-186872e6f77c_section-idm4512970214145634282561990445_body)

All actions have a status. The status:

- Is **New** when the action has been created but work hasn’t started yet.
- Should be set to **In Progress** once work starts on the action.
- Should be set to **Done** when the action is complete.

[## Filtering, grouping and sorting actions](#UUID-7c807556-bb04-33fc-7b97-186872e6f77c_section-idm4558673414668834282564157366_body)

You can organize how actions are displayed using:

- Filter properties.
- Grouping by state, severity or type.
- Sorting by due date, change date, age or name.

## Related topics

- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Monitoring changes with Process Navigator](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator")


---

## pql/process/managing-process-attributes

# Managing process attributes

Process attributes are descriptive fields and repository objects attached to a process (or sub process) that capture specific information about that process. They help provide context, enable filtering and reporting, and support governance and compliance.

You can edit and assign process attributes by clicking **Processes - Architecture** and then selecting the main or sub process. This opens up the attribute side panel:

In addition to manually editing process attributes, some attributes will be automatically populated based on your activity within Process Designer. Attributes can also be nested within other attributes, such as related repository objects (for example, locations are nested within organizations).

## Available process attributes

Depending on your organization's configuration in Process Designer, your processes can have the following attributes:

Filter

- Attribute
- Description
- Link to further content

| Attribute | Description | Link to further content |
| --- | --- | --- |
| Accountable Organization | Accountable Organizations represent the organizational units or entities that are responsible for a process, task, or object within your process landscape.  You can assign accountable organizations to: Main processes, sub processes, tasks, and other repository objects. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Aggregated Maturity | Aggregated Maturity refers to a calculated indicator that reflects the overall maturity level of a process or process landscape, based on the maturity levels of its sub components, such as sub processes or related repository objects (e.g., risks, controls, documentation). | N/A |
| Applications | Applications refer to the IT systems or software tools that support, enable, or automate parts of a business process.  Applications are created and managed in the Systems repository object area. | [Systems](creating-and-managing-systems.html "Creating and managing systems") |
| Attachments | Add a link,upload a file, or chose to assign existing repository objects to the process. | N/A |
| Check Live Data | Checks the configuration of live data within the process. | N/A |
| Controls | Controls are formalized governance or compliance mechanisms embedded into processes to mitigate risks, ensure regulatory compliance, and enforce internal policies.  Controls are created and managed in the Risks repository object area. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Description | Use the rich text editor to add further details about the process. | N/A |
| Details | Use the text editor to add scope and purpose information to the process. | N/A |
| Documents | Documents are digital or physical artifacts that are linked to business processes, tasks, or objects. They represent information carriers that support, govern, or result from process activities. | [Documents](creating-and-managing-documents.html "Creating and managing documents") |
| Glossary | This links to any terms that are defined within the process glossary. | N/A |
| Goals | Goals represent the strategic or operational objectives that a process or organization aims to achieve. They help align processes with business strategy and provide purpose and direction for process design and improvement.  Goals are created and managed in the KPI repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| ID | An ID is a unique identifier assigned to a process or sub process. It helps with version control, traceability, reporting, and integration with external systems like ERP, BPM, or compliance tools. | N/A |
| Image | Upload an image file to represent this process. For best quality, upload an image with a ratio of 16:9 and 1300 x 640 pixels resolution. | N/A |
| Inputs / outputs | Inputs and outputs represent the information, materials, or triggers that flow into and out of a process or task. They are essential for modeling how processes interact and ensuring clarity, traceability, and efficiency in process execution.  Inputs / ouputs are created and managed in the Business Objects repository object area. | [Business objects](creating-and-managing-business-objects.html "Creating and managing business objects") |
| KPIs | Key Performance Indicators (KPIs) are measurable values used to monitor, evaluate, and improve the performance of business processes. They help assess whether a process is meeting its objectives in terms of efficiency, effectiveness, quality, or compliance. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Learning units | A Learning Unit is a structured element used to link process knowledge with training content. It helps ensure that employees are trained on the specific processes, procedures, or responsibilities relevant to their roles.  Learning units are created and managed in the Learnings repository object area. | [Learning objects](creating-and-managing-learning-objects.html "Creating and managing learning objects") |
| Locations | Locations refer to organizational or geographical entities where processes, roles, systems, or other elements are situated or carried out. They are used to model and document the physical or logical distribution of process-related resources across different places in your organization.  Locations are created and managed in the Organization repository object area. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Maturity | Maturity refers to the level of development, completeness, or quality of a process or object (such as a process model, requirement, or documentation).  You can manually select the maturity percentage for each process, contributing to the aggregated maturity rating. | N/A |
| Measures | Measurements refer to quantifiable indicators used to monitor, evaluate, and improve processes within a business process model. They help assess the efficiency, effectiveness, and compliance of a process.  Measures are created and managed in the KPIs repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Milestones | Milestones are key points or significant events within a business process or workflow. They represent important achievements or stages that indicate progress toward completing the process. Milestones help track and monitor the status of a process, ensuring that critical tasks are completed or that certain conditions are met before moving on to the next phase of the workflow.  Milestones are created and managed in the KPIs repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Name | A name is a text-based label for the process. | N/A |
| Opportunities | Opportunities are essentially the positive or beneficial outcomes that may arise from a situation that is generally viewed as risky. These opportunities are seen as potential ways to turn a risk or uncertainty into a favorable outcome, rather than just focusing on the negative impacts of the risk.  Opportunities are created and managed in the Risks repository object area. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Participants | Participants are essentially the entities (such as people, roles, or systems) that are involved in the execution of a business process. These participants are responsible for carrying out tasks or interactions within the process flow.  Participants are created and managed in the Roles repository object area. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Permissions | Permissions control which users and groups of users can view, use, and edit the process. | N/A |
| Predecessor / successor process | Predecessor Process - This is a process that occurs before the current process. It either delivers input, sets preconditions, or represents a prior step in a larger end-to-end business process.  Successor Process - This is a process that follows the current process. It typically consumes the output or results of the current process and continues the overall flow. | N/A |
| Process Cost Analysis | Process Cost Analysis is a feature that helps organizations evaluate and understand the costs associated with their business processes. It allows you to assign, calculate, and analyze costs linked to process steps, roles, resources, or time spent, providing insights into operational efficiency and potential savings. | N/A |
| Replace default graphic | This allows you to substitute the standard process visualization (e.g., BPMN diagram or default layout) with a custom image or diagram. This is especially useful for high-level processes like value chains, organizational views, or architecture overviews, where a more tailored graphic can improve clarity or alignment with corporate standards. | N/A |
| Requests | Requests typically refer to communication interactions or data exchanges between different processes, roles, or systems. They are used to model and document external triggers or inter-process communications within a business process landscape.  Requests are created and managed within the process modeling environment as part of defining interactions between elements. | [Process graphics](creating-process-graphics.html "Creating process graphics") |
| Risk Assessment | Risk Assessment refers to the systematic identification and evaluation of potential risks associated with business processes. It is a key feature used in process modeling and governance to ensure that processes are not only efficient but also compliant and resilient to internal or external threats. | N/A |
| Risks | Risks are defined as potential negative events or conditions that could impact a process, project, or organizational goal. They are used to identify, document, and assess uncertainties that might threaten process performance, compliance, quality, or business continuity. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Scope filters | Scope filters are used to control the visibility of content within the platform based on defined organizational or contextual boundaries. They help tailor the user experience by showing only the relevant processes, objects, or models to specific users or user groups, depending on their role, department, location, or other defined criteria. | N/A |
| Sorting | Enter a numerical value to change the level that the process appears in the process overview. The higher the number, the higher the process appears. | N/A |
| Standards | Standards are defined guidelines, rules, or frameworks that processes and activities should comply with to ensure consistency, quality, compliance, and best practices across the organization. | [Standards](creating-and-managing-standards.html "Creating and managing standards") |
| Status | A process status indicates the current life cycle stage of a process model within the system. It helps track where a process is in its development, review, and publication cycle, and guides what actions users can take at each stage.  While exact statuses can be customized by an organization, the typical default ones include:  - Draft - In Review - Approved - Released - Archived | N/A |
| Stereotypes | Stereotypes are a way to extend or customize the modeling language used to define processes or workflows. They provide a mechanism to define new types of elements with specialized behavior, properties, or semantics. Essentially, stereotypes enable you to tailor the modeling environment to better reflect the specific requirements or business domain you are working within. | N/A |
| Touch Points | Touch points refer to the interactions or connections that a process has with other processes, systems, or stakeholders. They represent critical points of integration, communication, or hand offs where a process interacts with another process or external entity. Touch points help visualize the relationships between different processes, departments, roles, or even external systems, making it easier to understand how a given process fits within the larger business architecture. | N/A |
| Trainings | Trainings are typically a set of activities, materials, or resources designed to help users understand and effectively work with the processes and workflows designed within the system. Training is an essential component in ensuring that employees or stakeholders are properly equipped with the knowledge and skills to follow, execute, or manage the business processes.  Trainings are created and managed in the Learnings repository object area. | [Learning objects](creating-and-managing-learning-objects.html "Creating and managing learning objects") |

| Attribute | Description | Link to further content |
| --- | --- | --- |
| Accountable Organization | Accountable Organizations represent the organizational units or entities that are responsible for a process, task, or object within your process landscape.  You can assign accountable organizations to: Main processes, sub processes, tasks, and other repository objects. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Aggregated Maturity | Aggregated Maturity refers to a calculated indicator that reflects the overall maturity level of a process or process landscape, based on the maturity levels of its sub components, such as sub processes or related repository objects (e.g., risks, controls, documentation). | N/A |
| Applications | Applications refer to the IT systems or software tools that support, enable, or automate parts of a business process.  Applications are created and managed in the Systems repository object area. | [Systems](creating-and-managing-systems.html "Creating and managing systems") |
| Attachments | Add a link,upload a file, or chose to assign existing repository objects to the process. | N/A |
| Check Live Data | Checks the configuration of live data within the process. | N/A |
| Controls | Controls are formalized governance or compliance mechanisms embedded into processes to mitigate risks, ensure regulatory compliance, and enforce internal policies.  Controls are created and managed in the Risks repository object area. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Description | Use the rich text editor to add further details about the process. | N/A |
| Details | Use the text editor to add scope and purpose information to the process. | N/A |
| Documents | Documents are digital or physical artifacts that are linked to business processes, tasks, or objects. They represent information carriers that support, govern, or result from process activities. | [Documents](creating-and-managing-documents.html "Creating and managing documents") |
| Glossary | This links to any terms that are defined within the process glossary. | N/A |
| Goals | Goals represent the strategic or operational objectives that a process or organization aims to achieve. They help align processes with business strategy and provide purpose and direction for process design and improvement.  Goals are created and managed in the KPI repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| ID | An ID is a unique identifier assigned to a process or sub process. It helps with version control, traceability, reporting, and integration with external systems like ERP, BPM, or compliance tools. | N/A |
| Image | Upload an image file to represent this process. For best quality, upload an image with a ratio of 16:9 and 1300 x 640 pixels resolution. | N/A |
| Inputs / outputs | Inputs and outputs represent the information, materials, or triggers that flow into and out of a process or task. They are essential for modeling how processes interact and ensuring clarity, traceability, and efficiency in process execution.  Inputs / ouputs are created and managed in the Business Objects repository object area. | [Business objects](creating-and-managing-business-objects.html "Creating and managing business objects") |
| KPIs | Key Performance Indicators (KPIs) are measurable values used to monitor, evaluate, and improve the performance of business processes. They help assess whether a process is meeting its objectives in terms of efficiency, effectiveness, quality, or compliance. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Learning units | A Learning Unit is a structured element used to link process knowledge with training content. It helps ensure that employees are trained on the specific processes, procedures, or responsibilities relevant to their roles.  Learning units are created and managed in the Learnings repository object area. | [Learning objects](creating-and-managing-learning-objects.html "Creating and managing learning objects") |
| Locations | Locations refer to organizational or geographical entities where processes, roles, systems, or other elements are situated or carried out. They are used to model and document the physical or logical distribution of process-related resources across different places in your organization.  Locations are created and managed in the Organization repository object area. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Maturity | Maturity refers to the level of development, completeness, or quality of a process or object (such as a process model, requirement, or documentation).  You can manually select the maturity percentage for each process, contributing to the aggregated maturity rating. | N/A |
| Measures | Measurements refer to quantifiable indicators used to monitor, evaluate, and improve processes within a business process model. They help assess the efficiency, effectiveness, and compliance of a process.  Measures are created and managed in the KPIs repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Milestones | Milestones are key points or significant events within a business process or workflow. They represent important achievements or stages that indicate progress toward completing the process. Milestones help track and monitor the status of a process, ensuring that critical tasks are completed or that certain conditions are met before moving on to the next phase of the workflow.  Milestones are created and managed in the KPIs repository object area. | [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)") |
| Name | A name is a text-based label for the process. | N/A |
| Opportunities | Opportunities are essentially the positive or beneficial outcomes that may arise from a situation that is generally viewed as risky. These opportunities are seen as potential ways to turn a risk or uncertainty into a favorable outcome, rather than just focusing on the negative impacts of the risk.  Opportunities are created and managed in the Risks repository object area. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Participants | Participants are essentially the entities (such as people, roles, or systems) that are involved in the execution of a business process. These participants are responsible for carrying out tasks or interactions within the process flow.  Participants are created and managed in the Roles repository object area. | [Organizational objects](creating-and-managing-organizational-objects.html "Creating and managing organizational objects") |
| Permissions | Permissions control which users and groups of users can view, use, and edit the process. | N/A |
| Predecessor / successor process | Predecessor Process - This is a process that occurs before the current process. It either delivers input, sets preconditions, or represents a prior step in a larger end-to-end business process.  Successor Process - This is a process that follows the current process. It typically consumes the output or results of the current process and continues the overall flow. | N/A |
| Process Cost Analysis | Process Cost Analysis is a feature that helps organizations evaluate and understand the costs associated with their business processes. It allows you to assign, calculate, and analyze costs linked to process steps, roles, resources, or time spent, providing insights into operational efficiency and potential savings. | N/A |
| Replace default graphic | This allows you to substitute the standard process visualization (e.g., BPMN diagram or default layout) with a custom image or diagram. This is especially useful for high-level processes like value chains, organizational views, or architecture overviews, where a more tailored graphic can improve clarity or alignment with corporate standards. | N/A |
| Requests | Requests typically refer to communication interactions or data exchanges between different processes, roles, or systems. They are used to model and document external triggers or inter-process communications within a business process landscape.  Requests are created and managed within the process modeling environment as part of defining interactions between elements. | [Process graphics](creating-process-graphics.html "Creating process graphics") |
| Risk Assessment | Risk Assessment refers to the systematic identification and evaluation of potential risks associated with business processes. It is a key feature used in process modeling and governance to ensure that processes are not only efficient but also compliant and resilient to internal or external threats. | N/A |
| Risks | Risks are defined as potential negative events or conditions that could impact a process, project, or organizational goal. They are used to identify, document, and assess uncertainties that might threaten process performance, compliance, quality, or business continuity. | [Risks](creating-and-managing-risks.html "Creating and managing risks") |
| Scope filters | Scope filters are used to control the visibility of content within the platform based on defined organizational or contextual boundaries. They help tailor the user experience by showing only the relevant processes, objects, or models to specific users or user groups, depending on their role, department, location, or other defined criteria. | N/A |
| Sorting | Enter a numerical value to change the level that the process appears in the process overview. The higher the number, the higher the process appears. | N/A |
| Standards | Standards are defined guidelines, rules, or frameworks that processes and activities should comply with to ensure consistency, quality, compliance, and best practices across the organization. | [Standards](creating-and-managing-standards.html "Creating and managing standards") |
| Status | A process status indicates the current life cycle stage of a process model within the system. It helps track where a process is in its development, review, and publication cycle, and guides what actions users can take at each stage.  While exact statuses can be customized by an organization, the typical default ones include:  - Draft - In Review - Approved - Released - Archived | N/A |
| Stereotypes | Stereotypes are a way to extend or customize the modeling language used to define processes or workflows. They provide a mechanism to define new types of elements with specialized behavior, properties, or semantics. Essentially, stereotypes enable you to tailor the modeling environment to better reflect the specific requirements or business domain you are working within. | N/A |
| Touch Points | Touch points refer to the interactions or connections that a process has with other processes, systems, or stakeholders. They represent critical points of integration, communication, or hand offs where a process interacts with another process or external entity. Touch points help visualize the relationships between different processes, departments, roles, or even external systems, making it easier to understand how a given process fits within the larger business architecture. | N/A |
| Trainings | Trainings are typically a set of activities, materials, or resources designed to help users understand and effectively work with the processes and workflows designed within the system. Training is an essential component in ensuring that employees or stakeholders are properly equipped with the knowledge and skills to follow, execute, or manage the business processes.  Trainings are created and managed in the Learnings repository object area. | [Learning objects](creating-and-managing-learning-objects.html "Creating and managing learning objects") |

## Related topics

- [Systems](creating-and-managing-systems.html "Creating and managing systems")
- [Creating and modeling processes](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a "Creating and modeling processes")
- [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)")


---

## pql/process/match_process

# MATCH\_PROCESS

## Description

MATCH\_PROCESS matches the variants of a process against a given pattern.

Similar functionality is provided by [MATCH\_PROCESS\_REGEX](match_process_regex.html "MATCH_PROCESS_REGEX"). MATCH\_PROCESS uses Nodes and Edges to match the cases. Nodes consist either of a single activity or a list of activities. Edges describe how the nodes are linked together.

## Syntax

```
MATCH_PROCESS ( [ activity_table.string_column ,] node (, node)* CONNECTED BY edge (, edge)* )
```

- **activity\_table.string\_column**: A string column of an activity table. Usually, the activity column of an activity table is used.
- **node**: NODE | OPTIONAL | LOOP | OPTIONAL\_LOOP | STARTING | ENDING [ single\_activity (, single\_activity )\* ] AS node\_name

  - **single\_activity**: [LIKE] activity (Activity name. LIKE allows you to use wildcards in your activity name. LIKE reacts case sensitive. )
- **edge**: DIRECT | EVENTUALLY [ edge\_start\_node, edge\_end\_node ]

  - **edge\_start\_node**: node\_name
  - **edge\_end\_node**: node\_name

## Node

A node consists of one or more activities. If multiple activities are given, it means one of those activities.

## Node Types

- **NODE**: Node which has to be part once in the case, without any restrictions on where the node has to be.
- **STARTING**: Node which has to happen at the beginning of a case.
- **ENDING**: Node which has to happen at the end of a case.
- **LOOP**: Node which occurs at least once but can also be repeated.

## Edge Types

- **DIRECT**: edge\_end\_node has to follow directly after the edge\_start\_node
- **EVENTUALLY**: between edge\_start\_node and edge\_end\_node other activities can be placed

## Result

MATCH\_PROCESS returns an [INT](int.html "INT") column, which flags all matching cases with 1 and all non matching cases with 0. The resulting column is temporarily added to the case table and is often used in combination with a filter.

## Tips

- Instead of specifying the activity column, it is also possible to use another string column of the activity table. For example, you can match cases with a specified sequence of user types.

## Examples

|  |
| --- |
| **[1]**  Here MATCH\_PROCESS flags all cases in which one activity A is followed directly by activity B with a 1. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' ] as src , NODE [ 'B' ] as tgt CONNECTED BY DIRECT [ src , tgt ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 0 | | |

|  |
| --- |
| **[2]**  Here is MATCH\_PROCESS combined with a filter. The result are only cases in which one activity A is followed by activity B. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' ] as src , NODE [ 'B' ] as tgt CONNECTED BY DIRECT [ src , tgt ] ) = 1; ```  **Column1**  ``` "Activities"."CASE_ID" ```  **Column2**  ``` "Activities"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | '1' | 'C' | | |

|  |
| --- |
| **[3]**  If an activity has not only to be directly followed by another activity but can come any time later the keyword EVENTUALLY can be used. In this example MATCH\_PROCESS flags all cases in which one activity A is followed eventually by activity B with a 1. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' ] as src , NODE [ 'B' ] as tgt CONNECTED BY EVENTUALLY [ src , tgt ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 1 | | |

|  |
| --- |
| **[4]**  Here is an example in which node 'node\_ab' has two activities. This means that a matching case needs an activity C which comes either after A or B. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' , 'B' ] as node_ab , NODE [ 'C' ] as node_c CONNECTED BY DIRECT [ node_ab , node_c ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 1 | | |

|  |
| --- |
| **[5]**  Nodes can represent loops. Here matching cases can have between activity A and C at least one or more activities of type B. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' ] AS node_a , LOOP [ 'B' ] AS loop_b , NODE [ 'C' ] AS node_c CONNECTED BY DIRECT [ node_a , loop_b ] , DIRECT [ loop_b , node_c ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:04:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'C' | Tue Jan 01 2019 13:02:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:04:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:02:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'C' | Tue Jan 01 2019 13:02:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 1 | | '3' | 0 | | |

|  |
| --- |
| **[6]**  A loop node can also consist of multiple activities. PROCESS\_MATCH accepts than all given activities, without regarding order or number of occurrences till another activity is found. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ 'A' ] AS node_a , LOOP [ 'B' , 'C' ] AS loop_bc , NODE [ 'D' ] AS node_d CONNECTED BY DIRECT [ node_a , loop_bc ] , DIRECT [ loop_bc , node_d ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:03:00.000 | | '1' | 'D' | Tue Jan 01 2019 13:05:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:03:00.000 | | '1' | 'D' | Tue Jan 01 2019 13:05:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | |

|  |
| --- |
| **[7]**  Nodes can be forced to be at the start or the end of a case. |
| | Query | | --- | | **Column1**  ``` "Activities_CASES"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."ACTIVITY" , STARTING [ 'A' ] AS node_a , ENDING [ 'B' ] AS node_b CONNECTED BY DIRECT [ node_a , node_b ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:05:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:06:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:07:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:08:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:05:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:06:00.000 | | '3' | 'A' | Tue Jan 01 2019 13:07:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:08:00.000 |    **Activities\_CASES**  | CASE\_ID : string | | --- | | '1' | | '2' | | '3' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Activities\_CASES.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 0 | | '3' | 0 | | |

|  |
| --- |
| **[8]**  It is not required to match cases based on the activity column. In this example, all cases where user type A is directly followed by user type B are flagged with a 1. |
| | Query | | --- | | **Column1**  ``` "Cases"."CASE_ID" ```  **Column2**  ``` MATCH_PROCESS ( "Activities"."USERTYPE" , NODE [ 'A' ] as src , NODE [ 'B' ] as tgt CONNECTED BY DIRECT [ src , tgt ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date - USERTYPE : string  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | USERTYPE : string | | --- | --- | --- | --- | | '1' | 'X' | Tue Jan 01 2019 13:00:00.000 | 'A' | | '1' | 'Y' | Tue Jan 01 2019 13:01:00.000 | 'B' | | '1' | 'Z' | Tue Jan 01 2019 13:02:00.000 | 'A' | | '2' | 'X' | Tue Jan 01 2019 13:00:00.000 | 'B' | | '2' | 'Z' | Tue Jan 01 2019 13:02:00.000 | 'A' | | '2' | 'Y' | Tue Jan 01 2019 13:03:00.000 | 'A' |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | USERTYPE : string | | --- | --- | --- | --- | | '1' | 'X' | Tue Jan 01 2019 13:00:00.000 | 'A' | | '1' | 'Y' | Tue Jan 01 2019 13:01:00.000 | 'B' | | '1' | 'Z' | Tue Jan 01 2019 13:02:00.000 | 'A' | | '2' | 'X' | Tue Jan 01 2019 13:00:00.000 | 'B' | | '2' | 'Z' | Tue Jan 01 2019 13:02:00.000 | 'A' | | '2' | 'Y' | Tue Jan 01 2019 13:03:00.000 | 'A' |    **Cases**  | CASE\_ID : string | | --- | | '1' | | '2' |        **Foreign Keys**  |  |  | | --- | --- | | Activities.CASE\_ID | Cases.CASE\_ID | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 0 | | |

|  |
| --- |
| **[9]** |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS ( "Activities"."ACTIVITY" , NODE [ LIKE 'A%' ] as src , NODE [ 'C' ] as tgt CONNECTED BY DIRECT [ src , tgt ] ) = 1; ```  **Column1**  ``` "Activities"."CASE_ID" ```  **Column2**  ``` "Activities"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - CASE\_ID : string - ACTIVITY : string - Column3 : date - Column4 : date  | CASE\_ID : string | ACTIVITY : string | Column3 : date | Column4 : date | | --- | --- | --- | --- | | '1' | 'AB' | Tue Jan 01 2019 13:00:00.000 | Tue Jan 01 2019 13:02:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | Tue Jan 01 2019 13:08:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:03:00.000 | Tue Jan 01 2019 13:04:00.000 | | '1' | 'D' | Tue Jan 01 2019 13:06:00.000 | Tue Jan 01 2019 13:07:00.000 |   | CASE\_ID : string | ACTIVITY : string | Column3 : date | Column4 : date | | --- | --- | --- | --- | | '1' | 'AB' | Tue Jan 01 2019 13:00:00.000 | Tue Jan 01 2019 13:02:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | Tue Jan 01 2019 13:08:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:03:00.000 | Tue Jan 01 2019 13:04:00.000 | | '1' | 'D' | Tue Jan 01 2019 13:06:00.000 | Tue Jan 01 2019 13:07:00.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'AB' | | '1' | 'B' | | '1' | 'C' | | '1' | 'D' | | |

## See also:

- [PROCESS EQUALS](process-equals.html "PROCESS EQUALS")
- [MATCH\_ACTIVITIES](match_activities.html "MATCH_ACTIVITIES")


---

## pql/process/match_process_regex

# MATCH\_PROCESS\_REGEX

## Description

Filters the variants based on a regular expression defined over the activities.

MATCH\_PROCESS\_REGEX matches the variants of a process based on a regular expression. The regular expression defines a pattern over the activities of the variant.

If the regular expression contains an activity name that does not exist, then a warning is displayed.

**Warning**

**Computation Times** In some settings, this operator may require excessive CPU time. If the execution time exceeds 10 minutes, the execution is stopped and an according error is reported.

|  |
| --- |
| **[1]**  Regular expression with non-existing activity and non-matching wildcard: Empty result and warnings. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'X' >> LIKE '%foo%' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'Activity A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'Activity D' | Fri Jan 01 2016 02:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'Activity C' | Fri Jan 01 2016 04:00:00.000 | | 3 | 'Activity A' | Fri Jan 01 2016 05:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 06:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'Activity A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'Activity D' | Fri Jan 01 2016 02:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'Activity C' | Fri Jan 01 2016 04:00:00.000 | | 3 | 'Activity A' | Fri Jan 01 2016 05:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 06:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | (empty table)  **Warning**  MATCH\_PROCESS\_REGEX: Could not find activity ['X']. | |

## Result

MATCH\_PROCESS\_REGEX returns an [INT](int.html "INT") value for each case which is 1 if the variant matches the pattern or 0 if it does not match. The resulting column is a temporary column of the case table.

## Tips

- You can define an alias for an activity and use this alias as an abbreviation for the activity name inside the regular expression. This improves the readability of the pattern if you have long activity names.
- You can also define an alias for a subexpression. This enables you to give a logical name to a certain subexpression and use this subexpression at different places inside the regular expression. This allows you to structure your regular expressions and improve its understandability
- MATCH\_PROCESS\_REGEX is very useful if you want to filter on variants by a very specific and/or complex pattern, e.g. containing sequences or loops. If you want to filter for the occurrence of a single activity or very simple patterns, it is far more efficient to use normal conditional expressions instead of regular expressions.
- Instead of specifying the activity column, it is also possible to use another string column of the activity table. For example, you can write a process regex that matches cases based on the user type.

## Syntax

```
MATCH_PROCESS_REGEX ( activity_table.string_column, regular_expression )
```

- **activity\_table.string\_column**: A string column of an activity table. Usually, the activity column of an activity table is used.
- **regular\_expression**: a regular expression to match the variants against. The patterns that can be used inside the regular expression are described below.

## Patterns

This is an overview over all patterns that can be used within the regular expression. Full example queries as well as more detailed descriptions can be found below.

| Syntax | Meaning | Example |
| --- | --- | --- |
| ' ' | Case contains the activity | 'A' |
| ^ | Case starts with the activity | ^ 'Scan Invoice' |
| $ | Case ends with the activity | 'B' $ |
| >> | Activities directly follow | 'A' >> 'B' |
| | | Logical OR | 'A' | 'B' |
| ( ) | Group of activities | ('A' | 'B') >> ('C' >> 'D') |
| \* | 0 or more occurrences | ('A' >> 'B')\* |
| + | 1 or more occurrences | ('A' >> 'B')+ |
| ? | 0 or 1 occurrences | ('A' >> 'B')? |
| {<from>, <to>} | Between <from> and <to> occurrences | ('A' >> 'B'){1, 3} |
| '\*' | Any activity matches | 'A' >> ('\*')+ >> 'B' |
| ANY | Any activity matches | 'A' >> (ANY)+ >> 'B' |
| . | Any activity matches | 'A' >> . >> 'C' |
| LIKE '%...%' | Activities that contain string | 'A' >> LIKE '% Invoice%' |
| [' ',' '] | Set of activities of which one needs to match | 'A' >> ['B','D','E'] >> 'C' |
| [! ' '] | Set of activities of which none matches | 'A' >> [! 'B'] >> 'C' |
| AS | Gives an alias to a regex | ('A' >> (ANY)\*) AS sequence, sequence >> 'B' |

## Example

|  |
| --- |
| **[2]**  Matches any variant that starts with activity `'A'` followed by activity 'B', followed by one or more activities `'A'` or `'B'` in arbitrary order. After that, an activity `'C'` has to occur. However, before and after that activity any number (zero or more) of any possible activity may occur. Finally, the variant has to end with an activity `'H'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , ^ 'A' >> 'B' >> ( 'B' | 'A' ) + >> ( ANY ) * >> 'C' >> ( '*' ) * >> 'H' $ ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 1 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 1 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 1 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 09:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 10:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 11:00:00.000 | | 2 | 'H' | Fri Jan 01 2016 12:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 13:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 14:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 15:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 16:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 17:00:00.000 | | 3 | 'G' | Fri Jan 01 2016 18:00:00.000 | | 3 | 'H' | Fri Jan 01 2016 19:00:00.000 | | 4 | 'A' | Fri Jan 01 2016 20:00:00.000 | | 4 | 'B' | Fri Jan 01 2016 21:00:00.000 | | 4 | 'A' | Fri Jan 01 2016 22:00:00.000 | | 4 | 'D' | Fri Jan 01 2016 23:00:00.000 | | 4 | 'C' | Sat Jan 02 2016 00:00:00.000 | | 4 | 'H' | Sat Jan 02 2016 01:00:00.000 | | 5 | 'D' | Sat Jan 02 2016 02:00:00.000 | | 5 | 'A' | Sat Jan 02 2016 03:00:00.000 | | 5 | 'A' | Sat Jan 02 2016 04:00:00.000 | | 5 | 'B' | Sat Jan 02 2016 05:00:00.000 | | 5 | 'B' | Sat Jan 02 2016 06:00:00.000 | | 5 | 'H' | Sat Jan 02 2016 07:00:00.000 | | 6 | 'X' | Sat Jan 02 2016 08:00:00.000 | | 6 | 'A' | Sat Jan 02 2016 09:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 10:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 11:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 12:00:00.000 | | 6 | 'C' | Sat Jan 02 2016 13:00:00.000 | | 6 | 'H' | Sat Jan 02 2016 14:00:00.000 | | 7 | 'A' | Sat Jan 02 2016 15:00:00.000 | | 7 | 'B' | Sat Jan 02 2016 16:00:00.000 | | 7 | 'A' | Sat Jan 02 2016 17:00:00.000 | | 7 | 'D' | Sat Jan 02 2016 18:00:00.000 | | 7 | 'C' | Sat Jan 02 2016 19:00:00.000 | | 7 | 'H' | Sat Jan 02 2016 20:00:00.000 | | 7 | 'Y' | Sat Jan 02 2016 21:00:00.000 | | 8 | 'X' | Sat Jan 02 2016 22:00:00.000 | | 8 | 'Y' | Sat Jan 02 2016 23:00:00.000 | | 8 | 'Z' | Sun Jan 03 2016 00:00:00.000 | | 8 | 'A' | Sun Jan 03 2016 01:00:00.000 | | 8 | 'B' | Sun Jan 03 2016 02:00:00.000 | | 8 | 'C' | Sun Jan 03 2016 03:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 1 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 1 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 1 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 09:00:00.000 | | 2 | 'D' | Fri Jan 01 2016 10:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 11:00:00.000 | | 2 | 'H' | Fri Jan 01 2016 12:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 13:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 14:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 15:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 16:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 17:00:00.000 | | 3 | 'G' | Fri Jan 01 2016 18:00:00.000 | | 3 | 'H' | Fri Jan 01 2016 19:00:00.000 | | 4 | 'A' | Fri Jan 01 2016 20:00:00.000 | | 4 | 'B' | Fri Jan 01 2016 21:00:00.000 | | 4 | 'A' | Fri Jan 01 2016 22:00:00.000 | | 4 | 'D' | Fri Jan 01 2016 23:00:00.000 | | 4 | 'C' | Sat Jan 02 2016 00:00:00.000 | | 4 | 'H' | Sat Jan 02 2016 01:00:00.000 | | 5 | 'D' | Sat Jan 02 2016 02:00:00.000 | | 5 | 'A' | Sat Jan 02 2016 03:00:00.000 | | 5 | 'A' | Sat Jan 02 2016 04:00:00.000 | | 5 | 'B' | Sat Jan 02 2016 05:00:00.000 | | 5 | 'B' | Sat Jan 02 2016 06:00:00.000 | | 5 | 'H' | Sat Jan 02 2016 07:00:00.000 | | 6 | 'X' | Sat Jan 02 2016 08:00:00.000 | | 6 | 'A' | Sat Jan 02 2016 09:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 10:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 11:00:00.000 | | 6 | 'B' | Sat Jan 02 2016 12:00:00.000 | | 6 | 'C' | Sat Jan 02 2016 13:00:00.000 | | 6 | 'H' | Sat Jan 02 2016 14:00:00.000 | | 7 | 'A' | Sat Jan 02 2016 15:00:00.000 | | 7 | 'B' | Sat Jan 02 2016 16:00:00.000 | | 7 | 'A' | Sat Jan 02 2016 17:00:00.000 | | 7 | 'D' | Sat Jan 02 2016 18:00:00.000 | | 7 | 'C' | Sat Jan 02 2016 19:00:00.000 | | 7 | 'H' | Sat Jan 02 2016 20:00:00.000 | | 7 | 'Y' | Sat Jan 02 2016 21:00:00.000 | | 8 | 'X' | Sat Jan 02 2016 22:00:00.000 | | 8 | 'Y' | Sat Jan 02 2016 23:00:00.000 | | 8 | 'Z' | Sun Jan 03 2016 00:00:00.000 | | 8 | 'A' | Sun Jan 03 2016 01:00:00.000 | | 8 | 'B' | Sun Jan 03 2016 02:00:00.000 | | 8 | 'C' | Sun Jan 03 2016 03:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 | | 4 | | 5 | | 6 | | 7 | | 8 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 3 | 'A' | | 3 | 'B' | | 3 | 'B' | | 3 | 'C' | | 3 | 'G' | | 3 | 'H' | | 4 | 'A' | | 4 | 'B' | | 4 | 'A' | | 4 | 'D' | | 4 | 'C' | | 4 | 'H' | | |

## Regular expression constructs

The regular expression can be constructed from several special constructs. In the following sections, these construts will be explained in more detail.

### Activities

Activities are given by their respective name (including all spaces, special characters etc.) enclosed by single quotes:

#### Syntax

```
"'" <string> "'"
```

#### Example

|  |
| --- |
| **[3]**  Filters the variants for the occurrence of a certain activity (`'B'`). Every variant having at least one instance of this activity will be contained in the result, regardless of the number of occurrences or its position in the variant. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'B' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | |

If multiple activities with similar names should be mapped at the same time, it is possible to use the keyword `LIKE` with a SQL-style wildcard match (read [here](like.html "LIKE") for more details about the `LIKE` operator).

#### Syntax

```
LIKE "'" <identifier_with_wildcards> "'"
```

#### Example

|  |
| --- |
| **[4]**  Matches each variant that contains an activity having the term `ask` in its name. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , LIKE '%ask%' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'Activity A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'Task B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'Activity C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'Activity D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'Activity B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'Activity C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Activity A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'Activity C' | Fri Jan 01 2016 12:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'Activity A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'Task B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'Activity C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'Activity D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'Activity A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'Activity B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'Activity C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Activity A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'Activity B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'Activity C' | Fri Jan 01 2016 12:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'Activity A' | | 1 | 'Task B' | | 1 | 'Activity C' | | 1 | 'Activity D' | | |

### Concatenation

The concatenation allows to match for sequences of certain regular expressions (e.g. activity names). Sequences of two or more expressions are given in the order of occurrence, separated by two greater than symbols (`>>`).

#### Syntax

```
<regular_expression> >> <regular_expression>
```

#### Example

|  |
| --- |
| **[5]**  Matches the two consecutive activities 'B' and 'C'. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'B' >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 12:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 12:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | |

### Matching any activity

Furthermore, it is possible to match any activity, regardless of its name. For convenience, there are three different ways to do this:

- by a an activity name that only contains the star symbol (`'*'`),
- by the keyword `ANY`,
- or by the dot symbol (`.`) which is well-known from the widely-used Perl regular expression syntax.

#### Example

|  |
| --- |
| **[6]**  Matches a sequence of activities where the second activity may have an arbitrary name. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' >> . >> 'B' >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 12:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 12:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 2 | 'A' | | 2 | 'A' | | 2 | 'B' | | 2 | 'C' | | 3 | 'A' | | 3 | 'B' | | 3 | 'B' | | 3 | 'C' | | |

### Choice

The choice construct allows to define two or more different alternatives for the matching regular expression. The overall regular expression matches if one of the given alternatives is matched. The alternative regular expressions are separated by the pipe symbol (`|`). In contrast to the concatenation, the order of the alternatives is irrelevant.

#### Syntax

```
<regular_expression> "|" <regular_expression>
```

#### Example

|  |
| --- |
| **[7]**  Matches every variant that contains an activity with name `'A'`, `'B'`, or `'H'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' | 'B' | 'H' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'H' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'I' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'K' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'H' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'I' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'K' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 3 | 'H' | | 3 | 'I' | | 3 | 'K' | | |

### Match start/end

In general, the regular expressions may match at any position in a variant. However, sometimes it is desirable to define a pattern each matching variants should start and / or end with. To define an exact match at the beginning of each variant, the `^` symbol must be added before the definition of the regular expression. To define an exact match at the end of each variant, the `$` symbol must be added after the definnition of the regular expression.

#### Syntax

```
[ ^ ] <regular_expression> [ $ ]
```

#### Examples

|  |
| --- |
| **[8]**  Matches every variant that starts with an activity `'A'` followed by an activity `'B'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , ^ 'A' >> 'B' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | |

|  |
| --- |
| **[9]**  Matches every variant that ends with an activity `'C'` followed by an activity `'D'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'C' >> 'D' $ ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 12:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 13:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 14:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 12:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 13:00:00.000 | | 3 | 'D' | Fri Jan 01 2016 14:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | 3 | 'A' | | 3 | 'C' | | 3 | 'D' | | 3 | 'A' | | 3 | 'C' | | 3 | 'D' | | |

### Activity sets

Activity sets are an alternative way to express a choice between different activities. An activity set matches any activity that is given in its defintion. Activity sets are defined as a (optionally comma-separated) list of activity names enclosed by square brackets. In contrast to choices, activity sets can only be defined for activities, but not for arbitrary regular expressions. However, activity sets can be inverted by adding a `!` between the opening bracket and the first activity name, so the activity set matches the complement of the defined activities. This way, it is easy to express that all activities except one ore more certain activities should match.

#### Syntax

```
"[" [ ! ] <activity_name> ( , <activity_name> )* "]"
```

#### Examples

|  |
| --- |
| **[10]**  Matches each variant that contains an activity `'A'`, `'B'`, or `'F'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , [ 'A' , 'B' , 'F' ] ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'X' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'Y' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Z' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'X' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'Y' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Z' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 2 | 'E' | | 2 | 'F' | | 2 | 'G' | | |

|  |
| --- |
| **[11]**  Matches each variant that contains an activity which is not `'A'`, `'B'`, or `'X'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , [ ! 'A' , 'B' , 'X' ] ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'X' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'Y' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Z' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 3 | 'X' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'Y' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'Z' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 3 | 'X' | | 3 | 'Y' | | 3 | 'Z' | | |

### Grouping

Regular expressions which contain multiple sub-expressions (e.g., choices or concatenations) can be bracketed to group them in order to to clearify the structure. Grouping may be also necessary to nest regular expressions.

#### Syntax

```
"(" <regular_expression> ")"
```

#### Example

|  |
| --- |
| **[12]**  Matches a sequence of Activities `'A'`, `'B'`, and `'C'`. The regular expression is grouped by a pair of brackets (without quantifier). |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , ( 'A' >> 'B' >> 'C' ) ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 12:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 09:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 10:00:00.000 | | 3 | 'B' | Fri Jan 01 2016 11:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 12:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | 2 | 'A' | | 2 | 'A' | | 2 | 'B' | | 2 | 'C' | | |

### Quantifiers

A quantifier defines that a regular expression may occur a variable number of times. Quantifiers must always be applied to a group expression. There are three different quantifiers available:

- **\*** The regular expression may occur an arbitrary number of times, i.e. it occurs zero or more times.
- **+** The regular expression occurs at least once, i.e. it occurs one ore more times.
- **?** The regular expression is optional, i.e. it may occur exactly once or not.
- **{<from>, <to>}** The regular expression may occur between <from> and <to> times (ie. <from>, <from>+1, <from>+2, ..., <to>-1, <to>). Note that both <from> and <to> are included in the range. For example, ('A'){1, 3} will match all variants that contain the activity 'A', one or two or three times. You can use this quantifier to make your regular expressions more readable:

  - 'A' >> 'A' >> ('A')? >> ('A')? becomes ('A'){2, 4},
  - ('A' >> 'A' >> 'A') | ('A' >> 'A' >> 'A' >> 'A') becomes ('A'){3,4},
  - ('A')? | ('A' >> 'A') | ('A' >> 'A' >> 'A' >> 'A') | ('A' >> 'A' >> 'A' >> 'A' >> 'A') becomes ('A'){0,2} | ('A'){4,5}.

  If <from> and <to> are equal then it's enough to specify <from>, for example ('A'){3, 3} can be written as ('A'){3}. The arguments <from> and <to> must satisfy all of the following conditions:

  - both <from> and <to> must be integers that are greater or equal zero,
  - <from> and <to> can't both be zero,
  - <from> must be less or equal <to>.

#### Syntax

```
"(" <regular_expression> ")" ( "+" | "?" | "*" | "{" <from> ["," <to>] "}")
```

#### Examples

|  |
| --- |
| **[13]**  Matches each variant that has an arbitrary number of activities `'B'` between activities `'A'` and `'C'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' >> ( 'B' ) * >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 2 | 'A' | | 2 | 'B' | | 2 | 'B' | | 2 | 'C' | | 3 | 'A' | | 3 | 'C' | | |

|  |
| --- |
| **[14]**  Matches each variant that has at least one activity `'B'` between activities `'A'` and `'C'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' >> ( 'B' ) + >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 2 | 'A' | | 2 | 'B' | | 2 | 'B' | | 2 | 'C' | | |

|  |
| --- |
| **[15]**  Matches each variant that has no or one activity `'B'` between activities `'A'` and `'C'`. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' >> ( 'B' ) ? >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 3 | 'A' | | 3 | 'C' | | |

|  |
| --- |
| **[16]**  Matches each variant that has 1 or 2 consecutive 'B' activities between activities 'A' and 'C'. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'A' >> ( 'B' ) { 1 , 2 } >> 'C' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 2 | 'A' | | 2 | 'B' | | 2 | 'B' | | 2 | 'C' | | |

#### Pitfall

- If not specified to match exactly at the start and/or at the end of the variant, a regular expression may match at **any** position in the variant as an arbitrary number of activities at beginning / end may be skipped. Consequently, a ? quantifier for example may also match any number of occurrence of its subexpression, if it is the only subexpression or the first/last subexpression of a concatenation.

#### Example

|  |
| --- |
| **[17]**  Matches each variant that has an activity `'B'`. Because there is no exact match at start or end of the variant defined, all given variants are matched as the additional activity `'B'` for variant 2 is implicitly skipped. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , ( 'B' ) ? ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 2 | 'A' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'B' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'C' | Fri Jan 01 2016 07:00:00.000 | | 3 | 'A' | Fri Jan 01 2016 08:00:00.000 | | 3 | 'C' | Fri Jan 01 2016 09:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 | | 3 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 2 | 'A' | | 2 | 'B' | | 2 | 'B' | | 2 | 'C' | | 3 | 'A' | | 3 | 'C' | | |

### Defining and referencing an alias

Sometimes, similar subexpressions may occur at different positions in the regular expression. This may be simple activities as well as complex subexpressions. An alias provides an elegant way to avoid repeating these subexpressions at different positions in the regular expression. It is a simple name that is assigned to a specific regular expression. By this name, the assigned regular expression can be referneced in order to re-use it in another regular expresssion. The regular expressions and their related aliases are given as a comma-separated list. The last regular expression of this list is the root expression which is the entry point for the pattern matching. Therefore, it cannot be referenced by another regular expression. Consequently, the root expression is never assigned to an alias.

#### Tips/Pitfalls

- Avoid to create cyclic definitions of regular expressions when using aliases as cycles will result in an error.
- Aliases can be used as a shortcut for long activity names. This may save a lot of typing and increase the readability of complex regular expressions.
- Be aware that the match at start symbol must be placed before the first aliased expressions, the match at end symbol must be placed after the root expression.
- It is not possible to reference aliases defined in another PROCESS\_MATCH\_REGEX operator. Only aliases within the same operator can be referenced.
- When combining `Match start` with aliases we have to use specific syntax.

#### Syntax

```
<regular_expression> ( AS <alias_name> "," <regular_expression> )*
```

### Empty Cases

Empty cases, meaning cases with no activities or only null activities, do never match.

|  |
| --- |
| **[18]**  Example for empty cases (no activities or all activities are null) which are never a match. |
| | Query | | --- | | **Column1**  ``` "Cases"."Case" ```  **Column2**  ``` MATCH_PROCESS_REGEX ( "Activities"."Activity" , [ ! 'B' ] ) ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : string - Activity : string - Timestamp : date  | Case : string | Activity : string | Timestamp : date | | --- | --- | --- | | '1' | 'A' | Fri Jan 01 2016 01:00:00.000 | | '2' | 'B' | Fri Jan 01 2016 02:00:00.000 | | '3' | *null* | Fri Jan 01 2016 03:00:00.000 |   | Case : string | Activity : string | Timestamp : date | | --- | --- | --- | | '1' | 'A' | Fri Jan 01 2016 01:00:00.000 | | '2' | 'B' | Fri Jan 01 2016 02:00:00.000 | | '3' | *null* | Fri Jan 01 2016 03:00:00.000 |    **Cases**  | Case : string | | --- | | '1' | | '2' | | '3' | | '4' |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : string | Column2 : int | | --- | --- | | '1' | 1 | | '2' | 0 | | '3' | 0 | | '4' | 0 | | |

#### Example

|  |
| --- |
| **[19]**  Matches every variant that contains a sequence of `'A'`, `'B'`, `'C'`, and `'D'`. Activities `'A'` and `'B'` are renamed to `'AliasA'` and `'AliasB'`, respectively. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , 'B' AS AliasB , 'A' AS AliasA , AliasA >> AliasB >> 'C' >> 'D' ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | |

|  |
| --- |
| **[20]**  If we want to use both, Match start and aliases, then the first alias has to be the one containing the start symbol `^` inside of it's alias definition. |
| | Query | | --- | | **Filter**  ``` FILTER MATCH_PROCESS_REGEX ( "Activities"."Activity" , ^ 'A' AS AliasA , 'B' AS AliasB , AliasA >> AliasB >> ( ANY ) + ) = 1; ```  **Column1**  ``` "Activities"."Case" ```  **Column2**  ``` "Activities"."Activity" ``` | |
| | Input | Output | | --- | --- | | **Activities**  Filter  - Case : int - Activity : string - Timestamp : date  | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |   | Case : int | Activity : string | Timestamp : date | | --- | --- | --- | | 1 | 'A' | Fri Jan 01 2016 01:00:00.000 | | 1 | 'B' | Fri Jan 01 2016 02:00:00.000 | | 1 | 'C' | Fri Jan 01 2016 03:00:00.000 | | 1 | 'D' | Fri Jan 01 2016 04:00:00.000 | | 2 | 'E' | Fri Jan 01 2016 05:00:00.000 | | 2 | 'F' | Fri Jan 01 2016 06:00:00.000 | | 2 | 'G' | Fri Jan 01 2016 07:00:00.000 | | 2 | 'I' | Fri Jan 01 2016 08:00:00.000 |    **Cases**  | Case : int | | --- | | 1 | | 2 |        **Foreign Keys**  |  |  | | --- | --- | | Cases.Case | Activities.Case | | **Result**  | Column1 : int | Column2 : string | | --- | --- | | 1 | 'A' | | 1 | 'B' | | 1 | 'C' | | 1 | 'D' | | |

## See also:

- [Process](process.html "Process")


---

## pql/process/monitoring-changes-with-process-navigator

# Monitoring changes with Process Navigator

You can keep up to date with changes using subscriptions and insights. Subscriptions let you see any changes that have been made to things you’re interested in, and insights give you information on changes that have been made during a set time period. For example, if you’ve been out of the office, you can use insights to quickly see what’s changed in your absence.

Subscription updates are sent as email digests, and are either about a change to a specific process (a *static* subscription) or about all changes made to your process (a *dynamic* subscription).

**Note**

The email digests contain links to the latest changes in your workspace. These links are version dependent.

Expand all

[## Viewing your subscriptions](#UUID-85269a81-f51b-5f0a-aa8e-0cf80228d9ef_section-idm4535332918521634282513860849_body)

Click the subscriptions icon to see all your subscriptions. You can view your subscriptions and add new subscriptions in both **My Overview** and the **Process Journal**.

[## Setting up a static subscription](#UUID-85269a81-f51b-5f0a-aa8e-0cf80228d9ef_section-idm4575568133081634282514301091_body)

1. In **My Overview**, select a type category.
2. Hover your cursor over a process or content.
3. Click **Details**.

   |  |
   | --- |
   |  |

   A pop-up window appears.
4. Click **Subscribe**.
5. Select a static group.
6. Click **Save**.

[## Setting up a dynamic subscription](#UUID-85269a81-f51b-5f0a-aa8e-0cf80228d9ef_section-idm4576178576521634282528222864_body)

1. Click **Subscriptions** > **+Group** > **Dynamic Group**.
2. Enter:

   1. A group title.
   2. The owner of the group.
   3. Filters you want to use to determine the members of the group.
3. Click **+Type** to define each of your filter criteria.

**Note**

The filters use INCLUDES and OR to combine criteria like location and role.

### Editing a group

1. Click **Subscriptions**.
2. Select the group you want to edit.
3. Click the gear icon for that group.
4. Select **Edit group**.
5. Make your changes.
6. Click **Save**.

[## Accessing Insights](#UUID-85269a81-f51b-5f0a-aa8e-0cf80228d9ef_section-idm4587881677568034282537498574_body)

1. In the Process Navigator home page, scroll down to **Some Insights**.
2. Use the search and filters to find processes or content that meet your criteria.
3. View the **Type of change** information in the results for more information or click individual processes or content.

   |  |
   | --- |
   |  |

**Tip**

If the **State** panel indicates there have been changes but these aren’t displaying in your results, try disabling **My Filters**.

## Related topics

- [Searching and filtering in Process Navigator](searching-and-filtering-in-process-navigator.html "Searching and filtering in Process Navigator")
- [Action Center](action-center.html "Action Center")


---

## pql/process/process

# Process

## Description

Process functions perform calculations based on the Case-Id and the Activity column of the event log.

While the Case-Id column is determined by the settings in the Data Model editor, the Activity column can be chosen freely for most process functions. The Activity column can also be preprocessed with other functions. For example with [REMAP\_VALUES](remap_values.html "REMAP_VALUES"), grouping and hiding of activities can be achieved.

## Grouping

|  |
| --- |
| **[1]**  REMAP\_VALUES groups B and C by mapping both to the same activity label. |
| | Query | | --- | | **Column1**  ``` REMAP_VALUES ( "Table1".ACTIVITY , [ 'B' , 'BC' ] , [ 'C' , 'BC' ] ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : int - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : int | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | 1 | 'A' | Tue Jan 01 2019 13:00:00.000 | | 1 | 'B' | Tue Jan 01 2019 13:01:00.000 | | 1 | 'C' | Tue Jan 01 2019 13:02:00.000 |   | CASE\_ID : int | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | 1 | 'A' | Tue Jan 01 2019 13:00:00.000 | | 1 | 'B' | Tue Jan 01 2019 13:01:00.000 | | 1 | 'C' | Tue Jan 01 2019 13:02:00.000 | | **Result**  | Column1 : string | | --- | | 'A' | | 'BC' | | 'BC' | | |

## Hiding

|  |
| --- |
| **[2]**  REMAP\_VALUES hides activity B by mapping it to null. |
| | Query | | --- | | **Column1**  ``` REMAP_VALUES ( "Table1".ACTIVITY , [ 'B' , NULL ] ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : int - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : int | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | 1 | 'A' | Tue Jan 01 2019 13:00:00.000 | | 1 | 'B' | Tue Jan 01 2019 13:01:00.000 | | 1 | 'C' | Tue Jan 01 2019 13:02:00.000 |   | CASE\_ID : int | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | 1 | 'A' | Tue Jan 01 2019 13:00:00.000 | | 1 | 'B' | Tue Jan 01 2019 13:01:00.000 | | 1 | 'C' | Tue Jan 01 2019 13:02:00.000 | | **Result**  | Column1 : string | | --- | | 'A' | | *null* | | 'C' | | |


---

## pql/process/process_order

# PROCESS\_ORDER

## Deprecated

**Warning**

Please use [INDEX\_ACTIVITY\_ORDER](index_activity_order.html "INDEX_ACTIVITY_ORDER") instead.

## Description

PROCESS\_ORDER returns the position of each activity within a case. Only not null activities are counted.

## Syntax

```
PROCESS_ORDER ( activity_table.column )
```

- **column**: A column of an activity table.

## Examples

|  |
| --- |
| **[1]**  Example with two cases in which each activity is taken into account. |
| | Query | | --- | | **Column1**  ``` PROCESS_ORDER ( "Table1"."ACTIVITY" ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:04:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:04:00.000 | | **Result**  | Column1 : int | | --- | | 1 | | 2 | | 3 | | 1 | | 2 | | |

|  |
| --- |
| **[2]**  Example with two cases in which only B values are taken into account. |
| | Query | | --- | | **Column1**  ``` PROCESS_ORDER ( REMAP_VALUES ( "Table1"."ACTIVITY" , [ 'A' , NULL ] ) ) ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:04:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:01:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:02:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:03:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:04:00.000 | | **Result**  | Column1 : int | | --- | | *null* | | 1 | | 2 | | *null* | | 1 | | |

## See also:

- [INDEX\_ACTIVITY\_ORDER](index_activity_order.html "INDEX_ACTIVITY_ORDER")


---

## pql/process/process-ai

# Process AI

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The process AI is a default analysis that allows you to detect and analyze deviations from the most common path.

The process AI provides you an easy overview of the process deviations:

1. **Most common path**: Displays the most common flow of activities within your process.
2. **KPIs**: Displays predefined KPIs such as case count and activities count.
3. **Edit/add KPIs**: Edit the currently displayed KPIs or add new custom KPIs.
4. **Detected deviations**: Displays the activities that cause the most deviations from the common path. Celonis calculates how many of your cases are affected and how that affects your business.
5. **Sorting**: You can sort the detected deviations by the KPIs.
6. **Root cause analysis**: You can perform a root cause analysis that leverages our process intelligence to identify the reasons for the selected deviation.


---

## pql/process/process-attributes

# Process attributes in Insight Explorer

Process attributes leverage Celonis’ process mining capabilities to describe various aspects of your process. They are included by default in the set of attributes Insight Explorer uses to find associations. In order to use process attributes, make sure the object you are analyzing has an event log. Insight Explorer supports the following process attributes.

Filter

- Process attribute
- Description
- Visualization

| **Process attribute** | **Description** | **Visualization** |
| --- | --- | --- |
| Number of Distinct Events | Number of distinct events in the process | Process complexity |
| Total Throughput Time | Time between the first and last events | Long-runners |
| First Event | Name of the first event that occurs in the process |  |
| Last Event | Name of the last event that occurs in the process |  |
| Day of First Event | Day of the week on which the first event falls | High demand |
| Event Occurrence | Indicates whether each event occurs in the process | Undesired event    Skipped event |
| Event Rework | Indicates whether each event occurs more than once in the process |  |
| Edge Occurrence  `coming soon` | Indicates whether each edge occurs in the process | Wrong order    Ping pong |
| Edge Throughput Time  `coming soon` | Classifies each edge as **Bottleneck** or **Rushed** based on the deviation of its throughput time from the median | Bottleneck    Rushed |
| Event Attribute  `coming soon` | Takes the value of each attribute of each event | Example: Event automation |

| **Process attribute** | **Description** | **Visualization** |
| --- | --- | --- |
| Number of Distinct Events | Number of distinct events in the process | Process complexity |
| Total Throughput Time | Time between the first and last events | Long-runners |
| First Event | Name of the first event that occurs in the process |  |
| Last Event | Name of the last event that occurs in the process |  |
| Day of First Event | Day of the week on which the first event falls | High demand |
| Event Occurrence | Indicates whether each event occurs in the process | Undesired event    Skipped event |
| Event Rework | Indicates whether each event occurs more than once in the process |  |
| Edge Occurrence  `coming soon` | Indicates whether each edge occurs in the process | Wrong order    Ping pong |
| Edge Throughput Time  `coming soon` | Classifies each edge as **Bottleneck** or **Rushed** based on the deviation of its throughput time from the median | Bottleneck    Rushed |
| Event Attribute  `coming soon` | Takes the value of each attribute of each event | Example: Event automation |

## Related Topics

- [Configuring an Insight Explorer](configure-insight-explorer.html "Configuring an Insight Explorer")


---

## pql/process/process-cockpit

# Process Cockpit

Process Cockpit is a functionality that lets you view and use live process mining data from the Celonis Platform in your Process Navigator process models. Once a connection to the Celonis Platform has been set up and configured, live data will be displayed in Process Navigator at task and process level. KPIs from Celonis Platform knowledge models can also used in your process models.

Expand all

[## Using Process Cockpit](#UUID-63bcc60a-febd-5faf-4dae-3b594dd71ed7_section-idm234688944655108_body)

To use Process Cockpit, log into Process Navigator and open a process. If live data is configured for this process, it will be automatically displayed as a live data card.

Live data card in the Process Model view (left) and Process Journey view (right)

**Note**

If live data **is** configured, but does not appear in your process, you will receive a warning message in the bottom-right corner of the screen indicating that no live data is available for the selected date range.

### Changing the date range

To switch the selected date range, click on your initials in the top-right corner to open the user menu. Click **Live data date range** to adjust the range length. By default, the date range is set to the last 30 calendar days.

## Related topics

- [Activating and configuring live data](activating-and-configuring-live-data.html "Activating and configuring live data")
- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Searching and filtering in Process Navigator](searching-and-filtering-in-process-navigator.html "Searching and filtering in Process Navigator")


---

## pql/process/process-component-settings-in-celonis-analyses

# Process component settings in Celonis Analyses

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- Every component in the analysis can be configured individually.
- The settings of any component can be accessed by double-clicking the component or right-clicking the component.
- The components can be configured only in edit mode.

## Process Explorer and Variant Explorer - General Settings

|  |
| --- |
|  |

The process and variant explorer settings include General options, Activity grouping, and Activity color options.

1. Switch between the settings panels with the dropdown at the top.
2. Define a component title.
3. You can customize which column in your dataset is used as an activity node. **(Process Explorer Only!)**
4. To customize the process explorer nodes, you can add icons to the hexagons and it is possible to show and hide the start and end node of the process explorer. **(Process Explorer Only!)**
5. In the layout options, you can define if the component has a border and set the background color.
6. You can deactivate the effect of selections on the component. If active the component will not be filtered down by the selections on the selection bar.

**Custom Process Nodes**

If you customize the column for the activity nodes you have to ensure, the PQL query is joined correctly to Eventlog. You either only take values from within the Eventlog or use a PU\_FUNCTION to pull it on eventlog level.

It is only possible to use String values as activities.

## Process Explorer and Variant Explorer - Groups

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |

Groups are component-specific and not shared between the different Process Explorers or Variant Explorers.

1. Create a new group by clicking **New group**.
2. Existing groups are listed below and can be edited with a click on the list entry.
3. On edit or creation of a new group, you can define the name.
4. And select which activities will be grouped together.
5. The group will be shown in the Process Graph as a new Activity Node. You can collapse and expand the group with a click on the carrot icon.

## Process Explorer and Variant Explorer - Colors

|  |
| --- |
|  |

On the color options you can define the hexagon color for each activity node:

1. All activities in the Eventlog are listed.
2. Click the color picker and select the color for the hexagon.

## Throughput Time Search

|  |
| --- |
|  |

The throughput time search settings include general options and appearance settings of the component.

1. Define a component title.
2. Change the throughput model calendar. The data model calendar defines which days and working hours to take into consideration for a more precise throughput time calculation.
3. Customize the color in which the throughput time is displayed in the component.
4. In the layout options, you can define the thickness, style, color, and opacity of the component's border.
5. You can customize which column in your data set is used as an activity node.
6. In the histogram options, you can choose to hide the throughput time histogram to display only the value of the throughput time on the component. You can also choose to disable selections so the user is not able to drill down onto certain epochs of the throughput time calculation.
7. Color settings allow you to change the colors of the histogram and set a color mapping according to chosen thresholds.
8. You can deactivate the effect of selections on the component. If active the component will not be filtered down by the selections on the selection bar.

## Activity Explorer

|  |
| --- |
|  |

The Activity Explorer settings include general options and appearance settings of the component.

1. Define a component title.
2. Change the metrics between absolute numbers (case count) or relative (percent).
3. In the layout options, you can define the thickness, style, color, and opacity of the component's border.
4. Change the colors of the numerical value in 'Text color' and of the graphical part in 'Series color'.
5. You can deactivate the effect of selections on the component. If active the component will not be filtered down by the selections on the selection bar.


---

## pql/process/process-components-in-celonis-analyses

# Process components in Celonis Analyses

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The Celonis Process components visualize your as-is process in Celonis Analyses.

## Process Explorer

The process explorer initially shows the Happy Path.

1. Add and remove single activities.
2. Add and remove edges.
3. Zoom in and out on the process graph.
4. Click activities to select all cases flowing through, not flowing through, starting or ending with the activity.
5. Click an edge to select all cases with or without the edge.
6. Switch the KPI shown on the Process Explorer.
7. Start the animation.
8. Hide and show single activities from the process.

**Note**

The Happy Paths show you the most frequent starting activity and the most frequent ending activity as well as all edges and other activities that are included in the variant connecting those two.

## Process Explorer Animation

|  |
| --- |
|  |

The process animation can be started at the top left of the Process Explorer. You can:

1. Animate the cases grouped by day.
2. Animate the cases grouped by hour.
3. Animate each case individually (limited to max. 1000 at once. Filter down to activate on large datasets).
4. The cases are shown in pink bubbles and move according to their throughput time.
5. The animation can be stopped and its speed defined.
6. The current position in the event time can be selected.
7. The animation can be stopped.

## Variant Explorer

The variant explorer will show all process variants within the event log. You can control which variants are shown in the following way:

1. The histogram on the right shows the distribution of variants and you can select which of those are shown by drag and drop.
2. Add and remove single variants or reset the explorer.
3. Change the sorting of the variants on the right side.
4. Filter on the currently visible variants.
5. Click single activities to create a selection on cases flowing through, not flowing through, starting with or ending with the activity.
6. Cli single edges to create a selection on cases with the connection or without the connection.
7. Change the KPI shown on the explorer.
8. Hide and show KPIs on the graph.
9. Switch to a list representation of the variants.

**Note**

A variant is an end-to-end trace through the process activities. Each case follows exactly one variant.

## Throughput time search

The throughput time search allows you to analyze the throughput times on your process' connections.

1. The histogram shows the case distribution on the edge's throughput time. Click and drag to select and drill down.
2. Click the calculation method and change it between: Median, average, trimmed mean, maximum and minimum.
3. Click the unit to change between: days, hours, minutes and seconds.
4. Click the activity names to select the start and end activity for the throughput time calculation.
5. Click the selection icon and set a crop selection for the currently chosen activities.

## Activity search

The activity explorer shows detailed information on single activities.

1. The chart shows the coverage of the activity compared to the total event log.
2. Click the activity name to select from all activities in the event log.
3. Click the metric to change between: Cases flow through, cases don't flow through, cases start with and cases end with.
4. Click the selection icon to select all cases currently covered with the components ratio.


---

## pql/process/process-connector-installation

# Using process connector templates

Process connectors templates contain pre-configured data pipelines for a specific business process, with over 20 source systems and their related business processes supported. Using a process connector templates enables you to connect to a source system, pull in the data from it, and then transform the data to create event logs and data models.

Using process connector templates give you the following benefits:

- **Accelerate your setup:** You can skip the manual build process by using pre-configured data pipelines.
- **Follow a guided installation**: When you click Install Connector, the platform walks you through a structured, step-by-step process. Even if you need to provide specific source system details, the data pool will load automatically once you've entered the required information.
- **Manage your access rights**: Your options will change based on your specific permissions. If you have the right license, you can Install Connector immediately; if not, you can Request Access directly through the interface and you'll receive an email notification once you're cleared to proceed.
- **Review process overviews**: Before you commit to an installation, you can explore the overview page for any business process. This gives you a clear look at screenshots, system requirements, and links to specialized documentation so you know exactly what to expect.

Expand all

[## Creating a data pool from a process connector template](#UUID-557a37d9-c532-bf96-db8d-a422b8b021ef_section-id235491155032801_body)

To create a data pool from a process connector template:

1. Click **Data - Data Integration**.
2. Click **+ New Data Pool**.

   |  |
   | --- |
   |  |
3. Select **Start with a Process Connector template**.

   |  |
   | --- |
   |  |
4. Find the business process you want to use and open its overview page. This overview page contains screenshots, a short description, your system requirements, and any additional documentation available.
5. Click either **Install Connector** or **Request Access**, with your option here depending on your Celonis platform permissions and license.

   **Install connector**: If installing the connector, you may be asked to provide additional source system information. This is a guided process, with the data pool loading automatically once the required details have been entered.

   |  |
   | --- |
   |  |

   **Request access**: If requesting access to a process connector, you will be asked for further details about your request. You will be contacted via email once your request has been processed. You should then return to this process and click Install Connector to proceed.

## Related topics

- [Team-to-team copy](copying-multiple-assets-between-teams.html "Copying multiple assets between teams")
- [Versioning](data-pool-versioning.html "Data pool versioning")
- [Data pool parameters](data-pool-parameters.html "Data pool parameters")


---

## pql/process/process-context

# Adding process context to Process Orchestration

The process context is an important part of the Orchestration Engine system, as it holds all the external information about the execution of a specific Process Orchestration version instance. Process context exists in form of an Action Flow module in your Studio package.

The module is automatically created when you create the first Action Flow from the Process Orchestration. See [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration"). You can also add process context in the form of a module in your Action Flow manually.

Expand all

[## Before you begin](#UUID-1d962a94-b4de-ccb2-6453-48bfce445297_section-id235283507613644_body)

- Make sure to set your Action Flow to **on demand**.
- In your Action Flow, add a new input called `dpInstanceId` and set the input type to text. Note that the input name value is case-sensitive.

  |  |
  | --- |
  |  |

[## Adding Get Process Content module to Action Flow](#UUID-1d962a94-b4de-ccb2-6453-48bfce445297_section-id235283508573317_body)

1. In Studio, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Celonis** > **Get Process Context**.
3. Add a connection to the module:

   - If there's an existing Process Orchestration in this Studio package, you will see the Orchestration Engine connection in the list.
   - If there's no Process Orchestration in this Studio package, you have to create the OAuth connection manually before you can add it to this module. To learn how to do that, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").
4. In the **Digital Process Instance ID**, use the `dpInstanceId` variable.
5. Save your changes.

Once you publish and run the Action Flow, you will see all process context for this automation. We advise testing your setup before deployment. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

### Related topics

- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Action Flow modules in Process Orchestration](action-flows-in-process-orchestration.html "Action Flow modules in Process Orchestration")
- [Action Flows](action-flows.html "Action Flows in Celonis Platform")


---

## pql/process/process-designer

# Process Designer

Process Designer is a cloud-based Business Process Management (BPM) tool that enables you to model, manage, and optimize your business processes collaboratively. It forms part of our Celonis Process Management suite of tools, alongside Process Navigator and Process Cockpit.

## Learn more about Process Designer

The following sections will walk you through setting up Process Navigator, introduce its main features, and explain how to perform basic tasks using the tool. For a more in-depth look at what you can do with Process Designer, see our [Academy course](https://academy.celonis.com/learn/learning-path/model-in-process-desinger?sessionFields=%5B%5B%22type%22%2C%22Course%22%5D%5D).

To help you get started with Process Designer, we recommend reviewing these high-level overviews.

- [Getting started with Process Designer](https://docs.celonis.com/en/getting-started-with-process-designer.html)
- [Navigating Process Designer](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-97374c19-3c69-cd7d-1225-055b1344bb71 "Navigating Process Designer")
- [Understanding content structure](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-7e66fb2f-81eb-60d3-c7f3-ecbd6e4289fb "Understanding content structure")
- [Creating and modeling processes](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a "Creating and modeling processes")
- [Configuring your Process Designer environment](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374 "Configuring your Process Designer environment")

## Accessing Process Designer

Use your [login link](https://docs.celonis.com/en/logging-in-to-celonis-process-management.html) to access Process Designer.

**Tip**

If enabled in the Celonis Platform, you may also be able to access Process Designer from the Celonis Platform Navigation bar. For more information, see [Enabling access to Celonis Process Management](https://docs.celonis.com/en/enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html).


---

## pql/process/process-designer-categories

# Creating and managing process categories

Process categories are the second highest level of structuring within Process Designer, used as a container for your main processes, sub-processes, repository objects, and related content. By creating and using process categories in Process Designer, you can organize and classify your process models, making them easier to navigate, manage, and reuse.

In Process Designer, you start with three default categories. These are suggested categories only, meaning that you can edit, adapt, and delete them if required. You can also create your own categories at any time, organizing your content to suit your organization's structure.

## Default categories: Core, management, and support processes

By default, your process overview page starts with three commonly used categories:

- **Core processes**: This category often includes cross-functional processes that deliver value to clients (or in other words: processes that clients are willing to pay for). They represent essential activities that a business performs to reach its business goals and fulfill its mission.
- **Management processes**: This category can be used for management related processes, such as financial planning, strategy, governance, and leadership initiatives.
- **Support processes**: This category is commonly used for administrative and operational work. This can include human resources, travel and expenses, communication, and license management processes.

In this example, you can see suggested uses for each of the default process categories.

Expand all

[## Creating process categories](#UUID-8cd59698-2ed8-72e9-6089-80de947c2b73_section-idm234899754784888_body)

In addition to using the default categories provided, you can create your own process categories.

To create a category in Process Designer:

1. From the main menu, click **Processes - Architecture**, opening the Process overview page.

   |  |
   | --- |
   |  |
2. Enter a **Category Name** and click **New**.

   |  |
   | --- |
   |  |

   The category is created and listed on the process overview screen.
3. Select the newly created category and edit the category details in the side panel.

   You have the following category options here:

   - **Name**: A text based reference for this category.
   - **Description**: Use the text editor to add further information about this category, helping your team to identify and correctly use it.
   - **Image**: Add a PNG or JPEG file that represents this category. For best quality, upload an image with a ratio of 16:9 and 1300 x 640 pixels in size.
   - **Documents**: Add any documents that are related to this process.
   - **Replace default graphic**: Choose to replace the overview graphic for this category from an existing one within the Process House.
   - **Status**: Select whether to Show or Hide this category.
   - **Permissions**: This displays an overview of existing permissions.
   - **Sorting**: Set the weighting for where this category is sorted in related to others in the Process House. The top level is zero, with subsequent levels typically weighted by 10, 20, 30, 40, and so on.
   - **Hierarchy levels**: Choose which level this category should sit in the category hierarchy by entering a numerical value.
   - **Translate**: Based on your selected languages, you can manually map your descriptions and fields.

   |  |
   | --- |
   |  |

[## Managing existing Process Designer categories](#UUID-8cd59698-2ed8-72e9-6089-80de947c2b73_section-idm23489975489042_body)

As an architect, you can manage existing Process Designer categories by clicking **Processes - Architecture** and selecting the category you want to edit.

|  |
| --- |
|  |

In addition to editing the category details (with full options available above), you can use the toolbar to manage categories.

|  |
| --- |
|  |

The toolbar options here include:

- **Delete category**: This permanently removes the category, with no recovery possible.
- **Move the category**: This allows you to move the category within the Process House, such as moving the category inside another category.
- **Consolidate**: This allows you to merge / consolidate all elements from this category into another one.
- **Link**: Create a shareable link to this category.
- **Favorite**: Add this category to your favorites, giving you easier access to it.
- **Subscriptions**: Add a link to this category to your subscriptions.

## Related topics

- [Repository objects](repository-objects.html "Repository objects")
- [Creating and modeling processes](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a "Creating and modeling processes")
- [Process attributes](managing-process-attributes.html "Managing process attributes")


---

## pql/process/process-designer-function-list

# Process Designer function list

Explore the core capabilities of the Celonis Process Designer. Use the links below to access detailed documentation on modeling standards, system interfaces, and administrative functions.

Expand all

[## Administration](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-71e9ab41-2e44-5a36-82e1-12f8f9de1e83_body)

| Generate printable manuals |  |
| --- | --- |
| Manage manual templates centrally. | Templates for creating manuals are centrally managed in the administration area. |
| Meta-Model (Company Map) |  |
| Configure method | The method is configurable. |
| Hide, rename, or add attributes/objects (Advanced Configuration) | Attributes/objects can be hidden, renamed, or added in the administration area. Changeable attributes/objects are predefined. |
| User Management |  |
| Manage users and user groups. | Users and user groups are created or deactivated in the administration area (deletion is impossible). They are also assigned user roles and permissions there. |
| Authentication |  |
| Authentication provider: Use OAuth | The authentication provider can be configured in the administration area. |
| Authorization Management |  |
| Define permissions for facets. | It is possible to set permissions so only certain user groups can add or edit a facet. |
| Tag Management |  |
| Define Tags | Tags are grouping criteria that can be defined individually (e.g., product groups). They are also relevant as criteria for the scope filter. |
| Review Date |  |
| Set review date | For the continuous improvement of the process world, a review date can be set for each process. Using evaluations, e.g., on the "start page," one keeps an eye on which processes are reviewed and, if necessary, need to be updated. |
| Language Management |  |
| Configure languages (default: DE/EN) | The languages German and English are available by default. Other European and Asian languages can be configured (optional). |
| Configure default or optional language | The default language setting (Default) and other optional languages can be configured. |
| Making languages available for reporting | Reports can be offered in different languages. |
| Create and upload a new user interface language. | It is possible to create and upload new (user interface) languages. |
| Workflows Configuration |  |
| Configure notifications by e-mail or tasks | E-mail notifications about pending requests ( e.g., about a pending approval) are configurable. The areas of application for e-mail notifications are predefined. |
| Adjust release cycle | The approval workflow can be customized by integrating additional approver/authorizer groups or by changing the time span until the validity start. |
| Feature Management |  |
| Enable and disable features. | Certain functionalities/features can be activated or deactivated individually. |
| CI Management |  |
| Customize CI | The workspace in Celonis Process Management can be adapted according to the customer-specific CI. |
| Configurable profiles |  |
| Configure profiles | Profiles are individually configured by the administrator using widgets. They show aggregated information about processes or objects. |
| Create and customize stereotypes (subtypes) for diagrams/objects. | Stereotypes (subtypes) can be created to categorize processes or objects further. The author can create them during modeling. |
| Generate printable manuals |  |
| Configure Manuals | Manuals (process manuals, organization manuals, professional and technical specifications, etc.) can be programmed in Word, and static information, such as headings, images, formatting, etc., can be customized using the normal Word application. Within Celonis Process Management, the different manual templates can be uploaded and activated/deactivated in the administration area. |
| Process Validation |  |
| Define validation rules | Standard validation rules can be defined (within a given framework). |
| Automation |  |
| Configure Service and WebHooks | A Webhook enables an application to provide another application with real-time information, i.e., it receives the data immediately - in contrast to typical APIs where the data would have to be queried very often. This makes Webhooks much more efficient for both providers and consumers. |

[## Architecture](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-1b20ae4b-0e0f-cfed-0d71-3e11bf840cc8_body)

| Organize process architecture |  |
| --- | --- |
| Structure process models hierarchically | Process models (consisting of structure-giving processes and process flows) can be built hierarchically as a navigation tree. The process depth is freely selectable. |
| Move process models | Processes can be moved within their hierarchical structure. Subordinate elements are moved as well. |
| Generate graphical navigation structure automatically. | The navigation tree is also displayed graphically as a "block layout", which can also be used to navigate to the levels below. |
| Sort processes in the architecture with sort number | The sequence of processes within their hierarchical structure can be sorted individually. By default, the processes are sorted alphabetically. |
| Versioning |  |
| Delete not-released diagrams | Processes or objects that are in progress can be deleted. |
| Sort processes in the architecture with sort number | The sequence of processes within their hierarchical structure can be sorted individually. By default, the processes are sorted alphabetically. |
| Consolidation of objects and diagrams |  |
| Consolidate diagrams and objects. | Redundant processes or objects can be consolidated. For this purpose, a master process or object is selected, and the element to be consolidated is assigned. Only processes or objects that have not been released can be consolidated. |

[## Authorizations](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-d9ec823c-7dda-55f9-6882-611b970b811e_body)

| Authorization Management |  |
| --- | --- |
| Authorize editing of diagrams and objects by multiple authors. | Multiple authors can be defined for processes and objects. If no author is defined, any Celonis Process Management user (provided he or she is authorized) can edit a process or an object. |
| Define authorization levels | The administrator stores the characteristics of all possible authorization levels. |
| Assign permissions to individual users or user groups. | The authorization levels can be assigned to specific users or user groups to authorize content editing for specific authors only. |
| Set permissions on diagrams or objects | Each process or object can be assigned appropriate authorization levels and specific users/user groups (optional) |
| Assign permissions for facets. | Authorizations can also be assigned for complete facets (navigation areas, e.g., "risks"). |
| Assign authorizations for architectures. | It is possible to customize rights to build architectures. For example, an author can be authorized to create structural processes (which, by default, only the architect does). |

[## Collaboration](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-398bb7b0-7685-c943-3ad5-9e26853391ec_body)

| Review Workflow |  |
| --- | --- |
| Review: Define Reviewer | So-called "reviewers" can be stored to check the process before starting the release workflow. This can be any Celonis Process Management user. |
| Review: Automatically forward the request to the reviewer | After a status change, the process/object to be checked is automatically forwarded to the reviewer. |
| Review: Notify Reviewer | The reviewer receives a message in his workspace. Feedback to the author can be given via the request function. |
| Request Workflow |  |
| Request: Send request for processes or objects | Every Celonis Process Management user can submit a request, i.e., give feedback on a process or object. |
| Request: Automatically forward the request to the responsible person | The request for a process or object is automatically forwarded to the responsible person (or quality manager, if stored). |
| Request: Display/change the processing status of the request | The person responsible for the corresponding request area can change the initial status. |
| Request: Call process/object directly | The process or object to be released can be accessed directly from the request via a link. |
| Request: Accept or reject the request | The responsible person can accept or reject the request. |

[## Comprehensive Services](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-aa0451ae-1126-1837-0dde-467a8e590c84_body)

| Subscriber Service (will soon be integrated in the favorite management) |  |
| --- | --- |
| Subscribe to content (subscription service) | Processes or objects can be subscribed to. This allows the Celonis Process Management user to track selected content's version history easily. |
| Info-Mail for release changes | The user is notified by e-mail when a new version is released (day/week/month). |
| Subscribe to content with multiple selections. | The multiple selection allows you to select and subscribe to several contents simultaneously. |
| Select subscriptions for categories. | Multiple selection allows you to select and subscribe to several document categories simultaneously. |
| Combine subscriptions and favorites (button with fly-out) | Subscriptions and favorites are summarized in an overview for quick access. |
| Show a list of all changes in chronological order. | Subscription changes are listed chronologically. |
| Favorites management |  |
| Define favorites | Contents can be defined as favorites and called up specifically. |
| Favorite Service: Manage/Group Favorites | Defined favorites can be grouped and managed for individual groups/functions. |
| Favorite Service: Share Favorites | Favorites can be shared with other employees. |
| Favorites service: Info mail in case of version change | Through the integration of the central mail service, the user is informed by mail when a new version of his favored process or object is available. |
| Link Service |  |
| Create permanent links from versions. | Links to specific process or object versions can be generated and inserted into emails or documents for further use. |
| Create permanent links from version independent versions. | Links to specific processes or objects can be generated and inserted into emails or documents for further use. The latest version is automatically displayed. |
| Create permanent links from the selection (in versions) | Links to selected process flow objects can be generated and inserted into emails or documents for further use. The latest version is automatically displayed. |
| Glossary |  |
| Provide a central glossary for all users. | A centrally accessible glossary can be created to provide more detailed explanations of all technical terms or other nomenclatures used. Individual terms in the glossary can be assigned to processes or objects. |
| Mass data editing |  |
| Mass edit linked attributes. | Through mass data processing, attributes linked to processes or objects (in the processing status) can be changed quickly and efficiently, e.g., when changing responsibilities or setting scope filters. |
| Training Assistant |  |
| Use the Training Assistant app to communicate specific expertise. | Employees and their managers can thus individually view, plan, and manage upcoming training on different end devices. Defined roles are assigned to positions created in the organizational structure. This identifies the corresponding users for whom a specific training will be generated. |
|  |  |

[## Customer Journey](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-38404b42-2341-e5bf-b6e7-310ec7d8bdda_body)

| Manage Customer Experience |  |
| --- | --- |
| Define customer experience management models. | Customer Experience Management is a marketing instrument that describes the cycles of a customer journey (from awareness of a product/service to purchase and long-term customer loyalty). Celonis Process Management's process world can be combined with a customer trip in a uniform management system. |
| Modeling Customer Journey Maps | The Customer Journey Map is built up by individual Customer Journey Steps and depicts the chronological sequence of steps as a customer/person moves to their destination. The goals can be different and changed by strategic touch points or further information. |
| Generate Customer Journey Map | An aggregated graphical representation of all customer journey steps with additional information, such as linked processes, in the form of a configurable "profile" (matrix) is possible. |
| Define customer touchpoints | The customers' touch points with the company are defined. They form the interface between the customer, the brand, the internal company process, and the persona (the potential customer). |
| Define Stakeholders | The list of all stakeholders with direct or indirect contact with customers illustrates the complexity of service provision and helps identify potential for improvement. |
| Determine and define personas. | Personas reflect certain persons/target groups with their respective typical characteristics. These include characteristics such as purchasing behavior, interests, age, etc. |
| Survey and define the voice of the customer | Collecting customer requirements (voice of the customer) is also important for creating a comprehensive customer journey map. Here, the expectations, likes, and dislikes of the customer are described. |
| Define distribution channels | All distribution channels are listed. They are closely related to the TouchPoints. |

[## Document Management](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-f79a97f1-7b0b-5b8e-410f-db3317693e6e_body)

| Digital documents |  |
| --- | --- |
| Create document templates for processes and documents | Individual document templates can be created for processes and documents. |
| Edit document templates for processes and documents | Content is extended as free text and formatted in the HTML editor. |
| Release document templates for processes and documents | Document templates for processes and documents must be approved. |
| Create document templates for the remaining facets | For other facets (navigation areas, e.g., "risks"), individual document templates can be created |
| Edit document templates for other facets | Content is extended as free text and formatted in the HTML editor. |
| Release document templates for other facets | Document templates for other facets (navigation areas, e.g. "Risks") must be released. |

[## Evaluations](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-28e3277d-0d25-9889-08cd-c81ce2089780_body)

| Evaluation of object links |  |
| --- | --- |
| List connected diagrams and objects in an evaluation group as links | An aggregated representation of all linked processes and/or objects in a configurable "profile" is possible. These can be called up directly via a link. |
| Audit Trail |  |
| Display version history of all versions of diagrams and objects | An audit trail is used for quality assurance and presents the entire history of process version changes in an audit-compliant manner. |
| Generate printable manuals |  |
| Generate standard manuals as Word files. | Standardized manuals can be generated automatically or manually as Word files. |
| Generate process graphics as Word files. | The quick print function allows process graphics to be printed quickly as a Word file. |
| Generate individual customer evaluations as Word files. | Evaluations are individually configured and output as Word files. |
| Open-generated PDF manuals. | Manuals in PDF format are available and can be opened. |
| Automatically generate PDF manuals upon approval. | Manuals in PDF format are automatically generated upon approval. |
| Personal settings |  |
| Role entry for all employees with connected home page | Roles can be selected individually, allowing you to enter the process world. |

[## Filtering](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-6b8cb1d4-00dd-cce4-0273-54d1ad9ced94_body)

| Global filtering |  |
| --- | --- |
| Adjust the navigation tree on the left and the graphical display according to the set scope filter. | Filtered-out processes or objects are graphically grayed out and no longer displayed in the navigation tree. |
| Apply Scope filter to processes and objects in list view (can be activated/deactivated) | Processes or objects can be displayed in the list view. The search results list can be further narrowed down by restricting the search to the scope (Scope filter). |
| Enable filtering for manuals. | The extension of the standard filtering for manuals is also possible. |

[## Interfaces](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-c467b143-34c3-1c55-a39a-22015cd3c9b0_body)

| Import and export process models |  |
| --- | --- |
| Export BPMN 2.0 diagram | Exports of processes or objects in BPMN format can be transferred to other systems. |
| Import BPMN 2.0 diagram | Imports of processes or objects in BPMN format from other systems are possible. |
| Export Process Designer Diagram | Exports of processes or objects in Process Designer data format makes transferring content from one database to another possible. |
| Import Process Designer Diagram | Imports of processes or objects in Process Designer data format make it possible to transfer content from one database to another. |
| Import XML | Import of processes or objects in XML format from other systems is possible. |
| Import ARIS | Processes and objects can be converted from ARIS to Process Designer. The exact mapping must be specified individually in advance (additional service). |
| Import Word documents |  |
| Import Word document (prerequisite: configured import template) | Imports of processes or objects in Word format are possible. An import template must be configured for exact mapping (additional service). |
| Visio Importer | Processes and objects can be converted from Visio to Process Designer. The exact mapping must be specified individually in advance (additional service). For further information, see [Using the Visio Importer](https://developer.celonis.com/cpm/admin/services/visio-importer/usage/). |

| Mass data processing |  |
| --- | --- |
| Export Excel mass data processing (translation) | Exports for efficient translation of mass data in Excel format are possible (additional service). |
| Import Excel mass data processing (translation)  Import Excel mass data processing (translation) | Imports for efficient translation of mass data in Excel format are possible (additional service). |
| Architecture Excel Importer |  |
| Import and update organizational hierarchy. | Initial organization import of provided third-party system data, such as SAP HCM. Additionally, continuous updates of the organization's data are possible. The use of the importers requires individual service to enable the correct import and update (additional service). |
| Import and update IT architecture | The IT architecture was initially imported from the third system data provided. Additionally, continuous updates of the IT data are possible. The use of the importers requires individual service to enable the correct import and update (additional service). |
| Import and update risk and control architecture | The risk and control architecture is initially imported from the data provided by the third-party system. In addition, the risks and controls can be continuously updated. The use of the importers requires individual service to enable the correct import and update (additional service). |
| Requirements can be imported and updated. | Initial import of requests from provided third system data. Additionally, a continuous update of the requirements is possible. The use of the importers requires individual service to enable the correct import and update (additional service). |
| REST API interface |  |
| Open REST API interface to Process Designer | New site coming |

[## Method Standard](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-737f8822-662e-865f-9e32-051b0104396c_body)

| Meta-Model (Company Map) |  |
| --- | --- |
| Use BPMN 2.0 standard. | Process modeling is carried out according to the BPMN 2.0 modeling standard about the process flow and the available symbols. |
| Extended BPMN 2.0 standard modeling standard | Centrally managed objects (such as risks, standards, etc.) can be added to the processes. |
| ArchiMate 3.0 Standard | The ArchiMate 3.0 standard is an open and independent modeling language for enterprise architectures. Celonis Process Management offers the possibility to model IT architectures in this standard and thus makes a decisive contribution to the implementation of Enterprise Architecture Management (EAM) |
| Build IT landscape | The IT landscape can be depicted in the uniformly designed hierarchical Celonis Process Management structure. |
| Map and manage organizational structure, including positions | The organizational structure can be mapped and edited in a uniformly designed hierarchical structure. |
| Implement Customer Experience Management (CEM) | For practical implementation of the CEM, Celonis Process Management offers the option of defining a customer journey. All points of contact between a customer and the company are graphically displayed to optimize interactions and achieve long-term customer loyalty. |
| Customer Journey Mapping | The customer journey is displayed in the form of a customer journey map. Celonis Process Management maps the mapping method required for this. |
| Create strategy and target diagrams (target trees, measures including status, etc.) | Strategic strategy and target diagrams can be displayed hierarchically and linked to measures and (optionally) their status. |
| Define key figure trees and reports with report chapters. | With Celonis Process Management's key figure system, even better control of the company is possible. The KPI system allows mapping KPIs in driver trees (KPI architecture). With the combination of the strategy view and the KPI system, customers can establish a balanced scorecard in Celonis Process Management and communicate this continuously throughout the organization. By continuously measuring the key performance indicators, the achievement of objectives is checked, and the company can react to changes early. Furthermore, the key figures can be linked to processes, IT application systems, and other views in Celonis Process Management. The connection between the goals (the strategy) because of key performance indicators and the processes ensures the fastest possible implementation in the organization and for each employee. In addition to the key figure driver tree, reports with report chapters can be displayed. This enables companies to map the annual report chapter structure, for example, and link the necessary key figures in the various report chapters. This will also enable companies to generate company reports from Celonis Process Management in the future. Celonis Process Management is thus increasingly digitizing corporate management. |
| Set up product portfolio. | A clear presentation of a product portfolio and the linking of relevant attributes with the process landscape is possible. |
| Manage Skills | Skills can further specify the positions stored in the organizational structure. Thus, the organizational structure can be optimally linked with the skills required for the job. |
| Manage Learnings and Training | The training and learning units relevant to implementing BPMN can be mapped and connected to the relevant processes. |
| Present risk/control management | Risks and controls of a process can be depicted in a hierarchical structure and assigned to processes. |
| Manage requirements | Requirements and solutions are definable and can be linked to stored solutions. |
| Deposit standards and standard chapters | The standards required for the process flow (e.g., ISO) and corresponding standards chapters can be defined. |

[## Modeling](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-7c1d6eb0-81a2-3fa6-bb6b-791d754ffe3f_body)

| Central property management |  |
| --- | --- |
| Reuse objects (roles, organizational units ...) | Objects stored in the repository are managed centrally and can be linked to processes or organizations as often as required. |
| Create a suggestion list when entering glossary names (Auto-Complete function) | Available objects are quickly found by entering the first 2-3 letters and can be selected from a list. |
| Search for objects in lists and architectures via a dialog. | Objects can be searched for keywords. Specific fields or criteria can further filter the result list. |
| Upload and link attachments. |  |
| Add attachments as links. | Attachments to further process information can be stored as internal links (e.g., to documents on SharePoint) or external links (e.g., to websites). |
| Upload attachments (documents) | Attachments (further process information, such as documents) can be uploaded to Celonis Process Management.  The following file formats are accepted when uploading attachments:  |  |  |  |  | | --- | --- | --- | --- | | - bmp - bpmn - doc - docx - dot - dotx - gif - html - jpe - jpeg - jpg | - pdf - png - pot - potx - ppa - pps - ppsx - ppt - pptx - ps1 | - rtf - sldx - sql - svg - symx - tif - tiff - vdx - vdsx - xla | - xlam - xls - xlsb - xlsm - xlsx - xlt - xltm - xltx - xml - zip | |
| Upload images and visualize them directly. | Images can be uploaded in various formats (jpeg, png, etc.) and displayed directly. |
| Intelligent linking of plants directly with connected systems (additional services) | Plants and connected systems can be linked (additional services). |
| HTML text fields |  |
| Formatting descriptions with HTML editor | The HTML editor can make format adjustments (e.g., font size and image uploads) in the description text field. |
| Global Filtering |  |
| Define scope (scope filter) via organization, locations, and tags. | With the Scope filter, processes, and objects can be filtered according to their respective scopes. Relevant here are organizations, locations, and freely definable tags. The filter criteria must be maintained throughout the scope filter to make it efficient. Empty filter entries can be hidden in the search result. |
| Automatic saving |  |
| Save intermediate states of the modeling automatically (Auto-Save) | The current modeling status is automatically saved at regular intervals to avoid data loss and possible duplication of work. |
| Copy and move content. |  |
| Copy process flow objects within a diagram | One or more process flow objects are marked and copied within the diagram. |
| Copy process flow objects to another diagram. | One or more process flow objects are marked and copied to another diagram. |
| Cut out process flow objects within a diagram (drag and drop) | One or more process flow objects are marked and moved within the diagram. |
| Cut process flow objects into another diagram (drag and drop) | One or more process flow objects are selected and moved to another diagram. |

[## Objects](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-1c45e78a-1184-24b9-22b8-0e2cb4d41951_body)

| Central property management |  |
| --- | --- |
| Model and define objects | Objects can be created in a hierarchy and/or list structure. Processes to which they are linked are listed. |
| Detail objects with HTML editor attributes | Objects can be graphically designed and further detailed. |
| Detailing objects with attributes | You can add further attributes to objects. |
| Connecting objects with other objects | Specific mutual linking possibilities can represent dependencies of glossary elements. |
| Release Object Versions | Objects can be released analogous to processes. If the author and the person responsible are the same person, release by this one person is possible. |
| Create an object version. | New versions of (released) objects can be created to revise them. |
| Consolidate objects | Redundant objects can be consolidated with others if they have not already been linked to processes. |
| Filter objects | In the list view, objects can be filtered by name, and you can also search by name. |
| Create IDs for objects. | Each versionable element can be assigned a unique ID number. The ID number to be generated can be defined so that, for example, a prefix also facilitates assignment to the information type. |
| Structure objects hierarchically | The majority of objects can be displayed in a hierarchical structure, which can be deactivated individually (e.g., for systems). |
| Disable architecture in the system facet | The hierarchical structure/architecture can be deactivated for the SYSTEMS facet. This serves to optimize performance. |
| Organise inputs/outputs in your architecture | Objects can be sorted hierarchically and by category in the "Business Objects" facet. |
| Store documents and link them to processes | Documents or other attachments can be added to the objects, which can then be assigned to processes. |
| Evaluation groups Display connections to other objects/diagrams. | You can see which processes are used for each object. The objects are grouped for a clearer presentation. |

[## Organization Modeling](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-83c7e789-9a6e-764f-04a4-5548944162ad_body)

| Organization Management |  |
| --- | --- |
| Define organizational models/diagrams. | Organization charts are modeled hierarchically. |
| Automatically generate organizational models/charts graphically. | Organization charts are automatically displayed as graphics. |
| Add and define positions in the organization model. | Positions can be defined and detailed within the organization. |
| Detail organizations with attributes and related objects | Organizations are further specified by additional linked information. |
| Define groups with positions and further details. | Groups (e.g., committees) and their AKVs can be created and assigned to corresponding organizations or positions. |
| Location Management |  |
| Define and detail locations (locations) | Company locations can be created and linked to processes or organizations. They are also used as filter criteria (Scope Filter). |
| Skill Management |  |
| Define skills centrally | Required skills can be defined and detailed. This is relevant for the exact specification of positions or roles. |
| Maintain existing user skills. | Defined skills can be assigned roles clustered by work experience (newcomer to master). |
| Maintain the required skills in the position. | Defined skills can be assigned to positions and clustered by work experience (newcomer to master). Job descriptions can be derived from this. |

[## Process Modeling](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-a2c0ca5a-27ec-e59b-c76d-43f3ec50b699_body)

| BPMN 2.0 Process Modeling |  |
| --- | --- |
| Modeling processes according to the modeling standard BPMN 2.0 | Celonis Process Management supports the BPMN 2.0 modeling standard, enabling all business processes to be modeled, defined, and optimized transparently and in a uniform language. |
| Extend processes with data objects and attributes (eBPMN 2.0 extension) | With the eBPMN 2.0 extension, further objects/object connections and standard attributes can be displayed. This offers the user different process detailing, publishing, and evaluation possibilities. |
| Semantically guided modeling | The user is guided through the modeling process according to the BPMN 2.0 semantics. Only standard-compliant predecessor and successor objects are displayed for selection, so the initial training effort is to be classified as low. |
| Modeling process interfaces | A process interface refers to a predecessor or successor process. They are usually used to connect processes at the same level. |
| Modeling standardized process steps (Best Practice Tasks) | Repetitive, standardized process steps can be managed centrally in the repository and used in processes as often as required. |
| Initially record processes in tabular form (automatic generation of graphics) | Processes are recorded quickly and clearly in the table view and can be checked immediately in the graphical view. |
| Maintain and detail processes in tables (automatic graphics generation) | Processes are efficiently revised in the table view, or further details are added. |
| Connect more objects with tasks (eBPMN) | Advanced BPMN 2.0 modeling, which includes the following objects: Requirements, Standards, Risks, Controls, etc. |
| Maintain additional attributes | Further standard attributes can be maintained. See Standardized Meta-Model. |
| Differentiate roles according to the duty to cooperate (RASCI) | Roles are categorized according to their responsibilities according to the RASCI method. Alternatively, the RACI method (without "S") can be selected (optional). |
| Differentiate groups according to the duty to cooperate (RASCI) | Groups are categorized according to their responsibilities using the RASCI method. Alternatively, the RACI method (without "S") can be selected (optional). |
| Connect process interfaces in the start and end event. | At the beginning and end of a process flow, predecessor or successor processes (usually at the same level) can be referenced. |
| Link predecessor and successor processes | Processes can be assigned to predecessor and successor processes to clarify their position in the overall process landscape. |
| Show BPMN Icons on process flow objects. | The process flow objects additionally display the symbol icons of the BPMN 2.0 modeling standard (optional) graphically. |
| Store audit results | Audits are created as projects and assigned to the process world. Audit results and recommendations for action can also be stored. |

| Advanced Process Modeling |  |
| --- | --- |
| Model and orchestrate end-to-end processes (E2E) and business transactions (scenarios) | End-to-end processes and comprehensive business transactions can be represented by logically sequential processes necessary to fulfill a specific customer need. |
| Automatically update process layout during process modeling (Auto-Layout function) | The Auto-Layout function automatically updates the individual process flow objects and arranges them accordingly. |
| Generate different process layouts automatically. | Possible process layouts are horizontal and vertical swimlane, horizontal and vertical lean process graphics (Lean), detailed process representation (eBPMN) with all object connections, horizontal and vertical swimlanes for IT systems (Application Swimlane), compressed process representation with all objects in matrix form (Process Matrix), and individually configurable profiles. |
| Free graphical design of processes and process maps (HTML editor) | Symbols, text fields, shapes, or process flow objects can be modeled graphically and linked to the process house. Images can also be added. |
| Upload and graphically visualize process workshop images. | Process workshop images (movement symbol slides) can be uploaded, edited, and saved as graphics. |
| Locking and unlocking process processing | Exclusive editing of processes prevents simultaneous editing by several people and thus avoids possible data inconsistencies (optional). |
| Language Management |  |
| Translate diagram and object details. | A dialog window allows easy and fast text input of process and object details in different languages. |
| Automated translation of diagram and object details (Online Translation Service) | An integrated translation service makes it possible to translate process and object details at the push of a button. |
| Automatic translation function with DeepL or Microsoft Translator | The integration of DeepL or Microsoft Translator guarantees automatic translation. Further translation services can be connected. |
| Process maturity level |  |
| Determine the degree of process maturity. | Process maturity can develop in different stages (percentage from 'defined' to 'continuously optimized'). Thus, the maturity level of a process organization can be determined. This value is displayed both as an attribute and as a graphical dashboard. |
| Aggregate process maturity level | The stored process maturity levels are aggregated and displayed on the upper level (structural process level). |
| Process Validation |  |
| Validate process semantics (check modeling errors) | Before release, the application of BPMN 2.0 semantics is checked, and modeling errors are pointed out. If essential information is missing, the release workflow cannot be started, and warnings can be ignored. |

| Evaluation of object links |  |
| --- | --- |
| Display connected objects in the process in a table | All objects connected to a process ('dependencies') are displayed in a table. From this view, connected objects can be edited efficiently and quickly and sent directly to the release. |
| Audit Trail |  |
| Display life cycle diagrams (audit trail) of all process versions. | An audit trail is used for quality assurance and shows the entire history of process status changes. It is presented as a life cycle diagram in an audit-compliant manner. |
| Versioning |  |
| Change attributes in released processes or objects | Certain attributes can be changed in released processes (only possible for selected user roles) |

[## Publication](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-967d917d-1f8d-c8db-2222-5e82016d7e96_body)

| Graphical process version comparison |  |
| --- | --- |
| Compare released and edited process versions (Process Comparison Editor) | Process versions are displayed side by side, and changes (deleted, added, modified) are graphically highlighted. |
| Attribute comparison | Attribute changes are displayed in a dialog. Both the old and the new value of a changed attribute are displayed. |
| Configurable home pages |  |
| Show individual entry pages (home pages) | Arranged entry pages facilitate quick navigation to specific processes or objects. The content can vary depending on the user role (e.g., viewer editor). |
| Configurable fact sheets |  |
| Display fact sheets for all diagrams and object contents. | The fact sheet shows aggregated information about processes or objects and can be selected as a graphical view. The prerequisite is the administrator's previous configuration. |
| Generate various graphical diagram representations. | Different process layouts (such as Swimlane horizontal/vertical, detailed, and Application Swimlane) can be selected and displayed by dropdown. |
| See and open stored attachments easily. | Symbols on process steps or linked objects in viewer mode allow users to quickly recognize where attachments (e.g., further documents) are available. |
| Organize process architecture |  |
| Display hierarchies in a navigation tree. | Hierarchically arranged processes or objects are displayed as a navigation tree through which you can navigate. |
| Graphic visualization |  |
| Display several process levels in one surface side by side (2-levels) | The 2-level view is particularly suitable for processes containing sub-processes as it allows you to display processes and sub-processes side by side clearly and concisely. |
| Process maps, graphical visualization | Process maps can be graphically modeled to provide overviews and direct navigation to the respective areas. |
| browser print |  |
| Print diagrams directly via browser print | The quick print function allows process graphics to be printed quickly, except for profiles. |
| Personal setting |  |
| Make personal user settings: Languages. | The primary and secondary languages can be selected individually, e.g., English as a primary language and the respective national language as a secondary language. |
| Make personal user settings: List sizes. | The columns of the list view can be customized. |
| Make personal user settings: Selected role. | Processes or objects can be displayed and categorized according to their assigned roles. Every Celonis Process Management user can set this individually. |

[## Search and find](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-c0018fb9-9ae0-80d2-4073-c42feaaca7dd_body)

| Global Search |  |
| --- | --- |
| Standard search: Search diagrams, objects, and information globally | The standard search is used to search processes, objects, and content for the beginnings of words entered. If several search terms are entered, they are linked with "AND." |
| Expert search: Search/filter in specific attributes. | With the expert search, you can filter by the field where the search terms should occur (e.g., in the description text field). |
| Expert search:  Search with operators | The expert search allows operators "AND"/"OR" to combine or mutually exclude search terms. |
| Expert search: Search with asterisks and quotation marks | In the expert search, you can also search for a partial term (using asterisks) or a compound term (using quotation marks). |
| Direct access to the selected search result via a link in the details area | The selected search result (process or object) can be called directly via a link. |
| List filtering |  |
| Filter search results in the list view | The search results list can be filtered according to additional, predefined criteria, such as type, version, author, etc. |
| Global filtering |  |
| Apply scope (scope filter) to search results (can be activated/deactivated) | Restricting the search to the scope (Scope Filter) can further narrow the list of search results. |

[## Versioning](#UUID-e4253bde-3b33-7236-45f6-a94855d04e2c_UUID-7b1def61-3dbc-1d75-d0e5-fbf6b8471ee2_body)

| Versioning |  |
| --- | --- |
| Create new diagrams or object versions. | When new processes or objects are created, new versions are automatically created. Several versions can be created and edited in parallel for processes. |
| Delete diagrams and objects that are being edited. | Processes or objects that are in progress can be deleted. |
| Create a new version of released processes and objects. | New versions must be created each time to revise released processes or objects. |
| Automatic versioning of processes and objects | The version numbers for processes and objects are assigned automatically (integer for 'Released/Valid' (e.g. 1.0), decimal for 'In progress' (e.g. 1.1)). A manual adjustment is not possible. |
| Release Workflow |  |
| Sharing: add more approver/approver groups (optional) | By default, the person responsible and, if applicable, the quality manager are stored as approvers. Additional approver/approver groups can also be configured (optional). For groups, the deposit of the number of permits required is possible. |
| Release: Validate methodical rules in the process | Before release, the application of BPMN 2.0 semantics is checked, and modeling errors are pointed out. If essential information is missing, the release workflow cannot be started. |
| Release: Send diagrams and objects to the release | After changing the status of a diagram or object, the release workflow starts automatically. The default sequence is Author - (QM) - Person responsible, with optional additional approver group: Author - (QM) - Approver - Responsible. |
| Release: Ignore validation rule warnings to start the release (enable/disable) | Before release, the application of BPMN 2.0 semantics is checked, and modeling errors are pointed out. If these are "warnings," the release workflow can still be started. |
| Release: Define diagram and object validity start "Valid from | The validity starts with processes and objects that can be freely defined. If no date is defined, the validity start is set to +14 days by default (configurable). There is no automatism when the validity end occurs. |
| Release: Enter reason for revision (must have attributes) | Before a process can be sent to the approval workflow, the reason for the revision must be entered in a text field. The input of the reason is optional for objects. |
| Release: Automatically forward requests for release to approvers | After a status change, the diagram/object to be checked is forwarded to the first approving instance (e.g., quality manager). In case of approval, the request is forwarded to the second instance for release, in case of rejection the release workflow is interrupted. In all cases, the author is informed. |
| Approval: Inform approvers by e-mail about pending requests for approvals (optional) | It is also possible to automatically notify approvers by e-mail when a request for approval is submitted. |
| Sharing: Automatically create and view requests (tasks) for approvers | Once the approval workflow is started, a request to the approver is automatically generated and displayed in his workspace. |
| Release: Manage requests (tasks) | Outstanding or completed requests are displayed in an overview for further administration. |
| Release: Call process/object directly | The process or object to be released can be accessed directly from the request via a link. |
| Release: Approve or reject the release of processes and objects | The release of processes or objects can be approved or rejected at the push of a button. A reason must be entered in the text field in case of rejection. |
| Set processes and objects to 'Expired. | A process or object can receive an "expired" status. The procedure is similar to the release workflow. Expired processes or objects can be reactivated. |


---

## pql/process/processed-data

# Processed Data

When working with custom monitoring, the following processed data is consumed:

Expand all

[## Data Consumption Monitoring](#UUID-38354f3c-175c-d56c-7c43-813cffc5c95d_section-idm4554038325187234039727359076_body)

The Data Consumption Monitoring Data Model consists of four tables representing the organizational structure of Data Integration, allowing you to take different perspectives on your data consumption.

| **Table** | **Description** |
| --- | --- |
| **data\_pools** | Your Data Pools |
| **data\_connections** | Your Data Connections, associated to your Data Pools |
| **data\_tables** | Your tables, associated to your Data Connections |
| **data\_consumption\_updated\_events** | The log of the data consumption calculations. In this table, you can find historic data consumption information for each table. |

[## Data Pipeline Monitoring](#UUID-38354f3c-175c-d56c-7c43-813cffc5c95d_section-idm4562739377436834039727496072_body)

The Data Pipeline Monitoring Data Model contains case tables for each entity of a data pipeline execution, namely:

- Schedules
- Data Jobs
- Tasks

  - Extractions
  - Transformations
  - Data Model loads
- Steps

  - Individual tables in an Extraction
  - Individual table exports in Data Model loads and the Engine load

| **Table** | **Description** |
| --- | --- |
| **schedule\_executions** | Your schedule executions |
| **schedule\_execution\_events** | The different stages of your schedule executions |
| **data\_job\_executions** | Your Data Job executions |
| **data\_job\_execution\_events** | The different stages of your Data Job executions |
| **task\_executions** | Your Task executions, this includes Extractions, Transformations, and Data Model loads |
| **task\_execution\_events** | The different stages of your Task executions |
| **step\_executions** | Your Step executions, this includes the individual tables in an Extraction and the export of individual tables in Data Model loads and the Engine load |
| **step\_execution\_events** | The different stages of your Step executions |
| **extraction\_table\_executions** | Individual tables in your Extractions |
| **extraction\_table\_execution\_events** | The different stages of individual tables in your Extractions |
| **data\_model\_executions** | Your Data Model loads |
| **data\_model\_execution\_events** | The different stages of your Data Model loads |

[## Replication Cockpit Monitoring](#UUID-38354f3c-175c-d56c-7c43-813cffc5c95d_section-idm4644227427646434039728232895_body)

The Replication Cockpit Monitoring builds on a simple Data Model with just two tables which hold information about your Replications on a table level. Each entry in the **replication\_executions** table is the replication of a table from your source system, consisting of the extraction of the table and, optionally, its subsequent transformation. The different stages from *Extraction start* to *Extraction end* (or possibly *Transformation end*) are logged in the **replication\_execution\_events** table.

| **Table** | **Description** |
| --- | --- |
| **replication\_executions** | Your Replications |
| **replication\_execution\_events** | The different stages of your Replications |


---

## pql/process/process-equals

# PROCESS EQUALS

## Description

PROCESS EQUALS matches the variants of a process based on simple expressions. PROCESS EQUALS is less powerful than [MATCH\_PROCESS\_REGEX](match_process_regex.html "MATCH_PROCESS_REGEX") and [MATCH\_PROCESS](match_process.html "MATCH_PROCESS") but it is also simpler to use.

## Syntax

```
PROCESS [ ON activity_table.string_column ] [ NOT ] equals [ start ] activity ( to activity )* [ end ]
```

- **activity\_table.string\_column**: A string column of an activity table. By default, the activity column of the default activity table is used.
- **equals**: EQUALS | #
- **start**: START | ^ (The case has to match from the start)
- **end**: END | $ (The case has to match till the end)
- **to**: TO | ->
- **activity**: ANY | \* | single\_activity | grouped\_activity

  - **single\_activity**: [LIKE] activity (Activity name. LIKE allows you to use wildcards in your activity name. LIKE reacts case sensitive.)
  - **grouped\_activity**: (single\_activity, ..., single\_activity) (All activities in the list are possible options for this process step, which means that the value in the activity table column has to match one of the listed activities names.)

If the activity name does not exist, then a warning is displayed. In this scenario PROCESS EQUALS will have no matches, and PROCESS NOT EQUALS will match everything.

Empty cases, meaning cases without activities or only null activities, match PROCESS NOT EQUALS.

## Null values

Null values in the specified string column are ignored.

## Result

PROCESS EQUALS returns for each case whether the activities of this case match or do not match the pattern given by the simple expression. The result is case-based and can be used together with [FILTER](filter.html "FILTER") and [CASE WHEN](case-when.html "CASE WHEN") statements or in other contexts in which a condition is expected.

## Use Cases

- `PROCESS EQUALS` can be used for [Working Capital Optimization](working-capital-optimization.html "Working Capital Optimization").

## Examples

|  |
| --- |
| **[1]**  PROCESS EQUALS to filter down to cases where activity 'A' is directly followed by 'B'. Where in the case the activity 'A' is followed by 'B' doesn't matter in this case. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS 'A' to 'B'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | '1' | 'C' | | |

|  |
| --- |
| **[2]**  ANY or short \* is placeholder for no activity or an arbitrary number of activities. Therefore in this example all three cases are in the result. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS 'A' to ANY to 'C'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'C' | Tue Jan 01 2019 13:00:06.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'C' | Tue Jan 01 2019 13:00:06.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'C' | | '2' | 'A' | | '2' | 'B' | | '2' | 'C' | | '3' | 'A' | | '3' | 'B' | | '3' | 'B' | | '3' | 'C' | | |

|  |
| --- |
| **[3]**  With END the given pattern has to match directly before the end of the case. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS 'A' END; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '2' | 'B' | | '2' | 'A' | | |

|  |
| --- |
| **[4]**  With START the given pattern has to match directly from the case start. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS START 'A'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | |

|  |
| --- |
| **[5]**  PROCESS EQUALS to filter down to cases starting with activity 'A' or 'B', directly followed by 'B': |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS START ( 'A' , 'B' ) to 'B'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'D' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'D' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:00.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | '1' | 'C' | | '2' | 'B' | | '2' | 'B' | | |

|  |
| --- |
| **[6]**  It is also possible to use a shorter syntax. The example query is identical to PROCESS EQUALS START 'A' TO 'B' END. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS # ^ 'A' -> 'B' $; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:02.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | |

|  |
| --- |
| **[7]**  With LIKE wildcards can be used for the activity names. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS START 'A' TO LIKE 'B%' END; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'BC' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'BC' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'BC' | | '2' | 'A' | | '2' | 'B' | | |

|  |
| --- |
| **[8]**  Restricts the result to cases where A isn't directly followed by C. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS NOT EQUALS 'A' to 'C'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'C' | Tue Jan 01 2019 13:00:06.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '3' | 'B' | Tue Jan 01 2019 13:00:04.000 | | '3' | 'C' | Tue Jan 01 2019 13:00:06.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '2' | 'A' | | '2' | 'B' | | '2' | 'C' | | '3' | 'A' | | '3' | 'B' | | '3' | 'B' | | '3' | 'C' | | |

|  |
| --- |
| **[9]**  PROCESS EQUALS to filter down to cases where activity 'A1' is directly followed by 'B1' with a custom activity expression. Where in the case the activity 'A1' is followed by 'B1' doesn't matter in this case. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS ON "Table1"."ACTIVITY" || '1' EQUALS 'A1' to 'B1'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 | | **Result**  | Column1 : string | Column2 : string | | --- | --- | | '1' | 'A' | | '1' | 'B' | | '1' | 'C' | | |

|  |
| --- |
| **[10]**  Filter process equals non-existing activity: Empty result and warning. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS EQUALS 'X'; ```  **Column1**  ``` "Table1"."CASE_ID" ```  **Column2**  ``` "Table1"."ACTIVITY" ``` | |
| | Input | Output | | --- | --- | | **Table1**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '1' | 'B' | Tue Jan 01 2019 13:00:02.000 | | '1' | 'C' | Tue Jan 01 2019 13:00:03.000 | | '2' | 'A' | Tue Jan 01 2019 13:00:00.000 | | '2' | 'C' | Tue Jan 01 2019 13:00:00.000 | | (empty table)  **Warning**  MATCH\_PROCESS / PROCESS EQUALS: Could not find activity ['X']. | |

|  |
| --- |
| **[11]**  Example for empty cases (no activities or all activities are null) which match for PROCESS NOT EQUALS. |
| | Query | | --- | | **Filter**  ``` FILTER PROCESS NOT EQUALS 'B'; ```  **Column1**  ``` "CaseTable"."CASE_ID" ``` | |
| | Input | Output | | --- | --- | | **ActivityTable**  Filter  - CASE\_ID : string - ACTIVITY : string - TIMESTAMP : date  | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Fri Jan 01 2016 01:00:00.000 | | '2' | 'B' | Fri Jan 01 2016 02:00:00.000 | | '3' | *null* | Fri Jan 01 2016 03:00:00.000 |   | CASE\_ID : string | ACTIVITY : string | TIMESTAMP : date | | --- | --- | --- | | '1' | 'A' | Fri Jan 01 2016 01:00:00.000 | | '2' | 'B' | Fri Jan 01 2016 02:00:00.000 | | '3' | *null* | Fri Jan 01 2016 03:00:00.000 |    **CaseTable**  | CASE\_ID : string | | --- | | '1' | | '2' | | '3' | | '4' |        **Foreign Keys**  |  |  | | --- | --- | | CaseTable.CASE\_ID | ActivityTable.CASE\_ID | | **Result**  | Column1 : string | | --- | | '1' | | '3' | | '4' | | |

## See also:

- [MATCH\_ACTIVITIES](match_activities.html "MATCH_ACTIVITIES")
- [MATCH\_PROCESS](match_process.html "MATCH_PROCESS")


---

## pql/process/process-flow-filters

# Using process flow filters

Process flow filters are used to refine and focus on specific aspects of a process by filtering out unnecessary variations, noise, or unwanted data points. You can configure a process flow filter by selecting the starting and ending events / activities that you want to either include or exclude in the filter.

In this example, a process flow filter is being used to show only data where an approval is escalated, followed at any time by a credit decision being made. This filters down the objects to show only 13% of them, helping to analyse what happens to cases when an escalation is needed.

|  |
| --- |
|  |

Expand all

[## Benefits of using a process flow filter](#UUID-b45b4246-bd90-8a43-5a5b-c7aa15860379_section-idm234859935899098_body)

Using process flow filters can be beneficial in a number of ways, including:

- **Enhanced visibility**: By removing unnecessary deviations, you can focus on the most important parts of your process.
- **Improved analysis**: You can reduce complexity by filtering out uncommon or irrelevant paths. Filtering out that noise gives you cleaner, more reliable data to work with.
- **Better anomaly detection**: Identify critical process bottlenecks and inefficiencies by isolating key patterns in your process.
- **Customizable per use-case**: Your filters can be set for different process stages (e.g., time from order placement to shipment). You can also analyze short, medium, and long term cases separately.

[## Configuring process flow filters](#UUID-b45b4246-bd90-8a43-5a5b-c7aa15860379_section-idm234859921985497_body)

With [process filters enabled](enabling-process-filters.html "Enabling process filters"), App users can apply process flow filters by clicking **Filters - Process flow**:

You can then configure the following options:

- **Event log**: Event logs describe the sequence of activities happening for your cases e.g. all activities related to your purchase orders.
- **From / to**: Select the events used to start and end the filter, taken from your event logs in your Data Model.
- **Connection type**: The following connection types can be selected:

  - Directly followed by
  - Followed anytime by
  - Not directly followed by
  - Never followed by

|  |
| --- |
|  |

## Related topics

- [Advanced filters](advanced-view-filters.html "Enabling advanced filters for Views (attribute, process flow, event filters, and throughput time filters)")
- [Case count / object count](case-and-object-view-counts-in-views.html "Case and object view counts in Views")
- [Configuring a filter bar for your View](configuring-a-filter-bar-for-your-view.html "Configuring a filter bar for your View")


---

## pql/process/process-index

# Process Index

## Description

Index functions create [integer](int.html "INT") indices based on a column.

Currently, the following Index functions are available:

- [INDEX\_ACTIVITY\_LOOP](index_activity_loop.html "INDEX_ACTIVITY_LOOP") returns a column with [INT](int.html "INT") values based on how often activities occur in direct succession.
- [INDEX\_ACTIVITY\_LOOP\_REVERSE](index_activity_loop_reverse.html "INDEX_ACTIVITY_LOOP_REVERSE") is similar to [INDEX\_ACTIVITY\_LOOP](index_activity_loop.html "INDEX_ACTIVITY_LOOP"), but it indexes in reverse order.
- [INDEX\_ACTIVITY\_ORDER](index_activity_order.html "INDEX_ACTIVITY_ORDER")
- [INDEX\_ACTIVITY\_ORDER\_REVERSE](index_activity_order_reverse.html "INDEX_ACTIVITY_ORDER_REVERSE")
- [INDEX\_ACTIVITY\_TYPE](index_activity_type.html "INDEX_ACTIVITY_TYPE")
- [INDEX\_ACTIVITY\_TYPE\_REVERSE](index_activity_type_reverse.html "INDEX_ACTIVITY_TYPE_REVERSE")

## See also:

- [INDEX\_ORDER](index_order.html "INDEX_ORDER")


---

## pql/process/process-intelligence-graph

# Process Intelligence Graph

The Process Intelligence Graph (PI Graph) is the foundation layer that captures how your business actually runs, across systems, across processes, and enriches that with business context and process knowledge so that you can not only see the current state, but act on opportunities. Using the PI Graph enables a shift from isolated process mining to enterprise-wide process intelligence, with scalability and the ability to embed into automation/AI.

At its core, the PI Graph is a system-agnostic, enriched digital twin of an organization’s business operations:

- It pulls together process data from multiple systems (ERP, CRM, data lakes, even desktop/task data) into one unified model.
- It uses an object-centric data model (objects like invoices, purchase orders, orders, etc) and captures how these objects and events relate to each other (object-to-object relationships, event-to-object relationships).
- It then enriches that data with business context: KPIs, workflows, business rules, process knowledge (built from many deployments) so you get not just “what happens” but “how it happens” and “why it happens”.

The below shows an example of a Process Intelligence Graph, created using the Objects & Events product area:

Expand all

[## Key benefits of the Process Intelligence Graph](#UUID-ce009e80-c0a3-3ae4-603a-db8d3fec11c3_section-id23524712948428_body)

Using the PI Graph provides the following key benefits:

- **End-to-end visibility across systems**: As the PI Graph is system-agnostic, you can map processes that span multiple tools, systems, departments (e.g., Order-to-Cash, Procure-to-Pay) in one unified view.
- **Reusable and scalable**: The object-centric model means once you’ve built out objects/events for one process, you can reuse, extend, and scale across other processes without starting from scratch.
- **Common language for the business**: By providing a unified semantic layer (objects, events, rules, KPIs) it helps business and IT align on how processes run and where value opportunities lie.
- **Improved insight and actionability**: Because the PI Graph is enriched with process knowledge and AI and machine learning, you can more quickly identify where things are going wrong (bottlenecks, deviations) and what to do about them.
- **Foundation for automation and AI**: The PI Graph serves as the data and context layer that enables automation, generative AI, process orchestration by exposing “how your business flows” in structure.

[## Key components of the Process Intelligence Graph](#UUID-ce009e80-c0a3-3ae4-603a-db8d3fec11c3_section-id23524712952608_body)

Here are the main building blocks of the PI Graph architecture, along with how they interact:

Filter

- PI Graph component
- Description
- Purpose / role

| PI Graph component | Description | Purpose / role |
| --- | --- | --- |
| Object-Centric Data Model (OCDM) | The foundational data structure of the PI Graph. It represents real-world business objects (like Purchase Orders, Invoices, Deliveries, Customers) and events (like Create PO, Approve Invoice, Ship Goods) plus how they relate to each other. | Provides a multi-object, cross-process view of operations,beyond traditional single “case-based” process mining. |
| Event data layer | Stores and connects all events (activities, status changes, transactions) from all systems. | Captures the “what happened” data that forms the backbone of the process graph. |
| Object relationships layer | Defines and maintains relationships between business objects (e.g., a Purchase Order → multiple Goods Receipts → one Invoice). | Enables end-to-end process visibility and relationship tracing across systems. |
| Business context / semantic layer | Adds metadata: definitions of KPIs, business rules, roles, responsibilities, and operational logic. | Acts as a “common business language” connecting IT data to business terms and goals. |
| Data integration layer | Connectors for ERP, CRM, SCM, HR, legacy systems, APIs, and streaming sources. | Feeds real-time or batch data into the PI Graph securely and consistently. |
| Analytics and intelligence layer | Powers insights through process analytics, variant exploration, root-cause analysis, machine learning, and generative AI. | Enables diagnostic and predictive insights on top of the unified graph. |
| Action and orchestration layer | Connects insights to action: triggering automations, alerts, or workflows directly from the PI Graph. | Turns insights into measurable operational improvements (“process optimization loop”). |
| Reusability and governance framework | Includes shared definitions, templates, and governance structures for KPIs, objects, and models. | Ensures consistency, scalability, and reuse across processes and departments. |

| PI Graph component | Description | Purpose / role |
| --- | --- | --- |
| Object-Centric Data Model (OCDM) | The foundational data structure of the PI Graph. It represents real-world business objects (like Purchase Orders, Invoices, Deliveries, Customers) and events (like Create PO, Approve Invoice, Ship Goods) plus how they relate to each other. | Provides a multi-object, cross-process view of operations,beyond traditional single “case-based” process mining. |
| Event data layer | Stores and connects all events (activities, status changes, transactions) from all systems. | Captures the “what happened” data that forms the backbone of the process graph. |
| Object relationships layer | Defines and maintains relationships between business objects (e.g., a Purchase Order → multiple Goods Receipts → one Invoice). | Enables end-to-end process visibility and relationship tracing across systems. |
| Business context / semantic layer | Adds metadata: definitions of KPIs, business rules, roles, responsibilities, and operational logic. | Acts as a “common business language” connecting IT data to business terms and goals. |
| Data integration layer | Connectors for ERP, CRM, SCM, HR, legacy systems, APIs, and streaming sources. | Feeds real-time or batch data into the PI Graph securely and consistently. |
| Analytics and intelligence layer | Powers insights through process analytics, variant exploration, root-cause analysis, machine learning, and generative AI. | Enables diagnostic and predictive insights on top of the unified graph. |
| Action and orchestration layer | Connects insights to action: triggering automations, alerts, or workflows directly from the PI Graph. | Turns insights into measurable operational improvements (“process optimization loop”). |
| Reusability and governance framework | Includes shared definitions, templates, and governance structures for KPIs, objects, and models. | Ensures consistency, scalability, and reuse across processes and departments. |

### Understanding how the key components work together

As a high-level summary, the key components in the Process Intelligence Graph work together in the following way:

1. **Data ingestion**: Data is collected from many sources (ERP systems, CRM, databases, task mining, on-premise clients). The on-prem client model allows extraction without opening firewall ports, etc.
2. **Modeling / transformation**: This raw data is mapped into the object-centric model (objects, events, relationships).
3. **Graph construction**: The PI Graph builds the unified process view, tracking how objects and events move across systems, how they interrelate, capturing the end-to-end value chain.
4. **Enrichment with context/knowledge**: Business rules, KPIs, process patterns, roles etc are layered on top. This helps turn raw process flows into insights and actionable intelligence.
5. **Analytics and action**: On top of the graph you run analytics, apply AI/ML, visualise performance, find bottlenecks, deviations, simulate changes. Then you can trigger actions or automation.
6. **Scaling and reuse**: Once you’ve built objects/events for one process you can reuse, extend, scale to other processes and systems, reducing duplication of effort.

[## Use-case example: End-to-end Order-to-Cash (O2C) process optimization across multiple systems with Process Intelligence Graph](#UUID-ce009e80-c0a3-3ae4-603a-db8d3fec11c3_section-id23524712956432_body)

Here’s a concrete, real-world use case example that illustrates why and when you’d use the PI Graph:

### The challenge

A global manufacturing company runs its O2C process across multiple ERP systems (e.g., SAP ECC in Europe, Oracle in the U.S., and Salesforce for CRM).

They want to:

- Identify bottlenecks and automation opportunities across the entire process.
- Understand how customer order changes, delivery delays, and credit blocks interact to cause late payments.
- Gain a unified view of the process, even though the data is fragmented across systems.

Standard process mining would require creating separate event logs for each system and process, and then manually stitching together insights. This makes it difficult to understand cross-system dependencies, like how a credit block in SAP affects invoice timing in Oracle.

### The solution

The PI Graph acts as a semantic, interconnected data model, a “digital twin” of the business processes used by the global manufacturing company. It allows them to:

- Connect multiple data sources dynamically (ERPs, CRMs, supply chain, etc.) into one coherent process view.
- Model relationships between entities like orders, deliveries, invoices, customers, and payments.
- Automatically detect cause-and-effect relationships — e.g., how often delivery delays cause overdue invoices.
- Enable real-time analysis across systems without manually rebuilding event logs.

With the PI Graph, the global manufacturing company discovers:

- High percentage of late payments are linked to delivery delays caused by incomplete material availability.
- Orders from a specific region have higher delay rates because credit blocks in SAP are not cleared promptly after a Salesforce order modification.
- Automatically recommends automation (via Celonis Action Flows) to notify credit controllers when a credit block causes invoice delay.

## Related topics

- [Object-centric data model (OCDM)](ocdm.html "Object-centric data model (OCDM)")
- [Perspectives and event logs](perspectives.html "Perspectives and event logs")
- [Modeling objects and events](modeling-objects-and-events.html "Modeling objects and events")


---

## pql/process/process-navigator

# Process Navigator

You use Process Navigator to view and monitor processes, content and systems in your organization. With Process Navigator, you can also drilldown to get a more detailed and complete understanding of exactly how your processes work, provide feedback and use actions to keep track of issues assigned to you.

**Note**

Analysts and process designers use a separate tool called Process Designer to build process models for your organization. These are the models you interact with in Process Navigator. For more information, see [Getting started with Process Designer](getting-started-with-process-designer.html "Getting started with Process Designer").

## Learn more about Process Navigator

The following sections will walk you through setting up Process Navigator, introduce its main features, and explain how to perform basic tasks using the tool. For a more in-depth look at what you can do with the Navigator, see our [Academy course](https://academy.celonis.com/courses/introduction-to-symbio-navigator).

## Accessing Process Navigator

Use your [login link](https://docs.celonis.com/en/logging-in-to-celonis-process-management.html) to access Process Navigator.

**Tip**

If enabled in the Celonis Platform, you may also be able to access Process Navigator from the Celonis Platform Navigation bar. For more information, see [Enabling access to Celonis Process Management](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html "Enabling access to Celonis Process Management (CPM) from the Celonis Platform").


---

## pql/process/process-reference

# Process Reference

## Description

Process reference functions can be used to reference the case table or configured activity columns based on an expression.

These operators are useful when working with data models with multiple activity and case tables. For example, they can be used to reference the corresponding case table for every activity table in the data model, or to reference standard activity table columns from a combined activity table generated with [MERGE\_EVENTLOG](merge_eventlog---merge_eventlog_distinct.html "MERGE_EVENTLOG - MERGE_EVENTLOG_DISTINCT").

## Process table reference

- [CASE\_TABLE](case_table.html "CASE_TABLE") returns a reference to the case table corresponding to the provided activity table column. If no argument is provided, the default case table is referenced.
- [ACTIVITY\_TABLE](activity_table.html "ACTIVITY_TABLE") returns a reference to the activity table corresponding to the provided activity table column. If no argument is provided, the default activity table is referenced.

## Activity table column reference

Those functions allow to refer to the essential columns of activity tables in the data model without using the exact activity table or column names. If an activity table column is passed as an argument, the respective column of the corresponding activity table is referenced. If no argument is provided, the respective column of the default activity table is referenced. We provide the following functions for each of the essential activity table columns:

- [ACTIVITY\_COLUMN](activity_column.html "ACTIVITY_COLUMN") returns a reference to the activity column.
- [CASE\_ID\_COLUMN](case_id_column.html "CASE_ID_COLUMN") returns a reference to the case column.
- [TIMESTAMP\_COLUMN](timestamp_column.html "TIMESTAMP_COLUMN") returns a reference to the timestamp column.
- [END\_TIMESTAMP\_COLUMN](end_timestamp_column.html "END_TIMESTAMP_COLUMN") returns a reference to the end timestamp column. If no end timestamp column is defined, the timestamp column will be returned.


---

## pql/process/searching-and-filtering-in-process-navigator

# Searching and filtering in Process Navigator

The search in Process Navigator will first look for a match in a corresponding name field, then look for terms matching in other fields. For example, a search for the term "Product" will result in a list of content containing "Product", not "Production".

Searches in name fields can also use partial search terms. For example, a name field search for the term "Pro" will result in a list of content containing “Product”, “Procure”, “Process”, etc. This means that if a term is in the description field, but **not** the name field, it will not be included as a search result.

You can search with only 1 letter (“A"), but the search will only recognize a term as a full word if it has at least two letters ("AI"). Special characters are also permitted, but some (such as "-", "(" and ")") are ignored by the search.

Expand all

[## Searching for a process or specific content](#UUID-06087007-dd16-17e2-f241-8f3503730f65_section-idm4600663341009634282474491576_body)

1. In **My Overview**, start typing the name of the process or content in the **Search** field.
2. Apply filters if you know the type, assignee and/or validity date.
3. Click **Show all results**.
4. Select the result you want to look at.

**Tip**

Turning off **My Filters** may help if you can’t find what you’re looking for.

[## Filter types](#UUID-06087007-dd16-17e2-f241-8f3503730f65_section-idm4543169445548834282477279679_body)

| Filter types | Description |
| --- | --- |
| Keyword filter | Acts as an additional filter to existing filter criteria in a search, and only filters within the current list of search results. A search using keywords will only look for results in the **Name** and **Details** fields. |
| My Filters | Automatically applied so you only see processes and content relevant to you in **My Overview**.  **Tip**  Click the filters icon on the Process Navigator home page or in **Process Journal** to view and edit these filter settings. |
| Scope filters | Applied to the process or content in Process Navigator. Scope filters use tags applied in Process Navigator. |

## Related topics

- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Monitoring changes with Process Navigator](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator")
- [Action Center](action-center.html "Action Center")


---

## pql/process/send-action-center-requests-in-process-navigator

# Send Action Center requests in Process Navigator

In Process Navigator, you create a request to provide feedback. Requests can be questions, change requests, error reports, ideas or hints. When you create a request, an action is automatically created for the person responsible. Note that Process Navigator requests are separate from Process Designer requests, which are part of the modeling review and publishing workflow.

Expand all

[## Creating a request](#UUID-9cd50a8b-b336-ee3c-eb0d-f4f159269cbe_section-idm634897870273415_body)

There are two ways to submit requests: via the homepage, or on a specific object through the Process Journal.

**Homepage**

1. In the Welcome widget on the Process Navigator homepage, click the “Request” button. The request form opens.
2. Fill out the form with the desired information. Click “Submit request” when finished.
3. Your request will appear in the [Action Center](action-center.html "Action Center"), where you can monitor its progress.

**Process Journal**

1. In the Process Journal, navigate to the object you want to submit a request for.
2. Click the “Submit request” button. The request form opens.
3. Fill out the form with the desired information. Click “Submit request” when finished.
4. Your request will appear in the [Action Center](action-center.html "Action Center"), where you can monitor its progress.

## Related topics

- [Action Center](action-center.html "Action Center")
- [Managing actions](managing-actions-in-process-navigator.html "Managing actions in Process Navigator")
- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")


---

## pql/process/synchronize-sap-solution-manager-elements-to-celonis-process-management

# Synchronize SAP Solution Manager elements to Celonis Process Management

This topic explains how SAP Solution Manager library objects, structure and diagrams are synchronized and represented in Celonis Process Management and how they are relevant to the process synchronization.

Expand all

[## Applications (Logical Component Groups)](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_applications-logical-component-groups_body)

Applications are the Celonis Process Management equivalent to *Logical Component Groups* in SAP Solution Managers. All the *Logical Component Groups* for the selected SAP Solution Managers Solution will be imported in Celonis Process Management during the Linking process. After they are imported into Celonis Process Management, these elements are read-only and cannot be deleted or modified.

These elements can be reimported manually by clicking **Synchronize SAP Step Library Objects to Celonis Process Management** in the Processes architecture view, under the SAP menu.

[## Application services (Executables)](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_application-services-executables_body)

Application services are the Celonis Process Management equivalent to *Executables* in SAP Solution Manager. All the *Executables* from the SAP Solution Manager branch or scope will be imported by clicking **Synchronize SAP Step Library Objects to Celonis Process Management** from the SAP menu in the Processes architecture view. If the Executables are connected to the Process Step Original which is part of the Scope synchronization, they will be imported to Celonis Process Management. They are connected to an Application, just like an *Executable* is connected to *LCG*. After they are imported in Celonis Process Management, these elements are read-only and cannot be deleted or modified.

These elements can be manually reimported by going to the Processes architecture view and clicking **Synchronize SAP Step Library Objects to Celonis Process Management** in the SAP menu.

[## Best Practice Tasks (Process Steps)](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_best-practice-tasks-process-steps_body)

All the Process Steps Originals from SAP Solution Manager are imported to Celonis Process Management by going to the Processes architecture view and clicking **Synchronize SAP Step Library Objects to Celonis Process Management** in the SAP menu. They are imported as Best Practice Tasks, and after the import they are read-only.

Best Practice Tasks are connected to the Application, just like the connection between Process Steps and Logical Component Groups in SAP Solution Manager. Also if the Process Step has a reference to an Executable, a Best Practice Task has a connection to Application service. Best Practice Task, can be connected to a Local or Global Task in Celonis Process Management. If a task is connected to the Best Practice Task, it will be synchronized as a reference to the Process Step, otherwise it will be linked to the Default Process Step Original.

These elements can be reimported manually by going to the Processes architecture view and clicking “Synchronize SAP Step Library Objects to Celonis Process Management” in the SAP menu.

Additionally, if a synchronized Task has an attached Best Practice Task, the Application and Application service that are attached to that Best Practice Task are also visible in the detail content of the Task:

[## Synchronize SAP Step Library Objects to Celonis Process Management](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_synchronize-sap-step-library-objects-to-celonis-process-management_body)

### Mapping of structure elements

The elements are going to be synchronized following the table below:

| SAP Solution Manager | Celonis Process Management |
| --- | --- |
| Folder | Category |
| Scenario | Main Process |
| Process | Main Process |
| Diagram a | SubProcess A |
| Diagram b | SubProcess B |
| Diagram c | SubProcess C |

This way, if the process has multiple diagrams, all of the diagrams will be synchronized.

[## Synchronizing diagram elements](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_synchronizing-diagram-elements_body)

The diagram will be synced if the type is “Process” or “Collaboration” but only with one original pool. The diagram will be synced if the sub type is “By Role”, but if the sub type is “By System”, the diagram will not be synchronized.

| SAP Solution Manager | Celonis Process Management |
| --- | --- |
| events (start, end, intermediary) | appropriate events |
| gateways | appropriate gateways |
| draft task | local task |
| process step reference | local task with appropriate bpt attached |
| empty sub process | interface |

### Synchronizing sub process reference

For the sub process reference elements to be synchronized correctly some conditions have to be met:

1. Sub process has to be referenced to the process;

2. Sub process reference has to the attached to one diagram, or if it has multiple, one has to be set as the default.

If the sub process reference does not have a link to a concrete diagram, or it has more diagrams attached but no default is set, the sub process will be synced like an interface with an empty placeholder. If the conditions are met, the sub process reference will be synced like a sub process reference shape.

[## Process of synchronization](#UUID-0fa8935a-b4c2-f19d-bc92-2c4726879bde_process-of-synchronization_body)

To synchronize the structure from SAP Solution Manage to Celonis Process Management go to **Processes > architecture** and click the SAP button. Then click **Synchronize best practice package**.

A dialog will open. Choose what scope you want to sync, or if you leave it empty, the entire structure will be synced.

When the synchronization is done there will be a new category added to the process house element. The entire synchronized structure will be in this category. The elements will be released and not editable. For now you can copy only diagram elements to another structure.

If a synchronized Task has an attached Best Practice Task, the Application and Application service that are attached to that Best Practice Task are also visible in the detail content of the Task:

## Related topics

- [Synchronizing documents to SAP Solution Manager](synchronizing-documents-to-sap-solution-manager.html "Synchronizing documents to SAP Solution Manager")
- [Setting up a scheduled library sync](setting-up-a-scheduled-library-sync.html "Setting up a scheduled library sync")
- [Setting up custom attributes sync for the SAP Solution Manager Connector](setting-up-custom-attributes-sync-for-the-sap-solution-manager-connector.html "Setting up custom attributes sync for the SAP Solution Manager Connector")


---

## pql/process/task-mining-data-processing-and-scheduling

# Task Mining data processing and scheduling

## Task Mining data processing overview

You can configure how and when your Task Mining data is processed. You can choose to process new Task Mining data only or to reprocess all data when new data is added. If new Task Mining data only is processed, you can optionally schedule when this processing will be performed,

Task Mining data is processed in batches of up to 10 million rows for efficiency but processing is limited by the number of:

- Rows the data model can load into one table (typically two billion).
- Concurrent users sending data per realm (up to 30,000 users for larger realms).

For more information, see the [Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app"). For information on tables, see the [Task Mining table reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-ea773258-39eb-122f-1bb6-a442f991cd46 "Task Mining table reference").

## Task Mining data processing options

**Note**

You access the data processing options from the Task Mining project home page by selecting **Run & Schedule** and choosing an option from the **Run** dropdown. Any issues are displayed in the **Run History** on the **Run & Schedule** screen.

Filter

- Data processing option
- Description
- Use case

| Data processing option | Description | Use case |
| --- | --- | --- |
| [Process new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") | Processes new incoming data only. | Data needs to be updated as quickly as possible while ensuring the data processing duration is as short as possible. |
| [Reprocess existing data (full)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233142464696 "Re-processing existing Task Mining data (full)") | Reprocesses all existing data to apply new or updated rules, labels, business events or tasks. | Data updates need to be consistently applied across the entire data set to ensure analyses are always consistent. As the entire data set is being processed, the data processing duration is longer than if new data alone were being processed. |

| Data processing option | Description | Use case |
| --- | --- | --- |
| [Process new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") | Processes new incoming data only. | Data needs to be updated as quickly as possible while ensuring the data processing duration is as short as possible. |
| [Reprocess existing data (full)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233142464696 "Re-processing existing Task Mining data (full)") | Reprocesses all existing data to apply new or updated rules, labels, business events or tasks. | Data updates need to be consistently applied across the entire data set to ensure analyses are always consistent. As the entire data set is being processed, the data processing duration is longer than if new data alone were being processed. |

Expand all

[## Processing new Task Mining data only (delta)](#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136_body)

1. The Task Mining Client software sends new data to the `user_interaction_event_log` table,
2. Default and custom Labels are applied to raw events.
3. The resulting events are stored in the `TM_Labeled_Data` table.
4. Tasks are applied and:

   - Tasks containing the list of task names defined by the user are stored in the `Tasks` table.
   - Task instances found for Tasks are stored in the `Task_Instances` table.
   - `Tasks_Join` is an n:n join table between a task instance and `TM_Labeled_Data` events.
5. The Data Model automatically reloads to reflect the newly-processed data.

[## Re-processing existing Task Mining data (full)](#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233142464696_body)

1. User triggers re-processing in the **Run & Schedule** screen.
2. Temporary tables are created in the background.

   These temporary tables are essentially copies of existing tables and do not contribute to APC consumption.
3. The union of the `user_interaction_event_log` and `user_interaction_event_log_history` tables is queried in batches of 10 million rows until all sessions that were available when re-processing was triggered have been processed.
4. Default and custom Labels are applied to raw events.
5. The resulting events are stored in the `TM_Labeled_Data_reprocessing` table.
6. Tasks and Business Events are applied.
7. Steps **3** to **6** are performed for new data in batches of up to 10 million rows until all raw events have been processed.
8. The Data Model automatically reloads to reflect the newly-processed data.
9. If reprocessing is:

   - Successful, the temporary reprocessing tables which contain the re-processed results are renamed and replace the original tables until re-processing is performed again.
   - Unsuccessful, all temporary tables are deleted and the re-processing job execution status in the **Run & Schedule** screen is set to `Failed`.

## Task Mining processing scheduling options

**Tip**

You access the processing scheduling options from the Task Mining project home page by selecting **Run & Schedule** and selecting **Schedule**.

Filter

- Data processing scheduling options
- Description
- Use case

| Data processing scheduling options | Description | Use case |
| --- | --- | --- |
| Run when new data is uploaded. | Captured Task Mining data is processed every time new data is uploaded to the Task Mining Data Pool by the Task Mining Client software. There may be a delay of up to 20 minutes between the Task Mining Client software status showing as uploaded and the processing run starting.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") only. | Data must be available in Studio as quickly as possible and there are no resource utilization issues that interfere with other data transformations. |
| Run by schedule | Captured Task Mining data is processed at a specified time/date.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") only. | For performance reasons, data processing is run when users are not working, for example, overnight. |
| No schedule | Data processing is triggered by a user manually selecting **Run** in **Run & Schedule**.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") and [re-processing existing Task Mining data (full)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233142464696 "Re-processing existing Task Mining data (full)"). | Gives flexibility when there are no specific timing or performance constraints. |

| Data processing scheduling options | Description | Use case |
| --- | --- | --- |
| Run when new data is uploaded. | Captured Task Mining data is processed every time new data is uploaded to the Task Mining Data Pool by the Task Mining Client software. There may be a delay of up to 20 minutes between the Task Mining Client software status showing as uploaded and the processing run starting.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") only. | Data must be available in Studio as quickly as possible and there are no resource utilization issues that interfere with other data transformations. |
| Run by schedule | Captured Task Mining data is processed at a specified time/date.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") only. | For performance reasons, data processing is run when users are not working, for example, overnight. |
| No schedule | Data processing is triggered by a user manually selecting **Run** in **Run & Schedule**.  Available for [processing new Task Mining data only (delta)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233136863136 "Processing new Task Mining data only (delta)") and [re-processing existing Task Mining data (full)](task-mining-data-processing-and-scheduling.html#UUID-14c28b64-84ff-ce76-aea4-e766a593118e_section-id235233142464696 "Re-processing existing Task Mining data (full)"). | Gives flexibility when there are no specific timing or performance constraints. |


---

## pql/process/understanding-differences-between-first-generation-and-premium-process-query-engine-behavior

# Understanding Differences Between First-Generation and Premium Process Query Engine Behavior

## Description

As part of our efforts to enable scalability and support for more complex, data-intensive processes, we are transitioning from the first-generation engine to a new engine architecture. The Premium Process Query Engine lays the groundwork for handling larger data volumes while maintaining reliable performance and responsiveness.

This shift may lead to differences in query results due to updated logic and computation methods that align with modern standards and ensure optimal performance. This document outlines the most significant and commonly encountered differences, along with guidance on how to validate results and adjust queries when needed to match the behavior of the previous engine. Also deprecated behavior from the first-generation engine announced in the documentation will not be implemented in the premium engine.

Please note that other, more subtle differences may exist and are not exhaustively covered here.

## Difference in `NOT` Filter Behavior for `NULL` values

### Description

The behavior of the `NOT` operator in filters differs due to how each engine handles `NULL` values in logical expressions.

Filter

- undefined
- First-generation Engine
- Premium Engine

|  | **First-generation Engine** | **Premium Engine** |
| --- | --- | --- |
| Logic Behaviour | Two-valued logic (`TRUE` or `FALSE`) | Three-valued logic (`TRUE`, `FALSE`, or `UNKNOWN/NULL`)\* |
| `NULL` in conditions | Treated as `FALSE` | Evaluated as `UNKNOWN` (excluded when negated) |
| Effect of `NOT` | `NULL` values are included in result | `NULL` values are excluded from result |

|  | **First-generation Engine** | **Premium Engine** |
| --- | --- | --- |
| Logic Behaviour | Two-valued logic (`TRUE` or `FALSE`) | Three-valued logic (`TRUE`, `FALSE`, or `UNKNOWN/NULL`)\* |
| `NULL` in conditions | Treated as `FALSE` | Evaluated as `UNKNOWN` (excluded when negated) |
| Effect of `NOT` | `NULL` values are included in result | `NULL` values are excluded from result |

*\*Except for operators `IN` and `MULTI_IN`.*

### Example

| Query |
| --- |
| ``` FILTER NOT ("mytable"."id" = 1); ``` |

- **First-generation engine**: Returns all rows where `id` is not 1, including rows where `id` is `NULL`.
- **Premium Engine**: Returns only rows where `id` is not 1, but excludes rows where `id` is `NULL`.

### Recommendation

If your data may include `NULL`s and you want to preserve first-generation engine behavior, adjust the filter to explicitly handle them:

| Query |
| --- |
| ``` FILTER ( "mytable"."id" IS NULL OR "mytable"."id" != 1 ); ``` |

This explicitly includes rows where `id` is `NULL` or not equal to `1`, maintaining compatibility with the previous logic.

## Difference in Default Sorting

### Description

To ensure high performance with large datasets, the Premium Engine does not apply a default sorting to queries unless explicitly specified by the user with an `ORDER BY` clause. This aligns with standard industry practices. The first-generation engine may have provided a seemingly consistent default order, but this behavior was never guaranteed and should not be relied upon. This can lead to different results between the two engines, particularly with functions that rely on order to determine the result, such as `FIRST` or `LAST`.

### Example

| Query |
| --- |
| ``` STRING_AGG ( "CASE_TABLE"."ACTIVITY_ID", ', ' ) ``` |

- **First-generation engine**: May return a result like "123, 456, 789"
- **Premium Engine**: May return a different, non-deterministic result like "456, 789, 123" because there is no defined order.

### Recommendation

To ensure consistent and predictable results, you should always apply an explicit `ORDER BY` clause in your queries, especially when using functions where the order of data is critical. This includes operators like [FIRST](first.html "FIRST"), [LAST](last.html "LAST"), [STRING\_AGG](string_agg.html "STRING_AGG"), [PU\_FIRST](pu_first.html "PU_FIRST"), [PU\_LAST](pu_last.html "PU_LAST"), [PU\_STRING\_AGG](pu_string_agg.html "PU_STRING_AGG"), and all [window functions](window-aggregation.html "Window Aggregation").

## Difference in Sorting of Eventlogs

### Description

Similar to the previous difference, when querying unaggregated columns from an eventlog, such as in an OLAP table component, the Premium Engine does not apply any default sorting. The order of activities is not guaranteed, which can lead to mixed-up cases or an illogical sequence of events.

### Example

Consider an OLAP table showing `case id` and `activity names`. Without an explicit sorting applied, there is no guarantee that the activities will be displayed in their chronological order based on timestamps. Furthermore, it might also happen that different cases are mixed up.

### Recommendation

To view activity sequences correctly within cases, you should:

1. Always add both the case id and timestamp columns to your view.
2. Explicitly sort by `case id` first, and then by `timestamp` second.
3. For performance, it is highly recommended to filter on the specific cases you need, as sorting the entire event log can be computationally expensive.

## Difference in Allowance of Duplicated Primary Keys

### Description

The First-generation engine was more permissive towards duplicate values in primary key columns. To support advanced functionalities like Augmented Attributes & Tasks and ensure delta readiness for data models, the Premium Engine strictly enforces the uniqueness of primary keys directly during the load.

### Recommendation

If you encounter a primary key duplication error when loading a data model, you must go back to your data transformations and modify the necessary SQL queries to remove the duplicates. Once the transformations are corrected, reload the data model.

## Approximate and Exact Operators

### Description

In both the First-Generation and Premium Process query engines, all operations are performed in an exact manner by default. Additionally, the Premium Process Query Engine allows you to approximate calculations for `MEDIAN`, `QUANTILE`, `COUNT_DISTINCT`, and `COUNT_TABLE` by using the `APPROX` keyword. This significantly improves performance and scalability, though it may result in minor deviations from exact values.

### Recommendation

We strongly recommend using approximate calculations wherever reasonable, as those yield significant performance gains with little accuracy loss.


---

## pql/process/using-the-process-model

# Using the process model

The Process Adherence Manager shows a complete overview of your process model using a layout that resembles a subway map. Each subway line represents a specific event log and is displayed in a different color so you can easily differentiate between them. Each stop on the subway line is a specific event within that process, with multiple lines potentially meeting at the same stop.

The data included in the process model is based on the events selected when creating the model. You can customize the information shown in the model further by [applying filters](filtering-in-process-adherence-manager.html "Filtering in Process Adherence Manager").

|  |
| --- |
|  |

There are two modes for working with process models in PAM, View mode and Edit mode. By default, models are in **View mode**.

In View mode, you can:

- Report on data within the process model but cannot change it.
- [Add filters](filtering-in-process-adherence-manager.html "Filtering in Process Adherence Manager") to set which events are shown in the process model.

You access Edit mode by clicking **Edit mode** in the top right of the screen. In Edit mode, you can:

- Mine your baseline model.
- Add or remove specific event logs and events in the process model.
- Select variants.
- View and change the knowledge model used.

**Note**

Any changes you make will display in real time in the process graph. Any changes you've made to the process model since you created the target model will be discarded. While you’re modifying an asset, the **Edit mode** button is disabled for other users. If another user opens the asset in **View** mode, they’ll see a message indicating that you’re currently editing this asset.

The **map legend** explains what the different shapes, lines and icons used in the model mean. Click **Legend** in the lower right corner of Process Adherence Manager to view it.

|  |
| --- |
|  |

Expand all

[## Before you begin](#id569349_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Created a baseline model

[## Working with Process Designer model versions in PAM](#UUID-df08be26-81b3-880a-71d1-3aaaf7fc0259_section-idm234984448683784_body)

If you created your target model by importing a BPMN model from [Celonis Process Management](https://docs.celonis.com/en/celonis-process-management.html), you may want to know which version of the BPMN model you used and whether it's still the latest version available.

To work with model versions, follow these steps:

1. Open a target model that was created by importing a BPMN file from CPM.
2. In **Edit** mode, hover your cursor over **Target Model**.

   Information about your model appears.
3. If the model status is:

   1. **Valid**, the BPMN model used to create your target model in PAM is still the latest version in Process Designer and no further action is required.
   2. **Invalid**, the BPMN model used to create your target model in PAM has been updated in Process Designer and action is required; see step **4**.
4. Select the triple-dot button.

   The options available appear.
5. Select:

   1. **Use last valid version** to use the lastest version of the model from Process Designer; if any new activities have been added, you'll be prompted to map them to your event logs.
   2. **Open in Process Designer** to view your current target model in Process Designer.
   3. **Unlink from Process Designer** if you don't want your current target model to be connected to the Process Designer model.

[## Searching in the process model](#UUID-df08be26-81b3-880a-71d1-3aaaf7fc0259_section-idm234374342410655_body)

To search the process model, follow these steps:

1. Click the **Search** icon to the right of the process model graph.
2. Enter your criteria in the **Search** field.

   As you enter your search criteria, any events logs and events matching your criteria are displayed, with the colored squares indicating which event log the event appears in.
3. Click any search result to go directly to that event in the process model.

   |  |
   | --- |
   |  |

[## Changing the metrics displayed in the process model](#UUID-df08be26-81b3-880a-71d1-3aaaf7fc0259_section-idm234374347081678_body)

To change the metrics displayed, follow these steps:

1. Click the metric button in the upper left corner to open the metric switcher.

   **Note**

   The icon for the metric switcher varies according to the metric that is currently selected. If **Thoughput time** is selected, for example, a stopwatch icon displays.
2. Select the metric you want to use from the dropdown.

   The metric displayed on the edges and events within the process model and the units used are updated automatically.

[## Event icons in the process model graph](#id569431_body)

| Icon | Name | Description |
| --- | --- | --- |
| |  | | --- | |  | | Event Start/Event End | - The triangle icon indicates the first event. - The square icon indicates the last event. |
| |  | | --- | |  | | Exclusive split | The diamond icon indicates an exclusive split of the event flow. This indicates only one of the outgoing paths is taken. |
| |  | | --- | |  | | Parallel Gateway | A horizontal bar (parallel gateway) indicates parallel behavior. All the ongoing paths are taken but their order can differ. All incoming paths join at the gateway before the next events occur. |
|  | Self-loop | A looping arrow in an event log indicates a self-loop. The looping arrow has the same color as the event log it occurs in. If a self-loop occurs in multiple event logs, mutiple looping arrows matching the event log colors will display. |

## Related topics

- [Refining a baseline model](refining-a-baseline-model.html "Refining a baseline model")
- [Filtering the process model](filtering-in-process-adherence-manager.html "Filtering in Process Adherence Manager")
- [Creating a PAM model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model")Creating a PAM model


---

## pql/process/what-is-business-process-management--bpm--

# What is Business Process Management (BPM)?

Business Process Management (BPM) is a crucial discipline for every company. It provides a structured and systematic approach to managing and improving business processes. BPM contributes significantly to an organization's success and competitiveness in the dynamic business environment by optimizing workflows, reducing costs, and enhancing overall efficiency.

The key components of BPM may be described as:

| BPM component | Description |
| --- | --- |
| Process Identification and Design | Identify and map out existing processes within the organization.  Design or improve new processes to align with organizational goals and objectives. |
| Process Implementation | Deploy the designed processes within the organization, involving employees and stakeholders in the change management process.  Integrate technology and automation to streamline and optimize workflows. |
| Process Monitoring | Implement monitoring mechanisms to track and measure the processes' key performance indicators (KPIs).  Use real-time data and analytics to identify bottlenecks and value opportunities. |
| Process Optimization | Continuously analyze and optimize processes based on performance data and feedback.  Implement changes to enhance efficiency, reduce costs, and improve overall performance. |
| Collaboration and Communication | Foster collaboration and communication among employees and departments to ensure smooth and coordinated process execution.  Encourage cross-functional teams to work together towards common objectives. |
| Automation | Integrate technology solutions to automate routine and repetitive tasks, reducing manual effort and minimizing errors.  Use workflow automation tools to improve the speed and accuracy of processes. |

Overall, the key benefits of BPM may be summarized as:

- Streamlining processes for efficiency.
- Reducing cost.
- Improving performance.

Proper implementation of BPM enhances productivity, ensures standardized quality, and promotes adaptability for customer satisfaction. Aligning with regulations, BPM fosters a culture of continuous improvement, contributing to long-term competitiveness in the dynamic business landscape.

## Related topics

- [Celonis Process Management BPMN reference](celonis-process-management-bpmn-reference.html "Celonis Process Management BPMN reference")
- [Exporting BPMN models from Process Adherence Manager](exporting-bpmn-models-from-process-adherence-manager.html "Exporting BPMN models from Process Adherence Manager")


---

