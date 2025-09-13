export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // keccak("Transfer(address,address,uint256)")

export function topicAddr(addr: string) {
  const a = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + "0".repeat(24) + a; // 12 bytes padding
}

export function hexToBigInt(hex: string): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}
