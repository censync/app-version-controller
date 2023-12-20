import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const SEPOLIA_PRIVATE_KEY = "PRIVATE KEY";


module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {},
        sepolia: {
            url: `https://rpc.address.domain:PORT/eth_testnet`,
            account: [`{process.env.SEPOLIA_PRIVATE_KEY}`]
        }
    },
    solidity: {
        version: "0.8.23",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
}