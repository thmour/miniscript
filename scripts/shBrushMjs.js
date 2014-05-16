;(function()
{
	// CommonJS
	typeof(require) != 'undefined' ? SyntaxHighlighter = require('shCore').SyntaxHighlighter : null;

	function Brush()
	{
		var keywords_main =	'if for class switch try while do ' +
							'elif else case default catch finally ' +
							'typeof';
							
		var keywords_class = 'static public private';
		
		var keywords_op = 'as in of is and or not instanceof import print throw return exit new super';
		
		var keywords_val = 'null undefined Infinity NaN this true false';

		var r = SyntaxHighlighter.regexLib;
		
		this.regexList = [
			{ regex: r.multiLineDoubleQuotedString, css: 'string'},
			{ regex: r.multiLineSingleQuotedString,	css: 'string' },
			{ regex: r.singleLineCComments,	css: 'comments' },
			{ regex: /\s;|#|{|}/g, css: 'keyword' },
			{ regex: /@?@[$_a-zA-Z0-9]+/g, css: 'this'},
			{ regex: /\.[$_a-zA-Z][$_a-zA-Z0-9]*/g, css: 'member' },
			{ regex: /\b[A-Z][$_a-zA-Z0-9]*/g, css: 'cls' },
			{ regex: new RegExp(this.getKeywords(keywords_main), 'gm'), css: 'keyword' },
			{ regex: new RegExp(this.getKeywords(keywords_class), 'gm'), css: 'keyword_class' },
			{ regex: new RegExp(this.getKeywords(keywords_op), 'gm'), css: 'keyword_op' },
			{ regex: new RegExp(this.getKeywords(keywords_val), 'gm'),	css: 'keyword_val' }
			];
	
		this.forHtmlScript(r.scriptScriptTags);
	};

	Brush.prototype	= new SyntaxHighlighter.Highlighter();
	Brush.aliases	= ['mjs', 'm.js'];

	SyntaxHighlighter.brushes.Mjs = Brush;

	// CommonJS
	typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();