"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  loadOwnedMiners,
} from "@/lib/collection";

import {
  getMinerGameData,
} from "@/lib/gameContract";

import {
  connectGameWallet,
  watchGameWallet,
} from "@/lib/gameWallet";

import {
  ipfsToGateway,
} from "@/lib/ipfs";

import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  createMarketplaceListing,
  getMarketplaceConfig,
  getResourceTypeValue,
} from "@/lib/marketplaceContract";

import {
  getActiveMarketplaceListings,
  getMyMarketplaceListings,
} from "@/lib/marketplaceSupabase";

import {
  getNftContract,
} from "@/lib/nftContract";


function getMinerDisplay(miner) {
  return {
    ...miner,
    name:
      miner.metadata?.name ||
      `Soapy Miner #${miner.tokenId}`,
    image:
      ipfsToGateway(
        miner.metadata?.image
      ) || null,
  };
}


const MARKET_MINERS_PER_PAGE = 3;


function MarketMinerSelector({
  miners,
  selectedMiner,
  onSelectMiner,
  disabled,
}) {
  const [
    page,
    setPage,
  ] = useState(0);

  const pageCount = Math.max(
    1,
    Math.ceil(
      miners.length /
        MARKET_MINERS_PER_PAGE
    )
  );

  const safePage = Math.min(
    page,
    pageCount - 1
  );

  const start =
    safePage *
    MARKET_MINERS_PER_PAGE;

  const visible = miners.slice(
    start,
    start + MARKET_MINERS_PER_PAGE
  );

  return (
    <div className="market-miner-selector">
      {visible.map(
        (miner) => (
          <button
            key={miner.tokenId}
            type="button"
            className={
              selectedMiner
                ?.tokenId ===
              miner.tokenId
                ? "active"
                : ""
            }
            onClick={() =>
              onSelectMiner(miner)
            }
            disabled={disabled}
          >
            {miner.image ? (
              <img
                src={miner.image}
                alt={
                  miner.name ||
                  `Soapy #${miner.tokenId}`
                }
              />
            ) : null}

            <span>
              {miner.name ||
                `SOAPY #${miner.tokenId}`}
            </span>
          </button>
        )
      )}

      {pageCount > 1 ? (
        <div className="market-miner-pager">
          <button
            type="button"
            className="pager-btn"
            onClick={() =>
              setPage(
                (p) => Math.max(0, p - 1)
              )
            }
            disabled={safePage === 0}
          >
            ‹ Prev
          </button>

          <span className="pager-status">
            {safePage + 1} / {pageCount}
          </span>

          <button
            type="button"
            className="pager-btn"
            onClick={() =>
              setPage(
                (p) =>
                  Math.min(
                    pageCount - 1,
                    p + 1
                  )
              )
            }
            disabled={
              safePage >= pageCount - 1
            }
          >
            Next ›
          </button>
        </div>
      ) : null}
    </div>
  );
}


