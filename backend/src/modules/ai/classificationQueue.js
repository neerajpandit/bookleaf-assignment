const DEFAULT_MAX_CONCURRENCY = Number(process.env.AI_CLASSIFICATION_CONCURRENCY || 5);

let maxConcurrency = DEFAULT_MAX_CONCURRENCY;
let activeCount = 0;
const pendingJobs = [];
const queuedTicketIds = new Set();

const runNext = () => {
  while (activeCount < maxConcurrency && pendingJobs.length > 0) {
    const job = pendingJobs.shift();
    activeCount += 1;

    Promise.resolve()
      .then(() => job.run())
      .catch((error) => {
        console.error(`Ticket classification job failed for ${job.ticketId}: ${error.message}`);
      })
      .finally(() => {
        activeCount -= 1;
        queuedTicketIds.delete(job.ticketId);
        runNext();
      });
  }
};

export const enqueueTicketClassification = (ticketId, run) => {
  const normalizedId = ticketId.toString();

  if (queuedTicketIds.has(normalizedId)) {
    return false;
  }

  queuedTicketIds.add(normalizedId);
  pendingJobs.push({ ticketId: normalizedId, run });
  runNext();
  return true;
};

export const getClassificationQueueStats = () => ({
  activeCount,
  pendingCount: pendingJobs.length,
  queuedTicketCount: queuedTicketIds.size,
  maxConcurrency,
});

export const resetClassificationQueueForTests = () => {
  pendingJobs.length = 0;
  queuedTicketIds.clear();
  activeCount = 0;
  maxConcurrency = DEFAULT_MAX_CONCURRENCY;
};

export const setClassificationConcurrencyForTests = (value) => {
  maxConcurrency = value;
};

export default {
  enqueueTicketClassification,
  getClassificationQueueStats,
  resetClassificationQueueForTests,
  setClassificationConcurrencyForTests,
};
