import { fetchIpfsJson } from "@/lib/ipfs";

const BATCH_SIZE = 16;
const HARD_MAX_TOKEN_ID = 1024;

async function attachMetadata(
  token
) {
  if (!token.metadataURI) {
    return token;
  }

  try {
    const metadata =
      await fetchIpfsJson(
        token.metadataURI
      );

    return {
      ...token,
      metadata,
    };
  } catch {
    return token;
  }
}

async function ownerOfWithRetry(
  contract,
  tokenId,
  attempts = 3
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      return await contract.ownerOf(
        tokenId
      );

    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              400 * attempt
            )
        );
      }
    }
  }

  throw lastError;
}

export async function loadOwnedMiners(
  contract,
  userAddress,
  { onBatch, onStatus } = {}
) {
  const normalizedAddress =
    userAddress.toLowerCase();

  const balance =
    await contract.balanceOf(
      userAddress
    );

  if (Number(balance) === 0) {
    if (onBatch) {
      onBatch([]);
    }

    return [];
  }

  // Bound the scan to tokens that can actually exist so we
  // don't fire hundreds of ownerOf calls against the RPC.
  let maxTokenId = HARD_MAX_TOKEN_ID;

  try {
    const minted =
      await contract.totalMinted();

    if (minted && Number(minted) > 0) {
      maxTokenId = Number(minted);
    }

  } catch {
    // totalMinted not available; fall back to HARD_MAX.
  }

  const owned = [];

  for (
    let start = 1;
    start <= maxTokenId;
    start += BATCH_SIZE
  ) {
    const end =
      Math.min(
        start + BATCH_SIZE - 1,
        maxTokenId
      );

    const batchIds =
      Array.from(
        {
          length:
            end - start + 1,
        },
        (_, index) =>
          start + index
      );

    onStatus?.({
      scanned: start,
      max: maxTokenId,
    });

    const batchOwned =
      (
        await Promise.all(
          batchIds.map(
            async (tokenId) => {
              try {
                const owner =
                  await ownerOfWithRetry(
                    contract,
                    tokenId
                  );

                if (
                  owner.toLowerCase() !==
                  normalizedAddress
                ) {
                  return null;
                }

                const nft =
                  await contract.getNFT(
                    tokenId
                  );

                return {
                  tokenId,
                  metadataURI:
                    nft[0],
                  metadata: null,
                };
              } catch {
                return null;
              }
            }
          )
        )
      ).filter(Boolean);

    if (batchOwned.length > 0) {
      const withMetadata =
        await Promise.all(
          batchOwned.map(
            attachMetadata
          )
        );

      owned.push(
        ...withMetadata
      );

      if (onBatch) {
        onBatch([
          ...owned,
        ]);
      }
    }
  }

  return owned.sort(
    (a, b) =>
      a.tokenId - b.tokenId
  );
}
