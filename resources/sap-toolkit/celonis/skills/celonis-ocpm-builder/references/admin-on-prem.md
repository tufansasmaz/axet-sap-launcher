# Admin: On-Prem Clients

## admin/on-prem-clients/authenticating-on-prem-clients-manually

# Authenticating on-prem clients manually

While automated deployment is the standard for on-premise clients, environmental variables—such as restrictive firewalls, air-gapped systems, or non-standard shell configurations—often necessitate a manual override. Manual authentication provides administrators with granular control over the handshake between local agents and the Celonis Platform. By explicitly defining configuration parameters and OAuth scopes, you ensure a resilient connection that is tailored to your organization’s specific infrastructure requirements.

Expand all

[## 1. Update clients configuration](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493183959568_body)

- Go to the extracted folder:

  - To authenticate the Automation client:

    1. Open application-local.yml.
    2. Enter the value for the package-id setting:

       1. Go to the shared folder.
       2. Open package-manifest.json.
       3. Copy the packageId value.
       4. Paste the copied value in the package-id field in application-local-yml.
    3. Repeat the steps for the ‘env’ and “team-domain” settings.
  - To authenticate the SAP extraction client:

    1. Follow the same procedure as for the automation agent.

[## 2. Register OAuth client](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493184533316_body)

To register a new OAuth client, follow the procedure [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").

Make sure you include on-prem client as part of your new OAuth client scope.

[## 3. Start OPC clients](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493379679429_body)

[### On Windows](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493384477167_body)

Use one of the following methods:

- **Management Tool:** (recommended)

  1. Go to the corresponding tab (automation agent or extractor agent).
  2. Click **install**.
  3. Click **start**.
- **Command line**

  Install on-prem clients by running commands from your command line tool:

  1. Go to the automation-agent folder.
  2. Open CelonisAgent.xml.
  3. Under <service>, provide the <id> parameter with a unique name, for example: `celonis-agent-[packageId]`.
  4. Save the file and exit.
  5. Open the command line as administrator at the automation-agent location.
  6. Run:

     ```
     CelonisAgent.exe install
     ```
  7. Run:

     ```
     CelonisAgent.exe start
     ```
  8. Repeat these steps for the SAP extraction client.

[### On Linux](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493435944065_body)

Use one of the following methods:

- **Management Tool:** (recommended)

  1. Go to the corresponding tab (automation agent or extractor agent).
  2. Click **install**.
  3. Click **start**.
- **Management Tool using the command line:**

  This option allows you to install on-prem clients using a command line application that you navigate through with your keyboard.

  1. In the terminal, go to the shared folder and run:

     ```
     sudo ./opc-management-tool-cli
     ```
  2. Go to the corresponding tab (automation agent or extractor agent).
  3. Click **install**.
  4. Click **start**.
- **Command line:**

  **Important**

  To make sure you don't run into any permissions-related issues, complete the next step: [4. Assign permissions to on-prem clients](authenticating-on-prem-clients-manually.html#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493515130581 "4. Assign permissions to on-prem clients")

  1. Open terminal.
  2. Run:

     ```
     ‘sudo nano /etc/systemd/system/celonis-automation-agent-<PACKAGE-ID-HERE>.service’
     ```
  3. Paste the following (make sure to edit the paths to match your on-prem clients installation path):

     ```
     [Unit]
     Description=Celonis on premise agent to execute automation type of tasks. This agent belongs to dk-test-OPC package.
     ConditionFileIsExecutable=/home/ubuntu/celonis-on-prem-clients-v1.1.4-macOS-Linux/automation-agent/start-celonis-agent.sh


     [Service]
     StartLimitInterval=5
     StartLimitBurst=10
     ExecStart=/home/ubuntu/celonis-on-prem-clients-v1.1.4-macOS-Linux/automation-agent/start-celonis-agent.sh

     WorkingDirectory=/home/ubuntu/celonis-on-prem-clients-v1.1.4-macOS-Linux/automation-agent
     User=<YOUR-USER-HERE>


     Restart=always

     RestartSec=120
     EnvironmentFile=-/etc/sysconfig/celonis-automation-agent-fc19167b-7e07-4e8c-b9c1-4bc0d647d000

     [Install]
     WantedBy=multi-user.target
     ```
  4. Save the file.
  5. Run:

     ```
     sudo systemctl daemon-reload
     ```
  6. Run:

     ```
     sudo systemctl enable celonis-automation-agent-<PACKAGE-ID-HERE>.service
     ```
  7. Run:

     ```
     sudo systemctl start celonis-automation-agent-<PACKAGE-ID-HERE>.service
     ```

  On-prem clients are now running. you can verify that by running:

  ```
  systemctl list-units --type=service --all | grep celonis
  ```

[## 4. Assign permissions to on-prem clients](#UUID-98b46ab1-b241-df49-d382-304a433887de_section-idm234493515130581_body)

1. In your Celonis Platform instance, go to **Admin & Settings** > **On-prem clients**.
2. Find the package that you create and expand it.
3. Click the three dots icon of the OPC agent you want to authenticate and select **Permissions**.
4. Search for the appkey that you created earlier.
5. Give the Operate Agent appkey necessary permissions and **Save**.

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/configuring-an-on-premise-extractor

# Configuring an on-premise extractor

**Note**

Documentation for configuring the JDBC Extractor has been migrated to [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

To connect your on-premise data sources to the Celonis platform, you must configure the extractor by editing the local configuration file. This setup establishes the secure "Uplink" connection between your infrastructure and the cloud.

Expand all

[## Editing the local configuration file](#UUID-7e0b402e-ecf4-6515-2c0c-01057418c0c6_section-id23550282339197_body)

To edit your local configuration file:

1. Locate and open the `application-local.yml` file in your extractor's installation directory.
2. Navigate to the `uplink` section of the file.
3. Configure the following parameters:

   - **enabled**: Add true if the extractor should be activated, false otherwise.
   - **url**: Add the Celonis platform team that the data is sent to. The format to use is:

     ```
     https://{team}.{cluster}.celonis.cloud/uplink/api/public/uplink
     ```
   - **clientId**: Add the client ID of the uplink endpoint that you have already set-up.
   - **clientSecret**: Add the client secret of the uplink endpoint that you have already set-up.

     - To use a proxy for this, see: [Proxy settings for on-premise extractors](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").
     - To secure your client secret using Vault, see: [Using Vault as a Password Provider to secure the clientSecret](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-3c3ba6d4-6bbe-2700-7cba-46fab3022305 "Using Vault as a Password Provider to secure the clientSecret")
   - **parallelThreads**: Set the maximum parallel extractions limit by entering a number between 5 and 40 here.

   An example YML configuration is below:

   ```
   uplink:
     enabled: <true or false>
     url: <url for uplink>
     clientId: <client id>
     clientSecret: <client secret>
     parallelThreads: <number between 5 and 40>
   ```

## Related topics

- [System requirements](system-requirements-of-an-on-premise-extractor-server.html "On-premise extractor (legacy) system requirements")
- [Connecting multiple teams](how-do-i-connect-to-multiple-teams-with-the-same-extractor-.html "Connecting multiple teams to the same extractor")
- [Proxy settings for on-premise extractors](proxy-settings-for-on-prem-clients-2401304.html "Proxy settings for on-premise extractors")


---

## admin/on-prem-clients/creating-on-prem-system-connections

# Creating on-prem system connections

Establish a secure bridge between your Celonis Platform and local third-party applications. By configuring these connections in Studio, you enable Action Flows to interact directly with your on-premise systems—such as SAP or Oracle—allowing for seamless automation of business processes across your entire infrastructure.

Your new system connection has been created. You can start creating your first automations with Action Flows. See [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio").

Expand all

[## Before you begin](#UUID-ecc2bb96-3828-eb08-a842-77b35cf0b7fa_section-id235477247916192_body)

To create an on-prem system connection in the Celonis Platform, you need the following:

- **User permissions**: Ensure your user profile is assigned the Analyst role within the relevant Workspace and has the 'Manage On-premise Adapters' permission enabled in the **Admin & Settings - Permissions** panel.
- **On-prem client status**: Ensure the on-prem client is installed and Running. You can verify this in **Admin & Settings - On-prem clients**.
- **System access**: Confirm that the server hosting your on-prem client has the necessary network permissions to communicate with your target application (e.g., SAP, Oracle, or SQL Server).

[## Creating an on-prem system connection](#UUID-ecc2bb96-3828-eb08-a842-77b35cf0b7fa_section-id235477247961532_body)

To create an on-prem system connection in the Celonis Platform:

1. Click **Studio - Automation** and select **On-Prem System Connections**.

   |  |
   | --- |
   |  |

   This is where you can also preview and edit existing system connections.
2. In the On-prem system connection screen, click **Set up on-prem system connections**.
3. In the pop-up, enter a unique system connection name.
4. Select an installation package.

   **Tip**

   The Installation Package represents the specific Automation Agent (OPC) that will tunnel the traffic. If you do not see any packages listed, ensure your Agent is correctly registered under **Admin & Settings - On-prem clients**.
5. Select the application for which you want to create automations and click **Save**.
6. Verify the connection status. Once saved, the new connection appears in the list. Ensure the status indicator is Green, signifying a successful handshake between Celonis and your on-prem application.

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [On-prem client logs](on-prem-client-logs.html "On-prem client logs")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/downloading-on-premise-jdbc-extractors

# Downloading on-premise JDBC Extractors

The latest JDBC extractor can be downloaded from the **Download Portal** by users with **MANAGE DOWNLOAD PORTAL** permissions in their Celonis Platform team.

**Note**

You only need to install the on-premise JDBC Extractor for Uplink connections. If you are using a Direct connection, the on-premise JDBC Extractor is not needed.

With the necessary permissions:

Once complete, either:

- If this is your first installation, proceed to [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor").
- If you are updating an existing installation, proceed to [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors").

Expand all

[## Before you begin](#UUID-e3e9d131-072c-00b1-59fc-2eb84652cd50_section-id235498064271411_body)

To download the JDBC Extractor, you need **MANAGE DOWNLOAD PORTAL** permissions in your Celonis Platform team.

To learn more about the download portal, see: [Download portal](download-portal.html "Accessing your download portal")

And to manage admin permissions, see: [Available permissions](available-permissions.html "Available Celonis Platform permissions")

[## Downloading on-premise JDBC Extractors](#UUID-e3e9d131-072c-00b1-59fc-2eb84652cd50_section-id23549806433297_body)

With the necessary permissions, to download the on-premise JDBC Extractors:

1. Navigate to **Admin & Settings** and then select the **Download Portal**:

   |  |
   | --- |
   |  |
2. In the **Download Portal**, find the latest version of the **JDBC (Database) Extractor**:

   |  |
   | --- |
   |  |
3. Select the archive link to start the download.
4. Verify the download checksum against the one in the **Download Portal** by following the instructions on [Download Portal file security](download-portal-security.html "Download Portal file security").

## Related topics

- [Download portal](download-portal.html "Accessing your download portal")
- [Getting started](getting-started-with-on-premise-jdbc-extractors.html "Getting started with on-premise JDBC Extractors")
- [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors")


---

## admin/on-prem-clients/getting-started-with-on-premise-jdbc-extractors

# Getting started with on-premise JDBC Extractors

The on-premise JDBC Extractor offers several options for Uplink connections to the Celonis Platform. This page describes the general steps based on the supported connection type.

**Note**

Direct connections do not require an on-premise JDBC Extractor. For information on Direct connections, see [Direct connections](jdbc-extractor.html#UUID-a56f8ca4-2a92-0f30-be35-79db70261ace_section-id235454185093619 "Direct connections").

For information on which connection types are supported for specific databases, see [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types").

Expand all

[## Connecting using a native Uplink connection](#UUID-6142427c-373d-004d-d356-81b0742bab3e_N1772786479853_body)

Navigate to [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), find your database in the table, and confirm if Uplink connections are natively supported.

**Note**

If the database is not supported with a native Uplink connection, see [Connecting using a custom JDBC driver with an Uplink connection](getting-started-with-on-premise-jdbc-extractors.html#UUID-6142427c-373d-004d-d356-81b0742bab3e_N1772786515386 "Connecting using a custom JDBC driver with an Uplink connection").

If Uplink connections are natively supported:

1. Confirm the server you want to install the JDBC Extractor on meets the [prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors").
2. [Download the JDBC Extractor](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors").
3. [Configure the JDBC Extractor](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

   **Note**

   When configuring the JDBC Extractor, at a minimum, you must configure the [uplink values](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors"), and if you are using a proxy, the [proxy values](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

   After configuring the minimum required configurations for your environment, it recommended (for troubleshooting purposes) to run the JDBC Extractor and test the connection between it and the Celonis Platform. After you confirm the connection is successful, incrementally continue to configure other required values, restarting the JDBC Extractor and testing the changes in Celonis Platform with each change.
4. [Start the JDBC Extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor") in your environment.
5. Navigate to [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), and find your database in the table. Select the link to navigate to your database's documentation, and follow the instructions there for connecting to the Celonis Platform.

[## Connecting using a custom JDBC driver with an Uplink connection](#UUID-6142427c-373d-004d-d356-81b0742bab3e_N1772786515386_body)

If the table on [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types") shows Uplink connections are not natively supported, you must use a custom JDBC driver with the on-premise Celonis JDBC Extractor to establish an Uplink connection.

To use a custom JDBC driver:

1. Confirm the server you want to install the JDBC Extractor on meets the [prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors").
2. [Download the JDBC Extractor](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors").
3. [Install your database's custom driver JAR](connecting-to-a-database-using-custom-jdbc-driver.html#UUID-78046e48-79c2-40f2-23c2-807934c07b06_section-idm4597696061860834243090270675 "Adding your custom JDBC driver") in the JDBC Extractor directory.
4. [Configure the JDBC Extractor](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors").

   **Note**

   When configuring the JDBC Extractor, at a minimum, you must configure the [uplink values](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors"), and if you are using a proxy, the [proxy values](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

   After configuring the minimum required configurations for your environment, it recommended (for troubleshooting purposes) to run the JDBC Extractor and test the connection between it and the Celonis Platform. After you confirm the connection is successful, incrementally continue to configure other required values, restarting the JDBC Extractor and testing the changes in Celonis Platform with each change.
5. [Start the JDBC Extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor") in your environment.
6. Navigate to [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types"), and find your database in the table. Select the link to navigate to your database's documentation, and follow the instructions there for connecting to the Celonis Platform.

## Related topics

- [JDBC Extractor](jdbc-extractor.html "JDBC Extractor")
- [Supported database types](connecting-to-databases.html#UUID-f10ddab5-f1b1-5f80-cd37-d1143ac47221_section-idm2533518303545850 "Supported database types")
- [Prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors")


---

## admin/on-prem-clients/how-do-i-set-up-an-on-premise-extractor-

# Configuring on-premise JDBC Extractors

Celonis on-premise extractors are designed for deployment on physical local servers or within secure private cloud environments (VPCs/VNets) to bridge the gap between your protected data and the Celonis Platform.

This page covers both required and optional configuration settings for the JDBC Extractor.

Expand all

[## Before you begin](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id235452307387223_body)

To configure the JDBC Extractor, the following prerequisites are required:

- Ensure your environment meets the required [Prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors").
- If you have not already done so, complete [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors").
- When configuring the JDBC Extractor, at a minimum, you must configure the uplink values and if you are using a proxy, the proxy values.
- When making changes to an existing JDBC Extractor configuration, you must restart the extractor for the changes to take effect.

  **Note**

  When configuring the JDBC Extractor, at a minimum, you must configure the [uplink values](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors"), and if you are using a proxy, the [proxy values](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

  After configuring the minimum required configurations for your environment, it recommended (for troubleshooting purposes) to run the JDBC Extractor and test the connection between it and the Celonis Platform. After you confirm the connection is successful, incrementally continue to configure other required values, restarting the JDBC Extractor and testing the changes in Celonis Platform with each change.

[## (REQUIRED) Configuring Uplink connection values](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id23545083642806_body)

The first step to figure your on-premise JDBC Extractor is to create an Uplink connection in the Celonis Platform. This will provide the **Client ID** and **Client Secret** keys required by the JDBC Extractor configuration to connect to the Celonis Platform.

**Warning**

To function properly, each JDBC Extractor requires unique **Client ID** and **Client Secret** keys. Cloning or copying an extractor's keys to multiple machines will cause the extractor to malfunction.

This means you must configure the Uplink connection values for each JDBC Extractor used in your environment.

To do so, in the Celonis Platform:

1. Go to your team settings, and then **Admin & Settings > Uplink Integrations**.
2. Select **Connect new system**, and create a new uplink with the type **Connector**.
3. Copy the **Client ID** and **Client Secret** keys, and save them to a secure location, as they are **required** in future steps.

   **Important**

   The **Client ID** and **Client Secret** keys are required as part of the JDBC Extractor configuration. This is the only time the keys will be shown. If you do not retain a copy, you must create a new Uplink Integration to complete follow-on steps.

For the JDBC Extractor to connect to your environment, you must next configure the `uplink` values in the `application-local.yml`.

To do so:

1. Navigate to your JDBC Extractor package directory, and open the `application-local.yml`, located in the base directory.
2. Locate the `uplink` values.
3. Configure the following `uplink` values in the `application-local.yml`:

   **YAML indentation and syntax**

   When making any changes to the `application-local.yml`, ensure you maintain the exact whitespace and nesting hierarchy provided in the template. Additionally, when adding any new configurations, ensure you follow YAML syntax. Failing to do so may cause the extractor to fail on startup.

   ```
   uplink:
     enabled: true
     url: https://[team].[realm].celonis.cloud/uplink/api/public/uplink
     clientId: id
     clientSecret: secret
   ```

   1. `uplink.url`: Update with your team and realm information.
   2. `uplink.clientId`: Provide the **Client ID** key you saved when creating the uplink.
   3. `uplink.clientSecret`: Provide the **Client Secret** key you saved when creating the uplink.
4. For these changes to take effect, you must start the extractor using your preferred method as described in [Running JDBC extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor").

   **Note**

   If you are using a proxy, perform the steps in [Proxy settings for on-premise extractors](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors") before performing the next steps.
5. Once the JDBC Extractor, is started:

   1. In the Celonis Platform, navigate to **Admin & Setting > Uplink Integrations**.
   2. Locate your uplink in the list, and verify there is a circle checkmark () in the **Status** column.

      **Note**

      It may take may several minutes before the JDBC Extractor initially pings the platform.

[## Additional JDBC Extractor configurations](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_id_HowdoIsetupanonpremiseExtractor-StepBDownloadandConfiguretheExtractor_body)

The following sections describe how to configure the JDBC Extractor for your environment.

**Important**

If you have not already done so, [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors") and [(REQUIRED) Configuring Uplink connection values](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id23545083642806 "(REQUIRED) Configuring Uplink connection values")are required before starting.

[### Default JDBC Extractor values file](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id23545084493591_body)

The following is a copy of the **default** `application-local.yml` located in the JDBC Extractor package. Refer back to the default values as needed:

```
logging:
  level:
    org.apache.parquet.hadoop: WARN
    org.springframework.security: INFO
    #cloud.celonis: TRACE
  file: jdbc_connector.log

uplink:
  enabled: true
  url: https://[team].[eu-1].celonis.cloud/uplink/api/public/uplink
  clientId: id
  clientSecret: secret

feature:
    skip-record-sanitization:
      connection-id-whitelist: # adding entries here ignores the global feature flag
        - "example-connection-id-asdf98af"

server:
  port: 8099

spring:
  servlet:
    multipart:
      max-file-size: 1000MB
      max-request-size: 1000MB

celonis:
  #proxy-config-path: proxy.yml
  #internal-proxy-config-path: proxy.yml
```

[### (Recommended) Managing JDBC Extractor log files](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id235419665482812_body)

To prevent JDBC Extractor logs from consuming unnecessary disk space, you can configure a rolling policy in the `application-local.yml`. To do so:

1. Open your `application-local.yml`, and locate the `logging` values.
2. Add the following values in the `logging` section:

   ```
   logging:
   ...
     logback:
       rollingpolicy:
         max-history: 7          # Retains logs for 7 days
         total-size-cap: 1GB     # Limits total log storage to 1GB
   ```
3. Ensure the `logback` values are correctly indented and nested, and save the file.
4. For these changes to take effect, you must start/restart the extractor using your preferred method as described in [Running JDBC extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor").

You have now configured the logging values for the JDBC Extractor. For more information on log files, see [Accessing log files](troubleshooting-jdbc-connections.html#UUID-01cae054-95c5-c17c-fab6-792bbb003e96_section-id235419649730332 "Accessing log files").

[### Proxy settings for on-premise extractors](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2_body)

**Note**

Using proxies is optional and it is not required by on-premise extractors. It is only needed if your infrastructure demands it.

If you need to use a proxy server between the on-premise extractor and the source system or between the on-premise extractor and Data Integration in the cloud, you need to create a configuration file per connection and then link their configuration files in the extractor configuration.

#### Specifying the location of the configuration file

|  |
| --- |
|  |

In the file application.yml (see above) you need to add the configurations displayed on the left

- **proxy-config-path**: This defines the path to the configuration of the proxy server between the source system and the extractor.
- **internal-proxy-config-path**: This defines the path to the configuration of the proxy server between the extractor and the cloud endpoint. It is called "internal" because it is used for the communication of two components provided by Celonis.

The path always needs to be defined relative to the extractor file.

Example 1: If the configuration file proxy.yml for the proxy between the source system and the extractor is in the same folder, the configuration should look as follows:

**application-local.yml**

```
celonis:
  proxy-config-path: proxy.yml
```

Example 2: If the configuration file proxy.yml for the proxy between the extractor and Data Integration in the cloud is in the subfolder conf, the configuration should look as follows:

**application-local.yml**

```
celonis:
  internal-proxy-config-path: conf/proxy.yml
```

#### Creating a configuration file for the proxy server

For each separate proxy server you need to create a configuration file with the connection details:

- **enabled**: true if the proxy server should be activated, false otherwise
- **host**: the IP address or hostname of the proxy server
- **port**: the port at which the server can be reached
- **user** (optional): the user name for basic authentication with the proxy
- **password** (optional): password for basic authentication with the proxy

[### Using Vault as a Password Provider to secure the clientSecret](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-3c3ba6d4-6bbe-2700-7cba-46fab3022305_body)

This configuration guide explains how to use Vault to secure your Celonis-specific clientSecret for the Uplink.

#### Step 1: Download the connector.jar file

You can find the connector.jar file in the Celonis Platform [Download Portal](https://docs.celonis.com/en/download-portal.html).

1. Click **Admin & Settings** > **Download Portal**.
2. Scroll down and open **JDBC (Database) Extractor**.

You'll see a list of the available connector-jdbc.jar files. Select the latest one.

#### Step 2: Generate a private key file

1. Run the help command to see all your options.

   ```
    java -jar connector-jdbc.jar help-vault
   ```
2. Place the connector.jar file in the same directory as the extractor.
3. Generate a private key file, using the command:

   ```
    java -jar connector-jdbc.jar genkey
   ```

   You will be asked to enter a master password. This password will later be used to encrypt your private passwords.
4. Save the output to a file which is only readable by your service account.

   For example, in the YAML file below, we've used vault.file.

#### Step 3: Adjust the configuration of the application-local.yml

1. Add or update this line in your application.yml file:

   ```
   credentialsProvider:VAULT_CREDENTIALS_PROVIDER:vaultFile:<Path to your keyfile>
   ```
2. You can encrypt the clientSecret using:

   ```
    java -jar connector-jdbc.jar genpass
   ```
3. Enter your master password and the password you want to encrypt.

   Use the encrypted password in the configuration files where appropriate.

Here's an example of the adjusted application-local.yml file:

```
uplink:
  enabled: true
  url: http://dev.eu-1.celonis.cloud/uplink/api/public/uplink
  clientId: e102a1e3c3cabcf5cf6c74134ad25baaccbf83f80ea99262b6611bf902d3
  clientSecret: 676sad7a6d7as5d6asd564d5sa476766 65c6dc8b4feced32401b608792872e9cbe69a8ea9456f98dcd0887470245c9700c2eab0ffebe0536c7baea4717b799dfc9f21892d757ff48706404fd8f3587a26b1b220dc1098b71a4fdb7d66d67989b1ff52b2b34a5c04a6bc50767a283119f6be30ad81e31b99cf3de7304ec95e157a6cb649fc9680299c9427b3205167c36cb71c0a42911e7e879b4f44cf1c1bef3db7fe3c83a598b9c9289e86fe8dfcfcd5aa056ba7eea9426910fe92eee58b9a1cdc9e56216eb9e094d6750cc1609415c0c5280bb5ab285192943a5cdec899f5a8a83f1d9658d8b8a49de312353b918c2c5750c2a4d0adbdc5824a605325122663058b0144aa64c8a20dd57d7078af1274a9aaf0a7b03ea146df63797c64969bac57f2d8fd12d87bb59dbd6f245583bee0d73b23780dead86f763882b17000c239b34a154498c950803f05ded82d8c1a434a1005d99515e271c4ec0b8ad7eb9f3f017befb9cc9471f92b3c67791f85f6a694fe2ff2b96ffb5370113ac15bdd530bcac49a7f71b63e29846717a8aacb59ee0eaf6f29d5ca22608a472ac4c16df7278980e9dced90e562440ac510e8f304a3379bcc4e9daa776a68d099ff55ba7817063391175eb0734dbc101bad03a36cd7c7b58940f0bb3d69a9f2fc4b9179f25877c8c6cd544916bbd2d344aa5ce71fcef4cc31b864ce211cd0b1096d3d5e180de6886f109128d28ae24e9149fb
  useCredentialsProvider: true

credentialsProvider:
  enabled: false
  type: VAULT_CREDENTIALS_PROVIDER
  VAULT_CREDENTIALS_PROVIDER:
    vaultFile: /full/path/to/vault.file
```

#### Step 4: Restart the extractor server

[### Using external password providers for database connections](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-e39c7292-88a5-7211-c4ab-250706f2d211_body)

When extracting data from a database via JDBC, the connection is established using the credentials stored in the Celonis Platform to send requests. These credentials are encrypted, offering a secure connection between the database and the Celonis Platform. Despite this, you can also choose to use external password providers for your database connections.

The following external password providers can be configured:

- **Custom password provider**: The custom password provider needs to be packaged as a jar file and added to the class path of the extractor application.
- **CyberArk**: The CyberArk agent needs to be installed on the same on-premises extractor server in your network and provides the password for the database connection.

[#### Using a custom password provider](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-idm4540372909476834243120559015_body)

To use a custom password provider for the connection between your database and the Celonis Platform:

##### Step 1: Defining custom password provider

The first step to define your custom password provider is to implement a custom password provider. For this you will need our connector-external-clients.jar library.

With this library, you can implement a simple custom password provider like below:

```
package com.mycompany;

import cloud.celonis.connector.external.client.model.PasswordRequest;
import cloud.celonis.connector.external.client.model.PasswordResponse;
import cloud.celonis.connector.external.client.passwordprovider.CustomPasswordProvider;

public class MyConfidentialPasswordProvider implements CustomPasswordProvider {

    public PasswordResponse getPassword(PasswordRequest passwordRequest) {
        PasswordResponse passwordResponse = new PasswordResponse();
        passwordResponse.setPassword(myInternalPasswordProvider.getPassword());
        return passwordResponse;
    }
}
```

In this example, you have the following objects:

- **CustomPasswordProvider**: This can be used for providing the source system password or proxy passwords. In addition to this, you can provide passwords for multiple source systems. In order to differentiate between different types of password requests, you can use the PasswordRequest object.
- **PasswordRequest.passwordType**: An enum of type PasswordType, describing the type of password requested. Possible values are SOURCE\_SYSTEM, PROXY, INTERNAL\_PROXY.
- **PasswordRequest.host**: This field will be populated with the Server Name you specified in the data connection if the passwordType is SOURCE\_SYSTEM. If the passwordType is PROXY or INTERNAL\_PROXY, this field will be populated with the host in the proxy configuration.
- **PasswordRequest.username**: This field will be populated with the Username you specified in the data connection if the passwordType is SOURCE\_SYSTEM. If the passwordType is PROXY or INTERNAL\_PROXY, this field will be populated with the user in the proxy configuration.
- **PasswordRequest.password**: This field will be populated with the Password you specified in the data connection if the passwordType is SOURCE\_SYSTEM. If the passwordType is PROXY or INTERNAL\_PROXY, this field will be populated with the password in the proxy configuration.

And a further example using the PasswordRequest object to retrieve data for proxy and different source systems:

```
package com.mycompany;

import cloud.celonis.connector.external.client.model.PasswordRequest;
import cloud.celonis.connector.external.client.model.PasswordResponse;
import cloud.celonis.connector.external.client.passwordprovider.CustomPasswordProvider;

public class MyConfidentialPasswordProvider implements CustomPasswordProvider {

    public PasswordResponse getPassword(PasswordRequest passwordRequest) {
        PasswordResponse passwordResponse = new PasswordResponse();
        if(passwordRequest.getPasswordType() == PasswordType.PROXY) {
            passwordResponse.setPassword(myInternalPasswordProvider.getProxyPassword());
        } else if (passwordRequest.getHost().equals("prod-server-01") && passwordRequest.getUsername().equals("celonis")) {
            passwordResponse.setPassword(myInternalPasswordProvider.getPasswordForProdServer01());
        } else if (passwordRequest.getHost().equals("prod-server-02") && passwordRequest.getUsername().equals("celonis")) {
            passwordResponse.setPassword(myInternalPasswordProvider.getPasswordForProdServer02());
        } else {
            passwordResponse.setPasswordResponseStatus(PasswordResponseStatus.FAILED);
        }
        return passwordResponse;
    }
}
```

##### Step 2: Registering your custom password provider

In order to register your custom password provider, you need to add the following configuration to your application-local.yml file:

```
credentialsProvider:
     enabled: true
     type: CUSTOM_CREDENTIALS_PROVIDER
     CUSTOM_CREDENTIALS_PROVIDER:
     passwordProviderImplementation: com.mycompany.MyConfidentialPasswordProvider
```

You then need to package your custom password provider to a jar file and add it to the class path of the JDBC Extractor Application. This can be achieved with the following command:

```
java -Dloader.path=mycustom-password-provider-1.0-SNAPSHOT.jar -Dspring.config.location=application-local.yml -jar connector-jdbc.jar
```

[#### Using CyberArk as a password provider](#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-idm4606854155240034243120598089_body)

When using CyberArk as a password provider, the CyberArk agent needs to be installed on the same on-premises extractor server in your network and provides the password for the database connection. As the CyberArk password is constantly changing for security reasons, the database credentials are not stored in the Celonis Platform.

For the latest CyberArk documentation, see: [CyberArk Docs](https://docs.cyberark.com/).

To use CyberArk for the connection between your database and the Celonis Platform:

##### Step 1: Configure CyberArk requirements

- A CyberArk string needs to be prepared for the password that needs to be fetched from CyberArk. As an example:

  ```
  cyberark-sdk:appID=MY_APP_ID&amp;safe=MY_SAFE&amp;folder=MY_FOLDER&amp;policyId=MY_POLICY_ID&amp;Object=MY_OBJECT&amp;reason=MY_REASON
  ```
- In order for CyberArk integration to work, a CyberArk agent needs to be installed in the same server where the extractor server is installed

  On Linux, the service can be checked with the command below:

  ```
  sudo service aimprv start
  sudo service aimprv status
  ```
- The CyberArk agent needs to be able to resolve the CyberArk string that is going to be used. We recommend testing the CyberArk string with the local agent before testing with Celonis Platform.

  On Linux, the password string for the example above can be retrieved with the command below:

  ```
  /opt/CARKaim/sdk/clipasswordsdk GetPassword \
      -p AppDescs.AppID="MY_APP_ID" \
      -p Query="Safe=MY_SAFE;Object=MY_OBJECT"\
      -o Password
  ```

##### Step 2: Add CyberArk string to data connection

In the related database connection configuration, the CyberArk string needs to be provided in the password field.

##### Step 3: Update application-local.yml file

In the application-local.yml file of the extractor application, the following configuration needs to be added:

```
credentialsProvider:
  enabled: true
  type: CYBERARK_SDK
```

For example:

|  |
| --- |
|  |

##### Step 4: Restart extractor

You now need to restart the extractor for the changes to be implemented.

## Related topics

- [Using a custom JDBC driver](connecting-to-a-database-using-custom-jdbc-driver.html "Using a custom JDBC driver with the on-premise JDBC Extractor")
- [Running JDBC extractor](running-the-jdbc-extractor.html "Running the JDBC Extractor")
- [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors")


---

## admin/on-prem-clients/how-do-i-set-up-an-on-premise-extractor--2401299

# Setting up an on-premise extractor

Celonis on-premise extractors are designed for deployment on physical local servers or within secure private cloud environments (VPCs/VNets) to bridge the gap between your protected data and the Celonis Platform.

**Note**

Documentation for the JDBC Extractor has been migrated to [JDBC Extractor](jdbc-extractor.html "JDBC Extractor").

**Important**

Before starting the setup, ensure your environment meets the required [system requirements](system-requirements-of-an-on-premise-extractor-server.html "On-premise extractor (legacy) system requirements").

Expand all

[## Extractor setup on a Windows/Linux server](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-ExtractorSetuponaWindowsLinuxServer_body)

[### Set up the connection in Celonis Platform](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-StepASetuptheConnectionintheCelonisCloudTeamSettings_body)

1. Go to your team settings, and then **system/Uplink** integrations.
2. Create a new uplink with the type **Connector** (independent of which Connector type you would like to connect).
3. Copy the **Client ID** and **Client Secret** keys, and save them to a secure location, as they are required in future steps.

   **Important**

   This is the only time the keys are shown. If you do not copy and save them, you must create a new uplink to complete follow-on steps.

[### Download and configure the extractor](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-StepBDownloadandConfiguretheExtractor_body)

1. Download the extractor package.

   **Note**

   Unless you're using an older version of SAP, 4.6C or earlier or you use PI/PO, we recommend using our newer on-prem clients. For the instructions to install the new client, see [On-premises clients (OPC)](on-prem-clients.html "On-premises clients (OPC)"). The on-prem clients run mostly in the Celonis Platform cloud, so you'll get these benefits compared to the uplink-based on-premise extractors.

   If you still wish to get the on-prem extractor, contact the Celonis support team at [servicedesk@celonis.com](mailto:servicedesk@celonis.com ).
2. Configure the following `uplink` values in the `application-local.yml`:

   **YAML indentation and syntax**

   When making any changes to the `application-local.yml`, ensure you maintain the exact whitespace and nesting hierarchy provided in the template. Additionally, when adding any new configurations, ensure you follow YAML syntax. Failing to do so may cause the extractor to fail on startup.

   ```
   uplink:
     enabled: true
     url: https://[team].[realm].celonis.cloud/uplink/api/public/uplink
     clientId: id
     clientSecret: secret
   ```

   1. `uplink.url`: Update with your team and realm information.
   2. `uplink.clientId`: Provide the **Client ID** key you saved when creating the uplink.
   3. `uplink.clientSecret`: Provide the **Client Secrect** key you saved when creating the uplink.

#### Managing log files

To prevent logs from consuming unnecessary disk space, you can configure a rolling policy in the `application-local.yml`. To do so:

1. Open your `application-local.yml`, and locate the `logging` values.
2. Add the following values in the `logging` section:

   ```
   logging:
   ...
     logback:
       rollingpolicy:
         max-history: 7          # Retains logs for 7 days
         total-size-cap: 1GB     # Limits total log storage to 1GB
   ```
3. Ensure the `logback` values are correctly indented and nested, and save the file.

**Note**

If you are adding this configuration to an existing extractor, you must restart the extractor using your preferred method as described in [Run the extractor](how-do-i-set-up-an-on-premise-extractor--2401299.html#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-StepDRunTheExtractor "Run the extractor").

**Tip**

To use an optional proxy, see the [Proxy settings for on-premise extractors](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

[### Set up the JCo (applicable only for SAP extractor)](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-StepCSetuptheJCoapplicableonlyforSAPExtractor_body)

To communicate with the Celonis RFC module, the extractor needs to establish a connection to the SAP system and be able to make RFC calls. For this purpose, we require the **SAP Java Connector (JCo) 3.1** or later to be installed.

The JCo library should be downloaded and set up separately. This involves the following steps:

- **Download the respective package from the SAP Marketplace**

  This step should be performed by someone who has an [SAP Service User](https://help.sap.com/viewer/ase_solman/6a92e3ffb3ee43e59c1e394566b4c085.html) (S User), which authorizes to download software from SAP portals. Usually, a customer's SAP BASIS has this access.
- **Copy the Library files into the dedicated folder in the Extractor Package**

  The Library contains two files - a Java part “sapjco3.jar”, and an operating system-specific part, for example, sapjco3.[.dll | .so | .sl ].

  After downloading the files make sure to copy them to the following folder on the extractor server "Extractor path\jco". The extractor is configured to read the Library from this directory.

[### Run the extractor](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-StepDRunTheExtractor_body)

There are two ways to run the extractor:

- [Run the extractor via command line](how-do-i-set-up-an-on-premise-extractor--2401299.html#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-iStepstoruntheextractorinthecommandline "Run the extractor via command line")
- [Run an on-premise extractor as a service](how-do-i-set-up-an-on-premise-extractor--2401299.html#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-iiRunninganonpremiseExtractorasaservice "Run an on-premise extractor as a service")

#### Run the extractor via command line

Start the JAR file by running the following command in the extractor installation directory:

```
 java -Xmx8g -Dspring.config.location=application-local.yml -jar extractor_file_name.jar
```

**Running multiple extractors**

If you have multiple on-premise extractors in the same folder, you must rename the `application-default.yml` files so that each is distinct. You can then start the respective extractor based on the following command:

```
 java -Dspring.config.location=configuration_file_name.yml -Xmx8g -jar extractor_file_name.jar
```

#### Run an on-premise extractor as a service

The major benefit of running an extractor as a service is that the extractor can be automatically started when the server is boots.

[##### On Linux](#id515580_body)

To ensure the extractor starts automatically at system boot, configure it as a standard Linux service using `systemd`.

For this, you need to create a unit file and put it in the directory `/etc/systemd/system/`. You can use the following example unit file named `celonis_extractor.service`:

**Note**

If you have multiple extractors, and you are using the example below, each requires a unique `.service` file. If you are a more advanced user, you can also use a Systemd Unit Template to manage multiple services from a single master file.

```
[Unit]
Description=Celonis Extractor Service.

[Service]
Type=simple
User=username
WorkingDirectory=[path to installation folder]
ExecStart=/usr/bin/java -Xmx8g -jar extractor_file_name.jar
Restart=always

[Install]
WantedBy=multi-user.target
```

To enable and start the service, execute the following commands:

```
sudo systemctl enable celonis_extractor.service # registers the service so that it is started on boot
sudo systemctl start celonis_extractor.service # starts the service
```

[##### On Windows](#id515593_body)

The extractor package contains four files that enable you to run the extractor as a Windows service:

- **Celonis<ConnectionType>Extractor.xml:** The configuration file of the service. Normally, you do not need to make any changes to this file.
- **install.bat:** The batch file to install the services on the service.
- **startup.bat:** The batch file to start the service manually.
- **shutdown.bat:** The batch file to stop the service manually.

To perform an install, a startup, or a shutdown, you need to run the batch file as an administrator. To do so, right-click on the respective file, and select **Run as administrator**.

[## Sharing connections between a legacy team and a ETL Engine team is not supported.](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-Additionalinformation_body)

You must migrate the source pool to the ETL Engine first. If the migration isn't complete, the ETL Engine target pool will not be available in the list of selectable target pools.

After the target pool is migrated to the ETL Engine, verify the creation of a dummy connection:

- Migrate the source pool to the ETL Engine.
- Repeat the sharing process from the source pool to ensure the newly migrated source connection is shared with the new Celocore target pool.

  1. In the target pool, select the **Edit** option on the imported connection.
  2. Re-establish the connection sharing and perform a regular synchronization.

  **Tip**

  You can also filter the logs by a specific date range before downloading.

[## Frequently Asked Questions about setting up an on-premise extractor](#UUID-2f6f3f21-6721-7c02-d75b-1c9108f0a91a_id_HowdoIsetupanonpremiseExtractor-FAQ_body)

**Can I copy my extractor to another machine?**

No. To function properly, each extractor requires a unique ID.

**Warning**

Cloning or copying an existing extractor to multiple machines may cause the extractor to malfunction.

**After starting the extractor, I see the message "Connection refused: connect; nested exception is java.net.ConnectException: Connection refused: connect". How can this be fixed?**

Ensure your on-premise extractor server can reach the Celonis Platform. Specifically, verify:

- You can reach `https://[team].[realm].celonis.cloud` in the browser of your server. If not, check your firewall settings.
- Ensure no proxy is blocking the connection between the extractor and the Celonis Platform. For more information, see [Proxy settings for on-premise extractors](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

**If I run the extractor as a Windows service, it always fails immediately, and I can only see the log files ending with the wrapper. What can I do?**

Ensure you are using Java 17 by running the following command:

```
java -version
```

If it is the correct version, ensure the environment variables `PATH` and `JAVA_HOME` are set on a system level and not only on a user level. If they were only set at the user level, after updating them on the system level, restart your server so it is applied to the system user as well.

**How do I override the temp folder used by extractor for storing the files temporarily?**

You can do this by overriding the command that starts the extractor service.

**For Windows**

Windows service is installed according to the metadata that is defined in the file `CelonisSapExtractor.xml`, which is located in the extractor folder. You can modify the command line arguments there and override the directory which is by default `%BASE%\temp`.

**For Linux**

You need to modify the command that launches the extractor service. When running the command, you must explicitly override the `temp` folder. For example:

```
java -Djava.io.tmpdir="/define/your/directory" -Xmx8g -jar extractor_file_name.jar
```

## Related topics

- [System requirements](system-requirements-of-an-on-premise-extractor-server.html "On-premise extractor (legacy) system requirements")
- [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor")
- [Connecting multiple teams](how-do-i-connect-to-multiple-teams-with-the-same-extractor-.html "Connecting multiple teams to the same extractor")


---

## admin/on-prem-clients/how-do-i-uninstall-an-on-premise-extractor-

# Uninstalling an on-premise extractor

To uninstall your extractor, first determine if you are running it as a service. If you aren't using a service, simply stop the extractor by closing your command line window and deleting the installation files.

However, if you have installed the extractor as a service, you must manually stop the process and remove the service registration from your system. Follow the platform-specific steps below for Windows or Linux to ensure a clean removal.

Expand all

[## Uninstalling an on-premise extractor on Windows](#UUID-9b49f585-de82-3c48-3b6f-f92f75de1328_section-id235499554304609_body)

To uninstall an on-premise extractor on Windows:

1. Stop the current Extractor, if it is still running

   - Services → Scroll down to the respective service (either CelonisIBCSap or CelonisIBCDatabase) → right-click on properties → **Stop** the service
   - Copy the **Service name**
2. Delete the service

   - Open the command prompt as **administrator**
   - Run the following command, using the copied service name from step 1

     ```
     sc delete <ServiceName>
     ```

[## Uninstalling an on-premise extractor on Linux](#UUID-9b49f585-de82-3c48-3b6f-f92f75de1328_section-id235499554353203_body)

To uninstall an on-premise extractor on Linux:

1. Stop the current Extractor, if it is still running.

   - Run the following command via the terminal window (the service name should be either celonis-ibc-sap orcelonis-ibc-database).

     ```
     Service <ServiceName> stop
     ```
2. Delete the service.

   - Run the following command to remove the service and all configuration files.

     ```
     sudo apt-get --purge remove <ServiceName>
     ```
   - Enter your password when prompted and press “Enter”

     ```
     Service <ServiceName> stop
     ```

## Related topics

- [Getting started](getting-started-with-on-premise-jdbc-extractors.html "Getting started with on-premise JDBC Extractors")
- [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors")
- [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors")


---

## admin/on-prem-clients/how-do-i-uninstall-an-on-premise-extractor--2401300

# Uninstalling an on-premise extractor

To uninstall your extractor, first determine if you are running it as a service. If you aren't using a service, simply stop the extractor by closing your command line window and deleting the installation files.

However, if you have installed the extractor as a service, you must manually stop the process and remove the service registration from your system. Follow the platform-specific steps below for Windows or Linux to ensure a clean removal.

Expand all

[## Uninstalling an on-premise extractor on Windows](#UUID-aa64390f-5e1f-e6ba-594f-bd738c65f9c1_section-id235499554304609_body)

To uninstall an on-premise extractor on Windows:

1. Stop the current Extractor, if it is still running

   - Services → Scroll down to the respective service (either CelonisIBCSap or CelonisIBCDatabase) → right-click on properties → **Stop** the service
   - Copy the **Service name**
2. Delete the service

   - Open the command prompt as **administrator**
   - Run the following command, using the copied service name from step 1

     ```
     sc delete <ServiceName>
     ```

[## Uninstalling an on-premise extractor on Linux](#UUID-aa64390f-5e1f-e6ba-594f-bd738c65f9c1_section-id235499554353203_body)

To uninstall an on-premise extractor on Linux:

1. Stop the current Extractor, if it is still running.

   - Run the following command via the terminal window (the service name should be either celonis-ibc-sap orcelonis-ibc-database).

     ```
     Service <ServiceName> stop
     ```
2. Delete the service.

   - Run the following command to remove the service and all configuration files.

     ```
     sudo apt-get --purge remove <ServiceName>
     ```
   - Enter your password when prompted and press “Enter”

     ```
     Service <ServiceName> stop
     ```

## Related topics

- [Getting started](getting-started-with-on-premise-jdbc-extractors.html "Getting started with on-premise JDBC Extractors")
- [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors")
- [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors")


---

## admin/on-prem-clients/how-do-i-update-an-on-premise-extractor-

# Updating an on-premise extractor

**From April 2026: Java requirement for on-prem JDBC extractor**

Starting April 2026, upgrading to the latest on-premise JDBC extractor will require Java 25. This is not a breaking change, as customers who do not update their extractor to the latest JDBC version will not be affected. We will update this page with the exact release version once it is finalized. No immediate action is required, but upgrades should be planned in advance.

For step-by-step instructions on how to update an on-premise extractor, see [Updating JDBC extractors](installing-and-updating-the-on-premise-jdbc-extractor.html "Updating on-premise JDBC extractors")


---

## admin/on-prem-clients/http--on-prem---action-flow-

# HTTP (On-Prem) (Action Flow)

The HTTP app provides various modules for communication based on [Hypertext Transfer Protocol (HTTP)](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol). HTTP is the foundation of data communication for the World Wide Web.

Expand all

[## Getting Started with HTTP (On-Prem)](#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_id_HTTPOnPrem-GettingStartedwithHTTPOn-Prem_body)

The right choice of the module depends on the authentication/authorization mechanism the resource you wish to access uses:

- [Make a HTTP request](http--on-prem---action-flow-.html#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_id_HTTPOnPrem-MakeaHTTPrequest "Make a HTTP request")- universal module to make an HTTP request to an on-premise system and process the response.
- [Make a Basic Auth request](http--on-prem---action-flow-.html#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_UUID-172a446e-4710-aebf-dd53-37d86f9ff989 "Make a Basic Auth request") - this module allows you to send an HTTP request with the basic authentication. The output bundle contains the HTTP response.

[## Types of HTTP (on-prem) modules](#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_section-id235522026477401_body)

[### Make a HTTP request](#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_id_HTTPOnPrem-MakeaHTTPrequest_body)

A universal module to make an HTTP request to an on-premise system and process the response.

This module requires the Celonis [on-prem client](on-prem-clients.html "On-premises clients (OPC)").

#### 1. System connection

|  |  |
| --- | --- |
| **System Connection Name** | Define a name for your new system connection e.g. HTTP POST ABC |
| **URL** | Enter a URL you want to send a request to, e.g., API endpoint, website, etc. |

#### 2. App configuration

|  |  |
| --- | --- |
| **Method** | Select the HTTP method you want to use e.g.:  **GET** to retrieve information for an entry.  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. For example, an authorization.  By default, the request does not contain the `Accept` header. If an unexpected response is returned, try adding the `Accept: */*` header. |
| **Query String** | Enter the desired query key-value pairs. |
| **Body** | HTTP **Body** is the data bytes transmitted in an HTTP transaction message immediately following the headers if there are any to be used.  **Note**  - The Content type is Raw. - The Body type can be Text, JSON, XML or HTML and needs to be defined in the Headers. e.g. *Content-type: application/json* |

**Tip**

You can parse the respone by using e.g. JSON or XML Parser after the HTTP module.

[### Make a Basic Auth request](#UUID-f3ec78c5-5201-63a1-419a-ee1480cb8a85_UUID-172a446e-4710-aebf-dd53-37d86f9ff989_body)

The **Make a Basic Auth request** module allows you to send an HTTP request with the basic authentication. The output bundle contains the HTTP response.

|  |  |
| --- | --- |
| **Credentials** | Click **Add** to add your credentials (user name and password) for basic authentication. |
| **Evaluate all states as errors (except for 2xx and 3xx)** | Use the response status to detect errors. Otherwise, the module reports only Make related errors (like mapping errors or missing required values). |
| **URL** | Enter the request URL. |
| **Serialize URL** | Encodes the API call URL with the URL encoding (encoding special characters for example). |
| **Method** | Select the HTTP method you want to use:  - **GET** - to retrieve information for an entry. - **POST** - to create a new entry. - **PUT** - to update/replace an existing entry. - **PATCH** - to make a partial entry update. - **DELETE** - to delete an entry. |
| **Headers** | Enter request [headers](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields). For example, the response content type.  **Caution**  The **HTTP** app requests do not have the  [Accept header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept). If the HTTP request returns an unexpected response, try adding the `Accept: */*` header. |
| **Query String** | Enter the query key-value pairs. |
| **Body type** | HTTP `body` contains the data transferred in an [HTTP](https://en.wikipedia.org/wiki/HTTP) request.  |  |  | | --- | --- | | **Raw** | The **Raw**`body` type is suitable for most HTTP requests, even if the service documentation does not specify the data type.  Specify the data format of the `body` content in the **Content type** field. | | **Application/x-www-form-urlencoded** | This body type is to `POST` data using `application/x-www-form-urlencoded`.    For `application/x-www-form-urlencoded`, the body of the HTTP request sent to the server is one query string. The keys and values are encoded in key-value pairs separated by `&` and with a `=` between the key and the value. For binary data, use the `multipart/form-data` body type instead.  Example of the resulting HTTP request format: `field1=value1&field2=value2` | | **Multipart/form-data** | Use the `multipart/form-data` content type to send files in the HTTP request.  Add fields to the request. Each field must contain *Key*-*Value* pair:  **Text**: Enter the key and value to be sent within the request body.  **File**: Enter the key, and specify the source file you want to send in the request body. Map the file you want to upload from the previous module (for example: **HTTP** > **Get a File** or **Google Drive** > **Download a File**), or enter the file name and file data manually. | |
| **Parse response** | Enable to parse HTTP responses into bundles. With this option, you don't need to add the **Parse JSON** or **Parse XML** modules. Otherwise, the HTTP module returns the raw response data.  Before you can use parsed JSON or XML content, run the module once manually so that the module can recognize the response content and allow you to map it in subsequent modules. |
| **Timeout** | Specify the request timeout in seconds (1-300). Default: 40 seconds. |
| **Share cookies with other HTTP modules** | Enable to share cookies from the server with all HTTP modules in your Action Flow. |
| **Self-signed certificate** | Upload your certificate if you want to use TLS using your self-signed certificate. |
| **Reject connections that use unverified (self-signed) certificates** | Enable to reject connections that use unverified TLS certificates. |
| **Follow redirect** | Enable to follow URL redirects that return 3xx response statuses. |
| **Follow all redirect** | Enable to follow URL redirects regardless of response statuses. |
| **Disable serialization of multiple same query string keys as arrays** | Celonis platform handles multiple values for the same URL query string parameter key as arrays (e.g., `www.test.com?foo=bar&amp;foo=baz` will be converted to `www.test.com?foo[0]=bar&amp;foo[1]=baz`). Enable to deactivate this behavior. |
| **Request compressed content** | Enable to request compression of the response data. Adds the `Accept-Encoding` header. |
| **Use Mutual TLS** | Select if you want to use mutual TLS (mTLS) for the HTTP request to ensure both the client and server authenticate each other using certificates. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## admin/on-prem-clients/installing-and-updating-the-on-premise-jdbc-extractor

# Updating on-premise JDBC extractors

**Note**

Starting with JDBC Extractor version `4.28.0` (2026-03-31), Java 25 is recommended.

The JDBC extractor, available from the Celonis Platform Download Portal, allows you to connect to any SQL database. This page provides instructions and information on updating existing on-premise JDBC extractor installations.

Updating an on-premises JDBC Extractor follows a side-by-side upgrade methodology. This approach involves installing the new version into a separate, clean directory rather than overwriting your existing installation. By maintaining the previous version's directory intact, you ensure a seamless migration of your custom configurations while providing a reliable fallback point should you need to revert to the previous state

Expand all

[## Before you begin](#UUID-4251d1ad-b002-e59d-9717-15f69cb0775d_section-id235499440146284_body)

Before you start the upgrade, ensure your server meets [Prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors").

[## Updating the JDBC Extractor](#UUID-4251d1ad-b002-e59d-9717-15f69cb0775d_section-id235499439545492_body)

To update an on-premise JDBC extractor:

1. If you've customized your JDBC extractor's configuration files, save a copy of these files from your existing extractor directory.

   **Important**

   Failing to perform this step could result in permanent data loss if you overwrite your content with the default files included in the extractor package.

   - **YAML configuration**: `application-local.yml`
   - **Proxy configuration**: `proxy.yml`
   - **XML configuration**: `CelonisJdbcExtractor.xml`

   |  |
   | --- |
   |  |
2. **In a sandbox environment**, create a new directory, and install the new version of the JDBC Extractor package into it.

   **Important**

   When the package runs, it creates subdirectories and extracts the files from the included JAR file. It's critical use this this in a new directory (side-by-side approach), rather than replacing the JAR file in your previous version's directory, so that the new package can correctly validate the installation.
3. **If updating from version 2.77.0 (2023-02-27) or earlier**: You must use the updated version of `CelonisJdbcExtractor.xml` included with the new extractor package. To do so, transfer any customizations from your copy of `CelonisJdbcExtractor.xml` to the `CelonisJdbcExtractor.xml` file supplied with the new version.

   **If updating from version 2.82.0 (2023-08-10) or later**: Replace the `CelonisJdbcExtractor.xml` file in your new directory with your customized version.
4. Replace the following files in your new directory with your customized versions:

   - **YAML configuration**: `application-local.yml`
   - **Proxy configuration**: `proxy.yml`

   **Note**

   You can safely overwrite the default versions of these files included in the new extractor package.
5. Start the new version of the extractor following the instructions in "Step D: Run The Extractor" in [How do I set up an on-premise Extractor?](how-do-i-set-up-an-on-premise-extractor--2401299.html "Setting up an on-premise extractor")
6. Verify the extractor is working correctly in your sandbox environment. If it is, follow the above steps to install the extractor to your production environment.
7. Once the updated version of the extractor is working in your production environment, stop and uninstall the older version of the extractor.

[## JDBC Extractor change history](#UUID-4251d1ad-b002-e59d-9717-15f69cb0775d_UUID-6b7cd303-fe9f-dff6-ea3a-cd418ed71c7e_body)

Filter

- Version
- Release date
- Changes

| Version | Release date | Changes |
| --- | --- | --- |
| 4.28.2 | 2026-04-01 | - Updated third-party dependencies. |
| 4.28.0 | 2026-03-31 | - Updated third-party dependencies.  **Java 25 recommended for upgrade**  Starting with JDBC Extractor v4.28.0, we recommend upgrading your environment to Java 25. While Java is backward compatible, this upgrade is suggested to ensure full functionality and alignment with the JDBC Extractor build environment. |
| 4.26.1 | 2026-03-20 | - Improved SQL Editor performance when saving via optimized metadata retrieval. - Fixed - Inference errors caused by `Number` type in Snowflake delta loads. |
| 4.25.0 | 2026-03-11 | - Added - Support international char standard for Oracle. - Added - Support for `WITH ORDINALITY` syntax in SQL Editor extractions. |
| 4.24.0 | 2026-02-19 | - Added - Default rolling logs cleanup policy. See: [(Recommended) Managing JDBC Extractor log files](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id235419665482812 "(Recommended) Managing JDBC Extractor log files"). - Added - Improved logging for proxy configuration to distinguish between proxy and internal-proxy. - Fixed - Hanging of subsequent extractions by improved handling of active extractions. |
| 4.23.0 | 2026-02-04 | - Fixed - Updated internal dependencies not impacting users directly. |
| 4.19.0 | 2025-12-11 | - Fixed - MSSQL Increase Filter DateTime Precision using Datetime2. |
| 4.17.0 | 2025-12-03 | - Added - Support for BigInteger values from Impala driver. |
| 4.16.0 | 2025-11-20 | - Fixed - Updated dependencies (further details available in the Download Portal). |
| 4.15.2 | 2025-11-13 | - Fixed - Extraction preview without primary keys. - Fixed - Log discrepancy between local extractor and Celonis Platform. - Fixed - Row ID column extraction for JDBC Extraction Editor. |
| 4.9.0 | 2025-10-10 | - Added - Use Default value of dynamic parameter while running Full extraction created via SQL Editor. - Added - Notification in the logs about outdated on-prem extractor version. - Fixed - Replication Cockpit issue when changes happened during initialization might be ignored. - Fixed - Resolution format for DATE type using a valid syntax for IBM DB2 AS400. |
| 4.8.2 | 2025-09-24 | - Added - Cloudera Impala Driver for extractions using Direct JDBC Connection |
| 4.7.3 | 2025-09-01 | - Added - Amazon Redshift: External tables now appear when using Driver Metadata as metadata source |
| 4.6.1 | 2025-08-01 | - Improved messages during connection issues. - Increased default connection timeout to 60 seconds. - Databricks Use Catalog Statement, now uses quoted name. - Windows On Premise extractor installation no longer requires winutils.exe - Added - Security check for Connection parameters. - Added - Pseudonymize FLOAT columns. - Added - Uplinked connections for domains containing the term 'integration' are recognized. |
| 4.4.9 | 2025-07-18 | - Improved messages during connection issues. |
| 4.4.5 | 2025-07-09 | - Added - Support for the OAuth2-based authentication and authorization to the dockerized version of the On-Prem JDBC (Database) Extractor. See: [Configuring OAuth-based authentication in Docker](setting-up-jdbc-extractors-on-docker.html#UUID-a6bb659a-0502-697d-e0b1-042eea123235_UUID-ef26c2dd-2297-3ad8-a6e4-65800d2a6f24 "Configuring OAuth-based authentication in Docker") - Added - Detailed logging for Replication Cockpit. |
| 4.3.0 | 2025-06-26 | - Fixed - Database connection test for Trino. - Updated third-party dependencies. |
| 4.2.3 | 2025-06-12 | - Fixed - Increased SQL editor timeout preview. - Fixed - Fully qualified column references supported during duplicate removal in visual mode. - Fixed - Stored Oracle timestamp precision to 6 digits. - Fixed - Timestamp precision used in extraction filter queries to 6 digits. Applies to Oracle, Postgres, IBM-DB2, Athena, MSSQL, SAP-HANA, BigQuery. - Fixed - SQL editor preview for IBM DB2 AS400 database. |
| 4.1.3 | 2025-05-19 | - Added - Extractions Editor and AI Assistant general availability release. - Fixed - Snowflake connection host field validation. - Fixed - Improved observability for Query execution metrics. - Fixed - Improve error message for binary columns extraction for Snowflake Bulk mode. - Fixed - Delta load issue due to timestamp precision for Snowflake. - Fixed - Missing specified schema in data connection during querying tables for Databricks. |
| 3.8.3 | 2025-04-17 | - Added - Add Parameter selection box on Extractions SQL Editor. - Fixed - Updated JDBC driver for MySQL to v9.2.0. - Fixed - Updated JDBC driver Snowflake to v3.23.2 - Fixed - Broken log generation in JDBC on-prem extractor Docker image. - Fixed - Templates functionality on JDBC extraction configuration. |
| 3.7.1 | 2025-03-27 | - Added - Increase precision for timestamp to be 6 digits instead of 3 for Databricks extractions. - Added - JDBC extractor for NetSuite. - Fixed - Support spaces in column names when ordering by primary keys during extraction configuration in visual mode. - Fixed - Convert numeric values to string without trailing zeros after the fractional part. |
| 3.6.0 | 2025-03-03 | **Requires Java 21**  From JDBC extractor version 3.6.0 onward, you must update to Java 21 before installing the JDBC extractor update.  - Added: Create blank/no-row tables when there is no data in source-system. |
| 3.5.0 | 2025-02-06 | - Fixed - Include milliseconds precision for timestamp columns for delta extraction in Databricks connector. - Fixed - issue with initialization of Replication Cockpit that affected transformations. |
| 3.4.1 | 2025-01-15 | - Added VarChar Optimization v2 support in the Replication Cockpit. - Fixed - Extractor JAR file in the on premise package is now signed for the authenticity. - Fixed - Binary datatype handling is correctly supported for Snowflake bulk extractions. |
| 3.3.0 | 2024-12-13 | - Added JOIN support for Snowflake bulk extractions. - Improvements in memory consumption during parquet files uploads. |
| 3.2.0 | 2024-12-10 | - Limited availability release of VARCHAR optimization version 2 for on-prem extractors. - Limited availability release of Snowflake bulk export feature for JDBC full extractions on direct connections. |
| 3.1.1 | 2024-11-27 | - Upgraded MSSQL JDBC driver to 12.8.1. - Improved messaging for Snowflake connection test if private key is stored outside of Extractor directory. |
| 3.0.0 | 2024-10-30 | - Limited availability release of the Extractions Editor and AI Assistant, allowing to use your source system specific SQL functions and JOINS when connecting to your source system using the JDBC extractor. For more, see: [Creating extraction tasks using the Extractions Editor and AI Assistant](extractions-editor.html "Creating extraction tasks using the Extractions Editor and AI Assistant"). - Fixed filter based on date columns using Teradata database. |
| 2.106.2 | 2024-10-16 | - Added UI indicator when there is a filter for Join Config and removed warning related to the filter. - Added support for EXTERNAL table type in Athena. |
| 2.105.0 | 2024-09-30 | - Internal improvements. |
| 2.104.1 | 2024-09-05 | - Upgraded the Amazon Athena driver to version 2.1.5.1000. |
| 2.103.0 | 2024-08-23 | - Fixed preview and limit for Impala connector. - Upgraded the IBM DB2 driver. - Fixed veracode security issue related to crypto algorithm used by Vault.  - The existing vault.jar will not work from JDBC v2.103.0. Instead, upgrade to the latest version of the extractor for full functionality. - Fixed Extension Provider query for target tables with special characters. - Fixed vulnerabilities in JDBC Connection String. - Upgraded the Oracle driver. |
| 2.102.1 | 2024-08-08 | - Added a readme file listing the libraries that the extractor uses. - Made the extractor version naming on the uplink integrations page consistent with the download portal. - Fixed some security vulnerabilities. |
| 2.101.5 | 2024-07-23 | - Improved the date selection for downloading on-premise extractor logs. - Upgraded various third-party libraries to their latest version. - We now prevent the extractor starting if your proxy configuration is invalid. |
| 2.100.0 | 2024-07-05 | - You can now search BigQuery tables using one or more projects from the search bar. - Upgraded MSSQL driver to the latest (12.6.3.jre11) and related msal4j dependency to 1.15.1. - Fixed a bug where on-premise extractor failed to shut down immediately after closing it. - Fixed a bug where on-premise extractor failed to report issues with broken proxy configuration at start up. |
| 2.99.0 | 2024-06-19 | - We've added the capability to increase parallel executions up to 40 through local configurations. For more information, see: [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor"). - Upgrade the Google BigQuery driver to version 1.5.4.1008. - Fixed struct columns parsing in Oracle tables after Oracle JDBC driver upgrade. |
| 2.98.5 | 2024-06-10 | - Added support for materialized views and snapshots in BigQuery. - Retry file upload on receiving HTTP status code 408 to overcome temporary CloudFlare issue. - Optimized the way file upload works to improve performance and avoid connection timeout issues. - Upgraded Snowflake JDBC driver to version 3.16.1 to fix issues with nested paths on Windows machines. - Upgraded several third party libraries to fix vulnerabilities. |
| 2.97.1 | 2024-05-29 | - For Oracle extractions, you can now configure type casting between Integer and Float. |
| 2.96.1 | 2024-05-14 | - If you’re extracting data from a Google BigQuery database, you can now get data from external tables, which reference data stored outside BigQuery, as well as from standard BigQuery tables. - Fixed an issue where a schedule consisting of an uplinked job was conflicting with a direct job. |
| 2.95.2 | 2024-05-03 | - For filters, fixed an additional comma (,) that was being added to an IN clause. - Fixed an issue with table hash keys colliding for metadata caching, which skipped the extraction of one of the tables. |
| 2.94.0 | 2024-04-08 | - Delta loads strictly default to canceling the job if the metadata from your source system changes, to avoid data inconsistency (Option A). Do a full load if this happens. - Fixed a bug where MAX\_STRING\_LENGTH was not getting applied to a column during the table configuration. |
| 2.93.2 | 2024-03-25 | - Added caching for InformationSchema-based and SampleQuery-based retrieved metadata. - Updated third-party dependencies. |
| 2.92.1 | 2024-03-06 | - Connect directly to Oracle EBS as a Cloud Connection - no need to use an uplink. - The extractor now shows tables only from the schema specified in the Connection Configuration. - MS SQL extractions for tables with clustered column index now work when the metadata source is SAMPLE\_QUERY. |
| 2.91.5 | 2024-02-16 | - Added support for Optimizer hints while extracting data from Oracle databases. - The Windows installer executable is now signed with a Celonis certificate. - Unified the three metadata retrieval approaches so that they all return consistent information. - Upgraded to newer versions of the logback and json libraries. |
| 2.90.0 | 2024-01-26 | - Fixed Databricks extraction issues when using the default catalog and default database. - Fixed some security vulnerabilities. |
| 2.89.0 | 2024-01-11 | - For driver metadata, fixed Microsoft SQL server extraction issue when table has clustered columnstore index. - Optimized memory allocations during extractions. |
| 2.88.1 | 2023-12-13 | - Beta release of Oracle Smart Extraction, which parallelizes extractions of larger Oracle tables to reduce data extraction times. The feature is shipped disabled. If you want to try it out, we recommend that you do so in a sandbox environment. To get Oracle Smart Extraction enabled, talk to your Celonis point of contact or create a support ticket. - Fix for an SAP HANA filter parser error when concatenation is used. |
| 2.87.0 | 2023-10-26 | - Fixed deviations for dates earlier than 1900 due to timezone changes. - Fixed an issue with the Snowflake driver for a new installation on Microsoft Windows. - SQL ID will now be logged for Oracle if debug mode is enabled. |
| 2.86.0 | 2023-09-22 | - Enabled STRING to DATETIME conversion for BigQuery and Trino. - For Oracle, we’ve improved the query for the INFORMATION\_SCHEMA metadata source. - Quotes in the filter statement are now recognized. - Fixed some security vulnerabilities. - Fixed an issue for the custom BigQuery driver where classes were not loaded in the correct order. - Fixed an issue for uplinked extractors using a proxy configuration. |
| 2.85.0  (2023-09-01) | 2023-09-01 | - Upgraded the JDBC extractor’s internal libraries. If you’re linking the BigQuery driver, you’ll need to exclude all SLF4J .jar files from the driver package. - On Microsoft Windows, we’ve changed the JDBC extractor’s dependency from the Microsoft Visual C++ 2010 Redistributable Package to the Microsoft Visual C++ 2015-2019 Redistributable Package (x64). Install that package when you install this version of the JDBC extractor. - Wildcards in Snowflake metadata calls are now escaped to improve load. |
| 2.84.0 | 2023-08-10 | - Added support for Oracle CLOB (Character Large Object) and NCLOB (National Character Large Object) data types. |
| 2.83.0 | 2023-06-21 | - Extractions that hang can be resumed from the last table, instead of restarting them. - Upgraded the driver for Snowflake to version 3.13.33. - Upgraded the driver for Athena to version 2.0.36. - Upgraded the driver for IBM DB2 to version 11.5. - Implemented TO\_DATE functionality for Oracle filters. |
| 2.82.0  and 2.80.1 | 2023-08-10 | - Upgraded the JDBC extractor to Java 17. - From version 2.80.1, you're required to upgrade your Java version to at least Java 17 to ensure compatibility and leverage the latest enhancements and security features. - With version 2.82.0, we’ve removed some additional steps from the upgrade process, so use this or a later version of the extractor package. |
| 2.77.0 | 2023-02-27 | - Upgraded MSSQL-JDBC Driver to latest version. - Set `trustServerCertificate=true` and `encrypt=false` by default in case they are not set in the additional properties field (required by driver upgrade). |
| 2.76.0 | 2023-02-15 | - Upgraded MySQL driver to latest version. |
| 2.75.0 | 2023-02-01 | - Fixed security vulnerabilities. |
| 2.71.0 | 2022-11-25 | - Added support for extractions from Databricks. - Oracle DB: Fix for scenarios where the driver metadata was used, even if Information Schema is selected. - Improved clean-up of changelog tables for real-time extractions by doing the clean-up in chunks. |
| 2.70.0 | 2022-11-16 | - Improved metadata query for Oracle databases. |
| 2.69.0 | 2022-10-27 | - Added support for Analytical Views for SAP HANA. - Fixed the feature to clear the metadata cache. |
| 2.67.0 | 2022-09-28 | - Added support for Analytical Views for SAP HANA. |
| 2.66.0 | 2022-09-15 | - Fixed Java-based vulnerabilities. |
| 2.65.0 | 2022-09-09 | - Added support for key pair authentication for Snowflake. |
| 2.64.0 | 2022-08-24 | - Extraction of synonyms for Oracle databases. |
| 2.63.0 | 2022-06-30 | - Extended the logging messages. |
| 2.62.0 | 2022-06-30 | - Enabled Materialized view for the Postgres database. - Added support for Attribute(Joined) views for SAP HANA. |
| 2.61.0 | 2022-06-30 | - BigQuery Get Tables from Additional Projects. - BigQuery ADC authentication (hosted in GCP). - Fixed test connection issue for BigQuery. - Fixed input box for BigQuery data connection form. |
| 2.60.0 | 2022-06-16 | Minor improvements and fixes. |
| 2.59.0 | 2022-06-02 | - Added SHA-256 and SHA-512 support. - Fixed the order of delete and insert executed at the same time. |
| 2.57.0 | 2022-05-05 | - For Google BigQuery, fixed duplicate records caused by a LIMIT/OFFSET in SELECT queries without ORDER BY (primary key) clause not guaranteeing proper pagination. - Added validation to inform the user with an error message if a primary key is not selected. - Fixed NullPointerException in uploading results leading to duplicated push jobs. - Extended invalidate cache also for real-time integration column selection. |
| 2.56.0 | 2022-05-05 | - Added initialization for JDBC real-time via Replication Cockpit. - Fixed out of memory error due to unlimited threads. - Fixed column order changes after deselecting some of the columns in JDBC. |
| 2.55.0 | 2022-05-05 | - Added a database connection timeout setting in the UI. This overwrites the local timeout in application-local.yml in case of uplinked connections. |
| 2.54.0 | 2022-05-05 | - Added an authentication option SERVICE\_ACCOUNT\_AUTHENTICATION for Google BigQuery database connection. Inputs are the service authentication account email ID and the service account key file. - Improved logging for JDBC extraction in DEBUG extraction mode. - Added support for Vertica database type. - Performance improvements for JDBC data extractions on the upload mechanism. |
| 2.51.0 | 2022-05-05 | - Removed the option to include a changelog time stamp in JDBC real-time extractions, and made it the default, to support real-time transformations. |
| 2.50.0 | 2022-05-05 | - Extended duplicate removal for all database types by adding properties in application-local.yml for uplink database connections. To enable this, add the following to the application-local.yml file:  ```   duplicate-removal:       enabled: true           strategy: CLOUD   ``` |
| 2.49.0 | 2022-05-05 | - Logical change in reading change log tables in the JDBC real-time scenario to improve performance. - Fixed change in metadata source not being consistently reflected in the metadata query. |

| Version | Release date | Changes |
| --- | --- | --- |
| 4.28.2 | 2026-04-01 | - Updated third-party dependencies. |
| 4.28.0 | 2026-03-31 | - Updated third-party dependencies.  **Java 25 recommended for upgrade**  Starting with JDBC Extractor v4.28.0, we recommend upgrading your environment to Java 25. While Java is backward compatible, this upgrade is suggested to ensure full functionality and alignment with the JDBC Extractor build environment. |
| 4.26.1 | 2026-03-20 | - Improved SQL Editor performance when saving via optimized metadata retrieval. - Fixed - Inference errors caused by `Number` type in Snowflake delta loads. |
| 4.25.0 | 2026-03-11 | - Added - Support international char standard for Oracle. - Added - Support for `WITH ORDINALITY` syntax in SQL Editor extractions. |
| 4.24.0 | 2026-02-19 | - Added - Default rolling logs cleanup policy. See: [(Recommended) Managing JDBC Extractor log files](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_section-id235419665482812 "(Recommended) Managing JDBC Extractor log files"). - Added - Improved logging for proxy configuration to distinguish between proxy and internal-proxy. - Fixed - Hanging of subsequent extractions by improved handling of active extractions. |
| 4.23.0 | 2026-02-04 | - Fixed - Updated internal dependencies not impacting users directly. |
| 4.19.0 | 2025-12-11 | - Fixed - MSSQL Increase Filter DateTime Precision using Datetime2. |
| 4.17.0 | 2025-12-03 | - Added - Support for BigInteger values from Impala driver. |
| 4.16.0 | 2025-11-20 | - Fixed - Updated dependencies (further details available in the Download Portal). |
| 4.15.2 | 2025-11-13 | - Fixed - Extraction preview without primary keys. - Fixed - Log discrepancy between local extractor and Celonis Platform. - Fixed - Row ID column extraction for JDBC Extraction Editor. |
| 4.9.0 | 2025-10-10 | - Added - Use Default value of dynamic parameter while running Full extraction created via SQL Editor. - Added - Notification in the logs about outdated on-prem extractor version. - Fixed - Replication Cockpit issue when changes happened during initialization might be ignored. - Fixed - Resolution format for DATE type using a valid syntax for IBM DB2 AS400. |
| 4.8.2 | 2025-09-24 | - Added - Cloudera Impala Driver for extractions using Direct JDBC Connection |
| 4.7.3 | 2025-09-01 | - Added - Amazon Redshift: External tables now appear when using Driver Metadata as metadata source |
| 4.6.1 | 2025-08-01 | - Improved messages during connection issues. - Increased default connection timeout to 60 seconds. - Databricks Use Catalog Statement, now uses quoted name. - Windows On Premise extractor installation no longer requires winutils.exe - Added - Security check for Connection parameters. - Added - Pseudonymize FLOAT columns. - Added - Uplinked connections for domains containing the term 'integration' are recognized. |
| 4.4.9 | 2025-07-18 | - Improved messages during connection issues. |
| 4.4.5 | 2025-07-09 | - Added - Support for the OAuth2-based authentication and authorization to the dockerized version of the On-Prem JDBC (Database) Extractor. See: [Configuring OAuth-based authentication in Docker](setting-up-jdbc-extractors-on-docker.html#UUID-a6bb659a-0502-697d-e0b1-042eea123235_UUID-ef26c2dd-2297-3ad8-a6e4-65800d2a6f24 "Configuring OAuth-based authentication in Docker") - Added - Detailed logging for Replication Cockpit. |
| 4.3.0 | 2025-06-26 | - Fixed - Database connection test for Trino. - Updated third-party dependencies. |
| 4.2.3 | 2025-06-12 | - Fixed - Increased SQL editor timeout preview. - Fixed - Fully qualified column references supported during duplicate removal in visual mode. - Fixed - Stored Oracle timestamp precision to 6 digits. - Fixed - Timestamp precision used in extraction filter queries to 6 digits. Applies to Oracle, Postgres, IBM-DB2, Athena, MSSQL, SAP-HANA, BigQuery. - Fixed - SQL editor preview for IBM DB2 AS400 database. |
| 4.1.3 | 2025-05-19 | - Added - Extractions Editor and AI Assistant general availability release. - Fixed - Snowflake connection host field validation. - Fixed - Improved observability for Query execution metrics. - Fixed - Improve error message for binary columns extraction for Snowflake Bulk mode. - Fixed - Delta load issue due to timestamp precision for Snowflake. - Fixed - Missing specified schema in data connection during querying tables for Databricks. |
| 3.8.3 | 2025-04-17 | - Added - Add Parameter selection box on Extractions SQL Editor. - Fixed - Updated JDBC driver for MySQL to v9.2.0. - Fixed - Updated JDBC driver Snowflake to v3.23.2 - Fixed - Broken log generation in JDBC on-prem extractor Docker image. - Fixed - Templates functionality on JDBC extraction configuration. |
| 3.7.1 | 2025-03-27 | - Added - Increase precision for timestamp to be 6 digits instead of 3 for Databricks extractions. - Added - JDBC extractor for NetSuite. - Fixed - Support spaces in column names when ordering by primary keys during extraction configuration in visual mode. - Fixed - Convert numeric values to string without trailing zeros after the fractional part. |
| 3.6.0 | 2025-03-03 | **Requires Java 21**  From JDBC extractor version 3.6.0 onward, you must update to Java 21 before installing the JDBC extractor update.  - Added: Create blank/no-row tables when there is no data in source-system. |
| 3.5.0 | 2025-02-06 | - Fixed - Include milliseconds precision for timestamp columns for delta extraction in Databricks connector. - Fixed - issue with initialization of Replication Cockpit that affected transformations. |
| 3.4.1 | 2025-01-15 | - Added VarChar Optimization v2 support in the Replication Cockpit. - Fixed - Extractor JAR file in the on premise package is now signed for the authenticity. - Fixed - Binary datatype handling is correctly supported for Snowflake bulk extractions. |
| 3.3.0 | 2024-12-13 | - Added JOIN support for Snowflake bulk extractions. - Improvements in memory consumption during parquet files uploads. |
| 3.2.0 | 2024-12-10 | - Limited availability release of VARCHAR optimization version 2 for on-prem extractors. - Limited availability release of Snowflake bulk export feature for JDBC full extractions on direct connections. |
| 3.1.1 | 2024-11-27 | - Upgraded MSSQL JDBC driver to 12.8.1. - Improved messaging for Snowflake connection test if private key is stored outside of Extractor directory. |
| 3.0.0 | 2024-10-30 | - Limited availability release of the Extractions Editor and AI Assistant, allowing to use your source system specific SQL functions and JOINS when connecting to your source system using the JDBC extractor. For more, see: [Creating extraction tasks using the Extractions Editor and AI Assistant](extractions-editor.html "Creating extraction tasks using the Extractions Editor and AI Assistant"). - Fixed filter based on date columns using Teradata database. |
| 2.106.2 | 2024-10-16 | - Added UI indicator when there is a filter for Join Config and removed warning related to the filter. - Added support for EXTERNAL table type in Athena. |
| 2.105.0 | 2024-09-30 | - Internal improvements. |
| 2.104.1 | 2024-09-05 | - Upgraded the Amazon Athena driver to version 2.1.5.1000. |
| 2.103.0 | 2024-08-23 | - Fixed preview and limit for Impala connector. - Upgraded the IBM DB2 driver. - Fixed veracode security issue related to crypto algorithm used by Vault.  - The existing vault.jar will not work from JDBC v2.103.0. Instead, upgrade to the latest version of the extractor for full functionality. - Fixed Extension Provider query for target tables with special characters. - Fixed vulnerabilities in JDBC Connection String. - Upgraded the Oracle driver. |
| 2.102.1 | 2024-08-08 | - Added a readme file listing the libraries that the extractor uses. - Made the extractor version naming on the uplink integrations page consistent with the download portal. - Fixed some security vulnerabilities. |
| 2.101.5 | 2024-07-23 | - Improved the date selection for downloading on-premise extractor logs. - Upgraded various third-party libraries to their latest version. - We now prevent the extractor starting if your proxy configuration is invalid. |
| 2.100.0 | 2024-07-05 | - You can now search BigQuery tables using one or more projects from the search bar. - Upgraded MSSQL driver to the latest (12.6.3.jre11) and related msal4j dependency to 1.15.1. - Fixed a bug where on-premise extractor failed to shut down immediately after closing it. - Fixed a bug where on-premise extractor failed to report issues with broken proxy configuration at start up. |
| 2.99.0 | 2024-06-19 | - We've added the capability to increase parallel executions up to 40 through local configurations. For more information, see: [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor"). - Upgrade the Google BigQuery driver to version 1.5.4.1008. - Fixed struct columns parsing in Oracle tables after Oracle JDBC driver upgrade. |
| 2.98.5 | 2024-06-10 | - Added support for materialized views and snapshots in BigQuery. - Retry file upload on receiving HTTP status code 408 to overcome temporary CloudFlare issue. - Optimized the way file upload works to improve performance and avoid connection timeout issues. - Upgraded Snowflake JDBC driver to version 3.16.1 to fix issues with nested paths on Windows machines. - Upgraded several third party libraries to fix vulnerabilities. |
| 2.97.1 | 2024-05-29 | - For Oracle extractions, you can now configure type casting between Integer and Float. |
| 2.96.1 | 2024-05-14 | - If you’re extracting data from a Google BigQuery database, you can now get data from external tables, which reference data stored outside BigQuery, as well as from standard BigQuery tables. - Fixed an issue where a schedule consisting of an uplinked job was conflicting with a direct job. |
| 2.95.2 | 2024-05-03 | - For filters, fixed an additional comma (,) that was being added to an IN clause. - Fixed an issue with table hash keys colliding for metadata caching, which skipped the extraction of one of the tables. |
| 2.94.0 | 2024-04-08 | - Delta loads strictly default to canceling the job if the metadata from your source system changes, to avoid data inconsistency (Option A). Do a full load if this happens. - Fixed a bug where MAX\_STRING\_LENGTH was not getting applied to a column during the table configuration. |
| 2.93.2 | 2024-03-25 | - Added caching for InformationSchema-based and SampleQuery-based retrieved metadata. - Updated third-party dependencies. |
| 2.92.1 | 2024-03-06 | - Connect directly to Oracle EBS as a Cloud Connection - no need to use an uplink. - The extractor now shows tables only from the schema specified in the Connection Configuration. - MS SQL extractions for tables with clustered column index now work when the metadata source is SAMPLE\_QUERY. |
| 2.91.5 | 2024-02-16 | - Added support for Optimizer hints while extracting data from Oracle databases. - The Windows installer executable is now signed with a Celonis certificate. - Unified the three metadata retrieval approaches so that they all return consistent information. - Upgraded to newer versions of the logback and json libraries. |
| 2.90.0 | 2024-01-26 | - Fixed Databricks extraction issues when using the default catalog and default database. - Fixed some security vulnerabilities. |
| 2.89.0 | 2024-01-11 | - For driver metadata, fixed Microsoft SQL server extraction issue when table has clustered columnstore index. - Optimized memory allocations during extractions. |
| 2.88.1 | 2023-12-13 | - Beta release of Oracle Smart Extraction, which parallelizes extractions of larger Oracle tables to reduce data extraction times. The feature is shipped disabled. If you want to try it out, we recommend that you do so in a sandbox environment. To get Oracle Smart Extraction enabled, talk to your Celonis point of contact or create a support ticket. - Fix for an SAP HANA filter parser error when concatenation is used. |
| 2.87.0 | 2023-10-26 | - Fixed deviations for dates earlier than 1900 due to timezone changes. - Fixed an issue with the Snowflake driver for a new installation on Microsoft Windows. - SQL ID will now be logged for Oracle if debug mode is enabled. |
| 2.86.0 | 2023-09-22 | - Enabled STRING to DATETIME conversion for BigQuery and Trino. - For Oracle, we’ve improved the query for the INFORMATION\_SCHEMA metadata source. - Quotes in the filter statement are now recognized. - Fixed some security vulnerabilities. - Fixed an issue for the custom BigQuery driver where classes were not loaded in the correct order. - Fixed an issue for uplinked extractors using a proxy configuration. |
| 2.85.0  (2023-09-01) | 2023-09-01 | - Upgraded the JDBC extractor’s internal libraries. If you’re linking the BigQuery driver, you’ll need to exclude all SLF4J .jar files from the driver package. - On Microsoft Windows, we’ve changed the JDBC extractor’s dependency from the Microsoft Visual C++ 2010 Redistributable Package to the Microsoft Visual C++ 2015-2019 Redistributable Package (x64). Install that package when you install this version of the JDBC extractor. - Wildcards in Snowflake metadata calls are now escaped to improve load. |
| 2.84.0 | 2023-08-10 | - Added support for Oracle CLOB (Character Large Object) and NCLOB (National Character Large Object) data types. |
| 2.83.0 | 2023-06-21 | - Extractions that hang can be resumed from the last table, instead of restarting them. - Upgraded the driver for Snowflake to version 3.13.33. - Upgraded the driver for Athena to version 2.0.36. - Upgraded the driver for IBM DB2 to version 11.5. - Implemented TO\_DATE functionality for Oracle filters. |
| 2.82.0  and 2.80.1 | 2023-08-10 | - Upgraded the JDBC extractor to Java 17. - From version 2.80.1, you're required to upgrade your Java version to at least Java 17 to ensure compatibility and leverage the latest enhancements and security features. - With version 2.82.0, we’ve removed some additional steps from the upgrade process, so use this or a later version of the extractor package. |
| 2.77.0 | 2023-02-27 | - Upgraded MSSQL-JDBC Driver to latest version. - Set `trustServerCertificate=true` and `encrypt=false` by default in case they are not set in the additional properties field (required by driver upgrade). |
| 2.76.0 | 2023-02-15 | - Upgraded MySQL driver to latest version. |
| 2.75.0 | 2023-02-01 | - Fixed security vulnerabilities. |
| 2.71.0 | 2022-11-25 | - Added support for extractions from Databricks. - Oracle DB: Fix for scenarios where the driver metadata was used, even if Information Schema is selected. - Improved clean-up of changelog tables for real-time extractions by doing the clean-up in chunks. |
| 2.70.0 | 2022-11-16 | - Improved metadata query for Oracle databases. |
| 2.69.0 | 2022-10-27 | - Added support for Analytical Views for SAP HANA. - Fixed the feature to clear the metadata cache. |
| 2.67.0 | 2022-09-28 | - Added support for Analytical Views for SAP HANA. |
| 2.66.0 | 2022-09-15 | - Fixed Java-based vulnerabilities. |
| 2.65.0 | 2022-09-09 | - Added support for key pair authentication for Snowflake. |
| 2.64.0 | 2022-08-24 | - Extraction of synonyms for Oracle databases. |
| 2.63.0 | 2022-06-30 | - Extended the logging messages. |
| 2.62.0 | 2022-06-30 | - Enabled Materialized view for the Postgres database. - Added support for Attribute(Joined) views for SAP HANA. |
| 2.61.0 | 2022-06-30 | - BigQuery Get Tables from Additional Projects. - BigQuery ADC authentication (hosted in GCP). - Fixed test connection issue for BigQuery. - Fixed input box for BigQuery data connection form. |
| 2.60.0 | 2022-06-16 | Minor improvements and fixes. |
| 2.59.0 | 2022-06-02 | - Added SHA-256 and SHA-512 support. - Fixed the order of delete and insert executed at the same time. |
| 2.57.0 | 2022-05-05 | - For Google BigQuery, fixed duplicate records caused by a LIMIT/OFFSET in SELECT queries without ORDER BY (primary key) clause not guaranteeing proper pagination. - Added validation to inform the user with an error message if a primary key is not selected. - Fixed NullPointerException in uploading results leading to duplicated push jobs. - Extended invalidate cache also for real-time integration column selection. |
| 2.56.0 | 2022-05-05 | - Added initialization for JDBC real-time via Replication Cockpit. - Fixed out of memory error due to unlimited threads. - Fixed column order changes after deselecting some of the columns in JDBC. |
| 2.55.0 | 2022-05-05 | - Added a database connection timeout setting in the UI. This overwrites the local timeout in application-local.yml in case of uplinked connections. |
| 2.54.0 | 2022-05-05 | - Added an authentication option SERVICE\_ACCOUNT\_AUTHENTICATION for Google BigQuery database connection. Inputs are the service authentication account email ID and the service account key file. - Improved logging for JDBC extraction in DEBUG extraction mode. - Added support for Vertica database type. - Performance improvements for JDBC data extractions on the upload mechanism. |
| 2.51.0 | 2022-05-05 | - Removed the option to include a changelog time stamp in JDBC real-time extractions, and made it the default, to support real-time transformations. |
| 2.50.0 | 2022-05-05 | - Extended duplicate removal for all database types by adding properties in application-local.yml for uplink database connections. To enable this, add the following to the application-local.yml file:  ```   duplicate-removal:       enabled: true           strategy: CLOUD   ``` |
| 2.49.0 | 2022-05-05 | - Logical change in reading change log tables in the JDBC real-time scenario to improve performance. - Fixed change in metadata source not being consistently reflected in the metadata query. |

## Related topics

- [Getting started](getting-started-with-on-premise-jdbc-extractors.html "Getting started with on-premise JDBC Extractors")
- [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors")
- [Configuring](how-do-i-set-up-an-on-premise-extractor-.html "Configuring on-premise JDBC Extractors")


---

## admin/on-prem-clients/installing-on-prem-clients

# Installing on-prem clients

The Celonis On-Prem Clients (OPC) act as a secure gateway, allowing the Celonis Platform to access authorized local data sources without requiring you to open incoming ports in your corporate firewall.

Because this setup requires both platform configuration and local server access, the installation is a collaborative effort between the Celonis Team Admin and your IT Infrastructure Admin. Follow the three-stage workflow below to prepare your package, deploy the client, and verify the data connection.

**Important**

If your SAP system uses Process Integration/Process Orchestration, or if you use SAP 4.6C or older, you must install your SAP Extractor client using the uplink integration. See [Local extraction](local-extractor-for-sap-ecc-and-sap-s-4hana.html "Local extractor for SAP ECC and SAP S/4HANA").

## Understanding the OPC deployment workflow

This diagram illustrates a secure "Inside-Out" connection strategy. Unlike traditional setups, the Celonis Platform never reaches into your network; instead, the On-Prem Client reaches out to Celonis.

|  |
| --- |
|  |

- **Stage 1: Package Preparation (Celonis Admin)**: The process begins in the Celonis Platform. The Admin creates a unique connection set and downloads a configuration package. This package contains the "identity" the client will use to authenticate with your specific Celonis team.
- **Stage 2: Installation & Local Hand-off (IT Admin):** The configuration package is handed off to the IT Infrastructure Admin, who installs the OPC agent on a local server (Windows, Linux, or Mac). During this stage, the agent is pointed toward the local data sources (like an SAP ERP or SQL database) that need to be reached.
- **Stage 3: Secure Uplink &amp; Verification (End-to-End)**: Once the service starts, the OPC establishes an encrypted outbound connection to the Verification URL. The status in the Celonis Platform will switch to "Connected," signaling that data is now ready to be extracted and transformed without any changes to your corporate firewall rules.

## Installing the on-prem client

Where would you like to install your on-prem clients?

- [Installing on Windows](installing-on-prem-clients-on-windows.html "Installing on-prem clients on Windows")
- [Installing on Linux](installing-on-prem-clients-on-linux.html "Installing on-prem clients on Linux")
- [Installing on MacOS](installing-on-prem-clients-on-macos.html "Installing on-prem clients on MacOS")


---

## admin/on-prem-clients/installing-on-prem-clients-on-linux

# Installing on-prem clients on Linux

To enable high-performance data processing between your local infrastructure and the Celonis Platform, you must establish a secure connection using the On-Premise Client (OPC). By installing the OPC on a Linux server, you create a dedicated, scalable gateway for real-time data extraction and process automation.

This configuration ensures that your data remains protected within your Linux environment, utilizing encrypted outbound communication to bridge the gap between your on-premise data sources and Celonis without compromising your network's integrity.

Expand all

[## Before you begin](#UUID-04be706d-0f86-c2d9-54ee-61da9b566abe_section-idm4666232718729634270632795793_body)

Make sure your system meets hardware and software requirements for clients. See [System requirements](on-prem-client-system-requirements.html "On-prem clients system requirements").

[## 1. Preparing the installation package](#UUID-04be706d-0f86-c2d9-54ee-61da9b566abe_UUID-69f3cfa8-7df1-a029-4a0d-93cb4837f541_body)

If you’re a Celonis Platform user follow these steps to prepare the installation package which you can later send to your IT admin so that they can install it on a central server.

**Before you begin:**

You need to have admin rights to prepare the installation package.

**Procedure:**

1. In your Celonis Platform instance, go to **Admin & Settings > On-prem clients.**
2. In the upper-right corner, click **Set up on-prem clients**.
3. Select **Install the clients on a central server**.
4. Enter a unique installation package name.
5. Select the operating system on which you want to install the clients.
6. Enter your IT admin email address and click **Send**.

Your IT admin will receive a link where they can download the package prepared based on the settings you selected. They will also receive detailed instructions on how to install the package on the server. Once they completed the installation, you’ll receive a verification URL or code to verify the connection with the Celonis Platform. If you already received that, jump straight to [3. Verifying the installation](installing-on-prem-clients-on-linux.html#UUID-04be706d-0f86-c2d9-54ee-61da9b566abe_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2 "3. Verifying the installation").

[## 2. Installing on-prem clients](#UUID-04be706d-0f86-c2d9-54ee-61da9b566abe_section-idm454944281422563424617566398_body)

If you’re an IT admin and you received an installation request from your Celonis Platform users, follow these steps.

**Procedure:**

1. Using the link from the email you received from the Celonis Platform user, download the installation package.
2. Extract the installation package to the location where you want to install the clients.
3. (optional) Establish a connection with SAP:

   Download the SAP Java Connector (SAP JCo) library, version 3.1 or later, and place it in your local directory. SAP Jco allows applications to communicate with SAP systems using SAP's RFC protocol.

   1. Download the respective package from the [SAP Support Portal](https://support.sap.com/en/product/connectors/jco.html).

      **Note**

      Only SAP Service users (S-user) can download software from SAP portals. Usually, a customer's SAP BASIS has this access.

      The downloaded SAP Jco folder already contains two files: a Java part “sapjco3.jar”, and an operating system-specific part e.g. sapjco3.[.dll | .so | .sl ].
   2. Copy the content of the SAP Jco folder into the following Automation Agent and Extraction Agent folders:

      - **For Automation Agent**

        `{installation_folder}/celonis-on-prem-clients-v1.6.0-macOS-Linux/automation-agent/libraries/external`
      - **For Extraction Agent**

        `{installation_folder}/celonis-on-prem-clients-v1.6.0-macOS-Linux/extraction-agent/libraries/external`
4. In the extracted folder, go to the *Shared* folder and start *OPC-Management-Tool*.

   **Tip**

   **We also provide a CLI version of this tool**

   In Terminal, run:

   ```
   sudo ./opc-management-tool-cli
   ```
5. In the Management Tool, select the clients you want to install.
6. (optional) In the Management Tool, generate the encryption key to encrypt sensitive data in the installation package:

   1. Click **Generate encryption key**.

      **Tip**

      We use *java.security* and *javax.crypto* fameworks to store and encrypt sensitive data in the application.yml file.
   2. Define a passphrase which will be used to create the hash for the private encryption key.
   3. Click **Save**.

      This will automatically create the *celonis-kms.yml* file and encrypt all sensitive data like the application key and the proxy password.
7. (optional) If necessary, define the proxy server between the on-prem client and the source system or between the on-prem client and the Celonis Platform:

   1. Click **Use proxy for communication**.
   2. Define the properties of your proxy connection:

      - **protocol**: HTTP or HTTPS
      - **host**: the IP address or hostname of the proxy server
      - **port**: the port at which the server can be reached
      - **user** (optional): the user name for basic authentication with the proxy
      - **password** (optional): password for basic authentication with the proxy
   3. Click **Save**.

      This will automatically ensure that your connection will use the proxy for communication.
8. Click **Connect to Celonis Platform** to generate the Verification URL.
9. Copy the Verification URL and share it with your Celonis Platform user.
10. (Optional) Connect to SAP. **This step is only required when automating in SAP.**

[## 3. Verifying the installation](#UUID-04be706d-0f86-c2d9-54ee-61da9b566abe_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2_body)

If you’re a Celonis Platform user and you received a request to verify the on-prem client installation from your IT admin, follow these steps.

**Important**

To verify the on-prem clients' installation, you must be Celonis Platform admin or you must have "edit agent" permissions assigned to your role.

**Procedure:**

1. Go to the Verification URL sent by the IT admin.
2. Log in to Celonis Platform.
3. Verify the request and click **Authorize**.

   On-prem clients can now connect to Celonis Platform and create their own OAuth client. Newly created clients will also now be visible in the On-prem clients overview page under **Admin & Settings** > **On-prem clients**.

   **Note**

   In July 2025, Celonis Platform replaced appkeys with OAuth 2.0 as a method of authentication for OPC. For details, see [AUTOMATION OAuth for on-prem clients (2025-08-13)](august-2025-release-notes.html#UUID-c0c8ecc5-3a03-4eb6-07cf-a82de779a0a8_UUID-d1d7f4ff-eb32-30a8-6d2c-c88ae9860dfd "AUTOMATION OAuth for on-prem clients (2025-08-13)").

   If you're having trouble connecting the on-prem clients to Celonis Platform, see [Manual authentication](authenticating-on-prem-clients-manually.html "Authenticating on-prem clients manually").

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/installing-on-prem-clients-on-macos

# Installing on-prem clients on MacOS

To transform local business data into actionable insights, the Celonis Platform requires a secure link to your macOS environment. Installing the On-Premise Client (OPC) on Mac provides a streamlined way to connect your local data sources to the Celonis Platform for extraction and automation.

This setup acts as a secure intermediary, ensuring that your sensitive information is processed according to your organization’s security standards while providing the Celonis Platform with the encrypted access it needs to analyze your processes.

Expand all

[## Before you begin](#UUID-f92a4e3b-0845-ed71-a832-f854f1505229_section-idm4592887561600034270633198631_body)

Make sure your system meets hardware and software requirements for clients. See [System requirements](on-prem-client-system-requirements.html "On-prem clients system requirements").

[## 1. Preparing the installation package](#UUID-f92a4e3b-0845-ed71-a832-f854f1505229_UUID-69f3cfa8-7df1-a029-4a0d-93cb4837f541_body)

If you’re a Celonis Platform user follow these steps to prepare the installation package which you can later send to your IT admin so that they can install it on a central server.

**Before you begin:**

You need to have admin rights to prepare the installation package.

**Procedure:**

1. In your Celonis Platform instance, go to **Admin & Settings > On-prem clients.**
2. In the upper-right corner, click **Set up on-prem clients**.
3. Select **Install the clients on a central server**.
4. Enter a unique installation package name.
5. Select the operating system on which you want to install the clients.
6. Enter your IT admin email address and click **Send**.

Your IT admin will receive a link where they can download the package prepared based on the settings you selected. They will also receive detailed instructions on how to install the package on the server. Once they completed the installation, you’ll receive a verification URL or code to verify the connection with the Celonis Platform. If you already received that, jump straight to [3. Verifying the installation](installing-on-prem-clients-on-macos.html#UUID-f92a4e3b-0845-ed71-a832-f854f1505229_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2 "3. Verifying the installation").

[## 2. Installing on-prem clients](#UUID-f92a4e3b-0845-ed71-a832-f854f1505229_section-idm4585726803472034246190521801_body)

1. Using the link from the email you received from the Celonis Platform user, download the installation package.
2. Extract the installation package to the **home folder** of your MacOS.
3. (optional) Establish a connection with SAP:

   Download the SAP Java Connector (SAP JCo) library, version 3.1 or later, and place it in your local directory. SAP Jco allows applications to communicate with SAP systems using SAP's RFC protocol.

   1. Download the respective package from the [SAP Support Portal](https://support.sap.com/en/product/connectors/jco.html).

      **Note**

      Only SAP Service users (S-user) can download software from SAP portals. Usually, a customer's SAP BASIS has this access.

      The downloaded SAP Jco folder already contains two files: a Java part “sapjco3.jar”, and an operating system-specific part e.g. sapjco3.[.dll | .so | .sl ].
   2. Copy the content of the SAP Jco folder into the following Automation Agent and Extraction Agent folders:

      - **For Automation Agent**

        `{installation_folder}/automation-agent/libraries/external`
      - **For Extraction Agent**

        `{installation_folder}/extraction-agent/libraries/external`
4. In Terminal, go to the *Shared* folder of the package you extracted and run:

   ```
   xattr -cr opc-management-tool.app
   ```

   **Note**

   The `-c` flag removes all attributes, and `-r` applies recursively to the entire targeted .app directory contents.
5. From the *Shared* folder run *OPC-Managemenet-Tool.app*.

   **Tip**

   **We also provide a CLI version of this tool**

   In Terminal, run:

   ```
   ./opc-management-tool.app/Contents/MacOS/opc-management-tool cli
   ```
6. In the Management Tool, select the clients you want to install.
7. (optional) In the Management Tool, generate the encryption key to encrypt sensitive data in the installation package:

   1. Click **Generate encryption key**.

      **Tip**

      We use *java.security* and *javax.crypto* fameworks to store and encrypt sensitive data in the application.yml file.
   2. Define a passphrase which will be used to create the hash for the private encryption key.
   3. Click **Save**.

      This will automatically create the *celonis-kms.yml* file and encrypt all sensitive data like the application key and the proxy password.
8. (optional) If necessary, define the proxy server between the on-prem client and the source system or between the on-prem client and the Celonis Platform:

   1. Click **Use proxy for communication**.
   2. Define the properties of your proxy connection:

      - **protocol**: HTTP or HTTPS
      - **host**: the IP address or hostname of the proxy server
      - **port**: the port at which the server can be reached
      - **user** (optional): the user name for basic authentication with the proxy
      - **password** (optional): password for basic authentication with the proxy
   3. Click **Save**.

      This will automatically ensure that your connection will use the proxy for communication.
9. Click **Connect to Celonis Platform** to generate the Verification URL.
10. Copy the Verification URL and share it with your Celonis Platform user.
11. (Optional) Connect to SAP. **This step is only required when automating in SAP.**

[## 3. Verifying the installation](#UUID-f92a4e3b-0845-ed71-a832-f854f1505229_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2_body)

If you’re a Celonis Platform user and you received a request to verify the on-prem client installation from your IT admin, follow these steps.

**Important**

To verify the on-prem clients' installation, you must be Celonis Platform admin or you must have "edit agent" permissions assigned to your role.

**Procedure:**

1. Go to the Verification URL sent by the IT admin.
2. Log in to Celonis Platform.
3. Verify the request and click **Authorize**.

   On-prem clients can now connect to Celonis Platform and create their own OAuth client. Newly created clients will also now be visible in the On-prem clients overview page under **Admin & Settings** > **On-prem clients**.

   **Note**

   In July 2025, Celonis Platform replaced appkeys with OAuth 2.0 as a method of authentication for OPC. For details, see [AUTOMATION OAuth for on-prem clients (2025-08-13)](august-2025-release-notes.html#UUID-c0c8ecc5-3a03-4eb6-07cf-a82de779a0a8_UUID-d1d7f4ff-eb32-30a8-6d2c-c88ae9860dfd "AUTOMATION OAuth for on-prem clients (2025-08-13)").

   If you're having trouble connecting the on-prem clients to Celonis Platform, see [Manual authentication](authenticating-on-prem-clients-manually.html "Authenticating on-prem clients manually").

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/installing-on-prem-clients-on-windows

# Installing on-prem clients on Windows

To transform your raw business data into actionable insights, the Celonis Platform requires a secure, high-performance bridge to your local infrastructure. Installing the On-Premise Client (OPC) on Windows creates this essential link, allowing for real-time data extraction and seamless process automation while maintaining your organization’s internal security standards.

This setup ensures that your sensitive data remains protected behind your firewall, only communicating with the Celonis Platform through encrypted, authorized channels.

Expand all

[## Before you begin](#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_UUID-c85889dd-85b2-2813-781a-564ae5fc8c47_body)

- Make sure your system meets hardware and software requirements for clients. See [System requirements](on-prem-client-system-requirements.html "On-prem clients system requirements").
- For security reasons, we advise you to install the on-prem agent package using a non-admin Windows user account.

[## 1. Preparing the installation package](#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_UUID-69f3cfa8-7df1-a029-4a0d-93cb4837f541_body)

If you’re a Celonis Platform user follow these steps to prepare the installation package which you can later send to your IT admin so that they can install it on a central server.

**Before you begin:**

You need to have admin rights to prepare the installation package.

**Procedure:**

1. In your Celonis Platform instance, go to **Admin & Settings > On-prem clients.**
2. In the upper-right corner, click **Set up on-prem clients**.
3. Select **Install the clients on a central server**.
4. Enter a unique installation package name.
5. Select the operating system on which you want to install the clients.
6. Enter your IT admin email address and click **Send**.

Your IT admin will receive a link where they can download the package prepared based on the settings you selected. They will also receive detailed instructions on how to install the package on the server. Once they completed the installation, you’ll receive a verification URL or code to verify the connection with the Celonis Platform. If you already received that, jump straight to [3. Verifying the installation](installing-on-prem-clients-on-windows.html#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2 "3. Verifying the installation").

[## 2. Installing on-prem clients](#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_section-idm4544440065448034244636572845_body)

If you’re an IT admin and you received an installation request from your Celonis Platform users, follow these steps.

**Procedure:**

1. Using the link from the email you received from the Celonis Platform user, download the installation package.
2. Extract the ZIP package.
3. (optional) Establish a connection with SAP.

   Download the SAP Java Connector (SAP JCo) library, version 3.1 or later, and place it in your local directory. SAP Jco allows applications to communicate with SAP systems using SAP's RFC protocol.

   1. Download the respective package from the [SAP Support Portal](https://support.sap.com/en/product/connectors/jco.html).

      **Note**

      Only SAP Service users (S-user) can download software from SAP portals. Usually, a customer's SAP BASIS has this access.

      The downloaded SAP Jco folder already contains two files: a Java part “sapjco3.jar”, and an operating system-specific part e.g. sapjco3.[.dll | .so | .sl ].
   2. Copy the content of the SAP Jco folder into the following Automation Agent and Extraction Agent folders:

      The Celonis Agent is configured to read the library from this directory.

      - **For Automation Agent**

        `{installation_folder}/Automation Agent/libraries/external`
      - **For Extraction Agent**

        `{installation_folder}/Extraction Agent/libraries/external`
4. Install your clients using the installer or with the manual installation folder:

   **Tip**

   The installer can be used only once. If you want to install multiple on-prem clients on the same machine, use the manual installation folder.

   - **Using the installer**

     1. Double-click *Celonis\_On\_Prem\_Clients\_Installer.exe* to run the installer.
     2. Follow the steps of the installation wizard.
   - **Using the manual installation folder**

     1. Go to the *Celonis On-prem Clients Manual Installation* folder.
     2. Copy the *Celonis On-prem Clients* folder and paste it to the *Program Files* folder.

        **Important**

        If you want to install multiple on-prem clients, make sure that the name of each copied folder starts with *Celonis On-prem Clients* . For example, *Celonis On-prem Clients1*, *Celonis On-prem Clients2*.
     3. Go to the *Shared* folder and open the On-prem Client Management Tool.

   **Tip**

   If you need to set up SNC for SAP, see [Setting up the agents with SNC](setting-up-the-agents-with-snc.html "Setting up the agents with SNC").

   Once the installation is completed, the On-prem Client Management Tool opens.
5. In the Management Tool, select the clients you want to install.
6. (optional) In the Management Tool, generate the encryption key to encrypt sensitive data in the installation package:

   1. Click **Generate encryption key**.

      **Tip**

      We use *java.security* and *javax.crypto* fameworks to store and encrypt sensitive data in the application.yml file.
   2. Define a passphrase which will be used to create the hash for the private encryption key.
   3. Click **Save**.

      This will automatically create the *celonis-kms.yml* file and encrypt all sensitive data like the application key and the proxy password.
7. (optional) If necessary, define the proxy server between the on-prem client and the source system or between the on-prem client and the Celonis Platform:

   1. Click **Use proxy for communication**.
   2. Define the properties of your proxy connection:

      - **protocol**: HTTP or HTTPS
      - **host**: the IP address or hostname of the proxy server
      - **port**: the port at which the server can be reached
      - **user** (optional): the user name for basic authentication with the proxy
      - **password** (optional): password for basic authentication with the proxy
   3. Click **Save**.

      This will automatically ensure that your connection will use the proxy for communication.
8. Click **Connect to Celonis Platform** to generate the Verification URL.
9. Copy the Verification URL and share it with your Celonis Platform user.
10. (Optional) Connect to SAP. **This step is only required when automating in SAP.**

[## 3. Verifying the installation](#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_UUID-9c36c1d0-2ef4-2641-4362-cff251fef0e2_body)

If you’re a Celonis Platform user and you received a request to verify the on-prem client installation from your IT admin, follow these steps.

**Important**

To verify the on-prem clients' installation, you must be Celonis Platform admin or you must have "edit agent" permissions assigned to your role.

**Procedure:**

1. Go to the Verification URL sent by the IT admin.
2. Log in to Celonis Platform.
3. Verify the request and click **Authorize**.

   On-prem clients can now connect to Celonis Platform and create their own OAuth client. Newly created clients will also now be visible in the On-prem clients overview page under **Admin & Settings** > **On-prem clients**.

   **Note**

   In July 2025, Celonis Platform replaced appkeys with OAuth 2.0 as a method of authentication for OPC. For details, see [AUTOMATION OAuth for on-prem clients (2025-08-13)](august-2025-release-notes.html#UUID-c0c8ecc5-3a03-4eb6-07cf-a82de779a0a8_UUID-d1d7f4ff-eb32-30a8-6d2c-c88ae9860dfd "AUTOMATION OAuth for on-prem clients (2025-08-13)").

   If you're having trouble connecting the on-prem clients to Celonis Platform, see [Manual authentication](authenticating-on-prem-clients-manually.html "Authenticating on-prem clients manually").

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/managing-on-prem-clients

# Managing on-prem clients

The On-prem clients page is your central command center for monitoring the health and connectivity of your environment. From here, you can get a real-time overview of every Automation Agent and SAP extractor currently linked to your system.

Once your clients are connected, you can take direct action to maintain your infrastructure:

- **Monitor connectivity**: Instantly see which agents are online or experiencing issues.
- **Troubleshoot with logs**: Select a specific client and date to download detailed logs for rapid debugging.
- **Stay informed**: Subscribe to automated alerts so you're the first to know via email if a client disconnects.

Expand all

[## Managing your on-prem clients](#UUID-ad10d1de-ab09-fd5b-d396-0803621a003b_section-id235477300574719_body)

To manage your on-prem clients from the dashboard:

1. Click **Admin & Settings - On-Prem Clients**.
2. **Check client status**: Review the status column to ensure your infrastructure is healthy. A green indicator means your client is active and communicating with the platform.
3. **Download Diagnostic Logs**: If you need to troubleshoot a specific connection:

   - Locate the client in the list.
   - Select the Download Logs option.
   - Choose the specific date for the logs you require to begin the download.
4. **Set Up Disconnection Alerts**: To ensure you never miss a localized outage, toggle the Subscribe to alerts option for your critical clients. You will automatically receive an email notification if that specific client goes offline.

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [On-prem client logs](on-prem-client-logs.html "On-prem client logs")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/on-prem-apps

# Action Flow modules for on-prem apps

Here's the list of on-premise applications you can connect to using the Celonis On-Prem Agent.

We currently allow connecting to the following on-premise apps out-of-the-box:

- [SAP](sap-action-flows.html "SAP Action Flows")
- [HTTP (On-prem)](http--on-prem---action-flow-.html "HTTP (On-Prem) (Action Flow)")

**Note**

In addition, HTTP (On-prem) can be used to connect to the vast majority of on-premise applications like Jira Server, Oracle EBS, UiPath, and many more. For more information on your specific on-prem applications, reach out to your IT partner.


---

## admin/on-prem-clients/on-prem-client-logs

# On-prem client logs

Monitor the health and activity of your On-Premise Clients (OPC) through local log files. These logs are essential for troubleshooting connection issues, tracking extraction performance, and auditing agent activity.

## Accessing your on-prem client logs

To access your on-prem client logs in the Celonis Platform:

1. Click **Admin & Settings - On-prem clients**.
2. For your client you want to view, click **Options - Logs**.

## Available client logs

Here's the list of all available OPC log types with their details:

Filter

- Log name
- Purpose
- Location
- Retention period

| Log name | Purpose | Location | Retention period |
| --- | --- | --- | --- |
| `CelonisAgent.err.log` | Produced by the running OS service of the Agent. Contains errors sent to stderr by the Agent. | `..\Celonis On-prem Clients\AGENT_TYPE\logs` | Unlimited; Manually deleted, not removed automatically. |
| `CelonisAgent.out.log` | Produced by the running OS service of the Agent. Contains logs sent to stdout by the Agent | `..\Celonis On-prem Clients\AGENT_TYPE\logs` | Unlimited; Manually deleted, not removed automatically. |
| `CelonisAgent.wrapper.log` | Produced by the running OS service of the Agent. Contains logs produced by the service itself. | `...\Celonis On-prem Clients\Extraction Agent\logs` | Unlimited; Manually deleted, not removed automatically. |
| `YYYY-MM-DD.n.log` | Produced by the Agent process itself | `..\Celonis On-prem Clients\AGENT_TYPE\logs\YYYY-MM-DD` | 28 days by default. Scheduled using using the `application-local.yml` file. See [Setting up retention periods for the logs on the extractor server](supporting-content-for-sap-ecc-and-sap-s-4hana-data-connections.html#UUID-44743b33-54e2-e6a8-27f7-7deb34a8bbe8_UUID-bc983c7d-c9d4-6a18-f205-b52bfdc5740e). |
| `YYYY-MM-DD` | Produced by the OPC Management Tool. Folder will be contained in the same location as the opc-management-tool executable | `..\Celonis On-prem Clients\Shared\logs` | Unlimited; Manually deleted, not removed automatically. |

| Log name | Purpose | Location | Retention period |
| --- | --- | --- | --- |
| `CelonisAgent.err.log` | Produced by the running OS service of the Agent. Contains errors sent to stderr by the Agent. | `..\Celonis On-prem Clients\AGENT_TYPE\logs` | Unlimited; Manually deleted, not removed automatically. |
| `CelonisAgent.out.log` | Produced by the running OS service of the Agent. Contains logs sent to stdout by the Agent | `..\Celonis On-prem Clients\AGENT_TYPE\logs` | Unlimited; Manually deleted, not removed automatically. |
| `CelonisAgent.wrapper.log` | Produced by the running OS service of the Agent. Contains logs produced by the service itself. | `...\Celonis On-prem Clients\Extraction Agent\logs` | Unlimited; Manually deleted, not removed automatically. |
| `YYYY-MM-DD.n.log` | Produced by the Agent process itself | `..\Celonis On-prem Clients\AGENT_TYPE\logs\YYYY-MM-DD` | 28 days by default. Scheduled using using the `application-local.yml` file. See [Setting up retention periods for the logs on the extractor server](supporting-content-for-sap-ecc-and-sap-s-4hana-data-connections.html#UUID-44743b33-54e2-e6a8-27f7-7deb34a8bbe8_UUID-bc983c7d-c9d4-6a18-f205-b52bfdc5740e). |
| `YYYY-MM-DD` | Produced by the OPC Management Tool. Folder will be contained in the same location as the opc-management-tool executable | `..\Celonis On-prem Clients\Shared\logs` | Unlimited; Manually deleted, not removed automatically. |

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [On-prem client logs](on-prem-client-logs.html "On-prem client logs")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")


---

## admin/on-prem-clients/on-prem-clients

# On-premises clients (OPC)

Celonis on-premises clients (OPC) offer a secure way to extract data from external source systems and selectively access on-premises apps to perform predetermined actions. The OPC are a successor to our uplink-based extractors, providing a cloud based service that's a reliable and scalable method of connecting to your source systems.

**Existing on-prem extractors**

Celonis is fully deprecating and discontinuing support for the SAP on-premise extractor (OPE) by the end of **December 2026**. To ensure continuity of data flow, all customers using OPE must migrate to the modern On-Premise Client (OPC) by that day.

## Benefits of using OPC

While your existing uplink extractor configurations are valid, we recommend switching to our OPC for the following reasons:

- **Improved reliability and scalability**: With the processing of data being cloud based, the OPC service is quicker, more reliable, and has the ability to scale based on your demand.
- **Simplified setup**: The same SAP connection can be used for both the SAP extractor and for the process automation, simplifying the setup considerably. In addition to this, Microsoft Visual C++ 2010 is no longer required.
- **Cloud updates**: After installing the client (which acts as a passive mediator and carries no logic), orchestration and processing are managed by a cloud service. This means that in most cases, updates or fixes are cloud-based and are run by Celonis.

## Migrating to OPC from uplink extractors

As on-premises clients are a new service, you need to configure them independently from your existing uplink extractors. We recommend that you keep your uplink extractors running while doing this configuration, allowing you to switch when you are confident that they are working as expected.

For effective data extraction from SAP, on-prem clients require the RFC module 3.6 or later. If you're already using the RFC, make sure to update it accordingly.

Once your OPC is running, you can switch the Data Connection in your data pools.

|  |
| --- |
|  |

Your uplink extractors can then be removed by uninstalling the Windows or Linux service.

## Further OPC information

For more information about the Celonis OPC:

- For an overview of OPC and their architecture, see: [IT architecture overview](it-architecture-overview.html "IT architecture overview for on-prem clients").
- For installation guides, see: [Installing](installing-on-prem-clients.html "Installing on-prem clients").
- For frequently asked questions about OPC installation and configuration, see: [FAQ](on-premise-clients--opc--installation-faq.html "On-premise Clients (OPC) Installation FAQ").
- And for troubleshooting your OPC, see: [Troubleshooting](troubleshooting-on-prem-clients-installation.html "Troubleshooting on-prem clients installation").


---

## admin/on-prem-clients/on-prem-clients-encryption

# Encrypting OPC Connection Data

On-premise client (OPC) encryption secures sensitive connection metadata—such as application keys and proxy passwords—stored within your installation package. By generating a dedicated encryption key, you ensure that these credentials are encrypted using the AES-256 GCM standard, preventing unauthorized access to plain-text configuration files.

This configuration is typically performed during the initial installation of the OPC on Windows, Linux, or Mac. While the Celonis Platform functions without manual key generation, we strongly recommend this step for all production environments to meet enterprise security and compliance requirements. By default, the system saves the encryption key (`celonis-kms.yml`) in the shared folder, though you can specify a custom secure location during the process.

Expand all

[## Before you begin](#UUID-b1f58971-bad7-bc58-cdb2-66a8908fcdeb_section-id235477278020512_body)

Before configuring your OPC connection:

- **Main Installation**: Ensure you have already followed the initial setup steps for [Windows](installing-on-prem-clients-on-windows.html "Installing on-prem clients on Windows"), [Linux](installing-on-prem-clients-on-linux.html "Installing on-prem clients on Linux"), or [MacOS](installing-on-prem-clients-on-macos.html "Installing on-prem clients on MacOS").
- **Installation Package**: You must have the on-premise client installation package downloaded and extracted on your machine.
- **System Permissions**: You must have Administrator privileges (Windows) or Root/Sudo access (Linux/macOS) on the host machine to execute configuration commands.

[## Encryption your OPC connection data](#UUID-b1f58971-bad7-bc58-cdb2-66a8908fcdeb_section-id235477278064078_body)

To encrypt your OPC connection data:

1. **Choose your storage location**: Decide if you will use the default shared folder or a custom secure directory for your encryption key.
2. **Generate the encryption key**: Run the key generation command as part of your specific OS installation.
3. **Verify file creation**: Ensure the `celonis-kms.yml` file is generated in your chosen directory.
4. **Confirm encryption**: Check that sensitive fields (application keys, proxy passwords) are no longer stored in plain text.

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [FAQ](on-premise-clients--opc--installation-faq.html "On-premise Clients (OPC) Installation FAQ")
- [Troubleshooting](troubleshooting-on-prem-clients-installation.html "Troubleshooting on-prem clients installation")


---

## admin/on-prem-clients/on-prem-client-system-requirements

# On-prem clients system requirements

Here are the system requirements for Automation client and the SAP extraction client.

For system requirements for uplink-based SAP Extractor, see [SAP extraction client for PI/PO and SAP 4.6C](step-1--installing-sap-extractor.html "SAP extraction client for PI/PO and SAP 4.6C").

Expand all

[## Hardware](#UUID-8c470af1-19ad-7675-1c94-106286d1c983_id_SetupserverforCelonisAgent-Hardware_body)

**Note**

The hardware requirements are driven primarily by how much data is extracted simultaneously. There is no way to precisely estimate the data size, and the best approximation is how many tables will be extracted concurrently. The requirements below are for a scenario when 12 large tables (~150 columns) are extracted concurrently.

| Automation Agent | SAP Extractor |
| --- | --- |
| - 4GB memory - CPU 2 cores - 10GB free disk space | - Virtual machine or physical server - CPU: Min. Intel Xeon processor with 4 Cores - RAM: min. 16 GB - Disk space: min. 110 GB on the tmp directory - Location of the server needs to be in the same network as the source system(s) that should be connected |

[## Software](#UUID-8c470af1-19ad-7675-1c94-106286d1c983_id_SetupserverforCelonisAgent-OperatingsystemandsoftwarecheckALL4steps_body)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

- On-prem clients run on the following **64-bit operating systems**:

  - **Windows** 2022 Server or later

    Windows Server 2012, 2012 R2, 2016, and 2019 are expected to function based on architectural compatibility; however, these versions have not been officially validated in our latest testing cycle and are not formally supported.
  - **Linux**

    - Distributions: Ubuntu 20.04 or later.

      Other major 64-bit distributions (including but not limited to RHEL 9+, CentOS 9+, and Debian 10+) are expected to function correctly but have not been formally tested and are not formally supported.
    - Interface: Fully supports both CLI and GUI environments.
- Runtime dependencies:

  **Note**

  Most servers have these dependencies installed by default and don't require manual installation.

  - Windows: Microsoft Edge WebView2

    Microsoft Edge WebView2 is automatically downloaded and installed as part of the on-prem clients installation. However, if you're using a server that doesn't allow for automatic downloads, you must manually download and install [Microsoft Edge WebView2](https://developer.microsoft.com/en-gb/microsoft-edge/webview2/?form=MA13LH#download).
  - Linux: libgtk-3 and libwebkit

    **Note**: This dependency is only required if UI is needed. There are no extra dependencies for the CLI tool.
  - MacOS: Xcode command line tools
  - GUI-less servers (using CLI tool): No dependencies
- Java 25 or later; OpenJDK is also supported, and we recommend [AdoptiumOpenJDK](https://adoptium.net/temurin/releases/)
- For Windows, install the following redistributable package available from [Microsoft Download Center](https://www.microsoft.com/en-us/download/):

  - Microsoft Visual C++ 2013 Redistributable Package (x64)
- SAP Java Connector (SAP JCo) **3.1 or later** - this library is necessary for establishing a connection between Celonis Platform and your SAP instance. For detailed instructions on how to use this library, see [4. (optional) Connecting to SAP](/document/preview/2429619#UUID-d38c645b-2c35-6036-740c-87efa12b416c).4. (optional) Connecting to SAP
- RFC module - this module is necessary for extracting data from the SAP database based on information received from the SAP extraction client. See [Installing the RFC module](installing-the-rfc-module.html "Installing the RFC module").

  **Note**

  The on-prem client is compatible with RFC module version 3.6.0 or later.

[## Network connectivity and access for SAP Extractor](#UUID-8c470af1-19ad-7675-1c94-106286d1c983_section-idm4541762500208033687069240547_body)

**Connections for operations of SAP Extractor**

Filter

- Source system
- Target system
- Port
- Protocol
- Description

Table 1. Connections for operations of the SAP Extractor

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | SAP ECC system | 33XX (where xx is the system number) | TCP | RFC connection from on-premise extractor server to the SAP system. The system number can be retrieved from the SAP basis team. |
| On-premise extractor server | Celonis cloud endpoint | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the endpoint depend on the cloud realm (which can be seen in the URL) and they can be found the section below. |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise extractor server | SAP ECC system | 33XX (where xx is the system number) | TCP | RFC connection from on-premise extractor server to the SAP system. The system number can be retrieved from the SAP basis team. |
| On-premise extractor server | Celonis cloud endpoint | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the endpoint depend on the cloud realm (which can be seen in the URL) and they can be found the section below. |




**Cloud IP addresses depending on the realm**

The IP of the realm where the Celonis Platform team resides should be allowlisted so that the on-premise extractor can communicate with the Celonis Platform cloud endpoints.

**Using proxies (optional)**

Please refer to [Proxy settings for on-premise clients](how-do-i-set-up-an-on-premise-extractor-.html#UUID-4dd7deeb-240e-92b8-b3d6-73fcd3600122_UUID-4a7deb4b-5607-1873-52be-b4008d1e99e2 "Proxy settings for on-premise extractors").

### Ensuring certificate trust for OPC agents

If your environment uses SSL interception as part of a firewall, you may encounter connection issues because OPC agents cannot validate the Celonis server certificates. This typically occurs when the firewall intercepts the SSL connection, establishes a new one with the client, and then presents a custom certificate, often self-signed or signed by an internal Certificate Authority (CA). These Man-in-the-Middle (MITM) certificates are not trusted by the OPC agent by default, leading to failed certificate validation.

To fix this issue, you can import your MITM certificates into the Java keystore used by the OPC agent. This allows the agent to trust the intercepted SSL connection and successfully validate the Celonis server certificates. For more information on adding your certificates to the OPC agent keystore, see ["Unable to find valid certification path" errors](troubleshooting-on-prem-clients-installation.html#UUID-1391d751-6a27-92fd-c3d7-6211863b8f4f_section-idm4609055939547234289582798966 "\"Unable to find valid certification path\" errors").

## Related topics

- [Installing on-prem clients](installing-on-prem-clients.html "Installing on-prem clients")


---

## admin/on-prem-clients/on-premise-clients--opc--installation-faq

# On-premise Clients (OPC) Installation FAQ

## Deployment & Infrastructure

Expand all

[### Where should I install the On-premise Clients?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm4634192726702433684771056533_body)

We recommend installing the OPC on a **central server**. Local installations should be reserved for small-scale testing or sandbox environments.

[### Which operating systems are supported?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm450661002818083368477356673_body)

The OPC can be installed on:

- **Windows**
- **Linux**
- **MacOS**

[### Can I run multiple installation packages on a single server?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm457581668771203368477244045_body)

While one installation per server is typically sufficient, you can host multiple packages if necessary. To do this:

1. Prepare a unique installation package for each instance. See [1. Preparing the installation package](installing-on-prem-clients-on-windows.html#UUID-8f374d81-1c12-0c82-74b1-4544196a7f3f_UUID-69f3cfa8-7df1-a029-4a0d-93cb4837f541 "1. Preparing the installation package").
2. **Crucial:** Extract each package into its own **separate folder**. Do not alter the internal folder structure or naming conventions.
3. Navigate to [`On-prem client installation folder`] > `Celonis On-prem Clients Manual Installation` > `Celonis On-prem Clients` > `Shared` and launch the **Management Tool**.
4. Follow the tool's prompts to complete setup.

**Note**

Every client must have a **unique ID**. Do not clone or copy existing client folders to other machines, as this will cause malfunctions.

## Scaling & Connectivity

[### How many Automation Agents do I need?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm4575816876160033684771564256_body)

A single Agent can connect to multiple on-premise applications (e.g., SAP and HTTP simultaneously) as long as they are within the same network.

We recommend separating environments to ensure stability:

- **QA/Sandbox:** One Agent connecting to all non-production systems.
- **Production:** One dedicated Agent connecting to all productive systems.

## Updates & Versioning

[### How do I upgrade my OPC?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm23483407310941_body)

Since the OPC acts as a passive mediator, most logic and orchestration are handled by the Celonis Platform. This means **most updates are automatic** and handled by Celonis.

If you need to perform a manual migration to a newer version:

1. Uninstall the existing clients.
2. Clear the environment of all OPC-related files.
3. Perform a fresh installation of the new version.

[### Which version should I install?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm4634192286454433687079568916_body)

Always use the On-prem clients page within the Celonis Platform to start your setup. This ensures you are automatically guided to the latest version compatible with your operating system.

[### Where can I find detailed release notes?](#UUID-6d27bfe6-f626-47ba-aaae-e0bd34ff2462_section-idm4575814095588833687081472703_body)

Release notes and all version history are available via the [Download Portal](https://docs.celonis.com/en/download-portal.html).

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")


---

## admin/on-prem-clients/on-premise-extractors

# On-premise extractors

**From April 2026: Java requirement for on-prem JDBC extractor**

Starting April 2026, upgrading to the latest on-premise JDBC extractor will require Java 25. This is not a breaking change, as customers who do not update their extractor to the latest JDBC version will not be affected. We will update this page with the exact release version once it is finalized. No immediate action is required, but upgrades should be planned in advance.

This section has general information for uplink-based on-premise extractors. We have on-premise extractors available for SAP, and for database connections using JDBC. If you need more than one extractor type, it's fine to install multiple on-premise extractors on the same system.

**Note**

Documentation for the JDBC Extractor has been migrated to [JDBC Extractor](jdbc-extractor.html "JDBC Extractor").

**SAP on-premise extractors will be deprecated by the end of December 2026**

To ensure continuity of data flow, all customers using SAP on-premise extractors (OPE) must migrate to more modern On-Premise Client (OPC) by the end of December 2026. For more information about the deprecation of OPE, see [BREAKING DATA INTEGRATION Deprecating SAP on-prem extractor: Action required before December 31, 2026](upcoming-changes.html#UUID-f083cadf-38e0-5378-a593-bdbdea4050f8_UUID-da12147e-0eb0-1554-1174-fc9f3a66f3c9 "BREAKING DATA INTEGRATION Deprecating SAP on-prem extractor: Action required before December 31, 2026").

The on-prem clients run mostly in the Celonis Platform cloud, so you'll get these benefits compared to the uplink-based on-premise extractors:

- **Cloud updates** - Most of the orchestration and processing have been rewritten to run in the cloud. This significantly simplifies the distribution of updates over the cloud deployments. Upgrading of the on-premise component will be required only in exceptional cases, if at all.
- **Improved reliability and scalability** - Transfer of the processing to the cloud takes the load off the on-premise agent and allows us to handle more data with less on-premise capabilities.
- **Simplified setup** - There's a user-friendly GUI to monitor and manage the on-prem client installation and services. The same SAP connection can be used both for the SAP Extractor and Process Automation. And the format conversion is done in the Celonis Platform cloud, so you don't need to install Microsoft Visual C++ 2010 for it.

For the instructions to install OPC client, see [Installing](installing-on-prem-clients.html "Installing on-prem clients").

There are the following on-premise extractors in Celonis Platform:

- **JDBC Extractor for database connection**

  **Note**

  Documentation for the JDBC Extractor has been migrated to [JDBC Extractor](jdbc-extractor.html "JDBC Extractor").
- **SAP Extractor**

The connection between our on-premise extractors and the Celonis Platform is always established by the extractor. So the extractor doesn't have to be reachable from the Celonis Platform. Although extraction appears to be triggered from Data Integration, actually an on-premise extractor continuously polls Data Integration (on average every 7-8 seconds) for new extractions to run. So only a one-way connection is required.

These are the tasks that an on-premise extractor does:

1. Establish the connection to Data Integration.
2. Poll Data Integration for new extractions to be executed and collect information.
3. Run the extraction in the source system.
4. Receive the data and transform the data to parquet format.
5. Use the Data Push API to push the parquet files to Data Integration.

These are the responsibilities of Data Integration in the process:

1. Define tables and filters for an extraction.
2. Run the Data Job with the extraction.
3. Receive the parquet files and insert them into the database.


---

## admin/on-prem-clients/prerequisites-for-on-premise-jdbc-extractors

# Prerequisites for on-premise JDBC Extractors

The following sections explain the prerequisites connecting the Celonis Platform to your database using the JDBC on-premise extractor for Uplink connections.

**Note**

Once you have met these prerequisites, proceed to [Downloading](downloading-on-premise-jdbc-extractors.html "Downloading on-premise JDBC Extractors").

Expand all

[## JDBC Extractor system and software requirements](#UUID-7e43238b-dd4d-43df-22f2-92d49b505382_section-idm4540372907913634242921118634_body)

The JDBC Extractor supports on-premise deployments across various environments:

- Physical or Virtual Machines (VM): Standard installation on supported operating systems.
- Containerized (Docker): The JDBC Extractor is provided as a Docker image for deployment on container orchestration platforms (e.g., Kubernetes). For more information, see [Setting up on Docker](setting-up-jdbc-extractors-on-docker.html "Setting up JDBC Extractors on Docker") and [Setting up on Kubernetes](jdbc-k8.html "Setting up JDBC Extractors on Kubernetes").

[### Hardware requirements](#UUID-7e43238b-dd4d-43df-22f2-92d49b505382_section-idm2533544368364922_body)

**Note**

Containerized deployments require the same compute and memory allocations as physical and VM installations.

- Physical server, virtual machine (VM), or containerized deployment (Docker).
- CPU: Minimum of an Intel Xeon processor with four cores.
- RAM: **minimum of 16 GB**.
- Disk space: **minimum of 110 GB**. This can be on a separate partition or network drive.
- The server needs to be located in the same network as the source systems that you're going to connect.

[### Operating system and software requirements](#UUID-7e43238b-dd4d-43df-22f2-92d49b505382_section-idm2533544368398196_body)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

- You must have administrative rights for setup.
- 64-bit operating system:

  **Note**

  The following operating systems are only suggestions. Any operating system capable of running the required Java version for your JDBC Extractor package can be used.

  - Windows Server: 2019 and 2022. The earliest supported version is 2012 R2.
  - Ubuntu: 18.04 LTS (tested version). Newer versions are supported.
  - Red Hat: Red Hat Enterprise Linux 7 (tested version). Newer versions are supported.
  - SUSE: SUSE Enterprise Linux (SLES) 12 and 15 (tested version). Newer versions are supported.
  - Oracle: Oracle Linux 6 and 7 (tested version). Newer versions are supported.
- Java: Versions 17 to 25 are supported. We recommend using the newer version if possible.

  **Important**

  Starting with JDBC Extractor version `4.28.0` (2026-03-31), Java 25 is recommended.

  From JDBC Extractor version `3.6.0` (2025-03-03) through `4.26.1` (2026-03-20), Java 21 or higher is required.

  - OpenJDK 21 is also supported. We recommend Adoptium's Eclipse Temurin OpenJDK 21, see [Adoptium - Eclipse Temurin - Latest Releases](https://adoptium.net/en-GB/temurin/releases/).
- For the JDBC Extractor, on Windows download and install the [Microsoft Visual C++ 2015-2019 Redistributable Package (x64)](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2015-2017-2019-and-2022).

[## Network settings for uplink connections](#UUID-7e43238b-dd4d-43df-22f2-92d49b505382_section-idm2533544941413970_body)

The following network settings apply for Uplink connections (via the on-premise extractor):

Filter

- Source system
- Target system
- Port
- Protocol
- Description

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise Extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise Extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL), and they can be found in the section below. |

| Source system | Target system | Port | Protocol | Description |
| --- | --- | --- | --- | --- |
| On-premise Extractor server | Source system | Depending on the database, typical ports are 5432 for PostgreSQL and 30015 for HANA for example. | TCP | JDBC connection from on-premise extractor server to the database. The port is the one you normally use to connect to the database. |
| On-premise Extractor server | Celonis Platform | 443 | TCP | HTTPS connection from on-premise extractor server to Celonis cloud endpoint. The IPs of the Celonis Platform depending on the cloud cluster (which can be seen in the URL), and they can be found in the section below. |

### Celonis Platform IP addresses depending on the cluster

Celonis Platform clusters each use multiple IPs. To connect the on-premises extractor server to the cloud endpoint, **you must enable all applicable cluster IPs in your cluster's firewall configuration**.

For a complete list of inbound and outbound Celonis Platform IP addresses to be allowlisted, see: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

[## User requirements](#UUID-7e43238b-dd4d-43df-22f2-92d49b505382_section-id235448811861406_body)

To successfully extract data, ensure your database user account meets the following requirements:

- Read access: The user must have `SELECT` privileges for all tables and views targeted for extraction.
- Metadata access: The user must have permission to query the `information_schema`. This allows the connector to retrieve essential table structures and schema metadata.
- Authentication: Ensure the user is configured for the specific authentication method required by your database.

  **Tip**

  If your database requires a specific authentication method, depending on the database and authentication method, it may be possible to use a [custom JDBC string](jdbc-extractor.html#UUID-a56f8ca4-2a92-0f30-be35-79db70261ace_section-idm4540235800804834242875289803 "Custom JDBC connection strings").

Refer to your database's documentation for specific details on how to implement these requirements.


---

## admin/on-prem-clients/proxy-settings-for-on-prem-clients-2401304

# Proxy settings for on-premise extractors

**Note**

Using proxies is optional and it is not required by on-premise extractors. It is only needed if your infrastructure demands it.

If you need to use a proxy server between the on-premise extractor and the source system or between the on-premise extractor and Data Integration in the cloud, you need to create a configuration file per connection and then link their configuration files in the extractor configuration.

## Specifying the location of the configuration file

|  |
| --- |
|  |

In the file application.yml (see above) you need to add the configurations displayed on the left

- **proxy-config-path**: This defines the path to the configuration of the proxy server between the source system and the extractor.
- **internal-proxy-config-path**: This defines the path to the configuration of the proxy server between the extractor and the cloud endpoint. It is called "internal" because it is used for the communication of two components provided by Celonis.

The path always needs to be defined relative to the extractor file.

Example 1: If the configuration file proxy.yml for the proxy between the source system and the extractor is in the same folder, the configuration should look as follows:

**application-local.yml**

```
celonis:
  proxy-config-path: proxy.yml
```

Example 2: If the configuration file proxy.yml for the proxy between the extractor and Data Integration in the cloud is in the subfolder conf, the configuration should look as follows:

**application-local.yml**

```
celonis:
  internal-proxy-config-path: conf/proxy.yml
```

## Creating a configuration file for the proxy server

For each separate proxy server you need to create a configuration file with the connection details:

- **enabled**: true if the proxy server should be activated, false otherwise
- **host**: the IP address or hostname of the proxy server
- **port**: the port at which the server can be reached
- **user** (optional): the user name for basic authentication with the proxy
- **password** (optional): password for basic authentication with the proxy


---

## admin/on-prem-clients/system-requirements-of-an-on-premise-extractor-server

# On-premise extractor (legacy) system requirements

Here's a list of system requirements for on-premise SAP Extractor (legacy) and Automation Agent (legacy).

**Note**

Prerequisites for the JDBC Extractor has been migrated to [Prerequisites](prerequisites-for-on-premise-jdbc-extractors.html "Prerequisites for on-premise JDBC Extractors").

**Tip**

Unless you're using an older version of SAP, 4.6C or earlier or you use PI/PO, we recommend installing the SAP Extractor as part of the on-prem client installation process. See [On-premises clients (OPC)](on-prem-clients.html "On-premises clients (OPC)").

Expand all

[## Hardware requirements](#UUID-d7689290-8a53-dc9c-e4ff-c80c065c1fd3_id_SystemrequirementsofanonpremiseExtractorserver-Hardware_body)

- Virtual machine or physical server.
- CPU: Minimum of an Intel Xeon processor with four cores.
- RAM: **minimum of 16 GB**.
- Disk space: **minimum of 110 GB**. This can be on a separate partition or network drive.
- The server needs to be located in the same network as the source systems that you're going to connect.

[## Operating system and software requirements](#UUID-d7689290-8a53-dc9c-e4ff-c80c065c1fd3_id_SystemrequirementsofanonpremiseExtractorserver-Operatingsystemandsoftware_body)

**Note**

The operating system listed below are only suggestion. You may use any operating system which is capable of running Java 25 or later.

- You need administrative rights for setup.
- 64-bit operating system:

  - Windows Server: 2019 and 2022. The earliest supported version is 2012 R2.
  - Ubuntu: 18.04 LTS (tested version). Newer versions are supported.
  - Red Hat: Red Hat Enterprise Linux 7 (tested version). Newer versions are supported.
  - SUSE: SUSE Enterprise Linux (SLES) 12 and 15 (tested version). Newer versions are supported.
  - Oracle: Oracle Linux 6 and 7 (tested version). Newer versions are supported.
- Java: Java 25 or later.

  - OpenJDK 25 is also supported - we recommend Adoptium's Eclipse Temurin OpenJDK 25, see [Adoptium - Eclipse Temurin - Latest Releases](https://adoptium.net/temurin/releases/?os=windows).
- On Windows install both of these Visual C++ packages:

  - Microsoft Visual C++ 2010 Redistributable Package (x64), available for download here: <https://www.microsoft.com/en-us/download/details.aspx?id=26999>.
  - Microsoft Visual C++ 2013 Redistributable Package (x64), available for download here: <https://support.microsoft.com/en-us/help/3179560/update-for-visual-c-2013-and-visual-c-redistributable-package>.

  **Note**

  We recommend that you download and install these specific versions of both packages. Other versions of these packages may not include some libraries required for the proper running of on-prem clients.

## Related topics

- [Setting up](how-do-i-set-up-an-on-premise-extractor--2401299.html "Setting up an on-premise extractor")
- [Configuring an on-premise extractor](configuring-an-on-premise-extractor.html "Configuring an on-premise extractor")
- [Connecting multiple teams](how-do-i-connect-to-multiple-teams-with-the-same-extractor-.html "Connecting multiple teams to the same extractor")


---

## admin/on-prem-clients/troubleshooting-on-prem-clients-installation

# Troubleshooting on-prem clients installation

This guide provides troubleshooting tips and solutions for common issues encountered during the installation and configuration of on-prem clients (OPC).

**Tip**

To view a comprehensive status report of your on-prem client installation, run the following command in your terminal: `.\opc-management-tool | echo`.

Expand all

[## The opc-management-tool.app is damaged and cannot be opened (MacOS)](#UUID-1391d751-6a27-92fd-c3d7-6211863b8f4f_section-idm4561378733076833710755630297_body)

**Symptoms:**

When attempting to open the `opc-management-tool.app` on MacOS, the following error is displayed: "opc-management-tool.app" is damaged and can't be opened.

**Cause:**

This is typically caused by insufficient file permissions or MacOS Gatekeeper restrictions.

**Solution:**

1. Move the application to the *Shared* folder.
2. Open Terminal and execute the following command: `xattr -cr opc-management-tool.app`

[## Device code authorization returns status 403 (Forbidden)](#UUID-1391d751-6a27-92fd-c3d7-6211863b8f4f_section-idm4577804616251233710766440464_body)

**Symptoms:**

In the On-prem Client Management Tool, clicking **Connect** results in a 403 (Forbidden) error.

**Cause:**

This error usually occurs when the connection requires an active VPN.

**Solution:**

Ensure your VPN is enabled and try again.

[## Microsoft Edge cannot read and write to its data directory (Windows)](#UUID-1391d751-6a27-92fd-c3d7-6211863b8f4f_section-idm4550670469969633906057479081_body)

**Symptoms:**

```
Microsoft Edge can't read and write to its data directory.
```

**Cause:**

This occurs if `opc-management-tool.exe` is run without administrative privileges.

**Solution:**

1. Open Task Manager and find `msedgewebview2.exe` in the Details tab.
2. Right-click it, go to Properties > Compatibility, and select **Run this program as an administrator**.

[## "Unable to find valid certification path" errors](#UUID-1391d751-6a27-92fd-c3d7-6211863b8f4f_section-idm4609055939547234289582798966_body)

**Symptoms:**

Extractor status is "unlinked" with `SunCertPathBuilderException` in the logs.

**Cause:**

The network proxy is overriding certificates or Java is missing the required CA certificates.

**Solution:**

Import the certificates using the Java keytool:

```
keytool -v -cacerts -storepass changeit -importcert -alias cel_root.pem -file ~/path/to/cert
```

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")


---

## admin/on-prem-clients/uipath--on-prem---action-flow-

# UiPath (on-prem) (Action Flow)

UiPath Robots interact with screens, systems, and applications to automate day-to-day tasks such as copy-pasting the data, making calculations, moving the files, etc.

Action Flows are very powerful in automating the systems that offer API integration. To provide full UI automation or automation of systems that don't allow for API integration, use a combination of Actions Flows with UiPath Robots.

In action flows you can start a new job and add items to a queue in your UiPath account.

To get started with UiPath, create an account at [uipath.com/](https://www.uipath.com/).

Expand all

[## Connecting UiPath (on-prem) to Celonis Platform](#UUID-05b2e313-8163-f2a4-f1d0-38fe4b471a63_section-idm454641967448323428767538254_body)

1. Install the on-prem client on the machine where you plan to use the UiPath (on-prem) module. See [Installing on-prem clients](installing-on-prem-clients.html "Installing on-prem clients").
2. Create the UiPath on-prem connection. See [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections"). When doing this, select the HTTP application type, and the URL of the location where UiPath is installed.
3. In Celonis Platform, go to Studio and create a new Action Flow.
4. In the Action Flow screen, select the UiPath (on-prem) module and select a job you want it to perform.
5. Configure the module:

   1. Select the Connection type to UiPath (On-Prem).
   2. From the system connection dropdown, select the Celonis Agent created in the previous step.
   3. In the Domain URL, provide the location of the Ui-Path.
   4. Provide credentials of the Ui-Path user.
   5. Provide the name of the Ui-Path tenant.
   6. Save.

[## Job](#UUID-05b2e313-8163-f2a4-f1d0-38fe4b471a63_UUID-36252465-1737-5c8c-3224-740e3e4dbbdc_body)

A Job is the trigger event of a process. Each job is an instance of a robot running the process.

To start a UiPath job in action flows, you need to select the process, and a robot to execute the selected process.

### Start a Job

Starts a UiPath job by triggering a selected process.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your UiPath account.  The UiPath (on-prem) module only works with the Celonis on-prem client. To see how to establish an on-prem connection in Celonis Platform, see [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections"). |
| **Select UiPath Folder** | Select or map the UiPath folder that contains the process you want to execute. |
| **Select UiPath Process** | Select the UiPath process to start the job. You must create a process in your UiPath account. |
| **Select UiPath Robots** | Select a robot to execute the process. You can select multiple robots. You must configure robots in your UiPath account. |
| **Add Input Arguments (Optional)** | If there are any input variables configured for the process in your UiPath account, they would be shown in the app when you select the process.  You can either enter the data manually or use the output values from the previous apps. |

[## Queue](#UUID-05b2e313-8163-f2a4-f1d0-38fe4b471a63_UUID-c1796dd1-ec85-9737-0e41-35f51f7b5c3b_body)

In UiPath, a queue is a container of data held so other bots or applications can use it. Users create queues in their UiPath account.

From the Action Flows, we allow the users to fill in these queues with the data (key/value pair) to be picked up by the jobs or other applications.

### Add an Item to a Queue

Adds an item to a queue.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your UiPath account |
| **Select UiPath Folder** | Select or map the folder that contains the queue for which you want to add the items. |
| **Select UiPath Queue** | Select or map the queue to which you want to add the items.  The Map function allows a user to map a value from one of the previous modules instead of selecting a queue from the dropdown list. |
| **Add Specific Content** | Enter or map the specific *Key-Value* pair to add the items to the queue. For more information about the queue items, see [queue item requests](https://docs.uipath.com/orchestrator/reference/queue-items-requests). |
| **Set Priority** **(Advanced Settings)** | From the Priority list, select the item's priority.  The items are arranged in the queue for processing based on the priority set.  - *High* - *Normal* - *Low* |
| **Reference** **(Advanced Settings)** | Enter or map the reference to link your transactions to other applications used within an automation project. Additionally, this reference enables you to search for certain transactions, in UiPath Orchestrator, according to the provided string. |

[## Other fields](#UUID-05b2e313-8163-f2a4-f1d0-38fe4b471a63_UUID-63d9a981-bcc2-8019-51b9-e2a42e9ac4b8_body)

### Make an API Call

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your UiPath account. |
| **URL** | Enter a path relative to `https://cloud.uipath.com/celonisee/DefaultTenant`. For example, `/odata/QueueDefinitions` |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

### Example of Use - Get Folders

The following API call returns all the folders from your UiPath account:

**URL**

`/odata/QueueDefinitions`

**Method**

`GET`

Matches of the search can be found in the module's Output under **Bundle > Body > value**.

In our example, 1 folder is returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## admin/on-prem-clients/uninstalling-on-prem-clients

# Uninstalling on-prem clients

To ensure a clean removal of the Celonis On-Premise Client (OPC), follow the specific procedure for your operating system.

**Note**

We strongly recommend using the same method for uninstallation that was used for the initial installation (e.g., if you installed via MSI on Windows, use the Windows Settings to uninstall).

## Selecting your operating system

Choose the platform where the OPC is currently hosted to view step-by-step instructions:

- **Windows**: For environments using the .msi installer or Windows services. See: [Uninstalling on Windows](uninstalling-on-prem-clients-on-windows.html "Uninstalling on-prem clients on Windows")
- **Linux**: For Linux distributions using terminal-based removal. See: [Uninstalling on Linux](uninstalling-on-prem-clients-on-linux.html "Uninstalling on-prem clients on Linux")
- **MacOS**: For Apple environments. See: [Uninstalling on MacOS](uninstalling-on-prem-clients-on-macos.html "Uninstalling on-prem clients on MacOS")


---

## admin/on-prem-clients/uninstalling-on-prem-clients-on-linux

# Uninstalling on-prem clients on Linux

Uninstalling Celonis on-premise clients (OPC) from Linux requires removing background services and system files to ensure a clean environment. This process covers both the Management Tool and Command Line methods to prevent configuration conflicts during future installations.

Expand all

[## Option A: Deactivate services via the Management Tool](#id484382_body)

Your first option is to stop the active processes so the files aren't "in use" when you try to delete them.

1. **Launch the Tool**: Open your On-prem Client Management Tool application.
2. **Stop the Automation Agent**: Navigate to the Automation Agent tab, click Stop, and then click Uninstall.
3. **Stop the SAP Extractor**: Switch to the SAP Extractor tab, click Stop, and then click Uninstall.
4. **Delete files:** Manually delete the installation files from the installation folder path.

[## Option B: Uninstalling using the command line](#UUID-136c96a5-9058-5d83-74f3-a352b00e9cdd_section-idm234486589297648_body)

To uninstall using the command line:

1. In your command line, run:

   ```
   systemctl list-units --type=service --all | grep celonis
   ```
2. Locate the on-prem clients service which should look in the following way:

   ```
   celonis-automation-agent-fc19167b-7e07-4e8c-b9c1-4bc0d647d000.service loaded    active   running Celonis on premise agent to execute automation type of tasks. This agent belongs to dk-test-EC2 package.
   ```
3. Uninstall the service. Run:

   ```
   sudo systemctl stop celonis-automation-agent-<PACKAGE-ID-HERE>.service
   sudo systemctl disable celonis-automation-agent-<PACKAGE-ID-HERE>.service
   sudo rm /etc/systemd/system/celonis-automation-agent-<PACKAGE-ID-HERE>.service
   sudo systemctl daemon-reload
   ```

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")


---

## admin/on-prem-clients/uninstalling-on-prem-clients-on-macos

# Uninstalling on-prem clients on MacOS

Uninstalling the Celonis On-Premise Client on macOS is a straightforward process, but it requires a specific sequence to prevent 'ghost' processes from running in the background. Whether you are migrating to a new machine or troubleshooting a local connection, following these steps will help you stop your services and remove your installation files without leaving behind unnecessary data.

## Uninstalling on MacOS

To ensure your system is completely clean, follow this step-by-step procedure:

Expand all

[### Step 1: Deactivate services via the Management Tool](#UUID-eeb3d11c-68f3-f2e7-1b5f-2c5874697498_section-id235477369523953_body)

Your first priority is to stop the active processes so the files aren't "in use" when you try to delete them.

1. **Launch the Tool**: Open your On-prem Client Management Tool application.
2. **Stop the Automation Agent**: Navigate to the Automation Agent tab, click Stop, and then click Uninstall.
3. **Stop the SAP Extractor**: Switch to the SAP Extractor tab, click Stop, and then click Uninstall.

[### Step 2: Manual file cleanup](#UUID-eeb3d11c-68f3-f2e7-1b5f-2c5874697498_section-id235477369568766_body)

Once the services are deregistered, you need to remove the physical footprint from your drive.

1. **Locate the Folder:** Find the directory where you originally extracted the OPC (common locations are ~/Applications/ or a dedicated Celonis folder in your user directory).
2. **Delete the Directory**: Drag the entire folder to the Trash and empty it.
3. **Check for Custom Logs**: If you configured a custom log path in your application-local.yml file, navigate to that specific folder and delete the log files manually.

[### Step 3: Verify the cleanup (Optional but Recommended)](#UUID-eeb3d11c-68f3-f2e7-1b5f-2c5874697498_section-id23547736960459_body)

To be absolutely certain no Java processes are still hanging around, you can run a quick check in the Terminal:

1. **Check for active processes**: Type `ps aux | grep -i celonis` and press Enter.
2. **What to look for**: If you see any active lines (other than the "grep" command itself), a process is still running. You can kill it using: `kill -9 <PID>`.

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")


---

## admin/on-prem-clients/uninstalling-on-prem-clients-on-windows

# Uninstalling on-prem clients on Windows

To ensure a clean removal of Celonis on-premise clients (OPC) and prevent orphaned services or corrupted configurations, it is critical to use the same method for uninstallation that was used for the initial deployment. Whether you used the graphical Management Tool, a custom script, or a manual file placement, following the corresponding procedure below will ensure that all Windows services are properly stopped and all local data is purged.

Expand all

[## 1. Uninstalling the Windows service](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-idm234505548501544_body)

Before removing the software package itself, you must decommission the background services. This prevents the Windows Service Control Manager from retaining "ghost" entries that can interfere with future reinstalls.

[### Option A: Using the Management Tool (Recommended)](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-id235477333140076_body)

1. **Launch the tool**: Open the On-prem Client Management Tool.
2. **Stop and Remove Automation Agent**: Navigate to the Automation Agent tab.

   - Click Stop to terminate the process.
   - Click Uninstall to remove the service entry from Windows.
3. **Stop and Remove SAP Extractor**:

   - Navigate to the SAP Extractor tab.
   - Click Stop, then click Uninstall.
4. **Cleanup**: Once the tool confirms the services are removed, you can safely delete the remaining files from the installation folder.

[### Option B: Using the Command Line (Scripted/SNC)](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-id235477333295483_body)

If you used a custom script or enabled SNC (Secure Network Communications), you must use the `SC` command to manually stop and delete the service entries.

**Warning**

If the SC STOP command fails or hangs, ensure you do not have any active log files open in another application, as this may prevent the service from shutting down gracefully.

1. **Open Terminal**: Launch the Command Prompt (CMD) as an Administrator.
2. **Remove Automation Agent**: Run the following commands:

   ```
   SC STOP celonis-automation-agent-with-snc
   SC DELETE celonis-automation-agent-with-snc
   ```
3. **Remove SAP Extractor**: Run the following commands:

   ```
   SC STOP celonis-extraction-agent-with-snc
   SC DELETE celonis-extraction-agent-with-snc
   ```

[## 2. Uninstalling the OPC package](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-idm234505549284834_body)

Once the Windows services have been decommissioned, you can proceed to remove the application files. The method you use depends on how the client was initially deployed.

**Note**

If you are unsure which method was used, check the Apps &amp; Features list in Windows Settings. If "Celonis On-Prem Client" appears in the list, use Method A.

[### Method A: Using the Windows Installer](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-id235477345683456_body)

If you originally used the .msi or .exe installer, you should use the same utility to perform a clean registration removal.

1. **Run the installer**: Execute the same installation file used for the initial setup.
2. **Select uninstall:** When the wizard detects the existing installation, select the Remove or Uninstall option.
3. **Verify removal**: Follow the on-screen prompts until the wizard confirms the package has been removed from the system registry.
4. **Final cleanup**: Manually delete the installation directory (e.g., C:\Program Files\Celonis\) to remove any remaining log files or temporary configurations.

[### Method B: Manual "File-Only" Uninstallation](#UUID-4a82e7c2-6991-5ded-49a9-4875a875229c_section-id235477345790852_body)

If you deployed the OPC by manually extracting a ZIP archive or copying a folder, there is no system registry entry to clear.

- **Delete Files**: Simply delete the entire folder containing the OPC binaries and configuration files.
- **Check User Profiles**: Ensure that any local application data stored in `%APPDATA%` (if applicable) is also removed to prevent configuration carry-over during future installs.

## Related topics

- [Managing on-prem clients](managing-on-prem-clients.html "Managing on-prem clients")
- [Uninstalling](uninstalling-on-prem-clients.html "Uninstalling on-prem clients")
- [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")


---

## admin/on-prem-clients/using-proxy-with-on-prem-clients

# Using proxy with on-prem clients

The proxy configuration allows the OPC to route all outbound traffic through a single, controlled gateway. This is typically set up during the initial installation phase within the On-prem Client Management Tool, ensuring that the agent can successfully reach the cloud environment even when direct internet access is restricted.

There are three primary reasons why this setup is standard in enterprise environments:

- **Security and compliance**: Most corporate networks forbid servers from connecting directly to the internet. A proxy allows security teams to monitor, filter, and log all data leaving the network to ensure it only travels to authorized Celonis endpoints.
- **Network segmentation**: If your source system (like an SAP ERP) resides in a high-security internal zone, a proxy provides a "bridge" that allows the OPC to communicate with the outside world without exposing the internal server's IP address.
- **Traffic control**: Proxies can help manage bandwidth and provide a single point for authentication, ensuring that only verified services are transmitting data to your Celonis team.

Expand all

[## Before you begin](#UUID-9d92a6d7-43d0-a27e-8bdd-cfb6bce91099_section-id235477289951848_body)

Before you begin the configuration, ensure you have the following:

- **Proxy server details**: You need the host address (URL or IP) and the port number used by your organization.
- **Authentication credentials**: If your proxy requires it, ensure you have the username and password ready.
- **Network access**: The server hosting the on-prem client must be able to reach the proxy server over the local network.
- **Administrator rights**: You must have permissions to run the on-prem client management tool on the host machine.

[## Configuring the proxy settings](#UUID-9d92a6d7-43d0-a27e-8bdd-cfb6bce91099_section-id235477289988777_body)

To configure the proxy settings:

1. **Launch the management tool**: Open the on-prem client management tool on your windows server.
2. **Access the proxy settings**: During the initial setup wizard (or by navigating to the settings tab), locate the proxy configuration section.
3. **Enter connection details**:

   - Input the proxy host and port.
   - Select the protocol (typically HTTP or HTTPS).
4. **Configure authentication (optional)**: If your proxy is not transparent, toggle the use authentication switch and enter your service account credentials.
5. **Test the connection**: Click the test connection button to ensure the on-prem client can reach the Celonis platform through the proxy.
6. **Save and restar**t: Save your changes. The services will restart automatically to apply the new network routing.

## Related topics

- [Installing](installing-on-prem-clients.html "Installing on-prem clients")
- [FAQ](on-premise-clients--opc--installation-faq.html "On-premise Clients (OPC) Installation FAQ")
- [Troubleshooting](troubleshooting-on-prem-clients-installation.html "Troubleshooting on-prem clients installation")


---

