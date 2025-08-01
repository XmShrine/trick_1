class Monomial {
    constructor(coeff, variable) {
        this.coeff = coeff;
        this.variable = [];
        for (var i=0; i<variable.length; i++) {
            this.variable.push(variable[i]);
        }
        this.update()
    }
    update() {
        var len = this.variable.length;
        for (var i=0; i<len; i++) {
            if (this.variable[i]<0) {
                this.variable[i] = 0;
            }
        }
        for (var i=0; i<len; i++) {
            if (this.variable[len-i-1] != 0) {
                break;
            } else {
                this.variable.pop();
            }
        }
        return this;
    }
    toString() {
        this.update()
        return `[${this.coeff}][${this.variable}]`
    }
    swap(i, j) {
        var temp = [];
        var len = this.variable.length;
        if (len-1<i) {
            len = i+1;
        }
        if (len-1<j) {
            len = j+1;
        }
        for (var k=0; k<len; k++) {
            if (k!=i && k!=j && k<this.variable.length) {
                temp.push(this.variable[k]);
            } else if (k==i && j<this.variable.length) {
                temp.push(this.variable[j]);
            } else if (k==j && i<this.variable.length) {
                temp.push(this.variable[i]);
            } else {
                temp.push(0);
            }
        }
        return new Monomial(this.coeff, temp);
    }
    static compare(mon1, mon2) {
        mon1.update();
        mon2.update();
        var tmp1 = mon1.variable.length;
        var tmp2 = mon2.variable.length;
        var len = tmp1 > tmp2 ? tmp1 : tmp2;
        for (var i=0; i<len; i++) {
            var temp1 = i < tmp1 ? mon1.variable[i] : 0;
            var temp2 = i < tmp2 ? mon2.variable[i] : 0;
            if (temp1 - temp2 < 0) {
                return -1;
            }
            if (temp1 - temp2 > 0) {
                return 1;
            }
        }
        return 0;
    }
    static add(mon1, mon2) {
        mon1.update();
        mon2.update();
        if (Monomial.compare(mon1, mon2) != 0) {
            return false;
        }
        return new Monomial(mon1.coeff + mon2.coeff, mon1.variable)
    }
    static mult(mon1, mon2) {
        mon1.update();
        mon2.update();
        var temp = [];
        var len1 = mon1.variable.length;
        var len2 = mon2.variable.length;
        var len = len1 > len2 ? len1 : len2;
        for (var i=0; i<len; i++) {
            var tp1 = i<len1?mon1.variable[i]:0;
            var tp2 = i<len2?mon2.variable[i]:0;
            temp.push(tp1 + tp2);
        }
        return new Monomial(mon1.coeff*mon2.coeff, temp);
    }
}

String.prototype.toMonomial = function() {
    this.replace(/\s*/g, "");
    if (/^[\[][^,]*[\]\[][^\[\]]*[\]]$/.test(this) == false) {
        return false;
    }
    var sign = [];
    for (var i=0; i<this.length; i++) {
        if (/[\[\]\,]/.test(this[i])) {
            sign.push(i);
        }
    }
    var coeff = Number(this.slice(sign[0]+1, sign[1]));
    var variable = [];
    for (var i=0; i<sign.length-3; i++) {
        variable.push(Number(this.slice(sign[2+i]+1, sign[3+i])));
    }
    return new Monomial(coeff, variable);
}

