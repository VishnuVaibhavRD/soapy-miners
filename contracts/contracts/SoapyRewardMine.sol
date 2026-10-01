// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


interface ISoapyMinerGameReward {
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
        );

    function processRewardMineAttack(
        address player,
        uint256 tokenId,
        uint256 gdFee,
        uint256 restDuration
    )
        external;
}


contract SoapyRewardMine is
    Ownable,
    ReentrancyGuard,
    EIP712
{
    using ECDSA for bytes32;


    /* =====================================================
                        CUSTOM ERRORS
    ===================================================== */

    error InvalidGameContract();
    error InvalidMine();
    error InvalidHealth();
    error InvalidConfiguration();
    error MineNotActive();
    error MineNotCreated();
    error MineNotPaused();
    error MineFinished();
    error MineNotFinished();
    error MineDepleted();
    error InvalidAmount();
    error RewardPoolEmpty();
    error NotMinerOwner();
    error MinerNotReady();
    error InsufficientGoldDust();
    error AttackCooldownActive();
    error InvalidDamage();
    error SignatureExpired();
    error InvalidNonce();
    error InvalidSignature();
    error AlreadyClaimed();
    error NoReward();
    error NothingToWithdraw();
    error MineHasDamage();
    error InvalidSigner();
    error InvalidDamageRange();
    error InvalidLevel();
    error InvalidName();
    error CannotFundMine();
    error CannotFinishMine();
    error CannotCancelMine();
    error MineNotCancelled();
    error AlreadyWithdrawn();
    error TransferFailed();
    error UseFundMine();


    /* =====================================================
                        GAME CONTRACT
    ===================================================== */

    ISoapyMinerGameReward
        public immutable gameContract;


    /* =====================================================
                        DAMAGE SIGNER
    ===================================================== */

    address public damageSigner;


    bytes32 public constant
        ATTACK_TYPEHASH =
            keccak256(
                "Attack(uint256 mineId,uint256 tokenId,address player,uint256 damage,uint256 nonce,uint256 deadline)"
            );


    /*
        Per-NFT reusable nonce.

        tokenId → current nonce

        Replaces permanent usedAttackSignatures
        mapping growth on every attack.
    */

    mapping(uint256 => uint64)
        public rewardAttackNonce;


    /* =====================================================
                        MINE STATUS
    ===================================================== */

    enum MineStatus {
        CREATED,
        ACTIVE,
        PAUSED,
        FINISHED,
        CANCELLED
    }


    /* =====================================================
                        REWARD MINE
    ===================================================== */

    struct RewardMine {
        uint128 rewardPool;
        uint128 finalRewardPool;

        uint64 maxHealth;
        uint64 currentHealth;
        uint64 totalDamage;

        uint32 attackFeeGD;
        uint32 attackRestDuration;
        uint32 attackCooldown;

        MineStatus status;

        bool adminFundingWithdrawn;
    }


    mapping(uint256 => RewardMine)
        public mines;

    uint256 public mineCount;


    /* =====================================================
                        DAMAGE CONFIG
    ===================================================== */

    struct DamageRange {
        uint256 minDamage;
        uint256 maxDamage;
    }


    mapping(uint256 => DamageRange)
        public levelDamageRanges;


    mapping(uint256 => uint256)
        public pickaxeDamageBonus;


    /* =====================================================
                        PLAYER STATE
    ===================================================== */

    struct PlayerMineState {
        uint128 totalDamage;
        bool rewardClaimed;
    }


    mapping(
        uint256 =>
            mapping(
                address =>
                    PlayerMineState
            )
    )
        public playerMineStates;


    /*
        GLOBAL Reward Mine attack timer.

        tokenId → timestamp
    */

    mapping(uint256 => uint64)
        public minerLastRewardAttackAt;


    /* =====================================================
                            EVENTS
    ===================================================== */

    event RewardMineCreated(
        uint256 indexed mineId,
        string name,
        uint256 maxHealth,
        uint256 attackFeeGD,
        uint256 attackRestDuration,
        uint256 attackCooldown
    );


    event RewardMineFunded(
        uint256 indexed mineId,
        address indexed funder,
        uint256 amount,
        uint256 newRewardPool
    );


    event RewardMineActivated(
        uint256 indexed mineId
    );


    event RewardMinePaused(
        uint256 indexed mineId
    );


    event RewardMineResumed(
        uint256 indexed mineId
    );


    event RewardMineFinished(
        uint256 indexed mineId,
        uint256 totalDamage,
        uint256 finalRewardPool
    );


    event RewardMineCancelled(
        uint256 indexed mineId
    );


    event AttackPerformed(
        uint256 indexed mineId,
        address indexed player,
        uint256 indexed tokenId,
        uint256 damage,
        uint256 remainingHealth
    );


    event RewardClaimed(
        uint256 indexed mineId,
        address indexed player,
        uint256 amount
    );


    event DamageSignerUpdated(
        address indexed previousSigner,
        address indexed newSigner
    );


    event DamageRangeUpdated(
        uint256 indexed level,
        uint256 minDamage,
        uint256 maxDamage
    );


    event PickaxeDamageBonusUpdated(
        uint256 indexed pickaxeLevel,
        uint256 bonus
    );


    event AttackConfigurationUpdated(
        uint256 indexed mineId,
        uint256 attackFeeGD,
        uint256 attackRestDuration,
        uint256 attackCooldown
    );


    event CancelledFundingWithdrawn(
        uint256 indexed mineId,
        uint256 amount
    );


    /* =====================================================
                        CONSTRUCTOR
    ===================================================== */

    constructor(
        address gameContractAddress
    )
        Ownable(msg.sender)
        EIP712(
            "SoapyRewardMine",
            "1"
        )
    {
        if (
            gameContractAddress ==
            address(0)
        ) {
            revert InvalidGameContract();
        }

        gameContract =
            ISoapyMinerGameReward(
                gameContractAddress
            );


        damageSigner =
            msg.sender;


        levelDamageRanges[1] =
            DamageRange({
                minDamage: 8,
                maxDamage: 12
            });

        levelDamageRanges[2] =
            DamageRange({
                minDamage: 12,
                maxDamage: 18
            });

        levelDamageRanges[3] =
            DamageRange({
                minDamage: 18,
                maxDamage: 27
            });

        levelDamageRanges[4] =
            DamageRange({
                minDamage: 27,
                maxDamage: 40
            });

        levelDamageRanges[5] =
            DamageRange({
                minDamage: 40,
                maxDamage: 60
            });


        pickaxeDamageBonus[1] = 0;
        pickaxeDamageBonus[2] = 2;
        pickaxeDamageBonus[3] = 4;
        pickaxeDamageBonus[4] = 6;
        pickaxeDamageBonus[5] = 8;
    }


    /* =====================================================
                        CREATE MINE
    ===================================================== */

    function createRewardMine(
        string calldata name,
        uint256 maxHealth,
        uint256 attackFeeGD,
        uint256 attackRestDuration,
        uint256 attackCooldown
    )
        external
        onlyOwner
        returns (uint256 mineId)
    {
        if (bytes(name).length == 0) {
            revert InvalidName();
        }

        if (
            maxHealth == 0 ||
            maxHealth >
                type(uint64).max
        ) {
            revert InvalidHealth();
        }

        if (
            attackFeeGD >
                type(uint32).max ||
            attackRestDuration >
                type(uint32).max ||
            attackCooldown >
                type(uint32).max
        ) {
            revert InvalidConfiguration();
        }

        if (
            attackCooldown <
            attackRestDuration
        ) {
            revert InvalidConfiguration();
        }


        unchecked {
            mineCount++;
        }

        mineId =
            mineCount;


        mines[mineId] =
            RewardMine({
                rewardPool:
                    0,

                finalRewardPool:
                    0,

                maxHealth:
                    uint64(
                        maxHealth
                    ),

                currentHealth:
                    uint64(
                        maxHealth
                    ),

                totalDamage:
                    0,

                attackFeeGD:
                    uint32(
                        attackFeeGD
                    ),

                attackRestDuration:
                    uint32(
                        attackRestDuration
                    ),

                attackCooldown:
                    uint32(
                        attackCooldown
                    ),

                status:
                    MineStatus.CREATED,

                adminFundingWithdrawn:
                    false
            });


        emit RewardMineCreated(
            mineId,
            name,
            maxHealth,
            attackFeeGD,
            attackRestDuration,
            attackCooldown
        );
    }


    /* =====================================================
                        FUND MINE
    ===================================================== */

    function fundMine(
        uint256 mineId
    )
        external
        payable
        nonReentrant
    {
        RewardMine storage mine =
            mines[mineId];


        if (mine.maxHealth == 0) {
            revert InvalidMine();
        }

        if (
            mine.status !=
                MineStatus.CREATED &&
            mine.status !=
                MineStatus.ACTIVE &&
            mine.status !=
                MineStatus.PAUSED
        ) {
            revert CannotFundMine();
        }

        if (msg.value == 0) {
            revert InvalidAmount();
        }

        if (
            uint256(mine.rewardPool) +
                msg.value >
            type(uint128).max
        ) {
            revert InvalidConfiguration();
        }


        mine.rewardPool +=
            uint128(
                msg.value
            );


        emit RewardMineFunded(
            mineId,
            msg.sender,
            msg.value,
            mine.rewardPool
        );
    }


    /* =====================================================
                        ACTIVATE
    ===================================================== */

    function activateMine(
        uint256 mineId
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (mine.maxHealth == 0) {
            revert InvalidMine();
        }

        if (
            mine.status !=
            MineStatus.CREATED
        ) {
            revert MineNotCreated();
        }

        if (mine.rewardPool == 0) {
            revert RewardPoolEmpty();
        }

        if (
            damageSigner ==
            address(0)
        ) {
            revert InvalidSigner();
        }


        mine.status =
            MineStatus.ACTIVE;


        emit RewardMineActivated(
            mineId
        );
    }


    /* =====================================================
                        PAUSE
    ===================================================== */

    function pauseMine(
        uint256 mineId
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
            MineStatus.ACTIVE
        ) {
            revert MineNotActive();
        }


        mine.status =
            MineStatus.PAUSED;


        emit RewardMinePaused(
            mineId
        );
    }


    /* =====================================================
                        RESUME
    ===================================================== */

    function resumeMine(
        uint256 mineId
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
            MineStatus.PAUSED
        ) {
            revert MineNotPaused();
        }

        if (
            mine.currentHealth == 0
        ) {
            revert MineDepleted();
        }


        mine.status =
            MineStatus.ACTIVE;


        emit RewardMineResumed(
            mineId
        );
    }


    /* =====================================================
                    DAMAGE RANGE READER
    ===================================================== */

    function getAllowedDamageRange(
        uint256 tokenId,
        address player
    )
        public
        view
        returns (
            uint256 minDamage,
            uint256 maxDamage
        )
    {
        (
            bool owns,
            uint8 status,
            uint8 minerLevel,
            uint8 pickaxeLevel,
            uint256 gdBalance
        ) =
            gameContract
                .getRewardAttackState(
                    player,
                    tokenId
                );

        status;
        gdBalance;

        if (!owns) {
            revert NotMinerOwner();
        }

        if (minerLevel == 0) {
            minerLevel = 1;
        }

        if (minerLevel > 5) {
            minerLevel = 5;
        }

        if (pickaxeLevel == 0) {
            pickaxeLevel = 1;
        }

        if (pickaxeLevel > 5) {
            pickaxeLevel = 5;
        }

        DamageRange memory range =
            levelDamageRanges[
                minerLevel
            ];

        uint256 bonus =
            pickaxeDamageBonus[
                pickaxeLevel
            ];

        minDamage =
            uint256(
                range.minDamage
            ) +
            bonus;

        maxDamage =
            uint256(
                range.maxDamage
            ) +
            bonus;
    }


    /* =====================================================
                    ATTACK COOLDOWN
    ===================================================== */

    function getNextAttackAt(
        uint256 tokenId,
        uint256 mineId
    )
        public
        view
        returns (uint256)
    {
        RewardMine storage mine =
            mines[mineId];


        uint256 lastAttack =
            minerLastRewardAttackAt[
                tokenId
            ];


        if (lastAttack == 0) {
            return 0;
        }


        return
            lastAttack +
            mine.attackCooldown;
    }


    function canMinerAttack(
        uint256 mineId,
        address player,
        uint256 tokenId
    )
        external
        view
        returns (
            bool canAttack,
            uint256 nextAttackAt
        )
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.maxHealth == 0 ||
            mine.status !=
                MineStatus.ACTIVE ||
            mine.currentHealth == 0
        ) {
            return (
                false,
                0
            );
        }


        (
            bool owns,
            uint8 status,
            ,
            ,
        ) =
            gameContract
                .getRewardAttackState(
                    player,
                    tokenId
                );


        if (!owns || status != 0) {
            return (
                false,
                0
            );
        }


        nextAttackAt =
            getNextAttackAt(
                tokenId,
                mineId
            );


        if (
            nextAttackAt != 0 &&
            block.timestamp <
                nextAttackAt
        ) {
            return (
                false,
                nextAttackAt
            );
        }


        return (
            true,
            nextAttackAt
        );
    }


    /* =====================================================
                            ATTACK
    ===================================================== */

    function attack(
        uint256 mineId,
        uint256 tokenId,
        uint256 damage,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    )
        external
        nonReentrant
    {
        RewardMine storage mine =
            mines[mineId];

        if (
            mine.maxHealth == 0
        ) {
            revert InvalidMine();
        }

        if (
            mine.status !=
            MineStatus.ACTIVE
        ) {
            revert MineNotActive();
        }

        if (
            mine.currentHealth == 0
        ) {
            revert MineDepleted();
        }


        (
            bool owns,
            uint8 status,
            uint8 minerLevel,
            uint8 pickaxeLevel,
            uint256 gdBalance
        ) =
            gameContract
                .getRewardAttackState(
                    msg.sender,
                    tokenId
                );


        if (!owns) {
            revert NotMinerOwner();
        }

        if (status != 0) {
            revert MinerNotReady();
        }

        if (
            gdBalance <
            mine.attackFeeGD
        ) {
            revert InsufficientGoldDust();
        }


        uint256 lastAttack =
            minerLastRewardAttackAt[
                tokenId
            ];

        if (
            lastAttack != 0 &&
            block.timestamp <
                lastAttack +
                mine.attackCooldown
        ) {
            revert AttackCooldownActive();
        }


        if (
            block.timestamp >
            deadline
        ) {
            revert SignatureExpired();
        }


        uint256 expectedNonce =
            rewardAttackNonce[
                tokenId
            ];

        if (
            nonce !=
            expectedNonce
        ) {
            revert InvalidNonce();
        }


        if (minerLevel == 0) {
            minerLevel = 1;
        }

        if (minerLevel > 5) {
            minerLevel = 5;
        }

        if (pickaxeLevel == 0) {
            pickaxeLevel = 1;
        }

        if (pickaxeLevel > 5) {
            pickaxeLevel = 5;
        }


        DamageRange memory range =
            levelDamageRanges[
                minerLevel
            ];

        uint256 bonus =
            pickaxeDamageBonus[
                pickaxeLevel
            ];

        uint256 minDamage =
            uint256(
                range.minDamage
            ) +
            bonus;

        uint256 maxDamage =
            uint256(
                range.maxDamage
            ) +
            bonus;


        if (
            damage < minDamage ||
            damage > maxDamage
        ) {
            revert InvalidDamage();
        }


        bytes32 structHash =
            keccak256(
                abi.encode(
                    ATTACK_TYPEHASH,
                    mineId,
                    tokenId,
                    msg.sender,
                    damage,
                    nonce,
                    deadline
                )
            );


        bytes32 digest =
            _hashTypedDataV4(
                structHash
            );


        address recovered =
            ECDSA.recover(
                digest,
                signature
            );


        if (
            recovered !=
            damageSigner
        ) {
            revert InvalidSignature();
        }


        unchecked {
            rewardAttackNonce[
                tokenId
            ] =
                uint64(
                    expectedNonce +
                    1
                );
        }


        gameContract
            .processRewardMineAttack(
                msg.sender,
                tokenId,
                mine.attackFeeGD,
                mine.attackRestDuration
            );


        uint256 actualDamage =
            damage;

        if (
            actualDamage >
            mine.currentHealth
        ) {
            actualDamage =
                mine.currentHealth;
        }


        mine.currentHealth -=
            uint64(
                actualDamage
            );

        mine.totalDamage +=
            uint64(
                actualDamage
            );


        playerMineStates[
            mineId
        ][msg.sender]
            .totalDamage +=
                uint128(
                    actualDamage
                );


        minerLastRewardAttackAt[
            tokenId
        ] =
            uint64(
                block.timestamp
            );


        emit AttackPerformed(
            mineId,
            msg.sender,
            tokenId,
            actualDamage,
            mine.currentHealth
        );


        if (
            mine.currentHealth == 0
        ) {
            _finishMine(
                mineId
            );
        }
    }


    /* =====================================================
                        MANUAL FINISH
    ===================================================== */

    function finishMine(
        uint256 mineId
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
                MineStatus.ACTIVE &&
            mine.status !=
                MineStatus.PAUSED
        ) {
            revert CannotFinishMine();
        }

        if (mine.totalDamage == 0) {
            revert NoReward();
        }


        _finishMine(
            mineId
        );
    }


    function _finishMine(
        uint256 mineId
    )
        internal
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status ==
            MineStatus.FINISHED
        ) {
            revert MineFinished();
        }


        mine.status =
            MineStatus.FINISHED;


        mine.finalRewardPool =
            mine.rewardPool;


        emit RewardMineFinished(
            mineId,
            mine.totalDamage,
            mine.finalRewardPool
        );
    }


    /* =====================================================
                        PLAYER REWARD
    ===================================================== */

    function getPlayerReward(
        uint256 mineId,
        address playerAddress
    )
        public
        view
        returns (uint256)
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
                MineStatus.FINISHED ||
            mine.totalDamage == 0
        ) {
            return 0;
        }


        PlayerMineState storage player =
            playerMineStates[
                mineId
            ][playerAddress];


        if (
            player.totalDamage == 0
        ) {
            return 0;
        }


        return
            (
                uint256(
                    mine.finalRewardPool
                ) *
                player.totalDamage
            )
            /
            mine.totalDamage;
    }


    /* =====================================================
                        CLAIM QUAI
    ===================================================== */

    function claimReward(
        uint256 mineId
    )
        external
        nonReentrant
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
            MineStatus.FINISHED
        ) {
            revert MineNotFinished();
        }


        PlayerMineState storage player =
            playerMineStates[
                mineId
            ][msg.sender];


        if (
            player.totalDamage == 0
        ) {
            revert NoReward();
        }

        if (player.rewardClaimed) {
            revert AlreadyClaimed();
        }


        uint256 reward =
            getPlayerReward(
                mineId,
                msg.sender
            );


        if (reward == 0) {
            revert NoReward();
        }


        player.rewardClaimed =
            true;


        (
            bool success,
        ) =
            payable(
                msg.sender
            ).call{
                value: reward
            }("");


        if (!success) {
            revert TransferFailed();
        }


        emit RewardClaimed(
            mineId,
            msg.sender,
            reward
        );
    }


    /* =====================================================
                        CANCEL MINE
    ===================================================== */

    function cancelMine(
        uint256 mineId
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (mine.maxHealth == 0) {
            revert InvalidMine();
        }


        if (mine.totalDamage != 0) {
            revert MineHasDamage();
        }


        if (
            mine.status !=
                MineStatus.CREATED &&
            mine.status !=
                MineStatus.PAUSED
        ) {
            revert CannotCancelMine();
        }


        mine.status =
            MineStatus.CANCELLED;


        emit RewardMineCancelled(
            mineId
        );
    }


    /* =====================================================
                CANCELLED FUND WITHDRAWAL
    ===================================================== */

    function withdrawCancelledFunding(
        uint256 mineId
    )
        external
        onlyOwner
        nonReentrant
    {
        RewardMine storage mine =
            mines[mineId];


        if (
            mine.status !=
            MineStatus.CANCELLED
        ) {
            revert MineNotCancelled();
        }

        if (
            mine.adminFundingWithdrawn
        ) {
            revert AlreadyWithdrawn();
        }


        uint256 amount =
            mine.rewardPool;


        if (amount == 0) {
            revert NothingToWithdraw();
        }


        mine.adminFundingWithdrawn =
            true;


        (
            bool success,
        ) =
            payable(
                owner()
            ).call{
                value: amount
            }("");


        if (!success) {
            revert TransferFailed();
        }


        emit CancelledFundingWithdrawn(
            mineId,
            amount
        );
    }


    /* =====================================================
                    ADMIN CONFIGURATION
    ===================================================== */

    function setDamageSigner(
        address newSigner
    )
        external
        onlyOwner
    {
        if (newSigner == address(0)) {
            revert InvalidSigner();
        }


        address previous =
            damageSigner;


        damageSigner =
            newSigner;


        emit DamageSignerUpdated(
            previous,
            newSigner
        );
    }


    function setDamageRange(
        uint256 level,
        uint256 minDamage,
        uint256 maxDamage
    )
        external
        onlyOwner
    {
        if (
            level < 1 ||
            level > 5
        ) {
            revert InvalidLevel();
        }

        if (
            minDamage == 0 ||
            maxDamage <
                minDamage
        ) {
            revert InvalidDamageRange();
        }


        levelDamageRanges[
            level
        ] =
            DamageRange({
                minDamage:
                    minDamage,

                maxDamage:
                    maxDamage
            });


        emit DamageRangeUpdated(
            level,
            minDamage,
            maxDamage
        );
    }


    function setPickaxeDamageBonus(
        uint256 pickaxeLevel,
        uint256 bonus
    )
        external
        onlyOwner
    {
        if (
            pickaxeLevel < 1 ||
            pickaxeLevel > 5
        ) {
            revert InvalidLevel();
        }


        pickaxeDamageBonus[
            pickaxeLevel
        ] =
            bonus;


        emit PickaxeDamageBonusUpdated(
            pickaxeLevel,
            bonus
        );
    }


    function updateAttackConfiguration(
        uint256 mineId,
        uint256 attackFeeGD,
        uint256 attackRestDuration,
        uint256 attackCooldown
    )
        external
        onlyOwner
    {
        RewardMine storage mine =
            mines[mineId];


        if (mine.maxHealth == 0) {
            revert InvalidMine();
        }


        if (
            mine.status !=
                MineStatus.CREATED &&
            mine.status !=
                MineStatus.PAUSED
        ) {
            revert MineNotPaused();
        }


        if (
            attackFeeGD >
                type(uint32).max ||
            attackRestDuration >
                type(uint32).max ||
            attackCooldown >
                type(uint32).max
        ) {
            revert InvalidConfiguration();
        }

        if (
            attackCooldown <
            attackRestDuration
        ) {
            revert InvalidConfiguration();
        }


        mine.attackFeeGD =
            uint32(
                attackFeeGD
            );

        mine.attackRestDuration =
            uint32(
                attackRestDuration
            );

        mine.attackCooldown =
            uint32(
                attackCooldown
            );


        emit AttackConfigurationUpdated(
            mineId,
            attackFeeGD,
            attackRestDuration,
            attackCooldown
        );
    }


    /* =====================================================
                        HEALTH %
    ===================================================== */

    function getHealthPercentage(
        uint256 mineId
    )
        external
        view
        returns (uint256)
    {
        RewardMine storage mine =
            mines[mineId];


        if (mine.maxHealth == 0) {
            revert InvalidMine();
        }


        return
            (
                uint256(
                    mine.currentHealth
                ) *
                10_000
            )
            /
            mine.maxHealth;
    }


    receive()
        external
        payable
    {
        revert UseFundMine();
    }
}