export default function MarketplacePage() {
  const [
    wallet,
    setWallet,
  ] = useState("");

  const [
    provider,
    setProvider,
  ] = useState(null);

  const [
    signer,
    setSigner,
  ] = useState(null);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

  const [
    walletError,
    setWalletError,
  ] = useState("");


  const [
    listings,
    setListings,
  ] = useState([]);

  const [
    myListings,
    setMyListings,
  ] = useState([]);

  const [
    marketConfig,
    setMarketConfig,
  ] = useState(null);

  const [
    loadingMarket,
    setLoadingMarket,
  ] = useState(false);

  const [
    marketError,
    setMarketError,
  ] = useState("");


  const [
    activeTab,
    setActiveTab,
  ] = useState("market");


  const [
    resourceFilter,
    setResourceFilter,
  ] = useState("ALL");


  const [
    ownedMiners,
    setOwnedMiners,
  ] = useState([]);

  const [
    loadingOwned,
    setLoadingOwned,
  ] = useState(false);

  const [
    selectedSellerMiner,
    setSelectedSellerMiner,
  ] = useState(null);

  const [
    selectedSellerGame,
    setSelectedSellerGame,
  ] = useState(null);


  const [
    showCreateListing,
    setShowCreateListing,
  ] = useState(false);

  const [
    listingResource,
    setListingResource,
  ] = useState("ORE");

  const [
    listingAmount,
    setListingAmount,
  ] = useState("");

  const [
    listingPrice,
    setListingPrice,
  ] = useState("");

  const [
    creatingListing,
    setCreatingListing,
  ] = useState(false);

  const [
    createListingError,
    setCreateListingError,
  ] = useState("");

  const [
    createListingSuccess,
    setCreateListingSuccess,
  ] = useState("");


  const [
    selectedBuyListing,
    setSelectedBuyListing,
  ] = useState(null);

  const [
    selectedBuyerMiner,
    setSelectedBuyerMiner,
  ] = useState(null);

  const [
    selectedBuyerGame,
    setSelectedBuyerGame,
  ] = useState(null);

  const [
    buyingListing,
    setBuyingListing,
  ] = useState(false);

  const [
    buyListingError,
    setBuyListingError,
  ] = useState("");

  const [
    buyListingSuccess,
    setBuyListingSuccess,
  ] = useState("");


  const [
    selectedCancelListing,
    setSelectedCancelListing,
  ] = useState(null);

  const [
    selectedReturnMiner,
    setSelectedReturnMiner,
  ] = useState(null);

  const [
    cancellingListing,
    setCancellingListing,
  ] = useState(false);

  const [
    cancelListingError,
    setCancelListingError,
  ] = useState("");

  const [
    cancelListingSuccess,
    setCancelListingSuccess,
  ] = useState("");


  async function loadOwnedSellerMiners(
    currentProvider,
    address
  ) {
    if (!currentProvider || !address) {
      setOwnedMiners([]);
      setLoadingOwned(false);
      setSelectedSellerMiner(null);
      setSelectedSellerGame(null);
      return;
    }

    const nftContract =
      getNftContract(currentProvider);

    setLoadingOwned(true);

    const owned =
      await loadOwnedMiners(
        nftContract,
        address,
        {
          onBatch: (
            batch
          ) => {
            setOwnedMiners(
              batch.map(
                getMinerDisplay
              )
            );
          },
        }
      );

    const miners =
      owned.map(getMinerDisplay);

    setOwnedMiners(miners);

    setLoadingOwned(false);

    if (
      miners.length === 1
    ) {
      await handleSellerMinerSelect(
        miners[0],
        currentProvider
      );
    }
  }


  async function handleConnectWallet() {
    try {
      setConnecting(true);
      setWalletError("");

      const connection =
        await connectGameWallet();

      setWallet(
        connection.address
      );

      setProvider(
        connection.provider
      );

      setSigner(
        connection.signer
      );

      await Promise.all([
        loadMarketplace(
          connection.provider,
          connection.address
        ),
        loadOwnedSellerMiners(
          connection.provider,
          connection.address
        ),
      ]);

    } catch (error) {
      console.error(
        "Marketplace wallet connection failed:",
        error
      );

      setWalletError(
        error?.message ||
        "Wallet connection failed."
      );

    } finally {
      setConnecting(false);
    }
  }


  async function loadMarketplace(
    currentProvider,
    currentWallet = wallet
  ) {
    if (!currentProvider) {
      return;
    }

    try {
      setLoadingMarket(true);
      setMarketError("");

      // On-chain config (market active + fee).
      // Listing reads now come from Supabase (indexed).
      const config =
        await getMarketplaceConfig(
          currentProvider
        );

      setMarketConfig(
        config
      );

      const marketplaceAddress =
        process.env
          .NEXT_PUBLIC_SOAPY_MARKETPLACE_CONTRACT_ADDRESS;

      const [
        active,
        mine,
      ] =
        await Promise.all([
          getActiveMarketplaceListings({
            contractAddress:
              marketplaceAddress,
          }),

          currentWallet
            ? getMyMarketplaceListings({
                contractAddress:
                  marketplaceAddress,

                wallet:
                  currentWallet,
              })
            : Promise.resolve(
                []
              ),
        ]);

      setListings(
        active
      );

      setMyListings(
        mine
      );

    } catch (error) {
      console.error(
        "Failed to load marketplace:",
        error
      );

      setMarketError(
        error?.shortMessage ||
        error?.message ||
        "Failed to load marketplace."
      );

    } finally {
      setLoadingMarket(false);
    }
  }


  /*
    After a marketplace write is confirmed on-chain, the
    indexer needs a few seconds to catch the confirmed block
    and update Supabase. Refresh once immediately, then again
    after a short delay so the new state shows up without the
    user manually reloading.
  */
  function scheduleMarketplaceRefresh() {
    const currentProvider = provider;
    const currentWallet = wallet;

    if (!currentProvider) {
      return;
    }

    setTimeout(
      () => {
        loadMarketplace(
          currentProvider,
          currentWallet
        );
      },
      8000
    );
  }


  async function handleSellerMinerSelect(
    miner,
    currentProvider = provider
  ) {
    try {
      if (!currentProvider) {
        throw new Error(
          "Wallet provider unavailable."
        );
      }

      setSelectedSellerMiner(
        miner
      );

      const gameData =
        await getMinerGameData(
          currentProvider,
          miner.tokenId
        );

      setSelectedSellerGame(
        gameData
      );
    } catch (error) {
      console.error(
        "Failed to load seller miner:",
        error
      );

      setCreateListingError(
        error?.shortMessage ||
        error?.message ||
        "Failed to load miner inventory."
      );
    }
  }


  async function handleBuyerMinerSelect(
    miner
  ) {
    try {
      if (!provider) {
        throw new Error(
          "Wallet provider unavailable."
        );
      }

      setSelectedBuyerMiner(
        miner
      );

      const gameData =
        await getMinerGameData(
          provider,
          miner.tokenId
        );

      setSelectedBuyerGame(
        gameData
      );
    } catch (error) {
      console.error(
        "Failed to load buyer miner:",
        error
      );

      setBuyListingError(
        error?.shortMessage ||
        error?.message ||
        "Failed to load destination miner."
      );
    }
  }


  async function handleCreateListing() {
    try {
      if (!wallet) {
        throw new Error(
          "Connect wallet first."
        );
      }

      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!provider) {
        throw new Error(
          "Wallet provider unavailable."
        );
      }

      if (!selectedSellerMiner) {
        throw new Error(
          "Select a Soapy first."
        );
      }

      if (!selectedSellerGame) {
        throw new Error(
          "Miner inventory unavailable."
        );
      }

      const amount =
        Number(listingAmount);

      const price =
        Number(listingPrice);

      if (
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        throw new Error(
          "Enter a valid resource amount."
        );
      }

      if (
        !Number.isInteger(price) ||
        price <= 0
      ) {
        throw new Error(
          "Enter a valid Gold Dust price."
        );
      }

      const available =
        listingResource === "ORE"
          ? selectedSellerGame.ore
          : listingResource ===
              "CRYSTAL"
            ? selectedSellerGame
                .crystal
            : selectedSellerGame
                .core;

      if (amount > available) {
        throw new Error(
          `You only have ${available} ${listingResource}.`
        );
      }

      const resourceType =
        getResourceTypeValue(
          listingResource
        );

      setCreatingListing(true);
      setCreateListingError("");
      setCreateListingSuccess("");

      await createMarketplaceListing(
        signer,
        selectedSellerMiner.tokenId,
        resourceType,
        amount,
        price
      );

      const updatedMiner =
        await getMinerGameData(
          provider,
          selectedSellerMiner.tokenId
        );

      setSelectedSellerGame(
        updatedMiner
      );

      await loadMarketplace(
        provider,
        wallet
      );

      scheduleMarketplaceRefresh();

      setCreateListingSuccess(
        `${amount} ${listingResource} listed for ${price} GD.`
      );

      setListingAmount("");
      setListingPrice("");

    } catch (error) {
      console.error(
        "Create listing failed:",
        error
      );

      setCreateListingError(
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Failed to create listing."
      );

    } finally {
      setCreatingListing(false);
    }
  }


  async function handleBuyListing() {
    try {
      if (!wallet) {
        throw new Error(
          "Connect wallet first."
        );
      }

      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!provider) {
        throw new Error(
          "Wallet provider unavailable."
        );
      }

      if (!selectedBuyListing) {
        throw new Error(
          "No listing selected."
        );
      }

      if (!selectedBuyerMiner) {
        throw new Error(
          "Select a destination Soapy."
        );
      }

      if (!selectedBuyerGame) {
        throw new Error(
          "Destination miner data unavailable."
        );
      }

      const listing =
        selectedBuyListing;

      if (
        listing.seller
          .toLowerCase() ===
        wallet.toLowerCase()
      ) {
        throw new Error(
          "Cannot buy your own listing."
        );
      }

      const currentInventory =
        selectedBuyerGame.ore +
        selectedBuyerGame.crystal +
        selectedBuyerGame.core;

      const capacity =
        selectedBuyerGame
          .backpackCapacity;

      if (
        currentInventory +
          listing.amount >
        capacity
      ) {
        throw new Error(
          "Selected Soapy backpack does not have enough space."
        );
      }

      setBuyingListing(true);

      setBuyListingError("");
      setBuyListingSuccess("");

      await buyMarketplaceListing(
        signer,
        listing.id,
        selectedBuyerMiner.tokenId
      );

      const updatedBuyerMiner =
        await getMinerGameData(
          provider,
          selectedBuyerMiner.tokenId
        );

      setSelectedBuyerGame(
        updatedBuyerMiner
      );

      await loadMarketplace(
        provider,
        wallet
      );

      scheduleMarketplaceRefresh();

      setBuyListingSuccess(
        `Purchased ${listing.amount} ${listing.resourceName} for ${listing.price} GD.`
      );

    } catch (error) {
      console.error(
        "Buy listing failed:",
        error
      );

      setBuyListingError(
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Failed to buy listing."
      );

    } finally {
      setBuyingListing(false);
    }
  }


  async function handleCancelListing() {
    try {
      if (!wallet) {
        throw new Error(
          "Connect wallet first."
        );
      }

      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!provider) {
        throw new Error(
          "Wallet provider unavailable."
        );
      }

      if (!selectedCancelListing) {
        throw new Error(
          "No listing selected."
        );
      }

      if (!selectedReturnMiner) {
        throw new Error(
          "Select a Soapy to receive the returned resources."
        );
      }

      setCancellingListing(true);

      setCancelListingError("");
      setCancelListingSuccess("");

      await cancelMarketplaceListing(
        signer,
        selectedCancelListing.id,
        selectedReturnMiner.tokenId
      );

      if (
        selectedSellerMiner?.tokenId ===
        selectedReturnMiner.tokenId
      ) {
        const updatedMiner =
          await getMinerGameData(
            provider,
            selectedReturnMiner.tokenId
          );

        setSelectedSellerGame(
          updatedMiner
        );
      }

      await loadMarketplace(
        provider,
        wallet
      );

      scheduleMarketplaceRefresh();

      setCancelListingSuccess(
        `${selectedCancelListing.amount} ${selectedCancelListing.resourceName} returned to ${selectedReturnMiner.name || `Soapy #${selectedReturnMiner.tokenId}`}.`
      );

    } catch (error) {
      console.error(
        "Cancel listing failed:",
        error
      );

      setCancelListingError(
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Failed to cancel listing."
      );

    } finally {
      setCancellingListing(false);
    }
  }


  useEffect(() => {
    const cleanup =
      watchGameWallet({
        onAccountChanged:
          async (address) => {
            setWallet(
              address
            );

            if (provider) {
              await Promise.all([
                loadMarketplace(
                  provider,
                  address
                ),
                loadOwnedSellerMiners(
                  provider,
                  address
                ),
              ]);
            }
          },

        onDisconnected:
          () => {
            setWallet("");
            setSigner(null);
            setMyListings([]);
            setOwnedMiners([]);
            setSelectedSellerMiner(null);
            setSelectedSellerGame(null);
            setShowCreateListing(false);
            setSelectedBuyListing(null);
            setSelectedBuyerMiner(null);
            setSelectedBuyerGame(null);
            setBuyListingError("");
            setBuyListingSuccess("");
            setSelectedCancelListing(null);
            setSelectedReturnMiner(null);
            setCancelListingError("");
            setCancelListingSuccess("");
          },
      });

    return cleanup;
  }, [provider]);


  const activeListings =
    useMemo(
      () =>
        listings.filter(
          (listing) => {
            if (!listing.active) {
              return false;
            }

            if (
              resourceFilter ===
              "ALL"
            ) {
              return true;
            }

            return (
              listing.resourceName ===
              resourceFilter
            );
          }
        ),
      [
        listings,
        resourceFilter,
      ]
    );


  return (
    <main className="market-page">

      <header className="market-header">

        <div>
          <Link
            href="/"
            className="market-back"
          >
            ← RETURN TO CAMP
          </Link>

          <p>
            SOAPY MINERS
          </p>

          <h1>
            RESOURCE MARKET
          </h1>
        </div>


        <div className="market-header-right">

          {marketConfig && (
            <div className="market-fee">
              MARKET FEE{" "}
              {(
                marketConfig.feeBps /
                100
              ).toFixed(2)}
              %
            </div>
          )}

          <button
            type="button"
            className="market-wallet-button"
            onClick={
              handleConnectWallet
            }
            disabled={
              connecting
            }
          >
            {connecting
              ? "CONNECTING..."
              : wallet
                ? `${wallet.slice(
                    0,
                    6
                  )}...${wallet.slice(
                    -4
                  )}`
                : "CONNECT WALLET"}
          </button>

        </div>

      </header>


      <section className="market-banner">

        <div>
          <small>
            PLAYER-TO-PLAYER MARKET
          </small>

          <h2>
            TRADE WHAT YOU MINE
          </h2>

          <p>
            Buy and sell Ore,
            Crystal and Core using
            Gold Dust.
          </p>
        </div>


        <div className="market-banner-stats">

          <div>
            <small>
              TOTAL LISTINGS
            </small>

            <strong>
              {marketConfig
                ?.listingCount ?? 0}
            </strong>
          </div>

          <div>
            <small>
              ACTIVE LISTINGS
            </small>

            <strong>
              {
                listings.filter(
                  (listing) =>
                    listing.active
                ).length
              }
            </strong>
          </div>

        </div>

      </section>


      <nav className="market-tabs">

        <button
          type="button"
          className={
            activeTab === "market"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "market"
            )
          }
        >
          MARKET
        </button>

        <button
          type="button"
          className={
            activeTab === "mine"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "mine"
            )
          }
        >
          MY LISTINGS
        </button>

      </nav>


      {walletError && (
        <p className="market-error">
          {walletError}
        </p>
      )}

      {marketError && (
        <p className="market-error">
          {marketError}
        </p>
      )}


      {activeTab ===
        "market" && (
        <>

          <section className="market-toolbar">

            <div className="market-filters">

              {[
                "ALL",
                "ORE",
                "CRYSTAL",
                "CORE",
              ].map(
                (resource) => (
                  <button
                    key={
                      resource
                    }
                    type="button"
                    className={
                      resourceFilter ===
                      resource
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setResourceFilter(
                        resource
                      )
                    }
                  >
                    {resource}
                  </button>
                )
              )}

            </div>


            <button
              type="button"
              className="market-create-button"
              disabled={!wallet}
              onClick={() => {
                setCreateListingError("");
                setCreateListingSuccess("");
                setShowCreateListing(true);
              }}
            >
              + CREATE LISTING
            </button>

          </section>


          {loadingMarket ? (
            <MarketLoading />
          ) : activeListings.length ===
            0 ? (
            <MarketEmpty />
          ) : (
            <div className="market-listing-grid">

              {activeListings.map(
                (listing) => (
                  <ListingCard
                    key={
                      listing.id
                    }
                    listing={
                      listing
                    }
                    wallet={
                      wallet
                    }
                    onBuy={() => {
                      setBuyListingError("");
                      setBuyListingSuccess("");
                      setSelectedBuyerMiner(null);
                      setSelectedBuyerGame(null);
                      setSelectedBuyListing(
                        listing
                      );

                      if (
                        ownedMiners.length === 1
                      ) {
                        handleBuyerMinerSelect(
                          ownedMiners[0]
                        );
                      }
                    }}
                  />
                )
              )}

            </div>
          )}

        </>
      )}


      {activeTab ===
        "mine" && (
        <MyListings
          wallet={wallet}
          listings={
            myListings
          }
          loading={
            loadingMarket
          }
          onCancel={(listing) => {
            setCancelListingError("");
            setCancelListingSuccess("");
            setSelectedReturnMiner(null);
            setSelectedCancelListing(
              listing
            );

            if (
              ownedMiners.length === 1
            ) {
              setSelectedReturnMiner(
                ownedMiners[0]
              );
            }
          }}
        />
      )}


      {selectedCancelListing ? (
        <CancelListingWindow
          listing={
            selectedCancelListing
          }
          miners={
            ownedMiners
          }
          loadingOwned={
            loadingOwned
          }
          selectedMiner={
            selectedReturnMiner
          }
          cancelling={
            cancellingListing
          }
          error={
            cancelListingError
          }
          success={
            cancelListingSuccess
          }
          onSelectMiner={
            setSelectedReturnMiner
          }
          onCancelListing={
            handleCancelListing
          }
          onClose={() => {
            if (!cancellingListing) {
              setSelectedCancelListing(
                null
              );

              setSelectedReturnMiner(
                null
              );

              setCancelListingError("");
              setCancelListingSuccess("");
            }
          }}
        />
      ) : null}


      {selectedBuyListing ? (
        <BuyListingWindow
          listing={
            selectedBuyListing
          }
          miners={
            ownedMiners
          }
          loadingOwned={
            loadingOwned
          }
          selectedMiner={
            selectedBuyerMiner
          }
          minerGame={
            selectedBuyerGame
          }
          buying={
            buyingListing
          }
          error={
            buyListingError
          }
          success={
            buyListingSuccess
          }
          onSelectMiner={
            handleBuyerMinerSelect
          }
          onBuy={
            handleBuyListing
          }
          onClose={() => {
            if (!buyingListing) {
              setSelectedBuyListing(
                null
              );

              setSelectedBuyerMiner(
                null
              );

              setSelectedBuyerGame(
                null
              );

              setBuyListingError("");
              setBuyListingSuccess("");
            }
          }}
        />
      ) : null}


      {showCreateListing ? (
        <CreateListingWindow
          miners={ownedMiners}
          selectedMiner={
            selectedSellerMiner
          }
          minerGame={
            selectedSellerGame
          }
          loadingOwned={
            loadingOwned
          }
          resource={
            listingResource
          }
          amount={
            listingAmount
          }
          price={
            listingPrice
          }
          creating={
            creatingListing
          }
          error={
            createListingError
          }
          success={
            createListingSuccess
          }
          onSelectMiner={
            handleSellerMinerSelect
          }
          onResourceChange={
            setListingResource
          }
          onAmountChange={
            setListingAmount
          }
          onPriceChange={
            setListingPrice
          }
          onCreate={
            handleCreateListing
          }
          onClose={() => {
            if (!creatingListing) {
              setShowCreateListing(
                false
              );
            }
          }}
        />
      ) : null}

    </main>
  );
}


