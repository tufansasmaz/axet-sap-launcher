# Getting Started

## getting-started/getting-started-with-the-accounts-payable-starter-kit

# Getting Started with the Accounts Payable Starter Kit

1. Set up the connection for transferring data between Celonis Platform and your SAP system. You'll need to install the Celonis SAP Components in your SAP system, set up the extractor server, and configure a Data Connection in Celonis Platform. See [How do I set up my SAP data connection?](connecting-to-sap-and-s-4hana.html "Continuous Extractor for SAP ECC and S/4 HANA") for the instructions.
2. Install and configure the newest version of the Process Connector that the Starter Kit works with. This is the one shown on the Starter Kit’s Celonis Marketplace listing page as the required connector (for Accounts Payable, it's the SAP-ECC Accounts Payable Process Connector). The easiest way to get this is through the Process Connector library.
3. Download and install the Starter Kit app from the Celonis Marketplace, and link it to the Data Model that came with the Process Connector. [Installing the Accounts Payable Starter Kit](installing-the-accounts-payable-starter-kit.html "Installing the Accounts Payable Starter Kit") has the instructions to do this.
4. Check that the Machine Learning Sensor has run to activate the Duplicate Invoices view. [Activating Duplicate Invoices](activating-duplicate-invoices.html "Activating Duplicate Invoices") explains how to check.
5. Add the INEFFICIENCIES table to the Data Model to activate the Value Discovery App. See [Activating the Value Discovery App](activating-the-value-discovery-app.html#UUID-d7f64620-9c95-4760-fbe9-ef942da80f6f_UUID-e6430fcd-ba5c-db95-6e46-c82a33f78ba0 "Modifications to the Data Model").
6. Use the Validation Cockpit to check if all the fields in the Starter Kit views are populated and make any required fixes. You might need to make changes in your runtime variables, Knowledge Model variables, or KPIs to get the supplied Starter Kit tabs working. Then make any changes you want to the KPIs and views, to make them fit your business needs. See [Configuring the Accounts Payable Starter Kit](configuring-the-accounts-payable-starter-kit.html "Configuring the Accounts Payable Starter Kit").


---

## getting-started/getting-started-with-the-celonis-platform

# Getting started with the Celonis Platform

The Celonis Platform offers you a suite of process mining and intelligence features, helping you to integrate your data and then use that data to analyze, improve, and monitor your business performance across key metrics.

**Tip**

Before getting started, consider exploring [Industry reference architectures](industry-reference-architectures.html "Industry reference architectures"). Examples there show how data from different industries flows through the Celonis Platform architectural layers. If your specific industry isn’t listed, [Architecture layers explained](industry-reference-architectures.html#UUID-367714e0-4158-1c9f-53be-70b87ea78f93_section-id235176221867594 "Architecture layers explained") describes how each layer fits into your data landscape.

How you get started with the Celonis Platform, and the product areas and features you’ll use in it, depends on your role within your business. As job roles and titles vary across business and industries, we organize our content into the following main tasks many users work on:

- [Setting up and managing your Celonis Platform team](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-7fa98090-59b6-fd47-0345-945ec7f89f57 "Setting up and managing your Celonis Platform team")
- [Integrating data sources and capturing user interactions](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-7ae68809-3d39-1eb2-c85f-912d4b21f2e1 "Integrating data sources and capturing user interactions")
- [Creating applications and analyzing data](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-f83086ec-c1f7-5a98-8197-2795ba3d9f22 "Creating applications and analyzing data")
- [Viewing dashboards and using applications](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-c0099113-c21a-e97b-643d-4f99f6df76a4 "Viewing dashboards and using applications")
- [Managing your own user profile](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-4afe642a-2572-a05e-8dd8-aad82efaff5e "Managing your own user profile")

**Note**

The product features available to you and your team depend on your Celonis Platform license. If a feature is documented here but not visible in your account, contact your Celonis representative.

For a video overview of the Celonis Platform:

Click for sound

5:52

●●●●●●●●●

Introduction to Celonis Platform Navigation

Overview of Core Services

Data Integration and Modeling

Utilizing Celonis Studio for Data Analysis

Understanding Celonis Apps for Business Users

Exploring the Marketplace for Pre-Built Assets

Tracking Value with the Transformation Hub

Administrative Functions and Settings

Conclusion and Future Developments

Expand all

[## Setting up and managing your Celonis Platform team](#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-7fa98090-59b6-fd47-0345-945ec7f89f57_body)

All users belong to at least one Celonis Platform team, a collective group of people who all work for the same business or part of a business. Typically teams are organized based on locations or departments, however we leave that organization up to the businesses themselves. While users must belong to at least one team, there is no upper limit to the number of teams a user can belong to.

For each Celonis Platform team, admin permissions are assigned to individual users. These permissions allow the users to access the **Admin & Settings** area of the product, giving them the ability to control who can access the team, how they can access it, and what permissions they hold once signed in.

These permissions include, but aren’t limited to, the following tasks:

- Configuring security features for the team
- Managing permissions
- Managing users, licenses, and platform activity

If you hold admin permissions for your Celonis Platform team or want to understand the features available to admins, see: [Admin & Settings](admin---settings.html "Admin & Settings").

**Note**

If you’re looking to manage your own user profile, including changing your password, head to [Managing your user profile](managing-your-user-profile.html "Managing your user profile").

[## Integrating data sources and capturing user interactions](#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-7ae68809-3d39-1eb2-c85f-912d4b21f2e1_body)

As you’re using the Celonis Platform to analyze, improve, and monitor your business process data, ensuring that you have the most recent data at your disposal is important. The majority of this data is captured in the software you’re already using to do your job, such as ERPs (Enterprise Resource Planning), CRMs (Customer Relationship Management), and even tools such as Google Mail or Microsoft Outlook. Some software will store this data itself, others will be linked to databases and data warehouses. As long as process data is being collected somewhere, it can then be extracted and integrated with the Celonis Platform.

The Data Integration process is typically managed by admins, IT leads, or data engineers and is summarized in the following high-level diagram:

|  |
| --- |
|  |

Let's look at a few key data integration areas here:

- [Extractor templates, quickstarts, and custom connections](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_section-idm234642321017262 "Extractor templates, quickstarts, and custom connections")
- [Object-centric process mining](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_section-idm23464232105549 "Object-centric process mining")
- [Task Mining](getting-started-with-the-celonis-platform.html#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_section-idm234642321227505 "Task Mining")

### Extractor templates, quickstarts, and custom connections

To help your business extract data from your software and databases and integrate it into the Celonis Platform, we offer a number of extractor templates and quickstarts. These wizard based templates guide you through securely configuring, testing, and running the transfer of your data from an external source into our platform.

Once you’ve connected your source systems and the data is in the Celonis Platform, it’s then modeled (which means to organize it in a way that is easier for you to use) and then made available to other product features.

In the following example, an Order to Cash quickstart has been used. This is integrating two data sources and includes scheduled data jobs and a Data Model. This Data Model is then used to create content in our Studio feature.

If you need to integrate data into the Celonis Platform or you want to understand our Data Integration features, see: [Data Integration](data-integration.html "Integrating your data").

### Object-centric process mining

Traditionally, process data was collected and modeled in a case-centric way. This means that the objects and events involved in a single instance of a process (a case) are recorded all together in an event log that tracks the case from beginning to end. This fixed format lets you access and analyze processes, but it isn't very flexible and can sometimes lead to inaccuracies.

To update this approach, you can also use the Celonis Platform to perform object-centric process mining. With object-centric process mining, we build a picture that's more like reality. Objects exist outside of the processes that they are involved in, and they can be involved in different processes, and in the same process more than once. Each event is identified as a single incident, which can involve one or many objects of different types. Object-centric process mining models the real world - not the world as a business system stores it.

To learn more about object-centric process mining, see: [Getting started](object-centric-process-mining-overview.html "Getting started with object-centric process mining").

### Task Mining

While our Data Integration features take the data that’s captured and generated by external systems during a business process, the Celonis Platform also offers Task Mining features.

Task mining captures user interaction data and makes this data available for you to use. This data is generated by everything people do on their computer while working. Tasks like filling in a Purchase Order, checking the amounts are correct in tools such as Excel, matching receipts to invoices in Adobe, or spending ten minutes on LinkedIn to research a prospect. Task mining collects and analyzes this data, such as clicks taken, copy / paste, time spent per application and other details, to reveal how teams execute work and find ways to improve employee experience and productivity.

In this example, the Task Mining features have been used to create a Workforce Productivity report:

To learn more about our Task Mining features, head to: [Task Mining (legacy)](task-mining-52968.html "Task Mining (legacy)").

[## Creating applications and analyzing data](#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-f83086ec-c1f7-5a98-8197-2795ba3d9f22_body)

With access to your process data, you can then use the Celonis Platform to turn that data into visual applications, dashboards, and insightful analysis. These tasks are typically managed by a Business Analyst, however the platform’s intuitive content creation features have allowed an increasing number of roles to contribute here.

For many use cases, our **Studio** product is your starting point. In **Studio**, you create, configure, and publish process focused applications for you and your team.

These **Studio** assets include, but aren’t limited to, Knowledge Models, Views, adherence analysis reports, and automated workflows:

- **Knowledge Models**: A Knowledge Model (KM) is a Studio asset used to centrally store and update reusable business entity definitions such as KPIs, variables, and attributes. These business entities can then be used and referenced in other assets, providing both the data and the business logic for how your published apps work. KMs take the data ingested from external systems and make it accessible and human-readable.

  For more about creating Knowledge Models, see: [Knowledge Models overview](knowledge-models.html "Knowledge Models").
- **Views**: Views allow you to visually display your data within an app, giving app users an interactive dashboard to engage with. Views can be created using a drag and drop grid-based canvas, where you can visually place, size, and configure view components. This interface also includes features that help you to build screen-fit views, organize your data into tabs, and undo/redo when needed.

  Learn how to create your own Views here: [Creating and configuring Views](creating-views.html "Creating and configuring Views").
- **Adherence analysis reports**: Our Process Adherence Manager (PAM) feature uses your Celonis Platform data to identify any deviations between your actual process and an ideal target process. PAM lets you analyze these deviations and determine their impact on process performance. By determining the root causes of deviations, PAM also helps you understand where and how you can improve your process.

  To configure your own process adherence analysis, read: [Process Adherence Manager](process-adherence-manager.html "Process Adherence Manager").
- **Automated workflows**: Using the drag and drop automation features available with the Celonis Platform, complete with a number of out-of-the-box third party integrations, you can create fully automated workflows. These workflows help you fix process inefficiencies, replacing the need for repetitive manual work (such as copying and pasting data into spreadsheets, hooray!).

  To start automating your workflows, you should check out: [Automation and Action Flows](automation.html "Automation").

The following example is a bench marking view from a Process Cockpit application, created using **Studio** Views:

|  |
| --- |
|  |

### Using the Celonis Marketplace

In addition to creating your own content, you can also use the **Celonis Marketplace** to install and customize an extensive collection of pre-built Studio content and applications.

In the Marketplace, you’ll find our Business Applications for common processes (such as Accounts Receivable, Order Management, and Procurement) and a selection of Starter kits for popular source systems (such as SAP, Oracle, and ServiceNow).

|  |
| --- |
|  |

### Using Process Query Language (PQL)

For more advanced users, the Celonis Platform offers its own query language in the form of Process Query Language (referred to as PQL). PQL enables users to translate process-related business questions into queries, which are then executed by a custom-built query engine. PQL covers a broad set of operators, ranging from process-specific functions to aggregations and mathematical operators. Its syntax is inspired by SQL, but specialized for process-related queries.

[## Viewing dashboards and using applications](#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-c0099113-c21a-e97b-643d-4f99f6df76a4_body)

The content you create in the Celonis Platform can be shared with your team, allowing them to productively use the dashboards and applications in a number of ways.

This includes using the platform's Apps feature, where the latest published versions of your Studio Views are available. Depending on the App configurations, you can then apply filters, enter values, and interact with the components.

In this example, a Process Cockpit application has been created containing a Process Explorer. The user can click through the main stages of a process to further filter the data displayed. And by using the Process Explorer, an analyst that see where inefficiencies lie and understand how to proactively improve them.

|  |
| --- |
|  |

To learn more about using applications, head over to [Using Apps](using-apps.html "Using Apps").

[## Managing your own user profile](#UUID-04143d70-7cb7-0560-3d51-1ec52732e414_UUID-4afe642a-2572-a05e-8dd8-aad82efaff5e_body)

All Celonis Platform users can manage their own user profile, giving them the ability to do things like change their password, update their view preferences, and manage their platform notifications.

To manage your user profile, in Celonis Platform, click your profile icon, and select **Edit Profile**.

To learn more about your profile options, head to [Managing your user profile](managing-your-user-profile.html "Managing your user profile").

**Note**

Some of the settings in your user profile may be managed via an external identity provider, such as your display name, email address, and password. If this is the case, the feature will be grayed out in your profile and this information must be updated on the identity provider directly.


---

## getting-started/getting-started-with-the-ml-workbench

# Getting started with the machine learning workbench

Build, schedule, and manage custom Python-based machine learning models in a fully hosted Jupyter environment integrated with your Celonis data.

When getting started with machine learning, we recommend the following topics:

## Creating and managing machine learning applications

To access the machine learning Python interface, you must first create a machine learning application. This application can then be assigned permissions and allocated resources such as CPU, memory, and storage.

For more information, see [Creating and managing applications](creating-and-managing-machine-learning-applications.html "Creating and managing machine learning applications").

## Scheduling machine learning notebooks

Machine learning notebooks can be executed on a recurring schedule within the Celonis Platform. By scheduling your notebooks you can control when they execute, determine the length of the timeouts, and set the maximum number of retries allowed.

For more information, see [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks").

## Managing machine learning resources and consumption

Active machine learning workbenches and the notebooks they contain consume resources, CPU, data storage, and most notably memory. These resources count towards your allocated Celonis Platform team resources, so attention must be paid to how much your existing machine learning workbenches are consuming.

For more information, see [Managing resources and consumption](managing-machine-learning-resources-and-consumption.html "Managing machine learning resources and consumption").

## Best practices for machine learning

To optimize your machine learning configurations, see [Best practices](machine-learning-workbench-best-practice.html "Machine learning workbench best practices").


---

