type ParserCharConsumer = (c: string, n: string) => boolean;


export interface XtnCharPosition {
    readonly line?: number;
    readonly column?: number;
    readonly index?: number;
}

export interface XtnElement {
    readonly posStart?: XtnCharPosition;
    readonly posEnd?: XtnCharPosition;
}

export interface XtnKey extends XtnElement {
    readonly name: string;
    readonly quoted: boolean;
}

export interface XtnPrimitive<T> extends XtnElement {
    readonly value: T;
    readonly valueString: string;
    readonly explicit: boolean;
    readonly posFirstOffset?: number;
}

export interface XtnSString extends XtnPrimitive<string> {
    readonly type: "sstring";
    readonly explicit: true;
}

export interface XtnQString extends XtnPrimitive<string> {
    readonly type: "qstring";
    readonly explicit: true;
}

export interface XtnMString extends XtnPrimitive<string> {
    readonly type: "mstring"
    readonly explicit: true;
    readonly indentChar: string;
}

export interface XtnInteger extends XtnPrimitive<bigint | null> {
    readonly type: "integer";
}

export interface XtnRealNumber extends XtnPrimitive<number | null> {
    readonly type: "real";
}

export interface XtnBoolean extends XtnPrimitive<boolean | null> {
    readonly type: "boolean";
}

export interface XtnReference extends XtnPrimitive<string> {
    readonly type: "reference";
    readonly explicit: true;
}

export interface XtnNull extends XtnPrimitive<null> {
    readonly type: "null";
    readonly explicit: false;
}

export interface XtnArray extends XtnElement {
    readonly type: "array";
    readonly items: readonly XtnValue[];
}

export interface XtnTagName extends XtnElement {
    readonly type: "tagname";
    readonly name: string;
}

export interface XtnConstructor extends XtnElement {
    readonly type: "constructor";
    readonly tag: XtnTagName;
    readonly args: XtnArgs;
    readonly initializer: XtnObject | null;
}

export interface XtnKeyValuePair {
    readonly type: "keyvaluepair";
    readonly key: XtnKey;
    readonly value: XtnValue;
}

export interface XtnValueOrPairList extends XtnElement {
    readonly items: readonly (XtnValue | XtnKeyValuePair)[]
}

export interface XtnArgs extends XtnValueOrPairList {
    readonly type: "constructorargs";
}

export const children = Symbol("children");

export type XtnDataValue = string | bigint | number | boolean | null | XtnDataObject | XtnDataValue[];

export interface XtnDataObject {
    [key: string]: XtnDataValue;
    [children]?: XtnDataValue[];
}

export interface XtnEnvironment {
    integerType?: "number" | "bigint";
    construct?: (tagName: string, args: XtnDataValue[]) => XtnDataValue;
}

export interface XtnObject extends XtnValueOrPairList {
    readonly type: "object";
    data(env?: XtnEnvironment): XtnDataObject;
}

export type XtnValue = XtnSString | XtnQString | XtnMString | XtnInteger | XtnRealNumber | XtnBoolean | XtnReference | XtnNull | XtnArray | XtnConstructor | XtnObject;

export type XtnValueImpl = XtnSStringImpl | XtnQStringImpl | XtnMStringImpl | XtnIntegerImpl | XtnRealNumberImpl | XtnBooleanImpl | XtnReferenceImpl | XtnNullImpl | XtnArrayImpl | XtnConstructorImpl | XtnObjectImpl;


class XtnElementImpl {
    constructor(
        public readonly posStart?: XtnCharPosition,
        public readonly posEnd?: XtnCharPosition
    ) { }
}

class XtnKeyImpl extends XtnElementImpl {
    constructor(
        public readonly name: string,
        public readonly quoted: boolean,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
}

class XtnPrimitiveImpl<T> extends XtnElementImpl {
    constructor(
        public readonly value: T,
        public readonly valueString: string,
        public readonly explicit: boolean,
        public readonly posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
}

class XtnSStringImpl extends XtnElementImpl implements XtnSString {
    get type() { return "sstring" as const; }
    get valueString() { return this.value; }
    get explicit() { return true as const; }

    constructor(
        public readonly value: string,
        public readonly posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env?: XtnEnvironment): string {
        return this.value;
    }
}

class XtnQStringImpl extends XtnElementImpl implements XtnQString {
    get type() { return "qstring" as const; }
    get valueString() { return this.value; }
    get explicit() { return true as const; }
    get posFirstOffset() { return 0; }

    constructor(
        public readonly value: string,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env?: XtnEnvironment): string {
        return this.value;
    }
}

class XtnMStringImpl extends XtnElementImpl implements XtnMString {
    get type() { return "mstring" as const; }
    get valueString() { return this.value; }
    get explicit() { return true as const; }
    get posFirstOffset() { return 0; }

    constructor(
        public readonly value: string,
        public readonly indentChar: string,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env?: XtnEnvironment): string {
        return this.value;
    }
}

class XtnIntegerImpl extends XtnPrimitiveImpl<bigint | null> implements XtnInteger {
    get type() { return "integer" as const; }

