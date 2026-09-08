# PQL: Process Functions (Part 1)

## pql/process/12--get_process_model---get-process-model

# 12. `get_process_model` — Get Process Model

**Mode**: Intelligent only · **Category**: Data Retrieval · **Copilot types**: Internal, Chat

Returns the process model as a DOT graph or list of top variants. No user-configurable fields beyond base config.

```
- id: get_process_model
```

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Get Process Data tool](13--get_process_data---process-data.html "13. get_process_data — Process Data")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## pql/process/13--get_process_data---process-data

# 13. `get_process_data` — Process Data

**Mode**: Intelligent only · **Category**: Other · **Copilot types**: Internal, Chat

Retrieves event-log-level data at activity, case, or connection granularity. No user-configurable fields beyond base config.

```
- id: get_process_data
```

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Execute Orchestration Engine tool](14--execute_orchestration_engine---oe-execute.html "14. execute_orchestration_engine — OE Execute")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## pql/process/5--display_process---display-process

# 5. `display_process` — Display Process

**Mode**: Intelligent only · **Category**: Data Visualization

Displays a process map (process explorer) in the frontend. The LLM decides event log, process filters, and data filters at runtime. No additional user-configurable fields beyond base config.

```
- id: display_process
```

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Trigger Action Flows tool](6--trigger_action_flow---trigger-action-flows.html "6. trigger_action_flow — Trigger Action Flows")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## pql/process/celonis-process-management

# Celonis Process Management

Celonis Process Management features two core products: the Process Designer and the Process Navigator. As the names imply, the Process Designer lets you design your processes and all the elements that come with them. At the same time, the Process Navigator allows others in your organization to consume the content published through the Process Designer.

Find out more about [Business Process Management (BPM) and Celonis](what-is-business-process-management--bpm--.html "What is Business Process Management (BPM)?")before diving deeper into Process Designer and Process Navigator.

## Online Resources

