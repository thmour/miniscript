var parser = require('./parser.js'),
	path = require('path'),
    fs = require('fs'),
	lib = path.join(path.dirname(fs.realpathSync(__filename)), './utils.js').replace(/\\/g, '/'),
	utils = require('./utils.js'),
    lib = {};

function compile(text) {
    var tree = parser.parse(text);

    if (tree === true) return '';

    var env = { prev: undefined };

    var body = list_eval(tree.value, env, '');

    return make_utils() + make_env(env, []) + body;
}

var classes = {};

function evaluate(t, env) {
    if(!t) return '';

    switch (t.type) {
        case 'body':
            var result = '', i = -1, l = t.value.length;
            while (++i < l) {
                result += evaluate(t.value[i], env);
                if (t.value[i].type === 'return') break;
            }
            t.value.splice(i + 1);
            return result;

        case 'function':
            var body, head, var_str;
            env = { prev: env };
            head = 'function(' + list_eval(t.arguments, env, ',') + ')';
            body = body_eval(t.body, env);
            var_str = make_env(env, t.arguments || []);

            return head + (var_str ? '{' + var_str + body.slice(1) : body);

        case 'assign':
            var semicolon = ';';
        case 'assign_expr':
            var left = evaluate(t.variable, env);

            var_lookup(left, env);

            var right = evaluate(t.value, env);

            return right === 'undefined' ? '' : left + t.operator + right + (semicolon || '');

        case 'assign-mult':
            var vars = evaluate(t.variables, env);

            for (var i = -1, l = vars.length; ++i < l;) {
                var_lookup(vars[i], env);
            }

            var value = evaluate(t.value, env),
			    result = '', collection = '';

            if (/^[a-z_$][$_a-zA-Z0-9]*$/.test(value)) {
                collection = value;
            } else {
                result += '_c = ' + value + ';';
                collection = '_c';
            }

            for (var i = -1, l = vars.length; ++i < l;) {
                result += vars[i] + '=' + collection + '[' + i + '];';
            }

            return result;

        case 'increase':
            var left = evaluate(t.variable, env);

            var_lookup(left, env);

            return left + t.operator + ';';

        case 'list':
            return '[' + list_eval(t.value, env, ',') + ']';

        case 'object':
            var i = t.value.length, result = '';

            if (i === 0) return '{}';

            while (--i) {
                result = ',' + t.value[i].left + ':' + evaluate(t.value[i].right, env) + result;
            }

            result = t.value[0].left + ':' + evaluate(t.value[0].right, env) + result;

            return '{' + result + '}';

        case 'if':
            var If = 'if(' + evaluate(t.condition, env) + ')' + body_eval(t.body, env), Else = t.else ? 'else' + body_eval(t.else.body, env) : '', Elif = '', i = t.elif && t.elif.length;

            while (i--) {
                Elif = 'else if(' + evaluate(t.elif[i].condition, env) + ')' + body_eval(t.elif[i].body, env) + Elif;
            }

            return If + Elif + Else;

        case 'switch':
            var Cases = '', i = -1, l = t.cases.length, j, ll, body, Switch = 'switch(' + evaluate(t.value, env) + '){', Default = t.default ? 'default:' + evaluate(t.default, env) : '';

            while (++i < l) {
                j = -1, ll = t.cases[i].cond.length;
                while (++j < ll) {
                    Cases += 'case ' + t.cases[i].cond[j] + ':';
                }
                Cases += evaluate(t.cases[i].body, env);
                if (t.cases[i].body.value[t.cases[i].body.value.length - 1].type !== 'return') Cases += 'break;';
            }

            return Switch + Cases + Default + '}';

        case 'while':
            return 'while(' + evaluate(t.condition, env) + ')' + body_eval(t.body, env);

        case 'do':
            return 'do' + body_eval(t.body, env) + 'while(' + evaluate(t.condition, env) + ');';

        case 'for':
            var assign_str = '', coll, str = '', func, found, from, to, iter = t.iterators[0];

            if ((coll = t.collection) && coll.type == 'range') {
                if (t.iterators.length > 1) {
                    throw new Error('Use only one iterator for a range loop, e.g only ' + t.iterators[0]);
                }

                if (+coll.left.value && +coll.right.value) {
                    from = +coll.left.value;
                    to = +coll.right.value;
                    var_lookup(iter, env);
                    if (from < to)
                        return 'for (' + iter + ' = ' + (from - 1) + '; ++' + iter + ' <= ' + to + ';)' + body_eval(t.body, env);
                    else if (from > to)
                        return 'for (' + iter + ' = ' + (from + 1) + '; --' + iter + ' >= ' + to + ';)' + body_eval(t.body, env);
                    else {
                        return iter + ' = ' + from + ';' + evaluate(t.body.value, env).join();
                    }
                }
                func = 'function(' + t.iterators[0] + ')' + body_eval(t.body, env).replace(/this/g, function () { found = true; return '_this' });
                load_util('loop');
                return (found && !env._this ? (env._this = true) && 'var _this = this;' : '') + '_utils.loop(' + evaluate(coll.left, env) + ',' + evaluate(coll.right, env) + ',' + func + ');';
            }

            coll = evaluate(t.collection);
            if (!/^[a-z_$][$_a-zA-Z0-9]*$/.test(coll)) {
                var_lookup('_c', env);
                str = '_c = ' + coll + ';';
                coll = '_c';
            }

            if (t.operator == 'in' && t.iterators.length == 1) {
                var_lookup(t.iterators[0], env);

                return str + 'for(' + t.iterators[0] + ' in ' + coll + ')' + body_eval(t.body, env);
            }
            else {
                if (t.iterators.length == 1) {
                    var_lookup(t.iterators[0], env);
                    assign_str = t.iterators[0] + '=' + coll + '[_i];';
                } else {
                    if (t.operator == 'of') {
                        for (var i = -1, l = t.iterators.length; ++i < l;) {
                            var_lookup(t.iterators[i], env);
                            assign_str += t.iterators[i] + '= ' + coll + '[_i][' + i + '];';
                        };
                    } else {
                        for (var i = -1, l = t.iterators.length; ++i < l;) {
                            var_lookup(t.iterators[i], env);
                            assign_str += t.iterators[i] + '= ' + coll + '[_i]' + t.iterators[i] + ';';
                        };
                    }
                }
                var_lookup('_i', env);
                var_lookup('_l', env);
                t.body.value.unshift(assign_str);

                return str + 'for(_i = -1, _l = ' + coll + '.length; ++_i < _l;)' + body_eval(t.body, env);
            }

        case 'print':
            return 'console.log(' + list_eval(t.value, env, ',') + ');';

        case 'throw':
            return 'throw ' + evaluate(t.value, env) + ';';

        case 'return':
            return 'return ' + evaluate(t.value, env) + ';';

        case 'try':
            return 'try' + body_eval(t.body, env) +
			(t.catch ? 'catch(' + t.catch.error + ')' + body_eval(t.catch.body, env) : '') +
			(t.finally ? 'finally' + body_eval(t.finally, env) : '');

        case 'import':
            var sector = '';
            for (var i = -1, l = t.sector.length; ++i < l;) {
                sector += access_eval(t.sector[i], env);
            }
            
            if(/\.mini/.test(t.module)) {
                load_util('require');
            }

            if (!t.alias) {
                t.alias = (t.module + sector).match(/[$_a-zA-Z0-9]+((?=[[(])|$)|[$_a-zA-Z0-9]+(?:\.[$_a-zA-Z0-9]+)*(?=['"])/g).pop().replace(/\.[$_a-zA-Z0-9]+$/g, '');
            }
            
            return 'var ' + t.alias + ' = _utils.require(module, ' + t.module + ')' + sector + ';';

        case 'execute':
            return evaluate(t.value, env) + ';';

        case 'range':
            var start = evaluate(t.left, env),
                stop = evaluate(t.right, env),
                from = +start,
                to = +stop,
                step = to > from ? 1 : -1,
                res = '';
            if (Math.abs(from - to) <= 32) {
                res += from;
                for (var i = from + step; Math.abs(i - to - step) > 0; i += step) {
                    res += ',' + i;
                }
                return '[' + res + ']';
            } else {
                load_util('loop');
                return '_utils.range(' + start + ',' + stop + ')';
            }

        case 'word':
            switch (t.operator) {
                case 'and':
                    t.operator = '&&'; break;
                case 'or':
                    t.operator = '||'; break;
                case 'is':
                    t.operator = '==='; break;
                case 'is not':
                    t.operator = '!=='; break;
                case 'instanceof':
                    t.operator = ' instanceof '; break;
            }
        case 'binary':
            return evaluate(t.left, env) + t.operator + evaluate(t.right, env);

        case 'unary':
            return t.operator + evaluate(t.value, env);

        case 'postfix':
            return evaluate(t.value, env) + t.operator;

        case 'access':
            var left, right = '';
            for (var i = -1, l = t.access.length; ++i < l;) {
                right += access_eval(t.access[i], env);
            }

            if(t.value.type == 'function' || t.value.type == 'number') {
                left = '(' + evaluate(t.value, env) + ')';
            } else {
                left = evaluate(t.value, env);
            }

            return left + right;

        case 'string':
            var stype = t.value[0] == '"' ? '"' : "'",
                repl1 = function (_, m1) { return stype + "+(" + evaluate(parser.parse("`" + m1), env) + ")+" + stype },
                repl2 = function (_, m1) { return stype + "+" + evaluate(parser.parse("`" + m1), env) + "+" + stype };
            t.value = t.value.replace(/%((?:[_$A-Za-z]+(?:[\.\(\):]|\[[^]]*])*)+)/g, repl2)
                             .replace(/%{([^}]+)}/g, repl1)
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "\\s*\\+\\s*"), ' + ')
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "$"), '');
        case 'number':
            return t.value;

        case 'new':
            return 'new ' + t.name;

        case 'setget':
            var_lookup(t.name, env);
            
            final_str = t.init ? t.name + ' = ' + evaluate(t.init, env) + ';' : '';

            if (t.set !== undefined) {
                final_str += 'this.__defineSetter__("' + t.name + '", function(value){' + (t.set ? evaluate(t.set, env) : t.name + '= value') + '});';
            }

            if (t.get !== undefined) {
                final_str += 'this.__defineGetter__("' + t.name + '", function(){' + (t.get ? evaluate(t.get, env) : 'return ' + t.name) + '});';
            }

            return final_str;

        case 'class':
            env = { prev: env };

            if(t.name in classes) throw new Error("Can't define a class twice (" + t.name + ")");

            if(t.parent && t.body.value[0].type != 'super') {
                t.arguments = classes[t.parent].args.concat(t.arguments);
            }

            classes[t.name] = {
                args: t.arguments
            }

            var body, final_str = 'function ' + t.name + '(' + (t.arguments && (t.arguments[0].t || t.arguments[0]) || '');

            if (t.arguments) {
                for (var i = 0, l = t.arguments.length; ++i < l;) {
                    final_str += ',' + (t.arguments[i].t || t.arguments[i]);
                }
            }

            final_str += ') {';

            if (t.parent) {
                if (t.body.value[0].type == 'super') {
                    t.body.value[0].name = t.parent;
                } else {
                    var tmp_str1 = t.parent + '.call(this, ' + classes[t.parent].args + ');',
                        tmp_str2 = t.parent + '.apply(this, [].slice.call(arguments, 0, ' + classes[t.parent].args.length + '));';;
                    
                    final_str += tmp_str1.length < tmp_str2.length ? tmp_str1 : tmp_str2;
                }
            }

            body = evaluate(t.body, env);
            final_str += make_env(env, t.arguments ? t.arguments.map(function(v){ return v.t || v}) : []);

            if (t.arguments) {
                for (var i = (t.parent ? classes[t.parent].args.length : 0) - 1, l = t.arguments.length; ++i < l;) {
                    final_str += t.arguments[i].t ? ('this.' + t.arguments[i].t + '=' + t.arguments[i].t + ';') : '';
                }
            }

            final_str += body;

            final_str += '}';

            if (t.parent) {
                load_util('extend');
                final_str += '_utils.extend(' + t.name + ',' + t.parent + ');';
            }

            return final_str;

        case 'type':
            if(t.name in classes) throw new Error("Can't define a class twice (" + t.name + ")");

            if(t.parent) {
                t.arguments = classes[t.parent].args.concat(t.arguments);
            }

            classes[t.name] = {
                args: t.arguments,
                par: t.parent
            }

            var body, final_str = 'function ' + t.name + '(' + t.arguments[0];

            for (var i = 0, l = t.arguments.length; ++i < l;) {
                final_str += ',' + t.arguments[i];
            }

            final_str += ') {';

            if (t.parent) {
                var tmp_str1 = t.parent + '.call(this, ' + classes[t.parent].args + ');',
                    tmp_str2 = t.parent + '.apply(this, [].slice.call(arguments, 0, ' + classes[t.parent].args.length + '));';
                    
                final_str += tmp_str1.length < tmp_str2.length ? tmp_str1 : tmp_str2;
                for (var i = classes[t.parent].args.length - 1, l = t.arguments.length; ++i < l;) {
                    final_str += 'this.' + t.arguments[i] + '=' + t.arguments[i] + ';';
                }
            } else {
                for (var i = -1, l = t.arguments.length; ++i < l;) {
                    final_str += 'this.' + t.arguments[i] + '=' + t.arguments[i] + ';';
                }
            }


            final_str += '}';

            if (t.parent) {
                load_util('extend');
                final_str += '_utils.extend(' + t.name + ',' + t.parent + ');';
            }

            return final_str;

        case 'super':
            return t.name + '.call(this, ' + list_eval(t.arguments, env, ',') + ');';

        case 'paren':
            return '(' + evaluate(t.value, env) + ')';

        default:
            return t;
    }
}

