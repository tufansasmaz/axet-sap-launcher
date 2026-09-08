# Data Integration: Connectors (Part 2)

## data-integration/connectors/connecting-to-microsoft-dynamics-365-fo

# Connecting to Microsoft Dynamics 365 F&O (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Microsoft Dynamics 365 F&O (Finance & Operations) extractor is based on the Celonis Platform Extractor Builder and uses the OData APIs of the source system to query the data (see: [OData reference by Microsoft](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata)).You can either use the default extractor that is provided by Celonis or use the Extractor Builder to customize to your requirements.

Expand all

[## Known limitations](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm235020642135806_body)

This extractor has the following known limitations:

- No automated way to access Changelog data (only via manual file uploads).
- Objects/tables of P2P and O2C are preconfigured. Additional objects and tables need to be added manually.

[## Authentication and Permissions](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm235020643387657_body)

The Microsoft Dynamics API uses OAuth2 for authentication. The following information is required for the connection set-up:

- Host URL of the system
- Tenant ID
- Client ID
- Client secret

In order to use the Extractor, you need to set-up the Azure Active Directory Portal for 3rd party app authentication with Dynamics 365 F&O. For that you can follow these steps:

1. Navigate to portal.azure.com
2. Open the **Application Active** directory and click **App Registration**.
3. Add a new app registration with the following information:

   - **Name**: Assign a name to the application.
   - **Supported account types**: Accounts in this organizational directory only.
   - **Redirect URI**: <Your-Dynamics-Host-URL>/oauth
4. After registering the application an application id (client id) and a directory id (tenant id) will be created. This will be required as input parameters for the connection set-up later.
5. Navigate to ‘**Certificates & secret**’ and ‘**client secrets**’ and create a new client secret. Make sure to copy the client secret as it will be only visible now and masked afterwards.
6. Navigate to ‘**API permissions**’ and add a new permission:

   - Select API permissions for ‘Dynamics ERP’.
   - Select ‘Delegated permissions’.
   - Make sure to check ‘Odata.Full.Access’.
7. Go to the Microsoft Dynamics 365 system and navigate to ‘System administration’ → ‘Setup’ → ‘Azure active directory applications’ and add the application id (client id) that was created in the previous steps.
8. The set-up on the source system side is completed and you can create a data connection in Celonis using the obtained inputs:

   - Host URL of the system
   - Tenant ID
   - Client ID
   - Client secret

[## Used Endpoints](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm235020667644598_body)

The current version of the Extractor is supporting the endpoints that are required for the processes Purchase-to-Pay and Order-to-Cash. In total the following 84 data entities are supported. They can be extended by customizing the Extractor using the Extractor Builder.

InventoryPolicies

- BillOfMaterialsHeaders
- BillOfMaterialsLines
- BillOfMaterialsVersionsV4
- BusinessDocumentNonStockedPackingSlipLines
- BusinessDocumentStockedPackingSlipLines
- CashDiscounts
- ContactPersons
- Currencies
- CustomerGroups
- CustomerPaymentJournalLines
- CustomerPaymentMethods
- CustomerPostalAddresses
- CustomersV3
- DeliveryModesV2
- DeliveryTerms
- FinancialDimensionValues
- FormulaLinesV2
- FormulaVersionsV2
- InventItemPendingPricesV2
- InventoryPolicies
- InventoryReservationHierarchies
- LanguageCodes
- LineDiscountProductGroups
- LineDiscountVendorGroups
- MultilineDiscountCustomerGroups
- MultilineDiscountProductGroups
- MultilineDiscountVendorGroups
- OpenPurchaseLineDiscountJournalLines
- OpenPurchasePriceJournalLinesV2
- PaymentJournalLineSettledInvoices
- PaymentSchedules
- PaymentTerms
- PostingProfileHeaders
- ProductDefaultOrderSettings
- ProductReceiptHeaders
- ProductReceiptLines
- ProductSpecificOrderSettingsV3
- Prospects
- PurchaseAgreementConfirmationLines
- PurchaseAgreementConfirmations
- PurchaseAgreementLinesV2
- PurchaseAgreements
- PurchaseLineDiscountAgreements
- PurchaseMultiLineDiscountAgreements
- PurchaseOrderConfirmationHeaders
- PurchaseOrderConfirmationLines
- PurchaseOrderHeadersV2
- PurchaseOrderLinesV2
- PurchasePriceAgreement
- PurchaseRequisitionHeaders
- PurchaseRequisitionLines
- PurchaseTotalDiscountAgreements
- QualityOrderHeaders
- QualityOrderLineResults
- ReleasedProductCreationsV2
- ReleasedProductsV2
- RequestForQuotationReplyHeaders
- RequestForQuotationReplyLines
- RetailTenderTypes
- ReturnOrderHeaders
- ReturnOrderLines
- SalesInvoiceHeadersV2
- SalesInvoiceV3Lines
- SalesLineDiscountAgreements
- SalesMultiLineDiscountAgreements
- SalesOrderConfirmationHeaders
- SalesOrderConfirmationLines
- SalesOrderHeadersV2
- SalesOrderLines
- SalesPriceAgreements
- SalesQuotationHeadersV2
- SalesQuotationLines
- SalesTotalDiscountAgreements
- TaxGroups
- TotalDiscountVendorGroups
- UnitsOfMeasure
- VATNumTables
- VendorBankAccounts
- VendorGroups
- VendorInvoiceHeaders
- VendorInvoiceLines
- VendorPaymentJournalLineSettledInvoices
- VendorPaymentJournalLines
- VendorsV2

[## Limitation: Access to Changelog data](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm235020678996366_body)

The OData APIs of Microsoft Dynamics 365 don’t allow us to access and extract any changelog data from the system. To fetch that data, we need to rely on the built in database log functionality, export the logs in files and upload these into the Celonis Platform. Missing Changelog access is the main limitation of this extraction method because it can only be done in a manual way.

The database logs are required to track any kind of change activities.

To enable the database logs you can following these steps:

1. Go to Microsoft Dynamics 365 and navigate to System Administration → Setup → Database log → Database log setup.
2. Click New.
3. Click next in the Step ‘Logging and database changes’
4. Activate the checkboxes ‘Show all tables’ and ‘Show table names’.
5. Select all Tables and Fields (columns) for which you want to enable Database logs → As part of the Process Connectors for P2P and O2C we provide a recommendation of fields. You can find these in the first transformation script of the respective process connector.
6. Click on Next and select the ‘Update’ check box for the fields you have selected in the previous step.
7. Click on next and finish the process.

Extract the Database logs by following these steps:

1. Go to Microsoft Dynamics 365 and navigate to System Administration → Inquiries → Database logs.
2. Click on Database Log on the action pane at the top of the screen.
3. Click Ok to run the report as a Batch job.
4. Export the database log as a Excel file and upload it in the Celonis Platform.

[## Configuring the Microsoft Dynamics 365 F&O extractor](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-id235174801797154_body)

This section describes the basic setup of configuring the Bamboo extractor. To configure the extractor:

**Note**

For configuration, the Microsoft Dynamics 365 F&amp;O extractor has specific instructions for OAuth2 fields. For more information, see [Authentication and Permissions](connecting-to-microsoft-dynamics-365-fo.html#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm235020643387657 "Authentication and Permissions").

[## Microsoft Dynamics 365 F&O extractor limitations and known issues](#UUID-4e06a465-8487-1e16-1e4b-9512c665650f_section-idm2533523624778162_body)

This section explains the limitations and known issues for the Microsoft Dynamics 365 F&O extractor:

- The native 365 F&O APIs do not expose changelog data. Tracking change activities requires exporting the system's built-in database logs and uploading them separately to Celonis. For guidance on enabling and exporting these logs, see the [Microsoft documentation](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/sysadmin/configure-manage-database-log).

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-microsoft-dynamics-ax

# Connecting to Microsoft Dynamics AX (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Microsoft AX extractor allows you to transfer data from your Microsoft Dynamics AX ERP system to the Celonis Platform for process mining and analysis. It supports the following basic features:

- The Microsoft Dynamics AX extractor is **only** for use with uplink connections via on-premise extractors.

If you want to extract the SysDatabaseLog table, see: [(Optional) Extracting the SysDatabaseLog table](connecting-to-microsoft-dynamics-ax.html#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-idm454430771683683424855140255 "(Optional) Extracting the SysDatabaseLog table").

Expand all

[## Before you begin](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-idm2533519857524782_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### On-premise extractor required](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-id235198589827816_body)

Before connecting your Microsoft Dynamics AX tenant to the Celonis Platform you need to configure an on-premise extractor for the uplink connection to Microsoft Dynamics AX. For more information, see: [On-premise extractors](on-premise-extractors.html "On-premise extractors")

[### Network settings for uplink connections](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-idm2533519857651734_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[### JDBC string guidelines](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Microsoft Dynamics AX extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[### (Optional) Extracting the SysDatabaseLog table](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-idm454430771683683424855140255_body)

The data extraction from MicrosoftDynamics AX works like for every other database. However, the **SysDatabaseLog** table storing the change log events is an exception. As change log tables can grow in size and consume a lot of memory and storage, Microsoft decided to store the relevant columns of this table as a container data type. That means it is encrypted when trying to access the table via Microsoft SQL Server Management Studio (SSMS) or JDBC.

As the Celonis Platform can't read directly from the **SysDatabaseLog** container table, a view needs to be created using the following information:

```
CREATE View [dbo].[SYSDATABASELOG] as Select

[USERNAME]

,[DESCRIPTION]

,[LOGTYPE]

,MASTER.dbo.Fn_varbintohexstr(DATA) as DATA

,[TABLE_]

,[LOGRECID]

,[CREATEDDATETIME]

,[DEL_CREATEDTIME]

,[CREATEDBY]

,[CREATEDTRANSACTIONID]

,[DATAAREAID]

,[RECVERSION]

,[RECID]

from <Database_Name>.dbo.SYSDATABASELOG
```

The extraction will create two target tables, one called **SysDatabaseLog** which will extract the table as is and one called **SysDatabaseLog$audit** which decrypts the encrypted DATA column into readable strings.

For information about creating a view in Microsoft Dynamics AX, see: [Microsoft Learn - How to create a view based on tables](https://learn.microsoft.com/en-us/dynamicsax-2012/developer/how-to-create-a-view-based-on-tables-or-other-views).

[## Configuring the Microsoft Dynamics AX extractor](#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_section-idm2533519859187714_body)

This section describes the basic setup of configuring the Microsoft Dynamics AX. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, select the **Microsoft Dynamics AX – On Premise** extractor.

   1. Follow the on-screen instructions to set up the uplink connection.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Uplink connections**, ensure the correct uplink connection is displayed. If not, use the dropdown list to find and select the correct uplink connection.
   3. For **Database Type**, ensure **Microsoft AX** is selected.
   4. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1443`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-microsoft-dynamics-ax.html#UUID-a6b980b7-8f85-6a1f-cc18-449cbdcbc866_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sqlserver://<hostname>:<port>;databaseName=<database_name>;property1=value1;property2=value2;...
           ```

           **Note**

           For more information on connecting to PostgreSQL with JDBC strings, see the [Microsoft SQL documentation](https://learn.microsoft.com/en-us/sql/connect/jdbc/building-the-connection-url?view=sql-server-ver16).
         - For **Driver class**, enter your driver class name. This is typically:

           ```
           com.microsoft.sqlserver.jdbc.SQLServerDriver
           ```
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   5. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   6. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-microsoft-fabric-enterprise-data-lake

# Connecting to Microsoft Fabric

**This feature is currently available as a Private Preview only**

During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.

For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types").

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can establish zero-copy connectivity between your Microsoft Fabric enterprise data lake and the Celonis Platform, allowing you to share data between the platforms with zero latency. This means that any updates in your data lake are automatically fed to your Celonis data pool.

The benefits of this connection include:

- Enables you to mirror your Microsoft Fabric data to Celonis via a zero-copy integration.
- Embeds Celonis as a native workload within your Microsoft Fabric environment.
- Secures your data as it remains in its original location, preserving your data governance.

There are two methods for connecting your Microsoft Fabric to the Celonis Platform:

**Important**

The Microsoft Fabric zero-copy connection is only available in data pools running on the ETL engine. For more information, see [ETL Engine](etl-engine.html "ETL Engine").

- [Configuring the Microsoft Fabric connection in the Celonis Platform](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm1763495328497846 "Configuring the Microsoft Fabric connection in the Celonis Platform")
- [Creating a new item in Microsoft Fabric](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953318421178 "Creating a new item in Microsoft Fabric")

Once the connection between the systems is established, you can also embed your Studio Views into Microsoft Fabric:

- [Embedding Studio Views into Microsoft Fabric](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm23495513527973 "Embedding Studio Views into Microsoft Fabric")

Expand all

[## Zero-copy connectivity video demo](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234955105522267_body)

Watch our video demo showing you how to connect your Microsoft Fabric account to the Celonis Platform and then embed your Studio views in Microsoft Fabric:

[## Overview of connection and data access](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm235015150852538_body)

The following sections provide an overview of how Celonis Platform connects to Microsoft Fabric and how your data is accessed.

[### Connecting to Microsoft Fabric through the Celonis Platform](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm235015170986961_body)

To connect to Microsoft Fabric from the Celonis Platform (as described in [Configuring the Microsoft Fabric connection in the Celonis Platform](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm1763495328497846 "Configuring the Microsoft Fabric connection in the Celonis Platform")), a user with necessary permissions for Microsoft directory must register it in the directory.

Once it's registered, the Celonis Platform requests a delegated access to Microsoft Fabric using the OAuth 2.0 authorization code flow. This allows the Celonis Platform to act on behalf of the user to list lakehouses and configure workspace contributor access. The contributor role grants the Celonis Platform full read access to data using OneLake APIs.

After the access is established, user-based credentials are discarded, and the Celonis Platform fetches all table metadata and registers it in Celonis Data Core (Celocore). This integration allows creating a read-only data connection to schemaless Delta format lakehouses.

**Note**

Connection to lakehouses with schemas is not supported.

For the list of all permissions required for this process, see [Before you begin](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953299014887 "Before you begin").

[### Accessing data in Microsoft Fabric](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm235015172354344_body)

After establishing the connection, Microsoft Fabric tables can be used in Celocore data pools as read-only tables. This is done using a OneLake shared access signature (SAS) which separates Microsoft Entra access from the query engine. Communication between the query engine, data catalog, and data access service is secured through encrypted and authenticated channels, ensuring data confidentiality and strong tenant isolation.

The query engine can only access tables and credentials scoped to the tenant and data pool of the current execution. The engine uses these credentials to request data from the data access service. This service, in turn, generates short-lived user delegation keys and pre-signed links for OneLake objects, enabling the query engine to securely retrieve the necessary data.

For the list of all permissions required to be enabled for the Celonis Platform to fetch data from Microsoft Fabric, see [Before you begin](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953299014887 "Before you begin").

[## Before you begin](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953299014887_body)

This section details important prerequisites or prerequisite knowledge for using this connection.

**Note**

If you are connecting **from** the Celonis Platform **to** Microsoft Fabric (as described in [Configuring the Microsoft Fabric connection in the Celonis Platform](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm1763495328497846 "Configuring the Microsoft Fabric connection in the Celonis Platform")), **all permissions** described below must be configured.

If you are connecting **from** Microsoft Fabric **to** the Celonis Platform (as described in [Creating a new item in Microsoft Fabric](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953318421178 "Creating a new item in Microsoft Fabric")), you must only configure [Microsoft Fabric required tenant Admin settings](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_N1760362216213 "Microsoft Fabric required tenant Admin settings").

[### Microsoft Fabric required tenant Admin settings](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_N1760362216213_body)

In Microsoft Fabric, give the following tenant permissions to the Celonis Platform. Select the link for the Microsoft Fabric documentation for detailed information on each setting:

- [Service principals can call Fabric public APIs](https://learn.microsoft.com/en-us/fabric/admin/tenant-settings-index#:~:text=APIs%22.%20Learn%20More-,Service%20principals%20can%20call%20Fabric%20public%20APIs,-This%20setting%20allows) - gives the Celonis Platform access to Microsoft Fabric API without user context for persistent data access.
- [Users can access data stored in OneLake with apps external to Fabric](https://learn.microsoft.com/en-us/fabric/admin/tenant-settings-index#:~:text=Users%20can%20access%20data%20stored%20in%20OneLake%20with%20apps%20external%20to%20Fabric) - gives Celonis Platform permission to access OneLake using the Azure Data Lake Storage API.
- [Use short-lived user-delegated SAS tokens (preview)](https://learn.microsoft.com/en-us/fabric/admin/tenant-settings-index#:~:text=Use%20short%2Dlived%20user%2Ddelegated%20SAS%20tokens%20(preview)) - a prerequisite for SAS tokens, enables generation of user delegation keys on the tenant.
- [Authenticate with OneLake user-delegated SAS tokens (preview)](https://learn.microsoft.com/en-us/fabric/admin/tenant-settings-index#:~:text=Authenticate%20with%20OneLake%20user%2Ddelegated%20SAS%20tokens%20(preview)) - enables SAS token access on all workspaces. Can also be activated per workspace.

[### Microsoft Fabric required user permissions](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_N1760362075792_body)

To successfully establish a data connection between the Celonis Platform and Microsoft Fabric, the user who authenticates the connection must be an **Admin** or **Member** within the specific Microsoft Fabric Workspace.

For more information, see: [Microsoft Entra - Overview of user and admin consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview).

[### Microsoft Fabric required Celonis Platform permissions](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_N1760362100368_body)

In Microsoft Fabric, grant the following permissions to the Celonis Platform:

- `Lakehouse.Read.All` - read lakehouse metadata like contained tables,
- `OneLake.Read.All` - read OneLake metadata of lakehouse items like Azure Data Lake Storage URL,
- `Workspace.ReadWrite.All` - read workspaces and add the Celonis app as a contributor to your selected workspace.

[### Microsoft Graph required Celonis Platform permissions](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_N1760362127609_body)

In Microsoft Graph, grant the following permissions to the Celonis Platform:

- `offline_access` - gives access to Microsoft Fabric and Microsoft Graph resources in a single consent flow,
- `User.Read` - reads user profile.

[## Configuring Microsoft Fabric zero-copy connections](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-id23520725644284_body)

There are two methods for connecting your Microsoft Fabric to the Celonis Platform:

- [Configuring the Microsoft Fabric connection in the Celonis Platform](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm1763495328497846 "Configuring the Microsoft Fabric connection in the Celonis Platform")
- [Creating a new item in Microsoft Fabric](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953318421178 "Creating a new item in Microsoft Fabric")

**Tip**

After configuring the connection, you can also embed Celonis Studio Views in Microsoft Fabric by following the instructions in [Embedding Studio Views into Microsoft Fabric](connecting-to-microsoft-fabric-enterprise-data-lake.html#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm23495513527973 "Embedding Studio Views into Microsoft Fabric").

[### Configuring the Microsoft Fabric connection in the Celonis Platform](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm1763495328497846_body)

**Important**

The Microsoft Fabric zero-copy connection is only available in data pools running on the ETL engine. For more information, see [ETL Engine](etl-engine.html "ETL Engine").

With access to your Microsoft Fabric user account, you can create a data connection between Microsoft Fabric and the Celonis Platform:

1. From your data pool overview screen, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Select **Microsoft Fabric**.
4. Select **Authenticate**, and select your Microsoft Fabric account.

   The authentication is successful and you're redirected to the Celonis Platform. The following data connections fields are then populated:

   - Azure tenant ID
   - Workspaces and related Lakehouses

   **Note**

   If the data connection is set up by a Microsoft Entra user without sufficient permissions to grant consent for the Celonis Platform, the following message is displayed:

   In this situation, a Microsoft Entra admin must review the admin consent request in the Microsoft Entra admin center. Once approved, the user without sufficient permissions can return to the authenticate stage and continue the configuration. For more information, see the Microsoft documentation:

   - [Overview of admin consent workflow](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/admin-consent-workflow-overview)
   - [Review and take action on admin consent requests](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/review-admin-consent-requests)
5. Select the workspace and related lakehouse to use for the connection, populating the Lakehouse URL field.
6. Select **Test Connection** and correct any issues highlighted.
7. Select **Save**.

   The connection between your Microsoft Fabric account and the Celonis Platform is established.

[### Creating a new item in Microsoft Fabric](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm234953318421178_body)

You can also connect your Microsoft Fabric account to the Celonis Platform through the Fabric interface.

This method requires you to have your Celonis team and cluster that you're connecting to, available from the Celonis URL:

```
https://[TEAM].[CLUSTER].celonis.cloud/
```

You also need access to a data pool on the Celonis Platform (see: [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools"))

With this information, you can create a new item in Microsoft Fabric by following these steps:

1. Select **Workspaces**, and select the workspace you want to connect to.
2. Select **+ New Item**, and search for the 'Zero-copy integration':
3. Add an item **name**, an optional description, and then select **Create**.

   The integration screen loads.
4. Select **Start setup**, enter the Celonis **team** and **cluster** you're connecting to, and then select **Authenticate**.
5. Review and accept the authentication request with the Celonis Platform.

   The page refreshes and returns you to Microsoft Fabric.
6. Select the Lakehouse that you want to share and then select **Connect**.
7. Select the Celonis Platform data pool and **Select**.

The connection between your Microsoft Fabric account and the Celonis Platform is established.

[## Embedding Studio Views into Microsoft Fabric](#UUID-81b2255c-2562-34df-b725-e5cec3df8556_section-idm23495513527973_body)

Celonis Studio Views can be embedded in Microsoft Fabric, giving your users a way to consume and analyze the data that's being shared between the platforms.

This method requires you to have your Celonis team and cluster that you're connecting to, available from the Celonis URL:

```
https://[TEAM].[CLUSTER].celonis.cloud/
```

You also need access to a Studio space and related View that you want to embed.

To embed a Studio View into Microsoft Fabric:

1. Select **Workspaces** and select the workspace you want to embed your View into.
2. Select **+ New Item** and search for the '**Process Analysis**':
3. Add an item **name**, an optional description, and then select **Create**.

   The integration screen loads.
4. Select **Start setup**, enter the Celonis **team** and **cluster** you're connecting to, and then select **Authenticate**.
5. Review and accept the authentication request with the Celonis Platform.

   The page refreshes and returns you to Microsoft Fabric.
6. Select the Studio space and related View to display.

The Studio View is now embedded into Microsoft Fabric, allowing end-users to interact with it.

For more information creating and using Studio Views and Apps, see: [Views](creating-views.html "Creating and configuring Views").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-microsoft-sql

# Connecting to Microsoft SQL Server (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Microsoft SQL Server extractor allows you to transfer data from your Microsoft SQL Server (MSSQL) database to the Celonis Platform for process mining and analysis. It supports the following basic features:

**Note**

To use Windows authentication for an on-premise integration, you must use a custom JDBC driver and custom JDBC string in the extractor configuration. For more information, see [Authentication method – Windows authentication for on-premise connections](connecting-to-microsoft-sql.html#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4481915513019234248385290343 "Authentication method – Windows authentication for on-premise connections").

Additionally, to use Microsoft Entra authentication for an on-premise integration, you must be using JDBC extractor version 2.100 or later. For more information, see [Authentication method – Microsoft Entra](connecting-to-microsoft-sql.html#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm234471417112233 "Authentication method – Microsoft Entra").

Expand all

[## Before you begin](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm2533519832967728_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-microsoft-sql.html#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication methods](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm2533519833842980_body)

This extractor supports the authentication methods described in the following sections.

**Note**

For cloud integrations, only [Authentication method – username and password](connecting-to-microsoft-sql.html#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4 "Authentication method – username and password") is available.

[#### Authentication method – username and password](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Microsoft SQL Server extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[#### Authentication method – Windows authentication for on-premise connections](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm4481915513019234248385290343_body)

To use Windows authentication, you need to perform additional configuration steps, including downloading an additional JDBC driver from Microsoft.

To configure your Windows authentication for the connection between Microsoft SQL and the Celonis Platform:

1. Configure your Microsoft SQL Server to accept TCP and IP connections before you continue. To learn how to do this, see the official Microsoft document: [Microsoft Learn - SQL Server.](https://learn.microsoft.com/en-us/sql/sql-server/?view=sql-server-ver16)
2. On the extractor server, down load the JDBC driver and specific the Windows authentication library in the PATH environment variable:

   1. Download the latest Microsoft JDBC Driver for SQL Server (i.e. `sqljdbc_<version>_enu.tar.gz`) from the Microsoft website: [Micrsoft Learn - Download JDBC driver](https://learn.microsoft.com/en-us/sql/connect/jdbc/download-microsoft-jdbc-driver-for-sql-server?view=sql-server-ver16).
   2. Unzip the file, and navigate to `sqljdbc_<version>\<language>\auth\x64`.
   3. Copy the `sqljdbc_auth.dll` into a directory that is defined in your PATH environment variable. Ensure it is the absolute PATH of where you added the folder, for example `C:\Windows\System\mssql-jdbc_auth-12.4.2.x64.dll`.
3. The extractor has to be run by the user that should be used to authenticate at the Microsoft SQL Server instance. If you would like to run the extractor as a Windows service, ensure that the service is using the desired account.

   To do so, navigate to the Services application on the extractor server, find the service, most likely **CelonisIBCDatabase** (ID: `celonis-ibc-database`), and change the user from the local system account to the account that you want to use for authentication at the Microsoft SQL Server.
4. As this connection requires the use of a custom JDBC driver, you need to configure this driver. For more information, see: [Using a custom JDBC driver](connecting-to-a-database-using-custom-jdbc-driver.html "Using a custom JDBC driver with the on-premise JDBC Extractor").
5. To start the extractor with the JDBC driver that you downloaded, the startup script needs to be adjusted in order to reference the correct driver.

   You need to specify the driver you downloaded in the following way when running the extractor via the command line:

   ```
   java -Dloader.path=<path_to_driver> -jar <connector_file_name>.jar
   ```

   And when running the extractor as a service you need to change the arguments line in the `CelonisJDBCExtractor.xml` file as follows:

   ```
   <arguments>-Djava.io.tmpdir="%BASE%\temp"-Dloader.path=<path_to_driver> -jar connector-jdbc.jar</arguments>
   ```

   The DLL file used must match the version name of the jar (e.g. 12.2.4\_mssql.jar =12.2.4\_mssql.dll). The version name of the jar can be changed manually if needed.
6. You need to specify an additional parameter when configuring the connection. Either append the following to the **JDBC Connection String** value or add it in the **Additional Properties**:

   ```
   IntegratedSecurity=true
   ```

**Important**

Even though Windows authentication is configured, the **Credential > Username** and **Password** fields are still required in the extractor configuration. You must provide values in these fields; however, when the connection is established, those values are ignored, and Windows authentication is used instead.

[#### Authentication method – Microsoft Entra](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm234471417112233_body)

If you're using [JDBC extractor version 2.100 or later](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors"), you can also use Microsoft Entra authentication. This is available out-of-the-box with the following authentication flows supported:

- ActiveDirectoryManagedIdentity
- ActiveDirectoryManagedIdentity
- ActiveDirectoryIntegrated
- ActiveDirectoryPassword
- ActiveDirectoryServicePrincipal
- SqlPassword

For more information about Microsoft Entra, see: [Learn Microsoft - Connect using Microsoft Entra authentication](https://learn.microsoft.com/en-us/sql/connect/jdbc/connecting-using-azure-active-directory-authentication?view=sql-server-ver16).

[## Configuring the Microsoft SQL Server extractor](#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_section-idm2533519843061760_body)

This section describes the basic setup of configuring the Microsoft SQL Server extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Microsoft SQL Server**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the database server name or IP address of the database server.
         - For **Port**, provide the port to connect to (Default is `1433`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-microsoft-sql.html#UUID-9e582e53-55d8-d3e9-7b6c-1e122f4219d9_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sqlserver://<hostname>:<port>;databaseName=<database_name>;property1=value1;property2=value2...
           ```

           **Note**

           For more information, see the [Microsoft SQL Server documentation](https://learn.microsoft.com/en-us/sql/connect/jdbc/building-the-connection-url?view=sql-server-ver16).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, enter the username and password for your database user.

      **Note**

      Ensure the credentials used have sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-mysql

# Connecting to MySQL (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis MySQL extractor allows you to transfer data from MySQL databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-id23518651177053_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-mysql.html#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The MySQL extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the MySQL extractor](#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_section-idm2533518651385410_body)

This section describes the basic setup of configuring the MySQL extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **MySQL**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your IBM Db2 server.
         - For **Port**, provide the port to connect to (Default is `3306`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-mysql.html#UUID-0987817a-4992-5213-f6ac-3a6448ea3729_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:mysql://<host>:<port>/<database>?property1=value1&property2=value2
           ```

           **Note**

           For more information on connecting to MySQL with JDBC strings, see the [MySQL documentation](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-jdbc-url-format.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-openedge

# Connecting to OpenEdge (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis OpenEdge extractor allows you to transfer data from Progress OpenEdge databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm2533518663678450_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-openedge.html#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The OpenEdge extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the OpenEdge extractor](#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_section-idm2533518663879340_body)

This section describes the basic setup of configuring the OpenEdge extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **OpenEdge**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `6718`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-openedge.html#UUID-c174d5bb-7c58-2c91-9f02-0b2abbd6a01a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:datadirect:openedge://<host>:<port>;databaseName=<database>;property1=value1;property2=value2
           ```

           **Note**

           For more information on connecting to OpenEdge with JDBC strings, see the [Progress OpenEdge](https://docs.progress.com/bundle/openedge-sql-development/page/Database-connection-examples.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-11g

# Connecting to Oracle 11g (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Oracle 11g extractor allows you to transfer data from Oracle 11g databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm2533518663678450_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-oracle-11g.html#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Oracle 11g extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Oracle 11g extractor](#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_section-idm2533518663879340_body)

This section describes the basic setup of configuring the Oracle 11g. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Oracle 11g**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1521`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-oracle-11g.html#UUID-8b83792a-400e-f334-ada4-1d61f1e37b64_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:datadirect:Oracle 11g://<host>:<port>;databaseName=<database>;property1=value1;property2=value2
           ```

           **Note**

           For more information on connecting to Oracle 11g with JDBC strings, see the [Progress Oracle 11g](https://docs.progress.com/bundle/Oracle 11g-sql-development/page/Database-connection-examples.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-bi-publisher

# Connecting to Oracle BI Publisher (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Oracle BI Publisher extractor lets you bring data from your Oracle BI Publisher instances into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Note**

Reports are extracted via the Oracle BI publisher SOAP API (Simple Object Access Protocol API). For more information, see: [SOAP methods used by the extractor](connecting-to-oracle-bi-publisher.html#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm235013813396112 "SOAP methods used by the extractor").

Expand all

[## Before you begin](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm4649477325360034230979299863_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Oracle BI Publisher authentication methods](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-id235202175918178_body)

The Oracle BI Publisher extractor uses basic authentication. To connect to your instance, you need to provide a username and password.

**Note**

Ensure the user credentials provided have adequate permissions to extract the desired data. For more information, see [Oracle BI Publisher user permissions](connecting-to-oracle-bi-publisher.html#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_N1760108948187 "Oracle BI Publisher user permissions").

[### Oracle BI Publisher user permissions](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_N1760108948187_body)

You need access to an Oracle BI Publisher user with the following permissions enabled:

- Create and edit Data Model
- Access to the tables that should be extracted
- Create and Download Report
- Access to SOAP service

[### Allowlisting Celonis Platform IPs and domains](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm2533520214611378_body)

If your Coupa instance is only reachable within a certain IP range, you need to allowlist the outbound IPs of the Celonis Platform, otherwise data cannot be extracted. The IPs of the Celonis Platform are different depending on the cluster (eu-1 or us-1).

For more information, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### SOAP methods used by the extractor](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm235013813396112_body)

The extraction of reports via the Oracle BI publisher is done via the SOAP API (Simple Object Access Protocol API). The following SOAP methods are used by this extractor:

- **getReportDefinitionReturn** - Used to retrieve report's name and for connectivity check.
- **getXDOSchemaReturn** - Used to retrieve report's metadata.
- **runReportReturn** - Used to extract report's data.

[### Report configuration and further information](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm4590784247257634230979385194_body)

When configuring your reports in Oracle BI Publisher, the following applies:

- **Format**: To extract a report it has to be saved in XML format. This can be done in Oracle via **Edit Report** > **View a list** > **Output Format: Data (XML)** > **Default Format: Data (XML)** > **Save**.
- **Maximum size**: `524288000 bytes`. To support this, you can create parameters for your reports and then filter the data based on that parameter. We recommend creating a date parameter, ensuring that only data from a defined date range is included (and not all data since the report started running).

For further information about using Oracle BI Publisher, see: [Oracle.com - Oracle BI Publisher Overview and Best Practices](https://www.oracle.com/middleware/technologies/analytics-publisher.html) and [Docs.Oracle.com](https://docs.oracle.com/middleware/bi12214/bip/docs.htm)

[## Configuring the Oracle BI Publisher extractor](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm451392359791523423097934261_body)

This section describes the basic setup of configuring the Oracle BI Publisher extractor. To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.
3. Select **Cloud - Oracle BI Publisher**.
4. Configure the following connection details:

   - **Host**: The URL of the Oracle BI publisher that you want to connect to. Use the following format here:

     ```
     https://ExampleInstanceID.oracle.com
     ```
   - **Username and password**: The username and password for the user configured in the prerequisites. Celonis uses key-based authentication by including the username and password in each request payload.

     **Note**

     Ensure the user credentials provided have adequate permissions to extract the desired data. For more information, see [Oracle BI Publisher user permissions](connecting-to-oracle-bi-publisher.html#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_N1760108948187 "Oracle BI Publisher user permissions").
   - **Report configurations**: Add each report you want to use in the Celonis Platform as an individual line item using the following format:

     ```
     /~oracleUsername/nameOfTheReport.xdo
     ```

     **Note**

     Reports must be in XML format to be extracted. For more information, see [Report configuration and further information](connecting-to-oracle-bi-publisher.html#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm4590784247257634230979385194 "Report configuration and further information").
5. Select **Test Connection**, and correct any issues highlighted.
6. Select **Save**.

   The connection between your Oracle BI Publisher tenant and the Celonis Platform is established. You can manage this connection at any time by clicking options:

   |  |
   | --- |
   |  |

[## Filter and delta extractions from Oracle BI Publisher](#UUID-c2547b25-9c11-969b-9157-846bc3de71cc_section-idm234523013675129_body)

Filters are only supported for SQL-query based reports which are configured in BI Publisher. When used in the Celonis Platform, filters always need to be passed as a string value.

To set up filters for your Oracle BI Publisher instance:

1. Defining a filter requires a parameter to be set-up in BI Publisher. The filter is referenced using the name of this parameter.

   Filters on Datetimes and Delta Filters can be achieved using two different set-ups:

   - **Defining the Datatype of the respective columns in the column configuration as a STRING:** The column can then be used to create a dynamic parameter. This set-up requires the BI Publisher column to have the exact same syntax as the column coming from BI Publisher (e.g. 2024-10-15T19:09:17.0000+00:00)
   - **Defining the Datatype of the respective columns in the column configuration as a DATETIME**: Creating a view in Celonis which calculates the maximum of this column and parses it to a String (see example screenshot below). The column of this view can then be used to create a dynamic parameter. This set-up gives you the possibility to “match” the BI Publisher parameter syntax via the syntax definition as part of the view.

     For example:

     ```
     CREATE VIEW parameter_view AS (
      select TO_CHAR(max(CREATION_DATE), 'MM-DD-YYYY') as parameter_column from myreport_G_1
     ```
2. Include the parameter in the SQL query that you define in the BI Publisher report.

   For example:

   |  |
   | --- |
   |  |
3. When configuring an extraction in the Celonis Platform, you can now define a value for the parameter by using the filter statement.

   You can only assign values to this parameter, meaning you need to use the = operator.

   You can configure delta filters in the same way by using dynamic extraction parameters. See: [Using delta filters with dynamic parameters](extraction-task-best-practice.html#UUID-6cd305cd-555d-6a8b-3f0a-8302c8181692_section-idm4613409312476834241323988992 "Using delta filters with dynamic parameters").

   |  |
   | --- |
   |  |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-ebs

# Connecting to Oracle EBS

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Oracle extractor allows you to transfer data from Oracles EBS tenants to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm2533519669059176_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-oracle-ebs.html#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Oracle EBS extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Oracle EBS extractor](#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_section-idm2533519669249068_body)

This section describes the basic setup of configuring the Oracle EBS extractor. To watch a video overview of this process:

To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Oracle**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1521`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - For **Service Name**, enter the specific database type (e.g. Oracle), enter the Service Name (Alias) associated with the database server.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-oracle-ebs.html#UUID-9595e830-6bf3-f965-3687-42ad4a622f13_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:oracle:thin:@//<host>:<port>/<service_name>?property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to Azure SQL with JDBC strings, see the [Oracle EBS documentation](https://docs.oracle.com/middleware/12211/bip/BIPAD/GUID-FB2AEC3B-2178-48DF-8B9F-76ED2D6B5194.htm).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-fusion-cloud-applications

# Connecting to Oracle Fusion Cloud Applications (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect your Oracle Fusion Cloud Applications to the Celonis Platform using either the Business Intelligence Cloud Connector (BICC) or REST API extractors, with BICC our recommended connection method.

## BICC extractor

The Oracle Fusion Cloud BICC extractor extracts data from Oracle Fusion Cloud by connecting to two different instances in your infrastructure: BICC and external storage. The Oracle Fusion Cloud BICC extractor takes Public View Objects (PVOs) from Oracle Fusion Cloud. The extractor is not limited to any process and can extract all the PVOs that are available in your Oracle instance (usually >5,000).

To learn how to configure the BICC extractor, see: [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)").

## REST API extractor

You can connect to your Oracle Fusion Cloud applications using the REST API extractor, allowing you to run GET requests for information. This method allows the Celonis Platform read only access to your Oracle Fusion Cloud data, meaning that no writing changes (such as updates or deletions) will be performed at any time during the extraction process.

To learn how to configure the REST API extractor, see: [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)").

## BICC vs. REST API extractors

The following table highlights the key differences between the BICC and REST API extractors for Oracle Fusion Cloud:

Filter

- undefined
- BICC extractor
- REST API extractor

|  | BICC extractor | REST API extractor |
| --- | --- | --- |
| Optimized for large data extraction | Yes | No |
| Performance and data throughput | Higher than REST APIs | Low |
| Data structure | Public View Objects (PVOs) | REST data structure |
| Data access | All PVOs available in your Oracle Fusion Cloud instance. | Limited to P2P, AP, and AR processes. For available endpoints, see: [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)"). |
| Celonis process connectors available | None | Available for P2P and AP processes. |
| Additional licenses required | No. BICC is part of the Oracle Fusion SaaS package by Oracle. Every customer who has an Oracle Fusion Cloud instance has access to BICC without the need for additional licenses.  You can access it by adding /biacm to the host URL of your Oracle Fusion instance. For example:  ``` https://my-fusion-instance.oraclecloud.com/biacm ``` | No |
| Additional storage costs | The usage of Oracle BICC is free and included in your Oracle Fusion Cloud license. For the external storage it depends on which option you choose:  - UCM is part of your Oracle Fusion Application and therefore it's free. - OCI Object Storage is part of the Oracle Cloud Infrastructure and comes with additional cost. However, storage cost are usually relatively low. For an overview, see: [Oracle Cloud Storage Pricing](https://www.oracle.com/cloud/storage/pricing/). | No |
| Link to Oracle documentation. | See: [Oracle Documentation - Overview of Business Intelligence Cloud Connector](https://docs.oracle.com/en/cloud/saas/applications-common/24a/biacc/overview-of-business-intelligence-cloud-connector.html#u00180685). | See: [Oracle Documentation - REST API](https://docs.oracle.com/en/cloud/saas/financials/23d/farfa/index.html). |

|  | BICC extractor | REST API extractor |
| --- | --- | --- |
| Optimized for large data extraction | Yes | No |
| Performance and data throughput | Higher than REST APIs | Low |
| Data structure | Public View Objects (PVOs) | REST data structure |
| Data access | All PVOs available in your Oracle Fusion Cloud instance. | Limited to P2P, AP, and AR processes. For available endpoints, see: [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)"). |
| Celonis process connectors available | None | Available for P2P and AP processes. |
| Additional licenses required | No. BICC is part of the Oracle Fusion SaaS package by Oracle. Every customer who has an Oracle Fusion Cloud instance has access to BICC without the need for additional licenses.  You can access it by adding /biacm to the host URL of your Oracle Fusion instance. For example:  ``` https://my-fusion-instance.oraclecloud.com/biacm ``` | No |
| Additional storage costs | The usage of Oracle BICC is free and included in your Oracle Fusion Cloud license. For the external storage it depends on which option you choose:  - UCM is part of your Oracle Fusion Application and therefore it's free. - OCI Object Storage is part of the Oracle Cloud Infrastructure and comes with additional cost. However, storage cost are usually relatively low. For an overview, see: [Oracle Cloud Storage Pricing](https://www.oracle.com/cloud/storage/pricing/). | No |
| Link to Oracle documentation. | See: [Oracle Documentation - Overview of Business Intelligence Cloud Connector](https://docs.oracle.com/en/cloud/saas/applications-common/24a/biacc/overview-of-business-intelligence-cloud-connector.html#u00180685). | See: [Oracle Documentation - REST API](https://docs.oracle.com/en/cloud/saas/financials/23d/farfa/index.html). |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-fusion-cloud-bicc

# Connecting to Oracle Fusion Cloud BICC (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect your Oracle Fusion Cloud instance to the Celonis Platform using the Business Intelligence Cloud Connector (BICC), allowing you to securely extract large volumes of data. This is the preferred method of connecting to Oracle Fusion Cloud, with REST API another supported method.

For an overview of why the BICC method is preferred, see: [Oracle Fusion Cloud](connecting-to-oracle-fusion-cloud-applications.html "Connecting to Oracle Fusion Cloud Applications (extractor)").

Expand all

[## BICC extractor overview](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4627667578966434227423211928_body)

The Oracle Fusion Cloud BICC extractor extracts data from Oracle Fusion Cloud by connecting to two different instances in your infrastructure:

- BICC
- External storage

The Oracle Fusion Cloud BICC extractor takes Public View Objects (PVOs) from Oracle Fusion Cloud. The extractor is not limited to any process and can extract all the PVOs that are available in your Oracle instance (usually > 5,000).

The extraction process is highlighted in the following diagram (with a description underneath):

|  |
| --- |
|  |

1. An extraction is configured in the Celonis Platform, with the tables defined, the columns selected, and the filters applied.
2. When an extraction is executed, the Celonis Platform triggers an extract job in the BICC instance linked to the Oracle Fusion Cloud Application.
3. The BICC then automatically writes the extracted data to the external storage. When creating the job execution in BICC, the FILE\_EXPIRY\_DAYS is set by default to 90. Therefore, files will automatically be deleted after 90 days.
4. The Celonis extractor reads the data from the external storage and ingests it into the Celonis Platform. Data that is successfully ingested into Celonis is automatically tagged. All records and files which have not been processed correctly within an extraction are automatically picked up in the next run.

[## Before you begin](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-id235207298745736_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Supported Oracle Fusion Cloud BICC extractor functionality](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4565133285811234227423255326_body)

The Oracle Fusion Cloud BICC extractor supports the following functionalities:

| Supported functionality | Description |
| --- | --- |
| Column selection | Select **Customize Column Selection** to choose individual table columns to extract, rather than extracting the whole table by default. |
| Column pseudonymization | The pseudonymization algorithm (SHA-1, SHA-256, SHA-512) can be selected in the advanced settings of the data connection configuration. See: [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)"). |
| Non-populated columns | Choose **Include Optional Columns** to include columns marked in the metadata as "isPopulate": false (non-populated columns). By default these aren’t extracted. This can add a lot of extra columns, so we recommend you also select **Customize Column Selection**, then go through the updated list of columns and uncheck any that you don't want for your business case. |
| Primary key definition | Primary keys are set to default values based on the metadata retrieved from BICC. It’s possible to adjust the defined primary keys in the column selection. |
| Filtering | Supports filtering on all columns using the operators =, <, >, =>, =<. |
| Delta loads | When executing a delta load on a table using this extractor, incremental loads are used. These incremental loads automatically identify the data that has changed since your last extraction. By default, BICC applies a prune time which defines an offset for how long before the last extraction to extract data from. This value is set to 1,440 minutes (24 hours). You can adjust it as part of the Extract Preferences in BICC.  The default setting is suitable if you are scheduling daily delta loads. If you plan to extract more frequently (for example, hourly), we recommend you adjust this value accordingly.  For further information on this configuration, see: [Oracle Documentation - Configure Extract Preferences](https://docs.oracle.com/en/cloud/saas/applications-common/24a/biacc/configure-extract-preferenceslanguageprune-time-in-minutesjob.html#u00180695). |
| Parallelization of requests | The extractor parallelizes the number of requests made to BICC for increased performance. The maximum number of requests can be configured in the advanced settings of the connection configuration (default: 10). For this extractor, the setting is identical to the number of tables that are being extracted in parallel. |

[### Setting up the Oracle Fusion Cloud BICC extractor](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4654159500694434227423313066_body)

To set up the Oracle Fusion Cloud BICC extractor, follow these steps in order:

**Note**

After completing [Step 3: Connect BICC to external storage](connecting-to-oracle-fusion-cloud-bicc.html#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4654159414784034227465635095 "Step 3: Connect BICC to external storage"), proceed to [Configuring the Oracle Fusion Cloud BICC extractor](connecting-to-oracle-fusion-cloud-bicc.html#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4627667506856034227465710632 "Configuring the Oracle Fusion Cloud BICC extractor").

[#### Step 1: Configure BICC user permissions](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4627667340718434227465454688_body)

A user needs to be created in your Oracle Fusion Cloud Application that can access BICC and has the following two roles:

- ESS Administrator Role
- ORA\_ASM\_APPLICATION\_IMPLEMENTATION\_ADMIN\_ABSTRACT

You need to be able to provide username and password in the extractor configuration to establish a data connection.

For more information, see Oracle's document: [Provision a user with access to BICC](https://docs.oracle.com/en/cloud/saas/applications-common/23c/biacc/provision-a-user-with-access-to-bicc.html#u00180687).

[#### Step 2: Configure external storage permissions](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4618266691726434227465519834_body)

You have two external storage options here, either using UCM or OCI object storage:

##### Using UCM external storage

The already created BICC user needs to have access to the files that are being written on the UCM server. Therefore, the following role is required:

- OBIA\_EXTRACTTRANSFORMLOAD\_RWD

Also, verify if Data Encryption is enabled on your UCM connection. If yes, you will need to configure PGP encryption in the data connection in the Celonis Platform with the matching encryption key. For more information, see: [Step 4](connecting-to-oracle-fusion-cloud-bicc.html#UUID-c13a346b-2305-8249-7cce-87a626a9813b_N1740755393488 "Step 4").

##### Using OCI object storage

When using OCI Object Storage as an external storage, you need to to specify the OCI bucket from which the files will be picked up and also configure a user with which you can authenticate.

In your OCI instance, you either need to create a new storage bucket to which BICC should push the data files, or choose an existing bucket to which BICC is already connected.

For the **storage bucket**, the following details are required for the connection set-up:

- Tenant OCID. For more information, see Oracle's documentation: [Required keys and OCID](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm#Other).
- Region (e.g. EU\_FRANKFURT\_1)
- Namespace
- Bucket Name

To **authenticate with the bucket**, we require the following:

- User OCID. For more information, see Oracle's documentation: [Required keys and OCID](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm#Other).
- Fingerprint
- Private key (in PEM format)
- Storage name (provided in step 3)

The **user needs to have the right permissions** to be able to read from the bucket and rename the files. This requires the following permissions on the specific OCI bucket:

- BUCKET\_READ
- OBJECT\_CREATE
- OBJECT\_OVERWRITE

Ensure that there are no retention rules set for the specific object storage bucket as the extractor relies on the renaming of specific files. For more information, see: [Oracle Docs - Object Storage Data Retention Rules](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingretentionrules.htm).

You can retrieve the Fingerprint and PrivateKey by creating a new API key for the user (selecting the Generate API key pair option). The Private Key needs to be downloaded and is required in the data connection set-up. The fingerprint can be retrieved from the UI after generating the API key.

**Important**

The private key provided must be in PEM format or you will see errors when attempting to connect.

[#### Step 3: Connect BICC to external storage](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4654159414784034227465635095_body)

Based on your choice of external storage, you need to connect it to your BICC:

##### Using UCM external storage

If you're using UCM external storage, the connection is pre-configured and you need to just verify that it is working. To verify your connection:

1. Open your BICC instance, which can be accessed by appending /biacm to the URL of your Oracle Fusion instance. For example:

   ```
   https://your-oracle-fusion-instance.oraclecloud.com/biacm
   ```
2. Navigate to **Configure External Storage**.
3. Open the **UCM Connection tab**.
4. Select **Test UCM Connection**.

   If successful, a confirmation message is displayed.

For more information, see Oracle's documentation: [Configure where to load data](https://docs.oracle.com/en/cloud/saas/applications-common/23c/biacc/configure-where-to-load-datastorage-type-cloud-storage.html#u00180692).

##### Using OCI object storage

If you're using OCI object storage, you need to create the connection:

1. Open your BICC instance, which can be accessed by appending /biacm to the URL of your Oracle Fusion instance. For example:

   ```
   https://your-oracle-fusion-instance.oraclecloud.com/biacm
   ```
2. Navigate to **Configure External Storage**.
3. Open the **OCI Object Storage Connection** tab.
4. Select **Test Connection**.

   If successful, a confirmation message is displayed.
5. Copy the name of the connection in BICC as this is required as an input parameter when creating a data connection in the Celonis Platform.

For more information, see Oracle's documentation: [Configure where to load data](https://docs.oracle.com/en/cloud/saas/applications-common/23c/biacc/configure-where-to-load-datastorage-type-cloud-storage.html#u00180692).

[## Configuring the Oracle Fusion Cloud BICC extractor](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm4627667506856034227465710632_body)

This section describes the basic setup of configuring the Oracle Fusion Cloud BICC extractor. To view an overview of the process:

To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Select **Cloud - Oracle Fusion**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **Host**: The REST server to contact for your identity domain or Cloud account. This information can be found by accessing your **My Services** dashboard for your identity domain or Cloud account. Locate the REST Endpoint field, which shows the URL to the REST server, for example: https://sales.oraclecloud.com/.
   - **Username / Password**: The username and password for the user who holds the permissions outlined in the prerequisites.
   - **Instance version**: Select the instance version that your Oracle Fusion Cloud instance is currently running. This can be found by selecting your profile and then **About Application**.
   - **Select BICC**
   - **Storage**: Select either UCM or OCI object storage.

     - **UCM**: If the UCM storage type is selected, a new option is available in the data connection settings to enable PGP Encryption. When enabled, you must provide an encryption key and an encryption passphrase. You should activate this setting if data encryption is enabled in your BICC external storage connection to UCM.

       The encryption key and passphrase specified in the data connection must match the configuration in BICC. Once enabled, all files written to UCM during an extraction will be encrypted by BICC. When the Celonis Extractor downloads these files, it will automatically decrypt them.
     - **OCI object storage**: The following input parameters are required:

       - Tenant OCID
       - Region
       - Namespace
       - Bucket Name
       - User OCID
       - Fingerprint
       - Private key
       - Storage name
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

**Parallel extractions from the same Oracle Fusion Cloud instance**

Extractions running through BICC are using the task ID (of an extraction task in Celonis) as a unique identifier. This identifier helps to distinguish different BICC extractions and their logic for incremental loads. As a result, there is no data loss when extracting the same table in two different data pools or even two different data jobs.

[## Oracle Fusion Cloud BICC frequently asked questions](#UUID-c13a346b-2305-8249-7cce-87a626a9813b_section-idm234654412235181_body)

### Error message: "Bad Request","message":"JBO-26048: Constraint \"C\_JOB\_DATA\_STORE\_REL\_C\_DA\_FK1\" is violated during post operation.

If you receive this error message, we recommend checking whether there are any columns shown in the table’s column configuration. If there are none, it means that all columns have the flag 'isPopulate' set to false and no BICC job can be created. Without available columns, this table cannot be extracted.

To overcome this, you can “Include optional columns” in the Column configuration. Comment end

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-fusion-cloud-rest

# Connecting to Oracle Fusion Cloud REST (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect to your Oracle Fusion Cloud applications using the REST API extractor, allowing you to run GET requests for information. This method allows the Celonis Platform read only access to your Oracle Fusion Cloud data, meaning that no writing changes (such as updates or deletions) will be performed at any time during the extraction process.

You can also connect via the Business Intelligence Cloud Connector, which we recommend. For more information about the difference between the two extractors, see: [Oracle Fusion Cloud](connecting-to-oracle-fusion-cloud-applications.html "Connecting to Oracle Fusion Cloud Applications (extractor)").

Expand all

[## Before you begin](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm4627667505004834227258818592_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Oracle Fusion Cloud required user permissions](#id491931_body)

To extract data from your Oracle Fusion Cloud instance, you need access to a user with the following permissions and sub-roles:

- Administer Purchase Order by REST Service
- View Payables Payment
- View Payables Invoice by Web Service
- View Payables Invoice Holds
- View Holds Resolution and Negotiation History
- **Subroles**: Procurement REST Service, Payables Invoice Inquiry.
- In addition: The data security policies need to allow the data to be extracted. These can be copied from the seeded Procurement Integration Specialist role and added one for database resource Business Unit and action Manage Payables Invoice.

[### Allowlisting Celonis Platform IPs and domains](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm2533520728083314_body)

If your Oracle Fusion Cloud applications are only reachable within a certain IP range, you need to allowlist the outbound IPs of the Celonis Platform, otherwise data cannot be extracted. The IPs of the Celonis Platform are different depending on the cluster (eu-1 or us-1). For more information, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains").

[### Supported API endpoints](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm4538843988256034227258947395_body)

The Oracle Fusion Cloud REST extractor supports the following procurement and finance endpoints:

[#### Procurement](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm4627667533331234227260067816_body)

Filter

- Method
- Endpoint
- Table

| Method | Endpoint | Table |
| --- | --- | --- |
| GET | Get All PurchaseOrderLines | PURCHASEORDER\_LINES |
| GET | Get All PurchaseOrderLinesScheduleDistributions | PURCHASEORDER\_LINE\_SCHEDULE\_DISTRIBUTIONS |
| GET | Get All PurchaseOrderLinesSchedules | PURCHASEORDER\_LINE\_SCHEDULES |
| GET | Get All PurchaseOrders | PURCHASEORDERS |
| GET | Get All PurchaseRequisitionLines | PURCHASEREQUISITION\_LINES |
| GET | Get All PurchaseRequisitions | PURCHASEREQUISITIONS |
| GET | Get All PurchasingNewsItems | PURCHASINGNEWS |
| GET | Get All RecentRequisitions | RECENTREQUISITIONS |
| GET | Get All RequisitionproductDetailsPriceBreaks | REQUISITIONPRODUCTDETAILS\_PRICESBREAKS |
| GET | Get All RequsitionProductDetails | REQUISITIONPRODUCTDETAILS |
| GET | Get All ShoppingSearchItems | SHOPPINGSEARCHES |
| GET | Get All ShoppingSearchItemsBrandFilters | SHOPPINGSEARCHES\_BRANDFILTERS |
| GET | Get All ShoppingSearchItemsPunchoutCatalogs | SHOPPINGSEARCHES\_RESULTPUNCHOUTCATALOGS |
| GET | Get All ShoppingSearchItemsResultItems | SHOPPINGSEARCHES\_RESULTITEMS |
| GET | Get All Suppliers | SUPPLIERS |
| GET | Get All SuppliersAddresses | SUPPLIER\_ADDRESSES |
| GET | Get All SuppliersAttachments | SUPPLIER\_ATTACHMENTS |
| GET | Get All SuppliersBusinessClassifications | SUPPLIER\_BUSINESSCLASSIFICATIONS |
| GET | Get All SuppliersContacts | SUPPLIERS\_CONTACTS |
| GET | Get All SupplierSites | SUPPLIER\_SITES |
| GET | Get All SuppliersProductsAndServices | SUPPLIER\_PRODUCTSANDSERVICES |

| Method | Endpoint | Table |
| --- | --- | --- |
| GET | Get All PurchaseOrderLines | PURCHASEORDER\_LINES |
| GET | Get All PurchaseOrderLinesScheduleDistributions | PURCHASEORDER\_LINE\_SCHEDULE\_DISTRIBUTIONS |
| GET | Get All PurchaseOrderLinesSchedules | PURCHASEORDER\_LINE\_SCHEDULES |
| GET | Get All PurchaseOrders | PURCHASEORDERS |
| GET | Get All PurchaseRequisitionLines | PURCHASEREQUISITION\_LINES |
| GET | Get All PurchaseRequisitions | PURCHASEREQUISITIONS |
| GET | Get All PurchasingNewsItems | PURCHASINGNEWS |
| GET | Get All RecentRequisitions | RECENTREQUISITIONS |
| GET | Get All RequisitionproductDetailsPriceBreaks | REQUISITIONPRODUCTDETAILS\_PRICESBREAKS |
| GET | Get All RequsitionProductDetails | REQUISITIONPRODUCTDETAILS |
| GET | Get All ShoppingSearchItems | SHOPPINGSEARCHES |
| GET | Get All ShoppingSearchItemsBrandFilters | SHOPPINGSEARCHES\_BRANDFILTERS |
| GET | Get All ShoppingSearchItemsPunchoutCatalogs | SHOPPINGSEARCHES\_RESULTPUNCHOUTCATALOGS |
| GET | Get All ShoppingSearchItemsResultItems | SHOPPINGSEARCHES\_RESULTITEMS |
| GET | Get All Suppliers | SUPPLIERS |
| GET | Get All SuppliersAddresses | SUPPLIER\_ADDRESSES |
| GET | Get All SuppliersAttachments | SUPPLIER\_ATTACHMENTS |
| GET | Get All SuppliersBusinessClassifications | SUPPLIER\_BUSINESSCLASSIFICATIONS |
| GET | Get All SuppliersContacts | SUPPLIERS\_CONTACTS |
| GET | Get All SupplierSites | SUPPLIER\_SITES |
| GET | Get All SuppliersProductsAndServices | SUPPLIER\_PRODUCTSANDSERVICES |

[#### Finance](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm4627667530256034227260551213_body)

Filter

- Method
- Endpoint
- Table

| Method | Endpoint | Table |
| --- | --- | --- |
| GET | Get All StandardReceipts | STANDARDRECEIPTS |
| GET | Get All StandardReceiptAttachments | STANDARDRECEIPTS\_ATTACHMENTS |
| GET | Get All StandardReceiptsRemmittedReferences | STANDARDRECEIPTS\_REMIITANCEREFERENCES |
| GET | Get All ReceiptMethodAssignments | RECEIPTMETHODASSIGNMENTS |
| GET | Get All Invoices | INVOICES |
| GET | Get All Invoice Attachments | INVOICE\_ATTACHMENTS |
| GET | Get All Invoice Installments | INVOICE\_INSTALLMENTS |
| GET | Get All Invoice Lines | INVOICE\_INVOICELINES |
| GET | Get All InvoiceHolds | INVOICEHOLDS |
| GET | Get All ReceivablesInvoices | RECEIVABLESINVOICES |
| GET | Get All ReceivablesInvoiceLines | RECEIVABLESINVOICE\_RECEIVABLESINVOICELINES |
| GET | Get All ReceivablesInvoiceDistributions | RECEIVABLESINVOICE\_RECEIVABLESINVOICEDISTRIBUTIONS |
| GET | Get All ReceivablesCreditMemos | RECEIVABLESCREDITMEMOS |
| GET | Get All ReceivablesAdjustments | RECEIVABLESADJUSTMENTS |
| GET | Get All ReceivablesCustomerAccountActivities | RECEIVABLESCUSTOMERACCOUNTACTIVITIES |
| GET | Get All ReceivablesCustomerAccountSiteActivities | RECEIVABLESCUSTOMERACCOUNTSITEACTIVITIES |
| GET | Get All ReceivablesCustomerAccountSiteActivityStandardReceiptApplications | RECEIVABLESCUSTOMERACCOUNTSITEACTIVITIE\_STANDARDRECEIPTAPPLICATIONS |
| GET | Get All ReceivabblesDisputes | RECEIVABLESDISPUTES |
| GET | Get All CollectionPromises | COLLECTIONPROMISES |
| GET | Get All TransactionSources | TRANSACTIONSOURCESLOV |
| GET | Get All TransactionTypes | TRANSACTIONTYPESLOV |
| GET | Get All SalesPersonReferenceAccounts | SALESPERSONREFERENCEACCOUNTS |
| GET | Get All AccountCombinations | ACCOUNTCOMBINATIONSLOV |
| GET | Get All Payments | PAYABLEPAYMENTS |
| GET | Get All Payments Related Invoices | PAYABLEPAYMENTS\_RELATEDINVOICES |
| GET | Get All PaymentTermsLOV | PAYMENTTERMSLOV |
| GET | Get All JournalBatches | JOURNALBATCHES |
| GET | Get All JournalHeaders | JOURNALBATCHESHEADERS |
| GET | Get All JournalLines | JOURNALBATCHES\_JOURNALHEADER\_JOURNALLINES |
| GET | Get All JournalErrors | JOURNALBATCHES\_JOURNALERRORS |
| GET | Get All JournalCategories | JOURNALCATEGORIESLOV |
| GET | Get All AccountingPeriods | ACCOUNTINGPERIODSLOV |
| GET | Get All Ledgers | LEDGERSLOV |
| GET | Get All Descriptive flexfield segments for expenses and expense reports | EXPENSEDFFSEGMENTS |
| GET | Get All JournalSources | JOURNALSOURCESLOV |
| GET | Get All ExpenseDFFSegments | EXPENSEDFFSEGMENTS |
| GET | Get All CurrencyRates | CURRENCYRATES |
| GET | Get All Legal Entities | LEGALENTITIESLOV |

| Method | Endpoint | Table |
| --- | --- | --- |
| GET | Get All StandardReceipts | STANDARDRECEIPTS |
| GET | Get All StandardReceiptAttachments | STANDARDRECEIPTS\_ATTACHMENTS |
| GET | Get All StandardReceiptsRemmittedReferences | STANDARDRECEIPTS\_REMIITANCEREFERENCES |
| GET | Get All ReceiptMethodAssignments | RECEIPTMETHODASSIGNMENTS |
| GET | Get All Invoices | INVOICES |
| GET | Get All Invoice Attachments | INVOICE\_ATTACHMENTS |
| GET | Get All Invoice Installments | INVOICE\_INSTALLMENTS |
| GET | Get All Invoice Lines | INVOICE\_INVOICELINES |
| GET | Get All InvoiceHolds | INVOICEHOLDS |
| GET | Get All ReceivablesInvoices | RECEIVABLESINVOICES |
| GET | Get All ReceivablesInvoiceLines | RECEIVABLESINVOICE\_RECEIVABLESINVOICELINES |
| GET | Get All ReceivablesInvoiceDistributions | RECEIVABLESINVOICE\_RECEIVABLESINVOICEDISTRIBUTIONS |
| GET | Get All ReceivablesCreditMemos | RECEIVABLESCREDITMEMOS |
| GET | Get All ReceivablesAdjustments | RECEIVABLESADJUSTMENTS |
| GET | Get All ReceivablesCustomerAccountActivities | RECEIVABLESCUSTOMERACCOUNTACTIVITIES |
| GET | Get All ReceivablesCustomerAccountSiteActivities | RECEIVABLESCUSTOMERACCOUNTSITEACTIVITIES |
| GET | Get All ReceivablesCustomerAccountSiteActivityStandardReceiptApplications | RECEIVABLESCUSTOMERACCOUNTSITEACTIVITIE\_STANDARDRECEIPTAPPLICATIONS |
| GET | Get All ReceivabblesDisputes | RECEIVABLESDISPUTES |
| GET | Get All CollectionPromises | COLLECTIONPROMISES |
| GET | Get All TransactionSources | TRANSACTIONSOURCESLOV |
| GET | Get All TransactionTypes | TRANSACTIONTYPESLOV |
| GET | Get All SalesPersonReferenceAccounts | SALESPERSONREFERENCEACCOUNTS |
| GET | Get All AccountCombinations | ACCOUNTCOMBINATIONSLOV |
| GET | Get All Payments | PAYABLEPAYMENTS |
| GET | Get All Payments Related Invoices | PAYABLEPAYMENTS\_RELATEDINVOICES |
| GET | Get All PaymentTermsLOV | PAYMENTTERMSLOV |
| GET | Get All JournalBatches | JOURNALBATCHES |
| GET | Get All JournalHeaders | JOURNALBATCHESHEADERS |
| GET | Get All JournalLines | JOURNALBATCHES\_JOURNALHEADER\_JOURNALLINES |
| GET | Get All JournalErrors | JOURNALBATCHES\_JOURNALERRORS |
| GET | Get All JournalCategories | JOURNALCATEGORIESLOV |
| GET | Get All AccountingPeriods | ACCOUNTINGPERIODSLOV |
| GET | Get All Ledgers | LEDGERSLOV |
| GET | Get All Descriptive flexfield segments for expenses and expense reports | EXPENSEDFFSEGMENTS |
| GET | Get All JournalSources | JOURNALSOURCESLOV |
| GET | Get All ExpenseDFFSegments | EXPENSEDFFSEGMENTS |
| GET | Get All CurrencyRates | CURRENCYRATES |
| GET | Get All Legal Entities | LEGALENTITIESLOV |

[## Configuring the Oracle Fusion Cloud REST extractor](#UUID-4e52ab92-eae0-e0c8-27f2-00be7d4bf1f3_section-idm453884399414723422725890637_body)

With access to the necessary Oracle Fusion Cloud user permissions, you can create a connection between your Oracle Fusion Cloud instance and the Celonis Platform:

1. From your data pool diagram, Select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection**, and then select **Connect to Data Source**.
3. Select **Cloud - Oracle Fusion**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **Host**: The REST server to contact for your identity domain or Cloud account. This information can be found by accessing your **My Services** dashboard for your identity domain or Cloud account. Locate the REST Endpoint field, which shows the URL to the REST server, for example: https://sales.oraclecloud.com/.
   - **Username / Password**: The username and password for the user who holds the permissions outlined in the prerequisites.
   - **Instance version**: Select the instance version that your Oracle Fusion Cloud instance is currently running. This can be found by selecting your profile and then **About Application**.
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

   The connection between your Oracle Fusion Cloud instance and the Celonis Platform is established. You can manage this connection at any time by selecting options:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-oracle-netsuite

# Connecting to Oracle NetSuite (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis NetSuite extractor allows you to transfer data from your Oracle NetSuite’s cloud-based ERP platform to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm2533519673982516_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-oracle-netsuite.html#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Required Oracle NetSuite values](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm234868947556628_body)

Before creating a data connection between Oracle NetSuite and the Celonis Platform, you need the following information from your Oracle NetSuite instance:

- Host name
- Account ID
- Role ID

For more information on finding these values, see: [Oracle Help Center - Finding Your Settings Portlet](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/bridgehead_1493644302.html#To-find-your-Settings-portlet%3A).

[### Authentication methods](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-id235196769105822_body)

This extractor supports the authentication methods described in the following sections.

[#### Authentication method – username and password](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Oracle NetSuite extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[#### Authentication method – OAuth](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-df461d08-a666-faa1-0f10-2530abb13e3e_body)

This extractor can connect to the source system using OAuth authentication. Provide the required OAuth credentials, **Client ID** and **Client Secret**, to establish the connection. Ensure the connected application or integration user has sufficient permissions to access the data to be extracted.

[## Configuring the Oracle NetSuite extractor](#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-idm2533519674556916_body)

This section describes the basic setup of configuring the Amazon Redshift extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **NetSuite**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the account-specific NetSuite Connect domain, in the format:

           ```
           <account_id>.connect.api.netsuite.com
           ```
         - For **Port**, provide the port to connect to (Default is `1708`).
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
         - For **Account ID**, enter your NetSuite account ID (for example, `1234567_SB1`). This value identifies your specific NetSuite account and is required for authentication.
         - For **Role ID**, enter the internal ID of the NetSuite role that the connection should use for authentication. The role determines which data and permissions are available to the extractor during data extraction.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-oracle-netsuite.html#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:ns://<account_id>.connect.api.netsuite.com:<port>;ServerDataSource=<data_source>;Encrypted=1;NegotiateSSLClose=false;CustomProperties=(AccountID=<account_id>;RoleID=<role_id>);property1=value1;property2=value2...
           ```

           **Note**

           For more information, see the [Oracle NetSuite documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4425615742.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, select the type of authentication to use for this connection. For more information, see [Authentication methods](connecting-to-oracle-netsuite.html#UUID-5f3823b8-bde1-a351-af62-b9c90d0a7efd_section-id235196769105822 "Authentication methods").

      **Note**

      Ensure the credentials used have sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-postgresql

# Connecting to PostgreSQL (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis PostgreSQL extractor allows you to transfer data from PostgreSQL databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Note**

There are two Celonis PostgreSQL extractors:

- PostgreSQL
- PostgreSQL encrypted

Except where noted, this documentation refers to both extractors collectively as the PostgreSQL extractor. For connection setup, they share the same features, authentication method, and connection parameters.

Expand all

[## Before you begin](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm2533518665245754_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-postgresql.html#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The PostgreSQL extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the PostgreSQL extractor](#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_section-idm2533518665900438_body)

This section describes the basic setup of configuring the PostgreSQL extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select either **PostgreSQL** or **PostgreSQL encrypted**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `443`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-postgresql.html#UUID-1bba323e-225e-5d51-62db-4cf8bd24a48a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:postgresql://<host>:<port>/<database>[?property1=value1&property2=value2...]
           ```

           **Note**

           For more information on connecting to PostgreSQL with JDBC strings, see the [PostgreSQL documentation](https://jdbc.postgresql.org/documentation/use/#connecting-to-the-database).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-rossum

# Connecting to Rossum (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Rossum extractor integrates the Celonis Platform with your Rossum instances to retrieve document and invoice data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-id235174468217835_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Rossum authentication methods](#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-id235174469089591_body)

The Rossum extractor uses basic authentication. You must provide a username and password to connect to your Rossum instance when configuring the data connection.

**Note**

The user account must have sufficient permissions to access the data you want to extract, including the following API endpoints:

- **Authentication endpoint:**

  ```
  POST /api/v1/auth/login
  ```
- **Data extraction endpoint:**

  ```
  POST /api/v1/queues/{queue_id}/export
  ```

[### Rossum configuration inputs](#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-id235174470450227_body)

When configuring the connection between your Rossum instance and the Celonis Platform, you must provide the following inputs:

- **Region**: Specify the region where your Rossum instance is hosed. The definition of your region specifies the Base URL the extractor uses for all API requests. The following regions are available for selection:

  - **EU**: `https://celonis.api.rossum.ai/v1/`
  - **US**: `https://us.app.rossum.ai/api/v1/`
  - **Custom**: If your Rossum instance using a custom URL (such as `https://elis.rossum.ai/api/v1/` or `https://<workspace>.app.rossum.ai/api/v1` ), select this option provide your URL in the **Host URL** field.
- **Queue**: The queue from which you want to extract data, such as `81867`.
- **Status**: The document statuses you would like to extract. This can be a single value or a comma-separated list of values, such as `confirmed, exported`.

[### Rossum data extraction endpoints](#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-id235218476903541_body)

After successful authentication, the Rossum extractor uses the following REST API endpoint to extract data from your Rossum instance:

Table 2. Rossum data extraction endpoint

| **Endpoint** | **Description** |
| --- | --- |
| `POST /api/v1/queues/{queue_id}/export` | Exports document data from the specified queue for extraction. |

[## Configuring the Rossum extractor](#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-idm2533517453237864_body)

This section describes the basic setup of configuring the Rossum extractor. To configure the extractor:

**Note**

For configuration, the Rossum extractor has specific instructions for some fields. For more information see [Rossum configuration inputs](connecting-to-rossum.html#UUID-f46af3a5-b4dd-0b25-7427-af671e481e42_section-id235174470450227 "Rossum configuration inputs").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-salesforce

# Connecting to Salesforce (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Saleforce extractor lets you bring data from your Saleforce instances into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-idm455858969095203421537767148_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Salesforce authentication methods](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-id235202090795647_body)

For authentication, you can use one of the following methods:

- **OAuth with Username/Password**: Single sign-on via OAuth authentication, which uses the Salesforce Platform REST API (latest version).

  **Note**

  The following API endpoint is used for OAuth authentication:

  ```
  POST /services/oauth2/token
  ```
- **Stored credentials**: Authentication using stored credentials, which uses the Salesforce Platform SOAP API (version 63.0).

**Note**

Ensure the credentials used in the configuration have adequate permissions to access the data you wish to extract. For required extraction API endpoints, see [Salesforce data extraction endpoints](connecting-to-salesforce.html#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-id235218593470862 "Salesforce data extraction endpoints").

[### Salesforce user permissions](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-idm459078409407843423071317409_body)

To extract data from your Salesforce instance, you must configure user credentials with the ability to read and extract the relevant process data. We recommend creating a profile in Salesforce with the following permissions enabled and then assigning this profile to a user account:

- **Administrative permissions**:

  - API Enabled
  - API Only User (optional)
- **Approve uninstalled connect app permissions**
- **Standard object permissions**:

  - Select **Read** permissions for all objects you want to extract.
  - Select **View all** permissions for all objects you want to extract.
- **Custom object permissions**:

  - Select **Read** permissions for all objects you want to extract.

For more information about users, profiles, and roles in Salesforce, see: [Salesforce Help Center - Manage Users](https://help.salesforce.com/s/articleView?id=sf.users_mgmt_overview.htm&type=5).

[### Salesforce data extraction endpoints](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-id235218593470862_body)

After successful authentication, the Salesforce extractor uses the following REST API endpoints to access and extract data:

Table 3. Salesforce data extraction endpoints

| **Endpoint** | **Description** |
| --- | --- |
| `GET /services/data` | Retrieves the list of available API versions. |
| `GET /services/data/{api_version}/sobjects` | Retrieves the list of all Salesforce objects. |
| `GET /services/data/{api_version}/sobjects/{object_name}/describe` | Retrieves metadata for a specific object. |
| `GET /services/data/{api_version}/queryAll` | Retrieves all records, including deleted or archived ones, to calculate the number of records to be extracted. |
| `GET /services/data/{api_version}/query` | Retrieves the actual data for extraction. |

[## Configuring the Saleforce extractor](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-idm4601520487209634229356913935_body)

This section describes the basic setup of configuring the Saleforce extractor. To view an overview of this process:

To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.
3. Select **Cloud - Salesforce**.
4. Configure the following connection details:

   |  |
   | --- |
   |  |

   - **Name**: An internal reference for this data connection.
   - **Salesforce Instance Type**: Select between **Production** and **Sandbox**. This choice determines both the landscape you will login to and the data you have access to.
   - **Authentication method**: Selected between **OAuth with Username/Password** or **Stored Credentials**:

     **Note**

     The credentials used must have adquate permissions to access the data requested. For more informaiton, see [Salesforce user permissions](connecting-to-salesforce.html#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-idm459078409407843423071317409 "Salesforce user permissions").

     - **OAuth with Username/Password**: The extractor uses the Salesforce Platform REST API. This includes using the *jwt-bearer* grant type to retrieve an access token.
     - **Stored Credentials**: The extractor uses the Salesforce Platform SOAP API (version 63.0). To configure this method, you need a username and password and the input for the password field is a password appended with a security token.
   - **Proxy service**: Either select no proxy service or choose to use middleware. Using middleware provides an extra layer of security between the Salesforce instance and the Celonis Platform.

     If using middleware, you're asked to provide three additional settings:

     - **Authorize URL**: The URL that should be called to authorize via OAuth with the middleware.
     - **Token URL**: The URL that should be called to request tokens from Salesforce via the middleware.
     - **Data URL**: The base URL that should be used used to call the APIs for fetching the data (the specific API requests will be appended),
5. Select **Save**.
6. The Salesforce authentication window should open. Select **Allow**.

   |  |
   | --- |
   |  |

The connection between your Salesforce tenant and the Celonis Platform is established. You can manage this connection at any time by selecting **Options**:

|  |
| --- |
|  |

[## Salesforce extractor limitations and known issues](#UUID-393d25b3-04e2-a3ab-9cbe-ceaaabd6c90b_section-idm2533523623319752_body)

This section explains the limitations and known issues for the Salesforce extractor:

- The Salesforce Bulk API is not supported for data extraction.
- Salesforce API limitations restrict change history tracking to a default of 20 attributes per object.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sap-and-s-4hana

# Continuous Extractor for SAP ECC and S/4 HANA

You can link your SAP ECC and SAP S/4HANA instances to the Celonis Platform using a dedicated on-premise connector. Once the connection is set up, you can start retrieving data from SAP tables, and start different automation jobs.

For detailed information on how data is extracted from SAP using the on-premise extractor, see [Data extraction overview](pipeline-end-to-end-overview.html "SAP ECC and S/4HANA data extraction overview")

Expand all

[## 1. Install the SAP client](#UUID-14ae2b14-877b-2f26-124e-e5107d556a25_section-idm4514461747928034325620594022_body)

Celonis Platform provides a single installer with which you can install SAP extraction client, for data extraction, and the Automation client, used for setting up automations using SAP. We refer to both clients as on-prem clients. For detailed instructions on installing the on-prem clients, see [Installing](installing-on-prem-clients.html "Installing on-prem clients").

**Important**

If you’re using SAP 4.6C or older or need to use the SAP PI/PO connection, you must install the SAP extraction client using the uplink installation. See [SAP extraction client for PI/PO and SAP 4.6C](step-1--installing-sap-extractor.html "SAP extraction client for PI/PO and SAP 4.6C").

Once the client installation is done, the Celonis on-prem client must connect to the SAP system. To do this, download the SAP Java Connector (SAP JCo) file and copy it to your local directory. See [Installing on-prem clients](installing-on-prem-clients-on-windows.html "Installing on-prem clients on Windows").

[## 2. Install the RFC module](#UUID-14ae2b14-877b-2f26-124e-e5107d556a25_section-idm4514461649566434325769991834_body)

This is an extraction-specific step. You don't have to do it if you only want to connect to SAP for automation purposes. The RFC module allows you to extract from the SAP database based on information received from the Automation client you installed earlier. For detailed RFC module installation steps, go to [Installing the RFC module](installing-the-rfc-module.html "Installing the RFC module").

[## 3. Create a user and assign permissions for the SAP connection](#UUID-14ae2b14-877b-2f26-124e-e5107d556a25_section-idm4619622822275234325808964808_body)

This step is valid for both extraction and automation actions. Before running any of these jobs, you must create an SAP user and equip them with the permissions necessary to perform extraction and automation tasks. For instructions on how to create a user in SAP, see [Create users for SAP connection](create-users-for-sap-connection.html "Create users for SAP connection").

[## 4. Configure real-time extension (optional)](#UUID-14ae2b14-877b-2f26-124e-e5107d556a25_section-idm4538921590721634325828487775_body)

You need to do this step only if you plan to use the replication cockpit or the real-time options with data jobs. Go to [Setting up the Replication Cockpit](set-up-sap-real-time-extension.html "Setting up the Replication Cockpit").

[## 5. Set up a connection in Celonis Platform](#UUID-14ae2b14-877b-2f26-124e-e5107d556a25_section-idm4613820834035234325894660917_body)

When all the pieces are in place, it's time to create your SAP connections in Celonis Platform. For data extraction, you can do it in the Data Integration area. See [Creating a data connection](step-3-create-sap-connection-in-the-celonis-platform.html "Creating a data connection between SAP and the Celonis Platform").

For automations, create your connection between SAP and Automation client in Studio or through the Admin and Settings area. See [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections").

## Related topics

- [One-time extraction](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html "One-time extraction from SAP ECC or SAP S/4HANA")
- [Local extraction](local-extractor-for-sap-ecc-and-sap-s-4hana.html "Local extractor for SAP ECC and SAP S/4HANA")
- [RFC module](rfc-module-overview.html "RFC module")


---

## data-integration/connectors/connecting-to-sap-ariba

# Connecting to SAP Ariba (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect your SAP Ariba instance to the Celonis Platform using either asynchronous or synchronous APIs, with the method used depending on the business process you are extracting. Both methods require you to create or have access to an approved SAP Ariba application (managed via the SAP Ariba Developers Portal), giving you access to the authentication information needed when creating the connection between SAP Ariba and the Celonis Platform.

For an overview of asynchronous and synchronous APIs and which SAP Ariba business process uses which method, see: [Supported SAP Ariba API endpoints](supported-sap-ariba-api-endpoints.html "Supported SAP Ariba API endpoints").

Depending on the API group you're using, the process for connecting to SAP Ariba and extracting your data is as follows:

|  |
| --- |
|  |

Expand all

[## Before you begin](#UUID-09e44f78-f268-3df7-c5ab-15112228d2d8_section-idm4587525779819234227573073492_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### SAP Ariba authentication methods](#id492877_body)

When connecting to your SAP Ariba tenant for a business process, you need to supply an API key with client ID and client secret. You can access these by creating an SAP Ariba application in the SAP Ariba Developers Portal and then submitting this for approval. Once the application is approved, you can access the API key, client ID, and client secret.

As each business process requires separate authentication credentials, you need access to an approved SAP Ariba application (and the relevant API key, client ID, and client secret) for each process you want to extract.

For the SAP Ariba Developers Portal, see: [SAP Ariba Developer Portal](https://developer.ariba.com/).

And for the SAP Ariba documentation, see: [SAP Help Center - SAP Ariba](https://support.ariba.com/help).

[### Allowlisting Celonis Platform IPs and domains](#id492885_body)

If your SAP Ariba tenant instance is only reachable within a certain IP range, you need to allowlist the outbound IPs of the Celonis Platform, otherwise data cannot be extracted. The IPs of the Celonis Platform are different depending on the cluster (eu-1 or us-1).

For more information, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains").

[## Configuring the SAP Ariba extractor](#UUID-09e44f78-f268-3df7-c5ab-15112228d2d8_section-idm4627667577409634227573126_body)

This section describes the basic setup of configuring the SAP Ariba extractor. To view the overview of this process:

To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection**, and select **Connect to Data Source**.
3. Select **Cloud - Ariba**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **Region**: Please specify whether your Ariba system is based in Europe or the United States. Depending on the region, different URLs are used for authentication.
   - **API group**: Select the API Group you want to extract data from. The API Group represents the SAP Ariba module you want to extract data from.
   - **Realm**: The name of your SAP Ariba Realm. The realm is usually contained in your SAP Ariba system URL. The URL should contain "realm=mycompany", where "mycompany" is the realm.
   - **Client ID**: Retrieved from your approved SAP Ariba application in the SAP Ariba Developers Portal.
   - **Client secret**: Retrieved from your approved SAP Ariba application in the SAP Ariba Developers Portal.
   - **API key**: Retrieved from your approved SAP Ariba application in the SAP Ariba Developers Portal.
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

   The connection between your SAP Ariba tenant and the Celonis Platform is established. You can manage this connection at any time by selecting options:

   |  |
   | --- |
   |  |

[## SAP Ariba extractor limitations and known issues](#UUID-09e44f78-f268-3df7-c5ab-15112228d2d8_section-idm2533523620919694_body)

This section explains the limitations and known issues for the SAP Ariba extractor:

- Extraction performance may be constrained by API rate limits imposed by SAP Ariba. These limits are defined per API endpoint, and may require additional resource-aware extractor configurations and orchestration to avoid exceeding specific API rate limits. Refer to the [Asynchronous APIs for SAP Ariba](asynchronous-apis-for-sap-ariba.html "Asynchronous APIs for SAP Ariba") documentation for more details.

  **Tip**

  SAP Ariba API rate limits can often be increased by contacting your SAP Ariba account team.
- Data access is restricted to the Celonis-supported [SAP Ariba API endpoints](supported-sap-ariba-api-endpoints.html "Supported SAP Ariba API endpoints").
- The use of a proxy service (e.g., SAP PI/PO or Apigee) is **only** supported for the Procurement API.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sap-concur

# Connecting to SAP Concur (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis SAP Concur extractor integrates the Celonis Platform with with SAP Concur to retrieve expense, travel, and invoice management data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-id235174809476618_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### SAP Concur authentication methods](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481016380_body)

To connect to SAP Concur, we recommend using OAuth 2.0. Before configuring the data connection in the Celonis Platform, you need access to an SAP Concur user with the necessary permissions to extract data to external systems.

To configure your SAP Concur user, refer to the OAuth 2.0 Application Management documentation here: [SAP Help Portal - SAP Concur](https://help.sap.com/docs/CONCUR_EXPENSE/85f3db6f3c5945fe8414a08fc5f9e3fc/bd508956b56846f1a07d608cfc731e6b.html?version=2021_10#client-web-services)

[### Available SAP Concur endpoints](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481089970_body)

The Celonis SAP Concur extractor uses the standard REST API of SAP Concur. For more information, see: [SAP Concur Developers Center.](https://developer.concur.com/api-reference/)

[### SAP Concur data access](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481132748_body)

The Celonis SAP Concur extractor performs read-only operations on your SAP Concur data. No writing changes (like updates, deletions) will be performed at any time during the extraction process.

[### SAP Concur source system impact](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481215166_body)

The Celonis SAP Concur extractor is bound to the API call limits applied by SAP Concur, guarding the system from any performance issues.

Transfer of the data from the SAP Concur system to the target system is secured through HTTPS, which allows for an encrypted exchange of information.

[## Configuring the SAP Concur extractor](#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481461496_body)

This section describes the basic setup of configuring the SAP Concur extractor. To configure the extractor:

**Note**

For configuration, the SAP Concur extractor has specific OAuth 2 required values. For more information, see [SAP Concur authentication methods](connecting-to-sap-concur.html#UUID-a9ff8c97-a49b-1c9a-289b-2fced8b0c7a3_section-idm2533517481016380 "SAP Concur authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sap-ecc-and-s-4-hana-on-prem-and-private-cloud

# Connecting to SAP ECC and S/4 HANA (on-prem + private cloud)

Depending on the SAP system you're using and the type of extraction you want to perform, Celonis Platform offers you different ways of extracting data from SAP systems.

**Note**

This page describes extracting data from private cloud and on-premises data sources, for the public cloud extractor, see [SAP S/4HANA Public Cloud](connecting-to-sap-s-4hana-public-cloud.html "Connecting to SAP S/4HANA Public Cloud (extractor)").

- [Celonis Extractor for SAP ECC and S4/HANA](pipeline-end-to-end-overview.html "SAP ECC and S/4HANA data extraction overview") - allows you to establish a continuous data connection between Celonis Platform and SAP systems.
- [One-time extraction using ABAP script](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html "One-time extraction from SAP ECC or SAP S/4HANA") - runs a single extraction task.
- [Local extraction](local-extractor-for-sap-ecc-and-sap-s-4hana.html "Local extractor for SAP ECC and SAP S/4HANA") - uses a local extractor for SAP ECC and SAP S/4HANA, allowing you to perform a one-time extraction of your data.

**Tip**

If you are unsure which connection method to use, see [Choosing the correct connection for SAP](connecting-to-sap-ecc-and-s-4-hana-on-prem-and-private-cloud.html#UUID-a4862f47-1bfe-90ab-9e2f-9ea9eb179118_section-id235151960019222 "Choosing the correct connection for SAP").

Expand all

[## Choosing the correct connection for SAP](#UUID-a4862f47-1bfe-90ab-9e2f-9ea9eb179118_section-id235151960019222_body)

Celonis provides multiple methods to connect to your SAP components. The chart below can help guide you to the appropriate connection method:

**Note**

For more information about On-premise extractors, see [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sap-maxdb

# Connecting to SAP MaxDB (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis SAP MaxDB extractor allows you to transfer data from SAP MaxDB databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm2533518797269732_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-sap-maxdb.html#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The SAP MaxDB extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the SAP MaxDB extractor](#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_section-idm2533518797454622_body)

This section describes the basic setup of configuring the SAP MaxDB extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **SAP MaxDB**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `7210`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-sap-maxdb.html#UUID-a8fc67d9-2a53-f824-b1b7-4b92b2f4d146_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sapdb://<host>:<port>/<database>?property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to SAP MaxDB with JDBC strings, see the [SAP MaxDB documentation](https://help.sap.com/docs/SAP_NETWEAVER_DBOS/1f8802ad0a634955b6210c6e98536097/467bb196e97150d1e10000000a155369.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sap-s-4hana-public-cloud

# Connecting to SAP S/4HANA Public Cloud (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect your SAP S/4HANA Public Cloud instance to the Celonis Platform. The default extractor provides default endpoints to extract the data for Accounts Payable, Purchase-to-Pay, and Order-to-Cash. For the extractor to work out-of-the-box you either need to follow our proposed nomenclature for CDS views or you can adjust the CDS view names based on your preferences on the data connection set-up page.

For a successful connection test between your SAP S/4HANA Public Cloud instance and the Celonis Platform, the Catalog service needs to be accessible and queriable by the provided user.

Expand all

[## Before you begin](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4518938061996834241181811115_body)

To connect to your S/4HANA Public Cloud tenant, you need to set up custom CDS views in the source system that point to the correct data objects. These CDS views can be exposed and accessed via Rest APIs based on the OData standard. Our extractor uses these APIs to fetch the necessary data.

While we provide the steps for setting up custom CDS views, we recommend viewing the official documentation: [SAP Help Portal - SAP S/4HANA Cloud](https://help.sap.com/docs/SAP_S4HANA_CLOUD?locale=en-US)

[### Step 1: Creating a communication user](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409238476834241186293995_body)

To create a communication user in your SAP S/4HANA Public Cloud instance:

1. Navigate to the **Maintain Communication Users** app.
2. Create a new user and provide a name, description and password.

[### Step 2: Creating a communication system and arrangement](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4592483213620834241186352601_body)

To create a communication system and arrangement in your SAP S/4HANA Public Cloud instance:

1. Navigate to the **Communication Systems** app.
2. Create a new Communication system. You will need to provide an ID, a name for the Communication system, and the system host name.
3. Select the **Users for Inbound Communication** tab.
4. Add the communication user that you just created and select Authentication method User name and password.
5. Go to the **Communication Arrangements** tab.
6. Add the **SAP\_COM\_0449** communication arrangement.
7. Select the communication system that you created in Step 2.

   This is a standard communication arrangement that gives access to the Catalog Service which is required for a successful connection test.

**Note**

After completing [Step 2: Creating a communication system and arrangement](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4592483213620834241186352601 "Step 2: Creating a communication system and arrangement"), you can create an SAP S/4HANA data connection in the Celonis Platform, and then continue with the remaining steps.

This allows you to test your connection before continuing to configure it.

For more information, see: [Configuring the SAP S/4HANA Public Cloud extractor](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409052969634241181853245 "Configuring the SAP S/4HANA Public Cloud extractor").

[### Step 3: Creating and publishing CDS views](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4577651092979234241266848875_body)

To create and publish CDS views for new data objects and tables to the created user:

1. Download the **CDS View Requirements** from the Celonis Download Portal, see: [Accessing your download portal](download-portal.html "Accessing your download portal").
2. Navigate to the **Custom CDS Views** app.
3. Create a new custom CDS View and provide a label/name.
4. Select **External API** or **Standard CDS View** as a scenario dependent on the nature of the CDS view.

   Our Support team can provide you with a detailed spreadsheet with the required CDS views.
5. Add a primary data source.

   **Note**

   Consult the detailed spreadsheet from Celonis Support. This provides the information you'll need for this step, adding data elements (step 7) and adding filters (step 8).

   Additionally, For some of the data sources to be visible you need to make the filter bar visible and remove the pre-defined filter “Recommended Data Source: Yes”.
6. Optionally, add an associated data source.
7. In the **Elements** tab, add the data elements.
8. Optionally, select the **Filter** tab and add the described filter.
9. Select **Publish** to publish the CDS view.

[### Step 4: Creating a communication scenario for the CDS views](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409323910434241266903141_body)

To create a communication scenario for the CDS views:

1. Navigate to the **Custom Communication Scenario**s app.
2. Provide an ID and a description.

   We recommend collating all created CDS views into one communication scenario.
3. In the **Inbound Service**s tab, add all relevant custom CDS views.
4. Select **Publish** to publish the communication scenario.

[### Step 5: Assigning the communication scenario to the communication arrangement](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4577650991102434241266978251_body)

To assign the communication scenario to the communication arrangement:

1. Go to the **Communication Arrangements** app.
2. Create a new communication arrangement and add the communication scenario that you created in [Step 4: Creating a communication scenario for the CDS views](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409323910434241266903141 "Step 4: Creating a communication scenario for the CDS views").
3. Select the communication system you created in [Step 2: Creating a communication system and arrangement](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4592483213620834241186352601 "Step 2: Creating a communication system and arrangement"). This will auto-populate the user created in [Step 1: Creating a communication user](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409238476834241186293995 "Step 1: Creating a communication user").
4. Select **Save**.

[## Configuring the SAP S/4HANA Public Cloud extractor](#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409052969634241181853245_body)

After completing at least [Step 1: Creating a communication user](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4613409238476834241186293995 "Step 1: Creating a communication user") and [Step 2: Creating a communication system and arrangement](connecting-to-sap-s-4hana-public-cloud.html#UUID-a5fe603c-ad74-f62a-26a9-00dc2ea932c0_section-idm4592483213620834241186352601 "Step 2: Creating a communication system and arrangement") prerequisites, you can create a data connection between your SAP S/4HANA instance and the Celonis Platform:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.
3. Select **Cloud - SAP S/4HANA Public Cloud**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **API URL**: The URL used to connect to your SAP S/4HANA instance in the following format:

     ```
     https://<yourinstance>-api.s4hana.cloud.sap/
     ```
   - **CDS Views**: The default extractor provides default endpoints to extract the data for Accounts Payable, Purchase-to-Pay, and Order-to-Cash. For the Extractor to work out-of-the-box you either need to follow our proposed nomenclature for CDS views or you can adjust the CDS view names based on your preferences.
   - **Username and password**: The username and password for the user configured in the prerequisites.
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

   The connection between your SAP S/4HANA Public Cloud instance and the Celonis Platform is established. You can manage this connection at any time by selecting **Options**:

   |  |
   | --- |
   |  |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-servicenow

# Connecting to ServiceNow (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis ServiceNow extractor integrates the Celonis Platform with your ServiceNow tenants. It supports the following basic features:

Expand all

[## Before you begin](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm4648477064704034221902852871_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### ServiceNow authentication methods](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm2533520695049622_body)

The ServiceNow extractor allows you to authenticate using either:

- **Stored Credentials**: Connect via basic authentication with the username and password of a ServiceNow user account.

  **Note**

  Specific permissions are required for the ServiceNow user account. For more information see [Configuring ServiceNow user permissions (Stored Credentials)](connecting-to-servicenow.html#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm4551056180128034221907701861 "Configuring ServiceNow user permissions (Stored Credentials)").
- **OAuth (Recommended)**: Connect via a ServiceNow application endpoint. For the application endpoint, use the following URL:

  ```
  https://auth.redirect.celonis.cloud/service-now_redirect
  ```

  When using the **OAuth** method, you will need the client ID and client secret of the ServiceNow application.

  **Note**

  In [Configuring the ServiceNow extractor](connecting-to-servicenow.html#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm455105618050083422190774549 "Configuring the ServiceNow extractor"), you will find a video that includes the steps in this process. For instructions, refer to the [ServiceNow documentation](https://www.servicenow.com/docs/bundle/zurich-platform-security/page/administer/security/task/t_CreateEndpointforExternalClients.html).

[### Allowlisting Celonis Platform IPs and domains](#id497340_body)

If your ServiceNow instance is only reachable within a certain IP range, you need to allowlist the outbound IPs of the Celonis Platform, otherwise data cannot be extracted. The IPs of the Celonis Platform are different depending on the cluster (eu-1 or us-1). For more information, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains").

[### Configuring ServiceNow user permissions (Stored Credentials)](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm4551056180128034221907701861_body)

To extract data from your ServiceNow tenant using basic authentication (**Stored Credentials)**, you need access to a user with the following permissions:

**Tip**

These steps are not needed if your are using OAuth credentials.

- **Roles**: `soap_query` and `snc_platform_rest_api_access`
- **Table access**: Access to the table `sys_db_object` and all tables you want to extract.
- **View access**: Access to the table ‘sys\_db\_view’ and all views you want to extract.
- **Endpoint access**: Access the following endpoint for each table, which is then used to derive the schema:

  ```
  https://<instance>/<table>?SCHEMA
  ```

  For example:

  ```
  https://<instance>/incident.do?SCHEMA
  ```

To configure this user, we recommend the following steps:

**Note**

For the latest ServiceNow documentation and the steps involved, see: [ServiceNow - Product Documentation](https://docs.servicenow.com/).

In [Configuring the ServiceNow extractor](connecting-to-servicenow.html#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm455105618050083422190774549 "Configuring the ServiceNow extractor"), you will find a video that includes an overview of the steps in this process.

1. **Create a new role**: In order to assign the correct access right to the user used for the Celonis extraction, we recommend creating a new role in the user administration section.
2. **Create a new user and assign the required roles**: Assign the roles `soap_query` `snc_platform_rest_api_access`, and the role you created in step 1.
3. **Elevate privileges of your user**: To modify access control for the newly created Celonis role, you need to elevate your privileges. You can do this by selecting **Elevate Roles**.

   With the elevated role, you can then open access control lists (ACL).

   |  |
   | --- |
   |  |
4. **Create two ACL**:

   - **ACL One:**

     - **Operation**: read
     - **Active**: true
     - **Name**: Table [sys\_db\_object]
     - **Field (Column)**: \*
     - **Required roles**: the role created in step 1.
   - **ACL Two:**

     - **Operation**: read
     - **Active**: true
     - **Name**: Table [sys\_db\_object]
     - **Field (Column)**: --None--
     - **Required roles**: the role created in step 1.

   Settings that take an asterisk (`*`) are dependent on their ServiceNow permission settings. If you experience problems, change `*` to None.
5. **Allow access to all tables**: You should now allow access to all tables you want to extract. With the elevated role you can open access control lists (ACL). Here you need to create a new ACL with the following attributes:

   - **Operation**: read
   - **Active**: true
   - **Name**: the name of the table
   - **Field (Column)**: all fields selected
   - **Required roles**: the role created in step 1.
6. Repeat the previous step for all tables you want to extract.

[## Configuring the ServiceNow extractor](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm455105618050083422190774549_body)

This section describes the basic setup of configuring the ServiceNow extractor.

To configure the extractor:

1. From your data pool diagram, Select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.
3. Select **Cloud - ServiceNow**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **Authentication method:** Choose between **Stored Credentials** (username and password a Service now user) or **OAuth**.

     **Note**

     For more information, see [ServiceNow authentication methods](connecting-to-servicenow.html#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm2533520695049622 "ServiceNow authentication methods").
   - **Tenant or URL**: The realm of your ServiceNow instance. The realm can be found by looking at the system URL. For example, in the following URL `mycompany` is the realm:

     ```
     https://mycompany.service-now.com
     ```
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

   The connection between your ServiceNow tenant and the Celonis Platform is established. You can manage this connection at any time by selecting options:

   |  |
   | --- |
   |  |

[## ServiceNow data extraction best practices](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm4566009219571234329801490192_body)

When configuring your ServiceNow extraction tasks, we recommend the following the :

[### Filtering ServiceNow data](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm4606573273732834222038918558_body)

When executing your ServiceNow extractions, you can filter the data you extract. However you can't use all combinations of AND / OR filters, so we recommend the following:

- Option 1 `AND` Option 2, for example:

  ```
  sys_created_on > '2011-09-14' AND sys_updated_by = 'system'
  ```
- Option 1 `OR` Option 2, for example:

  ```
  sys_created_on > '2011-09-14' OR sys_updated_by = 'system'
  ```
- (Option 1 `AND` Option 2) `AND` Option 3, for example:

  ```
  (sys_created_on > '2011-09-14' AND sys_updated_by = 'system') AND sys_updated_on > '2018-12-05'(A AND B) AND C, example:
  ```
- (Option 1 `OR` Option 2) `OR` Option 3, for example:

  ```
  (sys_created_on > '2011-09-14' OR sys_updated_by = 'system') OR sys_updated_on > '2018-12-05'
  ```
- Option 1 `OR` (Option 2 `AND` Option 3), for example:

  ```
  sys_updated_by = 'system' OR (sys_created_on > '2011-09-14' AND sys_updated_on > '2018-12-05')
  ```

**Filters are case-sensitive**

When filtering in ServiceNow, the filters are case-sensitive. This means that `FIELDNAME` and `fieldname` are handled as separate filter queries.

[### Extract from read replica](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm2349813735505_body)

You can enable **Extract from read replica** on a table level for your ServiceNow extractions. In ServiceNow, a read replica is a read-only copy of the primary database used to improve performance and scalability. It allows high-volume data reads, like analytics, reporting, or integrations, without impacting the performance of the main (read/write) transactional database.

Enabling this option for your ServiceNow extractions uses the parameter `sysparm_query_category=reporting` in all extraction requests. This will direct the query to the reporting read replica of ServiceNow.

To enable this for your ServiceNow extractions, select **Data Jobs - Table Configuration** and select **Extract from read replica**:

[### Extracting the sys\_audit table](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm23436239727898_body)

To increase the performance and limit the source system impact when extracting the `sys_audit` table:

- The `sys_audit` table **should not** be extracted as a primary table, only as a dependent table. The extractor automatically adds the `sys_audit` tables as a dependent table for most objects. This means extractions are limited to the retrieved `sys_is` fields (which are unique), and lead to a better performance.
- Applied filters should be limited to indexed columns only.
- Additional filtering on `sys_created_on` or `sys_updated_on` can also improve performance.

[### Using Order-by Parameter in Request](#UUID-2f597abb-dbbc-1ac5-3c56-a5384c1050a8_section-idm234362395237024_body)

When configuring your ServiceNow extractions, you can enable **Use Order-by Parameter in Request** for all API requests at the table level.

Enabling this option ensures data integrity by preventing missing records and duplicates. However, it will also lead to a longer extraction time and an increased load on the source system. To help minimize this impact, we recommend that you apply partitioning to reduce both the peak impact and the duration of the system being occupied or increase the batch size, which increases the peak impact but decreases the duration of the system being occupied.

|  |
| --- |
|  |

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-snowflake

# Connecting to Snowflake (extractor)

**Bulk exporting**

If you are using a direct connection to your Snowflake instance with the Celonis Platform, you can now take advantage of a bulk export for full extractions. This method offers significant reductions in extraction times without any alterations or new configurations needed within the Celonis Platform.

While no additional changes are needed in the Celonis Platform, you may need to configure `PREVENT_UNLOAD_TO_INLINE_URL=FALSE` in Snowflake. If left set to `TRUE`, Snowflake may default back to standard protocols. For more information, refer to the [Snowflake documentation](https://docs.snowflake.com/en/sql-reference/parameters#prevent-unload-to-inline-url).

For more information on direct connections, see [Choosing the connection type](connecting-to-snowflake.html#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c "Choosing the connection type").

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Snowflake extractor allows you to transfer data from Snowflake databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm2533519657536026_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-snowflake.html#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication methods](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm253487472568739603_body)

The Snowflake extractor supports the authentication methods described in the following sections.

[#### Authentication method – username and password](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Snowflake extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[#### Authentication method – OAuth](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4606490565510434248512967361_body)

**Note**

Snowflake now requires MFA for all new human users, and in the future [will drop support for LEGACY\_SERVICE users](https://docs.snowflake.com/en/user-guide/security-mfa-rollout#label-security-mfa-milestone-new-users). Please migrate to service users, using either OAuth or Key Pair authentication.

If you are using Snowflake’s built-in identity provider, you can connect to your public-facing Snowflake instance using OAuth authentication.

**Important**

If your Snowflake instance uses an external identity provider for SSO authentication, OAuth is **not** supported. We recommend using [Key Pair authentication](connecting-to-snowflake.html#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4537937932924834312211659574 "Authentication method – Key Pair authentication") instead.

To use OAuth authentication with Snowflake’s built-in identity provider:

1. Sign into your Snowflake account.

   **Note**

   This account must be able to run commands as both the **USERADMIN** role for user and role management tasks, and the **ACCOUNTADMIN** role for account-level operations. Ensure you are using the appropriate role when performing each step.
2. As the **USERADMIN** role, create a new user role and grant the required role permissions by running the following commands in the **Worksheets window**:

   ```
   # Create a new role for celonis
   create role celonis_role;

   # Grant permissions for that role
   grant select on all tables in schema MY_DB.PUBLIC to role celonis_role;
   ```
3. As the **USERADMIN** role, create a new user and assign it the role by running the following commands in the **Worksheets window**:

   ```
   # Create a new user for celonis
   create user celonis password='celonis123';

   # Grant celonis permissions to celonis user
   grant role celonis_role to user celonis;
   ```
4. As the **ACCOUNTADMIN** role, create a security integration group by running the following commands in the **Worksheets window**:

   ```
   # Create security integration for the oauth
   create security integration oauth_kp_int
    type = oauth
    enabled = true
    oauth_client = CUSTOM
    oauth_client_type = 'CONFIDENTIAL'
    oauth_redirect_uri = 'https://auth.redirect.celonis.cloud/snowflake_redirect'

    oauth_issue_refresh_tokens = true
    oauth_refresh_token_validity = 7776000;

   # Allow celonis user to use the integration as ACCOUNTADMIN
   ALTER USER celonis ADD DELEGATED AUTHORIZATION OF ROLE celonis_role TO SECURITY INTEGRATION oauth_kp_int;
   ```
5. As the **ACCOUNTADMIN** role, retrieve the Client ID and Client secret for the OAuth integration by running the following commands in the **Worksheets window**:

   ```
   # Get the client-id & client-secret for the integration; Note that the integration name is case-sensitive and must be uppercase and enclosed in single quotes.

   select SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('OAUTH_KP_INT');
   ```

[#### Authentication method – Key Pair authentication](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4537937932924834312211659574_body)

If you want to connect to Snowflake using key pair authentication, you need to generate a private key in your data source system. Celonis recommend using an encrypted private key with a passphrase. This passphrase is then encrypted by the Celonis Platform, giving you an extra layer of security.

**Note**

If you encrypt your private key with a passphrase, ensure you select the **Is your key encrypted?** checkbox in the **Credentials** configuration.

This authentication method can be used for both direct and uplink connections. When entering the **Credentials > Private Key** value in the configuration, include the value starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----`.

For more information about key pair authentication, including generating an encrypted private key, see: [Snowflake docs: Key pair authentication](https://docs.snowflake.com/en/user-guide/key-pair-auth#configuring-key-pair-authentication).

[## Configuring the Snowflake extractor](#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm4550567512206434244693051536_body)

This section describes the basic setup of configuring the Snowflake extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Snowflake**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to; default: `443`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Warehouse**, enter the name of the Snowflake virtual warehouse to use for running queries during data extraction.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-snowflake.html#UUID-8f41b606-d003-5e6f-513a-0266847bf441_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:snowflake://<account_identifier>.snowflakecomputing.com/?db=<database>&schema=<schema>&warehouse=<warehouse>&role=<role>&property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to Azure SQL with JDBC strings, see the [Snowflake documentation](https://docs.snowflake.com/en/developer-guide/jdbc/jdbc-configure).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, select the type of credentials to use for this connection. For more information on the different credential types, see [Authentication methods](connecting-to-snowflake.html#UUID-8f41b606-d003-5e6f-513a-0266847bf441_section-idm253487472568739603 "Authentication methods").

      **Note**

      Ensure the credentials used have sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue.

   **Note**

   **If using OAuth**, the OAuth workflow starts, asking you to sign into your Snowflake account and authorize the connection.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sybase-ase

# Connecting to Sybase ASE (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Sybase ASE extractor allows you to transfer data from Sybase Adaptive Server Enterprise (ASE) databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm2533518825172330_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-sybase-ase.html#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Sybase ASE extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Sybase ASE extractor](#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_section-idm2533518825237054_body)

This section describes the basic setup of configuring the Sybase ASE extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Sybase ASE**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `5000`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-sybase-ase.html#UUID-82a3ab2c-425f-3b3a-fdac-a23f31d5ad08_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sybase:Tds:<host>:<port>/<database>?property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to Sybase ASE with JDBC strings, see the [Sybase ASE documentation](https://help.sap.com/docs/SAP_ASE_SDK/c4016b5564ed4c98bbade36a3a35202d/b0822ab9bbf91014ba1bc4fea5c9aafb.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-sybase-iq

# Connecting to Sybase IQ (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Sybase IQ extractor allows you to transfer data from SAP IQ (formally Sybase IQ) databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm2533518825172330_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-sybase-iq.html#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Sybase IQ extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Sybase IQ extractor](#UUID-7de75242-ecf2-f531-467b-b593e7690505_section-idm2533518825237054_body)

This section describes the basic setup of configuring the Sybase IQ extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Sybase IQ**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `2638`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-sybase-iq.html#UUID-7de75242-ecf2-f531-467b-b593e7690505_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sybase:Tds:<host>:<port>/<database>?property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to Sybase IQ with JDBC strings, see the [Sybase IQ documentation](https://infocenter.sybase.com/help/index.jsp?topic=/com.sybase.infocenter.dc01776.1601/doc/html/san1357754914053.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-teradata

# Connecting to Teradata (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Teradata extractor allows you to transfer data from Teradata databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm2533518828964894_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-teradata.html#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Teradata extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Teradata extractor](#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_section-idm2533518829085536_body)

This section describes the basic setup of configuring the Teradata extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Teradata**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1025`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-teradata.html#UUID-a6170a1d-ccb4-a024-3aaa-d221b87ace66_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:teradata://<host>/<database>,PROPERTY1=value,PROPERTY2=value
           ```

           **Note**

           For more information on connecting to Teradata with JDBC strings, see the [Teradata documentation](https://docs.teradata.com/r/Enterprise_IntelliFlex_VMware/Data-Dictionary/LogonSource-Column-Fields-and-Examples/LogonSource-Column/JDBC-Driver-API).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-trino

# Connecting to Trino (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Trino extractor allows you to transfer data from Trino databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm2533518831392406_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-trino.html#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Trino extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Trino extractor](#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_section-idm2533518831465184_body)

This section describes the basic setup of configuring the Trino extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Trino**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `8080`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-trino.html#UUID-4de54779-4aae-b82a-5e12-aaaefdf3cac3_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:trino://<host>:<port>/<catalog>/<schema>?property1=value1&property2=value2...
           ```

           **Note**

           For more information on connecting to Trino with JDBC strings, see the [Trino documentation](https://trino.io/docs/current/client/jdbc.html).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-vertica

# Connecting to Vertica (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Vertica extractor allows you to transfer data from Vertica databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm2533518828964894_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-vertica.html#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm4597696085308834242997888957_body)

The following network settings apply only for **direct connections**:

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Network settings for uplink connections](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm4540235628342434242997842524_body)

The following network settings apply only for **uplink connections** (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[#### Celonis Platform IP addresses depending on the cluster](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

The following JDBC string connection parameters are not supported due to security reasons:

**Important**

If you are using any of the following parameters in your JDBC string, you must remove them for the connection to be successful.

```
- AUTO_DESERIALIZE("autoDeserialize"),
- ALLOW_URL_IN_LOCAL_IN_FILE("allowUrlInLocalInfile"),
- ALLOW_LOAD_LOCAL_IN_FILE("allowLoadLocalInfile"),
- ALLOW_PUBLIC_KEY_RETRIEVAL("allowPublicKeyRetrieval"),
- EXPOSE_METADATA("exposeMetadata"),
- STATEMENT_INTERCEPTORS("statementInterceptors"),
- QUERY_INTERCEPTORS("queryInterceptors"),
- DETECT_CUSTOM_COLLATIONS("detectCustomCollations"),

//IBM DB2 driver properties according to <add this link - https://www.ibm.com/support/pages/node/7010029>
- TRACE_FILE("traceFile"),
- CLIENT_REROUTE_SERVER_LIST_JNDI_NAME("clientRerouteServerListJNDIName"),
- PLUGIN_CLASS_NAME("pluginClassName");
```

[### Authentication method – username and password](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Vertica extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Vertica extractor](#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_section-idm2533518829085536_body)

This section describes the basic setup of configuring the Vertica extractor. To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool you want to use for the extraction.

   **Note**

   If you do not have a data pool to use for this extraction, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools") for instructions on how to create one.
3. In the **Data Integration** section, select **Connect to Data Source**.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**.
5. In the **Connect to Data Source** window, depending on your use case, select either **Database – On Premise** or **Database – Cloud**.

   **Note**

   Select **Database – On Premise** to connect to on-premise or private cloud databases.

   1. If you selected **Database – On Premise**, follow the on-screen instructions.
6. In the **New Database Data Connection** window, fill in the following information:

   1. For **Name**, provide a name for this configuration.
   2. For **Database Type**, select **Vertica**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `5433`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-vertica.html#UUID-fdeecaec-d994-c0d4-022c-dc2fbb6b4237_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:vertica://<host>/<database>,PROPERTY1=value,PROPERTY2=value
           ```

           **Note**

           For more information on connecting to Vertica with JDBC strings, see the [Vertica documentation](https://docs.vertica.com/25.3.x/en/connecting-to/client-libraries/accessing/java/creating-and-configuring-connection/jdbc-connection-properties/).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
   5. If desired, select **Advanced Settings**, and update these parameters as needed.

      **Note**

      The **Advanced Setting > Validate Certificate** parameter (Default: `DISABLED`) controls whether the extractor validates the server’s SSL/TLS certificate:

      - **Disabled**: Disables certificate validation (`validateCertificate=false`).
      - **Enabled**: Enforces certificate validation (`validateCertificate=true`).
      - **Removed**: Uses the driver’s default behavior. Check the driver documentation to confirm the default.
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-workday

# Connecting to Workday via REST or SOAP

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

You can connect your Workday instance to the Celonis Platform, allowing you to extract your reporting data from both commonly-used reporting types and custom reports.

There are two methods of connecting to your Workday instance and extracting your reports - REST (recommended) and SOAP:

Expand all

[## REST - Extract Workday reports via a custom extractor (recommended)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152289931283_body)

The below guide is a step by step guide on how to configure Workday and Celonis Extractor Builder to leverage the easier to use and preferred OAuth using Workday API Client for Integrations. This process involves creating and configuring a custom extractor in the Celonis Platform.

To learn more about creating custom extractors, see: [Applications](connecting-to-applications.html "Connecting to applications").

### Before you begin

Before creating your custom extractor, you need to create or have access to a custom report in Workday. This report must be saved in a JSON format and include the following filters:

- Transaction\_Entry\_Before
- Transaction\_Entry\_After

An example of how the Workday report URL would be structured:

```
https://InstanceID.myworkday.com/ccx/service/customreport2/InstanceID/UserID/ReportName&Filters&format=json
```

[### Step 1: Create integration system user (ISU)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm1763515234401408_body)

1. Select **Create Integration System User** task.
2. Keep *Session Timeout Minutes* default (zero).
3. Select **Do Not Allow UI Sessions** to not allow the ISU for logging into your Workday system through the UI.

[### Step 2: Create integration system security groups (ISSG)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm1763515235767608_body)

1. Select **Create Security Group** task.
2. As a type, select **Integration System Security Group (Unconstrained)** or **Integration System Security Group (Constrained)**. The main difference between these is that constrained version results will only be returned for objects that have a connection with a constraint. For example, for workers in the US organizational entity only.
3. In *Group Criteria*, select the newly-created ISU for inclusion in the security group.

[### Step 3: Identify security](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm1763515236041632_body)

Identify required security needed for specific operations (View Security for Securable Item) and edit domain security policies.

1. Select the **Domain Security Policies for Functional Area** report.
2. Select a security policy.
3. Select **Edit Permissions**.
4. Grant Get access for specific domain to newly created ISSG.

[### Step 4: Activate pending security policy changes](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm1763515236355458_body)

1. Access **Activate Pending Security Policy Changes** task.
2. Select **Confirm** checkbox to activate your changes.

[### Step 5: Give ISSG access to domains](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152364843945_body)

There are several ways to give the ISSG access to the domains - but the easiest way is to use the related actions on the newly created ISSG and Maintain the domain permissions for security group:

‘View’ Access is needed if using WQL and/or REST API, ‘Get’ Access is needed if using RAAS (Report as a Service) and/or SOAP API.

Note that:

- Activate Pending Security Policy Changes is needed after updating Domain Permissions for Security Groups.
- If using WQL - View/Modify access to Workday Query Language is also needed.

[### Step 6: Register API Client for Integrations](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152374730841_body)

- The security is double layered - the API Client must be given access to the functional areas and the integration user (security group) that was configured in steps 1-5 needs access to the specific domains. If the API Client has access to a functional area but the attached integration user does not have access to that area, then the API Client will not be able to access that data, and going the other direction if the integration user has access to data but the API Client does not have access to the functional area then the API client will not have access to the data.
- We recommend Non-Expiring Refresh Token, it is misleading but the refresh token is assigned when an integration system user is linked to the API Client, so a non-expiring refresh token just means that the unique refresh token code will not expire. If the refresh token is set to expire it will need to be regenerated and updated in Celonis every time it expires. Note for non-expiring refresh tokens they can still be manually refreshed by the customer - and it has no impact on the ability of the API to refresh it’s authorization code.
- We recommend all API Clients for Integration have access to System and Tenant Non-Configurable. System is required for WQL and Tenant Non-Configurable is required for RAAS.
- Upon Registration - note down the Client ID and Client Secret - the Secret cannot be viewed again after this point so if it is not noted down a new client secret will need to be generated.

[### Step 7: Manage refresh tokens for integrations](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152381758942_body)

Navigate back to View API Clients - and find the API Client for Integration that was just created. On the related actions, select ‘Manage Refresh Tokens for Integrations’

[### Step 8: Link the Integration System User](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152388884535_body)

Select/Link the Integration System User that was created in step 1.

[### Step 9: Generate new refresh token](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152394810374_body)

Select the Generate New Refresh Token option. Note if a refresh token already exists for this Integration System User on this API Client, then you will also need to Confirm Delete the existing Refresh Token - multiple Integration Users can be linked to 1 API Client, but each Integration User can only have 1 Refresh Token for each API Client.

[### Step 10: Create and configure a custom extractor in the Celonis Platform](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm1763515239491560_body)

With access to the custom report in Workday, you can then create a custom extractor from your data pool:

1. Click **Data Connections.**

   |  |
   | --- |
   |  |
2. Click **Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Click **Custom** - **Build Custom Connection** - **Build a new Extractor**.

   |  |
   | --- |
   |  |
4. Configure the following connection details and then click **Save and Continue**:

   - **Name**: An internal reference for this connection.
   - **Description**: An optional description.
   - **Connection parameters**: The following should all be mandatory:

     - Client ID
     - Client Secret - confidential
     - Refresh token
     - Token URL
   - **Authentication method**: Select the Custom Authentication and configure the fields as follows:

     - URL = {Connection.Token\_URL}
     - HTTP Method = POST
     - Request Parameters and Headers = Nothing
     - Request Body = x-www-form-urlencoded, with the following key pairs:

       - client\_id: {Connection.Client\_ID}
       - client\_secret: {Connection.Client\_Secret}
       - grant\_type: refresh\_token
       - refresh\_token: {Connection.Refresh\_Token}
     - Configure Response = access\_token
     - Configure authentication header for endpoints = authorization bearer
5. Create a first endpoint which is used for the connection test with the following configurations:

   |  |
   | --- |
   |  |

   - **Configure Endpoint**: make sure to **toggle** the "Use this endpoint for Connection Test" option.

     |  |
     | --- |
     |  |
   - **Configure Request**: add the {Connection.API\_URL} parameter followed by the custom report URL.

     For this endpoint, which is purely used for the connection setup, make sure that the Transaction\_Entry\_Before and Transaction\_Entry\_After parameters are only covering a one-day difference (as shown in the example). The original report URL can easily be adjusted accordingly. The reason for doing that is that the response can be quite large depending on the time frame and lead to timeouts.

     ```
                     {Connection.API_URL}/ccx/service/customreport2/InstanceID/UserID/Celonis_REST_Process_Extract?Transaction_Entry_After=2021-01-01-00:00&Transaction_Entry_Before=2021-01-02-00:00&Business_Process_Name%21WID=d5ddd2195a6c4f60b63077c26ae2950b!50862dc434f241c3978c87423a859d04!48b49c6d25a74247b7b9d0d6f6593d72! 56cd8fae34ad49ee94acae3d3873ea64!1afb78c169254c73a18e7f5f8d246a22&format=json
     ```
   - **Configure Response**: Define the target table name and add a response sample from the report.

     |  |
     | --- |
     |  |
   - **Deactivate** this endpoint.

     |  |
     | --- |
     |  |
6. Create a second endpoint that is used for the actual data extraction:

   - **Configure Endpoint**: make sure to **untoggle** the "Use this endpoint for Connection Test" option.
   - **Configure Request**: add the {Connection.API\_URL} parameter followed by the custom report URL. For this endpoint make sure to remove the Transaction\_Entry\_Before and Transaction\_Entry\_After parameters from the URL, these will be added automatically.

     ```
     {Connection.API_URL}/ccx/service/customreport2/InstanceID/UserID/Celonis_REST_Process_Extract?Business_Process_Name%21WID=d5ddd2195a6c4f60b63077c26ae2950b!50862dc434f241c3978c87423a859d04!48b49c6d25a74247b 7b9d0d6f6593d72!56cd8fae34ad49ee94acae3d3873ea64!1afb78c169254c73a18e7f5f8d246a22&format=json
     ```
   - **Request parameter**: Add a request parameter.
   - **Pagination method**: Define the pagination method.

     |  |
     | --- |
     |  |
   - **Configure Response**: Define the target table name and add a response sample from the report.
7. Click **Finish**.
8. Create a data job targeting that data connection and set up the additional filter in the extraction configuration as follows, where the DATE can be either a specific hard coded date or a parameter as in every other extraction.

   For more information, see: [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data").

[## SOAP - Extract using Workday Extractor (not recommended)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-id235152289991025_body)

**Limited Availability**

This extractor is currently in limited availability mode and can be added to your Celonis Platform environment by request only.

To request access to this extractor, contact [Celonis Support](support.html "Contacting Support").

This method lets you extract your reporting data from five different areas using the Workday API client with JWT.

This method is not recommended for the following reasons:

- The data access is limited to the supported APIs, which are not suitable for most use cases.
- Performance may degrade with large volumes of data.
- Lack of available filtering.

[### SOAP - Before you begin](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4492032825953634240994493805_body)

To extract your reporting data, you need to configure a Workday Integration System User (ISU) account with permissions to access Workday's web service operations. For security reasons, Workday restricts each ISU to a single integration system.

While we provide steps for this below, we recommend using the Workday documentation for the latest information: [Workday documentation](https://doc.workday.com/en-us/home.html)

[#### Step 1: Create integration system user (ISU)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4589732828041634241017612738_body)

1. Select **Create Integration System User** task.
2. Keep *Session Timeout Minutes* default (zero).
3. Select **Do Not Allow UI Sessions** to not allow the ISU for logging into your Workday system through the UI.

[#### Step 2: Create integration system security groups (ISSG)](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4577651134243234241032678211_body)

1. Select **Create Security Group** task.
2. As a type, select **Integration System Security Group (Unconstrained)** or **Integration System Security Group (Constrained)**. The main difference between these is that constrained version results will only be returned for objects that have a connection with a constraint. For example, for workers in the US organizational entity only.
3. In *Group Criteria*, select the newly-created ISU for inclusion in the security group.

[#### Step 3: Identify security](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4492032821483234241032725099_body)

Identify required security needed for specific operations (View Security for Securable Item) and edit domain security policies.

1. Select the **Domain Security Policies for Functional Area** report.
2. Select a security policy.
3. Select **Edit Permissions**.
4. Grant Get access for specific domain to newly created ISSG.

[#### Step 4: Activate pending security policy changes](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4622993258118434241032762176_body)

1. Access **Activate Pending Security Policy Changes** task.
2. Select **Confirm** checkbox to activate your changes.

[#### Optional: Using OAuth authentication](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4622993431854434241032797155_body)

To use OAuth2 two further prerequisites are required:

##### Generate a key pair

1. Open a key-pair generator tool like Cygwin then generate a key pair that will be stored in a key store called "JWTkeystore.jks" with a password (example uses "Workday123!").

   ```
   keytool -genkey -keyalg RSA -alias Workday -keystore JWTkeystore.jks -storepass Workday123! -validity 360 -keysize 2048
   ```
2. Extract the public key and save it as a file called "public.cert".

   ```
   keytool -export -alias Workday -keystore JWTkeystore.jks -rfc -file publickey.cert
   ```
3. One way to isolate and extract the private key is to convert the key store .jks file to a PKCS#12 (.p12) format.

   ```
   ƒopen PKCS12 -srcalias Workday -deststorepass Workday123! -destkeypass Workday123!
   ```
4. In PKSC#12 format, you can export the private key unencrypted or encrypted (both versions allegedly work per Workday documentation but this was tested using the unencrypted version).

   ```
   # Unencrypted Private Key openssl pkcs12 -in keystore.p12 -nodes -nocerts -out privatekey.pem 

   # Encrypted Private Key openssl pkcs12 -in keystore.p12 -nocerts -out privatekey.pem
   ```
5. Send the public.cert file to the relevant Workday Admin/Power User.
6. Ensure the private key file is safe and accessible for when the Workday Data Connection is being entered.

##### Register API Client in the Workday system

1. In Workday, create a Register API Client instance.
2. Select **JWT Bearer Grant** as the Client Grant type.
3. Under the “X509 Certificate”, select **Create x509 Public Key** and paste the content of publickey.cert (entire text of file including “---BEGIN Certificate---" and “---END Certificate---").
4. Ensure the right Scope (Functional Areas) are selected:

   **Jobs & Positions, Organizations and Roles, Staffing, and Worker Profile and Skills**.

   These Scopes are needed for the Workday Test Connection as it will wait for a successful response when it hits these Scopes (Web Services).
5. Create Integration System User (ISU). The ISU User Name needs to match the Client Name in the API Client. There are no requirements for the password. Perform the following steps to finalize creation of the ISU.

   1. Select Create Integration System User task
   2. Keep Session Timeout Minutes default (zero)
   3. Select Do Not Allow UI Sessions to not allow the ISU for logging into your Workday system through the UI.
6. Create an Integration System Security Group (ISSG). Ensure the Type = Unconstrained. Perform the following tasks to finalize creation of the ISSG.

   1. Select **Create Security Group** task.
   2. In Group Criteria, select the newly-created ISU for inclusion in the security group.
7. Identify required security needed for specific operations (View Security for Securable Item).

   1. Select the Domain Security Policies for Functional Area report.
   2. Select a security policy.
   3. Select Edit Permissions.
   4. Grant Get access for specific domain to newly created ISSG (Employee, Employee\_Employment\_Info, Former\_Workers, Job\_Categories, Job\_Profiles, Locations, Organizations, Supervisory\_Organization\_Assignment\_Restrictions, Worker\_Event\_History, Worker\_Profile, Workers).
8. Activate pending security policy changes through the following tasks:

   1. Access Activate Pending Security Policy Changes task.
   2. Describe your changes in the Comment.
   3. Select Confirm checkbox to activate your changes.

[### Creating a data connection between Workday and the Celonis Platform](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4622993496689634240997258113_body)

With access to your Workday authentication credentials, you can create a data connection between your Workday instance and the Celonis Platform from your data pool diagram:

1. Click **Data Connections**.

   |  |
   | --- |
   |  |
2. Click **Add Data Connection** and select **Connect to Data Source**.
3. Select **Cloud - Workday**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **API version**: Select the API you want to use, with the latest being the recommended.
   - **Authentication method**: Choose between store credentials (username, password, tenant, and host) and OAuth (client ID, user ID, private key, tenant, and host).
   - **Report configuration**: Enter the details for the reports you want to extract from Workday. You can also do this is JSON format.
5. Click **Test Connection** and correct any issues highlighted.
6. Click **Save**.

   The connection between your Workday instance and the Celonis Platform is established. You can manage this connection at any time by clicking **Options**:

   |  |
   | --- |
   |  |

[### Supported API endpoints](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4559961821540834240997302343_body)

When connecting your Workday instance to the Celonis Platform, the following API endpoints are supported:

[#### Human resources](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4578479583337634241020337448_body)

The Workday Hire-to-Retire connector uses Workday's SOAP-based [Human Resources Web Service](https://docs.celonis.com/en/extractor-detail,-workday.html) which contains operations that expose Workday Human Capital Management Business Services data, incl. employee, contingent worker and organization info. The Celonis Extractor uses the below operations to retrieve data from Workday:

| API call | Description |
| --- | --- |
| Get\_Employee | Retrieves granular information about individual employments (e.g., position, job, status). |
| Get\_Employee\_Employment\_Info | Retrieves granular information about individual employments (e.g., position, job, status). |
| Get\_Former\_Workers | Retrieves data for individuals that have previously been employed but were not included as a Workday worker, incl. their personal/job details and contact info as of termination date. |
| Get\_Job\_Categories | Retrieves job categories data for the specified criteria (all if no criteria specified), incl. reference ID, name, description and inactive flag. |
| Get\_Job\_Profiles | Retrieves data related to job profiles for the specified criteria (all if no criteria is specified), organized into different response groups. |
| Get\_Locations | Retrieves data related to a location for the specified criteria (all if no criteria is specified). |
| Get\_Organizations | Retrieves data related to an organization, incl. staffing configuration, structure, etc. |
| Get\_Supervisory\_Organization\_Assignment\_Restrictions | Retrieves the organization assignment default values and allowed values for supervisory organizations. |
| Get\_Worker\_Event\_History | Retrieves references to all events created through workflows associated with a worker based on the event type and data parameters. |
| Get\_Worker\_Profile | Retrieves a subset of data related to a worker and their employment/contract, personal info, as well as compensation. |
| Get\_Workers | Retrieves public and private information for specified workers. |

[#### Financial management](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4559961825513634241020392807_body)

- GET Payments
- GET PaymentTypesTable
- GET StopItem
- GET BusinessUnits
- GET CurrencyConversionRates
- GET CurrencyRateTypes
- GET CompanyOrganizations
- GET CostCenters
- GET ResourceCategories
- GET FinancialRevenueCategories

[#### Resource management](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4589732915728034241020435391_body)

- GET Suppliers
- GET PurchaseOrders
- GET PurchaseRequisitions
- GET PurchaseItems
- GET Receipts
- GET PurchaseOrderChangeOrders
- GET SpendCategoryHierarchies
- GET SupplierInvoiceAdjustments
- GET SupplierInvoices
- GET SupplierContracts

[#### Revenue management](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4589732913520034241020494868_body)

- GET Customers
- GET CustomerCategories
- GET CustomerDeposits
- GET CustomerGroups
- GET CustomerInvoiceAdjustments
- GET CustomerInvoices
- GET CustomerPayments
- GET CustomerRefunds
- GET RevenueCategories
- GET SalesItems
- GET SalesItemGroups

[#### Report](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm461340932420163424102055632_body)

- GET Report

[### Supported Workday filters](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm234618142742125_body)

When connecting your Workday instance to the Celonis Platform, the following filters are supported per table:

| Table | Supported filters |
| --- | --- |
| customerDeposits | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| customerPayments | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| formerWorkers | Updated\_From\_Moment, Update\_To\_Moment |
| jobProfiles | Updated\_From, Updated\_Through, Effective\_From, Effective\_Through |
| organizations | Updated\_From, Updated\_Through, Effective\_From, Effective\_Through |
| payments | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| purchaseOrders | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| receipts | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| requisitions | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| supplierContracts | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| supplierInvoiceAdjustments | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| supplierInvoices | Updated\_From\_{tableName}\_After, Updated\_From\_{tableName}\_Before |
| workers | Updated\_From, Updated\_Through, Effective\_From, Effective\_Through |

[## Workday extractor limitations and known issues](#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm2533523625283746_body)

This section explains the limitations and known issues for the Workday extractor:

- Data access for the Workday SOAP Extractor is restricted to the [supported API endpoints](connecting-to-workday.html#UUID-e4070823-9bd8-a0a2-18c1-a9f57863f84e_section-idm4559961821540834240997302343 "Supported API endpoints").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-zendesk

# Connecting to Zendesk (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Zendesk extractor integrates the Celonis Platform with your Zendesk instances, retrieving build and deployment data through the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-id235174833127182_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Zendesk authentication methods](#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-idm2533517483438672_body)

The Zendesk REST API uses basic authentication or OAuth2:

- **Basic authentication**: Provide a username and password.
- **OAuth2**: Provide a client ID and client secret. These require you to create an API token in your Zendesk account by clicking **Admin - Settings** and then enabling **Token Access**.

For both authentication methods, you must provide your Zendesk realm. This should be provided in the following format:

```
https://[companyName].zendesk.com
```

For OAuth authentications, use the following redirect URL in Zendesk configuration:

```
https://auth.redirect.celonis.cloud/zendesk_redirect
```

[### Further Zendesk information](#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-idm2533517483581600_body)

When connecting to Zendesk, note the following points:

- **Data access**: The Celonis Extractor performs read-only operations on your Zendesk data. No writing changes (like updates, deletions) will be performed at any time during the extraction process.
- **Source system impact**: The Celonis Extractor is bound to the API call limits applied by Zendesk, guarding the system from any performance issues. That means that each extraction is limited to 1,000 entries per table.
- **Security**: Transfer of the data from the Zendesk system to the target system is secured through HTTPS, which allows for an encrypted exchange of information.
- **Support REST API**: The default Zendesk extractor uses the Support REST API provided by Zendesk. For more information, see: [Zendesk - Support REST API.](https://developer.zendesk.com/api-reference/introduction/introduction/)

[## Configuring the Zendesk extractor](#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-idm2533517483303948_body)

This section describes the basic setup of configuring the Zendesk extractor. To configure the extractor:

**Note**

For configuration, the Zendesk extractor has specific authentication values based on the authentication method used. For more information, see [Zendesk authentication methods](connecting-to-zendesk.html#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-idm2533517483438672 "Zendesk authentication methods").

[## Zendesk extractor limitations and known issues](#UUID-8e177710-6a7f-943a-4ee8-e98639560724_section-idm2533523625719120_body)

This section explains the limitations and known issues for the Zendesk extractor:

- Extractions are limited to 10,000 records due to the Zendesk API [offset-based pagination limits](https://support.zendesk.com/hc/en-us/articles/5591904358938-New-limits-for-offset-based-pagination).

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

