# Admin: Users, SSO, Security, Gamification

## admin/users/create-users-for-sap-connection

# Create users for SAP connection

Before you start doing any extraction and automation action in SAP, you must create an SAP user and equip them with the permissions necessary to perform extraction and automation tasks.

Creating users for SAP connection is a step in connecting your SAP instance with Celonis Platform. Check the overview of this process, see [Continuous extraction](connecting-to-sap-and-s-4hana.html "Continuous Extractor for SAP ECC and S/4 HANA"), to make sure you completed other necessary steps.

Expand all

[## Creating users for your SAP connection](#UUID-fa2b2575-0a79-e0e1-ce21-8758ac395a03_section-id235501003276492_body)

To create users for your SAP connection:

1. In your SAP instance, call the **User Maintenance (SU01)** transaction to create a user:

   - Enter the user name.
   - Set the user type to System User.
   - Set the password.
2. Give your users the necessary role: From the Download Portal in Celonis Platform, download the extraction role file (*yyyy.mm.dd\_CELONIS\_EXTRACTION.SAP)*.

   **Note**

   The CELONIS\_EXTRACTION.SAP file contains pre-built user permissions necessary for the data extraction from SAP. For automation actions with SAP, you must manually add user permission. For the list of required permissions, see [SAP User Role CELONIS/AUTOMATION\_BASIS](available-sap-actions.html#UUID-b98ed771-2c5e-e53d-c75f-391bb38a2c48 "SAP User Role CELONIS/AUTOMATION_BASIS").
3. In SAP, call the **PFCG** transaction to add or create the role with the necessary permissions.
4. Go to **Role** > **Upload**.
5. Upload the role you downloaded in previous steps.

Your user SAP user is created. You can start creating your SAP connections in Celonis Platform.

For data extraction, you can do it in the Data Integration area. See [Creating a data connection](step-3-create-sap-connection-in-the-celonis-platform.html "Creating a data connection between SAP and the Celonis Platform").

For automations, create your connection between SAP and Automation client in Studio or through the Admin and Settings area. See [Creating on-prem system connections](creating-on-prem-system-connections.html "Creating on-prem system connections")

[## SAP CELONIS\_EXTRACTION role](#UUID-fa2b2575-0a79-e0e1-ce21-8758ac395a03_UUID-60ab058b-4ba4-2f0d-f8f8-29b8633ae018_body)

The following describes in detail what the SAP CELONIS\_EXTRACTION role contains and why the authorizations are necessary along with customization options

### Cross-application Authorization Objects

**Authorization Check for RFC Access** - So the Extractor can remotely access the functions in the RFC module

Filter

- Object
- Field
- Activities/Values

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_RFC | ACTVT | 16 |
| S\_RFC | RFC\_NAME | /CELONIS/46C\_EXTRACTION, /CELONIS/CL\_EXTRACTION, /CELONIS/EXTRACTION, /CELONIS/V2\_CL\_EXTRACTION, /CELONIS/V2\_EXTRACTION, RFC1, SDIFRUNTIME, SDTX, SRFC, SYST, SYSU |
| S\_RFC | RFC\_TYPE | FUGR |

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_RFC | ACTVT | 16 |
| S\_RFC | RFC\_NAME | /CELONIS/46C\_EXTRACTION, /CELONIS/CL\_EXTRACTION, /CELONIS/EXTRACTION, /CELONIS/V2\_CL\_EXTRACTION, /CELONIS/V2\_EXTRACTION, RFC1, SDIFRUNTIME, SDTX, SRFC, SYST, SYSU |
| S\_RFC | RFC\_TYPE | FUGR |

### Basis: Administration

**Background Processing: Operations on Background Jobs** - So the RFC module can immediately run the extractions as background jobs

Filter

- Object
- Field
- Activities/Values

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_BTCH\_JOB | JOBACTION | RELE |
| S\_BTCH\_JOB | JOBGROUP | \* |

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_BTCH\_JOB | JOBACTION | RELE |
| S\_BTCH\_JOB | JOBGROUP | \* |

**Authorization for file access** - So the RFC module can write, read, and delete files in the physical path defined for the logical path 'Z\_CELONIS\_TARGET'

Filter

- Object
- Field
- Activities/Values

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_DATASET | ACTVT | 06, 33, 34 |
| S\_DATASET | FILENAME | \* |
| S\_DATASET | PROGRAM | /CELONIS/\* |

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_DATASET | ACTVT | 06, 33, 34 |
| S\_DATASET | FILENAME | \* |
| S\_DATASET | PROGRAM | /CELONIS/\* |

**Note**

You can replace the '\*' in 'FILENAME' with the physical path you have chosen for Z\_CELONIS\_TARGET, e.g. /<YOUR\_PATH>/\*

**Table Maintenance (via standard tools such as SM30)** - So the RFC module can extract data from tables

Filter

- Object
- Field
- Activities/Values

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_TABU\_DIS | ACTVT | 03 |
| S\_TABU\_DIS | DICBERCLS | \* |

| Object | Field | Activities/Values |
| --- | --- | --- |
| S\_TABU\_DIS | ACTVT | 03 |
| S\_TABU\_DIS | DICBERCLS | \* |

**Note**

You can replace the '\*' in 'DICBERCLS' with the authorisation group of tables you will be extracting.

Alternatively, If you need to control access to individual tables instead to groups of tables, you can use authorisation object S\_TABU\_NAM.

**Important:** When using the Real-Time Extractor, the Changelog tables (ZCL...) should also be allow listed.

### Basis - Development Environment - Generic Program Start

Filter

- Object
- Field
- Activities/ Values

| Object | Field | Activities/ Values |
| --- | --- | --- |
| S\_PROGNAM | P\_ACTION | BTCSUBMIT |
| S\_PROGNAM | P\_PROGNAM | /CELONIS/RP\_BG\_EXTRACT |

| Object | Field | Activities/ Values |
| --- | --- | --- |
| S\_PROGNAM | P\_ACTION | BTCSUBMIT |
| S\_PROGNAM | P\_PROGNAM | /CELONIS/RP\_BG\_EXTRACT |

### Basis - Central Functions- Applications log

Filter

- Object
- Field
- Activities/ Values

| Object | Field | Activities/ Values |
| --- | --- | --- |
| S\_APPL\_LOG | ALG\_OBJECT | /CELONIS/ |
| S\_APPL\_LOG | ALG\_SUBOBJ | \* |
| S\_APPL\_LOG | ACTVT | 06 |

| Object | Field | Activities/ Values |
| --- | --- | --- |
| S\_APPL\_LOG | ALG\_OBJECT | /CELONIS/ |
| S\_APPL\_LOG | ALG\_SUBOBJ | \* |
| S\_APPL\_LOG | ACTVT | 06 |

## Related topics

- [One-time extraction](one-time-extraction-from-sap-ecc-or-sap-s-4hana.html "One-time extraction from SAP ECC or SAP S/4HANA")
- [Local extraction](local-extractor-for-sap-ecc-and-sap-s-4hana.html "Local extractor for SAP ECC and SAP S/4HANA")
- [RFC module](rfc-module-overview.html "RFC module")


---

## admin/users/creating-and-managing-groups

# Creating and managing groups

Instead of manually configuring settings for every individual, groups allow you to assign a set of permissions to multiple users simultaneously. This ensures consistency across your team and significantly reduces administrative overhead.

By creating and managing groups of users, you get the following benefits:

- **Bulk permissions**: Define a Team Role once and apply it to everyone in the group.
- **Flexible provisioning**: You can add users manually, via Open Sign up, or automatically through an identity provider (SAML JIT).
- **License management**: Assigning roles to groups helps define how users count toward your license limits.
- **Centralized control**: From a single group page, you can:

  - Rename the group.
  - Add or remove members.
  - Export permission reports as a .csv file.
  - Delete the group entirely.

Expand all

[## Creating groups and adding users](#UUID-3aff9bcb-b900-1caa-67b9-7ac70d27148c_section-id23547371362793_body)

You can add users to groups in these ways:

- Manually via the **Admin & Settings** area.
- Using the [Open Sign up](open-signup.html "Open signup") feature.
- Automatically when syncing with an identity provider that provides groups.

In the first two scenarios, you need to create groups and assign them a role. In the third scenario (SAML JIT), the groups are created by the identity provider. By assigning a role to your groups, you define how the group’s users will count towards your license and how permissions will be pre-filtered. For more about provisioning groups, see: [Account management](account-management.html "Account management").

To manually create a group and assign it a role:

1. Click **Admin & Settings - Groups**.
2. Click **New group** and add a group name.
3. Optional: Add existing users to the group.
4. Click **Save**.

   The group is created.
5. Using the team role drop down, select the permissions that users in this group hold.

[## Managing existing groups](#UUID-3aff9bcb-b900-1caa-67b9-7ac70d27148c_section-id235473713698416_body)

Once created, a group can be managed by clicking the name and opening it's individual page:

You have the following group management options:

- Rename the group.
- Add and remove users from group.
- View the group’s permissions.
- Export the group’s permissions (as a .csv file).
- Delete the group.

## Related topics

- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")
- [Managing existing users](managing-existing-users.html "Managing existing users")
- [Open signup](open-signup.html "Open signup")


---

## admin/users/custom-kpi-groups-in-process-explorer

# Custom KPI Groups in Process Explorer

The KPI Groups feature is used to create groups of custom process KPIs to display in the process graph in Process Explorer. You can create a KPI Group by selecting existing process-related KPIs or defining your own KPIs in the visual editor. KPI Groups can be created for both case-centric (single event log, multi-event log) and object-centric process exploration components.

Custom KPI groups allow you to bundle related KPIs for activities/events within a single eventlog or track a specific KPI across multiple event logs. For example, a KPI Group could be comprised of the automation rate of each activity and the duration between them, for one event log. If your Process Explorer is configured with multiple event logs, in the same KPI group you can also create KPIs for each eventlog in your Process Explorer to track the same KPI across multiple event logs.

Both KPI Groups and the individual KPIs in those groups are created and stored within a Knowledge Model (KM). As a result, if a change is made to an individual KPI, it is automatically updated across all KPI Groups to which that KPI has been added.

**Note**

Custom KPI Groups are only available in Studio Views. For components created in Legacy Views, KPIs are still [defined using YAML](configuring-a-kpi-list-in-legacy-view.html "Configuring a KPI list in legacy view") in the Knowledge Model.

|  |
| --- |
|  |

Expand all

[## Applying a custom KPI group](#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234912152398686_body)

The available KPI groups are displayed on the **Settings** tab by clicking the edit icon and selecting the process visualization component. The available custom KPIs groups are displayed in the **KPI Groups** section. From this section, you can create new custom groups, show or hide existing groups, remove a custom group, or change the order in which the groups are displayed in the KPI selector dropdown.

**Note**

The default KPIs are still available in the **Interactions** section of the Settings tab.

The order in which the custom KPI groups are displayed in the KPI Group ls section is the order in which they will display in the KPI selector dropdown. To change the order, click and drag the groups into the proper order.

|  |
| --- |
|  |

Custom KPI groups are only available to use in the process graph if they are visible. To make a KPI group visible, click the eye icon on the group tile to make sure it’s accessible. To hide a KPI group, click the icon again to hide a group from the dropdown. Hidden KPI groups will be grayed out. To remove a KPI group, click the **X** on the right side of the tile.

Once the KPI groups have been added, they will display in the KPI selector dropdown on the process graph. To apply a KPI group, select it from the dropdown.

|  |
| --- |
|  |

The custom KPIs will be displayed in your process graph. It is important to note that how your KPIs are displayed will vary based on if the KPIs were created on the Activity or the Connection (see the [Create a custom KPI Group](custom-kpi-groups-in-process-explorer.html#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234912267923113 "Creating a custom KPI Group") section below for more details).

- **Activity KPI:** The Activity node always displays the Case Count (in case-centric) or Event Count (in object-centric) as the first KPI, followed by the custom Activity KPI. If the KPI group is comprised of more than one Activity KPI for an event log, then a maximum of two custom Activity KPIs are displayed on the Activity nodes on the graph. You can click on an Activity node to display all the Activity KPIs for that connection in the details pop-up window.
- **Connection KPI:** If the selected KPI group is comprised of more than one Connection KPIs for an event log, then the first Connection KPI for that event log is displayed on the connections in the process graph. If you click on that connection, you can view all the Connection KPIs for that connection in the details pop-up window.

[## Creating a custom KPI Group](#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234912267923113_body)

Once your custom KPI Groups have been created, they can be shared with other users for use in their Process Explorer components.

1. In your Process Explorer, click the **Edit** button in the upper right.
2. Select your process graph component and then click the **Settings** tab in the edit panel on the right.
3. In the KPI Groups section, click the **Select data** button.
4. Click the **Create KPI group** button.

   **Note**

   Custom KPI groups that have been created but not added to the process graph will also be displayed. To add one of these groups, select the checkbox and the group is added or removed.

   |  |
   | --- |
   |  |
5. In the **KPI Group settings** window, choose an icon from the dropdown and then enter a Group name.
6. Enter a **Description** for this KPI Group.

   **Note**

   This description will be the value displayed in the KPI selector dropdown on your process graph for the KPI Group you are creating.
7. Click on the **Add activity or connection KPI** field.
8. In the **KPI Settings** window, choose if the KPIs in this group are applied on the Activity or the Connection.

   - **Activity KPI:** An Activity KPI is calculated and displayed on the activity/event node in the process graph.

     Example of an Activity KPI for Automation:

     ```
     AVG(CASE WHEN "EVENTLOG"."USERTYPE" = 'Batch' THEN 1.0 ELSE 0.0 END)
     ```
   - **Connection KPI:** A Connection KPI is calculated and displayed on the connections between nodes in the process graph.

     Example of a Connection KPI for Duration:

     ```
     AVG(1.0*DATEDIFF(dd, SOURCE("EVENTLOG"."EVENTTIME"), TARGET("EVENTLOG"."EVENTTIME")))
     ```
9. Choose the **Eventlog** where this group will be applied from the dropdown.

   **Note**

   To add a KPI based on an eventlog that was created by modifying an existing activity table or event log, you will need to reference the original activity table in the PQL statement for the KPI definition.
10. Click the **Add KPI data to display** button to open the Knowledge Editor and [create your KPIs](custom-kpi-groups-in-process-explorer.html#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234920488086709 "Creating KPIs in the PQL Editor").

    **Note**

    The KPI must be saved to the Knowledge Model before being used in a KPI group.

    |  |
    | --- |
    |  |
11. Repeat these steps to create additional KPIs.

    **Note**

    To display the same information from different event logs, you will need to create separate KPIs for each event log.
12. Click **Back** when finished adding KPIs.
13. On the KPI Group settings window, click **Save**.
14. Click **Save** in the confirmation window. The new group is now displayed in the KPI Groups section.

[## Creating KPIs in the PQL Editor](#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234920488086709_body)

The **PQL Editor** is used to create KPIs through PQL statements directly in the editor window or by selecting from the list of Data, Metrics, Filters, Values, Formulas and Variables in the panel on the left. You can preview the results of your statement as you build using the preview window below the editor.

|  |
| --- |
|  |

1. In the PQL Editor, enter a Name and Description for this KPI in the **Display Settings** section on the right.
2. Use the **Format** dropdown to select the specific format in which the KPI value will be displayed, such as a percentage, decimal number, date, etc.
3. In the black PQL Editor window, you can manually enter the code of your statement. As you type, the editor will make intelligent suggestions based on your entry that you can select.
4. You can also create your statement by selecting any of the data, metrics, values, or filters from the panel on the left. Clicking any of the items from the panel will insert the corresponding code into your PQL statement.

   **Note**

   To add a KPI based on an eventlog that was created by modifying an existing activity table or event log, you will need to reference the original activity table in the PQL statement for the KPI definition.

   |  |
   | --- |
   |  |
5. As you build your KPI, the window at the bottom of the screen will display a preview of the data returned by the current PQL statement. As you add more values, click the **Refresh** button to update the preview with the latest version of the statement.

   **Note**

   Only a single value will display in the preview when including a metric selected from the panel on the left.

   |  |
   | --- |
   |  |
6. Once your statement is finished, click the **Save to Knowledge Model** button on the right.

   **Note**

   The KPI must be saved to the Knowledge Model before it can be added to a KPI group. Once the KPI is saved to the Knowledge Model, it is also available to be assigned to other KPI groups or Views.
7. Once your KPI is complete, click the **Done** button in the upper right corner of the PQL Editor. The KPI is saved and added to your custom KPI group.
8. Repeat these steps to add additional KPIs to the custom group.

[## Deleting a custom KPI group](#UUID-cfd65472-04e5-9f7b-69d3-a6522981cdf9_section-idm234936168492906_body)

While custom KPI groups can be created from within your Studio View, to delete a KPI group, the Analyst will need to remove it from the Knowledge Model.

|  |
| --- |
|  |

In the example above, a KPI group named "Emissions" had been created along with other KPI groups. To delete the "Emissions" KPI group, you have to:

1. Go to the Knowledge Model and switch to the YAML editor.
2. In the **eventLogsMetadata** section, locate the entry containing `displayName: Emissions`.
3. Delete the entry, including all the nested properties such as `eventLogKpis` and `transitionsKpis`.

## Related topics

- [Views](creating-views.html "Creating and configuring Views")
- [View settings](view-settings.html "View settings")
- [View modules](creating-and-embedding-view-modules.html "Creating and embedding View modules")


---

## admin/users/custom-kpi-groups-in-variant-explorer

# Custom KPI Groups in Variant Explorer

The KPI Groups feature is used to create groups of custom process KPIs to display in the process graph in Variant Explorer. You can create a KPI Group by selecting existing process-related KPIs or defining your own KPIs in the visual editor. KPI Groups can be created for both case-centric (single event log, multi-event log) and object-centric process exploration components.

Custom KPI groups allow you to bundle related KPIs for activities/events within a single eventlog or track a specific KPI across multiple event logs. For example, a KPI group could be comprised of the automation rate of each activity and the duration between them, for one event log. If your Variant Explorer is configured with multiple eventlogs, in the same KPI group you can also create KPIs for each eventlog in your Variant Explorer to track the same KPI across multiple event logs.

Both KPI Groups and the individual KPIs in those groups are created and stored within a Knowledge Model (KM). As a result, if a change is made to an individual KPI, it is automatically updated across all KPI Groups to which that KPI has been added.

**Note**

Custom KPI Groups are only available in Studio Views. For components created in Legacy Views, KPIs are still [defined using YAML](configuring-a-kpi-list-in-legacy-view.html "Configuring a KPI list in legacy view") in the Knowledge Model.

|  |
| --- |
|  |

Expand all

[## Applying a custom KPI group](#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_section-idm234912152398686_body)

The available KPI groups are displayed on the **Settings** tab by clicking the edit icon and selecting the process visualization component. The available custom KPIs groups are displayed in the **KPI Groups** section. From this section, you can create new custom groups, show or hide existing groups, remove a custom group, or change the order in which the groups are displayed in the KPI selector dropdown.

**Note**

The default KPIs are still available in the **Interactions** section of the Settings tab.

The order in which the custom KPI groups are displayed in the KPI Group ls section is the order in which they will display in the KPI selector dropdown. To change the order, click and drag the groups into the proper order.

Custom KPI groups are only available to use in the process graph if they are visible. To make a KPI group visible, click the eye icon on the group tile to make sure it’s accessible. To hide a KPI group, click the icon again to hide a group from the dropdown. Hidden KPI groups will be grayed out. To remove a KPI group, click the **X** on the right side of the tile.

Once the KPI groups have been added, they will display in the KPI selector dropdown on the process graph. To apply a KPI group, select it from the dropdown.

|  |
| --- |
|  |

The custom KPIs will be displayed in your process graph. It is important to note that how your KPIs are displayed will vary based on if the KPIs were created on the Activity or the Connection (see the [Create a custom KPI Group](custom-kpi-groups-in-variant-explorer.html#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_N1747057759264 "Step 8") section below for more details).

- **Activity KPI:** The Activity node always displays the Case Count (in case-centric) or Event Count (in object-centric) as the first KPI, followed by the custom Activity KPI. If the KPI group is comprised of more than one Activity KPI for an event log, then a maximum of two custom Activity KPIs are displayed on the Activity nodes on the graph. You can click on an Activity node to display all the Activity KPIs for that connection in the details pop-up window.
- **Connection KPI:** If the selected KPI group is comprised of more than one Connection KPIs for an event log, then the first Connection KPI for that event log is displayed on the connections in the process graph. If you click on that connection, you can view all the Connection KPIs for that connection in the details pop-up window.

[## Creating a custom KPI Group](#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_section-idm234912267923113_body)

Once your custom KPI Groups have been created, they can be shared with other users for use in their Variant Explorer components.

1. In your Variant Explorer, click the **Edit** button in the upper right.
2. Select your process graph component and then click the **Settings** tab in the edit panel on the right.
3. In the KPI Groups section, click the **Select data** button.
4. Click the **Create KPI group** button.

   **Note**

   Custom KPI groups that have been created but not added to the process graph will also be displayed. To add one of these groups, select the checkbox and the group is added or removed.

   |  |
   | --- |
   |  |
5. In the **KPI Group settings** window, choose an icon from the dropdown and then enter a Group name.
6. Enter a **Description** for this KPI Group.

   **Note**

   This description will be the value displayed in the KPI selector dropdown on your process graph for the KPI Group you are creating.
7. Click on the **Add activity or connection KPI** field.
8. In the **KPI Settings** window, choose if the KPIs in this group are applied on the Activity or the Connection.

   - **Activity KPI:** An Activity KPI is calculated and displayed on the activity/event node in the process graph.

     Example of an Activity KPI for Automation:

     ```
     AVG(CASE WHEN "EVENTLOG"."USERTYPE" = 'Batch' THEN 1.0 ELSE 0.0 END)
     ```
   - **Connection KPI:** A Connection KPI is calculated and displayed on the connections between nodes in the process graph.

     Example of a Connection KPI for Duration:

     ```
     AVG(1.0*DATEDIFF(dd, SOURCE("EVENTLOG"."EVENTTIME"), TARGET("EVENTLOG"."EVENTTIME")))
     ```
9. Choose the **Eventlog** where this group will be applied from the dropdown.

   **Note**

   To add a KPI based on an eventlog that was created by modifying an existing activity table or event log, you will need to reference the original activity table in the PQL statement for the KPI definition.
10. Click the **Add KPI data to display** button to open the Knowledge Editor and [create your KPIs](custom-kpi-groups-in-variant-explorer.html#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_section-idm234920488086709 "Creating KPIs in the PQL Editor").

    **Note**

    The KPI must be saved to the Knowledge Model before being used in a KPI group.

    |  |
    | --- |
    |  |
11. Repeat these steps to create additional KPIs.

    **Note**

    To display the same information from different event logs, you will need to create separate KPIs for each event log.
12. Click **Back** when finished adding KPIs.
13. On the KPI Group settings window, click **Save**.
14. Click **Save** in the confirmation window. The new group is now displayed in the KPI Groups section.

[## Creating KPIs in the PQL Editor](#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_section-idm234920488086709_body)

The **PQL Editor** is used to create KPIs through PQL statements directly in the editor window or by selecting from the list of Data, Metrics, Filters, Values, Formulas and Variables in the panel on the left. You can preview the results of your statement as you build using the preview window below the editor.

|  |
| --- |
|  |

1. In the PQL Editor, enter a Name and Description for this KPI in the **Display Settings** section on the right.
2. Use the **Format** dropdown to select the specific format in which the KPI value will be displayed, such as a percentage, decimal number, date, etc.
3. In the black PQL Editor window, you can manually enter the code of your statement. As you type, the editor will make intelligent suggestions based on your entry that you can select.
4. You can also create your statement by selecting any of the data, metrics, values, or filters from the panel on the left. Clicking any of the items from the panel will insert the corresponding code into your PQL statement.

   **Note**

   To add a KPI based on an eventlog that was created by modifying an existing activity table or event log, you will need to reference the original activity table in the PQL statement for the KPI definition.

   |  |
   | --- |
   |  |
5. As you build your KPI, the window at the bottom of the screen will display a preview of the data returned by the current PQL statement. As you add more values, click the **Refresh** button to update the preview with the latest version of the statement.

   **Note**

   Only a single value will display in the preview when including a metric selected from the panel on the left.

   |  |
   | --- |
   |  |
6. Once your statement is finished, click the **Save to Knowledge Model** button on the right.

   **Note**

   The KPI must be saved to the Knowledge Model before it can be added to a KPI group. Once the KPI is saved to the Knowledge Model, it is also available to be assigned to other KPI groups or Views.
7. Once your KPI is complete, click the **Done** button in the upper right corner of the PQL Editor. The KPI is saved and added to your custom KPI group.
8. Repeat these steps to add additional KPIs to the custom group.

[## Deleting a custom KPI group](#UUID-3ff10c1f-7229-5d44-a35a-6bf8152e1344_section-idm234941151935379_body)

While custom KPI groups can be created from within your Studio View, to delete a KPI group, the Analyst will need to remove it from the Knowledge Model.

|  |
| --- |
|  |

In the example above, a KPI group named "Emissions" had been created along with other KPI groups. To delete the "Emissions" KPI group, you have to:

1. Go to the Knowledge Model and switch to the YAML editor.
2. In the **eventLogsMetadata** section, locate the entry containing `displayName: Emissions`.
3. Delete the entry, including all the nested properties such as `eventLogKpis` and `transitionsKpis`.

## Related topics

- [Views](creating-views.html "Creating and configuring Views")
- [View settings](view-settings.html "View settings")
- [View modules](creating-and-embedding-view-modules.html "Creating and embedding View modules")


---

## admin/users/event-grouping-in-process-explorer-and-variant-explorer

# Event grouping in Process Explorer and Variant Explorer

Both Process Explorer and Variant Explorer allow you to create custom groups of activities or events within the process graph. Grouping activities/events together simplifies the process graph, making it easier for you to focus on other portions of the process. For example, if you group together activities or events that are not relevant to the type of analysis you want to perform, grouping these activities or events together will simplify the part of the process graph you are not currently concerned with and make it easier to read the portions of the graph you are analyzing. Event grouping can also be used to help users visualize their processes by the individual phases or sub-processes, such as in Banking, Insurance, or Logistics processes.

When activities/events are grouped together, the total occurrences for the activities/events in that group are aggregated. This means that the totals displayed on the group in the process graph reflects the total number of times that all the events in the group occurred. You can also view more details for the activities/events in the group by clicking on the group in the process graph.

Expand all

[## Grouping events or activities in the process graph](#UUID-21eea2fe-b0b9-3f68-9a6a-c8380d6a09ee_section-id235129772403961_body)

**Note**

Groups are not saved to the Knowledge Model, which means that they are only available in the Process Explorer or Variant Explorer component where they were created. To use the same grouping in another component, it must be recreated.

1. Go to your Studio View and enter the **Edit Mode**.
2. Select the explorer component in which you want to add an event grouping.
3. On the **Settings** tab, go to the **Event Groups** section.
4. Click the **Add event group** link.
5. Enter a name for the grouping. This name will be used as the label for the group on the process graph.
6. Click the drop-down and select the specific events or activities you want to group together.

   |  |
   | --- |
   |  |

   You can also use the **Search** field to locate specific events or activities or click the **Select all** checkbox to add all events or activities to the group.
7. Once you’ve selected the events or activities to group, click **Save**.

   |  |
   | --- |
   |  |

   The process graph is refreshed and the grouping is applied.

   |  |
   | --- |
   |  |

   Clicking the **Expand activity group** icon  will allow users to see the individual activities and events within the group as part of the process flow.
8. To view details of the grouped events or activities, click on the group in the process graph.

   |  |
   | --- |
   |  |
9. To ungroup the events or activities, go back to the **Event Groups** section in Edit Mode and click the **X** to the right of the group name.

   The process graph is refreshed and the events or activities are no longer grouped.

## Related topics

- [Views](creating-views.html "Creating and configuring Views")
- [View settings](view-settings.html "View settings")
- [View modules](creating-and-embedding-view-modules.html "Creating and embedding View modules")


---

## admin/users/grouping-task-mining-events-into-tasks

# Grouping Task Mining events into Tasks

**Limited availability**

This functionality is currently in limited availability. If you’re interested in trying it out, get in touch with us through the [Support Portal](http://support.celonis.com/).

You can now create Tasks in your captured Task Mining data by grouping together individual Task Mining events created by user actions that are performed together to achieve a specific outcome.

For example, when a user creates an invoice, there are specific actions they will always perform. Grouping the events created from these actions into a **Create Invoice Task** gives these events business context. Adding the **Create Invoice Task** to your analysis gives you detailed data for the individual events, as well as data for the Task as a whole.

**Note**

When you create a Task, it applies to new data only. However, if you re-process all the existing data, the Task will be applied to all data. For more information, see [Task Mining data processing](task-mining-data-processing-and-scheduling.html "Task Mining data processing and scheduling").

Expand all

[## Before you begin](#id832731_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Admin or Analyst role

[## Creating Task Mining Tasks](#UUID-82cb4502-adc0-ec78-5f17-5cd2e68c2699_section-id235233224646191_body)

1. In the Celonis Platform Navigation bar, select **Data** >**Task Mining**.

   All available Task Mining projects display.
2. Open the Task Mining project you want to create Tasks for.
3. Select **Tasks** from the Task Mining project navigation.

   |  |
   | --- |
   |  |
4. Select **Create Task**.

   The **Create Task** screen appears.

   |  |
   | --- |
   |  |
5. Add a name and description for your Task.
6. Add the events that indicate the start and finish of your Task.

   **Tip**

   Select **Raw data** and search for events if you’re not sure what to include here.
7. Select **Preview** to view your Task.
8. Select **Save**.

## Related topics

- [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects")
- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app")


---

## admin/users/implementing-a-user-locking-policy

# Implementing a user locking policy

When monitoring user counts and activity levels, you may find users who haven’t logged into the Celonis Platform for an extended period. By implementing a **user locking policy**, you can automatically lock or remove these inactive users.

Locked users still occupy a licensed seat and retain their assigned user or team roles, but they cannot use them until unlocked. You can unlock a user at any time to restore their access.

Key reasons to implement a user locking policy include:

- **Security and hygiene**: It allows you to automatically lock or remove users who haven't logged in for an extended period, reducing the potential attack surface of inactive accounts.
- **License management**: While locked users still occupy a licensed seat, the policy provides an automated way to eventually remove locked users after a set number of days. Removing these users frees up seats for active employees.
- **Automation**: You can set specific criteria, such as the number of days of inactivity (minimum of four days) before a user is locked, and automate warning emails to users before the lock occurs.
- **Admin safeguards**: The policy includes a safeguard that allows locked admins to unlock their own accounts via email, ensuring that a team is never left without an active administrator due to inactivity.

**Admins locked as a result of the user locking policy or by another admin**

If an admin is locked out of the team, either by the policy or another admin, they are notified by email and can unlock their account directly. This safeguard prevents the last active admin in a team from being locked out due to inactivity.

Expand all

[## Implementing a user locking policy](#UUID-a5e52239-e4ad-4c34-841b-9b0677606fc0_section-id235475207233014_body)

To implement a user locking policy for your Celonis Platform team:

1. Click **Admin & Settings - Users**.
2. Click **User locking policy**.

   |  |
   | --- |
   |  |
3. Configure the policy using the following options:

   - **Lock users with days of inactivity bigger than**: Indicates the number of days that the user must be inactive before they are locked. The minimum number of days is four.

     **Note**

     Users manually unlocked within the past three days are exempt from the locking policy, regardless of the Lock users with days of inactivity bigger than setting.
   - **Days to notify users before locking**: The number of days prior to being locked that you want to send an automated email to users who are at risk of being locked out of your team.
   - **Remove locked users**: When enabled, locked users are removed from your after the specified number of days. Removed users must be re-invited (or re-authenticated if you’re using an SSO) to regain access and will lose their previous permissions.
   - **Manually locking and unlocking users**: As an admin, you can also manually lock or unlock a user. For more information, see [Managing existing users](managing-existing-users.html "Managing existing users").
4. Click **Save**.

The user locking policy for your Celonis Platform team is set.

## Related topics

- [Managing existing users](managing-existing-users.html "Managing existing users")
- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")
- [Monitoring licenses](monitoring-your-celonis-platform-license.html "Monitoring your Celonis Platform license")


---

## admin/users/inviting-users-to-your-celonis-platform-team

# Inviting users to your Celonis Platform team

You can invite users to your Celonis Platform team manually, with the ability to invite users controlled by your security settings and user permissions.

When inviting users to your Celonis Platform team, they receive an email containing further joining instructions. Once invited, users have 14 days to accept the invitation. After 14 days, if a user doesn't accept the invitation, the admin can send the invitation again. During that time, pending invitations count toward users' seat allocation for 30 days.

After 30 days, users who don't respond to the invitation are automatically removed from the system. This event is recorded in logs in the following way: *TEAM\_MEMBERSHIP\_DELETED and the user ID “celonis-service (SYSTEM)"*

Expand all

[## Before you begin](#UUID-56d16e96-38e4-dcd3-9914-797e4fc12a12_section-idm4605768726136033636373214564_body)

To invite users to your Celonis Platform team, you must hold full or variable admin permissions.

See: [Seat allocation and Celonis Platform roles](user-profile.html "User and team roles") and Assigning variable admin permissions.

[## Inviting users to your team](#UUID-56d16e96-38e4-dcd3-9914-797e4fc12a12_section-idm4605768730603233636374214837_body)

To invite users to your team, follow these steps:

1. Click **Admin & Settings** and select **Users**.
2. Click **Invite new users**.
3. Configure the invitation using the following fields:

   - **Email address**: Enter one or more comma separated email addresses. For larger numbers of users, import a single .csv file here. Use a single column format with one email address in each row.
   - **Role**: Select from Member, Analyst, or Admin. For information about available roles, see: [User and team roles](user-profile.html "User and team roles").
   - **Send Invitation E-Mail (optional)**: You can choose whether your users receive an invitation e-mail immediately after you click **Send Invitation**. It's a toggle that defaults to **on**. Be aware that this influences the onboarding process for new users depending on which identity provider you are using:

     - External SSO: The user will receive a verification email when they log in the first time your team.
     - Celonis ID: To login for the first time, the user navigates to your team URL and resets the password using the  'Forgot password' link on the team login page. They will then receive the registration email. After registering and navigating back to the team URL, the user will receive a team invitation email.
     - Celonis Login: To log in for the first time, the user navigates to your team URL and resets the password using the 'Forgot password' link on the team login page. They will then receive the standard invitation email.
   - **Message (optional)**: Enter a message for your users.
   - **Active Until (optional)**: If you want to make the invitation temporary, switch the **Active until** toggle and provide the date by which the user will be locked from accessing the team.

     If set, regular user locking policies apply. See [User locking policy](implementing-a-user-locking-policy.html "Implementing a user locking policy")
4. Click **Send invitation**,

   |  |
   | --- |
   |  |

   An email invitation is sent to your users, giving them further joining instructions. The invited users are now visible in your User overview area.

## Related topics

- [User and team roles](user-profile.html "User and team roles")
- [Managing existing users](managing-existing-users.html "Managing existing users")
- [Groups](creating-and-managing-groups.html "Creating and managing groups")


---

## admin/users/involve-business-users-with-tasks

# Involve business users with Tasks

Bridge the gap between process analytics and operational action by assigning tasks to the right users at the right time. Tasks bridge the gap between high-level process analytics and day-to-day operations. Instead of just identifying bottlenecks, you can assign specific, actionable items to the right users at the right time.

Expand all

[## Configuring the Automated Skill and Task Trigger](#UUID-d6cf62d2-78c7-8d96-6f92-5d5514b4ac38_section-id235528870203064_body)

This procedure covers the initial setup within Studio, from creating the Skill to defining the automated trigger and the task details.

1. **Create and Trigger the Skill**: In your package, create a new Skill and add a sensor. Use a Smart Sensor to automatically detect data incidents (Signals) based on your Knowledge Model filters, or use a Manual Sensor if you want users to trigger tasks ad-hoc.
2. **Define the Task & Actions**: Add a Create Task step. Configure the Task name, Assignee, and Attributes that will appear in the user's inbox. Then, create Task Actions to allow business users to push updates back to source systems or internal apps directly from the task.

[## Testing, deploying, and visualizing](#UUID-d6cf62d2-78c7-8d96-6f92-5d5514b4ac38_section-id235528870242225_body)

This procedure covers moving the task into production and making it visible to the end users.

1. **Validate and Publish**: Run a Test to check the execution logs for errors. Once verified, Publish the Skill; the Smart Sensor will now continuously monitor for new incidents and generate tasks automatically.
2. **Enable User Visualization**: To make tasks accessible, create an Action Table in a View. Link this table to a Profile View containing a Task List component, allowing users to see and manage their assigned work in context with the process data.

**Note**

If you are using the Smart Sensor, tasks will automatically move to "Resolved" once the underlying data incident is fixed in your source system. If using Manual Sensors, users must manually update the status.

[## Creating tasks manually](#UUID-d6cf62d2-78c7-8d96-6f92-5d5514b4ac38_id_InvolvebusinessuserswithTasks-ManualTaskcreation_body)

This process explains how to enable users to trigger tasks ad-hoc and how these differ from automated Smart Sensor tasks.

1. **Configure the Manual Trigger**: Follow the standard Skill setup, but select a Manual Sensor as the trigger. In the Create Task action, leave the Name, Description, and Assignee fields open; this allows the "Creator" (User A) to define these details at runtime for the "Assignee" (User B).
2. **Deploy for User Input**: Publish the Skill and add it to an Action Table or as a Default Action. Users can then manually trigger the task by selecting rows in a table. Unlike Smart Sensor tasks, these must be manually marked as resolved by a user once the work is complete.

Key differences:

Filter

- Feature
- Smart sensor tasks
- Manual tasks

| Feature | Smart sensor tasks | Manual tasks |
| --- | --- | --- |
| Trigger | Automatic (based on data incidents). | Manual (User-initiated). |
| Resolution | Auto-resolved when data is fixed. | Manually resolved by a user. |
| Identification | Standard task icon. | Highlighted with a "User Created" icon. |

| Feature | Smart sensor tasks | Manual tasks |
| --- | --- | --- |
| Trigger | Automatic (based on data incidents). | Manual (User-initiated). |
| Resolution | Auto-resolved when data is fixed. | Manually resolved by a user. |
| Identification | Standard task icon. | Highlighted with a "User Created" icon. |

**Tip**

You can combine these by making the creation of a Manual Task a "Task Action" within a Smart Sensor Task. This allows an automated alert to act as the parent for several sub-tasks assigned to different team members.

## Related topics

- [My Inbox](my-inbox.html "My Inbox")
- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")


---

## admin/users/managing-existing-users

# Managing existing users

Effective user management is the cornerstone of a secure and efficient Celonis environment. Beyond simple access, it ensures that your organization's process data remains protected while providing team members with the specific tools they need to drive value.

By proactively managing your user base, you can:

- **Optimize license utilization**: Ensure that limited seat allocations—such as Analyst or Admin roles—are assigned only to active contributors.
- **Maintain data governance**: Restrict sensitive process information to authorized personnel by aligning user roles with organizational responsibilities.
- **Streamline onboarding / offboarding**: Rapidly adjust permissions as team members join new projects or transition out of the organization.
- **Audit compliance**: Maintain a clear record of who has access to what, supporting both internal security policies and external regulatory requirements.

Expand all

[## Managing users in your team](#UUID-bb8a16b0-09e7-6eeb-1355-e68996ae7cbb_section-id235442466658919_body)

Once users have been invited to your team, team admins can manage them from the **Users** area:

1. Click **Admin & Settings - Users**.
2. Click the individual profile you want to manage.
3. Select from the following options:

   - **Change User Role**: Choose between Admin, Analyst, and Member. For more information about User roles, see: [User and team roles](user-profile.html "User and team roles").
   - **View Profile**: View users’ personal details, see and update their user roles, and lock their accounts.
   - **Lock / Unlock**: Lock or unlock users’ accounts, removing or restoring their permissions in your team. Locked users still count towards your seat allocation. For more information about locked users, see: [User locking policy](implementing-a-user-locking-policy.html "Implementing a user locking policy").
   - **Remove from Team**: Remove users’ permissions, meaning they can no longer access your team. Removed users are also removed from your seat allocations, giving you additional seats to use.
   - **View Permissions**: See an overview of users’ current permissions in your team within the browser.
   - **Email**: Compose an email to users in your default email tool. You can also compose an email to groups of users by clicking **Admin & Settings - Groups**.
   - **Export Permissions**: Export users' current permissions as a CSV file.

## Related topics

- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")
- [Groups](creating-and-managing-groups.html "Creating and managing groups")
- [User locking policy](implementing-a-user-locking-policy.html "Implementing a user locking policy")


---

## admin/users/managing-users,-licenses,-and-celonis-platform-activity

# Managing users, licenses, and Celonis Platform activity

After configuring your security settings and your permissions, you may need to manage your users, monitor your license consumption, and control your Celonis Platform activity.

Manage your team's access, monitor real-time license usage to avoid overages, and audit platform activity for security compliance:

## User access and lifecycle

These topics are for the day-to-day management of who can enter the platform:

- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")
- [Managing existing users](managing-existing-users.html "Managing existing users")
- [Implementing a user locking policy](implementing-a-user-locking-policy.html "Implementing a user locking policy")
- [Setting contact admins](setting-contact-admins.html "Setting contact admins")

## Monitoring and usage analytics

These topics help admins understand how the platform is being used and if they are hitting resource limits:

- [Monitoring licenses](monitoring-your-celonis-platform-license.html "Monitoring your Celonis Platform license")
- [Viewing platform adoption](platform-adoption-dashboard.html "Platform adoption dashboard")
- [Viewing user login history](viewing-user-login-history.html "Viewing user login history")
- [Managing system notifications](managing-your-system-notifications.html "Managing your system notifications")
- [Downloading API key usage](downloading-api-key-usage.html "Downloading API key usage")

## Security, auditing, and compliance

These are high-stakes topics usually handled by Security or IT teams to ensure the platform meets corporate standards:

- [Viewing audit logs](viewing-your-audit-logs.html "Viewing your audit logs")
- [Audit logs - Event details](audit-logs---event-details.html "Audit logs - Event details")

## Advanced configuration and tools

Technical "one-off" setups that aren't part of daily user management:

- [Enabling access to Celonis Process Management](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html "Enabling access to Celonis Process Management (CPM) from the Celonis Platform")
- [Configuring a custom help link](configuring-a-custom-help-link.html "Configuring a custom help link")
- [Accessing the download portal](download-portal.html "Accessing your download portal")


---

## admin/users/managing-your-user-profile

# Managing your user profile

You can manage your personal details, change your password, monitor your visible teams, and generate API keys via your user profile management screen.

To manage your user profile, click your profile on navigation bar and then click **Edit Profile**:

|  |
| --- |
|  |

**Note**

Some of the settings in your user profile may be managed via an external identity provider, such as your display name, email address, and password. If this is the case, the feature will be grayed out in your profile and this information must be updated on the identity provider directly.

For more information, see [Signing in](signing-in.html "Signing in to Celonis Platform").

Expand all

[## Profile management options](#UUID-764333ce-6f42-d185-bbfc-952168dd3583_section-idm4634192066339233686913177153_body)

When managing your user profile, you have the following options:

- **Updating Personal details**: Update your profile image, email address and display name here.
- **Changing your password**: Change your existing password if you enter your current password correctly. If you've forgotten your password, request a password reset from your sign-in screen.
- **Changing time zone and language preferences**: Select your preferred time zone and language.
- **Theme preset**: Select the color theme used in your Celonis Platform environment:

  - **System**: Uses the browser preferred theme settings.
  - **Light (default)**: Classic, clean light-themed interface.
  - **Dark**: Optimized for low light to reduce eye strain.
  - **High Contrast**: Designed for maximum readability and accessibility.

  **Note**

  These products don't support themes: Analysis, Action Flows, Advanced Views, Simulation Asset, Transformation Center, Business Miner, Forms, and Celonis Process Management (CPM).
- **On-screen notification duration time**: Select how long on-screen notifications within the Celonis Platform are displayed for:

  - 5 seconds (default).
  - 50 seconds.
  - Dismiss manually.
- **Enable notifications and notification time:**  Choose if you want to receive system notifications from your and if so, what time those notifications are sent. For more information, see [System notifications](managing-your-system-notifications.html "Managing your system notifications")
- **Create and manage API keys**: Creating an API means that the key's permissions mirror those of the user who created them. For security reasons, an API key is only displayed at the time it is created. Therefore you must create a new key if you no longer have access to any you create. For more information, see [API keys](creating-api-keys.html "Creating API keys")
- **Updating your visible teams**: Choose which teams are displayed in your team selector, available when clicking your profile icon on the menu:

  |  |
  | --- |
  |  |
- **Delete your membership**: Choose to delete your membership from the team you are currently accessing. This removes your access and permissions from your existing team, with no recovery available. If you are a member of other teams, you will still hold the relevant permissions in these.

  To regain access to the team you are removing yourself from, contact your administrator.
- **Delete your account**: Choose to delete your account, including all your active memberships to teams and the data associated to them. This removes your access and there is no recovery available.

## Related topics

- [Team name and logo](updating-your-team-name-and-logo.html "Updating your team name and logo")
- [Users, licenses, and activity](managing-users,-licenses,-and-celonis-platform-activity.html "Managing users, licenses, and Celonis Platform activity")
- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")


---

## admin/users/monitoring-data-and-license-consumption

# Monitoring data and license consumption

In addition to monitoring your data jobs and data model loads, you can also monitor how much data you're consuming across your data pools in your current Celonis Platform team. With your license indicating the volume of data you're allowed to consume per, your platform functionality could be reduced if you exceed this limit. As such, we recommend regularly reviewing your data extractions for any unnecessary data imports.

Expand all

[## Monitoring data consumption per Celonis Platform team](#UUID-ec053b94-1cec-9af1-bad4-6f5affbc54b0_section-idm4610074080836834194549468937_body)

You can view and monitor your data consumption across all data pools in your Celonis Platform team by clicking **Data - Data Integration**.

Your aggregate all-time data consumption figure for your data pools is then displayed:

|  |
| --- |
|  |

You can then click into this figure to see the break down of your individual data connections / tables. The following information is displayed here:

- **Total consumption**: This is the total data you're currently consuming in your Celonis Platform team.
- **Page consumption**: This is the total data consumed by the table extractions on the page you're currently viewing, with the maximum number of rows displayed set to 20.
- **Last updated**: The timestamp for the last aggregation of the data consumption totals.
- **Table**: Individual rows for each table, showing the data connection, table extracted, the size of the data consumed, and the last time that data was updated.

|  |
| --- |
|  |

[## Monitoring your license consumption](#UUID-ec053b94-1cec-9af1-bad4-6f5affbc54b0_section-idm4610073964705634194549514142_body)

The data you're consuming across your data pools is also displayed in your license monitoring page, with the data consumed being consistent between the two dashboards. This figure is listed in your license as Storage Utilization.

To view your storage utilization in your license, click **Admin & Settings - License**:

|  |
| --- |
|  |

As a team admin, you can then configure email notifications for when your data consumption hits a percentage of your total data allowance:

|  |
| --- |
|  |

## Related topics

- [Monitoring your data integrations](monitoring-your-data-integrations.html "Monitoring your data integrations")
- [Enabling data job and data job schedule alerts](enabling-data-job-alerts.html "Enabling data job and data job schedule alerts")
- [Viewing data job execution history](viewing-data-job-execution-history.html "Viewing data job execution history")


---

## admin/users/monitoring-your-celonis-platform-license

# Monitoring your Celonis Platform license

Your license defines what your team can use within the and how much they can consume by doing so. Should you hit your license limits at any time, your Celonis Platform functionality may be reduced. To avoid reduced functionality, you should familiarize yourself with the four key metrics.

You can view your license limits by clicking **Admin & Settings - License**:

|  |
| --- |
|  |

Licenses are based on four key metrics:

1. [Analytics Processing Capacity (APC) consumption](monitoring-your-celonis-platform-license.html#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4655954794788833636484564651 "1. Analytics Processing Capacity (APC) consumption")
2. [User limits](monitoring-your-celonis-platform-license.html#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4602772889192033636484722846 "2. User limits")
3. [Process limits](monitoring-your-celonis-platform-license.html#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4655954796088033636484848165 "3. Process limit")
4. [Expiration date](monitoring-your-celonis-platform-license.html#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4577255696478433636484899091 "4. Expiration date")

**Note**

Your license might have unlimited access to one or more of these key metrics.

Expand all

[## 1. Analytics Processing Capacity (APC) consumption](#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4655954794788833636484564651_body)

Measured in data volume, with admins able to request a notification when this reaches a percentage of data used. Should you reach your APC consumption limit, we recommend reviewing your data models extractions for any unnecessary data imports.

You can also review your data model consumption by clicking **Data - Data Integration**:

|  |
| --- |
|  |

Your current data usage is then displayed:

|  |
| --- |
|  |

[## 2. User limits](#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4602772889192033636484722846_body)

Total users shows the overall user limit that is purchased for the team. Admin / Analysts show how many of these user seats can be configured to be Admin / Analysts.

You can manage your user limits by monitoring usage and applying user locking policies.

|  |
| --- |
|  |

[## 3. Process limit](#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4655954796088033636484848165_body)

Measured in total number of processes allowed.

Should you reach your process limit, we recommend reviewing your data models and focusing on how many events they are consuming.

[## 4. Expiration date](#UUID-e96689d5-2940-fadb-8209-98f1d166c89e_section-idm4577255696478433636484899091_body)

The date until which your license / access remains valid.

## Related topics

- [Platform Adoption Monitor app](platform-adoption-monitor-app.html "Platform Adoption Monitor app")
- [Platform adoption dashboard](platform-adoption-dashboard.html "Platform adoption dashboard")
- [Audit logs](viewing-your-audit-logs.html "Viewing your audit logs")


---

## admin/users/recovery-codes-for-celonis-user-profile

# Recovery codes for Celonis user profile

Recovery codes are one-time-use codes that act as a safety net if you lose access to your primary two-factor authentication (2FA) method, like your phone or authenticator app. They ensure you can regain access to your account without compromising security.

Recovery codes provide a fail-safe to prevent permanent account lockout. They allow you to maintain account security even when your primary 2FA method isn’t available, giving you peace of mind and reducing reliance on customer support for account recovery.

Expand all

[## Generating a recovery code](#UUID-2b418269-43de-389e-7790-946a998591f5_section-id235440822629901_body)

To generate or regenerate a recovery code for your Celonis Platform user account:

1. In your Celonis Platform instance, click your **profile icon** > **Edit profile**.
2. In your profile view, click **Edit personal details**.
3. From the left-hand side list, select **Two-Factor Authentication**.
4. Scroll down to the Two-Factor authentication Recovery Codes section, and click **Regenerate recovery codes**.

   Celonis Platform will email you a verification token.
5. Enter the verification token.

   A set of recovery codes is generated for you. Download, print, or copy them. Make sure to keep your recovery codes in a secure location. You must generate a new code set if you use all the codes from the list. Keep in mind that generating a new recovery code set will make any previously generated codes obsolete.

[## Best practice for recovery codes](#UUID-2b418269-43de-389e-7790-946a998591f5_section-id235440825433463_body)

Think of recovery codes as your “emergency key” to your account—always keep them safe, and you’ll never be locked out.

- Treat recovery codes like passwords: keep them private and secure.
- Store them offline or in a trusted password manager.
- Regenerate codes after use or if compromised.

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [Signing in](signing-in.html "Signing in to Celonis Platform")
- [Managing your user profile](managing-your-user-profile.html "Managing your user profile")


---

## admin/users/replacing-user-ids

# Replacing User IDs

You can use PQL to display the user name and / or email of Celonis Platform users, replacing the user IDs that are stored in augmented tables for components such as tasks, comments, and augmented attributes. By replacing the user ID, your app users can then see information such as the name of the task creator, who an assignee is, and which user made the latest updates to augmented attributes.

To replace the user IDs with user name and / or email address, you need to pull the desired data into a Data Pool. The data can then be added to a table in a Data Model, with the newly created table used to reference the required table using a [LOOKUP](https://docs.celonis.com/en/lookup.html) operator.

An example of the [LOOKUP](https://docs.celonis.com/en/lookup.html) operator in use:

To replace the user IDs, complete the following sub-tasks in order:

## Related topics

- [Comments](configuring-comments.html "Configuring comments")
- [Scheduling the execution of data jobs](scheduling-the-execution-of-data-jobs.html "Scheduling the execution of data jobs")
- [LOOKUP](https://docs.celonis.com/en/lookup.html)


---

## admin/users/trigger-warning-email-grouped-by-contact-in-business-view

# Trigger Warning Email grouped by contact in Business View

Manual order confirmation requests can be tedious and prone to duplication. This automation solution allows you to trigger an Action Flow directly from a Business View. It automatically groups Purchase Orders by contact person, ensuring each contact receives a single, consolidated warning email instead of multiple individual notifications.

The following Action Flow automates the notification process through these three key stages:

1. **Collect bundles**: A Custom Webhook receives data bundles sent from a Skill. The flow is configured to "batch" these bundles to process multiple orders simultaneously.
2. **Query purchase data**: The system retrieves detailed information (such as Purchasing Document Dates) from the Data Model for all Purchase Orders received via the Webhook.
3. **Consolidate and send**: The Text Aggregator groups the orders by the contact's email address and generates an HTML table. Finally, the Email Module sends one comprehensive report to each contact person.

|  |
| --- |
|  |

Expand all

[## Configuring the Action Flow - Part 1](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_UUID-02c2ba07-5bcd-124b-c7fb-8bfa28e002d5_body)

Below you will find the step-by-step guide for configuring each module of the above Action Flow.

[### 1. Receive Skill Bundles (Part 1)](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-1ReceiveSkillBundlesPart1_body)

**Use Skill Trigger instead**

If you want to send one email for each selected row of the table in the Business View you can (and should) use the Skill Trigger module in combination with the Execute Action Flow action in Skills. Set it up as described in [this documentation](execute-action-flows-in-skills.html "Execute Action Flows in Skills"). We only need the Webhook version when we do not want to send a mail for each table row but one for several table rows (so when we need to aggregate the data within the Action Flow).

**Advantage of the Skill Trigger version:** You will trigger the mail immediately when executing in the Business View. The Webhook version can have a delay of up to 2 Minutes.

|  |
| --- |
|  |

|  |
| --- |
|  |

We set up a Custom Webhook to connect a Skill with this Action Flow to be able to trigger the Acton Flow once for several Bundles sent by the Skill.

|  |
| --- |
|  |

**Configuration:**

**Action Flows Module:** Webhooks

**Action:** Custom Webhook

**Webhook:** Add a new Webhook and name it.

*Optional: You can also allow list desired IP addresses to make sure no one else can send data to your hook. In addition, you can define a data structure and all incoming data bundles which won't have that structure are ignored.*

**Save**

Be sure to save the Action Flow before heading to Skills.

[### Configuring Skill](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-ConfiguringSkill_body)

Below you will find the step-by-step guide for configuring each action of the skill you need to trigger the Action Flow once for several bundles.

1. Select the **Skill** option.

|  |
| --- |
|  |

2. Select **Manual Sensor**.

|  |
| --- |
|  |

3. Click the **Add New Input** button to transfer some data from the Action Flow to the Skill at a later time.

|  |
| --- |
|  |

4. Choose a name for the input to come by the Business View and define the format.

|  |
| --- |
|  |

-------------------------------------------------

|  |
| --- |
|  |

5. Add the 'Webhook Request' action as a next step.

|  |
| --- |
|  |

6. Enter the following Webhook settings:

**Method:** POST

**URL:** Paste the URL of the Webhook module in the Action Flow.

**Data (JSON Format):** The inputs to be transferred to the Action Flow in JSON format.

```
{
"PO":"${b1["PurchaseOrder"]}",
"Email":"${b1["Email"]}",
"POItem":"${b1["PurchaseOrderItems"]}"
}
```

|  |
| --- |
|  |

**Save**

Be sure to save the Skill before heading to Action Flows.

[## Configuring the Action Flow - Part 2](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_UUID-f3fb8987-083f-d01a-f3d0-d7bec180b51b_body)

Below you will find the step-by-step guide for configuring each module of the above Action Flow.

[### 1. Receive Skill Bundles (Part 2)](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-1ReceiveSkillBundlesPart2_body)

|  |
| --- |
|  |

**Configuration:**

**Action Flows Module:** Webhooks

**Action:** Custom Webhook

**Determine data structure:** To connect the Skill webhook to the Action Flow and show the webhook what kind of data will be sent you can test the Skill. You have to provide example data for the inputs from the Business View when testing or trigger the Business View directly. The webhook will determine the data structure. The Webhook should show the 'successfully determined' confirmation and you should be able to find the defined variables as item after the webhook. In the example we would find Order Id, Requested Delivery Date and Customer.

**IMPORTANT**

**Advanced Setting - Maximum number of results:** The default value is 2, but you can choose **the maximum amount of bundles you want to include in one Action Flow run** in one period (e.g. every 2 minutes). The time period will be defined later.

|  |
| --- |
|  |

|  |
| --- |
|  |

|  |
| --- |
|  |

[### 2. Query further information](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-2Queryfurtherinformation_body)

After receiving data from the Webhook we use this to query more data for the specific Purchase Orders like the Purchasing Document Date.

|  |
| --- |
|  |

**Configuration:**

**Action Flows Module:** Celonis

**Action:** Query Data

**Connection:** Set up a User- or AppKey Connection

**Data Pool:** Choose your P2P Data Pool

**Data Model:** Choose your P2P Data model

**Columns:**

required:

- EKKO.EBELN

optional:

- EKKO.BEDAT

**Filter:** We filter on the Purchase Orders we got by the Webhook.

**Note**

You may have to run the Flow once (triggered by the skill) to get the output items of Query Data in the following module

|  |
| --- |
|  |

[### 3. Build HTML Table](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-3BuildHTMLTable_body)

In this module we combine the data from the webhook and the query data module and build the body of a HTML table to sent in the following mail module. In addition we group here by the contact to just sent one mail with all the Purchase Order we want to warn them about.

|  |
| --- |
|  |

**Configuration:**

**Action Flows Module:** Tools

**Action:** Text aggregator

**Source Module:** choose the Webhook as Source module (NOT QUERY DATA)

**Group by (advanced settings):** Email (to send one email per contact)

To build up an html table you have to define a structure with table rows (<tr>) and table cells (<td>) which will later be included in a table structure to get the right format. Here you have the chance to format dates as we show it with the Delivery Dates.

Add for each column you want to have in your resulting table the structure **<td> data of the column </td>**.

**Text:**

```
<tr>
<td>{{7.PO}}</td>
<td>{{formatDate(2.`Purchasing Document Date`; "DD.MM.YYYY")}}</td>
<td>{{7.POItem}}</td>
</tr>
```

**Without grouping**

If you do not want to group the POs by the email you have to select **Stop processing after an empty aggregation** to not send empty mails when the webhook doesn't receive anything.

Why? The text aggregator doesn't notice that there is no input within the field called 'Text' as we always have the table structure there(<tr><td>...). If you group by email and the webhook didn't receive any data the text aggregator tries to group by the mail and realizes that there is no data for that. So when not using the Group by field we have to tell the text aggregator module in another way that there were no input for the table. Thus we need to tick the 'Stop processing after an empty aggregation'.

|  |
| --- |
|  |

[### 4. Send Table to Assignee](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-4SendTabletoAssignee_body)

|  |
| --- |
|  |

**Configuration:**

**Action Flows Module:** Email

**Action:** Send an Email

The screenshot below shows how this module has been configured with our demo data.

**To:** Take the 'Key' item of the previous modules (we grouped by email)

**Subject:** Define the subject of the mail

**Content Type:** HTML

**Content:**

```
<html>

<head>

<style> table, th, td {border: 1px solid black;border-collapse: collapse;} </style>

</head>

<body>

<h2> Warning Order Confirmation </h2>

<p> We need a confirmation of order for the Purchase Orders listed below.</p>

<table style="width:100%">

<tr>

<th>Purchase Order</th>

<th>Purchasing Document Date</th>

<th>Purchase Order Item</th>

</tr>

{{10.text}}

</table>

</body>

</html>
```

**HTML Tables**

Find more information on how to send HTML tables in a mail and how to adapt the HTML code to your needs [in this template](creating-an-html-table-from-a-celonis-query-data-output.html "Creating an HTML table from a Celonis Query Data output").

|  |
| --- |
|  |

[### 5. Schedule the Action Flow (Webhook)](#UUID-4fcf4897-b1d8-838e-f0fc-33a3e650edeb_id_TriggerWarningEmailgroupedbycontactinBusinessView-5ScheduletheActionFlowWebhook_body)

To make sure to collect all bundles selected in the Business View we schedule the Webhook to get triggered every second minute. This is also the maximum delay time of the mail sent (if the webhook just triggered when triggering the skill). To do so make sure to **save first** and then publish the Action Flow by clicking on the top right blue button called 'Publish Package'.

You are good to go when you have the purple chip with 'Published' beyond the green run once button.

By clicking on the clock symbol in this published mode you open up the schedule settings where you can define how often and on which time the message should be send.

**Run Action Flow:** At regular intervals

**Minutes: 2** (default is 15)

|  |
| --- |
|  |

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## admin/users/user_name

# USER\_NAME

## Description

Returns the celonis username of the current user.

## Syntax

```
USER_NAME()
```

|  |
| --- |
| **[1]**  This example shows the output of the `USER_NAME` function executed by the user `test.user@example.com`: |
| | Query | | --- | | **Column1**  ``` USER_NAME ( ) ``` | |
| | Input | Output | | --- | --- | |  | **Result**  | Column1 | | --- | | test.user@example.com | | |

|  |
| --- |
| **[2]**  In this example, only the user `permitted.user@example.com` is allowed to see the value column of the example table. All other users will only see NULL values in this column. This example shows the output when it is executed by the user `test.user@example.com`, who is not allowed to see the value column.  Please note that this solution should not be used to prevent users from seeing highly confidential data, as the query can be modified accordingly. To securely hide full rows for specific users or user groups, Data Permissions should be used. Search for *Data Permissions* on this help page for more information. |
| | Query | | --- | | **Column1**  ``` "CaseTable"."companyCode" ```  **Column2**  ``` CASE WHEN USER_NAME ( ) = 'permitted.user@example.com' THEN "CaseTable"."value" ELSE NULL END ``` | |
| | Input | Output | | --- | --- | | **CaseTable**  Filter  - caseId : int - companyCode : string - value : int  | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 |   | caseId : int | companyCode : string | value : int | | --- | --- | --- | | 1 | '001' | 600 | | 2 | '001' | 400 | | 3 | '001' | 200 | | 4 | '002' | 300 | | 5 | '002' | 300 | | 6 | '003' | 200 | | **Result**  | Column1 : string | Column2 | | --- | --- | | '001' | null | | '001' | null | | '001' | null | | '002' | null | | '002' | null | | '003' | null | | |


---

## admin/users/user-attributes--from-2-8-1-

# User attributes (from 2.8.1)

User attributes are custom attributes that are used to refine Task Mining data. If you define user attributes for team and geographic location, for example, you can analyze your captured Task Mining data at team and geographic location level. A maximum of five user attributes can be defined for each Task Mining project. Once set up, users will be prompted to select user attribute values the next time they start the Task Mining Client software.

User attributes are used in the **Team Insights** tab of the Workforce Productivity app which is a Studio View. For more information, see the [Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app").

**Note**

When defining user attributes, ensure that individual users cannot be identified by:

- Ensuring there are sufficient users per individual attribute value to keep users from being identified.
- Assessing whether custom Data Pool permissions should be added to hide users if groups with fewer than five users if required.

Expand all

[## Before you begin](#id830591_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Configured [Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app")

[## Defining user attributes in the Configuration Editor](#UUID-e8a47e34-ebb7-aee9-0629-41d823646e60_section-id235233617126982_body)

1. In the Task Mining Configuration Editor, select User Attributes.

   The **User Attributes** screen appears.
2. Select the **Edit** button  to add a new user attribute or refine an existing user attribute.
3. Enter:

   - A label for your attribute in the **Label** field.
   - Values for your attributes in the **Values** field.

   |  |
   | --- |
   |  |

   **Note**

   You cannot change the name of the custom attribute here.
4. Select the **Field mandatory** check box to make this a required field.

   If selected, users will have to enter this information the next time they start the Task Mining Client software.
5. Select **OK**.
6. In the Task Mining Configuration Editor, select **Event Processing Rules**.

   The **Event Processing** screen appears.
7. For each event processing rule:

   - Select the **Edit** button .
   - Select **Logging**.
   - Ensure any custom attributes you added are selected.

     |  |
     | --- |
     |  |
8. Save and upload your configuration file.

   The next time users start the Task Mining Client software, they’ll be prompted to add this information.

## Related topics

- [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings")
- [Configuring the Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app")


---

## admin/users/user-roles-by-feature

# User Roles by Feature

Filter

- User Roles OverviewFeatures
- Viewer
- Author
- Architect
- Approver
- Analyst
- Administrator

| User Roles Overview  Features | Viewer | Author | Architect | Approver | Analyst | Administrator |
| --- | --- | --- | --- | --- | --- | --- |
| Define customer experience management models. |  | x | x |  |  | x |
| Modeling Customer Journey Maps |  | x | x |  |  | x |
| Generate Customer Journey Map | x | x | x | x | x | x |
| Define customer touchpoints |  | x | x |  |  | x |
| Define Stakeholders |  | x | x |  |  | x |
| Determine and define personas. |  | x | x |  |  | x |
| Survey and define the voice of the customer |  | x | x |  |  | x |
| Define distribution channels |  | x | x |  |  | x |
| Modeling processes according to the modeling standard BPMN 2.0 |  | x | x |  |  | x |
| Extend processes with data objects and attributes (eBPMN 2.0 extension) |  | x | x |  |  | x |
| Semantically guided modeling |  | x | x |  |  | x |
| Modeling process interfaces |  | x | x |  |  | x |
| Modeling standardized process steps (Best Practice Tasks) |  | x | x |  |  | x |
| Model and orchestrate end-to-end processes (E2E) and business transactions (scenarios) |  | x | x |  |  | x |
| Automatically update process layout during process modeling (Auto-Layout function) | x | x | x | x | x | x |
| Generate different process layouts automatically. | x | x | x | x | x | x |
| Free graphical design of processes and process maps (HTML editor) |  | x | x |  |  | x |
| Initially record processes in tabular form (automatic generation of graphics) |  | x | x |  |  | x |
| Maintain and detail processes in tables (automatic graphics generation) |  | x | x |  |  | x |
| Connect more objects with tasks (eBPMN) |  | x | x |  |  | x |
| Maintain additional attributes |  | x | x |  |  | x |
| Differentiate roles according to the duty to cooperate (RASCI) |  | x | x |  |  | x |
| Differentiate groups according to the duty to cooperate (RASCI) |  | x | x |  |  | x |
| Connect process interfaces in the start and end event. |  | x | x |  |  | x |
| Link predecessor and successor processes |  | x | x |  |  | x |
| Upload and graphically visualize process workshop images. |  | x | x |  |  | x |
| Determine the degree of process maturity. |  | x | x |  |  | x |
| Aggregate process maturity level |  | x | x |  |  | x |
| Validate process semantics (check modeling errors) |  | x | x |  |  | x |
| Show BPMN Icons on process flow objects. |  |  |  |  |  | x |
| Store audit results |  | x | x | x |  | x |
| Locking and unlocking process processing |  | x | x |  |  | x |
| Display connected objects in the process in a table |  | x | x |  |  | x |
| Display life cycle diagrams (audit trail) of all process versions. |  | x | x |  |  | x |
| Compare released and edited process versions (Process Comparison Editor) |  | x | x |  |  | x |
| Define organizational models/diagrams. |  | x | x |  |  | x |
| Automatically generate organizational models/charts graphically. |  | x | x |  |  | x |
| Add and define positions in the organization model. |  | x | x |  |  | x |
| Detail organizations with attributes and related objects |  | x | x |  |  | x |
| Define groups with positions and further details. |  | x | x |  |  | x |
| Define and detail locations (locations) |  | x | x |  |  | x |
| Define skills centrally |  | x | x |  |  | x |
| Maintain existing user skills. |  | x | x |  |  | x |
| Maintain the required skills in the position. |  | x | x |  |  | x |
| Reuse objects (roles, organizational units ...) |  | x | x |  |  | x |
| Create a suggestion list when entering glossary names (Auto-Complete function) |  | x | x |  |  | x |
| Search for objects in lists and architectures via a dialog. |  | x | x |  |  | x |
| Add attachments as link. |  | x | x |  |  | x |
| Upload attachments (documents) |  | x | x |  |  | x |
| Upload images and visualize them directly. |  | x | x |  |  | x |
| Intelligent linking of plants directly with connected systems (additional services |  | x | x |  |  | x |
| Formatting descriptions with HTML editor |  | x | x |  |  | x |
| Define scope (scope filter) via organization, locations, and tags. |  | x | x |  |  | x |
| Save intermediate states of the modeling automatically (Auto-Save) |  | x | x |  |  | x |
| Copy process flow objects within a diagram |  | x | x |  |  | x |
| Copy process flow objects to other diagrams. |  | x | x |  |  | x |
| Cut out process flow objects within a diagram (Drag and Drop. |  | x | x |  |  | x |
| Cut process flow objects into another diagram (drag and drop) |  | x | x |  |  | x |
| Authorize editing of diagrams and objects by multiple authors. |  |  | x |  |  | x |
| Translate diagram and object details. |  | x | x |  |  | x |
| Automated translation of diagram and object details (Online Translation Service) |  | x | x |  |  | x |
| List connected diagrams and objects in an evaluation group as links |  | x |  |  |  | x |
| Display version history of all versions of diagrams and objects |  | x |  |  |  | x |
| Generate standard manuals as Word files. |  | x |  |  |  | x |
| Generate process graphics as Word file. |  | x |  |  |  | x |
| Generate individual customer evaluations as Word files. |  | x |  |  |  | x |
| Structure process models hierarchically |  |  | x |  |  | x |
| Move process models |  |  | x |  |  | x |
| Create new versions of released diagrams |  |  | x |  |  | x |
| Consolidate diagrams |  |  | x |  |  | x |
| Delete not-released diagrams |  |  | x |  |  | x |
| Generate graphical navigation structure automatically. | x | x | x | x | x | x |
| Sort processes in the architecture with sort number |  |  | x |  |  | x |
| Export BPMN 2.0 diagram |  |  |  |  |  | x |
| Import BPMN 2.0 diagram |  |  |  |  |  | x |
| Export Celonis Process Management Diagram |  |  |  |  |  | x |
| Import Celonis Process Management Diagram |  |  |  |  |  | x |
| Import Word document (prerequisite: configured import template) |  |  |  |  |  | x |
| Import XML |  |  |  |  |  | x |
| Import ARIS |  |  |  |  |  | x |
| Import Visio data |  |  |  |  |  | x |
| Export Excel mass data processing (translation) |  |  |  |  |  | x |
| Import Excel mass data processing (translation) |  |  |  |  |  | x |
| Import and update organizational hierarchy. |  |  |  |  |  | x |
| Import and update IT architecture |  |  |  |  |  | x |
| Import and update risk and control architecture |  |  |  |  |  | x |
| Requirements can be imported and updated. |  |  |  |  |  | x |
| Use BPMN 2.0 standard. | x | x | x | x | x | x |
| Extended BPMN 2.0 standard modeling standard | x | x | x | x | x | x |
| ArchiMate 3.0 Standard | x | x | x | x | x | x |
| Build IT landscape | x | x | x | x | x | x |
| Map and manage organizational structure, including positions | x | x | x | x | x | x |
| Implement Customer Experience Management (CEM) | x | x | x | x | x | x |
| Customer Journey Mapping | x | x | x | x | x | x |
| Create strategy and target diagrams (target trees, measures including status, etc.) | x | x | x | x | x | x |
| Define key figure trees and reports with report chapters. | x | x | x | x | x | x |
| Create project portfolio | x | x | x | x | x | x |
| Manage Skills | x | x | x | x | x | x |
| Set up the product portfolio. | x | x | x | x | x | x |
| Manage Learnings and Trainings | x | x | x | x | x | x |
| Present risk/control management | x | x | x | x | x | x |
| Manage requirements | x | x | x | x | x | x |
| Deposit standards and standard chapters | x | x | x | x | x | x |
| Model and define objects |  | x | x |  |  | x |
| Detail objects with HTML editor attributes |  | x | x |  |  | x |
| Detailing objects with attributes |  | x | x |  |  | x |
| Connecting objects with other objects |  | x | x |  |  | x |
| Release Object Versions |  | x | x |  |  | x |
| Create an object version. |  | x | x |  |  | x |
| Consolidate objects |  | x | x |  |  | x |
| Filter objects |  | x | x |  |  | x |
| Structure objects hierarchically |  | x | x |  |  | x |
| Disable architecture in the system facet |  | x | x |  |  | x |
| Store documents and link them to processes |  | x | x |  |  | x |
| Evaluation groups Display connections to other objects/diagrams. | x | x | x | x | x | x |
| Show individual entry pages (home pages) | x | x | x | x | x | x |
| Display profiles for all diagram and object contents | x | x | x | x | x | x |
| Generate various graphical diagram representations. | x | x | x | x | x | x |
| Display hierarchies in a navigation tree. | x | x | x | x | x | x |
| Display several process levels in one surface side by side (2-levels) | x | x | x | x | x | x |
| Process maps, graphical visualization | x | x | x | x | x | x |
| See and open stored attachments easily. |  |  |  |  |  |  |
| Print diagrams directly via browser print | x | x | x | x | x | x |
| Make personal user settings: Languages. | x | x | x | x | x | x |
| Make personal user settings: List sizes. | x | x | x | x | x | x |
| Make personal user settings: Selected roles. | x | x | x | x | x | x |
| Automatic translation function with Deepl.com |  | x | x |  |  | x |
| Subscribe to content (subscription service) | x | x | x | x | x | x |
| Info-Mail for release changes | x | x | x | x | x | x |
| Subscribe to content with multiple selections. | x | x | x | x | x | x |
| Select subscriptions for categories. | x | x | x | x | x | x |
| Combine subscriptions and favorites (button with fly-out) | x | x | x | x | x | x |
| Show a list of all changes in chronological order | x | x | x | x | x | x |
| Define favorites | x | x | x | x | x | x |
| Favorite Service: Manage/Group Favorites | x | x | x | x | x | x |
| Favorite Service: Share Favorites | x | x | x | x | x | x |
| Create permanent links from versions. | x | x | x | x | x | x |
| Create permanent links from version independent versions. | x | x | x | x | x | x |
| Create permanent links from the selection (in versions) | x | x | x | x | x | x |
| Provide a central glossary for all users. | x | x | x | x | x | x |
| Mass edit linked attributes. |  |  | x |  |  | x |
| Use the Training Assistant app to communicate specific expertise | x | x | x | x | x | x |
| Change attributes in released processes or objects |  | x | x |  |  | x |
| Role entry for all employees with connected home page | x | x | x | x | x | x |
| Create possible variants in the administration area |  | x | x |  |  | x |
| Create variants |  | x | x |  |  | x |
| Modeling variant processes |  | x | x |  |  | x |
| Complete localization of variant processes |  | x | x |  |  | x |
| Localize individual process flow objects of a variant process. |  | x | x |  |  | x |
| Completely de-localize variant processes |  | x | x |  |  | x |
| De-localize individual process flow objects of a variant process. |  | x | x |  |  | x |
| Update variant processes  Standard search: Search diagrams, objects, and information globally |  | x | x |  |  | x |
| Expert search: Search/filter in specific attributes. | x | x | x | x | x | x |
| Expert search: Search with operators | x | x | x | x | x | x |
| Expert search: Search with asterisks and quotation marks | x | x | x | x | x | x |
| Direct access to the selected search result via a link in the details area | x | x | x | x | x | x |
| Filter search results in the list view | x | x | x | x | x | x |
| Apply scope (scope filter) to search results (can be activated/deactivated) | x | x | x | x | x | x |
| Adjust the navigation tree on the left and the graphical display according to the set scope filter. | x | x | x | x | x | x |
| Apply Scope filter to processes and objects in list view (can be activated/deactivated) | x | x | x | x | x | x |
| Enable filtering for manuals. | x | x | x | x | x | x |
| Create new diagrams or object versions. |  | x | x |  |  | x |
| Delete diagrams and objects that are being edited |  | x | x |  |  | x |
| Create a new version of released processes and objects. |  | x | x |  |  | x |
| Create IDs for objects. |  |  |  |  |  | x |
| Organise inputs/outputs in your own architecture |  |  |  |  |  | x |
| Automatic versioning of processes and objects |  | x | x |  |  | x |
| Sharing: add more approver/approver groups (optional) |  | x | x |  |  | x |
| Release: Validate methodical rules in the process |  | x | x |  |  | x |
| Release: Send diagrams and objects to the release |  | x | x |  |  | x |
| Release: Ignore validation rule warnings to start the release (enable/disable) |  | x | x | x |  | x |
| Release: Define diagram and object validity start "Valid from |  | x | x |  |  | x |
| Release: Enter reason for revision (must have attributes) |  | x | x |  |  | x |
| Release: Automatically forward requests for release to approvers |  | x | x | x |  | x |
| Approval: Inform approvers by e-mail about pending requests for approval (optional) |  | x | x | x |  | x |
| Sharing: Automatically create and view requests (tasks) for approvers |  | x | x | x |  | x |
| Release: Manage requests (tasks) |  | x | x | x |  | x |
| Release: Call process/object directly |  | x | x | x |  | x |
| Release: Approve or reject the release of processes and objects |  | x | x | x |  | x |
| Set processes and objects to 'Expired. |  | x | x | x |  | x |
| Review: Define Reviewer | x | x | x | x | x | x |
| Review: Automatically forward request to the reviewer | x | x | x | x | x | x |
| Review: Notify Reviewer | x | x | x | x | x | x |
| Request: Send request for processes or objects | x | x | x | x | x | x |
| Request: Automatically forward the request to the responsible person | x | x | x | x | x | x |
| Request: Display/change the processing status of the request | x | x | x | x | x | x |
| Request: Call process/object directly | x | x | x | x | x | x |
| Request: Accept or reject a request | x | x | x | x | x | x |
| Define authorization levels |  |  | x |  |  | x |
| Assign permissions to individual users or user groups. |  |  | x |  |  | x |
| Set permissions on diagrams or objects |  |  | x |  |  | x |
| Assign permissions for facets. |  |  | x |  |  | x |
| Assign authorizations for architectures. |  |  | x |  |  | x |
| Create document templates for processes and documents. |  |  |  |  |  | x |
| Edit document templates for processes and documents. |  |  |  |  |  | x |
| Release document templates for processes and documents |  |  |  |  |  | x |
| Create document templates for the remaining facets |  |  |  |  |  | x |
| Edit document templates for other facets. |  |  |  |  |  | x |
| Release document templates for other facets |  |  |  |  |  | x |
| Open-generated PDF manuals. | x | x | x | x | x | x |
| Automatically generate PDF manuals upon approval. | x | x | x | x | x | x |
| Manage manual templates centrally. |  |  |  |  |  | x |
| Use standard reporting |  |  |  |  | x | x |
| Set up customer-specific reporting (optional) |  |  |  |  | x | x |
| Configure method |  |  |  |  |  | x |
| Hide, rename, or add attributes/objects (Advanced Configuration) |  |  |  |  |  | x |
| Manage users and user groups. |  |  |  |  |  | x |
| Authentication provider: Use OAuth |  |  |  |  |  | x |
| Define permissions for facets. |  |  |  |  |  | x |
| Define variant types |  |  |  |  |  | x |
| Define Tags |  |  |  |  |  | x |
| Set review date |  | x | x | x | x | x |
| Configure languages (default: DE/EN) |  |  |  |  |  | x |
| Configure default or optional language |  |  |  |  |  | x |
| Making languages available for reporting |  |  |  |  |  | x |
| Create and upload a new user interface language. |  |  |  |  |  | x |
| Configure notifications by e-mail or tasks |  |  |  |  |  | x |
| Adjust release cycle |  |  |  |  |  | x |
| Enable and disable features |  |  |  |  |  | x |
| Customize CI |  |  |  |  |  | x |
| Configure profiles |  |  |  |  |  | x |
| Create and customize stereotypes (subtypes) for diagrams/objects. |  |  |  |  |  | x |
| Configure Manuals |  |  |  |  |  | x |
| Define validation rules |  |  |  |  |  | x |
| Configure Service and WebHooks |  |  |  |  |  | x |
| Power BI interface (Data Warehouse) |  |  |  |  | x | x |
| SAP Enable Now interface |  |  |  |  |  | x |
| Open REST API interface to Celonis Process Management |  |  |  |  |  | x |

| User Roles Overview  Features | Viewer | Author | Architect | Approver | Analyst | Administrator |
| --- | --- | --- | --- | --- | --- | --- |
| Define customer experience management models. |  | x | x |  |  | x |
| Modeling Customer Journey Maps |  | x | x |  |  | x |
| Generate Customer Journey Map | x | x | x | x | x | x |
| Define customer touchpoints |  | x | x |  |  | x |
| Define Stakeholders |  | x | x |  |  | x |
| Determine and define personas. |  | x | x |  |  | x |
| Survey and define the voice of the customer |  | x | x |  |  | x |
| Define distribution channels |  | x | x |  |  | x |
| Modeling processes according to the modeling standard BPMN 2.0 |  | x | x |  |  | x |
| Extend processes with data objects and attributes (eBPMN 2.0 extension) |  | x | x |  |  | x |
| Semantically guided modeling |  | x | x |  |  | x |
| Modeling process interfaces |  | x | x |  |  | x |
| Modeling standardized process steps (Best Practice Tasks) |  | x | x |  |  | x |
| Model and orchestrate end-to-end processes (E2E) and business transactions (scenarios) |  | x | x |  |  | x |
| Automatically update process layout during process modeling (Auto-Layout function) | x | x | x | x | x | x |
| Generate different process layouts automatically. | x | x | x | x | x | x |
| Free graphical design of processes and process maps (HTML editor) |  | x | x |  |  | x |
| Initially record processes in tabular form (automatic generation of graphics) |  | x | x |  |  | x |
| Maintain and detail processes in tables (automatic graphics generation) |  | x | x |  |  | x |
| Connect more objects with tasks (eBPMN) |  | x | x |  |  | x |
| Maintain additional attributes |  | x | x |  |  | x |
| Differentiate roles according to the duty to cooperate (RASCI) |  | x | x |  |  | x |
| Differentiate groups according to the duty to cooperate (RASCI) |  | x | x |  |  | x |
| Connect process interfaces in the start and end event. |  | x | x |  |  | x |
| Link predecessor and successor processes |  | x | x |  |  | x |
| Upload and graphically visualize process workshop images. |  | x | x |  |  | x |
| Determine the degree of process maturity. |  | x | x |  |  | x |
| Aggregate process maturity level |  | x | x |  |  | x |
| Validate process semantics (check modeling errors) |  | x | x |  |  | x |
| Show BPMN Icons on process flow objects. |  |  |  |  |  | x |
| Store audit results |  | x | x | x |  | x |
| Locking and unlocking process processing |  | x | x |  |  | x |
| Display connected objects in the process in a table |  | x | x |  |  | x |
| Display life cycle diagrams (audit trail) of all process versions. |  | x | x |  |  | x |
| Compare released and edited process versions (Process Comparison Editor) |  | x | x |  |  | x |
| Define organizational models/diagrams. |  | x | x |  |  | x |
| Automatically generate organizational models/charts graphically. |  | x | x |  |  | x |
| Add and define positions in the organization model. |  | x | x |  |  | x |
| Detail organizations with attributes and related objects |  | x | x |  |  | x |
| Define groups with positions and further details. |  | x | x |  |  | x |
| Define and detail locations (locations) |  | x | x |  |  | x |
| Define skills centrally |  | x | x |  |  | x |
| Maintain existing user skills. |  | x | x |  |  | x |
| Maintain the required skills in the position. |  | x | x |  |  | x |
| Reuse objects (roles, organizational units ...) |  | x | x |  |  | x |
| Create a suggestion list when entering glossary names (Auto-Complete function) |  | x | x |  |  | x |
| Search for objects in lists and architectures via a dialog. |  | x | x |  |  | x |
| Add attachments as link. |  | x | x |  |  | x |
| Upload attachments (documents) |  | x | x |  |  | x |
| Upload images and visualize them directly. |  | x | x |  |  | x |
| Intelligent linking of plants directly with connected systems (additional services |  | x | x |  |  | x |
| Formatting descriptions with HTML editor |  | x | x |  |  | x |
| Define scope (scope filter) via organization, locations, and tags. |  | x | x |  |  | x |
| Save intermediate states of the modeling automatically (Auto-Save) |  | x | x |  |  | x |
| Copy process flow objects within a diagram |  | x | x |  |  | x |
| Copy process flow objects to other diagrams. |  | x | x |  |  | x |
| Cut out process flow objects within a diagram (Drag and Drop. |  | x | x |  |  | x |
| Cut process flow objects into another diagram (drag and drop) |  | x | x |  |  | x |
| Authorize editing of diagrams and objects by multiple authors. |  |  | x |  |  | x |
| Translate diagram and object details. |  | x | x |  |  | x |
| Automated translation of diagram and object details (Online Translation Service) |  | x | x |  |  | x |
| List connected diagrams and objects in an evaluation group as links |  | x |  |  |  | x |
| Display version history of all versions of diagrams and objects |  | x |  |  |  | x |
| Generate standard manuals as Word files. |  | x |  |  |  | x |
| Generate process graphics as Word file. |  | x |  |  |  | x |
| Generate individual customer evaluations as Word files. |  | x |  |  |  | x |
| Structure process models hierarchically |  |  | x |  |  | x |
| Move process models |  |  | x |  |  | x |
| Create new versions of released diagrams |  |  | x |  |  | x |
| Consolidate diagrams |  |  | x |  |  | x |
| Delete not-released diagrams |  |  | x |  |  | x |
| Generate graphical navigation structure automatically. | x | x | x | x | x | x |
| Sort processes in the architecture with sort number |  |  | x |  |  | x |
| Export BPMN 2.0 diagram |  |  |  |  |  | x |
| Import BPMN 2.0 diagram |  |  |  |  |  | x |
| Export Celonis Process Management Diagram |  |  |  |  |  | x |
| Import Celonis Process Management Diagram |  |  |  |  |  | x |
| Import Word document (prerequisite: configured import template) |  |  |  |  |  | x |
| Import XML |  |  |  |  |  | x |
| Import ARIS |  |  |  |  |  | x |
| Import Visio data |  |  |  |  |  | x |
| Export Excel mass data processing (translation) |  |  |  |  |  | x |
| Import Excel mass data processing (translation) |  |  |  |  |  | x |
| Import and update organizational hierarchy. |  |  |  |  |  | x |
| Import and update IT architecture |  |  |  |  |  | x |
| Import and update risk and control architecture |  |  |  |  |  | x |
| Requirements can be imported and updated. |  |  |  |  |  | x |
| Use BPMN 2.0 standard. | x | x | x | x | x | x |
| Extended BPMN 2.0 standard modeling standard | x | x | x | x | x | x |
| ArchiMate 3.0 Standard | x | x | x | x | x | x |
| Build IT landscape | x | x | x | x | x | x |
| Map and manage organizational structure, including positions | x | x | x | x | x | x |
| Implement Customer Experience Management (CEM) | x | x | x | x | x | x |
| Customer Journey Mapping | x | x | x | x | x | x |
| Create strategy and target diagrams (target trees, measures including status, etc.) | x | x | x | x | x | x |
| Define key figure trees and reports with report chapters. | x | x | x | x | x | x |
| Create project portfolio | x | x | x | x | x | x |
| Manage Skills | x | x | x | x | x | x |
| Set up the product portfolio. | x | x | x | x | x | x |
| Manage Learnings and Trainings | x | x | x | x | x | x |
| Present risk/control management | x | x | x | x | x | x |
| Manage requirements | x | x | x | x | x | x |
| Deposit standards and standard chapters | x | x | x | x | x | x |
| Model and define objects |  | x | x |  |  | x |
| Detail objects with HTML editor attributes |  | x | x |  |  | x |
| Detailing objects with attributes |  | x | x |  |  | x |
| Connecting objects with other objects |  | x | x |  |  | x |
| Release Object Versions |  | x | x |  |  | x |
| Create an object version. |  | x | x |  |  | x |
| Consolidate objects |  | x | x |  |  | x |
| Filter objects |  | x | x |  |  | x |
| Structure objects hierarchically |  | x | x |  |  | x |
| Disable architecture in the system facet |  | x | x |  |  | x |
| Store documents and link them to processes |  | x | x |  |  | x |
| Evaluation groups Display connections to other objects/diagrams. | x | x | x | x | x | x |
| Show individual entry pages (home pages) | x | x | x | x | x | x |
| Display profiles for all diagram and object contents | x | x | x | x | x | x |
| Generate various graphical diagram representations. | x | x | x | x | x | x |
| Display hierarchies in a navigation tree. | x | x | x | x | x | x |
| Display several process levels in one surface side by side (2-levels) | x | x | x | x | x | x |
| Process maps, graphical visualization | x | x | x | x | x | x |
| See and open stored attachments easily. |  |  |  |  |  |  |
| Print diagrams directly via browser print | x | x | x | x | x | x |
| Make personal user settings: Languages. | x | x | x | x | x | x |
| Make personal user settings: List sizes. | x | x | x | x | x | x |
| Make personal user settings: Selected roles. | x | x | x | x | x | x |
| Automatic translation function with Deepl.com |  | x | x |  |  | x |
| Subscribe to content (subscription service) | x | x | x | x | x | x |
| Info-Mail for release changes | x | x | x | x | x | x |
| Subscribe to content with multiple selections. | x | x | x | x | x | x |
| Select subscriptions for categories. | x | x | x | x | x | x |
| Combine subscriptions and favorites (button with fly-out) | x | x | x | x | x | x |
| Show a list of all changes in chronological order | x | x | x | x | x | x |
| Define favorites | x | x | x | x | x | x |
| Favorite Service: Manage/Group Favorites | x | x | x | x | x | x |
| Favorite Service: Share Favorites | x | x | x | x | x | x |
| Create permanent links from versions. | x | x | x | x | x | x |
| Create permanent links from version independent versions. | x | x | x | x | x | x |
| Create permanent links from the selection (in versions) | x | x | x | x | x | x |
| Provide a central glossary for all users. | x | x | x | x | x | x |
| Mass edit linked attributes. |  |  | x |  |  | x |
| Use the Training Assistant app to communicate specific expertise | x | x | x | x | x | x |
| Change attributes in released processes or objects |  | x | x |  |  | x |
| Role entry for all employees with connected home page | x | x | x | x | x | x |
| Create possible variants in the administration area |  | x | x |  |  | x |
| Create variants |  | x | x |  |  | x |
| Modeling variant processes |  | x | x |  |  | x |
| Complete localization of variant processes |  | x | x |  |  | x |
| Localize individual process flow objects of a variant process. |  | x | x |  |  | x |
| Completely de-localize variant processes |  | x | x |  |  | x |
| De-localize individual process flow objects of a variant process. |  | x | x |  |  | x |
| Update variant processes  Standard search: Search diagrams, objects, and information globally |  | x | x |  |  | x |
| Expert search: Search/filter in specific attributes. | x | x | x | x | x | x |
| Expert search: Search with operators | x | x | x | x | x | x |
| Expert search: Search with asterisks and quotation marks | x | x | x | x | x | x |
| Direct access to the selected search result via a link in the details area | x | x | x | x | x | x |
| Filter search results in the list view | x | x | x | x | x | x |
| Apply scope (scope filter) to search results (can be activated/deactivated) | x | x | x | x | x | x |
| Adjust the navigation tree on the left and the graphical display according to the set scope filter. | x | x | x | x | x | x |
| Apply Scope filter to processes and objects in list view (can be activated/deactivated) | x | x | x | x | x | x |
| Enable filtering for manuals. | x | x | x | x | x | x |
| Create new diagrams or object versions. |  | x | x |  |  | x |
| Delete diagrams and objects that are being edited |  | x | x |  |  | x |
| Create a new version of released processes and objects. |  | x | x |  |  | x |
| Create IDs for objects. |  |  |  |  |  | x |
| Organise inputs/outputs in your own architecture |  |  |  |  |  | x |
| Automatic versioning of processes and objects |  | x | x |  |  | x |
| Sharing: add more approver/approver groups (optional) |  | x | x |  |  | x |
| Release: Validate methodical rules in the process |  | x | x |  |  | x |
| Release: Send diagrams and objects to the release |  | x | x |  |  | x |
| Release: Ignore validation rule warnings to start the release (enable/disable) |  | x | x | x |  | x |
| Release: Define diagram and object validity start "Valid from |  | x | x |  |  | x |
| Release: Enter reason for revision (must have attributes) |  | x | x |  |  | x |
| Release: Automatically forward requests for release to approvers |  | x | x | x |  | x |
| Approval: Inform approvers by e-mail about pending requests for approval (optional) |  | x | x | x |  | x |
| Sharing: Automatically create and view requests (tasks) for approvers |  | x | x | x |  | x |
| Release: Manage requests (tasks) |  | x | x | x |  | x |
| Release: Call process/object directly |  | x | x | x |  | x |
| Release: Approve or reject the release of processes and objects |  | x | x | x |  | x |
| Set processes and objects to 'Expired. |  | x | x | x |  | x |
| Review: Define Reviewer | x | x | x | x | x | x |
| Review: Automatically forward request to the reviewer | x | x | x | x | x | x |
| Review: Notify Reviewer | x | x | x | x | x | x |
| Request: Send request for processes or objects | x | x | x | x | x | x |
| Request: Automatically forward the request to the responsible person | x | x | x | x | x | x |
| Request: Display/change the processing status of the request | x | x | x | x | x | x |
| Request: Call process/object directly | x | x | x | x | x | x |
| Request: Accept or reject a request | x | x | x | x | x | x |
| Define authorization levels |  |  | x |  |  | x |
| Assign permissions to individual users or user groups. |  |  | x |  |  | x |
| Set permissions on diagrams or objects |  |  | x |  |  | x |
| Assign permissions for facets. |  |  | x |  |  | x |
| Assign authorizations for architectures. |  |  | x |  |  | x |
| Create document templates for processes and documents. |  |  |  |  |  | x |
| Edit document templates for processes and documents. |  |  |  |  |  | x |
| Release document templates for processes and documents |  |  |  |  |  | x |
| Create document templates for the remaining facets |  |  |  |  |  | x |
| Edit document templates for other facets. |  |  |  |  |  | x |
| Release document templates for other facets |  |  |  |  |  | x |
| Open-generated PDF manuals. | x | x | x | x | x | x |
| Automatically generate PDF manuals upon approval. | x | x | x | x | x | x |
| Manage manual templates centrally. |  |  |  |  |  | x |
| Use standard reporting |  |  |  |  | x | x |
| Set up customer-specific reporting (optional) |  |  |  |  | x | x |
| Configure method |  |  |  |  |  | x |
| Hide, rename, or add attributes/objects (Advanced Configuration) |  |  |  |  |  | x |
| Manage users and user groups. |  |  |  |  |  | x |
| Authentication provider: Use OAuth |  |  |  |  |  | x |
| Define permissions for facets. |  |  |  |  |  | x |
| Define variant types |  |  |  |  |  | x |
| Define Tags |  |  |  |  |  | x |
| Set review date |  | x | x | x | x | x |
| Configure languages (default: DE/EN) |  |  |  |  |  | x |
| Configure default or optional language |  |  |  |  |  | x |
| Making languages available for reporting |  |  |  |  |  | x |
| Create and upload a new user interface language. |  |  |  |  |  | x |
| Configure notifications by e-mail or tasks |  |  |  |  |  | x |
| Adjust release cycle |  |  |  |  |  | x |
| Enable and disable features |  |  |  |  |  | x |
| Customize CI |  |  |  |  |  | x |
| Configure profiles |  |  |  |  |  | x |
| Create and customize stereotypes (subtypes) for diagrams/objects. |  |  |  |  |  | x |
| Configure Manuals |  |  |  |  |  | x |
| Define validation rules |  |  |  |  |  | x |
| Configure Service and WebHooks |  |  |  |  |  | x |
| Power BI interface (Data Warehouse) |  |  |  |  | x | x |
| SAP Enable Now interface |  |  |  |  |  | x |
| Open REST API interface to Celonis Process Management |  |  |  |  |  | x |


---

## admin/users/user-routing

# User Routing

User Routing is the logic engine within the Celonis Platform that determines how Signals are distributed to the right people. Instead of sending every alert to every user, routing rules allow you to:

- **Automate Assignments**: Automatically direct a Signal to the specific individual or User Group responsible for taking action.
- **Scale Operations**: Create a single rule that can be reused across multiple Skills, ensuring consistency in how work is handed off.
- **Manage Accountability**: Designate a Default Assignee who owns the task, while allowing other team members to stay informed as "Subscribed Users."

Essentially, it acts as a traffic controller, ensuring that process insights are converted into action by the correct stakeholder at the right time. Routing rules decouple assignment logic from individual Skills, allowing you to maintain a consistent authorization and accountability model across your organization.

Expand all

[## Routing architectures](#UUID-e7c667ce-22e0-e403-dfde-3256e1e3ff6f_section-id235513620920728_body)

Celonis supports three distinct routing methods to match your organizational structure:

Filter

- Method
- Logic type
- Scalability
- Use case

| Method | Logic type | Scalability | Use case |
| --- | --- | --- | --- |
| Simple Routing | Static | Low | Small teams or pilot projects where all Signals go to the same group. |
| Data Model Column | Attribute-based | Medium | Routing by geography (Country), department (CC), or vendor category. |
| Signal Attributes | Logical Matrix | High | Complex routing requiring "AND/OR" logic. |

| Method | Logic type | Scalability | Use case |
| --- | --- | --- | --- |
| Simple Routing | Static | Low | Small teams or pilot projects where all Signals go to the same group. |
| Data Model Column | Attribute-based | Medium | Routing by geography (Country), department (CC), or vendor category. |
| Signal Attributes | Logical Matrix | High | Complex routing requiring "AND/OR" logic. |

[## The assignment engine](#id652327_body)

Understanding the difference between visibility and accountability is critical for operational efficiency.

- **Subscribed Users**: These users can view the Signal in their Signal List and My Inbox. They are informed but not primarily responsible.
- **Default Assignee**: The specific individual designated as the primary owner. This user receives the Communication notification and is the first point of contact in the system.

When using Simple Routing, you can designate one person as the "Default Assignee" while keeping their backup team members as "Subscribed Users." This ensures the Signal is never missed during holidays or illness.

[## Enterprise governance and security](#id652338_body)

Routing rules act as a distribution layer, but they do not override underlying security protocols.

- **Data Permissions**: Skill administrators are responsible for ensuring that routing rules do not bypass data privacy. If a user is routed a Signal for a vendor they are not permitted to see in the Data Model, they may encounter access errors.
- **Group-Based Routing**: To reduce administrative overhead, it is recommended to route Signals to User Groups rather than individuals. This ensures that as employees join or leave, you only need to update the group membership rather than every individual Routing Rule.
- **Matrix Complexity**: For organizations with overlapping responsibilities, use Routing based on Signal attributes to build multi-step logic blocks that mirror your internal escalation matrix.

[## Lifecycle management](#id652351_body)

Routing rules are dynamic. Changes can be applied to both future and historical data.

- **Rule Reuse**: A single rule can be linked to multiple Projects and Skills. Updating the master rule propagates changes across all linked assets instantly.
- **Retroactive Updates**: By default, rule changes only apply to new Signals. Use the Reset Assignments feature to re-evaluate existing open Signals against the updated logic.
- **Action Flow Integration**: Beyond the Celonis Inbox, you can use the routing results to trigger external workflows. By calling the routing logic within an Action Flow, you can dynamically push Signals to third-party tools like Jira, ServiceNow, or Slack based on the assigned owner.

[## Troubleshooting common user routing issues](#id652364_body)

- **No Signals in Inbox**: Verify the user is either a Subscribed User or the Default Assignee in the Routing Rules page.
- **Stale Assignments**: If you’ve updated your team structure but the Inbox hasn't changed, ensure you have triggered a Reset.
- **Logic Conflicts**: If a Signal matches multiple attribute blocks, the system evaluates them in top-down order. Ensure your most specific logic blocks are at the top of the list.


---

## admin/users/user-types-and-migration

# User types and migration

There are two ways of managing users within Celonis Process Management: legacy user management, and AuthService users, both done through Process Designer.

**Note**

User migration can only be carried out by the Celonis Platform team. Reach out to your account manager if you believe you need this service.

Expand all

[## Legacy Local Designer users](#id861625_body)

These are users that were created before the AuthService was implemented in Process Designer (prior to 2019). Admins can still create local users in Process Designer, but these users can only access Process Designer. We do not recommend using legacy local users anymore, as they does not contain the latest capabilities and security features. To move away from these users, admins need to consolidate them with AuthService users in Process Designer.

[## AuthService users](#id861628_body)

There are two types of users supported by the AuthService:

- [SSO](configure-saml.html "Configure SAML") users - set up through customer’s 3rd party SSO. This allows customers to create users with their SSO credentials, and the management of credentials is within the 3rd party SSO.
- Manual user - this is only available for special cases, please consult your Celonis contact if interested.

AuthService users can use “Forgot password” to reset their own passwords.

## Related topics

- [Setting up SSO](setting-up-sso.html "Setting up SSO")
- [Configure SAML](configure-saml.html "Configure SAML")
- [Configure OIDC](configure-oidc.html "Configure OIDC")


---

## admin/users/viewing-user-login-history

# Viewing user login history

You can enable and view your user login history within **Admin & Settings**. Enabling this assumes you are in charge of the legal aspect of saving this data and have obtained the necessary consent from your users according to applicable data privacy laws.

Viewing your login history may be beneficial for the following reasons:

- **Troubleshooting common access issues:** Quickly determine if a user's login failure is due to incorrect credentials, an SSO configuration error, or an expired session.
- **Enhancing team security**: Identify unauthorized access attempts or suspicious login patterns (e.g., unusual login times or unrecognized login types) to protect your data.
- **Audit and compliance readiness**: Easily export login data to CSV to provide internal or external auditors with a clear record of who accessed the platform and when.
- **Monitoring platform adoption**: Gain insights into how frequently your team is utilizing the EMS by tracking successful login trends over time.
- **Automated data hygiene**: Use the automatic deletion settings to ensure your team remains compliant with regional data privacy laws by only retaining history for as long as necessary.

Expand all

[## Enabling and viewing user login history](#UUID-5d92fda3-a9ad-2c4d-8381-abc73f45b265_section-id235473736067008_body)

To enable and view your user login history:

1. Click **Admin & Settings - Login History**.

   |  |
   | --- |
   |  |
2. Choose from the following options:

   - **Enable or disable history**: Toggle the **Enable login history** switch to start or stop recording login events.
   - **Configure data retention**: Select a duration from the **Automatically delete login history** dropdown (e.g., 90 days or 1 year) to manage how long data is stored. See: [Automatically deleting login history](viewing-user-login-history.html#UUID-5d92fda3-a9ad-2c4d-8381-abc73f45b265_section-idm4519705027849633636505108751 "Automatically deleting login history").
   - **Download records**: Click Export as CSV to generate a local file of all currently stored login attempts for further analysis. See: [Exporting to CSV](viewing-user-login-history.html#UUID-5d92fda3-a9ad-2c4d-8381-abc73f45b265_section-idm4519705017196833636504977404 "Exporting to CSV").

### Automatically deleting login history

You can periodically delete your login history, with no recovery of data possible.

The following options are available: No deletion, 30 days, 90 days, 180 days, 1 year, 2 years, 10 years.

|  |
| --- |
|  |

### Exporting to CSV

You can export your login history as a CSV file by clicking **Export as CSV**.

The CSV file provides the following information:

- The user’s email address
- The date and time of the login
- The event type
- Whether the action was successful

[## Login types](#UUID-5d92fda3-a9ad-2c4d-8381-abc73f45b265_section-idm4576386630268833722553455123_body)

The following login types are recorded:

- **Login SSO**: The user logged in with SAML or OIDC SSO.
- **UI / Login**: The user logged in with a username and password via their team login page.
- **CelonisID**: The user logged in with their CelonisID details.

## Related topics

- [Team privacy](team-privacy.html "Team privacy")
- [Open signup](open-signup.html "Open signup")
- [Managing existing users](managing-existing-users.html "Managing existing users")


---

## admin/sso/certificate-management-for-saml-single-sign-on

# Certificate management for SAML single sign-on

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

When [configuring SAML single sign-on](configuring-saml-single-sign-on.html "Configuring SAML single sign-on") for your Celonis Platform, you must select your preferred certificate management method. You have four options here:

## Self-signed

These certificates are automatically generated but are not signed by an authority. Self-signed certificates are valid for two or more years.

In this example, the certificate expiry date is set to 7/14/2042. This is the date of the web hosting expiry on the Celonis side, not the date in which your own SSO certificate is expiring.

|  |
| --- |
|  |

## Signed by Let's Encrypt

These certificates are generated by an open-source provider, [Let’s Encrypt](https://letsencrypt.org/). Celonis calls their service (using [challenges](https://letsencrypt.org/docs/challenge-types/) to validate the authenticity of the domain and the request), with Let’s Encrypt then sending back a signed certificate that’s valid for three months.

## Signed with user-provided certificate

These certificates should be generated, managed, and uploaded by your team admins. User-provided certificates allow you to define your own certificate expiry dates, security settings, and more.

When uploading your own SSO certificate, the domain provided must match your Celonis Platform team domain. For example:

```
myteam.eu-1.celonis.cloud
```

## Automatically regenerate certificate before expiry

Certificates are renewed on the final Saturday before the expiration date, with administrators given notice via email (except for user-provided certificates). The certificate can also be renewed manually before or after its expiry date or if the automatic regeneration failed.

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [Signing in](signing-in.html "Signing in to Celonis Platform")
- [SAML JIT SSO](configuring-saml-jit-single-sign-on.html "Configuring SAML JIT single sign-on")


---

## admin/sso/configure-oidc

# Configure OIDC

|  |
| --- |
|  |

The following sections explain how to set up [Single Sign-On (SSO)](https://docs.celonis.com/en/setting-up-sso.html)  using the OIDC method.

Expand all

[## Before you begin](#id861497_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must be an Administrator to set up SSO in Celonis Process Management.

[## Configuring your OIDC connection](#id861503_body)

1. It's easiest to set up the connection by having Celonis Process Management (CPM) open in one tab, and your identity provider open in another. This way, you can copy and paste information between the two as needed. If you have additional documents for SSO configuration, such as a metadata file or a custom certificate, you should keep them handy.
2. In your CPM tab, upload your metadata file or custom certificate to auto-populate the fields, if using. If not, use the [configuration table below](configure-oidc.html#UUID-e6c16e06-e04b-3015-785a-7c4f79c379bd_table-idm234966782846685 "Table 21. OIDC Configuration Settings") to fill out each field.
3. Next, in your identity provider tab, check to see if your claims have custom names. If so, use the [claim mappings section](configure-oidc.html#UUID-e6c16e06-e04b-3015-785a-7c4f79c379bd_N1758796483431) to map them for use in CPM.
4. In your CPM tab, once you've finished filling out the configuration form, click **Save**.
5. The last step is to add some additional information within your identity provider so that it recognizes the connection you just configured in CPM. Use the information in the [redirect section below](configure-oidc.html#UUID-e6c16e06-e04b-3015-785a-7c4f79c379bd_N1758796777279 "Redirect URLs"), and make sure to replace `companyShortName` in the sample URLs with your company's name.

Table 21. OIDC Configuration Settings

| Field | Description |
| --- | --- |
| Provider name | The login provider name. |
| Client ID | Indicated in your identity provider as “Application” or “Client ID” in GUID format. For example, if your identity provider is Microsoft, you can find it under Microsoft Entra > Management > App registrations. |
| Authority | This is the Authority URL from your identity provider. For example, if your identity provider is Microsoft, the URL will be `https://login.microsoftonline.com/{GUID}`. Replace GUID with your {Tenant ID}. |
| Enable/Disable toggle | Enables or disables the login provider. If disabled, the button will not show on the login page. |
| Claim mappings: | The expected claims sent by the identity provider (IdP)  are:  - email - given\_name - family\_name  If the IdP uses different claim types, remap them here. |

[## Redirect URLs](#UUID-e6c16e06-e04b-3015-785a-7c4f79c379bd_N1758796777279_body)

Once ODIC is configured, the last step is to add the redirect URLs to your identity provider. The `companyShortName` is a unique identifier for your tenant inside our systems. It can be found in the URLs provided to you for Process Designer or Process Navigator.

For example, the URLs for a company called Celonis would be:

- in Process Designer: `https://symbioweb.com/celonis/demoStorage`
- in Process Navigator: `https://navigator.symbio.cloud/celonis`

You can find out what region you're in by checking the URL of your workspace in either Process Designer or Process Navigator.

| Region | URLs |
| --- | --- |
| Europe | Sign-in redirect URL: `https://auth.symbio.cloud/signin-companyShortName-oidc`  Logout redirect URL: `https://auth.symbio.cloud/signout-&companyShortName-oidc` |
| US | Sign-in redirect URL: `https://auth.us-1.symbio.cloud/signin-companyShortName-oidc`  Logout redirect URL: `https://auth.us-1.symbio.cloud/signout-companyShortName-oidc` |
| Japan | Sign-in redirect URL: `https://auth.jp-1.symbio.cloud/signin-companyShortName-oidc`  Logout redirect URL: `https://auth.jp-1.symbio.cloud/signout-companyShortName-oidc` |

## Related topics

- [Setting up SSO](setting-up-sso.html "Setting up SSO")
- [Configure SAML](configure-saml.html "Configure SAML")


---

## admin/sso/configure-saml

# Configure SAML

|  |
| --- |
|  |

The following sections explain how to set up [Single Sign-On (SSO)](https://docs.celonis.com/en/setting-up-sso.html) using the SAML method.

Expand all

[## Before you begin](#id861351_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- You must be an Administrator to set up SSO in Celonis Process Management.

[## Configuring your SAML connection](#id861357_body)

1. **If you have a metadata file**, you can upload the file under **Customization** and skip the configuration setup.

   **If you don't have a metadata file**, start by having Celonis Process Management (CPM) open in one tab, and your identity provider open in another. This way, you can copy and paste information between the two as needed. If you have additional documents for SSO configuration, such as a custom certificate, you should keep them handy.
2. In your CPM tab, upload your metadata file or custom certificate to auto-populate the fields, if using. If not, use [configuration table below](configure-saml.html#UUID-5e30d172-b397-1825-9994-bfb538e41d5b_table-idm234966775913645 "Table 20. SAML Configuration Settings") to fill out each field.
3. Next, in your identity provider tab, check to see if your claims have custom names. If so, use the [claim mappings section](configure-saml.html#UUID-5e30d172-b397-1825-9994-bfb538e41d5b_N1758794981169) to map them for use in CPM.
4. In your CPM tab, once you've finished filling out the configuration form, click **Save**.
5. The last step is to add some additional information within your identity provider so that it recognizes the connection you just configured in CPM. Use the information in the [redirect section below](configure-saml.html#UUID-5e30d172-b397-1825-9994-bfb538e41d5b_N1758795690702 "Redirect URLs"), and make sure to replace `companyShortName` in the sample URLs with your company's name.

Table 20. SAML Configuration Settings

| Field | Description |
| --- | --- |
| Provider name | The login provider name. |
| Service provider | This is prefilled as “https://auth.symbio.cloud”, and can be any value that starts with ‘https://’ (for example: https://customer.cpm.com). This is often requested as “Entity ID” on the IdP side. Both the Service Provider value configured in CPM and the “Entity ID” that is associated with the identity provider you indicate in the IdP need to match. |
| Identity Provider | Indicated on your identity provider side, usually with a URL in this format: `https://sts.windows.net/{GUID}` |
| Enable/Disable toggle | Enables or disables the login provider. If disabled, the button will not be shown on the login page. |
| Metadata document (if applicable) | If the IdP URL does not serve the metadata document, configure a custom endpoint here. Alternatively, upload your own metadata document.  **Caution**  If a metadata document is not served/uploaded and a custom endpoint is not configured, all login attempts will fail. |
| Certificate (if applicable) | If message encryption is enabled by the identity provider, the certificate will be used for decryption. |
| Claim mappings: | The expected claims sent by the identity provider are  - email - given\_name - family\_name  If the IdP uses different claim types, remap them here. |

[## Redirect URLs](#UUID-5e30d172-b397-1825-9994-bfb538e41d5b_N1758795690702_body)

Once you've finished configuring your SAML set up, the last step is to add the ACS consumer URLs to your identity provider. The `companyShortName` is a unique identifier for your tenant inside our systems. It can be found in the URLs provided to you for Process Designer or Process Navigator.

For example, the URLs for a company called Celonis would be:

- in Process Designer: `https://symbioweb.com/celonis/demoStorage`
- in Process Navigator: `https://navigator.symbio.cloud/celonis`

You can find out what region you're in by checking the URL of your workspace in either Process Designer or Process Navigator.

| Region | URLs |
| --- | --- |
| Europe | SAML2 ACS Consumer URL: `https://auth.symbio.cloud/companyShortName-saml2/Acs` |
| US | SAML2 ACS Consumer URL: `https://auth.us-1.symbio.cloud/companyShortName-saml2/Acs` |
| Japan | SAML2 ACS Consumer URL: `https://auth.jp-1.symbio.cloud/companyShortName-saml2/Acs` |

[## Customiziation](#id861474_body)

To configure a SAML2 identity provider, a custom metadata document can either be referenced via URI or by uploading the document. Likewise a custom certificate file can be uploaded. For more information on certificates, refer to [Certificate management for SAML single sign-on](https://docs.celonis.com/en/certificate-management-for-saml-single-sign-on.html).

## Related topics

- [Setting up SSO](https://docs.celonis.com/en/setting-up-sso.html)
- [Configure OIDC](configure-oidc.html "Configure OIDC")
- [Certificate management for SAML single sign-on](https://docs.celonis.com/en/certificate-management-for-saml-single-sign-on.html)


---

## admin/sso/configuring-oidc-single-sign-on

# Configuring OIDC single sign-on

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

OpenID Connect (OIDC) SSO is a modern authentication standard that lets your Celonis Platform user log in once and access multiple applications without signing in again. It builds on OAuth 2.0 and adds an identity layer so applications can verify who the user is, not just get permission to access data.

Using OIDC for your Celonis Platform environment provides the following benefits:

- **Improved user experience**: Users log in once and gain seamless access to multiple applications, reducing password fatigue and improving productivity.
- **Stronger security with centralized authentication**: Authentication is handled by a trusted Identity Provider, enabling consistent enforcement of security policies like MFA, password rules, and session controls across all connected apps.
- **Modern, standards-based integration**: OpenID Connect builds on OAuth 2.0 and is widely supported by major identity platforms such as Auth0, Okta, and Microsoft Entra ID, making it easier to integrate with web, mobile, and API-based systems.

Expand all

[## Before you begin](#UUID-652cb25e-1474-9137-1f38-bbd7ba7e3614_section-idm4587706439880033634516310193_body)

To configure your OIDC SSO, you need the following from your identity provider:

- ClientID
- Client secret
- Provider Discovery URL

You also need the following authorized redirect URL:

```
https://[customerdomain].[realm].celonis.cloud/api/auth-handler/oidc/callback
```

[## Configuring your OIDC single sign-on](#UUID-652cb25e-1474-9137-1f38-bbd7ba7e3614_section-idm4519704970267233634517535855_body)

To configure your OIDC SSO:

1. Click **Admin & Settings - Single Sign-On**.
2. Click **OIDC - Configure**.

   |  |
   | --- |
   |  |
3. Enter the required information, including ClientID, Client Secret, Provider Discovery URL, and Scope value.

   When inputting your **scope value**, we recommend using *openID email* and *openid email profile* .

   ***Optional***: You can also [allow bypassing via login form](configuring-oidc-single-sign-on.html#UUID-652cb25e-1474-9137-1f38-bbd7ba7e3614_section-idm4575417659521633634651189697 "Allow bypassing via login form").

   |  |
   | --- |
   |  |
4. Click **Save**.
5. When prompted, either click **Activate** or choose to activate your configuration later.

   If activating your OIDC configuration later, return to the Single Sign-On screen and click **Activate**:

   |  |
   | --- |
   |  |

   Your OIDC SSO is now active, with all active users at that point being automatically logged out of your and need to re-authenticate to regain access.

### Allow bypassing via login form

Enabling this option allows users who are outside of your IdP to still access your team with their email address and password. This feature is beneficial when working on implementation projects or when adding the user to your IdP is time consuming.

|  |
| --- |
|  |

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [Configuring SAML single sign-on](configuring-saml-single-sign-on.html "Configuring SAML single sign-on")
- [Celonis ID](celonis-id.html "Celonis ID")


---

## admin/sso/configuring-saml-jit-single-sign-on

# Configuring SAML JIT single sign-on

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

You can enable Just-in-time (JIT) user provisioning when configuring your SSO options, allowing new users to join and access your Celonis Platform team on demand. Adopting SAML JIT user provisioning reduces the need for manual user management, with the information passed between the Celonis Platform and your IdP securely.

**Note**

SAML JIT takes ownership of groups that have the same name as groups that appear in the SAML claim of some users. For these groups, people will be removed depending on whether or not their SAML claim upon login lists that membership. Any group that has never appeared in any SAML claim will stay as-is, including all memberships.

Expand all

[## Enabling and configuring SAML JIT SSO](#UUID-1af53e8b-9237-3863-b9bb-ed53b07137d5_section-id235453216216085_body)

To enable SAML JIT SSO for your Celonis Platform team:

**Note**

The next step is to configure your IdP.

1. Click **Admin & Settings - Single Sign-On**.
2. Click **SAML - Configure**.

   |  |
   | --- |
   |  |
3. Configure your general settings, including a name and provider name.

   You can also configure the following options here:

   **Maximum Authentication Life Time:**  This enables you to control how long the user remains signed in (minutes), with the default set to 480 mins (8 hours). After this time, the user must sign-in again with their identity provider to regain access to your Celonis Platform .

   If this option is disabled, the maximum period allowed by the Celonis Platform is 10 years. Typically this means that the timeout period is defined and configured on your identity provider.

   **Allow bypassing via login form**: Enabling this option allows users who are outside of your identity provider to still access your team with their email address and password. This feature is beneficial when working on implementation projects or when adding the user to your identity provider is not possible. You can also enable this option if you need to give a member of the Celonis Support team access to your environment to problem solve.

   When bypassing via login form, your login from can be accessed via the following URL format:

   ```
   https://<team>.<realm>.celonis.cloud/ui/login
   ```

   |  |
   | --- |
   |  |
4. Select your certificate type (uploading a user-provided certificate if necessary).

   See: [Certificate management for SAML single sign-on](certificate-management-for-saml-single-sign-on.html "Certificate management for SAML single sign-on")

   |  |
   | --- |
   |  |
5. Upload your identity provider's metadata. The metadata is an XML file representing the configuration of your SSO and should be available for download in the SSO’s admin interface.

   You can also use the following features here:

   **Download SP Metadata**: The service provider (SP) metadata file allows for quick configuration on the identity provider and is available once you have uploaded your identity provider metadata file.

   **Enable SP Metadata Access via Public URL**: This gives you access to a link that reduces the manual effort involved when certificate changes are needed. Depending on your identity provider, this link can enable you to automatically update the certificate when required and without accessing the Celonis Platform to do so.

   |  |
   | --- |
   |  |
6. Click **JIT CONFIGURATION** and then **Enable Just-in-Time (JIT) provisioning**:

   |  |
   | --- |
   |  |
7. Configure your JIT settings:

   - **First and last name attributes**: You need to provide both the users’ first and last name attributes. We also recommend that all new users are given group attributes, assigning them permissions automatically.
   - **Group attribute**: This must be formatted as a multi-value inside auth response to the Celonis Platform: Celonis Platform , similar to this:

     ```
     <Attribute Name="groups" ...>
     <AttributeValue xsi:type="xs:string" ...>groupB</AttributeValue>
     <AttributeValue xsi:type="xs:string" ...>groupA</AttributeValue>
     </Attribute>
     ```
8. Click **Save**.
9. When prompted, either click **Activate** or choose to activate your configuration later.

   Your SAML SSO is now active, with all active users at that point being automatically logged out of your Celonis Platform .They’ll need to re-authenticate to regain access.

## Related topics

- [Configuring SAML single sign-on](configuring-saml-single-sign-on.html "Configuring SAML single sign-on")
- [Configuring SCIM API](configuring-scim-api--preferred-.html "Configuring SCIM API")
- [Celonis ID](celonis-id.html "Celonis ID")


---

## admin/sso/configuring-saml-single-sign-on

# Configuring SAML single sign-on

**View our security recommendations**

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For more information, view our Celonis Platform security recommendations and best practice: [Security recommendations](security-recommendations.html "Security recommendations")

Your users can access the Celonis Platform using their existing Identity Provider (IdP) credentials by configuring SAML single sign-on (SSO) for your team. This process establishes a trust relationship between the Celonis Platform and your IdP, enabling secure user authentication when logging in to the platform.

Expand all

[## Before you begin](#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm235049999098418_body)

The section provides important information for configuring SAML SSO. Review each of the following **before** starting [Configuring and activating your SAML SSO](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm4642434830216033634372261719 "Configuring and activating your SAML SSO"):

- We strongly recommend enabling **Allow bypassing via login form** ([step 3](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_N1742983213257 "Step 3")) for your current configuration **before** changing your single sign-on configuration. If this setting is **not** enabled:

  - SAML SSO will be the only method of authentication, and users who are outside of your identity provider will be prevented from accessing the team.
  - In the event of a misconfiguration, **your team members, including admins, can be locked out** of your Celonis Platform.

    **Note**

    In the event of a misconfiguration, enabling **Allow bypassing via login form** ([step 3](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_N1742983213257 "Step 3")) still allows users to access your team with an email address and password.
- Your Celonis Platform team environment supports SAML 2.0 with the SHA-256 hash algorithm. However, it **doesn't** support SAML logout functionality or identity provider initiated flows.
- When configuring SAML SSO in Celonis Platform , you must select a certificate management method ([step 4](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_N1752502669604 "Step 4")). For more information about your options, see [Certificate management for SAML SSO](certificate-management-for-saml-single-sign-on.html "Certificate management for SAML single sign-on").
- When configuring your IdP, some configuration fields may require specific formatting. For specific field information, see [External identity provider configuration](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm4506157954656033660429711907 "External identity provider configuration") .
- Celonis Platform **only supports** the HTTP POST binding for SAML SSO. Ensure your IdP is configured accordingly, as other binding types such as HTTP redirect are not supported. For more information, see [Using HTTP POST binding for SAML SSO](configuring-saml-single-sign-on.html#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm235050088566205 "Using HTTP POST binding for SAML SSO").

[## Configuring and activating your SAML SSO](#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm4642434830216033634372261719_body)

To configure and activate your SAML SSO:

**Note**

The next step is to configure your IdP.

1. Click **Admin & Settings - Single Sign-On**.
2. Click **SAML - Configure**.

   |  |
   | --- |
   |  |
3. Configure your general settings, including a name and provider name.

   You can also configure the following options here:

   **Maximum Authentication Life Time:**  This enables you to control how long the user remains signed in (minutes), with the default set to 480 mins (8 hours). After this time, the user must sign-in again with their identity provider to regain access to your Celonis Platform .

   If this option is disabled, the maximum period allowed by the Celonis Platform is 10 years. Typically this means that the timeout period is defined and configured on your identity provider.

   **Allow bypassing via login form**: Enabling this option allows users who are outside of your identity provider to still access your team with their email address and password. This feature is beneficial when working on implementation projects or when adding the user to your identity provider is not possible. You can also enable this option if you need to give a member of the Celonis Support team access to your environment to problem solve.

   When bypassing via login form, your login from can be accessed via the following URL format:

   ```
   https://<team>.<realm>.celonis.cloud/ui/login
   ```

   |  |
   | --- |
   |  |
4. Select your certificate type (uploading a user-provided certificate if necessary).

   See: [Certificate management for SAML single sign-on](certificate-management-for-saml-single-sign-on.html "Certificate management for SAML single sign-on")

   |  |
   | --- |
   |  |
5. Upload your identity provider's metadata. The metadata is an XML file representing the configuration of your SSO and should be available for download in the SSO’s admin interface.

   You can also use the following features here:

   **Download SP Metadata**: The service provider (SP) metadata file allows for quick configuration on the identity provider and is available once you have uploaded your identity provider metadata file.

   **Enable SP Metadata Access via Public URL**: This gives you access to a link that reduces the manual effort involved when certificate changes are needed. Depending on your identity provider, this link can enable you to automatically update the certificate when required and without accessing the Celonis Platform to do so.

   |  |
   | --- |
   |  |
6. Click **Save**.
7. When prompted, either click **Activate** or choose to activate your configuration later.

   Your SAML SSO is now active, with all active users at that point being automatically logged out of your Celonis Platform .They’ll need to re-authenticate to regain access.

[## External identity provider configuration](#UUID-18348f84-8788-f5df-20ac-40d4a8b39ec5_section-idm4506157954656033660429711907_body)

**Note**

The following external identity providers have been successfully configured with Celonis: Microsoft Azure, Okta, OneLogin, ADFS, and JumpCloud. For detailed instructions on how to configure these providers, refer to their documentation.

When configuring your SAML SSO on your external identity provider, the following information may be needed:

### Relying Party Trust Identifier (also referred as entityID, Identifier, or Audience)

Use the following format:

```
<team>.<realm>.celonis.cloud
```

For example: testcompany.eu-1.celonis.cloud

### Relying Party Identity Provider Endpoint (also referred as Reply URL or Recipient)

The login type should be: SAML Assertion Consumer.

And the endpoint should be provided in this format:

```
https://<team>.<realm>.celonis.cloud/api/auth-handler/saml/callback?client_name=SAML2Client
```

For example: https://testcompany.eu-1.celonis.cloud/api/auth-handler/saml/callback?client\_name=SAML2Client

### Login URL

As your SAML SSO configuration can't be tested within your Celonis platform team, you should use the following URL format to access the platform:

```
https://<team>.<realm>.celonis.cloud/
```

For example: https://testcompany.eu1.celonis.cloud/

### Celonis platform signed authentication requests

To enable your Celonis Platform to sign authentication requests sent to your identity provider you must set your **WantAuthnRequestsSigned** attribute to 'true'.

For example:

```
<md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" WantAuthnRequestsSigned="true">
```

### User Attributes and Claims - custom email assertion

For many identity providers (such as Azure), you must create a custom "email" assertion to the User Attributes and Claims section.

**Azure AD**: By default when you add a new claim in Azure AD, the namespace is set to:

```
http://schemas.xmlsoap.org/ws/2005/05/identity/claims.
```

Delete this default setting and leave the namespace field empty.

The new claim "email" must be lowercase and mapped with an email address field from the source, as individual users in Celonis are must have unique email addresses.

### Using HTTP POST binding for SAML SSO

The Celonis Platform **only** supports the HTTP POST binding for SAML SSO. Ensure your IdP is configured accordingly, as other binding types, such as HTTP Redirect, are not supported.

These include:

- **Microsoft Azure**: Ensure the SAML response is configured to use HTTP POST for the ACS (Reply) URL.
- **Okta**: In the SAML app settings, ensure the Response Binding is set to HTTP POST.
- **OneLogin**: In the SAML app configuration, set the SAML Assertion Consumer Service Binding to HTTP POST, and ensure both SAML assertions and responses use the POST binding.
- **ADFS**: In the Relying Party Trust settings, open the Endpoints tab, and ensure the ACS endpoint uses the POST binding.
- **JumpCloud**: In the application’s SAML settings, set the SAML Response Binding to HTTP POST.

## Related topics

- [Security recommendations](security-recommendations.html "Security recommendations")
- [Signing in](signing-in.html "Signing in to Celonis Platform")
- [SAML JIT SSO](configuring-saml-jit-single-sign-on.html "Configuring SAML JIT single sign-on")


---

## admin/security/configuring-your-celonis-platform-security-features

# Configuring your Celonis Platform security features

Your security features allow you to control who or what can access your Celonis Platform and what authentication you require from them.

As an Celonis Platform admin, you can configure the following security features:

## Identity and access management

Secure your environment by defining how users authenticate and how their accounts are managed. Whether you use the native Celonis ID system or integrate with your organization's existing Identity Provider (IdP) via SSO, these settings ensure that only authorized personnel can access your data.

- [Signing in (Celonis ID and single sign on)](signing-in.html "Signing in to Celonis Platform")

  - [Configuring SAML single sign-on](configuring-saml-single-sign-on.html "Configuring SAML single sign-on"): Connect your corporate Identity Provider (like Okta or Azure AD) using the SAML 2.0 standard for secure, centralized authentication.
  - [OIDC](configuring-oidc-single-sign-on.html "Configuring OIDC single sign-on"): Utilize the OpenID Connect protocol to allow users to sign in using their existing enterprise credentials.
  - [Celonis ID](celonis-id.html "Celonis ID"): The default native authentication method for users to log in directly via the Celonis platform using a dedicated email and password.
- [Account management (SCIM API and SAML JIT)](account-management.html "Account management")

  - [Configuring SCIM API](configuring-scim-api--preferred-.html "Configuring SCIM API"): Automate the entire user lifecycle by syncing your Identity Provider with Celonis to create, update, and deactivate accounts automatically.
  - [SAML JIT SSO](configuring-saml-jit-single-sign-on.html "Configuring SAML JIT single sign-on"): Enable "Just-In-Time" provisioning to automatically create a user profile the first time a person logs in through your SSO.

## Environment and network security

Beyond individual user access, you can implement broader safeguards to protect your entire platform instance. These tools allow you to harden your security posture by restricting access to known corporate networks, managing session persistence, and ensuring team-level privacy.

- [IP-based restrictions](ip-based-restrictions.html "IP-based restrictions"): Control access based on specific network locations.
- [Session timeout settings](session-timeout-settings.html "Session timeout settings"): Manage the duration of active user sessions.
- [Team privacy](team-privacy.html "Team privacy"): Configure visibility settings for your team's environment.

## Communication and enrollment

Configure how new users join your team and how the platform represents your organization in outbound communications. These settings help balance ease of onboarding with administrative control, while maintaining a professional look for automated system emails.

- [Open sign up](open-signup.html "Open signup"): Control whether new users can self-register.
- [Email signatures](email-signatures.html "Email signatures"): Manage standard signatures for platform communications.

## Security recommendations

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

For our security recommendations, see: [Security recommendations](security-recommendations.html "Security recommendations")


---

## admin/security/download-portal-security

# Download Portal file security

To verify the authenticity of files obtained from the Download Portal, we provide SHA-256 checksums that can be used to check if the files haven't been tempered during the download process.

Specifically, using an SHA-256 checksum allows you to:

- **Detect tampering**: The most critical reason is to verify that the file hasn't been altered. By comparing checksums, you can confirm the file wasn't "tampered with" or maliciously modified by a third party during the download process.
- **Verify authenticity**: It serves as a digital fingerprint. When the checksum you calculate on your computer matches the one displayed in the Download Portal, you have proof that the file is authentic and originates from the trusted source.
- **Ensure data integrity**: Sometimes files get corrupted due to network issues or interrupted downloads. Checking the validity ensures the file is complete and functional before you try to run or install it.

Expand all

[## Checking file validity](#UUID-f91ba04e-ab1e-dbda-a26d-e9f7e88770b8_section-id235475503565132_body)

To check the validity of a file from the Download Portal:

1. In the Download Portal, next to the file you downloaded, see the checksum number for the file.

   |  |
   | --- |
   |  |
2. Find the file path of your download:

   - On MacOS: Right-click the file, hold the Option key, and select "Copy [Filename] as Pathname".
   - On Windows: Hold the Shift key, Right-click the file, and select "Copy as path".
3. On your computer, calculate the SHA-256 checksum of the downloaded files:

   1. In your command prompt or terminal run:

      - On MacOS:

        ```
        shasum -a 256 /Users/YourName/Downloads/file.zip
        ```
      - On Windows:

        ```
        certutil -hashfile "C:\Users\YourName\Downloads\file.zip" SHA256
        ```
      - On Linux:

        ```
        sha256sum /home/YourName/Downloads/file.zip
        ```
4. Compare the checksum from your terminal with the one displayed next to your file in the Download Portal.

   - If checksums match, the file hasn't been tampered with during the download process and you can start using it.
   - If checksums don't match, don't use the file. Download the file again and repeat the verification process. If this continues to be an issue, report the situation to us by raising a ticket in [Support Portal](http://support.celonis.com/).

## Related topics

- [Download portal](download-portal.html "Accessing your download portal")
- [Security features](configuring-your-celonis-platform-security-features.html "Configuring your Celonis Platform security features")
- [Users, licenses, and activity](managing-users,-licenses,-and-celonis-platform-activity.html "Managing users, licenses, and Celonis Platform activity")


---

## admin/security/security-recommendations

# Security recommendations

Your team security and user provisioning settings may vary depending on your team size. Before setting up your team, we therefore recommend that you choose a coupling approach and relevant settings.

## Tight coupling of SSO and user management

With tight coupling, dynamic user sync is added with the identity provider. Any changes to individual accounts and optionally also their groups are reflected in the Celonis Platform upon sign-in. This coupling applies to larger organizations with a greater need for user governance.

In this case, as it is large scale, identity providers should provide groups to which the administrator assigns permissions in the Celonis Platform . If no groups are available, the administrator must add users manually to Celonis Platform groups.

Tight coupling can be done via SCIM API or SAML Just-in-Time (JIT), with **SCIM our recommendation**.

Tight coupling differs from light coupling because:

- It provides dynamic user syncing. This means that users created in your identity provider will be automatically created in your Celonis Platform . There is no need to manually send invitations.
- It provisions and updates groups.
- It allows users to directly login without an admin invitation.

## Light coupling of SSO and user management

Light coupling is recommended for teams that have outgrown manual user maintenance but do not yet require full dynamic synchronization. This approach utilizes SAML or OIDC SSO to automate the initial creation of user profiles—such as names and email addresses—within the Celonis Platform upon their first login. While it simplifies the onboarding process through a one-time SSO setup, it is characterized by the absence of a continuous, dynamic sync between your identity provider and the platform.

We recommend the following:

### Centralized identity management

Unlike traditional local logins that are tied to a single "team" (environment), Celonis ID acts as a global profile.

- **One account, multiple Teams**: A user can use a single set of credentials to access multiple Celonis teams.
- **Seamless switching**: When logged in via Celonis ID, users can switch between different teams without re-authenticating, provided they have been invited to those teams.
- **Personal profile**: Users manage their own profile details—such as profile picture, language preferences, and time zones—in one central location that persists across the platform.

### Mandatory security (2FA)

A core functional pillar of Celonis ID is the enforcement of Two-Factor Authentication (2FA). Because it is the default "cloud-native" login, Celonis mandates an extra layer of security:

- **Initial setup**: When first signing in, users are required to set up 2FA.
- **Verification methods**: Users can choose to receive their 2FA codes via email or a supported authenticator app (like Google or Microsoft Authenticator).
- **Triggering events**: The system typically prompts for a 2FA token when a user logs in from a new device, a new browser, or if their session has expired (usually after 30 days of inactivity).

### Password requirements

Celonis ID enforces a strict password policy to ensure account integrity:

- Minimum of 8 characters.
- Requirement of at least one character from four categories: Uppercase, Lowercase, Numbers, and Special Characters.

### Relationship with SSO

It is important to distinguish Celonis ID from Single Sign-On (SSO):

- **The "Fall-Back" role**: If a company configures SAML or OIDC (SSO), Celonis ID usually becomes a secondary method. Admins often keep it enabled as a "bypass" option to prevent lockouts if the SSO provider goes down.
- **Co-existence**: You can have some users (like external consultants) logging in via Celonis ID while internal employees use the company’s SSO.

Filter

- Feature
- Celonis ID (Default)
- Single Sign-On (SAML/OIDC/SCIM)

| Feature | Celonis ID (Default) | Single Sign-On (SAML/OIDC/SCIM) |
| --- | --- | --- |
| Credential source | Managed by Celonis | Managed by your company (IdP) |
| Maintenance | User-managed passwords | IT-managed (Active Directory) |
| Multi-team | One ID for all Celonis teams | Restricted to specific team setup. |
| 2FA | Handled by Celonis | Handled by your IdP |

| Feature | Celonis ID (Default) | Single Sign-On (SAML/OIDC/SCIM) |
| --- | --- | --- |
| Credential source | Managed by Celonis | Managed by your company (IdP) |
| Maintenance | User-managed passwords | IT-managed (Active Directory) |
| Multi-team | One ID for all Celonis teams | Restricted to specific team setup. |
| 2FA | Handled by Celonis | Handled by your IdP |

When your team size is too large for manual invitations and maintenance, we recommend that you use either SAML SSO or OIDC SSO. In this case, you have the one-time effort of setting up SSO. With that, when users respond to an invite and log in for the first time, identity information - i.e. first name, last name, email - is added in the Celonis Platform. This is light coupling as there is no dynamic sync between the identity provider and the Celonis Platform.

## Related topics

- [Signing in](signing-in.html "Signing in to Celonis Platform")
- [Celonis ID](celonis-id.html "Celonis ID")
- [Account management](account-management.html "Account management")


---

## admin/gamification/gamification-app

# Gamification App

Drive platform engagement and accelerate Celonis adoption by transforming routine workflows into an interactive experience. The Gamification app leverages real-time leaderboards, milestones, and tailored challenges to motivate users and provide admins with clear visibility into team performance.

The Gamification App offers the following key features and benefits

- **Gamified personal dashboard:** Users can view their progress through total points collected over time, see their following assigned tasks and potential points, and track their level progression.
- **Leader board: Users** can view their ranking on a leader board, fostering friendly competition and motivation by showing who is at the top and how to reach higher ranks.
- **Task management and point allocation:** The app allows for the assignment of both automated (e.g., logging in daily, using an app) and manual tasks (e.g., identifying a bottleneck, submitting improvement proposals), with points allocated for successful completion.
- **Achievement and reward system:** Users will receive points for completing milestones and tasks, providing a sense of accomplishment and encouraging continued engagement.
- **Gamification admin functionality:** Admins can assign tasks to users or user groups, allocate points for manual task completion, and monitor team performance in terms of user adoption and platform engagement.

## Next steps

Ready to install, configure, and use the Gamification App?

- For admins ready to set up the app: [Installing the app](installing-and-configuring-the-gamification-app.html "Installing and configuring the Gamification app")
- For end-users who want to start earning points: [Using the Gamification App](using-the-gamification-app.html "Using the Gamification App")
- For advanced users looking to extend these features to custom Studio apps: [Gamify Any App](gamify-any-app.html "Gamify Any App")


---

## admin/gamification/installing-and-configuring-the-gamification-app

# Installing and configuring the Gamification app

The Gamification app for the Celonis Platform is a strategic tool designed to drive platform adoption and user engagement by rewarding specific activities with points. By tracking behaviors such as daily logins, feature usage, and login streaks, the app transforms platform interaction into a competitive and rewarding experience.

Expand all

[## Before you begin](#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-idm23510584916428_body)

Before installing and configuring the Gamification app, complete the following:

- **Define your scope**: Decide who will be participating in the gamification experience.

  - **Target audience**: Will this be a global rollout for the entire company, or limited to specific teams (e.g., sales, logistics, or power users)?
- **Privacy and data transparency**: It’s important to understand what data is being used. You can reassure stakeholders with these points:

  - **Data residency**: All data stays within your Celonis environment; nothing is sent to external servers.
  - **What is tracked?** The app only looks at login history, app usage, and user/group mappings.
  - **Admin visibility**: Admins can monitor this activity via the platform adoption dashboard.
- **Application key**: Create an Application Key with relevant team-level permissions. See: [Application keys](application-keys.html "Creating and granting permissions to application keys")

[## Configuring the data extraction](#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-id235478770304192_body)

To power the Gamification App, you must first establish a connection via the Monitoring Platform Adoption connector. This allows the system to pull the initial dataset required for tracking user activity.

### 1. Choosing your connection method

While two methods are available, OAuth 2.0 is the recommended standard for security and ease of use:

- **Option A (Recommended)**: Follow the [Installing the Platform Adoption Monitor App guide](installing-the-platform-adoption-monitor-app.html "Installing the Platform Adoption Monitor App") to set up an OAuth 2.0 connection.
- **Option B (AppKey)**: If using an Application Key, ensure it was created with the correct permissions as defined in the [Before you begin](installing-and-configuring-the-gamification-app.html#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-idm23510584916428 "Before you begin") section.

#### 2. Configuring the data pool

Once the connector is installed, it will appear as a new Data Pool containing the necessary extractor configurations and transformations.

1. Click **Data Integration** and open the newly created data pool.
2. Click **Data Connections** and open the connection named Platform Adoptio.
3. **Update the configuration**: Enter your specific Team Environment URL and the AppKey you generated earlier.
4. **Validate**: Click **Test Connection** to ensure the link between Celonis and the adoption data is active.

#### 3. Extracting the initial dataset

With the connection verified, you must now pull the baseline data:

1. Open the **Data Jobs** within your Data Pool.
2. Execute the following two jobs in order:

   1. Member Details
   2. Platform Adoption and Login History

   If the jobs fail, revisit your App Key permissions to ensure it has "Read" access to the required platform metadata.

[## Configuring the data model](#id481896_body)

Once the initial data has been extracted, you must configure the Data Model to transform raw logs into actionable gamification metrics. This stage involves setting up parameters to define the application's start date, creating the tables that will store user points, and establishing the relationships between user activity and reward logic.

To set up your data model:

1. **Define the Application Start Date**: You must set a baseline date to determine when the app should begin calculating points.

   - Navigate to your **Data Pool Parameters**.
   - Create a new parameter named `GamificationStartDate`.
   - Set the **Type** to `Date` and provide a default value (e.g., the date you intend to launch the gamification program).
2. **Configure the "Gamification" Data Job**: This job transforms raw activity logs into user points. This must be a GLOBAL data job. Do not write transformations directly into the data source scope.

   Add a new Global Data Job named "Gamification" and include the following three transformations in this specific order:

   Filter
   - Name
   - Description
   - Transformation

   | Name | Description | Transformation |
   | --- | --- | --- |
   | Create Tables : Points Allocation & Assignments | PointsAllocation : Table to log user’s points.  Assignments : Table to map challenges against users.  Note: This should be disabled after first run | ``` DROP TABLE IF EXISTS PointsAllocation; CREATE TABLE IF NOT EXISTS PointsAllocation ( ID IDENTITY(1,1), UserID varchar(200), "AllocatedOn" Timestamp, AllocatedPoints integer, AssignmentID integer, -- PackageKey varchar(100), Comment varchar(250), _CELONIS_CHANGE_DATE timestamp );   DROP TABLE IF EXISTS Assignments; CREATE TABLE IF NOT EXISTS Assignments ( ID IDENTITY(1,1), AssignmentName varchar(500), UserEmail varchar(100), Description varchar(1000), IsAutomated BOOLEAN, -- R = Recurring, O = Onetime Frequency varchar(100), ExpectedPoints integer, DueDate timestamp, PackageKey varchar(100), _CELONIS_CHANGE_DATE timestamp );     -- Create a unique list of assignments created via automation CREATE OR REPLACE VIEW AssignmentList AS SELECT DISTINCT "Assignments"."AssignmentName", "Assignments"."IsAutomated", "Assignments"."Frequency", "Assignments"."Description", "Assignments"."ExpectedPoints", "Assignments"."DueDate", "Assignments"."PackageKey" FROM "Assignments"; ``` |
   | Create Default Challenges | Creates default challenges for all users part of the team | ``` -- Default assignments will always be assigned to all users. Limit this by adding a where clause if required.     INSERT INTO Assignments (AssignmentName,UserEmail,Description,Frequency,IsAutomated,ExpectedPoints,DueDate,PackageKey,_CELONIS_CHANGE_DATE) SELECT 'Daily Login', "User_List"."email", 'Points for daily logging in', 'R', 1, 5, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Daily Login') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Login Streak', "User_List"."email", 'Logging in for 4 consecutive working days', 'R', 1, 50, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Login Streak') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Using Package', "User_List"."email", 'Using packages you have access to at least once a month', 'R', 1, 10, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Using Package') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Share Insights', "User_List"."email", 'What seems natural to you can be a real game changer for others. Share your perspective!', 'R', 1, 150, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Share Insights') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL ``` |
   | Award Daily Points | Transformations to award points based on Daily Login, Login Streak & Usage of Apps.  Note : Add a new transformation parameter “GamificationStartDate” linked with the data pool parameter. | ``` ------------------------------- Mission : Daily login ------------------------------- -- Check when was the last time they were awarded point for logging in. INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) WITH LastPointsAllocatedForLogin AS (select "PointsAllocation"."UserID" email,max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Logging in on %' group by "PointsAllocation"."UserID") -- Find what day they logged in & # of times per day. assign points as per last allocation & start date. 5 points per login. 40 points per day at max. (select lh.email, -- CURRENT_TIMESTAMP, CAST(lh."timestamp" AS DATE), LEAST(count(*) * 5.0,40.0) points_earned, Assignments.ID, CONCAT('Logging in on ',CAST(CAST(lh."timestamp" AS DATE) AS VARCHAR)) days_logged_in -- count(*) total_logins, from <%=DATASOURCE:PLATFORM_ADOPTION%>."login_history" lh left join LastPointsAllocatedForLogin using(email) left join "Assignments" on "Assignments"."UserEmail" = lh.email AND "Assignments"."AssignmentName" = 'Daily Login' where "lh"."authenticationEventType" LIKE '%LOGIN%' AND CAST(lh."timestamp" AS DATE) > CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP) AND Assignments.ID IS NOT NULL group by lh.email,CAST(lh."timestamp" AS DATE),Assignments.ID);   -- select <%=GamificationStartDate%>   ------------------------------- Mission : Use all boards once a month -------------------------------   INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) WITH PointsAllocatedForLoginLastMonth AS (select "PointsAllocation"."UserID" email,"PointsAllocation"."Comment",max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Using Boards%' group by "PointsAllocation"."UserID","PointsAllocation"."Comment") select app_usage."user$email", -- CURRENT_TIMESTAMP, app_usage."timestamp", LEAST(count(distinct "asset$name") * 10.0, 100) points_earned, Assignments.ID, 'Using ' || count(distinct "asset$name") || ' Board(s)' usages -- CAST(app_usage."timestamp" AS DATE) days_logged_in, -- count(distinct "asset$name") total_used,   from <%=DATASOURCE:PLATFORM_ADOPTION%>."user_adoption_apps" app_usage left join PointsAllocatedForLoginLastMonth pa on (pa.email = app_usage."user$email") left join "Assignments" on "Assignments"."UserEmail" = pa.email AND "Assignments"."AssignmentName" = 'Using Package' where TIMESTAMPADD (MONTH, 1, (CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP))) = CAST(CURRENT_TIMESTAMP AS DATE) AND CAST(app_usage."timestamp" AS DATE) > CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP) AND Assignments.ID IS NOT NULL group by app_usage."user$email",app_usage."timestamp",Assignments.ID;   -- 15 boards in total -- 100 points if used all of them - 10 per board, limit 100 pts max -- 10 per board anyway   ------------------------------- Mission : Login Streak (4 WD) -------------------------------     INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) -- Check when users were last awarded WITH PointsAllocatedForConsecutive AS (select "PointsAllocation"."UserID" as email,"PointsAllocation"."Comment",max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Login Streak%' group by "PointsAllocation"."UserID","PointsAllocation"."Comment"), LoginDays AS (    SELECT DISTINCT lh.email as UserID, CAST("timestamp" AS DATE) AS LoginDate,    DAYOFWEEK_ISO("timestamp") dow    FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."login_history" lh    LEFT JOIN PointsAllocatedForConsecutive pa using(email)    WHERE    "lh"."authenticationEventType" LIKE '%LOGIN%' AND    -- Only check for login streak if not awarded previously    pa.LastAllocation IS NULL AND    -- Filter to check for login streak since start date    CAST("timestamp" AS DATE) > CAST(<%=GamificationStartDate%> AS TIMESTAMP)    -- Filter for weekday logins    AND DAYOFWEEK_ISO("timestamp") BETWEEN 1 AND 5    order by CAST("timestamp" AS DATE) desc ), -- Check for last 3 logins for each row ConsecutiveWorkingDays AS (  select  *,  LAG(LoginDate, 1) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last1LoginDate,  LAG(LoginDate, 2) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last2LoginDate,  LAG(LoginDate, 3) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last3LoginDate  FROM LoginDays ), -- Check if the difference is 0d for last 4 logins FindDifferences AS ( select UserID, LoginDate, CASE WHEN DATEDIFF(day,LoginDate,Last1LoginDate) = -3 AND DAYOFWEEK_ISO(LoginDate)=1 AND DAYOFWEEK_ISO(Last1LoginDate)=5 THEN -1 ELSE DATEDIFF(day,LoginDate,Last1LoginDate) END diff1, Last1LoginDate, CASE WHEN DATEDIFF(day,Last1LoginDate,Last2LoginDate) = -3 AND DAYOFWEEK_ISO(Last1LoginDate)=1 AND DAYOFWEEK_ISO(Last2LoginDate)=5 THEN -1 ELSE DATEDIFF(day,Last1LoginDate,Last2LoginDate) END diff2, Last2LoginDate, CASE WHEN DATEDIFF(day,Last2LoginDate,Last3LoginDate) = -3 AND DAYOFWEEK_ISO(Last2LoginDate)=1 AND DAYOFWEEK_ISO(Last3LoginDate)=5 THEN -1 ELSE DATEDIFF(day,Last2LoginDate,Last3LoginDate) END diff3, Last3LoginDate from ConsecutiveWorkingDays order by 1,2 ) -- Award points select UserID, LoginDate ts, 50 pts, "Assignments".ID assignment, 'Login Streak maintained for 4 days between ' || CAST(CAST(Last3LoginDate AS DATE) AS VARCHAR) || ' and ' || CAST(CAST(LoginDate AS DATE) AS VARCHAR) comm from FindDifferences left join "Assignments" on "Assignments"."UserEmail" = UserID AND "Assignments"."AssignmentName" = 'Login Streak' where diff1+diff2+diff3 = -3 AND Assignments.ID IS NOT NULL ``` |

   | Name | Description | Transformation |
   | --- | --- | --- |
   | Create Tables : Points Allocation & Assignments | PointsAllocation : Table to log user’s points.  Assignments : Table to map challenges against users.  Note: This should be disabled after first run | ``` DROP TABLE IF EXISTS PointsAllocation; CREATE TABLE IF NOT EXISTS PointsAllocation ( ID IDENTITY(1,1), UserID varchar(200), "AllocatedOn" Timestamp, AllocatedPoints integer, AssignmentID integer, -- PackageKey varchar(100), Comment varchar(250), _CELONIS_CHANGE_DATE timestamp );   DROP TABLE IF EXISTS Assignments; CREATE TABLE IF NOT EXISTS Assignments ( ID IDENTITY(1,1), AssignmentName varchar(500), UserEmail varchar(100), Description varchar(1000), IsAutomated BOOLEAN, -- R = Recurring, O = Onetime Frequency varchar(100), ExpectedPoints integer, DueDate timestamp, PackageKey varchar(100), _CELONIS_CHANGE_DATE timestamp );     -- Create a unique list of assignments created via automation CREATE OR REPLACE VIEW AssignmentList AS SELECT DISTINCT "Assignments"."AssignmentName", "Assignments"."IsAutomated", "Assignments"."Frequency", "Assignments"."Description", "Assignments"."ExpectedPoints", "Assignments"."DueDate", "Assignments"."PackageKey" FROM "Assignments"; ``` |
   | Create Default Challenges | Creates default challenges for all users part of the team | ``` -- Default assignments will always be assigned to all users. Limit this by adding a where clause if required.     INSERT INTO Assignments (AssignmentName,UserEmail,Description,Frequency,IsAutomated,ExpectedPoints,DueDate,PackageKey,_CELONIS_CHANGE_DATE) SELECT 'Daily Login', "User_List"."email", 'Points for daily logging in', 'R', 1, 5, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Daily Login') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Login Streak', "User_List"."email", 'Logging in for 4 consecutive working days', 'R', 1, 50, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Login Streak') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Using Package', "User_List"."email", 'Using packages you have access to at least once a month', 'R', 1, 10, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Using Package') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL   UNION ALL   SELECT 'Share Insights', "User_List"."email", 'What seems natural to you can be a real game changer for others. Share your perspective!', 'R', 1, 150, NULL, NULL, CURRENT_TIMESTAMP FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."User_List" LEFT JOIN (SELECT UserEmail,"AssignmentName" FROM "Assignments" WHERE AssignmentName='Share Insights') a ON "a"."UserEmail" = "User_List"."email" WHERE "a"."UserEmail" IS NULL ``` |
   | Award Daily Points | Transformations to award points based on Daily Login, Login Streak & Usage of Apps.  Note : Add a new transformation parameter “GamificationStartDate” linked with the data pool parameter. | ``` ------------------------------- Mission : Daily login ------------------------------- -- Check when was the last time they were awarded point for logging in. INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) WITH LastPointsAllocatedForLogin AS (select "PointsAllocation"."UserID" email,max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Logging in on %' group by "PointsAllocation"."UserID") -- Find what day they logged in & # of times per day. assign points as per last allocation & start date. 5 points per login. 40 points per day at max. (select lh.email, -- CURRENT_TIMESTAMP, CAST(lh."timestamp" AS DATE), LEAST(count(*) * 5.0,40.0) points_earned, Assignments.ID, CONCAT('Logging in on ',CAST(CAST(lh."timestamp" AS DATE) AS VARCHAR)) days_logged_in -- count(*) total_logins, from <%=DATASOURCE:PLATFORM_ADOPTION%>."login_history" lh left join LastPointsAllocatedForLogin using(email) left join "Assignments" on "Assignments"."UserEmail" = lh.email AND "Assignments"."AssignmentName" = 'Daily Login' where "lh"."authenticationEventType" LIKE '%LOGIN%' AND CAST(lh."timestamp" AS DATE) > CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP) AND Assignments.ID IS NOT NULL group by lh.email,CAST(lh."timestamp" AS DATE),Assignments.ID);   -- select <%=GamificationStartDate%>   ------------------------------- Mission : Use all boards once a month -------------------------------   INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) WITH PointsAllocatedForLoginLastMonth AS (select "PointsAllocation"."UserID" email,"PointsAllocation"."Comment",max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Using Boards%' group by "PointsAllocation"."UserID","PointsAllocation"."Comment") select app_usage."user$email", -- CURRENT_TIMESTAMP, app_usage."timestamp", LEAST(count(distinct "asset$name") * 10.0, 100) points_earned, Assignments.ID, 'Using ' || count(distinct "asset$name") || ' Board(s)' usages -- CAST(app_usage."timestamp" AS DATE) days_logged_in, -- count(distinct "asset$name") total_used,   from <%=DATASOURCE:PLATFORM_ADOPTION%>."user_adoption_apps" app_usage left join PointsAllocatedForLoginLastMonth pa on (pa.email = app_usage."user$email") left join "Assignments" on "Assignments"."UserEmail" = pa.email AND "Assignments"."AssignmentName" = 'Using Package' where TIMESTAMPADD (MONTH, 1, (CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP))) = CAST(CURRENT_TIMESTAMP AS DATE) AND CAST(app_usage."timestamp" AS DATE) > CAST(COALESCE(LastAllocation,<%=GamificationStartDate%>) AS TIMESTAMP) AND Assignments.ID IS NOT NULL group by app_usage."user$email",app_usage."timestamp",Assignments.ID;   -- 15 boards in total -- 100 points if used all of them - 10 per board, limit 100 pts max -- 10 per board anyway   ------------------------------- Mission : Login Streak (4 WD) -------------------------------     INSERT INTO "PointsAllocation" (UserID,AllocatedOn,AllocatedPoints,AssignmentID,Comment) -- Check when users were last awarded WITH PointsAllocatedForConsecutive AS (select "PointsAllocation"."UserID" as email,"PointsAllocation"."Comment",max("PointsAllocation"."AllocatedOn") LastAllocation from PointsAllocation where "PointsAllocation"."Comment" LIKE 'Login Streak%' group by "PointsAllocation"."UserID","PointsAllocation"."Comment"), LoginDays AS (    SELECT DISTINCT lh.email as UserID, CAST("timestamp" AS DATE) AS LoginDate,    DAYOFWEEK_ISO("timestamp") dow    FROM <%=DATASOURCE:PLATFORM_ADOPTION%>."login_history" lh    LEFT JOIN PointsAllocatedForConsecutive pa using(email)    WHERE    "lh"."authenticationEventType" LIKE '%LOGIN%' AND    -- Only check for login streak if not awarded previously    pa.LastAllocation IS NULL AND    -- Filter to check for login streak since start date    CAST("timestamp" AS DATE) > CAST(<%=GamificationStartDate%> AS TIMESTAMP)    -- Filter for weekday logins    AND DAYOFWEEK_ISO("timestamp") BETWEEN 1 AND 5    order by CAST("timestamp" AS DATE) desc ), -- Check for last 3 logins for each row ConsecutiveWorkingDays AS (  select  *,  LAG(LoginDate, 1) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last1LoginDate,  LAG(LoginDate, 2) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last2LoginDate,  LAG(LoginDate, 3) OVER       (PARTITION BY UserID ORDER BY LoginDate) AS Last3LoginDate  FROM LoginDays ), -- Check if the difference is 0d for last 4 logins FindDifferences AS ( select UserID, LoginDate, CASE WHEN DATEDIFF(day,LoginDate,Last1LoginDate) = -3 AND DAYOFWEEK_ISO(LoginDate)=1 AND DAYOFWEEK_ISO(Last1LoginDate)=5 THEN -1 ELSE DATEDIFF(day,LoginDate,Last1LoginDate) END diff1, Last1LoginDate, CASE WHEN DATEDIFF(day,Last1LoginDate,Last2LoginDate) = -3 AND DAYOFWEEK_ISO(Last1LoginDate)=1 AND DAYOFWEEK_ISO(Last2LoginDate)=5 THEN -1 ELSE DATEDIFF(day,Last1LoginDate,Last2LoginDate) END diff2, Last2LoginDate, CASE WHEN DATEDIFF(day,Last2LoginDate,Last3LoginDate) = -3 AND DAYOFWEEK_ISO(Last2LoginDate)=1 AND DAYOFWEEK_ISO(Last3LoginDate)=5 THEN -1 ELSE DATEDIFF(day,Last2LoginDate,Last3LoginDate) END diff3, Last3LoginDate from ConsecutiveWorkingDays order by 1,2 ) -- Award points select UserID, LoginDate ts, 50 pts, "Assignments".ID assignment, 'Login Streak maintained for 4 days between ' || CAST(CAST(Last3LoginDate AS DATE) AS VARCHAR) || ' and ' || CAST(CAST(LoginDate AS DATE) AS VARCHAR) comm from FindDifferences left join "Assignments" on "Assignments"."UserEmail" = UserID AND "Assignments"."AssignmentName" = 'Login Streak' where diff1+diff2+diff3 = -3 AND Assignments.ID IS NOT NULL ``` |
3. **Build the Data Model relationships**: Create a new Data Model and link the tables using the following schema to ensure the app can aggregate points correctly:

   Filter
   - Dimension Table
   - PK
   - FK
   - Fact Table

   | Dimension Table | PK | FK | Fact Table |
   | --- | --- | --- | --- |
   | User\_List | ID | ID | Group\_List |
   | User\_List | email | EmailUser | Assignments |
   | AssignmentList | AssignmentName | AssignmentName | Assignments |
   | Assignments | ID  UserEmail | AssignmentID  UserID | PointsAllocation |

   | Dimension Table | PK | FK | Fact Table |
   | --- | --- | --- | --- |
   | User\_List | ID | ID | Group\_List |
   | User\_List | email | EmailUser | Assignments |
   | AssignmentList | AssignmentName | AssignmentName | Assignments |
   | Assignments | ID  UserEmail | AssignmentID  UserID | PointsAllocation |

   The end result should be as shown here (Ensure you set up an identifier for each table as per the primary key mentioned in the above table):

[## Loading the data model](#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-id235478872529123_body)

Because the SQL script contains `CREATE TABLE` statements, you must follow this specific initialization sequence to avoid overwriting your data in the future.

1. **Initialize tables**: In your "Gamification" Data Job, run the transformation `Create Tables: Points Allocation & Assignments` only once. This creates the physical storage for your points.
2. **Disable the Initialization**: Immediately Disable or remove the `Create Tables` transformation from the job.

   If left enabled, every subsequent run will drop the existing tables and delete all previously earned user points.
3. **Execute logic**: Run the remaining transformations in the "Gamification" Data Job (e.g., Create Default Challenges and Award Daily Points) to populate the tables with data.
4. **Final Load**: Go to your Data Model and click **Load Data Model** to make the data available for the application.

[## Finalizing the setup](#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-id235478872702047_body)

Once the data model is loaded, perform these final steps to go live:

1. **Link the Knowledge Model**: Assign the Data Model variable to the Knowledge Model (KM) at the package level. This ensures the frontend components can "see" the data you just processed.
2. **Automate Point Calculations**: To keep the leaderboards up to date, schedule the “Gamification” Data Job to run Daily (typically during off-peak hours). This will automatically calculate new points for logins and streaks every 24 hours.
3. **Verify permissions**: Ensure the Application Key used for this process has the following permissions:

   - **Read Access**: To the "Monitoring Platform Adoption" Data Pool.
   - **Write Access**: To the "Gamification" Global Data Job to allow for table updates.

[## Optional: Enable Action Flows and Skills](#UUID-67b52946-54d9-ad80-6e03-064865c3e40e_section-id235478893154617_body)

For advanced automations (like manual point overrides or custom assignments), OAuth-based App Keys are not supported. Use a Basic Auth-based App Key for these steps:

1. **Grant Access**: Provide the Application Key with "Package Access" and "Edit" permissions for the Gamification package.
2. **Update Skills**: Open the following Skills and swap in your new Application Key:

   - Add Assignment
   - Allocate Points
3. **Update Action Flows**: Save the Application Key within the following Action Flows:

   - Trigger Manual Allocation
   - Add New Assignment
   - Trigger Submission

## Related topics

- [Using the Gamification App](using-the-gamification-app.html "Using the Gamification App")
- [Gamify Any App](gamify-any-app.html "Gamify Any App")
- [Troubleshooting](troubleshooting-the-gamification-app.html "Troubleshooting the Gamification app")


---

## admin/gamification/troubleshooting-the-gamification-app

# Troubleshooting the Gamification app

Identify and resolve common issues encountered when configuring or using this feature.

Expand all

[## Action flows appear blank or perpetual loading](#id482342_body)

**The logic:** This is usually caused by a "zombie" connection where the UI calls an Action Flow ID that no longer exists. Since the app can't "find" the flow, the UI components stay in a loading loop.

**The fix:** Re-establish the bridge between the UI and the automation engine:

- Request the official Action Flow Blueprint from Celonis Support.
- Delete non-functional flows and import the new blueprint.
- Update the links in the "Add new Assignment" and "Admin View" to point to the new IDs.

[## Augmented attributes not found](#id482355_body)

**The logic:** Augmented attributes are custom metadata layers. When you duplicate a Data Model, these layers often don't copy over, leaving the app looking for "ghost" columns.

**The fix:** Re-create the Gamification data model from scratch rather than copying an old one. Connect this new model directly to the app to ensure attribute definitions generate correctly.

[## Resetting the leaderboard for a new season](#id482361_body)

**The logic:** This involves a "snapshot and clear" strategy—ignoring old data via a date filter and providing fresh table containers for new scores.

**The fix:**

- Update the `GamificationStartDate` parameter in the Data Pool.
- Archive old data using the following SQL:

  ```
  ALTER TABLE "Assignments" RENAME TO "Assignments_Backup_2024_Q1";
  ALTER TABLE "Points_Allocation" RENAME TO "Points_Allocation_Backup_2024_Q1";
  ```
- Run the transformation "Create Tables: Points Allocation & Assignments" followed by your data job.

[## Deleting or hiding challenges](#id482376_body)

**The logic:** The app UI protects data integrity by omitting a delete button. You must either purge the record via SQL or filter it out of the UI view.

**Option A: Permanent delete (SQL)**

```
DELETE FROM "Assignments" WHERE "id" = 'CHALLENGE_ID_HERE';
```

**Option B: Soft delete (UI filter)**

To hide challenges without losing data, update the status to "Hidden" and apply this PQL filter to your components:

`FILTER "Assignments"."Status" != 'Hidden';`

[## Points not awarding after completing a challenge](#id482388_body)

**The logic:** Points are calculated by a data job scanning for "Completed" statuses. If points don't appear, the data pipeline is likely failing to bridge the activity from the source system to the Gamification tables.

**The fix:**

- Ensure the Gamification data job ran after the activity occurred.
- Verify the `UserID` in the activity table matches the `UserID` in the Participants table (this is case-sensitive).
- Use the Manual Point Allocation action flow for specific edge cases.

[## New users not appearing in the participant list](#id482403_body)

**The logic:** Participants are pulled from a member details table. Restricted app-key permissions often prevent the app from "seeing" new users.

**The fix:** Ensure the Application Key has "View All Users" permissions and manually trigger the "Member Details" data job to sync the Celonis user list.

[## Leaderboard showing "no data" for specific teams](#id482409_body)

**The logic:** This is typically a filtering issue where team names in the data do not match the mapping in the Knowledge Model variables.

**The fix:** Verify the `Team_Mapping` variable in the Knowledge Model and check that the user viewing the component has the necessary data permissions for those specific users.

[## Action flow deactivated errors in admin view](#id482416_body)

**The logic:** Action flows deactivate after consecutive failures, often due to expired tokens or null values being passed to mandatory fields.

**The fix:** Re-authenticate the connection in the first module and enable "Incomplete Executions" in the flow settings to allow for troubleshooting without deactivation.

## Related topics

- [Installing the app](installing-and-configuring-the-gamification-app.html "Installing and configuring the Gamification app")
- [Using the Gamification App](using-the-gamification-app.html "Using the Gamification App")
- [Gamify Any App](gamify-any-app.html "Gamify Any App")


---

## admin/gamification/using-the-gamification-app

# Using the Gamification App

The Gamification App is designed to make your daily work in Celonis more engaging, rewarding, and—dare we say—fun. Think of it as a personal achievement system for your professional workflows. By completing tasks and staying active in the platform, you’ll earn points, unlock new levels, and see how you stack up against your teammates on the leaderboard.

Whether you're a seasoned pro or just getting started, this app helps you track your progress and get recognized for the great work you're already doing.

Expand all

[## Before you begin](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_section-id235478903288818_body)

Before you begin using the Gamification App, ensure that it is fully installed and configured

- [Installing the app](installing-and-configuring-the-gamification-app.html "Installing and configuring the Gamification app")

[## Admin: Setting up the game](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_section-id23547890338065_body)

As an admin, you can configure the game using the following:

[### 1. Initial configuration](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_section-id235478907293647_body)

Before you begin using the Gamification App, ensure that:

1. **Navigate** to the **App Settings** menu.
2. **Define levels**: Enter the specific point thresholds required for each of the 10 levels.
3. **Customize branding**: Change "Points" to your preferred currency (e.g., "Credits" or "Tokens").
4. **Privacy settings**: Select whether to display User IDs, Emails, or Full Names on the leaderboard.
5. **Filter participants**: Toggle Include Celonis Employees to "Off" if you want to limit the competition to external users only.

[### 2. Managing participants](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_section-id235478907367129_body)

To manage your app participants:

1. Open the Participants tab.
2. **Add users**: Select individuals from the predefined list to enroll them in the program (only enrolled users earn points).
3. **Appoint admins**: Toggle the Admin Status to "True" for users who need to approve submissions and receive email notifications.

[### 3. Creating and managing challenges](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_section-id235478907402775_body)

Follow these steps to build and oversee your challenges:

1. Go to Challenges Management and click Create New Challenge.
2. **Fill in Details:** Enter a Title, Description, and the Point Reward.
3. **Set Schedule:**

   - Choose **One-time (O)** for single tasks.
   - Choose **Recurring (R)** for habits you want users to repeat.
   - (Optional) Set a **Due Date** to create urgency.
4. **Review Submissions:**

   - Scroll to Review Challenge to see pending items.
   - Use the Personal Chat Box to ask the user for more details if needed.
   - Click Reward to grant points or Reject to send the assignment back to the user.

[## Users: Earning Points](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_user-procedures-earning-points_body)

Follow these steps to track your progress and complete challenges to earn rewards.

[### 1. Tracking progress](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_tracking-your-progress_body)

1. Open your Personal Dashboard.
2. Check your **Total Points** at the top to see your current standing and level.
3. View the Points History (bottom left) to see exactly which activities earned you points on a specific date.

[### 2. Completing a challenge](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_completing-a-challenge_body)

1. Locate the Next Actions / Pending Assignments section.
2. Click View All to see your full "to-do" list.
3. Select a challenge to read the specific requirements.
4. **Submit:** Once the task is done, enter your response and reasoning in the submission box and click Submit.

   **Note**

   Your points will not be added until an Admin approves the submission.

[### 3. Checking the leaderboard](#UUID-a5752af5-5ce5-bf75-e7ff-105164d7c34a_checking-the-leaderboard_body)

1. Scroll to the Leaderboards section.
2. Toggle between All-time, Last Week, and Last Month to see your rank across different timeframes.
3. Look for the **Rank Movement** indicator to see if you’ve climbed higher since your last login.

## Related topics

- [Installing the app](installing-and-configuring-the-gamification-app.html "Installing and configuring the Gamification app")
- [Gamify Any App](gamify-any-app.html "Gamify Any App")
- [Troubleshooting](troubleshooting-the-gamification-app.html "Troubleshooting the Gamification app")


---

## admin/administration

# Administration

Here, further information on the installation and on the role concept of Action Engine is provided.

- [Installation](administration.html#UUID-b2afe0d9-f567-f676-2111-5f0086810012_id_Administration-Installation "Installation")
- [User Roles](administration.html#UUID-b2afe0d9-f567-f676-2111-5f0086810012_id_Administration-UserRoles "User Roles")
- [Authorization concept](administration.html#UUID-b2afe0d9-f567-f676-2111-5f0086810012_id_Administration-Authorizationconcept "Authorization concept")
- [Data export](administration.html#UUID-b2afe0d9-f567-f676-2111-5f0086810012_id_Administration-Dataexport "Data export")

## Installation

Action Engine can be used in any infrastructure scenario, regardless of whether the Celonis Process Mining application is in the cloud or on-premise.

- **Full cloud / hybrid setting:** the only requirement for using the Action Engine is an Action Engine license to activate the feature.
- **On-premise setup:** a Celonis cloud team with (at least) the Action Engine feature activated must be requested. Then, the on-premise Celonis application and the cloud team must be linked by means of the Uplink connection.

## User Roles

For the Action Engine application, there exist two permissions:

- The **My Inbox permission** allows accessing the *My Inbox* site, which is all that is required for a business user. It is possible to interact with existing Signals the business user is subscribed to (read, assign, comment, etc.).
- The **Manage Skill permission** is required for the Action Engine configuration. It is possible to create Projects, within those create and edit Skills as well as Routing Rules, and give permissions to others to also edit Skills within created Projects.
- The **Access All Projects permission** allows to access all existing Projects and the Skills as well as Routing Rules within.

All permissions can be set as explained in [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions"). To set **Manage Skill permissions** or **Access All Projects permissions** for a user, Team role **Analyst** is required.

**Data Permissions**

Please note that "Manage Skill" permissions allow a user to create Skills on data models (only those the user has permissions to access) without consideration of data permissions.

## Authorization concept

In the Action Engine context, authorizations for end-users are handled via the routing rule concept. Users with *Manage Skill* permission can define which user will be subscribed to which Signal, based e.g. on the attribute of a defined data model column. For this reason, routing rules can be centrally managed and reused.

**On-premise scenario**

In the Uplink connection scenario, an additional layer of access restriction exists: All communication between the cloud team and the on-premise Celonis application is handled by an on-premise user called *Uplink User*. Depending on the Uplink User’s local authorization, only some data models might be accessible for executing Skills.

A user with *Manage Skill* permissions can create new *Projects* and create skills for these Projects. When creating a skill, the user can choose from the data models to which they have access. Permissions on Projects can be set to allow other users to edit skills in these projects. The *View All Projects* permission allows users to access skills in all projects.

## Data export

Action Engine provides endpoints through which you can export information about your team's Skills, Signals, and activities. These can be downloaded as Parquet files which can then be uploaded to a Data Pool to allow detailed analysis. For further information, see [Action Engine Connector.](action-engine-connector.html "Action Engine Connector")


---

## admin/administrator-features

# Administrator features

**Notice**

This section is legacy content and no longer updated. Refer to the [Celonis Process Management feature overview](https://docs.celonis.com/en/celonis-process-management-feature-overview.html) for a current list of all available CPM features.

Features can be enabled or disabled by users with the Administrator role in Celonis Process Management (CPM). Enabling or disabling features allows for Process Designer to be customized according to your organization's specific needs. The following sections describe all the features that admins can add to CPM.

## Related topics

- [Celonis Process Management feature overview](https://docs.celonis.com/en/celonis-process-management-feature-overview.html)


---

## admin/admin---settings

# Admin & Settings

**Access to admin features**

The topics included in our **Admin & Settings** content is intended for users who hold admin or variable admin permissions within their Celonis Platform team.

To learn more about team roles and permissions, see: [User and team roles](user-profile.html "User and team roles").

The Admin & Settings area includes features that allow you to control who can access your Celonis Platform and what permissions they hold within it.

As an admin of your Celonis Platform team, you can access this area by clicking **Admin & Settings** in the Navigation bar:

|  |
| --- |
|  |

From there, you have the following options:

## Updating your team name and logo

See: [Team name and logo](updating-your-team-name-and-logo.html "Updating your team name and logo")

## Configuring your security features

This includes: Team privacy, open sign up, IP-based restrictions, email signatures, signing in, account management, two-factor authentication, and session timeout settings.

See: [Security features](configuring-your-celonis-platform-security-features.html "Configuring your Celonis Platform security features")

## Managing permissions

This includes: User and team roles, inviting users to your team, creating and managing groups, assigning granular user permissions, assigning variable admin permissions, creating API keys, creating and granting permissions to application keys, and viewing and exporting permissions.

See: [Permissions](managing-celonis-platform-permissions.html "Managing Celonis Platform permissions")

## Managing users, licenses, and activity

This includes: Managing existing users, monitoring your license, viewing user login history, viewing your platform adoption, viewing your audit logs, implementing a user locking policy, setting contact admins, configuring a custom help link, accessing your download portal, and managing your system notifications.

See: [Users, licenses, and activity](managing-users,-licenses,-and-celonis-platform-activity.html "Managing users, licenses, and Celonis Platform activity")


---

## admin/generate-admin-auth-token

# Generate Admin Auth token

For certain services and apps, an authentication token is necessary to integrate with Process Designer. As an administrator, you can generate this token yourself in the Admin area.

Expand all

[## Before you begin](#id863570_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Have the **Admin** role in Process Designer.

[## Generating an authentication token](#id863577_body)

To generate an authentication token:

1. Log into Process Designer. Select the gear icon from the top-right navigation.
2. In the Administration area, under **Services**, click the **Automation** tile.
3. From the list, find "data, Rest-API endpoint" and create a new authentication token.

Make sure “End of Validity” and “Permissions” are set correctly (usually they need to be set as “Administrator”)

## Related topics

- [Reporting API](reporting-api.html "Reporting API")
- [Setting up SSO](setting-up-sso.html "Setting up SSO")


---

## admin/setting-contact-admins

# Setting contact admins

Setting contact admins allows you to streamline how your team members get help within the Celonis Platform. Instead of users feeling lost or reaching out to the wrong departments, this feature creates a direct line of communication.

Here are the primary reasons why you would want to set them up:

- **Centralized support**: It designates up to five specific experts as the "go-to" people for your team, ensuring that technical or process-related questions are handled by those who actually have the permissions to fix them.
- **Reduced friction**: When a user clicks Need Help? and then Contact your Admin, the platform automatically composes an email in their default client. This removes the need for users to hunt down email addresses or look up who is in charge of the workspace.
- **Faster issue resolution**: By directing queries to a specific group of admins, you prevent "support ticket tag," where requests are passed around between departments before landing on the right desk.
- **Customized guidance**: Because these admins are internal to your team, they can provide context-specific help that a general help desk might not know, such as specific naming conventions or internal data privacy rules.

To request assistance, the users click **Need Help?** and then **Contact your Admin**. This composes a new email in their default email client.

|  |
| --- |
|  |

Expand all

[## Setting contact admins for your Celonis Platform team](#UUID-31692a41-b864-c053-54c9-6adcf06c0725_section-id235475238746538_body)

To set contact admins for your team:

1. Click **Admin & Settings - Settings**.
2. Scroll down to **Admin contacts** and click **+ Add**.

   |  |
   | --- |
   |  |
3. Select up to 5 existing users to be your contact admins.
4. Click **Save**.

Once set, you can return to this screen to add and remove users when necessary.

## Related topics

- [Inviting users](inviting-users-to-your-celonis-platform-team.html "Inviting users to your Celonis Platform team")
- [Custom help link](configuring-a-custom-help-link.html "Configuring a custom help link")
- [User and team roles](user-profile.html "User and team roles")


---

