export type GetLogsParams = {
  address: string;
  fromBlock?: number | string;
  toBlock?: number | "latest";
  topics?: (string | null)[]; // topi0, topi1, topi2...
};

export async function rpcGetLogs(params: GetLogsParams) {
  const body = {
    address: params.address.toLowerCase(),
    fromBlock:
      typeof params.fromBlock === "number"
        ? "0x" + params.fromBlock.toString(16)
        : params.fromBlock ?? "0x0",
    toBlock: params.toBlock ?? "latest",
    topics: params.topics ?? [],
  };

  const res = await fetch("/api/logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`rpcGetLogs: ${res.status} ${JSON.stringify(err)}`);
  }
  return (await res.json()) as any[];
}