class Polynomial {
    constructor() {
        this.arr = [];
    }
    push(mon) {
        if (mon instanceof Array) {
            for (var i=0; i<mon.length; i++) {
                var temp = new Monomial(mon[i].coeff, mon[i].variable);
                this.arr.push(temp);
            }
        } else {
            this.push([mon])
        }
        return this;
    }
    update() {
        for (var i=0; i<this.arr.length; i++) {
            for (var j=i+1; j<this.arr.length; j++) {
                if (Monomial.compare(this.arr[i], this.arr[j]) == 0) {
                    var temp = Monomial.add(this.arr[i], this.arr[j]);
                    this.arr.splice(j, 1);
                    this.arr[i] = temp;
                    j = i;
                }
            }
        }
        for (var i=0; i<this.arr.length; i++) {
            this.arr[i].update();
            if (this.arr[i].coeff == 0) {
                this.arr.splice(i, 1);
                i -= 1;
            }
        }
        for (var i=0; i<this.arr.length; i++) {
            for (var j=i+1; j<this.arr.length; j++) {
                if (Monomial.compare(this.arr[i], this.arr[j]) < 0) {
                    temp = this.arr[i];
                    this.arr[i] = this.arr[j];
                    this.arr[j] = temp;
                }
            }
        }
        return this;
    }
    toString() {
        this.update();
        var str = "";
        for (var i=0; i<this.arr.length; i++) {
            str = str.concat(this.arr[i].toString());
            if (i != this.arr.length-1) {
                str = str.concat(" + ");
            }
        }
        return str;
    }
    maxVar() {
        this.update();
        var max = 0;
        for (var i=0; i<this.arr.length; i++) {
            this.arr[i].update();
            if (max < this.arr[i].variable.length) {
                max = this.arr[i].variable.length;
            }
        }
        return max;
    }
    swap(i, j) {
        this.update();
        var pol = new Polynomial();
        for (var k=0; k<this.arr.length; k++) {
            var temp = this.arr[k].swap(i, j);
            pol.push(temp);
        }
        pol.update();
        return pol;
    }
    static compare(pol1, pol2) {
        pol1.update();
        pol2.update();
        if (pol1.arr.length != pol2.arr.length) {
            return false;
        }
        for (var i=0; i<pol1.arr.length; i++) {
            if (!(Monomial.compare(pol1.arr[i], pol2.arr[i]) == 0 && pol1.arr[i].coeff == pol2.arr[i].coeff)) {
                return false;
            }
        }
        return true;
    }
    static add(pol1, pol2) {
        var pol = new Polynomial();
        pol.arr = pol1.arr.concat(pol2.arr);
        pol.update();
        return pol;
    }
    static mult(pol1, pol2) {
        pol1.update();
        pol2.update();
        var pol = new Polynomial();
        for (var i=0; i<pol1.arr.length; i++) {
            for (var j=0; j<pol2.arr.length; j++) {
                pol.push(Monomial.mult(pol1.arr[i], pol2.arr[j]))
            }
        }
        pol.update();
        return pol;
    }
    static number(n) {
        var pol = new Polynomial();
        pol.push(new Monomial(n, []));
        return pol;
    }
    static power(pol, n) {
        if (n <= 0) {
            return Polynomial.number(1);
        }
        var res = Polynomial.number(1);
        for (var i=0; i<n; i++) {
            res = Polynomial.mult(res, pol);
        }
        return res;
    }
}

class BaSym {
    constructor(n) {
        this.n = n;
        this.arr = [];
        for (var i=1; i<n+1; i++) {
            this.arr.push(this.generate(i));
        }
    }
    get(k) {
        return this.arr[k];
    }
    generate(k) {
        var pol = new Polynomial();
        var count = [];
        for (var i=0; i<k; i++) {
            count[i] = i;
        }
        while (true) {
            var temp = [];
            for (var i=0; i<this.n; i++) {
                temp.push(0);
            }
            for (var i=0; i<k; i++) {
                temp[count[i]] = 1;
            }
            pol.push(new Monomial(1, temp));
            for (var i=0; i<k; i++) {
                if (count[k-i-1]<this.n-i-1) {
                    count[k-i-1] += 1; 
                    break;
                } else {
                    if (i == k-1) {
                        return pol;
                    } else if (count[k-i-2]+1 < count[k-i-1]) {
                        count[k-i-2] += 1;
                        count[k-i-1] = count[k-i-2] + 1;
                        break;
                    }
                }
            }
        }
    }
}

String.prototype.toPolynomial = function() {
    this.replace(/\s*/g, "");
    var pol = new Polynomial();
    var sign = [];
    for (var i=0; i<this.length; i++) {
        if (/[\[\]]/.test(this[i])==true) {
            sign.push(i);
        }
    }
    for (var j=0; j<sign.length/4; j++) {
        pol.push(this.slice(sign[4*j], sign[4*j+3]+1).toMonomial());
    }
    return pol;
}

function ifSym(pol) {
    for (var i=0; i<pol.maxVar(); i++) {
        for (var j=i+1; j<pol.maxVar(); j++) {
            var temp = pol.swap(i, j);
            if (Polynomial.compare(temp, pol) == false) {
                return false;
            }
        }
    }
    return true;
}

function SPFHelper(pol, helper) {
    pol.update();
    var mon = pol.arr[0].variable;
    var temp = Polynomial.number(1);
    var res = [];
    var len = helper.arr.length;
    for (var i=0; i<helper.arr.length; i++) {
        res.push(0);
        if (i>=mon.length) {
            mon.push(0);
        }
    }
    for (var i=0; i<len; i++) {
        res[i] = (i!=len-1)?mon[i]-mon[i+1]:mon[i];
        tmp = Polynomial.power(helper.get(i), res[i]);
        temp = Polynomial.mult(temp, tmp);
    }
    temp = Polynomial.mult(Polynomial.number(-pol.arr[0].coeff), temp);
    return [Polynomial.add(pol, temp), (new Polynomial()).push(new Monomial(pol.arr[0].coeff, res))]
}

function SPF(pol) {
    if (ifSym(pol) == false) {
        return false;
    }
    pol.update();
    var helper = new BaSym(pol.maxVar());
    var res = new Polynomial();
    var nsnss = 0;
    while (Polynomial.compare(pol, Polynomial.number(0)) == false) {
        var tmp = SPFHelper(pol, helper);
        pol = null;
        pol = tmp[0];
        res = Polynomial.add(res, tmp[1]);
        nsnss += 1;
        if (nsnss >20) {
            break;
        }
    }
    return res;
}


function SPFApply(str) {
    return SPF(str.toPolynomial()).toString();
}
