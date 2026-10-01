import { JsonRpcProvider, Contract } from "quais";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(
  readFileSync(
    join(here, "src", "abi", "SoapyMarketplace.json"),
    "utf8"
  )
);

const RPC = "https://orchard.rpc.quai.network";
const MARKET = "0x00229A9FeDF141cA298F7B4607f99E44F822e7D3";

const provider = new JsonRpcProvider(RPC);
const contract = new Contract(MARKET, abi, provider);

const count = Number(await provider.send("eth_call", [
  {
    to: MARKET,
    data: contract.interface.encodeFunctionData("listingCount", []),
  },
  "latest",
]).then((r) => contract.interface.decodeFunctionResult("listingCount", r)[0]));

console.log("listingCount = " + count);

if (count > 0) {
  const lastId = count; // ids are 1-based incrementing
  const listing = await contract.getListing(lastId);
  const obj = {
    id: Number(listing.id),
    seller: listing.seller,
    sellerTokenId: Number(listing.sellerTokenId),
    resourceType: Number(listing.resourceType),
    amount: Number(listing.amount),
    price: Number(listing.price),
    active: Boolean(listing.active),
    createdAt: Number(listing.createdAt),
    soldAt: Number(listing.soldAt),
    buyer: listing.buyer,
    buyerTokenId: Number(listing.buyerTokenId),
  };
  console.log(JSON.stringify(obj, null, 2));
}
process.exit(0);
