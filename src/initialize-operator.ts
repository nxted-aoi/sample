import { 
    address,
    generateKeyPairSigner, 
    getProgramDerivedAddress, 
    getAddressEncoder,
    addSignersToTransactionMessage, 
    createTransaction, 
    createSignerFromKeyPair,
    createSolanaClient,
    createKeyPairFromBytes 
} from "gill";
import { getInitializeNcnInstruction, getInitializeOperatorInstruction, InitializeOperatorInput } from "@jito-foundation/restaking-sdk";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";

const cluster = "devnet";

const restakingProgramPubkey = address("RestkWeAVL8fRGgzhfeoqFhsqKRchg6aa1XrcH96z4Q");
const configPubkey = address("4vvKh3Ws4vGzgXRVdo8SdL4jePXDvCqKVmi21BCBGwvn");

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
});

const keypairFilePath = "~/.config/solana/id.json";

const resolvedKeypairPath = resolve(keypairFilePath.replace("~", homedir()));

const keypair = await createKeyPairFromBytes(
  Uint8Array.from(JSON.parse(readFileSync(resolvedKeypairPath, "utf8"))),
);

const adminKeypair = await createSignerFromKeyPair(keypair);
console.log("Admin: ", adminKeypair.address);

const baseKeypair = await generateKeyPairSigner();
console.log("Base: ", baseKeypair.address);

const addressEncoder = getAddressEncoder();

const [operatorPubkey, bumpSeed] = await getProgramDerivedAddress({
    programAddress: restakingProgramPubkey, 
    seeds: [
        Buffer.from("operator"),
        addressEncoder.encode(baseKeypair.address)
    ]
});

const input: InitializeOperatorInput = {
    config: configPubkey,
    operator: operatorPubkey,
    admin: adminKeypair,
    base: baseKeypair,
    operatorFeeBps: 1000,
};

const instruction = getInitializeOperatorInstruction(input);

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transaction = createTransaction({
    feePayer: adminKeypair,
    instructions: [instruction],
    latestBlockhash,
    version: "legacy"
});
const signedTransaction = addSignersToTransactionMessage([adminKeypair, baseKeypair], transaction);

try {
    const signature = await sendAndConfirmTransaction(signedTransaction);
  
    console.log("Transaction confirmed!", signature);
} catch (err) {
    console.error("Unable to send and confirm the transaction");
    console.error(err);
}