# Automation: Action Flows (Part 2)

## automation/action-flows/coupa--action-flow-

# Coupa (Action Flow)

The Coupa modules enable you to grant or reject approvals, and update or add approvers to requisitions in your Coupa account.

Expand all

[## Before you begin](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_section-id235513186227037_body)

To get started with Coupa, create an account at [Coupa.com](http://www.coupa.com).

[## Connecting Coupa to Celonis platform](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_Connect_body)

To connect your Coupa account to Celonis platform you need to obtain the client credentials from the Integrations section of your Coupa account.

1. Log in to your Coupa account.
2. Click **Setup > Integration > OAuth2/OpenID Connect Clients**. Alternatively, use the search option to locate OAuth2/OpenID Connect Clients.
3. Click **Create**.
4. Enter the details as provided in the table below and click **Save**.

   |  |  |
   | --- | --- |
   | **Grant Type** | Select Client credentials. |
   | **Name** | Enter the app's name. |
   | **JWK URI** | Enter the following redirect URI:  `https://auth.redirect.celonis.cloud/oauth/cb/coupa` |
   | **Login** | Enter the login username of the user. |
   | **Contact First Name** | Enter the user's first name. |
   | **Contact Last Name** | Enter the user's last name. |
   | **Contact Email** | Enter the user's email address. |
   | **Scopes** | Select the following mandatory scopes for the user:  - **email** - **login** - **offline\_acces** - **openid** - **profile** - **core.accounting.read** |
5. Copy the **Identifier** value, click **Show/hide** against the **Secret** field, and copy the value to a safe place.
6. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
7. Click **Add module** and from the list select **Coupa**.
8. Click **Create a connection**.

   1. In the **Connection name** field, enter the connection name.
   2. In the **Resource URL** field, enter your account's URL address without `https://`.
   3. In the **Identifier**, and **Secret** fields, enter the client credentials copied earlier. Select the scopes, and click **Save**.

The connection is established. You can proceed with setting up the module.

[## Types of Coupa modules](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_section-id235513203206176_body)

### Approvals

[#### Grant an Approval](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_grant-an-approval_body)

Approves a requisition.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Coupa account](coupa--action-flow-.html#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_Connect "Connecting Coupa to Celonis platform"). |
| **Enter Approval ID** | Select whether you want to specify Approval ID manually or select from the list. |
| **Requisition** | Select the requisition you want to grant approval for. |
| **Approval** | Select the approval or enter (map) the ID of the pending approval you want to grant. |
| **Note** | Enter the reason for approval. |

[#### Reject an Approval](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_reject-an-approval_body)

Rejects a requisition.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Coupa account. |
| **Enter Approval ID** | Select whether you want to specify Approval ID manually or select from the list. |
| **Requisition** | Select the requisition you want to reject an approval for. |
| **Approval** | Select the approval or enter (map) the ID of the pending approval you want to reject. |
| **Reason on Rejection** | Enter the reason for rejection. |

### Requisitions

[#### Update a Requisition Line](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_update-a-requisition-line_body)

Updates an existing requisition line.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Coupa account](coupa--action-flow-.html#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_Connect "Connecting Coupa to Celonis platform"). |
| **Enter Requisition Line ID** | Select whether you want to specify requisition line ID manually or select from the list. |
| **Requisition** | Select or enter (map) the requisition that contains the line you want to update. |
| **Requisition Line ID** | Select the line or enter (map) the ID of the line you want to update. |
| **Quantity** | Enter the quantity. |
| **Unit Price** | Enter the unit price. |
| **Item ID** | Select item or enter the item unique identifier. |
| **Contract ID** | Enter (map) the ID of the contract. |
| **Supplier ID** | Enter (map) the ID of the supplier. |
| **Payment Term Code** | Enter the code of the payment term. |
| **Currency Code** | Enter the currency code. |
| **Need by Date** | Enter the date when the item is no longer useful to you. |

[#### Add an Approver to a Requisition](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_add-an-approver_body)

Adds an approver to a requisition.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Coupa account. |
| **Requisition ID** | Select the requisition or enter (map) the ID of the requisition you want to add an approver to. |
| **Position** | Select whether to add the new approver before or after the current approver. |
| **Approver ID** | Select the approver or enter (map) the ID of the approver you want to add to the requisition. |
| **Current Approver ID** | Select or enter the ID of the current approver. |

### Other

[#### Make an API Call](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_section-idm183292452556936_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Coupa account](coupa--action-flow-.html#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_Connect "Connecting Coupa to Celonis platform"). |
| **URL** | Enter a path relative to `https://{your-resource-name}.coupacloud.com/`. For example: `/api/accounts/`.  **Note**  For the list of available endpoints, refer to the [Coupa API Documentation](https://success.coupa.com/Integrate/Technical_Documentation/API/Resources/Transactional). |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry.  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we added those for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Example of Use - List Requisitions](#UUID-3d0a4938-204c-bfca-aada-f15c780a4c71_id_example-of-use---list-requisitions_body)

The following API call returns requisitions in your Coupa account:

**URL**: `/api/requisitions/`

**Method**: `GET`

The result can be found in the module's **Output** under *Bundle* > *Body*.

### Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/creating-action-flows-for-manual-triggering

# Creating Action Flows for manual triggering

To make the description more engaging for a user, I’ve refocused the language on your actions and the value you get from the setup.Enhanced Short DescriptionEmpower your business users by transforming manual workflows into interactive automations. By configuring Action Flows for manual triggering, you enable team members to launch complex processes with a single click, providing them with the flexibility of attended automation while maintaining full control over inputs and security.

In use cases of attended automation Celonis Platform users click buttons which in turn can execute Action Flows.

Expand all

[## Creating Action Flows for manually triggering](#UUID-b17b847b-f2b5-351a-2459-00badd615da5_section-id235516595898039_body)

To create Action Flows for manually triggering:

**Tip**

For improved security and traceability, consider enabling dynamic connections for Action Flows. Dynamic connections allow you to specify that the execution of an Action Flow requires the user's authentication with personal credentials. This not only ensures that individual user permissions from the respective system are applied to your automation but also allows you to track your users' actions better. For more information, see [Dynamic connections](dynamic-connections-for-action-flows.html "Dynamic connections for Action Flows").

1. Start building your Action Flow.
2. (Optional) Add Inputs:

   **Note**

   For more information on inputs and their structure, see [Action Flow inputs](setting-up-action-flows-in-studio.html#UUID-b07391c5-21f7-cd4e-ddcb-b29617dd1636 "Action Flow inputs").

   1. Click **Inputs**.

      Here you can define inputs that have to be provided when an Action Flow is executed.

      |  |
      | --- |
      |  |
   2. Enter a Name for the input.
   3. Select the Type (Text, Date or Number).
   4. Choose if the input is required or optional.
   5. Click **Save**.

      **Note**

      When testing the Action Flow using the **Run Once** button, the respective inputs have to be filled manually.
   6. These Action Flow inputs can be used as a space holder in every module when building the Action Flow. They are shown below the “Custom and system variables” (symbol {}) tab.
   7. (Optional) Increase the “number of consecutive errors” setting.

      **Note**

      Toggle the **Show advanced settings** switch to view the Action Flow Settings. The “Number of consecutive errors” setting is set to 3 by default. This means when the Action Flow fails 3 times in a row, it gets deactivated and the Action is no longer shown to business users as button. In order to avoid this type of automatic deactivation, we recommend increasing this value for any “On demand” Action Flows (since manual executions may have more errors due to wrong inputs).

      |  |
      | --- |
      |  |
   8. Save your Action Flow.
   9. Publish your Action Flow.
   10. In the View mode, schedule the Action Flow to **On demand**.
   11. Switch the **Activate** toggle to activate the Action Flow.

You’ve created an Action Flow which is ready to be used with Actions.

## Related topics

- [Adding Actions to Studio components](adding-actions-to-studio-components.html "Adding Actions to Studio components")
- [Action Engine](action-engine.html "Action Engine")


---

## automation/action-flows/creating-an-action-flow-with-a-trigger

# Creating an Action Flow with a Trigger

Triggers can be used in Action Flow to automatically detect items that meet the criteria you defined and start various selected modules.

Expand all

[## Before you begin](#UUID-9cd792b1-658c-620b-01ad-874588021a11_section-id235456544147825_body)

- You must be an analyst with access to the Celonis Platform Studio.
- You must have “edit permissions” on a package or need to create a new package.
- You must have an existing Knowledge Model.
- Make sure you already have a Trigger created. If not, create one before starting this task. See [Creating Triggers using records](creating-triggers.html "Creating Triggers using records").

[## Creating Action Flows with a Trigger](#UUID-9cd792b1-658c-620b-01ad-874588021a11_section-id235456544785298_body)

1. Create a new Action Flow:

   1. In Studio, click the plus icon on your package, and select **Action Flow**.
   2. Give your Action Flow a name and click **Create**.
2. Add the Trigger module to the Action Flow:

   1. Click the plus icon to add a new module.
   2. From the list of modules, select **Celonis** > **Watch Trigger**.
   3. In your module details, add a new webhook:

      1. Next to the webhook list, click **Add**.
      2. Give your webhook a name.
      3. Select the connection type.

         **Note**

         We recommend that you use the App Key connection type for this. The App Key must have the following permissions:

         - "Use" permission to the Data Model that underlies the Knowledge Model.
         - "Edit" permission to the package that contains the Knowledge Model.
      4. Select the Knowledge Model.
      5. Select the Trigger you want to use with this Action Flow.
      6. Click **Save**.
3. Build the rest of your Action Flow

   **Note**

   You can use any attributes of the record defined in the Knowledge Model as the output of the Watch Trigger.
4. [Optional] Test the Action Flow you’ve just built and the Trigger connection:

   1. At the top of the page, click Run once.
   2. Go to the Trigger overview page.
   3. Select the Trigger you used in the Action Flow.
   4. In the upper-right corner of the Trigger details screen, click the Trigger status.
   5. Click **Test Action Flow**.

      A record item that meets your triggering criteria is picked and sent to the Action Flow to allow you to test your configuration".
5. For all your changes to take effect, click **Publish Package**.
6. In your dedicated Action Flow screen, switch the Active toggle.
7. [Optional] As a best practice, activate incomplete executions.

   Whenever the trigger detects a new record item, the Action Flow will be triggered.

## Related topics

- [Creating Triggers using Data Model](creating-triggers-using-data-model.html "Creating Triggers using Data Model")


---

## automation/action-flows/creating-and-managing-action-flow-inputs

# Creating and managing Action Flow inputs

Action Flow inputs allow you to pass data with a predefined structure to a Action Flow every time you run it. First, define the expected data structure necessary to start your Action Flow. Then, whenever you run the Action Flow with defined Action Flow inputs,Celonis platform shows a form where you enter the required data. You can use the data from your Action Flow input in all modules in the Action Flow.

Expand all

[## Creating Action Flow Inputs](#UUID-a8db535e-a00c-6668-5c20-77aed54b4153_section-id235502867853871_body)

You can define Action Flow inputs for your Action Flow before or after adding your modules.

1. In the Action Flow editor, click the Action Flow input icon.
2. Click **Add item**.
3. Enter the **Name**. This field is mandatory.

   - You cannot use spaces or special characters in the name. You can use letters, numbers, and the underscore symbol (\_).
   - You can only start with a letter or underscore.
4. Select one of the following input data type from the dropdown menu:

   - Array
   - Boolean
   - Collection
   - Date
   - Number
   - Text
5. In **Required**, select whether this input is required or not to start your Action Flow.

   - If you select **Yes**, your Action Flow cannot run unless you provide the required input.

     **Important**

     To use required inputs, your Action Flow scheduling type must be set to **On-demand**.
   - If you select **No**, the Action Flow can run without the specific input.
6. *Optional*: If you selected Text, Array, or Collection as your Specification, in **Multi-line**, select how you want your text to show.

   - Selecting **Yes** shows multiple lines of text to show.
   - Selecting **No** shows only one line of text.
7. Repeat the process if you need to add more items.
8. Click **Save**.
9. Click the save icon to save your Action Flow.

**Tip**

You can use the Action Flow inputs as mappable values in your Action Flows. You can find them under the **Variables** tab in the mapping dialog.

|  |
| --- |
|  |

[## Editing Action Flow inputs](#UUID-a8db535e-a00c-6668-5c20-77aed54b4153_UUID-73873725-f098-a321-d810-7ad3ee13dbf0_body)

**Warning**

Editing the input structure item(s) in an active Action Flow might lead to data inconsistencies and Action Flow failure.

1. Navigate to the Action Flow input icon in the Action Flow editor.
2. Click the item you want to edit.
3. Make your changes.

   **Caution**

   Changing the Action Flow input name will cause Action Flows to fail with errors.

   If you need to change the input name, we recommend deleting the old item and adding a new one with the new name.

   **Caution**

   If you change the inputs from not required to required, you need to change your scheduling to **On-demand**.
4. Click **Save**.

Once you save your changes, the changes update automatically everywhere you use the specific input mappable value.

[## Using Action Flow inputs](#UUID-a8db535e-a00c-6668-5c20-77aed54b4153_UUID-d6b4748b-ff23-25f1-be79-8ee311590f34_body)

Once you define your Action Flow inputs, your defined Action Flow inputs appear as mappable values under the **Variables** tab in the mapping dialog. You can use Action Flow input mappable values in your Action Flows.

With defined Action Flow inputs, every time you trigger a Action Flow (via Run Once or via API), the Action Flow inputs window pops up.

The Action Flow with Action Flow inputs can run only if you fill in all the required fields with the correct data types.

[## Deleting Action Flow inputs](#UUID-a8db535e-a00c-6668-5c20-77aed54b4153_UUID-c400b018-0f8f-7e43-dec3-e4fca278569b_body)

**Warning**

Deleting the input structure item(s) in the active Action Flow might lead to data inconsistencies and Action Flow failure.

|  |
| --- |
|  |

1. To delete an item from an input structure, navigate to the Action Flow input icon in the Action Flow editor.
2. Find an item you want to delete.
3. Click **X** to delete the item.

   To delete all items, click **X** for all of the items.
4. Click **Save** to save your changes.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/creating-connections-for-action-flows

# Creating connections for Action Flows

Connections bridge the gap between Celonis Action Flows and your external ecosystem. They securely authenticate individual modules to communicate with third-party systems, such as SAP, ServiceNow, or Microsoft, enabling the automated exchange of data and execution of cross-platform tasks.

Without a configured connection, an Action Flow is an isolated logic chain. Establishing a connection defines who the Action Flow is acting as (permissions) and where it is sending or receiving data (the target system).

Expand all

[## Creating Action Flow connections](#UUID-c9fceeb1-0938-740e-4f01-3993287df949_section-id23549073770396_body)

1. In **Studio**, go to your **Package**.
2. Go to your existing Action Flow asset or create a new one.
3. Click the module for which you want to create a connection.
4. Click **Create connection**.
5. Select the connection type you want to use for your module. Choose from the following:

   - **Celonis user** - this connection type will reflect your existing data permissions and allow you to query data to which you already have access.

     **Note**

     You must have Data integration service permission to use this connection method. See [Data Integration permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions").

     1. Give your connection a name.
     2. Click **Save**.
   - **Celonis Application Key** -This connection type will reflect the data permissions granted to the selected Application Key and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create an application key and copy it. See [Application keys](application-keys.html "Creating and granting permissions to application keys").
     3. Paste the application key and click **Save**.
   - **Celonis OAuth Client Credentials** this connection type will reflect the data permissions granted to the selected OAuth app and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create the OAuth application application Client ID and Secret and copy it. See [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").
     3. Paste the Client ID and Secret here and **Save**.

   Your Action Flow connection is created. Continue configuring your selected module.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Modules](action-flow-modules.html "Action Flow modules")


---

## automation/action-flows/csv--action-flow-

# CSV (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The CSV aggregator and CSV transformer Action Flow module lets you create CSV files and parse CSV text from a received text value or a file.

Expand all

[## Types of CSV modules](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_section-id235513215233451_body)

[### Aggregators](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_UUID-83878fa4-2c41-d48a-60c5-815584b84b01_body)

[#### Create CSV](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_create-csv_body)

Merges selected text items and return them in the CSV format.

The **Create CSV** aggregator lets you create csv text from received text values.

|  |  |
| --- | --- |
| **Source Module** | Select the app module you are using to aggregate the fields you need. |
| **Aggregate fields** | Select the fields you want to aggregate from the list of available fields. |
| **Include headers in the first row** | When selected, includes the headers in the result. |
| **Delimiter** | Select the delimiter character to separate the values. If you select **Other**, a **Delimiter character** field will populate below where you can specify the character. |
| **Delimiter character** | Specify which delimiter character is used to separate the values if you selected **Other**. It must be only one character. |
| **Newline** | Select the newline that is used to indicate the end of a line of text. |
| **Group by** | Enter the filter to group the results. For example, a date. |
| **Stop processing after an empty aggregation** | When selected, the Action Flow stops when there are no results. |

[##### Example - Export Google Contacts to a CSV File](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_example---export-google-contacts-to-a-csv-file_body)

The **Create CSV** module provides you with a list of options as checkboxes. If you are selecting Contact's ID and Full Name, then the results are returned in a text format.

|  |
| --- |
|  |

[#### Create CSV (advanced)](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_h_3dbab43b-0e36-41cf-bbe8-88aa4dd378c2_body)

Merges selected text items and return them in the CSV format. Employs Data Structure to define CSV columns in the resulting CSV file.

The **Create CSV (advanced)** aggregator lets you create a csv text from received text values. It employs a Data structure that defines the CSV columns in the resulting CSV file. Once defined, the columns appear as fields in the CSV module setup, available for mapping.

|  |  |
| --- | --- |
| **Source Module** | Select the app module you are using to aggregate the fields you need. |
| **Data Structure** | Select the data structure to aggregate the fields in the way you want. See [Adding a Data Structure](csv--action-flow-.html#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_h_01da95b5-39b5-4c59-96a9-936a3646a6ee "Adding a Data Structure").  After defining the data structure, you can map the items to the corresponding fields.  |  | | --- | |  | |
| **Aggregate Fields** | Provides a list of fields you want to aggregate. |
| **Include headers in the first row** | When selected, includes headings in the first row. |
| **Delimiter** | Select the delimiter character to separate the values. If you select **Other**, a **Delimiter character** field will populate below where you can specify the character. |
| **Delimiter character** | Specify which delimiter character is used to separate the values if you selected **Other**. It must be only one character. |
| **Newline** | Select the newline that is used to indicate the end of a line of text. |
| **Group by** | Enter the filter to group the results. For example, a date. |
| **Stop processing after an empty aggregation** | When selected, the Action Flow stops when there are no results. |

[#### Example - Export Google Contacts to a CSV File](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_example---export-google-contacts-to-a-csv-file-1_body)

The **Create CSV (advanced)** module provides you with the option to create a data structure with the aggregating fields you needed. If you are defining a data structure with Full Name and Email then the results are returned in a text format.

|  |
| --- |
|  |

[### Transformers](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_UUID-ec1e5c1f-91bb-5709-73db-2367725a29b1_body)

[#### Parse CSV](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_id_parse-csv_body)

Parses a CSV file.

The **Parse CSV** transformer lets you parse a CSV text from a received text value or a file. If your data comes in binary form (typically from a file), you have to use the `toString()` function to convert the binary data to String:

|  |
| --- |
|  |

[## Transforming complex data to CSV](#UUID-b603a269-9bdf-3f53-b1a4-3cc812b0a676_UUID-4957e503-85c1-f443-ca88-721dac70df8f_body)

For example, you would like to export your Google contacts to a CSV file with two columns "Full Name" and "Email". The output bundle from the **Google Contacts > Get contacts from a group** module has the following structure (see on the right). The email addresses are stored inside the `Emails[]` item, which is an array of collections, each collection containing two items: `Label` and `Email`.

If you employ the simple **Create CSV** module, you are offered a list of checkboxes corresponding to a bundle's top-level items. If you attempt to tick `Full name` and `Emails` items, the **Create CSV** module will produce the following output, which is probably not what you wished for:

```
 "emails","fullName"
"[object Object]","Shon Winer"
"[object Object]","Lizeth Fulmore"
"[object Object]","Hilario Gullatt"
"[object Object]","Abby Eisenbarth"
```

Since the item `Full Name` is of simple type text it is exported just fine. But the item `Emails`, which is of a complex type array of collections, is exported as `[object Object]`. That is how Collections and Arrays are transformed to text by default.

To export content of the `Email` item of the first collection of the `Emails[]` array instead, it is necessary to employ the Create CSV (advanced) module. The module will enable you to define individual columns of your CSV file and map items to them, including the nested ones.

1. Insert the module in a Action Flow and open its configuration.

2. Click the **Add** button next to the **Data structure** field to create a new Data structure.

3. Input a name for the Data structure and click the **Add item** button to add the individual columns. If you wish to export two columns: "Full Name" and "Email", the resulting Data structure would look like this:

|  |
| --- |
|  |

4. Once you have successfully defined the Data structure, fields corresponding to each individual column should appear in the configuration of the **Create CSV (advanced)** module so you can map the items. Take the first item from the `Emails[]` array and map its item `Email` to the field/column *Email*:

|  |
| --- |
|  |

5. Execute the Action Flow. Since the item `Emails[1]: Email` mapped to column *Email* is of simple type text, it will be exported correctly now:

```
"Full Name","Email"
"Shon Winer","Shon@Winer.com"
"Lizeth Fulmore","Lizeth@Fulmore.com"
"Hilario Gullatt","Hilario@Gullatt.com"
"Abby Eisenbarth","Abby@Eisenbarth.com"
```

### Adding a Data Structure

You can add the data structures by clicking **Add item** in the **Specification** field.

**One item** represents **one column**.

|  |
| --- |
|  |

Fill the details in the **Add item** dialog.

|  |  |
| --- | --- |
| **Name** | Enter the name of the property for the data structure. For example, Full Name. |
| **Label** | Enter a label for the data structure. |
| **Type** | Select the data type:  - *Array* - *Collection* - *Date* - *Text* - *Number* - *Boolean* - *Binary Data* |
| **Default** | Enter a default value for the property. |
| **Required** | When selected, indicates that the value is required. |
| **Multi-line** | When selected, |

Sample items after filling the data.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/dropbox-business--action-flow-

# Dropbox Business (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Dropbox Business modules enable you to monitor, publish or update posts, photos, and videos in your Dropbox Business account.

Expand all

[## Before you begin](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_section-id235514867815533_body)

To use Dropbox Business with Celonis platform, it is necessary to have a Dropbox Business account. If you do not have one, you can create a Dropbox Business account at <https://www.dropbox.com/business>.

[## Connecting Dropbox Business to Celonis platform](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e_body)

After you click the *Continue* button, Celonis platform will redirect you to the Dropbox Business website where you will be prompted to grant Celonis platform access to your account.

1. Confirm the dialog by clicking the *Continue* button.

2. Confirm the access to the team by clicking the *Allow* button.

The connection to your Dropbox account has been established.

If you are not sure what is going on in your Dropbox account, we recommend to check *Admin Console > Activity* log.

[## Dropbox Business module types](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_section-id235514877706892_body)

[### Group](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-e531dfbe-3015-6b97-8814-6c1de45fafe0_body)

#### List Groups

Lists groups on a team.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Limit** | Set the maximum number of groups Celonis platform will return during one execution cycle. |

#### Create a Group

Creates a new group with no members.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Group Name** | Enter the name of the new group. |
| **Group Management Type** | Select whether the team can be managed by selected users (*user managed*), or only by team admins (*company managed*). |

#### Get a Group's Info

Retrieves details of the specified group.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Group ID** | Select or enter (map) the ID of the group you want to retrieve details about. |

#### Update a Group

Updates a group name or/and group management type.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Group ID** | Select or enter (map) the ID of the group you want to update. |
| **Group Name** | Enter the name for the new group. |
| **Group Management Type** | Select whether the team can be managed by selected users (*user managed*), or only by team admins (*company managed*). |

#### Add Members to a Group

Adds members to a group.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Group ID** | Select or enter (map) the ID of the group you want to add a member. |
| **Members** | Add at least one member you want to add to the group.  **Team Member ID**: Select or map the user you want to add to the group.  **Access Type**: Select a role of a user in the group. |

#### Delete a Group

Deletes a group.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Group ID** | Enter (map) or select the ID of the group you want to delete. |

[### Member](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-1b4d950e-7dae-0e4d-b96f-3b070120ec43_body)

#### Watch Team Members

Returns member details when a new member is invited or joined a team.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Dropbox Business account. |
| **Watch Team Members** | Select whether you want to watch joined users (*by joined time*) or invited users (*by invited time*). |
| **Limit** | Set the maximum number of members Celonis platform will return during one execution cycle. |

#### List Team Members

Retrieves details of members of a team.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Dropbox Business account. |
| **Include removed members** | Enable this option to retrieve also removed members. |
| **Limit** | Set the maximum number of members Celonis platform will return during one execution cycle. |

#### Get a Team Member's Info

Retrieves team member details.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Dropbox Business account. |
| **Team Member ID** | Enter (map) or select the user you want to retrieve details about. |

[### Team Folder](#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-64d9f15e-ee2d-c28b-fdda-35021a62a9aa_body)

There are two types of Dropbox accounts:

- **The new Dropbox Business** account that uses **team spaces.**
- **Legacy Dropbox Business account** that uses *team folders* only, no team spaces.

If you are using the new Dropbox account (with team spaces), to work with team folders please use our [Dropbox](https://www.integromat.com/en/help/app/dropbox) modules (**not** the *Dropbox Business* modules).

#### Create a Team Folder

Creates a team folder in your Dropbox Business account (legacy account) with no members.

To create a folder in your **new** Dropbox Business (team spaces) account, please use the Create a Folder module.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Team Folder Name** | Enter the name for the new team folder. |
| **Sync Setting** | Apply the [sync setting](https://www.dropbox.com/help/business/team-selective-sync) to the folder. |
| **Members** | Add a group whose members can access the team folder.  **Group ID**: Select or map the ID of the group you want to grant access to the folder.  **Access Level** : Select whether the group members can *edit* or *view* the folder. |

#### List Team Folders

Retrieves all team folders.

To list folders in your **new** Dropbox Business account (team spaces), please use the List all files or folders module.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Limit** | Set the maximum number of folders Celonis platform will return during one execution cycle. |

#### Get a Team Folder

Retrieves the details of a team folder.

To retrieve folder details in your **new** Dropbox Business account (team spaces), please use the Dropbox > Get a folder metadata module.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Team Folder ID** | Enter (map) or select the folder you want to retrieve details about. |

#### Rename a Team Folder

Changes an active team folder's name.

To rename a folder in your **new** Dropbox Business account (team spaces).

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Team Folder ID** | Enter (map) or select the folder you want to rename. |
| **Name** | Enter the new name for the folder. |

#### Delete a Team Folder

Permanently deletes an archived team folder.

To delete a team folder in your **new** Dropbox Business account (team spaces).

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Team Folder ID** | Enter (map) or select the folder you want to delete. |

#### Archive/Activate Team Folder

Sets a team folder as active or archived.

This module is not needed when using the **new** Dropbox Business account (team spaces).

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **Select** | Select whether you want to archive or activate the folder. |
| **Team Folder ID** | Enter (map) or select the folder you want to activate or archive. |

#### Make an API Call

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | [Connecting Dropbox Business to Celonis platform](dropbox-business--action-flow-.html#UUID-46c8be74-cd96-a9ee-8517-036acf7a9455_UUID-c0098a52-e264-78b0-e53c-3842548e075e "Connecting Dropbox Business to Celonis platform"). |
| **URL** | Enter a path relative to `https://api.dropboxapi.com`. E.g. `/2/team/groups/list`  For the list of available endpoints, refer to the [Dropbox API Documentation](https://www.dropbox.com/developers/documentation/http/teams). |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry**.**  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

#### Example of Use - List Groups on a Team

The following API call returns all the groups on a team in your Dropbox account:

**URL**: `/2/team/groups/list`

**Method**: `POST`

**Headers**:

All headers must be removed otherwise, an error is returned.

Matches of the search can be found in the module's **Output** under *Bundle* > *Body > groups.*  In our example, 6 groups were returned:


---

## automation/action-flows/dynamic-connections-for-action-flows

# Dynamic connections for Action Flows

When configuring an Action Flow, an admin can specify that a connection to a system or service used in the app requires authentication with personal credentials each time the Action Flow is executed. We refer to this as a dynamic connection.

Dynamic connections allow you to apply individual user permissions from the respective systems to your automations. Additionally, by providing personal credentials when executing an Action Flow, the user name is recorded in the audit log, which improves traceability.

Expand all

[## Creating dynamic connections in Action Flow](#UUID-70a3281a-bda1-53f3-7ace-5cf91a0fe110_section-idm234398366779775_body)

**Before you begin**

- Dynamic connection can be created only for Action Flows which have their execution scheduling set to "**on demand**".

1. Go to your Action Flow and select an app module.
2. In the module setting, next to the Connection box, click the three dots menu and select **Create a dynamic connection**.
3. Give the connection a name and set the build-time value.

   **Tip**

   The build-time value is a temporary connection used for the time of building the Action Flow and it won't be saved when the Action Flow is published.

   |  |
   | --- |
   |  |
4. Save your changes.

Once you've created and published your Action Flow, the dynamic connection becomes active. Users who execute the Action Flow for which the dynamic connection was set, either from an Action button in a View or by running an Action Flow once, will have to provide their authentication details first. Once provided, the authentication details will be stored for future use.

For more information on how to create Action buttons in Views, see [Adding Action to Tables](adding-action-to-tables.html "Adding Action to Tables").

**Note**

**Connecting to SAP?**

Users who execute SAP Action Flow modules must also have the permissions necessary to trigger the BAPI used to trigger an Action.

[## Deleting dynamic connections](#UUID-70a3281a-bda1-53f3-7ace-5cf91a0fe110_section-idm234754572573505_body)

To delete a dynamic connection for an Action Flow:

1. In Studio, Go to your Action Flow and click **Edit**.
2. In the top bar, click **Inputs**.
3. Next to the connection you want to remove, click the X icon.

   |  |
   | --- |
   |  |
4. Click **Save**.

[## Managing your personal connections](#UUID-70a3281a-bda1-53f3-7ace-5cf91a0fe110_section-idm234398450303444_body)

To execute an Action Flow with dynamic connection enabled, users must authenticate using their personal credentials for the chosen system. Action Flow will be asked to authenticate using their personal credentials for a selected system. Celonis Platform securely stores these credentials as a **personal connection** for future use. Users can manage their personal connections by going to **user profile** > **Personal Connections**.

|  |
| --- |
|  |

In the Personal Connection overview page, you can also update your passwords stored for individual connections.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/email--action-flow-

# Email (Action Flow)

The Email app allows you to download emails via IMAP, send emails via SMTP, create new drafts, move and copy emails from one folder to another folder, mark emails as read or unread, and delete emails.

Prerequisites

- An email account or an email server

**Important**

On October 1, 2022, Microsoft began a gradual deprecation of its current basic authorization protocol. Full deprecation of the basic authorization protocol is going to happen as of 1st of January, 2023. To solve this issue, we have upgraded our Email app to support a new type of connection: Microsoft SMTP/IMAP OAuth. By using this new selection choice, you will be able to create new connections to existing Microsoft email accounts.

**Action required**: if you use Microsoft as Email provider in the Action Flows Email app, make sure to update your connections using Microsoft SMTP/IMAP OAuth **before the 1st of January, 2023**. If you have any questions, reach out to [Celonis support](support.html "Contacting Support").

Expand all

[## Connecting Email to Celonis platform](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat_body)

You can connect your Email account to Celonis platform using the following methods:

- [Connect Using Your Gmail Account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_h_e66fbbd9-f7e8-4d9c-8425-682e077696f8 "Connecting using Gmail account")
- [Connect using Microsoft SMTP or IMAP OAuth](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_section-idm4517614713459233321805269636 "Connecting using Microsoft SMTP or IMAP OAuth")
- [Connecting using SMTP connection](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_h_d33e0a02-4cd9-46cb-b19f-e956c09c9d86 "Connecting using SMTP connection")

[### Connecting using Gmail account](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_h_e66fbbd9-f7e8-4d9c-8425-682e077696f8_body)

1. Go to **Celonis platform** and open the Email module's *Create a connection dialogue* and select the *Connection* type as *Google*.

2. In the *Connection name* field, enter a name for the connection and click *Continue*.

3. Confirm the access by clicking *Allow*.

The connection has been established.

[### Connecting using Microsoft SMTP or IMAP OAuth](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_section-idm4517614713459233321805269636_body)

When creating a connection with this method, you can authorize Celonis platform to authenticate using Microsoft account or you can use your own credentials.

[#### Connect with Microsoft account](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_section-idm4550274748960033489705954882_body)

1. Go to Celonis Platform and open the Email module's Create a connection dialogue.
2. Select the *Connection* type as *Microsoft SMTP/IMAP OAuth* and click **Save**.

   Celonis platform will request authentication with your default third-party authentication software.

   The connection has been established.

[#### Connect with own ClientID and secret](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_section-idm4636389587680033489710646845_body)

**Before you begin:**

- Make sure you have ClientID and secret ready.

  If haven't created your credentials yet, you need to create a custom app in your Azure account to generate the CliendID and secret. See [Generating credentials in Microsoft Azure](generating-credentials-in-azure.html "Generating credentials in Microsoft Azure").
- Make sure the Email application has the the following permissions assigned in the Azure portal:

**To create a connection using own credentials:**

1. Go to **Celonis platform**, and open the Email module's Create a connection dialogue and select the *Connection* type as *Microsoft SMTP/IMAP OAuth*.
2. Click the *Show advance settings* toggle.
3. Enter your credentials and click **Save**.

[### Connecting using SMTP connection](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_h_d33e0a02-4cd9-46cb-b19f-e956c09c9d86_body)

1. Go to **Celonis platform**, open the Email module's *Create a connection* screen, and select the *Connection* type as *Others (IMAP)*.

2. Select one of the Email providers and enter your email details, or select **Other**.

3. If you select **Other** as the Email provider, you get access to all low-level details of setting up an SMTP connection:

As fields in the Celonis platform Action Flow user interface which are displayed in bold are mandatory, you will have to enter the Email address, the SMTP server and port and additional settings:

- **SMTP Server**: Enter mail server address (SMTP). If you do not have this information available, contact your email service provider.
- **Port**: Enter the port number.
- **Use Secure Connection (TLS)**: Select to establish a secure connection between the servers.
- **Use explicit TLS:** This explicitly requests TLS/SSL encryption to be turned on during the initial handshake. When set to No, the client will first connect to the server and then negotiate a TLS/SSL session. The support TLS version is **1.2 or higher**.
- **User name:** Enter your email address.
- **Password:** Enter your password.

Additionally, a **Mutual TLS** (mTLS) secure email connection, can be set up using the “advanced settings”:

| Setting | Description |
| --- | --- |
| **Reject unauthorized certificates** | If Yes, the server certificate is verified against the list of supplied CAs. For self-signed certificates as they will not be matched with the built-in CAs, either set this option to Yes and upload your certificate in the “Certificate Authority” field, or set this option to No (this will cause all certificate validations to be skipped). |
| **Certificate** | Your IT will need to issue a new client certificate, to be provided in this configuration. Your email server will be using this certificate to validate the Celonis service. |
| **Private Key** | Your IT will need to issue a new private key, to be provided in this configuration. Your email server will be using this private key to validate the Celonis service. |
| **Certificate authority** | Add your certificate authority in this configuration. A self-signed certificate can also be used as a Certificate Authority. Celonis will be using this to verify the identity of your SMTP server. This ensures the bi-directional certificate based identity verification of the mTLS protocol. |

**Note**

To use mTLS, you might need to allowlist the IP Addresses of Celonis platform, in addition to providing you the above files. Reach out to your IT team for more information.

[## Email module types](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_section-id235514899478582_body)

[### Triggers](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_triggers_body)

#### Watch Emails

Triggers when a new email is received for processing according to specified criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder whose emails you want to watch. |
| **Criteria** | Select the criteria of the emails you want to watch:  - *All Emails* - *Only Read Emails* - *Only Unread Emails* |
| **Sender Email Address** | Enter the email address of the sender whose emails you want to watch. |
| **Recipient Email Address** | Enter the email address of the recipient whose emails you want to watch. |
| **Subject** | Enter the subject of the email you want to watch. |
| **Phrase** | Enter any keywords to watch only those emails containing specific phrases. |
| **Mark message(s) as read when fetched** | Select the option if you want to mark the unread email as read after retrieving the details. |
| **Maximum number of results** | The maximum number of emails Celonis platform should return during one Action Flow execution cycle. |

[### Actions](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_actions_body)

#### Copy an Email

Copies an email or a draft into a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Source Folder** | Select the folder from which you want to copy the email. For example, Inbox, Primary, Work, and so on. |
| **Destination Folder** | Select the folder to which you want to copy the email. For example, Inbox, Primary, Work, and so on. |
| **Email ID (UID)** | Enter the Email ID UID of the email you want to copy to the destination folder. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |

#### Create a Draft

Creates and adds a new draft to a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder in which you want to create the draft email. |
| **To** | Enter the email address to which you want to send the email. |
| **Subject** | Enter the subject line of the email. |
| **Content Type** | Select the content type for the email:  - HTML - Plain Text |
| **HTML** | Enter the email content in HTML format using HTML tags or in the plain text as selected in the Content type field. |
| **Attachments** | Add an attachment:  **File name**  Enter the file name. For example, sample.doc.  **Data**  Enter the path to the folder to upload the attachment.  **Content-ID**  Enter the content ID to insert the attachment (image) in the content. |
| **Copy Recipient** | Enter the email address to whom you want to send a copy of this email. |
| **Blind Copy Recipient** | Enter the email address to whom you want to send a copy of this email without appearing their email addresses in the email. |
| **From** | Enter the email address that appears in the From field. |
| **Sender** | Enter the email address that appears in the Sender field. |
| **Reply-To** | Enter the details of the email for which you are sending this email as a reply. |
| **In-Reply-To** | Enter the details of the email for which you are drafting this email in reply to. |
| **References** | Enter the details of any reference you want to add to the email. |
| **Priority** | Select the priority:  - *High* - *Low* - *Normal* |
| **Headers** | Add the headers:  **Key**  Add the key.  **Value**  Enter the value fo the key. |

#### Delete an Email

Removes an email or a draft from ta selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder of the email you want to delete. For example, Inbox, Primary, Work, and so on. |
| **Email ID (UID)** | Enter the Email UID of the email you want to delete. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |
| **Expunge** | If selected, permanently removes all the messages marked as Deleted in the currently open mailbox. When you use Gmail then the behavior is driven by the setting in *Settings > Forwarding POP/IMAP* in IMAP access section. |

#### The Unique Email ID in IMAP protocol

The Unique Email ID known as 'Email ID (UID)' is the email's identifier. The Email ID is specific for each of the email's folders.

For getting and deleting the same email from the same folder, you can see below:

Getting an email from the 'Inbox' folder

Deleting the email from the 'Inbox' folder

#### Get Emails

Returns emails that match the specified criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder whose email details you want to retrieve. For example, Inbox, Primary, Work, and so on. |
| **Mark message(s) as read when fetched** | Select the option if you want to mark the unread email as read after retrieving the details. |
| **Criteria** | Select the emails you want to retrieve:  - *All Emails* - *Only Read Emails* - *Only Unread Emails* |
| **Sender email address** | Enter the email address of the sender whose emails you want to retrieve. |
| **Recipient email address** | Enter the email address of the recipient whose emails you want to retrieve. |
| **From date** | Enter the date to retrieve the emails processed on or after the specified date. |
| **Before date** | Enter the date to retrieve the emails processed on or before the specified date. |
| **Subject** | Enter the subject of the email you want to retrieve. |
| **Phrase** | Enter any keywords to retrieve only those containing those phrases. |
| **Email ID (UID)** | Enter the Email ID (UID) of the email whose details you want to retrieve. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |
| **Maximum number of results** | The maximum number of emails Celonis platform should return during one Action Flow execution cycle. |
| **Continue the execution of the route even if the module returns no results** | Select if you want to continue to run the module even if there are no results returned. |

#### Mark an Email as Read

Marks an email or a draft in a selected folder as read by setting the Read flag.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder of the email you want to mark as read. For example, Inbox, Primary, Work, and so on. |
| **Email ID (UID)** | Enter the Email UID of the email you want to mark as read. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |

#### Mark an Email as Unread

Marks an email or a draft in a selected folder as unread by setting the Unread flag.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Folder** | Select the folder of the email you want to mark as unread. For example, Inbox, Primary, Work, and so on. |
| **Email ID** | Enter the Email UID of the email you want to mark as unread. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |

#### Move an Email

Moves a chosen email or a draft to a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Source Folder** | Select the folder from which you want to move the email. For example, Inbox, Primary, Work, and so on. |
| **Destination Folder** | Select the folder to which you want to add the email. For example, Inbox, Primary, Work, and so on. |
| **Email ID (UID)** | Enter the Email ID UID of the email you want to move to the destination folder. You can get the UID of the email by using Celonis platform's Watch Email module or Search Email module. |

#### Send an Email

Sends a new email.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Save Message after Sending** | Select whether you want to save the email in your mail box after sending it. |
| **To** | Enter the email address to whom you want to send the email. |
| **Subject** | Enter the subject line of the email. |
| **Content Type** | Select the content type for the email:  - *HTML* - *Plain Text* |
| **Content** | Enter the email content in HTML format using HTML tags or in the plain text as selected in the *Content Type* field. |
| **Attachments** | Add an attachment:  **File name**  Enter the file name. For example, sample.doc.  **Data**  Enter the path to the folder to upload the attachment.  **Content-ID**  Enter the content ID to insert the attachment (image) in the content. |
| **Copy Recipient** | Enter the email address to whom you want to send a copy of this email. |
| **Blind Copy Recipient** | Enter the email address to whom you want to send a copy of this email without having their email addresses appear in the email. |
| **From** | Enter the email address (and name, if needed) that appears in the *From* field in the email. Use the correct syntax: `name@email.com` or `"Name" name@email.com` |
| **Sender** | Enter the email address that appears in the *Sender* field in the email.  1. Open the *Send an email* action advanced settings using the checkbox  2. Enter the required sender name or email  Use the correct syntax as shown in the hint on the screenshot below. `name@email.com` or `"Name" name@email.com` |
| **Reply-To** | Enter the details of the email for which you are sending this email as a reply. |
| **In-Reply-To** | Enter the details of the email for which you are drafting this email in reply to. |
| **References** | Enter the details of any reference you want to add to the email. |
| **Priority** | Select the priority of the email:  - *High* - *Low* - *Normal* |
| **Headers** | Add the headers:  **Key**  Add the key. For example, Sender, Date, To, and so on.  **Value**  Enter the value for the key. |

#### Send me an Email

Sends a new email to your email address.

|  |  |
| --- | --- |
| **Subject** | [Establish a connection to your Email account](email--action-flow-.html#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_connecting-the-email-service-to-integromat "Connecting Email to Celonis platform"). |
| **Content** | Enter the subject and body of the email. |

[### Iterators](#UUID-68dc1094-9c1b-8af5-a7a6-d92a245be175_id_iterators_body)

#### Iterate Attachments

Iterates received attachments one by one.

The email iterator module lets you manage email attachments separately. For example, you can set up to watch emails to iterate the emails with attachments and receive alerts.

For more information about iterators, see [Iterator](https://www.integromat.com/en/help/iterator).

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/error-hadler-types-in-action-flows

# Error handler types in Action Flows

The following table provides a quick reference to working with error handlers in Celonis platform.

If you want to learn more about individual error handlers, check the dedicated articles in this section of the Help Center. If you want to learn more about error handling, you can start with the introduction.

|  |  |  |
| --- | --- | --- |
| **Break** |  | Celonis platform stores the subsequent modules as an incomplete execution. Set the automatic completion to **Yes** to get similar functionality as a **Retry**. Otherwise, you have to resolve incomplete executions manually.  Celonis platform processes the rest of the bundles in the Action Flow flow normally.  **The Action Flow ends with the "warning" status.** |
| **Commit** |  | Celonis platform stops the Action Flow run and commits all changes.  Celonis platform doesn't process the rest of the modules in the Action Flow flow.  **The Action Flow ends with the "success" status.** |
| **Ignore** |  | Celonis platform ignores the error. The bundle doesn't continue in the Action Flow flow.  Celonis platform processes the rest of the bundles in the Action Flow flow normally.  **The Action Flow ends with the "success" status.** |
| **Resume** |  | Specify a substitute mapping for when the module outputs an error. The substitute data continue through the rest of the Action Flow.  Celonis platform processes the rest of the bundles in the Action Flow flow normally.  **The Action Flow ends with the "success" status.** |
| **Rollback** |  | Celonis platform stops the Action Flow run and reverts changes in all modules that support transactions ([ACID](action-flow-execution,-cycles,-and-phases.html#UUID-6aaac0e6-50d0-eb1d-0f58-4ed75820a649_section-idm453671069883043282726477419 "ACID modules") modules).  Celonis platform doesn't process the rest of the modules in the Action Flow flow.  Celonis platform stops scheduling the Action Flow after the **Rollback** activates for the number of consecutive errors in a row.  **The Action Flow ends with the "error" status.**  **Note**  The **Rollback** is the default error handling if you don't set any error handling and when you keep incomplete executions disabled. |


---

## automation/action-flows/evernote--action-flow-

# Evernote (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Expand all

[## Before you begin](#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_section-id235514907590353_body)

to use Evernote with Celonis platform, it is necessary to have an Evernote account. If you do not have one, you can create an Evernote account at [evernote.com](https://evernote.com/compare-plans).

[## Connecting Evernote to Celonis platform](#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3_body)

To connect Evernote to Celonis platform you must connect your Evernote account to Celonis platform.

After you click the *Continue* button, Celonis platform will redirect you to the Evernote website where you will be prompted to grant Celonis platform access to your account.

Confirm the dialog by clicking the *Authorize* button.

[## Evernote module types](#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_section-id23551492051734_body)

### Triggers

#### Watch Notes

This module is triggered when a note is created or updated in a selected notebook.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Notebook** | Select the notebook you want to watch for new or updated notes. |
| **Tags** | Select the tags of the notes you want to retrieve. |
| **Maximum number of returned notes** | Enter the maximum number of notes that Celonis platform will work with during one cycle (the number of repetitions per Action Flow run). If the value is set too high, the connection may be interrupted on the side of the given third-party service (timeout). Celonis platform has no influence on this. |
| **Watch** | Select whether you want to retrieve *new notes* or *new notes and all changes*. |
| ***Only notes with reminders*** | Enable this option if you want to retrieve only notes that contain a reminder. |

[### Actions](#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-24b435c4-ec7a-de98-5ec9-2eefe3658938_body)

#### Create a Note

Creates a new note in a selected notebook.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Notebook** | Select the notebook you want to create a note in. |
| **Title** | Enter the title for the note. |
| **Content** | Enter the desired note content. |
| ***Escape HTML characters*** | If this option is disabled you must use HTML character entity, e.g.  ```                            &amp; ``` |
| **Tags** | Add a tag to the new note if needed. |
| **Reminder time** | If you want to set the reminder for this note enter the date and time for the reminder. |
| **Attachments** | Attach a file to the note. |

#### Update a Note

Updates a selected note.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Notebook** | Select the notebook you want to update the note in. |
| **Select a note** | Select the note you want to update. If you want to enter the ID manually you can use the *Watch notes* module or *Search for notes* module to retrieve the *Note ID*. Otherwise, select a note from the *Note* drop-down menu. |
| **Title** | Enter the title for the note. This field is mandatory. |
| **Content** | Enter the desired content of the note. This field is mandatory. |
| ***Escape HTML characters*** | If this option is disabled you must use HTML character entity, e.g.  ```                            &amp; ``` |
| **Tags** | Add a tag to the new note if needed. |
| **Update a reminder** | Choose whether you want to Update or Clear a reminder. |
| **Reminder time** | If you want to set a reminder for this note enter the date and time for the reminder. |
| **Attachments** | Attach a file to the note. |

#### Append Content to a Note

Adds content to a note.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Select a note** | Select the note you want to update. If you want to enter the ID manually you can use the *Watch notes* module or *Search for notes* module to retrieve the *Note ID*. Otherwise, select a note from the *Note* drop-down menu. |
| **Content** | Enter the content you want to add to the note. It will be appended to the end of the note content. |
| ***Escape HTML characters*** | If this option is disabled you must use HTML character entity, e.g.  ```                            &amp; ``` |
| **Attachments** | Attach a file to the note. |

#### Delete a Note

Deletes a selected note.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Note ID** | Enter the Note ID. You can use, for example, the *Watch notes* module or *Search for notes* module to retrieve the ID. |

#### Get a Note

Retrieves information about a selected note.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Select a note** | Select a note you want to update. If you want to enter the ID manually you can use the *Watch notes* module or *Search for notes* module to retrieve the *Note ID*. Otherwise, select a note from the *Note* drop-down menu. |

#### Create a Notebook

Creates a new notebook.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Name** | Enter the name for the new notebook. |

#### Search for Notes

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Search query** | Enter the search term. To perform a more detailed search, refer to [Evernote's advanced search syntax](https://help.evernote.com/hc/en-us/articles/208313828-How-to-use-Evernote-s-advanced-search-syntax). |
| **Notebook** | Select the notebook you want to search for notes. |
| **Tags** | Select the tags of the note you want to search for. |
| **Maximum number of returned notes** | Enter the maximum number of notes that Celonis platform will work with during one cycle (the number of repetitions per Action Flow run). If the value is set too high, the connection may be interrupted on the side of the given third-party service (timeout). Celonis platform has no influence on this. |
| ***Continue the execution of the route even if the module returns no results*** | If enabled, the Action Flow will not be stopped by this module. |

#### Share a Note

The module provides you with a public link to a selected note.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Evernote account](evernote--action-flow-.html#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-dc35f856-23b8-eae1-4c84-981020ff70d3 "Connecting Evernote to Celonis platform"). |
| **Select a note** | Select the note you want to update. If you want to enter the ID manually you can use the *Watch notes* module or *Search for notes* module to retrieve the *Note ID*. Otherwise, select a note from the *Note* drop-down menu. |

[### Iterators](#UUID-f64f5bf3-ebb9-95d0-cc7f-b7919fb04020_UUID-ff9fa37c-20ad-bf38-af0a-7cb7e92e5f7a_body)

#### Retrieve Note Attachments

Extracts attachments from a note and provides them to the following module.

|  |  |
| --- | --- |
| **Source module** | Select the source module that contains an attachment(s). |

**Example**

Use the following modules to extract attachments from the *Evernote* note and upload it to the Dropbox folder.

1. *Evernote > Get a Note* module to retrieve the note with attachments.
2. *Evernote > Retrieve Note Attachments*  module to iterate the attachments.
3. *Dropbox > Upload a File* module to upload retrieved attachments to the Dropbox folder.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/execute-action-flows-in-skills

# Execute Action Flows in Skills

In this topic, we are going to show how to execute an Action Flow from a Skill. If you're interested in how to do it the other way around, i.e. execute a Skill from an Action Flow, please refer to [this tutorial](execute-skills-in-action-flows.html "Execute Skills in Action Flows").

Expand all

[## Before you begin](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_section-id235480089005786_body)

If you want to use the OAuth connection method for your Action Flow, your OAuth app must have the following scopes assigned to it:

- *skills:read*
- *skills:execute*
- *studio.packages:read*

For more information, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform") and [OAuth scopes](oauth-scopes.html "OAuth scopes").

[## 1. Configuring the Action Flow](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_id_ExecuteActionFlowsinSkills-ConfiguringtheActionFlow_body)

1. In your Action Flow editor, go to edit mode.
2. Click the '+' icon to add a new module.
3. Search for **Celonis**.
4. Select **Custom Webhook**.
5. Configure a Webhook by clicking **Add** in the Action configuration by naming it and adding any IP restrictions. The URL is created automatically.

   |  |
   | --- |
   |  |
6. Save your changes and deploy the Action Flow to make it accessible from within skills.

[## 2. Configuring the Skill](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_id_ExecuteActionFlowsinSkills-ConfiguringtheSkill_body)

1. Go to the Skill from which you want to execute an Action Flow.
2. Add a sensor to your Skill. In the example below, we've used a [Manual Sensor](celonis-manual-sensor.html "Celonis manual sensor"), allowing for a manual execution of the skill by copying and inserting the execution URL in the browser.
3. (optional) You can specify a custom input (called 'Test' with the initial value 'sample input' in the example below) that will be passed on to the Action Flow to be executed.

   |  |
   | --- |
   |  |
4. Go to **Next Step** > **Celonis** > **Execute Action Flows** and select the Action Flow you want to use.

   The list displays Action Flows that have been deployed.
5. In the **Data** field below, you can specify additional data to pass to the Action Flow in JSON format.

   |  |
   | --- |
   |  |

**Note**

An additional menu called 'Output' opens when you click on the 'Data' field. From this menu you can see all outputs from previous Skills (in our case: the Manual Sensor) that you can reference in the 'Data' field to be forwarded to the Action Flow.

[### Accessing Parameters in Action Flows](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_id_ExecuteActionFlowsinSkills-AccessingParametersinActionFlows_body)

If you now **run your Action Flow once** by clicking the **Run** icon in the upper right corner, you will have the parameters available as inputs, allowing you to use them in further Actions.

**Important**

Your Action Flow will only receive something if your Skill sends something, so make sure to trigger the Sensor to make the Skill send Bundle(s) to the Action Flow.

[## Using Action Flows output in Skills](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_id_ExecuteActionFlowsinSkills-UsingAnOutputFromActionFlowsinSkills_body)

To use output generated from Action Flows in Skill, you must add a response action module to your automation. This module is responsible for sending content back to the Skill in which you execute the Action Flow.

- Configure a **Webhook Response Action**:by adding a new Action → Webhooks → Response Action.

  1. In your Action Flow, go to **edit mode**.
  2. Click on the '+' icon to **add a new action**.
  3. Search for **Webhooks**.
  4. Select **Response Action**.

     |  |
     | --- |
     |  |

[## Example of using Action Flows output in Skills](#UUID-c07ca922-03ad-5538-79bd-602382437c3d_section-id235485226612675_body)

In this example, a JSON-formatted text is created to send back to the Skill. Follow these steps:

1. **Create the data structure:** Add a new data structure (1) and assign it a name (2).
2. **Define an item:** Click to add an item (3) to the structure. Choose a name for this item (4) and remember it, as you will need it shortly.
3. **Verify and save:** Add the item (5), ensuring your configuration matches the provided screenshot. Once confirmed, save the data structure (6).
4. **Map the module data:** After saving, a new field will appear bearing the item name you just defined (shown as 'input' in the screenshots below). Fill this field with the corresponding item from the Celonis module (7).
5. **Confirm the setup:** Click OK (8) to save and finalize your configuration.

   |  |
   | --- |
   |  |

After saving, publishing, let the Action Flow run and trigger the sensor with the corresponding link to get the Custom Success Message defined before, in our case, including the data we passed to the Action Flow and sent back.

|  |
| --- |
|  |

## Related topics

- [Process Automation Skills](skills-and-automation.html "Process Automation Skills")
- [Skill Permissions](skill-permissions.html "Skill Permissions")


---

## automation/action-flows/execute-skills-in-action-flows

# Execute Skills in Action Flows

In this tutorial, we're going to cover how to execute existing Skills within an Action Flow. If you're interested in how to execute an Action Flow from a Skill, please refer to [this tutorial](execute-action-flows-in-skills.html "Execute Action Flows in Skills").

Expand all

[## Before you begin](#UUID-5848a7e0-6db9-068a-847e-dcc62a72f7b3_section-id235480089005786_body)

If you want to use the OAuth connection method for your Action Flow, your OAuth app must have the following scopes assigned to it:

- *skills:read*
- *skills:execute*
- *studio.packages:read*

For more information, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform") and [OAuth scopes](oauth-scopes.html "OAuth scopes").

[## 1. Configuring the Skill to be executed](#UUID-5848a7e0-6db9-068a-847e-dcc62a72f7b3_id_ExecuteSkillsinActionFlows-ConfiguringtheSkilltobeexecuted_body)

1. Navigate to the Skill you want to execute.
2. Add a Manual Sensor, allowing for a manual execution of the skill by copying and inserting the execution URL in the browser.

   **Note**

   You can only select Skills with a **Manual Trigger**, not with a Smart Trigger.
3. (optional) Add input field to have the possibility to transfer data from the Action Flow to the Skill).

   1. Select the add new input button to have the possibility to transfer some data from the Action Flow to the Skill later
   2. Give you input a name.
   3. Save.
   4. Publish the package (necessary to find the skill within the Action Flow)
   5. Publish the Skill to make it accessible from within Action Flows.

[## 2. Configuring the Action Flow](#UUID-5848a7e0-6db9-068a-847e-dcc62a72f7b3_section-id235480402107128_body)

1. Create an application key.
2. Add a new action.
3. Search for 'Celonis'.
4. Select 'Execute Process Automation Skill'.
5. Add a connection and enter the application key you just created.

   |  |
   | --- |
   |  |

   A new menu opens up with a list of all published Skills within the team you're working in. **Select the Skill** you want to execute within your Action Flow. If you added the input field at the Manual sensor a field will be shown when you selected the skill where you can put the data to transfer in.

   **Pass CSV Output to Skill**

   If you want to use a CSV output from your Action Flow in a Skill, you have to encapsulate the data with the base64() function.

   |  |
   | --- |
   |  |
6. Run the Action Flow to execute the Skill.

## Related topics

- [Process Automation Skills](skills-and-automation.html "Process Automation Skills")
- [Skill library](skill-library.html "Skill library")


---

## automation/action-flows/exporting-and-importing-action-flows

# Exporting and importing Action Flows

You can export Action Flows and their dependencies from a single package using the command-line interface. Exported dependencies include webhooks, data structures, variables and other. Webhooks and connections are exported as metadata references and can not be imported as-is to the target team.

## Exporting Action Flows

To export Action Flows from a package, in your command line interface, run:

```
content-cli export action-flows -p my-profile-name --packageId <replace-with-package-id> -f <replace-with-metadata-file-name>content-cli analyze action-flows -p my-profile-name --packageId <replace-with-package-id> --outputToJsonFile
```

- The `-f` flag is optional but recommended if you plan to use the ZIP package to import it to a target package. If specified, it will attach the metadata file to the exported ZIP package. This file is expected to be received by the action-flows import command, and manually be populated with the mappings source to target package.

## Importing Action Flows

To import previously exported Action Flows from a single package, together with their dependencies, from the command-line interface, run:

```
content-cli import action-flows -p my-profile-name --packageId <replace-with-package-id> -f <replace-with-exported-zip-file> --dryRun false --outputToJsonFile
```

- The zip file is the one that you receive from the action-flows export command, and it includes the JSON metadata.
- The `--dryRun` is mandatory boolean true/false. If specified, the import will be executed in a dry run mode where no real import
- The `--outputToJsonFile` is optional. If specified, the import result is saved in a JSON file. The command output will give you all the details.


---

## automation/action-flows/export-view-as-pdf--action-flow-

# Export View as PDF (Action Flow)

You can generate a PDF version of your Studio Views. This allows you to export your Views or their selected parts and share them for reporting purposes within and outside your organization.

**This feature is currently available as a Private Preview only**

During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.

If you would like to use this feature, create a Support ticket at [Celonis Support](https://support.celonis.com/).

For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types")

Expand all

[## Before you begin](#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id235407631129727_body)

[### Create a Reporting application with the necessary permissions](#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id235407633292035_body)

The Export View as PDF module requires a **Reporting Application** to connect to the Celonis Platform. This is an OAuth-type of application with a predefined scope, specifically designed for reporting purposes. The application must have USE permissions for the specific View you intend to export.

1. Go to **Admin & Settings** > **Applications**.
2. Select **Add New Application** > **Reporting application**.
3. Give the applications a name and description and click **Save**.
4. Go to Studio, and next to the View you want to export, select **Options** (three dots) > **Permissions**.
5. Search for the newly created reporting application.
6. Click **+ Use** to give the application the necessary permissions.
7. Click **Save**.

[### Verify your user permissions](#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id235468095858311_body)

To configure the Export PDF module, users must have the USE all application permission assigned. To assign this permission to a user:

1. Go to **Admin & Settings** > **Service permissions**.
2. From the list of services, select **Reporting**.
3. Click **+Assign permissions**.
4. Find the user you want to assign permission to, and click the plus icon next to their username.
5. Click **Next**.
6. Next to the select user, select USE and click **Assign Permissions**

[### Check limitations](#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id235436942773571_body)

- Using the Export to PDF module, you can run **up to 100 exports a day**.

[## Creating Export View as PDF Action Flow](#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id23540763105692_body)

1. In Studio, go to your package and start editing an existing Action Flow or start a new one by clicking **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Celonis** > **Export View as PDF**.
3. Create a connection using the Reporting application. See [Create a Reporting application with the necessary permissions](export-view-as-pdf--action-flow-.html#UUID-015a67e6-88b7-28aa-87fb-bff7341d501a_section-id235407633292035 "Create a Reporting application with the necessary permissions").
4. Select the View from which you want to generate the PDF.

   **Note**

   The list shows only published Views.
5. Select tabs from your View that you want to include in the PDF.
6. (optional) Select a bookmark from your View that you want to include in the PDF. Bookmarks allow you to save your user preferences (including filters, selections, and component states) of a View.

   You can only select from bookmarks that have been marked as shared. For more information, see [Bookmarks](using-bookmarks-in-views.html "Creating and viewing bookmarks").
7. Define display settings for your PDF file.
8. Save your changes, publish the Action Flow and activate it.

Once you run the Action Flow, your PDF report is generated in the form of a binary output. You can immediately use that output in other Action Flow modules to, for example, upload it to a cloud storage or send it as an email attachment. To do so, in respective modules, in the file section, make sure you select the output generated by the Export View as PDF module.

## Related topics

- [Create PDF report](create-pdf-report.html "Create PDF report (Action Flow)")
- [Scheduling](scheduling-action-flows.html "Scheduling Action Flows")


---

## automation/action-flows/ftp--action-flow-

# FTP (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Expand all

[## Before you being](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_section-id235514923101561_body)

To use the FTP module, you must have n FTP server or FTP hosting (for example [GoDaddy web hosting](https://uk.godaddy.com/hosting/web-hosting)).

[## FTP module types](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_section-id23551492410045_body)

[### Creating the FTP Connection](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_UUID-21814e6e-dd21-acca-b4ee-30b4e66cfc4f_body)

|  |  |
| --- | --- |
| **Connection name** | Enter the name for your FTP connection. |
| **Host** | Enter the FTP server hostname. E.g. `myftp123.server.com` |
| **Port** | Enter the FTP server port number. E.g. `21` |
| **User name** | Enter your FTP account user name. |
| **Password** | Enter your FTP account password. |
| **Use a secure connection (TLS)** | Select if you want to use a secure connection.  **No**  The connection will not be secured.  **Explicit encryption or Implicit encryption**  FTPS connection. The connection will be secured using SSL. |
| **Reject unauthorized certificates** | If this option is enabled, the FTP server certificate is verified. If the verification fails, the connection will not be created. To pass the verification, the certificate must meet one of the following criteria:  - be signed by a Root [Certificate Authority](https://en.wikipedia.org/wiki/Certificate_authority) - be signed by an Intermediate Certificate Authority (see e.g. [How certificate chains work](https://knowledge.digicert.com/solution/SO16297.html) for further explanation). In this case all the Intermediate Certificates should be installed on the FTP server. - be a Self-Signed Certificate supplied in the *Self-signed certificate* field (see below)  If this option is disabled, the FTP server certificate is not verified. We strongly advise against disabling the option as it renders the connection insecure and poses a serious security risk. |
| **Self-signed certificate** | Click the *Extract* button to open the upload dialog.  Upload the certificate to use the TLS with your self-signed certificate. **Celonis platform does not retain or store any data (files, passwords) you provide. File and password are only used to extract the certificate.** |

[### Triggers](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_UUID-2057c7aa-7bbd-bf6d-2895-32984978d6be_body)

#### Watch files

Monitors the file content of the selected folder. The trigger is executed when a new file is inserted into the specified folder.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder** | Select the folder you want to watch.  Only one folder per Action Flow is allowed. Subfolders are ignored.  To keep track of multiple folders, create an independent Action Flow for each of them. |
| **Maximum number of returned files** | Set the maximum number of results that Celonis platform will work with during one cycle. If the value is set too high, the connection may be interrupted on the side of the given third-party service (timeout). Celonis platform has no influence on this. We recommend that you set a lower value and either define a higher value for the maximum number of cycles or run the Action Flow more frequently. |

**Choose where to start**

Set when do you want to start the FTP file monitoring from.

[### Actions](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_UUID-a9e2365f-0cac-baa1-cc37-f1950555f33c_body)

#### Upload a file

Uploads a file to the FTP server.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder** | Select the FTP folder you want to upload the file to. |
| **Source file** | Select (or map) the file you want to upload to the FTP server. |
| **Append to an already existing file** | If this option is enabled and the file already exists on the FTP server, its content will be appended. If not, the content of the file will be overwritten. |
| ***Create folders if don't exist*** | If this option is enabled and the folder you have entered to the *Folder* field does not exist on the FTP server, the module will create the folder. |

#### Delete a file

Deletes a file from the specified folder.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder** | Select the FTP folder you want to delete a file from. |
| **File name** | Enter the filename (including file name extension). E.g. **`image.png`** |

#### Create a folder

Creates a new folder.

Make sure you have sufficient permissions to create a folder and/or the directory protection is disabled.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder path** | Select the FTP folder you want to create a folder at. |
| **New folder name** | Enter the name for the new folder. |

#### Delete a folder

Deletes a folder.

Make sure you have sufficient permissions to delete a folder and/or the directory protection is disabled.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder** | Select the FTP folder you want to delete. |

#### Move a file or folder

Moves a file from one folder to another.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Old file path** | Enter the path you want to move the file from. For example `/folder1/test.txt` |
| **New file path** | Enter the path you want to move the file to. For example `/folder2/test.txt`. (The target file name can differ from the source file name.) |

#### List of files/folders in a folder

Retrieves file and/or folder details.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Folder** | Select the FTP folder you want to search in. |
| **Show** | Select whether you want to retrieve information about files or folders, or both. |
| **Search** | Enter the search term to filter returned files/folders by. If no search term is entered all files and folders from the specified folder will be returned. |
| **Maximum number of returned files** | Set the maximum number of retrieved files by this module. |

#### Get a file

Retrieves a file from the FTP server which can be further processed, e.g. attached to the email message.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **File path** | Enter the path of the file you want to retrieve. |

##### The Example

The file is retrieved from the FTP server and attached to the Gmail email message.

#### Change permissions

|  |  |
| --- | --- |
| **Connection** | Establish a connection to the FTP account. |
| **Change permission settings of** | Select whether you want to change permissions of the file or the folder. |
| **File path** | Enter the folder or file path. |
| **Permissions** | Set the desired file/folder permissions. Use the chmod parameters. E.g. `777` or `-rwxrwxrwx`    You can find more details on the [chmod Man Page](https://ss64.com/bash/chmod.html). |

[### Known issues with the FTP app](#UUID-039ea893-5187-b41b-89cd-b9891993c54e_UUID-13b73051-468a-1f63-ff1c-765e05b2949f_body)

If you are experiencing issues with the **FTP** app either during the connection creation or during a module's operation, try to use one of the popular FTP clients (e.g. [WinSCP](https://winscp.net/eng/download.php)) and try to perform the same action (e.g. create a connection, list files in a folder, etc.) with the FTP client. If you are experiencing the same issues also with the FTP client, the reason might be a misconfiguration of the FTP server.

Please note that there are two FTP modes: **active** and **passive.** As the Celonis platform **FTP** app requests the **passive** mode, the **FTP server must support the passive mode** in order an FTP session can be successfully established during the following four steps:

1. The Celonis platform server sends the `PASV` command to the FTP server on **port 21** (or **990** if *Use a secure connection (TLS):* "Implicit encryption" option has been chosen in the connection setup). **This port must be open on the FTP server's firewall.**
2. The FTP server should send `227: Entering Passive Mode (h1,h2,h3,h4,p1,p2)` in response. The response specifies:

   - **The IP address** (h1, h2, h3, h4) the Celonis platform server should connect to. When the FTP server is behind a NAT, **the FTP server needs to provide its external IP address.** It is common that the FTP server is not configured properly and provides its internal IP address instead that cannot be connected to from the Celonis platform server, e.g.:
   - **A random, high-numbered (ephemeral) port** (p1, p2) that the Celonis platform server can connect to. **This port must be open on the FTP server's firewall.**
3. The Celonis platform server initiates a connection to the IP address and port specified in the response.
4. The FTP server responds with an `ACK`. The FTP session has now been established.

#### Sources

- <https://winscp.net/eng/docs/ftp_modes>
- <https://documentation.meraki.com/MX/NAT_and_Port_Forwarding/Active_and_Passive_FTP_Overview_and_Configuration#section_3>

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/gatewayapi--action-flow-

# GatewayAPI (Action Flow)

The GatewayAPI modules enable you to send SMS or make an API call in your GatewayAPI account.

Expand all

[## Before you begin](#UUID-77e132d6-65fe-c00b-5663-de6aec7e8ef3_id_getting-started-with-gatewayapi_body)

To use the GatewayAPI module, you must have a GatewayAPI account. You can create an account at [gatewayapi.com](https://gatewayapi.com/).

[## Connecting GatewayAPI to Celonis platform](#UUID-77e132d6-65fe-c00b-5663-de6aec7e8ef3_id_connecting-gatewayapi-to-integromat_body)

To connect your GatewayAPI account to Celonis platform you need to obtain the API Token from your account.

1. Log in to your GatewayAPI account.
2. Go to *API* > *API Keys* from the menu on the left.
3. Click on the *GET KEY / TOKEN* button.
4. Copy the provided token to the clipboard.
5. Go to Celonis platform and open the GatewayAPI module's *Create a connection* dialog.
6. Enter the API Token you have copied in step 4 to the respective field and click the *Continue* button to establish the connection.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/get-assignee--action-flow-

# Get Assignee (Action Flow)

The Get Assignee Action Flow module allows you to query any existing Assignment Rules to determine the correct Assignee or a custom output based on specific input parameters.

Thanks to the open nature of Assignment Rules, they can be utilized for a broad spectrum of use cases. In a nutshell, most tasks involving the return of a value, based on a custom lookup, can be completed using Assignment Rules. Some examples include:

- Assigning a task to a specific user based on certain criteria.
- Defining email recipients on a per-case basis.
- Expanding the source system through additional information.

Expand all

[## Before you begin](#UUID-9622d556-8b75-d6bf-9454-0cd9ea74ebc4_section-id235480391106825_body)

- To use this module, you must create and activate an **Assignment Rule** in the packages variable settings. For information on how to create an Assignment rule, see [Assignment Rules](assignment-rules.html "Assignment Rules").
- If you want to use the OAuth connection method in the Get Assignee module, your OAuth app must have the following scopes assigned to it:

  - *knowledge-models:read*
  - *studio.packages:read*

[## Configuring the Get Assignee module](#UUID-9622d556-8b75-d6bf-9454-0cd9ea74ebc4_id_GetAssignee-ConfiguringtheGetAssigneemodule_body)

1. In Studio, go to your package and click **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Celonis** > **Get Assignee**.
3. Select the connection type you want to use for your module. Choose from the following:

   - **Celonis user** - this connection type will reflect your existing data permissions and allow you to query data to which you already have access.

     **Note**

     You must have Data integration service permission to use this connection method. See [Data Integration permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions").

     1. Give your connection a name.
     2. Click **Save**.
   - **Celonis Application Key** -This connection type will reflect the data permissions granted to the selected Application Key and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create an application key and copy it. See [Application keys](application-keys.html "Creating and granting permissions to application keys").
     3. Paste the application key and click **Save**.
   - **Celonis OAuth Client Credentials** this connection type will reflect the data permissions granted to the selected OAuth app and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create the OAuth application application Client ID and Secret and copy it. See [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").
     3. Paste the Client ID and Secret here and **Save**.

     **Note**

     For creating and testing an Action Flow, the 'Celonis User Connection' might be the fastest and easiest choice to get started.

     For unattended full-automation use cases, we recommend switching to the 'Celonis App Key Connection'. This ensures that the automation runs stable even if a specific user is removed from the team.
4. From the **Assignment Rule** dropdown, select the rule you wish to apply.

   If you haven't created any rules yet, see [Assignment Rules](assignment-rules.html "Assignment Rules").
5. Fill in the required Assignment Rule by clicking in their boxes and selecting the respective attributes using the pop-out menu.
6. **Save** your changes.
7. [Deploy your package version](version-deploy.html#UUID-7df8f521-08ec-66e2-28fd-df6b1985a58f_section-id235184866379158 "Deploying a package version to Apps") to make the module operational.

Your module is ready for use. Run in to start generating output based on the Assignee values defined in your Assignment Rules. To view the Get Assignee output, click the magnifying glass icon to its top right. You can then utilize this output value in a variety of ways:

- Send an Email to the correct Assignee
- Update a column in a database
- Update a document (*e.g. contact details*)

## Related topics

- [Assignment Rules](assignment-rules.html "Assignment Rules")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")


---

## automation/action-flows/get-rows--action-flow-

# Get Rows (Action Flow)

The Get Rows Action Flow module queries parts of your Knowledge Model or Data Model and provides the respective columns as output, which can be used in subsequent steps.

Expand all

[## Before you begin](#UUID-9b59e77c-c9d5-2b6d-ed8e-573cb6f83d38_section-idm2393548040906736_body)

If you want to use the OAuth connection method for your Action Flow, your OAuth app must have the following scopes assigned to it:

- *knowledge-models:read*
- *knowledge-models:query*
- *integration.data-pools:read*
- *Integration.data-models:read*
- *integration.data-pools:query*

For more information, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform") and [OAuth scopes](oauth-scopes.html "OAuth scopes").

[## Configuring the Get Rows module](#UUID-9b59e77c-c9d5-2b6d-ed8e-573cb6f83d38_id_QueryData-GettingStarted_body)

1. Go to the **edit mode**.
2. Click on the '+' icon to **add a new action**.
3. Search for **Celonis**.
4. Select **Get Rows**.

   |  |
   | --- |
   |  |
5. Add a connection by clicking **Add** in the Get Rows action.

   You can either move forward by clicking the **Continue** button and establishing a "Celonis User" connection or selecting "Celonis Application Key" from the **Connection type** dropdown.

   **Tip**

   For creating and testing an Action Flow, the "Celonis User" connection might be the fastest and easiest choice to get started.

   For unattended full automation use cases we recommend switching to the "Celonis Application Key" connection. This ensures that the automation remains stable even if a specific user is removed from the team.

   |  |
   | --- |
   |  |
6. Select the connection type you want to use for your module. Choose from the following:

   - **Celonis user** - this connection type will reflect your existing data permissions and allow you to query data to which you already have access.

     **Note**

     You must have Data integration service permission to use this connection method. See [Data Integration permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions").

     1. Give your connection a name.
     2. Click **Save**.
   - **Celonis Application Key** -This connection type will reflect the data permissions granted to the selected Application Key and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create an application key and copy it. See [Application keys](application-keys.html "Creating and granting permissions to application keys").
     3. Paste the application key and click **Save**.
   - **Celonis OAuth Client Credentials** this connection type will reflect the data permissions granted to the selected OAuth app and allow you to query data to which you may not otherwise have access.

     1. Give your connection a name.
     2. In a separate window, create the OAuth application application Client ID and Secret and copy it. See [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").
     3. Paste the Client ID and Secret here and **Save**.
7. Select your Knowledge or Data Model.

   The module will show only Knowledge Models available in a given Studio package.

   |  |
   | --- |
   |  |
8. Click **Add Columns** to add the columns you want to query. Depending on the data source queries (Data Model or Knowledge Model), provide the following details:

   **Note**

   If the column you want to add from the Knowledge Model is not displayed in the dropdown, click **Refresh** to make sure any new columns added since the Get Rows module was created are added to the dropdown.

   |  |
   | --- |
   |  |

   - **If a Knowledge Model is being queried**, provide the following details:

     - **Column** - the record attribute or KPI which should be queried and then can be used in consecutive Action Flow modules.
     - **Column Sorting** - the direction in which the column output will be returned:

       **Note**

       This field is only displayed if the **Show advanced settings** option is toggled on.

       - **None (*default*)**: No sorting is applied in query results.
       - **Ascending**: Results are returned in ascending order.
       - **Descending:** Results are returned in descending order.
   - **If a Data Model is being queried**, add a column by creating a PQL expression. Each column has three fillable fields:

     |  |
     | --- |
     |  |

     - **Column Name** - The name that will be used when displaying that column's outputs.
     - **PQL Formula** - The PQL query used to extract that column (*e.g. "VBAK"."VKORG"*).
     - **Column Sorting** - Defines the direction in which the output of this column will be returned.

       **Note**

       This field is only displayed if the **Show advanced settings** option is toggled on.

       There are three options:

       - **None (*default*)**: No sorting will be applied when querying results.
       - **Ascending**: Results will be returned in ascending order.
       - **Descending:** Results will be returned in descending order.

       The sorting priority will be defined according to the order of columns in the columns array. To change the sorting options, select the **Show advanced settings** checkbox.

     **Tip**

     When querying a Data Model, we recommend starting with a [Studio Analysis](building-an-analysis-in-studio.html "Creating and publishing Analysis in Studio") from which you can copy the PQL queries to the Query Data action. When pasting PQL into the Query Data action we recommend using the "paste without formatting" option (**Ctrl+Shift+V**).
9. Add data filtering. Depending on the data source queried (Knowledge Model or data Model), provide the following data:

   Select a filter from the selected Knowledge Model or define a custom filter using PQL.

   **Note**

   If the filter you want to add from the Knowledge Model is not displayed in the dropdown, click **Refresh** to make sure any new filters added since the Get Rows module was created are added to the dropdown.

   **Filtering in a Data Model:** Define your filter by creating an expression using PQL.

   - **If a Data Model is being queried**, define your filter by creating an expression using PQL.

     1. Click **Add Filter**.

        |  |
        | --- |
        |  |
     2. Enter a name, define the filter and then click **OK** to add the filter to the setup.
     3. Repeat the process to add more filters.
   - **If a Knowledge Model is being queried**, select a filter from the selected Knowledge Model or define a custom filter using PQL.

     1. Click **Add Filter**.

        |  |
        | --- |
        |  |
     2. Select a filter type and enter a name.
     3. If you selected "Custom Filter" as the filter type, create the filter by defining the expression using PQL.
     4. Click **OK** to add the filter to the setup.
     5. Repeat the process to add more filters.
10. Use the **Row Limit** field to adjust the number of rows being queried. The default value is 50 rows per execution cycle.
11. (optional) Add Advanced Settings (see [Advanced Settings](get-rows--action-flow-.html#UUID-9b59e77c-c9d5-2b6d-ed8e-573cb6f83d38_id_QueryData-AdvancedSettings "Advanced Settings")) or click **OK** to finish.
12. Deploy your changes to make the module operational.
13. To make the queried columns available in subsequent actions, you must run the module once by clicking the blue run button.

You're all set to **use your defined columns in subsequent actions**. Your columns will be listed just like parameters from other actions. In the example below, we're accessing our columns "Order Number" and "Planned Delivery Date" (these were the aliases we chose) to send a message in Slack.

[## Advanced Settings](#UUID-9b59e77c-c9d5-2b6d-ed8e-573cb6f83d38_id_QueryData-AdvancedSettings_body)

Toggle the **Show advanced settings** switch on to adjust the following properties:

| Property | Description |
| --- | --- |
| Sorting | Indicates the direction in which the output of a column will be returned. There are three options:  - **None (*default*)**: No sorting will be applied when querying results. - **Ascending**: Results will be returned in ascending order. - **Descending:** Results will be returned in descending order. |
| Offset | Indicates the number of rows to skip so you can view the data in a different order. For example, if the offset is "500", then the filter will skip the first 500 rows. |

## Before you begin

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [PQL - Process Query Language](https://docs.celonis.com/en/pql---process-query-language.html)


---

## automation/action-flows/get-tasks--action-flow-

# Get Tasks (Action Flow)

The Get Task Action Flow module returns the Task IDs of the Tasks that you picked. You can use this information to update a Task once it is created.

Expand all

[## Before you begin](#UUID-d31c1853-65db-6d91-6893-c6d5c00c3e43_section-id235485167842003_body)

If you want to use the OAuth connection method for your Action Flow, your OAuth app must have the following scopes assigned to it:

- *tasks:read*
- *knowledge-models:read*

For more information, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform") and [OAuth scopes](oauth-scopes.html "OAuth scopes").

[## Configuring the Get Tasks module](#UUID-d31c1853-65db-6d91-6893-c6d5c00c3e43_section-id235485181536813_body)

1. In your Action Flow editor, go to edit mode.
2. Click the '+' icon to add a new module.
3. Search for **Celonis**.
4. Select **Get Tasks**.
5. Configure your module by entering the following values:

   - **Knowledge Model**: Select the Knowledge Model of the record of which you would like to get all Tasks.
   - **Record**: Select the Record for which you would like to get all Tasks.
   - **Record Identifier**: Put the identifier of the Record. This unique identifier is defined in the KM.
   - **Task Status**: Specify for which subset of Tasks you want to get the ID. If you leave it empty, the action returns you the ID of all Tasks - regardless of their Status.
   - **Assignee**: Specify for which subset of Tasks you want to get the ID. If you leave it empty, the action returns you the ID of all Tasks - regardless of their Assignee.

   |  |
   | --- |
   |  |
6. Save your changes and deploy the Action Flow to make it operational.

## Related topics

- [Task configuration](task-configuration.html "Task configuration")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")


---

## automation/action-flows/github--action-flow-

# GitHub (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The GitHub modules allow you to watch, create, update, list, retrieve, and delete the assignees, labels, comments, issues, milestones, releases, and gist files in your GitHub account.

Expand all

[## Connecting GitHub to Celonis platform](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac_body)

To connect to GitHub:

1. In **Studio**, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **GitHub**.
3. Click **Create a connection**.

   For the list of available connection types, see [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows").
4. Optional: Click **Show Advanced Settings** and enter the client credentials.
5. Click **Save**.
6. Confirm the access by clicking **Authorize**.

You have successfully established the connection. You can now edit your scenario and add more GitHub modules. If your connection needs reauthorization at any point, follow the connection renewal steps [here](https://www.make.com/en/help/connections/connecting-to-services.html).

[## Types of GitHub modules](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_section-id235516508775986_body)

[### Triggers](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-526c5b75-87db-3330-4a97-af0349b7e547_body)

See the [Connecting to GitHub Webhook usingCelonis platform](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_id_h_01ES8DHT2W4Z5T1QNAH2N0NX56 "Connecting to GitHub Webhook using Celonis platform") for adding the webhooks to your GitHub account.

[#### Watch Comments](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-7b28ccd8-6159-e13a-ac23-c148cc108a28_body)

Triggers when a new comment is added, or an existing comment is modified.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Repositories** | Set the maximum number of comments Celonis platform should return during one Action Flow execution cycle. |
| **Watch** | Select the comments you want to watch:  - *Only new comments* - *New comments and all changes* |

[#### Watch Comments](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-504da954-1372-fbfd-c177-25687beb97b6_body)

Triggers when a new comment is created.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Comments** | Set the maximum number of comments Celonis platform should return during one Action Flow execution cycle. |

[#### Watch Forks](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-7b978af9-f65f-782e-5292-f1d951a1ba63_body)

Triggers when a new fork is created.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Forks** | Set the maximum number of forks Celonis platform will return during one cycle. |

[#### Watch Gists](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-e53b3d8b-d0dd-4922-eb57-05c004469332_body)

Triggers when a new gist is added, or an existing gist is modified.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Gists** | Set the maximum number of gists Celonis platform should return during one Action Flow execution cycle. |
| **Watch** | Select the gists you want to watch:  - *Only new gists* - *New gists and all changes* |

[#### Watch Issues](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-88fa3f49-2de6-65f8-8691-6273936850d5_body)

Triggers when a new issue is added, or an existing issue is modified.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Issues** | Set the maximum number of issues Celonis platform should return during one Action Flow execution cycle. |
| **Watch** | Select the issues you want to watch:  - *Only new issues* - *New issues and all changes* |
| **Filter** | Select the option to filter the results:  - *All issues* - *Only issues assigned to me* - *Only issues created by me* - *Only issues mentioning me* - *Only issues I'm subscribed to it updates for* |
| **State** | Select the issue status you want to watch:  - *Only open issues* - *Only closed issues* |
| **Labels** | Add the tags of the issues you want to watch. |

[#### Watch Issues for Events](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-9d9ac96d-a461-2b26-3630-8add2219fb05_body)

Triggers when an issue is assigned, unassigned, labeled, unlabeled, opened, closed, or reopened.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Issues for Events** | Set the maximum number of issues for events Celonis platform should return during one Action Flow execution cycle. |

[#### Watch Milestones](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-5281691c-d0ac-907c-3bd7-870514af17ac_body)

Triggers when a new milestone is added, or an existing milestone is modified.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Milestones** | Set the maximum number of milestones Celonis platform will return during one cycle. |
| **Watch** | Select the milestones you want to watch:  - *Only new milestones* - *New milestones and all changes* |
| **State** | Select the status of the milestone you want to watch:  - *Open* - *Closed* |

[#### Watch Pull Requests](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-4dfe5466-b506-755c-d18c-fd5af3d6c589_body)

Triggers when a new pull request is added, or an existing pull request is modified.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Pull Requests** | Set the maximum number of pull requests Celonis platform should return during one Action Flow execution cycle. |

[#### Watch Push Actions](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-554d900c-5c46-0860-ebdf-f63c25200b36_body)

Triggers when a new push occurs.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Push Actions** | Set the maximum number of push actions Celonis platform should return during one Action Flow execution cycle. |

[#### Watch Releases](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-9b6944dc-5673-30b7-ad8a-d3f58441a2e6_body)

Triggers when a new release is created.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Releases** | Set the maximum number of releases Celonis platform should return during one Action Flow execution cycle. |

[#### Watch Repositories](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-a45741a7-b903-1cc8-d8ff-6b9566cce237_body)

Triggers when a new repository is added, or an existing repository is modified.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned Repositories** | Set the maximum number of repositories Celonis platform will return during one cycle. |
| **Watch** | Select the repositories you want to watch:  - *Only new repositories* - *New repositories and all changes* |

[### Actions](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-055d88d9-0391-6ded-074b-cfcad08da970_body)

[#### Create an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-a5a4fb77-0261-cba1-4b9e-34ecea93042d_body)

Creates a new issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository in which you want to create the issue. |
| **Assignee** | Select the assignee for the issue. |
| **Milestone** | Select the milestone applicable to the issue. |
| **Labels** | Add the tags for the issue. For example, `bug`, and `enhancement`. |
| **Title** | Enter a name for the issue. |
| **Body** | Enter the issue details. |

[#### Update an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-05ddfded-b0ab-517d-7de1-2beebe2e7534_body)

Updates an existing issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository in which you want to create the issue. |
| **Assignee** | Select the assignee for the issue. |
| **Milestone** | Select the milestone applicable to the issue. |
| **Labels** | Add the tags for the issue. For example, bug, enhancement |
| **Number** | Enter the issue number. |
| **Status** | Select the issue status:  - *Open* - *Closed* |
| **Title** | Enter a name for the issue. |
| **Body** | Enter the issue details. |

[#### Search for an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-ed8a130e-ca4b-2c4b-cd6b-f8730eef7cf6_body)

Returns the information of an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Maximum number of returned issues** | Set the maximum number of issues Celonis platform should return during one Action Flow execution cycle. |
| **Sort By** | Select the option to sort the issues:  - *Best Match* - *Date Created* - *Date Updated* - *Number of Comments* |
| **Sort Direction** | Select the order in which you want to list the issues:  - *Ascending* - *Descending* |
| **Query** | Enter a keyword or phrase to search the issues based on the specified query. |

[#### Get an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-6ebf10f5-ada1-1ba2-ec4d-5bb9b09a9b56_body)

Retrieves information about an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose issue details you want to retrieve. |
| **Number** | Enter the issue number whose details you want to retrieve. |

[#### Add Assignees](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-7d782421-9fd0-52e7-2665-ff2e51296c4c_body)

Adds the assignees to an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository to whose issue you want to add the assignee. |
| **Assignee** | Select the assignees you want to add to the issue. |
| **Number** | Enter the issue number to which you want to add the assignee. |

[#### Remove Assignees](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-1cc9a964-be1b-3e0d-f931-54308083f252_body)

Removes assignees from an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose issue's assignee you want to remove. |
| **Assignee** | Select the assignees you want to remove from the issue. |
| **Number** | Enter the issue number from which you want to remove the assignee. |

[#### Add Labels to an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-48f109d0-5f44-2a31-0edc-9966c5150a84_body)

Adds a label to an Issue

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository to whose issue you want to add a label. |
| **Labels** | Add the labels you want to add an issue. For example, `bug`, and `enhancement`. |
| **Number** | Enter the issue number to which you want to add the labels. |

[#### Remove a Label from an Issue](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-6ab37bfb-5545-7a99-a323-23142d2a4c94_body)

Removes a label from an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose issue labels you want to remove. |
| **Labels** | Add the labels you want to remove from an issue. For example, `bug`, and `enhancement`. |
| **Number** | Enter the issue number from which you want to remove the labels. |

[#### Create a Release](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-51ea7b5e-cc7c-0c6d-16fc-2da421e02e95_body)

Creates a new release.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository in which you want to add the release. |
| **Tag Name** | Add the tags for the release. |
| **Target Commitish** | Specifies the location to commit the release and determines where the Git tag is created from. It can be any branch or commit SHA. Unused if the Git tag already exists. By default, the repository's default branch is the master. |
| **Name** | Enter a name for the release. |
| **Description** | Enter the details of the release. |
| **Draft** | Select whether the release is in a draft stage. |
| **Prerelease** | Select whether this release is eligible for a prerelease. |

[#### Update a Release](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-053d7b8d-c928-8104-c7e9-3dd377f00fa8_body)

Updates an existing release.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose release details you want to update. |
| **Release ID** | Select the Release ID whose details you want to update. |
| **Tag Name** | Add the tags for the release. |
| **Target Commitish** | Specifies the location to commit the release and determines where the Git tag is created from. It can be any branch or commit SHA. Unused if the Git tag already exists. By default, the repository's default branch is the master. |
| **Name** | Enter a name for the release. |
| **Description** | Enter the details of the release. |
| **Draft** | Select whether the release is in a draft stage. |
| **Prerelease** | Select whether this release is eligible for a prerelease. |

[#### Delete a Release](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-9ce31351-939b-3708-809c-b31e1915cc1e_body)

Deletes an existing release.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose release details you want to delete. |
| **Release ID** | Select the Release ID you want to delete. |

[#### Create a Milestone](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-44c169cd-6815-4d15-c702-ed8f7d2a8899_body)

Creates a new milestone.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository in which you want to create the milestone. |
| **Title** | Enter a name for the milestone. |
| **Description** | Enter the details of the milestone. |
| **Due On** | Enter a date on which the milestone is due. |

[#### Update a Milestone](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-52029106-4708-82bf-8d99-f85754925238_body)

Updates an existing milestone.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose milestone details you want to update. |
| **Number** | Enter the milestone number whose details you want to update. |
| **Title** | Enter a name for the milestone. |
| **State** | Select the milestone status:  - *Open* - *Closed* |
| **Description** | Enter the details of the milestone. |
| **Due On** | Enter a date on which the milestone is due. |

[#### Delete a Milestone](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-45b4e7a2-d180-9e35-4c0e-693a92abd92f_body)

Deletes an existing milestone.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose milestone details you want to delete. |
| **Number** | Enter the milestone number you want to delete. |

[#### Create or Edit a File](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-762fa342-fa1b-c4eb-df01-75e404ced2f9_body)

Creates a new or updates an existing file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose file you want to create or update. |
| **Filepath** | Enter the path address of the file. |
| **Message** | Enter details of the file. |
| **Data** | Enter the file data. |
| **SHA** | Enter the SHA details of the file. This field is mandatory to update an existing file. |
| **Branch** | Enter the branch details where you are creating or updating the file. |

[#### Delete a File](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-fdcbbb0f-a7e6-e081-2038-e5f0f23a11db_body)

Deletes an existing file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose file you want to delete. |
| **Filepath** | Enter the path address of the file you want to delete. |
| **Message** | Enter details of the file. |
| **Data** | Enter the file data. |
| **SHA** | Enter the SHA details of the file. This field is mandatory to update an existing file. |
| **Branch** | Enter the branch details of the file you want to delete. |

[#### Get a File](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-8e4c4632-fdec-a02a-aaf7-0635b6db6b9e_body)

Retrieves the information about the specified file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose file you want to delete. |
| **Filepath** | Enter the path address of the file whose details you want to retrieve. |
| **Commit, branch, or tag** | Enter the tag, branch, or commit details of the file you want to retrieve. |

[#### Create a Gist](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-aa88e5e6-fd04-52fb-4630-acfcff18c6a3_body)

Creates a new gist.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Files** | Add the file name and content to make a gist. |
| **This Gist is public** | Select the checkbox if this gist is public. |
| **Description** | Enter the details of the gist. |

[#### Update a Gist](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-53c3fbc7-64d9-101b-cb32-dc2e5f545cd9_body)

Updates an existing gist.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Gist ID** | Select the Gist ID whose details you want to update. |
| **Files** | Add the file name and content to make a gist. |
| **This Gist is public** | Select whether this gist is public. |
| **Description** | Enter the details of the gist. |

[#### Delete a Gist](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-d7b768ae-d6f0-988b-d6f8-83ddaf83ce49_body)

Deletes an existing gist.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Gist ID** | Select the Gist ID you want to delete. |

[#### Create a Comment](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-93a5c6fa-25a2-5f37-d533-671aa4c489a5_body)

Creates a new comment for an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository in which you want to create the comment. |
| **Number** | Enter the issue, milestone, or gist number for which you want to add the comment. |
| **Body** | Enter the comment text. |

[#### List Comments](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-e1f64b89-ff9f-38ae-9c73-868b7d7666a6_body)

Lists comments for an issue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your GitHub account](github--action-flow-.html#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-27b242db-bb8c-55ad-a96e-51367213c1ac "Connecting GitHub to Celonis platform"). |
| **Repository** | Select the repository whose comments you want to list. |
| **Number** | Enter the issue, milestone, or gist number whose comments you want to list. |
| **Since** | Enter the date to list the comments added on or after the specified date. |
| **Maximum number of returned comments** | Set the maximum number of comments Celonis platform should return during one Action Flow execution cycle. |

[### Iterators](#UUID-2b62c12a-8854-0f7b-bfea-2412bab7b943_UUID-11db06fb-5882-1f24-8714-3cb62db61573_body)

#### Retrieve Files

Retrieves files from a gist one at a time.

GitHub retrieves files from only the *Watch Gists* module. The module iterates the received Gist's details one by one.

The iterator module lets you manage the email attachments separately. For example, you can set up to *Watch Gists* module to iterate the Gists with its details.

#### Connecting to GitHub Webhook using Celonis platform

1. Open any Watch Module, establish a connection as mentioned in the respective module description, click *Save*, and copy the URL address to your clipboard.

2. Log in to your GitHub account and open the repository in which you want to add the webhook.

3. Click *Settings* > *Webhooks > Add webhook* and enter the details to add the webhook.

|  |  |
| --- | --- |
| **Payload URL** | Enter the URL address copied in step 1. |
| **Content Type** | Select the content type as `application/json`. |
| **Secret** | Enter the repository's secret details.  To create a secret, open the *Repository* > *Settings* > *Secret*. Enter the name and value of the secret. Click *Add Secret*. |
| **Which event Would you like to trigger this Webhook?** | Select the events for which you want to receive the trigger:  - *Just the push event* - *Send me everything* - *Let me select individual events - populates all the events* |
| **Active** | Select the checkbox to activate the webhook. |

4. Click *Add Webhook*.

The webhook is added successfully.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/gmail--action-flow-

# Gmail (Action Flow)

With Gmail modules in Celonis platform, you can manage the emails, email labels, and attachments in your Gmail account.

Expand all

[## Before you begin](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-id235516616450027_body)

To use the Gmail modules, you must have a Gmail account. You can create an account at [myaccount.google.com](https://myaccount.google.com/).

Refer to the [Gmail API documentation](https://developers.google.com/gmail/api/reference/rest) for a list of available endpoints.

[## Connecting Gmail to Celonis platform](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621_body)

**Important**

To connect an email ending in `@gmail` or `@googlemail`, you need to [create a custom OAuth client](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm459933987897603399225180605 "Creating and configuring a Google Cloud Platform project for Gmail") in the Google Cloud Platform and get your project client credentials to establish the connection in Celonis platform.

There are two procedures to establish the connection in Celonis platform depending on credentials you provide:

- Default credentials provided by Celonis platform. Use the option if your company has a paid subscription to Google Cloud Platform and uses a custom domain name for Gmail: for example, `yourname@yourcompanyname.com`. Proceed to [establishing the connection in your Celonis platform Action Flow](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm234759897628864 "Establishing the connection in Celonis platform") where you can skip the step 3.
- Your custom credentials. You only have restricted access to Gmail API which doesn't allow using default credentials provided by Celonis platform. You need to create a [custom OAuth client in Google Cloud Platform](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm459933987897603399225180605 "Creating and configuring a Google Cloud Platform project for Gmail"):. Use the option if:

  - You don't have a subscription to Google Cloud Platform, use a free Google Account, and have your email address ending with `@gmail` or `@googlemail`.
  - You use a paid Google Account, and you want to have more control of what the Gmail app in Make is able to do. You need to gain the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

  Proceed to [creating a custom OAuth client](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm459933987897603399225180605 "Creating and configuring a Google Cloud Platform project for Gmail") in Google Cloud Platform, and then [establish a connection in your Celonis platform Action Flow](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm234759897628864 "Establishing the connection in Celonis platform") where you need to follow all the steps.

### Creating and configuring a Google Cloud Platform project for Gmail

To connect to Celonis platform using your own client credentials, you can create and configure a project in the Google Cloud Platform.

**Important**

You need to follow the procedure if you use an email address that ends with `@gmail` or `@googlemail`.

#### Create a Google Cloud Platform project for Gmail

To create a Google Cloud Platform project:

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**. If you already have a project, proceed to the [step 5](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_N1737995418256 "Step 5").
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown. If not, select the project you just created.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

#### Enable APIs for Gmail

To enable the required APIs:

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the following API: **Gmail API**
3. Click **Gmail API**, then click **Enable**. If you see the **Manage** button instead of the **Enable** button, you can proceed to the next step: the API is already enabled.

#### Configure your OAuth consent screen for Gmail

To configure your OAuth consent screen:

1. In the left sidebar, click **Google Auth Platform**.

   **Note**

   If you don't see **Google Auth Platform** in the left sidebar, click **View all products** at the top of it, then pin **Google Auth Platform** to the sidebar.
2. Click **Get Started**.
3. In the **Overview** section, under **App information**, enter *Make* as the app name and provide your Gmail address. Click **Next**.
4. Under **Audience**, select **External**. Click **Next**.

   For more information regarding user types, refer to [Google's Exceptions to verification requirements documentation](https://support.google.com/cloud/answer/9110914#exceptions-ver-reqts).
5. Under **Contact Information**, enter your Gmail address and click **Next**.
6. Under **Finish**, agree to the Google User Data Policy.
7. Click **Continue** > **Create**.
8. Click **Create OAuth Client**.
9. In the **Branding** section, under **Authorized domains**, add `celonis.com`. Click **Save**.
10. Optional: In the **Audience** section, add your Gmail address on the **Test users** page, then click **Save and continue** if you want the project to remain in the **Testing** publishing status. Read the note below to learn more about the publishing status.
11. In the **Data Access** section, click **Add or remove scopes**, add the following scopes:

    `https://mail.google.com`

    `https://www.googleapis.com/auth/userinfo.email`

    You can add scopes using:

    - A table with filters:
    - A window to manually enter scopes:

    Click **Update**.
12. Click **Save**.

**Note**

**Publishing Status**

**Testing:** If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Celonis platform every week. To avoid weekly reauthorization, update the project status to **In production**.

**In production:** If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly. To update your project's status, go to the **Google Auth Platform**, the **Audience** section, and click **Publish app**. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?authuser=1&visit_id=638718595933013017-1855034908&rd=1) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding the publishing status, refer to the Publishing status section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=).

#### Create your Gmail client credentials

To create your client credentials:

1. In Google Auth Platform, click **Clients**.
2. Click **+ Create Client**.
3. In the **Application type** dropdown, select **Web application**.
4. Update the **Name** of your OAuth client. This will help you identify it in the platform.
5. In the **Authorized redirect URIs** section, click **+ Add URI** and enter the following redirect URI:

   `https://auth.redirect.celonis.cloud/oauth/cb/google-restricted`
6. Click **Create**.
7. Click the OAuth 2.0 Client you created, copy your **Client ID** and **Client secret** values, and store them in a safe place.

   |  |
   | --- |
   |  |

You will use these values in the **Client ID** and **Client Secret** fields in Celonis platform.

### Establishing the connection in Celonis platform

1. Log in to your Celonis platform account, add a Gmail module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional for Gmail users with non-`@gmail` or `@googlemail` domains: Switch on the **Show advanced settings** toggle and enter your Client ID and Client secret that you created in the previous section. For more information, see the [Create and configure a Google Cloud Platform project for Gmail section](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm459933987897603399225180605 "Creating and configuring a Google Cloud Platform project for Gmail") above.
4. Click **Sign in with Google**.
5. If prompted, authenticate your account, grant all requested permissions, and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Gmail modules.

[## Types of Gmail modules](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-id235516616987796_body)

[### Build Gmail Action Flows](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-4939c009-4a91-84f7-5c8d-c2d54c6d920e_body)

After connecting the app, you can perform the following actions:

#### Triggers

[##### Watch Emails](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm1953396665855258_body)

Triggers when a new email is received to be processed according to specified criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the email folder you want to watch. |
| **Filter type** | Select **Simple filter** to filter emails by selecting criteria, or **Gmail filter** to filter emails by entering the query. |
| **Criteria** | Select the option to filter watched emails by. |
| **Query** | Use [the Gmail search syntax](https://support.google.com/mail/answer/7190). To search for messages containing an icon of a specific color, use the following search query:  - Yellow Star: `l:^ss_sy` - Blue Star: `l:^ss_sb` - Red Star: `l:^ss_sr` - Orange Star: `l:^ss_so` - Green Star: `l:^ss_sg` - Purple Star: `l:^ss_sp` - Red Bang: `l:^ss_cr` - Yellow Bang: `l:^ss_cy` - Blue Info: `l:^ss_cb` - Orange Guillment: `l:^ss_co` - Green Check: `l:^ss_cg` - Purple Question: `l:^ss_cp` |
| **Sender email address** | Enter the email addresses that you want to filter emails by. |
| **Subject** | Enter the characters string in the email subject that you want to filter emails by. |
| **Search phrase** | Enter the characters string in the email subject or body that you want to filter emails by. |
| **Mark email message(s) as read when fetched** | Select whether you want to mark retrieved emails as read. |
| **Maximum number of results** | Set the maximum number of results that Celonis platform will work with during one cycle. |

#### Actions

[##### Copy an Email](#id596739_body)

Copies an email or a draft into a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the email source folder that contains an email you want to copy. |
| **Destination folder** | Select the email destination folder where you want to copy an email to. |
| **Email ID (UID)** | Enter the ID of the email you want to copy. To get the Email ID (UID), use the **Email > Get Emails** module. You will see the value in the output. |

[##### Create a Draft](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm1953396666188092_body)

Creates a new draft and adds it to a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the folder you want to add a draft to. |
| **To** | Enter the recipient's email address. |
| **Subject** | Enter the email draft subject. |
| **Content** | Enter the email message body. You can use HTML tags. |
| **Attachments** | |  |  | | --- | --- | | **File name** | Enter the name of the file to be uploaded, including the file extension. For example, `myFile.png`. | | **Data** | Enter the file data. | |
| **Copy recipient** | Enter the copy recipient's email address. (CC:) |
| **Blind copy recipient** | Enter the blind copy recipient's email address. (BCC:) |

[##### Delete an Email](#id596838_body)

Removes an email or a draft from a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Gmail Message ID** | Enter the ID of the message you want to delete. To get the Gmail Message ID, use the **Gmail > Watch Emails** module. You will see the value in the output. |
| **Permanently** | Select whether you want to move the email to the thrash folder or to permanently delete it. |

[##### Mark an Email as Read](#id596863_body)

Marks an email or a draft in a selected directory as read by setting the "Read" flag.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the folder that contains the email you want to mark as Read. |
| **Email ID (UID)** | Enter the ID of the email you want to copy. To get the Email ID (UID), use the **Email > Get Emails** module. You will see the value in the output. |

[##### Mark an Email as Unread](#id596888_body)

Marks an email in a selected directory as read by setting the "Unread" flag.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the folder that contains the email you want to mark as Unread. |
| **Email ID (UID)** | Enter the ID of the email you want to copy. To get the Email ID (UID), use the **Email > Get Emails** module. You will see the value in the output. |

[##### Modify Email Labels](#id596913_body)

Modifies labels on the specified email message.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Gmail Message ID** | Enter the ID of the message whose labels you want to modify. To get the Gmail Message ID, use the **Gmail > Watch Emails** module. You will see the value in the output. |
| **Labels to add** | Select the labels you want to attach to the email. |
| **Labels to remove** | Select the labels you want to detach from the email. |

[##### Move an Email](#id596944_body)

Moves a chosen email to a selected folder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **Folder** | Select the email source folder that contains an email you want to move. |
| **Destination folder** | Select the email destination folder where you want to move an email to. |
| **Email ID (UID)** | Enter the ID of the email you want to copy. To get the Email ID (UID), use the **Email > Get Emails** module. You will see the value in the output. |

[##### Send an Email](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_section-idm1956793332283962_body)

Sends a new email.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Gmail account](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform"). |
| **From** | Enter a custom sender email address.  There are two options for entering:  - a custom name in quotes before a custom sender email address: `"John Bush" test@email.com` - an email address that you're already connected with: `test@mail.com` |
| **To** | Enter the recipient's email address. |
| **Subject** | Enter the email subject. |
| **Content** | Enter the email message body. You can use HTML tags. |
| **Attachments** | |  |  | | --- | --- | | **File name** | Enter the name of the file to be uploaded, including the file extension. For example, `myFile.png`. | | **Data** | Enter the file data. | | **Content ID** | Enter a Content ID to attach inline images. This allows you to create an ID for the attachment, which you can then use in HTML: `<img src="cid:ii_jrc3r9mw1">` where `ii_jrc3r9mw1` is a content ID. | |
| **Copy recipient** | Enter the copy recipient's email address. (CC:) |
| **Blind copy recipient** | Enter the blind copy recipient's email address. (BCC:) |

#### Iterators

[##### Iterate Attachments](#id597061_body)

Iterates through received attachments.

|  |  |
| --- | --- |
| **Source module** | Select another Gmail module whose output contains attachments you want to iterate. |

[## Known issues](#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-35b59d90-6d00-df71-5255-ac22a3f79d3f_body)

Here you can find solutions for the most common issues when working with Gmail in Celonis platform.

### Error 400: Failed to Verify a Connection

Your connection has expired and is no longer valid. You need to reauthorize the connection every seven days.

This error affects non-Google Workspace accounts. For more details, please refer to [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2#expiration).

Due to Google's updated security policy, unpublished apps can only have a 7-day authorization period. After the OAuth security token expires, the connection is no longer authorized and any module relying on it will fail.

**Solution**

**Option 1:**

**To avoid weekly reauthorization**, you can update the publishing status of your project.

If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly.

Change the status of your project by following these steps:

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. Navigate to the **Oauth consent screen**.
3. Click the **Publish app** button next to your app.
4. If the **Needs verification** message appears, choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?visit_id=638357423877979226-2405331664&rd=1#exceptions-ver-reqts) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding publishing statuses, refer to the **Publishing status** section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=) and our [Community page](https://community.make.com/t/gmail-google-drive-verification-issues-error-400-how-to-solve/27432).

**Option 2**

If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Make every week.

Reauthorize your Google connection by following these steps:

1. Log in to Celonis platform.
2. Go to **Connections**.
3. Find your Google connection and click the **Reauthorize** button.

   **Note**

   To prevent the expiration of your Google connection, we suggest you to reauthorize the connection every week.

### Error 403: Access Denied

You didn't add a test user for your project in Google Cloud Platform, and the project has the **Testing** status. You need to add the email address associated with the Google account you want to connect with Celonis platform as a Test user.

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. Go to **APIs & Services** > **OAuth consent screen**.
3. Under **Test users**, **+ Add Users** and enter an email of a user that you want to create a connection for.
4. Click **Save**.

### Error 403: Access Not Configured

The **Gmail API** was disabled in the Google Cloud Platform. You need to [enable it](gmail--action-flow-.html#UUID-253f6fd4-b92d-ad26-3b39-70b6cf4f97f8_UUID-c3b19d6f-e562-90ed-c989-a2e20c8da621 "Connecting Gmail to Celonis platform") again.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/google-forms--action-flow-

# Google Forms (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Google Forms modules in Celonis platform, you can search, create, retrieve, and update forms and move forms to trash, watch, list, and retrieve responses, and watch, search, add, update, and delete responses in Google Forms.

Expand all

[## Before you begin](#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_section-id235516612497609_body)

To use the Google Forms modules, you must have a Google account. You can create an account at [docs.google.com/forms/](http://docs.google.com/forms/).

To upgrade to a new version of the Google Forms app, you need to upgrade all modules manually by [Replacing Legacy Modules with New Modules](https://www.integromat.com/en/help/replacing-legacy-modules-with-new-modules).

Refer to the [Google Forms API Documentation](https://developers.google.com/forms/api/reference/rest) for a list of available endpoints.

[## Connecting Google Forms to Celonis platform](#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_UUID-10955335-e192-dcdf-d8f0-e381aeb90ad7_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Google Forms module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Switch on the **Show advanced settings** toggle and enter your Google Cloud Platform project client credentials. For more information, see the [Create and configure a Google Cloud Platform project for Google Forms section](google-forms--action-flow-.html#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_section-idm4573021643566434023534333298 "Create a Google Cloud Platform project for Google Forms") below.
4. Click the **Sign in with Google**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Google Form modules.

[### Create and configure a Google Cloud Platform project for Google Forms](#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_section-idm4563863730032034023536757898_body)

To connect to Celonis platform using your own client credentials, you can create and configure a project in the Google Cloud Platform.

#### Create a Google Cloud Platform project for Google Forms

To create a Google Cloud Platform project:

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**. If you already have a project, proceed to the [step 5](google-forms--action-flow-.html#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_N1738075688822 "Step 5").
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown. If not, select the project you just created.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

#### Enable APIs for Google Forms

To enable the required APIs:

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the following APIs: **Google Resource Manager API** and **Google Drive API**.
3. Click the relevant API, then click **Enable**. If you see the **Manage** button instead of the **Enable** button, you can proceed to the next step: the API is already enabled.

#### Configure your OAuth consent screen for Google Forms

To configure your OAuth consent screen:

1. In the left sidebar, click **Google Auth Platform**.

   **Note**

   If you don't see **Google Auth Platform** in the left sidebar, click **View all products** at the top of it, then pin **Google Auth Platform** to the sidebar.
2. Click **Get Started**.
3. In the **Overview** section, under **App information**, enter *Make* as the app name and provide your Gmail address. Click **Next**.
4. Under **Audience**, select **External**. Click **Next**.

   For more information regarding user types, refer to [Google's Exceptions to verification requirements documentation](https://support.google.com/cloud/answer/9110914#exceptions-ver-reqts).
5. Under **Contact Information**, enter your Gmail address. Click **Next**.
6. Under **Finish**, agree to the Google User Data Policy.
7. Click **Continue** > **Create**.
8. Click **Create OAuth Client**.
9. In the **Branding** section, under **Authorized domains**, add `make.com` and `integromat.com`. Click **Save**.
10. Optional: In the **Audience** section, add your Gmail address on the **Test users** page, then click **Save and continue** if you want the project to remain in the **Testing** publishing status. Read the note below to learn more about the publishing status.
11. In the **Data Access** section, click **Add or remove scopes**, add the following scopes:

    - `https://mail.google.com`
    - `https://www.googleapis.com/auth/drive`
    - `https://www.googleapis.com/auth/userinfo.email`
    - `https://www.googleapis.com/auth/spreadsheets`

    You can add scopes using:

    - A table with filters:
    - A window to manually enter scopes:

    Click **Update**.
12. Click **Save**.

**Note**

**Publishing Status**

**Testing:** If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Celonis platform every week. To avoid weekly reauthorization, update the project status to **In production**.

**In production:** If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly. To update your project's status, go to the **Google Auth Platform**, the **Audience** section, and click **Publish app**. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?authuser=1&visit_id=638718595933013017-1855034908&rd=1) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding the publishing status, refer to the Publishing status section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=).

#### Create your Google Forms client credentials

To create your client credentials:

1. In Google Auth Platform, click **Clients**.
2. Click **+ Create Client**.
3. In the **Application type** dropdown, select **Web application**.
4. Update the **Name** of your OAuth client. This will help you identify it in the platform.
5. In the **Authorized redirect URIs** section, click **+ Add URI** and enter the following redirect URI: `https://www.integromat.com/oauth/cb/google/`.
6. Click **Create**.
7. Click the OAuth 2.0 Client you created, copy your **Client ID** and **Client secret** values, and store them in a safe place.

You will use these values in the **Client ID** and **Client Secret** fields in Celonis platform.

[## Types of Google Forms modules](#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_section-id235516615134284_body)

[### Build Google Forms Action Flows](#UUID-a2b65a4a-09a3-6581-fdf7-a2b16b55d08c_section-idm4563445023412834023474928474_body)

After connecting the app, you can perform the following actions:

Form

- Search Forms
- Create a Form
- Get a Form
- Update a Form

  Note: For **Item Changes**, **Location** refers to the item's position on the list of all form items. The very first item is 0, the second item is 1, and so on. To add an item at the very beginning of your form, use 0 as the location.
- Move a Form to Trash

Response

- Watch Responses
- List Responses
- Get a Response

Legacy

- Watch Responses in Google Sheets

  |  |  |
  | --- | --- |
  | **Value render option** | **Formatted value**: Values will be calculated and formatted in the reply according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `$1.23`.  **Unformatted value**: Values will be calculated, but not formatted in the reply. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `1.23`.  **Formula**: Values will not be calculated. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `=A1`. |
  | **Date and time render option** | Specifies how dates, times, and duration should be represented in the output. This is ignored if Value render option (above) is set to `Formatted value`. |
- Search Responses in Google Sheets

  |  |  |
  | --- | --- |
  | **Value render option** | **Formatted value**: Values will be calculated and formatted in the reply according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `$1.23`.  **Unformatted value**: Values will be calculated, but not formatted in the reply. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `1.23`.  **Formula**: Values will not be calculated. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return `=A1`. |
  | **Date and time render option** | Specifies how dates, times, and duration should be represented in the output. This is ignored if Value render option (above) is set to `Formatted value`. |
- Search Responses in Google Sheets (advanced)

  Note: For the **Filter** field, define the search query using the [Google Charts Query Language](https://developers.google.com/chart/interactive/docs/querylanguage).

  E.g. `select * where C = "John"` to retrieve all values for the row where the C column is "John".
- Add a Response in Google Sheets

  Note: For the **Timestamp** column, use the following value: `formatDate(now;DD/MM/YYYY HH:mm;UTC)`
- Update a Response in Google Sheets

  Note: For the **Value input option** field, **Raw** will not parse the values entered by the user and are stored as-is. **User entered** will parse the value as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.
- Delete a Response in Google Sheets

Other

- Make an API Call

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/google-sheets--action-flow-

# Google Sheets (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Google Sheets modules in Celonis platform, you can manage rows, cells, sheets, spreadsheets, values, and conditional formats in your Google Sheets account.

Expand all

[## Before you begin](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-id235516623363582_body)

To use Google Sheets modules, you must have a Google account. You can create one at [accounts.google.com.](https://accounts.google.com) To use instant trigger modules, you must have the Google Sheets extension.

Refer to the [Google Sheets API documentation](https://developers.google.com/sheets/api/reference/rest) for a list of available endpoints

[## Connecting Google Sheets to Celonis platform](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-17c3092a-de27-b823-2079-a285059bf157_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Google Sheets module to your Action Flow, and click **Create a connection**.

   Note: If you add a module with an `instant` tag, click **Create a webhook**, then **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Switch on the **Show advanced settings** toggle and enter your Google Cloud Platform project client credentials. For more information, see the [Create and configure a Google Cloud Platform project for Google Sheets section](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm459933987897603399225180605 "Creating and configuring a Google Cloud Platform project for Google Sheets") below.
4. Click **Sign in with Google**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Google Sheets modules.

[### Creating and configuring a Google Cloud Platform project for Google Sheets](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm459933987897603399225180605_body)

To connect to Celonis platform using your own client credentials, you can create and configure a project in the Google Cloud Platform.

#### Create a Google Cloud Platform project for Google Sheets

To create a Google Cloud Platform project:

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**. If you already have a project, proceed to the [step 5](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_N1738075673595 "Step 5").
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown. If not, select the project you just created.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

#### Enabling APIs for Google Sheets

To enable the required APIs:

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the following APIs: **Google Sheets API** and **Google Drive API**.
3. Click the relevant API, then click **Enable**. If you see the **Manage** button instead of the **Enable** button, you can proceed to the next step: the API is already enabled.

#### Configuring your OAuth consent screen for Google Sheets

To configure your OAuth consent screen:

1. In the left sidebar, click **Google Auth Platform**.

   **Note**

   If you don't see **Google Auth Platform** in the left sidebar, click **View all products** at the top of it, then pin **Google Auth Platform** to the sidebar.
2. Click **Get Started**.
3. In the **Overview** section, under **App information**, enter *Make* as the app name and provide your Gmail address. Click **Next**.
4. Under **Audience**, select **External**. Click **Next**.

   For more information regarding user types, refer to [Google's Exceptions to verification requirements documentation](https://support.google.com/cloud/answer/9110914#exceptions-ver-reqts).
5. Under **Contact Information**, enter your Gmail address. Click **Next**.
6. Under **Finish**, agree to the Google User Data Policy.
7. Click **Continue** > **Create**.
8. Click **Create OAuth Client**.
9. In the **Branding** section, under **Authorized domains**, add `celonis.com` .Click **Save**.
10. Optional: In the **Audience** section, add your Gmail address on the **Test users** page, then click **Save and continue** if you want the project to remain in the **Testing** publishing status. Read the note below to learn more about the publishing status.
11. In the **Data Access** section, click **Add or remove scopes**, add the following scopes:

    - `https://www.googleapis.com/auth/spreadsheets`
    - `https://www.googleapis.com/auth/drive`

    You can add scopes using:

    - A table with filters:
    - A window to manually enter scopes:

    Click **Update**.
12. Click **Save**.

**Note**

**Publishing Status**

**Testing**: If you keep your project in the **Testing**status, you will be required to reauthorize your connection in Make every week. To avoid weekly reauthorization, update the project status to **In production**.

**In production:**If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly. To update your project's status, go to the **OAuth consent screen**, the **Audience** section, and click **Publish** app. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?authuser=1&visit_id=638718595933013017-1855034908&rd=1) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding the publishing status, refer to the Publishing status section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=).

#### Creating your Google Sheets client credentials

To create your client credentials:

1. In Google Auth Platform, click **Clients**.
2. Click **+ Create Client**.
3. In the **Application type** dropdown, select **Web application**.
4. Update the **Name** of your OAuth client. This will help you identify it in the platform.
5. In the **Authorized redirect URIs** section, click **+ Add URI** and enter the following redirect URI:

   `https://auth.redirect.celonis.cloud/oauth/cb/google/`
6. Click **Create**.
7. Click the OAuth 2.0 Client you created, copy your **Client ID** and **Client secret** values, and store them in a safe place.

You will use these values in the **Client ID** and **Client Secret** fields in Celonis platform.

[## Setting up Google Sheets Webhooks](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-48edd478-6450-6fd1-ea17-fd57a6a4ff1f_body)

**Caution**

The Celonis platform Google Sheets Add-on is currently not available, and the following procedure should be followed to use the **Perform a Function** and **Watch Changes** `instant` modules.

To use the Google Sheets **Perform a Function** or **Watch Changes** `instant` modules, you must first paste a script and your module's webhook address into your spreadsheet.

**To set up the webhook:**

1. Log in to your Celonis platform account, add either the **Perform a Function** or **Watch Changes** module to your Action Flow, and click **Create a webhook** or **Add**.
2. Optional: Enter a name for the webhook in the **Webhook name** field.
3. Click **Save**.
4. Next you will paste a script into your spreadsheet. Click [here](https://cdn.make.com/files/g-sheet-addon/Google-sheet_add-on.txt) to access the script and copy the entire content.
5. Open the spreadsheet and go to **Extensions > Apps Script**. You will see a new project containing default content.
6. Delete the default content and paste the script you copied in Step 4. This script must be updated with the webhook address from your Google Sheets module.
7. To obtain the webhook address, go back to your Action Flow, click on the module, and click **Copy address to clipboard**.
8. Now return to the **Apps Script** project in your spreadsheet. At the beginning of the script, you will see the lines `WATCH_CHANGE_WEBHOOK_URL = 'https://hook.eu1.make.com/xxx';` and `PERFORM_FUNCTION_WEBHOOK_URL = 'https://hook.eu1.make.com/xxx';`.
9. Depending on the module you are using, replace `https://hook.eu1.make.com/xxx` with the webhook address you copied in Step 7.

   **Caution**

   It is important to paste the full webhook address into the script to avoid any errors.
10. Click the **Save** icon.
11. In the left sidebar, click the **Triggers** icon.
12. Click **Add Trigger**.
13. In the **Select event type** field, select **On edit**, and click **Save**.
14. If prompted, authenticate your account and confirm access.

The **Perform a Function** or **Watch Changes** module will now send data through the webhook when the selected event occurs.

[## Building Google Sheets Action Flows](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-9bd59992-fc0c-7e1e-2aa9-cd89ed71acbe_body)

After connecting the app, you can perform the following actions:

### Sheets

[#### Perform a Function](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm1953396665855258_body)

Celonis platform allows you to use the **custom function**  `MAKE_FUNCTION` in Google Sheets similarly to built-in functions like `AVERAGE, SUM,` etc. It allows you to perform the function in Celonis platform and return the result back to the sheet. The function `MAKE_FUNCTION` accepts as many parameters as you need.

You must have a Sheets Add-On.

See the example of the module usage in the [Tips & Tricks section](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-ede0f4f9-8177-bb8d-4075-54be12612664 "Types of Google Sheets modules").

[#### Perform a Function - Responder](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm1953396666174978_body)

Returns processed data as a result of the `MAKE_FUNCTION` or `INTEGROMAT` function. You must have a Sheets Add-On. This module is to be used together with the Perform a Function module.

|  |  |
| --- | --- |
| **Response type** | Select whether you insert text or a number into the sheet. |
| **Value** | Map the value from the previous module you want to insert into the sheet. |

[#### Add a Sheet](#id597634_body)

Add a new sheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to create a sheet.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select, search for, or enter the ID of the spreadsheet that contains the sheet you want to add a sheet to.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Properties** | **Title**  Enter the name of the new sheet.  **Index**  Enter the sheet position. The default is `0` (places the sheet in the first place). |

[#### Create a Spreadsheet](#id597678_body)

Creates a new spreadsheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Title** | Enter the name of a new spreadsheet. |
| **Locale** | The locale of the spreadsheet in one of the following formats:  - an ISO [639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language code such as `en`, - an [ISO 639-2](https://en.wikipedia.org/wiki/ISO_639-2) language code such as `haw`, if no 639-1 code exists, - a combination of the ISO language code and country code, such as `en_US`. |
| **Recalculation interval** | The amount of time to wait before volatile functions are recalculated:  **On change**  Volatile functions are updated upon every change.  **On change and every minute**  Volatile functions are updated upon every change and every minute.  **On change and hourly**  Volatile functions are updated upon every change and hourly. |
| **Time zone** | Select the time zone of the spreadsheet. |
| **Number format** | Select the default format of all cells in the spreadsheet.  |  |  | | --- | --- | | `TEXT` | Text formatting, e.g  `1000. 12` | | `NUMBER` | Number formatting, e.g,  `1,000.12` | | `PERCENT` | Percent formatting, e.g  `10. 12%` | | `CURRENCY` | Currency formatting, e.g  `$1,000.12` | | `DATE` | Date formatting, e.g  `9/26/2008` | | `TIME` | Time formatting, e.g  `3:59:00 PM` | | `DATE TIME` | Date+Time formatting, e.g  `9/26/08 15:59:00` | | `SCIENTIFIC` | Scientific number formatting, e.g  `1. 01E+03` | |
| **Sheets** | Add sheets to the new spreadsheet. |

[#### Create a Spreadsheet from a Template](#id597803_body)

Creates a new spreadsheet from a template sheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select or map the Template Spreadsheet ID from which you want to create the spreadsheet.  - Search by path - Select from all - Enter manually |
| **Drive** | Select or map the drive where you want to create the spreadsheet. |
| **Template Spreadsheet ID** | Select the template from which you want to create the spreadsheet.  If the spreadsheet contains tags like `{{name}}`, they are retrieved below.  Your file must contain at least one tag for this module to work. |
| **Title** | Enter a name for the spreadsheet. |
| **New Drive Location** | Select or map the drive to store the new spreadsheet. |
| **New Document's Location** | Select or map the folder, where the new spreadsheet should be placed. |

[#### Copy a Sheet](#id597860_body)

Copies a sheet to another spreadsheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select or map the option to choose the spreadsheet that you want to copy.  - Search by path - Select from all - Enter manually |
| **Drive** | Select or map the drive location where the spreadsheet that you want to copy is located. |
| **Spreadsheet ID** | Select or map the Spreadsheet ID you want to copy.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Destination Drive Location** | Select or map the drive location where you want to store the copied spreadsheet. |
| **Destination Spreadsheet ID** | Select or map the copied Spreadsheet ID. |

[#### Add a Conditional Format Rule](#id597911_body)

Creates a new conditional format rule at the given index. All subsequent rules' indexes are incremented.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Enter the Spreadsheet ID to which you want to create the conditional format rule.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Enter the Spreadsheet ID to which you want to create the conditional format rule.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Enter the Sheet ID to which you want to create the conditional format rule. |
| **Range** | Enter the range of rows and columns to which you want to apply the conditional rule format. For example, **A1:D25**. |
| **Index** | The zero-based index where the rule should be inserted. |
| **Format Rule** | Select or map the rule for the conditional format rule. |
| **Condition** | Select or map the condition and enter the value for the format rule. For more information, see the [boolean and gradient conditions](https://developers.google.com/apps-script/reference/spreadsheet/conditional-format-rule-builder). |
| **Cell Format** | Select or map the cell background color. |
| **Text Format** | Set the text format such as foreground color, bold, italic or strikethrough. |

[#### Rename a Sheet](#id597988_body)

Renames a specific sheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to create a sheet.  - Search by path - Select from all - Enter manually |
| **Drive** | Select or map the drive location where the spreadsheet in which you want to rename a sheet is located. |
| **Spreadsheet ID** | Select or map the Spreadsheet ID where a sheet you want to rename is located.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Enter the Sheet ID you want to rename. |
| **New Sheet Name** | Enter a new name of a sheet. |

[#### Get Range Values](#id598039_body)

Returns a sheet's content defined by range values.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet whose range value you want to get.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID for the spreadsheet where you want to retrieve range values.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Select the sheet you want to get the range content from. |
| **Range** | Enter the range you want to get, e.g. `A1:D25`. |
| **Table contains headers** | **Row with headers**  Enter the range of the table headers, e.g. `A1:F1`. If you leave the field empty, Celonis platform will suppose that the header is in the first row of the specified range. |
| **Value render option** | **Formatted value**  The values in the reply will be calculated and formatted according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then `A2` will return  `"$1.23".`  **Unformatted value**  The values will be calculated, but not formatted in the reply. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then `A2` will return the number `"1.23"`.  **Formula**  The values will not be calculated. The reply will include the formulas. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then A2 will return `"=A1"`. |
| **Date and render option** | **Serial number**  Instructs date, time, datetime, and duration fields to be output as doubles in "serial number" format, as popularized by Lotus 1-2-3. The whole number portion of the value (to the left of the decimal) counts the days since December 30th 1899. The fractional portion (to the right of the decimal) counts the time as a fraction of the day. For example, January 1st 1900 at noon would be 2.5. 2 because it's 2 days after December 30th 1899, and .5 because noon is half a day. February 1st 1900 at 3 pm would be 33.625. This correctly treats the year 1900 as not a leap year.  **Formatted string**  Instructs date, time, datetime, and duration fields to be outputted as strings in their given number format (which is dependent on the spreadsheet's locale). |

[#### List Sheets](#id598137_body)

Gets a list of all sheets in a spreadsheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet whose range value you want to get.  - Select by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Google Spreadsheet ID you want to retrieve sheets from.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |

[#### Delete a Sheet](#id598170_body)

Deletes a specific sheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet whose sheet you want to delete.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID from which you want to delete the row. |
| **Sheet ID** | Select or map the Sheet ID you want to delete. |

[#### Clear Values from a Range](#id598206_body)

Clears a specified range of values from a spreadsheet.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet name whose value you want to clear.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Enter the Spreadsheet ID from which you want to clear the values.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter a sheet name from which you want to clear the values. |
| **Range** | Enter the range you want to clear. For example, **A1:D25**. |

[#### Delete a Conditional Format Rule](#id598252_body)

Deletes a conditional format rule at the given index. All subsequent rules' indexes are decremented.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet name whose value you want to clear.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Enter the Spreadsheet ID whose conditional format rule you want to delete.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Enter the Sheet ID whose conditional format rule you want to delete. |
| **Index** | The zero-based index of the rule to be deleted |

### Rows

[#### Watch New Rows](#id598299_body)

Triggers when a new row is added. If a sheet contains a blank row, Make doesn't process all subsequent rows.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select a method to choose the spreadsheet whose rows you want to watch.  - Search by path - Select from all - Enter manually |
| **Drive** | Select Google Drive, where you have the spreadsheet whose rows you want to watch. |
| **Spreadsheet ID** | Select the Spreadsheet ID whose rows you want to watch.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter a sheet name in which you want search rows. |
| **Table contains headers** | Select whether the spreadsheet contains the header row. If the *Yes* option is selected, the module doesn't retrieve the header row as output data, and variables in the output are then called by the headers. If the *No* option is selected, the module retrieves the first table row, and the output variables are called simply A, B, C, D, etc. |
| **Row with headers** | Enter the range of the header row, e.g., `A1:F1`. |
| **Value render option** | **Formatted value**  The values in the reply will be calculated and formatted according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if `A1` is `1.23` and `A2` is `=A1` and formatted as currency, then `A2` will return  `"$1.23".`  **Unformatted value**  The values will be calculated but not formatted in the reply. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then `A2` will return the number `"1.23"`.  **Formula**  The values will not be calculated. The reply will include the formulas. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then A2 will return `"=A1"`. |
| **Date and time render option** | **Serial number**  Instructs date, time, datetime, and duration fields to be outputted as doubles in "serial number" format, as popularized by Lotus 1-2-3. The whole number portion of the value (to the left of the decimal) counts the days since December 30th, 1899. The fractional portion (to the right of the decimal) counts the time as a fraction of the day. For example, January 1st, 1900 at noon would be 2.5. 2 because it's 2 days after December 30th, 1899, and .5 because noon is half a day. February 1st, 1900 at 3 pm would be 33.625. This correctly treats the year 1900 as not a leap year.  **Formatted string**  Instructs date, time, datetime, and duration fields to be outputted as strings in their given number format (which depends on the spreadsheet's locale). |
| **Limit** | Set the maximum number of results that Make will work with during one execution cycle. |

[#### Add a Row](#id598406_body)

Appends a new row to the bottom of the table.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to add a row.  - Search by path - Select from all - Enter manually |
| **Drive** | Select Google Drive to choose the spreadsheet in which you want to add a row. |
| **Spreadsheet ID** | Enter the Spreadsheet ID in which you want to add a row.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter a sheet name in which you want to add a row. |
| **Column range** | Select the column range that you want to work with. |
| **Unformatted** | Select or map whether the rows should be formatted or not based upon the spreadsheet's existing formatting. |
| **Value** | Enter or mapthe desired cells of the row you want to add. |
| **Value input option** | **User entered**  The values will be parsed as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.  **Raw**  The values the user has entered will not be parsed and will be stored as-is. |
| **Insert data option** | **Insert rows**  Rows are inserted for the new data.  **Overwrite**  The new data overwrites the existing data in the areas where it is written. (Note: adding data to the end of the sheet will still insert new rows or columns so the data can be written.) |

[#### Update a Row](#id598491_body)

Updates a row.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to update a row.  - Search by path - Select from all - Enter manually |
| **Drive** | Select Google Drive to choose the spreadsheet whose rows you want to update. |
| **Spreadsheet ID** | Enter the Spreadsheet ID whose rows you want to update.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Select the sheet you want to update a row in. |
| **Row number** | Enter the number of the row you want to update. |
| **Values** | Enter or map the values in the desired cells of the row you want to change (update). |
| **Value input option** | **User entered**  The values will be parsed as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.  **Raw**  The values the user has entered will not be parsed and will be stored as-is. |

[#### Bulk Add Rows (Advanced)](#id598559_body)

Appends multiple rows to the bottom of the table.

|  |  |
| --- | --- |
| **Connection** |  |
| **Spreadsheet ID** | Select, search for, or enter the ID of the spreadsheet that contains the sheet where you want to add rows to.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter the name of the sheet where you want to add rows. |
| **Column range** | Select the column range that you want to work with. |
| **Unformatted** | Select or map whether the rows should be formatted or not based upon the spreadsheet's existing formatting. |
| **Value** | Enter or mapthe desired cells of the row you want to add. |
| **Value input option** | **User entered**  The values will be parsed as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.  **Raw**  The values the user has entered will not be parsed and will be stored as-is. |
| **Insert data option** | **Insert rows**  Rows are inserted for the new data.  **Overwrite**  The new data overwrites the existing data in the areas where it is written. (Note: adding data to the end of the sheet will still insert new rows or columns so the data can be written.)  Note: adding data to the end of the sheet will still insert new rows or columns. |

[#### Bulk Update Rows (Advanced)](#id598626_body)

Updates multiple rows.

|  |  |
| --- | --- |
| **Connection** |  |
| **Spreadsheet ID** | Select, search for, or enter the ID of the spreadsheet that contains the sheet where you want to update rows.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter the name of the sheet where you want to update rows. |
| **Column range** | Select the column range that you want to work with. |
| **Unformatted** | Select or map whether the rows should be formatted or not based upon the spreadsheet's existing formatting. |
| **Values** | Enter or map the values in the desired cells of rows you want to change (update). |
| **Value input option** | **User entered**  The values will be parsed as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.  **Raw**  The values the user has entered will not be parsed and will be stored as-is. |

[#### Search Rows](#id598681_body)

Returns results matching the given criteria.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to search rows.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Enter the Spreadsheet ID in which you want search rows.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter a sheet name in which you want to search rows. |
| **Table contains headers** | option is selected, the module also retrieves the first table row, and variables in the output are then called simply A, B, C, D, etc.*No* option is select |
| ****Filter**** | Set the filter for the row to be searched by.  Set filter values. You can also use logical operators, AND/OR in order to specify your selection. |
| **Sort order** | Map or select the direction that rows should be sorted by. |
| **Order by** | Select or map the option to arrange the search results. |
| **Field Type** | Select or map the field type to search the rows that match the specified type:  - Date - Number - String |
| **Value reoption** | **Formatted value**  The values in the reply will be calculated and formatted according to the cell's formatting. Formatting is based on the spreadsheet's locale, not the requesting user's locale. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then `A2` will return  `"$1.23".`  **Unformatted value**  The values will be calculated, but not formatted in the reply. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then `A2` will return the number `"1.23"`.  **Formula**  The values will not be calculated. The reply will include the formulas. For example, if `A1` is  `1.23`  and `A2` is `=A1` and formatted as currency, then A2 will return `"=A1"`. |
| **Date and time render option** | **Serial number**  Instructs date, time, datetime, and duration fields to be output as doubles in "serial number" format, as popularized by Lotus 1-2-3. The whole number portion of the value (to the left of the decimal) counts the days since December 30th 1899. The fractional portion (to the right of the decimal) counts the time as a fraction of the day. For example, January 1st 1900 at noon would be 2.5. 2 because it's 2 days after December 30th 1899, and .5 because noon is half a day. February 1st 1900 at 3 pm would be 33.625. This correctly treats the year 1900 as not a leap year.  **Formatted string**  Instructs date, time, datetime, and duration fields to be outputted as strings in their given number format (which is dependent on the spreadsheet's locale). |
| **Maximum number of returned rows** | The maximum number of rows Celonis platform should return during one scenario execution cycle. |

[#### Search Rows (Advanced)](#id598809_body)

Returns results matching the given criteria. This module doesn't return a row number.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to search rows.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID of the spreadsheet where you want to search rows.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Enter the Sheet ID whose row you want to search. |
| **Query** | Searches rows using Google Charts Query Language. The language is similar to SQL and it is possible to make complex queries. Unfortunately, the response doesn't contain IDs of returned rows. Due to Google Charts, the service is intended for data visualization where the row numbers aren't needed. You can find more information about the query language in the [documentation](https://developers.google.com/chart/interactive/docs/querylanguage).  An example: `select * when B contains "example@email.com"` |
| ****Maximum number of returned rows**** | The maximum number of rows Celonis platform should return during one scenario execution cycle. |

[#### Clear a Row](#id598865_body)

Clears values from a specific row.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet in which you want to clear a row.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Enter the Spreadsheet ID in which you want to clear a row.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter a sheet name in which you want to clear a row. |
| **Row Number** | Enter the number of the row you want to clear, e.g. `23`. |

[#### Delete a Row](#id598911_body)

Deletes a specific row.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet whose row you want to delete.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID from which you want to delete the row.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Enter the Sheet ID whose row you want to delete. |
| **Row Number** | Enter the number of the row you want to delete, e.g. `23`. |

### Cells

[#### Watch Changes](#id598959_body)

Triggers when a cell is updated. You must have a Sheets Add-On.

The module only watches for changes made in the Google Sheets app by the user. Script executions and API requests do not trigger this module. The module does not watch for newly added rows to the sheet.

|  |  |
| --- | --- |
| **Webhook** | Establish a connection to the spreadsheet using the add-on. |

[#### Update a Cell](#id598971_body)

Updates a specific cell.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet whose value you want to update.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID for the spreadsheet where you want to update a cell.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter the name of the sheet where you want to update a cell. |
| **Cell** | Enter the ID of the cell you want to update, e.g. `A5`. |
| **Value** | Enter the new value. |
| **Value input option** | **User entered**  The values will be parsed as if the user typed them into the UI. Numbers will remain numbers, but strings may be converted to numbers, dates, etc., following the same rules that are applied when entering text into a cell via the Google Sheets UI.  **Raw**  The values the user has entered will not be parsed and will be stored as-is. |

[#### Get a Cell](#id599034_body)

Updates a specific cell.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet whose value you want to get.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID from which you want to get a cell.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet ID** | Select or map the Sheet ID that contains the cell you want to retrieve data from. |
| **Cell** | Enter the ID of the cell you want to get, e.g. `A5`. |

[#### Clear a Cell](#id599080_body)

Clears a specific cell.

|  |  |
| --- | --- |
| **Connection** |  |
| **Search Method** | Select an option to choose the spreadsheet and sheet whose value you want to clear.  - Search by path - Select from all - Enter manually |
| **Spreadsheet ID** | Select or map the Spreadsheet ID for the spreadsheet where you want to clear a cell.  You can extract the Spreadsheet ID from the spreadsheet URL. For example, the URL is the following: `https://docs.google.com/spreadsheets/d/abc1234567/edit#gid=0` where `abc1234567` is the Spreadsheet ID. |
| **Sheet Name** | Enter the name of the sheet where you want to clear a cell. |
| **Cell** | Enter the ID of the cell you want to clear, e.g. `A5`. |

### Other

[#### Make an API Call](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm234530036802304_body)

Performs an arbitrary authorized API call. See the example of usage in the [Tips & Tricks section](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-ede0f4f9-8177-bb8d-4075-54be12612664 "Types of Google Sheets modules").

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the spreadsheet using your Google account.](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-17c3092a-de27-b823-2079-a285059bf157 "Connecting Google Sheets to Celonis platform") |
| **URL** | Enter a path relative to `https://sheets.googleapis.com/v4/`.  For example: `/spreadsheets/{{spreadsheetID}}`.  For the list of available endpoints, refer to the Google Sheets API Documentation. |
| **Method** | Select the HTTP method you want to use:  **GET** - to retrieve information for an entry.  **POST** - to create a new entry.  **PUT** - to update/replace an existing entry.  **PATCH** - to make a partial entry update.  **DELETE** - to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[## Types of Google Sheets modules](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-ede0f4f9-8177-bb8d-4075-54be12612664_body)

[### Deleting Multiple Rows](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_id_h_01F0Y071CK0E4W1A1YZN6M7KMD_body)

To delete multiple rows based on filter criteria use the **Search Rows** module linked to the **Delete a Row** module as in the following example:

1. Add the **Search Rows** module and the **Delete a Row** module to the Action Flow.

   |  |
   | --- |
   |  |

   Let's assume that you have a table where you need to delete all rows where column *A* equals *Y*.

   |  |
   | --- |
   |  |
2. Open the **Search Rows** module settings and set the fields as follows:

   |  |  |
   | --- | --- |
   | **Filter**  `A` Equal to `Y`  **Sort order**  `Descending`  **Order by**  `Row number` |  |

   **Caution**

   Make sure that the **Sort order** and **Order by** fields are set as above, otherwise values will not be deleted correctly from the table!
3. Add the **Delete a Row** module to the Action Flow and connect it to the **Search Row** module.
4. Map the **Row number item** from the **Search Rows** module to the Delete a Row module's **Row number** field.
5. Run the Action Flow to delete values that match the filter criteria from the sheet.

[### How to Get Empty Cells from a Google Sheet](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_id_how-to-get-empty-cells-from-a-google-sheet_body)

Use the **Search Rows (Advanced)** module and use this formula to get empty columns.

```
select * where E is null
```

|  |
| --- |
|  |

Here **"E"** is the column and **"is null"** is the condition. You can create a more advanced query using [Google Query Lang](https://developers.google.com/chart/interactive/docs/querylanguage)

[### Add a Custom Button in a Sheet to Trigger a Action Flow](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-fe91753f-9954-5b86-f13a-49f8331ab960_body)

1. In Celonis platform, insert the **Webhook > Custom webhooks** module/trigger into the Action Flow and configure it (see [Webhooks](webhooks--action-flow-.html "Webhooks (Action Flow)")).

   Note: Once you have configured the custom webhook module, be sure to save the Action Flow .
2. Copy the webhook's URL.
3. Execute the Action Flow.
4. In Google Sheets, choose **Insert > Drawing** from the main menu bar.
5. Click the **Text box** icon:
6. Design a button and click **Save and Close** in the top-right corner:
7. The button will be placed in your worksheet. Click the three vertical dots in the button's top-right corner:
8. Choose **Assign script** from the menu.
9. Enter the name of your script (function). For example, `runAction Flow`and click OK:
10. Choose **Extensions > Apps Script** from the main menu bar.
11. Insert the following code:

    - The name of the function must correspond to the name you specified in step 9.
    - Replace the `https://hook.celonis.com/xxx...xxx` URL with the webhook's URL you copied in step 2.

      ```
                                 function runAction Flow() {
        UrlFetchApp.fetch("https://hook.make.com/xxx...xxx");
      }
      ```
12. Press **Ctrl+S** to save the script file, enter a project name, and click **OK**.
13. Switch back to Google Sheets and click your new button.
14. Grant the required authorization to the script:
15. In Celonis platform, verify that the Action Flow has successfully executed.

**Note**

This will only trigger a Action Flowscenario to run when Scheduling is enabled. The linked webhook URL will not return any data but instead will trigger the Action Flow to run and allow the connected modules to return data.

[### Storing Dates in a Spreadsheet](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_id_storing-dates-in-a-spreadsheet_body)

If you store a [**Date**](https://www.integromat.com/en/help/item-data-types) value in a spreadsheet without any formatting,

it will appear as text in [ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601) in the spreadsheet. However, Google Sheets formulas or functions that work with dates do not understand this text. E.g. formula `=A1+10` will display the following error:

To help the GS to understand the date, format it with the formatDate(.) function. The correct format passed to the function as the second argument depends on the spreadsheet's locale settings. Choose **File** ▶ **Spreadsheet settings** from the main menu to verify/set the locale:

Once you have verified/set the proper locale, determine the corresponding date and time format by choosing **Format ▶ Number** from the main menu. The format is displayed next to the **Date time** menu item.

The following example shows the use of `M/D/YYYY HH:mm:ss` format for the United States locale:

[### Exploiting Google Sheets Functions](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_id_add-a-button-in-a-sheet-to-run-a-scenario_body)

If you miss a built-in function but it is featured by Google Sheets, you may exploit it.

[### Perform a Function Example](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-86de5721-b2fe-4cf6-41e9-9433b331757b_body)

|  |  |
| --- | --- |
| **Sample sheet** | The **Total-EUR** amount SUM will be converted, according to the current exchange rate, to the **Total - USD** amount and will be inserted into the desired field using Celonis platform. |

1. Create a Action Flow. Use the following modules:

   - **Google Sheets > Perform a Function**
   - **Currency > Convert an Amount Between Currencies**
   - **Google Sheets > Perform a Function - Responder**

   1. **Google Sheets** > **Perform a Function**

      Generate a webhook and [paste it into the Celonis platform add-on in Google Sheets.](google-sheets--action-flow-.html#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-87b6a0f3-7c7a-02b2-ca10-79098aa23c7a "How to perform a custom function?")
   2. **Currency** > **Convert an Amount between Currencies**

      Converts the mapped EUR amount to USD.
   3. **Google Sheets** > **Perform a Function - Responder**

      Inserts the converted amount into the sheet cell.
2. Run the Action Flow
3. Enter the `FUNCTION` into the desired cell to load the converted amount.

   When the user changes the amount, the `FUNCTION` re-calculates the **Total - USD** according to the current exchange rate:

[### How to perform a custom function?](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-87b6a0f3-7c7a-02b2-ca10-79098aa23c7a_body)

You can simply use the function like built-in functions in Google Sheet.

Create a new Action Flow with the following modules:

- **Perform a Function** - the module receives the parameters passed to the function
- **Perform a Function - Responder** - the module returns the result of the function execution back to the sheet

[### Posting and Getting Images from Google Sheets](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_section-idm173283966765658_body)

When getting an image from Google Sheets, first make sure you enter the image as a formula. For example:`=IMAGE("https://i.ytimg.com/vi/MPV2METPeJU/maxresdefault.jpg")` making use of the =IMAGE(...)

After you have done so, open the Google Sheets module (e.g. **Watch Rows, Search Rows, Get a Cell**) and select **Show advanced settings**. Then select the Formula option in the **Value render option** field.

The output will be as shown below:

Then you can extract the URL using the replace function. The output will be just the URL.

To be able to post an image, make sure to enter the `=IMAGE(...)` formula that will be used in the cell and then enter the Image URL address.

[### Make an API Call: Example of Usage](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-45567586-d86e-df5d-77bd-71675337185c_body)

The following API call returns specified spreadsheet details.

**URL:**

`/spreadsheets/{{spreadsheetID}}`

**Method:**

`GET`

The result can be found in the module's **Output** under *Bundle* > *Body:*

[## Usage Limits](#UUID-09170ad7-75fd-2ba4-163d-c60cc431cdc5_UUID-72f798db-46c2-a0e2-f027-b7f852bef139_body)

If the error **429: RESOURCE\_EXHAUSTED** occurs, you have exceeded the API rate limit.

The Google Sheets API has a limit of 500 requests per 100 seconds per project, and 100 requests per 100 seconds per user. Limits for reads and writes are tracked separately. There is no daily usage limit.

See more details at [developers.google.com/sheets/api/limits](https://developers.google.com/sheets/api/limits).

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/google-slides--action-flow-

# Google Slides (Action Flow)

With Google Slides modules in Celonis platform, you can create, update, list, and/or delete presentations and upload images to presentations in your Google Slides account.

Expand all

[## Before you begin](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_section-id235522000636818_body)

To use the Google Slides modules, you must have a Google Slides account with slides and/or presentations in your Google Drive. You can create an account at <https://accounts.google.com>.

Refer to the [Google Slides API documentation](https://developers.google.com/slides/api/reference/rest) for a list of available endpoints.

[## Connect Google Slides to Celonis platform](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_UUID-92cc781c-6a12-cfdc-b0d6-e93122e9304c_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Google Slides module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Switch on the **Show advanced settings** toggle and enter your Google Cloud Platform project client credentials. For more information, see the [Create and configure a Google Cloud Platform project for Google Slides section](google-slides--action-flow-.html#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_section-idm459933987897603399225180605 "Create and configure a Google Cloud Platform project for Google Slides") below.
4. Click **Sign in with Google**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Google Slides modules.

[### Create and configure a Google Cloud Platform project for Google Slides](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_section-idm459933987897603399225180605_body)

To connect to Celonis platform using your own client credentials, you can create and configure a project in the Google Cloud Platform.

#### Create a Google Cloud Platform project for Google Slides

To create a Google Cloud Platform project:

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**.
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown. If not, select the project you just created.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

#### Enable APIs for Google Slides

To enable the required APIs:

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the following APIs: **Google Slides API, Google Drive API**.
3. Click the relevant API, then click **Enable**.

#### Configure your OAuth consent screen for Google Slides

To configure your OAuth consent screen:

1. In the left sidebar, click **Google Auth Platform**.

   **Note**

   If you don't see **Google Auth Platform** in the left sidebar, click **View all products** at the top of it, then pin **Google Auth Platform** to the sidebar.
2. Click **Get Started**.
3. In the **Overview** section, under **App information**, enter *Make* as the app name and provide your Gmail address. Click **Next**.
4. Under **Audience**, select **External**.

   For more information regarding user types, refer to [Google's Exceptions to verification requirements documentation](https://support.google.com/cloud/answer/9110914#exceptions-ver-reqts).
5. Under **Contact Information**, enter your Gmail address.
6. Under **Finish**, agree to the Google User Data Policy.
7. Click **Continue** > **Create**.
8. In the **Branding** section, under **Authorized domains**, add `make.com` and `integromat.com`. Click **Save**.
9. Optional: In the **Audience** section, add your Gmail address on the **Test users** page, then click **Save and continue** if you want the project to remain in the **Testing** publishing status.
10. In the **Data Access** section, click **Add or remove scopes**, add the following scopes, and click **Update**:

    - `https://www.googleapis.com/auth/userinfo.email`
    - `https://www.googleapis.com/auth/presentations`
    - `https://www.googleapis.com/auth/drive`
11. Click **Save**.

**Note**

**Publishing Status**

**Testing:** If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Celonis platform every week. To avoid weekly reauthorization, update the project status to **In production**.

**In production:** If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly. To update your project's status, go to the **Google Auth Platform**, the **Audience** section, and click **Publish app**. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?authuser=1&visit_id=638718595933013017-1855034908&rd=1) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding the publishing status, refer to the Publishing status section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=).

#### Create your Google Slides client credentials

To create your client credentials:

1. In Google Auth Platform, click **Clients**.
2. Click **+ Create Client**.
3. In the **Application type** dropdown, select **Web application**.
4. Update the **Name** of your OAuth client. This will help you identify it in the platform.
5. In the **Authorized redirect URIs** section, click **+ Add URI** and enter the following redirect URI:

   `https://www.integromat.com/oauth/cb/google`

   `https://auth.redirect.celonis.cloud/oauth/cb/google`
6. Click **Create**.
7. Click the OAuth 2.0 Client you created, copy your **Client ID** and **Client secret** values, and store them in a safe place.

You will use these values in the **Client ID** and **Client Secret** fields in Celonis platform.

[## Types of Google Slides modulesAction Flows](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_UUID-bcbdc6fd-9bcd-30c0-e6b6-0d315113bc91_body)

After connecting the app, you can perform the following actions:

### Presentation

[#### Watch Presentations](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_watch-presentations_body)

Triggers when a new presentation is created or updated.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Watch Presentations** | Select whether you want to watch created or modified documents. |
| **Limit** | The maximum number of presentations Celonis platform should return during one Action Flow execution cycle. |

[#### List Presentations](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_list-presentations_body)

Retrieves a list of all presentations.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Choose a Drive Location** | Select the drive that contains the presentation you want to list.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Folder ID** | Select the folder that contains the presentations you want to list. |
| **Limit** | The maximum number of presentations Celonis platform should return during one Action Flow execution cycle. |

[#### Get a Presentation](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_get-a-presentation_body)

Gets the latest version of a specified presentation.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Choose a Drive** | Select the drive that contains a presentation you want to retrieve.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select the Presentation ID whose details you want to retrieve. |

[#### Get a Page/Thumbnail](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_get-a-pagethumbnail_body)

Gets the latest version of the specified page or the thumbnail of a page in the presentation.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Enter a Presentation and Page ID** | Select whether you want to manually enter the Presentation ID and Page Object ID or to select them from the dropdown list. |
| **Choose a Drive** | Select the drive that contains a presentation whose page or thumbnail you want to retrieve.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the presentation whose page you want to retrieve. |
| **Page Object ID** | Select or map the page you want to retrieve or whose thumbnail you want to retrieve. |
| **Show Page Thumbnail** | Select if you want to get the thumbnail URL in the output. |

[#### Create a Presentation From a Template](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_create-a-presentation-from-a-template_body)

Creates a new presentation by replacing all tags, for example, `{{name}}` in a template with provided data.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Title** | Enter a name for the presentation. |
| **Copy a Presentation** | Select to map the ID of the presentation for copying or select the presentation from the dropdown menu. |
| **Copy of Existing Presentation ID** | Enter or map the path to the presentation or the ID of the presentation for copying. |
| **Values** | |  |  | | --- | --- | | **Tag** | Enter the tag associated with the presentation template. Do not use `{{}}`. | | **Replaced Value** | Enter the value of the tag. | |
| **Choose a Drive** | Select the drive that contains a presentation whose template you want to copy.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the Presentation ID whose template you want to copy. |
| **New Drive Location** | Select the drive where you want to store a new presentation. |
| **New Document's Location** | Select the folder where you want to store a new presentation. |
| **Shared** | Select if you want to share a new presentation. |
| **Sharing with Other's Email Address** | Enter email addresses of people who you want to share a new presentation with. If you leave the field empty, the presentation is sharable to everyone. |

[#### Upload an Image To a Presentation](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_upload-an-image-to-a-presentation_body)

Uploads an image with URL to a presentation.

Note: The maximum image size is 50 MB. The image resolution must not exceed 25 megapixels. Only PNG, JPEG, or GIF formats are supported.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Choose a Presentation** | Select to map the ID of the presentation for editing or select the presentation from the dropdown menu. |
| **Choose a Drive** | Select the drive that contains a presentation where you want to insert an image.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the Presentation ID where you want to insert an image. |
| **Select the Method** | Select the method you want to use to insert an image. |
| **Values** | Select **Upload an Image by Replacing Text Tag** to replace the text with an image.  |  |  | | --- | --- | | **Tag** | Enter the tag associated with the presentation. Do not use `{{}}`. | | **Image URL** | Enter the URL of the image you want to insert. |  Select **Upload an Image by Replacing Image** to replace an existing image.  |  |  | | --- | --- | | **Image Object ID** | Enter the ID of the image you want to replace. | | **Image Replace Method** | Select the replacement method. | | **Image URL** | Enter the URL of the image you want to insert. | |

[#### Refresh a Chart](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_refresh-a-chart_body)

Refreshes the chart data stored in a presentation specified by ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google Slides account. |
| **Enter a Presentation ID** | Select to map the ID of the presentation for refreshing or select the presentation from the dropdown menu. |
| **Choose a Drive** | Select the drive that contains a presentation where you want to refresh a chart.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the Presentation ID where you want to refresh a chart. |
| **Chart Object ID** | Enter the ID of the chart you want to refresh. |

### Slide

[#### Add or Delete a Slide](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_make-an-api-call_body)

Creates an empty slide or delete an existing slide in the specified presentation.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google account. |
| **Select the method** | Select the action you want to apply to the presentation. |
| **Presentation ID** | Select or map the presentation where you want to add or delete a slide, or enter the Presentation ID manually. |
| **Enter a slide** | Select whether you want to manually enter the Slide ID or to select the slide from the dropdown list.  To manually enter the Slide ID, use the field:  |  |  | | --- | --- | | **Slide Object ID** | Enter the ID of the slide you want to delete. | |
| **Predefined layout type** | Select the layout that you want to apply for a slide in the presentation. |
| **Content** | Enter the content of the slide in relevant fields. |

[#### Create a Slide from a Template Slide](#id600209_body)

Creates a new slide by representing all tags, for example, `{{name}}` from a template slide within a specified presentation.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google account. |
| **Create a Slide from a Template Slide** | Select whether you want to manually enter the Slide ID or to select the slide from the dropdown list. |
| **Choose a Drive** | Select the drive that contains the presentation with a slide you want to use as a template.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the presentation where you want to create a slide from a template slide. |
| **Template Slide ID (Page Object ID)** | Enter the ID of the slide you want to use as a template.  The Slide ID can be found at the end of the URL of the slide you want to use. For example, `#slide=id.g2f01d547879_0_15`.  You need to **Skip slide** in Google Slides to see the slide in the dropdown list. |
| **Values** | |  |  | | --- | --- | | **Tag** | Enter the tag associated with the presentation template. Do not use `{{}}`. | | **Replaced Value** | Enter the value of the tag. | |
| **Slide Index Page Number** | Enter the page index that you want to append a new slide to. |

### Other

[#### Make an API Call](#UUID-782eb77f-4eb9-74d4-b709-686a8b41272c_id_make-an-api-call_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google account. |
| **URL** | Enter a path relative to `https://developers.google.com/slides/`.  For the list of available endpoints, refer to the [Google Slides API Documentation](https://developers.google.com/slides/reference/rest). |
| **Method** | Select the HTTP method you want to use:  - GET: To retrieve information for an entry. - POST: To create a new entry. - PUT: To update/replace an existing entry. - PATCH: To make a partial entry update. - DELETE: To delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Insert Links in a Presentation](#id600354_body)

Makes all links in a presentation clickable or inserts a link into all matched input texts.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Google account. |
| **Choose a Presentation** | Select to map the ID of the presentation that contains links or select the presentation from the dropdown menu. |
| **Choose a Drive** | Select the drive that contains the documents with links.  The **Google Shared Drive** option is available only for Google Workspace users:  |  |  | | --- | --- | | **Use Domain Admin Access** | Request the list of drives that require admin access. | | **Shared Drive** | Select the drive. | |
| **Presentation ID** | Select or map the presentation where you want to insert a link or make all links clickable. |
| **Select** | Select the action to apply to links in the presentation. |
| **Text Inputs** | Insert a link to a specific piece of text.  |  |  | | --- | --- | | **Text** | Enter the text where you want to put a link. | | **Link** | Insert a link. | |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

