require("dotenv").config();
const { MongoClient } = require("mongodb");
const KConsole = require("./helper/KConsole");
const { web3, v2PairContract } = require("./helper/web3_contract");
const fetch = require("node-fetch");

// ENV VARIABLES
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const BITQUERY_API_KEY_ARRAY = process.env.BITQUERY_API_KEY_ARRAY.split(" ");
const BATCH_COUNT = BITQUERY_API_KEY_ARRAY.length / 2;
let CURRENT_API_KEY_ARRAY = [];

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

const getBlockNumberByTimeStampGraphQL = async (timeStamp, index) => {
    const BITQUERY_API_KEY = CURRENT_API_KEY_ARRAY.at(parseInt(index));
    let text;
    let i = 0;
    while (i < 5)
        try {
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
            // return text;
            text = await response.text();
            // KConsole.red(text);
            const data = JSON.parse(text);
            // process.exit();
            const blocks = data.data.ethereum.blocks;
            if (blocks.length > 0) return blocks[0].height;
            else return undefined;
        } catch (error) {
            console.log(
                timeStamp,
                `bitquery graphql error with timesamp :try again ${i} times in 10s,`,
                error
            );
            KConsole.red(text);
            await new Promise((resolve) => setTimeout(resolve, 10000));
            i++;
        }
    process.exit();
};
const getPriceDuringPeriodWeb3js = async (fromBlock, toBlock) => {
    let i = 0;
    while (i < 5) {
        try {
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
            amount0Out = parseInt("0x" + item.data.slice(130, 194));
            amount1In = parseInt("0x" + item.data.slice(66, 130));
            amount1Out = parseInt("0x" + item.data.slice(194));

            usdPrice = (amount1In + amount1Out) / (amount0In + amount0Out);

            return usdPrice;
        } catch (error) {
            console.log(`web3 error ${fromBlock}`, error);
            i++;
        }
    }
    process.exit();
};

const getCoinPriceAt = async (timeStamp, index) => {
    try {
        const [fromBlock, toBlock] = await Promise.all([
            getBlockNumberByTimeStampGraphQL(timeStamp, index),
            getBlockNumberByTimeStampGraphQL(timeStamp + interval, index),
        ]);
        if (fromBlock === undefined || toBlock === undefined) return;
        console.log(fromBlock, toBlock);
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
    let API_KEY_USING = 0;
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
        CURRENT_API_KEY_ARRAY = BITQUERY_API_KEY_ARRAY.slice(
            API_KEY_USING * BATCH_COUNT,
            API_KEY_USING * BATCH_COUNT + BATCH_COUNT
        );
        // console.log(CURRENT_API_KEY_ARRAY);
        API_KEY_USING = 1 - API_KEY_USING;
        await Promise.all(
            timeStampArr.map((timeStamp, index) =>
                getCoinPriceAt(timeStamp, index)
            )
        );
        KConsole.magenta("Done!");
    }

    return;
}
main().then().catch(console.error).finally(process.exit);
