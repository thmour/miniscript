%lex
%%

'//'[^\n]*                            /* ignore */
\/\*([\s\S]*?)\*\/                    /* ignore */      
\s+                                   /* ignore */ 
'++'|'--'|'::'                        return yytext 
[-+*/%&^|]'='|'<<='|'>>='|'>>>='      return 'ASOP' 
\b'and'\b|\b'or'\b|'&&'|'||'          return 'BOOL' 
[|&^]|'>>>'|'<<'|'>>'                 return 'BIT'  
[!=]'=='|[!=<>]'='|[<>]|\b'is'\b      return 'COMP'
[+-]                                  return 'ADD'   
[*/]                                  return 'MULT' 
\b'not'\b|'!'                         return 'NOT'  
\b"as"\b                              return "AS"         
\b"case"\b                            return "CASE"       
\b"catch"\b                           return "CATCH"      
\b"class"\b                           return "CLASS"      
\b"continue"\b                        return "CONTINUE"   
\b"debugger"\b                        return "DEBUGGER" 
\b"default"\b                         return "DEFAULT"  
\b"delete"\b                          return "DELETE"     
\b"do"\b                              return "DO"
"@@"                                  return "TYPE"
"@"                                   return "DOT"     
\b"elif"\b                            return "ELIF"
\b"else"\b                            return "ELSE"       
\b"exit"\b                            return "EXIT"       
\b"false"\b                           return "FALSE"      
\b"finally"\b                         return "FINALLY"    
\b"for"\b                             return "FOR"        
\b"function"\b                        return "FUNCTION"   
\b"get"\b                             return "GET"        
\b"if"\b                              return "IF"         
\b"import"\b                          return "IMPORT"     
\b"in"\b                              return "IN"         
\b"instanceof"\b                      return "INSTANCEOF" 
\b"let"\b                             return "LET"        
\b"new"\b                             return "NEW"        
\b"null"\b                            return "NULL" 
\b"of"\b                              return "OF"   
\b"print"\b                           return "PRINT"      
\b"private"\b                         return "PRIVATE"    
\b"public"\b                          return "PUBLIC"     
\b"return"\b                          return "RETURN"     
\b"set"\b                             return "SET" 
\b"static"\b                          return "STATIC" 
\b"super"\b                           return "SUPER"      
\b"switch"\b                          return "SWITCH"     
\b"this"\b                            return "THIS"       
\b"throw"\b                           return "THROW"
\b"to"\b|".."                         return "TO"      
\b"true"\b                            return "TRUE"       
\b"try"\b                             return "TRY"        
\b"typeof"\b                          return "TYPEOF"     
\b"undefined"\b                       return "UNDEFINED"
\b"uses"\b                            return "USES"  
\b"var"\b                             return "VAR"   
\b"void"\b                            return "VOID" 
\b"while"\b                           return "WHILE" 
\b"with"\b                            return "WITH"  
[a-z_$][0-9A-Za-z_$]*                 return 'IDF'   
[A-Z][0-9A-Za-z_]*                    return 'CNAME' 
'0'[0-7]+                             return 'OCT'   
'0x'[0-9a-fA-F]+                      return 'HEX'   
[0-9]+\.[0-9]+                        return 'DEC'   
[0-9]+                                return 'INT'   
\"(\\.|[^"])*\"                       return 'DST'   
\'(\\.|[^'])*\'                       return 'SST'   
'/'(\\.|[^/])+'/'[igm]{0,3}           return 'RGX' 
<<EOF>>                               return 'EOF'   
.                                     return yytext  

/lex

%left '='
%left TO
%left '?'
%left BOOL
%left COMP
%left ADD
%left MULT
%left '%'
%left BIT
%left INSTANCEOF
%left '::'

%start S
%%

S : prg EOF
  { return $1 }
  | '`' bool EOF
  { return $2 }
;

prg :
    { $$ = {token: 'body', value: []} }
    | prg statement
    { $1.value.push($2); $$ = $1 }
;

statement : assign
          | if
          | switch
          | try
          | for
          | while
          | print
          | throw
          | import
          | class
          | EXIT
          { $$ = {token: 'exit'} }
          | RETURN bool
          { $$ = {token: 'return', value: $2} }
          | call
          { $$ = {token: 'execute', value: $1} }
          | SUPER fargs
          { $$ = {token: 'super', name: '', argument_list: $2} }
;

import : IMPORT string as_opt
       { $$ = {token:'import', library: $2.value, alias: $3} }
