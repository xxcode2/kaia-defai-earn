// encode alamat ke topic indexed (32 bytes)
export function addrTopic(addr: string) {
  const a = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + "0".repeat(64 - a.length) + a;
}
