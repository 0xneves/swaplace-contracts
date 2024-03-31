import { ethers } from "hardhat";

/**
 * @dev See {ISwapFactory-LightAsset}.
 */
export interface LightAsset {
  addrAmountOrId: bigint;
}

/**
 * @dev See {ISwap-LightSwap}.
 */
export interface LightSwap {
  config: number;
  biding: LightAsset[];
  asking: LightAsset[];
}

/**
 * @dev See {ISwapFactory-makeAsset}.
 */
export async function makeLightAsset(
  addr: string,
  amountOrId: number | bigint,
): Promise<LightAsset> {
  // validate if its an ethereum address
  if (!ethers.utils.isAddress(addr)) {
    throw new Error("InvalidAddressFormat");
  }

  // if the amount is negative, it will throw an error
  if (amountOrId < 0) {
    throw new Error("AmountOrIdCannotBeNegative");
  }

  if (amountOrId > BigInt(2) ** BigInt(96) - BigInt(1)) {
    throw new Error("Can't be bigger than uint96");
  }

  /**
   * @dev Create a new Asset type described by the contract interface.
   *
   * NOTE: If the amount is in number format, it will be converted to bigint.
   * EVM works with a lot of decimals and might overload using number type.
   */
  const asset: LightAsset = {
    addrAmountOrId: (BigInt(addr) << BigInt(96)) | BigInt(amountOrId),
  };

  return asset;
}

function decodeConfig(config: number): [bigint, bigint, bigint, bigint] {
  return [
    (BigInt(config) >> BigInt(96)) & ((BigInt(1) << BigInt(160)) - BigInt(1)),
    (BigInt(config) >> BigInt(64)) & ((BigInt(1) << BigInt(32)) - BigInt(1)),
    (BigInt(config) >> BigInt(56)) & ((BigInt(1) << BigInt(8)) - BigInt(1)),
    BigInt(config) & ((BigInt(1) << BigInt(56)) - BigInt(1)),
  ];
}

/**
 * @dev See {ISwapFactory-makeLightSwap}.
 */
export async function makeLightSwap(
  config: any,
  biding: LightAsset[],
  asking: LightAsset[],
) {
  const [allowed, expiry, valueReceiver, valueToReceive] = decodeConfig(config);

  if (expiry > BigInt(2) ** BigInt(32) - BigInt(1)) {
    throw new Error("InvalidExpiryTooBig");
  }

  // check for the current `block.timestamp` because `expiry` cannot be in the past
  const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
  if (expiry < currentTimestamp) {
    throw new Error("InvalidExpiryInThePast");
  }

  /**
   * @dev one of the swapped assets should never be empty or it should be directly
   * transfered using {ERC20-transferFrom} or {ERC721-safeTransferFrom}
   *
   * NOTE: if the purpose of the swap is to transfer the asset directly using Swaplace,
   * then any small token quantity should be used as the swap asset.
   */
  if (biding.length == 0 || asking.length == 0) {
    throw new Error("InvalidAssetsLength");
  }

  const swap: LightSwap = {
    config: config,
    biding: biding,
    asking: asking,
  };

  return swap;
}

/**
 * @dev Facilitate to create a swap when the swap is too large.
 *
 * Directly composing swaps to avoid to calling {ISwapFactory-makeAsset}
 * multiple times.
 *
 * NOTE:
 *
 * - This function is not implemented in the contract.
 * - This function needs to be async because it calls for `block.timestamp`.
 *
 * Requirements:
 *
 * - `owner` cannot be the zero address.
 * - `expiry` cannot be in the past timestamp.
 * - `bidingAddr` and `askingAddr` cannot be empty.
 * - `bidingAddr` and `bidingAmountOrId` must have the same length.
 * - `askingAddr` and `askingAmountOrId` must have the same length.
 */
export async function composeLightSwap(
  config: any,
  bidingAddr: any[],
  bidingAmountOrId: any[],
  askingAddr: any[],
  askingAmountOrId: any[],
) {
  // lenght of addresses and their respective amounts must be equal
  if (
    bidingAddr.length != bidingAmountOrId.length ||
    askingAddr.length != askingAmountOrId.length
  ) {
    throw new Error("InvalidAssetsLength");
  }

  // push new assets to the array of bids and asks
  const biding: any[] = [];
  bidingAddr.forEach(async (addr, index) => {
    biding.push(await makeLightAsset(addr, bidingAmountOrId[index]));
  });

  const asking: any[] = [];
  askingAddr.forEach(async (addr, index) => {
    asking.push(await makeLightAsset(addr, askingAmountOrId[index]));
  });

  return await makeLightSwap(config, biding, asking);
}

module.exports = {
  makeLightAsset,
  makeLightSwap,
  composeLightSwap,
};
