require("dotenv").config();
const { MongoClient } = require("mongodb");
const KConsole = require("./helper/KConsole");
const { v2PairContract } = require("./helper/web3_contract");
const fetch = require("node-fetch");

// ENV VARIABLES
BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

// Connection URL
const url = process.env.DB_URI;
const client = new MongoClient(url);

// Database Name
const dbName = "native_coin_history";
let chainName = "bsc";
let db;
let collection;

let pairAddress = "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16";
let fromTimeStamp, toTimeStamp;
let duration, interval;

let pairContract;

const connectDB = async () => {
    await client.connect();
    console.log("Connected successfully to server");
    db = client.db(dbName);
    collection = db.collection(chainName);
};
const parseArgument = (_prefix, _longPrefix, _defaultValue) => {
    let result = _defaultValue;
    process.argv.forEach((item, index) => {
        if (item == `-${_prefix}` || item == `--${_longPrefix}`)
            result = process.argv[index + 1];
    });
    return result;
};

const getBlockNumberByTimeStamp = async (timeStamp) => {
    let i = 0;
    while (i < 5)
        try {
            const response = await fetch(
                `https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${timeStamp}&closest=before&apikey=${BSCSCAN_API_KEY}`
            );
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.log(
                timeStamp,
                `bscscan api error with timesamp :try again ${i} times`
            );
            i++;
        }
    process.exit();
};

const getPriceDuringPeriod = async (fromBlock, toBlock) => {
    let usdPrice;
    let i = 0;
    while (i < 5)
        try {
            let response = await fetch(
                `https://api.bscscan.com/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=${toBlock}&address=${pairAddress}&topic0=0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822&apikey=${BSCSCAN_API_KEY}`
            );
            const data = await response.json();
            if (response.status === 200) {
                if (data.result.length === 0) return undefined;
                const item = data.result[0];
                amount0In = parseInt("0x" + item.data.slice(2, 66));
                amount0Out = parseInt("0x" + item.data.slice(66, 130));
                amount1In = parseInt("0x" + item.data.slice(130, 194));
                amount1Out = parseInt("0x" + item.data.slice(194));

                usdPrice = (amount0In + amount0Out) / (amount1In + amount1Out);

                return usdPrice;
            }
        } catch (error) {
            console.log(
                `bscscan api error with getting log ${fromBlock} - ${toBlock}:try again ${i} times`,
                error
            );
            i++;
        }
    process.exit();
};

const getCoinPriceAt = async (timeStamp) => {
    try {
        const [fromBlock, toBlock] = await Promise.all([
            getBlockNumberByTimeStamp(timeStamp),
            getBlockNumberByTimeStamp(timeStamp + interval),
        ]);
        let usdPrice = await getPriceDuringPeriod(fromBlock, toBlock);

        const updateDBItem = {
            timeStamp,
            usdPrice,
            fromBlock,
            toBlock,
            updatedAt: new Date().getTime(),
        };
        await collection.updateOne(
            { timeStamp },
            { $set: updateDBItem },
            { upsert: true }
        );
        return usdPrice;
    } catch (error) {
        console.log("error", timeStamp, error);
        process.exit();
    }
};
async function main() {
    chainName = parseArgument("c", "chain", "bsc");
    pairAddress = parseArgument(
        "p",
        "pair",
        "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16"
    );
    toTimeStamp = parseArgument(
        "t",
        "to",
        parseInt(new Date().getTime() / 1000)
    );
    duration = parseArgument("d", "duration", 3600);
    interval = parseArgument("i", "interval", 60);
    fromTimeStamp = parseArgument("f", "from", toTimeStamp - duration);
    pairContract = v2PairContract(pairAddress);
    await connectDB();

    console.log(await getCoinPriceAt(1654184938));

    return;
}
main().then(console.log).catch(console.error).finally(process.exit);
