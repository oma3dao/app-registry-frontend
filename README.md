# app-registry-frontend

Front end for the Application Registry

## License and Participation

- Code is licensed under [MIT](./LICENSE)
- Contributor terms are defined in [CONTRIBUTING.md](./CONTRIBUTING.md)


![tw-banner](https://github.com/thirdweb-example/next-starter/assets/57885104/20c8ce3b-4e55-4f10-ae03-2fe4743a5ee8)

## Documentation

- **Project Setup**: See the Setup section below for installation and environment setup instructions.
- **Source Code Documentation**: See [src/README.md](src/README.md) for detailed documentation on the source code, including:
  - Blockchain configuration via `chains.ts` and `contracts.ts`
  - How to configure and use smart contracts
  - Best practices for blockchain integration

## Setup

### Installation

Install the template using [thirdweb create](https://portal.thirdweb.com/cli/create)

```bash
  npx thirdweb create app --next
```

### Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

`CLIENT_ID`

To learn how to create a client ID, refer to the [client documentation](https://portal.thirdweb.com/typescript/v5/client). 

## Testing with Celo Alfajores Testnet

This application currently uses the App Registry contract deployed to the Celo Alfajores testnet for development and testing. THIS DOES NOT MEAN THE PRODUCTION APP REGISTRY CONTRACT WILL BE DEPLOYED TO CELO.  To interact with this application, you'll need to:

1. **Install MetaMask Mobile**
2. **Add Alfajores Testnet to MetaMask**
3. **Get test CELO tokens from the Alfajores faucet**

### Installing MetaMask

1. Visit [MetaMask.io](https://metamask.io/download/) to download the extension for your browser or download the app to your mobile device
2. Follow the setup instructions to create a new wallet or import an existing one
3. Make sure to securely store your recovery phrase

### Adding Celo Alfajores Testnet to MetaMask

#### Desktop Browser Extension:

1. Open MetaMask and click on the network dropdown (usually shows "Ethereum Mainnet")
2. Click "Add Network"
3. In newer versions, click "Add a network manually" at the bottom
4. Enter the following details:
   - **Network Name**: Celo Alfajores Testnet
   - **New RPC URL**: https://alfajores-forno.celo-testnet.org
   - **Chain ID**: 44787
   - **Currency Symbol**: CELO
   - **Block Explorer URL**: https://alfajores.celoscan.io

#### Mobile App:

1. Open the MetaMask app
2. Tap on the hamburger menu or the settings icon
3. Tap "Settings" → "Networks" → "Add Network"
4. Tap "Add a network manually" and enter the same details as above

### Getting Test CELO Tokens

1. Visit the [Alfajores Faucet](https://faucet.celo.org/alfajores)
2. Connect your wallet or paste your wallet address
3. Request the test CELO tokens
4. You can get additional tokens by signing in with GitHub (10x more tokens)
5. Wait a few moments for the tokens to appear in your wallet

### Connecting to the app

1. In Metamask, make sure you're using the Alfajores network (need to choose it in your Networks settings)
2. Hit the app connect button
3. Follow instructions

## Run locally

Install dependencies

```bash
yarn
```

Start development server

```bash
yarn dev
```

Create a production build

```bash
yarn build
```

Preview the production build

```bash
yarn start
```

## Resources

- [Documentation](https://portal.thirdweb.com/typescript/v5)
- [Templates](https://thirdweb.com/templates)
- [YouTube](https://www.youtube.com/c/thirdweb)
- [Blog](https://blog.thirdweb.com)

## Need help?

For help or feedback, please [visit our support site](https://thirdweb.com/support)
