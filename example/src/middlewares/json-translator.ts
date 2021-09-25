import express from 'express';
// @ts-ignore
import interceptor from 'express-interceptor';

export default interceptor(
  (req: express.Request, resp: express.Response): object => ({
    isInterceptable: () => true,
    intercept: (body: string, send: (newBody: string) => void) => {
      let result: any;
      try {
        result = JSON.parse(body);
      } catch {
        result = body;
      }

      const context = {
        version: process.env.npm_package_version,
      };
      if (typeof result === 'object' && typeof result.context === 'object') {
        Object.assign(context, result.context);
        delete result.context;
      }

      const newBody = {
        result,
        context,
      };

      resp.set('Content-Type', 'application/json');
      send(JSON.stringify(newBody));
    },
  }),
);
