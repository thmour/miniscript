var compile = require('./mini.js').compile,
	fs = require('fs');

require.extensions['.mini'] = function(module, file) {
	return module._compile(compile(fs.readFileSync(file, 'utf8').toString()), file);
}