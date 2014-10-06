var parser = require('./parser.js'),
	path = require('path'),
    fs = require('fs'),
	utils = require('./utils.js'),
    spaces = '    ',
    lib = {};

function compile(text) {
    var tree = parser.parse(text);

    if (tree === true) return '';

    var env = { "prev": undefined };

    var body = list_eval(tree.value, env, '\n', '');
    
    return make_utils() + make_env(env, []) + body;
}

var classes = {};

function evaluate(token, env, indent) {
    if(!token) return '';
    indent = indent || '';

    switch (token.type) {
        case 'body':
            var result = '', i = -1, l = token.value.length;
            while (++i < l) {
                result += evaluate(token.value[i], env, indent + spaces) + '\n';
                if (token.value[i].type === 'return') break;
            }
            return result;

        case 'function':
            var body, head, var_str;
            env = { prev: env };
            head = 'function (' + list_eval(token.arguments, env, ', ', indent) + ') ';
            body = body_eval(token.body, env, indent);
            var_str = make_env(env, token.arguments || []);

            return head + (var_str ? '{\n' + var_str + body.slice(1) : body);

        case 'assign':
            var semicolon = ';';
        case 'assign_expr':
            var left = evaluate(token.variable, env, indent);

            var_lookup(left, env);

            var right = evaluate(token.value, env, indent);

            return right === 'undefined' ? '' : indent + left + ' ' + token.operator + ' ' + right + (semicolon || '');

        case 'assign-mult':
            var vars = token.variables;

            for (var i = -1, l = vars.length; ++i < l;) {
				vars[i] = evaluate(vars[i], env, indent);
                var_lookup(vars[i], env);
            }

            var value = evaluate(token.value, env, indent),
			    result = '', collection = '';

            if (/^[a-z_$][$_a-zA-Z0-9]*$/.test(value)) {
                collection = value;
            } else {
                result += '_c = ' + value + ', ';
                collection = '_c';
            }

            result += vars[0] + ' = ' + collection + '[' + 0 + ']';

            for (var i = 0, l = vars.length; ++i < l;) {
                result += ', ' + vars[i] + ' = ' + collection + '[' + i + ']';
            }

            return indent + result + ';';

        case 'condition':
            return evaluate(token.condition, env, indent) + ' ? ' + evaluate(token.left, env, indent) + ' : ' + evaluate(token.right, env, indent);

        case 'increase':
            var left = evaluate(token.variable, env, indent);

            var_lookup(left, env);

            return indent + left + token.operator + ';';

        case 'list':
            return '[' + list_eval(token.value, env, ', ', indent) + ']';

        case 'object':
            var i = 0, l = token.value.length, result = '';

            if (token.value.length === 0) return '{}';

            result = evaluate(token.value[0].left, env, indent) + ': ' + evaluate(token.value[0].right, env, indent) + result;

            while (++i < l) {
                result += ', ' + evaluate(token.value[i].left, env, indent) + ': ' + evaluate(token.value[i].right, env, indent);
            }

            return '{' + result + '}';

        case 'if':
            var If = 'if (' + evaluate(token.condition, env, indent) + ') ' + body_eval(token.body, env, indent), Else = token.else ? indent + ' else ' + body_eval(token.else.body, env, indent) : '', Elif = '';

            if (token.elif) {
                for (var i = -1, l = token.elif.length; ++i < l;) {
                    Elif += indent + ' else if (' + evaluate(token.elif[i].condition, env, indent) + ') ' + body_eval(token.elif[i].body, env, indent);
                }
            }

            return indent + If + Elif + Else;

        case 'switch':
            var Cases = '', i = -1, l = token.cases.length, j, ll, body, Switch = 'switch (' + evaluate(token.value, env, indent) + ') {\n', Default = token.default ? indent + '  default:\n' + evaluate(token.default, env, indent) : '';

            while (++i < l) {
                var case_condition = token.cases[i].condition;
                if (ll = case_condition.length) {
                    for (var j = -1; ++j < ll;) {
                        Cases += indent + '  case ' + evaluate(case_condition[j]) + ':\n';
                    }
                    Cases += evaluate(token.cases[i].body, env, indent)
                }
                if (token.cases[i].body.value[token.cases[i].body.value.length - 1].type !== 'return') Cases += indent + spaces + 'break;\n';
            }

            return indent + Switch + Cases + Default + indent + '}';

        case 'while':
            return indent + 'while (' + evaluate(token.condition, env, indent) + ') ' + body_eval(token.body, env, indent);

        case 'do':
            return indent + 'do ' + body_eval(token.body, env, indent) + ' while (' + evaluate(token.condition, env, indent) + ');';

        case 'for':
            var assign_str = '', coll, str = '', func, found, from, to, iter = token.iterators[0];

            if ((coll = token.collection) && coll.type == 'range') {
                if (token.iterators.length > 1) {
                    throw new Error('Use only one iterator for a range loop, e.g only ' + token.iterators[0]);
                }

                if (+coll.left.value && +coll.right.value) {
                    from = +coll.left.value;
                    to = +coll.right.value;
                    var_lookup(iter, env);
                    if (from < to)
                        return 'for (' + iter + ' = ' + (from - 1) + '; ++' + iter + ' <= ' + to + ';)' + body_eval(token.body, env);
                    else if (from > to)
                        return 'for (' + iter + ' = ' + (from + 1) + '; --' + iter + ' >= ' + to + ';)' + body_eval(token.body, env);
                    else {
                        return iter + ' = ' + from + ';' + evaluate(token.body.value, env, indent).join();
                    }
                }
                func = 'function (' + token.iterators[0] + ') ' + body_eval(token.body, env, indent).replace(/this/g, function () { found = true; return '_this' });
                load_util('loop');
                return (found && !env._this ? (env._this = true) && indent + '_this = this;\n' : '') + '_utils.loop(' + evaluate(coll.left, env, indent) + ', ' + evaluate(coll.right, env, indent) + ', ' + func + ');\n';
            }

            coll = evaluate(token.collection);
            if (!/^[a-z_$][$_a-zA-Z0-9]*$/.test(coll)) {
                var_lookup('_c', env, indent);
                str = indent + '_c = ' + coll + ';\n';
                coll = '_c';
            }

            if (token.operator == 'in' && token.iterators.length == 1) {
                var_lookup(token.iterators[0], env);

                return str + indent + 'for (' + token.iterators[0] + ' in ' + coll + ') ' + body_eval(token.body, env, indent);
            }
            else {
                if (token.iterators.length == 1) {
                    var_lookup(token.iterators[0], env);
                    assign_str = indent + spaces + token.iterators[0] + ' = ' + coll + '[_i];\n';
                } else {
                    if (token.operator == 'of') {
                        for (var i = -1, l = token.iterators.length; ++i < l;) {
                            var_lookup(token.iterators[i], env);
                            assign_str += indent + spaces + token.iterators[i] + ' = ' + coll + '[_i][' + i + '];\n';
                        };
                    } else {
                        for (var i = -1, l = token.iterators.length; ++i < l;) {
                            var_lookup(token.iterators[i], env);
                            assign_str += indent + spaces + token.iterators[i] + ' = ' + coll + '[_i].' + token.iterators[i] + ';\n';
                        };
                    }
                }
                var_lookup('_i', env);
                var_lookup('_l', env);
                token.body.value.unshift(assign_str);

                return str + indent + 'for (_i = -1, _l = ' + coll + '.length; ++_i < _l;) ' + body_eval(token.body, env, indent);
            }

        case 'print':
            return indent + 'console.log(' + list_eval(token.value, env, ', ', indent) + ');';

        case 'throw':
            return indent + 'throw ' + evaluate(token.value, env, indent) + ';';

        case 'return':
            return indent + 'return ' + evaluate(token.value, env, indent) + ';';

        case 'try':
            return indent + 'try ' + body_eval(token.body, env, indent) +
			(token.catch ? indent + ' catch(' + token.catch.error + ') ' + body_eval(token.catch.body, env, indent) : '') +
			(token.finally ? indent + ' finally ' + body_eval(token.finally, env, indent) : '');

        case 'import':
            var sector = '';
            for (var i = -1, l = token.sector.length; ++i < l;) {
                sector += access_eval(token.sector[i], env);
            }
            
            if(token.module[0] != '"' && token.module[0] != "'") {
                token.module = "'" + token.module + "'";
            }

            if (!token.alias) {
                token.alias = (token.module + sector).match(/[$_a-zA-Z0-9]+((?=[[(])|$)|[$_a-zA-Z0-9]+(?:\.[$_a-zA-Z0-9]+)*(?=['"])/g).pop().replace(/\.[$_a-zA-Z0-9]+$/g, '');
            }

            if(/\.mini/.test(token.module)) {
                load_util('require');

                return indent + 'var ' + token.alias + ' = _utils.require(module, ' + token.module + ')' + sector + ';';
            } else {
                return indent + 'var ' + token.alias + ' = require(' + token.module + ')' + sector + ';';
            }
            

        case 'execute':
            return indent + evaluate(token.value, env, indent) + ';';

        case 'range':
            var start = evaluate(token.left, env, indent),
                stop = evaluate(token.right, env, indent),
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
                return '_utils.range(' + start + ', ' + stop + ')';
            }

        case 'word':
            switch (token.operator) {
                case 'and':
                    token.operator = ' && '; break;
                case 'or':
                    token.operator = ' || '; break;
                case 'is':
                    token.operator = ' === '; break;
                case 'is not':
                    token.operator = ' !== '; break;
                case 'instanceof':
                    token.operator = ' instanceof '; break;
            }
        case 'binary':
            return evaluate(token.left, env, indent) + ' ' + token.operator + ' ' + evaluate(token.right, env, indent);

        case 'unary':
            return token.operator + evaluate(token.value, env, indent);

        case 'postfix':
            return evaluate(token.value, env, indent) + token.operator;

        case 'access':
            var left, right = '';
            for (var i = -1, l = token.access.length; ++i < l;) {
                right += access_eval(token.access[i], env);
            }

            if(token.value.type == 'function' || token.value.type == 'number') {
                left = '(' + evaluate(token.value, env, indent) + ')';
            } else {
                left = evaluate(token.value, env, indent);
            }

            return left + right;

        case 'string':
            var stype = token.value[0] == '"' ? '"' : "'",
                repl1 = function (_, m1) { return stype + " + (" + evaluate(parser.parse("`" + m1), env, indent) + ") + " + stype },
                repl2 = function (_, m1) { return stype + " + " + evaluate(parser.parse("`" + m1), env, indent) + " + " + stype };
            token.value = token.value.replace(/%((?:[_$A-Za-z]+(?:[\.\(\):]|\[[^]]*])*)+)/g, repl2)
                             .replace(/%{([^}]+)}/g, repl1)
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "\\s*\\+\\s*"), ' + ')
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "$"), '');
        case 'number':
            return token.value;

        case 'new':
            return 'new ' + token.name;

        case 'setget':
            var_lookup(token.name, env);
            
            final_str = token.init ? token.name + ' = ' + evaluate(token.init, env, indent) + ';' : '';

            if (token.set !== undefined) {
                final_str += 'this.__defineSetter__("' + token.name + '", function(value){' + (token.set ? evaluate(token.set, env, indent) : token.name + '= value') + '});';
            }

            if (token.get !== undefined) {
                final_str += 'this.__defineGetter__("' + token.name + '", function(){' + (token.get ? evaluate(token.get, env, indent) : 'return ' + token.name) + '});';
            }

            return final_str;

        case 'class':
            env = { prev: env };

            if(token.name in classes) throw new Error("Can't define a class twice (" + token.name + ")");
            if(!token.parent && token.body.value[0].type == 'super') throw new Error("Super called on class with no parent (" + token.name + ")");

            if(token.parent && token.body.value[0].type != 'super') {
                token.arguments = token.arguments && classes[token.parent].args.concat(token.arguments);
            }

            classes[token.name] = {
                args: token.arguments && token.arguments.map(function(v) {return v && v.t || v})
            }

            var body, final_str = indent + 'function ' + token.name + '(';

            if (token.arguments) {
                final_str += (token.arguments[0].t || token.arguments[0]);
                for (var i = 0, l = token.arguments.length; ++i < l;) {
                    final_str += ', ' + (token.arguments[i].t || token.arguments[i]);
                }
            }

            final_str += ') {\n';

            if (token.parent) {
                if (token.body.value[0].type == 'super') {
                    token.body.value[0].name = token.parent;
                } else {
                    var tmp_str1 = indent + spaces + token.parent + '.call(this, ' + classes[token.parent].args.join(', ') + ');',
                        tmp_str2 = indent + spaces + token.parent + '.apply(this, [].slice.call(arguments, 0, ' + classes[token.parent].args.length + '));';
                    
                    final_str += (tmp_str1.length < tmp_str2.length ? tmp_str1 : tmp_str2) + '\n';
                }
            }

            body = evaluate(token.body, env, indent);
            final_str += (env_str = make_env(env, token.arguments ? token.arguments.map(function(v){ return v.t || v}) : [])) ? indent + spaces + env_str : '';

            if (token.arguments) {
                for (var i = (token.parent ? classes[token.parent].args.length : 0) - 1, l = token.arguments.length; ++i < l;) {
                    final_str += indent + spaces + (token.arguments[i].t ? ('this.' + token.arguments[i].t + ' = ' + token.arguments[i].t + ';\n') : '');
                }
            }

            final_str += body;

            final_str += indent + '}\n';

            if (token.parent) {
                load_util('extend');
                final_str += indent + '_utils.extend(' + token.name + ', ' + token.parent + ');\n';
            }

            return final_str;

        case 'type':
            if(token.name in classes) throw new Error("Can't define a class twice (" + token.name + ")");

            if(token.parent) {
                if(token.arguments)
                    token.arguments = classes[token.parent].args.concat(token.arguments);
                else
                    token.arguments = classes[token.parent].args;
            }

            classes[token.name] = {
                args: token.arguments
            }

            var body, final_str = indent + 'function ' + token.name + '(' + token.arguments[0];

            for (var i = 0, l = token.arguments.length; ++i < l;) {
                final_str += ', ' + token.arguments[i];
            }

            final_str += ') {\n';

            if (token.parent) {
                var tmp_str1 = indent + spaces + token.parent + '.call(this, ' + classes[token.parent].args + ');\n',
                    tmp_str2 = indent + spaces + token.parent + '.apply(this, [].slice.call(arguments, 0, ' + classes[token.parent].args.length + '));\n';
                    
                final_str += tmp_str1.length < tmp_str2.length ? tmp_str1 : tmp_str2;
                for (var i = classes[token.parent].args.length - 1, l = token.arguments.length; ++i < l;) {
                    final_str += indent + spaces + 'this.' + token.arguments[i] + ' = ' + token.arguments[i] + ';\n';
                }
            } else {
                for (var i = -1, l = token.arguments.length; ++i < l;) {
                    final_str += indent + spaces + 'this.' + token.arguments[i] + ' = ' + token.arguments[i] + ';\n';
                }
            }


            final_str += indent + '}\n';

            if (token.parent) {
                load_util('extend');
                final_str += indent + '_utils.extend(' + token.name + ', ' + token.parent + ');\n';
            }

            return final_str;

        case 'super':
            if(classes[token.name].args.length != token.arguments.length) {
                console.log("Warning: Trying to call superclass constructor with different number of parameters");
            }
            return indent + token.name + '.call(this, ' + list_eval(token.arguments, env, ', ', indent) + ');';

        case 'paren':
            return '(' + evaluate(token.value, env, indent) + ')';

        default:
            return token.value || token;
    }
}