;

as_opt :| AS IDF 
        { $$ = $2 }
;

class : CLASS CNAME parent_opt constructor_opt static_opt public_opt private_opt ';'
      { $$ = {token: 'class', name: $2, parent: $3, constructor: $4, static_list: $5, public_list: $6, private_list: $7} }
;

static_opt :| STATIC massign
            { $$ = $2 }
;

public_opt :| PUBLIC massign
            { $$ = $2 }
;

private_opt :| PRIVATE mcassign
             { $$ = $2 }
;

mcassign : mcassign cassign
         { $$ = $1.concat([$2]) }
         | cassign
         { $$ = [$1]}
;

cassign : IDF '=' bool set_opt get_opt
        { $$ = [$1,$3,$4,$5] }
;

set_opt:| SET
        | SET '{' IDF ':' bool '}'
        { $$ = [$3,$5] }
;

get_opt:| GET
        | GET '{' bool '}'
        { $$ = [$3] }
;

constructor_opt : cargs_opt body_opt
                { $$ = { token: 'constructor', argument_list: $1, body: $2} }
;

cargs_opt :| cargs_opt ',' carg
           { $$ = $1.concat($3) }
           | carg
           { $$ = [$1] }
;

carg : IDF
     | DOT IDF
     { $$ = { t: $2 } }
;

parent_opt :| ':' CNAME
             { $$ = $2 }
;

lamda : '#' largs_opt body
      { $$ = {token: 'function', argument_list: $2, body: $3} }
      | '#' IDF ':' largs_opt body
      { $$ = {token: 'function', name: $2, argument_list: $4, body: $5} }
;

body : '{' prg '}'
     { $$ = $2 }
;

body_opt :| body
;

largs_opt :| largs_opt ',' IDF
           { $$ = $1.concat($3) }
           | IDF
           { $$ = [$1] }
;

assign : call '=' bool
       { $$ = {token: 'assign_single', variable: $1, value: $3 } }
       | left_assign '=' bool
       { $$ = {token: 'assign_mult', variable_list: $1, value: $3 } }
       | call ASOP bool
       { $$ = { token: 'assign_operator', variable: $1, operator: $2, value: $3} }
       | call plusplus
       { $$ = {token:'ppright', variable: $1, operator: $2} }
;

plusplus : '++'
         | '--'
;

left_assign : call mult_call
            { $$ = [$1].concat($2) }
;

mult_call : mult_call ',' call
          { $$ = $1.concat($3) }
          | ',' call
          { $$ = [$2] }
;

if : IF bool prg elif_opt else_opt ';'
   { $$ = {token: 'if', condition: $2, body: $3, elif: $4, else: $5} }
;

elif_opt :| elif_mult
;

elif_mult : elif_mult elif
          | elif
;

elif : ELIF bool prg
     { $$ = {token: 'elif', condition: $2, body: $3} }
;

else_opt :| ELSE prg
          { $$ = {token: 'else', body: $2} }
;

switch : SWITCH bool cases default_opt ';'
       { $$ = {token: 'switch', value: $2, case_list: $3, default: $4} }
;

cases : cases case
      { $$ = $1.concat($2) }
      | case
      { $$ = [$1] }
;

case : CASE bool_mult prg
     { $$ = {value: $2, body: $3} }
;

bool_mult : bool_mult ',' bool
          { $$ = $1.concat([$3]) }
          | bool
          { $$ = [$1] }
;

default_opt :| DEFAULT prg
             { $$ = $2 }
;

print : PRINT args
      { $$ = {token: 'print', value: $2} }
;

throw : THROW bool
      { $$ = {token: 'throw', value: $2} }
;

while : DO prg ';' WHILE bool
      { $$ = {token: 'do-while', condition: $5, body: $2 } }
      | WHILE bool prg ';'
      { $$ = {token: 'while', condition: $2, body: $3 } }
;

for : FOR mult_idf operator bool prg ';'
    { $$ = {token: 'for', collection: $4, op: $3, iterators: $2, body: $5} }
;

operator : IN
         | OF
;

mult_idf : mult_idf ',' IDF
         { $$ = $1.concat($3) }
         | IDF
         { $$ = [$1] }
;

try : TRY prg catch finally_opt ';'
    { $$ = {token: 'try', _catch: $3, _finally: $4, body: $2 } }
;

catch : CATCH IDF prg
      { $$ = {error: $2, body: $3} }
;

