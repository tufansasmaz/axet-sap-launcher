# Analytics

## analytics/analysis/action---celonis--open-analysis

# Action - Celonis: Open Analysis

**Skills Deprecation**

Effective August 1st 2025, Skills features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Skills (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

To continue working with your process improvement and automation use cases, we suggest using our [Action Flows](action-flows.html "Action Flows in Celonis Platform"), [Views](studio-feature-availability-matrix.html "Studio feature availability matrix"), and/or [Orchestration Engine](orchestration-engine.html "Orchestration Engine") features.

The Open Analysis action enables business users to transition directly from a Signal in their Inbox to a specific Celonis analysis or View. This allows for deeper data exploration and root-cause analysis by pre-filtering the target analysis to the specific context of the Signal.

Expand all

[## Before you begin](#UUID-299cdf95-0554-b610-ed0f-6898a9eef6d3_section-id235521875244044_body)

Before configuring this action, ensure you have:

- The URL of the target analysis (if linking via Apps or a custom link).
- Permissions to access the specific analysis in the Celonis Platform Studio or Apps.
- Identified the Signal ID or specific attributes you wish to use for pre-filtering the data.

[## Configuring the action](#UUID-299cdf95-0554-b610-ed0f-6898a9eef6d3_section-id235521875280177_body)

To configure the action:

1. Navigate to the Action configuration section within your Skill setup.
2. Select Open Analysis from the action type dropdown.
3. Choose your link method:

   - Custom URL: Enter the link to an analysis or View within Apps. Note that filtering is disabled for direct links to Views.
   - Studio Analysis: Select the desired analysis from the Analysis dropdown menu.
4. (Optional) Define your Applied Filters:

   - By default, the filter uses the Signal ID to ensure the analysis opens to the specific record.
   - You can enter custom PQL filter statements to further refine the data the user sees upon arrival.
5. Save the configuration to attach the action to the Signal.

## Related topics

- [Skills](action-engine---skills.html "Action Engine - Skills")
- [User Routing](user-routing.html "User Routing")
- [My Inbox](my-inbox.html "My Inbox")


---

## analytics/analysis/analysis

# Analysis

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

An Analysis is a Studio package asset that helps you to identify execution gaps in your business processes. By creating and configuring an analysis, you can create a custom visualization of your as-is process and analyze the underlying data.

For more information about creating an Analysis within Studio, see: [Creating and publishing Analysis in Studio](building-an-analysis-in-studio.html "Creating and publishing Analysis in Studio").

And to see the available Analysis components you can configure and use, see: [Analysis components](analysis.html#UUID-55383417-d06b-7459-06a6-38f6746e9eeb_section-idm4526994782561634279262137844 "Analysis components").

## When to use Analysis

With the release of our enhanced Studio experience, you can now create and configure content using our enhanced Views, Legacy Views, and Analysis. While we recommend using our enhanced Views, you should consider your use case, the available feature set for each, and whether you have previously created content using that feature.

To help you identify whether to use Views, Legacy Views, or continue using Analysis, we recommend reviewing our feature availability matrix: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

**You should only continue using Analysis when:**

- You have configured an existing Analysis that is working for your use case and already adding value to your team.
- You have identified Analysis features that you would like to use that are only supported using Analysis (as opposed to Views or Legacy Views). These include the variant explorer, conformance checker, and print PDF.

## Analysis components

When creating an Analysis in Studio, you can use the following Analysis components:

- **New sheet**: This creates a blank sheet, allowing you to define your own Analysis.
- **Process AI**: Detect and analyze deviations from the most common path in your process. See: [Process AI](process-ai.html "Process AI").
- **Process Overview**: Get the main insights on your process. See: [Process Overview screen in Celonis 4](process-overview-screen-in-celonis-4.html "Process Overview screen in Celonis 4").
- **Process Explorer**: Analyze and understand your process. See: [Analysis - Process Explorer (Full Screen)](analysis---process-explorer--full-screen-.html "Analysis - Process Explorer (Full Screen)").
- **Conformance**: Compare the real process to your target process. See: [Analysis - Conformance Checker](analysis---conformance-checker.html "Analysis - Conformance Checker").
- **PI Social**: Understand how your team works together and where there are areas for improvement. See: [PI Social](pi-social.html "PI Social").
- **Case Explorer**: Inspect individual process cases. See: [Case Explorer](case-explorer-57477.html "Case Explorer in Analysis").

|  |
| --- |
|  |


---

## analytics/analysis/analysis---button-dropdown

# Analysis - Button Dropdown

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- The Button Dropdown is a combination of a Button and a Dropdown.
- It will be displayed as a dropdown menu on your analysis sheet, the entries can however be configured to work as buttons.

|  |
| --- |
|  |

### Configuring the Button Dropdown

|  |
| --- |
|  |

Type your desired title in the *Title* field.

The second option offers you a dropdown menu.

You can choose between *Manual Input* (which will create a dropdown menu of buttons) and *Load Entries* (which will create a dropdown selection).

**Manual Input**

If you choose *Manual Input*, you can add dropdown entries manually, using the  button.

This will create a button, that is listed in your button dropdown menu.

|  |
| --- |
|  |

As these configurations equal the configuration of a button, see [Buttons](analysis---buttons.html "Analysis - Buttons") to learn about the configuration.

To delete this button dropdown entry, use the small  icon on the upper left corner of the configuration.

You can add an unlimited number of buttons.

To change the listed order in the button dropdown list, you can rearrange the items by drag & drop using this icon: .

**Load Entries**

*Load Entries* is a great way to include a Dropdown list into your button dropdown.

The following configuration options are available:

|  |
| --- |
|  |

Most of these options are used in the dropdown component.

After entering your **Formula** (optionally using the Formula Editor), you could simply confirm the entries with .

This would give you an exact Dropdown component, which is a great way to create Selections.

However, a button dropdown can store the selected values in variables.

Use the **Write to variable** dropdown menu and choose any variable.

|  |
| --- |
|  |

Specifying a **separator** will help you to organize your data in your variable.

This might be important if you choose to store multiple values to your variable (with this button dropdown).

Values will be separated with this separator.

However, we recommend aligning the separator with the data type of your variable values.

A *,* might seem great for integer values but could lead to confusion with double values.

Use **wrapping characters** to apply wrapping rules to your entry.

You can "cut" the entry's value by *start* characters at the beginning and/or by *end* characters at the end.

*The escape character* is great if your entries are very long.

If you activate the **Allow multiple selections** checkbox, users can choose multiple values from the button dropdown.

If you activate the **Component is not filtered with selections** checkbox, previously applied selections in your analysis sheet won't affect this button dropdown (you will still see all entries that meet the requirements of your above-specified formula).


---

## analytics/analysis/analysis---buttons

# Analysis - Buttons

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

This will create a button on your analysis sheet. You can assign a lot of different functionalities to the button and use it as an action button to perform a certain action or to display a message (to offer hints or further information to the users of the analysis).

## Configuration

The following configuration options are available:

**Button title**

Enter your desired button title. It will appear on the button.

|  |
| --- |
|  |

After entering a title, the formatting options will appear.

|  |
| --- |
|  |

Use these options to adopt the font, its size, the text highlighting, its color, and the alignment of the title.

**Button action**

We do furthermore need to justify the action, that is performed when clicking the button.

Choose your action in the dropdown menu Button action. According to your choice, further options will appear.

The following options are available:

- **Open Tab**

The *Open Tab* option opens another Analysis Sheet.

You can specify the target sheet in another dropdown menu:

- **Show Message**

*Show Message* will open a pop-up window with a pre-defined message.

You can set a custom message in the text field:

|  |
| --- |
|  |

|  |
| --- |
|  |

- **Delete Selections**

*Delete Selections* will remove all Selections from the current analysis document.

If you defined selections in advance, they will be removed for this user's session, too. However, they won't be deleted from the document and will re-appear when reopening the analysis document.

|  |
| --- |
|  |

No further configuration is available.

- **Load Bookmarks**

You can load a certain bookmark using a button.

Select *Load Bookmark* and specify the bookmark:

|  |
| --- |
|  |

The bookmark and its associated selections will be activated.

- **Open Document**

With *Open Document* you can use the button as a link to another analysis sheet in another analysis document.

Therefore, the ID of the analysis sheet and the ID of the analysis document, that is to be targeted, is required.

|  |
| --- |
|  |

Both IDs can be obtained from the URL.

The URLs are built up following this syntax:

https://team.cluster.celonis.cloud/process-mining/analysis/d6526a34-9ebd-499c-9c88-fb08ab00e53f/#/frontend/documents/d6526a34-9ebd-499c-9c88-fb08ab00e53f/view/sheets/32ad3bb2-eccc-4253-9d25-3101a1c91496

This is your Document ID, this is your Sheet ID.

- **Open External Link**

Add a link to another section within Celonis Platform or not an external URL.

- **Set Variable**

Use your button to set a variable.

|  |
| --- |
|  |

- **Launch Sheet Indexing**

Refresh all Analysis Sheets.


---

## analytics/analysis/analysis---charts

# Analysis - Charts

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Chart types

### Column, line, area, and marker charts

Column, line, area, and marker charts all behave the same with the visual representation being the only difference:

1. Dimensions are concatenated and shown on the dimension axis.
2. KPIs are by default all shown on the primary value axis.
3. Click on the chart and drag and drop to create a selection.
4. Confirm, cancel or invert the temporary selection.
5. Open the component settings. (Only available in the analysis draft.)
6. Open the component filter. (Only available in the analysis draft.)
7. Download the component.

### Pie and donut chart

Pie and donut charts both show the concatenated dimensions as pieces and the size of each piece is defined by the first KPI.

1. The currently-visible dimensions are shown in the legend by default.
2. Click on a piece to create a selection.
3. Confirm, cancel or invert the temporary selection.
4. Open the component settings. (Only available in the analysis draft.)
5. Open the component filter. (Only available in the analysis draft.)
6. Download the component.

### Bubble plot

The bubble chart shows **exactly two** KPIs over a selected dimension.

1. The dimension you configure will be shown on the horizontal axis.
2. The first KPI will be displayed on the vertical axis.
3. The bubbles are rendered on the chart. The size is defined by the second KPI. Klick on the bubble to create a selection on the Dimension.
4. Confirm, cancel or invert the selection.
5. Open the component settings. (Only available in the analysis draft.)
6. Open the component filter. (Only available in the analysis draft.)
7. Download the component.

### Histogram chart

The histogram takes a KPI as an input and shows the case distribution on it.

1. The buckets of the KPI are shown on the horizontal axis.
2. The number of occurrences is shown on the vertical axis.
3. The buckets can be selected by click or drag and drop. After Confirming the selection the selected area will be split up again.
4. Confirm, cancel or invert the selection.
5. Open the component settings. (Only available in the analysis draft.)
6. Open the component filter. (Only available in the analysis draft.)
7. Download the component.

### Scatter plot

The scatter plot will plot a point for each case or other item you aggregate on.

1. The KPI selected for the horizontal axis.
2. And the KPI selected for the vertical axis defines the position of the elements.
3. Click on single points or drag and drop to create a selection.
4. You can define a grouping that is used to color the elements. You can click on the groups and create a selection on them.
5. Confirm or cancel the selection.
6. Open the component settings. (Only available in the analysis draft.)
7. Open the component filter. (Only available in the analysis draft.)
8. Download the component.

### Boxplot

A boxplot shows the distribution of a numerical value in a population of cases. This example shows the distribution of throughput time per case. We can also show multiple boxplots in one graph by adding a dimension to visualize the distribution of throughput time per case for each material, for example.

1. The distribution axis, throughput time per case.
2. The dimension axis, material.
3. Confirm or cancel the selection.
4. Open the component settings. (Only available in the analysis draft.)
5. Open the component filter. (Only available in the analysis draft.)
6. Click on single points or drag and drop to create a selection.
7. Hover over a boxplot to see information about the distribution of cases.


---

## analytics/analysis/analysis---charts-and-tables

# Analysis - Charts and Tables

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Data structure

Data shown in charts and tables are always structured in tables in the background. The difference is, how the dimensions are concatenated in the visualization. To understand which data points are shown to you, keep in mind that configured dimensions and KPIs will be structured in the background in the following way:

Filter

- Dimension 1
- Dimension 2
- ...
- KPI 1
- KPI 2

| Dimension 1 | Dimension 2 | ... | KPI 1 | KPI 2 |
| --- | --- | --- | --- | --- |
| A | 01 | ... | 2 days | 10k |
| B | 01 | ... | 5 days | 100 |
| B | 02 | ... | 0 days | 3k |
| ... | ... | ... | ... | ... |

| Dimension 1 | Dimension 2 | ... | KPI 1 | KPI 2 |
| --- | --- | --- | --- | --- |
| A | 01 | ... | 2 days | 10k |
| B | 01 | ... | 5 days | 100 |
| B | 02 | ... | 0 days | 3k |
| ... | ... | ... | ... | ... |


---

## analytics/analysis/analysis---charts-and-tables---settings

# Analysis - Charts and tables - Settings

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

### General settings

The general settings allow you to:

1. Switch between the settings sections.
2. Edit the title and switch the component type.
3. See which dimensions and KPIs are currently configured.
4. Jump to editing the dimension or KPI, apply to sort on it, remove it or resort by drag and drop.
5. Add new dimensions or KPIs.
6. Change the sorting of the component.
7. Apply advanced options:

   1. Hide and show the legend.
   2. Switch the layout to be vertical.
   3. Activate or deactivate tooltips.
   4. Display only distinct dimension entries.
   5. Exclude the component from being filtered by selections of other components.
   6. Disable selections on the component itself.
   7. Only on charts: Pin the scrollbar to the right.
8. Limit how many data points are shown at once.

### Diagram Area and Legend Options

In the diagram area and legend options you can:

1. Set the title and the title's format options.
2. Define the border options of the component: Thickness, style, color, and opacity.
3. Activate a component background
4. Activate and define the legend on charts.
5. And set the legend format options.

### Position line options (Charts only)

The position line will draw a line on the KPI axis after the definitions:

1. Set a name and delete the position lines at the top left.
2. Define a PQL statement set the label position, line thickness, line style, line color, opacity, and if the value is shown on the label.
3. Add a new position line.

### Dimension axis (charts only)

The dimension axis will define how the axis for your dimensions will be displayed:

1. Activate/deactivate the axis completely, set the line thickness, line style, color, and opacity.
2. Activate/deactivate the axis title.
3. Hide and show the axis labels and configure their text format.
4. Hide and show gridlines on the dimensions axis.
5. Hide and show the ticks on the dimension axis.
6. Column chart only: Set the distance between the single bars.

### Primary / Secondary value axis

The primary and secondary value axis setting defines how the KPI axis is visualized:

1. Activate/deactivate the axis completely, set the line thickness, line style, color, and opacity.
2. Activate / deactivate the axis title.
3. Hide and show the axis labels and configure their text format.
4. Hide and show gridlines on the dimensions axis.
5. Set the boundaries of values that are shown on the axis to the automatic or manual range.
6. Configure how the tick lines are displayed. Activate/deactivate them and define how many ticks are drawn.

### Data series settings (Tables)

The data series settings include all options on how the data returned from the engine will be interpreted:

1. Give the data series a title which will be shown in the table header and define the PQL statement.
2. KPIs only: You can activate shares in percentage. This will allow you to input a second PQL statement that is not split by the dimensions and the original KPI input will be divided by the result of the share in percentage statement. Therefore the share of a KPI in percentage will be the result.
3. Set the format options on the KPI or dimension.
4. Define the text color with default color and an optional color mapping to set a color threshold.
5. Define the background color for the table cells with the default color and an optional color mapping to set a color threshold.
6. Set the width of the column. By default this is the relative width, if horizontal scrolling is activated in the general settings, this is the number of pixels.

### Data series settings (Charts)

The data series options for charts follow the settings for the tables above with the following differences:

1. You can define on which axis the data series of a KPI is shown.
2. A color palette can be set, which colors the single data points with the palette's colors according to the dimension.
3. Data labels can be activated to be shown on top of the chart, where you can as well set the format, value, and exact positioning.

### Scatter plot options

The general options on the scatterplot are specific for the scatterplot component. All other advanced settings are shared with the other table and chart components.

1. Set the title in the title input
2. The dimensions on the horizontal and vertical axis can be set individually.
3. The default series color with the default color picker or define a color mapping. The color mapping will be applied according to one of the dimensions.
4. If you activate sorting, you can write a KPI or dimension that is used to sort your data points. Only the max. first 5000 values can and will be displayed in the chart.
5. You can group the data points by a dimension or KPI. This grouping will be shown in the legend and the data points will be colored by the groups.
6. In the advanced options, you can choose to display the data labels, deactivate selections and deactivate that the component is filtered by selections.

### Boxplot options

The general options for the boxplot are specific to the component:

1. Set the title.
2. Define your distribution axis.
3. Define your dimension axis.
4. Sort the boxplot by dimension or distribution.
5. Define the whiskers.
6. Define quartile colors.


---

## analytics/analysis/analysis-components

# Analysis Components

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

Components in Celonis Analyses allow you to visualize your process data or build up your analysis.

Celonis has five different categories of components, as described below. Specific important and new components are described on a specific page with examples and detailed description of the functionalities

- [Process Components](process-components-in-celonis-analyses.html "Process components in Celonis Analyses"): Visualize your activities and the way processes flow through them (Process Explorer and Variant Explorer).
- [Charts and Tables](analysis---charts-and-tables.html "Analysis - Charts and Tables"): Plot you data or group, segment and arrange them in tables ([OLAP Table](analysis---olap-table.html "Analysis - OLAP table"), [Pivot Table](analysis---pivot-table.html "Analysis - Pivot Table"), [World map](analysis---world-map.html "Analysis - World map"),)
- [Single KPI Components](analysis---single-kpi-components.html "Analysis - Single KPI components"): Track your data according to a single KPI.
- Selection Components: Helps the user create selections.
- [Design Components](analysis---design-components.html "Analysis - Design Components"): Create design elements for your analysis.

## Create Components

**Note**

You have to be in edit mode to add new components.

## New Component Section

You can create a new component with the:

1. **Component+** button at the top right.
2. **Add component** button on empty sheets.

**Note**

The new component section provides access to all analyses components for the Celonis analyses.

## Add Component

To add a component to a Analysis Sheet:

1. Click one of the components in the New Component Section.
2. Drag and drop it to the Canvas.
3. The component will be added to the sheet in its default setting and you can use the component options to define which data is shown to you.


---

## analytics/analysis/analysis---conformance-checker

# Analysis - Conformance Checker

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The conformance checker lets you automatically compare a reference process model with the actual process flows discovered from the data. The difference between the model and actual flows is returned in the form of a list of violations, which can include observed behavior that is not allowed by the model, as well as behavior that is in the model but not observed in reality.

The conformance checker is organized into sections. You can navigate across these sections by using the left-hand side navigation bar.

## Creating a conformance checker

|  |
| --- |
|  |

In a newly initialized conformance checker, there are four options available to define the process model:

1. ***Mine the target process***: Mine the process model from the data. A [variant explorer](process-components-in-celonis-analyses.html#UUID-16651822-26d1-b0af-07c5-638eb41a9cf4_id_ProcessComponents-VariantExplorer "Variant Explorer") will be shown, where you can then select which variants are included in the target process.
2. ***Upload process model***: Upload an existing .bpmn file containing the process model. The file must be in accordance with the BPMN 2.0 standard.
3. ***New process model***: Create a custom process model with the BPMN editor.
4. ***Pull from process repository***: Use an existing process model from the [process repository](process-repository.html "Process Repository").

## Explaining the Conformance overview screen

|  |
| --- |
|  |

The Conformance overview screen provides statistics on overall process conformance, the numerical impact of non-conformance on KPIs, and deviations from the process model detected by the conformance algorithm.

1. The percentage of conforming cases according to the defined process model.
2. How many cases are conforming and how many cases are not conforming. You can apply a filter on either set of cases by clicking ***Filter on Cases***.
3. The number of distinct violations that were found.
4. The number of distinct violations that are currently allowlist.
5. A graph of the conformance rate over time. The time frame can be adjusted using the dropdown or date selection at the top of the overview.
6. A comparison of KPIs for conforming vs. non-conforming cases. By default, throughput time and steps per case are shown. Additional custom KPIs can be added to the comparison in the KPIs section.
7. A list of distinct violations that were found. Note that the displayed percentages may not sum to 100% because a case can contain more than one violation. For each violation:

   - ***Add to allowlist*** will remove it from the list of violations. This only changes the calculations in the overview, not the underlying process model.
   - ***View cases in..**.* will filter the analysis on the cases with that violation and bring you to an existing sheet. This gives you the ability to isolate and further analyze an individual violation.

### Violation details

|  |
| --- |
|  |

A more detailed, full-screen view of each violation can be opened by clicking on the panel containing the violation.

In the header, the violation can be added to the allowlist or filtered on, as described above. Most of the statistics from the overview are also shown here.

#### Perform root cause analysis

|  |
| --- |
|  |

This feature detects root causes by computing the percentage of violating cases as well as the absolute number of violating cases for every unique value of a dimension. The dimension-value combinations are then ranked by lift. You can sort according to either metric with the buttons ***Sort by correlation strength*** and ***Sort by violations***. By default, all dimensions available in the data model are used. They can be customized in the PI configuration.

Types of violations:

- X is an undesired activity.
- X is a missing activity COMING SOON.
- X is followed by Y.
- X is executed as start activity.
- Incomplete case.
- Too complex.

## Allowlist

|  |
| --- |
|  |

The allowlist section lists all violations added to the allowlist from the overview.

If a violation is on the allowlist, it will still be included in the conformance calculations. However, it will be overridden and considered to be conformant for the purposes of the conformance checker. You can remove the violation from the allowlist by clicking ***Remove from allowlist***.

## View/Edit process model

|  |
| --- |
|  |

Once defined, the process model can always be viewed (by members) and edited (by analysts with sufficient permissions) from this section.

**Note**

BPMN (Business Process Model and Notation) is the global standard for process modeling. The process model is represented in BPMN 2.0 syntax, which consists of activities, connections, gateways, and start/end nodes. Other elements like annotations are ignored. To learn more about BPMN, visit <https://www.omg.org/bpmn/index.htm>.

Explanations of labels in the screenshot on the left:

1. Access to tools and elements that can be added to the model.
2. Click on a single element to see additional actions that can be taken on the element, e.g. changing the activity or type of gateway.

   1. |  |
      | --- |
      |  |
   2. |  |
      | --- |
      |  |
3. Using the action bar at the bottom of the page, the displayed model can be saved as a .bpmn file or in the process repository. ***Clear model*** will reset the conformance checker. Finally, when you have finished editing the process model, relaunch the conformance check by clicking the ***Launch analysis*** button.


---

## analytics/analysis/analysis---design-components

# Analysis - Design Components

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The primary purpose of design components is to enrich your analysis sheets with various design features.

The following components are available:

## Variable Input

## Button

|  |
| --- |
|  |

## Button Dropdown

|  |
| --- |
|  |

## Text Component

|  |
| --- |
|  |

## Image

|  |
| --- |
|  |

## Line

|  |
| --- |
|  |

## Logo

|  |
| --- |
|  |


---

## analytics/analysis/analysis---image

# Analysis - Image

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Example

Place an image on your analysis sheet!

With images, you can ease the look of your analysis. When creating a company template, this component is also useful for including your company's logo.

|  |
| --- |
|  |

## Configuration

The following configuration features are available:

|  |
| --- |
|  |

Celonis has one type of image: *Document Only.*

Document Only Images can only be placed among the same analysis document; shared images can be used among different analysis documents (within one project).

To upload an image, press the .

Choose an image from the file browser, and click on *open*.

All uploaded images will be placed in the *Document Only* section.

Click on any image to open the configuration options, which will appear below the image.

|  |
| --- |
|  |

Click on to delete this image.

**This can't be undone!**

With *Background color* you can specify a custom color for your image.

The image does not necessarily take all the available space that is assigned in the analysis sheet (through scaling), except for the case that the scaling meets the exact proportions of the original image.

*Image position* therefore moves the image to a certain corner of the available space.

|  |
| --- |
|  |

Don't forget to save your settings with .


---

## analytics/analysis/analysis-interaction

# Analysis Interaction

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- **Analysis Header** includes case coverage, selections, bookmarks, access to edit mode to publish and edit analyses.
- **Selections** can be applied from components and are shown in tabs in the header.
- **Exporting** functionalities allow the user to download .xlsx, .csv, or png files of components and a documentation.
- **Sheets** provide the possibility to include a structure in the analyses.

## Structure and Navigation

1. **Analysis Options:** The icon provides access to the analysis options.
2. **Case Coverage:** The case coverage at the top left shows you how many cases of the total dataset are currently selected.
3. **Selection Bar:** Active selections are shown in the selection bar that is applied to the whole analysis
4. **Share Selections:** Selections can be directly shared with other users (see [Bookmarks and Share Selections](bookmarks-and-share-selections.html "Bookmarks and share selections"))
5. **Edit:** An analyst can enter the edit mode, viewers do not have this option available.

**Viewer and Analyst**

In the screen above, the selection is the view of an analyst when in viewer mode (e.g. after having published the analysis). Permissions of viewers and analysts can be set in Admin & Settings and the difference between viewer and analyst is further described with examples in the section [Viewer and Analyst](viewer-and-analyst.html "Viewer and Analyst").

## Analysis Options

Analysis Options for the viewer are shown on the left, for the analyst in edit mode are shown on the right.

1. **Analysis Name:** The unique analysis name is shown here. The name of the analysis can be edited by analysts in workspaces
2. **Location:** See the Workspace where the currently opened analysis is located. By clicking you can go to the corresponding workspace.
3. **Last published:** This information shows you which user last published a new version of the analysis and when this version was published. Only analysts can publish analyses.
4. **Last data load:** Here you get shown when the last data load was executed.
5. **Analysis Settings:** Analysis Settings open the settings for the analysis.
6. **Duplicate Analysis**: An analysis can be saved with a new name. By default the analysis name + Copy (e.g. Purchase to Pay Copy) is generated. Once the analysis is saved the user gets automatically forwarded to the new analysis. The analysis is saved in the same workspace as the original analysis.

   |  |
   | --- |
   |  |
7. **Saved Formulas:** [Saved formulas](saved-formulas.html "Saved Formulas") are a useful tool to save PQL statements. The saved formulas may be also be used by other analysts in the analysis.
8. **Load Scripts:** [Load Scripts](load-scripts.html "Load Scripts") are scripts that automatically run when the analysis is loaded. With them, you are able to assure, for example, that your analysis always begins with a certain filter applied or with a selector option displayed.
9. **Process Explorer KPIs:** Process Explorer KPIs are used in the [Process Explorer](process-explorer.html "Process Explorer") component to modify the metrics calculated and displayed in it.
10. **Variables:** PQL statements can be saved as [variables](analysis-variables.html "Analysis variables") and re-used in different parts of your analysis.
11. **Activate LiveReload:** This option will switch in a live refresh session. The analysis session will be refreshed each 30s (can be changed in the URL) and updated to the new data. New data points are automatically shown in the charts and visualizations.

    **Important**

    This does not automatically reload your data but rather displays the newest content of your Data Model. If the Data Model does not change, no new data will be shown.


---

## analytics/analysis/analysis---line

# Analysis - Line

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Example

This is another tool to design your analysis sheet.

You can insert lines and turn them into arrows to separate, surround or highlight certain sections.

|  |
| --- |
|  |

*This screenshot shows four separate line components. three of them are configured as arrows.*

## Configuration

The following configuration options are available:

|  |
| --- |
|  |

Start choosing a **style**.

The dropdown menu offers the following options:

|  |
| --- |
|  |

Now let's choose a **color:**

|  |
| --- |
|  |

You can choose between different levels of thickness...

|  |
| --- |
|  |

... and set the type of your line, which will determine, whether your line is aligned vertical or horizontal:

|  |
| --- |
|  |

Finally, you can set your line to be an arrow:

|  |
| --- |
|  |

|  |
| --- |
|  |

(for horizontal lines) (for vertical lines)


---

## analytics/analysis/analysis---logo

# Analysis - Logo

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- The Logo component places your logo on your analysis sheet.
- You can set your logo in the System Settings.
- As soon as you drag and drop the component in your analysis sheet, the logo will appear.
- You can rescale it like every other component.
- However, no further configuration is available. (Remember, you can still make use of the Image component).


---

## analytics/analysis/analysis---olap-table

# Analysis - OLAP table

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The OLAP table shows all dimensions and KPIs configured in a table:

1. The dimension and KPI name are shown in the column headers. Click the header to change the table sorting or search in the dimension columns.
2. Click on a dimension and create a selection. Selected entries can be copied to the clipboard by right click and the available action.
3. Confirm, cancel or invert the temporary selection.
4. Open the component settings. (Only available in the analysis draft.)
5. Hide and show dimensions and KPIs.
6. Open the component filter. (Only available in the analysis draft.)
7. Download the component.

**Note**

To learn more, you can visit Celonis Academy on [creating dynamic analyses.](https://academy.celonis.com/learn/course/create-dynamic-analyses/create-dynamic-analyses)


---

## analytics/analysis/analysis---pivot-table

# Analysis - Pivot Table

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Pivot Table overview

The Pivot Table is a data processing component to show an KPI based on a minimum of two dimensions to apply sorting, averaging or summing of data. The component can be used to show information on a KPI in multiple levels and identify bottlenecks at first glance with common Celonis table settings.

**KPI**

- The selected KPI is displayed based on the selected dimensions. Multiple KPIs can be chosen and prepared by the analyst and the viewer can change between the KPIs under “Configure”.

**Dimensions**

- The dimensions are the basis for the rows and columns of the pivot table. The pivoting element is selected and can be changed in “Configure”.

**Summaries row (bottom) and column (right)**

- The selected KPI can be added to the table and show the aggregated data.

**Colour Mapping** can be applied in the settings to easier navigate through the data.

### Pivot Table main functionality and settings

1. **Dimensions**

   To use the pivot table at least create two, (best three) dimensions. The dimensions are defining the Pivot Dimension and the rows shown in the table.
2. **KPIs**

   The pivot table can only show one single KPI. Note that flexible switching between different KPIs can either be done under Configure (4) or by the use of variables. The selected KPI can also be added to a summary for each row and column.
3. **Pivot Dimension and Selected KPI**

   The pivoting element will define which dimension is used for the columns (4), the same applies for the selected KPI. For the initial set up of the pivot table, the first dimension and KPI in the list (1)(2) are selected automatically. The maximum number of pivoting elements that can be shown is 80.
4. **Hierarchy**

   The hierarchy shown in the rows of the pivot table is defined by the order of the dimensions in the settings and can be adjusted by the user under Configure (4).
5. **Summary of selected elements**

   The summary above the pivot table shows which pivoting element (“Pivot”), which KPI (“KPI”), and which dimensions (“Rows”) are selected. The maximum number of rows is 5.

**Note**

It is not possible to directly filter on a KPI. It is possible to select any pivoting element and any row. After one selection, the pivot table is reloaded.

### Pivot Table Configure Model

1. **Configure Model**

   By clicking on Configure (1) a model is accessible both for analysts and viewers. The user is able, once the pivot table is set up, to flexibly adjust the pivot table configuration. Adjustable are the pivot element, the row order, and the selected KPI. Common Celonis features like sorting and visible/invisible functionality are also included.
2. **Dimensions**

   The dimensions are listed with one of them is the pivoting element (3) which can be changed. The order of the other dimensions defines the hierarchy of the rows (4). The hierarchy can be changed with drag and drop and is defined with the first dimension in the list (which is not the pivoting element) is the 1st level row. The rows can be sorted and made invisible or visible. The maximum of the rows is limited to 5 and the pivoting element to 80.

   5. **KPIs**

   The pivot table can only show one single KPI. Note that flexible switching between different KPIs can either be done in the dropdown menu with a minimum of one KPI has to be defined for setting up the pivot table.

   6. **Done**

   By clicking on Done (6) the changes are applied and the pivot table is reloaded.


---

## analytics/analysis/analysis-settings

# Analysis Settings

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The analysis settings screen is useful to change general settings, insert loading scripts and set variables, formulas and process explorer KPIs.

To access it, simply click on the hamburger menu icon  on the top left of your analysis screen and select **Analysis settings**.


---

## analytics/analysis/analysis---single-kpi-components

# Analysis - Single KPI components

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- The single KPI components help you display and keep track of an individual metric of your analysis.
- Celonis has four single KPI components: Number, Fill, Radial and Gauge.
- We will explore their differences by comparing how they display information relative to the same KPI example.

## KPI example: Count of cases with a change of price

The selected KPI for demonstration is the number of cases that flow through the 'Change Price' activity.

We will also add coloring thresholds to the Single KPIs components for when this KPI passes 10%, 15%, 20%, and 30% of the total case count.

- KPI

  - Formula: SUM(MATCH\_ACTIVITIES(NODE['Change Price'] ))
  - Count: 55,567 cases (19.9% of total)
- Total case count (threshold)

  - Formula: COUNT\_TABLE("EKPO")
  - Count: 279,020 cases

## Number

|  |
| --- |
|  |

The Number is the most simple Single KPI component.

It displays only the value of the KPI and changes color automatically as it raises over the defined threshold values.

## Fill

|  |
| --- |
|  |

The Fill component is a bar whose content linearly fills as the KPI value grows closer to the threshold's upper bound. The Fill bar changes color automatically as it raises over the defined threshold values.

1. KPI numerical value: the value of the single KPI in analysis.
2. KPI relative value: graphical representation of how close the KPI is to the defined maximum threshold value.
3. Lower bound threshold: minimum value the KPI may have.
4. Upper bound threshold: maximum value the KPI may have (in this example: total case count).

## Radial

|  |
| --- |
|  |

The Radial component is a circle whose content fills as the KPI value grows closer to the threshold's upper bound. The Radial filled arc changes color automatically as it raises over the defined threshold values.

1. KPI numerical value: the value of the single KPI in analysis.
2. KPI relative value: graphical representation of how close the KPI is to the defined maximum threshold value.
3. Lower bound threshold (beginning or circle): minimum value the KPI may have.
4. Upper bound threshold (end of the circle): maximum value the KPI may have (in this example: total case count).

## Gauge

|  |
| --- |
|  |

The Gauge component gives a visual display of how close a KPI is to a given threshold dimension.

1. KPI value: the value of the single KPI in analysis.
2. Lower bound threshold: minimum value the KPI may have.
3. Upper bound threshold: maximum value the KPI may have (in this example: total case count).
4. 10% threshold: since the KPI value is between the 10% and 20% thresholds, the color of the Gauge component becomes one assigned to the 10% threshold.
5. 20% threshold.
6. 30% threshold.

**Note**

The main differentiation point of Gauge relative to the other KPIs is that it is the only one that exhibits on screen the thresholds set by the user (items 2 to 6). The thresholds are shown both by their numerical value and by the difference in the color swatch in the Gauge arc. Each threshold is also positioned on the arc according to its relative value to the upper bound threshold.


---

## analytics/analysis/analysis---text-component

# Analysis - Text Component

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- Use a Text Component, to display static or dynamic text in your analysis sheet.
- You may for example use a text component to display instructions, explanations, or further information regarding your analysis.
- However, you can also use it to display a dynamic number that is derived from a KPI.
- A great application of the text component is to display the net value or the number of orders in a process cockpit.
- Please note, however, that the numbers are derived from KPIs and therefore they are set up to follow selections.

|  |
| --- |
|  |

## Configuration

The following screenshot offers a sample configuration, displaying the Number of Purchase Orders with a short title:

|  |
| --- |
|  |

The following configuration options are available:

**Formatting**

You can format your Text component as every other component title.

|  |
| --- |
|  |

Choose a Font, specify its size, alter the text highlighting, the text color, its alignment, and add a hyperlink.

**Text Area**

Here, you can enter your text.

You can choose (and switch in between) between a normal text editor, and a BBCode editor.

|  |
| --- |
|  |

|  |
| --- |
|  |

**Formula**

To display dynamic content in your text area, you can make use of Formulas.

Click on .

This will open the well known Formula Editor.

Create your desired KPI and **name your formula**.

We will need this name to identify it in our text component.

After you have set up your formula, it will appear in the Formulas section:

|  |
| --- |
|  |

Use the icon to reopen the Formula Editor.

Use the icon to include this formula in your text.

This will create the following text in your text area:

```
${The Name Of Your Formula}
```

You can copy it and paste it anywhere within your text component.

Use the icon to delete your Formula.

**Background Options**

Set a background color for your text!

Activate the *Show background* checkbox, select a color and adjust the opacity.

|  |
| --- |
|  |

Component is not filtered with selections

If you don't want your text formula to be affected by *any* external selection, activate the *Component is not filtered with selections* checkbox.

|  |
| --- |
|  |


---

## analytics/analysis/analysis---variable-input

# Analysis - Variable Input

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

The Variable Input component allows you to override an existing variable defined for this analysis document.

On your analysis sheet, it appears as a single input field.

The selected variable will be overwritten with the value inserted into the variable field. However, these changes won't be saved globally to this variable (to do so, please refer to the Analysis Settings). The scope of the change is only valid for the user's instance of the viewer.

## Configuration

The following configuration options are available:

**Placeholder**

The placeholder text will be shown in the text field on your analysis sheet.

Please provide a name that can be easily understood by the users of the analysis document, as they can't inspect the affected variables.

**Write to variable**

Choose the variable that you would like to work with.

A list of all available Variables will show as a drop-down menu.

|  |
| --- |
|  |

Don't forget to save your settings .

**Variable default behavior**

The default value of the variable is set when the analysis is published. This means that when you refresh the page, your variable will reset to the value that was last published.


---

## analytics/analysis/analysis-variables

# Analysis variables

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Saving PQL statements as variables

PQL statements can be saved as variables and re-used in different parts of your analysis.

### How to use variables

Variables can be used in all text input fields and formula inputs in the analysis UI.

**Syntax**

```
<%=VARIABLENAME%>
```

Input components allow you to change the value in the text input or formula input within the variable. You can change the variable's content with:

1. Buttons
2. Button dropdowns
3. Input fields

### Managing Variables

|  |
| --- |
|  |

1. Variables can be managed in the analysis setting in the tab Variables.
2. Create new variables with the button 'Create variable'.
3. Search your existing variables with the search input.
4. All existing variables are listed in the table below 'My variables' and sorted by name.
5. Each variable shows which type of variable it is, a static value or text replacement.
6. In the last column, each variable previews its current value. In case of the static value, it shows a preview of the calculated value on text replacement it will show the currently stored text.

### Creating a text replacement variable

|  |
| --- |
|  |

The text replacement variable will put the text that it stores wherever you are using the variable in the analysis. You can share reoccurring text snippets all over the analysis.

1. The defined variable name will be used to call the variable in the rest of the analysis. Spaces and special characters are automatically replaced by '\_'.
2. There are two types of variables. You can switch between the types with the available dropdown.
3. On the textinput field, you can set the variable's value. Be aware, that this value can be overwritten by other components like a button. This input will always show the current value that is set on the analysis draft.
4. Remove the variable with the remove button. (Only available if the variable was saved once)
5. Duplicate the currently opened variable. The duplicate will be added to the list of your variables and '\_1' is added to the name.
6. Canceling will cancel all your changes and you exit the edit view for the variable.
7. Saving will apply your changes to the variable you were just editing.

**Note**

Nested variables are not supported.

### Creating a static value variable

Static value variables calculate the PQL statement you define and store the value. This static value can be reused all over the analysis. The calculation will respect the analysis loadscript but ignore component and sheet loadscripts and ad-hoc selections.

1. The defined variable name will be used to call the variable in the rest of the analysis. Spaces and special characters are automatically replaced by '\_'.
2. There are two types of variables. You can switch between the types with the available dropdown.
3. The PQL statement defined on the function input will be evaluated to the start of each session.
4. Refresh the preview if you change the PQL statement.
5. You can also use the full function editor to create the PQL statement.
6. Remove the variable with the remove button. (Only available if the variable was saved once)
7. Duplicate the currently opened variable. The duplicate will be added to the list of your variables and '\_1' is added to the name.
8. Canceling will cancel all your changes and you exit the edit view for the variable.
9. Saving will apply your changes to the variable you were just editing.


---

## analytics/analysis/analysis---world-map

# Analysis - World map

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- You can use the world map to visualize geo-locations of your process data.
- You can explore data points and answer questions such as 'which vendors are close by and have a good on-time delivery rate?'
- You can compare regional differences and discover insights from the local context.
- Please note that the maximum number of locations that can be shown on the world map is 1000

## World map options

The general options for the world map are:

1. Location dimension. This dimension expects location as input either as country code ('DE','US') or as geo-coordinates ('48.1,11.6').
2. The KPI you are interested in.
3. You can switch between different default map views (world, europe,..).
4. Define the color thresholds that are going to be shown on the world map.
5. Advanced options for further configuration of the map.


---

## analytics/analysis/building-an-analysis-in-studio

# Creating and publishing Analysis in Studio

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

You can either create an Analysis when you're creating a Studio package or add an Analysis to your existing Studio package, depending on your use case. This requires you to have a basic understanding of how Studio content is structured. For more information, see: [Workflow and content structure](studio-workflows-and-content-structure.html "Studio workflows and content structure").

## Creating an Analysis with package creation

You can create an Analysis asset when you're creating a Studio package. This creates a draft package with an empty Analysis asset.

To create a Studio package from your Studio space:

1. Click **Create Package**.

   |  |
   | --- |
   |  |
2. Configure your package using the following fields:

   - **Package name**: Internal reference for this package.
   - **Description**: Optional added information, allowing other team members to read more information about this package.
   - **Initial content**: Select Analysis.
   - **Data Model**: Select the Data Model to use for this package.
   - **Package key**: Edit or copy the package key if you need to give other applications access to this package.
   - **Language**: Select which language this package should use as its default language.

   |  |
   | --- |
   |  |
3. Click **Create**.

   The package is created and an Analysis asset is available.
4. You can now build and configure your Analysis using Analysis components:

   |  |
   | --- |
   |  |

## Adding an Analysis to an existing package

You can add an Analysis to an existing Studio package:

1. From the Studio package, click **New asset - Analysis**:

   |  |
   | --- |
   |  |
2. Configure your Analysis using the following fields:

   - **Name**: An internal reference for this asset.
   - **Key**: Automatically generated based on your Analysis name, but can be edited if required.
   - **Data model variable**: Select or create a Data Model variable to use in this asset.
   - Knowledge Model: Select a Knowledge Model to use in this asset.

   |  |
   | --- |
   |  |
3. Click **Create**.
4. You can now build and configure your Analysis using Analysis components:

   |  |
   | --- |
   |  |


---

## analytics/analysis/export-technical-documentation-of-analysis

# Export technical documentation of analysis

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

You can generate and export technical documentation of an Analysis.

This documentation contains general information as well as the Saved Formulas, Variables, Sheet Information and Selections pertinent to a particular Analysis.

The sheet information encompasses the applied sheet filters, components used, component filters, as well as the component dimensions in a nicely formatted hierarchy.

**Note**

Filters and selections are displayed as their underlying PQL code.

- Right-click on empty space in an Analysis Sheet and hover over the Export option.
- Export the documentation either as HTML or TXT.

  |  |
  | --- |
  |  |
- Open and navigate through the documentation to extract your desired information.


---

## analytics/analysis/faqs---analysis-ui

# FAQs : Analysis UI

## Analysis ID and Sheet ID and changes when moving or duplication analyses

| Question | Answer |
| --- | --- |
| **What is the Analysis ID?** | Each analysis link contains an analysis ID and a sheet ID:  example: .cloud/process-mining/analysis/343fa47c-1b34-457b-ba82-f9bf43b4d21a/link/frontend/documents/343fa47c-1b34-457b-ba82-f9bf43b4d21a/view/sheets/667c1e17-38b5-4244-a701-666d362f67e5/b/4cb38ded-6bfc-46e3-b583-f655fe81ddb2  Analysis ID in this link is: 343fa47c-1b34-457b-ba82-f9bf43b4d21a |
| **What is the Sheet ID?** | Each analysis link contains an analysis ID and a sheet ID:  example: .cloud/process-mining/analysis/343fa47c-1b34-457b-ba82-f9bf43b4d21a/link/frontend/documents/343fa47c-1b34-457b-ba82-f9bf43b4d21a/view/sheets/667c1e17-38b5-4244-a701-666d362f67e5/b/4cb38ded-6bfc-46e3-b583-f655fe81ddb2  Sheet ID in this link is: 667c1e17-38b5-4244-a701-666d362f67e5 |
| **Where can an Analysis ID and a Sheet ID be used?** | Analysis and Sheet IDs can be used to link the analysis to the action engine, transformation center, ML workbench, process automation and process repository. |
| **What changes CHANGE the Analysis ID and the Sheet ID?** | A new ID is generated and the links in the new ID are broken:  - Moving, deleting or duplicating an analysis creates a new analysis and therefore a new Analysis ID; if you duplicate an analysis, the initial Analysis ID stays the same but the new duplicated analysis will have a new Analysis ID. - Deleting a sheet removes the Sheet ID. - Duplicating a sheet creates a new sheet with a new Sheet ID. |
| **What changes DO NOT change the Analysis ID and the Sheet ID?** | These IDs remain the same and the links do not break:  - Renaming of analysis or sheet. - Any changes in the analysis settings. - Publishing new versions of the analysis. |
| **What happens to Analysis IDs and Sheet IDs if users duplicate or move the analysis between workspaces or between different teams?** | - There is always a unique Analysis ID so duplicating or moving the analysis between workspaces or to another teamwill lead to the creation of a new Analysis ID. - There is always a unique Sheet ID therefore duplicating or moving the analysis between workspaces or to another teamwill lead end to the creation of a new Sheet ID. |
| **What happens to bookmarks in the analysis if users duplicate or move an analysis between workspaces or teams?** | Bookmarks will be lost. This is because different teams, workspaces and analyses may have different users and copying all bookmarks created by all users creates an overhead. Bookmarks may be created manually after moving or duplicating analyses. |
| **What happens to existing links to Action Engine if users duplicate or move the analysis between workspaces or between different teams?** | Duplicating or moving an analysis inside one team does not break links to the Action Engine but moving to other teams breaks this link because the Action Engines in various teams are different. |
| **What happens to existing links to Transformation Center if users duplicate or move the analysis between workspaces or between different teams?** | - Duplicating or moving an analysis in one team or moving an analysis to another team will not include the link to the Transformation Center because a new Analysis ID will be created and that will break the link. - Duplicating an analysis in one team does not break links to Transformation Center in the original analysis unless the original analysis is deleted. |
| **What happens to the existing links to ML Workbench if users duplicate or move the analysis between workspaces or between different teams?** | - Due to the changes of Analysis ID on moving or duplicating the analysis, the links in ML Workbench will need to be manually fixed because ML Workbench will the old Analysis IDs from the other analysis. - The links to the original analysis won't break. |
| **What happens to the existing links to Process Repository, if users duplicate or move the analysis between workspaces or between different teams?** | You can add links to analyses in the Process Repository. Moving or duplicating analyses does not change the link in the process repository. You may manually update the links in the attributes in the repository. |

## Throughput time calculation

| Question | Answer |
| --- | --- |
| **Why does the throughput time differ in the Process Explorer and a Single KPI component?** | There are two possible reasons for this:  - **Rounding issues**: The throughput time in the Process Explorer is calculated with the SOURCE / TARGET operator by mapping the timestamps via REMAP\_TIMESTAMP to `SECONDS`. Afterward, the result is converted to `MINUTES`/`HOURS`/ `DAYS` in the frontend. If the throughput time calculation in the Single KPI is done by mapping the timestamps via REMAP\_TIMESTAMP to, this can cause differences in the two results. - **Different ways of calculation**: The throughput time in the Process Explorer is calculated by using the SOURCE / TARGET operator. If the throughput time calculation in the Single KPI is done with another operator, this might cause differences in the results. |
| **Why don't the throughput time numbers in the Variant Explorer add up?** | The variant explorer can show the throughput time in two different ways:  - The median throughput time of all cases belonging to a variant, right next to its case coverage. - The throughput time between each activity by switching the edge KPI to throughput time.  You might expect that adding all the throughput times between the activities will lead to the same number as shown right next to the case coverage. This is not always the case. A possible deviation is caused by adding median results. The throughput time is calculated by taking the median. In general, the median is more robust against outliers but there is no guarantee that the sum of medians of subgroups returns the same result as the median over the whole group. |

## Conformance calculations

| Question | Answer |
| --- | --- |
| **How do I use the results of the Conformance Checker in other parts of the analysis, for example in an OLAP table?** | You can store the conformance query to a variable. You can then build your advanced conformance analysis using the related PQL in other components. |
| **Where is it possible to see the Conformance Checker documentation and examples?** | The complete overview of the Conformance Checker and examples of using conformance queries in the analysis are provided [here](analysis---conformance-checker.html "Analysis - Conformance Checker"). |

## Other questions

| Question | Answer |
| --- | --- |
| **Are nested variables supported in the Analysis UI?** | Nested Variables are not supported in the analysis UI. They are supported in Views in the Studio. |
| **Are there restrictions for exporting data from analysis UI?** | See [Export](exporting--csv-and--xlsx-files-in-analyses.html "Exporting .csv and .xlsx files in analyses") for further information.  Overall, data export is allowed for full cloud solutions and a data model must exist in the event collection. Demo data models are not allowed for data export. |


---

## analytics/analysis/full-analysis-to-views-migration

# Full Analysis to Views migration

You can migrate your full Analysis content and setting to Studio Views with the migration wizard, enabling you to create dashboards and reports using our enhanced View editing experience. While Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong), no further feature development will take place. As such, we recommend you migrate your Analysis assets to Studio Views.

The migration wizard transitions the following Analysis assets and settings into a single View within the same Studio package:

- Analysis sheets (including all components, and component and sheet load scripts).
- Saved formulas.
- View variables.
- Knowledge Model variables.
- Analysis load script (Copied as View level predefined filter).
- Pinned selections (Copied as View level predefined filter).

The following features and settings are not migrated: Enable Export settings, bookmarks, and filter currently applied to the Analysis.

**Note**

The original Analysis is not altered by the migration and can be migrated multiple times.

Expand all

[## Before you begin](#UUID-24cc71bb-f18e-b983-541c-0b3648a1b6af_section-id235177987820432_body)

Before migrating your Analysis assets, you need the following:

- **Knowledge Model**: A KM in the same Studio package as the Analysis. The KM allows you to migrate your saved formulas and variables. See: [Knowledge Models](knowledge-models.html "Knowledge Models").
- **Edit Package permissions to the package where the Analysis is managed**: Edit package permissions are required as the migration creates a new View in the same package and updates the Knowledge Model.

[## Migrating your full Analysis to a View](#UUID-24cc71bb-f18e-b983-541c-0b3648a1b6af_section-id23517798786967_body)

1. From your Studio package, locate the Analysis asset and click **Options - Migrate to View**:
2. Optional: Enter a custom name for your new View, with the View automatically be titled in this format:

   ```
   Analysis - Migrated Analysis - (Date)-(Migration Time)
   ```
3. Select an **Associated Knowledge Model**.

   This KM must be in the same Studio package as the Analysis. Selecting the KM allows you to migrate your saved formulas.

   If your Analysis was already connected to a Knowledge Model, that Knowledge Model will be automatically preselected for you.
4. Select **Default migration**.

   **Note**

   The default option migrates all sheets (or the first 20 sheets if more sheets exist) to a new View. All saved formulas and associated variables are exported to the Knowledge Model and remaining variables are exported to the View.
5. Click **Migrate**.

   The migration runs and a summary is displayed.
6. Click **Open View** and review that the migration has been successful.

[## Custom migration of an Analysis to a View](#UUID-24cc71bb-f18e-b983-541c-0b3648a1b6af_section-id235178073376638_body)

In addition to a full migration, you can also use the migration wizard to run a custom migration of your Analysis to a View. This lets you select the individual sheets, saved formulas, and variables you want to migrate.

1. From your Studio package, locate the Analysis asset and click **Options - Migrate to View**:
2. Optional: Enter a custom name for your new View, with the View automatically be titled in this format:

   ```
   Analysis - Migrated Analysis - (Date)-(Migration Time)
   ```
3. Select an **Associated Knowledge Model**.

   This KM must be in the same Studio package as the Analysis. Selecting the KM allows you to migrate your saved formulas.
4. Select **Custom migration**
5. Click **Next**.
6. Select the sheets you want to migrate (maximum of 20 per migration) and then click **Next**.
7. Select the saved formulas and process explorer KPIs that you want to export to the selected Knowledge Model and then click **Next**.

   Associated variables will be exported automatically.
8. Select the variables used in components and load scripts and choose where they should be added and then click **Next**.

   Recommendation:

   - Variables that are used in saved formulas or are planned to be reused across Views should be moved to the Knowledge Model.
   - Variables that are only used within this Analysis should be moved to the View.
9. Review the migration configuration and then click **Confirm and Migrate**.

   The migration runs and a summary is displayed.
10. Click **Open View** and review that the migration has been successful.

[## After migrating your Analysis](#UUID-24cc71bb-f18e-b983-541c-0b3648a1b6af_section-idm1763517798772382_body)

After migrating your Analysis to a View, you can take advantage of the enhanced View editing experience. These enhancements include a drag and drop canvas, configurable View components, and a selection of filters.

We recommend starting with the following Studio content:

- [Views](creating-views.html "Creating and configuring Views")
- [Components](view-components.html "View components")
- [Filtering Views](views-filters.html "Filtering Studio Views")


---

## analytics/analysis/migrating-analysis-steps

# Migrating an Analysis step-by-step to Views

You can manually migrate individual Analysis assets to Studio Views. Our step-by-step guide explains e.g. how to move load scripts from Analysis to filters in Views, how to copy single or multiple components from Analysis to Views or how to export saved formulas to a Knowledge model. This is especially helpful when you only want to move single parts of your Analysis.

To migrate individual Analysis assets to a View, follow these steps:

Expand all

[## Before you begin](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm234983020500713_body)

Before migrating individual Analysis objects, you need the following:

- **Knowledge Model (KM):** A KM in the same Studio package as the Analysis. The KM allows you to migrate your saved formulas. See: [Knowledge Models](knowledge-models.html "Knowledge Models").
- **View**: A View in the same Studio package that uses the above Knowledge Model. This is where your new content will be created and published. See: [Views](creating-views.html "Creating and configuring Views").

[## Step 1: Checking for Analysis load script and choosing filter](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm234979317183205_body)

Load scripts automatically run when the Analysis is opened by a user, ensuring that configured filters or settings are applied to the content. If your Analysis is using a load script, you must select the migration filters you want to use in your View.

To check if your Analysis is using a load script:

1. Open the Analysis in edit mode and click **Options - Load Script**:
2. Is a load script being used?

   1. **YES**: If your Analysis is using a load script, you must choose a type filter to use. See: [Filter types](migrating-analysis-steps.html#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm234979358167946 "Filter types").
   2. **NO**: Proceed to [Step 2: Exporting the saved formulas and their variables to the Knowledge Model](migrating-analysis-steps.html#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm17652468988920892 "Step 2: Exporting the saved formulas and their variables to the Knowledge Model").

### Filter types

Filter

- Type
- Description
- Steps

| Type | Description | Steps |
| --- | --- | --- |
| Global Knowledge Model filter | By making a filter global it is going to be applied to all PQL statements in this Knowledge Model.  This is how the Analysis load script behaves. However, the difference is that the Knowledge Model is most likely used by several Views. Thus this setting makes sense if this filter should be applied to all PQL code of all Views using this Knowledge Model. | 1. Copy the load script filter statement. 2. Open the Knowledge Mode and [add a new filter](knowledge-model---filters.html "Knowledge Model - Filters"). 3. Enter a name for the statement. 4. Copy and paste the filter statement. 5. Toggle on the **Global Filter** setting. |
| Knowledge Model filter that is referenced by the View | You can reuse the filter statement in one View, or several as well as for individual component filters, but not all Views need to be filtered by it (compared with the global setting).  This makes sense if you have several Views in one Package that, before migration, were several Analyses with different load scripts. They still use the same data model and share metrics and attribute definitions and thus the same Knowledge Model. | 1. Copy and paste the load script filter statement. 2. Go into edit mode of your View and select the filter icon. 3. Create a custom filter (which you can save in the Knowledge Model). |
| Local View level filter | If there is no need to reuse this Filter for other Views or individual components you can also just save the filter statement locally in the View filter. | 1. Copy the load script filter statement. 2. Go to edit your View. 3. Click the filter icon and choose "Custom filter". 4. Paste the filter statement. |

| Type | Description | Steps |
| --- | --- | --- |
| Global Knowledge Model filter | By making a filter global it is going to be applied to all PQL statements in this Knowledge Model.  This is how the Analysis load script behaves. However, the difference is that the Knowledge Model is most likely used by several Views. Thus this setting makes sense if this filter should be applied to all PQL code of all Views using this Knowledge Model. | 1. Copy the load script filter statement. 2. Open the Knowledge Mode and [add a new filter](knowledge-model---filters.html "Knowledge Model - Filters"). 3. Enter a name for the statement. 4. Copy and paste the filter statement. 5. Toggle on the **Global Filter** setting. |
| Knowledge Model filter that is referenced by the View | You can reuse the filter statement in one View, or several as well as for individual component filters, but not all Views need to be filtered by it (compared with the global setting).  This makes sense if you have several Views in one Package that, before migration, were several Analyses with different load scripts. They still use the same data model and share metrics and attribute definitions and thus the same Knowledge Model. | 1. Copy and paste the load script filter statement. 2. Go into edit mode of your View and select the filter icon. 3. Create a custom filter (which you can save in the Knowledge Model). |
| Local View level filter | If there is no need to reuse this Filter for other Views or individual components you can also just save the filter statement locally in the View filter. | 1. Copy the load script filter statement. 2. Go to edit your View. 3. Click the filter icon and choose "Custom filter". 4. Paste the filter statement. |

[## Step 2: Exporting the saved formulas and their variables to the Knowledge Model](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm17652468988920892_body)

**Before proceeding with this step**: Go to your Analysis settings and saved formulas. Check whether your saved formulas are stored locally or in a Knowledge Model.

For example, in the below screenshot most of the formulas are already in the Knowledge Model, only one saved formula was stored locally on the Analysis. The export tooling will allow you to export this local saved formulas to the Knowledge Model.

If your saved formulas are already stored in a Knowledge Model, proceed to [Step 4](migrating-analysis-steps.html#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm176566665080345614 "Step 4: Copying and pasting components from an Analysis into a View").

If your have one or more saved formulas stored locally, export them to the Knowledge model that you want to use for the View.

### Scope of the export saved formulas and variables tool

This tool allows users to export [Saved formulas](saved-formulas.html "Saved Formulas") in Studio Analysis, and any formulas and variables used in those into the [Knowledge Model KPIs](knowledge-model---kpi.html "Knowledge Model - KPI") in the same package. Therefore no permission management is required while exporting.

To export formulas to a Knowledge Model in another package ensure that the same data model used is available in the destination package. You can do this through Package Settings, see [Variables](creating-and-managing-package-variables.html "Creating and managing package variables"). You can use the “Copy to” option to copy the Analysis to the destination package.

**Important**

Variables that are not used in a saved formula will not be migrated with this tool. This is to avoid cluttering the Knowledge Models with unused content. Most likely these variables are used directly in component configurations and will need to be migrated manually as part of the component migration. See [Step 4: Copying and pasting components from an Analysis into a View](migrating-analysis-steps.html#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm176566665080345614 "Step 4: Copying and pasting components from an Analysis into a View").

If your Analysis is connected to a Knowledge Model already, then saved formulas from the source “Knowledge Model” will not be selectable for export (to avoid duplication in the Knowledge Model).

### Steps to export saved formulas to a Knowledge Model

This GIF shows steps 2 to 9 below.

1. Make sure there is a Knowledge Model in the same package of the Studio Analysis to be migrated.

   [Learn more](knowledge-models.html "Knowledge Models") about what a Knowledge Model is and how it's used.

   1. Create a new Knowledge Model if you do not yet have one by following the directions in [Creating a Knowledge Model within an existing package](creating-knowledge-models.html#UUID-217aef5a-c1a4-01e1-c2ec-4898677b3206_section-idm4566304884336034280855442347 "Creating a Knowledge Model within an existing package").
   2. Ensure the same Data Model is used in this Knowledge Model as the Studio Analysis. A different Data Model being used will cause formulas to break.
2. Go to **Edit** mode in the Studio Analysis you are exporting from.
3. Click the hamburger menu in the upper left and select **Saved formulas**.
4. Click **Export to Knowledge Model** to start the export.
5. In the dropdown, choose the Knowledge Model to which you are exporting the formulas and their associated variables.

   Only Knowledge Models in the same package will appear in the dropdown.

   A warning message will appear if you select a Knowledge Model that does not share the same Data Model with your Studio Analysis, but you are able to proceed if necessary with the selected Knowledge Model.
6. Select the formulas that you’d like to export:

   - Search by name through the search bar.
   - Select the formula you would like to include in the export by checking the checkbox next to the formula.
   - Or click the checkbox on the header row to include all selectable formulas in the export.

   **Note**

   When exporting saved formulas to the Knowledge Model, we pay special attention to saved formulas that have the exact same name or the exact same PQL statement as existing KPIs in the Knowledge Model. This is to avoid overwriting any existing formulas in the Knowledge Model and help prevent duplicate KPIs.

   - **Same name**: Saved formulas that have the exact same name as already existing KPIs in the Knowledge Model, will not be selectable for export. Any component using the saved formula will automatically reference the Knowledge Model KPI in the View and the reference will be automatically adjusted.
   - **Same PQL with a different name**: If there is an existing Knowledge Model KPI that uses the exact same PQL but has a different name as your saved formula, we highlight this visually. You can decide 1) if you want to export the saved formula to the Knowledge Model anyway or 2) if you prefer to manually update the components in the View to use the already existing KPI.

   If you still want to export the saved formula, you will need to modify the formula either in Studio Analysis or in the Knowledge Model.

   Any variables nested within selected saved formulas will also be exported, and they are also included in this duplication check.
7. Click **Export** to export the selected formulas.

   When the export is complete, you will see a success message.
8. Close the window by clicking **Done** or go to the Knowledge Model by clicking **Open Knowledge Model**.
9. Click **Open Knowledge Model** to validate the export. On the KPI page of the Knowledge Model, find the Saved formulas.

   **Note**

   You will not see any variables in the Knowledge Model immediately. You can find the variables directly in the PQL editor when using the Saved formula in a component in a View.

[## Step 3: Checking if the sheet has a sheet load script](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm176372529821338321_body)

**Before proceeding with this step**: Check if the sheet from which you plan to start migrating components has a sheet load script.

1. Click the settings icon.
2. Select the **Load Script** tab.

If it does not have a sheet load script, proceed to

If it does have a sheet load load script, choose a filter type from the table below:

Filter

- Type
- Description
- Steps

| Type | Description | Steps |
| --- | --- | --- |
| Knowledge Model filter referenced by the View tab | This is useful if you expect to reuse the filter statement for other Views, tabs, or components. | 1. Copy the Load script filter statement. 2. Go into edit mode in your View and select the filter icon at View or tab level. 3. Create a filter (which you can save in the Knowledge Model). |
| Local View level filter  Local View or tab-level filter | If you don't need to reuse this filter for other purposes, you can simply save the filter statement locally in the View or tab filter. | 1. Copy the Load script filter statement. 2. Go to edit mode in your View and add a local filter at tab or View level. |

| Type | Description | Steps |
| --- | --- | --- |
| Knowledge Model filter referenced by the View tab | This is useful if you expect to reuse the filter statement for other Views, tabs, or components. | 1. Copy the Load script filter statement. 2. Go into edit mode in your View and select the filter icon at View or tab level. 3. Create a filter (which you can save in the Knowledge Model). |
| Local View level filter  Local View or tab-level filter | If you don't need to reuse this filter for other purposes, you can simply save the filter statement locally in the View or tab filter. | 1. Copy the Load script filter statement. 2. Go to edit mode in your View and add a local filter at tab or View level. |

[## Step 4: Copying and pasting components from an Analysis into a View](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm176566665080345614_body)

### Scope of the tool

The Copy & Paste component tool allows you to export components built in Studio Analysis to a View. Component filters are automatically migrated with all mappable configurations. Some components or component settings are not yet covered.

To learn more about available components in Analysis vs Views, refer to the [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

### Steps to copy one or more components from Analysis and paste into a View

1. Make sure there is already a View where you intend to copy the component into. This View should also use the same Knowledge Model that you export your saved formula to, in order to avoid component breaking after export. Refer to [Views](creating-views.html "Creating and configuring Views") for how to create a new View.

   To make it easier, you can open two different browser tabs in parallel - one tab with the Analysis you want to migrate and another with the new View.
2. Switch to **Edit** mode in the Studio Analysis from which you are copying components.

   |  |
   | --- |
   |  |
3. To choose the components you want to copy, you can select:

   - Individual components and copy them one-by-one.
   - Multiple components by selecting the first component, holding down the CTRL key as you select additional components, and then pasting the selected components into your View all at once.
   - All components in the Analysis using CTRL + A then pasting them all into your View.
4. Right-click any selected component and click **Copy to View**.

   |  |
   | --- |
   |  |

   You'll see a notification on the right side of the screen that the components have been successfully copied.

   |  |
   | --- |
   |  |

   **Note**

   If a selected component cannot be copied, a yellow notification will display, indicating which components could not be copied.
5. Open the View you’d like to paste the component into and select **Edit** mode.

   To make it easier, you can open two different browser tabs in parallel: one tab with the Analysis you want to migrate, and another with the new View.
6. Click **Paste from Analysis** on the right side panel under **Smart Suggestions** to paste the components into the View or use the CTRL + V or CMD + V keyboard shortcuts.

   |  |
   | --- |
   |  |
7. Manually arrange the components to create the desired layout and edit the copied components directly in the View as needed.

#### Troubleshooting

Here are some tips on troubleshooting if components throw (expected) errors after pasting the component in Views that require manual fixes.

##### Error message or no data

You may see an error or no data is displayed. This is likely caused by a missing formula in the Knowledge Model.

|  |
| --- |
|  |

You can click into the PQL editor for more information and resolve the issue by creating the missing formula or parts of the formula in the Knowledge Model used in this View.

|  |
| --- |
|  |

##### Column names do not appear as expected

You may see column names that do not appear as you expect, which is not unusual for columns where only the default name is used.

To make the names more readable, you can edit them in the “Columns” section of the **Settings** panel.

|  |
| --- |
|  |

|  |
| --- |
|  |

[## Step 5: Migrating bookmarked filters](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-id235364659407353_body)

For more information, see [Migrating bookmarked filters to Views](migrating-bookmarked-filters-to-views.html "Migrating bookmarked filters to Views").

[## After migrating your Analysis sheets](#UUID-4e805455-432b-e138-01c7-86ea1bad7114_section-idm1763498302997398_body)

After migrating your Analysis sheet to a View, you can take advantage of the enhanced View editing experience. These enhancements include a drag and drop canvas, configurable View components, and a selection of filters.

We recommend starting with the following Studio content:

- [Views](creating-views.html "Creating and configuring Views")
- [Components](view-components.html "View components")
- [Filtering Views](views-filters.html "Filtering Studio Views")


---

## analytics/analysis/migrating-analysis-to-studio

# Migrating Analysis to Views

You can now migrate your Analysis assets to Studio Views, allowing you to create your dashboards and reports using our enhanced View editing experience. This includes both step-by-step (load scripts, saved formulas, variables, etc.), full sheet, and full Analysis asset migration options.

While we continue to maintain Analysis (by fixing bugs and ensuring that performance remains strong), no further feature development will take place. We therefore recommend you migrate your Analysis assets to Studio Views.

## Before migrating your Analysis

Before starting the migration, check whether your Analysis uses Data Model name mappings to support language translations within the Analysis. If it does, you must import the Data Model name mappings into the package translation before starting your migration.

The syntax used in Analyses to reference Data Model name mappings is `#{name}`. This syntax will be automatically updated during the migration to `t(“name“)`. Once the name mappings have been imported into the package, the translations will be displayed.

**Warning**

Custom name translations stored locally in an Analysis will not be migrated.

For more information, see [Migrating translations from an Analysis to a View](managing-package-languages---translations.html#UUID-59030b36-7bae-0fe0-22ac-f5390d4faff9_UUID-121f79d2-c3bd-0dda-ec56-cb75bc644393 "Migrating translations from an Analysis to a View").

## Step-by-step, full sheet and full Analysis migration

- **Step-by-step:** You can manually migrate individual Analysis assets to Studio Views. Our step-by-step guide explains e.g. how to move load scripts from Analysis to filters in Views, how to copy single or multiple components from Analysis to Views or how to export saved formulas to a Knowledge model. This is especially helpful when you only want to move single parts of your Analysis.

  See: [Migrating step-by-step](migrating-analysis-steps.html "Migrating an Analysis step-by-step to Views")
- **Full sheet**: Alternatively, if you want to move the full Analysis over to Views, you can use our full sheet migration wizard. This wizard guides you through the migration of a full sheet (including all components, saved formulas and variables) to a View, saving you from manually exporting each element to the Knowledge Model or View.

  See: [Migrating full sheets](migrating-full-sheets.html "Migrating full Analysis sheets to Views")
- **Full Analysis**: You can migrate your full Analysis content and setting to Studio Views with the migration wizard, enabling you to create dashboards and reports using our enhanced View editing experience. The migration wizard transitions Analysis objects and settings into a single View within the same Studio package.

  See: [Migrating full Analysis asset](full-analysis-to-views-migration.html "Full Analysis to Views migration").

## After migrating your Analysis

After migrating your Analysis sheet to a View, you can take advantage of the enhanced View editing experience. These enhancements include a drag and drop canvas, configurable View components, and a selection of filters.

We recommend starting with the following Studio content:

- [Views](creating-views.html "Creating and configuring Views")
- [Components](view-components.html "View components")
- [Filtering Views](views-filters.html "Filtering Studio Views")

## Migration guide version history

- **Version 10.0 - April 2026**: Name mapping extended in Public Preview so user language preferences are respected.
- **Version 9.0 - March 2026**: Full Analysis asset migration, bookmark migration tooling and translation migration made Generally Available (GA).
- **Version 8.0 - February 2026**: Translation migration added in Private Preview.
- **Version 7.0 - January 2026**: Bookmark migration tooling added in Private Preview.
- **Version 6.0 - October 2025**: Full Analysis asset migration added in Private Preview.
- **Version 5.0 - June 2025**: The guide has been restructured, helping to break down the information into digestible chunks.
- **Version 4.0** **- February 2025**: Previously, saved formulas that have the exact same pql formula (but a different name) as an already existing KPI in the Knowledge Model, couldn't be selected for export. From now on, you can select them for export but we still show an information on hover to inform you about the potential duplicate.
- **Version 3.0** **- January 2025**: Added Copy sheet to View functionality.
- **Version 2.0 - October 4th 2024**: Added multi-select for copying and pasting components.
- **Version 1.0 - September 2024**


---

## analytics/analysis/selections-in-analysis-ui

# Selections in Analysis UI

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- Selections can be made by directly interacting with any component.
- Selection UI offers more advanced selection possibilities.
- Selections can be made by the viewer.

## Creating selections in the Analysis UI

1. Active selections are collected at the top of the analysis and shown in tabs. Those can be removed with the cross at the very right and the quick settings of each selection can be opened with a click on the tab.
2. **Click** the element you want to select. Selections can be created from each component.
3. New selections on components are temporarily selected. They can be **confirmed**, **canceled** or **inverted** with the on-component buttons or the temporary selection in the selection bar.

**Tip**

Temporary selections can be used to preview how the selection would affect the analysis.

## Selection UI

1. **Open the selection UI** to create selections with the help of a designated selection view. The selection UI has to be activated for viewers in the [general settings](analysis-settings.html "Analysis Settings").

   |  |
   | --- |
   |  |
2. Attribute selection allows you to select based on single values from the tables in your data model.
3. Activity selection allows you to select cases based on the activities they flow through, start, or end with.
4. The process flow selection allows you to select cases based on their process flow.
5. With the throughput time selection, you can select cases based on throughput times on single process flows.
6. Rework selections allow you to select cases based on the occurrence of single activities.
7. The crop selection will crop the process view in your analyses.

## Attribute selection

1. **Search** the data model tables.
2. **Select** the data model table and column you want to create a selection on.
3. **Search** the column's value.
4. **Select** and deselect the values in the list.
5. See the case coverage of your current selection.
6. Quickly **change** the selection type.

## Activity selection

1. **Search** the available activities.
2. **Drag and drop** from the list of activities to one of the selection type's boxes (4).
3. **Search** **the activities** and add them directly to the selection boxes.
4. **Drop** the selected activities to the selected types fields.
5. **Choose** if the filter applies to all or any of the activities that you selected.
6. See the case coverage of your current selection.
7. Quickly **change** the selection type.

## Process flow selection

1. **Select** from which activity the connection you want to filter on should start.
2. **Select** the activity to which the cases should flow.
3. **Choose** if the activities should follow each other directly, at any time, not directly or never.
4. See the case coverage of your current selection.
5. Quickly **change** the selection type.

## Throughput time selection

1. To filter on throughput times you can **select the starting activity** for the process flows you want to filter based on throughput time.
2. On the second input, you can **set the target activity** where the process flows should flow to.
3. You can **select on which range** of throughput times you want to filter the cases by putting in a start value, an end value of the range, and the time unit.
4. Alternatively, you can select the time range on the provided histogram below the flow selection.
5. For each of the two activities, you can select if you want to respect the first or last occurrence of the activities for the throughput time.
6. See the case coverage of your current selection.
7. Quickly **change** the selection type.

## Rework selection

1. On the rework selection, you can **select cases based on the number of occurrences** of single activities. Therefore you can select in the first dropdown from the list of all available activities.
2. The following inputs allow you to **set the range** of occurrences you want to select.
3. This range of occurrences can also be selected on the histogram below.
4. See the case coverage of your current selection.
5. Quickly **change** the selection type.

## Crop selection

1. The cropping selection will crop the current process view to everything that is visible between two activities you can set in the two dropdowns available here.
2. The graph will preview the resulting view.
3. See the case coverage of your current selection.
4. Quickly **change** the selection type.


---

## analytics/analysis/sheets-in-analysis-ui

# Sheets in Analysis UI

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

- Creation and configuration on a new sheet can be done only in the edit mode by an analyst.
- Sheet actions can be accessed by right click on the sheet tab name.
- Sheet options can be accessed with a double click on the sheet tab name.

## Sheet navigation in the Analysis UI

1. **Navigate to a sheet**: All sheets/apps in analyses can be navigated to with the tabs at the bottom.
2. All the following options and settings on sheets require you to switch the edit mode/draft. The draft can only be accessed if you have edit rights on the analysis.

## Creating sheets/apps in the Analysis UI

1. **Add a sheet** with the plus button next to all existing sheets at the bottom.
2. **Select to create** a new app/empty sheet or a fullscreen app such as the Process Overview, Process Explorer, Conformance, Social or the Case Explorer.

## Sheet actions in the Analysis UI

**Right-click the sheet tab to open the sheet actions.**

1. **Enter the sheet settings** to set a sheet filter.
2. **Duplicate** the sheet. This creates a copy of the sheet in the same analysis.
3. **Delete** the sheet.

|  |
| --- |
|  |

## Sheet options

**Double-click to open the sheet options.**

1. Set the sheet name.
2. Select the sheet format. Choose between a fullscreen option, which will adjust the sheet canvas to fit your screen, a fixed width which will set a fixed width of 1200px and allow you to set a custom height, and the A4 format for optimized layouts on sheets you want to export regularly.
3. On the load script, you can set sheet filters. Those follow the general filter syntax and will filter down all components used on the sheet.


---

## analytics/data-explorer/creating-data-explorer

# Creating Data Explorer

**Caution**

Data Explorer is in maintenance mode. Only critical issues that significantly impact the functionality will be addressed.

If you previously used Data Explorer, we recommend the enhanced features offered by the following products:

- **Insight Explorer**: Insight Explorer is an AI-powered Studio asset designed specifically to uncover observations from your Knowledge Model. See: [Insight Explorer](insight-explorer.html "Insight Explorer").
- **Studio Views**: Instead of a temporary exploration, you can build a Studio View to act as a permanent data validation dashboard. See: [Views](creating-views.html "Creating and configuring Views").
- **Knowledge Model (KM) and PQL editor**: Since Data Explorer relies on Knowledge Models, you can perform much of the same work directly within the Knowledge Model itself. See: [Knowledge Models](knowledge-models.html "Knowledge Models").

Data Explorer uses Knowledge Models as the only source of data. If your Data Model doesn’t have a Knowledge Model yet, we’ll automatically generate one for you when you start creating Data Explorer. The newly generated Knowledge Model will have the same name as the Data Model and it will contain all the records for the tables in your Data Model along with some default KPIs, for example, Count Table of each attribute.

**Note**

Data Explorer is available only for packages published within Studio and can’t be published into Views.

Expand all

[## Creating a Data Explorer](#UUID-3f76d715-b8e9-f35f-eec0-5802153cf3e1_section-id235497677097056_body)

To create a Data Explorer asset:

1. In Studio, next to the package name of your choice, click the plus button and select **Data Explorer**.

   |  |
   | --- |
   |  |
2. Give your Data Explorer a meaningful name.
3. Select the Data Model or Knowledge Model.

   **Note**

   If you select a Data Model that doesn’t have a Knowledge Model yet, we’ll automatically generate one for you. The generated Knowledge Model will have the same name as the Data Model.
4. Click **Confirm**.

   Your new Data Explorer has been created. You can start exploring your data using different features in the Data Explorer.

## Related topics

- [Insight Explorer](insight-explorer.html "Insight Explorer")
- [Views](creating-views.html "Creating and configuring Views")
- [Knowledge Models](knowledge-models.html "Knowledge Models")


---

## analytics/data-explorer/validating-data-with-data-explorer

# Validating data with Data Explorer

**Caution**

Data Explorer is in maintenance mode. Only critical issues that significantly impact the functionality will be addressed.

If you previously used Data Explorer, we recommend the enhanced features offered by the following products:

- **Insight Explorer**: Insight Explorer is an AI-powered Studio asset designed specifically to uncover observations from your Knowledge Model. See: [Insight Explorer](insight-explorer.html "Insight Explorer").
- **Studio Views**: Instead of a temporary exploration, you can build a Studio View to act as a permanent data validation dashboard. See: [Views](creating-views.html "Creating and configuring Views").
- **Knowledge Model (KM) and PQL editor**: Since Data Explorer relies on Knowledge Models, you can perform much of the same work directly within the Knowledge Model itself. See: [Knowledge Models](knowledge-models.html "Knowledge Models").

Data validation is an essential part of every Celonis project to secure data quality before handing it over to Data Analysts. After data extractions, transformations, and the creation of a Data Model, Data Engineers can use the Data Explorer to run an effective data validation within a single dashboard.

If you used the Data Explorer for all these validations, you can also directly share the Explorer with the Analyst for them to get familiar with your data model.

Expand all

[## Process mining data validation best practices](#UUID-702e52dc-eb8a-7051-62e7-f4983b1588f9_section-idm4555297596758433121460805778_body)

Data validation is an essential part of every Celonis project to secure data quality before handing it over to Data Analysts. Here are some ideas on how you can use Data Explorer to make sure that your data is reliable.

The main things that you can check are:

- if the data types of the columns are configured correctly,
- if the ranges of numbers and dates make sense,
- if and where Null values occur, and whether uniqueness is met where needed,
- and where outliers occur.

|  |
| --- |
|  |

1. Select column statistics.
2. Select a column.
3. View the distribution of the top ten values.
4. Check for null values.
5. Compare total entries against unique entries.
6. Validate formatting of your values.

Alternatively, you can validate date columns with the distribution over time tab as it is shown below:

|  |
| --- |
|  |

1. Select the distribution over time tab.
2. Choose the date column in which you are interested.
3. See the distribution over time for this date column.

[## Building and validating your Process Query Language (PQL) queries](#UUID-702e52dc-eb8a-7051-62e7-f4983b1588f9_section-idm4615619843230433569144378054_body)

After you validate your data, the next step of your journey with Celonis is to create your own PQL queries. The Data Aggregation tile is the right tool for you to start building your queries. The Data Aggregation feature helps you assemble your own PQL queries to add to your Knowledge Model. The visual interface lets you access your tables and data to build aggregations, and you can add custom PQL too. You can save the aggregations in the Knowledge Model as a KPI or attribute, with or without a filter. Below an example of what’s possible within Data Explorer.

|  |
| --- |
|  |

1. Switch to PQL
2. Use PQL when filtering your data
3. Select dimensions or create your own custom dimensions using the PQL editor.
4. Add your aggregations.
5. Check your common table.
6. Add more aggregations.

## Related topics

- [Insight Explorer](insight-explorer.html "Insight Explorer")
- [Views](creating-views.html "Creating and configuring Views")
- [Knowledge Models](knowledge-models.html "Knowledge Models")


---

## analytics/data-explorer/working-with-data-in-data-explorer

# Working with data in Data Explorer

**Caution**

Data Explorer is in maintenance mode. Only critical issues that significantly impact the functionality will be addressed.

If you previously used Data Explorer, we recommend the enhanced features offered by the following products:

- **Insight Explorer**: Insight Explorer is an AI-powered Studio asset designed specifically to uncover observations from your Knowledge Model. See: [Insight Explorer](insight-explorer.html "Insight Explorer").
- **Studio Views**: Instead of a temporary exploration, you can build a Studio View to act as a permanent data validation dashboard. See: [Views](creating-views.html "Creating and configuring Views").
- **Knowledge Model (KM) and PQL editor**: Since Data Explorer relies on Knowledge Models, you can perform much of the same work directly within the Knowledge Model itself. See: [Knowledge Models](knowledge-models.html "Knowledge Models").

Data Explorer is a Studio asset which allows you to quickly aggregate, drill down into subsets, and analyze your data. It also allows you to generate KPIs, Attributes and Filters and save them to your knowledge model.

Expand all

[## Filtering data](#UUID-1038183d-2793-fb58-1416-7ce289d43b5b_section-idm4555297600366433121427343542_body)

Filter your data to narrow down, broaden, or shift your focus on a subset of data tailored to your current interest. At the top of Data Explorer, click on the filter bar and start typing the name of the attribute you want to filter on. Once you find it, you can specify individual values to narrow down your results even more.

[## Grouping and aggregating data](#UUID-1038183d-2793-fb58-1416-7ce289d43b5b_section-idm4516163023001633121428427051_body)

When you want to analyze a subset of your data, you can group it by the specific attributes. From the **Table** drop-down select the table data for which you want to analyze, and toggle **Group and aggregate**. This will immediately display data from a selected table in a grouped fashion. From here, you can select attributes for which you want to display data and choose up to five standard aggregations from the following set: average, count, count distinct, max, min, media, quantiles, and sum.

Combine grouping and aggregating with filtering to best results and visualize relevant data. This can help you look at your data in perspective and draw some conclusions that can be useful in a decision making process. Depending on the data type of the attributes you are grouping, you can see different types of visualization.

- If your aggregation is switched off, your data is presented as a KPI list.
- If you’re aggregating by strings, your data is presented as a bar chart.
- If you’re aggregating by numbers or dates, your is presented as a histogram.
- If you’re aggregating two or three attributes, your data is presented as an OLAP table.

[## Exporting data explorations](#UUID-1038183d-2793-fb58-1416-7ce289d43b5b_section-idm4516530879124833121437590047_body)

Once you’ve established your perfect mix of filters and grouping settings, you can export them to your Knowledge Model to reuse them later or in different contexts as KPIs or Attributes.

**To save grouping and aggregation results to a Knowledge Model:**

1. To the right of the grouping and aggregation area, click **Save to Knowledge Model**.
2. Select how you want to save your choice:

   - **Save KPI** - save your aggregation as a KPI.
   - **Save KPI with filter** - save your aggregation, and the filter as a KPI.
   - **Save as Attribute** - save your grouping, and the aggregation as an Attribute.
   - **Save as Attribute with filter** - save your grouping, the aggregation, and the filter as an Attribute
3. Provide more details of your new KPI or Attribute and click **Save**.

## Related topics

- [Insight Explorer](insight-explorer.html "Insight Explorer")
- [Views](creating-views.html "Creating and configuring Views")
- [Knowledge Models](knowledge-models.html "Knowledge Models")


---

## analytics/kpi-snapshots/creating-kpi-snapshots

# Creating KPI Snapshots

KPI Snapshots allow users to capture KPI values at scheduled intervals, creating a record of KPI performance at any given point in time. Instead of recalculating KPIs dynamically against live data, KPI Snapshots store the calculated KPI results as historical data, enabling reliable trend analysis over time.

Expand all

[## Before you begin](#UUID-a01bff04-f672-5a32-5444-35513756674b_section-id235316640131906_body)

Before you can create KPI Snapshots, you must complete these prerequisites:

- **Set up user access**: As only team admins have access, you also need to provide access to the analysts who will create KPI Snapshots and track KPI values. Analysts can set up KPI Snapshots for Knowledge Models they have access to in Studio.

  To set service level permissions, see: [Managing Service level permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-81793645-0ab1-37f9-009c-c1c0e99b9234 "Managing Service level permissions").

  **Tip**

  For enterprise-wide value tracking, we recommend providing access to Analysts responsible for KPI and value tracking. Their familiarity with the KPIs and update cadence makes them well-suited to set up and maintain KPI Snapshots.
- **Configure KPI Snapshot data pool**: Once the service is activated, a KPI Snapshots data pool is created within the Celonis Platform team. This data pool behaves like a standard Celonis Platform data pool, with any created KPI Snapshots being saved to the data pool. Like the service permissions, initially only team admins have access to this data pool, so you need to provide access to an other users who will work with the raw data.

  To set data pool access, see: [Data Integration Data Pool permissions](available-permissions.html#UUID-0db85cb9-3c41-84ec-2e90-b2747b6dc1a9_UUID-3d909e01-84e9-653c-042a-6852558c93da "Data Integration Data Pool permissions").
- **Knowledge Model containing KPIs to track**: KPIs must be available in an accessible Knowledge Model before creating the snapshot.

  To learn more about Knowledge Models, see: [KPIs](knowledge-model---kpi.html "Knowledge Model - KPI").

[## Creating KPI Snapshots](#UUID-a01bff04-f672-5a32-5444-35513756674b_section-id235311084162434_body)

To create a KPI Snapshot:

1. From the main Celonis menu, click **More - KPI Snapshots**:
2. Click **+ Add KPI Snapshot**.
3. Configure the KPI source:

   - **KPI Snapshot name**: Enter a name for the snapshot, an internal reference only.
   - **Studio space**: Select the Studio space containing the Knowledge Model to use.
   - **Knowledge Model**: Select the Knowledge Model containing the KPIs you want to snapshot. The KPI Snapshot will use the latest published version of the model. If the Knowledge Model, or any KPIs or filters you want to use, isn't published, it won't appear in the selection dropdown.
4. Configure KPIs and attribute breakdowns to regularly take snapshots of:

   - **KPIs**: Select from the KPIs available in the Knowledge Model.
   - **Filtered by (optional)**: Select from the filters available in the Knowledge Model.
   - **Breakdown**: Select attributes to breakdown filtered KPIs by. An additional snapshot will be taken per attribute breakdown. Attributes not captured in filtered KPI will have a null snapshot.
5. Configure the snapshot schedule:

   - **Take snapshots on**: Select from daily, weekly, and monthly.
   - **On**: Select the days to take the snapshot on.
   - **At**: Select the time to take the snapshot on.
   - **Timezone**: Select the timezone to use.
   - **Start date / end date**: Select the date to start and end the snapshots on.
6. Click **Save**.

   The KPI Snapshot now runs as configured, with the results displayed on the overview page.

[## Deleting KPI snapshots](#id567855_body)

To delete a KPI snapshot:

1. From the KPI Snapshot list, click the **Delete** icon. The **Delete KPI Snapshot** modal will open.
2. Click the **Delete** button. Any corresponding KPI snapshots already taken will also be deleted.

   |  |
   | --- |
   |  |

## Tracking value with KPI Snapshots

KPI Snapshots can be used for enterprise-wide monitoring of KPIs or tracking of value realized from implemented solutions. To support this use case, the [Transformation Hub in Views app](https://docs.celonis.com/en/transformation-hub-in-views.html) is available in the Celonis Marketplace. You can choose to customize this app further for your organization’s use, or build custom views.

The Transformation Hub in Views app calculates the total value by summing all logged entries. Therefore, do not log the cumulative KPI (Total to Date). Instead, you must log only the incremental value (delta) to captures only the new value generated since the last log.

The easiest way to do this is by applying a filter within the KPI snapshot:

- **For Daily Snapshots**: Apply a filter on Date = previous day. Schedule for 00:05 (this ensures the entire day is covered).
- **For Weekly Snapshots**: Configure the KPI to filter items from the last 7 days only.

In some cases, a use case may require time-based filters. For example, when setting up the Transformation Hub in Views app based on KPI Snapshots, it's common practice for action-based opportunities to log the value realized filtered to the current date. Scheduling can become challenging: if the snapshot is scheduled at 23:00:00, the logged KPI value may not incorporate some changes happening later that night. If a snapshot is scheduled at 23:59:59, and the actual execution time is delayed by just one second, the time-based filter will pick the wrong date to filter on. Therefore, we recommend you schedule snapshots to occur shortly after midnight and filter on the previous day. You can do this with the following command:

`FILTER ROUND_DAY("Table"."TimestampColumn") = ADD_DAYS( TODAY(), -1);`

When using time-based filters, be sure to use the same time zone in the PQL that you are also using for the schedule. `TODAY()` uses UTC as its default time zone. As an example, if you are scheduling your snapshot for a certain time in the time zone ‘Europe/Berlin’, you should use `TODAY( ‘Europe/Berlin’)` in your filter to avoid inconsistent results.

## Related topics

- [Knowledge Models](knowledge-models.html "Knowledge Models")
- [KPIs](knowledge-model---kpi.html "Knowledge Model - KPI")
- [Views](creating-views.html "Creating and configuring Views")


---

## analytics/kpi-snapshots/kpi-snapshots

# KPI Snapshots

KPI Snapshots allow users to capture KPI values at scheduled intervals, creating a record of KPI performance at any given point in time. Instead of recalculating KPIs dynamically against live data, KPI Snapshots store the calculated KPI results as historical data, enabling reliable trend analysis over time.

For example, if teams update payment terms to improve results, historical KPIs might look better than they actually were. KPI Snapshots preserve the true historical view, letting you compare performance before and after changes and measure the impact of initiatives over time.

The benefits of using KPI Snapshots include:

- **Tracking historical performance**: Keep a true record of KPI values, even if underlying data changes later.
- **Comparing before and after**: Measure the impact of improvements or corrective actions.
- **Monitoring initiatives over time**: See how KPIs evolve and track progress across teams.
- **Combining enterprise-wide views**: Combine snapshots from multiple data pools and models to get a single, unified view.
- **Consistent reporting**: Build dashboards and reports that reflect both historical and current performance in one place.

## How KPI Snapshots work

KPI Snapshots are created by selecting a Knowledge Model that contains KPIs and configuring which KPIs, along with any optional filters or attribute breakdowns, should be captured on a recurring schedule. When a KPI Snapshot is taken, the selected values are stored in the originating data pool and shared to a centralized KPI Snapshots data pool for consistent reporting and analysis across teams and processes.

In this example diagram, KPI snapshots from multiple originating data pools are captured via their respective Knowledge Models. These snapshots are then stored in local KPI Snapshots Data Models, and subsequently consolidated into a centralized KPI Snapshots Data Pool for unified reporting and analysis across teams and processes.

## Related topics

- [Creating KPI Snapshots](creating-kpi-snapshots.html "Creating KPI Snapshots")
- [KPIs](knowledge-model---kpi.html "Knowledge Model - KPI")
- [Views](creating-views.html "Creating and configuring Views")


---

## analytics/machine-learning/celonis-machine-learning-sensor

# Celonis Machine Learning Sensor

The Celonis Machine Learning Sensor allows you to automate responses to complex data patterns by integrating advanced Python algorithms and machine learning models directly into your workflows. Unlike standard sensors that monitor simple thresholds, the ML Sensor identifies "Signals"—specific data incidents defined by sophisticated logic—to trigger automated Skills.

Integrating machine learning into your automation strategy provides several key advantages:

- **Advanced Pattern Recognition**: Detect complex data incidents that standard PQL or manual rules might miss, such as duplicate invoice patterns or predictive delays.
- **Real-Time Responsiveness**: The sensor automatically scans your Data Model for new Signals every time the model is reloaded or when KM/Skill changes are published.
- **Tailored Use Cases**: Leverage built-in ML templates for common scenarios or configure Custom ML Sensors to meet specific business requirements.
- **Proactive Operations**: Shift from reactive data monitoring to proactive intervention by triggering immediate actions (Tasks, Webhooks, or updates) as soon as a machine learning model identifies a risk or opportunity.

Expand all

[## Configuring a Machine Learning Sensor](#UUID-b49d8138-0842-a931-d4da-556c04f176a0_section-id23553778735246_body)

Follow these steps to set up a Machine Learning Sensor within your Celonis Studio environment:

1. **Open your Skill:** Navigate to Studio and open the specific Skill where you want to add the trigger.
2. **Select the Sensor**: In the Skill editor, click **Add Trigger** (or the + icon) and select **Machine Learning Sensor** from the list of available sensors.
3. **Define the Knowledge Model**: In the sensor settings, select the Knowledge Model (KM) that contains the data objects you wish to monitor.
4. **Choose the Use Case**: Select a Use Case from the dropdown menu. You can choose from:

   - **Pre-defined Use Cases**: Built-in ML logic provided by Celonis.
   - **Custom ML Sensor**: Select this to apply your own advanced Python algorithms.
5. **Configure Criteria**: Define the specific conditions or thresholds the ML model should look for to identify a "Signal."
6. **Save and Deploy**: Click **Save** and then **Deploy** your Skill. The sensor will now begin scanning your Data Model for Signals based on the reload schedule or model updates.

**Tip**

Ensure the Data Model referenced in your Knowledge Model is correctly mapped; the sensor relies on these data reloads to identify and act on new incidents.

## Related topics

- [Sensors](sensors.html "Sensors")
- [Celonis Smart Sensor](celonis-smart-sensor.html "Celonis Smart Sensor")
- [Triggering Skills with Webhooks](triggering-skills-with-webhooks.html "Triggering Skills with Webhooks")


---

## analytics/machine-learning/creating-and-managing-machine-learning-applications

# Creating and managing machine learning applications

Celonis offers a Python interface to build machine learning models directly on your data in real time. To access this interface, you need to create a machine learning workbench (MLWB) application.

When creating a machine learning workbench application, an application key with the same name is created within your Celonis Platform. This application key must then be assigned the necessary permissions to read and access your data model and data pool.

Expand all

[## Creating machine learning applications](#UUID-952b5eaf-8b21-3a94-485c-978a3ef7780b_section-id235487700516889_body)

1. Click **Data > Machine Learning**.
2. Click **New App**.
3. **Either**: Enter an app name, read and accept the usage information, and then click **Create**.

   **Note**

   The below features are only available for Celonis Platform teams with an upgraded machine learning license with dedicated increased resources.

   **Or**: Enter an app name, configure your resources, read and accept the usage information, and then click **Create**.

   The following resources can be configured for teams with an upgraded machine learning license:

   - **Application Type**: Select from Jupyter workbench, usage stats, and task mining certification.
   - **Memory limit**: Select the maximum limit in GB for memory consumption for this application.
   - **CPU limit**: Select the maximum limit in GB for CPU consumption for this application.
   - **Storage limit**: Select the maximum storage limit in GB for data used by this application.
   - **Productive**: When setting an app to productive, the resources are reserved and can't be allocated by another workbench. This ensures scheduled execution at all times and this setting override any automatic shutdown on workbenches.
4. To assign the application key the necessary permissions in your Celonis Platform, click **Options > Permissions**.
5. Select the necessary permissions and click **Save**.

   The application has been created and the correct permissions have been assigned.

To create a MLWB application and assign it permissions within your Celonis Platform:

[## Managing existing MLWB applications](#UUID-952b5eaf-8b21-3a94-485c-978a3ef7780b_section-idm4543401004299233746793140443_body)

Once created, you can manage your MLWB applications by clicking the options button:

These management options are available:

- **Edit**: Edit the application name and the number of days the logs for this application are collected.
- **Change Application Key**: Enter an existing application key ID here. Changing an application key will restart the app, interrupting any existing processes.
- **Permissions**: Assign permissions to this application, including assigning application level permissions to team members.
- **Move to Workspace**: This requires you to have access to at least one additional workspace, with the application being moved rather than duplicated to the new workspace.
- **Shutdown**: Displayed only when an application is currently open (either in your browser or elsewhere).
- **Delete**: Removes the application and associated data from your Celonis Platform. Deleting an application cannot be reversed and deleted applications can't be restored.

## Related topics

- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")
- [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks")
- [Running out of memory](running-out-of-memory-on-a-machine-learning-workbench.html "Running out of memory on a machine learning workbench")


---

## analytics/machine-learning/custom-machine-learning-sensor

# Custom Machine Learning Sensor

By integrating your own machine learning models directly into Celonis automation skills, you can move beyond standard logic and leverage advanced predictive algorithms to drive business actions. The Custom Machine Learning Sensor acts as a bridge between your data science environment and the execution layer of the Celonis Studio.

Using the Machine Learning Workbench, you can deploy custom Python scripts or notebooks that analyze data in real-time. Once configured, these models produce signals based on specific data incidents, allowing you to trigger automated workflows the moment a model identifies a relevant pattern or prediction.

Expand all

[## Before you begin](#UUID-b5b86d23-1fbc-be8b-ac4b-5030136119ce_section-id235537800467941_body)

Before configuring a custom machine learning sensor, you need:

- A configured Knowledge Model relevant to your use case.
- An existing Machine Learning Workbench containing your Python notebook or script.
- If using input parameters, ensure your notebook cell has the parameters tag applied.

[## Configuring a custom machine learning sensor](#UUID-b5b86d23-1fbc-be8b-ac4b-5030136119ce_section-id235537800504557_body)

To configure a custom machine learning sensor:

1. **Select the Sensor Type**: In your Skill configuration, add a new sensor and select Machine Learning Sensor from the Celonis Sensors list.
2. **Define the Use Case**: In the Use Case dropdown menu, select Custom.
3. **Link your ML Workbench**: Choose the workbench where your model is stored.

   - **Directory**: Select the specific folder containing your script. Use \ if the script is located in the root directory.
   - **Notebook**: Select the exact .ipynb file that contains your solution.
4. **Configure Input Parameters**: Map any variables you wish to pass to the script. Ensure the keys defined here match the variable names in your tagged "parameters" cell in the notebook.

   - **Output Record**: Select the specific record intended for signal generation once the script execution is complete.
5. **Set Signal Filters**: Add filters to define the logic for your signals. These filters determine which data incidents identified by your model should successfully trigger the automation.
6. **Save and Deploy**: Once deployed, the sensor will automatically run following every data reload, knowledge model update, or change to the skill.

Your custom ML model is now operational within the automation pipeline. It will monitor your data continuously and generate signals to trigger downstream actions based on your unique algorithmic logic.

[## Configuring the Python Notebook](#UUID-b5b86d23-1fbc-be8b-ac4b-5030136119ce_python-notebook-configuration_body)

To ensure your custom sensor functions correctly, your notebook in the Machine Learning Workbench must be structured to communicate with the Celonis Skill.

### 1. Receiving Input (The Parameters Cell)

For the sensor to pass data to your script, you must define a specific cell at the top of your notebook to receive the **Input Parameters**.

- **The Tag:** You must add the `parameters` tag to this cell via the Property Inspector in the Workbench.
- **The Logic:** Define your variables with default values. Celonis will overwrite these with live data from your Knowledge Model during execution.

```
# This cell must have the "parameters" tag
input_variable_1 = "default_value"
threshold_limit = 0.85
```

### 2. Returning Output (Signal Generation)

The final output of your notebook should be a DataFrame or dictionary that matches the **Output Record** selected in the sensor configuration. If the output contains new records, the Skill generates a Signal for each one.

<admonition>

If your script does not produce any output rows, no signals will be generated. This allows your model to act as a filter, only triggering automation when specific conditions are met.

</admonition>

## Related topics

- [Getting started](getting-started-with-the-ml-workbench.html "Getting started with the machine learning workbench")
- [Sensors](sensors.html "Sensors")
- [Celonis Smart Sensor](celonis-smart-sensor.html "Celonis Smart Sensor")


---

## analytics/machine-learning/forward-parameters-to-machine-learning-script

# Forward Parameters to Machine Learning Script

Unlock the full potential of your Machine Learning models by connecting them to live Action Flows. Learn how to use a standardized snippet to pass essential variables—like team domains and application keys—directly to your ML scripts for real-time automation.

This Action Flow snippet automates the handoff between your data pipeline and your machine learning models. It performs two core functions:

1. **Build JSON**: It collects the necessary parameters and converts them into a JSON structure compatible with the ML API.
2. **POST Request**: it sends a POST request to the ML execution endpoint to start the script with your custom parameters.

|  |
| --- |
|  |

Expand all

[## Configuring the Action Flow](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-ConfiguringActionFlow_body)

Below you will find the step-by-step guide for configuring each module of the Action Flow above.

[### 0. Trigger the Action Flow](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-0TriggertheActionFlow_body)

**Note**

You can integrate any trigger sequence, e.g. Slack, Email, Celonis, etc.

An example for a Slack trigger sequence can be found at [Trigger Machine Learning Script](trigger-machine-learning-script.html "Trigger Machine Learning Script").

|  |
| --- |
|  |

[### 1. Customize Variables](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-1CustomizeVariables_body)

This is the most important module in this Action Flow where we have to adjust all the data specific to your team and account like the team domain or an Application Key with the right permissions

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: Tools

Action: Set multiple variables

**teamDomain:** Enter your teamdomain, e.g. demo-action-flows

**env:** Enter your cluster, e.g. try, eu-1...

**AppKey:** e.g.:

```
GjV6ODBvghgv6r76r0YzkyLTkxZwjbflqjwhebfljwhebfqjhebfwlV5TEVCcjMzAHBFK0F8TXdGBTlqBWFlsVPN
```

**notebookId:** This will be added to the Template later when creating a ML App / adding Scripts to an existing ML App.

**executionFileName:** Name of the ML Script to be triggered, e.g. trigger\_MLScript.ipynb

|  |
| --- |
|  |

[### 2. Pass Parameters as JSON](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-2PassParametersasJSON_body)

This module creates a JSON file that is sent as a variable in the HTML request body to be used in our ML script.

**Note**

The API endpoint that forwards parameters to the ML workbench script has a maximum size limit of 96 KB. This is a hard limit and cannot be changed.

This limit is typically exceeded when trying to pass files to the ML Workbench. In this case, we recommend passing the parameters of the file metadata (i.e., file id, file path, download url, etc.) and then making an API call within the ML Workbench script to retrieve the file(s).

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: JSON

Action: Create JSON

**Parameters, e.g.:**

**JSON file for Generator**

```
{
  "parameter1": "test1",
  "parameter2": "test2",
  "parameter3": "test3"
}
```

**Possible Data Types**

You can pass parameters of any type that can be handled by standard Python or libraries, such as HTML, JSON, str, int, csv-files, txt-files, etc.

|  |
| --- |
|  |

[### 3. Trigger ML Script](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-3TriggerMLScript_body)

This module sends a POST Request to our ML API and triggers the previously defined ML script.

**Important**

You do not have to change anything in this module.

|  |
| --- |
|  |

**Configuration:**

Action Flows Module: HTTP

Action: Make a Request

**URL:** https://{{teamDomain}}.{{env}}.celonis.cloud/machine-learning/api/executions

**Method:** POST

**Headers:**

- **Name:** Authorization
- **Value:** AppKey {{AppKey}}

**Body type:** Raw

**Content type:** JSON (application/json)

**Request content:**

```
{
"notebookId": "{{notebookId}}",
"executionFileName":"{{executionFileName}}",
"params": {{json}}
}
```

|  |
| --- |
|  |

[## ML Script: Adding a ML Script to Trigger](#UUID-eecbd51c-ce4e-cedb-4dbf-186a265b9ebe_id_ForwardParameterstoMachineLearningScript-MLScriptAddingaMLScripttoTrigger_body)

Import the script in a new or existing ML App. The ML script will run your pre-defined Python logic and can make use of the parameters that you have forwarded.

**Creating your own Logic**

The script includes further documentation on how to ensure the successful execution. Make sure to follow these steps as well.

If you apply your own logic and parameters, make sure to code robustly and test the script thoroughly. If an error occurs, the backend does not give an indicator what the error was.

1. Navigate to the **Machine Learning** tab.

   |  |
   | --- |
   |  |
2. Open existing App or create a new one.

   |  |
   | --- |
   |  |

   **Delay**

   When creating a new ML App, it can take a few minutes up to one hour until it can be opened.
3. Import the **Script** provided above.

   |  |
   | --- |
   |  |
4. Make sure it is uploaded successfully and displayed in the section on the left.

   |  |
   | --- |
   |  |
5. Copy the `notebookId` to the clipboard and add it to the variables as the value for the **notebookId** in the "Customize Variables" module in the Triggering Action Flow.

   |  |
   | --- |
   |  |

   |  |
   | --- |
   |  |

**Mandatory Step for Parameters**

When developing your Python code, you can define default values for the parameters to run the script by itself and test your logic.

**IMPORTANT** Tag the cell of your Notebook with the Tag "parameters" where you set your default values with the same data type that you will pass from the Action Flow. While developing and running the code from Jupyter, these values will be used. When you are calling the Notebook from the Action Flow, the default values will be overwritten by the ones passed by the Action Flow.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## analytics/machine-learning/machine-learning

# Machine Learning

The Celonis Platform offers integrated and embedded machine learning capabilities, giving you access to a fully hosted and managed machine learning workbench (MLWB). This workbench is an integrated Python development environment based on Jupyter Notebook. These integrated tools require no installation, no maintenance, and no server requests.

You can access the machine learning features on the Celonis Platform by clicking **Data > Machine Learning**:

Expand all

[## Machine learning workbench activity types](#UUID-d271d0b6-6f27-cb66-486b-c396112a4335_section-idm4573580606228833738513920765_body)

When using the machine learning workbench, you can choose from:

- **Notebooks and console**

  - Python3 (lpykernel)
  - Julia 1.5.3
  - Python 3.8 (XPython raw)
  - Python 3.8 (XPython)
  - R
- **Other**

  - Terminal
  - Text file
  - Markdown file
  - Julia file
  - Python file
  - R file

[## Shared Node (free) vs. Dedicated Node (paid) versions](#UUID-d271d0b6-6f27-cb66-486b-c396112a4335_section-idm235002267980755_body)

There are two types of access to machine learning on the Celonis Platform:

- **Shared Node -** This is the free version of machine learning workbench that is included with your Celonis license and offers less computing power and storage capacity than the paid subscription versions. The Shared Node is slower than the Dedicate Node and cannot be used to map all use cases since the data may be too large to be processed.
- **Dedicated Node -** The paid version of machine learning workbench that guarantees your resources are available at all times. The Dedicated Node can be used to process larger use cases that cannot be processed by the shared version. There are multiple plans to choose from when upgrading to the Dedicated Node.

The table below offers a high level comparison of the resources available in the different plans. The options columns indicate the values in which each resource can be allocated to a workbook in the Dedicated Node plans. Resources in the Shared Node plan are static and cannot be allocated.

**Note**

The Shared Node plan includes a maximum of 3 workbenches. In the Dedicated Node plans, you can create any number of workbenches in multiples of 2.

Filter

- Plan name
- Total CPU
- CPU options
- Memory (GB)
- Memory options (GB)
- Storage (GB)
- Storage options (GB)

| Plan name | Total CPU | CPU options | Memory (GB) | Memory options (GB) | Storage (GB) | Storage options (GB) |
| --- | --- | --- | --- | --- | --- | --- |
| **Shared Node** |  |  |  |  |  |  |
| Included plan | 1 per workbench | N/A | 4 per workbench | N/A | 5 per workbench | N/A |
| **Dedicated Nodes** |  |  |  |  |  |  |
| X-small | 2 | 0.25, 0.5, 1, 2 | 16 | 1, 2, 4, 8, 16 | 50 | 5, 10 |
| Small | 4 | 0.25, 0.5, 1, 2, 4 | 32 | 1, 2, 4, 8, 16, 32 | 50 | 5, 10 |
| Medium | 8 | 0.25, 0.5, 1, 2, 4, 8 | 64 | 1, 2, 4, 8, 16, 32, 48, 64 | 100 | 5, 10, 25 |
| Large | 16 | 0.25, 0.5, 1, 2, 4, 8, 16 | 128 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 200 | 5, 10, 25, 50 |
| 2x-large | 32 | 0.25, 0.5, 1, 2, 4, 8, 16 | 256 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 400 | 5, 10, 25, 50, 100 |
| 3x-large | 64 | 0.25, 0.5, 1, 2, 4, 8, 16 | 512 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 800 | 5, 10, 25, 50, 100 |
| 4x-large | 128 | 0.25, 0.5, 1, 2, 4, 8, 16 | 1024 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 1600 | 5, 10, 25, 50, 100 |

| Plan name | Total CPU | CPU options | Memory (GB) | Memory options (GB) | Storage (GB) | Storage options (GB) |
| --- | --- | --- | --- | --- | --- | --- |
| **Shared Node** |  |  |  |  |  |  |
| Included plan | 1 per workbench | N/A | 4 per workbench | N/A | 5 per workbench | N/A |
| **Dedicated Nodes** |  |  |  |  |  |  |
| X-small | 2 | 0.25, 0.5, 1, 2 | 16 | 1, 2, 4, 8, 16 | 50 | 5, 10 |
| Small | 4 | 0.25, 0.5, 1, 2, 4 | 32 | 1, 2, 4, 8, 16, 32 | 50 | 5, 10 |
| Medium | 8 | 0.25, 0.5, 1, 2, 4, 8 | 64 | 1, 2, 4, 8, 16, 32, 48, 64 | 100 | 5, 10, 25 |
| Large | 16 | 0.25, 0.5, 1, 2, 4, 8, 16 | 128 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 200 | 5, 10, 25, 50 |
| 2x-large | 32 | 0.25, 0.5, 1, 2, 4, 8, 16 | 256 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 400 | 5, 10, 25, 50, 100 |
| 3x-large | 64 | 0.25, 0.5, 1, 2, 4, 8, 16 | 512 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 800 | 5, 10, 25, 50, 100 |
| 4x-large | 128 | 0.25, 0.5, 1, 2, 4, 8, 16 | 1024 | 1, 2, 4, 8, 16, 32, 48, 64, 96, 128 | 1600 | 5, 10, 25, 50, 100 |

To upgrade to a Dedicated Node plan, contact your Celonis sales representative.

[## Celonis Python packages](#UUID-d271d0b6-6f27-cb66-486b-c396112a4335_section-idm4526656593208033757195616353_body)

Celonis also offers a pre-installed Python package called PyCelonis, enabling you to use your Celonis Platform data when creating machine learning notebooks.

### PyCelonis package

PyCelonis is a Python-based API wrapper for the Celonis Platform. With this package you can interact with Celonis objects as native objects, such as copying an analysis, pulling and pushing data, or reloading a data model.

For more information about PyCelonis, see [PyCelonis documentation](https://celonis.github.io/pycelonis).

For tutorials on how to use PyCelonis, see [PyCelonis tutorials](https://celonis.github.io/pycelonis/2.0.1/tutorials/executed/01_quickstart/01_installation/#1-create-an-app-inside-the-ml-workbench).

### PyCelonis example repository

The [PyCelonis example repository](https://github.com/celonis/pycelonis-examples/) contains demo notebooks covering popular PyCelonis examples and use cases. The repository contains notebooks for both PyCelonis 1.X and 2.X and shows what you can achieve using PyCelonis. These examples are grouped by both their PyCelonis version and by their specific use cases.

## Related topics

- [Getting started](getting-started-with-the-ml-workbench.html "Getting started with the machine learning workbench")
- [Creating and managing applications](creating-and-managing-machine-learning-applications.html "Creating and managing machine learning applications")
- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")


---

## analytics/machine-learning/machine-learning-components

# Machine Learning Components

**Analysis - Maintenance only**

Effective August 1st 2025, Analysis features can no longer be purchased as part of a Celonis Platform license. Celonis continues to maintain Analysis (by fixing bugs and ensuring that performance remains strong) but no further feature development will take place.

You can migrate your existing Analysis assets to our enhanced Studio Views, giving you access to our intuitive View creation capabilities. To learn how to migrate your existing Analysis to Studio Views, head to: [Migrating Analysis to Views](migrating-analysis-to-studio.html "Migrating Analysis to Views").

And for an overview of our enhanced Studio features, see: [Studio feature availability matrix](studio-feature-availability-matrix.html "Studio feature availability matrix").

## Run ML Notebook Component

**Note**

The "Run ML Notebook" component allows you to trigger a Jupyter Notebook from inside the Analysis UI. This allows you to extend your Analysis with custom calculations, e.g. running an automated Root Cause Analysis, where the calculations happen in Python and the results are shown to the Business User in the Analysis UI.

|  |
| --- |
|  |

### Settings

After dragging the component into the canvas, select the name of the Workbench and the Notebook inside this Workbench that you want to run. After that, hit the run button on the component and the Notebook is executed.

### Passing Parameters

|  |
| --- |
|  |

When you press the run button, the component is passing a couple of parameters to the Notebook which can be used in variables in Python. The parameters are:

- variables: Passed as JSON string. Note: When passing PQL as a variable, you need to evaluate it on the Python side with pycelonis. Refer to the pycelonis documentation [here](https://celonis.github.io/pycelonis/).
- sheetId: This is the identifier of the Sheet where the component was executed from.
- dataModel\_id: This is the identifier of the Datamodel that is used in the Analysis.
- queries: These are the user selections (filters) that are applied at the time the execution was started.
- analysis\_id: The identifier of the Analysis.

### Using Parameters in a Jupyter Notebook

|  |
| --- |
|  |

When developing your Python code, you can define default values for the parameters. To do this, tag the first cell of your Notebook with the Tag "parameters" and set default values in this cell. While developing and running the code from Jupyter, these values will be used. When you are calling the Notebook from the ML component, the default values will be overwritten by the ones passed by the component.


---

## analytics/machine-learning/machine-learning-functions

# Machine Learning Functions

## Description

This section comprises standard machine learning functions.

Currently, two machine learning functions are available: [KMEANS](kmeans.html "KMEANS") and [LINEAR\_REGRESSION](linear_regression.html "LINEAR_REGRESSION").


---

## analytics/machine-learning/machine-learning-workbench-best-practice

# Machine learning workbench best practices

When using the machine learning workbench (MLWB) capabilities, we recommend the following:

Expand all

[## Environment setup (Dedicated Plan)](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_section-idm4591176317921633531013809295_body)

When setting up your machine learning workbench environment, you should first distinguish between development and production environments:

- **Development Environment:** Used for prototyping and testing.
- **Production Environment**: Used when deploying production-ready scripts and applications.

Once your environments are decided, set up your resource pools for this environment. For more information, see [Managing resources and consumption](managing-machine-learning-resources-and-consumption.html "Managing machine learning resources and consumption").

**Workbenches**

Once your workspaces are configured, you can now set up your workbenches.

In the following example, the team decided to assign each developer a dedicated development workspace.

Because their workbenches have all been initialized with the same repositories, each developer implements their part of the script in their corresponding feature branch. This approach allows developers to work in parallel, rather than within the same environment.

The final and stable version of the script is then based on the default stable branch, rather than manually updated. This script then runs in a dedicated workbench in the production workspace, with that workbench set to productive. This ensures that the workbench is never automatically shut down.

**Development Environments**

When setting up development environments, we recommend following these principles:

- Ensure optimal resource allocation by distributing resources as necessary among the notebooks.
- Maintain efficient resource utilization by promptly shutting down notebooks that are no longer required.

**Production Environments**

When setting up production environments, we recommend following these principles:

- Limit the number of notebooks within the machine learning workbench by calculating the required resources and allocating a finite number of notebooks accordingly.
- Clearly identify productive notebooks by marking them as such in the configuration tab.
- Implement a structured resource allocation strategy by distributing resources in a fixed manner.

**Notebooks**

When creating a notebook, we recommend following these principles:

- Ensure consistency by checking out the main branch in all production notebooks.
- Implement an organized development process by performing development work in designated feature branches.
- Maintain accountability by having only one person work on a single feature branch in a single notebook at a time.
- Keep development and production environments separate by only using development data pools in development notebooks.
- Preserve the integrity of production data by only using production data pools in production notebooks.

[## Application keys](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_id_Goodtoknow-ApplicationKeys_body)

When connecting your machine learning workbench to a data model, we recommend that you use an application key. Application keys are user-independent API keys, allowing you to assign granular permissions to your applications rather than to individual users.

Application keys are created by account administrators in **Admin & Settings**. For more information, see [Application keys](application-keys.html "Creating and granting permissions to application keys").

|  |
| --- |
|  |

You can still create a personal API key, however you should only use these for a private machine learning workbench and not to grant permissions to other users.

[## IP restrictions for machine learning](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_id_Goodtoknow-IPrestrictions_body)

When using IP restrictions in your Celonis Platform, the outbound IP of the machine learning workbench must be excepted.

**Note**

The IP addresses for machine learning workbench VM/apps are different than the IP address for the main Celonis Platform. The IP address for each MLWB VM/apps is unique.

To find your outbound IP, run the following command on the terminal of your machine learning workbench:

```
curl ipinfo.io/ip
```

Then for more guidance on allow listing Celonis IP addresses, see [Allowlisting Celonis domain names, IP addresses, and third-party domains](allowlisting-celonis-ip-addresses.html "Allowlisting Celonis domain names, IP addresses, and third-party domains").

[## API endpoints for managing the machine learning workbench](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_id_Goodtoknow-APIendpointsformanagingtheMLWorkbench_body)

There are a number of API endpoints available, allowing you to trigger executions, manage resources, and more. You can check our External Machine Learning APIs inside our Swagger UI page. To access the Swagger UI, use the following URL:

```
https://[teamname].[realm].celonis.cloud/machine-learning/swagger-ui/index.html#/
```

For more information, see the [Celonis Developer Center](https://developer.celonis.com/celonis-apis/connecting-to-celonis-platform/).

[## Upgrading a machine learning workbench](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_id_Goodtoknow-UpgradingaMLWB_body)

Machine learning workbench can be upgraded to the latest version (e.g. to get new features for Jupyter Lab) using the context menu in the MLWB overview page.

**Note**

Upgrading a workbench will have no impact on the files on */home/jovyan*. This includes user generated files and log files. Also, no changes to the versions of the already installed Python libraries are made.

In case of a bigger change (e.g. upgrading the version of python) an additional message is displayed asking for the confirmation of the user.

[## Storage guidelines and tips](#UUID-2e9bd67b-c4f3-5848-8a86-5c224109c2f6_section-idm4628123454729632884818575434_body)

**Initial Storage**

- Default machine learning workbench apps boot with 5GB Storage total, 1.2GB already used. Below is an example of the initial Storage bar on a new machine learning workbench App.
- This is 5GB per machine learning workbench app, not 5GB shared across all machine learning workbench apps of a team.
- The 1.2GB used from the start are for the machine learning workbench setup (same as a new 64GB iPhone which only has 58GB available because of the iOS storage).

**Storage tips - Current Storage**

To view the largest files/folders, you can use the terminal to run any of the following:

- For Overview top 10 top-level folders in nice format:

  ```
  du -hsx * | sort -rh | head -1
  ```
- For Detailed top 10 any folders in raw format:

  ```
  du -a /home/jovyan | sort -n -r | head -n 10
  ```

**Storage Tips - Cleaning/Deleting Storage**

Since deleting folders isn't possible with the typical right-click, use the terminal to run:

```
rm -rf foldername
```

**Note**

Make sure you reference the folder with an absolute path or correct relative path.

## Related topics

- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")
- [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks")
- [Running out of memory](running-out-of-memory-on-a-machine-learning-workbench.html "Running out of memory on a machine learning workbench")


---

## analytics/machine-learning/managing-machine-learning-resources-and-consumption

# Managing machine learning resources and consumption

Active machine learning workbenches (and the notebooks they contain) consume resources, notably memory, CPU, and data storage. These resources count towards your allocated Celonis Platform team resources, so attention must be paid to how much your existing machine learning workbenches are consuming.

**Note**

These features are limited to admins of Celonis Platform teams who have upgraded their machine learning license to include dedicated resource management.

As an admin, you can manage your machine learning resources and consumption levels by clicking **Configuration**:

You then have the following resource management options:

Expand all

[## Auto shutdown of machine learning workbenches](#UUID-9d8f7ebc-cb4d-dc03-6f7f-eef6ddcf1582_section-idm4653334104364833747118936556_body)

By default, unless machine learning workbenches are marked as productive, they will be shut down after 12 hours of inactivity. However, you can enable and configure an automatic shutdown of any machine learning workbenches which have not been used for a defined period of time. Once they are shut down, workbenches no longer consume resources. However, all the information and configuration details are saved.

Long running calculations that are executed from the Jupyter UI might be canceled if they are running for longer than the specified time. Scheduled executions are not affected by this and are only restricted by the timeout settings in the scheduler settings.

You can also manually shut down a workbench by clicking **Options > Shutdown**.

[## Create additional machine learning resource pools](#UUID-9d8f7ebc-cb4d-dc03-6f7f-eef6ddcf1582_section-idm4567261641638433747152547568_body)

If your Celonis Platform team has resources available, you can create and assign additional resource pools for your machine learning workbenches. Resource pools help you to allocate and then identify where your resources are being consumed within your Celonis Platform.

To create additional resource pools, click **Add pool**.

[## Assign workspaces to machine learning resource pools](#UUID-9d8f7ebc-cb4d-dc03-6f7f-eef6ddcf1582_section-idm4579864175497633747167581844_body)

Workspaces allow you to further organize your machine learning workbenches, which is useful for grouping commonly used workbenches together. You can also simultaneously assign permissions to multiple workbenches.

To create a workspace, go to **Apps > Workspaces** and click the **New** button:

You can then assign workspaces to your machine learning resource pools by going to **Configuration** and clicking the **Assign Workspaces** button in the lower right..

## Related topics

- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")
- [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks")
- [Running out of memory](running-out-of-memory-on-a-machine-learning-workbench.html "Running out of memory on a machine learning workbench")


---

## analytics/machine-learning/migrating-files-between-machine-learning-workbenches

# Migrating files between machine learning workbenches

To access enhanced functionality, you can migrate files from an existing machine learning workbench (MLWB) to a newer version. As workbenches cannot be upgraded directly, migration offers the most efficient way to move your files.

This is a two-part process - creating a new machine learning archive and then uploading that archive to a new machine learning workbench:

Expand all

[## Creating a machine learning archive](#UUID-a9280a61-86d8-c932-d8ee-e1353f630360_section-idm235002069172931_body)

When creating a machine learning archive, you can either migrate your files and folders individually or run a command that will automatically migrate all files and folders (recommended):

To create a machine learning archive:

1. Open the terminal in the source machine learning workbench by going to **File > New > Terminal**

   Alternatively, click the **Terminal** icon in the launcher:
2. Choose whether to migrate files and folders indivdually or automatically include all:

   1. **Individually**: In the terminal, enter the following command to create an archive:

      ```
      tar -czf migration_archive.tar.gz file1 file2 folder1/
      ```

      Using this method, you then need to replace `file1 file2 folder1/` with the names of the actual files and directories you want to migrate. To list multiple files or folders, separate each file or folder name with a space.
   2. **Automatically include all files and folders (recommended)**: In the terminal, enter the following command to create an archive:

      ```
      tar --exclude=".*" --exclude="lost+found" --exclude="ml-workbench-backup.tar.gz" -czf ml-workbench-backup.tar.gz *
      ```
3. Locate the archive file (**migration\_archive.tar.gz.html** for individual and **ml-workbench-backup.tar.gz** for all files and folders) in the file explorer in the left sidebar.

   If you do not see the new file, click the **Refresh** icon at the top.
4. Right-click on the archive file and select **Download**.
5. Open the downloaded file.
6. In the Security Checkpoint window, select the security checkbox and then click **Download file**.
7. Go back to the machine learning workbench and right-click on the file to download again.

[## Uploading the archive to the new machine learning workbench](#UUID-a9280a61-86d8-c932-d8ee-e1353f630360_section-idm235002094110589_body)

1. Log in to the new machine learning workbench.
2. Upload the **tar.gz** file by dragging-and-dropping it from the file explorer or clicking the **Upload** button.
3. To extract the archive into the new workbench, open a new terminal and run the following extraction command:

   ```
   tar -xzf migration_archive.tar.gz
   ```

   The files from the archive will be extracted to their original file and folder structures.

## Related topics

- [Creating and managing applications](creating-and-managing-machine-learning-applications.html "Creating and managing machine learning applications")
- [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks")
- [Running out of memory](running-out-of-memory-on-a-machine-learning-workbench.html "Running out of memory on a machine learning workbench")


---

## analytics/machine-learning/running-out-of-memory-on-a-machine-learning-workbench

# Running out of memory on a machine learning workbench

When executing a script in a machine learning workbench (either manually or via scheduling), you may encounter an issue where the script fails due to your machine learning workbench running out of memory. When this error occurs, it means that the RAM resources of your machine learning workbench have been exceeded.

Use the solutions below to free up additional RAM resources to run your script. If the issue is not resolved, you may need to [open a support ticket](running-out-of-memory-on-a-machine-learning-workbench.html#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm23488421838721 "Contacting Support") to acquire more resources.

## Potential solutions

Expand all

[### Check for conflicting schedules](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884208021762_body)

If there are multiple scripts scheduled to run using the same machine learning workbench, it causes them to share the RAM resources. Ensure each script has completed before any subsequent scripts are executed. It is recommended that you add a buffer of time between script executions to ensure they do not overlap, such as adding a 15 minute buffer between when one script completes and the next script starts.

[### Reset all variables in the workbench](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884208384482_body)

To ensure all variables in memory are cleared before executing your notebook, add a new cell at the beginning and enter `%reset -fs`

For example: `%reset magic command documentation`

[### Shut down unneeded kernels](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884209326985_body)

1. Open the machine learning workbench where this notebook is scheduled to run.
2. Navigate to the **Kernels** tab.
3. Shut down any unneeded kernels and terminals to maximize the amount of available RAM.

[### Restart the workbench](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884209982654_body)

1. Go to the Machine Learning Workbench app on the Machine Learning page.
2. Click on the three dots menu and select **Shutdown**.
3. Run the script again to determine if the issue persists.

[### Consider moving the script to another workbench](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884210495144_body)

If multiple scripts are being run from the same workbench, they share the available resources. If the out-of-memory error occurs, consider moving some of the scripts to other workbenches. Running only one script in a specific workbench ensures that no other scripts will impact the resources available for processing.

[### Optimize memory utilization](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884211063582_body)

As the size of your data increases, your script will need more RAM to process and execute successfully. It is recommended that you review the following third party resources to optimize your script's memory utilization:

- [Optimize memory tips in Python](https://www.honeybadger.io/blog/reducing-your-python-apps-memory-footprint/)
- [Memory management](https://docs.python.org/3.10/c-api/memory.html)

[### Increase dedicated resources of the workbench (Dedicated Resource Tier Customers only)](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm234884212995741_body)

With the dedicated resource tier, increasing the RAM resources for the workbench is possible. Use the **Configurations** tab in the Machine Learning section of your Celonis team to increase the amount of RAM. If you are interested in upgrading to a dedicated resource tier, contact your Celonis Account Team or [open a support case](http://www.celopeers.com).

[## Contacting Support](#UUID-01c9c1b1-d5ee-55aa-7840-3d257e1eac43_section-idm23488421838721_body)

If the issue persists after completing the steps above, or to inquire about upgrading to a dedicated resource tier, open a support request in the [Support Portal](http://support.celonis.com/). Ensure the following information is included in your support request:

- Workbench URL
- Screenshots of the issue
- If using PyCelonis, identify and include the version

  - To identify your current version, open the workbench terminal and execute: `pip show PyCelonis`.
- A copy of the notebook that is failing to execute

  - Open the notebook.
  - Manually run the notebook to reproduce the issue and click **Save**.
  - Go to **File** and select the "Download" option.
  - If an HTML file is downloaded, this is your confirmation page. Open the HTML file and follow the instructions to download the notebook.

## Related topics

- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")
- [Scheduling notebooks](scheduling-machine-learning-notebooks.html "Scheduling machine learning notebooks")
- [Best practices](machine-learning-workbench-best-practice.html "Machine learning workbench best practices")


---

## analytics/machine-learning/scheduling-machine-learning-notebooks

# Scheduling machine learning notebooks

Machine learning notebooks can be executed on a recurring schedule within the Celonis Platform, allowing you to control when they execute, how long the timeout is, and setting the maximum number of retries.

Once notebooks are scheduled and running, you have [a number of management options](scheduling-machine-learning-notebooks.html#UUID-2063cb8c-63af-22fd-8d8d-2d67b7d924dc_section-idm4517193362076833743765880293 "Managing existing machine learning notebooks schedules").

Expand all

[## Scheduling machine learning notebooks](#UUID-2063cb8c-63af-22fd-8d8d-2d67b7d924dc_section-idm4570911203964833743745154429_body)

**Important**

For your notebook to be successfully scheduled, your workbench must contain a valid execution file.

1. Go to **Data > Machine Learning**.
2. Click **Scheduling** and then click the **Create Schedule** button in the upper right.
3. Configure your schedule, including the name, selecting which workbench and execution file to use, and setting your frequency options.

   - **Time**

     - Hourly (Full hour, quarter past, half past, quarter to)
     - Every few hours (with customizable number of hours, plus the hourly options above)
     - Daily (with customizable time)
     - Weekly (select one or more days and the time the notebook should run)
     - Monthly (select a calendar day and the time the notebook should run)
     - Custom cron (freely define a scheduling plan by using space-separated values, with 1 minute being the minimum period between runs)
   - **Configuration / Frequency options**

     - Execution timeout (select from minutes or hours)
     - Maximum retries (select the number of retires before the notebook stops running)
     - Receive emails for failed executions (with an email summary sent to the email address you are accessing your Celonis Platform team with)
4. Click **Create**.

   Your schedule is configured and set to disabled, meaning that it will not currently run on your configured frequency. To enable this, click the **Options** button and select **Enable**.

[## Managing existing machine learning notebooks schedules](#UUID-2063cb8c-63af-22fd-8d8d-2d67b7d924dc_section-idm4517193362076833743765880293_body)

Once scheduled, you can manage your machine learning notebook schedules by clicking the options (three dots) button:

Your options include:

- **Run**: Manually run or execute you notebook once, regardless of your configured frequency and whether your schedule has been enabled.
- **Edit**: Update all the details of your schedule and save any changes you made.
- **Delete**: Disable and delete this schedule from your list, with no reversal or restoration possible.
- **Permissions**: Configure notebook level permissions only.
- **Enable / Disable**: Once enabled, your schedule will run on your configured frequency.
- **Subscribe / Unsubscribe**: Receive email notifications whenever your schedule runs.

## Related topics

- [Migrating files to a MLWB](migrating-files-between-machine-learning-workbenches.html "Migrating files between machine learning workbenches")
- [Creating and managing applications](creating-and-managing-machine-learning-applications.html "Creating and managing machine learning applications")
- [Running out of memory](running-out-of-memory-on-a-machine-learning-workbench.html "Running out of memory on a machine learning workbench")


---

## analytics/process-adherence/creating-a-process-adherence-manager-model

# Creating a Process Adherence Manager model

To start analyzing processes with Process Adherence Manager (PAM), you need to create a model to use as a baseline. You can create this model using Studio, import an existing model from Process Designer or upload an BPMN model from a different system into PAM.

Expand all

[## Before you begin](#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_N1771937018175_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- If [importing a model from Process Designer](creating-a-process-adherence-manager-model.html#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_N1772807113503 "Step 6.b"): Make sure the Process Adherence Manager integration with Celonis Process Management is enabled
- Make note of the following limitations for BPMN files:
- You cannot edit imported BPMN models in the Process Adherence Manager Model Editor although you can [remove event logs](making-changes-to-a-target-model.html#UUID-1bed9fe0-e9a8-4f69-ffd6-1fdd843d5a7e_section-idm23498931024007 "Removing an event log").
- You can only select one event log for your imported BPMN model.
- BPMN models that contain more than 16 tasks/events in parallel may be rejected due to state space limitations.

### BPMN file prerequisites

Your BPMN file must:

- Be less than 5MB in size.
- Include at least one task or event, with each task or event having a unique name.
- Have a unique start event and a unique end event.
- Have all flow nodes accessible from the start event in the direction indicated by the flow arrows.
- Have its end event accessible from every flow node in the direction indicated by the flow arrows.
- Include [supported BPMN elements only](troubleshooting-in-process-adherence-manager.html#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm234432815446116 "BPMN elements supported in Process Adherence Manager").

[## Creating a Process Adherence Manager baseline model](#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_section-idm234374027193743_body)

To create a PAM model, follow these steps:

1. In the Celonis Platform, [create a package containing a knowledge model](https://docs.celonis.com/en/creating-knowledge-models.html#UUID-217aef5a-c1a4-01e1-c2ec-4898677b3206_section-idm4671485654112034280854968438) in your Studio space.
2. Select **Add asset** > **Process Adherence Manager**.

   |  |
   | --- |
   |  |
3. Enter a name for your adherence analysis.
4. Select a knowledge model from the dropdown list.

   |  |
   | --- |
   |  |

   **Note**

   You can change or update this knowledge model later if necessary. For more information, see [Viewing and changing knowledge models in PAM](making-changes-to-a-target-model.html "Making changes to a target model").
5. Select **Create**.

   The **Target Model Editor** screen appears.

   |  |
   | --- |
   |  |
6. If you want:

   1. Process Adherence Manager to create your baseline model, select **Start mining**.

      Your baseline model is created and opens in the Model Miner screen.

      |  |
      | --- |
      |  |
   2. To import an process model from Process Designer, see [Importing a model from Process Designer](creating-a-process-adherence-manager-model.html#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_section-idm234970537728068 "Importing a BPMN model from Process Designer").
   3. To upload a BPMN model, see [Uploading a BPMN file](creating-a-process-adherence-manager-model.html#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_section-idm234422619838806 "Importing a BPMN file from other systems").

[## Importing a BPMN model from Process Designer](#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_section-idm234970537728068_body)

**Important**

Before you can import a Process Designer model into PAM or export a model from PAM into Process Designer, **Enable integration with Process Adherence Manager** must be turned on by an admin in the Celonis Platform **Admin & Settings**. For more information, see [Enabling access to Celonis Process Management](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html "Enabling access to Celonis Process Management (CPM) from the Celonis Platform").

If you have an existing process model already created in Process Designer, you can import it for use in PAM. Note that you cannot edit a Process Designer model in PAM, only view it.

To import a BPMN model, follow these steps:

1. In the **Target Model Editor**, select **Import from Process Designer**.

   The **Import from Process Designer: Step 1: Select a process model** screen appears.

   |  |
   | --- |
   |  |
2. Navigate to select the Process Designer model you want to import to PAM.

   |  |
   | --- |
   |  |

   **Note**

   Where multiple versions of the process exist, select the version you want from the version dropdown. For information about what happens if the CPM model is updated after you've imported it to PAM, see [Working with target models and CPM](creating-a-target-model.html "Creating a target model").
3. Select **Next: Select event log**.

   The **Import Process Model: Step 1: Select an event log screen** appears.

   |  |
   | --- |
   |  |
4. Select an event log.

   This will be used to create your model.
5. Select **Next: Map activities**.

   The **Import Process Model: Step 2: Map activities** screen appears.

   |  |
   | --- |
   |  |
6. Map each activity in your process model to an event in the event log.

   **Note**

   If some of your activities don't map to events, leave them unmapped.
7. Select **Import**.

   Your Process Designer model opens in the **Target Model Editor**.
8. Select **Save and Continue**.

   Your BPMN model opens in the **Explore deviations** screen.
9. [Exploring deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager")

[## Importing a BPMN file from other systems](#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_section-idm234422619838806_body)

To import a BPMN model, follow these steps:

1. Check your BPMN file [meets the requirements](creating-a-process-adherence-manager-model.html#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_N1771937018175 "Before you begin").
2. Check your BPMN file against the [BPMN file limitations](creating-a-process-adherence-manager-model.html#UUID-3cd322be-4bdb-6f24-c131-7ce203371908_N1774265693344 "BPMN file prerequisites").
3. In the **Target Model Editor**, drag and drop your BPMN file to **Import BMPN File** or browse to select your BPMN file.

   The **Import BPMN File: Step 1** screen appears.

   |  |
   | --- |
   |  |
4. Select the event log that contains the data for your imported BPMN model.

   |  |
   | --- |
   |  |
5. Click **Next: Map activities**.

   The **Import BPMN File: Step 2** screen appears.
6. Map each activity in your BPMN file to an event in the selected event log.

   |  |
   | --- |
   |  |

   **Note**

   If some of your activities don't map to events, leave them unmapped.
7. Click **Import**.

   Your BPMN model opens in the **Target Model Editor**.

   |  |
   | --- |
   |  |
8. Select **Save and Continue**.

   Your BPMN model opens in the **Explore deviations** screen.

   |  |
   | --- |
   |  |

**Note**

After [checking your BPMN file for conformance and analyzing any deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager"), you can export it from Process Adherence Manager so you can use it in other systems. For more information, see [Exporting a BPMN model](exporting-bpmn-models-from-process-adherence-manager.html "Exporting BPMN models from Process Adherence Manager").

## Related topics

- [Refining a baseline model](refining-a-baseline-model.html "Refining a baseline model")
- [Exploring variants](exploring-variants.html "Exploring variants")
- [Exporting models from PAM](exporting-bpmn-models-from-process-adherence-manager.html "Exporting BPMN models from Process Adherence Manager")


---

## analytics/process-adherence/exploring-deviations-in-process-adherence-manager

# Exploring deviations in Process Adherence Manager

The deviation explorer is an analysis component in Process Adherence Manager that allows you to investigate where actual process executions do not follow the defined target process.

In this example, the Process Adherence Manager is used to explore deviations in a sales order process. The **Create Sales Order Item** event in the **PO Celonis Sales Order** event log occurred too often for 24.85% of cases and had an impact of an additional 17 days on throughput time:

|  |
| --- |
|  |

From this data, you can see that:

- In the first deviation, the **Create Sales Order Item** event occurred repeatedly after the **Create Sales Order Header** event in 487 event logs, adding an extra five hours of throughput time.
- In the second deviation, the **Create Sales Order Item**  event occurred repeatedly after itself (in a loop) across 10 event logs, adding 849 days to the throughput time.

|  |
| --- |
|  |

Expand all

[## Before you begin](#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-id235420241769167_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- [Create a baseline model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model") in PAM
- [Create a target mode](using-the-process-model.html "Using the process model")l to compare to the baseline model
- Be assigned the Analyst role

[## The benefits of exploring deviations](#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-id23542024242196_body)

By exploring your process deviations, you can see:

- **List of deviations**: You’ll see a list of deviations detected when comparing your actual event log(s) against the target process model. These deviations are grouped by category. For more information, see: [Understanding deviation categories](exploring-deviations-in-process-adherence-manager.html#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-idm234374109426973 "Understanding deviation categories").
- **Deviation metrics**: For each deviation, you can typically see which event log and event the deviation occurs in, how frequently the deviation occurs (as a percentage or number of cases), and the impact this deviation has on performance KPIs.
- **Conformance rate**: The percentage of your process instances that conform to the target model versus those that deviate. This gives you a quick sense of overall adherence.
- **Root cause analysis**: You can drill into specific deviations to perform root cause analysis — identifying attributes, patterns, or data conditions that are strongly correlated with the deviation. This lets you understand what is driving non-conformance.
- **Actions on deviations**: You can also take actions such as allow-listing deviations (ignoring them in conformance calculations) or switching views to analyze related variants and their end-to-end flows. For more information, see: [Allowlisting deviations in Process Adherence Manager](exploring-deviations-in-process-adherence-manager.html#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-idm234784042574564 "Allowlisting deviations in Process Adherence Manager")

[## Exploring deviations from the target process](#id569134_body)

To explore deviations from the target process in Process Adherence Manager follow these steps:

1. Open your [target model](creating-a-target-model.html "Creating a target model").
2. Select the deviations tile. The Explore deviations screen opens. Any filters you applied when creating your target model are displayed. You can remove or edit them here or add new filters.
3. In Deviations, deviations display for all event logs, with each deviation including the:

   [Deviation category](exploring-deviations-in-process-adherence-manager.html#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-idm234374109426973 "Understanding deviation categories"). Event log and event where the deviation occurs.

   Percentage of cases across all event logs (weighted average) the deviation occurs in.

   Impact on the throughput time caused by the deviation.
4. Select any deviation to view more details about that deviation.The dashed line shows where the deviation occurs. Here, the deviation is a missing event.
5. Select the magnifying glass icon to analyze the root causes of the deviation .A table that displays detailed information about the selected deviation appears. You may need to select **Refresh data**to ensure all data is displayed.
6. [Explore the variants](https://docs.celonis.com/en/exploring-variants.html) associated with specific deviations and perform an end-to-end analysis.

[## Allowlisting deviations in Process Adherence Manager](#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-idm234784042574564_body)

**Note**

Only users with at least the Analyst role can create allowlists in PAM

You can allowlist specific deviations from Explore deviations. Once allowlisted, these deviations will move to the allowlist and will no longer appear in Explore deviations. Allowlisted deviations don’t affect Conformance rate.

To allowlist deviations, follow these steps:

1. In Explore deviations, select the deviation you want to allowlist.
2. Select the checkmark. Your deviation is moved to your allowlist.
3. Select the allowlist icon at any time to see your allowlist. You can also remove any entries from your allowlist here.

[## Understanding deviation categories](#UUID-7e9195ed-c79e-33bd-03bd-38afb46cbcef_section-idm234374109426973_body)

When exploring deviations in Process Adherence Manager, the following categories are frequently used:

| Deviation category | Description |
| --- | --- |
| Missing event | An event that is required in the target model but does not occur. |
| Occurred too often | An event that should only happen once in the target model but occurs multiple times. This could be because of a loop or duplicates. |
| Occurred out of sequence | An event that was required in the target model but occurs in the wrong place in the process flow. |
| Unexpected event | An event occurred that is included in the data model but not included in the target model.  **Tip**  Unexpected event deviations are included in your target model by default. You can hide all unexpected event deviations in **Edit** mode by selecting **Settings** and using the **Unexpected event deviations** toggle. |
| Violated condition | A condition added from the Knowledge Model's condition list has not been met.  For more information, see [Adding conditions to a baseline model](refining-a-baseline-model.html#UUID-f882389f-2520-d5e9-06a5-c97fe931ee74_section-idm235117051188254 "Adding conditions to a baseline model"). |
| Violated exclusive gateway | Two possible events occur at a point in the process where only one event should occur. One or more events that should occur sequentially do not occur at all. |

## Related topics:

- [Creating a PAM model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model")
- [Creating a baseline model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model")
- [Exploring variants](exploring-variants.html "Exploring variants")


---

## analytics/process-adherence/exporting-bpmn-models-from-process-adherence-manager

# Exporting BPMN models from Process Adherence Manager

After [checking file for conformance and analyzing any deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager"), you can export your BPMN models to your downloads folder or to Process Designer so you can use them in other systems.

Expand all

[## The benefits of exporting BPMN models](#id569651_body)

By exporting your BPMN models, you can:

- **Create a model once, use it everywhere**: Your process models are yours, and exporting them between systems makes it easy to ensure consistency.

[## Before you begin](#id569658_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- If you are exporting a model to Process Designer, make sure **Enable integration with Process Adherence Manager** has been turned on by an admin in the Celonis Platform **Admin & Settings**.

[## Exporting a BPMN model from Process Adherence Manager](#UUID-4a9342f0-783f-0126-41c2-8446e15de505_section-idm234687738214998_body)

To export a BPMN model, follow these steps:

1. In the [Explore deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager") or [Explore deviating variants](exploring-variants.html "Exploring variants") screen, select **Edit model**.
2. Select **Export model** and then choose **Download BPMN file**.
3. Select the event logs you want to download.

   |  |
   | --- |
   |  |
4. Select **Download**.

   Your BPMN file will be saved as a zipped file in your downloads folder. When you unzip the file, each event log file will be saved as a separate BPMN file.

[## Exporting a BPMN model to Process Designer](#UUID-4a9342f0-783f-0126-41c2-8446e15de505_section-idm234970719378845_body)

**Important**

Before you can import a Process Designer model into PAM or export a model from PAM into Process Designer, **Enable integration with Process Adherence Manager** must be turned on by an admin in the Celonis Platform **Admin & Settings**. For more information, see [Enabling access to Celonis Process Management](enabling-access-to-celonis-process-management--cpm--from-the-celonis-platform.html "Enabling access to Celonis Process Management (CPM) from the Celonis Platform").

To export a BPMN model to Celonis Process Management, follow these steps:

1. In the [Explore deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager") or [Explore deviating variants](exploring-variants.html "Exploring variants") screen, select **Edit model**.
2. Select **Export model** and then choose **Export to Process Designer**.

   The **Export to Process Designer: Select 1: Select event log** screen appears.
3. Select the event logs you want to export.
4. Select **Next**.

   The **Export to Process Designer: Select 2: Select export location** screen appears.
5. Select where you want to save your exported model file.
6. Select **Export**.

   The BPMN model will be saved to your selected location in Process Designer.

## Related topics

- [Creating a PAM model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model")
- [Refining a baseline model](refining-a-baseline-model.html "Refining a baseline model")


---

## analytics/process-adherence/filtering-in-process-adherence-manager

# Filtering in Process Adherence Manager

You can filter on event logs, event types and relationships to change what is included in the process model and displayed in the process model graph.

The **Data & Coverage Info** panel shows the percentage of the total number of cases that remain in the process model after filtering.

|  |
| --- |
|  |

You can also view a breakdown of the coverage for all event logs by clicking the double arrows in the upper right corner to expand the panel. The coverage rate for each event or event log that meets the filter criteria is displayed.

|  |
| --- |
|  |

Expand all

[## Before you begin](#id569508_body)

Before you begin, ensure you have completed the following steps or meet the requirements listed below:

- [Created a target model](creating-a-target-model.html "Creating a target model")

[## Creating a filter in Process Adherence Manager](#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm23437435431058_body)

To create a filter, follow these steps:

1. Click the **Filter** icon in the top left of the screen.
2. In the **Filters** panel, click **Add a filter**.
3. Select the type of filter you want to add from the dropdown list.

   **Tip**

   Hover over any option to see a description of the filter type.
4. Enter the criteria for your filter from the lists provided.

   The available fields and options vary based on the type of filter being created. You can also use **Search** to narrow down the list of options.
5. Select the specific items you want to filter on from the dropdown list.
6. Click **Apply filter**.

   The process model graph and data and coverage information are automatically updated based on your selected criteria.
7. [Save your filters to the knowledge model](filtering-in-process-adherence-manager.html#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm234377928111621 "Saving filters to the knowledge model") if you want to reuse them.

[## Using preset filters from the knowledge model](#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm234616606549672_body)

To use a preset filter, follow these steps:

1. In **Model Miner**, select the pencil icon to enter **Edit Mode**.
2. In the **Preset filters** panel, select **Add a filter**.
3. Click **Saved filters** to view any filters saved in your knowledge model.
4. Select any filters you want to apply.

   The process model graph and data and coverage information are automatically updated based on your selected criteria.

**Tip**

Hover over the info icon to view the filter PQL query.

[## Filter types](#id569575_body)

You can use filters created elsewhere in Studio that have been saved to your knowledge model or create your own filters before saving them to your knowledge model. Any filters saved to your knowledge model can be used in other parts of Studio.

| Filter | Description |
| --- | --- |
| Event log attribute | Filters on event logs based on specified attributes. |
| Event flow | Filters on flows based on the specific ordering of events. |
| Throughput time | Filters on flows based on the throughput time between two events. |
| Event log start/end | Filters on events logs that start or end with a specific event type. |
| Saved filters | Filters that have been saved in your knowledge model.  **Note**  You must be in edit mode to apply this filter type. For more information, see [Using preset filters from the knowledge model](filtering-in-process-adherence-manager.html#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm234616606549672 "Using preset filters from the knowledge model"). |

[## Saving filters to the knowledge model](#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm234377928111621_body)

To save a filter, follow these steps:

1. [Add a filter](filtering-in-process-adherence-manager.html#UUID-02fb1c40-e2a1-e560-63aa-1914d5f5ec43_section-idm23437435431058 "Creating a filter in Process Adherence Manager").
2. In the **Filters** panel, click the triple-dot icon.
3. Select **Save all filters in Knowledge Model**.
4. Enter a name for your filter when prompted to do so.
5. Select **Save**.

**Tip**

Any filters saved to the knowledge model can be used in any Studio assets that use the same knowledge model. This means you don't need to re-create filters multiple times.

## Related topics

- [Refining a baseline model](refining-a-baseline-model.html "Refining a baseline model")
- [Exploring variants](exploring-variants.html "Exploring variants")
- [Making changes to a target model](making-changes-to-a-target-model.html "Making changes to a target model")


---

## analytics/process-adherence/process-adherence-manager

# Process Adherence Manager

Process Adherence Manager creates a baseline model for your process using data from the Celonis Platform. Alternately, you can use your own baseline model by uploading a BPMN model file or, if you have access to Process Designer, you can import a process model from Process Designer.

You edit and refine this baseline model to create a target model for your process. By comparing your actual process against the target model, you can see where your process deviates from the target model. Drilling down into these deviations lets you view their root causes and see how they impact performance, helping you understand where and how you can improve your process.

Once you've created your target model, you can export it to Process Designer or as a BPMN model file, allowing you to use it in other applications.

## Benefits of using PAM

- **Process Conformance Monitoring**: Monitor your actual, mined processes against a target model to achieve and maintain optimal process conformance.
- **Deviation and Root Cause Analysis**: Define how your process should ideally work (the target model). Visualizing and analyze deviations between the actual process flow and the target process flow. Identify the root causes of these deviations in a ranked order based on key performance indicators (KPIs).
- **Process Improvement and Steering**: Use your findings from the analysis to take action and improve the process.
- **Value Opportunity Identification**: Identify value opportunities by comparing their event data against a "should-be" process model in a guided way.

## Key concepts

- **Baseline model**: Represents how a process actually runs, based on event data. It is typicallymined automatically from historical execution data.
- **Target model**: Represents how the process should run. It is derived by refining the baselinemodel or importing a predefined process design and defining which activities and paths arerequired, optional, or disallowed
- **Adherence**: Measures how closely real process executions conform to the target model. High adherence indicates consistent, standardized execution; low adherence highlights deviations
- **Deviation**: Any difference between actual execution and the target model, such as:

  ● Missing or skipped activities

  ● Activities executed in the wrong order

  ● Unexpected repetitions or rework

  ● Additional, non-standard steps
- **Variant**: A distinct end-to-end execution path that cases take through the process. PAM helps you understand which variants conform to the target process and which do not

## Getting started with Process Adherence Manager

The key steps you'll be guided through in Process Adherence Manager are:

1. [Creating a Process Adherence Manager model](creating-a-process-adherence-manager-model.html "Creating a Process Adherence Manager model").
2. [Exploring deviations](exploring-deviations-in-process-adherence-manager.html "Exploring deviations in Process Adherence Manager").
3. [Exploring variants](exploring-variants.html "Exploring variants").


---

## analytics/process-adherence/troubleshooting-in-process-adherence-manager

# Troubleshooting in Process Adherence Manager

There are some common errors that can occure when working with PAM. The following sections describe them and their solutions.

Expand all

[## Event log size in Process Adherence Manager](#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm23455932067444_body)

You may experience issues if your event log is too big. For optimal performance, we recommend your event log contains a maximum of:

- 100 million events.
- 10 thousand variants.

[## Reducing event log size in Process Adherence Manager](#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm234571519984034_body)

You can reduce event log size by:

- [Filtering your event log during event log creation (recommended)](troubleshooting-in-process-adherence-manager.html#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_N1737744392026); or
- [Filtering your existing event log](troubleshooting-in-process-adherence-manager.html#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_N1737747063827).

[## Target model complexity in Process Adherence Manager](#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm23455945715488_body)

The complexity of your target model may affect its performance, with large numbers of parallel flows having a significant impact. Simplifying your target model where possible is good practice and will help improve performance.

[## Key Process Adherence Manager errors](#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm234559408410582_body)

```
PQL Error during operation: %operation_alias%." + " The query exceeded the execution time limit." +
" Please contact support to limit the number of variants computed.
```

**Description:** Your query timed out due to the large volume of data being processed.

**Action:** Create a [Support ticket](support.html "Contacting Support") requesting a variant limit is added for your alignment calculation.

**Note**

Once a variant limit has been applied, the information displayed may be affected because fewer variants will be included in the alignment calculation.

```
"PQL Error during operation: %operation_alias%." + " The query result exceeded the rows limit." +
" Please, reduce the size of the event log."
```

**Description:** Your query failed because your event log is too big.

**Action:** Reduce the number of events in your event log so it meets our [event log recommendations](troubleshooting-in-process-adherence-manager.html#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm23455932067444 "Event log size in Process Adherence Manager"). If you continue to receive this error, create a [Support ticket](support.html "Contacting Support").

[## BPMN elements supported in Process Adherence Manager](#UUID-9e2637de-eb8a-877b-ff83-a4aa72ebd2b5_section-idm234432815446116_body)

**Important**

If unsupported BPMN elements are included in your BPMN file, the BPMN file import will typically stop and an error will display.

Filter

- Element
- Supported?
- Further information

| Element | Supported? | Further information |
| --- | --- | --- |
| Exclusive choice gateways  Parallel/And gateways | Yes | Each gateway must have one of:  - A single incoming sequence flow and a single outgoing sequence flow. - A single incoming sequence flow and multiple outgoing sequence flows (single entry). - Multiple incoming sequence flows but one single outgoing sequence flow (single exit). |
| Event | Yes, except boundary events. | - Start and end events are interpreted as event log start and event log end. - Intermediate events are interpreted as Celonis events and are named using the event name field. - Boundary events are not supported and will stop the import wth an error. |
| Task | Yes | - Tasks are interpreted as Celonis events and are named using the task name field. - Tasks with a loop marker or multi-instance characteristic are interpreted as self-loops. - All other task types, markers and characteristics are not supported and will be ignored but the BPMN file import will not be disrupted. |
| Flow | Sequence flows only. | All other flow types are not supported and will be ignored but the BPMN file import will not be disrupted.  **Note**  Call activities, sub-processes and transactions are not supported. We recommend removing any call activities, sub-processes and transactions from your flow and integrating their content directly into your model. |

| Element | Supported? | Further information |
| --- | --- | --- |
| Exclusive choice gateways  Parallel/And gateways | Yes | Each gateway must have one of:  - A single incoming sequence flow and a single outgoing sequence flow. - A single incoming sequence flow and multiple outgoing sequence flows (single entry). - Multiple incoming sequence flows but one single outgoing sequence flow (single exit). |
| Event | Yes, except boundary events. | - Start and end events are interpreted as event log start and event log end. - Intermediate events are interpreted as Celonis events and are named using the event name field. - Boundary events are not supported and will stop the import wth an error. |
| Task | Yes | - Tasks are interpreted as Celonis events and are named using the task name field. - Tasks with a loop marker or multi-instance characteristic are interpreted as self-loops. - All other task types, markers and characteristics are not supported and will be ignored but the BPMN file import will not be disrupted. |
| Flow | Sequence flows only. | All other flow types are not supported and will be ignored but the BPMN file import will not be disrupted.  **Note**  Call activities, sub-processes and transactions are not supported. We recommend removing any call activities, sub-processes and transactions from your flow and integrating their content directly into your model. |

[## Adherence check in Process Adherence Manager](#id569852_body)

To make a BPMN model ready for adherence checking, ensure that:

1. The model has exactly one start and one end event.
2. There are no gateways other than exclusive or parallel.
3. Each opening gateway has a corresponding closing gateway of the same type.
4. Gateways are either opening or closing, not mixed (no gateways with several incoming and several outgoing sequence flows).
5. There are no equally named tasks or events.
6. Tasks have exactly one incoming and one outgoing edge.
7. No boundary events.
8. No disconnected flow elements.
9. No deadlocks, no lifelocks.

[## Automatic repair](#id569875_body)

If model validation fails, we attempt a series of repair operations aiming at transforming the input BPMN model into a valid PAM model.

**Missing start/end events**

If a task, gateway or event (excluding start events) has no incoming flow, a new start event will be added and connected as input to the node. Similarly, if a task, gateway or event (excluding end events) has no outgoing flow, a new end event will be added and connected as output of the node.

|  |
| --- |
|  |

|  |
| --- |
|  |

This model lacks a start event, which means importing it would fail. With automated repair, a start event is added, and the import succeeds.

**Duplicate task/event names**

If multiple tasks or events in a model have the same name, we will add suffixes to differentiate between them.

|  |
| --- |
|  |

|  |
| --- |
|  |

This model has duplicate activity names (Task B), which means importing it would fail. With automated repair, names are assigned a suffix that turns them into unique names

**Empty activity name**

If a task or event has an empty activity name, a placeholder name (\_\_UNLABELED\_\_) is added to it.

|  |
| --- |
|  |

|  |
| --- |
|  |

Uploading a model with an empty activity would fail. With automated repair, a placeholder \_\_UNLABELED\_\_ is added so the import proceeds to the next step

**Missing incoming/outgoing tags**

If a model’s flow nodes (tasks, events and gateways) <incoming>/<outgoing> tags are inconsistent with the information provided in the sequence flow tags, the model will be modified using the sequence flows as a source of truth.

|  |
| --- |
|  |

|  |
| --- |
|  |

Here, the model looks correct on the surface; however, its XML is broken, which causes errors in the downstream processing

If the repair operations are enough to turn the imported model into a valid PAM model, the import proceeds with the “repaired” model. Otherwise, the import will fail, and diagnostics will be displayed on top of the original model.

**Multiple start events**

In case a model contains multiple start events, these are merged into a single start event using a gateway. The gateway type is guessed to ensure that the resulting model is sound.

Uploading models with multiple start events would fail. With automated repair, these are merged into a single event with an outgoing parallel gateway.

**Multiple end events**

In case a model contains multiple end events, these are merged into a single end event using a gateway. The gateway type is guessed to ensure that the resulting model is sound.

Uploading models with multiple end events would fail. With automated repair, these are merged into a single event with an incoming exclusive gateway.

**Multiple Incoming/Outgoing Edges**

In case a task/event contains multiple incoming/outgoing sequence flows, the model is repaired by inserting gateways before/after the task/event. The gateway types are guessed to ensure that the resulting model is sound.

Uploading models where tasks contain multiple incoming flows will fail. Automated repair resolves it by adding incoming exclusive gateways.

Uploading models where tasks contain multiple outgoing flows will fail. Automated repair resolves it by adding outgoing parallel gateways.


---

## analytics/simulation/process-simulation

# Process Simulation

Process Simulation allows you to quantify the impact of potential changes before they are implemented. By creating a virtual environment to test "what-if" scenarios, organizations can avoid costly mistakes—such as removing a bottleneck in one stage only to inadvertently create a larger one downstream.

The simulation journey follows a three-step cycle to move from your current reality to a validated future state:

- **Digital twin extraction**: First, you extract a "Digital Twin" in Studio based on your actual process data. This isn't just a map; it is a BPMN model enriched with real-world statistics, including:

  - **Arrival rates**: How and when new cases enter the system.
  - **Resource dynamics**: The actual capacity and behavior of the people/systems involved.
  - **Activity metadata**: Real processing times and automation rates.
  - **Branching logic**: The mathematical probability of a case following a specific path.
- **Scenario simulation**: Using the Digital Twin as a baseline, you create one or more "Scenarios" in the Simulation Dashboard. Here, you adjust variables—such as automating a manual task or changing resource shifts—and "run" the process for a set duration to see how those changes play out.
- **Results and comparison**: The final view compares the KPIs of your hypothetical scenarios against the Digital Twin baseline. This side-by-side analysis allows you to generate reports that justify process investments with data-backed ROI.

## Related topics

- [Digital twin extraction](digital-twin-extraction.html "Digital twin extraction")
- [Scenario simulation](process-simulation---scenario-simulation.html "Process Simulation - Scenario Simulation")
- [Results](process-simulation-results.html "Process Simulation results")


---

## analytics/simulation/process-simulation-results

# Process Simulation results

**Process Simulation in maintenance mode**

Process Simulation is currently in maintenance mode. While existing simulations remain accessible, the creation of new Digital Twin Extractions may be limited. We recommend validating your current model configurations before running new simulation scenarios.

When opening the Results view there are three groups of KPIs to recognize: The Process, the Pool and the Activity level KPIs.

Expand all

[## Viewing and comparing results](#UUID-da17f348-f850-4a20-deac-0114cec3ac6f_UUID-aa838e89-5d06-3f85-705f-6a0319ba4eef_body)

You can view results of the Digital Twin, or compare one or multiple scenarios with the Digital Twin.

To view the results of the Digital Twin, click on the results button next to the Digital Twin. This will open a view with only the Digital Twin.

To compare the results of one scenario with the Digital Twin, click on the results button next to one of the scenarios. The Digital Twin will be shown in black, and the Scenario will be shown in a different color.

To compare multiple scenarios with the Digital Twin, first, open a comparison of one scenario with the Digital Twin. Then, click on the “Compare” button in the upper right corner. In the modal, select the Scenarios you want to compare and click “Compare”. Currently, a comparison of 3 Scenarios with the Digital Twin (4 in total) is possible.

**Note**

Note: In order to get an overview of all the changes accross the scenarios and the Digital Twin, open the "Configuration" tab where all the differences are highlighted.

|  |
| --- |
|  |

|  |
| --- |
|  |

[## Process-level KPIs](#UUID-da17f348-f850-4a20-deac-0114cec3ac6f_UUID-84154363-93e6-28c3-fcc6-5dbaabe681c4_body)

### Results

|  |
| --- |
|  |

#### Number of Cases

The first KPI to see are the number of finished and unfinished cases that where created in the process during the simulation duration. This KPI is useful for both understanding the input quantity of cases to the system and how many cases the process can manage finishing over a time period, but also for interprating the KPIs that follow, many of which are aggregated over the finished cases only.

#### Throughput Time

The Throughput Time of all finished cases displayed on average and on a frequency graph.

#### Cost

The Cost of all finished cases displayed on average and on a frequency graph. The Cost is calculated based on the time the resources were actively processing a case multiplied by the FTE cost per hour.

[## Pool level KPIs](#UUID-da17f348-f850-4a20-deac-0114cec3ac6f_UUID-744047b7-4109-77fa-25a1-bb8d0d1995d1_body)

### Results

|  |
| --- |
|  |

#### Utilization Rate

Resource Utilization Rate shows the percentage of working hours a resource pool is spending performing their activities. A utilization rate of 80% means that this resource pool is occupied at 80% of its capacity. The grey shade between 40% and 80% indicates something like a “best practices” interval - below that the resources are under-utilized, above that over-utilized. This is just an indicator based on what we learned when working with customers. Utilization of 100% means that all work hours are spent performing process activities. However, it does not factor in breaks, meetings, and other activities that are not part of the simulation model.

#### Total Processing Time per Pool

The total time the resources of a Pool spent procesing cases, both finished and unfinished.

#### Total Processing Time per Case per Pool

The average Processing Time a case spends on Activities assigned to the specific Pool until it is finished. Aggregated only over finished cases.

[## Activity level KPIs](#UUID-da17f348-f850-4a20-deac-0114cec3ac6f_UUID-9a2c70e2-12d2-fcf5-8f11-0d28ef909274_body)

### Results

#### Queuing Ratio

The Queuing Ratio defines how much of the overall Throughput Time a case is waiting in a queue. Only finished cases are considered in this step. Aggregated only over finished cases.

#### Throughput Time

The Throughput Time is the sum of Enabling Time, Queuing Time and Processing Time of a case. Aggregated only over finished cases.

#### Total Processing Time per Activity

The average Processing Time a case spends on Activities assigned to the specific Pool until it is finished. Aggregated over both finished and unfinished cases.

#### Number of Occurences

The number of events with the given Activity. Aggregated over both finished and unfinished cases.

|  |
| --- |
|  |

## Related topics

- [Process Simulation](process-simulation.html "Process Simulation")
- [Digital twin extraction](digital-twin-extraction.html "Digital twin extraction")
- [Scenario simulation](process-simulation---scenario-simulation.html "Process Simulation - Scenario Simulation")


---

## analytics/simulation/process-simulation---scenario-simulation

# Process Simulation - Scenario Simulation

**Process Simulation in maintenance mode**

Process Simulation is currently in maintenance mode. While existing simulations remain accessible, the creation of new Digital Twin Extractions may be limited. We recommend validating your current model configurations before running new simulation scenarios.

After publishing the Digital Twin from the Studio, the Simulation Dashboard appears inside the Apps.

It consists of several sections:

- Digital Twin: This is the Digital Twin model as it was configured in the Digital Twin extraction
- Simulated Scenarios: This lists all Scenarios that were created by the users. When clicking on “New Scenario”, a Simulation Scenario is created based on the Digital Twin, and the interface switches into the edit mode.
- Outdated Scenarios: When the Digital Twin is updated and published in the Studio, the outdated Digital Twin and Scenarios are moved to the Outdated Scenarios. These Scenarios can still be re-run with different simulation parameters and the results can be viewed/compared. However, they cannot be modified anymore.
- Side panel Scenario Configuration: Clicking on the Digital Twin or one of the Scenarios allows you to explore its parameters in the configuration on the side.
- Run All Scenarios: Opens a modal that allows you to configure the simulation parameters (e.g. number of days to simulate). Will execute a simulation of the Digital Twin and all configured Simulation Scenarios. The results buttons will be displayed after successfully running the simulation.
- Collections: This will open a list of existing Collections. A collection is a report, generated from one or multiple simulation results. You can view the saved comparison or share it from the three-dot menu.

Expand all

[## Editing a Simulation Scenario](#UUID-76c2e6a8-d110-9bce-f8b2-3349495204d5_UUID-6d455410-ce95-7489-7e3a-c94ddc1048f7_body)

The edit mode for a Simulation Scenario is opened either directly after creating the Scenario or can be opened through the context menu of the Scenario (three-dot menu -> Edit).

The steps presented in the wizard interface are basically the same as in the Digital Twin extraction wizard. Please see “Digital Twin extraction” for details of each section.

**Note**

The Filters step cannot be modified for a Simulation Scenario. However, you can still modify the process flow in your Scenarios by modifying the branching probabilities of the process (e.g. for removing a rework activity from the process).

|  |
| --- |
|  |

|  |
| --- |
|  |

**Advanced**

In contrary to the Digital Twin Extraction, there are no interdependencies when modifying attributes inside the Simulation Scenario creation. Updating the Processing Time of activity will not have an effect on the Enabling Times of edges with this given target Activity.

[## Running a Simulation](#UUID-76c2e6a8-d110-9bce-f8b2-3349495204d5_UUID-9b84d13d-cb80-7bd5-540d-2744c55d56b0_body)

Clicking on “Run All Scenarios” opens a modal that allows you to configure the number of days that will be simulated. After specifying a number, click on “Run” and the simulation for the calculations for the Digital Twin and all Simulation Scenarios will be executed. If the simulation was successful, the “Results” buttons will appear in the list.

**Note**

We recommend setting a simulation duration that is at least one order of magnitude larger than the average throughput time of the simulated process. This ensures that the results are representative.

|  |
| --- |
|  |

|  |
| --- |
|  |

**Advanced:**

When adding or editing a scenario after running the simulation, you have the option to run a simulation for the scenario separately in order to save simulation time, but only with the same simulation duration. If you want to change the duration, you have to rerun all scenarios from the beginning.

## Related topics

- [Process Simulation](process-simulation.html "Process Simulation")
- [Digital twin extraction](digital-twin-extraction.html "Digital twin extraction")
- [Results](process-simulation-results.html "Process Simulation results")


---

