var g;
g = {
    x: 5,
    y: 6
};
console.log(g && (function() {
    console.log(g.x + g.y);
})());