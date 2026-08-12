import mongoose from 'mongoose';
import { Food } from './src/models/index.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/enatega-multivendor');
  const foods = await Food.find({ title: /11. House/i }).lean();
  console.log(JSON.stringify(foods, null, 2));
  process.exit(0);
}

run().catch(console.error);
