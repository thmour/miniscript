;(function()
{
	// CommonJS
	SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

	function Brush()
	{
		var keywords =	'if for index each class switch try while do ' +
						'elif else end case default catch finally export ' +
						'delete typeof func times break continue type ' +
						'return import print write throw';

		var operators = 'new and or is not in as instanceof typeof delete';

		var constants = 'true false nil null undefined';

		var r = SyntaxHighlighter.regexLib;
		
		this.regexList = [
			{ regex: r.multiLineDoubleQuotedString,								css: 'string'	},	// double quoted strings
			{ regex: r.multiLineSingleQuotedString,								css: 'string'	},	// single quoted strings
			{ regex: r.singleLineCComments,										css: 'comments' },	// one line comments
			{ regex: r.multiLineCComments,										css: 'comments' },	// multiline comments
			{ regex: /\b[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?/gm,				css: 'numbers'	},	// numbers
			{ regex: /\b[A-Z][$\w]*\b/g,										css: 'class'	},	// classes
			{ regex: /:\s*\b[$\w]+\b/g,											css: 'string'	},	// parent class
			{ regex: /\b(this|super)\b/g,										css: 'this'		},	// this/super
			{ regex: new RegExp(this.getKeywords(keywords) + '\\s', 'gm'),		css: 'keyword' 	},	// keywords
			{ regex: new RegExp(this.getKeywords(constants), 'gm'),				css: 'constants'},	// constants
			{ regex: new RegExp(this.getKeywords(operators), 'gm'),				css: 'operators'},	// operators
			];
	
		this.forHtmlScript(r.scriptScriptTags);
	};

	Brush.prototype	= new SyntaxHighlighter.Highlighter();
	Brush.aliases	= ['mini', 'miniscript'];

	SyntaxHighlighter.brushes.Miniscript = Brush;

	// CommonJS
	typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();