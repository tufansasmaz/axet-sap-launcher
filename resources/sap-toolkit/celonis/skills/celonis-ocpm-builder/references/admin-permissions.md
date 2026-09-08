# Admin: Permissions

## admin/permissions/action-flow-permissions

# Action Flow permissions

Permissions can be granted on multiple levels within Admin & Settings. Both users and application keys are seen as equivalent regarding permissions as they can take certain actions within Celonis Platform. Permissions regarding Action Flows are handled in the section Automation Permissions.

Expand all

[## User Connection Permissions](#UUID-9d18e617-5bf3-bae5-2fc9-ab05869ee8db_id_AppsPermissions-UserConnectionPermissions_body)

Each use of an App in Action Flows requires a **user connection** to that service. The connection can be established via:

1. API Key / Application Key

|  |
| --- |
|  |

2. Basic authentication with Username & Password

|  |
| --- |
|  |

3. OAuth

**User Connection Access**

The connections you create with your personal credentials are shared within the same Studio package.

Hence, your team can use and delete connections that were created in this package. This way you can easily collaborate across your team to speed up automations. Please follow the Best Practices below to avoid traceability and audibility issues.

If you want to know which permissions are necessary for which app, please check the respective app help page to get more information. Necessary permissions for the different integrations vary. Generally, Action Flows require only the smallest set of permissions to perform a given action. However, some applications do not allow limiting permissions, which is why Action Flows sometimes asks for the complete set of permissions of that application.

After a connection has been established, you can maintain and oversee the already integrated connections and permissions on the [Automation Global Pages - User Connections](managing-action-flows.html "Managing Action Flows").

Some apps (like SAP) do not show the used permissions, please check the respective App page instead, e.g. SAP - Permissions. If the requirements are not listed, raise a [Support](support.html "Contacting Support") ticket to request the information.

For more information on how to restrict Celonis access to your account registered to those services, see the application-specific documentation.

[## Connection to on-prem System](#UUID-9d18e617-5bf3-bae5-2fc9-ab05869ee8db_id_AppsPermissions-ConnectiontoOn-premSystem_body)

If the Celonis On-Prem Agent is involved for an On-Prem System, please check Automation Global Pages - Agent to see whether the Agent is running and you are able to reach your On-Prem system.

Before creating the user connection in the App in Action Flows, a system Connections has to be established.

**System Connection Access**

Each system connection is available to any user of the team that has access to the same Agent.

[## Permissions for Email Use Case](#UUID-9d18e617-5bf3-bae5-2fc9-ab05869ee8db_id_AppsPermissions-PermissionsforEmailUseCase_body)

If you want to implement action flows that automatically send emails to customers or to internal stakeholders, please follow the information below to connect to your own Email accounts. Internal IT might have certain requirements for this action and the following document contains the necessary information to support the decision of which method is feasible.

If you do not find a feasible solution for your IT system, please submit a feature request or get in touch with your contact at Celonis.

|  |
| --- |
|  |

Setup options (**recommended**):

- **General Email**
- **Gmail**
- **Microsoft 365 Email**
- Other email apps
- Alternatives:

  - Email by Celonis via Skills
  - Email (SMTP) via Skills
  - HTTP (On-Prem)

### General Email App

|  |
| --- |
|  |

Additional information: [Email](email--action-flow-.html "Email (Action Flow)")

The general email app within Action Flows allows a connection to any email server and can be secured via TLS or self-signed certificates. This makes it easy to configure and can be adjusted to your needs.

**Requirements for outgoing SMTP setup:**

- **SMTP server from your provider**
- **Access to server from cloud must be permitted**

Authentication options:

- SMTP
- TLS connection
- Self-signed certificates with the rejection of unauthorized certificates

**Note**

If you need to allowlist an IP address that will make a request to your SMTP server, please allowlist the cluster IP that your team runs.

**Warning**

**Minimum requirement for SMTP**

If you need to allow an IP address that will make a request to your SMTP server, please add your the cluster IP to the allow list: [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains")

### Gmail App

|  |
| --- |
|  |

Additional information: [Gmail](gmail--action-flow-.html "Gmail (Action Flow)")

The Gmail Action Flow app is directly integrated with Google and works with Oauth when using a GSuite account, or a custom OAuth client has to be set up to send emails via Gmail with a standard Gmail account.

**Requirements:**

- **Google account**

Authentication options

- GSuite through Company account (@company.com)

  - Authorization via OAuth1 / OAuth2
- Gmail with personal account (@gmail.com, or googlemail.com):

  - Authorization via custom OAuth Client

Specific permissions (when asked for confirmation):

### Microsoft 365 Email App

|  |
| --- |
|  |

Additional information: [Microsoft 365 Email](microsoft-365-email--outlook---action-flow-.html "Microsoft 365 Email (Outlook) (Action Flow)")

The Microsoft 365 Email App offers authentication via OAuth and is simple to set up.

**Requirements:**

- **Microsoft Email 365 Account**

Authentication options:

- Authorization via OAuth1 / OAuth2

### Other Email Apps

Action Flows offer native integrations with many applications that can be used as an email program.

Below are two possible examples with other forms of authentication listed, but this list is not exhaustive. Please refer to the respective documentation pages within Celonis.

#### Mandrill

|  |
| --- |
|  |

**Requirements**

- **Mandrill account**

Authentication option:

- API key

#### Zoho Mail

|  |
| --- |
|  |

**Requirements:**

- **Zoho account**
- **Regional Code**

Authentication options:

- Authentication via **Username / Password**

**Note**

**Many more apps that include similar functionality can be found in Action Flows.**

### Alternatives

If none of the solutions from above solve the issue, there are more methods to solve it. However, these are more complex and not as easy to maintain.

#### Email (SMTP) via Skills

Additional information: [Email (SMTP)](email--smtp---skills-.html "Email (SMTP) (Skills)")

With SMTP (Agent), you are able to send emails automatically from your own SMTP server which does not need to be accessible from outside your network. **This option is needed if the SMTP server is ONLY reachable from within your network.**

However, this implementation combines Action Flows with Skills, which makes this solution rather complex and difficult to maintain.

**Requirements:**

- **Celonis Agent for Skills v0.4.4**
- **Live Celonis Agent on your system that is connected to Celonis Platform**
- **SMTP server**

Authentication options:

- SMTP
- TLS connection
- Self-signed certificates with rejection of unauthorized certificates

#### Email by Celonis via Skills

The general use case for this module can be seen as testing of new modules. The following template sets up the entire workflow with Action Flows - [Send Email by Celonis](topic-file-names--html-.html "Send Email created by Celonis").

**Requirements:**

- **None**

Authentication options:

- None

Disadvantages:

- Not full control over the server
- Email domain @celonis.com
- Max. 100 uses per day
- Complex setup and maintenance
- No traceability of sent elements
- No visibility of bounce messages
- No request for customer to be blacklisted possible
- Emails cannot be responded to

#### HTTP (On-Prem)

Additional information: HTTP (On-Prem)

If you have an internal API endpoint that can be accessed through HTTP to communicate with an internal email server, you can also use that gateway to send emails.

**Requirements:**

- **Celonis Agent for Action Flows v1.0.1 Agent Setup**
- **Live Celonis Agent on your system that is connected to Celonis Platform**

Authentication:

- None

## Related topics

- [User and team roles](user-profile.html "User and team roles")
- [Available permissions](available-permissions.html "Available Celonis Platform permissions")
- [Variable admin permissions](variable-admin-permissions.html "Variable admin permissions")


---

## admin/permissions/available-permissions

# Available Celonis Platform permissions

The Celonis Platform offers granular permission controls, giving you control over who (users) or what (applications and external systems) can access features, content, and data. Depending on the Celonis Platform service that you're using, you can assign granular user permissions on a maximum of three levels: Service, container, and object.

These levels work on a hierarchy, with the highest level (the service level) overriding any conflicts in either the container or object level.

|  |
| --- |
|  |

## Celonis Platform permission types - Service level, container level, and object level

You can manage the following permission types in the Celonis Platform:

Expand all

[### Managing Service level permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-81793645-0ab1-37f9-009c-c1c0e99b9234_body)

Services are the highest level of feature and content organization, giving user permissions across a service within your Celonis Platform. Services can contain multiple containers and objects, whereas a container and its object are stored within a service.

All service permissions can be assigned and managed by team admins by clicking **Admin & Settings - Services permissions**. This takes you to the Services permissions page.

You then have the following service level options:

- **Managing individual Services**: Click into a Service to view existing granular permissions, see an overview of team roles, and then assign permissions to existing team members.

  - [Assigning service levels permissions for individual users, groups, and apps](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-80277768-2998-9697-3230-13dd9c519a7d "Assigning service levels permissions for individual users, groups, and apps")
  - [Managing existing service level permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-dfc97322-35f6-cfc9-703c-7a249f8fed6a "Managing existing service level permissions")

  In this example, the Studio service allows team admins to view all users that have access to the Studio service and individual Studio spaces.
- **Advanced settings**: These settings allow you to control who can change permissions in the Celonis Platform asset.

  You can choose between:

  - **Standard**: All users have the option to edit permissions on assets according to their individual permissions
  - **Restricted to permission administrators**: Only permission administrators can edit permissions on all assets.

  |  |
  | --- |
  |  |

[#### Assigning service levels permissions for individual users, groups, and apps](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-80277768-2998-9697-3230-13dd9c519a7d_body)

You can assign service-level permissions to individual users, groups, or apps, granting them access only to that specific service. You’ll need to repeat this process for each service you want to assign permissions to.

To assign service level permissions:

1. Click **Admin & Settings - Service permissions**.
2. Select the service you want to assign permissions to and click **Assign permissions**.
3. Select the subjects you want to assign permissions to and click **Next**.

   The available subjects are limited to only those that don't currently hold permissions to this service.
4. Select whether the subject should be granted with all permissions to this service or only the permissions you select.
5. Click **Assign permissions**.

The subject now holds the assigned permissions to this service.

You can manage these permissions, including revoking access to that service, by returning to the service permissions page and clicking into the subject's individual permissions.

[#### Managing existing service level permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-dfc97322-35f6-cfc9-703c-7a249f8fed6a_body)

You can manage these permissions, including revoking access to that service, by returning to the service permissions page and clicking into the subject's individual permissions.

To manage existing service level permissions:

1. Click **Admin & Settings - Service permissions**.
2. Click the subject that you want to manage the permissions for, loading their individual permissions page.
3. Edit the permissions as required.
4. Click **Save**.

The permissions for that service have been updated.

[### Managing Container level permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-34e85c9e-0a48-f705-e824-8b88d7f015c4_body)

This is the top-level object within a service, such as **Studio - Package**. For container level permissions, each Service has its own permission system depending on the container that you're assigning permissions to.

In this Studio example, you're granting the user permissions just within this Studio Package.

[### Managing Object level permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-0d256dc6-545d-c10c-6d57-719a4acf2ecc_body)

This is the specific object within a container, such as **Studio - Package - View**. For object level permissions, each Service has its own permission system depending on the object that you're assigning permissions to.

In this Studio example, you are granting the user permissions within just the View within the Package.

[## Permissions overview table](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm23454596349685_body)

When assigning and managing permissions in the Celonis Platform, refer to this table:

Filter

- Service
- Container(s)
- Object(s)

| Service | Container(s) | Object(s) |
| --- | --- | --- |
| **Action Engine**  See: [Action Engine service permission](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b7d0a9eb-12f5-a55d-6b20-e943d6f7f209 "Action Engine service permission"). | **Project**  See: [Action Engine project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-59bc9890-1e02-023a-783d-508e27749a4c "Action Engine project permissions"). | N/A |
| **Data Integration**  See: [Data Integration service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions"). | **Data Pool**  See: [Data Integration Data Pool permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3d909e01-84e9-653c-042a-6852558c93da "Data Integration Data Pool permissions"). | **Data Model**  See: [Data Integration Data Model permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3e7c8ede-fa3c-d937-de76-e6e965fc118f "Data Integration Data Model permissions"). |
| **File Storage Manager**  See: [File Storage Manager service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37 "File Storage Manager service permissions"). | **Buckets**  See: [File Storage Manager bucket permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-032d410e-a4e6-0467-19f2-388d019acc9c "File Storage Manager bucket permissions"). | N/A |
| **Machine Learning**  See: [Machine Learning service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-af7a40f0-223c-8894-f9b2-081cb8452fa7 "Machine Learning service permissions"). | **Workspaces**  See: [Machine Learning workspace permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-58536629-3a9b-aa0a-3cb1-c5586b0eb873 "Machine Learning workspace permissions"). | **App**  See: [Machine Learning app permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-0e935658-f8fe-9b41-d3dc-28299a5a4312 "Machine Learning app permissions"). |
| **On-Prem Automation**  See: [On-Prem Automation service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-aca90604-a44c-6837-299b-f6b84087bec7 "On-Prem Automation service permissions"). | **Agents** (permissions can't be assigned to agents) | N/A |
| **Process Repository**  See: [Process Repository service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3fe37cb3-9556-9b0f-c7aa-9b28cd94d764 "Process Repository service permissions"). | **Categories**  See: [Process Repository category permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3961e08a-adbe-9aa4-0bd8-e780a519e11c "Process Repository category permissions"). | N/A |
| **Studio**  See: [Studio service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a "Studio service permissions"). | **Space**  See: [Studio Space permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8e298a63-5a3b-4916-f2bc-2b1a1497519f "Studio Space permissions").  **Package**  See: [Studio package permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b1168450-1630-8627-82fb-9a95b2e75e00 "Studio package permissions"). | **Assets**: Action Flow, Analysis, Data Explorer, Knowledge Model, Skill, View.  See: [Studio package asset permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-ab0d6a8d-8c3a-4656-9bbf-59cca90a2068 "Studio package asset permissions"). |
| **Task Mining**  See: [Task Mining service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-4c04ce91-271c-3319-13f1-083a7f827e40 "Task Mining service permissions"). | **Project**  See: [Task Mining project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-e0fe4c93-a7db-1b5d-d465-414e8e024206 "Task Mining project permissions"). | N/A |
| **Team**  See: [Team service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-51ec2461-8bab-53f4-148f-2a3ead1b83d3 "Team service permissions"). | N/A | N/A |
| **Transformation Center**  See: [Transformation Center service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-6ffcdbb4-c089-1c7e-4209-d236e7c1f775 "Transformation Center service permissions"). | **Objectives**  See: [Transformation Center objectives permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-915e5093-145c-27e2-f4a8-d004d7f40d56 "Transformation Center objectives permissions"). | **KPIs** (permission can be assigned to KPIs but these are covered by the objective permissions) |
| **Transformation Hub**  See: [Transformation Hub service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-e26ac3e2-fcda-b3c7-ed1d-6532d029404f "Transformation Hub service permissions"). | N/A | N/A |
| **User Provisioning**  See: [User Provisioning service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-f797c311-cfb7-5fe9-9687-37ca92a1fd25 "User Provisioning service permissions"). | N/A | N/A |

| Service | Container(s) | Object(s) |
| --- | --- | --- |
| **Action Engine**  See: [Action Engine service permission](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b7d0a9eb-12f5-a55d-6b20-e943d6f7f209 "Action Engine service permission"). | **Project**  See: [Action Engine project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-59bc9890-1e02-023a-783d-508e27749a4c "Action Engine project permissions"). | N/A |
| **Data Integration**  See: [Data Integration service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions"). | **Data Pool**  See: [Data Integration Data Pool permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3d909e01-84e9-653c-042a-6852558c93da "Data Integration Data Pool permissions"). | **Data Model**  See: [Data Integration Data Model permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3e7c8ede-fa3c-d937-de76-e6e965fc118f "Data Integration Data Model permissions"). |
| **File Storage Manager**  See: [File Storage Manager service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37 "File Storage Manager service permissions"). | **Buckets**  See: [File Storage Manager bucket permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-032d410e-a4e6-0467-19f2-388d019acc9c "File Storage Manager bucket permissions"). | N/A |
| **Machine Learning**  See: [Machine Learning service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-af7a40f0-223c-8894-f9b2-081cb8452fa7 "Machine Learning service permissions"). | **Workspaces**  See: [Machine Learning workspace permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-58536629-3a9b-aa0a-3cb1-c5586b0eb873 "Machine Learning workspace permissions"). | **App**  See: [Machine Learning app permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-0e935658-f8fe-9b41-d3dc-28299a5a4312 "Machine Learning app permissions"). |
| **On-Prem Automation**  See: [On-Prem Automation service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-aca90604-a44c-6837-299b-f6b84087bec7 "On-Prem Automation service permissions"). | **Agents** (permissions can't be assigned to agents) | N/A |
| **Process Repository**  See: [Process Repository service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3fe37cb3-9556-9b0f-c7aa-9b28cd94d764 "Process Repository service permissions"). | **Categories**  See: [Process Repository category permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3961e08a-adbe-9aa4-0bd8-e780a519e11c "Process Repository category permissions"). | N/A |
| **Studio**  See: [Studio service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a "Studio service permissions"). | **Space**  See: [Studio Space permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8e298a63-5a3b-4916-f2bc-2b1a1497519f "Studio Space permissions").  **Package**  See: [Studio package permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b1168450-1630-8627-82fb-9a95b2e75e00 "Studio package permissions"). | **Assets**: Action Flow, Analysis, Data Explorer, Knowledge Model, Skill, View.  See: [Studio package asset permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-ab0d6a8d-8c3a-4656-9bbf-59cca90a2068 "Studio package asset permissions"). |
| **Task Mining**  See: [Task Mining service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-4c04ce91-271c-3319-13f1-083a7f827e40 "Task Mining service permissions"). | **Project**  See: [Task Mining project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-e0fe4c93-a7db-1b5d-d465-414e8e024206 "Task Mining project permissions"). | N/A |
| **Team**  See: [Team service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-51ec2461-8bab-53f4-148f-2a3ead1b83d3 "Team service permissions"). | N/A | N/A |
| **Transformation Center**  See: [Transformation Center service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-6ffcdbb4-c089-1c7e-4209-d236e7c1f775 "Transformation Center service permissions"). | **Objectives**  See: [Transformation Center objectives permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-915e5093-145c-27e2-f4a8-d004d7f40d56 "Transformation Center objectives permissions"). | **KPIs** (permission can be assigned to KPIs but these are covered by the objective permissions) |
| **Transformation Hub**  See: [Transformation Hub service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-e26ac3e2-fcda-b3c7-ed1d-6532d029404f "Transformation Hub service permissions"). | N/A | N/A |
| **User Provisioning**  See: [User Provisioning service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-f797c311-cfb7-5fe9-9687-37ca92a1fd25 "User Provisioning service permissions"). | N/A | N/A |

[### Action Engine permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910043504_body)

You can assign and manage both service and container (known as projects) level permissions for Action Engine:

- [Action Engine service permission](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b7d0a9eb-12f5-a55d-6b20-e943d6f7f209 "Action Engine service permission").
- [Action Engine project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-59bc9890-1e02-023a-783d-508e27749a4c "Action Engine project permissions").

#### Action Engine service permission

Admins can assign and manage the following **Action Engine** service permissions in the Celonis Platform:

- **My Inbox** (Viewer) - The user has access to 'My Inbox'.
- **Manage Skills** (Analyst) - The user has access to 'My Inbox' and can manage skills and see projects.
- **Access All Projects** (Analyst) - The user has access to 'My Inbox' and can see adoption.
- **Create Projects** (Analyst) - The user has access to 'My Inbox' and can create new projects

#### Action Engine project permissions

Within the Action Engine service, you can assign the following project based permissions:

- **Access** (Analyst) - The user can view, edit, and delete the Action Engine project.

To assign Action Engine project permissions while viewing the project, click **Options - Manage Permissions**:

|  |
| --- |
|  |

[### Data Integration permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910087988_body)

With the Data Integration service, you can assign and manage permissions on a service, container (Data Pools), and object (Data Models) level:

- [Data Integration service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions")
- [Data Integration Data Pool permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3d909e01-84e9-653c-042a-6852558c93da "Data Integration Data Pool permissions")
- [Data Integration Data Model permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3e7c8ede-fa3c-d937-de76-e6e965fc118f "Data Integration Data Model permissions")

#### Data Integration service permissions

Your Data Integration service permissions define who can access (and configure) your Data Integration services area. This is controlled from the **Admin & Settings** area.

Admins can assign and manage the following **Data Integration** service permissions in the Celonis Platform:

- **Use all Data Models** (Viewer) - The user can assign any Data Model from any Data Pool to, e.g. a variable in Studio and use it from there. This does not give any permission to access or make changes in Data Integration.
- **View all Data Pool** (Analyst) - The user can view all Data Pools of this team in a read-only mode and has no permission to modify any of them.
- **Edit all Data Pools** (Analyst) - The user has “edit” permissions and can perform all operations for all Data Pools except deleting a Data Pool and managing permissions.
- **Create Data Pools** (Analyst) - The user can create new Data Pools in Data Integration and will automatically have Manage Data Pool Permissions in those.
- **Manage all Data Pools** (Analyst) - The user has "edit" permissions and can perform all operations, including sensitive ones on all Data Pools of this team.

#### Data Integration Data Pool permissions

Data Pool permissions control who can access and edit individual Data Pools (and all their data connections, jobs, and Data Models accordingly) with your Data Integration service.

You can assign the following Data Pool permissions within the Data Integration service:

- **Use all Data Models** (Viewer) - The user can assign all Data Models in this Data Pool to e.g. a variable in Studio and use it from there. This does not give any permission to access or make changes in Data Integration.
- **View Data Pool** (Analyst) - The user can view this Data Pools in a read-only mode and has no permission to modify it.
- **Edit Data Pool** (Analyst) - The user has “edit” permissions and can perform all operations for this Data Pools except deleting the Data Pool and managing permissions.
- **Create Data Pools** (Analyst) - The user can create new Data Pools in Data Integration and will automatically have Manage Data Pool Permissions in those.
- **Manage Data Pool** (Analyst) - The user has "edit" permissions and can perform all operations, including sensitive ones on this Data Pools only.

#### Data Integration Data Model permissions

You can assign and manage both usage and data permissions for your Data Models within the Data Integration service:

- **Usage permissions**: This gives users and applications the ability to use this Data Model in other Celonis Platform areas, such as Studio. This does not give them access to access or edit the Data Model within the Data Integration service.
- **Data permissions**: Without any assigned Data Permissions, every user and group will be able to access the data of this Data Model - once loaded - via the Celonis Studio. You can set these permissions either manually or via data permission tables:

  - [Setting data permissions manually for users and groups](setting-data-permissions-manually-for-users-and-groups.html "Setting data permissions manually for users and groups")
  - [Loading data permissions from permission tables](loading-data-permissions-from-permission-tables.html "Loading data permissions from permission tables").

[### File Storage Manager permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910124844_body)

You can assign and manage File Storage Manager permissions on a service and container (buckets) level in the Celonis Platform.

- [File Storage Manager service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37 "File Storage Manager service permissions").
- [File Storage Manager bucket permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-032d410e-a4e6-0467-19f2-388d019acc9c "File Storage Manager bucket permissions").

#### File Storage Manager service permissions

Admins can assign and manage the following **File Storage Manager** service permissions in the Celonis Platform:

- **Get** (Viewer) - The user can view all files in a storage bucket.
- **Create** (Analyst) - The user is able to create storage buckets.
- **Delete** (Analyst) - The user is able to delete storage buckets.
- **Admin** (Analyst) - The user is able to create and delete storage buckets.
- **List** (Analyst) - The user is able to call a list of all storage buckets.

#### File Storage Manager bucket permissions

You can assign and manage the following user permissions for individual buckets within the File Storage Manager service:

- **Get** (Viewer) - The user can view all files in the bucket.
- **Create** (Analyst) - The user is able to create content that is stored in this bucket.
- **Delete** (Analyst) - The user is able to delete content within the bucket and delete the bucket itself.
- **Admin** (Analyst) - The user is able to create and delete content within the bucket and delete the bucket itself.
- **List** (Analyst) - The user is able to call a list of all content within this bucket.

To assign bucket permissions within the File Storage Manager, click **Options - Permissions**:

|  |
| --- |
|  |

[### Machine Learning permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910158078_body)

You can assign and manage Machine Learning permissions on a service, container (workspace), and object (app) level in the Celonis Platform.

- [Machine Learning service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-af7a40f0-223c-8894-f9b2-081cb8452fa7 "Machine Learning service permissions").
- [Machine Learning workspace permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-58536629-3a9b-aa0a-3cb1-c5586b0eb873 "Machine Learning workspace permissions").
- [Machine Learning app permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-0e935658-f8fe-9b41-d3dc-28299a5a4312 "Machine Learning app permissions").

#### Machine Learning service permissions

Admins can assign and manage the following **Machine Learning** service permissions in the Celonis Platform:

- **Create Apps** (Analyst) - The user can create new apps.
- **Use all Apps** (Viewer) - The user can use all existing Apps.
- **Manage All Apps** (Analyst) - The user can edit, upgrade, delete, update the associated application key and update the permissions for all apps.
- **Create Workspaces** (Analyst) - The user can create workspaces.
- **Manage All Workspaces** (Analyst) - The user can edit, delete all workspaces.

#### Machine Learning workspace permissions

You can assign and manage the following workspace permissions within the Machine Learning service:

- **Create Apps** (Analyst) - The user can create new apps within this workspace.
- **Use all Apps** (Viewer) - The user can use all existing apps in this workspace.
- **Manage All Apps** (Analyst) - The user can edit, upgrade, delete, update the associated application key and update the permissions for all apps in this workspace.
- **Create Workspaces** (Analyst) - The user can create additional workspaces.
- **Manage All Workspaces** (Analyst) - The user can edit, delete all workspaces.

To assign workspace permissions from the Machine Learning service, click **Apps - Options - Permissions**:

|  |
| --- |
|  |

#### Machine Learning app permissions

You can assign and manage the following app permissions within the Machine Learning service:

- **Use App** (Viewer) - The user can access and use this app.
- **Manage App** (Analyst) - The user can edit, upgrade, delete, update the associated application key and update the permissions for this app.

To assign apps permissions from within a Machine Learning workspace, click **Options - Permissions**:

[### On-Prem Automation permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910191207_body)

You can assign and manage On-Prem Automation permissions on a service level only in the Celonis Platform. While On-Prem Automations has a container level (agents), you can't assign permissions to these directly.

#### On-Prem Automation service permissions

Admins can assign and manage the following **On-Prem Automation** service permissions in the Celonis Platform:

- **View agents** (Viewer) - The user can view the list of agents in the Automation global page.
- **Manage permissions** (Analyst) - The user can update permissions related to automation.
- **Register agents** (Analyst) - The user can register new agents in the Celonis Platform team. Meaning, the user can create a connection between the agent installed in a customer's on-prem environment and the Celonis Platform team.
- **Edit agents** (Analyst) - The user can edit or delete agents in the Automation global page.

[### Process Repository permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910229108_body)

You can assign and manage Process Repository permissions on a service and container (category) level in the Celonis Platform.

- [Process Repository service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3fe37cb3-9556-9b0f-c7aa-9b28cd94d764 "Process Repository service permissions").
- [Process Repository category permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3961e08a-adbe-9aa4-0bd8-e780a519e11c "Process Repository category permissions").

#### Process Repository service permissions

Admins can assign and manage the following **Process Repository** service permissions in the Celonis Platform:

- **Use categories** (Viewer) - The user can use existing process repository categories but not create them.
- **Create and modify categories** (Analyst) - The user can create and modify existing process categories but, unless combined with other permissions, can't delete existing categories.
- **Modify existing categories** (Analyst) - The use can modify existing process categories but, unless combined with other permissions, can't create categories.
- **Delete existing categories** (Analyst) - The use can delete existing process categories but, unless combined with other permissions, can't create or modify categories.

#### Process Repository category permissions

You can assign and manage the following category permissions within the Process Repository service:

- **Use categories** (Viewer) - The user can use the existing Process Repository category but not edit or delete it.
- **Edit category** (Analyst) - The user can use, edit, and delete the Process Repository category.

To assign and manage category permissions from within Process Repository service, click **Options - Permissions**:

[### Studio permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545962811054_body)

With the Studio service, you can assign and manage permissions on a service, container (Space, Package), and object (Action Flow, Analysis, Data Explorer, Knowledge Model, Skill, View.) level:

- [Studio service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a "Studio service permissions").
- [Studio Space permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8e298a63-5a3b-4916-f2bc-2b1a1497519f "Studio Space permissions").
- [Studio package permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-b1168450-1630-8627-82fb-9a95b2e75e00 "Studio package permissions").
- [Studio package asset permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-ab0d6a8d-8c3a-4656-9bbf-59cca90a2068 "Studio package asset permissions").

#### Studio service permissions

Admins can assign and manage the following **Studio** service permissions in the Celonis Platform:

- **Edit all spaces** (Analyst) - The user can only edit existing space names but can create, edit, delete and set permissions for spaces and content they have created unless permissions are removed.
- **Delete all spaces** (Analyst) - The user can create, edit, delete and set permissions to spaces and content they have created, unless permissions are removed. They can't delete other spaces unless this permissions is combined with Edit all Spaces.
- **Create space** (Analyst) - The user can create a new space, package or install from Marketplace. Once the space is created the user can edit, delete and assign permissions to the created space and its contents.
- **Export all** (Analyst) - The user can utilize the exporting functionalities copy-to to export package and asset configurations to other teams (i.e. instances). Copying within the same team (i.e. to another space or package) is still allowed. The user can also utilize the content-cli to export package and asset configuration.
- **Manage permissions** (Analyst) - The user can create, edit, delete and set permissions to spaces and content they have created, unless permissions are removed. They can't manage permissions to other spaces unless this permissions is combined with Edit all Spaces.

#### Studio Space permissions

Within the Studio service, you can assign and manage the following Space permissions:

- **Use all packages** (Viewer) - The user can use all content in the granted Space from within Apps. The space content isn't accessible via Studio.
- **Edit Space** (Analyst) - The user can see the name of space they have been granted and can edit the space name.
- **Edit all packages** (Analyst) - The user can create new or edit all packages and assets within the space they have been granted, they can't delete anything.
- **Delete all packages** (Analyst) - The user can only see the Space they have been granted and can't do anything. This permission must be combined with Edit all Packages to work.
- **Delete space** (Analyst) - In Studio, the user can delete the granted space and everything in it, but can't see the content. They can see the content in Apps.
- **Create package** (Analyst) - The user can see the name of the space they have been granted and can create a new package within it. They can't see existing packages. The user can delete and grant permission to packages they have created, unless permissions are removed.
- **Manage permissions** (Analyst) - The user can manage permissions of the space they are granted. They can see all content in Apps.

To assign and manage Studio space permissions from the space overview page, click **Options - Permissions**:

#### Studio package permissions

Within a Studio space, you can assign and manage the following package permissions:

- **Use package** (Viewer) - The user can "use" the package they have been granted in Apps.
- **Edit package** (Analyst) - The user can edit the package and create, edit all assets within the package, they can't delete anything.
- **Delete package** (Analyst) - When checked alone, the user can only see the Space they have been granted and can't do anything. This permission must be combined with Edit Package to work.
- **Manage permissions** (Analyst) - When checked alone, this does nothing other than show the space, with no packages shown. This permission must be combined with Edit Package to work.

To assign and manage Studio package permissions from within a Studio Space, click **Options - Permissions**:

#### Studio package asset permissions

Within Studio packages you can create and manage Studio assets (see: [Asset types](package-asset-types.html "Package asset types"). For each Studio package asset, you can assign and manage the following permissions:

- **Use** (Viewer) - The user can use the view they are granted permissions to. They can also see the package the view is within.

To assign and manage Studio package assets from within the package, click **Options - Permissions**:

[### Task Mining permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234547500653757_body)

When using the Task Mining service, you can assign and manage permissions on a service and container (project) level:

- [Task Mining service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-4c04ce91-271c-3319-13f1-083a7f827e40 "Task Mining service permissions").
- [Task Mining project permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-e0fe4c93-a7db-1b5d-d465-414e8e024206 "Task Mining project permissions").

**Note**

For information about Task Mining permissions in general, see [Task Mining permissions](task-mining-permissions-52989.html "Task Mining permissions").

#### Task Mining service permissions

Admins can assign and manage the following **Task Mining** service permissions in the Celonis Platform:

- **Edit Client Settings** (Analyst) - Analysts are granted permissions to see and edit everything behind the menu point "Client Setups" in Task Mining.
- **Edit Users** (Analyst) - Analysts are granted permissions to see and edit everything behind the menu point "Users & Invite".

|  |
| --- |
|  |

#### Task Mining project permissions

Within the Task Mining service, you can assign and manage the following project permissions:

- **Edit client settings** (Analyst) - Analysts are granted permissions to view and edit **Client Setups** in Task Mining
- **Edit users** (Analyst) - Analysts are granted permissions to view and edit **Users & Invite**.

[### Team permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234547498678738_body)

Team permissions control who and what can access and manage your **Admin & Settings** area in the Celonis Platform.

#### Team service permissions

Admins can assign and manage the following **team** service permissions in the Celonis Platform:

- **Import members** (Viewer) - The granted user can import members from one team to another.
- **Use Audit Logs API** (Analyst) - The granted user can now configure an API to export audit logs.
- **Use Login History API** (Analyst) - The granted user can now configure an API to export login history logs.
- **Use Studio Adoption API** (Analyst) - The granted user can now configure an API to export user adoption events.
- **Manage Audit Logs** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Audit Logs in the menu.
- **Manage Login History** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see login history in the menu.
- **Manage General Settings** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Settings in the menu.
- **Manage SSO Settings** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Single sign-on in the menu.
- **Manage Members** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Users in the menu.
- **Manage Groups** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Groups in the menu.
- **Manage Permissions** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Permissions in the menu.
- **Manage Member Locking Policy** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see User locking policy in the menu.
- **Manage License Settings** (Analyst) The granted user gets limited access to Admin & Settings, but can only see License in the menu.
- **Manage Admin Notifications** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Notifications in the menu.
- **Manage Uplink Integrations** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Uplink integrations in the menu.
- **Manage Event Collection on Premises** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see Permissions in the menu.
- **Manage Adoptions Views** (Analyst) - The granted user gets limited access to Admin & Settings, but can only see User Adoption Views in the menu.
- **Manage Download Portal** (Analyst) - The granted user gets full access to the Download Portal, giving them access to files which support Celonis provided apps.

[### Transformation Center permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910274787_body)

When using the Transformation Center service, you can assign and manage permissions on a service and container (objectives) level. While you can create KPIs within objectives, these permissions are managed as part of the objective permissions.

- [Transformation Center service permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-6ffcdbb4-c089-1c7e-4209-d236e7c1f775 "Transformation Center service permissions").
- [Transformation Center objectives permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-915e5093-145c-27e2-f4a8-d004d7f40d56 "Transformation Center objectives permissions").

#### Transformation Center service permissions

Admins can assign and manage the following **Transformation Center** service permissions in the Celonis Platform:

- **View Objective** (Viewer) - The user can view existing objectives.
- **Create Objective** (Analyst) - The user can create an objective.
- **Edit Objective** (Analyst) - The user can edit an existing objective.
- **Delete Objective** (Analyst) - The user can delete an objective.
- **Create KPI** (Analyst) - The user can create and edit KPIs.
- **Export Content** (Analyst) - The user can export KPIs and objectives.
- **Move to** (Analyst) - The user can move content.
- **Manage permissions** (Analyst) - The user can manage service permissions.

#### Transformation Center objectives permissions

You can assign and manage the following permissions for Transformation Center objectives:

- **View Objective** (Viewer) - The user can view this objective.
- **Edit Objective** (Analyst) - The user can edit this objective.
- **Create KPI** (Analyst) - The user can create and edit KPIs within .
- **Delete Objective** (Analyst) - The user can delete this objective.
- **Manage permissions** (Analyst) - The user can manage the permissions for this objective.

To assign objective permissions within the Transformation Center, click **Options - Permissions**:

|  |
| --- |
|  |

[### Transformation Hub permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234545910317583_body)

You can assign and manage Transformation Hub permissions on a service level only in the Celonis Platform.

#### Transformation Hub service permissions

Admins can assign and manage the following **Transformation Hub** service permissions in the Celonis Platform:

- **Access Transformation Hub** (Analyst) - The user can access the Transformation Hub service.

[### User Provisioning permissions](#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_section-idm234547498781692_body)

You can assign and manager User Provisioning permissions on a service level only in the Celonis Platform.

#### User Provisioning service permissions

User Provisioning service permissions are available when single sign-on (SSO) is enabled for the Celonis Platform team. When enabled, admins can assign and manage the following **User Provisioning** service permissions in the Celonis Platform:

- **SCIM** (Viewer) - The user can configure SCIM API for user provisioning (If enabled).

## Related topics

- [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")
- [Users, licenses, and activity](managing-users,-licenses,-and-celonis-platform-activity.html "Managing users, licenses, and Celonis Platform activity")
- [Security recommendations](security-recommendations.html "Security recommendations")


---

## admin/permissions/controlling-access-and-permission-for-action-flows

# Controlling access and permission for Action Flows

Celonis offers a set of controls to allow customers to define which systems can be automated and by whom.

Here's an overview of the different levels on which the controls can be set:

Expand all

[## System connectivity level](#UUID-ff939913-0212-073c-5386-1f1fddadabae_section-idm4570491540422433809214256454_body)

Controls on the system connectivity level allow Administrators to define in which systems the actions can be automated. Different sets of controls can be defined for connections to on-premise and cloud third-party systems.

**On-premise systems**

Execution of automations in the customer’s on-premise applications, like SAP ECC or Oracle EBS, from Celonis Platform is only possible using Celonis on-prem clients. Installation of on-prem clients on customers' central servers has to be authorized by the IT Administrator. For more information, see [Installing](installing-on-prem-clients.html "Installing on-prem clients").

**Cloud systems**

Different third party applications deployed within an enterprise environment may require additional processes to be followed in order to enable an end-user to grant Celonis Platform to operate on their behalf see details. To learn more, see [Security details](security-details-for-action-flows-and-third-party-applications.html "Security details for Action Flows and third party applications")

[## Source system configuration level](#UUID-ff939913-0212-073c-5386-1f1fddadabae_section-idm4570491541921633809228044444_body)

To execute an automation in a third-party system like SAP, it is a prerequisite that a connection to the system has been established and access has been authorized. The connection to the source system can be established using a “service” account. The permissions that were configured for the service account in the source system are respected when doing calls from Celonis Platform to the source system. We advise taking special care when using “service" accounts to provide an Action Flow with elevated authority in source systems, compared to the authority of the Celonis Platform user.

The source system logs contain information about the account that had been used to establish the connection to the system before an action was executed. To learn how to start logging Action Flow events in Celonis Platform, see [Audit logs - Action Flows](action-flows-audit-logs.html "Audit logs for Action Flows").

[## Celonis Platform level controls](#UUID-ff939913-0212-073c-5386-1f1fddadabae_section-idm4589008320382433809230711409_body)

Action Flows are built and maintained in Studio. Action Flows can also be executed from inside Studio (one-time triggering). Different levels of controls can be set on user level in Celonis Platform by the Celonis Platform Admin user to control the permissions to create, maintain and execute the Action Flows inside Studio:

- **Studio access and permissions**: “Member” Celonis Platform users don’t have access to Studio and can’t create and maintain Action Flows. Admins can define which Celonis Platform users can have access to Studio. This is described in the next section, [Control analyst access to Action Flow assets](controlling-access-and-permission-for-action-flows.html#UUID-ff939913-0212-073c-5386-1f1fddadabae_section-idm4524929738097633985394965538 "Control analyst access to Action Flow assets").

  Action Flows should consider validating inputs coming from Views or Tasks to ensure expected values and permission checks are always correctly enforced at this final step of Action Flow execution.
- **Package access and permissions**: Only users who have “edit” access to a package can create, maintain, or execute Action Flows in that package. Thus, if personal credentials are being used to create the connections in Action Flows, it’s recommended that access to the package containing those Action Flows is limited only to the users whose credentials are being used.

Using the controls on Celonis Platform levels, IT Admins can also define different sets of permissions on sandbox and production environments.

[## Control analyst access to Action Flow assets](#UUID-ff939913-0212-073c-5386-1f1fddadabae_section-idm4524929738097633985394965538_body)

You have the option to control which analysts can access Action Flows to view, edit, and activate them. You can enable access for the users or groups that you want in the Action Flow section of the Permissions pane in **Admin & Settings**.

Users without access can't see Action Flows, and can't activate Action Flows, though they can still publish a package that contains them. Users with the Admin role always have access to Action Flows.


---

## admin/permissions/creating-and-assigning-permission-sets

# Creating and assigning permission sets

Permissions are granted by:

- Creating permission sets
- Assigning these permission sets to users as global fallback permissions OR user groups as local permissions
- Assigning these user groups to hierarchical element nodes as inheritable local explicit permissions

User permissions can be found in the Admin area, under the **Permission sets** tile.

Expand all

[## Before you begin](#id860919_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have the Administrator role to activate this feature.

[## Creating permission sets](#UUID-a5e10e4b-4da4-27ea-93d2-60617c48543b_permission-sets_body)

To create a new permission set:

1. Enter a name and click **New**.
2. Select the newly created permission and click **Permissions** in the toolbar:
3. When setting permission levels select the desired permissions and then click **OK**.

[## Assigning default permissions to a user](#UUID-a5e10e4b-4da4-27ea-93d2-60617c48543b_user-default-permissions_body)

To assign default permissions to a user:

1. Select the user and ensure that the correct role is set (e.g. to be able to actually **Edit element** you must be able to switch into **Editor** mode), then click on **Permissions**:
2. In the **Change Permissions** modal, select the burger icon next to **Permission Sets**. Select the permission set to add; click **OK** to add the selected permission set and **OK** again to apply the changes to the user:

[## Assigning user group permissions](#UUID-a5e10e4b-4da4-27ea-93d2-60617c48543b_user-group-permissions_body)

Concerning permissions, user groups are the binding element between users and actual elements.

To authorize users on specific elements you will have to:

- assign appropriate permission sets to a dedicated user group (see below)
- assign users to this dedicated user group
- assign this dedicated user group to elements to protect (see next sections)

1. Create the dedicated user group, select it, and click **Permissions** in the toolbar.
2. In the **Change Permissions** modal, select the burger icon next to **Permission Sets**. Select the permission set to add; click **OK** to add the selected permission set and **OK** again to apply the changes to the user group:

[## Assigning hierarchical permissions](#UUID-a5e10e4b-4da4-27ea-93d2-60617c48543b_hierarchical-permissions_body)

To actually secure a hierarchical subtree:

1. Select the desired facet, the node to protect, and then **Permissions** in the toolbar.
2. In the **Change Permissions** modal, select the burger icon next to **Permission Sets**. Select the permission set to add; click **OK** to add the selected permission set and **OK** again to apply the changes to the selected node:

## Related topics

- [Permissions for facets](permissions-for-facets.html "Permissions for facets")
- [Permissions](permissions.html "Permissions")


---

## admin/permissions/data-integration-service-permissions

# Data Integration service permissions

You can assign and manage Data Integration permissions on a service, container (Data Pools), and object (Data Models) level in the Celonis Platform.

- [Data Integration service permissions](data-integration-service-permissions.html#UUID-63b637bd-499d-3471-85ae-638b4bf326d2_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04 "Data Integration service permissions")
- [Data Integration Data Pool permissions](data-integration-service-permissions.html#UUID-63b637bd-499d-3471-85ae-638b4bf326d2_UUID-3d909e01-84e9-653c-042a-6852558c93da "Data Integration Data Pool permissions")
- [Data Integration Data Model permissions](data-integration-service-permissions.html#UUID-63b637bd-499d-3471-85ae-638b4bf326d2_UUID-3e7c8ede-fa3c-d937-de76-e6e965fc118f "Data Integration Data Model permissions")

## Data Integration service permissions

Your Data Integration service permissions define who can access (and configure) your Data Integration services area. This is controlled from the **Admin & Settings** area.

Admins can assign and manage the following **Data Integration** service permissions in the Celonis Platform:

- **Use all Data Models** (Viewer) - The user can assign any Data Model from any Data Pool to, e.g. a variable in Studio and use it from there. This does not give any permission to access or make changes in Data Integration.
- **View all Data Pool** (Analyst) - The user can view all Data Pools of this team in a read-only mode and has no permission to modify any of them.
- **Edit all Data Pools** (Analyst) - The user has “edit” permissions and can perform all operations for all Data Pools except deleting a Data Pool and managing permissions.
- **Create Data Pools** (Analyst) - The user can create new Data Pools in Data Integration and will automatically have Manage Data Pool Permissions in those.
- **Manage all Data Pools** (Analyst) - The user has "edit" permissions and can perform all operations, including sensitive ones on all Data Pools of this team.

## Data Integration Data Pool permissions

Data Pool permissions control who can access and edit individual Data Pools (and all their data connections, jobs, and Data Models accordingly) with your Data Integration service.

You can assign the following Data Pool permissions within the Data Integration service:

- **Use all Data Models** (Viewer) - The user can assign all Data Models in this Data Pool to e.g. a variable in Studio and use it from there. This does not give any permission to access or make changes in Data Integration.
- **View Data Pool** (Analyst) - The user can view this Data Pools in a read-only mode and has no permission to modify it.
- **Edit Data Pool** (Analyst) - The user has “edit” permissions and can perform all operations for this Data Pools except deleting the Data Pool and managing permissions.
- **Create Data Pools** (Analyst) - The user can create new Data Pools in Data Integration and will automatically have Manage Data Pool Permissions in those.
- **Manage Data Pool** (Analyst) - The user has "edit" permissions and can perform all operations, including sensitive ones on this Data Pools only.

## Data Integration Data Model permissions

You can assign and manage both usage and data permissions for your Data Models within the Data Integration service:

- **Usage permissions**: This gives users and applications the ability to use this Data Model in other Celonis Platform areas, such as Studio. This does not give them access to access or edit the Data Model within the Data Integration service.
- **Data permissions**: Without any assigned Data Permissions, every user and group will be able to access the data of this Data Model - once loaded - via the Celonis Studio. You can set these permissions either manually or via data permission tables:

  - [Setting data permissions manually for users and groups](setting-data-permissions-manually-for-users-and-groups.html "Setting data permissions manually for users and groups")
  - [Loading data permissions from permission tables](loading-data-permissions-from-permission-tables.html "Loading data permissions from permission tables").


---

## admin/permissions/data-permissions-for-object-centric-process-mining

# Object-centric process mining service permissions

Access to Object-Centric Process Mining (OCPM) is managed via roles and data pool-level permissions. These controls regulate the ability to manage the full OCPM lifecycle—from configuring objects and events to publishing perspectives.

Expand all

[## Available roles and permissions](#UUID-d8b95776-a539-3c08-4e20-ca99700fc200_section-id235403063606445_body)

The following standard roles are available:

- **Admins**: Admins have full access across the team. This includes:

  - View, edit, and publish all objects, events, transformations, and perspectives.
  - Manage object-centric data models in any data pool.
  - Configure environments and permissions.
- **Analysts** (edit permissions): Analysts with edit permissions for a data pool can:

  - View and edit all objects, events, transformations, and perspectives in that data pool.
  - Publish changes to development and production environments.

  If object-centric data models are enabled for all data pools, analysts need edit permissions for each data pool they are allowed to work in.
- **Analysts** (view permissions): Analysts with view permissions for a data pool can.

  - View objects, events, transformations, and perspectives.

  This role is suitable for review or read-only access.
- **Members**: View only permissions. Members permission mean:

  - Cannot access objects, events, transformations, or perspectives directly.
  - Can use applications and assets built on published perspectives.

[## Data access and security considerations](#UUID-d8b95776-a539-3c08-4e20-ca99700fc200_section-id235403077757736_body)

When working with a single OCPM data pool, it's not possible to restrict analysts’ access to specific objects, processes, or events in the **Objects and Events** dashboard.

If you need to protect sensitive data during modeling, we recommend the following:

- Enable object-centric process mining for multiple data pools.
- Assign analysts access only to the data pools containing the data they are permitted to work with.
- Use separate object-centric data pools to enforce strict data separation.

[## Setting data permissions for a perspective](#UUID-d8b95776-a539-3c08-4e20-ca99700fc200_section-id235403053012735_body)

You can apply data permissions to individual perspectives, similar to case-centric models. These permissions allow you to:

- Restrict data visibility for end users.
- Apply user or group filters (for example, limiting data to a specific region or business unit).

These restrictions apply when users interact with apps or analyses built on the perspective.

To set the data permissions for a perspective:

1. Click **Data - Data Integration** and select the data pool where you're working with objects and events.
2. Find the perspective in the Data Models section of the data pool, and choose **Data Permissions** from the context menu.
3. Click **Add user or group**. Click the name of a user or group in the listing to add them.
4. Select the user or group name and click **Add Rule**.
5. Click **Select** and choose a column. Type all permitted values from that column, and click **Save**.
6. Add further rules in the same way. The rules have an AND relationship - users must have permission under all rules that apply to an object to view its data. If a user can’t see an object, they also can’t see objects that are connected to it by a relationship, unless they are connected to other objects that they can see.

**Important**

If your perspective contains any standalone objects, or any distinct groups of objects that are connected to each other but not to other groups, check your data permissions carefully. Rules that you set on a group of interconnected objects apply to the objects in the group, but don't apply to objects and groups that are not connected to them.

For example, if your perspective contains these groups of objects:

```
(A-B-C) (D-E) (F)
```

- Data permissions placed on object F don't affect any of the other objects.
- Data permissions placed on objects D and E affect each other, but not A, B, C, and F.
- Data permissions placed on objects A, B, and C affect each other, but not D, E, or F.

## Related topics

- [User and team roles](user-profile.html "User and team roles")
- [Variable admin permissions](variable-admin-permissions.html "Variable admin permissions")
- [Data Integration service permissions](data-integration-service-permissions.html "Data Integration service permissions")


---

## admin/permissions/loading-data-permissions-from-permission-tables

# Loading data permissions from permission tables

You can set data permissions by applying permission tables within your data pool. This approach provides scalable management and allows Data Model Managers to define permissions for large volumes of users, tables, and columns simultaneously.

**Note**

For granular, UI-based management of individual user assignments, you can manually configure permissions directly in your data pool. For more information, see [Setting data permissions manually for users and groups](setting-data-permissions-manually-for-users-and-groups.html "Setting data permissions manually for users and groups").

This page provides best practices and the steps for managing permission tables.

Expand all

[## Before you begin](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id235428588048495_body)

Review the following configuration standards and data constraints to ensure your permission tables function as intended and remain secure.

[### Avoiding permission escalations](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_UUID-8ba540b1-dbeb-56a9-de6f-5611a4aad248_body)

If a user is a member of two groups, the higher permission level will apply to both groups. This means when applying manual permissions for a user, the manually granted permissions **could** supersede a user's overall Celonis Platform permissions.

For example, if a user has limited access to one group and is then given unlimited access to a second group, they will then automatically have unlimited access to both groups.

To set up data permissions involving multiple values or multiple table columns, see: [Understanding data permissions](understanding-data-permissions.html "Understanding data permissions").

[### Configuring permissions on related tables (1:N)](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_UUID-2d30a972-7e0d-1ce1-f935-72e10b330e4c_body)

When defining permissions across tables with a 1:N (One-to-Many) relationship, such as Orders (Parent) to Order Items (Child), it is **highly recommended** to apply the primary permission to the Parent table.

If you apply a permission strictly to a Child table:

- The system filters out any rows that do not have a matching entry in the permission table.
- If a Parent object has no corresponding Child entries, the Parent object may become invisible in Studio views.
- Rows without a join partner are automatically removed when the permission filter cannot find a match.

To ensure Parent objects remain visible even when they have no associated Child entries, always apply the primary permission to the Parent table.

[### Permission table data constraints](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id235492256133959_body)

To ensure accurate filtering and data processing, permission tables must adhere to the following data type and value constraints.

[#### STRING data type requirement](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id235492259411402_body)

When using permission tables, all inputted values are interpreted as `STRING` data types when the permission table is applied. This means existing table configurations are ignored for permission table columns; all data within these columns is automatically cast to `STRING` during the filter application process.

To ensure your permission table data is interpreted as you intended, we suggest formatting all columns intended for permission filtering as strings in your source file prior to upload.

[#### Handling NULL values in permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm2533542857808292_body)

`NULL` values are automatically skipped when the data model is loaded. This means when your data is loaded, users will not be able to see any row or values for columns with `NULL` values. When columns do not contain a value, it is critical that you do not use `NULL` values in either your data model or the **Reference values** in your permission table.

For values that are `NULL` , use `''` (empty string) to represent them. Ensure you use `''` (empty string) both in your data and your permission table.

**Note**

You can identify `NULL` values in your data model by checking for warning messages during a data model load.

[## Creating permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm4511364733424034194297418706_body)

There are two types of permission tables: value assignment tables and unlimited assignment tables. Value assignment tables allow granular permission control based on specific table, column, and value assignment. Unlimited assignment tables allow unlimited access to the data model.

**Note**

You can create and upload as many tables of both types as you need for your data pool.

[### Creating value assignment permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm4511364733424034194297418707_body)

When creating a value assignment permission table, include the following information:

**Important**

When your permission table is uploaded, existing table configurations are ignored, and all values are interpreted as `STRING` data types. For more information, see [STRING data type requirement](loading-data-permissions-from-permission-tables.html#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id235492259411402 "STRING data type requirement").

- **Reference user**: A column in the permission table with user emails or the group names to be assigned permissions. Each entry must be on a separate row.

  **Note**

  You can only have either users or groups in a single permission table. If you need to configure permissions for both users and groups, create separate tables for each.
- **Reference table**: A column in the permission table that lists the data tables you want to assign permissions for. When specifying a data table name in the permission table, choose either the real table name of the data table in the data model or the alias displayed in the data model graph. You can see the table name by selecting the **Options (⋮)** menu next to the alias name in the data model graph.
- **Reference column**: A column in the permission table that lists the columns in the **Reference table**s you want to grant users access to.
- **Reference value**: A column in the permission table that lists the values within **Referenced column**s you want to grant users access to see. The **Reference value** *must* be the same as the data type for the column in the data model that you're comparing it to.

  **Important**

  `NULL` values are not processed within the permission table. If a **Reference Value** is represented as `NULL`, the corresponding records will not be visible to users.

  For more information on how to handle `NULL` values, see [Handling NULL values in permission tables](loading-data-permissions-from-permission-tables.html#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm2533542857808292 "Handling NULL values in permission tables").

An example of a value assignment permission table:

Filter

- Reference\_User
- Reference\_Table
- Reference\_Column
- Reference\_Value

| Reference\_User | Reference\_Table | Reference\_Column | Reference\_Value | |
| --- | --- | --- | --- | --- |
| m.mustermann@celonis.com | O2C\_VBAK | VKORG | 500 |
| m.musterfrau@celonis.com | O2C\_VBAK | VKORG | 400 |

| Reference\_User | Reference\_Table | Reference\_Column | Reference\_Value | |
| --- | --- | --- | --- | --- |
| m.mustermann@celonis.com | O2C\_VBAK | VKORG | 500 |
| m.musterfrau@celonis.com | O2C\_VBAK | VKORG | 400 |

[### Creating unlimited assignment permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm4511364733424034194297418708_body)

When creating a unlimited assignment permission table, include the following information:

**Important**

Granting a user or group of users unlimited access to data in a table may cause privilege escalation and supersede their overall Celonis Platform permissions. For more information, see [Avoiding permission escalations](loading-data-permissions-from-permission-tables.html#UUID-68abcba7-4a7a-486c-b519-9178190308ca_UUID-8ba540b1-dbeb-56a9-de6f-5611a4aad248 "Avoiding permission escalations").

- **Reference user**: A column in the permission table with user emails or the group names to be assigned permissions. Each entry must be on a separate row.

  **Note**

  You can only have either users or groups in a single permission table. If you need to configure permissions for both users and groups, create separate tables for each.
- **Reference unlimited** A column in the permission table with a `TRUE` or `FALSE` boolean for each user.

Example of an unlimited assignment permission table:

| Reference\_User | Reference\_Unlimited |
| --- | --- |
| m.mustermann@celonis.com | TRUE |
| m.musterfrau@celonis.com | FALSE |

[## Uploading permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id23543006132339_body)

To apply your permission table within a data model, you must be either:

- Include the permission table in a data integration extraction for the data pool.
- Upload the permission table to the data pool using the file uploader.

  **Tip**

  For more information about uploading data files, see [Uploading data files](uploading-data-files.html "Uploading data files").

Once your permission table is uploaded, you will be able to select it from the **Options (⋮) > Data Permissions** menu.

[## Applying permissions from tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm4645531950624034194297484912_body)

Once you upload your permission table to your data pool, you can now apply the permission table within the data model:

1. Select **Data Models**.

   |  |
   | --- |
   |  |
2. For the data model you want to load the permissions for, select **Options (⋮) > Data Permissions**.

   |  |
   | --- |
   |  |
3. Select **Load permissions from tables**, and then **Add permission table**.

   |  |
   | --- |
   |  |
4. Select the permission table from the pool.

   |  |
   | --- |
   |  |
5. Configure the following options:

   - **User/group reference**: Select the column from your permission table that contains the user emails or group names.
   - **Value assignment / Unlimited assignment**: Select the corresponding option for your permission table.
6. Configure the permission table options:

   - If you selected **Value assignment**, provide the following details:

     - **Reference table**: Select the column from your permission table that contains the data tables you are assigning permissions for.
     - **Reference table refers to table alias in the Data Model**: Enable if you are using an *alias* for your data tables rather than the data table name.

       **Important**

       If you are using aliases, and you fail to select this, users will not have access, because no matching data table will be returned.
     - **Reference column**: Select the column from your permission table that contains the columns from the **Reference table** you are assigning permissions for.
     - **Reference value**: Select the column from your permission table that contains the values you are assigning permissions for.

       **Important**

       `NULL` values are not processed within the Data Permission table. If a **Reference value** is represented as `NULL`, the corresponding records will not be visible to the **Reference user**.

       For more information on how to handle `NULL` values, see [Handling NULL values in permission tables](loading-data-permissions-from-permission-tables.html#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-idm2533542857808292 "Handling NULL values in permission tables").
   - If you selected **Unlimited assignment**, for **Unlimited assignment column**, select the column in your permission table that contains the boolean values for users.
7. Select **Apply permission table**.
8. To enable the data permissions, select **Use data permission options**.

   |  |
   | --- |
   |  |

   **Important**

   If you do not select **Use data permissions options**, the permissions will not be applied.

Once you select **Use data permission options**, the data permissions are now active, without the need to reload your data model.

[## Updating permission tables](#UUID-68abcba7-4a7a-486c-b519-9178190308ca_section-id23543022883525_body)

To update a permission table, you only need to update the permission table locally, ensuring to use the same file, and either:

- Include the updated permission table in a data integration extraction for the data pool.
- Upload the updated permission table to the data pool using the file uploader.

  **Tip**

  For more information about uploading data files, see [Uploading data files](uploading-data-files.html "Uploading data files").

## Related topics

- [Understanding data permissions](understanding-data-permissions.html "Understanding data permissions")


---

## admin/permissions/managing-celonis-platform-permissions

# Managing Celonis Platform permissions

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

In Celonis Platform, permissions are used to control who (users) and what (applications and external systems) can access your team and content. Permissions can be assigned on a team or granular level, giving you full control over access to your data and how it’s used.

You can manage the following permission types:

- [User roles and permissions](managing-celonis-platform-permissions.html#UUID-57d77298-e9b2-102c-ddf9-3ff6f599072a_section-idm234519769526552 "User roles and permissions")
- [Application and external systems permissions](managing-celonis-platform-permissions.html#UUID-57d77298-e9b2-102c-ddf9-3ff6f599072a_section-idm23451976957078 "Application and external systems permissions")

Expand all

[## User roles and permissions](#UUID-57d77298-e9b2-102c-ddf9-3ff6f599072a_section-idm234519769526552_body)

A user is an individual who has access to your Celonis Platform team, identified by their unique email address. Depending on your Celonis Platform license, your team has either a defined or an unlimited number of seats to allocate to users.

As an admin, you can view the current allocation of users by clicking **Admin & Settings** > **Users**.

When managing user permissions, you have the following options:

- **User permissions and team roles**: When a user is invited to your team, they are allocated one of three user roles: Admin, Analyst, or Member. These roles control what permissions the user holds within your team.

  To learn more about user permissions and team roles, see: [User and team roles](user-profile.html "User and team roles").
- **Variable admin permissions**: By default, a user with team admin permissions has access to all features and settings within your Celonis Platform. Admins can manage users, edit team security settings, and update service permissions. However, you may want to enable some users to perform only a selection of those admin roles, such as managing users or content only. To achieve this, you can assign variable admin permissions to users and groups within your Celonis Platform.

  To learn more about variable admin permissions, see: [Variable admin permissions](variable-admin-permissions.html "Variable admin permissions").
- **Granular user permissions**: You can assign granular permissions based on service, container, and object levels within your Celonis Platform team. These levels work on a hierarchy, with the highest level (the service level) overriding any conflicts in either the container or object level.

  To learn more about granular permissions for service, container, and object, see: [Available permissions](available-permissions.html "Available Celonis Platform permissions").

  For service level permissions, see: [Managing Service level permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-81793645-0ab1-37f9-009c-c1c0e99b9234 "Managing Service level permissions").

[## Application and external systems permissions](#UUID-57d77298-e9b2-102c-ddf9-3ff6f599072a_section-idm23451976957078_body)

In addition to individual users, you can also assign and manage permissions for applications and external systems such as identity providers and data sources.

You can assign and manage permissions for applications and external systems in the following ways:

- **OAuth 2.0:** OAuth 2.0 is an industry-standard framework that allows different applications to securely interact with each other on behalf of users without sharing sensitive credentials. To enable this, you can create an OAuth client and then define the scopes assigned to that client. These scopes allow you to manage who or what has access to your Celonis Platform features such as Studio, User Provisioning, and audit logs. This is based on the security principle of least privilege, so that an OAuth client gets only the required privilege to perform a certain task and not more.

  For more information about OAuth 2.0, see: [Using OAuth 2.0](using-oauth-2-0.html "Using OAuth 2.0").
- **Application keys (being deprecated)**: Creating applications enables you to give access and permissions to any applications you create, either within your Celonis Platform team or externally. Once created, an application must be granted the necessary permissions within your Celonis Platform. By default, applications are created without any permissions set.

  For more information about application keys, see: [Application keys](application-keys.html "Creating and granting permissions to application keys").
- **API keys (being deprecated)**: Using API keys is an effective and secure method of communicating between your Celonis Platform and external systems, such as an identity provider. API keys are created within an individual user profile in your Celonis Platform team, with the key’s permissions mirroring those of the user who created them.

  For more information about API keys, see: [API keys](creating-api-keys.html "Creating API keys").


---

## admin/permissions/managing-packages-and-package-permissions

# Managing packages and package permissions

Managing package permissions is important because it provides precise control over how others interact with your work in Studio. Rather than applying a uniform access model, you can tailor security to fit the specific requirements of your team.

Managing these permissions allows you to:

- **Keep your data secure**: You decide exactly who can see or use your work. This keeps your sensitive data models and complex logic safe from unauthorized access.
- **Prevent accidental deletions**: You can let teammates edit and improve assets without giving them the power to delete the entire package. This adds a safety net to your collaborative work.
- **Stay organized with admin controls**: You can reserve big changes - like moving items to the trash or changing access levels - for project leads. This keeps your workspace stable and well-managed.
- **Control the final experience**: You use specific settings to choose who can actually interact with your finished app, ensuring it reaches the right audience at the right time.

Expand all

[## Managing your packages](#UUID-5e1c85ac-2135-956a-553d-d7ae3ee4b9ef_section-id235479024642491_body)

To manage your existing packages:

1. Click **Studio**.
2. Open the Studio space containing the package.
3. Locate the package and click **Options**.

[## Package management options](#UUID-5e1c85ac-2135-956a-553d-d7ae3ee4b9ef_section-id235479044833567_body)

Depending on the permissions you hold, you then have the following package management options:

- **Star / unstar package**: Star or unstar this package to and from the top of your Studio space.

  In this example, *Example Package 1* has been starred within the Studio space.
- **Open in Apps:** This allows you to open the published version of the app you've created. For more information about viewing your apps, see: [Using Apps](using-apps.html "Using Apps").
- **Edit name**: This allows you to rename the package (but keep all existing settings and permissions).
- **Copy to**: This wizard allows you to copy the package (and all assets, settings, and permissions) to other teams or spaces that you hold permissions for. The original package remains in the same location after it is copied.

  **Note**

  When overwriting an existing package, any existing audit logs and execution histories for Action Flows are deleted and can't be recovered.
- **Move to space**: This allows you to move the package (and all assets, settings, and permissions.) to other spaces. The original package no longer remains in the same location after it is moved.
- **Duplicate**: This creates a copy of the package (and all assets, settings, and permissions etc.) within the existing space. When duplicating a package, you are prompted to enter a new package name and key.
- **Move to Trash**: This moves the package to your Trash area, allowing you to recover the package back to its original location or delete it permanently. Items are held in the trash for 180 days from the point of deletion and then automatically deleted permanently with no recovery possible.

  To access your Trash, you need admin permissions to your Studio space.

  |  |
  | --- |
  |  |
- **Permissions**: This allows you to control who or what can view and use this package and its content. For more information, see: [Available package permissions](managing-packages-and-package-permissions.html#UUID-5e1c85ac-2135-956a-553d-d7ae3ee4b9ef_section-idm4556731845972833996402927717 "Available package permissions").
- **Settings**: This allows you to manage the package key, package variables, dependencies, app perspectives, and translations / languages. For more information, see: [Managing package settings.](managing-package-settings.html "Managing package settings")

[## Available package permissions](#UUID-5e1c85ac-2135-956a-553d-d7ae3ee4b9ef_section-idm4556731845972833996402927717_body)

You can assign the following permissions to a Studio package:

- **Use package**: This allows the user to view and use the package within an app.
- **Edit package**: This allows the user to edit the package and any assets contained within that packet. Users are not able to delete the package itself, however.
- **Delete package**: This allows the user to delete the package only. This permission should be combined with the Use and Edit permissions.
- **Manage permissions**: This allows the user to manage the package permissions only. This permission should be combined with the Use and Edit permissions.

## Related topics

- [Asset types](package-asset-types.html "Package asset types")
- [Settings](managing-package-settings.html "Managing package settings")
- [Variables](creating-and-managing-package-variables.html "Creating and managing package variables")


---

## admin/permissions/permission-levels-explained

# Permission levels explained

Celonis Process Management supports several permission levels. Some of them are available as features that need to be activated separately.

Expand all

[## Before you begin](#id860824_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have the Administrator role to activate these features

[## General permissions](#UUID-9882109a-1e38-4f38-fe09-3052c977f24c_general-permissions_body)

- **Show element**: This controls whether an element is visible to a user or not. The element will be shown as a symbol and/or by name if this permission level is granted.
- **Open element**: This controls whether an element can be viewed in detail or not. The element’s content, e.g. properties, diagram content, etc., can be viewed if this permission level is granted.
- **Edit element**: If this permission level is granted, a user can not only view but also edit an *already existing* element’s content, e.g. properties, diagram content, etc.
- **New element**: If this permission level is granted, a user can create new elements.
- **Delete element**: If this permission level is granted, a user can delete existing elements.
- **Approve element**: If this permission level is granted, a user can approve changes to an element.

These permission levels are context-sensitive, e.g. you need to be able to switch into Editor mode (which means you need to have at least the Editor role) utilize granted Edit/New/Delete/Approve permissions, and they only affect non-architectural elements.

To affect architectural elements you either need to be at least assigned to the Architect role, or have the feature Permissions for architectures activated *and* appropriate permission levels assigned (see below).

### Included Permissions

[## Permissions for architectural elements](#UUID-9882109a-1e38-4f38-fe09-3052c977f24c_permissions-for-architectures_body)

These permissions affect architectural elements, e.g. Process House, Sub Categories, Main Processes, Risk Domains, etc.

- **Edit architectural element**: If this permission level is granted, a user can not only view but also edit an *already existing* architectural element’s content, e.g. properties, diagram content, etc.
- **New architectural element**: If this permission level is granted, a user can create new architectural elements.
- **Delete architectural element**: If this permission level is granted, a user can delete existing architectural elements.

### Included Permissions

[## Activating the permissions for architectures feature](#UUID-9882109a-1e38-4f38-fe09-3052c977f24c_activating-the-feature-permissions-for-architectures_body)

1. Go to the Admin area in Celonis Process Management and click **Features**
2. Select **Permissions for architectures** and set it to **Activated**.

*Please note the consequences of activating this feature; read the explanation under “Activation” carefully.*

## Related topics

- [Permissions](permissions.html "Permissions")
- [Creating and assigning permission sets](creating-and-assigning-permission-sets.html "Creating and assigning permission sets")


---

## admin/permissions/permissions

# Permissions

After you have created a Celonis Process Management storage collection and Celonis Process Management storage, you may want to provide or restrict user access to the storage or its contents. For example, you might want to provide access only to specific members of your team, or you might want to provide access to everyone, but restrict editing for some. The easiest way to work with permissions is to create user groups and permission sets, which will help you create fine-grained permissions that suit your specific needs. Permissions in Celonis Process Management are in tight relation to application roles that distinct between different user roles in the system. This document will in detail explain how, both application roles and permissions work together and how permissions cascade through Celonis Process Management object hierarchies.

Expand all

[## Application roles](#UUID-a2fad287-c431-ad29-1273-77774da4176a_application-roles_body)

When creating users in Celonis Process Management it is important that you define application roles for each user. Celonis Process Management supports following application roles:

- Viewer
- Author
- Approver
- Architect
- Administrator

Each application role has rights that are specific for that role and must be considered when working with permissions.

Viewer:

- Has right to navigate process landscape in process portal
- Has right to navigate repository
- Has right to search for content
- Has right to create manual or guide for the organization
- Has right to create link to processes

Author:

- Has right to model sub processes (create sub processes)
- Has right to make sub processes and repositories available for release
- Can modify only processes that he created or processes where he is defined as additional author. Processes which don’t have author defined can also be edited
- Has right to create their own repository objects
- Has right to connect existing repository objects to process

Approver:

- Has right to delegate decision about releasing or rejecting process or object to another person
- Has right to reject the release
- Has right to accept process or repository object to release it

Architect:

- Has right to create processes with Categories and Main Processes
- Has right to create repository objects
- Has right to setup process house
- Has right to modify and create objects with a hierarchical structure (organization, it, guidelines), repository objects with tabular structure (roles, input/output) and global tasks

Administrator:

- Has right to change every process and object in Celonis Process Management
- Has right to administer users, user groups and permission sets
- Has right to administer every aspect of Celonis Process Management configuration

For details about each of these roles please refer to Celonis Process Management Manual.

Application roles work together with permissions which will be in detailed explained in this document.

[## Permission sets](#UUID-a2fad287-c431-ad29-1273-77774da4176a_permission-sets_body)

Permission sets allow you to quickly and easily provide common levels of permissions for one user or group of users. Permission sets define permissions that apply to processes and other elements that use permissions in Celonis Process Management. Available permissions are: New element. Edit element, Show element, Delete element, Open element, Approve element.

Celonis Process Management provides several default permissions sets that can be used for most scenarios. Default permission sets with its permissions are shown in table below:

Some permissions are part of Celonis Process Management application roles functionalities. These special permissions always force their rules as they are defined in application roles. There are two type of rules.

1. Rules that define what is forbidden in Celonis Process Management application – these restrictions cannot be later altered with permissions sets.
2. Rules that define what user can do – this can be additionally altered with permissions sets.

Examples:

1. Application role Author has defined rule that Author role cannot create Categories or Main Processes. This cannot be modified with New Element permissions defined in permission set for user. Application role Author has also rule, that sub process can be created, but this rule can be altered with permissions, if we remove New Element from permission set then, user won’t be able to create Sub process as well.
2. Application role Author has defined rule that he cannot edit processes that other authors created. Adding permission that has Editing permission to the user won’t change this rule that was defined by application role Author.

### Overview permissions and inheritance

When working in Celonis Process Management you deal with lot of different types of objects: Processes (main processes, sub processes, categories), Risks, Organizations, Products, Systems, Documents, Customers, Projects etc. Some of these objects are organized into hierarchies and on top of every hierarchy lays top-level object. These top-level elements are called root objects. For example, top level object of processes hierarchy is Process house. Permissions can be applied to any element in object hierarchy except the root element that should be accessible to all users.

### Inheritance

An important concept to understand is permissions inheritance. By design, all object that exist in process hierarchies inherit the permissions settings of the parent element in hierarchy. When you assign unique permissions to objects that are lower in hierarchy those objects no longer inherit permissions from their parent object. Instead of that they have their own permissions and inheritance can be applied for their children, too.

### Permission sets administration

Administration of Permission sets is in Admin area of Celonis Process Management storage.

Please navigate to Admin panel in right upper corner.

After opening admin panel, you can see all groups that you can administrate. In this case you need Users group. Administration of permissions is done through tree menu items:

1. User
2. Users group
3. Permission sets

Administration of users provide options for creating new or modifying existing Celonis Process Management users. All information for users is entered here: personal data, password, application roles etc.

Administration of user groups provide options for creating new and modifying existing user groups. User groups are used to group users with same permissions to groups, to make administration of permissions easier. User groups are connected to permission sets as well as users, making the connection between them.

Administration of permission sets provide options for creating new and modifying existing permission sets. Selected permissions can be grouped together into permission sets to make administration of permissions easier. After you define permission sets they can be added to users or to user groups.

### Administration of users

Administration of users can be found in administration area of Celonis Process Management storage. If user is logged in as Administrator, and connected to Editor mode, he can access Admin panel in right upper corner.

After opening admin panel, all items for administration are shown. In this case you need to choose Users menu. By choosing Users, administration of Users will be open. All users that are already created are shown in the grid. When User is selected, on the right side, in Detail content, all options that can be changed for that user will be shown.

Very important option for permissions, that can be set for users, is Application roles option. Please refer to user manual for description of other options that are available for users.

To modify User groups and Permission sets of the User, you need to select User in grid and after that you need to click on Change permission button (Change permission button is located in the toolbar), and it will open dialog box for editing permission sets of the user.

In this dialog box permissions sets and user groups are assigned to the selected user. One or more Permission sets can be added to the User, as well as one or more user groups, but User can have no Permission sets, and/or no User groups, as well. One user can be added in more than one user group. Dialog box for administrating User has two options that can be added or changed. Permission Sets and User groups. To add new permission sets, you need to click on permission sets hamburger icon, and new dialog for selecting permission sets will be open.

If permission set assigned to user needs to be removed, user needs to hover over permission until trash can is shown. Clicking on it, system will ask to approve that user want to remove that permission set from user group. After approval, permission set will be removed from the list.

When we add permission sets to a user we define default permission sets for that user. These permission sets are applied on all elements in Celonis Process Management, where no specific rights are applied to elements. It is necessary to have in mind that rights that are assigned by default permissions, additionally can be altered by application roles that are assigned to the user. Permission sets can only limit rights that are assigned by application roles and in no case cannot extend them. One user can have more than one Permission sets. In that case, union of all permissions contained in those permission sets, will be applied to that user. In other words, user will have permissions from all Permissions sets assigned to him.

User can be added to the User group, which will be explained below in Administrating User Group chapter, and User group can be assigned to the User. That can be done using dialog box Change permissions. After clicking on User groups, new dialog box will be opened, and new user group can be assigned to the User, that user will be in that User group. User groups can be removed from the list the same as it is explained for removing permission sets above.

More than one User group can be assigned to the User. That means that one User can be assigned to more different User groups that have different Permission sets. Each User group will give User some specific permissions in the system, and they can, but don’t have to, exclude themselves . In other chapters it will be seen how users can have different permissions depending on membership in User groups.

### Administration of User groups

To edit user group and add or edit Permission sets of the user group, you need to select desired row and clicks on Change permission button. Change permission button is located in the toolbar, and it opens dialog box for editing permission sets of user group.

Dialog box for administrating User group, is similar to dialog box for editing Permission sets with similar options. There are two options that can be added or changed. Permission Sets and Users. To add new permission sets, you need to click on hamburger on the right side of permission sets part, and new dialog for selecting permission sets will be open.

It is possible to navigate to Permission sets list directly from this dialog box, by clicking on the linked name of that Permission set. After clicking on the link, system will open the list of all Permission sets and selected Permission set marked with orange colour. From there you can further administrate Permission sets.

One or more users can be added by selecting hamburger on the right side of Users lookup field. New dialog will be open, and user can be added to current user group.

User groups are used to set special permissions to the object, and that will be explained below in chapter “Permissions on objects”.

### Administration of permission sets

Permission sets can be created, edited or deleted. All permission sets are showed in list when user is logged in as Administrator.

After selecting permission set in list, details of that permission set will be displayed in Detail content on the right side, showing what permission sets are selected. To edit permission set, user needs to select desired permission set, and click on Change permission button, that is in the toolbar, when the new dialog, for editing permission set, will be open.

Here user can select or deselect permission set options.

**New element** – the user will have permission to see, open, create new and edit the element, New element option cannot be selected separately, all Edit element, Show element and Open element will be automatically selected

**Edit element** – the user will have permission to see, open and edit the element. Edit element option can be selected without New Element option, but not without Show and Open element, those selection are done automatically.

**Delete element** – the user will have permission to see, open and delete the element. After selecting Delete element option, Show element and Open element will be automatically selected, and it is not possible to unselect them without unselecting Delete element option as well.

**Show element** – the user will have permission only to see elements, without any details about selected element. If there is no option to see only name of the elements, without showing some details, user will not be able to see anything. This option is always selected when some other option is selected. And it is only option that can be selected by itself.

**Approve element** – the user will have permission to see, open and approve the element. After selecting Approve element option, Show element and Open element will be automatically selected, and it is not possible to unselect them without unselecting Approve element option as well.

**Open element** - the user will have permission to see and open the element. After selecting Open element option, Show element will be automatically selected, and it is not possible to unselect it without unselecting Open element option as well. Open element option is usually used for users that should only see all elements and their details.

After selecting desired option clicking on OK button will save the changes and Cancel button will discard them. For creating new permission set, you enter the name of Permission set and click on button New. New row in grid below will be shown, but without any permission set chosen yet. In the right part, in Detail panel, message is shown that says “Please use the corresponding menu entry in the toolbar to change permissions.”

Procedure for adding new permission sets is the same as editing permission sets, that is explained above. It is also possible to leave Permission set without selecting any options - user can create empty permission set.

Permissions on objects

Permission sets can be assigned to object in every element, as for example category, process, sub process etc.. on all types of object in Celonis Process Management. Selecting desired element for what Permissions should be changed, in toolbar button Change permissions will be shown. After clicking on it, new dialog box will be open, and it will be possible to changes permissions for that selected element.

There are three options that can be set in Change permission of an element.

**Permitted groups** - Here User groups, with specific Permission sets and Users,can be assigned. It can be added more User groups. Users in those groups will have Permissions from that User group, on that selected object.

**Inherit permission from parent** - This option can be selected or deselected. By selecting this option, the inheritance of the current object from its parent is controlled. If a user group is set and this option is set, all users in the user group get the permissions of the user group plus the permissions that would inherit from the parent, i.e. the permissions they would have without any permission setting at the current object. If the option is not set, the users of the user group get *only* the permissions from the permission set of the user group, i.e. the permissions from the parent object have not influence on the current object for the users in the current user group.

**Permission mode** – For this option, one of two options can be chosen. Default option, that is selected when dialog box is opened first time is Exclude users from other user groups. That means that only users from chosen User groups will be able to see selected object. Other option is Standard permissions for other users. If this option is selected, all users (if their rights allow them) will see that object, but only users, from chosen user groups for that object, will have permissions from that are assigned to chosen User group.

[## Role scenarios](#UUID-a2fad287-c431-ad29-1273-77774da4176a_user-scenarios_body)

### Human resources user

In this scenario it will be explained how user groups and permission sets can be used, and how can user groups and permission sets help to hide or show only specific part of the system from specific user or user group. This will be shown on example of Human resources, and how only HR group can see some categories.

Steps:

1. Administrator creates Permission sets “HR permission set”, which has all permission selected. This Permission set will later be added to users and user groups.
2. Administrator create user ‘HR assistant’. User role is Architect. All other attributes that are needed are filled in.
3. Administrator changes permissions on user that he has created. For permission sets he selects Permission set that he created in step one “HR permission set”, and user group will be added after he creates new User group.
4. Administrator creates new User group “HR” from Admin panel. In Change permission dialog box, he chooses for Permission sets permission set that he created in step a. “HR permission set”, and in User part he adds new user “HR assistant” that he created in step b.
5. After he created all necessary steps for using permission sets correctly on object Administrator navigates to Processes and select Category “HR Processes”, where are all processes that are involved with HR team. In toolbar Administrator goes on Changes Permission button.
6. On Change Permission dialog box he chooses User group “HR” for permitted groups, select option for Inheritance and select option “Exclude users from other user groups”.
7. After click on ok button, changes are applied and because Admin user is still logged in, he does not have permission to see HR Processes Category, Category in graphic view is disabled, and all processes inside it are not visible. In Tree view nothing is visible.
8. Next step is to log out as Administrator and log in as new HR user and go in Editor mode. Navigate to processes as HR user. Category for HR Processes is visible and usable. User can see, open, add new and edit all elements, which Admin user couldn’t do after settings permission to HR Category.

Using this example Administrator could create any User group with necessary Permission sets, assign to the group specific Users. Different kinds of group, with different Permission sets could provide to specific users to only they can see and/or modify some parts of system.

### External user

In this scenario it will be explained how user groups and permission sets of the user will provide possibility for some user to just see some specific part of the system. This will be shown on example of External user and how External user can see only specific part of the system.

Steps:

1. Administrator creates Permission sets “External user permission set”, which has none permission selected. This Permission set will later be added to External Users. Administrator then creates new Permission set “Viewer user permissions” which has Open and Show element permission selected. This Permission set will later be added to External User group.
2. Administrator create user ‘External user’. User role is Viewer. All other attributes that are needed are filled in.
3. Administrator changes permissions on user that he has created by selecting on Change permissions button. In dialog box for permission sets he selects Permission set that he created in step one “External user permission set”, and user group will be added after he creates new User group. After this step, if user would logged in, nothing will be shown to the user, only navigation bar. Administrator creates new User group “External” from Admin panel. In Change permission dialog box, he chooses for Permission sets permission set that he created in step a. “Viewer user permissions”, and in User part he adds new user “External user” that he created in step b.
4. After he created all necessary steps for using permission sets correctly on object Administrator navigates to Processes and select Category “External Processes”, where are all processes that External user should have permissions to see and open. In toolbar Administrator goes on Changes Permission button
5. On Change Permission dialog box, he chooses User group “External” for permitted groups, select option for Inheritance and select option “Standard user permissions”.
6. After click on ok button, changes are applied and because Admin user is still logged in, he has permission to see External Processes Category, because Standard user permission has been chosen.
7. After Setting permission to the External processes, Administrator must get Permalink of that category, so he would send direct link to the External user. Permalink icon is located in toolbar of category, or any process. Dialog box for Link creation is opened, and there is a button create link, on what Administrator clicks on, and below new link is created. Next to the link, after Administrator hover on the link, Copy icon is shown. After clicking on the icon, user gets the message that Link is copied to the clip board. Administrator can paste that link directly to the External user or save it in some document.
8. Administrator pasted link to the External user and next step is to log out as Administrator and log in as new External user. External user paste link that he got, from Administrator, in to the browser. After he presses enter button, process category that he is allowed to see and open are loaded. User can see and open, but this user cannot see any other part of the system. Using this example Administrator could create any User group with necessary Permission sets, assign to the group specific Users. Different kinds of group, with different Permission sets could provide to specific users to only they can see and/or modify some parts of system.

### Project user

The user has the application role “Architect” for a certain Project Category or Process, whereas for the remaining Process House, he should only have “Viewer” rights.

Please keep in mind that the user needs a default permission set which restricts the user’s application role:

- Restriction: You need to limit the permissions of the user by assigning a default permission set with View only.
- Extention: Then you need to assign this user to an user group which has architect permissions.

Procedure as follows:

1. Create an user and grant editor application role so that this user is able to modify.
2. Go to Permission Sets and create a Permission Set for Viewer

   - Show Element
   - Open Element
3. Create another permission set for Architects

   - Activate all Permissions
4. Restrict the user permissions by using default permission set(s) for users!

   - Assign Viewer permission set to the user from step 1 -> Now this user cannot modify anything although user has editor application role
5. Extension of restriction:

   - Go to user groups and create an user group which you need for processes/categories
   - Add user from step 1 to this user group
   - Add permission set from step 3 to this user group
6. Allow certain category:

   - Go to processes/categories:
   - Assign user group from step 5 to your certain category -> permission calculation starts
7. Once permission calculation has been completed (after a few minutes), user from step 1 can modify your certain category.

## Related topics

- [Roles](roles.html "Roles")
- [Creating and assigning permission sets](creating-and-assigning-permission-sets.html "Creating and assigning permission sets")


---

## admin/permissions/permissions-directly-on-process-object

# Permissions directly on process/object

By activating this feature, the permissions assignment is made more flexible and comfortable, as permissions are set directly at the permittable process or object. We point out that this feature **Is one way**. Once it is activated, it cannot be deactivated again.

The following picture illustrates the comparison of the standard permission maintenance with the activated extension feature:

|  |
| --- |
|  |

For the general understanding of Celonis Process Management Application roles and Permissions sets, please refer to [Permissions - Introduction](https://developer.celonis.com/symbio-admin-api/administration/permissions/permissions/).

Expand all

[## Before you begin](#id861120_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have the Administrator role to activate this feature

[## Creating permissions for process or object](#UUID-8ec08cbb-b908-129c-b0ec-91b7377ec49a_how-to-maintain-permissions-with-the-extension-feature_body)

### 1. Select process or object

Mark process or object for which permissions are to be assigned.

Choose **Change permissions** in the Toolbar of the Main Content.

### 2. Define inheritance and effect on other users

There are three options to define on which basis the permissions are set up:

- **Inherit from parent**: Permissions of the selected process or object are automatically adopted from the parent element. Further permissions on this element may be added if required.

  Example: A new created Sub Process should inherit the permissions of the higher-level Main Process. Additionally, the permissions of this Sub Process should be differentiated for a new project team (user group) or team member (user).
- **Starting from default permissions**: Permissions are set on the basis of existing permission sets assigned to users or user groups before. If no permission sets have been applied, the Celonis Process Management standard application roles (e.g. Author, Architect) are used.

  Example: The existing permissions (permission sets or application roles) are adopted by default for a new created Sub Process. Additionally, the permissions of this Sub Process should be differentiated for a new project team (user group) or team member (user).
- **Starting without any permissions**: Permissions are designed and granted from scratch. The Celonis Process Management standard application roles will not be considered.

  Example: Any existing permission sets and application roles are not used. The permissions of a new Sub Process are completely redefined; this should be done consistently for all processes and objects.

Regarding the effect on other users, there are two possibilities to set inside the attribute “Permission of other users”:

- **permission set without any permissions**: In this case you may select a permission set without any permissions, see image below; therefore, if the selected process/object is starting without any permissions and you select a permission set without any permissions then other users have no access to the selected process/object.

  Example: A new branch in the process structure should only be available for a newly set up project team (user group). The remaining employees of the company should not have access, not even Viewer rights.

- **no permission sets at all**: In this case you may select a permission set without any permissions, see image below; which means, if the process/object inherits from parent or starting from default permissions the granted permission of other users remains unaffected.

  Example: The permissions of a new branch in the process structure should be differentiated for specific users or user groups. The existing access rights (e.g. Viewer rights) of the remaining employees remain unchanged.

In other words, based on the “Inherit permissions” selection, the Permission of other users is: \* either a limitation of other users permissions if “Inherit from parent” or “Starting from default permissions” is selected, \* or an exact prescription of permissions if “Starting without any permissions” is selected.

### 3. Create specific permission types

Click on **New** to create specific permission types, of course only usable for the selected element. It is recommended to create a specific permission type for each applicable permission set.

In the Detail Content, add corresponding **Permission sets**, **Users** and **User groups** to each permission type.

Finally, confirm with OK.

[## Examples](#UUID-8ec08cbb-b908-129c-b0ec-91b7377ec49a_user-scenarios_body)

### Human resources user

This scenario will show how the access rights of a specific business unit of the company can be specified in detail.

Please proceed as follows:

1. Navigate to **User** tile and create a new HR user, fill in Application role, alternatively create a user group for several HR users.
2. Navigate to **Permission sets** tile and create HR specific permission sets (e.g. “HR Architect”, “HR Author” etc.), defining for each set how elements can be edited.
3. Navigate to **Process House** and set up a new Category or Main Process “HR” (or just select, if existent).
4. Select **Change permissions** in the Toolbar; choose “Inherit from parent” from dropdown and select a permission set without any permissions (please create if not existing).
5. Create new **Permission types**, e.g. “Author permissions”, and go to Detail Content to assign corresponding HR permission set as well as HR user or user group.
6. After click on **OK** button, changes are applied; as the Admin is still logged in, he does not have any permission to see HR Category or Main Process.

### External user

In this scenario it will be explained how users (or user groups) should have limited access to a specific part of the Process House, e.g. a specific project in which external partners are involved. Permissions of the other users should remain unchanged.

Please proceed as follows:

1. Navigate to **User** tile and create a new External user, select “Viewer” as Application role *,* alternatively create an External user group.
2. Navigate to **Permission sets** tile and create an External user-specific permission set, allowing just to open and to show an element.
3. Navigate to **Process House** and set up a new Category “Project XY” (or just select, if existent).
4. Select **Change permissions** in the Toolbar; choose “Inherit from parent” from dropdown and do not select any permissions set at all.
5. Create new **Permission types**, e.g. “External Viewer permissions”, and go to Detail Content to assign corresponding External permission set as well as External user or user group.
6. After click on **OK** button, changes are applied; and because standard permissions remain unchanged, the Admin has full access to Category “Project XY”.
7. Create **Permalink** of Category “Project XY” and send it to External user or user group, who may now open and see Category “Project XY” by click on this link.

## Related topics

- [Permissions](permissions.html "Permissions")
- [Permission levels explained](permission-levels-explained.html "Permission levels explained")


---

## admin/permissions/permissions-for-facets

# Permissions for facets

You can assign permissions to each facet as you would for other elements. These permissions then become the defaults for elements within the facet and are added to the default permissions of the user. In addition to the normal consequences of permissions for elements, the facet is completely hidden if the user does not have the Show permission for the facet, meaning the facet is not visible in the navigation or the detail content of another element.

If you only want to hide a facet in the navigation (e.g. in Viewer mode), but want to grant Show permissions for the elements of the facet, you cannot use the facet permissions for this. For this purpose, you should use the Hide Navigation customization.

Expand all

[## Before you begin](#id861018_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have the Administrator role to use this feature

[## Activating the permissions for facets feature](#UUID-8d0a6bc3-7679-ed49-ee6c-7c3c54f77b19_activating-the-feature-permissions-for-facets_body)

- 1. Go to the Admin area in Process Designer and click the **Features** tile.
  2. Select **Architectural Permissions** and change **Activation** to **Activated**.

*Please note the consequences of activating this feature; read the explanation under “Activation” carefully.*

[## Changing permissions in facet administration](#UUID-8d0a6bc3-7679-ed49-ee6c-7c3c54f77b19_changing-permissions-in-facet-administration_body)

1. Go to the Admin area in Process Designer and click the **Facets** tile.
2. Select facet to change permissions for and open the **Permissions** menu from the toolbar:

*Please note that Permissions menu in the toolbar is deactivated when Feature “Permissions for Facets” is not active.*

After selecting the Permissions menu item, new Permissions dialog will be opened. Permission dialog allows following options for defining permissions.

- Name (shows the name of the selected item for which permissions are defined, in this case selected facet)
- Permitted groups (define what groups will be configured for selected item permissions, the selected item will be showed if user group have at least show permission)
- Inherit permissions ( does not affect permissions for facets)
- Permission modeExclude other users (only users of selected user groups will have access to the selected item)Permissions of other users unchanged (users that are not part of the selected user groups are unaffected by permissions defined here)

[## Examples](#UUID-8d0a6bc3-7679-ed49-ee6c-7c3c54f77b19_examples_body)

### Access to navigation and other elements in facet

Only users from user group OrganizationAccess can access and edit elements from organization facet.

- Selected item: facet Organization
- Permission group: OrganizationAccess with permission set that have Show, Open, New and Delete permissions
- Inherit permissions: not important
- Permission mode: Exclude other users

*In this example only users that are part of user group OrganizationAccess can access menu item that is related to Organization (graphic, hierarchy, document content). Other sub-items in navigation like roles, groups, and locations are facets of their own, so the permissions for them should be done separately. Also for this users Organizations are visible and editable from the other parts of Celonis Process Management such as process diagrams. Other users that are not part of this user group will have no access to Organization facet. Because no permissions are defined on roles, groups and locations, these menu-items will be accessible for other users.*

### Hiding top level navigation items

To completely hide Organization menu item from navigation, all menu sub-items should be also hidden. In this case same permissions should be applied to all Organization, Roles, Groups and Locations facets:

- Selected item: facet Organization, Roles, Groups, Locations
- Permission group: OrganizationAccess with permission set that have Show, Open, New and Delete permissions
- Inherit permissions: not important
- Permission mode: Exclude other users

*In this example all others users not part of the user group OrganizationAccess will not be able to see or access Organizations and other sub-menu items from navigation. Also in other parts of Celonis Process Management organizations will not be visible.*

### Related topics

- [Permission levels explained](permission-levels-explained.html "Permission levels explained")
- [Permissions](permissions.html "Permissions")


---

## admin/permissions/setting-data-permissions-manually-for-users-and-groups

# Setting data permissions manually for users and groups

You can manually set data permissions for users or groups for each data model, providing granular, UI-based control over data access. This method is most suitable for Data Model Managers handling a limited number of users and columns where unique, user-specific assignments are required. It offers an easy overview of an individual's total permissions and allows for immediate modification directly within the interface.

**Note**

For large-scale management of permissions across many users or complex data models, you can also use permission tables to define access. For more information, see [Loading data permissions from permission tables](loading-data-permissions-from-permission-tables.html "Loading data permissions from permission tables").

This page provides best practices and the steps for manually setting up data permissions.

Expand all

[## Before you begin](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_section-id235425007636301_body)

Review the following configuration standards and data constraints to ensure your permission tables function as intended and remain secure.

[### Avoiding permission escalations](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_UUID-8ba540b1-dbeb-56a9-de6f-5611a4aad248_body)

If a user is a member of two groups, the higher permission level will apply to both groups. This means when applying manual permissions for a user, the manually granted permissions **could** supersede a user's overall Celonis Platform permissions.

For example, if a user has limited access to one group and is then given unlimited access to a second group, they will then automatically have unlimited access to both groups.

To set up data permissions involving multiple values or multiple table columns, see: [Understanding data permissions](understanding-data-permissions.html "Understanding data permissions").

[### Configuring permissions on related tables (1:N)](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_UUID-2d30a972-7e0d-1ce1-f935-72e10b330e4c_body)

When defining permissions across tables with a 1:N (One-to-Many) relationship, such as Orders (Parent) to Order Items (Child), it is **highly recommended** to apply the primary permission to the Parent table.

If you apply a permission strictly to a Child table:

- The system filters out any rows that do not have a matching entry in the permission table.
- If a Parent object has no corresponding Child entries, the Parent object may become invisible in Studio views.
- Rows without a join partner are automatically removed when the permission filter cannot find a match.

To ensure Parent objects remain visible even when they have no associated Child entries, always apply the primary permission to the Parent table.

[### Enter values that match your data](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_section-id235492471887069_body)

When manually setting up data permissions, all values entered into the configuration are interpreted as `STRING` data types. Ensure all values entered match the string representation of your data to ensure the permissions are applied correctly.

[### Empty values in permission rules](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_section-id235425029957327_body)

When creating a permission rule, you are able to save **Values** for columns as empty, as shown below:

|  |
| --- |
|  |

However, if you leave **Values** empty, when your data is loaded, **users will not be able to see any within this column**. This also applies if this data table is related to other tables. It is critical that you do not leave the **Values** empty.

[## Configuring data permissions manually](#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_section-id235425014364875_body)

To configure data permissions manually for your data models:

1. Select **Data Models**.

   |  |
   | --- |
   |  |
2. Locate the data model you want to manually set permissions for, and select **Options (⋮) > Data Permissions**.

   |  |
   | --- |
   |  |
3. Select **Add User or Group**, and then add user/group who should have access, and then select **Done**.

   |  |
   | --- |
   |  |
4. For users or groups you've added, decide if they should have unlimited access or whether a rule should be applied for them:

   **Unlimited access**: If selected, users can see all data in all data models that they have access to.

   **Important**

   When applying the **Unlimited access** permission, this setting could supersede a user's overall Celonis Platform permissions. For more information, see [Avoiding permission escalations](setting-data-permissions-manually-for-users-and-groups.html#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_UUID-8ba540b1-dbeb-56a9-de6f-5611a4aad248 "Avoiding permission escalations").

   **Rules**: Select the specific columns from your data tables and whether only individual column values should be available to these users. If adding a rule, select **Save**.

   **Important**

   Ensure all entries in the **Values** field match the string representation of your data to ensure permissions are applied correctly.

   Additionally, ensure you set the **Values** for each column. Leaving a value as empty will result in it not being visible to user. For more information, see [Empty values in permission rules](setting-data-permissions-manually-for-users-and-groups.html#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_section-id235425029957327 "Empty values in permission rules").

   |  |
   | --- |
   |  |
5. To enable the data permissions, select **Use data permissions options**.

   |  |
   | --- |
   |  |

   **Important**

   If you do not select **Use data permissions options**, the permissions will not be applied.

Once you select **Use data permissions options**, the data permissions are now active, without the need to reload your data model.

## Related topics

- [Understanding data permissions](understanding-data-permissions.html "Understanding data permissions")


---

## admin/permissions/skill-permissions

# Skill Permissions

A skill is an integral part of each automation as it defines its procedure by a sequence of events. Skills consist of a sensor that triggers an arbitrary combination of automations, tasks, and alerts, meaning that setting the correct user permissions for them to perform these functions within your studio is important.

When a skill is created, both the creator and the users who have 'use' permissions to that skill can execute its function. This means that you may have to grant additional permissions where necessary. For instance, if you want your users to see tasks created from a Skill, make sure to assign your users permissions for that skill or the package containing that skill.

Skill permissions can be set on three levels:

- Studio - [Setting Studio-level permissions for skills](skill-permissions.html#UUID-4f8b1d27-32b7-11ab-fbdf-98c3e6c081b1_section-idm4505872783705633677885324391 "Setting Studio-level permissions for skills")
- Package - [Setting package level permissions for skills](skill-permissions.html#UUID-4f8b1d27-32b7-11ab-fbdf-98c3e6c081b1_section-idm4615490655798433677885575634 "Setting package level permissions for skills")
- Skill - [Setting skill-level permissions for skills](skill-permissions.html#UUID-4f8b1d27-32b7-11ab-fbdf-98c3e6c081b1_section-idm4610907124864033677885718806 "Setting skill-level permissions for skills")

## Setting Studio-level permissions for skills

This grants the user or group permissions to use all skills available within Studio. To set these permissions:

1. Click **Admin & Settings** and select **Service Permissions**.
2. Click the user or group who needs permissions.
3. Add the Studio permissions.
4. Click **Save**.

The permissions are set and the user can now use all skills within the studo.

## Setting package level permissions for skills

This grants the user or group permissions to use all skills available within an individual package. To set these permissions:

1. From the **Studio**, locate the package and click the options **icon** and then **Permissions**.
2. Locate the user or group who needs permissions and select **Use Package**.
3. Click **Save**.

The permissions are set and the user / group can now use all skills within this individual package.

## Setting skill-level permissions for skills

This grants the user or group permissions to use just this individual skill. To set these permissions.

1. From the **Studio**, locate the skill and click the options **icon** and then **Permissions**.
2. Locate the user or group who needs permissions and select **Use**.
3. Click **Save**.

The permissions are set and the user / group can now use this individual skill.


---

## admin/permissions/studio-service-permissions

# Studio service permissions

With the Studio service, you can assign and manage permissions on a service, container (Space, Package), and object (Action Flow, Analysis, Data Explorer, Knowledge Model, Skill, View.) level.

The context of a user's permissions determines their ability to interact with assets. While Service-level permissions provide broad administrative capabilities, Asset-level permissions ensure that sensitive data within specific Views or Action Flows remains protected, even if a user has access to the broader Space.

Permissions in Studio are hierarchical. The context of a permission is determined by the level at which it is assigned:

- **Service level**: Permissions assigned here (like Create Space) apply across the entire Studio technical service.
- **Container level (Space/Package)**: Permissions assigned at the Space level flow down to all Packages within that Space unless explicitly overridden.
- **Asset level**: The most specific context. This allows for granular control over individual Views, Knowledge Models, or Action Flows.

To understand the content structure in Studio, see: [Workflow and content structure](studio-workflows-and-content-structure.html "Studio workflows and content structure")

Expand all

[## Assigning and managing Studio service permissions](#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497943927536_body)

Celonis Platform team admins and variable admins can assign and manage access to Studio and Studio spaces.

To manage Studio service permissions:

1. Click **Admin & Settings**.
2. Click **Service Permissions**.
3. Click **Assign Permissions**.
4. Select the user or application to assign permissions to and then select the level of permission they should hold.
5. Click **Assign permissions**.

You have the following service permissions available:

### Studio service permissions

Admins can assign and manage the following **Studio** service permissions in the Celonis Platform:

- **Edit all spaces** (Analyst) - The user can only edit existing space names but can create, edit, delete and set permissions for spaces and content they have created unless permissions are removed.
- **Delete all spaces** (Analyst) - The user can create, edit, delete and set permissions to spaces and content they have created, unless permissions are removed. They can't delete other spaces unless this permissions is combined with Edit all Spaces.
- **Create space** (Analyst) - The user can create a new space, package or install from Marketplace. Once the space is created the user can edit, delete and assign permissions to the created space and its contents.
- **Export all** (Analyst) - The user can utilize the exporting functionalities copy-to to export package and asset configurations to other teams (i.e. instances). Copying within the same team (i.e. to another space or package) is still allowed. The user can also utilize the content-cli to export package and asset configuration.
- **Manage permissions** (Analyst) - The user can create, edit, delete and set permissions to spaces and content they have created, unless permissions are removed. They can't manage permissions to other spaces unless this permissions is combined with Edit all Spaces.

[## Assigning and managing Studio space permissions](#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497944547939_body)

You can assign permissions to individual Studio spaces from the space overview page. This allows you to manage the permissions of users or applications who can currently access the Studio service.

If a user or application isn't available to you here, they must first be given access to the Studio service. See: [Assigning and managing Studio service permissions](studio-service-permissions.html#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497943927536 "Assigning and managing Studio service permissions").

To assign and manage Studio space permissions from the space overview page:

1. Click **Options - Permissions**.
2. Either select **Grant All** or apply the individual permissions for the user or application.
3. Click **Save**.

You have the following Studio space permissions available:

### Studio Space permissions

Within the Studio service, you can assign and manage the following Space permissions:

- **Use all packages** (Viewer) - The user can use all content in the granted Space from within Apps. The space content isn't accessible via Studio.
- **Edit Space** (Analyst) - The user can see the name of space they have been granted and can edit the space name.
- **Edit all packages** (Analyst) - The user can create new or edit all packages and assets within the space they have been granted, they can't delete anything.
- **Delete all packages** (Analyst) - The user can only see the Space they have been granted and can't do anything. This permission must be combined with Edit all Packages to work.
- **Delete space** (Analyst) - In Studio, the user can delete the granted space and everything in it, but can't see the content. They can see the content in Apps.
- **Create package** (Analyst) - The user can see the name of the space they have been granted and can create a new package within it. They can't see existing packages. The user can delete and grant permission to packages they have created, unless permissions are removed.
- **Manage permissions** (Analyst) - The user can manage permissions of the space they are granted. They can see all content in Apps.

To assign and manage Studio space permissions from the space overview page, click **Options - Permissions**:

[## Managing Studio package permissions](#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497944805209_body)

You can assign permissions to individual Studio packages from the package overview page. This allows you to manage the permissions of users or applications who can currently access the Studio package.

If a user or application isn't available to you here, they must first be given access to the Studio service. See: [Assigning and managing Studio service permissions](studio-service-permissions.html#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497943927536 "Assigning and managing Studio service permissions").

To assign and manage Studio package permissions:

1. Click **Options - Permissions**.
2. Either select **Grant All** or apply the individual permissions for the user or application.
3. Click **Save**.

You have the following Studio package permissions available:

### Studio package permissions

Within a Studio space, you can assign and manage the following package permissions:

- **Use package** (Viewer) - The user can "use" the package they have been granted in Apps.
- **Edit package** (Analyst) - The user can edit the package and create, edit all assets within the package, they can't delete anything.
- **Delete package** (Analyst) - When checked alone, the user can only see the Space they have been granted and can't do anything. This permission must be combined with Edit Package to work.
- **Manage permissions** (Analyst) - When checked alone, this does nothing other than show the space, with no packages shown. This permission must be combined with Edit Package to work.

To assign and manage Studio package permissions from within a Studio Space, click **Options - Permissions**:

[## Managing Studio package asset permissions (inc. Views)](#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497945042691_body)

You can assign permissions to individual Studio assets from within the Studio package. This allows you to manage the permissions of users or applications who can currently access the individual Studio asset only.

If a user or application isn't available to you here, they must first be given access to the Studio service. See: [Assigning and managing Studio service permissions](studio-service-permissions.html#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_section-id235497943927536 "Assigning and managing Studio service permissions")

To assign and manage Studio asset permissions from within the Studio package:

1. Click **Options - Permissions**.
2. Either select **Grant All** or apply the individual permissions for the user or application.
3. Click **Save**.

You then have the following Studio package asset permissions available:

### Studio package asset permissions

Within Studio packages you can create and manage Studio assets (see: [Asset types](package-asset-types.html "Package asset types"). For each Studio package asset, you can assign and manage the following permissions:

- **Use** (Viewer) - The user can use the view they are granted permissions to. They can also see the package the view is within.

To assign and manage Studio package assets from within the package, click **Options - Permissions**:

## Related topics

- [User and team roles](user-profile.html "User and team roles")
- [Available permissions](available-permissions.html "Available Celonis Platform permissions")
- [Variable admin permissions](variable-admin-permissions.html "Variable admin permissions")


---

## admin/permissions/task-mining-permissions

# Task Mining permissions

The following permission types are available in Task Mining:

- **User and team role**: Overarching and apply across the Celonis Platform.

  - For more information, see [User and team role permissions](https://docs.celonis.com/en/user-and-team-roles-2908081.html).
- **Service**: Applies to all Task Mining projects.

  - Assigned to admin users automatically.
  - Admin users can assign to analyst users.
- **Project**: Assigned for specific Task Mining projects.

  - Assigned to admin users automatically.
  - Admin users can assign to analyst users.

**Important**

Some Task Mining permissions can be assigned at both service and project level. Where this occurs, service permissions take precedence over project permissions. Analyst users who have been assigned service and/or project permissions may also need to be assigned some additional permissions outside Task Mining for some specific Task Mining permission types.

Expand all

[## Before you begin](#id832972_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must have the Admin role to assign permissions to other users in Task Mining.

[## Grant an analyst user permissions to a specific Task Mining project](#UUID-7c86bac8-fb24-1b9a-f1ae-4bae58b4111f_id_TaskMiningPermissions-GrantAnalystUserPermissionstoEditonespecificTaskMiningProject_body)

1. Go to the Task Mining Project Overview.

   |  |
   | --- |
   |  |
2. Click the three dots menu of the Task Mining project you want to grant permissions for and then select **Permissions**.

   |  |
   | --- |
   |  |
3. On the **Permissions** screen, use the check boxes to select the level of edit permissions you want to grant to the Analyst user and then click **Save**.

   |  |
   | --- |
   |  |

   Use the check boxes to also grant the analyst user project-level EDIT DATA CONFIGURATION and EDIT PROJECT CONNECTION permissions. For further information about these permissions and additional permissions outside Task Mining they will also require, see [Task Mining service and project permissions](task-mining-permissions.html#UUID-7c86bac8-fb24-1b9a-f1ae-4bae58b4111f_section-idm234682112424828 "Task Mining service and project permissions").
4. You can also grant Analyst users permission to access the related analyses in the Task Mining project inside business views and to edit inside Studio.

[## Grant an analyst user permissions to all Task Mining projects](#UUID-7c86bac8-fb24-1b9a-f1ae-4bae58b4111f_id_TaskMiningPermissions-GrantAnalystUserPermissionstoEditallTaskMiningProject_body)

1. Go to **Admin & Settings > Service permissions**.
2. Click Task Mining
3. Use the check boxes to also grant the analyst user service-level EDIT DATA CONFIGURATION, EDIT PROJECT CONNECTION and CREATE PROJECT permissions. For further information about these permissions and additional permissions outside Celonis Platform: Task Mining they will also require, see [→ service and project permissions].
4. You can also grant the Analyst users permission to access the related analyses of the Task Mining project inside business views and to edit inside Studio.

[## Grant an analyst user permissions to see screenshots in Studio Views](#UUID-7c86bac8-fb24-1b9a-f1ae-4bae58b4111f_section-idm234413961602896_body)

When you capture screenshots using the Task Mining features, the files are stored in a storage bucket in the Celonis Storage Manager. This means anyone who wants to view these screenshots must be granted permissions for that storage bucket and the File Storage Manager service.

To grant an analyst user permissions to see screenshots in Studio Views:

1. From the Task Mining project the screenshots are captured in, click **Project Connection**.

   |  |
   | --- |
   |  |
2. Click **Go to Storage Manager**.

   You can also directly reach the Storage Manager for your tenant using the following URL format:

   ```
   https://{{domainURL}}/storage-manager/ui/storage
   ```

   |  |
   | --- |
   |  |
3. Locate the Storage Bucket you are using then click the three dots menu and select **Permissions**.

   |  |
   | --- |
   |  |
4. Add the relevant permissions for the user(s).

   - GET and LIST: The user can view screenshots.
   - GET, LIST, and DELETE: The user can view and delete screenshots.

   |  |
   | --- |
   |  |
5. Click **Save**.

[## Task Mining service and project permissions](#UUID-7c86bac8-fb24-1b9a-f1ae-4bae58b4111f_section-idm234682112424828_body)

Filter

- Task Mining permission
- Description
- Service permission
- Project permission

| Task Mining permission | Description | Service permission | Project permission |
| --- | --- | --- | --- |
| EDIT CLIENT SETTINGS | Allows user to view and edit which applications and data are captured. | Yes | Yes |
| EDIT USERS | Allows user to invite, manage and verify users of the Task Mining Client software. | Yes | Yes |
| EDIT DATA CONFIGURATION | Allows user to edit how the Task Mining data is processed as well as labels and task definitions. | Yes | Yes |
| EDIT PROJECT CONNECTION | Allows user to edit the connections used by a Task Mining project. | Yes  Analyst user must also also be assigned:  - Data Integration service permission [VIEW ALL DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - File Storage Manager service permission [GET](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37). | Yes  Analyst user must also also be assigned:  - Data Integration service permission [VIEW ALL DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - File Storage Manager service permission [GET](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37). |
| CREATE PROJECT | Allows user to create Task Mining projects. | Analyst user also requires:  - Data Integration service permission [CREATE DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - Studio service permission: [CREATE SPACE](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a). - Studio service permission [EDIT ALL SPACES](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a).  **Important**  Analyst users creating custom projects also require the Studio Space permission [CREATE PACKAGE](https://docs.celonis.com/en/studio-service-permissions.html#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_UUID-8e298a63-5a3b-4916-f2bc-2b1a1497519f). | No |

| Task Mining permission | Description | Service permission | Project permission |
| --- | --- | --- | --- |
| EDIT CLIENT SETTINGS | Allows user to view and edit which applications and data are captured. | Yes | Yes |
| EDIT USERS | Allows user to invite, manage and verify users of the Task Mining Client software. | Yes | Yes |
| EDIT DATA CONFIGURATION | Allows user to edit how the Task Mining data is processed as well as labels and task definitions. | Yes | Yes |
| EDIT PROJECT CONNECTION | Allows user to edit the connections used by a Task Mining project. | Yes  Analyst user must also also be assigned:  - Data Integration service permission [VIEW ALL DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - File Storage Manager service permission [GET](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37). | Yes  Analyst user must also also be assigned:  - Data Integration service permission [VIEW ALL DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - File Storage Manager service permission [GET](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-98df5d47-6be8-7fab-813b-22783c53ff37). |
| CREATE PROJECT | Allows user to create Task Mining projects. | Analyst user also requires:  - Data Integration service permission [CREATE DATA POOLS](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3bd3a09b-6070-9501-7a2e-e0c522753b04). - Studio service permission: [CREATE SPACE](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a). - Studio service permission [EDIT ALL SPACES](https://docs.celonis.com/en/available-celonis-platform-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-8cb1e0ea-86a9-a90e-19af-3a968ccf3f1a).  **Important**  Analyst users creating custom projects also require the Studio Space permission [CREATE PACKAGE](https://docs.celonis.com/en/studio-service-permissions.html#UUID-21ab100f-8fa9-7993-4679-4202d4c01467_UUID-8e298a63-5a3b-4916-f2bc-2b1a1497519f). | No |

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects")
- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")


---

## admin/permissions/understanding-data-permissions

# Understanding data permissions

Data permissions allow you to define granular access by specifying the tables, columns, and values a user or group can view within your data pool. You can apply these permissions to individual tables, specific combinations, or provide unlimited access to the entire data model.

**Important**

Granting a group unlimited permissions **can supersede an individual user's default data access**. If a user is a member of two groups, the **higher permission level applies to both groups**. For example, if a user has **limited access** in one group and is given **unlimited access** in a second group, they will automatically have **unlimited access within both groups**.

By default, a permission limits access to the specific data within that individual table. However, these permissions are not isolated, and if a table is part of a Parent-to-Child (1:N) relationship, the permission automatically cascades the filter to all associated child records.

**Note**

Depending on your use case, see the corresponding **Configuring permissions on related tables (1:N)** section on either [Loading data permissions from permission tables](loading-data-permissions-from-permission-tables.html#UUID-68abcba7-4a7a-486c-b519-9178190308ca_UUID-2d30a972-7e0d-1ce1-f935-72e10b330e4c "Configuring permissions on related tables (1:N)") or [Setting data permissions manually for users and groups](setting-data-permissions-manually-for-users-and-groups.html#UUID-fd9e0d51-53eb-21d9-352e-e4ea0c159863_UUID-2d30a972-7e0d-1ce1-f935-72e10b330e4c "Configuring permissions on related tables (1:N)") for more information.

To demonstrate these concepts, the following examples use a Parent-to-Child relationship between the **Purchase Orders** table (linked to company codes) and the **Purchase Order Items** table (linked to material codes). These tables are joined by the **po\_number** column in a **1:N (One-to-Many)** relationship, extending the reach of the permission table defined in each example across both tables (permission cascading).

Table 8. Purchase Orders – Data Example

| po\_number | company\_code |
| --- | --- |
| p1 | c1 |
| p2 | c1 |
| p3 | c2 |
| p4 | c2 |
| p5 | c2 |




In the **Purchase Orders** table, you can see a **po\_number** column, which represents the order number, and the **company\_code** column, which represents the company associated with each order.

Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1

Table 9. Purchase Order Items – Data Example

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |
| p3 | i1 | m2 | no |
| p4 | i1 | m4 | no |
| p4 | i2 | m5 | no |
| p4 | i3 | m6 | no |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |
| p5 | i2 | m3 | no |

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |
| p3 | i1 | m2 | no |
| p4 | i1 | m4 | no |
| p4 | i2 | m5 | no |
| p4 | i3 | m6 | no |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |
| p5 | i2 | m3 | no |




The **Purchase Order Items** table also includes the **po\_number** column and the additional **po\_item**, **material\_number**, and **c1\_or\_m1** columns. The **c1\_or\_m1** column contains the value `yes` if the **company\_code** is `c1`, the **material\_number** is `m1`, or both.

Expand all

[## Case 1: Permission for a single value in a single table column](#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm1645040079190342_body)

The most limited permission scope gives users access to data filtered by a specific table, column, and value. In the following permission table, the user `test-user@celonis.com` is given permission to see data from the **Purchase Orders** table if the `company_code` column has a value of `c1`:

Filter

- User\_Mail
- Table\_Name
- Column\_Name
- Value

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | company\_code | c1 |

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | company\_code | c1 |

Because of permission cascading, this filter on the Parent table (Purchase Orders) automatically restricts the user's view of the Child table (Purchase Order Items) to only those items belonging to company `c1`. This also means all other purchase orders and their associated items in the Child table are restricted.

With this data permission, the user is granted access to the following data:

**Note**

If the `purchase_orders` table had no associated child tables, the user's access would be limited strictly to the records shown in the **Purchase Orders - Case 1** table.

Table 10. Purchase Orders - Case 1 (Filtered)

| po\_number | company\_code |
| --- | --- |
| p1 | c1 |
| p2 | c1 |




To understand the results in the child table below, note that the **c1\_or\_m1** column serves as a logic flag. For this example, assume records marked with `yes` are associated with company `c1` to satisfy the parent-level permission.

Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1

Table 11. Purchase Order Items - Case 1 (Filtered)

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |

[## Case 2: Permission for multiple values in a single table column (OR condition)](#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm16410080158380682_body)

When you specify multiple values for a single column, permissions are combined into a logical `OR` condition. This is processed as an `IN` list (for example, `FILTER table.column IN (val1, val2)`). Under this logic, a user can see any record that matches at least one of the specified values.

In a permission table, these are defined as multiple rows for the same user. In this example, the user `test-user@celonis.com` is granted permission to see entries in the **Purchase Order Items** table that involve either material `m1` or material `m6`:

Filter

- User\_Mail
- Table\_Name
- Column\_Name
- Value

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m6 |

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m6 |

With this configuration, the engine restricts the **Purchase Order Items** table to the permitted materials. Because of the relational link, the **Purchase Orders** (Parent) table is also filtered; the user only sees orders that contain at least one permitted item.

With this data permission, the user is granted access to the following data:

Table 12. Purchase Orders - Case 2 (Filtered)

| po\_number | company\_code |
| --- | --- |
| p1 | c1 |
| p4 | c2 |
| p5 | c2 |




Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1

Table 13. Purchase Order Items - Case 2 (Filtered)

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p4 | i3 | m6 | no |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p4 | i3 | m6 | no |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |




**Note**

Notice that while orders `p4` and `p5` contain restricted materials (such as `m5` as seen in the [Data Example](understanding-data-permissions.html#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_table-idm1643360052793562 "Table 9. Purchase Order Items – Data Example") table), they remain visible because they also contain at least one permitted material (`m1` or `m6`).

[## Case 3: Permission for multiple columns in a single table (cross-column AND condition)](#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-intra-table-and_body)

When you specify permissions for **multiple columns** within the same table, the engine combines them using a logical `AND` condition. This is a restrictive configuration where the user can only view rows that satisfy all criteria simultaneously.

In this example, the user `test-user@celonis.com` is granted permission to see items in the **Purchase Order Items** table only where the `po_number` is `p4` **AND** the `material_number` is `m1`:

Filter

- User\_Mail
- Table\_Name
- Column\_Name
- Value

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_order\_items | po\_number | p4 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_order\_items | po\_number | p4 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |

Using the reference data, the permissions are evaluated against each row using both conditions:

Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1 (Flag)

Table 14. Purchase Order Items - Case 3 (Comparison)

| po\_number | po\_item | material\_number | c1\_or\_m1 (Flag) |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| **p4** | **i4** | **m1** | **yes** |
| p4 | i3 | m6 | no |

| po\_number | po\_item | material\_number | c1\_or\_m1 (Flag) |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| **p4** | **i4** | **m1** | **yes** |
| p4 | i3 | m6 | no |




With this configuration, the user can only access the middle row (item `i4` of order `p4`). The other rows fail to meet **both** conditions and would be excluded. For instance, items from order `p1` would be excluded because the order number is not `p4`, and item `i3` would be excluded because it lacks the material `m1` (as seen in the [Data Example](understanding-data-permissions.html#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_table-idm1643360052793562 "Table 9. Purchase Order Items – Data Example") table).

[## Case 4: Permissions for multiple values across multiple tables (cross-table AND condition)](#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm16416800263967802_body)

Permissions can also be enforced that span multiple columns across different tables. When permissions are defined for more than one table or column, they are combined using a logical `AND` condition. This means a user can only view data that satisfies the criteria in **all** specified permissions.

In this example, the user `test-user@celonis.com` is granted permission to see data only when the **Purchase Orders** (Parent) match company `c1` **AND** the **Purchase Order Items** (Child) involve either material `m1` or material `m6`:

Filter

- User\_Mail
- Table\_Name
- Column\_Name
- Value

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | company\_code | c1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m6 |

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | company\_code | c1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m1 |
| test-user@celonis.com | purchase\_order\_items | material\_number | m6 |

Because of the **cross-table AND** logic, this permission filters out any material (including `m1` or `m6`) if it belongs to a company **other than** `c1`. Likewise, it filters out company `c1` records if they do not contain the specified materials (`m1` or `m6`).

With this data permission, the user is granted access to the following data:

Table 15. Purchase Orders - Case 4 (Filtered)

| po\_number | company\_code |
| --- | --- |
| p1 | c1 |




Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1

Table 16. Purchase Order Items - Case 4 (Filtered)

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |




**Note**

Notice that while orders `p4` and `p5` contain material `m1`, they are now excluded because they belong to company `c2` (as seen in the [Data Example](understanding-data-permissions.html#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_table-idm1641680026396782 "Table 8. Purchase Orders – Data Example") table), which fails the first permission rule.

[## Case 5: Permissions for complex OR conditions (flag logic)](#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm16425200395951702_body)

Standard permission configurations combine different columns using `AND` logic (as seen in [Case 4](understanding-data-permissions.html#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm16416800263967802 "Case 4: Permissions for multiple values across multiple tables (cross-table AND condition)")). However, you may need a user to see records matching criteria from **either** one column **or** another; for example, they may need access to orders for company `c1` **OR** all items involving material `m1`.

**Note**

By default, permissions are combined using **AND** logic when evaluating multiple columns or tables. If you require an **OR** condition across different columns or tables, you must consolidate that logic into a single flag column within your Data Model as demonstrated in this case.

To achieve this cross-column `OR` logic, you must add a "flag" column to your Data Model. In our reference data, the column `c1_or_m1` serves this purpose. This column is pre-calculated to contain the value `yes` if the record matches company code `c1`, material number `m1`, or both.

In the permission table, you then grant access based solely on this flag column. This allows the complex logic to be handled by the Data Model while keeping the permission rule simple:

Filter

- User\_Mail
- Table\_Name
- Column\_Name
- Value

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | c1\_or\_m1 | yes |

| User\_Mail | Table\_Name | Column\_Name | Value |
| --- | --- | --- | --- |
| test-user@celonis.com | purchase\_orders | c1\_or\_m1 | yes |

By filtering on this single flag, the permission table grants the user access to every purchase order and item connected to either company `c1` or material `m1`:

Table 17. Purchase Orders - Case 5 (Filtered)

| po\_number | company\_code |
| --- | --- |
| p1 | c1 |
| p2 | c1 |
| p4 | c2 |
| p5 | c2 |




Filter

- po\_number
- po\_item
- material\_number
- c1\_or\_m1

Table 18. Purchase Order Items - Case 5 (Filtered)

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |

| po\_number | po\_item | material\_number | c1\_or\_m1 |
| --- | --- | --- | --- |
| p1 | i1 | m1 | yes |
| p1 | i2 | m2 | yes |
| p2 | i1 | m3 | yes |
| p4 | i4 | m1 | yes |
| p5 | i1 | m1 | yes |




**Note**

Notice that unlike [Case 4](understanding-data-permissions.html#UUID-09715fe0-ecc4-8f4b-45cb-7820fdbe7687_section-idm16416800263967802 "Case 4: Permissions for multiple values across multiple tables (cross-table AND condition)"), orders `p4` and `p5` are visible here even though they belong to company `c2`. This is because they satisfy the `OR` condition by containing material `m1`.

## Related topics

- [Loading data permissions from permission tables](loading-data-permissions-from-permission-tables.html "Loading data permissions from permission tables")
- [Setting data permissions manually for users and groups](setting-data-permissions-manually-for-users-and-groups.html "Setting data permissions manually for users and groups")


---

## admin/permissions/variable-admin-permissions

# Variable admin permissions

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

By default, a user with team admin permissions has access to all features and settings within your Celonis Platform. Admins can manage users, edit team security settings, and update service permissions. However you may want to enable some users to only perform a selection of those admin roles, such as managing users or content only. To achieve this, you can assign variable admin permissions to users and groups within your Celonis Platform team who currently don't hold global admin permissions.

In this example, one user has full admin permissions whereas another has been granted variable admin permissions for the service permissions, users, and groups only:

A user with full admin permissions:

A user with variable admin permissions:

**Note**

Managing individual permissions requires the **Manage** service permission. Advanced **Restricted** permissions are available only to true Admins or variable admins with this permission.

See: [Configuring resource permissions / advanced permission settings](variable-admin-permissions.html#UUID-08fe6995-d242-151a-5e14-258edbce00b4_section-id235466781488346 "Configuring resource permissions / advanced permission settings").

Expand all

[## Assigning variable admin permissions per service](#UUID-08fe6995-d242-151a-5e14-258edbce00b4_section-id235378677124296_body)

To assign variable admin permissions to team members who currently have member or analyst permissions:

1. Click **Admin & Settings - Users**, opening the user management screen.
2. Click the name of the team member who should be granted variable admin permissions.

   |  |
   | --- |
   |  |
3. Select the **Admin & Settings** service.

   |  |
   | --- |
   |  |
4. Click **Manage** for each admin permission you want the user to hold.

   For example: Groups, service permissions, and users (matching those from the earlier example).

   |  |
   | --- |
   |  |
5. Click **Save**.

The user permissions have been updated and are now applied to the relevant user.

[## Configuring resource permissions / advanced permission settings](#UUID-08fe6995-d242-151a-5e14-258edbce00b4_section-id235466781488346_body)

To ensure secure access control, the **Advanced Permission Settings** provide a toggle between standard and restricted management modes, determining whether permission assignment is open to resource managers or limited to system administrators.

To configure who can change permissions on resources in your team:

1. Click **Admin & Settings - Service permissions**.
2. Click **Advanced Settings**.
3. Configure who can change permissions on resources in the platform (Packages, Data Pools, Notebooks etc.).

   - **Standard**: Users with "Manage" rights at any level (e.g., Data Pools or Studio Packages) can assign usage permissions to others.
   - **Restricted**: Only Admins or users with "Manage" Service permissions (Variable Admins) can assign usage permissions to others.
4. Click **Save**.

[## Enabling variable admin preferences](#UUID-08fe6995-d242-151a-5e14-258edbce00b4_section-idm234420570652619_body)

In addition to assigning admin permissions, you can also set your variable admin preferences for your team. These preferences allow full team admins to further control what the abilities of the variable admins within their team.

To set your variable admin preferences:

1. Click **Admin & Settings**.
2. Scroll down to the **Admin configuration** section.
3. Manage which preferences to assign to your variable admins:

   By default, the following permissions are enabled:

   - **CSV download for variable admins**: This allows them to download CSV copies of audit logs, user groups, user login histories, and user permissions.
   - **Invite users, create groups, and create application keys**.

   |  |
   | --- |
   |  |

   When preferences are disabled, any existing users holding variable admin permissions will lose access to the relevant admin features.

## Related topics

- [User and team roles](user-profile.html "User and team roles")
- [Available permissions](available-permissions.html "Available Celonis Platform permissions")
- [Managing existing users](managing-existing-users.html "Managing existing users")


---

