%lex
%%

\s+                                   /* ignore */
\/\*([\s\S]*?)\*\/                    /* ignore */
'//'[^\n]*                            /* ignore */

'r/'(\\.|[^/\n])+'/'[gimy]{0,4}       return 'regexp'
"false"                               return 'bool'
"true"                                return 'bool'

"to"                                  return 'rangeOperator'
"until"                               return 'rangeOperator'
'=>'                                  return 'lambdaOperator'

'++'                                  return 'incrementOperator'
'--'                                  return 'incrementOperator'
'::'                                  return 'prototypeOperator'

':='                                  return 'assignOperator'
'+='                                  return 'assignOperator'
'-='                                  return 'assignOperator'
'*='                                  return 'assignOperator'
'/='                                  return 'assignOperator'
'%='                                  return 'assignOperator'
'&='                                  return 'assignOperator'
'^='                                  return 'assignOperator'
'|='                                  return 'assignOperator'
'<<='                                 return 'assignOperator'
'>>='                                 return 'assignOperator'
'>>>='                                return 'assignOperator'

"not in"                              return 'not_in'
"not"                                 return 'notOperator'
"and"                                 return 'aliasOperator'
"or"                                  return 'aliasOperator'
"is not"                              return 'aliasOperator'
"is a"                                return 'aliasOperator'
"is"                                  return 'aliasOperator'

'instanceof'                          return 'binaryOperator'
'&&'                                  return 'binaryOperator'
'||'                                  return 'binaryOperator'
'*'                                   return 'binaryOperator'
'/'                                   return 'binaryOperator'
'%'                                   return 'binaryOperator'
'&'                                   return 'binaryOperator'
'^'                                   return 'binaryOperator'
'|'                                   return 'binaryOperator'
'<<'                                  return 'binaryOperator'
'>>'                                  return 'binaryOperator'
'>>>'                                 return 'binaryOperator'
'!=='                                 return 'binaryOperator'
'==='                                 return 'binaryOperator'
'!='                                  return 'binaryOperator'
'=='                                  return 'binaryOperator'
'<='                                  return 'binaryOperator'
'>='                                  return 'binaryOperator'
'<'                                   return 'binaryOperator'
'>'                                   return 'binaryOperator'

'+'                                   return 'additiveOperator'
'-'                                   return 'additiveOperator'

'!'                                   return 'unaryOperator'
'~'                                   return 'unaryOperator'
"typeof"                              return 'unaryWordOperator'

"as"                                  return yytext
"break"                               return yytext
"by"                                  return yytext
"continue"                            return yytext
"case"                                return yytext
"catch"                               return yytext
"char"                                return yytext
"class"                               return yytext
"const"                               return yytext
"default"                             return yytext
"delete"                              return yytext
"do"                                  return yytext
"each"                                return yytext
"elif"                                return yytext
"else"                                return yytext
"end"                                 return yytext
"export"                              return yytext
"finally"                             return yytext
"for"                                 return yytext
"if"                                  return yytext
"import"                              return yytext
"in"                                  return yytext
"index"                               return yytext
"int"                                 return yytext
"new"                                 return yytext
"null"                                return yytext
"of"                                  return yytext
"print"                               return yytext
"return"                              return yytext
"str"                                 return yytext
"super"                               return yytext
"switch"                              return yytext
"then"                                return yytext
"this"                                return yytext
"throw"                               return yytext
"times"                               return yytext
"try"                                 return yytext
"type"                                return yytext
"undefined"                           return yytext
"use"                                 return yytext
"while"                               return yytext
"write"                               return yytext

"debugger"                            return 'illegal'
"function"                            return 'illegal'
"let"                                 return 'illegal'
"static"                              return 'illegal'
"private"                             return 'illegal'
"public"                              return 'illegal'
"var"                                 return 'illegal'
"void"                                return 'illegal'
"with"                                return 'illegal'

\"(?:\\.|[^"])*\"                     return 'string'
\'(?:\\.|[^'])*\'                     return 'string'

"\\'"                                 return 'escape'
"\\"\"                                return 'escape'
"\\\\"                                return 'escape'
"\\n"                                 return 'escape'
"\\r"                                 return 'escape'
"\\t"                                 return 'escape'
"\\b"                                 return 'escape'
"\\f"                                 return 'escape'

