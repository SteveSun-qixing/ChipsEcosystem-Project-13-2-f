import type {
  IncrementalPlan,
  IncrementalScheduleResult,
  PreparedRenderNode,
  RenderQueueBatch
} from './types';

const collectNodeIds = (root: PreparedRenderNode): string[] => {
  const ids: string[] = [];
  const queue: PreparedRenderNode[] = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    ids.push(current.id);
    queue.push(...current.children);
  }
  return ids;
};

export const buildIncrementalPlan = (root: PreparedRenderNode, batchSize: number): IncrementalPlan => {
  const normalizedBatchSize = Math.max(1, Math.floor(batchSize));
  const nodeIds = collectNodeIds(root);
  const batches: RenderQueueBatch[] = [];
  for (let index = 0; index < nodeIds.length; index += normalizedBatchSize) {
    batches.push({
      index: batches.length,
      nodeIds: nodeIds.slice(index, index + normalizedBatchSize)
    });
  }
  return {
    batches,
    totalNodes: nodeIds.length
  };
};

export const createIncrementalPlan = buildIncrementalPlan;

export const scheduleIncrementalBatches = (
  plan: IncrementalPlan,
  shouldYield?: (batchIndex: number) => boolean
): IncrementalScheduleResult => {
  const consumed: RenderQueueBatch[] = [];
  let consumedNodes = 0;
  let interrupted = false;

  for (const batch of plan.batches) {
    if (shouldYield && shouldYield(batch.index)) {
      interrupted = true;
      break;
    }
    consumed.push(batch);
    consumedNodes += batch.nodeIds.length;
  }

  return {
    batches: consumed,
    interrupted,
    consumedNodes
  };
};

export class RenderQueueScheduler {
  public constructor(private readonly plan: IncrementalPlan) {}

  public run(options?: { shouldYield?: (batchIndex: number) => boolean }): IncrementalScheduleResult {
    return scheduleIncrementalBatches(this.plan, options?.shouldYield);
  }
}
