import { JsonRpcProvider } from "quais";

const RPC = "https://orchard.rpc.quai.network";
const MARKET = "0x00229A9FeDF141cA298F7B4607f99E44F822e7D3";

const provider = new JsonRpcProvider(RPC);

// Get current head
const headRaw = await provider.send("eth_blockNumber", []);
const head = Number(headRaw);
console.log("head = " + head);

// Try a recent 2000-block window ending at head
const to = head;
const from = Math.max(0, head - 2000);

const params = {
  fromBlock: "0x" + from.toString(16),
  toBlock: "0x" + to.toString(16),
  address: MARKET,
};

try {
  const logs = await provider.send("eth_getLogs", [params]);
  console.log("ROOT RPC getLogs (marketplace, last 2000 blocks) => " + (Array.isArray(logs) ? logs.length : "n/a") + " logs");
} catch (e) {
  console.log("ROOT RPC getLogs ERROR: " + (e?.message || e));
}

// Now try the Cyprus1 zone RPC
const ZONE = "https://orchard.rpc.quai.network/cyprus1";
const zProvider = new JsonRpcProvider(ZONE);
try {
  const zHead = await Promise.race([
    zProvider.send("eth_blockNumber", []),
    new Promise((_, rej) => setTimeout(() => rej(new Error("zone RPC timeout")), 8000)),
  ]);
  console.log("ZONE RPC head = " + Number(zHead));
  const zLogs = await Promise.race([
    zProvider.send("eth_getLogs", [params]),
    new Promise((_, rej) => setTimeout(() => rej(new Error("zone getLogs timeout")), 8000)),
  ]);
  console.log("ZONE RPC getLogs (marketplace) => " + (Array.isArray(zLogs) ? zLogs.length : "n/a") + " logs");
} catch (e) {
  console.log("ZONE RPC ERROR: " + (e?.message || e));
}

process.exit(0);