function CreateListingWindow({
  miners,
  selectedMiner,
  minerGame,
  resource,
  amount,
  price,
  creating,
  error,
  success,
  loadingOwned,
  onSelectMiner,
  onResourceChange,
  onAmountChange,
  onPriceChange,
  onCreate,
  onClose,
}) {
  const available =
    !minerGame
      ? 0
      : resource === "ORE"
        ? minerGame.ore
        : resource ===
            "CRYSTAL"
          ? minerGame.crystal
          : minerGame.core;

  return (
    <div
      className="game-window-backdrop"
      onClick={onClose}
      role="presentation"
    >

      <section
        className="game-dialog-window market-create-window"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >

        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          disabled={creating}
        >
          ×
        </button>

        <p className="dialog-character">
          RESOURCE EXCHANGE
        </p>

        <h2>
          CREATE LISTING
        </h2>


        <div className="market-form-section">

          <label>
            SELL FROM SOAPY
          </label>

          {loadingOwned ? (
            <p className="market-error">
              Scanning your Soapies…
            </p>
          ) : miners.length === 0 ? (
            <p className="market-error">
              No Soapies found in this wallet.
            </p>
          ) : (
            <MarketMinerSelector
              miners={miners}
              selectedMiner={
                selectedMiner
              }
              onSelectMiner={
                onSelectMiner
              }
              disabled={creating}
            />
          )}

        </div>


        <div className="market-form-section">

          <label>
            RESOURCE
          </label>

          <div className="market-resource-selector">

            {[
              "ORE",
              "CRYSTAL",
              "CORE",
            ].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    resource ===
                    item
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    onResourceChange(
                      item
                    )
                  }
                  disabled={creating}
                >
                  {item}
                </button>
              )
            )}

          </div>

          <p>
            AVAILABLE:{" "}
            <strong>
              {available}
            </strong>
          </p>

        </div>


        <div className="market-form-grid">

          <label>
            <span>
              AMOUNT
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) =>
                onAmountChange(
                  event.target.value
                )
              }
              placeholder="100"
              disabled={creating}
            />
          </label>


          <label>
            <span>
              TOTAL PRICE (GD)
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(event) =>
                onPriceChange(
                  event.target.value
                )
              }
              placeholder="50"
              disabled={creating}
            />
          </label>

        </div>


        {amount &&
          price &&
          Number(amount) > 0 ? (
          <div className="market-price-preview">

            <small>
              PRICE PER UNIT
            </small>

            <strong>
              {(
                Number(price) /
                Number(amount)
              ).toFixed(2)}{" "}
              GD
            </strong>

          </div>
        ) : null}


        <div className="market-escrow-note">

          Resources are moved into
          marketplace escrow when
          this listing is created.

        </div>


        {error ? (
          <p className="market-error">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="market-success">
            {success}
          </p>
        ) : null}


        <button
          type="button"
          className="market-create-submit"
          disabled={
            creating ||
            !selectedMiner ||
            !amount ||
            !price
          }
          onClick={onCreate}
        >
          {creating
            ? "CREATING LISTING..."
            : "LIST RESOURCE"}
        </button>

      </section>

    </div>
  );
}


