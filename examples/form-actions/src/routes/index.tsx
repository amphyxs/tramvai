import { useState } from "react";
import { PageComponent } from "@tramvai/react";
import { useStore } from "@tramvai/state";
import { FormActionResultStore, Form } from "@tramvai/module-form-action";

export const MainPage: PageComponent = () => {
  const formActionData = useStore(FormActionResultStore);
  const [afterResponseData, setAfterResponseData] = useState<string | null>(
    null,
  );
  const [preventedSubmit, setPreventedSubmit] = useState(false);

  return (
    <div>
      <h1>Form Actions Example</h1>

      <p>Result from form action: {JSON.stringify(formActionData) ?? "-"}</p>

      <h2>Form with method POST, action on current URL</h2>

      <Form
        method="POST"
        afterResponse={(response) => console.log(response)}
        name="postCurrentUrl"
      >
        <fieldset>
          <legend>Form action response type</legend>
          <div>
            <label htmlFor="json">
              JSON Response{"\t"}
              <input
                type="radio"
                id="json"
                name="responseType"
                value="json"
                defaultChecked
              />
            </label>
          </div>
          <div>
            <label htmlFor="redirect">
              Redirect{"\t"}
              <input
                type="radio"
                id="redirect"
                name="responseType"
                value="redirect"
              />
            </label>
          </div>
        </fieldset>
        <br />

        <label htmlFor="username">
          Username{"\t"}
          <input type="text" name="username" id="username" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with method GET, action on current URL</h2>
      <Form
        method="GET"
        afterResponse={(response) => console.log(response)}
        name="getCurrentUrl"
      >
        <label htmlFor="q">
          Search{"\t"}
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
          Name{"\t"}
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
          Search{"\t"}
          <input type="text" name="q" id="q" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with beforeSubmit (field injection)</h2>
      <Form
        method="POST"
        beforeSubmit={(formData) => {
          formData.set("injectedField", "injectedValue");
          return { formData, preventDefault: false };
        }}
        name="beforeSubmitInject"
      >
        <label htmlFor="beforeSubmitField">
          Field{"\t"}
          <input type="text" name="field" id="beforeSubmitField" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>

      <h2>Form with beforeSubmit (preventDefault)</h2>
      <Form
        method="POST"
        beforeSubmit={(formData) => {
          setPreventedSubmit(true);
          return { formData, preventDefault: true };
        }}
        name="beforeSubmitPrevent"
      >
        <input type="text" name="blocked" id="blockedField" />
        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>
      {preventedSubmit && <p data-testid="prevented">Submit was prevented</p>}

      <h2>Form with afterResponse (DOM update)</h2>
      <Form
        method="POST"
        afterResponse={(response) => {
          setAfterResponseData(JSON.stringify(response));
        }}
        name="afterResponseDom"
      >
        <label htmlFor="afterResponseField">
          Username{"\t"}
          <input type="text" name="username" id="afterResponseField" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>
      {afterResponseData && (
        <p data-testid="after-response-result">{afterResponseData}</p>
      )}

      <h2>Form with file upload</h2>
      <Form method="POST" encType="multipart/form-data" name="fileUpload">
        <label htmlFor="fileInput">
          File{"\t"}
          <input type="file" name="file" id="fileInput" />
        </label>

        <br />
        <br />
        <input type="submit" value="Upload" />
      </Form>

      <h2>Form with default method (no method prop)</h2>
      <Form name="defaultMethod">
        <label htmlFor="defaultMethodField">
          Username{"\t"}
          <input type="text" name="username" id="defaultMethodField" />
        </label>

        <br />
        <br />
        <input type="submit" value="Submit" />
      </Form>
    </div>
  );
};

export default MainPage;
