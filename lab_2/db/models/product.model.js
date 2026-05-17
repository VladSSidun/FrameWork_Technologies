// product.model.js — Mongoose схема і модель для продуктів
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, default: 0 },
  category: { type: String, default: null },
  image: { type: String, default: null },
  discount: { type: Number, default: 0 },
});

export const Product = mongoose.model('Product', productSchema);
