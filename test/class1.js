var _utils = {
    extend: function(child, parent) {
        child.prototype = parent.prototype;
        child.prototype.constructor = child;
    }
};
var my_dog;

function Animal(group, colors, legs) {
    this.group = group;
    this.colors = colors;
    this.legs = legs;
}

function Dog(name, colors, breed) {
    Animal.call(this, 'mammal', colors, 4);
}
_utils.extend(Dog, Animal);
Dog.prototype.pet = function() {
    console.log('wuf wuf!');
};
my_dog = new Dog('frisky', ['brown', 'white'], 'corgi');
my_dog.pet();