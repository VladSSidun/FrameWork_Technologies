//const userController = require('controllers/user.controller'); // ← немає ./
const userController = require("../controllers/user.controller"); // Виправлення
const {getStats} = require("../state/request-counter");

const getUserByIdSchema = {
  schema: {
    params: {
      type: "object",
      properties: {
        id: {type: "integer"},
      },
      required: ["id"],
    },
  },
};

async function apiRoutes(fastify, options) {
  fastify.get("/users", userController.getUsers);
  fastify.get("/users/:id", getUserByIdSchema, userController.getUserById);

  fastify.get("/stats", async () => getStats());
}

// module.exports = {
//   routes: apiRoutes, // ← експортує об'єкт з полем routes
// };
module.exports = apiRoutes;
