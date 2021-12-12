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

a) deploy JTrancheDeployer and JAave contract and initialize them (JAave parameters: address _adminTools, address _feesCollector, address _tranchesDepl,
            address _aaveIncentiveController, address _wethAddress, address _rewardsToken, uint256 _blocksPerYear)

b) call setAavePoolAddressProvider(address _aavePool)
    
    setAavePoolAddressProvider: 0x9d787053f9839966A664b0e14e9C26a3684F6E44 (on Kovan testnet)

c) set JAave address in jTranchesDeployer contract, 

    setAavePoolAddressProvider: 0x88757f2f99175387aB4C6a4b3067c77A695b0349 (on Kovan testnet)

d) call addTrancheToProtocol(address _erc20Contract, string memory _nameA, string memory _symbolA, 
            string memory _nameB, string memory _symbolB, uint256 _fixedRpb, uint8 _underlyingDec) to set a new tranche set

    add ETH tranche: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE","0x87b1f4cf9BD63f7BBD3eE1aD04E8F52540349347","Eth Tranche A","ETA","Eth Tranche B","ETB", web3.utils.toWei("0.04", "ether"),"18"  ----> Please read note below here

    add DAI tranche: "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD","0xdCf0aF9e59C002FA3AA091a46196b37530FD48a8","Dai tranche A","DTA","Dai Tranche B","DTB", web3.utils.toWei("0.03", "ether"),"18"

    add USDT tranche: "0x13512979ADE267AB5100878E2e0f485B568328a4","0xFF3c8bc103682FA918c954E84F5056aB4DD5189d","USDT tranche A","USDTA","USDT Tranche B","USDTB",web3.utils.toWei("0.125", "ether"),"6"

    add USDC tranche: "0xe22da380ee6B445bb8273C81944ADEB6E8450422","0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0","USDC tranche A","USDCA","USDC Tranche B","USDCB",web3.utils.toWei("0.02", "ether"),"6"

e) remember to enable every tranche deposit with setTrancheDeposit(uint256 _trancheNum, bool _enable) function

Users can now call buy and redeem functions for tranche A & B tokens

Note: if ETH tranche is deployed, please deploy WETHGateway contract without any proxy, then set its address in JAave with setWETHGatewayAddress function.

[(Back to top)](#Aave-Tranche-Protocol)

## Ethereum deployment

Here (https://docs.aave.com/developers/deployed-contracts/deployed-contracts) you can find Aave deployed contract on Ethereum mainnet and testnet

[(Back to top)](#Aave-Tranche-Protocol)

## Polygon deployment

Aave tranches are implemented on polygon, an ethereum layer 2 (https://polygon.technology/).

Here (https://docs.aave.com/developers/deployed-contracts/matic-polygon-market) you can find Aave deployed contract on Polygon mainnet and testnet

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
            <td>JAave</td>
            <td><code>22.13</code></td>
            <td>Core contract protocol (implementation). It is responsible to make all actions to give the exact amount of tranche token to users, connecting with Aave to have interest rates and other informations to give tokens the price they should have block by block. It claims extra token from Aave, sending them to Fees collector contract, that changes all fees and extra tokens into new interests for token holders. It also opens new tranches, and, via Tranche Deployer contract, it deploys new tranche tokens.</td>
        </tr>
        <tr>
            <td>JAaveStorageV2</td>
            <td><code>2.16</code></td>
            <td>Core contract protocol (storage)</td>
        </tr>
        <tr>
            <td>JAdminTools</td>
            <td><code>2.73</code></td>
            <td>Contract for administrative roles control (implementation), allowing the identification of addresses when dealing with reserved methods.</td>
        </tr>
        <tr>
            <td>JAdminToolsStorage</td>
            <td><code>0.87</code></td>
            <td>Contract for administrative roles control (storage)</td>
        </tr>
        <tr>
            <td>JFeesCollector</td>
            <td><code>10.40</code></td>
            <td>Fees collector and uniswap swapper (implementation), it changes all fees and extra tokens into new interests for token holders, sending back extra amount to Aave protocol contract</td>
        </tr>
        <tr>
            <td>JFeesCollectorStorage</td>
            <td><code>0.96</code></td>
            <td>Fees collector and uniswap swapper (storage)</td>
        </tr>
        <tr>
            <td>JTrancheAToken</td>
            <td><code>10.18</code></td>
            <td>Tranche A token (implementation), with a non decreasing price, making possible for holders to have a fixed interest percentage.</td>
        </tr>
        <tr>
            <td>JTrancheATokenStorage</td>
            <td><code>0.44</code></td>
            <td>Tranche A token (storage)</td>
        </tr>
        <tr>
            <td>JTrancheBToken</td>
            <td><code>10.18</code></td>
            <td>Tranche B token (implementation), with a floating price, making possible for holders to have a variable interest percentage.</td>
        </tr>
        <tr>
            <td>JTrancheBTokenStorage</td>
            <td><code>0.44</code></td>
            <td>Tranche B token (storage)</td>
        </tr>
        <tr>
            <td>JTranchesDeployer</td>
            <td><code>23.70</code></td>
            <td>Tranche A & B token deployer (implementation): this contract deploys tranche tokens everytime a new tranche is opened by the core protocol contract</td>
        </tr>
        <tr>
            <td>JTranchesDeployerStorage</td>
            <td><code>0.14</code></td>
            <td>Tranche A & B token deployer (storage)</td>
        </tr>
        <tr>
            <td>WETHGateway</td>
            <td><code>2.72</code></td>
            <td>Wrapped Ethereum gateway, useful when dealing with wrapped ethers and ethers</td>
        </tr>
    </tbody>
  </table>

  [(Back to top)](#Aave-Tranche-Protocol)
