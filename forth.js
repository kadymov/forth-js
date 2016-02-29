/*
    TODO
        Вложенность комментириев
        Вложенность строк
*/

(function(undefined) {
    
    function SourceList(source) {
        var tockens = source.match(/\.?"[^"]+"|\([^\)]+\)|[^\s]+/g),
            tockenId = -1;
        
        return {
            nextTocken : function() {
                return tockens[++tockenId];
            },
            
            prevTocken : function() {
                return tockens[--tockenId];
            },
            
            pos : function(id) {
                if (!arguments.length) {
                    return tockenId;
                }
                
                if (id < 0 || id >= tockens.length) 
                    return false;
            
                tockenId = id;
                return true;
            },
            
            len : function () {
                return tockens.length;
            },
            
            log : function () {
                console.log(tockens);
            }
        };
    }
    
    
    /**********************************************************/
    
    function Forth(source, outFunc) {
        outFunc = outFunc || console.log.bind(console);
        
        var DIC = {
            '+'         : function(s) { s.push(   s.pop() + s.pop()); },
            '-'         : function(s) { var b = s.pop(), a = s.pop(); s.push(a - b); },
            '*'         : function(s) { s.push(   s.pop() * s.pop()); },
            '/'         : function(s) { var b = s.pop(), a = s.pop(); s.push(a / b); },
            'MOD'       : function(s) { var b = s.pop(), a = s.pop(); s.push(a % b); },
            '/MOD'      : function(s) { var b = s.pop(), a = s.pop(); s.push(parseInt(a / b, 10)); },
            'ABS'       : function(s) { s.push(Math.abs(s.pop())); },
            'NEGATE'    : function(s) { s.push(-s.pop()); },

            'DUP'       : function(s) { s.push(s[s.length-1]); },
            'DROP'      : function(s) { s.pop(); },
            'SWAP'      : function(s) { s.push(s.pop(), s.pop()); },
            'OVER'      : function(s) { s.push(s[s.length - 2]); },
            'ROT'       : function(s) { var c = s.pop(), b = s.pop(), a = s.pop(); s.push(b, c, a); },
            '-ROT'      : function(s) { var c = s.pop(), b = s.pop(), a = s.pop(); s.push(c, a, b); },
            'PICK'      : function(s) { s.push(s[s.length - s.pop() - 2]); },
            //'ROLL'      : function(s) {  },
            
            'DEPTH'     : function(s) { s.push(s.length); },
            'CLEAR'     : function(s) { s.length = 0; },
            
            'AND'       : function(s) { s.push( s.pop() & s.pop() ); },
            'OR'        : function(s) { s.push( s.pop() | s.pop() ); },
            'XOR'       : function(s) { s.push( s.pop() ^ s.pop() ); },
            'NOT'       : function(s) { s.push( ~s.pop()          ); },
            
            '='         : function(s) { s.push( s.pop() == s.pop() ? -1 : 0 ); },
            '<'         : function(s) { s.push( s.pop() >  s.pop() ? -1 : 0 ); },
            '>'         : function(s) { s.push( s.pop() <  s.pop() ? -1 : 0 ); },
            '>='        : function(s) { s.push( s.pop() <= s.pop() ? -1 : 0 ); },
            '<='        : function(s) { s.push( s.pop() >= s.pop() ? -1 : 0 ); },
            '0='        : function(s) { s.push( s.pop() == 0 ? -1 : 0); },
            '0>'        : function(s) { s.push( s.pop() <  0 ? -1 : 0); },
            '0<'        : function(s) { s.push( s.pop() >  0 ? -1 : 0); },
            '0>='       : function(s) { s.push( s.pop() <= 0 ? -1 : 0); },
            '0<='       : function(s) { s.push( s.pop() >= 0 ? -1 : 0); },
            
            '.'         : function(s) { outFunc(s.pop()); },
            'S'         : function(s) { outFunc(stack.join('\n'));  },
            'COMMANDS'  : function(s) { outFunc(Object.keys(DIC).join('\n')); },
            
        };
        
        var sourceList = new SourceList(source),
            stack = [];
        
        function isNumeric(n) {
          return !isNaN(parseFloat(n)) && isFinite(n);
        }
        
        function createCommand(sList) {
            var comName = sList.nextTocken(),
                depth = 1,
                tocken,
                body = [];
            
            while (tocken = sList.nextTocken()) {
                if (tocken === ':') depth++;
                if (tocken === ';') {
                    if (--depth === 0) break;
                }
                
                body.push(tocken);
            }
            
            if (depth !== 0) throw new Error('Func depth error!');
            
            DIC[comName] = body.join(' ');
        }
        
        function execCondition(sList, skipElse) {
            var isTrue = stack.pop() !== 0,
                tocken,
                depth = 1;
            
            if (!isTrue || skipElse) {
                while (tocken = sList.nextTocken()) {
                    tocken = tocken.toUpperCase();
                    if (tocken === 'IF') depth++;
                    if (tocken === 'THEN') {
                        if (--depth === 0) break;
                    }

                    if (tocken === 'ELSE' && depth === 1) {
                        depth = 0;
                        break;
                    }
                }
                
                if (depth !== 0) {
                    throw new Error('Condition depth error');
                }
            }
        }
        
        function skipCycle(sList) {
            var depth = 1;
            
            while (tocken = sList.nextTocken()) {
                tocken = tocken.toUpperCase();
                
                if (tocken === 'BEGIN') depth++;
                if (tocken === 'UNTIL' || tocken === 'REPEAT') {
                    if (--depth === 0) break;
                }
            }
            
            if (depth !== 0) throw new Error('Func depth error!');
        }
        
        function exec(source) {
            var sList = source ? new SourceList(source) : sourceList,
                tocken,
                cyclesStack = [],
                uTocken;
         
            while(tocken = sList.nextTocken()) {
                uTocken = tocken.toUpperCase();
                
                if (tocken.charAt(0) === '(' || uTocken === 'THEN') continue;
                
                if (tocken === ':') {
                    createCommand(sList);
                    
                } else if (tocken.charAt(0) === '"') { 
                    stack.push(tocken.substring(1, tocken.length - 1));

                } else if (tocken.charAt(0) === '.' && tocken.charAt(1) === '"') {
                    outFunc(tocken.substring(2, tocken.length - 1));
                    
                } else if (uTocken === 'IF') {
                    execCondition(sList);
                
                } else if (uTocken === 'ELSE') {
                    execCondition(sList, true);
                
                } else if (uTocken === 'BEGIN') {
                    cyclesStack.push(sList.pos());
                    
                } else if (uTocken === 'UNTIL' || uTocken === 'REPEAT') {
                    if (!cyclesStack.length)
                        throw new Error('Cycle depth error');
                    
                    if (uTocken === 'REPEAT' || stack.pop() === 0) {
                        sList.pos(cyclesStack[cyclesStack.length - 1]);
                    } else {
                        cyclesStack.pop();
                    }
                    
                } else if (uTocken === 'WHILE') {
                    if (!cyclesStack.length)
                        throw new Error('Cycle depth error');
                    
                    if (stack.pop() === 0) {
                        cyclesStack.pop();
                        skipCycle(sList);
                    }
                    
                    
                } else if (DIC.hasOwnProperty(tocken.toUpperCase())) {
                    var com = DIC[uTocken];
                    if (typeof com === 'function') {
                        com(stack);
                    } else {
                        exec(com);
                    }
                    
                } else if (isNumeric(tocken)) {
                        stack.push(Number(tocken));
                    
                } else {
                    throw new Error('Unknown tocken');
                }

            }
        }
        
        return {
            exec : exec
        };
    }
    
    
    
    /*************************************/
    
    var fs = require('fs');
    
    fs.readFile(__dirname + '/prog.txt', function (err, data) {
        if (err) {
            throw err; 
        }
        var source = data.toString(),
            program = new Forth(source);
    
        program.exec();
    });   
    
    
})();