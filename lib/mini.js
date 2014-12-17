var parser = require('./parser.js'),
	path   = require('path'),
	fs     = require('fs'),
	spaces = '	',
	export_list = [],
	need_utils = false,
	compile_directory = false,
	identifier_regexp = /^[_$a-zA-Z][_$a-zA-Z0-9]*$/;
	active_loops = 0;

var alias = {
	"and": "&&",
	"or": "||",
	"is": "===",
	"is not": "!=="
}

function compile(text, cdir) {
	if(cdir === true) compile_directory = true;

	//replace '.member' with 'this.member' where applicable
	text = text.replace(/\s*\\\s+/gm, '').
	            replace(/(^|[^\w$\}\)\]\.'"])\.([$\w]+)/g, function(_, $1, $2) {
	            	return ($1 !== "\\" ? $1 + 'this.' : '.') + $2;
	            });
	//console.log(text);

	var tree = parser.parse(text);

	if (tree === null) return '';

	var env	= { "prev": null };
	var body   = list_eval(tree.value, '\n', env, '') + '\n';
	var result = make_utils() + make_env(env, null, '') + body + make_export();

	classes	 = {};
	need_utils  = false;
	export_list = [];
	
	return result;
}

function evaluate(token, env, indent) {
	if(token === undefined) return '';

	if(token.type === undefined) {
		if (token.constructor === Array) {
			return array_eval(token, env, indent);
		}

		return token;
	}

	switch (token.type) {
		case 'body':
			var result = '', i = -1, l = token.value.length;
			indent += spaces;
			while (++i < l) {
				result += indent + evaluate(token.value[i], env, indent) + '\n';
				
				if (token.value[i].type === 'return') break;
			}
			return result;

		case 'function':
			var result, body, head, var_str, _this = false;
			env = { prev: env };
			if(token.args[0] === 'this') {
				token.args.shift();
				indent += spaces;
				_this = true;
			}
			head = 'function (' + list_eval(token.args, ', ', env, indent) + ') ';
			body = body_eval(token.body, env, indent);
			var_str = make_env(env, token.args || null, indent + spaces);

			result = head + (var_str ? '{\n' + var_str + body.slice(2) : body);

			if(_this) {
				return '(function(_this) {\n' + indent + 'return ' + result + '\n' + indent.slice(0, -spaces.length) + '})(this)';
			} else {
				return result;
			}

		case 'lambda':
			if(token.args[0] === 'this') {
				var _indent = indent + spaces;
				return '(function(_this) {\n' + _indent + 'return function(' + list_eval(token.args.slice(1), ', ', env, _indent) + ') { ' +
						"return " + evaluate(token.value, env, _indent).replace(/\bthis\b/g, '_this') + '; }\n' + indent + '})(this)';				
			}

			return 'function(' + list_eval(token.args, ', ', env, indent) + ') { ' +
					"return " + evaluate(token.value, env, indent) + '; }'; 

		case 'assign':
			var semicolon = ';';
		case 'assign_expr':
			var left = evaluate(token.variable, env, indent);

			var_lookup(left, env);

			var right = evaluate(token.value, env, indent);

			return right === 'undefined' ? '' : left + ' ' + token.operator + ' ' + right + (semicolon || '');

		case 'assign-mult':
			var vars = token.variables;

			for (var i = -1, l = vars.length; ++i < l;) {
				vars[i] = evaluate(vars[i], env, indent);
				var_lookup(vars[i], env);
			}

			var value = evaluate(token.value, env, indent), result = '', collection = '';

			if (identifier_regexp.test(value)) {
				collection = value;
			} else {
				collection = '_t';
				var_lookup(collection, env);
				result += collection + ' = ' + value + ', ';
			}

			result += vars[0] + ' = ' + collection + '[' + 0 + ']';

			for (var i = 0, l = vars.length; ++i < l;) {
				result += ', ' + vars[i] + ' = ' + collection + '[' + i + ']';
			}

			return result + ';';

		case 'condition':
			return evaluate(token.condition, env, indent) + ' ? ' + evaluate(token.left, env, indent) + ' : ' + evaluate(token.right, env, indent);

		case 'increase':
			var left = evaluate(token.variable, env, indent);

			var_lookup(left, env);

			return left + token.operator + ';';

		case 'list':
			return array_eval(token.value, env, indent);

		case 'object':
			var i = 0, l = token.value.length, result;

			if (token.value.length === 0) return '{}';

			result = evaluate(token.value[0].left, env, indent) + ': ' + evaluate(token.value[0].right, env, indent);

			while (++i < l) {
				result += ', ' + evaluate(token.value[i].left, env, indent) + ': ' + evaluate(token.value[i].right, env, indent);
			}

			return '{' + result + '}';

		case 'if':
			var If = 'if (' + evaluate(token.condition, env, indent) + ') ' + body_eval(token.body, env, indent), Else = token.else ? ' else ' + body_eval(token.else.body, env, indent) : '', Elif = '';

			if (token.elif) {
				for (var i = -1, l = token.elif.length; ++i < l;) {
					Elif += ' else if (' + evaluate(token.elif[i].condition, env, indent) + ') ' + body_eval(token.elif[i].body, env, indent);
				}
			}

			return If + Elif + Else;

		case 'switch':
			var Cases = '', i = -1, l = token.cases.length, j, ll, body, Switch = 'switch (' + evaluate(token.value, env, indent) + ') {\n', Default = token.default ? indent + '  default:\n' + evaluate(token.default, env, indent) : '';

			while (++i < l) {
				var case_condition = token.cases[i].condition;
				if (ll = case_condition.length) {
					for (var j = -1; ++j < ll;) {
						Cases += indent + '  case ' + evaluate(case_condition[j], env, indent) + ':\n';
					}
					Cases += evaluate(token.cases[i].body, env, indent)
				}
				if (token.cases[i].body.value[token.cases[i].body.value.length - 1].type !== 'return') Cases += indent + spaces + 'break;\n';
			}

			return Switch + Cases + Default + indent + '}';

		case 'while':
			return 'while (' + evaluate(token.condition, env, indent) + ') ' + body_eval(token.body, env, indent);

		case 'do':
			return 'do ' + body_eval(token.body, env, indent) + ' while (' + evaluate(token.condition, env, indent) + ');';

		case 'for of':
			var assign_str = '', coll = token.collection, cache_str = '', start, stop, iter = token.iterator.value;
			var cache, index, length, body;

			active_loops++;

			if (coll.type == 'range') {
				var result;
				start = evaluate(coll.left, env, indent);
				stop  = evaluate(coll.right, env, indent);
				step  = evaluate(coll.step, env, indent);

				if (isNaN(+step) && !identifier_regexp.test(step)) {
					var c_step = nested('step');
					var_lookup(c_step, env);
					cache_str += ', ' + c_step + ' = ' + step;
					step = c_step;
				}

				if (!isNaN(+start && +stop)) {
					start = +start, stop = +stop;
					var_lookup(iter, env);
					
					if (start < stop) {
						result = 'for (' + iter + ' = '  + start + cache_str + '; ' +
								iter + ' <' + (coll.operator === 'to' ? '= ' : ' ') + stop + '; ' +
								(step && +step !== 1 ? iter + ' += ' + step : '++' + iter) + ') ' +
								body_eval(token.body, env, indent);
					}
					else if (start > stop) {
						result = 'for (' + iter + ' = ' + start + cache_str + '; ' +
								iter + ' >' + (coll.operator === 'to' ? '= ' : ' ') + stop + '; ' +
								(step && +step !== 1 ? iter + ' -= ' + step : '--' + iter) + ') ' +
								body_eval(token.body, env, indent);
					}
					else {
						result = list_eval(token.body.value, '\n' + indent, env, indent).replace(new RegExp('\\b' + iter + '\\b(?!\\s*=)', 'g'), start);
					}
				} else {
					if (isNaN(+stop) && !identifier_regexp.test(stop)) {
						var c_stop = nested('end');
						var_lookup(c_stop, env);
						cache_str += ', ' + c_stop + ' = ' + stop;
						stop = c_stop;
					}
					
					result = 'for (' + iter + ' = '  + start + cache_str + '; ' +
							iter + ' <' + (coll.operator === 'to' ? '= ' : ' ') + stop + '; ' +
							(step && +step !== 1 ? iter + ' += ' + step : '++' + iter) + ') ' +
							body_eval(token.body, env, indent);
				}

				active_loops--;
				return result;
			}

			coll = evaluate(token.collection, env, indent);
			if (!identifier_regexp.test(coll)) {
				cache = nested('arr');
				var_lookup(cache, env);
				cache_str = ', ' + cache + ' = ' + coll;
				coll = cache;
			}

			if (token.iterator.type == 'plain') {
				index = nested('i');
			} else {
				index = iter[0];
				iter  = iter[1];
			}

			length = nested('len');
			var_lookup(iter  , env);
			var_lookup(index , env);
			var_lookup(length, env);

			token.body.value.unshift(indent + spaces + iter + ' = ' + coll + '[' + index + '];\n');

			body = body_eval(token.body, env, indent);

			active_loops--;

			return make_loop(coll, cache_str, index, length) + body;

		case 'for in':
			var iter = token.iterator.value, coll, cache_str = '';
			var cache, body;

			active_loops++;

			coll = evaluate(token.collection, env, indent);
			if (!identifier_regexp.test(coll)) {
				cache = nested('arr');
				var_lookup(cache, env, indent);
				cache_str = cache + ' = ' + coll + ';\n';
				coll = cache;
			}

			if(token.iterator.type !== 'plain') {
				token.body.value.unshift(indent + spaces + iter[1] + ' = ' + coll + '[' + iter[0] + '];\n');
				iter = iter[0];
			}
			var_lookup(iter, env)

			body = body_eval(token.body, env, indent);

			active_loops--;

			return cache_str + indent + 'for (' + iter + ' in ' + coll + ') ' + body;

		case 'for each':
			var iter = token.iterators, coll, cache_str = '', assign_str = '';
			var cache, index, length, body;

			active_loops++;
			
			coll = evaluate(token.collection, env, indent);
			if (!identifier_regexp.test(coll)) {
				cache = nested('arr');
				var_lookup(cache, env, indent);
				cache_str = ', ' + cache + ' = ' + coll;
				coll = cache;
			}

			index  = nested('i');
			length = nested('len');
			var_lookup(index , env);
			var_lookup(length, env);

			for (var i = -1, l = token.iterators.length; ++i < l;) {
				var_lookup(iter[i], env);
				assign_str += indent + spaces + iter[i] + ' = ' + coll + '[' + index + '].' + iter[i] + ';\n';
			}

			token.body.value.unshift(assign_str);

		   	body = body_eval(token.body, env, indent);

		   	active_loops--;

			return make_loop(coll, cache_str, index, length) + body;

		case 'for index':
			var indices = token.iterators, _indent = indent, result = '', cache_str = '';
			var cache, index, length, body;

			coll = evaluate(token.collection, env, indent);
			if (!identifier_regexp.test(coll)) {
				cache = nested('arr');
				var_lookup(cache, env, indent);
				cache_str = cache + ' = ' + coll + ';\n';
				coll = cache;
			}

			for (var i = 0, l = indices.length; i < l; ++i, _indent += spaces) {
				active_loops++;

				index  = indices[i];
				length = nested('len');
				var_lookup(index , env);
				var_lookup(length, env);

				result  += _indent + make_loop(coll + (indices[i-1] ? '[' + indices[i-1] + ']' : ''), '', index, length) + '{\n';
			}

			_indent = _indent.slice(0, -spaces.length);
			result += evaluate(token.body, env, _indent);

			while(i--) {
				 result += _indent + '}\n';
				_indent  = _indent.slice(0, -spaces.length);

				active_loops--;
			}

			return cache_str + result.slice(0, -1);

		case 'repeat':
			var index, length, body;

			active_loops++;

			index  = nested('i');
			length = nested('len');
			var_lookup(index , env);
			var_lookup(length, env);

			body = body_eval(token.body, env, indent);

			active_loops--;

			return 'for (' + index + ' = 0, ' + length + ' = ' + evaluate(token.times, env, env) + '; ' + 
							 index + ' < ' + length + '; ++' + index + ') ' + body;

		case 'print':
			return 'console.log(' + evaluate(token.value, env, indent) + ');';

		case 'write':
			return 'process.stdout.write("" + ' + evaluate(token.value, env, indent) + ');';

		case 'throw':
			return 'throw ' + evaluate(token.value, env, indent) + ';';

		case 'return':
			return 'return ' + evaluate(token.value[1] ? token.value : token.value[0], env, indent) + ';';

		case 'try':
			return 'try ' + body_eval(token.body, env, indent) +
			(token.catch ? ' catch(' + token.catch.error + ') ' + body_eval(token.catch.body, env, indent) : '') +
			(token.finally ? ' finally ' + body_eval(token.finally, env, indent) : '');

		case 'import':
			var module, submodule, result = '';

			for (var i = 0, l = token.modules.length; i < l; ++i) {
				module = token.modules[i];

				submodule = '';

				if(module.submodule) {
					for (var i = 0, l = module.submodule.length; i < l; ++i) {
						submodule += access_eval(module.submodule[i], env, indent);
					}
				}

				if(module.name[0] !== '"' && module.name[0] !== "'") {
					module.name = "'" + module.name + "'";
				}

				if (module.alias === undefined) {
					module.alias = (module.name + submodule).match(/[$_a-zA-Z0-9]+((?=[[(])|$)|[-$ _a-zA-Z0-9]+(?:\.[$_a-zA-Z0-9]+)*(?=['"])/g).pop().replace(/\.[$_a-zA-Z0-9]+$/g, '').replace(/[-. ]/g, '_');
				}

				var_lookup(module.alias, env);
				
				if(compile_directory && /\.mini['"]$/.test(module.name)) {
					module.name = module.name.slice(0, -6) + '.js';
				}
				result += module.alias + ' = require(' + module.name + ')' + submodule + ', ';
			}

			return result.slice(0, -2) + ';';

		case 'export':
			if(token.module) {
				export_list.push(token.module);
				
				return evaluate(token.value, env, indent);
			} else {
				if(export_list.length > 0) {
					throw Error('Only one export is allowed when trying to export a value without a name');
				}
				export_list[0] = { value: evaluate(token.value, env, indent) };
				
				return '';
			}

		case 'execute':
			return evaluate(token.value, env, indent) + ';';

		case 'range':
			var start = evaluate(token.left, env, indent),
				stop  = evaluate(token.right, env, indent),
				step  = evaluate(token.step, env, indent);

			try {
				if (eval('typeof ' + step) === "function") {
					need_utils = true;
					return '_utils.recursion(' + start + ', ' + stop + ', ' + step + ', ' + (token.operator === 'until') + ')';
				}
			} catch (err) {}

			if (!isNaN(+start && +stop && +step) && (Math.abs(start - stop) / step) < 16) {
				var str = '[' + start;

				start = +start, stop = +stop, step = Math.abs(step);

				if (start < stop) {
					if(token.operator === 'until') stop--;
					for (var i = start + step; i <= stop; i += step) {
						str += ', ' + i;
					}
				} else {
					if(token.operator === 'until') stop++;
					for (var i = start - step; i >= stop; i -= step) {
						str += ', ' + i;
					}
				}

				return str + ']';
			}
				
			need_utils = true;
			return '_utils.range(' + start + ', ' + stop + ', ' + step + ', ' + (token.operator === 'until') + ')';

		case 'in':
			need_utils = true;
			return (token.operator === 'in' ? '': '!') + 
					'_utils.in(' + evaluate(token.left , env, indent) +
						', ' + evaluate(token.right, env, indent) + ');';

		case 'alias':
			token.operator = alias[token.operator];
		case 'binary':
			return evaluate(token.left, env, indent) + ' ' + token.operator + ' ' + evaluate(token.right, env, indent);

		case 'unary':
			return token.operator + evaluate(token.value, env, indent);

		case 'postfix':
			return evaluate(token.value, env, indent) + token.operator;

		case 'access':
			var left, right = '';
			for (var i = -1, l = token.access.length; ++i < l;) {
				right += access_eval(token.access[i], env, indent);
			}

			if(token.value.type == 'function' || token.value.type == 'number') {
				left = '(' + evaluate(token.value, env, indent) + ')';
			} else {
				left = evaluate(token.value, env, indent);
			}

			return left + right;

		case 'string':
			var stype = token.value[0] === '"' ? '"' : "'",
				repl1 = function (_, m1) { return stype + " + " + evaluate(parser.parse(";" + m1).value[0], env, indent) + " + " + stype },
				repl2 = function (_, m1) { return stype + " + " + evaluate(parser.parse(";" + m1).value[0], env, indent) + " + " + stype };
			token.value = token.value.replace(/%([_$a-zA-Z][_$a-zA-Z0-9]*(?:\.[_$a-zA-Z][_$a-zA-Z0-9]*|\([^\)]*\)|\[[^\]]+\])*)/g, repl2)
							 .replace(/%{(.+?)}/g, repl1)
							 .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "\\s*\\+\\s*"), ' + ')
							 .replace(new RegExp(stype + stype + "\\s*\\+\\s*([^\\+]+)\\s*\\+\\s*(?=" + stype + ")"), '$1 + ')
							 .replace(new RegExp("\\s*\\+\\s*" + stype + stype + "$"), '');
		case 'number':
			return token.value;

		case 'new':
			return 'new ' + token.name;

		case 'class': 
			//Search for constructor, create prototypes
			var constructor = null, cls_proto = '';
			for(var i = 0, l = token.body.length; i < l; ++i) {
				if(token.body[i].type === 'constructor') {
					if(constructor === null) constructor = token.body[i];
					else throw SyntaxError('Class ' + token.name + ' has more than 1 constructor');
				} else {
					cls_proto += indent + token.name + '.prototype.' + 
						evaluate(token.body[i].variable, env, indent) + ' = ' + evaluate(token.body[i].value, env, indent) + ';\n';
				}
			}

			//If no constructor is defined, create an empty one
			if(constructor === null) {
				constructor = { body: { type: 'body', value: [] } };
			}

			var body, final_str = 'function ' + token.name + '(';

			if (constructor.args) {
				final_str += (constructor.args[0].t || constructor.args[0]);
				for (var i = 0, l = constructor.args.length; ++i < l;) {
					final_str += ', ' + (constructor.args[i].t || constructor.args[i]);
				}
			}

			final_str += ') {\n';

			if (token.parent) {
				final_str += indent + spaces;
				if (constructor.body.value.length === 0) {
					final_str += 'return ' + token.parent + '.apply(this, arguments);\n';
				} else if (constructor.body.value[0].type == 'super') {
					constructor.body.value[0].name = token.parent;
					final_str += evaluate(constructor.body.value.shift(), env, indent) + '\n';
				} else {
					if(constructor.args.length === 0) {
						final_str += token.parent + '.apply(this, arguments);\n';
					} else {
						final_str += token.parent + '.call(this);\n';
					}
				}
			}

			if (constructor.args) {
				for (var i = 0, l = constructor.args.length; i < l; ++i) {
					final_str += constructor.args[i].t ? indent + spaces + 'this.' + constructor.args[i].t + ' = ' + constructor.args[i].t + ';\n' : '';
				}
			}

			if (constructor.body.value.length !== 0) {
				env = { prev: env };
				body = evaluate(constructor.body, env, indent);

				final_str += make_env(env, constructor.args ? constructor.args.map(function(v){ return v.t || v}) : null, indent + spaces) || '';
			
				final_str += body + indent + '}';
			} else {
				final_str += indent + '}';
			}

			if (token.parent) {
				need_utils = true;
				final_str += indent + ' _utils.extend(' + token.name + ', ' + token.parent + ');';
			}

			final_str += '\n' + cls_proto;

			return final_str;

		case 'type':
			var body, _this = 'this', final_str = 'function ' + token.name + '(' + list_eval(token.args, ', ', env, indent) + ') {\n';

			if(token.args.length > 0) {
				if (token.parent) {
					token.parent = evaluate(token.parent, env, indent);
					_this = "_this";
					final_str += indent + spaces + token.parent + '.apply(this, [].slice.call(arguments, ' + token.args.length + '));\n';	
				}

				for (var i = 0, l = token.args.length; i < l; ++i) {
					final_str += indent + spaces + 'this.' + token.args[i] + ' = ' + token.args[i] + ';\n';
				}
			} else if (token.parent) {
				final_str += indent + spaces + "return " + token.parent + '.apply(this, arguments);\n';
			}

			final_str += indent + '}';

			if (token.parent) {
				need_utils = true;
				final_str += indent + ' _utils.extend(' + token.name + ', ' + token.parent + ');';
			}

			final_str += '\n';

			return final_str;

		case 'super':
			return token.name + '.call(this' + (token.args.length > 0 ? ', ' + list_eval(token.args, ', ', env, indent) : '') + ');';

		case 'paren':
			var tmp;
			if(token.value.length > 1 && (tmp = token.value.pop()).type === 'lambda') {
				tmp.args = [].concat(token.value, tmp.args);
				return '(' + evaluate(tmp, env, indent) + ')';
			}
			return '(' + evaluate(token.value[0], env, indent) + ')';

		default:
			return token.value;
	}
}

function body_eval(token, env, indent) {
	if(indent == undefined) throw Error('undef');
	return '{\n' + evaluate(token, env, indent) + indent + '}';
}

function access_eval(token, env, indent) {
	switch (token.type) {
		case 'dot':
			return token.value;
		case 'proto':
			return '.prototype.' + token.value;
		case 'slice':
			return '.slice(' + evaluate(token.value[0], env, indent) +
					(token.value[1] === undefined ? '' : ', ' + evaluate(token.value[1], env, indent)) + ')';
		case 'array':
			return '[' + list_eval(token.value, '][', env, indent) + ']';
		case 'call':
			return '(' + list_eval(token.value, ', ', env, indent) + ')';
		default:
			throw new Error('Uknown type: ' + t + ', for accessing a variable');
	}
}

function list_eval(token, separator, env, indent) {
	var result = evaluate(token[0], env, indent);

	for (var i = 1, l = token.length; i < l; ++i) {
		result += separator + evaluate(token[i], env, indent);
	}

	return result;
}

function array_eval(token, env, indent) {
	var result = '', new_item;

	for (var i = 0, l = token.length; i < l; ++i) {
		new_item = evaluate(token[i], env, indent);
		if(token[i].type === 'range' && new_item[0] === '[') {
			new_item = new_item.slice(1, -1);
		}
		result += ', ' + new_item;
	}

	result = '[' + result.slice(2) + ']';

	return result;
}

function search_var(name, env) {
	do {
		if (env.hasOwnProperty(name)) return true;
	} while (env = env.prev);

	return false;
}

function var_lookup(name, env) {
	if (/[.[(]|this/.test(name))
		return;

	if (search_var(name, env) === false) {
		env[name] = true;
	}
}

function make_export() {
	if(export_list.length === 0) return '';
	if(export_list.length === 1 && export_list[0].value !== undefined) {
		return 'module.exports = ' + export_list[0].value;
	}

	var result = 'module.exports = {';
	
	for (var i = 0, l = export_list.length; i < l; ++i) {
		result += '\n' + spaces + export_list[i] + ': ' + export_list[i] + ',';
	}

	result = result.slice(0, -1) + '\n};';

	return result;
}

function make_env(env, func_args, indent) {
	var keys = Object.keys(env), vars = keys[1] || '';

	if(func_args === null) {
		for (var i = 2, l = keys.length; i < l; ++i) {
			vars += ', ' + keys[i];
		}
	} else {
		for (var i = 2, l = keys.length; i < l; ++i) {
			if(func_args.indexOf(keys[i]) !== -1) continue;
			vars += ', ' + keys[i];
		}
	}

	return vars !== '' ? indent + 'var ' + vars + ';\n' : '';
}

function make_utils() {
	if (need_utils) return 'var _utils = require("miniscript/utils");\n';

	return '';
}

function nested(str) {
	return '_' + str + (active_loops - 1 || '');
}

function make_loop(array, cache, index, length) {
	return 'for (' + index + ' = 0' + cache + ', ' + length + ' = ' + array + '.length' + '; ' + index + ' < ' + length + '; ++' + index + ') ';
}

module.exports = {
	compile: compile,
	parse: parser.parse,
	register: function() {
		require.extensions['.mini'] = function(module, file) {
			return module._compile(compile(fs.readFileSync(file, 'utf8').toString()), file);
		}
	}
};