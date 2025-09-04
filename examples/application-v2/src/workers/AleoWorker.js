import { wrap } from "comlink";

let singletonWorker = null;
let initializationPromise = null;

const AleoWorker = () => {
    if (!singletonWorker) {
        try {
            const worker = new Worker(new URL("worker.js", import.meta.url), {
                type: "module",
            });

            worker.onerror = function(event) {
                console.error("Error in worker:", event?.message || event?.error || "Unknown error");
                console.error("Error details:", event);
            };

            worker.onmessageerror = function(event) {
                console.error("Message error in worker:", event);
            };

            singletonWorker = wrap(worker);
            
            // Initialize the worker immediately and cache the promise
            initializationPromise = singletonWorker.initializeWorker().catch(error => {
                console.error("Failed to initialize worker:", error);
                throw error;
            });
        } catch (error) {
            console.error("Failed to create worker:", error);
            throw error;
        }
    }
    return singletonWorker;
};

// Export a function to get the initialization promise
const getWorkerInitialization = () => {
    AleoWorker(); // Ensure worker is created
    return initializationPromise;
};

export { AleoWorker, getWorkerInitialization };