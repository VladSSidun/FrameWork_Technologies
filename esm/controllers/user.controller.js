import * as userRepository from "../repositories/user.repository.js";
// import { initPermissions } from '../services/user.service.js'; ← циклічний імпорт: controller → service → controller
// import { count } from '../state/request-counter.js'; ← count це примітив, його не можна змінювати через import
import {increment} from "../state/request-counter.js";

// initPermissions(); ← викликало циклічний імпорт

export const getUsers = async (request, reply) => {
  // count++; ← примітив імпортований як const — не можна змінюватиззовні
  increment();
  const users = await userRepository.findAll();
  return {users};
};

export const getUserById = async (request, reply) => {
  // count++; ← та сама помилка
  increment();
  const {id} = request.params;
  const user = await userRepository.findById(id);
  if (!user) {
    return reply.status(404).send({error: "User not found"});
  }
  return {user};
};

// export default { getUserById }; ← getUsers був named export, getUserById — default
// це означало що userController.getUsers = undefined в routes
export default {getUsers, getUserById};
