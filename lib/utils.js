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
    loop: function (start, stop, callback) {
        if (start < stop)
            for (var i = start - 1; ++i <= stop;) callback(i);
        else if (start > stop)
            for (var i = start + 1; --i >= stop;) callback(i);
        else callback(start);
    }
}