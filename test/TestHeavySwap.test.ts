import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Asset, Swap, composeSwap } from "./utils/SwapFactory";
import { blocktimestamp, deploy } from "./utils/utils";

describe("Swaplace", async function () {
  // The deployed contracts
  let Swaplace: Contract;
  let MockERC721: Contract;

  // The signers of the test
  let deployer: SignerWithAddress;
  let owner: SignerWithAddress;
  let allowed: SignerWithAddress;
  let receiver: SignerWithAddress;

  // Solidity address(0)
  const zeroAddress = ethers.constants.AddressZero;

  before(async () => {
    [deployer, owner, allowed, receiver] = await ethers.getSigners();
    Swaplace = await deploy("Swaplace", deployer);
    MockERC721 = await deploy("MockERC721", deployer);
    await MockERC721.mint(owner.address, 1);
    await MockERC721.mint(owner.address, 2);
    await MockERC721.mint(owner.address, 3);
    await MockERC721.mint(owner.address, 4);
    await MockERC721.mint(owner.address, 5);
    await MockERC721.mint(owner.address, 6);
    await MockERC721.mint(owner.address, 7);
    await MockERC721.mint(owner.address, 8);
    await MockERC721.mint(owner.address, 9);
    await MockERC721.mint(owner.address, 10);

    await MockERC721.mint(allowed.address, 11);
    await MockERC721.mint(allowed.address, 12);
    await MockERC721.mint(allowed.address, 13);
    await MockERC721.mint(allowed.address, 14);
    await MockERC721.mint(allowed.address, 15);
    await MockERC721.mint(allowed.address, 16);
    await MockERC721.mint(allowed.address, 17);
    await MockERC721.mint(allowed.address, 18);
    await MockERC721.mint(allowed.address, 19);
    await MockERC721.mint(allowed.address, 20);

    await MockERC721.connect(owner).approve(Swaplace.address, 1);
    await MockERC721.connect(owner).approve(Swaplace.address, 2);
    await MockERC721.connect(owner).approve(Swaplace.address, 3);
    await MockERC721.connect(owner).approve(Swaplace.address, 4);
    await MockERC721.connect(owner).approve(Swaplace.address, 5);
    await MockERC721.connect(owner).approve(Swaplace.address, 6);
    await MockERC721.connect(owner).approve(Swaplace.address, 7);
    await MockERC721.connect(owner).approve(Swaplace.address, 8);
    await MockERC721.connect(owner).approve(Swaplace.address, 9);
    await MockERC721.connect(owner).approve(Swaplace.address, 10);

    await MockERC721.connect(allowed).approve(Swaplace.address, 11);
    await MockERC721.connect(allowed).approve(Swaplace.address, 12);
    await MockERC721.connect(allowed).approve(Swaplace.address, 13);
    await MockERC721.connect(allowed).approve(Swaplace.address, 14);
    await MockERC721.connect(allowed).approve(Swaplace.address, 15);
    await MockERC721.connect(allowed).approve(Swaplace.address, 16);
    await MockERC721.connect(allowed).approve(Swaplace.address, 17);
    await MockERC721.connect(allowed).approve(Swaplace.address, 18);
    await MockERC721.connect(allowed).approve(Swaplace.address, 19);
    await MockERC721.connect(allowed).approve(Swaplace.address, 20);
  });

  it("Should be able to create and accept a N-N swap with 10 ERC721 tokens", async function () {
    const bidingAddr = [
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
    ];
    const bidingAmountOrId = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const askingAddr = [
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
      MockERC721.address,
    ];
    const askingAmountOrId = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    const currentTimestamp = (await blocktimestamp()) * 2;
    const config = await Swaplace.packData(allowed.address, currentTimestamp);

    const swap: Swap = await composeSwap(
      owner.address,
      config,
      bidingAddr,
      bidingAmountOrId,
      askingAddr,
      askingAmountOrId,
    );

    var gasUsage = await Swaplace.connect(owner).estimateGas.createSwap(swap);
    console.log("Gas usage when creating swaps for 20 tokens swaps:", gasUsage);

    await expect(await Swaplace.connect(owner).createSwap(swap))
      .to.emit(Swaplace, "SwapCreated")
      .withArgs(await Swaplace.totalSwaps(), owner.address, allowed.address);

    var gasUsage = await Swaplace.connect(allowed).estimateGas.acceptSwap(
      await Swaplace.totalSwaps(),
      allowed.address,
    );
    console.log(
      "Gas usage when accepting swaps for 20 tokens swaps:",
      gasUsage,
    );

    await expect(
      await Swaplace.connect(allowed).acceptSwap(
        await Swaplace.totalSwaps(),
        allowed.address,
      ),
    )
      .to.emit(Swaplace, "SwapAccepted")
      .withArgs(await Swaplace.totalSwaps(), owner.address, allowed.address);

    console.log("Owner Address:", owner.address);
    console.log("Allowed Address:", allowed.address);

    expect(await MockERC721.ownerOf(1)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(2)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(3)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(4)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(5)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(6)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(7)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(8)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(9)).to.be.equals(allowed.address);
    expect(await MockERC721.ownerOf(10)).to.be.equals(allowed.address);

    expect(await MockERC721.ownerOf(11)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(12)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(13)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(14)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(15)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(16)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(17)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(18)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(19)).to.be.equals(owner.address);
    expect(await MockERC721.ownerOf(20)).to.be.equals(owner.address);
  });
});
