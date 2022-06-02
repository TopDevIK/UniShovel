const KConsole = {
    log: function (...args) {
        console.log(...args);
    },
    red: function (...args) {
        console.log("\x1b[31m%s\x1b[0m", ...args);
    },
    cyan: function (...args) {
        console.log("\x1b[36m%s\x1b[0m", ...args);
    },
    magenta: function (...args) {
        console.log("\x1b[35m%s\x1b[0m", ...args);
    },
    dim: function (...args) {
        console.log("\x1b[2m", ...args);
    },
    BgYellow: function (...args) {
        console.log("\x1b[43m", ...args);
    },
};

module.exports = KConsole;
