# Task Mining

## task-mining/configuring-task-mining-data

# Configuring Task Mining data

The data captured for your Task Mining project may contain thousands of events from multiple applications and can be challenging to understand. Configuring the captured Task Mining data lets you group and label events and add business context so you can benefit from the granularity of the underlying Task Mining data while simplifying its analysis.

Expand all

[## Task Mining data configuration options](#UUID-6db5a24e-8f79-ae22-6bec-2757931fc508_section-id235233067956938_body)

**Note**

You must have the correct permissions to configure Task Mining data. For more information, see [Task Mining permissions](task-mining-permissions.html "Task Mining permissions").

Filter

- Data configuration option
- Description
- Example

| Data configuration option | Description | Example |
| --- | --- | --- |
| [Label Task Mining events](labeling-task-mining-events.html "Labeling Task Mining events") | A Label is applied to events captured by the Task Mining Client software allowing similar types of events to be identified and grouped. | Apply a label (`login`) to all events related to logging in to an application.  Allows simple analysis of the total time spent logging in across all users. |
| [Create Business Events from generic actions](creating-business-events-in-task-mining.html "Creating Business Events in Task Mining") | A Business Event associates generic user action events with semantically-meaningful events to provide business context. | Associate a click action with a **Submit invoice** event to add business context to the generic click action. |
| [Group Task Mining events into larger Tasks](grouping-task-mining-events-into-tasks.html "Grouping Task Mining events into Tasks") | A Task includes a sequence of events that form a coherent unit of work and typically represent a user completing a set of actions towards a specific goal. | Create a Task called **Create an invoice** which includes all related user actions like entering customer details, adding item lines and submitting the invoice. |

| Data configuration option | Description | Example |
| --- | --- | --- |
| [Label Task Mining events](labeling-task-mining-events.html "Labeling Task Mining events") | A Label is applied to events captured by the Task Mining Client software allowing similar types of events to be identified and grouped. | Apply a label (`login`) to all events related to logging in to an application.  Allows simple analysis of the total time spent logging in across all users. |
| [Create Business Events from generic actions](creating-business-events-in-task-mining.html "Creating Business Events in Task Mining") | A Business Event associates generic user action events with semantically-meaningful events to provide business context. | Associate a click action with a **Submit invoice** event to add business context to the generic click action. |
| [Group Task Mining events into larger Tasks](grouping-task-mining-events-into-tasks.html "Grouping Task Mining events into Tasks") | A Task includes a sequence of events that form a coherent unit of work and typically represent a user completing a set of actions towards a specific goal. | Create a Task called **Create an invoice** which includes all related user actions like entering customer details, adding item lines and submitting the invoice. |

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings")
- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")


---

## task-mining/configuring-task-mining-projects

# Configuring Task Mining projects

Each Task Mining project is configured individually by specifying its configuration settings. The configuration settings control:

- When and how the Task Mining Client software connects to the Celonis Platform.
- The Task Mining data that is captured for the Task Mining project.

The configuration settings for a Task Mining project are stored in its configuration file. You can tailor your Task Mining project to a specific use case by specifying its configuration settings or editing an existing configuration file.

**Note**

For information about using the captured data, see [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data").

When creating a project, you specify whether you want to use basic or advanced client settings in the Task Mining project’s [Client Settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings").

Use:

- **Basic settings** if you want to get up and running with Task Mining and are happy to use the default settings.
- **Advanced settings** if you want to specify your configuration settings more precisely; typically you specify advanced settings in the Configuration Editor which you’ll need to [install](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)").

**Note**

If you don’t specify a value for a configuration setting, the default configuration value will be used. You can edit your configuration file to change the configuration settings later if necessary.

Expand all

[## Before you begin](#id828657_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- [Created a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")

[## Downloading and editing a Task Mining configuration file](#UUID-1b7d8914-72b4-b868-f4c5-e79d0ac53dca_section-id235231754458951_body)

1. In the Task Mining project home page, go to **Client Settings**.
2. Enable **Use advanced settings**.

   **Note**

   You must enable advanced settings even if your Task Mining project was created with basic settings.
3. Select **Download current configuration file and edit it in the editor**.

   Information about the configuration file appears.
4. Select **Download File**.
5. Open the downloaded configuration file in a text editor.
6. Edit your configuration file, referencing the [configuration settings](https://docs.celonis.com/en/task-mining-configuration-editor-settings.html#UUID-1b0ba501-3e70-1933-c3b6-6f017cc0c164_section-idm235043031382986) as necessary.
7. Save your edited configuration file locally.
8. In the Task Mining project’s **Client Settings**, select **Upload new configuration file**.
9. Upload your edited configuration file.
10. Select **Save Client Settings**.

**Important**

You should restart the Task Mining Client software to ensure the updated configuration file is loaded. We also recommend restarting your browser.

[## Using the Task Mining Configuration Editor](#UUID-1b7d8914-72b4-b868-f4c5-e79d0ac53dca_section-id23523176189968_body)

**Note**

The Configuration Editor is optional and only required if you want to configure advanced client settings for a Task Mining project. For more information, see [Installing the Configuration Editor](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)"). **Search for Celonis Task Mining - Configuration Editor** in your Windows task bar. If you can’t find it, you’ll need to [install](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)") it.

1. Open the Configuration Editor.

   |  |
   | --- |
   |  |
2. To:

   - Edit an existing configuration file, select **Open File** and navigate to the file.
   - Create a new configuration file, select **New Configuration**.

   You can also use the **Configuration Editor Application** menu to open and create configuration files.

   The **Task Mining Configuration Editor Data Connection** screen opens.

   |  |
   | --- |
   |  |
3. Use the sidebar navigation to access all the configuration settings.

   The Configuration Editor is auto-populated with the:

   - Configuration setting values from the configuration file if **Open File** was selected.
   - Default configuration setting values if **New Configuration** was selected.

   For information about the configuration setting values, see the [Task Mining Configuration Editor settings](https://docs.celonis.com/en/task-mining-configuration-editor-settings.html#UUID-1b0ba501-3e70-1933-c3b6-6f017cc0c164).
4. Navigate through each section and review and edit the configuration values as necessary.
5. Save your configuration file locally.
6. In the Task Mining project’s Client Settings, select **Upload new configuration file**.
7. Upload your configuration file.
8. Select **Save Client Settings**.

   **Important**

   You should restart the Task Mining Client software to ensure the updated configuration file is loaded. We also recommend restarting your browser.

[## Task Mining basic and advanced configuration settings](#UUID-1b7d8914-72b4-b868-f4c5-e79d0ac53dca_section-id235129611037287_body)

Filter

- Functionality
- Basic settings
- Advance settings

| Functionality | Basic settings | Advance settings |
| --- | --- | --- |
| Define the events and attributes that are captured for a Task Mining project. | Applications and URLs can be allowlisted and denylisted only. | Custom rules allow specific event data and attributes to be captured. |
| Data redaction. | Basic. | Custom. |
| Define custom employee user attributes for use in the Workforce Productivity app. | No. | Yes. |
| Web page data can extracted from websites, even when a user doesn’t interact with the web page data. | No. | Yes. |

| Functionality | Basic settings | Advance settings |
| --- | --- | --- |
| Define the events and attributes that are captured for a Task Mining project. | Applications and URLs can be allowlisted and denylisted only. | Custom rules allow specific event data and attributes to be captured. |
| Data redaction. | Basic. | Custom. |
| Define custom employee user attributes for use in the Workforce Productivity app. | No. | Yes. |
| Web page data can extracted from websites, even when a user doesn’t interact with the web page data. | No. | Yes. |

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings")
- [Configuring Task Mining data](configuring-task-mining-data.html "Configuring Task Mining data")


---

## task-mining/creating-a-task-mining-project

# Creating a Task Mining project

Creating a Task Mining project is done in 6 stages: creating the project, configuring it, testing and validating it, and finally rolling it out to your team.

Expand all

[## Before you begin](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm2350260482159_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Have CREATE PROJECT permissions
- Access to the [Workflow Productivity app](https://docs.celonis.com/en/task-mining-workforce-productivity-quickstart-template.html) for the configuration stage

**Note**

If you're an admin, you'll automatically have Task Mining CREATE PROJECT permissions. If you're an analyst, CREATE PROJECT permissions will need to be assigned to you. You may also need additional permissions outside Task Mining. For more information, see [Task Mining permissions](task-mining-permissions.html "Task Mining permissions").

[## Creating a Task Mining project](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-952bc3bb-85bf-b020-acca-dd87220d6413_body)

1. In the Celonis navigation bar, select **Data** > **Task Mining**.

   **Note**

   If you see a **Request Access** button, Task Mining hasn't been activated yet for your Celonis team. To get access, an additional licensing fee is payable. Talk to your Celonis account team or contact [Support](support.html "Contacting Support").
2. Select **Create New Project**.

   The **New Project** screen appears.
3. Enter a unique name for your Task Mining project.

   |  |
   | --- |
   |  |
4. Leave the project type as **Workforce Productivity**.

   **Important**

   The **Custom** project type has been superseded by the Workforce Productivity project type. Custom projects have limited functionality with Labels, Tasks, Business Events and automated data processing not supported, while integration with Studio is very limited. You should therefore only use Custom projects for legacy projects and with the support of your Celonis contact.
5. Select **Save**.

   Task Mining sets up the new project and opens the project’s **Home** page.

   |  |
   | --- |
   |  |

   For information about the components that are automatically set up for your project and how to view them, see [Task Mining components installed during project setup](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006888063224 "Task Mining components installed during project set up").

   **Tip**

   You can always find your Task Mining project by selecting **Data** > **Task Mining** in the Celonis navigation bar. If you have access to multiple Task Mining projects, use the **Search** field to find your project.

   |  |
   | --- |
   |  |
6. [Configure the Task Mining project](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-7fb6f2ea-e8d0-1fb9-cc9e-e074ad6e8721 "Configuring a Task Mining project").

[### Task Mining components installed during project set up](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006888063224_body)

**Note**

You must have appropriate permissions to access Task Mining components. For more information, see [Task Mining permissions](task-mining-permissions.html "Task Mining permissions").

Filter

- Component
- Accessing the component
- Component naming

| Component | Accessing the component | Component naming |
| --- | --- | --- |
| Background data processing service for your captured data. | In the Task Mining project navigation, select the **Run & Schedule** button  to open the **Run & Schedule** screen. In this screen you can:  - View the run history for your project. - Run data processing manually (either the full data set or a delta of the data set). - Schedule data processing to run when new data is uploaded or at specific user-defined intervals. | -- |
| Data Pool and case-centric data model containing default tables for a Task Mining project. | In the Task Mining project navigation, select the **Project Connection** button  > **Go to Data Pool**.  or  In the Celonis navigation bar, select **Data** > **Data Integration**. | `Task Mining Data Pool - your project name` |
| Storage bucket for captured screenshots. | In the Task Mining project navigation, select the **Project Connection** button  > **Go to Storage Manager**.  or  Add `storage-manager/ui/storage` to the Celonis team URL in the browser address bar:  ``` https://<team>.<cluster>.celonis.cloud/storage-manager/ui/storage ``` | `Task Mining Storage Bucket - your project name` |
| For Task Mining Client versions:  - From 2.17.0, OAuth credentials are generated automatically when the Task Mining Client connects for the first time. - Before 2.17.0, an application key is created for Celonis authentication. | In the Celonis navigation bar, select **Admin & Settings > Applications**. | `Task Mining App Key - your project name` |
| Workforce Productivity app in Studio displays the data captured from user machines by the Task Mining Client software.  For more information, see [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app") | On the **Home** page for your Task Mining project, select **Go to Analysis**.  or  In the Celonis navigation bar, select **Studio**, search for 'workforce productivity' in the Studio overview then select the app package named after your project.  **Note**  The Workforce Productivity app package is installed in the Studio default space if it exists. Otherwise, it's installed in the first Studio space Task Mining identifies.  If you access the Workforce Productivity app before you’ve captured any data, you’ll see errors in the views. Remove some of these errors by publishing a version of the app using the **Publish** button in any screen in your Studio space. | `your project name -  Workforce Productivity` |

| Component | Accessing the component | Component naming |
| --- | --- | --- |
| Background data processing service for your captured data. | In the Task Mining project navigation, select the **Run & Schedule** button  to open the **Run & Schedule** screen. In this screen you can:  - View the run history for your project. - Run data processing manually (either the full data set or a delta of the data set). - Schedule data processing to run when new data is uploaded or at specific user-defined intervals. | -- |
| Data Pool and case-centric data model containing default tables for a Task Mining project. | In the Task Mining project navigation, select the **Project Connection** button  > **Go to Data Pool**.  or  In the Celonis navigation bar, select **Data** > **Data Integration**. | `Task Mining Data Pool - your project name` |
| Storage bucket for captured screenshots. | In the Task Mining project navigation, select the **Project Connection** button  > **Go to Storage Manager**.  or  Add `storage-manager/ui/storage` to the Celonis team URL in the browser address bar:  ``` https://<team>.<cluster>.celonis.cloud/storage-manager/ui/storage ``` | `Task Mining Storage Bucket - your project name` |
| For Task Mining Client versions:  - From 2.17.0, OAuth credentials are generated automatically when the Task Mining Client connects for the first time. - Before 2.17.0, an application key is created for Celonis authentication. | In the Celonis navigation bar, select **Admin & Settings > Applications**. | `Task Mining App Key - your project name` |
| Workforce Productivity app in Studio displays the data captured from user machines by the Task Mining Client software.  For more information, see [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app") | On the **Home** page for your Task Mining project, select **Go to Analysis**.  or  In the Celonis navigation bar, select **Studio**, search for 'workforce productivity' in the Studio overview then select the app package named after your project.  **Note**  The Workforce Productivity app package is installed in the Studio default space if it exists. Otherwise, it's installed in the first Studio space Task Mining identifies.  If you access the Workforce Productivity app before you’ve captured any data, you’ll see errors in the views. Remove some of these errors by publishing a version of the app using the **Publish** button in any screen in your Studio space. | `your project name -  Workforce Productivity` |

[## Configuring a Task Mining project](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-7fb6f2ea-e8d0-1fb9-cc9e-e074ad6e8721_body)

This is where you create the configuration file for your Task Mining project. You can edit or update your configuration file later on if necessary in the Task Mining Configuration Editor.

1. Open the **Client Settings form** by selecting:

   1. **Go to Client Settings** on the **Home** page of your Task Mining project; or
   2. The **Client Settings** button  in the Task Mining project navigation.

   The **Client Settings form** appears.

   |  |
   | --- |
   |  |
2. Update the **Client Settings form** using the information in [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings").

   **Notice**

   We recommend leaving **Use basic settings** enabled for now. After initial testing, you can enable advanced client settings, if required, and use the [Configuration Editor](configuring-task-mining-projects.html "Configuring Task Mining projects") to refine and customize the data that is captured.
3. Select **Save Client Settings**.
4. [Test the Task Mining project](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-e694a662-1b17-41cd-dce8-0cd6cb08e75d "Testing a Task Mining project").

[### Task Mining basic client settings](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571_body)

Filter

- Section
- Options
- Sub-option
- Description
- Default setting

| Section | Options | Sub-option | Description | Default setting |
| --- | --- | --- | --- | --- |
| Captured Applications | Capture all applications and URLs | -- | Captures Task Mining data for all applications and web pages. | On |
| Captured Applications | Capture selected applications or URLs | Add Applications | Specifies which applications Task Mining data is captured from.  1. Select standard applications from the **Search Application** dropdown list. 2. Add other applications by copying the application's process name (without the .exe) from the Micosoft Windows Task Manager and pasting it in the **Add Custom Application** field. 3. Select **Add Application**. | Off |
| Captured Applications | Capture selected applications or URLs | Add URL(s) | Specifies which websites Task Mining data is captured from.  1. Enter the URL for each website you want to capture data from in the **URL** field. 2. Select **Add URL**. | Off |
| Captured Applications | Capture all applications and URLs but exclude some | Add Applications | Specifies which applications Task Mining data is not captured from.  1. Select standard applications to denylist from the **Search Application** dropdown list. 2. Add other applications to the denylist by copying the application's process name from the Microsoft Windows Task Manager and pasting it in the **Add Custom Application** field. 3. Select **Add Application**. | Off |
| Captured Applications | Capture all applications and URLs but exclude some | Add URL(s) | Specifies which websites Task Mining data is not captured from.  1. Enter the URL for each website you want to exclude in the **URL** field. 2. Select **Add URL**. | Off |
| Captured Details | Basic data | -- | Captures the basic data required for Task Mining including timestamps and types of user action.  **Note**  This is always turned on and cannot be turned off. | On |
| Captured Details | Name of active window or web tab | -- | Captures the name of the active window or web browser tab. | On |
| Captured Details | Context of application or webpage | -- | Captures contextual information about how the user interacts with the application or page including, for example, buttons selected. | Off |
| Captured Details | Input values | -- | Captures values input by the user from, for example, the keyboard or pasted from their clipboard. | Off |
| Captured Details | Screenshots of active window | -- | Captures screenshots of active windows. | Off |
| Privacy Settings | Hash user names | -- | Pseudonymizes user names in the Task Mining data. | On |
| Privacy Settings | Data redaction | Windows username | Redacts the Windows user name from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | Machine name | Redacts the Windows machine name from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | E-mail address | Redacts email addresses from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | US Social Security Number | Redacts US Social Security numbers from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | Credit Card Number | Redacts credit card numbers from the captured Task Mining data. | On |
| Startup Mode | Auto-start when computer starts | -- | Starts Task Mining automatically when the user’s computer starts. | Off |
| Startup Mode | Manual start by users | -- | Activates Task Mining manually when the user wants to start capturing data. | On |
| User Consent | User Consent | -- | Consent notice displayed to the user before the Task Mining data capture begins.  **Important**  While we’ve provided some guidance about what you might include, you MUST verify the text you include here with your organization’s legal department. | Placeholder text |
| User Consent | Specify the URL you are referring to in the consent (optional) | -- | URL where the user can view a webpage containing user consent information. | On |
| User Consent | Text of Checkbox | -- | Text displayed when user is asked to accept the user consent information. | Placeholder text |

| Section | Options | Sub-option | Description | Default setting |
| --- | --- | --- | --- | --- |
| Captured Applications | Capture all applications and URLs | -- | Captures Task Mining data for all applications and web pages. | On |
| Captured Applications | Capture selected applications or URLs | Add Applications | Specifies which applications Task Mining data is captured from.  1. Select standard applications from the **Search Application** dropdown list. 2. Add other applications by copying the application's process name (without the .exe) from the Micosoft Windows Task Manager and pasting it in the **Add Custom Application** field. 3. Select **Add Application**. | Off |
| Captured Applications | Capture selected applications or URLs | Add URL(s) | Specifies which websites Task Mining data is captured from.  1. Enter the URL for each website you want to capture data from in the **URL** field. 2. Select **Add URL**. | Off |
| Captured Applications | Capture all applications and URLs but exclude some | Add Applications | Specifies which applications Task Mining data is not captured from.  1. Select standard applications to denylist from the **Search Application** dropdown list. 2. Add other applications to the denylist by copying the application's process name from the Microsoft Windows Task Manager and pasting it in the **Add Custom Application** field. 3. Select **Add Application**. | Off |
| Captured Applications | Capture all applications and URLs but exclude some | Add URL(s) | Specifies which websites Task Mining data is not captured from.  1. Enter the URL for each website you want to exclude in the **URL** field. 2. Select **Add URL**. | Off |
| Captured Details | Basic data | -- | Captures the basic data required for Task Mining including timestamps and types of user action.  **Note**  This is always turned on and cannot be turned off. | On |
| Captured Details | Name of active window or web tab | -- | Captures the name of the active window or web browser tab. | On |
| Captured Details | Context of application or webpage | -- | Captures contextual information about how the user interacts with the application or page including, for example, buttons selected. | Off |
| Captured Details | Input values | -- | Captures values input by the user from, for example, the keyboard or pasted from their clipboard. | Off |
| Captured Details | Screenshots of active window | -- | Captures screenshots of active windows. | Off |
| Privacy Settings | Hash user names | -- | Pseudonymizes user names in the Task Mining data. | On |
| Privacy Settings | Data redaction | Windows username | Redacts the Windows user name from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | Machine name | Redacts the Windows machine name from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | E-mail address | Redacts email addresses from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | US Social Security Number | Redacts US Social Security numbers from the captured Task Mining data. | On |
| Privacy Settings | Data redaction | Credit Card Number | Redacts credit card numbers from the captured Task Mining data. | On |
| Startup Mode | Auto-start when computer starts | -- | Starts Task Mining automatically when the user’s computer starts. | Off |
| Startup Mode | Manual start by users | -- | Activates Task Mining manually when the user wants to start capturing data. | On |
| User Consent | User Consent | -- | Consent notice displayed to the user before the Task Mining data capture begins.  **Important**  While we’ve provided some guidance about what you might include, you MUST verify the text you include here with your organization’s legal department. | Placeholder text |
| User Consent | Specify the URL you are referring to in the consent (optional) | -- | URL where the user can view a webpage containing user consent information. | On |
| User Consent | Text of Checkbox | -- | Text displayed when user is asked to accept the user consent information. | Placeholder text |

[## Testing a Task Mining project](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-e694a662-1b17-41cd-dce8-0cd6cb08e75d_body)

1. Open the **Users & Invite** screen by selecting:

   1. **Go to Users** on the **Home** page of your Task Mining project; or
   2. The **Users & Invite** button in the Task Mining project navigation.

   The **Users & Invite** screen opens.
2. Select **Invite Users**.

   The **Users & Invite** modal appears.
3. Select **Copy to clipboard**.

   An invitation link for your project is copied to your clipboard.
4. Select **Done**.
5. Paste the invitation link into an email.
6. Send the email to a small number of users.

   **Note**

   When users follow the invite link, they’ll be prompted to download and install the latest version of the Task Mining Client software (if not already installed). You can also use the link yourself if you want to capture test data from your own machine. For information about installing the Task Mining Client software, see [Installing the Task Mining Client software (project invite)](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235134881963873 "Installing the Task Mining Client software (project invite)").
7. Work with the invited users to capture test data for the applications or use case you’re targeting.

   You can view connected users and when they're online in the **Users & Invite** page of your Task Mining project.
8. [Validate and refine your project data](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-44f4f3e1-be11-d3e7-5c1c-9c9c2aa37405 "Validating and refining the Task Mining project data").

**Tip**

Users of the Task Mining Client software can’t see or edit your Task Mining project or the results in the [Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app") unless they’re members of your Celonis team with access to the project or the Workforce Productivity app.

[## Validating and refining the Task Mining project data](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-44f4f3e1-be11-d3e7-5c1c-9c9c2aa37405_body)

You'll need to use the Workforce Productivity app to validate your Task Mining project before refining your Task Mining project settings, if necessary, in the [Configuration Editor](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings"). As well as validating the captured data, getting feedback from your user testers on their experience of installing and using the Task Mining Client software can help you decide how to roll out the Task Mining Client software at scale.

1. Open the Workforce Productivity app by selecting:

   1. **Go to Analysis** on the Home page of your Task Mining project; or
   2. Studio in the Celonis Navigation bar, searching for 'workforce productivity' in the Studio overview and selecting the app package named after your project.

   The Workforce Productivity app opens in Studio. For more information, see [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app").

   |  |
   | --- |
   |  |
2. Review the Task Mining data captured in the Workforce Productivity app, selecting different horizontal tabs to view different aspects of your Task Mining data.

   **Tip**

   Select the **User Captured Data** tab to view information about your users.
3. Refine your project’s settings as required to improve your data capture or the end user experience.
4. Add filters in the **Filter bar** to focus on specific aspects of your process.
5. Go back to the **Home** page and select **Client Settings**.

   The [Client Settings form](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_procedure-idm234813320028154) appears.
6. Enable the **Use advanced settings** radio button.
7. Download the Configuration Editor if prompted to do so.
8. In the [Configuration Editor](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings"), make any changes required to your project's settings

   **Important**

   We strongly recommend confirming the privacy settings selected and the user consent text with your organization's legal department to ensure they are appropriate for a project in production.
9. Validate your project’s new settings using more data and user feedback from your user testers and make further refinements as needed.
10. [Roll out your Task Mining project](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-b3959f14-aed9-4a73-4cdb-6560842c9f37 "Rolling out a Task Mining project").

[## Rolling out a Task Mining project](#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-b3959f14-aed9-4a73-4cdb-6560842c9f37_body)

### Task Mining project rollout options

When your Task Mining project is ready, you can:

- Invite more users via the invite link you created in [Testing a Task Mining project](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-e694a662-1b17-41cd-dce8-0cd6cb08e75d "Testing a Task Mining project"); if users don't already have the Task Mining Client software installed, they'll be prompted to do so.
- Roll out the Task Mining Client software on your users’ machines as an administrator-led process; this install is performed at the [command line](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97 "Installing the Task Mining Client software (command line)") and allows your IT team to push the software to multiple user machines at once.

**Important**

The project rollout option you choose will depend on different factors like how many users you want to add to your Task Mining project and how technical your users are. We generally recommend using the [command line installation option](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97 "Installing the Task Mining Client software (command line)") if you're rolling the project out to more than a handful of users.

## Related topics

- [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects")
- [Configuring Task Mining data](configuring-task-mining-data.html "Configuring Task Mining data")
- [Working with Task Mining projects](working-with-task-mining-projects.html "Working with Task Mining projects")


---

## task-mining/creating-business-events-in-task-mining

# Creating Business Events in Task Mining

**This feature is currently available as a Private Preview only**

During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.

If you would like to use this feature, create a Support ticket at [Celonis Support](https://support.celonis.com/).

For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types")

Task Mining data contains a large number of user action events that can be difficult to use in a meaningful way. You can get a more granular understanding of your process by grouping and labeling these events, adding business context and adding them to your process graph as Business Events.

For example, you could create a Business Event by associating a generic action, such as **Click** with a semantically-meaningful event like **Create ticket**. Adding this Business Event to your process graph provides a more granular view of your business process.

**Note**

When you create a Business Event, it applies to new data only. However, if you re-process all the existing data, the Business Event will be applied to all data. For more information, see [Task Mining data processing](task-mining-data-processing-and-scheduling.html "Task Mining data processing and scheduling").

Expand all

[## Before you begin](#id832444_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Configured [Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app") for your organization

[## Business Event creation options](#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233275204705_body)

Filter

- Business Event creation option
- Description
- Use case

| Business Event creation option | Description | Use case |
| --- | --- | --- |
| [Create a Business Event from a raw event (recommended)](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id23523327799737 "Creating a Business Event from a raw event (recommended)") | Base your Business Event on an event that already exists in the Task Mining data. This type of event is also known as a raw event. | You want to create a Business Event quickly and edit the Business Event created to meet your requirements. |
| [Create a Business Event manually (expert user)](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233295360885 "Creating a Business Event manually (expert user)") | Create the Business Event based on your own requirements. | We recommend creating Business Events manually only if you're a more expert user of Task Mining. |

| Business Event creation option | Description | Use case |
| --- | --- | --- |
| [Create a Business Event from a raw event (recommended)](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id23523327799737 "Creating a Business Event from a raw event (recommended)") | Base your Business Event on an event that already exists in the Task Mining data. This type of event is also known as a raw event. | You want to create a Business Event quickly and edit the Business Event created to meet your requirements. |
| [Create a Business Event manually (expert user)](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233295360885 "Creating a Business Event manually (expert user)") | Create the Business Event based on your own requirements. | We recommend creating Business Events manually only if you're a more expert user of Task Mining. |

[## Creating a Business Event from a raw event (recommended)](#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id23523327799737_body)

**Note**

If your data set is large, the Data Preview may not display. This is because Data Preview only looks at a limited amount of data (approximately 100,000 events).

1. In the Celonis Platform Navigation bar, select **Data** > **Task Mining**.

   All available Task Mining projects display.
2. Open the project you want to create a Business Event for.
3. Select the **Business Events** button .

   The **Business Events** screen appears.
4. Select **Go to raw events** to view the raw events that exist for your project.
5. Search the raw event data to find a raw event you want to create a Business Event from.
6. Select **Open timeline** to open the raw event.
7. Select **Create Business Event**.

   The **Create Business Event** screen opens, with the filter condition fields related to the raw event automatically populated.
8. Complete the [Business Event fields](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233305502771 "Business Event fields").

   You can edit the populated filter condition information here if necessary. You can also add additional filter conditions.
9. In **Data Preview**, select **Preview** to see the raw events that will be included in your Business Event.
10. Select **Save**.

    The **Business Events** screen opens and displays your Business Event.

[## Creating a Business Event manually (expert user)](#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233295360885_body)

**Note**

If your data set is large, the Data Preview may not display. This is because Data Preview only looks at a limited amount of data (approximately 100,000 events).

1. In the Celonis Platform Navigation bar, select **Data** >**Task Mining**.

   All available Task Mining projects display.
2. Open the project you want to create a Business Event for.
3. Select the **Business Events** button .

   The **Business Events** screen appears.

   |  |
   | --- |
   |  |
4. Select **Create Business Event**.

   The **Create Business Event** screen opens.

   All fields are empty.

   |  |
   | --- |
   |  |

   **Note**

   If you create your Business Event from raw data, the filter condition fields related to the raw event are automatically populated.
5. Complete the [Business Event fields](creating-business-events-in-task-mining.html#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233305502771 "Business Event fields").
6. In **Data Preview**, select **Preview** to see the raw events that will be included in your Business Event.

   |  |
   | --- |
   |  |
7. Select **Save**.

   The **Business Events** screen opens and displays your Business Event.

   |  |
   | --- |
   |  |

[## Business Event fields](#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233305502771_body)

Filter

- Section
- Field
- Description

| Section | Field | Description |
| --- | --- | --- |
| Business Event definition | `Event name` | Meaningful name that displays in the process graph. |
| Attributes  **Important**  The Attribute #1 section will always be pre-propulated and cannot be edited. You may optionally add additional attributes using **+ Add attribute**. | `Name` | Business Event name. |
| Attributes | `Raw data attribute` | Raw event. |
| Attributes | `Regular expression pattern` | Refines the raw events included in the Business Event. For more information, see [MATCH\_PROCESS\_REGEX](https://docs.celonis.com/en/match_process_regex.html). |
| Filter conditions | `Raw events attribute` | Raw event label type selected from the dropdown list and used as a filter condition. |
| Filter conditions | `Operator` | Defines the relationship between the `Raw events attribute` and the `Event definition`. |
| Filter conditions | `Event definition` | Defines the Business Event. This may be automatically populated if the Business Event is created from a raw event or manually added if the Business Event is created from scratch. |
| Preview | `Data` | Select **Preview** to see the raw events that will be included in the Business Event. |

| Section | Field | Description |
| --- | --- | --- |
| Business Event definition | `Event name` | Meaningful name that displays in the process graph. |
| Attributes  **Important**  The Attribute #1 section will always be pre-propulated and cannot be edited. You may optionally add additional attributes using **+ Add attribute**. | `Name` | Business Event name. |
| Attributes | `Raw data attribute` | Raw event. |
| Attributes | `Regular expression pattern` | Refines the raw events included in the Business Event. For more information, see [MATCH\_PROCESS\_REGEX](https://docs.celonis.com/en/match_process_regex.html). |
| Filter conditions | `Raw events attribute` | Raw event label type selected from the dropdown list and used as a filter condition. |
| Filter conditions | `Operator` | Defines the relationship between the `Raw events attribute` and the `Event definition`. |
| Filter conditions | `Event definition` | Defines the Business Event. This may be automatically populated if the Business Event is created from a raw event or manually added if the Business Event is created from scratch. |
| Preview | `Data` | Select **Preview** to see the raw events that will be included in the Business Event. |

[## Editing and deleting a Business Event](#UUID-3ca02590-ac66-1eb7-5ae6-afb513414f54_section-id235233315901099_body)

1. In the Celonis Platform Navigation bar, select **Data** > **Task Mining**.

   All available Task Mining projects display.
2. Open the project you want to edit or delete a Business Event for.
3. In the Home page of your Task Mining project, select **Business Events**.

   The Business Events screen appears. Any Business Events that have already been created for your Task Mining project display here.
4. Select the three dots next to a Business Event.

   |  |
   | --- |
   |  |
5. Select:

   - **Edit** and make any changes required before selecting **Save**; or
   - **Delete** and confirm deletion when prompted.

## Related topics

- [Configuring the Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app")
- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")
- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")


---

## task-mining/installing-the-task-mining-client-software

# Installing the Task Mining Client software

The Task Mining Client software is versioned and the Task Mining Client version number is indicated where relevant. For example, functionality marked as FROM 2.1.3, was introduced in version 2.1.3 of the Task Mining Client software and is not available in versions prior to 2.1.3. For more information about Task Mining software releases, see the [Task Mining software install file release notes](installing-the-task-mining-client-software.html#UUID-85329f38-095f-7a42-8391-2faccc268dfa "Task Mining software install file release notes").

## Task Mining Client software installation options

Filter

- Install option
- Use case
- For more information

| Install option | Use case | For more information |
| --- | --- | --- |
| User is invited to a project and emailed a link that lets them:  - Install the Task Mining Client software using the Task Mining set-up wizard. - Connect to the Task Mining project. | Recommended for less technical users as this is the simplest way of installing the Task Mining Client software and connecting to a Task Mining project. | [Installing the Task Mining Client software (project invite)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235134881963873) |
| User:  - Downloads the Task Mining Client software. - Installs the Task Mining Client software using the Task Mining set-up wizard - Connects to a specific Task Mining project using an activation link. | User hasn't been added to a Task Mining project or wants to create their own Task Mining project. | [Installing the Task Mining Client software (installation package)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-idm235045115886777) |
| FROM 2.3.0  Admin installs the Task Mining Client software from the command line:  - On one or more machines. - On a Virtual Desktop Infrastructure (VDI).  **Note**  Before performing a VDI install, see [VDI installation considerations and limitations](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231669101251 "VDI install considerations and recommendations"). | - Recommended where the Task Mining Client software is to be installed on more that 25 machines. - May be used by an admin to install Task Mining Client software for individual users or on specific machines. | [Installing the Task Mining Client software (command line)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97)  [Installing the Task Mining Client software in a VDI](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235137995462604) |
| Updating the Task Mining Client software. | A new version of the Task Mining Client software has been released. | [Updating the Task Mining Client software](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id23523162302289) |

| Install option | Use case | For more information |
| --- | --- | --- |
| User is invited to a project and emailed a link that lets them:  - Install the Task Mining Client software using the Task Mining set-up wizard. - Connect to the Task Mining project. | Recommended for less technical users as this is the simplest way of installing the Task Mining Client software and connecting to a Task Mining project. | [Installing the Task Mining Client software (project invite)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235134881963873) |
| User:  - Downloads the Task Mining Client software. - Installs the Task Mining Client software using the Task Mining set-up wizard - Connects to a specific Task Mining project using an activation link. | User hasn't been added to a Task Mining project or wants to create their own Task Mining project. | [Installing the Task Mining Client software (installation package)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-idm235045115886777) |
| FROM 2.3.0  Admin installs the Task Mining Client software from the command line:  - On one or more machines. - On a Virtual Desktop Infrastructure (VDI).  **Note**  Before performing a VDI install, see [VDI installation considerations and limitations](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231669101251 "VDI install considerations and recommendations"). | - Recommended where the Task Mining Client software is to be installed on more that 25 machines. - May be used by an admin to install Task Mining Client software for individual users or on specific machines. | [Installing the Task Mining Client software (command line)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97)  [Installing the Task Mining Client software in a VDI](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235137995462604) |
| Updating the Task Mining Client software. | A new version of the Task Mining Client software has been released. | [Updating the Task Mining Client software](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id23523162302289) |

Expand all

[## Before you begin](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_N1776353724180_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Hardware requirements: vCPU 4, 16 GB of RAM, 25 GB of free disk space
- Operating system: Microsoft Windows 10 or newer
- Software development framework: Microsoft .NET Framework 4.8 or higher

  **Note**

  This should already be installed on Windows 10 and Windows 11 machines. If it's not, the user will be prompted to install it when installing the Task Mining Client software. Installation of the .NET Framework typically requires admin rights.
- Permissions: Admin, if you choose the command line installation option
- User machine and network set up: The Task Mining Client software must be able to access:

  - The [API endpoints](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access") used by the Task Mining Client software to cimmunicate with the Celonis Platform.
  - Specific [directories and registry keys](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_N1776354258239) during installation of the Task Mining Client software and while the Task Mining Client software is running.

[## Installing the Task Mining Client software (project invite)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235134881963873_body)

**Warning**

For this installation method, you'll be emailed a link that will let you install the Task Mining Client software and connect to a Task Mining project. Before clicking the link, we strongly recommend you check the email sender is legitimate.

1. When you receive an email invitation to join a Task Mining project, click the link in the email.

   A **Task Mining invitation** screen appears.

   |  |
   | --- |
   |  |
2. Select **Download for Windows**.

   The Task Mining Client installation zip file downloads to your machine.
3. Navigate to your **Downloads** folder and extract all files from the Task Mining Client installation zip file.
4. Double-click the installer file.

   The **Celonis Task Mining Setup Wizard** appears.

   |  |
   | --- |
   |  |
5. Step through the wizard, referring to the [Task Mining software installation settings](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235212472405644 "Task Mining Client software install settings") as necessary.
6. Select **Finish** when the **Completed the Celonis Task Mining Setup Wizard** screen appears.
7. In the **Task Mining invitation** (see step **1**), select **Connect Client to team**.
8. Confirm your selection.

   The Celonis Task Mining Client software opens.

   |  |
   | --- |
   |  |

For more information, see [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software").

[## Installing the Task Mining Client software (installation package)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-idm235045115886777_body)

**Important**

Once you've installed the Task Mining Client software, you'll need to connect to a Task Mining project. You'll be prompted for a project-specific activation link. This link is created when the Task Mining project is set up and the person who set up the Task Mining project you want to connect to will be able to send you the link. For more information, see [Testing a Task Mining project](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_UUID-e694a662-1b17-41cd-dce8-0cd6cb08e75d "Testing a Task Mining project").

1. Check the [installation prerequisites](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_N1776353724180 "Before you begin").
2. Download the Task Mining Client software installation zip file.

   The Task Mining Client installation zip file downloads to your machine.
3. Navigate to your **Downloads** folder and extract all files from the Task Mining Client installation zip file.
4. Double-click the installer file.

   The **Celonis Task Mining Setup Wizard** appears.

   |  |
   | --- |
   |  |
5. Step through the wizard, referring to the [Task Mining software installation settings](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235212472405644 "Task Mining Client software install settings") as necessary.
6. Select **Finish** when the **Completed the Celonis Task Mining Setup Wizard** screen appears.
7. When completed, select **Finish**.
8. Go to **Apps** > **Celonis Task Mining**.

[## Installing the Task Mining Client software (command line)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97_body)

**Note**

You must have admin rights to install the Task Mining Client software from the command line. A system proxy is used by default. If a different setting is required for individual machines, you must configure this for each machine individually. From 2.3.0.

1. Check the [installation prerequisites](https://docs.celonis.com/en/installing-the-task-mining-software.html#UUID-1268184b-37df-f79a-a8f0-f611a6eb0735_section-idm235119147651806).
2. Extract all files from the [Task Mining Client install zip file](https://docs.celonis.com/en/installing-the-task-mining-software.html#UUID-a5f0a600-4e3f-2d35-5a40-e17c20219f7e_section-idm23511915119685).
3. Open your command prompt with **Run as administrator**.
4. Change your command line directory to point to where the files were extracted to in step **2**.
5. Copy and paste the [Task Mining command line syntax](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235231348104199) t your command line.
6. Modify the command line syntax according to your use case, using the Task Mining command line parameters.

   **Tip**

   You may also find the [Task Mining command line examples](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235136335167165) helpful.
7. Run your command.

   The Task Mining Client software is installed.

[### Task Mining command line syntax](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231348104199_body)

```
msiexec.exe /qb /[i|x] CelonisTaskMining.Installer-<version>.msi
[ACTIVATIONLINKURLPROPERTY=<activation_link_url>]
[CHROMEEXTENSIONPROPERTY={0|1}] [EDGEEXTENSIONPROPERTY={0|1}] [CUSTOMEXTENSIONPROPERTY={0|1}]
[CUSTOMEXTENSIONIDS=<custom_extension_id>] [CHROMEUPDATEURL=<update_url>] [EDGEUPDATEURL=<update_url>]
[SECUREGATEWAYSERVERPROPERTY=<secure_gateway_server_url>]
[CLIENTCERTIFICATESUBJECTPROPERTY=&lt;client_certificate_subject&gt;]
[SPNPROPERTY=&lt;service_principal_name_identifier&gt;]
[TIMEOUTPROPERTY=&lt;connection_timeout&gt;] [EXTENSIONWEBSOCKETPORTPROPERTY=&lt;extension_websocket_port&gt;]
```

[### Task Mining command line examples](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235136335167165_body)

**Note**

Standard Microsoft Windows commands apply. See the [Microsoft Windows documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec) for more information.

| Installation | Example command |
| --- | --- |
| Installs the Task Mining Client software using a secure gateway configuration.  Connects the Task Mining Client software to an organization's secure gateway server and uses the [API endpoints](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access") to connect to the Celonis Platform.  For more information, see [Running the Task Mining Client software over a secure gateway server](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231364189624 "Running the Task Mining Client software over a secure gateway server (from 2.1.4)"). | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi SECUREGATEWAYSERVERPROPERTY="myserver.com" CLIENTCERTIFICATESUBJECTPROPERTY="certificate subject"` |
| Installs the Task Mining Client software and enables use of the Task Mining Gateway.  For more information, see [Running the Task Mining Client software over the Task Mining Gateway](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231372447963 "Running the Task Mining Client software over the Task Mining Gateway (from 2.5.0)").  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi SECUREGATEWAYSERVERPROPERTY="myserver.com" CLIENTCERTIFICATESUBJECTPROPERTY="certificate subject" SPNPROPERTY="service principal name"` |
| Installs the Task Mining Client software with an activation link. | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi ACTIVATIONLINKURLPROPERTY="https://team.domain.celonis.cloud/task-mining/join?code=1234-5678-9012-1234"` |
| Installs the Task Mining Client software without browser extensions. | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi CHROMEEXTENSIONPROPERTY=0 EDGEEXTENSIONPROPERTY=0` |
| Installs the Task Mining Client software with a Chrome extension from a different store. | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi CHROMEUPDATEURL="http://myserver.com/extension_store"` |
| Installs the Task Mining Client software and enables the capture of Task Mining data from a browser extension with ID `<custom_extension_id>`.  For more information, see [Installing Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi CUSTOMEXTENSIONIDS=<custom_extension_id>`  **Note**  Do not include a space between the comma and values if using a comma-separated list of IDs. |
| Installs the Task Mining Client software and enables the capture of Task Mining data from a browser extension with ID `<customer_extension_id>` from a self-hosted store.   For more information, see [Installing self-hosted browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). | `msiexec.exe /qb /i CelonisTaskMining.Installer.msi CUSTOMEXTENSIONIDS=<custom_extension_id> CHROMEUPDATEURL=https://myserver.com/mystore`  **Note**  Do not include a space between the comma and values if using a comma-separated list of IDs. |
| Uninstalls the Task Mining Client software. | `msiexec.exe /qb /x CelonisTaskMining.Installer.msi` |

[### Running the Task Mining Client software over a secure gateway server (from 2.1.4)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231364189624_body)

**Note**

You can also configure the secure gateway service settings when you install the Task Mining Client software using the [installation package](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-idm235045115886777). Both of these installation methods require admin rights. For more information, see T[ask Mining Client software install settings](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235212472405644).

1. Create a registry key at `Computer\HKEY_LOCAL_MACHINE\SOFTWARE\Celonis\TaskMining`.
2. Create a registry string value at the location in step **1** with the name `secure_gateway_server`.
3. Assign the URL of the secure gateway server to `secure_gateway_server`, for example, `mysecuregatewayserver.com/company`.

   **Note**

   You can configure multiple secure gateways by appending additional gateways using a semicolon delimiter, for example `secure_gateway_server=server1.com;server2.com;mysecuregatewayserver.com/company`
4. Create a registry string value in the location in step **1** with the name `client_certificate_subject`.
5. Install the client certificate that will be used to authenticate the secure gateway server in `Current User/Personal store`.
6. Assign the subject of the client certificate to `client_certificate_subject`, for example `My Certificate`.

   The configuration is complete.

   **Tip**

   You can roll back the configuration (if necessary) by removing the registry values created in steps **2** and **4**.

[### Running the Task Mining Client software over the Task Mining Gateway (from 2.5.0)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231372447963_body)

**Important**

Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support").

**Tip**

You can roll back the configuration (if necessary) by removing the registry values created in steps **2**, **4** and **7**.

1. Create a registry key at `Computer\HKEY_LOCAL_MACHINE\SOFTWARE\Celonis\TaskMining`.
2. Create a registry string value at the location in step **1** with the name `secure_gateway_server`.
3. Assign the URL of the secure gateway server to `secure_gateway_server`, for example, `mysecuregatewayserver.com/company`.

   **Note**

   You can configure multiple secure gateways by appending additional gateways using a semicolon delimiter, for example `secure_gateway_server=server1.com;server2.com;mysecuregatewayserver.com/company`
4. Create a registry string value in the location in step 1 with the name `client_certificate_subject`
5. Install the client certificate that will be used to authenticate the secure gateway server in `Current User/Personal store`.
6. Assign the subject of the client certificate to `client_certificate_subject`, for example `My Certificate`.
7. Create a registry string value at the location in step **1** with the name `service_principal_name`.
8. Assign the unique identifier of the secure gateway service instance to `service_principal_name`.

   The configuration is complete.

[### Task Mining command line parameters](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235135056639625_body)

**Note**

Standard Microsoft Windows commands apply. See the [Microsoft Windows documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/msiexec) for more information.

Filter

- Parameter
- Description
- Possible values
- Deafult value at install
- From version

| Parameter | Description | Possible values | Deafult value at install | From version |
| --- | --- | --- | --- | --- |
| `/qb` | Specifies there is a basic user interface during the installation process. | -- | -- | 2.3.0 |
| `/i` | Specifies normal installation. | -- | -- | 2.3.0 |
| `/x` | Uninstalls the package. | -- | -- | 2.4.0 |
| `ACTIVATIONLINKURLPROPERTY` | Assigns the activation link URL.  Vew the activation link URL from **Users & Invite > Invite Users**. | URL with this format:  `https://<team><realm>.celonis.cloud.celonis.cloud/task-mining/ui/join?code<uuid>` | -- | 2.3.0 |
| `CHROMEEXTENSIONPROPERTY` | Enables or disables installation of the Chrome extension. | `0`  (disabled)  `1` (enabled) | `1` | 2.3.0 |
| `CHROMEUPDATEURL` | Changes the update URL location for installing and updating the Chrome extension to an alternative repository.  For information about using `CHROMEUPDATEURL`, see the [Task Mining command line examples](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235136335167165). | -- | `Chrome Web Store` | 2.4.0 |
| `CLIENTCERTIFICATESUBJECTPROPERTY` | Assigns the client certificate subject name. The certificate must be installed in the Windows certificate store under `Current User/Personal store`. | -- | `<empty>` | 2.3.0 |
| `CUSTOMEXTENSIONIDS` | Assigns the custom Chrome extension ID value (separate multiple values with commas).  For information about using `CUSTOMEXTENSIONIDS`, see the [Task Mining command line examples](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235136335167165). | -- | `<empty>` | 2.7.8 |
| `CUSTOMEXTENSIONPROPERTY` | Specifies whether a custom Chrome extension ID is used. This is required for [self-hosting of the Task Mining browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)"). | -- | -- | 2.7.8 |
| `EDGEEXTENSIONPROPERTY` | Enables or disables installation of the Microsoft Edge extension. | `0`  (disabled)  `1` (enabled) | `1` | 2.3.0. |
| `EDGEUPDATEURL` | Changes the update URL location for installing and updating the Microsoft Edge extension to an alternative repository. | -- | `Chrome Web Store` | 2.4.0 |
| `EXTENSIONWEBSOCKETPORTPROPERTY` | Specifies a custom web socket port for the Chrome extension. | -- | `8080` | 2.12.0 |
| `SECUREGATEWAYSERVERPROPERTY` | Assigns the secure gateway URLs if the Task Mining Client software is used in a secure environment. Multiple URLs must be separated by a semicolon (;). | -- | `empty` | 2.3.0 |
| `SPNPROPERTY` | Assigns the Service Principal Name (SPN) of the gateway service to enable authentication with the on-premise Task Mining Gateway. Separate multiple SPNs with a semicolon (;).  Secure gateway URLs and their corresponding SPN should be defined in the same order.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | -- | `empty` | 2.5.0 |
| `TIMEOUTPROPERTY` | Defines the timeout in seconds for HTTP connections to the Task Mining Gateway.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support").  For more information, see [Installing the Task Mining Gateway](https://docs.celonis.com/en/installing-the-task-mining-software.html#UUID-6a979a68-fd0b-5a5d-9a39-065055b01d08). | Any positive integer value. | `180` | 2.5.0 |
| `WORKINGDIRECTORY` | Changes the default location of the working directory. The Task Mining Client software requires read and write permissions for this directory. | -- | `%LOCALAPPDATA%\Celonis\TaskMiningClient` | 2.16.0 |

| Parameter | Description | Possible values | Deafult value at install | From version |
| --- | --- | --- | --- | --- |
| `/qb` | Specifies there is a basic user interface during the installation process. | -- | -- | 2.3.0 |
| `/i` | Specifies normal installation. | -- | -- | 2.3.0 |
| `/x` | Uninstalls the package. | -- | -- | 2.4.0 |
| `ACTIVATIONLINKURLPROPERTY` | Assigns the activation link URL.  Vew the activation link URL from **Users & Invite > Invite Users**. | URL with this format:  `https://<team><realm>.celonis.cloud.celonis.cloud/task-mining/ui/join?code<uuid>` | -- | 2.3.0 |
| `CHROMEEXTENSIONPROPERTY` | Enables or disables installation of the Chrome extension. | `0`  (disabled)  `1` (enabled) | `1` | 2.3.0 |
| `CHROMEUPDATEURL` | Changes the update URL location for installing and updating the Chrome extension to an alternative repository.  For information about using `CHROMEUPDATEURL`, see the [Task Mining command line examples](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235136335167165). | -- | `Chrome Web Store` | 2.4.0 |
| `CLIENTCERTIFICATESUBJECTPROPERTY` | Assigns the client certificate subject name. The certificate must be installed in the Windows certificate store under `Current User/Personal store`. | -- | `<empty>` | 2.3.0 |
| `CUSTOMEXTENSIONIDS` | Assigns the custom Chrome extension ID value (separate multiple values with commas).  For information about using `CUSTOMEXTENSIONIDS`, see the [Task Mining command line examples](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235136335167165). | -- | `<empty>` | 2.7.8 |
| `CUSTOMEXTENSIONPROPERTY` | Specifies whether a custom Chrome extension ID is used. This is required for [self-hosting of the Task Mining browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)"). | -- | -- | 2.7.8 |
| `EDGEEXTENSIONPROPERTY` | Enables or disables installation of the Microsoft Edge extension. | `0`  (disabled)  `1` (enabled) | `1` | 2.3.0. |
| `EDGEUPDATEURL` | Changes the update URL location for installing and updating the Microsoft Edge extension to an alternative repository. | -- | `Chrome Web Store` | 2.4.0 |
| `EXTENSIONWEBSOCKETPORTPROPERTY` | Specifies a custom web socket port for the Chrome extension. | -- | `8080` | 2.12.0 |
| `SECUREGATEWAYSERVERPROPERTY` | Assigns the secure gateway URLs if the Task Mining Client software is used in a secure environment. Multiple URLs must be separated by a semicolon (;). | -- | `empty` | 2.3.0 |
| `SPNPROPERTY` | Assigns the Service Principal Name (SPN) of the gateway service to enable authentication with the on-premise Task Mining Gateway. Separate multiple SPNs with a semicolon (;).  Secure gateway URLs and their corresponding SPN should be defined in the same order.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | -- | `empty` | 2.5.0 |
| `TIMEOUTPROPERTY` | Defines the timeout in seconds for HTTP connections to the Task Mining Gateway.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support").  For more information, see [Installing the Task Mining Gateway](https://docs.celonis.com/en/installing-the-task-mining-software.html#UUID-6a979a68-fd0b-5a5d-9a39-065055b01d08). | Any positive integer value. | `180` | 2.5.0 |
| `WORKINGDIRECTORY` | Changes the default location of the working directory. The Task Mining Client software requires read and write permissions for this directory. | -- | `%LOCALAPPDATA%\Celonis\TaskMiningClient` | 2.16.0 |

[## Installing the Task Mining Client software in a VDI](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235137995462604_body)

[### VDI install options](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231663439983_body)

Filter

- VDI install option
- Description
- Use case

| VDI install option | Description | Use case |
| --- | --- | --- |
| Install the Task Mining Client software inside a VDI. | The Task Mining Client software captures data as if it were installed and running directly on the machine. | Full Task Mining data capture. |
| Install the Task Mining Client software outside a VDI. | The Task Mining Client software is installed on a user's machine and captures Task Mining data from a remote desktop without being installed in the VDI.  Screenshots (if enabled) can be captured in this setup, but data from within the VDI, such as which apps are used, is not available.  The Task Mining Client software must be connected to the VDI using:  - Microsoft Remote Desktop client. - Citrix Workspace. - Citrix Receiver. - VMware Horizon Client. | Limited capture. Used to determine whether the Task Mining Client software is running. |

| VDI install option | Description | Use case |
| --- | --- | --- |
| Install the Task Mining Client software inside a VDI. | The Task Mining Client software captures data as if it were installed and running directly on the machine. | Full Task Mining data capture. |
| Install the Task Mining Client software outside a VDI. | The Task Mining Client software is installed on a user's machine and captures Task Mining data from a remote desktop without being installed in the VDI.  Screenshots (if enabled) can be captured in this setup, but data from within the VDI, such as which apps are used, is not available.  The Task Mining Client software must be connected to the VDI using:  - Microsoft Remote Desktop client. - Citrix Workspace. - Citrix Receiver. - VMware Horizon Client. | Limited capture. Used to determine whether the Task Mining Client software is running. |

[### VDI install considerations and recommendations](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231669101251_body)

Filter

- Consideration
- Description
- Recommendation

| Consideration | Description | Recommendation |
| --- | --- | --- |
| Non-Task Mining software users in the Production environment. | Production environment includes users who won’t be using the Task Mining software. | Create a VDI for the subset of Task Mining software users.  **Note**  This also provides a simple fallback mechanism if unforeseen issues arise and you need to roll back users. Using a VDI environment for a smaller number of users can also speed up configuration changes and deployment of new Task Mining software and SAP GUI versions. |
| Multi-user sessions are required. | While multiple users can connect to the same Windows instance in parallel, the Task Mining browser extensions can’t be used in parallel for multi-user sessions. | Use a VDI for multi-user sessions only if the capture of Task Mining data from the Chrome browser extensions is not required. |

| Consideration | Description | Recommendation |
| --- | --- | --- |
| Non-Task Mining software users in the Production environment. | Production environment includes users who won’t be using the Task Mining software. | Create a VDI for the subset of Task Mining software users.  **Note**  This also provides a simple fallback mechanism if unforeseen issues arise and you need to roll back users. Using a VDI environment for a smaller number of users can also speed up configuration changes and deployment of new Task Mining software and SAP GUI versions. |
| Multi-user sessions are required. | While multiple users can connect to the same Windows instance in parallel, the Task Mining browser extensions can’t be used in parallel for multi-user sessions. | Use a VDI for multi-user sessions only if the capture of Task Mining data from the Chrome browser extensions is not required. |

[## Updating the Task Mining Client software](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id23523162302289_body)

[### Task Mining Client software update options](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231634875325_body)

Filter

- Update options
- Use case
- More information

| Update options | Use case | More information |
| --- | --- | --- |
| Uninstall the Task Mining Client software and reinstall a different version. | Installation of any version of the Task Mining Client software. | [Updating the Task Mining Client software (uninstall/reinstall)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235231638366823) |
| Install a newer version of the Task Mining Client software ‘on top’ of the current Task Mining Client software. | Installation of a newer version of the Task Mining Client software. | [Updating the Task Mining Client software (install a newer version)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235231642429449) |

| Update options | Use case | More information |
| --- | --- | --- |
| Uninstall the Task Mining Client software and reinstall a different version. | Installation of any version of the Task Mining Client software. | [Updating the Task Mining Client software (uninstall/reinstall)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235231638366823) |
| Install a newer version of the Task Mining Client software ‘on top’ of the current Task Mining Client software. | Installation of a newer version of the Task Mining Client software. | [Updating the Task Mining Client software (install a newer version)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235231642429449) |

[### Updating the Task Mining Client software (uninstall/reinstall)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231638366823_body)

1. Uninstall the Task Mining Client software either:

   - Using **Windows** >**Apps** > **Installed apps** >**Uninstall**; or
   - From the [command line](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97 "Installing the Task Mining Client software (command line)").
2. Identify the Task Mining Client software version you want to install using the [Task Mining installation file release notes](installing-the-task-mining-client-software.html#UUID-85329f38-095f-7a42-8391-2faccc268dfa "Task Mining software install file release notes").
3. [Install the Task Mining Client software](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845).

[### Updating the Task Mining Client software (install a newer version)](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235231642429449_body)

1. Identify the Task Mining Client software version you want to install using the [Task Mining installation file release notes](installing-the-task-mining-client-software.html#UUID-85329f38-095f-7a42-8391-2faccc268dfa "Task Mining software install file release notes").
2. [Install the Task Mining Client software](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845).

[### Notification of new Task Mining Client software versions](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id23523164484367_body)

We notify users of new Task Mining Client software versions in both the [Task Mining installation file release notes](installing-the-task-mining-client-software.html#UUID-85329f38-095f-7a42-8391-2faccc268dfa "Task Mining software install file release notes") and in our wider product [release notes](https://docs.celonis.com/en/release-notes.html).

[## Task Mining Client software install settings](#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235212472405644_body)

**Note**

You may not see all these settings and options during installation. The settings and options displayed will depend on your selections in the **Task Mining Configuration Setup Wizard**.

Filter

- Setting
- Options
- Description
- Default option
- Recommended options

| Setting | Options | Description | Default option | Recommended options |
| --- | --- | --- | --- | --- |
| Installation Scope | - Install for all users of this computer. - Install just for me.  (`<username>`) | Defines whether the software is installed for all users of the machine or just for the user who installs it. | Install for all users of this computer | Depends on your use case but if you don’t have admin rights for your machine, use **Install just for me**. |
| Celonis Task Mining Extensions | - Install Celonis Task Mining extension for Google Chrome (Recommended). - Install Celonis Task Mining extension for Microsoft Edge (Recommended) | Defines whether browser metadata is captured from Google Chrome and/or Microsoft Edge. | Both selected. | Both selected.  **Note**  If you deselect these here, you can install the browser extensions later if required. For more information, see [Installing the Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). |
| Celonis Task Mining Extensions | Enterprise policy or Developer mode installed extension (advanced)  FROM 2.7.9. | Installs the Task Mining Client software with an assigned extension ID and installs the Chrome extension automatically from your self-hosted store. | Not selected. | Depends on your use case.  For more information, see [Installing self-hosted browser extensions (from 2.7.8](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)")). |
| Secure Gateway Configuration | Use Secure Gateway Server (optional)  FROM 2.2.2 | Connects the Task Mining Client to an organization's secure gateway server and uses the [API endpoints](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access") to connect to the Celonis Platform. | Not selected. | Depends on your use case.  **Note**  If selected, you’ll be prompted to enter information for:  - Secure Gateway Server. - Client Server Subject.  For more information, see [Task Mining command line parameters](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235135056639625 "Task Mining command line parameters"). |
| Secure Gateway Configuration | On-Premise server (Optional) | Enables use of the Task Mining Gateway which is an on-premise secure gateway and integration service for Task Mining | Not selected. | **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). |

| Setting | Options | Description | Default option | Recommended options |
| --- | --- | --- | --- | --- |
| Installation Scope | - Install for all users of this computer. - Install just for me.  (`<username>`) | Defines whether the software is installed for all users of the machine or just for the user who installs it. | Install for all users of this computer | Depends on your use case but if you don’t have admin rights for your machine, use **Install just for me**. |
| Celonis Task Mining Extensions | - Install Celonis Task Mining extension for Google Chrome (Recommended). - Install Celonis Task Mining extension for Microsoft Edge (Recommended) | Defines whether browser metadata is captured from Google Chrome and/or Microsoft Edge. | Both selected. | Both selected.  **Note**  If you deselect these here, you can install the browser extensions later if required. For more information, see [Installing the Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). |
| Celonis Task Mining Extensions | Enterprise policy or Developer mode installed extension (advanced)  FROM 2.7.9. | Installs the Task Mining Client software with an assigned extension ID and installs the Chrome extension automatically from your self-hosted store. | Not selected. | Depends on your use case.  For more information, see [Installing self-hosted browser extensions (from 2.7.8](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)")). |
| Secure Gateway Configuration | Use Secure Gateway Server (optional)  FROM 2.2.2 | Connects the Task Mining Client to an organization's secure gateway server and uses the [API endpoints](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access") to connect to the Celonis Platform. | Not selected. | Depends on your use case.  **Note**  If selected, you’ll be prompted to enter information for:  - Secure Gateway Server. - Client Server Subject.  For more information, see [Task Mining command line parameters](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235135056639625 "Task Mining command line parameters"). |
| Secure Gateway Configuration | On-Premise server (Optional) | Enables use of the Task Mining Gateway which is an on-premise secure gateway and integration service for Task Mining | Not selected. | **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). |

[## Task Mining software installation files](#UUID-662d2625-1459-4b5d-7bfb-9b2ac2472ad1_body)

Filter

- Description
- Version
- File
- More information

| Description | Version | File | More information |
| --- | --- | --- | --- |
| Task Mining Client software install file. | 2.21.1  (2026-04-28) | [CelonisTaskMining.Client.Installer](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/client/download) | [Installing the Task Mining Client software (install package)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-idm235045115886777) |
| Task Mining Configuration Editor install file. | 2.21.1  (2026-04-28) | [CelonisTaskMining.Configuration.Installer](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/config-editor/download) | [Installing the Task Mining Configuration Editor (optional)](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)") |
| Browser extension (use for Task Mining Client software from 2.19). | 2.2.0  (2025-04-24) | [Celonis Task Mining Chrome Browser Extension for version 2.0.0](https://chromewebstore.google.com/detail/celonis-task-mining-brows/lecnjphdlpfkkchcpibhdjndfnadnmio) | [Installing browser extensions from Chrome Web Store (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Browser extension (use for Task Mining Client software before 2.19). | 1.0.2  (2023-11-25) | [Celonis Task Mining Chrome Browser Extension for version 1.0.2 (legacy)](https://chromewebstore.google.com/detail/celonis-task-mining-brows/ndfcgjlpabkombgfpckhglibdhnipbfl) | [Installing browser extensions from Chrome Web Store (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Self-hosted browser extension (use for Task Mining Client software from 2.19). | 2.0.0  (2025-04-29) | [2025-04-29\_CelonisTaskMiningBrowserExtension-2.0.0](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/chrome-extension/download) | [Installing self-hosted browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |
| Self-hosted browser extension (use for Task Mining Client software before 2.19). | 1.0.2 | For more information, contact Support. | [Installing self-hosted browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |

| Description | Version | File | More information |
| --- | --- | --- | --- |
| Task Mining Client software install file. | 2.21.1  (2026-04-28) | [CelonisTaskMining.Client.Installer](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/client/download) | [Installing the Task Mining Client software (install package)](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-idm235045115886777) |
| Task Mining Configuration Editor install file. | 2.21.1  (2026-04-28) | [CelonisTaskMining.Configuration.Installer](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/config-editor/download) | [Installing the Task Mining Configuration Editor (optional)](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)") |
| Browser extension (use for Task Mining Client software from 2.19). | 2.2.0  (2025-04-24) | [Celonis Task Mining Chrome Browser Extension for version 2.0.0](https://chromewebstore.google.com/detail/celonis-task-mining-brows/lecnjphdlpfkkchcpibhdjndfnadnmio) | [Installing browser extensions from Chrome Web Store (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Browser extension (use for Task Mining Client software before 2.19). | 1.0.2  (2023-11-25) | [Celonis Task Mining Chrome Browser Extension for version 1.0.2 (legacy)](https://chromewebstore.google.com/detail/celonis-task-mining-brows/ndfcgjlpabkombgfpckhglibdhnipbfl) | [Installing browser extensions from Chrome Web Store (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Self-hosted browser extension (use for Task Mining Client software from 2.19). | 2.0.0  (2025-04-29) | [2025-04-29\_CelonisTaskMiningBrowserExtension-2.0.0](https://download.eu-1.celonis.cloud/task-mining/api/public/installers/chrome-extension/download) | [Installing self-hosted browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |
| Self-hosted browser extension (use for Task Mining Client software before 2.19). | 1.0.2 | For more information, contact Support. | [Installing self-hosted browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |

[### Task Mining software install file release notes](#UUID-85329f38-095f-7a42-8391-2faccc268dfa_body)

Filter

- Version
- Date
- Notes

| 2.21.1 | 2026-04-28 | **Improvements**  - Enhanced internal message handling. - Removed legacy, unused decryption paths related to protected Windows data; sign-in processes and data protection are unaffected. |
| 2.21.0 | 2026-02-23 | **Improvements**  General improvements.  **This feature is currently available as a Private Preview only**  During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.  For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types").  Remote suspension of Task Mining data capture added for Private Preview customers only. |
| 2.20.1 | 2025-12-17 | **Fixes**  - Fixed an issue that caused an excessive number of configuration requests. - Fixed an issue that prevented the cached configuration file being properly written to disk. - Fixed an issue where data capturing did not stop if the configuration couldn't be loaded from the network or cached file. - Fixed an issue with incorrectly-reported request timeouts in Task Mining Client software logs. - Fixed an issue where the Task Mining Client software failed to apply data redaction rules if the user or machine name contained special regex characters. - Fixed an issue where invalid Unicode strings could cause event processing to fail. - Fixed an issue that prevented screenshots from being saved after repeated failed configuration reloads. - Fixed an issue where URL-based exclusion rules were not applied correctly if the captured URL was missing in the schema. |
| 2.20.0 | 2025-07-31 | **Improvements**  - Added improved and more reliable reporting of the Task Mining Client application state to the cloud backend. - Improved and added more detailed reporting of events and state changes to the cloud backend.  **Important**  We've also changed some of the endpoints used by the Task Mining Client application. For more information, see [API endpoints for Task Mining](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access"). |
| 2.19.0 | 2025-05-30 | **Improvements**  Improved support for data gathering via the Chrome/Edge browser extensions to support multiple users per machine.  **Important**  This is a breaking change as we've released a new version 2.0.0 of the Task Mining Browser Extension for both Chrome and Edge. For more information, see Installing the Task Mining browser extensions (optional). |
| 2.18.2 | 2025-05-05 | **Fixes**  - Fixed an issue in secure gateway environments where automatic activation did not always occur properly. - Fixed an issue in secure gateway environments where users were not properly notified of removed access to a project. - Fixed an issue in secure gateway environments where on first startup after an update from a previous version users were incorrectly notified of removed access to a project. |
| 2.18.1 | 2025-03-06 | **Fixes**  - Fixed an issue where project activation failed from the browser with a different team or realm to the one currently in use. - Fixed an issue that prevented users from opening documents in SAP while the Task Mining Client was running. - Fixed an issue that prevented activating the client for a project in a secure gateway environment when it was already activated for a project in a different secure gateway environment. |
| 2.18.0 | 2024-11-27 | **Features**  - Auto-activation is now available for users enrolled in a single project within a secure gateway environment. - Third-party licenses are now displayed in the **About** window for both the Task Mining Client and the Task Mining Configuration Editor.  **Improvements**  - Enhanced logging capabilities in the Task Mining Client.  **Fixes**  - Fixed a bug that prevented existing cached files being added to the upload queue after startup. - Fixed a bug that caused incorrect values for certain attributes in the Live Event Monitor. - Fixed a bug causing the intermittent absence of **Task Mining Stopped** events. - The mandatory event attribute **SessionId** can no longer be excluded from logging in the Event Processing Rules.  **Note**  You must update any configurations that currently exclude **SessionId**. See [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings"). |
| 2.17.1 | 2024-06-06 | **Fixes**  - Fixed a bug that caused text being displayed twice in a toast notification. - Fixed a bug that prevented the Task Mining Client from properly deserializing the cached configuration file. - Fixed a bug that prevented the Task Mining Configuration Editor to load/save redaction rules from/to a configuration file. |
| 2.17.0 | 2024-04-16 | **Features**  - Introduced a new feature: OAuth security, providing another option to Application Keys and API Keys for authorization.  **Improvements**  - Improved client handling statistics. - Secure gateway selection is now stored in the User.config. - Path for local file storage can now be configured (important for VDI deployments).  **Fixes**  - Fixed a bug that caused the processing to stop for the rest of the files in a queue if there was a corrupted file. - Fixed a bug that caused the Task Mining Client to hang and not respond after attempting to connect to the client. - Fixed a bug related to retrieving data from the user's clipboard. - Fixed a bug that caused attributes to still get hashed after hashing was disabled for all attributes. - Fixed issue where machine name was empty in VDI deployments. |
| 2.15.2 | 2024-03-07 | **Improvements**  - Improved performance of Native URL Retrieval in Internet Explorer mode. |
| 2.15.1 | 2024-02-12 | **Fixes**  - Fixed a bug that prevented captured events from being uploaded to the Celonis Platform after changing the team. |
| 2.15.0 | 2024-02-08 | **Improvements**:  - Improved the encryption of files to ensure that no file is ever written to the disk unencrypted (if the feature is enabled). - Added a crash log to the Configuration Editor in case the application crashes due to an unknown error.  **Fixes**  - Fixed a bug that prevented capturing of events triggered by the Chrome Extension after the Task Mining Client was paused and started again. - Fixed a bug that prevented cached parquet files to get uploaded once a connection to the Celonis Platform was re-established. |
| 2.14.0 | 2023-12-07 | **Features**  - Redaction rules are now applied independent of diacritics.  **Improvements**  - Improved network stability by ensuring that proxy changes take effect during runtime of the Task Mining Client.  **Fixes**  - Fixed issue where users could apply data redaction to non-redactable attributes. - Fixed issue where users could slow down Task Mining Client via too complex redaction rules. - Fixed issue where EnteredText attribute was not properly hashed or removed in the Live Event Monitor. - Fixed issue where consent window is not shown when switching to a different team. - Fixed issue where number of uploaded/deleted files is not reset when switching to a different team. |
| 2.13.0 | 2023-08-31 | **Features**  Configure regular expressions in the Task Mining Desktop Application for redacting personally identifiable information (PII), such as credit card numbers, email addresses, and other sensitive content (see Data Redaction).  - Redact data before sending to Celonis Platform (instead of using a custom SQL transformation after sending). - Mask custom patterns within a column (as an alternative to skipping the whole data point). - Choose what replaces the data.  **Fixes**  - Fixed a bug causing the Task Mining Client to crash when the UWP Notification Platform is unavailable |
| 2.12.1 | 2023-08-24 | We've fixed an issue that prevented the application from retrieving the system proxy settings when a PAC script was configured. |
| 2.12.0 | 2023-08-01 | **Features**  - Logging support is now available in the Configuration Editor for improved debugging and monitoring. - A new button has been incorporated into the Live Event Monitor to help users clear the event grid quickly. - Multiple service principal names for the custom on-premises Task Mining gateway are now supported. - The application now supports native URL retrieval for Microsoft Edge in Internet Explorer mode.  **Improvements**  - The default mode for the Live Event Monitor is now set to Started. - An automatic retry mechanism is now implemented to counter configuration loading failures for inactive clients. - Communication performance between the client and the cloud service has been enhanced. - The local port of the extension's web socket is configurable now.  **Fixes**  - An issue that prevented the Live Event Monitor from properly considering start/pause states has been fixed. - We've resolved an issue causing the application to crash while resolving inaccessible personal folders. |
| 2.11.0 | 2023-05-25 | **Improvements**  - Added primary key as request parameter during parquet file upload to avoid duplicate events in certain edge cases. |
| 2.10.0 | 2023-03-15 | **Improvements**  - Improved caching and sending behavior of the Client to ensure that parquet files are sent to the Celonis Platform in the order they were created. - Major improvement of “Native URL Retrieval” that increases the rate of successfully retrieved URLs. - Added user consent fields to be included when the Client settings are reloaded from the cloud.  **Fixes**  - Fixed a bug in UIAA denylist that caused the feature to not work properly when switching between processes with Alt + Tab. - Fixed a bug causing the “User Attributes” window to constantly reappear, when a user attribute has been deleted after the user has already specified an input. - Fixed a bug causing the Client to throw an error when a parquet file has been manually renamed or deleted before it is sent to the Celonis Platform. |
| 2.9.2 | 2023-01-03 | **Features**  - Preview Mode: Allows users to display the captured data in a Datagrid directly from the configuration editor without interacting with the cloud. - Support multiple secure gateways. - Exclude applications from UIAA: Specify a list of applications for which UIAA should be disabled. - Introduce Reload configuration button in the configuration menu.  **Improvements**  - Improve the performance of the Live event monitor.  **Fixes**  - Update default consent text. - Fixed an issue in the Live event monitor that shows attributes not part of the event processing rules. - Fixed an issue in the Live event monitor that shows wrong or default data. - Fixed an issue that allows starting recording from the context menu before entering required custom columns. - Fixed UI issue that overlaps the text with the icon for long texts in the User Input Window. - Fixed an issue that keeps prompting the User Input Window to provide User Attributes, despite the user has already given an answer (Only caused when the Project Lead changed User Attributes in the config). |
| 2.8.1 | 2022-10-30 | **Features**  - User Attributes: Allows client users to provide additional user-specific information to calculate metrics for a subset of defined users, such as teams, regions, and roles.  **Improvements**  - New Celonis logos and layout applied. - Capturing more Clipboard changed events for non-text data.  **Fixes**  - Fixed an issue that triggers a ‘Clipboard changed‘ event when pasting in Excel or Word.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.7.9 | 2022-08-17 | **Features**  - Live event monitor: Enables analysts to immediately see and validate which data is captured with the applied configuration e.g. during the setup phase.  - Customized Extension ID: This feature allows allow listing custom Chrome extension ID during installation (e.g. for [self-hosted extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)")).  - Expanded Data Collection: New jQuery selectors to define custom extraction in web pages and support for input elements, content editable elements and iFrame events (With Task Mining Chrome Extension 0.8 or newer)  **Improvements**  - Major performance improvements that increase efficiency and improve product performance: Users notice Task Mining even less with up to 50% reduced CPU usage.  - SAP integration has been improved when retrieving SAP elements. - Optimizing file reading and writing. - Improved the functionality of uploading files to the cloud. - Improved keyboard capturing for dead keys and support for capturing different languages. - Improved user privacy by pausing the client when the user's consent is required. - Improved display notifications. - Set the default proxy settings to auto-detect. - Close all running instances of the client when uninstalling. - Cached proxy configuration.  **Fixes**  - When the rule name is too long, the expander is not shown in the ‘Configured Applications’ window. - If you configured some attributes to be hashed but not to be logged, the client crashes.  **Deprecated**  - ‘Application window changed‘ events are deprecated.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.6.1 | 2021-12-27 | **Fixes**  Fixed a problem of corrupted string values when uploading multiple files in parallel.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.6.0 | 2021-11-19 | **Features**  - SAP integration support for SAP Business Client (SapGuiServer, NWBC). - SAP integration option to dynamically enable native Microsoft Windows dialogs in SAP GUI.  **Fixes**  - Fixed a problem when uploading and deleting cached files. - Fixed consent URL visibility in consent window.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.2 | 2021-09-30 | **Fixes**  - Fix uploading issue with a proxy server.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.1 | 2021-09-28 | **Fixes**  - Error while retrieving SAP metadata.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.0 | 2021-09-22 | **Features**  - Support for on-premise gateway service - Extracting additional meta-data from SAP GUI - Project-based storage structure for cache  **Fixes/Improvements**  - Fixed incorrect consent text when switching project - Allow multiline entry in consent textbox in config editor - Fixed client crashes after a change of configuration - Fixed connection issues to Chrome extension - Fixed improper change of team if centrally configured during the rollout - Fixed incorrect conversion of conditions with nested OR/AND in config editor UI  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.4.1 | 2021-07-28 | **Features**  - Retrieving URLs from Google Chrome, Microsoft Edge, Mozilla Firefox, and Microsoft Internet Explorer without a browser extension. - Automatic update check. - Automatic upload of cached files from previous runs. - Cleaning up cache in case it exceeds the configured storage limit. - Capturing additional event types to analyze user activity.  **Fixes/Improvements**  - Show warning in the client if no event processing rules are configured. - Falsely detected clipboard changed event if clipboard contains data when starting capturing. - Performance issue if no internet connection is available. - Context menu of tray icon not working if the application window is minimized. - Chrome extension status not updated properly. - Various minor bug fixes and UI improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.3.0 | 2021-04-20 | **Features**  - Install browser extension for Chromium-based Microsoft Edge. - Advanced proxy support:  - System proxy support.   - Active Directory Authentication.   - Support for proxy configuration scripts. - Activate client during centralized installation.  **Fixes/Improvements**  - Keep application settings when installing a new version of Task Mining Client. - Improved password clearing. - Fixed error while loading client certificate from Windows certificate store. - Fixed application crash if shared clipboard on VM is not accessible. - Fixed application crash if the configuration contains invalid event processing rules. - Various user interface improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.2.2 | 2021-02-25 | **Features**  - Central configuration: Easily manage your Task Mining projects with hundreds of users. - Central configuration:  - Activation links for simple connection of the client to Task Mining project in Celonis Platform.   - Clients fetch configuration automatically from Celonis Platform.   - Configuration files do not need to be copied to the client machines anymore.   - Simple and fast update of configurations. - Central logging and monitoring:  - Error messages are forwarded to the cloud.   - Show error log inside client instead of log files.   - See the current state of all clients. - New, more reliable screenshot implementation. - Support for internet connections over secure gateways.  **Fixes**  - Communication errors between client and Chrome extension. - Crash of configuration editor if event processing rules are missing in the configuration file. - Minor UI improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.0.7 | 2020-12-10 | **Fixes**  - Resolved performance issues while capturing event data.  **Note**  **Update from version 2.0.4 - 2.0.6:** No breaking changes.  **Update from older versions (1.X):** See release notes for version 2.0.4. |
| 2.0.6 | 2020-12-07 | **Fixes**  - Client UI freezing on copy to clipboard events in Internet Explorer.  **Note**  **Update from version 2.0.4 - 2.0.5:** No breaking changes.  **Update from older versions (1.X):** See release notes for version 2.0.4. |
| 2.0.5 | 2020-11-20 | **Fixes**  - Fixes an issue where some attributes cannot be used in allow/deny list.  **Note**  **Update from version 2.0.4:** No breaking changes  **Update from older versions (1.X):** See release notes for version 2.0.4 |
| 2.0.4 | 2020-11-17 | **Features**  - New UI design of configuration editor:  - Improved logical structure of configuration options.   - Tooltips explaining each configuration option.   - Visual editor for event processing rule supports IN operators. - New UI of Task Mining Client:  - Customized data privacy consent.   - Showing information on captured applications and file upload status.   - New look and feel.   - Control Task Mining directly from taskbar. - New installers:  - Option to install Task Mining Client locally without admin rights. - Encryption of locally cached files (events and screenshots). - Extracting additional information on controls (e.g. button labels). - HTTP proxy support.  **Fixes**  - Improved detection of functional keys as keyboard commands. - Cropped screenshots for Internet Explorer. - False detection of WIN keys after locking the screen with Win+L keyboard command. - Win+E is not detected as the keyboard command. - Events sent by Chrome events lost (requires an update of Chrome extension to Version 0.4). - Clipboard changes freezing Task Mining UI. - Retrieving URLs from Internet Explorer for clipboard change events.  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version. |
| 1.2.7 | 2020-09-10 | **Features**  - New screenshot capturing:  - Exact clipping of active window.   - Avoids overlay windows of other applications. - Option to install Chrome extension from Task Mining installer. - SAP integration for clipboard events. - Optional name and description for event processing rules. - Minor UI improvements.  **Fixes**  - Connection issues of SAP integration on slow machines. - Incorrect assignment of process name and window title when switching application. - Special characters entered by key commands (e.g. Ctrl+Alt+Q for @ on German keyboard layouts) detected as keyboard command events. - Event Processing Rules: Incorrect handling of empty fields in NOT LIKE operator. - Different hashed values for the same input. - Errors in communication between Task Mining Client and Chrome extension.  Deprecated/removed:  - Starting mode `Working Hours` - Option `Obfuscate text input`  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version.  Change of system requirements:  - The new screenshot approach requires min. Windows 10, release 1903. - To run Task Mining on older Windows versions, you need to enable the "Use legacy screenshot capturing" option in the configuration. |
| 1.2.1 | 2020-07-02 | **Features**  - SAP integration: Retrieving detailed information for controls of SAP GUI. - Retrieving caret position. - Support for user-bound API keys.  **Fixes**  - Crash of configuration editor after clicking a button of the default rule. - Incorrect size and clipping of screenshots if the screen is scaled.  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version. |
| 1.1.7 | 2020-06-10 | Features:  - Visual Configuration Editor introduced.  Fixes/improvements:  - Showing an error message when loading unreadable config files. |
| Version | Date | Notes |
| --- | --- | --- |

| 2.21.1 | 2026-04-28 | **Improvements**  - Enhanced internal message handling. - Removed legacy, unused decryption paths related to protected Windows data; sign-in processes and data protection are unaffected. |
| 2.21.0 | 2026-02-23 | **Improvements**  General improvements.  **This feature is currently available as a Private Preview only**  During a Private Preview, only customers who have agreed to our Private Preview usage agreements can access this feature. Additionally, the features documented here are subject to change and / or cancellation, so they may not be available to all users in future.  For more information about our Private Preview releases, including the level of Support offered with them, see: [Feature release types](feature_release_types.html "Feature release types").  Remote suspension of Task Mining data capture added for Private Preview customers only. |
| 2.20.1 | 2025-12-17 | **Fixes**  - Fixed an issue that caused an excessive number of configuration requests. - Fixed an issue that prevented the cached configuration file being properly written to disk. - Fixed an issue where data capturing did not stop if the configuration couldn't be loaded from the network or cached file. - Fixed an issue with incorrectly-reported request timeouts in Task Mining Client software logs. - Fixed an issue where the Task Mining Client software failed to apply data redaction rules if the user or machine name contained special regex characters. - Fixed an issue where invalid Unicode strings could cause event processing to fail. - Fixed an issue that prevented screenshots from being saved after repeated failed configuration reloads. - Fixed an issue where URL-based exclusion rules were not applied correctly if the captured URL was missing in the schema. |
| 2.20.0 | 2025-07-31 | **Improvements**  - Added improved and more reliable reporting of the Task Mining Client application state to the cloud backend. - Improved and added more detailed reporting of events and state changes to the cloud backend.  **Important**  We've also changed some of the endpoints used by the Task Mining Client application. For more information, see [API endpoints for Task Mining](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access"). |
| 2.19.0 | 2025-05-30 | **Improvements**  Improved support for data gathering via the Chrome/Edge browser extensions to support multiple users per machine.  **Important**  This is a breaking change as we've released a new version 2.0.0 of the Task Mining Browser Extension for both Chrome and Edge. For more information, see Installing the Task Mining browser extensions (optional). |
| 2.18.2 | 2025-05-05 | **Fixes**  - Fixed an issue in secure gateway environments where automatic activation did not always occur properly. - Fixed an issue in secure gateway environments where users were not properly notified of removed access to a project. - Fixed an issue in secure gateway environments where on first startup after an update from a previous version users were incorrectly notified of removed access to a project. |
| 2.18.1 | 2025-03-06 | **Fixes**  - Fixed an issue where project activation failed from the browser with a different team or realm to the one currently in use. - Fixed an issue that prevented users from opening documents in SAP while the Task Mining Client was running. - Fixed an issue that prevented activating the client for a project in a secure gateway environment when it was already activated for a project in a different secure gateway environment. |
| 2.18.0 | 2024-11-27 | **Features**  - Auto-activation is now available for users enrolled in a single project within a secure gateway environment. - Third-party licenses are now displayed in the **About** window for both the Task Mining Client and the Task Mining Configuration Editor.  **Improvements**  - Enhanced logging capabilities in the Task Mining Client.  **Fixes**  - Fixed a bug that prevented existing cached files being added to the upload queue after startup. - Fixed a bug that caused incorrect values for certain attributes in the Live Event Monitor. - Fixed a bug causing the intermittent absence of **Task Mining Stopped** events. - The mandatory event attribute **SessionId** can no longer be excluded from logging in the Event Processing Rules.  **Note**  You must update any configurations that currently exclude **SessionId**. See [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings"). |
| 2.17.1 | 2024-06-06 | **Fixes**  - Fixed a bug that caused text being displayed twice in a toast notification. - Fixed a bug that prevented the Task Mining Client from properly deserializing the cached configuration file. - Fixed a bug that prevented the Task Mining Configuration Editor to load/save redaction rules from/to a configuration file. |
| 2.17.0 | 2024-04-16 | **Features**  - Introduced a new feature: OAuth security, providing another option to Application Keys and API Keys for authorization.  **Improvements**  - Improved client handling statistics. - Secure gateway selection is now stored in the User.config. - Path for local file storage can now be configured (important for VDI deployments).  **Fixes**  - Fixed a bug that caused the processing to stop for the rest of the files in a queue if there was a corrupted file. - Fixed a bug that caused the Task Mining Client to hang and not respond after attempting to connect to the client. - Fixed a bug related to retrieving data from the user's clipboard. - Fixed a bug that caused attributes to still get hashed after hashing was disabled for all attributes. - Fixed issue where machine name was empty in VDI deployments. |
| 2.15.2 | 2024-03-07 | **Improvements**  - Improved performance of Native URL Retrieval in Internet Explorer mode. |
| 2.15.1 | 2024-02-12 | **Fixes**  - Fixed a bug that prevented captured events from being uploaded to the Celonis Platform after changing the team. |
| 2.15.0 | 2024-02-08 | **Improvements**:  - Improved the encryption of files to ensure that no file is ever written to the disk unencrypted (if the feature is enabled). - Added a crash log to the Configuration Editor in case the application crashes due to an unknown error.  **Fixes**  - Fixed a bug that prevented capturing of events triggered by the Chrome Extension after the Task Mining Client was paused and started again. - Fixed a bug that prevented cached parquet files to get uploaded once a connection to the Celonis Platform was re-established. |
| 2.14.0 | 2023-12-07 | **Features**  - Redaction rules are now applied independent of diacritics.  **Improvements**  - Improved network stability by ensuring that proxy changes take effect during runtime of the Task Mining Client.  **Fixes**  - Fixed issue where users could apply data redaction to non-redactable attributes. - Fixed issue where users could slow down Task Mining Client via too complex redaction rules. - Fixed issue where EnteredText attribute was not properly hashed or removed in the Live Event Monitor. - Fixed issue where consent window is not shown when switching to a different team. - Fixed issue where number of uploaded/deleted files is not reset when switching to a different team. |
| 2.13.0 | 2023-08-31 | **Features**  Configure regular expressions in the Task Mining Desktop Application for redacting personally identifiable information (PII), such as credit card numbers, email addresses, and other sensitive content (see Data Redaction).  - Redact data before sending to Celonis Platform (instead of using a custom SQL transformation after sending). - Mask custom patterns within a column (as an alternative to skipping the whole data point). - Choose what replaces the data.  **Fixes**  - Fixed a bug causing the Task Mining Client to crash when the UWP Notification Platform is unavailable |
| 2.12.1 | 2023-08-24 | We've fixed an issue that prevented the application from retrieving the system proxy settings when a PAC script was configured. |
| 2.12.0 | 2023-08-01 | **Features**  - Logging support is now available in the Configuration Editor for improved debugging and monitoring. - A new button has been incorporated into the Live Event Monitor to help users clear the event grid quickly. - Multiple service principal names for the custom on-premises Task Mining gateway are now supported. - The application now supports native URL retrieval for Microsoft Edge in Internet Explorer mode.  **Improvements**  - The default mode for the Live Event Monitor is now set to Started. - An automatic retry mechanism is now implemented to counter configuration loading failures for inactive clients. - Communication performance between the client and the cloud service has been enhanced. - The local port of the extension's web socket is configurable now.  **Fixes**  - An issue that prevented the Live Event Monitor from properly considering start/pause states has been fixed. - We've resolved an issue causing the application to crash while resolving inaccessible personal folders. |
| 2.11.0 | 2023-05-25 | **Improvements**  - Added primary key as request parameter during parquet file upload to avoid duplicate events in certain edge cases. |
| 2.10.0 | 2023-03-15 | **Improvements**  - Improved caching and sending behavior of the Client to ensure that parquet files are sent to the Celonis Platform in the order they were created. - Major improvement of “Native URL Retrieval” that increases the rate of successfully retrieved URLs. - Added user consent fields to be included when the Client settings are reloaded from the cloud.  **Fixes**  - Fixed a bug in UIAA denylist that caused the feature to not work properly when switching between processes with Alt + Tab. - Fixed a bug causing the “User Attributes” window to constantly reappear, when a user attribute has been deleted after the user has already specified an input. - Fixed a bug causing the Client to throw an error when a parquet file has been manually renamed or deleted before it is sent to the Celonis Platform. |
| 2.9.2 | 2023-01-03 | **Features**  - Preview Mode: Allows users to display the captured data in a Datagrid directly from the configuration editor without interacting with the cloud. - Support multiple secure gateways. - Exclude applications from UIAA: Specify a list of applications for which UIAA should be disabled. - Introduce Reload configuration button in the configuration menu.  **Improvements**  - Improve the performance of the Live event monitor.  **Fixes**  - Update default consent text. - Fixed an issue in the Live event monitor that shows attributes not part of the event processing rules. - Fixed an issue in the Live event monitor that shows wrong or default data. - Fixed an issue that allows starting recording from the context menu before entering required custom columns. - Fixed UI issue that overlaps the text with the icon for long texts in the User Input Window. - Fixed an issue that keeps prompting the User Input Window to provide User Attributes, despite the user has already given an answer (Only caused when the Project Lead changed User Attributes in the config). |
| 2.8.1 | 2022-10-30 | **Features**  - User Attributes: Allows client users to provide additional user-specific information to calculate metrics for a subset of defined users, such as teams, regions, and roles.  **Improvements**  - New Celonis logos and layout applied. - Capturing more Clipboard changed events for non-text data.  **Fixes**  - Fixed an issue that triggers a ‘Clipboard changed‘ event when pasting in Excel or Word.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.7.9 | 2022-08-17 | **Features**  - Live event monitor: Enables analysts to immediately see and validate which data is captured with the applied configuration e.g. during the setup phase.  - Customized Extension ID: This feature allows allow listing custom Chrome extension ID during installation (e.g. for [self-hosted extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)")).  - Expanded Data Collection: New jQuery selectors to define custom extraction in web pages and support for input elements, content editable elements and iFrame events (With Task Mining Chrome Extension 0.8 or newer)  **Improvements**  - Major performance improvements that increase efficiency and improve product performance: Users notice Task Mining even less with up to 50% reduced CPU usage.  - SAP integration has been improved when retrieving SAP elements. - Optimizing file reading and writing. - Improved the functionality of uploading files to the cloud. - Improved keyboard capturing for dead keys and support for capturing different languages. - Improved user privacy by pausing the client when the user's consent is required. - Improved display notifications. - Set the default proxy settings to auto-detect. - Close all running instances of the client when uninstalling. - Cached proxy configuration.  **Fixes**  - When the rule name is too long, the expander is not shown in the ‘Configured Applications’ window. - If you configured some attributes to be hashed but not to be logged, the client crashes.  **Deprecated**  - ‘Application window changed‘ events are deprecated.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.6.1 | 2021-12-27 | **Fixes**  Fixed a problem of corrupted string values when uploading multiple files in parallel.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.6.0 | 2021-11-19 | **Features**  - SAP integration support for SAP Business Client (SapGuiServer, NWBC). - SAP integration option to dynamically enable native Microsoft Windows dialogs in SAP GUI.  **Fixes**  - Fixed a problem when uploading and deleting cached files. - Fixed consent URL visibility in consent window.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.2 | 2021-09-30 | **Fixes**  - Fix uploading issue with a proxy server.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.1 | 2021-09-28 | **Fixes**  - Error while retrieving SAP metadata.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.5.0 | 2021-09-22 | **Features**  - Support for on-premise gateway service - Extracting additional meta-data from SAP GUI - Project-based storage structure for cache  **Fixes/Improvements**  - Fixed incorrect consent text when switching project - Allow multiline entry in consent textbox in config editor - Fixed client crashes after a change of configuration - Fixed connection issues to Chrome extension - Fixed improper change of team if centrally configured during the rollout - Fixed incorrect conversion of conditions with nested OR/AND in config editor UI  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.4.1 | 2021-07-28 | **Features**  - Retrieving URLs from Google Chrome, Microsoft Edge, Mozilla Firefox, and Microsoft Internet Explorer without a browser extension. - Automatic update check. - Automatic upload of cached files from previous runs. - Cleaning up cache in case it exceeds the configured storage limit. - Capturing additional event types to analyze user activity.  **Fixes/Improvements**  - Show warning in the client if no event processing rules are configured. - Falsely detected clipboard changed event if clipboard contains data when starting capturing. - Performance issue if no internet connection is available. - Context menu of tray icon not working if the application window is minimized. - Chrome extension status not updated properly. - Various minor bug fixes and UI improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.3.0 | 2021-04-20 | **Features**  - Install browser extension for Chromium-based Microsoft Edge. - Advanced proxy support:  - System proxy support.   - Active Directory Authentication.   - Support for proxy configuration scripts. - Activate client during centralized installation.  **Fixes/Improvements**  - Keep application settings when installing a new version of Task Mining Client. - Improved password clearing. - Fixed error while loading client certificate from Windows certificate store. - Fixed application crash if shared clipboard on VM is not accessible. - Fixed application crash if the configuration contains invalid event processing rules. - Various user interface improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.2.2 | 2021-02-25 | **Features**  - Central configuration: Easily manage your Task Mining projects with hundreds of users. - Central configuration:  - Activation links for simple connection of the client to Task Mining project in Celonis Platform.   - Clients fetch configuration automatically from Celonis Platform.   - Configuration files do not need to be copied to the client machines anymore.   - Simple and fast update of configurations. - Central logging and monitoring:  - Error messages are forwarded to the cloud.   - Show error log inside client instead of log files.   - See the current state of all clients. - New, more reliable screenshot implementation. - Support for internet connections over secure gateways.  **Fixes**  - Communication errors between client and Chrome extension. - Crash of configuration editor if event processing rules are missing in the configuration file. - Minor UI improvements.  **Note**  With the introduction of the Celonis Platform Task Mining service in version 2.2.2, how you set up and configure Task Mining has changed. |
| 2.0.7 | 2020-12-10 | **Fixes**  - Resolved performance issues while capturing event data.  **Note**  **Update from version 2.0.4 - 2.0.6:** No breaking changes.  **Update from older versions (1.X):** See release notes for version 2.0.4. |
| 2.0.6 | 2020-12-07 | **Fixes**  - Client UI freezing on copy to clipboard events in Internet Explorer.  **Note**  **Update from version 2.0.4 - 2.0.5:** No breaking changes.  **Update from older versions (1.X):** See release notes for version 2.0.4. |
| 2.0.5 | 2020-11-20 | **Fixes**  - Fixes an issue where some attributes cannot be used in allow/deny list.  **Note**  **Update from version 2.0.4:** No breaking changes  **Update from older versions (1.X):** See release notes for version 2.0.4 |
| 2.0.4 | 2020-11-17 | **Features**  - New UI design of configuration editor:  - Improved logical structure of configuration options.   - Tooltips explaining each configuration option.   - Visual editor for event processing rule supports IN operators. - New UI of Task Mining Client:  - Customized data privacy consent.   - Showing information on captured applications and file upload status.   - New look and feel.   - Control Task Mining directly from taskbar. - New installers:  - Option to install Task Mining Client locally without admin rights. - Encryption of locally cached files (events and screenshots). - Extracting additional information on controls (e.g. button labels). - HTTP proxy support.  **Fixes**  - Improved detection of functional keys as keyboard commands. - Cropped screenshots for Internet Explorer. - False detection of WIN keys after locking the screen with Win+L keyboard command. - Win+E is not detected as the keyboard command. - Events sent by Chrome events lost (requires an update of Chrome extension to Version 0.4). - Clipboard changes freezing Task Mining UI. - Retrieving URLs from Internet Explorer for clipboard change events.  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version. |
| 1.2.7 | 2020-09-10 | **Features**  - New screenshot capturing:  - Exact clipping of active window.   - Avoids overlay windows of other applications. - Option to install Chrome extension from Task Mining installer. - SAP integration for clipboard events. - Optional name and description for event processing rules. - Minor UI improvements.  **Fixes**  - Connection issues of SAP integration on slow machines. - Incorrect assignment of process name and window title when switching application. - Special characters entered by key commands (e.g. Ctrl+Alt+Q for @ on German keyboard layouts) detected as keyboard command events. - Event Processing Rules: Incorrect handling of empty fields in NOT LIKE operator. - Different hashed values for the same input. - Errors in communication between Task Mining Client and Chrome extension.  Deprecated/removed:  - Starting mode `Working Hours` - Option `Obfuscate text input`  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version.  Change of system requirements:  - The new screenshot approach requires min. Windows 10, release 1903. - To run Task Mining on older Windows versions, you need to enable the "Use legacy screenshot capturing" option in the configuration. |
| 1.2.1 | 2020-07-02 | **Features**  - SAP integration: Retrieving detailed information for controls of SAP GUI. - Retrieving caret position. - Support for user-bound API keys.  **Fixes**  - Crash of configuration editor after clicking a button of the default rule. - Incorrect size and clipping of screenshots if the screen is scaled.  **Note**  Incompatible changes in Celonis Platform data schema:  - You cannot push data to event collection tables that have been created for previous versions of Task Mining. - You cannot push data from previous versions of Task Mining into event collection tables that have been created for this version. |
| 1.1.7 | 2020-06-10 | Features:  - Visual Configuration Editor introduced.  Fixes/improvements:  - Showing an error message when loading unreadable config files. |
| Version | Date | Notes |
| --- | --- | --- |

#### Release notes browser extension

|  |  |  |
| --- | --- | --- |
| **Version** | **Date** | **Notes** |
| 1.0.1 | 2023-01-27 | **Fixes**  - Events on some elements not captured due to error when the element path was null. |
| 1.0 | 2022-11-24 | **Fixes/Improvements**  - Chrome extension manifest update from version 2 to version 3. The current Manifest version 2 is deprecated, and support will be removed in 2023. - Adding graceful failing WebPage Extraction when an invalid path expression is used |
| 0.8 and before | - | No separate release notes. Release notes have been part of the Client & Configuration Editor release notes above. |


---

## task-mining/installing-the-task-mining-configuration-editor--optional-

# Installing the Task Mining Configuration Editor (optional)

You use the Configuration Editor to configure advanced client settings for Task Mining projects. If you won’t be creating or updating Task Mining configuration files or will be using [basic client](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings") settings only, you don’t need to install the Configuration Editor. For more information, see [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects").

Expand all

[## Installation options](#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235127725480061_body)

Filter

- Installation option
- Description
- More information

| Installation option | Description | More information |
| --- | --- | --- |
| User downloads the Configuration Editor file. | User wants to create or edit a Task Mining configuration file. | [Installing the Configuration Editor](installing-the-task-mining-configuration-editor--optional-.html#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235212649997327 "Installing the Configuration Editor") |
| User enables **Advanced Client** settings when configuring a Task Mining project and the Configuration Editor install file is downloaded if not already installed. | User realizes when configuring a Task Mining project that more advanced configuration settings are required. | [Installing the Configuration Editor](installing-the-task-mining-configuration-editor--optional-.html#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235212649997327 "Installing the Configuration Editor")  **Note**  The install process is the same for both options except in this option, the Task Mining Configuration Editor installation zip file is downloaded automatically. |

| Installation option | Description | More information |
| --- | --- | --- |
| User downloads the Configuration Editor file. | User wants to create or edit a Task Mining configuration file. | [Installing the Configuration Editor](installing-the-task-mining-configuration-editor--optional-.html#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235212649997327 "Installing the Configuration Editor") |
| User enables **Advanced Client** settings when configuring a Task Mining project and the Configuration Editor install file is downloaded if not already installed. | User realizes when configuring a Task Mining project that more advanced configuration settings are required. | [Installing the Configuration Editor](installing-the-task-mining-configuration-editor--optional-.html#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235212649997327 "Installing the Configuration Editor")  **Note**  The install process is the same for both options except in this option, the Task Mining Configuration Editor installation zip file is downloaded automatically. |

[## Before you begin](#id827382_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Have the need to create or update Task Mining configuration files
- Want to use the advanced client settings

[## Installing the Configuration Editor](#UUID-7ebc7a15-bde1-86c7-a7fb-1e50c86a1d7f_section-id235212649997327_body)

1. Download the [Task Mining Configuration Editor installation zip file](installing-the-task-mining-client-software.html#UUID-662d2625-1459-4b5d-7bfb-9b2ac2472ad1 "Task Mining software installation files").

   The Task Mining Configuration Editor installation zip file downloads to your machine.
2. Navigate to your **Downloads** folder and extract all files from the Task Mining Configuration Editor installation zip file.
3. Double-click the installer file.

   The Celonis Task Mining Configuration Setup Wizard appears.

   |  |
   | --- |
   |  |
4. Step through the wizard, referring to the Task Mining software install settings as necessary.
5. Select **Finish** when the **Completed the Celonis Task Mining - Configuration Editor Setup Wizard** screen appears.
6. Search for **Celonis Task Mining - Configuration Editor** in your Windows task bar to open the Configuration Editor,

   The Celonis Task Mining Configuration Editor user interface appears.

   |  |
   | --- |
   |  |

   For more information, see [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects").

## Related topics

- [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects")
- [Task Mining Configuration Editor settings](task-mining-configuration-editor-settings.html "Task Mining Configuration Editor settings")
- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")


---

## task-mining/installing-the-task-mining-software

# Installing the Task Mining software

The Task Mining software captures data from user machines and lets you specify and configure the data that is captured. You can install the [Task Mining software components](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm23511908701068 "Task Mining software components") in different ways, depending on your user case.

Expand all

[## Before you begin](#id824828_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Hardware requirements: vCPU 4, 16 GB of RAM, 25 GB of free disk space
- Operating system: Microsoft Windows 10 or newer
- Software development framework: Microsoft .NET Framework 4.8 or higher

  **Note**

  This should already be installed on Windows 10 and Windows 11 machines. If it's not, the user will be prompted to install it when installing the Task Mining Client software. Installation of the .NET Framework typically requires admin rights.
- Permissions: Admin, if you choose the command line installation option
- User machine and network set up: The Task Mining Client software must be able to access:

  - The [API endpoints](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227 "Task Mining Client software API endpoint access") used by the Task Mining Client software to communicate with the Celonis Platform
  - Specific [directories and registry keys](installing-the-task-mining-software.html#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120824883098 "Task Mining Client software directory and registry key access") during installation of the Task Mining Client software and while the Task Mining Client software is running

[## Task Mining software components](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm23511908701068_body)

Filter

- Software component
- Description
- Install information

| Software component | Description | Install information |
| --- | --- | --- |
| Task Mining Client software | - Captures the clicks, user interactions and (optionally) screenshots for allowlisted applications. - Runs in the background on a user's machine or in a Virtual Desktop Infrastructure (VDI). | [Installing the Task Mining Client software](installing-the-task-mining-software.html "Installing the Task Mining software") |
| Task Mining Configuration Editor (optional) | - Sets or updates advanced client settings in the Task Mining software. - Used to create or update Task Mining configuration files. | [Installing the Task Mining Configuration Editor (optional)](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)") |
| Browser extensions for Google Chrome and/or Microsoft Edge (optional) | - Capture advanced browser metadata. - Used to specify which URLs Task Mining data will/will not be captured from. | [Installing browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Task Mining Gateway (optional)  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | On-premise secure gateway and integration service for Task Mining. | For more information, contact [Support](support.html "Contacting Support"). |

| Software component | Description | Install information |
| --- | --- | --- |
| Task Mining Client software | - Captures the clicks, user interactions and (optionally) screenshots for allowlisted applications. - Runs in the background on a user's machine or in a Virtual Desktop Infrastructure (VDI). | [Installing the Task Mining Client software](installing-the-task-mining-software.html "Installing the Task Mining software") |
| Task Mining Configuration Editor (optional) | - Sets or updates advanced client settings in the Task Mining software. - Used to create or update Task Mining configuration files. | [Installing the Task Mining Configuration Editor (optional)](installing-the-task-mining-configuration-editor--optional-.html "Installing the Task Mining Configuration Editor (optional)") |
| Browser extensions for Google Chrome and/or Microsoft Edge (optional) | - Capture advanced browser metadata. - Used to specify which URLs Task Mining data will/will not be captured from. | [Installing browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") |
| Task Mining Gateway (optional)  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | On-premise secure gateway and integration service for Task Mining. | For more information, contact [Support](support.html "Contacting Support"). |

[## Task Mining Client software API endpoint access](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120684806227_body)

[### Task Mining Client software (from 2.17.0)](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120687503138_body)

| Target URL | Description |
| --- | --- |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/v2/activation/{activationCode}` | Connects the Task Mining Client software to a specific Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/configuration` | Retrieves the Task Mining Client software configuration file for the connected Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/log` | Sends log messages, for example, about Task Mining Client software errors.  View these log messages in the **Users & Invite** screen for your Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/status` | Sends Task Mining Client software status updates, for example, running or paused.  View these status updates in the **Users & Invite** screen for your Task Mining project.  Valid for Task Mining Client software versions 2.17 to 2.19 only. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/heartbeat` | Sends an overview of the Task Mining Client software that is online to the Celonis team.  Valid for Task Mining Client software versions 2.17 to 2.19 only. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/state` | Sends Task Mining Client software status updates, for example, running or paused.  View these status updates in the **Users & Invite** screen for your Task Mining project.  Valid for Task Mining Client software versions 2.20 or higher only. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/event` | Sends information about specific events that happened in the Task Mining Client software, for example, the software has started, Task Mining data capture has started or stopped, data uploads were successful/failed.  Valid for Task Mining Client software versions 2.20 or higher only. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/clients/{clientId}/metrics` | Sends non-personalized usage metrics which can be used to identify potential issues with the Task Mining Client software. |
| `https://{team}.{realm}.celonis.cloud/continuous-batch-processing/api/v1/{PoolId}/items` | Uploads parquet files containing user interaction events to the Celonis team. |
| `https://{team}.{realm}.celonis.cloud/image-collector/api/v3/upload/{userId}?bucketId={bucketId}` | Uploads screenshots (if enabled) to the Celonis team storage bucket. |
| `https://{team}.{realm}.celonis.cloud/integration/api/v1/data-push/{PoolId}/jobs/{jobId}/chunks/upserted` | Uploads parquet files to the Celonis Platform if the **Use Old Data Push API** is activated.  Deprecated. |
| `https://{team}.{realm}.celonis.cloud/image-collector/api/v2/upload/{userId}/` | Uploads image files to the Celonis Platform if the **Use Old Image Upload API** is activated.  Deprecated. |

[### Task Mining Client software (before 2.17.0)](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120750975528_body)

[#### Communication protocol and validation requirements (before 2.17.0)](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120685618363_body)

| What | Requirement |
| --- | --- |
| Client authentication | Authenticated in the Celonis team using an API key. |
| Communication encryption protocol | HTTPS using TLS 1.2 or higher on default port 443. |

[#### Client certification requirements (before 2.17.0)](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120752089661_body)

| Target URL | Description |
| --- | --- |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/activation/{activationCode}` | Connects the Task Mining Client software to a specific Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/configuration` | Retrieves Task Mining Client software configurations from the connected Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/logs` | Sends log messages, for example, about Task Mining Client software errors.  View these log messages in the **Users & Invite** screen for your Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/update-status` | Sends Task Mining Client software status updates, for example, running or paused.  View these status updates in the **Users & Invite** screen for your Task Mining project. |
| `https://{team}.{realm}.celonis.cloud/task-mining/api/public/clients/{clientId}/states` | Sends signals to the Celonis team to show an overview of ‘online’ Task Mining Client software. |
| `https://{team}.{realm}.celonis.cloud/continuous-batch-processing/api/v1/{PoolId}/items` | Uploads parquet files containing user interaction events to the Celonis team. |
| `https://{team}.{realm}.celonis.cloud/image-collector/api/v3/upload/{userId}?bucketId={bucketId}` | Uploads screenshots (if enabled) to the Celonis team storage bucket. |
| `https://{team}.{realm}.celonis.cloud/integration/api/v1/data-push/{PoolId}/jobs/{jobId}/chunks/upserted` | Uploads parquet files to the Celonis Platform if the **Use Old Data Push API** is activated.  Deprecated. |
| `https://{team}.{realm}.celonis.cloud/image-collector/api/v2/upload/{userId}/` | Uploads image files to the Celonis Platform if the **Use Old Image Upload API** is activated.  Deprecated. |

[## Task Mining Client software directory and registry key access](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120824883098_body)

**Note**

If you're using the Task Mining Client software in a VDI environment, these directories and registry keys must be persisted between sessions.

[### Required directories](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120830697415_body)

Filter

- Directory
- Access type
- Description

| Directory | Access type | Description |
| --- | --- | --- |
| `%ProgramFiles(x86)%\Celonis SE\Celonis Task Mining` | Read access during runtime.  Write access during installation. | Installation directory if the Task Mining Client software has been installed for all users of a machine. |
| `%LOCALAPPDATA%\Celonis SE\Celonis Task Mining` | Read access during runtime.  Write access during installation. | Installation directory if the Task Mining Client software has been installed for the current user of the machine only. |
| `%USERPROFILE%\CelonisTaskMining` | Read/write access during runtime. | Contains cached parquet and image files. Configure the directory where these files are stored and other cached file settings in [Task Mining Configuration Editor > Data Connection settings](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043035231889 "Data Connection settings"). |
| `%LOCALAPPDATA%\Celonis\TaskMiningClient` | Read/write access during runtime. | Contains cached configuration, application settings and logs for the Task Mining Client software. |
| `%LOCALAPPDATA%\Celonis\TaskMiningClient\logs` | Write access during runtime.  Write access during installation. | Contains the current log file `TaskMiningClientLogs.txt` and compressed archived log files for the Task Mining Client software. The log file contains information about the Task Mining Client software, including errors, but does not include captured user data.  FROM Task Mining Client software version 2.18.  For more information, see [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software"). |
| `%LOCALAPPDATA%\Celonis_SE\CelonisTaskMining.Client._Url_< 32 alphanumeric characters>\<version of the client>` | Read/write access during runtime. | Contains required settings for the Task Mining Client software.  **Note**  We recommend making the entire `%LOCALAPPDATA%\Celonis_SE` directory persistent. This ensures files are still available when the Task Mining Client software is updated. |
| `<Personal Special Folder>`  For more information, see [Environment.SpecialFolder Enum](https://learn.microsoft.com/en-us/dotnet/api/system.environment.specialfolder?view=net-8.0#system-environment-specialfolder-personal). | Write access during runtime. | Contains crash report files. |
| `<Personal Special Folder/Celonis Task Mining>`  For more information, see [Environment.SpecialFolder Enum](https://learn.microsoft.com/en-us/dotnet/api/system.environment.specialfolder?view=net-8.0#system-environment-specialfolder-personal).. | Write access during runtime. | Contains error log files if the Task Mining configuration settings could not be loaded. |

| Directory | Access type | Description |
| --- | --- | --- |
| `%ProgramFiles(x86)%\Celonis SE\Celonis Task Mining` | Read access during runtime.  Write access during installation. | Installation directory if the Task Mining Client software has been installed for all users of a machine. |
| `%LOCALAPPDATA%\Celonis SE\Celonis Task Mining` | Read access during runtime.  Write access during installation. | Installation directory if the Task Mining Client software has been installed for the current user of the machine only. |
| `%USERPROFILE%\CelonisTaskMining` | Read/write access during runtime. | Contains cached parquet and image files. Configure the directory where these files are stored and other cached file settings in [Task Mining Configuration Editor > Data Connection settings](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043035231889 "Data Connection settings"). |
| `%LOCALAPPDATA%\Celonis\TaskMiningClient` | Read/write access during runtime. | Contains cached configuration, application settings and logs for the Task Mining Client software. |
| `%LOCALAPPDATA%\Celonis\TaskMiningClient\logs` | Write access during runtime.  Write access during installation. | Contains the current log file `TaskMiningClientLogs.txt` and compressed archived log files for the Task Mining Client software. The log file contains information about the Task Mining Client software, including errors, but does not include captured user data.  FROM Task Mining Client software version 2.18.  For more information, see [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software"). |
| `%LOCALAPPDATA%\Celonis_SE\CelonisTaskMining.Client._Url_< 32 alphanumeric characters>\<version of the client>` | Read/write access during runtime. | Contains required settings for the Task Mining Client software.  **Note**  We recommend making the entire `%LOCALAPPDATA%\Celonis_SE` directory persistent. This ensures files are still available when the Task Mining Client software is updated. |
| `<Personal Special Folder>`  For more information, see [Environment.SpecialFolder Enum](https://learn.microsoft.com/en-us/dotnet/api/system.environment.specialfolder?view=net-8.0#system-environment-specialfolder-personal). | Write access during runtime. | Contains crash report files. |
| `<Personal Special Folder/Celonis Task Mining>`  For more information, see [Environment.SpecialFolder Enum](https://learn.microsoft.com/en-us/dotnet/api/system.environment.specialfolder?view=net-8.0#system-environment-specialfolder-personal).. | Write access during runtime. | Contains error log files if the Task Mining configuration settings could not be loaded. |

[### Required registry keys](#UUID-8d50dc56-6eb5-f300-9669-61b5835ccb9c_section-idm235120830989976_body)

Filter

- Registry key
- Access type
- Description

| Registry key | Access type | Description |
| --- | --- | --- |
| `HKCU\<Software>\Celonis\TaskMining\installed` | Write access during installation. | Registers installation of the Task Mining Client software. |
| `HKLM\<Software>\Celonis\TaskMining\activation_link_url` | Read access during runtime.  Write access during installation. | Link that automatically activates the Task Mining Client software the first time the Task Mining Client software is started. |
| `HKLM\<Software>\Celonis\TaskMining\client_certificate_subject` | Read access during runtime.  Write access during installation. | Client certificate subject used for the authentication of any secure gateway. |
| `HKLM\<Software>\Celonis\TaskMining\client_working_directory` | Read access during runtime.  Write access during installation. | Task Mining Client software working directory. |
| `HKLM\<Software>\Celonis\TaskMining\connection_timeout` | Read access during runtime.  Write access during installation. | Custom HTTP call connection timeout used for the Task Mining Gateway.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). |
| `HKLM\<Software>\Celonis\TaskMining\custom_extension_ids` | Read access during runtime.  Write access during installation. | Custom browser extension IDs used when installing self-hosted browser extensions. For more information, see [Installing self-hosted browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)"). |
| `HKLM\<Software>\Celonis\TaskMining\secure_gateway_server` | Read access during runtime.  Write access during installation. | Host URLs of the secure gateway server. |
| `HKLM\<Software>\Celonis\TaskMining\service_principal_name`  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | Read access during runtime.  Write access during installation. | Service principal names used for the on-premise Task Mining Gateway. |
| `HKMU\<Software>\Celonis\TaskMining\extension_socket_port` | Read access during runtime.  Write access during installation. | Custom port for browser extensions. |
| `HKMU\<Software>\Google\Chrome\Extensions\ndfcgjlpabkombgfpckhglibdhnipbfl\update_url` | Write access during installation. | Updates the URL of the Google Chrome browser extension. |
| `HKMU\<Software>\Microsoft\Edge\Extensions\ndfcgjlpabkombgfpckhglibdhnipbfl\update_url` | Write access during installation. | Updates the URL of the Microsoft Edge browser extension. |
| `HKMU\<Software>\Microsoft\Windows\CurrentVersion\Run\CelonisTaskMining` | Write access during installation. | Autostarts the Task Mining Client software once the user has logged into their machine. |
| `HKMU\<Software>\Classes\CelonisTaskMining\(Default)` | Write access during installation. | Registers the Task Mining-specific URL. |
| `HKMU\<Software>\Classes\CelonisTaskMining\shell\open\command\(Default)` | Write access during installation. | Registers the shell command to open the Task Mining Client software from the Task Mining-specific URL. |
| `HKMU\<Software>\Classes\CelonisTaskMining\URL Protocol` | Write access during installation. | Enables browsers to open the Task Mining Client software from the Task Mining-specific URL. |

| Registry key | Access type | Description |
| --- | --- | --- |
| `HKCU\<Software>\Celonis\TaskMining\installed` | Write access during installation. | Registers installation of the Task Mining Client software. |
| `HKLM\<Software>\Celonis\TaskMining\activation_link_url` | Read access during runtime.  Write access during installation. | Link that automatically activates the Task Mining Client software the first time the Task Mining Client software is started. |
| `HKLM\<Software>\Celonis\TaskMining\client_certificate_subject` | Read access during runtime.  Write access during installation. | Client certificate subject used for the authentication of any secure gateway. |
| `HKLM\<Software>\Celonis\TaskMining\client_working_directory` | Read access during runtime.  Write access during installation. | Task Mining Client software working directory. |
| `HKLM\<Software>\Celonis\TaskMining\connection_timeout` | Read access during runtime.  Write access during installation. | Custom HTTP call connection timeout used for the Task Mining Gateway.  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). |
| `HKLM\<Software>\Celonis\TaskMining\custom_extension_ids` | Read access during runtime.  Write access during installation. | Custom browser extension IDs used when installing self-hosted browser extensions. For more information, see [Installing self-hosted browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)"). |
| `HKLM\<Software>\Celonis\TaskMining\secure_gateway_server` | Read access during runtime.  Write access during installation. | Host URLs of the secure gateway server. |
| `HKLM\<Software>\Celonis\TaskMining\service_principal_name`  **Important**  Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support"). | Read access during runtime.  Write access during installation. | Service principal names used for the on-premise Task Mining Gateway. |
| `HKMU\<Software>\Celonis\TaskMining\extension_socket_port` | Read access during runtime.  Write access during installation. | Custom port for browser extensions. |
| `HKMU\<Software>\Google\Chrome\Extensions\ndfcgjlpabkombgfpckhglibdhnipbfl\update_url` | Write access during installation. | Updates the URL of the Google Chrome browser extension. |
| `HKMU\<Software>\Microsoft\Edge\Extensions\ndfcgjlpabkombgfpckhglibdhnipbfl\update_url` | Write access during installation. | Updates the URL of the Microsoft Edge browser extension. |
| `HKMU\<Software>\Microsoft\Windows\CurrentVersion\Run\CelonisTaskMining` | Write access during installation. | Autostarts the Task Mining Client software once the user has logged into their machine. |
| `HKMU\<Software>\Classes\CelonisTaskMining\(Default)` | Write access during installation. | Registers the Task Mining-specific URL. |
| `HKMU\<Software>\Classes\CelonisTaskMining\shell\open\command\(Default)` | Write access during installation. | Registers the shell command to open the Task Mining Client software from the Task Mining-specific URL. |
| `HKMU\<Software>\Classes\CelonisTaskMining\URL Protocol` | Write access during installation. | Enables browsers to open the Task Mining Client software from the Task Mining-specific URL. |

**Important**

For `KMU`, when the client is installed for all users of the machine (admin), the key will be under `HKLM`. When installed for the current user only, the key will be under HKCU.

For `<SOFTWARE>`: On 32-bit Windows systems, replace with Software. On 64-bit Windows systems, replace with `Software\Wow6432Node`. If the registry key for autostart is not writeable, the application will not autostart at system start.

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Installing Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)")
- [Installing the Task Mining Client software](installing-the-task-mining-client-software.html "Installing the Task Mining Client software")

[## Installing the Task Mining Gateway](#UUID-46f21b6c-7a3c-2e8e-d14b-1748e6157335_body)

**Important**

Use of the Task Mining Gateway is currently limited to specific customers who use a hybrid environment. For more information, contact [Support](support.html "Contacting Support").

The Task Mining Gateway is an on-premise secure gateway and data integration service for Task Mining. It provides secure authentication of the Task Mining Client software using Kerberos and saves theTask Mining data to a local MSSQL database.

[### Before you begin](#id827566_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Admin role in Celonis Platform

[### Task Mining Gateway releases](#UUID-46f21b6c-7a3c-2e8e-d14b-1748e6157335_section-id235136082099115_body)

Filter

- Version
- File
- Release date
- Release note
- Support ends

| Version | File | Release date | Release note | Support ends |
| --- | --- | --- | --- | --- |
| 2.5.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.5.1/task-mining-gateway.jar)  (150 MB) | 2026-04-28 | **Fixes**  - Fixed a security issue related to the Task Mining Gateway authentication. - Enhanced security by preventing the use of client-provided file names. | May 2027 |
| 2.5.0 | [task-mining.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.5.0/task-mining-gateway.jar)  (137 MB) | 2026-02-23 | **Improvement**  Remote suspension of Task Mining data capture added. | March 2027 |
| 2.4.1 | [task-mining.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.4.1/task-mining-gateway.jar)  (134 MB) | 2025-11-21 | **Improvements**  - Increased resilience for unexpectedly-high volumes of configuration requests. - Additional configuration properties allow cloud request types to be disabled individually. | September 2026 |
| 2.4.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.4.0/task-mining-gateway.jar)  (134 MB) | 2025-07-31 | **Improvements**  - Supports Task Mining Client software with version 2.20 and higher. - Reporting to the cloud of users who have never activated a client on a Task Mining Gateway instance. | September 2026 |
| 2.3.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.3.1/task-mining-gateway.jar)  (134 MB) | 2025-04-30 | **Improvements**  **Cloud integration** Cloud integration can now be disabled using a configuration property. See section 7.5 Disable cloud integration of the Installation Guide.  **Fix**  Fixed issue that could lead to performance issues and increased latencies when used with several thousand concurrent clients. | March 2026 |
| 2.3.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.3.0/task-mining-gateway.jar)  (134 MB) | 2025-04-02 | **Improvements**  **Clients Dashboard**: The gateway can now forward Client status information to a specified Task Mining project within the Celonis Platform. This enhancement enables a dashboard showing connected Task Mining Client software, providing visibility into key information, such as status and version. For example, this information can then be visualized in Studio, enhancing visibility for large-scale deployments. | March 2026 |
| 2.2.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.2.0/task-mining-gateway.jar)  (129 MB) | 2025-02-07 | **Improvements**  - **Parquet File Data Encryption at Rest:** Parquet files that are uploaded by Task Mining Clients are encrypted and stored on the disk. - **Compression of log files and configurable rotation:** Log files can now be stored in a compressed format and have configurable rotation options - max size per log files and their retention time.  **Fix**  Missing timeouts for the LDAP communication now have default values but can also be configured. This fix prevents the gateway from waiting indefinitely if the LDAP connection fails to respond. Instead, it will time out, log an error message, and continue operating to prevent any service disruption. | September 2025 |
| 2.1.3 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.3/task-mining-gateway.jar)  (129 MB) | 2023-02-28 | **Fix**  Fixed issue with writing timestamps into MSSQL database. | September 2025 |
| 2.1.2 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.2/task-mining-gateway.jar)  (129 MB) | 2023-02-23 | **Fix**  Fixed issue where database connections were not properly closed. | September 2025 |
| 2.1.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.1/task-mining-gateway.jar) (129 MB) | 2024-02-19 | **Improvement**  Updated dependencies to fix known vulnerabilities. | September 2025 |
| 2.1.0 | Download the [task-mining-gateway](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.0/task-mining-gateway.jar) (jar, 129 MB) | 2024-01-31 | **Features**  - Added feature to clean up temporary files of the Task Mining Gateway during shutdown. - Added support for Task Mining v2 APIs to be compatible with future Task Mining Client versions. - Added endpoint to get a list of projects a user is allowed to join, to support future switching of Task Mining Gateway environments and projects.  **Improvements**  - Improved data processing performance of the Task Mining Gateway. - Improved logging of the Task Mining Gateway. - Added `client_id` to `parquet_file` Postgres table for additional information during debugging. - Changed logic so parquet files are stored on a per-project basis in the data folder on the client machine.  **Fixes**  Fixed issue where yhr Task Mining Gateway could not process parquet files with different schemas. | September 2025 |
| 2.0.0 | Download the [task-mining-gateway](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.0.0/task-mining-gateway.jar) (jar, 123 MB) | 2023-08-31 | **Feature**  Added possibility of inserting collected Task Mining event data directly into an MSSQL database without relying on Hybrid Data Integration service.  **Improvement**  Added retry mechanism for parquet files that were not successfully inserted into the database. | September 2024 |

| Version | File | Release date | Release note | Support ends |
| --- | --- | --- | --- | --- |
| 2.5.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.5.1/task-mining-gateway.jar)  (150 MB) | 2026-04-28 | **Fixes**  - Fixed a security issue related to the Task Mining Gateway authentication. - Enhanced security by preventing the use of client-provided file names. | May 2027 |
| 2.5.0 | [task-mining.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.5.0/task-mining-gateway.jar)  (137 MB) | 2026-02-23 | **Improvement**  Remote suspension of Task Mining data capture added. | March 2027 |
| 2.4.1 | [task-mining.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.4.1/task-mining-gateway.jar)  (134 MB) | 2025-11-21 | **Improvements**  - Increased resilience for unexpectedly-high volumes of configuration requests. - Additional configuration properties allow cloud request types to be disabled individually. | September 2026 |
| 2.4.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.4.0/task-mining-gateway.jar)  (134 MB) | 2025-07-31 | **Improvements**  - Supports Task Mining Client software with version 2.20 and higher. - Reporting to the cloud of users who have never activated a client on a Task Mining Gateway instance. | September 2026 |
| 2.3.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.3.1/task-mining-gateway.jar)  (134 MB) | 2025-04-30 | **Improvements**  **Cloud integration** Cloud integration can now be disabled using a configuration property. See section 7.5 Disable cloud integration of the Installation Guide.  **Fix**  Fixed issue that could lead to performance issues and increased latencies when used with several thousand concurrent clients. | March 2026 |
| 2.3.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.3.0/task-mining-gateway.jar)  (134 MB) | 2025-04-02 | **Improvements**  **Clients Dashboard**: The gateway can now forward Client status information to a specified Task Mining project within the Celonis Platform. This enhancement enables a dashboard showing connected Task Mining Client software, providing visibility into key information, such as status and version. For example, this information can then be visualized in Studio, enhancing visibility for large-scale deployments. | March 2026 |
| 2.2.0 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.2.0/task-mining-gateway.jar)  (129 MB) | 2025-02-07 | **Improvements**  - **Parquet File Data Encryption at Rest:** Parquet files that are uploaded by Task Mining Clients are encrypted and stored on the disk. - **Compression of log files and configurable rotation:** Log files can now be stored in a compressed format and have configurable rotation options - max size per log files and their retention time.  **Fix**  Missing timeouts for the LDAP communication now have default values but can also be configured. This fix prevents the gateway from waiting indefinitely if the LDAP connection fails to respond. Instead, it will time out, log an error message, and continue operating to prevent any service disruption. | September 2025 |
| 2.1.3 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.3/task-mining-gateway.jar)  (129 MB) | 2023-02-28 | **Fix**  Fixed issue with writing timestamps into MSSQL database. | September 2025 |
| 2.1.2 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.2/task-mining-gateway.jar)  (129 MB) | 2023-02-23 | **Fix**  Fixed issue where database connections were not properly closed. | September 2025 |
| 2.1.1 | [task-mining-gateway.jar](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.1/task-mining-gateway.jar) (129 MB) | 2024-02-19 | **Improvement**  Updated dependencies to fix known vulnerabilities. | September 2025 |
| 2.1.0 | Download the [task-mining-gateway](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.1.0/task-mining-gateway.jar) (jar, 129 MB) | 2024-01-31 | **Features**  - Added feature to clean up temporary files of the Task Mining Gateway during shutdown. - Added support for Task Mining v2 APIs to be compatible with future Task Mining Client versions. - Added endpoint to get a list of projects a user is allowed to join, to support future switching of Task Mining Gateway environments and projects.  **Improvements**  - Improved data processing performance of the Task Mining Gateway. - Improved logging of the Task Mining Gateway. - Added `client_id` to `parquet_file` Postgres table for additional information during debugging. - Changed logic so parquet files are stored on a per-project basis in the data folder on the client machine.  **Fixes**  Fixed issue where yhr Task Mining Gateway could not process parquet files with different schemas. | September 2025 |
| 2.0.0 | Download the [task-mining-gateway](https://static.celonis.cloud/static/task-mining/task-mining-gateway/v2.0.0/task-mining-gateway.jar) (jar, 123 MB) | 2023-08-31 | **Feature**  Added possibility of inserting collected Task Mining event data directly into an MSSQL database without relying on Hybrid Data Integration service.  **Improvement**  Added retry mechanism for parquet files that were not successfully inserted into the database. | September 2024 |

[### Limited releases](#UUID-46f21b6c-7a3c-2e8e-d14b-1748e6157335_section-idm4598065787593634180800951292_body)

**Note**

The versions referenced in the table below are not official public releases and will not apply to most customers.

Filter

- Version
- File
- Release date
- Release notes
- Support ends

| Version | File | Release date | Release notes | Support ends |
| --- | --- | --- | --- | --- |
| 2.16.1 | [Task Mining Client.msi](https://static.celonis.cloud/static/task-mining/task-mining-client/v2.16.1/CelonisTaskMining.Installer.msi)  (4.3 MB)  [Task Mining Configuration Editor.msi](https://static.celonis.cloud/static/task-mining/task-mining-configuration-editor/v2.16.1/CelonisTaskMining.Configuration.Installer.msi) (4.2 MB) | 2024-03-04 | - Secure gateway selection is now stored in the *User.config* file.  - Fixed bug were attributes were hashed despite hashing being disabled for all attributes. | March 2025 |
| 2.16.0 | [Task Mining Client.msi](https://static.celonis.cloud/static/task-mining/task-mining-client/v2.16.1/CelonisTaskMining.Installer.msi) (4.3 MB)  [Task Mining Configuration Editor.msi](https://static.celonis.cloud/static/task-mining/task-mining-configuration-editor/v2.16.0/CelonisTaskMining.Configuration.Installer.msi) (4.2 MB) | 2024-02-20 | Added support for switching between projects on multiple secure gateways. | March 2025 |

| Version | File | Release date | Release notes | Support ends |
| --- | --- | --- | --- | --- |
| 2.16.1 | [Task Mining Client.msi](https://static.celonis.cloud/static/task-mining/task-mining-client/v2.16.1/CelonisTaskMining.Installer.msi)  (4.3 MB)  [Task Mining Configuration Editor.msi](https://static.celonis.cloud/static/task-mining/task-mining-configuration-editor/v2.16.1/CelonisTaskMining.Configuration.Installer.msi) (4.2 MB) | 2024-03-04 | - Secure gateway selection is now stored in the *User.config* file.  - Fixed bug were attributes were hashed despite hashing being disabled for all attributes. | March 2025 |
| 2.16.0 | [Task Mining Client.msi](https://static.celonis.cloud/static/task-mining/task-mining-client/v2.16.1/CelonisTaskMining.Installer.msi) (4.3 MB)  [Task Mining Configuration Editor.msi](https://static.celonis.cloud/static/task-mining/task-mining-configuration-editor/v2.16.0/CelonisTaskMining.Configuration.Installer.msi) (4.2 MB) | 2024-02-20 | Added support for switching between projects on multiple secure gateways. | March 2025 |


---

## task-mining/labeling-task-mining-events

# Labeling Task Mining events

In Task Mining, adding labels as identifiers helps you organize and contextualize captured Task Mining events. There are two types of Labels:

- Default Labels which are predefined for standard applications and are automatically applied to applications, screens and documents.
- Custom Labels which you create and apply depending on how you want to organize your data.

Label rules apply Labels to event attributes. If an event attribute doesn’t have a default Label, it will display in your Task Mining data without a Label unless a rule applies a custom Label to it.

**Note**

When you create a Label, it is applied to new data only. However, if you re-process all the existing data, the Label will be applied to all data. For more information, see [Task Mining data processing](task-mining-data-processing-and-scheduling.html "Task Mining data processing and scheduling").

Expand all

[## Before you begin](#id831714_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Admin or Analyst role
- If you're using the [SAP integration](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043050765823 "SAP integration (from 2.6.0)"), check that your configuration file has the correct settings enabled for you to use Task Mining with SAP Logon.

[## Creating Custom Labels](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233122147821_body)

1. In the Celonis Platform Navigation bar, select **Data** >**Task Mining**.

   All available Task Mining projects open.
2. Open the project you want to create a custom label for.
3. In the Home page of your Task Mining project, select Labels .

   The **Labels** screen appears. Any custom labels that have already been created for your Task Mining project display here.
4. Select **Create Label**.

   The **Create Label** screen appears.
5. Complete the [Label fields](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233261000732 "Custom Label fields").

   **Tip**

   Select **Go to raw data** to view the events you might want to label.
6. In **Data Preview**, select **Preview** to see the raw events that will be labeled,

   **Note**

   If your data set is large, the Data Preview may not display. This is because Data Preview only looks at a limited amount of data (approximately 100, 000 events).
7. Select **Save**.

   The **Labels** screen opens and displays the Label rule that is used to apply your custom Label.
8. Repeat steps **4** to **7** for each custom label you want to create

### Custom Label fields

Filter

- Section
- Field
- Description

| Section | Field | Description |
| --- | --- | --- |
| Label | `Type` | Defines whether the Label will be applied to an Application or a Screen. |
| Label | `Value` | The name of the Label. This should be user-friendly and easily identifiable. |
| Apply label to these events | -- | Defines the custom rule that specifies when the Label should be applied.  For example, you could create a custom rule like `URL contains Google` for a screen or `Process Name equals Exce`l for an application. |

| Section | Field | Description |
| --- | --- | --- |
| Label | `Type` | Defines whether the Label will be applied to an Application or a Screen. |
| Label | `Value` | The name of the Label. This should be user-friendly and easily identifiable. |
| Apply label to these events | -- | Defines the custom rule that specifies when the Label should be applied.  For example, you could create a custom rule like `URL contains Google` for a screen or `Process Name equals Exce`l for an application. |

[## Editing and deleting custom Labels](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233264604661_body)

1. In the Celonis Navigation bar, select **Data** > **Task Mining**.

   All available Task Mining projects open.
2. Open the Task Mining project you want to edit or delete a custom Label for.
3. In the Home page of your Task Mining project, select **Labels**.

   The **Labels** screen appears. Any custom Labels that have already been created for your Task Mining project display here.
4. Select the three dots next to the custom Label.
5. Select

   - **Edit** and make any changes required before selecting **Save**; or
   - **Delete** and confirm deletion when prompted.

[## Task Mining label terminology](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233076645087_body)

Filter

- Term
- Description
- Additional information

| Term | Description | Additional information |
| --- | --- | --- |
| Default Label | Predefined label that uses a standard naming convention and is applied to event attributes for specific standard applications, screens and documents.  Default Labels can be overridden by custom Labels.  For more information about the standard applications that default labels are applied to, see [Default labels for standard applications](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233100825189 "Default Labels for standard applications"). | If [event processing rules](event-processing-rules.html "Event processing rules") exclude certain events or applications, Default Labels will not be applied to excluded events and applications. |
| Custom Label | User-defined label that is assigned to Task Mining event attributes.  Can be used to override default Labels and be assigned to event attributes that don’t have a default Label. For more information, see [Creating custom labels](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233122147821 "Creating Custom Labels").  **Important**  Labels are not backwards compatible and cannot be applied to existing Task Mining projects. | Ensure custom Labels have unique, meaningful names that reflect the official full vendor name. Where software is available in both standalone and browser versions, both versions should have the same custom Label name. |
| Label rule | Contains specific conditions that determine how and when a Label is applied during processing. | For default Labels, we’ve set up the label rules for you.  For custom Labels, you define your own rules. For more information, see [Creating custom labels](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233122147821 "Creating Custom Labels"). |
| Attribute source | Where the label information originates from. | The attribute source can be:  - Automatically-generated (Label). - Based on attributes from events captured by the Task Mining Client software (Raw). - Automatically created during processing (Computed).  **Note**  Only attribute sources of type Label can be customized. For more information, see [Task Mining attributes and label sources](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233086488042 "Task Mining labeling and attribute sources"). |

| Term | Description | Additional information |
| --- | --- | --- |
| Default Label | Predefined label that uses a standard naming convention and is applied to event attributes for specific standard applications, screens and documents.  Default Labels can be overridden by custom Labels.  For more information about the standard applications that default labels are applied to, see [Default labels for standard applications](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233100825189 "Default Labels for standard applications"). | If [event processing rules](event-processing-rules.html "Event processing rules") exclude certain events or applications, Default Labels will not be applied to excluded events and applications. |
| Custom Label | User-defined label that is assigned to Task Mining event attributes.  Can be used to override default Labels and be assigned to event attributes that don’t have a default Label. For more information, see [Creating custom labels](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233122147821 "Creating Custom Labels").  **Important**  Labels are not backwards compatible and cannot be applied to existing Task Mining projects. | Ensure custom Labels have unique, meaningful names that reflect the official full vendor name. Where software is available in both standalone and browser versions, both versions should have the same custom Label name. |
| Label rule | Contains specific conditions that determine how and when a Label is applied during processing. | For default Labels, we’ve set up the label rules for you.  For custom Labels, you define your own rules. For more information, see [Creating custom labels](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233122147821 "Creating Custom Labels"). |
| Attribute source | Where the label information originates from. | The attribute source can be:  - Automatically-generated (Label). - Based on attributes from events captured by the Task Mining Client software (Raw). - Automatically created during processing (Computed).  **Note**  Only attribute sources of type Label can be customized. For more information, see [Task Mining attributes and label sources](labeling-task-mining-events.html#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233086488042 "Task Mining labeling and attribute sources"). |

[## Task Mining labeling and attribute sources](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233086488042_body)

**Important**

This table contains all the attributes that can be used as sources when labels are created, meaning they can be selected for conditions in label rules. For a full list of Task Mining attributes, see the [Task Mining attribute reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286 "Task Mining attribute reference").

Filter

- Attribute
- Attribute source
- Description
- Furcther information

| Attribute | Attribute source | Description | Furcther information |
| --- | --- | --- | --- |
| `Application` | Label | User-friendly name of the software application or website where the event occurred.  By default uses the:  - Windows process name for Windows applications. - Domain name for websites. | For example, the standard Adobe Acrobat PDF Reader instead of Acrord32. |
| `Document` | Label | Document name in applications that is predefined for standard applications and can be defined for other document types. | Users can group similar documents together using a Label. For example, you could create a Label called `Order Report Documents` and use this for all Excel documents named `Order_Report_{date}`. |
| `Screen` | Label | Screen name within an application. This is most useful for standard applications with many screens where screens have default Labels.  If the application is focused on documents, for example in Excel, screens are not labeled as most time is spent on the main view which is the document.  Grouping events using the `Screen` Label simplifies analysis by clarifying which screens most time is spent on and what is happening in those screens. | If a Label is defined for `Document` but not `Screen` Screen, setting `Screen` to the same value as `Document` is helpful for standard applications like Microsoft Word and Excel.  Using easy-to-understand screen names also helps when analyzing Task Mining data.  For example, the Workday screen is defined by URLs like .workday.com/create-invoice/. so you could use a screen name of `Create invoice in Workday`. |
| `ActiveWindow` | Raw | Window name displayed at the top of every window and is generally the name of the application or website or further details.  Taken from the window related to the user interaction event. | Configured in [client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings") and set by default to pseudonymize the Windows username. |
| `ClipboardContent` | Raw | Textual content stored in the Windows clipboard. |  |
| `ClipboardContentId` | Raw | Unique identifier assigned each time the clipboard content changes (EventType = 'Clipboard changed'). Used to count clipboard copy operations and to create a PQL domain table for tracking clipboard copy and paste actions in Studio. | Set to the event ID at the time of the change.All subsequent events within the same recording session share the same `ClipboardContentId` until the clipboard content changes again and a new `ClipboardContentId` is assigned. |
| `CustomX` | Raw | Optional custom user attribute, like geographic region, that can be defined in the configuration file and applied by users. | For more information, see [user attributes](user-attributes--from-2-8-1-.html "User attributes (from 2.8.1)"). |
| `DomainName` | Computed | Domain part of a URL where the raw event has a URL attribute.If the raw event has a URL attribute, the `DomainName` is the domain part of the URL. | For example, for URL https://www.google.com/search?q=test, the `DomainName` is www.google.com. |
| `EventDescription` | Computed | Human-readable event description created by concatenating a number of attributes. | For example, in Gmail, this could be a left click on **Send**. |
| `EventType` | Raw | Event type:  - Created by an action performed by a user like **Left Click** or **Copy Paste**. - Automatically generated by the Task Mining Client software for system events like `Task Mining Started` or `Session Connected`. | For more information, see the [Event reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-3ae2dc76-9a48-4041-ef57-94dfec6225a2 "Task Mining event reference"). |
| `KeyboardCommand` | Raw | Command key or key combination. |  |
| `MousePositionX` | Raw | Visualizes the X-coordinate of the mouse pointer’s position in a screenshot. | A negative value indicates that the mouse pointer is outside of the screenshot. |
| `MousePositionY` | Raw | Visualizes the Y-coordinate of the mouse pointer’s position in a screenshot. | A negative value indicates that the mouse pointer is outside of the screenshot. |
| `ProcessName` | Raw | Name of the application’s Windows OS process that was active when the user interacted with their machine. | Typically this is the ‘technical application name’, such as ‘saplogon’. |
| `ScreenshotId` | Raw | File name of the screenshot related to the event, if screenshots have been captured (optional). |  |
| `SessionId` | Raw | Unique ID of the Task Mining session where a session is the period of time from starting to stopping Task Mining. | Starting and pausing can be done by the user via the start/stop buttons or automatically depending on settings. |
| `SystemUser` | Raw | Windows user name of the active user who interacted with the computer. | Pseudonymized by default. For more information, see [client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |
| `TimeDelta` | Computed | Amount of time the user ‘spent’ on an event, calculated in seconds based on the timestamp of the next event minus the timestamp of the current event. |  |
| `TimestampLocal` | Raw | When the event was detected in local time. |  |
| `TimestampUTC` | Raw | When the event was detected in UTC. |  |
| `Url` | Raw | URL of the website that is currently opened in the tab that triggered the even | Availability depends on the application used. For more information, see [Browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). |
| `UserId` | Raw | Hashed Windows user name of the active user. | The value is hashed using SHA256. |

| Attribute | Attribute source | Description | Furcther information |
| --- | --- | --- | --- |
| `Application` | Label | User-friendly name of the software application or website where the event occurred.  By default uses the:  - Windows process name for Windows applications. - Domain name for websites. | For example, the standard Adobe Acrobat PDF Reader instead of Acrord32. |
| `Document` | Label | Document name in applications that is predefined for standard applications and can be defined for other document types. | Users can group similar documents together using a Label. For example, you could create a Label called `Order Report Documents` and use this for all Excel documents named `Order_Report_{date}`. |
| `Screen` | Label | Screen name within an application. This is most useful for standard applications with many screens where screens have default Labels.  If the application is focused on documents, for example in Excel, screens are not labeled as most time is spent on the main view which is the document.  Grouping events using the `Screen` Label simplifies analysis by clarifying which screens most time is spent on and what is happening in those screens. | If a Label is defined for `Document` but not `Screen` Screen, setting `Screen` to the same value as `Document` is helpful for standard applications like Microsoft Word and Excel.  Using easy-to-understand screen names also helps when analyzing Task Mining data.  For example, the Workday screen is defined by URLs like .workday.com/create-invoice/. so you could use a screen name of `Create invoice in Workday`. |
| `ActiveWindow` | Raw | Window name displayed at the top of every window and is generally the name of the application or website or further details.  Taken from the window related to the user interaction event. | Configured in [client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings") and set by default to pseudonymize the Windows username. |
| `ClipboardContent` | Raw | Textual content stored in the Windows clipboard. |  |
| `ClipboardContentId` | Raw | Unique identifier assigned each time the clipboard content changes (EventType = 'Clipboard changed'). Used to count clipboard copy operations and to create a PQL domain table for tracking clipboard copy and paste actions in Studio. | Set to the event ID at the time of the change.All subsequent events within the same recording session share the same `ClipboardContentId` until the clipboard content changes again and a new `ClipboardContentId` is assigned. |
| `CustomX` | Raw | Optional custom user attribute, like geographic region, that can be defined in the configuration file and applied by users. | For more information, see [user attributes](user-attributes--from-2-8-1-.html "User attributes (from 2.8.1)"). |
| `DomainName` | Computed | Domain part of a URL where the raw event has a URL attribute.If the raw event has a URL attribute, the `DomainName` is the domain part of the URL. | For example, for URL https://www.google.com/search?q=test, the `DomainName` is www.google.com. |
| `EventDescription` | Computed | Human-readable event description created by concatenating a number of attributes. | For example, in Gmail, this could be a left click on **Send**. |
| `EventType` | Raw | Event type:  - Created by an action performed by a user like **Left Click** or **Copy Paste**. - Automatically generated by the Task Mining Client software for system events like `Task Mining Started` or `Session Connected`. | For more information, see the [Event reference](task-mining-data-reference.html#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-3ae2dc76-9a48-4041-ef57-94dfec6225a2 "Task Mining event reference"). |
| `KeyboardCommand` | Raw | Command key or key combination. |  |
| `MousePositionX` | Raw | Visualizes the X-coordinate of the mouse pointer’s position in a screenshot. | A negative value indicates that the mouse pointer is outside of the screenshot. |
| `MousePositionY` | Raw | Visualizes the Y-coordinate of the mouse pointer’s position in a screenshot. | A negative value indicates that the mouse pointer is outside of the screenshot. |
| `ProcessName` | Raw | Name of the application’s Windows OS process that was active when the user interacted with their machine. | Typically this is the ‘technical application name’, such as ‘saplogon’. |
| `ScreenshotId` | Raw | File name of the screenshot related to the event, if screenshots have been captured (optional). |  |
| `SessionId` | Raw | Unique ID of the Task Mining session where a session is the period of time from starting to stopping Task Mining. | Starting and pausing can be done by the user via the start/stop buttons or automatically depending on settings. |
| `SystemUser` | Raw | Windows user name of the active user who interacted with the computer. | Pseudonymized by default. For more information, see [client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |
| `TimeDelta` | Computed | Amount of time the user ‘spent’ on an event, calculated in seconds based on the timestamp of the next event minus the timestamp of the current event. |  |
| `TimestampLocal` | Raw | When the event was detected in local time. |  |
| `TimestampUTC` | Raw | When the event was detected in UTC. |  |
| `Url` | Raw | URL of the website that is currently opened in the tab that triggered the even | Availability depends on the application used. For more information, see [Browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). |
| `UserId` | Raw | Hashed Windows user name of the active user. | The value is hashed using SHA256. |

[## Default Labels for standard applications](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233100825189_body)

[### Task Mining default Labels: Google](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233101399547_body)

Filter

- Application name
- Application URL
- Application Label
- Screen Label
- Document Label

| Application name | Application URL | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- | --- |
| Gmail | mail.google.com | Supported | Supported  Example default Label values are `Write Message`, `Settings`, `Search results`. | Supported |
| Google Calendar | calendar.google.com | Supported | Unavailable | Not applicable |
| Google Slides | slides.google.com/presentation | Supported | Not applicable | Supported |
| Google Meet | meet.google.com | Supported | Supported | Supported  Set to the meeting key. |
| Google Drive | drive.google.com | Supported | Supported  Example default Label values are `My Drive`, `Create new folder`, `Search results`. | Not applicable |
| Google Sheets | docs.google.com/spreadsheets | Supported | Not applicable | Supported |
| Google Keep | keep.google.com | Supported | Not applicable | Unavailable |
| Google Search | google.com/search | Supported for top-level domains | Unavailable | Not applicable |
| Google Maps | maps.google.com | Supported | Unavailable | Unavailable |

| Application name | Application URL | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- | --- |
| Gmail | mail.google.com | Supported | Supported  Example default Label values are `Write Message`, `Settings`, `Search results`. | Supported |
| Google Calendar | calendar.google.com | Supported | Unavailable | Not applicable |
| Google Slides | slides.google.com/presentation | Supported | Not applicable | Supported |
| Google Meet | meet.google.com | Supported | Supported | Supported  Set to the meeting key. |
| Google Drive | drive.google.com | Supported | Supported  Example default Label values are `My Drive`, `Create new folder`, `Search results`. | Not applicable |
| Google Sheets | docs.google.com/spreadsheets | Supported | Not applicable | Supported |
| Google Keep | keep.google.com | Supported | Not applicable | Unavailable |
| Google Search | google.com/search | Supported for top-level domains | Unavailable | Not applicable |
| Google Maps | maps.google.com | Supported | Unavailable | Unavailable |

[### Task Mining default Labels: Microsoft Office](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233112543983_body)

Filter

- Application Name
- Application Label
- Screen Label
- Document Label

| Application Name | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- |
| Microsoft Teams | Supported | Supported | Not applicable. |
| Microsoft Word | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft Excel | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft PowerPoint | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft Outlook | Supported | Supported | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft OneNote | Supported | Unavailable | Unavailable |
| Microsoft OneDrive | Not applicable. | Not applicable. | Not applicable. |

| Application Name | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- |
| Microsoft Teams | Supported | Supported | Not applicable. |
| Microsoft Word | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft Excel | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft PowerPoint | Supported | Not applicable. | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft Outlook | Supported | Supported | Supported  Name may sometimes contain non-document items such as Open when file open is active. |
| Microsoft OneNote | Supported | Unavailable | Unavailable |
| Microsoft OneDrive | Not applicable. | Not applicable. | Not applicable. |

[### Task Mining default labels: SAP Logon (SAP GUI for Microsoft Windows)](#UUID-2d4617e5-81fb-e762-a2f2-c65716006ba5_section-id235233119413038_body)

Filter

- Application name
- Application Label
- Screen Label
- Document Label

| Application name | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- |
| SAP Logon | Supported | Supported | Supported |

| Application name | Application Label | Screen Label | Document Label |
| --- | --- | --- | --- |
| SAP Logon | Supported | Supported | Supported |

**Important**

For SAP Logon, you must ensure some specific settings are enabled in the configuration file for your Task Mining project. For more information, see [SAP integration](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043050765823 "SAP integration (from 2.6.0)").

## Related topics

- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")
- [Configuring Task Mining data](configuring-task-mining-data.html "Configuring Task Mining data")
- [Configuring the Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app")


---

## task-mining/task-mining

# Task Mining

**Important**

Task Mining is a premium Celonis Platform product and is subject to an additional licensing fee. For more information, contact your Celonis account team.

Task Mining is the process of capturing and analyzing how users interact with software applications and web pages. The Task Mining Client software runs on user machines and captures user interactions with software applications and websites at a very granular level.

Analyzing the captured Task Mining data lets you understand how specific tasks are performed, which applications and websites employees use when working and helps you identify process inefficiencies and automation opportunities.

Click for sound

3:19

●●●●●●●

Introduction to Desktop Data

Understanding Task Mining

Process Mining vs. Task Mining

Benefits of Task Mining

Use Cases for Task Mining

Implementing Task Mining

Data-Driven Decision Making

For more information, see our free course on [Task Mining basics](https://academy.celonis.com/courses/task-mining-basics).

Expand all

[## Using Task Mining within the Celonis Platform](#UUID-2550399b-97c1-4dd1-d5b6-bb5fec39d052_section-id235226006157318_body)

While Process Mining extracts business data from transactional systems, Task Mining generates detailed data from user actions. Analyzing this data gives you a clear picture of the actions users actually take when they perform their day-to-day tasks.

 Using Task Mining in conjunction with other Celonis Platform functionality gives you the most detailed view possible of your processes and how users interact with them.

You could, for example, create a BPMN model of your process using Celonis Process Management before analyzing and refining your process with Process Adherence Manager. An Action Flow could in turn be triggered if any issues occur, with Orchestration Engine automatically flagging the issue with a manager.

Adding Task Mining would let you see exactly how users perform the process, down to the text they enter at their keyboards and any websites they visit. The Task Mining data is displayed in the Workforce Productivity app and lets you analyze, for example, how long a specific process takes different employees to perform or how many hours teams spend using different business applications or websites.

By capturing and analyzing Task Mining data, you can make process improvements based on actual user behavior.

[## Capturing data with Task Mining](#UUID-2550399b-97c1-4dd1-d5b6-bb5fec39d052_section-id235226007112836_body)

Task Mining can capture data about user interactions with software applications like Microsoft Office, Google sheets and Adobe Acrobat, as well as (optionally) taking screenshots of user desktops and capturing data from websites. Simple configuration of the Task Mining software also lets you allowlist or denylist specific applications and/or URLs to specify whether Task Mining data is or is not captured.

[## Task Mining data management and privacy](#UUID-2550399b-97c1-4dd1-d5b6-bb5fec39d052_section-id235226007689078_body)

Advanced privacy features ensure only relevant user interaction data is captured, sensitive data is hidden and only approved individuals can view this information. You have full control over which potentially-sensitive data is sent to the Celonis Platform and which data is redacted and pseudonymized before sending. Users must consent to the capture of Task Mining data and can manually turn data capture off at any time.

For more information, see Task Mining data privacy and security.

## Related topics

- [Install the Task Mining software](installing-the-task-mining-software.html "Installing the Task Mining software")
- [Find out about Task Mining projects](working-with-task-mining-projects.html "Working with Task Mining projects")
- [Work with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")
- [Use the Task Mining software](using-the-task-mining-client-software.html "Using the Task Mining Client software")


---

## task-mining/task-mining-configuration-editor-settings

# Task Mining Configuration Editor settings

**Note**

The Task Mining Client software is versioned and the version number is indicated where relevant. For example, functionality marked as FROM 2.1.3, was introduced in version 2.1.3 of the Task Mining Client software and is not available for versions prior to 2.1.3. For more information about Task Mining software releases, see the [Task Mining software installation release notes](installing-the-task-mining-client-software.html#UUID-85329f38-095f-7a42-8391-2faccc268dfa "Task Mining software install file release notes").

The Configuration Editor settings given here are for the latest version of the Configuration Editor. If you're using an older version, the sections and fields may vary slightly but the possible and default values should be the same.

Expand all

[## Configuration Editor Application menu](#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043032559883_body)

Filter

- Menu item
- Menu option
- Description

| Menu item | Menu option | Description |
| --- | --- | --- |
| File | New | Creates a new Task Mining configuration file. |
| File | Open | Opens an existing Task Mining configuration file. |
| File | Save | Saves the Task Mining configuration file that is currently open. |
| File | Save as | Saves the Task Mining configuration file that is currently open under a name and to a location of your choice. |
| File | Quit | Exits Configuration Editor. |
| Tools | Generate SQL 'CREATE TABLE' query | Generates a SQL query from the Task Mining configuration file. The SQL query is copied to the clipboard.  Running this script in a transformation creates the target table in the Celonis Platform. For more information, see [Extracting and transforming data](https://docs.celonis.com/en/extracting-and-transforming-data.html). |
| Tools | Export JSON (base64 encoded) | Generates a Base64 encoded JSON representation of the Task Mining configuration file and copies it to the clipboard. |
| Tools | Import JSON (base64 encoded) | Opens a dialog to import and open a Base64 encoded JSON representation of a Task Mining configuration file. |
| About | -- | Contains information about the Task Mining Configuration Editor version and third-party licensing. |

| Menu item | Menu option | Description |
| --- | --- | --- |
| File | New | Creates a new Task Mining configuration file. |
| File | Open | Opens an existing Task Mining configuration file. |
| File | Save | Saves the Task Mining configuration file that is currently open. |
| File | Save as | Saves the Task Mining configuration file that is currently open under a name and to a location of your choice. |
| File | Quit | Exits Configuration Editor. |
| Tools | Generate SQL 'CREATE TABLE' query | Generates a SQL query from the Task Mining configuration file. The SQL query is copied to the clipboard.  Running this script in a transformation creates the target table in the Celonis Platform. For more information, see [Extracting and transforming data](https://docs.celonis.com/en/extracting-and-transforming-data.html). |
| Tools | Export JSON (base64 encoded) | Generates a Base64 encoded JSON representation of the Task Mining configuration file and copies it to the clipboard. |
| Tools | Import JSON (base64 encoded) | Opens a dialog to import and open a Base64 encoded JSON representation of a Task Mining configuration file. |
| About | -- | Contains information about the Task Mining Configuration Editor version and third-party licensing. |

[## Data Connection settings](#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043035231889_body)

Filter

- Section
- Field
- Description
- Possible values
- Default value

| Section | Field | Description | Possible values | Default value |
| --- | --- | --- | --- | --- |
| IBC Upload | Send Data to IBC | Sets whether captured events are:  - **Enabled:** Pushed to Celonis Platform - **Disabled:** Stored locally (.parquet)  **Note**  Version requirement: FROM 2.0.4 | `Enabled`  `Disabled` | `Enabled`  **Note**  If **IBC Upload** is disabled, the other **IBC Upload** fields are not displayed. |
| IBC Upload | Data Pool ID | Identifier of the Celonis Platform Data Pool where captured Task Mining events are stored. | Usually a UUID with this format:  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |  |
| IBC Upload | IBC Team Subdomain | Celonis Platform team subdomain. | Usually the first part of the Celonis Platform URL, for example:  `<teamname>` |  |
| IBC Upload: Send Data to IBC | Server ID | Celonis Platform realm. | Usually the second part of the Celonis Platform URL for example:  `eu-1` |  |
| IBC Upload: Send Data to IBC | Target Table Name  **Note**  The **Generate SQL Query** button performs the same function as the **Generate SQL 'CREATE TABLE' query** option in **Configuration Editor Application** menu > **Tools**. | Name of the Celonis Platform database table where captured Task Mining events are stored. | -- |  |
| IBC Upload: Send Data to IBC | Image Service Bucket Name | Name of the bucket where Task Mining screenshots are stored.  FROM 1.2.1 | Usually a UUID with this format:  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |  |
| IBC Upload: Send Data to IBC | Update Cloud Period (in Minutes) | Time period (in minutes) during which captured Task Mining events stored in parquet files are sent to the Celonis Platform. | Min value: `1` | `2` |
| Caching | Encrypt Local Data | Sets whether captured Task Mining events temporarily stored on local disk are encrypted.  FROM 2.0.4 | `Enabled` (encrypted)  `Disabled` (not encrypted) | `Disabled` |
| Caching | Path for Transfer File Cache | Directory where temporary parquet files are stored. If a valid directory isn't specified, the parquet files are stored in the user's temp folder (managed by Windows).  **Important**  While UNC paths (e.g. \\server\share) are not supported by default due to security considerations, we can enable them on request if your organization accepts the associated security risk. You can use Windows system variables (like `%HOMEPATH%` or `%USERPROFILE%`) to create a generic configuration file for different users. |  | `%USERPROFILE%\CelonisTaskMining` |
| Caching | Number of Entries Limit | Maximum number of captured Task Mining events that are cached. If the number of cached events exceeds this value, the cached events are written to a parquet file. | Min value: `1` | `100` |
| Caching | Time Limit in Minutes | Time limit for writing cached events into parquet files (in minutes). If the time limit is exceeded, all cached events are written to parquet. | Min value: `1` | `5` |
| Caching | Timeout in seconds | Time limit for uploading data to the Celonis Platform before terminating the Task Mining Client software.  FROM 2.0.4 | Min value: `1` | `5` |
| Caching | Auto Upload Old Cached Files | Sets whether cached files from prevous runs that failed to load are:  - Checked and automatically uploaded (enabled). - Not checked for and not uploaded (disabled).  FROM 2.4.1 | `Enabled`  `Disabled` | `Enabled` |
| Caching | Maximum Cached File Age (optional) | Number of days cached files are retained before deletion.  FROM 2.4.1 | Min value: `1` | `30` |
| Caching | Maximum Cached File Size (optional) | - Maximum size of cached image files (in gigabytes). - Cached image files are deleted if the maximum size is exceeded.  FROM 2.4.1 | Min value: `1` | `25` |
| Compatibility | Use Old Data Push API | Old Data Push API implementation.  **Important**  This is included for backwards compatibility only and will be removed in future releases.  FROM 1.1.1  DEPRECATED AFTER 1.1.1 | `Enabled`  `Disabled` | `Disabled` |
| Compatibility | Use Old Image Upload API | Old Image Upload API.  **Important**  This is included for backwards compatibility only and will be removed in future releases.  FROM 1.2.1  DEPRECATED AFTER 1.2.1 | `Enabled`  `Disabled` | `Disabled` |

| Section | Field | Description | Possible values | Default value |
| --- | --- | --- | --- | --- |
| IBC Upload | Send Data to IBC | Sets whether captured events are:  - **Enabled:** Pushed to Celonis Platform - **Disabled:** Stored locally (.parquet)  **Note**  Version requirement: FROM 2.0.4 | `Enabled`  `Disabled` | `Enabled`  **Note**  If **IBC Upload** is disabled, the other **IBC Upload** fields are not displayed. |
| IBC Upload | Data Pool ID | Identifier of the Celonis Platform Data Pool where captured Task Mining events are stored. | Usually a UUID with this format:  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |  |
| IBC Upload | IBC Team Subdomain | Celonis Platform team subdomain. | Usually the first part of the Celonis Platform URL, for example:  `<teamname>` |  |
| IBC Upload: Send Data to IBC | Server ID | Celonis Platform realm. | Usually the second part of the Celonis Platform URL for example:  `eu-1` |  |
| IBC Upload: Send Data to IBC | Target Table Name  **Note**  The **Generate SQL Query** button performs the same function as the **Generate SQL 'CREATE TABLE' query** option in **Configuration Editor Application** menu > **Tools**. | Name of the Celonis Platform database table where captured Task Mining events are stored. | -- |  |
| IBC Upload: Send Data to IBC | Image Service Bucket Name | Name of the bucket where Task Mining screenshots are stored.  FROM 1.2.1 | Usually a UUID with this format:  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |  |
| IBC Upload: Send Data to IBC | Update Cloud Period (in Minutes) | Time period (in minutes) during which captured Task Mining events stored in parquet files are sent to the Celonis Platform. | Min value: `1` | `2` |
| Caching | Encrypt Local Data | Sets whether captured Task Mining events temporarily stored on local disk are encrypted.  FROM 2.0.4 | `Enabled` (encrypted)  `Disabled` (not encrypted) | `Disabled` |
| Caching | Path for Transfer File Cache | Directory where temporary parquet files are stored. If a valid directory isn't specified, the parquet files are stored in the user's temp folder (managed by Windows).  **Important**  While UNC paths (e.g. \\server\share) are not supported by default due to security considerations, we can enable them on request if your organization accepts the associated security risk. You can use Windows system variables (like `%HOMEPATH%` or `%USERPROFILE%`) to create a generic configuration file for different users. |  | `%USERPROFILE%\CelonisTaskMining` |
| Caching | Number of Entries Limit | Maximum number of captured Task Mining events that are cached. If the number of cached events exceeds this value, the cached events are written to a parquet file. | Min value: `1` | `100` |
| Caching | Time Limit in Minutes | Time limit for writing cached events into parquet files (in minutes). If the time limit is exceeded, all cached events are written to parquet. | Min value: `1` | `5` |
| Caching | Timeout in seconds | Time limit for uploading data to the Celonis Platform before terminating the Task Mining Client software.  FROM 2.0.4 | Min value: `1` | `5` |
| Caching | Auto Upload Old Cached Files | Sets whether cached files from prevous runs that failed to load are:  - Checked and automatically uploaded (enabled). - Not checked for and not uploaded (disabled).  FROM 2.4.1 | `Enabled`  `Disabled` | `Enabled` |
| Caching | Maximum Cached File Age (optional) | Number of days cached files are retained before deletion.  FROM 2.4.1 | Min value: `1` | `30` |
| Caching | Maximum Cached File Size (optional) | - Maximum size of cached image files (in gigabytes). - Cached image files are deleted if the maximum size is exceeded.  FROM 2.4.1 | Min value: `1` | `25` |
| Compatibility | Use Old Data Push API | Old Data Push API implementation.  **Important**  This is included for backwards compatibility only and will be removed in future releases.  FROM 1.1.1  DEPRECATED AFTER 1.1.1 | `Enabled`  `Disabled` | `Disabled` |
| Compatibility | Use Old Image Upload API | Old Image Upload API.  **Important**  This is included for backwards compatibility only and will be removed in future releases.  FROM 1.2.1  DEPRECATED AFTER 1.2.1 | `Enabled`  `Disabled` | `Disabled` |

[## Logging](#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114_body)

Filter

- Section
- Field
- Description
- Possible values
- Default value

| Section | Field | Description | Possible values | Default value |
| --- | --- | --- | --- | --- |
| General | Snippet Split Time | Time period (in seconds) used to split event sequences into snippets. If the elapsed time between two consecutive events exceeds this limit, the later event will be assigned to a new snippet. | Min value: `1` | `20` |
| General | Idle Waiting Time | Time period (in minutes) after which the user is considered absent due to no keyboard or mouse input.  FROM 2.4.1 | Min value: `1` | `10` |
| General | Alive Interval | Time between events that are added periodically to the data uploaded to the Celonis Platform to indicate the Task Mining Client is running (in minutes).  FROM 2.4.1 | Min value: `1` | `15` |
| General | Use Native URL Retrieval | Sets whether URLs are extracted directly from browsers:  - Without additional Chrome and Edge browser extensions (enabled). - With additional Chrome and Edge browser extensions required (disabled).  FROM 2.4.1  **Note**  For more information about Chrome and Edge browser extensions, see [Installing Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). | `Enabled`  `Disabled` | `Enabled` |
| General | Show Live Event Monitor in Client | Sets whether the Live Event Monitor menu item in the Task Mining Client software:  - Displays (enabled). - Is hidden (disabled).  **Caution**  When enabled, all users connected to the Task Mining project will have access to the Live Event Monitor. We therefore advise that this is not enabled for productive rollouts but for testing or during the setup phase only.  FROM 2.8.1 | `Enabled`  `Disabled` | `Disabled` |
| General | Use UIAA | Sets whether additional information on controls is:  - Extracted using Microsoft UI Automation (UIAA) (enabled). - Not extracted (disabled).  FROM 2.0.4 | `Enabled`  `Disabled` | `Enabled` |
| General | Applications to exclude from UIAA | Applications excluded from additional information extraction by Microsoft UI Automation (UIAA).  **Tip**  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive.  FROM 2.0.4 | -- | `EXCEL` |
| Startup Mode | Minimize Task Mining's Window When It Starts | Defines whether the Celonis Task Mining Desktop software starts:  - With a minimized application window (enabled). - With a standard size application window (disabled).  **Note**  The application window can always be restored by clicking the system tray icon. | `Enabled`  `Disabled` | `Disabled` |
| Startup Mode | Startup Mode | Sets whether the Task Mining Desktop software starts the data capture:  - Manually (Start Task Mining manually). - Automatically (Start Task Mining automatically on application start).  **Important**  The Task Mining Desktop software will start to capture data only if the user has already accepted the legal terms. The user can always start or stop Task Mining manually, even if `Start Task Mining automatically on application start` has been selected here. For more information, see the **User Consent** section in [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). | `Start Task Mining manually`  `Start Task Mining automatically on application start` | `Start Task Mining manually` |

| Section | Field | Description | Possible values | Default value |
| --- | --- | --- | --- | --- |
| General | Snippet Split Time | Time period (in seconds) used to split event sequences into snippets. If the elapsed time between two consecutive events exceeds this limit, the later event will be assigned to a new snippet. | Min value: `1` | `20` |
| General | Idle Waiting Time | Time period (in minutes) after which the user is considered absent due to no keyboard or mouse input.  FROM 2.4.1 | Min value: `1` | `10` |
| General | Alive Interval | Time between events that are added periodically to the data uploaded to the Celonis Platform to indicate the Task Mining Client is running (in minutes).  FROM 2.4.1 | Min value: `1` | `15` |
| General | Use Native URL Retrieval | Sets whether URLs are extracted directly from browsers:  - Without additional Chrome and Edge browser extensions (enabled). - With additional Chrome and Edge browser extensions required (disabled).  FROM 2.4.1  **Note**  For more information about Chrome and Edge browser extensions, see [Installing Task Mining browser extensions (optional)](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)"). | `Enabled`  `Disabled` | `Enabled` |
| General | Show Live Event Monitor in Client | Sets whether the Live Event Monitor menu item in the Task Mining Client software:  - Displays (enabled). - Is hidden (disabled).  **Caution**  When enabled, all users connected to the Task Mining project will have access to the Live Event Monitor. We therefore advise that this is not enabled for productive rollouts but for testing or during the setup phase only.  FROM 2.8.1 | `Enabled`  `Disabled` | `Disabled` |
| General | Use UIAA | Sets whether additional information on controls is:  - Extracted using Microsoft UI Automation (UIAA) (enabled). - Not extracted (disabled).  FROM 2.0.4 | `Enabled`  `Disabled` | `Enabled` |
| General | Applications to exclude from UIAA | Applications excluded from additional information extraction by Microsoft UI Automation (UIAA).  **Tip**  The application name must exactly match the process name displayed in Windows Task Manager without the .exe extension. The application name is case sensitive.  FROM 2.0.4 | -- | `EXCEL` |
| Startup Mode | Minimize Task Mining's Window When It Starts | Defines whether the Celonis Task Mining Desktop software starts:  - With a minimized application window (enabled). - With a standard size application window (disabled).  **Note**  The application window can always be restored by clicking the system tray icon. | `Enabled`  `Disabled` | `Disabled` |
| Startup Mode | Startup Mode | Sets whether the Task Mining Desktop software starts the data capture:  - Manually (Start Task Mining manually). - Automatically (Start Task Mining automatically on application start).  **Important**  The Task Mining Desktop software will start to capture data only if the user has already accepted the legal terms. The user can always start or stop Task Mining manually, even if `Start Task Mining automatically on application start` has been selected here. For more information, see the **User Consent** section in [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). | `Start Task Mining manually`  `Start Task Mining automatically on application start` | `Start Task Mining manually` |

### Capturing UI Automation (UIA) data

When [UIA capture is enabled](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114 "Logging"), the Task Mining Client software acts as a Microsoft UI Automation (UIA) client and captures data from third-party application interfaces. When a user interacts with a UIA-enabled screen element of an application that exposes UIA attributes, data such as field names and values is captured and stored. Applications based on Win32 and .NET programs typically expose UIA attributes.

**Note**

If you’re using [basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"), enable the **Context of application or webpage** in the **Captured Details** section. This setting is disabled by default.

### Testing UIA data capture

If you want to use UIA data capture in your Task Mining project, we recommend preliminary testing to determine the quality of data captured. Start with a small representative user sample and validate that the data provided by the third-party application is helpful for your project before rolling it out to more users. This is particularly important if you’re working with in-house custom applications that may not have been previously tested for Task Mining.

### UIA data capture issues

Filter

- Issue
- Description
- Example

| Issue | Description | Example |
| --- | --- | --- |
| The Task Mining Client software cannot reliably capture the UIA data if:  - User action closes the active window; or - An element the user interacted with disappears immediately after the interaction. | The closure/ removal of the element means the information on it may already be gone by the time the Task Mining Client software queries it. | User selects:  - The Window **Close** icon; or - The **Send** button in Microsoft Outlook; or - A button that is hidden after it is clicked. |
| UIA data capture causes a noticeable performance slowdown for some applications in some situations. | According to our testing, applications that must provide UIA data to the Task Mining Client software, as well as performing their standard tasks, may experience performance issues. | Large Microsoft Excel files may cause performance issues so the Task Mining Client software does not send UIA requests to Microsoft Excel by default. |

| Issue | Description | Example |
| --- | --- | --- |
| The Task Mining Client software cannot reliably capture the UIA data if:  - User action closes the active window; or - An element the user interacted with disappears immediately after the interaction. | The closure/ removal of the element means the information on it may already be gone by the time the Task Mining Client software queries it. | User selects:  - The Window **Close** icon; or - The **Send** button in Microsoft Outlook; or - A button that is hidden after it is clicked. |
| UIA data capture causes a noticeable performance slowdown for some applications in some situations. | According to our testing, applications that must provide UIA data to the Task Mining Client software, as well as performing their standard tasks, may experience performance issues. | Large Microsoft Excel files may cause performance issues so the Task Mining Client software does not send UIA requests to Microsoft Excel by default. |

[## SAP integration (from 2.6.0)](#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043050765823_body)

Filter

- Section
- Description
- Possible values
- Default value

| Section | Description | Possible values | Default value |
| --- | --- | --- | --- |
| Retrieve SAP Data | Sets the Task Mining Client software to:  - Retrieve detailed information from the SAP GUI (enabled). - Not retrieve information from the SAP GUI (disabled).  **Note**  SAP GUI scripting must be enabled for this to work. For more information, see [Configuring SAP for Task Mining integration](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-id235234736570846 "Configuring SAP for Task Mining integration").  FROM 1.2.1 | `Enabled`  `Disabled` | `Enabled` |
| Number of Retry Attempts | Number of times the Task Mining Client software tries to re-establish a lost connection to the SAP GUI.  FROM 1.2.1 | Min value: `1` | `4` |
| Waiting Time for Retry | Time the Task Mining Client software waits before trying to re-establish a lost connection to the SAP GUI (in miliseconds).  FROM 1.2.1 | Min value: `1` | `1000` |
| SAP Process Monitor Interval | Time interval between Task Mining Client software checks for a running SAP GUI instance.  FROM 1.2.1 | Min value: `1` | `100` |
| Dynamically Enable Native Windows Dialogs for SAP GUI Scripting | Sets whether native Windows dialogs for SAP GUI scripting is:  - Dynamically enabled (enabled). - Not enabled (disabled).  **Note**  This setting affects how the SAP GUI works. We recommended enabling it only if users are recording and executing SAP GUI scripts while running Task Mining. | `Enabled`  `Disabled` | `Disabled` |

| Section | Description | Possible values | Default value |
| --- | --- | --- | --- |
| Retrieve SAP Data | Sets the Task Mining Client software to:  - Retrieve detailed information from the SAP GUI (enabled). - Not retrieve information from the SAP GUI (disabled).  **Note**  SAP GUI scripting must be enabled for this to work. For more information, see [Configuring SAP for Task Mining integration](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-id235234736570846 "Configuring SAP for Task Mining integration").  FROM 1.2.1 | `Enabled`  `Disabled` | `Enabled` |
| Number of Retry Attempts | Number of times the Task Mining Client software tries to re-establish a lost connection to the SAP GUI.  FROM 1.2.1 | Min value: `1` | `4` |
| Waiting Time for Retry | Time the Task Mining Client software waits before trying to re-establish a lost connection to the SAP GUI (in miliseconds).  FROM 1.2.1 | Min value: `1` | `1000` |
| SAP Process Monitor Interval | Time interval between Task Mining Client software checks for a running SAP GUI instance.  FROM 1.2.1 | Min value: `1` | `100` |
| Dynamically Enable Native Windows Dialogs for SAP GUI Scripting | Sets whether native Windows dialogs for SAP GUI scripting is:  - Dynamically enabled (enabled). - Not enabled (disabled).  **Note**  This setting affects how the SAP GUI works. We recommended enabling it only if users are recording and executing SAP GUI scripts while running Task Mining. | `Enabled`  `Disabled` | `Disabled` |

### Configuring SAP for Task Mining integration

1. Ensure **Retrieve SAP Data** is enabled in the configuration settings.
2. Enable GUI scripting on both the client and server sides.
3. Change the settings using the information in [SAP settings for Task Mining integration](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-id235234739314653 "SAP settings for Task Mining integration").

**Important**

We recommend disabling **Notify when a script attaches to SAP GUI** and **Notify when a script opens a connection in the SAP GUI** options. This prevents users being prompted for permission each time the Task Mining Client software starts and tries to connect to the SAP GUI.

### SAP settings for Task Mining integration

Filter

- Location
- Setting
- Further information

| Location | Setting | Further information |
| --- | --- | --- |
| Server side | Set `sapgui/user_scripting` to `TRUE`. | Applies to all related profiles. |
| Server side | Dynamically enable SAP scripting using RZ11 to take effect immediately. | Consult the SAP help for further information. |
| Server side | Permanently enable SAP scripting in RZ10 to take effect after a server restart and for future restarts. | Values changed in RZ11 are temporary and lost after a system restart. To make values permanent, you need to change this in RZ10 too.Consult the SAP help for further information. |
| Client side | In **Accessibility & Scripting** >**Scripting**, enable these options:  - **Enable scripting**. - **Show native Windows dialogs**. | Start the SAP GUI Configuration app to open the settings. |

| Location | Setting | Further information |
| --- | --- | --- |
| Server side | Set `sapgui/user_scripting` to `TRUE`. | Applies to all related profiles. |
| Server side | Dynamically enable SAP scripting using RZ11 to take effect immediately. | Consult the SAP help for further information. |
| Server side | Permanently enable SAP scripting in RZ10 to take effect after a server restart and for future restarts. | Values changed in RZ11 are temporary and lost after a system restart. To make values permanent, you need to change this in RZ10 too.Consult the SAP help for further information. |
| Client side | In **Accessibility & Scripting** >**Scripting**, enable these options:  - **Enable scripting**. - **Show native Windows dialogs**. | Start the SAP GUI Configuration app to open the settings. |

[## User Consent](#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043052221617_body)

**Note**

For information on data privacy and security, see [Task Mining data privacy and security](task-mining-data-privacy-and-security.html "Task Mining data privacy and security").

Filter

- Section
- Possible values
- Default value

| Section | Possible values | Default value |
| --- | --- | --- |
| Consent Text | -- | Placeholder text. |
| Link to Additional Information (optional) | -- | -- |
| Label of Consent Checkbox |  | `I have read and agree to the above` |

| Section | Possible values | Default value |
| --- | --- | --- |
| Consent Text | -- | Placeholder text. |
| Link to Additional Information (optional) | -- | -- |
| Label of Consent Checkbox |  | `I have read and agree to the above` |

## Related topics

- [Extensions](extensions.html "Extensions")
- [User attributes (from 2.8.1)](user-attributes--from-2-8-1-.html "User attributes (from 2.8.1)")
- [Event processing rules](event-processing-rules.html "Event processing rules")
- [Data redaction (from 2.13.0)](data-redaction--from-2-13-0-.html "Data redaction (from 2.13.0)")


---

## task-mining/task-mining-data-privacy-and-security

# Task Mining data privacy and security

**Important**

Task Mining has been designed and built based on Privacy by Design principles and includes multiple configurable safeguards to protect the privacy of Task Mining Client software users. Data privacy legislation and employment laws vary significantly between countries and use cases. We therefore strongly advise you to consult your organization’s legal and compliance experts and communicate internally, including with worker’s council and/or trade unions as appropriate, before activating Task Mining for your users.

## Permissions and access rights

- Access to Task Mining data is restricted using permissions.
- Role-based access control means data and information access can be limited to authorized users.

For more information, see Task Mining permissions.

## User information and transparency

**Note**

This information can be customized for your organization according to local laws and privacy requirements and in conjunction with your legal experts.

- A user information screen pops up when the Task Mining Client software is installed on a user’s machine or the first time the Task Mining Client starts, informing users about the data that will be captured and requesting their consent.
- Users consent to data collection using a checkbox and can exit at this point. Data collection only begins after approval and if the user chooses to proceed.
- Users can see when the Task Mining Client software is running, pause the client and view the captured interactions.

## Data minimization

- Restrict the applications data is captured from and the types and granularity of the data captured for your Task Mining project based on your use case.
- Create allowlists/denylists to control which URLs the Task Mining Client software collects data from
- Ensure metadata capture won’t make users identifiable (even if user data is pseudonymized) and restrict access by setting custom data model permissions in the Task Mining Data Pool if groupings consist of fewer than five users.

## Data redaction and pseudonymization

Data redaction in the Task Mining Client software is performed when the Task Mining data is captured and before any data is saved to the user’s machine or the Celonis Platform. By default, the Task Mining Client software uses hashing to redact:

- The Windows username.
- The Windows machine name where the Task Mining Client software is running.
- Email addresses.
- US Social Security Numbers (SSN).
- Credit/debit card numbers.

You can also specify custom rules to redact other data, including hashing selected attributes.

**Note**

When Secure Hash Algorithms (SHA) are applied, hashing is irreversible. For more information, see [data redaction](data-redaction--from-2-13-0-.html "Data redaction (from 2.13.0)") and [event processing rules](event-processing-rules.html "Event processing rules").


---

## task-mining/task-mining-data-reference

# Task Mining data reference

Expand all

[## Task Mining event reference](#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-3ae2dc76-9a48-4041-ef57-94dfec6225a2_body)

As at 2.21.1

**Note**

Some event types are filtered out by default so they don't display in the **Deep Dive** tab of the Workforce Productivity app and aren't used in Task Mining analyses. These filters are set in the Knowledge Model used for your Task Mining project and you can remove or edit them at any time. For more information, see [Default event type filtering in the Workforce Productivity app](customizing-the-workforce-productivity-app.html#UUID-014577ed-3bfa-dfec-b19d-f930c89bcff0_section-id235274771508066 "Filtering default event types in the Workforce Productivity app").

Filter

- Event types
- Description
- Browser extensions required?
- SAP integration required?

| Event types | Description | Browser extensions required? | SAP integration required? |
| --- | --- | --- | --- |
| `Active window changed` | Active window has changed. | No | No |
| `Application window changed`  DEPRECATED FROM 2.7.3 | State of an application window has changed. The window could, for example, have been opened or closed.  Application window change events are only detected for applications that are launched after the Task Mining Client software has been started. Changes to applications that were launched before the Task Mining Client software was started are not detected. This means if an application is opened before the Task Mining Client software was launched and closed while the Task Mining Client software is running, the close event will not be detected. | No | No |
| `Clipboard changed` | Content of the Windows clipboard has changed. | No | No |
| `User comment` | Comment added by a user via the comment function in the Task Mining Client software. For more information, see [Working with the Task Mining Client software](https://docs.celonis.com/en/using-the-task-mining-client-software.html#UUID-d3d77b71-b93e-9974-2e66-bebc88f053b4_section-id235210839305421). | No | No |
| `Focus changed`  DEPRECATED FROM 1.0.0 | Currently-focused window has changed. | No | No |
| `Keyboard command` | Keyboard command, for example Crtl + C, is performed.  **Note**  The input of text is indicated by the `Entered text` event. | No | No |
| `Left-click` | Left mouse click. | Yes |  |
| `Mouse wheel` | Mouse wheel has moved in an unknown direction by a given number of units. | No | No |
| `Mouse wheel (up)` | Mouse wheel has moved up by a given number of units. | No | No |
| `Mouse wheel (down)` | Mouse wheel has moved down by a given number of units. | No | No |
| `Right-click` | Right mouse click. | No | No |
| `Entered text` | Input of readable text by the user. | No | No |
| `Activated tab`  FROM 1.0.2 | Browser tab has been activated. This could be either:  - A newly-opened tab; or - An already existing, previously inactive tab has been reactivated. | Yes | No |
| `Closed tab`  FROM 1.0.2 | Browser tab has been closed. | Yes | No |
| `Element changed`  FROM 1.0.2 | Web element (i.e. a text field) has changed. | Yes | No |
| `Text selected`  FROM 1.0.2 | Text from a text field has been selected (e.g. by mouse, keyboard commands). | Yes | No |
| `Left double click`  FROM 1.0.2 | Left mouse double-click. | Yes | No |
| `Copy to clipboard`  FROM 1.0.2 | Text has been copied to the clipboard. | Yes | No |
| `Cut to clipboard`  FROM 1.0.2 | Text has been cut to the clipboard. | Yes | No |
| `Paste from clipboard`  FROM 1.0.2 | Text from the clipboard has been pasted to the target web element. | Yes | No |
| `Task Mining Started`  FROM 2.4.1 | Task Mining Client software has started. | No | No |
| `Task Mining Stopped`  FROM 2.4.1 | Task Mining Client software has stopped. | No | No |
| `User Idle Started`  FROM 2.4.1 | Current user idle mode has started. | No | No |
| `User Idle Ended`  FROM 2.4.1 | Current user idle mode has ended. | No | No |
| `Session Locked`  FROM 2.4.1 | Current user Windows session has been locked. | No | No |
| `Session Unlocked`  FROM 2.4.1 | Current user Windows session has been unlocked. | No | No |
| `Session Connected`  FROM 2.4.1 | Current user session has been connected from the console. | No | No |
| `Session Disconnected`  FROM 2.4.1 | Current user session has been disconnected from the console. | No | No |
| `Session Remote Connected`  FROM 2.4.1 | Current user session has been connected to a remote connection. | No | No |
| `Session Remote Disconnected`  FROM 2.4.1 | Current user session has been disconnected from a remote connection. | No | No |
| `Alive`  FROM 2.4.1 | Task Mining client is alive. | No | No |

| Event types | Description | Browser extensions required? | SAP integration required? |
| --- | --- | --- | --- |
| `Active window changed` | Active window has changed. | No | No |
| `Application window changed`  DEPRECATED FROM 2.7.3 | State of an application window has changed. The window could, for example, have been opened or closed.  Application window change events are only detected for applications that are launched after the Task Mining Client software has been started. Changes to applications that were launched before the Task Mining Client software was started are not detected. This means if an application is opened before the Task Mining Client software was launched and closed while the Task Mining Client software is running, the close event will not be detected. | No | No |
| `Clipboard changed` | Content of the Windows clipboard has changed. | No | No |
| `User comment` | Comment added by a user via the comment function in the Task Mining Client software. For more information, see [Working with the Task Mining Client software](https://docs.celonis.com/en/using-the-task-mining-client-software.html#UUID-d3d77b71-b93e-9974-2e66-bebc88f053b4_section-id235210839305421). | No | No |
| `Focus changed`  DEPRECATED FROM 1.0.0 | Currently-focused window has changed. | No | No |
| `Keyboard command` | Keyboard command, for example Crtl + C, is performed.  **Note**  The input of text is indicated by the `Entered text` event. | No | No |
| `Left-click` | Left mouse click. | Yes |  |
| `Mouse wheel` | Mouse wheel has moved in an unknown direction by a given number of units. | No | No |
| `Mouse wheel (up)` | Mouse wheel has moved up by a given number of units. | No | No |
| `Mouse wheel (down)` | Mouse wheel has moved down by a given number of units. | No | No |
| `Right-click` | Right mouse click. | No | No |
| `Entered text` | Input of readable text by the user. | No | No |
| `Activated tab`  FROM 1.0.2 | Browser tab has been activated. This could be either:  - A newly-opened tab; or - An already existing, previously inactive tab has been reactivated. | Yes | No |
| `Closed tab`  FROM 1.0.2 | Browser tab has been closed. | Yes | No |
| `Element changed`  FROM 1.0.2 | Web element (i.e. a text field) has changed. | Yes | No |
| `Text selected`  FROM 1.0.2 | Text from a text field has been selected (e.g. by mouse, keyboard commands). | Yes | No |
| `Left double click`  FROM 1.0.2 | Left mouse double-click. | Yes | No |
| `Copy to clipboard`  FROM 1.0.2 | Text has been copied to the clipboard. | Yes | No |
| `Cut to clipboard`  FROM 1.0.2 | Text has been cut to the clipboard. | Yes | No |
| `Paste from clipboard`  FROM 1.0.2 | Text from the clipboard has been pasted to the target web element. | Yes | No |
| `Task Mining Started`  FROM 2.4.1 | Task Mining Client software has started. | No | No |
| `Task Mining Stopped`  FROM 2.4.1 | Task Mining Client software has stopped. | No | No |
| `User Idle Started`  FROM 2.4.1 | Current user idle mode has started. | No | No |
| `User Idle Ended`  FROM 2.4.1 | Current user idle mode has ended. | No | No |
| `Session Locked`  FROM 2.4.1 | Current user Windows session has been locked. | No | No |
| `Session Unlocked`  FROM 2.4.1 | Current user Windows session has been unlocked. | No | No |
| `Session Connected`  FROM 2.4.1 | Current user session has been connected from the console. | No | No |
| `Session Disconnected`  FROM 2.4.1 | Current user session has been disconnected from the console. | No | No |
| `Session Remote Connected`  FROM 2.4.1 | Current user session has been connected to a remote connection. | No | No |
| `Session Remote Disconnected`  FROM 2.4.1 | Current user session has been disconnected from a remote connection. | No | No |
| `Alive`  FROM 2.4.1 | Task Mining client is alive. | No | No |

[## Task Mining attribute reference](#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-9ae7e983-3a6c-f3b7-f3fb-aae0cda57286_body)

As at 2.21.1

Filter

- Attribute name
- Description
- Data type
- Column size
- Mandatory/hashable/redactable?
- Supported event types
- Browser extensions required?
- SAP integration required?

| Attribute name | Description | Data type | Column size | Mandatory/hashable/redactable? | Supported event types | Browser extensions required? | SAP integration required? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Id` | Unique identifier for the event. | string | 36 | Yes/No/No | All | Yes | No |
| `TimestampLocal` | Time when the event was detected (local time). | datetime |  | Yes/No/No | All | Yes | No |
| `TimestampUTC` | Time when the event was detected (lUTC). | datetime |  | Yes/No/No | All | Yes | No |
| `SystemUser` | Windows user name of the active user. | string | 120 | Yes/Yes/No | All | Yes | No |
| `EventType` | Type of the event. | string | 120 | Yes/No/No | All | Yes | No |
| `ProcessName` | Name of the Windows OS process for an active application. | string | 120 | Yes/No/No | All | Yes | No |
| `ProcessId` | Identifier of the Windows operating system process in the Windows Task Manager.  NOTE: The ProcessID is not stable and may vary between different runs of the application. | string | 120 | Yes/No/No | All | No | No |
| `Comment` | Comment entered by the user. | string | 120 | No/No/Yes | User comment | No | No |
| `KeyboardCommand` | Command key or key combination used. | string | 30 | No/No/No | Keyboard command | No | No |
| `EnteredText` | Text entered by the user.  NOTE: If the AnonymizeTextInput setting is activated, only the first character of the entered sequence is logged. | string | 200 | No/Yes/Yes | Entered text | No | No |
| `ClipboardContentType` | Type of content saved to the Windows clipboard. | string | 120 | No/No/No | Clipboard changed | No | No |
| `ClipboardText` | Textual content saved to the Windows clipboard. | string | 120 | No/Yes/Yes | Clipboard changed | Yes | No |
| `ApplicationName`  DEPRECATED FROM 2.7.3. | Name/title of an application that has changed its state. | string | 120 | No/Yes/No | Application window changed | No | No |
| `ApplicationPath`  DEPRECATED FROM 2.7.3. | File path of an application has changed its state. | string | 120 | No/Yes/No | Application window changed | No | No |
| `ApplicationTitle`  DEPRECATED FROM 2.7.3. | Title of an application has changed its state. | string | 500 | No/Yes/No | Application window changed | No | No |
| `ApplicationAction`  DEPRECATED FROM 2.7.3. | The window-related action triggers the state change of the application (e.g. launch of the window). | string | 120 | No/Yes/No | Application window changed | No | No |
| `ActiveWindow` | The name / title of the active window. | string | 200 | No/Yes/Yes | All | Yes | No |
| `ActiveElementName`  DEPRECATED FROM 1.0.5 | The name of the clicked element (e.g. the name of the clicked button). | string | 120 | No/Yes/No | - Left click - Right click - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) - Focus changed | No | No |
| `ControlType`  DEPRECATED FROM 1.0.5 | The type of the clicked element (e.g. Button). | string | 120 | No/Yes/No | - Left click - Right click - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) - Focus changed | No | No |
| `SessionId` | A unique ID for the Task Mining session. A session is the period of time from starting Task Mining to stopping it. This can either be done manually via the start/stop buttons or automatically, e.g., when starting Task Mining together with Windows or when shutting down Task Mining. | string | 36 | Yes/No/No | All | Yes | No |
| `SnippetId` | A unique id within a session that groups events that occur within a small time distance. If the time distance between consecutive events exceeds the time window, the later event is assigned to a new snippet. | string | 120 | No/No/No | All | Yes | No |
| `ScreenshotId` | The unique file name of the screenshot is related to the event. | string | 120 | No/No/No | All | Yes | No |
| `MousePositionX`  FROM 1.0.2 | The X coordinate of the mouse pointer is in the screenshot. A negative value indicates that the mouse pointer is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `MousePositionY`  FROM 1.0.2 | The Y coordinate of the mouse pointer is in the screenshot. A negative value indicates that the mouse pointer is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScrollUnits` | The number of units the mouse wheel was moved. | int |  | No/No/No | - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) | No | No |
| `ActiveWindowX`  FROM 1.0.2 | The X coordinate of the active window is in the screenshot. A negative value indicates that the active window is outside of the screenshot. The point (ActiveWindowX, ActiveWindowY) represents the left upper corner of the active window. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowY`  FROM 1.0.2 | The Y coordinate of the active window is in the screenshot. A negative value indicates that the active window is outside of the screenshot. The point (ActiveWindowX, ActiveWindowY) represents the left upper corner of the active window. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowWidth`  FROM 1.0.2 | The width of the active window in the screenshot. A negative value indicates that the active window is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowHeight`  FROM 1.0.2 | The height of the active window in the screenshot. A negative value indicates that the active window is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScreenshotWidth`  FROM 1.0.2 | The width of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScreenshotHeight`  FROM 1.0.2 | The height of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ExtensionName` | The name of the Celonis Task Mining Extension that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `URL`  FROM 1.0.2 | The URL of the website is currently opened in the tab that triggered the event. For Internet Explorer, this value can only be retrieved if the interaction is happening on the web page; for interactions outside of the web page (e.g. opening, switching, and closing tabs), no values are available for Internet Explorer. | string | 1000 | No/Yes/Yes | All | Yes | No |
| `TargetElementType`  FROM 1.0.2 | The HTML element type of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementId`  FROM 1.0.2 | The HTML element ID of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementName`  FROM 1.0.2 | The HTML element name of the web element is related to the event. | string | 120 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementValue`  FROM 1.0.2 | The HTML element value of the web element is related to the event. | string | 120 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetInputType`  FROM 1.0.2 | The input type of the web element is related to the event if the attribute TargetElementType has the value 'INPUT'. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetClassName`  FROM 1.0.2 | The CSS class name of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetLinkUrl`  FROM 1.0.2 | The URL is linked by the clicked element if the attribute TargetElementType has the value 'A'. | string | 1000 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetIsChecked`  FROM 1.0.2 | Indicates if the web element related to the event is checked or not. Can only be true if the attribute TargetElementType has the value 'INPUT' and the attribute TargetInputType has either the value 'RADIO' or the value 'CHECKBOX'). | bool |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `SelectedText`  FROM 1.0.2 | The text that has been selected. For 'Copy to clipboard' and 'Cut to clipboard' events, this represents the text that has been set to clipboard. For events of type 'Text selected' (only triggered when text in a text field of type input or textarea has been selected), this contains the selected text. | string | 120 | No/Yes/Yes | - Text selected - Copy to clipboard - Cut to clipboard | Yes | No |
| `DomPath`  FROM 1.0.2 | Path in the DOM tree of the web element that is related to the event. | string | 5000 | No/Yes/No | - Left click - Left double click - Element changed - Text selected - Copy to clipboard - Cut to clipboard | Yes | No |
| `ClientVersion`  FROM 1.0.2 | Version of the Celonis Task Mining Client software that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `ExtensionVersion`  FROM 1.0.2 | Version of the Task Mining browser extension that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `MachineName`  FROM 1.0.4 | Name of the local machine that is running the Task Mining Client software. | string | 120 | No/Yes/No | All | Yes | No |
| `TargetX`  FROM 1.0.4 | The X coordinate of the web element is related to the event. The value is relative to the left upper corner of the browser window which is expected to be stored in the attribute ActiveWindowX. | int |  | No/No/No | - Left click - Left double click - Element changed | Yes | No |
| `TargetY`  FROM 1.0.4 | The Y coordinate of the web element related to the event. The value is relative to the left upper corner of the browser window which is expected to be stored in attribute ActiveWindowY. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetWidth`  FROM 1.0.4 | The width of the web element related to the event. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetHeight`  FROM 1.0.4 | The height of the web element related to the event. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `UserId`  FROM 1.1.1 | The hashed Windows user name of the active user. The value is hashed using SHA256. | string | 120 | Yes/No/No | All | Yes | No |
| `WebPageExtractions`  FROM 1.1.6 | Specific data extracted from the web page in JSON format | string | 16250 | No/No/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `CaretPositionX`  FROM  1.2.1 | X position of the caret (text input cursor). The value is relative to the left border of the text input control that owns the caret. | int |  | No/No/No | - Keyboard command - Entered text | No | No |
| `CaretPositionY`  FROM  1.2.1 | Y position of the caret (text input cursor). The value is relative to the top border of the text input control that owns the caret. | int |  | No/No/No | - Keyboard command - Entered text | No | No |
| `ElementTypeSAP`  FROM  1.2.1 | Type of the SAP GUI element related to the event | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementIdSAP`  FROM  1.2.1 | ID of the SAP GUI element related to the event. The ID describes the hierarchy of the element in the SAP GUI. | string | 1000 | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementNameSAP`  FROM  1.2.1 | Name of the SAP GUI element related to the event. The name is also part of the id stored in ElementIdSAP. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementTextSAP`  FROM  1.2.1 | The text of the SAP GUI element related to the event. | string | 16250 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementToolTipSAP`  FROM  1.2.1 | Tooltip of the SAP GUI element related to the event. | string | 400 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementLabelSAP`  FROM  1.2.1 | Label of the SAP GUI element related to the event. | string | 120 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementScreenLeftSAP`  FROM 1.2.1 | Left position (X coordinate) of the SAP GUI element related to the event in screenshot coordinates. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementScreenTopSAP`  FROM 1.2.1 | Top position (Y coordinate) of the SAP GUI element related to the event in screenshot coordinates. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementWidthSAP`  FROM 1.2.1 | Width (in pixels) of the SAP GUI element related to the event. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementHeightSAP`  FROM 1.2.1 | Height (in pixels) of the SAP GUI element related to the event. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementIconNameSAP`  FROM  1.2.1 | Icon name of the SAP GUI element related to the event. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `WindowNameSAP`  FROM  1.2.1 | Name of the window that hosts the SAP GUI element related to the event. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `CheckboxSelectedSAP`  FROM  1.2.1 | Selection state of the SAP GUI checkbox related to the event. | bool |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `TitleSAP`  FROM  1.2.1 | Title of the SAP GUI element related to the event. | string | 200 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `AutomationId_UIAA`  FROM  2.0.4 | An ID of the element within the GUI of an application related to the event. | string | 120 | No/Yes/No | All | No | No |
| `ControlType_UIAA`  FROM  2.0.4 | The control type of the element related to the event. | string | 120 | No/Yes/No | All | No | No |
| `Name_UIAA`  FROM  2.0.4 | The name of the GUI element related to the event. | string | 120 | No/Yes/Yes | All | No | No |
| `Value_UIAA`  FROM  2.0.4 | The value that is held by the GUI element related to the event. | string | 1000 | No/Yes/Yes | All | No | No |
| `ElementX_UIAA`  FROM  2.0.4 | X-coordinate (as absolute screen coordinate) of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementY_UIAA`  FROM  2.0.4 | Y-coordinate (as absolute screen coordinate) of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementWidth_UIAA`  FROM  2.0.4 | Width of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementHeight_UIAA`  FROM  2.0.4 | Height of the GUI element related to the event.  **Note**  As GUI elements may be composed of different other elements, the value of this field might differ from the expected value. For example, buttons may include text and/or image elements so the value might relate to them rather than | int |  | No/No/No | All | No | No |
| `ClassName_UIAA`  FROM  2.0.4 | Programmatic class name of the GUI element related to the event.  **Note**  As GUI elements may be composed of different other elements, the value of this field might differ from the expected value. For example, buttons may include text and/or image elements so the value might relate to them rather than to the button itself. | string | 120 | No/Yes/No | All | No | No |
| `HelpText_UIAA`  FROM  2.0.4 | Help text that describes the GUI element related to the event. | string | 120 | No/Yes/Yes | All | No | No |
| `IsEnabled_UIAA`  FROM  2.0.4 | Flag indicating if the GUI element is enabled or disabled. | bool |  | No/No/No | All | No | No |
| `FrameworkID_UIAA`  FROM  2.0.4 | Underlying GUI framework of the element. | string | 120 | No/No/No | All | No | No |
| `ApplicationServerSAP`  FROM  2.4.2 | Name of the SAP application server. | string | 120 | No/Yes/No | All | No | Yes |
| `ClientSAP`  FROM  2.4.2 | Client selected on the SAP login screen. | string | 120 | No/Yes/No | All | No | Yes |
| `GroupSAP`  FROM  2.4.2 | SAP login group. | string | 120 | No/Yes/No | All | No | Yes |
| `ScreenNumberSAP`  FROM  2.4.2 | Number of the SAP screen that is currently displayed. | int |  | No/No/No | All | No | Yes |
| `SessionNumberSAP`  FROM  2.4.2 | Number of the SAP session. | int |  | No/No/No | All | No | Yes |
| `SystemNameSAP`  FROM  2.4.2 | Name of the SAP system. | string | 120 | No/Yes/No | All | No | Yes |
| `SystemNumberSAP`  FROM  2.4.2 | Number of the SAP system. | int |  | No/No/No | All | No | Yes |
| `SystemSessionIdSAP`  FROM  2.4.2 | Identifier of the SAP system session. | string | 120 | No/Yes/No | All | No | Yes |
| `TransactionSAP`  FROM  2.4.2 | Identifier of the current SAP transaction. | string | 120 | No/Yes/No | All | No | Yes |
| `UserSAP`  FROM  2.4.2 | SAP user name. | string | 120 | No/Yes/Yes | All | No | Yes |
| `Custom1`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom2`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom3`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom4`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom5`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |

| Attribute name | Description | Data type | Column size | Mandatory/hashable/redactable? | Supported event types | Browser extensions required? | SAP integration required? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Id` | Unique identifier for the event. | string | 36 | Yes/No/No | All | Yes | No |
| `TimestampLocal` | Time when the event was detected (local time). | datetime |  | Yes/No/No | All | Yes | No |
| `TimestampUTC` | Time when the event was detected (lUTC). | datetime |  | Yes/No/No | All | Yes | No |
| `SystemUser` | Windows user name of the active user. | string | 120 | Yes/Yes/No | All | Yes | No |
| `EventType` | Type of the event. | string | 120 | Yes/No/No | All | Yes | No |
| `ProcessName` | Name of the Windows OS process for an active application. | string | 120 | Yes/No/No | All | Yes | No |
| `ProcessId` | Identifier of the Windows operating system process in the Windows Task Manager.  NOTE: The ProcessID is not stable and may vary between different runs of the application. | string | 120 | Yes/No/No | All | No | No |
| `Comment` | Comment entered by the user. | string | 120 | No/No/Yes | User comment | No | No |
| `KeyboardCommand` | Command key or key combination used. | string | 30 | No/No/No | Keyboard command | No | No |
| `EnteredText` | Text entered by the user.  NOTE: If the AnonymizeTextInput setting is activated, only the first character of the entered sequence is logged. | string | 200 | No/Yes/Yes | Entered text | No | No |
| `ClipboardContentType` | Type of content saved to the Windows clipboard. | string | 120 | No/No/No | Clipboard changed | No | No |
| `ClipboardText` | Textual content saved to the Windows clipboard. | string | 120 | No/Yes/Yes | Clipboard changed | Yes | No |
| `ApplicationName`  DEPRECATED FROM 2.7.3. | Name/title of an application that has changed its state. | string | 120 | No/Yes/No | Application window changed | No | No |
| `ApplicationPath`  DEPRECATED FROM 2.7.3. | File path of an application has changed its state. | string | 120 | No/Yes/No | Application window changed | No | No |
| `ApplicationTitle`  DEPRECATED FROM 2.7.3. | Title of an application has changed its state. | string | 500 | No/Yes/No | Application window changed | No | No |
| `ApplicationAction`  DEPRECATED FROM 2.7.3. | The window-related action triggers the state change of the application (e.g. launch of the window). | string | 120 | No/Yes/No | Application window changed | No | No |
| `ActiveWindow` | The name / title of the active window. | string | 200 | No/Yes/Yes | All | Yes | No |
| `ActiveElementName`  DEPRECATED FROM 1.0.5 | The name of the clicked element (e.g. the name of the clicked button). | string | 120 | No/Yes/No | - Left click - Right click - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) - Focus changed | No | No |
| `ControlType`  DEPRECATED FROM 1.0.5 | The type of the clicked element (e.g. Button). | string | 120 | No/Yes/No | - Left click - Right click - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) - Focus changed | No | No |
| `SessionId` | A unique ID for the Task Mining session. A session is the period of time from starting Task Mining to stopping it. This can either be done manually via the start/stop buttons or automatically, e.g., when starting Task Mining together with Windows or when shutting down Task Mining. | string | 36 | Yes/No/No | All | Yes | No |
| `SnippetId` | A unique id within a session that groups events that occur within a small time distance. If the time distance between consecutive events exceeds the time window, the later event is assigned to a new snippet. | string | 120 | No/No/No | All | Yes | No |
| `ScreenshotId` | The unique file name of the screenshot is related to the event. | string | 120 | No/No/No | All | Yes | No |
| `MousePositionX`  FROM 1.0.2 | The X coordinate of the mouse pointer is in the screenshot. A negative value indicates that the mouse pointer is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `MousePositionY`  FROM 1.0.2 | The Y coordinate of the mouse pointer is in the screenshot. A negative value indicates that the mouse pointer is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScrollUnits` | The number of units the mouse wheel was moved. | int |  | No/No/No | - Mouse wheel - Mouse wheel (up) - Mouse wheel (down) | No | No |
| `ActiveWindowX`  FROM 1.0.2 | The X coordinate of the active window is in the screenshot. A negative value indicates that the active window is outside of the screenshot. The point (ActiveWindowX, ActiveWindowY) represents the left upper corner of the active window. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowY`  FROM 1.0.2 | The Y coordinate of the active window is in the screenshot. A negative value indicates that the active window is outside of the screenshot. The point (ActiveWindowX, ActiveWindowY) represents the left upper corner of the active window. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowWidth`  FROM 1.0.2 | The width of the active window in the screenshot. A negative value indicates that the active window is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ActiveWindowHeight`  FROM 1.0.2 | The height of the active window in the screenshot. A negative value indicates that the active window is outside of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScreenshotWidth`  FROM 1.0.2 | The width of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ScreenshotHeight`  FROM 1.0.2 | The height of the screenshot. | int |  | No/No/No | All | Yes | No |
| `ExtensionName` | The name of the Celonis Task Mining Extension that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `URL`  FROM 1.0.2 | The URL of the website is currently opened in the tab that triggered the event. For Internet Explorer, this value can only be retrieved if the interaction is happening on the web page; for interactions outside of the web page (e.g. opening, switching, and closing tabs), no values are available for Internet Explorer. | string | 1000 | No/Yes/Yes | All | Yes | No |
| `TargetElementType`  FROM 1.0.2 | The HTML element type of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementId`  FROM 1.0.2 | The HTML element ID of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementName`  FROM 1.0.2 | The HTML element name of the web element is related to the event. | string | 120 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetElementValue`  FROM 1.0.2 | The HTML element value of the web element is related to the event. | string | 120 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetInputType`  FROM 1.0.2 | The input type of the web element is related to the event if the attribute TargetElementType has the value 'INPUT'. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetClassName`  FROM 1.0.2 | The CSS class name of the web element is related to the event. | string | 120 | No/Yes/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetLinkUrl`  FROM 1.0.2 | The URL is linked by the clicked element if the attribute TargetElementType has the value 'A'. | string | 1000 | No/Yes/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetIsChecked`  FROM 1.0.2 | Indicates if the web element related to the event is checked or not. Can only be true if the attribute TargetElementType has the value 'INPUT' and the attribute TargetInputType has either the value 'RADIO' or the value 'CHECKBOX'). | bool |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `SelectedText`  FROM 1.0.2 | The text that has been selected. For 'Copy to clipboard' and 'Cut to clipboard' events, this represents the text that has been set to clipboard. For events of type 'Text selected' (only triggered when text in a text field of type input or textarea has been selected), this contains the selected text. | string | 120 | No/Yes/Yes | - Text selected - Copy to clipboard - Cut to clipboard | Yes | No |
| `DomPath`  FROM 1.0.2 | Path in the DOM tree of the web element that is related to the event. | string | 5000 | No/Yes/No | - Left click - Left double click - Element changed - Text selected - Copy to clipboard - Cut to clipboard | Yes | No |
| `ClientVersion`  FROM 1.0.2 | Version of the Celonis Task Mining Client software that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `ExtensionVersion`  FROM 1.0.2 | Version of the Task Mining browser extension that logged the event. | string | 120 | Yes/No/No | All | Yes | No |
| `MachineName`  FROM 1.0.4 | Name of the local machine that is running the Task Mining Client software. | string | 120 | No/Yes/No | All | Yes | No |
| `TargetX`  FROM 1.0.4 | The X coordinate of the web element is related to the event. The value is relative to the left upper corner of the browser window which is expected to be stored in the attribute ActiveWindowX. | int |  | No/No/No | - Left click - Left double click - Element changed | Yes | No |
| `TargetY`  FROM 1.0.4 | The Y coordinate of the web element related to the event. The value is relative to the left upper corner of the browser window which is expected to be stored in attribute ActiveWindowY. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetWidth`  FROM 1.0.4 | The width of the web element related to the event. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `TargetHeight`  FROM 1.0.4 | The height of the web element related to the event. | int |  | No/No/No | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `UserId`  FROM 1.1.1 | The hashed Windows user name of the active user. The value is hashed using SHA256. | string | 120 | Yes/No/No | All | Yes | No |
| `WebPageExtractions`  FROM 1.1.6 | Specific data extracted from the web page in JSON format | string | 16250 | No/No/Yes | - Left click - Left double click - Element changed - Text selected | Yes | No |
| `CaretPositionX`  FROM  1.2.1 | X position of the caret (text input cursor). The value is relative to the left border of the text input control that owns the caret. | int |  | No/No/No | - Keyboard command - Entered text | No | No |
| `CaretPositionY`  FROM  1.2.1 | Y position of the caret (text input cursor). The value is relative to the top border of the text input control that owns the caret. | int |  | No/No/No | - Keyboard command - Entered text | No | No |
| `ElementTypeSAP`  FROM  1.2.1 | Type of the SAP GUI element related to the event | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementIdSAP`  FROM  1.2.1 | ID of the SAP GUI element related to the event. The ID describes the hierarchy of the element in the SAP GUI. | string | 1000 | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementNameSAP`  FROM  1.2.1 | Name of the SAP GUI element related to the event. The name is also part of the id stored in ElementIdSAP. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementTextSAP`  FROM  1.2.1 | The text of the SAP GUI element related to the event. | string | 16250 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementToolTipSAP`  FROM  1.2.1 | Tooltip of the SAP GUI element related to the event. | string | 400 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementLabelSAP`  FROM  1.2.1 | Label of the SAP GUI element related to the event. | string | 120 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementScreenLeftSAP`  FROM 1.2.1 | Left position (X coordinate) of the SAP GUI element related to the event in screenshot coordinates. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementScreenTopSAP`  FROM 1.2.1 | Top position (Y coordinate) of the SAP GUI element related to the event in screenshot coordinates. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementWidthSAP`  FROM 1.2.1 | Width (in pixels) of the SAP GUI element related to the event. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementHeightSAP`  FROM 1.2.1 | Height (in pixels) of the SAP GUI element related to the event. | int |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `ElementIconNameSAP`  FROM  1.2.1 | Icon name of the SAP GUI element related to the event. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `WindowNameSAP`  FROM  1.2.1 | Name of the window that hosts the SAP GUI element related to the event. | string | 80 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `CheckboxSelectedSAP`  FROM  1.2.1 | Selection state of the SAP GUI checkbox related to the event. | bool |  | No/No/No | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `TitleSAP`  FROM  1.2.1 | Title of the SAP GUI element related to the event. | string | 200 | No/No/Yes | - Left click - Right click - Mouse wheel - Keyboard command - Entered text - Mouse wheel (up) - Mouse wheel (down) | No | Yes |
| `AutomationId_UIAA`  FROM  2.0.4 | An ID of the element within the GUI of an application related to the event. | string | 120 | No/Yes/No | All | No | No |
| `ControlType_UIAA`  FROM  2.0.4 | The control type of the element related to the event. | string | 120 | No/Yes/No | All | No | No |
| `Name_UIAA`  FROM  2.0.4 | The name of the GUI element related to the event. | string | 120 | No/Yes/Yes | All | No | No |
| `Value_UIAA`  FROM  2.0.4 | The value that is held by the GUI element related to the event. | string | 1000 | No/Yes/Yes | All | No | No |
| `ElementX_UIAA`  FROM  2.0.4 | X-coordinate (as absolute screen coordinate) of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementY_UIAA`  FROM  2.0.4 | Y-coordinate (as absolute screen coordinate) of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementWidth_UIAA`  FROM  2.0.4 | Width of the GUI element related to the event. | int |  | No/No/No | All | No | No |
| `ElementHeight_UIAA`  FROM  2.0.4 | Height of the GUI element related to the event.  **Note**  As GUI elements may be composed of different other elements, the value of this field might differ from the expected value. For example, buttons may include text and/or image elements so the value might relate to them rather than | int |  | No/No/No | All | No | No |
| `ClassName_UIAA`  FROM  2.0.4 | Programmatic class name of the GUI element related to the event.  **Note**  As GUI elements may be composed of different other elements, the value of this field might differ from the expected value. For example, buttons may include text and/or image elements so the value might relate to them rather than to the button itself. | string | 120 | No/Yes/No | All | No | No |
| `HelpText_UIAA`  FROM  2.0.4 | Help text that describes the GUI element related to the event. | string | 120 | No/Yes/Yes | All | No | No |
| `IsEnabled_UIAA`  FROM  2.0.4 | Flag indicating if the GUI element is enabled or disabled. | bool |  | No/No/No | All | No | No |
| `FrameworkID_UIAA`  FROM  2.0.4 | Underlying GUI framework of the element. | string | 120 | No/No/No | All | No | No |
| `ApplicationServerSAP`  FROM  2.4.2 | Name of the SAP application server. | string | 120 | No/Yes/No | All | No | Yes |
| `ClientSAP`  FROM  2.4.2 | Client selected on the SAP login screen. | string | 120 | No/Yes/No | All | No | Yes |
| `GroupSAP`  FROM  2.4.2 | SAP login group. | string | 120 | No/Yes/No | All | No | Yes |
| `ScreenNumberSAP`  FROM  2.4.2 | Number of the SAP screen that is currently displayed. | int |  | No/No/No | All | No | Yes |
| `SessionNumberSAP`  FROM  2.4.2 | Number of the SAP session. | int |  | No/No/No | All | No | Yes |
| `SystemNameSAP`  FROM  2.4.2 | Name of the SAP system. | string | 120 | No/Yes/No | All | No | Yes |
| `SystemNumberSAP`  FROM  2.4.2 | Number of the SAP system. | int |  | No/No/No | All | No | Yes |
| `SystemSessionIdSAP`  FROM  2.4.2 | Identifier of the SAP system session. | string | 120 | No/Yes/No | All | No | Yes |
| `TransactionSAP`  FROM  2.4.2 | Identifier of the current SAP transaction. | string | 120 | No/Yes/No | All | No | Yes |
| `UserSAP`  FROM  2.4.2 | SAP user name. | string | 120 | No/Yes/Yes | All | No | Yes |
| `Custom1`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom2`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom3`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom4`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |
| `Custom5`  FROM  2.8.0 | Optional custom user attribute that can be defined in the configuration file. | string | 2000 | No/Yes/No | All | No | No |

[## Task Mining table reference](#UUID-0c36a3ff-8bd9-078d-0d6c-a5de2b230437_UUID-ea773258-39eb-122f-1bb6-a442f991cd46_body)

| Table name | Description |
| --- | --- |
| `applications` | Contains applications and web pages and whether they are productive or non-productive. Used in the [Workforce Productivity application](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app") Application Usage tab. |
| `Business_Events` | Contains all Business Event names. |
| `Business_Event_Instances` | Contains all instances of Business Events and the Business Event they belong to. |
| `Business_Event_Object_Attributes` | Contains the Attributes for each Business Event instance. |
| `employees` | Contains metadata about employees. |
| `Tasks` | Contains all Task names. |
| `Task_Instance` | Contains all instances of a Task and which Task they belong to. |
| `TM_Labeled_Data` | The result event log is inserted into this table after processing. Also contains the event log that is used in the Studio package. |
| `Task_Join` | Contains all event IDs which belong to the Task instances. Event IDs can occur more than once if the belong to more than one Task. |
| `TM_Labeled_Data_View` | Limits the total number of rows that will be loaded from `TM_Labeled_Data` to the Data Model to two billion:  `CREATE VIEW TM_Labeled_Data_View AS SELECT TM_Labeled_Data.*, epoch FROM TM_Labeled_Data ORDER BY TimestampUTC DESC LIMIT 2000000000` |
| `user_interaction_event_log` | Contains all the raw Task Mining event data. |
| `user_interaction_event_log_history` | Contains all completed and fully-processed recording sessions. These are moved here for scalability/performance reasons. |

:


---

## task-mining/task-mining-desktop-application-browser-extensions--optional-

# Installing Task Mining browser extensions (optional)

While Task Mining captures information about user actions and interactions, like mouse clicks or when a user opens or closes an application, browser extensions can capture additional data.

Browser extensions allow data to be captured when a user visits a website, even if the user doesn’t directly interact with a displayed web page. The Task Mining data that is captured by browser extensions depends on custom rules you can set up for your Task Mining project.

For example, if an order form displays on a web page, you could set up a custom rule that captures the order ID, allowing this information to potentially be used in other analyses.

You can allowlist and denylist URLs, letting you specify which URLs Task Mining data can be captured from. There are separate browser extensions for Google Chrome and Microsoft Edge and typically you would install both.

For information, see:

- [Configuring browser extensions](https://docs.celonis.com/en/task-mining-configuration-editor.html#UUID-c24510ad-2c74-122f-5a56-1f4b691031ae_section-idm235043037705114).
- Event types and attributes whose capture requires browser extensions to be installed and enabled, see the [Task Mining data reference](task-mining-data-reference.html "Task Mining data reference").

Expand all

[## Before you begin](#id827447_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Have Google Chrome installed
- Have Microsoft Edge installed
- Created a Task Mining project

[## Browser extension install options](#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-id235127534162415_body)

Filter

- Installation option
- Description
- More information

| Installation option | Description | More information |
| --- | --- | --- |
| During installation of the Task Mining Client software. | Google Chrome and Microsoft Edge browser extensions are installed by default for all Task Mining Client install options. | [Task Mining Client software installation options](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845) |
| From Chrome Web Store | Download and install the Google Chrome and/or Microsoft Edge browser extensions from the Chrome Web Store if deselected during the Task Mining Client software installation.  **Note**  The permissions required to do this will depend on your organization’s internal policies. | [Installing browser extensions from the Chrome Web Store](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-id235127546065426 "Installing browser extensions from the Chrome Web Store") |
| Self-host browser extensions.  FROM 2.7.8 | Used if browser extensions are deselected during the Task Mining Client software installation and your organization's internal policies don't permit software installation from the Chrome Web Store. | [Installing self-hosted browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |

| Installation option | Description | More information |
| --- | --- | --- |
| During installation of the Task Mining Client software. | Google Chrome and Microsoft Edge browser extensions are installed by default for all Task Mining Client install options. | [Task Mining Client software installation options](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845) |
| From Chrome Web Store | Download and install the Google Chrome and/or Microsoft Edge browser extensions from the Chrome Web Store if deselected during the Task Mining Client software installation.  **Note**  The permissions required to do this will depend on your organization’s internal policies. | [Installing browser extensions from the Chrome Web Store](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-id235127546065426 "Installing browser extensions from the Chrome Web Store") |
| Self-host browser extensions.  FROM 2.7.8 | Used if browser extensions are deselected during the Task Mining Client software installation and your organization's internal policies don't permit software installation from the Chrome Web Store. | [Installing self-hosted browser extensions](task-mining-desktop-application-browser-extensions--optional-.html#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122 "Installing self-hosted browser extensions (from 2.7.8)") |

[## Installing browser extensions from the Chrome Web Store](#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-id235127546065426_body)

1. Open a browser you want to add the browser extension to.

   **Tip**

   Supported browsers are Google Chrome and Microsoft Edge.
2. Select the [browser extension](installing-the-task-mining-software.html "Installing the Task Mining software") you want to install based on your installed Task Mining Client software version.

   The Chrome Web Store browser extension page appears.
3. Select **Add to <browser name>** and confirm installation when prompted.

   An installation confirmation message appears.
4. Repeat steps **1** to **3** for the other browser type (recommended).
5. Select **Extensions** in your browser toolbar to view and manage your installed extensions.

   **Important**

   Chrome blocks newly-installed extensions if they have been deactivated or uninstalled manually in the past. In this case, install the Google Chrome and/or Microsoft Edge extensions from the Chrome Web Store and turn them on manually.

[## Installing self-hosted browser extensions (from 2.7.8)](#UUID-cd1416fe-58ff-2a93-c938-fabc2aee6fe1_section-idm235120880933122_body)

**Note**

You should consult appropriate third-party documentation for information on how to host an extension on your server and deploy it to users. You’ll need to be an admin to do this.

1. Download and self-host the Task Mining Chrome extension.
2. Note the new extension ID.
3. Install Task Mining with the **Set custom extension ID** option enabled.

   **Tip**

   You can do this:

   - In the Task Mining set-up wizard by ensuring **Celonis Task Mining Extensions** is enabled.
   - From the command line using `CUSTOMEXTENSIONIDS` (see [Task Mining command line examples](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_section-id235136335167165 "Task Mining command line examples")).
4. Test to validate the extension data is being captured correctly.

## Related topics

- [Installing the Task Mining Client software](installing-the-task-mining-client-software.html "Installing the Task Mining Client software")
- [Installing the Task Mining software](installing-the-task-mining-software.html "Installing the Task Mining software")
- [Working with Task Mining projects](working-with-task-mining-projects.html "Working with Task Mining projects")


---

## task-mining/task-mining-workforce-productivity-quickstart-template

# Working with the Workforce Productivity app

**Note**

If you have an older version of the Workforce Productivity app and want to migrate your setup and customizations to the newest version of the Workforce Productivity app, contact [Support](https://docs.celonis.com/en/support.html) for more information.

The Workforce Productivity app provides an analysis in Studio of the data captured for a Task Mining project including:

- How much time users spend on average using applications defined as ‘productive’ and ‘non-productive’.

- Which applications are used and for how long.

- How and when users use the Task Mining Client software and for how long each day, at both individual and aggregate user level.

You don't need the Task Mining Client software installed to access the Workforce Productivity app.

Expand all

[## Accessing the Workforce Productivity app](#UUID-3bf45bc1-af3e-fbad-f707-06f30de9ee63_section-idm235055543886855_body)

You access the Workforce Productivity app by selecting:

- **Go to Analysis** on the Task Mining project **Home** page; or
- **Studio** in the Celonis navigation bar, searching for 'workforce productivity' in the Studio overview then selecting the app package named after your project.

[## Understanding the Workplace Productivity app](#UUID-3bf45bc1-af3e-fbad-f707-06f30de9ee63_section-idm235031211045563_body)

|  |
| --- |
|  |

| Section | Description |
| --- | --- |
| Executive Summary | Displays an overview of:  - Working time by Task Mining project team members. - Productive time spent by the Task Mining project team. - Overall time spent by each Task Mining project team member on different software applications. |
| Capacity | Displays detailed information about whether Task Mining Project team members are on average working their expected hours at the times expected. |
| Productivity | Displays how much time Task Mining Project team members spend on average in productive applications and how much of their time is non-productive.  To get accurate productivity data, you need to configure the Workforce Productivity app. For more information, see [Configuring the Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app"). |
| Application Usage | Displays which applications and screens Task Mining project team members spend time on, as well as the:  - Actions users perform frequently. - Windows which are used most. - Applications Task Mining project team members swap between most frequently. - Applications that are most strongly associated with the most idle time during use.  To display Application Usage information, you need to classify applications and web pages as productive. For more information, see [Application and web page classification options](configuring-the-workforce-productivity-app.html#UUID-d4405b33-295a-0e22-36db-7f15ba1f3685_section-idm235051948270862 "Application and web page classification options"). |
| Copy & Paste Behavior | Displays information about how often Task Mining project team members copy and paste information from one application or document to another. |
| User Capturing Data | Displays which Task Mining project team members are using the Task Mining Client software and for how long each day, at both individual and aggregate Task Mining project team level. |
| Deep Dive | Displays the raw event data the Task Mining Client software is capturing from user machines. |
| User Validation | Displays information about the daily capture time, productive and non-productive time and idle time for individual Task Mining project team members.  This tab is hidden by default in the published app. |
| Application Usage By User | Displays the time individual Task Mining project team members spend in different applications.  This tab is hidden by default in the published app. |
| Settings | Displays and allows modification of:  - Data view information. - User attribute filters. - Employee working start and end time and employee cost. - Work day expectations. - Productive and non-productive applications. |

## Related topics

- [Configuring the Workforce Productivity app](configuring-the-workforce-productivity-app.html "Configuring the Workforce Productivity app")
- [Customizing the Workforce Productivity app](customizing-the-workforce-productivity-app.html "Customizing the Workforce Productivity app")
- [Task Mining data processing and scheduling](task-mining-data-processing-and-scheduling.html "Task Mining data processing and scheduling")


---

## task-mining/using-the-task-mining-client-software

# Using the Task Mining Client software

The Task Mining Client software is installed on your machine and captures clicks, scrolls and other actions you perform in standard business applications and documents. Depending on how Task Mining has been configured, data may be captured from web pages you visit and screenshots may also be taken of your desktop.

**Important**

Task Mining data cannot be captured without your consent and knowledge. For more information, see [Data privacy and security](task-mining-data-privacy-and-security.html "Task Mining data privacy and security").

Expand all

[## Before you begin](#id833179_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Downloaded the [Task Mining Client software](https://docs.celonis.com/en/installing-the-task-mining-client-software.html)
- Admin or Analyst role

[## Accessing the Task Mining Client software](#UUID-f2e8670f-f5df-9a91-678e-8d9f077c4888_section-id235210828483043_body)

1. Open the Task Mining Client software.

   **Tip**

   Search for Celonis Task Mining in your Windows task bar. If you can’t find it, you’ll need to [install](installing-the-task-mining-client-software.html#UUID-47b9f95e-3fe7-fd72-96cd-7de20796ea1a_UUID-0a3d8b5a-4d28-c971-27cf-b59c92b5ff97 "Installing the Task Mining Client software (command line)") it.
2. Read the data privacy information in the window that pops up.

   This window will appear every time you open the Task Mining Client software. You can view the data privacy information at any time by selecting **Help** > **Privacy Settings**.
3. Select whether you agree to the terms of the data privacy text and:

   1. Confirm you want to continue; or
   2. Disagree and quit.

   If you confirm you want to continue, the Task Mining Client software opens.

   |  |
   | --- |
   |  |

## Working with the Task Mining Client software

| Task | Action | Description |
| --- | --- | --- |
| Start Task Mining data capture. | Select **Start**.  |  | | --- | |  | | Manually starts Task Mining data capture.  If the Task Mining Client software has been configured to start capturing data automatically as soon as the Task Mining Client is started, you won't need to start Task Mining data capture. For more information, see [Logging](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114 "Logging").  **Important**  The Task Mining Desktop software will only start to capture data if you've already accepted the legal terms. You can always start or stop Task Mining manually, even if the Task Mining Client software has been configured to start capturing data automatically. For more information, see **User Consent** in [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |
| Pause Task Mining data capture. | Select **Pause**.  |  | | --- | |  | | Manually pauses Task Mining data capture.  If the Task Mining Client software has been configured to start capturing data automatically as soon as the Task Mining Client is started, you will not be able to pause Task Mining data capture. For more information, see [Logging](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114 "Logging"). |
| Stop Task Mining data capture. | Select **File** > **Quit Celonis Task Mining**. | Closes the Task Mining Client software.  **Important**  If you close the Task Mining Client software window, the Task Mining Client software is still active in the background and will continue to capture Task Mining data. You must use **Quit Celonis Task Mining** to stop data capture. |
| Check whether the Task Mining Client software is running. | Check if the Task Mining icon  is displayed in your Microsoft Windows system tray. | The Task Mining Client always shows the icon in the Microsoft Windows system tray if Task Mining data capture is running or paused.  **Tip**  Right-clicking the icon displays a menu that lets you open/close the Task Mining Client software window and pin the Task Mining icon to the Windows taskbar. |
| View error logs. | Select **File** > **Show Error Logs**. | Opens the window which shows errors logged by the Task Mining Client software. For more information, see [Working with Task Mining data.](working-with-task-mining-data.html#UUID-61b3ec4f-aa79-9e8b-14de-fe2c30820918_section-idm235112434712441 "Task Mining data capture quick reference")  If the Task Mining Client software crashes due to an unexpected error, you can view the details in a file called `crashreport_XXX` in your home directory. |
| Add a comment to an activity. | Select **Annotate Activity**.  |  | | --- | |  | | Opens a screen where you can add a comment describing your activity. The comment will be stored as an event and is used to provide additional context. |
| Ensure latest client settings are being used. | Select **Configurations** > **Reload Client Settings**. | Updates the client settings if the Task Mining Client software configuration file changes. |
| View the applications and events being captured. | Select **Configurations** > **Show Configured Applications**. | Opens a new window that shows all the configuration settings, captured applications, events, interactions and whether screenshots are taken. |
| Change the Task Mining project. | Select **Configurations** > **Change Team** and paste the activation link for the new Task Mining project. | Changes the Task Mining project the Task Mining Client software is connected to and collects data for.  **Note**  The person who invited you to join the Task Mining project should provide you with the activation link. You should clear your Microsoft Windows cache before pasting the activation link. |
| Configure how public endpoints are accessed. | Select **Configurations** > **Proxy Settings**. | Configures whether public endpoints are accessed:  - Without a proxy. - With a system proxy. - Manually.  **Note**  We recommend contacting your admin for further information. |
| View information about the Task Mining Client software. | Select **Help** > **About Task Mining**. | Displays the Task Mining Client software version. |
| View the privacy statement. | Select **Help** > **Privacy Settings**. | Displays the privacy statement you agreed to before Task Mining data capture started.  Depending on how the Task Mining Client software has been configured, you either:  - See this privacy statement each time you open the Task Mining Client software; or - Previously accepted its terms if Task Mining Client software is configured to start data capture automatically when the Task Mining Client software starts.  **Important**  The Task Mining Desktop software will start to capture data only if you've already accepted the legal terms. For more information, see **User Consent** in [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Customizing the Workforce Productivity app](customizing-the-workforce-productivity-app.html "Customizing the Workforce Productivity app")
- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")


---

## task-mining/working-with-task-mining-data

# Working with Task Mining data

There are four stages to working with Task Mining data:

1. Task Mining data is captured from user machines and uploaded to the Celonis Platform.
2. The Task Mining data is stored in a Data Pool in the `user_interaction_event_log` table.
3. The Task Mining data is processed and stored in the `TM_Labeled_Data` table.
4. The processed Task Mining data is analyzed in Studio in the Workforce Productivity app.

The Data Pool and Workforce Productivity app are set up automatically when [a Task Mining project is created.](https://docs.celonis.com/en/creating-a-task-mining-project.html) You can also configure the Workforce Productivity app to ensure it displays data that is relevant for your organization and customize the default Workforce Productivity app View and the Knowledge Model used. For more information, see [Customizable components in the Workforce Productivity app](https://docs.celonis.com/en/customizing-the-workforce-productivity-app.html).

Expand all

[## Before you begin](#id830683_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Created a [Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")

[## Task Mining data capture quick reference](#UUID-61b3ec4f-aa79-9e8b-14de-fe2c30820918_section-idm235112434712441_body)

**Note**

See the [Task Mining data reference](task-mining-data-reference.html "Task Mining data reference") for a complete list of Task Mining event types and attributes.

Filter

- Data captured
- Description
- Set up/configuration required

| Data captured | Description | Set up/configuration required |
| --- | --- | --- |
| Mouse and keyboard events. | The Task Mining Client software captures clicks, scrolls, text entry and other actions performed by a user or Robotic Process Automation (RPA). | Task Mining Client software is [installed](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845).  For information on the default settings when you set up a Task Mining project, see [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |
| Specific user actions. | Use event processing rules to define the events, attributes and screenshots that are or are not captured for a Task Mining project. | [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data and screenshots from specific applications only. | Use event processing rules to allowlist or denylist specific applications. | [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data from specific websites only. | Use event processing rules to allowlist or denylist specific website URLs. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data from websites even if user doesn’t interact with the website content | Use custom web page data extraction rules to extract specific data. You can specify, for example, that only the URL is captured. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [Web page extraction rules](extensions.html#UUID-25662e1e-d5b5-e85f-6044-61fec36b6b16_section-id235234718034427 "Web page extraction rules") are defined and enabled. |
| Custom attributes like team or geographic location. | Specify up to five custom attributes, like team or geographic location, that can be used for analysis purposes. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [User attribute rules](user-attributes--from-2-8-1-.html "User attributes (from 2.8.1)") are defined and enabled. |
| Data from third-party application user interfaces. | Use Microsoft UI Automation (UIA) to collect data from eligible third-party applications.  **Note**  Applications that expose UIA are typically based on Win32 and .NET. For more information, see [Microsoft’s UI Automation documentation](https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32). | Use UIA is enabled. |
| SAP GUI component data.  FROM 1.2.1 | Retrieves detailed data from SAP GUI components the user interacts with, like labels and the names of edited fields. | Retrieve SAP data is enabled.  SAP is configured for Task Mining integration at both client and server sides. |
| Log data for the Task Mining Client software.  FROM 2.1.8 | A new log file is created each calendar day when the Task Mining Client software is used.  The log file contains log data about the Task Mining Client software is used by Support only. This log data is not sent to the Celonis Platform and does not contain captured Task Mining or user data. | Enabled in the Task Mining Client software and cannot be disabled. |

| Data captured | Description | Set up/configuration required |
| --- | --- | --- |
| Mouse and keyboard events. | The Task Mining Client software captures clicks, scrolls, text entry and other actions performed by a user or Robotic Process Automation (RPA). | Task Mining Client software is [installed](https://docs.celonis.com/en/installing-the-task-mining-client-software.html#UUID-bf4a0271-f436-bb53-2b9b-e958147e072d_section-id235127370366845).  For information on the default settings when you set up a Task Mining project, see [Task Mining basic client settings](creating-a-task-mining-project.html#UUID-d1ee4a8c-b786-fe4c-79f3-92c220f41791_section-idm235006902825571 "Task Mining basic client settings"). |
| Specific user actions. | Use event processing rules to define the events, attributes and screenshots that are or are not captured for a Task Mining project. | [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data and screenshots from specific applications only. | Use event processing rules to allowlist or denylist specific applications. | [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data from specific websites only. | Use event processing rules to allowlist or denylist specific website URLs. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [Event processing rules](event-processing-rules.html "Event processing rules") are defined and enabled. |
| Data from websites even if user doesn’t interact with the website content | Use custom web page data extraction rules to extract specific data. You can specify, for example, that only the URL is captured. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [Web page extraction rules](extensions.html#UUID-25662e1e-d5b5-e85f-6044-61fec36b6b16_section-id235234718034427 "Web page extraction rules") are defined and enabled. |
| Custom attributes like team or geographic location. | Specify up to five custom attributes, like team or geographic location, that can be used for analysis purposes. | [Google Chrome and/or Microsoft Edge browser extensions](task-mining-desktop-application-browser-extensions--optional-.html "Installing Task Mining browser extensions (optional)") are installed.  [User attribute rules](user-attributes--from-2-8-1-.html "User attributes (from 2.8.1)") are defined and enabled. |
| Data from third-party application user interfaces. | Use Microsoft UI Automation (UIA) to collect data from eligible third-party applications.  **Note**  Applications that expose UIA are typically based on Win32 and .NET. For more information, see [Microsoft’s UI Automation documentation](https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32). | Use UIA is enabled. |
| SAP GUI component data.  FROM 1.2.1 | Retrieves detailed data from SAP GUI components the user interacts with, like labels and the names of edited fields. | Retrieve SAP data is enabled.  SAP is configured for Task Mining integration at both client and server sides. |
| Log data for the Task Mining Client software.  FROM 2.1.8 | A new log file is created each calendar day when the Task Mining Client software is used.  The log file contains log data about the Task Mining Client software is used by Support only. This log data is not sent to the Celonis Platform and does not contain captured Task Mining or user data. | Enabled in the Task Mining Client software and cannot be disabled. |

[## Viewing Task Mining data](#UUID-61b3ec4f-aa79-9e8b-14de-fe2c30820918_section-id235219505043673_body)

Filter

- Data
- Display location
- More information

| Data | Display location | More information |
| --- | --- | --- |
| Captured Task Mining data. | Workforce Productivity app in Studio. | [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app"). |
| Preview captured Task Mining data. | Task Mining Configuration Editor.  **Note**  You use the preview to verify configuration settings only. | [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects"). |
| Realtime Task Mining data captured for test and verification purposes. | The Live Event Monitor displays the Task Mining data as it will be sent to the Celonis Platform including:  - All captured data fields. - Specified configurations including hashing.  **Note**  The Live Event Monitor is used to verify the Task Mining Client software is capturing data as expected and allows changes to configuration settings to be tested. This data is not sent to the Celonis Platform. | [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software").  [Logging](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114 "Logging"). |
| Log data for the Task Mining Client software.  FROM 2.1.8 | Accessed from the Task Mining Client software.  The log file contains log data about the Task Mining Client software and is used by Support only. This log data is not sent to the Celonis Platform and does not contain captured Task Mining or user data. | [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software"). |

| Data | Display location | More information |
| --- | --- | --- |
| Captured Task Mining data. | Workforce Productivity app in Studio. | [Working with the Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app"). |
| Preview captured Task Mining data. | Task Mining Configuration Editor.  **Note**  You use the preview to verify configuration settings only. | [Configuring Task Mining projects](configuring-task-mining-projects.html "Configuring Task Mining projects"). |
| Realtime Task Mining data captured for test and verification purposes. | The Live Event Monitor displays the Task Mining data as it will be sent to the Celonis Platform including:  - All captured data fields. - Specified configurations including hashing.  **Note**  The Live Event Monitor is used to verify the Task Mining Client software is capturing data as expected and allows changes to configuration settings to be tested. This data is not sent to the Celonis Platform. | [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software").  [Logging](task-mining-configuration-editor-settings.html#UUID-3d39f35d-5291-1506-2784-cb1421bc1379_section-idm235043037705114 "Logging"). |
| Log data for the Task Mining Client software.  FROM 2.1.8 | Accessed from the Task Mining Client software.  The log file contains log data about the Task Mining Client software and is used by Support only. This log data is not sent to the Celonis Platform and does not contain captured Task Mining or user data. | [Using the Task Mining Client software](using-the-task-mining-client-software.html "Using the Task Mining Client software"). |

## Related topics

- [Creating a Task Mining project](creating-a-task-mining-project.html "Creating a Task Mining project")
- [Customizing the Workforce Productivity app](customizing-the-workforce-productivity-app.html "Customizing the Workforce Productivity app")
- [Task Mining data reference](task-mining-data-reference.html "Task Mining data reference")


---

## task-mining/working-with-task-mining-projects

# Working with Task Mining projects

**Important**

We're removing support for API keys and moving to industry-standard OAuth authentication across the Celonis Platform. You must take action if you're using version 2.16 or earlier of the Task Mining Client software and/or want to continue using Task Mining projects that were created using version 2.16 or earlier of the Task Mining Client software. No action is required for later versions of the Task Mining Client software. For more information, see [Deprecating Task Mining API keys](https://docs.celonis.com/en/upcoming-changes.html#UUID-f083cadf-38e0-5378-a593-bdbdea4050f8_section-id23542675510497).

The capture of Task Mining data is organized by Task Mining project. A Task Mining project is created then configured individually to define the types of data that are captured. Users are invited to join the Task Mining project and once the Task Mining Client software has been installed on their machine and their consent obtained, users can start capturing Task Mining data. The captured data is stored in a data pool for the Task Mining project which was set up when the Task Mining project was created.

For example, a Task Mining project is created for a Finance Team in the US and a separate Task Mining project is is created for their European Finance Team. Local privacy laws mean different data can be captured in the US and in Europe so the Task Mining projects are configured differently to take this into account. US employees are invited to the US Task Mining project, while European employees are invited to the European Task Mining project.

Expand all

[## Before you begin](#id827884_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- Permissions to access and create Task Mining projects. For more information, see [Task Mining permissions](task-mining-permissions.html "Task Mining permissions").

[## Accessing a Task Mining project](#UUID-bece162e-25d9-ee2a-9d26-29e6f6bb0e60_section-id235213897356529_body)

1. In the Celonis Navigation bar, select **Data > Task Mining**.

   The Projects home page appears. Only the Task Mining projects you have access to display.

   |  |
   | --- |
   |  |

   **Tip**

   Select the three dot button to see who has access to a project. You can also rename and delete projects here, if you have the permissions to do so.
2. Select the Task Mining project you want to view.

   The Home page for that project appears.

   |  |
   | --- |
   |  |

[## Navigating a Task Mining project](#UUID-bece162e-25d9-ee2a-9d26-29e6f6bb0e60_section-id235213893523384_body)

**Tip**

You can also access the different Task Mining project screens using the buttons in the project navigation.

| Section | Description |
| --- | --- |
| Home page | Contains links to key screens for the Task Mining project. |
| View Analysis | Select **Go to Analysis** to see an analysis in the Studio Workforce Productivity app of the data captured for the Task Mining project.  For more information, see the [Workforce Productivity app](task-mining-workforce-productivity-quickstart-template.html "Working with the Workforce Productivity app"). |
| Configure Captured Applications | Select **Go to Client Settings** to configure your Task Mining project, including:  - What Task Mining data is captured. - Privacy settings. - Startup mode - User consent.  For more information, see [Working with Task Mining projects](working-with-task-mining-projects.html "Working with Task Mining projects"). |
| Invite Users to Capture Data | Select **Go to Users** to see the users who have been invited to your Task Mining project. You can also view their most recent activity, their configuration and whether they’re using the Task Mining Client software. You can invite users to your Task Mining project if have the permissions to do so. |
| Project Connection | Used to configure the connections used by the Task Mining project and provide the Application Key. Make changes to the settings and then select the **Save Configuration** button to update your configuration. |
| Run & Schedule | Used to configure, monitor, run and schedule the data transformation.  For more information, see [Task Mining data processing and scheduling](task-mining-data-processing-and-scheduling.html "Task Mining data processing and scheduling"). |
| Label | Create custom labels to organize your Task Mining event data.  For more information, see [Labeling Task Mining events](labeling-task-mining-events.html "Labeling Task Mining events"). |
| Business Events | Associates generic user action events with semantically-meaningful events to provide business context.  For more information, see [Creating Business Events in Task Mining](creating-business-events-in-task-mining.html "Creating Business Events in Task Mining"). |
| Tasks | Consists of a sequence of events that form a coherent unit of work and typically represent a user completing a set of actions towards a specific goal.  For more information, see [Grouping Task Mining events into Tasks](grouping-task-mining-events-into-tasks.html "Grouping Task Mining events into Tasks"). |

## Related topics

- [Task Mining permissions](task-mining-permissions.html "Task Mining permissions")
- [Configuring Task Mining data](configuring-task-mining-data.html "Configuring Task Mining data")
- [Working with Task Mining data](working-with-task-mining-data.html "Working with Task Mining data")


---

