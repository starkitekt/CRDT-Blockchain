import { connectDB } from '../mongodb';
import { Recall } from '../models/Recall';
import { Batch } from '../models/Batch';
import { auditLog } from '../audit';
import { CreateRecallInput } from '../validation/recall.schema';
import { anchorRecallOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';

function stripInternal(doc: any) {
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function createRecall(
  input: CreateRecallInput,
  actorId?: string,
  actorRole = 'officer'
) {
  await connectDB();

  const batch = await Batch.findOne({ id: input.batchId });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  if (batch.status === 'recalled') throw new Error('ALREADY_RECALLED');

  const recallId = `RECALL-${Date.now()}`;
  const initiatedAt = new Date().toISOString();

  const recall = await Recall.create({
    ...input,
    id: recallId,
    initiatedAt,
  });

  if (isBlockchainRelayEnabled()) {
    const txHash = await anchorRecallOnChain(input.batchId, input.tier, input.reason);
    recall.onChainTxHash = txHash;
    await recall.save();
  }

  batch.status = 'recalled';
  await batch.save();

  await auditLog({
    entityType: 'recall',
    entityId: recallId,
    action: 'recall',
    actorUserId: actorId,
    actorRole,
    metadata: {
      batchId: input.batchId,
      tier: input.tier,
      reason: input.reason,
    },
  });

  return stripInternal(recall.toObject());
}

export async function listRecalls() {
  await connectDB();
  const recalls = await Recall.find().sort({ initiatedAt: -1 }).lean();
  return recalls.map((r: any) => {
    const { _id, __v, ...rest } = r;
    return rest;
  });
}
