# Automation: Action Flows (Part 4)

## automation/action-flows/sap-action-flows

# SAP Action Flows

SAP Action Flows in Celonis are automated workflows that allow you to trigger actions directly within your SAP system based on real-time process insights. They bridge the gap between "seeing" a process inefficiency and "fixing" it automatically.

The integration relies on Remote Function Calls (RFC) and the Celonis Agent to communicate with your SAP landscape.

Expand all

[## Core integration options](#UUID-201411a4-e420-bd52-1579-1c3367d8210d_section-id235503073358782_body)

There are two primary ways to execute SAP actions within an Action Flow:

- **Pre-built SAP Actions**: These are best used for standard operations without requiring deep SAP technical knowledge.

  - **Capability**: These are "plug-and-play" modules structured by business objects (e.g., Purchase Orders, Sales Orders).
  - **Examples**: Automatically releasing a credit block on a sales order or updating a delivery date in a purchase order.
- **Generic RFC calls**: These are best used for custom or complex requirements.

  - **Capability**: Allows you to call any RFC-enabled function module in your SAP system. This is highly flexible but requires knowledge of the specific SAP function names and their parameters.

[## Key features and mechanics](#UUID-201411a4-e420-bd52-1579-1c3367d8210d_section-id235503073423117_body)

To ensure reliable and secure process automation, SAP Action Flows utilize a robust communication layer designed for enterprise-grade data consistency.

- **Transaction Managemen**t: Group multiple SAP actions into a single sequence using **Begin Transaction** and **End Transaction** modules. If any step fails, a **Rollback** ensures your SAP data remains in its original, consistent state.
- **The Celonis Agent**: Acts as the secure gateway for on-premise systems, using the **SAP Java Connector (SAP JCo)** library to establish high-performance communication with your SAP landscape.
- **Real-Time Execution**: Action Flows can be triggered automatically by Data Triggers (e.g., when a KPI threshold is met) or manually through Studio components.

[## Common use cases](#UUID-201411a4-e420-bd52-1579-1c3367d8210d_section-id235503073487835_body)

By automating high-volume, manual tasks across the SAP ecosystem, organizations can significantly reduce cycle times and eliminate human error in core business processes.

- **Procurement**: Update payment terms or price in a Purchase Order.
- **Order Management**: Remove billing blocks or update shipping conditions.
- **Accounts Payable**: Block or unblock vendors for payment based on compliance checks.
- **Inventory**: Trigger stock transfers or adjust safety stock levels based on real-time demand.

[## Before you begin](#UUID-201411a4-e420-bd52-1579-1c3367d8210d_section-id235503117833044_body)

Before configuring SAP Action Flows, ensure your environment meets the following technical and connectivity requirements.

- **SAP Java Connector (SAP JCo)**: The latest version of the SAP JCo library must be downloaded from the SAP Service Marketplace and installed on the machine hosting your Celonis Agent.
- **Celonis Agent**: An active Celonis Agent must be installed and configured to act as a secure bridge between the Celonis Platform and your on-premise SAP landscape.
- **S-User Permissions**: Administrative access to the SAP Service Marketplace is required to obtain the necessary connector files.
- **Network Connectivity**: The Celonis Agent requires line-of-sight to the SAP Application Server or Message Server via the standard RFC ports (typically 33xx).

[## Configuring SAP Action Flows](#UUID-201411a4-e420-bd52-1579-1c3367d8210d_section-id235503117876687_body)

Follow these steps to establish a connection between Celonis and your SAP system for automated execution:

1. **Install JCo Libraries**: Place the SAP JCo .jar and native library files (e.g., .dll or .so) into the designated folder of your Celonis Agent installation.
2. **Restart the Agent**: Restart the Celonis Agent service to initialize the new SAP connector libraries.
3. **Create a Connection**: In the Celonis Platform, navigate to the Connections tab and select SAP.
4. **Configure Parameters**: Enter your SAP system details, including:

   - Application Server/Host
   - System Number
   - Client ID
   - Authentication Credentials (Username and Password)
5. **Test Connection**: Use the "Test Connection" button to verify that the Agent can successfully communicate with SAP via RFC.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/sap-ariba--action-flow-

# SAP Ariba (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The SAP Ariba modules allow you to monitor, list, retrieve, update, and delete the approvable, approver group members, groups, group members, and download the attachments in your SAP Ariba account.

Expand all

[## Getting started with SAP Ariba](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-ed6fa070-b220-d93b-830e-2e4b7165ab12_body)

Prerequisites

- An SAP Ariba account - create an SAP Ariba account by visiting [ariba.com/](https://www.ariba.com/) and contact the sales team.

The module dialog fields displayed in **bold** (in the Celonis platform Action Flow, **not** in this documentation article) are mandatory.

[## Connecting SAP Ariba to Celonis platform](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e_body)

To connect your SAP Ariba account to Celonis platform you need to obtain the Application Key, Client ID, and Client Secret from your SAP Ariba account and insert it in the *Create a connection* dialog in the Celonis platform module.

1. Log in to your [developer.ariba.com/](https://developer.ariba.com/) account.

2. Click the **Manage Application icon**

3. Select the application for which you want to establish the connection. Click *Action > Generate OAuth Secret*.

4. Copy the Application Key, OAuth Client ID, and Client Secret values to a safe place or download and store the values to a safe folder.

5. Go to Celonis platform and open the SAP Ariba module's *Create a connection* dialog.

6. In the *Connection name* field, enter a name for the connection.

7. In the *Application Key*, *OAuth Client ID*, and *OAuth Secret* fields enter the values copied in step 4 respectively.

8. In the *Realm* field, enter your application realm details. You can find the realm details on the application screen.

9. Click *Continue*.

The connection has been established.

[## Document Approval](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-a56d7bec-0bbf-6415-dea4-5e7b70651111_body)

[### Watch Pending Approvals](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-6c9fa9b4-88c9-2c63-1c16-2e73b531a510_body)

Triggers when documents or tasks are pending approval.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Approvable Type** | Select or map the option to watch the pending approvals:  - *Requisitions* - *Invoices* |
| **Limit** | Set the maximum number of pending approvals Celonis platform should return during one scenario execution cycle. |
| **User** | Select or map the user whose pending approvals you want to watch. |
| **Password Adapter** | Enter (map) the password adapter to watch the pending approvals that match the password adapter. |

[### List Pending Approvals](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-cc2a264e-6d8c-00e9-aa26-2303cf2dd609_body)

List all documents or tasks that are pending approval.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Approvable Type** | Select or map the option to list the pending approvals:  - *Requisitions* - *Invoices* |
| **Limit** | Set the maximum number of pending approvals Celonis platform should return during one scenario execution cycle. |
| **User** | Select or map the user whose pending approvals you want to list. |
| **Password Adapter** | Enter (map) the password adapter to list the pending approvals that match the password adapter. |

[### List Approvable Changes](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-ea56873e-931b-8c24-b629-dc7f297a19d3_body)

Retrieves a list of approvable whose approval state has changed since the last request by the last request ID.

or tasks that are pending approval.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Last Change ID** | Enter (map) the `Change Sequence ID` of the most recent requisition processed. This ID is unnecessary if no requisitions have yet been processed. |
| **Limit** | Set the maximum number of pending approvals Celonis platform should return during one scenario execution cycle. |

[### List Approver Group's Members](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-64e0d722-6333-92a8-89e6-4ba7648e656b_body)

Retrieves a list of details of the approver group's members by the group name.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Group Name** | Enter (map) or search the group name whose approver members you want to list. |
| **Limit** | Set the maximum number of approver group members Celonis platform should return during one scenario execution cycle. |

[### Get an Approvable](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-89e9a213-c179-1bc2-68a5-1cba6f11dce2_body)

Retrieves the details of an approvable by its ID.

ding approval.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Approvable Type** | Select or map the approval type whose details you want to retrieve:  - *Requisitions* - *Invoices* |
| **Approver ID** | Select or map the Approver ID whose details you want to retrieve. |

[### Updating an Approvable Status](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-26d9e95c-b1af-961d-7e9e-8905b41db946_body)

Approves, denies, or withdraws an approvable by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Approvable Type** | Select or map the approvable type whose approvable status you want to update:  - *Requisitions* - *Invoices* |
| **Approvable ID** | Enter (map) the Approvable ID whose status you want to update. |
| **Status** | Select or map the status you want to update the Approvable ID to:  - *Approve* - *Deny* - *Withdraw* |
| **User** |  |
| **Password Adapter** |  |
| **Comment** |  |
| **Visible to Supplier** |  |

[### Downloading the Attachment of an Approvable](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-ff84bad6-a85f-28e5-8c09-0627f80e2f5e_body)

Retrieves the attachment of an approvable by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Approvable Type** | Select or map the approvable type whose approvable attachment you want to download:  - *Requisitions* - *Invoices* |
| **Approvable ID** | Enter (map) the Approvable ID whose attachment you want to download. |
| **Attachment ID** | Enter (map) the Attachment ID you want to download. |

[## Other fields](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-1eec81c3-8932-55c7-7467-481269101c30_body)

[### Making an API Call](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-f9dab172-42a9-df22-b653-d52786683585_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| Connection | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **URL** | Enter a path relative to `https://openapi.ariba.com/api/approval/v1/prod` For example: `/pendingApprovables`  For the list of available endpoints, refer to the [SAP Ariba API Documentation](https://api.sap.com/package/SAPAribaOpenAPIs?section=Artifacts). |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry**.**  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[### Example of Use - List Groups](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-6e6bc274-c6f4-a75a-8185-5705c421e2ac_body)

The following API call returns all the groups from your SAP Ariba account:

**URL**:`/pendingApprovables`

**Method**:`GET`

Matches of the search can be found in the module's **Output** under *Bundle* > *Body.* In our example, 293 groups were returned:

[### List Groups](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-ff25f0fe-d1e1-1241-78a3-beb9e7f32b33_body)

Retrieves a list of groups.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Group Name Contains** | Enter (map) the group name to list the groups that match the specified groups. |
| **Limit** | Set the maximum number of groups Celonis platform should return during one execution cycle. |

[### List Group Members](#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-fcb8ca3a-7ecb-147d-14c0-00e0da4f0a57_body)

Retrieves a list of details of the group members by the group ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP Ariba account](sap-ariba--action-flow-.html#UUID-ec5380b3-0026-700f-b7c4-0382107ca32d_UUID-4d03a1b3-719a-fd60-2d9f-e22e077f439e "Connecting SAP Ariba to Celonis platform"). |
| **Group ID** | Enter (map) or search the Group ID to list the members that match the specified group. |
| **Limit** | Set the maximum number of group members Celonis platform should return during one execution cycle. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/sap-s-4hana-public-cloud--action-flow-

# SAP S/4HANA Public Cloud (Action Flow)

SAP S/4HANA Public Cloud (further on referred to as SAP S/4HANA) modules allow you to monitor, list, retrieve, and update all your invoices, orders, payments, business partners, and credit memos in your SAP S/4HANA account.

To get started with the SAP S/4HANA, create an account at [sap.com/products/s4hana-erp](https://www.ariba.com/).

Expand all

[## Connecting SAP S/4HANA to Celonis platform](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c_body)

To connect your SAP S/4HANA account to Celonis platform you need to create a communication system and user and obtain your SAP Client ID, User Name, and Password from your SAP S/4HANA account.

### Generating Connection Credentials

1. Access your SAP Fiori launchpad and go to the **Communication Systems** app.
2. Click **New**.
3. Enter a **System ID**.

   **Note**

   The system name is generated automatically. However, you can change this name if you want to.
4. Click **Create**.
5. On the **Communication System** screen, enter a hostname. Since this communication system is only used for inbound calls, no hostname needs to be specified.
6. In the **User for Inbound Communication** section, click **Add** to create a new communication user.
7. In the dialog box, click **New User**.

   **Note**

   Alternatively, you can create a communication user via the **Maintain Communication Users** app. If you have already created a user, enter the user in the **User Name** field.
8. On the **Create Communication User** screen, enter a user name (for example, `SAMPLEAPP_API_USER`) and a description (for example, `Communication user for Business Event Handling Sample App`). Copy this username to your clipboard.
9. Click **Propose Password** or create one yourself. Copy this new password to your clipboard.
10. Click **Create**.
11. You redirect to the **New Inbound Communication User** dialog box. The authentication method is **User Name and Password**. Click **OK**.
12. Click **Save**.
13. Under **Technical Data**, copy the **Port** number to your clipboard. This is the **SAP Client ID** needed to create a connection to Celonis platform.

### Establishing a Connection to Celonis platform

1. Log in to your Celonis platform account, add any SAP S/4HANA module to your Action Flow, and click **Create a connection**.
2. Enter your **Host URL**. For example, `https://my400271.s4hana.cloud.sap/`
3. In the **SAP Client ID** field, enter your 3-digit SAP Client ID which is the **Port** number on your **Communication System** screen in SAP.
4. In the **Username** and **Password** fields, enter your login credentials for your SAP account.
5. In the **Service** field, enter the Service you are using. For example, `API_BUSINESS_PARTNER`.

   **Note**

   You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). This field is for connection validation only.
6. Optionally, you can select how long until your CSRF token expires and click **Save**.

You have successfully connected the app and can edit or add more SAP S/4HANA modules to the Action Flow.

[## Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-e7894795-fa27-61d0-2ac0-d7c328be674f_body)

[### Watch Supplier Invoices](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4482770382427232998456229329_body)

Triggers when a supplier invoice is created.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Expand** | Select the type of invoices you want to watch for. |
| **Limit** | Enter the maximum number of invoices Celonis platform returns during one Action Flow execution cycle. |

[### Search Supplier Invoices](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4482770315024032998456845552_body)

Retrieves a list of supplier invoices filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of invoices you want to search for. |
| **Limit** | Enter the maximum number of invoices Celonis platform returns during one Action Flow execution cycle. |

[### Create a Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299845712188_body)

Creates a new supplier invoice.

**Notice**

For the full list of variables and parameters for creating your supplier invoice, please refer to the [SAP S/4HANA API reference documentation for Sourcing and Procurement](https://help.sap.com/docs/SAP_S4HANA_CLOUD/bb9f1469daf04bd894ab2167f8132a1a/913c5bcd8a434d7a824884e4a43966db.html).

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Company Code** | Enter the company code. |
| **Document Date** | Enter the invoice date. |
| **Posting Date** | Enter the posting date. |
| **Supplier Invoice ID By Invoicing Party** | Enter the invoice reference number. |
| **Invoicing Party** | Enter the invoicing party. |
| **Document Currency** | Enter the invoice currency. |
| **Invoice Gross Amount** | Enter the invoice gross amount.  **Note**  You must use the same currency throughout. |
| **Unplanned Delivery Cost** | Enter any unplanned delivery costs. |
| **Document Header Text** | Enter the text of your invoice header. |
| **Manual Cash Discount** | Enter the cash discount amount in document currency. |
| **Payment Terms** | Enter the agreement of cash discounts for a payment. |
| **Due Calculation Base Date** | Enter the baseline date for due-date calculation. |
| **Cash Discount 1 Percent** | Enter the percentage of the maximum cash discount. |
| **Cash Discount 1 Days** | Enter the number of days of the maximum cash discount. |
| **Cash Discount 2 Percent** | Enter the percentage of the normal cash discount. |
| **Cash Discount 2 Days** | Enter the number of days of the normal cash discount. |
| **Net Payment Days** | Enter the net payment terms period. |
| **Payment Blocking Reason** | Enter the reason why the processing of a payment is blocked. |
| **Accounting Document Type** | Enter the document type of the supplier invoice. |
| **BP Bank Account Internal ID** | Enter the ID of the bank account. |
| **Supplier Invoice Status** | Enter the status of the supplier invoice. |
| **Indirect Quoted Exchange Rate** | Enter the rate at which one currency can be exchanged for another according to the indirect quotation method. Enter the data as follows:  - 1 Unit Currency (UC) = X Quoted Currency (QC) - Unit Currency = Document Currency - Quoted Currency = Local Currency |
| **Direct Quoted Exchange Rate** | Enter the rate at which one currency can be exchanged for another according to the direct quotation method. Enter the data as follows:  - 1 Unit Currency (UC) = X Quoted Currency (QC) - Unit Currency = Document Currency - Quoted Currency = Local Currency |
| **State Central Bank Payment Reason** | Enter the reason that payment is needed for the report to the state central bank. |
| **Supplying Country** | Enter the supplying country. |
| **Payment Method** | Enter the payment method. |
| **Payment Method Supplement** | Enter the payment method supplement. |
| **Payment Reference** | Enter the payment reference.  **Note**  When an outgoing payment is made, the payment reference can be passed on to the relevant financial institute and from there to the payee.  When you are processing your account statement, you can use the payment reference to determine which items you have paid and then clear them. |
| **Invoice Reference** | Enter the document number of a referenced supplier invoice document. This field can only be filled for credit memos. |
| **Invoice Reference Fiscal Year** | Enter the fiscal year of a referenced supplier invoice document. |
| **Fixed Cash Discount** | Enter the fixed cash discount.  **Note**  This iIndicates that the first or second cash discount term can be taken advantage of irrespective of whether the corresponding period has elapsed. |
| **Unplanned Delivery Cost Tax Code** | Enter the tax code used to post unplanned delivery costs. |
| **Unplnd Deliv Cost Tax Jurisdiction** | Enter the tax jurisdiction for determining tax rates for unplanned delivery costs. |
| **Assignment Reference** | Enter the number of the assignment reference. |
| **Supplier Posting Line Item Text** | Enter any text regarding the supplier posting line. |
| **Tax Is Calculated Automatically** | Select whether tax is to be calculated automatically. |
| **Business Place** | Enter the place of business.  **Note**  For example, in Thailand, the business place is the basic organizational unit used for tax reporting and for assigning official document numbers. |
| **Business Section Code** | Enter the business section code. This is country or region dependant. |
| **Business Area** | Enter the area of business.  **Note**  This is an organizational unit of financial accounting that represents a separate area of operations or responsibilities within an organization. |
| **Supplier Invoice Is Credit Memo** | Enter whether the document is an invoice or a credit memo:  - `t` = redit memo - `f` = invoice |
| **Payt Slip Wth Ref Subscriber** | Valid only in country/region: CH (Switzerland)  Every supplier who participates in the special payment procedure of the Swiss Postal Service, receives a subscriber number. |
| **Payt Slip Wth Ref Check Digit** | Valid only in country/region: CH (Switzerland)  This field contains, for example, the check digit for the amount.  The rules for forming a check digit are set by the Swiss Postal Service. |
| **Payt Slip Wth Ref Reference** | Valid only in country/region: CH (Switzerland)  This parameter is used as a reference to the supplier invoice in payment transactions.  The check digit routine of the Swiss Postal Service is used for checking the field. |
| **Tax Reporting Date** | Enter the date on which the tax must be reported to the tax authority. |
| **Tax Fulfillment Date** | Enter the date on which the taxes on sales/purchases is due. The tax fulfillment date supplements the tax reporting date that specifies the date on which the tax must be reported to the tax authority. |
| **Invoice Receipt Date** | Enter the invoice receipt date. |
| **Delivery Of Goods Reporting Cntry** | Enter any reporting information about goods delivery within the European Union (EU). |
| **Supplier VAT Registration** | Enter the VAT registration number of the supplier. |
| **Is EU Triangular Deal** | Select whether the triangular deals within the EU. |
| **Suplr Invc Debit Crdt Code Delivery** | Enter the posting logic for delivery items (invoice/credit memo). |
| **Suplr Invc Debit Crdt Code Returns** | Enter the posting logic for return items (invoice/credit memo). |
| **GST Partner** | Enter the GST partner.  **Note**  In India, this indicates the GST partner, that is, organizations or individuals with which a company maintains business relations for procurement and sale of goods and services. The system uses the GST partner to calculate GST (Goods and Services Tax). |
| **GST Place Of Supply** | Enter the GST place of supply.  **Note**  In India, this specifies a two-character code that identifies the region where the goods and services are consumed. The system uses this code to calculate Goods and Services Tax (GST) at the time of invoice verification. |
| **Invoice Reference Number** | Enter the invoice reference number in India. |
| **Jrnl Entry Cntry Specific Ref 1** | Enter the country or region specific reference 1 in the invoice document. |
| **Jrnl Entry Cntry Specific Date 1** | Enter the country or region specific date 1 in the invoice document. |
| **Jrnl Entry Cntry Specific Ref 2** | Enter the country or region specific reference 2 in the invoice document. |
| **Jrnl Entry Cntry Specific Date 2** | Enter the country or region specific date 2 in the invoice document. |
| **Jrnl Entry Cntry Specific Ref 3** | Enter the country or region specific reference 3 in the invoice document. |
| **Jrnl Entry Cntry Specific Date 3** | Enter the country or region specific date 3 in the invoice document. |
| **Jrnl Entry Cntry Specific Ref 4** | Enter the country or region specific reference 4 in the invoice document. |
| **Jrnl Entry Cntry Specific Date 4** | Enter the country or region specific date 4 in the invoice document. |
| **Jrnl Entry Cntry Specific Ref 5** | Enter the country or region specific reference 5 in the invoice document. |
| **Jrnl Entry Cntry Specific Date 5** | Enter the country or region specific date 5 in the invoice document. |
| **Jrnl Entry Cntry SpecificBP 1** | Enter the country or region specific business partner 1 in the invoice document. |
| **Jrnl Entry Cntry SpecificBP 2** | Enter the country or region specific business partner 2 in the invoice document. |
| **Suplr Invc Item Pur Ord Ref** | Enter any additional information regarding the supplier invoice purchase order items. |
| **Supplier Invoice Item GL Acct** | Enter any additional information regarding the supplier invoice item and global account. |
| **Supplier Invoice Tax** | Enter any additional supplier invoice tax information. |
| **Supplier Invoice Whldg Tax** | Enter any additional information regarding supplier invoice withholding tax. |

[### Get a Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299845716654_body)

Retrieves the details of a supplier invoice by the supplier invoice number and fiscal year.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Supplier Invoice** | Enter the document number of the supplier invoice you want to retrieve. |
| **Fiscal Year** | Enter the fiscal year of the supplier invoice you want to retrieve. For example: `2022`. |
| **Expand** | Select the type of invoice you want to retrieve. |

[### Delete a Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299845723440_body)

Deletes a supplier invoice that has not been posted by the supplier invoice number and fiscal year.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Supplier Invoice** | Enter the document number of the supplier invoice you want to delete. |
| **Fiscal Year** | Enter the fiscal year of the supplier invoice you want to delete. For example: `2022`. |

[### Release a Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299845725902_body)

Releases a blocked supplier invoice by the supplier invoice number and fiscal year.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Supplier Invoice** | Enter the document number of the supplier invoice you want to release. |
| **Fiscal Year** | Enter the fiscal year of the supplier invoice you want to release. For example: `2022`. |
| **Discount Days Have To Be Shifted** | Select whether you want to shift the discount days. |

[### Cancel a Supplier Invoice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299845728422_body)

Reverses a supplier invoice by the supplier invoice number and fiscal year.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Supplier Invoice** | Enter the document number of the supplier invoice you want to cancel. |
| **Fiscal Year** | Enter the fiscal year of the supplier invoice you want to cancel. For example: `2022`. |
| **Posting Date** | Enter the date that the supplier invoice was posted. |
| **Reversal Reason** | Enter the reason you want to cancel the supplier invoice. |

[## Purchase Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-4b4b9ea8-3e77-fa96-8ac3-3b14c13e6371_body)

**Note**

These modules are now using API v4. You can browse all SAP S/4HANA ODATA v4 API [here](https://api.sap.com/package/S4HANAOPAPI/odatav4).

[### Watch Purchase Orders](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-2520975c-e8f7-36c5-0655-2218287bd707_body)

Triggers when a purchase order is created.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Expand** | Select the type of purchase order you want to watch for. |
| **Limit** | Enter the maximum number of purchase orders Celonis platform returns during one Action Flow execution cycle. |

[### Search Purchase Orders](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-ff6173d6-8994-7f80-3b1a-f09189a1a979_body)

Retrieves a list of purchase orders filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of purchase order you want to search for. |
| **Limit** | Enter the maximum number of purchase orders Celonis platform returns during one Action Flow execution cycle. |

[### Create a Purchase Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-8053cc3d-07bd-673b-60d3-264970cf9b45_body)

Creates a new purchase order.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to create. |
| **Company Code** | Enter the company code. |
| **Purchase Order Type** | Enter the type of purchase order you want to create. |
| **Supplier** | Enter the business partner who offers or provides materials or services for the purchase order. |
| **Language** | Enter the language. |
| **Payment Terms** | Enter the terms of the payment. |
| **Cash Discount 1 Days** | Enter the number of days of the maximum cash discount. |
| **Cash Discount 2 Days** | Enter the number of days of the normal cash discount. |
| **Cash Discount 1 Percent** | Enter the percentage of the maximum cash discount. |
| **Cash Discount 2 Percent** | Enter the percentage of the normal cash discount. |
| **Purchasing Organization** | Enter the purchasing organization. |
| **Purchasing Group** | Enter the purchasing group. |
| **Purchase Order Date** | Enter the date on which the purchase order has been placed. |
| **Document Currency** | Enter the document currency key. |
| **Exchange Rate** | Enter the exchange rate used for the translation between foreign currency and local currency. |
| **Exchange Rate Is Fixed** | Select whether you want to fix the exchange rate in the purchase order. |
| **Validity Start Date** | Enter the date when the purchase order is valid from. |
| **Validity End Date** | Enter the date when the purchase order is valid until. |
| **Supplier Quotation External ID** | Enter the external quotation ID on the supplier’s side. |
| **Supplier Resp Sales Person Name** | Enter the responsible sales person at the supplier’s office. |
| **Supplier Phone Number** | Enter the supplier’s telephone number. |
| **Supplying Supplier** | Enter the supplying supplier. |
| **Supplying Plant** | Enter the supplying plant. |
| **Incoterms Classification** | Enter the Incoterms classification. |
| **Correspnc External Reference** | Enter the reference ID that is provided by the external party and that is used in correspondence. |
| **Correspnc Internal Reference** | Enter the reference ID that is provided by the internal party and that is used in correspondence. |
| **Invoicing Party** | Enter the account of the invoicing party. |
| **Purchasing Completeness Status** | Enter the completeness status of the purchase order. |
| **Incoterms Version** | Enter the Incoterms version. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Address City Name** | Enter the city name. |
| **Address Fax Number** | Enter the fax number. |
| **Address House Number** | Enter the house number. |
| **Address Name** | Enter the address name. |
| **Address Postal Code** | Enter the postal code. |
| **Address Street Name** | Enter the street name. |
| **Address Phone Number** | Enter the phone number. Include the dialing code and number. |
| **Address Region** | Enter the region (state, province, county). |
| **Address Country** | Enter the country key. |
| **Address Correspondence Language** | Enter the correspondence language. |
| **Purchase Order Item** | Add any additional information about purchase order items. |
| **Purchase Order Note** | Add any additional information about purchase order notes. |

[### Get a Purchase Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-04fa8150-9f1c-c3f4-1ea9-bb33fb0ac52a_body)

Retrieves the details of a purchase order by the purchase order number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to retrieve. |
| **Expand** | Select the type of purchase order you want to retrieve. |

[### Update a Purchase Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-39c5768f-361c-a217-4188-5540791a2eae_body)

Updates a purchase order by the purchase order number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to update. |
| **Company Code** | Enter the company code. |
| **Purchase Order Type** | Enter the type of purchase order you want to update. |
| **Supplier** | Enter the business partner who offers or provides materials or services for the purchase order. |
| **Language** | Enter the language. |
| **Payment Terms** | Enter the terms of the payment. |
| **Cash Discount 1 Days** | Enter the number of days of the maximum cash discount. |
| **Cash Discount 2 Days** | Enter the number of days of the normal cash discount. |
| **Net Payment Days** | Enter the net payment terms period. |
| **Cash Discount 1 Percent** | Enter the percentage of the maximum cash discount. |
| **Cash Discount 2 Percent** | Enter the percentage of the normal cash discount. |
| **Purchasing Organization** | Enter the purchasing organization. |
| **Purchasing Group** | Enter the purchasing group. |
| **Purchase Order Date** | Enter the date on which the purchase order has been placed. |
| **Document Currency** | Enter the document currency key. |
| **Exchange Rate** | Enter the exchange rate used for the translation between foreign currency and local currency. |
| **Exchange Rate Is Fixed** | Select whether you want to fix the exchange rate in the purchase order. |
| **Validity Start Date** | Enter the date when the purchase order is valid from. |
| **Validity End Date** | Enter the date when the purchase order is valid until. |
| **Supplier Quotation External ID** | Enter the external quotation ID on the supplier’s side. |
| **Supplier Resp Sales Person Name** | Enter the responsible sales person at the supplier’s office. |
| **Supplier Phone Number** | Enter the supplier’s telephone number. |
| **Supplying Supplier** | Enter the supplying supplier. |
| **Supplying Plant** | Enter the supplying plant. |
| **Incoterms Classification** | Enter the Incoterms classification. |
| **Correspnc External Reference** | Enter the reference ID that is provided by the external party and that is used in correspondence. |
| **Correspnc Internal Reference** | Enter the reference ID that is provided by the internal party and that is used in correspondence. |
| **Invoicing Party** | Enter the account of the invoicing party. |
| **Purchasing Completeness Status** | Enter the completeness status of the purchase order. |
| **Incoterms Version** | Enter the Incoterms version. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Address City Name** | Enter the city name. |
| **Address Fax Number** | Enter the fax number. |
| **Address House Number** | Enter the house number. |
| **Address Name** | Enter the address name. |
| **Address Postal Code** | Enter the postal code. |
| **Address Street Name** | Enter the street name. |
| **Address Phone Number** | Enter the phone number. Include the dialing code and number. |
| **Address Region** | Enter the region (state, province, county). |
| **Address Country** | Enter the country key. |
| **Address Correspondence Language** | Enter the correspondence language. |

[### Delete a Purchase Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-46a0291d-ba48-315a-2288-0f9a678de36b_body)

Deletes all items of a purchase order that has been posted by the purchase order number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to delete. |

[### Search Purchase Order Items](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-c673c56b-16cb-373d-e135-098cfa471a3a_body)

Retrieves a list of items in a purchase order filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of purchase order item you want to search for. |
| **Limit** | Enter the maximum number of items Celonis platform returns during one Action Flow execution cycle. |

[### Add a Purchase Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-592ad081-8031-a235-51f2-59d6b4067468_body)

Adds an item to a purchase order by the purchase order number.

**Notice**

For the full list of variables and parameters for adding a purchase order item, please refer to the [SAP S/4HANA API reference documentation for Sourcing and Procurement](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91af7f8d3acd47da90d33aaacfcd0d59/3c55df577ec43528e10000000a441470.html).

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to add your item to. |
| **Purchase Order Item** | Enter the purchase order item number. |
| **Purchase Order Item Text** | Enter a short text for the purchase order item. |
| **Plant** | Enter the plant. |
| **Storage Location** | Enter the storage location. |
| **Material Group** | Enter the material group. |
| **Purchasing Info Record** | Enter the number of of the purchasing info record. |
| **Supplier Material Number** | Enter the material number used by the supplier. |
| **Order Quantity** | Enter the purchase order quantity. |
| **Purchase Order Quantity Unit** | Enter the purchase order unit of measurement. This specifies the unit of measure in which the item is ordered. |
| **Order Price Unit** | Enter the order price unit (Purchasing). |
| **Order Price Unit To Order Unit Nmrtr** | Enter the numerator for conversion of order price unit into order unit. |
| **Ord Price Unit To Order Unit Dnmntr** | Enter the denominator for conversion of order price unit into order unit. |
| **Net Price Amount** | Enter the net price in the purchasing document (in document currency). |
| **Net Price Quantity** | Enter the net price unit. |
| **Tax Code** | Enter the tax on sales and purchases code. |
| **Shipping Instruction** | Enter any additional shipping instructions. |
| **Tax Determination Date** | Enter the tax determination date. |
| **Tax Country** | Enter the tax reporting country or region. |
| **Price Is To Be Printed** | Select whether to include a price printout. |
| **Overdeliv Tolrtd Lmt Ratio In Pct** | Enter the overdelivery tolerance limit. |
| **Unlimited Overdelivery Is Allowed** | Select whether an unlimited overdelivery is allowed for the item. |
| **Underdeliv Tolrtd Lmt Ratio In Pct** | Enter the underdelivery tolerance limit. |
| **Valuation Type** | Enter the valuation type. |
| **Is Completely Delivered** | Select the indicator for status “Completely delivered”. |
| **Is Finally Invoiced** | Select the final invoice indicator. |
| **Purchase Order Item Category** | Enter the item category in the purchasing document. |
| **Account Assignment Category** | Enter the account assignment category. |
| **Multiple Acct Assgmt Distribution** | Enter the distribution indicator for multiple account assignment. |
| **Partial Invoice Distribution** | Enter how invoice amounts in partial invoices are to be distributed. |
| **Goods Receipt Is Expected** | Select whether a goods receipt is allowed and expected. |
| **Goods Receipt Is Non Valuated** | Select whether a goods receipt is non-valuated. |
| **Invoice Is Expected** | Select whether an invoice is allowed and expected. |
| **Invoice Is Goods Receipt Based** | Select whether the invoice verification is goods receipt-based. |
| **Purchase Contract** | Enter the number of the principal purchase agreement. |
| **Purchase Contract Item** | Enter the item number of the principal purchase agreement. |
| **Customer** | Enter the number of the customer for whom a material is to be delivered. |
| **Subcontractor** | Enter the supplier who is to receive delivery. |
| **Supplier Is Subcontractor** | Select whether the supplier is a subcontractor. |
| **Item Net Weight** | Enter the net weight on item level. |
| **Item Weight Unit** | Enter the unit of weight on item level. |
| **Tax Jurisdiction** | Enter the tax jurisdiction. |
| **Pricing Date Control** | Enter the price determination (Pricing) data control. |
| **Item Volume** | Enter the item volume. |
| **Item Volume Unit** | Enter the volume unit. |
| **Supplier Confirmation Control Key** | Enter the supplier confirmation control key. |
| **Incoterms Classification** | Enter the Incoterms classification. |
| **Incoterms Transfer Location** | Enter the Incoterms transfer location. |
| **Evald Rcpt Settlmt Is Allowed** | Select whether to include an evaluated receipt settlement (ERS). |
| **Purchase Requisition** | Enter the purchase requisition number. |
| **Purchase Requisition Item** | Enter the item number of purchase requisition. |
| **Is Returns Item** | Select whether or not the item is a returns item. |
| **Requisitioner Name** | Enter the name of requisitioner/requester. |
| **Service Package** | Enter the package number. |
| **Earmarked Funds** | Enter the document number for earmarked funds |
| **Earmarked Funds Item** | Enter the earmarked funds line item. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Material** | Enter the material number. |
| **International Article Number** | Enter the international Article Number (EAN/UPC). |
| **Manufacturer Material** | Enter the material number corresponding to manufacturer part number. |
| **Service Performer** | Enter the service performer. |
| **Product Type** | Enter the product type group. |
| **Expected Overall Limit Amount** | Enter the expected value of overall limit. |
| **Overall Limit Amount** | Enter the overall limit amount. |
| **Pur Contract For Overall Limit** | Enter the purchase contract for enhanced limit. |
| **Purchasing Parent Item** | Enter any higher-level item in purchasing documents. |
| **Reference Delivery Address ID** | Enter the number of the delivery address. |
| **Delivery Address Name** | Enter the address name. |
| **Delivery Address Name 2** | Enter the second address name. |
| **Delivery Address Street Name** | Enter the street name. |
| **Delivery Address House Number** | Enter the house number. |
| **Delivery Address City Name** | Enter the city name. |
| **Delivery Address Postal Code** | Enter the postal code. |
| **Delivery Address Region** | Enter the region (state, province, county). |
| **Delivery Address Country** | Enter the country key. |
| **Delivery Address District Name** | Enter the district. |
| **Down Payment Type** | Enter the down payment indicator. |
| **Down Payment Percentage Of Tot Amt** | Enter the down payment percentage. |
| **Down Payment Amount** | Enter the down payment amount in document currency. |
| **Down Payment Due Date** | Enter the due date for the down payment. |
| **Material Usage** | Enter the usage of the material. |
| **Material Origin** | Enter the origin of the material. |
| **CFOP Category** | Enter the CFOP category od the material. |
| **Is Produced In House** | Select whether or not the item is produced in-house. |
| **Consumption Tax Ctrl Code** | Enter the Brazilian NCM tax code. |
| **Purchase Order** | Add an additional purchase order. |
| **Account Assignment** | Add an additional account assignment. |
| **Purchase Order Item Note** | Add an additional purchase order item note. |
| **Purchase Order Pricing Element** | Add an additional purchase order pricing element. |
| **Schedule Line** | Add an additional schedule line. |

[### Get a Purchase Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-a52a9598-b55f-28b6-d7d9-8a8db525c5f4_body)

Retrieves the details of an item in a purchase order by the purchase order number and item number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to retrieve an item from. |
| **Purchase Order Item** | Enter the number of the purchase order item you want to retrieve. |
| **Expand** | Select the type of purchase order item you want to retrieve. |

[### Update a Purchase Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-16b35bca-0018-3600-16d1-7548376b6a95_body)

Updates a purchase order item by the purchase order number and item number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the number of the purchase order you want to update your item in. |
| **Purchase Order Item** | Enter the purchase order item number. |
| **Purchase Order Item Text** | Enter a short text for the purchase order item. |
| **Plant** | Enter the plant. |
| **Storage Location** | Enter the storage location. |
| **Material Group** | Enter the material group. |
| **Purchasing Info Record** | Enter the number of of the purchasing info record. |
| **Supplier Material Number** | Enter the material number used by the supplier. |
| **Order Quantity** | Enter the purchase order quantity. |
| **Purchase Order Quantity Unit** | Enter the purchase order unit of measurement. This specifies the unit of measure in which the item is ordered. |
| **Order Price Unit** | Enter the order price unit (Purchasing). |
| **Order Price Unit To Order Unit Nmrtr** | Enter the numerator for conversion of order price unit into order unit. |
| **Ord Price Unit To Order Unit Dnmntr** | Enter the denominator for conversion of order price unit into order unit. |
| **Net Price Amount** | Enter the net price in the purchasing document (in document currency). |
| **Net Price Quantity** | Enter the net price unit. |
| **Tax Code** | Enter the tax on sales and purchases code. |
| **Shipping Instruction** | Enter any additional shipping instructions. |
| **Tax Determination Date** | Enter the tax determination date. |
| **Tax Country** | Enter the tax reporting country or region. |
| **Price Is To Be Printed** | Select whether to include a price printout. |
| **Overdeliv Tolrtd Lmt Ratio In Pct** | Enter the overdelivery tolerance limit. |
| **Unlimited Overdelivery Is Allowed** | Select whether an unlimited overdelivery is allowed for the item. |
| **Underdeliv Tolrtd Lmt Ratio In Pct** | Enter the underdelivery tolerance limit. |
| **Valuation Type** | Enter the valuation type. |
| **Is Completely Delivered** | Select the indicator for status “Completely delivered”. |
| **Is Finally Invoiced** | Select the final invoice indicator. |
| **Purchase Order Item Category** | Enter the item category in the purchasing document. |
| **Account Assignment Category** | Enter the account assignment category. |
| **Multiple Acct Assgmt Distribution** | Enter the distribution indicator for multiple account assignment. |
| **Partial Invoice Distribution** | Enter how invoice amounts in partial invoices are to be distributed. |
| **Goods Receipt Is Expected** | Select whether a goods receipt is allowed and expected. |
| **Goods Receipt Is Non Valuated** | Select whether a goods receipt is non-valuated. |
| **Invoice Is Expected** | Select whether an invoice is allowed and expected. |
| **Invoice Is Goods Receipt Based** | Select whether the invoice verification is goods receipt-based. |
| **Purchase Contract** | Enter the number of the principal purchase agreement. |
| **Purchase Contract Item** | Enter the item number of the principal purchase agreement. |
| **Customer** | Enter the number of the customer for whom a material is to be delivered. |
| **Subcontractor** | Enter the supplier who is to receive delivery. |
| **Supplier Is Subcontractor** | Select whether the supplier is a subcontractor. |
| **Item Net Weight** | Enter the net weight on item level. |
| **Item Weight Unit** | Enter the unit of weight on item level. |
| **Tax Jurisdiction** | Enter the tax jurisdiction. |
| **Pricing Date Control** | Enter the price determination (Pricing) data control. |
| **Item Volume** | Enter the item volume. |
| **Item Volume Unit** | Enter the volume unit. |
| **Supplier Confirmation Control Key** | Enter the supplier confirmation control key. |
| **Incoterms Classification** | Enter the Incoterms classification. |
| **Incoterms Transfer Location** | Enter the Incoterms transfer location. |
| **Evald Rcpt Settlmt Is Allowed** | Select whether to include an evaluated receipt settlement (ERS). |
| **Purchase Requisition** | Enter the purchase requisition number. |
| **Purchase Requisition Item** | Enter the item number of purchase requisition. |
| **Is Returns Item** | Select whether or not the item is a returns item. |
| **Requisitioner Name** | Enter the name of requisitioner/requester. |
| **Service Package** | Enter the package number. |
| **Earmarked Funds** | Enter the document number for earmarked funds |
| **Earmarked Funds Item** | Enter the earmarked funds line item. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Material** | Enter the material number. |
| **International Article Number** | Enter the international Article Number (EAN/UPC). |
| **Manufacturer Material** | Enter the material number corresponding to manufacturer part number. |
| **Service Performer** | Enter the service performer. |
| **Product Type** | Enter the product type group. |
| **Expected Overall Limit Amount** | Enter the expected value of overall limit. |
| **Overall Limit Amount** | Enter the overall limit amount. |
| **Pur Contract For Overall Limit** | Enter the purchase contract for enhanced limit. |
| **Purchasing Parent Item** | Enter any higher-level item in purchasing documents. |
| **Reference Delivery Address ID** | Enter the number of the delivery address. |
| **Delivery Address Name** | Enter the address name. |
| **Delivery Address Name 2** | Enter the second address name. |
| **Delivery Address Street Name** | Enter the street name. |
| **Delivery Address House Number** | Enter the house number. |
| **Delivery Address City Name** | Enter the city name. |
| **Delivery Address Postal Code** | Enter the postal code. |
| **Delivery Address Region** | Enter the region (state, province, county). |
| **Delivery Address Country** | Enter the country key. |
| **Delivery Address District Name** | Enter the district. |
| **Down Payment Type** | Enter the down payment indicator. |
| **Down Payment Percentage Of Tot Amt** | Enter the down payment percentage. |
| **Down Payment Amount** | Enter the down payment amount in document currency. |
| **Down Payment Due Date** | Enter the due date for the down payment. |
| **Material Usage** | Enter the usage of the material. |
| **Material Origin** | Enter the origin of the material. |
| **CFOP Category** | Enter the CFOP category od the material. |
| **Is Produced In House** | Select whether or not the item is produced in-house. |
| **Consumption Tax Ctrl Code** | Enter the Brazilian NCM tax code. |
| **Purchase Order** | Add an additional purchase order. |
| **Account Assignment** | Add an additional account assignment. |
| **Purchase Order Item Note** | Add an additional purchase order item note. |
| **Purchase Order Pricing Element** | Add an additional purchase order pricing element. |
| **Schedule Line** | Add an additional schedule line. |

[### Delete a Purchase Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-e699e388-b7a5-98b4-eba3-54c5bd3d0376_body)

Deletes an item in a purchase order by the purchase order number and item number.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Purchase Order** | Enter the document number of the purchase order you want to delete an item from. |
| **Purchase Order Item** | Enter the number of the purchase order item you want to delete. |

[## Sales Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-98aa7d58-1218-b862-5b01-ea9122769f9f_body)

[### Watch Sales Orders](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-016c08a0-d0ab-c99c-08f5-05bedaea81cc_body)

Triggers when a sales order is created or updated.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Expand** | Select the type of sales order you want to watch for. |
| **Limit** | Enter the maximum number of sales orders Celonis platform returns during one Action Flow execution cycle. |

[### Search Sales Orders](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-0501ab4a-01dd-04f0-73fa-8ab9ec96d153_body)

Retrieves a list of sales orders filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of sales order you want to search for. |
| **Limit** | Enter the maximum number of sales orders Celonis platform returns during one Action Flow execution cycle. |

[### Create a Sales Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-6592fac7-f6bd-0f8f-f7fe-2d03cb5a5999_body)

Creates a new sales order.

|  |  |
| --- | --- |
| **Connection** | SAP S/4HANA account. |
| **Sales Order** | Enter the number of the sales order you want to create. |
| **Sales Order Type** | Enter the type of sales order you want to create. |
| **Sales Organization** | Enter the organizational unit responsible for the sales order. |
| **Distribution Channel** | Enter the distribution channel. Typical examples of distribution channels are `wholesale`, `retail`, or `direct sales`. |
| **Organization Division** | Enter the organization division. |
| **Sales Group** | Enter the group of sales people responsible for the sales order. |
| **Sales Office** | Enter the sales office. |
| **Sales District** | Enter the sales district. |
| **Sold To Party** | Enter the customer who orders the goods or services. The sold-to party is contractually responsible for sales orders. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document (for example, a sales inquiry or a purchase order). |
| **Purchase Order By Ship To Party** | Enter the number used by the end customer for unique identification of the purchasing document (for example, an inquiry or a purchase). |
| **Customer Purchase Order Type** | Enter the way in which the sales order arrives from the customer, for example, by telephone or e-mail. |
| **Customer Purchase Order Date** | Enter the reference date that is shown on the customer's purchase order. This date can be, for example, the date on which the customer created the purchase order. |
| **Sales Order Date** | Enter the date on which you want the sales order to become effective for sales management purposes. |
| **Transaction Currency** | Enter the currency that applies to the sales order. |
| **SD Document Reason** | Enter the reason for creating the sales order. |
| **Pricing Date** | Enter the date that determines date-related pricing elements, such as conditions and foreign exchange rate. |
| **Price Detn Exchange Rate** | Enter the exchange rate for price determination. |
| **Billing Plan** | Enter the billing plan or invoice plan number. |
| **Requested Delivery Date** | Enter the requested delivery date. |
| **Shipping Condition** | Enter the general shipping strategy for the delivery of goods from the supplier to the customer. |
| **Complete Delivery Is Defined** | Select whether to complete delivery defined for each sales order. |
| **Shipping Type** | Enter the shipping type (for example, by road or rail) that has been selected for the transportation of the goods for the shipment legs. |
| **Header Billing Block Reason** | Enter the reason if the entire sales order is blocked for billing. |
| **Delivery Block Reason** | Enter the reason if an entire sales order is blocked for delivery. |
| **Delivery Date Type Rule** | Enter any delivery date type rules. |
| **Incoterms Classification** | Enter the Incoterms classification. These are commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Enter any additional information for the primary Incoterm. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Incoterms Version** | Enter the Incoterm edition. |
| **Customer Price Group** | Enter the group of customers who share the same pricing requirements. |
| **Price List Type** | Enter a price list or other condition type (for example, a surcharge or discount). |
| **Customer Payment Terms** | Enter the defining payment terms composed of cash discount percentages and payment periods. |
| **Payment Method** | Specify how an item is to be paid. |
| **Fixed Value Date** | Enter the date on which the terms of payment related to the sales order become effective. |
| **Assignment Reference** | Enter the number that is used to sort and display line items. |
| **Reference SD Document** | Specify the document to which the sales order refers (a preceding document, such as a sales quotation).  **Note**  For more information, see [Create Sales Orders with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/03373661272d43b0b43538f171ae6aba.html?). |
| **Accounting Doc External Reference** | Enter the reference document number contains the document number with the business partner. This serves as a search criterion when displaying or changing documents. |
| **Customer Account Assignment Group** | Enter the account assignment group to which the system automatically posts the sales document. |
| **Accounting Exchange Rate** | Enter the exchange rate that the system applies when you create an invoice. |
| **Customer Group** | Enter a particular group of customers (for example, wholesale or retail) for the purpose of pricing or generating statistics. |
| **Additional Customer Group 1** | Specify a customer-defined group of customers.  **Note**  You can define up to five different groups of customers, according to the needs of your organization. |
| **Additional Customer Group 2** | Specify a customer-defined group of customers. |
| **Additional Customer Group 3** | Specify a customer-defined group of customers. |
| **Additional Customer Group 4** | Specify a customer-defined group of customers. |
| **Additional Customer Group 5** | Specify a customer-defined group of customers. |
| **Sls Doc Is Rlvt For Proof Of Deliv** | Select whether to control proof of delivery (POD) processing. |
| **Customer Tax Classification 1** | Enter the alternative tax classification.  **Note**  This indicates whether the system takes account of customer-specific taxes for pricing (such as value-added tax). The system copies the tax classification from the tax information stored in the customer master record of the goods recipient. During pricing, the system uses the tax classification and the country or region key (which identifies the customer location) to determine the relevant taxes. You can enter a different (alternative) tax classification in the order. |
| **Customer Tax Classification 2** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 3** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 4** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 5** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 6** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 7** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 8** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 9** | Enter an additional alternative tax classification. |
| **Tax Departure Country** | Enter the tax departing country. For tax determination, the country or region of departure is used as the plant country or region. |
| **VAT Registration Country** | Enter the VAT registration country. For tax determination, the country or region of the ship-to party is used as the tax country or region of destination. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Contract Account** | Enter a contract account. This identifies a contract account per client, that is, an account in which posting data for contracts or contract items are processed for which the same collection/payment agreements apply. Contract accounts are managed on an open item basis within contract accounts receivable and payable. |
| **Additional Value Days** | Specify the number of days between the billing date and the date on which the terms of payment for the sales document become effective. |
| **Customer Purchase Order Suplmnt** | Enter any additional information to help identify the customer's sales document. |
| **Services Rendered Date** | Specify the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the product. |
| **Billing Plan** | Add any additional billing plan details. |
| **Item** | Add any additional item details. |
| **Partner** | Add any additional partner details. |
| **Payment Plan Item Details** | Add any additional payment plan item details. |
| **Preceding Proc Flow Doc** | Add any additional preceding process flow document details. |
| **Pricing Element** | Add any additional pricing element details. |
| **Related Object** | Add any additional related object details. |
| **Subsequent Proc Flow Doc** | Add any additional subsequent process flow document details. |
| **Text** | Add any additional text details. |

[### Get a Sales Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-122a6056-ca24-75f3-c2c4-59fee75462f9_body)

Retrieves the details of a sales order by the sales order number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to retrieve. |
| **Expand** | Select the type of sales order you want to retrieve. |

[### Update a Sales Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-e48e6483-a48a-3d7a-a9f0-e77c1f442df7_body)

Updates a sales order by the sales order number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to update. |
| **Sales Order Type** | Enter the type of sales order you want to update. |
| **Sales Organization** | Enter the organizational unit responsible for the sales order. |
| **Distribution Channel** | Enter the distribution channel. Typical examples of distribution channels are `wholesale`, `retail`, or `direct sales`. |
| **Organization Division** | Enter the organization division. |
| **Sales Group** | Enter the group of sales people responsible for the sales order. |
| **Sales Office** | Enter the sales office. |
| **Sales District** | Enter the sales district. |
| **Sold To Party** | Enter the customer who orders the goods or services. The sold-to party is contractually responsible for sales orders. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document (for example, a sales inquiry or a purchase order). |
| **Purchase Order By Ship To Party** | Enter the number used by the end customer for unique identification of the purchasing document (for example, an inquiry or a purchase). |
| **Customer Purchase Order Type** | Enter the way in which the sales order arrives from the customer, for example, by telephone or e-mail. |
| **Customer Purchase Order Date** | Enter the reference date that is shown on the customer's purchase order. This date can be, for example, the date on which the customer created the purchase order. |
| **Sales Order Date** | Enter the date on which you want the sales order to become effective for sales management purposes. |
| **Transaction Currency** | Enter the currency that applies to the sales order. |
| **SD Document Reason** | Enter the reason for creating the sales order. |
| **Pricing Date** | Enter the date that determines date-related pricing elements, such as conditions and foreign exchange rate. |
| **Price Detn Exchange Rate** | Enter the exchange rate for price determination. |
| **Billing Plan** | Enter the billing plan or invoice plan number. |
| **Requested Delivery Date** | Enter the requested delivery date. |
| **Shipping Condition** | Enter the general shipping strategy for the delivery of goods from the supplier to the customer. |
| **Complete Delivery Is Defined** | Select whether to complete delivery defined for each sales order. |
| **Shipping Type** | Enter the shipping type (for example, by road or rail) that has been selected for the transportation of the goods for the shipment legs. |
| **Header Billing Block Reason** | Enter the reason if the entire sales order is blocked for billing. |
| **Delivery Block Reason** | Enter the reason if an entire sales order is blocked for delivery. |
| **Delivery Date Type Rule** | Enter any delivery date type rules. |
| **Incoterms Classification** | Enter the Incoterms classification. These are commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Enter any additional information for the primary Incoterm. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Incoterms Version** | Enter the Incoterm edition. |
| **Customer Price Group** | Enter the group of customers who share the same pricing requirements. |
| **Price List Type** | Enter a price list or other condition type (for example, a surcharge or discount). |
| **Customer Payment Terms** | Enter the defining payment terms composed of cash discount percentages and payment periods. |
| **Payment Method** | Specify how an item is to be paid. |
| **Fixed Value Date** | Enter the date on which the terms of payment related to the sales order become effective. |
| **Assignment Reference** | Enter the number that is used to sort and display line items. |
| **Reference SD Document** | Specify the document to which the sales order refers (a preceding document, such as a sales quotation).  **Note**  For more information, see [Create Sales Orders with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/03373661272d43b0b43538f171ae6aba.html?). |
| **Accounting Doc External Reference** | Enter the reference document number contains the document number with the business partner. This serves as a search criterion when displaying or changing documents. |
| **Customer Account Assignment Group** | Enter the account assignment group to which the system automatically posts the sales document. |
| **Accounting Exchange Rate** | Enter the exchange rate that the system applies when you create an invoice. |
| **Customer Group** | Enter a particular group of customers (for example, wholesale or retail) for the purpose of pricing or generating statistics. |
| **Additional Customer Group 1** | Specify a customer-defined group of customers.  **Note**  You can define up to five different groups of customers, according to the needs of your organization. |
| **Additional Customer Group 2** | Specify a customer-defined group of customers. |
| **Additional Customer Group 3** | Specify a customer-defined group of customers. |
| **Additional Customer Group 4** | Specify a customer-defined group of customers. |
| **Additional Customer Group 5** | Specify a customer-defined group of customers. |
| **Sls Doc Is Rlvt For Proof Of Deliv** | Select whether to control proof of delivery (POD) processing. |
| **Customer Tax Classification 1** | Enter the alternative tax classification.  **Note**  This indicates whether the system takes account of customer-specific taxes for pricing (such as value-added tax). The system copies the tax classification from the tax information stored in the customer master record of the goods recipient. During pricing, the system uses the tax classification and the country or region key (which identifies the customer location) to determine the relevant taxes. You can enter a different (alternative) tax classification in the order. |
| **Customer Tax Classification 2** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 3** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 4** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 5** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 6** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 7** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 8** | Enter an additional alternative tax classification. |
| **Customer Tax Classification 9** | Enter an additional alternative tax classification. |
| **Tax Departure Country** | Enter the tax departing country. For tax determination, the country or region of departure is used as the plant country or region. |
| **VAT Registration Country** | Enter the VAT registration country. For tax determination, the country or region of the ship-to party is used as the tax country or region of destination. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Contract Account** | Enter a contract account. This identifies a contract account per client, that is, an account in which posting data for contracts or contract items are processed for which the same collection/payment agreements apply. Contract accounts are managed on an open item basis within contract accounts receivable and payable. |
| **Additional Value Days** | Specify the number of days between the billing date and the date on which the terms of payment for the sales document become effective. |
| **Customer Purchase Order Suplmnt** | Enter any additional information to help identify the customer's sales document. |
| **Services Rendered Date** | Specify the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the product. |

[### Delete a Sales Order](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-d4910938-8be6-d868-a1bd-1d5eefa889fa_body)

Deletes all items of a sales order the has been posted by the sales order number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to delete. |

[### Release a Sales Order Approval Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-cd72776b-e32a-8f56-693c-3c0ce6cd34d7_body)

Releases an approval request of a sales order by the sales order number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to release an approval request for. |

[### Reject a Sales Order Approval Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-0b3c3a71-17a6-7ca1-db4f-d97f2d95c42e_body)

Rejects an approval request of a sales order by the sales order number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to reject an approval request for. |

[### Search Sales Order Items](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-839ed3b4-5a04-c917-9ec0-c25da23f6fb9_body)

Retrieves a list of items in a sales order filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of sales order item you want to search for. |
| **Limit** | Enter the maximum number of items Celonis platform returns during one Action Flow execution cycle. |

[### Add a Sales Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-355d9450-968e-ec5d-0538-9a9853b1ee84_body)

Adds an item to a sales order by the sales order number.

**Notice**

For the full list of variables and parameters for adding a sales order item, please refer to the [SAP S/4HANA API reference documentation for Sourcing and Procurement](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/32dc44581efca007e10000000a441470.html).

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order Item** | Enter the sales order item number. |
| **Higher Level Item** | Enter the number of the higher-level item to which this item belongs in a hierarchy. |
| **Sales Order Item Category** | Enter the category of the sales order item. |
| **Sales Order Item Text** | Enter a short text for the sales order item. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document. |
| **Purchase Order By Ship To Party** | Enter the number used by the end customer for unique identification of the purchasing document. |
| **Underlying Purchase Order Item** | Enter the item number of the underlying sales order. |
| **Material** | Enter the material number. |
| **Material By Customer** | Enter the material number used by the customer. |
| **Pricing Date** | Enter the date that determines date-related pricing elements. |
| **Pricing Reference Material** | Enter the material master record that the system uses as a reference for pricing purposes. |
| **Billing Plan** | Enter the billing plan number. |
| **Requested Quantity** | Enter the number or volume of materials specified in an item. |
| **Requested Quantity Unit** | Enter the unit in which the requested quantity is specified.  **Note**  For the requested quantity units, you can use either the language-dependent unit code, the ISO code, the SAP code (the format found in the database without conversions). |
| **Requested Quantity SAP Unit** | Enter the unit in SAP code in which the requested quantity is specified. |
| **Requested Quantity ISO Unit** | Enter the unit in ISO code in which the requested quantity is specified. |
| **Item Weight SAP Unit** | Enter the SAP item unit referring to the gross weight or net weight of the material. |
| **Item Weight ISO Unit** | Enter the ISO item unit referring to the gross weight or net weight of the material. |
| **Item Volume SAP Unit** | Enter the SAP item volume. |
| **Item Volume ISO Unit** | Enter the ISO item volume. |
| **Material Group** | Enter the key that you use to group together several materials or services with the same attributes, and to assign them to a particular material group. |
| **Material Pricing Group** | Enter the material pricing group. |
| **Additional Material Group 1** | Enter an additional material group. |
| **Additional Material Group 2** | Enter an additional material group. |
| **Additional Material Group 3** | Enter an additional material group. |
| **Additional Material Group 4** | Enter an additional material group. |
| **Additional Material Group 5** | Enter an additional material group. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Contract Account** | Enter a contract account. This identifies a contract account per client, that is, an account in which posting data for contracts or contract items are processed for which the same collection/payment agreements apply. Contract accounts are managed on an open item basis within contract accounts receivable and payable. |
| **Additional Value Days** | Specify the number of days between the billing date and the date on which the terms of payment for the sales document become effective. |
| **Services Rendered Date** | Specify the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the product. |
| **Batch** | Enter the batch number. |
| **Production Plant** | Enter the plant key. |
| **Storage Location** | Enter the number of the storage location in which the material is stored.  **Note**  A plant may contain one or more storage locations. |
| **Shipping Type** | Enter the shipping type (for example, by road or rail) that has been selected for the transportation of the goods for the shipment legs. |
| **Shipping Point** | Enter the physical location (for example, a warehouse or collection of loading ramps) from which you ship the item. |
| **Delivery Priority** | Enter the delivery priority assigned to an item. |
| **Delivery Date Type Rule** | Enter any delivery date type rules. |
| **Incoterms Classification** | Enter the Incoterms classification. These are commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Enter any additional information for the primary Incoterm. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Tax Amount** | Enter the tax amount in document currency. |
| **Product Tax Classification 1** | Specify the first tax classification for the material. |
| **Product Tax Classification 2** | Specify an additional tax classification for the material. |
| **Product Tax Classification 3** | Specify an additional tax classification for the material. |
| **Product Tax Classification 4** | Specify an additional tax classification for the material. |
| **Product Tax Classification 5** | Specify an additional tax classification for the material. |
| **Product Tax Classification 6** | Specify an additional tax classification for the material. |
| **Product Tax Classification 7** | Specify an additional tax classification for the material. |
| **Product Tax Classification 8** | Specify an additional tax classification for the material. |
| **Product Tax Classification 9** | Specify an additional tax classification for the material. |
| **Matl Account Assignment Group** | Enter the account assignment group for the material is a group of materials with the same accounting requirements. |
| **Cost Amount** | Enter the cost amount in document currency. |
| **Customer Payment Terms** | Enter the defining payment terms composed of cash discount percentages and payment periods. |
| **Fixed Value Date** | Enter the date on which the terms of payment related to the sales order become effective. |
| **Customer Group** | Enter a particular group of customers (for example, wholesale or retail) for the purpose of pricing or generating statistics. |
| **Sales Document Rjcn Reason** | Enter the reason for rejecting a sales order. |
| **Item Billing Block Reason** | Give a reason if the item is blocked for billing. |
| **Sls Doc Is Rlvt For Proof Of Deliv** | Select whether to control proof of delivery (POD) processing. |
| **WBS Element** | Enter the key that identifies a WBS element (a structural element in a work breakdown structure representing the hierarchical organization of a project). |
| **Profit Center** | Enter a key which together with the controlling area uniquely identifies a profit center. |
| **Accounting Exchange Rate** | Enter the exchange rate that the system applies when you create an invoice. |
| **Reference SD Document** | Specify the document to which the sales order refers (a preceding document, such as a sales quotation).  **Note**  For more information, see [Create Sales Orders with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/03373661272d43b0b43538f171ae6aba.html?). |
| **Reference SD Document Item** | Specify the number of the sales document item to which the sales order item refers. |
| **Billing Plan** | Add any additional billing plan details. |
| **Partner** | Add any additional partner details. |
| **Preceding Proc Flow Doc Item** | Add any additional preceding process flow document details. |
| **Pricing Element** | Add any additional pricing element details. |
| **Related Object** | Add any additional related object details. |
| **Sales Order** | Add any additional sales order details. |
| **Schedule Line** | Add any additional schedule line details. |
| **Subsequent Proc Flow Doc Item** | Add any additional subsequent process flow document details. |
| **Text** | Add any additional text details. |

[### Get a Sales Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-91503d05-d927-2bd3-2e6c-4cdad423e588_body)

Retrieves the details of an item in a sales order by the sales order number and item number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the number of the sales order you want to retrieve an item from. |
| **Sales Order Item** | Enter the number of the sales order item you want to retrieve. |
| **Expand** | Select the type of sales order item you want to retrieve. |

[### Update a Sales Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-b9ec6792-9f21-bfed-09d4-27adfae5658a_body)

Updates a sales order item by the sales order number and item number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order Item** | Enter the sales order item number. |
| **Higher Level Item** | Enter the number of the higher-level item to which this item belongs in a hierarchy. |
| **Sales Order Item Category** | Enter the category of the sales order item. |
| **Sales Order Item Text** | Enter a short text for the sales order item. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document. |
| **Purchase Order By Ship To Party** | Enter the number used by the end customer for unique identification of the purchasing document. |
| **Underlying Purchase Order Item** | Enter the item number of the underlying sales order. |
| **Material** | Enter the material number. |
| **Material By Customer** | Enter the material number used by the customer. |
| **Pricing Date** | Enter the date that determines date-related pricing elements. |
| **Pricing Reference Material** | Enter the material master record that the system uses as a reference for pricing purposes. |
| **Billing Plan** | Enter the billing plan number. |
| **Requested Quantity** | Enter the number or volume of materials specified in an item. |
| **Requested Quantity Unit** | Enter the unit in which the requested quantity is specified.  **Note**  For the requested quantity units, you can use either the language-dependent unit code, the ISO code, the SAP code (the format found in the database without conversions). |
| **Requested Quantity SAP Unit** | Enter the unit in SAP code in which the requested quantity is specified. |
| **Requested Quantity ISO Unit** | Enter the unit in ISO code in which the requested quantity is specified. |
| **Item Weight SAP Unit** | Enter the SAP item unit referring to the gross weight or net weight of the material. |
| **Item Weight ISO Unit** | Enter the ISO item unit referring to the gross weight or net weight of the material. |
| **Item Volume SAP Unit** | Enter the SAP item volume. |
| **Item Volume ISO Unit** | Enter the ISO item volume. |
| **Material Group** | Enter the key that you use to group together several materials or services with the same attributes, and to assign them to a particular material group. |
| **Material Pricing Group** | Enter the material pricing group. |
| **Additional Material Group 1** | Enter an additional material group. |
| **Additional Material Group 2** | Enter an additional material group. |
| **Additional Material Group 3** | Enter an additional material group. |
| **Additional Material Group 4** | Enter an additional material group. |
| **Additional Material Group 5** | Enter an additional material group. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Contract Account** | Enter a contract account. This identifies a contract account per client, that is, an account in which posting data for contracts or contract items are processed for which the same collection/payment agreements apply. Contract accounts are managed on an open item basis within contract accounts receivable and payable. |
| **Additional Value Days** | Specify the number of days between the billing date and the date on which the terms of payment for the sales document become effective. |
| **Services Rendered Date** | Specify the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the product. |
| **Batch** | Enter the batch number. |
| **Production Plant** | Enter the plant key. |
| **Storage Location** | Enter the number of the storage location in which the material is stored.  **Note**  A plant may contain one or more storage locations. |
| **Shipping Type** | Enter the shipping type (for example, by road or rail) that has been selected for the transportation of the goods for the shipment legs. |
| **Shipping Point** | Enter the physical location (for example, a warehouse or collection of loading ramps) from which you ship the item. |
| **Delivery Priority** | Enter the delivery priority assigned to an item. |
| **Delivery Date Type Rule** | Enter any delivery date type rules. |
| **Incoterms Classification** | Enter the Incoterms classification. These are commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Enter any additional information for the primary Incoterm. |
| **Incoterms Location 1** | Enter the first Incoterms location. |
| **Incoterms Location 2** | Enter the second Incoterms location. |
| **Tax Amount** | Enter the tax amount in document currency. |
| **Product Tax Classification 1** | Specify the first tax classification for the material. |
| **Product Tax Classification 2** | Specify an additional tax classification for the material. |
| **Product Tax Classification 3** | Specify an additional tax classification for the material. |
| **Product Tax Classification 4** | Specify an additional tax classification for the material. |
| **Product Tax Classification 5** | Specify an additional tax classification for the material. |
| **Product Tax Classification 6** | Specify an additional tax classification for the material. |
| **Product Tax Classification 7** | Specify an additional tax classification for the material. |
| **Product Tax Classification 8** | Specify an additional tax classification for the material. |
| **Product Tax Classification 9** | Specify an additional tax classification for the material. |
| **Matl Account Assignment Group** | Enter the account assignment group for the material is a group of materials with the same accounting requirements. |
| **Cost Amount** | Enter the cost amount in document currency. |
| **Customer Payment Terms** | Enter the defining payment terms composed of cash discount percentages and payment periods. |
| **Fixed Value Date** | Enter the date on which the terms of payment related to the sales order become effective. |
| **Customer Group** | Enter a particular group of customers (for example, wholesale or retail) for the purpose of pricing or generating statistics. |
| **Sales Document Rjcn Reason** | Enter the reason for rejecting a sales order. |
| **Item Billing Block Reason** | Give a reason if the item is blocked for billing. |
| **Sls Doc Is Rlvt For Proof Of Deliv** | Select whether to control proof of delivery (POD) processing. |
| **WBS Element** | Enter the key that identifies a WBS element (a structural element in a work breakdown structure representing the hierarchical organization of a project). |
| **Profit Center** | Enter a key which together with the controlling area uniquely identifies a profit center. |
| **Accounting Exchange Rate** | Enter the exchange rate that the system applies when you create an invoice. |
| **Reference SD Document** | Specify the document to which the sales order refers (a preceding document, such as a sales quotation).  **Note**  For more information, see [Create Sales Orders with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/03373661272d43b0b43538f171ae6aba.html?). |
| **Reference SD Document Item** | Specify the number of the sales document item to which the sales order item refers. |

[### Delete a Sales Order Item](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-e8cd40a6-68e0-9176-3510-53dfeb8271fe_body)

Deletes an item in a sales order by the sales order number and item number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Sales Order** | Enter the document number of the sales order you want to delete an item from. |
| **Sales Order Item** | Enter the number of the sales order item you want to delete. |

[## Payment Advice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-4b828569-5d3a-0ac4-12a0-c3d4012b23dc_body)

[### Watch Payment Advices](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4612492917470432998533174739_body)

Triggers when a payment advice is created.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Expand** | Select the type of payment advice you want to watch for. |
| **Limit** | Enter the maximum number of results Celonis platform returns during one Action Flow execution cycle. |

[### Search Payment Advices](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853360262_body)

Retrieves a list of payment advices filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of payment advice you want to search for. |
| **Limit** | Enter the maximum number of results Celonis platform returns during one Action Flow execution cycle. |

[### Create a Payment Advice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853376212_body)

Creates a new payment advice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Company Code** | Enter the company code. |
| **Payment Advice Account Type** | Enter the payment advice account type. Customer or supplier. |
| **Payment Advice Account** | Enter the ID number of the customer or supplier. |
| **Payment Advice** | Enter the ID number of the payment advice object. |
| **Payment Document** | Enter the payment document number |
| **Account By Shipper** | Enter the payee’s account at the customer. |
| **Payment Currency** | Enter the payment currency key. |
| **Payment Date** | Enter the payment date. |
| **Paid Amount In Payt Currency** | Enter the payment amount from the payment advice header. |
| **Cash Discount Amount In Payt Crcy** | Enter the cash discount amount. |
| **Partner Bank Country** | Enter the country key of the partner bank. |
| **Partner Bank SWIFT Code** | Enter the SWIFT code of the partner bank. |
| **Payment Advice Header Text** | Enter the payment advice header text. |
| **Payment Advice Type** | Enter the payment advice type. |
| **Payt Advc Diff Determination Rule** | Enter the conversion version of the reason code. |
| **Payment Advice Selection Rule** | Enter the selection rule for payment advices. |
| **Original Reference Document** | Enter the original reference document number. |
| **Reference Document Type** | Enter the reference transaction. |
| **Fee Amount In Transaction Crcy** | Enter the fee in the account currency. |
| **Payment Transaction** | Enter the business transaction code. |
| **Exchange Rate** | Enter the accounting exchange rate. |
| **Bill Of Exchange Failure Date** | Enter the date of failed bills of exchange in Japan. |
| **Bank Reference** | Enter the bank reference number. |
| **Business Partner Name** | Enter the business partner name. |
| **Payment Advice Item** | Add a payment advice item. |

[### Get a Payment Advice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853378432_body)

Retrieves the details of a payment advice by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Company Code** | Enter the company code. |
| **Payment Advice Account Type** | Enter the payment advice account type. Customer or supplier. |
| **Payment Advice Account** | Enter the ID number of the customer or supplier. |
| **Payment Advice** | Enter the ID number of the payment advice object. |
| **Expand** | Select the type of payment advice you want to retrieve |

[### Update a Payment Advice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853383084_body)

Updates a payment advice by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Company Code** | Enter the company code. |
| **Payment Advice Account Type** | Enter the payment advice account type. Customer or supplier. |
| **Payment Advice Account** | Enter the ID number of the customer or supplier. |
| **Payment Advice** | Enter the ID number of the payment advice object. |
| **Payment Document** | Enter the payment document number |
| **Account By Shipper** | Enter the payee’s account at the customer. |
| **Payment Currency** | Enter the payment currency key. |
| **Payment Date** | Enter the payment date. |
| **Paid Amount In Payt Currency** | Enter the payment amount from the payment advice header. |
| **Cash Discount Amount In Payt Crcy** | Enter the cash discount amount. |
| **Partner Bank Country** | Enter the country key of the partner bank. |
| **Partner Bank SWIFT Code** | Enter the SWIFT code of the partner bank. |
| **Payment Advice Header Text** | Enter the payment advice header text. |
| **Payment Advice Type** | Enter the payment advice type. |
| **Payt Advc Diff Determination Rule** | Enter the conversion version of the reason code. |
| **Payment Advice Selection Rule** | Enter the selection rule for payment advices. |
| **Original Reference Document** | Enter the original reference document number. |
| **Reference Document Type** | Enter the reference transaction. |
| **Fee Amount In Transaction Crcy** | Enter the fee in the account currency. |
| **Payment Transaction** | Enter the business transaction code. |
| **Exchange Rate** | Enter the accounting exchange rate. |
| **Bill Of Exchange Failure Date** | Enter the date of failed bills of exchange in Japan. |
| **Bank Reference** | Enter the bank reference number. |
| **Business Partner Name** | Enter the business partner name. |

[### Delete a Payment Advice](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853385782_body)

Deletes a payment advice by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Company Code** | Enter the company code. |
| **Payment Advice Account Type** | Enter the payment advice account type. Customer or supplier. |
| **Payment Advice Account** | Enter the ID number of the customer or supplier. |
| **Payment Advice** | Enter the ID number of the payment advice object. |

[## Business Partner](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-d25d80cc-02f8-9ce4-6a74-f7e9150a5c6f_body)

[### Watch Business Partners](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4563032023910432998536615755_body)

Triggers when a business partner is created or updated.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Expand** | Select the type of business partner you want to watch for. |
| **Limit** | Enter the maximum number of business partners Celonis platform returns during one Action Flow execution cycle. |

[### Search Business Partners](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853710718_body)

Retrieves a list of business partners filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of business partner you want to search for. |
| **Limit** | Enter the maximum number of business partners Celonis platform returns during one Action Flow execution cycle. |

[### Create a Business Partner](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853713450_body)

Creates a new business partner.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Business Partner** | Enter the business partner number. |
| **Academic Title** | Enter the academic title. |
| **Authorization Group** | Enter the authorization group.  **Note**  Authorization groups are used to stipulate which business partners a user is allowed to process. |
| **Business Partner Category** | Enter the type of business partner (person/organization/group. |
| **Business Partner Grouping** | Enter the business partner classification. |
| **Correspondence Language** | Enter the desired language. |
| **First Name** | Enter the first name of the business partner. |
| **Form Of Address** | Enter the form of address. |
| **Industry** | Enter the industry sector. |
| **International Location Number 1** | Enter the first international location number. |
| **International Location Number 2** | Enter the second international location number. |
| **Is Female** | Select whether the business partner is female. |
| **Is Male** | Select whether the business partner is male. |
| **Is Natural Person** | Enter whether the business partner is a natural person.  **Note**  Distinctions between natural and legal persons are for tax reporting. |
| **Is Sex Unknown** | Select whether the business partner's sex is unknown. |
| **Gender Code Name** | Enter the gender code of the business partner. |
| **Language** | Enter the language for verbal communication with a business partner. |
| **Last Name** | Enter the last name of the business partner. |
| **Legal Form** | Enter the legal form of the organization.  **Note**  Denotes certain legal norms that are of significance for the organization of a company. |
| **Organization BP Name 1** | Enter the first name of the business partner's organization. |
| **Organization BP Name 2** | Enter the second name of the business partner's organization. |
| **Organization BP Name 3** | Enter the third name of the business partner's organization. |
| **Organization BP Name 4** | Enter the fourth name of the business partner's organization. |
| **Organization Foundation Date** | Enter the date the organization was founded. |
| **Organization Liquidation Date** | Enter the date the organization was liquidated. |
| **Search Term 1** | Enter the first search terms for the business partner.  **Note**  Denotes the term that you define for a business partner, and via which you can restrict the search for a business partner. |
| **Search Term 2** | Enter the second search terms for the business partner. |
| **Additional Last Name** | Enter the other last name of the business partner. |
| **Birth Date** | Enter the birth date of the business partner. |
| **Business Partner Birthplace Name** | Enter the birthplace of the business partner. |
| **Business Partner Death Date** | Enter the death date of the business partner. |
| **Business Partner Is Blocked** | Select whether the business partner is blocked.  **Note**  If the business partner is blocked centrally, certain activities cannot be executed. |
| **Business Partner Type** | Enter the type of business partner. |
| **Group Business Partner Name 1** | Enter the first name for business partners in the group category. |
| **Group Business Partner Name 2** | Enter the second name for business partners in the group category. |
| **International Location Number** | Enter the international location number. |
| **Middle Name** | Enter the middle name of the business partner. |
| **Name Country** | Enter the country for the name format rule. |
| **Name Format** | Enter the name format. |
| **Person Full Name** | Enter the complete name of the person. |
| **Is Marked For Archiving** | Select whether the business partner is meant to be archived. |
| **Business Partner ID By Ext System** | Enter the business partner number in the external system. |
| **Business Partner Print Format** | Enter the print format. |
| **Business Partner Occupation** | Enter the occupation/group. |
| **Bus Part Marital Status** | Enter the marital status of the business partner. |
| **Bus Part Nationality** | Enter the nationality of the business partner. |
| **Business Partner Birth Name** | Enter the birth name. |
| **Business Partner Supplement Name** | Enter any supplementary names. |
| **Natural Person Employer Name** | Enter the name of the employer of a natural person. |
| **Last Name Prefix** | Enter any last name prefix. |
| **Last Name Second Prefix** | Enter any last name second prefix. |
| **Initials** | Enter the personal initials. |
| **Trading Partner** | Enter the company ID of the trading partner. |
| **Bu Pa Identification** | Add additional business partner identification. |
| **Bu Pa Industry** | Add any additional business partner industry information. |
| **Business Partner Address** | Add any additional business partner address information. |
| **Business Partner Bank** | Add any additional business partner bank information. |
| **Business Partner Contact** | Add any additional business partner contact information. |
| **Business Partner Role** | Add any additional business partner role information. |
| **Business Partner Tax** | Add any additional business partner tax information. |
| **Customer** | Add any additional customer information. |
| **Supplier** | Add any additional supplier information. |

[### Get a Business Partner](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853715430_body)

Retrieves the details of a business partner by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Business Partner** | Enter the ID number of the business partner your want to retrieve. |
| **Expand** | Select the type of business partner you want to retrieve. |

[### Update a Business Partner](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853717198_body)

Updates a business partner by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Business Partner** | Enter the business partner number. |
| **Academic Title** | Enter the academic title. |
| **Authorization Group** | Enter the authorization group.  **Note**  Authorization groups are used to stipulate which business partners a user is allowed to process. |
| **Business Partner Category** | Enter the type of business partner (person/organization/group. |
| **Business Partner Grouping** | Enter the business partner classification. |
| **Correspondence Language** | Enter the desired language. |
| **First Name** | Enter the first name of the business partner. |
| **Form Of Address** | Enter the form of address. |
| **Industry** | Enter the industry sector. |
| **International Location Number 1** | Enter the first international location number. |
| **International Location Number 2** | Enter the second international location number. |
| **Is Female** | Select whether the business partner is female. |
| **Is Male** | Select whether the business partner is male. |
| **Is Natural Person** | Enter whether the business partner is a natural person.  **Note**  Distinctions between natural and legal persons are for tax reporting. |
| **Is Sex Unknown** | Select whether the business partner's sex is unknown. |
| **Gender Code Name** | Enter the gender code of the business partner. |
| **Language** | Enter the language for verbal communication with a business partner. |
| **Last Name** | Enter the last name of the business partner. |
| **Legal Form** | Enter the legal form of the organization.  **Note**  Denotes certain legal norms that are of significance for the organization of a company. |
| **Organization BP Name 1** | Enter the first name of the business partner's organization. |
| **Organization BP Name 2** | Enter the second name of the business partner's organization. |
| **Organization BP Name 3** | Enter the third name of the business partner's organization. |
| **Organization BP Name 4** | Enter the fourth name of the business partner's organization. |
| **Organization Foundation Date** | Enter the date the organization was founded. |
| **Organization Liquidation Date** | Enter the date the organization was liquidated. |
| **Search Term 1** | Enter the first search terms for the business partner.  **Note**  Denotes the term that you define for a business partner, and via which you can restrict the search for a business partner. |
| **Search Term 2** | Enter the second search terms for the business partner. |
| **Additional Last Name** | Enter the other last name of the business partner. |
| **Birth Date** | Enter the birth date of the business partner. |
| **Business Partner Birthplace Name** | Enter the birthplace of the business partner. |
| **Business Partner Death Date** | Enter the death date of the business partner. |
| **Business Partner Is Blocked** | Select whether the business partner is blocked.  **Note**  If the business partner is blocked centrally, certain activities cannot be executed. |
| **Business Partner Type** | Enter the type of business partner. |
| **Group Business Partner Name 1** | Enter the first name for business partners in the group category. |
| **Group Business Partner Name 2** | Enter the second name for business partners in the group category. |
| **International Location Number** | Enter the international location number. |
| **Middle Name** | Enter the middle name of the business partner. |
| **Name Country** | Enter the country for the name format rule. |
| **Name Format** | Enter the name format. |
| **Person Full Name** | Enter the complete name of the person. |
| **Is Marked For Archiving** | Select whether the business partner is meant to be archived. |
| **Business Partner ID By Ext System** | Enter the business partner number in the external system. |
| **Business Partner Print Format** | Enter the print format. |
| **Business Partner Occupation** | Enter the occupation/group. |
| **Bus Part Marital Status** | Enter the marital status of the business partner. |
| **Bus Part Nationality** | Enter the nationality of the business partner. |
| **Business Partner Birth Name** | Enter the birth name. |
| **Business Partner Supplement Name** | Enter any supplementary names. |
| **Natural Person Employer Name** | Enter the name of the employer of a natural person. |
| **Last Name Prefix** | Enter any last name prefix. |
| **Last Name Second Prefix** | Enter any last name second prefix. |
| **Initials** | Enter the personal initials. |
| **Trading Partner** | Enter the company ID of the trading partner. |

[## Credit Memo Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-acdf762b-0c78-9eb3-9b94-268ffeef592b_body)

[### Watch Credit Memo Requests](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4580455997580832998539277042_body)

Triggers when a credit memo request is created.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Expand** | Select the type of credit memo request you want to watch for. |
| **Limit** | Enter the maximum number of credit memo requests Celonis platform returns during one Action Flow execution cycle. |

[### Search Credit Memo Requests](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853975202_body)

Retrieves a list of credit memo requests filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Expand** | Select the type of credit memo request you want to search for. |
| **Limit** | Enter the maximum number of credit memo requests Celonis platform returns during one Action Flow execution cycle. |

[### Get a Credit Memo Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853976936_body)

Retrieves the details of a credit memo request by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Credit Memo Request** | Enter the ID number of the credit memo request your want to retrieve. |
| **Expand** | Select the type of credit memo request you want to retrieve. |

[### Create a Credit Memo Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853978804_body)

Creates a new credit memo request.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Credit Memo Request** | Enter the ID number of the credit memo request your want to create. |
| **Credit Memo Request Type** | Enter the type of credit memo request. |
| **Sales Organization** | Enter the sales organization. |
| **Distribution Channel** | Enter the distribution channel. Typical examples of distribution channels are `wholesale`, `retail`, or `direct sales`. |
| **Organization Division** | Enter the organization division. |
| **Sales Group** | Enter the group of sales people responsible for tyhe credit memo request. |
| **Sales Office** | Enter the sales office. |
| **Sales District** | Enter the sales district or region. |
| **Sold To Party** | Enter the customer who orders the goods or services. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document (for example, a sales inquiry or a purchase order). |
| **Customer Purchase Order Type** | Enter the way in which the sales order arrives from the customer, for example, by telephone or e-mail. |
| **Customer Purchase Order Date** | Enter the reference date that is shown on the customer's purchase order. This date can be, for example, the date on which the customer created the purchase order. |
| **Credit Memo Request Date** | Enter the date on which you want the credit memo request to become effective for sales management purposes. |
| **Transaction Currency** | Enter the currency that applies to the credit memo request. |
| **SD Document Reason** | Enter the reason for creating the credit memo request. |
| **Pricing Date** | Enter the date that determines date-related pricing elements, such as conditions and foreign exchange rate. |
| **Customer Tax Classification 1** | Enter the alternative tax classification which indicates whether the system takes account of customer-specific taxes for pricing (such as value-added tax). |
| **Customer Tax Classification 2** | Enter an additional tax classification. |
| **Customer Tax Classification 3** | Enter an additional tax classification. |
| **Customer Tax Classification 4** | Enter an additional tax classification. |
| **Customer Tax Classification 5** | Enter an additional tax classification. |
| **Customer Tax Classification 6** | Enter an additional tax classification. |
| **Customer Tax Classification 7** | Enter an additional tax classification. |
| **Customer Tax Classification 8** | Enter an additional tax classification. |
| **Customer Tax Classification 9** | Enter an additional tax classification. |
| **Customer Account Assignment Group** | Enter the account assignment group to which the system automatically posts the sales document. |
| **Header Billing Block Reason** | Indicate if the entire sales document is blocked for billing. |
| **Incoterms Classification** | Enter any commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Entet the transfer location for the primary Incoterms. |
| **Incoterms Location 1** | Enter additional information for the primary Incoterm. |
| **Incoterms Location 2** | Enter any additional information for the Incoterms. |
| **Incoterms Version** | Enter the edition containing a list of international terms for transportation that is defined by the International Chamber of Commerce (ICC). |
| **Customer Payment Terms** | Enter the key for defining payment terms composed of cash discount percentages and payment periods. |
| **Payment Method** | Specify how an item is to be paid. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Services Rendered Date** | Enter the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the material. |
| **Reference SD Document** | Specify the document to which the credit memo request refers (a preceding document, such as a sales order).  **Note**  For more information, see [Create Credit Memo Requests with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/f65dcf1062974e039ba4e6f8ac55fdc8.html?). |
| **Item** | Add an item. |
| **Partner** | Add a partner. |
| **Pricing Element** | Add a pricing element. |
| **Text** | Add any additional text. |

[### Update a Credit Memo Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853981018_body)

Updates a credit memo request by the credit memo request number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Credit Memo Request** | Enter the ID number of the credit memo request your want to create. |
| **Credit Memo Request Type** | Enter the type of credit memo request. |
| **Sales Organization** | Enter the sales organization. |
| **Distribution Channel** | Enter the distribution channel. Typical examples of distribution channels are `wholesale`, `retail`, or `direct sales`. |
| **Organization Division** | Enter the organization division. |
| **Sales Group** | Enter the group of sales people responsible for tyhe credit memo request. |
| **Sales Office** | Enter the sales office. |
| **Sales District** | Enter the sales district or region. |
| **Sold To Party** | Enter the customer who orders the goods or services. |
| **Purchase Order By Customer** | Enter the customer reference number that the customer uses to uniquely identify a purchasing document (for example, a sales inquiry or a purchase order). |
| **Customer Purchase Order Type** | Enter the way in which the sales order arrives from the customer, for example, by telephone or e-mail. |
| **Customer Purchase Order Date** | Enter the reference date that is shown on the customer's purchase order. This date can be, for example, the date on which the customer created the purchase order. |
| **Credit Memo Request Date** | Enter the date on which you want the credit memo request to become effective for sales management purposes. |
| **Transaction Currency** | Enter the currency that applies to the credit memo request. |
| **SD Document Reason** | Enter the reason for creating the credit memo request. |
| **Pricing Date** | Enter the date that determines date-related pricing elements, such as conditions and foreign exchange rate. |
| **Customer Tax Classification 1** | Enter the alternative tax classification which indicates whether the system takes account of customer-specific taxes for pricing (such as value-added tax). |
| **Customer Tax Classification 2** | Enter an additional tax classification. |
| **Customer Tax Classification 3** | Enter an additional tax classification. |
| **Customer Tax Classification 4** | Enter an additional tax classification. |
| **Customer Tax Classification 5** | Enter an additional tax classification. |
| **Customer Tax Classification 6** | Enter an additional tax classification. |
| **Customer Tax Classification 7** | Enter an additional tax classification. |
| **Customer Tax Classification 8** | Enter an additional tax classification. |
| **Customer Tax Classification 9** | Enter an additional tax classification. |
| **Customer Account Assignment Group** | Enter the account assignment group to which the system automatically posts the sales document. |
| **Header Billing Block Reason** | Indicate if the entire sales document is blocked for billing. |
| **Incoterms Classification** | Enter any commonly used trading terms that comply with the standards established by the International Chamber of Commerce (ICC). |
| **Incoterms Transfer Location** | Entet the transfer location for the primary Incoterms. |
| **Incoterms Location 1** | Enter additional information for the primary Incoterm. |
| **Incoterms Location 2** | Enter any additional information for the Incoterms. |
| **Incoterms Version** | Enter the edition containing a list of international terms for transportation that is defined by the International Chamber of Commerce (ICC). |
| **Customer Payment Terms** | Enter the key for defining payment terms composed of cash discount percentages and payment periods. |
| **Payment Method** | Specify how an item is to be paid. |
| **Billing Document Date** | Enter the date on which billing and booking for accounting purposes takes place. |
| **Services Rendered Date** | Enter the date of services rendered that determines when the system calculates taxes (for example, sales tax) for the material. |
| **Reference SD Document** | Specify the document to which the credit memo request refers (a preceding document, such as a sales order).  **Note**  For more information, see [Create Credit Memo Requests with Reference](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/19d48293097f4a2589433856b034dfa5/f65dcf1062974e039ba4e6f8ac55fdc8.html?). |

[### Delete a Credit Memo Request](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299853983896_body)

Deletes a credit memo request by the credit memo request number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Credit Memo Request** | Enter the ID number of the credit memo request your want to delete. |

[## Other fields](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-f1446c9e-b0e3-9b66-cd20-0465d77f8658_body)

[### Search Entities](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm4482770377163232998542648052_body)

Retrieves a list of entities filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Service** | Enter the desired service. For example, `API_BUSINESS_PARTNER`.  **Note**  You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). |
| **Entity Type** | Select the type of entity you want to search for. |
| **Type of Filter** | Select the type of filter you want to use. The **Simple filter** allows you to select filters from a list. You can also build your own **Custom filter** using the [OData syntax](https://www.odata.org/documentation/odata-version-2-0/uri-conventions/). |
| **Order By** | Select how you want to order the results.  - By a specific property - Ascending or descending |
| **Limit** | Enter the maximum number of entities Celonis platform returns during one Action Flow execution cycle. |

[### Create an Entity](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299854313160_body)

Creates a new entity.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Service** | Enter the desired service. For example, `API_BUSINESS_PARTNER`.  **Note**  You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). |
| **Entity Type** | Select the type of entity you want to create. Enter the details in the fields that auto-populates based on your selection.  **Note**  For more information on the different entities and their respective fields, please see the SAP S/4HANA ODATA v2 API [here](https://api.sap.com/products/SAPS4HANA/apis/ODATA). |

[### Get an Entity](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299854315378_body)

Retrieves an entity by its key(s).

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Service** | Enter the desired service. For example, `API_BUSINESS_PARTNER`.  **Note**  You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). |
| **Entity Type** | Select the type of entity you want to retrieve. Enter the necessary ID keys in the fields that auto-populates based on your selection.  **Note**  For more information on the different entities and their respective fields, please see the SAP S/4HANA ODATA v2 API [here](https://api.sap.com/products/SAPS4HANA/apis/ODATA). |

[### Update an Entity](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299854317566_body)

Updates an entity by its key(s).

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Service** | Enter the desired service. For example, `API_BUSINESS_PARTNER`.  **Note**  You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). |
| **Entity Type** | Select the type of entity you want to update. Enter the necessary ID keys in the fields that auto-populates based on your selection.  **Note**  For more information on the different entities and their respective fields, please see the SAP S/4HANA ODATA v2 API [here](https://api.sap.com/products/SAPS4HANA/apis/ODATA). |

[### Delete an Entity](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299854319788_body)

Deletes an entity by its key(s).

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **Service** | Enter the desired service. For example, `API_BUSINESS_PARTNER`.  **Note**  You can browse all SAP S/4HANA ODATA v2 API [here](https://api.sap.com/package/S4HANAOPAPI/odata). |
| **Entity Type** | Select the type of entity you want to delete. Enter the necessary ID keys in the fields that auto-populates based on your selection.  **Note**  For more information on the different entities and their respective fields, please see the SAP S/4HANA ODATA v2 API [here](https://api.sap.com/products/SAPS4HANA/apis/ODATA). |

[### Make an API Call](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_section-idm183299854326596_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SAP S/4HANA account](sap-s-4hana-public-cloud--action-flow-.html#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-1d5a5b16-b843-7bb3-9e30-ba95267e2a9c "Connecting SAP S/4HANA to Celonis platform"). |
| **URL** | Enter a path relative to your host URL and service. For example, `/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice`.  **Note**  For the list of available endpoints, refer to the [SAP S/4HANA ODATA v2 API Developer Guide](https://api.sap.com/products/SAPS4HANA/apis/ODATA). |
| **Method** | Select the HTTP method you want to use:  `GET`: retrieve information for an entry.  `POST`: to create a new entry.  `PUT`: to update/replace an existing entry.  `PATCH`: make a partial entry update.  `DELETE`: delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[### Example of Use - List Supplier Invoices](#UUID-e7eb6dac-dfd9-329a-a0dd-6400ecb83973_UUID-497f713f-a857-8366-7705-0cec1c640c9c_body)

The following API call returns a list of all supplier invoices in your account:

*URL*: `/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice`

*Method*: `GET`

Matches of the search can be found in the module's **Output** under *Bundle* > *Body*. Our example returned 55 results:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/scheduling-action-flow-for-a-specific-time-in-a-specific-timezone

# Scheduling Action Flow for a specific time in a specific timezone

All Action Flows scheduling uses the UTC+00 timezone as default. This timezone is not affected by daylight saving time (DST). If you wish to schedule your automation to a different time zone, for instance, one that follows DST, you can do it by using the Set variable tool in your Action Flow.

Expand all

[## Scheduling your Action Flows](#UUID-941d4780-ed41-6595-2927-514d0e4a4a48_section-id235502865592068_body)

To schedule your Action Flows for a specific time in a specific timezone:

1. Go to Studio, and select your package.
2. Click Action Flow for which you want to set scheduling.
3. Click **Edit**.
4. At the beginning of your automation, add a new module called Set variable.

   |  |
   | --- |
   |  |
5. Connect the new module to the rest of your automation.
6. In the module settings:

   1. Give your variable a name.
   2. As the variable value, set `formatDate`.
   3. Use the `now` variable in the format date and set your desired format date and time zone.

      |  |
      | --- |
      |  |
7. Create a filter between the set variable module and the rest of the automation:

   1. Click the wrench icon on the connection line between the first two modules.
   2. Click **Set up a filter**.
   3. As condition, enter the variable you set in the Set variable module.
   4. In the text operator field, enter the time at which you wan to run your automation.

      |  |
      | --- |
      |  |
8. Save your changes and publish your Action Flow.

   Your Action Flow will now run according your selected schedule in the time zone you entered in the Set variable module.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/scheduling-action-flows

# Scheduling Action Flows

In the Celonis Platform, Action Flows are automated workflows that connect your process insights to real-world actions. While Celonis identifies inefficiencies (like late payments or stockouts), Action Flows are the "engines" that fix them by communicating with third-party systems like SAP, Salesforce, or ServiceNow.

Scheduling is the heartbeat of these flows; it determines whether an automation runs the moment data changes, at a specific time every morning, or only when you manually trigger it.

Expand all

[## Scheduling your Action Flows](#UUID-6b0dd5e5-0c7f-34b4-f082-7297345338b2_section-id235502857908106_body)

To schedule your Action Flows:

1. In Studio, click Action Flow for which you want to set scheduling.

   Make sure Action Flow is published.
2. When opened, click the Action Flow to view it.

   |  |
   | --- |
   |  |
3. Click the clock image in the first module in your automation.

   |  |
   | --- |
   |  |

   You can select from the following scheduling options:

   - **On demand** - Action Flows are run manually.
   - **Automatic**: Action Flows are run according to a preset schedule. You can select the following automatic scheduling options:

     **Important**

     All Action Flow scheduling is based on UTC +0 time zone.

     - **At regular intervals** - set the time intervals (in minutes) at which your Action Flow will be executed.
     - **Every day** - run Action Flow daily at a set time.
     - **Days of the week** - select days of the week and the time when Action Flow is run.
     - **Days of the month** - select days of the month and the time when Action Flow is run.
     - **Specified dates** - select the month, day, and time when Action Flow is run.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/scheduling-action-flows-after-data-job-completion

# Scheduling Action Flows after data job completion

You can schedule your Action Flow to be executed when a selected data job is completed. To do so, you must create a dynamic view in the data model. This dynamic view will populate the date\_parameter setting when a given job is completed, which can be used as a trigger an Action Flow execution.

Expand all

[## Scheduling your Action Flows after data job completion](#UUID-85e62d3d-81bf-4405-5acf-5a24b084915e_section-id235502861276712_body)

To schedule your Action Flows:

1. In Celonis Platform, go to **Data** > **Data Integration** and create your Data Pool and your first data job. See [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools").
2. In your newly created data job, go to transformations, and add the following SQL code:

   ```
   DROP VIEW IF EXISTS
   DATE_PARAMETERS;
   CREATE VIEW DATE_PARAMETERS
   AS (
   SELECT
   NOW() AS TODAY
   );
   ```

   This parameter is used to used in the view to create a dynamic view in the data model. When a data job is completed, the `DATE_PARAMETERS` is populated, creating a single column and a single record.
3. Use the newly created column as a trigger for an Action Flow. For more information, see [Triggers](triggers.html "Triggers").
4. Add your trigger to the Action Flow to schedule its execution once the data job is finished.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/security-details-for-action-flows-and-third-party-applications

# Security details for Action Flows and third party applications

Action Flows are a low code, API-based integration platform in the Celonis Platform (Celonis Platform) which customers can use to automate their tasks and business processes. Action Flows integrate with Celonis data and intelligence, support 10,000+ out-of-the-box actions across 1,000+ systems (cloud, on-prem, custom), and provide a no-code user interface for configuration. This document describes core concepts and principles utilized throughout Action Flows and within those third party applications to apply and adhere to best practice industry security standards.

Expand all

[## Authentication and authorization to third party applications](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4562675628736033150583704213_body)

Action Flows predominantly interact with third-party applications through Application Programming Interfaces (APIs) that are created, maintained, and enhanced by those services. While each API is different, the vast majority of these APIs are based upon industry standard protocols and architectural patterns such as Restful or SOAP-based communication over HTTPS.

For Action Flows to work securely with any given third party application, Action Flows must adhere to the authentication and authorization principles implemented within the API of the third party application. This ensures that each call to that third party API is capable of pulling or pushing information in a secure and auditable manner.

While there are many different technical methods for authentication and authorization in use by many different third party applications, Action Flows most commonly leverage the widely-accepted, industry standard [OAuth 2.0 authorization framework](https://datatracker.ietf.org/doc/html/rfc6749). This framework is widely adopted among the most security-conscious, enterprise-grade, web-based applications including those created and maintained by Google, Microsoft, Salesforce, and Adobe. This protocol provides methods by which users within Action Flows can authorize Celonis Platform to interact with a third party application on the user’s behalf and allows that user to maintain control over the authorization. In the context of this framework, Celonis Platform is operating as the “client” and any third party application connected to the Action Flows is operating as the “authorization server” or “resource server”.

[## Typical OAuth 2.0 Flow in the Action Flows](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4562675624464033150595626893_body)

When a user within Action Flows in Celonis Platform first wants to connect to a third party application that uses an OAuth 2.0 Authorization Code flow, the following steps are taken by the user, the third party application, and Action Flows as a part of the Celonis Platform platform.

1. User authenticates to the Celonis Platform platform.

   1. Additional authentication mechanisms such as two-factor authentication may be employed to verify the identity of the user within Celonis Platform.
2. Based upon the user’s permissions within Celonis Platform, they may be able to access the Celonis Platform Studio and create a new connection to a third party application within a particular package within the Action Flow designer.
3. While creating a new connection to a third party application, the user is directed to the third party application’s authentication page wherein they must provide valid credentials to access the third party application. Users may use a service account or a personal account during authentication based upon their business and technical requirements. For additional details, see [Account Types](security-details-for-action-flows-and-third-party-applications.html#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4652215780947233150814406256 "Account types").

   1. All enhanced authentication mechanisms required by the third party application are also required here, including two-factor authentication.

      **Note**

      At no point in time during this flow does the user enter credentials for the third party application into Celonis Platform Action Flows. This is one of the major advantages of this framework and it enables Celonis Platform to never store usernames or passwords for those third party applications.
4. Once authenticated to the third party application, the user is presented with an authorization prompt by the third party application. The prompt requests the user to confirm or reject authorization for Celonis Platform to interact with the service on their behalf. Most third party applications will also specify a set of specific permissions that can be given to Celonis Platform with this authorization. These permissions are known as “scopes” and can limit what Celonis Platform can do on behalf of the user within the third party application. For more details, see [Scopes and Permissions](security-details-for-action-flows-and-third-party-applications.html#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4543961616940833150815673606 "Scopes and Permissions").

   **Note**

   Some third party applications may require additional approval steps by internal IT teams before end-users can authorize Celonis Platform to operate on their behalf. These approval steps will differ for each third party application and deployment within an enterprise. For more details, see [Common IT Approval Processes](security-details-for-action-flows-and-third-party-applications.html#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4559438027702433150816333059 "Common IT Approval Processes").
5. Once a user confirms that they would like to authorize Celonis Platform to interact with the third party application on their behalf, they are returned to the Action Flows interface wherein they can continue to configure the ways in which they wish to automate or integrate the third party application.
6. During this process, Action Flows and the third party application exchange a set of identifiers, secrets, codes, and tokens according to the OAuth 2.0 framework and the third party application’s specific implementation of the framework.

   1. Importantly, this framework leverages mechanisms by which access tokens (secret strings that enable authorized API calls) routinely expire according to best practice security principles. When an access token is about to or has expired, Action Flows have built-in mechanisms to automatically refresh these tokens according to the OAuth 2.0 framework and the third party application’s implementation.
   2. All tokens stored in Action Flows are stored encrypted per object with AES256 and hashed with PBKDF2-SHA512 algorithm.

[## Click here to see some applications in Action Flows that use an OAuth 2.0 Authorization Flow](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4536370541568033150803675047_body)

|  |  |  |
| --- | --- | --- |
| - Cisco Webex - Dropbox - Github - Google Calendar - Google Contacts - Google Docs - Google Drive - Google Sheets - Google Slides - Google Tasks | - GoToMeeting - Gmail - HTTP - Microsoft 365 Calendar - Microsoft 365 Email - Microsoft 365 Excel - Microsoft 365 People - Microsoft 365 Planner - Microsoft Power BI - Microsoft 365 Planner | - Microsoft Power BI - Microsoft OneDrive - Microsoft Sharepoint - Microsoft Teams - Microsoft To-Do - Salesforce - Slack - Smartsheet - Zoom |

[## Encryption](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4543961602908833150812336953_body)

Action Flows utilize encryption of data at rest and in transit to protect its confidentiality.

**Data at Transit**

Data sent between client browser and the Celonis Platform platform are always encrypted. The Action Flows solution supports TLS1.2, TLS1.3 for encrypted transfer.

Data sent between Action Flows and third party application depends on which protocols the third party application supports. Action Flows will always negotiate the most secure approach available by the application.

**Data at Rest**

All data at rest is encrypted at the file system level by AES256. Sensitive data like user credentials are encrypted in the database per object by additional AES256. Passwords and tokens are also hashed using PBKDF2-SHA512 with 200k iterations. Cryptographic keys are managed using the key management system of the underlying cloud provider.

[## Account types](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4652215780947233150814406256_body)

Virtually all third party applications require the ability to identify a specific user associated with each interaction within the application or through its API. Users may authenticate with a 3rd party application using either a service account or a personal account. Both account types are common within enterprise integration patterns and either may be used within the Action Flows, depending on the desired use case and security requirements.

**Service Accounts**

Administrators of third party applications will commonly create service accounts that represent another application or process, instead of a human being, in order to provide the appropriate security context. Credentials for such an account may be stored and managed by a select group of people, rather than being maintained privately by only one person. All actions done by a service account (for example, accessing, editing or creating a record in a third party application) can only be attributed to that service account and anyone who had access to the account. For example, a large corporation may opt to create a special email account “corp\_support@acme.com” with a password shared by multiple people.

**Personal Accounts**

Personal accounts are simply a set of credentials used by an individual person and that person only. They provide the appropriate security context for that user and actions done by the account can be attributed only to that user under normal circumstances. For example, most companies provide a personal account for each employee for managing their own email.

[## Scopes and Permissions](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4543961616940833150815673606_body)

When Celonis Platform is interacting with a third party application through an authorized user consent, Action Flows are operating within the same security context as that user. As such, Celonis Platform is unable to perform any actions (read, create, delete) in the third party application that the user is not authorized to perform. At a minimum, the same permission restrictions that are enforced when the user logs into the third party application are enforced by the application’s API.

In addition to the general boundaries that are constrained by the user context, many third party applications also employ scopes to further restrict what Celonis Platform is authorized to do on the user’s behalf within the third party application. A scope typically represents some specific capability to access data or perform some action such as the ability to read emails or the ability to send emails. Each third party application is able to define and utilize the available scopes according to their own needs. For more information on scopes, see [the Datatracker documentation](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3).

Action Flows’ apps that interact with third party applications that employ the OAuth 2.0 authorization framework and scopes, are designed to request the minimally required scopes in order to perform the desired action within the third party application. This concept is known as the principle of least privilege (PoLP) within application security best practices.

If a user later requests to perform additional actions within the third party application through Action Flows, then Action Flows will automatically direct the user to authorize the expanded scope(s), as required. This process is known as incremental authorization and ensures that users are given maximum control to determine which actions Celonis Platform can perform on their behalf, without extending permissions beyond what is necessary.

[## Common IT Approval Processes](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4559438027702433150816333059_body)

Different third party applications deployed within an enterprise environment may require additional processes to be followed in order to enable an end-user to grant Celonis Platform to operate on their behalf.

As a common example, apps that are managed within an enterprise deployment of Microsoft Azure may require an administrator's consent in addition to the end-user’s consent. Microsoft Azure administrators may configure consent policies such that a specific app (within Action Flows) does not require any admin consent, requires admin consent through defined approval workflows, or is restricted entirely from use. For more details, see [Microsoft](https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/configure-user-consent?tabs=azure-portal) documenation. Optionaly, Microsoft Azure administrators may also choose to create their own application to be used with Celonis Platform with their own designated permissions

[## Bespoke Client Identification and Registration (Advanced)](#UUID-72f246bb-cf63-514d-bc7c-90958ba74060_section-idm4559437756016033150820011366_body)

When Action Flows initiate an authorization flow with a third party application, it sends important details to the third party application that uniquely identify Celonis Platform as the solution that the end-user wishes to authorize to act on their behalf.  These details include a client identifier and a client secret.  In order to support these common authorization flows, the Celonis team has registered the Celonis Platform solution with each OAuth 2.0-based third party application.  During this registration process, the Celonis team previously provided details about the Celonis Platform Action Flows solution, including security and privacy details, for review by the third party application. For more information on client registration, see [the Datatracker documentation.](https://datatracker.ietf.org/doc/html/rfc6749#section-2)

This process enables authorized users of the Celonis Platform platform to quickly and securely authorize Celonis Platform to interact with the third party solution on their behalf.  However, some advanced users or security teams with strict controls may wish to create and register their own client with some third party applications.  Doing so can enable those users to provide even more restrictions placed on the authorization and independently manage advanced concepts such as API rate limits for interactions with the third party application.  The specific capabilities and benefits of registering and managing your own client application with the third party application vary with each third party application provider.

Examples of third party application client registration processes include:

- Google Workspace (Drive, Calendar, Gmail, etc.); see [Setting up OAuth 2.0](https://support.google.com/cloud/answer/6158849?hl=en)
- Microsoft services that use Microsoft Identity Platform (Teams, 365 Calendar, 365 Email, etc.); see [Register an Application with Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- Salesforce; see [Create a Connected App](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm&type=5)

Once a new client registration has been completed, Action Flows’ users can click on “Advanced” settings while creating a new connection and enter their own client ID and secret rather than using the default client ID and secret.


---

## automation/action-flows/sendgrid--action-flow-

# SendGrid (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Expand all

[## Before you begin](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-c514c565-6ea6-308d-a382-e3e0614b4fb3_body)

To use any of the modules, you need to connect your SendGrid account to Celonis platform. If you do not have a SendGrid account yet, you can create one at [SendGrid.com](https://signup.sendgrid.com/)

[## Connecting SendGrid to Celonis platform](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2_body)

To connect your SendGrid account to Celonis platform, follow the general instructions for connecting to any web service. When creating a Action Flow, you will be asked to provide an **API Key**. To get your API Key, [log in to your SendGrid account](https://app.sendgrid.com/login) and follow the instructions below.

1. Go to *Settings* in the menu on the left, and open the *API Keys* dialog.
2. Click on the *Create API Key* button in the top-right corner.
3. Create the API Key with Full Access permissions.
4. Copy the API Key to the clipboard and save it somewhere else.
5. Paste the API Key to the *API Key* field in the *Create a connection* dialog of the desired module and click the *Continue* button.
6. The connection is now established. You can continue creating your Action Flow.

[## Contacts (New)](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-d5fa7bf9-f92f-3021-8bc8-d4363c1aa5c0_body)

### Watch Contacts (New)

Returns contact details when a new contact is created or an existing contact is updated.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Watch** | **Create + Update**  Triggers when a contact is created or update.  **Create**  Triggers when a contact is created. |
| **Limit** | Set the maximum number of contacts Celonis platform will return during one execution cycle. |

### Create a List (New)

Creates a new contact list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Name** | Enter the name for your new list. |

### Add or Update a Contact (New)

This module adds or updates a contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List** | Select the lists you want to add the contact to. |
| **Email address** | Enter the email address of the new contact or the contact you want to update.  **Caution**  If the contact with the entered email address is found, it will be updated. |
| **First name** | Enter the new/updated recipient's first name. |
| **Last name** | Enter the new/updated recipient's last name. |
| **Alternate Emails** | Add at most 5 additional email addresses. |
| **Address Line 1** | Enter the first lines of the address. |
| **Address Line 2** | Enter the second, optional, line of the address. |
| **City** | Enter the city of the contact. |
| **State Province Region** | Enter the state, province, or region of the contact's address. |
| **Postal code** | Enter the postal code, Eircode, PIN code or ZIP code of the contact's address. |
| **Country** | Enter the country of the contacts address. It can be full name or abbreviation. |
| **Phone number** | Enter the contact's phone number. |
| **Whatsapp** | Enter a Whatsapp account of the contact. |
| **Line** | Enter the landline phone number. |
| **Facebook** | Enter the contact's Facebook address. |
| **Unique Name** | Enter the unique name for the contact. |
| **Contact ID** | Enter or select the contact whose email you want to update. |

### Get All Lists (New)

The module retrieves all of your contact lists.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Number of lists** | Set the number of returned contact lists. |

### Get All Contacts (New)

Retrieves all of your marketing campaigns' contacts.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Number of contacts to return** | Set the number of returned contacts. |

### Delete a List (New)

Deletes the list and optionally also deletes contacts associated with the list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Map or select the list you want to delete. |
| **Delete Contacts** | Enable this option to also delete the contacts that are in the list you want to delete. |

### Delete Contacts (New)

Deletes specified contacts or all contacts at once.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Delete all or Specific contacts** | Select whether you want to specify the contact(s) to be deleted or delete all contacts. |
| **Contact IDs** | Add (and map) IDs of contacts you want to delete. |
| **Delete All Contacts** | Enable this option to delete all contacts. |

### Remove Contacts from a List (New)

Removes contacts from the specified list. It does **not** delete the contact.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Map or select the list you want to remove the contact(s) from. |
| **Contact IDs** | Add the IDs of contacts you want to remove from the list. |

[## Contacts (Legacy)](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-a72c9203-d97a-4754-1f29-c04016eeae3b_body)

**Note**

**Legacy** modules are for users, who started to use these SendGrid modules before July 2019. Legacy modules do not work for new users as they don't have the required scopes within the API key.

### Watch New Lists (Legacy)

When a new list is created, the *List ID*, *Name*, and *Recipient Count* are returned.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Limit** | Set the maximum number of lists Celonis platform will work with during one execution cycle. |

### Watch New Recipients (Legacy)

Retrieves contact details when a new contact is created in the selected list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Select the list you want to watch for new recipients. |
| **Limit** | Set the maximum number of lists Celonis platform will work with during one execution cycle. |

### Create a List (Legacy)

This module allows you to create a list for your contacts.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Name** | Enter the name for your new list. |

### Add or Update Recipient (Legacy)

This module adds or updates a *Marketing Campaign's* contact.

The rate limit is three requests every 2 seconds. You can upload 1000 contacts per request. So the maximum upload rate is 1500 recipients per second.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Email address** | Enter the email address of the new contact or the contact you want to update.  If the contact with the entered email address is found, it will be updated. |
| **First name** | Enter the new/updated recipient's first name. |
| **Last name** | Enter the new/updated recipient's last name. |

### Add Recipients to a List (Legacy)

Adds a contact to a list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Enter (select from the drop-down menu or map) the ID of the list you want to add the contact to. The List ID can be retrieved, for example, using the *Get All Lists* search module. |
| **Recipients** | Add (select from the drop-down menu or map) the contacts you want to add to the list. The Recipient ID can be retrieved, for example, using the *Get All Recipients* search module. |

### Get All Lists (Legacy)

The module retrieves all of your contact lists.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Number of lists** | Set the number of returned contact lists. |

### Get All Recipients (Legacy)

Retrieves all of your marketing campaigns' contacts.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Select the list you want to retrieve recipients from. |
| **Number of recipients** | Set the number of returned contacts. |

### Delete a List (Legacy)

Deletes a contact list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Lists** | Add the IDs of the list(s) you want to delete. The List ID can be retrieved, for example, using the *Get All Lists* search module. |

### Delete Recipients (Legacy)

This module allows you to delete one or more recipients.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Recipients** | Select the recipient you want to delete. |

### Delete Recipients from a List (Legacy)

Deletes recipient from a selected list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **List ID** | Select the list you want to delete the recipient from. |
| **Recipient ID** | Select the recipient or enter (map) the ID of the recipient you want to delete from the list. |

[## Bounces](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-def6c95d-d1d8-f7d8-5331-1f4faf56bc92_body)

[### Get All Bounces](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_get-all-bounces_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Start time** | Set the start of the time range when a bounce was created (inclusive). |
| **End time** | Set the end of the time range when a bounce was created (inclusive). |
| **Number of bounces** | Set the number of returned bounces. |

[### Delete Bounces](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_delete-bounces_body)

Removes a specific email address from your bounce list.

A bounced email is when the message is undeliverable and then returned to the server that sent it.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Emails** | Add the emails you want to remove from the *Bounces* list. |

[### Delete All Bounces](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_delete-all-bounces_body)

Deletes all email addresses from the bounce list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |

[## Blocks](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-201c1185-39e3-0c77-4043-4ca2478b666d_body)

There are several causes for blocked emails, for example: your mail server IP address is on an ISP block list or blocked by an ISP, or if the receiving server flags the message content.

### List Blocks

Retrieves all email addresses that are currently on your block list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Start Time** | Enter the start date and time of the range when a blocked email was created (inclusive). |
| **End Time** | Enter the end date and time of the range when a blocked email was created (inclusive). |
| **Number of blocked emails to return** | Set the maximum number of email addresses Celonis platform will return during one execution cycle. |

### Get a Block

Retrieves block details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Email address** | Enter the blocked email address you want to retrieve details about. |

### Delete Blocks

Removes all or specified emails from the block list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Delete All or Specific** | Select whether you want to delete all or specific emails.  If the *Delete Specific Emails* option is selected, specify email addresses you want to delete in the *Email address* field below. |

[## Global Suppressions](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-b9002cad-fbec-a695-cf11-6cd7bf9f6cdf_body)

[### List Global Suppressions](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_list-global-suppressions_body)

Returns all globally suppressed email addresses.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Start Time** | Enter the start date and time of the range when a suppressed email was created (inclusive). |
| **End Time** | Enter the end date and time of the range when a suppressed email was created (inclusive). |
| **Number of emails to return** | Set the maximum number of email addresses Celonis platform will return during one execution cycle. |

[### Get a Global Suppression](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_get-a-global-suppression_body)

Checks whether a specified email belongs to global suppressions.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Email** | Enter the email you want to check. |

[### Add Emails to Global Suppression](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_add-emails-to-global-suppression_body)

Adds email addresses to the global suppressions.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Recipient Emails** | Enter the emails you want to add to global unsubscribes. |

[### Delete a Global Suppression](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_delete-a-global-suppression_body)

Removes an email from global suppressions.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **Email** | Enter the email you want to delete from global unsubscribes. |

[## Other fields](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-50137de6-ab31-019c-1711-3961bb4de5d0_body)

[### Send an Email](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_send-an-email_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **From** | **Email Address**  Enter the email address of the sender.  **Name**  Enter the name of the sender. |
| **Send to** | Add recipient email addresses. The maximum number of email addresses is 1000. |
| **Use SendGrid Transactional template?** | Select whether you want to use the SendGrid template or not.  If you select *Yes,* the *Template ID* must be provided. You can retrieve the Template ID via SendGrid - Templates - Transactional. |
| **Map JSON or fill Keys and Values** | Enables you to enter data in the template dynamically.  Select whether you want to specify data using *JSON* or by entering *Key and Value* pairs. |
| **Dynamic Template Data** | Enter JSON or define key and value pairs.  For more information about specifying dynamic template data please refer to the [Using Handlebars](https://docs.sendgrid.com/for-developers/sending-email/using-handlebars#basic-replacement) documentation. |
| **Subject** | Enter the subject for the email. |
| **Content type** | Select the MIME type of the email content. |
| **Content** | Enter the content of the email you want to send. |
| **Attachments** | Add the file(s) you want to attach. For inline images enter the Content ID. |
| **Send at** | Enter the time and date when the email should be sent.  Scheduling more than 72 hours in advance is not allowed. |
| **Copy recipient** | Enter the copy recipient(s). CC - carbon copy. The maximum is 999 recipients. |
| **Blind copy recipient** | Enter the blind copy recipient(s). BCC - blind carbon copy. The maximum is 999 recipients. |
| **Reply To** | Enter the email address and name that will be used for the email reply. |
| **Headers** | Add custom headers if needed. |

[### Make an API Call](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_make-an-api-call_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SendGrid account.](sendgrid--action-flow-.html#UUID-660972b9-d6c8-4206-37fa-2338c8036592_UUID-60314541-9c60-97fd-1638-0fdbbd45dba2 "Connecting SendGrid to Celonis platform") |
| **URL** | Enter a path relative to `https://api.sendgrid.com/v3/`. E.g. `/marketing/contacts`  **Note**  For the list of available endpoints, refer to the [Sendgrid API Documentation](https://sendgrid.com/docs/api-reference/). |
| **Method** | Select the HTTP method you want to use:  - **GET:** to retrieve information for an entry. - **POST:** to create a new entry. - **PUT:** to update/replace an existing entry. - **PATCH:** to make a partial entry update. - **DELETE:** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[### Example of Use - List Contacts](#UUID-660972b9-d6c8-4206-37fa-2338c8036592_id_example-of-use---list-contacts_body)

The following API call returns all marketing contacts in your Sendgrid account:

**URL:**

`/marketing/contacts`

**Method:**

`GET`

Matches of the search can be found in the module's Output under Bundle > Body > result.

In our example, 3 contacts were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/servicenow--action-flow-

# ServiceNow (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With ServiceNow modules in Celonis platform, you can manage the records and create or assign tickets to your ServiceNow account.

**Note**

To use ServiceNow in Celonis platform, you must have the [Enterprise plan](https://www.make.com/en/pricing).

All Enterprise apps are currently labeled as **premium tier 3** in Celonis platform.

To get started with ServiceNow, create an account by contacting the sales team at [servicenow.com](https://www.servicenow.com/contact-us/sales.html).

For a list of endpoints, refer to the [ServiceNow API documentation](https://developer.servicenow.com/dev.do#!/reference/api/sandiego/rest/).

Expand all

[## Connecting ServiceNow to Celonis platform](#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_section-idm23463870221859_body)

Celonis platform provides two ways to connect the ServiceNow app:

- [ServiceNow](servicenow--action-flow-.html#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_id_connecting-servicenow-to-integromat "Establishing a ServiceNow connection to Celonis platform")
- [ServiceNow (OAuth)](servicenow--action-flow-.html#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_section-idm234642000240733 "Establishing a ServiceNow connection to Celonis platform with Client Credentials")

[## Establishing a ServiceNow connection to Celonis platform](#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_id_connecting-servicenow-to-integromat_body)

To connect the ServiceNow app with Celonis Platform:

1. Log in to your ServiceNow account.
2. Click **Profile** > **Change User Role**. Select **Admin** and click **Change User Role**.
3. Click **Manage instance password**.
4. Copy the details **Instance name**, **Instance URL**, **Username**, and **Password** to a safe place.
5. Log in to your Celonis platform and add a module from the ServiceNow into a Celonis platform Action Flow.
6. Click **Add** next to the **Connection** field.
7. Optional: In the **Connection name** field, enter a name for the connection.
8. In the **Sub-domain** field, enter the sub-domain from the instance URL copied in Step 4. For example, if the URL is `sampleinstance.service-now.com`, enter `sampleinstance` in the **Sub-domain** field without the trailing dot. Do not include the top-level domain (`.com`) or the second-level domain (`.service-now`).
9. In the **Username and Password** fields, enter the details copied in Step 4 and click **Save**.
10. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more ServiceNow modules.

[## Establishing a ServiceNow connection to Celonis platform with Client Credentials](#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_section-idm234642000240733_body)

To connect the ServiceNow app with Celonis Platform:

**Tip**

The Redirect URI for Celonis is: `https://auth.redirect.celonis.cloud/oauth/cb/servicenow2`

1. Log in to your ServiceNow instance using the credentials for an account with administrative privileges (`https://yourinstance.service-now.com`).
2. In the upper left, click **All** and search for **System OAuth** > **Application Registry**.
3. Click **New** and **Create an OAuth API endpoint for external clients**.
4. Fill in the required fields, leaving the **Client Secret** blank to allow ServiceNow to generate it automatically. Click **Submit** to save the configuration.

   |  |
   | --- |
   |  |
5. Reopen the newly created record to view the generated **Client ID** and **Client Secret**.
6. Copy the **Client ID** and **Client Secret** to a safe place.
7. Log in to your Celonis platform account, add a ServiceNow module to your Action Flow, and click **Create a connection**.
8. Optional: In the **Connection name** field, enter a name for the connection.
9. In the **Sub-domain** field, enter the sub-domain from your ServiceNow instance URL. For example, if your URL is `https://yourinstance.service-now.com`, the sub-domain is `yourinstance`.
10. In the **Client ID** and **Client Secret** fields, paste the credentials copied in step 6.
11. Click **Save**.
12. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more ServiceNow modules.

[## Building ServiceNow Action Flows](#UUID-2e49a9fd-2e50-f35e-821f-d9a7a2d6b913_section-idm4519792313185633658871315746_body)

After connecting the app, you can perform the following actions:

- **Watch Records**

  Triggers when a record is created or updated.
- **Search Records**

  Searches for records by a filter parameter.
- **Get a Record**

  Gets a specified record.
- **Create a Record**

  Creates a new record.
- **Update a Record**

  Updates an existing record.
- **Delete a Record**

  Deletes a record.
- **Create an Incident**

  Creates a new incident.
- **Assign a Ticket**

  Assigns an incident ticket.
- **Make an API Call**

  Performs an arbitrary authorized API call.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/setting-up-action-flows-in-studio

# Setting up Action Flows in Studio

Action Flows enrich the Celonis Platform platform by providing out-of-the-box integrations and intelligent automations to trigger actions in numerous operational systems like SAP, Oracle, and Salesforce.

Within Celonis Studio, you can build literally any automation - from sending out emails, managing files, updating sales orders in SAP, to simply getting data from various tools. Leverage the drag-and-drop builder to add any application to your automated workflows… and to automate any process of any complexity.

**Note**

In simple terms, an Action Flow is a way to define an automated process flow. It consists of multiple events, decision points and alternative routes and it can involve an arbitrary number of different applications.

|  |
| --- |
|  |

Expand all

[## Before you begin](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-Beforeyougetstarted_body)

To kickstart your Action Flow implementation, we provide frequently used templates. You can find specific use cases as well as snippets that you can use for different scenarios. The templates can be used as an inspiration for how key modules are connected in various use cases. See [Action Flow Templates](action-flow-templates.html "Action Flow blueprints").

[## Setting up Action Flows in Celonis Platform](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-SettingUpActionFlowsintheCelonisStudio_body)

[### 1. Create an Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-CreateaActionFlow_body)

1. Click the **+** icon next to your package and select "Action Flow".
2. Give your Action Flow a name.

   The key will be automatically created. This key is unique and can be used to refer to a specific Action Flow throughout the Celonis Platform.
3. (Optional) Add a description.
4. Select automation type:

   - **Automatic** - select this option if you want your Action Flow to run according to a schedule; the scheduling of the Action Flow is set to **According to schedule**.
   - **Manual** - select this option if you want your Action Flow to be started manually; the scheduling of the Action Flow is automatically set to **On-demand**.
5. (Optional) Set the number of consecutive errors after which the Action Flow will be disabled.
6. Click **Create**.

[### 2. Build / Edit your Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-BuildEdityourActionFlow_body)

- In general, Action Flows consist of five different module types:

  - [Triggers](tools.html#UUID-c58f91de-d96d-4c97-fbe7-63062bd35a41_UUID-3b97cb5e-97fc-980a-560a-7e7b679e6b99 "Triggers")
  - Searches
  - Actions
  - Iterators
  - Aggregators
- In addition, you can use a variety of different tools such as:

  - Filter
  - Router
  - Set variable
- You can add any number of modules to your Action Flow and recreate any business logic needed.

**Draft vs. Published**

In the edit mode, you are working on your Action Flow in "draft" mode. As soon as the Action Flow is published, all changes are being pushed to the published version.

|  |
| --- |
|  |

[### 3. Run Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-RunyourActionFlow_body)

At any time during the creation process, you can run your Action Flow manually to test single modules or the entire Action Flow.

|  |
| --- |
|  |

[### 4. Publish Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-PublishScheduleyourActionFlow_body)

Publishing is necessary to activate the Action Flow for the first time and after making any changes to the Action Flow.

[### 5. Schedule and activate Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_section-idm4559434719801633458287552052_body)

For information on scheduling Action Flows, see [Scheduling](scheduling-action-flows.html "Scheduling Action Flows").

[### 6. Monitor your Action Flow](#UUID-1d733126-0a6b-79aa-0b48-283360ca0006_id_SettingupActionFlowsinStudio-MonitoryourActionFlow_body)

The Overview shows you your currently published Action Flow and provides:

- information about currently running executions,
- a preview of the execution history based on UTC+00 time zone,
- and high-level statistics on your executions over time.

**Log retention time**

Logs are stored for 30 days inside the Celonis Platform.

|  |
| --- |
|  |

For more detailed information, you can go to the History to deep-dive into every single execution.

|  |
| --- |
|  |

|  |
| --- |
|  |

## Related topics

- [Modules for third-party apps](action-flow-modules-for-third-party-apps.html "Action Flow modules for third-party apps")
- [Modules for Celonis apps](celonis-apps.html "Action Flow modules for Celonis apps")

[## Action Flow inputs](#UUID-b07391c5-21f7-cd4e-ddcb-b29617dd1636_body)

Action Flow inputs allow you to pass structured data into your automation every time it runs. They act as a bridge between Celonis and other systems, ensuring that your Action Flow has all the specific information it needs to execute its logic correctly.

To find Action Flows inputs, go to your automation editor and click **inputs** icon on the toolbar.

[### How Action Flow inputs work](#UUID-b07391c5-21f7-cd4e-ddcb-b29617dd1636_section-id235502869854339_body)

Action Flow inputs function as the primary configuration layer for manual or hybrid automations. Here is a look at each stage of the lifecycle:

1. **Define the structure**: During the design phase, you establish the "schema" or blueprint of the data your Action Flow needs to function.

   - **Field Mapping**: You define specific keys (e.g., customer\_email, total\_amount) and assign them data types (text, number, date, or boolean).
   - **Validation Rules**: You can designate specific fields as Required, ensuring the automation never runs with missing critical data.
   - **User Interface**: These definitions automatically generate the labels and tooltips that the end-user will see when they trigger the flow.
2. **Input data (the trigger event)**: When a user initiates the Action Flow—either from a button in a Celonis View or directly within the Action Flows module—the system intercepts the request.

   - **Dynamic Form Generation**: Celonis renders a real-time input form based on your defined structure.
   - **User Interaction**: The user enters the specific values for that unique execution (e.g., typing in a specific "New Hire Name" or selecting a "Reason for Rejection").
   - **Gatekeeping**: If any Required fields are missing, the "Run" button remains disabled or returns an error, preventing partial or failed executions.
3. **Automation execution and data distribution**: Once the form is submitted, the data enters the Action Flow environment as a set of global variables.

   - **Variable Availability**: The input data becomes a selectable "pill" in the mapping panel of every subsequent module (e.g., Jira, Slack, or ServiceNow).
   - **Consistency**: Because the data is collected once at the start, the same value (like an Employee ID) is synchronized across all connected platforms, eliminating manual entry errors.
   - **Process Transparency**: These inputs are logged in the execution history, allowing you to audit exactly what data was used to trigger a specific run.

[### Use case: Automated employee onboarding](#UUID-b07391c5-21f7-cd4e-ddcb-b29617dd1636_section-id235502870479585_body)

If you need to set up accounts for a new hire across Jira, Slack, and Email. Instead of manually logging into each platform, you can use Action Flow inputs:

- **The inputs**: You define fields for First Name, Last Name, Work Email, and Employee ID.
- **The action**: Once you enter this information into the input form, the Action Flow automatically creates the accounts in all systems simultaneously.
- **The benefit**: You don't need to understand the complex logic or API connections happening in the background; you just provide the data, and the automation handles the rest.

Other common use case scenarios include:

- Customer Syncing: Updating profile information across multiple CRM platforms.
- Lead Management: Adding offline event leads to CRMs and mailing lists.
- Document Generation: Creating invoices or orders by providing a specific set of variables.

### Related topics

- [Action Flow inputs](setting-up-action-flows-in-studio.html#UUID-b07391c5-21f7-cd4e-ddcb-b29617dd1636 "Action Flow inputs")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/sftp--action-flow-

# SFTP (Action Flow)

With SFTP modules in Celonis platform, you can manage your files, folders, and file permissions on a remote server.

To use SFTP modules, you must have an SFTP account on some hosting.

Expand all

[## Establishing the connection with SFTP in Celonis platform](#UUID-78ab2861-b8c4-b391-a194-eee61ff8777c_section-idm4539706729579234216909221033_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a SFTP module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **Host** field, enter the host address of the server you want to connect.
4. In the **Port** field, enter the SFTP server port. It must be a number between 1 and 65535. The default value is `22`.
5. In the **Auth type** dropdown list, select the authorization method you want to use for connecting to the SFTP server.

   - In the **User name** field, enter the user name that you use to enter the server.
   - Only for the **User name and password** auth type: In the **Password** field, enter the password that you use to enter the server.
   - Only for the **User name and key** auth type: In the **Private key** field, upload the private key to use the client-side authorization.

     **Note**

     Upload your certificate (P12, PFX, or PEM file) to use TLS using your self-signed certificate. If you use the client-side certificate authorization, you can enter your CA certificate here. Refer to our [Help Center](certificates-and-keys.html "Certificates and keys") for more information.
6. Optional: Set up an algorithm.

   **Important**

   The **blowfish-cbc** cipher option stopped functioning since March 19, 2024.
7. Click **Save**.

You have successfully established the connection. You can now edit your Action Flow and add more SFTP modules.

[## Building SFTP Action Flows](#UUID-78ab2861-b8c4-b391-a194-eee61ff8777c_section-idm4586552537428834216906014537_body)

After connecting the app, you can perform the following actions:

**Triggers**

- Watch files in a folder
- Watch subfolders in a folder

**Actions**

- List a folder's content
- Get files
- Get a file
- Upload a file
- Rename a file
- Move a file
- Delete a file
- Update file permissions

  Note: Use the chmod parameters, for example, `777` or `-rwxrwxrwx`. The entered data should match the patters: `/(.?([r-][w-][x-]){3})|[0-7]{3}/`. Refer to the [chmod Man Page](https://ss64.com/bash/chmod.html) to get more information.
- Create a folder

  Note: Use the chmod parameters, for example, `777` or `-rwxrwxrwx`. The entered data should match the patters: `/(.?([r-][w-][x-]){3})|[0-7]{3}/`. Refer to the [chmod Man Page](https://ss64.com/bash/chmod.html) to get more information.
- Delete a folder

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/shortcut--action-flow-

# Shortcut (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Shortcut modules allow you to manage the stories in your Shortcut account.

## Getting Started with Shortcut

Prerequisites

- A Shortcut account

In order to use Shortcut with Celonis platform, it is necessary to have a Shortcut account. If you do not have one, you can create a Shortcut account at [shortcut.com](https://www.shortcut.com/).

**Note**

The module dialog fields that are displayed in **bold** (in the Celonis platform Action Flow, **not** in this documentation article) are mandatory!


---

## automation/action-flows/slack--action-flow-

# Slack (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Slack modules in Celonis platform, you can create, update, delete, retrieve, watch, and/or search for messages, files, channels, reactions, users, reminders, and/or statuses.

To get started with Slack, create an account at [slack.com/getting-started](https://slack.com/get-started).

Refer to the [Slack API documentation](https://api.slack.com/docs) for the list of available endpoints.

| **Slack Terminology** | |
| --- | --- |
| **Private Channel** | formerly *Group* |
| **Direct Message** | formerly *IM* |
| **Channel** | Referred to as *Conversation* in the API documentation and *Channel* in the Slack application |

Expand all

[## Connecting Slack to Celonis platform](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb_body)

To establish the connection:

1. Log in to your Celonis platform account, add a Slack module to your Action Flow, and click **Create a connection**.

   Note: If you add a module with an `instant` tag, click **Create a webhook**, then **Create a connection**.
2. Depending on the module you add, you may be prompted to choose the **Connection type**: **Slack (user)** or **Slack (bot)**. If not, continue to step 4.

   **Note**

   Slack **Watch** modules only function with **User** connections at this time. If you would like to create a webhook with an interactive bot, you must use the [Custom Webhook](webhooks--action-flow-.html#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-ddc88758-9504-99ed-8778-e26fd92d6d12 "Creating custom webhooks") module.
3. Optional: In the **Connection name** field, enter a name for the connection.
4. Optional: Click **Show Advanced settings** and enter your custom app client credentials or add additional scopes.

   To create client credentials, see the [Create Custom App and Client Credentials in Slack](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-429ba3ae-7c8c-fa0d-4428-2105f4319745 "Creating Custom App and Client Credentials in Slack") section.
5. Click **Save**.
6. If prompted, authenticate your account. If your account has multiple Slack workspaces, select the relevant workspace in the top-right corner and grant access to Celonis platform.

You have successfully established the connection. You can now edit your Action Flow and add more Slack modules.

Note: Some modules may require additional permissions extension. If so, you will be asked to authorize the required permissions.

[## Creating Custom App and Client Credentials in Slack](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-429ba3ae-7c8c-fa0d-4428-2105f4319745_body)

To create a custom app and client credentials:

1. Log in to your Slack account and go to the [Your Apps page](https://api.slack.com/apps).
2. Click **Create New App**.
3. Select **From scratch**.
4. Enter a name for your app, select a workspace, and click **Create App**. This brings you to the **Basic Information** page of your new app.
5. Scroll down to the **App Credentials** section. Copy your **Client ID** and store it in a safe place.
6. In the **Client Secret** field, click **Show**, copy your secret, and store it in a safe place.
7. In the left sidebar, click **OAuth & Permissions**.
8. Scroll down to the **Redirect URLs** section, click **Add New Redirect URL**, enter the redirect URL listed below for **User** and/or **Bot**, and click **Add** > **Save URLs**.

   | Connection Type | Redirect URL |
   | --- | --- |
   | **User** | `https://www.integromat.com/oauth/cb/slack2` |
   | **Bot** | `https://www.integromat.com/oauth/cb/slack3` |
9. In the **Scopes** section, add **Bot Token Scopes** or **User Token Scopes**. You can add scopes for both types to one custom app.
10. Click **Add an OAuth Scope** and select scopes in the dropdown menu. Repeat this for all desired scopes.

    For a list of required scopes for each module, see the Scopes list below.

    Note: If you change permission scopes in your Slack app after creation, you will be prompted in the Slack My Apps pages to reinstall your app.

You now have the client credentials to connect to Celonis platform.

[## Messages](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-1666cd32-4638-1329-cb71-dda07058a956_body)

You can watch public and private channel messages, watch direct and multiparty direct messages, watch scheduled messages, search for messages, list scheduled messages, retrieve private and public channel messages, list replies, create, update, schedule, and delete a message using the following modules.

[### Watch Public Channel Messages](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-0fd60a33-7dcc-9daf-1cc5-b10fcff21f63_body)

Triggers when a new message is added to a public channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Public Channel** | Select or map a public channel whose messages you want to watch. |
| **Public Channel** | Enter (map) a public channel name whose messages you want to watch. |
| **Limit** | Set the maximum number of public channel messages Celonis platform will return during one execution cycle. The default value is 2. |

[### Watch Private Channel Messages](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-dae29d99-5261-6831-0e9c-8e774dce2368_body)

Triggers when a new message is added to a private channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Private Channel** | Select or map a private channel whose messages you want to watch. |
| **Private Channel** | Enter (map) a private channel name whose messages you want to watch. |
| **Limit** | Set the maximum number of private channel messages Celonis platform will return during one execution cycle. The default value is 2. |

[### Watch Direct Messages](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-20102f10-4150-0925-4d0a-0168021be0df_body)

Triggers when a new direct message is added to a direct message channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Direct message** | Select or map a direct message you want to watch. |
| **Direct message** | Enter (map) a direct message channel name whose messages you want to watch. Alternatively, you can search for a direct message channel.  |  |  | | --- | --- | | Name | Enter (map) a name to search for a multiparty direct message. | | Exclude Archived | Select whether to exclude the archived channels. | |
| **Limit** | Set the maximum number of direct messages Celonis platform will return during one execution cycle. The default value is 2. |

[### Watch Multiparty Direct Messages](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4599345256696033116055696207_body)

Triggers when a new message is added to a multiparty direct message channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Direct message to multiple people** | Select or map a multiple direct message channel whose messages you want to watch. |
| **Direct message to multiple people** | Enter (map) a multiple direct message name whose messages you want to watch. Alternatively, you can search for a direct message channel.  |  |  | | --- | --- | | Name | Enter (map) a name to search for a direct message. | | Exclude Archived | Select whether to exclude the archived channels. | |
| **Limit** | Set the maximum number of multiparty direct messages Celonis platform name will return during one execution cycle. The default value is 2. |

[### Search for Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4583719293691233116055822627_body)

Returns messages matching a search query.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Query** | Enter the search term you want to search the workspace for. See [Search in Slack](https://get.slack.help/hc/en-us/articles/202528808-Search-in-Slack) for a list of Search modifiers. |
| **Limit** | Set the maximum number of messages Celonis platform will return during one execution cycle. The default value is 2. |
| **Sort by** | Select a parameter to sort:  - *Score* - *Timestamp* |
| **Direction** | Select the sorting direction:  - *Ascending* - *Descending* |

[### Get a Private Channel Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-17cd337e-bc11-cfd9-d540-d162d81f76ed_body)

Returns a message with a given ID from a specified private channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Private Channel** | Select or map a private channel whose messages you want to retrieve. |
| **Private Channel** | Enter (map) a private channel name whose messages you want to retrieve. Alternatively, you can search for a public channel.  |  |  | | --- | --- | | **Name** | Enter (map) the channel name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Message ID (timestamp)** | Enter (map) a Message ID of a message to retrieve. |

[### Get a Public Channel Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-0c337574-8095-ef6f-1a85-5fc0cbaaf1cd_body)

Returns a message with a given ID from a specified public channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Input Method** | Select the input method:  - *Select from a list* - *Select from a list* |
| **Public Channel** | Select or map a public channel whose messages you want to retrieve. |
| **Public Channel** | Enter (map) a public channel name whose messages you want to retrieve. Alternatively, you can search for a public channel.  |  |  | | --- | --- | | **Name** | Enter (map) the channel name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Message ID (timestamp)** | Enter (map) a Message ID of a message to retrieve. |

[### List Replies](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4516530929500833116056084941_body)

Retrieves a thread messages posted to a conversation.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel whose message you want to create. |
| **Private channel** | Select or map a private channel whose message you want to create. |
| **Direct message** | Select or map a user whose message you want to create. |
| **Direct message to multiple** | Select or map a direct message to multiple people and list the replies. |
| **Parent message ID (timestamp)** | Enter (map) a Parent message ID of a message whose replies you want to list. |
| **Limit** | Set the maximum number of replies Celonis platform will return during one execution cycle. The default value is 2. |

[### Create a Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-165427ee-29cb-cd75-ec4c-f4d894848ded_body)

Creates a new message.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Enter a channel ID or name** | Select the input method:  - *Enter manually* - *Select from the list* |
| **Channel ID or name** | Enter (map) a Channel ID or name whose message you want to create.  **Note**  You must specify a public channel, private channel, or a direct message channel. You can either pass the channel's name (#general) or encoded ID (C0123BE12L). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel whose message you want to create. |
| **Private channel** | Select or map a private channel whose message you want to create. |
| **Direct message** | Select or map a direct message channel whose message you want to create. |
| **Direct message to multiple people** | Select or map a multiple direct message channel whose message you want to create. |
| **Text** | Enter (map) the text content of the message you want to create.  For detailed information about text formatting, please refer to the [Slack documentation](https://api.slack.com/reference/). |
| **Blocks** | Enter (map) the blocks to be combined with messages to create visually rich and compellingly interactive messages.  For detailed information about text formatting, please refer to the [Slack documentation](https://api.slack.com/reference/block-kit/blocks). |
| **Thread message ID (timestamp)** | Enter (map) another message's time stamp value to make this message a reply. Avoid using a reply's time stamp value; use its parent instead. |
| **Reply broadcast** | Select whether they should be made visible to everyone in the channel or conversation.  **Note**  Used in conjunction with the Thread message ID. |
| **Link names** | Names and channels will not be linkified in the @username or #channel format unless you enable this option. For more information, refer to the [formatting spec](https://api.slack.com/docs/formatting). |
| **Parse message text** | Select whether to parse the message text.  **Note**  Defines how messages are treated. |
| **Use markdown** | Disable Slack markup parsing by selecting the No option. |
| **Unfurl primarily text-based content** | Enable this option to enable the unfurling of primarily text-based content. For detailed information about unfurling in Slack, refer to the [Unfurling links in the messages](https://api.slack.com/docs/message-link-unfurling) article. |
| **Unfurl media content** | Disable this option to disable the unfurling of media content. For detailed information about unfurling in Slack, please refer to the [Unfurling links in the messages](https://api.slack.com/docs/message-link-unfurling) article. |
| **Icon emoji** | Enter (map) an emoji to use as the icon for this message. Overrides Icon URL.  **Note**  This field only has an effect when using a Bot connection. |
| **Icon url** | Enter (map) an Icon URL to an image to use as the icon for this message.  **Note**  This field only has an effect when using a Bot connection. |
| **User name** | Enter (map) a User name to create a message.  **Note**  If not specified, the default bot name will be used. This field only has an effect when using a Bot connection. |

[### Update a Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4498482121747233116068255249_body)

Updates a message.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Enter a channel ID or name** | Select the input method:  - *Enter manually* - *Select from the list* |
| **Channel ID or name** | Enter (map) an updated Channel ID or name whose message you want to create.  **Note**  You must specify a public channel, private channel, or a direct message. You can either pass the channel's name (#general) or encoded ID (C0123BE12L). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel whose message you want to create. |
| **Private channel** | Select or map a private channel whose message you want to create. |
| **Direct message** | Select or map a direct message whose message you want to create. |
| **Direct message to multiple people** | Select or map a multiple direct message whose message you want to create. |
| **Timestamp (Message ID)** | Enter (map) the message's time stamp value or the Message ID to whose text you want to update. |
| **Text** | Enter (map) the text content of the message you want to create.  **Note**  For detailed information about text formatting, please refer to the [Slack documentation](https://api.slack.com/reference/). |
| **Blocks** | Enter (map) the blocks to be combined with messages to create visually rich and compellingly interactive messages.  **Note**  For detailed information about text formatting, please refer to the [Slack documentation](https://api.slack.com/reference/block-kit/blocks). |
| **Link names** | Names and channels will not be linkified in the @username or #channel format unless you enable this option. For more information, refer to the [formatting spec](https://api.slack.com/docs/formatting). |
| **Parse message text** | Select whether to parse the message text.  **Note**  Defines how messages are treated. |

[### Delete a Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297499440033116068988118_body)

Removes a message.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) a Channel ID of a channel whose messages you want to delete. |
| **Message ID (timestamp)** | Enter (map) a Message ID of a message to delete. |

[## Files](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-3a54e830-8566-1f65-216a-6b405b015c13_body)

You can watch, list, retrieve, download, upload, create and delete files using the following modules.

[### Watch Files](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297600876833117625978565_body)

Triggers when a new file is added.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Type** | Select the file type for which you want to watch:  - *Posts* - *Snippets* - *Google docs* - *Images* - *Zips* - *Pdfs* |
| **Channel type** | Select the channel from which you want to filter the files.  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel to watch the files. |
| **Private channel** | Select or map a private channel to watch the files. |
| **User** | Select or map a user to watch the files. |
| **Direct message to multiple people** | Select or map a direct message to multiple people and watch the files. |
| **Created by** | Filter files to those created by the selected user. |
| **Limit** | Set the maximum number of files Celonis platform will return during one execution cycle. The default value is 2. |

[### List Files](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297585232033117626132489_body)

Returns a list of files within a team.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Type** | Select the file type you want to retrieve:  - *Posts* - *Snippets* - *Google* - *docs* - *Images* - *Zips* - *Pdfs* |
| **Channel type** | Select the channel from which to filter the files:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel to list the files. |
| **Private channel** | Select or map a private channel to list the files. |
| **User** | Select or map a user to list the files. |
| **Direct message to multiple people** | Select or map direct message to multiple people and list the files. |
| **Created by** | Filter files created by the selected user. |
| **Date from** | Set the start date from when you want to list the files. |
| **Date to** | Set the end date until when you want to list the files. |
| **Limit** | Set the maximum number of files Celonis platform will return during one execution cycle. The default value is 2. |

[### Get a File](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm455528816179363311762622501_body)

Returns details about a file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **File ID** | Enter (map) the ID of the file you want to retrieve details about. |

[### Download a File](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4498481766124833117626283406_body)

Downloads a file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **URL private download** | Enter (map) the URL Private download value from the Get a File module. |

[### Upload a File](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm455529436799843311762634564_body)

Creates or uploads a file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channels** | Enter (map) the channel's details:  |  |  | | --- | --- | | **Channel type** | Select the channel where you want to upload the file:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* | | **Public channel** | Select or map a public channel to upload a file. | | **Private channel** | Select or map a private channel to upload a file. | | **User** | Select or map a user to upload a file. | | **Direct message to multiple people** | Select or map a direct message to multiple people and upload a file. | |
| **File** | Enter (map) a file details:  |  |  | | --- | --- | | **File name** | Enter (map) the file name. | | **Data** | Enter (map) the file data. | |
| **Title** | Enter (map) the title of the file. |
| **Thread ID (timestamp)** | Enter (map) the Thread ID to upload the file as a reply. |
| **Initial comment** | Enter (map) the message text introducing the file in the specified channel. |

[### Create a Text File](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4498481801684833117626445593_body)

Creates a text file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channels** | Enter (map) the channel's details:  |  |  | | --- | --- | | **Channel type** | Select the channel where you want to upload the file:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* | | **Public channel** | Select or map a public channel to create a file. | | **Private channel** | Select or map a private channel to create a file. | | **User** | Select or map a user to create a file. | | **Direct message to multiple people** | Select or map a direct message to multiple people and create a file. | |
| **File** | Enter (map) a file details:  |  |  | | --- | --- | | **File name** | Enter (map) the file name. | | **Content** | Enter (map) the file data. | |
| **Title** | Enter (map) the title of the file. |
| **Thread ID (timestamp)** | Enter (map) the Thread ID to create the file as a reply. |
| **Initial comment** | Enter (map) the message text introducing the file in the specified channel. |

[### Delete a File](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4516530956873633117626522429_body)

Deletes a file.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **File ID** | Enter (map) the ID of the file you want to delete. |

[## Channels](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-42c6c443-b530-1232-7be3-ad25cdc25df9_body)

You can list, retrieve, list members, set the topic, set the purpose, join a channel, leave a channel, create, archive, and unarchive a channel using this module.

[### List Channels](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-4d3c14b0-9995-f5d9-008e-76a41e59a151_body)

Returns a list of channels in a workspace.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Exclude archived** | Select whether to exclude archived channels in the results. |
| **Type** | Select the type of channels you want to retrieve.  - *Public channel* - *Private channel* - *Direct message channel* - *Direct message to multiple people* |
| **Limit** | Set the maximum number of channels Celonis platform will return during one execution cycle. The default value is 2. |
| **Next Cursor** | Set the cursor parameter equal to the next\_cursor value you received on the last request to retrieve the next portion of the collection. For information see the [cursor based pagination](https://api.slack.com/docs/pagination#cursors). |

[### Get a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-9b42ba88-175b-3458-3da7-68decc7b50ea_body)

Returns details about a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) the channel ID of the channel you want to retrieve. |

[### List Members in a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-2a240d2a-8dcf-33dd-4bde-a0abb501b365_body)

Returns users in the selected Channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* |
| **Public channel** | Select or map a public channel whose members you want to list. |
| **Private channel** | Select or map a private channel whose members you want to list. |
| **Limit** | Set the maximum number of members Celonis platform will return during one execution cycle. The default value is 2. |

[### Set the Topic of a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-67cc42e5-8de5-d899-91fc-61ed70b3c0fd_body)

Changes the topic of a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Public Channel** | Select or map a public channel whose topic you want to set. |
| **Private Channel** | Select or map a private channel whose topic you want to set. |
| **Direct message** | Select or map a direct message whose topic you want to set. |
| **Direct message to people** | Select or map a direct message to multiple people whose topic you want to set. |
| **Public Channel** | Enter (map) a public channel whose topic you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Private Channel** | Enter (map) a public channel whose topic you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Direct message** | Enter (map) a public channel whose topic you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Direct message to multiple people** | Enter (map) a public channel whose topic you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Topic** | Enter (map) the topic name for the channel. Does not support formatting or linkification. For example, `Apply topically for best effects`. |

[### Set the Purpose of a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-876682f0-bfda-fd04-4d11-4bc238786054_body)

Changes the purpose of a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Input Method** | Select the input method:  - *Select from a list* - *Search by the name* |
| **Public Channel** | Select or map a public channel whose purpose you want to set. |
| **Private Channel** | Select or map a private channel whose purpose you want to set. |
| **Direct Message** | Select or map a direct message whose purpose you want to set. |
| **Direct message to multiple people** | Select or map a direct message to multiple people whose purpose you want to set. |
| **Public Channel** | Enter (map) a public channel whose purpose you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Private Channel** | Enter (map) a public channel whose purpose you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Direct message** | Enter (map) a public channel whose purpose you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Direct message to multiple people** | Enter (map) a public channel whose purpose you want to set. Alternatively, you can search a channel:  |  |  | | --- | --- | | **Name** | Enter (map) a name to search. | | **Exclude Archived** | Select whether to exclude the archived channels. | |
| **Purpose** | Enter (map) the new special purpose for the channel. For example, `My More Special Purpose`. |

[### Join a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-acaca2da-07d0-d079-afbe-3b2bb45be9d3_body)

Joins to an existing channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) the Channel ID of a channel you want to join. |

[### Leave a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-471385ea-2294-68fc-57d3-605be0a33153_body)

Leaves a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) the Channel ID of a channel you want to leave. |

[### Create a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-fba2bea6-9695-d36f-0631-c7cc0055957a_body)

Creates a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Name** | Enter (map) the name of the public or private channel to create. |
| **Is private** | Select whether the channel is private. |

[### Archive a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-e5e0a710-9901-89d7-e288-6decfd9e3602_body)

Archives a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) the channel ID of the channel you want to archive. |

[### Unarchive a Channel](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-118d101c-65b5-5e14-cc20-6d68b3a76290_body)

Unarchives a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel ID** | Enter (map) the channel ID of the channel you want to unarchive. |

[## Reactions](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-20f50631-f711-e0c6-6423-4e8e9c3408f1_body)

You can list, add, and remove a reaction using the following modules.

[### List Reactions](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615127674115233118052748092_body)

Returns reactions a user made.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **User** | Select or map a user whose reactions you want to list. |
| **Limit** | Set the maximum number of reactions Celonis platform should return during one execution cycle. The default value is 2. |

[### Add a Reaction](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130962345633118053280872_body)

Adds a reaction to an item.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel to whose message you want to add a reaction. For example, `C1234567890`. |
| **Private channel** | Select or map a private channel to whose message you want to add a reaction. For example, `C1234567894`. |
| **User** | Select or map a user to whose message you want to add a reaction. |
| **Direct message to multiple people** | Select or map a direct message to multiple people to whose message you want to add a reaction. |
| **Message ID (timestamp)** | Enter (map) the Message ID or a timestamp of the message to add a reaction. For example, `1234567890.123456`. |
| **Reaction (emoji) name** | Enter (map) the Reaction (emoji) name. For example, `thumbsup`. |

[### Remove a Reaction](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4597016173827233118054774414_body)

Removes a reaction.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel to whose message you want to remove a reaction. For example, `C1234567890`. |
| **Private channel** | Select or map a private channel to whose message you want to remove a reaction. For example, `C12345678904`. |
| **User** | Select or map a user to whose message you want to remove a reaction. |
| **Direct message to multiple people** | Select or map a direct message to multiple people to whose message you want to remove a reaction. |
| **Message ID (timestamp)** | Enter (map) the Message ID or a timestamp of the message to add a reaction. For example, `1234567890.123456`. |
| **Reaction (emoji) name** | Enter (map) the Reaction (emoji) name. For example, `thumbsup`. |

[## Stars](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-1e9aed47-909a-3805-f562-79bd8efe0cf5_body)

You can add and remove stars using the following modules.

[### Add a Star](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_id_add-a-star_body)

Adds a star to a channel, message, file, or a file comment.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Add a star to** | Select whether you want to add a star to a channel, file, or file comment. |
| **Channel/File ID/File comment ID** | Enter respective IDs. You can star a message by selecting a *Channel* and entering the message *timestamp*. |

[### Remove a Star](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_id_remove-a-star_body)

Removes a star from the channel, message, file, or a file comment.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Add a star to** | Select whether you want to remove the star from a channel, file, or file comment. |
| **Channel/File ID/File comment ID** | Enter respective IDs of the objects you want to remove the star from. You can remove a star from the message by selecting a *Channel* and entering the message *timestamp*. |

[## Saved Items](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-3ba51029-e13a-7c12-3793-61591ffea9e1_body)

You can save an item and remove the saved item using the following modules.

[### Save an Item](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297526155233118060725808_body)

Adds an item to saved items.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Message ID (timestamp)** | Enter (map) a Message ID of a message whose item you want to save. |
| **File ID** | Enter (map) a File ID of a file to save. |

[### Remove Saved Item](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4649168796913633118061201458_body)

Removes a saved item.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Message ID (timestamp)** | Enter (map) a Message ID of a message whose item you want to remove. |
| **File ID** | Enter (map) a File ID of a file to remove. |

[## Pins](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-65bf59aa-b471-71d9-6081-f95f19d86481_body)

You can pin and unpin a message using the following modules.

[### Pin a Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297595739233118061929973_body)

Pins a message to a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel whose message you want to pin. |
| **Private channel** | Select or map a private channel whose message you want to pin. |
| **User** | Select or map a user whose message you want to pin. |
| **Direct message to multiple people** | Select or map a direct message to multiple people you want to pin. |
| **Message ID (timestamp)** | Enter (map) the timestamp of the message to pin. For example, `1234567890.123456`. |

[### Unpin a Message](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130961577633118062021504_body)

Unpins a message from a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* - *Direct message* - *Direct message to multiple people* |
| **Public channel** | Select or map a public channel whose message you want to unpin. |
| **Private channel** | Select or map a private channel whose message you want to unpin. |
| **User** | Select or map a user whose message you want to unpin. |
| **Direct message to multiple people** | Select or map a direct message to multiple people you want to unpin. |
| **Message ID (timestamp)** | Enter (map) the timestamp of the message to unpin. For example, `1234567890.123456`. |

[## Users](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-2cd47b3e-dee9-861f-b578-abc6c22a7df0_body)

You can watch, search, list, retrieve, invite and kick a user using the following modules.

[### Watch Users](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm464916866098563311806314768_body)

Triggers when a new user is added or an existing user has changed. Only emit the latest change since the last scenario run.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack user account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Limit** | Set the maximum number of users Celonis platform will return during one execution cycle. The default value is 2. |

When setting the schedule to run your Watch Slack Users scenario, the **Advanced Scheduling** option to choose a **Start Date** is restricted to Slack users with a [premium account](https://app.slack.com/plans/T042JM9R7).

[### Search for User](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297597811233118063230944_body)

Retrieves a single user by looking them up by their registered email address.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Email** | Enter the email address of the user you want to search for. |

[### List Users](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4597016099158433118065834535_body)

Returns a list of all users in a workspace.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Limit** | Set the maximum number of users Celonis platform will return during one cycle. The default value is 2. |

[### Get a User](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4597013165000033118067334653_body)

Returns details about a member to a workspace.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **User ID** | Enter (map) the User ID of the user you want to retrieve information about. |

[### Invite Users](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4555297590104033118068711923_body)

Invites 1-30 users to a public or private channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* |
| **Public channel** | Select or map a public channel to add the users. |
| **Private channel** | Select or map a private channel to add the users. |
| **Users** | Select the users you want to add to the channel. |

[### Kick a User](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4498481608392033118069968598_body)

Removes a user from a channel.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel type** | Select the channel type:  - *Public channel* - *Private channel* |
| **Public channel** | Select or map a public channel whose user you want to remove. |
| **Private channel** | Select or map a private channel whose user you want to remove. |
| **Users** | Select the user you want to remove from the channel. |

[## Reminders](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-5eba8882-c045-f654-76a0-0faf99aba06d_body)

You can list, retrieve, create, complete, and delete a reminder using the following modules.

[### List Reminders](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4516530979580833118073745618_body)

Lists all reminders created by or for a given user.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Limit** | Set the maximum number of reminders Celonis platform will return during one execution cycle. The default value is 2. |

[### Get a Reminder](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4516530990958433118075327191_body)

Returns details about a reminder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Reminder ID** | Enter (map) the ID of the reminder you want to retrieve information about. For example, `Rm12345678`. |

[### Create a Reminder](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130860280033118076287396_body)

Creates a reminder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Text** | Enter (map) the content to appear in the reminder. |
| **Time** | Enter (map) the time when this reminder should happen. Enter the Unix timestamp (up to five years from now), the number of seconds until the reminder (if within 24 hours), or a natural language description. For example, `in 15 minutes` `every Thursday`. |
| **User** | Select or map the user you want to create a reminder for. |

[### Complete a Reminder](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130909697633118077801481_body)

Completes a reminder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Reminder ID** | Enter (map) the ID of the reminder you want to mark as complete. For example, `Rm12345678`. |

[### Delete a Reminder](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130886118433118079292542_body)

Removes a reminder.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Reminder ID** | Enter (map) the ID of the reminder you want to delete. For example, `Rm12345678`. |

[## Events](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-5a6dc4a3-1904-266c-982b-d3b00a23d9ed_body)

You can watch new events using the following module.

[### New Event](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4482468817584033118082555758_body)

Triggers when a new message or other events are created.

|  |  |
| --- | --- |
| **Webhook name** | Enter (map) a name for the webhook. |
| **Event type** | Select the event type:  - *New channel message* - *New private channel message* - *New IM message* - *New MP IM message* - *New reaction* - *New file* |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **Channel** | Select or map a channel whose event you want to watch. |

[## Profile](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-2d55cdb5-c6ff-b42e-8522-d7aacf70518a_body)

You can set a status in events using the following module.

[### Set a Status](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4597016169088033118083485357_body)

Update a user’s current status.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| Status text | Enter (map) the status text. You can enter up to 100 characters. |
| Status emoji | Enter (map) the status emojis enabled for the slack team. For example, `:train:`. The list of possible emojis can be found in the [Slack Emoji Cheat Sheet](https://www.webfx.com/tools/emoji-cheat-sheet/). |
| Status expiration | Enter (map) the Unix Timestamp of when the status will expire.  **Note**  Providing `0` or omitting this field results in a custom status that will not expire. |

[## Other fields](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-66677db4-ba0c-c81a-6b2f-0ae0e772c9fa_body)

[### Make an API Call](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm4615130964235233118085592651_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Slack account](slack--action-flow-.html#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_UUID-6607f7a3-1408-2a39-0f36-c6f3614b93bb "Connecting Slack to Celonis platform"). |
| **URL** | Enter a path relative to `https://slack.com/api/.` For example: `/list.conversations`  **Note**  For the list of available endpoints, refer to the [Slack API documentation](https://api.slack.com/). |
| **Method** | **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

#### Example of Use - List Subaccounts

The following API call returns the subaccounts from your Slack account:

**URL:**

`/1.0/subaccounts/list`

**Method:**

`GET`

Matches of the search can be found in the module's Output under Bundles > Body. In our example, 4 subaccounts were returned:

[## Scopes](#UUID-1f2ff06b-1f64-e88b-4311-cf9e0c24401b_section-idm234451792346443_body)

|  |  |
| --- | --- |
| **Add a Reaction** | channels:read, groups:read, im:read, mpim:read, reactions:write |
| **Add a Star** | stars:write, channels:read, groups:read, im:read, mpim:read |
| **Archive a Channel** | channels:write, groups:write, im:write, mpim:write |
| **Complete a Reminder** | reminders:write |
| **Create a Channel** | users:read, channels:write, groups:write |
| **Create a Message** | chat:write, chat:write.public, chat:write.customize, channels:read, groups:read, im:read, mpim:read, users:read |
| **Create a Reminder** | reminders:write, users:read |
| **Create a Text File** | files:write, channels:read, groups:read, im:read, mpim:read, files:read |
| **Create a Text File (Deprecated)** | files:write, channels:read, groups:read, im:read, mpim:read |
| **Delete a File** | files:write |
| **Delete a Message** | chat:write |
| **Delete a Reminder** | reminders:write |
| **Disable Do Not Disturb Mode** | dnd:write |
| **Disable Snooze Mode** | dnd:write |
| **Download a File** | files:read |
| **Enable Do Not Disturb Mode** | dnd:write |
| **Get a Channel** | channels:read, groups:read, im:read, mpim:read |
| **Get a File** | files:read |
| **Get a Private Channel Message** | groups:history |
| **Get a Private Channel Message v2** | groups:history |
| **Get a Public Channel Message** | channels:history |
| **Get a Reminder** | reminders:read |
| **Get a User** | users:read, users:read.email |
| **Get a User's Do Not Disturb Status** | dnd:read, users:read |
| **Get My Info** | identity.basic |
| **Invite a User to Workspace** | admin.users:write, admin.teams:read, admin.conversations:read |
| **Invite Users** | channels:write, channels:read, groups:write, groups:read, im:writeim:read, mpim:writemp, im:read, users:read |
| **Join a Channel** | channels:write |
| **Kick a User** | channels:write, channels:read, groups:write, groups:read, im:write, im:read, mpim:write, mpim:read, users:read |
| **Leave a Channel** | channels:write, groups:write, im:write, mpim:write |
| **List Channels** | channels:read, groups:read, im:read, mpim:read |
| **List Files** | files:read, channels:read, groups:read, users:read, im:read, mpim:read |
| **List Members in a Channel** | channels:read, groups:read, im:read, mpim:read |
| **List Reactions** | reactions:read, users:read |
| **List Reminders** | reminders:read |
| **List Replies** | channels:read, groups:read, im:read, mpim:read, channels:history, groups:history, im:history, mpim:history |
| **List Saved Items** | stars:read |
| **List Scheduled Messages** | channels:read, groups:read, im:read, mpim:read, users:read |
| **List Users** | users:read, users:read.email |
| **New Event** | channels:read, emoji:read, files:read, channels:read, groups:read, channels:history, groups:history, im:history, mpim:history, reactions:read |
| **Open a Conversation** | im:write, mpim:write, users:read |
| **Pin a Message** | pins:write |
| **Remove a Reaction** | channels:read, groups:read, im:read, mpim:read, reactions:write |
| **Remove a Star** | stars:write |
| **Remove Saved Item** | stars:write |
| **Save an Item** | stars:write, channels:read, groups:read, im:read, mpim:read |
| **Schedule a Message** | chat:write, chat:write.public, chat:write.customize, channels:read, groups:readim:read, mpim:read, users:read |
| **Search for Message** | search:read |
| **Search for User** | users:read, users:read.email |
| **Set a Status** | users.profile:write |
| **Set the Purpose of a Channel** | channels:read, groups:read, im:read, mpim:read, channels:write, groups:write, im:write, mpim:write |
| **Set the Topic of a Channel** | channels:read, groups:read, im:read, mpim:read, channels:write, groups:write, im:write, mpim:write |
| **Unarchive a Channel** | channels:write, groups:write, im:write, mpim:write |
| **Unpin a Message** | pins:write |
| **Update a Message** | chat:write, channels:read, groups:read, im:read, mpim:read, users:read |
| **Upload a File** | files:write, channels:read, groups:read, im:read, mpim:read, files:read |
| **Upload a File (Deprecated)** | files:write, channels:read, groups:read, im:read, mpim:read |
| **Watch Direct Messages** | im:history, im:read, users:read |
| **Watch Files** | files:read, channels:read, groups:read, users:read, im:read, mpim:read |
| **Watch Multiparty Direct Messages** | mpim:history, mpim:read |
| **Watch Private Channel Messages** | groups:history, groups:read |
| **Watch Private Channel Messages v2** | groups:history, groups:read |
| **Watch Public Channel Messages** | channels:history, channels:read |
| **Watch Saved Items** | stars:read |
| **Watch Scheduled Messages** | channels:read, groups:read, im:read, mpim:read, users:read |
| **Watch Starred Messages** | stars:read |
| **Watch Users** | users:read |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/soap--action-flow-

# SOAP (Action Flow)

In this guide, you will find technical documentation for using the SOAP module within Action Flows. It details the specific limitations you might encounter while the module is in its beta phase—such as lack of support for SOAP Encoding or multi-part messages—and provides you with a clear, step-by-step workaround.

Expand all

[## Supported features](#UUID-c3195fb5-c673-0006-8072-d636815fe45e_id_supported-features_body)

The SOAP module is currently in beta and does NOT support:

- Custom XML Schema elements are defined with the help of [SOAP Encoding](https://www.w3.org/TR/2000/NOTE-SOAP-20000508/#_Toc478383512%22) (<http://schemas.xmlsoap.org>) schemas and elements. For example, the following would not be recognized correctly by Celonis platform:

  ```
  <complexType name="ArrayOfFloat">
    <complexContent>
      <restriction base="soapenc:Array">
        <attribute ref="soapenc:arrayType" wsdl:arrayType="xsd:integer[]"/>
      </restriction>
    </complexContent>
  </complexType>
  ```

  It includes the `soapenc:Array`, `soapenc:arrayType` and `wsdl:arrayType` references, which are not yet supported in Celonis platform.
- Redefine elements
- Fraction digits restrictions
- Total digits restrictions
- White space restrictions
- Multiple parts in input and output messages. Only single-part messages are supported

[## Workaround](#UUID-c3195fb5-c673-0006-8072-d636815fe45e_id_workaround_body)

If the **SOAP** module refuses to process the WSDL file or throws various errors in the module's configuration, you may try using the universal **HTTP > Make a request** module instead:

1. In Celonis platform, create a new Action Flow.
2. Insert the **HTTP > Make a request** module in the Action Flow.
3. Open a new web browser window/tab.
4. Paste the WSDL URL into the web browser's address bar and fetch the XML file. The WSDL URL usually ends with `?wsdl`, but not necessarily, e.g. <http://voip.ms/api/v1/server.wsdl>
5. If the WSDL file does not display directly in the web browser, open the downloaded file in a text editor.
6. Search for the `<service>` or `<wsdl:service>`tag:
7. Once located, copy the URL from the `location` attribute.
8. In Celonis platform, paste the URL into the HTTP module's *URL* field.
9. Open the [Online SOAP Client](https://wsdlbrowser.com/) in a new web browser window/tab.
10. Paste the WSDL URL into the *WSDL URL* field.
11. Click on the *Browse* button.
12. Pick from the list of functions to the left, e.g. `getLanguages`.
13. Copy the content of the *Request XML* text area.
14. In Celonis platform, paste the copied content to the module's *Request content* field.
15. Provide values for selected parameters by replacing the question marks with actual values:
16. Close the module's configuration by clicking on the *OK* button.
17. Execute the Action Flow/module.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/text-parser-action-flow

# Text parser for Action Flows

When using the Text Parser module to identify file extensions, a standard regex like \..+ may show a match in external testers but fail to produce output bundles in Action Flows. To successfully capture and use the extension as a variable, you must use capturing groups.

Expand all

[## Before you begin](#UUID-89866368-592a-3dd0-c0d7-173162be6223_section-id235513332694304_body)

Before configuring the text parser, ensure that you have:

- An active Action Flow in the Celonis Platform.
- A variable containing a filename (e.g., filename.docx).

[## Configuring the text parser for your Action Flow](#UUID-89866368-592a-3dd0-c0d7-173162be6223_section-id23551333264638_body)

To configure the text parser:

1. Add the Text Parser module to your Action Flow.
2. In the Pattern field, enter the following regular expression:

   ```
   \.(.+)
   ```

   **Note**

   The parentheses () create a capturing group, which tells the parser specifically which part of the match to return as a value.
3. Ensure the Global match checkbox is selected if you are processing multiple filenames in one string.
4. Map the output from the Text Parser to your subsequent module. You will now see the extracted extension (e.g., docx) available in the mapping panel.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/trigger-an-action-flow-from-ml-workbench

# Trigger an Action Flow from ML Workbench

Automate your insights by connecting Machine Learning results to Action Flows. This guide provides a ready-to-use Python snippet and a step-by-step configuration to trigger secondary actions, like Slack notifications, directly from your ML Workbench.

This setup creates a seamless loop between your data science environment and your business logic. The process consists of two primary stages:

1. **The Trigger**: A Python script in the ML Workbench processes your data and sends the results via a POST request to a dedicated webhook.
2. **The Execution**: An Action Flow receives this data payload, parses the results, and automatically triggers downstream actions—such as sending a Slack notification or updating a record.

|  |
| --- |
|  |

Expand all

[## Configure ML Script Snippet](#UUID-ff8564bd-f776-f83c-e5b5-3423ec30bb95_id_TriggeranActionFlowfromMLWorkbench-ConfigureMLScriptSnippet_body)

Copy the following script snippet into a new or existing ML App.

```
import json
import re
import sys
import requests


## you can choose any data to send to webhook, as long as it is in json format, for example
json_transfer = {'email_to': email_to,
                'info1': value_ABC,
                'info2': value_BCD
                }
data = json.dumps(json_transfer)


webhook_url = '< paste your webhook url here >'

byte_length = str(sys.getsizeof(data))
headers = {'Content-Type': "application/json", 'Content-Length': data}
response = requests.post(webhook_url, data=data_df, headers=headers)
```

The ML script will run your pre-defined Python logic that you either trigger manually in the ML Workbench or by a different Action Flow (see [here](trigger-machine-learning-script.html "Trigger Machine Learning Script")).

**Response Script Snippet**

**Creating your own Logic**

The script includes further documentation on how to ensure the successful execution. Please make sure to follow these steps as well.

If you apply your own logic, please make sure to code robustly and test the script thoroughly. If an error occurs, the backend does not give an indicator what the error was.

1. From your Celonis Platform team, click **Data - Machine Learning**.

2. Open an existing App or create a new one (click **New App**).

3. Import the **script** provided above

|  |
| --- |
|  |

4. Make sure the script is uploaded successfully and displayed in the section on the left

|  |
| --- |
|  |

### 1. Customize ML Script Response

Required:

- **url:** paste here the URL of the Webhook of the module from the Action Flow below (do not delete the quotation marks ' ')

Optional:

- **message:** you can adjust the message of the response
- **title:** you can adjust the title of the response

**Additional data fields**

Add new fields (e.g. results of your ML Script) by copying the structure of the fields before and adding it additionally to the JSON called "fields" in the same way title and value are defined

[## Configuring the Action Flow](#UUID-ff8564bd-f776-f83c-e5b5-3423ec30bb95_id_TriggeranActionFlowfromMLWorkbench-ConfiguringActionFlow_body)

Below you will find the step-by-step guide for configuring each module of the above Action Flow.

[### 1. Receive ML Script Response](#UUID-ff8564bd-f776-f83c-e5b5-3423ec30bb95_id_TriggeranActionFlowfromMLWorkbench-1ReceiveMLScriptResponse_body)

In this module we define a Webhook where we receive data from the ML Script.

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: Webhooks

Action: Custom webhook

Copy the address to clipboard and proceed in the next step where you add the URL to the ML Script

|  |
| --- |
|  |

[### 2. Re-determine Data Structure of the Webhook](#UUID-ff8564bd-f776-f83c-e5b5-3423ec30bb95_id_TriggeranActionFlowfromMLWorkbench-2Re-determineDataStructureoftheWebhook_body)

1. Click on the blue button called 'Re- determine data structure'

|  |
| --- |
|  |

2. As soon as you see it is trying to redetermine, send the triggering phrase in the Slack channel and run the triggering Flow. When the HTTP module shows the 200 code as a response it can take a few seconds

|  |
| --- |
|  |

**Note**

Please run the script manually, the response will connect to the webhook and re-determine the data structure.

3. The webhook determined the data structure when showing you the green success statement. Click 'Ok' to save the structure and be able to continue.

|  |
| --- |
|  |

[### 3. Send Response in Slack](#UUID-ff8564bd-f776-f83c-e5b5-3423ec30bb95_id_TriggeranActionFlowfromMLWorkbench-3SendResponseinSlack_body)

In this module we'll send the received data to Slack to controle if everything worked out.

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: Slack

Action: Create a Message

**Enter a channel ID or name:** Select from the list

**Channel type:** Private channel

**Private channel:** select the channel where you want to get the results of the ML script

**Text:**

```
title: {{fields[].title}}
value: {{fields[].value}}
```

|  |
| --- |
|  |

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/troubleshooting-action-flows-in-orchestration-engine

# Troubleshooting Action Flows in Orchestration Engine

A common issue you can observe when using Action Flows in Process Orchestration is when an Action Flow fails midway while the Process Orchestration is still running. This page will help you investigate this cause of the failure, apply the necessary fix to the Action Flow, and successfully resume the Process Orchestration to ensure normal operation.

1. **Identify the Process Orchestration step that's stuck:** In the Process Orchestration, locate the specific Action Flow where the process is stuck in a running state. Review the flow to determine which step is not running properly.
2. **Review and correct the Action Flow:** Open the identified Action Flow and pinpoint the exact step where the failure occurred. Investigate the cause of the error within that step. For example, an incorrect URL or a missing configuration. See [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows").

   |  |
   | --- |
   |  |
3. **Save, test, and publish the changes:** After implementing the necessary corrections, validate the fix by running tests to ensure the Action Flow executes successfully. Once the results are satisfactory, proceed to save and deploy your changes.
4. **Retrieve Action Flow details from history:** Go to the Action Flow history for the failed instance. Open the Get Process Context module and copy the following key details:

   - Digital Process Instance ID
   - Action Flow Execution ID

   These details will be used to resume the failed Process Orchestration.

   |  |
   | --- |
   |  |
5. **Update the Action Flow execution ID:** Open the Action Flow in Edit Mode, then select the Get Process Context module. Expand the **Advanced Settings** section and update the **Action Flow Execution ID** with the value from the failed execution.

   |  |
   | --- |
   |  |
6. **Apply changes to Other Orchestration Engine modules:** Repeat the same procedure for other relevant modules of Orchestration Engine, such as Completion Event modules. Open each module, enable Advanced Settings, and update the Action Flow Execution ID with the value from the failed execution.

   |  |
   | --- |
   |  |
7. **Manually Run the Action Flow:** Execute the action flow manually by providing the Digital Process Instance ID (dpInstanceId). You can find it in the input of your Action Flow.

   |  |
   | --- |
   |  |

   Verify that the Action Flow runs successfully and that all previously failed steps complete as expected.
8. **Verify completion in Process Orchestration logs:** After successfully running the Action Flow, open the Process Orchestration log to confirm that the previously failed process step has completed. This ensures that the orchestration has resumed and is functioning as expected.

   |  |
   | --- |
   |  |

Once all steps have been completed and the issue has been resolved, no further action is required. The process orchestration should now be running as expected, and the action flow has successfully resumed.

## Related topics

- [Connecting Action Flows and Process Orchestration](connecting-action-flows-and-process-orchestration.html "Connecting Action Flows and Process Orchestration")
- [Action Flow modules in Process Orchestration](action-flows-in-process-orchestration.html "Action Flow modules in Process Orchestration")
- [Testing Process Orchestration](testing-process-orchestration.html "Testing Process Orchestration")


---

## automation/action-flows/troubleshooting-microsoft-action-flow-modules

# Known issues with Microsoft Action Flow modules

We've gathered some resources and troubleshooting tips that will help you resolve some problems you might encounter when working with Action Flow modules for Microsoft apps.

Expand all

[## Application is over its mailbox concurrency limit](#UUID-ed13e846-f121-a086-c28d-008a556d9857_section-idm234690597155341_body)

**Symptoms**

Your Action Flow operation fails with the following error: 429 Application is Over its Mailbox Concurrency Limit.

**Cause**

The 429 error indicating a "MailboxConcurrency limit" in Microsoft services occurs when the number of requests to an Outlook resource (like a mailbox or calendar) exceeds the set concurrency limits. Only four concurrent requests are allowed to a single mailbox or resource. If your application tries to send more than four simultaneous requests, you may encounter throttling, resulting in the 429 error.

**Solution**

You can use different methods to deal with this limitation:

- Add the **Sleep** module before the module that is causing the error. Set the delay to fit into the number of requests in the time limit. For example, if the app is limited to 10 requests per minute, set the delay to 6 seconds.
- Consider adding a Break Module which will trigger automatic retry of your execution in case of an error.

[## Service temporarily unavailable](#UUID-ed13e846-f121-a086-c28d-008a556d9857_section-idm23469376812585_body)

**Symptoms**

The service temporarily unavailable is usually signaled with a [503] error code.

**Cause**

There might be various causes for this issue. The most common ones are:

- Service Downtime: the Microsoft Graph API might be experiencing an outage or undergoing maintenance.
- Throttling: your application may have exceeded rate limits or concurrency limits. In such cases, the API may throttle requests temporarily, leading to a 503 error.
- High traffic or resource limits: If your requests are resource-intensive or the service is under heavy load, it may return a 503 error until the load decreases.
- Network issues: occasionally, network issues between your application and Microsoft Graph servers can cause temporary disruptions.

**Solution**

Retry the execution of your Action Flow. Consider adding a Break Module which will trigger automatic retry of your execution in case of an error.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/uipath--action-flow-

# UiPath (Action Flow)

With UiPath modules in Celonis platform, you can manage the jobs and queues in your UiPath account.

To use the UiPath modules, you must have an account. You can create an account at [account.uipath.com](https://account.uipath.com/login?state=hKFo2SBmUVktTkJnZm9kblRBRmptSTlHdW4ySXBMa0c1X3VpRqFupWxvZ2luo3RpZNkgRC1RU0RkSUI4UTg4NHVWcDQ4cFZUWUF3dV9WZ2VlR3GjY2lk2SAyeXQ5SGRGNDVPMDA2SDlxZFBjUDlhczVjZEdibkNXcw&client=2yt9HdF45O006H9qdPcP9as5cdGbnCWs&protocol=oauth2&audience=https%3A%2F%2Fuipath.eu.auth0.com%2Fapi%2Fv2%2F&scope=openid profile email read%3Acurrent_user update%3Acurrent_user_metadata&redirect_uri=https%3A%2F%2Fcloud.uipath.com%2Fportal_%2FauthCallback&type=signup&platform_name=UiPath Automation Cloud for enterprise&subscription_plan=trial&ecommerceRedirect=false&retryUrl=&product_name=UiPath Automation Cloud&company_code=B2B_CP&cloudrpa_signup_subdomain=%2Fportal_&register_endpoint=%2Fregister&use_local_registration=false&response_type=code&response_mode=query&nonce=OHJseEgzZXhSTkROTG5GVkxiZmNZb21xbUVNajRlanpVb2hSMktqWkJ4Qg%3D%3D&code_challenge=mpHECRdZmmBCLOJJGRDh32CPASPqfi8BE_McfXoDAO8&code_challenge_method=S256&auth0Client=eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4yLjAifQ%3D%3D).

Refer to the [UiPath API documentation](https://docs.uipath.com/orchestrator/automation-cloud/latest/api-guide/building-api-requests) for a list of available endpoints.

Expand all

[## Connecting UiPath to Celonis platform](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_UUID-cfcbe497-1ead-aec8-24b8-5a30fcfc0589_body)

To establish the connection, you must:

1. [Obtain your credentials in UiPath.](uipath--action-flow-.html#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm234498826760679 "Obtaining your credentials in UiPath")
2. [Establish the connection in Celonis platform.](uipath--action-flow-.html#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm234498831997719 "Establishing the connection with UiPath in Celonis platform")

[### Obtaining your credentials in UiPath](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm234498826760679_body)

To obtain your credentials from your UiPath account:

1. Log in to your UiPath account.
2. In the left navigation, click the 3 dots for more options.
3. Click **Admin**.
4. On the Administration page, click **External Application > + Add application**.
5. Enter the **Application name**.
6. Click **+ Add scopes**, select **Orchestrator API Access** from the **Resource** drop down, and add the following scopes under the **Application scope(s)** tab:

   - OR.Robots.Read
   - OR.Queues
   - OR.Jobs
   - OR.Execution.Read
   - OR.Folders.Read
   - OR.Settings.Read
7. Click **Save**.
8. Enter a **Redirect URL** and click **Add**.
9. Copy the **App ID** and the **App Secret** and and store it in a safe place.
10. Click **Close**.
11. Click your profile icon at the top right, then click **Preferences**.
12. Go to the **Privacy & security** section.
13. In the **Orchestrator API access** table, find the record you need, and click **View API access**.
14. Copy your **User key**, **Organization ID** and **Name** and store it in a safe place.

You will use these values in the **User key**, **UiPath Organisation ID**, **UiPath Tenant Name**, **Client ID**, and **Client Secret** fields in Celonis platform.

[### Establishing the connection with UiPath in Celonis platform](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm234498831997719_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a UiPath module to your Action Flow, and click **Create a connection**.
2. Select a **Connection type**:

   - UiPath Cloud
   - UiPath Cloud (client credentials)

   Note: the fields you use to connect will vary depending on the Connection type you select.
3. Optional: In the **Connection name** field, enter a name for the connection.
4. If you selected UiPath Cloud as your Connection type, enter the User key in the **UiPath User Key** field.
5. In the **UiPath Organisation ID** field, enter the Organization ID copied above.
6. In the **UiPath Tenant Name** field, enter the Name copied above.
7. In the **UiPath Client ID** field, enter the App ID copied above.
8. If you selected UiPath (client credentials) as your Connection type, enter the App secret in the **Client Secret** field.
9. Click **Save**.
10. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more UiPath modules.

[## Building UiPath Action Flows](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_UUID-52d1aa86-da83-6b2a-d6f8-d2cd3e6da07d_body)

After connecting the app, you can perform the following actions:

### Job

[#### Start a Job](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm1953396665855258_body)

Starts a UiPath job by triggering a selected process.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your UiPath account.](uipath--action-flow-.html#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_UUID-cfcbe497-1ead-aec8-24b8-5a30fcfc0589 "Connecting UiPath to Celonis platform") |
| **Select UiPath Folder** | Select or map the UiPath folder that contains the process you want to execute. |
| **Select UiPath Process** | Select the UiPath process to start the job. |
| **Select UiPath Robots** | Select a robot to execute the process. |
| **Add Input Arguments** | If there are any input variables configured for the process in your UiPath account, they would be shown in the app when you select the process. |

### Queue

[#### Add an Item to a Queue](#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_section-idm1956793332283962_body)

Add items to an UiPath queue.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your UiPath account.](uipath--action-flow-.html#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_UUID-cfcbe497-1ead-aec8-24b8-5a30fcfc0589 "Connecting UiPath to Celonis platform") |
| **Select UiPath Folder** | Select or map the folder that contains the queue for which you want to add the items. |
| **Select UiPath Queue** | Select or map the queue to which you want to add the items. |
| **Add Specific Content** | Enter or map the specific Key-Value pair to add the items to the queue. Refer to the [UiPath documentation](https://docs.uipath.com/orchestrator/standalone/2023.10/api-guide/queue-items-requests) to learn more about queue item requests. |
| **Set Priority** | From the Priority list, select the item's priority. |
| **Reference** | Enter or map the reference to link your transactions to other applications used within an automation project. This reference enables you to search for certain transactions, in UiPath Orchestrator, according to the provided string. |

### Other

[#### Make an API Call](#id627457_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your UiPath account.](uipath--action-flow-.html#UUID-844f222a-0cad-6f0f-33e9-ab0956068a8e_UUID-cfcbe497-1ead-aec8-24b8-5a30fcfc0589 "Connecting UiPath to Celonis platform") |
| **URL** | Enter a path relative to `https://cloud.uipath.com/celonisee/DefaultTenant`. For example, `/odata/QueueDefinitions` |
| **Method** | Select the HTTP method you want to use:  GET to retrieve information for an entry.  POST to create a new entry.  PUT to update/replace an existing entry.  PATCH to make a partial entry update.  DELETE to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/update-tasks--action-flow-

# Update Tasks (Action Flow)

The Update Task Action Flow module allows you to update the Status and the Assignee of existing Tasks.

Expand all

[## Before you begin](#UUID-b87d5783-972a-0f0d-c391-2bd5c1b218aa_section-id235485490172583_body)

- This module can be used only with record-based Tasks.
- If you want to use the OAuth connection method for your Action Flow, your OAuth app must have the following scopes assigned to it:

  - *knowledge-models:read*
  - *tasks:update*

[## Configuring the Update Tasks module](#UUID-b87d5783-972a-0f0d-c391-2bd5c1b218aa_section-id23548550235066_body)

1. In Studio, go to your package and click **New asset** > **Action Flow**.
2. Click **Add module** and from the list select **Celonis** > **Update Tasks**.
3. Select the **Knowledge Model** of the record for which you would like to update Tasks.
4. Select the **Record** containing the Tasks you wish to update with this Action.
5. Specify which **Tasks** should be updated.

   Normally, you use the outputs of previous actions, for example, the [Get Rows](get-rows--action-flow-.html "Get Rows (Action Flow)") or the Get Tasks action which both return Task IDs.
6. Select the **Status** to which the Task(s) should be updated. Leave this empty to keep the current Task status.
7. Select the **Assignee** to whom the Task(s) should be sent. Leave this empty to keep the current task status.

   |  |
   | --- |
   |  |
8. Save your changes and deploy the Action Flow for your Action Flow to be operational.

## Related topics

- [Creating an Action in the Knowledge Model](creating-an-action-in-the-knowledge-model.html "Creating an Action in the Knowledge Model")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Scheduling](scheduling-action-flows.html "Scheduling Action Flows")


---

## automation/action-flows/use-case-templates-for-action-flows

# Use case templates for Action Flows

**Use case templates** - these are end-to-end automation workflows that can serve stand-alone automation. Use Case template are great if you want to save time on crafting your custom Action Flow and want to focus on the output of your automation.

Expand all

[## Send PDF Report using Mail](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569634532652_body)

Use this template to:

- create a PDF report from a Studio Analysis
- send PDF to specified email recipients

For more information on how to set up an Action Flow using this template, see [Send PDF Report via Mail](send-pdf-report-via-mail.html "Send PDF Report via Mail").

|  |
| --- |
|  |

[## Archive invoice attachments in emails to SharePoint](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569645501052_body)

Use this template to:

- parse your emails
- filter the attachments
- archive in OneDrive

For more information on how to set up an Action Flow using this template, see [Archive invoice attachments in emails to Sharepoint](archive-invoice-attachments-in-emails-to-sharepoint.html "Archive invoice attachments in emails to Sharepoint").

|  |
| --- |
|  |

[## Create new Sales Order from CSV files](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569786424511_body)

Use this template to:

- read CSV files
- create Sales Orders in SAP

For more information on how to set up an Action Flow using this template, see [Create new Sales Order from CSV files](create-new-sales-order-from-csv-files.html "Create new Sales Order from CSV files").

|  |
| --- |
|  |

[## Escalate urgent Orders to Order Managers](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569793010228_body)

Use this template to:

- consolidate data
- build HTML snippet
- notify using Teams

For more information on how to set up an Action Flow using this template, see [Escalate urgent Orders to Order Managers](escalate-urgent-orders-to-order-managers.html "Escalate urgent Orders to Order Managers").

|  |
| --- |
|  |

[## Notify about Manual Delivery Blocks once](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569796291482_body)

Use this template to:

- query Sales Orders which got a manually set Delivery Block
- filter out distinct values
- send E-Mail with those Sales Orders
- write Sales Orders into table and pushes Table back to Celonis Data Integration
- add Filter for previously checked Sales Orders to not include twice

For more information on how to set up an Action Flow using this template, see [Notify about Manual Delivery Blocks once](notify-about-manual-delivery-blocks-once.html "Notify about Manual Delivery Blocks once").

|  |
| --- |
|  |

[## Route Communication](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569798404425_body)

Use this template to:

- consolidate data
- split data and prepares for sending
- get right assignee
- forward message to right assignee

For more information on how to set up an Action Flow using this template, see [Route Communication](route-communication.html "Route Communication").

|  |
| --- |
|  |

[## Trigger Machine Learning Script](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569801833029_body)

Use this template to:

- watch a Slack Channel for a trigger phrase
- trigger a Machine Learning script

For more information on how to set up an Action Flow using this template, see [Trigger Machine Learning Script](trigger-machine-learning-script.html "Trigger Machine Learning Script").

|  |
| --- |
|  |

[## Trigger Warning Email grouped by contact in Business View](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569805342611_body)

Use this template to:

- receive bundles sent by a Skill
- query Data for the Purchase Orders received
- group Purchase Orders by contact person & sends that via email to the contact

For more information on how to set up an Action Flow using this template, see [Trigger Warning Email grouped by contact in Business View](trigger-warning-email-grouped-by-contact-in-business-view.html "Trigger Warning Email grouped by contact in Business View").

|  |
| --- |
|  |

[## Send Excel File using mail](#UUID-52190a40-3c9d-3811-de98-8c5f59ea0a53_section-idm234569807981385_body)

Use this template to:

- Create a Microsoft 365 Excel Table from scratch with custom header
- Fill Excel table with Celonis Data
- Send data both as an HTML table in-line and as an Excel file via mail

For more information on how to set up an Action Flow using this template, see [Send Excel File via Mail](send-excel-file-via-mail.html "Send Excel File via Mail").


---

## automation/action-flows/using-error-handlers-in-action-flows

# Using error handlers in Action Flows

Whether it's a problem with data validation or a service being unavailable, error handlers allow you to define how your Action Flow should behave in case of an error.

By adding an error handler to an Action Flow, you can replace the default error handling logic with your own. Celonis Platform offers five different types of error handlers, any of which can be inserted at the end of your automation.

Expand all

[## Adding error handlers to Action Flows](#UUID-9eccef11-7bff-a9d0-8f50-4448f2a5a956_section-id235271240351108_body)

To an error handler to your Action Flow:

1. In Studio, go to your package and start editing an existing Action Flow or start a new one by clicking **New asset** > **Action Flow**.
2. In the edit mode, right-click your module and select **Add error handler**.
3. Select from the following error handlers:

   Use one of the following error handlers if you want the Action Flow execution to continue despite any errors.

   - **Resume** allows you to specify a substitute output for the module with the error and the Action Flow execution status is marked as a success. For details, ee [Resume error handler](resume-error-handler.html "Resume error handler").
   - **Ignore** simply ignores the error and the Action Flow execution status is marked as a success. For details, see [Ignore error handler](ignore-error-handler-3135832.html "Ignore error handler").
   - **Break** stores the input to the queue of [incomplete executions](incomplete-executions.html "Incomplete executions") and the Action Flow execution status is marked as a *warning*. For details, see [Break error handler](break-error-handler.html "Break error handler")

   Use one of the following error handler if you want the Action Flow to stop when there's an error:

   - **Rollback** stops the Action Flow execution immediately and marks its status as an *error*. For details, see [Rollback error handler](rollback-error-handler.html "Rollback error handler").
   - **Commit** stops the Action Flow execution immediately and marks its status as a *success*. For details, see [Commit error handler](commit-error-handler.html "Commit error handler").

Save and publish your Action Flow for the error handlers to be active. You can learn more about other methods of dealing with errors in your automation in [Advanced error handling](advanced-error-handling.html "Advanced error handling") .

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/watsonx-ai--action-flow-

# watsonx.ai (Action Flow)

With watsonx.ai modules in Celonis platform, you can infer the next tokens using a selected model and set of parameters in your watsonx.ai account.

To use the watsonx.ai modules, you must have an IBM watsonx.ai account. You can create an account at [ibm.com/products/watsonx-ai](https://www.ibm.com/products/watsonx-ai).

Refer to the [IBM watson.ai API documentation](https://cloud.ibm.com/apidocs/watsonx-ai) for a list of available endpoints.

Expand all

[## Connecting watsonx.ai to Celonis platform](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm1953397702394996_body)

To establish the connection, you must:

1. [Obtain your API key in watsonx.ai.](watsonx-ai--action-flow-.html#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm19557760940714968 "Obtaining your API key in watsonx.ai")
2. [Establish the connection in Celonis platform.](watsonx-ai--action-flow-.html#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm195176680524539898 "Establishing the connection with watsonx.ai in Celonis platform")

[### Obtaining your API key in watsonx.ai](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm19557760940714968_body)

To obtain your API key from your watsonx.ai account:

1. Log in to your watsonx.ai account using [cloud.ibm.com](http://cloud.ibm.com).
2. Click **Manage** > **Access (IAM)** > **API keys**.
3. Enter a **Name** and **Description** for your API key and click **Create**.
4. Copy the **API key** value shown and store it in a safe place.

You will use this value in the **API Key** field in Celonis platform.

**Note**

At the time of this publication, all steps for [Obtain your API key in watsonx.ai](watsonx-ai--action-flow-.html#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_N1714999824347) were checked and verified to be accurate. However this may have changed, so please see the [IBM watsonx.ai documentation](https://ibm.github.io/watsonx-genai-lab/lab-2/#:~:text=Create%20a%20watsonx.ai%20API%20key,-If%20you%20have&text=Log%20in%20to%20watsonx.ai,API%20Keys%2C%20and%20click%20Create.) for the most up-to-date directions.

[### Establishing the connection with watsonx.ai in Celonis platform](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm195176680524539898_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a watsonx.ai module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **IBM Cloud Region** field, select a region.
4. In the **Connection Level** field, select **Space** or **Project**.
5. If you selected **Space** for your **Connection Level**, enter your **Space ID**. If you selected **Project** for your **Connection Level**, enter your **Project ID**.

   Your Project ID and Space ID can be found in your [watsonx.ai account](https://dataplatform.cloud.ibm.com/).

   |  |  |
   | --- | --- |
   | **Project ID** | Select the 4-bar menu in the upper-left corner, click **Projects**, and then click **View all projects**.  Select your project and click the **Manage** tab. Your Project ID is listed in your project details. |
   | **Space ID** | The Space ID is shown in the model's URL in your browser’s address bar. Copy the part of the URL that follows `&space_id=`. |
6. In the **API Key** field, enter the API key copied above.
7. Click **Save**.
8. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more modules.

[## Building watsonx.ai Action Flows](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_UUID-fd4c3cc0-7fc3-ffdd-b21f-0ecf5ec555eb_body)

After connecting the app, you can perform the following actions:

### Text Generation

[#### Infer Text](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm1953396665855258_body)

Infer the text with a selected model and a set of parameters.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your watsonx.ai account. |
| **Model ID** | Select the model you want to use. |
| **Input** | Enter the prompt to generate completions. |
| **Maximum New Tokens** | Enter the maximum number of new tokens to be generated. The maximum supported value for this field depends on the model being used.  How the token is defined depends on the tokenizer and vocabulary size, which in turn depends on the model. Often the tokens are a mix of full words and sub-words. To learn more about tokenization, see here.  Depending on the users plan, and on the model being used, there may be an enforced maximum number of new tokens. |
| **Minimum New Tokens** | Enter the minimum number of new tokens to be generated. If stop sequences are given, they are ignored until minimum tokens are generated. |
| **Temperature** | Enter a a value lower than or equal to 2. This value is used to modify the next-token probabilities in sampling mode. Values less than 1.0 sharpen the probability distribution, resulting in less variability in output. Values greater than 1.0 flatten the probability distribution, resulting in greater variability in output. |
| **Decoding Method** | Select the decoding method you wish to use. **Greedy decoding** selects the token with the highest probability at each step of the decoding process. **Sample decoding** offers more variability in how tokens are selected. |
| **Length Penalty** | This setting can help to shorten the answers provided.  |  |  | | --- | --- | | **Decay Factor** | Represents the factor of exponential decay. Larger values correspond to more aggressive decay. Value must be higher than or equal to 1. | | **Start Index** | A number of generated tokens after which this should take effect. Value must be higher than or equal to 0. | |
| **Random Seed** | Enter a value higher than or equal to 1. The random number generator seed is used in sampling mode for experimental repeatability. To produce repeatable results, set the same random seed value every time. |
| **Time Limit** | Enter the time limit in milliseconds. If not completed within this time, the generation will stop.  Depending on your plan and on the model being used, there may be an enforced maximum time limit. |
| **Top-K** | Enter how many tokens to sample. Must be a number between 1 and 100. |
| **Top-P** | Enter a value lower than or equal to 1. The Top-P value specifies the cumulative probability score threshold the tokens must read. This is also known as nucleus sampling. |
| **Repetition Penalty** | Enter a value between 1 and 2. A higher value leads to more diverse and varied output. A lower value will increase the probability of repeated text. |
| **Truncate Input Tokens** | Enter a value to specify the maximum number of tokens accepted in the input. A value of 0 means the input will not be truncated. |
| **Include Stop Sequence** | Select **Yes** or **No**.  Stop sequences are one or more strings which will cause the text generation to stop if/when they are produced as part of the output. Stop sequences encountered prior to the minimum number of tokens being generated will be ignored. |
| **Return Options** | |  |  | | --- | --- | | **Input Text** | Select **Yes**, **No**, or **Empty**. | | **Generated Tokens** | Select **Yes**, **No**, or **Empty**. | | **Input Tokens** | Select **Yes**, **No**, or **Empty**. | | **Token Logprobs** | Select **Yes**, **No**, or **Empty**. | | **Token Ranks** | Select **Yes**, **No**, or **Empty**. | | **Top n Tokens** | A higher value allows for more options to be considered, while a lower value creates more focused responses. | |

### Other

[#### Make an API Call](#UUID-4f91a13d-e4c0-2bef-2f45-7617dc0ab2ce_section-idm1956793332283962_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your watsonx.ai account. |
| **URL** | Enter a path relative to `https://www.example.com/api`, e.g. `/v2/users` |
| **Method** | Select the method type.  - **GET** - to retrieve information for an entry - **POST** - to create a new entry - **PUT** - to update/replace an existing entry - **PATCH** - to make a partial entry update - **DELETE** - to delete an entry. |
| **Headers** | Enter the desired request headers. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/webhooks--action-flow-

# Webhooks (Action Flow)

Webhooks allow you to send data to Celonis platform over HTTPS. Webhooks create a URL that you can call from an external app or service, or from another Celonis platform Action Flow. Use webhooks to trigger the execution of Action Flows.

Webhooks usually act as instant triggers. Contrary to scheduled triggers, which periodically ask a given service for new data to be processed, webhooks execute the Action Flow immediately after the webhook URL receives a request.

Celonis platform supports the following types of webhooks:

- App-specific webhooks listen for data coming out of a specific app, also called instant triggers.
- Custom webhooks allow you to create a URL to which you can send any data.

Expand all

[## Creating custom webhooks](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-ddc88758-9504-99ed-8778-e26fd92d6d12_body)

To create a webhook, you must insert the **Custom webhook** module to a Action Flow.

**Note**

Each Action Flow must use its own webhook. You can not use one webhook in multiple Action Flows.

[### Inserting webhooks to Action Flows](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_section-idm4583774785163232891557978833_body)

1. Insert the **Custom Webhook** module from the **Webhooks** app.
2. In the module's settings, click **Add**.
3. Set the webhook's name and other settings, then click **Save**.

Celonis platform generates a URL and starts listening for requests to this URL. Send a request to this URL to have Celonis platform automatically determine the data structure for this webhook. See setting up webhook data structure below for more details.

**Note**

You can access the webhook's details and change the webhook's settings in the *Webhooks* section in the left menu.

[### Setting up webhook data structure](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_section-idm4542014625156832891561113567_body)

Optionally, you can let Celonis platform know what data structure to expect in the webhook request payload. Celonis platform can use data structures to validate the incoming data. If you do not set up a data structure, Celonis platform will pass the incoming data to subsequent modules in your Action Flow without any validation.

To enable validating incoming data, set up the webhook's data structure in one of the following ways:

- Create a new data structure manually in the *Data structures* section.
- Use an existing data structure.

You can also use the following methods to let Celonis platform know what data structure to expect.

**Notice**

Note that these methods **do not enable data validation**. The data structure set up in this way only helps with mapping the webhook data to subsequent modules in your Action Flow.

- Create a data structure immediately after creating the webhook by calling the webhook URL with sample data in the request body.
- Re-determine the data structure of an existing webhook going to the Webhook module settings, clicking *Re-determine data structure*, and calling the webhook URL with sample data in the request body.

If you call the webhook URL to automatically determine or re-determine the data structure, Celonis platform does not create a reusable data structure in the Data structures section. The data structure determined in this way is stored internally with the particular webhook. In this case, Celonis platform does not validate incoming data.

[## Editing custom webhook settings](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_section-idm234982355408979_body)

To adjust a custom webhook's settings, click Webhooks in the left menu and Edit a webhook. This is only applicable for custom Webhooks module.

| Setting | Description |
| --- | --- |
| **Data structure** | Select an existing data structure or create a new data structure for the webhook. We will use the data structure to validate the incoming data. Requests that don't pass validation will be rejected with HTTP status code 400. |
| **Get request headers** | Extracts headers data from the webhook request and makes the data available for mapping in the scenario. |
| **Get request HTTP method** | Extracts the HTTP method from the request and makes the method available for mapping in the scenario. |
| **JSON pass-through** | Passes JSON payloads to subsequent modules in the scenario as a text string, as opposed to breaking the payload down into mappable fields. |

[## Scheduling webhooks processing](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-6e6dd911-f4f8-e928-a84b-deb5087132d4_body)

By default, when Celonis platform receives data on a webhook, your Action Flow executes immediately. If you don't want to run your Action Flow immediately after a webhook receives data, you can schedule your Action Flow to process all webhook requests periodically.

1. Edit the Action Flow which is triggered by your webhook.
2. Edit the Action Flow schedule settings.

   OR

   Edit the schedule settings of the webhook module.
3. Set up your desired schedule.

When a scheduled webhook receives data, Celonis platform stores the data in the webhook's queue. The whole queue is then processed every time your schedule criteria are met.

[## How Celonis platform processes webhooks](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-bab0de61-c338-5e3f-30bc-6d0ccd272acc_body)

When a webhook receives a request, the system stores the request in the webhook's queue. Each webhook has its own queue. Go to the **Webhooks** section in the left menu to view all webhooks and their queues.

### Parallel vs. sequential processing

If you are using instant webhooks, Celonis platform starts processing each request immediately as the request is received. By default, Action Flows **with instant webhooks are processed in parallel**. Even if a previous Action Flow execution is still being processed, Celonis platform does not wait for its processing to complete.

You can inspect all running executions in the Action Flow detail. Click an item in the list of running executions to view the graphical representation of that particular execution. The execution that is currently displayed is marked with an eye icon.

**To turn off parallel processing**, open the settings of your Action Flow and select **Sequential processing**. With sequential processing enabled, Celonis platform waits until the previous execution is complete before starting the next one. Also, use sequential processing when you need to process your webhook requests in the order that they came in.

### Processing scheduled webhooks

If you are using scheduled webhooks, requests accumulate in the queue until the schedule criteria are met. When schedule criteria are met, Celonis platform processes the queued requests based on the *Maximum number of results* that you set for the webhook.

For example, if your scenario is scheduled to run every hour and your *Maximum number of results* is set to the default value of 2, Celonis platform processes two items from the queue every hour. If your webhook queue is filling up with requests, increase the *Maximum number of results* or adjust the schedule to execute the scenario more often.

**Note**

**Instant trigger** modules have the *Maximum number of cycles* parameter instead of the *Maximum number of results*.

Set the *Maximum number of cycles* in the **instant trigger** modules to get the same data processing behavior as is with webhooks and the *Maximum number of results* parameter.

### Webhook queue details

When data arrives to a webhook and the call is not processed instantly, Celonis platform stores it in the webhook processing queue.

The limit for the number of webhook queue items depends on your usage allowance, which is a part of your subscription. For every 10,000 operations licensed per month, you can have up to 667 items in each webhook's queue. The maximum number is 10,000 items in the webhook's queue.

When the webhook queue is full, Celonis platform rejects all incoming webhook data which is over the limit.

Incoming webhook data is always stored in the queue regardless of the data is confidential option settings. As soon as the data is processed in a Action Flow, it is permanently deleted.

#### View webhook queue

To view the content of the queue, follow the steps below.

1. Go to the **Webhooks** section in the left menu.
2. Find the webhook whose queue you want to view.
3. Click the specific webhook on the list to inspect its details.

   You can see:

   - Webhook status
   - Webhook URL and webhook UDID (unique webhook identifier)
   - Status of your Action Flow
   - Action Flow ID and Action Flow URL
4. To see the webhook's queue, click **Queue**.

   You can also click the button with the truck icon on the **Webhooks** page.

   The webhook's queue displays.
5. Click **Detail** by the webhook you want to inspect.

   You can see the parsed items.

#### Expiration of inactive webhooks

Make automatically deactivates webhooks that are not connected to any scenario for more than 5 days (120 hours). The hook return `410 Gone` status code.

|  |
| --- |
|  |

#### Delete webhook item from a queue

1. Go to the **Webhooks** section in the menu on the left.
2. Click the button with the truck icon to see the webhook's queue.

   The webhook's queue displays.
3. Tick the box on the left in front of the entries you want to delete.
4. Click **Delete selected** to delete the chosen webhook(s).

   To delete all, tick the first box on the left and then **Delete all**.

   Click **OK** to confirm.

You have deleted the incoming webhook item(s) from the queue.

#### Webhook logs

Celonis platform stores webhook logs for 3 days. For the organizations on the Enterprise plan,Celonis platform keeps the webhook logs for 30 days. Celonis platform deletes logs older than other retention limit.

To view webhook logs, follow the steps below.

1. Go to the **Webhooks** section in the menu on the left.
2. Click the specific webhook on the list to inspect its details.
3. Click **Logs**.

   You can see:

   - Status of the webhook call (success, warning, error, or all)

     To filter the webhook logs by status, click the filter icon.
   - Date and time of the incoming webhook

     To sort the webhook log by date and time, click the arrow.
   - Webhook execution log size
4. To see the detail of the specific webhook log, click **Detail**.

You can see:

- Webhook request (timestamp, URL, method, headers, query, body)
- Webhook response (status, headers, body)
- Parsed items

  Parsed items combine the query parameters and body of the webhook request in one bundle.

[## Webhook settings](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-013e63d3-672f-3b66-9aa4-0fc220a78932_body)

To adjust a webhook's settings, click Webhooks in the left menu and Edit a webhook.

|  |  |
| --- | --- |
| **Setting** | **Description** |
| **Data structure** | Select an existing data structure or create a new data structure for the webhook. Celonis platform will use the data structure to validate the incoming data. Requests that don't pass validation will be rejected with HTTP status code 400. |
| **Get request headers** | Extracts headers data from the webhook request and makes the data available for mapping in the scenario. |
| **Get request HTTP method** | Extracts the HTTP method from the request and makes the method available for mapping in the scenario. |
| **JSON pass-through** | Passes JSON payloads to subsequent modules in the scenario as a text string, as opposed to breaking the payload down into mappable fields. |

[## Error Handling](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-771ae66d-56ce-1553-33a7-61238d241a52_body)

When there is an error in your scenario with a webhook, the scenario:

- stops immediately - when the scenario is set to run *Immediately*.
- stops after 3 unsuccessful attempts (3 errors) - when the scenario is set to run as **scheduled**.

[## Supported incoming data formats](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-6f04afa5-c3a3-1c54-430e-dfdd4492bcfe_body)

Celonis platform supports the following formats of incoming data:

- Query string
- Form data
- JSON

If a webhook receives data in both the query string and either form data or JSON data at the same time, the system combines the data into a single bundle. If the request contains duplicate data in different formats, the query string takes precedence and overwrites the data that was received in the other formats. We recommend you do not duplicate data in query strings, form data, and JSON.

### Query String

```
GET
https://hook.celonis.com/yourunique32characterslongstring?name=Celonis platform&amp;job=automate
```

### Form Data

```
POST
https://hook.celonis.com/yourunique32characterslongstring
Content-Type: application/x-www-form-urlencoded

name=Integrobot&job=automate
```

### Multipart

```
POST
https://hook.celonis.com/yourunique32characterslongstring
Content-Type: multipart/form-data; boundary=---generatedboundary

---generatedboundary
Content-Disposition: form-data; name="file"; filename="file.txt"
Content-Type: text/plain

Content of file.txt
---generatedboundary
Content-Disposition: form-data; name="name"
Celonis platform
---generatedboundary
```

In order to receive files encoded with `multipart/form-data`, it is necessary to configure a data structure with a  `collection` type field that contains the nested fields   `name`, `mime` and `data`. The field `name` is a `text` type and contains the name of the uploaded file. The mime is a text type and contains a file in the [[MIME] format](https://en.wikipedia.org/wiki/MIME). The field `data` is a `buffer` type and contains binary data for the file being transferred.

### JSON

```
POST
https://hook.celonis.com/yourunique32characterslongstring
Content-Type: application/json

{"name": "Integrobot", "job": "automate"}
```

To access the original JSON, open the webhook's settings and enable the *JSON pass-through* option:

The maximum allowed webhook's payload size (`Content-Length`) is 5 MB (5.242.880 bytes) regardless of the subscription tier.

[## Webhook headers](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-6485a01b-cbbd-22a6-9c0d-5328e1ec47d7_body)

To access the webhook's headers, enable the *Get request headers* option in the webhook's setup:

You can then extract a particular header value with the combination of `map()` & `get()` functions. The example below shows a formula that extracts the value of the `authorization` header from the `Headers[]` array. The formula is used in a filter that compares the extracted value with the given text to pass only webhooks if there is a match.

[## Responding to webhooks](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-3d6b5379-9b8b-26ec-4846-efc4e5abda56_body)

The default response to a webhook call contains just a simple text, "Accepted". The response is returned to the webhook's caller right away during the execution of the **Custom Webhook** module. You can easily test it like this:

1. Place the **Custom Webhook** module in your Action Flow.
2. Add a new webhook in the module's configuration.
3. Copy the webhook's URL to your clipboard.
4. Run the Action Flow - the **Custom Webhook** module should be waiting for the webhook call (see on the right)
5. Open a new browser window, paste the copied URL in the address bar and press Enter.
6. The **Custom Webhook** module will be triggered and the browser will display the following page:

These are default responses when the Action Flow **does not contain** the **Webhook Response** module:

|  |  |  |
| --- | --- | --- |
|  | HTTP status code | Body |
| Webhook accepted in the queue | 200 | Accepted |
| Webhook queue full | 400 | Queue is full. |

If you wish to customize the webhook's response, employ the module **Webhook Response**. The configuration of the module contains two fields: *Status* and *Body*. The *Status* field should contain [HTTP response status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) like 2xx for Success (e.g.`200` for OK), 3xx for Redirection (e.g.`307` for Temporary Redirect), 4xx for Client errors (e.g. `400` for Bad Request), etc. The *Body* field should contain anything that will be accepted by the webhook's call. It can be a simple text, HTML, XML, JSON, etc. It is advisable to set the `Content-Type` header to the corresponding [mime type](https://en.wikipedia.org/wiki/Media_type): `text/plain` for plain text, `text/html` for HTML, `application/json` for JSON, `application/xml` for XML, etc.

These are additional default responses when the Action Flow **does contain** the **Webhook Response** module:

|  |  |  |
| --- | --- | --- |
|  | HTTP status code | Body |
| Action Flow encounters an error | 500 | Action Flow failed to complete. |

The timeout for sending a response is 180 seconds. If the response is not available within that period, Celonis platform returns a '200 Accepted' status.

[## HTML Response example](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-eb470aba-320b-4340-7e66-b9be99737a5d_body)

Configure the **Webhook Response** module as follows:

|  |  |
| --- | --- |
| **Status** | [2xx success HTTP status code,](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#2xx_Success) e.g. `200` |
| **Body** | HTML code, e.g.:  ``` <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <title>Thank you!</title> </head> <body>Thank you, {{1.name}}, for your request! </body> </html> ``` |
| **Custom headers** | |  |  | | --- | --- | | **Key** | Content-type | | **Value** | text/html | |

It will produce an HTML response that will be displayed like this in a web browser:

[## Redirect example](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-690d49b6-f517-a8f3-0f43-95e0f39c444d_body)

Configure the **Webhook Response** module as follows:

|  |  |
| --- | --- |
| **Status** | [3xx redirection HTTP status code](https://en.wikipedia.org/wiki/URL_redirection#HTTP_status_codes_3xx), e.g. `303` |
| **Custom headers** | |  |  | | --- | --- | | **Key** | Location | | **Value** | The URL you would like to redirect to. | |

[## Custom mailhook](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-75f6686f-4980-7535-875f-da4e3fea3b8e_body)

Mailhook is an instant trigger module that can be triggered by sending an email to the email address generated by this module.

**Mailhook attachment size limit**

The maximum size of an email, including its attachments, that you send to a mailhook is 25 MB.

### Example Of Use

Mailhook will monitor your incoming emails without the need to have a scheduled run of the Action Flow.

1. Add the Custom mailhook to your Action Flow (Webhooks > Custom mailhook).
2. Generate a mailhook email address, and copy the address to the clipboard.
3. Save and run the Action Flow.
4. Open your email account settings, and configure forwarding. Use the email address generated by the *Custom mailhook* module in step 2 (above) as the forwarding address.

For ***Gmail***:

1. Click the cogwheel () in the top-right corner, and then click *See all settings*.
2. Open the *Forwarding and POP/IMAP* tab.
3. Click the *Add a forwarding address* button.
4. Enter the email address you have generated and copied in step 2 above, and click *Next*.
5. After that, a popup window will appear. Click *Proceed*.
6. A confirmation link has been sent to your mailhook. Run the custom mailhook module to see this code in the output under *Bundle* > *Text*.

   |  |
   | --- |
   |  |

   **Note**

   If you use Gmail for work or school, you don't need to verify the forwarding address.
7. Enable the forwarding, and save changes.

Add other desired modules to the Action Flow. Then save and activate the Action Flow

Now, every time a new email is received in your email account, the *Custom mailhook* module in your Celonis platform Action Flow is triggered and receives the email message data.

**Tip**

The sender and various recipient addresses (To: CC: and BCC:) are resolved in the data structure of the incoming mail. Reply-To: can be found in the Header section.

[## Webhook rate limit](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-902225cc-7c8a-22f4-8d76-c885840d815f_body)

Celonis platform can process up to 30 incoming webhook requests per second.

If you send more than 30 requests per second, the system returns an error with status code 429.

[## Troubleshooting Webhooks](#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-1b014539-fb9d-14ce-1008-9421d28c07e2_body)

### Missing items in the mapping panel

If some items are missing in the mapping panel in the setup of the modules following the **Webhooks > Custom Webhook** module, click the **Webhooks > Custom Webhook** module to open its setup and click **Re-determine data structure**:

|  |
| --- |
|  |

Then follow the steps described in the section [Determine the webhook's data structure](webhooks--action-flow-.html#UUID-2e3931b6-69da-78a7-0586-76c485440cd2_UUID-ddc88758-9504-99ed-8778-e26fd92d6d12 "Creating custom webhooks").

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/whatsapp-business-cloud--action-flow-

# WhatsApp Business Cloud (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With WhatsApp Business Cloud modules in Celonis platform, you can:

- watch events, send a message, and template messages
- upload and download media
- enable two-step verification, register, verify, and deregister senders
- retrieve and update business profiles

**Caution**

Please note that it is not possible to use the phone number registered in the WhatsApp Business app or your personal WhatsApp number, which you use for communicating with friends and family. You will need a separate dedicated phone number for the API. For more information, please refer to the [Could API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api).

Expand all

[## Before you begin](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-id235539297286002_body)

To get started with WhatsApp Business Cloud, you need:

- A [Facebook Developer](https://developers.facebook.com/) account
- A valid mobile phone number.

  **Note**

  Before you begin, understand the following information about the phone numbers:

  - The phone number should not be registered with your personal WhatsApp account which you use to communicate with your friends and family. If already registered, delete the existing account on your mobile to register with WhatsApp Business Cloud.
  - You cannot use the same phone number simultaneously on both [on-premise](https://developers.facebook.com/docs/whatsapp/on-premises) and [Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) at the same time. Only one platform is supported at a time with the phone number. See [overview](https://developers.facebook.com/docs/whatsapp/cloud-api/overview/) and [phone numbers](https://developers.facebook.com/docs/whatsapp/phone-numbers).
  - Do not infringe the WhatsApp Terms and Conditions: "If you use anything other than the official WhatsApp Business Platform or other official WhatsApp tools, We reserve the right to limit or remove your access to WhatsApp as this violates our policies. Please do not use any non-WhatsApp authorized third-party tools to communicate on WhatsApp. See Unauthorized use of automated or bulk messaging on WhatsApp for more information".

[## Setting Up WhatsApp Cloud API](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-efb2b4ce-8557-7f3a-800e-ac6b68b03e91_body)

To set up WhatsApp Cloud API:

1. Log in to your Facebook account.
2. Go to the [Facebook Developer Site](https://developers.facebook.com/), click **My Apps > Create App**.
3. Select **Business** as the app type. Click **Next**.

   |  |
   | --- |
   |  |
4. Enter the display name and select the business account. Click **Create app**.

   |  |
   | --- |
   |  |
5. When prompted, re-enter the password of your Facebook account. Click **Submit**.

   The app is created.
6. On the app's Dashboard, scroll down to find the WhatsApp app, and click **Set up**.
7. Select the account type, and click **Continue**.

   |  |
   | --- |
   |  |
8. Copy the **WhatsApp Business Account ID** to a safe place.

[## Creating Permanent Access Token](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-7cfeef1b-1cdb-f3e7-c00f-fd75d8f57e45_body)

To create a permanent access token for your WhatsApp Business Cloud account:

1. Log in to your [Facebook Developer Account](https://developers.facebook.com/).
2. Click **Apps Dashboard > Business Settings**.

   **Note**

   If you don't see the **App Dashboard** menu, refresh the page.
3. Go to **System Users > Add**. Enter the username, select the role as **Admin** and click **Create System User**.
4. Go to **Add Assets > Apps**. Select the app you want to assign to the user, enable **Full Control** access, and click **Save Changes**.
5. Go to **WhatsApp Accounts > Add People > Select the system user > Enable Full Control Access > Assign**.
6. Go to **System Users > Select the user > Generate Access Token**.
7. Select the app, following permissions, and then click **Generate Token**.

   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
8. Copy the token to a safe place.

You can use this token as a permanent access token.

[## Adding your own phone number to WhatsApp Business Cloud API](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-a6bd5b62-c91e-ebbe-a2e0-7c75b9a5f4c8_body)

When you set up WhatsApp API, a test number is created for you. You can add your own number.

1. Log in to your Facebook developer account.
2. On the Getting Started page, click **Add phone number**.
3. Enter your business profile details and click **Next**.
4. Enter the business phone number that you want to connect to WhatsApp Business API.

   **Note**

   Ensure that the phone number is not registered with WhatsApp before. If already registered, delete your WhatsApp account with the number before registering here.
5. Enter the verification code received on your phone number.
6. Enter your business details and click **Save**.

You have successfully added your own business phone number to WhatsApp Business Cloud API.

[## Connecting WhatsApp Business Cloud to Celonis platform](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa_body)

To connect WhatsApp Business Cloud with Celonis platform you need to obtain the [Permanent Token](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-7cfeef1b-1cdb-f3e7-c00f-fd75d8f57e45 "Creating Permanent Access Token") and WhatsApp Business Account ID values from your WhatsApp Business Cloud account.

1. In your Facebook developer account:

   - Set up [WhatsApp Business Cloud API](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-efb2b4ce-8557-7f3a-800e-ac6b68b03e91 "Setting Up WhatsApp Cloud API")
   - [Create a permanent access token](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-7cfeef1b-1cdb-f3e7-c00f-fd75d8f57e45 "Creating Permanent Access Token")
2. Log in to your Celonis platform account, and add a module from the WhatsApp Business Cloud app into a Celonis platform Action Flow.
3. Click **Add** next to the **Connection** field.

   |  |
   | --- |
   |  |
4. In the **Connection name** field, enter a name for the connection.
5. In the **Permanent Token** field, enter the [token](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-7cfeef1b-1cdb-f3e7-c00f-fd75d8f57e45 "Creating Permanent Access Token") created prior to the connection.

   You can also use a temporary token which is only valid for 24 hours and available on the getting started screen.

   **Note**

   Celonis platform recommends using the temporary token for testing purposes as it is valid only for 24 hours and you will lose your data once the token expires.
6. In the **WhatsApp Business Account ID** field, enter the ID from your **Facebook Developer account > WhatsApp > Getting Started** section screen, and click **Save**.

You have successfully connected the WhatsApp Business Cloud app and can now build Action Flows.

[## Message](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-12b9f9ca-245f-a3e5-b7ee-97d09638193b_body)

You can watch events, and send messages using the following modules.

[### Watch Events](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4550940892486433045133311132_body)

Triggers when a new message is received.

|  |  |
| --- | --- |
| **Webhook name** | Enter a name for the webhook. |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Verify Token** | Enter the Temporary Access Token from the WhatsApp Getting Started section or the [permanent token](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-7cfeef1b-1cdb-f3e7-c00f-fd75d8f57e45 "Creating Permanent Access Token").  **Note**  Ensure that you use the same token for creating connections and webhooks. |
| **Events** | Select or map the events which you do not wish to watch. |

See [Setting up WhatsApp Business Cloud webhooks](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-ba55bef2-bb3c-e6f2-0ebc-3584fd064507 "Setting up WhatsApp Business Cloud webhooks") to add webhooks to your account.

[### Send a Message](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4599521859539233190774362082_body)

Sends a message.

**Note**

You can send a message using this module if you satisfy the below conditions:

- Your business number phone number must be first approved by WhatsApp before you use it for sending messages.
- You can only initiate new chats via **Send a Template** module. Only after sending a templated message to a specific customer and receiving a response from the customer, you can use this **Send a Message** module to send a non-templated message to the customer.
- If a customer contacts you first, then you can reply to the customer with this **Send a Message** module for the next 24 hours.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map the Sender ID from which you want to send the message. |
| **Receiver** | Enter the receiver's WhatsApp ID or phone number.  **Note**  If you are using a testing number:  - You must [register the recipient's number](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-06154b82-d7e3-dcf7-8a83-cfea8db348ff "Adding Recipient's Phone Number") in the Facebook Developer console. - Enter the receiver's phone number without any prefixes such as `+, spaces, (), and _` . For example, if the receiver phone number is `+1-212-345-6789`, then you must enter it as `12123456789`.    If you are using your own phone number, the receiver field accepts both WhatsApp ID and a phone number in any dilable format with country code. However, Celonis platform recommends explicitly prefixing the country code with a plus sign (+). Some of the examples of supported phone number formats are:  - +1-212-345-6789 - +1 (212) 345-6789 - +1 212 345 6789 - +1 (212) 345 6789 |
| **Message Type** | Select the message type. For example, `image`.  Based on the selection, dynamic fields auto-populate, and you need to enter the details to send the message. For more details on these dynamic fields, see [WhatsApp Business Cloud Messages API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages). |

For any errors, while sending the messages, see [Troubleshooting the WhatsApp Business Cloud](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-c90d8220-f8dc-6751-7fb6-93e5336a9c17 "Troubleshooting the WhatsApp Business Cloud").

[### Send a Template Message](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4581244825920033190774922744_body)

Sends a template message.

**Note**

Your business phone number must be first approved by WhatsApp before you use it for sending messages.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map the Sender ID from which you want to send the template message. |
| **Receiver** | Enter the receiver's WhatsApp ID or phone number in any dialable format.  **Note**  If you are using a testing number:  - You must [register the recipient's number](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-06154b82-d7e3-dcf7-8a83-cfea8db348ff "Adding Recipient's Phone Number") in the Facebook Developer console. - Enter the receiver's phone number without any prefixes such as `+, spaces, (), and _` . For example, if the receiver phone number is `+1-212-345-6789`, then you must enter it as `12123456789`.  If you are using your own phone number, the receiver field accepts both WhatsApp ID and a phone number in any dilable format with country code. However, Celonis platform recommends explicitly prefixing the country code with a plus sign (+). Some of the examples of supported phone number formats are:  - +1-212-345-6789 - +1 (212) 345-6789 - +1 212 345 6789 - +1 (212) 345 6789 |
| **Message Template** | Select or map the message template you want to send. |

[## Media](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-774016c4-6b32-c315-a703-7e6c29b53f95_body)

You can upload and download media using the following modules.

[### Upload a Media](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4496911390942433190776702972_body)

Uploads a media and retrieves its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map the ID of a sender whose media you want to upload. |
| **File** | Enter the file details:  |  |  | | --- | --- | | **File name** | Enter the filename including the file extension. For example, `invoice.xls`. | | **Data** | Enter the path to the file stored in your local directory. For example, `"@/local/path/file.jpg"`.  For more information on supported media types, see the [WhatsApp Business Cloud documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#supported-media-types). | |

[### Download a Media](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm456901729562243319077717882_body)

Downloads a media by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Media ID** | Enter the Media ID you want to download. |

[## Phone Number](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-a32d4ea5-49ac-8170-c9a5-c44ffae426d4_body)

You can enable two-step verification, register, verify, and deregister senders using the following modules.

[### Enable Two-Step Verification](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm456901729012163319077942184_body)

Activates the two-step verification for a sender number by its ID and a 6-digit pin.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map a Sender ID whose two-step verification you want to enable. |
| **PIN** | Enter (map) a 6-digit pin you wish to use for two-step authentication. To disable or reset two-step verification, see the [WhatsApp Business Cloud documentation](https://developers.facebook.com/docs/whatsapp/phone-numbers#resetting-verification-code-in-whatsapp-manager). |

[### Register a Sender](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4625998616736033190780255426_body)

Registers a sender by its ID and a 6-digit pin.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map a Sender ID whom you want to register. |
| **PIN** | Enter (map) a 6-digit pin you wish to use for registration. To disable or reset two-step verification, see the [WhatsApp Business Cloud documentation](https://developers.facebook.com/docs/whatsapp/phone-numbers#resetting-verification-code-in-whatsapp-manager). |

[### Verify a Sender](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4496911623478433190780751632_body)

Verifies a sender by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map a Sender ID whom you want to verify. |
| **Action** | Select the action you want to perform to verify the sender:  - Request a Code - Verify a Code |
| **By** | Select a method for receiving the code:  - *SMS* - *Voice* |
| **Code** | Enter (map) the code received to complete the verification. |

[### Deregister a Sender](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4581244599286433190781063126_body)

Deregisters a sender by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map a Sender ID of a sender to deregister. |

[## Business Profile](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4550940890536033045135305123_body)

You can retrieve and update business profiles using the following modules.

[### Get a Business Profile](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4550940893328033045135529549_body)

Retrieves the details of the WhatsApp business profile by the sender ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map the Sender ID whose business profile you want to retrieve. |

[### Update a Business Profile](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_section-idm4599521805689633190787557719_body)

Updates a WhatsApp business profile by the sender ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your WhatsApp Business Cloud account.](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-6af9f3e9-438b-3f1d-17b4-334f06472caa "Connecting WhatsApp Business Cloud to Celonis platform") |
| **Sender ID** | Select or map the Sender ID whose business profile you want to update. |
| **Address** | Enter the address of the business. |
| **Description** | Enter the business details. |
| **Vertical** | Select or map the industry of the business. For example, `finance`. |
| **Email** | Enter the contact email address of the business. |
| **Websites** | Add the business website URL address.  For example, a website, Facebook Page, or Instagram. You must include the `http://` or `https://` portion of the URL. |
| **File** | Enter (map) the file details:  |  |  | | --- | --- | | **Profile Picture File Name** | Enter the file name of the profile picture. | | **Profile Picture Data** | Enter the path to the file stored in your local directory. For example, `"@/local/path/file.jpg"`. | |

[## Setting up WhatsApp Business Cloud webhooks](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-ba55bef2-bb3c-e6f2-0ebc-3584fd064507_body)

1. Log in to your Celonis platform account.

   Open the **Watch Events** module, enter a name for the webhook, click **Save**, and copy the URL address to your clipboard. Click **OK** and **Save** the trigger.
2. Go to App Dashboard, click **Webhooks** > **Subscribe to this object** to enable the webhooks.
3. When prompted enter the Callback URL copied in step 1 and the Verify token.

   The verify token is the Temporary access token or permanent access token but it has to be same in the Celonis platform and WhatsApp account.

   For more information on webhooks, see the [WhatsApp Business Cloud documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#value-object).

[## Adding Recipient's Phone Number](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-06154b82-d7e3-dcf7-8a83-cfea8db348ff_body)

If you are using a testing number to send messages you must add the recipients to your WhatsApp account in the Facebook Developer account. You can add a maximum of five recipients' numbers that are enabled with WhatsApp.

To add the recipient's phone number:

1. Log in to your Facebook Developer account.
2. On the left menu, click **WhatsApp > To > Manage phone number list**.

   |  |
   | --- |
   |  |
3. Add the phone number and click **Next**.
4. Enter the verification code received on your WhatsApp and click **Next**.

The recipient's number is successfully added to the list.

[## Troubleshooting the WhatsApp Business Cloud](#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-c90d8220-f8dc-6751-7fb6-93e5336a9c17_body)

Some of the errors that you might encounter when using WhatsApp Business Cloud.

### WhatsApp API - Error 500 code 13100

The user gets an error 500 from the module and the **DevTool > Response Body** shows error code 131000.

|  |
| --- |
|  |

**Note**

You can only initiate new chats via **Send a Template** module. Only after sending a templated message to a specific customer and receiving a response from the customer, you can use this **Send a Message** module to send a non-templated message to the customer.

If you’re using a testing number, you must first register up to five authorized recipient numbers in WhatsApp Manager before sending messages to them. See [Adding Recipient's Phone Number](whatsapp-business-cloud--action-flow-.html#UUID-cfb315c4-372a-da7e-1cec-857673f8e75a_UUID-06154b82-d7e3-dcf7-8a83-cfea8db348ff "Adding Recipient's Phone Number").

### Error validating access token

This error indicates that your session in Whatsapp has expired. To resolve it, reauthorize the connection in Celonis platform.

1. Log in to your Celonis platform account.
2. In the left sidebar, click **Connections**, and find the connection that you use for Whatsapp Business Cloud.
3. Click **Reauthorize**.
4. If prompted, reauthorize account and confirm access.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

