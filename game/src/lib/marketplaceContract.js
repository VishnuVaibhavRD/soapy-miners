import {
  Contract,
} from "quais";

import SoapyMarketplaceABI
  from "@/abi/SoapyMarketplace.json";


const MARKETPLACE_ADDRESS =
  process.env
    .NEXT_PUBLIC_SOAPY_MARKETPLACE_CONTRACT_ADDRESS;


export function getMarketplaceContract(
  signerOrProvider
) {
  if (!MARKETPLACE_ADDRESS) {
    throw new Error(
      "Missing marketplace contract address."
    );
  }

  return new Contract(
    MARKETPLACE_ADDRESS,
    SoapyMarketplaceABI,
    signerOrProvider
  );
}


export function getResourceName(
  resourceType
) {
  const resources = [
    "ORE",
    "CRYSTAL",
    "CORE",
  ];

  return (
    resources[
      Number(resourceType)
    ] || "UNKNOWN"
  );
}


export function getResourceTypeValue(
  resourceName
) {
  const map = {
    ORE: 0,
    CRYSTAL: 1,
    CORE: 2,
  };

  return map[resourceName];
}


export async function createMarketplaceListing(
  signer,
  sellerTokenId,
  resourceType,
  amount,
  price
) {
  const contract =
    getMarketplaceContract(
      signer
    );

  const tx =
    await contract.createListing(
      sellerTokenId,
      resourceType,
      amount,
      price
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}


export async function buyMarketplaceListing(
  signer,
  listingId,
  buyerTokenId
) {
  const contract =
    getMarketplaceContract(
      signer
    );

  const tx =
    await contract.buyListing(
      listingId,
      buyerTokenId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}


export async function cancelMarketplaceListing(
  signer,
  listingId,
  returnTokenId
) {
  const contract =
    getMarketplaceContract(
      signer
    );

  const tx =
    await contract.cancelListing(
      listingId,
      returnTokenId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}


export async function getMarketplaceConfig(
  signerOrProvider
) {
  const contract =
    getMarketplaceContract(
      signerOrProvider
    );

  const [
    active,
    feeBps,
    listingCount,
  ] =
    await Promise.all([
      contract.marketplaceActive(),
      contract.marketplaceFeeBps(),
      contract.listingCount(),
    ]);

  return {
    active:
      Boolean(active),

    feeBps:
      Number(feeBps),

    listingCount:
      Number(listingCount),
  };
}


export async function getMarketplaceListing(
  signerOrProvider,
  listingId
) {
  const contract =
    getMarketplaceContract(
      signerOrProvider
    );

  const listing =
    await contract.getListing(
      listingId
    );

  return {
    id:
      Number(
        listing.id
      ),

    seller:
      listing.seller,

    sellerTokenId:
      Number(
        listing.sellerTokenId
      ),

    resourceType:
      Number(
        listing.resourceType
      ),

    resourceName:
      getResourceName(
        listing.resourceType
      ),

    amount:
      Number(
        listing.amount
      ),

    price:
      Number(
        listing.price
      ),

    active:
      Boolean(
        listing.active
      ),

    createdAt:
      Number(
        listing.createdAt
      ),

    soldAt:
      Number(
        listing.soldAt
      ),

    buyer:
      listing.buyer,

    buyerTokenId:
      Number(
        listing.buyerTokenId
      ),
  };
}


export async function getAllMarketplaceListings(
  signerOrProvider
) {
  const contract =
    getMarketplaceContract(
      signerOrProvider
    );

  const count =
    Number(
      await contract.listingCount()
    );

  if (count === 0) {
    return [];
  }

  const requests = [];

  for (
    let id = 1;
    id <= count;
    id++
  ) {
    requests.push(
      getMarketplaceListing(
        signerOrProvider,
        id
      )
    );
  }

  const listings =
    await Promise.all(
      requests
    );

  return listings.reverse();
}


export async function getSellerListings(
  signerOrProvider,
  seller
) {
  const contract =
    getMarketplaceContract(
      signerOrProvider
    );

  // The deployed contract removed getSellerListingIds();
  // reconstruct by scanning all listings and filtering.
  const count =
    Number(
      await contract.listingCount()
    );

  if (count === 0) {
    return [];
  }

  const requests = [];

  for (
    let id = 1;
    id <= count;
    id++
  ) {
    requests.push(
      getMarketplaceListing(
        signerOrProvider,
        id
      )
    );
  }

  const all =
    await Promise.all(
      requests
    );

  return all
    .filter(
      (l) =>
        l.seller
          ?.toLowerCase() ===
        seller.toLowerCase()
    )
    .reverse();
}
