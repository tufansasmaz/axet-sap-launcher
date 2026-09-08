# Automation: Action Flows (Part 5)

## automation/action-flows/workday-financial-management--action-flow-

# Workday Financial Management (Action Flow)

With Workday Financial Management modules in Celonis platform, you can monitor, create, update, list, retrieve, and delete the invoices in your Workday account.

**Note**

To use Workday in Celonis platform, you must have the [Enterprise plan](https://www.make.com/en/pricing).

All Enterprise apps are currently labeled as **premium tier 3** in Celonis platform.

Refer to the [Workday Financial Management API documentation](https://community.workday.com/sites/default/files/file-hosting/productionapi/Financial_Management/v42.1/Financial_Management.html) and [Workday Resource Management API documentation](https://community.workday.com/sites/default/files/file-hosting/productionapi/Resource_Management/v41.0/Resource_Management.html) for a list of available endpoints.

Expand all

[## Connecting Workday Financial Management to Celonis platform](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-9f178fd5-292a-73a5-2311-044e53acc336_body)

You can establish two types of connection between Workday Financial Management and Celonis platform: with user credentials or OAuth2.

### Establish the connection with Workday Financial Management in Celonis platform via User Credentials

To establish a connection with user credentials:

1. Log in to your Celonis platform account, add a Workday Financial Management module to your Action Flow, and click **Create a connection**.
2. In the **Connection type** dropdown, select Workday Financial Management.
3. Enter your **Host URL Address** that you copied above without a trailing slash. For example, `https://wd3-services1.myworkday.com` for your production instance and `https://wd3-impl-services1.workday.com` for your sandbox instance.
4. Enter your **Tenant ID**. This can be located in your account URL address as follows: `https://HostName.workday.com/TenantID/d/home/html`.
5. In the **Username** and **Password** fields, enter the Workday Financial Management login credentials with API access.
6. Click **Save**.

You have successfully established the connection. You can now edit and add more Workday Financial Management modules.

### Establish the connection with Workday Financial Management in Celonis platform via OAuth2

Before establishing an OAuth2 connection, your Workday system administrator must complete the steps in the [Set Up Workday Financial Management for OAuth2 Connections](workday-financial-management--action-flow-.html#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-9c3dc97d-b784-49d1-6de2-d84a99a407e6 "Setting Up Workday Financial Management for OAuth2 Connections") section to generate client credentials and refresh tokens.

1. Log in to your Celonis platform account, add a Workday Financial Management module to your Action Flow, and click **Create a connection**.
2. In the **Connection type** dropdown, select Workday Financial Management OAuth2.
3. Enter your **Host URL Address**. For example, `https://HostName.workday.com`. Do not include a trailing slash.
4. Enter your **Tenant ID**. This can be located in your account URL address as follows: `https://HostName.workday.com/TenantID/d/home/html`.
5. In the **Client ID** and **Client Secret** fields, enter your client credentials.
6. Enter the **Refresh Token** for the connection, provided by your Workday system administrator. Each connection should have its own refresh token as sharing tokens may result in connections being broken.

   Workday system administrators can generate tokens in **Workday** > **View API Clients** > **Manage Refresh Tokens for integrations**.
7. Set the **Access Token Expiry in Seconds**, provided by your Workday system administrator. This value must be the same as the token expiry settings in Workday.
8. Click **Save**.

You have successfully established the connection. You can now edit and add more Workday Financial Management modules.

[#### Setting Up Workday Financial Management for OAuth2 Connections](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-9c3dc97d-b784-49d1-6de2-d84a99a407e6_body)

Follow these steps in Workday to retrieve the client credentials and refresh tokens necessary to establish an OAuth2 connection:

Generate Client Credentials

1. In your Workday account search bar, search for and select the **Register API Client for Integrations** task.
2. Fill in the **Client Name** field.
3. Check the **Non-Expiring Refresh Tokens** box. This is important to minimize risk of integration down-time. If it is not selected, a new refresh token must be manually created and entered into Celonis platform after each expiration.
4. Add the following **Scopes (Functional Areas)**: `System` for WQL functionality and `Tenant Non-Configurable` for RAAS functionality.
5. Click **OK**.
6. Copy the **Client ID** and **Client Secret** values and store them in a safe place. This is important as you will not be able to view the Client Secret again after leaving this page. If you lose the Client Secret, you will be required to generate new credentials.

You have successfully created the **Client ID** and **Client Secret** to be used when creating the OAuth2 connection in Celonis platform.

Configure Refresh Tokens

1. In your Workday account, go to **View API Clients**.
2. Find the relevant API Client and click on **...** > **API Client** > **Manage Refresh Tokens for Integrations**.

   Note: This is also where you can edit API Client scopes, generate new client secrets, and find new refresh tokens if an expiration date was set.

   |  |
   | --- |
   |  |
3. In the **Manage Refresh Tokens for Integrations** window, enter the **Workday Account** to be assigned to the API Client. This account must have access to the reports you would like to work with. WQL, RAAS, and SOAP API security is tied to the Workday account.
4. Click **OK**.
5. In the **Delete or Regenerate Refresh Token** task, click the **Generate New Refresh Token** box.

   |  |
   | --- |
   |  |
6. Copy the **Refresh Token** and store it in a safe place.

   Note: Each Workday account will have its own refresh token, but can have the same Client ID and Client Secret as other accounts linked to the same API Client.

You have successfully created the **Refresh Token** to be used when creating the OAuth2 connection in Celonis platform.

[## Supplier Invoices](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-6366e4cd-7e4c-773c-6e27-42d3248e2cbb_body)

You can create, update, search, retrieve, and cancel invoices with the following modules.

[### Search Supplier Invoices](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_search-supplier-invoices_body)

Retrieves a list of supplier invoices filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Supplier** | Add the Supplier IDs whose invoices you want to search. |
| **Company** | Add the Company Reference IDs whose invoices you want to search. |
| **Supplier Status** | Add the Supplier Status of the invoices you want to search. |
| **Invoice Date On or After** | Enter (map) the date to search the invoices that have the date on or after the specified date. |
| **Invoice Date On or Before** | Enter (map) the date to search the invoices that have the date on or before the specified date. |
| **Purchase Order** | Add the Purchase Order Reference ID to search the invoices the math the specified purchase orders. |
| **Supplier Hierarchy** | Add the Supplier Reference ID to search the invoices that match the specified reference ID. |
| **Invoice on Hold** | Select whether you want to include the invoices in the search that are on hold. |
| **Intercompany Invoice** | Select whether you want to include the invoices in the search that are related to intercompany. |
| **Payment Status** | Add the payment status to list the invoices that match the specified status. |
| **Created By Worker** | Add the workers to search the invoices created by the specified workers. You can search the workers by their Employee ID or Contingent Worker ID. |
| **Approving Worker** | Add the approving worker for the invoice to search for the invoices that match the specified worker. |
| **External PO Number** | Enter (map) the external purchase order number of the invoice to search for the invoices that match the specified PO number. |
| **Invoice Status** | Add the invoice status to search for the invoices that match the specified status. |
| **Limit** | Set the maximum number of invoices Celonis platform should return during one execution cycle. |

[### Create a Supplier Invoice](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_h_01F2VRHQ48DASEP5PY2KC868ZR_body)

Creates a new supplier invoice.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Company Reference ID** | Enter (map) the Company Reference ID to which the invoice belongs. |
| **Supplier ID** | Enter (map) the Supplier ID associated with the invoice. |
| **Contingent Worker ID** | Enter (map) Contingent Worker ID associated with the invoice. |
| **Payment Terms ID** | Select or map the Payment Terms ID applicable to the invoice. Payment Terms are the rules for establishing when invoice payment is due and whether discounts are eligible to be taken or given for early payment. If no payment terms are specified, Workday will populate this with the customer's default payment terms if one is defined. Workday will automatically determine the due date and discount date based on the invoice date and payment terms. |
| **Supplier Connection ID** | Select or map the default Supplier Business Connection ID |
| **Use Default Supplier Connection** | Select whether you want to use the default supplier connection details for the invoice. |
| **Currency ID** | Select or map the applicable Currency ID for the invoice. |
| **Invoice Number** | Enter (map) the invoice number. If adding a new invoice, then ensure to make the invoice number the same as Reference ID. |
| **Gapless Document Number** | Enter (map) the gapless document number on the supplier's invoice. |
| **Invoice Date** | Enter (map) the date on the invoice. |
| **Submit** | Select whether you want to submit the invoice for approval. |
| **Locked in Workday** | Select whether the invoice is locked in the Workday system. |
| **Invoice Received Date** | Enter (map) the date on which the invoice is received. |
| **Accounting Date Override** | Enter (map) the date to override the accounting date. |
| **Control Amount Total** | Enter (map) the expected invoice total, including tax. An invoice cannot be submitted for approval if it has a non-zero control total that does not equal the sum of the extended amount for all invoice lines plus tax. |
| **Freight Amount** | Enter (map) the freight amount applicable to items in the invoice. |
| **Other Charges** | Enter (map) the details of other charges. |
| **Worktag Allocation Template ID** | Enter (map) the Worktag Allocation Template ID of the invoice. |
| **Tax-Only** | Select whether you want to mark the invoice as tax-only. |
| **Due Date Override** | Enter (map) the date after which you want to override the date used to look up the currency conversion rate. The default date is normally the same as the invoice date. |
| **Payment Type ID** | Select or map the Payment Type ID of the invoice/ |
| **Tax Option ID** | Select or map the default Tax Option ID for the invoice. |
| **Default Tax Code** | Add the default tax code applicable to the invoices. |
| **Withholding Tax Code ID** | Select or map the Withholding Tax Code ID. |
| **Address ID** | Select or map the Address ID of the invoice to which the item should be shipped. |
| **On Hold** | Select whether this invoice is on hold. |
| **Supplier Document Received** | Select whether the supplier documents for this invoice have been received. |
| **Suppliers Invoice Number** | Enter (map) the supplier's invoice number. |
| **External PO Number** | Enter (map) the external purchase order number of the invoice. |
| **Referenced Invoices** | Add the referenced invoices applicable to this invoice. |
| **Invoice Type ID** | Enter (map) the Invoice Type ID. |
| **Supplier Contract ID** | Search and add the Supplier Contract ID of the invoice. |
| **Memo** | Enter (map) the transaction header text, which will be printed on the delivered transaction. |
| **Employee ID** | Enter (map) the Employee ID who has requested the invoice. |
| **Contingent Worker ID** | Enter (map) the Contingent Worker ID who has requested the invoice. |
| **Invoice Line Replacement Data** | Add the invoice line replacement data for the invoice: |
| **External Supplier Invoice Source ID** | Enter (map) the External Supplier Invoice Source ID of the invoice. By default, it considers the Web Service. |
| **Cancel Accounting Date** | Enter (map) the date on which the supplier invoice is canceled. Cancel Accounting Date is populated only when a Supplier Invoice is Canceled. |
| **Invoice Accounting Date** | Enter (map) the date for a Supplier Invoice Adjustment. |
| **Payment Practices** | Select whether the invoice is eligible for the payment practices field to flag a Supplier Invoice for Payment Practices Reporting. |
| **Budget Date** | Enter (map) the date to override the Date on all supplier invoice lines and splits. |
| **Tax Amount** | Enter (map) the tax amount applicable to the invoice amount. |
| **Withholding Tax Amount** | Enter (map) the withholding tax amount of the invoice. |
| **Document Link** | Enter (map) the URL Address to the scanned image of the paper invoice. |
| **Supplier Invoice Request ID** | Enter (map) the Supplier Invoice Request ID who has requested the invoice. |
| **Employee ID** | Enter (map) the Employee ID who has requested the invoice. |
| **Contingent Worker ID** | Enter (map) the Contingent Worker ID who has requested the invoice. |
| **Additional Reference Type ID** | Enter (map) the Additional Reference Type ID encoded with key payment information on the invoice document. |
| **Additional Reference Number** | Enter (map) the additional reference number that is encoded with key payment information on the invoice document |
| **Handling Code ID** | This is the reference code of the payment handling instructions for the supplier invoice or supplier invoice adjustment. |
| **Prepaid** | Select whether this invoice is prepaid. |
| **Prepayment Release Type ID** | Select or map the Prepayment Release Type ID of the invoice. |
| **Release Date** | Enter (map) the date when the items in the invoice should be released. |
| **Frequency Behavior ID** | Enter (map) the Behaviour ID for the invoice. |
| **Number of Installments** | Enter (map) the number of installments applicable for this invoice to complete the total payment. |
| **Use Invoice Date** | Select whether you want to use the invoice date for creating this invoice. |
| **From Date** | Enter (map) the date from which you want to use the invoice date. |
| **Gross Invoice Amount** | Enter (map) the total gross invoice amount. |
| **Total Amount Retained** | Enter (map) the invoice amount kept pending. |
| **Total Amount Released** | Enter (map) the amount released for the invoice. |
| **Retention Memo** | Enter (map) the transaction header text, which will be printed on the delivered transaction. |
| **Currency Rate Type ID** | Enter (map) whether you want to override the default Rate Type used to look up the currency conversion rate |
| **Currency Rate Date Override** | Enter (map) whether you want to override the date used to determine the currency conversion rate. The default date is normally the same as the invoice date. |
| **Currency Rate Manual Override** | Enter (map) whether you want to allow a direct override of the currency conversion rate that will be used. |
| **Document Currency Conversion Rate** | Enter (map) the currency conversion rate for the accounting document ledger. This information is for outbound purposes and is not processed on inbound Workday Web Services requests. |
| **Rate Override** | Enter (map) an indicator of whether the currency exchange rate has been overwritten. For example, `Yes`. This information is for outbound purposes and is not processed on inbound Workday Web Services requests. |
| **Currency Rate Lookup Override** | Enter (map) the currency exchange rate derived based on the currency rate type override or currency rate date override. This information is for outbound purposes and is not processed on inbound Workday Web Services requests. |
| **Manual Override Percent** | Enter (map) the percentage of the currency rate manual override against the default currency rate. This information is for outbound purposes and is not processed on inbound Workday Web Services requests. |
| **Default Rate Type** | Enter (map) the default rate type applicable to the invoice when used for foreign currencies. This information is for outbound purposes and is not processed on inbound Workday Web Services requests. |
| **Rate Basis Date** | Enter (map) a basis date to derive the currency exchange rate applicable to the invoice. This information is for outbound purposes only and is not processed on inbound Workday Web Services requests. |
| **Default Currency Rate** | Enter (map) the currency rate applicable to the invoice. |
| **Attachment Data** | Add the attachment to the invoice:  |  |  | | --- | --- | | **Content Type** | Enter (map) the attachment content type. For example, `HTML`. | | **File Name** | Enter (map) the attachment file name with an extension. | | **File Content** | Enter (map) the attachment content details. | | **Encoding** | Enter (map) the encoding information available for the invoice. | | **Compressed** | Select whether the attachment is a compressed file. | | **Comment** | Enter any additional information about the attachment to share internally. | |
| **Tax Code Data** | Add the ta code data:  |  |  | | --- | --- | | **Tax Applicability ID** | Enter (map) the Tax Applicability ID for the invoice. | | **Tax Code ID** | Select or map the Tax Code ID applicable to the invoice. | | **Tax Amount** | Enter (map) the tax amount applicable to the invoice. | | **Tax Rate Data** | Add the tax rate information. | |
| **Withholding Tax Code Data** | Add the withholding tax code information:  |  |  | | --- | --- | | **Withholding Tax ID** | Select or map the Withholding Tax ID applicable to the invoice. If left blank, Workday will consider the default withholding tax code from the invoice header if there is one. | | **Withholding Tax Amount** | Enter (map) the total tax amount for the withholding tax code. | | **Withholding Tax Rate Data** | Add the withholding tax information. | |
| **Retention Release Line Data** | Add the retention amount release line information of the invoice:  |  |  | | --- | --- | | **Retention Release Line ID** | Enter (map) the retention Release Line ID of the invoice. | | **WID** | Enter (map) the Purchase Order Number of the invoice. | | **Amount Released** | Enter (map) the amount being released for the invoice. | |
| **Auto Complete** | Select whether you want to complete the supplier invoice intercompany sub-process. |
| **Skip** | Select whether you want to skip the supplier invoice intercompany sub-process. |
| **Business Process Comment Data** | Add the comments for the invoice:  |  |  | | --- | --- | | **Comment** | Enter (map) the comment text you want to add to the invoice. | | **Worker** | Add the workers associated with the comment. | |
| **Business Process Attachment Data** | Add the business process attachment data of the invoice:  |  |  | | --- | --- | | **File Name** | Enter (map) the file name. | | **File Content** | Enter (map) the details of the content in the file. | | **Event Attachment Description** | Enter (map) the attachment details. | | **Content Type** | Enter (map) the content type. For example, `HTML`. | | **Event Attachment Category** | Enter (map) the attachment category. | |
| **Supplier Invoice Prepaid Amortization Schedule** | Add the supplier invoice prepaid amortization schedule for the invoice:  |  |  | | --- | --- | | **Prepaid Spend Amortization Schedule ID** | Select or map the prepaid spend amortization schedule ID. | | **Frequency** | Add the frequency of the schedule. | | **Number of Installments** | Enter the number of installments | | **Use Invoice Date** | Select whether you want to include the invoice date for the schedule. | | **From Date** | Enter (map) the date from which you want to add the invoice lines. | | **Include All Available Prepaid Lines** | Select whether you want to include all the available prepaid lines | | **Prepaid Supplier Invoice Lines** | Add the supplier invoice line IDs related to this invoice. | |
| **Tax Certificate Number** | Add the tax certificate number of the invoice.  |  |  | | --- | --- | | **Tax Certificate Number** | Enter (map) the withholding tax certificate number. | | **Tax Authority** | Add the tax authority ID applicable to the invoice. | | **Tax Category** | Add the tax categories applicable to the invoice. | | **Last Updated Date** | Enter (map) the date the tax certificate number was last updated. | |
| **Work Queue Information Data** | Add the work information for the invoice:  **Assignee**  Add the assignees to the work queue.  **Work Queue Tags**  Add the tags for the work queue. For example, `new`.  **Work Queue Notes**  Enter any additional information for the work queue you want to add internally. |

[### Get Supplier Invoices](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_get-supplier-invoices_body)

Retrieves a list of supplier invoices with attachment data by their IDs.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Supplier Invoice ID** | Add the Supplier Invoice IDs whose details you want to search. |

[### Update a Supplier Invoice](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_update-a-supplier-invoice_body)

Updates a supplier invoice by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Supplier Invoice ID** | Select or map the invoice ID whose details you want to update. |

See the [Create a Supplier Invoice](workday-financial-management--action-flow-.html#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_h_01F2VRHQ48DASEP5PY2KC868ZR "Create a Supplier Invoice") for field descriptions.

[### Cancel a Supplier Invoice](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_cancel-a-supplier-invoice_body)

Cancels an existing supplier invoice by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Supplier Invoice ID** | Select or map the Invoice ID you want to cancel. |

[## Other fields](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-535784e5-cc15-78e6-8e81-41af2e810aa2_body)

[### List Currencies](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_section-idm4610924596278433823153392701_body)

Retrieves all existing currencies in a tenant.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Limit** | Enter the maximum number of currencies Celonis platform will return during one execution cycle. The default value is 10. |

[### Make a SOAP API Call](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_section-idm4632769796904033823161918767_body)

Performs an arbitrary authorized SOAP API call.

**Note**

For a list of available web services, their URLs, and request and response types, refer to the [Workday Web Services Directory](https://community.workday.com/sites/default/files/file-hosting/productionapi/index.html).

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **Web Service URL** | Enter the web service URL for the request.  For example, `/Adoption/v40.2`. |
| **Request Type** | Enter the request type.  For example, `Get_Adoption_Items_Request`. |
| **Response Type** | Enter the response type.  For example, `Get_Adoption_Items_Response`. |
| **SOAP Body** | Enter the body content for your API call. Do not include `<bsvc:Request Type>` or `</bsvc:Request Type>`, only include the body in between. |
| **SOAP Header** | Enter the desired request headers. Do not include `<soapenv:Header>` or `</soapenv:Header>`. |

[### Make a SOAP API Call (Advanced)](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_id_make-an-api-call_body)

Performs an arbitrary authorized API call.

**Note**

For a list of available endpoints, refer to the [Workday Financial Management API documentation](https://community.workday.com/sites/default/files/file-hosting/productionapi/Financial_Management/v40.2/Financial_Management.html).

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **URL** | Enter a path relative to `https://{hostname}.workday.com/ccx/service/{tenant}`. For example, `/Resource_Management`. |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. Only enter the body between `<soapenv:Body>` and `</soapenv:Body`>. |

#### Example of use - Get Supplier Invoice

The following API call returns the specified supplier invoice from your Workday account:

**URL**: `/Resource_Management/v35.2`

**Method**: `POST`

**Body**:

`<bsvc:Get_Supplier_Invoices_Request>`

`<bsvc:Request_Criteria></bsvc:Request_Criteria>`

`<bsvc:Response_Filter>`

`<bsvc:Page>1</bsvc:Page>`

`<bsvc:Count>1</bsvc:Count>`

`</bsvc:Response_Filter>`

`<bsvc:Response_Group>`

`<bsvc:Include_Reference></bsvc:Include_Reference>`

`<bsvc:Include_Attachment_Data></bsvc:Include_Attachment_Data>`

`</bsvc:Response_Group>`

`</bsvc:Get_Supplier_Invoices_Request>`

The search matches can be found in the module's **Output** under **Bundle > Body > env:Body**. In our example, 1 supplier invoice is returned:

[### Make a REST API Call](#id630784_body)

Performs an arbitrary authorized REST API call. Can only be used with an OAuth2 connection.

**Note**

For a list of available endpoints, refer to the [Workday Financial Management API documentation](https://community.workday.com/sites/default/files/file-hosting/productionapi/Financial_Management/v40.2/Financial_Management.html).

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Workday account. |
| **URL** | Enter a path relative to `https://{hostname}.workday.com/ccx/api`. For example, `/<serviceName>/v1/<tenant>/workers`. |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[### Run a WQL Query](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_section-idm4588960572441633823226782733_body)

Runs a WQL Query. Can only be used with an OAuth2 connection.

**Note**

For information regarding WQL, refer to the [Workday Query Language (WQL) Community guide](https://community.workday.com/node/787171). If you do not have access to Workday Community, you can [request a community account](https://workdayinc.force.com/CommunityAccess/s/register).

|  |  |
| --- | --- |
| **Connection** | [Establish an OAuth2 connection to your Workday account](workday-financial-management--action-flow-.html#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-9f178fd5-292a-73a5-2311-044e53acc336 "Connecting Workday Financial Management to Celonis platform"). |
| **WQL Query** | Enter the query using WQL. Do not include the limit. |
| **Limit** | Enter the maximum number of bundles Celonis platform will return during one execution cycle. The default value is 10. |
| **Offset** | Enter an offset for advanced pagination. If more then 3,200 results are expected, use together with the `Repeater` module. |

[### Get a RaaS Report](#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_section-idm4497770161280033823227862601_body)

Retrieves a RaaS report by the report URL. Can only be used with an OAuth2 connection.

|  |  |
| --- | --- |
| **Connection** | [Establish an OAuth2 connection to your Workday account](workday-financial-management--action-flow-.html#UUID-2f3272bf-80db-67b2-9c9f-46a2d3a9dc17_UUID-9f178fd5-292a-73a5-2311-044e53acc336 "Connecting Workday Financial Management to Celonis platform") |
| **RaaS Report URL** | Enter the URL of the RaaS report to retrieve. The Raas Report URL must be in JSON format. For example, `https://wd3-services1.myworkday.com/ccx/service/customreport2/{tenant}/{user}/{custom report name}?format=json.` |
| **Output Format** | Select the format in which you want to get the RaaS report. |
| **Unescape HTML Entities** | Select whether you want to unescape HTML entities in the RaaS report. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/xlsx--action-flow-

# XLSX (Action Flow)

With the XLSX app in Celonis Platform, you can create Excel files that merge selected items and return them in the XLSX format.

Expand all

[## Aggregators](#UUID-ed1c3206-d6f0-dd69-2e1e-c4738c556109_section-idm234930700380851_body)

[### Create Excel](#UUID-ed1c3206-d6f0-dd69-2e1e-c4738c556109_section-idm234930701311748_body)

Merges selected items and returns them in the XLSX format.

| Field | Description |
| --- | --- |
| **Source module** | Select the module whose output you wish to aggregate. |
| **Aggregated fields** | Select the fields received from the source module that you want to include in the generated `.xlsx` file. |
| **Include headers** | Select whether to include headers based on the aggregated field names. |
| **File name** | Enter a name for the file that will be generated without extension. |
| **File extension** | Select the extension of the output file:  - `.xlsx` - `.xls` - `.xlsb` - `.xlsm` |
| **Group by** | Enter (map) an expression containing one or more mapped items to group the aggregated data by matching values. |
| **Stop processing after an empty aggregation** | Select whether to stop the scenario if no data is returned from the aggregation. |

[### Create Excel (Advanced)](#UUID-ed1c3206-d6f0-dd69-2e1e-c4738c556109_section-idm234930708243758_body)

Merges selected items and returns them in the XLSX format. Employs Data structure to define columns in the resulting XLSX file.

| Field | Description |
| --- | --- |
| **Source module** | Select the module whose output you wish to aggregate. |
| **Include headers** | Select whether to include headers based on the aggregated field names. |
| **Data structure** | Add and select a data structure with a specification that describes the structure of the table. |
| **File name** | Enter a name for the file that will be generated without extension. |
| **Group by** | Enter (map) an expression containing one or more mapped items to group the aggregated data by matching values. |
| **File extension** | Select the extension of the output file:  - `.xlsx` - `.xls` - `.xlsb` - `.xlsm` |
| **Sheet name** | Enter a sheet name. If omitted, defaults to `Sheet1`. |
| **Stop processing after an empty aggregation** | Select whether to stop the scenario if no data is returned from the aggregation. |

[### Example - Generate an XLSX File from Google Contacts](#UUID-ed1c3206-d6f0-dd69-2e1e-c4738c556109_section-idm234930730205789_body)

The Create Excel module provides you with a list of available aggregated fields as checkboxes. In this example, fields such as Contact ID, Display Name, and Organizations are selected in the module. The results are returned in an `.xlsx` file named `Example File`.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/xml--action-flow-

# XML (Action Flow)

This topic provides a comprehensive guide on using the XML app within Action Flows to handle XML data. It covers two primary functions: parsing existing XML into usable data bundles and creating new XML formatted text from other data sources.

Expand all

[## Getting started with XML](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_getting-started-with-xml_body)

The **XML** app enables you to:

- parse an XML formatted text via the **XML > Parse XML** module and convert it to a bundle to make the data available to other modules
- convert a bundle to an XML formatted text via the **XML > Create XML** module

[### Parse XML](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_parse-xml_body)

The **XML > Parse XML** module parses an XML formatted text and outputs a single bundle containing all the information extracted from the XML.

|  |  |
| --- | --- |
| **Data structure** | The Data structure describes the structure of the XML to make the output of the module available in the mapping panel for the following modules. If you have a sample of the XML you would like to parse, you can use it to generate the Data structure:  1. Click on the "Add" button. 2. Click on the "Generator" button. 3. Copy and paste the XML sample into the *Sample data* field. 4. Click on the "Save" button. 5. Verify that the Data structure has been successfully generated. 6. Click on the "Save" button to save the Data structure.  You may skip the steps 2-5 to supply an empty Data structure. This way the output of the module will not be available in the mapping panel until the module has been executed at least once to process an XML input. |
| **XML** | The XML formatted text you would like to parse.  If you use a formula, make sure its result value type is (or can be automatically coerced to) Text type. If the result value type is Buffer (binary data) then use toString() function to convert it to the Text type. |

[#### Example](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_parse-xml-example_body)

A typical use case is to download an XML file from a URL and parse its content. Here is a step by step guide how to achieve this:

1. Create a new Action Flow.
2. Insert **HTTP > Get a file** module
3. Open the module's configuration and configure it as follows:

   |  |  |
   | --- | --- |
   | **URL** | URL of the XML file (e.g. `https://siftrss.com/f/rqLy05ayMBJ`) |
4. Close the module's configuration.
5. Add XML > Parse XML module, connect it after the HTTP > Get a file module and configure it as follows:

   |  |  |
   | --- | --- |
   | **Data structure** | 1. Click on the "Add" button. 2. Click on the "Generator" button. 3. In your web browser, open a new tab/window. 4. Put the URL you used in the third step in the address bar and fetch the XML file. 5. Select all the XML text and copy it into the clipboard. 6. Close the tab/window and get back to your Action Flow. 7. Paste the copied XML text into the *Sample data* field. 8. Click on the "Save" button. 9. Verify that the Data structure has been successfully generated. 10. Click on the "Save" button to save the Data structure.  You may skip the steps 2-9 to supply an empty data structure. This way the output of the module will not be available in the mapping panel until the module has been executed at least once to process an XML input. |
   | **XML** | Map the `Data` item from the output of the **HTTP > Get a file** into the field. Use the `toString()` function to convert its value from [Buffer (binary data)](https://www.integromat.com/en/help/item-data-types) type to [Text](https://www.integromat.com/en/help/item-data-types) type. You may copy and paste the formula's code into the field: `{{toString(1.data)}}` |

[#### Parsing XML attributes](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_attribute-processing_body)

By default, the **XML > Parse XML** module will put attributes in a special collection `_attributes` as a child of the node, that has these attributes. If the node is a text node and it has attributes, then two special properties will be added: `_attributes` for attributes and `_value` for the text content of the node.

**Example**

This XML:

```
                  <root attr="1">
    <node attr="ABC">Hello, World</node>
</root>
```

will be converted into this bundle:

[### Create XML](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_create-xml_body)

The **XML > Create XML** module converts a bundle to an XML formatted text.

|  |  |
| --- | --- |
| **Data structure** | The [Data structure](https://www.integromat.com/en/help/data-structures) describes the structure of the resulting XML. If you have a sample of the XML you would like to create, you can use it to generate the Data structure:  1. Click on the "Add" button. 2. Click on the "Generator" button. 3. Copy and paste the XML sample into the *Sample data* field. 4. Click on the "Save" button. 5. Verify that the Data structure has been successfully generated. 6. Click on the "Save" button to save the Data structure. |

[#### Example](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_create-xml-example_body)

A typical use case is to transform data from a Google spreadsheet into XML. Here is the procedure on how to transform the data to an XML file in ten steps:

1. Place the **Google Sheets > Select rows** module in your Action Flow to fetch the data. Setup the module to retrieve rows from your Google spreadsheet and set the *Maximum number of returned rows* to a small number, but larger than one for testing purposes (e.g. three). Execute the **Google Sheets** module (right-click it and choose "Run this module only") and verify the output of the module.
2. Connect the **Array Aggregator** module after the **Google Sheets** module. In the module's setup choose the **Google Sheets** module in the *Source node* field. Leave the other fields as they are for the moment.
3. Connect XML > Create XML module after the Array Aggregator module. The module's setup requires a Data structure that describes the structure of the XML output. Click on the "Add" button to open the Data structure setup. The easiest way to create this Data structure is to generate it automatically from an XML sample. Click on the "Generator" button and paste your XML sample to the Sample data field:
4. Click on the "Save" button. The *Specification* field in the Data structure setup should now contain the generated structure.
5. Change the name of your Data structure to something more specific (e.g. "My XML data structure") and click on the "Save" button. If everything goes well, a field corresponding to the root XML element should appear as a mappable field in the **XML** module's setup.
6. Click the "Map" button next to the field and map the Array[] item outputted from the Array aggregator module to it.
7. Click on the "OK" button to close the **XML** module's setup.
8. Open the setup of the Array Aggregator module. Change the Target structure from Custom to a XML module's field corresponding to the parent XML element. Map items outputted from the Google Sheets module to appropriate fields:
9. Click on the "OK" button to close the **Array Aggregator** module's setup.
10. Run the Action Flow. If everything goes well, the **XML** module should output the correct XML file. Open the setup of the **Google Sheets** module and increase the *Maximum number of returned rows* number to be larger than the number of rows in your spreadsheet to process all the data. The resulting XML can be then saved to Dropbox, sent as an attachment via email, uploaded via FTP to a server, etc.

[#### Adding XML attributes](#id631308_body)

If you want to add attributes to a complex node (a node, that will contain other nodes), you have to add a collection with the name `_attributes` for this node in your custom Data structure, and this collection will be mapped to node attributes. If you want to add attributes to a text node (example: `<node attr="1">abc</node>`), you have to add a collection `_attributes` for attributes and a text property `_value` for the node value for this node in your custom Data structure.

[##### Example](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_example_body)

```
                     {
    "name": "node",
    "type": "collection",
    "spec": [
        {
            "name": "_attributes",
            "type": "collection"
            "spec": [
                 {
                     "name": "attr1",
                     "type": "text"
                 }
            ]
        },
        {
            "name": "_value",
            "type": "text"
        }
    ]
}
```

[## Troubleshooting XML](#UUID-4858f6ff-75de-1534-6b70-ac22ef8a0a88_id_troubleshooting_body)

### Cannot map data from the Parse XML module

Make sure the Data structure is defined correctly. Alternatively you may use an empty data structure and execute the module at least once to process an XML input.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/zendesk--action-flow-

# Zendesk (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Zendesk modules in Celonis platform you can watch, create, update, list, retrieve, and delete the articles, comments, forum posts, groups, organizations, tickets, and users in your Zendesk account.

To use the Zendesk modules, you must have a Zendesk account. You can create an account at [zendesk.com/register](http://zendesk.com/register).

Refer to the [Zendesk API documentation](https://developer.zendesk.com/rest_api/) for a list of available endpoints.

Expand all

[## Connecting Zendesk to Celonis platform](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4585339880667234001150060158_body)

To establish the connection, you must:

1. [Create a custom application in Zendesk](zendesk--action-flow-.html#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4556731545891234001151761455 "Creating a custom application in Zendesk") to obtain your Unique Identifier and Secret.
2. [Establish the connection in Celonis platform.](zendesk--action-flow-.html#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4607968568772834001152187934 "Establishing the connection with Zendesk in Celonis platform")

[### Creating a custom application in Zendesk](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4556731545891234001151761455_body)

To create a Zendesk custom application and retrieve your client credentials:

1. Log in to your Zendesk account.
2. In the left navigation menu, click **Apps and integrations > APIs > Zendesk API**.
3. Go to **OAuth Clients** and click **Add OAuth Clients**.
4. For **Client name**, enter a name.
5. For **Unique identifier**, you can use the default suggestion or you can change it. Copy the **Unique Identifier** value and store it in a safe place.
6. For **Client Kind**, select **Confidential**.
7. For **Redirect URLs**, enter the following: `https://auth.redirect.celonis.cloud/oauth/cb/zendesk`
8. Click **Save**.
9. A dialog box will open, advising you that the Secret value will only be shown once. Click **OK**.
10. Copy the **Secret** value and store it in a safe place.
11. Click **Save**.

You will use these values in the **Unique Identifier** and **Secret** fields in Celonis platform.

[### Establishing the connection with Zendesk in Celonis platform](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4607968568772834001152187934_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Zendesk module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **Domain** field, enter your Zendesk domain. You can find your Zendesk domain in your browser's address bar. Example: domain.zendesk.com.
4. In the **Unique Identifier** field, enter the Unique Identifier value copied above.
5. In the **Secret** field, enter the Secret value copied above.
6. Click **Save**.
7. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Zendesk modules.

[## Setting up Zendesk Webhooks](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_section-idm4581188375409634001197774674_body)

This app uses [webhooks](webhooks--action-flow-.html "Webhooks (Action Flow)") to trigger a Action Flow when an event occurs instantly. All webhook modules have an `instant` tag next to their name.

To set up a webhook, follow these steps:

1. Add a Zendesk `instant` module to your Action Flow and click **Create a webhook**.
2. Optional: Enter a name for the webhook in the **Webhook name** field.
3. Select the corresponding connection for the webhook in the **Connection** field.
4. Click **Save** > **Copy address to clipboard**. You will use this link to set up your webhook in your Zendesk account.
5. Log in to your Zendesk account.
6. Click **Apps and integrations > Webhooks**.
7. Click **Create webhook**.
8. Choose **Trigger or automation** and click **Next**.
9. Enter a name for your webhook.
10. Enter the Endpoint URL that was copied from Celonis platform.
11. Choose your **Request method**, **Request format**, and **Authentication type** and click **Create webhook**.
12. Next, you will need to select a trigger or automation in the Admin Center. Click **Add trigger** and enter a name.
13. Choose a **Category**.
14. Set the conditions that are necessary for the trigger to run.
15. Under **Actions**, select **Notify by > active webhook** and then choose your new webhook that you just created. Click **Create**.
16. Return to the Webhooks page and click **Finish setup**.

Zendesk will now send data to Celonis platform through the webhook when the selected event occurs.

[## Triggers](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-5eac8574-ee22-e04f-e303-34a9381329d3_body)

[### Watch Tickets](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-8fd3d05b-5b32-0764-69be-107d4280e48b_body)

Triggers when a new ticket is created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the tickets you want to watch:  - *Only new tickets* - *All changes* |
| **Search By** | Select or map the option to search the tickets:  - *User Defined Query* - *Filter* |
| **Filtering** | Enter (map) the query to search for the tickets that match the specified query. For more information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:ticket` is automatically added to the query. |
| **Filter** | Select or map the field and its value to search for the tickets that match the specified filters. |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### Watch Tickets in a View](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-901c6666-5af5-2a1f-ce2c-20a12004f444_body)

Checks whether new tickets were created in a view.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **View ID** | Select or map the View ID in which you want to watch the tickets. |
| **Watch** | Select or map the option to search the tickets:  - *User Defined Query* - *Filter* |
| **Status** | Select or map the status of the ticket you want to watch:  - *New* - *Open* - *Pending* - *Hold* - *Solved* - *Closed* |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### Watch Ticket Activity](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-82362bd6-a1c6-d1b6-96a3-915698acae95_body)

Checks whether there are new audits (activity) on a ticket.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Enter the Ticket ID whose activities you want to watch. |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### List Tickets](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-4c8b40cb-9ce3-76ab-fa5d-dd3e4258cac6_body)

Retrieves all tickets (except for archived or soft-deleted tickets).

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Sort By** | Select or map the option to sort the tickets you are searching for:  - *Date of the last update* - *Created at* - *Priority* - *Status* - *Ticket type* |
| **Sort Order** | Select or map the order to list the tickets:  - *Ascending* - *Descending* |
| **Filter by User or Organization** | Select or map the option to filter the tickets:  - *User* - *Organization* |
| **User** | Select or map the user whose tickets you want to list. |
| **Filter** | Select or map the option to list the specific tickets of the user:  - *Requested Tickets* - *CC'd Tickets* - *Assigned Tickets* |
| **Filter by Organization** | Select or map the organization whose tickets you want to list. |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### Search Tickets](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-b15f8c83-9dc2-2f73-8fe0-f1595f523a47_body)

Returns tickets that match specified criteria.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Search By** | Select or map the option to search the tickets:  - *User Defined Query* - *Filter* |
| **Filtering** | Enter (map) the query to search the tickets that match the specified query. For more information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:ticket` is automatically added to the query. |
| **Filter** | Select or map the field and its value to search the tickets that match the specified filters. |
| **Sort by** | Select or map the option to sort the tickets you are searching for:  - *Date of the last update* - *Created at* - *Priority* - *Status* - *Ticket type* |
| **Sort order** | Select or map the order to list the tickets:  - *Ascending* - *Descending* |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### List Soft Deleted Tickets](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-2b3e7e5a-d913-f1cc-6c40-5080bd1efcaa_body)

Retrieves tickets that were soft deleted.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Sort By** | Select or map the option to sort the deleted tickets:  - *Date of the last update* - *Created at* - *Priority* - *Status* - *Ticket type* |
| **Sort Order** | Select or map the order to the deleted tickets:  - *Ascending* - *Descending* |
| **Limit** | Set the maximum number of tickets Celonis platform should return during one scenario execution cycle. |

[### Get a Ticket](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-5c5f31eb-2e86-1e58-8fcd-2cedded1810f_body)

Retrieves a ticket.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID or Ticket External ID** | Select or map the option to choose the ticket whose details you want to retrieve:  - *Ticket ID* - *Ticket External ID* |
| **Ticket ID** | Select or map the Ticket ID whose details you want to retrieve. |
| **Ticket External ID** | Select or map the Ticket External ID whose details you want to retrieve. |

[### Creates a Ticket](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-765192f3-2e5b-8c2f-3c80-5de2c7f6600c_body)

Creates a ticket.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Subject** | Enter the subject line of the ticket. |
| **Comment Type** | Select the comment type of the ticket:  - *HTML* - *Plain text* |
| **Comment** | Enter (map) the comment text either in HTML Body or plain text format. |
| **Public Comment** | Select the checkbox if this is a public comment. By default, the comment is an internal note; if you check this box, it becomes a public comment. The email CC field only works if public comment is sent. |
| **Author ID** | Select or map the Author ID who is entering the comment. |
| **Uploads** | Add the upload token to upload the attachments. |
| **Closed Ticket ID** | Select or map the Closed Ticket ID of a closed ticket for which you create a follow-up ticket. |
| **Type** | Select or map the ticket type:  - *Problem* - *Incident* |
| **Priority** | Select the priority of the ticket:  - *Urgent* - *High* - *Normal* - *Low* |
| **Status** | Select the status of the ticket:  - *New* - *Open* - *Pending* - *Hold* - *Solved* - *Closed* |
| **Requester ID** | Enter the Requester ID who raised the support ticket. |
| **Submitter ID** | Enter the submitter ID who submitted the ticket. The submitter becomes the author of the first comment on the ticket if no author ID is provided. |
| **Assignee ID** | Enter the Assignee ID to whom the ticket is assigned. |
| **Group ID** | Enter the Group ID to which the ticket is assigned. |
| **Recipient** | Enter (map) the original recipient e-mail address of the ticket. |
| **Collaborators** | Select the collaborators of the ticket. This field allows the selection of multiple user IDs for collaborators. However, this field can be used more flexibly (adding users through email or even on-the-fly creation of users). For more information, see [the Zendesk Documentation](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#setting-collaborators). |
| **Followers** | Add the User ID and email address of the users whom you want to add as followers for the ticket. |
| **Email CCs** | Add the User ID and email address of the users you want to add to the CC field of the email you want to send regarding the ticket. |
| **Ticket Form ID** | Select or map the Ticket Form ID option from the list. |
| **Macro IDs** | Select or map the Macro ID for the ticket. For example, `customers not responding`. |
| **Tags** | Enter the tags to filter the ticket when searching. |
| **Brand ID** | Select or map the Brand ID of the ticket. For example, `company name`. |
| **Metadata** | Enter (map) the ticket metadata in JSON format. For more information, see [the Zendesk Documentation](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#setting-collaborators). |
| **External ID** | Enter an External ID to associate the Zendesk ticket with the local records. |
| **Problem ID** | Enter the Problem ID linked to the incident if the ticket type is selected as an incident. |
| **Custom Fields** | Add the custom fields and their values. For example, `ticket due date`. |

[### Update a Ticket](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-d70a2577-ab74-42c7-90f0-b9a3190a0c5e_body)

Updates a ticket. The update allows for adding a new comment too.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Select or map the Ticket ID whose details you want to update. |
| **Comment Type** | Select the comment type of the ticket:  - *HTML* - *Plain text* |
| **Comment** | Enter (map) the comment text either in HTML Body or plain text format. |
| **Public Comment** | Select the checkbox if this is a public comment. By default, the comment is an internal note; if you check this box, it becomes a public comment. The email CC field only works if public comment is sent. |
| **Author ID** | Select or map the Author ID who is entering the comment. |
| **Uploads** | Add the upload token to upload the attachments. |
| **Closed Ticket ID** | Select or map the Closed Ticket ID of a closed ticket for which you create a follow-up ticket. |
| **Type** | Select or map the ticket type:  - *Problem* - *Incident* |
| **Priority** | Select the priority of the ticket:  - *Urgent* - *High* - *Normal* - *Low* |
| **Status** | Select the status of the ticket:  - *New* - *Open* - *Pending* - *Hold* - *Solved* - *Closed* |
| **Requester ID** | Enter the Requester ID who raised the support ticket. |
| **Submitter ID** | Enter the submitter ID who submitted the ticket. The submitter becomes the author of the first comment on the ticket if no author ID is provided. |
| **Assignee ID** | Enter the Assignee ID to whom the ticket is assigned. |
| **Group ID** | Enter the Group ID to which the ticket is assigned. |
| **Recipient** | Enter (map) the original recipient e-mail address of the ticket. |
| **Collaborators** | Select the collaborators of the ticket. This field allows the selection of multiple user IDs for collaborators. However, this field can be used more flexibly (adding users through email or even on-the-fly creation of users). For more information, see [the Zendesk Documentation](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#setting-collaborators). |
| **Followers** | Add the User ID and email address of the users you want to add as followers for the ticket. |
| **Email CCs** | Add the User ID and email address of the users you want to add to the CC field of the email you want to send regarding the ticket. |
| **Ticket Form ID** | Select or map the Ticket Form ID option from the list. |
| **Macro IDs** | Select or map the Macro ID for the ticket. For example, `customers are not responding`. |
| **Tags** | Enter the tags to filter the ticket when searching. |
| **Brand ID** | Select or map the Brand ID of the ticket. For example, `company name`. |
| **Metadata** | Enter (map) the ticket metadata in JSON format. For more information, see [the Zendesk Documentation](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#setting-collaborators). |
| **External ID** | Enter an External ID to associate the Zendesk ticket with the local records. |
| **Problem ID** | Enter the Problem ID linked to the incident if the ticket type is selected as an incident. |
| **Custom Fields** | Add the custom fields and their values. For example, `ticket due date`. |

[### Merge Tickets](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-35196f18-da52-4dec-cb91-6dfab9aec3df_body)

Merges tickets into a single ticket.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Enter the target Ticket ID to which you want to merge a ticket. |
| **Ticket IDs** | Add the source Ticket ID which you want to merge. |
| **Target Comment** | Enter the comment for merging the source ticket. |
| **Target Comment Public** | Select whether the in-target ticket's comment is public or private. |
| **Source Comment** | Enter the comment for merging with the target ticket. |
| **Source Comment Public** | Select whether the in-source comments are public. |

[### Soft Delete a Ticket](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-ddcf6b13-81a1-89fe-4f3b-9d0472587652_body)

Soft deletes a ticket.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Enter the Ticket ID you want to delete. |

[### Permanently Deletes a Ticket](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-e9398f76-9c47-1194-8a27-734f2ae7195b_body)

Deletes a ticket permanently.

**Required Permissions:** read, write

Establish a connection to your Zendesk account.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Soft Delete or Soft + Hard Delete** | Select or map the option using which you want to delete the ticket:  - *Soft + Permanent Delete* - *Permanent Delete*  **Note:** To delete a ticket permanently, you first need to soft delete the ticket. |
| **Ticket ID** | Enter the Ticket ID you want to delete. |

[### Upload Attachments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-9d405ca2-ec6a-b1aa-e4e7-887468b114e5_body)

Uploads attachments for future use in a ticket.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Attachments** | Add the attachment details: **File Name** Enter (map) the file name. **Data** Enter (map) the file data. |

[## Ticket Comments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-e674bebf-0806-2b0b-1066-6969f0ac565b_body)

[### Watch a Ticket's Comments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-a-tickets-comments_body)

Checks whether new comments were made on a specified ticket.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Limit** | Enter the maximum number of comments Celonis platform should return during one scenario execution cycle. |

[### List Ticket's Comments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_list-tickets-comments_body)

Lists the Comments were made on a specified ticket.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Select or map a Ticket ID whose comments you want to list. |
| **Limit** | Enter the maximum number of comments Celonis platform should return during one scenario execution cycle. |

[### Create a Ticket Comment](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_create-a-ticket-comment_body)

Creates a ticket comment.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Ticket ID** | Enter the Ticket ID to which you want to add a comment. |
| **Comment** | Add the comment details:  |  |  | | --- | --- | | **Plain Body** | Enter the comment text in plain body format. | | **HTML Body** | Enter the comment text in HTML body format. | | **Public Comment** | Select whether the comment is public. By default, this is an internal note; if you check this box, it becomes a public comment. **Note:** The email CC field only works if a public comment is sent. | | **Author ID** | Enter (map) the Author ID who is commenting. | | **Uploads** | Add the uploads: Enter upload tokens from the module `Upload attachments` . | |

[## Ticket Custom Field Options](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-c9827674-dca4-7a31-e092-1040989c082d_body)

[### List Ticket Custom Field Options](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_list-ticket-custom-field-options_body)

List the options of a ticket custom field.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Custom Field ID** | Select or map the Custom Field ID whose options you want to list:  - *Multi-Select Test* - *Dropdown Test* |
| **Limit** | Set the maximum number of field options Celonis platform should return during one execution cycle. |

[### Create or Update a Ticket Field Option](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_create-or-update-a-ticket-field-option_body)

Creates or updates a drop-down ticket field option.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Custom Field ID** | Select or map the Custom Field ID whose options you want to list:  - *Multi-Select Test* - *Dropdown Test* |
| **Create or Update** | Select or map the option whether you want to create or update the ticket. |
| **Option ID** | Select or map the Option ID whose details you want to update. |
| **Option Name** | Enter (map) the option name. For example, `Ticket ID`. |
| **Option Value** | Enter (map) the option value. For example, `ID value`. |

[### Remove a Ticket Field Option](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_remove-a-ticket-field-option_body)

Removes a drop-down ticket field option.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Custom Field ID** | Select or map the Custom Field ID whose option you want to delete:  - *Multi-Select Test* - *Dropdown Test* |
| **Option ID** | Select or map the Option ID you want to delete. |

[## Organizations](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-88181ce1-0362-9b4a-d0f4-e0efa3bd1d0c_body)

[### Watch Organizations](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-organizations_body)

Checks whether new organizations were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the organizations you want to watch:  - *Only new organizations* - *All changes* |
| **Filtering** | Add the filtering query to watch the organizations based on the specified query. For detailed information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:organization` is automatically added to the query. |
| **Limit** | Set the maximum number of organizations Celonis platform should return during one scenario execution cycle. |

[### List Organization](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_list-organization_body)

Retrieves all organizations.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filter by User or Organization Name** | Select the option for the organizations you want to watch:  - *Users* - *Organization Name* |
| **Filter by User ID** | Select or map the User ID whose organizations you want to list. |
| **Filter by Organization Name** | Enter (map) the name to list the organizations that match the specified name. |
| **Limit** | Set the maximum number of organizations Celonis platform should return during one scenario execution cycle. |

[### Search Organizations](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_search-organizations_body)

Searches for an organization that matches the specified criteria.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Sort By** | Select or map the option to sort the organizations:  - *Created Date* - *Updated Date* |
| **Sort Order** | Select or map the order in which you want to arrange the search results. For example, `Ascending`. |
| **Filtering** | Enter (map) the filtering query to search the organizations that match the query. For detailed information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:organization` is automatically added to the query. |
| **Limit** | Set the maximum number of organizations Celonis platform should return during one scenario execution cycle. |

[### Get an Organization](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_get-an-organization_body)

Retrieves an organization.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Organization ID or Organization External ID** | Select or map the option to retrieve the details of the organization:  - *Organization ID* - *Organization External ID* |
| **Organization ID** | Select or map the Organization ID whose details you want to retrieve. |
| **Organization External ID** | Select or map the Organization External ID whose details you want to retrieve. |

[### Create or Update an Organization](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_create-or-update-an-organization_body)

Creates a new organization.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Create or Create/Update** | Select or map the option for the action you want to perform:  - *Create Only* - *Create or update if an organization exists* |
| **Organization Name** | Enter (map) the organization name. The organization name is required for creating organizations and not for updating them. This field can be updated if combined with an existing organization ID or an existing external organization ID and must always be unique. |
| **Organization ID** | Select or map the Organization ID. |
| **External Organization ID** | Enter (map) the External Organization ID to identify the organization in the external systems. |
| **Domain Names** | Add the domain names for the organization. For example, `Celonis platform`. |
| **Details** | Enter (map) any information about the organization. |
| **Notes** | Enter any additional information you would like to mention about the organization. |
| **Group ID** | Select the Group ID associated with the organization. New tickets from users in this organization are automatically put in this group. For example, `support`. |
| **Shared Tickets** | Select whether the organization has shared tickets. End users in this organization can see each other's tickets. |
| **Shared Comments** | Select whether the organization has shared comments. End users in this organization can see each other's comments on tickets. |
| **Tags** | Select or map the tags for the organization. |
| **Organizational Fields** | Add any additional fields about the organization. For example, `date`. |

[### Update an Organization](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_update-an-organization_body)

Updates an existing organization.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Organization ID** | Select or map the Organization ID whose details you want to update. |
| **Organization Name** | Enter (map) the organization name. The organization name is required for creating organizations and not for updating them. This field can be updated if combined with an existing organization ID or an existing external organization ID and must always be unique. |
| **External Organization ID** | Enter (map) the External Organization ID to identify the organization in the external systems. |
| **Domain Names** | Add the domain names for the organization. For example, `Celonis platform`. |
| **Details** | Enter (map) any information about the organization. |
| **Notes** | Enter any additional information you would like to mention about the organization. |
| **Group ID** | Select the Group ID associated with the organization. New tickets from users in this organization are automatically put in this group. For example, `support`. |
| **Shared Tickets** | Select whether the organization has shared tickets. End users in this organization can see each other's tickets. |
| **Shared Comments** | Select whether the organization has shared comments. End users in this organization can see each other's comments on tickets. |
| **Tags** | Select or map the tags for the organization. |
| **Organizational Fields** | Add any additional fields about the organization. For example, `date`. |

[### Delete an Organization](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_delete-an-organization_body)

Deletes an organization.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Organization ID or Organization External ID** | Select or map the option through which you want to delete the organization. |
| **Organization ID** | Select or map the Organization ID you want to delete. |
| **Organization External ID** | Select or map the Organization External ID you want to delete. |

[## Groups](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-54dc7f9b-b5f1-920f-6fb3-4ab689ef2a18_body)

[### Watch Groups](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-groups_body)

Checks whether new groups were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the groups you want to watch:  - *Only New Organizations* - *All Organizations* |
| **Filtering** | Enter (map) the query to watch the groups that match the specified query. For detailed information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:group` is automatically added to the query. |
| **Limit** | Enter the maximum number of groups Celonis platform should return during one scenario execution cycle. |

[### List Groups](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_list-groups_body)

Retrieves all groups.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filters** | Select or map the option to list the groups:  - *User* - *Assignable Groups Only* |
| **Filter by User ID** | Select or map the User ID whose groups you want to list. |
| **Limit** | Set the maximum number of groups Celonis platform should return during one execution cycle. |

[### Get a Group](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_get-a-group_body)

Retrieves a group.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Group ID** | Select or map the Group ID whose details you want to retrieve. |

[### Create a Group](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_create-a-group_body)

Creates group.

**Required Permissions:** write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Name** | Enter (map) a name for the group. |
| **Description** | Enter (map) the details of the group. |

[### Update a Group](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_update-a-group_body)

Updates an existing group.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Group ID** | Select or map the Group ID whose details you want to update. |
| **Name** | Enter (map) a new name for the group. |
| **Description** | Enter (map) the details of the group. |

[### Delete a Group](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_delete-a-group_body)

Deletes a group.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Group ID** | Select or map the Group ID you want to delete. |

[## Users](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-1e3660c5-1f6d-db95-613e-3ca403489734_body)

[### Watch Users](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-users_body)

Checks whether new users were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the users you want to watch:  - *Only New Users* - *All Users* |
| **Filtering** | Enter (map) the query to watch the users that match the specified query. For more information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:user` is automatically added to the query. |
| **Limit** | Set the maximum number of users Celonis platform should return during one scenario execution cycle. |

[### List Users](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_list-users_body)

Retrieves all users, a group's, or an organization's users.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filter by Group ID or Organization ID** | Select or map the option to search the users:  - *Organization ID* - *Group ID* |
| **Organization ID** | Select or map the Organization ID whose users you want to list. |
| **Group ID** | Select or map the Group ID whose users you want to list. |
| **Filter by Default Role ID** | Select or map the Default Role ID of the users you want to list. |
| **Filter by Custom Role ID** | Select or map the Custom Role ID of the users you want to list. |
| **Limit** | Set the maximum number of users Celonis platform should return during one execution cycle. |

[### Search Users](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_search-users_body)

Searches for a user that matches specified criteria.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Sort By** | Select or map the option to sort the users:  - *Created Date* - *Updated Date* |
| **Sort Order** | Select or map the order in which you want to list the users. For example, `Ascending`. |
| **Filtering** | Enter (map) the query to filter the users that match the specified query. For more information on setting up a filter, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). The `type:user` is automatically added to the query. |
| **Limit** | Select the user role you are creating:  - *Agent* - *Administrator* - *End User*  *If you do not select a role for the user, the new user is assigned the role of the end-user.* |

[### Get a User](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_get-a-user_body)

Get an existing user.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **User ID or User External ID** | Select or map the option to retrieve the users:  - *User ID* - *User External ID* |
| **User ID** | Select or map the User ID whose details you want to retrieve. |
| **User External ID** | Select or map the User External ID whose details you want to retrieve. |

[### Get User Related Information](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_get-user-related-information_body)

Returns related information about the user specified by the given user ID. For example, `the number of assigned tickets`.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **User ID** | Enter the User ID whose details you want to retrieve. |

[### Create or Update a User](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_create-or-update-a-user_body)

Creates a user.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Create or Create/update** | Select or map the option to create or update a user:  - *Create Only* - *Create or Update if a user already exists* |
| **User ID** | Select the User ID whose details you want to update. |
| **Name** | Enter the name of the user. |
| **Email** | Enter the email address of the user. |
| **External ID** | Enter (map) the External ID of the user to identify in external systems. |
| **Role** | Select the user role you are creating:  - *Admin* - *Agent* - *End User* |
| **Ticket Registration** | Select or map the ticket access for the user:  - *Organization* - *Requested* |
| **Verified** | Select whether you want to send a verification mail to the user. |
| **Organization ID** | Select or map the Organization ID to which the user belongs. |
| **Details** | Enter (map) any additional information you want to store about the user. For example, `address`. |
| **Phone** | Enter the user's phone number. |
| **Locale** | Enter (map) the BCP-47 compliant tag for the locale. |
| **Locale ID** | Enter (map) the locale ID of the user. This field is applicable if the locale is not available. |
| **Suspended** | Select whether the user is suspended. |
| **Tags** | Select or map the tags for the user. |
| **Time zone** | Enter (map) the time zone for the user. For more information on a valid time zone, [click here](https://developer.zendesk.com/api-reference/ticketing/users/users/#time-zone). |
| **User fields** | Add the user fields. For example, `the user's birthday`. |

[### Update a User](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_update-a-user_body)

Updates a user.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **User ID** | Select the User ID whose details you want to update. |
| **Name** | Enter (map) the name of the user. |
| **Email** | Enter (map) a new email address of the user. This will not update the primary email but will add a secondary email. |
| **Role** | Select the user role you are creating:  - *Agent* - *Admin* - *End User*  *If you do not select a role for the user, the new user is assigned the role of the end-user.* |
| **External ID** | Enter (map) the External ID which you can link to Zendesk tickets to local records. |
| **Alias** | Enter (map) the alias name for the user. |
| **Verified** | Select whether you want to send a verification email to the user. |
| **Organization ID** | Select or map the Organization ID to which the user belongs. |
| **Details** | Enter (map) the details of the user. |
| **Notes** | Enter any additional information you would like to mention about the user. |
| **Phone** | Enter (map) the phone number of the user. |
| **External ID** | Enter (map) the External ID of the user to identify in external systems. |
| **Locale** | Enter (map) a BCP-47 compliant tag for the locale. |
| **Locale ID** | Enter (map) the language ID of the user. |
| **Suspended** | Select whether the user is suspended. |
| **Tag** | Enter (map) the tags to filter the user when searching. |
| **Ticket Restriction** | Select the access for tickets of the user:  - *Organization* - *Groups* - *Assigned* - *Requested* - *Null* |
| **Time Zone** | Enter (map) the time zone applicable to the user. For more information on a valid time zone, [click here](https://developer.zendesk.com/api-reference/ticketing/users/users/#time-zone). |
| **User fields** | Add the user fields. For example, `the user's birthday`. |

[### Delete a User](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_delete-a-user_body)

Deletes a user.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **User ID or User External ID** | Select or map the option through which you want to delete the user:  - *User ID* - *User External ID* |
| **User ID** | Select or map the User ID you want to delete. |
| **User External ID** | Select or map the User External ID you want to delete. |

[## Other Triggers](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-425fa932-00a0-7de4-6f25-578da8d19c14_body)

[### Watch Events](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-events_body)

Watches specific events configured by the user through Zendesk triggers or automation.

|  |  |
| --- | --- |
| **Webhook Name** | Enter a name for the webhook. |

See the **Set Up Zendesk Webhooks** section to add a webhook in your Zendesk account.

[### Watch Articles](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-articles_body)

Checks whether new articles were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the articles you want to watch:  - *Only New Articles* - *All Articles* |
| **Limit** | Set the maximum number of results Celonis platform should return during one execution cycle. |

[### Watch Article Comments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-article-comments_body)

Checks whether new comments were added to an article.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Article ID** | Select or map the Article ID whose comments you want to watch. |
| **Limit** | Set the maximum number of article comments Celonis platform should return during one execution cycle. |

[### Watch Forum Posts](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-forum-posts_body)

Checks whether new forum posts were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filter by User or Topic** | Select or map the option for the forum posts you want to watch:  - *User* - *Topic* |
| **Filter by User** | Select or map the user whose forum posts you want to watch. |
| **Filter by Topic** | Select or map the option for which topic you want to watch:  - *General Discussion* - *Feature Requests* |
| **Watch** | Select or map the option for the forum posts you want to watch:  - *Only New Forum Posts* - *All Forum Posts* |
| **Limit** | Set the maximum number of forum posts Celonis platform should return during one execution cycle. |

[### Watch Forum Post Comments](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_watch-forum-post-comments_body)

Checks whether new comments were added to a forum post.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filter by User or Post** | Select or map the option for the forum post comments you want to watch:  - *User* - *Post* |
| **Filter by User** | Select or map the user whose forum posts comments you want to watch. |
| **Filter by Post** | Select or map the post whose forum posts comments you want to watch. |
| **Limit** | Set the maximum number of forum post comments Celonis platform should return during one execution cycle. |

[## Watch Views](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-79f1ed21-e93b-c08e-2cb0-585f93953d26_body)

Checks whether new views were created.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Watch** | Select the option for the views you want to watch:  - *Only New Views* - *All Views* |
| **Limit** | Set the maximum number of views Celonis platform should return during one execution cycle. |

[## Other](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_UUID-34688b0f-df77-73ea-8875-f6c72c4b2892_body)

[### Add, Replace, or Remove Tags](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_add-replace-or-remove-tags_body)

Adds tags or replaces existing ticket, user, or organization tags.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Add, Replace or Remove** | Select or map the action you want to perform:  - *Add* - *Replace* - *Remove* |
| **User or Organization or Ticket** | Select or map the option that you want to add, replace, or remove the tags:  - *User* - *Organization* - *Ticket* |
| **User ID** | Select or map the user ID whose tags you want to add, replace, or remove. |
| **Organization ID** | Select or map the organization ID whose tags you want to add, replace, or remove. |
| **Ticket ID** | Select or map the ticket ID whose tags you want to add, replace, or remove. |
| **Tags** | Select or map the tags you want to add, replace, or remove. |

[### Search Anything](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_search-anything_body)

Retrieves any kind of object making your query.

**Required Permissions:** read

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **Filtering** | Enter (map) the query for filtering the results you want to search. For more information on setting up a query, see the [Zendesk documentation](https://support.zendesk.com/hc/en-us/articles/203663226). |
| **Sort By** | Select or map the option to sort the search results:  - *Created Date* - *Updated Date* - *Priority* - *Status* - *Ticket Type* |
| **Sort Order** | Select or map the order in which you want to arrange the search results:  - *Ascending* - *Descending* |
| **Limit** | Set the maximum number of results Celonis platform should return during one execution cycle. |

[### Make an API Call](#UUID-2e21eb9b-1660-197a-7859-0d2c82dd4372_id_make-an-api-call_body)

Performs an arbitrary authorized API Call.

**Required Permissions:** read, write

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Zendesk account. |
| **URL** | Enter a path relative to `https://your.url.zendesk.com`. For example: `/api/v2/users/{user.id}.json`  For the list of available endpoints, refer to the [Zendesk API Documentation](https://developer.zendesk.com/rest_api/). |
| **Method** | Select the HTTP method you want to use:  - **GET** - to retrieve information for an entry. - **POST** - to create a new entry. - **PUT** - to update/replace an existing entry. - **PATCH** - to make a partial entry update. - **DELETE** - to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

