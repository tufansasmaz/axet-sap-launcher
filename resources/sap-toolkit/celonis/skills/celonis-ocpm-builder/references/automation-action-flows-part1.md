# Automation: Action Flows (Part 1)

## automation/action-flows/1crm--action-flow-

# 1CRM (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The 1CRM modules enable you to monitor, search, retrieve, create, update, or delete records in your 1CRM account.

Expand all

[## Before you begin](#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_id_getting-started-with-1crm_body)

Before you start working with the 1CRM module, make sure you have the following:

- A **1CRM account**. You can create a 1CRM account at [1crm.com/free-trial](https://1crm.com/free-trial/).

[## Connecting the 1CRM module to Celonis Platform](#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb_body)

To connect your 1CRM account to Celonis Platform you need to enter your 1CRM domain and login credentials to the *Create a connection* dialog in Celonis platform.

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **1CRM**.
3. Click **Create a connection**.
4. Fill the fields as follows:

   |  |  |
   | --- | --- |
   | **Connection name** | Enter the name for your 1CRM connection. |
   | **Domain** | Enter the URL of your 1CRM account without the https prefix. |
   | **Username** | Enter the user name for your 1CRM account. E.g. *Admin.* |
   | **Password** | Enter the password to your 1CRM account. |
5. Click the *Continue* button to establish the connection to your 1CRM account.

The connection has been established. You can proceed with setting up the module.

[## Types of 1CRM modules](#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_section-id235497376685486_body)

1CRM modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

[### Records](#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-45ec02a0-2cad-f703-15d1-1d0c5225e1b6_body)

#### New Event

Triggers when a record is created or updated.

Click the *Add* button to create a new webhook in your 1CRM account.

|  |  |
| --- | --- |
| **Webhook name** | Enter the name for the webhook. E.g. *Account Created*. |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Type** | Select whether you want to monitor created, or updated records. |
| **Module** | Select the records you want to watch. |

#### Search for Records

Performs a search by defined filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module where you want to search for records. |
| **Fields** | Select fields you want to be retrieved by Celonis platform. If left empty, a limited number of fields will be retrieved. |
| **Filter text** | Enter the search term. Fields involved in search depend on model.  **Notice**  Other fields that are available for filtering results are loaded dynamically, depending on the module selected above. |
| **Sort order** | Select a field representing the default sort order, overriding the default order. |
| **Limit** | Set the maximum number of records Celonis platform will return during one execution cycle. |

#### Get a Record

Retrieves data of the specified record.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module that contains the record you want to retrieve details about. |
| **Record ID** | Enter (map) the ID of the record you want to retrieve details about. |

#### Create a Record

Creates a new record.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module that you want to create a record for. |

**Notice**

The corresponding fields are loaded dynamically, depending on the selected module.

#### Update a Record

Updates an existing record.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module that you want to create a record for. |
| **Record ID** | Enter (map) the ID of the record you want to update. |

**Notice**

The corresponding fields are loaded dynamically, depending on the selected module.

#### Delete a Record

Removes a Record

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module you want to remove the record from. |
| **Record ID** | Enter (map) the ID of the record you want to delete. |

[### Other](#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-4fd6be0a-a464-12da-0018-1fab7435b751_body)

#### List Modules

Returns all modules in your account.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Limit** | Set the maximum number of modules Celonis platform will return during one execution cycle. |

#### List Fields

Returns all fields of the specified module.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Module** | Select the module you want to retrieve fields for. |
| **Limit** | Set the maximum number of fields Celonis platform will return during one execution cycle. |

#### Get My Info

Retrieves information about the authenticated user.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |

#### Upload a File

Uploads a File.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **Source file** | Map the file you want to upload from the previous module (e.g. *HTTP > Get a File* or *Google Drive > Download a File*), or enter the file name and file data manually. |

#### Make an API Call

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your 1CRM account](1crm--action-flow-.html#UUID-f2527914-3900-1f8d-a9db-925241bca8a8_UUID-c26e761b-2205-ab7b-ca08-ee71f267d2cb "Connecting the 1CRM module to Celonis Platform"). |
| **URL** | Enter a path relative to `https://{{YOUR-DOMAIN}}/api.php/`.For example: `/meta/modules/`.  **Note**  For the list of available endpoints, refer to the Section 2.2 Next Generation REST API in [1CRM Developer Guide](https://1crm.com/docs/1CRM_8.6_Developer_Guide.pdf). |
| **Method** | Select the HTTP method you want to use:  `GET` to retrieve information for an entry.  `POST` to create a new entry.  `PUT` to update/replace an existing entry.  `PATCH` to make a partial entry update.  `DELETE` to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query string** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

#### Example of Use - List Modules

The following API call returns all of the modules in your 1CRM account:

**URL**: `/meta/modules/`

**Method**: `GET`

The result can be found in the module's **Output** under *Bundle > Body > list*. In our example, all 81 modules were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/4leads--action-flow-

# 4leads (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The 4leads module connects the Celonis platform to the 4leads lead management and marketing automation system. Use this module to automate the lead lifecycle by synchronizing contact data, updating lead statuses, and managing marketing tags based on real-time process signals analyzed in Celonis.

Expand all

[## Before you begin](#UUID-9b6e94ce-45a4-d607-2a90-2f764776a91e_id_getting-started-with-4leads_body)

Before you start working with the ActiveCampaig module, make sure you have the following:

- 4leads account. If you do not have one, you can create a 4leads account at [4leads.de](https://4leads.de/).

[## Connecting 4leads to Celonis Platform](#UUID-9b6e94ce-45a4-d607-2a90-2f764776a91e_UUID-7ed2ca98-5c9d-e22e-d081-51e3f1acb118_body)

To connect your 4leads account to Celonis platform you need to obtain the API Key.

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **4leads**.
3. Create a connection with your 4leads account:

   1. Click **Create a connection**.
   2. Log in to your 4leads account.
   3. Open *Account > \_API* from the menu on the left.
   4. Click the *+New API key* button.
   5. Enter the *name* for the new API Key, set the status to **Activated** and click the **Save** button.
   6. Copy the provided *API Key* and store it in a safe place.
   7. Go to **Celonis platform** and open the 4leads module's *Create a connection* dialog.
   8. Enter the API Key you have copied in step 5 to the respective field and click the *Continue* button to establish the connection.

The connection has been established and you can proceed with setting up the module.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/6--trigger_action_flow---trigger-action-flows

# 6. `trigger_action_flow` — Trigger Action Flows

**Mode**: Custom only · **Category**: Other

Connects the Process Copilot to an Action Flow. Each instance requires a `unique_id`. The Process Copilot creator fully defines which action flow to call and what inputs it expects.

Expand all

[## Minimal — no inputs](#UUID-e38e502f-5fc1-880a-6eb1-64a514e941a3_section-id235535998936993_body)

```
- id: trigger_action_flow
  unique_id: run_cleanup
  flow_key: my-package.cleanup-scenario
  flow_display_name: Run Data Cleanup
```

[## With input schema — LLM fills the inputs](#UUID-e38e502f-5fc1-880a-6eb1-64a514e941a3_section-id235535999230984_body)

```
- id: trigger_action_flow
  unique_id: send_email
  description: Sends an email to a recipient given an email address and body.
  flow_key: my-package.email-scenario
  flow_display_name: Send Email Flow
  disable_confirm: false
  flow_input_schema:
    type: object
    required:
      - email
      - body
    properties:
      email:
        type: string
        description: Email address to send to.
        display_name: Email Address
      body:
        type: string
        description: The body of the email.
        display_name: Email Body
```

[## Multiple action flows in one Process Copilot](#UUID-e38e502f-5fc1-880a-6eb1-64a514e941a3_section-id235535999530415_body)

```
- id: trigger_action_flow
  unique_id: send_email
  flow_key: my-package.email-scenario
  flow_display_name: Send Email
  flow_input_schema:
    type: object
    required: [email, body]
    properties:
      email:
        type: string
        description: Recipient email address.
      body:
        type: string
        description: Email body text.

- id: trigger_action_flow
  unique_id: create_ticket
  flow_key: my-package.ticket-scenario
  flow_display_name: Create Support Ticket
  disable_confirm: true
  flow_input_schema:
    type: object
    required: [title, priority]
    properties:
      title:
        type: string
        description: Ticket title.
      priority:
        type: string
        description: Priority level (low, medium, high).
```

[## Config fields](#UUID-e38e502f-5fc1-880a-6eb1-64a514e941a3_section-id235535999839908_body)

|  |
| --- |
|  |

Filter

- Field
- Type
- Description

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `unique_id` | string | **Required** — unique identifier for this action flow instance. |
| `flow_display_name` | string | **Required** — name shown to the user in the confirmation card. |
| `flow_key` | string | Action flow key (`package.scenario` format). |
| `flow_input_schema` | object | JSON Schema defining inputs. Each property becomes an LLM argument. |
| `disable_confirm` | bool | Skip user confirmation before execution (default: requires confirmation). |
| `flow_node_id` | string | **Deprecated** — legacy webhook node ID. |
| `flow_hook_id` | string | **Deprecated** — legacy webhook hook ID. |

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| `unique_id` | string | **Required** — unique identifier for this action flow instance. |
| `flow_display_name` | string | **Required** — name shown to the user in the confirmation card. |
| `flow_key` | string | Action flow key (`package.scenario` format). |
| `flow_input_schema` | object | JSON Schema defining inputs. Each property becomes an LLM argument. |
| `disable_confirm` | bool | Skip user confirmation before execution (default: requires confirmation). |
| `flow_node_id` | string | **Deprecated** — legacy webhook node ID. |
| `flow_hook_id` | string | **Deprecated** — legacy webhook hook ID. |

## Related topics

- [Tool Activation](tool-activation.html "Tool Activation in your Process Copilot")
- [Search Data tool](7--search_data---search-data.html "7. search_data — Search Data")
- [Process Copilots](process-copilot.html "Process Copilots")
- [Agent Tools (MCP) Asset](agent-tools--formerly-mcp-server-asset-.html "Agent Tools (formerly MCP Server Asset)")


---

## automation/action-flows/action-flow-execution,-cycles,-and-phases

# Action Flow execution, cycles, and phases

Celonis platform is a transactional system, similar to [relational databases](https://en.wikipedia.org/wiki/Database_transaction). Each Action Flow execution starts with the *initialization* phase, continues with at least one *cycle* composed of the *operation* and *commit/rollback* phases, and ends with the *finalization phase*:

1. initialization
2. cycle #1

   1. operation (reading or writing)
   2. commit or rollback
3. cycle #2

   1. operation (reading or writing)
   2. commit or rollback
4. ---
5. cycle #N

   1. operation (reading or writing)
   2. commit or rollback
6. finalization

**Caution**

Maximum  Action Flow execution time should not exceed 40 minutes for hosted version and 60 minutes for a private instance.

## Initialization

During the *initialization* phase, all necessary connections (connection to a database, email service, etc.) are created. They are also checked if each module is capable of performing their intended operation(s).

## Cycles

Each *cycle* represents an undividable unit of work composed of a series of operations. It is possible to set the maximum number of cycles in the Action Flow settings. The default number is 1.

## Operation

During the operation phase reading and/or writing operation is performed:

- The *reading* operation consists of obtaining data from a service that will then be processed by other modules according to a predefined Action Flow. E.g. the Dropbox > *Watch files* module returns new bundles (files) created since the last Action Flow execution.
- The *writing* operation consists of sending data to a given service for further processing. E.g. the Dropbox > *Upload a file* module uploads a file to a Dropbox folder.

## Commit

If the *operation* phase is **successful** for **all modules**, the commit phase begins during which all operations performed by the modules are committed. This means that Celonis platform sends information to all the services involved in the operation phase about its success.

The *commit* phase applies only to ACID modules that use a two-phase protocol (prepare and finalize). Non-ACID modules like HTTP or email execute immediately and can't be rolled back.

## Rollback

If an error occurs during the *operation* or *commit* phase on **any module**, the phase is aborted and the *rollback* phase is started, making all operations during the given cycle void. Some modules do not support rollback and operations performed by these modules cannot be taken back. For more information, see the [ACID modules](action-flow-execution,-cycles,-and-phases.html#UUID-6aaac0e6-50d0-eb1d-0f58-4ed75820a649_section-idm453671069883043282726477419 "ACID modules") section.

The *rollback* phase applies only to ACID modules that use a two-phase protocol (prepare and finalize). Non-ACID modules like HTTP or email execute immediately and can't be rolled back.

## Finalization

During the *finalization* phase, open connections (e.g. FTP connections, database connections, etc.) are closed and the Action Flow is completed.

## ACID modules

The modules that support rollback (transactional modules) are tagged with the [ACID](https://en.wikibooks.org/wiki/Relational_Database_Design/Transactionality) tag:

The modules not tagged with this tag do not support rollback and cannot be reverted back to their initial state in case of an error in other modules.

A typical example is the Email  **Send an email** module. Once the module sends an email during its operation phase, the sending cannot be undone.

## Examples

**Transfer of bundles between databases**

The following example shows how to connect three ACID modules. The aim of the below Action Flow is to get new rows from a [MySQL](mysql--action-flow-.html "MySQL (Action Flow)") database, insert (transfer) them into a [MSSQL](/document/preview/836056#UUID-c53ce2cb-1147-8a4a-e63e-9855be416090) database and then insert the IDs of the rows from the MSSQL database into a [PostgreSQL](postgresql--action-flow-.html "PostgreSQL (Action Flow)") database.Microsoft SQL Server (Action Flow)

When the Action Flow starts, the initialization phase is performed first. Celonis platform verifies connections to the MySQL, MSSQL and PostgreSQL databases one at a time. If everything goes well and the connections are successful, Celonis platform moves on to the operation phase. If an error occurs, the finalization phase starts instead of the operation phase and the Action Flow is terminated.

Next comes the operation phase. A preset procedure selects (reads) the table rows (bundles) from MySQL. Those rows are then passed to the next module that writes them to a selected table in the MSSQL database. If everything is in order, the last PostgreSQL procedure is called to insert the row IDs returned by the preceding module into the table.

If the operation phase is completed successfully, the commit phase begins. Celonis platform calls the SQL COMMIT command for each database and the write operations will be committed.

However, if the operation or commit phase fails due to an error, (e.g. connection failure), Celonis platform calls rollback. During the rollback phase, Celonis platform goes through all modules one after another and executes the SQL ROLLBACK command for each module to revert each database back to its initial state.

Finally, during the finalization phase, each module will close its connection to the database.


---

## automation/action-flows/action-flow-modules

# Action Flow modules

In Action Flow, a module is a building block you use to create an Action Flow. Think of it as bricks that you put together to automate your processes.

Each module performs a particular action, such as retrieving data from a service, creating or updating a record, downloading a file, or searching for specific data based on certain conditions. For example, your Action Flow can have three modules: one module watches for new customer data in a CRM, the second module converts the data into another format, and the last module sends that information to a different service.

You can find all available modules in the app list when selecting a specific app in the Action Flow.

Understanding each module type helps you navigate Celonis Platform more easily, build advanced Action Flows, and optimize operations while reducing costs.

Modules can be split into two groups based on whether they need to connect to a service or use a third-party API. There are two types:

- [App modules](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626753292394 "App modules")
- [Tools](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm23462676568466 "Tool modules")

You can categorize modules into the following groups depending on what they do with data in Celonis Platform:

- [Triggers](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626772777729 "Triggers")
- [Actions](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626772989874 "Actions")
- [Searches](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm23462824008352 "Searches")
- [Universal modules](action-flow-modules.html#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234628384112451 "Universal modules")

Expand all

[## App modules](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626753292394_body)

When adding an app module, you need to create a connection to start working with them. Each module serves a specific action. For example, to get data, create a record, or delete a profile in your service account. You can associate a certain app module with a specific service API endpoint.

LinkedIn, Google Sheets, HubSpot CRM, Trello have their dedicated modules in Celonis Platform. For more information, see [Modules for third-party apps](action-flow-modules-for-third-party-apps.html "Action Flow modules for third-party apps") and [Modules for Celonis apps](celonis-apps.html "Action Flow modules for Celonis apps").

[## Tool modules](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm23462676568466_body)

With tools, you don't need to set up a connection nor use a third-party API. Instead, you enter your data or customize module settings, and the module is ready to work. Examples include Iterator, Aggregator, Data store, Compose a string, Set variable, and many more.

These modules are ready to go as soon as you add them. However, some tools might require some setup before you can use them.

[## Triggers](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626772777729_body)

A trigger is a module used to track changes in a service and pulls it to Celonis Platform so you can use the data in your Action Flow. A trigger only shows new data from your service account. Each time an Action Flow processes trigger data, it's data that hasn't been processed before in that Action Flow.

For example, a trigger might detect when a new record is created, or an old record is deleted.

You can add a trigger only once in the Action Flow as the first module. This ensures that the trigger initiates the Action Flow by detecting the relevant changes and pulling in the data for further processing.

**Important**

In Action Flow, we also have Triggers which are sets of criteria that, when met, can by used to execute various subscribers. Triggers are broader in scope than trigger modules and can be used outside of Action Flows too. See [Triggers](triggers.html "Triggers").

[## Actions](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234626772989874_body)

An Action module processes the data retrieved from a service. It’s one of the most commonly used modules in Action Flows.

You can include as many as you need and position them anywhere in your Action Flow.

There are the following types of action modules in Action Flows:

- Get
- Create
- Update
- Delete

Some actions are specific to the service, such as pin, save, or download.

[## Searches](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm23462824008352_body)

A Search module helps you to get specific data from a service such as records, profiles, or other objects.

Search modules are flexible. You can add as many as you need and place them anywhere within your scenario.

[## Universal modules](#UUID-f06853a4-27c4-808b-e17e-34950bea1926_section-idm234628384112451_body)

A universal module allows you to make a custom API call to a service when Celonis Platform doesn't provide a pre-built module for an API endpoint you need. This module is available for most services. You may need to refer to the service API documentation to see a full list of available API endpoints.


---

## automation/action-flows/action-flow-modules-for-third-party-apps

# Action Flow modules for third-party apps

Third-party apps are an easy way to connect your commonly used applications with Celonis Platform.

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Expand all

[## DocuSign (Action Flow)](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_body)

With DocuSign modules in Celonis platform, you can monitor and retrieve envelope status, search and retrieve envelopes, or download and send a document to sign in your DocuSign account.

[### Before you begin](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_section-id235513206198645_body)

To use DocuSign modules, you must have a DocuSign account. You can create an account at [go.docusign.com/o/trial](https://go.docusign.com/o/trial/).

Refer to the [DocuSign API documentation](https://developers.docusign.com/docs/esign-rest-api/reference/) for a list of available endpoints.

[### Connect DocuSign to Celonis platform](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_section-idm4590632233598433999307561337_body)

To make the connection in Celonis platform:

1. Log in to your Celonis platform account, add a DocuSign module to your Action Flow, and click **Create a connection**.

   Note: If you add a module with an `instant` tag, click **Create a webhook**, then **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show advanced settings** and enter your [custom app client credentials](action-flow-modules-for-third-party-apps.html#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_section-idm4590632242969633999311496677 "Create a custom application in Celonis platform").
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more DocuSign modules.

[### Create a custom application in Celonis platform](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_section-idm4590632242969633999311496677_body)

To create the DocuSign custom application and retrieve your client credentials:

1. Log in to your DocuSign account.
2. In the upper right, click **Settings**.
3. In the left menu, under **Integrations**, click **Apps and Keys**.
4. Click **ADD APP AND INTEGRATION KEY**.
5. Under **App Name**, click **CREATE APP**.
6. Under **General Info**, copy the **Integration Key** and store it in a safe place.
7. Under **Authentication**, click **+ADD SECRET KEY** and store it in a safe place.
8. Under **Additional settings**, for **Redirect URIs**, add `https://www.integromat.com/oauth/cb/docusign`
9. Click **Save**.

You will use these values in the <**Integration Key (Client ID)** > and <**Client Secret** > fields in Celonis platform.

[### Types of DocuSign modules](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_section-id235513207297835_body)

[#### Envelope](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_UUID-d4cb030c-8acd-2dc9-0080-09077532967d_body)

[##### Watch Events](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_watch-events_body)

Triggers when an envelope changes its status.

**Note**

This is available only for **Business Pro** DocuSign [eSignature pricing plan](https://www.docusign.com/products-and-pricing) and higher.

The webhook URL needs to be generated in Celonis platform and then added to DocuSign's integrations settings.

1. Add the Watch Events module to your Celonis platform Action Flow.
2. Generate and copy the webhook URL.
3. Log in to your DocuSign account.
4. Go to **Settings > Connect**.
5. Click **Add Configuration**, and select **Custom**.
6. Fill in the fields as follows:

   |  |  |
   | --- | --- |
   | **Name** | Enter the name of the webhook. |
   | **URL to Publish** | Enter the webhook URL you have copied in step 2 above. |
   | **Include** | Select the information that you want to include in the webhook. |
   | **Trigger Events** | Select events that will trigger the webhook and the **Watch Events** module in your Celonis platform Action Flow. |
7. Click the Add button () to save and close the dialog.

   Now, every time the specified events occur in your DocuSign account, the Watch Events module in your Celonis platform Action Flow is triggered.

   **Note**

   The module returns the data in the XML format. To further process the returned data, please add the **XML>Parse XML** module after the *Watch Events* module.

[##### Search Envelopes](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_search-envelopes_body)

Searches for envelopes by the filter settings.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account you want to search for envelopes. |
| **From Date** | Enter the date and time to start looking for status changes. |
| **To Date** | Enter the date and time to stop looking for status changes. |
| **Envelope IDs** | Add the envelope IDs to filter returned envelopes by. |
| **Transaction IDs** | Add the envelope transaction IDs to filter returned envelopes by. Transaction IDs are only valid for seven days. |
| **Status** | Select the envelope statuses you want to be included in the result. |
| **From To Status** | Select the envelope status that you are checking for. For example, if you select `Changed`, the module returns a list of envelopes that changed status during the `From date` to `To date` time period. |
| **Search** | Enter the search term you want to use to filter the list of returned envelopes. |
| **Order** | Select whether you want to return envelopes in ascending or descending order. |
| **Order By** | Select the property you want to sort returned envelopes by. |
| **Limit** | Set the maximum number of envelopes Celonis platform will return during one execution cycle. |
| **User Filter** | Returns envelopes where the authenticated user is the recipient, the sender, or the recipient only. |
| **Include in Response** | Select additional information to return about the envelopes.  - `Custom Fields`: The custom fields associated with the envelope. - `Documents`: The documents associated with the envelope. - `Attachments`: The attachments associated with the envelope. - `Extensions`: Information about the email settings associated with the envelope. - `Folders`: The folders where the envelope exists. - `Recipients`: The recipients associated with the envelope. - `Powerform`: The PowerForms associated with the envelope. - `Payment tabs`: The payment tabs associated with the envelope. |

[##### Get an Envelope Status](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_get-an-envelope-status_body)

Retrieves envelope details.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account that contains the envelope you want to retrieve details about. |
| **Envelope ID** | Enter (map) the ID of the envelope you want to retrieve details about. |
| **Include in Response** | Select additional information to return about the envelopes.  - `Custom Fields`: The custom fields associated with the envelope. - `Documents`: The documents associated with the envelope. - `Attachments`: The attachments associated with the envelope. - `Extensions`: Information about the email settings associated with the envelope. - `Folders`: The folders where the envelope exists. - `Recipients`: The recipients associated with the envelope. - `Powerform`: The PowerForms associated with the envelope. - `Tabs`: The tabs associated with the envelope. - `Payment tabs`: The payment tabs associated with the envelope. |

[##### Download a Document](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_download-a-document_body)

Downloads a specified document from the envelope.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account you want to download a document from. |
| **Envelope ID** | Enter (map) the ID or select the envelope that contains the document you want to download. |
| **Document ID** | Enter (map) the ID or select the document you want to download. |
| **Certificate** | Select the *No* option to exclude the envelope signing certificate from the download. |
| **Documents by User ID** | When the *Yes* option is selected, it allows the recipients to get documents by their user ID. For example, if a user is included in two different routing orders with different visibilities, using this option returns all of the documents from both routings. |
| **Encrypt** | When enabled, the PDF bytes returned in response are encrypted for all the key managers configured on your DocuSign account. |
| **Show Changes** | When set to *Yes*, any changed fields for the returned PDF are highlighted in yellow, and optional signatures or initials are outlined in red. |
| **Watermark** | When set to *Yes*, the account has the watermark feature enabled, and the envelope is not complete, the watermark for the account is then added to the PDF documents. This option can remove the watermark. |
| **Language** | Select the language of the Certificate of Completion in the output. |

[##### Get Envelope Form Data](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_get-envelope-form-data_body)

Downloads the envelope and field data from any in progress, completed, or canceled envelope that you sent or that is shared with you.

**Note**

To use this module, go to DocuSign *Settings* > *Sending Settings* and enable the *Allow sender to download form data* option. Otherwise, the `[400] This User lacks sufficient permissions` error will be returned.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account that contains the envelope you want to retrieve the form data from. |
| **Envelope ID** | Enter (map) the ID of the envelope you want to retrieve the form data from. |

[##### Send a Document to Sign](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_send-a-document-to-sign_body)

Sends a document to signers.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account that contains the envelope with the document you want to send in order to be signed. |
| **Draft** | Enable this option to save the envelope as a draft. If disabled, the envelope will be sent to recipients. |
| **Signers** | Add the signers you want to send the document to.  |  |  | | --- | --- | | **Email** | Enter the recipient's email address. The system sends notifications about the documents to be signed to this address. | | **Name** | Enter the full legal name of the recipient. Maximum Length: 100 characters. | | **Recipient ID** | Enter the ID you want to assign to the recipient.  Recipient ID is a local reference that senders use to map recipients to other objects, such as specific document tabs. Within an envelope, each `Recipient ID` must be unique, but there is no uniqueness requirement across envelopes. For example, many envelopes assign the first recipient a `Recipient ID` of `1`. | |
| **Add Access Code** | Enable this option, and enter the code.  If you enter a value, the recipient must enter the value as the access code to view and sign the envelope.  Maximum Length: 50 characters, and it must conform to the account's access code format setting.  If blank, but the signer `Access Code` property is set in the envelope, then that value is used.  If blank, and the signer `Access Code` property is not set, then the access code is not required. |
| **Note** | Enter a note that is sent to the recipient in the signing email. This note is unique to this recipient. In the user interface, it appears near the upper left corner of the document on the signing screen. Maximum Length: 1000 characters. |
| **Subject** | Enter the subject of the email used to send the envelope. |
| **Message** | Enter the content of the email blurb. |
| **Documents** | Add documents you want to send.  |  |  | | --- | --- | | **Source File** | Map the file you want to upload from the previous module (e.g., *HTTP > Get a File* or *Google Drive > Download a File*), or enter the file name and file data manually. | | **Document ID** | Specify a numeric ID that must be unique within the envelope. | |

[##### Send a Document From Template to Sign](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_send-a-document-from-template-to-sign_body)

Creates and sends an envelope from a template.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account that contains the envelope with the document template you want to send in order to be signed. |
| **Template** | Enter (map) or select the template you want to send a document from. |
| **Draft** | Enable this option to save the envelope as a draft. If disabled, the envelope will be sent to recipients. |
| **Subject** | Enter the subject of the email used to send the envelope. |
| **Message** | Enter the content of the email blurb. |
| **Template Recipients** | Add the signers of the document.  |  |  | | --- | --- | | **Email** | Enter the recipient's email address. The system sends notifications about the documents to be signed to this address. | | **Name** | Enter the full legal name of the recipient. Maximum Length: 100 characters. | | **Role Name** | Enter the role of the signer. For more details about templates please refer to the DocuSign's [Templates](https://developers.docusign.com/esign-rest-api/guides/concepts/templates) article. | |

[#### Other](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_UUID-b3e1cd93-d1df-1a62-cb37-b1afb530a829_body)

[##### Make an API Call](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_make-an-api-call_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your DocuSign module. |
| **Account** | Select the account you want to make an API call for. |
| **URL** | Enter a path relative to `https://<server>.docusign.net/restapi`.If you use `{accountId}` in the path, it will be replaced with the account ID from the selected account automatically.  For example: `/v1/org`.  **Note**  For the list of available endpoints, refer to the [DocuSign API Reference](https://developers.docusign.com/esign-rest-api/reference). |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we've already done that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[##### Example of Use - List Envelopes](#UUID-a23b535b-5677-f505-9dd5-4f8eb9b04b0d_id_example-of-use---list-envelopes_body)

The following API call returns envelopes from the specified date in your DocuSign account:

**URL**:

`/v2.1/accounts/{accountId}/envelopes/`

**Method**:

`GET`

**Query String**:

**Key:** `from_date`

**Value**: `YYYY-MM-DD` Specifies when the request begins checking for status changes for envelopes in the account.

|  |
| --- |
|  |

The result can be found in the module's **Output** under *Bundle* > *Body > envelopes.*

In our example, 6 envelopes were returned:

### Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/action-flows

# Action Flows in Celonis Platform

With Action Flows in Celonis Platform you can create powerful automations and combine them in processes to effectively achieve your desired goal.

Action Flows come with out-of-the-box integrations for native and multiple third-party applications and easy to design drag-and-drop interface which will allow you to set up your first integration in no time. Let us automate the mundane and repetitive tasks for you while you can focus your attention on the really important tasks.

**Tip**

To learn more about Action Flows, see the free online training track from Celonis Academy: [Build Action Flows](https://academy.celonis.com/learning-paths/build-action-flows) (6h).

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Modules for third-party apps](action-flow-modules-for-third-party-apps.html "Action Flow modules for third-party apps")
- [Modules for Celonis apps](celonis-apps.html "Action Flow modules for Celonis apps")


---

## automation/action-flows/action-flows-for-microsoft-apps

# Action Flows for Microsoft apps

We provide Action Flows for various Microsoft products.

- [Microsoft 365 Calendar](microsoft-365-calendar.html "Microsoft 365 Calendar")
- [Microsoft 365 Email](microsoft-365-email--outlook---action-flow-.html "Microsoft 365 Email (Outlook) (Action Flow)")
- [Microsoft 365 Excel](microsoft-365-excel--action-flow-.html "Microsoft 365 Excel (Action Flow)")
- [Microsoft Dynamics 365](microsoft-dynamics-365--action-flow-.html "Microsoft Dynamics 365 (Action Flow)")
- [Microsoft Power Automate](microsoft-power-automate--action-flow-.html "Microsoft Power Automate (Action Flow)")
- [Microsoft Power BI](microsoft-power-bi--action-flow-.html "Microsoft Power BI (Action Flow)")
- [Microsoft SharePoint Online](microsoft-sharepoint-online.html "Microsoft SharePoint Online (Action Flow)")
- [Microsoft SQL Server (Action Flow)](/document/preview/836056#UUID-c53ce2cb-1147-8a4a-e63e-9855be416090)Microsoft SQL Server (Action Flow)
- [Microsoft Teams](microsoft-teams--action-flow-.html "Microsoft Teams (Action Flow)")
- [Microsoft Word Templates](microsoft-word-templates.html "Microsoft Word Templates")


---

## automation/action-flows/action-flows-in-process-orchestration

# Action Flow modules in Process Orchestration

Orchestration Engine Process Steps can reference Action Flow. These perform a variety of actions. The modules are used to link apps and services together.

To learn more about Action Flow, see [Action Flows in Celonis Platform](https://docs.celonis.com/en/action-flows.html) and [Action Flow modules](https://docs.celonis.com/en/action-flow-modules.html).

There are several different types of  Action Flow Action Flow modules available for Orchestration Engine, including Forms, and Process Orchestration.

|  |
| --- |
|  |

Orchestration Engine has different types of Action Flow modules.

Expand all

[## Orchestration modules](#UUID-88c6417d-adf8-4aba-db3a-765ed2a9cae2_section-idm234942621448205_body)

The orchestration modules are responsible for interactions between Orchestration Engine and Action Flows. These modules allow the two applications to communicate. They are used as triggers, mid triggers, updates of process context, or for notifications when an Action Flows's execution is complete.

[## Completion modules](#UUID-88c6417d-adf8-4aba-db3a-765ed2a9cae2_section-idm234942632527092_body)

The completion modules are responsible for sending notifications to Orchestration Engine when an Action Flow is finished. They also send event data that is saved in the process context of the running Process Orchestration instance. For this, they need the instance ID from the starter module and the Event that is an outcome of running the Action Flow step.

- **Completion Event** - the module is used for sending notifications about a completed Action Flows.
- **Start New Orchestration** - the module can be used as a trigger for a new Process Orchestration instance. Using the module, you can connect with any other application. When such a connection is configured, any signals or actions from the connected app work as triggers for the orchestration.

  **Tip**

  In the Start New Orchestration module, you can set your custom ID of the Signal Event. You can reference this ID the Get Context module to learn what digital processes were started by what event instance.

[## Forms modules](#UUID-88c6417d-adf8-4aba-db3a-765ed2a9cae2_section-idm234942641487968_body)

Orchestration Engine is integrated with [Form.io](https://form.io/), which provides a solution for building a variety of forms from a variety of components. Using the pre-built forms Action Flow modules, you can include forms in your automation scenarios.

- **Submit Form Draft** - the module makes it possible to have a draft form version, before the submission. With this module, the form is autosaved as a draft, but it's not submitted yet - no submission event is sent. The recipient can update the form before they decide to submit. However, the module uses a dynamic form definition instead of raw JSON data.

  |  |
  | --- |
  |  |

- **Create Form Magic Link** - the module creates a link with a designed form, or multiple forms combined into one. The created magic link can be used to access the form through the web.

  |  |
  | --- |
  |  |
- **Get a Public Form Link** - the module is used to access the data from a form that was submitted, or saved as a draft, along with the specific schema of the submitted form. The module receives data about forms, and it returns this information:

  - the forms definition (schema) that is linked to the magic link
  - data that has been saved up to the specific point in time
  - metadata about the submission

  |  |
  | --- |
  |  |
- **Submit Form** - the module is used together with the Create Form Magic Link to generate a pre-populated form, which can be sent to a user. Using the module settings, you can map the fields between a form created in the OE Management Dashboard and the module in your Action Flow scenario. If you choose to map the fields, all the values are automatically added.

  |  |
  | --- |
  |  |
- **Submit form as JSON payload** - the module is used with Create Form Magic Link to generate a form. However, unlike the Submit Form module, it uses a raw data payload in a JSON format. You can use the mapping option, but it only maps the form's ID from the Create Form Magic Link module used in the Action Flow. You have to add the JSON payload manually.

  |  |
  | --- |
  |  |
- **Submit Raw Form Data Draft** - similarly to Submit Form Draft, the module makes it possible to have a draft form version, before the submission. With this module, the form is autosaved as a draft, but it's not submitted yet - no submission event is sent. The recipient can update the form before they decide to submit. However, the module uses a raw JSON data instead of a dynamic form definition.

  |  |
  | --- |
  |  |

[## Process Context Interaction modules](#UUID-88c6417d-adf8-4aba-db3a-765ed2a9cae2_section-idm234942652727338_body)

Process Context is a JSON object that contains information about an overall Orchestration Engine.

In Action Flow, the data for process context is sent from the **Resume Event** module when a scenario is completed. The data is then passed through the subsequent scenarios/process steps. However, Orchestration Engine can also use process context modules to search for process context and, also, to update the context in the middle of a scenario run.

- **Search Process Context** - the module is used to find process contexts related to a specific tenant. It uses criteria such as Process Orchestrations, event fields, and processing state.
- **Get Process Context** - the module is used to return an process context for the given instance ID. It fetches the current state of the process context.
- **Resume Event** - the module is used as a wake up trigger for a paused Process Orchestration instance.
- **Set Variable from Process Context** - the module is used for mapping process context data. Using the context data gathered throughout a running scenario requires mapping this context data while setting up new scenarios in the same Process Orchestration. You can do the mapping using the Set Variable from Process Context module that works with events fields in a type safe way. The mapping is based on selecting only the whole context object and the fields that you want to assign.

  In the module's configuration, you can select an event field that you want to use in the specific Process Orchestration and assign its output to an Action Flow Variable. You can also specify, if the module should throw an error if the event type's value isn't present. Both primitive and complex types can be assigned.

  The process context object mapping is supported for the Data object sent through the **Trigger Event** module, and the Context object from **Search Process Contexts** or **Get Process Context** modules.

  |  |
  | --- |
  |  |

  **Note**

  To make the **Set Variable from Process Context** module work, you need to select the Process Orchestration and an example of the Orchestration Engine instance that had run in the past. Orchestration Engine and instance ID allow to select the Event Type field that you want to extract.

## Related topics

- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Troubleshooting Action Flows in Orchestration Engine](troubleshooting-action-flows-in-orchestration-engine.html "Troubleshooting Action Flows in Orchestration Engine")
- [Action Flows](action-flows.html "Action Flows in Celonis Platform")


---

## automation/action-flows/action-flows-in-process-orchestration-3255387

# Action Flow modules in Process Orchestration

Orchestration Engine Process Steps can reference Action Flow. These perform a variety of actions. The modules are used to link apps and services together.

To learn more about Action Flow, see [Action Flows in Celonis Platform](https://docs.celonis.com/en/action-flows.html) and [Action Flow modules](https://docs.celonis.com/en/action-flow-modules.html).

There are several different types of  Action Flow Action Flow modules available for Orchestration Engine, including Forms, and Process Orchestration.

|  |
| --- |
|  |

Orchestration Engine has different types of Action Flow modules.

Expand all

[## Orchestration modules](#UUID-270bbed8-8369-8919-14f7-02d3ce5fb245_section-idm234942621448205_body)

The orchestration modules are responsible for interactions between Orchestration Engine and Action Flows. These modules allow the two applications to communicate. They are used as triggers, mid triggers, updates of process context, or for notifications when an Action Flows's execution is complete.

[## Completion modules](#UUID-270bbed8-8369-8919-14f7-02d3ce5fb245_section-idm234942632527092_body)

The completion modules are responsible for sending notifications to Orchestration Engine when an Action Flow is finished. They also send event data that is saved in the process context of the running Process Orchestration instance. For this, they need the instance ID from the starter module and the Event that is an outcome of running the Action Flow step.

- **Completion Event** - the module is used for sending notifications about a completed Action Flows.
- **Start New Orchestration** - the module can be used as a trigger for a new Process Orchestration instance. Using the module, you can connect with any other application. When such a connection is configured, any signals or actions from the connected app work as triggers for the orchestration.

  **Tip**

  In the Start New Orchestration module, you can set your custom ID of the Signal Event. You can reference this ID the Get Context module to learn what digital processes were started by what event instance.

[## Forms modules](#UUID-270bbed8-8369-8919-14f7-02d3ce5fb245_section-idm234942641487968_body)

Orchestration Engine is integrated with [Form.io](https://form.io/), which provides a solution for building a variety of forms from a variety of components. Using the pre-built forms Action Flow modules, you can include forms in your automation scenarios.

- **Submit Form Draft** - the module makes it possible to have a draft form version, before the submission. With this module, the form is autosaved as a draft, but it's not submitted yet - no submission event is sent. The recipient can update the form before they decide to submit. However, the module uses a dynamic form definition instead of raw JSON data.

  |  |
  | --- |
  |  |

- **Create Form Magic Link** - the module creates a link with a designed form, or multiple forms combined into one. The created magic link can be used to access the form through the web.

  |  |
  | --- |
  |  |
- **Get a Public Form Link** - the module is used to access the data from a form that was submitted, or saved as a draft, along with the specific schema of the submitted form. The module receives data about forms, and it returns this information:

  - the forms definition (schema) that is linked to the magic link
  - data that has been saved up to the specific point in time
  - metadata about the submission

  |  |
  | --- |
  |  |
- **Submit Form** - the module is used together with the Create Form Magic Link to generate a pre-populated form, which can be sent to a user. Using the module settings, you can map the fields between a form created in the OE Management Dashboard and the module in your Action Flow scenario. If you choose to map the fields, all the values are automatically added.

  |  |
  | --- |
  |  |
- **Submit form as JSON payload** - the module is used with Create Form Magic Link to generate a form. However, unlike the Submit Form module, it uses a raw data payload in a JSON format. You can use the mapping option, but it only maps the form's ID from the Create Form Magic Link module used in the Action Flow. You have to add the JSON payload manually.

  |  |
  | --- |
  |  |
- **Submit Raw Form Data Draft** - similarly to Submit Form Draft, the module makes it possible to have a draft form version, before the submission. With this module, the form is autosaved as a draft, but it's not submitted yet - no submission event is sent. The recipient can update the form before they decide to submit. However, the module uses a raw JSON data instead of a dynamic form definition.

  |  |
  | --- |
  |  |

[## Process Context Interaction modules](#UUID-270bbed8-8369-8919-14f7-02d3ce5fb245_section-idm234942652727338_body)

Process Context is a JSON object that contains information about an overall Orchestration Engine.

In Action Flow, the data for process context is sent from the **Resume Event** module when a scenario is completed. The data is then passed through the subsequent scenarios/process steps. However, Orchestration Engine can also use process context modules to search for process context and, also, to update the context in the middle of a scenario run.

- **Search Process Context** - the module is used to find process contexts related to a specific tenant. It uses criteria such as Process Orchestrations, event fields, and processing state.
- **Get Process Context** - the module is used to return an process context for the given instance ID. It fetches the current state of the process context.
- **Resume Event** - the module is used as a wake up trigger for a paused Process Orchestration instance.
- **Set Variable from Process Context** - the module is used for mapping process context data. Using the context data gathered throughout a running scenario requires mapping this context data while setting up new scenarios in the same Process Orchestration. You can do the mapping using the Set Variable from Process Context module that works with events fields in a type safe way. The mapping is based on selecting only the whole context object and the fields that you want to assign.

  In the module's configuration, you can select an event field that you want to use in the specific Process Orchestration and assign its output to an Action Flow Variable. You can also specify, if the module should throw an error if the event type's value isn't present. Both primitive and complex types can be assigned.

  The process context object mapping is supported for the Data object sent through the **Trigger Event** module, and the Context object from **Search Process Contexts** or **Get Process Context** modules.

  |  |
  | --- |
  |  |

  **Note**

  To make the **Set Variable from Process Context** module work, you need to select the Process Orchestration and an example of the Orchestration Engine instance that had run in the past. Orchestration Engine and instance ID allow to select the Event Type field that you want to extract.

## Related topics

- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Troubleshooting Action Flows in Orchestration Engine](troubleshooting-action-flows-in-orchestration-engine.html "Troubleshooting Action Flows in Orchestration Engine")
- [Action Flows](action-flows.html "Action Flows in Celonis Platform")


---

## automation/action-flows/action-flow-snippets

# Action Flow snippets

Action Flow snippets are highly reusable small chunks of automation that you can insert into your existing Action Flow to quickly enhance your automation workflow.

Expand all

[## Add data received by a Webhook to Sheet](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567629298274_body)

Use this snippet to:

- receive data sent to Webhook
- manipulate received data
- write data into preconfigured Google Spread Sheet

For more information on how to set up an Action Flow using this snippet, see [Add data received by a Webhook to Sheet](add-data-received-by-a-webhook-to-sheet.html "Add data received by a Webhook to Sheet").

|  |
| --- |
|  |

[## Change Data in SAP](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567635515915_body)

Use this snippet to:

- consolidate data
- filter output
- change Sales Order

For more information on how to set up an Action Flow using this snippet, see [Change data in SAP](change-data-in-sap.html "Change data in SAP").

|  |
| --- |
|  |

[## Create CSV File from Celonis Output](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567759616258_body)

Use this snippet to:

- consolidate data
- build a CSV file
- send email with attached CSV file

For more information on how to set up an Action Flow using this snippet, see [Create CSV File from Celonis Output](create-csv-file-from-celonis-output.html "Create CSV File from Celonis Output").

|  |
| --- |
|  |

[## Creating an HTML table and sending it using Mail](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567771152401_body)

Use this snippet to:

- consolidate data
- build HTML snippet
- inform stakeholders

For more information on how to set up an Action Flow using this snippet, see [Creating an HTML table from a Celonis Query Data output](creating-an-html-table-from-a-celonis-query-data-output.html "Creating an HTML table from a Celonis Query Data output").

|  |
| --- |
|  |

[## Filter and Forward Emails](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567774301847_body)

Use this snippet to:

- watch emails of specific sender
- filter emails on a phrase
- forward the emails

For more information on how to set up an Action Flow using this snippet, see [Filter and Forward Emails](filter-and-forward-emails.html "Filter and Forward Emails").

|  |
| --- |
|  |

[## Notify about new Table Rows](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm23456777654918_body)

Use this snippet to:

- watch Excel file
- build HTML snippet
- notify recipient

For more information on how to set up an Action Flow using this snippet, see [Notify about new Table Rows](notify-about-new-table-rows.html "Notify about new Table Rows").

|  |
| --- |
|  |

[## Push CSV to Data Integration](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567779089859_body)

Use this snippet to:

- collect data
- push data to the Celonis Platform

For more information on how to set up an Action Flow using this snippet, see [Push CSV to Data Integration](push-csv-to-data-integration.html "Push CSV to Data Integration")

|  |
| --- |
|  |

[## Route data to employee](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567802473837_body)

Use this snippet to:

- consolidate data
- prepare data for sending
- get right assignee
- forward message to the right assignee

For more information on how to set up an Action Flow using this snippet, see [Route Data to Employee](route-data-to-employee.html "Route Data to Employee").

|  |
| --- |
|  |

[## Remind daily in Teams Channel](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567805015167_body)

Use this snippet to:

- send reminder in Teams channel
- schedule on a daily basis

For more information on how to set up an Action Flow using this snippet, see [Remind Daily in Teams Channel](remind-daily-in-teams-channel.html "Remind Daily in Teams Channel").

|  |
| --- |
|  |

[## Send Email by Celonis](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567807396996_body)

Use this template to:

- consolidate data
- build HTML snippet
- trigger skill and send mail by Celonis

For more information on how to set up an Action Flow using this snippet, see [Send Email created by Celonis](topic-file-names--html-.html "Send Email created by Celonis").

|  |
| --- |
|  |

[## Send Google Sheets update using Slack](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567819372162_body)

Use this template to:

- watch Google Sheets for new rows
- send Slack message

For more information on how to set up an Action Flow using this snippet, see [Send Sheet update via Slack](send-sheet-update-via-slack.html "Send Sheet update via Slack").

|  |
| --- |
|  |

[## Forward Parameters to Machine Learning Script](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm234567822235544_body)

Use this template to:

- create data structure to forward parameters
- trigger a Machine Learning script with parameters

For more information on how to set up an Action Flow using this snippet, see [Forward Parameters to Machine Learning Script](forward-parameters-to-machine-learning-script.html "Forward Parameters to Machine Learning Script").

|  |
| --- |
|  |

[## Trigger an Action Flow from ML Workbench](#UUID-4e140c75-d21e-0b19-f8e6-5c3f4924a7db_section-idm2345678241583_body)

Use this template to:

- set up an ML script that triggers an Action Flow
- set up data structure to receive and work with that data

For more information on how to set up an Action Flow using this snippet, see [Trigger an Action Flow from ML Workbench](trigger-an-action-flow-from-ml-workbench.html "Trigger an Action Flow from ML Workbench").

|  |
| --- |
|  |


---

## automation/action-flows/action-flows-notifications

# Action Flow notifications

Subscribe to notification emails to stay connected and up to date with your Action Flows.

Notifications are available for:

- **Errors**: Get notified of errors encountered by specific modules in your Action Flows that keep your workflows from running smoothly.
- **Warnings**: Get notified of warnings encountered by your Action Flows that need your attention, such as failure to connect with your apps and services.
- **Deactivations**: Get notified when your Action Flows get deactivated due to critical issues, such as multiple consecutive errors.

Email notifications for errors and warnings are sent on different schedules. The first error or warning triggers an email to be sent. After the first error or warning, subsequent emails are sent containing all errors and warnings in the following intervals:

- **Errors**: Email is sent every 5 minutes with a link to the scenario history where users can access the details of any new errors.
- **Warnings:** Email is sent every 15 minutes with a link to the scenario history where users can access the details of any new warnings.

Notification settings apply only to your user and are defined at the package level. By default, only the user who created the Action Flow will be subscribed to notifications for errors and deactivations. Other users can subscribe on demand.

Expand all

[## Managing your Action Flow notifications](#UUID-4b80de36-b752-36bc-217a-5e74c85f25a3_section-id23550455559059_body)

To manage your Action Flow notifications:

1. In Studio, go to your package and click **Package Settings**.

   |  |
   | --- |
   |  |
2. Toggle the notification types to which you want to subscribe and toggle off the ones about which you don't want to receive emails.

   |  |
   | --- |
   |  |

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/action-flows-terms-and-limitations

# Action Flows terms and limitations

Here's an explanation of some of the terminology used across Action Flows.

- **Audit logs storage (12 months)**

  The time for which Celonis Platform stores audit logs for Action Flow executions. For more information, see [Audit log](action-flows-audit-logs.html "Audit logs for Action Flows").
- **Maximum file size**

  An Action Flow module can be used to download or upload a file up to 2GB. Memory-intensive modules, like text parsers or string replacement, process data directly within your active RAM. Because of that, the data limitation is dependent on your infrastructure's memory rather than the size of the processed files.

  Some modules can accept a file in their input and/or yield a file in their output. If the maximum file size is exceeded, Celonis proceeds in accordance with the [settings of the enable data loss option](settings-panel.html "Configuring Action Flows settings").
- **Execution time (60 min)**

  The maximum time for which a single Action Flow can run. Maximum Action Flow execution time should not exceed 60 minutes. If execution time is exceeded, the Action Flow will fail with a timeout error. For more information, see [Action Flow execution, cycles, and phases](action-flow-execution,-cycles,-and-phases.html "Action Flow execution, cycles, and phases").

  **Note**

  Ongoing module executions are not interrupted immediately. The actual execution time until timeout might be higher.
- **Minimum interval between scheduled Action Flows (1 min)**

  The minimum interval is the shortest possible time in-between two successive scheduled Action Flow runs. The minimal interval is 1 minute. You can set the interval in the [schedule settings](setting-up-action-flows-in-studio.html#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-PublishScheduleyourActionFlow "4. Publish Action Flow").

  **Note**

  This is not effective when scheduling is set to immediately (instant triggers).
- **Outbound Emails**

  Action Flows do not set limits on the number of outbound emails sent. However, please keep in mind that some limitations may be set by your setup or infrastructure, such as infrastructure / throughput availability (# of workers available to run scenarios), 3rd party API limits (API rate limit for Gmail, e-mail, Microsoft 365, or other service) or a limit related to the account used for a specific application.
- **Returned records limit (3200 records)**

  Several Action Flows modules have a maximum limit of 3200 records for their output. This limit is necessary in order to avoid being blocked by the services we connect to. There are a few exceptions to this limit, such as the Google Sheets module. It is important to keep this limit in mind when extracting large amounts of data using these modules.
- **Timezone (UTC+00)**

  The default time zone for all Action Flow scheduling is UTC+00. This time zone is not affected by Daylight Saving Time and it remains unchanged all year round.
- **Webhook queue size (10k executions)**

  All incoming webhooks are stored in a Webhook queue. The queue can start filling up when the Action Flow responsible for processing the webhooks is disabled (e.g. due to an error) or is processing the webhooks at a slower rate than they are being received. The maximum size of a single input/output webhook queue is 10,000 executions. We define an execution as automated record creation, update, or deletion that takes place in the Operational System (ERP, CRM, database, etc.) as a result of running an Action Flow.

  For more information, see [Webhooks](webhooks--action-flow-.html "Webhooks (Action Flow)").


---

## automation/action-flows/action-flow-templates

# Action Flow blueprints

Action Flow blueprints are reusable templates you can use as stand-alone automation workflows or use to fill out part of your own custom automation setup.

Based on their scope, we distinguish the following types of Action Flow blueprints:

- **Action Flow snippets** - these are small and highly reusable pieces of workflow that you can drop into an existing Action Flow. Snippets are also perfect for starting your automation. An example of such automation could be a snippet that monitors a document and sends updates about any changes to the team over Slack. For more snippets, see [Action Flow snippets](action-flow-snippets.html "Action Flow snippets").

  |  |
  | --- |
  |  |

  Example of an Action Flow snippet
- **Use case templates** - these are end-to-end automation workflows that can serve stand-alone automation. Use Case templates are great if you want to save time on crafting your custom Action Flow and want to focus on the output of your automation. For more use case templates, see [Use case templates](use-case-templates-for-action-flows.html "Use case templates for Action Flows").

  Example of a use case template for route communication.

**Related topics:**

- [Exporting and Importing Blueprints](https://docs.celonis.com/en/how-to-deal-with-blueprints.html)


---

## automation/action-flows/action-network--action-flow-

# Action Network (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Action Network module enables seamless automation and data management between Celonis Platform and the Action Network CRM. Use this module to bridge the gap between process intelligence and member engagement by automating three core functions: automated member management, data synchronization, and action orchestration.

Expand all

[## Before you begin](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_id_getting-started-with-action-network_body)

Before you start working with the Action Network module, make sure you have the following:

- Action Network account. If you do not have one, you can create an Action Network account at [actionnetwork.org/users/sign\_up](https://actionnetwork.org/users/sign_up).

[## Connecting the Action Network to Celonis Platform](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-4b07330b-7281-2c77-56d3-cac3708ebf62_body)

To connect your Action Network account to Celonis platform you need to obtain the API Key from your Action Network account and insert it in the **Create a connection** dialog in the Celonis platform module.

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Action Network**.
3. Click **Create a connection**.

   1. In a separate window, login to your Action Network account.
   2. Click **Details** > **API & Sync** and select the list to view the API information.
   3. Copy the API Key to your clipboard.
   4. Go to **Celonis platform** and open the Action Network module's *Create a connection* dialog.
   5. In the **Connection name** field, enter a name for the connection.
   6. In the **API Token** field, enter the API token copied in step 4 and click **Continue**.

   The connection has been established. You can proceed with setting up the module.

[## Types of Action Network modules](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-ad27a45c-f9c1-ce0b-9f40-3a296410c2b3_body)

Action Network modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

[### Get a Person](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_id_get-a-person_body)

Returns information about the chosen person.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Action Network account](action-network--action-flow-.html#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-4b07330b-7281-2c77-56d3-cac3708ebf62 "Connecting the Action Network to Celonis Platform"). |
| **Person ID** | Select the Person ID whose details you want to retrieve. |

[### Create a Person](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_id_create-a-person_body)

Creates a new person.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Action Network account.](action-network--action-flow-.html#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-4b07330b-7281-2c77-56d3-cac3708ebf62 "Connecting the Action Network to Celonis Platform") |
| **Email Address** | Add the email address of the person whose account you are creating:  |  |  | | --- | --- | | **Email Address** | Enter the email address of the person. | | **Primary** | Select whether this is the primary email address:  - *Yes* - *No* - *Not defined* | | **Status** | Select the status of the email address:  - *Subscribed* - *Unsubscribed* | |
| **Postal Addresses** | Add the address of the person:  |  |  | | --- | --- | | **Primary** | Select whether this is the primary address of the person:  - *Yes* - *No* - *Not defined* | | **Address Line** | Enter the street address of the person. | | **Locality** | Enter the city name of the person. | | **Region** | Enter the state name of the person, | | **Postal Code** | Enter the area postal code. | | **Country** | Enter the person's country name. | | **Latitude** | Enter the person's location's latitude details. | | **Longitude** | Enter the person's location's longitude details. | | **Accuracy** | Select the accuracy of the location:  - *Approximate* - *Rooftop* | |
| **Given Name** | Enter the name of the person. |
| **Family Name** | Enter the family name of the person. |
| **Main Language Spoken** | Select the language spoken by the person. |

[### Update a Person](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_id_update-a-person_body)

Updates information about a chosen person.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Action Network account](action-network--action-flow-.html#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-4b07330b-7281-2c77-56d3-cac3708ebf62 "Connecting the Action Network to Celonis Platform"). |
| **Person ID** | Select the Person ID whose details you want to update. |
| **Email Address** | Add the email address of the person whose account you are creating.  |  |  | | --- | --- | | **Email Address** | Enter the email address of the person. | | **Primary** | Select whether this is the primary email address:  - *Yes* - *No* - *Not defined* | | **Status** | Select the status of the email address:  - *Subscribed* - *Unsubscribed* | |
| **Postal Addresses** | Add the address of the person:  |  |  | | --- | --- | | **Primary** | Select whether this is the primary address of the person:  - *Yes* - *No* - *Not defined* | | **Address Line** | Enter the street address of the person. | | **Locality** | Enter the city name of the person. | | **Region** | Enter the state name of the person, | | **Postal Code** | Enter the area postal code. | | **Country** | Enter the person's country name. | | **Latitude** | Enter the person's location's latitude details. | | **Longitude** | Enter the person's location's longitude details. | | **Accuracy** | Select the accuracy of the location:  - *Approximate* - *Rooftop* | |
| **Primary** | Select whether this is the primary address of the person:  - *Yes* - *No* - *Not defined* |
| **Address Line** | Enter the street address of the person. |
| **Locality** | Enter the city name of the person. |
| **Region** | Enter the state name of the person, |
| **Postal Code** | Enter the area postal code. |
| **Country** | Enter the person's country name. |
| **Latitude** | Enter the person's location's latitude details. |
| **Longitude** | Enter the person's location's longitude details. |
| **Accuracy** | Select the accuracy of the location:  - *Approximate* - *Rooftop* |
| **Given Name** | Enter the name of the person. |
| **Family Name** | Enter the family name of the person. |
| **Main Language Spoken** | Select the language spoken by the person. |

[### Make an API Call](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-1c856898-2d4e-c853-3ad2-78192b2f0eca_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Action Network account](action-network--action-flow-.html#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_UUID-4b07330b-7281-2c77-56d3-cac3708ebf62 "Connecting the Action Network to Celonis Platform"). |
| **URL** | Enter a path relative to `https://actionnetwork.org/api`. For example: `/v2/people`  **Note**  For the list of available endpoints, refer to the [Action Network API Documentation](https://actionnetwork.org/docs). |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Example of Use - List People](#UUID-ca900f89-8b90-9c7d-7283-12bb5e4dc955_section-idm4596504324712032860590247954_body)

The following API call returns all the people from your Action Network account:

URL:

`/v2/people`

Method:

`GET`

Matches of the search can be found in the module's Output under Bundle > Body > embedded.

In our example, 11 people were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/activetrail--action-flow-

# ActiveTrail (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The ActiveTrail module enables seamless integration between Celonis Action Flows and the ActiveTrail marketing automation platform. By leveraging this module, organizations can bridge the gap between process intelligence and customer engagement, triggering sophisticated multi-channel communication workflows—including Email, SMS, and WhatsApp—directly from real-time process data.

Expand all

[## Before you begin](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_section-id23549751930076_body)

In order to use ActiveTrail with Celonis Platform, it is necessary to have an ActiveTrail account. If you do not have one, you can create an ActiveTrail account at <https://app.activetrail.com/Public/Login.aspx?>.

[## Connecting ActiveTrail to Celonis platform](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496_body)

To connect your ActiveTrail account to Celonis platform , you need to obtain the API Key from your ActiveTrail account and insert it in the **Create a connection** dialog in the Action Flow module.

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **ActiveTrail**.
3. Click **Create a connection**.

   1. In a separate window, log in to your ActiveTrail account.
   2. Click **More** > **Integrations** > **API** > **Apps**.
   3. Click **New** and enter the details for the app. Click **Save** and copy the Access Token.
   4. In the ActiveTrail module's settings, click **Create a connection**.
   5. In the **API Key** field, enter the Access Token copied in previous steps.
   6. Click **Save**.

   The connection has been established. You can proceed with setting up the module.

[## Types of ActiveTrail modules](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-48c4782d-8bc8-3dfb-8ea1-23b6f9bbe392_body)

ActiveTrail modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

### Actions

[#### Add a Member to a Group](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_add-a-member-to-a-group_body)

Updates a member or creates a new member in a group and sends a campaign if provided.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Group ID** | Select the Group ID to which you want to add the member. |
| **Email address** | Enter the email address of the member. |
| **Mobile Number** | Enter the mobile number of the member. |
| **Set contact to 'Do not contact' status?** | Select *Yes* if you want the status of the member as *Do not contact*:  - *Yes* - *No* - *Not defined* |

[#### Create/Update Contact](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_createupdate-contact_body)

Creates a new contact or updates an existing contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Email** | Enter the email address of the contact. |
| **SMS** | Enter the number to which the messages will be sent to the contact. |
| **First Name** | Enter the first name of the contact. |
| **Last Name** | Enter the last name of the contact. |
| **Anniversary** | Enter the wedding anniversary date of the customer. |
| **Birthday** | Enter the birth date of the customer. |
| **City** | Enter the city name of the customer. |
| **Fax** | Enter the fax details of the customer. |
| **Phone 1** | Enter the primary contact number of the customer. |
| **Phone 2** | Enter the secondary contact number of the customer. |
| **Street** | Enter the street name of the customer contact address. |
| **Zip Code** | Enter the zip code of the customer contact address. |
| **ext1 to ext 25** | Enter the extension number of the customer. You can enter up to 25 extension numbers. |
| **date1 to date5** | Enter the important dates for the customer. You can enter up to five dates. |
| **num1 to num5** | Enter the contact numbers of the customer. You can enter up to five numbers. |
| **Set as 'Do Not Mail?'** | Select *Yes* if no email has to be sent to the customer:  - *Yes* - *No* - *Not defined* |
| **Is deleted** | Select *Yes* if the customer has been deleted:  - *Yes* - *No* - *Not defined* |

[#### Delete a Contact](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_delete-a-contact_body)

Removes a contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **ID** | Enter the Contact ID you want to delete. |

[#### Get a Contact](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_get-a-contact_body)

Gets a contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **ID** | Enter the Contact ID whose details you want to retrieve. |

[#### Remove a Member from a Group](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_remove-a-member-from-a-group_body)

Removes a member from a group.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Group ID** | Select the Group ID whose member you want to remove from the group. |
| **Member ID** | Enter the Member ID you want to remove from the group. |

[#### Send SMS](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_send-sms_body)

Sends a text message (SMS) to a contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Message name (will be shown in your account)** | Enter a name for the message. |
| **Sender name (will be shown in the SMS message title)** | Enter the name that displays as title of the message. |
| **Message contents** | Enter the message text. |
| **Mobile number** | Enter the mobile number to which the message will be sent. |
| **Add unsubscribe link?** | Select if you want add a link for unsubscribing in the message. |

### Searches

[#### List Contacts](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_list-contacts_body)

Gets a list of contacts.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Limit** | The maximum number of contacts Celonis platform should return during one Action Flow execution cycle. |
| **Search Text** | Enter any information about the contacts you want to list. |

[#### List Groups](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_list-groups_body)

Select a specific group in your account.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Limit** | The maximum number of groups Celonis platform should return during one Action Flow execution cycle. |
| **Search Text** | Enter any information about the group which you want to list. |

[### Watch Campaigns](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_watch-campaigns_body)

Triggers an operation when a new campaign is added to the account.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Limit** | The maximum number of transactions Celonis platform should return during one Action Flow execution cycle. |
| **Search Text** | Enter the keywords based on which triggers will be sent when a new campaign is added to the account. |
| **From Date** | Enter the date from which you want to watch the campaigns. |
| **To Date** | Enter the date until which you want to watch the campaigns. |

[### Watch for contact unsubscribed](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_watch-for-contact-unsubscribed_body)

Triggers when a contact unsubscribes.

|  |  |
| --- | --- |
| **Webhook Name** | Enter the name for webhook. |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Webhook Name** | Enter the webhook name that appears to the end user. |

[### Watch for Automation Step](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_watch-for-automation-step_body)

Triggers when a contact moves a step inside an automation.

|  |  |
| --- | --- |
| **Webhook Name** | Enter the name for webhook. |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Webhook Name** | Enter the webhook name that appears to the end user. |

[### Watch for Contact Added to a Group](#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_id_watch-for-contact-added-to-a-group_body)

Triggers when a contact is added to a group.

|  |  |
| --- | --- |
| **Webhook Name** | Enter the name for webhook. |
| **Connection** | [Establish a connection to your ActiveTrail account](activetrail--action-flow-.html#UUID-9e4ea7e4-99d5-9b13-d31a-69dd3143fe72_UUID-2db4fc68-a0c7-4620-d68c-580c6a548496 "Connecting ActiveTrail to Celonis platform"). |
| **Webhook Name** | Enter the webhook name that appears to the end user. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/adding-action-flows-to-process-orchestration

# Adding Action Flows to Process Orchestration

Action Flows in Celonis Platform are automated workflows built from a series of modules that define how data should be transferred and transformed between apps and services. You can use Action Flows as building blocks for Process Orchestration steps.

Expand all

[## Adding Action Flows to Process Orchestration](#UUID-b548f37d-fbd7-8458-bfdc-a5ba24ccbd5d_section-id235284870615629_body)

1. In Studio, go to your Process Orchestration and click **Edit**.

   If you haven’t created one yet, see [Creating Orchestration Engine overview](creating-orchestration-engine-overview.html "Creating Orchestration Engine overview").
2. In your Process Orchestration, click the plus icon and select Process step.
3. From the process step panel on the right, select **Add event**.

   The edit process step screen opens. Here’s where you can view all Action Flows compatible with your Process Orchestration. You can directly access the individual Action Flows to make changes, activate them, or check their status.
4. Select from existing Action Flows, or create a new one:

   - To **create a new Action Flow**:

     1. Select **Create Action Flow**.
     2. Give the Action Flow a name and description.
     3. Select **Create**.

        Your Action Flow is created with the following predefined settings to make it immediately available for use in Process Orchestration:

        - set to **on-demand**
        - contains the **dpInstanceId** input
        - contains the **Completion Event** module
     4. Go to your Action Flow - publish it and make it active.
     5. Go back to your Process Orchestration and from the list of available Action Flows, select the one you've just created.

        **Tip**

        If you can't see your Action Flow on the list, refresh the edit process step view.
     6. Select **Next**.
   - To **add an existing Action Flow**:

     1. From the list of available Action Flows, select the one you want to use as a process step.

        When adding or editing a step, you can see a list of all Action Flows available for a given Process Orchestration. You can directly access the individual Action Flows to make changes, activate them, or check their status.
     2. Click **Next**.

Action Flows created this way are immediately available for use within Process Orchestration. We advise to test your setup before deploying it. See [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration").

## Related topics

- [Action Flow modules in Process Orchestration](action-flows-in-process-orchestration.html "Action Flow modules in Process Orchestration")
- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")
- [Troubleshooting Action Flows in Orchestration Engine](troubleshooting-action-flows-in-orchestration-engine.html "Troubleshooting Action Flows in Orchestration Engine")


---

## automation/action-flows/airtable--action-flow-

# Airtable (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Airtable module in Celonis Action Flows provides a flexible, collaborative layer between your enterprise process data and agile business operations. By integrating Airtable’s relational database capabilities, you can manage manual inputs, track human-in-the-loop tasks, and store auxiliary data that may not exist in your core ERP or CRM systems.

Expand all

[## Before you begin](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-id235497534400655_body)

To get started with Airtable, create an account at [airtable.com/signup.](https://airtable.com/signup)

Refer to the [Airtable REST API Documentation](https://airtable.com/api) for a list of available endpoints.

[## Connecting Airtable to Celonis Platform](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm4563662555955234035328689191_body)

You can connect Airtable apps in Celonis platform in the following ways:

- [Connect using OAuth](airtable--action-flow-.html#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm4615619576900833563877747589 "Connect using OAuth")
- [Connect using Personal Access Token](airtable--action-flow-.html#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-c7aab668-9dfe-3fcf-7a9d-3eb45e504ee2 "Connect using Personal Access Token")

[### Connect using OAuth](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm4615619576900833563877747589_body)

To connect Airtable using OAuth:

1. Log in to your Celonis platform account, open the Airtable module Action Flow, click the **Add** button next to the **Connection type** field, and select **Airtable OAuth**.
2. (optional) In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show Advanced Settings** and enter the client credentials created in the section, [Getting Airtable OAuth credentials](airtable--action-flow-.html#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-46631d81-fc63-1038-f1bd-02f07bac8f62 "Getting Airtable OAuth credentials").
4. Click **Save**.
5. In the Authentication screen, click **Add a base** and select the base to which you want to grant access.
6. Click **Grant access**.

You have successfully connected the Airtable app with Celonis platform.

[### Connect using Personal Access Token](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-c7aab668-9dfe-3fcf-7a9d-3eb45e504ee2_body)

You can connect Airtable apps using personal access token values from your Airtable account.

1. Log in to your Airtable account.
2. Click **Your Profile Icon** > **Developer hub**.
3. Click **Personal access tokens > Create new token.**
4. Enter a name for the access token, select the Scopes, Access, and click **Create token**.

   Note: Users should choose at least the following most frequently required scopes: `data.records:read`, `data.records:write`, and `schema.bases:read`
5. Copy the Personal Access Token to a safe place, and click **Done**.
6. Log in to your Celonis platform account, open the Airtable module Action Flow, click the **Add** button next to the **Connection type** field, and select the connection type as **Airtable Token or Key**.
7. Optional: In the **Connection name** field, enter a name for the connection.
8. Select the token type as **Personal Access Token** and enter the token copied in step 5 above.
9. Optional: Click **Show Advanced Settings**and select the proxy service in the **Proxy** field.

   **Note**

   By choosing a Proxy, you understand and confirm that your Airtable data, including personal access tokens, will be routed through a third-party service.
10. Click **Save**.

You have successfully established the connection. You can now edit your Action Flow and add more Airtable modules.

[## Getting Airtable OAuth credentials](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-46631d81-fc63-1038-f1bd-02f07bac8f62_body)

If you enable an OAuth connection in the Airtable module, you must provide the relevant OAuth information from your Airtable instance. To get this information, do the following:

1. Log in to your Airtable account.
2. Click **Profile** > **Developer hub**.
3. Click **OAuth integrations** > **Register new OAuth integration**.
4. Enter the name for the integration and OAuth redirect URL: `https://auth.redirect.celonis.cloud/oauth/cb/airtable3`.
5. Click **Generate client secret**.
6. Copy the Client ID and Client Secret to a safe place.
7. Select the scopes, enter the support information, and click **Save changes**.

You have successfully created OAuth credentials.

[## Types of Airtable modules](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm45698188818320340353316389_body)

Airtable modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

### Records

You can watch, create, update, search, retrieve, upsert, delete records, and watch responses using the following modules.

[#### Watch Records](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-f050c479-33e1-61bf-8502-0dc27efebcff_body)

Returns all newly created or updated records in a view (required **Created Time** or **Last Modified Time** fields).

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base that contains the table you want to watch for records. |
| **Table** | Select the table you want to watch for new records. |
| **Trigger configuration** | **Trigger field**  Select the `Created Time` option to watch for new records or the `Last Modified Time` option to watch for modified records.  If you do not have a `Created Time` or `Last Modified Time` field in your scheme, we ask you to create one. Without this field, the trigger will not work correctly.    **Label field**: used as a label for a record. For example, **Status** dialog. |
| **Limit** | The maximum number of records Celonis platform will return during one execution cycle. |
| **View** | Select the view to watch the records. If selected, it will return the records only in that view. |
| **Formula** | Enter the formula to filter records. For more details, refer to the [Formula field reference documentation](https://support.airtable.com/hc/en-us/articles/203255215-Formula-Field-Reference).  The formula will be evaluated for each record, and if the result is not `0`, `false`, `""`, `NaN`, `[]`, or `#Error!`, includes the record in the response.  If combined with the `view` parameter, it returns only records in that view that satisfy the formula.  For example, to only include records where Name isn't empty, pass in `NOT({Name} = '')` as a parameter like this:  `filterByFormula=NOT%28%7BName%7D%20%3D%20%27%27%29` |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Watch Responses](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-37f19803-1eae-1746-8146-29e9f9ee3f1b_body)

Triggers when a new response is submitted.

**Warning**

Available for paid ***Pro Plan*** only. See the [Airtable pricing page](https://airtable.com/pricing).

The webhook URL needs to be generated in Celonis platform and added to the form configuration in the Airtable.

1. Add the Watch Responses module to your Celonis platformAction Flow.
2. Generate and copy the webhook URL.
3. Log in to your Airtable account.
4. Open the *Base* and the *table* you want for the form and create a *Form view*.
5. Set the form as needed, scroll down the form, and enable the *Redirect to URL after the form is submitted* option.
6. Enter the Webhook URL generated in step 2 to the displayed dialog box and add the *?record\_id={record\_id}* just after the webhook URL to include the *Record ID* in the module's output, then click Save.
7. Go back to your Celonis platformAction Flow and run the *Watch Responses* module **only** to load the Record ID from Airtable and to be able to map that field into the other modules.

   Note: Airtable only supports sending the `record_id` parameter.
8. Submit the form in Airtable where the *Redirect to URL after the form is submitted* option is enabled and the Webhook URL is added (step 6 above).

   The Watch Responses module is triggered and loads the Record ID.
9. Add the *Airtable > Get a Record* module just after the *Airtable > Watch Responses* module and map the *record\_id* to the *Record ID* field.

Every time the form is submitted, the *Watch Responses* module in your Celonis platformAction Flow is triggered, and the *Get a Record* module returns the submitted form details.

[#### Search Records](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_search-records_body)

Searches for specific records or returns all records.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select or map the base that contains the table you want to search for records. |
| **Table** | Select the table you want to search for records. |
| **Formula** | Enter the formula to filter records. For more details about formulae, refer to the [Formula field reference documentation](https://support.airtable.com/hc/en-us/articles/203255215-Formula-Field-Reference). The formula will be evaluated for each record, and if the result is not `0`, `false`, `""`, `NaN`, `[]`, or `#Error!`, includes the record in the response.  If combined with the `view` parameter, returns only the records in that view that satisfy the formula.  For example, to only include records where Name isn't empty, pass in `NOT({Name} = '')` as a parameter like this:  `filterByFormula=NOT%28%7BName%7D%20%3D%20%27%27%29` |
| **Sort** | Specify sorting, if needed. The higher item in the list has precedence. |
| **View** | Select or map the view for the search results. |
| **Output Fields** | Add the fields you want to receive in the output. If no field is provided, all fields will be returned. It can be the field's name, for example, `Email`, or the field's ID, for example, `fldzuOSozlM84fYV3`. |
| **Limit** | Set the maximum number of records Celonis platform will return during one execution cycle. The default value is 10. |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Get a Record](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_get-a-record_body)

Retrieves a single record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base that contains the table with the record whose details you want to retrieve. |
| **Table** | Select the table that contains the record whose details you want to retrieve. |
| **Record ID** | Enter (map) the Record ID whose details you want to retrieve. Alternatively, you can use the search option to select the record. |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Create a Record](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_create-a-record_body)

Creates a new record in a Airtable.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base containing the table you want to create a record. |
| **Table** | Select the table in which you want to create a record. |
| ***Record*** | Enter values to the desired fields. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types). |
| **Smart links** | Enable this option if you want to enter names instead of record IDs to fields that link to another table. The record is automatically created in the linked table if there is no match. |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Update a Record](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_update-a-record_body)

Updates a record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base containing the table whose records you want to update. |
| **Table** | Select the table whose record you want to update. |
| **Records ID** | Enter (map) the Record ID you want to update. You can retrieve the ID, for example, using the *Search Records* or *Watch Records* module. Alternatively, you can use the **Search** button to select the Record ID. |
| ***Record*** | Enter values in the fields you want to update. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types).  **Note**  To delete the content of the field, use the `erase` function. |
| **Smart links** | Enable this option if you want to enter names instead of record IDs to fields that link to another table. The record is automatically created in the linked table if there is no match. |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Upsert a Record](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_upsert-a-record_body)

Creates a new or updates an existing record.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base containing the table you want to update or create a record. |
| **Table** | Select the table where you want to create or update a record. |
| **Record ID** | Enter (map) the ID of the record you want to update. If no ID is entered, it will create a new record. You can retrieve the ID, for example, using the *Search Records* or *Watch Records* module. Alternatively, you can use the **Search** button to select the Record ID.  If you enter an ID that does not exist, an error occurs, and no action is performed. |
| ***Record*** | Enter values in the fields you want to update or create. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types). |
| **Smart links** | Enable this option if you want to enter names instead of record IDs to fields that link to another table. The record is automatically created in the linked table if there is no match. |
| **Use Column ID** | Select whether to use column ID instead of column name for mapping.  This enables persistence over the column name change. Enabling this option allows to replace entity keys in the response; instead of entity names specified as parameter keys, their identifiers will be specified. Changing this value will break all existing mappings in this Action Flow. |

[#### Delete a Record](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_delete-a-record_body)

Deletes a record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Base** | Select the base that contains the table you want to delete a record from. |
| **Table** | Select the table you want to delete the record from. |
| **Record ID** | Enter the ID of the record you want to delete. You can retrieve the ID, for example, using the *Search Records* or *Watch Records* module. Alternatively, you can use the **Search** button to select the Record ID. |

[#### Bulk Create Records (advanced)](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm2203440035156886_body)

Creates multiple records.

|  |  |
| --- | --- |
| **Create Records in Bulk** | Select the input method:  - Enter manually - Select from the list |
| **Base** | Select the base that contains the table you want to create records in. |
| **Table** | Select the table in which you want to create the records. |
| **Records** | Enter values in the fields you want to create. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types). |

[#### Bulk Update Records (advanced)](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm2203440031733632_body)

Updates multiple existing records.

|  |  |
| --- | --- |
| **Update Records in Bulk** | Select the input method:  - Enter manually - Select from the list |
| **Base** | Select the base containing the table whose records you want to update. |
| **Table** | Select the table in which you want to update the records. |
| **Records** | Enter values in the fields you want to update. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types). |

[#### Bulk Upsert Records (advanced)](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_section-idm2203440030769826_body)

Upserts multiple records.

|  |  |
| --- | --- |
| **Upsert Records in Bulk** | Select the input method:  - Enter manually - Select from the list |
| **Base** | Select the base that contains the table you want to delete a record from. |
| **Table** | Select the table from which you want to delete the record. |
| **Fields to Merge on** | Enter at least one and at most three field names or IDs to uniquely identify a single record. |
| **Records** | Enter values in the fields you want to update or create. [See also Airtable's guide to basic field types](https://support.airtable.com/hc/en-us/articles/203229705-Guide-to-the-basic-field-types). |

[#### Bulk Delete Records (advanced)](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_UUID-06a70904-6542-d3bc-3b72-e39362d5acf8_body)

Deletes multiple records.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **Delete Records in Bulk** | Select the input method:  - Enter manually - Select from the list |
| **Base** | Select the base that contains the table you want to delete the records from. |
| **Table** | Select the table from which you want to delete the records. |
| **Record ID** | Enter the IDs of the record you want to delete. You can retrieve the IDs, for example, using the *Search Records* or *Watch Records* module. Alternatively, you can use the **Search** button to select the Record IDs. |

### Other

You can list bases, table schemas, and call APIs using the following modules.

[#### Make an API Call](#UUID-4b43c06d-3d6f-944a-de18-73a65e6b9b92_id_make-an-api-call_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Airtable account. |
| **URL** | Enter a path relative to `https://api.airtable.com/`. For example, `/v0/{base_id}/{table_id}`.  **Note**  For the list of available endpoints, refer to the [Airtable REST API Documentation](https://airtable.com/api). |
| **Method** | Select the HTTP method you want to use:  - **GET**  to retrieve information for an entry. - **POST**  to create a new entry. - **PUT**  to update/replace an existing entry. - **PATCH**  to make a partial entry update. - **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

##### Example of Use - List Records

The following API call returns all records in the specified table in your Airtable account:

**URL**:

`/v0/{base_id}/{table_id}`

**Method**:

`GET`

Search results can be found in the module's **Output** under **Bundle > Body > records**.

In our example, 4 records were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/alexa-internet--action-flow-

# Alexa Internet (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Alexa Internet modules allow you to get, and list the URL info, traffic history, category browse, category listings, site linkings in your Alexa Internet account.

**Important**

Amazon discontinued the Alexa Internet service on May 1, 2022.

Expand all

[## Before you begin](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_section-id235497609833043_body)

In order to use Alexa Internet with Celonis platform, it is necessary to have an Alexa Internet account. If you do not have one, you can create an Alexa Internet account at [https://alexa.com/signup](https://www.alexa.com/plans).

[## Connecting Alexa Internet to Celonis platform](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e_body)

To connect your Alexa Internet account to Celonis platform, you need to obtain your API Key.

1. Access the Alexa Internet website, <https://www.alexa.com/>.
2. Click the *API* link at the bottom of the website page.
3. Click *Alexa Web Information Service*.
4. Click *Continue to Subscribe*.
5. Enter your AWS account credentials to subscribe.
6. You will receive an activation link to your email ID. Click the link to activate and login to your API account.
7. Once you log in, copy the *API Key* to your clipboard.
8. Go to **Celonis platform** and open the Alexa Internet module's *Create a connection dialog*.
9. In the *Connection name* field, enter a connection name.
10. In the *API Key* field, enter the API Key you have copied in step 7 and click *Continue*.

You have successfully established the connection.

[## Types of Alexa Internet modules](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_section-id235497610665006_body)

Alexa Internet modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

[### Get](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-f6f7388e-887c-f1bc-c10f-bcb918d776fd_body)

[#### Get URL Info](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_id_get-url-info_body)

Retrieves information about the given URL.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Website Address** | Enter the website URL address whose details you want to retrieve. |

[#### Get Traffic History](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_id_get-traffic-history_body)

Get the details of the URL's traffic history.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Website Address** | Enter the website URL address whose details you want to retrieve. |
| **Start at** | Enter the date in YYYYMMDD format for which you want to retrieve the traffic history details. |

[#### Get a Category Browse](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_id_get-a-category-browse_body)

Gets the details of category browse by path.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Path** | Enter the path of the category browse whose details you want to retrieve. For example, Top/Arts. |

[### List](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-bacf6daf-fb8b-9d1b-5e82-e953d56f44f7_body)

[#### List Category Listings](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_id_list-category-listings_body)

Retrieves a list of all category listings by path.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Path** | Enter the path of the category browse whose details you want to retrieve. For example, Top/Arts. |
| **Sort By** | Select the option to sort the category listings:  - *Popularity* - *Title* - *Average Review* |
| **Limit** | The maximum number of category listings Celonis platform should return during one Action Flow execution cycle. |

[#### List Site Linkings](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_id_list-site-linkings_body)

Retrieves a list of all websites linking to a given website.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Website Address** | Enter the website URL address whose site links you want to list. |
| **Limit** | The maximum number of site links Celonis platform should return during one Action Flow execution cycle. |

[### Make an API Call](#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-adda0957-7263-ea7b-37eb-2c70f521556d_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Alexa Internet account](alexa-internet--action-flow-.html#UUID-f1efe958-f8d8-855f-a9ea-b92593f70343_UUID-e487b79a-98d6-1d80-c626-5bfb03a66c1e "Connecting Alexa Internet to Celonis platform"). |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

For the list of available endpoints, refer to the [Alexa Internet API Documentation](https://awis.alexa.com/developer-guide).

#### Example - Get details from the Site

Following API call returns the information requested from the site:

Matches of the search can be found in the module's **Output** under *Bundle* > *Body.*

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/archive--action-flow-

# Archive (Action Flow)

The Archive Action Flow module allows you to perform operations on compressed archives so that they can be processed further by other Action Flow modules. Use it to extract, compress, or resize archived data to meet your workflow requirements

Expand all

[## Adding the Archive module to your Action Flow](#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_section-id235497645628203_body)

To add your Archive module to your automation:

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Archive**.

Your module is added to the Action Flow. Start configuring it. See [Types of Archive modules](archive--action-flow-.html#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_id_actions "Types of Archive modules")

[## Types of Archive modules](#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_id_actions_body)

[### Extract an archive](#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_id_extract-an-archive_body)

This action module extracts files from an archive. These files can be further processed using other apps/module

|  |  |
| --- | --- |
| **Source file** | Select the file you want to extract. It can be retrieved from a previous module (e.g. Dropbox, email, etc.) |

#### Example of an Action Flow with an Archive module

Get the ZIP file from the defined Dropbox folder (e.g. *Archives*), extract it using the *Archive* module and send extracted files to the desired email address as attachments with the email or gmail module.

[### Transformers](#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_id_transformers_body)

#### Inflate

|  |  |
| --- | --- |
| **Data** | Enter the data you want to decompress using the inflate function. |

#### Deflate

|  |  |
| --- | --- |
| **Data** | Enter the data you want to compress using the deflate function. |

[### Aggregators](#UUID-5ecbbb3a-52c1-fdd2-b263-98d05ac921c6_id_aggregators_body)

#### Create an archive

Adds the desired files to a ZIP or TAR archive.

|  |  |
| --- | --- |
| **Source module** | Select the module you want to retrieve the files from. |
| **Type** | Select whether you want to add files to a ZIP archive or a TAR archive. |
| **Archive name** | Enter a name for the created archive. Do not add an extension. |
| **Source file** | Map the source file or select the radiobutton with the file source. |

#### Example

Watch incoming emails using the Gmail *Watch emails* module. If an email is received, its attachments are iterated into individual bundles then archived to the ZIP file and saved to the defined Dropbox folder.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/automation-anywhere--action-flow-

# Automation Anywhere (Action Flow)

Automation Anywhere is a Robotic Process Automation (RPA) platform that enables you to automate manual, repetitive desktop tasks such as data entry, file transfers, and complex calculations by deploying software "bots" that mimic human interactions with user interfaces.

By combining RPA with Action Flows, you can:

- leverage your existing bots and take targeted action by intelligently triggering them based on insights from Celonis Platform.
- automate your entire landscape by combining API-led automation and UI-led automation in one Action Flow.

Take a look at our video on [RPAs and Action Flows](https://academy.celonis.com/learn/video/rpas-and-action-flows).

Expand all

[## About the Automation Anywhere module](#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_section-idm4562675442822433154695850959_body)

Using Action Flows, users can trigger an Automation Anywhere bot from Celonis Platform. They have two options:

- Simply trigger a bot and allow it to run.
- Trigger a bot and wait for the results

In the first case, you trigger a bot to run and immediately move on with the execution of the subsequent modules. You typically use this when you don't require the bot outputs in subsequent modules in the Action Flow.

In the second case, you trigger a bot and wait for the result. That is, you trigger a bot to execute, you wait for the result, and just then move on with execution of subsequent modules. You typically use this when you need the output of the bot in subsequent modules in the Action Flow.

This page explains how to:

- set up a connection between the action flows and Automation Anywhere cloud platform.
- configure and trigger a bot.

### Example

This example shows how to leverage the Celonis Platform intelligence of Action Flows and UI automation capabilities of Automation Anywhere to automatically remove the payment blocks on invoices:

1. Use the Celonis Platform Query Data module to identify all the invoices with missing tax and currency information. Those invoices would have a payment block.
2. Trigger an Automation Anywhere bot to open those invoices and automatically collect all the required data points.
3. Use the Automation Anywhere bot execution result as an input to write back to SAP. Remove the payment block if the bot executed successfully or create a task for an employee if the bot failed.

[## Before you begin](#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_section-idm4562675626044833154619495385_body)

To use Automation Anywhere with Celonis Platform you need to:

- install the Automation Anywhere Control Room to create and configure a bot that Action Flows in Celonis Platform can trigger.
- have a bot runner license.
- configure a default device.

[## Connect Automation Anywhere (Cloud) with Celonis platform](#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_UUID-7092eeb8-141c-21cd-762d-390f890c627f_body)

1. Log in to your Celonis platform and add a module from the Automation Anywhere (Cloud) app into a Celonis platform Action Flow .
2. Click **Add** next to the **Connection** field.
3. In the **Connection name** field, enter a name for the connection.
4. In the **Control Room URL** field, enter your control room URL address in the `http://<domain>.my.automationanywhere.digital` format. This is a URL address used to access your Automation Anywhere application.
5. In the **Username** field, enter your account's username field.
6. You can authenticate the Automation Anywhere account either by using API key or your account password. In the **Authentication Method** field, select the option and enter the value to authenticate the account.

   - In the **API Key** field, enter the API key generated in your account. Using API keys is a way to authenticate an application accessing the API, without referencing an actual user (for example, in the organizations that support SSO). The app adds the key to each API request, and the API can use the key to identify the application and authorize the request. Users can generate an API key in the AA control room. See [how to generate the API key](https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/control-room/control-room-api/cloud-control-room-apikey-role.html).
   - In the **Password** field, enter your account's password.
7. Click **Continue**.

You have successfully established the connection and can now build Action Flows .

[## Types of Automation Anywhere modules](#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_section-id235499109222376_body)

[### Trigger a Bot](#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_UUID-d7861828-1484-3b99-bb90-518b69913004_body)

Triggers a configured bot from Automation Anywhere.

This module allows you to trigger the bot that was configured in your Automation Anywhere Control Room and execute it on the user’s default device. Only unattended automation is possible at this point.

Prerequisites to deploy or trigger a bot:

- **View and Run my bots** feature permissions
- **Run and schedule** permissions for the folder that contains bots
- Access to Bot Runner licensed users
- Access to either a default device or a device pool

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Automation Anywhere (Cloud) account](automation-anywhere--action-flow-.html#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_UUID-7092eeb8-141c-21cd-762d-390f890c627f "Connect Automation Anywhere (Cloud) with Celonis platform"). |
| **Type of Action** | Select the action type for the bot:  - *Trigger the Bot*: deploys a bot on the user’s default device and doesn’t wait for the Bot execution results to proceed with the execution of the next Action Flow Apps. - *Trigger and Wait for Bot Result*: deploys a bot on the user’s default device and waits for the Bot execution results to proceed with the execution of the Action Flow. The Bot execution results can be used as an input in the next Apps in the flow. |
| **Bot** | Select or map the bot (created and pre-configured in Automation Anywhere) you want to trigger and enter the details in the fields that auto-populate based on the selected bot.    **Map** function allows a user to map a value from one of the previous modules instead of selecting a Bot from the dropdown list.  For example, to dynamically define which bot has to be triggered based on the conditions fulfilled or not in the previous apps of the flow.  If there are any input variables configured for the bot in your Automation Anywhere account, they would be shown in the app when you select the bot. Users can either enter the data manually or use the output values from the previous apps. |

### Make an API Call

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Automation Anywhere account](automation-anywhere--action-flow-.html#UUID-7bcd06b5-d04a-16a8-3c1a-beaf601e4d54_UUID-7092eeb8-141c-21cd-762d-390f890c627f "Connect Automation Anywhere (Cloud) with Celonis platform"). |
| **URL** | Enter a path relative to `https://<example>.my.automationanywhere.digital/`. For example, `/v2/devices/pools/list`. |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the request query string. |

#### Example of Use - List Device Pools

The following API call returns the device pools from your Automation Anywhere (Cloud) account:

**URL**

`/v2/devices/pools/list`

**Method**

`POST`

Matches of the search can be found in the module's Output under **Bundle > Body > list**.

In our example, 1 device pool is returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/aws-s3--action-flow-

# AWS S3 (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The AWS S3 module for Action Flows enables seamless integration between your Celonis process insights and Amazon Simple Storage Service (S3). This module allows you to automate file management tasks such as uploading reports, retrieving datasets, or organizing objects directly within your automated workflows.

By using this module, you can bridge the gap between process triggers and cloud storage, ensuring that critical data is archived, shared, or handed off to downstream AWS services (like Lambda or Glue) without manual intervention.

Expand all

[## Before you begin](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_section-id235497662644272_body)

To use the AWS S3 module, you must have an AWS S3 account.

[## Connecting the AWS S3 module to Celonis platform](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4_body)

To connect AWS S3 to Celonis platform you must connect your AWS account to Celonis platform. To do so, you'll first need to create an API user in [AWS IAM](https://console.aws.amazon.com/iam/home).

1. In your AWS IAM, go to **Identity** > **Access Management** > **Access Management** > **Users**.
2. Click **Add User** to add a new user.
3. Enter the name of the new user and select the **Programmatic access** option in the **Access type** section.
4. Add the **AmazonS3FullAccess** permission policy to the user using **Attach existing policies directly** and click **Next**.
5. Go through the other dialog screens and click **Create User**.
6. Find the provided *Access key ID* and *Secret access key.*
7. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
8. Click **Add module** and from the list select **AWS S3**.
9. Click **Create a connection**.
10. Enter the *Access key ID* and *Secret access key* from previous step and click **Continue** to establish the connection.

The connection has been established. You can proceed with setting up the module.

[## Types of AWS S3 module](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-39e9dc86-ab23-309d-ba0c-a54f35bbc628_body)

AWS S3 modules are categorized by their functional role within a workflow. Use the following reference to understand the configuration requirements and specific capabilities for each module group.

[### Create Bucket](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_create-bucket_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Name** | Enter the name of the new bucket. |
| **Region** | Select your [regional endpoint](https://docs.aws.amazon.com/general/latest/gr/rande.html). |

[### Get File](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_get-file_body)

Downloads a file from a bucket.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Region** | Select the [regional endpoint.](https://docs.aws.amazon.com/general/latest/gr/rande.html) |
| **Bucket** | Select the bucket you want to download the file from. |
| **Path** | Enter the path to the file, e.g. `/photos/2019/February/image023.jpg`. |

[### Upload File](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_upload-file_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Region** | Select your [regional endpoint](https://docs.aws.amazon.com/general/latest/gr/rande.html). |
| **Folder**(optional) | Specify the target folder, e.g. `work/Celonis platform`. |
| **Source file** | Provide the source file you want to upload to the bucket. |
| **Headers**(optional) | Insert request headers. Available headers can be found in the [AWS S3 documentation - PUT object](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPUT.html). |

[### Make an API Call](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_make-an-api-call_body)

For a detailed API description please refer to the [Amazon S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html).

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Region** | Select your [regional endpoint](https://docs.aws.amazon.com/general/latest/gr/rande.html). |
| **URL** | Enter a host URL. The path must be relative to `https://s3.<selected-region>.amazonaws.com/`. |
| **Method** | Select one of the HTTP methods you want to use in your API call. |
| **Headers** | Add a [request header](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonRequestHeaders.html). You can use the following *common request headers*. For more request headers refer to [AWS S3 API Documentation](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectOps.html).  **Note**  You don't have to add authorization headers; Celonis platform already did that for you.  |  |  | | --- | --- | | Header Name | Description | | `Content-Length` | Length of the message (without the headers) according to RFC 2616. This header is required for PUTs and operations that load XML, such as logging and ACLs. | | `Content-Type` | The content type of the resource, in case the request content is in the body. Example: `text/plain`. | | `Content-MD5` | The base64 encoded 128-bit MD5 digest of the message (without the headers) according to RFC 1864. This header can be used as a message integrity check to verify that the data is the same data that was originally sent. Although it is optional, we recommend using the Content-MD5 mechanism as an end-to-end integrity check. For more information about REST request authentication, go to [REST Authentication](https://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html?r=1821) in the *Amazon Simple Storage Service Developer Guide*. | | `Date` | The current date and time according to the requester. Example: `Wed, 01 Mar 2006 12:00:00 GMT`. When you specify the `Authorization` header, you must specify either the `x-amz-date` or the `Date` header. | | `Expect` | When your application uses 100-continue, it does not send the request body until it receives an acknowledgment. If the message is rejected based on the headers, the body of the message is not sent. This header can be used only if you are sending a body.  Valid Values: 100-continue | | `Host` | For path-style requests, the value is `s3.amazonaws.com`. For virtual-style requests, the value is `BucketName.s3.amazonaws.com`. For more information, go to [Virtual Hosting](https://docs.aws.amazon.com/AmazonS3/latest/dev/VirtualHosting.html) in the *Amazon Simple Storage Service Developer Guide*.  This header is required for HTTP 1.1 (most toolkits add this header automatically); optional for HTTP/1.0 requests. | | `x-amz-content-sha256` | When using signature version 4 to authenticate the request, this header provides a hash of the request payload. For more information see [Signature Calculations for the Authorization Header: Transferring Payload in a Single Chunk (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html). When uploading an object in chunks, set the value to STREAMING-AWS4-HMAC-SHA256-PAYLOAD to indicate that the signature covers only headers and that there is no payload. For more information, see [Signature Calculations for the Authorization Header: Transferring Payload in Multiple Chunks (Chunked Upload) (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-streaming.html). | | `x-amz-date` | The current date and time according to the requester. Example: `Wed, 01 Mar 2006 12:00:00 GMT`. When you specify the `Authorization` header, you must specify either the `x-amz-date` or the `Date` header. If you specify both, the value specified for the `x-amz-date` header takes precedence. | | `x-amz-security-token` | This header can be used in the following Action Flows:  - Provide security tokens for Amazon DevPay operations. Each request that uses Amazon DevPay requires two `x-amz-security-token` headers: one for the product token and one for the user token. When Amazon S3 receives an authenticated request, it compares the computed signature with the provided signature. Improperly formatted multi-value headers used to calculate a signature can cause authentication issues. - Provide a security token when using temporary security credentials. When making requests using temporary security credentials you obtained from IAM, you must provide a security token using this header. To learn more about temporary security credentials, go to [Making Requests](https://docs.aws.amazon.com/AmazonS3/latest/dev/MakingRequests.html).  This header is required for requests that use Amazon DevPay and requests that are signed using temporary security credentials. | |
| **Query strings** | Add the desired query strings such as parameters or form fields. |
| **Body** | Enter the API call body content. |

[#### List Files](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_list-files_body)

Returns a list of files from a specified location.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Region** | Select your [regional endpoint](https://docs.aws.amazon.com/general/latest/gr/rande.html). |
| **Bucket** | Select the Amazon S3 bucket you want to search for files. |
| **Prefix**(optional) | Path to a folder to lookup files in, e.g. `Celonis platform/work`. |

[#### List Folders](#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_id_list-folders_body)

Returns a list of folders from a specified location.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your AWS S3 account](aws-s3--action-flow-.html#UUID-c8f559fc-f50e-fc50-8bf3-4a4811973599_UUID-5928be45-7dc3-b662-13dd-a0099d9bb6b4 "Connecting the AWS S3 module to Celonis platform"). |
| **Region** | Select your [regional endpoint](https://docs.aws.amazon.com/general/latest/gr/rande.html). |
| **Bucket** | Select the Amazon S3 bucket you want to search for folders. |
| **Prefix**(optional) | Path to a folder to lookup folders in, e.g. `Celonis platform/work`. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/calling-process-copilots-from-action-flows

# Calling Process Copilots from Action Flows

The “Call Process Copilot” module in Action Flows is used to create custom messages that are passed in real-time to your Process Copilot assets. This module connects your Action Flows to your Process Copilots, allowing you to access your LLM data and perform queries from within your Action Flow. This module can be configured by selecting an existing connection and the Process Copilot you want to connect to from this Action Flow. You can then create the custom message you want to send using both plain text and Action Flow variables.

When the Action Flow is executed, the responses from the Process Copilot are displayed automatically and include the response, the reasoning, and the conversation ID. These calls can also be tracked on the [Process Copilot Monitoring](process-copilot-monitoring.html "Process Copilot Monitoring") screen.

Expand all

[## Before you begin](#UUID-4af727fe-7d7d-4cad-6b25-c0f6e12736e2_section-id235430478137059_body)

To successfully configure the “Call Process Copilot” module in Action Flows, you will need to have the following assets:

- Action Flow connection
- Published Process Copilot instance
- OAuth application with the following [OAuth scopes](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform") assigned to it:

  - studio.packages:read
  - intelligence.conversations:write
- OAuth application with identical permissions as the ones assigned to your data model
- App Key with the USE and EDIT permissions assigned on the Studio Package where the Process Copilot being linked to was created.

  **Note**

  Providing the USE and EDIT [permissions](available-permissions.html "Available Celonis Platform permissions") on the package allows the module to automatically list your available Process Copilots in the dropdown in the Action Flow configuration window.

  If you prefer not to grant EDIT permissions, you can manually enter the <package-key>.<asset-key> to link to your Process Copilot.

[## Connecting the Action Flow to your Process Copilot](#UUID-4af727fe-7d7d-4cad-6b25-c0f6e12736e2_section-id235430478929975_body)

1. Open the Action Flow you want to use to connect to one of your existing Process Copilots.
2. Add a new module and click to add an app.
3. Click **Celonis app** and then select “Call Process Copilot”.
4. In the configuration window, select an existing connection from the dropdown or create a new one. See [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows").
5. Use the dropdown to select the specific Process Copilot to which you want to connect.

   If there are no existing Process Copilots on the list:

   1. In Studio, next to your Process Copilot, click **Options** (three dots).
   2. Select **Key**.
   3. Copy the Process Copilot key to the clipboard.
   4. In your Process Copilot module, paste this key into the **Process Copilot** field.
6. In the **Message** field, enter the text of the message you want to send to the Process Copilot selected above. You can also use the pop up window to add variables and functions to the message.
7. Click **Save** to close the window and exit back to your Action Flow.
8. Click the **Save** icon to save the changes to the Action Flow.
9. Run the Action Flow to verify the connection. If the connection is successful, the response to your message is displayed, including the initial message, the ID of the Process Copilot that created the response, and the unique conversation ID.

   **Note**

   The conversation ID can also be used to view this response on the [Process Copilot Monitoring](process-copilot-monitoring.html "Process Copilot Monitoring") page.

## Related Topics

- [Configuring your Process Copilots](set-up-process-copilots.html "Configuring your Process Copilots")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")
- [Process Copilot Monitoring](process-copilot-monitoring.html "Process Copilot Monitoring")


---

## automation/action-flows/configuring-and-using-actions-in-views--action-flows,-augmented-attributes,-emails-

# Configuring and using Actions in Views

With the new Studio experience, you can now configure and use View actions such as sending emails, running action flows from within a View, and updating augmented attributes. These actions can be configured within a table component, allowing app userslect cells and then either send an email using that data or click to start an action flow / automated process running based on it.

In this example, both a send email and an action flow have been configured for this table:

|  |
| --- |
|  |

For detailed information on adding Actions to Studio component, see [Actions](actions-in-celonis-platform.html "Actions in Celonis Platform").

## Related topics

- [Views](creating-views.html "Creating and configuring Views")
- [Components](view-components.html "View components")
- [Charts](creating-charts.html "Creating charts")


---

## automation/action-flows/connecting-action-flows-and-process-orchestration

# Connecting Action Flows and Process Orchestration

You can use Action Flows as building blocks for Process Orchestration. Action Flows in Celonis Platform are automated workflows built from a series of modules that indicate how data should be transferred and transformed between apps and services.

Once you add Process Orchestration to your Studio package, it will be immediately available for use in dedicated Action Flow modules. However, in some cases, you might need to establish a connection between the Orchestration Engine and Action Flows manually. This is necessary when you create an Action Flow first and then decide to add it to Process Orchestration.

Expand all

[## Connecting Action Flow with Process Orchestration manually](#UUID-f6cb4782-37bf-0fb7-7bd9-26e3c5f85f3b_section-id235233250858784_body)

Adding Process Orchestration to your Studio package makes it instantly available for use in Action Flows. If, however, you create Action Flow first and then decide to connect it to Process Orchestration, you must manually establish the connection between the two.

1. **Create an OAuth client**  with the necessary scopes. For step-by-step instructions on how to add a new OAuth client to Celonis Platform, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform"). The minimum required scopes for the Orchestration Engine are:

   - *orchestration-engine*
   - *studio* (knowledge-models:query, knowledge-models.augmented-attributes:update, studio, triggers:manage).
2. **Give your new client package permissions**. In Studio, find the listing for the relevant package within the relevant space and click the associated three dots on the far right to open up the Permissions associated with the package.

   Search for the name of your OAuth client as a user, and in the Template column, select "All Permissions" and save.
3. Add a Process Orchestration module, for example, a Completion Event, to Action Flow.
4. In your module, open the connection configuration - select **Add** in the connections section. You'll see the **Create a connection** window.

   |  |
   | --- |
   |  |
5. Enter the **Client ID** and the related Client **Secret**.

   - You can copy and paste the ID and the secret created in [Step 1](connecting-action-flows-and-process-orchestration.html#UUID-f6cb4782-37bf-0fb7-7bd9-26e3c5f85f3b_N1776865013057 "Step 1").
6. Choose the environment with which you want to establish the connection.
7. Select **Save** to create the connection.

You've connected Action Flow with your Orchestration Engine.

## Related topics

- [Action Flow modules in Process Orchestration](action-flows-in-process-orchestration.html "Action Flow modules in Process Orchestration")
- [Adding Action Flows to Process Orchestration](adding-action-flows-to-process-orchestration.html "Adding Action Flows to Process Orchestration")
- [Troubleshooting Action Flows in Orchestration Engine](troubleshooting-action-flows-in-orchestration-engine.html "Troubleshooting Action Flows in Orchestration Engine")


---

