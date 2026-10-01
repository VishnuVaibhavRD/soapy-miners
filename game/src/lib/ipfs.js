const DEFAULT_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://dweb.link/ipfs",
];

function getConfiguredGateway() {
  const custom =
    process.env.NEXT_PUBLIC_IPFS_GATEWAY;

  if (!custom) {
    return null;
  }

  return custom.replace(/\/$/, "");
}

export function ipfsToGateway(uri, gatewayBase) {
  if (!uri) {
    return "";
  }

  if (!uri.startsWith("ipfs://")) {
    return uri;
  }

  const path = uri.replace("ipfs://", "");
  const base =
    gatewayBase ||
    getConfiguredGateway() ||
    DEFAULT_GATEWAYS[0];

  return `${base}/${path}`;
}

export async function fetchIpfsJson(uri) {
  const cidPath = uri.startsWith("ipfs://")
    ? uri.replace("ipfs://", "")
    : uri;

  const gateways = [
    ...(getConfiguredGateway()
      ? [getConfiguredGateway()]
      : []),
    ...DEFAULT_GATEWAYS,
  ];

  const uniqueGateways = [
    ...new Set(gateways),
  ];

  let lastError = null;

  for (const gateway of uniqueGateways) {
    const url = `${gateway}/${cidPath}`;

    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = new Error(
          `Gateway ${gateway} returned ${response.status}`
        );
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}
