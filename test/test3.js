var arr;
arr = [];
for (var _i = -1, _c = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], _l = _c.length, i; ++_i < _l;) {
    i = _c[_i];
    arr.push({
        a: i,
        b: i * 3
    });
}
for (var _i = -1, _c = arr, _l = _c.length, _keys = Object.keys(_c[0]), a, b; ++_i < _l;) {
    a = _c[_i][_keys[0]];
    b = _c[_i][_keys[1]];
    console.log('a: ' + (undefined) + '\tb: ' + (undefined) + '');
}