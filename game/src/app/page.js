"use client";

import {
  useEffect,
  useState,
} from "react";

import GameShell from "@/components/GameShell";
import GameCamp from "@/components/game/GameCamp";
import MinerSelectScreen from "@/components/game/MinerSelectScreen";

import {
  useGameWallet,
} from "@/components/GameWalletProvider";

import {
  claimGameLoot,
  getActiveExpeditionData,
  getGameContract,
  getGameMines,
  getGoldDustBalance,
  getMinerGameData,
  getNextBackpackUpgrade,
  getNextPickaxeUpgrade,
  startGameExpedition,
  upgradeGameBackpack,
  upgradeGamePickaxe,
} from "@/lib/gameContract";

import {
  loadOwnedMiners,
} from "@/lib/collection";

import {
  getNftContract,
} from "@/lib/nftContract";

import {
  ipfsToGateway,
} from "@/lib/ipfs";

import {
  parseQuai,
} from "quais";

const MINT_SITE_URL =
  process.env
    .NEXT_PUBLIC_MINT_SITE_URL;

function getMinerDisplay(
  miner
) {
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

export default function GamePage() {
  const {
    wallet,
    provider,
    signer,
    walletError,
    connecting,
    handleConnectWallet,
  } = useGameWallet();

  const [goldDust, setGoldDust] =
    useState(0);

  const [miners, setMiners] =
    useState([]);

  const [buyingGoldDust, setBuyingGoldDust] =
    useState(false);

  const [gdError, setGdError] =
    useState("");

  const [gdSuccess, setGdSuccess] =
    useState("");

  const [
    selectedMiner,
    setSelectedMiner,
  ] = useState(null);

  const [
    selectedMinerGame,
    setSelectedMinerGame,
  ] = useState(null);

  const [
    gameMines,
    setGameMines,
  ] = useState([]);

  const [
    loadingMinerGame,
    setLoadingMinerGame,
  ] = useState(false);

  const [
    selectedMine,
    setSelectedMine,
  ] = useState(null);

  const [
    activeExpedition,
    setActiveExpedition,
  ] = useState(null);

  const [
    startingExpedition,
    setStartingExpedition,
  ] = useState(false);

  const [
    expeditionError,
    setExpeditionError,
  ] = useState("");

  const [
    expeditionSuccess,
    setExpeditionSuccess,
  ] = useState("");

  const [
    timeRemaining,
    setTimeRemaining,
  ] = useState(0);

  const [
    claimingLoot,
    setClaimingLoot,
  ] = useState(false);

  const [
    claimError,
    setClaimError,
  ] = useState("");

  const [
    claimedLoot,
    setClaimedLoot,
  ] = useState(null);

  const [
    restTimeRemaining,
    setRestTimeRemaining,
  ] = useState(0);

  const [
    pickaxeUpgrade,
    setPickaxeUpgrade,
  ] = useState(null);

  const [
    loadingPickaxeUpgrade,
    setLoadingPickaxeUpgrade,
  ] = useState(false);

  const [
    upgradingPickaxe,
    setUpgradingPickaxe,
  ] = useState(false);

  const [
    pickaxeUpgradeError,
    setPickaxeUpgradeError,
  ] = useState("");

  const [
    pickaxeUpgradeSuccess,
    setPickaxeUpgradeSuccess,
  ] = useState("");

  const [
    backpackUpgrade,
    setBackpackUpgrade,
  ] = useState(null);

  const [
    loadingBackpackUpgrade,
    setLoadingBackpackUpgrade,
  ] = useState(false);

  const [
    upgradingBackpack,
    setUpgradingBackpack,
  ] = useState(false);

  const [
    backpackUpgradeError,
    setBackpackUpgradeError,
  ] = useState("");

  const [
    backpackUpgradeSuccess,
    setBackpackUpgradeSuccess,
  ] = useState("");

  const [
    showCamp,
    setShowCamp,
  ] = useState(false);

  async function loadGoldDust(
    currentProvider,
    address
  ) {
    try {
      const balance =
        await getGoldDustBalance(
          currentProvider,
          address
        );

      setGoldDust(
        balance
      );
    } catch (error) {
      console.error(
        "Failed to load Gold Dust:",
        error
      );
    }
  }

  async function loadWalletGameData(
    currentProvider,
    address
  ) {
    await loadGoldDust(
      currentProvider,
      address
    );

    const mines =
      await getGameMines(
        currentProvider
      );

    setGameMines(
      mines
    );

    const nftContract =
      getNftContract(
        currentProvider
      );

    const owned =
      await loadOwnedMiners(
        nftContract,
        address
      );

    setMiners(
      owned.map(
        getMinerDisplay
      )
    );
  }

  async function handleEnterCamp(
    miner
  ) {
    await handleSelectMiner(
      miner
    );

    setShowCamp(true);
  }

  function handleChangeMiner() {
    setShowCamp(false);
    setSelectedMine(null);
    setExpeditionError("");
    setExpeditionSuccess("");
  }

  async function handleRefreshAfterRewardMine() {
    if (!provider || !wallet) {
      return;
    }

    try {
      const updatedGoldDust =
        await getGoldDustBalance(
          provider,
          wallet
        );

      setGoldDust(updatedGoldDust);

      if (selectedMiner) {
        const gameData =
          await getMinerGameData(
            provider,
            selectedMiner.tokenId
          );

        setSelectedMinerGame(
          gameData
        );

        setRestTimeRemaining(
          Math.max(
            0,
            Number(
              gameData.restUntil
            ) -
              Math.floor(
                Date.now() / 1000
              )
          )
        );

        const expedition =
          await getActiveExpeditionData(
            provider,
            selectedMiner.tokenId
          );

        if (
          expedition &&
          expedition.mineId > 0
        ) {
          const expedition =
            await getActiveExpeditionData(
              provider,
              selectedMiner.tokenId
            );

          setActiveExpedition(
            expedition
          );
        } else {
          setActiveExpedition(null);
        }
      }
    } catch (error) {
      console.error(
        "Failed to refresh after Reward Mine attack:",
        error
      );
    }
  }

  async function handleSelectMiner(
    miner
  ) {
    try {
      if (!provider) {
        throw new Error(
          "Connect wallet first."
        );
      }

      setLoadingMinerGame(
        true
      );

      setSelectedMiner(
        miner
      );

      setSelectedMine(null);
      setExpeditionError("");
      setExpeditionSuccess("");

      const gameData =
        await getMinerGameData(
          provider,
          miner.tokenId
        );

      setSelectedMinerGame(
        gameData
      );

      const expedition =
        await getActiveExpeditionData(
          provider,
          miner.tokenId
        );

      if (
        expedition &&
        expedition.mineId > 0
      ) {
        setActiveExpedition(
          expedition
        );
      } else {
        setActiveExpedition(
          null
        );
      }
    } catch (error) {
      console.error(
        "Failed to load miner game data:",
        error
      );
    } finally {
      setLoadingMinerGame(
        false
      );
    }
  }

  async function handleStartExpedition() {
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

      if (!selectedMiner) {
        throw new Error(
          "Select a miner first."
        );
      }

      if (!selectedMine) {
        throw new Error(
          "Select a mine first."
        );
      }

      if (
        selectedMinerGame.status !==
        0
      ) {
        throw new Error(
          "Miner is not ready."
        );
      }

      if (
        selectedMinerGame.power <
        selectedMine.requiredPower
      ) {
        throw new Error(
          "Mining power too low."
        );
      }

      if (
        goldDust <
        selectedMine.entryCost
      ) {
        throw new Error(
          "Not enough Gold Dust."
        );
      }

      setStartingExpedition(
        true
      );

      setExpeditionError("");
      setExpeditionSuccess("");

      await startGameExpedition(
        signer,
        selectedMiner.tokenId,
        selectedMine.id
      );

      setExpeditionSuccess(
        `${selectedMiner.name ||
          `Soapy #${selectedMiner.tokenId}`
        } entered ${selectedMine.name}.`
      );

      await loadGoldDust(
        provider,
        wallet
      );

      const updatedMiner =
        await getMinerGameData(
          provider,
          selectedMiner.tokenId
        );

      setSelectedMinerGame(
        updatedMiner
      );

      const expedition =
        await getActiveExpeditionData(
          provider,
          selectedMiner.tokenId
        );

      setActiveExpedition(
        expedition
      );

      setSelectedMine(null);
    } catch (error) {
      console.error(
        "Start expedition failed:",
        error
      );

      if (
        error?.code === 4001 ||
        error?.code ===
          "ACTION_REJECTED"
      ) {
        setExpeditionError(
          "Transaction rejected."
        );
      } else {
        setExpeditionError(
          error?.shortMessage ||
            error?.message ||
            "Failed to start expedition."
        );
      }
    } finally {
      setStartingExpedition(
        false
      );
    }
  }

  async function loadPickaxeUpgrade(
    currentProvider = provider,
    tokenId = selectedMiner?.tokenId
  ) {
    if (
      !currentProvider ||
      tokenId === undefined ||
      tokenId === null
    ) {
      setPickaxeUpgrade(null);
      return;
    }

    try {
      setLoadingPickaxeUpgrade(true);
      setPickaxeUpgradeError("");

      const upgrade =
        await getNextPickaxeUpgrade(
          currentProvider,
          tokenId
        );

      setPickaxeUpgrade(upgrade);
    } catch (error) {
      console.error(
        "Failed to load pickaxe upgrade:",
        error
      );

      setPickaxeUpgradeError(
        error?.shortMessage ||
          error?.message ||
          "Failed to load upgrade cost."
      );
    } finally {
      setLoadingPickaxeUpgrade(false);
    }
  }

  async function handleUpgradePickaxe() {
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

      if (!selectedMiner) {
        throw new Error(
          "Select a miner first."
        );
      }

      if (!selectedMinerGame) {
        throw new Error(
          "Miner game data unavailable."
        );
      }

      if (selectedMinerGame.status !== 0) {
        throw new Error(
          "Miner must be READY before upgrading."
        );
      }

      if (
        !pickaxeUpgrade ||
        pickaxeUpgrade.isMaxLevel
      ) {
        throw new Error(
          "Pickaxe is already at maximum level."
        );
      }

      if (
        goldDust <
        pickaxeUpgrade.goldDust
      ) {
        throw new Error(
          "Not enough Gold Dust."
        );
      }

      if (
        selectedMinerGame.ore <
        pickaxeUpgrade.ore
      ) {
        throw new Error(
          "Not enough Ore."
        );
      }

      if (
        selectedMinerGame.crystal <
        pickaxeUpgrade.crystal
      ) {
        throw new Error(
          "Not enough Crystal."
        );
      }

      if (
        selectedMinerGame.core <
        pickaxeUpgrade.core
      ) {
        throw new Error(
          "Not enough Core."
        );
      }

      setUpgradingPickaxe(true);
      setPickaxeUpgradeError("");
      setPickaxeUpgradeSuccess("");

      await upgradeGamePickaxe(
        signer,
        selectedMiner.tokenId
      );

      const [
        updatedMiner,
        updatedGoldDust,
        updatedUpgrade,
      ] = await Promise.all([
        getMinerGameData(
          provider,
          selectedMiner.tokenId
        ),
        getGoldDustBalance(
          provider,
          wallet
        ),
        getNextPickaxeUpgrade(
          provider,
          selectedMiner.tokenId
        ),
      ]);

      setSelectedMinerGame(updatedMiner);
      setGoldDust(updatedGoldDust);
      setPickaxeUpgrade(updatedUpgrade);

      setPickaxeUpgradeSuccess(
        `Pickaxe upgraded to Level ${updatedMiner.pickaxeLevel}. Mining Power is now ${updatedMiner.power}.`
      );
    } catch (error) {
      console.error(
        "Pickaxe upgrade failed:",
        error
      );

      setPickaxeUpgradeError(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Pickaxe upgrade failed."
      );
    } finally {
      setUpgradingPickaxe(false);
    }
  }

  async function loadBackpackUpgrade(
    currentProvider = provider,
    tokenId = selectedMiner?.tokenId
  ) {
    if (
      !currentProvider ||
      tokenId === undefined ||
      tokenId === null
    ) {
      setBackpackUpgrade(null);
      return;
    }

    try {
      setLoadingBackpackUpgrade(true);
      setBackpackUpgradeError("");

      const upgrade =
        await getNextBackpackUpgrade(
          currentProvider,
          tokenId
        );

      setBackpackUpgrade(upgrade);
    } catch (error) {
      console.error(
        "Failed to load Backpack upgrade:",
        error
      );

      setBackpackUpgradeError(
        error?.shortMessage ||
          error?.message ||
          "Failed to load Backpack upgrade."
      );
    } finally {
      setLoadingBackpackUpgrade(false);
    }
  }

  async function handleUpgradeBackpack() {
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

      if (!selectedMiner) {
        throw new Error(
          "Select a miner first."
        );
      }

      if (!selectedMinerGame) {
        throw new Error(
          "Miner data unavailable."
        );
      }

      if (selectedMinerGame.status !== 0) {
        throw new Error(
          "Miner must be READY before upgrading."
        );
      }

      if (
        !backpackUpgrade ||
        backpackUpgrade.isMaxLevel
      ) {
        throw new Error(
          "Backpack is already at maximum level."
        );
      }

      if (
        goldDust <
        backpackUpgrade.goldDust
      ) {
        throw new Error(
          "Not enough Gold Dust."
        );
      }

      if (
        selectedMinerGame.ore <
        backpackUpgrade.ore
      ) {
        throw new Error(
          "Not enough Ore."
        );
      }

      if (
        selectedMinerGame.crystal <
        backpackUpgrade.crystal
      ) {
        throw new Error(
          "Not enough Crystal."
        );
      }

      if (
        selectedMinerGame.core <
        backpackUpgrade.core
      ) {
        throw new Error(
          "Not enough Core."
        );
      }

      setUpgradingBackpack(true);
      setBackpackUpgradeError("");
      setBackpackUpgradeSuccess("");

      await upgradeGameBackpack(
        signer,
        selectedMiner.tokenId
      );

      const [
        updatedMiner,
        updatedGoldDust,
        updatedBackpackUpgrade,
      ] = await Promise.all([
        getMinerGameData(
          provider,
          selectedMiner.tokenId
        ),
        getGoldDustBalance(
          provider,
          wallet
        ),
        getNextBackpackUpgrade(
          provider,
          selectedMiner.tokenId
        ),
      ]);

      setSelectedMinerGame(updatedMiner);
      setGoldDust(updatedGoldDust);
      setBackpackUpgrade(
        updatedBackpackUpgrade
      );

      setBackpackUpgradeSuccess(
        `Backpack upgraded to Level ${updatedMiner.backpackLevel}. Capacity is now ${updatedMiner.backpackCapacity}.`
      );
    } catch (error) {
      console.error(
        "Backpack upgrade failed:",
        error
      );

      setBackpackUpgradeError(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          "Backpack upgrade failed."
      );
    } finally {
      setUpgradingBackpack(false);
    }
  }

  async function handleClaimLoot() {
    try {
      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!activeExpedition) {
        throw new Error(
          "No active expedition."
        );
      }

      if (!selectedMiner) {
        throw new Error(
          "No miner selected."
        );
      }

      setClaimingLoot(true);
      setClaimError("");

      const expeditionId =
        activeExpedition.id;

      const mineId =
        activeExpedition.mineId;

      // claimLoot takes the miner tokenId, not the
      // expedition/mine id.
      await claimGameLoot(
        signer,
        selectedMiner.tokenId
      );

      /*
        Refresh miner state from chain.
      */

      const updatedMiner =
        await getMinerGameData(
          provider,
          selectedMiner.tokenId
        );

      setSelectedMinerGame(
        updatedMiner
      );

      /*
        Temporary displayed loot.
        This matches current contract
        deterministic test rewards.
      */

      let loot;

      if (mineId === 1) {
        loot = {
          ore: 100,
          crystal: 5,
          core: 0,
          xp: 100,
        };
      } else if (mineId === 2) {
        loot = {
          ore: 200,
          crystal: 15,
          core: 1,
          xp: 250,
        };
      } else {
        loot = {
          ore: 350,
          crystal: 30,
          core: 3,
          xp: 600,
        };
      }

      setClaimedLoot(loot);

      /*
        Expedition no longer active
        after successful claim.
      */

      setActiveExpedition(null);
    } catch (error) {
      console.error(
        "Claim loot failed:",
        error
      );

      setClaimError(
        error?.shortMessage ||
          error?.message ||
          "Failed to claim loot."
      );
    } finally {
      setClaimingLoot(false);
    }
  }

  async function buyGoldDust(
    quaiAmount
  ) {
    try {
      if (!wallet) {
        throw new Error(
          "Connect your wallet first."
        );
      }

      if (!signer) {
        throw new Error(
          "Wallet signer not available."
        );
      }

      setBuyingGoldDust(true);

      setGdError("");
      setGdSuccess("");

      const contract =
        getGameContract(
          signer
        );

      const tx =
        await contract.buyGoldDust({
          value:
            parseQuai(
              String(
                quaiAmount
              )
            ),
        });

      await tx.wait();

      setGdSuccess(
        `Gold Dust received! +${quaiAmount * 10} GD`
      );

      await loadGoldDust(
        provider,
        wallet
      );
    } catch (error) {
      console.error(
        "Gold Dust purchase failed:",
        error
      );

      if (
        error?.code === 4001 ||
        error?.code ===
          "ACTION_REJECTED"
      ) {
        setGdError(
          "Transaction rejected."
        );
      } else {
        setGdError(
          error?.shortMessage ||
            error?.message ||
            "Gold Dust purchase failed."
        );
      }
    } finally {
      setBuyingGoldDust(false);
    }
  }

  useEffect(() => {
    if (wallet && provider) {
      loadWalletGameData(
        provider,
        wallet
      );
    } else {
      setGoldDust(0);
      setMiners([]);
      setGameMines([]);
      setSelectedMiner(null);
      setSelectedMinerGame(null);
      setSelectedMine(null);
      setActiveExpedition(null);
      setExpeditionError("");
      setExpeditionSuccess("");
      setTimeRemaining(0);
      setRestTimeRemaining(0);
      setGdError("");
      setGdSuccess("");
      setClaimError("");
      setClaimedLoot(null);
      setClaimingLoot(false);
      setPickaxeUpgrade(null);
      setPickaxeUpgradeError("");
      setPickaxeUpgradeSuccess("");
      setLoadingPickaxeUpgrade(false);
      setUpgradingPickaxe(false);
      setBackpackUpgrade(null);
      setBackpackUpgradeError("");
      setBackpackUpgradeSuccess("");
      setLoadingBackpackUpgrade(false);
      setUpgradingBackpack(false);
      setShowCamp(false);
    }
  }, [wallet, provider]);

  useEffect(() => {
    if (!provider || !selectedMiner) {
      setPickaxeUpgrade(null);
      setBackpackUpgrade(null);
      setPickaxeUpgradeSuccess("");
      setBackpackUpgradeSuccess("");
      return;
    }

    setPickaxeUpgradeSuccess("");
    setBackpackUpgradeSuccess("");

    loadPickaxeUpgrade(
      provider,
      selectedMiner.tokenId
    );

    loadBackpackUpgrade(
      provider,
      selectedMiner.tokenId
    );
  }, [provider, selectedMiner?.tokenId]);

  useEffect(() => {
    if (!activeExpedition) {
      setTimeRemaining(0);
      return;
    }

    function updateTimer() {
      const now =
        Math.floor(
          Date.now() / 1000
        );

      const remaining =
        Math.max(
          activeExpedition.endsAt -
            now,
          0
        );

      setTimeRemaining(
        remaining
      );

      if (
        remaining === 0 &&
        selectedMiner &&
        provider &&
        selectedMinerGame?.status === 1
      ) {
        getMinerGameData(
          provider,
          selectedMiner.tokenId
        ).then(
          (updated) => {
            setSelectedMinerGame(
              updated
            );
          }
        );
      }
    }

    updateTimer();

    const interval =
      setInterval(
        updateTimer,
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    activeExpedition,
    provider,
    selectedMiner,
    selectedMinerGame?.status,
  ]);

  useEffect(() => {
    const restUntil =
      selectedMinerGame?.restUntil ?? 0;

    if (!restUntil) {
      setRestTimeRemaining(0);
      return;
    }

    function updateRestTimer() {
      const now =
        Math.floor(Date.now() / 1000);

      const remaining =
        Math.max(restUntil - now, 0);

      setRestTimeRemaining(remaining);
    }

    updateRestTimer();

    const interval = setInterval(
      updateRestTimer,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [selectedMinerGame?.restUntil]);

  useEffect(() => {
    if (!selectedMiner) {
      return;
    }

    if (!provider) {
      return;
    }

    if (!selectedMinerGame) {
      return;
    }

    const wasResting =
      selectedMinerGame.status === 3;

    const restFinished =
      wasResting &&
      selectedMinerGame.restUntil > 0 &&
      restTimeRemaining === 0;

    if (!restFinished) {
      return;
    }

    let cancelled = false;

    async function refreshMinerAfterRest() {
      try {
        const updatedMiner =
          await getMinerGameData(
            provider,
            selectedMiner.tokenId
          );

        if (!cancelled) {
          setSelectedMinerGame(
            updatedMiner
          );
        }
      } catch (error) {
        console.error(
          "Failed to refresh miner after rest:",
          error
        );
      }
    }

    refreshMinerAfterRest();

    return () => {
      cancelled = true;
    };
  }, [
    restTimeRemaining,
    selectedMiner,
    selectedMinerGame,
    provider,
  ]);

  return (
    <GameShell
      goldDust={goldDust}
      campMode
    >
      {wallet &&
      miners.length > 0 &&
      !showCamp ? (
        <MinerSelectScreen
          miners={miners}
          goldDust={goldDust}
          initialMiner={
            selectedMiner
          }
          loading={
            loadingMinerGame
          }
          onConfirm={
            handleEnterCamp
          }
        />
      ) : (
        <GameCamp
          goldDust={goldDust}
          buyingGoldDust={
            buyingGoldDust
          }
          gdError={gdError}
          gdSuccess={gdSuccess}
          onBuyGoldDust={
            buyGoldDust
          }
          miners={miners}
          miner={selectedMiner}
          minerGame={
            selectedMinerGame
          }
          loadingMinerGame={
            loadingMinerGame
          }
          onSelectMiner={
            handleSelectMiner
          }
          gameMines={gameMines}
          selectedMine={
            selectedMine
          }
          onSelectMine={
            setSelectedMine
          }
          startingExpedition={
            startingExpedition
          }
          expeditionError={
            expeditionError
          }
          expeditionSuccess={
            expeditionSuccess
          }
          onStartExpedition={
            handleStartExpedition
          }
          activeExpedition={
            activeExpedition
          }
          timeRemaining={
            timeRemaining
          }
          restTimeRemaining={
            restTimeRemaining
          }
          onClaimLoot={
            handleClaimLoot
          }
          claimingLoot={
            claimingLoot
          }
          claimError={
            claimError
          }
          claimedLoot={
            claimedLoot
          }
          onCloseClaimedLoot={() =>
            setClaimedLoot(null)
          }
          pickaxeUpgrade={
            pickaxeUpgrade
          }
          loadingPickaxeUpgrade={
            loadingPickaxeUpgrade
          }
          upgradingPickaxe={
            upgradingPickaxe
          }
          pickaxeUpgradeError={
            pickaxeUpgradeError
          }
          pickaxeUpgradeSuccess={
            pickaxeUpgradeSuccess
          }
          onUpgradePickaxe={
            handleUpgradePickaxe
          }
          backpackUpgrade={
            backpackUpgrade
          }
          loadingBackpackUpgrade={
            loadingBackpackUpgrade
          }
          upgradingBackpack={
            upgradingBackpack
          }
          backpackUpgradeError={
            backpackUpgradeError
          }
          backpackUpgradeSuccess={
            backpackUpgradeSuccess
          }
          onUpgradeBackpack={
            handleUpgradeBackpack
          }
          wallet={wallet}
          provider={provider}
          signer={signer}
          connecting={connecting}
          walletError={walletError}
          onConnectWallet={
            handleConnectWallet
          }
          mintSiteUrl={
            MINT_SITE_URL
          }
          onChangeMiner={
            handleChangeMiner
          }
          onRefreshGame={
            handleRefreshAfterRewardMine
          }
        />
      )}
    </GameShell>
  );
}
