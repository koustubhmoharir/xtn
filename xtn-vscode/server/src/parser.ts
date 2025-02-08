export enum XtnErrorCode {
    OBJECT_MUST_BE_ON_NEW_LINE = 1,
    ARRAY_MUST_BE_ON_NEW_LINE = 2,
    MULTILINE_MUST_BE_ON_NEW_LINE = 3,
    LINE_MUST_NOT_START_WITH_COLON = 4,
    PLUS_ENCOUNTERED_OUTSIDE_ARRAY = 5,
    ARRAY_ELEMENT_MUST_START_WITH_PLUS = 6,
    MISSING_COLON = 7,
    UNMATCHED_CLOSE_MARKER = 8,
    MISSING_CLOSE_MARKER = 9,
    INDENTATION_MUST_BE_SPACE_OR_TAB = 10,
    INDENTATION_MUST_NOT_BE_MIXED = 11,
    INSUFFICIENT_INDENTATION = 12,
    ARRAY_ELEMENT_MUST_NOT_HAVE_A_KEY = 13,
    OBJECT_KEYS_CANNOT_BE_REPEATED = 14,
    INCORRECT_INDENTATION = 15,
    COLON_EXPECTED_AFTER_BRACE = 16,
    OBJECT_KEY_MISSING_END_QUOTE = 17,
    OBJECT_KEY_SPECIAL_CHARACTERS_NOT_QUOTED = 18,
    OBJECT_KEY_START_PLUS_MINUS_NOT_QUOTED = 18
}

export class XtnException extends Error {
    code: XtnErrorCode;
    message: string;
    line_no: number;
    col_start: number;
    col_end: number;
    obj: XtnObject | null;

    constructor(code: XtnErrorCode, line_no: number, col_start: number, col_end: number, message: string, obj: XtnObject | null) {
        super(message);
        this.code = code;
        this.message = message;
        this.line_no = line_no;
        this.col_start = col_start;
        this.col_end = col_end;
        this.obj = obj;
    }
}

enum _Mode {
    OBJECT = 1,
    ARRAY = 2,
    MULTILINE = 3,
}

interface XtnDate {
    type: "date";
    date: string; 
}

interface XtnTime {
    type: "time";
    time: string;
}

interface XtnDateTime {
    type: "datetime";
    date: string;
    time: string;
}

interface XtnDateTimeOffset {
    type: "datetimeoffset";
    date: string;
    time: string;
    offset: string;
}

type XtnValue =
    | null
    | string
    | bigint
    | number
    | XtnDate
    | XtnTime
    | XtnDateTime
    | XtnDateTimeOffset
    | XtnValue[]
    | Map<string, XtnValue>;

export abstract class XtnElement {
    startLineNo: number | null;
    endLineNo: number | null;
    constructor() {
        this.startLineNo = null;
        this.endLineNo = null;
    }
}

export class XtnComment extends XtnElement {
    value: string;
    prefix: string;

    constructor(value: string, prefix: string = '') {
        super();
        this.value = value;
        this.prefix = prefix;
    }
}

export class XtnDataElement extends XtnElement {
    comments_above: XtnComment[] | null;
    comments_below: XtnComment[] | null;

    constructor(comments_above: XtnComment[] | null = null, comments_below: XtnComment[] | null = null) {
        super();
        this.comments_above = comments_above;
        this.comments_below = comments_below;
    }
}

export const enum XtnScalarType {
    Null = "null",
    String = "string",
    Int = "int",
    Float = "float",
    Bool = "bool",
    Time = "time",
    Text = "text"
}

export class XtnScalar extends XtnDataElement {
    text_value: string;
    type: XtnScalarType;

    constructor(text_value: string, type: XtnScalarType, comments_above: XtnComment[] | null = null, comments_below: XtnComment[] | null = null) {
        super(comments_above, comments_below);
        this.text_value = text_value;
        this.type = type;
    }
}

export class XtnArray extends XtnDataElement {
    elements: XtnDataElement[];
    comments_inner_top: XtnComment[] | null;
    comments_inner_bottom: XtnComment[] | null;

