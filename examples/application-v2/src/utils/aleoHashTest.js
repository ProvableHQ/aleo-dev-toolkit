import { AleoWorker, getWorkerInitialization } from '../workers/AleoWorker.js';

export async function bhp1024HashToFieldOfI64(x) {
  console.log(`🧪 Starting BHP1024 hash test for input: ${x} (via AleoWorker)`);
  const startTime = performance.now();

  try {
    // Get the worker instance and ensure it's initialized
    const worker = AleoWorker();
    await getWorkerInitialization();

    console.log(`🔧 Sending hash request to worker for input: ${x}`);

    // Call the worker method
    const result = await worker.bhp1024HashTest(x);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    console.log(
      `✅ BHP1024 hash via worker completed in ${totalDuration.toFixed(2)}ms (worker: ${result.duration?.toFixed(2)}ms)`,
    );
    console.log(`📤 Result: ${result.result}`);

    return { ...result, totalDuration };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(`❌ BHP1024 hash via worker failed after ${duration.toFixed(2)}ms:`, error);
    return { error: error.message, duration, success: false };
  }
}

export async function mlpFaceHashTest(inputs) {
  console.log(`🧪 Starting MLP Face Hash test for inputs: ${inputs.length} items (via AleoWorker)`);
  const startTime = performance.now();

  try {
    // Get the worker instance and ensure it's initialized
    const worker = AleoWorker();
    await getWorkerInitialization();

    console.log(`🔧 Sending MLP face hash request to worker`);

    // Call the worker method
    const result = await worker.mlpFaceHashTest(inputs);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    console.log(
      `✅ MLP Face Hash via worker completed in ${totalDuration.toFixed(2)}ms (worker: ${result.duration?.toFixed(2)}ms)`,
    );
    console.log(`📤 Results:`, result.result);

    return { ...result, totalDuration };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(`❌ MLP Face Hash via worker failed after ${duration.toFixed(2)}ms:`, error);
    return { error: error.message, duration, success: false };
  }
}

// Test function that can be called from anywhere
export async function runAleoHashPerformanceTest() {
  console.log('🚀 Starting Aleo SDK Performance Test (via AleoWorker)...');
  const startTime = performance.now();

  try {
    // Get the worker instance and ensure it's initialized
    const worker = AleoWorker();
    await getWorkerInitialization();

    console.log('🔧 Running batch performance test in worker...');

    // Use the worker's batch test method for better performance
    const results = await worker.runBhp1024PerformanceTest();

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    console.log(`🏁 Aleo SDK Performance Test Complete! Total time: ${totalDuration.toFixed(2)}ms`);
    console.log('📊 Test Results Summary:', results);

    return results;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(`❌ Performance test failed after ${duration.toFixed(2)}ms:`, error);
    return { error: error.message, duration, success: false };
  }
}
