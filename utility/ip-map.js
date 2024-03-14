const ttl = 5 * 60;
let ipMap = new Map();

const setIpWithTTL = (ip) => {
    ipMap.set(ip, Date.now() + ttl * 1000);
};

const isIpExpired = (ip) => {
    ipMap = new Map([...ipMap].filter(([, time]) => Date.now() < time));
    const ipTime = ipMap.get(ip);

    console.log(ipMap);
    return !ipTime;
};

module.exports = {
    setIpWithTTL,
    isIpExpired,
};