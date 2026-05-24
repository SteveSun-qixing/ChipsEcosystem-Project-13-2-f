import { randomUUID } from 'crypto';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { connectRedis, closeRedis } from './cache/redis';
import { initStorageBuckets } from './storage/init';
import { closeDb } from './db/client';
import { hostIntegration } from './services/host-integration';
import { CardPipelineQueueService } from './services/card-pipeline-queue.service';

let shuttingDown = false;

async function runWorkerLoop(workerId: string): Promise<void> {
  while (!shuttingDown) {
    const jobId = await CardPipelineQueueService.takeNextJobId();
    if (!jobId || shuttingDown) {
      continue;
    }

    try {
      const result = await CardPipelineQueueService.processJob(jobId, workerId);
      console.info(`[CardPipelineWorker] ${workerId} processed job ${jobId}: ${result.status}`);
    } catch (error) {
      console.error(`[CardPipelineWorker] ${workerId} failed while processing job ${jobId}:`, error);
    }
  }
}

async function start(): Promise<void> {
  await runMigrations();
  await connectRedis();
  await initStorageBuckets();
  await hostIntegration.init();

  const workerId = `card-pipeline-worker-${randomUUID()}`;
  const requeued = await CardPipelineQueueService.requeueStaleProcessingJobs(workerId);
  if (requeued > 0) {
    console.info(`[CardPipelineWorker] Requeued ${requeued} stale jobs.`);
  }

  const workerCount = env.CARD_PIPELINE_WORKER_CONCURRENCY;
  console.info(`[CardPipelineWorker] Starting ${workerCount} worker loop(s) as ${workerId}.`);

  await Promise.all(
    Array.from({ length: workerCount }, (_, index) => runWorkerLoop(`${workerId}-${index + 1}`)),
  );
}

async function shutdown(): Promise<void> {
  shuttingDown = true;
  await hostIntegration.stop();
  await closeRedis();
  await closeDb();
}

process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0));
});

process.on('uncaughtException', (error) => {
  console.error('[CardPipelineWorker] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CardPipelineWorker] Unhandled rejection:', reason);
  process.exit(1);
});

start().catch(async (error) => {
  console.error('[CardPipelineWorker] Failed to start:', error);
  await shutdown().catch(() => undefined);
  process.exit(1);
});