function CancelListingWindow({
  listing,
  miners,
  selectedMiner,
  cancelling,
  error,
  success,
  loadingOwned,
  onSelectMiner,
  onCancelListing,
  onClose,
}) {
  return (
    <div
      className="game-window-backdrop"
      onClick={onClose}
      role="presentation"
    >

      <section
        className="game-dialog-window market-cancel-window"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >

        <button
          type="button"
          className="dialog-close"
          disabled={cancelling}
          onClick={onClose}
        >
          ×
        </button>

        <p className="dialog-character">
          MARKET ESCROW
        </p>

        <h2>
          CANCEL LISTING?
        </h2>


        <div className="market-cancel-summary">

          <div>
            <small>
              RETURNING
            </small>

            <strong>
              {listing.amount}{" "}
              {listing.resourceName}
            </strong>
          </div>

          <div>
            <small>
              LISTING PRICE
            </small>

            <strong>
              {listing.price} GD
            </strong>
          </div>

        </div>


        <p className="market-cancel-description">
          Choose which of your
          Soapies should receive the
          escrowed resources.
        </p>


        {loadingOwned ? (
          <p className="market-error">
            Scanning your Soapies…
          </p>
        ) : miners.length === 0 ? (
          <p className="market-error">
            No Soapies found in this wallet.
          </p>
        ) : (
          <MarketMinerSelector
            miners={miners}
            selectedMiner={
              selectedMiner
            }
            onSelectMiner={
              onSelectMiner
            }
            disabled={cancelling}
          />
        )}


        <div className="market-cancel-note">
          Cancelling does not charge
          Gold Dust. Your listed
          resources are returned from
          escrow.
        </div>


        {error ? (
          <p className="market-error">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="market-success">
            {success}
          </p>
        ) : null}


        <button
          type="button"
          className="market-confirm-cancel"
          disabled={
            cancelling ||
            !selectedMiner ||
            Boolean(success)
          }
          onClick={
            onCancelListing
          }
        >
          {cancelling
            ? "RETURNING RESOURCES..."
            : success
              ? "LISTING CANCELLED"
              : "CANCEL & RETURN RESOURCES"}
        </button>

      </section>

    </div>
  );
}


