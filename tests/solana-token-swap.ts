import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTokenSwap } from "../target/types/solana_token_swap";
import web3 = require("@solana/web3.js");
import assert from "assert";
import {Keypair} from "@solana/web3.js";
import {
  TokenSwap,
  CurveType,
  TOKEN_SWAP_PROGRAM_ID,
  Numberu64,
} from "@solana/spl-token-swap";

import BN from "bn.js";

import {
  createAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  getMint,
  getAccount,
  approve,
  Mint,
  getOrCreateAssociatedTokenAccount,
  Account,
} from "@solana/spl-token";

describe("solana-token-swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();

  // const connection = provider.connection;
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

  function initializeKeypair(): web3.Keypair {
    //Better to load from file
    const secret = JSON.parse("[82,212,66,85,222,172,41,80,211,234,80,157,106,219,200,169,163,92,173,49,180,81,32,138,136,29,162,115,30,145,186,121,59,190,49,168,25,26,127,204,122,7,133,89,7,169,192,191,87,60,139,34,8,55,61,135,34,191,240,110,0,119,4,81]") as number[];//"" as number[];
    const secretKey = Uint8Array.from(secret);
    const keypairFromSecretKey = web3.Keypair.fromSecretKey(secretKey);
    return keypairFromSecretKey;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it("Swap test", async () => {
    const owner = initializeKeypair();
    console.log("Owner:", owner.publicKey.toString());
    await connection.requestAirdrop(owner.publicKey, web3.LAMPORTS_PER_SOL * 5);

    const swapPayer = new web3.Account(owner.secretKey);
    console.log("Swap payer:", swapPayer.publicKey.toString());
    await connection.requestAirdrop(
        swapPayer.publicKey,
        web3.LAMPORTS_PER_SOL * 2
    );

    const tokenSwapAccount = new web3.Account();
    let [authority, bumpSeed] = await web3.PublicKey.findProgramAddress(
        [tokenSwapAccount.publicKey.toBuffer()],
        TOKEN_SWAP_PROGRAM_ID
    );

    console.log("Token swap account:", tokenSwapAccount.publicKey.toString());

    const tokenPool = await createMint(connection, owner, authority, null, 2);
    console.log("Token pool:", tokenPool.toString());

    console.log("Creating pool account");
    const tokenAccountPool = await getOrCreateAssociatedTokenAccount(
        connection,
        owner,
        tokenPool,
        owner.publicKey
    );
    console.log("Token account pool:", tokenAccountPool.address.toString());

    const feeAccount = await createAccount(
        connection,
        owner,
        tokenPool,
        owner.publicKey,
        new web3.Keypair()
    );
    console.log("Fee account pool:", feeAccount.toString());

    console.log("Creating token A");
    const mintA = await createMint(connection, owner, owner.publicKey, null, 2);
    console.log("Mint A:", mintA.toString());

    const tokenAccountA = await createAccount(
        connection,
        owner,
        mintA,
        authority,
        new web3.Keypair()
    );
    console.log("Token account A:", tokenAccountA.toString());
    console.log("Minting token A to account A");
    await mintTo(
        connection,
        owner,
        mintA,
        tokenAccountA,
        owner,
        10000
    );

    console.log("Creating token B");
    const mintB = await createMint(connection, owner, owner.publicKey, null, 2);
    console.log("Mint B:", mintA.toString());

    const tokenAccountB = await createAccount(
        connection,
        owner,
        mintB,
        authority,
        new web3.Keypair()
    );
    console.log("Token account B:", tokenAccountB.toString());
    console.log("Minting token B to account B");
    await mintTo(
        connection,
        owner,
        mintB,
        tokenAccountB,
        owner,
        10000
    );

    const tradingFeeNumerator = 10;
    const tradingFeeDenominator = 1000;
    const ownerFeeNumerator = 3;
    const ownerFeeDenominator = 1000;
    const ownerWithdrawFeeNumerator = 1;
    const ownerWithdrawFeeDenominator = 6;
    const hostFeeNumerator = 20;
    const hostFeeDenominator = 100;

    const tokenSwap = await TokenSwap.createTokenSwap(
        connection,
        swapPayer,
        tokenSwapAccount,
        authority,
        tokenAccountA,
        tokenAccountB,
        tokenPool,
        mintA,
        mintB,
        feeAccount,
        tokenAccountPool.address,
        TOKEN_SWAP_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tradingFeeNumerator,
        tradingFeeDenominator,
        ownerFeeNumerator,
        ownerFeeDenominator,
        ownerWithdrawFeeNumerator,
        ownerWithdrawFeeDenominator,
        hostFeeNumerator,
        hostFeeDenominator,
        CurveType.ConstantPrice,
        new BN(1)
    );

    await sleep(5000); //Don't know how to do it better in js

    console.log("Loading token swap");
    const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
        connection,
        tokenSwapAccount.publicKey,
        TOKEN_SWAP_PROGRAM_ID,
        swapPayer
    );

  });
});
