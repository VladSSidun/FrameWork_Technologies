import fastify from "fastify";
// Помилка: errorHandler і apiRoutes використовувались без імпорту
import errorHandler from "./plugins/error-handler/index.js";
import apiRoutes from "./routes/api.routes.js";

export function buildApp() {
  const app = fastify({logger: true});
  // config.port = 9999; ← навмисна помилка, перезаписує порт з .env
  app.register(errorHandler);
  app.get("/health", async () => ({status: "ok"}));
  app.register(apiRoutes, {prefix: "/api"});
  return app;
}

export default buildApp;
