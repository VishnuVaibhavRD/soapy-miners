import { Contract } from "quais";

import {
  SOAPPY_MINERS_ABI,
} from "@/contracts/SoapyMinersABI";

const NFT_ADDRESS =
  process.env
    .NEXT_PUBLIC_SOAPY_NFT_CONTRACT_ADDRESS;

export function getNftContract(
  signerOrProvider
) {
  if (!NFT_ADDRESS) {
    throw new Error(
      "Missing NEXT_PUBLIC_SOAPY_NFT_CONTRACT_ADDRESS"
    );
  }

  return new Contract(
    NFT_ADDRESS,
    SOAPPY_MINERS_ABI,
    signerOrProvider
  );
}
