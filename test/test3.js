var obj, db, i, _i, _c, user, age;
obj = {
    a: 1,
    b: 2,
    c: 3
};
db = [{
    user: 'peter',
    age: 21
}, {
    user: 'john',
    age: 32
}, {
    user: 'ralph',
    age: 27
}];
_c = [1, 2, 3, 4, 5];
for (_i = -1, _l = _c.length; ++_i < _l;) {
    i = _c[_i];
    console.log(i);
}
_c = obj;
for (i in _c) {
    console.log(i + ':', obj[i]);
}
String.prototype.capitalize = function() {
    return this[0].toUpperCase() + this.slice(1);
};
_c = db;
for (_i = -1, _l = _c.length; ++_i < _l;) {
    user = _c[_i].user;
    age = _c[_i].age;
    console.log(user.capitalize() + " is " + (age + 1) + " years old");
}