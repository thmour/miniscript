var s;

function Node(value, next) {}

function Stack() {
    var stack, head;
    stack = new Node(null, null);
    head = null;
    this.__defineGetter__("head", function() {
        return stack.value;
    });
    this.push = function(value) {
        var v, _i, _l;
        if (value instanceof Array) {
            for (_i = -1, _l = value.length; ++_i < _l;) {
                v = value[_i];
                stack = new Node(v, stack);
            }
        } else {
            stack = new Node(value, stack);
        }
    };
    this.pop = function() {
        var temp;
        if (stack.value) {
            temp = stack.value;
            stack = stack.next;
            return temp;
        }
    };
}
s = new Stack();
s.push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
console.log(s.head);