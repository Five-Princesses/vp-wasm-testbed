import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line
const go = require('./wasm_exec_node.js');

// Function to load and instantiate WebAssembly
async function loadWasm(fileName: string): Promise<void> {
  const wasmBuffer = fs.readFileSync(path.resolve(__dirname, fileName)); // Read the .wasm file
  const result = await WebAssembly.instantiate(wasmBuffer, go.importObject); // Instantiate WebAssembly
  go.run(result.instance); // Start the Go runtime

  return new Promise<void>(resolve => {
    setTimeout(resolve, 100); // Ensure Go runtime is initialized
  });
}

// Reinitialize Go runtime if it exits
async function ensureGoRunning() {
  try {
    await loadWasm('main.wasm'); // Load and instantiate WASM
  } catch (err) {
    console.error('Error in Go runtime, trying to reinitialize:', err);
  }
}

// Load the WASM file when the server starts
let wasmReady: Promise<void> = ensureGoRunning();

// Set up WebSocket connection
const socketUrl = 'wss://arb1.arbitrum.io/feed';
const ws = new WebSocket(socketUrl);

let previousTimestamp: number | null = null; // To store the last message's timestamp

// Open WebSocket connection
ws.on('open', async () => {
  console.log('Connected to the WebSocket server');

  // Wait for WASM to be ready once during connection
  await wasmReady;
  console.log('WASM Module is ready');
});

// Listen for WebSocket messages
ws.on('message', async (data: WebSocket.Data) => {
  try {
    const parsedMessage = JSON.parse(data.toString());

    if (parsedMessage.messages) {
      for (const msg of parsedMessage.messages) {
        const messageHeader = msg?.message?.message?.header;
        if (!messageHeader || typeof messageHeader.timestamp === 'undefined') {
          console.log(
            'Message header or timestamp is missing, skipping this message.'
          );
          continue;
        }

        const currentTimestamp = messageHeader.timestamp;
        const sequencerMessage = JSON.stringify(msg);

        if (previousTimestamp !== null) {
          try {
            console.log(sequencerMessage);
            // eslint-disable-next-line
            // const result = (global as any).CalculateTransactionsRootWithStartTx(
            //   sequencerMessage,
            //   previousTimestamp
            // );
            // console.log('Calculated Transactions Root:', result);
            // eslint-disable-next-line
            const result = (global as any).GetTransactionDetailsWithRoot(
              sequencerMessage,
              previousTimestamp
            );
            const parsedResult = JSON.parse(result);
            console.log(parsedResult);
            if (parsedResult.data.transactions.length > 1) {
              console.log(parsedResult.data.transactions[1]);
            }
          } catch (err) {
            console.error(
              'Error executing Go function, restarting Go runtime:',
              err
            );
            // Reinitialize Go runtime if it has exited
            wasmReady = ensureGoRunning();
            await wasmReady;
          }
        } else {
          console.log(
            'Skipping first message, no previous timestamp available yet.'
          );
        }

        previousTimestamp = currentTimestamp;
      }
    }
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

// Handle WebSocket errors
ws.on('error', error => {
  console.error('WebSocket error:', error);
});

// Handle WebSocket close event
ws.on('close', () => {
  console.log('WebSocket connection closed');
});
