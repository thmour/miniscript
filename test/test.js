var stack;

function List(value, next) {
    this.value = value;
    this.next = next;
}

function Stack() {
    var arg, _i, _l;
    var stack = null;
    this.size = 0;
    this.getHead = function() {
        return stack.value;
    };
    this.push = function(value) {
        if (this.size < Stack.max_size) {
            stack = new List(value, stack);
            this.size++;
        } else {
            throw new Error("Stack is full, can't push");
        }
    };
    this.pop = function() {
        var temp;
        if (this.size > 0) {
            temp = stack.value;
            stack = stack.next;
            this.size--;
            return temp;
        } else {
            throw new Error("Stack is empty, can't pop");
        }
    };
    for (_i = -1, _l = arguments.length; ++_i < _l;) {
        arg = arguments[_i];
        this.push(arg);
    }
}
Stack.max_size = 5;
stack = new Stack(1, 2, 3, 4, 5);
try {
    stack.push(6);
} catch (error) {
    console.log(error.message);
}
console.log(stack.getHead());