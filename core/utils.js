(module.exports = function () {

    const sum = (items, f) => {
        return items.reduce(function (a, b) {
            return a + f(b);
        }, 0);
    };

    const copy = (obj) => {
        return Object.assign({}, obj);
    };

    const deepCopy = (obj) => {
        return JSON.parse(JSON.stringify(obj));
    };


    const sort = (items, f) => {
        items.sort((a, b) => (f(a) < f(b)) ? 1 : ((f(b) < f(a)) ? -1 : 0))
    };

    return {
        sum,
        copy,
        deepCopy,
        sort
    };
})();