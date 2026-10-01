import { quais } from "quais";

export function hasPelagus() {
  return (
    typeof window !== "undefined" &&
    typeof window.pelagus !== "undefined"
  );
}

export async function connectGameWallet() {
  if (typeof window === "undefined") {
    throw new Error(
      "Wallet connection is only available in the browser."
    );
  }

  if (!window.pelagus) {
    throw new Error(
      "Pelagus wallet is not installed."
    );
  }

  try {
    const provider =
      new quais.BrowserProvider(
        window.pelagus
      );

    await provider.send(
      "quai_requestAccounts",
      []
    );

    const signer =
      await provider.getSigner();

    const address =
      await signer.getAddress();

    if (!address) {
      throw new Error(
        "No wallet address returned."
      );
    }

    return {
      provider,
      signer,
      address,
    };
  } catch (error) {
    console.error(
      "Pelagus connection error:",
      error
    );

    if (
      error?.code === 4001 ||
      error?.code === "ACTION_REJECTED"
    ) {
      throw new Error(
        "Wallet connection was rejected."
      );
    }

    throw new Error(
      error?.message ||
        "Unable to connect Pelagus."
    );
  }
}

export async function getConnectedGameWallet() {
  if (!hasPelagus()) {
    return null;
  }

  try {
    const provider =
      new quais.BrowserProvider(
        window.pelagus
      );

    const accounts =
      await provider.send(
        "quai_accounts",
        []
      );

    if (!accounts?.[0]) {
      return null;
    }

    const signer =
      await provider.getSigner();

    const address =
      await signer.getAddress();

    return {
      provider,
      signer,
      address,
    };
  } catch {
    return null;
  }
}

export function watchGameWallet({
  onAccountChanged,
  onDisconnected,
}) {
  if (
    typeof window === "undefined" ||
    !window.pelagus
  ) {
    return () => {};
  }

  const handleAccountsChanged = (
    accounts
  ) => {
    if (
      !accounts ||
      accounts.length === 0
    ) {
      onDisconnected?.();
      return;
    }

    onAccountChanged?.(
      accounts[0]
    );
  };

  const handleDisconnect = () => {
    onDisconnected?.();
  };

  window.pelagus.on?.(
    "accountsChanged",
    handleAccountsChanged
  );

  window.pelagus.on?.(
    "disconnect",
    handleDisconnect
  );

  return () => {
    window.pelagus.removeListener?.(
      "accountsChanged",
      handleAccountsChanged
    );

    window.pelagus.removeListener?.(
      "disconnect",
      handleDisconnect
    );
  };
}
