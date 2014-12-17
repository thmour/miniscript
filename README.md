miniscript
====

Miniscript is a compiler that translates its code to Javascript.
It makes coding faster and easier by following the DRY principle.
The miniscript code is smaller than the equivalent javascript and as fast as it.

Install:
```shell
$ npm install miniscript -g
```
Example:
```
fib = (num) {
    if num is 0 || num is 1
        return num
    else
        return fib(num-1) + fib(num-2)
    end
}

print fib(5)
```
```js
var fib;
fib = function(num) {
    if (num == 0 || num == 1) {
        return num;
    } else {
        return fib(num - 1) + fib(num - 2);
    }
};
console.log(fib(5));
```

##Under development until v.1.0.0

### v0.4.0 (17/12/2014)
1. More functionality
2. New syntax (will never change from now on)
3. 

### v0.3.0 (2/9/2014)
1. Miniscript web compiler
2. No dependencies

### v0.2.0 (3/7/2014)
1. Grammar redesign
2. Faster flex parsing
3. Faster compiler
4. Changes in language (syntax may change until v1.0.0)
5. Less dependencies

### v0.1.12 (17/5/2014)

*set get* on private members
