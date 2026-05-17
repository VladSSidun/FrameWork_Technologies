// products.service.js — бізнес логіка, делегує до репозиторію
export const createProductsService = (repo) => ({
  findAll: () => repo.findAll(),
  findById: (id) => repo.findById(id),
  create: (data) => repo.create(data),
  update: (id, data) => repo.update(id, data),
  remove: (id) => repo.remove(id),
});
