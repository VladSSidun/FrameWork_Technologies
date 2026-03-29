// const userController = require("../controllers/user.controller"); Циклічний імпорт

const userRepository = require("../repositories/user.repository");

// const formatter = require("../utils/formatter.mjs"); // ← .mjs в CJS проекті
const formatter = require("../utils/formatter.js");

const rolesMap = require("../data/roles.json");

const getPublicUsers = async () => {
  const users = await userRepository.findAll();

  return users.map((u) => ({
    id: u.id,
    name: formatter.formatName(u.name),
    roleName: rolesMap[u.id] || "Unknown",
  }));
};

// const getUserFormatted = async (id, reply) => { Не потрібна
//   return userController.getUserById({params: {id}}, reply);
// };

module.exports = {
  getPublicUsers,
  // getUserFormatted,
};
