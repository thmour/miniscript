module.exports = {
    range: function(start, stop, step, until) {
        var len, array;
        if(step === 1) {
            len   = Math.abs(start-stop) + 1;
            array = new Array(len);

            if(start < stop)
                for (var i = 0; i < len; ++i) array[i] = start + i;
            else if(start > stop)
                for (var i = 0; i < len; ++i) array[i] = start - i;
            else
                return start;
        } else {
            len   = Math.floor(Math.abs(start-stop) / step) + 1;
            array = new Array(len);
            if(start < stop)
                for (var i = 0; i < len; ++i) array[i] = start + i * step;
            else if(start > stop)
                for (var i = 0; i < len; ++i) array[i] = start - i * step;
            else
                return start;
        }

        if(until) array.pop();

        return array;
    },
    recursion: function(init, end, callback, until) {
        var result = [], len = callback.length, next, prev, i = 0;
        if (init.constructor === Array) {
            for (; i < len; ++i) {
                result[i] = init[i];
            }
        } else {
            result[i++] = init;
        }
        do {
            prev = next, next = callback.apply(null, result.slice(i - len));

            if (next === undefined) throw Error("Got 'undefined' in sequence expression");
            if (next === end) {
                if(until) {
                    return result.slice(0, i);    
                } else {
                    result[i] = next;
                    return result.slice(0, i + 1);
                }
            }
            if ((prev < end && next > end) || (prev > end && next < end)) {
                return result.slice(0, i);
            }
            result[i] = next; i++;
        } while(true);
    },
    extend: function(child, parent) {
        child.prototype = Object.create(parent.prototype);
        child.prototype.constructor = child;
        child.parent = parent;
    },
    in: function(value, object) {
        if(object.constructor === Object)
            return object.hasOwnProperty(value);

        if(object.constructor === Array || object.constructor === String)
            return object.indexOf(value) !== -1;

        throw TypeError("Operator 'in' doesn't apply on " + (typeof object) + "s");
    }
}