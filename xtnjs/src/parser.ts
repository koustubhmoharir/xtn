type ParserCharConsumer = (c: string, n: string) => void;

export enum XtnParseErrorCode {
    UnexpectedSlash = 1,
    UnexpectedEndOfFile = 2,
    InvalidEscapeSequence = 3,
    UnescapedLF = 4,
    UnescapedCR = 5,
    UnescapedCRLF = 6,
    UnrecognizedToken = 7,
    MissingKey = 8,
    UnexpectedTextOnStartTripleQuotes = 9,
    BadIndentation = 10,
}

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
    readonly childMarkerPosition?: XtnCharPosition;
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
    readonly type: "mstring";
    readonly explicit: true;
    readonly indent: string;
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

export interface XtnErrorToken extends XtnPrimitive<string> {
    readonly type: "errortoken";
    readonly explicit: false;
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

export interface XtnTagNameSegment extends XtnElement {
    readonly type: "tagseg";
    readonly name: string;
    readonly args: readonly XtnTagName[] | null;
}

export interface XtnTagName extends XtnElement {
    readonly type: "tagname";
    readonly name: string;
    readonly segments: readonly XtnTagNameSegment[];
}

export interface XtnConstructor extends XtnElement {
    readonly type: "constructor";
    readonly tag: XtnTagName;
    readonly args: XtnArgs | null;
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
    construct?: (tag: XtnTagName, args: XtnDataValue[] | null, opts: Record<string, XtnDataValue> | null) => XtnDataValue;
}

export interface XtnObject extends XtnValueOrPairList {
    readonly type: "object";
    data(env?: XtnEnvironment): XtnDataObject;
}

export type XtnValue = XtnSString | XtnQString | XtnMString | XtnInteger | XtnRealNumber | XtnBoolean | XtnReference | XtnNull | XtnErrorToken | XtnArray | XtnConstructor | XtnObject;

export type XtnValueImpl = XtnSStringImpl | XtnQStringImpl | XtnMStringImpl | XtnIntegerImpl | XtnRealNumberImpl | XtnBooleanImpl | XtnReferenceImpl | XtnNullImpl | XtnErrorTokenImpl | XtnArrayImpl | XtnConstructorImpl | XtnObjectImpl;


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
    childMarkerPosition?: XtnCharPosition = undefined;
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
    childMarkerPosition?: XtnCharPosition = undefined;

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
    childMarkerPosition?: XtnCharPosition = undefined;

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
    childMarkerPosition?: XtnCharPosition = undefined;

