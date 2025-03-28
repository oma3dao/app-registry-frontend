import { client } from "./app/client";
import { ConnectButton, useActiveAccount, useWalletBalance } from "thirdweb/react";
import { thirdwebTestSubnet } from "./config/chains"; // Import the chain configuration

function App() {
  const account = useActiveAccount();
  const { data: balance, isLoading } = useWalletBalance({
    client,
    chain: thirdwebTestSubnet, // Replace with the actual chain you're using
    address: account?.address,
  });

  return (
    <div>
      <ConnectButton client={client} />
      {account && (
        <div>
          <p>Wallet address: {account.address}</p>
          <p>
            Wallet balance: {balance?.displayValue} {balance?.symbol}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
