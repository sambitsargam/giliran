import { encodeAbiParameters, keccak256, toHex, type Address, type Hex } from "viem";

/** 32 random bytes from the platform CSPRNG. */
export function newSecret(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** Matches Circle: keccak256(abi.encode(secret, organiser)). */
export function orderCommit(secret: Hex, organiser: Address): Hex {
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [secret, organiser]));
}
