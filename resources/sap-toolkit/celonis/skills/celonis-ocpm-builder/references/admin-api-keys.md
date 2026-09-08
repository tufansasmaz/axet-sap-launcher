# Admin: API Keys

## admin/api-keys/application-keys

# Creating and granting permissions to application keys

**Important**

We’re gradually moving from API/Application keys to OAuth 2.0. We recommend that you use OAuth 2.0 or move to OAuth 2.0 for use cases and Celonis API endpoints where OAuth 2.0 is already supported. See [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0") to find out about OAuth 2.0 and the Celonis Platform and our [Developer Center](https://developer.celonis.com/celonis-apis/auth/#oauth-endpoints) for more information on supported Celonis API endpoints.

Creating application keys enables you to give access and permissions to any applications you create, either within your or externally. Once created, an application key must then be granted the necessary permissions within your Celonis Platform (as by default, application keys are created without permissions).

Admins can also receive system notifications whenever a new application key has been created. See [System notifications](managing-your-system-notifications.html "Managing your system notifications").

Expand all

[## Creating an application key and granting permissions](#UUID-37ecda72-7562-1488-6e2c-96dca1eda84d_section-idm4519704931961633634300325282_body)

1. Go to **Admin & Settings** > **Applications**.
2. Select **Add New Application** > **Application Key**, and then click **Save**.

   |  |
   | --- |
   |  |
3. Enter a key name.
4. (optional) Select **Only allow usage from within the Celonis Platform**.

   This option ensures that the new key can only be used for API calls made from within Celonis Platform. It will be valid for use with actions outside the platform.
5. Copy the application key displayed.

   |  |
   | --- |
   |  |

   **Note**

   You can only view an application key once, so make sure to copy it when you create it. If you don't have a copy of the keys on your list, you'll need to create a new one.
6. Click **Permissions**.
7. Locate the service you need (such as Team, User Provisions, Machine Learning, Data Integration, etc.) and click **Edit**.

   In this example, we’re updating the User Provisioning service.

   |  |
   | --- |
   |  |
8. Select the required service permission template for your application and, if required, enable SCIM permissions.

   In this example, we are granting our application with manage permissions and enabling SCIM permissions.

   |  |
   | --- |
   |  |
9. Click **Save**.
10. Add the application key to the authorization header of your requests using the following format:

    ```
    Authorization: AppKey APPLICATION_KEY
    ```

Your application now has the correct permissions within your Celonis Platform.

You can view all applications in your Celonis Platform instance under **Admin & Settings** > **Applications**. Note that the "Created by" column in that overview shows data only for newly created apps with OAuth clients.

You can also download a detailed report about application keys in your teams. For more information, see [Downloading application key report](downloading-application-key-report.html "Downloading application key report").

## Related topics

- [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0")
- [OAuth consent](managing-oauth-consent.html "Managing OAuth consent")
- [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform")


---

## admin/api-keys/creating-api-keys

# Creating API keys

**Important**

We’re gradually moving from API/Application keys to OAuth 2.0. We recommend that you use OAuth 2.0 or move to OAuth 2.0 for use cases and Celonis API endpoints where OAuth 2.0 is already supported. See [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0") to find out about OAuth 2.0 and the Celonis Platform and our [Developer Center](https://developer.celonis.com/celonis-apis/auth/#oauth-endpoints) for more information on supported Celonis API endpoints.

Using API keys is an effective and secure method of communicating between your Celonis Platform and external systems, such as an identity provider. API keys are created within an individual user profile in your Celonis Platform team, with the key’s permissions mirroring those of the user who created them.

For security reasons, an API key is only displayed at the time it is created. Therefore you must create a new key if you no longer have access to any you create.

Using an API key is one of the methods involved in [configuring SCIM API](https://developer.celonis.com/celonis-apis/scim-api/configuring-scim-api/) (for provisioning and deprovisioning users and groups in your ), with the alternative being [creating and granting permissions to application keys](application-keys.html "Creating and granting permissions to application keys").

Admins can also receive a system notification whenever an admin creates or deletes an API key. See: [System notifications](managing-your-system-notifications.html "Managing your system notifications")

Expand all

[## Creating an API key](#UUID-8b5b8c3d-a880-7521-1e0f-14af088249c0_section-idm4522638734616033653423074031_body)

To create an API key as an admin:

1. Click your profile and select **Edit Profile**.

   |  |
   | --- |
   |  |
2. Enter a new API key name and click **Create API Key**.

   |  |
   | --- |
   |  |
3. Copy the API key displayed.

   **Note**

   You can only view an application key once, so make sure to copy it when you create it. If you don't have a copy of the keys on your list, you'll need to create a new one.
4. Add the API key to the authorization header of your requests using the following format:

   ```
   Authorization: Bearer API_KEY
   ```

## Related topics

- [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0")
- [OAuth consent](managing-oauth-consent.html "Managing OAuth consent")
- [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform")


---

## admin/api-keys/downloading-api-key-usage

# Downloading API key usage

Monitor your team's security by exporting a comprehensive report of all active and historical API keys, including creator details and last-used timestamps.

API keys provide programmatic access to your Celonis environment. To maintain a secure "least-privilege" ecosystem, administrators must regularly audit these keys to identify:

- **Stale keys**: Identifying keys that haven't been used recently and can be safely deleted. If a key hasn't been used in 30+ days, it should be revoked immediately to reduce the attack surface.
- **Accountability**: Mapping every key to a specific creator for better oversight. We suggest using dedicated service accounts for long-running integrations rather than individual user API keys.
- **Security gaps**: Ensuring keys are only being used by the intended users or services.

Expand all

[## Downloading your API key report](#UUID-6b12ab14-d27a-3f46-44a5-c8f1e0226a0d_section-id235475281767939_body)

To download the **API Keys related data** report:

1. Click **Admin & Settings**
2. Scroll down to the **API key** sections.
3. Click **Download**.

   The report is downloaded as `api-keys.csv`.

[## Report fields](#UUID-6b12ab14-d27a-3f46-44a5-c8f1e0226a0d_section-id235475303502062_body)

When downloading your report, the following fields are available:

- **Key Name/ID**: The identifier for the specific API connection.
- **Creator**: The user who generated the key (crucial for accountability).
- **Created At**: When the key was first issued.
- **Last Used**: The most critical field for identifying "stale" keys. If this field is empty, the key might have been created but never actually utilized in a request

## Related topics

- [API keys](creating-api-keys.html "Creating API keys")
- [Application keys](application-keys.html "Creating and granting permissions to application keys")
- [Downloading application key report](downloading-application-key-report.html "Downloading application key report")


---

## admin/api-keys/downloading-application-key-report

# Downloading application key report

**Important**

We’re gradually moving from API/Application keys to OAuth 2.0. We recommend that you use OAuth 2.0 or move to OAuth 2.0 for use cases and Celonis API endpoints where OAuth 2.0 is already supported. See [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0") to find out about OAuth 2.0 and the Celonis Platform and our [Developer Center](https://developer.celonis.com/celonis-apis/auth/#oauth-endpoints) for more information on supported Celonis API endpoints.

As a Celonis Platform team administrator, you can download a report of the application key usage in your team. The data in the report gives you information on how many application keys exist in a given team, who and when each key was created, and what permissions are associated with them.

The CSV report file includes the following information:

- application ID
- application name
- application type
- created by
- last used time
- path
- service name
- object name
- object ID
- Actions

Expand all

[## Downloading application key report](#UUID-7a13187b-78a4-ccb5-26a2-e2a9346d1c42_section-id235295319329747_body)

1. Click **Admin & Settings** > **Applications**.
2. In the applications overview screen, click **Download**.

The CSV file with the application data report downloads.

## Related topics

- [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0")
- [OAuth consent](managing-oauth-consent.html "Managing OAuth consent")
- [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform")


---

## admin/api-keys/managing-oauth-consent

# Managing OAuth consent

OAuth (Open Authorization) is an open standard protocol for access delegation. Granting OAuth via tokens consent enables other parties to access protected resources without sharing user credentials with the requesting party. OAuth also provides an enterprise-grade alternative to application keys and API keys for integrating with the Celonis Platform.

The advantage of using OAuth tokens include that they're short lived and expire automatically and that you can give them a clearly defined set of permissions, rather than them inheriting all permissions from a user.

## Granting OAuth authorization

|  |
| --- |
|  |

Authorizing a client application enables it to perform certain actions on your behalf for either 15 minutes (for shorter interactions) or a maximum of 30 days, with re-authorization needed after that period. These actions are restricted to the ones listed when performing the authorization, with the client holding no other permissions. When authorization is not granted, the client can't perform the intended tasks.

## Related topics

- [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0")
- [Account management](account-management.html "Account management")
- [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform")


---

## admin/api-keys/oauth-scopes

# OAuth scopes

Scopes allow you to define areas to which the client should have access within its current permissions.

You must define scopes for every new OAuth application you add to Celonis Platform. To learn how to create a new application, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").

Here's a list of available scopes:

Filter

- Scope group
- Scope
- Description
- Additional details

| Scope group | Scope | Description | Additional details |
| --- | --- | --- | --- |
| Action engine | action-engine.projects | Gives access to projects based on granted permissions. | Gives access to Action Engine resources via the [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md) to Push and pull action-engine skills |
| Audit | audit.log:read | Gives read-only access audit logs based on granted permissions. | Gives read-only access to the [Audit Log API](https://developer.celonis.com/celonis-apis/audit-log-api/overview/). Can be used to export Audit Log events back into a Celonis Studio view or other tool for analysis or risk assessment needs. |
| Authorization | authorization.permissions:read | Gives access to read permissions based on granted permissions. |  |
| Integration | integration.data-models:read | Gives read-only access to data models based on granted permissions. |  |
| integration.data-pools | Gives access to data pools based on granted permissions. | Gives access to integration resources using the following APIs:  1. [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  1. Push and pull data-pools and connections    2. Import and export data pools    3. Update data-pools, data-pool connections 2. [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  1. Manage data-pools and associated entities: connections, data models, variables, tables, jobs    2. Push data into data-pools    3. Export data from data models 3. [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  1. The Data Push API provides an easy way to transfer data into Celonis. 4. Continuous Data Push API 5. [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  1. The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| integration.data-pools:continuous\_data\_push | Gives access to continuously push data to data pools based on granted permissions. | Gives access to the Continuous Data Push API. |
| integration.data-pools:data\_push | Gives access to push data to data pools based on granted permissions. | Gives access to the [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/). |
| integration.data-pools:query | Gives access to querying Data Pools based on granted permissions. |  |
| integration.data-pools:read | Gives read-only access to data pools based on granted permissions. |  |
| Intelligence API | intelligence.conversations:write | Gives access to the Studio Process Copilot conversational API based on the granted permissions. | Gives access to the [Chat API](https://developer.celonis.com/process-intelligence-apis/agents-api/overview/#chat-api). This is an API to interact with a Process Copilot built in Celonis (as described [here](set-up-process-copilots.html "Configuring your Process Copilots")).  Can also be used to provide access to the Process Copilot Asset from both Action Flows and Orchestration Engine. |
| intelligence.knowledge-models:read | Gives read-only access to knowledge models and their data, filters, records, KPIs, OData metadata, specs, and triggers based on granted permissions. | Gives you access to [Knowledge Model API](https://developer.celonis.com/process-intelligence-apis/knowledge-model-api/get-started/getting-started/) - Query knowledge-model data and metadata. |
| intelligence.subscriptions:manage | Allows managing subscriptions to knowledge-model triggers, including creation, updates, and event replay, based on granted permissions. | [Event Subscription API](https://developer.celonis.com/process-intelligence-apis/subscription-api/overview/) - discover business triggers, subscribe to them, manage event subscriptions and emit spontaneous events. |
| Machine Learning | machine-learning | Gives access to the Machine Learning Workbench API based on the granted permissions. | Gives access to the [Machine Learning Workbench API](https://developer.celonis.com/mlwb/overview/). |
| MCP | mcp-asset.tools:execute | Allows executing MCP Server Asset Tools, based on granted permissions. |  |
| On-prem clients | on-prem-client | Gives access to on-premise client based on granted permissions. |  |
| Orchestration Engine | orchestration-engine | Gives access to Process Orchestration and Forms based on granted permissions. |  |
| Package manager | package-manager | Gives access to package manager based on granted permissions. |  |
| Platform adoption | platform-adoption.tracking-events:read | Gives read-only access to platform-adoption tracking-events based on granted permissions. | Gives read-only access to the [Platform Adoption API -](https://developer.celonis.com/celonis-apis/platform-api/overview/) to export user access data for Studio and Apps in order to better understand usage and adoption of packages and views. |
| Storage manager | storage-manager.buckets | Gives access to storage-manager buckets based on granted permissions. | Gives access to the SFTP Storage Manager API. |
| Studio | knowledge-models.augmented-attributes:update | Gives access to update Augmented Attributes data based on granted permissions. | Gives access to the Studio resources via the following APIs:  - [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  - Push and pull data-pools and connections   - Import and export data pools   - Update data-pools, data-pool connections - [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  - Manage data-pools and associated entities: connections, data models, variables, tables, jobs   - Push data into data-pools   - Export data from data models - [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  - The Data Push API provides an easy way to transfer data into Celonis. - Continuous Data Push API - [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  - The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| knowledge-models:query | Gives access to running queries on a Knowledge Model based on granted permissions. |
| knowledge-models:read | Gives read-only access to Knowledge Models based on granted permissions. |
| skills:execute | Gives access to executing Skills based on granted permissions. |
| skills:read | Gives access to reading Skills data based on granted permissions. |
| studio | Gives access to studio based on granted permissions. |
| studio.packages:read | Gives read-only access to studio packages based on granted permissions. |
| tasks:read | Gives access to reading Tasks data based on granted permissions. |
| tasks:update | Gives access to updating Tasks data based on granted permissions. |
| triggers:manage | Gives access to managing trigger subscriptions to data changes based on granted permissions. |
| triggers:read | Gives read-only access to triggers based on granted permissions. |
| Task Mining | task-mining.clients:suspend | Allows suspending the data capturing of Task Mining clients. |  |
| task-mining.gateway | Gives access to Task Mining Gateway integration API. |  |
| task-mining.metadata:read | Gives read-only access to Task Mining user metadata. |  |
| Team | team.user-group-info:read | Gives read-only access to team user and group information based on granted permissions. | Gives read-only access to the [User Group Info API](https://developer.celonis.com/celonis-apis/team-api/openapi/openapi/operation/getMemberProfileExternalTransport/) to export data that returns all user and group details within a team to better understand users, the roles they have and the groups they are part of. |
| team.login-history:read | Gives read-only access to team login history based on granted permissions. | Gives read-only access to the [Team Login History API](https://developer.celonis.com/celonis-apis/team-api/overview/) to export user login data for the whole team in order to better understand who accesses the team the most or least. |
| User provisioning | user-provisioning.scim | Gives access to the SCIM API based on granted permissions. | Gives access to the [SCIM API](https://developer.celonis.com/celonis-apis/scim-api/configuring-scim-api/) to automate the provisioning of Users, Groups and Roles with the active directory. |

| Scope group | Scope | Description | Additional details |
| --- | --- | --- | --- |
| Action engine | action-engine.projects | Gives access to projects based on granted permissions. | Gives access to Action Engine resources via the [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md) to Push and pull action-engine skills |
| Audit | audit.log:read | Gives read-only access audit logs based on granted permissions. | Gives read-only access to the [Audit Log API](https://developer.celonis.com/celonis-apis/audit-log-api/overview/). Can be used to export Audit Log events back into a Celonis Studio view or other tool for analysis or risk assessment needs. |
| Authorization | authorization.permissions:read | Gives access to read permissions based on granted permissions. |  |
| Integration | integration.data-models:read | Gives read-only access to data models based on granted permissions. |  |
| integration.data-pools | Gives access to data pools based on granted permissions. | Gives access to integration resources using the following APIs:  1. [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  1. Push and pull data-pools and connections    2. Import and export data pools    3. Update data-pools, data-pool connections 2. [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  1. Manage data-pools and associated entities: connections, data models, variables, tables, jobs    2. Push data into data-pools    3. Export data from data models 3. [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  1. The Data Push API provides an easy way to transfer data into Celonis. 4. Continuous Data Push API 5. [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  1. The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| integration.data-pools:continuous\_data\_push | Gives access to continuously push data to data pools based on granted permissions. | Gives access to the Continuous Data Push API. |
| integration.data-pools:data\_push | Gives access to push data to data pools based on granted permissions. | Gives access to the [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/). |
| integration.data-pools:query | Gives access to querying Data Pools based on granted permissions. |  |
| integration.data-pools:read | Gives read-only access to data pools based on granted permissions. |  |
| Intelligence API | intelligence.conversations:write | Gives access to the Studio Process Copilot conversational API based on the granted permissions. | Gives access to the [Chat API](https://developer.celonis.com/process-intelligence-apis/agents-api/overview/#chat-api). This is an API to interact with a Process Copilot built in Celonis (as described [here](set-up-process-copilots.html "Configuring your Process Copilots")).  Can also be used to provide access to the Process Copilot Asset from both Action Flows and Orchestration Engine. |
| intelligence.knowledge-models:read | Gives read-only access to knowledge models and their data, filters, records, KPIs, OData metadata, specs, and triggers based on granted permissions. | Gives you access to [Knowledge Model API](https://developer.celonis.com/process-intelligence-apis/knowledge-model-api/get-started/getting-started/) - Query knowledge-model data and metadata. |
| intelligence.subscriptions:manage | Allows managing subscriptions to knowledge-model triggers, including creation, updates, and event replay, based on granted permissions. | [Event Subscription API](https://developer.celonis.com/process-intelligence-apis/subscription-api/overview/) - discover business triggers, subscribe to them, manage event subscriptions and emit spontaneous events. |
| Machine Learning | machine-learning | Gives access to the Machine Learning Workbench API based on the granted permissions. | Gives access to the [Machine Learning Workbench API](https://developer.celonis.com/mlwb/overview/). |
| MCP | mcp-asset.tools:execute | Allows executing MCP Server Asset Tools, based on granted permissions. |  |
| On-prem clients | on-prem-client | Gives access to on-premise client based on granted permissions. |  |
| Orchestration Engine | orchestration-engine | Gives access to Process Orchestration and Forms based on granted permissions. |  |
| Package manager | package-manager | Gives access to package manager based on granted permissions. |  |
| Platform adoption | platform-adoption.tracking-events:read | Gives read-only access to platform-adoption tracking-events based on granted permissions. | Gives read-only access to the [Platform Adoption API -](https://developer.celonis.com/celonis-apis/platform-api/overview/) to export user access data for Studio and Apps in order to better understand usage and adoption of packages and views. |
| Storage manager | storage-manager.buckets | Gives access to storage-manager buckets based on granted permissions. | Gives access to the SFTP Storage Manager API. |
| Studio | knowledge-models.augmented-attributes:update | Gives access to update Augmented Attributes data based on granted permissions. | Gives access to the Studio resources via the following APIs:  - [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  - Push and pull data-pools and connections   - Import and export data pools   - Update data-pools, data-pool connections - [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  - Manage data-pools and associated entities: connections, data models, variables, tables, jobs   - Push data into data-pools   - Export data from data models - [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  - The Data Push API provides an easy way to transfer data into Celonis. - Continuous Data Push API - [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  - The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| knowledge-models:query | Gives access to running queries on a Knowledge Model based on granted permissions. |
| knowledge-models:read | Gives read-only access to Knowledge Models based on granted permissions. |
| skills:execute | Gives access to executing Skills based on granted permissions. |
| skills:read | Gives access to reading Skills data based on granted permissions. |
| studio | Gives access to studio based on granted permissions. |
| studio.packages:read | Gives read-only access to studio packages based on granted permissions. |
| tasks:read | Gives access to reading Tasks data based on granted permissions. |
| tasks:update | Gives access to updating Tasks data based on granted permissions. |
| triggers:manage | Gives access to managing trigger subscriptions to data changes based on granted permissions. |
| triggers:read | Gives read-only access to triggers based on granted permissions. |
| Task Mining | task-mining.clients:suspend | Allows suspending the data capturing of Task Mining clients. |  |
| task-mining.gateway | Gives access to Task Mining Gateway integration API. |  |
| task-mining.metadata:read | Gives read-only access to Task Mining user metadata. |  |
| Team | team.user-group-info:read | Gives read-only access to team user and group information based on granted permissions. | Gives read-only access to the [User Group Info API](https://developer.celonis.com/celonis-apis/team-api/openapi/openapi/operation/getMemberProfileExternalTransport/) to export data that returns all user and group details within a team to better understand users, the roles they have and the groups they are part of. |
| team.login-history:read | Gives read-only access to team login history based on granted permissions. | Gives read-only access to the [Team Login History API](https://developer.celonis.com/celonis-apis/team-api/overview/) to export user login data for the whole team in order to better understand who accesses the team the most or least. |
| User provisioning | user-provisioning.scim | Gives access to the SCIM API based on granted permissions. | Gives access to the [SCIM API](https://developer.celonis.com/celonis-apis/scim-api/configuring-scim-api/) to automate the provisioning of Users, Groups and Roles with the active directory. |


---

## admin/api-keys/registering-oauth-client

# Registering your OAuth client in the Celonis Platform

OAuth can be used as an authentication method for the Celonis Platform, which offers a more secure and flexible way of granting permissions to clients (applications) compared to API keys.

For an overview of the differences between OAuth 2.0 and using Application or API Keys, see: [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0").

Expand all

[## Registering your OAuth client](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_section-id235516910451118_body)

To register your OAuth clients in Celonis Platform:

1. Go to **Admin & Settings** > **Applications**.

   |  |
   | --- |
   |  |

   The interface shows all applications and their type split into two categories: **customer-configured** and **Celonis-configured** applications. Customer-configured applications are managed by customer admins and are created when, for example, the admin needs to integrate another application with the team. Celonis-configured applications are configured and managed by Celonis services to integrate seamlessly with the team. For example: Task Mining creates an OAuth client every time a device is activated. The On-Premise Client is used to bootstrap extraction whenever it is installed on an on-prem device.
2. Click **Add new application** and select **OAuth Client**.

   |  |
   | --- |
   |  |
3. Configure the OAuth client with the following fields:

   - **Name**: An internal reference to this client.
   - **Grant type**:

     - **Client credentials** (default) - best used for server-to-server or machine-to-machine communication without user involvement. When using this grant type, client sends its client\_id and client\_secret to an authorization server to receive an access token. This token is then used to make requests to a protected API on behalf of the application itself, not a user.
     - **Authorization code** - this authentication flow includes user involvement. In this gran type, the client application operated by a user exchanges the authorization code for an access token.
   - **Authentication methods**

     - **Client secret basic**: With this method, the client uses the Authorization header to send the `client_id` and `client_secret` in the following format: `Authorization: Basic encoded_credentials`.

       Here the value of `encoded_credentials` corresponds to the base64 encoding of OAuth client’s `client_id:client_secret`.
     - **Client secret post**: The client authenticates itself by providing the `client_id` and `client_secret` in the HTTP request body as a form parameter.
4. Click **Define scopes**.

   Scopes allow you to define areas to which the client should have access within its current permissions. You can't grant additional permissions to a client using scopes.
5. Select resource types within Celonis Platform to which the clients will have access based on granted permissions. Chosen scopes give the client access to specific Celonis Platform APIs.
6. Click **Create**.

As scopes only allow access to the APIs, the created OAuth client should now be assigned permissions to resources behind those APIs. After creating a client in Celonis Platform, developers receive client credentials: client ID and client secret. Every scope should have a name and a description, which unambiguously explains which APIs can be accessed with the scope based on the permissions granted to the client.

You can view all applications in your Celonis Platform instance under **Admin & Settings** > **Applications**. Note that the "Created by" column in that overview shows data only for newly created apps with OAuth clients.

[## Assigning permission to your OAuth application](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_section-idm234391549181659_body)

1. In your Celonis Platform, go to **Admin & Settings** > **Permissions**.
2. Locate the service you need and click **Edit**.

   In this example, we’re updating the User Provisioning service.

   |  |
   | --- |
   |  |
3. Select the required template for your application and, if required, enable SCIM permissions.

   In this example, we are granting our application with manage permissions and enabling SCIM permissions.
4. Click **Save**.
5. Add the access token to the authorization header of your requests using the following format:

   ```
   Authorization: Bearer ACCESS_TOKEN
   ```

Your application now has the correct permissions within your Celonis Platform.

[## Regenerating OAuth client secrets](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_section-idm4517570957515234118368245556_body)

For security reasons, you may want to regenerate the client secret using the following steps:

1. In your Celonis Platform instance, go to **Admin & Settings > Applications**.
2. Find your OAuth client and click the three-dot menu next to it.
3. Select **Regenerate secret**.

   |  |
   | --- |
   |  |

Once you generate a new client secret, make sure to update the secret in all integrations that use that client.

[## Managing OAuth client consent](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_section-idm4542112513616034118378235594_body)

During OAuth authorization flows, users can give consent to OAuth clients to access resources on their behalf. To view which OAuth clients have been granted consent, go to **Edit Profile** and then to the section OAuth Client Management. From there you can view which applications (OAuth clients) have been granted consent and revoke that consent.

[## Requesting OAuth access tokens](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_UUID-3c4c385a-5026-4307-2787-fafcdb228353_body)

After registering your OAuth client and assigning it the necessary permissions in your Celonis Platform team, you can now use a REST API client such as Postman to make a POST request for your access token.

To do this, you need your token URL:

```
https://<team>.<cluster>.celonis.cloud/oauth2/token
```

And in Postman:

|  |
| --- |
|  |

You then need to append at least two query parameters to your token URL:

- **Grant type**: This must be "client\_credentials" as this is currently the supported grant type for OAuth clients.
- **Scope**: This should be the Celonis Platform services that you have granted permissions to (based on the service string). In our example, we've included Studio:

```
https://<team>.<cluster>.celonis.cloud/oauth2/token?grant_type=client_credentials&scope=studio
```

And in Postman:

|  |
| --- |
|  |

You can then configure the Authorization. In this example, we're using a basic authentication using a username (the client ID) and password (the client secret):

|  |
| --- |
|  |

This configuration gives you an OAuth request such as:

```
curl --request POST \
  --url https://<team>.<cluster>.celonis.cloud/oauth2/token \
  --header 'content-type: multipart/form-data' \
  --form client_id=<client id> \
  --form client_secret=<client secret> \
  --form grant_type=client_credentials \
  --form scope=<scope1 scope2 scopeN>
```

And running the request returns a response that includes your access token:

```
{
	"access_token": "randomizedAcessToken",
	"scope": "scope1 scope2 scopeN",
	"token_type": "Bearer",
	"expires_in": 899
}
```

This access token can then be used with a bearer token authentication method to request access to and information from the Celonis Platform services you need:

|  |
| --- |
|  |

[## OAuth scopes](#UUID-0a0e0984-8a17-1d4e-175c-aa47448f9e66_section-id235557858799342_body)

Scopes allow you to define areas to which the client should have access within its current permissions.

You must define scopes for every new OAuth application you add to Celonis Platform. To learn how to create a new application, see [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").

Here's a list of available scopes:

Filter

- Scope group
- Scope
- Description
- Additional details

| Scope group | Scope | Description | Additional details |
| --- | --- | --- | --- |
| Action engine | action-engine.projects | Gives access to projects based on granted permissions. | Gives access to Action Engine resources via the [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md) to Push and pull action-engine skills |
| Audit | audit.log:read | Gives read-only access audit logs based on granted permissions. | Gives read-only access to the [Audit Log API](https://developer.celonis.com/celonis-apis/audit-log-api/overview/). Can be used to export Audit Log events back into a Celonis Studio view or other tool for analysis or risk assessment needs. |
| Authorization | authorization.permissions:read | Gives access to read permissions based on granted permissions. |  |
| Integration | integration.data-models:read | Gives read-only access to data models based on granted permissions. |  |
| integration.data-pools | Gives access to data pools based on granted permissions. | Gives access to integration resources using the following APIs:  1. [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  1. Push and pull data-pools and connections    2. Import and export data pools    3. Update data-pools, data-pool connections 2. [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  1. Manage data-pools and associated entities: connections, data models, variables, tables, jobs    2. Push data into data-pools    3. Export data from data models 3. [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  1. The Data Push API provides an easy way to transfer data into Celonis. 4. Continuous Data Push API 5. [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  1. The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| integration.data-pools:continuous\_data\_push | Gives access to continuously push data to data pools based on granted permissions. | Gives access to the Continuous Data Push API. |
| integration.data-pools:data\_push | Gives access to push data to data pools based on granted permissions. | Gives access to the [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/). |
| integration.data-pools:query | Gives access to querying Data Pools based on granted permissions. |  |
| integration.data-pools:read | Gives read-only access to data pools based on granted permissions. |  |
| Intelligence API | intelligence.conversations:write | Gives access to the Studio Process Copilot conversational API based on the granted permissions. | Gives access to the [Chat API](https://developer.celonis.com/process-intelligence-apis/agents-api/overview/#chat-api). This is an API to interact with a Process Copilot built in Celonis (as described [here](set-up-process-copilots.html "Configuring your Process Copilots")).  Can also be used to provide access to the Process Copilot Asset from both Action Flows and Orchestration Engine. |
| intelligence.knowledge-models:read | Gives read-only access to knowledge models and their data, filters, records, KPIs, OData metadata, specs, and triggers based on granted permissions. | Gives you access to [Knowledge Model API](https://developer.celonis.com/process-intelligence-apis/knowledge-model-api/get-started/getting-started/) - Query knowledge-model data and metadata. |
| intelligence.subscriptions:manage | Allows managing subscriptions to knowledge-model triggers, including creation, updates, and event replay, based on granted permissions. | [Event Subscription API](https://developer.celonis.com/process-intelligence-apis/subscription-api/overview/) - discover business triggers, subscribe to them, manage event subscriptions and emit spontaneous events. |
| Machine Learning | machine-learning | Gives access to the Machine Learning Workbench API based on the granted permissions. | Gives access to the [Machine Learning Workbench API](https://developer.celonis.com/mlwb/overview/). |
| MCP | mcp-asset.tools:execute | Allows executing MCP Server Asset Tools, based on granted permissions. |  |
| On-prem clients | on-prem-client | Gives access to on-premise client based on granted permissions. |  |
| Orchestration Engine | orchestration-engine | Gives access to Process Orchestration and Forms based on granted permissions. |  |
| Package manager | package-manager | Gives access to package manager based on granted permissions. |  |
| Platform adoption | platform-adoption.tracking-events:read | Gives read-only access to platform-adoption tracking-events based on granted permissions. | Gives read-only access to the [Platform Adoption API -](https://developer.celonis.com/celonis-apis/platform-api/overview/) to export user access data for Studio and Apps in order to better understand usage and adoption of packages and views. |
| Storage manager | storage-manager.buckets | Gives access to storage-manager buckets based on granted permissions. | Gives access to the SFTP Storage Manager API. |
| Studio | knowledge-models.augmented-attributes:update | Gives access to update Augmented Attributes data based on granted permissions. | Gives access to the Studio resources via the following APIs:  - [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  - Push and pull data-pools and connections   - Import and export data pools   - Update data-pools, data-pool connections - [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  - Manage data-pools and associated entities: connections, data models, variables, tables, jobs   - Push data into data-pools   - Export data from data models - [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  - The Data Push API provides an easy way to transfer data into Celonis. - Continuous Data Push API - [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  - The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| knowledge-models:query | Gives access to running queries on a Knowledge Model based on granted permissions. |
| knowledge-models:read | Gives read-only access to Knowledge Models based on granted permissions. |
| skills:execute | Gives access to executing Skills based on granted permissions. |
| skills:read | Gives access to reading Skills data based on granted permissions. |
| studio | Gives access to studio based on granted permissions. |
| studio.packages:read | Gives read-only access to studio packages based on granted permissions. |
| tasks:read | Gives access to reading Tasks data based on granted permissions. |
| tasks:update | Gives access to updating Tasks data based on granted permissions. |
| triggers:manage | Gives access to managing trigger subscriptions to data changes based on granted permissions. |
| triggers:read | Gives read-only access to triggers based on granted permissions. |
| Task Mining | task-mining.clients:suspend | Allows suspending the data capturing of Task Mining clients. |  |
| task-mining.gateway | Gives access to Task Mining Gateway integration API. |  |
| task-mining.metadata:read | Gives read-only access to Task Mining user metadata. |  |
| Team | team.user-group-info:read | Gives read-only access to team user and group information based on granted permissions. | Gives read-only access to the [User Group Info API](https://developer.celonis.com/celonis-apis/team-api/openapi/openapi/operation/getMemberProfileExternalTransport/) to export data that returns all user and group details within a team to better understand users, the roles they have and the groups they are part of. |
| team.login-history:read | Gives read-only access to team login history based on granted permissions. | Gives read-only access to the [Team Login History API](https://developer.celonis.com/celonis-apis/team-api/overview/) to export user login data for the whole team in order to better understand who accesses the team the most or least. |
| User provisioning | user-provisioning.scim | Gives access to the SCIM API based on granted permissions. | Gives access to the [SCIM API](https://developer.celonis.com/celonis-apis/scim-api/configuring-scim-api/) to automate the provisioning of Users, Groups and Roles with the active directory. |

| Scope group | Scope | Description | Additional details |
| --- | --- | --- | --- |
| Action engine | action-engine.projects | Gives access to projects based on granted permissions. | Gives access to Action Engine resources via the [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md) to Push and pull action-engine skills |
| Audit | audit.log:read | Gives read-only access audit logs based on granted permissions. | Gives read-only access to the [Audit Log API](https://developer.celonis.com/celonis-apis/audit-log-api/overview/). Can be used to export Audit Log events back into a Celonis Studio view or other tool for analysis or risk assessment needs. |
| Authorization | authorization.permissions:read | Gives access to read permissions based on granted permissions. |  |
| Integration | integration.data-models:read | Gives read-only access to data models based on granted permissions. |  |
| integration.data-pools | Gives access to data pools based on granted permissions. | Gives access to integration resources using the following APIs:  1. [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  1. Push and pull data-pools and connections    2. Import and export data pools    3. Update data-pools, data-pool connections 2. [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  1. Manage data-pools and associated entities: connections, data models, variables, tables, jobs    2. Push data into data-pools    3. Export data from data models 3. [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  1. The Data Push API provides an easy way to transfer data into Celonis. 4. Continuous Data Push API 5. [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  1. The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| integration.data-pools:continuous\_data\_push | Gives access to continuously push data to data pools based on granted permissions. | Gives access to the Continuous Data Push API. |
| integration.data-pools:data\_push | Gives access to push data to data pools based on granted permissions. | Gives access to the [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/). |
| integration.data-pools:query | Gives access to querying Data Pools based on granted permissions. |  |
| integration.data-pools:read | Gives read-only access to data pools based on granted permissions. |  |
| Intelligence API | intelligence.conversations:write | Gives access to the Studio Process Copilot conversational API based on the granted permissions. | Gives access to the [Chat API](https://developer.celonis.com/process-intelligence-apis/agents-api/overview/#chat-api). This is an API to interact with a Process Copilot built in Celonis (as described [here](set-up-process-copilots.html "Configuring your Process Copilots")).  Can also be used to provide access to the Process Copilot Asset from both Action Flows and Orchestration Engine. |
| intelligence.knowledge-models:read | Gives read-only access to knowledge models and their data, filters, records, KPIs, OData metadata, specs, and triggers based on granted permissions. | Gives you access to [Knowledge Model API](https://developer.celonis.com/process-intelligence-apis/knowledge-model-api/get-started/getting-started/) - Query knowledge-model data and metadata. |
| intelligence.subscriptions:manage | Allows managing subscriptions to knowledge-model triggers, including creation, updates, and event replay, based on granted permissions. | [Event Subscription API](https://developer.celonis.com/process-intelligence-apis/subscription-api/overview/) - discover business triggers, subscribe to them, manage event subscriptions and emit spontaneous events. |
| Machine Learning | machine-learning | Gives access to the Machine Learning Workbench API based on the granted permissions. | Gives access to the [Machine Learning Workbench API](https://developer.celonis.com/mlwb/overview/). |
| MCP | mcp-asset.tools:execute | Allows executing MCP Server Asset Tools, based on granted permissions. |  |
| On-prem clients | on-prem-client | Gives access to on-premise client based on granted permissions. |  |
| Orchestration Engine | orchestration-engine | Gives access to Process Orchestration and Forms based on granted permissions. |  |
| Package manager | package-manager | Gives access to package manager based on granted permissions. |  |
| Platform adoption | platform-adoption.tracking-events:read | Gives read-only access to platform-adoption tracking-events based on granted permissions. | Gives read-only access to the [Platform Adoption API -](https://developer.celonis.com/celonis-apis/platform-api/overview/) to export user access data for Studio and Apps in order to better understand usage and adoption of packages and views. |
| Storage manager | storage-manager.buckets | Gives access to storage-manager buckets based on granted permissions. | Gives access to the SFTP Storage Manager API. |
| Studio | knowledge-models.augmented-attributes:update | Gives access to update Augmented Attributes data based on granted permissions. | Gives access to the Studio resources via the following APIs:  - [content-cli](https://github.com/celonis/content-cli/blob/master/DOCUMENTATION.md)  - Push and pull data-pools and connections   - Import and export data pools   - Update data-pools, data-pool connections - [PyCelonis](https://celonis.github.io/pycelonis/2.0.1/)  - Manage data-pools and associated entities: connections, data models, variables, tables, jobs   - Push data into data-pools   - Export data from data models - [Data Push API](https://developer.celonis.com/data-ingestion-api/getting-started/)  - The Data Push API provides an easy way to transfer data into Celonis. - Continuous Data Push API - [Process Data Model API](https://developer.celonis.com/celonis-apis/process-data-model-api/)  - The process data model API allows you to completely or partially reload your data models, ensuring that the latest data from your source system is available. |
| knowledge-models:query | Gives access to running queries on a Knowledge Model based on granted permissions. |
| knowledge-models:read | Gives read-only access to Knowledge Models based on granted permissions. |
| skills:execute | Gives access to executing Skills based on granted permissions. |
| skills:read | Gives access to reading Skills data based on granted permissions. |
| studio | Gives access to studio based on granted permissions. |
| studio.packages:read | Gives read-only access to studio packages based on granted permissions. |
| tasks:read | Gives access to reading Tasks data based on granted permissions. |
| tasks:update | Gives access to updating Tasks data based on granted permissions. |
| triggers:manage | Gives access to managing trigger subscriptions to data changes based on granted permissions. |
| triggers:read | Gives read-only access to triggers based on granted permissions. |
| Task Mining | task-mining.clients:suspend | Allows suspending the data capturing of Task Mining clients. |  |
| task-mining.gateway | Gives access to Task Mining Gateway integration API. |  |
| task-mining.metadata:read | Gives read-only access to Task Mining user metadata. |  |
| Team | team.user-group-info:read | Gives read-only access to team user and group information based on granted permissions. | Gives read-only access to the [User Group Info API](https://developer.celonis.com/celonis-apis/team-api/openapi/openapi/operation/getMemberProfileExternalTransport/) to export data that returns all user and group details within a team to better understand users, the roles they have and the groups they are part of. |
| team.login-history:read | Gives read-only access to team login history based on granted permissions. | Gives read-only access to the [Team Login History API](https://developer.celonis.com/celonis-apis/team-api/overview/) to export user login data for the whole team in order to better understand who accesses the team the most or least. |
| User provisioning | user-provisioning.scim | Gives access to the SCIM API based on granted permissions. | Gives access to the [SCIM API](https://developer.celonis.com/celonis-apis/scim-api/configuring-scim-api/) to automate the provisioning of Users, Groups and Roles with the active directory. |

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [OAuth consent](managing-oauth-consent.html "Managing OAuth consent")
- [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0")


---

## admin/api-keys/using-oauth-2-0

# Using OAuth 2.0

You can now use OAuth 2.0 as an authentication method in the Celonis Platform, with this method preferred to API keys or application keys.

OAuth 2.0 is an industry-standard framework that allows different applications to securely interact with each other on behalf of users without sharing sensitive credentials. To enable this, you can create an OAuth client and then define the scopes assigned to that client. These scopes allow you to manage who or what has access to your Celonis Platform features such as Studio, User Provisioning, and audit logs. This is based on the security principle of least privilege, so that an OAuth client gets only the required privilege to perform a certain task and not more.

In addition to defined scopes, OAuth access tokens have a limited lifetime (15 minutes) and OAuth client secrets can be easily rotated. These feature increase their security, making OAuth 2.0 an enhanced authentication method compared to API keys or application keys.

To register an OAuth client and define its scope, see: [Registering your OAuth client in the Celonis Platform](registering-oauth-client.html "Registering your OAuth client in the Celonis Platform").

## Transitioning from API keys and application keys to OAuth authentication

To support your transition from API keys and application keys to OAuth authentication, consider the following points:

- **Access risks when using API keys**: API keys can fall into the wrong hands, leading to unauthorized access. For example, API keys can inadvertently get checked into source control systems, exposing the key to repository viewers and the source control history.
- **Rotating API keys**: Rotating API keys can be a challenging task. Because API key values persist within the caller’s environment or software systems, timing the rotation to quickly release a key, generate a new one, and save the key while keeping production environments running can pose challenges.
- **Limiting API scope**: Assigning limited scopes to API keys isn’t possible. API keys grant access to the API called in its entirety — an all-or-nothing access level. Defining access for a limited scope, such as read access only vs. write access, and other fine-grained access control measures are not available through API keys.
- **API keys linked to user accounts**: API keys linked to user accounts become invalid when the user exits the organization. Some organizations use service accounts to counteract this measure, which opens up access risks and management overhead.

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [Account management](account-management.html "Account management")
- [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")


---

