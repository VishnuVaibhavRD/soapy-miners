import {
  supabase,
} from "./supabaseClient";

import {
  getResourceName,
} from "./marketplaceContract";


function normalizeAddress(
  value
) {
  return value
    ? value.toLowerCase()
    : null;
}


/*
  Map a raw marketplace_listings row into the
  shape the marketplace UI already consumes.

  This keeps ListingCard / MyListings / the
  page's filter + buy/cancel logic unchanged
  while the data source becomes Supabase.

  Supabase is discovery/display only.
  All writes + purchase validation stay on-chain.
*/
function mapListingRow(
  row
) {
  if (!row) {
    return null;
  }

  const resourceType =
    Number(
      row.resource_type
    );

  return {
    id:
      Number(
        row.chain_listing_id
      ),

    chainListingId:
      Number(
        row.chain_listing_id
      ),

    seller:
      row.seller_wallet,

    sellerTokenId:
      row.seller_token_id ===
        null ||
      row.seller_token_id ===
        undefined
        ? null
        : Number(
            row.seller_token_id
          ),

    resourceType,

    resourceName:
      getResourceName(
        resourceType
      ),

    amount:
      Number(
        row.amount
      ),

    price:
      Number(
        row.price_gd
      ),

    status:
      row.status,

    active:
      row.status ===
      "ACTIVE",

    buyer:
      row.buyer_wallet ||
      null,

    buyerTokenId:
      row.buyer_token_id ===
        null ||
      row.buyer_token_id ===
        undefined
        ? null
        : Number(
            row.buyer_token_id
          ),

    createdAt:
      row.created_at,

    soldAt:
      row.sold_at,

    updatedAt:
      row.updated_at,
  };
}


export async function getActiveMarketplaceListings({
  contractAddress,
  resourceType = null,
  limit = 50,
}) {
  let query =
    supabase
      .from(
        "marketplace_listings"
      )
      .select("*")
      .eq(
        "contract_address",
        normalizeAddress(
          contractAddress
        )
      )
      .eq(
        "status",
        "ACTIVE"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(
        limit
      );


  if (
    resourceType !== null &&
    resourceType !== undefined
  ) {
    query =
      query.eq(
        "resource_type",
        Number(
          resourceType
        )
      );
  }


  const {
    data,
    error,
  } =
    await query;


  if (error) {
    throw error;
  }


  return (
    (data || [])
      .map(
        mapListingRow
      )
      .filter(Boolean)
  );
}


export async function getMyMarketplaceListings({
  contractAddress,
  wallet,
  limit = 100,
}) {
  if (!wallet) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "marketplace_listings"
      )
      .select("*")
      .eq(
        "contract_address",
        normalizeAddress(
          contractAddress
        )
      )
      .eq(
        "seller_wallet",
        normalizeAddress(
          wallet
        )
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(
        limit
      );


  if (error) {
    throw error;
  }


  return (
    (data || [])
      .map(
        mapListingRow
      )
      .filter(Boolean)
  );
}


export async function getRecentMarketplaceSales({
  contractAddress,
  limit = 25,
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "marketplace_sales"
      )
      .select("*")
      .eq(
        "contract_address",
        normalizeAddress(
          contractAddress
        )
      )
      .order(
        "sold_at",
        {
          ascending: false,
        }
      )
      .limit(
        limit
      );


  if (error) {
    throw error;
  }


  return data || [];
}


export async function getMarketplaceListing({
  contractAddress,
  listingId,
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "marketplace_listings"
      )
      .select("*")
      .eq(
        "contract_address",
        normalizeAddress(
          contractAddress
        )
      )
      .eq(
        "chain_listing_id",
        Number(
          listingId
        )
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return mapListingRow(
    data
  );
}


// Re-export so callers can import the resource helper
// from this module too (single source of truth in
// marketplaceContract.js).
export {
  getResourceName,
};
