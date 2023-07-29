import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Describe tests in the Timed Private Swap Contract", async function () {
	let Swaplace: Contract;
	let SwapFactory: Contract;
	let MockERC20: Contract;
	let MockERC721: Contract;

	let owner: SignerWithAddress;
	let acceptee: SignerWithAddress;

	const day = 86400;
	const zeroAddress = ethers.constants.AddressZero;

	before(async () => {
		const [signer, accountOne] = await ethers.getSigners();
		owner = signer;
		acceptee = accountOne;

		const swapFactoryFactory = await ethers.getContractFactory(
			"SwapFactory",
			signer
		);
		const swaplaceFactory = await ethers.getContractFactory(
			"TimedPvtSwap",
			signer
		);
		const MockERC20Factory = await ethers.getContractFactory(
			"MockERC20",
			signer
		);
		const mockERC721Factory = await ethers.getContractFactory(
			"MockERC721",
			signer
		);

		const swapFactoryContract = await swapFactoryFactory.deploy();
		const swaplaceContract = await swaplaceFactory.deploy();
		const MockERC20Contract = await MockERC20Factory.deploy("MockERC20", "20");
		const mockERC721Contract = await mockERC721Factory.deploy(
			"MockERC721",
			"721"
		);

		SwapFactory = await swapFactoryContract.deployed();
		Swaplace = await swaplaceContract.deployed();
		MockERC20 = await MockERC20Contract.deployed();
		MockERC721 = await mockERC721Contract.deployed();
	});

	it("Should test mock contracts", async function () {
		await MockERC20.mintTo(owner.address, 1000);
		expect(await MockERC20.balanceOf(owner.address)).to.be.equals(1000);

		await MockERC721.mintTo(owner.address);
		expect(await MockERC721.balanceOf(owner.address)).to.be.equals(1);
	});

	it("Should be able to create a swap", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.create(swap)).to.be.ok;

		// Get last swap
		const lastSwap = await Swaplace.swapId();

		// Return the first swap and expect timestamp to be greater
		const swapResult = await Swaplace.getSwap(lastSwap, owner.address);
		expect(swapResult[1]).to.be.greaterThan(swap[1]);

		// Create a second swap
		expect(await Swaplace.create(swap)).to.be.ok;
	});

	it("Should be able to create a swap for a single allowed address", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			acceptee.address,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.create(swap)).to.be.ok;

		// Get last swap
		const lastSwap = await Swaplace.swapId();

		// Return the first swap and expect timestamp to be greater
		const swapResult = await Swaplace.getSwap(lastSwap, owner.address);
		expect(swapResult[1]).to.be.greaterThan(swap[1]);

		// Create a second swap
		expect(await Swaplace.create(swap)).to.be.ok;
	});

	it("Should be able to validate assets allowances", async function () {
		// Mint tokens for test execution

		await MockERC20.mintTo(owner.address, 1000);
		await MockERC721.mintTo(owner.address);

		// Ask user to approve for future token transfers

		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC721.approve(Swaplace.address, 1);

		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");
		expect(await MockERC721.getApproved(1)).to.be.equal(Swaplace.address);
	});

	it("Should be able to cancel swaps", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.create(swap)).to.be.ok;

		// Get last swap
		const lastSwap = await Swaplace.swapId();

		// Cancel the first swap
		expect(await Swaplace.cancel(lastSwap)).to.be.ok;

		const finalized = await Swaplace.finalized(lastSwap);
		expect(finalized).to.be.equal(true);
	});

	it("Should not be able to cancel not owned swaps", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.connect(acceptee).create(swap)).to.be.ok;

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Return the first swap and expect timestamp to be greater
		const swapResult = await Swaplace.getSwap(
			Number(lastSwap),
			acceptee.address
		);
		expect(swapResult[1]).to.be.greaterThan(swap[1]);

		// Try to cancel the swap as owner
		await expect(
			Swaplace.cancel(Number(lastSwap))
		).to.be.revertedWithCustomError(Swaplace, `InvalidSwap`);
	});

	it("Should not be able to cancel expired swaps", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.create(swap)).to.be.ok;

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Increase time to expire the swap
		await network.provider.send("evm_increaseTime", [expiry + 1]);

		// Create a second swap
		await expect(
			Swaplace.cancel(Number(lastSwap))
		).to.be.revertedWithCustomError(Swaplace, `InvalidSwap`);
	});

	it("Should revert when accepting swaps not being the allowed address", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC20.mintTo(acceptee.address, 10000);

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC20.address];
		const assetsAmountsOrId = [1000, 10000];

		const swap = await SwapFactory.composeTimedPvtSwap(
			owner.address, // wrongly inform the owner
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC20.connect(acceptee).approve(Swaplace.address, 10000);

		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");
		expect(
			await MockERC20.allowance(acceptee.address, Swaplace.address)
		).to.be.equal("10000");

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Try to accept swap as acceptee, but should revert
		await expect(
			Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.revertedWithCustomError(Swaplace, `InvalidAddress`);
	});

	it("Should revert when accepting swaps with expiration done", async function () {
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, 1];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap
		expect(await Swaplace.create(swap)).to.be.ok;

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Increase time to expire the swap
		await network.provider.send("evm_increaseTime", [expiry + 1]);

		// Create a second swap
		await expect(
			Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.revertedWithCustomError(Swaplace, `InvalidExpiryPeriod`);
	});

	it("Should revert when accepting swaps that were already accepted", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId);

		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");
		expect(await MockERC721.getApproved(tokenId)).to.be.equal(Swaplace.address);

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;

		// Trying to accept for a second time
		await expect(
			Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.revertedWithCustomError(Swaplace, `InvalidSwap`);
	});

	it("Should revert when accepting swaps with lacking allowance { ERC20 }", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 10000);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [10000, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances - but not for erc20
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId);
		expect(await MockERC721.getApproved(tokenId)).to.be.equal(Swaplace.address);

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Trying to accept without allowance
		await expect(
			Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.revertedWith("ERC20: insufficient allowance");
	});

	it("Should revert when accepting swaps with lacking allowance { ERC721 }", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC721.address];
		const assetsAmountsOrId = [1000, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances - but not for erc20
		await MockERC20.approve(Swaplace.address, 1000);
		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Trying to accept without allowance
		await expect(
			Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.revertedWith("ERC721: caller is not token owner or approved");
	});

	it("Should be able to accept a swap with only { ERC20 }", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC20.mintTo(acceptee.address, 10000);

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC20.address];
		const assetsAmountsOrId = [1000, 10000];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC20.connect(acceptee).approve(Swaplace.address, 10000);

		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");
		expect(
			await MockERC20.allowance(acceptee.address, Swaplace.address)
		).to.be.equal("10000");

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;
	});

	it("Should be able to accept a swap for a single allowed address", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC20.mintTo(acceptee.address, 10000);

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC20.address, MockERC20.address];
		const assetsAmountsOrId = [1000, 10000];

		const swap = await SwapFactory.composeTimedPvtSwap(
			acceptee.address, // inform the acceptee address
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC20.connect(acceptee).approve(Swaplace.address, 10000);

		expect(
			await MockERC20.allowance(owner.address, Swaplace.address)
		).to.be.equal("1000");
		expect(
			await MockERC20.allowance(acceptee.address, Swaplace.address)
		).to.be.equal("10000");

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;
	});

	it("Should be able to accept a swap with only { ERC721 }", async function () {
		// Mint tokens
		await MockERC721.mintTo(owner.address);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [MockERC721.address, MockERC721.address];
		const assetsAmountsOrId = [tokenId - 1, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC721.approve(Swaplace.address, tokenId - 1);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId);

		expect(await MockERC721.getApproved(tokenId - 1)).to.be.equal(
			Swaplace.address
		);
		expect(await MockERC721.getApproved(tokenId)).to.be.equal(Swaplace.address);

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;

		// Expect the acceptee to have the token
		expect(await MockERC721.ownerOf(tokenId - 1)).to.be.equal(acceptee.address);

		// Expect the owner to have the token
		expect(await MockERC721.ownerOf(tokenId)).to.be.equal(owner.address);
	});

	it("Should be able to accept a swap N-1", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC721.mintTo(acceptee.address);
		await MockERC721.mintTo(acceptee.address);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [
			MockERC20.address,
			MockERC721.address,
			MockERC721.address,
			MockERC721.address,
		];
		const assetsAmountsOrId = [1000, tokenId - 2, tokenId - 1, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			1
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId - 2);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId - 1);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId);

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Get balance before
		const balanceBefore = await MockERC20.balanceOf(acceptee.address);

		// accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;

		// Expect the owner to have the token
		expect(await MockERC721.ownerOf(tokenId - 2)).to.be.equal(owner.address);
		expect(await MockERC721.ownerOf(tokenId - 1)).to.be.equal(owner.address);
		expect(await MockERC721.ownerOf(tokenId)).to.be.equal(owner.address);

		// Expect the acceptee to have the token
		expect(await MockERC20.balanceOf(acceptee.address)).to.be.equal(
			balanceBefore.add(1000)
		);
	});

	it("Should be able to accept a swap N-N", async function () {
		// Mint tokens
		await MockERC20.mintTo(owner.address, 1000);
		await MockERC20.mintTo(acceptee.address, 1000);

		await MockERC721.mintTo(owner.address);
		await MockERC721.mintTo(acceptee.address);

		// Get last token id
		const tokenId = await MockERC721.totalSupply();

		// Build the Swap
		const expiry = day * 2;

		const assetsContractAddrs = [
			MockERC20.address,
			MockERC721.address,
			MockERC20.address,
			MockERC721.address,
		];
		const assetsAmountsOrId = [1000, tokenId - 1, 1000, tokenId];

		const swap = await SwapFactory.composeTimedPvtSwap(
			zeroAddress,
			expiry,
			assetsContractAddrs,
			assetsAmountsOrId,
			2
		);

		// Create the first swap by owner
		expect(await Swaplace.create(swap)).to.be.ok;

		// Call allowances
		await MockERC20.approve(Swaplace.address, 1000);
		await MockERC20.connect(acceptee).approve(Swaplace.address, 1000);
		await MockERC721.approve(Swaplace.address, tokenId - 1);
		await MockERC721.connect(acceptee).approve(Swaplace.address, tokenId);

		// Get last swap id
		const lastSwap = await Swaplace.swapId();

		// Get balance before
		const balanceBeforeOwner = await MockERC20.balanceOf(owner.address);
		const balanceBefore = await MockERC20.balanceOf(acceptee.address);
		// estimate gas
		const gas2 = await Swaplace.connect(acceptee).estimateGas.accept(
			Number(lastSwap),
			owner.address
		);

		// accept swap as acceptee
		expect(
			await Swaplace.connect(acceptee).accept(Number(lastSwap), owner.address)
		).to.be.ok;

		// Expect the acceptee and owner to have their ERC721 tokens swapped
		expect(await MockERC721.ownerOf(tokenId)).to.be.equal(owner.address);
		expect(await MockERC721.ownerOf(tokenId - 1)).to.be.equal(acceptee.address);

		// Expect ERC20 balances to preserve their values since they only swaped the same amount
		expect(await MockERC20.balanceOf(owner.address)).to.be.equal(
			balanceBeforeOwner
		);
		expect(await MockERC20.balanceOf(acceptee.address)).to.be.equal(
			balanceBefore
		);
	});
});