function body_eval(token, env, indent) {
    return '{\n' + evaluate(token, env, indent) + indent + '}';
}

function access_eval(token, env, indent) {
    switch (token.type) {
        case 'dot':
            return '.' + token.value; break;
        case 'proto':
            return '.prototype.' + token.value; break;
        case 'array':
            return '[' + list_eval(token.value, env, '][', indent) + ']'; break;
        case 'call':
            return '(' + list_eval(token.value, env, ', ', indent) + ')'; break;
        default:
            throw new Error('Uknown type: ' + t + ', for accessing a variable');
    }
}

function list_eval(token, env, str, indent) {
    if(!token || token.constructor != Array)
        return evaluate(token, env, indent);

    var result = evaluate(token[0], env, indent);

    for (var i = 0, l = token.length; ++i < l;) {
        result += str + evaluate(token[i], env, indent);
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

    if (vars.length) return 'var ' + vars.join(', ') + ';\n';

    return '';
}

function load_util(func) {
    if(!lib[func]) lib[func] = utils[func];
}

function make_utils() {
    if(Object.keys(lib).length == 0) return '';

    var result = 'var _utils = {\n';

    for (var func in lib) {
        result += spaces + func + ': ' + lib[func] + '\n';
    }

    result += '};\n\n';

    return result;
}

module.exports = {
    compile: compile,
    parser: parser
}