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
        if (env?.integerType === "bigint")
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
    // TODO: implement logic as per JSON5
    return JSON.parse(str);
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

    private completeValue(value: XtnValueImpl) {
        const parent = this.getCurrentParent();
        if (parent instanceof XtnKeyValuePairImpl) {
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
        this.processChar(char, '\0');
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
        if (char === '\n') {
            // error
        }
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

    private startKeyValueSeparator() {
        this.pushStack(this.consumeSeparator);
        const keyValuePair = new XtnKeyValuePairImpl(this.rawText instanceof XtnQStringImpl ? new XtnKeyImpl(this.rawText.value, true, this.rawText.posStart, this.rawText.posEnd) : this.rawText!);
        this.parentsStack.push(keyValuePair);
        this.rawText = null;
    }
    private consumeSeparator(char: string, next: string) {
        // on first entry, char is the first character after a colon
        if (char.trimStart().length === 0)
            return true;
        this.popStack();
        if (char === '{') {
            this.startObject();
        }
        else if (char === '[') {
            this.startArray();
        }
        else if (char === "`") {
            this.startSingleLineStringValue();
        }
        else if (char === '"' || char === "'") {
            this.startQuote(char, next);
        }
        else if (char === '%') {
            this.startExplicitInteger(char, next);
        }
        else if (char === '~') {
            this.startExplicitRealNumber();
        }
        else if (char === '@') {
            this.startDateTime();
        }
        else if (char === '?') {
            this.startExplicitBoolean(next);
        }
        else if ((char === '-' && isAsciiNumber(next)) || isAsciiNumber(char)) {
            this.startImplicitNumber(char, next);
        }
        else {
            const cn = char.codePointAt(0)!;
            //a-z or A-Z or - or _
            if ((cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95)
                this.startUnquotedText(false);
            else {
                //error
            }
        }
        return true;
    }

    private startObject() {
        this.pushStack(this.consumeObject);
        this.parentsStack.push(new XtnObjectImpl({}, {}));
    }
    private consumeObject(char: string, next: string) {
        return this.consumeInner(char, next, true)
    }
    private consumeInner(char: string, next: string, allowKeys: boolean) {
        if (char === ":") {
            this.startKeyValueSeparator();
            return true;
        }
        if (this.rawText instanceof XtnQStringImpl) {
            this.completeValue(this.rawText);
            this.rawText = null;
        }
        if (char.trimStart().length === 0) {
            return true;
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
            this.startSingleLineStringValue();
        }
        else if (char === '%') {
            this.startExplicitInteger(char, next);
        }
        else if (char === '~') {
            this.startExplicitRealNumber();
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
        else if ((char === '-' && isAsciiNumber(next)) || isAsciiNumber(char)) {
            this.startImplicitNumber(char, next);
        }
        else {
            const cn = char.codePointAt(0)!;
            //a-z or A-Z or - or _
            if ((cn >= 65 && cn <= 90) || (cn >= 97 && cn <= 122) || cn === 45 || cn === 95)
                this.startUnquotedText(allowKeys);
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
    private intValue = 1n;
    private integerExplicit = false;
    private startExplicitInteger(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = this.pos;
        this.integerExplicit = true;
        this.pushStack(this.consumeLeadingIntegerWhitespace);
        this.consumeLeadingIntegerWhitespace(char, next);
    }
    private consumeLeadingIntegerWhitespace(char: string, next: string) {
        // on first entry, char is the character before the integer
        if (next.trimStart().length === 0) {
            return true;
        }
        if (next === '-' || isAsciiNumber(next)) {
            this.popStack();
            this.pushStack(this.consumePotentialMinus);
        }
        return true;
    }
    private consumePotentialMinus(char: string, next: string) {
        // on first entry, char is a minus sign or the first digit
        this.popStack();
        this.pushStack(this.consumeStartingIntDigits);
        if (char === '-') {
            this.intValue = -1n;
            if (!isAsciiNumber(next)) {
                // error
            }
        }
        else {
            this.consumeStartingIntDigits(char, next);
        }
        return true;
    }
    private consumeStartingIntDigits(char: string, next: string) {
        // on first entry, char is the first digit of the integer or the 0 in 0x
        this.popStack();
        if (char === '0' && next === 'x' || next === 'X') {
            this.pushStack(this.consumeHexStart);
        }
        else {
            let d = decDigit(char);
            if (d !== 0n)
                this.intValue *= d!;
            this.isLeadingZero = char === '0';
            this.pushStack(this.consumeInteger);
            this.consumeInteger(char, next);
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
            const text = this.document.substring(this.numberStartPos + (this.integerExplicit ? 1 : 0), this.pos + 1).trimStart();
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
    
    private consumeInteger(char: string, next: string) {
        // on first entry, char is the first digit but it has already been considered
        if (this.isLeadingZero) {
            if (next === '0')
                return true;
        }
        const d = decDigit(next);
        if (d === null) {
            this.popStack();
            const text = this.document.substring(this.numberStartPos + (this.integerExplicit ? 1 : 0), this.pos + 1).trimStart();
            if (this.isLeadingZero)
                this.intValue = 0n;
            this.completeValue(new XtnIntegerImpl(this.intValue, text, true, undefined, {}, {}));
            return true;
        }
        if (this.isLeadingZero)
            this.intValue *= d;
        else
            this.intValue = this.intValue * 10n + (this.intValue > 0 ? 1n : -1n) * d;
        this.isLeadingZero = false;
        return true;
    }

    private startExplicitRealNumber() {

    }
    private startImplicitNumber(char: string, next: string) {
        this.intValue = 1n;
        this.numberStartPos = this.pos;
        this.integerExplicit = false;
        this.pushStack(this.consumePotentialMinus);
        this.consumePotentialMinus(char, next);
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
            else {
                // error
            }
        }
        return true;
    }


    private startSingleLineStringValue() {
        this.pushStack(this.consumeSingleLineStringValue);
        this.singleLineStringStartPos = this.pos;
    }
    private singleLineStringStartPos = -1;
    private consumeSingleLineStringValue(char: string, next: string) {
        // on first entry, char is the first character after '
        if (char === '\n') {
            this.popStack();
            const str = this.document.substring(this.singleLineStringStartPos + 1, this.pos).trim().replace(/\s/g, ' ');
            const sStr = new XtnSStringImpl(str, undefined, {}, {});
            this.completeValue(sStr);
        }
        return true;
    }

    private unquotedTextStartPos = -1;
    private allowUnquotedTextToBeKey: boolean = false;
    private startUnquotedText(allowKey: boolean) {
        this.unquotedTextStartPos = this.pos;
        this.canBeBoolOrNull = true;
        this.allowUnquotedTextToBeKey = allowKey;
        this.pushStack(this.consumeUnquotedText);
    }
    private canBeBoolOrNull = false;
    private consumeUnquotedText(char: string, next: string) {
        // on first entry, char is the second character of the unquoted text
        if (this.allowUnquotedTextToBeKey && char === ':') {
            this.popStack();
            const str = this.document.substring(this.unquotedTextStartPos, this.pos).trimEnd().replace(/\s/g, ' ');
            this.rawText = new XtnKeyImpl(str, false, {}, {});
            this.startKeyValueSeparator();
        }
        const ws = char.trimStart().length === 0;
        if (ws || '~`!@#$%^&*()+={}[]|\\:;<>"\',.?/'.indexOf(char) >= 0) {
            if (this.canBeBoolOrNull) {
                const text = this.document.substring(this.unquotedTextStartPos, this.pos);
                if (text.length === 4 || text.length === 5) {
                    const upper = text.toUpperCase();
                    let lit = null;
                    if (upper === 'TRUE') {
                        lit = new XtnBooleanImpl(true, text, false, undefined, {}, {});
                    }
                    else if (upper === 'FALSE') {
                        lit = new XtnBooleanImpl(false, text, false, undefined, {}, {});
                    }
                    else if (upper === 'NULL') {
                        lit = new XtnNullImpl(text, {}, {});
                    }
                    if (lit) {
                        this.popStack();
                        this.completeValue(lit);
                        return true;
                    }
                }
                this.canBeBoolOrNull = false;
            }
            if ('({<.+\n'.indexOf(char) >= 0) {
                this.popStack();
                this.pushStack(this.consumeTagName);
                return this.consumeTagName(char, next);
            }
            if (ws) {
                return true;
            }
            else {
                //error: if key, should be quoted, if tag, contains disallowed character
                return true;
            }
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