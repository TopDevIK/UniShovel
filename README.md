# `UniShovel` - _Get Native Coin Price History_

## Compatible with various networks and Dex

[![N|Solid](https://logos-world.net/wp-content/uploads/2020/12/Ethereum-Emblem-700x394.png)](https://ethereum.org/en/)

`UniShovel` is public open-source project for getting the price history of native coin working on any EVM-Compatible networks (Ethereum, Binance Smart Chain, Polyon, AVAX and so on).

## Features

-   Scan native coin price history of any EVM networks
-   ✨Linked to MongoDB Cloud✨

## Tech

`UniShovel` uses a number of open source projects to work properly:

-   [Uniswap-V2] - Swap, earn, and build on the leading decentralized crypto trading protocol
-   [BSCScan] - HTML enhanced for web apps!
-   [Web3.js] - awesome web-based text editor
-   [node.js] - evented I/O for the backend
-   [MongoDB] - source-available cross-platform document-oriented database program

And of course `UniShovel` itself is open source with a [public repository]
on GitHub.

## Installation

This requires [Node.js](https://nodejs.org/) v10+ to run.

Install the dependencies and devDependencies and start the server.

```sh
cd UniShovel
npm i
node index
```

## Customizations

`UniShovel` has several features built-in with scripts.

### `-c` or `--chain`

Use it to specify the name of EVM-chain, `bsc` by default. Example:

```sh
node index -c eth
```

### `-p` or `--pair`

Use it to specify the Uniswap V2 pair address of network, [`0x58f876857a02d6762e0101bb5c46a8c1ed44dc16`](https://bscscan.com/address/0x58f876857a02d6762e0101bb5c46a8c1ed44dc16) by default. Example:

```sh
node index -p 0x58f876857a02d6762e0101bb5c46a8c1ed44dc16
```

### `-t` or `--to`

Use it to specify the ending timestamp(in second format) of searching period, `new Date().getTime()/1000` by default. Example:

```sh
node index -t 1654184938
```

### `-d` or `--duration`

Use it to specify the duration(in second format) of searching period, `3600` by default. Example:

```sh
node index -f 1654184938
```

### `-f` or `--from`

Use it to specify the beginning timestamp(in second format) of searching period, `toTimeStamp-duration` by default. Example:

```sh
node index -f 1654184938
```

### `-i` or `--interval`

Use it to specify the interval(in second format) of logging price, `60` by default. Example:

```sh
node index -i 600
```

> Support with CRYPTOCURRENCY
> [`0x1a77a3bdfc146842296912cbfafb67064f2c629b`](https://bscscan.com/address/0x1a77a3bdfc146842296912cbfafb67064f2c629b)

> Welcome your Contribution!!!

## License

MIT

**Free Software, Hell Yeah!**

[//]: # "These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax"
[mongodb]: https://mongodb.com
[uniswap-v2]: https://uniswap.org/
[public repository]: https://github.com/OzoneClub/UniShovel
[df1]: http://daringfireball.net/projects/markdown/
[markdown-it]: https://github.com/markdown-it/markdown-it
[web3.js]: https://web3js.readthedocs.io/
[node.js]: http://nodejs.org
[express]: http://expressjs.com
[bscscan]: http://bscscan.com