    constructor(
        value: bigint | null,
        valueString: string,
        explicit: boolean,
        posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(value, valueString, explicit, posFirstOffset, posStart, posEnd);
    }

    _data(env: XtnEnvironment | undefined): bigint | number | null {
        if (env?.integerType === "bigint" || this.value === null)
            return this.value;
        return Number(this.value);
    }
}

class XtnRealNumberImpl extends XtnPrimitiveImpl<number | null> implements XtnRealNumber {
    get type() { return "real" as const; }

    constructor(
        value: number | null,
        valueString: string,
        explicit: boolean,
        posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(value, valueString, explicit, posFirstOffset, posStart, posEnd);
    }

    _data(env?: XtnEnvironment): number | null {
        return this.value;
    }
}

class XtnBooleanImpl extends XtnPrimitiveImpl<boolean | null> implements XtnBoolean{
    get type() { return "boolean" as const; }

    constructor(
        value: boolean | null,
        valueString: string,
        explicit: boolean,
        posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(value, valueString, explicit, posFirstOffset, posStart, posEnd);
    }

    _data(env?: XtnEnvironment): boolean | null {
        return this.value;
    }
}

class XtnReferenceImpl extends XtnElementImpl implements XtnReference {
    get type() { return "reference" as const; }
    get explicit() { return true as const; }
    get valueString() { return this.value; }

    constructor(
        public readonly value: string,
        public readonly posFirstOffset?: number,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env?: XtnEnvironment): XtnDataValue {
        // TODO: Handle properly
        return this.value;
    }
}

class XtnNullImpl extends XtnElementImpl implements XtnNull {
    get type() { return "null" as const; }
    get explicit() { return false as const; }
    get value() { return null; }
    get posFirstOffset() { return 0; }

    constructor(
        public readonly valueString: string,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env?: XtnEnvironment): null {
        return null;
    }
}

class XtnArrayImpl extends XtnElementImpl implements XtnArray {
    get type() { return "array" as const; }
    readonly items: XtnValueImpl[] = [];

    constructor(
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env: XtnEnvironment | undefined): XtnDataValue[] {
        return this.items.map(item => item._data(env));
    }
}

class XtnTagNameImpl extends XtnElementImpl implements XtnTagName {
    get type() { return "tagname" as const; }
    constructor(
        public readonly name: string,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
}

class XtnConstructorImpl extends XtnElementImpl implements XtnConstructor {
    get type() { return "constructor" as const; }

    constructor(
        public readonly tag: XtnTagNameImpl,
        public readonly args: XtnArgsImpl,
        public readonly initializer: XtnObjectImpl | null,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env: XtnEnvironment | undefined): XtnDataValue {
        if (!env?.construct) {
            throw new Error("An env with a construct method must be provided");
        }
        const args = this.args.items.map(a => a.type === "keyvaluepair" ? a.value._data(env) : a._data(env));
        const obj = env.construct(this.tag.name, args);
        if (this.initializer) {
            if (obj == null) {
                throw new Error(`Initializer could not be applied because the constructed object for ${this.tag.name} is ${obj === null ? "null" : "undefined"}`);
            }
            const t = typeof obj;
            if (t !== "object") {
                throw new Error(`Initializer could not be applied because the constructed object for ${this.tag.name} is not an object`);
            }
            this.initializer._fillData(obj as XtnDataObject, env);
        }
        return obj;
    }
}

class XtnKeyValuePairImpl implements XtnKeyValuePair {
    get type() { return "keyvaluepair" as const; }
    value!: XtnValueImpl;

    constructor(
        public readonly key: XtnKeyImpl
    ) { }
}

class XtnValueOrPairListImpl extends XtnElementImpl implements XtnValueOrPairList {
    readonly items: (XtnValueImpl | XtnKeyValuePairImpl)[] = [];
    constructor(
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
}

class XtnArgsImpl extends XtnValueOrPairListImpl implements XtnArgs {
    get type() { return "constructorargs" as const; }

    constructor(
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
}

class XtnObjectImpl extends XtnValueOrPairListImpl implements XtnObject {
    get type() { return "object" as const; }