function BuyListingWindow({
  listing,
  miners,
  selectedMiner,
  minerGame,
  buying,
  error,
  success,
  loadingOwned,
  onSelectMiner,
  onBuy,
  onClose,
}) {
  const currentInventory =
    minerGame
      ? minerGame.ore +
        minerGame.crystal +
        minerGame.core
      : 0;

  const capacity =
    minerGame
      ?.backpackCapacity ?? 0;

  const afterPurchase =
    currentInventory +
    listing.amount;

  const enoughSpace =
    minerGame
      ? afterPurchase <=
        capacity
      : false;

  return (
    <div
      className="game-window-backdrop"
      onClick={onClose}
      role="presentation"
    >

      <section
        className="game-dialog-window market-buy-window"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >

        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          disabled={buying}
        >
          ×
        </button>

        <p className="dialog-character">
          RESOURCE MARKET
        </p>

        <h2>
          BUY {listing.resourceName}
        </h2>

        <div className="market-buy-summary">

          <div>
            <small>
              RESOURCE
            </small>

            <strong>
              {listing.amount}{" "}
              {listing.resourceName}
            </strong>
          </div>

          <div>
            <small>
              TOTAL PRICE
            </small>

            <strong>
              {listing.price} GD
            </strong>
          </div>

        </div>


        <div className="market-form-section">

          <label>
            SEND RESOURCE TO
          </label>

          {loadingOwned ? (
            <p className="market-error">
              Scanning your Soapies…
            </p>
          ) : miners.length === 0 ? (
            <p className="market-error">
              No Soapies found in this wallet.
            </p>
          ) : (
            <MarketMinerSelector
              miners={miners}
              selectedMiner={
                selectedMiner
              }
              onSelectMiner={
                onSelectMiner
              }
              disabled={buying}
            />
          )}

        </div>


        {minerGame ? (
          <div className="market-capacity-preview">

            <small>
              BACKPACK AFTER PURCHASE
            </small>

            <strong>
              {afterPurchase} /{" "}
              {capacity}
            </strong>

            <span
              className={
                enoughSpace
                  ? "enough"
                  : "missing"
              }
            >
              {enoughSpace
                ? "ENOUGH SPACE"
                : "BACKPACK FULL"}
            </span>

          </div>
        ) : null}


        <div className="market-buy-warning">
          The purchase is final.
          Resources will be sent to
          the selected Soapy.
        </div>


        {error ? (
          <p className="market-error">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="market-success">
            {success}
          </p>
        ) : null}


        <button
          type="button"
          className="market-create-submit"
          disabled={
            buying ||
            !selectedMiner ||
            !enoughSpace ||
            Boolean(success)
          }
          onClick={onBuy}
        >
          {buying
            ? "PURCHASING..."
            : success
              ? "PURCHASE COMPLETE"
              : `BUY FOR ${listing.price} GD`}
        </button>

      </section>

    </div>
  );
}


