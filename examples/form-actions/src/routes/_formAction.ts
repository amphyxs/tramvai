// eslint-disable-next-line import/no-default-export
import { createFormAction, FormActionRedirect } from '@tramvai/module-form-action';

export default createFormAction({
  async handler({ body }) {
    const responseType = body.responseType ?? "json";

    // Echo all body fields for beforeSubmitInject test
    if (body.formName === "beforeSubmitInject") {
      const { formName, ...rest } = body;
      return rest;
    }

    // File upload: when file field is present and non-empty, indicate receipt
    if (body.file && body.file !== "") {
      return {
        result: "file-uploaded",
        fileSize: Buffer.isBuffer(body.file)
          ? body.file.length
          : String(body.file).length,
      };
    }

    switch (responseType) {
      case "json":
        return {
          result: "Hello, world!",
          username: body.username ?? "Anonymous",
        };
      case "redirect":
        return new FormActionRedirect("/success", {
          result: "Hello, success!",
          username: body.username ?? "Anonymous",
        });
    }
  },
});