    constructor(
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    data(env?: XtnEnvironment): XtnDataObject {
        return this._data(env);
    }
    _data(env: XtnEnvironment | undefined): XtnDataObject {
        const obj: XtnDataObject = { };
        this._fillData(obj, env);
        return obj;
    }
    _fillData(obj: XtnDataObject, env: XtnEnvironment | undefined) {
        for (const item of this.items) {
            if (item.type === "keyvaluepair") {
                obj[item.key.name] = item.value._data(env);
            }
            else {
                let c = obj[children];
                if (!c)
                    obj[children] = c = [];
                c.push(item._data(env));
            }
        }
    }
}

function parseJson5String(str: string) {
    const cps = [];
    let escape = 0;
    let escdCR = false;
    let hex = 0n;
    for (const c of str.substring(1, str.length - 1)) {
        if (escape !== 0) {
            if (escape === 1) {
                escdCR = false;
                switch (c) {
                    case '\\':
                        cps.push('\\');
                        break;
                    case '\r':
                        escdCR = true;
                        break;
                    case '\n':
                        break;
                    case '\u2028':
                    case '\u2029':
                        break;
                    case '"':
                    case "'":
                        cps.push(c);
                        break;
                    case 'b':
                        cps.push('\b');
                        break;
                    case 'f':
                        cps.push('\f');
                        break;
                    case 'n':
                        cps.push('\n');
                        break;
                    case 'r':
                        cps.push('\r');
                        break;
                    case 't':
                        cps.push('\t');
                        break;
                    case 'v':
                        cps.push('\v');
                        break;
                    case '0':
                        cps.push('\0');
                        break;
                    case 'x':
                        hex = 0n;
                        escape = -1;
                        break;
                    case 'u':
                        hex = 0n;
                        escape = -3;
                        break;
                    default:
                        if (isAsciiNumber(c)) {
                            // error
                        }
                        else {
                            cps.push(c);
                        }
                        break;
                }
                --escape;
            }
            else {
                const h = hexDigit(c);
                if (h === null) {
                    //error
                    escape = 0;
                }
                else {
                    hex = hex * 16n + h;
                    ++escape;
                    if (escape === 0) {
                        cps.push(String.fromCodePoint(Number(hex)));
                    }
                }
            }
        }
        else if (c === '\n') {
            if (escdCR) {
                escdCR = false;
            }
            else {
                // error: LF cannot appear without escaping
            }
        }
        else {
            escdCR = false;
            if (c === '\\') {
                escape = 1;
            }
            else if (c == '\r') {
                // error: CR cannot appear without escaping
            }
            else {
                cps.push(c);
            }
        }
    }
    return cps.join('');
}

function isStartOfNumber(char: string, next: string) {
    return ('-+.'.indexOf(char) >= 0 && isAsciiNumber(next)) || isAsciiNumber(char);
}

function isAsciiNumber(char: string) {
    const cn = char.codePointAt(0)!;
    //0-9
    return cn >= 48 && cn <= 57;
}

function hexDigit(char: string) {
    const cn = char.codePointAt(0)!;
    //0-9
    if (cn >= 48 && cn <= 57) return BigInt(cn - 48);
    if (cn >= 65 && cn <= 70) return BigInt(cn - 55);
    if (cn >= 97 && cn <= 102) return BigInt(cn - 87);
    return null;
}

function decDigit(char: string) {
    const cn = char.codePointAt(0)!;
    //0-9
    if (cn >= 48 && cn <= 57) return BigInt(cn - 48);
    return null;
}

function isAsciiLetter(char: string) {
    const cn = char.codePointAt(0)!;
    //a-z or A-Z
    return (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122);
}

function isKeyStartLetter(char: string) {
    const cn = char.codePointAt(0)!;
    //a-z or A-Z or - or _
    return (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95;
}
function isKeyLetter(char: string) {
    const cn = char.codePointAt(0)!;
    // 0-9 or a-z or A-Z or - or _
    return (cn >= 48 && cn <= 57) || (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95;
}

class Parser {
    constructor(readonly document: string) {
        this.parentsStack = [this.rootObj];
    }

    stack: ParserCharConsumer[] = [];
    top: ParserCharConsumer | undefined = undefined;
    pushStack(consumer: ParserCharConsumer) {
        this.stack.push(consumer);
        this.top = consumer;
    }
    popStack() {
        const stack = this.stack;
        stack.pop();
        this.top = stack.length > 0 ? stack[stack.length - 1] : undefined;
    }

    lineNo = 0;
    lineStartPos = 0;
    colNo = -1;
    pos = -1;
    private logFragmentExcl(header: string, startPos: number) {
        //console.log(`Read ${header} ${this.lineNo}, ${startPos - this.lineStartPos}:${this.pos - this.lineStartPos} :${this.document.substring(startPos, this.pos)}`);
    }

    readonly rootObj = new XtnObjectImpl({}, {});
    private parentsStack: (XtnArrayImpl | XtnValueOrPairListImpl | XtnKeyValuePairImpl)[];
    private getCurrentParent() { return this.parentsStack[this.parentsStack.length - 1]!; }

    private interpretAndCompleteValue(value: XtnKeyImpl) {
        const text = value.name;
        const upper = text.toUpperCase();
        let lit;
        switch (upper) {
            case 'TRUE':
                lit = new XtnBooleanImpl(true, text, false, undefined, {}, {});
                break;
            case 'FALSE':
                lit = new XtnBooleanImpl(false, text, false, undefined, {}, {});
                break;
            case 'NULL':
                lit = new XtnNullImpl(text, {}, {});
                break;
            case 'INFINITY':
                lit = new XtnRealNumberImpl(Number.POSITIVE_INFINITY, text, false, undefined, {}, {});
                break;
            case '-INFINITY':
                lit = new XtnRealNumberImpl(Number.NEGATIVE_INFINITY, text, false, undefined, {}, {});
                break;
            case 'NAN':
                lit = new XtnRealNumberImpl(Number.NaN, text, false, undefined, {}, {});
                break;
            case '-NAN':
                lit = new XtnRealNumberImpl(-Number.NaN, text, false, undefined, {}, {});
                break;
        }
        if (lit) {
            this.completeValue(lit);
        }
        else {
            // error
        }
    }
    private completeValue(value: XtnValueImpl) {
        const parent = this.getCurrentParent();
        if (parent instanceof XtnKeyValuePairImpl) {
            this.popStack();
            this.parentsStack.pop();
            parent.value = value;
            const parentList = this.getCurrentParent();
            if (parentList instanceof XtnValueOrPairListImpl) {
                parentList.items.push(parent);
            }
            else {
                // error
            }
        }
        else {
            parent.items.push(value);
        }
    }
    
    parse() {
        let char = '\0';
        for (let next of this.document) {
            if (this.processChar(char, next)) {
                const len = char.length;
                this.colNo += len;
                this.pos += len;
            }
            char = next;
        }
        this.processChar(char, '\n');
        return this.rootObj;
    }
    private crlf = false;
    private processChar(char: string, next: string) {
        if (char === '\r') {
            if (next === '\n') {
                this.crlf = true;
                return false;
            }
            else {
                this.processCharActual('\n', next === '\r' ? '\n' : next);
                this.lineNo++;
                this.lineStartPos = this.pos + 1;
                return true;
            }
        }
        if (char === '\n') {
            this.processCharActual(char, next === '\r' ? '\n' : next);
            if (this.crlf) {
                this.pos++;
                this.colNo++;
                this.crlf = false;
            }
            this.lineNo++;
            this.lineStartPos = this.pos + 1;
            return true;
        }
        this.processCharActual(char, next === '\r' ? '\n' : next);
        return true;
    }

    private ignoreCount = 0;
    private disableNext = false;
    private processCharActual(char: string, next: string) {
        if (this.top) {
            if (this.top(char, next))
                return;
        }
        this.consumeInner(char, next, true);
    }

    commentStartPos = -1;
    private startComment() {
        this.commentStartPos = this.pos;
        this.pushStack(this.consumeComment);
    }
    private consumeComment(char: string, next: string) {
        // on first entry, char is the second character of //
        if (char === '\n') {
            this.logFragmentExcl("comment", this.commentStartPos);
            this.popStack();
            return true;
        }
        return true;
    }

    private rawText: XtnKeyImpl | XtnQStringImpl | null = null;

    jsonStrStartPos = -1;
    quoteStartPos = -1;
    quoteChar: string | null = null;
    private startQuote(char: string, next: string) {
        // char is the starting " or '
        this.quoteChar = char;
        this.quoteStartPos = this.pos;
        if (next === this.quoteChar)
            this.pushStack(this.consumeQuoted);
        else {
            this.jsonStrStartPos = this.pos;
            this.pushStack(this.consumeJsonString);
        }
    }
    private cqCount = 0;
    private consumeQuoted(char: string, next: string) {
        // on first entry, char is a " immediately after the opening " and cqCount is 0
        if (this.cqCount === 0) {
            if (next === this.quoteChar) {
                this.cqCount = 1;
                return true;
            }
            else {
                this.jsonStrStartPos = this.pos - 1;
                return this.consumeJsonString(char, next);
            }
        }
        // on second entry, char is the third " in an opening """
        if (this.cqCount === 1) {
            if (next === '\n') {
                this.cqCount = 2;
            }
            else {
                // error
            }
            return true;
        }
        // on third entry, char is the newline immediately after the opening """
        if (this.cqCount === 2) {
            const line = this.document.substring(this.lineStartPos, this.pos);
            this.mlStartIndent = line.substring(0, line.length - line.trimStart().length);
            if (this.mlStartIndent.length > 0) {
                const ic = this.mlStartIndent[0];
                if (ic === ' ') {
                    if (this.mlStartIndent.match(/[^ ]/) != null) {
                        // error
                    }
                    this.mlIndent = this.mlStartIndent + '    ';
                }
                else if (ic === '\t') {
                    if (this.mlStartIndent.match(/[^\t]/) != null) {
                        // error
                    }
                    this.mlIndent = this.mlStartIndent + '\t';
                }
                else {
                    // error
                }
            }
            else {
                if (next === ' ') {
                    this.mlIndent = '    ';
                }
                else if (next === '\t') {
                    this.mlIndent = '\t';
                }
                else {
                    this.mlIndent = '\t';
                }
            }
            this.indentCharCount = 0;
            this.cqCount = 0;
            this.mlStringLines.length = 0;
            this.popStack();
            this.pushStack(this.consumeMultilineString);
        }
        return true;
    }
    private mlStartIndent: string | null = null;
    private mlIndent: string | null = null;
    private indentCharCount = 0;
    private mlStringLines: string[] = [];
    private consumeMultilineString(char: string, next: string) {
        // on first entry, char is the first character on the line after the opening """
        if (this.indentCharCount < this.mlIndent!.length) {
            if (char === this.mlIndent![0]) {
                ++this.indentCharCount;
                return true;
            }
            if (char === '\n') {
                this.mlStringLines.push('');
                this.indentCharCount = 0;
                return true;
            }
            if (char === this.quoteChar && next === this.quoteChar) {
                this.cqCount = 0;
                this.popStack();
                this.pushStack(this.consumeMultilineEndQuotes);
                return true;
            }
        }
        else if (char === '\n') {
            const line = this.document.substring(this.lineStartPos + this.mlIndent!.length, this.pos);
            // process escape sequence at end
            this.mlStringLines.push(line);
            this.indentCharCount = 0;
            return true;
        }
        return true;
    }
    private consumeMultilineEndQuotes(char: string, next: string) {
        // on first entry, char is the second character in the closing """
        if (this.cqCount === 0) {
            if (next === this.quoteChar) {
                ++this.cqCount;
                return true;
            }
            else {
                // error
            }
        }
        // on second entry, char is the last character in the closing """
        this.popStack();
        this.completeValue(new XtnMStringImpl(this.mlStringLines.join('\n'), this.mlIndent![0], {}, {}));
        this.mlStringLines.length = 0;
        return true;
    }
    private escape = false;
    private consumeJsonString(char: string, next: string) {
        // on first entry, char is the first character after the opening "
        if (this.escape) {
            this.escape = false;
        }
        else if (char === '\\') {
            this.escape = true;
        }
        else if (char === this.quoteChar) {
            const jStr = this.document.substring(this.jsonStrStartPos, this.pos + 1);
            const qStr = new XtnQStringImpl(parseJson5String(jStr), {}, {});
            this.popStack();
            const parent = this.getCurrentParent();
            if (parent instanceof XtnKeyValuePairImpl) {
                this.completeValue(qStr);
            }
            else {
                this.rawText = qStr;
            }
        }
        return true;
    }

    private startObject() {
        this.pushStack(this.consumeObject);
        this.parentsStack.push(new XtnObjectImpl({}, {}));
    }
    private consumeObject(char: string, next: string) {
        return this.consumeInner(char, next, true);
    }
    private consumePairValue(char: string, next: string) {
        return this.consumeInner(char, next, false);
    }
    private consumeInner(char: string, next: string, allowKeys: boolean) {
        if (char.trimStart().length === 0) {
            return true;
        }
        if (allowKeys && char === ":") {
            if (!this.rawText) {
                //error
                this.rawText = new XtnKeyImpl("", false, {}, {});
            }
            const keyValuePair = new XtnKeyValuePairImpl(this.rawText instanceof XtnQStringImpl ? new XtnKeyImpl(this.rawText.value, true, this.rawText.posStart, this.rawText.posEnd) : this.rawText);
            this.parentsStack.push(keyValuePair);
            this.rawText = null;
            this.pushStack(this.consumePairValue);
            return true;
        }
        if (this.rawText instanceof XtnQStringImpl) {
            this.completeValue(this.rawText);
            this.rawText = null;
        }
        else if (this.rawText instanceof XtnKeyImpl) {
            this.interpretAndCompleteValue(this.rawText);
            this.rawText = null;
        }
        if (char === '/' && next === '/') {
            this.startComment();
        }
        else if (char === '!') {
            this.disableNext = true;
        }
        else if (char === '"' || char === "'") {
            this.startQuote(char, next);
        }
        else if (char === '{') {
            this.startObject();
        }
        else if (char === '[') {
            this.startArray();
        }
        else if (char === "`") {
            this.startSingleLineStringValue(char, next);
        }
        else if (char === '%') {
            this.startExplicitInteger(char, next);
        }
        else if (char === '~') {
            this.startExplicitRealNumber(char, next);
        }
        else if (char === '@') {
            this.startDateTime();
        }
        else if (char === '?') {
            this.startExplicitBoolean(next);
        }
        else if (char === '}') {
            this.popStack();
            const obj = this.parentsStack.pop();
            if (obj instanceof XtnObjectImpl) {
                this.completeValue(obj);
            }
        }
        else if (char === ']') {
            this.popStack();
            const arr = this.parentsStack.pop();
            if (arr instanceof XtnArrayImpl) {
                this.completeValue(arr);
            }
        }
        else if (char === ')') {

        }
        else if (isStartOfNumber(char, next)) {
            this.startImplicitNumber(char, next);
        }
        else if (isKeyStartLetter(char)) {
            this.startUnquotedText(char, next);
        }
        return true;
    }

    private startArray() {
        this.pushStack(this.consumeArray);
        this.parentsStack.push(new XtnArrayImpl({}, {}));
    }
    private consumeArray(char: string, next: string) {
        return this.consumeInner(char, next, false);
    }

    private numberStartPos = -1;
    private decPtStartPos = -1;
    private expStartPos = -1;
    private intValue = 1n;
    private numberType: "i" | "r" | null = null;
    private startExplicitInteger(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = this.pos;
        this.numberType = "i";
        this.pushStack(this.consumeLeadingNumberWhitespace);
        this.consumeLeadingNumberWhitespace(char, next);
    }
    private consumeLeadingNumberWhitespace(char: string, next: string) {
        // on first entry, char is the character before the integer
        if (next.trimStart().length === 0) {
            return true;
        }
        if (next === '-' || next === '+' || isAsciiNumber(next)) {
            this.popStack();
            this.pushStack(this.consumePotentialLeadingSign);
        }
        else if (next === 'n' || next === 'N') {
            this.popStack();
            this.pushStack(this.consumeNamedNumberOrNull);
        }
        return true;
    }
    private consumeNamedNumberOrNull(char: string, next: string) {
        // on first entry, char is n in null
        if (!isAsciiLetter(next)) {
            this.popStack();
            const text = this.document.substring(this.numberStartPos + 1, this.pos + 1).trimStart();
            const tu = text.toUpperCase();
            let numb;
            if (this.numberType === "i") {
                if (tu !== "NULL") {
                    // error
                }
                numb = new XtnIntegerImpl(null, text, true, undefined, {}, {});
            }
            else {
                let v;
                switch (tu) {
                    case "NULL":
                        v = null;
                        break;
                    case "NAN":
                    case "+NAN":
                    case "-NAN":
                        v = Number.NaN;
                        break;
                    case "+INFINITY":
                    case "INFINITY":
                        v = Number.POSITIVE_INFINITY;
                        break;
                    case "-INFINITY":
                        v = Number.NEGATIVE_INFINITY;
                        break;
                    default:
                        v = null;
                        // error
                        break;
                }
                numb = new XtnRealNumberImpl(v, text, true, undefined, {}, {});
            }
            this.completeValue(numb);
        }
        return true;
    }
    private consumePotentialLeadingSign(char: string, next: string) {
        // on first entry, char is a minus or plus sign or the first digit
        this.popStack();
        this.decPtStartPos = -1;
        this.expStartPos = -1;
        this.pushStack(this.consumeStartingNumberDigits);
        const neg = char === '-';
        if (neg || char === '+') {
            this.intValue = neg ? -1n : 1n;
            if (this.numberType === "i") {
                if (!isAsciiNumber(next)) {
                    // error
                }
            }
            else {
                if ('nNiI'.indexOf(next) >= 0) {
                    this.popStack();
                    this.pushStack(this.consumeNamedNumberOrNull);
                    return true;
                }
                if (!(next === '.' || isAsciiNumber(next))) {
                    // error
                }
            }
        }
        else {
            this.consumeStartingNumberDigits(char, next);
        }
        return true;
    }
    private consumeStartingNumberDigits(char: string, next: string) {
        // on first entry, char is the first digit of the number or the 0 in 0x
        this.popStack();
        if (this.numberType !== "r" && (char === '0' && next === 'x' || next === 'X')) {
            this.pushStack(this.consumeHexStart);
        }
        else if (this.numberType !== "i" && char === '.') {
            this.decPtStartPos = this.pos;
            if (next === 'e' || next === 'E') {
                this.expStartPos = this.pos;
            }
            else if (!isAsciiNumber(next)) {
                //error
            }
            this.pushStack(this.consumeNumber);
            this.isLeadingZero = false;
        }
        else {
            let d = decDigit(char);
            if (d !== 0n)
                this.intValue *= d!;
            this.isLeadingZero = char === '0';
            this.pushStack(this.consumeNumber);
            this.consumeNumber(char, next);
        }
        return true;
    }
    private consumeHexStart(char: string, next: string) {
        // on first entry, char is the x in 0x
        const h = hexDigit(next);
        if (h === null) {
            // error
            return true;
        }
        this.popStack();
        if (next !== '0') {
            this.isLeadingZero = false;
            this.intValue *= h;
        }
        else {
            this.isLeadingZero = true;
        }
        this.pushStack(this.consumeHex);
        return true;
    }
    private isLeadingZero = false;
    private consumeHex(char: string, next: string) {
        // on first entry, char is the first hex digit but it has already been considered
        if (this.isLeadingZero) {
            if (next === '0')
                return true;
        }
        const h = hexDigit(next);
        if (h === null) {
            this.popStack();
            const text = this.document.substring(this.numberStartPos + (this.numberType === "i" ? 1 : 0), this.pos + 1).trimStart();
            if (this.isLeadingZero)
                this.intValue = 0n;
            this.completeValue(new XtnIntegerImpl(this.intValue, text, true, undefined, {}, {}));
            return true;
        }
        if (this.isLeadingZero)
            this.intValue *= h;
        else
            this.intValue = this.intValue * 16n + (this.intValue > 0 ? 1n : -1n) * h;
        this.isLeadingZero = false;
        return true;
    }
    
    private consumeNumber(char: string, next: string) {
        // on first entry, the following cases are possible
        // 1) char is the first digit of an integer that has already been considered or the first digit of the integer part of a real number
        // 2) char is the first character after the decimal point of a number that has no integer part (this can be e / E or a decimal digit for the fractional part)
        if (this.isLeadingZero) {
            if (next === '0')
                return true;
        }
        const d = decDigit(next);
        if (d === null) {
            if (this.numberType !== "i") {
                if (this.expStartPos < 0) {
                    if (next === 'e' || next === 'E') {
                        this.expStartPos = this.pos + 1;
                        if (this.decPtStartPos < 0)
                            this.decPtStartPos = this.expStartPos;
                        return true;
                    }
                    else if (this.decPtStartPos < 0 && next === '.') {
                        this.decPtStartPos = this.pos + 1;
                        return true;
                    }
                }
                else {
                    if (this.expStartPos === this.pos && (next === '-' || next === '+')) {
                        return true;
                    }
                }
            }
            this.popStack();
            const text = this.document.substring(this.numberStartPos + (this.numberType !== null ? 1 : 0), this.pos + 1).trimStart();
            if (this.isLeadingZero)
                this.intValue = 0n;
            if (this.numberType !== "r" && this.decPtStartPos < 0 && this.expStartPos < 0)
                this.completeValue(new XtnIntegerImpl(this.intValue, text, true, undefined, {}, {}));
            else
                this.completeValue(new XtnRealNumberImpl(Number(text), text, true, undefined, {}, {}));
            return true;
        }
        if (this.isLeadingZero)
            this.intValue *= d;
        else if (this.decPtStartPos < 0)
            this.intValue = this.intValue * 10n + (this.intValue > 0 ? 1n : -1n) * d;
        this.isLeadingZero = false;
        return true;
    }

    private startExplicitRealNumber(char: string, next: string) {
        this.numberStartPos = this.pos;
        this.numberType = "r";
        this.pushStack(this.consumeLeadingRealNumberWhitespace);
        this.consumeLeadingRealNumberWhitespace(char, next);
    }
    private consumeLeadingRealNumberWhitespace(char: string, next: string) {
        // on first entry, char is the character before the number
        if (next.trimStart().length === 0) {
            return true;
        }
        if (next === '-' || next === '+' || next === '.' || isAsciiNumber(next)) {
            this.popStack();
            this.pushStack(this.consumePotentialLeadingSign);
        }
        else if ('nNiI'.indexOf(next) >= 0) {
            this.popStack();
            this.pushStack(this.consumeNamedNumberOrNull);
        }
        return true;
    }
    private startImplicitNumber(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = this.pos;
        this.numberType = null;
        this.pushStack(this.consumePotentialLeadingSign);
        this.consumePotentialLeadingSign(char, next);
    }

    private startDateTime() {

    }

    private booleanStartPos = -1;
    private startExplicitBoolean(next: string) {
        if (next.trimStart().length === 0)
            this.pushStack(this.consumeLeadingBooleanWhitespace);
        else if (isAsciiLetter(next))
            this.pushStack(this.consumeBoolean);
        else {
            // error
        }
        this.booleanStartPos = this.pos;
    }
    private consumeLeadingBooleanWhitespace(char: string, next: string) {
        // on first entry, char is the first whitespace character after ?
        if (isAsciiLetter(next)) {
            this.popStack();
            this.pushStack(this.consumeBoolean);
        }
        else if (next.trimStart().length !== 0) {
            // error
        }
        return true;
    }
    private consumeBoolean(char: string, next: string) {
        // on first entry, char is the first text character in the boolean
        if (!isAsciiLetter(next)) {
            this.popStack();
            const text = this.document.substring(this.booleanStartPos + 1, this.pos + 1).trimStart();
            const tu = text.toUpperCase();
            if (tu === "TRUE")
                this.completeValue(new XtnBooleanImpl(true, text, true, undefined, {}, {}));
            else if (tu === "FALSE")
                this.completeValue(new XtnBooleanImpl(false, text, true, undefined, {}, {}));
            else if (tu === "NULL")
                this.completeValue(new XtnBooleanImpl(null, text, true, undefined, {}, {}));
            else {
                // error
            }
        }
        return true;
    }


    private startSingleLineStringValue(char: string, next: string) {
        this.pushStack(this.consumeSingleLineStringValue);
        this.singleLineStringStartPos = this.pos;
        this.consumeSingleLineStringValue(char, next);
    }
    private singleLineStringStartPos = -1;
    private consumeSingleLineStringValue(char: string, next: string) {
        // on first entry, char is the opening `
        if (next === '\n') {
            this.popStack();
            const str = this.document.substring(this.singleLineStringStartPos + 1, this.pos + 1).trim().replace(/\s/g, ' ');
            const sStr = new XtnSStringImpl(str, undefined, {}, {});
            this.completeValue(sStr);
        }
        return true;
    }

    private unquotedTextStartPos = -1;
    private startUnquotedText(char: string, next: string) {
        this.unquotedTextStartPos = this.pos;
        this.pushStack(this.consumeUnquotedText);
        this.consumeUnquotedText(char, next);
    }
    private consumeUnquotedText(char: string, next: string) {
        // on first entry, char is the first character of the unquoted text
        if (isKeyLetter(next))
            return true;
        if (next !== '\n' && next.trimStart().length === 0) {
            return true;
        }
        this.popStack();
        const str = this.document.substring(this.unquotedTextStartPos, this.pos + 1).trimEnd().replace(/\s/g, ' ');
        const k = new XtnKeyImpl(str, false, {}, {});
        const parent = this.getCurrentParent();
        if (parent instanceof XtnKeyValuePairImpl) {
            this.interpretAndCompleteValue(k);
        }
        else {
            this.rawText = k;
        }
        return true;
    }
    private consumeTagName(char: string, next: string) {
        // on first entry, the tag has already started from unquotedTextStartPos, and char is the first character where it is clear that the text must be a tag name.
        return true;
    }
}

export function parseXtn(document: string): XtnObject {
    const p = new Parser(document);
    return p.parse();
}

function isStringValueSingleLine(value: string) {
    const trimmed = value.trim();
    if (trimmed.length !== value.length) return false;
    if (value.match(/[\s--[ ]]/v) !== null) return false;
    return true;
}

function increaseIndent(indent: string) {
    return indent + (indent && indent[0] === '\t' ? '\t' : '    ');
}

function writeStringValue(value: string, strs: string[], indent: string, afterKey: boolean) {
    if (isStringValueSingleLine(value)) {
        strs.push("` ");
        strs.push(value);
    }
    else if (value.match(/\r/)) {
        if (afterKey) strs.push(' ');
        strs.push(JSON.stringify(value));
    }
    else {
        if (afterKey) strs.push(' ');
        strs.push('"""\n');
        const innerIndent = increaseIndent(indent);
        for (const line of value.split('\n')) {
            strs.push(innerIndent);
            strs.push(line);
            strs.push('\n');
        }
        strs.push(indent);
        strs.push('"""');
    }
}

function writeValue(element: XtnValue, strs: string[], indent: string, afterKey: boolean): void {
    switch (element.type) {
        case "sstring":
        case "qstring":
        case "mstring":
            writeStringValue(element.value, strs, indent, afterKey);
            return;
        case "integer":
            strs.push('% ');
            strs.push(element.valueString);
            return;
        case "real":
            strs.push('~ ');
            strs.push(element.valueString);
            return;
        case "boolean":
            strs.push('? ');
            strs.push(element.value ? 'true' : 'false');
            return;
        case "reference":
            strs.push('^ ');
            strs.push(element.value);
            return;
        case "null":
            if (afterKey) strs.push(' ');
            strs.push('null');
            return;
        case "array":
            if (afterKey) strs.push(' ');
            strs.push('[\n');
            writeInner(element, strs, increaseIndent(indent));
            strs.push(indent);
            strs.push(']');
            return;
        case "object":
            if (afterKey) strs.push(' ');
            strs.push('{\n');
            writeInner(element, strs, increaseIndent(indent));
            strs.push(indent);
            strs.push('}');
            return;
        case "constructor":
            if (afterKey) strs.push(' ');
            strs.push(element.tag.name);
            if (element.args.items.length) {
                strs.push('(\n');
                writeInner(element.args, strs, increaseIndent(indent));
                if (element.initializer)
                    strs.push(') {\n');
                else
                    strs.push(');');
            }
            else {
                strs.push(' {\n');
            }
            if (element.initializer) {
                writeInner(element.initializer, strs, increaseIndent(indent));
                strs.push(indent);
                strs.push('}');
            }
            return;
    }
    // This should be unreachable if all types have been handled above
    // If not, type of element will not be never and TypeScript will complain
    return element;
}

function keyNeedsQuote(key: string) {
    if (!key) return true; // empty key must be quoted
    if ('0123456789'.indexOf(key[0]) >= 0)
        return true;
    return key.match(/[^a-zA-Z\-0-9_]/) !== null;
}
function writeKey(k: XtnKey, strs: string[]) {
    if (keyNeedsQuote(k.name)) {
        strs.push(JSON.stringify(k.name));
    }
    else {
        strs.push(k.name);
    }
}

function writeInner(element: XtnArgs | XtnObject | XtnArray, strs: string[], indent: string) {
    for (const item of element.items) {
        if (item.type === "keyvaluepair") {
            strs.push(indent);
            writeKey(item.key, strs);
            strs.push(' :');
            writeValue(item.value, strs, indent, true);
            strs.push('\n');
        }
        else {
            writeValue(item, strs, indent, false);
            strs.push('\n');
        }
    }
}

export function writeXtn(root: XtnObject) {
    const strs: string[] = [];
    writeInner(root, strs, "");
    return strs.join('');
}