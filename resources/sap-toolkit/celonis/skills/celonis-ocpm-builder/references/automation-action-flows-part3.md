# Automation: Action Flows (Part 3)

## automation/action-flows/google-translate--action-flow-

# Google Translate (Action Flow)

With Google Translate modules in Celonis platform, you can translate a text in your Google Translate account.

Expand all

[## Before you begin](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-id235516620525978_body)

To use the Google Translate module, you must have a Google account and billing enabled in the [Google Cloud Platform](https://console.cloud.google.com/). You can create an account at [accounts.google.com](http://accounts.google.com).

Refer to the [Google Translate API documentation](https://cloud.google.com/translate/docs/reference/rest) for a list of available endpoints.

[## Connect Google Translate to Celonis platform](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_id_connect_body)

To establish the connection, you must:

1. [Create and configure a Google Cloud Platform project for Google Translate](google-translate--action-flow-.html#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_N1697532380290 "Step 1").
2. [Establish the connection with Google Translate in Celonis platform.](google-translate--action-flow-.html#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4570981713206433950644684567 "Establishing the connection with Google Translate in Celonis platform")

### Create and configure a Google Cloud Platform project for Google Translate

Before you establish the connection in Celonis platform you must create and configure a project in the Google Cloud Platform to obtain your API key.

**Cloud Billing**

Your Google account must have Cloud Billing set up in order to enable the required APIs in your project. For information regarding how to create and manage Cloud Billing, see [Google's Manage your Cloud Billing account guide](https://cloud.google.com/billing/docs/how-to/manage-billing-account).

[#### Create a Google Cloud Platform project for Google Translate](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4631444526300834014758367807_body)

To create a Google Cloud Platform project:

1. Sign in to [Google Cloud Platform](https://console.cloud.google.com/) using your Google credentials.
2. On the welcome page, click **Create or select a project** > **New project**.
3. Enter a **Project name** and select the **Location** for your project.
4. Click **Create**.
5. In the top menu, check if your new project is selected in the **Select a project** dropdown. If not, select the project you just created.

**Note**

To create a new project or work in the existing one, you need to have the `serviceusage.services.enable` permission. If you don’t have this permission, ask the Google Cloud Platform Project Owner or Project IAM Admin to grant it to you.

[#### Enable APIs for Google Translate](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4607585137187234014759512905_body)

To enable the required API:

1. Open the left navigation menu and go to **APIs & Services** > **Library**.
2. Search for the following API: **Google Translate API**.
3. Click **Google Translate API**, then click **Enable**.

[#### Obtain your Google Translate API key](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4631444505246434014763827398_body)

To obtain your API key:

1. In the left sidebar, click **APIs & Services** > **Credentials**.
2. Click **+ Create credentials** >  **API key**.
3. Copy **Your API key** value shown and store it in a safe place.

You will use this value in the **API Key** field in Celonis platform.

[### Establishing the connection with Google Translate in Celonis platform](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4570981713206433950644684567_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Google Translate module to your Action Flow, and click **Create a Connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **API Key** field, enter the API key copied in the [Obtain your Google Translate API key section](google-translate--action-flow-.html#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-idm4631444505246434014763827398 "Obtain your Google Translate API key") above.
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Google Translate modules.

[## Types of Google Translate modules](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_section-id235516620862004_body)

[### Build Google Translate Action Flows](#UUID-da1cb6bc-7101-590d-57e2-cb8494580b50_id_actions_body)

After connecting the app, you can perform the following actions:

Transformers

- Translate a text

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/http2--action-flow-

# HTTP2 (Action Flow)

The HTTP2 app is an extension of the HTTP app. It allows you to make an OAuth 2.0 request with flow type Client Credentials. To make an OAuth 2.0 request with flow type Authorization Code or Implicit, use the [HTTP app](http--action-flow-.html "HTTP (Action Flow)").

To make HTTP(S) requests that require an OAuth 2.0 authorization, you need to create an OAuth connection first.

Expand all

[### Create an OAuth 2.0 Connection](#UUID-f3ef53f6-2d1f-8775-f46f-fdf9d50ab883_section-idm4508083595459232829545527054_body)

1. Create an OAuth client in the target service with which you want Celonis platform to communicate. This option is most likely to be found in the Developer section of the given service.

   1. Once you have created the client in the 3rd party service, the given service will display two keys:

      1. `Client ID`
      2. `Client Secret`

         **Note**

         Some services call these `App Key` and `App Secret`.
   2. Make sure you save these keys. You will be asked to provide them when creating the connection in Celonis platform.
2. Find the `Token URI` in the API documentation of the given service. This is the URL address through which Celonis platform communicates with the target service. This address serves for OAuth authorization.

   - Here's an exampleof Yahoo addresses:

     - Token URI: `https://api.login.yahoo.com/oauth2/get_token`
3. In Celonis platform, click the **Add** button to create an OAuth 2.0 connection.
4. Fill in:

|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Connection** | Click the **Add** button to create an OAuth 2.0 connection.  |  |  | | --- | --- | | **Connection name** | Enter the name of the connection. | | **Flow type** | Select the flow for obtaining tokens.  |  |  | | --- | --- | | **Client Credentials** | Enter *Token URI* you have retrieved from the service's API documentation. | | | **Scope** | Add the API scopes for your connection. Check the service API documentation for the list of API scopes. | | **Scope separator** | Select the separator for the list of scopes you entered above. Check the service API documentation for the format of the list of scopes.  If the separator is not set correctly, Celonis platform will be unable to create the connection, and you will receive an invalid scope error. | | **Client ID** | Enter the Client ID. You get the **Client ID** when you create an OAuth client in the service. | | **Client Secret** | Enter the Client Secret. You get the **Client Secret** when you create an OAuth client in the service. | | **Access token parameters** | Enter additional access token request parameters as key-value pairs.  Standard parameters:  - `grant_type`: `authorization_code` - redirect\_uri: `https://www.integromat.com/oauth/cb/oauth2` - `client_id`: The **Client ID** you entered when creating an account. - `client_secret`: The **Client Secret** you entered when creating the account. - `code`: The code returned by the authorization request. | | **Custom Headers** | Specify any custom headers to send in the request. | | **Token placement** | Select whether to send the token in the `header`, `query` string, or both. | | **Header token name** | Enter the name of the authorization token in the header. Default: `Bearer`. | | **Query string parameter name** | Enter the name of the authorization token in the query string. Default: `access_token`. | |
| **URL** | Enter a URL you want to send the request to, e.g., API endpoint, website, etc. |
| **Method** | Select the HTTP method you want to use:  - **GET** - to retrieve information for an entry. - **POST** - to create a new entry. - **PUT** - to update/replace an existing entry. - **PATCH** - to make a partial entry update. - **DELETE** - to delete an entry. |
| **Headers** | Enter the desired request headers. For example, an authorization.  By default, the request does not contain the `Accept` header. If an unexpected response is returned, try adding the `Accept: */*` header. |
| **Query String** | Enter the desired query key-value pairs. |
| **Body type** | HTTP Body is the data bytes transmitted in an [HTTP](https://en.wikipedia.org/wiki/HTTP) transaction message immediately following the [headers](https://en.wikipedia.org/wiki/List_of_HTTP_headers) if there are any to be used.  |  |  | | --- | --- | | **Raw** | The Raw body type is generally suitable for most HTTP body requests, even in situations where developer documentation does not specify data to send.  Specify a form of parsing the data in the *Content type* field.    Despite the content type selected, data is entered in any format that is stipulated or required by the developer documentation. | | **Application/x-www-form-urlencoded** | This body type is to POST data using `application/x-www-form-urlencoded`.    For `application/x-www-form-urlencoded`, the body of the HTTP message sent to the server is essentially one query string. The keys and values are encoded in key-value pairs separated by `&` and with a `=` between the key and the value. Not suitable to use with binary data (use `multipart/form-data` instead).  Example of the resulting HTTP request format:  `field1=value1&field2=value2` | | **Multipart/form-data** | Multipart/form-data is an HTTP multipart request used to send files and data. It is commonly used to upload files to the server.  Add fields to be sent in the request. Each field must contain *Key*-*Value* pair.  |  |  | | --- | --- | | **Text** | Enter the key and value to be sent within the request body. | | **File** | Enter the key and specify the source file you want to send in the request body.  Map the file you want to upload from the previous module (e.g., *HTTP > Get a File* or *Google Drive > Download a File*), or enter the file name and file data manually. | | |
| **Timeout** | Specify the request timeout in seconds (1-300). Default: 40 seconds. |
| **Self-signed certificate** | Upload your certificate if you want to use TLS using your self-signed certificate.. |
| **Reject connections that use unverified (self-signed) certificates** | Enable this option to reject connections that use unverified TLS certificates. |
| **Follow redirect** | Follows the URL redirections with 3xx responses. |
| **Follow all redirect** | Follows the URL redirections with all response codes. |
| **Request compressed content** | Enable this option to request a compressed version of the website. Adds an `Accept-Encoding` header to request compressed content. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/http--action-flow-

# HTTP (Action Flow)

The HTTP app provides modules for communication based on the [Hypertext Transfer Protocol (HTTP)](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol). HTTP is the fundamental component of data transfer for the World Wide Web. As the backbone of information exchange between web servers and clients, HTTP allows you to download web pages, access files, make API calls, and trigger webhooks.

## Overview of the HTTP (Action Flow) modules

Select a module of the HTTP app based on the authentication requirements of the resource you want to use. To use modules that require authentication, you have to create a connection first.

- Make a request: universal module, best to use for resources that do not require authentication.
- Make a basic auth request: for resources that require [basic authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme).
- [Make an API key Auth request](http--action-flow-.html#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-b3ec54fe-3b11-9538-fbe0-b4b0e0422e95 "Make an API key Auth request"): for resources that require [API key authentication](https://swagger.io/docs/specification/authentication/api-keys/).
- Make an OAuth 2.0 request: for resources that require [OAuth 2.0](https://oauth.net/2/) authorization.
- Make a client certificate auth request: for resources that require client-side certificate authentication.
- [Get a file](http--action-flow-.html#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-da314eff-2fad-cae5-33e1-80823c172113 "Get a file"): download a file from the URL.
- [Resolve a target URL](http--action-flow-.html#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-6f8041ff-484f-5437-97aa-353fe8c370f1 "Resolve a target URL"): retrieve the target URL from a chain of HTTP redirects.
- [Retrieve headers](http--action-flow-.html#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-aa821c28-a0c3-f458-c13a-ce92af176427 "Retrieve Headers"): to get headers from the HTTP request module in separate bundles.

**Note**

The module dialog fields that are displayed in **bold** (in the Celonis platformAction Flow, **not** in this documentation article) are mandatory!

Expand all

[## Make a request](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-ff3f58ad-40fa-f1a3-bdb6-58277fc55ad5_body)

The **Make a request** module allows you to create an HTTP request and send it to a server. The output bundle contains the HTTP response.

|  |  |
| --- | --- |
| **Evaluate all states as errors (except for 2xx and 3xx)** | Use the response status to detect errors. Otherwise, the module reports only Celonis platform related errors (like mapping errors or missing required values). |
| **URL** | Enter the request URL. |
| **Serialize URL** | Encodes the API call URL with the URL encoding (encoding special characters for example). |
| **Method** | Select the HTTP method you want to use:  - **GET**: to retrieve information for an entry. - **POST**: to create a new entry. - **PUT**: to update/replace an existing entry. - **PATCH**: to make a partial entry update. - **DELETE**: to delete an entry. |
| **Headers** | Enter request [headers](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields). For example, the response content type.  **Caution**  The **HTTP** app requests do not have the  [Accept header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept). If the HTTP request returns an unexpected response, try adding the `Accept: */*` header. |
| **Query String** | Enter the query key-value pairs. |
| **Body type** | HTTP `body` contains the data transferred in an HTTP request.  |  |  | | --- | --- | | **Raw** | The **Raw**`body` type is suitable for most HTTP requests, even if the app documentation does not specify the data type.  Specify the data format of the `body` content in the **Content type** field. | | **Application/x-www-form-urlencoded** | This body type is to `POST` data using `application/x-www-form-urlencoded`.    For `application/x-www-form-urlencoded`, the body of the HTTP request sent to the server is one query string. The keys and values are encoded in key-value pairs separated by `&` and with a `=` between the key and the value. For binary data, use the `multipart/form-data` body type instead.  Example of the resulting HTTP request format: `field1=value1&field2=value2` | | **Multipart/form-data** | Use the `multipart/form-data` content type to send files in the HTTP request.  Add fields to the request. Each field must contain a key-value pair:  **Text**: Enter the key and value to send in the request body.  **File**: Enter the key, and specify the source file you want to send in the request body. Map the file you want to upload from the previous module (for example: **HTTP** > **Get a File** or **Google Drive** > **Download a File**), or enter the file name and file data manually. | |
| **Parse response** | Enable to parse HTTP responses into bundles. With this option, you don't need to add the **Parse JSON** or **Parse XML** modules. Otherwise, the HTTP module returns the raw response data.  Before you can use parsed JSON or XML content, run the module once manually so that the module can recognize the response content and allow you to map it in subsequent modules. |
| **User name** | Enter the user name to send the request with the basic auth. |
| **Password** | Enter the password to send the request with the basic auth. |
| **Timeout** | Specify the request timeout in seconds (1-300). Default: 40 seconds. |
| **Share cookies with other HTTP modules** | Enable to share cookies from the server with all HTTP modules in your Action Flow. |
| **Self-signed certificate** | Upload your certificate if you want to use TLS using your self-signed certificate. |
| **Reject connections that use unverified (self-signed) certificates** | Enable to reject connections that use unverified TLS certificates. |
| **Follow redirect** | Enable to follow URL redirects that return 3xx response statuses. |
| **Follow all redirect** | Enable to follow URL redirects regardless of response statuses. |
| **Disable serialization of multiple same query string keys as arrays** | Celonis platform handles multiple values for the same URL query string parameter key as arrays (e.g., `www.test.com?foo=bar&amp;foo=baz` will be converted to `www.test.com?foo[0]=bar&amp;foo[1]=baz`). Enable to deactivate this behavior. |
| **Request compressed content** | Enable to request compression of the response data. Adds the `Accept-Encoding` header. |
| **Use Mutual TLS** | Select if you want to use mutual TLS (mTLS) for the HTTP request to ensure both the client and server authenticate each other using certificates. |

### Example HTTP request with the Make a request module

Check the following screenshot to see how to set up the **Make a request** module to send a `POST` request with the `body` in the JSON data format:

To make sure your JSON is valid, use a JSON validator (for example: <https://jsonlint.com/>) or use a **Create JSON** module to create the JSON.

**Caution**

Be careful when combining JSON data with mapping variables or function directly in the **Request content** field. Mixing JSON with mapping can lead to an invalid JSON structure.

[## Make a Basic Auth request](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-172a446e-4710-aebf-dd53-37d86f9ff989_body)

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

[## Make an API key Auth request](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-b3ec54fe-3b11-9538-fbe0-b4b0e0422e95_body)

The **Make an API key Auth request** module allows you to send API calls to apps that require API key authorization. The module also supports "Bearer" authorization.

The output bundle contains the HTTP response.

### Create an API key connection for the Make an API key Auth request module

Check out the following example if you want to set up a connection for the **Make an API key Auth request** module:

1. In the **Make an API key Auth request** module settings, click the **Add** button. The **Add a new keychain** window pops up.
2. Fill in:

   1. **Name**: The label for your API key connection.
   2. **Key**: The API key to authorize the HTTP calls. If the API uses "Bearer" or "Token" authorization, add the word before the API key.

      *Example*: `Bearer 1234-5678-abcd-efgh`

      **Note**

      You can use the eye icon at the edge of the box to reveal the API key and the text you add to it. If you do, make sure that you are the only one viewing the content.
   3. **API key placement**: Select if you want the authorization in the request header or query string.
   4. **API key parameter name**: The name of the parameter that contains the API key.
3. Click **Create** to create the connection.

You created an API key connection. You can now use the connection in the **Make an API key Auth request** module.

[## Make an OAuth 2.0 request](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-0768d0c6-7fc3-b137-6764-e3ed53135026_body)

In order to make HTTP(S) requests that require an OAuth 2.0 authorization, you need to create an OAuth connection first.

### Create an OAuth 2.0 Connection

To configure the app inCelonis platform, you need to create OAuth 2.0 credentials in the app developer portal or settings and enter them in the HTTP module in Action Flows.

**Note**

Celonis platform supports two flows:

- Authorization code: enter an **Authorize URL** and **Token URL** from the app API documentation.
- Implicit: enter the **Authorize URL** from the app API documentation.

#### Prerequisites

- An app account
- Access to a developer portal or settings
- A Redirect URL (sometimes called a Callback URL).

#### Obtaining credentials in the app

1. Create an OAuth client in the app that you want to connect with Celonis platform. To do this, enter the developer portal or settings.

   1. Specify a **Redirect URL**: `https://www.integromat.com/oauth/cb/oauth2`
   2. Obtain the **Client ID** and **Client Secret**. Sometimes the app calls them **App Key** and **App Secret**.
   3. Save the Client ID and Client Secret in a safe place. You will need them when building a Action Flow in Celonis platform.
2. Find the **Authorize URL** and **Token URL** in the app API documentation. These are the addresses through which Celonis platform communicates with the app.

#### Establishing the connection in Celonis platform

Once you have your credentials from the app, you can enter them in the app's configuration in Celonis platform

1. Go to a Celonis platform Action Flow.
2. Add the **HTTP - Make an OAuth 2.0 request** module.
3. Click **Create a connection**.
4. Optional: In the **Connection name** field, enter a name for the connection.
5. In **Flow type**, select the flow.
6. In **Scopes**, add API scopes. Refer to the app API documentation to get scopes.
7. In **Client ID** and **Client Secret** enter the credentials you saved previously.
8. Click **Save** to create an OAuth 2.0 connection.

You have created an OAuth 2.0 connection. Now you can use the connection in the **Make an OAuth 2.0 request** module.

Check the advanced settings for creating a connection:

|  |  |
| --- | --- |
| **Scope separator** | Select the separator for the list of scopes you entered above. Check the app API documentation for the format of the list of scopes.  If the separator is not set correctly, Celonis platform will be unable to create the connection, and you will receive an invalid scope error. |
| **Authorize parameters** | Enter additional authorization request parameters as a key-value pair:  - `response_type`: `code` for the **Authorization code** flow and `token` for the **Implicit** flow. - `redirect_uri`: `https://www.integromat.com/oauth/cb/oauth2` - `client_id`: The **Client ID** you entered when creating an account. |
| **Access token parameters** | Enter additional access token request parameters as key-value pairs.  Standard parameters:  - `grant_type`: `authorization_code` - `redirect_uri`: `https://www.integromat.com/oauth/cb/oauth2` - `client_id`: The **Client ID** you entered when creating an account. - `client_secret`: The **Client Secret** you entered when creating the account. - `code`: The code returned by the authorization request. |
| **Refresh token parameters** | Enter the additional refresh token request parameters as key-value pairs.  Standard parameters:  - `grant_type`: `refresh_token` - `refresh_token`: The Refresh token obtained together with the Access token. - `client_id`: The **Client ID** you entered when creating the account. - `client_secret`: The **Client Secret** you entered when creating the account. |
| **Custom Headers** | Specify any custom headers to send in the request. |
| **Token placement** | Select whether to send the token in the `header`, `query` string, or both. |
| **Header token name** | Enter the name of the authorization token in the header. Default: `Bearer`. |
| **Query string parameter name** | Enter the name of the authorization token in the query string. Default: `access_token`. |

### Module settings

[## Make a client certificate authentication request](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-887c22a3-19ff-9d0b-12e2-8656a0f564ba_body)

Sends an HTTP(S) request to apps that require a client certificate authorization.

[## Get a file](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-da314eff-2fad-cae5-33e1-80823c172113_body)

Downloads a file from a URL.

|  |  |
| --- | --- |
| **URL** | Enter the URL of the file you want to download. You can use the file (map the file data) in other modules in the Action Flow. |

[## Resolve a target URL](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-6f8041ff-484f-5437-97aa-353fe8c370f1_body)

Enter the URL you want to resolve. The output bundle contains the link to which the original URL redirects in the `location` [response header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location).

This module helps you to get a direct URL to a resource instead of a redirect URL. For example, links for sharing files in storage apps like [Dropbox](dropbox.html "Dropbox") redirect you before you reach the target file. The module navigates through the redirect chain and returns the target URL.

|  |  |
| --- | --- |
| **URL** | Enter the URL you want to resolve. |
| **Method** | Select the method you want to use. |

[## Retrieve Headers](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-aa821c28-a0c3-f458-c13a-ce92af176427_body)

Returns each header (name and value) from the specified HTTP module in a separate bundle.

|  |  |
| --- | --- |
| **Source Module** | Select the module you want to retrieve headers from. |

[## How to generate JSON Web Tokens (JWT)](#UUID-7e11edf1-1ea6-ad55-421b-ea9fb46648f9_UUID-6ab93654-3114-3b8f-0f8d-ccd0d2188c19_body)

If you need to connect to an API or send messages that requires JWT authentication, you can create a JWT via the HTTP module using the HS256 or HS512 algorithms. Celonis platform allows creating a JWT with the help of custom or built-in functions.

### Generating a JWT via a custom function

You can create a HS256 or HS512 JWT with the help of Celonis platform custom functions.

**Note**

Custom functions are available to the **Enterprise** plan users only.

Follow the steps to create a JWT:

1. Go to **Functions** and create a custom function using the following body:

   ```
   function readableJWTencode(payload, secret, header = '{"alg":"HS256","typ":"JWT"}') {
       let formattedHeader = iml.replace(iml.replace(iml.replace(iml.base64(header), "=", ""), "+", "-"), "/", "_")
       let formattedPayload = iml.replace(iml.replace(iml.replace(iml.base64(payload), "=", ""), "+", "-"), "/", "_")
       let signature = iml.sha256(formattedHeader + "." + formattedPayload, "base64", secret)
       let formattedSignature = iml.replace(iml.replace(iml.replace(signature, "=", ""), "+", "-"), "/", "_")
       let jwt = formattedHeader + "." + formattedPayload + "." + formattedSignature
       return jwt
   }
   ```

   **Note**

   Replace **HS256** with **HS512** and **sha256** with **sha512** in the custom function above to create a HS512 JWT.

   The example custom function has the **jwtEncode** name embedded onto the function body. If you want to use another name, change it in the body too.
2. Start your Action Flow with the **Set multiple variables** module and add three items:

   1. Item 1:

      1. In **Variable name**, enter `header`.
      2. In **Variable value**, enter the following function:

         `{"alg":"HS256","typ":"JWT"}`

         **Note**

         Replace **HS256** with **HS512** to create a HS512 JWT.
   2. Item 2:

      1. In **Variable name**, enter `payload`.
      2. In **Variable value**, enter the following function:

         `{"var1":1,"var2":"text"}`
   3. Item 3:

      1. In **Variable name**, enter `secret`.
      2. In **Variable value**, enter your 256-bit or 512-bit secret.
3. Add another **Set multiple variables** module to generate the JWT.
4. Optional: In **Variable name**, enter the name for the token.
5. In **Variable value**, enter the following function:

   `{{jwtEncode(11.payload; 11.secret)}}`

   **Note**

   Make sure to take into account the module number in the code. In the example above, the header, payload and secret are in the 11th module in the Action Flow. It may vary from one Action Flow to another.

If you run the Action Flow, you will receive the HS256 or HS512 JWT in the second module's output.

|  |
| --- |
|  |

You can connect to an API or send messages that requires JWT authentication.

### Generating a JWT via built-in functions

To generate a JWT with the help of built-in functions, do the following in your Action Flow:

1. Start your Action Flow with the **Set multiple variables** module and add three items:

   1. Item 1:

      1. In **Variable name**, enter `header`.
      2. In **Variable value**, enter the following function:

         `{{replace(replace(replace(base64("{""alg"":""HS256"",""typ"":""JWT""}"); "="; emptystring); "+"; "-"); "/"; "_")}}`

         **Note**

         Replace **HS256** with **HS512** to create a HS512 JWT.
   2. Item 2:

      1. In **Variable name**, enter `payload`.
      2. In **Variable value**, enter the following function:

         `{{replace(replace(replace(base64("{""var1"":1,""var2"":""text""}"); "="; emptystring); "+"; "-"); "/"; "_")}}`
   3. Item 3:

      1. In **Variable name**, enter `secret`.
      2. In **Variable value**, enter your 256-bit or 512-bit secret.
2. Add another **Set multiple variables** module to generate the HS256 or HS512 JWT.
3. Optional: In **Variable name**, enter the name for the token.
4. In **Variable value**, enter the following function:

   `{{5.header}}.{{5.payload}}.{{replace(replace(replace(sha256(5.header + "." + 5.payload; "base64"; 5.secret); "="; emptystring); "+"; "-"); "/"; "_")}}`

   **Note**

   Use the `sha512` function to create a HS512 JWT.

   Make sure to take into account the module number in the code. In the example above, the header, payload and secret are in the 5th module in the Action Flow. It may vary from one Action Flow to another.

If you run the Action Flow, you will receive the HS256 or HS512 JWT in the second module's output.

|  |
| --- |
|  |

You can connect to an API or send messages that requires JWT authentication.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/infor-m3--action-flow-

# Infor M3 (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Infor M3 modules allow you to create, update, retrieve, and list the supplier invoices in your Infor M3 account.

Expand all

[## Before you begin](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_section-id23552203009907_body)

To use Infor M3 in Celonis platform you must have an Infor M3 account - create an account at [infor.com/resources/infor-m3-cloud](https://www.infor.com/resources/infor-m3-cloud).

[## Connecting Infor M3 to Celonis platform](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect_body)

To connect your Infor M3, you need Host URL, Username, and Password for your Infor M3 Cloud account and insert it in the *Create a connection* dialog in the Celonis platform module. Please reach out to your system administrator for the details.

1. Log in to your Celonis platform account, add a module from the Infor M3 app into an Celonis platform scenario.
2. Click *Add* next to the *Connection* field.
3. In the Connection name field, enter a name for the connection.
4. In the Username and Password fields, enter your Infor M3 account credentials, and click *Continue*.

The connection has been established.

[## Types of Infor M3 modules](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_section-id235522031406033_body)

[### Supplier Invoice](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_UUID-854d33b6-879b-7c57-54af-104fdba09781_body)

[#### List Supplier Invoices by Payee](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_list-supplier-invoices-by-payee_body)

Retrieves a list of supplier invoices by the payee.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices you want to list. The value should be a minimum of three characters in length. |
| **SPYN: Payee** | Enter (map) the payee whose supplier invoice you want to list. The value should be a minimum of 10 characters in length. |
| **SUNO: Supplier** | Enter (map) the supplier whose invoices you want to list. The value should be a minimum of 10 characters in length. |
| **IBTP: Invoice Batch Type** | Enter (map) the invoice batch type to list the invoices that match the specified type. |
| **SUPA: Invoice Status** | Enter (map) the invoice status to list the invoices that match the specified status. |
| **Limit** | Set the maximum number of invoices Celonis platform should return during one execution cycle. |

[#### List Supplier Invoice Line Items](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_list-supplier-invoice-line-items_body)

Retrieves a list of supplier invoice line items by the invoice batch number.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **INBN: Invoice Batch Number** | Enter (map) the invoice batch number whose line items you want to list. |
| **Limit** | Set the maximum number of line items Celonis platform should return during one execution cycle. |

[#### Create a Supplier Invoice](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_create-a-supplier-invoice_body)

Creates a new supplier invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **IVDT: Invoice Date** | Enter (map) the date on the invoice. |
| **SINO: Supplier Invoice Number** | Enter (map) the supplier's invoice number. The value must be at most 24 characters long. |
| **SUNO: Supplier** | Enter (map) the supplier name. The value must be at most 10 characters long. |
| **CUCD: Currency Code** | Enter (map) the applicable currency code for the supplier invoice. For example, `USD`. |
| **TEPY: Payment Terms** | Enter (map) the payment terms. The value must be at most three characters long. |
| **PYME: Payment Method - Accounts Payable** | Enter (map) the details of the payment method. The value must be at most three characters long. |
| **BKID: Bank Account Identity** | Enter (map) the supplier's bank account identity information. The value must be at most five characters long. |
| **TDCD: Trade Code** | Enter (map) the supplier's trade code. The value must be at most four characters long. |
| **CRTP: Exchange Rate Type** | Enter (map) the supplier's applicable exchange rate type. The value must be at most 24 characters long. |
| **DEDA: Delivery Date** | Enter (map) the when the invoice delivery date. The value must be at most 24 characters long. |
| **IBTP: Invoice Batch Type** | Enter (map) the invoice batch type. The value must be at most two characters long. |
| **SPYN: Payee** | Enter (map) the payee's name. The value must be at most 10 characters long. |
| **ARAT: Exchange Rate** | Enter (map) the exchange rate applicable to the invoice. |
| **CUAM: Foreign Currency Amount** | Enter (map) the invoice amount in the supplier's applicable foreign currency. |
| **VTAM: VAT** | Enter (map) the applicable VAT amount on the invoice. |
| **ACDT: Accounting Date** | Enter (map) the accounting date of the invoice. |
| **APCD: Authorized User** | Enter (map) the authorized user details of the invoice. |
| **IMCD: Invoice Matching** | Select whether the invoice matching the details. |
| **SERS: Service Code** | Enter (map) the service code applicable to the invoice. |
| **DUDT: Due Date** | Enter (map) the date on which the invoice is due. |
| **FECN: Future Rate Agreement Number** | Enter (map) the future rate agreement number. |
| **FTCO: From/To Country** | Enter (map) the country name from which the invoice is billed or delivered to. |
| **BSCD: Base Country** | Enter (map) supplier's base country details. |
| **PUNO: Purchase Order Number** | Enter (map) the purchase order number in the invoice. |
| **PUDT: Order Date** | Enter (map) the order date of the invoice. |
| **TECD: Cash Discount Term** | Enter (map) the cash discount term applicable to the invoice. |
| **CDT1: Cash Discount Date 1** | Enter (map) the date on which the cash discount is applicable. |
| **CDP1: Cash Discount Percentage 1** | Enter (map) the cash discount in percentage. |
| **CDC1: Cash Discount Amount 1** | Enter (map) the cash discount amount. |
| **CDT2: Cash Discount Date 2** | Enter (map) the date on which the cash discount is applicable. |
| **CDP2: Cash Discount Percentage** | Enter (map) the cash discount in percentage. |
| **CDC2: Cash Discount Amount 2** | Enter (map) the cash discount amount. |
| **CDT3: Cash Discount Date 3** | Enter (map) the date on which the cash discount is applicable. |
| **CDP3: Cash Discount Percentage 3** | Enter (map) the cash discount in percentage. |
| **CDC3: Cash Discount Amount 3** | Enter (map) the cash discount amount. |
| **TTXA: Total Taxable Amount** | Enter (map) the total tax applicable to the invoice. |
| **TASD: Cash Discount Base** | Enter (map) the cash discount base details. |
| **PRPA: Prepaid Amount** | Enter (map) the prepaid amount paid for the invoice. |
| **VRNO: VAT Registration Number** | Enter (map) the invoice VAT registration number. |
| **TXAP: Tax Applicable** | Enter (map) the tax applicable to the invoice. |
| **DNCO: Document Code** | Enter (map) the document code |
| **SDAP: AP Standard Document** | Enter (map) the invoice applicable AP standard document number. |
| **DNRE: Debit Note Reason** | Enter (map) the amount debit note reason. |
| **PYAD: Our Invoicing Address** | Enter (map) your invoice address. |
| **SDA1: Text line 1** | Enter (map) the information about the invoice. |
| **SDA2: Text line 2** | Enter (map) the information about the invoice. |
| **SDA3: Text line 3** | Enter (map) the information about the invoice. |
| **EALP: EAN Location Code Payee** | Enter (map) the payee's EAN location code. |
| **EALR: EAN Location Code Consignee** | Enter (map) the consignee's EAN location code details. |
| **EALS: EAN Location Code Supplier** | Enter (map) the EAN Location Code of the supplier. |
| **GPDF: Get Payee Defaults** | Select whether you want to retrieve the supplier's payee default details. |
| **GEOC: Geographical Code** | Enter (map) the geographical code applicable to the invoice. |
| **TXIN: Tax Included** | Select whether the tax is included in the |
| **DNOI: Original Invoice Number** | Enter (map) the original invoice number. |
| **OYEA: Original Year** | Enter (map) the invoice year. |
| **PPYR: Reference Number** | Enter (map) the invoice reference number. |
| **PPYN: Payment Request Number** | Enter (map) the invoice payment request number. |
| **YEA4: Year** | Enter (map) the year applicable to the invoice. |
| **PVLD: Partial Validation** | Select whether the partial validation is applicable on |
| **VONO: Voucher Number** | Enter (map) the voucher number applicable to the invoice. |
| **CORI: Correlation ID** | Enter (map) the invoice Correlation ID. |
| **ECAR: State Code** | Enter (map) the state code applicable to the invoice. |

[#### Add a Supplier Invoice Line Item](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_add-a-supplier-invoice-line-item_body)

Creates a new line item and attaches it to an existing supplier invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **INBN: Invoice Batch Number** | Enter (map) the invoice batch number whose line items you want to add. |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **RDTP: Line type** | Enter (map) the invoice line item type. |
| **ITNO: Item Number** | Enter (map) the item number which you want to add. |
| **PUUN: Purchase Order U/M** | Enter (map) the purchase order number of the item. |
| **PPUN: Purchase Price U/M** | Enter (map) the purchase price of the item. |
| **SERS: Service Code** | Enter (map) the item's service code. |
| **NLAM: Net Amount - Line** | Enter (map) the total net amount of the line item. |
| **VTA1: VAT Amount 1** | Enter (map) the VAT amount applicable to the line item. |
| **VTA2: VAT Amount 2** | Enter (map) the VAT amount applicable to the line item. |
| **VTCD: VAT Code** | Enter (map) the VAT code applicable to the line item. |
| **PUNO: Purchase Order Number** | Enter (map) the purchase order number of the line. |
| **PNLI: Purchase Order Line** | Enter (map) the purchase order line sub number of the line item. |
| **PNLS: Purchase Order Line Subnumber** | Enter (map) the purchase order number in the invoice. |
| **IVQA: Invoiced Quantity - Alternate U/M** | Enter (map) the number of invoiced line items. |
| **GRPR: Gross Price** | Enter (map) the gross amount of the line item. |
| **NEPR: Net Price** | Enter (map) the net price of the line items. |
| **PUCD: Purchase Price Quantity** | Enter (map) the total purchase price of the present quantity of the items. |
| **GLAM: Gross Amount - Line** | Enter (map) the total gross amount of the line item. |
| **DIPC: Discount** | Enter (map) the discount provided on the line item. |
| **DIAM: Discount Amount** | Enter (map) the discount amount provided on the line item. |
| **IVCW: Invoiced Catch Weight** | Enter (map) the line item's weight listed in the invoice. |
| **POPN: Alias Number** | Enter (map) the invoice alias number. |
| **SBAN: Self-billing Agreement Number** | Enter (map) the invoice self-billing agreement number. |
| **CDSE: Sequence Number - Costing Element** | Enter (map) the sequence number of the line item. |
| **CEID: Costing Element** | Enter (map) the line item costing element. |
| **REPN: Receiving Number** | Enter (map) the line item receiving number. |
| **RELP: Receipt Type** | Enter (map) the line item receipt type. |
| **SUDO: Delivery Note Number** | Enter (map) the delivery note number of the line item. |
| **DNDT: Delivery Note Date** | Enter (map) the date on which the delivery note was provided. |
| **CLAN: Claim Number** | Enter (map) the claim number. |
| **CLLN: Claim Order Line** | Enter (map) the claim order line number. |
| **TRNO: Transaction Number** | Enter (map) the line item transaction number. |
| **VTP1: VAT Rate 1** | Enter (map) the VAT rate of the line item. |
| **VTP2: VAT Rate 2** | Enter (map) the VAT rate of the line item. |
| **CHGT: Charge Text** | Enter (map) the item's charge text. |
| **PVLD: Partial Validation** | Select whether the partial validation is applicable on the invoice line item. |

[#### Get a Supplier Invoice](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_get-a-supplier-invoice_body)

Retrieves the details of a supplier invoice by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **INBN: Invoice Batch Number** | Enter (map) the invoice batch number whose details you want to retrieve. |

[#### Get a Supplier Invoice Line Item](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_get-a-supplier-invoice-line-item_body)

Retrieves the details of a supplier invoice line item by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **INBN: Invoice Batch Number** | Enter (map) the invoice batch number whose line items you want to retrieve. |
| **TRNO: Transaction Number** | Enter (map) the transaction number of the supplier invoice line item whose details you want to retrieve. |

[#### Update a Supplier Invoice](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_update-a-supplier-invoice_body)

Updates an existing supplier invoice by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **DIVI: Division** | Enter (map) the division whose supplier invoices line items you want to list. The value should be a minimum of three characters in length. |
| **IVDT: Invoice Date** | Enter (map) the date on the invoice. |
| **SINO: Supplier Invoice Number** | Enter (map) the supplier's invoice number. The value must be at most 24 characters long. |
| **SUNO: Supplier** | Enter (map) the supplier name. The value must be at most 10 characters long. |
| **CUCD: Currency Code** | Enter (map) the applicable currency code for the supplier invoice. For example, `USD`. |
| **TEPY: Payment Terms** | Enter (map) the payment terms. The value must be at most three characters long. |
| **PYME: Payment Method - Accounts Payable** | Enter (map) the details of the payment method. The value must be at most three characters long. |
| **BKID: Bank Account Identity** | Enter (map) the supplier's bank account identity information. The value must be at most five characters long. |
| **TDCD: Trade Code** | Enter (map) the supplier's trade code. The value must be at most four characters long. |
| **CRTP: Exchange Rate Type** | Enter (map) the supplier's applicable exchange rate type. The value must be at most 24 characters long. |
| **DEDA: Delivery Date** | Enter (map) the when the invoice delivery date. The value must be at most 24 characters long. |
| **IBTP: Invoice Batch Type** | Enter (map) the invoice batch type. The value must be at most two characters long. |
| **SPYN: Payee** | Enter (map) the payee's name. The value must be at most 10 characters long. |
| **ARAT: Exchange Rate** | Enter (map) the exchange rate applicable to the invoice. |
| **CUAM: Foreign Currency Amount** | Enter (map) the invoice amount in the supplier's applicable foreign currency. |
| **VTAM: VAT** | Enter (map) the applicable VAT amount on the invoice. |
| **ACDT: Accounting Date** | Enter (map) the accounting date of the invoice. |
| **APCD: Authorized User** | Enter (map) the authorized user details of the invoice. |
| **IMCD: Invoice Matching** | Select whether the invoice matching the details. |
| **SERS: Service Code** | Enter (map) the service code applicable to the invoice. |
| **DUDT: Due Date** | Enter (map) the date on which the invoice is due. |
| **FECN: Future Rate Agreement Number** | Enter (map) the future rate agreement number. |
| **FTCO: From/To Country** | Enter (map) the country name from which the invoice is billed or delivered to. |
| **BSCD: Base Country** | Enter (map) supplier's base country details. |
| **PUNO: Purchase Order Number** | Enter (map) the purchase order number in the invoice. |
| **PUDT: Order Date** | Enter (map) the order date of the invoice. |
| **TECD: Cash Discount Term** | Enter (map) the cash discount term applicable to the invoice. |
| **CDT1: Cash Discount Date 1** | Enter (map) the date on which the cash discount is applicable. |
| **CDP1: Cash Discount Percentage 1** | Enter (map) the cash discount in percentage. |
| **CDC1: Cash Discount Amount 1** | Enter (map) the cash discount amount. |
| **CDT2: Cash Discount Date 2** | Enter (map) the date on which the cash discount is applicable. |
| **CDP2: Cash Discount Percentage 2** | Enter (map) the cash discount in percentage. |
| **CDC2: Cash Discount Amount 2** | Enter (map) the cash discount amount. |
| **CDT3: Cash Discount Date 3** | Enter (map) the date on which the cash discount is applicable. |
| **CDP3: Cash Discount Percentage 3** | Enter (map) the cash discount in percentage. |
| **CDC3: Cash Discount Amount 3** | Enter (map) the cash discount amount. |
| **TTXA: Total Taxable Amount** | Enter (map) the total tax applicable to the invoice. |
| **TASD: Cash Discount Base** | Enter (map) the cash discount base details. |
| **PRPA: Prepaid Amount** | Enter (map) the prepaid amount paid for the invoice. |
| **VRNO: VAT Registration Number** | Enter (map) the invoice VAT registration number. |
| **TXAP: Tax Applicable** | Enter (map) the tax applicable to the invoice. |
| **DNCO: Document Code** | Enter (map) the document code |
| **SDAP: AP Standard Document** | Enter (map) the invoice applicable AP standard document number. |
| **DNRE: Debit Note Reason** | Enter (map) the amount debit note reason. |
| **PYAD: Our Invoicing Address** | Enter (map) your invoice address. |
| **SDA1: Text line 1** | Enter (map) the information about the invoice. |
| **SDA2: Text line 2** | Enter (map) the information about the invoice. |
| **SDA3: Text line 3** | Enter (map) the information about the invoice. |
| **EALP: EAN Location Code Payee** | Enter (map) the payee's EAN location code. |
| **EALR: EAN Location Code Consignee** | Enter (map) the consignee's EAN location code details. |
| **EALS: EAN Location Code Supplier** | Enter (map) the EAN Location Code of the supplier. |
| **GPDF: Get Payee Defaults** | Select whether you want to retrieve the supplier's payee default details. |
| **GEOC: Geographical Code** | Enter (map) the geographical code applicable to the invoice. |
| **TXIN: Tax Included** | Select whether the tax is included in the |
| **DNOI: Original Invoice Number** | Enter (map) the original invoice number. |
| **OYEA: Original Year** | Enter (map) the invoice year. |
| **PPYR: Reference Number** | Enter (map) the invoice reference number. |
| **PPYN: Payment Request Number** | Enter (map) the invoice payment request number. |
| **YEA4: Year** | Enter (map) the year applicable to the invoice. |
| **PVLD: Partial Validation** | Select whether the partial validation is applicable on |
| **VONO: Voucher Number** | Enter (map) the voucher number applicable to the invoice. |
| **CORI: Correlation ID** | Enter (map) the invoice Correlation ID. |
| **ECAR: State Code** | Enter (map) the state code applicable to the invoice. |

[### Other](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_UUID-554a6110-f037-939b-d315-acd5461d3d47_body)

[#### Make an API Call](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_make-an-api-call_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Infor M3 account](infor-m3--action-flow-.html#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_Connect "Connecting Infor M3 to Celonis platform"). |
| **URL** | Enter a path relative to `https://{YOUR_HOST}/m3api-res`. For example: `/execute/<Your_Account>/GetUserInfo` |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry.  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Example of Use - Get Users](#UUID-19e443ce-9402-7f90-2f5e-7aeb928ea745_id_example-of-use---get-users_body)

The following API call returns all the conversations from your Infor M3 account:

**URL**: `/execute/<Account_Host>/GetUserInfo`

**Method**: `GET`

Matches of the search can be found in the module's **Output** under *Bundle* > *Body > Metadata*. In our example, 13 users were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/managing-action-flows

# Managing Action Flows

Global Automation settings that to the entire Celonis Studio, for example, you can use one Celonis Agent across all your packages to connect to your on-prem applications. The same applies to your user connections, webhooks, keys and data structures.

To access automation tools, go to Studio and select **Automations**.

Automations allow you to configure the following:

Expand all

[## User Connections](#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-UserConnections_body)

**Note**

When setting up a **Action Flow**, you can connect to many different third-party applications such as SAP, Oracle, Salesforce or Google.

In order to allow your Action Flows access to particular applications, you need user connections.

1. Go to "Connections".
2. In the top right, select your package.
3. Here you can perform the following actions for all connection that were created in this Studio Package:

   - view permissions
   - reauthorize
   - edit
   - verify
   - delete

   The connections you create with your personal credentials are shared within the same Studio package. Your team can use and delete connections that were created in this package. This way you can easily collaborate across your team to speed up automations.

[## Webhooks](#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-Webhooks_body)

**Note**

A **Webhook**, also known as a web callback, is a method that enables an app or web service to send real-time information to another application. The occurrence of an event triggers a webhook and sends over the data instantly.

Any application that is connected to the Internet and allows the sending of HTTP requests can send webhooks to Celonis Platform.

Many services provide so-called **Webhooks** to deliver **instant notifications whenever a certain change occurs in a service**. Moreover, Action Flows don’t just offer the option to incorporate existing Webhooks but also to create new**custom Webhooks**.

1. Go to "Webhooks",
2. Select your package on the top right
3. Here you can:

   - open the Action Flow that is using the Webhook
   - edit your Webhook
   - de/activate your Webhook
   - delete your Webhook
   - view the Webhook queue

[## Keys](#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-Keys_body)

Action Flows communicate with different applications and services. If required, you can apply a public key encryption system to ensure confidentiality. In a public-key encryption system, there are two types of keys: a public key that can be used by anybody to encrypt the message as well as a private key that is only known to the receiver of the message and is used to decrypt it.

In Celonis, a special keychain is available that helps you administering public and private keys. Keys are used, for example, by the Encryptor app for encrypting or decrypting PGP messages.

If a module in your Action Flow requires a public or private key, you can add it to the keychain in the module settings.

1. Go to **Keys**.
2. Select your package on the top right
3. Here you can delete all keys that you have created.

[## Data Structures](#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-DataStructures_body)

With different applications, there are of course different formats that data is transferred to Celonis.

A formalized way to describe in detail the **format of the data being transferred** is a **data structure**.

The editor is able to figure out which module returns or receives which kind of data. The data structure documents are most commonly used for serializing/parsing data formats such as JSON, XML, CSV and others.

Many modules automatically determine the correct data structure (e.g. see Webhooks) and manual intervention is required only in a few cases.

1. Go to **Data Structures**.
2. Select your package.
3. Here you can clone, edit, or delete your data structures.

[## Agents](#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-Agents_body)

Celonis on-prem clients (OPC) are installed in the customer’s server environment and provides a secure way for Celonis to selectively**access customer-authorized on-premises apps** without opening ports in the corporate firewall. It only requires one Celonis Agent to connect to an arbitrary number of on-prem systems located in the same network.

1. Go to "Agents",
2. Here you can perform the following actions for all Agents:

   - view the status
   - view permissions
   - add system connections
   - download logs
   - configure alerts
   - delete

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/marketo-engage--action-flow-

# Marketo Engage (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Marketo Engage modules enable you to search, retrieve, create or update leads and opportunities in your Marketo Engage account.

Expand all

[## Before you begin](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_getting-started-with-marketo_body)

To use this Action Flow module, you must have a Marketo Engage account — you can create one at [business.adobe.com/products/marketo](https://business.adobe.com/products/marketo).

[## Connecting Marketo Engage to Celonis platform](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C_body)

1. Log in to your Marketo Engage account.
2. From the dashboard, click **Admin**.
3. In the left sidebar, navigate to **Integration** > **LaunchPoint**.
4. Click **View Details**, or add a new service to display the **Client ID** and **Client Secret**. To add a new service, click **New** > **New Service**.
5. Copy the **Client ID** and **Client Secret** in a safe place.
6. Go to Celonis platform and open the Marketo Engage module's **Create a connection** dialog.
7. Fill in the dialog fields as follows:

   |  |  |
   | --- | --- |
   | **Connection name** | Enter the name for the connection. |
   | **Munchkin Account ID** | Enter the Munchkin Account ID. It can be found under **Admin** > **Integration** > **Munchkin**. |
   | **Client ID** | Enter the Client ID you have obtained in step 4 above. |
   | **Client Secret** | Enter the Client Secret you have obtained in step 4 above. |
8. Click the **Continue** button to establish the connection.

The connection is established. You can proceed with setting up the module.

[## Marketo Engage module types](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_section-id235536966106746_body)

[### Lead](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_UUID-12a9a7b3-c1d6-bca2-142f-4803240b48f2_body)

[#### Search Leads](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_search-leads_body)

Retrieves leads by filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **File Type** | Select or enter (map) the lead field to filter results by. |
| **Filter Values** | Add values to filter on in the specified fields. |
| **Include Response Fields** | Select which lead fields you want to return for each record. |
| **Limit** | Set the maximum number of leads Celonis platform will return during one execution cycle. |

[#### Get a Lead](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_get-a-lead_body)

Retrieves lead details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Lead ID** | Enter (map) the lead you want to retrieve details for. |
| **Include Response Fields** | Select which lead fields you want to return for each record. |

[#### Create a Lead](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_create-a-lead_body)

Creates a new lead.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Fields** | The fields are dynamically loaded based on your lead settings.  Some fields are not allowed when the *External Company Id* field has been filled. The *External Company Id* field may be used to link the lead record to a company record. |

[#### Update a Lead](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_update-a-lead_body)

Updates an existing lead.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Lead ID** | Enter (map) the ID of the lead you want to update. |
| **Fields** | The fields are dynamically loaded based on your lead settings.  Some fields are not allowed when the *External Company Id* field has been filled. The *External Company Id* field may be used to link the lead record to a company record. |

[#### Add Leads to a List](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_add-leads-to-a-list_body)

Adds leads to the lead list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Lead ID** | Enter (map) the ID of the lead you want to update. |
| **Destination List** | Select the list or enter (map) the ID of the list you want to add the lead to. |

[### Opportunity](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_UUID-21ea0754-9903-273f-902c-2bc3580bcec0_body)

[#### Search Opportunities](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_search-opportunities_body)

Searches for opportunities by filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **File Type** | Select or enter (map) the opportunity field to filter results by. |
| **Filter Values** | Add values to filter on in the specified fields. |
| **Include Response Fields** | Select which opportunity fields you want to return for each record. |
| **Limit** | Set the maximum number of opportunities Celonis platform will return during one execution cycle. |

[#### Get an Opportunity](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_get-an-opportunity_body)

Retrieves opportunity details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Get an Opportunity** | Select the type of opportunity you want to retrieve details for. |
| **ID Value** | Enter (map) the ID of the opportunity you want to retrieve details for. |
| **Include Response Fields** | Select which opportunity fields you want to return for each record. |

[#### Create an Opportunity](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_create-an-opportunity_body)

Creates a new opportunity.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Fields** | The fields are dynamically loaded based on your opportunity settings.  *Name* and *External Opportunity Id* fields are mandatory. |

[#### Update an Opportunity](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_update-an-opportunity_body)

Updates an existing opportunity.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Opportunity ID** | Enter (map) the ID of the opportunity you want to update. |
| **Fields** | The fields are dynamically loaded based on your lead settings. |

[#### Create an Opportunity Role](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_create-an-opportunity-role_body)

Creates a new opportunity role.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Fields** | The fields are dynamically loaded based on your opportunity settings.  *Lead ID* and *External Opportunity ID* fields are mandatory. Use the *Search* button to find the desired values. |

### Object

[#### Create/Update an Object](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_createupdate-an-object_body)

Creates or updates a custom object.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **Custom Object Name** | Enter (map) the ID of the object or select the object you want to create or update. |
| **Fields** | The fields are dynamically loaded based on your object settings. |

[### Other](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_UUID-7020c602-cd34-692f-f124-c20c72c020c0_body)

[#### Make an API Call](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_make-an-api-call_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Marketo Engage account](marketo-engage--action-flow-.html#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_h_01F26EE7G0T2WAJ1QKV0BSXK5C "Connecting Marketo Engage to Celonis platform"). |
| **URL** | Enter a path relative to `https://{Munchkin Account ID}.mktorest.com`. For example: `/userservice/management/v1/users/allusers.json/`.  **Note**  For the list of available endpoints, refer to the [Marketo Engage API Documentation](https://developers.marketo.com/rest-api/endpoint-reference/). |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry.  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we added those for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Example of Use - List Users](#UUID-dbd7afa1-97f7-bd37-48c8-3a441ba2528b_id_example-of-use---list-users_body)

The following API call returns all users in your Marketo Engage account:

**URL**: `/userservice/management/v1/users/allusers.json/`

**Method**: `GET`

The result can be found in the module's **Output** under *Bundle* > *Body*. In our example, 6 users were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-365-email--outlook---action-flow-

# Microsoft 365 Email (Outlook) (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Microsoft 365 Email (Outlook) modules in Celonis Platform, you can watch for, search for, retrieve, create and send, update, forward, reply, move and delete messages, create and send draft messages, and retrieve, add, and download attachments.

Expand all

[## Before you begin](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-id235536975826547_body)

To use the Microsoft 365 Email (Outlook) modules, you must have a Microsoft Office account. You can create an account at [office.com](https://www.office.com/).

Refer to the [Microsoft 365 Email API documentation](https://learn.microsoft.com/en-us/graph/api/resources/message?view=graph-rest-1.0) for a list of available endpoints.

[## Adding Microsoft 365 Email (Outlook) to your Action Flows](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-id235291903063901_body)

To add this module to your automation:

1. In Studio, go to your package and either start editing an existing Action Flow or start a new one by clicking  **New asset**> **Action Flow**.
2. Click **Add module**
3. From the list, select **Microsoft 365 Email (Outlook)** and choose the Outlook module that best suits your needs.
4. Establish a connection with Microsoft 365 Email (Outlook) and Action Flow:

   - From the Connection dropdown list, select an existing connection OR
   - Create a new connection.Click **Create a connection**.

     1. Optional: In the **Connection name** field, enter a name for the connection.
     2. Optional: Click **Show advanced settings** to enter your custom app client credentials and add additional scopes as needed.

        For more information about the permissions, see the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
     3. Click **Save**.
     4. If prompted, authenticate your account and confirm access.

     You have successfully established the connection. You can now edit your Action Flow and add more Microsoft 365 Email (Outlook) modules. If your connection requires reauthorization at any point, go to the [Automation screen](managing-action-flows.html#UUID-3d58beec-60ef-7474-6df3-bc0346021c98_id_AutomationGlobalPages-UserConnections "User Connections").

[## Types of Microsoft 365 Email (Outlook) modules](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-id235292002078525_body)

Here are all the action you can perform with this app in Action Flows:

[### Adding Microsoft 365 Email (Outlook) to your Action Flows](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-id235281791778085_body)

- Create a Draft Message

  **Required Permissions**: Mail.ReadWrite, offline\_access, User.Read
- Send a Draft Message

  **Required Permissions**: Mail.ReadWrite, Mail.Send, offline\_access, User.Read
- Update a Message

  **Required Permissions**: Mail.ReadWrite, offline\_access, User.Read

[### Attachment](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-idm2393528179768296_body)

- List Attachments

  **Required Permissions**: Mail.Read, offline\_access, User.Read
- Add an Attachment

  **Required Permissions:** Mail.ReadWrite, offline\_access, User.Read
- Download an Attachment

  Message

  - Watch Messages

    **Required Permissions**: Mail.Read, offline\_access, User.Read
  - Search Messages

    **Required Permissions**: Mail.Read, offline\_access, User.Read

    **Keyword Query Language**

    Use Keyword Query Language (KQL) search syntax to build your search queries in Microsoft modules. For more information, see [Microsoft Graph help](https://learn.microsoft.com/en-us/graph/api/resources/search-api-overview?view=graph-rest-1.0#keyword-query-language-kql-support).
  - Get a Message

    **Required Permissions**: Mail.Read, offline\_access, User.Read
  - Create and Send a Message

    **Required Permissions**: Mail.Send, offline\_access, User.Read
  - Forward a Message

    **Required Permissions**: Mail.Send, offline\_access, User.Read
  - Reply to a Message

    **Required Permissions**: Mail.Send, Mail.ReadWrite, offline\_access, User.Read
  - Move a Message

    **Required Permissions**: Mail.ReadWrite, offline\_access, User.Read
  - Delete a Message

    **Required Permissions**: Mail.ReadWrite, offline\_access, User.Read

  **Required Permissions**: Mail.Read, offline\_access, User.Read

[### Other](#UUID-c7932c2e-da9c-e611-c656-383c977d34f7_section-idm2393528179791990_body)

- Make an API Call

  **Required Permissions**: offline\_access, User.Read

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-365-excel--action-flow-

# Microsoft 365 Excel (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Microsoft 365 Excel modules enable you to monitor workbooks and rows or retrieve, add, update, or delete worksheets, rows, and tables in your Microsoft 365 Excel account.

Expand all

[## Before you begin](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_section-id235536977410452_body)

To get started with Microsoft 365 Excel app, create an account at [office.com](https://www.office.com/).

Refer to the [Microsoft Graph REST API documentation](https://docs.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0) for the list of available endpoints.

[## Connect Microsoft 365 Excel to Celonis platform](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_UUID-6a8791a5-1400-6426-34c9-8bdea8a71812_body)

To connect to the Excel app:

1. Log in to your Celonis platform account, add any Microsoft 365 Excel module Action Flow, and click the **Add** button next to the **Connection** field.
2. Optional: In the **Connection name** field, enter a name in the connection.
3. Optional: Click **Show advanced settings** to enter your custom app client credentials and add additional scopes as needed.

   For more information about the permissions, see the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
4. Click **Save**.
5. If prompted, log in to your Microsoft account and confirm the access.

You have successfully connected the app and can now build Action Flows.

[## Building Microsoft 365 Excel Action Flows](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_section-idm4477921555907233686434393287_body)

After connecting the app, you can perform the following actions:

**Workbook**

**Keyword Query Language**

Use Keyword Query Language (KQL) search syntax to build your search queries in Microsoft modules. For more information, see [Microsoft Graph help](https://learn.microsoft.com/en-us/graph/api/resources/search-api-overview?view=graph-rest-1.0#keyword-query-language-kql-support).

- Watch Workbooks

  **Required Permissions**: offline\_access, User.Read, Files.Read.All
- Search Workbooks

  **Required Permissions**: offline\_access, User.Read, Files.Read.All
- Download a Workbook

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All

**Worksheet**

- Watch Worksheet Rows

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- List Worksheets

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- List Worksheet Rows

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Add a Worksheet

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Add a Worksheet Row

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Update a Worksheet Row

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Delete a Worksheet Row

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All

**Table**

- Watch Table Rows

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- List Tables

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- List Table Rows

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Get a Table

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Add a Table

  To use tables, see [Add a Table](microsoft-365-excel--action-flow-.html#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_section-idm4649168696265633118016811641 "Add a Table")
- Add a Table Row

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Add a Table Column

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Update a Table

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Update a Table Column

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Delete a Table

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All

**Other**

**Note**

When using these modules in the Microsoft 365 Excel integration, there is a maximum limit of 3300 records per request. This limit is set to prevent service interruptions and ensure optimal performance during data retrieval operations.

- Retrieve Data

  **Required Permissions**: offline\_access, User.Read, Files.ReadWrite, Files.Read.All
- Make an API Call

  **Required Permissions**: offline\_access, User.Read

[## Table](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_UUID-23844569-1cec-e7b6-11a4-b56b24d19649_body)

The *table* here refers to the embedded *table* element in the Workbook. Not the entire table (workbook/worksheet).

[### Add a Table](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_section-idm4649168696265633118016811641_body)

Adds a new table.

**Required Permissions**: Files.ReadWrite, Files.Read.All

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft 365 account](microsoft-365-excel--action-flow-.html#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_UUID-6a8791a5-1400-6426-34c9-8bdea8a71812 "Connect Microsoft 365 Excel to Celonis platform"). |
| **Update a Table** | Select the option to choose the |
| **Workbook ID** | Enter the Workbook ID to whose worksheet you want to add a table. |
| **Workbook** | Select or map the workbook you want to use. |
| **Worksheet** | Select the Excel sheet you want to add a table to. |
| **Has Headers** | If you select this checkbox, the first defined row will be used as the table headers. |
| **Address** | Set the size of the table. For example, **`A1:C10`** will create a table with 3 columns and 10 rows. |

[## Permission information for Microsoft 365 Excel](#UUID-3f82fb31-bd3a-00cc-221b-da49860f1186_section-idm4605719298313634335833161601_body)

- **Add a Table** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Add a Table Row** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Add a Worksheet** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Add a Worksheet Row** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Add/Update a Worksheet Row (Advanced)**- Files.ReadWrite, offline\_access, User.Read
- **Delete a Table** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Delete a Worksheet Row** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Download a Workbook** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Get a Table** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **List Table Rows** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **List Tables** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **List Worksheet Rows** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **List Worksheets** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Retrieve Data** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Search Workbooks** - Files.Read.All, offline\_access, User.Read
- **Update a Table** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Update a Worksheet Row**- Files.ReadWrite, Files.Read.All, offline\_access, User.Read
- **Watch Workbooks** - Files.Read.All, offline\_access, User.Read
- **Watch Worksheet Rows** - Files.ReadWrite, Files.Read.All, offline\_access, User.Read

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-dynamics-365--action-flow-

# Microsoft Dynamics 365 (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Microsoft Dynamics 365 modules enable you to monitor events and create, update, search, retrieve, or delete vendor invoices and vendor invoice items in your Microsoft Dynamics 365 account.

Expand all

[## Before you begin](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-c0c1a453-b842-be84-8067-f9c52bebb6bd_body)

To start working with the Microsoft Dynamics 365 module, make sure you have the following:

- A Microsoft account — you can create one at  [account.microsoft.com/account](https://account.microsoft.com/account?lang=en-us)
- Azure Active Directory account — you can create one at  [azure.microsoft.com/en-us/free](https://azure.microsoft.com/en-us/free/)
- Azure Active Directory Tenant – see  [How to get an Azure Active Directory Tenant](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-create-new-tenant)
- A Microsoft Dynamics 365 F&O apps subscription – see  [MS Dynamics 365 pricing](https://dynamics.microsoft.com/en-us/pricing/)
- A Microsoft Dynamics 365 CRM apps subscription. See [Microsoft Dynamics 365 pricing](https://dynamics.microsoft.com/en-us/pricing/).

[## Connect Microsoft Dynamics 365 to Celonis platform](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2_body)

To connect your Microsoft Dynamics 365 app, you must obtain the client credentials and Tenant ID from the  [MS Azure Portal](https://portal.azure.com/) and insert them into **Create a connection** dialog with your **Host URL**.

1. Log in to  [MS Azure Portal](https://portal.azure.com/).
2. Navigate to the **Azure Active Directory** service ( ).
3. Copy the Tenant ID to a safe place.
4. Click **Applications > New Registration** and enter the following details and click **Register**.

   |  |  |
   | --- | --- |
   | **Name** | Enter a name for the app. |
   | **Supported account types** | Select the account type based on your preferences. If you are selecting the multitenant option,**Accounts in any organizational directory (<your service> - Single tenant)** , then the user establishing the connection will have to:  - use the Tenant ID during the connection creation - be in the same Tenant ID |
   | **Redirect URI (Optional)** | Select the following options:  - **Platform:** Web - **Redirect URI:** `https://www.integromat.com/oauth/cb/microsoft-dynamics-365-crm` |
5. The Client ID and Tenant ID details appear on the app screen. To add a client secret, click **Add a certificate or secret**.

   **Note**

   The Tenant ID is mandatory for single-tenant apps and optional for multi-tenant apps.
6. Click **New client secret**, enter a description, select the expiry period for the client secret, and click **Add**.
7. Copy the value to use as a Client Secret to a safe place.
8. Click **API Permissions** > **Dynamics CRM** , select permission, click **Add Permission** and click **Grant Admin consent for**.

   You now have all the permission to connect to the app.
9. Log in to your Celonis platform account, add a Microsoft Dynamics 365 module Action Flow, and click the **Add** button next to the **Connection** field.
10. Enter the following details and click **Save**.

    |  |  |
    | --- | --- |
    | **Connection name** | Optional: Enter the name of your connection. |
    | **Host** | Enter the Host URL **without trailing slash** " **/** " and including HTTPS, `https://<example>.cloudax.dynamics.com`. |
    | **Tenant ID** | Optional: Click **Show Advanced Settings** and enter the Tenant ID you have copied in step 3.    **Note**  The Tenant ID is mandatory for single-tenant and optional for multi-tenant apps. |
    | **Client ID** | Enter the Client ID copied in step 5. |
    | **Client Secret** | Enter the secret value copied in step 7. |
11. Confirm the dialog by clicking the **Accept** button.

You have successfully established the connection. You can now edit Action Flow, add more Microsoft Dynamics 365 modules, and reauthorize your connection if required.

**Note**

If the ***Status Code Error: 401*** error displays, the Host URL could be inserted with the trailing slash (remove the slash at the end of the URL), or there can be another mistake in the  *Create a connection dialog field*.

[## Types of Microsoft Dynamics 365 modules](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_section-id235536984642973_body)

[### Vendor Invoices](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-2f150dc4-4a20-7c1e-d8f8-080acce5c8b0_body)

Using the following modules, you can search, create, update, list, retrieve, and delete vendor invoices and invoice items.

[#### Search Vendor Invoices](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_search-vendor-invoices_body)

Retrieves vendor invoices by filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Type of Filter** | Select whether to use an in-built simple filter or a custom filter based on the Open Data query. |
| **Simple Filter** | Select the name of the field (property) and the value you want to filter returned results by. You can build the filter query using the AND/OR operators. |
| **Custom Filter** | Enter the OData query. For more details, please see the [OData documentation](https://www.odata.org/documentation/). |
| **Order By** | Set the sort order of the result by selecting the property and direction you want to sort the results by. |
| **Limit** | Set the maximum number of vendor invoices Celonis platform will return during one execution cycle. |

**Keyword Query Language**

Use Keyword Query Language (KQL) search syntax to build your search queries in Microsoft modules. For more information, see [Microsoft Graph help](https://learn.microsoft.com/en-us/graph/api/resources/search-api-overview?view=graph-rest-1.0#keyword-query-language-kql-support).

[#### Create a Vendor Invoice](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_create-a-vendor-invoice_body)

Creates a new vendor invoice.

It is necessary to create a vendor invoice in order to create a vendor invoice item.

Required fields:

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Select the company or enter the ID of the company that created the invoice. |
| **Currency** | Enter the currency code. Use the  *Search* button to determine the exact currency code. |
| **Invoice Account** | Select the invoice account that is associated with the vendor for the purchase order, if the invoice is associated with a purchase order. If the invoice is not associated with a purchase order, enter the vendor account for the invoice. |
| **Invoice Number** | Enter the desired invoice number. |

[#### Get a Vendor Invoice](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_get-a-vendor-invoice_body)

Retrieves post details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Enter (map) the ID of the company that created the invoice you want to retrieve details for. |
| **Invoice Header Reference** | Enter the header reference of the invoice you want to retrieve details for. |

[#### Update a Vendor Invoice](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_update-a-vendor-invoice_body)

Updates an existing vendor invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Enter (map) the ID of the company that created the invoice you want to update. |
| **Invoice Header Reference** | Enter the header reference of the invoice you want to update. |

Please find the descriptions of the fields in the [Create a vendor invoice](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_create-a-vendor-invoice "Create a Vendor Invoice") module description.

[#### Delete a Vendor Invoice](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_delete-a-vendor-invoice_body)

Deletes an existing vendor invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Enter (map) the ID of the company that created the invoice you want to delete. |
| **Invoice Header Reference** | Enter the header reference of the invoice you want to delete. |

[#### List Vendor Invoice Items](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_list-a-vendor-invoice-items_body)

Retrieves items for a specified vendor invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Invoice Header Reference** | Enter the header reference of the invoice you want to list items for. |
| **Limit** | Set the maximum limit of vendor invoice items Celonis platform will return during one execution cycle. |

[#### Create a Vendor Invoice Item](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_create-a-vendor-invoice-item_body)

Creates a vendor invoice item and attaches it to the specified vendor invoice.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Invoice Header Reference** | Enter the header reference of the vendor invoice that you want to attach the vendor invoice item to. |
| **Item Number** | Enter the item number. Ideally, the item number should be identical to the product number. |
| **Procurement Category** | Enter the name of the procurement category. |

[#### Update a Vendor Invoice Item](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_update-a-vendor-invoice-item_body)

Updates a vendor invoice item.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Enter (map) the ID of the company that created the invoice you want to update. |
| **Invoice Header Reference** | Enter the header reference of the vendor invoice that contains the vendor invoice item you want to update. |
| **Invoice Item Line Number** | Enter (map) the number of the invoice item line which you want to update. |

[#### Delete a Vendor Invoice Item](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_delete-a-vendor-invoice-item_body)

Deletes a vendor invoice item.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Dynamics 365 account](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-cc852127-d36a-5bb9-d754-e26b4c50d7c2 "Connect Microsoft Dynamics 365 to Celonis platform"). |
| **Data Area ID** | Enter (map) the ID of the company that created the invoice containing the item you want to delete. |
| **Invoice Header Reference** | Enter the header reference of the invoice item you want to delete. |
| **Invoice Item Line Number** | Enter (map) the number of the invoice item line which you want to delete. |

[### Generic Modules](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-d3daa4a0-7ac3-bd23-35f9-172ef6626845_body)

#### Watch Events

Triggers when a predefined business event occurs.

The webhook URL needs to be generated in Celonis platform and then added to MS D365's integration settings. To set up receiving webhook from MS Dynamics 365, you need to follow these five main steps:

1. [Generate the webhook URL in Celonis platform](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-390428ab-d4e5-bad7-629e-05f1b0b5f8ce "Generating a Webhook URL").
2. [Create Azure key vault](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-e066b0dc-65ce-3af0-db5c-3a776e8e1841 "Creating a Key Vault").
3. [Create Key vault secret and insert the webhook URL](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-a42e721e-4d74-b5ad-f5d7-13eeed29f17b "Generating Secret and Inserting the Webhook URL").
4. [Create an HTTPS endpoint](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_id_creating-an-https-endpoint "Creating an HTTPS Endpoint").
5. [Activate the business event](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-6f4883a7-3b69-e26f-f5dc-b51b1c5305b2 "Activating Business Events").

[### Generating a Webhook URL](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-390428ab-d4e5-bad7-629e-05f1b0b5f8ce_body)

1. Add the  *Watch Events* module to your Celonis platform scenario.

2. Generate and copy the webhook URL.

[### Creating a Key Vault](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-e066b0dc-65ce-3af0-db5c-3a776e8e1841_body)

1. Log in to  [MS Azure Portal](https://portal.azure.com/).

2. Navigate to *Key vaults* and click the *Create key vault* button.

3. On the  *Basics* tab, select the ***BusinessEvents*** in the  *Resource group* field, fill all required fields and click *the Next: Access policy* button ().

On the *Access policy* tab click the  *+Add Access Policy* link.

In the  *Add access policy*  dialog, set the access policy as follows and the configuration by clicking  *Add*  button:

|  |  |
| --- | --- |
| **Configure from the template (optional)** | Select the  *Key, Secret & Certificate Management* option. |
| **Key permissions** | Select all permissions and uncheck the *Decrypt* option. |
| **Secret permissions** | Select all permissions. |
| **Certificate permissions** | Select all permissions. |
| **Select principal** | Select the application you have created before. |

- Proceed to the  *Review + create* tab and click *Create*.

[### Generating Secret and Inserting the Webhook URL](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-a42e721e-4d74-b5ad-f5d7-13eeed29f17b_body)

1. Once the Key Vault is created, navigate to  *Key Vault resource*  > *Secrets,* click  *+Generate/Import*.

2. Fill the following fields:

|  |  |
| --- | --- |
| **Upload option** | *Manual.* |
| **Name** | Enter the desired name for the webhook. |
| **Value** | Enter the **webhook URL**  you have generated in the [Generating a Webhook URL](microsoft-dynamics-365--action-flow-.html#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-390428ab-d4e5-bad7-629e-05f1b0b5f8ce "Generating a Webhook URL") section. |

#### Creating an HTTPS Endpoint

1. Log in to your Dynamics 365 Finance and Operation environment.

2. Navigate to *System administration*  >  *Business events*  >  *Business events catalog*.

3. Open the *Endpoints* tab and click *+New*.

Select the ***HTTPS***  endpoint type and click *Next*.

Configure the new endpoint as follows:

|  |  |
| --- | --- |
| **Endpoint name** | Enter the name of the endpoint. |
| **Endpoint type** | *HTTPS* |
| **Azure Active Directory application ID** | Enter the application ID that is created in the Azure Active Directory in the Azure portal. |
| **Azure application secret** | Enter the secret value for the application. Create a new client secret under  *Certificates & secrets.* |
| **Key vault DNS name** | Enter the name from your Key Vault setup. You can find it in the *Overview* of the Key Vault you have created under the *Vault URI*  field. |
| **Key vault secret name** | Enter the secret name for the endpoint resource you have created in Key Vault. |

[### Activating Business Events](#UUID-6f4bd921-2892-5b8f-5f4c-a9bcb3fb81ad_UUID-6f4883a7-3b69-e26f-f5dc-b51b1c5305b2_body)

*Business events* in the *business event catalog* are not active by default. From the catalog, you can activate any business event that you want to trigger your Celonis platform *Watch Events* module.

1. Select the business event on the *Business event catalog* tab.

2. Click  *+Activate*.

3. In the *Configure new business event* dialog, select the legal entity and the endpoint you have created and click  *OK* to save the configuration.

4. Make sure that you see the event on the *Active events* tab.

Now, every time the vendor invoice is posted, the Watch Events module in your Celonis platform scenario is triggered.

#### Make an API Call

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Discourse account. |
| **URL** | Enter a path relative to your host URL.  For example: *`/data/Customers`* .  For the list of available endpoints, refer to the list of entities at *`https://<<My Instance URL>>/Metadata/DataEntities`* . |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry**.**  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we added those for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

#### Example of Use - List Customers

The following API call returns all customers in your MS Dynamics 365 account:

**URL** :

*`/data/Customers`*

**Method**:

`GET`

The result can be found in the module's **Output** under  *Bundle*  >  *Body > value.*

In our example, 9 customers were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-power-automate--action-flow-

# Microsoft Power Automate (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Desktop flows extend the existing robotic process automation (RPA) capabilities in Power Automate and enable you to automate all repetitive desktop processes.

It’s quicker and easier than ever to automate with the new, intuitive Power Automate desktop flow designer using the prebuilt drag-and-drop actions or recording your own desktop flows to run later.

In Power Automate, you can create flows, interact with everyday tools such as email and Excel or work with modern and legacy applications. Some of the simple and complex tasks you can automate are:

- organize the documents using dedicated files and folders actions in less time
- extract data from websites accurately and store them in excel files using Web and Excel automation
- Apply desktop automation capabilities to put your work on autopilot

To get started with Microsoft Power Automate, you need:

- Microsoft [Power Automate](https://flow.mircosoft.com) account
- An [Azure account](https://azure.microsoft.com/en-us/) to create custom apps

## Connect Microsoft Power Automate to Celonis platform

You can connect to Microsoft Power Automate in two ways:

- [Connect using basic authentication](microsoft-power-automate--action-flow-.html#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-a0eb5fa8-b115-2901-58cd-7cd75bb878c0 "Connect using OAuth 2.0")
- [Connect using OAuth credentials](microsoft-power-automate--action-flow-.html#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-992d9d66-a88c-3158-b1f9-875fde1c5e66)

Expand all

[### Connect using OAuth 2.0](#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-a0eb5fa8-b115-2901-58cd-7cd75bb878c0_body)

To connect to Microsoft Power Automate:

1. Log in to your Celonis platform , and open the Microsoft Power Automate module Action Flow .
2. In the **Connection name** field, enter a name for the connection.
3. In the **Connection name** field, enter a name for the connection.
4. Optional: In the **MS PAD Environment ID** field, enter your environment ID from your Power Automate account to which you want to connect.

   Leave this field empty to choose your default environment. If you have multiple environments, go to the [Power Automate admin portal](https://admin.powerplatform.microsoft.com/environments) to copy the desired environment ID.
5. Click **Continue**.
6. In the pop-up window, enter your account details to sign in and authorize access by clicking **Accept**.

You have successfully connected the Microsoft Power Automate app and can now build Action Flows .

[### Connect using OAuth 2.0 and your own credentials](#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-40a8d7f7-062e-6070-272f-d04c5f35b73c_body)

To connect to Power Automate with your own credentials, you need to create a custom app in your Azure account and obtain the client credentials of the app.

1. Log in to [azure.portal.com](https://portal.azure.com/).
2. Click **App Registrations**.
3. Click **New Registration**.
4. Enter the details as provided in the table below and click **Register**.

   |  |  |
   | --- | --- |
   | **Name** | Enter the app's name that you want to connect. |
   | **Supported account types** | Select the option, **Accounts in any organizational directory (Any Azure AD Directory - Multitenant)**. |
   | **Redirect URI (Optional)** | Select the following options:  - **Platform:** Web - **Redirect URI:**  `https://auth.redirect.celonis.cloud/oauth/cb/microsoft-power-automate``https://auth.redirect.celonis.cloud/oauth/cb/microsoft-smtp-imap”` |
5. You can find the Client ID and Tenant ID details on the app screen. To add a client secret, click **Add a certificate or secret**.
6. Click **New client secret**. Enter a description and select the expiry period for the client secret. Click **Add**.
7. Copy the Client Secret to a safe place.
8. In the **Manifest** section, change the `allowPublicClient` value to `true`, and click **Save**.
9. Log in to your Celonis platform account and open the Microsoft Power Automate Action Flow , select the **Advanced Settings** checkbox.
10. In the **Connection name** field, enter a name for the connection.
11. Leave this field empty to choose your default environment. If you have multiple environments, go to the [Power Automate admin portal](https://admin.powerplatform.microsoft.com/environments) to copy the desired environment ID.

    Optional: In the **MS PAD Environment ID** field, enter your environment ID from your Power Automate account to which you want to connect.
12. In the **Client ID**, **Client Secret**, and **Tenant ID** fields, enter the values copied in step 5 and step 7 respectively.
13. Click **Continue**.
14. In the pop-up window, enter your account details to sign in and authorize access by clicking **Accept**.

You have all the details to connect your custom app with Celonis platform , and can now build Action Flows .

[## Types of Microsoft Power Automate modules](#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-025bfcba-af0b-8696-d6e6-42a5aef442dc_body)

You can run desktop flows using the following module.

### Run Desktop Flow

Set up a desktop flow connection if you use the on-premises data gateway to trigger desktop flows.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Microsoft Power Automate account](microsoft-power-automate--action-flow-.html#UUID-7f8deb25-c5f3-ceb6-48c5-457eb66c1e96_UUID-992d9d66-a88c-3158-b1f9-875fde1c5e66). |
| **Select MS PAD Flow Connection** | Enter the connection flow ID of the desktop flow you want to run.  To create a flow connection, see [connections](https://flow.microsoft.com/manage/environments/Default-3bbcf5b0-b08a-4708-bd6f-6172f5110dc3/connections).  You can get the Connection ID in your Power Automate account at **Data > Connections > Select the connection > URL**. In the URL address, find a part which says, `ConnectionName` and copy the ID that follows it |
| **Select MS PAD Desktop Flow** | Select or map the flow you want to run. Only the Desktop Flows created in your Microsoft Power Automate account are displayed here.  The map function allows a user to map a value from one of the previous modules instead of selecting a Bot from the dropdown list.  To create a desktop flow, see [UI flows](https://flow.microsoft.com/manage/environments/Default-3bbcf5b0-b08a-4708-bd6f-6172f5110dc3/uiflows). |
| **Flow Input fields** | Add the input variables for the flow. These variables are passed to and from desktop flows, allowing you to create sophisticated flows.  To create variables, see [input variables](https://docs.microsoft.com/en-us/power-automate/desktop-flows/manage-variables#input-and-output-variables). |
| **Select Run Mode** | Select the run mode for the desktop flow depending on your settings.  - **Attended:** Requires an active Windows user session that matches the name of the user configured for your connection. The session must not be locked. When an attended desktop flow starts on the target machine, it is recommended to avoid interacting with your device until the run completes. - **Unattended:** The target machine needs to be available with all users signed out. You cannot launch flows with elevated privileges.  To learn more about run modes, see [desktop flow modes](https://docs.microsoft.com/en-us/power-automate/desktop-flows/run-pad-flow#run-desktop-flows-unattended-or-attended). |

For more information on desktop flows, see [Microsoft Power Automate documentation](https://docs.microsoft.com/en-us/power-automate/desktop-flows/actions-reference/runflow).

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-power-bi--action-flow-

# Microsoft Power BI (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Microsoft Power BI modules in Celonis platform, you can manage the apps, dashboards, and reports in your Microsoft Power BI account.

Expand all

[## Before you begin](#UUID-64a30874-4e6a-a109-d741-ae7cdab3765d_section-id23553714818471_body)

To use the Microsoft Power BI modules, you must have a Microsoft Power BI account. You can create an account at [signup.microsoft.com/create-account/signup](https://signup.microsoft.com/create-account/signup?sku=a403ebcc-fae0-4ca2-8c8c-7a907fd6c235&email=&ru=https:%2F%2Fapp.powerbi.com%3Fpbi_source%3Dweb%26cmpid%3Dpbi-gett-hero-try-powerbifree%26redirectedFromSignup%3D1%26noSignUpCheck%3D1&products=a403ebcc-fae0-4ca2-8c8c-7a907fd6c235&ali=1).

Refer to the [Microsoft Power BI API documentation](https://learn.microsoft.com/en-us/rest/api/power-bi/) for a list of available endpoints.

[## Connect Microsoft Power BI to Celonis platform](#UUID-64a30874-4e6a-a109-d741-ae7cdab3765d_section-idm4527952661331234083672030685_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Microsoft Power BI module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show advanced settings** and enter your custom app client credentials. For more information, refer to the [Microsoft Power BI custom credentials documentation](https://learn.microsoft.com/en-us/power-bi/developer/embedded/configure-credentials?tabs=sdk3).

   If requested, use the following Redirect URI when creating your custom app:

   `https://auth.redirect.celonis.cloud/oauth/cb/microsoft-power-bi`
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Microsoft Power BI modules.

[### Permissions Information for Microsoft Power BI](#UUID-64a30874-4e6a-a109-d741-ae7cdab3765d_UUID-683a89d3-9c1f-ea83-839f-a539c4282343_body)

- **Add/Delete Rows in a Dataset Table:** Dataset.ReadWrite.All, Workspace.Read.All
- **Create a Connection:** Offline\_access, User.Read, Openid
- **Copy a Report:** Report.Read.All, Workspace.Read.All, Content.Create
- **Create a Dashboard:** Dashboard.Read.All, Content.Create, Workspace.Read.All
- **Create a Dataset:** Dataset.ReadWrite.All, Workspace.Read.All
- **Delete a Dataset:** Dataset.ReadWrite.All, Workspace.Read.All
- **Delete a Report:** Report.ReadWrite.All, Workspace.Read.All
- **Get a Dashboard:** Dataset.Read.All, Workspace.Read.All
- **Get a Dashboard Tile:** Dashboard.Read.All, Workspace.Read.All
- **Get a Dataset:** Dataset.Read.All, Workspace.Read.All
- **Get an App:** App.Read.All
- **Get an App’s Dashboard:** Dashboard.Read.All, App.Read.All
- **Get an App’s Report:** Report.Read.All, App.Read.All
- **Get a Report:** Report.Read.All, App.Read.All
- **List Apps:** App.Read.All
- **List App’s Dashboards:** Dashboard.Read.All, App.Read.All
- **List App’s Reports:** Report.Read.All, App.Read.All
- **List Dashboards:** Dashboard.Read.All, Workspace.Read.All
- **List Dashboard Tiles:** Dashboard.Read.All, Workspace.Read.All
- **List Datasets:** Dataset.Read.All, Workspace.Read.All
- **List Dataset Users:** Dataset.Read.All, Workspace.Read.All, Tenant.Read.All
- **List Reports:** Report.Read.All, Workspace.Read.All
- **Make an API Call:** Dataset.ReadWrite.All, Workspace.ReadWrite.All, Dashboard.ReadWrite.All, Report.ReadWrite.All, Capacity.ReadWrite.All, Dataflow.ReadWrite.All, App.Read.All
- **Refresh a Dataset:** Dataset.ReadWrite.All, Workspace.Read.All
- **Watch Apps:** App.Read.All

[## Types of Microsoft Power BI Action Flows](#UUID-64a30874-4e6a-a109-d741-ae7cdab3765d_section-idm4527952740350434083684657895_body)

After connecting the app, you can perform the following actions:

Dashboard

- List Dashboards
- List Dashboard Tiles
- Get a Dashboard
- Get a Dashboard Tile
- Create a Dashboard

Report

- List Reports
- Get a Report
- Copy a Report
- Delete a Report

Dataset

- List Datasets
- List Dataset Users
- Get a Dataset
- Create a Dataset
- Add/Delete Rows in a Dataset Table
- Refresh a Dataset
- Delete a Dataset

App

- Watch Apps
- List Apps
- List App's Reports
- List App's Dashboards
- Get an App
- Get an App Report
- Get an App's Dashboard

Other

- Make an API Call

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/microsoft-teams--action-flow-

# Microsoft Teams (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Microsoft Teams modules in Celonis platform, you can monitor, list, create, update, delete, and retrieve teams and channels in your Microsoft Teams account.

Expand all

[## Before you begin](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-id235537186798628_body)

To use the Microsoft Teams modules, you must have a Microsoft business account. You also should be an admin of the account and **Microsoft Office 365 Premium** must be activated for your admin business account. You can create an account at <https://www.microsoft.com/en-us/microsoft-365/business>.

Refer to the [Microsoft Teams API documentation](https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview) for a list of available endpoints.

[## Connecting Microsoft Teams to Celonis platform](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4543376557118434011183696727_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Microsoft Teams module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show advanced settings** to enter your custom app client credentials, tenant ID, and add additional scopes as needed. Refer to the [Microsoft Teams documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/add-authentication?tabs=dotnet%2Cdotnet-sample) regarding client credentials.

   If requested, use the following Redirect URI when creating your custom app:

   `https://auth.redirect.celonis.cloud/oauth/cb/azure`

   For more information about the permissions, see the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Microsoft Teams modules.

[## Types of Microsoft Teams modules](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-id235537189209401_body)

[### Team](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-afab19f3-7590-7b4e-368f-f5c3da0fb8f7_body)

You can watch, list, retrieve, create, update teams and create and update teams for groups with the following modules.

[#### Watch Teams](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_h_4e08aa7b-78ce-4fb9-9943-b7dbd0b89d12_body)

Retrieves a team's details when a new team/group is created or an existing team is edited.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Filter** | Define the filter settings for the returned groups. You can retrieve only groups whose name or email starts with the specified term. |
| **Limit** | Set the maximum number of results Celonis platform will return during one execution cycle. |

[#### List Joined Teams](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4550279552668833466485214742_body)

Retrieves all the teams in Microsoft Teams that you are a member of.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Limit** | Set the maximum number of teams Celonis platform will return during one execution cycle. |

[#### List All Teams & Groups](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_h_c1ea35dc-13f3-416d-9d08-a738db95c6e9_body)

Returns all teams (including Office 365 Groups) in your account.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Filter** | Define the filter settings for the returned groups. You can retrieve only groups whose name or email starts with the specified term |
| **Order By** | Select whether to order results by displaying names in ascending or descending order. |
| **Limit** | Set the maximum number of teams Celonis platform will return during one execution cycle. |

[#### Get Team](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_get-team_body)

Returns a team's/group's details.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Group ID** | Enter (map) or select the ID of the team/group you want to retrieve details about. |

[#### Create Office 365 Group](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_h_54c5639b-083b-49b2-8052-e3bfa9973acb_body)

Creates a new *Office 365 group (unified group)* or *Security* group.

You can't currently create a team via this module.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Display Name** | Enter the name that is displayed in the address book for the group. |
| **Alias for Group** | Enter the mail alias (nickname) for the group.  Alias can only contain lowercase letters, numbers, and underscores. For Security Group type, simply provide an alias as a nickname. |
| **Group Type** | Enable the Unified option (or enter "Unified") to create an *Office 365* group. Otherwise, the *Security* group (used for granting access to SharePoint resources) is created. |
| **Description** | Enter the description of the group. |
| **Security Enabled** | Enable this option if a group is a security group and you have **not** enabled the "Unified" option in the Group Type field. |
| **Owners** | Select the owners of the group. The owners are a set of non-admin users who can modify this object. |
| **Members** | Select users and groups that are members of this group. |

[#### Update Team](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_update-team_body)

Updates a group's/team's properties.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Group ID** | Enter the ID or select the group/team you want to update. |
| **Visibility** | Set the Office 365 group to public or private. |

Please find the descriptions of the fields in the *Create Office 365 group* section above.

[#### Create Team](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_create-team_body)

Creates a new team from a group.

If the group was created less than 15 minutes ago, it's possible for the *Create Team* module to fail with a 404 error code due to replication delays. The recommended pattern is to re-run the *Create Team* module three times, with a 10 seconds delay between calls.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Group ID** | Enter the ID or select the group from which you want to create a team. |
| **Admin and Settings** | Set the team's Member Settings, Messaging Settings, Fun Settings, and Guest Settings. |

[#### Delete Team or Group](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_delete-team-or-group_body)

Deletes a team/group.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Group ID** | Enter the ID or select the group you want to delete. |

[### Channel](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-acaad914-b472-3c68-f183-f81eeddcd36b_body)

You can list, retrieve, create, update, and delete channels with the following modules.

[#### List Channels](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_list-channels_body)

Lists all channels in the Microsoft Team.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Enter the ID or select the team you want to list channels from. |
| **Limit** | Set the maximum number of channels Celonis platform will return during one execution cycle. |

[#### Get a Channel](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_get-channel_body)

Retrieves the properties and relationship of a channel.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Enter the ID or select the team that contains the channel you want to retrieve details about. |
| **Channel ID** | Enter the ID or select the channel you want to retrieve details about. |

[#### Create Channel](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_h_a6d1e6eb-f37d-4692-8fe4-9cbcd03f9098_body)

Creates a new channel in a Microsoft Team.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Enter the ID or select the team you want to create a channel for. |
| **Channel Name** | Enter the name for the new channel. |
| **Description** | Enter the channel description. |

[#### Update Channel](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_update-channel_body)

Updates the properties of the specified channel.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Enter the ID or select the team that contains the channel you want to update. |
| **Channel ID** | Enter the ID or select the channel you want to update. |

Please find the descriptions of the fields in the *Create Channel* section above.

[#### Delete Channel](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_id_delete-channel_body)

Deletes a channel from the team.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Enter the ID or select the team that contains the channel you want to delete. |
| **Channel ID** | Enter the ID or select the channel you want to delete. |

[### Message](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-cdcb3343-7176-76d1-628a-7060977b0fa6_body)

You can watch and send messages and replies with the following modules.

[#### Watch Messages](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4613474154888033466525134776_body)

Triggers when someone sends a message in a team's channel or in a chat.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Choose a Type of Messages to be Watched** | Select the types of messages you want to watch. You can choose between channel and chat messages. |
| **Team ID**  only appears for channel messages | Select or map the Team ID whose channel messages you want to watch. |
| **Channel ID**  only appears for channel messages | Select or map the Channel ID whose messages you want to watch. |
| **Chat ID**  only appears for chat messages | Select or map the Chat ID whose messages you want to watch. |
| **Limit** | Set the maximum number of messages Celonis platform will return during one execution cycle. |

[#### Watch New Replies](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4603514634075233520469786338_body)

Triggers when a new reply to a selected message is received. Not available for personal accounts.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Select or map the Team ID whose replies you want to watch. |
| **Channel ID** | Select or map the Channel ID whose replies you want to watch. |
| **Message ID** | Select or map the Message ID whose replies you want to watch. |
| **Limit** | Set the maximum number of messages Celonis platform will return during one execution cycle. |

[#### Send a Message](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4613474265000033466525689456_body)

Sends a message to a team's channel or to a chat.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Send a Message** | Select a message type you want to send. You can choose a channel or chat message. |
| **Team ID**  only appears for channel messages | Select or map the Team ID to which you want to send the message. |
| **Channel ID**  only appears for channel messages | Select or map the Channel ID to which you want to send the message. |
| **Create a New Chat**  only appears for chat messages | Select either **Yes** or **No**.  **Yes** to create a new chat. |
| **Chat Type**  only appears for chat messages | Select or map either **One On One** or **Group**. |
| **Message** | Enter the message text. |
| **Content Type** | Select or map the format in which you want to send the message. For example, `HTML`. |

[#### Reply to a Channel Message](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4560251514403233520478750508_body)

Creates a new reply to a message in the specified channel.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Team ID** | Select or map the Team ID to which you want to reply. |
| **Channel ID** | Select or map the Channel ID to which you want to reply. |
| **Message ID** | Select or map the Message ID to which you want to reply. |
| **Reply Message** | Enter the reply message text. |
| **Content Type** | Select or map the format in which you want to send the message. For example, `HTML`. |

[### Member](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-0a08b380-3251-b654-58c1-8d8bc0e30233_body)

You can add members to teams and to groups with the following modules.

[#### Add a Member](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4566031741836833466573843539_body)

Adds a new member.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Enter a Member Name** | Enter the new member's name. |
| **Password Profile** | Enter the new member's profile password. |

[#### Add a Member to a Group](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4566034645750433466574196533_body)

Adds a member to an Office 365 Group.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Group ID** | Select or map the Group ID to which you want to add the member. |
| **Member ID** | Select or map the Member ID whom you want to add to the group. |

[### Online Meeting](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-403b9810-8244-e917-181c-77a5aadc3331_body)

You can create, retrieve, update, and delete online meetings with the following modules.

[#### Create an Online Meeting](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4567084701465633520492088603_body)

Creates an online meeting. This will be a standalone meeting that is not associated with any event on the user's calendar; therefore, meetings created via this module will not show on the user's calendar.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Subject** | Enter the subject of the online meeting. |
| **Start Date and Time** | Enter the meeting start time |
| **End Date and Time** | Enter the meeting end time |
| Allowed Presenters | Select or map a type of user who can be a presenter in the meeting. |
| Attendees | Information about a participant in a meeting.  |  |  | | --- | --- | | Identity > User > ID | Select or map the ID of the user who is attending. | | Role | Select or map the attendee's role in the online meeting. | |
| Allow Attendee To Enable Camera | Select or map whether attendees can turn on their cameras. |
| Allow Attendee To Enable Mic | Select or map whether attendees can turn on their microphones. |
| Allow Meeting Chat | Select or map whether to enable meeting chat. |
| Allow Teamwork Reactions | Select or map whether to enable reactions for the meeting. |
| Chat Info | Enter the chat information associated with this online meeting.  |  |  | | --- | --- | | Thread ID | Enter the ID of a thread in the Microsoft Teams channel. | | Message ID | Enter the ID of a message in a Microsoft Teams channel. | | Reply Chain Message ID | Enter the ID of the reply message. | |
| Is Entry and Exit Announced | Select or map whether to announce when callers join or leave. |
| Lobby Bypass Settings | Select or map which participants can bypass the meeting lobby.  |  |  | | --- | --- | | Scope | Select or map the type of participants that are automatically admitted into a meeting, bypassing the lobby. | | Is Dial In Bypass Enabled | Select or map whether or not to always let dial-in callers bypass the lobby. | |
| Record Automatically | Select or map whether to record the meeting automatically. |

[#### Update an Online Meeting](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4560251498280033520492748621_body)

Updates an online meeting by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Meeting ID** | Enter the ID associated with the online meeting. |
| Subject | Enter the subject of the online meeting. |
| Start Date and Time | Enter the meeting start time. |
| End Date and Time | Enter the meeting end time. |
| Allowed Presenters | Select or map a type of user who can be a presenter in the meeting. |
| Attendees | Information about a participant in a meeting.  |  |  | | --- | --- | | Identity > User > ID | Select or map the ID of the user who is attending. | | Role | Select or map the attendee's role in the online meeting. | |
| Allow Attendee To Enable Camera | Select or map whether attendees can turn on their cameras. |
| Allow Attendee To Enable Mic | Select or map whether attendees can turn on their microphones. |
| Allow Meeting Chat | Select or map whether to enable meeting chat. |
| Allow Teamwork Reactions | Select or map whether to enable reactions for the meeting. |
| Is Entry and Exit Announced | Select or map whether to announce when callers join or leave. |
| Lobby Bypass Settings | Select or map which participants can bypass the meeting lobby.  |  |  | | --- | --- | | Scope | Select or map the type of participants that are automatically admitted into a meeting, bypassing the lobby. | | Is Dial In Bypass Enabled | Select or map whether or not to always let dial-in callers bypass the lobby. | |
| Record Automatically | Select or map whether to record the meeting automatically. |

[#### Get an Online Meeting](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4506898859676833520493435371_body)

Retrieves an online meeting by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Meeting ID** | Enter the ID associated with the online meeting. |

[#### Delete an Online Meeting](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4567085039644833520494009189_body)

Deletes an online meeting by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Meeting ID** | Enter the ID associated with the online meeting. |

[### Other](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-e2abcbb3-297b-cc26-022d-2c5c316c7b4f_body)

You can search users, retrieve users' statuses, and call APIs with the following modules.

[#### Search Users](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4550279490961633466520922197_body)

Searches for users by a filter parameter.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **Filter** | Add filters to search for users who match your specified filters. |
| **Limit** | Set the maximum number of users Celonis platform will return during one execution cycle. |

**Keyword Query Language**

Use Keyword Query Language (KQL) search syntax to build your search queries in Microsoft modules. For more information, see [Microsoft Graph help](https://learn.microsoft.com/en-us/graph/api/resources/search-api-overview?view=graph-rest-1.0#keyword-query-language-kql-support).

[#### Get User's Presence](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4556557048105633520443129344_body)

Retrieves the selected users' availability and activity status

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **User IDs** | Select or map the users whose status you want to retrieve. |

[#### Make an API Call](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_section-idm4613474239553633466495328433_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Microsoft Teams account. |
| **URL** | Enter a path relative to `https://graph.microsoft.com`. E.g. `/v1.0/teams/<TEAM_ID>/channels` – where the `<GROUP_ID>` is the ID of the team you want to retrieve channels from.  **Note**  For the list of available endpoints, refer to the [Microsoft Graph REST API Reference](https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview). |
| **Method** | Select the HTTP method you want to use:  **GET** to retrieve information for an entry.  **POST** to create a new entry.  **PUT** to update/replace an existing entry.  **PATCH** to make a partial entry update.  **DELETE** to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

##### Example of Use - List Team's Channels

The following API call returns a list of all channels from the specified team in your Microsoft Teams account:

**URL:** `/v1.0/teams/7d0845d0-5015-4d1e-8cfc-4628f53a237d/channels` where the `7d0845d0-5015-4d1e-8cfc-4628f53a237d` is the **Group ID** of the team you want to retrieve channels from.

You can retrieve the group ID, for example, using the **List All Teams > Groups**or**Watch Teams** module.

**Method:** `GET`

Matches of the search can be found in the module's Output under **Bundle > Body > value**.

In our example, 9 channels were returned:

[## Permissions Information for Microsoft Teams](#UUID-dbf0da86-65c1-4090-f9bf-b1801691cc1b_UUID-bbcfa5c7-dc16-9ab9-3a7d-a671805069bc_body)

- **Add a Member** - offline\_access, User.Read, User.ReadWrite.All
- **Add a Member to a Group** - offline\_access, User.Read, User.Read.All, GroupMember.ReadWrite.All
- **Create a Channel** - offline\_access, User.Read, Group.ReadWrite.All
- **Create an Office 365 Group** - offline\_access, User.Read, Group.ReadWrite.All, User.Read.All
- **Create a Team from a Group** - offline\_access, User.Read, Group.ReadWrite.All
- **Create an Online Meeting** - offline\_access, User.Read, OnlineMeetings.ReadWrite
- **Delete a Channel** - offline\_access, User.Read, Group.ReadWrite.All
- **Delete a Team or Group** - offline\_access, User.Read, Group.ReadWrite.All
- **Delete an Online Meeting** - offline\_access, User.Read, OnlineMeetings.ReadWrite
- **Get a Channel** - offline\_access, User.Read, Group.Read.All
- **Get an Online Meeting** - offline\_access, User.Read, OnlineMeetingArtifact.Read.All, OnlineMeetings.Read
- **Get a Team** - offline\_access, User.Read, Group.Read.All
- **Get User's Presence** - offline\_access, User.Read, Presence.Read.All, User.Read.All
- **List All Teams & Groups** - offline\_access, User.Read, Group.Read.All
- **List Channels** - offline\_access, User.Read, Group.Read.All
- **List Jointed Teams** - offline\_access, User.Read, Group.Read.All
- **Reply to a Channel Message** - offline\_access, User.Read, ChannelMessage.Send, Group.Read.All, ChannelMessage.Read.All
- **Search Users** - offline\_access, User.Read, User.Read.All
- **Send a Message** - offline\_access, User.Read, ChannelMessage.Send, Chat.ReadWrite, User.Read.All, Group.Read.All
- **Update a Channel** - offline\_access, User.Read, Group.ReadWrite.All
- **Update an Online Meeting** - offline\_access, User.Read, OnlineMeetings.ReadWrite
- **Update a Team** - offline\_access, User.Read, Group.ReadWrite.All
- **Watch Messages** - offline\_access, User.Read, ChannelMessage.Read.All, Chat.Read
- **Watch New Replies** - offline\_access, User.Read, ChannelMessage.Read.All, Group.Read.All
- **Watch Teams** - offline\_access, User.Read, Group.Read.All
- **Make an API Call** - offline\_access, User.Read

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")


---

## automation/action-flows/monitoring-and-auditing-action-flows

# Monitoring and auditing Action Flows

Monitoring Action Flows ensures your automations are running correctly and provides an audit trail for security and compliance. Use the Celonis Platform audit logs to track configuration changes and execution history.

Expand all

[## Before you begin](#UUID-174989ba-75ab-acb6-3738-8fa40a04c49d_section-id23550449344091_body)

Before monitoring your Action Flows, you need:

- Permission to access Audit Logs in the Celonis Platform.
- An active Action Flow created in Studio.

[## Monitoring options](#UUID-174989ba-75ab-acb6-3738-8fa40a04c49d_section-id235504493488118_body)

When monitoring your Action Flows, you have the following options:

- **View Configuration History**: To see who created, modified, or deleted an Action Flow, access the system audit logs via the API.

  - Navigate to the Viewing your audit logs documentation for specific API endpoints.
  - Filter by the action type (e.g., activated, deactivated, or published) to identify lifecycle changes.
- **Audit Execution Events**: Track what an Action Flow did to your system and who triggered it.

  - Open the Audit logs - Action flows section.
  - Review the timestamp and the account used for the connection.
  - Note: If a service account was used to connect to a source system, that service account name will appear in the logs rather than an individual user.
- **Monitor Individual Action Flows**: If you need to watch a specific automation in real-time or check its recent status:

  - Go to the Managing Action Flows menu.
  - Select the specific Flow and click Monitor.
- **Download and Archive Logs**: To meet internal data retention requirements, download your logs periodically.

  - Export the log data to your preferred storage format to ensure long-term availability beyond the standard platform retention period.

## Related topics

- [Setting up Action Flows in Studio](setting-up-action-flows-in-studio.html "Setting up Action Flows in Studio")
- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Creating connections for Action Flows](creating-connections-for-action-flows.html "Creating connections for Action Flows")


---

## automation/action-flows/mulesoft--action-flow-

# MuleSoft (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

MuleSoft CloudHub is the Platform-as-a-Service (PaaS) component of the MuleSoft Anypoint platform. It's a global, fully-managed, multi-tenanted, secure and highly available platform for APIs and integrations.

By using the MuleSoft App in Celonis Platform Action Flows, you can send a request to MuleSoft to trigger a CloudHub action configured on your Anypoint Platform. This allows you to ensure:

- advanced control over your automation
- additional security and monitoring when running Action Flow automation

Expand all

[## Before you begin](#UUID-ecf633ed-51f8-8a0e-bd38-4065f22a0bca_section-idm455589767932963317876116864_body)

To use MuleSoft with Celonis Platform , you need to configure your MuleSoft CloudHub application in the way that the CloudHub API are ready to be triggered from an external application (Action Flows).

[## MuleSoft functionality](#UUID-ecf633ed-51f8-8a0e-bd38-4065f22a0bca_section-idm4653738998374433178761646134_body)

You can send a request to MuleSoft to trigger a CloudHub API configured on the Anypoint Platform.

This page explains how to:

- set up a connection to MuleSoft
- configure a MuleSoft app to trigger a CloudHub action

[## Connecting MuleSoft to Celonis platform](#UUID-ecf633ed-51f8-8a0e-bd38-4065f22a0bca_UUID-b32dae00-b293-aa80-c887-aa109aa2a6c5_body)

You need to obtain OAuth client credentials from your MuleSoft account and insert them in Celonis platform .

To connect MuleSoft to Celonis platform:

1. Log in to your MuleSoft account.
2. Click **your left menu > Access Management > Connected Apps > Create app**.
3. Enter the app details in the table below:

   |  |  |
   | --- | --- |
   | **Name** | App name. |
   | **Type** | Select the connection type as **App acts on its own behalf (client credentials)**. |
   | **Add Scopes** | Add the following minimum scopes:  - **API Manager:** View APIs Configuration - **Runtime Manager:** Read Applications - **General:** View Environment, View Organization - **Exchange:** Exchange Viewer - **OpenID:** Profile |
4. Review the scopes and click **Save**.
5. Click **Copy ID** and **Copy Secret** to store the values in a safe place.
6. Log in to your Celonis platform account and open the MuleSoft module's *Create a Connection* dialog.
7. In the **Connection name** field, enter a name for the connection.
8. In the **Client ID** and **Client Secret** fields, enter the values from step 6.
9. Click **Save**.

You have successfully connected the MuleSoft app and you can now build Action Flows .

[## Triggering a CloudHub Action](#UUID-ecf633ed-51f8-8a0e-bd38-4065f22a0bca_UUID-c53167b0-9f90-980f-6adb-fb057d7aa680_body)

CloudHub is a fully managed, containerized integration-Platform-as-a-Service (iPaaS) where you can deploy APIs and integrations as lightweight containers in the cloud.

### Trigger a CloudHub Action

Sends a request to MuleSoft to trigger a CloudHub action.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your MuleSoft account](mulesoft--action-flow-.html#UUID-ecf633ed-51f8-8a0e-bd38-4065f22a0bca_UUID-b32dae00-b293-aa80-c887-aa109aa2a6c5 "Connecting MuleSoft to Celonis platform"). |
| **MuleSoft Environment** | Select the environment that contains the CloudHub applications you want to automate. |
| **CloudHub Application** | Select one of the applications deployed on the Mulesoft CloudHub. |
| **Input method** | Select a method to configure the action to be triggered. You can select between a customized manual input or a pre-configured input in the Mulesoft Exchange. |
| **Action to be triggered** | Select one of the actions available to be triggered for this application. |
| **Add Input Parameters** | Add the parameter details that auto-populate based on the option selected for the **Action to be triggered** field. |
| **Choose Method** | Select or map the HTTPS request method such as `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`, and `HEAD`. |
| **Specify endpoint** | An endpoint relative to the application's base URL. For example, `/`. |
| **Add Input Headers** | Add the key-value pair of headers. You can add multiple headers.  - **Input Header Key:** Enter the key, so that Action Flow can add this item to the queue. - **Input Header Value:** Enter the value of the key. You can also select available variables from previous modules while clicking on the field. |
| **Optional: Authorization Type** | An optional field to generate the authorization header. This field appears when you select Input Method as the preconfigured Mulesoft exchange input.  If the desired authorization method is not listed, add the required headers or query strings manually.  - **No Authorization:** No action is required. - **API Key:** Your Anypoint account API key.  For more information, see [Anypoint API Manager](https://docs.mulesoft.com/api-manager/2.x/latest-overview-concept). - **Bearer Token:** A bearer token for the Anypoint Platform. Your CLI session expires when the bearer token expires.  For more information, see [How to generate your Authorization Bearer token for the Anypoint Platform](https://help.mulesoft.com/s/article/How-to-generate-your-Authorization-Bearer-token-for-Anypoint-Platform). - **Basic Authorization:** Use your username and password to log into the CLI directly.  For information about logging in using SSO, see [About Identity Management](https://docs.mulesoft.com/access-management/external-identity). |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/mysql--action-flow-

# MySQL (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Celonis platform **MySQL** modules let you execute your custom logic directly in your database server through [stored procedures](https://dev.mysql.com/doc/connector-net/en/connector-net-tutorials-stored-procedures.html). Celonis platform loads the interface of input/output parameters and recordsets dynamically, so each parameter/value can be mapped individually.

Preprequisites:

- A MySQL server connection
- A Configured MySQL server

Expand all

[## Creating a Connection to the MySQL Server](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62_body)

|  |  |
| --- | --- |
| **Connection name** | Enter the name of the new MySQL connection you want to establish. |
| **Host** | Enter the address of the MySQL server.  The MySQL server must be publicly accessible from the internet. If you want to use the database hosted on your local server, you'll need to specify your **public IP address,** and set the **port forwarding** on your router. Do **not** enter "*localhost,*" or "*127.0.0.1*" in this field, as it will not work. |
| **Port** | Enter the port number of the MySQL server. |
| **Database** | Enter the database name if needed. This is required for the *Execute a Query (advanced)* module. |
| **User** | Enter the MySQL server user name. |
| **Password** | Enter the password. |
| ***Allow insecure authentication*** | Enable this option to connect to MySQL instances that use the old authentication method (MySQL 4.0 and older). If needed, see additional information about [Updating Old Authentication Protocol Passwords](https://dev.mysql.com/doc/workbench/en/wb-mysql-connections-secure-auth.html). |
| **Charset**  (optional) | Enter the MySQL character set for the connection, e.g., `utf8`. In this case, the `utf8_general_ci` MySQL collation is used. |
| ****Self-signed certificate**** (optional) | Upload your certificate (**P12,** **PFX,** or **PEM** file) if you want to use TLS using your self-signed certificate. If you're using the client-side certificate authorization, you can enter your CA certificate here. **Celonis platform does not retain or store any data (files, passwords) you provide. File and password are only used to extract a private key/certificate.** |
| ****Client Private Key**** (optional) | Upload the private key to use the client-side certificate authorization. **Celonis platform does not retain or store any data (files, passwords) you provide. File and password are only used to extract a private key/certificate.** |
| ****Client Certificate**** (optional) | Upload your certificate if you want to use client-side certificate authorization. **Celonis platform does not retain or store any data (files, passwords) you provide. File and password are only used to extract a private key/certificate.** |

[## Configuring your MySQL server](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-35feffe6-d525-8567-0241-dd32822953fa_body)

**Caution**

**Remote access** must be allowed, and **CREATE ROUTINE** privilege must be granted on the MySQL server!

### Read Access to MySQL Tables

Before you start configuring your Action Flow, ensure the account you are using to connect to your database has read access to `information_schema.tables`, `information_schema.columns`, `information_schema.routines`, and `information_schema.parameters` tables.

### Celonis platform IP Addresses

Celonis platform will make connections to your database from the following IP addresses.

Our servers are set up with valid PTR records, so you can easily restrict access by allowing `%.make.com`.

### Enabling Access on Your Firewall

Enable incoming TCP connections to port **3306** from source IP addresses.

### Configuring MySQL for Remote Access

***Linux***

1. Open the configuration file `/etc/mysql/my.cnf`

2. Comment outline `bind-address = 127.0.0.1` (by adding a hash at the beginning of the line):

`#bind-address = 127.0.0.1`

3. Restart the MySQL daemon

### Creating and Granting Remote Access to Your MySQL Account

1. Start the MySQL command-line interface:

`mysql -u root -p`

2. Execute these commands (with `<database>`, `<user>` and `<password>` replaced by actual values):

`CREATE USER &lt;user&gt;@'%' IDENTIFIED BY &lt;password&gt; GRANT ALL PRIVILEGES ON &lt;database&gt;.* TO &lt;user&gt;@'%' IDENTIFIED BY &lt;password&gt; WITH GRANT OPTION; FLUSH PRIVILEGES;`

### Tolerance of Non-interactive Connection

Celonis platform processes Action Flows transactionally. That's why all Celonis platform modules that support transactions (e.g., **MySQL**) have open transactions throughout the whole run of a Action Flow. Therefore, make sure that you have set a long enough time to tolerate non-interactive connections. This MySQL command will list the values:

`SHOW VARIABLES LIKE 'wait_timeout';`

See more information in the [MySQL documentation on Server System Variables](https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html#sysvar_wait_timeout).

[## Available Actions](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-0fa509e8-9810-ef69-e7b0-a2bd3a9ec4e7_body)

[### Insert Row Into a Table](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_insert-row-into-a-table_body)

Inserts a row with the desired values into a selected table.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Table** | Select the table where you want to add a row. |
| ***column name(s)*** | Enter the desired values that will be inserted into the new row. |

**Note**

To pass a `NULL` value, use an `INSERT` statement via [Execute a query (advanced)](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-4b47e951-2978-1aab-b9d2-d3cadcdf4646 "Execute a Query (Advanced)") module. For more information, refer to [Passing NULL Values into a Table](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-63a8ed6e-88fe-7350-72f7-adaa441f1915 "Passing NULL Values into a Table").

[### Update Row(s) in a Table](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_update-rows-in-a-table_body)

Updates rows (can be defined by the filter settings) in the selected table.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Table** | Select the table where you want to update a row. |
| ***column name(s)*** | Enter the desired values that will be inserted into the rows. |
| **Filter** | Set the filter to define which rows will be updated. |

**Note**

To pass a `NULL` value, use an `UPDATE` statement via [Execute a query (advanced)](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-4b47e951-2978-1aab-b9d2-d3cadcdf4646 "Execute a Query (Advanced)") module. For more information, refer to [Passing NULL Values into a Table](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-63a8ed6e-88fe-7350-72f7-adaa441f1915 "Passing NULL Values into a Table")

[### Delete Row(s) From a Table](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_delete-rows-from-a-table_body)

Deletes a row according to a defined filter.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Table** | Select the table where you want to delete the row. |
| **Filter** | Set the filter for the row to be deleted.  Set filter values. You can also use logical operators, AND/OR, to specify your selection. |

[### Passing NULL Values into a Table](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-63a8ed6e-88fe-7350-72f7-adaa441f1915_body)

As of now, it is not possible to pass NULL values in our standard modules, **Insert/Update row(s) into a table** even using the `null` pill.

To achieve this, you need to use the **Execute a query (advanced)** module where you prepare a full SQL statement (either INSERT or UPDATE) as a workaround as shown in the example.

You need to update an existing row in your database with three columns: Name, Email, and Phone Number.

You want to update a contact and set the contact's phone to NULL based on the contact’s email address.

To achieve that, use this statement:

`` `UPDATE yourtablenamehereSET Name='Joe Doe',Email='joe@doe.com',Phone=NULLWHERE Email='joe@doe.com'` ``

In your real scenario, map the email address (and the name possibly too) from preceding modules and ensure the mapped pills are in single quotes.

[### Execute a Query (Advanced)](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-4b47e951-2978-1aab-b9d2-d3cadcdf4646_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Query** | Enter the desired MySQL query. Make sure that the *Database* field under *Connection* settings is filled.  Variables used in the query are not sanitized. Make sure you sanitize variables properly to prevent SQL injection. |
| **Continue the execution of the route even if the module returns no results** | If enabled, the Action Flow will not be stopped by this module. |

Only one SQL statement is allowed (one semicolon `;` as a statement terminator per query).

[### Execute a Stored Procedure](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_execute-a-stored-procedure_body)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Stored procedure** | Select the stored procedure you want to execute. The stored procedure must already be created.  Here is a sample SQL statement that creates a stored procedure that simply inserts the values passed in the three parameters into a table:  `` DELIMITER ;; CREATE PROCEDURE `insert_record_from_integromat`(IN _name text, IN _email text, IN _phone text) ``  `` DELIMITER ;; CREATE PROCEDURE `insert_record_from_celonis`(IN _name text, IN _email text, IN _phone text) ``  `BEGIN INSERT INTO contacts (name, email, phone) VALUES (_name, _email, _phone); END;;` |
| **Fields** | Contains the parameter fields from the stored procedure. E.g., enter values you want to insert into the table during the stored procedure execution. |

[## Example of MySQL](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-5ba44c31-e2af-1c95-4e8e-83a386748fae_body)

The following example adds 2 to the provided parameter (e.g., in the *Execute a Stored Procedur*e module), and returns the result, together with the current date (can be further iterated using the *Iterate Recordset of a Stored Procedure* module).

```
CREATE PROCEDURE `test_procedure`(IN id integer, OUT outid integer)
BEGIN
 set outid = id + 2;
 select id as inid, now() as current_date;
END$$
```

[## Searches](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-4be0cf27-bd86-beec-353c-0afe7efcd9d9_body)

### Select Row(s) From a Table

This action selects a row from a table according to a defined filter.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to the MySQL server.](mysql--action-flow-.html#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-1fc3c4cb-f178-4a44-5971-5a6b56351a62 "Creating a Connection to the MySQL Server") |
| **Table** | Select the table you want to select a row from. |
| **Filter** | Set the filter for the row to be selected.  Set filter values. You can also use logical operators, AND/OR, to specify your selection.  Example:  On the following *MySQL* dialog, the row that contains number 1 or 2 in the "column1" column will be selected. |
| **Continue the execution of the route even if the module returns no results** | If enabled, the Action Flow will not be stopped by this module. |

**Note**

You may also use the existing basic text operators for **comparing dates and datetimes.** Just use text formatted date/datetime as the second operand:

- `YYYY-MM-DD` for date type
- `YYYY-MM-DD HH:mm:ss` for datetime type

Literal static datetime value example:

Formatted dynamic datetime value example:

[## Iterators](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-952d6727-6590-aabc-3592-96dc77f62bc1_body)

### Iterates Recordset of a Stored Procedure.

|  |  |
| --- | --- |
| **Source module** | Select the source module containing the stored procedure recordset you want to iterate. |

[## Troubleshooting MySQL](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_UUID-a04f8eaf-6408-9ed0-a2a7-875bcf3625df_body)

[### Error: ER\_NOT\_SUPPORTED\_AUTH\_MODE: Client does not support authentication protocol requested by server; consider upgrading MySQL client:](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_auth_body)

MySQL 8 uses an authentication method that is not supported by Celonis platform yet.

**Solution**

Use the **mysql\_native\_password** plugin to make the account fall back to the "traditional" process during the handshake, keeping compatibility by default for any previously supported server version.

Create the account using the **mysql\_native\_password** authentication plugin:

`CREATE USER 'new_user'@'%' IDENTIFIED WITH mysql_native_password BY 'user_password';`

Or, modify the existing user account, and specify the **mysql\_native\_password** authentication plugin:

`ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourRootPassword';`

(Reference: <https://github.com/mysqljs/mysql/issues/2046#issuecomment-396039909>)

[### Error: ER\_LOCK\_WAIT\_TIMEOUT: Lock wait timeout exceeded; try restarting transaction:](#UUID-32521092-c000-55f7-d06f-5ce117a0c0c0_id_error-er_lock_wait_timeout-lock-wait-timeout-exceeded-try-restarting-transaction_body)

This error occurs when you modify the same data using multiple modules. It is caused by SQL transactions.

When any SQL module is executed, then it starts the transaction (1), and the transaction is finished after the Action Flow is fully executed. If another module tries to access the same data used in another unfinished transaction (1), then it has to wait until the previous transaction (1) is finished. This, however, never happens because the first transaction (1) will be finished when the Action Flow is finished.

**Solution**

Turn on *Auto-commit*. It finishes (commits) every transaction immediately after the module execution is done.

1. Open *Action Flow settings*.

2. Enable the *Auto commit* checkbox.

3. Confirm the settings dialog by clicking the *OK* button.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/onedrive--action-flow-

# OneDrive (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With OneDrive modules in Celonis platform, you can manage files and folders in your OneDrive account.

To use the OneDrive modules, you must have a OneDrive account. You can create an account at [onedrive.live.com](https://onedrive.live.com/).

Refer to the [Microsoft Graph REST API documentation](https://docs.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0) for a list of available endpoints.

Expand all

[## Connecting OneDrive to Celonis platform](#UUID-60af26e0-80ab-ce9f-f4ae-0443a32dd63a_UUID-40458049-6c8c-c66a-1764-4b8b3843515e_body)

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a OneDrive module Action Flow to your Action Flow, and click **Create a Connection**.

   Note: If you add a module with an `instant` tag, click **Create a webhook**, then **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show advanced settings** to enter your [custom app client credentials, tenant ID](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), and add additional scopes as needed. For more information about the permissions, see the [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

   You have successfully established the connection. You can now edit your Action Flow and add more OneDrive modules.

[## Building OneDrive Action Flows](#UUID-60af26e0-80ab-ce9f-f4ae-0443a32dd63a_section-idm4537582169345633706722373127_body)

After connecting the app, you can perform the following actions:

**Files**

- Watch Files

  Note: This webhook is valid for a one month period after being created/updated. To keep it active, make sure to trigger it within the given period and it will automatically refresh a new expiration date.

  This webhook acts as a simple notification to inform you of changes to a user's drive and does not include any information about the changes that triggered it.
- Watch Files/Folders
- Search Files/Folders
- Get a File
- Download a File
- Upload a File
- Create a Folder
- Get a Share Link
- Move a File/Folder
- Rename a File/Folder
- Copy a File
- Delete a File/Folder

**Other**

- Make an API Call
- Upload a File by URL
- Send a Sharing Invitation
- Search Sites
- List Drives

[## Possible Problems](#UUID-60af26e0-80ab-ce9f-f4ae-0443a32dd63a_UUID-52fa8cc7-5286-6aa2-5cc5-99e107d2b514_body)

### Unable to Upload or Update a File

There are several situations when uploading or updating a file may fail:

- The uploaded file is too big and exceeds the maximum file size limit for your OneDrive plan, or you have used all of your OneDrive account's storage quota. To get more storage space, delete existing files from OneDrive, or upgrade your OneDrive account.
- The previously selected folder to which the file is being uploaded no longer exists. The Action Flow is stopped, and you must select the target folder again.

[## Permissions information for OneDrive](#UUID-60af26e0-80ab-ce9f-f4ae-0443a32dd63a_UUID-b0e1e961-f495-60aa-f59f-7f9662b69c2f_body)

**Caution**

Modules that require the `Files.Read.All` permission might not work properly when using a **personal** Microsoft account.

- **Search Files/Folders** - Files.Read.All, Group.Read.All, Sites.Read.All, offline\_access, User.Read
- **Get a File** - Files.Read.All, Group.Read.All, Sites.Read.All, offline\_access, User.Read
- **Download a File** - Files.Read.All, Group.Read.All, Sites.Read.All, offline\_access, User.Read
- **Upload a File** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Create a Folder** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Get a Share Link** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **List Drives** - Files.Read.All, offline\_access, User.Read
- **Move a File/Folder** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Rename a File/Folder** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Copy a File** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Delete a File/Folder** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Search Sites** - Sites.Read.All, offline\_access, User.Read
- **Send a Sharing Invitation** - Files.ReadWrite, Files.ReadWrite.All, Sites.ReadWrite.All, offline\_access, User.Read
- **Upload a File by URL** - Files.ReadWrite.All, Sites.ReadWrite.All, Group.ReadWrite.All, offline\_access, User.Read
- **Watch Files/Folders** - Files.Read.All, Group.Read.All, Sites.Read.All, offline\_access, User.Read
- **Watch Files** - Files.Read.All, offline\_access, User.Read
- **Make an API Call** - offline\_access, User.Read

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/oracle-fusion-cloud-erp--action-flow-

# Oracle Fusion Cloud ERP (Action Flow)

With Oracle Fusion Cloud ERP modules in Celonis platform, you can watch, search for, create, retrieve, update, and delete records.

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

**Note**

To use the Oracle Fusion Cloud ERP app in Celonis platform, you must have the Celonis platform [Enterprise](https://www.make.com/en/pricing)  plan. All Enterprise apps are currently labeled as `premium tier 3` in Celonis platform.

Refer to the [Oracle Fusion Cloud ERP API documentation](https://docs.oracle.com/en/cloud/saas/financials/23c/farfa/rest-endpoints.html) for a list of available endpoints.

Expand all

[## Connecting Oracle Fusion Cloud ERP to Celonis platform](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734_body)

To establish the connection, you must enter your Oracle Cloud service server name and login credentials. This information can be found in the Oracle Cloud service welcome email sent to your Oracle Cloud service administrator.

1. Log in to your Celonis platform account, add an Oracle Fusion Cloud ERP module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **Server Name** field, enter the URL of your Oracle Cloud service. For example, `servername.fa.us2.oraclecloud.com`.
4. In the **Username** and **Password** fields, enter your Oracle Cloud service login credentials. Your account must have the necessary user permissions to be able to access the relevant records in Celonis platform.
5. Set the connection's **Scope** by selecting the relevant record types.

   Note: If you receive a `data.collection is too big` error, limit the **Scope** selection to specific record types.
6. Click **Save**.

You have successfully established the connection. You can now edit your Action Flow and add more Oracle Fusion Cloud ERP modules.

**Caution**

The connection may take up to 5 minutes to establish. Please leave the connection window open until the connection is successful.

[## Available Records](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_UUID-88e25fe3-ab5b-dcf8-6404-dc23b5eb307c_body)

[### Watch Records](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm1953380578416312_body)

Triggers when records are created.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to watch for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to watch for. |
| **Record Type** | Select the record type to watch for. If no record types are shown, you do not have the user rights for the record type category selected above.  The selected record type must contain a 'datetime' parameter. If it does not, you will receive an error prompting you to choose a different record type. |
| **Parent ID** | Enter the parent ID or `@context.key` value of the records you want to watch for.  Different record types use different parameters as ID. |
| **Date Field** | Select which of the record's date fields will trigger the module. It must be type: `datetime`. |
| **Label Field** | Select the label to show when configuring **Choose where to start** > **Choose manually** in the module setup. |
| **Fields** | Select the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

[### Search Records](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm1953380579411358_body)

Retrieves a list of records filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to search for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to search for. |
| **Record Type** | Select the record type to search for. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to search for. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Query Builder** | Select whether to use the **Builder** (filter by selecting from list) or **Custom** (enter a query string) method to specify filters. |
| **Filter** | Create filters to narrow down the search records returned. |
| **Query String** | Enter a query string according to the [Oracle Fusion Cloud documentation](https://docs.oracle.com/en/cloud/saas/financials/23b/farfa/Collections.html). |
| **Order By** | Map or enter the direction in which fields should be returned. |
| **Fields** | Select or map the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Effective Date** | Enter the effective date of the records to return. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

#### Troubleshooting

**Oracle search limitations**:

`[400] Bad Request. Failed to build ViewCriteria from expression...`

`[500] Internal Server Error.`

Due to Oracle limitations, certain record type categories cannot be searched for.

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Create a Record](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4639006716902433786712002179_body)

Creates a new record.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to create.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to create. |
| **Record Type** | Select the record type to create. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to create. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information of the record you want to create into the fields that appear. The fields are dependent upon the selected **Record Type**. |

#### Troubleshooting

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Get a Record](#id610016_body)

Retrieves the details of a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to retrieve details of.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to retrieve. |
| **Record Type** | Select the record type to retrieve details of. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Expand** | Enter the name of a child record to include the details of.  To specify multiple child record types, use a `,` as a separator. For example: `Employees,Localizations`.  To specify nested child records types, use the format `Child.NestedChild`. For example: `Employees.Managers`. If a nested child is provided, the relevant child will be processed implicitly - Employees.Managers is the same as Employees,Employees.Managers. |

[### Update a Record](#id610073_body)

Updates a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to update.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to update. |
| **Record Type** | Select the record type to update. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information you want to update in the fields that appear. The fields are dependent upon the selected **Record Type**. |

[### Delete a Record](#id610125_body)

Deletes a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **Record Type Category** | Select the category of the record type to delete.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to delete. |
| **Record Type** | Select the record type to delete. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |

[## Other fields](#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_UUID-825afe9d-b652-6051-ff33-2c4c78a9fad7_body)

[### Make an API Call](#id610172_body)

Performs an arbitrary authorized API Call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud ERP account.](oracle-fusion-cloud-erp--action-flow-.html#UUID-a403a67e-70a1-e74e-4145-9a0d8a1e7c7f_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud ERP to Celonis platform") |
| **URL** | Enter a path relative to `https://<servername>/`. For example: `/fscmRestApi/resources/11.13.18.05/invoices`.  Refer to the [Oracle Fusion Cloud ERP API documentation](https://docs.oracle.com/en/cloud/saas/financials/23b/farfa/rest-endpoints.html) for a list of available endpoints. |
| **Method** | Select or map the HTTP method you want to use:  **GET**to retrieve information for an entry.  **POST**to create a new entry.  **PUT**to update/replace an existing entry.  **PATCH**to make a partial entry update.  **DELETE**to delete an entry. |
| **Headers** | Enter or map the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter or map the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/oracle-fusion-cloud-hcm--action-flow-

# Oracle Fusion Cloud HCM (Action Flow)

With Oracle Fusion Cloud HCM modules in Celonis platform, you can watch, search for, create, retrieve, update, and delete records.

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

**Note**

To use the Oracle Fusion Cloud HCM app in Celonis platform, you must have the Celonis platform [Enterprise](https://www.make.com/en/pricing)  plan. All Enterprise apps are currently labeled as `premium tier 3` in Celonis platform.

Refer to the [Oracle Fusion Cloud HCM API documentation](https://docs.oracle.com/en/cloud/saas/human-resources/23c/farws/rest-endpoints.html) for a list of available endpoints.

Expand all

[## Connecting Oracle Fusion Cloud HCM to Celonis platform](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734_body)

To establish the connection, you must enter your Oracle Cloud service server name and login credentials. This information can be found in the Oracle Cloud service welcome email sent to your Oracle Cloud service administrator.

1. Log in to your Celonis platform account, add an Oracle Fusion Cloud HCM module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **Server Name** field, enter the URL of your Oracle Cloud service. For example, `servername.fa.us2.oraclecloud.com`.
4. In the **Username** and **Password** fields, enter your Oracle Cloud service login credentials. Your account must have the necessary user permissions to be able to access the relevant records in Celonis platform.
5. Set the connection's **Scope** by selecting the relevant record types.

   Note: If you receive a `data.collection is too big` error, limit the **Scope** selection to specific record types.
6. Click **Save**.

You have successfully established the connection. You can now edit your Action Flow and add more Oracle Fusion Cloud HCM modules.

**Caution**

The connection may take up to 5 minutes to establish. Please leave the connection window open until the connection is successful.

[## Available Records](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_UUID-37bd577f-3fac-65cb-5544-5da3c1566379_body)

[### Watch Records](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm1953380578416312_body)

Triggers when records are created.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to watch for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to watch for. |
| **Record Type** | Select the record type to watch for. If no record types are shown, you do not have the user rights for the record type category selected above.  The selected record type must contain a 'datetime' parameter. If it does not, you will receive an error prompting you to choose a different record type. |
| **Parent ID** | Enter the parent ID or `@context.key` value of the records you want to watch for.  Different record types use different parameters as ID. |
| **Date Field** | Select which of the record's date fields will trigger the module. It must be type: `datetime`. |
| **Label Field** | Select the label to show when configuring **Choose where to start** > **Choose manually** in the module setup. |
| **Fields** | Select the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

[### Search Records](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm1953380579411358_body)

Retrieves a list of records filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to search for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to search for. |
| **Record Type** | Select the record type to search for. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to search for. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Query Builder** | Select whether to use the **Builder** (filter by selecting from list) or **Custom** (enter a query string) method to specify filters. |
| **Filter** | Create filters to narrow down the search records returned. |
| **Query String** | Enter a query string according to the [Oracle Fusion Cloud documentation](https://docs.oracle.com/en/cloud/saas/human-resources/23c/farws/Query_a_Collection.html). |
| **Order By** | Map or enter the direction in which fields should be returned. |
| **Fields** | Select or map the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Effective Date** | Enter the effective date of the records to return. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

#### Troubleshooting

**Oracle search limitations**:

`[400] Bad Request. Failed to build ViewCriteria from expression...`

`[500] Internal Server Error.`

Due to Oracle limitations, certain record type categories cannot be searched for.

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Create a Record](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4639006716902433786712002179_body)

Creates a new record.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to create.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to create. |
| **Record Type** | Select the record type to create. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to create. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information of the record you want to create into the fields that appear. The fields are dependent upon the selected **Record Type**. |

#### Troubleshooting

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Get a Record](#id610508_body)

Retrieves the details of a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to retrieve details of.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to retrieve. |
| **Record Type** | Select the record type to retrieve details of. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Expand** | Enter the name of a child record to include the details of.  To specify multiple child record types, use a `,` as a separator. For example: `Employees,Localizations`.  To specify nested child records types, use the format `Child.NestedChild`. For example: `Employees.Managers`. If a nested child is provided, the relevant child will be processed implicitly - Employees.Managers is the same as Employees,Employees.Managers. |

[### Update a Record](#id610565_body)

Updates a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to update.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to update. |
| **Record Type** | Select the record type to update. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information you want to update in the fields that appear. The fields are dependent upon the selected **Record Type**. |

[### Delete a Record](#id610617_body)

Deletes a record by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **Record Type Category** | Select the category of the record type to delete.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to delete. |
| **Record Type** | Select the record type to delete. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |

[## Other fields](#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_UUID-d93afaac-ae01-2778-c491-7f5bf1e7c679_body)

[### Make an API Call](#id610664_body)

Performs an arbitrary authorized API Call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Oracle Fusion Cloud HCM account.](oracle-fusion-cloud-hcm--action-flow-.html#UUID-dbafc5de-4811-d3f8-8c9e-423a984cea05_section-idm4581606203940833786708201734 "Connecting Oracle Fusion Cloud HCM to Celonis platform") |
| **URL** | Enter a path relative to `https://<servername>/`. For example: `/fscmRestApi/resources/11.13.18.05/invoices`.  Refer to the [Oracle Fusion Cloud HCM API documentation](https://docs.oracle.com/en/cloud/saas/human-resources/23c/farws/rest-endpoints.html) for a list of available endpoints. |
| **Method** | Select or map the HTTP method you want to use:  **GET**to retrieve information for an entry.  **POST**to create a new entry.  **PUT**to update/replace an existing entry.  **PATCH**to make a partial entry update.  **DELETE**to delete an entry. |
| **Headers** | Enter or map the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter or map the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/oracle-fusion-cloud-sales--action-flow-

# Oracle Fusion Cloud Sales (Action Flow)

With Oracle Fusion Cloud Sales modules in Celonis platform, you can watch, search for, create, retrieve, update, and delete records.

Expand all

[## Connecting Oracle Fusion Cloud Sales to Celonis platform](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_section-idm4581606203940833786708201734_body)

To establish the connection, you must enter your Oracle Cloud service server name and login credentials. This information can be found in the Oracle Cloud service welcome email sent to your Oracle Cloud service administrator.

1. Log in to your Celonis platform account, add an Oracle Fusion Cloud Sales module to your Action Flow, and click **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. In the **Server Name** field, enter the URL of your Oracle Cloud service. For example, `servername.fa.us2.oraclecloud.com`.
4. In the **Username** and **Password** fields, enter your Oracle Cloud service login credentials. Your account must have the necessary user permissions to be able to access the relevant records in Celonis platform.
5. Set the connection's **Scope** by selecting the relevant record types.

   Note: If you receive a `data.collection is too big` error, limit the **Scope** selection to specific record types.
6. Click **Save**.

You have successfully established the connection. You can now edit your Action Flow and add more Oracle Fusion Cloud Sales modules.

**Caution**

The connection may take up to 5 minutes to establish. Please leave the connection window open until the connection is successful.

[## Available Records](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_UUID-525887cb-9c05-1e88-bc35-47802ab888bb_body)

[### Watch Records](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_section-idm1953380578416312_body)

Triggers when records are created.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to watch for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to watch for. |
| **Record Type** | Select the record type to watch for. If no record types are shown, you do not have the user rights for the record type category selected above.  The selected record type must contain a 'datetime' parameter. If it does not, you will receive an error prompting you to choose a different record type. |
| **Parent ID** | Enter the parent ID or `@context.key` value of the records you want to watch for.  Different record types use different parameters as ID. |
| **Date Field** | Select which of the record's date fields will trigger the module. It must be type: `datetime`. |
| **Label Field** | Select the label to show when configuring **Choose where to start** > **Choose manually** in the module setup. |
| **Fields** | Select the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

[### Search Records](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_section-idm1953380579411358_body)

Retrieves a list of records filtered by criteria.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to search for.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to search for. |
| **Record Type** | Select the record type to search for. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to search for. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Query Builder** | Select whether to use the **Builder** (filter by selecting from list) or **Custom** (enter a query string) method to specify filters. |
| **Filter** | Create filters to narrow down the search records returned. |
| **Query String** | Enter a query string according to the [Oracle Fusion Cloud documentation](https://docs.oracle.com/en/cloud/saas/sales/faaps/ManageCollections.html). |
| **Order By** | Map or enter the direction in which fields should be returned. |
| **Fields** | Select or map the record fields to be returned. To improve performance, limit the amount of fields selected. |
| **Effective Date** | Enter the effective date of the records to return. |
| **Limit** | Enter the maximum number of results to be worked with during one execution cycle. |

#### Troubleshooting

**Oracle search limitations**:

`[400] Bad Request. Failed to build ViewCriteria from expression...`

`[500] Internal Server Error.`

Due to Oracle limitations, certain record type categories cannot be searched for.

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Create a Record](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_section-idm4639006716902433786712002179_body)

Creates a new record.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to create.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to create. |
| **Record Type** | Select the record type to create. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to create. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information of the record you want to create into the fields that appear. The fields are dependent upon the selected **Record Type**. |

#### Troubleshooting

**Required fields:**

`[400] Bad Request. Provide a valid value for [input field].`

The input field displayed in the error message is required. Return to the module inputs, enter a value into the required field, and run the module again.

[### Get a Record](#id610985_body)

Retrieves the details of a record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to retrieve details of.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to retrieve. |
| **Record Type** | Select the record type to retrieve details of. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the records you want to retrieve details of. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Expand** | Enter the name of a child record to include the details of.  To specify multiple child record types, use a `,` as a separator. For example: `Employees,Localizations`.  To specify nested child records types, use the format `Child.NestedChild`. For example: `Employees.Managers`. If a nested child is provided, the relevant child will be processed implicitly - Employees.Managers is the same as Employees,Employees.Managers. |

[### Update a Record](#id611041_body)

Updates a record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to update.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to update. |
| **Record Type** | Select the record type to update. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to update. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **Record Details** | Enter or map the information you want to update in the fields that appear. The fields are dependent upon the selected **Record Type**. |

[### Delete a Record](#id611092_body)

Deletes a record by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **Record Type Category** | Select the category of the record type to delete.  Available record types and categories are based on the scopes selected when creating the connection and your Oracle user rights at that time. If your user rights change, go to your **Connections** page and click **Verify** next to your connection to update this list.  If you receive an error stating `This action is not supported in this category`, the selected record type category is not compatible with this module. Please choose a different record type category to delete. |
| **Record Type** | Select the record type to delete. If no record types are shown, you do not have the user rights for the record type category selected above. |
| **Parent ID** | Enter the parent ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |
| **ID** | Enter the ID of the record you want to delete. When mapping, use the `@context.key` value.  Different record types use different parameters as ID. |

[## Other fields](#UUID-d0275c8a-ae2e-b176-1880-3c92203fcc67_UUID-962609ad-71af-ebb7-95bf-0591ad1b82fe_body)

[### Make an API Call](#id611138_body)

Performs an arbitrary authorized API Call.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Oracle Fusion Cloud Sales account. |
| **URL** | Enter a path relative to `https://<servername>/`. For example: `/fscmRestApi/resources/11.13.18.05/invoices`.  For a list of available endpoints, refer to the [Oracle Fusion Cloud Sales API documentation](https://docs.oracle.com/en/cloud/saas/sales/faaps/rest-endpoints.html). |
| **Method** | Select or map the HTTP method you want to use:  **GET**to retrieve information for an entry.  **POST**to create a new entry.  **PUT**to update/replace an existing entry.  **PATCH**to make a partial entry update.  **DELETE**to delete an entry. |
| **Headers** | Enter or map the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter or map the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/outreach--action-flow-

# Outreach (Action Flow)

With Outreach modules in Celonis platform, you can create and manage all your accounts, prospects, and sequences in your Outreach account.

To get started with Outreach, create an account at [outreach.io](https://www.outreach.io/).

For the list of available endpoints, refer to the [Outreach API documentation](https://api.outreach.io/api/v2/docs).

Expand all

[## Connecting Outreach to Celonis platform](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f_body)

1. Log in to your Celonis platform account, add an Outreach module to your Action Flow, and click **Create a connection**.

   Note: If you add a module with an `instant` tag, click **Create a webhook**, then **Create a connection**.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Switch on the **Show advanced settings** toggle and enter your custom app client credentials. For more information, refer to [Outreach custom apps documentation](https://support.outreach.io/hc/en-us/articles/9986965571867-How-to-Access-Outreach-APIs).

   If requested, use the following Redirect URI when creating your custom app:

   `https://www.integromat.com/oauth/cb/outreach`

   `https://auth.redirect.celonis.cloud/oauth/cb/outreach`.
4. Click **Save**.
5. If prompted, authenticate your account and confirm access.

You have successfully established the connection. You can now edit your Action Flow and add more Outreach modules.

[## Build Outreach Action Flows](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-01b7e8bd-50c5-4fb7-6ac6-6342b0aee4f4_body)

After connecting the app, you can perform the following actions:

[## Triggers](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-a0b072bf-8e9c-a41b-aead-4f52b6ae1c0e_body)

**Note**

This app uses [webhooks](webhooks--action-flow-.html "Webhooks (Action Flow)") to trigger a Action Flow when an event occurs instantly. All webhook modules have an `instant` tag next to their name.

When you create an Outreach webhook in Celonis platform, it is attached automatically and requires no additional set up.

[### Watch Resources](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4477627847880034109614351019_body)

Triggers if any resource is created, updated, or deleted.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Webhook name** | Insert the name of a webhook. |
| **Resource** | Select the resource you want to watch. |
| **Event** | Select the action for resources you want to watch. |

[### Watch Calls](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4673353111297634109614962021_body)

Triggers when a new call is created, updated, or deleted.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Webhook name** | Insert the name of a webhook. |
| **Event** | Select the action for resources you want to watch. |

[### Watch Emails](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4638279778214434109620340678_body)

Triggers when an email is created, updated, deleted, bounced, delivered, opened, or replied to.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Webhook name** | Insert the name of a webhook. |
| **Event** | Select the action for resources you want to watch. |

[### Watch Tasks](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4673353212902434109620754146_body)

Triggers when a task is created, updated, destroyed, or completed.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Webhook name** | Insert the name of a webhook. |
| **Event** | Select the action for resources you want to watch. |

[## Accounts](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-272c7ab4-f9c4-16ea-ef4f-c12f4af438ec_body)

You can create, update, list, and get accounts with the following modules.

[### Search Accounts](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4526981787665634048174502715_body)

Lists accounts with filters.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Filter by field** | Set a condition for a filter that you can use to get only needed accounts. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Set the maximum number of accounts Celonis platform will return during one execution cycle. |

[### Get an Account](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4597782247553634048174956668_body)

Retrieves a specific account by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Account ID** | Specify the ID of the account that you want to retrieve. Click **Search** to filter accounts. |

[### Create an Account](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4526979728684834048189093515_body)

Creates a new account.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Name** | Enter the name for the account. |
| **Buyer Intent Score** | Enter a custom score given to measure the quality of the account. |
| **Company Type** | Enter a description of the company’s type. For example, `Public Company`. |
| **Custom Fields** | Add any custom fields. |
| **Custom ID** | Enter a custom ID for the account, often referencing an ID in an external system. |
| **Description** | Enter a description of the account. |
| **Domain** | Enter the company’s website domain. For example,`www.acme.com`. |
| **Followers** | Enter the number of followers the company has listed on social media. |
| **Founded at** | Enter the founding date of the company. |
| **Industry** | Enter a description of the company’s industry. For example, `Manufacturing`. |
| **LinkedIn Employees** | Enter the number of employees listed on the company’s LinkedIn URL. |
| **LinkedIn URL** | Enter the LinkedIn URL. |
| **Locality** | Enter the company’s primary geographic region. For example, `Eastern USA`. |
| **Named** | Select whether this is a 'named' account or not. Only named accounts will show up on the collection index. |
| **Natural Name** | Enter the natural name of the company. For example, `Acme`. |
| **Number of Employees** | Enter the number of employees. |
| **Tags** | Add any tags. |
| **Website URL** | Enter the company’s website URL. For example, `https://www.acme.com/contact`. |
| **Owner** | Enter or select the owner of the account. |

[### Update an Account](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4622937012960034048189818058_body)

Updates an account specified by ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Account ID** | Enter or select the ID of the account you want to update. |
| **Name** | Enter a name for the account. |
| **Buyer Intent Score** | Enter a custom score given to measure the quality of the account. |
| **Company Type** | Enter a description of the company’s type. For example, `Public Company`. |
| **Custom Fields** | Add any custom fields. |
| **Custom ID** | Enter a custom ID for the account, often referencing an ID in an external system. |
| **Description** | Enter a description of the account. |
| **Domain** | Enter the company’s website domain. For example,`www.acme.com`. |
| **Followers** | Enter the number of followers the company has listed on social media. |
| **Founded at** | Enter the founding date of the company. |
| **Industry** | Enter a description of the company’s industry. For example, `Manufacturing`. |
| **LinkedIn Employees** | Enter the number of employees listed on the company’s LinkedIn URL. |
| **LinkedIn URL** | Enter the LinkedIn URL. |
| **Locality** | Enter the company’s primary geographic region. For example, `Eastern USA`. |
| **Named** | Select whether this is a 'named' account or not. Only named accounts will show up on the collection index. |
| **Natural Name** | Enter the natural name of the company. For example, `Acme`. |
| **Number of Employees** | Enter the number of employees. |
| **Tags** | Add any tags. |
| **Website URL** | Enter the company’s website URL. For example, `https://www.acme.com/contact`. |
| **Owner** | Enter or select the owner of the account. |

[## Opportunities](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-8c32b70d-2395-f3e5-e964-aea8a1818464_body)

You can create, update, list, and get opportunities with the following modules.

[### Search Opportunities](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4622936955140834048201132969_body)

List opportunities with filters.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Filter by field** | Set a condition for a filter that you can use to get only needed opportunities. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Set the maximum number of opportunities  will return during one execution cycle. |

[### Get an Opportunity](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm466611132798403404820153971_body)

Retrieves a specific opportunity by its ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Opportunity ID** | Specify the ID of the opportunity that you want to retrieve. Click **Search** to filter opportunities. |

[### Create an Opportunity](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4482671091040034048201810881_body)

Creates a new opportunity.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Name** | Enter a name for the opportunity. |
| **Close Date** | The projected close date for the opportunity. |
| **Amount** | The estimated value of the opportunity. |
| **Currency Type** | Specify the currency type. |
| **Description** | Enter a description of the opportunity. |
| **External Created At** | Enter the date the opportunity was created. |
| **Map Link** | Enter the link to the MAP (Mutual Action Plan) for this opportunity. |
| **Map Next Steps** | Map the next steps for the opportunity. |
| **Map Status** | Map the status of the opportunity. Status shows associations with meetings, tasks, sequences, CRM sync. |
| **Next Step** | Add any next step. |
| **Opportunity Type** | Specify the type of the opportunity. |
| **Probability** | Specify the probability percent. |
| **Prospecting Rep ID** | Enter the ID of the sales rep that prospects the opportunity. |
| **Sharing Team ID** | Enter the ID of the sharing team associated with the opportunity. |
| **Tags** | Add any tags. |
| **Custom Fields** | Add any custom fields. |

[### Update an Opportunity](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4622933339784034048202200695_body)

Updates the selected opportunity.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Opportunity ID** | Specify the ID of the opportunity that you want to update. |
| **Name** | Enter a name for the opportunity. |
| **Close Date** | The projected close date for the opportunity |
| **Amount** | The estimated value of the opportunity. |
| **Currency Type** | Specify the currency type. |
| **Description** | Enter a description of the opportunity. |
| **External Created At** | Enter the date the opportunity was created. |
| **Map Link** | Enter the link to the MAP (Mutual Action Plan) for this opportunity. |
| **Map Next Steps** | Map the next steps for the opportunity. |
| **Map Status** | Map the status of the opportunity. Status shows associations with meetings, tasks, sequences, CRM sync. |
| **Next Step** | Add any next step. |
| **Opportunity Type** | Specify the type of the opportunity. |
| **Probability** | Specify the probability percent. |
| **Prospecting Rep ID** | Enter the ID of the sales rep that prospects the opportunity. |
| **Sharing Team ID** | Enter the ID of the sharing team associated with the opportunity. |
| **Tags** | Add any tags. |
| **Custom Fields** | Add any custom fields. |

[## Prospects](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-ecfe0b6d-e380-639e-2df6-8cc9a374300d_body)

You can create, update, and list prospects with the following modules.

[### Search Prospects](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4555347769076833445800814714_body)

Lists prospects with filters.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Filter by field** | Set a condition for a filter that you can use to get only needed prospects. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Set the maximum number of prospects Celonis platform will return during one execution cycle. |

[### Get a Prospect](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4666111077040034048211286199_body)

Retrieves a specific prospect by its ID.

|  |  |
| --- | --- |
| **Connection** | Establish a connection to your Outreach account. |
| **Prospect ID** | Specify the ID of the prospect that you want to retrieve. Click **Search** to filter prospects. |

[### Create a Prospect](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4621552497528034048212666039_body)

Creates a new prospect.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **First Name** | The first name of the prospect. |
| **Last Name** | The last name of the prospect. |
| **Emails** | A list of email addresses associated with the prospect. |
| **Company** | The name of the company the prospect works at. If associated with an account, this is the name of the account. (e.g. `Acme International`). |
| **Title** | The title of the prospect. |
| **Timezone** | The prospect’s current timezone. |
| **Tags** | A list of tag values associated with the account (e.g. ["`Interested`", "`2017 Expo`"]). |
| **Account** | The prospect's associated account. |
| **Owner** | The owner of the prospect. |
| **Added at** | The date and time the prospect was added to any system. |
| **City** | The prospect’s city (e.g. "`Seattle`"). |
| **Country** | The prospect’s country (e.g. "`USA`"). |
| **State** | The prospect’s state (e.g. "`Washington`"). |
| **Street** | The prospect’s street address (e.g. "`1441 N 34th St`"). |
| **Street 2** | The prospect’s second street address, if applicable. |
| **ZIP** | The prospect’s postal code (e.g. "`98103`"). |
| **AngelList URL** | The prospect’s AngelList URL. |
| **Available at** | The date and time the prospect is available to contact again. |
| **Calls Opt Status** | Whether the prospect is opted out of calling or general if granular opt-out is not enabled. |
| **Campaign Name** | The name of the campaign the prospect is associated with. |
| **Company Followers** | The prospect’s company Followers. |
| **Company Founded at** | Year in which was the prospect’s company founded. |
| **Company Industry** | Industry in which the prospect’s company operates. |
| **Company LinkedIn** | The company LinkedIn. |
| **Company LinkedIn Employees** | The prospect’s company LinkedIn Employees. |
| **Company Locality** | The company's locality. |
| **Company Size** | The size of the prospect’s company. |
| **Company Type** | A description of the company’s type (e.g. 'Public Company'). |
| **Custom Fields** | A list of custom fields. |
| **Date of Birth** | The date the prospect was born. |
| **Degree** | The degree(s) the prospect has received. |
| **Emails Opt Status** | Represents whether a prospect has opted into or out of emails. |
| **Event Name** | The name of the event the prospect was met at. |
| **External ID** | A custom ID for the prospect, often referencing an ID in an external system. |
| **External Owner** | A custom owner for the prospect, often referencing an owner in an external system. |
| **Facebook URL** | The prospect’s Facebook URL. |
| **Gender** | The gender of the prospect. |
| **GitHub URL** | The prospect’s GitHub URL. |
| **GitHub Username** | The prospect’s GitHub username. |
| **Google Plus URL** | The prospect’s Google+ URL. |
| **Graduation Date** | The graduation date of the prospect. |
| **Home Phones** | A list of home phone numbers associated with the prospect. |
| **Job Start Date** | The starting date of the prospect’s current job. |
| **LinkedIn Connections** | The number of connections on the prospect’s LinkedIn profile. |
| **LinkedIn ID** | The prospect’s LinkedIn ID. |
| **LinkedIn URL** | The prospect’s LinkedIn URL. |
| **Middle Name** | The middle name of the prospect. |
| **Mobile Phones** | A list of mobile phone numbers associated with the prospect. |
| **Nickname** | The nickname of the prospect. |
| **Occupation** | The occupation of the prospect (e.g. 'Purchasing Manager'). |
| **Opted out** | Represents whether this prospect is currently opted out of all mailings. Set this value to true to opt out the prospect; the `opted_out` timestamp will be updated to the time of the request. Set this value to false to revert the opt at and clear the opted-out timestamp. |
| **Other Phones** | A list of other phone numbers associated with the prospect. |
| **Personal Note 1** | A custom note field related to the prospect. |
| **Personal Note 2** | A second note field related to the prospect. |
| **Preferred Contact** | The preferred contact method for the prospect. |
| **Quora URL** | The prospect’s Quora URL. |
| **Region** | The primary geographic region of the prospect. |
| **School** | The school(s) the prospect has attended. |
| **Score** | A custom score is given to measure the quality of the lead. |
| **SMS Opt Status** | Select the prospect's SMS to opt status. |
| **Source** | A custom source representing where the lead was first acquired. |
| **Specialties** | A description of the prospect’s specialties. |
| **StackOverflow ID** | The prospect’s StackOverflow ID. |
| **StackOverflow URL** | The prospect’s StackOverflow URL. |
| **Trashed at** | The date a prospect was soft deleted. |
| **Twitter URL** | The prospect’s Twitter URL. |
| **Twitter Username** | The prospect’s Twitter username. |
| **VoIP Phones** | A list of VoIP phone numbers associated with the prospect. |
| **Work Phones** | A list of work phone numbers associated with the prospect. |
| **Website URL 1** | The URL of the prospect’s website. |
| **Website URL 2** | The value of the prospect’s second website URL field. |
| **Website URL 3** | The value of the prospect’s third website URL field. |

[### Update a Prospect](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm458353072132803404821282503_body)

Updates a prospect specified by ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Prospect ID** | ID of the prospect you want to update. |
| **First Name** | The first name of the prospect. |
| **Last Name** | The last name of the prospect. |
| **Emails** | A list of email addresses associated with the prospect. |
| **Company** | The name of the company the prospect works at. If associated with an account, this is the name of the account. (e.g. `Acme International`). |
| **Title** | The title of the prospect. |
| **Timezone** | The prospect’s current timezone. |
| **Tags** | A list of tag values associated with the account (e.g. ["`Interested`", "`2017 Expo`"]). |
| **Account** | The prospect's associated account. |
| **Owner** | The owner of the prospect. |
| **Added at** | The date and time the prospect was added to any system. |
| **City** | The prospect’s city (e.g. "`Seattle`"). |
| **Country** | The prospect’s country (e.g. "`USA`"). |
| **State** | The prospect’s state (e.g. "`Washington`"). |
| **Street** | The prospect’s street address (e.g. "`1441 N 34th St`"). |
| **Street 2** | The prospect’s second street address, if applicable. |
| **ZIP** | The prospect’s postal code (e.g. "`98103`"). |
| **AngelList URL** | The prospect’s AngelList URL. |
| **Available at** | The date and time the prospect is available to contact again. |
| **Calls Opt Status** | Select whether the prospect is opted out of calling, or opted out in general if granular opt-out is not enabled. |
| **Campaign Name** | The name of the campaign the prospect is associated with. |
| **Company Followers** | The prospect’s company Followers. |
| **Company Founded at** | Year in which was the prospect’s company founded. |
| **Company Industry** | Industry in which the prospect’s company operates. |
| **Company LinkedIn** | The company LinkedIn. |
| **Company LinkedIn Employees** | The prospect’s company LinkedIn Employees. |
| **Company Locality** | The company's locality. |
| **Company Size** | The size of the prospect’s company. |
| **Company Type** | A description of the company’s type (e.g. 'Public Company'). |
| **Custom Fields** | A list of custom fields. |
| **Date of Birth** | The date the prospect was born. |
| **Degree** | The degree(s) the prospect has received. |
| **Emails Opt Status** | Represents whether a prospect has opted into or out of emails. |
| **Event Name** | The name of the event the prospect was met at. |
| **External ID** | A custom ID for the prospect, often referencing an ID in an external system. |
| **External Owner** | A custom owner for the prospect, often referencing an ownering in an external system. |
| **Facebook URL** | The prospect’s Facebook URL. |
| **Gender** | The gender of the prospect. |
| **Github URL** | The prospect’s GitHub URL. |
| **Github Username** | The prospect’s GitHub username. |
| **Google Plus URL** | The prospect’s Google+ URL. |
| **Graduation Date** | The graduation date of the prospect. |
| **Home Phones** | A list of home phone numbers associated with the prospect. |
| **Job Start Date** | The starting date of the prospect’s current job. |
| **LinkedIn Connections** | The number of connections on the prospect’s LinkedIn profile. |
| **LinkedIn ID** | The prospect’s LinkedIn ID. |
| **LinkedIn URL** | The prospect’s LinkedIn URL. |
| **Middle Name** | The middle name of the prospect. |
| **Mobile Phones** | A list of mobile phone numbers associated with the prospect. |
| **Nickname** | The nickname of the prospect. |
| **Occupation** | The occupation of the prospect (e.g. 'Purchasing Manager'). |
| **Opted out** | Represents whether this prospect is currently opted out of all mailings. Set this value to true to opt out the prospect; the `opted_out` timestamp will be updated to the time of the request. Set this value to false to revert the opt at and clear the opted-out timestamp. |
| **Other Phones** | A list of other phone numbers associated with the prospect. |
| **Personal Note 1** | A custom note field related to the prospect. |
| **Personal Note 2** | A second note field related to the prospect. |
| **Preferred Contact** | The preferred contact method for the prospect. |
| **Quora URL** | The prospect’s Quora URL. |
| **Region** | The primary geographic region of the prospect. |
| **School** | The school(s) the prospect has attended. |
| **Score** | A custom score given to measure the quality of the lead. |
| **SMS Opt Status** | Select the prospect's SMS opt status. |
| **Source** | A custom source representing where the lead was first acquired. |
| **Specialties** | A description of the prospect’s specialties. |
| **StackOverflow ID** | The prospect’s StackOverflow ID. |
| **StackOverflow URL** | The prospect’s StackOverflow URL. |
| **Trashed at** | The date a prospect was soft deleted. |
| **Twitter URL** | The prospect’s Twitter URL. |
| **Twitter Username** | The prospect’s Twitter username. |
| **VoIP Phones** | A list of VoIP phone numbers associated with the prospect. |
| **Work Phones** | A list of work phone numbers associated with the prospect. |
| **Website URL 1** | The URL of the prospect’s website. |
| **Website URL 2** | The value of the prospect’s second website URL field. |
| **Website URL 3** | The value of the prospect’s third website URL field. |

[## Sequences](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-9501fa25-4afa-daee-b8bd-8e11942f1884_body)

You can list sequences, and steps of sequences, and add prospects to sequences with the following modules.

[### Search Sequences](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm183313001332938_body)

Lists sequences with filters.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Filter by field** | Set a condition for a filter that you can use to get only needed sequences. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Enter the maximum number of sequences Celonis platform returns during one Action Flow execution cycle. |

[### Search Steps of a Sequence](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm183313001412560_body)

Gets all steps of a sequence specified by ID.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Sequence ID** | The ID of the sequence you want to list steps for. |
| **Filter by field** | Set a condition for a filter that you can use to get only needed sequences. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Enter the maximum number of steps Celonis platform returns during one Action Flow execution cycle. |

[### Add a Prospect to a Sequence](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm183313001669074_body)

Adds a prospect to a sequence.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Prospect ID** | The ID of the prospect you want to add. |
| **Sequence ID** | The ID of the sequence you want to add a prospect. |
| **Mailbox ID** | The ID of the user's mailbox. |

[## Templates](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-1ebb3474-d47a-146b-0df3-47fb6fc8ad06_body)

You can create, update, and destroy templates with the following modules.

[### Create a Template](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4555347804048033445810401261_body)

Creates a new template.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Name** | The name of the template. |
| **Subject** | The subject line for the email to be sent. |
| **Body HTML** | The body HTML of the template. |
| **CC Recipients** | A list of default person and email address pairs to receive this template in the **CC** field. |
| **BCC Recipients** | A list of default person and email address pairs to receive this template in the **BCC** field. |
| **To Recipients** | A list of default person and email address pairs to receive this template in the **To** field. |
| **Tags** | Enter the tags applicable for the template separated by a comma. |
| **Share Type** | Select or map the sharing type for the template. For example, `private`. |
| **Track Links** | Select whether link tracking is on for the template. |
| **Track Opens** | Select whether open tracking is on for the template. |
| **Archived** | Select whether the template is archived. |

[### Update a Template](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4517247521326433445810692914_body)

Updates the selected template.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Template ID** | Select or map the Template ID whose details you want to update. |
| **Name** | Enter a new name for the template. |
| **Subject** | Enter the subject line for the email to be sent. |
| **Body HTML** | Enter the body HTML of the template. |
| **CC Recipients** | A list of default person and email address pairs to receive this template in the **CC** field. |
| **BCC Recipients** | A list of default person and email address pairs to receive this template in the **BCC** field. |
| **To Recipients** | A list of default person and email address pairs to receive this template in the **To** field. |
| **Tags** | Enter the tags applicable for the template separated by a comma. |
| **Share Type** | Select or map the sharing type for the template. For example, `private`. |
| **Track Links** | Select whether link tracking is on for the template. |
| **Track Opens** | Select whether open tracking is on for the template. |
| **Archived** | Select whether the template is archived. |

[### Delete a Template](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4590673999324833445814136023_body)

Destroys the selected template.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **Template ID** | Select or map the Template ID you want to destroy. |

[## Users](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d649b26-5213-3334-78c6-c58a740397b7_body)

You can list users with the following module.

[### Search Users](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4482671100737634048226284432_body)

LIsts users with filters

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account.](https://www.make.com/en/help/apps/crm-and-sales-tools/outreach#connecting-outreach-to-make) |
| **Filter by field** | Set a condition for a filter that you can use to get only needed users. |
| **Sort by field** | Define the field and the order in which the module will sort data. |
| **Limit** | Enter the maximum number of users Celonis platform returns during one Action Flow execution cycle. |

[## Other fields](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-6bb3ce0f-5489-c345-e062-8dc81004c0ad_body)

You call APIs with the following module.

[### Make an API Call](#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_section-idm4550940893328033045135529549_body)

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Outreach account](outreach--action-flow-.html#UUID-6750f1c7-4da2-a035-de5d-f7540c8fc94f_UUID-5d2cb383-3298-67fd-5a2b-cae40aa4e45f "Connecting Outreach to Celonis platform"). |
| **URL** | Enter a path relative to `https://api.outreach.io/api`. For example, `/v2/sequences`. |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry.  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we already did that for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/pardot--action-flow-

# Pardot (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

The Pardot modules enable you to search, create or update prospects in your Pardot account.

Expand all

[## Before you begin](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_getting-started-with-pardot_body)

Before connecting Pardot, you need the following:

- A Pardot account — you can request a quote at [www.pardot.com](https://www.pardot.com/about-pardot/contact-us/).

[## Connecting Pardot to Celonis platform](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG_body)

To connect your Pardot account to Celonis platform , open the *Create a connection dialog,* fill in the following fields, and click *Continue*:

|  |  |
| --- | --- |
| **Connection name** | Enter the name for the connection. |
| **Account Type** | Select the type of account you want to use. |
| **Version** | Select the version. We recommend version 4. Version 3 is intended for advanced users using the *Make an API Call* module to work with the older version. |
| **Pardot Business ID** | Go to *Setup* > *Pardot* > *Pardot Account Setup* to obtain the *Business ID*. |

The connection has been established. You can proceed with setting up the module.

[## Prospects](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_prospects_body)

[### Search Prospects](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_search-prospects_body)

Returns the prospects matching the specified criteria parameters.

(*Reference: [Pardot API Documentation](https://developer.salesforce.com/docs/marketing/pardot/overview)*)

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Pardot account](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG "Connecting Pardot to Celonis platform"). |
| **Assigned** | Select prospects based on whether they are assigned. |
| **Assigned to User** | Select prospects based on whether they are assigned to a specified user. Users can be specified by their email address or their Pardot IDs. Note: Using `Assigned to User` overrides the `Assigned` field. |
| **List ID** | Select prospects based on their membership of the email list. |
| **Created After** | Filter prospects that were created after the specified time. If a `Custom Time` is used, enter the date and time in the *Created After Custom Time* field below. |
| **Created Before** | Filter prospects that were created before the specified time. If a `Custom Time` is used, enter the date and time in the *Created Before Custom Time* field below. |
| **Updated After** | Filter prospects that were last updated after the specified time. If a `Custom Time` is used, enter the date and time in the *Updated After Custom Time* field below. |
| **Updated Before** | Filter prospects that were last updated before the specified time. Filter prospects that were last updated after the specified time. If a `Custom Time` is used, enter the date and time in the *Updated Before Custom Time* field below. |
| **Deleted** | Filter prospects based on whether they have been deleted. |
| **Grade Equal to** | Filter prospects that have a grade equal to the specified grade. |
| **Grade Greater Than** | Filter prospects that have a grade greater than the specified grade. |
| **Grade Less Than** | Filter prospects that have a grade less than the specified grade. |
| ****ID Greater Than**** | Filter prospects with IDs greater than the specified integer. |
| ****ID Less Than**** | Filter prospects with IDs less than the specified integer. |
| ******Is Starred****** | Filter prospects based on whether they are starred. |
| ****Last Activity Before**** | Filter prospects that have been active before the specified time. If a `Custom Time` is used, enter the date and time in the *Last Activity Before Custom Time* field below. Prospects are considered active if a prospect's `last_activity_at` is before the specified time. See [Prospect](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html#prospect) in [Object Field References](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html). |
| ****Last Activity After**** | Filter prospects that have been active after the specified time. If a `Custom Time` is used, enter the date and time in the *Last Activity After Custom Time* field below. |
| ****Last Activity Never**** | Filter prospects that have never been active. Prospects are considered active if a prospect's `last_activity_at` is null. See [Prospect](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html#prospect) in [Object Field References](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html). |
| ****Limit Related Records**** | If disabled or not specified the system will return all the available visitor records for the requested prospect, but the operation may timeout if there are too many related records. |
| ****New**** | Filter prospects based on whether they are classified as new. Prospects are considered new if they have not been assigned to a user or a queue, have not been marked as reviewed, and have a `last_activity_at` timestamp specified. See [Prospect](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html#prospect) in [Object Field References](https://developer.salesforce.com/docs/marketing/pardot/guide/object-field-reference.html). Note: Using the new criteria overrides the `Assigned`, `Assigned to user`, `Last Activity at`, and `Last Activity Before` criteria if specified. |
| ****Score Equal to**** | Filter prospects that have a score equal to a specified integer. |
| ****Score Greater Than**** | Filter prospects that have a score greater than a specified integer. |
| ****Score Less Than**** | Filter prospects that have a score less than a specified integer |
| ****Output**** | Select the format to be used when returning the results. |
| ****Sort by**** | Specify the field that should be used to sort the results of the query. |
| ****Sort Order**** | Specify the ordering to be used when sorting the results of the query. |
| ****Limit**** | Set the maximum number of prospects Celonis platform will return during one execution cycle. |

[### Create a Prospect](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F33CNWTHEYANTZ6BC4KA7XVK_body)

Creates a new prospect.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Pardot account](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG "Connecting Pardot to Celonis platform"). |
| **Email Address** | Enter the prospect's email address. |
| **First Name** | Enter the prospect's first name. |
| **Last Name** | Enter the prospect's last name. |
| **Password** | Enter the prospect's password. |
| **Company** | Enter the prospect's company. |
| **Prospect Account ID** | Don't use if CRM is connected. |
| **Website** | Enter the prospect's website URL. |
| **Campaign ID** | Enter the Pardot ID of the campaign associated with this prospect. |
| **Notes** | Enter notes about this prospect.  **Note**: Available for export. |
| **Score** | Enter the prospect's score. |
| **Job Title** | Enter the prospect's job title. |
| **Department** | Enter the prospect's department. |
| **Country** | Enter the prospect's country. |
| **Address One** | Enter the prospect's address, line 1. |
| **Address Two** | Enter the prospect's address, line 2. |
| **City** | Enter the prospect's city. |
| **State** | Enter the prospect's US state. |
| **Territory** | Enter the prospect's territory. |
| **ZIP Code** | Enter the prospect's postal code. |
| **Phone** | Enter the prospect's phone number. |
| **Fax** | Enter the prospect's fax number. |
| **Source** | Enter the prospect's source. |
| **Annual Revenue** | Enter the prospect's annual revenue. |
| **Employees** | Enter the prospect's number of employees. |
| **Industry** | Enter the prospect's industry. |
| **Do Not Email** | If enabled, the prospect prefers not to be emailed. |
| **Do Not Call** | If enabled, the prospect prefers not to be called. |
| **Years in Business** | Enter the prospect's number of years in business. |
| **Comments** | Comments about this prospect. |
| **Salutation** | Enter the prospect's formal prefix. |
| **Is Reviewed** | If enabled, the prospect has been reviewed. |
| **Is Starred** | If enabled, the prospect has been starred. |
| **Is Archived** | If enabled, the prospect has been archived. |
| **Custom Fields** | Fill in the desired custom fields. |

[### Update a Prospect](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_update-a-prospect_body)

Updates an existing prospect.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Pardot account](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG "Connecting Pardot to Celonis platform"). |
| **Prospect ID** | Select or enter (map) the ID of the prospect you want to update. |

Please find the descriptions of the fields in the [Create a prospect](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F33CNWTHEYANTZ6BC4KA7XVK "Create a Prospect") section.

[### Subscribe a Prospect to an Email List](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_subscribe-a-prospect-to-an-email-list_body)

Subscribes a prospect to the email list.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Pardot account](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG "Connecting Pardot to Celonis platform"). |
| **Prospect ID** | Select or enter (map) the ID of the prospect you want to subscribe to the email list. |
| **List ID** | Select or enter (map) the ID of the list you want to subscribe the prospect to. |

[### Make an API Call](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_make-an-api-call_body)

Allows you to perform a custom API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your Pardot account](pardot--action-flow-.html#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_h_01F32X2N95ZDCHNWX21NK8AGNG "Connecting Pardot to Celonis platform"). |
| **URL** | Enter a path relative to `https://pi.demo.pardot.com/api`. For example: `/prospect/version/4/do/query.`  For the list of available endpoints, refer to the [Pardot API Documentation](https://developer.salesforce.com/docs/marketing/pardot/overview). |
| **Method** | Select the HTTP method you want to use:  `GET`: to retrieve information for an entry.  `POST`: to create a new entry.  `PUT`: to update/replace an existing entry.  `PATCH`: to make a partial entry update.  `DELETE`: to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we added those for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[### Example of Use - List Prospects](#UUID-a9a56993-c0e0-4fc4-7926-dd07576c9e22_id_example-of-use---list-prospects_body)

The following API call returns the first 200 prospects (result sets are limited to 200 results each, to return other results please refer to the [Manipulating the result set](https://developer.salesforce.com/docs/marketing/pardot/guide/prospects-v3.html) documentation and set the query string accordingly) in your Pardot account:

URL: `/prospect/version/4/do/query`

Method: `GET`

The result can be found in the module's Output under **Bundle** > **Body** > **rsp** > **result** > **1** > **prospect**.

In our example, 200 prospects (not visible on the screenshot) were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/postgresql--action-flow-

# PostgreSQL (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

Expand all

[## Getting started with PostgreSQL](#UUID-67813721-659e-f812-9084-2444d8e60820_id_getting-started-with-postgresql_body)

The **PostgreSQL** modules let you execute your custom logic directly in your database server through functions. Celonis platform loads interface of input and output parameters dynamically so each parameter can be mapped individually.

### Functions

Here is a sample SQL statement that creates a function that just simply inserts the values passed in the three parameters into a table:

```
CREATE OR REPLACE FUNCTION insert_record_from_Celonis platform(_name character varying,_email character varying, _phone character varying)
RETURNS void
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO contacts (name, email, phone) VALUES (_name, _email, _phone);
END;
$BODY$;
```

To learn more about creating functions, see [PostgreSQL documentation](https://www.postgresql.org/docs/current/static/sql-createfunction.html).

[## Configuring your PostgreSQL server](#UUID-67813721-659e-f812-9084-2444d8e60820_id_configuring-your-mysql-server_body)

Make sure the account you're using to connect to your database has read access to 'information\_schema.routines' and 'information\_schema.parameters' tables.

Celonis platform will make connections to your database from specifc IP addresses. Our servers are set up with valid PTR records so you can easily restrict access by allowing `%.make.com`.

### Troubleshooting PostgreSQL

#### ER\_LOCK\_WAIT\_TIMEOUT: Lock wait timeout exceeded; try restarting transaction

This error occurs when you modify the same data using multiple modules. It is caused by SQL transactions.

When any SQL module is executed then it starts the transaction (1) and the transaction is finished after the Action Flow is fully executed.If another module tries to access the same data used in another unfinished transaction (1) then it has to wait until the previous transaction (1) is finished – but it never happens because the first transaction (1) will be finished after the Action Flow is finished.

**Solution**

Turn on *Auto-commit*. It finishes (commits) every transaction immediately after the module execution is done.

1. Open *Action Flow settings*.
2. Enable the *Auto commit* checkbox.
3. Confirm the settings dialog by clicking the *OK* button.

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/resolving-errors-in-action-flows

# Resolving errors in Action Flows

Your Action Flow automations might not always go the way you planned. When this happens, depending on the situation Celonis Platform shows you a warning or an error message.

Expand all

[## Errors in Action Flows](#UUID-1d97b17f-576c-5c74-9cf5-3e6475d4149b_section-id2352590171314_body)

Errors notify you that your Action Flow encountered an unexpected that can't be resolved automatically by an [error handler](using-error-handlers-in-action-flows.html "Using error handlers in Action Flows").

A module shows an error when it receives incorrect data from the previous modules or the module app. When you open your scenario in the scenario editor, Celonis highlights the module that outputs the error.

When there are consecutive Action Flow executions that end with an error, we disable further scheduling of the Action Flow. Disabling the Action Flow allows you to check the error and prevents consuming operations on scenario runs that finish with an error.

Common situations when a module generates an error include:

- Mapping a value to a required field in a module when the value is sometimes empty and causes missing required data.
- When you exhaust your resources in the third-party app. For example, when you can't store more data in the app.
- When the app is unavailable. For example, when the app is down for maintenance.
- When there is a change to your authentication or authorization in the app and you don't update your connection. For example, when your API key expires or when you change teams and lose access to some of the app features.

The best way to deal with errors in your Action Flow is to use an error handler. An error handler connects to a module with the error handling route. When the module generates an error, the error handling route activates and runs the error handler.

For more information, see [Error handlers](using-error-handlers-in-action-flows.html "Using error handlers in Action Flows")

### Error notifications

When an error can't be resolved by an error handler, Celonis sends you an email notification.

Celonis also sends out a notification when your scenario gets disabled because of repeated errors. You can change your email notifications by going to your user profile. See [Managing your user profile](managing-your-user-profile.html "Managing your user profile").

[## Warnings in Action Flows](#UUID-1d97b17f-576c-5c74-9cf5-3e6475d4149b_section-id235259026830144_body)

Warnings alert you about issues in your Action Flows which are less serious than error. When a module in an Action Flow returns a warning, your automation keeps running and stays enabled. I t's a good idea to check for the cause of the warning.

The situations when you get a warning include:

- When a module outputs an error, but you have enabled the **storing of incomplete executions** in the scenario settings.
- When you use up all of the capacity of a data store in your Action Flow.
- When the duration of the Action Flow run exceeds the time limit for your subscription.

## Related topics

- [Resolving incomplete executions in Action Flows](incomplete-executions.html "Incomplete executions")
- [Using error handlers in Action Flows](using-error-handlers-in-action-flows.html "Using error handlers in Action Flows")


---

## automation/action-flows/salesforce--action-flow-

# Salesforce (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With Salesforce modules in Celonis platform you can broadcast messages, create and modify records and jobs, and make API calls from your Salesforce account.

To use Salesforce modules, you must have a Salesforce account. If you do not have one, you can create one at [salesforce.com](https://www.salesforce.com/in/form/signup/freetrial-sales/?d=cta-jumbo-trial).

Refer to the [Salesforce API documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm) for a list of available endpoints.

Expand all

[## Connecting Salesforce to Celonis platform](#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm4555558386742433990427551118_body)

Note: Not all editions of Salesforce have API access. See [here](https://help.salesforce.com/articleView?id=000005140&type=1) for more information.

To establish the connection in Celonis platform:

1. Log in to your Celonis platform account, add a Salesforce module to your Action Flow, and click **Create a connection**.
2. Select a **Connection type**: **Salesforce** or **Salesforce (client credentials)**.
3. Optional: In the **Connection name** field, enter a name for the connection.
4. If your **Connection type** is **Salesforce**, select if you are using a Salesforce Sandbox environment and click **Save**.

   Optional: You can switch to **Advanced settings** to enter credentials for your custom application. To create a custom application for this connection type, [follow these steps](salesforce--action-flow-.html#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm234621401644403 "Creating a custom application in Salesforce for the Salesforce connection type").
5. If your **Connection type** is **Salesforce (client credentials)**, complete the following fields:

   - **Salesforce My Domain Name** - See the Salesforce Help and Training Community to determine this value
   - **Consumer Key**
   - **Consumer Secret**

   To obtain your Consumer Key and Consumer Secret, follow the steps in [Create a custom application in Salesforce](salesforce--action-flow-.html#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm45585847969168336365213199 "Creating a custom application in Salesforce for the Salesforce (client credentials) connection type") below.

You have successfully established the connection. You can now edit your Action Flow and add more Salesforce modules. If your connection needs reauthorization at any point, see [Managing Action Flows](managing-action-flows.html "Managing Action Flows").

[## Creating a custom application in Salesforce for the Salesforce (client credentials) connection type](#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm45585847969168336365213199_body)

1. Log in to your Salesforce account.
2. In the left sidebar of the **Setup Home** page, click  **Apps > App Manager**.
3. In the upper right, click **New Connected App**.
4. Click **Create a Connected App** > **Continue**.
5. On the **New Connected App** page, under **Basic Information**, fill in the mandatory fields:

   - Connected App Name
   - API Name
   - Contact Email

   Refer to [Salesforce documentation](https://help.salesforce.com/s/articleView?id=sf.connected_app_create_basics.htm&type=5) to learn more about basic settings.
6. Under **API (Enable OAuth Settings)**, click **Enable OAuth Settings**. Enter the following application details:

   |  |  |
   | --- | --- |
   | **Callback URL** | `https://auth.redirect.celonis.cloud/oauth/cb/salesforce` |
   | **Selected OAuth Scopes** | Choose the scopes you need and click **Add**.  Note: You will, at minimum, need the following scopes enabled:  - Manage user data via APIs (api) - Perform requests at any time (refresh\_token, offline\_access).  Once these scopes are selected, then the **Refresh Token Policy** can be set to **Refresh token is valid until revoked**. |
   | **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows** | Must be **OFF** |
   | **Require Secret for Web Server Flow** | **Optional**, but ON is more secure |
   | **Require Secret for Refresh Token Flow** | **Optional**, but ON is more secure |
   | **Enable Client Credentials Flow** | **Optional**, but OFF is more secure |
   | **Enable Authorization Code and Credentials Flow** | **Required** |
   | **Enable Token Exchange Flow** | Set up as **OFF** |
   | **Enable Refresh Token Rotation** | Set up as **OFF** |
   | **Issue JSON Web Token (JWT)-based access tokens for named users** | **Optional** |
   | **Introspect All Tokens** | Set up as **OFF** |
7. Click **Save**.
8. Enable the client credentials flow for your connected app:

   1. On the left sidebar, click **Apps** > **App Manager**.
   2. Find your connected app, click , and then select **Edit**.
   3. Under **API (Enable OAuth Settings)**, select **Enable Client Credentials Flow**.
   4. When you understand the security risks, accept the warning.
   5. Click **Save**.
9. Select an execution user for the flow:

   1. From the connected app detail page, click **Manage**.
   2. Click **Edit Policies**.
   3. Under **Client Credentials Flow**, for **Run As**, click , and find the user that you want to assign the client credentials flow. For Enterprise Edition orgs, select an execution user who has the API Only User permission.
   4. Click **Save**.
10. On the left sidebar, click **Apps** > **App Manager**, and find your new connected apps.
11. Click  > **View**. Under the **API (Enable OAuth Settings)** section, click **Manage Consumer Details**.
12. Copy your **Consumer key** and **Consumer Secret** values and store them in a safe place.

You will use these values in the **Consumer Key** and **Consumer Secret** fields in Celonis platform when adding the Salesforce (client credentials) connection type.

[## Creating a custom application in Salesforce for the Salesforce connection type](#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm234621401644403_body)

1. Log in to your Salesforce account.
2. In the left sidebar of the **Setup Home** page, click  **Apps > App Manager**.
3. In the upper right, click **New Connected App**.
4. Click **Create a Connected App** > **Continue**.
5. On the **New Connected App** page, under **Basic Information**, fill in the mandatory fields:

   - Connected App Name
   - API Name
   - Contact Email

   Refer to [Salesforce documentation](https://help.salesforce.com/s/articleView?id=sf.connected_app_create_basics.htm&type=5) to learn more about basic settings.
6. Under **API (Enable OAuth Settings)**, click **Enable OAuth Settings**. Enter the following application details:

   |  |  |
   | --- | --- |
   | **Callback URL** | `https://auth.redirect.celonis.cloud/oauth/cb/salesforce` |
   | **Selected OAuth Scopes** | Choose the scopes you need and click **Add**.  Note: You will, at minimum, need the following scopes enabled:  - Manage user data via APIs (api) - Perform requests at any time (refresh\_token, offline\_access).  Once these scopes are selected, then the **Refresh Token Policy** can be set to **Refresh token is valid until revoked**. |
   | **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows** | Must be **OFF** |
   | **Require Secret for Web Server Flow** | **Optional**, but ON is more secure |
   | **Require Secret for Refresh Token Flow** | **Optional**, but ON is more secure |
   | **Enable Client Credentials Flow** | **Optional**, but OFF is more secure |
   | **Enable Authorization Code and Credentials Flow** | **Required** |
   | **Enable Token Exchange Flow** | Set up as **OFF** |
   | **Enable Refresh Token Rotation** | Set up as **OFF** |
   | **Issue JSON Web Token (JWT)-based access tokens for named users** | **Optional** |
   | **Introspect All Tokens** | Set up as **OFF** |
7. Click **Save**.
8. On the **Manage Connected Apps** page that is displayed for your new app, under the **API (Enable OAuth Settings)** section, click **Manage Consumer Details**.
9. Copy your **Consumer key** and **Consumer Secret** values and store them in a safe place.

You will use these values in the **Consumer Key** and **Consumer Secret** fields in Celonis platform when connecting using advanced settings.

[## Building Salesforce Action Flows](#UUID-04c9116a-a867-b9db-494d-cf13a81c9203_section-idm4555558486905633990524312564_body)

After connecting the app, you can perform the following actions:

Record

- Watch Records
- Watch Record Fields
- Search Records (SOQL)
- Search Records (SOSL)
- Get a Record
- Create a Record
- Update a Record
- Upsert a Record
- Delete a Record

Bulk Job

- Watch Jobs
- List Jobs
- Create a Job
- Complete/Abort a Job

  Note: If you complete a job, Salesforce queues the job, uploads data for processing, and you can’t add any more job data. If you abort a job, the job does not get queued or processed.

Other

- Make an API Call

  For the URL, enter a path relative to `<Instance URL>/services/data`. For example: `/v51.0/query`. Refer to the [Salesforce API documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm) for a list of available endpoints.
- Make an API Call (Advanced)
- Post a Message to a Chatter Feed
- Download an Attachment/Document

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

## automation/action-flows/salesloft--action-flow-

# SalesLoft (Action Flow)

**Important**

Any references to third-party products or services do not constitute Celonis Product Documentation nor do they create any contractual obligations. This material is for informational purposes only and is subject to change without notice.

Celonis does not warrant the availability, accuracy, reliability, completeness, or usefulness of any information regarding the subject of third-party services or systems.

With the SalesLoft modules in Celonis platform, you can:

- search, retrieve cadences, and list steps in a cadence
- search, retrieve, create, and delete cadence memberships
- retrieve persons and call APIs

To get started with SalesLoft, create an account at [salesloft.com/request-a-quote](https://salesloft.com/request-a-quote/).

Expand all

[## Connecting SalesLoft to Celonis platform](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC_body)

To connect to SalesLoft app:

1. Log in to your Celonis platform, add a SalesLoft module Action Flow, and click the **Add** button next to the **Connection** field.
2. Optional: In the **Connection name** field, enter a name for the connection.
3. Optional: Click **Show Advanced Settings** and enter your custom application's Application ID into the **Client ID** field and Secret value into the **Client Secret** field. To generate these values, see [Creating App ID and Secret for Salesloft](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_UUID-32e566c9-317d-08c0-960f-ab84772cbc1a "Creating App ID and Secret for Salesloft").
4. Click **Save**.
5. Confirm the access by clicking **Authorize**.

You have successfully established the connection. You can now edit Make and add more SalesLoft modules. If your connection needs reauthorization, follow the connection renewal steps here.

[## Creating App ID and Secret for Salesloft](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_UUID-32e566c9-317d-08c0-960f-ab84772cbc1a_body)

You can create your own application and connect it to Celonis platform using the App ID and Secret values from the application.

1. Go to your [Salesloft OAuth applications](https://accounts.salesloft.com/oauth/applications) page.
2. Click **Create New** in the OAuth Applications section.

   |  |
   | --- |
   |  |
3. Enter a name for the app, in the **Redirect URI** paste:

   `https://auth.redirect.celonis.cloud/oauth/cb/salesloft`
4. Click **Save**.
5. Copy the **Application Id** and **Secret** values and store them in a safe place. You will use your **Application Id** in the connection **Client ID** field and **Secret** in the connection **Client Secret** field.

You now have the client credentials to connect to Celonis platform. You will use your **Application Id** in the connection **Client ID** field and **Secret** in the connection **Client Secret** field.

[## Cadences](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_UUID-22afed00-8814-62b5-7b65-70fad47921be_body)

Using the following modules, you can search, retrieve, and get steps of a cadence.

[### Search Cadences](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_search-cadences_body)

Retrieves cadences based on filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Name** | Enter the exact cadence name to filter returned cadences. |
| **Team Cadence** | Enable this option to return only team cadences. |
| **Shared** | Enable this option to return only shared cadences. |
| **Owned by GUID** | Select (or map) the owner's GUID to filter returned cadences. |
| **People Addable** | Select **Yes** to return cadences wherever possible to add people. |
| **Sort by** | Select whether to sort the key by **Created at** or **Updated at**. |
| **Sort Direction** | Select whether to return cadences in ascending or descending order. |
| **Filter** | Filter returned cadences by the **Updated at** field. You can filter by the date range using the **Add AND rule** button (). |
| **Limit** | Set the maximum number of cadences Celonis platform will return during one execution cycle. |

[### Get Steps in a Cadence](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_get-steps-in-a-cadence_body)

Retrieves steps from a specified cadence.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Cadence ID** | Select the cadence or enter (map) the cadence ID you want to retrieve the steps. |
| **Has Due Actions** | Enable this option to return only steps that have due action. |
| **Sort by** | Select whether to sort the key by **Created at** or **Updated at**. |
| **Sort Direction** | Select whether to return steps in ascending or descending order. |
| **Limit** | Select *Yes* option to return steps wherever possible to add people. |

[### Get a Cadence](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_get-a-cadence_body)

Retrieves cadence details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Cadence ID** | Select the cadence or enter (map) the cadence ID you want to retrieve details for. |

[## Cadence Membership](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_UUID-7becda5e-75ee-8b63-5fa5-21f67700eae9_body)

Using the following modules, you can search, retrieve, create and delete cadence memberships.

[### Search Cadence Memberships](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_search-cadence-memberships_body)

Retrieves cadence memberships based on filter settings.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Person ID** | Select the person or enter the ID of the person to return cadence memberships for. |
| **Cadence ID** | Select the cadence or enter (map) the cadence ID you want to retrieve cadence memberships for. |
| **Filter** | Filter returned cadence memberships by the **Updated at** field. You can use the *Add AND rule* button () to filter by the date range. |
| **Currently on a Cadence** | Select the Yes option to return only cadence memberships for people currently on cadences. Select the No option to return cadence memberships for people who have been removed from or have completed a cadence. |
| **Sort by** | Select whether to sort by *Created at* or *Updated at* fields*.* Default = *Updated at* . |
| **Sort Direction** | Select whether to return cadence memberships in ascending or descending order. |
| **Limit** | Set the maximum number of cadences Celonis platform will return during one execution cycle. |

[### Get a Cadence Membership](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_get-a-cadence-membership_body)

Retrieves cadence membership details.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Cadence Membership ID** | Select the cadence membership or enter (map) the cadence membership ID you want to retrieve details for. |

[### Create a Cadence Membership](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_section-idm4640408123435233373834787035_body)

Adds a person to a cadence.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Person ID** | Select the person or enter (map) the person ID you want to add to the cadence. |
| **Cadence ID** | Select the cadence or enter (map) the cadence ID to which you want to add the user to. |
| **User ID** | Select the user or enter (map) the user ID you want to add to the cadence. Can be set to any visible user on the authenticated team. A person cannot be added to a cadence on behalf of a teammate unless the cadence is a team cadence, or the cadence is owned by the teammate. |

[### Delete a Cadence Membership](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_section-idm4634203774867233373839064566_body)

Deletes a cadence membership.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| Cadence Membership ID | Select or map the Cadence Membership ID you want to delete. |

[## People](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_people_body)

You can retrieve a person's details using the following module.

[### Get a Person](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_get-a-person_body)

Retrieves details of the specified person.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **Person ID** | Select the person or enter (map) the person ID you want to retrieve details for. |

[## Other fields](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_section-idm4575888635459233373809273848_body)

You can call APIs using the following module.

### Make an API Call

Performs an arbitrary authorized API call.

|  |  |
| --- | --- |
| **Connection** | [Establish a connection to your SalesLoft account](salesloft--action-flow-.html#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_id_h_01F0ZN2TF4VAPQ9G7XD93HSQKC "Connecting SalesLoft to Celonis platform"). |
| **URL** | Enter a path relative to `https://api.salesloft.com`. For example, `/v2/cadences.json`.  For the list of available endpoints, refer to the  [SalesLoft API Documentation](https://developers.salesloft.com/api.html). |
| **Method** | Select the HTTP method you want to use:  **GET**  to retrieve information for an entry**.**  **POST**  to create a new entry.  **PUT**  to update/replace an existing entry.  **PATCH**  to make a partial entry update.  **DELETE**  to delete an entry. |
| **Headers** | Enter the desired request headers. You don't have to add authorization headers; we added those for you. |
| **Query String** | Enter the request query string. |
| **Body** | Enter the body content for your API call. |

[#### Example of Use - List Persons](#UUID-e305936e-ddcf-c004-8dc6-eea66caa05d0_section-idm4524798218785633373812136701_body)

The following API call returns the first page (limited to 25 persons) of all persons in your SalesLoft account:

**URL:** `/v2/people.json`

**Method:** **GET**

The results can be found in the module's Output under **Bundle > Body > data**.

In our example, the first 25 contacts were returned:

## Related topics

- [Managing Action Flows](managing-action-flows.html "Managing Action Flows")
- [Error handling](resolving-errors-in-action-flows.html "Resolving errors in Action Flows")
- [Access and permissions](controlling-access-and-permission-for-action-flows.html "Controlling access and permission for Action Flows")


---