finally_opt :| FINALLY prg
             { $$ = $2 }
;

bool : boolean
     { $$ = {token: 'bool', value: $1} } 
     | call '=' bool
     { $$ = { token: 'assign', variable: $1, operator: $2, value: $3 } }
     | NEW CNAME
     { $$ = {token: 'new', name: $2} }
     | uminus
;

boolean : bool BOOL bool
        %{ 
            if($2 == 'and')
                $2 = '&&';
            else
            if ($2 == 'or')
                $2 = '||';
            $$ = [$1,$2,$3] 
        %}
        | bool COMP bool
        %{
            if($2 == 'is') $2 = '===';
            $$ = [$1,$2,$3] 
        %}
        | bool ADD bool 
        { $$ = [$1,$2,$3] }
        | bool MULT bool
        { $$ = [$1,$2,$3] }
        | bool BIT bool
        { $$ = [$1,$2,$3] }
        | bool '%' bool
        { $$ = [$1,$2,$3] }
        | bool INSTANCEOF CNAME
		{ $$ = [$1,$2,$3] }
        | bool TO bool
        { $$ = [{token: 'range', from: $1, to: $3}] }
		| bool '?' bool ',' bool
		{ $$ = [$1,'?',$3,':',$5] }
;

uminus : call
       | literal
       | NEW CNAME fargs
       { $$ = {token: 'new', name: $2, argument_list: $3} }
       | TYPEOF uminus
       { $$ = {token: 'typeof', value: $2 } }
       | plusplus uminus
       { $$ = {token: 'ppleft', value: $2, operator: $1} }
       | ADD uminus
       { $$ = {token: 'sign', value: $2, operator: $1} }
       | '~' uminus
       { $$ = {token: 'sign', value: $2, operator: $1} }
       | NOT uminus
       { $$ = {token: 'not', value: $2} }
       | paren
       | paren '.' call
       { $$ = {token: 'dot', left: $1, right: $3} }
;

paren : '(' bool ')'
      { $$ = {token: 'paren', value: $2} }
;

call : member
     | call '::' member
     { $$ = {token: 'dot', left: {token: 'dot', left: $1, right: {token: 'identifier', value: 'prototype'}}, right: $3} }
     | call '.' member
     { $$ = {token: 'dot', left: $1, right: $3} }
     | lamda '.' member
     { $$ = {token: 'dot', left: $1, right: $3} }
     | call array
     { $$ = {token: 'access', left: $1, right: $2} }
     | call ':' cmember
     { $$ = {token: 'access', left: $1, right: $3} }
     | call fargs
     { $$ = {token: 'call', name: $1, argument_list: $2} }
     | lamda fargs
     { $$ = {token: 'call', name: $1, argument_list: $2} }
     | TYPE member 
     { $$ = {token: 'dot', left: '@@', right: $2} }
     | DOT member
     { $$ = {token: 'dot', left: {token: 'this'}, right: $2} }
;

cmember : member
        | oliteral
;

fargs : '(' args_opt ')'
      { $$ = $2 }
;

args_opt :| args
;

args : args ',' bool
     { $$ = $1.concat($3) }
     | bool
     { $$ = [$1] }
;

member : IDF
       { $$ = {token: 'identifier', value: $1} }
       | CNAME
       { $$ = {token: 'classname', value: $1} }
       | THIS
       { $$ = {token: 'this'} }
;

literal : object
        | array
        | lamda
        | oliteral
;

oliteral : number
         | string
         | RGX
         { $$ = {token: 'regex', value: $1} }
         | TRUE
         { $$ = {token: 'true'} }
         | FALSE
         { $$ = {token: 'false'} }
         | NULL
         { $$ = {token: 'null'} }
         | UNDEFINED
         { $$ = {token: 'undefined'} }
;


array : '[' args_opt ']'
      { $$ = {token: 'array', value_list: $2} }
;

object : '{' assigns_opt '}'
       { $$ = {token: 'object', member_list: $2} }
;

assigns_opt :| massign
;

massign : massign oassign
        { $$ = $1.concat([$2]) }
        | oassign
        { $$ = [$1]}
;

oassign : idf '=' bool
        { $$ = [$1,$3] }
;

idf : oliteral
    | IDF
;
           

string : str
       { $$ = {token: 'string', value: $1} }
;

str : SST
    | DST
;

number : num
       { $$ = {token: 'number', value: $1} }
;

num : INT
    | DEC
    | HEX
    | OCT
;