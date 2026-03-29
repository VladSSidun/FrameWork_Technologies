// import userController from '../controllers/user.controller.js'; ← циклічний імпорт: service → controller → service
import * as userRepository from "../repositories/user.repository.js";
// import formatter from '../utils/formatter'; ← відсутнє розширення .js (обовʼязково в ESM)
import * as formatter from "../utils/formatter.js";
// import rolesMap from '../data/roles.json'; ← JSON імпорт в ESM потребує createRequire
import {createRequire} from "module";
const require = createRequire(import.meta.url);
const rolesMap = require("../data/roles.json");

// export const initPermissions = () => { ← використовувалась лише для циклічного імпорту
//   console.log("Initializing permissions for controller:", typeof userController);
// };

export const getPublicUsers = async () => {
  const users = await userRepository.findAll();
  return users.map((u) => ({
    id: u.id,
    name: formatter.formatName(u.name),
    roleName: rolesMap[u.id] || "Unknown",
  }));
};

// export const getUserFormatted = async (id, reply) => { ← циклічний імпорт через userController
//   return userController.getUserById({ params: { id } }, reply);
// };
