import mongoose, { Schema } from 'mongoose';

const CounterSchema = new Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

const Counter =
  mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

export async function getNextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
