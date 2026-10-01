"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  connectGameWallet,
  getConnectedGameWallet,
  watchGameWallet,
} from "@/lib/gameWallet";

const GameWalletContext =
  createContext(null);

export function GameWalletProvider({
  children,
}) {
  const [wallet, setWallet] =
    useState("");

  const [provider, setProvider] =
    useState(null);

  const [signer, setSigner] =
    useState(null);

  const [walletError, setWalletError] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  const applyConnection =
    useCallback(
      (connection) => {
        setWallet(
          connection.address
        );

        setProvider(
          connection.provider
        );

        setSigner(
          connection.signer
        );
      },
      []
    );

  const clearConnection =
    useCallback(() => {
      setWallet("");
      setProvider(null);
      setSigner(null);
      setWalletError("");
    }, []);

  const handleConnectWallet =
    useCallback(async () => {
      try {
        setConnecting(true);
        setWalletError("");

        const connection =
          await connectGameWallet();

        applyConnection(
          connection
        );

        console.log(
          "Connected wallet:",
          connection.address
        );
      } catch (error) {
        console.error(error);

        setWalletError(
          error?.message ||
            "Wallet connection failed."
        );
      } finally {
        setConnecting(false);
      }
    }, [applyConnection]);

  useEffect(() => {
    let active = true;

    async function tryAutoConnect() {
      const connected =
        await getConnectedGameWallet();

      if (
        active &&
        connected?.address
      ) {
        applyConnection(
          connected
        );
      }
    }

    tryAutoConnect();

    const cleanup =
      watchGameWallet({
        onAccountChanged:
          async () => {
            const connected =
              await getConnectedGameWallet();

            if (connected?.address) {
              applyConnection(
                connected
              );
            } else {
              clearConnection();
            }
          },

        onDisconnected:
          clearConnection,
      });

    return () => {
      active = false;
      cleanup();
    };
  }, [
    applyConnection,
    clearConnection,
  ]);

  const value =
    useMemo(
      () => ({
        wallet,
        provider,
        signer,
        walletError,
        connecting,
        handleConnectWallet,
        setWalletError,
      }),
      [
        wallet,
        provider,
        signer,
        walletError,
        connecting,
        handleConnectWallet,
      ]
    );

  return (
    <GameWalletContext.Provider
      value={value}
    >
      {children}
    </GameWalletContext.Provider>
  );
}

export function useGameWallet() {
  const context =
    useContext(
      GameWalletContext
    );

  if (!context) {
    throw new Error(
      "useGameWallet must be used within GameWalletProvider."
    );
  }

  return context;
}
