var _ = require('lodash'),
	parser = require('./parser.js'),
	path   = require('path'),
    fs     = require('fs'),
	lib    = path.join(path.dirname(fs.realpathSync(__filename)), './utils.js'),
	require_utils = false;

function compile(text) {
	var tree = parser.parse(text);
	
	if(tree === true) return '';
	
    var env = null;
	var	ojs = evaluate(tree, env);

    return (require_utils ? 'var _utils = require("' + lib.replace(/\\/g, '/') + '");' : '') + ojs;
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
			return name + '=' + evaluate(t.value, env);
		case 'assign_single':
			var name = evaluate(t.variable, env);
			var_lookup(name, env);
			return name + '=' + evaluate(t.value, env) + ';';
		case 'assign_mult':
            var list = evaluate(t.variable_list, env),
               value = evaluate(t.value, env),
			   result = '_c = ' + value + ';';
            
            _.each(list, function (v,i) { 
			    var_lookup(v, env);
				result += v + '=' + '_c[' + i + '];';
			});
			
			return result;
		case 'assign_operator':
			var name = evaluate(t.variable, env);
			var_lookup(name, env);
			
			return name + t.operator + evaluate(value, env);
        case 'body':
            env = { prev: env };
            
            var body = evaluate(t.value, env).join(''), var_list = [];

            _.each(env, function(_,key) {
                key !== 'prev' ? var_list.push(key) : null;
            });

            return (var_list.length ? 'var ' + var_list.join(',') + ';' : '') + body;
        case 'bool':
            return evaluate(t.value, env).join(' ');
        case 'call':
            return dot_literal(t.name, env) + '(' + evaluate(t.argument_list, env) + ')';
        case 'class':
            env = { prev: env };

            var base_class = false;            
            var final_str = 'function ' + t.name + '(' + (t.constructor ? evaluate(t.constructor.argument_list) : '') + ') {';
			
			if(t.private_list) {
				var found = false;
                var str = 'var ' + _.map(t.private_list, function (v) { 
					var_lookup(v[0], env);
					return v[0] + '=' + evaluate(v[1], env);
				}).join(',').replace(/this/g, function() { found = true; return '_this' }) + ';';
				
				final_str += (found ? 'var _this = this;' : '') + str
            }
			
			if(t.public_list) {
                _.each(t.public_list, function(assign) {
					final_str += 'this.' + assign[0] + '=' + evaluate(assign[1], env) + ';'; 
				});
            }
			
			if (t.constructor) {
                if(!t.constructor.body)
                    _.each(t.constructor.argument_list, function(member) {
                        final_str += 'this.' + member + ' = ' + member + ';'
                    });
                else
                    final_str += evaluate(t.constructor.body, env);
            }

            final_str += '}';

            if(t.parent_list) {
                require_utils = true;
                _.each(t.parent_list, function(parent, i, list) {
                    if(base_class) {
                        throw EvalError("You can't have as parents two native classes");
                    } else if(global[parent]) {
                        base_class = true;
                        var tmp = list[0];
                        list[0] = parent;
                        list[i] = tmp;
                    }
                });
                final_str +=  '_utils.extend(' + t.name + ',' + t.parent_list + ');';
            }
			
			if(t.static_list) {
                _.each(t.static_list, function(assign) {
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
            return 'function ' + evaluate(t.name, env) + '(' + evaluate(t.argument_list, env) + ')' + body_eval(t.body, env);
        case 'import':
            if(!t.alias) {
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
			var assign_str = '', _in = t.op == 'in';
			if(t.iterators.length == 1) {
			    assign_str = t.iterators[0] + '= _c[' + (_in ? '_keys[_i]' : '_i') + '];';
			}
			else {
				_.each(t.iterators, function(v,i) {
					assign_str += v + '= _c[_i][' + (_in ? '_keys[' + i + ']' : i) + '];';
				})
			}
            t.body.value.unshift(assign_str);
            return 'for(var _i = -1, _c = ' + evaluate(t.collection, env) + ', _l = _c.length, ' + (_in ? '_keys = Object.keys(_c[0]),' : '') + t.iterators + '; ++_i<_l;)' + body_eval(t.body, env);
        
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
                        }).join('') + evaluate(t.body, env).join('') + 'break;';
                }).join('') + (t.default ? 'default:' + evaluate(t.default, env) : '') + '}';


        case 'ppleft':
        case 'sign':
            return t.operator + evaluate(t.value, env);

        case 'string':
            var stype = t.value[0] == '"' ? '"' : "'",
                repl = function (_, m1) {return stype + "+(" + evaluate(parser.parse("`" + m1), env) + ")+" + stype };
            t.value = t.value.replace(/%((?:[_$A-Za-z]+(?:[\.\(\):]|\[[^]]*])*)+)/g, repl);
            t.value = t.value.replace(/%{([^}]+)}/g, repl);
			
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

module.exports = {
    compile: compile
}