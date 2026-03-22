# Module Form Action

Server-side form handlers for `tramvai` applications with Progressive Enhancement. Forms work without JavaScript (standard HTML submit), and when JS is available they are enhanced with `fetch` requests and SPA navigation.

[Complete documentation](https://tramvai.dev/docs/features/form-actions)

## Installation

```bash
npx tramvai add @tramvai/module-form-action
```

Add `FormActionModule` to the application:

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

## Explanation

Form Actions implement the Progressive Enhancement pattern for HTML forms:

- **Without JavaScript** — the form submits as a standard HTML form, the server processes it and either renders the result or redirects
- **With JavaScript** — the `Form` component intercepts submission, sends a `fetch` request, and handles the response without page reload

The module exports:

- `createFormAction` — factory function for creating server-side form handlers (extends [PAPI](https://tramvai.dev/docs/features/papi))
- `Form` — React component with progressive enhancement support
- `FormActionResultStore` — Redux store for accessing form action results
- `FormActionRedirect` — class for returning redirects from handlers
- `FormActionModule` — tramvai module to register in your app

### File System Routing

Create `_formAction.ts` files alongside page components in the `routes/` directory:

```
src/routes/
  index.tsx          # page component
  _formAction.ts     # form action handler for "/"
```

```ts
// _formAction.ts
import { createFormAction } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    return { message: 'Submitted', data: body };
  },
});
```

### DI Registration

Register form actions manually using the `SERVER_MODULE_PAPI_FORM_ACTIONS` token:

```tsx
import { provide, Scope } from '@tramvai/core';
import { SERVER_MODULE_PAPI_FORM_ACTIONS } from '@tramvai/tokens-server';
import { createFormAction } from '@tramvai/module-form-action';

provide({
  provide: SERVER_MODULE_PAPI_FORM_ACTIONS,
  scope: Scope.SINGLETON,
  multi: true,
  useValue: createFormAction({
    path: '/api/my-form',
    async handler({ body }) {
      return { success: true, data: body };
    },
  }),
});
```

## How to

### Use Form component

```tsx
import { Form } from '@tramvai/module-form-action';

const MyPage = () => (
  <Form method="POST" afterResponse={(res) => console.log(res)}>
    <input type="text" name="username" />
    <input type="submit" value="Send" />
  </Form>
);
```

### Read form action result

```tsx
import { useStore } from '@tramvai/state';
import { FormActionResultStore } from '@tramvai/module-form-action';

const MyPage = () => {
  const result = useStore(FormActionResultStore);
  return <div>{result && <p>{JSON.stringify(result)}</p>}</div>;
};
```

### Redirect after submission

```ts
import { createFormAction, FormActionRedirect } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    return new FormActionRedirect('/success', { username: body.username });
  },
});
```

## Exported tokens

- `SERVER_MODULE_PAPI_FORM_ACTIONS` — token for registering form action handlers via DI (from `@tramvai/tokens-server`)
