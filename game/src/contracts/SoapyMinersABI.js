export const SOAPPY_MINERS_ABI = [
  "event PublicMinted(address indexed buyer, uint256 indexed tokenId, uint256 price)",

  "function owner() view returns (address)",

  "function MAX_SUPPLY() view returns (uint256)",
  "function PUBLIC_ALLOCATION() view returns (uint256)",
  "function RESERVED_ALLOCATION() view returns (uint256)",

  "function totalMinted() view returns (uint256)",
  "function publicMinted() view returns (uint256)",
  "function reservedMinted() view returns (uint256)",

  "function mintPrice() view returns (uint256)",
  "function publicMintEnabled() view returns (bool)",

  "function getNFT(uint256 nftId) view returns (string metadataURI, bool available, bool minted)",

  "function ownerOf(uint256 tokenId) view returns (address)",

  "function balanceOf(address owner) view returns (uint256)",

  "function mint() payable",

  "function nextPublicTokenId() view returns (uint256)",

  "function countAvailablePublic() view returns (uint256)",

  "function FIRST_PUBLIC_TOKEN_ID() view returns (uint256)",

  "function LAST_PUBLIC_TOKEN_ID() view returns (uint256)",

  "function FIRST_RESERVED_TOKEN_ID() view returns (uint256)",

  "function LAST_RESERVED_TOKEN_ID() view returns (uint256)",

  "function isMetadataUsed(string metadataURI) view returns (bool)",

  "function registerNFT(uint256 nftId, string metadataURI)",

  "function registerReservedNFT(uint256 nftId, string metadataURI)",

  "function registerAndReleaseBatch(uint256[] nftIds, string[] metadataURIs, uint256 newMintPrice)",

  "function setNFTAvailability(uint256 nftId, bool available)",

  "function setNFTAvailabilityBatch(uint256[] nftIds, bool available)",

  "function setMintPrice(uint256 newPrice)",

  "function setPublicMintEnabled(bool enabled)",

  "function reservedMint(address recipient, uint256 nftId)",

  "function withdraw()",

  "function remainingPublicSupply() view returns (uint256)",

  "function remainingReservedSupply() view returns (uint256)",
];
