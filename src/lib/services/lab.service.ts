import { connectDB } from '../mongodb';
import { LabResult } from '../models/LabResult';
import { Batch } from '../models/Batch';
import { auditLog } from '../audit';
import { CreateLabResultInput } from '../validation/lab.schema';
import { anchorLabResultOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';

/** Codex Stan 12-1981 â€” returns human-readable violation strings */
function runCodexValidation(d: CreateLabResultInput): string[] {
  const v: string[] = [];
  if (d.moisture > 20) v.push(`Moisture ${d.moisture}% exceeds Codex limit of 20%`);
  if (d.hmf > 40) v.push(`HMF ${d.hmf} mg/kg exceeds Codex limit of 40 mg/kg`);
  if (d.sucrose > 5) v.push(`Sucrose ${d.sucrose}% exceeds Codex limit of 5%`);
  if (d.reducingSugars < 60) v.push(`Reducing sugars ${d.reducingSugars}% below Codex minimum of 60%`);
  if (d.diastase < 8) v.push(`Diastase activity ${d.diastase} DN below Codex minimum of 8 DN`);
  if (d.acidity > 50) v.push(`Free acidity ${d.acidity} meq/kg exceeds Codex limit of 50 meq/kg`);
  return v;
}

function stripInternal(doc: any) {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function publishLabResult(
  input: CreateLabResultInput,
  actorId?: string,
  actorRole = 'lab'
) {
  await connectDB();

  const batch = await Batch.findOne({ batchId: input.batchId });
  if (!batch) {
    throw new Error('BATCH_NOT_FOUND');
  }

  const violations = runCodexValidation(input);
  if (violations.length > 0) {
    const err: any = new Error('CODEX_VIOLATION');
    err.violations = violations;
    throw err;
  }

  const publishedAt = new Date().toISOString();

  // Upsert: one result per batch
  const result = await LabResult.findOneAndUpdate(
    { batchId: input.batchId },
    { ...input, publishedAt },
    { upsert: true, new: true }
  );

  if (isBlockchainRelayEnabled()) {
    const txHash = await anchorLabResultOnChain(input.batchId, input);
    result.onChainTxHash = txHash;
    await result.save();
  }

  // Certify the batch
  batch.status = 'certified';
  await batch.save();

  await auditLog({
    entityType: 'lab',
    entityId: input.batchId,
    action: 'publish',
    actorUserId: actorId,
    actorRole,
    metadata: {
      labId: input.labId,
      fssaiLicense: input.fssaiLicense,
    },
  });

  return stripInternal(result.toObject());
}

export async function listLabResults() {
  await connectDB();
  const results = await LabResult.find().sort({ publishedAt: -1 }).lean();
  return results.map(stripInternal);
}

export async function getLabResultByBatch(batchId: string) {
  await connectDB();
  const result = await LabResult.findOne({ batchId }).lean();
  if (!result) return null;
  return stripInternal(result);
}