function ListingCard({
  listing,
  wallet,
  onBuy,
}) {
  const isSeller =
    wallet &&
    listing.seller
      .toLowerCase() ===
      wallet.toLowerCase();

  const unitPrice =
    listing.amount > 0
      ? (
          listing.price /
          listing.amount
        ).toFixed(2)
      : "0";

  return (
    <article className="market-listing-card">

      <div className="market-resource-icon">
        {listing.resourceName ===
          "ORE"
          ? "🪨"
          : listing.resourceName ===
              "CRYSTAL"
            ? "💎"
            : "🔮"}
      </div>


      <div className="market-listing-title">

        <small>
          {listing.resourceName}
        </small>

        <h3>
          {listing.amount}{" "}
          {listing.resourceName}
        </h3>

      </div>


      <div className="market-listing-price">

        <small>
          TOTAL PRICE
        </small>

        <strong>
          {listing.price} GD
        </strong>

        <span>
          {unitPrice} GD EACH
        </span>

      </div>


      <div className="market-seller">

        <small>
          SELLER
        </small>

        <span>
          {listing.seller.slice(
            0,
            6
          )}
          ...
          {listing.seller.slice(
            -4
          )}
        </span>

      </div>


      <button
        type="button"
        className="market-buy-button"
        disabled={
          !wallet ||
          isSeller
        }
        onClick={onBuy}
      >
        {!wallet
          ? "CONNECT TO BUY"
          : isSeller
            ? "YOUR LISTING"
            : "BUY"}
      </button>

    </article>
  );
}


