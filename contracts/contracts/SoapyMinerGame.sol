// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISoapyMiners {
    function ownerOf(
        uint256 tokenId
    )
        external
        view
        returns (address);
}

contract SoapyMinerGame is
    Ownable,
    ReentrancyGuard
{
    /* =====================================================
                        CUSTOM ERRORS
    ===================================================== */

    error NotMinerOwner();
    error MinerNotReady();
    error InvalidMine();
    error MineInactive();
    error InsufficientGoldDust();
    error InsufficientPower();
    error ExpeditionAlreadyActive();
    error NoActiveExpedition();
    error ExpeditionNotFinished();
    error BackpackFull();
    error InvalidAmount();
    error UnauthorizedMarketplace();
    error UnauthorizedRewardMine();
    error InsufficientOre();
    error InsufficientCrystal();
    error InsufficientCore();
    error PickaxeMaxLevel();
    error BackpackMaxLevel();
    error NothingToWithdraw();
    error InvalidNft();
    error InvalidRate();
    error UnsupportedMine();
    error SendQuai();


    /* =====================================================
                        NFT CONTRACT
    ===================================================== */

    ISoapyMiners public immutable soapyMiners;


    /* =====================================================
                        GOLD DUST
    ===================================================== */

    uint256 public goldDustPerQuai = 10;

    mapping(address => uint256)
        public goldDust;


    /* =====================================================
                        MINER STATE
    ===================================================== */

    struct MinerState {
        uint64 xp;
        uint64 restUntil;

        uint8 pickaxeLevel;
        uint8 backpackLevel;
    }

    mapping(uint256 => MinerState)
        public miners;


    /* =====================================================
                        INVENTORY
    ===================================================== */

    struct Inventory {
        uint64 ore;
        uint64 crystal;
        uint64 core;
    }

    mapping(uint256 => Inventory)
        public inventories;


    /* =====================================================
                    RESOURCE TYPES
    ===================================================== */

    enum ResourceType {
        ORE,
        CRYSTAL,
        CORE
    }


    /* =====================================================
                        MARKETPLACE
    ===================================================== */

    address public marketplace;

    address public rewardMine;


    /* =====================================================
                        PICKAXE UPGRADES
    ===================================================== */

    struct PickaxeUpgradeCost {
        uint256 goldDust;
        uint256 ore;
        uint256 crystal;
        uint256 core;
    }

    mapping(uint256 => PickaxeUpgradeCost)
        public pickaxeUpgradeCosts;

    uint256 public constant MAX_PICKAXE_LEVEL = 5;


    /* =====================================================
                    BACKPACK UPGRADES
    ===================================================== */

    struct BackpackUpgradeCost {
        uint256 goldDust;
        uint256 ore;
        uint256 crystal;
        uint256 core;
    }

    mapping(uint256 => BackpackUpgradeCost)
        public backpackUpgradeCosts;

    uint256 public constant MAX_BACKPACK_LEVEL = 5;


    /* =====================================================
                            MINES
    ===================================================== */

    struct Mine {
        string name;

        uint256 duration;

        uint256 entryCost;

        uint256 requiredPower;

        uint256 xpReward;

        bool active;
    }

    mapping(uint256 => Mine)
        public mines;

    uint256 public mineCount;


    /* =====================================================
                        EXPEDITIONS
    ===================================================== */

    struct ActiveExpedition {
        uint64 endsAt;
        uint32 mineId;
    }

    mapping(uint256 => ActiveExpedition)
        public activeExpeditions;


    enum MinerStatus {
        READY,
        MINING,
        CLAIMABLE,
        RESTING
    }


    /* =====================================================
                            EVENTS
    ===================================================== */

    event GoldDustPurchased(
        address indexed player,
        uint256 quaiPaid,
        uint256 goldDustReceived
    );

    event MineUpdated(
        uint256 indexed mineId,
        string name,
        uint256 duration,
        uint256 entryCost,
        uint256 requiredPower,
        uint256 xpReward,
        bool active
    );

    event ExpeditionStarted(
        address indexed player,
        uint256 indexed tokenId,
        uint256 indexed mineId,
        uint256 endsAt
    );

    event LootClaimed(
        address indexed player,
        uint256 indexed tokenId,
        uint256 indexed mineId,
        uint256 ore,
        uint256 crystal,
        uint256 core,
        uint256 xp,
        uint256 restUntil
    );

    event PickaxeUpgraded(
        uint256 indexed tokenId,
        address indexed player,
        uint256 previousLevel,
        uint256 newLevel,
        uint256 newMiningPower,
        uint256 goldDustSpent,
        uint256 oreSpent,
        uint256 crystalSpent,
        uint256 coreSpent
    );

    event BackpackUpgraded(
        uint256 indexed tokenId,
        address indexed player,
        uint256 previousLevel,
        uint256 newLevel,
        uint256 newCapacity,
        uint256 goldDustSpent,
        uint256 oreSpent,
        uint256 crystalSpent,
        uint256 coreSpent
    );

    event MarketplaceUpdated(
        address indexed previousMarketplace,
        address indexed newMarketplace
    );

    event RewardMineUpdated(
        address indexed previousRewardMine,
        address indexed newRewardMine
    );

    event MarketplaceResourceLocked(
        address indexed seller,
        uint256 indexed tokenId,
        ResourceType resourceType,
        uint256 amount
    );

    event MarketplaceResourceReturned(
        uint256 indexed tokenId,
        ResourceType resourceType,
        uint256 amount
    );

    event MarketplaceTradeSettled(
        address indexed buyer,
        address indexed seller,
        uint256 indexed buyerTokenId,
        ResourceType resourceType,
        uint256 resourceAmount,
        uint256 price,
        uint256 marketplaceFee
    );


    /* =====================================================
                        CONSTRUCTOR
    ===================================================== */

    constructor(
        address nftContract
    )
        Ownable(msg.sender)
    {
        if (nftContract == address(0)) {
            revert InvalidNft();
        }

        soapyMiners =
            ISoapyMiners(
                nftContract
            );


        /*
            TEST CONFIGURATION

            Basic:
            2 minutes

            Deep:
            5 minutes

            Ancient:
            10 minutes
        */

        _createMine(
            "Basic Shaft",
            2 minutes,
            50,
            0,
            100
        );

        _createMine(
            "Deep Mine",
            5 minutes,
            70,
            20,
            250
        );

        _createMine(
            "Ancient Depths",
            10 minutes,
            100,
            50,
            600
        );


        /*
            PICKAXE UPGRADE COSTS

            Key represents the destination level.
        */

        pickaxeUpgradeCosts[2] =
            PickaxeUpgradeCost({
                goldDust: 20,
                ore: 50,
                crystal: 5,
                core: 0
            });

        pickaxeUpgradeCosts[3] =
            PickaxeUpgradeCost({
                goldDust: 40,
                ore: 150,
                crystal: 15,
                core: 1
            });

        pickaxeUpgradeCosts[4] =
            PickaxeUpgradeCost({
                goldDust: 80,
                ore: 300,
                crystal: 35,
                core: 3
            });

        pickaxeUpgradeCosts[5] =
            PickaxeUpgradeCost({
                goldDust: 150,
                ore: 600,
                crystal: 75,
                core: 8
            });


        /*
            BACKPACK UPGRADE COSTS

            Key represents the destination level.
        */

        backpackUpgradeCosts[2] =
            BackpackUpgradeCost({
                goldDust: 20,
                ore: 75,
                crystal: 5,
                core: 0
            });

        backpackUpgradeCosts[3] =
            BackpackUpgradeCost({
                goldDust: 45,
                ore: 200,
                crystal: 20,
                core: 1
            });

        backpackUpgradeCosts[4] =
            BackpackUpgradeCost({
                goldDust: 90,
                ore: 400,
                crystal: 45,
                core: 4
            });

        backpackUpgradeCosts[5] =
            BackpackUpgradeCost({
                goldDust: 175,
                ore: 800,
                crystal: 100,
                core: 10
            });
    }


    /* =====================================================
                        GOLD DUST
    ===================================================== */

    function buyGoldDust()
        external
        payable
        nonReentrant
    {
        if (msg.value == 0) {
            revert SendQuai();
        }

        /*
            Native token uses 18 decimals.

            Example:

            1 QUAI
            =
            10 GD
        */

        uint256 amount =
            (
                msg.value *
                goldDustPerQuai
            )
            /
            1 ether;

        require(
            amount > 0,
            "Amount too small"
        );

        goldDust[msg.sender]
            += amount;

        emit GoldDustPurchased(
            msg.sender,
            msg.value,
            amount
        );
    }


    /* =====================================================
                    MINER OWNERSHIP
    ===================================================== */

    modifier onlyMarketplace() {
        if (msg.sender != marketplace) {
            revert UnauthorizedMarketplace();
        }

        _;
    }

    modifier onlyRewardMine() {
        if (msg.sender != rewardMine) {
            revert UnauthorizedRewardMine();
        }

        _;
    }

    function ownsMiner(
        address player,
        uint256 tokenId
    )
        public
        view
        returns (bool)
    {
        try soapyMiners.ownerOf(
            tokenId
        )
        returns (
            address nftOwner
        ) {
            return
                nftOwner ==
                player;
        }
        catch {
            return false;
        }
    }


    /* =====================================================
                        MINER LEVEL
    ===================================================== */

    function getMinerLevel(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        uint256 xp =
            miners[tokenId].xp;

        if (xp >= 1500) {
            return 5;
        }

        if (xp >= 700) {
            return 4;
        }

        if (xp >= 300) {
            return 3;
        }

        if (xp >= 100) {
            return 2;
        }

        return 1;
    }


    /* =====================================================
                    MINING POWER
    ===================================================== */

    function getPickaxeLevel(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        uint256 level =
            miners[tokenId]
                .pickaxeLevel;

        if (level == 0) {
            return 1;
        }

        return level;
    }

    function getMiningPower(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        return
            getPickaxeLevel(tokenId)
            * 10;
    }

    function getNextPickaxeUpgradeCost(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 nextLevel,
            uint256 goldDustCost,
            uint256 oreCost,
            uint256 crystalCost,
            uint256 coreCost
        )
    {
        uint256 currentLevel =
            getPickaxeLevel(tokenId);

        require(
            currentLevel <
                MAX_PICKAXE_LEVEL,
            "Pickaxe already max level"
        );

        nextLevel =
            currentLevel + 1;

        PickaxeUpgradeCost storage cost =
            pickaxeUpgradeCosts[
                nextLevel
            ];

        return (
            nextLevel,
            cost.goldDust,
            cost.ore,
            cost.crystal,
            cost.core
        );
    }

    function upgradePickaxe(
        uint256 tokenId
    )
        external
        nonReentrant
    {
        require(
            ownsMiner(
                msg.sender,
                tokenId
            ),
            "You do not own this miner"
        );

        require(
            getMinerStatus(tokenId) ==
                MinerStatus.READY,
            "Miner must be ready"
        );

        uint256 currentLevel =
            getPickaxeLevel(tokenId);

        require(
            currentLevel <
                MAX_PICKAXE_LEVEL,
            "Pickaxe already max level"
        );

        uint256 nextLevel =
            currentLevel + 1;

        PickaxeUpgradeCost storage cost =
            pickaxeUpgradeCosts[
                nextLevel
            ];

        Inventory storage inventory =
            inventories[tokenId];


        /* =====================================================
                            BALANCE CHECKS
        ===================================================== */

        require(
            goldDust[msg.sender] >=
                cost.goldDust,
            "Not enough Gold Dust"
        );

        require(
            inventory.ore >=
                cost.ore,
            "Not enough Ore"
        );

        require(
            inventory.crystal >=
                cost.crystal,
            "Not enough Crystal"
        );

        require(
            inventory.core >=
                cost.core,
            "Not enough Core"
        );


        /* =====================================================
                            DEDUCT COSTS
        ===================================================== */

        goldDust[msg.sender] -=
            cost.goldDust;

        inventory.ore -=
            uint64(cost.ore);

        inventory.crystal -=
            uint64(cost.crystal);

        inventory.core -=
            uint64(cost.core);


        /* =====================================================
                            APPLY UPGRADE
        ===================================================== */

        miners[tokenId]
            .pickaxeLevel =
                uint8(nextLevel);


        emit PickaxeUpgraded(
            tokenId,
            msg.sender,
            currentLevel,
            nextLevel,
            nextLevel * 10,
            cost.goldDust,
            cost.ore,
            cost.crystal,
            cost.core
        );
    }


    /* =====================================================
                    BACKPACK UPGRADES
    ===================================================== */

    function getBackpackLevel(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        uint256 level =
            miners[tokenId]
                .backpackLevel;

        if (level == 0) {
            return 1;
        }

        return level;
    }

    function getBackpackCapacity(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        uint256 level =
            getBackpackLevel(tokenId);

        return
            500 +
            (level * 500);
    }

    function getInventoryTotal(
        uint256 tokenId
    )
        public
        view
        returns (uint256)
    {
        Inventory storage inventory =
            inventories[tokenId];

        return
            inventory.ore +
            inventory.crystal +
            inventory.core;
    }

    function getNextBackpackUpgradeCost(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 nextLevel,
            uint256 goldDustCost,
            uint256 oreCost,
            uint256 crystalCost,
            uint256 coreCost
        )
    {
        uint256 currentLevel =
            getBackpackLevel(tokenId);

        require(
            currentLevel <
                MAX_BACKPACK_LEVEL,
            "Backpack already max level"
        );

        nextLevel =
            currentLevel + 1;

        BackpackUpgradeCost storage cost =
            backpackUpgradeCosts[
                nextLevel
            ];

        return (
            nextLevel,
            cost.goldDust,
            cost.ore,
            cost.crystal,
            cost.core
        );
    }

    function upgradeBackpack(
        uint256 tokenId
    )
        external
        nonReentrant
    {
        require(
            ownsMiner(
                msg.sender,
                tokenId
            ),
            "You do not own this miner"
        );

        require(
            getMinerStatus(tokenId) ==
                MinerStatus.READY,
            "Miner must be ready"
        );

        uint256 currentLevel =
            getBackpackLevel(tokenId);

        require(
            currentLevel <
                MAX_BACKPACK_LEVEL,
            "Backpack already max level"
        );

        uint256 nextLevel =
            currentLevel + 1;

        BackpackUpgradeCost storage cost =
            backpackUpgradeCosts[
                nextLevel
            ];

        Inventory storage inventory =
            inventories[tokenId];


        /* =====================================================
                            BALANCE CHECKS
        ===================================================== */

        require(
            goldDust[msg.sender] >=
                cost.goldDust,
            "Not enough Gold Dust"
        );

        require(
            inventory.ore >=
                cost.ore,
            "Not enough Ore"
        );

        require(
            inventory.crystal >=
                cost.crystal,
            "Not enough Crystal"
        );

        require(
            inventory.core >=
                cost.core,
            "Not enough Core"
        );


        /* =====================================================
                            DEDUCT COSTS
        ===================================================== */

        goldDust[msg.sender] -=
            cost.goldDust;

        inventory.ore -=
            uint64(cost.ore);

        inventory.crystal -=
            uint64(cost.crystal);

        inventory.core -=
            uint64(cost.core);


        /* =====================================================
                            APPLY UPGRADE
        ===================================================== */

        miners[tokenId]
            .backpackLevel =
                uint8(nextLevel);


        emit BackpackUpgraded(
            tokenId,
            msg.sender,
            currentLevel,
            nextLevel,
            getBackpackCapacity(tokenId),
            cost.goldDust,
            cost.ore,
            cost.crystal,
            cost.core
        );
    }


    /* =====================================================
                    MARKETPLACE BRIDGE
    ===================================================== */

    function marketplaceLockResource(
        address seller,
        uint256 sellerTokenId,
        ResourceType resourceType,
        uint256 amount
    )
        external
        onlyMarketplace
    {
        if (seller == address(0)) {
            revert InvalidAmount();
        }

        if (
            amount == 0 ||
            amount > type(uint64).max
        ) {
            revert InvalidAmount();
        }

        if (
            !ownsMiner(
                seller,
                sellerTokenId
            )
        ) {
            revert NotMinerOwner();
        }

        Inventory storage inventory =
            inventories[sellerTokenId];

        uint64 locked =
            uint64(amount);

        if (
            resourceType ==
            ResourceType.ORE
        ) {
            if (inventory.ore < locked) {
                revert InsufficientOre();
            }

            inventory.ore -= locked;
        }
        else if (
            resourceType ==
            ResourceType.CRYSTAL
        ) {
            if (
                inventory.crystal < locked
            ) {
                revert InsufficientCrystal();
            }

            inventory.crystal -= locked;
        }
        else if (
            resourceType ==
            ResourceType.CORE
        ) {
            if (inventory.core < locked) {
                revert InsufficientCore();
            }

            inventory.core -= locked;
        }
        else {
            revert InvalidAmount();
        }

        emit MarketplaceResourceLocked(
            seller,
            sellerTokenId,
            resourceType,
            amount
        );
    }

    function marketplaceReturnResource(
        address seller,
        uint256 returnTokenId,
        ResourceType resourceType,
        uint256 amount
    )
        external
        onlyMarketplace
    {
        require(
            seller != address(0),
            "Invalid seller"
        );

        require(
            amount > 0,
            "Invalid amount"
        );

        require(
            ownsMiner(
                seller,
                returnTokenId
            ),
            "Seller does not own return miner"
        );

        if (
            amount == 0 ||
            amount > type(uint64).max
        ) {
            revert InvalidAmount();
        }

        Inventory storage inventory =
            inventories[returnTokenId];

        uint64 returned =
            uint64(amount);

        if (
            resourceType ==
            ResourceType.ORE
        ) {
            inventory.ore += returned;
        }
        else if (
            resourceType ==
            ResourceType.CRYSTAL
        ) {
            inventory.crystal += returned;
        }
        else if (
            resourceType ==
            ResourceType.CORE
        ) {
            inventory.core += returned;
        }
        else {
            revert InvalidAmount();
        }

        emit MarketplaceResourceReturned(
            returnTokenId,
            resourceType,
            amount
        );
    }

    function marketplaceSettleTrade(
        address buyer,
        address seller,
        uint256 buyerTokenId,
        ResourceType resourceType,
        uint256 resourceAmount,
        uint256 totalPrice,
        uint256 marketplaceFee
    )
        external
        onlyMarketplace
    {
        require(
            buyer != address(0),
            "Invalid buyer"
        );

        require(
            seller != address(0),
            "Invalid seller"
        );

        require(
            buyer != seller,
            "Cannot buy own listing"
        );

        require(
            resourceAmount > 0,
            "Invalid resource amount"
        );

        require(
            totalPrice > 0,
            "Invalid price"
        );

        require(
            marketplaceFee <= totalPrice,
            "Invalid marketplace fee"
        );

        require(
            ownsMiner(
                buyer,
                buyerTokenId
            ),
            "Buyer does not own miner"
        );

        require(
            goldDust[buyer] >= totalPrice,
            "Not enough Gold Dust"
        );

        uint256 currentInventory =
            getInventoryTotal(
                buyerTokenId
            );

        uint256 capacity =
            getBackpackCapacity(
                buyerTokenId
            );

        require(
            currentInventory +
                resourceAmount <=
                capacity,
            "Buyer backpack full"
        );

        /*
            Deduct the full purchase price.
        */

        goldDust[buyer] -=
            totalPrice;

        /*
            Marketplace fee is burned by
            not crediting it to any wallet.
        */

        uint256 sellerAmount =
            totalPrice -
            marketplaceFee;

        goldDust[seller] +=
            sellerAmount;

        /*
            Credit purchased resources to
            the buyer's selected Soapy.
        */

        if (resourceAmount > type(uint64).max) {
            revert InvalidAmount();
        }

        Inventory storage buyerInventory =
            inventories[buyerTokenId];

        uint64 credited =
            uint64(resourceAmount);

        if (
            resourceType ==
            ResourceType.ORE
        ) {
            buyerInventory.ore +=
                credited;
        }
        else if (
            resourceType ==
            ResourceType.CRYSTAL
        ) {
            buyerInventory.crystal +=
                credited;
        }
        else if (
            resourceType ==
            ResourceType.CORE
        ) {
            buyerInventory.core +=
                credited;
        }
        else {
            revert InvalidAmount();
        }

        emit MarketplaceTradeSettled(
            buyer,
            seller,
            buyerTokenId,
            resourceType,
            resourceAmount,
            totalPrice,
            marketplaceFee
        );
    }


    /* =====================================================
                    REWARD MINE BRIDGE
    ===================================================== */

    function canEnterRewardMine(
        address player,
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        if (
            !ownsMiner(
                player,
                tokenId
            )
        ) {
            return false;
        }

        return
            getMinerStatus(tokenId) ==
            MinerStatus.READY;
    }

    function getRewardAttackState(
        address player,
        uint256 tokenId
    )
        external
        view
        returns (
            bool owns,
            uint8 status,
            uint8 level,
            uint8 pickaxeLevel,
            uint256 gdBalance
        )
    {
        owns =
            ownsMiner(
                player,
                tokenId
            );

        status =
            uint8(
                getMinerStatus(tokenId)
            );

        level =
            uint8(
                getMinerLevel(tokenId)
            );

        pickaxeLevel =
            uint8(
                getPickaxeLevel(tokenId)
            );

        gdBalance =
            goldDust[player];
    }

    function processRewardMineAttack(
        address player,
        uint256 tokenId,
        uint256 gdFee,
        uint256 restDuration
    )
        external
        onlyRewardMine
    {
        if (
            soapyMiners.ownerOf(tokenId) !=
            player
        ) {
            revert NotMinerOwner();
        }

        if (
            getMinerStatus(tokenId) !=
            MinerStatus.READY
        ) {
            revert MinerNotReady();
        }

        if (
            goldDust[player] <
            gdFee
        ) {
            revert InsufficientGoldDust();
        }

        if (restDuration == 0) {
            revert InvalidAmount();
        }

        goldDust[player] -=
            gdFee;

        miners[tokenId]
            .restUntil =
                uint64(
                    block.timestamp +
                    restDuration
                );
    }


    /* =====================================================
                    MINER STATUS
    ===================================================== */

    function getMinerStatus(
        uint256 tokenId
    )
        public
        view
        returns (MinerStatus)
    {
        ActiveExpedition storage expedition =
            activeExpeditions[tokenId];

        if (expedition.mineId != 0) {
            if (
                block.timestamp <
                expedition.endsAt
            ) {
                return MinerStatus.MINING;
            }

            return MinerStatus.CLAIMABLE;
        }

        if (
            block.timestamp <
            miners[tokenId].restUntil
        ) {
            return MinerStatus.RESTING;
        }

        return MinerStatus.READY;
    }


    /* =====================================================
                        EXPEDITIONS
    ===================================================== */

    function startExpedition(
        uint256 tokenId,
        uint256 mineId
    )
        external
        nonReentrant
    {
        if (
            mineId == 0 ||
            mineId > mineCount
        ) {
            revert InvalidMine();
        }

        Mine storage mine =
            mines[mineId];

        if (!mine.active) {
            revert MineInactive();
        }

        if (
            !ownsMiner(
                msg.sender,
                tokenId
            )
        ) {
            revert NotMinerOwner();
        }

        if (
            getMinerStatus(tokenId) !=
            MinerStatus.READY
        ) {
            revert MinerNotReady();
        }

        if (
            activeExpeditions[tokenId]
                .mineId != 0
        ) {
            revert ExpeditionAlreadyActive();
        }

        if (
            getMiningPower(tokenId) <
            mine.requiredPower
        ) {
            revert InsufficientPower();
        }

        if (
            goldDust[msg.sender] <
            mine.entryCost
        ) {
            revert InsufficientGoldDust();
        }

        goldDust[msg.sender] -=
            mine.entryCost;

        uint64 endsAt =
            uint64(
                block.timestamp +
                mine.duration
            );

        activeExpeditions[tokenId] =
            ActiveExpedition({
                endsAt:
                    endsAt,

                mineId:
                    uint32(mineId)
            });

        emit ExpeditionStarted(
            msg.sender,
            tokenId,
            mineId,
            endsAt
        );
    }


    function getExpeditionTimeRemaining(
        uint256 tokenId
    )
        external
        view
        returns (uint256)
    {
        ActiveExpedition storage expedition =
            activeExpeditions[tokenId];

        if (expedition.mineId == 0) {
            revert NoActiveExpedition();
        }

        if (
            block.timestamp >=
            expedition.endsAt
        ) {
            return 0;
        }

        return
            uint256(expedition.endsAt) -
            block.timestamp;
    }


    function getActiveExpedition(
        uint256 tokenId
    )
        external
        view
        returns (
            ActiveExpedition memory
        )
    {
        ActiveExpedition memory expedition =
            activeExpeditions[tokenId];

        if (expedition.mineId == 0) {
            revert NoActiveExpedition();
        }

        return expedition;
    }


    function claimLoot(
        uint256 tokenId
    )
        external
        nonReentrant
    {
        ActiveExpedition memory expedition =
            activeExpeditions[tokenId];

        if (expedition.mineId == 0) {
            revert NoActiveExpedition();
        }

        if (
            !ownsMiner(
                msg.sender,
                tokenId
            )
        ) {
            revert NotMinerOwner();
        }

        if (
            block.timestamp <
            expedition.endsAt
        ) {
            revert ExpeditionNotFinished();
        }

        Mine storage mine =
            mines[expedition.mineId];


        /* =====================================================
                        TEMPORARY TEST LOOT
        ===================================================== */

        uint256 oreReward;
        uint256 crystalReward;
        uint256 coreReward;


        if (expedition.mineId == 1) {
            oreReward = 100;
            crystalReward = 5;
            coreReward = 0;
        }
        else if (expedition.mineId == 2) {
            oreReward = 200;
            crystalReward = 15;
            coreReward = 1;
        }
        else if (expedition.mineId == 3) {
            oreReward = 350;
            crystalReward = 30;
            coreReward = 3;
        }
        else {
            revert UnsupportedMine();
        }


        /* =====================================================
                        BACKPACK CHECK
        ===================================================== */

        Inventory storage inventory =
            inventories[tokenId];

        uint256 capacity =
            getBackpackCapacity(
                tokenId
            );

        uint256 currentInventory =
            uint256(inventory.ore) +
            uint256(inventory.crystal) +
            uint256(inventory.core);

        uint256 incomingLoot =
            oreReward +
            crystalReward +
            coreReward;

        if (
            currentInventory +
            incomingLoot >
            capacity
        ) {
            revert BackpackFull();
        }


        /* =====================================================
                        CREDIT LOOT + XP
        ===================================================== */

        inventory.ore +=
            uint64(oreReward);

        inventory.crystal +=
            uint64(crystalReward);

        inventory.core +=
            uint64(coreReward);

        miners[tokenId].xp +=
            uint64(mine.xpReward);


        /* =====================================================
                    CLEAR EXPEDITION + REST
        ===================================================== */

        delete activeExpeditions[
            tokenId
        ];

        uint64 restUntil =
            uint64(
                block.timestamp +
                mine.duration
            );

        miners[tokenId]
            .restUntil =
                restUntil;


        emit LootClaimed(
            msg.sender,
            tokenId,
            expedition.mineId,
            oreReward,
            crystalReward,
            coreReward,
            mine.xpReward,
            restUntil
        );
    }


    /* =====================================================
                        ADMIN - MINES
    ===================================================== */

    function _createMine(
        string memory name,
        uint256 duration,
        uint256 entryCost,
        uint256 requiredPower,
        uint256 xpReward
    )
        internal
    {
        mineCount++;

        mines[mineCount] =
            Mine({
                name: name,

                duration:
                    duration,

                entryCost:
                    entryCost,

                requiredPower:
                    requiredPower,

                xpReward:
                    xpReward,

                active:
                    true
            });

        emit MineUpdated(
            mineCount,
            name,
            duration,
            entryCost,
            requiredPower,
            xpReward,
            true
        );
    }


    function updateMine(
        uint256 mineId,
        string calldata name,
        uint256 duration,
        uint256 entryCost,
        uint256 requiredPower,
        uint256 xpReward,
        bool active
    )
        external
        onlyOwner
    {
        require(
            mineId > 0 &&
            mineId <= mineCount,
            "Invalid mine"
        );

        require(
            duration > 0,
            "Invalid duration"
        );

        mines[mineId] =
            Mine({
                name: name,

                duration:
                    duration,

                entryCost:
                    entryCost,

                requiredPower:
                    requiredPower,

                xpReward:
                    xpReward,

                active:
                    active
            });

        emit MineUpdated(
            mineId,
            name,
            duration,
            entryCost,
            requiredPower,
            xpReward,
            active
        );
    }


    /* =====================================================
                    MARKETPLACE CONFIG
    ===================================================== */

    function setMarketplace(
        address newMarketplace
    )
        external
        onlyOwner
    {
        address previousMarketplace =
            marketplace;

        marketplace =
            newMarketplace;

        emit MarketplaceUpdated(
            previousMarketplace,
            newMarketplace
        );
    }

    function setRewardMine(
        address newRewardMine
    )
        external
        onlyOwner
    {
        address previous =
            rewardMine;

        rewardMine =
            newRewardMine;

        emit RewardMineUpdated(
            previous,
            newRewardMine
        );
    }


    /* =====================================================
                    PICKAXE UPGRADE CONFIG
    ===================================================== */

    function setPickaxeUpgradeCost(
        uint256 destinationLevel,
        uint256 goldDustCost,
        uint256 oreCost,
        uint256 crystalCost,
        uint256 coreCost
    )
        external
        onlyOwner
    {
        require(
            destinationLevel >= 2 &&
            destinationLevel <=
                MAX_PICKAXE_LEVEL,
            "Invalid pickaxe level"
        );

        pickaxeUpgradeCosts[
            destinationLevel
        ] = PickaxeUpgradeCost({
            goldDust:
                goldDustCost,

            ore:
                oreCost,

            crystal:
                crystalCost,

            core:
                coreCost
        });
    }


    /* =====================================================
                    BACKPACK UPGRADE CONFIG
    ===================================================== */

    function setBackpackUpgradeCost(
        uint256 destinationLevel,
        uint256 goldDustCost,
        uint256 oreCost,
        uint256 crystalCost,
        uint256 coreCost
    )
        external
        onlyOwner
    {
        require(
            destinationLevel >= 2 &&
            destinationLevel <=
                MAX_BACKPACK_LEVEL,
            "Invalid backpack level"
        );

        backpackUpgradeCosts[
            destinationLevel
        ] = BackpackUpgradeCost({
            goldDust:
                goldDustCost,

            ore:
                oreCost,

            crystal:
                crystalCost,

            core:
                coreCost
        });
    }


    /* =====================================================
                    GOLD DUST CONFIG
    ===================================================== */

    function setGoldDustRate(
        uint256 newRate
    )
        external
        onlyOwner
    {
        require(
            newRate > 0,
            "Invalid rate"
        );

        goldDustPerQuai =
            newRate;
    }


    /* =====================================================
                        TREASURY
    ===================================================== */

    function withdraw()
        external
        onlyOwner
        nonReentrant
    {
        uint256 balance =
            address(this)
                .balance;

        require(
            balance > 0,
            "Nothing to withdraw"
        );

        (
            bool success,
        ) =
            payable(owner())
                .call{
                    value: balance
                }("");

        require(
            success,
            "Withdraw failed"
        );
    }


    receive()
        external
        payable
    {
        revert(
            "Use buyGoldDust"
        );
    }
}