    constructor(elements: XtnDataElement[], comments_above: XtnComment[] | null = null, comments_inner_top: XtnComment[] | null = null, comments_inner_bottom: XtnComment[] | null = null, comments_below: XtnComment[] | null = null) {
        super(comments_above, comments_below);
        this.elements = elements;
        this.comments_inner_top = comments_inner_top;
        this.comments_inner_bottom = comments_inner_bottom;
    }
}

function isWhiteSpace(str: string) {
    if (str.length > 0) return false;
    return str.trimEnd().length === 0;
}

function hasNon32Whitespace(str: string) {
    for (const s of str.matchAll(/\s/g)) {
        if (s[0] !== ' ') return true;
    }
    return false;
}

const disallowed_in_key = /["`:!#~?@{}[\]]/;

export class XtnObject extends XtnDataElement {
    tag_name: string;
    elements: Map<string, XtnDataElement>;
    comments_inner_top: XtnComment[] | null;
    comments_inner_bottom: XtnComment[] | null;

    constructor(tag_name: string, elements: Map<string, XtnDataElement> | null = null, comments_above: XtnComment[] | null = null, comments_inner_top: XtnComment[] | null = null, comments_inner_bottom: XtnComment[] | null = null, comments_below: XtnComment[] | null = null) {
        super(comments_above, comments_below);
        this.tag_name = tag_name;
        this.elements = elements ?? new Map();
        this.comments_inner_top = comments_inner_top;
        this.comments_inner_bottom = comments_inner_bottom;
    }

    static load(lines: string[]): XtnObject {
        const obj = new XtnObject("");
        _loadFromLines(lines, obj);
        return obj;
    }

    dump() {
        let output = "";
        const write = (...s: string[]) => {
            output = output.concat(...s, '\n');
        };

        const write_comment = (comment: XtnComment, indent: string) => {
            const value = comment.value;
            const lines = breakIntoLines(value);
            let i = -1;
            for (let line of lines) {
                ++i;
                line = line.trimEnd();
                if (i === 0 && comment.prefix) {
                    write(indent, '%%', comment.prefix, ' ', line);
                }
                else if (line.length === 0) {
                    write();
                }
                else {
                    write(indent, '% ', line);
                }
            };
        }
        const write_comments = (comments: XtnComment[] | null, indent: string) => {
            if (comments?.length) {
                for (const comment of comments) {
                    write_comment(comment, indent);
                }
            }
        }
        const quote_name_if_reqd = (name: string) => {
            if (name.match(disallowed_in_key) || name.match(/^%\+-/))
                return '"' + name.replace(/`/g, "``").replace(/"/g, '`"') + '"';
            return name;
        }
        
        const write_pair = (name: string, element: XtnDataElement, indent: string) => {
            write_comments(element.comments_above, indent);
            if (element instanceof XtnArray) {
                write(indent, quote_name_if_reqd(name), '[]:');
                const innerIndent = indent + '    ';
                write_comments(element.comments_inner_top, innerIndent);
                for (const arrayElement of element.elements) {
                    write_pair('+', arrayElement, innerIndent);
                }
                write_comments(element.comments_inner_bottom, innerIndent);
                write(indent, '----');
            }
            else if (element instanceof XtnObject) {
                write(indent, quote_name_if_reqd(name), `{${element.tag_name}}:`);
                const innerIndent = indent + '    ';
                write_comments(element.comments_inner_top, innerIndent);
                for (const [key, value] of element.elements) {
                    write_pair(key, value, innerIndent);
                }
                write_comments(element.comments_inner_bottom, innerIndent);
                write(indent, '----');
            }
            else if (element instanceof XtnScalar) {
                const text_value = element.text_value;
                if (element.type == XtnScalarType.Text) {
                    const lines = text_value.length === 0 ? [] : text_value.split(/\r?\n/);
                    write(indent, quote_name_if_reqd(name), "``:");
                    const child_indent = indent + '    ';
                    for (let line of lines) {
                        write(child_indent, line);
                    }
                    write(indent, '----');
                }
                else {
                    write(indent, quote_name_if_reqd(name), ": ", text_value);
                }
            }
            write_comments(element.comments_below, indent);
            
        };

        write_comments(this.comments_inner_top, '');
        for (const [key, value] of this.elements) {
            write_pair(key, value, '');
        }
        write_comments(this.comments_inner_bottom, '');
    }
}



function _make_Xtn(value: any, tag_name: string): XtnArray | XtnObject | XtnScalar {
    if (Array.isArray(value)) {
        return new XtnArray(value);
    } else if (value instanceof Map) {
        return new XtnObject(tag_name, value);
    } else {
        return new XtnText(value);
    }
}

function _convert_spaces(value: string, collapse: boolean): string {
    const pattern = collapse ? /\s+/g : /\s/g;
    return value.replace(pattern, ' ');
}

export function convert_key(value: string, raise_key_error: (code: XtnErrorCode, msg: string, length: number) => void) {
    if (value.startsWith('"')) {
        if (value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
            value = value.replace(/""|`[x|u]\{([0-9a-e]+)\}|`./g, (e, u) => {
                if (e === '""') return '"';
                if (e.length > 2) {//unicode escape
                    //interpret u to hexadecimal unicode code point
                }
                switch (e[1]) {
                    case '`':
                        return '`';
                    case '0':
                        return '\0';
                    case '"':
                        return '"';
                    case "'":
                        return "'";
                    case 't':
                        return '\t';
                    case 'r':
                        return '\r';
                    case 'n':
                        return '\n';
                    case 'v':
                        return '\v';
                    case 'b':
                        return '\b';
                    case 'f':
                        return '\f';
                }
            });
        }
        else {
            raise_key_error(XtnErrorCode.OBJECT_KEY_MISSING_END_QUOTE, "Object key has a missing closing double quote", value.length);
        }
    }
    else if (value.match(disallowed_in_key)) {
        raise_key_error(XtnErrorCode.OBJECT_KEY_SPECIAL_CHARACTERS_NOT_QUOTED, "Object key with any of the characters \"`:!#~?@{}[] must be enclosed in double quote", value.length);
    }
    else if (value.match(/[+-]/)) {
        raise_key_error(XtnErrorCode.OBJECT_KEY_START_PLUS_MINUS_NOT_QUOTED, "Object key that starts with + or - must be enclosed in double quote", value.length);
    }
    return value;
    return _convert_spaces(value, true);
}

export function convert_simple_value(value: string) {
    return _convert_spaces(value, false);
}

function trimLeadingSpaceOrTab(str: string, char: string) {
    if (char === ' ')
        return str.replace(/^ */, '');
    return str.replace(/^\t*/, '');
}

function find_closing_quote(str: string, qi: number) {
    while (true) {
        const nqi = str.indexOf('"', qi + 1);
        if (nqi >= 0) {
            if (str[nqi - 1] === '`') {
                // next quote is escaped, so it is not closing quote.
                qi = nqi;
                continue;
            }
            // found closing quote.
            return nqi;
        }
        // No closing quote found
        return -1;
    }
}

function find_closing_brace(str: string, bi: number) {
    let i = bi;
    let cbi = str.indexOf('}', i + 1);
    let count = 1;
    while (cbi >= 0) {
        const nbi = str.indexOf('{', i + 1);
        if (nbi < 0 || nbi > cbi) {
            --count;
            if (count === 0) return cbi;
            i = cbi;
            cbi = str.indexOf('}', i + 1);
        }
        else {
            ++count;
            i = nbi;
        }
    }
    return -1;
}

function partition_after_brace(str: string, bi: number) {
    const cbi = find_closing_brace(str, bi);
    if (cbi >= 0) {
        const ci = str.indexOf(':', cbi + 1);
        if (ci >= 0) {
            return [str.substring(0, bi), str.substring(bi + 1, ci), ':', str.substring(ci + 1)];
        }
    }
    // invalid
    return [str, '', '', ''];
}

export function partition(str: string) {
    if (str.startsWith('-')) {
        // an unquoted name cannot start with -
        return [str, '', '', ''];
    }
    let m = str.match(/[:"{]/);
    if (m) {
        switch (m[0]) {
            case ':':
                return [str.substring(0, m.index), "", ':', str.substring(m.index! + 1)];
            case '{': {
                const bi = m.index!;
                return partition_after_brace(str, bi);
            }
            case '"': {
                const qi = m.index!;
                const cqi = find_closing_quote(str, qi);
                if (cqi >= 0) {
                    m = str.substring(cqi + 1).match(/[:{]/);
                    if (m) {
                        if (m[0] === ':') {
                            const ci = cqi + 1 + m.index!;
                            return [str.substring(0, ci), "", ':', str.substring(ci + 1)];
                        }
                        else {// m[0] === '{'
                            const bi = cqi + 1 + m.index!;
                            return partition_after_brace(str, bi);
                        }
                    }
                    // no colon, handle later
                    break;
                }
                else {// invalid
                    return [str, '', '', ''];
                }
            }
        }
    }
    
    // No colon found that is not inside quotes
    if (str.endsWith('!'))
        return [str.substring(0, str.length - 1), '', '!', ''];
    return [str, '', '', ''];
}

class _ObjectState {
    start_line: number;
    current: Map<string, any>;
    target: XtnObject | null;
    in_array: boolean;
    mode: 'OBJECT' = 'OBJECT';

    constructor(start_line: number, current: Map<string, any>, target: XtnObject | null, in_array: boolean) {
        this.start_line = start_line;
        this.current = current;
        this.target = target;
        this.in_array = in_array;
    }

    set(name: string, value: Map<string, any> | any[] | string, tag_name: string, raise_key_error: (code: XtnErrorCode, msg: string, length: number) => void, complexSetter?: [(v: string) => void]) {
        const len = name.length;
        name = convert_key(name, raise_key_error);
        if (typeof value === 'string') {
            value = _convert_spaces(value, false);
        }
        if (this.current.has(name)) {
            raise_key_error(XtnErrorCode.OBJECT_KEYS_CANNOT_BE_REPEATED, `Object keys cannot be repeated. ${name} already exists.`, len);
            name += '+' + (Object.keys(this.current).length + 1);
        }
        if (this.target == null) {
            this.current.set(name, value);
            if (complexSetter)
                complexSetter[0] = v => this.current.set(name, v);
            return null;
        }
        else {
            const child = _make_Xtn(value, tag_name);
            this.current.set(name, child);
            if (complexSetter)
                complexSetter[0] = v => (child as XtnScalar).text_value = v;
            return child;
        }
    }
}

class _ArrayState {
    start_line: number;
    current: any[];
    target: XtnArray | null;
    mode: 'ARRAY' = 'ARRAY';

    constructor(start_line: number, current: any[], target: XtnArray | null) {
        this.start_line = start_line;
        this.current = current;
        this.target = target;
    }

    set(name: string, value: Map<string, any> | any[] | string, tag_name: string, raise_error: (code: XtnErrorCode, msg: string, length: number) => void, complexSetter?: [(v: string) => void]) {
        name = convert_key(name);
        if (typeof value === 'string') {
            value = _convert_spaces(value, false);
        }
        if (name !== '+') {
            if (name.startsWith('+'))
                raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_NOT_HAVE_A_KEY, 'An array element cannot be named', name.length);
            else
                raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, 'An array element must start with a plus', name.length);
        }
        if (this.target === null) {
            this.current.push(value);
            if (complexSetter) {
                const i = this.current.length - 1;
                complexSetter[0] = v => this.current[i] = v;
            }
            return null;
        }
        else {
            const child = _make_Xtn(value, tag_name);
            this.current.push(child);
            if (complexSetter) {
                complexSetter[0] = v => (child as XtnScalar).text_value = v;
            }
            return child;
        }
    }
}

class _MultilineState {
    start_line: number;
    startCol: number;
    indent: string;
    target: XtnText | null;
    setter: (v: string) => void;
    indent_char: string = ' ';
    exp_indent: string | null = null;
    text: string = '';
    mode: 'MULTILINE' = 'MULTILINE';

    constructor(start_line: number, startCol: number, target: XtnText | null, setter: (v: string) => void, indent: string) {
        this.start_line = start_line;
        this.startCol = startCol;
        this.target = target;
        this.setter = setter;
        this.indent = indent;
    }
}

export function breakIntoLines(document: string) {
    const lines = [...document.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)];
    lines.pop();
    return lines.map(m => m[0]);
}

export function trimEndOfLine(line: string) {
    if (line.endsWith('\r\n'))
        return line.substring(0, line.length - 2);
    const last = line.substring(line.length - 1);
    if (last === '\r' || last === '\n')
        return line.substring(0, line.length - 1);
    return line;
}

function _load(document: string, target: XtnObject | null): Map<string, any> {
    const lines = breakIntoLines(document);
    return _loadFromLines(lines, target);
}
function _loadFromLines(lines: string[], target: XtnObject | null): Map<string, any> {
    const top_level: Map<string, any> = target == null ? new Map() : target.elements;
    const stack: (_ObjectState | _ArrayState | _MultilineState)[] = [
        new _ObjectState(-1, top_level, target, false)
    ];

    const commentsUp: XtnComment[] | null = target != null ? [] : null;
    const commentsDown: XtnComment[] | null = target != null ? [] : null;
    let upProp = 'inner';
    let upTarget: XtnDataElement | null = target;

    function attach_comments(target: XtnDataElement | null): void {
        if (target == null) return;
        if (commentsUp?.length) {
            if (upProp === 'inner')
                (upTarget as XtnArray | XtnObject).comments_inner_top = commentsUp.slice();
            else
                upTarget!.comments_below = commentsUp.slice();
            commentsUp.length = 0;
        }
        if (commentsDown?.length) {
            target.comments_above = commentsDown.slice();
            commentsDown.length = 0;
        }
        upTarget = target;
        upProp = target instanceof XtnScalar ? 'below' : 'inner';
    }

    function attach_trailing_comments(target: XtnDataElement | null): void {
        if (target == null) return;
        if (commentsUp?.length) {
            if (upProp === 'inner')
                (upTarget as XtnArray | XtnObject).comments_inner_top = commentsUp.slice();
            else
                upTarget!.comments_below = commentsUp.slice();
            commentsUp.length = 0;
        }
        if (commentsDown?.length) {
            (target as XtnArray | XtnObject).comments_inner_bottom = commentsDown.slice();
            commentsDown.length = 0;
        }
        upTarget = target;
        upProp = 'below';
    }

    let i = -1;
    let orig_line: string;
    let leftColStart: number;
    let firstException: XtnException | null = null;

    function record_comment(line: string): void {
        if (commentsDown !== null) {
            let comment: XtnComment;
            if (line.length === 0) {
                commentsDown.push(comment = new XtnComment(''));
            }
            else {
                let prefix = '';
                if (line.startsWith('%%')) {
                    if (line.startsWith('%%%%')) {
                        line = line.substring(4).trimStart();
                        prefix = '%%';
                    }
                    else {
                        line = line.substring(2).trimStart();
                        prefix = line.match(/^\s*([^\s]*)/)?.[1] ?? ''; // prefix is first word
                        if (prefix.length)
                            line = line.substring(line.indexOf(prefix[0]) + prefix.length).trimStart(); // rest of line after prefix with whitespace trimmed from the start
                    }
                }
                else if (line.length > 0) {
                    // we know line starts with %
                    // take the rest of the line after it, dropping the first character after the % if it is whitespace
                    // additional whitespace is not dropped
                    line = line.substring(line[1].trimStart().length === 0 ? 2 : 1);
                }
                
                if (prefix === '%%') {
                    commentsDown.push(comment = new XtnComment(line, prefix));
                    commentsUp?.push(...commentsDown);
                    commentsDown.length = 0
                }
                else if (isWhiteSpace(line)) {
                    commentsDown.push(comment = new XtnComment(''));
                }
                else {
                    commentsDown.push(comment = new XtnComment(line, prefix));
                }
            }
            comment.startLineNo = i;
        }
    }
    function raise_error_actual(ex: XtnException) {
        if (target != null) {
            if (ex.code === XtnErrorCode.MISSING_COLON || ex.code === XtnErrorCode.OBJECT_KEYS_CANNOT_BE_REPEATED) {
                if (!firstException) firstException = ex;
                return;
            }
            if (firstException) throw firstException;
        }
        throw ex;
    }
    function raise_error(code: XtnErrorCode, msg: string, colStart: number, colEnd: number) {
        raise_error_actual(new XtnException(code, i, colStart, colEnd, msg, target));
    }
    let keyLineNo = i;
    function raise_key_error(code: XtnErrorCode, msg: string, length: number) {
        raise_error_actual(new XtnException(code, keyLineNo, leftColStart, leftColStart + length, msg, target));
    }
    for (orig_line of lines) {
        i++;
        let line: string = orig_line;
        const state = stack[stack.length - 1];
        if (state.mode === 'MULTILINE') {
            // TODO: Add support for escape sequences for unicode and line endings
            if (state.exp_indent == null) {
                if (state.indent.length > 0) {
                    state.indent_char = state.indent[0];
                    state.exp_indent = state.indent + state.indent_char.repeat(state.indent_char === '\t' ? 1 : 4);
                }
                else if (line[0] === '\t') {
                    state.exp_indent = '\t';
                    state.indent_char = '\t';
                }
                else {
                    state.exp_indent = '    ';
                    state.indent_char = ' ';
                }
            }
            const exp_indent_len = state.exp_indent.length;
            let act_indent_len = 0;
            
            let prefix = line.substring(0, exp_indent_len);
            const act_indent = prefix.substring(0, prefix.length - trimLeadingSpaceOrTab(prefix, state.indent_char).length);
            act_indent_len = act_indent.length;
            prefix = prefix.substring(act_indent_len, act_indent_len + 1);
            if (act_indent_len < exp_indent_len && isWhiteSpace(prefix) && prefix !== '\n' && prefix !== '\r') {
                const colStart = orig_line.indexOf(prefix[0]);
                raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 'Indentation for a complex text value can use either spaces or tabs but not both', colStart, colStart + 1);
            }
            line = line.substring(act_indent_len);
            if (act_indent_len < exp_indent_len) {
                if (line.startsWith('----') && line.substring(4).trimEnd().length === 0) {
                    if (act_indent_len == state.indent.length) {
                        state.setter(trimEndOfLine(state.text));
                        const child_target = state.target;
                        if (child_target != null)
                            child_target.endLineNo = i;
                        stack.pop();
                        continue;
                    }
                    raise_error(XtnErrorCode.INCORRECT_INDENTATION, 'The indentation on the closing line for a complex text value must exactly match the key line', 0, orig_line.indexOf('-'));
                }
                if (prefix !== '\n' && prefix !== '\r') {
                    raise_error(XtnErrorCode.INSUFFICIENT_INDENTATION, 'Lines of complex text must be indented by 4 spaces or a tab compared to the key line', 0, act_indent_len);
                }
            }
            state.text += line;
            state.setter(state.text);
        }
        else {
            line = line.trim();
            if (line.startsWith('%')) {
                record_comment(line);
                continue;
            }
            if (line.length === 0) {
                record_comment(line);
                continue;
            }
            let [left, braced, sep, right] = partition(line);
            const origleftLen = left.length;
            left = left.trimEnd();
            braced = braced.trimEnd();
            right = right.trimStart();
            if (sep === ':' || sep === '!') {
                if (left.length === 0) {
                    // TODO: A line can actually start with a colon in the unlikely case that the entire file is a single string
                    const colStart = orig_line.indexOf(':');
                    raise_error(XtnErrorCode.LINE_MUST_NOT_START_WITH_COLON, 'A line cannot start with a colon', colStart, colStart + 1);
                }
                leftColStart = orig_line.indexOf(left[0]);
                if (left.startsWith('+') && state.mode === 'OBJECT') {
                    raise_error(XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY, 'A line cannot start with a plus outside the context of an array', leftColStart, leftColStart + 1);
                }

                if (braced && sep === ':') {
                    if (!braced.endsWith('}')) {
                        const colStart = leftColStart + origleftLen + braced.indexOf('}') + 1;
                        raise_error(XtnErrorCode.COLON_EXPECTED_AFTER_BRACE, "A colon must follow the closing brace of an object", colStart, leftColStart + origleftLen + braced.length);
                    }
                    const tag_name = _convert_spaces(braced.substring(1, left.length - 1).trim(), true);
                    if (right.length > 0) {
                        const colEnd = orig_line.lastIndexOf(right[right.length - 1]) + 1;
                        raise_error(XtnErrorCode.OBJECT_MUST_BE_ON_NEW_LINE, 'An object must start on a new line', colEnd - right.length, colEnd);
                    }
                    const obj: Map<string, any> = new Map();
                    keyLineNo = i;
                    const child_target = state.set(left, obj, tag_name, raise_key_error);
                    if (child_target) child_target.startLineNo = i;
                    attach_comments(child_target);
                    stack.push(new _ObjectState(i, obj, child_target as XtnObject, state.mode === 'ARRAY'));
                }
                else if (left.endsWith('[]')) {
                    if (right.length > 0) {
                        const colEnd = orig_line.lastIndexOf(right[right.length - 1]) + 1;
                        raise_error(XtnErrorCode.ARRAY_MUST_BE_ON_NEW_LINE, 'An array must start on a new line', colEnd - right.length, colEnd);
                    }
                    const name = left.substring(0, left.length -2).trimEnd();
                    const obj: any[] = [];
                    keyLineNo = i;
                    const child_target = state.set(name, obj, '', raise_key_error);
                    if (child_target) child_target.startLineNo = i;
                    attach_comments(child_target);
                    stack.push(new _ArrayState(i, obj, child_target as XtnArray));
                }
                else if (left.endsWith("``")) {
                    const indent = orig_line.substring(0, orig_line.indexOf(left[0]));
                    if (indent.length > 0) {
                        const indent_char = indent[0];
                        if (indent_char != ' ' && indent_char != '\t') {
                            const colStart = orig_line.indexOf(indent_char);
                            raise_error(XtnErrorCode.INDENTATION_MUST_BE_SPACE_OR_TAB, 'Indentation for a complex text value must be a space (32) or tab (9) character', colStart, colStart + 1);
                        }
                        const trimmedIndent = trimLeadingSpaceOrTab(indent, indent_char);
                        if (trimmedIndent.length > 0) {
                            const colStart = orig_line.indexOf(trimmedIndent[0]);
                            let colEnd = indent.lastIndexOf(indent_char);
                            if (colEnd < colStart) colEnd = indent.length;
                            raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 'Indentation for a complex text value can use either spaces or tabs but not both', colStart, colEnd);
                        }
                    }
                    const name = left.slice(0, left.length - 2).trimEnd();
                    if (right.length > 0) {
                        const colEnd = orig_line.lastIndexOf(right[right.length - 1]) + 1;
                        raise_error(XtnErrorCode.MULTILINE_MUST_BE_ON_NEW_LINE, 'A multiline value must start on a new line', colEnd - right.length, colEnd);
                    }
                    keyLineNo = i;
                    const setter = [null] as unknown as [(v: string) => void];
                    const child_target = state.set(name, '', '', raise_key_error, setter) as XtnText | null;
                    if (child_target) {
                        child_target.startLineNo = i;
                        child_target.force_multiline = true;
                    }
                    attach_comments(child_target);
                    stack.push(new _MultilineState(i, orig_line.indexOf(left[0]), child_target, setter[0], indent));
                }
                else {
                    keyLineNo = i;
                    const child_target = state.set(left, right, raise_key_error);
                    if (child_target) child_target.startLineNo = i;
                    attach_comments(child_target);
                }
            }
            else if (left.startsWith('----') && left.substring(4).trimEnd().length === 0) {
                const target = stack[stack.length - 1].target;
                if (target) {
                    target.endLineNo = i;
                    attach_trailing_comments(target);
                }
                stack.pop();
                if (stack.length === 0) {
                    const colStart = orig_line.indexOf('-');
                    raise_error(XtnErrorCode.UNMATCHED_CLOSE_MARKER, 'The close marker ---- does not match any open object or array', colStart, colStart + 4);
                }
            }
            else {
                const colStart = orig_line.indexOf(left[0]);
                if (state.mode === 'ARRAY') {
                    if (left[0] === '+') {
                        raise_error(XtnErrorCode.MISSING_COLON, 'A colon was expected', colStart + 1, colStart + 2);
                    }
                    else {
                        raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, 'An array element must start with a plus', colStart, colStart + left.length);
                    }
                }
                else {
                    raise_error(XtnErrorCode.MISSING_COLON, 'A colon was expected', colStart, colStart + left.length);
                }
            }
        }
    }
    i += 1;
    if (stack.length > 1) {
        raise_error(XtnErrorCode.MISSING_CLOSE_MARKER, 'A close marker ---- was expected', 0, 1);
    }
    if (firstException)
        throw firstException;
    return top_level;
}

export function load(document: string): Record<string, XtnValue> {
    return _load(document, null);
}

