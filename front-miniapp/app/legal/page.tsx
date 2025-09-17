export const dynamic = 'force-static';

export default function LegalPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 prose prose-slate">
      <h1>Terms & Privacy</h1>

      <h2>About MORE Earn (Test Mode)</h2>
      <p>
        MORE Earn is a demo Mini Dapp for the Kaia Wave Stablecoin Summer Hackathon.
        It allows users to simulate USDT deposits into a vault with an auto-compounding strategy,
        missions, and referrals. Parts of the payment flow run in <strong>test mode</strong>.
      </p>

      <h2>Data We Store</h2>
      <ul>
        <li>Wallet address and network (on-chain public info)</li>
        <li>Off-chain points and mission progress</li>
        <li>Referral code and basic analytics (aggregated)</li>
      </ul>

      <h2>No Custody</h2>
      <p>
        Users interact directly with smart contracts from their wallets.
        We do not take custody of funds. Gas fees apply for on-chain actions.
      </p>

      <h2>Risks & Disclaimers</h2>
      <ul>
        <li>On-chain transactions are irreversible.</li>
        <li>APY is a target for demo purposes; not a guarantee.</li>
        <li>Use at your own risk. This software is provided “as is”.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        For data removal or questions, contact: <em>support@more-earn.app</em>
      </p>
    </main>
  );
}
