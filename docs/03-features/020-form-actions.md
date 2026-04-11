---
id: form-actions
title: Form Actions
---

## Explanation

In a typical SSR application, form submissions require a full page reload. With Form Actions, tramvai provides a mechanism similar to [Remix Actions](https://v2.remix.run/docs/route/action/) and [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions):

- **Without JavaScript** — the form submits as a standard HTML form, the server processes the request and either renders the page with the result or redirects the user
- **With JavaScript** — the `Form` component intercepts the submission, sends a `fetch` request, and handles the response (JSON data or SPA navigation) without a full page reload

This approach ensures that forms remain functional even when JavaScript fails to load, while providing the best user experience when it is available.

### How it works

The Form Actions system consists of three parts:

1. **`createFormAction`** — a factory function for creating server-side form handlers (based on [PAPI](03-features/017-papi.md))
2. **`Form`** — a React component that renders an HTML `<form>` with progressive enhancement
3. **`FormActionResultStore`** — a Redux store that holds the result of the last form action, used for server-side rendering without JavaScript

### Response types

A form action handler can return two types of results:

- **JSON result** — an object with arbitrary data that will be available through `FormActionResultStore` or via the `afterResponse` callback
- **Redirect** — a `FormActionRedirect` instance that triggers a redirect to another URL, optionally carrying data

### Scenarios

| Scenario | Without JS | With JS |
|----------|-----------|---------|
| GET form | Browser navigates to the URL from `action` with form data in query params | SPA navigation, Form Action handler is not involved |
| POST form → JSON result | Server renders the page with form action result in `FormActionResultStore` | `fetch` request, response handled via `afterResponse` callback |
| POST form → Redirect | HTTP 303 redirect, browser navigates to `Location` header URL | SPA navigation to the redirect URL |

### JS detection mechanism

When JavaScript is available, the `Form` component sends a `fetch` request with the `Accept: application/json` header. The server checks this header to determine whether to return JSON or render a full HTML page.

## Usage

### Prerequisites

Install `@tramvai/module-form-action`:

```bash
npx tramvai add @tramvai/module-form-action
```

Add `FormActionModule` to the application modules list:

```tsx
import { createApp } from '@tramvai/core';
import { FormActionModule } from '@tramvai/module-form-action';

createApp({
  name: 'my-app',
  modules: [
    // ...other modules
    FormActionModule,
  ],
});
```

### Creating a form action with File System Routing

If you use [File System Routing](03-features/07-routing/03-file-system-pages.md), create a `_formAction.ts` file next to the page component in the `routes/` directory. The default export should be the result of `createFormAction`:

```
src/
  routes/
    index.tsx           # page component
    _formAction.ts      # form action for "/"
    contacts/
      index.tsx         # page component
      _formAction.ts    # form action for "/contacts"
```

Example `_formAction.ts`:

```ts
import { createFormAction } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    return {
      message: 'Form submitted successfully',
      data: body,
    };
  },
});
```

The form action will be automatically registered at the same URL as the page. For example, a `_formAction.ts` in `routes/contacts/` will handle POST requests to `/contacts`.

:::info

File System form actions are only processed on the **server** side and are not included in the client bundle.

:::

### Creating a form action via DI provider

You can also register form actions manually using the `SERVER_MODULE_PAPI_FORM_ACTIONS` token. This is useful when you need a custom URL or want to use DI dependencies:

```tsx
import { provide, Scope } from '@tramvai/core';
import { SERVER_MODULE_PAPI_FORM_ACTIONS } from '@tramvai/tokens-server';
import { createFormAction } from '@tramvai/module-form-action';

const provider = provide({
  provide: SERVER_MODULE_PAPI_FORM_ACTIONS,
  scope: Scope.SINGLETON,
  multi: true,
  useValue: createFormAction({
    path: '/api/contact-form',
    async handler({ body }) {
      return {
        success: true,
        message: 'Form processed',
        data: body,
      };
    },
  }),
});
```

:::note

Unlike regular [PAPI](03-features/017-papi.md) handlers, form actions are registered **without** the `/papi` URL prefix — the handler path maps directly to the URL.

:::

### Using the Form component

The `Form` component renders an HTML `<form>` with progressive enhancement. Import it from `@tramvai/module-form-action`:

```tsx
import { Form } from '@tramvai/module-form-action';

export const ContactPage = () => {
  return (
    <Form method="POST" afterResponse={(response) => console.log(response)}>
      <label htmlFor="name">
        Name
        <input type="text" name="name" id="name" />
      </label>

      <label htmlFor="email">
        Email
        <input type="email" name="email" id="email" />
      </label>

      <input type="submit" value="Send" />
    </Form>
  );
};
```

### Reading form action results

Use `FormActionResultStore` to access the result of the last form action in your components. This is particularly important for the no-JS scenario, where the result is stored during server-side rendering:

```tsx
import { useStore } from '@tramvai/state';
import { FormActionResultStore, Form } from '@tramvai/module-form-action';

export const MyPage = () => {
  const formActionResult = useStore(FormActionResultStore);

  return (
    <div>
      {formActionResult && (
        <p>Result: {JSON.stringify(formActionResult)}</p>
      )}

      <Form method="POST">
        <input type="text" name="username" />
        <input type="submit" value="Submit" />
      </Form>
    </div>
  );
};
```

## How to

### Return a redirect from a form action

Use `FormActionRedirect` to redirect the user after form submission. You can optionally pass data that will be available on the target page:

```ts
import { createFormAction, FormActionRedirect } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    // process form data...

    return new FormActionRedirect('/success', {
      message: 'Registration complete',
      username: body.username,
    });
  },
});
```

On the target page, read the data from `FormActionResultStore`:

```tsx
import { useStore } from '@tramvai/state';
import { FormActionResultStore } from '@tramvai/module-form-action';

export const SuccessPage = () => {
  const formActionResult = useStore(FormActionResultStore);

  return (
    <div>
      <h1>Success!</h1>
      <p>{formActionResult?.message}</p>
    </div>
  );
};
```

:::tip

Without JavaScript, a redirect results in an HTTP 303 response. The form action data is passed via the `formActionResult` query parameter and automatically restored into the store on the target page.

:::

### Handle multiple forms on one page

Use the `name` prop to distinguish between forms. It adds a hidden `formName` field to the form data:

```tsx
<>
  <Form method="POST" name="loginForm">
    <input type="text" name="username" />
    <input type="password" name="password" />
    <input type="submit" value="Log in" />
  </Form>

  <Form method="POST" name="searchForm">
    <input type="text" name="query" />
    <input type="submit" value="Search" />
  </Form>
</>
```

In the form action handler, use `body.formName` to determine which form was submitted:

```ts
export default createFormAction({
  async handler({ body }) {
    switch (body.formName) {
      case 'loginForm':
        return { result: 'Login processed' };
      case 'searchForm':
        return { result: `Search results for: ${body.query}` };
    }
  },
});
```

### Validate form data with JSON Schema

Use the `options.schema` parameter to validate the request body against a JSON Schema. If validation fails, the `errorHandler` callback is invoked:

```ts
import { createFormAction } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    return {
      name: body.name,
      email: body.email,
      age: parseInt(body.age, 10),
    };
  },
  async errorHandler(error: Error) {
    return {
      message: error.message,
    };
  },
  options: {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 18, maximum: 120 },
        },
        required: ['name', 'email', 'age'],
        additionalProperties: false,
      },
    },
  },
});
```

### Modify form data before submission

Use the `beforeSubmit` callback to modify the `FormData` before it is sent (JS only):

```tsx
<Form
  method="POST"
  beforeSubmit={(formData) => {
    formData.set('submittedAt', new Date().toISOString());

    return { formData, preventDefault: false };
  }}
>
  <input type="text" name="message" />
  <input type="submit" value="Send" />
</Form>
```

Return `{ preventDefault: true }` to cancel the submission:

```tsx
<Form
  method="POST"
  beforeSubmit={(formData) => {
    const message = formData.get('message');

    if (!message) {
      alert('Please enter a message');
      return { formData, preventDefault: true };
    }

    return { formData, preventDefault: false };
  }}
>
  {/* ... */}
</Form>
```

### Submit a form to a custom URL

Use the `action` prop to specify a custom form action URL. This is useful when the form handler is registered via a DI provider at a custom path:

```tsx
<Form method="POST" action="/api/contact-form">
  <input type="text" name="name" />
  <input type="submit" value="Send" />
</Form>
```

### Use DI dependencies in a form action

Form actions support the `deps` parameter, similar to [PAPI handlers](03-features/017-papi.md). Dependencies are resolved with a child DI container for each request:

```tsx
import { provide, Scope } from '@tramvai/core';
import { SERVER_MODULE_PAPI_FORM_ACTIONS } from '@tramvai/tokens-server';
import { createFormAction } from '@tramvai/module-form-action';
import { HTTP_CLIENT } from '@tramvai/module-http-client';

const provider = provide({
  provide: SERVER_MODULE_PAPI_FORM_ACTIONS,
  scope: Scope.SINGLETON,
  multi: true,
  useValue: createFormAction({
    path: '/api/feedback',
    async handler({ body }) {
      const { httpClient } = this.deps;

      await httpClient.post('feedback-service', { body });

      return { success: true };
    },
    deps: {
      httpClient: HTTP_CLIENT,
    },
  }),
});
```

## API Reference

### createFormAction

Factory function for creating server-side form action handlers. Based on [`createPapiMethod`](03-features/017-papi.md#createpapimethod), but does not accept the `method` parameter — form actions handle all non-GET HTTP methods (POST, PUT, PATCH, DELETE).

Options:

- `path` — URL path for the form action handler. Required when registering via DI provider, not used with File System Routing
- `handler` — async function that processes the form submission and returns a result. Receives an object with `body`, `parsedUrl`, `cookies`, `requestManager`, and other request details. Through `this.deps` you can access resolved DI dependencies
- `errorHandler` — optional async function called when the handler throws an error or schema validation fails. Should return a result object that will be sent to the client
- `deps` — DI dependencies required by the handler
- `options` — additional options
  - `schema` — JSON Schema for validating the request body
  - `timeout` — execution timeout in milliseconds

### FormActionRedirect

Class used as a return value from a form action handler to trigger a redirect:

```text
new FormActionRedirect(redirectUrl: string, data?: Record<string, unknown>)
```

- `redirectUrl` — URL to redirect to
- `data` — optional data that will be available on the target page via `FormActionResultStore`

### Form

React component that renders an HTML `<form>` with progressive enhancement support.

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `action` | `string` | current page URL | URL of the form action handler |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'POST'` | HTTP method for form submission |
| `name` | `string` | — | Form name. Adds a hidden input `formName` for distinguishing multiple forms on one page |
| `encType` | `string` | — | Form encoding type (`'application/x-www-form-urlencoded'`, `'multipart/form-data'`, `'text/plain'`) |
| `beforeSubmit` | `(formData: FormData) => { formData: FormData; preventDefault: boolean }` | — | Callback before submission (JS only). Can modify form data or cancel submission |
| `afterResponse` | `(response: FormActionResponse) => void` | — | Callback after response is received (JS only) |

### FormActionResultStore

Redux store that holds the result of the last form action. Use with `useStore` hook to read the result in components:

```tsx
import { useStore } from '@tramvai/state';
import { FormActionResultStore } from '@tramvai/module-form-action';

const result = useStore(FormActionResultStore);
```

### FormActionModule

Tramvai module that registers the `FormActionResultStore` reducer. Must be added to the application modules list for form actions to work.

### Response types

```ts
// JSON response (from handler returning a plain object)
type FormActionJsonResponse = {
  type: 'json';
  data: Record<string, unknown>;
};

// Redirect response (from handler returning FormActionRedirect)
type FormActionRedirectResponse = {
  type: 'redirect';
  redirectUrl: string;
  data: Record<string, unknown>;
};

type FormActionResponse = FormActionJsonResponse | FormActionRedirectResponse;
```
