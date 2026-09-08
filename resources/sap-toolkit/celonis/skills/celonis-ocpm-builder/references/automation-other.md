# Automation: Engine, Orchestration, Skills, Triggers

## automation/action-engine/action-engine

# Action Engine

You’ve found the bottlenecks and identified the inefficiencies in your processes. Now, the Action Engine allows you to do something about them instantly. Instead of just viewing static data, you can use the Action Engine to operationalize your findings, sending proactive recommendations directly to your team so they can resolve issues the moment they arise.

In a traditional analytical setup, you might spot a problem but lose time communicating it to the right person. The Action Engine bridges that gap:

- **Proactive intervention**: You don't have to wait for someone to check a dashboard. The system detects "Signals" (like a discount about to expire) and alerts the right person immediately.
- **Reduced manual effort**: You can automate the "search" phase of work, allowing your team to focus entirely on the "resolution" phase.
- **Direct execution**: You can trigger actions—like sending an email or updating an ERP record—directly from the Celonis interface, ensuring a seamless flow from insight to results.

## Before you begin

Before you dive into configuring your first Skill, ensure you have a solid grasp of these three foundational pillars:

| Pillar | Description |
| --- | --- |
| Data Model | Ensure your underlying Data Model is refreshed and contains the attributes needed to identify your business logic. |
| User Routing | Think about who should receive which Signal. You can route tasks based on Data Model columns (like Region or Vendor) to ensure the right person gets the job. |
| Action Logic | Determine what the user should do once they receive a Signal. Will they open an SAP transaction, send an email, or simply view a popup? |

## Suggested next steps

Follow this roadmap to move from initial setup to a fully operationalized action strategy, ensuring every insight results in a measurable outcome.

- [My Inbox](my-inbox.html "My Inbox"): Navigate the business user perspective where you will manage and resolve your daily Signals.
- [Skill Configuration](action-engine---skills.html "Action Engine - Skills"): Learn how to define the triggers that create Signals from your data.
- [Routing Rules](user-routing.html "User Routing"): Set up the logic that ensures the right tasks land in the right "My Inbox."
- [Action Configuration](configuring-actions-in-the-action-engine.html "Configuring Actions in the Action Engine"): Define the specific buttons and automated steps your users will take to close a loop.

**Tip**

If you are looking for a head start, check if there are “Out of the box” Skills in the App Store that match your specific use case.


---

## automation/action-engine/action-engine-connector

# Action Engine Connector

The Action Engine Connector allows you to extract data from the Action Engine to perform usage analyses. You can extract tables such as Skills, Skill Execution, and Signals (including IDs, status, and assignees).

Expand all

