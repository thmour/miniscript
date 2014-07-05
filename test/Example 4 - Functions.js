var foo, args;
foo = function(x, y) {
    console.log(x, y);
};
foo(1, 6);
console.log((function(x) {
    return {
        val: x + 2
    };
})(3).val);
args = function() {
    return [].slice.call(arguments);
};
console.log(args(1, 2, 3) + "\n" + (1).toString());