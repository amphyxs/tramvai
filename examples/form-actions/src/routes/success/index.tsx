import { PageComponent } from '@tramvai/react';
import { useStore } from '@tramvai/state';
import { FormActionResultStore } from '@tramvai/module-form-action';

export const SuccessPage: PageComponent = () => {
  const formActionData = useStore(FormActionResultStore);

  return (
    <div>
      <h1>Success!</h1>
      <p>You have been redirected to this page.</p>
      <p>Result from form action: {JSON.stringify(formActionData) ?? '-'}</p>
      <a href="/">Go back to home</a>
    </div>
  );
};

export default SuccessPage;