- [Getting started with Process Designer](getting-started-with-process-designer.html "Getting started with Process Designer")
- [Process Navigator](process-navigator.html "Process Navigator")
- [Release Notes](release-notes.html "Release Notes")
- [Admin documentation](celonis-process-management-administrator-guide.html "Celonis Process Management Administrator Guide")
- [Developer documentation](https://developer.celonis.com/)

## Additional Resources

Click the links below to download additional information you may need.

**Important**

The PDFs linked below are legacy content and are no longer updated as of March 2024. In addition, our current documentation is only available in English.

| English | German |
| --- | --- |
| See the online help links above. | [User Manual (German version)](https://docs.celonis.com/downloads/User_Manual_DE.pdf) |
| [Quick Guide Process Designer](https://docs.celonis.com/downloads/QuickGuide_Process_Designer_EN.pdf) | [Quick Guide Process Designer](https://docs.celonis.com/downloads/QuickGuide_Process_Designer_DE.pdf) |
| [Quick Guide Process Navigator](https://docs.celonis.com/downloads/QuickGuide_Navigator_Celonis_EN.pdf) | [Quick Guide Process Navigator](https://docs.celonis.com/downloads/QuickGuide_Navigator_Celonis_DE.pdf) |


---

## pql/process/celonis-process-management-add-ons--legacy-

# Celonis Process Management Add-Ons (legacy)

Celonis Process Management Add-ons are optional functionalities that only apply to legacy Symbio customers and require additional licensing. They are:

## Business intelligence

| Reporting services | Description |
| --- | --- |
| Evaluate Celonis Process Management data with Celonis Process Management standard reports. | Various standard reports are available and can be operated within the reporting environment. The rent covers the operation of the standard reports. |
| Set up customer-specific reporting (optional) | Customer-specific reports can be ordered additionally (optional) and added to the process landscape. The operation and further development are to be covered by a separate service budget from the customer. |
| Integration of the reports into the Celonis Process Management user interface | The reports are integrated into the Reports section in Celonis Process Management. Only the analyst can access them here, which also ensures that only analysts can access them. |

## Interfaces

| Interfaces to third-party tools | Description |
| --- | --- |
| SAP Solution Manager Connector | The Celonis Process Management SAP Solution Manager interface allows SAP customers to synchronize their data with the BPM from the SAP Solution Manager. The synchronization is usually done via the design branch. In Celonis Process Management, the identical methods as in Solution Manager are used to ensure continuous synchronization with all necessary SAP libraries (Process Step Library, Executable Library, etc.).  For more information, see [Introduction to SAP Solution Manager Connector](https://developer.celonis.com/cpm/admin/services/sap-solution-manager-connector/introduction_overview/#introduction). |
| DeepL Translation Service | The Professional DeepL Translation Service can be easily connected to Celonis Process Management. This means that all text in several languages is translated simultaneously. Due to the high translation quality, manual reworking in English, for example, is hardly necessary. The translations with the Professional DeepL Service are not stored, and the data does not leave Germany. |
| Power BI / Data Warehouse | Users of data warehouse services (e.g., analysts) can create their own reports using business analysis tools such as Power BI and MS Excel. |


---

## pql/process/celonis-process-management-administrator-guide

# Celonis Process Management Administrator Guide

This Celonis Process Management documentation describes Celonis Process Management tasks and activities which can be only executed by users who have the application role “Administrator” in Celonis Process Management.

Administrators get useful information about the installation and administration of Celonis Process Management and learn more about all available features and services.It applies to the standard version of Celonis Process Management. Personlized customer configurations may differ in contents and visually from the functionality and options described in this documentation.

In addition, you can refer to the [Basic Administration in Process Designer](https://academy.celonis.com/courses/basic-administration-in-process-designer) course at Celonis Academy for further help.

Expand all

[## Before you start](#id857024_body)

This section provides minimum system requirements that have to be met in order to make use of the Celonis Process Management products. OnPrem installation is only available on request. All user manuals and other assets regarding our products can be found [here](https://docs.celonis.com/en/celonis-process-management.html).

**Celonis Process Management system requirements**

**Minimum requirements for client computers**

This section provides minimum software requirements for a client computer to work with Celonis Process Management.

**Browser support matrix**

We are continuously working on providing the best experience to our users. Using the newest technology available on the market sometimes requires dropping support for some older browser versions. The following browsers are currently fully supported:

| Browser | Version |
| --- | --- |
| Microsoft Edge | Last two released versions |
| Mozilla Firefox | Last two release ESR versions |
| Google Chrome | Last two released versions |

Celonis Process Management also runs on the **Safari/iOS**browser, but this is not tested explicitly. In August 2020 Microsoft has announced the timeline for the ending support for Internet Explorer 11 (IE 11) across the 365 apps and services. We will follow this procedure and discontinue supporting **Microsoft's IE 11**.

**Recommended bandwidth ranges**

This section provides generally recommended bandwidth ranges. Bandwidth ranges of 3 megabits per second (Mbps) (dual T1) and greater with latencies no greater than 250 milliseconds (ms)

**Single Sign-On/SAML 2.0**

Celonis Process Management supports SAML 2.0 and the following Identity Providers (IdP):

- Microsoft Active Directory Federation Services (MS ADFS)

  Microsoft Azure Active Directory (MS AAD)

  Ping Identity

  OneLogin.com

  Other Identity Providers might work because of SAML 2.0 but need to be treated as a separate project if out-of-the-box configuration does not work. Please also refer to our online help [here](https://developer.celonis.com/cpm/admin/installation-guide/saml-configuration/1_introduction/).

[## Support](#id857076_body)

Please visit [our support website](https://docs.celonis.com/en/celonis-process-management.html) in case of questions, demands and issues.

[## Dos and Don'ts in Celonis Process Management](#id857080_body)

Generally specific admin tasks like configurable system settings, e.g. Document template, mail settings, theme settings can be executed with low risk. If mail settings are incorrectly configured, then these settings can be fixed without any downtime.

### Dos

Generally specific admin tasks like configurable system settings, e.g. Document template, mail settings, theme settings can be executed with low risk. If mail settings are incorrectly configured, then these settings can be fixed without any downtime.

**Import/Export (Data migration)**

- First always import a test import into a sandbox database.
- Use the Excel mass data export/import for translations. New objects will not be generated. If a released/expired version already exists, a new version will be generated.
- Use the Excel-Importer to import from data from other systems, for example. The import includes only newly generated objects or refreshes of objects and does not include the deleting of objects. NOTE: in order to obtain a satisfactory result, we strongly recommend to consider the Excel import/export exclusively as a project and to perform it only with the help of our support.
- How attributes are refreshed can be configured (OVERRIDE, RETAIN or APPEND); how relations are refreshed can be configured, too (PredecessorSupportsMultipleSuccessors, SuccessorSupportsMultiplePredecessors and SuccessorDeleteDifferentOldPredecessors)
- Elements which are NOT imported again by a new import will get the status “expired “
- Deletions and Merges must be done manually using the import log
- Please also see Setup Configuration for Excel-Import
- Update-Imports need an identifier which identifies objects even after there have been name changes, e.g. if an organizational unit is changed; it must be possible to maintain the attribute at the version container (AT\_ID)

### Donts

We currently do not recommend executing the following tasks:

**Import**

- Do not import ARIS data if import data already exists in target storage due to consolidation issues, especially with master data.
- Do not import more than single file. Parallel imports increase import time and might run into issues

  - Celonis Process Management Data import (SYMX)
  - ARIS data (XML)
  - BPMN import (XML)

    Massdata import (XLSX) of the same type, e.g. Roles by Admin1 and Roles by Admin2
  - Massdata import (XLSX) of different types
- Do not import the same processes a second time. After the first import they should only be edited in the target Celonis Process Management directly.
- Do not import Celonis Process Management Data (SYMX) files if the source databases contain process house/default categories and the target database already has such data. The target database must be empty. An export of process house and categories is impossible since version 5.9.
- Do not import Celonis Process Management Data (SYMX) files if the source database is a higher Celonis Process Management version than the target database.
- Do not import Celonis Process Management Data (SYMX) files if the source database uses another configuration than the target database.

**Export**

In large databases it’s not recommended to execute the following tasks during business hours:

- Do not export all processes via Massdata because of performance/memory issues on Web server.
- The Excel-Importer only support files with plain data tables, so it explicitly does not support external data sources, macros, pivot tables or calculated fields/cells.
- Do not use the Celonis Process Management Data export (SYMX) on the Process House or in large categories due to size of exporting data.
- Do not use the Storage export (SYMX) in Storage Collection due to size of the database.

**Feature activation**

Before you activate any feature, you have to verify its correct usage in a sandbox database.

**System settings**

Some system settings might affect all users and should be tested in a sandbox database before:

- Do not change SAML settings without any reason if it previously works. Please make use of multiple authentication providers in a sandbox database in same environment before.

**Consolidation of users and user groups**

In Celonis Process Management, users and user groups can be consolidated so that all references from one user are transferred to another user or user group. Depending on database size and Celonis Process Management version, this can be a very time-consuming step.

- Do not consolidate users or user groups if no regular database backup exists.
- Do not consolidate users or user groups if you didn't perform an user consolidation test in a copy of productive database successfully.
- Do not consolidate users or user groups referenced in many processes/master data during peak business hours.

### Dos and Don'ts of an Architect

For a for a better understanding, the tasks of a user with the role "Architect" are as follows:

#### Dos

**Administration of the process architecture**

- Set up and modify categories (including permissions)
- Create, modify and version main processes
- Release and expire main processes and sub processes
- Delete and move main and sub processes within their architecture

**Administration of objects**

- Create, modify and version objects in tabular or hierarchical structure
- Release and expire objects
- Delete and move objects within their hierarchy Consolidate objects ( NOTE: Only objects in version 0.1 can be consolidated)
- Making objects and processes available for release
- Change attributes in released processes without versioning (audit proof)

  Attributes that can be edited without re-release are: responsible, author, start/end of validity, scope-filter (responsible organizations, locations, tags)

**Set up Customer Experience Management**

- Create, modify and delete touch points
- Create, modify and delete sales channels
- Create, modify and delete stakeholders

**Apply sorting function**

- Create or generate uploaded documents for guidelines / manuals as pdf
- Maintain ID Provider
- Clean up processes, objects and hierarchy to keep them up to date
- Clean up "orphaned" view (should be empty)

NOTE: We recommend not creating more than 50 elements per level in hierarchies (processes/objects).

### Donts

No more than one architect should consolidate objects in the same navigation at the same time, otherwise there is a risk of consolidating objects mutually, which can lead to data inconsistencies.

No more than one architect should move or delete elements in architectures/hierarchies (of processes or objects) at the same time (e.g. categories or processes/objects that have not yet been released) - under no circumstances should elements be moved in parallel in the same branch. This also applies to moving from the "orphaned" view.

When deleting subtrees (processes, objects, categories or similar), all child elements should have been deleted or moved before. The same applies to setting the status to "expired".

## Related topics

- [Getting started with Process Designer](getting-started-with-process-designer.html "Getting started with Process Designer")
- [Getting started with Process Navigator](getting-started-with-process-navigator.html "Getting started with Process Navigator")
- [Logging in to Celonis Process Management](logging-in-to-celonis-process-management.html "Logging in to Celonis Process Management")


---

## pql/process/celonis-process-management-apis

# Celonis Process Management APIs

The Developer Center contains additional developer resources for using [Celonis Process Management APIs](https://developer.celonis.com/cpm/developer/openapi/openapi/overview/), including API reference docs, schemas, requirements, and FAQs. Use the resources below to learn how to connect these APIs to your data in the Celonis Platform. The [legacy versions](https://developer.celonis.com/cpm/developer/rest-api/overview/bpmn-api/) of these APIs are also documented, but not recommended for new implementations.

## Symbio Process Manager APIs

These APIs are used to generate, retrieve, update and delete Symbio elements from within the Celonis Platform:

- Learn to use the [BPMN API](https://developer.celonis.com/cpm/developer/openapi/openapi/tag/BPMN-API-(Version-2)/) to generate a BPML file for a given element or import a specific BPMN to an endpoint.
- Use the [Data API](https://developer.celonis.com/cpm/developer/openapi/openapi/tag/Data-API-(Version-2)/) to retrieve data with pagination or for a specific ID, as well as create, update and delete elements.
- Retrieve information about a specific facet or all facets of a certain type in Symbio using the [Facets API](https://developer.celonis.com/cpm/developer/openapi/openapi/tag/Facets-API-(Version-1)/).
- By using the [File API](https://developer.celonis.com/cpm/developer/openapi/openapi/tag/File-API-(Version-1)/), you can retrieve, create, update or delete files in Symbio.
- Take advantage of the [Stereotypes API](https://developer.celonis.com/cpm/developer/openapi/openapi/tag/Stereotypes-API-(Version-1)/) to retrieve, create, update, or delete stereotypes in Symbio.

## Related topics

- [Developer documentation](developer-documentation.html "Developer documentation for Celonis APIs")


---

## pql/process/celonis-process-management-bpmn-reference

# Celonis Process Management BPMN reference

The following sections describe the basic BPMN elements that are necessary to know in order to work with Celonis Process Management.

Expand all

[## BPMN basics](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234664980166302_body)

| Type | Description |
| --- | --- |
| Swimlane | Demonstrate organizational and technical responsibilities. |
| Task | An atomic activity that defines a unit of work within a process. It has exactly one incoming and one outgoing sequence flow. |
| Connection | Define the order in which tasks are performed. |
| Gateway | Split or join the control flow. Best practice is to keep this differentiation hard so that a gateway either has exactly one incoming and several outgoing sequence flows or vice versa. |

[## Task types](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234645970011483_body)

| Icon | Name | Description |
| --- | --- | --- |
| |  | | --- | |  | | Message task | Send or receive a message to or from a participant (eventually another BPMN pool). |
| |  | | --- | |  | | User task | Executed by a person with the assistance of a process-aware application. Typically performed via an application user interface. |
| |  | | --- | |  | | Manual task | Executed by a person without the aid of a process-aware application, often without user interface. Example: telephone call. |
| |  | | --- | |  | | Business rule task | Used to determine or calculate an output based on some input data. Examples: setting a priority, calculating cost. Often used before a gateway to decide on the right path. |
| |  | | --- | |  | | Service Task | No human interaction. Automatically executed by some sort of an external service such as a web service. |
| |  | | --- | |  | | Script Task | No human interaction. Executed by a process execution engine. Example: assigning a new helpdesk ticket to an operator. |

[## Task markers](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234664984621026_body)

|  |  |  |
| --- | --- | --- |
| |  | | --- | |  | | Loop | Repeats a task until condition is true (like “WHILE). |
| |  | | --- | |  | | Sequential multi instance | Sequentially executes a task for all items (like “FOR EACH”). |
| |  | | --- | |  | | Parallel multi instance | Instances are executed in parallel (like “FOR EACH”). |

[## Connections](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234645970133938_body)

|  |  |  |
| --- | --- | --- |
|  | Sequence flow | Defines the order in which tasks are performed |
|  | Message flow | Indicates the flow of messages between pools |
|  | Association | Links information (carriers) with other elements |

[## Event types](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234645970313027_body)

|  |  |  |
| --- | --- | --- |
|  | Start event | Initiates the process. A process can have multiple start events. A start event has no incoming and exactly one outgoing sequence flow. |
|  | Intermediate event | Indicates an event (that eventually needs to be waited for) within a process. It has exactly one incoming and one outgoing sequence flow. |
|  | End event | Regularly ends or terminates the process. It has exactly one incoming and no outgoing sequence flow. A process can have multiple end events. |

[## Gateways](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234645970551833_body)

| Icon |  |  |
| --- | --- | --- |
| |  | | --- | |  | | Exclusive | Alternative paths. Exactly one path is activated / consumed. |
| |  | | --- | |  | | Parallel | Combines or activates all incoming / outgoing paths. |
| |  | | --- | |  | | Inclusive | Indicates alternative but also parallel paths. One or several paths can be activated or consumed. |

[## Events](#UUID-7e09e06e-6faa-56fe-7763-101cc268a25c_section-idm234645971370864_body)

|  |  |  |
| --- | --- | --- |
| |  | | --- | |  | | Message | Receiving (catch) or sending (throwing) messages. |
| |  | | --- | |  | | Timer | Cyclic events, point in time, time spans or timeouts. |
| |  | | --- | |  | | Escalation | Escalation to a higher level process or responsibility. |
| |  | | --- | |  | | Conditional | Reaction on changed circumstance. |
| |  | | --- | |  | | Link | Connector between different points in a sequence flow (throw vs. catch). |
| |  | | --- | |  | | Compensation | Handling a compensation |
| |  | | --- | |  | | Signal | Receiving (catch) and sending (throw) signals across different processes. |
| |  | | --- | |  | | Cancel | Triggering cancellation or reacting to cancellation. |
| |  | | --- | |  | | Error | Catching or throwing errors. |
| |  | | --- | |  | | Terminate | Immediately terminates |

## Related topics

- [What is Business Process Management (BPM)?](what-is-business-process-management--bpm--.html "What is Business Process Management (BPM)?")
- [Exporting BPMN models from Process Adherence Manager](exporting-bpmn-models-from-process-adherence-manager.html "Exporting BPMN models from Process Adherence Manager")


---

## pql/process/celonis-process-management-feature-overview

# Celonis Process Management feature overview

The feature overview describes all functions and related services in Celonis Process Management.

Some functions represent an additional service with investment expenditure and are marked accordingly. Customer-specific adjustments are not included.

The underlying Celonis Process Management user role concept is hierarchically structured, i.e., the higher role level contains all functions of the role below and additional functions.


---

## pql/process/celonis-process-management-to-sap-solution-manager-diagram-synchronization

# Celonis Process Management to SAP Solution Manager diagram synchronization

This topic introduces the basics regarding how Celonis Process Management diagram elements are synchronized to SAP Solution Manager.

Expand all

[## Events](#UUID-44b71162-0636-1969-e421-4e395cb2a639_events_body)

All events from Celonis Process Management will be synchronized to adequate SAP Solution Manager event:

1. StartEvent => StartEvent
2. IntermediateEvent => IntermediateEvent
3. EndEvent => EndEvent

[## Gateways](#UUID-44b71162-0636-1969-e421-4e395cb2a639_gateways_body)

AND Gateways will be synchronized as an SAP Solution Managers Gateway Parallel:

OR Gateways will be synchronized as an SAP Solution Managers Gateway Inclusive. Since SAP Solution Manager does not have “Condition” elements, conditions will be written on the connector arrows:

Either-OR Gateways will be synchronized as a SAP Solution Managers Gateway Exclusive. Since SAP Solution Manager does not have “Condition” elements, conditions will be written on the connector arrows:

[## Tasks](#UUID-44b71162-0636-1969-e421-4e395cb2a639_tasks_body)

Both Local task and Global task in Celonis Process Management can be synchronized in SAP Solution Manager in two ways: as a draft task or as a process step.

If a Best Practice Task is attached to the task element, microservice will synchronize that task as a Process Step.

If a Best Practice Task is not connected to a task, a draft taskwill be created in the SAP Solution Manager.

If a Best Practice Task is attached, a reference to the Process Step will be created in the diagram. A reference will have the name and a description of the task, but also a reference to the original Process Step which will remain unchanged.

### Documents attached to global tasks

If you attach a link document to the Global Task in Celonis Process Management, it will also be synchronized with the Global Task. Be aware that this is only available if you are creating a reference to the Process Step, so a connected Best Practice Task is required.

The main point of the consolidation is to keep the consistent state between task references in Celonis Process Management in Solution Manager. The users in both systems can changes the references, so the first rule to note is: **Solution Manager is the owner of the process step references.**

This means that if a task in Solution Manager has a reference, this reference cannot be overridden by the task reference that comes from Celonis Process Management.

#### Scenario 1: Synchronize task without best practice task to Solution Manager

In Celonis Process Management you have an task that doesn’t have a best practice task attached.

You want to synchronize this sub process to Solution Manager. When the synchronization starts the tasks that do not have the best practice task attached will be provided with a special **default process step original**. All the tasks that don’t have a best practice task will reference the same default process step original.

Below is a graphical representation of the synchronization:

From here, there are two possible cases:

##### Case 1: Celonis Process Management user attached a Best practice task to a Task

A user in Celonis Process Management attached a Best practice task to a task. Then they synchronize this to Solution Manager.

This will change the task reference on the Solution Manager side. If again the Best practice task is changed and the synchronization from Celonis Process Management to Solution Manager is done, the reference will change.

##### Case 2: SAP Solution Manager user attached a Process step original to a Task

Another user changes the target of the process step reference in Solution Manager and chooses a real process step original instead.

If the user wants to consolidate this back to Celonis Process Management, if they can click **Synchronize SAP Step library Object to Celonis Process Management** to look for the differences between the references of tasks from Celonis Process Management and Solution Manager. If there is difference the reference from Solution Manager will take priority.

Now the task will also have another custom attribute called “SolMan Process step original id”, that stores the ID of the SAP Solution Manager reference from the latest consolidation. Now if a user changes the best practice task attached to the task and tries to synchronize this to Solution Manager, it will fail. Now, when that task has been consolidated, it will not be possible to synchronize change of the reference to Solution Manager. If another user in SAP Solution Manager changes the reference and consolidates again, this will change the best practice task attached.

**Note**

If both sides of the references change, and the user doesn’t select the **Synchronize SAP Step library Object to Celonis Process Management** option to consolidate the change from Solution Manager to Celonis Process Management, then when synchronizing from Celonis Process Management to Solution Manager the Celonis Process Management reference will win. So if the user wants their changes to be consolidated to Celonis Process Management, they have to select that option or these changes will be lost the next time they synchronize a sub process from Celonis Process Management to Solution Manager.

Also the default process step original will never be consolidated and will never exist in Celonis Process Management.

#### Scenario 2: Synchronize Task with Best practice task to SAP Solution Manager

When a user creates a task and attaches a best practice task to it, and then synchronize that sub process to Solution Manager the task reference will be synchronized to Solution Manager. Until the user consolidates, they can change the reference from Celonis Process Management to SAP Solution Manager. Once they have consolidated the change, it will not be possible in SAP Solution Manager.

## Related topics

- [Synchronize SAP Solution Manager elements to Celonis Process Management](synchronize-sap-solution-manager-elements-to-celonis-process-management.html "Synchronize SAP Solution Manager elements to Celonis Process Management")
- [Celonis Process Management to SAP Solution Manager synchronization](celonis-process-management-to-sap-solution-manager-synchronization.html "Celonis Process Management to SAP Solution Manager synchronization")
- [Synchronize SAP Solution Manager elements to Celonis Process Management](synchronize-sap-solution-manager-elements-to-celonis-process-management.html "Synchronize SAP Solution Manager elements to Celonis Process Management")


---

## pql/process/celonis-process-management-to-sap-solution-manager-synchronization

# Celonis Process Management to SAP Solution Manager synchronization

This topic introduces the basic rules of how to create the structure of the elements in Celonis Process Management in order for the synchronization to work properly. Also included is the way to synchronize, with special cases of deletion and movement of elements in Celonis Process Management.

Expand all

[## Before you begin](#id865592_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Makes sure you've followed the steps in the [Setting up the SAP Solution Manager Connector](setting-up-the-sap-solution-manager-connector.html "Setting up the SAP Solution Manager Connector") topic.

[## Synchronizing structure from Celonis Process Management to SAP Solution Manager](#UUID-45dfd2ac-435c-0160-2e71-8d1e4e608e62_synchronizing-structure-from-celonis-process-management-to-sap-solution-manager_body)

In the new SAP Solution Manager interface the synchronization will be possible only for one sub process at a time. The synchronization will occur in three cases: 1. When manualy selecting the sub process and clicking a button for synchronization; 2. When releasing a sub process to state “released”; 3. When the sub process that is already synchronized is deleted from Celonis Process Management.

The process will synchronize the selected the sub process and all of its root paths (all parent main processes and categories).

1. When you have succesfully linked the Celonis Process Management storage with the SAP Solution Manager interface, go to the **Processes** facet and create a structure you want to syncronize.
2. Once you have the sub processes that you want to syncronize, go to **architecture**.
3. Select the sub process you want to synchronize and select “sync” from the **Export** dropdown menu.

Once the button is clicked the synchronization is started. In a few seconds you can navigate to the SAP Solution Manager branch and check if the structure is synchronized.

### Synchronization of documents

Documents can be synchronized if they are attached to sub processes or main processes as corona elements. First create a document in **documents-architecture**. Add an attachment to the document that contains the ULR to an online document.

Go to **processes-architecture**. Select the sub process and add the created document to it.

Synchronize the sub process and the document will be shown.

The document will only be synchronized if: 1. It has the link attached to it. 2. If the link is a url to an online document.

#### Deletion

If you delete the sub process then it will be removed from SAP Solution Manager as well. If you remove the main process or category then nothing will change in SAP Solution Manager. You will have to manually synchronize the new structure again.

#### Moving of elements

If you move a sub process, main process or category you also have to manually sync the sub processes if you want to view the new structure in SAP Solution Manager.

[## Recommendations for creating structure in Celonis Process Management](#UUID-45dfd2ac-435c-0160-2e71-8d1e4e608e62_recommendations-for-creating-structure-in-celonis-process-management-for-synchronization_body)

Because Celonis Process Management and SAP Solution Manager have some differences in the way or representing the structure, not all structure from Celonis Process Management can be synchronized to SAP Solution Manager. Below there will be recommended structures that are possible so synchronization, and then the structure that should be avoided if you want to sync the structre to SAP Solution Manager. For the synchronization to work there always has to be a sbu process at the bottom of the structure.

### Recommended structure

1. A category can have multiple categories as a child elements.

2. A category can have multiple main processes as child elements.

3. A main process can have multiple main processes as a child elements.

4. A main process can have multiple sub processes as a child elements.

### Structures that should be avoided

1. A category should not have a sub process as a child.

2. A main process should not have a main process and sub process as child elements.

3. Elements of type “Scenario” will not be synchronized.

4. Main processes that do not have a sub process as a child or a leaf will not be synchronized.

### Special case

In the following structure:

The sub process is selected and synchronization between Celonis Process Management and SAP Solution Manager is done. The sub process is deleted in Celonis Process Management.

Instead a new main process is put.

The synchronization is not possible. Once the synchronization of a main process that has a sub process has been completed, it is no longer possible that this main process has main processes as children.

This is because a main process can be represented in SAP Solution Manager with two types depending if it has sub processes as children.

The recommended action is to delete the main process also and start creating this part of the structure from the beginning.

## Related topics

- [Celonis Process Management to SAP Solution Manager diagram synchronization](celonis-process-management-to-sap-solution-manager-diagram-synchronization.html "Celonis Process Management to SAP Solution Manager diagram synchronization")
- [Synchronize SAP Solution Manager elements to Celonis Process Management](synchronize-sap-solution-manager-elements-to-celonis-process-management.html "Synchronize SAP Solution Manager elements to Celonis Process Management")
- [Setting up the SAP Solution Manager Connector](setting-up-the-sap-solution-manager-connector.html "Setting up the SAP Solution Manager Connector")


---

## pql/process/check-processes-or-objects

# Check processes or objects

When a process or object is ready for release, designated approvers must review the content to ensure accuracy and compliance. Approvers are notified via email, and pending tasks are centralized within Process Designer.

Expand all

[## Before you begin](#UUID-aa557be0-a05b-fa91-5b07-22ab9fe463e8_section-id235539086810453_body)

Before you can take action on a pending release, ensure you have the necessary permissions and access rights.

- You must be assigned as an approver for the specific process or object.
- Access to the TASKBOARD in the Process Designer.

[## Reviewing and releasing processes](#UUID-aa557be0-a05b-fa91-5b07-22ab9fe463e8_section-id235539086923916_body)

Follow these steps to locate, evaluate, and finalize the status of a process or object.

1. **Locate the Task**: Start by accessing your pending worklist through the automated notification or the platform home screen.

   - Open the link provided in your notification email, OR
   - Navigate to **HOME > My Tasks** in the Process Designer.
   - The header at the top of the screen will display the total number of pending tasks.
2. **Review the Details**: Perform a thorough check of the process content and metadata to ensure it meets your department's standards.

   - Select the task from the **TASKBOARD**.
   - Review the **Detail Content** pane on the right for task information, including the creator and creation date.
   - Click the link in the **Release information** section to open the process/object directly for a detailed technical review.
3. **Take Action**: Once your review is complete, choose the appropriate workflow action to move the task forward.

   In the TASKBOARD, select one of the following options:

   | Action | Result |
   | --- | --- |
   | Accept | The status changes to Released. It becomes Valid on the defined start date (or automatically after two weeks). |
   | Reject | You must enter a comment. The status resets to In process, and the author is notified. |
   | Delegate | Assign the decision to another person. |

[## Important status transitions](#UUID-aa557be0-a05b-fa91-5b07-22ab9fe463e8_section-id235539088272771_body)

Understanding how status changes affect visibility is crucial for maintaining an accurate version history.

- **Released to Valid**: If a "start of validity" date was previously defined, the process becomes Valid on that date. If no date was set, it defaults to two weeks after the release.
- **Version Control**: Once a new version becomes Valid, all previous versions are automatically updated to Expired.

**Note**

Rejection acts as a reset; the item is removed from your Taskboard and will only reappear if the author submits a corrected version for a new release request.

## Related topics

- [Main and sub processes](creating-and-managing-processes.html "Creating and managing processes")
- [Process attributes](managing-process-attributes.html "Managing process attributes")


---

## pql/process/configuring-your-process-designer-storage

# Configuring your Process Designer storage

Additional configuration options are available in the Admin area. These include hiding various information, renaming the standard interface, adding new attributes or changing them.

Expand all

[## Before you begin](#id861706_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Admin role in Celonis Process Management

[## Configuring your storage](#id861712_body)

1. Navigate to the Admin area and click the **Extended configuration** tile.
2. Create a new type with one of the configuration options **Hide, Rename, Add** or **Change**.

The next sections describe these configurations in more detail.

**Note**

To apply all changes, the configuration has to be activated by clicking on check box and additionally applied afterwards.

### Hide detail content

This configuration allows to hide views or specific attributes in the Detail Content. If this should be hidden for viewers only, please activate the checkbox **Only for viewer** accordingly.

#### Hide graphic layout

The configuration “Hide graphics options” allows the administrator to minimize the graphical selection in processes. All standard graphics in Celonis Process Management and the user-defined fact sheets can be managed with this configuration.

1. Select type “Hide graphic layout“
2. Enter name for configuration entry (e.g. detailed view Sub Process)
3. Define settings
4. Activate configuration entry
5. Apply changes (this only works for configuration entries which are activated in the Detail Content; all configuration entries are always applied).

#### Collapse views

With this configuration, individual areas such as Detail Content or the navigation tree can be collapsed for Viewer and/or Editor.

#### Hide attributes

The configuration Hide attributes allows you to delete content in the Detail Content, e. g. “Risk assessment”.

#### Hide referenced objects

The configuration Hide referenced objects you can hide certain elements you do not need for modeling. Example: Hide “Requirements” in Detail Content

1. Create configuration entry with meaningful name (e.g. Requirements DC)
2. Define settings: Valid for facet= requirements; valid for type= requirements
3. Check Activate
4. Apply changes

### Hide global groups

Hides complete groups, e.g. “Responsible Role”, in detail Content. Hiding can be done for all users or only for the viewer mode.

#### List widget: Hide global corona types

This configuration is related to the feature **Fact Sheets: Global related objects** that allows to display global (sub process-related) information aggregated on top of a process.

Here you have the option to hide specific global objects, e.g. Inputs/Outputs, for reasons of a clearer presentation.

Please refer to Process Design for more details.

#### Hide navigation member

Entire navigation members can be hidden. These include e.g. systems or input/output.

### Rename

The administrator renames the information names using this configuration. The new name replaces the selection and is now used throughout the system. You can also use this function to rename user attribute groups.

### Add

1. The Administrator can set up user-defined attributes.
2. In Detail Content, the administrator can select the element types to which the user-defined attribute is to be added. Multiple selection allows you to assign the configured attributes to the required types.
3. To any of the new configurated attributes there is the possibility to add “tooltips” to describe the attribute or give hints. The administrator can also use “edit custom attributes” to add the user-defined attributes to the editing of released elements. Thus the user-defined attributes for released attributes can be changed afterwards without versioning. These changes are displayed in the lifecycle. The following user-defined attribute groups are available:

   User-defined attribute groups can be renamed using the configuration option Rename.
4. By activating “Only for Viewer” this custom attribute will only be displayed for the viewers
5. By activating "Available in REST API", this custom attribute will be available in Process Navigator.
6. By activating “Searchable” this attribute will be considered in the Celonis Process Management standard search.
7. By activating “language independent”, this attribute will be for every language and can´t be translated.
8. By activating “Editable in Released state”, this attribute may be edited even afterwards in released state. We recommend to enter a Max text length, otherwise the default length of 81 characters will be automatically set.
9. To apply all changes, the configuration has to be activated and applied afterwards.

Please find more details below:

#### Add single line text attribute

1. Select attribute type
2. Define ID and set up configuration entry via New. Defining the ID in capital letters determines the last part of the API name. Please do not use special characters or “-”.

   The API name for reusing in for example manuals would then be: “ATX\_CUSTOM\_SHORT\_DESCRIPTION”
3. Define settings in the Detail Content

   Name: must be maintained in all languages. You can use the Translate button

   Tool Tip: if maintained the attribute will appear with an info symbol and a note when using the mouse over. Sorting: if there are several user-defined attributes per user group, the order can be determined here.

   Activate: must be checked; otherwise the attribute is not considered when changes are applied.

   Settings: Valid for facet, valid for type, group, language independent, maximal length.

#### Add multiline text attribute

This is to add a multiline text attribute. Please see description above re. “single line text attribute” - and don’t forget to enter the Max text length. Otherwise, 81 characters are set by default.

#### Add masked text attribute

This is to configure a single line text attribute that allows to hidden entries for your own password management.

#### Add formattable multiline text attribute

This is to add a multiline text attribute that allows HTML formating, similiar to the “Description” field.

#### Add link attribute

This allows to add links, similar to the “Attachments” section. We recommend to activate “Language independent”. Please note that uploaded files do not exceed 10 MB.

#### Add check-box attribute

This is to add an additional check-box. If the check-box should be activated by default, select the option “Default value”. We also recommend to activate “Language independent”.

#### Add integer number attribute

This is to add a field for editing integer numbers. As an option, a Min and Max value can be specified. If you enter integer or decimal numbers outside this range, they are rounded down to the Max value or rounded up to the Min value. Furthermore, a “Default value” number can be set, that appears by default. We also recommend to activate “Language independent”.

#### Add flowting number attribute

This is to add a field for editing flowting numbers, i.e. decimal numbers, with +/- sign etc. As an option, a Min and Max value can be specified. If you enter number outside this range, they are rounded down to the Max value or rounded up to the Min value. Furthermore, a “Default value” number can be set, that appears by default. We also recommend to activate “Language independent”.

#### Add date attribute

This is to add a date attribute. We recommend to activate “Language independent” as well as the “Editable in released state” option. NOTE: If the field “Default value” remains empty, the date 01.01.0001 is automatically set for new created elements (for existing elements, however, no default value is displayed).

#### Add static note attribute

This is to add a static and unchangeable note, e.g. as a specific hint or comment for the process modeler.

#### Add dropdown attribute

This is to add an additional dropdown field. Suitable dropdown values can only be added after activiation by “Adding dropdown values”. NOTE: the following is to be observed here: - Language independent should be checked - Apply the changes before assigning values

#### Add multi selection attribute

This is to add an additional multi selection field. Suitable values can be added after activation by “Adding dropdown values”. NOTE: the following is to be observed here: - Language independent should be checked - Apply the changes bevor assigning values

#### Add dropdown value

In addition, the following is to be observed here: - When a new value attribute is created (ID is VALUE) the API name AVTX\_CUSTOM\_VALUE - The selection list attribute must be assigned

### Change

By configuring “Change”, the administrator can change settings in Celonis Process Management. To apply all changes, the configuration has to be activated and applied afterwards.

#### Make an attribute mandatory

The admin can make any attribute mandatory. For this, the type “make an attribute mandatory” needs to be selected and in detail content the settings can be defined. After applying this, all user has to manage the mandatory fields. For example you can set a description to mandatory so any author has to fill in a description for the process.

#### Make relations mandatory

The administrator can use this configuiration type to extend Validation Rules with relations that must be maintained to Change the State (Release) of a Process.

1. Select the type Make relations mandatory and provide a name for the configuration.

1. In Detail Content, the administrator can select the relations that have to be mandatory maintained. Multiple selections are possible.

After applying the changes, the Validation Rule “All mandatory information have to be maintained” will consider also the mandatory relations.

#### Make an attribute informative

The administrator can use this extension to store certain content as informative and thus define it as read-only. This means that these contents cannot be edited. For example, systems can be set as write-protected by this configuration and the content can be retrieved from the BCM interface.

#### Change user selection

The admin adjusts the users in Celonis Process Management and can activate or deactivate the inheritance of the persons responsible. By click on the check box, he can define that Responsibles are automatically taken over from the upper hierarchical level.

It is also possible to set that only the selected user types are allowed to edit the inherited person responsible.

#### Change shape type

This offers the possibility to make geometry and colour adaptions of the process flow objects. Please contact us for more details.

#### Adapt name display format

This is to show the ID as a prefix in the navigation tree in front of process name.

Configuration example:

#### Adapt shape display text format

This is to show the ID as a prefix in the shape in front of process name (currently only available for Sub Processes):

Configuration examples:

#### Change default layout

Generally, the default layout for processes is “Vertical”. If you like to change this, you can set your individual default layout here. This is also applicable for further facets, e.g. Organizational units, where you can choose between Graphic/Detailed view.

#### Show shape numbers

This setting is a prerequisite for using the Feature \_\_Method: Numeration of process flow objects\_\_that allows to display shape numbers on shapes in different graphical views.

Please add a new type **Show shape numbers** in the “Change” section and, in the Detail Content, select the layouts for which it should be applied.

After configuration, the feature activation will follow.

[## Features](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_features_body)

### Activate and deactivate features

Highlight feature in the list and select required value (Deactivated or Activated) in “Activation” dropdown of Detail Content.

### Is deprecated / Is one way

Features flagged up as “Is one way” can only be activated. Once the feature is activated, it cannot be deactivated again.

In case a feature is out of use, it is flagged “Is deprecated”.

[## Release cycle](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_release-cycle_body)

Individual settings can be made for the release cycle of processes and objects.

First, create a new Type of Release cycle setting in the list. Then, go to Detail Content and select a type (or types) for which your settings should be applied, e.g. Main Processes and Sub Processes.

For individual configuration, the following options are available:

**Option 1: Valid from day span**

In the release workflow, the automatic setting of the “Don’t set”Valid form” can be deactivated.

**Option 2: Prohibit direct release**

Activate this checkbox if the workflow should be started in any case, even if the same User is entered as Responsible and Author. The state “Released” will then never be selectable in the release dialogue.

**Option 3: Approver users / Approver user groups**

This functionality allows to add further single Approver users or Approver user groups to the release cycle. Furthermore, the state “Ready for Approval” is added to the dialog window.

The new order of participants of the release cycle will then be: Author - QA (if set) – Approver/Approver group – Responsible.

Please note that this field Approver/Approver group is optional by default. In case it should be a mandatory field, this has to be set up via the Extended Configuration (in the “Change” dialog).

**Option 4: Quality Manager users / user groups**

This functionality can be used to restrict the usage of single quality manager users and/or quality manager user groups in the release cycle. If disabled, the corresponding dialog views in detail content will be deactivated.

**Note**

If you have maintained Approvers or Quality Managers before and set up the customizations, so that their maintenance is no longer possible, you are not able to see them any longer in any detail content or dialog.

**Option 5: Approval count**

For both the Approver and Quality manager settings you are able to set the number of users that have to approve a process or objects before the next release cycle state can be reached. As soon as the number of approvals is reached, the tasks for the remaining members of this group are automatically closed. This is also visible in the lifecycle diagram of the element.

It is also required to make settings in the User Management. Please find more information [here](https://docs.celonis.com/en/user-management.html).

Finally, activate your settings by checkbox and don’t forget to click on “Apply changes” in the toolbar.

[## Fact sheets](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_fact-sheets_body)

More information can be found [here](https://docs.celonis.com/en/creating-fact-sheets.html).

[## Stereotypes](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_stereotypes_body)

More information can be found [here](https://docs.celonis.com/en/creating-the-stereotypes.html).

[## Manuals](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_manuals_body)

Several default manuals are available. Customized manual templates and additional standard manuals can be added here.

### Add new Sub Process Manual

Create a new entry named for example “Process description\_DE\_EN” and click “New” Maintain document export template settings:

- Facet: Processes
- Type: Sub process (SubProcessDiagram)
- Languages: German, English
- Template file path: select from the data tab the file “templates - symbiodocument\_processmanual\_de\_en.rtf”
- Logo image: add your company logo (eg. .png or .jpg), it will replace the Celonis Process Management logo when generating the manual.
- Content flags: gives you the possibility to show additional evaluations or hide existing ones from the template. See following list for more informations

Table 22.

| Content flag | Explanation |
| --- | --- |
| Processes - Evaluate Released Only | If selected, the generated manual will printout on the first page following in red: "The originally selected process is NOT released!" |
| Processes - Evaluate Expired Along With Unreleased | If selected, the generated manual will printout on the first page following in red: "The originally selected process is EXPIRED!" |
| Processes - Evaluate Events In Detail | If selected, the Detail tables will include also Events with their description. |
| Processes - Evaluate Conditions In Detail | If selected, the Detail tables will include also Conditions with their description. |
| Processes - Evaluate Gateways In Detail | If selected, the Detail tables will include also Gateways with their description. |
| Processes - Evaluate Structure Element Details In Just One Table | If selected, the detailed information will be present in one table. Providing a better view of the content. |
| Document Content - Show Detailed Type Information | If selected, the generated manual will printout in the detail tables informations like task type, task mark. |
| Document Content - Show Detailed Information About The Relation To Interface Processes | If selected, the manual will include in the Analyses chapter the name of the processes that are referred by start or end events. |
| Document Content - Hide Default Graphic (Horizontal Role Swimlane) | If selected, Default Graphic will not be displayed. Can be used as a substitute for adding or replacing Graphics from the below options. |
| Document Content - Show Alternative Graphic (Horizontal Application Swimlane) | If selected, a Horizontal Application Swimlane will be displayed. Can be combined with other graphs (Matrix or Horizontal Swimlane). |
| Document Content - Show Alternative Graphic (Matrix) | If selected, Process Matrix will be displayed as an additional graphic |
| Document Content - Hide Process Interaction Tables | If selected, interaction table between processes and business objects will be hidden. |
| Document Content - Hide RASCI Matrix | When selected the RASCI role/group matrix will not be included in the generated manual. |
| Document Content - Hide Application Matrix | When selected the application/transaction matrix will not be included in the generated manual. |
| Document Content - Hide Documents Matrix | When selected the Document Matrix will not be included in the generated manual. |
| Document Content - Hide Standard Matrix | When selected the new matrix for assigned standards/standard chapters will not be included in the generated manual. |
| Document Content - Hide Risk Matrix | When selected the new matrix for assigned risks/controls/opportunities will not be included in the generated manual. |
| Document Content - Show Glossary | If selected, Glossary Section will be displayed and contain Glossary entries assigned to a process. Prerequisite: usage of the Glossary Feature. |
| Document Content - Show Requirements Table | When selected the annex chapters regarding the structured and prioritized requirements will be included in the generated manual. |
| Document Content - Show Analysis Result | When selected the new annex sub chapter "Analysis Result" will be included in the generated manual. The here evaluated attributes are the ones that are activated by the Feature "Method: Extensions for process analysis on projects". |
| Document Content - Show Performance Calculation | When selected the new annex sub chapter "Process performance analysis" will be included in the generated manual. When included this chapter evaluates following topics:  - Start conditions - Performance of the process elements - Resource commitments human resources - Resource consumption technology resources - Summary of results |
| Document Content - Hide Fact Sheet For Selected Processes | If selected, fact sheet chapter will be hidden. |
| Document Content - Hide Fact Sheets For Referenced Sub Processes | If selected, chapter "Referenced sub-processes" will be hidden in the generated manual. The chapter provides a fact sheet for every process. |
| Document Content - Execute Debug Code | If selected, more detailed information for handbook developer will be shown. |

[## Navigation](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_navigation_body)

With this feature the help function can be specified in the header (question mark icon).

Create a new Category with a help entry below in the list. Specify the new help entry in the Detail Content, defining your required target and type of help. Then specify the facet and sub type for which it should be applied to and confirm you activation by the checkbox.

Besides, for the Toolbar, you can create an Execute hook button for service hooks and an Open dialog button for an URL. Make your Navigation settings for which facet and type they should be valid and klick on the checkbox to activate.

[## Document templates](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_document-templates_body)

With the document templates you can define templates for certain elements (e.g. processes, documents, risks, requirements, etc.), which the editor then adds content to. The administrator has the function to define the structure and the layout.

To create a template, click the **Document templates** tile in the admin area.

After the document template has been created, the administrator must define some attributes in Detail Content. These include the author (if not already set), the person responsible, and the assignment. Here the admin defines for which elements the document template may be used. No template can be edited without assignment.

Further content in the detail area is the header and footer of the document. Here the administrator can display attributes such as Page <PAGE> of <NUMPAGES> for the page number.

The administrator can set up the structure in the template editor. The chapters can be created hierarchically. Sections can be inserted within chapters. In sections, text blocks or blocks for linking properties can be inserted or combined column by column.

By selecting the text modules, the admin can create an HTML area that can be edited freely. Any text, images and the like can be created here. The text module is identical to the description in Detail Content.

In the module for linking properties, the administrator can select a property (e.g. name, description, ID) for the element assigned to the document template.

For all chapters, sections or modules, the administrator can set the check mark to “read-only” in the detail content so that the editor cannot edit them or insert new content.

After the document template has been created and the structure has been set up, the editor can use this template. However, the template must first be released in a release workflow. A document is available for editing in the editor as soon as the template has been released.

[## Validation rules](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_validation-rules_body)

This functionality allows to set or modify validation rules that are checked by default before the release workflow of a process or object is started.

The validation rules are based on the BPMN 2.0 methodology but may be activated or deactivated as required. It is also possible to add new validation rules for specific facets, types etc. and to define a corresponding error message.

Please be aware that if the Result type **Error** is selected, the release workflow cannot be started, whereas a **Warning** may be ignored via click on the checkbox in the dialog window.

[## Dynamic attributes](#UUID-f935eafe-37b9-b076-d5d9-2e609a5c1b4c_dynamic-attributes_body)

Custom-designed feature to use dynamic/user-defined attributes in processes. If you consider using those, please contact us.

## Related topics

- [Settings](settings.html "Settings")


---

## pql/process/create-permalink-to-a-process

# Create permalink to a process

Via the Main Content toolbar, you can generate links to processes.

|  |
| --- |
|  |

These links never expire, and allow users outside your organization to view processes you've modeled in Celonis Process Management. You can link to a specific process, a version of a process, or a process object (for example, a task).

Expand all

[## Before you begin](#id853125_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have at least the Viewer role to generate permalinks

[## Generating a permalink to a process](#id853131_body)

1. After clicking the link icon in the toolbar, the copy link modal will open.
2. Click **Copy** to generate the link. A green checkmark indicates that the link has been successfully copied to the clipboard.

|  |
| --- |
|  |

## Related topics

- [Main and sub processes](creating-and-managing-processes.html "Creating and managing processes")
- [Process attributes](managing-process-attributes.html "Managing process attributes")
- [Provide details and roles](provide-details-and-roles.html "Provide details and roles")


---

## pql/process/creating-and-managing-processes

# Creating and managing processes

Processes are the core modeling elements used to represent how an organization operates, delivers value, and achieves business objectives. A process defines a sequence of tasks, decisions, and interactions that transform inputs into outputs, often involving people, systems, documents, and data.

Within Process Designer categories (see: [Process categories](process-designer-categories.html "Creating and managing process categories")), you can create and manage both main processes and sub processes:

- **Main processes**: Main processes are the highest-level processes in your organization’s process hierarchy. They represent the core business activities or end-to-end value chains that are critical to how your organization operates. Main processes typically cover a entire business function and serve as a starting point for breaking down operations into sub processes or detailed activities.

  To learn more about creating main processes: [Creating main processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234905271876265 "Creating main processes").
- **Sub processes**: A sub process is a process step that contains a more detailed process within it. It represents a breakdown of a higher-level (main) process into smaller, manageable parts. You can think of it as a "process within a process."

  To learn more about creating sub processes: [Creating sub processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_N1747157710192 "Creating sub processes").

In the screenshot below, you can see the Process House, the three default process categories, and examples of main and sub processes:

Expand all

[## Creating main processes](#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234905271876265_body)

To create main processes in Process Designer editor mode as an architect:

1. From the main menu, click **Processes - Architecture**, opening the Process overview screen.
2. Select the process category you want to create the process in.

   For example, **Management Processes**:
3. Select type 'Main process' and enter a process name.
4. Click **New**.

   The process has been created and added to the Process overview page.
5. With the main process side panel open, configure the process attributes.

   For more information about process attributes, see: [Process attributes](managing-process-attributes.html "Managing process attributes").

The main process is now available, allowing you to further customize it. After creating a main process, you have the following optional activities:

- [Creating sub processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_N1747157710192 "Creating sub processes")
- [Managing existing main and sub processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234917451505306 "Managing existing main and sub processes")
- [Process graphics](creating-process-graphics.html "Creating process graphics")
- [Process attributes](managing-process-attributes.html "Managing process attributes")

[## Creating sub processes](#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_N1747157710192_body)

Sub processes can be created either within a process category or under a main process, depending on your organization's process hierarchy.

To create sub processes in Process Designer editor mode as an architect:

1. From the main menu, click **Processes - Architecture**, opening the Process overview screen.
2. Select the process category or main process you want to create the sub process in.

   For example, **Leadership**.
3. Select type 'Sub process' and enter a process name.
4. Click **New**.

   The sub process has been created and added to the Process overview page.
5. With the sub process side panel open, configure the process attributes.

   For more information about process attributes, see: [Process attributes](managing-process-attributes.html "Managing process attributes").

The sub process is now available, allowing you to further customize it. After creating a sub process, you have the following optional activities:

- [Managing existing main and sub processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234917451505306 "Managing existing main and sub processes").
- [Process graphics](creating-process-graphics.html "Creating process graphics").
- [Process attributes](managing-process-attributes.html "Managing process attributes").

[## Managing existing main and sub processes](#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234917451505306_body)

As an architect, you can manage existing Process Designer main and sub processes by clicking **Processes - Architecture** and selecting the process you want to edit.

|  |
| --- |
|  |

In addition to editing the main or sub process details, you can use the toolbar to manage your processes.

|  |
| --- |
|  |

The toolbar options here include:

- **Delete process**:This permanently deletes the process, with no recovery possible. If you delete a main process that contains sub processes, the sub processes are saved as 'Orphaned' content and can be accessed by clicking Orphaned on the navigation:
- **Move the process**: This allows you to move the process within the Process House, such as moving the process to a different category or within another main process.
- **Consolidate**: This allows you to merge / consolidate all elements from this process into another process.
- **Link**: Create a shareable link to this process.
- **Favorite**: Add this process to your favorites, giving you easier access to it.
- **Subscriptions**: Add a link to this process to your subscriptions.

## Related topics

- [Systems](creating-and-managing-systems.html "Creating and managing systems")
- [Creating and modeling processes](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a "Creating and modeling processes")
- [KPIs](creating-and-managing-key-performance-indicators--kpis-.html "Creating and managing Key Performance Indicators (KPIs)")


---

## pql/process/creating-process-graphics

# Creating process graphics

Process graphics are a visual representation of a process, showing the sequence of steps, activities, and decisions involved in achieving a specific goal or objective. Process graphics are useful for understanding how a process flows, identifying potential bottlenecks, and improving overall efficiency.

You can create process graphics for both main and sub processes in Process Designer using the process canvas. This interactive canvas enables you to choose your diagram modes and then add and configure process events, such as Start and End, and objects, such as tasks or interfaces.

For example, the process canvas has been used to create a purchase-to-pay process graphic:

To access the process canvas, click **Processes - Graphic** and then select the main or sub process you want to create the graphic for:

|  |
| --- |
|  |

You then have the following options:

- [Process canvas features](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234919153054404 "Process canvas features")
- [Diagram modes / layouts](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234918944681755 "Diagram modes / layouts")
- [Process graphics events, objects, and gateways](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234918948922852 "Process graphics events, objects, and gateways")

Expand all

[## Process canvas features](#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234919153054404_body)

When using the process canvas, you have the following features:

- **Interactive canvas**: You can navigate the canvas by zooming in and out, scrolling, and clicking and dragging the cursor.
- **Canvas controls**: In addition to using the interactive canvas, you can also use the full screen button and zoom in and out features.

  |  |
  | --- |
  |  |
- **Export SVG file**: You can export a SVG file of your process, giving you offline access to a vector image of your diagram. This is a 2D image, meaning that only the process diagram itself is displayed. You can't click into each object or event to see further information.

  |  |
  | --- |
  |  |
- **Switch diagram mode**: See [Diagram modes / layouts](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234918944681755 "Diagram modes / layouts").

  |  |
  | --- |
  |  |

[## Diagram modes / layouts](#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234918944681755_body)

When creating and editing process graphics, you can click the **Diagram mode** icon and choose from a number of diagram modes / layouts:

|  |
| --- |
|  |

Included in the available diagram modes / layouts are:

- **Org / role swimlane - vertical and horizontal**: Create a diagram using process pools and swimlanes, allowing you to visualize who or what is responsible for each step in the process. This diagram mode divides the graphic into vertical or horizontal "lanes," with each lane representing a specific participant, department, or system.

  When using this diagram mode, the starting graphic looks like this:

  You can then add and delete lanes, pools, process objects, and events as required.
- **Vertical and horizontal**: Choose whether to create a vertical (top to bottom) or horizontal (left to right) process diagram. After the first object or event has been added, your process diagram will be automatically converted into the new diagram mode selected.

  In this example, a horizontal diagram has been created:

[## Process graphics events, objects, and gateways](#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234918948922852_body)

After choosing your layout, you can then design the process by adding and configuring process events, objects, and gateways.

Depending on whether you're creating a main or a sub process, you have the following available:

- [Process events - Start, Intermediate, and End](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234920899059308 "Process events - Start, Intermediate, and End")
- [Process connectors](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234931296359504 "Process connectors")
- [Add main process](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234920899411013 "Add main process")
- [Add sub process](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234920899586709 "Add sub process")
- [Interface](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234920899967661 "Interface")
- [Condition](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234931049310004 "Condition")
- [Process gateways](creating-process-graphics.html#UUID-a3c9ce98-b41e-2771-a045-56907d0a890d_section-idm234920900124612 "Process gateways")

### Process events - Start, Intermediate, and End

A process event is a key element that triggers, interrupts, or ends a process or sub process. It represents something that happens, either internally or externally, that affects the flow of the process.

You can add start, intermediate, and end process events to your process graphic:

- **Start**: Marks the beginning of a process, for example a customer placing an order.
- **Intermediate**: Occurs during the process and may affect the flow, for example waiting for a supplier confirmation or an email response.
- **End**: Marks the completion of a process or subprocess, for example the invoice has been paid.

#### Start events

A Start event signifies the beginning of a process and all sub process graphics must include Start events.

You can add a Start event to your process by clicking **New - Start**:

|  |
| --- |
|  |

Once the Start event has been added to the process canvas, you can then click the **+** icon to add further events or objects:

|  |
| --- |
|  |

#### Intermediate events

An intermediate event is a point within a process where something happens that either: Waits for, Receives, Sends, or Interrupts the process before it continues. It does not start or end the process, but it alters the flow while it's running.

Examples of intermediate events include:

- **Timer event:** Waits for a specific time or duration, such as waiting five days for customer payment.
- **Message event**: Receives or sends a message, such as receiving an email confirmation from a supplier.
- **Error event**: Triggers when something goes wrong, such as a payment fails.
- **Conditional event**: Waits until a condition becomes true, such as stock level updated.
- **Link event**: Used to connect different parts of a complex process diagram.

|  |
| --- |
|  |

#### End events

While not mandatory, the last event in process graphics can be the End event. This signifies that the process is complete and there are no more tasks or events expected.

|  |
| --- |
|  |

### Process connectors

You can add and edit connections between process events, objects, and gateways by clicking and dragging the process connector from one element to another:

### Add main process

Main processes describe the 'what' is being done, as such they document a high level process or the headline for a set of tasks. An example of a main process is 'Order-to-Cash'. This is an end-to-end business process that starts with a customer order and ends with payment collection. It is considered a main process because it: Supports a core business function (sales/revenue generation), spans across multiple departments (sales, finance, logistics, etc.), may include sub processes and interfaces.

Adding a main process to your process graphic creates an additional main process within your category, allowing you to manage that process (including creating a process diagram for it).

For more information about managing main processes, see: [Main and sub processes](creating-and-managing-processes.html "Creating and managing processes").

|  |
| --- |
|  |

### Add sub process

A sub process describes a self-contained process that is at a deeper level than the main process or - in other words - on the execution level and describes the actual activities or "tasks" that are being performed. A sub process can also contain references to other sub processes. Examples of sub processes include 'Manage purchase order' (as part of the Procurement main process).

Adding a sub process to your process graphic creates an additional sub process within your category, allowing you to manage that process (including creating a process diagram for it).

For more information about managing sub processes, see: [Main and sub processes](creating-and-managing-processes.html "Creating and managing processes").

|  |
| --- |
|  |

### Task

A task is a specific activity or step within a main or sub process — it represents work done by a person, system, or role. Tasks are the lowest-level actions that make up a process flow.

Examples of tasks (in the context of a process) include:

- Order-to-Cash (process) - Validate customer order (task)
- Product development - Approve product specification
- Incident management - Log an IT support ticket

|  |
| --- |
|  |

### Interface

An interface refers to a defined point of interaction or communication between different processes, systems, or organizations. They help model how information, materials, or responsibilities are exchanged between distinct parts of a business process architecture.

For example - HR runs a process to onboard a new employee. This process involves IT creating system access for the employee. This requires the following example interface in the process:

- **Name**: IT Account Creation Request.
- **From**: HR Onboarding Process
- **To**: IT Access Management Process.
- **Medium**: Internal ticketing system.
- **Data passed during interface**: Employee ID, department, required systems.

|  |
| --- |
|  |

### Condition

A condition represents a decision point in a process — a place where the workflow branches based on specific criteria or outcomes. Conditions are critical in making processes dynamic, rule-based, and reflective of real-world decision logic.

For example - in an Order-to-Cash process, you might add a condition after the "Check Customer Credit" step:

- If customer credit is approved: Proceed to “Release Order”
- If customer credit is denied: Route to “Hold Order and Notify Sales”

Conditions can only be added to a process graphic after a process gateway, such as AND / OR.

|  |
| --- |
|  |

### Process gateways

Process gateways are used to control the flow of a process — they determine how the path of execution branches, merges, or loops based on certain conditions or events.

You can add and configure three process gateways:

- **Exclusive gateway (EITHER / OR)**: The process chooses one path based on a condition. For example, "Is amount > $10,000?". If 'Yes' then an approval is needed, if 'No' then create a process order.
- **Inclusive gateway (OR)**: The process can follow one or more paths based on conditions. For example, send to local supplier, foreign supplier, or both.
- **Parallel gateway (AND)**: The process starts or waits for multiple paths in parallel. For example, send invoice and notify customer simultaneously.

## Related topics

- [Systems](creating-and-managing-systems.html "Creating and managing systems")
- [Creating and modeling processes](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a "Creating and modeling processes")
- [Process attributes](managing-process-attributes.html "Managing process attributes")


---

## pql/process/cropping-process

# Cropping a process

Cropping allows you to adjust the underlying event log so that you can focus on activities occurring between two events in a process rather than viewing the full end-to-end process. By cropping the data displayed in your View component, you can then identify issues and fix inefficiencies between these steps.

Cropping is usually done by the Analyst behind the scenes. In addition, you can set up the View in a way that also the users in Apps can crop the data on demand for better transparency. To do this, you can use variables to populate the user input to the Knowledge model and crop the event log accordingly which in turn changes the data displayed in your Studio components.

For example, in the following *Order Management* process, input dropdowns are used to select the desired activities and adjust the Process Explorer to display only the events / activities from *Generate Delivery Document* to *Ship Goods*:

To configure this example, you need the following:

- [Knowledge Model variables](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883407609 "Knowledge Model variables")
- [Knowledge Model - Event log](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883462139 "Knowledge Model - Event log")
- [View components](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883510281 "View components")

Expand all

[## Knowledge Model variables](#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883407609_body)

In the View, create four Knowledge Model variables:

- from\_activity
- from\_occurence

  - default value: FIRST
- to\_activity
- to\_occurence

  - default value: LAST

[## Knowledge Model - Event log](#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883462139_body)

Create a new event log that uses the variables to crop a custom event log.

For the PQL statement, we use the CALC\_CROP\_TO\_NULL reference.

For our Order Management example, the PQL statement for the cropped event log is:

```
CASE WHEN '${from_occurence}' != '' AND '${from_activity}' != '' AND '${to_occurence}' !='' AND '${to_activity}'  != '' THEN
CALC_CROP_TO_NULL(${from_occurence}_OCCURRENCE['${from_activity}']
      TO ${to_occurence}_OCCURRENCE['${to_activity}'],
     "ACTIVITY_TABLE"."ACTIVITY_EN"
)

ELSE "ACTIVITY_TABLE"."ACTIVITY_EN" END
```

[## View components](#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825883510281_body)

Configure the View components that users fill the variables with:

- [Text boxes (optional)](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825887947494 "Text boxes (optional)")
- [Input dropdowns](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm23482588803234 "Input dropdowns")
- [Button](cropping-process.html#UUID-c4068af7-25b1-603b-84cc-0ef1a4ef3e2a_section-idm234825888122355 "Button")

### Text boxes (optional)

Add text boxes to guide the user / provide more information.

For example, we've added text boxes in the highlighted areas:

### Input dropdowns

Add input dropdowns to select the from/ to activity and occurrence. For example, we've added input dropdowns in the highlighted areas:

The configuration for the *Generate Delivery Document* input dropdown includes:

- Load items from the activity table event log in the Knowledge Model
- Save user selection to the *from\_activity* variable.

The configuration for the *Select Occurence* input dropdown includes:

- Manual input - free text input for FIRST and LAST fields.
- Save user selection to the *to\_occurence* variable.

### Button

Add a button to reset the variables to the default value. For example, we've added a 'Reset cropping' button in the highlighted area:

To configure this button, we've enabled 'Update variable' and added the four variables we previously created.

## Related topics

- [Views](creating-views.html "Creating and configuring Views")
- [View settings](view-settings.html "View settings")
- [View modules](creating-and-embedding-view-modules.html "Creating and embedding View modules")


---

## pql/process/customizing-process-navigator

# Customizing Process Navigator

**Important**

You must have the Process Navigator admin role to view and edit display settings. This role is different from the admin role for Process Designer. Open a ticket with [Celonis Support](https://docs.celonis.com/en/support.html) to receive this role if you don't already have it.

There are several ways you can customize the appearance of Process Navigator. You can:

- Change the language displayed on the Process Navigator home page.
- Enable or disable different sections of the Process Navigator home page and change their content.
- Edit the widgets displayed on the Process Navigator home page.
- Change the logo displayed on the Process Navigator home page and the Process Navigator storage name.

Expand all

[## Changing display settings](#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234473050007114_body)

1. In the top-right of the Process Navigator home page, select the dropdown next to your login name.

   |  |
   | --- |
   |  |
2. Select:

   1. **Languages** to change the language displayed on the Process Navigator home page.
   2. **[Widgets](customizing-process-navigator.html#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234473050603155 "Editing widgets on the Process Navigator home page")** to make changes to the sections displayed on the Process Navigator home page and their content.
   3. **[Settings](customizing-process-navigator.html#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234460615430402 "Changing the logo and storage name")** to change the logo displayed and the Process Navigator storage name.

   **Tip**

   The current storage name is dispayed in the menu. In this example, the storage name is **Demo Environment**.

[## Editing widgets on the Process Navigator home page](#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234473050603155_body)

|  |
| --- |
|  |

Filter

- To edit
- Select this menu item...
- To...

| To edit | Select this menu item... | To... |
| --- | --- | --- |
|  | Edit Slideshow | Add, remove or change the:  - Image and image text displayed. - **Navigate** button URL. |
|  | Edit Welcome | - Enable or disable all content in this section. - Enable or disable feedback only. - Change the sub-headline and description. |
|  | Edit Quicklinks | - Enable or disable all content in this section. - Add, delete or change indvidual quick link names, icons and URLs. |
|  | Edit Overview | - Enable or disable all content in this section. - Change the headline and description text. - Enable or disable the type categories displayed.  **Tip**  In this example, the type categories displayed are **Processes**, **Systems**, **Documents** and **Learning**. |
|  | Edit Full Size | - Enable or disable all content in this section. - Change the short title, title, description, URL and image.  **Tip**  The maximum file size allowed is 500 KB (0.5 MB). |
|  | Edit Insight | - Enable or disable all content in this section. - Change the title, header and description. |
|  | Edit Resource | Enable or disable all content in this section.  - Enable or disable all content in this section. - Add, delete or change the names, descriptions, icons and URLs displayed as resources. |

| To edit | Select this menu item... | To... |
| --- | --- | --- |
|  | Edit Slideshow | Add, remove or change the:  - Image and image text displayed. - **Navigate** button URL. |
|  | Edit Welcome | - Enable or disable all content in this section. - Enable or disable feedback only. - Change the sub-headline and description. |
|  | Edit Quicklinks | - Enable or disable all content in this section. - Add, delete or change indvidual quick link names, icons and URLs. |
|  | Edit Overview | - Enable or disable all content in this section. - Change the headline and description text. - Enable or disable the type categories displayed.  **Tip**  In this example, the type categories displayed are **Processes**, **Systems**, **Documents** and **Learning**. |
|  | Edit Full Size | - Enable or disable all content in this section. - Change the short title, title, description, URL and image.  **Tip**  The maximum file size allowed is 500 KB (0.5 MB). |
|  | Edit Insight | - Enable or disable all content in this section. - Change the title, header and description. |
|  | Edit Resource | Enable or disable all content in this section.  - Enable or disable all content in this section. - Add, delete or change the names, descriptions, icons and URLs displayed as resources. |

[## Changing the logo and storage name](#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234460615430402_body)

**Note**

You can change the logo, the storage name or both the logo and storage name.

1. Follow [changing display settings](customizing-process-navigator.html#UUID-a6aa80e2-1ea5-f510-c041-63cee98070fd_section-idm234473050007114 "Changing display settings") for the logo and storage name.

   The **Settings** page opens.

   |  |
   | --- |
   |  |
2. Click **Change** and navigate to the logo image you want to use (optional).

   **Note**

   Logo images must have these characteristics:

   - Format: jfif, pjpeg, pjp, jpg, png, svgz or svg.
   - Height: Maximum of 32 px. As larger images will be scaled down, we recommend you use images that are either 32 px exactly or multiples of 32 px.
   - Width: Maximum of 500 px.
3. Enter the name you want to use in the **Storage name** field (optional).
4. Select **Save**.

## Related topics

- [Configuring your Process Designer environment](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374 "Configuring your Process Designer environment")
- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Limit content in Process Navigator](limit-content-in-process-navigator.html "Limit content in Process Navigator")


---

## pql/process/customizing-process-navigator-3070700

# Customizing Process Navigator

**Important**

You must have the Process Navigator admin role to view and edit display settings. This role is different from the admin role for Process Designer. Open a ticket with [Celonis Support](https://docs.celonis.com/en/support.html) to receive this role if you don't already have it.

There are several ways you can customize the appearance of Process Navigator. You can:

- Change the language displayed on the Process Navigator home page.
- Enable or disable different sections of the Process Navigator home page and change their content.
- Edit the widgets displayed on the Process Navigator home page.
- Change the logo displayed on the Process Navigator home page and the Process Navigator storage name.

Expand all

[## Changing display settings](#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234473050007114_body)

1. In the top-right of the Process Navigator home page, select the dropdown next to your login name.

   |  |
   | --- |
   |  |
2. Select:

   1. **Languages** to change the language displayed on the Process Navigator home page.
   2. **[Widgets](customizing-process-navigator-3070700.html#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234473050603155 "Editing widgets on the Process Navigator home page")** to make changes to the sections displayed on the Process Navigator home page and their content.
   3. **[Settings](customizing-process-navigator-3070700.html#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234460615430402 "Changing the logo and storage name")** to change the logo displayed and the Process Navigator storage name.

   **Tip**

   The current storage name is dispayed in the menu. In this example, the storage name is **Demo Environment**.

[## Editing widgets on the Process Navigator home page](#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234473050603155_body)

|  |
| --- |
|  |

Filter

- To edit
- Select this menu item...
- To...

| To edit | Select this menu item... | To... |
| --- | --- | --- |
|  | Edit Slideshow | Add, remove or change the:  - Image and image text displayed. - **Navigate** button URL. |
|  | Edit Welcome | - Enable or disable all content in this section. - Enable or disable feedback only. - Change the sub-headline and description. |
|  | Edit Quicklinks | - Enable or disable all content in this section. - Add, delete or change indvidual quick link names, icons and URLs. |
|  | Edit Overview | - Enable or disable all content in this section. - Change the headline and description text. - Enable or disable the type categories displayed.  **Tip**  In this example, the type categories displayed are **Processes**, **Systems**, **Documents** and **Learning**. |
|  | Edit Full Size | - Enable or disable all content in this section. - Change the short title, title, description, URL and image.  **Tip**  The maximum file size allowed is 500 KB (0.5 MB). |
|  | Edit Insight | - Enable or disable all content in this section. - Change the title, header and description. |
|  | Edit Resource | Enable or disable all content in this section.  - Enable or disable all content in this section. - Add, delete or change the names, descriptions, icons and URLs displayed as resources. |

| To edit | Select this menu item... | To... |
| --- | --- | --- |
|  | Edit Slideshow | Add, remove or change the:  - Image and image text displayed. - **Navigate** button URL. |
|  | Edit Welcome | - Enable or disable all content in this section. - Enable or disable feedback only. - Change the sub-headline and description. |
|  | Edit Quicklinks | - Enable or disable all content in this section. - Add, delete or change indvidual quick link names, icons and URLs. |
|  | Edit Overview | - Enable or disable all content in this section. - Change the headline and description text. - Enable or disable the type categories displayed.  **Tip**  In this example, the type categories displayed are **Processes**, **Systems**, **Documents** and **Learning**. |
|  | Edit Full Size | - Enable or disable all content in this section. - Change the short title, title, description, URL and image.  **Tip**  The maximum file size allowed is 500 KB (0.5 MB). |
|  | Edit Insight | - Enable or disable all content in this section. - Change the title, header and description. |
|  | Edit Resource | Enable or disable all content in this section.  - Enable or disable all content in this section. - Add, delete or change the names, descriptions, icons and URLs displayed as resources. |

[## Changing the logo and storage name](#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234460615430402_body)

**Note**

You can change the logo, the storage name or both the logo and storage name.

1. Follow [changing display settings](customizing-process-navigator-3070700.html#UUID-c13a0dbb-bf6e-3d49-d69e-27cc2858487a_section-idm234473050007114 "Changing display settings") for the logo and storage name.

   The **Settings** page opens.

   |  |
   | --- |
   |  |
2. Click **Change** and navigate to the logo image you want to use (optional).

   **Note**

   Logo images must have these characteristics:

   - Format: jfif, pjpeg, pjp, jpg, png, svgz or svg.
   - Height: Maximum of 32 px. As larger images will be scaled down, we recommend you use images that are either 32 px exactly or multiples of 32 px.
   - Width: Maximum of 500 px.
3. Enter the name you want to use in the **Storage name** field (optional).
4. Select **Save**.

## Related topics

- [Configuring your Process Designer environment](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374 "Configuring your Process Designer environment")
- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Limit content in Process Navigator](limit-content-in-process-navigator.html "Limit content in Process Navigator")


---

## pql/process/drilling-down-with-process-navigator

# Drilling down with Process Navigator

When you drill down into the detail for a process or other content, you enter a part of Process Navigator called the **Process Journal**. The **Process Journal** contains several sections. You can switch the first section to show either the **Process Model** or the **Process Journey**.

You can see:

- [High-level information](drilling-down-with-process-navigator.html#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_section-idm4543168254928034282459559891 "Viewing high-level information in Process Navigator") about a process or type of content.
- All related information.
- Detailed information about individual process steps including:

  - The [Process Model](drilling-down-with-process-navigator.html#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_section-idm4575568113233634282465890018 "Accessing the Process Model view") view.
  - The [Process Journey](drilling-down-with-process-navigator.html#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_N1739230960250 "Accessing the Process Journey view") view.
  - The [Process Graph](drilling-down-with-process-navigator.html#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_N1773321201499 "Accessing the Process Graph view") view.

**Tip**

The information displayed in the Process Journey view is typically less technical than the information in the Process Model view.

Expand all

[## Viewing high-level information in Process Navigator](#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_section-idm4543168254928034282459559891_body)

1. In **My Overview**, select a type category.

   A type category could be, for example, Processes or Documents or Systems.
2. Hover your cursor over a process or specific content.
3. Click **Details**.
4. A pop-up window appears.

   **Tip**

   Click the subscriptions icon from anywhere in the pop-up window to sign up for notifications about any changes to the process or content. Or click the comment icon to send feedback.
5. In the pop-up window, select:

   1. **Info** to see a description of the process or content, any scope filters that have been applied and other details relevant to the process or content type.
   2. **Details** for participant and status information and any simulation results.
   3. **Release History** for version information.

[## Accessing the Process Model view](#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_section-idm4575568113233634282465890018_body)

The Process Model gives you a detailed view of individual process steps, in the form of a BPMN model.

**Note**

For information on what each icon means, see our [BPMN reference](celonis-process-management-bpmn-reference.html "Celonis Process Management BPMN reference").

1. In the **My Overview** section of the Process Navigator homepage, select **Processes**.
2. Click a process.

   The individual steps for the process display, with the breadcrumbs along the top showing where the process sits in the process hierarchy.

   **Tip**

   You can click **View** to switch to the [Process Journey view](drilling-down-with-process-navigator.html#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_N1739230960250 "Accessing the Process Journey view").
3. Click an individual process step.

   A pop-up window containing information and details about the process step appears.
4. Click **Open details** for detailed information about the process step and to access any attachments.

   **Tip**

   Select [Subscribe](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator") to get notifications about any changes to the process step. Or click [Request](send-action-center-requests-in-process-navigator.html "Send Action Center requests in Process Navigator") to send feedback.
5. Scroll down to **Details** to see all the steps in the process flow.
6. Select a step in **Flow** if you want to see more information.
7. Click **Open Details** to view information about that step.

[## Accessing the Process Journey view](#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_N1739230960250_body)

The **Process Journey** view allows you to explore a process, so that you can better understand the support the operational needs of your business. You can navigate vertically to view more information on each step/sub process, or horizontally for more steps/sub processes.

To see all the visualizations available:

1. Scroll to the end of the first section of the page.
2. Click **Fullscreen**.
3. Hover over your desired step and click **Details**.

The Process Journey has many other details you can explore, including documents, requirements, risks, controls, opportunities, and standards.

[## Accessing the Process Graph view](#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_N1773321201499_body)

The Process Graph view allows you to see pictures, shapes and drawings that illustrate process content, without being a part of the process model. This content can be created in [Process Designer](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374 "Configuring your Process Designer environment").

**Note**

Users with the Author permission in Process Designer can create process graphics.

[## Viewing related resources in Process Navigator](#UUID-c5352bed-0126-309f-eb41-5be5366b00dc_section-idm4602200215936034287707755101_body)

In the Process Journal, scroll down to **Relations**. This is where you can see all roles, KPIs, and applications related to the process or content you’ve selected. You’ll also be able to view all inputs and outputs to any other resources that are involved in your process.

[## Sharing a process in the Process Journal](#id856497_body)

You can use the share option in the top navigation to generate a link. This link allows you to share a specific process with colleagues. The link remains the same regardless of process version.

|  |
| --- |
|  |

## Related topics

- [Searching and filtering in Process Navigator](searching-and-filtering-in-process-navigator.html "Searching and filtering in Process Navigator")
- [Managing actions](managing-actions-in-process-navigator.html "Managing actions in Process Navigator")
- [Monitoring changes with Process Navigator](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator")


---

## pql/process/enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform

# Enabling access to Celonis Process Management (CPM) from the Celonis Platform

Celonis Process Management features two core products: the Process Designer and the Process Navigator. As the names imply, the Process Designer lets you design your processes and all the elements that come with them. At the same time, the Process Navigator allows others in your organization to consume the content published through the Process Designer.

**Note**

Users must have a Process Designer or Process Navigator account to access Celonis Process Management from the Celonis Platform Navigation bar.

Expand all

[## Enabling access to Celonis Process Management](#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm4653320035932834208373510077_body)

To enable access to Celonis Process Management for your team:

1. In the Celonis Platform, select **Admin & Settings** > **Settings**.
2. In **Celonis Process Management** > **Enable navigation links**, turn on the **Enable access** toggle.
3. Enter a Process Designer URL in the **Process Designer** field.
4. Optionally, enter a Process Navigator URL in the **Process Navigator** field.

   **Tip**

   Open Process Designer and copy and paste the Process Designer URL into the **Process Designer** field. If you're also enabling Process Navigator, open Process Navigator and copy and paste the Process Navigator URL into the **Process Navigator** field.
5. Select **Save**.

   Process Designer and (optionally) Process Navigator can be [accessed](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm4653320041760034208373558671 "Accessing Celonis Process Management from the Celonis Platform") from the Celonis Platform Navigation bar. For more information, see [Accessing Celonis Process Management from the Celonis Platform](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm4653320041760034208373558671 "Accessing Celonis Process Management from the Celonis Platform").

[## Removing access to CPM from the Celonis Platform navigation bar](#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm234353661143149_body)

You can remove access to Celonis Process Management from **Admin & Settings** > **Settings** > **Celonis Process Management** by doing one of the following:

- Turning off the **Enable access** toggle in **Enable navigation links**.
- Deleting the Process Designer URL.

**Note**

If you delete only the Process Navigator URL, this will only remove Process Navigator from the Celonis Platform Navigation bar; Process Designer will still be available to admin and analyst users.

For more information, see [Accessing CPM from the Celonis Platform](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm4653320041760034208373558671 "Accessing Celonis Process Management from the Celonis Platform").

[## Enabling process model import/export between Process Adherence Manager and Process Designer](#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm23495811589906_body)

To enable process model import and export between Process Adherence Manager and Process Designer:

1. In the Celonis Platform, select **Admin & Settings** > **Settings**.
2. In **Celonis Process Management** > **Enable integration with Process Adherence Manager**, turn on the **Enable data integration** toggle.
3. Enter your API URL in the **API URL** field.

   **Note**

   The API URL has this format:

   `<base URL>/<collection>/<database>`

   where:

   - `<base URL>` is the environment where CPM is hosted.
   - `<collection>` and `<database>` are the names of your [CPM storage collection and database](https://developer.celonis.com/cpm/admin/administration/storage-collections-and-databases/).
4. [Configure a REST API authentication token](https://developer.celonis.com/cpm/developer/rest-api/how-to/rest-symbio-auth-token-client-temp-example-documentation/rest-symbio-auth-token-client-temp-example-documentation/#configuring-rest-authentication-tokens).
5. Copy and paste your REST API authentication token into the **Token** field.

[## Accessing Celonis Process Management from the Celonis Platform](#UUID-7053df9f-b805-e12b-2a07-3f5b6c0b953d_section-idm4653320041760034208373558671_body)

**Note**

For information about permissions in the Celonis Platform, see [User and team roles](user-profile.html "User and team roles").

### Accessing Process Designer

Users with a Process Designer account and Celonis Platform admin or analyst permissions can access Process Designer from the Celonis Platform Navigation bar.

|  |
| --- |
|  |

### Accessing Process Navigator

Users with a Process Designer or Process Navigator account and Celonis Platform member, analyst or admin permissions can access Process Navigator from **More** in the Celonis Platform Navigation bar.

|  |
| --- |
|  |

## Related topics

- [Roles](roles.html "Roles")
- [Getting started with Process Designer](getting-started-with-process-designer.html "Getting started with Process Designer")
- [Getting started with Process Navigator](getting-started-with-process-navigator.html "Getting started with Process Navigator")


---

## pql/process/enabling-and-configuring-core-processes

# Enabling and configuring core processes

While you can configure your own object-centric data model (OCDM), an efficient way to begin modeling objects and events is by using the Celonis-provided core processes in the **Catalog**. These core processes include predefined object types, event types, relationships, and perspectives for your selected process, which you can use to explore the Process Intelligence Graph and build content with Celonis Platform features such as Studio.

The following core processes can be enabled and configured for your team within the **Catalog**:

- Accounts payable
- Accounts receivable
- Inventory management
- Order management
- Procurement

Expand all

[## Before you begin](#UUID-694b29d8-3c34-25a5-8f05-1c4bed38a975_section-id235404756443747_body)

To use your data for modeling objects and events, you need to create a connection between your data source and the Celonis Platform. The commonly supported connections are:

- **SAP ECC, SAP S4/HANA, Oracle EBS and Oracle Fusion**: Celonis supplies prebuilt extractions and transformations for SAP ECC and Oracle EBS systems. These are available by downloading the extraction package from the Celonis Marketplace. For the steps, see: [Quickstart: Extract and transform your data into objects and events](quickstart--extract-and-transform-your-data-into-objects-and-events.html "Quickstart: Extract and transform your data into objects and events").
- Other source systems: For other source systems, you can use the supplied extractor or create one with the Extractor Builder. You then import your data tables or upload a sample file, before creating SQL transformations using the editor. For the steps, see: [Quickstart for other source systems](quickstart--extract-and-transform-your-data-into-objects-and-events.html#UUID-6073660b-1e61-d04e-7084-aa1b61737569_section-idm4593366870993633742164586904 "Quickstart for other source systems").

[## Enabling and configuring core processes from the catalog](#UUID-694b29d8-3c34-25a5-8f05-1c4bed38a975_section-id235404756555107_body)

Now that you have access to an OCPM data pool, you need to enable the core processes that you want to work with. To do this:

1. Click **Data - Objects and Events** and select the data pool you want to use.
2. Click **Catalog**.
3. Click the name of any of the Celonis processes, such as Procurement, and use the **Enable process** slider to enable it.

   |  |
   | --- |
   |  |

   The Celonis object types, event types, relationships, and perspective for that process are enabled.
4. To add the Celonis transformations, select your data connection from the dropdown and click **Add**.

   For each process, enable either SAP ECC, SAP S4/HANA, Oracle EBS, or Oracle Fusion transformations. Don't enable multiple data sources on the same connection. If you have multiple source systems, create a separate data connection for each one.

   |  |
   | --- |
   |  |
5. **Optional**: If your source system lacks some data needed for Celonis objects or events, you can enable **Skip missing data** to let transformations run despite errors.

   - **Missing columns**: Your objects and events will be created with null values in these fields.
   - **Required columns with mismatched data types**: These are automatically converted to the expected format.

   |  |
   | --- |
   |  |
6. You can now create a version of the data model. To do this, click **Data - Objects and Events** and then click **Create version**.

   To learn more about creating versions and deploying them to production, see: [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
7. You can now deploy the latest version to production. To do this, click **Deploy** and then follow the wizard.

## Related topics

- [Versioning and deploying OCDM](version-deploy-ocdm.html "Versioning and deploying object-centric data models")
- [Objects](creating-custom-object-types-and-custom-event-types.html "Creating and importing object types")
- [Events](creating-and-importing-events.html "Creating and importing events")


---

## pql/process/enabling-process-filters

# Enabling process filters

Process filters are used to refine and analyze specific aspects of a process by filtering out unnecessary or irrelevant data. They help in focusing on particular cases, time frames, events, or conditions within a process.

By enabling process filters within a View, App users can filter based on:

- **Process flow filter**: Select objects where an event is or isn't followed by another, e.g., "Invoice sent" followed by "Invoice canceled". See: [Process flow filters](process-flow-filters.html "Using process flow filters").
- **Event/activity filter:** Select objects based on their flow through specified events, such as objects starting with or including "Create Order". See: [Event / activity filters](event-activity-filter.html "Using event / activity filters").
- **Event/activity count filter** (previously called 'rework filter' in Analysis): Select objects where an event occurs less or more times than a defined start and end threshold e.g. only objects where "Invoice paid" happens more than once. See [Event / activity count filters](event-count.html "Using event / activity count filters").
- **Throughput time filter**: Select objects where the duration between two events is faster/slower than specified, e.g., "Item sent" to "Item received" in under three days. See [Throughput time filters](tpt-filters.html "Using throughput time filters").

**Analysis selection UIs**

Process filters provide the same functionality that the selection UIs provide in Analysis. The main difference is that rework filters are now called event / activity count (depending on the data model type you're using).

For more information about the selection UIs in Analysis, see [Selections in Analysis UI](selections-in-analysis-ui.html "Selections in Analysis UI")

## Configuring process filters

Process filters require at least one event log to be selected, with the option to select from existing event logs in the same Knowledge Model as this View or create a new event log using the PQL editor. For more information about event logs, see [Event logs (case-centric)](knowledge-model---event-logs--case-centric-.html "Knowledge Model - Event Logs (case-centric)").

By default, only the default event log as defined in the Data Model will be selected. You can change the default and add more event logs by clicking **Settings**:

|  |
| --- |
|  |

You then have the following options:

- **View and select existing event log**: View and select from existing event logs in the same Knowledge Model as the view.
- **Set as default**: If multiple event logs are selected, the default one will be used first when filtering a process.
- **Edit event log:** This edits the existing event log in the Knowledge Model. By editing existing event logs, you may impact other content where this event log is being used.
- **Duplicate event log**: This creates a copy of the event log within the Knowledge Model.
- **Create Event log**: This opens the inline event log creator, with any event logs created saved to the Knowledge Model.

|  |
| --- |
|  |

## Syncing component setting event logs and process filter settings

If you add a component to a View then configure that component with an event log, the event log will be automatically selected in the process filter settings. Components that use event logs include Process Explorer and Variant Explorer. You'll receive a notification when this occurs and can choose whether to deselect the event log in the process filter settings.

|  |
| --- |
|  |

If an event log is removed from a component in a View, you'll receive a notification and can review your process filter settings.

Any notifications display when you save your View.

If process filters are activated after the View has been configured with components that use event logs, the event log settings will use the default activity table for the Knowledge Model and all event logs used in the components.

**Note**

You can only sync between components and Views that use the same Knowledge Model.


---

## pql/process/event-processing-rules

# Event processing rules

Event processing rules define the events, attributes and screenshots that are captured for a Task Mining project. Rules may be based on your use case or legal or privacy requirements so, for example, screenshots might be activated for some applications but not for others where user information may be displayed.

Each event processing rule includes an event, a condition (optional) and an action. If the event and condition meet the criteria specified by the rule, the action is performed.

Where an event and condition match multiple event processing rules, only the action associated with the first event processing rule that matches will be performed. The order you define event processing rules in is therefore important. You should define more specific event processing rules before more general event processing rules.

For example, if you want screenshots to be taken for Microsoft Excel only, the event processing rule specifying this should be ordered before the event processing rule that specifies applications where screenshots will not be taken. A default rule is always included and is applied if none of the actions in the previous event processing rules is performed. The default rule includes an action only.

**Important**

You must have [Chrome browser extensions installed](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") to use event processing rules.

Expand all

[## Before you begin](#id829637_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- [Chrome browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") installed

[## Creating event processing rules](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164203395372_body)

You can create event processing rules in the Configuration Editor using the:

- [Visual Editor](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164204334205 "Using the Visual Editor to create event processing rules (recommended)").
- [Text Editor](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id23516420479749 "Using the Text Editor to create event processing rules (expert user)").

The logic explained in [Defining event processing rules](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202098577 "Defining event processing rules"), [Boolean expressions in event processing rules](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202509982 "Boolean expressions in event processing rules") and [Event processing rule examples](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202971553 "Event processing rule examples") applies.

**Tip**

We recommend using the Visual Editor as it’s easier to use and will cover most common use cases. You can, however, switch to the Text Editor at any point although we recommend the Text Editor for more expert users only.

[### Using the Visual Editor to create event processing rules (recommended)](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164204334205_body)

1. In the Task Mining Configuration Editor, select **Event Processing Rules** > **Visual Editor**.
2. Select **New Rule**.
3. Enter a name for your rule in **Rule name**.
4. Select the **Edit** button  to open the **Description** screen.
5. Add information about the rule in the **Description** field.
6. In the sidebar, select **Event**, **Condition**, **Hashing** and **Screenshots** in turn and specify your rule, using the dropdown menus to help add specific options.

   **Tip**

   See [Defining event processing rules](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202098577 "Defining event processing rules") for more information.
7. Select **OK**.
8. Repeat steps **2** to **7** for each event processing rule you want to add.
9. Use the **Up** button  and **Down** button  to specify the order of your event processing rules.
10. Add a default rule.
11. [Save and upload your configuration file](configuring-task-mining-projects.html#UUID-1b7d8914-72b4-b868-f4c5-e79d0ac53dca_section-id235231754458951 "Downloading and editing a Task Mining configuration file").

[### Using the Text Editor to create event processing rules (expert user)](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id23516420479749_body)

1. In the Task Mining Configuration Editor, select **Event Processing Rules** > **Text Editor**.

   The Text Editor opens.
2. Add event processing rules in the text field.

   See [Defining event processing rules](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202098577 "Defining event processing rules") for more information.
3. [Save and upload your configuration file](configuring-task-mining-projects.html#UUID-1b7d8914-72b4-b868-f4c5-e79d0ac53dca_section-id235231754458951 "Downloading and editing a Task Mining configuration file")

[## Defining event processing rules](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202098577_body)

**Important**

Event processing rules are case sensitive.

Filter

- Name
- Description
- Syntax
- Example

| Name | Description | Syntax | Example |
| --- | --- | --- | --- |
| `rules` | Consists of:  - An assigned numerical identifier (0 to n). - A description (optional). - An event definition. - A condition (optional). - An action definition. - A default rule.  The action is performed when the event and condition meet the criteria defined in the event processing rule. Multiple event processing rules can be specified  .If no actions are performed because none of the events and conditions meet the event processing rule criteria, the default rule is applied.  A default rule starts with the keyword `DEFAULT` and consists of:  - A description (optional). - An action definition or the keyword `SKIP`.  If an action is defined in the default rule, it will be performed.  If the S`SKIP` keyword is used, events that did not match any rule are not logged. | `<rules>                  ::== ( <ECA rule> )* <default rule><ECA rule>                ::== <Description>? <Event> ( <Condition> )? <Action><default rule>    ::== DEFAULT <Description>? ( <Action> | SKIP )` | The most simple event processing rule consists of the default rule only. This effectively switches off logging for all events:  `DEFAULT SKIP` |
| `Description` | Consists of:  - The keyword `RULE`. - The name of the rule (`string`). - The keyword `DESCRIPTION`. - A detailed description of the rule (`string`).  FROM 1.2.7 | `<Description>    ::== RULE <string expression> DESCRIPTION <string expression>` | `RULE 'Log Chrome events' DESCRIPTION 'Logging events for Google chrome with screenshots of the active window.'` |
| `Event` | Defines which events will trigger the rule. The rule can be triggered for:  - All events; or - Specific events defined in a list of event names.  The keyword `EXCEPT` (optional) inverts the list of triggering events. This means the rule matches all events except the events listed. | `<Event>                  ::== ON ( ALL EVENTS ) | ( ( EXCEPT )? <string list> )` | Trigger the event processing rule for all events:  `ON ALL EVENTS`  Trigger the event processing rule for click events only:  `ON 'Left click', 'Right click'`  Trigger the event processing rule for all events except click events:  `ON EXCEPT 'Left click', 'Right click'` |
| `Condition` | Defines a constraint that must be fulfilled for an event to meet the event processing rule criteria. Conditions are defined using [Boolean expressions](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202509982 "Boolean expressions in event processing rules"). | `<Condition>              ::== IF <boolean expression THEN` | Trigger the event processing rule only if the event came from the Google Chrome browser:  `IF ProcessName = 'chrome' THEN` |
| `Action` | Defines how an event that matches the rule should be processed. Consists of a definition for:  - `Logging`. - `Hashing` (optional). - `Screenshots` (optional). | `<Action>         ::== <Logging> ( <Hashing> )? ( <Screenshots> )?` |  |
| `Logging` | Defines the event attributes that are logged. All attributes or specific attributes defined in a list of attribute names can be logged.  The keyword `EXCEPT` (optional) allows specific attributes to be excluded.  **Note**  If an attribute isn’t included, the default value (usually null) is used. Mandatory attributes cannot be excluded and will be automatically included even if not specified in the attribute list.  For information about mandatory attributes, see the [Task Mining attribute reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286 "Task Mining attribute reference"). | `<Logging>                ::== LOG ( ALL | ( ( EXCEPT )? <attribute list> ) )` | Log all attributes:  `LOG ALL`  Log the URL and KeyboardCommand attributes. Mandatory attributes are also logged:  `LOG URL, KeyboardCommand` |
| `Hashing` (optional) | Defines the attributes that are hashed before logging. Can be excluded if hashing of attributes is not required. The hash function used is SHA256.  **Note**  Attributes that are excluded from logging are also implicitly excluded from hashing. Adding attributes to the attribute list that are not hashable will cause errors. Mandatory attributes are not hashed.  For information about hashable attributes, see the [Task Mining attribute reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286 "Task Mining attribute reference"). | `<Hashing>                ::== HASH <attribute list>` | Log the `URL` and `SystemUser` attributes as hashed values. Mandatory attributes are also logged but are not hashed:  `HASH URL, SystemUser` |
| `Screenshots` (optional) | Defines the screenshot capturing mode, with these options:  - Do not take screenshots (default). - Take screenshots of active window. - Take screenshots of active desktop. - Take screenshots of all desktops.  Can be omitted if screenshots are not required. | `<Screenshots>    ::== TAKE SCREENSHOT ( ACTIVE_WINDOW | ACTIVE_DESKTOP | ALL_DESKTOPS )` | Take a screenshot of the active window:  `TAKE SCREENSHOT ACTIVE_WINDOW`  Take a screenshot of the active desktop:  `TAKE SCREENSHOT ACTIVE_DESKTOP`  Take a screenshot of all desktops:  `TAKE SCREENSHOT ALL_DESKTOPS` |

| Name | Description | Syntax | Example |
| --- | --- | --- | --- |
| `rules` | Consists of:  - An assigned numerical identifier (0 to n). - A description (optional). - An event definition. - A condition (optional). - An action definition. - A default rule.  The action is performed when the event and condition meet the criteria defined in the event processing rule. Multiple event processing rules can be specified  .If no actions are performed because none of the events and conditions meet the event processing rule criteria, the default rule is applied.  A default rule starts with the keyword `DEFAULT` and consists of:  - A description (optional). - An action definition or the keyword `SKIP`.  If an action is defined in the default rule, it will be performed.  If the S`SKIP` keyword is used, events that did not match any rule are not logged. | `<rules>                  ::== ( <ECA rule> )* <default rule><ECA rule>                ::== <Description>? <Event> ( <Condition> )? <Action><default rule>    ::== DEFAULT <Description>? ( <Action> | SKIP )` | The most simple event processing rule consists of the default rule only. This effectively switches off logging for all events:  `DEFAULT SKIP` |
| `Description` | Consists of:  - The keyword `RULE`. - The name of the rule (`string`). - The keyword `DESCRIPTION`. - A detailed description of the rule (`string`).  FROM 1.2.7 | `<Description>    ::== RULE <string expression> DESCRIPTION <string expression>` | `RULE 'Log Chrome events' DESCRIPTION 'Logging events for Google chrome with screenshots of the active window.'` |
| `Event` | Defines which events will trigger the rule. The rule can be triggered for:  - All events; or - Specific events defined in a list of event names.  The keyword `EXCEPT` (optional) inverts the list of triggering events. This means the rule matches all events except the events listed. | `<Event>                  ::== ON ( ALL EVENTS ) | ( ( EXCEPT )? <string list> )` | Trigger the event processing rule for all events:  `ON ALL EVENTS`  Trigger the event processing rule for click events only:  `ON 'Left click', 'Right click'`  Trigger the event processing rule for all events except click events:  `ON EXCEPT 'Left click', 'Right click'` |
| `Condition` | Defines a constraint that must be fulfilled for an event to meet the event processing rule criteria. Conditions are defined using [Boolean expressions](event-processing-rules.html#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202509982 "Boolean expressions in event processing rules"). | `<Condition>              ::== IF <boolean expression THEN` | Trigger the event processing rule only if the event came from the Google Chrome browser:  `IF ProcessName = 'chrome' THEN` |
| `Action` | Defines how an event that matches the rule should be processed. Consists of a definition for:  - `Logging`. - `Hashing` (optional). - `Screenshots` (optional). | `<Action>         ::== <Logging> ( <Hashing> )? ( <Screenshots> )?` |  |
| `Logging` | Defines the event attributes that are logged. All attributes or specific attributes defined in a list of attribute names can be logged.  The keyword `EXCEPT` (optional) allows specific attributes to be excluded.  **Note**  If an attribute isn’t included, the default value (usually null) is used. Mandatory attributes cannot be excluded and will be automatically included even if not specified in the attribute list.  For information about mandatory attributes, see the [Task Mining attribute reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286 "Task Mining attribute reference"). | `<Logging>                ::== LOG ( ALL | ( ( EXCEPT )? <attribute list> ) )` | Log all attributes:  `LOG ALL`  Log the URL and KeyboardCommand attributes. Mandatory attributes are also logged:  `LOG URL, KeyboardCommand` |
| `Hashing` (optional) | Defines the attributes that are hashed before logging. Can be excluded if hashing of attributes is not required. The hash function used is SHA256.  **Note**  Attributes that are excluded from logging are also implicitly excluded from hashing. Adding attributes to the attribute list that are not hashable will cause errors. Mandatory attributes are not hashed.  For information about hashable attributes, see the [Task Mining attribute reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286 "Task Mining attribute reference"). | `<Hashing>                ::== HASH <attribute list>` | Log the `URL` and `SystemUser` attributes as hashed values. Mandatory attributes are also logged but are not hashed:  `HASH URL, SystemUser` |
| `Screenshots` (optional) | Defines the screenshot capturing mode, with these options:  - Do not take screenshots (default). - Take screenshots of active window. - Take screenshots of active desktop. - Take screenshots of all desktops.  Can be omitted if screenshots are not required. | `<Screenshots>    ::== TAKE SCREENSHOT ( ACTIVE_WINDOW | ACTIVE_DESKTOP | ALL_DESKTOPS )` | Take a screenshot of the active window:  `TAKE SCREENSHOT ACTIVE_WINDOW`  Take a screenshot of the active desktop:  `TAKE SCREENSHOT ACTIVE_DESKTOP`  Take a screenshot of all desktops:  `TAKE SCREENSHOT ALL_DESKTOPS` |

[## Boolean expressions in event processing rules](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202509982_body)

Filter

- Boolean operator
- Description
- Syntax
- Example

| Boolean operator | Description | Syntax | Example |
| --- | --- | --- | --- |
| `Comparison` | Compares two expressions and evaluates to a Boolean depending on the comparison operator. Both input expressions must be of the same data type and can be attributes or constant values.  Available comparison operators are:  - Equals (=). - Doesn’t equal (!=). - Less than (<). - Less than or equal to (<=). - Greater than (>). - Greater than or equal to (>=). | `<Comparison>                     ::== <left expression> <Comparison operator> <right expression><Comparison operator>     ::== '=' | '!=' | '<' | '<=' | '>' | '>='` | Compare the URL attribute to a string constant for equality:  `URL = 'https://www.celonis.com/'`  Check if the `ScreenshotWidth` attribute is greater than 0:  `ScreenshotWidth > 0` |
| `IN` | Checks if an expression evaluates to one of the given values.  **Note**  All values in the value list must be of the same data type. Supports `STRING`, `INT` and `FLOAT` data types. | `<In>                                     ::== <expression> IN ( <value list> )` | Check if the `ProcessName` attribute evaluates to one of the given process names (applications):  `ProcessName IN ( 'chrome', 'OUTLOOK', 'explorer')` |
| `NOT` | Inverts a Boolean expression. | `<Not>                                    ::== NOT <boolean expression>` | Check whether the URL is not https://www.celonis.com/:  `NOT URL = 'https://www.celonis.com/'` |
| `IS NULL` | Checks if an expression evaluates to null.  The `NOT` keyword could be used instead. | `<Is null>                                ::== <expression> IS ( NOT )? NULL` | Check if the `ActiveWindow` attribute is not set:  `ActiveWindow IS NULL`  Check if the `ActiveWindow` attribute is set to a value:  A`ActiveWindow IS NOT NULL` |
| `AND` | Computes the logical `AND` of two or more Boolean expressions. | `<And>                            ::== <boolean expression> ( AND <boolean expression> )+` | Check if both comparisons evaluate to true:  `ProcessName = 'chrome' AND URL = 'https://www.celonis.com/'` |
| `OR` | Computes the logical `OR` of two or more Boolean expressions. | `<Or>                             ::== <boolean expression> ( OR <boolean expression> )+` | Check if at least one of the comparisons evaluates to true:  `ProcessName = 'chrome' OR URL = 'https://www.celonis.com/'` |
| `()` | Allows the logical structuring of Boolean expressions. | `<Parenthesis>            ::== '(' <boolean expression> ')'` | Logically structure the statement to evaluate the `OR` statement before the `AND` statement:  `( ProcessName = 'chrome' OR URL = 'https://www.celonis.com/' ) AND ScreenshotWidth > 0`  Evaluate the `AND` statement before the `OR` statement:  `ProcessName = 'chrome' OR URL = 'https://www.celonis.com/' AND ScreenshotWidth > 0` |
| `CAST` | Converts the given `expression` into another data type.  Supports `STRING`, `INT` and `FLOAT` data types. | `<Cast>           ::== CAST '(' <Type> ',' <expression> ')'<Type>            ::== STRING | INT | FLOAT` | Convert the value of the `ScreenshotWidth` attribute to type `STRING`:  `CAST ( STRING, ScreenshotWidth )` |
| `LIKE` | Evaluates if a string expression matches the given pattern. Two different wildcard symbols can be used to define the patterns:  - A percentage sign (%) matches an arbitrary number of characters (including 0 characters). - An underscore ( \_ ) matches one character exactly.  The wildcard symbols can be escaped by a preceding backslash ( \ ), e.g. \% or \\_ . The backslash itself is escaped by a double backslash ( \\ ).  The comparison is case-insensitive so the patterns `%celonis%` and `%Celonis%` will produce the same result. | `<Like>           ::== <string expression> LIKE <string pattern>` | Match if the `ActiveWindow` attribute contains the string `Unread Messages`:  ActiveWindow LIKE '%Unread Messages%'  Match if the `ActiveWindow` attribute starts with `Celonis`:  `ActiveWindow LIKE 'Celonis%'`  Match if the `ActiveWindow` attribute ends with `Celonis`:  `ActiveWindow LIKE '%Celonis'` |
| `DOMAIN` | Maps a URL string to its domain, removing the paths, ports and protocol of the URL. | `<Domain> ::== DOMAIN '(' <string expression> ')'` | Trims the URL to its domain community.celonis.com:  `DOMAIN ( 'https://community.celonis.com/latest' )` |

| Boolean operator | Description | Syntax | Example |
| --- | --- | --- | --- |
| `Comparison` | Compares two expressions and evaluates to a Boolean depending on the comparison operator. Both input expressions must be of the same data type and can be attributes or constant values.  Available comparison operators are:  - Equals (=). - Doesn’t equal (!=). - Less than (<). - Less than or equal to (<=). - Greater than (>). - Greater than or equal to (>=). | `<Comparison>                     ::== <left expression> <Comparison operator> <right expression><Comparison operator>     ::== '=' | '!=' | '<' | '<=' | '>' | '>='` | Compare the URL attribute to a string constant for equality:  `URL = 'https://www.celonis.com/'`  Check if the `ScreenshotWidth` attribute is greater than 0:  `ScreenshotWidth > 0` |
| `IN` | Checks if an expression evaluates to one of the given values.  **Note**  All values in the value list must be of the same data type. Supports `STRING`, `INT` and `FLOAT` data types. | `<In>                                     ::== <expression> IN ( <value list> )` | Check if the `ProcessName` attribute evaluates to one of the given process names (applications):  `ProcessName IN ( 'chrome', 'OUTLOOK', 'explorer')` |
| `NOT` | Inverts a Boolean expression. | `<Not>                                    ::== NOT <boolean expression>` | Check whether the URL is not https://www.celonis.com/:  `NOT URL = 'https://www.celonis.com/'` |
| `IS NULL` | Checks if an expression evaluates to null.  The `NOT` keyword could be used instead. | `<Is null>                                ::== <expression> IS ( NOT )? NULL` | Check if the `ActiveWindow` attribute is not set:  `ActiveWindow IS NULL`  Check if the `ActiveWindow` attribute is set to a value:  A`ActiveWindow IS NOT NULL` |
| `AND` | Computes the logical `AND` of two or more Boolean expressions. | `<And>                            ::== <boolean expression> ( AND <boolean expression> )+` | Check if both comparisons evaluate to true:  `ProcessName = 'chrome' AND URL = 'https://www.celonis.com/'` |
| `OR` | Computes the logical `OR` of two or more Boolean expressions. | `<Or>                             ::== <boolean expression> ( OR <boolean expression> )+` | Check if at least one of the comparisons evaluates to true:  `ProcessName = 'chrome' OR URL = 'https://www.celonis.com/'` |
| `()` | Allows the logical structuring of Boolean expressions. | `<Parenthesis>            ::== '(' <boolean expression> ')'` | Logically structure the statement to evaluate the `OR` statement before the `AND` statement:  `( ProcessName = 'chrome' OR URL = 'https://www.celonis.com/' ) AND ScreenshotWidth > 0`  Evaluate the `AND` statement before the `OR` statement:  `ProcessName = 'chrome' OR URL = 'https://www.celonis.com/' AND ScreenshotWidth > 0` |
| `CAST` | Converts the given `expression` into another data type.  Supports `STRING`, `INT` and `FLOAT` data types. | `<Cast>           ::== CAST '(' <Type> ',' <expression> ')'<Type>            ::== STRING | INT | FLOAT` | Convert the value of the `ScreenshotWidth` attribute to type `STRING`:  `CAST ( STRING, ScreenshotWidth )` |
| `LIKE` | Evaluates if a string expression matches the given pattern. Two different wildcard symbols can be used to define the patterns:  - A percentage sign (%) matches an arbitrary number of characters (including 0 characters). - An underscore ( \_ ) matches one character exactly.  The wildcard symbols can be escaped by a preceding backslash ( \ ), e.g. \% or \\_ . The backslash itself is escaped by a double backslash ( \\ ).  The comparison is case-insensitive so the patterns `%celonis%` and `%Celonis%` will produce the same result. | `<Like>           ::== <string expression> LIKE <string pattern>` | Match if the `ActiveWindow` attribute contains the string `Unread Messages`:  ActiveWindow LIKE '%Unread Messages%'  Match if the `ActiveWindow` attribute starts with `Celonis`:  `ActiveWindow LIKE 'Celonis%'`  Match if the `ActiveWindow` attribute ends with `Celonis`:  `ActiveWindow LIKE '%Celonis'` |
| `DOMAIN` | Maps a URL string to its domain, removing the paths, ports and protocol of the URL. | `<Domain> ::== DOMAIN '(' <string expression> ')'` | Trims the URL to its domain community.celonis.com:  `DOMAIN ( 'https://community.celonis.com/latest' )` |

[## Event processing rule examples](#UUID-e158c13e-dd31-275a-6e5c-577a5cc17699_section-id235164202971553_body)

**Important**

Event processing rules are case sensitive.

Filter

- Example
- Example syntax
- Example description

| Example | Example syntax | Example description |
| --- | --- | --- |
| Denylist Slack and do not capture any data. | `ON ALL EVENTS`  `IF ProcessName NOT IN ('slack') THEN LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | **Note**  The process name for Slack is lower case. If written with a starting capital letter, events from Slack will be captured. |
| Collect all events without any restrictions and take a screenshot of the active window. | `ON ALL EVENTS`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP`  or  `DEFAULT LOG ALL` | -- |
| Avoid duplicate events from Google Chrome. | `ON ALL EVENTS`  `IF ProcessName = 'chrome' AND ExtensionName = 'chrome' OR ProcessName != 'chrome' THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs all events with all attributes and takes screenshots of the active window, but filters out events from Google Chrome that were not captured by the Chrome browser extension. This avoids duplicate events (like left clicks) that are detected by both the Task Mining Client software and the Chrome browser extension.  **Tip**  You can use the same syntax for the Task Mining browser extension for Microsoft Edge by replacing `chrome` with the process name for Microsoft Edge. You can find the process name by selecting the browser process in Windows Task Manager and selecting properties. The process name is case sensitive. |
| Log events from specified applications only. | `ON ALL EVENTS`  `IF ProcessName IN ('chrome', 'explorer', 'Slack') THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs events from Google Chrome, Microsoft Windows Explorer and Slack only.  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive. |
| Don’t log events from specified applications. | `ON ALL EVENTS`  `IF ProcessName NOT IN ('chrome', 'explorer', 'Slack') THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Events from Google Chrome, Microsoft Windows Explorer and Slack are not logged.  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive. |
| Log events for specified URLs only. | `ON ALL EVENTS`  `IF DOMAIN (URL) LIKE '%.celonis.com' OR ProcessName != 'chrome' THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs events from www.celonis.com and related subdomains (like community.celonis.com) only and takes a screenshot of the active window. |
| Collect all events and take screenshots. | `ON ALL EVENTS`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`d  `DEFAULT SKIP`  or  `DEFAULT LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW` | Collects all events without any restrictions and takes a screenshot of the active window. |

| Example | Example syntax | Example description |
| --- | --- | --- |
| Denylist Slack and do not capture any data. | `ON ALL EVENTS`  `IF ProcessName NOT IN ('slack') THEN LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | **Note**  The process name for Slack is lower case. If written with a starting capital letter, events from Slack will be captured. |
| Collect all events without any restrictions and take a screenshot of the active window. | `ON ALL EVENTS`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP`  or  `DEFAULT LOG ALL` | -- |
| Avoid duplicate events from Google Chrome. | `ON ALL EVENTS`  `IF ProcessName = 'chrome' AND ExtensionName = 'chrome' OR ProcessName != 'chrome' THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs all events with all attributes and takes screenshots of the active window, but filters out events from Google Chrome that were not captured by the Chrome browser extension. This avoids duplicate events (like left clicks) that are detected by both the Task Mining Client software and the Chrome browser extension.  **Tip**  You can use the same syntax for the Task Mining browser extension for Microsoft Edge by replacing `chrome` with the process name for Microsoft Edge. You can find the process name by selecting the browser process in Windows Task Manager and selecting properties. The process name is case sensitive. |
| Log events from specified applications only. | `ON ALL EVENTS`  `IF ProcessName IN ('chrome', 'explorer', 'Slack') THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs events from Google Chrome, Microsoft Windows Explorer and Slack only.  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive. |
| Don’t log events from specified applications. | `ON ALL EVENTS`  `IF ProcessName NOT IN ('chrome', 'explorer', 'Slack') THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Events from Google Chrome, Microsoft Windows Explorer and Slack are not logged.  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive. |
| Log events for specified URLs only. | `ON ALL EVENTS`  `IF DOMAIN (URL) LIKE '%.celonis.com' OR ProcessName != 'chrome' THEN`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`  `DEFAULT SKIP` | Logs events from www.celonis.com and related subdomains (like community.celonis.com) only and takes a screenshot of the active window. |
| Collect all events and take screenshots. | `ON ALL EVENTS`  `LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW`d  `DEFAULT SKIP`  or  `DEFAULT LOG ALL`  `TAKE SCREENSHOT ACTIVE_WINDOW` | Collects all events without any restrictions and takes a screenshot of the active window. |

## Related topics

- [Installing Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)")
- [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings")


---

## pql/process/faq---process-query-language

# FAQ - Process Query Language

## Description

This section answers the most common frequently asked questions about PQL.

### General

**Which characters are allowed in table or column names?**

You can find all the information you need about table and column names [here](supported-table-and-column-names.html "Supported table and column names").

**What do I do when I see this error: "Could not open swap file: <some file>"?**

Try to do a "Force Complete Reload" in the data model.

**What does it mean if an operator is marked as deprecated?**

This means that there is a new operator available as a replacement. For more information check the Deprecated Operators section [here.](pql-function-library.html "PQL Function Library")

### Data type conversion

You can find detailed information about data type conversion [here](data-types-3326971.html "Data Types").

**How do I cast from INT to FLOAT?**

To convert an [INT](int.html "INT") to a [FLOAT](float.html "FLOAT"), use `*1.0`

**How do I cast from FLOAT to INT?**

To convert a [FLOAT](float.html "FLOAT") to an [INT](int.html "INT"), use the [FLOOR](floor.html "FLOOR") or [ROUND](round.html "ROUND") operators.

**How do I cast from STRING to INT?**

To convert a [STRING](string.html "STRING") to an [INT](int.html "INT"), use the [TO\_INT](to_int.html "TO_INT") operator.

### Null handling

**How do I change the result of a KPI from NULL to 0?**

Use the [COALESCE](coalesce.html "COALESCE") operator.

**How do I catch an empty variable in a filter statement?**

To avoid errors for empty variables, the variable syntax allows conditional statements. The following example only applies the filter statement if the variable is not empty:

`<% if(NEW_VARIABLE != "") { %> FILTER "table"."column" LIKE '%<%=NEW_VARIABLE%>%'; <% } %>`

### KPI calculation

**Why is `KPI("Number of process variants")` different from `COUNT(DISTINCT VARIANT("_CEL_ACTIVITIES"."ACTIVITY" ))`?**

The predefined saved formula `KPI("Number of process variants")` uses the [SHORTENED](variant.html "VARIANT") operator with the default max\_cycle\_length of 2.

**Why do the results of KPI values in OLAP tables change depending on other KPIs?**

In general, Celonis performs implicit joins when a query accesses several tables. The joins are executed according to the foreign key relationships defined in the data model. Therefore, the calculation of individual KPIs depends on the table for which the join is executed. You can find more information about the join functionality [here](join-functionality.html "Join functionality").

**How do I find out if the average value of a company is above or below the overall average value?**

Use the [GLOBAL](global.html "GLOBAL") operator to calculate the overall average value and compare it with the average value of a company:

`CASE WHEN AVG ( "Companies"."Value" ) ) > GLOBAL ( AVG ( "Companies"."Value" ) ) THEN 'larger' ELSE 'smaller' END`

### Throughput time calculation

**How do I calculate the maximum number of days between any two activities in the process for each case?**

Use the [PU\_MAX](pu_max.html "PU_MAX") operator in combination with the [SOURCE / TARGET](source---target.html "SOURCE - TARGET") operator.

`PU_MAX("_CEL_CASES",SECONDS_BETWEEN(TARGET("_CEL_ACTIVITIES"."EVENTTIME"),SOURCE("_CEL_ACTIVITIES"."EVENTTIME")))`

You can find more information about PU functions and SOURCE/TARGET in our cheat sheets [here](cheat-sheets.html "Cheat Sheets").

**Why does the throughput time in the Process Explorer and in a Single KPI component differ?**

There are several possible reasons for this:

- Rounding issues: The throughput time in the Process Explorer is calculated with the [SOURCE / TARGET](source---target.html "SOURCE - TARGET") operator by mapping the timestamps via [REMAP\_TIMESTAMP](remap_timestamps.html "REMAP_TIMESTAMPS") to `SECONDS`. Then the result is converted to `MINUTES`/`HOURS`/ `DAYS`. If the throughput time calculation in the Single KPI is done by mapping the timestamps via [REMAP\_TIMESTAMP](remap_timestamps.html "REMAP_TIMESTAMPS") to `MINUTES`, this can cause differences in the two results.
- Different ways of calculation: As mentioned in the previous point, the throughput time in the Process Explorer is calculated by using the [SOURCE / TARGET](source---target.html "SOURCE - TARGET") operator. If the throughput time calculation in the Single KPI is done with another operator, this might cause differences in the results.
- Calendar enabled in the analysis: It is possible to enable calendars for a whole analysis (in the Datamodel configuration), which will only take the configured working hours into consideration for the throughput time shown by the Process & Variant Explorer. For custom PQL queries, the calendar configuration has to be specified manually. For more information, see the documentation on [calendars](datetime-calendars.html "DateTime Calendars").

You can find detailed examples of calculations of throughput times [here](throughput-times.html "Throughput Times").

**Why don't the throughput times in the Variant Explorer add up?**

The variant explorer can show the throughput time in two different ways:

- The median throughput time of all cases belonging to a variant, right next to its case coverage
- The throughput time between each activity by switching the edge KPI to throughput time

You might expect that adding all the throughput times between the activities will lead to the same number as shown right next to the case coverage. This is not always the case. A possible deviation is caused by adding median results. The throughput time is calculated by taking the median. In general, median is more robust against outliers but there is no guarantee that the sum of medians of subgroups returns the same result as the median over the whole group. You can find detailed examples on the calculation of throughput times [here](throughput-times.html "Throughput Times").

### Conformance calculation

**How do I use the results of the Conformance checker in other parts of the analysis, for example in an OLAP table?**

Store the conformance query in a variable. Then you can calculate the:

- Overall conformance: `AVG(CASE WHEN PU_SUM("_CEL_CASES", ABS(<%=conformance%>)) = 0 THEN 1 ELSE 0 END)`
- Conforming Throughput time: `AVG(CASE WHEN PU_SUM("_CEL_CASES", ABS(<%=conformance%>)) = 0 THEN CALC_THROUGHPUT(CASE_START TO CASE_END, REMAP_TIMESTAMPS("_CEL_ACTIVITIES"."EVENTTIME", HOURS)) / 24 ELSE NULL END)`
- Conforming steps per case: `AVG(CASE WHEN PU_SUM("_CEL_CASES", ABS(<%=conformance%>)) = 0 THEN PU_COUNT("_CEL_CASES", "_CEL_ACTIVITIES"."ACTIVITY") ELSE NULL END)`


---

## pql/process/getting-started-with-process-designer

# Getting started with Process Designer

The following is an example of a fully configured Process Designer environment:

Expand all

[## Process Designer main features](#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_section-idm234945332632202_body)

Process Designer offers the following main features:

- **Intuitive Process Modeling:** Process Designer offers intuitive process modeling with a user-friendly, drag-and-drop interface that simplifies the creation of structured workflows. It supports hierarchical modeling, allowing users to easily break down complex processes into manageable layers like value chains, main processes, and sub processes.
- **Role based collaboration**: The tool also enables role-based collaboration by assigning specific responsibilities, such as Architect, Author, and Reviewer, to users involved in process design and management. This ensures clear accountability, streamlined reviews, and efficient teamwork throughout the process lifecycle.
- **Object re-usability and centralization**: The ability to create re-usable objects, known as repository objects, keeps process models consistent and reduces duplication. You can also create a central library of roles, systems, customer interactions, and learning content.
- **Versioning and change management**: The built-in version control for processes and objects helps you to track changes and review content histories. You can also set notifications and reminders for periodic reviews.
- **Compliance and governance support**: You can map your processes to standards and requirements, such as ISO 9001, GDPR, and SOX. By defining controls, risks, and mitigation actions, you can ensure audit readiness.

[## Navigating Process Designer](#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-97374c19-3c69-cd7d-1225-055b1344bb71_body)

When using Process Designer, you can take advantage of the following navigation features:

- [Understanding the menu structure](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_section-idm234946311598315 "Understanding the menu structure")
- [Switching between View / Edit mode](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_section-idm234946259529271 "Switching between View / Edit mode")
- [Managing your profile](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_section-idm234946316089774 "Managing your profile")

### Understanding the menu structure

All areas of Process Designer have the same menu structure, giving you a consistent experience when viewing and editing your process content.

The top menu allows you to switch between the process object types - for example, switching between KPIs and Organization objects:

Within each object type you'll then find the overall object architecture, a list of content, the content graphic, and the graphic editor:

You then have the related objects for that main object type - for example, Organization's contain Org units, Positions, Skills, Groups, Roles, and Locations:

### Switching between View / Edit mode

Depending on your Process Designer permissions, you can switch between View and Edit mode by clicking the **Edit** icon:

In Edit mode, you have access to additional features and menu options. For example, when viewing **Systems** in Edit mode, you can access the graphic **Editor** and **Orphaned** content list:

### Managing your profile

You can manage your Process Designer profile, including changing your password and default languages, by clicking the **Profile** icon:

[## Understanding content structure](#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-7e66fb2f-81eb-60d3-c7f3-ecbd6e4289fb_body)

In Process Designer, content is hierarchically organized. This means that you can structure your content from the high-level strategy to the detailed operational steps.

While your Process Designer can be customized (meaning that names may vary), typically the following levels of content are used:

- **Process House / Landscape / Overview**: This is the top-level container for your processes and process attributes. You can use the existing overview top or create your own.

  - **Process categories**: Process categories are the second highest level of structuring within Process Designer, used as a container for your main processes, sub-processes, repository objects, and related content. By creating and using process categories in Process Designer, you can organize and classify your process models, making them easier to navigate, manage, and reuse.

    To learn more about creating process categories, head to: [Process categories](process-designer-categories.html "Creating and managing process categories").

    - **Main processes**: Main processes are the highest-level processes in your organization’s process hierarchy. They represent the core business activities or end-to-end value chains that are critical to how your organization operates. Main processes typically cover a entire business function and serve as a starting point for breaking down operations into sub processes or detailed activities.

      To learn more about creating main processes: [Creating main processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_section-idm234905271876265 "Creating main processes").
    - **Sub processes**: A sub process is a process step that contains a more detailed process within it. It represents a breakdown of a higher-level (main) process into smaller, manageable parts. You can think of it as a "process within a process."

      To learn more about creating sub processes: [Creating sub processes](creating-and-managing-processes.html#UUID-28b89a08-995b-0750-ad44-70ccab1c5b49_N1747157710192 "Creating sub processes").

In this example, you can see the different levels of content within Process Designer:

[## Creating and modeling processes](#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-f0f6f681-6749-b77a-bd08-c08ee9aad41a_body)

Process graphics are a visual representation of a process, showing the sequence of steps, activities, and decisions involved in achieving a specific goal or objective. Process graphics are useful for understanding how a process flows, identifying potential bottlenecks, and improving overall efficiency.

You can create process graphics for both main and sub processes in Process Designer using the process canvas. This interactive canvas enables you to choose your diagram modes and then add and configure process events, such as Start and End, and objects, such as tasks or interfaces.

For example, the process canvas has been used to create a purchase-to-pay process graphic:

To learn more about creating process graphics, see: [Process graphics](creating-process-graphics.html "Creating process graphics").

[## Configuring your Process Designer environment](#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374_body)

With administration permissions in Process Designer, you can configure your environment by clicking the **Admin** icon:

This gives you access to the following Admin features:

- **Administration**: Log files, apply new configurations.
- **Users**: Manage users, user groups, permission sets.
- **Settings**: Facets, variants, tags, languages, Process Designer settings.
- **Services**: Automation, converter, selection list services, storage connections, service hooks, ID providers, authentication providers.
- **Configure**: Extended configuration, features, release cycle, fact sheets, stereotypes, manuals, reporting, navigation, document templates, validation rules.
- **Importer**: AML import, Symbio data import, document import config files, Excel import.


---

## pql/process/getting-started-with-process-navigator

# Getting started with Process Navigator

The Process Navigator home page is where you can see an overview of your site content. From the Process Navigator home page, you can:

- Use [My Overview](getting-started-with-process-navigator.html#UUID-61eddcb0-8796-913c-8a1a-b146c2b776b7_section-idm454316818810723428242333432 "My Overview") to get a high-level view of the processes and content that are most relevant to you.
- Find processes and content with intuitive [search and filtering](searching-and-filtering-in-process-navigator.html "Searching and filtering in Process Navigator").
- Keep track of changes with [subscriptions and insights](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator").
- Give feedback using [requests](send-action-center-requests-in-process-navigator.html "Send Action Center requests in Process Navigator").
- [Access support content](getting-started-with-process-navigator.html#UUID-61eddcb0-8796-913c-8a1a-b146c2b776b7_N1776436422274) and training information.

**Note**

If you’re a Celonis Process Management team admin, you can change some of the Process Navigator display settings. For further information, see [Display settings](customizing-process-navigator.html "Customizing Process Navigator").

Expand all

[## Before you begin](#id856041_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Process Navigator must be activated by your Celonis Process Management admin

[## My Overview](#UUID-61eddcb0-8796-913c-8a1a-b146c2b776b7_section-idm454316818810723428242333432_body)

1. Top navigation, where you can see the name of your workspace, [Process Cockpit](process-cockpit.html "Process Cockpit") (if enabled), the search tab, the search bar, search filters, subscriptions, the Action Center, the language indicator, and your profile.

   Side navigation, where you can see an overview of your processes and content, and apply search filters.
2. Search bar and filters you use to find specific processes or content.
3. Filters that are automatically applied so only the content most relevant to you is displayed.

   **Note**

   You can only enable or disable these filters here. Select on the Process Navigator home page or in Process Journal to view and edit these filter settings.
4. Select the type of process or content you want to display. You may see additional options here depending on your organization's configuration.
5. The name of the process or content. You may see additional headings here depending on your organization's configuration.

|  |  |
| --- | --- |
|  | Open or close the side navigation. You can click on each section name to apply individual filters to your search. |
|  | Where the process or content sits in the hierarchy. |
|  | Click to download any attachments related to your process or content. The number displayed shows the number of attachments.  If there are multiple attachments, you can only download one attachment at a time. |
|  | Click to subscribe to updates whenever any changes are made. |
|  | Click to display version and status information. |

[## Accessing support information in Process Navigator](#id856112_body)

### Helpful documents

Scroll down the Process Designer home page until you get to **Helpful documents**. You’ll find lots of useful content here.

### Learning materials

In **My Overview**, search on **Documents** to find useful training materials. You can download them by clicking the paperclip icon.

### Downloading a handbook

In **Process Journal**, scroll down and click **Download Handbook** to see supporting documentation for your process.

## Related topics

- [Searching and filtering in Process Navigator](searching-and-filtering-in-process-navigator.html "Searching and filtering in Process Navigator")
- [Send Action Center requests](send-action-center-requests-in-process-navigator.html "Send Action Center requests in Process Navigator")
- [Monitoring changes with Process Navigator](monitoring-changes-with-process-navigator.html "Monitoring changes with Process Navigator")


---

## pql/process/guidelines-processexplorer

# Studio App Building Guidelines - Process Explorer

The Process Explorer component uses event logs to visualize business processes. It is at the heart of process discovery and a good start into any new project. Working with the process explorer can bring users from “zero to process mining” and gives them unparalleled transparency into the process flow. While a business user may already understand how a process is mapped and works, seeing this process flow based on real event data helps them investigate potential root causes and see improvement opportunities.

- [Process Explorer layout, sections, and content](guidelines-processexplorer.html#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536790725734 "Process Explorer layout, sections, and content")
- [Process Explorer best practice](guidelines-processexplorer.html#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536790763851 "Process Explorer best practice")

An example of the Process Explorer in action can be found in any Starter Kit in the Process Cockpit view. This screenshot is from the Process Explorer tab in the Order Management Starter Kit (object-centric).

Expand all

[## Process Explorer layout, sections, and content](#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536790725734_body)

A Process Explorer View or View tab consists of 3 sections:

- [KPI section (1)](guidelines-processexplorer.html#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536811641971 "KPI section (1)")
- [Main section with Process Explorer component (2)](guidelines-processexplorer.html#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536811692077 "Main section with Process Explorer component (2)")
- [Filter bar (3)](guidelines-processexplorer.html#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536811747238 "Filter bar (3)")

|  |
| --- |
|  |

This view can then be created using a combination of Studio components:

|  |
| --- |
|  |

### KPI section (1)

On top of the View, we suggest adding a small number of core metrics. These should include the number of cases (e.g. # Sales Orders or # Sales Order items) and the total value of cases. This allows the business user to see at first glance the scope of the analysis in case they apply filters to the View.

The Process Explorer allows out of the box filtering capabilities such as “Start from activity” or “End with activity”. Applying this filter will then also influence the KPIs on top so the user could see easily what is the most common start or end activity.

**Tip**

Adding a monetary metric helps business users to understand the implications of the scope.

### Main section with Process Explorer component (2)

The Process Explorer component is the main part of this View. This component uses event logs (single or the relationship between multiple event logs if you're using an object-centric Data Model)) to visualize business processes.

The Process Explorer allows for customization options. We suggest using the “slider” configuration. The slider is easier to use for a ‘generic’ exploratory approach and therefore, would be more appropriate to be configured for the business user since they do not need a pre-defined hypothesis to get started with their analysis.

**Tip**

The KPIs in Process Explorer are calculated differently depending on the graph control (panel or slider).

We also recommend always allowing the business end user to switch between KPIs displayed in the process explorer. The event count is often a good starting point but you can decide to switch to another default KPI.

To learn more about configuring the Process Explorer component in Studio, see [Configuring Process Explorer in Views](process-explorer.html#UUID-30940e2a-faa6-42f6-6e22-5abd2c2d3413_section-idm4591619076292834289304214496 "Configuring Process Explorer in Views").

### Filter bar (3)

As in every View, you can set-up a collapsible filter bar for this View. It allows the end user to see the process under different scenarios (e.g. filtered by certain object attributes). The filter bar can be collapsed if the user is not actively using it so that they can fully focus on the process visualization and don’t lose space. The filters applied would also affect the scope KPIs on top of the View. In this way, all three sections are connected. Through the scale-to-fit set-up, all of them are visible and accessible at the same time.

More information on how to configure the filter bar, see: [Configuring a filter bar for your View](configuring-a-filter-bar-for-your-view.html "Configuring a filter bar for your View").

[## Process Explorer best practice](#UUID-38ce903d-a277-5300-261f-9838312d7c8f_section-idm234536790763851_body)

When creating your Process Explorer Views, we recommend the following:

- If you work with an object-centric Data Model, you can easily add multiple event logs to the process explorer component. Still, try not to overload your end users and ensure you are deciding on key objects to be displayed.
- You can guide your business users when it comes to choosing the right KPIs in the Process Explorer, e.g. with descriptions or info text. We recommend the median throughput time over the average throughput time since it is less prone to outliers.

We'd also discourage the following:

- Adding too many filters on the View. Instead, use the built-in collapsible filter bar instead of adding the filter components on the main grid. This allows the Process Explorer to scale to its fullest depending on the available screen size. Using the in-built filterbar also allows you to share it between tabs so setting up the filtering options is a lot easier for you as a builder.

  |  |
  | --- |
  |  |
- Using vertical KPIs. We recommend putting the scope KPIs on the top of the View so the users see at a glance at which data set they look at.

  |  |
  | --- |
  |  |


---

## pql/process/leanix---celonis-process-management-integration

# LeanIX - Celonis Process Management integration

This integration allows you to pull data from LeanIX and use it within Process Designer. You can access this integration via the [Celonis Marketplace](https://marketplace.celonis.com/store/ui/discover).

Expand all

[## Before you begin](#id640896_body)

1. Celonis modules must be configured. You can click on them and select an existing one. The first time you do this, it will create a connection.

   **Important**

   If for some reason the connection you picked is not working, just delete it from your Automatization and start over.

   The configuration parameters are:

   - Name (by default, “My CPM Auth Token connection”): Set a meaningful name
   - Base Url: It will be based on the Process Designer instance storage in this format:  https://[StorageCollection]/[Storage]
   - API Token: The token configured in the Process Designer instance storage

   **Tip**

   If you don't have a CPM Auth Token, see [Generate Admin Auth token](generate-admin-auth-token.html "Generate Admin Auth token")
2. An [outbound processor](https://help.sap.com/docs/leanix/ea/outbound-processors) must be created in the LeanIX side using the following configuration:

   ```
   {{
       "connectorType": "LeanIXToCelonis",
       "connectorId": "LeanIXToCelonis",
       "connectorVersion": "1.0.0",
       "processingDirection": "outbound",
       "processingMode": "partial",
       "scope": {
           "ids": [],
           "facetFilters": [
               {
                   "keys": [
                       "Application"
                   ],
                   "facetKey": "FactSheetTypes"
               }
           ]
       },
       "processors": [
           {
               "processorType": "outboundFactSheet",
               "processorName": "Export Apps",
               "processorDescription": "Export factsheet fields for CPM",
               "enabled": true,
               "fields": [
                   "lifecycle",
                   "name",
                   "description"
               ],
               "relations": {
                   "filter": [
                       "relApplicationTodeliveryOrg"
                   ],
                   "targetFields": [
                       "name",
                       "displayName",
                       "description",
                       "lifecycle",
                       "externalIdDeliveryOrg",
                       "category"
                   ]
               },
               "tags": {
                   "groups": [
                   "Roadmap"
                   ]
               },
               "output": [
                   {
                       "key": {
                           "expr": "content.id"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.id}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "content.type"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.type}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "name"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.name}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "updatedAt"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.updatedAt}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "description"
                       },
                       "values": [
                           {
                              "expr": "${lx.factsheet.description}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "active"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.lifecycle.active}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "phaseOut"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.lifecycle.phaseOut}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "endOfLife"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "${lx.factsheet.lifecycle.endOfLife}"
                           }
                       ]
                   },
                   {
                       "key": {
                           "expr": "link"
                       },
                       "mode": "selectFirst",
                       "values": [
                           {
                               "expr": "https://mockCompany/factsheet/Application/${lx.factsheet.id}"
                           }
                       ]
                   },
                   {
                       "key": {
                       "expr": "tags"
                       },
                       "mode": "list",
                       "values": [
                           {
                           "forEach": {
                               "elementOf": "${lx.tags}",
                               "filter": "${true}"
                           },
                           "map": [
                               {
                                   "key": "tagGroup",
                                   "value": "${integration.output.valueOfForEach.tagGroup.name}"
                               },
                               {
                                   "key": "tagName",
                                   "value": "${integration.output.valueOfForEach.name}"
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

[## Step 1: Create building blocks](#id640918_body)

**Function**

This action flow will create Building Blocks in Process Designer. It will avoid creating duplicates, so there is no danger in running this flow several times. The final result in Process Designer will look similar to this (with names going from A to Z):

**Configuration**

The first module holds the variables to configure the whole action flow. Do not change the variable names, just the values.

- BuildingBlockNamePrefix: Use this prefix when naming Building Blocks
- SystemArchitectureId: This can be obtained in Process Designer by selecting the root node and pressing Ctrl+Alt+D. In the ensuing popup, it's called “Context Key”

[## Step 2: Getting data from LeanIX](#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769609378623_body)

**Function**

This action flow will take the existing Building Blocks in Process Designer, take applications from LeanIX, put the LeanIX Applications data into structured JSON blocks that are associated with the corresponding Building Blocks, and then send these JSON blocks to a webhook.

**Important**

A data structure must be set to the module red circled (see configuration below). Ideally this action flow should be configured to run manually the first time, but with the the “FirstRun” configuration variable set to “true”. After that, the variable should be set to “false” and the action flow can be set to run as scheduled.

If the Building Block assigned to the Application cannot be found, it will try to get a request to a non existing url (http://ProcessDesignerBlockNotFound/{blockName}) that will cause an error, so the user is notified and can take corresponding actions.

**Configuration**

Before starting to configure this module, create a second browser tab. In that tab, [jump to step 3](leanix---celonis-process-management-integration.html#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769608650444 "Step 3: Send data to Process Designer") and start the webhook listening. Then come back here to continue configuring this action flow.

The first module holds the variables to configure the whole action flow. Do not change the variable names, just the values.

- lean\_ix\_token\_psw: This is the LeanIX token used to make requests to its API
- lean\_ix\_base\_url: This is the base url of the LeanIX API
- lean\_ix\_is\_test\_run: This is a parameter requested by the LeanIX API
- webhook\_url: This is the url where the data will be sent. The value is the address you copied when [configuring the webhook in step 3](leanix---celonis-process-management-integration.html#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769608650444 "Step 3: Send data to Process Designer")
- System Architecture Id: The same as in the previous action flow. It is the Id of the root node for the Building Blocks
- BuildingBlockName: The prefix used to determine in which Building Block the application will be placed. It is the same as the “BuildingBlockNamePrefix” in the previous action flow
- FirstRun: If set to “true” it will bring all the LeanIX applications. If set to “false” it will bring only the modified LeanIX applications in the latest 24 hours

The data structure needed to configure the JSON module (circled in red) can be generated as follows:

1. Select **Create data structure** and give it a name.
2. Select **Generate**. Copy the data from Appendix A to the **Sample Data** field. You will see some field references with a transparent background.
3. Click **Save** and execute the action flow.
4. Open the JSON module again. You will see the same field references, but this time with a solid background.
5. Close the popup and save the action flow.

**Note**

If you’ve run the action flow correctly, [the webhook in your other browser tab](leanix---celonis-process-management-integration.html#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769608650444 "Step 3: Send data to Process Designer") will have received data.

[## Step 3: Send data to Process Designer](#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769608650444_body)

**Function**

This action flow will:

- Take the LeanIX Application (LA) data from a webhook
- Depending on the state of LA and the matching Process Designer Applications (PDA):

  - If LA  does not match a PDA and it is not decommissioned: Create and release a PDA
  - If LA matches more than one PDA: PDA is in an unstable state. It means there is at least one PDA in “in process” state and at least one in “released” state.  It will make a POST to an inexistent url (https://sendErrorUrl) which will cause an error. In this request the content  has information of which PDA/version is in this state (\*).
  - If LA matches just one PDA:

    - If LA is decommissioned:

      - If PDA  is in “release” state: It will expire the PDA
      - If PDA is in “in process” state: It will delete the PDA
    - If LA is not decommissioned:

      - If PDA is in “release” state: It will create a new version  (PDA1), update and release PDA1 (and this will expire PDA).
      - If PDA is in “in process” state: It will update and release the PDA

**Important**

Each module that interacts with Process Designer has an error handler attached. It will retry an operation up to 3 times. If the operation still doesn't work, it will fail after the 3rd try.

**Configuration**

1. Configure the webhook:

   1. You should be configuring the webhook in a duplicated browser tab as [outlined in step 2](leanix---celonis-process-management-integration.html#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769609378623 "Step 2: Getting data from LeanIX").
   2. Select **Webhook**, click the **Create a webhook** button, give it a meaningful name, and it will start “listening”:
   3. Click the **Copy address to clipboard**  button. Go back to the tab where you have [step 2 open](leanix---celonis-process-management-integration.html#UUID-e7f13e87-bf09-d0ac-776d-53bb51ad66f8_N1769609378623 "Step 2: Getting data from LeanIX"), and finish the step. Then you can come back here and continue configuring the webhook.
2. The module “ShouldReleaseConfig” contains a variable called “shouldRelease”. This will indicate to other modules if it should be released when creating or updating a Process Designer Application (PDA). If not, the PDA will remain “in process”.

### Appendix - JSON structure to configure Step 2

```
{  "ParentId": "3e9aeb48-0e79-44ce-b2ef-362775dca693",  "IsDecomissioned": true,  "elements": [    {      "type": "system",      "related": {        "owner": [          {            "id": "1503798c-93d9-44f3-b4a0-8a0393ea2024",            "type": "authToken",            "facetName": "automation"          }        ]      },      "facetName": "it",      "attributes": {        "id": {          "127": "533e40f3-1119-4d3f-881e-2a857ed4f33c"        },        "name": {          "1031": null,          "1033": null        },        "description": {          "1031": null,          "1033": null        },        "sysProdFrom": {          "127": null        },        "sysPilotFrom": {          "127": null        },        "sysProdUntil": {          "127": null        },        "sysComplexity": {          "127": null        },        "sysPilotUntil": {          "127": null        },        "sysPlannedFrom": {          "127": null        },        "sysPhaseOutFrom": {          "127": null        },        "sysPlannedUntil": {          "127": null        },        "sysPhaseOutUntil": {          "127": null        },        "sysSwitchedOffFrom": {          "127": null        }      },      "displayNames": {        "1031": null,        "1033": null      }    }  ]}
```

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## pql/process/limit-content-in-process-navigator

# Limit content in Process Navigator

If you want to model and release a process, but don't want every employee in your organization to be able to view it, you can specify which content to hide from Process Navigator. Content limited in this way cannot be viewed in Process Navigator at all.

Sensitive content can be hidden from Process Navigator by:

1. Granting only specific groups access with the Permission setting
2. Ensuring Process Navigator does not have permission to view all content

As an Admin, you can create a few configurations together to make this happen.

**Caution**

Make sure you add your Admin user to all user groups you create, to ensure you have management control after excluding content from Process Navigator.

|  |
| --- |
|  |

Expand all

[## Activate “Permissions directly on process/object” feature](#id863435_body)

1. In Process Designer, navigate to the Admin area by clicking the gear icon in the top right-hand corner. Click the **Features** tile.
2. In the **Features** list, search for "Permissions directly on process/object" and select it from the list.

   |  |
   | --- |
   |  |
3. In the details panel, look for **Activation** and select  **Activated** from the dropdown.

   |  |
   | --- |
   |  |

[## Set Process Navigator to not have permission to view all content](#id863454_body)

1. In Process Designer, navigate to the Admin area by clicking the gear icon in the top right-hand corner. Click the **Automation** tile.
2. In the **Automation** list, look for the "data, Rest-API endpoint" group, and then inside it look for something called "RepPool”/“ReportPool”/”Reporting". Select it from the list.

   |  |
   | --- |
   |  |
3. In the details panel, look for **Permissions**, and make sure the **Permitted everywhere** field is empty.

   |  |
   | --- |
   |  |

[## Create/modify user groups who are allowed to view sensitive content](#id863473_body)

1. In Process Designer, navigate to the Admin area by clicking the gear icon in the top right-hand corner. Click the **User group** tile.
2. Create a new user group, or select an existing one. This group will contain everyone you want to show sensitive information to.
3. Select your user group from the **User group** list, then click **Permissions** in the toolbar. Select **Change permissions** from the dropdown.

   |  |
   | --- |
   |  |
4. In the **Permissions** section, make sure "Permission of other users" is set to "NoPermissions".

   |  |
   | --- |
   |  |
5. Now create a new permission rule and name it whatever you like. In this example, we've named ours "Restricted".

   |  |
   | --- |
   |  |
6. In the bottom right of the modal, use the **User groups** field to assign the user group we created in the previous steps to this permission rule. You can also assign individual users. This will prevent anyone not in the group from viewing content in Process Designer.

   |  |
   | --- |
   |  |
7. Finally, navigate back to the Admin area in Process Designer and click the **Apply new configuration** tile to save.

## Related topics

- [Configuring your Process Designer environment](getting-started-with-process-designer.html#UUID-44b23f5a-ff92-6ea5-6e21-92c792818da2_UUID-9f66c6a9-b0a5-4794-13c8-e9e05db99374 "Configuring your Process Designer environment")
- [Drilling down with Process Navigator](drilling-down-with-process-navigator.html "Drilling down with Process Navigator")
- [Roles](roles.html "Roles")


---

## pql/process/logging-in-to-celonis-process-management

# Logging in to Celonis Process Management

Access the Celonis Process Management (CPM) environment to model processes in the Designer or view published content in the Navigator using standard credentials or Single Sign-On (SSO).

Expand all

[## Before you begin](#UUID-f978c135-7491-2424-f3a1-f13fa648161b_section-id235539078482187_body)

Before logging in to CPM, you need:

- Your organization-specific CPM URL.
- Account credentials or an active corporate SSO session.

[## Accessing the platform](#UUID-f978c135-7491-2424-f3a1-f13fa648161b_section-id235539078216308_body)

To access the CPM platform:

1. Navigate to your organization's unique CPM URL.
2. Select your authentication method:

   - **Standard**: Enter your Email and Password, then click **Sign In**.
   - **SSO**: Click the Corporate Login button to authenticate via your identity provider (e.g., Azure AD or Okta).
3. If prompted, select the Designer or Navigator workspace to enter the application.

**Note**

If your organization uses automatic SAML authentication, you will bypass the login screen and land directly on your default Dashboard.

|  |
| --- |
|  |

## Related topics

- [Admin guide](celonis-process-management-administrator-guide.html "Celonis Process Management Administrator Guide")
- [Signing in to Celonis Platform](https://docs.celonis.com/en/signing-in.html)


---

