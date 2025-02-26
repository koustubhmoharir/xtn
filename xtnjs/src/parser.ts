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
    MissingBooleanOrNull = 11,
    UnmatchedClosingBracket = 12,
    UnmatchedClosingBrace = 13,
    MissingValue = 14,
    UnmatchedClosingParenthesis = 15,
    MissingIdentifierName = 16,
    MissingClosingAngledBracket = 17,
    MissingBrace = 18,
    MissingBracket = 19,
    MissingParenthesis = 20,
    MissingRealNumberOrNull = 21,
    MissingIntegerOrNull = 22,
    MissingQuote = 23,
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
    data(env?: XtnEnvironment): string;
}

export interface XtnQString extends XtnPrimitive<string> {
    readonly type: "qstring";
    readonly explicit: true;
    data(env?: XtnEnvironment): string;
}

export interface XtnMString extends XtnPrimitive<string> {
    readonly type: "mstring";
    readonly explicit: true;
    readonly indent: string;
    data(env?: XtnEnvironment): string;
}

export interface XtnInteger extends XtnPrimitive<bigint | null> {
    readonly type: "integer";
    data(env?: XtnEnvironment): bigint | number | null;
}

export interface XtnRealNumber extends XtnPrimitive<number | null> {
    readonly type: "real";
    data(env?: XtnEnvironment): number | null;
}

export interface XtnBoolean extends XtnPrimitive<boolean | null> {
    readonly type: "boolean";
    data(env?: XtnEnvironment): boolean | null;
}

export interface XtnErrorToken extends XtnPrimitive<string> {
    readonly type: "errortoken";
    readonly explicit: false;
    data(env?: XtnEnvironment): string;
}

export interface XtnReference extends XtnPrimitive<string> {
    readonly type: "reference";
    readonly explicit: true;
    data(env?: XtnEnvironment): XtnDataValue;
}

export interface XtnNull extends XtnPrimitive<null> {
    readonly type: "null";
    readonly explicit: false;
    data(env?: XtnEnvironment): null;
}

export interface XtnArray extends XtnElement {
    readonly type: "array";
    readonly items: readonly XtnValue[];
    data(env?: XtnEnvironment): XtnDataValue[];
}

export interface XtnIdentifierSegment extends XtnElement {
    readonly type: "idseg";
    readonly name: string;
    readonly args: readonly XtnIdentifier[] | null;
}

export interface XtnIdentifier extends XtnElement {
    readonly type: "identifier";
    readonly name: string;
    readonly segments: readonly XtnIdentifierSegment[];
}

export interface XtnExpression extends XtnElement {
    readonly type: "expression";
    readonly identifier: XtnIdentifier;
    readonly args: XtnArgs | null;
    readonly initializer: XtnObject | null;
    data(env?: XtnEnvironment): XtnDataValue;
}

export interface XtnKeyValuePair {
    readonly type: "keyvaluepair";
    readonly key: XtnKey;
    readonly posColon?: XtnCharPosition;
    readonly value: XtnValue;
}

export interface XtnValueOrPairList extends XtnElement {
    readonly items: readonly (XtnValue | XtnKeyValuePair)[]
}

export interface XtnArgs extends XtnValueOrPairList {
    readonly type: "functionargs";
}

export type XtnDataValue = string | bigint | number | boolean | null | XtnDataObject | XtnDataValue[];

export interface XtnDataObject {
    [key: string]: XtnDataValue;
}

export interface XtnEnvironment {
    integerType?: "number" | "bigint";
    resolve?: (id: XtnIdentifier, args: XtnDataValue[] | null, opts: Record<string, XtnDataValue> | null) => XtnDataValue;
    assign?: (obj: XtnDataObject, key: string, value: XtnDataValue) => void;
    append?: (obj: XtnDataObject, value: XtnDataValue) => void;
}

export interface XtnObject extends XtnValueOrPairList {
    readonly type: "object";
    data(env?: XtnEnvironment): XtnDataObject;
}

export type XtnValue = XtnSString | XtnQString | XtnMString | XtnInteger | XtnRealNumber | XtnBoolean | XtnReference | XtnNull | XtnErrorToken | XtnArray | XtnExpression | XtnObject;

