module.exports = {
    range: function (start, stop) {
        var result = [];
        if (start < stop)
            for (var i = start - 1; ++i <= stop;) result.push(i);
        else if (start > stop)
            for (var i = start + 1; --i >= stop;) result.push(i);
        else result.push(start);
        return result;
    },
    extend: function (target) {
        var cls;
        target.prototype = new arguments[1]();
        var args = [].slice.call(arguments);
        for (var i = 1, l = args.length; ++i < l;) {
            cls = new args[i]();
            for (var member in cls) {
                this.prototype[member] = cls[member];
            }
        }
    }
}