'0b'[01]+                             return 'number'
'0o'[0-8]+                            return 'number'
'0x'[0-9a-fA-F]+                      return 'number'
[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?  return 'number'

[_$a-zA-Z][_$a-zA-Z0-9]*              return 'identifier'
'.'\s*[_$a-zA-Z][_$a-zA-Z0-9]*        return 'member'

'?'                                   return yytext
'='                                   return yytext
':'                                   return yytext
';'                                   return yytext
','                                   return yytext
'('                                   return yytext
')'                                   return yytext
'['                                   return yytext
']'                                   return yytext
'{'                                   return yytext
'}'                                   return yytext
'@'                                   return yytext
'..'                                  return yytext
'...'                                 return yytext

<<EOF>>                               return 'EOF'
.                                     return 'ILLEGAL'

/lex

%start Program
%%

Program : Body EOF
        { return $1 }
        | ';' Expression
        { return { type: 'paren', value: [$2] } }
        ;

Body :
     { $$ = {type: 'body', value: []} }
     | Body Statement
     { $$.value.push($2) }
     ;

Statement : Class
          | Assignment
          | Import
          | Export
          | If
          | Switch
          | For
          | While
          | Print
          | Write
          | Throw
          | Try
          | Return
          | Execute
          { $$ = { type: 'execute', value: $1 } }
          ;

Execute : break
        | continue
        | CallExpression
        ;

Assignment : CallExpression AssignOperator Expression
           { $$ = { type: 'assign', variable: $1, value: $3, operator: $2 } }
           | CallExpressionList AssignOperator ExpressionList
           { $$ = { type: 'assign-mult', variables: $1, value: $3.length === 1 ? $3[0] : $3, operator: $2 } }
           | CallExpression incrementOperator
           { $$ = { type: 'increase', variable: $1,  operator: $2 } }
           ;

AssignOperator : assignOperator
               | '='
               ;

CallExpressionList : CallExpressionList Commas CallExpression
                   { $$ = $$.concat($2, $3) }
                   | CallExpression Commas CallExpression
                   { $$ = [$1].concat($2, $3) }
                   ;

Commas : Commas ','
       { $$.push(" ") }
       | ','
       { $$ = [] }
       ;

Expression : AssignExpression
           | ValueExpression
           | PrintExpression
           | StatementAsExpression
           | KeyValuePair
           ;

StatementAsExpression : for Iterator of ValueExpression 'gen' Expression
                      | if ValueExpression '->' Expression
                      ;

ExpressionList : ExpressionList ',' Expression
               { $$.push($3) }
               | Expression
               { $$ = [$1] }
               ;

OptionalExpressionList :
                       { $$ = [] }
                       | ExpressionList
                       ;

PrintExpression : print Expression
                { $$ = { type: 'print', value: $2 } }
                | write Expression
                { $$ = { type: 'write', value: $2 } }
                ;

AssignExpression : CallExpression AssignOperator Expression
                 { $$ = { type: 'assign_expr', variable: $1, value: $3, operator: $2 } }
                 ;

ValueExpression : Range
                | InExpression
                | CastExpression
                | BinaryExpression
                | LambdaExpression
                ;

CastExpression : BinaryExpression 'as' identifier
               { $$ = { type: 'cast', expr: $1, class: $3 } }
               | BinaryExpression 'as' 'int'
               { $$ = { type: 'floor', expr: $1 } }
               | BinaryExpression 'as' 'str'
               { $$ = { type: 'tostr', expr: $1 } }
               | BinaryExpression 'as' 'char'
               { $$ = { type: 'tochar', expr: $1 } }
               ;

LambdaExpression : lambdaOperator Expression
                 { $$ = { type: 'lambda', args: [], value: $2 } }
                 | Initial lambdaOperator Expression
                 { $$ = { type: 'lambda', args: [$1], value: $3 } }
                 | ParenthesizedExpression lambdaOperator Expression
                 { $$ = { type: 'lambda', args: $1.value, value: $3 } }
                 ;

Range : BinaryExpression rangeOperator BinaryExpression
      { $$ = { type: 'range', left: $1, operator: $2, right: $3, step: { type: 'number', value: '1' } } }
      | BinaryExpression rangeOperator BinaryExpression by BinaryExpression
      { $$ = { type: 'range', left: $1, operator: $2, right: $3, step: $5 } }
      ;

BinaryExpression : BinaryExpression BinaryOperator PostfixExpression
                 { $$ = { type: $2.type, left: $1, right: $3, operator: $2.value} }
                 | PostfixExpression
                 ;

InExpression : BinaryExpression InOperator BinaryExpression
             { $$ = { type: $2.type, left: $1, right: $3, operator: $2.value} }
             ;

InOperator : in
           { $$ = { type: 'in', value: 'in' } }
           | not_in
           { $$ = { type: 'in', value: 'not' } }
           ;

BinaryOperator : aliasOperator
               { $$ = { type: 'alias',  value: $1 } }
               | binaryOperator
               { $$ = { type: 'binary', value: $1 } }
               | additiveOperator
               { $$ = { type: 'binary', value: $1 } }
               ;

PostfixExpression : UnaryExpression incrementOperator
                  { $$ = { type: 'postfix', value: $1, operator: $2 } }
                  | UnaryExpression
                  ;

UnaryExpression : UnaryOperator UnaryExpression
                { $$ = { type: 'unary', value: $2, operator: $1} }
                | CallExpression
                | SingleExpression Accessors
                { $$ = {type: 'access', value: $1, access: $2} }
                | SingleExpression
                ;

SingleExpression : Literal
                 | ArrayLiteral
                 | RegexLiteral
                 | LambdaLiteral
                 | ObjectLiteral
                 | FunctionLiteral
                 | NewExpression
                 | ParenthesizedExpression
                 ;

UnaryOperator : notOperator {$$ = '!'}
              | unaryOperator
              | additiveOperator
              | incrementOperator
              | unaryWordOperator {$$ = $1+' '}
              ;

CallExpression : Initial Accessors
               { $$ = {type: 'access', value: $1, access: $2} }
               | Initial
               ;

Initial : this
        | identifier
        ;

OptionalAccessors :
                  | Accessors
                  ;

Accessors : Accessors Accessor
          { $$.push($2) }
          | Accessor
          { $$ = [$1] }
          ;

Accessor : member
         { $$ = { type: 'dot',   value: $1.replace(/\s+/, '') } }
         | '[' Expression '..' OptionalExpression ']'
         { $$ = { type: 'slice', value: [$2, $4] } }
         | '[' ExpressionList ']'
         { $$ = { type: 'array', value: $2 } }
         | FunctionArguments
         { $$ = { type: 'call',  value: $1 } }
         | prototypeOperator identifier
         { $$ = { type: 'proto', value: $2 } }
         ;

OptionalExpression :
                   | Expression
                   ;

NewExpression : new identifier
              { $$ = {type: 'new', name: $2} }
              ;

FunctionArguments : '(' OptionalExpressionList ')'
                  { $$ = $2 }
                  ;

ParenthesizedExpression : FunctionArguments
                        { $$ = { type: 'paren', value: $1 } }
                        ;

FunctionLiteral : FunctionArguments '{' Body '}'
                { $$ = { type: 'function', args: $1, body: $3 } }
                ;

IdentifierList : IdentifierList ',' identifier
               { $$.push($3) }
               | identifier
               { $$ = [$1] }
               ;

OptionalIdentifierList :
                       { $$ = [] }
                       | IdentifierList
                       ;

ArrayLiteral : '[' OptionalExpressionList ']'
             { $$ = { type: 'list', value: $2} }
             ;

RegexLiteral : regexp
             { $$ = { type: 'regexp', value: $1} }
             ;

ObjectLiteral : '{' '}'
              { $$ = { type: 'object', value: [] } }
              | '{' ObjectExpression '}'
              { $$ = { type: 'object', value: $2 } }
              ;

ObjectExpression : ObjectExpression ObjectAssignment
                 { $$.push($2) }
                 | ObjectExpression ',' ObjectAssignment
                 { $$.push($3) }
                 | ObjectAssignment
                 { $$ = [$1] }
                 ;

KeyValuePair : identifier ':' Expression
             { $$ = { type: 'pair', left: $1, right: $3} }
             | Literal ':' Expression
             { $$ = { typeleft: $1, right: $3} }
             ;

ObjectAssignment : KeyValuePair
                 | identifier
                 { $$ = {left: $1, right: $1} }
                 | Literal
                 { $$ = {left: $1, right: $1} }
                 ;

Literal : bool
        { $$ = { type: 'bool', value: $1} }
        | null
        { $$ = { type: 'null', value: $1} }
        | undefined
        { $$ = { type: 'undefined', value: $1} }
        | string
        { $$ = { type: 'string', value: $1} }
        | escape
        { $$ = "'" + $1 + "'" }
        | number
        { $$ = { type: 'number', value: $1} }
        ;

SingleBody : '->' Statement
           { $$ = { type: 'body', value: [$2] } }
           ;

EndBlock : Body end
         | SingleBody
         ;

If : if Expression EndBlock
   { $$ = { type: 'if', condition: $2, body: $3 } }
   | if Expression Body Else
   { $$ = { type: 'if', condition: $2, body: $3, else: $4 } }
   | if Expression Body OuterElif
   { $$ = { type: 'if', condition: $2, body: $3, elif: $4 } }
   | if Expression Body InnerElif Else
   { $$ = { type: 'if', condition: $2, body: $3, elif: $4, else: $5 } }
   ;

InnerElif : InnerElif Elif
          { $$.push($2) }
          | Elif
          { $$ = [$1] }
          ;

OuterElif : InnerElif EndElif
          { $$ = $1.concat($2) }
          | EndElif
          ;

EndElif : elif Expression EndBlock
        { $$ = [{ condition: $2, body: $3 }] }
        ;

Elif : elif Expression Body
     { $$ = { condition: $2, body: $3 } }
     ;

Else : else EndBlock
     { $$ = { body: $2 } }
     ;

Switch : switch Expression CaseList OptionalDefault end
       { $$ = {type: 'switch', value: $2, cases: $3, default: $4} }
       ;

CaseList : CaseList Case
         { $$ = $1.concat($2) }
         | Case
         { $$ = [$1] }
         ;

Case : case ExpressionList Body
     { $$ = {condition: $2, body: $3} }
     ;

OptionalDefault :
                | default Body
                { $$ = $2 }
                ;

While : do Body while Expression ';'
      { $$ = { type: 'do', condition: $4, body: $2 } }
      | while Expression EndBlock
      { $$ = { type: 'while', condition: $2, body: $3 } }
      ;

For : for identifier of ValueExpression EndBlock
    { $$ = { type: 'for of', iterator: $2, collection: $4, body: $5} }
    | for identifier ',' identifier of ValueExpression EndBlock
    { $$ = { type: 'for of', iterator: [$2, $3], collection: $4, body: $5} }
    | for identifier in ValueExpression EndBlock
    { $$ = { type: 'for in', iterator: $2, collection: $4, body: $5} }
    | for identifier ',' identifier in ValueExpression EndBlock
    { $$ = { type: 'for in', iterator: [$2,$3], collection: $4, body: $5} }
    | for index IdentifierList of ValueExpression EndBlock
    { $$ = { type: 'for index', iterators: $3, collection: $5, body: $6} }
    | for each IdentifierList in ValueExpression EndBlock
    { $$ = { type: 'for each', iterators: $3, collection: $5, body: $6} }
    | for BinaryExpression times EndBlock
    { $$ = { type: 'repeat', times: $2, body: $4 } }
    ;

Print : print Expression
      { $$ = { type: 'print', value: $2 } }
      ;

Write : write Expression
      { $$ = { type: 'write', value: $2 } }
      ;

Return : return ';'
       { $$ = { type: 'return', value: [] } }
       | return ExpressionList
       { $$ = { type: 'return', value: $2 } }
       ;

Throw : throw Expression
      { $$ = { type: 'throw', value: $2 } }
      ;

Try : try Body OptionalCatch OptionalFinally end
    { $$ = {type: 'try', catch: $3, finally: $4, body: $2 } }
    ;

OptionalCatch :
              | catch identifier Body
              { $$ = { error: $2, body: $3 } }
              ;

OptionalFinally :
                | finally Body
                { $$ = $2 }
                ;

Import : import ModuleList
       { $$ = {type:'import', modules: $2 } }
       ;

ModuleList : ModuleList ',' Module
           { $$.push($3) }
           | Module
           { $$ = [$1] }
           ;

Module : ModuleName OptionalAccessors OptionalAlias
       { $$ = { name: $1, submodule: $2, alias: $3 } }
       ;

ModuleName : string
           | identifier
           ;

Export : export Expression
       { $$ = { type:'export', module: $2.variable, value: $2 } }
       | export Class
       { $$ = { type:'export', module: $2.name, value: $2 } }
       ;

OptionalAlias :
              | as identifier
              { $$ = $2 }
              ;

Class : class identifier OptionalParent ClassBody end
      { $$ = {type: 'class', name: $2, parent: $3, body: $4 } }
      | type identifier OptionalParent OptionalMembers
      { $$ = {type: 'type' , name: $2, parent: $3, args: $4 } }
      ;

OptionalMembers :
                { $$ = [] }
                | '{' IdentifierList '}'
                { $$ = $2 }
                ;

OptionalParent :
               | ':' CallExpression
               { $$ = $2 }
               ;

ClassBody :
          { $$ = [] }
          | ClassBody ClassBodyStatement
          { $$.push($2) }
          ;

ClassBodyStatement : AssignExpression
                   | Constructor
                   ;

Constructor : new '=' '(' OptionalClassArguments ')' '{' ConstructorBody '}'
            { $$ = {type: 'constructor', args: $4, body: $7 } }
            ;

OptionalClassArguments :
                       | ClassArgumentList
                       ;

ClassArgumentList : ClassArgumentList ',' ClassArgument
                  { $$.push($3) }
                  | ClassArgument
                  { $$ = [$1] }
                  ;

ClassArgument : identifier
              | this member
              { $$ = { t: $2.slice(1) } }
              ;

ConstructorBody : Statement
                { $$ = { type: 'body', value: [$1] } }
                | Super
                { $$ = { type: 'body', value: [$1] } }
                | ConstructorBody Statement
                { $$.value.push($2) }
                ;

Super : super
      { $$ = { type: 'super', args: [] } }
      | super FunctionArguments
      { $$ = { type: 'super', args: $2 } }
      ;
