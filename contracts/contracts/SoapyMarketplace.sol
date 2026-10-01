// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


interface ISoapyMinerGameMarketplace {
    function marketplaceLockResource(
        address seller,
        uint256 sellerTokenId,
        uint8 resourceType,
        uint256 amount
    )
        external;

    function marketplaceReturnResource(
        address seller,
        uint256 returnTokenId,
        uint8 resourceType,
        uint256 amount
    )
        external;

    function marketplaceSettleTrade(
        address buyer,
        address seller,
        uint256 buyerTokenId,
        uint8 resourceType,
        uint256 resourceAmount,
        uint256 totalPrice,
        uint256 marketplaceFee
    )
        external;
}


contract SoapyMarketplace is
    Ownable,
    ReentrancyGuard
{
    /* =====================================================
                        CUSTOM ERRORS
    ===================================================== */

    error InvalidGameContract();
    error MarketplaceDisabled();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidListing();
    error ListingInactive();
    error NotListingSeller();
    error CannotBuyOwnListing();
    error InvalidFee();


    /* =====================================================
                        CONSTANTS
    ===================================================== */

    uint256 public constant BASIS_POINTS =
        10_000;

    uint256 public constant MAX_FEE_BPS =
        1_000;


    /* =====================================================
                        GAME CONTRACT
    ===================================================== */

    ISoapyMinerGameMarketplace
        public immutable gameContract;


    /* =====================================================
                        MARKET CONFIG
    ===================================================== */

    uint16 public marketplaceFeeBps =
        500;

    bool public marketplaceActive =
        true;


    /* =====================================================
                        LISTINGS
    ===================================================== */

    struct Listing {
        address seller;

        uint96 price;
        uint64 amount;

        uint8 resourceType;

        bool active;
    }


    mapping(uint256 => Listing)
        public listings;

    uint256 public listingCount;


    /* =====================================================
                            EVENTS
    ===================================================== */

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        uint256 indexed sellerTokenId,
        uint8 resourceType,
        uint256 amount,
        uint256 price
    );


    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        uint256 indexed returnTokenId,
        uint8 resourceType,
        uint256 amount
    );


    event ListingSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 buyerTokenId,
        uint8 resourceType,
        uint256 amount,
        uint256 price,
        uint256 fee
    );


    event MarketplaceFeeUpdated(
        uint256 previousFeeBps,
        uint256 newFeeBps
    );


    event MarketplaceStatusUpdated(
        bool active
    );


    /* =====================================================
                        CONSTRUCTOR
    ===================================================== */

    constructor(
        address gameContractAddress
    )
        Ownable(msg.sender)
    {
        if (
            gameContractAddress ==
            address(0)
        ) {
            revert InvalidGameContract();
        }


        gameContract =
            ISoapyMinerGameMarketplace(
                gameContractAddress
            );
    }


    /* =====================================================
                        CREATE LISTING
    ===================================================== */

    function createListing(
        uint256 sellerTokenId,
        uint8 resourceType,
        uint256 amount,
        uint256 price
    )
        external
        nonReentrant
        returns (
            uint256 listingId
        )
    {
        if (!marketplaceActive) {
            revert MarketplaceDisabled();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        if (
            amount >
            type(uint64).max
        ) {
            revert InvalidAmount();
        }

        if (price == 0) {
            revert InvalidPrice();
        }

        if (
            price >
            type(uint96).max
        ) {
            revert InvalidPrice();
        }

        if (resourceType > 2) {
            revert InvalidAmount();
        }


        /*
            Game contract verifies:
            - seller ownership
            - inventory amount
            - resource type
        */

        gameContract
            .marketplaceLockResource(
                msg.sender,
                sellerTokenId,
                resourceType,
                amount
            );


        unchecked {
            listingCount++;
        }

        listingId =
            listingCount;


        listings[
            listingId
        ] =
            Listing({
                seller:
                    msg.sender,

                price:
                    uint96(
                        price
                    ),

                amount:
                    uint64(
                        amount
                    ),

                resourceType:
                    resourceType,

                active:
                    true
            });


        emit ListingCreated(
            listingId,
            msg.sender,
            sellerTokenId,
            resourceType,
            amount,
            price
        );
    }


    /* =====================================================
                        CANCEL LISTING
    ===================================================== */

    function cancelListing(
        uint256 listingId,
        uint256 returnTokenId
    )
        external
        nonReentrant
    {
        Listing storage listing =
            listings[
                listingId
            ];


        if (
            listing.seller ==
            address(0)
        ) {
            revert InvalidListing();
        }

        if (!listing.active) {
            revert ListingInactive();
        }

        if (
            listing.seller !=
            msg.sender
        ) {
            revert NotListingSeller();
        }


        /*
            Effects first.
        */

        listing.active =
            false;


        /*
            Game verifies seller currently
            owns returnTokenId.
        */

        gameContract
            .marketplaceReturnResource(
                msg.sender,
                returnTokenId,
                listing.resourceType,
                listing.amount
            );


        emit ListingCancelled(
            listingId,
            msg.sender,
            returnTokenId,
            listing.resourceType,
            listing.amount
        );
    }


    /* =====================================================
                        BUY LISTING
    ===================================================== */

    function buyListing(
        uint256 listingId,
        uint256 buyerTokenId
    )
        external
        nonReentrant
    {
        if (!marketplaceActive) {
            revert MarketplaceDisabled();
        }


        Listing storage listing =
            listings[
                listingId
            ];


        if (
            listing.seller ==
            address(0)
        ) {
            revert InvalidListing();
        }

        if (!listing.active) {
            revert ListingInactive();
        }

        if (
            listing.seller ==
            msg.sender
        ) {
            revert CannotBuyOwnListing();
        }


        uint256 price =
            uint256(
                listing.price
            );


        uint256 fee =
            (
                price *
                marketplaceFeeBps
            )
            /
            BASIS_POINTS;


        /*
            Effects first.
        */

        listing.active =
            false;


        /*
            Game performs:
            - buyer ownership
            - backpack capacity
            - GD deduction
            - seller GD credit
            - resource credit
        */

        gameContract
            .marketplaceSettleTrade(
                msg.sender,
                listing.seller,
                buyerTokenId,
                listing.resourceType,
                listing.amount,
                price,
                fee
            );


        emit ListingSold(
            listingId,
            listing.seller,
            msg.sender,
            buyerTokenId,
            listing.resourceType,
            listing.amount,
            price,
            fee
        );
    }


    /* =====================================================
                        VIEW LISTING
    ===================================================== */

    function getListing(
        uint256 listingId
    )
        external
        view
        returns (
            Listing memory
        )
    {
        Listing memory listing =
            listings[
                listingId
            ];


        if (
            listing.seller ==
            address(0)
        ) {
            revert InvalidListing();
        }


        return listing;
    }


    /* =====================================================
                        CALCULATE FEE
    ===================================================== */

    function calculateMarketplaceFee(
        uint256 price
    )
        external
        view
        returns (
            uint256
        )
    {
        return
            (
                price *
                marketplaceFeeBps
            )
            /
            BASIS_POINTS;
    }


    /* =====================================================
                        ADMIN
    ===================================================== */

    function setMarketplaceFee(
        uint256 newFeeBps
    )
        external
        onlyOwner
    {
        if (
            newFeeBps >
            MAX_FEE_BPS
        ) {
            revert InvalidFee();
        }


        uint256 previous =
            marketplaceFeeBps;


        marketplaceFeeBps =
            uint16(
                newFeeBps
            );


        emit MarketplaceFeeUpdated(
            previous,
            newFeeBps
        );
    }


    function setMarketplaceActive(
        bool active
    )
        external
        onlyOwner
    {
        marketplaceActive =
            active;


        emit MarketplaceStatusUpdated(
            active
        );
    }
}
