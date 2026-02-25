import { PageComponent } from '@tramvai/react';
import { useStore } from '@tramvai/state';
import { FormActionResultStore, Form } from '@tramvai/module-form-action';

export const MainPage: PageComponent = () => {
  const formActionData = useStore(FormActionResultStore);

  return (
    <div>
      <h1>Form Actions Example</h1>

      <p>Result from form action: {JSON.stringify(formActionData) ?? '-'}</p>

      <h2>Form with method POST, action on current URL</h2>

      <Form method="POST" afterResponse={(response) => console.log(response)} name="postCurrentUrl">
        <fieldset>
          <legend>Form action response type</legend>
          <div>
            <label htmlFor="json">
              JSON Response{'\t'}
              <input type="radio" id="json" name="responseType" value="json" defaultChecked />
            </label>
          </div>
          <div>
            <label htmlFor="redirect">
              Redirect{'\t'}
              <input type="radio" id="redirect" name="responseType" value="redirect" />
            </label>
          </div>
        </fieldset>
        <br />

        <label htmlFor="username">
          Username{'\t'}
          <input type="text" name="username" id="username" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with method GET, action on current URL</h2>
      <Form method="GET" afterResponse={(response) => console.log(response)} name="getCurrentUrl">
        <label htmlFor="q">
          Search{'\t'}
          <input type="text" name="q" id="q" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with method POST, action on another URL</h2>
      <Form
        method="POST"
        action="/api/custom-form"
        afterResponse={(response) => console.log(response)}
        name="postAnotherUrl"
      >
        <label htmlFor="name">
          Name{'\t'}
          <input type="text" name="name" id="name" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with method GET, action on another URL</h2>
      <Form
        method="GET"
        action="schema-validation"
        afterResponse={(response) => console.log(response)}
        name="getAnotherUrl"
      >
        <label htmlFor="q">
          Search{'\t'}
          <input type="text" name="q" id="q" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>
    </div>
  );
};

export default MainPage;