function MyListings({
  wallet,
  listings,
  loading,
  onCancel,
}) {
  if (!wallet) {
    return (
      <section className="market-empty">
        <h2>
          CONNECT YOUR WALLET
        </h2>

        <p>
          Connect Pelagus to view
          your listings.
        </p>
      </section>
    );
  }


  if (loading) {
    return <MarketLoading />;
  }


  if (!listings.length) {
    return (
      <section className="market-empty">
        <h2>
          NO LISTINGS YET
        </h2>

        <p>
          Resources you list for
          sale will appear here.
        </p>
      </section>
    );
  }


  return (
    <div className="market-listing-grid">

      {listings.map(
        (listing) => (
          <article
            key={
              listing.id
            }
            className="market-listing-card"
          >

            <div className="market-listing-title">

              <small>
                LISTING #
                {listing.id}
              </small>

              <h3>
                {listing.amount}{" "}
                {
                  listing.resourceName
                }
              </h3>

            </div>


            <div className="market-listing-price">

              <small>
                PRICE
              </small>

              <strong>
                {listing.price} GD
              </strong>

            </div>


            <div
              className={`market-listing-status ${
                listing.active
                  ? "active"
                  : "closed"
              }`}
            >
              {listing.active
                ? "ACTIVE"
                : listing.buyer !==
                    "0x0000000000000000000000000000000000000000"
                  ? "SOLD"
                  : "CANCELLED"}
            </div>


            {listing.active ? (
              <button
                type="button"
                className="market-cancel-button"
                onClick={() =>
                  onCancel(listing)
                }
              >
                CANCEL LISTING
              </button>
            ) : null}

          </article>
        )
      )}

    </div>
  );
}


function MarketLoading() {
  return (
    <section className="market-empty">
      <h2>
        LOADING MARKET...
      </h2>
    </section>
  );
}


function MarketEmpty() {
  return (
    <section className="market-empty">

      <div className="market-empty-icon">
        ⛏
      </div>

      <h2>
        THE MARKET IS QUIET
      </h2>

      <p>
        No active resource
        listings found.
      </p>

    </section>
  );
}