function body_eval(t, env) {
    return '{' + evaluate(t, env) + '}';
}

function access_eval(t, env) {
    switch (t.type) {
        case 'dot':
            return '.' + t.value; break;
        case 'proto':
            return '.prototype.' + t.value; break;
        case 'array':
            return '[' + list_eval(t.value, env, '][') + ']'; break;
        case 'call':
            return '(' + list_eval(t.value, env, ',') + ')'; break;
        default:
            throw new Error('Uknown type: ' + t + ', for accessing a variable');
    }
}

function list_eval(t, env, str) {
    if(!t || t.constructor != Array)
        return evaluate(t, env);

    var result = evaluate(t[0], env);

    for (var i = 0, l = t.length; ++i < l;) {
        result += str + evaluate(t[i], env);
    }

    return result;
}

function search_var(name, env) {
    do {
        if (env.hasOwnProperty(name)) return true;
    } while (env = env.prev);

    return false;
}

function var_lookup(name, env) {
    if (/[.[(]/.test(name))
        return;
    if (name.slice(0, 4) === 'this')
        return;

    if (search_var(name, env) == false) {
        env[name] = true;
    }
}

function make_env(env, func_params) {
    var vars = [];

    for (key in env) {
        if (key !== 'prev' && func_params.indexOf(key) < 0) vars.push(key);
    }

    if (vars.length) return 'var ' + vars.join(', ') + ';';

    return '';
}

function load_util(func) {
    if(!lib[func]) lib[func] = utils[func];
}

function make_utils() {
    if(Object.keys(lib).length == 0) return '';

    var result = 'var _utils = {';

    for (var func in lib) {
        result += func + ':' + lib[func];
    }

    result += '};';

    return result;
}

module.exports = {
    compile: compile,
    parser: parser
}