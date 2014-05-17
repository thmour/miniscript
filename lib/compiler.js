var _ = require('lodash'),
	parser = require('./parser.js'),
	path = require('path'),
    fs = require('fs'),
	lib = path.join(path.dirname(fs.realpathSync(__filename)), './utils.js'),
	require_utils = false;

function compile(text) {
    var tree = parser.parse(text);

    if (tree === true) return '';

    var env = { prev: null };
    var body = evaluate(tree, env);

    return (require_utils ? 'var _utils = require("' + lib.replace(/\\/g, '/') + '");' : '') + make_env(env) + body;
}

function evaluate(t, env) {
    if (!t)
        return [''];

    if (_.isArray(t))
        return _.map(t, function (value) { return evaluate(value, env) });

    if (!_.isObject(t))
        return t;

    switch (t.token) {
        case 'access':
            return evaluate(t.left, env) + acc_right(t.right, env);
        case 'array':
            return '[' + evaluate(t.value_list, env) + ']';
        case 'assign':
            var name = evaluate(t.variable, env);
            var_lookup(name, env);
            return t.value.token != 'undefined' ? name + '=' + evaluate(t.value, env) : '';
        case 'assign_single':
            var name = evaluate(t.variable, env);
            var_lookup(name, env);
            return t.value.token != 'undefined' ? name + '=' + evaluate(t.value, env) + ';' : '';
        case 'assign_mult':
            var list = evaluate(t.variable_list, env),
                value = evaluate(t.value, env),
			    result = '', collection = '';

            if (t.value.token == 'identifier') {
                collection = value;
            } else {
                result += '_c = ' + value + ';';
                collection = '_c';
            }

            _.each(list, function (v, i) {
                var_lookup(v, env);
                result += v + '=' + collection + '[' + i + '];';
            });

            return result;
        case 'assign_operator':
            var name = evaluate(t.variable, env);
            var_lookup(name, env);

            return name + t.operator + evaluate(value, env);
        case 'body':
            return evaluate(t.value, env).join('');
        case 'bool':
            return evaluate(t.value, env).join(' ');
        case 'call':
            return dot_literal(t.name, env) + '(' + evaluate(t.argument_list, env) + ')';
        case 'class':
            env = { prev: env };
            
            var body, _super, final_str = 'function ' + t.name + '(' +
                (t.constructor ? evaluate(_.map(t.constructor.argument_list, function (v) { return v.t || v })) : '') + ') {';
            if (t.constructor) {
                if (t.constructor.body) {
                    _super = t.constructor.body.value[0];
                    if (_super.token == 'super') {
                        _super.name = t.parent;

                        final_str += evaluate(_super, env);
                        t.constructor.body.value.shift();
                    }
                    
                    _.eachRight(t.constructor.argument_list, function (member) {
                        if (member.t)
                            t.constructor.body.value.unshift('this.' + member.t + ' = ' + member.t + ';');
                    });
                    body = evaluate(t.constructor.body, env);
                    final_str += make_env(env);
                } else {
                    if (t.parent) {
                        if (t.constructor.argument_list) {
                            final_str += t.parent + '.apply(this, [].slice.call(arguments,' + t.constructor.argument_list.length + ');';
                        } else {
                            final_str += t.parent + '.apply(this, [].slice.call(arguments));';
                        }
                    }
                }
            }

            if (t.private_list) {
                var found = false, obj = function (flag, name, arg, value) {
                    return [flag + name[0].toUpperCase() + name.slice(1), {
                        token: 'function',
                        argument_list: arg,
                        body: {
                            token: 'body',
                            value: [
                                flag == 'set' ? {
                                    token: 'assign_single',
                                    variable: name,
                                    value: value
                                } : {
                                    token: 'return',
                                    value: value
                                }
                            ]
                        }
                    }]
                };
                t.public_list = t.public_list || [];
                var str = 'var ' + _.map(t.private_list, function (v) {
                    if (v[2]) {
                        t.public_list.push(obj('set', v[0], v[2] instanceof Array ? [v[2][0]] : '_value', v[2] instanceof Array ? [v[2][1]] : '_value'));
                    }
                    if (v[3]) {
                        t.public_list.push(obj('get', v[0], [], v[3] instanceof Array ? [v[3][0]] : v[0]));
                    }
                    env[v[0]] = true;
                    return v[0] + '=' + evaluate(v[1], env);
                }).join(',').replace(/this/g, function () { found = true; return '_this' }) + ';';

                final_str += (found ? (env._this = true) && 'var _this = this;' : '') + str
            }

            if (t.public_list) {
                _.each(t.public_list, function (assign) {
                    final_str += 'this.' + assign[0] + '=' + evaluate(assign[1], env) + ';';
                });
            }

            if (t.constructor) {
                if (!t.constructor.body) {
                    _.each(t.constructor.argument_list, function (member) {
                        final_str += 'this.' + member + ' = ' + member + ';'
                    });
                }
                else
                    final_str += body;
            }

            final_str += '}';

            if (t.parent) {
                final_str += t.name + '.prototype = Object.create(' + t.parent + '.prototype);';
            }

            if (t.static_list) {
                _.each(t.static_list, function (assign) {
                    final_str += t.name + '.' + assign[0] + '=' + evaluate(assign[1], env) + ';';
                });
            }

            return final_str.replace(/@@/g, t.name);
        case 'dot':
            return dot_literal(t.left, env) + '.' + evaluate(t.right, env);
        case 'execute':
            return evaluate(t.value, env) + ';';
        case 'exit':
            return 'return;';
        case 'function':
            var body, head, var_str;
            env = { prev: env };
            head = 'function ' + evaluate(t.name, env) + '(' + evaluate(t.argument_list, env) + ')';
            body = body_eval(t.body, env);
            var_str = make_env(env);

            return head + (var_str ? '{' + var_str + body.slice(1) : body);
        case 'import':
            if (!t.alias) {
                t.alias = _.last(t.library.match(/[_A-Za-z0-9]+/g));
            }
            return 'var ' + t.alias + ' = require(' + t.library + ');';
        case 'new':
            return 'new ' + t.name + '(' + evaluate(t.argument_list, env) + ')';
        case 'not':
            return '!' + evaluate(t.value, env);
        case 'object':
            return '{' + obj_eval(t.member_list, env) + '}';
        case 'paren':
            return '(' + evaluate(t.value, env) + ')';
        case 'ppright':
            return evaluate(t.variable, env) + t.operator + ';';
        case 'print':
            return 'console.log(' + evaluate(t.value, env) + ');';
        case 'range':
            var start = evaluate(t.from),
                stop = evaluate(t.to),
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
                require_utils = true;
                return '_utils.range(' + start + ',' + stop + ')';
            }
        case 'return':
            return 'return ' + evaluate(t.value, env) + ';';
        case 'super':
            t.argument_list.unshift('this');
            return t.name + '.call(' + evaluate(t.argument_list, env) + ');';
        case 'throw':
            return 'throw ' + evaluate(t.value, env) + ';';
        case 'try':
            return 'try' + body_eval(t.body, env) +
			(t._catch ? 'catch(' + t._catch.error + ')' + body_eval(t._catch.body, env) : '') +
			(t._finally ? 'finally' + body_eval(t._finally, env) : '');
        case 'typeof':
            return 'typeof ' + evaluate(t.value, env);

        case 'while':
            return 'while(' + evaluate(t.condition, env) + ')' + body_eval(t.body, env);
        case 'do-while':
            return 'do' + body_eval(t.body, env) + 'while(' + evaluate(t.condition, env) + ');';
        case 'for':
            var assign_str = '', coll, str = '', func, found, from, to, iter = t.iterators[0];

            if ((coll = t.collection.value && t.collection.value[0]) && coll.token == 'range') {
                if (t.iterators.length > 1) {
                    throw new Error('Use only one iterator for a range loop (e.g only ' + t.iterators[0] + ')');
                }
                if (coll.from.token == 'number' && coll.to.token == 'number') {
                    from = +coll.from.value;
                    to = +coll.to.value;
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
                require_utils = true;
                return (found && !env._this ? (env._this = true) && 'var _this = this;' : '') + '_utils.loop(' + [evaluate(coll.from, env), evaluate(coll.to, env), func] + ');';
            }

            coll = evaluate(t.collection);
            if (t.collection.token != 'identifier') {
                var_lookup('_c', env);
                str = '_c = ' + coll + ';';
                coll = '_c';
            }

            if (t.op == 'in' && t.iterators.length == 1) {
                var_lookup(t.iterators[0], env);

                return str + 'for(' + t.iterators[0] + ' in ' + coll + ')' + body_eval(t.body, env);
            }
            else {
                if (t.iterators.length == 1) {
                    var_lookup(t.iterators[0], env);
                    assign_str = t.iterators[0] + '=' + coll + '[_i];';
                } else {
                    if (t.op == 'of') {
                        _.each(t.iterators, function (v, i) {
                            var_lookup(v, env);
                            assign_str += v + '= ' + coll + '[_i][' + i + '];';
                        });
                    } else {
                        _.each(t.iterators, function (v) {
                            var_lookup(v, env);
                            assign_str += v + '= ' + coll + '[_i].' + v + ';';
                        });
                    }
                }
                var_lookup('_i', env);
                var_lookup('_l', env);
                t.body.value.unshift(assign_str);

                return str + 'for(_i = -1, _l = ' + coll + '.length; ++_i < _l;)' + body_eval(t.body, env);
            }
        case 'if':
            return 'if(' + evaluate(t.condition, env) + ')' + body_eval(t.body, env) + evaluate(t.elif, env) + evaluate(t.else, env);
        case 'elif':
            return 'else if(' + evaluate(t.condition, env) + ')' + body_eval(t.body, env);
        case 'else':
            return 'else' + body_eval(t.body, env);
        case 'switch':
            return 'switch(' + evaluate(t.value, env) + '){' +
                _.map(t.case_list, function (t) {
                    return _.map(t.value, function (v) {
                        return 'case ' + evaluate(v, env) + ':'
                    }).join('') + evaluate(t.body.value, env).join('') + 'break;';
                }).join('') + (t.default ? 'default:' + evaluate(t.default, env) : '') + '}';


        case 'ppleft':
        case 'sign':
            return t.operator + evaluate(t.value, env);

        case 'string':
            var stype = t.value[0] == '"' ? '"' : "'",
                repl1 = function (_, m1) { return stype + "+(" + evaluate(parser.parse("`" + m1), env) + ")+" + stype },
                repl2 = function (_, m1) { return stype + "+" + evaluate(parser.parse("`" + m1), env) + "+" + stype };
            t.value = t.value.replace(/%((?:[_$A-Za-z]+(?:[\.\(\):]|\[[^]]*])*)+)/g, repl2)
                             .replace(/%{([^}]+)}/g, repl1)
                             .replace(new RegExp("^" + stype + stype + "\\s*\\+\\s*"), '')
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "\\s*\\+\\s*"), ' + ')
                             .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "$"), '');
        case 'regex':
        case 'number':
        case 'classname':
        case 'identifier':
            return t.value;

        case 'null':
        case 'this':
        case 'true':
        case 'false':
        case 'undefined':
            return t.token;
        default:
            throw new Error('Unexpected token: ' + t.token);
    }
}

function var_lookup(name, env) {
    if (/[.[(]/.test(name))
        return;
    if (name === 'this')
        return;

    var tmp_env = env;
    do {
        if (tmp_env[name])
            return;
    } while (tmp_env = tmp_env.prev);

    env[name] = true;
}

function acc_right(t, env) {
    return t.token == 'array' ? evaluate(t, env).split(',').join('][') : '[' + evaluate(t, env) + ']';
}

function dot_literal(t, env) {
    switch (t.token) {
        //case 'number':
        //case 'object':
        case 'function':
            return '(' + evaluate(t, env) + ')';
        default:
            return evaluate(t, env);
    }
}

function body_eval(t, env) {
    return '{' + evaluate(t, env) + '}';
}

function obj_eval(t, env) {
    return t ? _.map(t, function (v) {
        return evaluate(v[0]) + ':' + evaluate(v[1], env);
    }).join(',') : '';
}

function make_env(env) {
    var vars = '';

    _.each(env, function (_, key) {
        vars += key !== 'prev' ? ',' + key : '';
    });
    if (vars) {
        return 'var ' + vars.slice(1) + ';';
    }

    return vars;
}

module.exports = {
    compile: compile
}