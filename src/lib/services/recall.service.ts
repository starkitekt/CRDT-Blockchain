import { connectDB } from '../mongodb';
import { Recall } from '../models/Recall';
import { Batch } from '../models/Batch';
import { auditLog } from '../audit';
import { CreateRecallInput } from '../validation/recall.schema';
import { anchorRecallOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';

type RecallDocLike = Record<string, unknown> & { _id?: unknown; __v?: unknown };

function stripInternal(doc: RecallDocLike) {
  const rest = { ...doc };
  delete rest._id;
  delete rest.__v;
  return rest;
}

export async function createRecall(
  input: CreateRecallInput,
  actorId?: string,
  actorRole = 'officer'
) {
  await connectDB();

  const batch = await Batch.findOne({ batchId: input.batchId });
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

  await Batch.updateOne(
    { batchId: input.batchId },
    {
      $set: {
        status: 'recalled',
        recallReason: input.reason,
        recallTier: input.tier,
        recallInitiatedAt: new Date(initiatedAt),
        recallInitiatedBy: actorId ?? 'system',
      },
    }
  );

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
  return recalls.map((r) => stripInternal(r as RecallDocLike));
}
