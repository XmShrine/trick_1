var a = {
    b: 1,
    c:function() { // This is the ES6 method shorthand
        this.b += 1;
    }
};

// This also works as expected
a.c();

// The value of a.b is now 2
console.log(a.b); // 2