export type XtnValueImpl = XtnSStringImpl | XtnQStringImpl | XtnMStringImpl | XtnIntegerImpl | XtnRealNumberImpl | XtnBooleanImpl | XtnReferenceImpl | XtnNullImpl | XtnErrorTokenImpl | XtnArrayImpl | XtnExpressionImpl | XtnObjectImpl;


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

    data(env?: XtnEnvironment): string {
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

    data(env?: XtnEnvironment): string {
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

    data(env?: XtnEnvironment): string {
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

    data(env: XtnEnvironment | undefined): bigint | number | null {
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

    data(env?: XtnEnvironment): number | null {
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

    data(env?: XtnEnvironment): boolean | null {
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

    data(env?: XtnEnvironment): XtnDataValue {
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

    data(env?: XtnEnvironment): null {
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

    data(env?: XtnEnvironment): string {
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

    data(env: XtnEnvironment | undefined): XtnDataValue[] {
        return this.items.map(item => item.data(env));
    }
}

class XtnIdentifierSegmentImpl extends XtnElementImpl implements XtnIdentifierSegment {
    readonly args: XtnIdentifierImpl[] = [];
    get type() { return "idseg" as const; }

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

class XtnIdentifierImpl extends XtnElementImpl implements XtnIdentifier {
    readonly segments: XtnIdentifierSegmentImpl[] = [];
    get type() { return "identifier" as const; }
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

class XtnExpressionImpl extends XtnElementImpl implements XtnExpression {
    get type() { return "expression" as const; }
    childMarkerPosition?: XtnCharPosition = undefined;
    args: XtnArgsImpl | null = null;
    initializer: XtnObjectImpl | null = null;

    constructor(
        public readonly identifier: XtnIdentifierImpl,
        posStart?: XtnCharPosition,
        posEnd?: XtnCharPosition
    ) {
        super(posStart, posEnd);
    }

    data(env: XtnEnvironment | undefined): XtnDataValue {
        if (!env?.resolve) {
            throw new Error("An env with a construct method must be provided");
        }
        const args = this.args?.items.filter(a => a.type !== "keyvaluepair").map(a => a.data(env)) || null;
        const opts = this.args?.items.filter(a => a.type === "keyvaluepair").map(a => [a.key.name, a.value.data(env)]) || null;
        const obj = env.resolve(this.identifier, args, opts ? Object.fromEntries(opts) : null);
        if (this.initializer) {
            if (obj == null) {
                throw new Error(`Initializer could not be applied because the constructed object for ${this.identifier.name} is ${obj === null ? "null" : "undefined"}`);
            }
            const t = typeof obj;
            if (t !== "object") {
                throw new Error(`Initializer could not be applied because the constructed object for ${this.identifier.name} is not an object`);
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
        public readonly key: XtnKeyImpl,
        public readonly posColon: XtnCharPosition
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
    get type() { return "functionargs" as const; }

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
                const k = item.key.name;
                const v = item.value.data(env);
                if (item.value.childMarkerPosition)
                    env?.assign?.(obj, k, v);
                else
                    obj[k] = v;
            }
            else {
                env?.append?.(obj, item.data(env));
            }
        }
    }
}

function parseJson5String(str: string, start: XtnCharPosition, hasEndQuote: boolean, errors: XtnParseError[]) {
    const cps = [];
    let escape = 0;
    let escdCR = false;
    let cr = false;
    let hex = 0n;
    let hexEsc = '';
    let curLineNo = start.line!;
    let curColNo = start.column! + 1;
    let curIndex = start.index! + 1;
    for (const c of str.substring(1, str.length - (hasEndQuote ? 1 : 0))) {
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
    return ('-+'.indexOf(char) >= 0 && (next === '.' || isAsciiNumber(next))) || (char === '.' && isAsciiNumber(next)) || isAsciiNumber(char);
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
function isWordStartLetter(char: string) {
    const cn = char.codePointAt(0)!;
    // 0-9 or a-z or A-Z or _
    return (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 95;
}
function isKeyLetter(char: string) {
    const cn = char.codePointAt(0)!;
    // 0-9 or a-z or A-Z or - or _
    return (cn >= 48 && cn <= 57) || (cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95;
}

class Parser {
    constructor(readonly document: string) {
        this._scopeStates = [this._scopeState = { scope: this.rootObj, state: { plusPosition: undefined, allowKeys: true } }];
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
    lineNoNext = 0;
    colNoNext = -1;
    posNext = -1;
    private logFragmentExcl(header: string, startPos: number) {
        //console.log(`Read ${header} ${this.lineNo}, ${startPos - this.lineStartPos}:${this.pos - this.lineStartPos} :${this.document.substring(startPos, this.pos)}`);
    }

    readonly rootObj = new XtnObjectImpl({}, {});
    private _scopeState: {
        scope: XtnArrayImpl | XtnValueOrPairListImpl | XtnKeyValuePairImpl | XtnExpressionImpl | XtnIdentifierImpl | XtnIdentifierSegmentImpl;
        state: {
            plusPosition: XtnCharPosition | undefined;
            allowKeys: boolean;
        }
    };
    private get currentScope() { return this._scopeState.scope; }
    private get currentScopeState() { return this._scopeState.state; }
    private _scopeStates: (Parser["_scopeState"])[];
    private pushScope(scope: XtnArrayImpl | XtnValueOrPairListImpl | XtnKeyValuePairImpl | XtnExpressionImpl | XtnIdentifierImpl | XtnIdentifierSegmentImpl, allowKeys: boolean) {
        this._scopeStates.push(this._scopeState = { scope, state: { plusPosition: undefined, allowKeys } });
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
                this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: value.posStart!, end: value.posEnd, message: `The token '${text}' is not recognized` });
        }
        this.completeValue(lit);
    }
    private completeValue(value: XtnValueImpl) {
        const scope = this.currentScope;
        const cmp = this.currentScopeState.plusPosition;
        value.childMarkerPosition = cmp;
        if (scope instanceof XtnKeyValuePairImpl) {
            this.popConsumer();
            this.popScope();
            scope.value = value;
            const parentScope = this.currentScope;
            if (parentScope instanceof XtnValueOrPairListImpl) {
                parentScope.items.push(scope);
                this.currentScopeState.plusPosition = undefined;
            }
            else {
                // error: probably not reachable
                throw new Error("Not implemented");
            }
        }
        else if ("items" in scope) {
            scope.items.push(value);
            this.currentScopeState.plusPosition = undefined;
        }
        else {
            // error: probably not reachable
            throw new Error("Not implemented");
        }
    }
    private eof = false;
    parse() {
        let char = '\0';
        for (let next of this.document) {
            this.processChar(char, next);
            char = next;
        }
        this.eof = true;
        this.processChar(char, '\n');
        if (this._consumers.length > 1) {
            if (this.consumer === this.consumeBlockComment) {
                this.errors.push({ code: XtnParseErrorCode.UnexpectedEndOfFile, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Unexpected end of file. Comment has not been closed with '*/'" });
                this.popConsumer();
            }
        }
        this.handleIncompleteScopes();
        return this.rootObj;
    }
    private processChar(char: string, next: string) {
        const len = char.length;
        this.colNoNext = this.colNoNext + len;
        this.posNext = this.posNext + len;
        if (char === '\r') {
            if (next === '\n') {
                return;
            }
            else {
                this.lineNoNext = this.lineNo + 1;
                this.colNoNext = 0;
                this.consumer('\n', next === '\r' ? '\n' : next);
                this.lineNo = this.lineNoNext;
                this.lineStartPos = this.posNext;
            }
        }
        else if (char === '\n') {
            this.lineNoNext = this.lineNo + 1;
            this.colNoNext = 0;
            this.consumer(char, next === '\r' ? '\n' : next);
            this.lineNo = this.lineNoNext;
            this.lineStartPos = this.posNext;
        }
        else {
            this.consumer(char, next === '\r' ? '\n' : next);
        }
        this.colNo = this.colNoNext;
        this.pos = this.posNext;
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
            if (this.eof) {
                this.errors.push({ code: XtnParseErrorCode.MissingQuote, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: `Missing ${this.quoteChar === "'" ? "single" : "double"} quote` });
                this.completeJsonString(new XtnQStringImpl("", {}, {}));
            }
            else {
                this.pushConsumer(this.consumeJsonString);
            }
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
            if (this.eof) {
                this.completeUnclosedMultilineString();
            }
            else if (next === '\\' || next.trimStart().length === 0) {
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
            else {
                if (this.eof) {
                    this.completeUnclosedMultilineString();
                }
                else if (next !== '\\' && next.trimStart().length !== 0) {
                    // will report error at end of line
                    this.unexpTextOnTripleQuotesLineStart = this.quoteStartPos + 3;
                    this.popConsumer();
                    this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
                    this.consumeRestOfLineAfterStartTripleQuotes(char, next);
                }
                return;
            }
        }
        else if (this.cqCount === 2) {
            // on first entry, char is r in the \r on the line containing opening """
            if (next === '\n') {
                this.cqCount = 3;
                if (this.eof) {
                    this.completeUnclosedMultilineString();
                }
            }
            else if (next.trimStart().length !== 0) {
                // will report error at end of line
                if (this.unexpTextOnTripleQuotesLineStart < 0)
                    this.unexpTextOnTripleQuotesLineStart = this.quoteStartPos + 3;
                this.popConsumer();
                this.pushConsumer(this.consumeRestOfLineAfterStartTripleQuotes);
            }
            return;
        }
        if (this.cqCount === 3) {
            this.curIndentWidth = 0;
            this.cqCount = 0;
            this.allowLeadingEscapeML = true;
            this.popConsumer();
            this.pushConsumer(this.consumeStartingIndentMLString);
        }
        if (this.eof) {
            this.completeUnclosedMultilineString();
        }
    }
    private completeUnclosedMultilineString() {
        this.errors.push({ code: XtnParseErrorCode.MissingQuote, start: { line: this.lineNoNext, column: this.colNoNext, index: this.posNext }, end: undefined, message: "Missing closing quotes of triple quoted string" });
        this.popConsumer();
        this.completeMultilineString();
    }
    allowLeadingEscapeML = false;
    private consumeStartingIndentMLString(char: string, next: string) {
        // on first entry, char is the first character of the line after the line containing the starting """
        if (char.trimStart().length === 0) {
            if (this.eof) {
                this.completeUnclosedMultilineString();
            }
            return;
        }
        this.mlIndent = this.document.substring(this.lineStartPos, this.pos);
        this.mlIndentWidth = 0;
        this.curIndentCount = 0;
        this.prevIndentError = null;
        for (const ch of this.mlIndent) {
            this.mlIndentWidth += (ch === '\t' ? (this.tabWidth - (this.mlIndentWidth % this.tabWidth)) : 1);
            this.curIndentCount++;
        }
        const potEnd = char === this.quoteChar && next === this.quoteChar;
        if (this.mlIndentWidth === 0 && !potEnd) {
            this.errors.push({ code: XtnParseErrorCode.BadIndentation, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "The content of a triple quoted string must be indented by at least one whitespace character" });
        }
        this.curIndentWidth = this.mlIndentWidth;
        this.popConsumer();
        if (potEnd) {
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
        if (char === '\n' || this.eof) {
            let line = "";
            if (this.curIndentWidth >= this.mlIndentWidth) {
                line = this.document.substring(this.lineStartPos + this.curIndentCount, this.pos + (this.eof ? 1 : 0));
            }
            this.curIndentWidth = 0;
            this.curIndentCount = 0;
            this.prevIndentError = null;
            let escape = false;
            if (this.allowLeadingEscapeML) {
                this.allowLeadingEscapeML = false;
                if (line.trim() === '\\') {
                    escape = true;
                }
            }
            if (!escape) {
                this.mlStringLines.push(line);
            }
            if (this.eof) {
                this.completeUnclosedMultilineString();
            }
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
        this.completeMultilineString();
    }
    private completeMultilineString() {
        let indent = this.mlIndent ?? "";
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
        this.completeValue(new XtnMStringImpl(this.mlStringLines.join(this.mlSep ?? '\n'), indent, {}, {}));
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
        else {
            const hasEndQuote = char === this.quoteChar;
            if (hasEndQuote || this.eof) {
                const jStr = this.document.substring(this.jsonStrStartPos, this.pos + 1);
                const qStrStart: XtnCharPosition = { line: this.jsonStrStartLine, column: this.jsonStrStartCol, index: this.jsonStrStartPos };
                const qStr = new XtnQStringImpl(parseJson5String(jStr, qStrStart, hasEndQuote, this.errors), qStrStart, { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 });
                if (!hasEndQuote) {
                    this.errors.push({ code: XtnParseErrorCode.MissingQuote, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: `Missing ${this.quoteChar === "'" ? "single" : "double"} quote` })
                }
                this.popConsumer();
                this.completeJsonString(qStr);
            }
        }
    }
    private completeJsonString(qStr: XtnQStringImpl) {
        const scope = this.currentScope;
        if (scope instanceof XtnKeyValuePairImpl) {
            this.completeValue(qStr);
        }
        else {
            this.rawText = qStr;
            if (this.eof)
                this.completeRawText();
        }
    }

    private startObject() {
        this.pushConsumer(this.consumeObject);
        this.pushScope(new XtnObjectImpl({}, {}), true);
    }
    private consumeObject(char: string, next: string) {
        this.consumeInner(char, next, true);
    }
    private consumePairValue(char: string, next: string) {
        this.consumeInner(char, next, false);
    }
    private consumeInner(char: string, next: string, plusForChildren: boolean) {
        if (char.trimStart().length === 0) {
            return;
        }
        if (this.currentScopeState.allowKeys && char === ":") {
            if (!this.rawText) {
                this.rawText = new XtnKeyImpl("", false, { line: this.lineNo, column: this.colNo, index: this.pos }, { line: this.lineNo, column: this.colNo, index: this.pos });
                this.errors.push({ code: XtnParseErrorCode.MissingKey, start: this.rawText.posStart!, end: undefined, message: "Missing key before colon" });
            }
            const keyValuePair = new XtnKeyValuePairImpl(this.rawText instanceof XtnQStringImpl ? new XtnKeyImpl(this.rawText.value, true, this.rawText.posStart, this.rawText.posEnd) : this.rawText, { line: this.lineNo, column: this.colNo, index: this.pos });
            this.pushScope(keyValuePair, false);
            this.rawText = null;
            this.pushConsumer(this.consumePairValue);
            if (this.eof) {
                const pc = keyValuePair.posColon;
                this.errors.push({ code: XtnParseErrorCode.MissingValue, start: { line: pc.line, column: pc.column! + 1, index: pc.index! + 1 }, end: undefined, message: "Expected a value" });
                this.completeValue(new XtnNullImpl("", {}, {}));
            }
            return;
        }
        this.completeRawText();
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
            this.currentScopeState.plusPosition = {line: this.lineNo, column: this.colNo, index: this.pos};
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
            this.startExplicitBoolean(char, next);
        }
        else if (char === '}') {
            let obj = this.currentScope;
            if (obj instanceof XtnKeyValuePairImpl) {
                this.completeValue(new XtnNullImpl("", {}, {}));
                const pc = obj.posColon;
                this.errors.push({ code: XtnParseErrorCode.MissingValue, start: { line: pc.line, column: pc.column! + 1, index: pc.index! + 1 }, end: undefined, message: "Expected a value" });
            }
            obj = this.currentScope;
            if (obj instanceof XtnObjectImpl && obj !== this.rootObj) {
                this.completeObject(obj);
            }
            else {
                this.errors.push({ code: XtnParseErrorCode.UnmatchedClosingBrace, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Unexpected closing brace" });
            }
        }
        else if (char === ']') {
            const arr = this.currentScope;
            if (arr instanceof XtnArrayImpl) {
                this.completeArray(arr);
            }
            else {
                this.errors.push({ code: XtnParseErrorCode.UnmatchedClosingBracket, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Unexpected closing bracket" });
            }
        }
        else if (char === ')') {
            let obj = this.currentScope;
            if (obj instanceof XtnKeyValuePairImpl) {
                this.completeValue(new XtnNullImpl("", {}, {}));
                const pc = obj.posColon;
                this.errors.push({ code: XtnParseErrorCode.MissingValue, start: { line: pc.line, column: pc.column! + 1, index: pc.index! + 1 }, end: undefined, message: "Expected a value" });
            }
            obj = this.currentScope;
            if (obj instanceof XtnArgsImpl) {
                this.popConsumer();
                this.popScope();
                this.pushConsumer(this.consumeTrailingSpaceAfterArgs);
                this.consumeTrailingSpaceAfterArgs(char, next);
            }
            else {
                this.errors.push({ code: XtnParseErrorCode.UnmatchedClosingParenthesis, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Unexpected closing parenthesis" });
            }
        }
        else if (char === '=') {
            this.startExpression(char, next);
        }
        else if (isStartOfNumber(char, next)) {
            this.startImplicitNumber(char, next);
        }
        else if (isUnquotedTextStartLetter(char)) {
            this.startUnquotedText(char, next);
        }
        else if (!plusForChildren && char === '+') {
            this.currentScopeState.plusPosition = { line: this.lineNo, column: this.colNo, index: this.pos };
        }
        else if (char !== ',' && char !== '\0') {
            const ps = { line: this.lineNo, column: this.colNo, index: this.pos };
            const pe = { line: this.lineNo, column: this.colNo + char.length, index: this.pos + char.length };
            this.completeValue(new XtnErrorTokenImpl(char, ps, pe));
            this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: ps, end: undefined, message: `Unexpected token '${char}'` });
        }
    }
    private completeRawText() {
        if (this.rawText instanceof XtnQStringImpl) {
            this.completeValue(this.rawText);
            this.rawText = null;
        }
        else if (this.rawText instanceof XtnKeyImpl) {
            this.interpretAndCompleteValue(this.rawText);
            this.rawText = null;
        }
    }
    private completeObject(obj: XtnObjectImpl) {
        this.popConsumer();
        this.popScope();
        const parent = this.currentScope;
        if (parent instanceof XtnExpressionImpl) {
            this.popScope();
            this.completeValue(parent);
        }
        else
            this.completeValue(obj);
    }
    private completeArray(arr: XtnArrayImpl) {
        this.popConsumer();
        this.popScope();
        this.completeValue(arr);
    }
    private handleIncompleteScopes() {
        let scope;
        while ((scope = this.currentScope) !== this.rootObj) {
            if (scope instanceof XtnKeyValuePairImpl) {
                const pc = scope.posColon;
                this.errors.push({ code: XtnParseErrorCode.MissingValue, start: { line: pc.line, column: pc.column! + 1, index: pc.index! + 1 }, end: undefined, message: "Expected a value" });
                this.completeValue(new XtnNullImpl("", {}, {}));
            }
            else if (scope instanceof XtnObjectImpl) {
                this.errors.push({ code: XtnParseErrorCode.MissingBrace, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Expected a closing brace" });
                this.completeObject(scope);
            }
            else if (scope instanceof XtnArrayImpl) {
                this.errors.push({ code: XtnParseErrorCode.MissingBracket, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Expected a closing square bracket" });
                this.completeArray(scope);
            }
            else if (scope instanceof XtnArgsImpl) {
                this.errors.push({ code: XtnParseErrorCode.MissingParenthesis, start: { line: this.lineNo, column: this.colNo, index: this.pos }, end: undefined, message: "Expected a closing parenthesis" });
                this.popConsumer();
                this.popScope();
                const expr = this.popScope();
                if (expr instanceof XtnExpressionImpl) {
                    this.completeValue(expr);
                }
                else {
                    throw new Error("Unreachable code");
                }
            }
            else {
                throw new Error("Not implemented");
            }
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
            const expr = this.popScope();
            if (expr instanceof XtnExpressionImpl) {
                this.completeValue(expr);
            }
            else {
                throw new Error("Unreachable code");
            }
        }
    }

    private startArray() {
        this.pushConsumer(this.consumeArray);
        this.pushScope(new XtnArrayImpl({}, {}), false);
    }
    private consumeArray(char: string, next: string) {
        this.consumeInner(char, next, false);
    }

    private numberStartPos: XtnCharPosition = {};
    private decPtStartPos = -1;
    private expStartPos = -1;
    private intValue = 1n;
    private numberType: "i" | "r" | null = null;
    private startExplicitInteger(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        this.numberType = "i";
        this.pushConsumer(this.consumeLeadingIntegerWhitespace);
        this.consumeLeadingIntegerWhitespace(char, next);
    }
    private consumeLeadingIntegerWhitespace(char: string, next: string) {
        // on first entry, char is the character before the integer
        if (next.trimStart().length === 0 && !this.eof) {
            return;
        }
        if (next === '-' || next === '+' || isAsciiNumber(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumePotentialLeadingSign);
        }
        else if (isWordStartLetter(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumeNamedNumberOrNull);
        }
        else {
            const np = this.numberStartPos;
            this.errors.push({ code: XtnParseErrorCode.MissingIntegerOrNull, start: { line: np.line, column: np.column! + 1, index: np.index! + 1 }, end: undefined, message: "Expected an integer or null" })
            this.completeValue(new XtnIntegerImpl(null, "", true, undefined, {}, {}));
        }
    }
    private consumeNamedNumberOrNull(char: string, next: string) {
        // on first entry, char is n in null
        if (!isAsciiLetter(next)) {
            this.popConsumer();
            const text = this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart();
            const tu = text.toUpperCase();
            let numb;
            if (this.numberType === "i") {
                if (tu !== "NULL") {
                    this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1 - text.length, index: this.pos + 1 - text.length }, end: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, message: "An integer value in decimal or hexadecimal or null was expected" });
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
                        this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1 - text.length, index: this.pos + 1 - text.length }, end: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, message: `Unrecognized token '${text}'` });
                        break;
                }
                numb = new XtnRealNumberImpl(v, text, true, undefined, {}, {});
            }
            this.completeValue(numb);
        }
    }
    private errorWordStart = -1;
    private consumeErrorWordInNumber(char: string, next: string) {
        if (!isKeyLetter(next)) {
            this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo - (this.pos - this.errorWordStart), index: this.errorWordStart }, end: {line: this.lineNo, column: this.colNo + 1, index: this.pos + 1}, message: "Expected a decimal digit" });
            const numb = new XtnIntegerImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), true, undefined, {}, {});
            this.popConsumer();
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
                    if (isWordStartLetter(next)) {
                        this.popConsumer();
                        this.errorWordStart = this.pos + 1;
                        this.pushConsumer(this.consumeErrorWordInNumber);
                    }
                    else {
                        this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: "Expected a decimal digit" });
                        const numb = new XtnIntegerImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), true, undefined, {}, {});
                        this.popConsumer();
                        this.completeValue(numb);
                    }
                }
            }
            else {
                if (isWordStartLetter(next)) {
                    this.popConsumer();
                    this.pushConsumer(this.consumeNamedNumberOrNull);
                    return;
                }
                if (!(next === '.' || isAsciiNumber(next))) {
                    throw new Error("This code is supposed to be unreachable");
                    this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: "Expected a decimal digit or decimal point" });
                    const numb = new XtnIntegerImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), true, undefined, {}, {});
                    this.popConsumer();
                    this.completeValue(numb);
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
                this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: "Expected a decimal digit or 'e' or 'E' after a decimal point" });
                const numb = new XtnRealNumberImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), this.numberType !== null, undefined, {}, {});
                this.completeValue(numb);
                return;
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
    private hexErrorStart = -1;
    private consumeHexError(char: string, next: string) {
        if (isKeyLetter(next)) return;
        this.popConsumer();
        this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo - (this.pos - this.hexErrorStart), index: this.hexErrorStart }, end: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, message: "Expected a sequence of hexadecimal digits 0-9 or a-f after 0x" });
        const numb = new XtnIntegerImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), this.numberType !== null, undefined, {}, {});
        this.completeValue(numb);
        return;
    }
    private consumeHexStart(char: string, next: string) {
        // on first entry, char is the x in 0x
        const h = hexDigit(next);
        if (h === null) {
            if (isWordStartLetter(next)) {
                this.popConsumer();
                this.hexErrorStart = this.pos + 1;
                this.pushConsumer(this.consumeHexError);
                return;
            }
            else {
                this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: "Expected a hexadecimal digit 0-9 or a-f after 0x" });
                const numb = new XtnIntegerImpl(null, this.document.substring(this.numberStartPos.index! + 1, this.pos + 1).trimStart(), this.numberType !== null, undefined, {}, {});
                this.popConsumer();
                this.completeValue(numb);
                return;
            }
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
            const text = this.document.substring(this.numberStartPos.index! + (this.numberType === "i" ? 1 : 0), this.pos + 1).trimStart();
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
            const text = this.document.substring(this.numberStartPos.index! + (this.numberType !== null ? 1 : 0), this.pos + 1).trimStart();
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
        this.numberStartPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        this.numberType = "r";
        this.pushConsumer(this.consumeLeadingRealNumberWhitespace);
        this.consumeLeadingRealNumberWhitespace(char, next);
    }
    private consumeLeadingRealNumberWhitespace(char: string, next: string) {
        // on first entry, char is the character before the number
        if (next.trimStart().length === 0 && !this.eof) {
            return;
        }
        if (next === '-' || next === '+' || next === '.' || isAsciiNumber(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumePotentialLeadingSign);
        }
        else if (isWordStartLetter(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumeNamedNumberOrNull);
        }
        else {
            const np = this.numberStartPos;
            this.errors.push({ code: XtnParseErrorCode.MissingRealNumberOrNull, start: { line: np.line, column: np.column! + 1, index: np.index! + 1 }, end: undefined, message: "Expected a real number or null" })
            this.completeValue(new XtnRealNumberImpl(null, "", true, undefined, {}, {}));
        }
    }
    private startImplicitNumber(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        this.numberType = null;
        this.pushConsumer(this.consumePotentialLeadingSign);
        this.consumePotentialLeadingSign(char, next);
    }

    private startDateTime() {

    }

    private booleanStartPos: XtnCharPosition = {};
    private startExplicitBoolean(char: string, next: string) {
        this.booleanStartPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        if (isAsciiLetter(next))
            this.pushConsumer(this.consumeBoolean);
        else {
            this.pushConsumer(this.consumeLeadingBooleanWhitespace);
            this.consumeLeadingBooleanWhitespace(char, next);
        }
        return;
    }
    private consumeLeadingBooleanWhitespace(char: string, next: string) {
        // on first entry, char is ?
        if (isAsciiLetter(next)) {
            this.popConsumer();
            this.pushConsumer(this.consumeBoolean);
        }
        else if (next.trimStart().length !== 0 || this.eof) {
            this.popConsumer();
            const bp = this.booleanStartPos;
            this.errors.push({ code: XtnParseErrorCode.MissingBooleanOrNull, start: { line: bp.line, column: bp.column! + 1, index: bp.index! + 1 }, end: undefined, message: "Expected true, false, or null" })
            this.completeValue(new XtnBooleanImpl(null, "", true, undefined, {}, {}));
            return;
        }
    }
    private consumeBoolean(char: string, next: string) {
        // on first entry, char is the first text character in the boolean
        if (!isAsciiLetter(next)) {
            this.popConsumer();
            const text = this.document.substring(this.booleanStartPos.index! + 1, this.pos + 1).trimStart();
            const tu = text.toUpperCase();
            if (tu === "TRUE")
                this.completeValue(new XtnBooleanImpl(true, text, true, undefined, {}, {}));
            else if (tu === "FALSE")
                this.completeValue(new XtnBooleanImpl(false, text, true, undefined, {}, {}));
            else if (tu === "NULL")
                this.completeValue(new XtnBooleanImpl(null, text, true, undefined, {}, {}));
            else {
                this.errors.push({ code: XtnParseErrorCode.UnrecognizedToken, start: { line: this.lineNo, column: this.colNo + 1 - text.length, index: this.pos + 1 - text.length }, end: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, message: "Expected true, false, or null" });
                this.completeValue(new XtnBooleanImpl(null, text, true, undefined, {}, {}));
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
        if (this.currentScopeState.allowKeys && next !== '\n' && next.trimStart().length === 0) {
            return;
        }
        this.popConsumer();
        const str = this.document.substring(this.unquotedTextStartPos, this.pos + 1).trimEnd().replace(/\s/g, ' ');
        const k = new XtnKeyImpl(str, false, {line: this.lineNo, column: this.colNo - (this.pos - this.unquotedTextStartPos), index: this.unquotedTextStartPos}, {line: this.lineNo, column: this.colNo + 1, index: this.pos + 1});
        if (this.currentScope instanceof XtnKeyValuePairImpl || this.eof) {
            this.interpretAndCompleteValue(k);
        }
        else {
            this.rawText = k;
        }
    }

    private exprStartPos = -1;
    private openAngles = 0;
    private startExpression(char: string, next: string) {
        this.exprStartPos = this.pos;
        this.openAngles = 0;
        const identifier = new XtnIdentifierImpl({}, {});
        this.pushScope(new XtnExpressionImpl(identifier), false)
        this.pushScope(identifier, false);
        this.segPrevCharPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        this.pushConsumer(this.consumeLeadingSegmentSpace);
        this.consumeLeadingSegmentSpace(char, next);
    }
    private segPrevCharPos: XtnCharPosition = {};
    private consumeLeadingSegmentSpace(char: string, next: string) {
        // on first entry char is the character before the segment starts
        if (next === '_' || isAsciiLetter(next)) {
            this.popConsumer();
            this.segStartPos = this.pos + 1;
            this.pushConsumer(this.consumeIdentifierSegment);
        }
        else {
            if (next.trimStart().length === 0 && !this.eof) {
                return;
            }
            const sp = this.segPrevCharPos;
            this.errors.push({ code: XtnParseErrorCode.MissingIdentifierName, start: { line: sp.line, column: sp.column! + 1, index: sp.index! + 1 }, end: undefined, message: "Expected an identifier name" });
            this.pushScope(new XtnIdentifierSegmentImpl("", {}, {}), false);
            this.popConsumer();
            this.pushConsumer(this.consumeTrailingSegNameSpace);
            this.consumeTrailingSegNameSpace(char, next);
        }
    }
    private segStartPos = -1;
    private consumeIdentifierSegment(char: string, next: string) {
        // on first entry, char is the first non-space character of a segment
        if (isKeyLetter(next))
            return;
        const name = this.document.substring(this.segStartPos, this.pos + 1);
        this.pushScope(new XtnIdentifierSegmentImpl(name, {}, {}), false);
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
            const arg = this.completeIdentifier();
            (this.currentScope as XtnIdentifierSegmentImpl).args.push(arg);
        }
        else if (next === '>') {
            this.popConsumer();
            const arg = this.completeIdentifier();
            (this.currentScope as XtnIdentifierSegmentImpl).args.push(arg);
            --this.openAngles;
            this.popConsumer();
            this.pushConsumer(this.consumeTrailingSegNameSpace);
        }
        else if (next === '.') {
            const seg = this.popScope() as XtnIdentifierSegmentImpl;
            (this.currentScope as XtnIdentifierImpl).segments.push(seg);
            this.popConsumer();
            this.segPrevCharPos = { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 };
            this.pushConsumer(this.consumeLeadingSegmentSpace);
        }
        else if (next === '(') {
            this.recoverFromOpenAngles();
            this.completeIdentifier();
            this.popConsumer();
            this.pushConsumer(this.consumeIdentArgsOpen);
        }
        else if (next === '{') {
            this.recoverFromOpenAngles();
            this.completeIdentifier();
            this.popConsumer();
            this.pushConsumer(this.consumeInitializer);
        }
        else {
            this.recoverFromOpenAngles();
            this.completeIdentifier();
            this.popConsumer();
            const expr = this.popScope();
            if (expr instanceof XtnExpressionImpl) {
                this.completeValue(expr);
            }
        }
    }
    private recoverFromOpenAngles() {
        if (this.openAngles > 0) {
            this.errors.push({ code: XtnParseErrorCode.MissingClosingAngledBracket, start: { line: this.lineNo, column: this.colNo + 1, index: this.pos + 1 }, end: undefined, message: `Expected ${this.openAngles} closing angled brackets` });
        }
        while (this.openAngles > 0) {
            this.popConsumer();
            const arg = this.completeIdentifier();
            (this.currentScope as XtnIdentifierSegmentImpl).args.push(arg);
            --this.openAngles;
        }
    }
    private consumeSegArgs(char: string, next: string) {
        const identifier = new XtnIdentifierImpl({}, {});
        this.pushScope(identifier, false);
        this.segPrevCharPos = { line: this.lineNo, column: this.colNo, index: this.pos };
        this.pushConsumer(this.consumeLeadingSegmentSpace);
        this.consumeLeadingSegmentSpace(char, next);
    }
    private completeIdentifier() {
        const seg = this.popScope() as XtnIdentifierSegmentImpl;
        const identifier = this.popScope() as XtnIdentifierImpl;
        identifier.segments.push(seg);
        identifier.complete();
        return identifier;
    }
    private consumeIdentArgsOpen(char: string, next: string) {
        const expr = this.currentScope as XtnExpressionImpl;
        const funcArgs = new XtnArgsImpl({}, {});
        expr.args = funcArgs;
        this.pushScope(funcArgs, true);
        this.popConsumer();
        this.pushConsumer(this.consumeFuncArgs);
    }
    private consumeFuncArgs(char: string, next: string) {
        this.consumeInner(char, next, false);
    }
    private consumeInitializer(char: string, next: string) {
        const expr = this.currentScope as XtnExpressionImpl;
        const init = new XtnObjectImpl({}, {});
        expr.initializer = init;
        this.pushScope(init, true);
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

type ParseResult = { succeeded: true; result: XtnValue; } | { succeeded: false; partial: XtnValue; errors: XtnParseError[]; }

export function parseXtn(document: string): XtnValue {
    const pr = tryParseXtn(document);
    if (pr.succeeded) return pr.result;
    const err = pr.errors[0];
    throw new Error(`Line: ${err.start.line}, Col: ${err.start.column}, ${err.message}`);
}
export function tryParseXtn(document: string): ParseResult {
    const p = new Parser(document);
    const rootObj = p.parse();
    let result, first;
    if (rootObj.items.length === 1 && (first = rootObj.items[0]).type !== "keyvaluepair" && !first.childMarkerPosition) {
        result = first;
    }
    else {
        result = rootObj;
    }
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
        case "expression":
            strs.push("= ");
            strs.push(element.identifier.name);
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