[## Extracted tables](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_id_ActionEngineConnector-ExtractedTables_body)

The following tables can be extracted:

- **Skills** (Skill ID, Skill Name)
- **Skill Execution** (History of all Skill Executions)
- **Statistic** (Basic statistics e.g. #Signals created per Skill)
- **Signals** (Signal ID, Skill ID, Signal Description, Status, Assignee User ID, Creation Date, Change Date)
- **Signal Attributes** (Signal ID, Sorting, Name, Value)
- **Signal Events** (Events per Signal e.g. Event Time, From Status, To Status)

[## Before you begin](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235527336410153_body)

Before you begin the setup, ensure the following requirements are met:

- **Permissions**: You must be a Team Administrator to activate the export endpoints in the Action Engine configuration tab.
- **Regional Availability**: Endpoints must be available for your realm (currently supported: eu-1 through eu-4, us-1, and us-2).
- **Connector Activation**: The "Celonis Action Engine" must be visible as a Cloud Extractor in Data Integration. If it is not visible, contact Support to have it activated for your team URL.
- **Network**: If IP-based restrictions are in place, allowlist the standard Celonis IPs.

[## Configuring the Action Engine connector](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235527336492986_body)

You can either create a standalone Data Model or integrate Action Engine data into an existing one.

[### Option 1: Creating a standalone data model](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235528763313001_body)

To create a standalone data model:

1. Navigate to Data Integration and create a new Data Pool.
2. Create a New Data Connection:

   - Select Celonis Action Engine.
   - Set the connection type to Direct.
   - Enter an API Token (generated from your user profile).
3. Create a New Data Job and select the connection you just created.
4. Add a New Extraction and select all desired tables (Skills, Signals, etc.).
5. Execute the Data Job: Use Delta Load to preserve historical data. A "Full Load" will delete existing data and replace it with only what is currently in the Action Engine.
6. Create a New Data Model:

   - Add all extracted tables.
   - Set the Signal table as the Case table and Event as the Activity table.
   - Connect remaining tables via Signal ID and Skill ID.

[### Option 2: Integrating into an existing data model](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235528763452101_body)

To integrate into an existing data model:

1. Open your existing Data Pool and follow the steps above to create the Data Connection and Extraction. See: [Option 1: Creating a standalone data model](action-engine-connector.html#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235528763313001 "Option 1: Creating a standalone data model").
2. Create a Data Transformation to join the Action Engine data with your process data.

   Example: For a P2P process, create a table (e.g., `AE_P2P_SIGNALS`) that joins the `SIGNAL` table with your `MANDT`, `EBELN`, and `EBELP` attributes.
3. Add the transformation table to your existing Data Model.
4. Map the connection via the Case Key (e.g., Purchasing Document/Item).

Once the Data Model is loaded, you can begin building analyses to monitor Skill execution history and Signal status changes.

[## Example Procure-to-Pay transformation script](#UUID-efaf5c7c-a0d6-ba13-28ea-19944f056123_section-id235528758526466_body)

If you're working on a procure-to-pay process:

```
DROP TABLE "AE_P2P_SIGNALS";

CREATE TABLE AE_P2P_SIGNALS AS
SELECT DISTINCT
    SIGNAL.SIGNAL_ID
    ,SIGNAL.SKILL_ID
    ,SKILL.NAME
    ,SIGNAL.ASSIGNEE_USER_ID
    ,SIGNAL.DESCRIPTION
    ,ATTRIBUTE1.VALUE AS MANDT
    ,ATTRIBUTE2.VALUE AS EBELN
    ,ATTRIBUTE3.VALUE AS EBELP
        --Optional: Add further columns
FROM SIGNAL
JOIN SKILL ON
    SIGNAL.SKILL_ID = SKILL.SKILL_ID
LEFT JOIN SIGNAL_ATTRIBUTE AS ATTRIBUTE1 ON
    ATTRIBUTE1.SIGNAL_ID = SIGNAL.SIGNAL_ID
    AND ATTRIBUTE1.NAME = 'Client' --Use the exact Attribute name here as used in the Signal
LEFT JOIN SIGNAL_ATTRIBUTE AS ATTRIBUTE2 ON
    ATTRIBUTE2.SIGNAL_ID = SIGNAL.SIGNAL_ID
    AND ATTRIBUTE2.NAME = 'Purchasing Document' --Use the exact Attribute name here as used in the Signal
LEFT JOIN SIGNAL_ATTRIBUTE AS ATTRIBUTE3 ON
    ATTRIBUTE3.SIGNAL_ID = SIGNAL.SIGNAL_ID
    AND ATTRIBUTE3.NAME = 'Item' --Use the exact Attribute name here as used in the Signal
--Optional: Add further joins
WHERE
    SKILL.SKILL_ID IN ('') --Add Skill IDs here
GROUP BY
    SIGNAL.SIGNAL_ID, SIGNAL.SKILL_ID, SIGNAL.ASSIGNEE_USER_ID, SIGNAL.DESCRIPTION ,ATTRIBUTE1.VALUE
,ATTRIBUTE2.VALUE ,ATTRIBUTE3.VALUE;

SELECT * FROM "AE_P2P_SIGNALS";
```

## Related topics

- [My Inbox](my-inbox.html "My Inbox")
- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")


---

## automation/action-engine/action-engine---skills

# Action Engine - Skills

**Skills Deprecation**

Effective August 1st 2025, Skills features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Skills (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

To continue working with your process improvement and automation use cases, we suggest using our [Action Flows](action-flows.html "Action Flows in Celonis Platform"), [Views](studio-feature-availability-matrix.html "Studio feature availability matrix"), and/or [Orchestration Engine](orchestration-engine.html "Orchestration Engine") features.

A Skill is the automated logic that monitors your processes for inefficiencies. It acts as a bridge between data insights and operational action, transforming identified process gaps into manageable tasks for your business users.

Creating a Skill is more than just writing a query; it is a four-step process of identifying, routing, and automating process improvements. Understanding this lifecycle ensures that the Signals generated provide maximum value to business users.

1. **Detection (Logic)**: The lifecycle begins with Signal Configuration. You define the specific process anomaly you want to target using PQL (Process Query Language).

   - **Example**: "Identify all invoices where the 'Payment Terms' have been changed manually."
2. **Routing (Assignment)**: Once an anomaly is detected, the Action Engine must determine who is responsible for fixing it. This is handled via User Routing. You can route based on:

   - **Static Assignment**: A specific user or group.
   - **Dynamic Assignment**: Using data columns (e.g., the "Purchasing Group" column in your data model).
3. **Execution (Automation)**: A Skill becomes powerful when it offers a resolution. By adding an Action configuration, you allow the user to fix the issue directly from their Inbox.

   - **Manual Actions**: Opening a link to a specific SAP transaction.
   - **Automated Actions**: Triggering a Workflow to update a system automatically.
4. **Feedback and Optimization**: The final stage is the feedback loop. When a business user acts on a Signal in My Inbox, their feedback is captured. Analysts use this data to refine the detection logic and reduce "noise" (false positives).

## Related topics

- [Projects](projects.html "Projects")
- [User Routing](user-routing.html "User Routing")
- [My Inbox](my-inbox.html "My Inbox")


---

## automation/action-engine/celonis-action-engine-sensor

# Celonis Action Engine Sensor

The Celonis Action Engine Sensor bridges the gap between process insights and automated execution. By integrating Process Automation Skills directly into the Action Engine, you can transform manual oversight into immediate, intelligent action.

Integrating your Skills with the Action Engine is beneficial because it:

- **Closes the Loop**: Moves beyond just identifying process inefficiencies (Signals) to resolving them instantly with automated workflows.
- **Simplifies User Experience**: Business users don't need to leave the Action Engine interface to trigger complex automations; the "Action" button handles the heavy lifting.
- **Ensures Data Integrity**: The sensor automatically maps Signal attributes to Skill parameters, reducing manual data entry errors and ensuring the automation has the exact context it needs to run successfully.

Expand all

[## Before you begin](#UUID-4bc1c4bc-3a11-ec8a-1ec0-4853c9c5e58e_section-id235537763953828_body)

Before configuring the Action Engine sensor, you need:

- A published Process Automation Skill in Celonis Studio.
- Administrative or Edit access to the Action Engine configuration.

[## Triggering a Skill in the Action Engine](#UUID-4bc1c4bc-3a11-ec8a-1ec0-4853c9c5e58e_section-id235537764003551_body)

To allow users to trigger an automation directly from a Signal, follow these steps:

1. **Open Action Configuration**: Navigate to the Action Engine configuration page and select **Add Action**.
2. **Select your Skill**: Browse the available packages to find the Skill you want to trigger. Select it and provide a clear, recognizable name for the action (e.g., "Update Purchase Order" or "Send Vendor Notification").
3. **Define Automation Parameters (Optional)**: If your Skill requires specific data to execute:

   - **In Process Automation**: Ensure you have defined the mandatory input parameters required for the Skill's execution.
   - **In Action Engine**: Map these parameters to the available Signal Attributes. Use placeholders to ensure the Skill receives the correct data from the specific Signal being viewed.
4. **Save and Deploy**: Save your configuration. The Skill will now appear as a clickable action within the relevant Action Engine Signals.

**Note**

Parameters that are marked as mandatory within individual actions in your Skill will automatically be required when the Skill is triggered via the Action Engine.

## Related topics

- [Sensors](sensors.html "Sensors")
- [Celonis Smart Sensor](celonis-smart-sensor.html "Celonis Smart Sensor")
- [Triggering Skills with Webhooks](triggering-skills-with-webhooks.html "Triggering Skills with Webhooks")


---

## automation/action-engine/configuring-actions-in-the-action-engine

# Configuring Actions in the Action Engine

**Skills Deprecation**

Effective August 1st 2025, Skills features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Skills (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

To continue working with your process improvement and automation use cases, we suggest using our [Action Flows](action-flows.html "Action Flows in Celonis Platform"), [Views](studio-feature-availability-matrix.html "Studio feature availability matrix"), and/or [Orchestration Engine](orchestration-engine.html "Orchestration Engine") features.

The Actions section defines the specific operations available to a business user when they open a Signal in their My Inbox. These actions allow users to resolve issues directly within their source systems (like SAP) or gain deeper insights through Celonis Analyses.

Expand all

[## Action types](#UUID-e2d9d0c7-217a-4cd8-9f76-364383227e8e_id_Actionconfigurationoptional-Actions_body)

To set up an action, you must first select one of the following types and then use dynamic placeholders from the Signal’s result table to prefill the required data (e.g., automatically inserting an invoice number into an SAP transaction).

1. **Celonis: Execute Workflow** – Launch multi-step automated workflows directly. See: [Action - Celonis: Execute Workflow](action---celonis--execute-workflow.html "Action - Celonis: Execute Workflow")
2. **Celonis: Open Analysis** – Navigate to a specific Celonis Analysis in your cloud team for deeper investigation. See: [Action - Celonis: Open Analysis](action---celonis--open-analysis.html "Action - Celonis: Open Analysis")
3. **Email: Open Prefilled Draft** – Generate an email draft with pre-defined text to quickly contact vendors, customers, or internal teams. See: [Action - Email: Open prefilled draft](action---email--open-prefilled-draft.html "Action - Email: Open prefilled draft")
4. **Pop-up: Display Information** – Show a simple information window to the user. See: [Action - Pop-up: Display information](action---pop-up--display-information.html "Action - Pop-up: Display information")
5. **SAP: Generate Transaction** – Create a "Copy to Clipboard" SAP command prefilled with Signal parameters for use in the SAP transaction console. See: [Action - SAP: Generate transaction](action---sap--generate-transaction.html "Action - SAP: Generate transaction")
6. **SAP WebGUI: Open Prefilled Transaction** – Jump directly into a specific, prefilled transaction within the SAP WebGUI. See: [Action - SAP WebGUI: Open prefilled transaction](action---sap-webgui--open-prefilled-transaction.html "Action - SAP WebGUI: Open prefilled transaction")
7. **URL: Open Link** – Open any external web address in a new browser tab. See: [Action - URL: Open link](action---url--open-link.html "Action - URL: Open link")

**Tip**

Under the General configuration settings, you can automate status updates. For example, you can set a Signal to "In Progress" or "Snoozed" automatically as soon as the user executes an action.

[## Workflow management](#UUID-e2d9d0c7-217a-4cd8-9f76-364383227e8e_section-id235521800446754_body)

Analysts can also customize how business users interact with Signal statuses through the following workflow options:

- **Mark As Resolved**: Enable this to allow users to manually set a Signal to "Resolved." This is essential for tasks performed outside of the Action Engine that cannot be tracked automatically.
- **Delete**: Control whether a user has the permission to delete a Signal. For audit-heavy or compliance-focused use cases, it is often best to keep this disabled.

## Related topics

- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")
- [My Inbox](my-inbox.html "My Inbox")


---

## automation/action-engine/troubleshooting-action-engine

# Troubleshooting Action Engine

When working with the Action Engine, you may encounter the following:

Expand all

[## Users can not access the 'My Inbox' page. What is missing?](#UUID-ef19d8f2-fbf2-4f37-1a4c-96b5f342b1c3_body)

If users can not access the 'My Inbox' page, the corresponding permissions are missing. See User Roles for further information on how to set these permissions.

[## I get no Signals although I expected some. What should I do?](#UUID-7e6a4971-4f3f-bd9d-6e7c-b85decc8848e_body)

If your Skill does not produce any Signals, this might be due to different reasons. Therefore:

- First, check if your Skill produces any Signals at all in the Skills configuration
- Second, check if the execution was successful on the Skills overview page
- Third, check if the relevant business user is part of the respective Routing Rule determining which user should see which Signal.

[## When was the Skill executed?](#UUID-e44a1153-d59e-73bc-dc4c-5fccb79d60bf_body)

Go to the *Skills* page, then you can find the last execution date of the respective Skill in the column “Last Execution”.

[## Why is my skill not executed successfully?](#UUID-a6275e7b-f725-6858-a5bf-d853641ab143_body)

Check the following aspects:

- Are the corresponding Data Models loaded? If not, reload it.
- Does the Skill preview work? If not, check for errors in the filters or table statements.
- If you are routing the Signals [based on Data Model column](user-routing.html "User Routing"), first check if the column is chosen from the same Data model. Check the Routing Table preview.
- If this results in an error, this is might be related to the chosen Signal ID. Action Engine is trying to filter on the Signal ID of your signals. Contact the Support through the [Support portal](https://www.celopeers.com/s/support) to describe this problem.

[## The skill was executed successfully but the users still do not see any Signals.](#UUID-64a54398-c126-548a-9fc5-9170f8f56bb6_body)

- The first thing to check is if the users are part of the routing rule.
- If the user is part of the routing rule, and you are routing the Signals [based on Data Model column](user-routing.html "User Routing") check the Routing Table preview.
- If this results in an empty table, this is related to the chosen Signal ID. Action Engine is filtering on the Signal ID of your signals, which can result in problems for floating values and timestamps that actually exhibit millisecond precision as part of the Signal ID. If you can round numbers to integers and timestamps to seconds, this should solve the issues.
- If the preview looks okay, but still you are missing some Signals, this can happen if actually filtering uniquely on your signals is impossible. Try to add a unique identifier that one can filter on.

[## Why aren't my placeholders, e.g. in the detailed description replaced?](#UUID-469adc60-77c5-9e7b-d82b-7f9e32c2a1c1_body)

Check if the name of the column in the Signal configuration is still corresponding with the name of your placeholder. If not, please delete the placeholder and add it again.

[## Why can't I see Signal details?](#UUID-66277543-fb6a-ccd0-f324-11dcc4b1b924_body)

Probably the Data Model is not loaded, please check the availability of your data model.Alternatively, check if the placeholder statement is still correct. When changing Signal attributes or their data type, this might result in an error for the Filter Template.

[## Why have my Signal details changed?](#UUID-d73f7a25-23f0-a95b-17cf-dffde678853b_body)

Whenever you change the definition of your Signal ID, the Filter Template for your Details Table is automatically overwritten.

[## My Signals are reappearing after Housekeeping is supposed to have deleted them, how do I stop this?](#UUID-cb363b87-d64b-957f-d31b-b9402982d483_body)

When you allow users to use the "Mark as Resolved" and "Delete" workflow steps for Signals (which you can optionally do in the Skill settings), they can mark Signals as resolved or deleted manually. However, this only operates on a Signal's record in the Action Engine database. Housekeeping also only deletes the record for a resolved Signal from the Action Engine database.

So if a Signal has been marked as resolved or deleted by a user and then cleaned up by Housekeeping, the corresponding entry can still exist in the Data Model. When Action Engine next looks up the Data Model, it finds the entry. Then because there is no longer a Signal for it in the Action Engine database, it creates a new Signal, causing the deleted Signal to reappear.

To prevent this, add a Duration Filter to the Skill configuration that filters the Data Model by date, with a duration matching the Housekeeping setting (which defaults to 180 days). That way, the entries in the Data Model are not searched beyond the Housekeeping time limit, so they will not reappear as new entries after that time.

[## Can I execute several dependent queries on the same Data Model?](#UUID-2a1e00bc-50f5-af52-b430-a8433541b48c_body)

Yes, you can execute several dependent queries on one Data Model. The easiest way to implement this is to use the pipelining function and execute several steps.

[## How to blocklist Signals for certain attributes?](#UUID-66be627d-ad86-e5ac-46b4-52b672dd6bb5_body)

We recommend the following two-step workflow to systematically omit and exclude Signals for certain attribute constellations.

1. The business user can request the exclusion of a given attribute via the Feedback button as shown in the picture. The user should provide reasoning such that the Analyst and Skill owner can judge the validity of the request.
2. The Skill owner will receive an email with the feedback. The feedback will also be shown in the skill configuration. Having checked the request, the Skill owner can add an additional filter in the Skill definition, e.g. a Column Filter excluding certain values

[## What happens to the SKILL table when a skill is deleted from a project?](#UUID-0d6709c3-6ece-f645-f0ee-7e522c9ffef4_body)

You might notice that the skills deleted from a project are still shown on the data extracted from Action Engine using the Action Engine connector. These details can be still seen on the SKILL table.

### Problem

Suppose you delete the "test" skill from Action Engine Project.

You look at the "Skill" table from the extracted data using the Action Engine connector, and you can see a row for the deleted skill.

You won't see any errors, but the deleted skill is still shown in the Action Engine extracted data.

### Cause

This is how the DELTA extraction works with respect to Action Engine.

Once a skill has been deleted, the skill still exists in the Data Pool, but it is no longer extracted in the DELTA loads.

As we can see below, the last DELTA extraction was completed at 12:55, but this row for "test" is not extracted during this extraction which still has the date of last extraction when the skill was still available.

### Solutions

Though not really recommended, one way to delete the row also on the SKILL table is to perform a FULL load, but ”Full Load” mode will delete all existing data and replace it with newly extracted data. The data from Action Engine already cleaned by Housekeeper will not be available anymore.

The other way is to delete the data related to the skill using DELETE queries in a transformation.


---

## automation/orchestration/14--execute_orchestration_engine---oe-execute

# 14. `execute_orchestration_engine` — OE Execute

**Mode**: Custom only · **Category**: Other

Sends a signal to Orchestration Engine to start a digital process.

```
- id: execute_orchestration_engine
  unique_id: start_approval
  description: Starts the invoice approval process.
  signal_name: com.celonis.invoice.approval.start
  inputs: '{"invoice_id": "The invoice ID to approve", "approver": "Name of the approver"}'
```

Expand all

[## Config fields](#UUID-a5dfa7a5-f74d-0080-a3d9-99e4c491d04b_section-id235535956516394_body)

|  |
| --- |
|  |

Filter

- Field
- Type
- Description

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `signal_name` | string | **Required** — event type key to trigger. |
| `inputs` | string | JSON string mapping input names to descriptions. Each key becomes an LLM argument. |

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `signal_name` | string | **Required** — event type key to trigger. |
| `inputs` | string | JSON string mapping input names to descriptions. Each key becomes an LLM argument. |

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Resume Orchestration Engine tool](15--resume_orchestration_engine_execution---oe-resume.html "15. resume_orchestration_engine_execution — OE Resume")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## automation/orchestration/15--resume_orchestration_engine_execution---oe-resume

# 15. `resume_orchestration_engine_execution` — OE Resume

**Mode**: Custom only · **Category**: Other

Resumes a paused Orchestration Engine process instance.

Expand all

[## With fixed instance](#UUID-5b5588ba-e616-adca-399a-e28e9230093a_section-id235535985768678_body)

```
- id: resume_orchestration_engine_execution
  unique_id: resume_approval
  description: Resumes a specific paused approval process.
  event_type: com.celonis.invoice.approval.resume
  instance_id: my-fixed-instance-id
```

[## LLM determines instance](#UUID-5b5588ba-e616-adca-399a-e28e9230093a_section-id235535985835452_body)

```
- id: resume_orchestration_engine_execution
  unique_id: resume_approval
  description: Resumes a paused approval process.
  event_type: com.celonis.invoice.approval.resume
```

[## Config fields](#UUID-5b5588ba-e616-adca-399a-e28e9230093a_section-id235535986092471_body)

|  |
| --- |
|  |

Filter

- Field
- Type
- Description

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `event_type` | string | **Required** — event type key to trigger. |
| `instance_id` | string | Pre-set instance ID. If omitted, the LLM must supply it at runtime. |

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `event_type` | string | **Required** — event type key to trigger. |
| `instance_id` | string | Pre-set instance ID. If omitted, the LLM must supply it at runtime. |

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Get Orchestration Engine Process Contexts tool](16--get_orchestration_engine_process_contexts---oe-get-process-contexts.html "16. get_orchestration_engine_process_contexts — OE Get Process Contexts")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## automation/orchestration/16--get_orchestration_engine_process_contexts---oe-get-process-contexts

# 16. `get_orchestration_engine_process_contexts` — OE Get Process Contexts

**Mode**: Both · **Category**: Other

Lists or queries digital process instances from Orchestration Engine.

Expand all

[## Minimal](#UUID-352b5bd5-4d0f-6865-7357-13432dc62f87_section-id2355359910796_body)

```
- id: get_orchestration_engine_process_contexts
```

[## Pre-filtered](#UUID-352b5bd5-4d0f-6865-7357-13432dc62f87_section-id235535991520711_body)

```
- id: get_orchestration_engine_process_contexts
  unique_id: approval_contexts
  description: Lists approval process instances.
  digital_process_key: com.celonis.invoice.approval
```

[## Config fields](#UUID-352b5bd5-4d0f-6865-7357-13432dc62f87_section-id235535992617209_body)

|  |
| --- |
|  |

Filter

- Field
- Type
- Description

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `digital_process_key` | string | Pre-set digital process key filter. |
| `instance_id` | string | Pre-set instance ID filter. |

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `digital_process_key` | string | Pre-set digital process key filter. |
| `instance_id` | string | Pre-set instance ID filter. |

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## automation/orchestration/adding-cloud-functions-to-process-orchestration-steps

# Adding cloud functions to Process Orchestration steps

Cloud functions enable you to define and execute authenticated API calls to any external web services directly from Process Orchestrationsteps. This allows you to collect relevant data from external services and inject it back into your orchestration.

Expand all

[## Before you begin](#UUID-1d628ce1-46f9-278f-21f0-c15ff2a313a3_section-id235476689871955_body)

- To use cloud functions in Process Orchestration, you will have to establish a connection between your Process Orchestration step and a dedicated cloud server. Make sure you have your connection details handy, or check with your system admin for them. For the list of required settings, see the detailed steps below.
- Create a Process Orchestration step. See [Editing process steps](editing-start-process-step-in-process-orchestration.html "Editing process steps in Process Orchestration").

[## Adding cloud functions to process steps](#UUID-1d628ce1-46f9-278f-21f0-c15ff2a313a3_section-id235476691079481_body)

1. In the process step editor, select the **Cloud function** tab.
2. Click **Configure cloud function**.
3. Give the cloud function a name.
4. To provide the connection details, from the dropdown menu, select the **cloud provider**. Select from the following connection types:

   - **Amazon Connect** - this is a preconfigured integration for which you only need to provide your connection information. You should be able to find the following information in your AWS Management Console:

     - Connection name
     - Default region
     - Access key ID
     - Secret access key
   - **Custom** - connect to a cloud provider of your choice. Provide the following information:

     - **Connection name** - label for this connection,
     - **Base URL** - address of the cloud server:

       - Required format: `https://<your-domain>`
       - Example: `https://api.stripe.com`
     - **Authentication type** - authentication method; select one of the following and provide the necessary information:

       - **API key**

         - Location - where to attach the API key in the outgoing request.
         - Name - label that your cloud server will be looking for.
         - Value - unique password or token.
       - **OAuth 2.0**

         - Client ID - public identifier.
         - Client secret - authorization password or token.
         - Scopes - specific permissions you want your application to have when connecting to the cloud server. Check your server provider’s documentation for the exact list of scopes and their format.
         - Token URL - URL of your access token.
         - Refresh URL  - URL that allows you to get new access token without user’s interaction.
5. Define **Execution settings** using the HTTPS request builder. Enter the following values:

   - **Method** - the exaction you want to action you want to perform on a specific resource identified by a URL. The most commonly used HTTP request methods are: GET, POST, PUT, DELETE,
   - **URI** - the address of the external service you want to reach:

     - Required format: `"/your-endpoint"`
     - Example: `"/v1/charges"`
   - **Query parameters** - key-value pairs that allow you to filter or sort data.
   - **Body** (JSON format) - the data payload sent with the request.
   - **Headers** - metadata sent along with the request.
6. Select a **completion event**. Select an existing event or create a new one.

   Completion events log details about the current step to provide content to the next steps in orchestration. Subsequent steps use this data to determine when the previous step has completed so they can begin execution.

Your step is created. Continue building your process. We advise testing it before deployment. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

## Related topics

- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Adding cloud functions to Process Orchestration steps](adding-cloud-functions-to-process-orchestration-steps.html "Adding cloud functions to Process Orchestration steps")


---

## automation/orchestration/adding-conditions-to-process-orchestration-steps

# Adding conditions to Process Orchestration steps

For every step of your digital process, you can add a condition that would be used by the process context to decide whether the particular step should be processed or not. You can use existing events or custom JSON logic to determine if a step should be run or skipped.

Expand all

[## Adding conditions to Process Orchestration steps](#UUID-5dba1062-c77a-be6a-eccb-9787caf48090_section-id235378021814603_body)

1. In your Process Orchestration, edit one of the existing steps or add a new one.
2. Select **Create conditions**.
3. Select the condition you want to set for your step:

   - **Event filter** -select one or more events that will start your process step. If none occur, the step is skipped.
   - **Rule** - create a condition using a JSON logic expression. See [Rules for step conditions](adding-conditions-to-process-orchestration-steps.html#UUID-5dba1062-c77a-be6a-eccb-9787caf48090_section-id235378045061095 "Rules for step conditions").
4. Click **Submit**.

   The condition is added to the process step.

[### Rules for step conditions](#UUID-5dba1062-c77a-be6a-eccb-9787caf48090_section-id235378045061095_body)

To create step conditions rules, use the JSON logic expression language and extend it with custom operators. The JSON logic expressions are a direct expression placed in the field.

Customer operators:

- `context` - this is used to access a dynamic value inside the process context in a way similar to the **`var`** operator. If access to a dotted key is needed, the dotted key should be quoted with backquotes ( ` ).

  - `Logic`

    `` {"context": "`key.with.dots`.boolean"} ``
  - `Process Context`

    `{"key.with.dots": {"boolean": true}}`
  - `Results`

    `true`
- Extended behavior:

  - `var` - Inside a digital process, the data means the context with the parent key. For example, if the process context is:

    `{"event": {"key": "value"}}`

    Then, the data for the JSON logic expression would be:

    `{"context": {"event": {"key": "value"}}}`

    Dotted keys must be backquoted to work.
  - `Logic`

    `` {"var": "context.`key.with.dots`.boolean"} ``
  - `Process Context`

    `{"key.with.dots": {"boolean": true}}`
  - `Result`

    `true`

## Related topics

- [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview")
- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")


---

## automation/orchestration/adding-events-to-process-orchestration

# Adding events to Process Orchestration

Events in Process Orchestration specify when something happens in your process; they act as signals for when a process should start or advance to the next stage; they’re triggered by specific activities or conditions, for example, missing purchase order confirmation, or a predefined schedule. They can come from Celonis or from outside.

Events carry the essential process context data needed to execute subsequent steps. When a given action for a step is finished, for instance, an Action Flow is executed, information from that execution is fed back to the Process Orchestration to push the process forward.

There are two main subtypes of events:

- **Triggered Events** – start or progress an orchestration when something happens. For example, a user clicks a button, email is sent, or vendor feedback is received.
- **Timer Events** – Start or progress an orchestration based on time. For example, run daily, or resume process after three days with no response.

Expand all

[## Adding triggered events to Process Orchestration](#UUID-e5167521-ffbc-cdc4-d204-d787a57a297e_UUID-be8eb88c-888f-7293-cc98-d31bf104123e_body)

Trigger events act as the starting point for executing an orchestration. They're typically fed by insight from an Action Flow or sent through authenticated webhooks from external systems when a specific action occurs, such as a missing PO confirmation

### Adding triggered events

1. In **Studio**, go to your package and select your **Process Orchestration**.
2. Select the **Start process step** and from the side panel, click **Add event**.
3. In the Start Step editor, click **Add event**.
4. Give your event a name (**key**) and a description (**label**) for easy identification in the event list.
5. (optional) Toggle **Link asset** to add extra assets that will be used as triggers for Process Orchestration.

   These assets can only be used to start Process Orchestration. Each asset type can be linked to the event you're creating right now but also to already existing events on the list. See also, [Starting Orchestration Engine using Annotation Builder](starting-process-orchestration.html#UUID-e6f4b0bc-7b37-65db-e1c3-b013e0d61105_section-id235453961760942 "Starting Orchestration Engine using Annotation Builder").
6. Click **Save**.

   The event is created and added to the process step.

[## Adding timer events to Process Orchestration](#UUID-e5167521-ffbc-cdc4-d204-d787a57a297e_UUID-b3062b33-d200-bbf5-ede8-8f11335983ca_body)

Time events serve as a flexible mechanism to schedule and control executions of Process Orchestration. They support a variety of trigger configurations to manage diverse timing and scheduling requirements. Timer events can work both as starting triggers, when they initialize a Process Orchestration, and as the wake-up triggers placed between process steps.

1. In Studio, go to your package and select Process Orchestration. If you haven't created any Process Orchestration yet, see [Creating Process Orchestration](https://docs.celonis.com/en/creating-process-orchestration-.html).
2. Under a process step, click the plus icon and select **Resume process**.
3. (optional) Define specific conditions for running this step. Click **Create conditions**. For more information, see [Conditional Process Orchestration run](https://docs.google.com/document/u/1/d/1M40Lb0nSVTEx95yMwYxvyYvJafAGmySw5ukSQ_fpAjw/edit?tab=t.0).
4. Go to the **Timer event tab**.
5. Select how you want the process to be resumed:

   - **Using context variable**

     Use the variable stored in the Action Flow [Process Context](process-context.html "Adding process context to Process Orchestration") as information about when your Process Orchestration should be resumed.

     The variable must be configured in the following format:

     ```
     .sleeping_until.until
     ```

     where the wake-up trigger is the `until` property in the `.sleeping_until event`.
   - **One time only**

     - Select the date and time when the event should be resumed.
   - **On a repeating schedule**

     - Define recurring schedules using precise timing rules, such as every Tuesday, every 30 minutes or every month at a specified time.

## Related topics

- [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview")
- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")


---

## automation/orchestration/adding-process-copilot-to-process-orchestration-steps

# Adding Process Copilot to Process Orchestration steps

You can use Process Copilot capabilities directly in Process Orchestration steps. Process Copilot is a Studio asset that allows you to interact conversationally with your Celonis data: asking questions, building graphs, looking for insights, or viewing process flows. You can analyze your data by asking natural language questions or using the predefined prompts to get your response in a variety of formats.

For more information, see [Process Copilots](process-copilot.html "Process Copilots").

Expand all

[## Before you begin](#UUID-f5f9d448-ba70-edf8-6f10-61356d70e4bd_section-id235475257549691_body)

- Add and publish a Process Copilot in your Studio package. See [Creating Process Copilots](create-process-copilots.html "Creating Process Copilots")[Creating Process Copilots](create-process-copilots.html "Creating Process Copilots").
- Create a Process Orchestration step. See [Editing process steps](editing-start-process-step-in-process-orchestration.html "Editing process steps in Process Orchestration").

[## Adding Process Copilot to a process step](#UUID-f5f9d448-ba70-edf8-6f10-61356d70e4bd_section-id235475273716965_body)

1. In the process step editor, select the **AI Agent** tab.
2. From the list of available agents, select your Process Copilot instance.
3. Click **Next**.
4. Give your Process Copilot step a name.
5. In the **Message** field, enter the text of the message you want to send to Process Copilot you previously selected.

   - The text in the message field needs to be enclosed in double quotes.
   - You can use variables in the message. Use the ‘+’ symbol to connect the variable to the string text.
   - If you’ve never tested this Process Orchestration instance, you may not see variables yet. Variables appear after the first test run.
6. Select a **completion event**. Select an existing event or create a new one.

   Completion events log details about the current step to provide content to next steps. Subsequent steps use this data to determine when the previous step has completed so they can begin execution.
7. Click **Save**.

You’ve added a Process Copilot to your Process Orchestration step. We recommend testing your Process Orchestration after this change. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

## Related topics

- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Adding cloud functions to Process Orchestration steps](adding-cloud-functions-to-process-orchestration-steps.html "Adding cloud functions to Process Orchestration steps")


---

## automation/orchestration/creating-orchestration-engine-overview

# Creating Orchestration Engine overview

Celonis Orchestration Engine is a process orchestration capability in Celonis Platform that allows you to design and manage end-to-end sequence of your business process. Within the platform itself, Orchestration Engine has a corresponding asset called Process Orchestration. Process Orchestration is where you build and manage your process. This asset can be added to any of your Studio packages.

This page give you an overview of how to create and set up your first Process Orchestration.

Expand all

[## 1. Configure authentication](#UUID-267d8024-9b26-d73f-fcde-054b75732953_section-id235469770906535_body)

1. **Create an OAuth client**  with the necessary scopes. For step-by-step instructions on how to add a new OAuth client to Celonis Platform, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform"). The minimum required scopes for the Orchestration Engine are:

   - *orchestration-engine*
   - *studio* (knowledge-models:query, knowledge-models.augmented-attributes:update, studio, triggers:manage).
2. **Give your new client package permissions**. In Studio, find the listing for the relevant package within the relevant space and click the associated three dots on the far right to open up the Permissions associated with the package.

   Search for the name of your OAuth client as a user, and in the Template column, select "All Permissions" and save.

[## 2. Create Studio asset](#UUID-267d8024-9b26-d73f-fcde-054b75732953_section-id235469782484395_body)

1. In your Studio package, select **New asset** > **Process Orchestration**.

   |  |
   | --- |
   |  |
2. Give your Process Orchestation a name and click **Create**.

   Process Orchestration opens in edit mode. It already has the Process Start step created for you.

[## 3. Define triggers and process steps](#UUID-267d8024-9b26-d73f-fcde-054b75732953_section-id235469785159604_body)

1. Edit the Process Start step by adding an event. This will be a trigger for your orchestration.

   1. From the side panel, click **Add event**.
   2. Select from already available events or create a new one. For more information, see [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration").
2. Add **Process steps** (using the "+" icon), where you can add an **Action**, like an Action Flow or an AI Agent, and define conditions.

   1. Below the Process start, click the “+” icon, and select **Process step**.
   2. From the side panel, select **Add Action**.
   3. Define conditions for the step activation. Click **Create conditions**. See [Adding conditions to Process Orchestration steps](adding-conditions-to-process-orchestration-steps.html "Adding conditions to Process Orchestration steps").
   4. Select a type of action you want to be taken in this step. Click one of the available tabs: Action Flow, Cloud function, or AI Agents. For more information, see [Editing process steps](editing-start-process-step-in-process-orchestration.html "Editing process steps in Process Orchestration").
   5. Click **Next**.

      You can add as many steps as needed for your business scenario.
3. You can also add a Process resume step with an event to unpause a process:

   1. Below the previous process step, click the “+” icon, and select **Process resume**.
   2. From the side panel, select **Add event**.
4. When your process is set up, click **Deploy** to activate it.

   We recommend testing Process Orchestration before deployment. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

   Your Process Orchestration is now operational.

[## 4. Publish and test](#UUID-267d8024-9b26-d73f-fcde-054b75732953_section-id235469786495978_body)

Once your flow is visually mapped out, save and deploy the process orchestration asset. You can then use the built-in **Test** button to supply a sample JSON data payload and verify that your end-to-end process runs correctly. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

[## Example](#UUID-267d8024-9b26-d73f-fcde-054b75732953_section-id235469972516152_body)

Now, let's apply this knowledge to a real-life example to illustrate how Orchestration Engine strings together automated system checks, external human interactions, and ERP write-backs. Here is how you would apply the setup steps to a case like **Missing Vendor Purchase Order (PO) Confirmations**:

1. **Configure authentication**: First, you set up an OAuth Client in your environment so your underlying Action Flows have the necessary permissions to securely query your Celonis data model for unconfirmed POs and eventually write data back to your ERP.
2. **Create the Asset**: In your Studio package, you create a new Process Orchestration asset and name it "PO Confirmation Triage":

   1. In a Start Step,you add a **Start Event** (webhook) that triggers when Celonis intelligence detects a PO is unconfirmed 7 days before delivery
   2. You add a **Process Step** linked to an Action Flow that generates a pre-populated [Form](forms-in-orchestration-engine.html "Forms in Orchestration Engine") and emails it to the supplier.
   3. You add a **Resume Event** that pauses the workflow until the "Supplier Form Submitted" signal is received.
   4. You add a final **Process Step** linked to another Action Flow that extracts the supplier's confirmed delivery date from the Process Context and automatically updates SAP
3. **Publish and test**: You save, and deploy the orchestration, then run a test using a test PO payload to ensure the email sends, the form captures the data, and the SAP write-back succeeds

## Related topics

- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Editing process steps](editing-start-process-step-in-process-orchestration.html "Editing process steps in Process Orchestration")
- [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration")


---

## automation/orchestration/editing-start-process-step-in-process-orchestration

# Editing process steps in Process Orchestration

Process steps in Process Orchestration are actual actions performed in the orchestration workflow. Your Process Orchestration can consist of multiple steps, and each step can be built of multiple Action Flows.

Expand all

[## Editing process steps in Process Orchestration](#UUID-23ffaf33-03f6-1a05-046b-8a0ee2042e3d_section-id235440625509925_body)

1. In Studio, go to your package and select your Process Orchestration.
2. Under a start/resume process or another step, click the plus icon and select **Process step**.
3. From the right-hand side panel, select **Add action**.
4. (optional) Define specific conditions that must be met for this step to run. Click **Create conditions**. See [Adding conditions to steps](adding-conditions-to-process-orchestration-steps.html "Adding conditions to Process Orchestration steps").
5. From the step editor, select the action type that will be performed in this step. Select one of the following:

   - [Action Flow](action-flows-in-process-orchestration.html "Action Flow modules in Process Orchestration")
   - [Cloud function](adding-cloud-functions-to-process-orchestration-steps.html "Adding cloud functions to Process Orchestration steps")
   - [AI Agents](adding-process-copilot-to-process-orchestration-steps.html "Adding Process Copilot to Process Orchestration steps")

## Related topics

- [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview")
- [Actions](actions-in-celonis-platform.html "Actions in Celonis Platform")
- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")


---

## automation/orchestration/forms-in-orchestration-engine

# Forms in Orchestration Engine

Orchestration Engine allows you to build highly customizable digital forms that render in the browser. Forms are available as an Asset type in Studio. Currently, in Orchestration Engine, you can:

- see all the forms that were created in your team
- create a new form
- duplicate a form
- remove a form.

|  |
| --- |
|  |

Forms in Orchestration Engine are built using third-party technology from [form.io](https://help.form.io/). For detailed information about forms, we recommend visiting form.io’s documentation. Here are some links that might get you started:

- [Component settings](https://help.form.io/userguide/form-building/form-components/component-settings)
- [Logic & conditions](https://help.form.io/userguide/form-building/logic-and-conditions)

## Before you begin

To start working with the forms builder, you should get familiar with the basic features and the components that are used there. To learn about the solution, see the [Form Building documentation](https://help.form.io/userguide/form-building).

Expand all

[## Creating forms in Orchestration Engine](#UUID-1ce091db-3874-9710-b3ea-57f2d81555df_section-idm23494100522437_body)

To create a new form:

1. In Studio, go to your package.
2. Click **Create Asset** and select Form.
3. Give your form a name.
4. Choose the components that you want to have in the form. You can select from the [basic](https://help.form.io/userguide/form-building/form-components), [advanced](https://help.form.io/userguide/form-building/advanced-components), [layout](https://help.form.io/userguide/form-building/layout-components), and [data](https://help.form.io/userguide/form-building/data-components) components. Add the components by using the drag and drop feature, which allows for putting the components at any place, before or after other components.

   |  |
   | --- |
   |  |

   For every component that you add, there's a detailed view with the configuration settings for this specific field in the form. You can customize your component with different values, data or conditions.

   For more details, see the [Component Settings](https://help.form.io/userguide/form-building/component-settings) documentation.

   |  |
   | --- |
   |  |
5. To preview the form after you've added all the components, exit the edit mode

   |  |
   | --- |
   |  |
6. Click **Save Form**.

   **Tip**

   The submit button is added to your forms automatically.

[## Editing forms](#UUID-1ce091db-3874-9710-b3ea-57f2d81555df_section-idm234941010628556_body)

To edit an existing form, click on it in the forms list. The edit mode is opened straight away and you can apply your changes.

If you want to reorder or edit the selected components, you use the inline components settings and adjust the component to your needs.

[## Duplicating forms](#UUID-1ce091db-3874-9710-b3ea-57f2d81555df_section-idm234941012793154_body)

To duplicate an existing form, click the three dots next to the Form in the package asset list and click **Duplicate**.

Duplicated forms are added to the package asset list and displayed with the suffix "copy" in the form's name. You can then rename them.

|  |
| --- |
|  |

[## Deleting forms](#UUID-1ce091db-3874-9710-b3ea-57f2d81555df_section-idm234941014250763_body)

To delete a form, click on the three dots in the package asset list and click **Delete**. The asset will remain in the “recently deleted” section of the package settings for a period of seven days.

## Related topics

- [Sharing forms](sharing-forms-in-orchestration-engine.html "Sharing forms in Orchestration Engine")
- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Localizing forms](localizing-forms.html "Localizing forms")


---

## automation/orchestration/orchestration-engine

# Orchestration Engine

Celonis Orchestration Engine is a process orchestration capability in Celonis Platform designed to create, coordinate, and run end-to-end business processes. These business processes may originate from different sources, like systems, applications, AI agents, bots, and human users. Orchestration Engine allows you to coordinate data from all of these seemingly unconnected resources in an easy-to-manage and easy-to-control process workflow.

## How Orchestration Engine works

Orchestration Engine is the name of the process orchestration capability in Celonis Platform. Within the platform itself, Orchestration Engine has a corresponding asset called Process Orchestration. Process Orchestration is where you build and manage your process. This asset can be added to any of your Studio packages.

On a high level, each Process Orchestration consists of **[events](orchestration-engine.html#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459905819833 "Events")** that contain information about actions that are supposed to happen in your process, and **[process steps](orchestration-engine.html#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459910345448 "Steps")** that order these actions in sequence. Information about the state of Process Orchestration is stored in [**Process Content**](orchestration-engine.html#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459923385498 "Process context"), which functions as the memory of the orchestration, using a JSON object to store and pass vital data payload information throughout the entire workflow.

To incorporate manual decision-making, **[Forms](orchestration-engine.html#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235461453411189 "Forms")** enable essential human-in-the-loop interactions by capturing structured input, feedback, or approvals from internal and external users to dynamically guide the next automated steps

Expand all

[### Events](#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459905819833_body)

Events specify when something happens in your process; they act as signals for when a process should start or advance to the next stage; they’re triggered by specific activities or conditions, for example, missing purchase order confirmation, or a predefined schedule. They can come from Celonis or from outside.

Events carry the essential process context data needed to execute subsequent steps. When a given action for a step is finished, for instance, an Action Flow is executed, information from that execution is fed back to the Process Orchestration to push the process forward.

There are two main types of events:

- **Triggered Events** – start or progress an orchestration when something happens. For example, a user clicks a button, email is sent, or vendor feedback is received.
- **Timer Events** – Start or progress an orchestration based on time. For example, run daily, or resume process after three days with no response.

[### Steps](#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459910345448_body)

Steps are fundamental building blocks of Process Orchestration. They define what work happens within an orchestrated process. Process steps represent individual actions or tasks that happen in a user-defined sequence to achieve a desired goal. Process steps are containers for events and actions.

Depending on their role and position in Process Orchestration, we distinguish the following types of process steps:

- Start process step - the starting point of each orchestration process. It’s a trigger event that serves as an entry point to process orchestration.
- Resume process step - it’s a step used to resume a paused process.
- Process step - an action that takes place in an orchestration.

[### Process context](#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235459923385498_body)

The process context is a JSON object that holds all external information and data flowing into or out of a specific Process Orchestration execution instance.

In practice, the process context continuously captures, stores, and passes the necessary data payloads between various events, forms, and automated steps, ensuring your end-to-end business processes execute smoothly based on real-time information. For more information, see [Adding process context to Process Orchestration](process-context.html "Adding process context to Process Orchestration").

[### Forms](#UUID-8c91dba6-5efa-5f14-9507-0a2b228ce929_section-id235461453411189_body)

Orchestration Engine Forms are interactive UI elements designed to collect structured input from individuals, bridging the gap between automated tasks and manual intervention. They are typically embedded within a Process Step of an orchestration, and their submission triggers the process to advance to its next stage. For more information on how to start creating your Forms, see [Forms in Orchestration Engine](forms-in-orchestration-engine.html "Forms in Orchestration Engine").

## Popular use cases for Orchestration Engine

Orchestration Engine use cases can vary from business to business. To get you started, here are a few examples of how orchestration can be used in your organization:

- **Missing purchase order confirmation**: Send a pre-populated Form to a supplier for confirmation and; feedback on delivery details for a PO, which the Orchestration Engine then writes back to the ERP
- **Advertising spend**: Controlling marketing spend by automatically suspending or reactivating ad campaigns based on real-time inventory levels and fluctuating demand.
- **Next best option**: Recommending alternative products from suppliers or drop-ship vendors with better on-time delivery (OTD) performance to prevent backorders and accelerate revenue
- **Risk management**: Proactively managing fulfillment and credit risk by automatically putting orders from risky customers on hold or alerting teams to delayed procurement orders

## Related topics

- [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview")
- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")


---

## automation/orchestration/orchestration-engine-known-issues

# Orchestration Engine known issues

We've gathered resources and troubleshooting tips to help you resolve problems you might encounter when working with Orchestration Engine.

Expand all

[## I'm seeing a sudden spike in my Orchestration Engine instances](#UUID-f3707a1d-cef4-645f-e30f-7d0f70aba295_section-id235547391163361_body)

One of the main sources of a sudden spike in Orchestration Engine instances is an existing process loop created in your Process Orchestration. A loop typically occurs when an Action Flow that contains the Start New Orchestration module is used to initiate a process and is then subsequently referenced as a step within that same process, creating a recursive execution cycle.

### Solution

To resolve a looped setup, you must break the Action Flow into separate automations: one that contains the Start New Orchestration module and another one that contains modules relevant to a given Process Orchestration Step. Make sure that the Action Flow that contains the Start Orchestration module is not used in the Process Orchestration step.

[## My Process Orchestration stops after completing a step and continues only upon manual re-run](#UUID-f3707a1d-cef4-645f-e30f-7d0f70aba295_section-id235550898949581_body)

The situation in which your Process Orchestration stops after completing a step and continues only when you click re-run might occur when a process step and a resume step are put one after another in your orchestration and they both are configured to monitor the same event. In this setup, both steps wait to consume the same signal from the orchestration. Once it's received by the process step, the resume step doesn't have anything to consume, which pauses the process.

### Solution

To resolve this setup, remove the resume step from your Process Orchestration and run the process again. We recommend testing your setup after making any changes. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").


---

## automation/orchestration/sharing-forms-in-orchestration-engine

# Sharing forms in Orchestration Engine

Easily share your Orchestration Engine forms with external users. Follow these steps to create public links via Action Flows, ensuring your forms reach the right audience at the right time.

## Sharing forms in Orchestration Engine

To share you forms in Orchestration Engine:

1. Go to the Studio package where your Process Orchestration is located.
2. Add new Action Flow.
3. In the Action Flow, add the **Create a Public Form Link module**.
4. Configure the module:

   1. Create, or select the connection you want to use for this action.
   2. Give the module a name.
   3. Set the expiration date for the link.
   4. Select forms for which you want to generate the link.
5. Click **Save**.
6. Publish the automation and run the Action Flow.

   The output of your Action Flow execution contains the URL to the forms you selected.

## Related topics

- [Adding Actions to Studio components](adding-actions-to-studio-components.html "Adding Actions to Studio components")
- [Action Engine](action-engine.html "Action Engine")


---

## automation/orchestration/starting-process-orchestration

# Starting Process Orchestration

A Process Orchestration sequence begins with Start process step. These steps are activated by a defined event, which acts as the trigger for the subsequent steps. You can initiate a Process Orchestration in Celonis through several distinct methods, depending on whether you need a manual, automated, or time-based trigger.

Expand all

[## Starting Orchestration Engine using Action Flow](#UUID-e6f4b0bc-7b37-65db-e1c3-b013e0d61105_section-id235501158050542_body)

To start a Process Orchestration using an Action Flow, you must use the **Start New Orchestration** module. This module generates a unique instance ID that can be used to initialize the **Start a Process** event in your Process Orchestration.

Once created, you can use this Action Flow as a bridge between a manual action in a Celonis View and the Process Orchestration asset. For instance, you can create an Action button in your View, which will trigger a new Process Orchestration through a dedicated Action Flow.

**Note**

The Start New Orchestration module must be set up in a separate Action Flow, not as an embedded process step within the Process Orchestration itself.

### Before you begin

To start the orchestration, the Start New Orchestration module needs a Process Orchestration event that it can reference. If you don't have a Process Orchestration event yet, create one. See [Adding events to Process Orchestration](adding-events-to-process-orchestration.html "Adding events to Process Orchestration").

### Building your Start New Orchestration Action Flow

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking **New asset** > **Action Flow**.
2. Give your Action Flow a name and set its scheduling.
3. In the Action Flow editor, click **Add module** and from the list select **Start New Orchestration**.
4. Configure the module:

   1. Select your pre-configured Orchestration Engine OAuth connection.

      If there are no existing OAuth connections:

      - **Create an OAuth client**  with the necessary scopes. For step-by-step instructions on how to add a new OAuth client to Celonis Platform, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform"). The minimum required scopes for the Orchestration Engine are:

        - *orchestration-engine*
        - *studio* (knowledge-models:query, knowledge-models.augmented-attributes:update, studio, triggers:manage).
      - **Give your new client package permissions**. In Studio, find the listing for the relevant package within the relevant space and click the associated three dots on the far right to open up the Permissions associated with the package.

        Search for the name of your OAuth client as a user, and in the Template column, select "All Permissions" and save.
   2. Select the **Start a Process event** that will serve as the designated trigger for your orchestration.

      If there are no events available, create one. See [Adding events to Process Orchestration](adding-events-to-process-orchestration.html "Adding events to Process Orchestration").
   3. In the Start New Orchestration module editor, define a subject to easily identify the specific event instance in the user interface.
   4. (optional) Select **Map as JSON String** and input a structured JSON payload to pass the necessary data variables into the Orchestration Engine.
5. **Save** your Action Flow.
6. Version and deploy the package with the Action Flow. See [Versioning and deploying packages](version-deploy.html "Versioning and deploying packages").
7. Switch the Action Flow to **active**.

Your Start New Orchestration Action Flow is set up and ready to use. Now you must decide how you want the Action Flow to be triggered. We recommend doing one of the two:

- Manually trigger the Process Orchestration from a frontend dashboard, for example, through an Action Button in a table. See [Adding Actions to Studio components](adding-actions-to-studio-components.html "Adding Actions to Studio components").
- Automatically start the Process Orchestration based on a schedule or trigger (e.g. through a webhook trigger based on a record being updated in your data)

[## Starting Orchestration Engine using Annotation Builder](#UUID-e6f4b0bc-7b37-65db-e1c3-b013e0d61105_section-id235453961760942_body)

1. In **Studio**, go to your package and select your **Process Orchestration**.
2. Select the Start process step and from the side panel, click **Add event**.
3. Select an event in one of the following ways:

   - Select an event from the list.
   - Add a new event. Click Create event.

     1. Give your event a name (key) and a description (label) for easy identification in the event list.
     2. Toggle Link asset to add extra assets that will be used as triggers for Process Orchestration.

        These assets can only be used to start Process Orchestration. Each asset type can be linked to the event you're creating right now but also to already existing events on the list.

        From the dropdown list, select your asset. You can select from the following asset types:

        - [Annotation Builder](annotations-agent.html "Annotation Builder") - this AI-enhanced Studio asset processes your data and generates informed guidelines based on your specific instructions. You can use the Annotation Builder logic as a starting point for your new automations. This can be helpful with, for example, dynamically routing workflows and automatically triggering correct further actions.
     3. (optional) Add a schedule based on which this step is going to be run. See [Adding timer events to Process Orchestration](adding-events-to-process-orchestration.html#UUID-e5167521-ffbc-cdc4-d204-d787a57a297e_UUID-b3062b33-d200-bbf5-ede8-8f11335983ca "Adding timer events to Process Orchestration").
     4. Click **Create**.

     Your event is created and available in all Process Orchestrations in the package. Once you're satisfied with your Process Orchestration setup, you can test it to see its outcome and logs. To do so, in the edit mode for your Process Orchestration, select **Test** at the top.

## Related topics

- [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview")
- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")


---

## automation/orchestration/testing-process-orchestration

# Testing Process Orchestration

Testing your Process Orchestration allows you to simulate the end-to-end orchestration workflow before deploying it to production. You can run a test orchestration directly from the process orchestration builder by providing a test JSON payload to it.

Expand all

[## Testing Process Orchestration](#UUID-35062098-a74a-7b62-5c31-d370ae337aa6_section-id235478332941475_body)

1. In your Process Orchestration builder, toggle the **Test** button at the top.
2. Click **Start a new test**.
3. In the Test process screen, supply a sample JSON payload, like a dummy purchase order number or instance data, to stimulate the data coming from the trigger event.
4. Click **Run**.

Your JSON payload is fed into the orchestration and goes through all of its steps. Check the test panel for the outcome of your testing and the status of your orchestration. Here, you can review the event logs to examine the executed action. For subsequent process steps, you can inspect the detailed input, output, and completion event logs.

## Related topics

- [Starting Process Orchestration](starting-process-orchestration.html "Starting Process Orchestration")
- [Troubleshooting Action Flows in Orchestration Engine](troubleshooting-action-flows-in-orchestration-engine.html "Troubleshooting Action Flows in Orchestration Engine")


---

## automation/skills/actions--skills-

# Actions (Skills)

Actions (formerly known as Skills) are the bridge between discovering a process inefficiency in Celonis and actually fixing it in your source systems.Whether you want to automatically update a block in SAP, send a pre-formatted email to a vendor, or create a Jira ticket from a dashboard, Actions allow you to build these workflows without writing any code.

To go from a blank slate to a fully deployed automation, you will generally follow this four-step process:

## Step 1: Connecting your source system

Before Celonis can make changes in your external applications (like Salesforce, Coupa, or ServiceNow), you need to establish a secure connection. This gives Celonis the necessary authentication and permissions to push updates.

To learn how to set this up: [Setting up connections](setting-up-connections.html "Setting up connections").

## Step 2: Building the Action Logic

Once connected, you need to define exactly what happens when the Action is triggered. You can build this step-by-step using our visual builder, or you can skip the setup entirely by using pre-packaged logic.

To learn how to build the Action logic, see: [Building the Action logic](building-the-action-logic.html "Building the Action logic")

## Step 3: Deploying and triggering

An Action does nothing until it is triggered. You can decide exactly how and when your automation runs:

- **Manual Execution**: Embed your Action as a button directly into your Studio Views so business users can trigger it while analyzing data.
- **Automatic Execution**: Set up data-driven triggers so the Action fires automatically in the background whenever specific conditions are met.

To learn how to deploy and trigger actions, see: [Deploying and trigger an Action](deploying-and-trigger-an-action.html "Deploying and trigger an Action")

## Step 4: Monitoring executions

Once your Action is live, you can track its performance, audit who triggered it, and troubleshoot any failed runs to ensure your automations remain reliable.

To learn how to monitor executions, see: [Monitoring and managing Actions](monitoring-and-managing-actions.html "Monitoring and managing Actions")


---

## automation/skills/configuring-signals-and-skills

# Configuring Signals and Skills

Configure Signals to automatically detect process inefficiencies and route them to the right stakeholders. This topic covers defining data models, setting filtering logic to identify incidents, and establishing unique Signal IDs to prevent duplicate tasks.

Expand all

[## Before you begin](#UUID-9fc70642-2824-1625-8822-c6b6889939f8_section-id235513542017386_body)

To configure Signals, you must have **Manage Skill** permissions. Business users only require **My Inbox** permissions to view them.

[## Step 1: Data Model and Result Table](#UUID-9fc70642-2824-1625-8822-c6b6889939f8_step-1-data-and-results_body)

The Result Table is the foundation of your Signal. It determines what data is extracted and how that information is presented to the business user in My Inbox.

1. **Choose your skill type**: Decide whether your use case requires a single data source or a cross-process view:

   - **One-step Skills (Standard)**: Executes a single PQL query against one Data Model.

     - **Best for**: Simple alerts where all necessary information exists in one place (e.g., "Overdue Invoices" or "Missing Delivery Dates").
   - **Multiple-step Skills (Cross-Process)**: Acts as a data pipeline, linking multiple Data Models sequentially.

     - **The "Inner Join" Effect**: A Signal is only created if a match exists in the subsequent step. If an ID from Step A isn't found in Step B, no task is triggered.

       - **Best for**: Linking disparate processes, such as identifying how a delay in Procurement (Model A) is impacting a specific Sales Order (Model B).
2. **Configure the result table view**: This is where you define the "Columns" the end-user will see.

   - **Context is King**: Include columns that help a user take action without leaving the inbox (e.g., Vendor Name, Total Value, and Days Overdue).
   - **PQL Power**: Use `Ctrl + Space` in the column editor to create custom PQL expressions (e.g., calculating the margin or formatting a date).
   - **Hide Technical Noise**: Use the Visibility Toggle (eye icon) to include technical IDs required for routing or logic while keeping them hidden from the user's view to prevent clutter.
3. **Sorting and limits**:

   - **Prioritization**: Define sorting logic (e.g., Due Date ASC) so the most urgent tasks appear at the top of the user's list.
   - **Volume Control**: By default, results are limited to 50 items per execution to maintain performance. Adjust this in the Sorting tab if your process requires higher volume.

[## Step 2: Defining Logic (Filtering)](#UUID-9fc70642-2824-1625-8822-c6b6889939f8_step-2-logic-and-filtering_body)

Efficiency in the Action Engine depends on where you apply your filters. To ensure your Skills run quickly and only trigger meaningful incidents, you must distinguish between filtering the dataset and defining the business incident.

Filter

- Filter type
- Purpose
- Use case
- Impact

| Filter type | Purpose | Use case | Impact |
| --- | --- | --- | --- |
| Data Model Filter | Restricts the overall scope of data before the Skill processes anything. | Limiting data to specific Company Codes, Regions, or Document Types. | **High Performance**: Prevents the system from scanning millions of irrelevant rows. |
| Result Table Filter | Defines the actual "Incident" logic based on your table columns. | Triggering a signal only when `Days Overdue > 10` or `Invoice Status = 'Blocked'`. | **Task Accuracy**: Decides exactly which rows become actionable tasks in a user's Inbox. |

| Filter type | Purpose | Use case | Impact |
| --- | --- | --- | --- |
| Data Model Filter | Restricts the overall scope of data before the Skill processes anything. | Limiting data to specific Company Codes, Regions, or Document Types. | **High Performance**: Prevents the system from scanning millions of irrelevant rows. |
| Result Table Filter | Defines the actual "Incident" logic based on your table columns. | Triggering a signal only when `Days Overdue > 10` or `Invoice Status = 'Blocked'`. | **Task Accuracy**: Decides exactly which rows become actionable tasks in a user's Inbox. |

And for the best practice for filtering:

- **Filter Early:** Always apply broad restrictions (like Date ranges or Business Units) at the Data Model level first to keep Skill execution lean.
- **Handle Nulls:** PQL filters often exclude rows with NULL values. If you want to include "Empty" fields in your logic, ensure you explicitly account for them in your filter statement.
- **Dynamic Thresholds:** Use PQL formulas in your Result Table filters to create dynamic logic, such as triggering signals only when a value exceeds a historical average.
- **The "Invisible" Logic:** You can filter on columns that are hidden from the end-user via the visibility toggle, allowing for complex technical routing without cluttering the Inbox.

[## Step 3: Signal Identity (Critical)](#UUID-9fc70642-2824-1625-8822-c6b6889939f8_step-3-signal-id_body)

**Warning**

The **Signal ID** determines uniqueness. If you change these attributes later, Celonis will re-create all existing signals as new entries, leading to duplicates.

The Signal ID is the unique fingerprint of an incident. It tells the Action Engine whether a detected record is a brand-new issue or an update to one that already exists in a user's Inbox.

This matters because:

- **Deduplication**: Without a properly defined ID, every time the Skill runs, it will create a "new" Signal for the same problem, burying your users in duplicate tasks.
- **Persistence**: If you change these attributes later, Celonis loses the link to the original Signals. The system will treat all existing open tasks as "resolved" and generate a fresh batch of duplicates.

And when looking at what signal to use, a good Signal ID should be immutable (it doesn't change over time) and unique at the line-item level.

- **Single-Key Identification**: If your process has a unique primary key (e.g., `Invoice_GUID`), use that.
- **Composite Identification**: Most SAP or ERP processes require a combination of columns to ensure uniqueness.

  - **Example**: `Sales_Order_Number + Sales_Order_Item + Schedule_Line_Number.`
- **Avoiding "Volatile" IDs**: Never use attributes that might change during the process (like "Status" or "Current User") as part of the ID, or you will trigger a new Signal every time that value updates.

**Tip**

If your result table is intended to be clean and readable, you might feel tempted to exclude technical keys. Instead, include them but hide them. Keep the technical keys in your Result Table configuration so they can serve as the Signal ID, then use the visibility toggle (the eye icon) to hide them from the end-user’s view.

[## Step 4: Routing and Actions (Optional)](#UUID-9fc70642-2824-1625-8822-c6b6889939f8_step-4-routing-and-actions_body)

Once the Signal logic is defined, you must determine how the incident is delivered to a user and what tools they have to resolve it. This step bridges the gap between data discovery and business value.

### 1. Define Routing Rules

Routing ensures the right person handles the right incident. Without rules, Signals may sit unassigned in a general pool.

- **Simple Routing:** Assigns all Signals from a Skill to a specific user or a pre-defined group.
- **Routing by Data Attribute:** Uses columns from your Data Model to drive assignments dynamically (e.g., if the `Region` is "North America," route to the NA Accounting Team).
- **Default Assignment:** Always define a "Fallback" user or group to ensure unmatched Signals are still addressed.

### 2. Configure Actionable Steps

The Action is the interface provided to the user in their Inbox to resolve the issue. Provide the most direct path to resolution:

- **Automated Workflows:** Link to an Action Flow to automate repetitive tasks, such as sending emails or updating source systems.
- **System Deep-Links:** Use SAP WebGUI or direct URLs to take the user to the specific transaction record in the ERP.
- **Knowledge Context:** Link to a Celonis Analysis or an SOP document to provide additional context for decision-making.

### 3. Status and Communication

- **Status Mapping:** Define available statuses for the Signal, such as "In Progress," "Snoozed," or "Resolved."
- **Notifications:** Determine if users receive email digests or real-time alerts for high-priority assignments.

## Related topics

- [Projects](projects.html "Projects")
- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")


---

## automation/skills/skill-library

# Skill library

The Skill Library is the central management hub for Process Automation within Celonis Studio. It allows you to build, organize, and deploy automated logic that connects your Celonis data insights to real-world actions in third-party systems.

Expand all

[## Organizing your Automation workspace](#UUID-703f7908-b2c9-868f-170a-3a57dfb8dc58_section-id235528801613485_body)

As your automation projects scale, organization is key to maintainability.

- **Folders**: Use the **+** icon in the Explorer to create folders. We recommend organizing Skills by business process (e.g., Accounts Payable) or by status (e.g., Production vs. Development).
- **Navigation**: Use drag-and-drop to move Skills between folders.
- **Focus mode**: Use the collapse icon on the side panel to maximize your workspace while configuring complex logic.

[## Building skills without code](#id652725_body)

The Skill Builder allows you to create sophisticated automation flows using a visual interface.

- **Define a sensor**: Choose what triggers your Skill. This could be a Smart Sensor (based on data changes), a Manual Sensor (triggered by a user), or a Webhook.
- **Add Actions**: Select the task the Skill should perform, such as sending an email via Outlook or updating a record in SAP.
- **Add Actions**: Select the task the Skill should perform, such as sending an email via Outlook or updating a record in SAP.

[## Managing connections and agents](#id652738_body)

To interact with external systems, you must manage your credentials and infrastructure securely.

- **Global settings**: Access the Process Automation settings (bottom left) to view all active Connections and On-prem Agents.
- **Agents**: If you are connecting to a system behind a firewall, ensure your On-prem Agent is "Connected" before testing your Skill.

[## Maximizing reusability with variables](#id652748_body)

Avoid hard-coding values into your Skills. Instead, use Variables to make your automations portable across different environments.

- **Connection variables**: In your Package Settings, create a variable for your connection. Assign the specific connection (e.g., SAP Production) to this variable.
- **Benefit**: When you move a Skill from a Test to a Production package, you only need to update the variable value once, rather than editing every individual Action.

[## Validation and deployment](#id652758_body)

Before going live, you must verify that your logic is sound.

- **Testing tour skill**: Click the Test button to run a simulation.

  - **Warning**: The Test execution uses real data and real connections. If your Skill is configured to "Delete Record," clicking Test will delete that record in the target system.
  - **Execution logs**: After testing, review the output to ensure data mapped correctly from the Sensor to the Action.
- **Publishing**: Once validated, you can publish your Skill.

  - **Single skill**: Click Publish within the Skill Builder to make it active within your current package.
  - **Package deployment**: To move your automation to the business user environment, you must publish the entire Studio Package.

## Related topics

- [My Inbox](my-inbox.html "My Inbox")
- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")


---

## automation/skills/skills-and-automation

# Process Automation Skills

A Skill is the fundamental building block of automation within Celonis. While a Data Model identifies process inefficiencies, a Skill provides the logic and connectivity required to resolve them. It acts as a bridge between the Celonis Process Intelligence Platform and your external business systems (such as SAP, Salesforce, or ServiceNow).

## Core Skill components

Every Skill is comprised of two primary elements that dictate its behavior and impact:

- **Sensors (The Logic)**: Sensors act as the "if" statement of your automation. They monitor data for specific triggers—whether that is a PQL condition being met (Smart Sensor), a manual user interaction (Manual Sensor), or an external call (Webhook).
- **Actions (The Execution)**: Actions are the "then" statement. These are the operations performed once a Sensor is triggered, such as updating a record in an ERP system, sending a Slack notification, or creating a Task for a business user.

## Integration with Studio assets

Skills do not operate in isolation; they leverage other Studio assets to ensure data accuracy and security:

| Asset | Relationship to Skill |
| --- | --- |
| Knowledge Model | Provides the business context and PQL definitions that Sensors use to identify incidents. |
| Connections | Securely stores the credentials and API endpoints required for Actions to communicate with third-party systems. |
| Views | Serves as the front-end interface where Manual Sensors are surfaced to business users as buttons or dropdowns. |

## Automation modes

Depending on the business requirement, Skills can be configured to operate with varying levels of human oversight:

- **Fully Automated**: The Skill executes Actions immediately upon the Sensor trigger. This is ideal for high-volume, low-risk repetitive tasks.
- **Human-in-the-Loop**: The Skill generates a Task instead of an immediate system action. This allows a business user to review the recommendation and manually approve the execution, ensuring human judgment is applied to complex or high-value decisions.

## Related topics

- [My Inbox](my-inbox.html "My Inbox")
- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")


---

## automation/triggers/creating-triggers

# Creating Triggers using records

Triggers automatically detect relevant record items in Celonis Platform data and can be used to execute Action Flows for newly detected items.

Expand all

[## Before you begin](#UUID-c55c4d9d-68a0-fd12-6b61-60bdb9f176e6_section-id235456539571363_body)

- You must be an analyst with access to the Celonis Platform Studio.
- You must have “edit permissions” on a package or need to create a new package.
- You must have a Knowledge Model or create a new Knowledge Model.

[## Creating Triggers using records](#UUID-c55c4d9d-68a0-fd12-6b61-60bdb9f176e6_section-id235456540100041_body)

1. In Studio, select **your package** > **your Knowledge Model** > **Triggers**.
2. In the upper-right corner, click **Create Trigger**.
3. Give your trigger a meaningful name.
4. Select the Record that your new Trigger will monitor for relevant Record items.
5. Apply filters to your Trigger to narrow down the scope of what the Trigger will monitor.
6. Verify the preview to see the outcome of your settings and click **Save**.

You must publish your Knowledge Model for the Trigger to become usable by other entities. Once this is done, you can start using it in Action Flows. See [Creating an Action Flow with a Trigger](creating-an-action-flow-with-a-trigger.html "Creating an Action Flow with a Trigger").

**Tip**

If you create an Action Flow from the modal directly after creating your Trigger, part of the Action Flow will be preconfigured automatically for you.

## Related topics

- [Creating Triggers using Data Model](creating-triggers-using-data-model.html "Creating Triggers using Data Model")
- [Triggers FAQs](triggers-faqs.html "Triggers FAQs")
- [Triggers troubleshooting](triggers-troubleshooting.html "Triggers troubleshooting")


---

## automation/triggers/creating-triggers-using-data-model

# Creating Triggers using Data Model

Triggers automatically detect changes to Data Model table items in Celonis Platform and can be used to create Tasks for newly detected items.

Expand all

[## Before you begin](#UUID-123a6cfb-f325-7940-33d4-87a9e8c2102b_section-id235456536779562_body)

- You must have edit access to Celonis Platform Studio.
- You must have a Knowledge Model in your environment.

[## Creating triggers using Data Model](#UUID-123a6cfb-f325-7940-33d4-87a9e8c2102b_section-id235456537291877_body)

1. In Studio, select **your package** > **your Knowledge Model** > **Triggers**.
2. In the upper-right corner click Create Trigger.
3. Select **Create Trigger using Data Model**.
4. Give your Trigger a name.
5. Choose a Data Model table for the Trigger to monitor:

   1. From the drop-down list, select a Data Model table.

      A list of columns that make the table identifier shows. Table identifier is made up of a unique selection of columns. The columns that make a table identifier are already preselected and you can’t change them.
   2. (*optional*) Click **Add column** to add extra columns for the Trigger to monitor.
6. (optional) Add filters to narrow down the monitoring scope.
7. Click **Create**.

You must publish your Knowledge Model for the Trigger to become usable by subscribers.

## Related topics

- [Triggers troubleshooting](triggers-troubleshooting.html "Triggers troubleshooting")


---

## automation/triggers/deploying-and-trigger-an-action

# Deploying and trigger an Action

An Action is essentially a set of instructions waiting for a command. Once you have built and saved your automation logic, the final step is deciding how and when those instructions are executed.

You can deploy Actions to be triggered manually by business users as they analyze data, or you can configure them to run entirely in the background based on specific process conditions.

## Manually executing a trigger

Manual execution puts the power of automation directly into the hands of your business users. By embedding Actions into your Celonis interfaces, users can fix process issues with a single click the moment they spot them.

- **Adding Actions to Studio Components**: You can attach your Action to UI elements within your Studio Views, such as a standalone Button or an inline action within a Table. For example, a user looking at a list of blocked orders can click an "Unblock" button directly in their dashboard, instantly triggering the Action in your ERP system.
- **Adding Actions to Tasks**: If your team uses Celonis Tasks to manage daily workloads, you can attach Actions directly to these tasks. When a user opens a Task, they will see a button to automatically execute the resolution (e.g., "Send Reminder Email") rather than opening the external system to do it manually.

When setting up manual triggers, you can also request manual input from the user. This prompts a pop-up window requiring the user to enter specific information (like a custom comment, a selected reason code, or a specific date) before the Action executes.

## Automatically executing a trigger

For routine or highly predictable processes, you can remove the human element entirely. Automatic Execution allows you to set up rules that trigger your Action in the background whenever specific data conditions are met.

- **Condition-Based Triggers**: You define a specific PQL (Process Query Language) condition. Celonis continuously monitors your data model, and the moment a record meets that criteria (e.g., Invoice Age > 30 Days AND Status = Unpaid), the Action automatically fires.
- **Batch Processing**: Automatic triggers are excellent for multi-row executions, allowing you to process dozens or hundreds of records simultaneously without user intervention.

## Next steps

Once your Actions are deployed and running, it is crucial to monitor their performance and ensure they are executing successfully. Proceed to Monitoring and Management to learn how to track run histories and troubleshoot errors.

- [Monitoring and managing Actions](monitoring-and-managing-actions.html "Monitoring and managing Actions")


---

## automation/triggers/trigger-machine-learning-script

# Trigger Machine Learning Script

Integrating Machine Learning (ML) scripts into your Action Flows can significantly enhance your automation capabilities. This guide demonstrates how to trigger an ML script using a Slack message, providing a seamless bridge between your communication channels and advanced data processing.

Key features include:

- **Slack Integration**: Monitor specific channels for trigger phrases (e.g., `%%forecast`) to initiate workflows.
- **Customizable Variables**: Easily configure your team domain, environment clusters, and application keys.
- **Flexible Execution**: Send POST requests to the ML API with support for custom execution timeouts and retry logic.

This workflow creates an automated bridge between your communication channels and your data science environment. It consists of two primary stages that move from message detection to script execution.

1. **Monitor Slack**`%%forecast`
2. **Execute Script**: Once the trigger is identified, the flow authenticates with the Celonis API and starts the pre-configured Machine Learning script.

|  |
| --- |
|  |

Expand all

[## Configuring Action Flow](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_id_TriggerMachineLearningScript-ConfiguringActionFlow_body)

Below you will find the step-by-step guide for configuring each module of the above Action Flow.

[### 1. Wait for Trigger phrase](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_id_TriggerMachineLearningScript-1WaitforTriggerphrase_body)

To be able to trigger the ML script and Action Flows via Slack we use this module to keep track of all the messages in one specific private channel.

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: Slack

**Action:** Watch Private Channel Messages

**Connection:** Connect to your Slack account

**Channel:** Choose the channel from where you want to trigger the ML Script

|  |
| --- |
|  |

[### 2. Filter for Trigger phrase](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_id_TriggerMachineLearningScript-2FilterforTriggerphrase_body)

We filter on the defined Trigger phrase to not trigger the ML script when sending random messages in the Channel.

**Condition:** {{Text}} from previous Slack module

**Filter:** Equal to (case insensitive) - *Text operators*

**String variable:** Enter text that is only used to trigger this AF (here: %%forecast)

**String variable**

In this context, %% or similar structures help to differentiate from other slack messages.

|  |
| --- |
|  |

[### 3. Customize Variables](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_id_TriggerMachineLearningScript-3CustomizeVariables_body)

This is the most important module in this Action Flow, where we have to adjust all the data specific to your team and account, like the team domain or an Application Key with the correct permissions.

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: Tools

Action: Set multiple variables

**teamDomain:** Enter your teamdomain, e.g. demo-action-flows

**env:** Enter your cluster, e.g. try, eu-1...

**AppKey:** For example, GjV6ODBvghgv6r76r0YzkyLTkxZwjbflqjwhebfljwhebfqjhebfwlV5TEVCcjMzAHBFK0F8TXdGBTlqBWFlsVPNk (create application key → Navigate to Permissions→ Select Machine Learning Permissions → Enable Use all Machine Learning Apps for your AppKey)

**notebookId:** We will add this one at a later point in this Template when creating a ML App / adding Scripts to an existing ML App

**executionFileName:** The name of the ML Script to be triggered, e.g. trigger\_MLScript.ipynb

|  |
| --- |
|  |

[### 4. Trigger ML Script](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_id_TriggerMachineLearningScript-4TriggerMLScript_body)

This module sends a Post Request to our ML API and triggers a defined Script.

**You do not have to change anything in this module!**

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: HTTP

Action: Make a Request

**URL:** https://{{teamDomain}}.{{env}}.celonis.cloud/machine-learning/api/executions

**Method:** POST

**Headers:**

- **Name:** Authorization
- **Value:** AppKey {{AppKey}}

**Body type:** Raw

**Content type:** JSON (application/json)

**Request content:**

```
{
"notebookId": "{{notebookId}}",
"executionFileName":"{{executionFileName}}"
}
```

|  |
| --- |
|  |

[### Setting an execution timeout](#UUID-cc99f6da-ea11-f7cb-6332-38cb944548be_section-idm234400269242491_body)

The request content can include an execution timeout. The JSON looks like this:

```
{
    "notebookId": "notebookId",
    "executionFileName": "executionFileName",
    "executionTimeout": 24,
    "maxRetries": 0,
    "timeUnit": "HOURS"
}
```

timeUnit can be “HOURS” or “MINUTES”.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/triggers/triggers

# Triggers

Triggers in Celonis Platform allow you to automatically detect items that meet the criteria you defined. They can be used by various subscribers to execute different automations.

With the Celonis Platform and its powerful analytical capabilities, you can discover process inefficiencies that have an impact on your KPIs. Discovering such inefficiencies often happens by identifying certain business objects of high relevance for which action needs to be taken. Typical examples would be “Outstanding invoice overdue”, “Invoice with cash discount at risk”, “Sales Order with delivery block to be removed” and so on. To close these inefficiencies, you want the Celonis Platform to be able to take targeted actions whenever such business objects are detected.

For example, you've created a table that contains Sales Orders which have delivery blocks that can be removed (as they fulfill certain criteria, for example, a sufficient amount of down payment has been received) and need to be removed in order to deliver on time. You want to know whenever a new Sales Order shows up in that table to be able to react accordingly. Or, even better, you want the Celonis Platform to know whenever a new Sales Order shows up there and want the Celonis Platform to act (in this case, remove the block).

## How Triggers work

To resolve use cases like the one described above, and to make the most of Triggering functionality, you have to set up and connect two elements:

1. **Trigger**: within the Knowledge Model, you must define the logic of Triggers. Based on your discoveries, insights, and validations, these describe the relevant business objects which you want to detect and automate. You can reference shared intelligence (like the existing filters).
2. **Subscriber**: subscribers wait for a signal from a Trigger to perform a predefined automation. For example, an Action realized in a View in the form of an Action button can be a subscriber. A Trigger can process up to 10k signals at a time.

## Getting started with Triggers

To see Triggers that exist in your Knowledge Model, in Studio, select your Knowledge Model and click **Triggers** in the left-hand side menu.

Click on any of the Triggers to see its details. Here you can check if the Trigger is already used by any subscriber. For a detailed execution log of your Trigger, click the subscriber link in the **Used by** column.

If you don’t have any Triggers in the Knowledge Mode yet, start with creating one. Depending on your use case you can create the following types of records:

- [Creating Triggers using Data Model](creating-triggers-using-data-model.html "Creating Triggers using Data Model") (**recommended**) - use Triggers to detect new objects or events in the Data Model.
- [Creating Triggers using records](creating-triggers.html "Creating Triggers using records") - use Triggers to detect new record items. Record-based Triggers can be applied only in limited use cases.

## Related topics

- [Triggers troubleshooting](triggers-troubleshooting.html "Triggers troubleshooting")
- [Triggers FAQs](triggers-faqs.html "Triggers FAQs")


---

## automation/triggers/triggers-faqs

# Triggers FAQs

Expand all

[## When will the Trigger detect new items?](#UUID-365844af-9bb9-ce95-ada9-2b107eda4bd2_body)

To check for Record Items that match your criteria, your Trigger evaluates the logic, compares it to the previous check, and triggers the Action Flow for newly detected items. This happens on the following occasions:

- Whenever a Data Model is reloaded which is when new data gets injected into the Data Model.
- Whenever the definition of the Trigger is updated that is when the Knowledge Model gets published).

[## How do we deal with changes of the Trigger?](#UUID-40822418-f124-e4d8-9027-fba7ae9a6573_body)

Changes in the Trigger logic are treated the same as changes of the data. This way, we ensure that every new item gets added to the results in an execution, regardless whether it was added due to a change of a filter or new data.

If your use case requires a different trigger behavior, let us know in the feedback form. For the moment, if you want to avoid executions for items detected as new just because of a logic change, you can deactivate the Action Flow while performing the changes, and remove the items from the Action Flow Webhook Queue before activating the Action Flow again.

[## How can I execute for existing items?](#UUID-0683e9a5-6186-9195-f702-835a0aac5823_body)

When starting to watch a Trigger, the Trigger will only be executed for new items. We will offer support to also trigger for existing items in the future. For the moment, the only workaround if such a capability is needed is to “reset the Trigger” by adding a filter that filters out all items, publish the trigger definition, and then remove this filter again.

[## What is the connection needed for?](#UUID-cd99ab7e-41b7-5620-c515-3f741d155e5a_body)

The connection used in the Action Flow governs data visibility and permissions. When watching a trigger, a subscription on the Trigger is created which will detect new items the connection has access to.

[## Where can I check the status of the Trigger and monitor what it does?](#UUID-7710953b-3122-6493-5e49-e4d1ee64db23_body)

In your Knowledge Mode, select triggers for the overview of all Triggers available in the Knowledge Model. Click the Trigger that you’re interested in. For every Trigger that is in use, you can click on the “In Use” Icon in the Trigger header to open a screen with operational details about the specific Trigger.

[## No immediate execution](#UUID-da102e7e-187e-c5e0-a7f3-842c203bad35_body)

If the Action Flow is not set to execute immediately (being inactive or switched to scheduled execution), the execution requests for new items are stored on the webhook queue. Keep in mind that there is a limit on that queue of 10k items. If that limit is reached, the webhook won't store new requests anymore. Currently, those requests are lost. Consider this when designing such a solution.


---

## automation/triggers/triggers-troubleshooting

# Triggers troubleshooting

When working with Triggeres, you may encounter the following issues:

Expand all

[## Trigger missing from the list](#UUID-0551de74-81ad-2d7e-447f-0630e44bc8d8_section-idm4613473910033633465664873017_body)

Check the following aspects:

- Does your connection have edit rights on the Knowledge Model?
- Have you published the Knowledge Model containing the Trigger?

[## Preventing deactivation of action flows due to errors](#UUID-0551de74-81ad-2d7e-447f-0630e44bc8d8_section-idm4613474236067233465666187814_body)

In general, we recommend to activate “incomplete executions” on Action Flows, such that in case of error, an incomplete execution is created which allows the user to deal with those executions later on.

[## First modules not fully configured after creating an Action Flow from a trigger](#UUID-0551de74-81ad-2d7e-447f-0630e44bc8d8_section-idm4550279611971233465667168405_body)

If you haven’t created any Action Flows with Celonis modules yet, you must add the new connection first. We recommend that you use the App Key connection type for this. For more information, see [Application keys](application-keys.html "Creating and granting permissions to application keys")

[## ‘Watch Trigger’ module output not updated upon adding new attributes on the record](#UUID-0551de74-81ad-2d7e-447f-0630e44bc8d8_section-idm453842141905443374533064146_body)

Reopen the 'Watch Trigger' configuration and click 'OK'. This will update the output. It is possible that it just requires a moment for the update to take effect.

[## Record-based Triggers failing to trigger Action Flows](#UUID-0551de74-81ad-2d7e-447f-0630e44bc8d8_section-idm234883778507246_body)

**Symptoms:**

Record-based Triggers do not activate an Action Flow and generate "[column\_name] is missing" error status.

**Cause**

This error can be generated when a trigger uses a record that points to a calculated attribute. Calculated attributes are not supported by record-based triggers.

**Solution**

Remove all references to calculated attributes from any of the PQL formulas used in the record that's reused by your trigger. For more information on calculated attributes, see [Calculated attributes](knowledge-model---calculated-attributes.html "Knowledge Model - Calculated Attributes").


---

