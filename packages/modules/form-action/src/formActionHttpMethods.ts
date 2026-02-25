export const formActionHttpMethods = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

export type FormActionHttpMethods = (typeof formActionHttpMethods)[number];
