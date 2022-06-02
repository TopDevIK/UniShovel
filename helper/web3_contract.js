const Web3 = require("web3");
const web3Provider = new Web3.providers.HttpProvider(process.env.RPC_URL);
const web3 = new Web3(web3Provider);
const ABI_UNISWAP_V2_PAIR = require("../abis/ABI_UNISWAP_V2_PAIR.json");

const v2PairContract = (address) => {
    return new web3.eth.Contract(ABI_UNISWAP_V2_PAIR, address);
};

module.exports = { v2PairContract };
