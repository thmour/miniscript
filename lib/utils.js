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
    },
    extend: function(child, parent) {
        child.prototype = Object.create(parent.prototype);
        child.prototype.constructor = child;
    },
    require: function(module, file) {
        source = require('fs').readFileSync(file, 'utf8');

        output = require('miniscript').compile(source);

        return module._compile(output, file);
    }
}