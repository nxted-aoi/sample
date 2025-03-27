import { address, createSolanaRpc, generateKeyPairSigner, getProgramDerivedAddress, getAddressEncoder, createTransactionMessage, pipe, setTransactionMessageFeePayerSigner, appendTransactionMessageInstruction, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners, addSignersToTransactionMessage, createTransaction, createSignerFromKeyPair, getSignatureFromTransaction, createSolanaClient, lamports,
    airdropFactory, } from "gill";
import { fetchConfig  } from "@jito-foundation/restaking-sdk";
import { getInitializeNcnInstruction, parseInitializeNcnInstruction } from "@jito-foundation/restaking-sdk";
import { getSystemErrorMessage, getTransferSolInstruction, isSystemError } from '@solana-program/system';

// const rpc = createSolanaRpc("https://api.devnet.solana.com");
const cluster = "devnet";

const restakingProgramPubkey = address("RestkWeAVL8fRGgzhfeoqFhsqKRchg6aa1XrcH96z4Q");
const configPubkey = address("4vvKh3Ws4vGzgXRVdo8SdL4jePXDvCqKVmi21BCBGwvn");

const { rpc, sendAndConfirmTransaction, rpcSubscriptions } = createSolanaClient({
    urlOrMoniker: cluster,
  });

// const config = await fetchConfig(rpc, configPubkey);

// console.log("Config: {}", config);

const adminKeypair = await generateKeyPairSigner();
console.log("Admin: ", adminKeypair.address);

await airdropFactory({ rpc, rpcSubscriptions })({
    commitment: "confirmed",
    lamports: lamports(100n),
    recipientAddress: adminKeypair.address,
});

const baseKeypair = await generateKeyPairSigner();
console.log("Base: ", baseKeypair.address);

const addressEncoder = getAddressEncoder();

const [ncnPubkey, bumpSeed] = await getProgramDerivedAddress({
    programAddress: restakingProgramPubkey, 
    seeds: [
        Buffer.from("ncn"),
        addressEncoder.encode(baseKeypair.address)
    ]
});

const input = {
    config: configPubkey,
    ncn: ncnPubkey,
    admin: adminKeypair.address,
    base: baseKeypair.address,
};

const instruction = getInitializeNcnInstruction(input);

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// const signer = await createSignerFromKeyPair(adminKeypair);

// const transactionMessage = pipe(
//     createTransactionMessage({ version: 'legacy' }),
//     (tx) => (
//         setTransactionMessageFeePayerSigner(adminKeypair, tx)
//     ),
//     // (tx) => (
//     //     addSignersToTransactionMessage(baseKeypair, tx)
//     // ),
//     (tx) => (
//         setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
//     ),
//     (tx) => (
//         appendTransactionMessageInstruction(
//             [instruction],
//             tx,
//         )
//     )
// );
// console.log("Transaction Message created");

// const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
// console.log("Transaction signed");

// try {
//     await sendAndConfirmTransaction(signedTransaction, { commitment: 'confirmed' });
//     log.info('[success] Transfer confirmed');
//     await pressAnyKeyPrompt('Press any key to quit');
// } catch (e) {
//     if (isSolanaError(e, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) {
//         const preflightErrorContext = e.context;
//         const preflightErrorMessage = e.message;
//         const errorDetailMessage = isSystemError(e.cause, transactionMessage)
//             ? getSystemErrorMessage(e.cause.context.code)
//             : e.cause?.message;
//         log.error(preflightErrorContext, '%s: %s', preflightErrorMessage, errorDetailMessage);
//     } else {
//         throw e;
//     }
// }

const transaction = createTransaction({
    feePayer: adminKeypair,
    instructions: [instruction],
    latestBlockhash,
    // the compute budget values are HIGHLY recommend to be set in order to maximize your transaction landing rate
    // computeUnitLimit: number,
    // computeUnitPrice: number,
});
const signedTransaction = addSignersToTransactionMessage([adminKeypair, baseKeypair], transaction);

// let signature = getSignatureFromTransaction(signedTransaction);

try {
    /**
     * Actually send the transaction to the blockchain and confirm it
     */
    await sendAndConfirmTransaction(signedTransaction);
  
    // you can also manually define additional settings for sending your transaction
    // await sendAndConfirmTransaction(signedTransaction, {
    //   commitment: "confirmed",
    //   skipPreflight: true,
    //   maxRetries: 10n,
    // });
  
    console.log("Transaction confirmed!", signature);
  } catch (err) {
    console.error("Unable to send and confirm the transaction");
    console.error(err);
  }
// const signedTransaction = await signTransactionMessageWithSigners(newTransaction);