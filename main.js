var cmd  = require('commander'),
    path = require('path'),
    fs   = require('fs')
	jsb  = require('js-beautify').js_beautify,
	lib  = path.join(path.dirname(fs.realpathSync(__filename)), './lib/'),
	compiler = require(lib + 'compiler.js');

 cmd.version(require('./package.json').version);

 cmd.command('out <src> [out]')
    .description('Output javascript equivalent')
	.action(function(src, out) {
		if(!path.extname(src)) src += '.mjs';
		
		if(fs.existsSync(src)) {
			var src_text = fs.readFileSync(src).toString();
			var out_text = compiler.compile(src_text);
			if(!out) out = src.replace(/\.mjs|\.txt/, '.js');
			fs.writeFileSync(out, jsb(out_text));
		} else {
			console.log('File input does not exist');
		}
    });

 cmd.command('run <fname>')
    .description('Run mjs script')
	.action(function(fn) {
		var vm = require('vm');
		if(!path.extname(fn)) fn += '.mjs';
		
		if(fs.existsSync(fn)) {
			eval(compiler.compile(fs.readFileSync(fn).toString()));
		} else {
			console.log('File input does not exist');
		}
    });
   

 cmd.command('*')
    .action(function () {
		console.log('Enter a valid command');
    })

 cmd.parse(process.argv);