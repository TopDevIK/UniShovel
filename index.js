require("dotenv").config();
const { MongoClient } = require("mongodb");
const KConsole = require("./helper/KConsole");
const { web3, v2PairContract } = require("./helper/web3_contract");
const fetch = require("node-fetch");

const BATCH_COUNT = 1;
// ENV VARIABLES
BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;

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
            console.log(data);
            return data.result;
        } catch (error) {
            console.log(
                timeStamp,
                `bscscan api error with timesamp :try again ${i} times,`,
                error
            );
            i++;
        }
    process.exit();
};

const getBlockNumberByTimeStampGraphQL = async (timeStamp) => {
    const query = JSON.stringify({
        query: `
        query getBlockNumberByTimeStampGraphQL($after: ISO8601DateTime!, $before: ISO8601DateTime!){
            ethereum(network: bsc) {
              blocks(time: {after: $after, before: $before}, options: {limit: 1}) {
                  height
                  timestamp {
                    unixtime
                    iso8601
                  }
                  count
              }
            }
        }
        `,
        variables: {
            after: new Date(timeStamp * 1000).toISOString(),
            before: new Date((timeStamp + 60) * 1000).toISOString(),
        },
    });
    const response = await fetch("https://graphql.bitquery.io/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": BITQUERY_API_KEY,
        },
        body: query,
    });
    const data = await response.json();
    const blocks = data.data.ethereum.blocks;
    if (blocks.length > 0) return blocks[0].height;
};
const getPriceDuringPeriodWeb3js = async (fromBlock, toBlock) => {
    let logs = await web3.eth.getPastLogs({
        address: pairAddress,
        fromBlock,
        toBlock,
        topics: [
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
        ],
    });
    if (logs.length === 0) return undefined;
    const item = logs[0];
    amount0In = parseInt("0x" + item.data.slice(2, 66));
    amount0Out = parseInt("0x" + item.data.slice(66, 130));
    amount1In = parseInt("0x" + item.data.slice(130, 194));
    amount1Out = parseInt("0x" + item.data.slice(194));

    usdPrice = (amount0In + amount0Out) / (amount1In + amount1Out);

    return usdPrice;
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
            getBlockNumberByTimeStampGraphQL(timeStamp),
            getBlockNumberByTimeStampGraphQL(timeStamp + interval),
        ]);
        let usdPrice = await getPriceDuringPeriodWeb3js(fromBlock, toBlock);

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
    fromTimeStamp = fromTimeStamp - (fromTimeStamp % interval);
    toTimeStamp = toTimeStamp - (toTimeStamp % interval);
    KConsole.cyan(`from ${fromTimeStamp} to ${toTimeStamp}`);
    for (
        let interator = toTimeStamp;
        interator >= fromTimeStamp;
        interator -= interval * BATCH_COUNT
    ) {
        let timeStampArr = Array.from(
            { length: BATCH_COUNT },
            (_, offset) => interator + offset * interval
        )
            .filter((item) => item >= fromTimeStamp)
            .reverse();
        KConsole.cyan(
            `processing ${timeStampArr.at(0)} ~ ${timeStampArr.at(-1)}`
        );
        await Promise.all(
            timeStampArr.map((timeStamp) => getCoinPriceAt(timeStamp))
        );
        KConsole.magenta("Done!");
    }

    return;
}
main().then().catch(console.error).finally(process.exit);