    constructor(
        public readonly value: string,
        public readonly indent: string,
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
    childMarkerPosition?: XtnCharPosition = undefined;

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
    childMarkerPosition?: XtnCharPosition = undefined;

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

class XtnErrorTokenImpl extends XtnElementImpl implements XtnErrorToken {
    get type() { return "errortoken" as const; }
    get valueString() { return this.value; }
    get explicit() { return false as const; }
    get posFirstOffset() { return 0; }
    childMarkerPosition?: XtnCharPosition = undefined;

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

class XtnArrayImpl extends XtnElementImpl implements XtnArray {
    get type() { return "array" as const; }
    readonly items: XtnValueImpl[] = [];
    childMarkerPosition?: XtnCharPosition = undefined;

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

class XtnTagNameSegmentImpl extends XtnElementImpl implements XtnTagNameSegment {
    readonly args: XtnTagNameImpl[] = [];
    get type() { return "tagseg" as const; }

    constructor(
        readonly name: string,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }
    get fullName() {
        if (this.args.length === 0)
            return this.name;
        return this.name + '<' + this.args.map(a => {
            a.complete();
            return a.name;
        }).join(",") + '>';
    }
}

class XtnTagNameImpl extends XtnElementImpl implements XtnTagName {
    readonly segments: XtnTagNameSegmentImpl[] = [];
    get type() { return "tagname" as const; }
    name: string = "";

    constructor(
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    complete() {
        this.name = this.segments.map(s => s.fullName).join(".");
    }
}

class XtnConstructorImpl extends XtnElementImpl implements XtnConstructor {
    get type() { return "constructor" as const; }
    childMarkerPosition?: XtnCharPosition = undefined;
    args: XtnArgsImpl | null = null;
    initializer: XtnObjectImpl | null = null;

    constructor(
        public readonly tag: XtnTagNameImpl,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    _data(env: XtnEnvironment | undefined): XtnDataValue {
        if (!env?.construct) {
            throw new Error("An env with a construct method must be provided");
        }
        const args = this.args?.items.filter(a => a.type !== "keyvaluepair").map(a => a._data(env)) || null;
        const opts = this.args?.items.filter(a => a.type === "keyvaluepair").map(a => [a.key.name, a.value._data(env)]) || null;
        const obj = env.construct(this.tag, args, opts ? Object.fromEntries(opts) : null);
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
    childMarkerPosition?: XtnCharPosition = undefined;

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

function parseJson5String(str: string, start: XtnCharPosition, errors: XtnParseError[]) {
    const cps = [];
    let escape = 0;
    let escdCR = false;
    let cr = false;
    let hex = 0n;
    let hexEsc = '';
    let curLineNo = start.line!;
    let curColNo = start.column! + 1;
    let curIndex = start.index! + 1;
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
                        curLineNo++;
                        curColNo = -1;
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
                        hexEsc = '\\x';
                        escape = -1;
                        break;
                    case 'u':
                        hex = 0n;
                        hexEsc = '\\u';
                        escape = -3;
                        break;
                    default:
                        if (isAsciiNumber(c)) {
                            errors.push({ code: XtnParseErrorCode.InvalidEscapeSequence, start: { line: curLineNo, column: curColNo, index: curIndex }, end: undefined, message: "Backslash '\\' followed by a digit is not a valid escape sequence" });
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
                    errors.push({ code: XtnParseErrorCode.InvalidEscapeSequence, start: { line: curLineNo, column: curColNo, index: curIndex }, end: undefined, message: `Backslash ${hexEsc} must be followed by ${hexEsc[1] === 'x' ? '2' : '4'} digits` });
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
                if (cr) {
                    cr = false;
                    errors.push({ code: XtnParseErrorCode.UnescapedCRLF, start: { line: curLineNo, column: curColNo - 1, index: curIndex - 1 }, end: undefined, message: "A carriage return + line feed character sequence cannot appear without being preceded by a '\\'. Use '\\r\\n' or '\\n' to insert the desired line ending character sequence or place a '\\' just before the end of the line to continue the string on the next line ignoring the line feed." });
                }
                else {
                    errors.push({ code: XtnParseErrorCode.UnescapedLF, start: { line: curLineNo, column: curColNo, index: curIndex }, end: undefined, message: "A line feed (new line) character cannot appear without being preceded by a '\\'. Use '\\n' to insert a line feed character or place a '\\' just before the end of the line to continue the string on the next line ignoring the line feed." });
                }
            }
            curLineNo++;
            curColNo = -1;
            curIndex++;
        }
        else {
            if (cr) {
                errors.push({ code: XtnParseErrorCode.UnescapedCR, start: { line: curLineNo, column: curColNo - 1, index: curIndex - 1 }, end: undefined, message: "A carriage return character cannot appear without being preceded by a '\\'. Use '\\r' to insert a carriage return. Or place a '\\' just before the end of the line to continue the string on the next line ignoring the carriage return." });
                curLineNo++;
                curColNo = -1;
                cr = false;
            }
            escdCR = false;
            if (c === '\\') {
                escape = 1;
            }
            else if (c == '\r') {
                cr = true;
            }
            else {
                cps.push(c);
            }
        }
        curColNo += c.length;
        curIndex += c.length;
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

function isUnquotedTextStartLetter(char: string) {
    const cn = char.codePointAt(0)!;
    //a-z or A-Z or - or + or _
    return (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 43 || cn === 95;
}
function isKeyLetter(char: string) {
    const cn = char.codePointAt(0)!;
    // 0-9 or a-z or A-Z or - or _
    return (cn >= 48 && cn <= 57) || (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95;
}

class Parser {
    constructor(readonly document: string) {
        this._scopeStates = [this._scopeState = { scope: this.rootObj, state: { childMarkerPosition: undefined } }];
        this._consumers.push(this.consumeObject);
        this._consumer = this.consumeObject;
    }
    errors: XtnParseError[] = [];
    succeeded = false;
    tabWidth = 4;

    _consumers: ParserCharConsumer[] = [];
    _consumer: ParserCharConsumer;
    get consumer() { return this._consumer; }
    pushConsumer(consumer: ParserCharConsumer) {
        this._consumers.push(consumer);
        this._consumer = consumer;
    }
    popConsumer() {
        const stack = this._consumers;
        stack.pop();
        this._consumer = stack[stack.length - 1];
    }

    lineNo = 0;
    lineStartPos = 0;
    colNo = -1;
    pos = -1;
    private logFragmentExcl(header: string, startPos: number) {
        //console.log(`Read ${header} ${this.lineNo}, ${startPos - this.lineStartPos}:${this.pos - this.lineStartPos} :${this.document.substring(startPos, this.pos)}`);
    }

    readonly rootObj = new XtnObjectImpl({}, {});
    private _scopeState: {
        scope: XtnArrayImpl | XtnValueOrPairListImpl | XtnKeyValuePairImpl | XtnConstructorImpl | XtnTagNameImpl | XtnTagNameSegmentImpl;
        state: {
            childMarkerPosition: XtnCharPosition | undefined;
        }
    };
    private get currentScope() { return this._scopeState.scope; }
    private get currentScopeState() { return this._scopeState.state; }
    private _scopeStates: (Parser["_scopeState"])[];
    private pushScope(scope: XtnArrayImpl | XtnValueOrPairListImpl | XtnKeyValuePairImpl | XtnConstructorImpl | XtnTagNameImpl | XtnTagNameSegmentImpl) {
        this._scopeStates.push(this._scopeState = { scope, state: {childMarkerPosition: undefined} });
    }
    private popScope() {
        const ss = this._scopeStates;
        const scopeState = ss.pop();
        this._scopeState = ss[ss.length - 1];
        return scopeState!.scope;
    }

    private interpretAndCompleteValue(value: XtnKeyImpl) {
        const text = value.name;
        const upper = text.toUpperCase();
        let lit;
        switch (upper) {
            case 'TRUE':
                lit = new XtnBooleanImpl(true, text, false, undefined, value.posStart, value.posEnd);
                break;
            case 'FALSE':
                lit = new XtnBooleanImpl(false, text, false, undefined, value.posStart, value.posEnd);
                break;
            case 'NULL':
                lit = new XtnNullImpl(text, value.posStart, value.posEnd);
                break;
            case 'INFINITY':
            case '+INFINITY':
                lit = new XtnRealNumberImpl(Number.POSITIVE_INFINITY, text, false, undefined, value.posStart, value.posEnd);
                break;
            case '-INFINITY':
                lit = new XtnRealNumberImpl(Number.NEGATIVE_INFINITY, text, false, undefined, value.posStart, value.posEnd);
                break;
            case 'NAN':
            case '+NAN':
                lit = new XtnRealNumberImpl(Number.NaN, text, false, undefined, value.posStart, value.posEnd);
                break;
            case '-NAN':
                lit = new XtnRealNumberImpl(-Number.NaN, text, false, undefined, value.posStart, value.posEnd);
                break;
            default:
                lit = new XtnErrorTokenImpl(text, value.posStart, value.posEnd)
                this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: value.posStart!, end: value.posEnd, message: `The token ${text} is not recognized` });
        }
        this.completeValue(lit);
    }
    private completeValue(value: XtnValueImpl) {
        const scope = this.currentScope;
        const cmp = this.currentScopeState.childMarkerPosition;
        if (scope instanceof XtnKeyValuePairImpl) {
            this.popConsumer();
            this.popScope();
            scope.value = value;
            if (cmp)
                value.childMarkerPosition = cmp;
            const parentScope = this.currentScope;
            if (parentScope instanceof XtnValueOrPairListImpl) {
                parentScope.items.push(scope);
                this.currentScopeState.childMarkerPosition = undefined;
            }
            else {
                // error
            }
        }
        else if ("items" in scope) {
            scope.items.push(value);
            this.currentScopeState.childMarkerPosition = undefined;
        }
        else {
            // error
        }
    }
    private eof = false;
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
        const lastLineNo = this.lineNo;
        const lastColNo = this.colNo + char.length;
        const lastPos = this.pos + char.length;
        this.eof = true;
        this.processChar(char, '\n');
        if (this._consumers.length > 1) {
            if (this.consumer === this.consumeBlockComment) {
                this.errors.push({ code: XtnParseErrorCode.UnexpectedEndOfFile, start: { line: lastLineNo, column: lastColNo, index: lastPos }, end: undefined, message: "Unexpected end of file. Comment has not been closed with '*/'" });
            }
        }
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
                this.consumer('\n', next === '\r' ? '\n' : next);
                this.lineNo++;
                this.colNo = -1;
                this.lineStartPos = this.pos + 1;
                return true;
            }
        }
        if (char === '\n') {
            this.consumer(char, next === '\r' ? '\n' : next);
            if (this.crlf) {
                this.pos++;
                this.crlf = false;
            }
            this.lineNo++;
            this.colNo = -1;
            this.lineStartPos = this.pos + 1;
            return true;
        }
        this.consumer(char, next === '\r' ? '\n' : next);
        return true;
    }

    private ignoreCount = 0;
    private disableNext = false;

    commentStartPos = -1;
    private startComment(uptoEndOfLine: boolean) {
        this.commentStartPos = this.pos;
        if (uptoEndOfLine)
            this.pushConsumer(this.consumeEndOfLineComment);
        else
            this.pushConsumer(this.consumeBlockCommentStart);
    }
    private consumeEndOfLineComment(char: string, next: string) {
        // on first entry, char is the second character of //
        if (char === '\n') {
            this.logFragmentExcl("comment", this.commentStartPos);
            this.popConsumer();
        }
    }
    private blockCommentStart = -1;
    private consumeBlockCommentStart(char: string, next: string) {
        // on first entry, char is the second character of /*
        this.blockCommentStart = this.pos - 1;
        this.popConsumer();
        this.pushConsumer(this.consumeBlockComment);
    }
    private consumeBlockComment(char: string, next: string) {
        // on first entry, char is the first character after /*
        if (char === '*' && next == '/') {
            this.popConsumer();
            this.pushConsumer(this.consumeBlockCommentEnd);
        }
    }
    private consumeBlockCommentEnd(char: string, next: string) {
        // on first entry, char is the last character of */
        this.popConsumer();
    }

    private rawText: XtnKeyImpl | XtnQStringImpl | null = null;

    jsonStrStartPos = -1;
    jsonStrStartLine = -1;
    jsonStrStartCol = -1;
    quoteStartPos = -1;
    quoteChar: string | null = null;
    private startQuote(char: string, next: string) {
        // char is the starting " or '
        this.quoteChar = char;
        this.quoteStartPos = this.pos;
        if (next === this.quoteChar) {
            this.cqCount = 0;
            this.pushConsumer(this.consumeQuoted);
        }
        else {
            this.jsonStrStartPos = this.pos;
            this.jsonStrStartLine = this.lineNo;
            this.jsonStrStartCol = this.colNo;
            this.pushConsumer(this.consumeJsonString);
        }
    }
    private cqCount = 0;
    private consumeQuoted(char: string, next: string) {
        // on first entry, char is a " immediately after the opening " and cqCount is 0
        if (this.cqCount === 0) {
            if (next === this.quoteChar) {
                this.cqCount = 1;
                return;
            }
            else {
                this.jsonStrStartPos = this.pos - 1;
                this.consumeJsonString(char, next);
                return;
            }
        }
        // on second entry, char is the third " in an opening """
        if (this.cqCount === 1) {
            this.mlStringLines.length = 0;
            this.cqCount = 2;
            this.mlSep = null;
            if (next === '\\' || next.trimStart().length === 0) {
                this.popConsumer();
                this.unexpTextOnTripleQuotesLineStart = -1;
                this.pushConsumer(this.consumeStartTripleQuote);
            }
            else {
                // will report error at end of line
                this.unexpTextOnTripleQuotesLineStart = this.pos + 1;
                this.popConsumer();
                this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
            }
            return;
        }
    }
    private unexpTextOnTripleQuotesLineStart = -1;
    private consumeRestOfLineAfterStartTripleQuotes(char: string, next: string) {
        if (next === '\n') {
            this.errors.push({ code: XtnParseErrorCode.UnexpectedTextOnStartTripleQuotes, start: { line: this.lineNo, column: this.colNo - (this.pos - this.unexpTextOnTripleQuotesLineStart), index: this.unexpTextOnTripleQuotesLineStart }, end: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, message: "Triple quoted text must start on the next line after the triple quotes. Only a '\\r' is allowed on this line." });
            this.mlStringLines.push(this.document.substring(this.unexpTextOnTripleQuotesLineStart, this.pos + 1));
            this.cqCount = 3;
            this.popConsumer();
            this.pushConsumer(this.consumeStartTripleQuote);
        }
    }
    private mlSep: string | null = null;
    private consumeStartTripleQuote(char: string, next: string) {
        // on first entry, char is whitespace or newline or \ after opening """ and mlSep is null
        if (this.mlSep === null) {
            if (char === '\\') {
                if (next === 'r') {
                    this.mlSep = '\r\n';
                    this.unexpTextOnTripleQuotesLineStart = this.pos + 2;
                    return;
                }
                else {
                    // will report error at end of line
                    this.unexpTextOnTripleQuotesLineStart = this.quoteStartPos + 3;
                    this.popConsumer();
                    this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
                    this.consumeRestOfLineAfterStartTripleQuotes(char, next);
                }
            }
            else if (char === '\n') {
                this.mlSep = '\n';
                this.cqCount = 3;
            }
            else if (next === '\\' || next.trimStart().length === 0) {
                return;
            }
            else {
                // will report error at end of line
                this.unexpTextOnTripleQuotesLineStart = this.quoteStartPos + 3;
                this.popConsumer();
                this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
                this.consumeRestOfLineAfterStartTripleQuotes(char, next);
                return;
            }
        }
        else if (this.cqCount === 2) {
            // on first entry, char is r in the \r on the line containing opening """
            if (next === '\n') {
                this.cqCount = 3;
                return;
            }
            else if (next.trimStart().length === 0) {
                return;
            }
            else {
                // will report error at end of line
                if (this.unexpTextOnTripleQuotesLineStart < 0)
                    this.unexpTextOnTripleQuotesLineStart = this.quoteStartPos + 3;
                this.popConsumer();
                this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
                return;
            }
        }
        if (this.cqCount === 3) {
            this.curIndentWidth = 0;
            this.cqCount = 0;
            this.allowLeadingEscapeML = true;
            this.popConsumer();
            this.pushConsumer(this.consumeStartingIndentMLString);
        }
    }
    allowLeadingEscapeML = false;
    private consumeStartingIndentMLString(char: string, next: string) {
        // on first entry, char is the first character of the line after the line containing the starting """
        if (char.trimStart().length === 0)
            return;
        this.mlIndent = this.document.substring(this.lineStartPos, this.pos);
        this.mlIndentWidth = 0;
        this.curIndentCount = 0;
        this.prevIndentError = null;
        for (const ch of this.mlIndent) {
            this.mlIndentWidth += (ch === '\t' ? (this.tabWidth - (this.mlIndentWidth % this.tabWidth)) : 1);
            this.curIndentCount++;
        }
        if (this.mlIndentWidth === 0) {
            this.errors.push({ code: XtnParseErrorCode.BadIndentation, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "The content of a triple quoted string must be indented by at least one whitespace character" });
        }
        this.curIndentWidth = this.mlIndentWidth;
        this.popConsumer();
        if (char === this.quoteChar && next === this.quoteChar) {
            this.pushConsumer(this.consumePotentialEndML);
        }
        else {
            this.pushConsumer(this.consumeMultilineString);
            this.consumeMultilineString(char, next);
        }
    }
    private consumePotentialEndML(char: string, next: string) {
        // on first entry, char is second " that may possibly end a triple quoted string with no lines or only blank lines
        this.popConsumer();
        if (next === this.quoteChar) {
            this.pushConsumer(this.consumeMultilineEndQuotes);
        }
        else {
            if (!this.allowLeadingEscapeML) {
                this.errors.push({ code: XtnParseErrorCode.BadIndentation, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "All lines in a triple quoted string that are not entirely whitespace must be indented identically" });
            }
            this.pushConsumer(this.consumeMultilineString);
            this.consumeMultilineString(char, next);
        }
    }
    private mlIndent = "";
    private mlIndentWidth = 0;
    private curIndentWidth = 0;
    private curIndentCount = 0;
    private prevIndentError: XtnParseError | null = null;
    private mlStringLines: string[] = [];
    private consumeMultilineString(char: string, next: string) {
        // on first entry, the first non-blank line after the opening """ has already started but not yet ended
        if (char === '\n') {
            let line = "";
            if (this.curIndentWidth >= this.mlIndentWidth) {
                line = this.document.substring(this.lineStartPos + this.curIndentCount, this.pos);
            }
            this.curIndentWidth = 0;
            this.curIndentCount = 0;
            this.prevIndentError = null;
            if (this.allowLeadingEscapeML) {
                this.allowLeadingEscapeML = false;
                if (line.trim() === '\\') {
                    return;
                }
            }
            this.mlStringLines.push(line);
            return;
        }
        
        const inIndent = this.curIndentWidth < this.mlIndentWidth;
        if (inIndent) {
            if (char.trimStart().length === 0) {
                if (this.curIndentCount >= this.mlIndent.length || char !== this.mlIndent[this.curIndentCount]) {
                    if (this.prevIndentError) {
                        this.prevIndentError.end = { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 };
                    }
                    else {
                        this.prevIndentError = { code: XtnParseErrorCode.BadIndentation, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "All lines in a triple quoted string that are not entirely whitespace must be indented identically"};
                        this.errors.push(this.prevIndentError);
                    }
                }
                this.curIndentWidth += (char === '\t' ? (this.tabWidth - (this.mlIndentWidth % this.tabWidth)) : 1);
                this.curIndentCount++;
                return;
            }
            this.mlIndentWidth = this.curIndentWidth;
        }
        if (inIndent || (this.mlIndentWidth === 0 && this.colNo === 0)) {
            if (char === this.quoteChar && next === this.quoteChar) {
                this.cqCount = 0;
                this.popConsumer();
                this.pushConsumer(this.consumePotentialEndML);
                return;
            }
            else if (inIndent) {
                this.errors.push({ code: XtnParseErrorCode.BadIndentation, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "All lines in a triple quoted string that are not entirely whitespace must be indented identically" });
            }
        }
    }
    private consumeMultilineEndQuotes(char: string, next: string) {
        // on first entry, char is the third character in the closing """
        this.popConsumer();
        let indent = this.mlIndent;
        if (this.allowLeadingEscapeML) {
            if (indent.length > 0) {
                const c = indent[indent.length - 1];
                if (c === '\t')
                    indent += c;
                else
                    indent += '    ';
            }
            else
                indent += '    ';
        }
        this.completeValue(new XtnMStringImpl(this.mlStringLines.join(this.mlSep!), indent, {}, {}));
        this.mlStringLines.length = 0;
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
            const qStrStart: XtnCharPosition = { line: this.jsonStrStartLine, column: this.jsonStrStartCol, index: this.jsonStrStartPos };
            const qStr = new XtnQStringImpl(parseJson5String(jStr, qStrStart, this.errors), qStrStart, { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 });
            this.popConsumer();
            const scope = this.currentScope;
            if (scope instanceof XtnKeyValuePairImpl) {
                this.completeValue(qStr);
            }
            else {
                this.rawText = qStr;
            }
        }
    }

    private startObject() {
        this.pushConsumer(this.consumeObject);
        this.pushScope(new XtnObjectImpl({}, {}));
    }
    private consumeObject(char: string, next: string) {
        this.consumeInner(char, next, true, true);
    }
    private consumePairValue(char: string, next: string) {
        this.consumeInner(char, next, false, false);
    }
    private consumeInner(char: string, next: string, allowKeys: boolean, plusForChildren: boolean) {
        if (char.trimStart().length === 0) {
            return;
        }
        if (allowKeys && char === ":") {
            if (!this.rawText) {
                this.rawText = new XtnKeyImpl("", false, {line: this.lineNo, column: this.colNo, index: this.pos}, {line: this.lineNo, column: this.colNo, index: this.pos});
                this.errors.push({code:XtnParseErrorCode.MissingKey, start: this.rawText.posStart!, end: undefined, message: "Missing key before colon"});
            }
            const keyValuePair = new XtnKeyValuePairImpl(this.rawText instanceof XtnQStringImpl ? new XtnKeyImpl(this.rawText.value, true, this.rawText.posStart, this.rawText.posEnd) : this.rawText);
            this.pushScope(keyValuePair);
            this.rawText = null;
            this.pushConsumer(this.consumePairValue);
            return;
        }
        if (this.rawText instanceof XtnQStringImpl) {
            this.completeValue(this.rawText);
            this.rawText = null;
        }
        else if (this.rawText instanceof XtnKeyImpl) {
            this.interpretAndCompleteValue(this.rawText);
            this.rawText = null;
        }
        if (char === '/') {
            if (next === '/')
                this.startComment(true);
            else if (next === '*')
                this.startComment(false);
            else {
                this.errors.push({ code: XtnParseErrorCode.UnexpectedSlash, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Unexpected character '/'. Use '//' or '/*' to begin a comment." });
            }
        }
        else if (char === '!') {
            this.disableNext = true;
        }
        else if (plusForChildren && char === '+') {
            this.currentScopeState.childMarkerPosition = {line: this.lineNo, column: this.colNo, index: this.pos};
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
            this.popConsumer();
            const obj = this.popScope();
            if (obj instanceof XtnObjectImpl) {
                const parent = this.currentScope;
                if (parent instanceof XtnConstructorImpl) {
                    this.popScope();
                    this.completeValue(parent);
                }
                else
                    this.completeValue(obj);
            }
        }
        else if (char === ']') {
            this.popConsumer();
            const arr = this.popScope();
            if (arr instanceof XtnArrayImpl) {
                this.completeValue(arr);
            }
        }
        else if (char === ')') {
            this.popConsumer();
            const init = this.popScope();
            if (init instanceof XtnArgsImpl) {
                this.pushConsumer(this.consumeTrailingSpaceAfterArgs);
                this.consumeTrailingSpaceAfterArgs(char, next);
            }
            else {
                // error
            }
        }
        else if (char === '=') {
            this.startConstructor(char, next);
        }
        else if (isStartOfNumber(char, next)) {
            this.startImplicitNumber(char, next);
        }
        else if (isUnquotedTextStartLetter(char)) {
            this.startUnquotedText(char, next);
        }
        else if (!plusForChildren && char === '+') {
            this.currentScopeState.childMarkerPosition = { line: this.lineNo, column: this.colNo, index: this.pos };
        }
    }

    private consumeTrailingSpaceAfterArgs(char: string, next: string) {
        if (!this.eof && next.trimStart().length === 0)
            return;
        this.popConsumer();
        if (next === '{') {
            this.pushConsumer(this.consumeInitializer);
        }
        else {
            const constr = this.popScope();
            if (constr instanceof XtnConstructorImpl) {
                this.completeValue(constr);
            }
        }
    }

    private startArray() {
        this.pushConsumer(this.consumeArray);
        this.pushScope(new XtnArrayImpl({}, {}));
    }
    private consumeArray(char: string, next: string) {
        this.consumeInner(char, next, false, false);
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
        this.pushConsumer(this.consumeLeadingNumberWhitespace);
        this.consumeLeadingNumberWhitespace(char, next);
    }
    private consumeLeadingNumberWhitespace(char: string, next: string) {
        // on first entry, char is the character before the integer
        if (next.trimStart().length === 0) {
            return;
        }
        if (next === '-' || next === '+' || isAsciiNumber(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumePotentialLeadingSign);
        }
        else if (next === 'n' || next === 'N') {
            this.popConsumer();
            this.pushConsumer(this.consumeNamedNumberOrNull);
        }
    }
    private consumeNamedNumberOrNull(char: string, next: string) {
        // on first entry, char is n in null
        if (!isAsciiLetter(next)) {
            this.popConsumer();
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
    }
    private consumePotentialLeadingSign(char: string, next: string) {
        // on first entry, char is a minus or plus sign or the first digit
        this.popConsumer();
        this.decPtStartPos = -1;
        this.expStartPos = -1;
        this.pushConsumer(this.consumeStartingNumberDigits);
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
                    this.popConsumer();
                    this.pushConsumer(this.consumeNamedNumberOrNull);
                    return;
                }
                if (!(next === '.' || isAsciiNumber(next))) {
                    // error
                }
            }
        }
        else {
            this.consumeStartingNumberDigits(char, next);
        }
    }
    private consumeStartingNumberDigits(char: string, next: string) {
        // on first entry, char is the first digit of the number or the 0 in 0x
        this.popConsumer();
        if (this.numberType !== "r" && (char === '0' && next === 'x' || next === 'X')) {
            this.pushConsumer(this.consumeHexStart);
        }
        else if (this.numberType !== "i" && char === '.') {
            this.decPtStartPos = this.pos;
            if (next === 'e' || next === 'E') {
                this.expStartPos = this.pos;
            }
            else if (!isAsciiNumber(next)) {
                // error
            }
            this.pushConsumer(this.consumeNumber);
            this.isLeadingZero = false;
        }
        else {
            let d = decDigit(char);
            if (d !== 0n)
                this.intValue *= d!;
            this.isLeadingZero = char === '0';
            this.pushConsumer(this.consumeNumber);
            this.consumeNumber(char, next);
        }
    }
    private consumeHexStart(char: string, next: string) {
        // on first entry, char is the x in 0x
        const h = hexDigit(next);
        if (h === null) {
            // error
            return;
        }
        this.popConsumer();
        if (next !== '0') {
            this.isLeadingZero = false;
            this.intValue *= h;
        }
        else {
            this.isLeadingZero = true;
        }
        this.pushConsumer(this.consumeHex);
    }
    private isLeadingZero = false;
    private consumeHex(char: string, next: string) {
        // on first entry, char is the first hex digit but it has already been considered
        if (this.isLeadingZero) {
            if (next === '0')
                return;
        }
        const h = hexDigit(next);
        if (h === null) {
            this.popConsumer();
            const text = this.document.substring(this.numberStartPos + (this.numberType === "i" ? 1 : 0), this.pos + 1).trimStart();
            if (this.isLeadingZero)
                this.intValue = 0n;
            this.completeValue(new XtnIntegerImpl(this.intValue, text, true, undefined, {}, {}));
            return;
        }
        if (this.isLeadingZero)
            this.intValue *= h;
        else
            this.intValue = this.intValue * 16n + (this.intValue > 0 ? 1n : -1n) * h;
        this.isLeadingZero = false;
    }
    
    private consumeNumber(char: string, next: string) {
        // on first entry, the following cases are possible
        // 1) char is the first digit of an integer that has already been considered or the first digit of the integer part of a real number
        // 2) char is the first character after the decimal point of a number that has no integer part (this can be e / E or a decimal digit for the fractional part)
        if (this.isLeadingZero) {
            if (next === '0')
                return;
        }
        const d = decDigit(next);
        if (d === null) {
            if (this.numberType !== "i") {
                if (this.expStartPos < 0) {
                    if (next === 'e' || next === 'E') {
                        this.expStartPos = this.pos + 1;
                        if (this.decPtStartPos < 0)
                            this.decPtStartPos = this.expStartPos;
                        return;
                    }
                    else if (this.decPtStartPos < 0 && next === '.') {
                        this.decPtStartPos = this.pos + 1;
                        return;
                    }
                }
                else {
                    if (this.expStartPos === this.pos && (next === '-' || next === '+')) {
                        return;
                    }
                }
            }
            this.popConsumer();
            const text = this.document.substring(this.numberStartPos + (this.numberType !== null ? 1 : 0), this.pos + 1).trimStart();
            if (this.isLeadingZero)
                this.intValue = 0n;
            if (this.numberType !== "r" && this.decPtStartPos < 0 && this.expStartPos < 0)
                this.completeValue(new XtnIntegerImpl(this.intValue, text, true, undefined, {}, {}));
            else
                this.completeValue(new XtnRealNumberImpl(Number(text), text, true, undefined, {}, {}));
            return;
        }
        if (this.isLeadingZero)
            this.intValue *= d;
        else if (this.decPtStartPos < 0)
            this.intValue = this.intValue * 10n + (this.intValue > 0 ? 1n : -1n) * d;
        this.isLeadingZero = false;
    }

    private startExplicitRealNumber(char: string, next: string) {
        this.numberStartPos = this.pos;
        this.numberType = "r";
        this.pushConsumer(this.consumeLeadingRealNumberWhitespace);
        this.consumeLeadingRealNumberWhitespace(char, next);
    }
    private consumeLeadingRealNumberWhitespace(char: string, next: string) {
        // on first entry, char is the character before the number
        if (next.trimStart().length === 0) {
            return;
        }
        if (next === '-' || next === '+' || next === '.' || isAsciiNumber(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumePotentialLeadingSign);
        }
        else if ('nNiI'.indexOf(next) >= 0) {
            this.popConsumer();
            this.pushConsumer(this.consumeNamedNumberOrNull);
        }
    }
    private startImplicitNumber(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = this.pos;
        this.numberType = null;
        this.pushConsumer(this.consumePotentialLeadingSign);
        this.consumePotentialLeadingSign(char, next);
    }

    private startDateTime() {

    }

    private booleanStartPos = -1;
    private startExplicitBoolean(next: string) {
        if (next.trimStart().length === 0)
            this.pushConsumer(this.consumeLeadingBooleanWhitespace);
        else if (isAsciiLetter(next))
            this.pushConsumer(this.consumeBoolean);
        else {
            // error
        }
        this.booleanStartPos = this.pos;
    }
    private consumeLeadingBooleanWhitespace(char: string, next: string) {
        // on first entry, char is the first whitespace character after ?
        if (isAsciiLetter(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumeBoolean);
        }
        else if (next.trimStart().length !== 0) {
            // error
        }
    }
    private consumeBoolean(char: string, next: string) {
        // on first entry, char is the first text character in the boolean
        if (!isAsciiLetter(next)) {
            this.popConsumer();
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
    }


    private startSingleLineStringValue(char: string, next: string) {
        this.pushConsumer(this.consumeSingleLineStringValue);
        this.singleLineStringStartPos = this.pos;
        this.consumeSingleLineStringValue(char, next);
    }
    private singleLineStringStartPos = -1;
    private consumeSingleLineStringValue(char: string, next: string) {
        // on first entry, char is the opening `
        if (next === '\n') {
            this.popConsumer();
            const str = this.document.substring(this.singleLineStringStartPos + 1, this.pos + 1).trim().replace(/\s/g, ' ');
            const sStr = new XtnSStringImpl(str, undefined, {}, {});
            this.completeValue(sStr);
        }
    }

    private unquotedTextStartPos = -1;
    private startUnquotedText(char: string, next: string) {
        this.unquotedTextStartPos = this.pos;
        this.pushConsumer(this.consumeUnquotedText);
        this.consumeUnquotedText(char, next);
    }
    private consumeUnquotedText(char: string, next: string) {
        // on first entry, char is the first character of the unquoted text
        if (isKeyLetter(next))
            return;
        const scope = this.currentScope;
        const isValue = scope instanceof XtnKeyValuePairImpl;
        if (!isValue && next !== '\n' && next.trimStart().length === 0) {
            return;
        }
        this.popConsumer();
        const str = this.document.substring(this.unquotedTextStartPos, this.pos + 1).trimEnd().replace(/\s/g, ' ');
        const k = new XtnKeyImpl(str, false, {line: this.lineNo, column: this.colNo - (this.pos - this.unquotedTextStartPos), index: this.unquotedTextStartPos}, {line: this.lineNo, column: this.colNo + 1, index: this.pos + 1});
        if (isValue || this.eof) {
            this.interpretAndCompleteValue(k);
        }
        else {
            this.rawText = k;
        }
    }

    private constructorStartPos = -1;
    private openAngles = 0;
    private startConstructor(char: string, next: string) {
        this.constructorStartPos = this.pos;
        this.openAngles = 0;
        const tagName = new XtnTagNameImpl({}, {});
        this.pushScope(new XtnConstructorImpl(tagName))
        this.pushScope(tagName);
        this.pushConsumer(this.consumeLeadingSegmentSpace);
        this.consumeLeadingSegmentSpace(char, next);
    }
    private consumeLeadingSegmentSpace(char: string, next: string) {
        // on first entry char is the character before the segment starts
        if (next.trimStart().length === 0)
            return;
        if (next === '_' || isAsciiLetter(next)) {
            this.popConsumer();
            this.segStartPos = this.pos + 1;
            this.pushConsumer(this.consumeTagNameSegment);
        }
        else {
            // error
        }
    }
    private segStartPos = -1;
    private consumeTagNameSegment(char: string, next: string) {
        // on first entry, char is the first non-space character of a segment
        if (isKeyLetter(next))
            return;
        const name = this.document.substring(this.segStartPos, this.pos + 1);
        this.pushScope(new XtnTagNameSegmentImpl(name, {}, {}));
        this.popConsumer();
        this.pushConsumer(this.consumeTrailingSegNameSpace);
        this.consumeTrailingSegNameSpace(char, next);
    }
    private consumeTrailingSegNameSpace(char: string, next: string) {
        if (!this.eof && next.trimStart().length === 0)
            return;
        if (next === '<') {
            ++this.openAngles;
            this.popConsumer();
            this.pushConsumer(this.consumeSegArgs);
        }
        else if (next === ',') {
            this.popConsumer();
            const arg = this.completeTagName();
            (this.currentScope as XtnTagNameSegmentImpl).args.push(arg);
        }
        else if (next === '>') {
            this.popConsumer();
            const arg = this.completeTagName();
            (this.currentScope as XtnTagNameSegmentImpl).args.push(arg);
            --this.openAngles;
            this.popConsumer();
            this.pushConsumer(this.consumeTrailingSegNameSpace);
        }
        else if (next === '.') {
            const seg = this.popScope() as XtnTagNameSegmentImpl;
            (this.currentScope as XtnTagNameImpl).segments.push(seg);
            this.popConsumer();
            this.pushConsumer(this.consumeLeadingSegmentSpace);
            this.consumeLeadingSegmentSpace(char, next);
        }
        else if (next === '(') {
            if (this.openAngles === 0) {
                this.completeTagName();
                this.popConsumer();
                this.pushConsumer(this.consumeConstrArgsOpen);
            }
            else {
                // error
            }
        }
        else if (next === '{') {
            if (this.openAngles === 0) {
                this.completeTagName();
                this.popConsumer();
                this.pushConsumer(this.consumeInitializer);
            }
            else {
                // error
            }
        }
        else {
            if (this.openAngles === 0) {
                this.completeTagName();
                this.popConsumer();
                const constr = this.popScope();
                if (constr instanceof XtnConstructorImpl) {
                    this.completeValue(constr);
                }
            }
            else {
                // error
            }
        }
    }
    private consumeSegArgs(char: string, next: string) {
        const tagName = new XtnTagNameImpl({}, {});
        this.pushScope(tagName);
        this.pushConsumer(this.consumeLeadingSegmentSpace);
        this.consumeLeadingSegmentSpace(char, next);
    }
    private completeTagName() {
        const seg = this.popScope() as XtnTagNameSegmentImpl;
        const tagName = this.popScope() as XtnTagNameImpl;
        tagName.segments.push(seg);
        tagName.complete();
        return tagName;
    }
    private consumeConstrArgsOpen(char: string, next: string) {
        const constr = this.currentScope as XtnConstructorImpl;
        const constrArgs = new XtnArgsImpl({}, {});
        constr.args = constrArgs;
        this.pushScope(constrArgs);
        this.popConsumer();
        this.pushConsumer(this.consumeConstrArgs);
    }
    private consumeConstrArgs(char: string, next: string) {
        this.consumeInner(char, next, true, false);
    }
    private consumeInitializer(char: string, next: string) {
        const constr = this.currentScope as XtnConstructorImpl;
        const init = new XtnObjectImpl({}, {});
        constr.initializer = init;
        this.pushScope(init);
        this.popConsumer();
        this.pushConsumer(this.consumeObject);
    }
}

export interface XtnParseError {
    code: number;
    start: XtnCharPosition;
    end: XtnCharPosition | undefined;
    message: string;
}

type ParseResult = { succeeded: true; result: XtnObject; } | { succeeded: false; partial: XtnObject; errors: XtnParseError[]; }

export function parseXtn(document: string): XtnObject{
    const pr = tryParseXtn(document);
    if (pr.succeeded) return pr.result;
    throw new Error(pr.errors[0].message);
}
export function tryParseXtn(document: string): ParseResult {
    const p = new Parser(document);
    const result = p.parse();
    if (p.errors.length === 0) {
        return ({
            succeeded: true,
            result
        });
    }
    else {
        return ({
            succeeded: false,
            partial: result,
            errors: p.errors
        })
    }
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

function writeStringValue(value: string, strs: string[], indent: string) {
    if (isStringValueSingleLine(value)) {
        strs.push("` ");
        strs.push(value);
    }
    else if (value.match(/\r/)) {
        strs.push(JSON.stringify(value));
    }
    else {
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

function writeValue(element: XtnValue, strs: string[], indent: string): void {
    switch (element.type) {
        case "sstring":
        case "qstring":
        case "mstring":
            writeStringValue(element.value, strs, indent);
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
            strs.push('null');
            return;
        case "errortoken":
            strs.push(element.value);
            return;
        case "array":
            strs.push('[\n');
            writeInner(element, strs, increaseIndent(indent));
            strs.push(indent);
            strs.push(']');
            return;
        case "object":
            strs.push('{\n');
            writeInner(element, strs, increaseIndent(indent));
            strs.push(indent);
            strs.push('}');
            return;
        case "constructor":
            strs.push("= ");
            strs.push(element.tag.name);
            if (element.args?.items.length) {
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
            strs.push(': ');
            writeValue(item.value, strs, indent);
            strs.push('\n');
        }
        else {
            writeValue(item, strs, indent);
            strs.push('\n');
        }
    }
}

export function writeXtn(root: XtnObject) {
    const strs: string[] = [];
    writeInner(root, strs, "");
    return strs.join('');
}