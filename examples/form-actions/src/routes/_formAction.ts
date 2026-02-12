// eslint-disable-next-line import/no-default-export
import { createFormAction, FormActionRedirect } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    const responseType = body.responseType ?? 'json';

    switch (responseType) {
      case 'json':
        return {
          result: 'Hello, world!',
          username: body.username ?? 'Anonymous',
        };
      case 'redirect':
        return new FormActionRedirect('/success', {
          result: 'Hello, success!',
          username: body.username ?? 'Anonymous',
        });
    }
  },
});
