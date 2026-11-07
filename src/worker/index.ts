import "dotenv/config";
import { createMonitoringWorker } from "./monitoring-worker";
import { createAlertWorker } from "./alert-worker";
import { startScheduler, stopScheduler } from "./scheduler";
import { getRedisConnection } from "../lib/redis";

console.log("==========================================");
console.log("   PULSEWATCH BACKGROUND MONITORING WORKER");
console.log("==========================================");

const redis = getRedisConnection();
const monitoringWorker = createMonitoringWorker();
const alertWorker = createAlertWorker();
const scheduler = startScheduler(5000);

console.log("Worker services initialized and listening for jobs.");

async function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully stopping PulseWatch workers...`);
  stopScheduler();

  try {
    await Promise.all([
      monitoringWorker.close(),
      alertWorker.close(),
    ]);
    redis.disconnect();
    console.log("PulseWatch workers stopped cleanly.");
    process.exit(0);
  } catch (err: any) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
