# Admin: Audit Logs

## admin/audit-logs/action-flows-audit-logs

# Audit logs for Action Flows

**Caution**

Be aware that if you use the [Copy to](managing-packages-and-package-permissions.html "Managing packages and package permissions") functionality in Studio, the auditlogs and execution history of any Action Flows in the destination package are completely deleted and cannot be recovered. The auditlogs and execution history in the original package are not touched.

In the Celonis Platform, you can request a CSV file of your Action Flow execution logs. You can choose to download all your Action Flow execution logs or you can filter by time period, associated applications or for specific Action Flows, as well as whether or not to include the input/output bundles of all single Action executions in the download.

Audit logs are useful for the following reasons:

- **Security and accountability**: Use logs as a "black box" to monitor User role changes, track IP addresses when enabled, and identify unauthorized access or system setting modifications.
- **Compliance and data governance**: Meet legal requirements by automatically deleting audit logs according to company retention policies and ensuring data is handled per internal standards.
- **Automated troubleshooting and debugging**: Investigate business-critical processes by requesting Action Flow execution logs and reviewing the history of automation successes and failures.
- **Operational transparency and reporting**: Maintain a "source of truth" for team activity by exporting logs as CSV for audits and identifying when users might need additional training.

Expand all

[## Downloading audit logs for Action Flows](#UUID-fe379223-3a88-b773-2093-20fbb29b2c75_section-id235475460776044_body)

**Note**

You can request a maximum of two downloads every 10 minutes.

To download your audit logs for Action Flows:

1. In the Celonis Platform, go to **Admin & Settings** and then click "Audit Logs" in the Admin section.
2. On the Audit Logs screen, click the blue **Download** button in the upper right and select "Download Action Flow Execution Logs (.csv)" from the dropdown.

   |  |
   | --- |
   |  |
3. In the **Download Execution Logs** window, use the radio buttons to select a time range of logs you want to download.

   |  |
   | --- |
   |  |
4. Use the optional **Select App(s)** and **Select Action Flow(s)** filters to only download event logs associated with specific applications or Action Flows.
5. Toggle the **Include input/output bundles** switch to on if you want to include the input/output bundles of all single Action executions in the download.
6. Once finished, click the **Download** button. You will receive a notification that the request has been submitted and showing your selected parameters.

   |  |
   | --- |
   |  |
7. Once your download is ready, you will receive an email with a link to the file. The download file will be in .zip format, containing CSV files for logs in the main folder and the input/output bundles in a separate folder (if selected).

   **Note**

   The CSV files of event logs may be split to keep the size of the files more consumable.

[## Execution logs for individual clusters](#UUID-fe379223-3a88-b773-2093-20fbb29b2c75_section-idm4593672068974434253720771863_body)

Execution logs for Action Flows are recorded from the moment this feature is released on individual clusters:

- au-1 (July 23, 2023)
- ca-1 (September 12, 2023)
- eu-1 (July 23, 2023)
- eu-2 (July 23, 2023)
- eu-3 (July 23, 2023)
- eu-4 (July 23, 2023)
- eu-5 (July 24, 2023)
- jp-1 (July 23, 2023)
- uk-1 (July 23, 2023)
- us-1 (July 23, 2023)
- us-2 (April 29, 2023)
- us-3 (July 23, 2023)

These logs are stored for 12 months.

[## Attributes included in the event log files](#UUID-fe379223-3a88-b773-2093-20fbb29b2c75_section-idm4562539538708833698472588024_body)

| Attribute | Description |
| --- | --- |
| AFlow ID | References the ID of the Action Flow that was executed. |
| Execution ID | ID number of a specific execution. |
| Execution Type | Available values:  - Manual - Instant - Scheduled |
| Execution Author | Name of the user who started the automation by using the Run Once button (in this case, the Execution Type would be "Manual" or "Instant", depending on the first module), or by using a connected Action Button (in this case, the Execution Type would be "Scheduled"). |
| Module ID | ID of the module used in the execution. |
| Operation | Operation index |
| Cycle | Cycle index |
| App | App name and its label (where applicable) |
| Module | Module name and its label (where applicable) |
| App Version | Version of the app used in the execution. |
| Start Timestamp | Provided in the UTC standard. |
| End Timestamp | Provided in the UTC standard. |
| Status | Available values:  - Successful - Error |
| Error | The error message with which the execution failed. |
| Connection | `{id} ({metadata <where applicable>} - {name})`, for SAP the `{metadata}` would be the SAP username for connections created in May 2023 or later. |
| Target System | The server targeted by the execution module. |
| Target API | The target API. For example, for SAP this would be the RFM name such as `BAPI_SALESORDER_CHANGE`. |
| Agent ID | The agent ID in the Action Flow. |
| System Connection | Contains the system connection configuration identifiers provided in the cloud, value is {id} ({name}). |
| IO Bundle file names | Location of the files from the Input/Output bundles for that execution. |

The Input/Output CSV file contains the following attributes:

**Important**

The downloaded data is identical to the data visible in the Action Flow history. This also means that if the [Data is confidential](https://docs.celonis.com/en/settings-panel.html#UUID-71148feb-ac3f-a501-f7d0-a32160370380_id_Settingspanel-Dataisconfidential) setting of an Action Flow is activated, no input/output bundles will be available.

| Attribute | Description |
| --- | --- |
| Execution ID | ID number of a specific execution. |
| Module ID | ID of the module used in the execution. |
| Operation | Operation index |
| Cycle | Cycle index |
| Page | The page to which the output belongs. |
| Total Pages | The total number of pages that the output bundles had when there are multiple bundles for a single module, for example, Get Rows. |
| Error | Boolean flag showing whether the bundle belonged to a failed execution. |
| Input | Boolean flag showing whether it is an input or an output bundle. |
| Value | Content of the bundle. |

## Related topics

- [Audit logs - Event details](audit-logs---event-details.html "Audit logs - Event details")
- [Action Flows](action-flows.html "Action Flows in Celonis Platform")
- [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")


---

## admin/audit-logs/action-flows-audit-logs-1972259

# Audit logs for Action Flows

**Caution**

Be aware that if you use the [Copy to](managing-packages-and-package-permissions.html "Managing packages and package permissions") functionality in Studio, the auditlogs and execution history of any Action Flows in the destination package are completely deleted and cannot be recovered. The auditlogs and execution history in the original package are not touched.

In the Celonis Platform, you can request a CSV file of your Action Flow execution logs. You can choose to download all your Action Flow execution logs or you can filter by time period, associated applications or for specific Action Flows, as well as whether or not to include the input/output bundles of all single Action executions in the download.

Audit logs are useful for the following reasons:

- **Security and accountability**: Use logs as a "black box" to monitor User role changes, track IP addresses when enabled, and identify unauthorized access or system setting modifications.
- **Compliance and data governance**: Meet legal requirements by automatically deleting audit logs according to company retention policies and ensuring data is handled per internal standards.
- **Automated troubleshooting and debugging**: Investigate business-critical processes by requesting Action Flow execution logs and reviewing the history of automation successes and failures.
- **Operational transparency and reporting**: Maintain a "source of truth" for team activity by exporting logs as CSV for audits and identifying when users might need additional training.

Expand all

[## Downloading audit logs for Action Flows](#UUID-c3c76d18-9071-6d7f-a458-32c9239d62b8_section-id235475460776044_body)

**Note**

You can request a maximum of two downloads every 10 minutes.

To download your audit logs for Action Flows:

1. In the Celonis Platform, go to **Admin & Settings** and then click "Audit Logs" in the Admin section.
2. On the Audit Logs screen, click the blue **Download** button in the upper right and select "Download Action Flow Execution Logs (.csv)" from the dropdown.

   |  |
   | --- |
   |  |
3. In the **Download Execution Logs** window, use the radio buttons to select a time range of logs you want to download.

   |  |
   | --- |
   |  |
4. Use the optional **Select App(s)** and **Select Action Flow(s)** filters to only download event logs associated with specific applications or Action Flows.
5. Toggle the **Include input/output bundles** switch to on if you want to include the input/output bundles of all single Action executions in the download.
6. Once finished, click the **Download** button. You will receive a notification that the request has been submitted and showing your selected parameters.

   |  |
   | --- |
   |  |
7. Once your download is ready, you will receive an email with a link to the file. The download file will be in .zip format, containing CSV files for logs in the main folder and the input/output bundles in a separate folder (if selected).

   **Note**

   The CSV files of event logs may be split to keep the size of the files more consumable.

[## Execution logs for individual clusters](#UUID-c3c76d18-9071-6d7f-a458-32c9239d62b8_section-idm4593672068974434253720771863_body)

Execution logs for Action Flows are recorded from the moment this feature is released on individual clusters:

- au-1 (July 23, 2023)
- ca-1 (September 12, 2023)
- eu-1 (July 23, 2023)
- eu-2 (July 23, 2023)
- eu-3 (July 23, 2023)
- eu-4 (July 23, 2023)
- eu-5 (July 24, 2023)
- jp-1 (July 23, 2023)
- uk-1 (July 23, 2023)
- us-1 (July 23, 2023)
- us-2 (April 29, 2023)
- us-3 (July 23, 2023)

These logs are stored for 12 months.

[## Attributes included in the event log files](#UUID-c3c76d18-9071-6d7f-a458-32c9239d62b8_section-idm4562539538708833698472588024_body)

| Attribute | Description |
| --- | --- |
| AFlow ID | References the ID of the Action Flow that was executed. |
| Execution ID | ID number of a specific execution. |
| Execution Type | Available values:  - Manual - Instant - Scheduled |
| Execution Author | Name of the user who started the automation by using the Run Once button (in this case, the Execution Type would be "Manual" or "Instant", depending on the first module), or by using a connected Action Button (in this case, the Execution Type would be "Scheduled"). |
| Module ID | ID of the module used in the execution. |
| Operation | Operation index |
| Cycle | Cycle index |
| App | App name and its label (where applicable) |
| Module | Module name and its label (where applicable) |
| App Version | Version of the app used in the execution. |
| Start Timestamp | Provided in the UTC standard. |
| End Timestamp | Provided in the UTC standard. |
| Status | Available values:  - Successful - Error |
| Error | The error message with which the execution failed. |
| Connection | `{id} ({metadata <where applicable>} - {name})`, for SAP the `{metadata}` would be the SAP username for connections created in May 2023 or later. |
| Target System | The server targeted by the execution module. |
| Target API | The target API. For example, for SAP this would be the RFM name such as `BAPI_SALESORDER_CHANGE`. |
| Agent ID | The agent ID in the Action Flow. |
| System Connection | Contains the system connection configuration identifiers provided in the cloud, value is {id} ({name}). |
| IO Bundle file names | Location of the files from the Input/Output bundles for that execution. |

The Input/Output CSV file contains the following attributes:

**Important**

The downloaded data is identical to the data visible in the Action Flow history. This also means that if the [Data is confidential](https://docs.celonis.com/en/settings-panel.html#UUID-71148feb-ac3f-a501-f7d0-a32160370380_id_Settingspanel-Dataisconfidential) setting of an Action Flow is activated, no input/output bundles will be available.

| Attribute | Description |
| --- | --- |
| Execution ID | ID number of a specific execution. |
| Module ID | ID of the module used in the execution. |
| Operation | Operation index |
| Cycle | Cycle index |
| Page | The page to which the output belongs. |
| Total Pages | The total number of pages that the output bundles had when there are multiple bundles for a single module, for example, Get Rows. |
| Error | Boolean flag showing whether the bundle belonged to a failed execution. |
| Input | Boolean flag showing whether it is an input or an output bundle. |
| Value | Content of the bundle. |

## Related topics

- [Audit logs - Event details](audit-logs---event-details.html "Audit logs - Event details")
- [Action Flows](action-flows.html "Action Flows in Celonis Platform")
- [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")


---

## admin/audit-logs/audit-logs---event-details

# Audit logs - Event details

Audit logs provide detailed insights into event activity in your Celonis Platform team.

For information on how to access and download audit logs for see [Audit logs](viewing-your-audit-logs.html "Viewing your audit logs"). Here are all the events you might see in your audit logs.

Expand all

[## Action Engine events](#UUID-44c6e5ba-7fc0-c8d8-2dd8-1e13c05b49de_section-id235319843368012_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Action Engine | EXPORT\_PARQUET\_DISCLAIMER\_AGREEMENT\_DELETED | The agreement to allow exporting data to parquet files has been withdrawn. |
| EXPORT\_PARQUET\_DISCLAIMER\_AGREEMENT\_SIGNED | The agreement to export data to parquet files has been given (required for Action Engine Connector). |
| ROUTING\_RULE\_CREATED | A new routing rule has been created. |
| ROUTING\_RULE\_DELETED | A routing rule has been deleted. |
| ROUTING\_RULE\_DUPLICATED | An existing routing rule has been duplicated. |
| ROUTING\_RULE\_UPDATED | An existing routing rule has been updated. |
| SKILL\_CREATED | A new skill has been created. |
| SKILL\_DELETED | A skill has been deleted. |
| SKILL\_DUPLICATED | An existing skill has been duplicated. |
| SKILL\_INSTALLED | A new skill has been installed. |
| SKILL\_UPDATED | An existing skill has been updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Action Engine | EXPORT\_PARQUET\_DISCLAIMER\_AGREEMENT\_DELETED | The agreement to allow exporting data to parquet files has been withdrawn. |
| EXPORT\_PARQUET\_DISCLAIMER\_AGREEMENT\_SIGNED | The agreement to export data to parquet files has been given (required for Action Engine Connector). |
| ROUTING\_RULE\_CREATED | A new routing rule has been created. |
| ROUTING\_RULE\_DELETED | A routing rule has been deleted. |
| ROUTING\_RULE\_DUPLICATED | An existing routing rule has been duplicated. |
| ROUTING\_RULE\_UPDATED | An existing routing rule has been updated. |
| SKILL\_CREATED | A new skill has been created. |
| SKILL\_DELETED | A skill has been deleted. |
| SKILL\_DUPLICATED | An existing skill has been duplicated. |
| SKILL\_INSTALLED | A new skill has been installed. |
| SKILL\_UPDATED | An existing skill has been updated. |

[## Action flow events](#UUID-44c6e5ba-7fc0-c8d8-2dd8-1e13c05b49de_section-id235319846747975_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Action Flows | ACTIONFLOW\_ACTIVATED | Logged when an action flow is enabled/activated and contains:  - Base message with extra properties. - Type - the type of the schedule, for example, indefinitely, once, or yearly. - Interval - the interval between executions, has a value assigned only when the type is indefinitely. |
| ACTIONFLOW\_CREATED | Logged when an action flow is created, contains:  - Base message. - Diff payload with newValue set. |
| ACTIONFLOW\_DEACTIVATED | Logged when an action flow is disabled/deactivated and contains:  - When deactivated manually (by a user), contains Base message. - When deactivated automatically (by the engine), contains base message with extra properties: - Reason - describing invalidation/deactivation reason. - Max\_errors\_count - describing the maximum amount of errors allowed. |
| ACTIONFLOW\_DRAFT\_BLUEPRINT\_MODIFIED | Logged when an action flows’ draft configuration is modified, contains:  - Base message. - Diff payload with oldValue and newValue set. |
| ACTIONFLOW\_SCHEDULE\_MODIFIED | Logged when an Action Flows’ schedule is modified, contains:  - Base message with extra properties. - Type - the type of the schedule, for example, indefinitely, once, or yearly. - Interval - the interval between executions, has a value assigned only when the type is indefinitely. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Action Flows | ACTIONFLOW\_ACTIVATED | Logged when an action flow is enabled/activated and contains:  - Base message with extra properties. - Type - the type of the schedule, for example, indefinitely, once, or yearly. - Interval - the interval between executions, has a value assigned only when the type is indefinitely. |
| ACTIONFLOW\_CREATED | Logged when an action flow is created, contains:  - Base message. - Diff payload with newValue set. |
| ACTIONFLOW\_DEACTIVATED | Logged when an action flow is disabled/deactivated and contains:  - When deactivated manually (by a user), contains Base message. - When deactivated automatically (by the engine), contains base message with extra properties: - Reason - describing invalidation/deactivation reason. - Max\_errors\_count - describing the maximum amount of errors allowed. |
| ACTIONFLOW\_DRAFT\_BLUEPRINT\_MODIFIED | Logged when an action flows’ draft configuration is modified, contains:  - Base message. - Diff payload with oldValue and newValue set. |
| ACTIONFLOW\_SCHEDULE\_MODIFIED | Logged when an Action Flows’ schedule is modified, contains:  - Base message with extra properties. - Type - the type of the schedule, for example, indefinitely, once, or yearly. - Interval - the interval between executions, has a value assigned only when the type is indefinitely. |

[## Admin & Settings events](#id478579_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Admin and Settings | ADMIN USER INVITED | An Admin gets invited from the backend into the team. |
| AGENT\_PACKAGE\_CREATED | On-Prem client has been created. | |
| AGENT\_PACKAGE\_DELETED | On-Prem client has been deleted. | |
| AGENT\_PACKAGE\_UPDATED | On-Prem client has been updated. | |
| APC\_THRESHOLD\_NOTIFICATION\_UPDATED | The APC threshold notification has been updated. | |
| APPLICATION\_KEY\_CREATED | A user created a new application key. |
| APPLICATION\_KEY\_DELETED | A user deleted an application key. |
| APPLICATION\_KEY\_UPDATED | The application key was updated. |
| APPLICATION\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Applications**.  **Note**  A message is not included with the event. |
| AUDIT\_LOG\_CSV\_DOWNLOADED | A user downloaded the Audit Log CSV. |
| AUDIT\_LOGS\_DELETED | Audit logs deletion feature was configured and the logs were deleted. |
| AUDIT\_LOG\_PREFERENCES\_UPDATED | A user enabled or disabled the logging of IP address.  A user enabled or disabled Days to delete with qty of days stated. |
| GROUP\_CREATED | A group was created. |
| GROUP\_DELETED | A group was deleted. |
| GROUP\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Groups**.  **Note**  A message is not included with the event. |
| GROUP\_UPDATED | A group was updated. |
| IP\_RESTRICTIONS\_RESET | IP restrictions were reset. |
| IP\_RESTRICTIONS\_SET | IP restrictions were set. |
| LLM\_CLOUD\_PROVIDER\_ENABLED | Enable a cloud provider such as Azure or AWS. |
| LLM\_CLOUD\_PROVIDER\_DISABLED | Disable a cloud provider such as Azure or AWS |
| LLM\_CONFIGURATION\_CREATED | Configuration has been created (such as for an Annotation Builder or a Process Copilot) and provided access to the LLM. |
| LLM\_CONFIGURATION\_DELETED | Configuration has been deleted. |
| LLM\_CONFIGURATION\_DISABLED | Configuration has been disabled. |
| LLM\_CONFIGURATION\_ENABLED | Configuration has been enabled. |
| LLM\_CONFIGURATION\_UPDATED | Configuration has been updated. |
| LLM\_EXTERNAL\_CREDENTIALS\_CREATED | Credentials for an external LLM have been created. |
| LLM\_EXTERNAL\_CREDENTIALS\_DELETED | Credentials for an external LLM have been deleted. |
| LLM\_KILL\_SWITCH\_DISABLED | Disable requests to the LLMs which disables all AI functionality. |
| LLM\_KILL\_SWITCH\_ENABLED | Enable requests to the LLMs which enables all AI functionality. |
| LLM\_MODEL\_DISABLED | Models have been disabled. |
| LLM\_MODEL\_ENABLED | Models have been enabled. |
| LOGIN\_HISTORY\_CSV\_DOWNLOADED | A user downloaded the Login History CSV. |
| LOGIN\_HISTORY\_DELETED | Login history delete option was selected when turning off the login history. |
| LOGIN\_HISTORY\_PREFERENCES\_UPDATED | A user enabled or disabled the logging of IP address.  A user enabled or disabled Days to delete with qty of days stated. |
| MEMBER\_LOCK\_POLICY\_UPDATED | Locking policy enabled and or updated.  Locking policy user notification enabled and or updated. |
| OAUTH\_CLIENT\_CREATED | OAuth client has been created. |
| OAUTH\_CLIENT\_UPDATED | Oauth client client has been updated. |
| OAUTH\_CLIENT\_DELETED | OAuth client has been deleted. |
| OAUTH\_CLIENT\_SECRET\_REGENERATED | A user regenerated the client secret for an OAuth client. |
| OAUTH\_CLIENT\_ACCESS\_REVOKED | A user revoked consent for an OAuth client. |
| OPEN\_SIGNUP\_UPDATED | A user enabled or disabled Open Sign up and the default group name. |
| PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Permissions**.  **Note**  A message is not included with the event. |
| PERMISSIONS\_UPDATE | A user has updated Celonis Platform permissions. The message will show the subject description, the subject type, and the object description before explaining the new vs. old permission. |
| SCIM\_UPDATED | Enable or Disable SCIM toggle from Admin & Settings. |
| SESSION\_TIMEOUT\_PREFERENCES\_UPDATED | Session timeout settings have been updated. |
| SSO\_PROVIDER\_CREATED | A user created the SSO provider. |
| SSO\_PROVIDER\_DELETED | A user deleted the SSO provider. |
| SSO\_PROVIDER\_TOGGLED | SSO provider changed. |
| SSO\_PROVIDER\_UPDATED | An admin has changed the SSO settings. |
| STUDIO\_ADOPTION\_CSV\_DOWNLOADED | A user downloaded the studio adoption CSV from **Admin and Settings > Platform Adoption > Studio**.  **Note**  A message is not included with the event. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_DISABLED | One of the notification toggles has been disabled. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_ENABLES | One of the notification toggles has been enabled. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_UPDATED | Recipients have been updated in for one of the notifications in Admin & Settings. |
| TEAM\_DELETED | The team was deleted. |
| TEAM\_MEMBERSHIP\_CREATED | A user was invited to the team. |
| TEAM\_MEMBERSHIP\_DELETED | A user was removed from a team. |
| TEAM\_MEMBERSHIP\_UPDATED | A new role was applied to a user.  The user was locked (Inactive).  The user was unlocked (Active) |
| TEAM\_MEMBERSHIP\_WITH\_NO\_CONFIRMATION\_CREATED | A user was invited with no confirmation. |
| TEAM\_UPDATED | Team-specific changes were applied, like changes to the team's privacy. |
| TRACKING\_EVENT\_DELETED | A user has deleted all data records from the Studio tracking service |
| TWO\_FACTOR\_UPDATED | A user updated two factor: enabled or disabled. |
| TWO\_FACTOR\_UPDATED | A user updated two-factor channel: SMS or EMAIL. |
| UPLINK\_CREATED | An uplink connection was created. |
| UPLINK\_DELETED | An uplink connection was deleted. |
| UPLINK\_UPDATED | An uplink connection was updated. |
| USER\_ADOPTION\_PREFERENCE\_CHANGED | **Note**  Only if available in Admin and Settings. Feature toggled on [enabled] and off [disabled]. |
| USER\_CHANGE\_PASSWORD | A user changed their password. |
| USER\_DELETE\_API\_KEY | A user deleted an API key. |
| USER\_GENERATE\_API\_KEY | A user generated an API key. |
| USER\_GROUPS\_CSV\_DOWNLOADED | A user downloaded the CSV files with a list of users, their roles and Groups they are part of. |
| USER\_JOIN\_GROUP | A user joined a group or was added to it. |
| USER\_LEFT\_GROUP | A user quit a group or was removed from it. |
| USER\_NAME\_UPDATED | A user changed their profile name from and to. |
| VARIABLE\_PREFERENCES\_UPDATED | Preferences for the variable admin have been update. |
| USER\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Users**. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED | A user activated his team membership. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED\_LINK\_GENERATED | A membership link has been generated, allowing the user to access the team. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED\_LINK\_GENERATED | A membership link has been generated, allowing the user to access the team. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Admin and Settings | ADMIN USER INVITED | An Admin gets invited from the backend into the team. |
| AGENT\_PACKAGE\_CREATED | On-Prem client has been created. | |
| AGENT\_PACKAGE\_DELETED | On-Prem client has been deleted. | |
| AGENT\_PACKAGE\_UPDATED | On-Prem client has been updated. | |
| APC\_THRESHOLD\_NOTIFICATION\_UPDATED | The APC threshold notification has been updated. | |
| APPLICATION\_KEY\_CREATED | A user created a new application key. |
| APPLICATION\_KEY\_DELETED | A user deleted an application key. |
| APPLICATION\_KEY\_UPDATED | The application key was updated. |
| APPLICATION\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Applications**.  **Note**  A message is not included with the event. |
| AUDIT\_LOG\_CSV\_DOWNLOADED | A user downloaded the Audit Log CSV. |
| AUDIT\_LOGS\_DELETED | Audit logs deletion feature was configured and the logs were deleted. |
| AUDIT\_LOG\_PREFERENCES\_UPDATED | A user enabled or disabled the logging of IP address.  A user enabled or disabled Days to delete with qty of days stated. |
| GROUP\_CREATED | A group was created. |
| GROUP\_DELETED | A group was deleted. |
| GROUP\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Groups**.  **Note**  A message is not included with the event. |
| GROUP\_UPDATED | A group was updated. |
| IP\_RESTRICTIONS\_RESET | IP restrictions were reset. |
| IP\_RESTRICTIONS\_SET | IP restrictions were set. |
| LLM\_CLOUD\_PROVIDER\_ENABLED | Enable a cloud provider such as Azure or AWS. |
| LLM\_CLOUD\_PROVIDER\_DISABLED | Disable a cloud provider such as Azure or AWS |
| LLM\_CONFIGURATION\_CREATED | Configuration has been created (such as for an Annotation Builder or a Process Copilot) and provided access to the LLM. |
| LLM\_CONFIGURATION\_DELETED | Configuration has been deleted. |
| LLM\_CONFIGURATION\_DISABLED | Configuration has been disabled. |
| LLM\_CONFIGURATION\_ENABLED | Configuration has been enabled. |
| LLM\_CONFIGURATION\_UPDATED | Configuration has been updated. |
| LLM\_EXTERNAL\_CREDENTIALS\_CREATED | Credentials for an external LLM have been created. |
| LLM\_EXTERNAL\_CREDENTIALS\_DELETED | Credentials for an external LLM have been deleted. |
| LLM\_KILL\_SWITCH\_DISABLED | Disable requests to the LLMs which disables all AI functionality. |
| LLM\_KILL\_SWITCH\_ENABLED | Enable requests to the LLMs which enables all AI functionality. |
| LLM\_MODEL\_DISABLED | Models have been disabled. |
| LLM\_MODEL\_ENABLED | Models have been enabled. |
| LOGIN\_HISTORY\_CSV\_DOWNLOADED | A user downloaded the Login History CSV. |
| LOGIN\_HISTORY\_DELETED | Login history delete option was selected when turning off the login history. |
| LOGIN\_HISTORY\_PREFERENCES\_UPDATED | A user enabled or disabled the logging of IP address.  A user enabled or disabled Days to delete with qty of days stated. |
| MEMBER\_LOCK\_POLICY\_UPDATED | Locking policy enabled and or updated.  Locking policy user notification enabled and or updated. |
| OAUTH\_CLIENT\_CREATED | OAuth client has been created. |
| OAUTH\_CLIENT\_UPDATED | Oauth client client has been updated. |
| OAUTH\_CLIENT\_DELETED | OAuth client has been deleted. |
| OAUTH\_CLIENT\_SECRET\_REGENERATED | A user regenerated the client secret for an OAuth client. |
| OAUTH\_CLIENT\_ACCESS\_REVOKED | A user revoked consent for an OAuth client. |
| OPEN\_SIGNUP\_UPDATED | A user enabled or disabled Open Sign up and the default group name. |
| PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Permissions**.  **Note**  A message is not included with the event. |
| PERMISSIONS\_UPDATE | A user has updated Celonis Platform permissions. The message will show the subject description, the subject type, and the object description before explaining the new vs. old permission. |
| SCIM\_UPDATED | Enable or Disable SCIM toggle from Admin & Settings. |
| SESSION\_TIMEOUT\_PREFERENCES\_UPDATED | Session timeout settings have been updated. |
| SSO\_PROVIDER\_CREATED | A user created the SSO provider. |
| SSO\_PROVIDER\_DELETED | A user deleted the SSO provider. |
| SSO\_PROVIDER\_TOGGLED | SSO provider changed. |
| SSO\_PROVIDER\_UPDATED | An admin has changed the SSO settings. |
| STUDIO\_ADOPTION\_CSV\_DOWNLOADED | A user downloaded the studio adoption CSV from **Admin and Settings > Platform Adoption > Studio**.  **Note**  A message is not included with the event. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_DISABLED | One of the notification toggles has been disabled. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_ENABLES | One of the notification toggles has been enabled. |
| TEAM\_ADMIN\_EVENT\_NOTIFICATION\_UPDATED | Recipients have been updated in for one of the notifications in Admin & Settings. |
| TEAM\_DELETED | The team was deleted. |
| TEAM\_MEMBERSHIP\_CREATED | A user was invited to the team. |
| TEAM\_MEMBERSHIP\_DELETED | A user was removed from a team. |
| TEAM\_MEMBERSHIP\_UPDATED | A new role was applied to a user.  The user was locked (Inactive).  The user was unlocked (Active) |
| TEAM\_MEMBERSHIP\_WITH\_NO\_CONFIRMATION\_CREATED | A user was invited with no confirmation. |
| TEAM\_UPDATED | Team-specific changes were applied, like changes to the team's privacy. |
| TRACKING\_EVENT\_DELETED | A user has deleted all data records from the Studio tracking service |
| TWO\_FACTOR\_UPDATED | A user updated two factor: enabled or disabled. |
| TWO\_FACTOR\_UPDATED | A user updated two-factor channel: SMS or EMAIL. |
| UPLINK\_CREATED | An uplink connection was created. |
| UPLINK\_DELETED | An uplink connection was deleted. |
| UPLINK\_UPDATED | An uplink connection was updated. |
| USER\_ADOPTION\_PREFERENCE\_CHANGED | **Note**  Only if available in Admin and Settings. Feature toggled on [enabled] and off [disabled]. |
| USER\_CHANGE\_PASSWORD | A user changed their password. |
| USER\_DELETE\_API\_KEY | A user deleted an API key. |
| USER\_GENERATE\_API\_KEY | A user generated an API key. |
| USER\_GROUPS\_CSV\_DOWNLOADED | A user downloaded the CSV files with a list of users, their roles and Groups they are part of. |
| USER\_JOIN\_GROUP | A user joined a group or was added to it. |
| USER\_LEFT\_GROUP | A user quit a group or was removed from it. |
| USER\_NAME\_UPDATED | A user changed their profile name from and to. |
| VARIABLE\_PREFERENCES\_UPDATED | Preferences for the variable admin have been update. |
| USER\_PERMISSIONS\_CSV\_DOWNLOADED | A user downloaded the permissions CSV from **Admin and Settings > Users**. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED | A user activated his team membership. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED\_LINK\_GENERATED | A membership link has been generated, allowing the user to access the team. |
| USER\_TEAM\_MEMBERSHIP\_ACTIVATED\_LINK\_GENERATED | A membership link has been generated, allowing the user to access the team. |

[## Business Miner events](#id479006_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Business Miner | PROCESS\_WORKSPACE\_NODE\_UPDATED | A Business Miner node (Process Workspace or Exploration) has been updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Business Miner | PROCESS\_WORKSPACE\_NODE\_UPDATED | A Business Miner node (Process Workspace or Exploration) has been updated. |

[## Data Integration events](#id479027_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Data Integration | ANALYSIS\_EXPORT\_AUDIT\_LOG\_EVENT | Data integration audit log has been exported. |
| CUSTOM\_EXTRACTION\_EXECUTED | Added when a custom extraction is executed. |
| CUSTOM\_EXTRACTION\_METADATA\_EXECUTED | Added when a metadata query for a custom extraction is executed. |
| CUSTOM\_EXTRACTION\_PREVIEW\_EXECUTED | Added when a preview query for a custom extraction is executed. |
| DATA\_JOB\_CREATED | A data job has been created. |
| DATA\_JOB\_DELETED | A data job has been deleted. |
| DATA\_MODEL\_CREATED | A data model has been created. |
| DATA\_MODEL\_DELETED | A data model has been deleted. |
| DATA\_MODEL\_UPDATED | A data model has been renamed. |
| DATA\_POOL\_CONNECTION\_CONFIGURATION\_UPDATED | The data pool connection was updated. |
| DATA\_POOL\_CREATED | A data pool has been created. |
| DATA\_POOL\_DELETED | A data pool has been deleted. |
| DATA\_POOL\_EXPORTED | A data pool has been exported. |
| DATA\_POOL\_OUTBOUND\_SHARE\_CREATED | Outbound share aws created on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_DELETED | Outbound share was deleted on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_UPDATED | Outbound share was updated on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_SCHEMAS\_UPDATED | Shared schemas and/or tables were updated on the outbound share. |
| DATA\_POOL\_OUTBOUND\_SHARE\_CREDENTIALS\_UPDATED | Credentials were created or updated on the outbound share. |
| DATA\_POOL\_UPDATED | A data pool has been renamed. |
| DATA\_SOURCE\_CREATED | A data connection has been created. |
| DATA\_SOURCE\_DELETED | A data connection has been deleted. |
| DATA\_SOURCE\_EXPORTED | A data source was shared with other data pools in the same team. |
| DATA\_SOURCE\_IMPORTED | A shared data source was imported into a target data pool. |
| PROCESS\_INSTALLED | A process has been installed from the Marketplace. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Data Integration | ANALYSIS\_EXPORT\_AUDIT\_LOG\_EVENT | Data integration audit log has been exported. |
| CUSTOM\_EXTRACTION\_EXECUTED | Added when a custom extraction is executed. |
| CUSTOM\_EXTRACTION\_METADATA\_EXECUTED | Added when a metadata query for a custom extraction is executed. |
| CUSTOM\_EXTRACTION\_PREVIEW\_EXECUTED | Added when a preview query for a custom extraction is executed. |
| DATA\_JOB\_CREATED | A data job has been created. |
| DATA\_JOB\_DELETED | A data job has been deleted. |
| DATA\_MODEL\_CREATED | A data model has been created. |
| DATA\_MODEL\_DELETED | A data model has been deleted. |
| DATA\_MODEL\_UPDATED | A data model has been renamed. |
| DATA\_POOL\_CONNECTION\_CONFIGURATION\_UPDATED | The data pool connection was updated. |
| DATA\_POOL\_CREATED | A data pool has been created. |
| DATA\_POOL\_DELETED | A data pool has been deleted. |
| DATA\_POOL\_EXPORTED | A data pool has been exported. |
| DATA\_POOL\_OUTBOUND\_SHARE\_CREATED | Outbound share aws created on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_DELETED | Outbound share was deleted on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_UPDATED | Outbound share was updated on the data pool. |
| DATA\_POOL\_OUTBOUND\_SHARE\_SCHEMAS\_UPDATED | Shared schemas and/or tables were updated on the outbound share. |
| DATA\_POOL\_OUTBOUND\_SHARE\_CREDENTIALS\_UPDATED | Credentials were created or updated on the outbound share. |
| DATA\_POOL\_UPDATED | A data pool has been renamed. |
| DATA\_SOURCE\_CREATED | A data connection has been created. |
| DATA\_SOURCE\_DELETED | A data connection has been deleted. |
| DATA\_SOURCE\_EXPORTED | A data source was shared with other data pools in the same team. |
| DATA\_SOURCE\_IMPORTED | A shared data source was imported into a target data pool. |
| PROCESS\_INSTALLED | A process has been installed from the Marketplace. |

[## Extensive Data Integration Audit Logs](#UUID-44c6e5ba-7fc0-c8d8-2dd8-1e13c05b49de_section-idm4535276305027233653863554187_body)

**Note**

This feature is not currently available by default for all teams. If you want to use the feature that is not enabled, please reach out to the support team through the support portal.

For customers that have the extensive audit logging for Data Integration enabled, the following events are captured as well:

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Data Integration | DATA\_JOB\_ALERT\_DISABLED | A data job alert was deleted |
| DATA\_JOB\_ALERT\_ENABLED | A data job alert was enabled to trigger on events such as failures, successes, skips and execution time. |
| DATA\_JOB\_ALERT\_UPDATED | A data job alert was updated |
| DATA\_JOB\_COPIED | A data job has been copied |
| DATA\_JOB\_DUPLICATED | A data job has been duplicated. |
| DATA\_JOB\_MANUALLY\_CANCELED | A data job execution has been canceled manually. |
| DATA\_JOB\_MANUALLY\_EXECUTED | A data job execution has been triggered manually. |
| DATA\_JOB\_UPDATED | A data job got updated, e.g. renamed. |
| DATA\_MODEL\_ACTIVITY\_OR\_CASE\_TABLE\_CHANGED | The data model activity table or case table configuration changed. |
| DATA\_MODEL\_CALENDAR\_DISABLED | The calendar option for a data model got enabled. |
| DATA\_MODEL\_CUSTOM\_CALENDAR\_ENABLED | A custom calendar has been enabled for a data model. |
| DATA\_MODEL\_CUSTOM\_CALENDAR\_SAVED | A custom calendar has been saved for a data model. |
| DATA\_MODEL\_DUPLICATED | A data model has been duplicated. |
| DATA\_MODEL\_FACTORY\_CALENDAR\_ENABLED | A factory calendar has been enabled for a data model. |
| DATA\_MODEL\_FACTORY\_CALENDAR\_SAVED | A factory calendar has been saved for a data model. |
| DATA\_MODEL\_FOREIGN\_KEY\_CREATED | A foreign key in the data model has been created. |
| DATA\_MODEL\_FOREIGN\_KEY\_DELETED | A foreign key in the data model has been deleted. |
| DATA\_MODEL\_FOREIGN\_KEY\_UPDATED | A foreign key in the data model has been changed. |
| DATA\_MODEL\_LOAD\_MANUALLY\_CANCELED | A data model load has been canceled manually. |
| DATA\_MODEL\_MANUAL\_LOAD\_STARTED | A manual data model load has been triggered. |
| DATA\_MODEL\_NAME\_MAPPINGS\_DELETED | A name mapping has been deleted. |
| DATA\_MODEL\_NAME\_MAPPINGS\_LOADED | A name mapping has been loaded. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_CREATED | A manual data permission assignment rule has been created. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_DELETED | A manual data permission assignment rule has been deleted. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_UPDATED | A manual data permission assignment rule has been changed. |
| DATA\_MODEL\_PERMISSION\_DISABLED | The data permissions have been disabled for one data model. |
| DATA\_MODEL\_PERMISSION\_ENABLED | The data permissions have been enabled for one data model. |
| DATA\_MODEL\_PERMISSION\_TABLE\_APPLIED | A data model permission table has been applied. |
| DATA\_MODEL\_PERMISSION\_TABLE\_DELETED | A data model permission table has been deleted. |
| DATA\_MODEL\_SIGNAL\_LINK\_CREATED | A signal link has been created. |
| DATA\_MODEL\_TABLE\_DELETED | A data model table has been deleted. |
| DATA\_MODEL\_TABLES\_CREATED | Table(s) have been added to the data model. |
| DATA\_POOL\_COPIED | A data pool has been copied. |
| DATA\_POOL\_VERSION\_COPIED | A version was copied. |
| DATA\_POOL\_VERSION\_CREATED | A version was created for a data pool. |
| DATA\_POOL\_VERSION\_DELETED | A version was deleted for a data pool. |
| DATA\_SOURCE\_DUPLICATED | A data connection has been duplicated. |
| DATA\_SOURCE\_UPDATED | A data connection got updated, e.g. renamed. |
| EXTRACTION\_CONFIGURATIONS\_UPDATED | An extraction configuration has been changed. |
| FILE\_UPLOAD\_CREATED | A file upload took place. |
| FILE\_UPLOAD\_HISTORY\_ENTRY\_DELETED | A history entry for a former file upload got deleted. |
| JOB\_SCHEDULING\_CREATED | A data job has been assigned to a schedule. |
| JOB\_SCHEDULING\_DELETED | A data job has been removed from a schedule. |
| JOB\_SCHEDULING\_EXECUTION\_ORDER\_CHANGED | The data job execution order within a schedule has been changed. |
| PARAMETER\_CREATED | A parameter has been created. |
| PARAMETER\_DELETED | A parameter has been deleted. |
| PARAMETER\_UPDATED | A parameter got updated. |
| SCHEDULING\_CANCELLED | A schedule has been canceled manually. |
| SCHEDULING\_CREATED | A schedule has been created. |
| SCHEDULING\_DELETED | A schedule has been deleted. |
| SCHEDULING\_DISABLED | A schedule has been disabled. |
| SCHEDULING\_ENABLED | A schedule has been enabled. |
| SCHEDULING\_FREQUENCY\_CHANGED | A schedule's frequency has been changed. |
| SCHEDULING\_MANUALLY\_EXECUTED | A schedule has been executed manually. |
| SCHEDULING\_MODE\_CHANGED | A schedule' mode (Full vs Delta) has been changed. |
| SCHEDULING\_MONITORING\_DISABLED | Monitoring has been disabled on a data job. |
| SCHEDULING\_MONITORING\_ENABLED | Monitoring has been enabled on a data job. |
| SCHEDULING\_RENAMED | A schedule has been renamed. |
| TASK\_CREATED | A task, i.e., transformation or extraction, has been created. |
| TASK\_DELETED | A task, i.e., transformation or extraction, has been deleted. |
| TASK\_DISABLED | A task, i.e., transformation or extraction, has been disabled. |
| TASK\_ENABLED | A task, i.e., transformation or extraction, has been enabled. |
| TASK\_NAME\_OR\_DESCRIPTION\_UPDATED | A task's name or description has been changed, i.e., transformation or extraction. |
| TASK\_ORDER\_CHANGED | The task order, i.e., the order of transformations and extractions, has been changed. |
| TRANSFORMATION\_CODE\_CHANGED | A transformation statement (SQL code) has been changed. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Data Integration | DATA\_JOB\_ALERT\_DISABLED | A data job alert was deleted |
| DATA\_JOB\_ALERT\_ENABLED | A data job alert was enabled to trigger on events such as failures, successes, skips and execution time. |
| DATA\_JOB\_ALERT\_UPDATED | A data job alert was updated |
| DATA\_JOB\_COPIED | A data job has been copied |
| DATA\_JOB\_DUPLICATED | A data job has been duplicated. |
| DATA\_JOB\_MANUALLY\_CANCELED | A data job execution has been canceled manually. |
| DATA\_JOB\_MANUALLY\_EXECUTED | A data job execution has been triggered manually. |
| DATA\_JOB\_UPDATED | A data job got updated, e.g. renamed. |
| DATA\_MODEL\_ACTIVITY\_OR\_CASE\_TABLE\_CHANGED | The data model activity table or case table configuration changed. |
| DATA\_MODEL\_CALENDAR\_DISABLED | The calendar option for a data model got enabled. |
| DATA\_MODEL\_CUSTOM\_CALENDAR\_ENABLED | A custom calendar has been enabled for a data model. |
| DATA\_MODEL\_CUSTOM\_CALENDAR\_SAVED | A custom calendar has been saved for a data model. |
| DATA\_MODEL\_DUPLICATED | A data model has been duplicated. |
| DATA\_MODEL\_FACTORY\_CALENDAR\_ENABLED | A factory calendar has been enabled for a data model. |
| DATA\_MODEL\_FACTORY\_CALENDAR\_SAVED | A factory calendar has been saved for a data model. |
| DATA\_MODEL\_FOREIGN\_KEY\_CREATED | A foreign key in the data model has been created. |
| DATA\_MODEL\_FOREIGN\_KEY\_DELETED | A foreign key in the data model has been deleted. |
| DATA\_MODEL\_FOREIGN\_KEY\_UPDATED | A foreign key in the data model has been changed. |
| DATA\_MODEL\_LOAD\_MANUALLY\_CANCELED | A data model load has been canceled manually. |
| DATA\_MODEL\_MANUAL\_LOAD\_STARTED | A manual data model load has been triggered. |
| DATA\_MODEL\_NAME\_MAPPINGS\_DELETED | A name mapping has been deleted. |
| DATA\_MODEL\_NAME\_MAPPINGS\_LOADED | A name mapping has been loaded. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_CREATED | A manual data permission assignment rule has been created. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_DELETED | A manual data permission assignment rule has been deleted. |
| DATA\_MODEL\_PERMISSION\_ASSIGNMENT\_UPDATED | A manual data permission assignment rule has been changed. |
| DATA\_MODEL\_PERMISSION\_DISABLED | The data permissions have been disabled for one data model. |
| DATA\_MODEL\_PERMISSION\_ENABLED | The data permissions have been enabled for one data model. |
| DATA\_MODEL\_PERMISSION\_TABLE\_APPLIED | A data model permission table has been applied. |
| DATA\_MODEL\_PERMISSION\_TABLE\_DELETED | A data model permission table has been deleted. |
| DATA\_MODEL\_SIGNAL\_LINK\_CREATED | A signal link has been created. |
| DATA\_MODEL\_TABLE\_DELETED | A data model table has been deleted. |
| DATA\_MODEL\_TABLES\_CREATED | Table(s) have been added to the data model. |
| DATA\_POOL\_COPIED | A data pool has been copied. |
| DATA\_POOL\_VERSION\_COPIED | A version was copied. |
| DATA\_POOL\_VERSION\_CREATED | A version was created for a data pool. |
| DATA\_POOL\_VERSION\_DELETED | A version was deleted for a data pool. |
| DATA\_SOURCE\_DUPLICATED | A data connection has been duplicated. |
| DATA\_SOURCE\_UPDATED | A data connection got updated, e.g. renamed. |
| EXTRACTION\_CONFIGURATIONS\_UPDATED | An extraction configuration has been changed. |
| FILE\_UPLOAD\_CREATED | A file upload took place. |
| FILE\_UPLOAD\_HISTORY\_ENTRY\_DELETED | A history entry for a former file upload got deleted. |
| JOB\_SCHEDULING\_CREATED | A data job has been assigned to a schedule. |
| JOB\_SCHEDULING\_DELETED | A data job has been removed from a schedule. |
| JOB\_SCHEDULING\_EXECUTION\_ORDER\_CHANGED | The data job execution order within a schedule has been changed. |
| PARAMETER\_CREATED | A parameter has been created. |
| PARAMETER\_DELETED | A parameter has been deleted. |
| PARAMETER\_UPDATED | A parameter got updated. |
| SCHEDULING\_CANCELLED | A schedule has been canceled manually. |
| SCHEDULING\_CREATED | A schedule has been created. |
| SCHEDULING\_DELETED | A schedule has been deleted. |
| SCHEDULING\_DISABLED | A schedule has been disabled. |
| SCHEDULING\_ENABLED | A schedule has been enabled. |
| SCHEDULING\_FREQUENCY\_CHANGED | A schedule's frequency has been changed. |
| SCHEDULING\_MANUALLY\_EXECUTED | A schedule has been executed manually. |
| SCHEDULING\_MODE\_CHANGED | A schedule' mode (Full vs Delta) has been changed. |
| SCHEDULING\_MONITORING\_DISABLED | Monitoring has been disabled on a data job. |
| SCHEDULING\_MONITORING\_ENABLED | Monitoring has been enabled on a data job. |
| SCHEDULING\_RENAMED | A schedule has been renamed. |
| TASK\_CREATED | A task, i.e., transformation or extraction, has been created. |
| TASK\_DELETED | A task, i.e., transformation or extraction, has been deleted. |
| TASK\_DISABLED | A task, i.e., transformation or extraction, has been disabled. |
| TASK\_ENABLED | A task, i.e., transformation or extraction, has been enabled. |
| TASK\_NAME\_OR\_DESCRIPTION\_UPDATED | A task's name or description has been changed, i.e., transformation or extraction. |
| TASK\_ORDER\_CHANGED | The task order, i.e., the order of transformations and extractions, has been changed. |
| TRANSFORMATION\_CODE\_CHANGED | A transformation statement (SQL code) has been changed. |

[## Machine learning events](#id479508_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Machine Learning | ML\_FLOW\_DISABLED | The feature is set to disable for the creation of an ML Flow instance (only an alpha feature, not production ready), |
| ML\_FLOW\_ENABLED | The feature is set to enable for the creation of an ML Flow instance (only an alpha feature, not production ready). |
| ML\_IMAGE\_DISABLED | An ML Image is disabled. |
| ML\_IMAGE\_ENABLED | An ML Image is enabled. |
| ML\_KUBERNETES\_ENABLED | Team is moved to Kubernetes infra |
| ML\_NOTEBOOK\_CREATED | A new machine learning workbench has been created. |
| ML\_NOTEBOOK\_DELETED | A machine learning workbench has been deleted. |
| ML\_NOTEBOOK\_UPDATED | An existing machine learning workbench has been updated. |
| ML\_PLAN\_CHANGED | The dedicated plan changed. |
| ML\_SCHEDULING\_CREATED | A new schedule has been created to execute a machine-learning notebook. |
| ML\_SCHEDULING\_DELETED | A scheduled execution of a machine learning notebook has been removed. |
| ML\_SCHEDULING\_UPDATED | A scheduled execution of a machine learning notebook has been updated. |
| ML\_WORKSPACE\_CREATED | A new machine-learning workspace was created. |
| ML\_WORKSPACE\_DELETED | A machine learning workspace was deleted. |
| ML\_WORKSPACE\_UPDATED | A machine learning workspace updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Machine Learning | ML\_FLOW\_DISABLED | The feature is set to disable for the creation of an ML Flow instance (only an alpha feature, not production ready), |
| ML\_FLOW\_ENABLED | The feature is set to enable for the creation of an ML Flow instance (only an alpha feature, not production ready). |
| ML\_IMAGE\_DISABLED | An ML Image is disabled. |
| ML\_IMAGE\_ENABLED | An ML Image is enabled. |
| ML\_KUBERNETES\_ENABLED | Team is moved to Kubernetes infra |
| ML\_NOTEBOOK\_CREATED | A new machine learning workbench has been created. |
| ML\_NOTEBOOK\_DELETED | A machine learning workbench has been deleted. |
| ML\_NOTEBOOK\_UPDATED | An existing machine learning workbench has been updated. |
| ML\_PLAN\_CHANGED | The dedicated plan changed. |
| ML\_SCHEDULING\_CREATED | A new schedule has been created to execute a machine-learning notebook. |
| ML\_SCHEDULING\_DELETED | A scheduled execution of a machine learning notebook has been removed. |
| ML\_SCHEDULING\_UPDATED | A scheduled execution of a machine learning notebook has been updated. |
| ML\_WORKSPACE\_CREATED | A new machine-learning workspace was created. |
| ML\_WORKSPACE\_DELETED | A machine learning workspace was deleted. |
| ML\_WORKSPACE\_UPDATED | A machine learning workspace updated. |

[## Object-centric data model events](#id479598_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Object-centric data model | OCDM\_GRAPH\_PUBLISHED | The object-centric data model was published to development. |
| OCDM\_GRAPH\_PROMOTED | The object-centric data model was published to development and production. |
| OCDM\_SQL\_FACTORY\_CREATED | A transformation was created. |
| OCDM\_SQL\_FACTORY\_UPDATED | A transformation was updated. |
| OCDM\_SQL\_FACTORY\_DELETED | A transformation was deleted. |
| OCDM\_SQL\_FACTORY\_DISABLED | A transformation was disabled. |
| OCDM\_OBJECT\_CREATED | An object type was created. |
| OCDM\_OBJECT\_UPDATED | An object type was updated. |
| OCDM\_OBJECT\_DELETED | An object type was deleted. |
| OCDM\_OBJECT\_RENAMED | An object type was renamed. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_OBJECT\_UPDATED | An object was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_FIELD\_EXTENSION\_UPDATED | The extension of a Celonis object was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_EVENT\_UPDATED | An event was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_SQL\_FACTORY\_UPDATED | A transformation was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_PERSPECTIVE\_UPDATED | A perspective was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_EVENT\_FIELD\_EXTENSION\_UPDATED | The extension of a Celonis event was updated due to the rename of a related object. |
| OCDM\_EVENT\_CREATED | An event type was created. |
| OCDM\_EVENT\_RENAMED | An even type was renamed. |
| OCDM\_EVENT\_RENAMED\_RELATED\_SQL\_FACTORY\_UPDATED | A transformation was updated due to the rename of a related event. |
| OCDM\_EVENT\_RENAMED\_RELATED\_PERSPECTIVE\_UPDATED | A perspective was updated due to the rename of a related event. |
| OCDM\_EVENT\_UPDATED | An event type was updated. |
| OCDM\_EVENT\_DELETED | An event type was deleted. |
| OCDM\_PERSPECTIVE\_CREATED | A perspective was created. |
| OCDM\_PERSPECTIVE\_UPDATED | A perspective was updated. |
| OCDM\_PERSPECTIVE\_DELETED | A perspective was deleted. |
| OCDM\_PROCESS\_ENABLED | A Celonis catalog process was enabled. |
| OCDM\_PROCESS\_DISABLED | A Celonis catalog process was disabled. |
| OCDM\_PROCESS\_DATA\_SOURCE\_ENABLED | A Celonis catalog process was enabled for a specific data connection |
| OCDM\_PROCESS\_DATA\_SOURCE\_DISABLED | A Celonis catalog process was disabled for a specific data connection. |
| OCDM\_CATALOGUE\_VERSION\_MANUALLY\_UPDATED | A Celonis catalog version was manually updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Object-centric data model | OCDM\_GRAPH\_PUBLISHED | The object-centric data model was published to development. |
| OCDM\_GRAPH\_PROMOTED | The object-centric data model was published to development and production. |
| OCDM\_SQL\_FACTORY\_CREATED | A transformation was created. |
| OCDM\_SQL\_FACTORY\_UPDATED | A transformation was updated. |
| OCDM\_SQL\_FACTORY\_DELETED | A transformation was deleted. |
| OCDM\_SQL\_FACTORY\_DISABLED | A transformation was disabled. |
| OCDM\_OBJECT\_CREATED | An object type was created. |
| OCDM\_OBJECT\_UPDATED | An object type was updated. |
| OCDM\_OBJECT\_DELETED | An object type was deleted. |
| OCDM\_OBJECT\_RENAMED | An object type was renamed. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_OBJECT\_UPDATED | An object was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_FIELD\_EXTENSION\_UPDATED | The extension of a Celonis object was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_EVENT\_UPDATED | An event was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_SQL\_FACTORY\_UPDATED | A transformation was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_PERSPECTIVE\_UPDATED | A perspective was updated due to the rename of a related object. |
| OCDM\_OBJECT\_RENAMED\_RELATED\_EVENT\_FIELD\_EXTENSION\_UPDATED | The extension of a Celonis event was updated due to the rename of a related object. |
| OCDM\_EVENT\_CREATED | An event type was created. |
| OCDM\_EVENT\_RENAMED | An even type was renamed. |
| OCDM\_EVENT\_RENAMED\_RELATED\_SQL\_FACTORY\_UPDATED | A transformation was updated due to the rename of a related event. |
| OCDM\_EVENT\_RENAMED\_RELATED\_PERSPECTIVE\_UPDATED | A perspective was updated due to the rename of a related event. |
| OCDM\_EVENT\_UPDATED | An event type was updated. |
| OCDM\_EVENT\_DELETED | An event type was deleted. |
| OCDM\_PERSPECTIVE\_CREATED | A perspective was created. |
| OCDM\_PERSPECTIVE\_UPDATED | A perspective was updated. |
| OCDM\_PERSPECTIVE\_DELETED | A perspective was deleted. |
| OCDM\_PROCESS\_ENABLED | A Celonis catalog process was enabled. |
| OCDM\_PROCESS\_DISABLED | A Celonis catalog process was disabled. |
| OCDM\_PROCESS\_DATA\_SOURCE\_ENABLED | A Celonis catalog process was enabled for a specific data connection |
| OCDM\_PROCESS\_DATA\_SOURCE\_DISABLED | A Celonis catalog process was disabled for a specific data connection. |
| OCDM\_CATALOGUE\_VERSION\_MANUALLY\_UPDATED | A Celonis catalog version was manually updated. |

[## Process automation events](#id479763_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Process Automation | AGENT\_REGISTERED | An agent has been registered. |
| CONNECTION\_CREATED | A new connection has been created. |
| CONNECTION\_DELETED | A connection has been deleted. |
| CONNECTION\_UPDATED | An existing connection has been updated. |
| SKILL\_CREATED | A skill has been created. |
| SKILL\_DELETED | A skill has been deleted. |
| SKILL\_RENAMED | A skill has been renamed. |
| WORKFLOW\_CREATED | A new workflow has been created. |
| WORKFLOW\_DELETED | A workflow has been deleted. |
| WORKFLOW\_RENAMED | A workflow has been renamed. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Process Automation | AGENT\_REGISTERED | An agent has been registered. |
| CONNECTION\_CREATED | A new connection has been created. |
| CONNECTION\_DELETED | A connection has been deleted. |
| CONNECTION\_UPDATED | An existing connection has been updated. |
| SKILL\_CREATED | A skill has been created. |
| SKILL\_DELETED | A skill has been deleted. |
| SKILL\_RENAMED | A skill has been renamed. |
| WORKFLOW\_CREATED | A new workflow has been created. |
| WORKFLOW\_DELETED | A workflow has been deleted. |
| WORKFLOW\_RENAMED | A workflow has been renamed. |

[## Studio events](#id479828_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Studio | ANALYSIS\_EXPORT\_AUDIT\_LOG\_EVENT | Allow CSV export of analysis components in Analysis settings, and the user exports data. |
| STUDIO\_INPUT\_VARIABLE\_CREATED | A variable for an asset has been created in Studio. |
| STUDIO\_INPUT\_VARIABLE\_DELETED | A variable for an asset has been deleted in Studio. |
| STUDIO\_INPUT\_VARIABLE\_UPDATED | A variable for an asset has been updated in Studio. |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_BATCH\_RESET | A variable value has changed. |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_CHANGED | A variable value has changed |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_RESET | A variable value has been reset to default value. |
| STUDIO\_NODE\_COPIED | An asset inside a package has been copied in Studio. |
| STUDIO\_NODE\_CREATED | An asset inside a package has been created in Studio. |
| STUDIO\_NODE\_DELETED | An asset inside a package has been deleted in Studio. |
| STUDIO\_NODE\_DUPLICATED | A studio node (asset, package or folder) has been duplicated. |
| STUDIO\_NODE\_MOVED | An asset inside a package has been moved in Studio. |
| STUDIO\_NODE\_RENAMED | An asset (type is provided inside the message: analysis, knowledge model, skill, view..) inside a package (package key is provided in the message) has been renamed. |
| STUDIO\_NODE\_RESTORED | An asset (type is provided inside the message: analysis, knowledge model, skill, view..) inside a package (package key is provided in the message) has been restored. |
| STUDIO\_NODE\_UPDATED | An asset inside a package has been updated/changed in Studio.The message will show the node name and related package, the node type, and the updated asset type. UUID's are also provided in the message. |
| STUDIO\_PACKAGE\_DELETED | A package has been deleted from Studio and Apps. |
| STUDIO\_PACKAGE\_INSTALLED | A package has been installed from the Marketplace. |
| STUDIO\_PACKAGE\_IMPORTED | A package node has been imported in Studio (via content-cli or team-to-team copy). |
| STUDIO\_PACKAGE\_MOVED | A package has been moved from the original location. |
| STUDIO\_PACKAGE\_MOVED\_TO\_TRASH | A package has been moved to trash. |
| STUDIO\_PACKAGE\_PUBLISHED | A package has been published to Apps |
| STUDIO\_PACKAGE\_VARIABLE\_CHANGED | A package variable has been changed in Studio. |
| STUDIO\_PACKAGE\_VARIABLE\_CREATED | A package variable has been created in Studio. |
| STUDIO\_PACKAGE\_VARIABLE\_DELETED | A package variable has been deleted in Studio. |
| STUDIO\_PACKAGE\_VERSION\_LOADED | The package switched to a past version in Studio. |
| STUDIO\_SPACE\_CREATED | A Studio Space has been created. |
| STUDIO\_SPACE\_DELETED | A Studio Space has been deleted. |
| STUDIO\_SPACE\_UPDATED | A Studio Space has been updated. |
| TRASH\_AUTO\_DELETE\_JOB | A data job has been automatically removed from trash after 180 days. |
| VIEW\_REPORT\_TRIGGER\_ACTIVATED | A View report trigger has been activated. |
| VIEW\_REPORT\_TRIGGER\_CREATED | A View report trigger has been created. |
| VIEW\_REPORT\_TRIGGER\_DEACTIVATED | A View report trigger has been deactivated. |
| VIEW\_REPORT\_TRIGGER\_DELETED | A View report trigger has been deleted. |
| VIEW\_REPORT\_DELIVERY\_TRIGGER\_FAILED | A View report delivery trigger has failed. |
| VIEW\_REPORT\_DELIVERY\_TRIGGER\_SUCCEEDED | A View report trigger was successfully activated. |
| VIEW\_REPORT\_TRIGGER\_UPDATED | A View report trigger has been updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Studio | ANALYSIS\_EXPORT\_AUDIT\_LOG\_EVENT | Allow CSV export of analysis components in Analysis settings, and the user exports data. |
| STUDIO\_INPUT\_VARIABLE\_CREATED | A variable for an asset has been created in Studio. |
| STUDIO\_INPUT\_VARIABLE\_DELETED | A variable for an asset has been deleted in Studio. |
| STUDIO\_INPUT\_VARIABLE\_UPDATED | A variable for an asset has been updated in Studio. |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_BATCH\_RESET | A variable value has changed. |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_CHANGED | A variable value has changed |
| STUDIO\_INPUT\_VARIABLE\_VALUE\_RESET | A variable value has been reset to default value. |
| STUDIO\_NODE\_COPIED | An asset inside a package has been copied in Studio. |
| STUDIO\_NODE\_CREATED | An asset inside a package has been created in Studio. |
| STUDIO\_NODE\_DELETED | An asset inside a package has been deleted in Studio. |
| STUDIO\_NODE\_DUPLICATED | A studio node (asset, package or folder) has been duplicated. |
| STUDIO\_NODE\_MOVED | An asset inside a package has been moved in Studio. |
| STUDIO\_NODE\_RENAMED | An asset (type is provided inside the message: analysis, knowledge model, skill, view..) inside a package (package key is provided in the message) has been renamed. |
| STUDIO\_NODE\_RESTORED | An asset (type is provided inside the message: analysis, knowledge model, skill, view..) inside a package (package key is provided in the message) has been restored. |
| STUDIO\_NODE\_UPDATED | An asset inside a package has been updated/changed in Studio.The message will show the node name and related package, the node type, and the updated asset type. UUID's are also provided in the message. |
| STUDIO\_PACKAGE\_DELETED | A package has been deleted from Studio and Apps. |
| STUDIO\_PACKAGE\_INSTALLED | A package has been installed from the Marketplace. |
| STUDIO\_PACKAGE\_IMPORTED | A package node has been imported in Studio (via content-cli or team-to-team copy). |
| STUDIO\_PACKAGE\_MOVED | A package has been moved from the original location. |
| STUDIO\_PACKAGE\_MOVED\_TO\_TRASH | A package has been moved to trash. |
| STUDIO\_PACKAGE\_PUBLISHED | A package has been published to Apps |
| STUDIO\_PACKAGE\_VARIABLE\_CHANGED | A package variable has been changed in Studio. |
| STUDIO\_PACKAGE\_VARIABLE\_CREATED | A package variable has been created in Studio. |
| STUDIO\_PACKAGE\_VARIABLE\_DELETED | A package variable has been deleted in Studio. |
| STUDIO\_PACKAGE\_VERSION\_LOADED | The package switched to a past version in Studio. |
| STUDIO\_SPACE\_CREATED | A Studio Space has been created. |
| STUDIO\_SPACE\_DELETED | A Studio Space has been deleted. |
| STUDIO\_SPACE\_UPDATED | A Studio Space has been updated. |
| TRASH\_AUTO\_DELETE\_JOB | A data job has been automatically removed from trash after 180 days. |
| VIEW\_REPORT\_TRIGGER\_ACTIVATED | A View report trigger has been activated. |
| VIEW\_REPORT\_TRIGGER\_CREATED | A View report trigger has been created. |
| VIEW\_REPORT\_TRIGGER\_DEACTIVATED | A View report trigger has been deactivated. |
| VIEW\_REPORT\_TRIGGER\_DELETED | A View report trigger has been deleted. |
| VIEW\_REPORT\_DELIVERY\_TRIGGER\_FAILED | A View report delivery trigger has failed. |
| VIEW\_REPORT\_DELIVERY\_TRIGGER\_SUCCEEDED | A View report trigger was successfully activated. |
| VIEW\_REPORT\_TRIGGER\_UPDATED | A View report trigger has been updated. |

[## Task mining events](#id480042_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Task Mining | TASK\_MINING\_AI\_CONFIGURATION\_CREATED | A new configuration for AI-driven task discovery has been created. |
| TASK\_MINING\_AI\_CONFIGURATION\_DELETED | A configuration for AI-driven task discovery has been deleted. |
| TASK\_MINING\_AI\_CONFIGURATION\_UPDATED | A configuration for AI-driven task discovery has been updated. |
| TASK\_MINING\_AI\_DISCOVERY\_JOB\_CREATED | A new AI-driven task discovery run has been started. |
| TASK\_MINING\_AI\_EXECUTION\_JOB\_CREATED | A new AI-driven task execution run has been started. |
| TASK\_MINING\_AI\_PIPELINE\_JOB\_CREATED | A new AI-driven task pipeline run has been started. |
| TASK\_MINING\_CONFIGURATION\_CREATED | A project configuration has been created in Task Mining. |
| TASK\_MINING\_CONFIGURATION\_DOWNLOADED | A project configuration has been downloaded in Task Mining. |
| TASK\_MINING\_CONFIGURATION\_UPDATED | A project configuration has been updated in Task Mining. |
| TASK\_MINING\_DATA\_PROCESSING\_MANUAL\_EXECUTION\_TRIGGERED | A manual execution has been triggered. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_MANUAL | The project data processing was changed to run only after a manual trigger by clicking on Run. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_ON\_DATA\_PUSH | The project data processing was changed to run only automatically after the Task Mining Clients sent new data. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_SCHEDULED | The project data processing was changed to run only automatically based on the schedule. |
| TASK\_MINING\_LABEL\_CREATED | A Task Mining labeling rule has been created. |
| TASK\_MINING\_LABEL\_DELETED | A Task Mining labeling rule has been deleted. |
| TASK\_MINING\_LABEL\_UPDATED | A Task Mining labeling rule has been updated. |
| TASK\_MINING\_NEW\_CONFIGURATION\_UPLOADED | A project configuration has been updated by uploading a new one in Task Mining. |
| TASK\_MINING\_PROJECT\_CONNECTION\_UPDATED | The connection to the Task Mining project has been updated. |
| TASK\_MINING\_PROJECT\_CREATED | A project has been created in Task Mining. |
| TASK\_MINING\_PROJECT\_DELETED | A project has been deleted in Task Mining. |
| TASK\_MINING\_TASK\_CREATED | A task has been created in Task Mining. |
| TASK\_MINING\_TASK\_UPDATED | A task has been updated in Task Mining. |
| TASK\_MINING\_TASK\_DELETED | A task has been deleted in Task Mining. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Task Mining | TASK\_MINING\_AI\_CONFIGURATION\_CREATED | A new configuration for AI-driven task discovery has been created. |
| TASK\_MINING\_AI\_CONFIGURATION\_DELETED | A configuration for AI-driven task discovery has been deleted. |
| TASK\_MINING\_AI\_CONFIGURATION\_UPDATED | A configuration for AI-driven task discovery has been updated. |
| TASK\_MINING\_AI\_DISCOVERY\_JOB\_CREATED | A new AI-driven task discovery run has been started. |
| TASK\_MINING\_AI\_EXECUTION\_JOB\_CREATED | A new AI-driven task execution run has been started. |
| TASK\_MINING\_AI\_PIPELINE\_JOB\_CREATED | A new AI-driven task pipeline run has been started. |
| TASK\_MINING\_CONFIGURATION\_CREATED | A project configuration has been created in Task Mining. |
| TASK\_MINING\_CONFIGURATION\_DOWNLOADED | A project configuration has been downloaded in Task Mining. |
| TASK\_MINING\_CONFIGURATION\_UPDATED | A project configuration has been updated in Task Mining. |
| TASK\_MINING\_DATA\_PROCESSING\_MANUAL\_EXECUTION\_TRIGGERED | A manual execution has been triggered. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_MANUAL | The project data processing was changed to run only after a manual trigger by clicking on Run. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_ON\_DATA\_PUSH | The project data processing was changed to run only automatically after the Task Mining Clients sent new data. |
| TASK\_MINING\_DATA\_PROCESSING\_TRIGGER\_SCHEDULED | The project data processing was changed to run only automatically based on the schedule. |
| TASK\_MINING\_LABEL\_CREATED | A Task Mining labeling rule has been created. |
| TASK\_MINING\_LABEL\_DELETED | A Task Mining labeling rule has been deleted. |
| TASK\_MINING\_LABEL\_UPDATED | A Task Mining labeling rule has been updated. |
| TASK\_MINING\_NEW\_CONFIGURATION\_UPLOADED | A project configuration has been updated by uploading a new one in Task Mining. |
| TASK\_MINING\_PROJECT\_CONNECTION\_UPDATED | The connection to the Task Mining project has been updated. |
| TASK\_MINING\_PROJECT\_CREATED | A project has been created in Task Mining. |
| TASK\_MINING\_PROJECT\_DELETED | A project has been deleted in Task Mining. |
| TASK\_MINING\_TASK\_CREATED | A task has been created in Task Mining. |
| TASK\_MINING\_TASK\_UPDATED | A task has been updated in Task Mining. |
| TASK\_MINING\_TASK\_DELETED | A task has been deleted in Task Mining. |

[## Team-to-team copy events](#id480187_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Team To Team Copy | TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_CREATED | A copy configuration has been created. |
| TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_DELETED | A copy configuration has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_UPDATED | A copy configuration has been updated. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_AUTHORIZED | An authorized team has been updated. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_CREATED | An authorized team has been created. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_DELETED | An authorized team has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_CREATED | A scheduling has been created. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_DELETED | A scheduling has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_UPDATED | A scheduling has been updated. |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Team To Team Copy | TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_CREATED | A copy configuration has been created. |
| TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_DELETED | A copy configuration has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_CONFIGURATION\_UPDATED | A copy configuration has been updated. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_AUTHORIZED | An authorized team has been updated. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_CREATED | An authorized team has been created. |
| TEAM\_TO\_TEAM\_COPY\_AUTHORIZED\_TEAM\_DELETED | An authorized team has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_CREATED | A scheduling has been created. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_DELETED | A scheduling has been deleted. |
| TEAM\_TO\_TEAM\_COPY\_SCHEDULING\_UPDATED | A scheduling has been updated. |

[## Transformation center events](#id480247_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Transformation Center | OBJECTIVE\_CREATED | An Objective has been created in Transformation Center. |
| OBJECTIVE\_DELETED | An Objective has been deleted in Transformation Center. |
| OBJECTIVE\_INSTALLED | An Objective has been installed from Transformation CenterAppStore in . |
| OBJECTIVE\_UPDATED | An Objective has been updated in Transformation Center. |
| OBJECTIVE\_KPI\_CREATED | A KPI has been created in Transformation Center. |
| OBJECTIVE\_KPI\_DELETED | A KPI has been deleted in Transformation Center. |
| OBJECTIVE\_KPI\_UPDATED | A KPI has been updated in Transformation Center. |
| REPORTING\_CREATED | A report is created that schedules an email to report values on specific KPI's |
| REPORTING\_UPDATED | A report is updated that schedules an email to report values on specific KPI's |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Transformation Center | OBJECTIVE\_CREATED | An Objective has been created in Transformation Center. |
| OBJECTIVE\_DELETED | An Objective has been deleted in Transformation Center. |
| OBJECTIVE\_INSTALLED | An Objective has been installed from Transformation CenterAppStore in . |
| OBJECTIVE\_UPDATED | An Objective has been updated in Transformation Center. |
| OBJECTIVE\_KPI\_CREATED | A KPI has been created in Transformation Center. |
| OBJECTIVE\_KPI\_DELETED | A KPI has been deleted in Transformation Center. |
| OBJECTIVE\_KPI\_UPDATED | A KPI has been updated in Transformation Center. |
| REPORTING\_CREATED | A report is created that schedules an email to report values on specific KPI's |
| REPORTING\_UPDATED | A report is updated that schedules an email to report values on specific KPI's |

[## Trash events](#id480315_body)

Filter

- Event Origin
- Event Name
- Explanation

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Trash | PACKAGE\_MOVED\_TO\_TRASH | A package has been moved to Trash |
| PACKAGE\_RESTORED\_FROM\_TRASH | A package has been restored from Trash |

| Event Origin | Event Name | Explanation |
| --- | --- | --- |
| Trash | PACKAGE\_MOVED\_TO\_TRASH | A package has been moved to Trash |
| PACKAGE\_RESTORED\_FROM\_TRASH | A package has been restored from Trash |


---

## admin/audit-logs/connecting-audit-logs

# Connecting audit log, login history, members, permissions and Studio adoption APIs to the Celonis Platform

Within the **Admin & Settings** module you can view your audit log, team login history, users and groups info, permissions, and studio adoption statistics. However, these views are limited with standardized user interfaces. To run more in-depth analysis of this data, you can connect to their respective APIs and then use a data extractor to feed this information back into the Celonis Platform. This then lets you create your own views in Studio.

To connect to the APIs and create an extractor, follow [these procedures](https://developer.celonis.com/celonis-apis/connecting-to-celonis-platform/) on the Celonis Developer Center.

Once the data is extracted, you can then create a data model using this data. You are then ready to go to Studio and create a view using the data from the API.

For more information on these APIs, see the Celonis Developer Center:

- [Audit Log API](https://developer.celonis.com/celonis-apis/audit-log-api/overview/)
- [Permissions API](https://developer.celonis.com/celonis-apis/permissions-api/overview/)
- [Platform Adoption API](https://developer.celonis.com/celonis-apis/platform-api/overview/)
- [SCIM API](https://developer.celonis.com/celonis-apis/scim-api/overview/)
- [Team APIs](https://developer.celonis.com/celonis-apis/team-api/overview/)


---

## admin/audit-logs/sending-audit-logs-to-splunk

# Sending audit logs to Splunk

By creating an OAuth client and granting that client API permissions, you can configure a RESTful HTTP GET request for your Celonis Platform audit logs. This GET request can then be configured as a data input in your Splunk account, enabling Splunk to frequently pull your audit logs from your team.

Before using your Splunk account, you need to complete the following steps in the Celonis Platform:

- [Creating an application and granting it API permissions](sending-audit-logs-to-splunk.html#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-01fad45a-1835-7e49-db71-812f67336f14 "Creating an application and granting it API permissions")
- [Requesting OAuth access tokens](sending-audit-logs-to-splunk.html#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-3c4c385a-5026-4307-2787-fafcdb228353 "Requesting OAuth access tokens")
- [Testing API with Swagger UI](sending-audit-logs-to-splunk.html#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-6ea21ce2-16f1-4e1c-745c-d527f6c0726e "Testing API with Swagger UI")

After completing these steps, you can then add the data input in your Splunk account. As this is an external platform, we recommend viewing their website for the latest step-by-step guides and user interfaces: [Splunk.com - Getting data from your REST APIs in Splunk](https://www.splunk.com/en_us/blog/tips-and-tricks/getting-data-from-your-rest-apis-into-splunk.html).

For illustration purposes only, the following is an example of adding a new data input in Splunk:

Expand all

[## Creating an application and granting it API permissions](#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-01fad45a-1835-7e49-db71-812f67336f14_body)

**Tip**

Alternatively, you can create an application key and assign the following permissions: Audit Log API, Login History API, and Studio Adoption APIs.

For more information, see: [Application keys](application-keys.html "Creating and granting permissions to application keys").

To start, you need to create an OAuth client in your team and then grant this client API permissions.

1. Click Admin & Settings and select **Applications**.
2. Click **Add New Application** - **OAuth client** and create your OAuth client.

   |  |
   | --- |
   |  |

   When creating your OAuth client, use the following configurations:

   - **Authentication method**: Client secret post
   - **Scopes to select**:

     - audit.log:read (for the Audit Log API)
     - platform-adoption.tracking-events:read (for the Studio Adoption API)
     - team.login-history:read (for the Login History API)
     - team.user-group-info:read (for Team Members info API)

   |  |
   | --- |
   |  |
3. Click **Create** and then copy the **client ID** and **client secret** to your clipboard for later use.
4. Click **Permissions** and edit **Team** permissions.

   |  |
   | --- |
   |  |
5. Assign Audit Log API, Login History API, and Studio Adoption APIs permissions to your newly created application as required.

   |  |
   | --- |
   |  |
6. Click **Save**.

   The OAuth client now has the relevant API permissions. You now need to request an OAuth access token.

[## Requesting OAuth access tokens](#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-3c4c385a-5026-4307-2787-fafcdb228353_body)

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

[## Testing API with Swagger UI](#UUID-9cb49a5c-8e3c-50a6-18bc-aa22e85bf382_UUID-6ea21ce2-16f1-4e1c-745c-d527f6c0726e_body)

You can now test your APIs with Swagger UI using your team name and environment cluster to access Swagger using this URL:

```
https://[teamname].[realm].celonis.cloud/swagger-ui/index.html?configUrl=/log/v3/api-docs/swagger-config
```

Once on the Swagger UI, follow these steps to test your API:

1. Click **Authorize**.

   |  |
   | --- |
   |  |
2. **Using an OAuth client:** Enter "Bearer", followed by a space and then copy the client ID you obtained for the client. For example:

   ```
   Bearer XxxxxxAxxxxBxxxxCxxxXBBBBX
   ```

   **Using an application key:** Enter "AppKey", followed by a space and then copy your application key from the earlier procedure. For example:

   ```
   AppKey XxxxxxAxxxxBxxxxCxxxXBBBB
   ```

   |  |
   | --- |
   |  |
3. Click **Authorize**. Once authorization is successful, click **Close**.
4. Expand the GET call for the API you want to test and click **Try it out**.

   |  |
   | --- |
   |  |
5. Click **Execute**.

   |  |
   | --- |
   |  |

   You will now see the response from the API, including the header that shows the AppKey Token and the URL.

## Related topics

- [Security features](configuring-your-celonis-platform-security-features.html "Configuring your Celonis Platform security features")
- [Audit logs](viewing-your-audit-logs.html "Viewing your audit logs")
- [Connecting APIs to the Celonis Platform](connecting-audit-logs.html "Connecting audit log, login history, members, permissions and Studio adoption APIs to the Celonis Platform")


---

## admin/audit-logs/viewing-your-audit-logs

# Viewing your audit logs

Your audit logs provide detailed insights into event activity in your team. You can view this information within your Celonis Platform , as an exported .CSV file, and by using an API call.

Audit logs are useful for the following reasons:

- **Security and accountability**: Use logs as a "black box" to monitor User role changes, track IP addresses when enabled, and identify unauthorized access or system setting modifications.
- **Compliance and data governance**: Meet legal requirements by automatically deleting audit logs according to company retention policies and ensuring data is handled per internal standards.
- **Automated troubleshooting and debugging**: Investigate business-critical processes by requesting Action Flow execution logs and reviewing the history of automation successes and failures.
- **Operational transparency and reporting**: Maintain a "source of truth" for team activity by exporting logs as CSV for audits and identifying when users might need additional training.

Expand all

[## Viewing your audit logs](#UUID-dfd94902-4a2c-b7b4-86de-2048a7c50c95_section-id235475372741635_body)

To view your audit logs:

1. Click **Admin & Settings - Audit Logs**.
2. Click the **Define Period** field to select the specified time period for which you want to view logs.

   |  |
   | --- |
   |  |
3. View the audit log information. When viewing your audit logs, the following information is available:

   - User ID
   - Event - For an overview of all events and their meanings, see: [Audit logs - Event details](audit-logs---event-details.html "Audit logs - Event details").
   - User role
   - Date
   - Message
   - IP address (when enabled)

[## Downloading your audit logs and Action Flow logs](#id478349_body)

**Note**

For a more detailed look at Action Flow audit logs, see: [Audit logs - Action Flows](action-flows-audit-logs.html "Audit logs for Action Flows")

To download your audit logs and your Action Flow logs:

1. Click **Admin & Settings - Audit Logs**.
2. Click the **Define Period** field to select the specified time period for which you want to view logs.

   |  |
   | --- |
   |  |

   **Note**

   This time period must align to the first 500 results in the interface.
3. Click **Download** and select either **Download Action Flow Execution Logs** (.csv) or **Export as CSV**.

   |  |
   | --- |
   |  |
4. Choose from the following:

   - **Action Flow Execution Logs**: Select the time range, applications, and Action Flows to download.
   - **Export as CSV**: On the **Download Audit Logs** screen, use the date selection window to select the timeframe for your download and click **Apply**.

     |  |
     | --- |
     |  |
5. Click **Download**.

The download starts, giving you offline access to your audit logs.

[## Automatically deleting audit logs](#UUID-dfd94902-4a2c-b7b4-86de-2048a7c50c95_section-idm4602772977129633636522508868_body)

You can periodically delete your audit logs, with no recovery available once this data has been deleted. This content is deleted by midnight of the day your configured timeframe expires.

To automatically delete your audit logs:

1. Click **Admin & Settings - Audit Logs**.
2. Using the Delete Audit Logs drop, select from the following: No deletion, 30 days, 90 days, 180 days, 1 year, 2 years, 10 years.

   |  |
   | --- |
   |  |
3. If older audit logs exist, confirm that you're happy to delete them by typing DELETE when prompted.
4. Click **Enable deletion of audit logs**.

Your audit logs are now deleted by midnight of the day your configured timeframe expires.

## Related topics

- [Audit logs - Event details](audit-logs---event-details.html "Audit logs - Event details")
- [Audit logs - Action Flows](action-flows-audit-logs.html "Audit logs for Action Flows")
- [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")


---

