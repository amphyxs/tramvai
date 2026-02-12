// eslint-disable-next-line import/no-default-export
import { createFormAction } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    return {
      name: body.name,
      email: body.email,
      age: parseInt(body.age, 10),
      subscribe: body.subscribe === 'on',
      timestamp: new Date().toISOString(),
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
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
          },
          email: {
            type: 'string',
            format: 'email',
          },
          age: {
            type: 'integer',
            minimum: 18,
            maximum: 120,
          },
          subscribe: {
            type: 'string',
            enum: ['on', 'off'],
          },
        },
        required: ['name', 'email', 'age'],
        additionalProperties: false,
      },
    },
  },
});
