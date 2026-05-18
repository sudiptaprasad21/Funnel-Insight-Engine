import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// @ts-ignore
import pinoHttpImport from "pino-http";

const pinoHttp: any = pinoHttpImport;

const app = express();

app.use(
  pinoHttp({
      serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },

      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(cookieParser());
app.use(express.json());

export default app;
