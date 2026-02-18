declare module "express" {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;
  export interface Router {
    use: (...args: any[]) => any;
    get: (...args: any[]) => any;
    post: (...args: any[]) => any;
    put: (...args: any[]) => any;
    patch: (...args: any[]) => any;
    delete: (...args: any[]) => any;
  }
  interface ExpressFn {
    (): any;
    Router: () => Router;
    json: () => any;
  }
  const express: ExpressFn;
  export default express;
}

declare module "cors" {
  const cors: (...args: any[]) => any;
  export default cors;
}
