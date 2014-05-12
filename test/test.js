var _utils = require("C:/Users/acer/Desktop/microjs/lib/utils.js");
var stack1, stack2;

function List(value, next) {
    this.value = value;
    this.next = next;
}

function Stack() {
    var stack = undefined;
    this.head = undefined;
    this.size = 0;
    this.push = function(value) {
        if (this.size < Stack.max_size) {
            stack = new List(value, stack);
            this.size++;
            this.head = stack.value;
        } else {
            throw new Error("Stack is full, can't push");
        }
    };
    this.pop = function() {
        if (this.size > 0) {
            var temp;
            temp = stack.value;
            stack = stack.next;
            this.size--;
            this.head = stack.value;
            return temp;
        } else {
            throw new Error("Stack is empty, can't pop");
        }
    };
    var args;
    args = arguments;
    for (var _i = -1, _c = args[0] instanceof Array ? args[0] : args, _l = _c.length, arg; ++_i < _l;) {
        arg = _c[_i];
        this.push(arg);
    }
    this.head = stack ? stack.value : null;
}
Stack.max_size = 50;
stack1 = new Stack(1, 2, 3, 4);
stack2 = new Stack(_utils.range(0, 49));
try {
    stack2.push(10);
} catch (error) {
    console.log(error.message);
}
console.log(stack1.head, stack2.head);