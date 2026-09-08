# Data Integration: Connectors (Part 1)

## data-integration/connectors/connecting-to-a-database-using-custom-jdbc-driver

# Using a custom JDBC driver with the on-premise JDBC Extractor

You can connect to your database using a custom JDBC driver to support environments or database versions not covered by native Uplink connections. This requires using an Uplink connection with the on-premise JDBC Extractor and a custom JDBC driver supplied by you.

**Tip**

The instructions on this page are needed only if you are required to connect to the Celonis Platform using a custom JDBC driver. If you are using an Uplink connection that is natively supported (or a Direct connection), you do not need to use a custom JDBC driver.

Expand all

[## Before you begin](#UUID-78046e48-79c2-40f2-23c2-807934c07b06_section-id235456238879127_body)

To use a custom JDBC driver with the JDBC Extractor, you must meet the following prerequisites:

- Your environment must meet the JDBC Extractor requirements. For more information, see [Prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors") .
- You have downloaded the JDBC Extractor package. For more information, see [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors").
- You must have the appropriate JDBC driver file (`.jar`) for your specific database version available.

[## Adding your custom JDBC driver](#UUID-78046e48-79c2-40f2-23c2-807934c07b06_section-idm4597696061860834243090270675_body)

To enable the JDBC Extractor to communicate with your database, you must manually add your vendor-specific driver file to the extractor's file system.

To do so:

1. Navigate to your Celonis JDBC Extractor directory.
2. Create a directory named `drivers` (or alternatively any other name provided there is no period / full stop in the name).
3. Place your database's JDBC driver file (`.jar`) in the `drivers` directory.

After placing the driver in the directory, use the `-Dloader.path` argument in the JDBC Extractor startup command or service configuration file to load the driver from that specific location.

**Note**

If you named the directory you stored your database's JDBC driver file (`.jar`) in other than `drivers`, ensure your use it as the `-Dloader.path` argument value.

For example:

```
java -Dloader.path=drivers -Dspring.config.location=application-local.yml -jar connector-jdbc.jar
```

The next integration step is to start the JDBC Extractor. For instructions on starting the JDBC Extractor, see [Running JDBC extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor").

## Related topics

- [Using a custom JDBC driver](connecting-to-a-database-using-custom-jdbc-driver.html "Using a custom JDBC driver with the on-premise JDBC Extractor")
- [Running JDBC extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor")
- [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors")


---

## data-integration/connectors/connecting-to-amazon-athena

# Connecting to Amazon Athena (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Amazon Athena extractor allows you to transfer data from Amazon S3 to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-id23518488495301_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-amazon-athena.html#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Amazon Athena extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[### Only the default catalog is supported](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-id235186196767713_body)

By default, the extractor supports only the default AWS Glue Data Catalog. This means you can connect to databases registered in your account’s primary catalog, but not to alternate catalogs or federated data sources.

[## Configuring the Amazon Athena extractor](#UUID-d058faf6-5480-3653-b232-7822b42b18e5_section-id235184969371093_body)

This section describes the basic setup of configuring the Amazon Athena extractor. To configure the extractor:

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
   2. For **Database Type**, select **Amazon Athena**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Region**, provide the region of your cluster.
         - For **Port**, provide the port to connect to (Default is `443`).
         - For **S3 Output Location**, provide the Amazon S3 bucket path where query results should be stored. Use the format `s3://bucket-name/folder/`.
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-amazon-athena.html#UUID-d058faf6-5480-3653-b232-7822b42b18e5_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:awsathena://AwsRegion=<region>;S3OutputLocation=<s3-bucket-path>;Schema=<schema-name>;[WorkGroup=<workgroup-name>;][property1=value1;property2=value2;...]
           ```

           **Note**

           For more information on connecting to Amazon Athena with JDBC strings, see the [Amazon Athena documentation](https://docs.aws.amazon.com/athena/latest/ug/connect-with-jdbc.html).
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
7. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
8. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-amazon-redshift

# Connecting to Amazon Redshift (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Amazon Redshift extractor allows you to transfer data from Amazon Redshift into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-id235186092731675_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-amazon-redshift.html#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Amazon Redshift extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Amazon Redshift extractor](#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_section-id235186101284666_body)

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
   2. For **Database Type**, select **Amazon Redshift**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the endpoint address of your Amazon Redshift cluster or serverless workgroup. For example: `examplecluster.abc123xyz789.us-west-2.redshift.amazonaws.com`.

           **Note**

           Do not include the port number as part of the **Host** value.
         - For **Port**, provide the port to connect to (Default is `443`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-amazon-redshift.html#UUID-6031d509-51c4-ced5-58e0-0e83e88ba6c6_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:redshift://<host>:<port>/<database>[?property1=value1&property2=value2]
           ```

           **Note**

           For more information, see the [Amazon Redshift documentation](https://docs.aws.amazon.com/redshift/latest/mgmt/jdbc20-obtain-url.html).
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, provide the username and password of the database user for this connection.

      **Note**

      Ensure this database user has sufficient permissions to access the data to be extracted.
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

## data-integration/connectors/connecting-to-amazon-s3

# Connecting to Amazon S3 (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Amazon S3 extractor lets you bring data stored in Amazon S3 into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170596152965_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Usage considerations](#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170598817129_body)

When connecting to Amazon S3, note the following points:

- **Table schema**: There are two ways to get your files in the Amazon S3 bucket translated into a table structure:

  - Add specific files to an extraction. In this case, each file will result in a corresponding table with the table name matching the file name.
  - Add a complete folder to an extraction. In this case, all files in the folder are combined into one table, with the table name matching the folder name. This method requires all files in the folder to conform to the same schema and file type.
- **Filtering and delta loads**: Filtering is not supported for S3 extraction. Therefore, there are no delta filters. You can execute your extraction as full loads or as delta loads. For full loads, the extraction will replace existing tables. For delta loads, it will append the records to the existing tables.
- **Data access:** The Celonis Extractor performs read-only operations on your S3 bucket. No writing changes (such as updates and deletions) will be performed during the extraction process.
- **Security**: Transfer of the data from S3 to the target system is secured through HTTPS, which allows for an encrypted exchange of information.
- **Supported file types**: CSV, JSON, and Parquet.

[### Amazon S3 authentication methods](#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170597295642_body)

The Amazon S3 REST API requires you to provide an access key ID and a secret access key to connect to the Celonis Platform.

You can create both access key ID and the secret access key in the **My Security Credentials** of your Amazon S3 instance. When creating these assets, you should assign the following permissions:

- s3:GetBucketAcl
- s3:GetObject
- s3:ListBucket
- ACL: bucket-owner-full-control (if writing files to the S3 bucket from an external location)

A JSON example of these permissions is:

```
{
    "Version": "2023-11-30",
    "Statement": [
        {
            "Sid": "Celonis S3 Extractor",
            "Effect": "Allow",
            "Principal": {
                "AWS": "<THE ARN OF YOUR IAM USER>"
            },
            "Action": [
                "s3:GetBucketAcl",
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::<YOUR BUCKET>",
                "arn:aws:s3:::<YOUR BUCKET>/*"
            ]
        }
    ]
}
```

[### Available Amazon S3 endpoints](#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170627137429_body)

For a full list of available endpoints for Amazon S3, see: [Amazon S3 API Reference](https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/s3/AmazonS3Client.html).

[## Configuring the Amazon S3 extractor](#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170607540056_body)

This section describes the basic setup of configuring the Amazon S3 extractor. To configure the extractor:

**Note**

For configuration, the Amazon S3 extractor has specific requirements for the access key. For more information, see [Amazon S3 authentication methods](connecting-to-amazon-s3.html#UUID-5a135393-598e-39d2-1dea-78f76b587bfd_section-id235170597295642 "Amazon S3 authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-apache-hive

# Connecting to Apache Hive

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Hive extractor allows you to transfer data from Apache Hive data warehouse into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm2533519871642430_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-apache-hive.html#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Apache Hive extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Apache Hive extractor](#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_section-idm2533519871905128_body)

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
   2. For **Database Type**, select **Apache Hive**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `10000`).
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-apache-hive.html#UUID-b2e79729-c84e-5135-3e01-24dad806ed9f_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:hive2://<host>:<port>/<database>;property1=value1;property2=value2...
           ```

           **Note**

           For more information, see the [Apache Hive documentation](https://cwiki.apache.org/confluence/display/Hive/HiveServer2+Clients#HiveServer2Clients-JDBC).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, enter the username and password of the database user for this connection.

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

## data-integration/connectors/connecting-to-applications

# Connecting to applications

With the Celonis Platform, you can connect to a number of cloud-based applications using native extractors. Using the Celonis native extractors to create a data connection in your data pool, you can efficiently connect to the system, configure and execute your extraction and transformation tasks, and then model the selected data.

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The below matrices highlight the available features for our commonly supported cloud based applications.

## Application extractor feature matrix

When viewing the below matrices, there are two status indicators:

| Status Indicator | Status Description |
| --- | --- |
|  | This feature is supported and can be used with the extractor builder. |
|  | This feature is not currently supported and can't be used with the extractor builder. |

### Connection settings

The following connection setting features are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pseudonmyzation algorithms | The applied pseudonymization algorithms can be selected in the advanced settings when configuring the connection. |  |  |  |  |  |  |  |  |  |
| Parallelization of requests | The max. number of parallel requests the extractor makes can be customized in the advanced settings when configuring the extractor. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pseudonmyzation algorithms | The applied pseudonymization algorithms can be selected in the advanced settings when configuring the connection. |  |  |  |  |  |  |  |  |  |
| Parallelization of requests | The max. number of parallel requests the extractor makes can be customized in the advanced settings when configuring the extractor. |  |  |  |  |  |  |  |  |  |

### Table configuration

The following table configuration features are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rename target table | The name of the table which is created in the Celonis Platform can be customized as part of the table configuration. |  |  |  |  |  |  |  |  |  |
| Table joins | It is possible to join the extracted table on another table during the extraction. |  |  |  |  |  |  |  |  |  |
| Filtering | Filters can be applied on table level based on the supported filtering operators. For a full overview, see: [Supported filtering operators](connecting-to-applications.html#UUID-98e21bbd-3a40-e99e-4331-2a10adf7ddd9_section-idm4599006377859234215065585767 "Supported filtering operators"). |  |  |  |  |  |  |  |  |  |
| Filtering on dependent tables | Filters can be applied for dependent tables. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rename target table | The name of the table which is created in the Celonis Platform can be customized as part of the table configuration. |  |  |  |  |  |  |  |  |  |
| Table joins | It is possible to join the extracted table on another table during the extraction. |  |  |  |  |  |  |  |  |  |
| Filtering | Filters can be applied on table level based on the supported filtering operators. For a full overview, see: [Supported filtering operators](connecting-to-applications.html#UUID-98e21bbd-3a40-e99e-4331-2a10adf7ddd9_section-idm4599006377859234215065585767 "Supported filtering operators"). |  |  |  |  |  |  |  |  |  |
| Filtering on dependent tables | Filters can be applied for dependent tables. |  |  |  |  |  |  |  |  |  |

### Supported filtering operators

The following filtering operators are supported based on the source system you're connecting to:

Filter

- Support filtering using
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Support filtering using | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| = |  |  |  |  |  |  |  |  |  |
| <; > |  |  |  |  |  |  |  |  |  |
| >==; <= |  |  |  |  |  |  |  |  |  |
| IN |  |  |  |  |  |  |  |  |  |
| NOT IN |  |  |  |  |  |  |  |  |  |

| Support filtering using | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| = |  |  |  |  |  |  |  |  |  |
| <; > |  |  |  |  |  |  |  |  |  |
| >==; <= |  |  |  |  |  |  |  |  |  |
| IN |  |  |  |  |  |  |  |  |  |
| NOT IN |  |  |  |  |  |  |  |  |  |

### Column configuration

The following column configuration features are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Column selection | The subset of columns that should be extracted can be selected. |  |  |  |  |  |  |  |  |  |
| Column pseudonymization | The columns that should be pseudonymized with the chosen algorithm can be selected. |  |  |  |  |  |  |  |  |  |
| Customize primary key | Addtitional columns can be added to the default primary key definition. |  |  |  |  |  |  |  |  |  |
| Casting of data types | The data type with which the extracted columns are inserted to the Celonis Platform can be customized. |  |  |  |  |  |  |  |  |  |
| String length configuration | Allows the modification of the default length (80 characters) of String-type columns. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Column selection | The subset of columns that should be extracted can be selected. |  |  |  |  |  |  |  |  |  |
| Column pseudonymization | The columns that should be pseudonymized with the chosen algorithm can be selected. |  |  |  |  |  |  |  |  |  |
| Customize primary key | Addtitional columns can be added to the default primary key definition. |  |  |  |  |  |  |  |  |  |
| Casting of data types | The data type with which the extracted columns are inserted to the Celonis Platform can be customized. |  |  |  |  |  |  |  |  |  |
| String length configuration | Allows the modification of the default length (80 characters) of String-type columns. |  |  |  |  |  |  |  |  |  |

### Extractor execution configuration

The following extractor execution configuration options are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Batch size configuration | Allows specifiying the batch size (in records) for one extraction request. |  |  |  |  |  |  |  |  |  |
| Split job by days | Allows specifying a time range in days by which the extraction jobs are split. |  |  |  |  |  |  |  |  |  |
| Rolling page size | Allows specifying the buffer how many records should be rolled over from the previous request when doing pagination. |  |  |  |  |  |  |  |  |  |
| Partitioning | Allows the partitioning of an extraction into multiple batches based on applied filters. |  |  |  |  |  |  |  |  |  |
| Extract display value columns | Allows the retrieval of so-called display values for specific columns in ServiceNow. The display values are added as additional columns in the extraction. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Batch size configuration | Allows specifiying the batch size (in records) for one extraction request. |  |  |  |  |  |  |  |  |  |
| Split job by days | Allows specifying a time range in days by which the extraction jobs are split. |  |  |  |  |  |  |  |  |  |
| Rolling page size | Allows specifying the buffer how many records should be rolled over from the previous request when doing pagination. |  |  |  |  |  |  |  |  |  |
| Partitioning | Allows the partitioning of an extraction into multiple batches based on applied filters. |  |  |  |  |  |  |  |  |  |
| Extract display value columns | Allows the retrieval of so-called display values for specific columns in ServiceNow. The display values are added as additional columns in the extraction. |  |  |  |  |  |  |  |  |  |

### Metadata resolution

The following metadata resolution features are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dynamic resolution of tables and columns. | The available tables and fields are resolved dynamically based on the information the extractor can retrieve. |  |  |  | Applies to master data API only. |  |  |  |  |  |
| Static definition of tables. | The extractor stores a static list of tables which are always available for extraction. |  |  |  | Applies to all API besides master data. |  |  |  |  |  |
| Static definition of columns. | The extractor stores a static list of columns which are always avialable for extraction. |  |  |  | Applies to all API besides master data. |  |  |  |  |  |
| Customize metadata. | Allows the customization of the metadata via a custom JSON configuration to add tables and columns to the existing static definition. |  |  |  |  |  |  |  |  |  |
| Clear cache function. | Provides the option to manually clear the cache of metadata (tables and columns) to refreh it with the next request. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dynamic resolution of tables and columns. | The available tables and fields are resolved dynamically based on the information the extractor can retrieve. |  |  |  | Applies to master data API only. |  |  |  |  |  |
| Static definition of tables. | The extractor stores a static list of tables which are always available for extraction. |  |  |  | Applies to all API besides master data. |  |  |  |  |  |
| Static definition of columns. | The extractor stores a static list of columns which are always avialable for extraction. |  |  |  | Applies to all API besides master data. |  |  |  |  |  |
| Customize metadata. | Allows the customization of the metadata via a custom JSON configuration to add tables and columns to the existing static definition. |  |  |  |  |  |  |  |  |  |
| Clear cache function. | Provides the option to manually clear the cache of metadata (tables and columns) to refreh it with the next request. |  |  |  |  |  |  |  |  |  |

### Data processing and modification

The following data processing and modification features are supported based on the source system you're connecting to:

Filter

- Feature
- Feature Description
- Salesforce
- ServiceNow
- SAP Ariba - Asynchronous API
- SAP Ariba - Synchronous API
- Coupa
- Oracle Fusion Cloud BICC
- Oracle Fusion Cloud REST
- Extractor Builder REST
- Extractor Builder OData

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Delta load as replace merge. | Provides an option to delete records of nested tables that are not relevant to the parent table anymore during the delta load. |  |  |  |  |  |  |  |  |  |
| Data return format. | Allows to specify the format of the returned data and therefore the amount specifically for Coupa.-  - All: All data is returned in full depth. - Shallow: Returns all data of the queried object including one-deep associations. - Limited: Limits the returned data of the associations to IDs only fo the one-deep associations. |  |  |  |  |  |  |  |  |  |
| Duplicate removal. | Duplicate records retrieved within the extraction are removed based on the defined primary key |  |  |  |  |  |  |  |  |  |
| Primary key propagation to nested tables of next level. | The primary key columns of a parent table are automatically propagated to its child tables of the next level. |  |  |  |  |  |  |  |  |  |
| Primary key propagation to nested tables of all levels. | The primary key columns of a parent table are automatically propagated to its child tables of all levels to ensure the tables can be joined correctly. |  |  |  |  |  |  |  |  |  |
| Ignore records with warnings. | Skips the records for which warnings are returned in the SAP Ariba extractions. |  |  |  |  |  |  |  |  |  |
| Debug. | Allows the enablement of a time-limited debug mode in the extraction settings to expose additional log messages. |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Salesforce](connecting-to-salesforce.html "Connecting to Salesforce (extractor)") | [ServiceNow](connecting-to-servicenow.html "Connecting to ServiceNow (extractor)") | [SAP Ariba - Asynchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [SAP Ariba - Synchronous API](connecting-to-sap-ariba.html "Connecting to SAP Ariba (extractor)") | [Coupa](connecting-to-coupa.html "Connecting to Coupa (extractor)") | [Oracle Fusion Cloud BICC](connecting-to-oracle-fusion-cloud-bicc.html "Connecting to Oracle Fusion Cloud BICC (extractor)") | [Oracle Fusion Cloud REST](connecting-to-oracle-fusion-cloud-rest.html "Connecting to Oracle Fusion Cloud REST (extractor)") | [Extractor Builder REST](extractor-builder.html "Using the Extractor Builder to connect to your source system") | [Extractor Builder OData](extractor-builder.html "Using the Extractor Builder to connect to your source system") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Delta load as replace merge. | Provides an option to delete records of nested tables that are not relevant to the parent table anymore during the delta load. |  |  |  |  |  |  |  |  |  |
| Data return format. | Allows to specify the format of the returned data and therefore the amount specifically for Coupa.-  - All: All data is returned in full depth. - Shallow: Returns all data of the queried object including one-deep associations. - Limited: Limits the returned data of the associations to IDs only fo the one-deep associations. |  |  |  |  |  |  |  |  |  |
| Duplicate removal. | Duplicate records retrieved within the extraction are removed based on the defined primary key |  |  |  |  |  |  |  |  |  |
| Primary key propagation to nested tables of next level. | The primary key columns of a parent table are automatically propagated to its child tables of the next level. |  |  |  |  |  |  |  |  |  |
| Primary key propagation to nested tables of all levels. | The primary key columns of a parent table are automatically propagated to its child tables of all levels to ensure the tables can be joined correctly. |  |  |  |  |  |  |  |  |  |
| Ignore records with warnings. | Skips the records for which warnings are returned in the SAP Ariba extractions. |  |  |  |  |  |  |  |  |  |
| Debug. | Allows the enablement of a time-limited debug mode in the extraction settings to expose additional log messages. |  |  |  |  |  |  |  |  |  |


---

## data-integration/connectors/connecting-to-azure-sql

# Connecting to Azure SQL (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Azure SQL extractor allows you to transfer data from Microsoft Azure SQL databases or Azure SQL managed instances to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm2533519488571764_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-azure-sql.html#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication methods](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-id235194886213205_body)

This extractor supports the authentication methods described in the following sections.

[#### Authentication method – username and password](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Azure SQL extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[#### Authentication method – Microsoft Entra ID](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-af05d24f-0324-f4fc-1241-e8a52e31411d_body)

The Azure SQL supports authentication through **Microsoft Entra ID** (formerly Azure Active Directory). This method uses an OAuth-based identity registered in Entra ID to securely authenticate Azure SQL connections.

Filter

- Extractor value
- Microsoft Entra ID value
- Description

Table 5. Celonis extractor values for Microsoft Entra ID authentication

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Azure SQL uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Azure SQL configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Azure SQL uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Azure SQL configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |




**Note**

Before setting up the connection in Celonis, ensure the registered app in Microsoft Entra ID has the required API permissions for the resource you want to access.

For your Azure SQL configuration, ensure the correct values for **Client ID**, **Client Secret**, and **Tenant ID** (as applicable).

[## Configuring the Azure SQL extractor](#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_section-idm2533519488905618_body)

This section describes the basic setup of configuring the Azure SQL extractor. To configure the extractor:

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
   2. For **Database Type**, select **Azure SQL**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1433`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-azure-sql.html#UUID-9ebe63ee-73d2-c662-3b5e-0788fda121b4_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sqlserver://<server>.database.windows.net:<port>;database=<database>;property1=value1;property2=value2;...
           ```

           **Note**

           For more information on connecting to Azure SQL with JDBC strings, see the [Azure SQL documentation](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql).
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

## data-integration/connectors/connecting-to-azure-synapse

# Connecting to Azure Synapse (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Azure Synapse extractor allows you to transfer data from Azure Synapse Analytics to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm2533519488571764_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-azure-synapse.html#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication methods](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-id235194886213205_body)

This extractor supports the authentication methods described in the following sections.

[#### Authentication method – username and password](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Azure Synapse extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[#### Authentication method – Microsoft Entra ID](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-af05d24f-0324-f4fc-1241-e8a52e31411d_body)

The Azure Synapse supports authentication through **Microsoft Entra ID** (formerly Azure Active Directory). This method uses an OAuth-based identity registered in Entra ID to securely authenticate Azure Synapse connections.

Filter

- Extractor value
- Microsoft Entra ID value
- Description

Table 6. Celonis extractor values for Microsoft Entra ID authentication

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Azure Synapse uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Azure Synapse configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Azure Synapse uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Azure Synapse configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |




**Note**

Before setting up the connection in Celonis, ensure the registered app in Microsoft Entra ID has the required API permissions for the resource you want to access.

For your Azure Synapse configuration, ensure the correct values for **Client ID**, **Client Secret**, and **Tenant ID** (as applicable).

[## Configuring the Azure Synapse extractor](#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-idm2533519488905618_body)

This section describes the basic setup of configuring the Azure Synapse extractor. To configure the extractor:

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
   2. For **Database Type**, select **Azure Synapse**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `1433`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-azure-synapse.html#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:sqlserver://<your-synapse-server>.sql.azuresynapse.net:<port>;database=<database>;property1=value1;property2=value2;..
           ```

           **Note**

           For more information on connecting to Azure Synapse with JDBC strings, see the [Azure Synapse documentation](https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, select the type of authentication to use for this connection. For more information, see [Authentication methods](connecting-to-azure-synapse.html#UUID-c48b41b1-0bc2-7d0c-d2a7-cea85cb7cf5b_section-id235194886213205 "Authentication methods").

      **Note**

      Ensure the credentials used have sufficient permissions to access the data to be extracted.
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

## data-integration/connectors/connecting-to-bamboo

# Connecting to Bamboo (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Bamboo extractor integrates the Celonis Platform with your Atlassian Bamboo instances, retrieving build and deployment data through the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-b3d720d8-526d-af61-9b22-556be49e6556_section-id235170596152965_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Bamboo authentication methods](#UUID-b3d720d8-526d-af61-9b22-556be49e6556_section-id235170732047355_body)

The Bamboo REST API uses basic authentication. To connect to your Bamboo instance, you need to provide a username and password.

[### Available Bamboo endpoints](#UUID-b3d720d8-526d-af61-9b22-556be49e6556_section-id235170627137429_body)

The default Bamboo extractor allows you to call these endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Build plan | Retrieve data about build plans. |
| GET | Build branch | Retrieve data about build branches. |
| GET | Build result | Retrieve data about build results. |
| GET | Deployment project | Retrieve data about deployment projects. |
| GET | Deployment environment | Retrieve data about deployment environments. |
| GET | Deployment result | Retrieve data about deployment results. |
| GET | Redeployment version | Retrieve data about redeployment versions. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Build plan | Retrieve data about build plans. |
| GET | Build branch | Retrieve data about build branches. |
| GET | Build result | Retrieve data about build results. |
| GET | Deployment project | Retrieve data about deployment projects. |
| GET | Deployment environment | Retrieve data about deployment environments. |
| GET | Deployment result | Retrieve data about deployment results. |
| GET | Redeployment version | Retrieve data about redeployment versions. |

[### Further information for Bamboo](#UUID-b3d720d8-526d-af61-9b22-556be49e6556_section-id235170993289782_body)

For further information about Bamboo and their REST APIs, see the [Atlassian Bamboo REST API documentation](https://developer.atlassian.com/server/bamboo/rest-apis/).

[## Configuring the Bamboo extractor](#UUID-b3d720d8-526d-af61-9b22-556be49e6556_section-id235170607540056_body)

This section describes the basic setup of configuring the Bamboo extractor. To configure the extractor:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-bitbucket

# Connecting to Bitbucket (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Bitbucket extractor integrates the Celonis Platform with your Atlassian Bitbucket Cloud instance to retrieve repository data through the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-0a687cfa-d459-dd35-efee-1de06adf0e63_section-id235171005224725_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Bitbucket authentication methods](#UUID-0a687cfa-d459-dd35-efee-1de06adf0e63_section-id235171005566311_body)

The Bitbucket Cloud REST API uses basic authentication or OAuth2:

- **Basic authentication**: Provide a username and password.
- **OAuth2**: Provide a client ID and client secret.

For both authentication methods you must also supply the project and repository name as parameters.

[### Available Bitbucket Cloud endpoints](#UUID-0a687cfa-d459-dd35-efee-1de06adf0e63_section-id235171006603452_body)

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Branches | Retrieve data about branches. |
| GET | Commits | Retrieve data about commits. |
| GET | Hooks | Retrieve data about hooks. |
| GET | Pull Requests  - Pull Request Activity - Pull Request Commits | Retrieve data about pull requests. |
| GET | Tags | Retrieve data about tags. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Branches | Retrieve data about branches. |
| GET | Commits | Retrieve data about commits. |
| GET | Hooks | Retrieve data about hooks. |
| GET | Pull Requests  - Pull Request Activity - Pull Request Commits | Retrieve data about pull requests. |
| GET | Tags | Retrieve data about tags. |

[### Further Bitbucket Cloud information](#UUID-0a687cfa-d459-dd35-efee-1de06adf0e63_section-id235171020234728_body)

For more information about Bitbucket Cloud, see: [Bitbucket Cloud Documentation - REST APIs](https://developer.atlassian.com/cloud/bitbucket/rest/intro/).

[## Configuring the Bitbucket extractor](#UUID-0a687cfa-d459-dd35-efee-1de06adf0e63_section-id235171020883161_body)

This section describes the basic setup of configuring the Bitbucket extractor. To configure the extractor:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-celonis-platform-adoption

# Connecting to Celonis Platform Adoption (extractor)

The Celonis Platform Adoption (CPA) extractor allows you to extract usage data from your Celonis Platform team, including usage logs, login histories, and user information. This extractor uses OAuth2 authentication, requiring you to set up an OAuth client in your Celonis Platform team. You can find a step-by-step guide to setting up an OAuth client in this topic.

If you previously configured this extractor using App Key authentication, we recommend transitioning to OAuth2. For more information, see: [Transitioning from AppKey to OAuth2 authentication (Previous integrations)](connecting-to-celonis-platform-adoption.html#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234874047197105 "Transitioning from AppKey to OAuth2 authentication (Previous integrations)")

## Before you begin

Before configuring the CPA extractor, you need to complete the following prerequisites:

Expand all

[### Enabling Login History and Studio tracker](#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234875644889695_body)

To track user login history and Studio usage, you first need to enable both services:

1. Select **Admin & Settings > Platform Adoption**.
2. Enable **Login History**.
3. Select **Studio > Set up tracking service**.

   |  |
   | --- |
   |  |
4. Enable **Studio**.
5. Select **Close**.

Your Celonis Platform team login history and Studio usage statistics are now recorded.

[### Configuring an OAuth client and assigning permissions](#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234875644937832_body)

Before configuring the CPA extractor, you need to configure an OAuth client in your Celonis Platform team. This OAuth client can then be assigned permissions to access the Celonis public APIs required by the CPA extractor.

To create an OAuth client and assign it permissions:

1. Select **Admin & Settings > Applications**.
2. Select **Add New Application > OAuth Client.**
3. Configure the client using the following options:

   - **Name**: An internal reference for the client.

     **Note**

     This application name will be the reference later when assigning permissions.
   - **Description**: An optional and internal description.
   - **Grant Type**: By default, **Client Credentials** is selected and cannot be changed.
   - **Authentication Methods**: Select **Client Secret Basic**.
4. Select **Define Scopes**, and then select the following scopes:

   - platform-adoption.tracking-events:read
   - team.user-group-info:read
   - team.login-history:read
5. Select **Create**. The OAuth client is created, and the Client Credentials window opens.
6. In the **Client Credentials**, copy the **ID** and **Secret** values to a secure location.

   **Important**

   You can only view the client **ID** and **Secret** once. We recommend you save this information for future use. In case you fail to save or lose the client **ID** and **Secret**, you must generate a new one.

You must now assign the required permissions:

1. Navigate to **Admin & Settings > Permissions**.
2. In the **Services** section, select **Team > Edit**.
3. In the left column, find the name of the application you just created, and assign it the following permissions:

   - Use Login History API
   - Use Studio Adoption API
   - Use User Group Info API
4. Select **Save**.

You can now proceed to [Configuring the Celonis Platform Adoption extractor](connecting-to-celonis-platform-adoption.html#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234874047156698 "Configuring the Celonis Platform Adoption extractor").

[### Transitioning from AppKey to OAuth2 authentication (Previous integrations)](#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234874047197105_body)

If you have previously configured this extractor using AppKey authentication, we recommend transitioning to OAuth2 authentication.

To transition to OAuth 2:

**Important**

You can only view the client **ID** and **Secret** once. We recommend you save this information for future use. In case you fail to save or lose the client **ID** and **Secret**, you must generate a new one.

1. Create an OAuth client in your Celonis Platform team, providing you with a client ID and client secret. See: [Configuring an OAuth client and assigning permissions](connecting-to-celonis-platform-adoption.html#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234875644937832 "Configuring an OAuth client and assigning permissions").
2. Select **Data Integration - Data Connections** and open your existing Celonis Platform Adoption connection.
3. Select **OAuth2** (client credentials) and enter your **client ID** and **client secret** from step 1.
4. Select **Test Connection**, and correct any issues highlighted.
5. Select **Save**.

Your Celonis Platform Adoption extractor now uses OAuth 2 authentication and continues to run as previously configured.

[## Configuring the Celonis Platform Adoption extractor](#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234874047156698_body)

To configure the extractor:

1. In the Celonis Platform left navigation, select **Data > Data Integration**.
2. On the **Data Pools** screen, select the data pool where you want to integrate the extractor. This opens the **Data Integration** window.

   **Note**

   If you have **not** yet configured a data pool for this data set, see [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools").
3. In the **Input** section, select the **Connect to Data Source** tile. This opens the **Add Data Connection** window.

   **Note**

   If this is not the data pool's first connection, the **Data Connections** window opens below. Select **+ Add Data Connection** to add a new connection.
4. In the **Add Data Connection** window, select **Connect to Data Source**. This opens the in-tool connection catalog.
5. In the connection catalog, select the **Celonis Platform Adoption** extractor. This opens the configuration window.
6. In the configuration window, provide the requested data for each field:

   - **Name**: An internal reference for this data connection.
   - **API URL**: Use your Celonis Platform team URL in the following format. Don't include the forward slash (/) at the end:

     ```
     https://(TEAM).(REGION).celonis.cloud
     ```
   - **AppKey**: Leave this field blank.
   - **Client ID**: Enter the client ID provided when [configuring your OAuth client](connecting-to-celonis-platform-adoption.html#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234875644937832 "Configuring an OAuth client and assigning permissions").
   - **Client Secret**: Enter the client secret provided when [configuring your OAuth client](connecting-to-celonis-platform-adoption.html#UUID-9fa00629-ab4a-339d-bd03-238b0848712b_section-idm234875644937832 "Configuring an OAuth client and assigning permissions").
7. (Optional) Toggle the **Advanced settings** option to open the advanced configuration options. Read through each option and update as needed.
8. Select the **Test Connection** button to confirm the extractor can connect to the host system. If the test fails, adjust the data in the configuration fields as needed.
9. Once the test connection passes, select the **Save** button to continue. This returns you to the **Data Integration** window.


---

## data-integration/connectors/connecting-to-cloudera-impala

# Connecting to Cloudera Impala

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Cloudera Impala extractor allows you to transfer data from your Cloudera Impala environment to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm2533520015518304_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-cloudera-impala.html#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Setting up the Cloudera Impala JDBC extractor (Uplink connection only)](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm4590158046139234242736735005_body)

The following steps describe how to download, configure, and run the Cloudera Impala JDBC extractor to connect your Cloudera Impala environment to the Celonis Platform.

1. Download and install the Cloudera Impala JDBC driver.

   1. Download the latest Impala JDBC driver from the Cloudera website:

      [Cloudera – Impala JDBC Connector](https://www.cloudera.com/downloads/connectors/impala/jdbc)
   2. Extract the downloaded file and follow the installation guidance in the `docs` folder.
2. Download and extract the Celonis JDBC extractor.

   1. Open your Celonis Platform and go to **Admin > Settings > Download Portal**.
   2. Download the latest **JDBC (database) Extractor** package, and extract the ZIP file locally.
3. Configure the `application-local.yml` file.

   1. In the extracted Celonis JDBC extractor folder, open `application-local.yml`.
   2. Update the following fields with your Cloudera and Celonis information:

      - **client-id**: The client ID from your Cloudera account.
      - **client-secret**: The client secret from your Cloudera account.
      - **url**: Replace `[team]` and `[eu-1]` with your Celonis team ID and realm (visible in your Celonis URL after login).
4. On the host machine, create the `jar` directory and start the extractor.

   1. Create a directory named `jar`, and move the Impala JDBC driver (`.jar`) into it.
   2. From the extractor directory, run the following command:

      ```
      java -Dloader.path=jar -Dspring.config.location=application-local.yml -jar connector-jdbc.jar
      ```
   3. This starts the Celonis JDBC extractor using the Cloudera Impala connector.

[### Authentication method – username and password](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Cloudera Impala extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Cloudera Impala extractor](#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_section-idm2533520017033342_body)

This section describes the basic setup of configuring the Cloudera Impala extractor. To configure the extractor:

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
   2. For **Database Type**, select **Cloudera Impala**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      **Note**

      For uplink connections with this extractor, you must select **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `21050`).
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-cloudera-impala.html#UUID-34d7857a-cb55-9a2f-cc32-2adb10430956_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:impala://<host>:<port>/<database>;property1=value1;property2=value2...
           ```

           **Note**

           For more information, see the [Cloudera Impala > Connector Documentation](https://cwiki.apache.org/confluence/display/Hive/HiveServer2+Clients#HiveServer2Clients-JDBC).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, enter the username and password of the database user for this connection.

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

## data-integration/connectors/connecting-to-conexiom

# Connecting to Conexiom (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Conexiom extractor integrates the Celonis Platform with Conexiom’s order automation platform to retrieve alerts, documents, buyers, and related data via the REST API, which can then be used for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170596152965_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Conexiom authentication methods](#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170598817129_body)

The Conexiom REST API uses the OAuth 2 authentication method. To establish a connection to Conexiom, you must provide the following information:

- **API URL**
- **HubCo ID**
- OAuth2 fields: **Username**, **Password**, **Client ID**, and **Client Secret**.

[### Available Conexiom endpoints](#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170597295642_body)

The default Conexiom extractor allows you to call these endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Alerts | List of all Alerts for the given HubCo. |
| GET | Alert per Document | Information about one specific Alert per Alert ID.  **Depends on endpoint:** Alerts |
| GET | SpokeCos per HubCo | List of all SpokeCos for the given HubCo.  **Request parameter**: lastModifiedFromDate (for Delta Filter) |
| GET | Documents per SpokeCo | List of all Documents for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo  **Request parameter**: ProcessedOnFromDate (for Delta Filter) |
| GET | Document Data | Information about one specific Document per Document ID.  **Depends on endpoint**: Documents per SpokeCo |
| GET | Filelist | List of all files for the given Document ID.  **Depends on endpoint**: Documents per SpokeCo |
| GET | Buyers | List of all buyers for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |
| GET | Addresses | List of all addresses for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |
| GET | SpokeCos | Information about one specific SpokeCo per SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Alerts | List of all Alerts for the given HubCo. |
| GET | Alert per Document | Information about one specific Alert per Alert ID.  **Depends on endpoint:** Alerts |
| GET | SpokeCos per HubCo | List of all SpokeCos for the given HubCo.  **Request parameter**: lastModifiedFromDate (for Delta Filter) |
| GET | Documents per SpokeCo | List of all Documents for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo  **Request parameter**: ProcessedOnFromDate (for Delta Filter) |
| GET | Document Data | Information about one specific Document per Document ID.  **Depends on endpoint**: Documents per SpokeCo |
| GET | Filelist | List of all files for the given Document ID.  **Depends on endpoint**: Documents per SpokeCo |
| GET | Buyers | List of all buyers for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |
| GET | Addresses | List of all addresses for the given SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |
| GET | SpokeCos | Information about one specific SpokeCo per SpokeCo ID.  **Depends on endpoint**: SpokeCos per HubCo |

[### Further Conexiom information](#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170627137429_body)

For further information about Conexiom, see: [Conexiom Knowledge Base](https://help.conexiom.com/knowledge-base).

[## Configuring the Conexiom extractor](#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170607540056_body)

This section describes the basic setup of configuring the Conexiom extractor. To configure the extractor:

**Note**

For configuration, the Conexiom extractor has required OAuth2 related fields. For more information, see [Conexiom authentication methods](connecting-to-conexiom.html#UUID-eb2e5b25-f84e-11ee-123a-612d738037f8_section-id235170598817129 "Conexiom authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-confluence

# Connecting to Confluence (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Confluence extractor integrates with Atlassian Confluence to extract audit logs, content, spaces, and groups via REST API for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-27626c4a-68ba-0b7e-5397-6b166ae78167_section-id235172524805091_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Confluence authentication methods](#UUID-27626c4a-68ba-0b7e-5397-6b166ae78167_section-id235172525156087_body)

The Confluence Cloud REST API uses basic authentication or OAuth2:

- **Basic authentication**: Provide a username and password.
- **OAuth2**: Provide a client ID and client secret.

For both authentication methods you must also supply the project and repository name as parameters.

[### Available Confluence endpoints](#UUID-27626c4a-68ba-0b7e-5397-6b166ae78167_section-id235172607035744_body)

The default Confluence extractor allows you to call these Cloud API endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Audit records | Retrieve data about audit records. |
| GET | Audit retention period | Retrieve data about audit retention periods. |
| GET | Blueprint templates | Retrieve data about blueprint templates. |
| GET | Content  - Content history - Content attachments - Content children - Content descendents - Content comments - Content labels - Content properties - Content restrictions - Content versions | Retrieve data about content. |
| GET | Content templates | Retrieve data about content templates. |
| GET | Groups  - Group members | Retrieve data about groups. |
| GET | Themes | Retrieve data about themes. |
| GET | Spaces  - Space content | Retrieve data about spaces. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Audit records | Retrieve data about audit records. |
| GET | Audit retention period | Retrieve data about audit retention periods. |
| GET | Blueprint templates | Retrieve data about blueprint templates. |
| GET | Content  - Content history - Content attachments - Content children - Content descendents - Content comments - Content labels - Content properties - Content restrictions - Content versions | Retrieve data about content. |
| GET | Content templates | Retrieve data about content templates. |
| GET | Groups  - Group members | Retrieve data about groups. |
| GET | Themes | Retrieve data about themes. |
| GET | Spaces  - Space content | Retrieve data about spaces. |

[#### Further Confluence information](#UUID-27626c4a-68ba-0b7e-5397-6b166ae78167_section-id235172607793051_body)

For further information about Confluence Cloud's REST API, see: [Confluence Cloud - API Documentation](https://developer.atlassian.com/cloud/confluence/rest/intro/).

[## Configuring the Confluence extractor](#UUID-27626c4a-68ba-0b7e-5397-6b166ae78167_section-id235172604850496_body)

This section describes the basic setup of configuring the Confluence extractor. To configure the extractor:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-coupa

# Connecting to Coupa (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Coupa extractor lets you bring data from your Coupa tenants into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Note**

Celonis also offers a Coupa cloud extractor template or a process connector template for specific accounts payable and purchase-to-pay processes. For more information about using the process connector template to integrate your Coupa accounts payable and purchase-to-pay processes, see: [Using process connector templates](process-connector-installation.html "Using process connector templates").

Expand all

[## Before you begin](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm4564028732833634220401788566_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Coupa authentication methods](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm2533520203121346_body)

Coupa uses the OAuth 2.0 authentication method, meaning that you must create an OAuth client and have access to the client ID, client secret, and OIDC scope. You can create OAuth credentials by navigating to your Coupa instance OAuth page:

```
https://<yourinstance>.coupahost.com/oauth2/clients
```

**Tip**

For more information, see: [Coupa Compass Documentation - OAuth 2.0 Transition Guide](https://compass.coupa.com/en-us/products/product-documentation/integration-technical-documentation/the-coupa-core-api/oauth-2.0-and-oidc).

For the extractor configuration, you will need your Coupa OAuth **client ID**, **client secret**, and **OICD scopes**.

[### Allowlisting Celonis Platform IPs and domains](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm2533520203447088_body)

If your Coupa instance is only reachable within a certain IP range, you need to allowlist the outbound IPs of the Celonis Platform, otherwise data cannot be extracted. The IPs of the Celonis Platform are different depending on the cluster (eu-1 or us-1).

For more information, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### Supported Coupa API endpoints](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm4601803499998434220403052347_body)

When connecting your Coupa tenant to the Celonis Platform, the following API endpoints are supported. These endpoints are dependent on three sources:

- Tables that are defined in a static definition of metadata.
- Tables for which the metadata is dynamically retrieved from the API response.
- Tables that are configured using the customize metadata JSON.

Filter

- API
- Table Name
- Used in Accounts Payable Process
- Used in Purchase-to-Pay Process

| API | Table Name | Used in Accounts Payable Process | Used in Purchase-to-Pay Process |
| --- | --- | --- | --- |
| Addresses API | addresses  Nested tables:  - addresses\_tax\_registrations - addresses\_purposes - address\_content\_groups | Yes | Yes |
| Approvals API | approvals  Nested tables:  - approvals\_reasons - approvals\_delegates | Yes | Yes |
| Business Groups API | business\_groups | Yes | Yes |
| Contracts API | contracts  Nested tables:  - contracts\_reason\_insight\_events - contracts\_tags - contracts\_diversity\_categories - contracts\_taggings - contracts\_current\_parallel\_approvals - contracts\_contract\_clauses - contracts\_contract\_terms - contracts\_contract\_parties | Yes | Yes |
| Departments API | departments | Yes | Yes |
| Inventory Transactions API | inventory\_transactions  Nested tables:  - inventory\_transactions\_attachments - inventory\_transactions\_inventory\_transaction\_lots - inventory\_transactions\_current\_integration\_history\_records - inventory\_transactions\_asset\_tags - inventory\_transactions\_account\_allocations - inventory\_transactions\_inventory\_transaction\_valuations | No | No |
| Invoices API | invoices  Nested tables:  - invoices\_invoice\_charges - invoices\_tags - invoices\_failed\_tolerances - invoices\_attachments - invoices\_payments - invoices\_tcs\_tax\_lines - invoices\_withholding\_tax\_lines - invoices\_invoice\_payment\_receipts - invoice\_lines - invoices\_tax\_lines - invoices\_approvals - invoices\_dispute\_reasons - invoices\_taggings - current\_integration\_history\_records - invoices\_payment\_agreement\_notes - revision\_records\_invoiceheader | Yes | Yes |
| Purchase Order Lines API | purchase\_order\_lines  Nested tables:  - purchase\_order\_lines\_account\_allocations - purchase\_order\_lines\_form\_response - purchase\_order\_lines\_attachments - purchase\_order\_lines\_recurring\_rules - purchase\_order\_lines\_asset\_tags - purchase\_order\_lines\_milestones | Yes | Yes |
| Purchase Order Revisions API | purchase\_order\_revisions  Nested tables:  - purchase\_order\_revision\_order\_lines | No | Yes |
| Purchase Orders API | purchase\_orders  Nested tables:  - purchase\_orders\_attachments - purchase\_orders\_recurring\_rules - purchase\_orders\_reason\_insight\_events - purchase\_orders\_order\_lines - purchase\_orders\_current\_integration\_history\_records - purchase\_orders\_milestones - revision\_records\_orderheader | No | Yes |
| Requisitions API | requisitions  Nested tables:  - requisitions\_attachments - requisitions\_current\_parallel\_approvals - requisitions\_approvals - requisition\_lines - requisitions\_recurring\_rules - requisitions\_tags - requisitions\_taggings - requisitions\_milestones - requisition\_lines\_account\_allocations - revision\_records\_requisitionheader | Yes | Yes |
| Supplier Items API | supplier\_items | Yes | Yes |
| Suppliers API | suppliers  Nested tables:  - suppliers\_preferred\_commodities - suppliers\_remit\_to\_addresses - suppliers\_supplier\_addresses - suppliers\_customer\_support\_contacts - suppliers\_diversities - suppliers\_taggings - suppliers\_diversity\_categories - suppliers\_invoice\_emails - suppliers\_supplier\_sites - suppliers\_integration\_contacts - suppliers\_payment\_terms - suppliers\_restricted\_account\_types - suppliers\_contacts | Yes | Yes |
| Users API | users  Nested tables:  - users\_working\_warehouses - users\_account\_groups - users\_roles - users\_expenses\_delegated\_to - users\_approval\_groups - users\_user\_groups - users\_inventory\_organizations - users\_can\_expense\_for | Yes | Yes |

| API | Table Name | Used in Accounts Payable Process | Used in Purchase-to-Pay Process |
| --- | --- | --- | --- |
| Addresses API | addresses  Nested tables:  - addresses\_tax\_registrations - addresses\_purposes - address\_content\_groups | Yes | Yes |
| Approvals API | approvals  Nested tables:  - approvals\_reasons - approvals\_delegates | Yes | Yes |
| Business Groups API | business\_groups | Yes | Yes |
| Contracts API | contracts  Nested tables:  - contracts\_reason\_insight\_events - contracts\_tags - contracts\_diversity\_categories - contracts\_taggings - contracts\_current\_parallel\_approvals - contracts\_contract\_clauses - contracts\_contract\_terms - contracts\_contract\_parties | Yes | Yes |
| Departments API | departments | Yes | Yes |
| Inventory Transactions API | inventory\_transactions  Nested tables:  - inventory\_transactions\_attachments - inventory\_transactions\_inventory\_transaction\_lots - inventory\_transactions\_current\_integration\_history\_records - inventory\_transactions\_asset\_tags - inventory\_transactions\_account\_allocations - inventory\_transactions\_inventory\_transaction\_valuations | No | No |
| Invoices API | invoices  Nested tables:  - invoices\_invoice\_charges - invoices\_tags - invoices\_failed\_tolerances - invoices\_attachments - invoices\_payments - invoices\_tcs\_tax\_lines - invoices\_withholding\_tax\_lines - invoices\_invoice\_payment\_receipts - invoice\_lines - invoices\_tax\_lines - invoices\_approvals - invoices\_dispute\_reasons - invoices\_taggings - current\_integration\_history\_records - invoices\_payment\_agreement\_notes - revision\_records\_invoiceheader | Yes | Yes |
| Purchase Order Lines API | purchase\_order\_lines  Nested tables:  - purchase\_order\_lines\_account\_allocations - purchase\_order\_lines\_form\_response - purchase\_order\_lines\_attachments - purchase\_order\_lines\_recurring\_rules - purchase\_order\_lines\_asset\_tags - purchase\_order\_lines\_milestones | Yes | Yes |
| Purchase Order Revisions API | purchase\_order\_revisions  Nested tables:  - purchase\_order\_revision\_order\_lines | No | Yes |
| Purchase Orders API | purchase\_orders  Nested tables:  - purchase\_orders\_attachments - purchase\_orders\_recurring\_rules - purchase\_orders\_reason\_insight\_events - purchase\_orders\_order\_lines - purchase\_orders\_current\_integration\_history\_records - purchase\_orders\_milestones - revision\_records\_orderheader | No | Yes |
| Requisitions API | requisitions  Nested tables:  - requisitions\_attachments - requisitions\_current\_parallel\_approvals - requisitions\_approvals - requisition\_lines - requisitions\_recurring\_rules - requisitions\_tags - requisitions\_taggings - requisitions\_milestones - requisition\_lines\_account\_allocations - revision\_records\_requisitionheader | Yes | Yes |
| Supplier Items API | supplier\_items | Yes | Yes |
| Suppliers API | suppliers  Nested tables:  - suppliers\_preferred\_commodities - suppliers\_remit\_to\_addresses - suppliers\_supplier\_addresses - suppliers\_customer\_support\_contacts - suppliers\_diversities - suppliers\_taggings - suppliers\_diversity\_categories - suppliers\_invoice\_emails - suppliers\_supplier\_sites - suppliers\_integration\_contacts - suppliers\_payment\_terms - suppliers\_restricted\_account\_types - suppliers\_contacts | Yes | Yes |
| Users API | users  Nested tables:  - users\_working\_warehouses - users\_account\_groups - users\_roles - users\_expenses\_delegated\_to - users\_approval\_groups - users\_user\_groups - users\_inventory\_organizations - users\_can\_expense\_for | Yes | Yes |

[## Configuring the Coupa extractor](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm4574463554241634220401847605_body)

This section describes the basic setup of configuring the Coupa extractor. For an an overview of this process:

To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Select **Cloud - Coupa**.
4. Configure the following connection details:

   - **Name**: An internal reference for this data connection.
   - **Tenant**: Enter your Coupa tenant using the following format:

     ```
     https://yourtenant.coupacloud.com
     ```
   - **API version**: We recommend selecting the latest API version.
   - **Authentication method - OAuth**: Supply your Coupa OAuth client ID, client secret, and OICD scopes.
   - **Advanced settings**: Configure your pseudonymization algorithm and enable custom metadata if you want to extract custom tables and columns from Coupa. For more information, see: [Adding custom tables and columns to Coupa extraction](adding-custom-tables-and-columns-to-coupa-extraction.html "Adding custom tables and columns to Coupa extraction").
5. Select **Test Connection** and correct any issues highlighted.
6. Select **Save**.

   The connection between your Coupa tenant and the Celonis Platform is established. You can manage this connection at any time by clicking options:

   |  |
   | --- |
   |  |

[## Coupa extractor limitations and known issues](#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-id235236194140345_body)

This section explains the limitations and known issues for the Coupa extractor:

- Data access is restricted to the Celonis-supported APIs, as documented in [Supported Coupa API endpoints](connecting-to-coupa.html#UUID-3e7c928d-7908-2e33-1066-40a349aba598_section-idm4601803499998434220403052347 "Supported Coupa API endpoints").
- Change data (revisions) cannot be extracted via the API for most objects. However, for Purchase Order revisions, change data is accessible via the API.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-databases

# Connecting to databases

With the Celonis Platform you can connect to a number of SQL databases via JDBC connectors. When connecting to [supported databases](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), you can either connect directly to the database or use an uplink/on-premise connection:

- **Direct connection**: Use this when you want to allow the Celonis Platform to directly access your database.
- **Uplink connection via an on-premise extractor**: Use this when you don't want to or can't allow the Celonis Platform to directly access your database. The connection is then established using an on-premise extractor, allowing you to continuously fetch data from your database and send it to the Celonis Platform.

Information on which connection types the Celonis Platform supports for your database can be found in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types").

In many cases, you can connect to these databases just using the extractor provided by Celonis, however there database connection that require you to download the JDBC connector or driver from the database provider. In these cases, consider the following connection types:

- **Connecting using a custom JDBC string**: You can connect to your database using a custom JDBC string, allowing you to extend the settings offered by our extractor builder. This is useful for when you want to configure SSL, add certificates, or use `.jks` files for your database connection.

  To learn how to connect to your database using a custom JDBC string, see: [Custom JDBC connection strings](jdbc-extractor.html#UUID-a56f8ca4-2a92-0f30-be35-79db70261ace_section-idm4540235800804834242875289803 "Custom JDBC connection strings").
- **Connecting using a custom JDBC driver**: You can connect to your database using a custom JDBC driver, allowing you to extend the settings offered by our extractor builder. This requires you to use an uplink connection (using an on-premise extractor), with the custom driver being supplied by you.

  To learn how to connect to your database using a custom JDBC driver, see: [Custom JDBC drivers](jdbc-extractor.html#UUID-a56f8ca4-2a92-0f30-be35-79db70261ace_section-id23544196111651 "Custom JDBC drivers").

## Supported database types

When viewing the below table, there are two status indicators:

| Status indicator | Status description |
| --- | --- |
|  | You can connect to this database using a natively supported connection in the Celonis Platform. Select the link to the database documentation page. |
|  | You must connect to this connection type using the on-premise [JDBC Extractor](jdbc-extractor.html "JDBC Extractor") and a custom JDBC driver. For more information, see [Using a custom JDBC driver](connecting-to-a-database-using-custom-jdbc-driver.html "Using a custom JDBC driver with the on-premise JDBC Extractor"). |

The following database extractors are available in the Celonis Platform:

Filter

- Database type
- Direct connection
- Uplink/On-premise connection

| Database type | Direct connection | Uplink/On-premise connection |
| --- | --- | --- |
| [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") |  |  |
| [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") |  |  |
| [Apache Hive / Apache Hadoop](connecting-to-apache-hive.html "Connecting to Apache Hive") |  |  |
| [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") |  |  |
| [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") |  |  |
| [Cloudera Impala](connecting-to-cloudera-impala.html "Connecting to Cloudera Impala") |  |  |
| [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") |  |  |
| [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") |  |  |
| [IBM Db2](connecting-to-ibm-db2.html "Connecting to IBM Db2 (extractor)") |  |  |
| [IBM Netezza](connecting-to-ibm-netezza.html "Connecting to IBM Netezza (extractor)") |  |  |
| [Intersystems Cache](connecting-to-intersystems-cache.html "Connecting to Intersystems Caché (extractor)") |  |  |
| [Microsoft Dynamics AX](connecting-to-microsoft-dynamics-ax.html "Connecting to Microsoft Dynamics AX (extractor)") |  |  |
| [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") |  |  |
| [MSSQL](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)")  Note: A custom driver is needed to use Windows Authentication. |  |  |
| [MySQL](connecting-to-mysql.html "Connecting to MySQL (extractor)") |  |  |
| [OpenEdge](connecting-to-openedge.html "Connecting to OpenEdge (extractor)") |  |  |
| [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") |  |  |
| [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") |  |  |
| [Oracle NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") |  |  |
| [PostgreSQL (encrypted or unencrypted)](connecting-to-postgresql.html "Connecting to PostgreSQL (extractor)") |  |  |
| SAP HANA |  |  |
| [SAP MaxDB](connecting-to-sap-maxdb.html "Connecting to SAP MaxDB (extractor)") |  |  |
| [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |  |  |
| [Sybase ASE](connecting-to-sybase-ase.html "Connecting to Sybase ASE (extractor)") |  |  |
| [Sybase IQ](connecting-to-sybase-iq.html "Connecting to Sybase IQ (extractor)") |  |  |
| [Teradata](connecting-to-teradata.html "Connecting to Teradata (extractor)") |  |  |
| [Trino](connecting-to-trino.html "Connecting to Trino (extractor)") |  |  |
| [Vertica](connecting-to-vertica.html "Connecting to Vertica (extractor)") |  |  |

| Database type | Direct connection | Uplink/On-premise connection |
| --- | --- | --- |
| [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") |  |  |
| [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") |  |  |
| [Apache Hive / Apache Hadoop](connecting-to-apache-hive.html "Connecting to Apache Hive") |  |  |
| [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") |  |  |
| [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") |  |  |
| [Cloudera Impala](connecting-to-cloudera-impala.html "Connecting to Cloudera Impala") |  |  |
| [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") |  |  |
| [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") |  |  |
| [IBM Db2](connecting-to-ibm-db2.html "Connecting to IBM Db2 (extractor)") |  |  |
| [IBM Netezza](connecting-to-ibm-netezza.html "Connecting to IBM Netezza (extractor)") |  |  |
| [Intersystems Cache](connecting-to-intersystems-cache.html "Connecting to Intersystems Caché (extractor)") |  |  |
| [Microsoft Dynamics AX](connecting-to-microsoft-dynamics-ax.html "Connecting to Microsoft Dynamics AX (extractor)") |  |  |
| [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") |  |  |
| [MSSQL](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)")  Note: A custom driver is needed to use Windows Authentication. |  |  |
| [MySQL](connecting-to-mysql.html "Connecting to MySQL (extractor)") |  |  |
| [OpenEdge](connecting-to-openedge.html "Connecting to OpenEdge (extractor)") |  |  |
| [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") |  |  |
| [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") |  |  |
| [Oracle NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") |  |  |
| [PostgreSQL (encrypted or unencrypted)](connecting-to-postgresql.html "Connecting to PostgreSQL (extractor)") |  |  |
| SAP HANA |  |  |
| [SAP MaxDB](connecting-to-sap-maxdb.html "Connecting to SAP MaxDB (extractor)") |  |  |
| [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |  |  |
| [Sybase ASE](connecting-to-sybase-ase.html "Connecting to Sybase ASE (extractor)") |  |  |
| [Sybase IQ](connecting-to-sybase-iq.html "Connecting to Sybase IQ (extractor)") |  |  |
| [Teradata](connecting-to-teradata.html "Connecting to Teradata (extractor)") |  |  |
| [Trino](connecting-to-trino.html "Connecting to Trino (extractor)") |  |  |
| [Vertica](connecting-to-vertica.html "Connecting to Vertica (extractor)") |  |  |

## Database extractor feature matrix

The below matrices highlight the available features for our commonly supported databases connections.

When viewing the below matrices, there are two status indicators:

| Status Indicator | Status Description |
| --- | --- |
|  | This feature is supported and can be used with this database. |
|  | This feature is not currently supported and can't be used with this database. |

Expand all

[### Authentication types](#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm4522234957459234215065501945_body)

The following authentication types are used when connecting to databases:

Filter

- Feature
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Database credentials (username and password) |  |  |  |  |  |  |  |  |  |  |  |
| Active directory |  |  |  |  |  |  |  |  |  |  |  |
| OAuth |  |  |  |  |  |  |  |  |  |  |  |
| Service account authentication |  |  |  |  |  |  |  |  |  |  |  |
| Application default credentials |  |  |  |  |  |  |  |  |  |  |  |
| Personal access token |  |  |  |  |  |  |  |  |  |  |  |
| Key pair authentication |  |  |  |  |  |  |  |  |  |  |  |

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Database credentials (username and password) |  |  |  |  |  |  |  |  |  |  |  |
| Active directory |  |  |  |  |  |  |  |  |  |  |  |
| OAuth |  |  |  |  |  |  |  |  |  |  |  |
| Service account authentication |  |  |  |  |  |  |  |  |  |  |  |
| Application default credentials |  |  |  |  |  |  |  |  |  |  |  |
| Personal access token |  |  |  |  |  |  |  |  |  |  |  |
| Key pair authentication |  |  |  |  |  |  |  |  |  |  |  |

[### Connection settings](#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm4522234952808034215065542205_body)

The following connection settings are available for databases:

Filter

- Feature
- Feature Description
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](snowflake.html "Snowflake") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pseudonmyzation algorithms | The applied pseudonymization algorithms can be selected in the advanced settings of the extractor builder:  Supported Algorithms:  - SHA-1 - SHA-256 - SHA-256(No Salt) - SHA-512 - SHA-512(No Salt) |  |  |  |  |  |  |  |  |  |  |  |
| Parallelization of table extractions | The max. number of parallel requests the extractor makes can be customized in the advanced settings when configuring the extractor.  - The default is 4, with the maximum set to 10. - If you are using Uplink Connections you can configure the maximum up to 40. See: [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor"). |  |  |  |  |  |  |  |  |  |  |  |
| Timeout for database connection | Timeout for all database connections created in this connection (specific to this connection only). |  |  |  |  |  |  |  |  |  |  |  |
| Live data connection (using the Replication Cockpit) | The ability to establish a live connection to the database using the replication cockpit. |  |  |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](snowflake.html "Snowflake") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pseudonmyzation algorithms | The applied pseudonymization algorithms can be selected in the advanced settings of the extractor builder:  Supported Algorithms:  - SHA-1 - SHA-256 - SHA-256(No Salt) - SHA-512 - SHA-512(No Salt) |  |  |  |  |  |  |  |  |  |  |  |
| Parallelization of table extractions | The max. number of parallel requests the extractor makes can be customized in the advanced settings when configuring the extractor.  - The default is 4, with the maximum set to 10. - If you are using Uplink Connections you can configure the maximum up to 40. See: [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor"). |  |  |  |  |  |  |  |  |  |  |  |
| Timeout for database connection | Timeout for all database connections created in this connection (specific to this connection only). |  |  |  |  |  |  |  |  |  |  |  |
| Live data connection (using the Replication Cockpit) | The ability to establish a live connection to the database using the replication cockpit. |  |  |  |  |  |  |  |  |  |  |  |

[### Object types](#id499465_body)

The following object types are available for databases:

Filter

- Feature
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tables |  |  |  |  |  |  |  |  |  |  |  |
| Views |  |  |  |  |  |  |  |  |  |  |  |
| Synonyms |  |  |  |  |  |  |  |  |  |  |  |
| Analytical views |  |  |  |  |  |  |  |  |  |  |  |
| External tables |  |  |  |  |  |  |  |  |  |  |  |
| Snapshots |  |  |  |  |  |  |  |  |  |  |  |
| Materialized views |  |  |  |  |  |  |  |  |  |  |  |

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tables |  |  |  |  |  |  |  |  |  |  |  |
| Views |  |  |  |  |  |  |  |  |  |  |  |
| Synonyms |  |  |  |  |  |  |  |  |  |  |  |
| Analytical views |  |  |  |  |  |  |  |  |  |  |  |
| External tables |  |  |  |  |  |  |  |  |  |  |  |
| Snapshots |  |  |  |  |  |  |  |  |  |  |  |
| Materialized views |  |  |  |  |  |  |  |  |  |  |  |

[### Object configurations](#id499799_body)

The following object configurations are possible for databases:

Filter

- Feature
- Feature Description
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Table joins | It is possible to join the extracted table on another table during the extraction. |  |  |  |  |  |  |  |  |  |  |  |
| Time filter | Creation date filter: Used to restrict the number of records to be extracted.  Change date filter: Used for delta extractions. |  |  |  |  |  |  |  |  |  |  |  |
| Filtering | Filters can be applied on table level based on the supported filtering operators (documented below). |  |  |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Table joins | It is possible to join the extracted table on another table during the extraction. |  |  |  |  |  |  |  |  |  |  |  |
| Time filter | Creation date filter: Used to restrict the number of records to be extracted.  Change date filter: Used for delta extractions. |  |  |  |  |  |  |  |  |  |  |  |
| Filtering | Filters can be applied on table level based on the supported filtering operators (documented below). |  |  |  |  |  |  |  |  |  |  |  |

[### Supported filters](#id499988_body)

The following filters are supported by databases:

Filter

- Feature
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| = |  |  |  |  |  |  |  |  |  |  |  |
| <; > |  |  |  |  |  |  |  |  |  |  |  |
| >=; <= |  |  |  |  |  |  |  |  |  |  |  |
| IN |  |  |  |  |  |  |  |  |  |  |  |
| NOT IN |  |  |  |  |  |  |  |  |  |  |  |

| Feature | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| = |  |  |  |  |  |  |  |  |  |  |  |
| <; > |  |  |  |  |  |  |  |  |  |  |  |
| >=; <= |  |  |  |  |  |  |  |  |  |  |  |
| IN |  |  |  |  |  |  |  |  |  |  |  |
| NOT IN |  |  |  |  |  |  |  |  |  |  |  |

[### Extraction and column configuration](#id500260_body)

The following column configuration options are supported by databases:

Filter

- Feature
- Feature Description
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rename target table | The name of the table which is created in Celonis can be customized as part of the table configuration. |  |  |  |  |  |  |  |  |  |  |  |
| Column selection | The subset of columns that should be extracted can be selected. |  |  |  |  |  |  |  |  |  |  |  |
| Column pseudonymization | The columns that should be pseudonymized with the chosen algorithm can be selected. |  |  |  |  |  |  |  |  |  |  |  |
| Customize primary key | Additional columns can be added to the default primary key definition. |  |  |  |  |  |  |  |  |  |  |  |
| Casting of data types | The data type with which the extracted columns are inserted to Celonis can be customized. |  |  |  |  |  |  |  |  |  |  |  |
| Column data types | The column data type with which the extracted columns are inserted to Celonis. |  |  |  |  |  |  |  |  |  |  |  |
| Limit total records | The total number of records to be extracted can be limited using this feature. |  |  |  |  |  |  |  |  |  |  |  |
| Binary data type handling | Table column with binary data type can be represented in two ways:  - UTF- 8 - HEX\_NOTATION  Depending on the value specified here the binary value will be converted. |  |  |  |  |  |  |  |  |  |  |  |
| Maximum string length configuration | Allows the modification of the default length (80 characters) of String-type columns.  This is configured using the parameter: MAX\_STRING\_LENGTH |  |  |  |  |  |  |  |  |  |  |  |
| Batch size configuration | Allows specifying the batch size (in records) for one extraction request. |  |  |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rename target table | The name of the table which is created in Celonis can be customized as part of the table configuration. |  |  |  |  |  |  |  |  |  |  |  |
| Column selection | The subset of columns that should be extracted can be selected. |  |  |  |  |  |  |  |  |  |  |  |
| Column pseudonymization | The columns that should be pseudonymized with the chosen algorithm can be selected. |  |  |  |  |  |  |  |  |  |  |  |
| Customize primary key | Additional columns can be added to the default primary key definition. |  |  |  |  |  |  |  |  |  |  |  |
| Casting of data types | The data type with which the extracted columns are inserted to Celonis can be customized. |  |  |  |  |  |  |  |  |  |  |  |
| Column data types | The column data type with which the extracted columns are inserted to Celonis. |  |  |  |  |  |  |  |  |  |  |  |
| Limit total records | The total number of records to be extracted can be limited using this feature. |  |  |  |  |  |  |  |  |  |  |  |
| Binary data type handling | Table column with binary data type can be represented in two ways:  - UTF- 8 - HEX\_NOTATION  Depending on the value specified here the binary value will be converted. |  |  |  |  |  |  |  |  |  |  |  |
| Maximum string length configuration | Allows the modification of the default length (80 characters) of String-type columns.  This is configured using the parameter: MAX\_STRING\_LENGTH |  |  |  |  |  |  |  |  |  |  |  |
| Batch size configuration | Allows specifying the batch size (in records) for one extraction request. |  |  |  |  |  |  |  |  |  |  |  |

[### Metadata resolution](#id500733_body)

The following metadata resolution options are supported by databases:

Filter

- Feature
- Feature Description
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DRIVER\_METADATA | This metadata source is supported by all source systems and mostly it is the default one. Here the driver internally runs the metadata Query against the source system and fetches the result set. |  |  |  |  |  |  |  |  |  |  |  |
| SAMPLE\_QUERY | This metadata source is supported by all source systems. This also works the same as driver metadata, only the query used is different. |  |  |  |  |  |  |  |  |  |  |  |
| INFORMATION\_SCHEMA | This metadata source is supported mainly by Oracle system. And it's a default metadata source for Oracle 11g. |  |  |  |  |  |  |  |  |  |  |  |
| PG\_CATALOG | This metadata source is supported by Amazon Redshift. And it's a default metadata source. |  |  |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DRIVER\_METADATA | This metadata source is supported by all source systems and mostly it is the default one. Here the driver internally runs the metadata Query against the source system and fetches the result set. |  |  |  |  |  |  |  |  |  |  |  |
| SAMPLE\_QUERY | This metadata source is supported by all source systems. This also works the same as driver metadata, only the query used is different. |  |  |  |  |  |  |  |  |  |  |  |
| INFORMATION\_SCHEMA | This metadata source is supported mainly by Oracle system. And it's a default metadata source for Oracle 11g. |  |  |  |  |  |  |  |  |  |  |  |
| PG\_CATALOG | This metadata source is supported by Amazon Redshift. And it's a default metadata source. |  |  |  |  |  |  |  |  |  |  |  |

[### Data processing and resolution](#id500930_body)

The following data processing and resolution options are supported by databases:

Filter

- Feature
- Feature Description
- Amazon Athena
- Amazon Redshift
- Azure SQL
- Azure Synapse
- Databricks
- Google BigQuery
- Microsoft SQL Server
- NetSuite
- Oracle 11g
- Oracle EBS
- Snowflake

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Duplicate removal | Duplicate records retrieved within the extraction are removed based on the defined primary key and ordering columns. |  |  |  |  |  |  |  |  |  |  |  |
| Debug | Allows the enablement of a time-limited debug mode in the extraction settings to expose additional log messages. |  |  |  |  |  |  |  |  |  |  |  |
| Extraction preview | Filters can be applied for dependent tables |  |  |  |  |  |  |  |  |  |  |  |

| Feature | Feature Description | [Amazon Athena](connecting-to-amazon-athena.html "Connecting to Amazon Athena (extractor)") | [Amazon Redshift](connecting-to-amazon-redshift.html "Connecting to Amazon Redshift (extractor)") | [Azure SQL](connecting-to-azure-sql.html "Connecting to Azure SQL (extractor)") | [Azure Synapse](connecting-to-azure-synapse.html "Connecting to Azure Synapse (extractor)") | [Databricks](connecting-to-databricks.html "Connecting to Databricks (extractor)") | [Google BigQuery](connecting-to-google-bigquery.html "Connecting to Google BigQuery (extractor)") | [Microsoft SQL Server](connecting-to-microsoft-sql.html "Connecting to Microsoft SQL Server (extractor)") | [NetSuite](connecting-to-oracle-netsuite.html "Connecting to Oracle NetSuite (extractor)") | [Oracle 11g](connecting-to-oracle-11g.html "Connecting to Oracle 11g (extractor)") | [Oracle EBS](connecting-to-oracle-ebs.html "Connecting to Oracle EBS") | [Snowflake](connecting-to-snowflake.html "Connecting to Snowflake (extractor)") |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Duplicate removal | Duplicate records retrieved within the extraction are removed based on the defined primary key and ordering columns. |  |  |  |  |  |  |  |  |  |  |  |
| Debug | Allows the enablement of a time-limited debug mode in the extraction settings to expose additional log messages. |  |  |  |  |  |  |  |  |  |  |  |
| Extraction preview | Filters can be applied for dependent tables |  |  |  |  |  |  |  |  |  |  |  |


---

## data-integration/connectors/connecting-to-databricks

# Connecting to Databricks (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Databricks extractor allows you to transfer data from your Databricks Lakehouses (or Databricks SQL endpoints) to the Celonis Platform for process mining and analysis. It supports the following basic features:

**Zero-copy connectivity via Open Delta Sharing**

Databricks is also supported using zero-copy connectivity via Open Delta Sharing, which is recommended over using this extractor. For more information, see [Delta Sharing](delta-sharing.html "Delta Sharing connections").

Expand all

[## Before you begin](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm2533519993059004_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-databricks.html#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Disabling certificate validation (Uplink connections only)](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm234645983963816_body)

If the JDBC driver you're using doesn't support certificate validation, you can edit the `application-local.yml` to remove this configuration.

To do this, open the `application-local.yml` file (found in the package directory), and add the following configuration:

```
database:
    validateCertificateSupported: false
```

[### Authentication methods](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm2533519993181018_body)

This extractor supports the authentication methods described in the following sections.

[#### Authentication method – Personal Access Token](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm234493977241743_body)

The Databricks extractor supports authentication using a **Personal Access Token** (PAT). A PAT is a secure, token-based alternative to using user credentials for authenticating API or JDBC connections.

When you use PAT authentication, Databricks verifies requests based on the token instead of a username and password. This allows automated systems or integrations to access your Databricks workspace securely, without requiring interactive sign-ins.

Tokens are typically generated and managed within your Databricks workspace settings and should be stored securely, as they provide the same access permissions as the account under which they are created.

**Note**

For more information about managing personal access tokens, see the [Databricks documentation – Manage personal access tokens](https://docs.databricks.com/en/dev-tools/auth/pat.html).

For **Credentials > Personal access token** in the extractor configuration, provide your PAT the **Personal Access Token** field.

[#### Authentication method – Microsoft Entra ID](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-af05d24f-0324-f4fc-1241-e8a52e31411d_body)

The Databricks supports authentication through **Microsoft Entra ID** (formerly Azure Active Directory). This method uses an OAuth-based identity registered in Entra ID to securely authenticate Databricks connections.

Filter

- Extractor value
- Microsoft Entra ID value
- Description

Table 7. Celonis extractor values for Microsoft Entra ID authentication

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Databricks uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Databricks configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |

| Extractor value | Microsoft Entra ID value | Description |
| --- | --- | --- |
| Client ID | Application (client) ID | The unique identifier for your registered app in Microsoft Entra ID. To learn how to register an application, see [Microsoft documentation – Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app). |
| Client Secret | Client Secret | The secret key that the Databricks uses to authenticate as the registered application. To create and manage client secrets, see [Microsoft documentation – Create a service principal in Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).  **Note**  Copy the client secret immediately after creating it in Microsoft Entra ID. If lost, generate a new secret and update the Databricks configuration. |
| Tenant ID | Directory (tenant) ID | Identifies the Microsoft Entra organization associated with your environment. To locate your tenant information, see [Microsoft documentation – Find your Microsoft Entra tenant ID](https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant). |




**Note**

Before setting up the connection in Celonis, ensure the registered app in Microsoft Entra ID has the required API permissions for the resource you want to access.

For your Databricks configuration, ensure the correct values for **Client ID**, **Client Secret**, and **Tenant ID** (as applicable).

[#### Authentication method – Active Directory Service Principal](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm235040060768182_body)

Databricks supports authentication using an **Active Directory service principal**. A service principal acts as an application identity that can securely access Databricks resources without relying on a specific user account.

This authentication method is recommended for automated or system-to-system integrations, where access is managed through Azure Active Directory instead of individual user credentials. The connection authenticates using the service principal’s **client (application) ID** and **client secret**.

To enable OAuth authentication for a service principal, you must register the application in Azure Active Directory and create a client secret. For a complete walkthrough, see the [Azure Databricks documentation – Configure OAuth M2M authentication](https://learn.microsoft.com/en-us/azure/databricks/dev-tools/auth/oauth-m2m).

To ensure proper access, assign the following permissions to the service principal:

**Note**

Roles and entitlements can be managed directly in Databricks under **Settings > Identity and Access > Service Principals**, or through Azure Active Directory role assignments.

- **Allow Workspace access** – Allows the service principal to connect to the Databricks workspace.
- **Allow Databricks SQL access** – Enables querying data in SQL warehouses.
- **Catalog privileges** – Grant `SELECT`, `USAGE`, and `READ METADATA` on the catalogs or schemas used for extraction.

For **Credentials > Active Directory** in the extractor configuration, provide the following authentication values:

- **Principal ID** – The client (application) ID of the service principal.
- **Principal Secret** – The client secret created in Azure Active Directory for the service principal.

[## Configuring the Databricks extractor](#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm2533520003805826_body)

This section describes the basic setup of configuring the Databricks extractor. To configure the extractor:

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
   2. For **Database Type**, select **Databricks**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the base URL of your Databricks workspace. This is the hostname portion of your Databricks environment URL, for example:

           ```
           adb-<workspace-id>.<region>.azuredatabricks.net
           ```
         - For **Port**, provide the port to connect to (Default is `443`).
         - For **Database Name**, enter the name of the database that contains the schema you want to extract data from.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-databricks.html#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:<driver_name>://<host>:<port>/<database_name>;property1=value1;property2=value2...
           ```

           **Note**

           For JDBC string values:

           - For `<driver_name>`, provide the name of the JDBC driver used to connect to your data source (for example, `sqlserver`, `postgresql`, or `spark`).
           - If you are using **Microsoft Entra ID (OAuth 2.0)** to connect to Databricks, you must include the following two JDBC properties:

             - `EnableOIDCDiscovery=true`: Required to tell the Databricks JDBC driver to use the OpenID Connect (OIDC) Discovery mechanism.
             - `OIDCDiscoveryEndpoint=https://login.microsoftonline.com/<AzureTenantId>/v2.0/.well-known/openid-configuration`: Endpoint for OIDC discovery, where the `<AzureTenantId>` value is specific to your Azure environment.

           For more information on connecting to Databricks with JDBC strings, see the [Databricks documentation](https://docs.databricks.com/aws/en/integrations/jdbc-odbc-bi).
         - For **HTTP Path**, The Databricks endpoint path used to connect to your SQL warehouse or cluster. The Databricks endpoint path used to connect to your SQL warehouse or cluster. You can find this in your Databricks workspace under **SQL Warehouses → [Your Warehouse] → Connection Details**. The value typically looks like `/sql/1.0/warehouses/<warehouse_id>`.
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the schema that contains the tables to extract.
           - **Additional Properties**: Enter any additional connection properties required by your database or driver. Separate each with `;`.
   4. For **Credentials**, select the type of authentication you want to use for this connection. For more infomation, see [Authentication methods](connecting-to-databricks.html#UUID-08ac75a0-d170-9434-0948-62aa1eab0c1a_section-idm2533519993181018 "Authentication methods").

      **Note**

      Ensure the credentials used has sufficient permissions to access the data to be extracted.
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

## data-integration/connectors/connecting-to-ecovadis

# Connecting to EcoVadis (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis EcoVadis extractor integrates Celonis Platformwith EcoVadis to retrieve supplier sustainability ratings and ESG data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-51517fa7-2dc4-869a-5d83-d1ec8fcdbd0d_section-id235172627752593_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### EcoVadis authentication methods](#UUID-51517fa7-2dc4-869a-5d83-d1ec8fcdbd0d_section-id235172628290756_body)

The EcoVadis REST API uses OAuth2 authentication, and requires the following information:

- **OAuth2**: Username, password, client ID, and client secret.

[### Available EcoVadis endpoints](#UUID-51517fa7-2dc4-869a-5d83-d1ec8fcdbd0d_section-id235172631196753_body)

The default EcoVadis extractor allows you to call this endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | EV data | Retrieve sustainability ratings and ESG data for suppliers |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | EV data | Retrieve sustainability ratings and ESG data for suppliers |

[### Further EcoVadis information](#UUID-51517fa7-2dc4-869a-5d83-d1ec8fcdbd0d_section-id235172632555211_body)

For further information about EcoVadis, see: [EcoVadis Help Center](https://support.ecovadis.com/hc/en-us).

[## Configuring the EcoVadis extractor](#UUID-51517fa7-2dc4-869a-5d83-d1ec8fcdbd0d_section-id235172633312083_body)

This section describes the basic setup of configuring the EcoVadis extractor. To configure the extractor:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-gmail

# Connecting to Gmail (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Gmail extractor lets you bring data from your Goggle Gmail account into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Important**

This extractor's use and transfer to any other app of information received from Google APIs adheres to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes) including the Limited Use requirements.

Expand all

[## Before you begin](#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_section-idm2533520182704410_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Gmail authentication methods](#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_section-idm23464577816316_body)

To connect the Celonis Platform with your Gmail account, you need to configure an authentication method. The Gmail REST API uses the OAuth2 authentication method and you have two options here:

- **Use Celonis Client to Connect (recommended)**: Enter your email address and Gmail password and then grant the Celonis Platform access when prompted by Google.
- **Using client ID and client secret**: Using the Google Cloud Management Console to create a cloud project, configure the OAuth consent, and then create the credential information required by the Celonis Platform. For the steps here, see: [Optional: Configuring OAuth 2.0 via Google Cloud Management Console](connecting-to-gmail.html#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_UUID-401b21b8-98c9-140d-7ab9-43205b9db1d6 "Optional: Configuring OAuth 2.0 via Google Cloud Management Console").

[#### Optional: Configuring OAuth 2.0 via Google Cloud Management Console](#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_UUID-401b21b8-98c9-140d-7ab9-43205b9db1d6_body)

The Gmail REST API uses the OAuth2 authentication method, requiring you to provide a username, password, client ID, and client secret. These authentication credentials can be created and configured via your Google Cloud Management Console, available to anyone with a Google account (including individual users).

To configure your authentication method:

1. Create a Google Cloud project for the connection with the Celonis Platform, see: [Google Workspace - Create a Google Cloud project.](https://developers.google.com/workspace/guides/create-project)

   |  |
   | --- |
   |  |
2. Enable the Gmail API for the project created in step 1, see: [Google Workspace - Enable Google Workspace APIs.](https://developers.google.com/workspace/guides/enable-apis)

   |  |
   | --- |
   |  |
3. Configure the OAuth consent, see: [Google Workspace - Configure the OAuth consent screen and choose scopes.](https://developers.google.com/workspace/guides/configure-oauth-consent)

   |  |
   | --- |
   |  |
4. Create access credentials, see: [Google Workspace - Create access credentials](https://developers.google.com/workspace/guides/create-credentials).

   When prompted to enter a redirect URL, use the following:

   ```
   https://auth.redirect.celonis.cloud/extractor_redirect
   ```
5. Copy the client ID and client secret displayed with your access credentials:

For further information about Gmail's REST API, see: [Google Workspace - Gmail API Overview.](https://developers.google.com/gmail/api/guides)

[### Gmail endpoints](#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_section-idm23464577845659_body)

The following Gmail endpoints are used by the Celonis Platform:

**Note**

This extractor uses the Google Gmail REST API. For further information about the Gmail REST API, see: [Google Workspace - Gmail API Overview.](https://developers.google.com/gmail/api/guides)

| Operation | Sub-operation |
| --- | --- |
| Get drafts | Get draft content |
| Get history | — |
| Get labels | — |
| Get messages | Get message content |
| Get threads | Get thread content |
| Get user profile | — |

[## Configuring the Gmail extractor](#UUID-594ab7b2-c81e-1726-d7a2-586cce914a98_section-idm234644154963704_body)

This section describes the basic setup of configuring the Gmail extractor. To configure the extractor:

1. From your data pool diagram, selecet **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **+ Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Select **Cloud - Gmail**.
4. Enter the following connection details:

   |  |
   | --- |
   |  |

   - **Name**: Enter an internal reference for this data connection.
   - **API URL**: https://gmail.googleapis.com
   - **Email**: Enter your Gmail address.
   - **Use Celonis Client to Connect**: Enter your username and password, alternatively, provide the client ID and client secret configured in your prerequisites.
   - **Client ID**: Taken from the Google Cloud Management Console steps.
   - **Client Secret**: Taken from the Google Cloud Management Console steps.
   - **Advanced Settings**: Leave as default.
5. Select **Save**.
6. If configured correctly, the Google authorization window should open. Select the account you want to use, and when prompted, select **Continue** to trust the Celonis Platform.

   |  |
   | --- |
   |  |

   The connection between your Gmail account and the Celonis Platform is set.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-google-bigquery

# Connecting to Google BigQuery (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis BigQuery extractor allows you to transfer data from your Google BigQuery data warehouse to the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm2533519876964692_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Running the JDBC extractor (Uplink connections only)](#id503798_body)

When using an uplink connection:

- Download the latest JDBC package from the Celonis Download Portal: [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors").
- Download the Google BigQuery Jar: [Google JDBC drivers](https://cloud.google.com/bigquery/docs/reference/odbc-jdbc-drivers#current_jdbc_driver).
- Place all jar files in a folder, and then run:

  ```
  java -Dloader.path=<insert_name_of_folder_of_jars> -jar connector-jdbc.jar serve
  ```

[### Modifying your network settings](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm234494048712804_body)

The next step is to modify your network settings to allow the database extractor to communicate with Google BigQuery and the Celonis Platform.

The settings here are based on the connection type you are using:

#### Network settings for direct connections

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Google BigQuery | 443 | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| Celonis Platform | Google BigQuery | 443 | TCP | JDBC connection from the Celonis Platform to the database. The port is the one you normally use to connect to the database. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

#### Network settings for uplinked connections

The following network settings apply for uplinked connections (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Google BigQuery | 443 | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | Google BigQuery | 443 | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL). |

[### JDBC string guidelines](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication methods](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-id235198799679299_body)

This extractor supports the authentication methods described in the following sections.

[#### Authentication method – Service Account](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm234493977241742_body)

1. Before configuring the connection between your Google BigQuery account and the Celonis Platform, you must create a **dedicated service account** for the connection. To learn how to create and manage a service account, see  [Google Cloud documentation – Creating a service account](https://developers.google.com/identity/protocols/oauth2/service-account#creatinganaccount) .
2. After creating the service account, assign the following IAM roles to ensure Celonis can access and query your data:

   - BigQuery Job User (apply at the project level)
   - BigQuery Read Session User (apply at the project level)
   - BigQuery Data Viewer (apply at the table, dataset, or project level)
   - BigQuery Metadata Viewer (apply at the dataset or project level if Data Viewer is not granted)

   For more information about IAM roles, see  [Google Cloud documentation – BigQuery IAM roles and permissions](https://cloud.google.com/bigquery/docs/access-control) .
3. Log in to your Google Cloud Platform (GCP) account and enable the following APIs to allow Celonis to access BigQuery:

   - BigQuery API
   - BigQuery Storage API
4. During configuration in Celonis, you will need the following values from your Google Cloud setup:

   - **Service account email** – The email address of the service account created for Celonis (for example, `celonis-extractor@your-project-id.iam.gserviceaccount.com`). This will be the value of **Credentials > Service Account Authentication > Service Account Email ID**.
   - **Service account key file (JSON)** – The private key file downloaded when you created the service account. This file is used for authentication in Celonis. This will be the value of **Credentials > Service Account Authentication > Service Account Credentials (JSON)**.

[#### Authentication method – OAuth](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm234494023485219_body)

1. Before configuring the connection between your Google BigQuery account and the Celonis Platform, you must enable the required Google APIs and create OAuth 2.0 client credentials. This authentication method uses the **Simba Google BigQuery JDBC driver** to establish the connection.
2. Log in to your Google Cloud Platform (GCP) account and enable the following APIs:

   - BigQuery API
   - BigQuery Storage API
3. After enabling the APIs, configure OAuth 2.0 credentials for the project that hosts your BigQuery datasets:

   1. In the Google Cloud Console, navigate to **APIs & Services → Credentials** and click **Create Credentials**.
   2. Select **OAuth client ID**.
   3. Choose **Web application** as the application type.
   4. Enter a name for the OAuth client and add the following authorized redirect URI:

      ```
      https://auth.redirect.celonis.cloud/bigquery_redirect
      ```
   5. Save the OAuth client. Once saved, reopen it to view and copy the generated credentials.
   6. Copy both the **Client ID** and **Client secret**. You will need these values when configuring the connection in the Celonis Platform.
4. During configuration in Celonis, you will need the following values from your Google Cloud setup:

   - **Client ID** – The OAuth client ID created in Google Cloud. This will be the value of **Credentials > OAuth > Client ID**.
   - **Client secret** – The OAuth client secret created in Google Cloud. This will be the value of **Credentials > OAuth > Client Secret**.

[### Extracting large tables using connection parameters](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm234977771745293_body)

When extracting large tables from your Google BigQuery account, you might encounter the following error message:

```
"message": "Response too large to return. Consider specifying a destination table in your job configuration."
```

To resolve this, add the following JDBC connection parameters to your BigQuery connection configuration:

- `LargeResultDataset=<dataset>`
- `LargeResultTable=<table>`

To use these parameters, ensure the following:

- The specified `<dataset>` and `<table>` exist in your Google Cloud project.
- The extraction user defined in your Celonis credentials configuration has the necessary permissions to write results to the specified table. For more information, see  [Google Cloud – Writing query results](https://cloud.google.com/bigquery/docs/writing-results) .

For more details about JDBC driver properties, see  [Google Cloud – Current JDBC drivers](https://cloud.google.com/bigquery/docs/reference/odbc-jdbc-drivers#current_jdbc_driver) .

[## Configuring the Google BigQuery extractor](#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_section-idm2533519882569544_body)

This section describes the basic setup of configuring the Google BigQuery extractor. To configure the extractor:

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
   2. For **Database Type**, select **Google BigQuery**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter:

           ```
           https://www.googleapis.com/bigquery/v2
           ```
         - For **Port**, provide the port to connect to (Default is `443`).
         - For **Database Name**, enter the Project ID of your Google BigQuery project (not the project name).
         - (Optional) For **Schema Name**, enter the name of the dataset that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-google-bigquery.html#UUID-653ebc8c-5213-fbd9-dbff-76fe0cbb3eaa_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:bigquery://https://www.googleapis.com/bigquery/v2:443;ProjectId=<project_id>;property1=value1;property2=value2...
           ```

           **Note**

           For more information on connecting to Google BigQuery with JDBC strings, see the [Goggle Big Query documentation](https://cloud.google.com/bigquery/docs/reference/odbc-jdbc-drivers#current_jdbc_driver).
         - Optionally, provide values for:

           - **Schema Name**: Enter the name of the dataset that contains the tables to extract.
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

## data-integration/connectors/connecting-to-google-calendar

# Connecting to Google Calendar (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Google Calendar extractor lets you bring data from your Google Calendar account into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Important**

This extractor's use and transfer to any other app of information received from Google APIs adheres to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes) including the Limited Use requirements.

Expand all

[## Before you begin](#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_section-id235201860731256_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Google Calendar authentication methods](#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_section-idm234645840198517_body)

To connect the Celonis Platform with your Google Calendar account, you need to configure an authentication method. The Calendar REST API uses the OAuth2 authentication method and you have two options here:

- **Use Celonis Client to Connect (recommended):** Enter your email address and Gmail password and then grant the Celonis Platform access when prompted by Google.
- **Using client ID and client secret**: Using the Google Cloud Management Console to create a cloud project, configure the OAuth consent, and then create the credential information required by the Celonis Platform. For the steps here, see: [Optional: Configuring OAuth 2.0 via Google Cloud Management Console](connecting-to-google-calendar.html#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_UUID-25759e8a-cb3d-bf52-5837-18086b0b7d75 "Optional: Configuring OAuth 2.0 via Google Cloud Management Console").

[#### Optional: Configuring OAuth 2.0 via Google Cloud Management Console](#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_UUID-25759e8a-cb3d-bf52-5837-18086b0b7d75_body)

The Google Calendar REST API uses the OAuth 2.0 authentication method, requiring you to provide a username, password, client ID, and client secret. These authentication credentials can be created and configured via your Google Cloud Management Console, available to anyone with a Google account (including individual users).

To configure your authentication method:

1. Create a Google Cloud project for the connection with the Celonis Platform, see: [Google Workspace - Create a Google Cloud project.](https://developers.google.com/workspace/guides/create-project)

   |  |
   | --- |
   |  |
2. Enable the Google Calendar API for the project created in step 1, see: [Google Workspace - Enable Google Workspace APIs.](https://developers.google.com/workspace/guides/enable-apis)

   |  |
   | --- |
   |  |
3. Configure the OAuth consent, see: [Google Workspace - Configure the OAuth consent screen and choose scopes.](https://developers.google.com/workspace/guides/configure-oauth-consent)

   |  |
   | --- |
   |  |
4. Create access credentials, see: [Google Workspace - Create access credentials](https://developers.google.com/workspace/guides/create-credentials).

   When prompted to enter a redirect URL, use the following:

   ```
   https://auth.redirect.celonis.cloud/extractor_redirect
   ```
5. Copy the client ID and client secret displayed with your access credentials:

For further information about Gmail's REST API, see: [Google Workspace - Gmail API Overview.](https://developers.google.com/gmail/api/guides)

[### Google Calendar endpoints](#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_section-idm23464584026219_body)

The following Google Calendar endpoints are used:

**Note**

This extractor uses the Google Calendar REST API. For further information about the Google Calendar REST API, see: [Google Workspace - Google Calendar API overview.](https://developers.google.com/workspace/calendar/api/guides/overview)

- Get Calendar list
- Get Events
- Get Settings

[## Configuring the Google Calendar extractor](#UUID-cd9adf69-8f4e-22d8-72d3-527d0ca3fcf0_section-idm234644154963704_body)

This section describes the basic setup of configuring the Google Calendar extractor. To configure the extractor:

1. From your data pool diagram, select **Data Connections**.

   |  |
   | --- |
   |  |
2. Select **Add Data Connection** and select **Connect to Data Source**.

   |  |
   | --- |
   |  |
3. Select **Cloud - Google Calendar**.
4. Enter the following connection details:

   - **Name**: Enter an internal reference for this data connection.
   - **API URL**: https://www.googleapis.com
   - **Use Celonis Client to Connect**: Enter your username and password, alternatively, provide the client ID and client secret configured in your prerequisites.
   - **Client ID**: Taken from the Google Cloud Management Console steps. This is only needed if you followed the optional prerequisites.
   - **Client Secret**: Taken from the Google Cloud Management Console steps. This is only needed if you followed the optional prerequisites.
   - **Advanced Settings**: Leave as defaulted.
5. Select **Save**.
6. If configured correctly, the Google sign in page should load. Select the account you want to use and, when prompted, select the access level the Celonis Platform can have to your Google calendar account.

   The options here are:

   - View events on all your calendars.
   - See and download any calendar you can access using your Google Calendar.
7. Select **Continue**.

   The connection between your Google Calendar account and the Celonis Platform is set.

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-google-services-using-custom-oauth-client

# Connecting to Google services using custom OAuth client

This article will show you how to create your own project in Google Cloud Platform and a custom OAuth client. This is useful for connecting restricted Google services, like Google Drive or Gmail*,* to Celonis platform.

Expand all

[## Before you begin](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-id235522006068426_body)

To connect, you must have a Google account. You can create an account at [accounts.google.com/signin](https://accounts.google.com/signin).

The following procedure is intended for:

- **Personal use** (*@gmail* and *@googlemail.com* users)
- **Internal use** (Google Workspace users that prefer to use a custom OAuth client)

[## Configuring a Google Cloud Platform project](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_UUID-e1186128-368b-5c12-abbd-3838eec0fef4_body)

There are five steps to configure a Google Cloud Platform project.

1. [Create a Google Cloud Platform project](connecting-to-google-services-using-custom-oauth-client.html#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-idm459933987897603399225180605 "Create a Google Cloud Platform project")
2. [Enable APIs](connecting-to-google-services-using-custom-oauth-client.html#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-idm4596511712427234178824458113 "Enable APIs")
3. [Configure your OAuth consent screen](connecting-to-google-services-using-custom-oauth-client.html#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-idm4541269278904034178825572485 "Configure your OAuth consent screen")
4. [Create your client credentials](connecting-to-google-services-using-custom-oauth-client.html#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-idm4599838926625634178828461996 "Create your client credentials")
5. [Connect to Celonis platform with custom credentials](connecting-to-google-services-using-custom-oauth-client.html#UUID-7651d506-ad53-454e-270d-541fd198ddaf_section-idm4606179784073634178838314368 "Establish the connection in Celonis platform")

### Create a Google Cloud Platform project

1. Log in to the [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**.
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

### Enable APIs

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the APIs you need for your project.

   For information regarding specific APIs, refer to the [Make Help Center](https://www.make.com/en/help/apps) for the app you are using.
3. Click the relevant API, then click **Enable**.

### Configure your OAuth consent screen

1. In the left sidebar, click **Google Auth Platform**.

   **Note**

   If you don't see **Google Auth Platform** in the left sidebar, click **View all products** at the top of it, then pin **Google Auth Platform** to the sidebar.
2. Click **Get Started**.
3. In the **Overview** section, under **App information**, enter *Make* as the app name and provide your Gmail address. Click **Next**.
4. Under **Audience**, select **External**.

   For more information regarding user types, refer to [Google's Exceptions to verification requirements documentation](https://support.google.com/cloud/answer/9110914#exceptions-ver-reqts).
5. Under **Contact Information**, enter your Gmail address..
6. Under **Finish**, agree to the Google User Data Policy.
7. Click **Continue** > **Create**.
8. In the **Branding** section, under **Authorized domains**, add `make.com` and `integromat.com`. Click **Save**.
9. Optional: In the **Audience** section, add your Gmail address on the **Test users** page, then click **Save and continue** if you want the project to remain in the **Testing** publishing status.
10. In the **Data Access** section, click **Add or remove scopes**, add any desired scopes, and click **Update**.

    Here are some examples of scopes you may need for Gmail and Google Drive.

    |  |  |
    | --- | --- |
    | **Gmail** | - `https://mail.google.com` - `https://www.googleapis.com/auth/userinfo.email` |
    | **Google Drive** | - `https://www.googleapis.com/auth/drive` - `https://www.googleapis.com/auth/drive.readonly` |

    For additional scopes, refer to the [Make Help Center](https://www.make.com/en/help/apps) for the app you are using.
11. Click **Save**.

**Note**

**Publishing Status**

**Testing:** If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Celonis platform every week. To avoid weekly reauthorization, update the project status to **In production**.

**In production:** If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly. To update your project's status, go to the **Google Auth Platform**, the **Audience** section, and click **Publish app**. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?authuser=1&visit_id=638718595933013017-1855034908&rd=1) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding the publishing status, refer to the Publishing status section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=).

### Create your client credentials

1. In Google Auth Platform, click **Clients**.
2. Click **+ Create Client**.
3. In the **Application type** dropdown, select **Web application**.
4. Update the **Name** of your OAuth client. This will help you identify it in the console.
5. In the **Authorized redirect URIs** section, click **+ Add URI** and enter the redirect URI.

   Here is a redirect URI you need for Gmail and Google Drive.

   - `https://www.integromat.com/oauth/cb/google-restricted`

   For additional redirect URIs, refer to the [Make Help Center](https://www.make.com/en/help/apps) for the app you are using.
6. Click **Create**.
7. Click the OAuth 2.0 Client you created, copy your **Client ID** and **Client secret** values, and store them in a safe place.

You will use these values in the **Client ID** and **Client Secret** fields in Celonis platform.

### Establish the connection in Celonis platform

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Google app module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Switch on the **Show advanced settings** toggle and enter your Google Cloud Platform project client credentials.
4. Click **Sign in with Google**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more modules.

[## Known issues](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_id_common-problems_body)

[### 100 Logins Limit Per Day Has Been Reached](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_id_logins-limit-per-day-has-been-reached_body)

This happens rarely, but when it does, we recommend creating another OAuth client.

[### [403] Access Not Configured](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_id_access-not-configured_body)

If this error message appears, you need to enable the corresponding API in your Google Cloud Platform.

[### Authorization Error - Error 403: access\_denied](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_id_h_01EQKCXHZQ8RVSF0Q01KPH6K22_body)

|  |
| --- |
|  |

Google has added the required settings for the Consent screen. You'll need to add the email address associated with the Google account you want to connect with Celonis platform as a Test user.

1. Sign in to the [Google Cloud Platform](https://console.developers.google.com/) using your Google credentials.
2. Go to **APIs & Services > OAuth consent screen**.
3. In the **Test Users** section, click **Add users** to add a test user. Enter the email address associated with the Google account you want to connect with Celonis platform, and click **Save**.
4. Now, go to **Celonis platform,** and connect to the desired Google service.

[### Failed to verify connection 'My Google Restricted connection'. Status Code Error: 400](#UUID-7651d506-ad53-454e-270d-541fd198ddaf_id_connectionNotValid_body)

Your connection has expired and is no longer valid. You need to reauthorize the connection.

This error affects **non**-Google Workspace accounts. For more details please refer to the [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2#expiration).

Due to Google's updated security policy, unpublished apps can only have a 7-day authorization period. After the OAuth security token expires, the connection is no longer authorized and any module relying on it will fail.

**Solution**

**Option 1:**

**To avoid weekly reauthorization**, you can update the publishing status of your project.

If you update your project to the **In production** status, you will not be required to reauthorize the connection weekly.

Change the status of your project by following these steps:

1. Log in to the Google Cloud console.
2. Navigate to the **Oauth consent screen**.
3. Click the **Publish app** button next to your app.
4. If you see the notice **Needs verification**, you can choose whether to go through the [Google verification process](https://support.google.com/cloud/answer/13463073?visit_id=638357423877979226-2405331664&rd=1#exceptions-ver-reqts) for the app or to connect to your unverified app. Currently connecting to unverified apps works in Celonis platform, but we cannot guarantee the Google will allow connections to unverified apps for an indefinite period.

For more information regarding publishing statuses, refer to the **Publishing status** section of [Google's Setting up your OAuth consent screen help](https://support.google.com/cloud/answer/10311615#zippy=) and our [Community page](https://community.make.com/t/gmail-google-drive-verification-issues-error-400-how-to-solve/27432).

**Option 2**

If you keep your project in the **Testing** status, you will be required to reauthorize your connection in Celonis platform every week.

Reauthorize your Google connection by following these steps:

1. Log in to Celonis platform.
2. Go to **Connections**.
3. Find your Google connection and click **Reauthorize** button.

   **Note**

   To prevent the expiration of your Google connection, we suggest you to reauthorize the connection every week.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## data-integration/connectors/connecting-to-google-sheets

# Connecting to Google Sheets (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Google Sheets extractor lets you bring data stored in individual Google Sheets into the Celonis Platform for process mining and analysis. It supports the following basic features:

**Important**

This extractor's use and transfer to any other app of information received from Google APIs adheres to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes) including the Limited Use requirements.

Expand all

[## Before you begin](#UUID-b2c29a4b-f4f6-8151-c76c-819772335423_section-id235201702380005_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Google Sheets URL required](#UUID-b2c29a4b-f4f6-8151-c76c-819772335423_section-id235201703576_body)

As part of the Google Sheets extractor configuration, you must provide the URL to the specific Google Sheet you want to extract data from.

**Important**

You must have direct access to the Google Sheet URL. Using a shared or restricted link that you cannot access will prevent successful authentication.

[### Google Sheets authentication methods](#UUID-b2c29a4b-f4f6-8151-c76c-819772335423_section-id23520170834593_body)

To establish the connection, you only need to provide the URL of the specific Google Sheet you want to extract data from. After configuring the extractor, a Google authorization window opens where you must grant **Celonis Extractor for Google Sheets** permission to access the file. Once access is approved, the connection is authenticated using your Google account credentials through OAuth 2.0.

**Important**

You must have direct access to the Google Sheet URL. Using a shared or restricted link that you cannot access will prevent successful authentication.

To grant access, in the Google authorization window, select the your account with permission to access the URL, and when prompted for permission, select **Allow**.

[## Configuring the Google Sheets extractor](#UUID-b2c29a4b-f4f6-8151-c76c-819772335423_section-idm2533520172636398_body)

This section describes the basic setup of configuring the Google Sheets extractor. To configure the extractor:

**Note**

After configuring the extractor connection, the Google authorization window should open. Select your account with access to the provided URL, and when prompted for permission, select **Allow**. For more information, see [Google Sheets authentication methods](connecting-to-google-sheets.html#UUID-b2c29a4b-f4f6-8151-c76c-819772335423_section-id23520170834593 "Google Sheets authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-greenhouse

# Connecting to Greenhouse (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Greenhouse extractor integrates the Celonis Platform with Greenhouse Recruiting to retrieve job, candidate, and interview data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172653079434_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Greenhouse authentication methods](#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172653773185_body)

The Greenhouse REST API uses OAuth2 authentication. The following fields are required during configuration:

- API URL
- API Version
- Username
- Password

**Note**

This user profile must have API credentials access enabled in the Developers Permissions area. With API credentials access, the user can then access **Configure - Dev Center - API Credential Management**.

[### Available Greenhouse endpoints](#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172655378589_body)

The default Greenhouse extractor allows you to call these endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | EV Data | Retrieves sustainability ratings and ESG data for suppliers. |
| GET | List Applications | List all of an organization’s applications. |
| GET | List Approvals For Job | List all of a job’s approval flows. |
| GET | List Candidates | List all of an organization’s candidates. |
| GET | List Close Reasons | List all of an organization’s close reasons. |
| GET | List Job Openings | List all of a job’s openings. |
| GET | List Job Posts | List all of an organization’s job posts. |
| GET | List Jobs | List all of an organization’s jobs. |
| GET | List Scheduled Interviews | List all of an organization’s scheduled interviews. |
| GET | List Scorecards | List all of an organization’s scorecards. |
| GET | List Sources | Lists an organization’s sources, grouped by strategy. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | EV Data | Retrieves sustainability ratings and ESG data for suppliers. |
| GET | List Applications | List all of an organization’s applications. |
| GET | List Approvals For Job | List all of a job’s approval flows. |
| GET | List Candidates | List all of an organization’s candidates. |
| GET | List Close Reasons | List all of an organization’s close reasons. |
| GET | List Job Openings | List all of a job’s openings. |
| GET | List Job Posts | List all of an organization’s job posts. |
| GET | List Jobs | List all of an organization’s jobs. |
| GET | List Scheduled Interviews | List all of an organization’s scheduled interviews. |
| GET | List Scorecards | List all of an organization’s scorecards. |
| GET | List Sources | Lists an organization’s sources, grouped by strategy. |

[### Further Greenhouse information](#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172656440512_body)

For further information, see: [Greenhouse Help - Harvest API](https://developers.greenhouse.io/harvest.html).

[## Configuring the Greenhouse extractor](#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172660845963_body)

This section describes the basic setup of configuring the Greenhouse extractor. To configure the extractor:

**Note**

For configuration, the Greenhouse extractor has specific requirements for the user permissions. For more information, see [Greenhouse authentication methods](connecting-to-greenhouse.html#UUID-f3918687-b1b1-7997-3c7e-f00bf22d1dd0_section-id235172653773185 "Greenhouse authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-happyfox

# Connecting to HappyFox (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis HappyFox extractor integrates the Celonis Platform with your HappyFox Help Desk to retrieve ticketing, user, and knowledge base data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-9a79fd5c-854e-1d86-5d5f-b79dcf2a231d_section-id235172677647659_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### HappyFox authentication methods](#UUID-9a79fd5c-854e-1d86-5d5f-b79dcf2a231d_section-id235172678116164_body)

The HappyFox REST API uses basic authentication. To connect to your HappyFox instance, you need to provide a username and password.

[### Available HappyFox endpoints](#UUID-9a79fd5c-854e-1d86-5d5f-b79dcf2a231d_section-id235172680265342_body)

The default HappyFox extractor allows you to call these endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Canned actions | Retrieve data about canned actions. |
| GET | Contact groups | Retrieve data about contact groups. |
| GET | Knowledge articles | Retrieve data about knowledge articles. |
| GET | Knowledge sections | Retrieve data about knowledge sections. |
| GET | Staff | Retrieve data about staff. |
| GET | Ticket categories | Retrieve data about ticket categories. |
| GET | Ticket custom fields | Retrieve data about custom fields. |
| GET | Ticket priorities | Retrieve data about ticket priorities. |
| GET | Ticket statuses | Retrieve data about ticket statuses. |
| GET | Tickets | Retrieve data about tickets. |
| GET | User custom fields | Retrieve data about user custom fields. |
| GET | Users | Retrieve data about users. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Canned actions | Retrieve data about canned actions. |
| GET | Contact groups | Retrieve data about contact groups. |
| GET | Knowledge articles | Retrieve data about knowledge articles. |
| GET | Knowledge sections | Retrieve data about knowledge sections. |
| GET | Staff | Retrieve data about staff. |
| GET | Ticket categories | Retrieve data about ticket categories. |
| GET | Ticket custom fields | Retrieve data about custom fields. |
| GET | Ticket priorities | Retrieve data about ticket priorities. |
| GET | Ticket statuses | Retrieve data about ticket statuses. |
| GET | Tickets | Retrieve data about tickets. |
| GET | User custom fields | Retrieve data about user custom fields. |
| GET | Users | Retrieve data about users. |

[### Further HappyFox information](#UUID-9a79fd5c-854e-1d86-5d5f-b79dcf2a231d_section-id235172682056994_body)

For further information about Happyfox APIs, see: [Happyfox Support - Developers - APIs](https://support.happyfox.com/kb/section/131/).

[## Configuring the HappyFox extractor](#UUID-9a79fd5c-854e-1d86-5d5f-b79dcf2a231d_section-id235172682970898_body)

This section describes the basic setup of configuring the HappyFox extractor. To configure the extractor:

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-ibm-db2

# Connecting to IBM Db2 (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis IBM Db2 extractors allows you to transfer data from IBM Db2-based systems into the Celonis Platform for process mining and analysis. They support the following basic features:

**Note**

There are two Celonis IBM Db2 extractors:

- IBM Db2 (\*NIX / Win)
- IBM Db2 (AS 400)

Except where noted, this documentation refers to both extractors collectively as the IBM Db2 extractor. For connection setup, they share the same features, authentication method, and connection parameters, with the exception of their JDBC string formats.

Expand all

[## Before you begin](#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-id235186317449441_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-ibm-db2.html#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The IBM Db2 extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the IBM Db2 extractor](#UUID-043803b4-787b-3f57-0562-769827aa49c3_section-idm2533518634358530_body)

This section describes the basic setup of configuring the IBM Db2 extractor. To configure the extractor:

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
   2. For **Database Type**, select either **IBM Db2 (\*NIX / Win)** or **IBM Db2 (AS 400)**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `50000`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-ibm-db2.html#UUID-043803b4-787b-3f57-0562-769827aa49c3_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           - For **IBM Db2 (\*NIX / Win)**:

             ```
             jdbc:db2://<host>:<port>/<database>:property1=value1;property2=value2;jdbc:db2://<host>:<port>/<database>
             ```
           - For **IBM Db2 (AS 400)**:

             ```
             jdbc:as400://<host>/<database>;property1=value1;property2=value2;
             ```

           **Note**

           For more information on connecting to IBM Db2 with JDBC strings, see the [IBM Db2 documentation](https://www.ibm.com/docs/en/db2/12.1.0?topic=cdsudidsdjs-url-format-data-server-driver-jdbc-sqlj-type-2-connectivity).
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

## data-integration/connectors/connecting-to-ibm-netezza

# Connecting to IBM Netezza (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis IBM Netezza extractor allows you to transfer data from IBM Netezza data warehouses into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm2533518655374372_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-ibm-netezza.html#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The IBM Netezza extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the IBM Netezza extractor](#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_section-idm2533518655480494_body)

This section describes the basic setup of configuring the IBM Netezza. To configure the extractor:

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
   2. For **Database Type**, select **Netezza**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your server.
         - For **Port**, provide the port to connect to (Default is `5480`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-ibm-netezza.html#UUID-e16e1914-6708-9ec6-1475-f64e53933daa_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:netezza://<host>:<port>/<database_name>[?property1=value1&property2=value2...]
           ```

           **Note**

           For more information on connecting to IBM Netezza with JDBC strings, see the [IBM Netezza documentation](https://www.ibm.com/docs/en/netezza?topic=jdbc-connection-strings).
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

## data-integration/connectors/connecting-to-intersystems-cache

# Connecting to Intersystems Caché (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis InterSystems Caché extractor allows you to transfer data from InterSystems Caché databases into the Celonis Platform for process mining and analysis. It supports the following basic features:

Expand all

[## Before you begin](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-id235186483981012_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Choosing the connection type](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-03c6cc20-7eaf-8175-7b18-c8c3435aed9c_body)

Before creating a connection between your database and the Celonis Platform you must decide which connection type you want to use. Except where stated in [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), all databases have two basic connection types: Direct connections and Uplink connections via an on-premise extractor, as described below:

- **Direct connections**: Use direct connections when you want to allow the Celonis Platform direct access to your database without additional infrastructure. Meaning, you do not need to install, patch, or maintain on-premises extractors, which speeds up implementation, reduces complexity, and simplifies operations.

  **Note**

  By default, all cloud-based extractors are direct connections.
- **Uplink connections via an on-premise extractor**: Use uplink connections when you don't want to or can't allow the Celonis Platform to directly access your on-premise or private cloud database. The connection between the database and Celonis is then established using an on-premise extractor that's installed within your network ideally on a dedicated server.

  The role of the JDBC Extractor is to poll and fetch job requests from the Celonis Platform, before then submitting the execution information to the database via SQL queries. Once the data is retrieved from the database, the extractor fetches it and sends it back to the Celonis Platform. As such, the connection between the database and the Celonis Platform is always made by the extractor, with it continuously querying the Celonis Platform

  **Note**

  To use an uplink connection, you must install an on-premise JDBC extractor in your environment. To do so, see [JDBC Extractor](jdbc-extractor.html "JDBC Extractor"). Additionally, if you want to use a proxy (optional), see [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

[### Modifying your network settings for connections](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-7c1371b6-6a26-8c91-4030-4b904a29abe1_body)

For the database extractor to communicate with your database and the Celonis Platform, you must modify your network settings to allow access.

**Note**

Follow the instructions in network settings section below based on the connection type you using. Additionally, if you are using uplink connections, follow the instructions in [Celonis Platform IP addresses depending on the cluster](connecting-to-intersystems-cache.html#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-idm4597696002689634243006469694 "Celonis Platform IP addresses depending on the cluster") .

[#### Network settings for direct connections](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-idm4597696085308834242997888957_body)

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

[#### Network settings for uplink connections](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-idm4540235628342434242997842524_body)

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

[#### Celonis Platform IP addresses depending on the cluster](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-idm4597696002689634243006469694_body)

The respective clusters use multiple IPs each, so you need to enable all three of them in your firewall configuration to connect the on-premise extractor server and the cloud endpoint.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted if needed, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[### JDBC string guidelines](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0_body)

This section describes the guidelines for using custom JDBC strings in extractor configurations:

- **Authentication:** The **Credentials** fields in the extractor configuration are required and always used to authenticate the connection. Do not embed credentials directly in your JDBC string.
- **Encryption:** For standard (unencrypted) extractors (examples: SAP HANA, PostgreSQL), you can enable encryption by adding `encrypt=true` to the JDBC string. For encrypted extractors (examples: SAP HANA encrypted, PostgreSQL encrypted), connections are established with encryption enabled (`encrypt=true`) by default. You do not need to include this parameter in your JDBC string.
- **Certificate validation:** Do not include `validateCertificate=true` in your JDBC strings. Instead, use **Advanced Settings > Validate Certificate > Enabled**.
- **Additional properties:** You can include additional properties in either the JDBC string or the **Additional Properties** field. Do not specify the same properties in both places.

[#### Unsupported JDBC string connection parameters](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-d87fcf56-dce3-265b-7bc0-789b9a596401_body)

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

[### Authentication method – username and password](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-62febbf6-c14f-a11f-f758-fc8fcb6e87c4_body)

The Intersystems Caché extractor can connect to the database using a database user account. Provide the **username** and **password** for this account to authenticate the connection. Ensure this database user has sufficient permissions to access the data to be extracted.

[## Configuring the Intersystems Caché extractor](#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_section-idm2533518648938568_body)

This section describes the basic setup of configuring the Intersystems Caché extractor. To configure the extractor:

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
   2. For **Database Type**, select **Intersystems Caché**.
   3. For **Connection Type**, select either **Standard** or **Custom JDBC Connection String**.

      1. If you selected **Standard**:

         - For **Host**, enter the hostname or IP address of your database server.
         - For **Port**, provide the port to connect to (Default is `1972`).
         - For **Database Name**, enter the name of the database that contains the data you want to extract.
         - (Optional) For **Schema Name**, enter the name of the schema that contains the tables to extract.
         - (Optional) For **Additional Properties**, enter any additional connection properties required by your database or driver. Separate each with `;`.
      2. If you selected **Custom JDBC Connection String**:

         **Important**

         When using JDBC strings, there are specific guidelines to follow. For more information, see [JDBC string\_guildelines](connecting-to-intersystems-cache.html#UUID-05ae58a5-4275-a1d9-0bcb-a98a8b6a5032_UUID-0a3a2747-85c8-b9d5-9095-3c1144cdd7c0 "JDBC string guidelines").

         - For **JDBC Connection String**, provide your string. Use the format:

           ```
           jdbc:Cache://<server>:<port>/<namespace>[?property1=value1&property2=value2...]
           ```

           **Note**

           For more information on connecting to Amazon Athena with JDBC strings, see the [Intersystems Caché documentation](https://docs.intersystems.com/latest/csp/docbook/DocBook.UI.Page.cls?KEY=BGJD_connecting).
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

## data-integration/connectors/connecting-to-ironclad

# Connecting to Ironclad (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis IronClad extractor integrates the Celonis Platform with Ironclad to retrieve workflow and record data via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172701870045_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Ironclad authentication methods](#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172703112784_body)

The Ironclad REST API uses a bearer token for authentication. For more information about the bearer token, see: [Ironclad Developer - Bearer Authentication](https://developer.ironcladapp.com/reference/authentication-api).

[### Available Ironclad endpoints](#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172703735818_body)

The default Ironclad extractor allows you to call these endpoints:

Filter

- Method
- Endpoint
- Description

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Active workflows  Active workflows - approvals | Retrieve data about active workflows. |
| GET | Canceled workflows  Canceled workflows - approvals | Retrieve data about canceled workflows. |
| GET | Completed workflows  Completed workflows - approvals | Retrieve data about completed workflows. |
| GET | Paused workflows  Completed workflows - approvals | Retrieve data about paused workflows. |
| GET | Records | Retrieve data about records. |

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | Active workflows  Active workflows - approvals | Retrieve data about active workflows. |
| GET | Canceled workflows  Canceled workflows - approvals | Retrieve data about canceled workflows. |
| GET | Completed workflows  Completed workflows - approvals | Retrieve data about completed workflows. |
| GET | Paused workflows  Completed workflows - approvals | Retrieve data about paused workflows. |
| GET | Records | Retrieve data about records. |

[#### Further Ironclad information](#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172708229759_body)

For further information about the Ironclad REST API, see: [Ironclad - Developer - API](https://developer.ironcladapp.com/reference/getting-started-api).

[## Configuring the Ironclad extractor](#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172709156353_body)

This section describes the basic setup of configuring the Ironclad extractor. To configure the extractor:

**Note**

For configuration, the Ironclad extractor requires a bearer token for authentication. For information, see [Ironclad authentication methods](connecting-to-ironclad.html#UUID-b412a41a-1bae-207e-b6dc-420ee9945105_section-id235172703112784 "Ironclad authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-jira-cloud

# Connecting to Jira Cloud (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Jira Cloud extractor integrates the Celonis Platform with Atlassian Jira Cloud to retrieve project, issue, board, and workflow data via the REST API. It supports the following basic features:

**Zero-copy connectivity via Open Delta Sharing**

Jira Cloud is also supported using zero-copy connectivity via Open Delta Sharing, which is recommended over using this extractor. For more information, see [Delta Sharing](delta-sharing.html "Delta Sharing connections").

Expand all

[## Before you begin](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172724262044_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Jira Cloud authentication methods](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172724673985_body)

The Jira Cloud REST API uses basic authentication. To connect to your Jira Cloud instance, you need to provide your instance URL, a username, and a password.

**Note**

The password must be a Jira API token. For more information see the [Jira API token documentation](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).

[### Available Jira Cloud tables and columns](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172737087973_body)

The default Jira Cloud extractor allows you to retrieve data from the tables and columns list here.

[#### Available Jira Cloud tables and endpoints](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172738232214_body)

The following tables and their related APIs are available:

| Table | API |
| --- | --- |
| applicationProperties | /rest/api/2/application-properties |
| applicationRole | /rest/api/2/applicationrole |
| board | /rest/agile/1.0/board |
| board$backlog | /rest/agile/1.0/board/%s/backlog |
| board$epic | /rest/agile/1.0/board/%s/epic |
| board$issue | /rest/agile/1.0/board/%s/issue |
| board$spring | /rest/agile/1.0/board/%s/sprint |
| board$version | /rest/agile/1.0/board/%s/version |
| configuration | /rest/api/2/configuration |
| dashboard | /rest/api/2/dashboard |
| field | /rest/api/2/field |
| groups | /rest/api/2/groups/picker |
| issue | /rest/api/3/search/jql |
| issueLinkType | /rest/api/2/issueLinkType |
| issueSecuritySchemes | /rest/api/2/issuesecurityschemes |
| issueType | /rest/api/2/issuetype |
| notificationScheme | /rest/api/2/notificationscheme |
| permissionScheme | /rest/api/2/permissionscheme |
| project | /rest/api/2/project/search |
| projectCategory | /rest/api/2/projectCategory |
| projectType | /rest/api/2/project/type |
| resolution | /rest/api/2/resolution |
| role | /rest/api/2/role |
| serverInfo | /rest/api/2/serverInfo |
| status | /rest/api/2/status |
| statuscategory | /rest/api/2/statuscategory |
| user | /rest/api/2/user/search?username=. |
| workflow | /rest/api/2/workflow |

[#### Available Jira Cloud columns](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172739344932_body)

The following column types are supported by the Jira Cloud extractor:

- Any
- Array
- Date
- Datetime
- Number
- Option
- Option-with-child
- String
- User
- Version

**Note**

For all other column types, you must change the type from custom field to a string for it to be visible.

[#### Further Jira Cloud information](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-idm4587629586417634230923081461_body)

- **Data access**: The extractor performs read-only operations on your Jira data. No writing changes (like updates, deletions) will be performed at any time during the extraction process.
- **Security**: Transfer of the data from the Jira system to the Celonis Platform is secured through HTTPS, which allows for an encrypted exchange of information.

For further information about the Jira Cloud REST API, see: [Atlassian Developer - REST API](https://developer.atlassian.com/server/jira/platform/rest-apis/).

[## Configuring the Jira Cloud extractor](#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172751103272_body)

This section describes the basic setup of configuring the Jira Cloud extractor. To configure the extractor:

**Note**

For configuration, the Jira Cloud extractor requires a bearer token be used for the **Password** field. For more information, see [Jira Cloud authentication methods](connecting-to-jira-cloud.html#UUID-2b3a7ba4-d4bd-5095-26f8-5f2d46e03bc1_section-id235172724673985 "Jira Cloud authentication methods").

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

## data-integration/connectors/connecting-to-microsoft-dynamics-365-crm

# Connecting to Microsoft Dynamics 365 CRM (extractor)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis Bamboo extractor integrates the Celonis Platform with Dynamics 365 CRM to retrieve all available tables and entities dynamically via the REST API. It supports the following basic features:

Expand all

[## Before you begin](#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-id23517417788652_body)

This section details important prerequisites or prerequisite knowledge for using this extractor.

[### Microsoft Dynamics 365 CRM authentication methods](#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-id235174178348738_body)

The Microsoft Dynamics API uses OAuth2 for authentication. The following information is required for the connection set-up:

- Host URL of the system
- Tenant ID
- Client ID
- Client secret

To use the extractor, you must set-up the Azure Active Directory for third-party app authentication with Microsoft Dynamics 365 CRM. To do so:

**Note**

For more information, see the [Microsoft Azure documentation](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad?tabs=workforce-configuration).

1. Navigate to [portal.azure.com](http://portal.azure.com).
2. Open **Azure Active Directory**, and select **App registrations**.
3. Add a new app registration with the following information:

   - **Name**: Assign a name to the application.
   - **Supported account types**: Accounts in this organizational directory only.
   - **Redirect URI**: `<Your-Dynamics-Host-URL>/oauth`
4. After registering the application, an application ID (client ID) and directory ID (tenant ID) are created.

   **Note**

   Copy the application ID (client ID) and directory ID (tenant ID) values. These are required as input parameters for the connection set-up later.
5. Navigate to **Certificates & secret > client secrets**, and create a new client secret.

   **Important**

   Copy the client secret to a safe location, as it will be only visible now and masked afterwards.
6. Navigate to **API permissions** and add a new permission:

   - Select API permissions for **Dynamics CRM** (or **Dataverse** depending on your tenant).
   - Select **Delegated permissions**.
   - Select **Odata.Full.Access** (may be **user\_impersonation** in some tenants).
7. Go to the Microsoft Dynamics 365 system and navigate to **Application User under Advanced Settings > Security > Users** (or **Power Platform admin center > Environment > Settings > Users + Permissions > Application Users**) and enter the application id (client id) that was created in the previous steps.

The set-up on the source side is complete, and you can create a data connection in the Celonis Platform using the obtained inputs:

- Host URL of the system
- Tenant ID
- Client ID
- Client secret

[### Available Microsoft Dynamics 365 CRM endpoints](#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-id235174183394614_body)

The extractor supports extracting all tables that are available in your Microsoft Dynamic 365 CRM instance via APIs.

**Note**

The extractor retrieves the metadata of the available entities and objects dynamically via an API metadata call (`/api/data/v9.0/EntityDefinitions`).

[## Configuring the Microsoft Dynamics 365 CRM extractor](#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-id235174185502608_body)

This section describes the basic setup of configuring the Microsoft Dynamics 365 CRM extractor. To configure the extractor:

**Note**

For configuration, the Microsoft Dynamics 365 CRM extractor requires specific information obtained from registering a new application in the Azure Active Directory (ADD). For more information, see [Microsoft Dynamics 365 CRM authentication methods](connecting-to-microsoft-dynamics-365-crm.html#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-id235174178348738 "Microsoft Dynamics 365 CRM authentication methods").

[## Microsoft Dynamics 365 CRM extractor limitations and known issues](#UUID-452aa411-3782-219a-b678-0db5d2acd038_section-idm2533523624083544_body)

This section explains the limitations and known issues for the Microsoft Dynamics 365 CRM extractor:

- Data extraction may fail for tables where the query includes more than 50 calculated columns. This is a known limitation of the underlying [Microsoft Dataverse API](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/specialized-columns#calculated-column-limitations).

## Related topics

- [Extracting and transforming data](extracting-and-transforming-data.html "Extracting and transforming data")
- [Creating and managing data pools](creating-and-managing-data-pools.html "Creating and managing data pools")
- [Modeling your data](modeling-your-data.html "Modeling your data")


---

