var _utils = {
    extend: function(child, parent) {
        child.prototype = parent.prototype;
        child.prototype.constructor = child;
    }
};

function Point(x, y) {
    this.x = x;
    this.y = y;
}

function Point3(x, y, z) {
    Point.apply(this, [].slice.call(arguments, 0, 2));
    this.z = z;
}
_utils.extend(Point3, Point);
Point3.add = function(p1, p2) {
    return new Point3(p1.x + p2.x, p1.y + p2.y, p1.z + p2.z);
};
console.log(Point3.add(new Point3(1, 2, 3), new Point3(1, 1, 1)));