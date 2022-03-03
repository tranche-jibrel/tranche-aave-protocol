# Aave Tranche Protocol

<img src="https://gblobscdn.gitbook.com/spaces%2F-MP969WsfbfQJJFgxp2K%2Favatar-1617981494187.png?alt=media" alt="Tranche Logo" width="100">

Aave Tranche is a decentralized protocol for managing risk and maximizing returns. The protocol integrates with Aave's aTokens, to create two new interest-bearing instruments, one with a fixed-rate, Tranche A, and one with a variable rate, Tranche B. 

Info URL: https://docs.tranche.finance/tranchefinance/


## Development

### Install Dependencies

```bash
npm i
```

### Compile project

```bash
truffle compile --all
```

[(Back to top)](#Aave-Tranche-Protocol)

## Aave Protocol usage

Please look into ./migrations/1_initial_migration.js file for a complete understanding on how to configure Aave Tranches.

Users can then call buy and redeem functions for tranche A & B tokens (interest bearing tokens)

Note: if ETH tranche is deployed (ethereum blockchain), or if MATIC tranche is deployed (polygon blockchain), or if AVAX tranche is deployed (Avalanche blockchain), please deploy WETHGateway contract without any proxy, then set its address in JAave with setWETHGatewayAddress function.

[(Back to top)](#Aave-Tranche-Protocol)

## Ethereum deployment

Here (https://docs.aave.com/developers/deployed-contracts/deployed-contracts) you can find Aave deployed contract on Ethereum mainnet and testnet

[(Back to top)](#Aave-Tranche-Protocol)

## Polygon deployment

Aave tranches are implemented on polygon, an ethereum layer 2 (https://polygon.technology/).

Here (https://docs.aave.com/developers/deployed-contracts/matic-polygon-market) you can find Aave deployed contract on Polygon mainnet and testnet

[(Back to top)](#Aave-Tranche-Protocol)

## Avalanche deployment

Aave tranches are implemented on Avalanche.

<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Test %</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
        <tr>
            <td>JAave</td>
            <td><code>93.39%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JFeesCollector</td>
            <td><code>6.25%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JAdminTools</td>
            <td><code>57.89%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JTrancheDeployer</td>
            <td><code>80%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>JTrancheTokens</td>
            <td><code>100%</code></td>
            <td>---</td>
        </tr>
        <tr>
            <td>IncentivesController</td>
            <td><code>65.54%</code></td>
            <td>99% in https://github.com/tranche-jibrel/tranche-rewards</td>
        </tr>
        <tr>
            <td>MarketHelper</td>
            <td><code>95.12%</code></td>
            <td>98% in https://github.com/tranche-jibrel/tranche-rewards</td>
        </tr>
        <tr>
            <td>PriceHelper</td>
            <td><code>30.43%</code></td>
            <td>96% in https://github.com/tranche-jibrel/tranche-rewards</td>
        </tr>
        <tr>
            <td>WETHGateway</td>
            <td><code>58.82%</code></td>
            <td>---</td>
        </tr>
    </tbody>
  </table>

[(Back to top)](#Aave-Tranche-Protocol)

## SIRs ready

Aave tranches is ready for SIRs system.

[(Back to top)](#Aave-Tranche-Protocol)

## Main contracts - Name, Size and Description

<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Size (KiB)</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
    <tr>
        <td>IncentivesController</td>
            <td><code>21.55</code></td>
            <td>Incentives controller contract (implementation). It distributes rewards to single tranches based on TVLs and returns from every tranche. Rewards are normally distributed in platform token (liquidity farming)</td>
        </tr>
        <td>IncentivesControllerStorage</td>
            <td><code>1.67</code></td>
            <td>Incentives controller contract (storage)</td>
        </tr>
        <tr>
            <td>JAave</td>
            <td><code>21.97</code></td>
            <td>Core contract protocol (implementation). It is responsible to make all actions to give the exact amount of tranche token to users, connecting with Aave to have interest rates and other informations to give tokens the price they should have block by block. It claims extra token from Aave, sending them to Fees collector contract, that changes all fees and extra tokens into new interests for token holders. It also opens new tranches, and, via Tranche Deployer contract, it deploys new tranche tokens.</td>
        </tr>
        <tr>
            <td>JAaveStorageV2</td>
            <td><code>1.91</code></td>
            <td>Core contract protocol (storage)</td>
        </tr>
        <tr>
            <td>JAdminTools</td>
            <td><code>2.16</code></td>
            <td>Contract for administrative roles control (implementation), allowing the identification of addresses when dealing with reserved methods.</td>
        </tr>
        <tr>
            <td>JAdminToolsStorage</td>
            <td><code>0.72</code></td>
            <td>Contract for administrative roles control (storage)</td>
        </tr>
        <tr>
            <td>JFeesCollector</td>
            <td><code>9.00</code></td>
            <td>Fees collector and uniswap swapper (implementation), it changes all fees and extra tokens into new interests for token holders, sending back extra amount to Aave protocol contract</td>
        </tr>
        <tr>
            <td>JFeesCollectorStorage</td>
            <td><code>0.82</code></td>
            <td>Fees collector and uniswap swapper (storage)</td>
        </tr>
        <tr>
            <td>JTrancheAToken</td>
            <td><code>6.83</code></td>
            <td>Tranche A token (implementation and storage), with a non decreasing price, making possible for holders to have a fixed interest percentage. Not upgradeable</td>
        </tr>
        <tr>
            <td>JTrancheBToken</td>
            <td><code>6.83</code></td>
            <td>Tranche B token (implementation and storage), with a floating price, making possible for holders to have a variable interest percentage. Not upgradeable</td>
        </tr>
        <tr>
            <td>JTranchesDeployer</td>
            <td><code>18.36</code></td>
            <td>Tranche A & B token deployer (implementation): this contract deploys tranche tokens everytime a new tranche is opened by the core protocol contract</td>
        </tr>
        <tr>
            <td>JTranchesDeployerStorage</td>
            <td><code>0.17</code></td>
            <td>Tranche A & B token deployer (storage)</td>
        </tr>
        <tr>
            <td>WETHGateway</td>
            <td><code>2.55</code></td>
            <td>Wrapped Ethereum gateway, useful when dealing with wrapped ethers and ethers</td>
        </tr>
    </tbody>
  </table>

  [(Back to top)](#Aave-Tranche-Protocol)
