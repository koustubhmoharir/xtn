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
}

export class XtnException extends Error {
    code: XtnErrorCode;
    message: string;
    line_no: number;

    constructor(code: XtnErrorCode, line_no: number, message: string) {
        super(message);
        this.code = code;
        this.message = message;
        this.line_no = line_no;
    }
}

enum _Mode {
    OBJECT = 1,
    ARRAY = 2,
    MULTILINE = 3,
}

type XtnValue = string | XtnValue[] | { [key: string]: XtnValue };

export abstract class XtnElement { }

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
    comments: XtnComment[] | null;
    trail_comments: XtnComment[] | null;

    constructor(comments: XtnComment[] | null = null, trail_comments: XtnComment[] | null = null) {
        super();
        this.comments = comments;
        this.trail_comments = trail_comments;
    }
}

export class XtnText extends XtnDataElement {
    value: string;
    force_multiline: boolean;

    constructor(value: string, force_multiline: boolean = false, comments: XtnComment[] | null = null) {
        super(comments);
        this.value = value;
        this.force_multiline = force_multiline;
    }
}

export class XtnArray extends XtnDataElement {
    elements: XtnDataElement[];

    constructor(elements: XtnDataElement[], comments: XtnComment[] | null = null, trail_comments: XtnComment[] | null = null) {
        super(comments, trail_comments);
        this.elements = elements;
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

export class XtnObject extends XtnDataElement {
    elements: { [key: string]: XtnDataElement };

    constructor(elements: { [key: string]: XtnDataElement } | null = null, comments: XtnComment[] | null = null, trail_comments: XtnComment[] | null = null) {
        super(comments, trail_comments);
        this.elements = elements || {};
    }

    static load(document: string): XtnObject {
        const obj = new XtnObject({});
        _load(document, obj);
        return obj;
    }

    dump() {
        let output = "";
        const write = (...s: string[]) => {
            output = output.concat(...s, '\n');
        };

        const write_comment = (comment: XtnComment, indent: string) => {
            const value = comment.value;
            const lines = value.split(/\r?\n/);
            for (let line of lines) {
                line = line.trimEnd();
                if (line.length === 0) {
                    write();
                } else {
                    write(indent, '#', comment.prefix, isWhiteSpace(line.substring(0, 1)) ? '' : ' ', line);
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
        
        const write_pair = (name: string, element: XtnDataElement, indent: string) => {
            write_comments(element.comments, indent);
            if (element instanceof XtnArray) {
                write(indent, name, '[]:');
                const innerIndent = indent + '    ';
                for (const arrayElement of element.elements) {
                    write_pair('+', arrayElement, innerIndent);
                }
                write_comments(element.trail_comments, innerIndent);
                write(indent, '----');
            }
            else if (element instanceof XtnObject) {
                write(indent, name, '{}:');
                const innerIndent = indent + '    ';
                for (const key in element.elements) {
                    const value = element.elements[key];
                    write_pair(key, value, innerIndent);
                }
                write_comments(element.trail_comments, innerIndent);
                write(indent, '----');
            }
            else if (element instanceof XtnText) {
                const value = element.value;
                const lines = value.length === 0 ? [] : value.split(/\r?\n/);
                if (element.force_multiline || lines.length > 1 || isWhiteSpace(value.substring(0, 1)) || isWhiteSpace(value.substring(value.length - 1)) || hasNon32Whitespace(value)) {
                    write(indent, name, "'':");
                    const child_indent = indent + '    ';
                    for (let line of lines) {
                        write(child_indent, line);
                    }
                    write(indent, '----');
                }
                else {
                    write(indent, name, ": ", value);
                }
            }
            
        };

        write_comments(this.comments, '');
        for (const key in this.elements) {
            write_pair(key, this.elements[key], '');
        }
        write_comments(this.trail_comments, '');
    }
}



function _make_Xtn(value: any): XtnArray | XtnObject | XtnText {
    if (Array.isArray(value)) {
        return new XtnArray(value);
    } else if (typeof value === 'object') {
        return new XtnObject(value);
    } else {
        return new XtnText(value);
    }
}

function _convert_spaces(value: string, collapse: boolean): string {
    const pattern = collapse ? /\s+/g : /\s/g;
    return value.replace(pattern, ' ');
}

function trimLeadingSpaceOrTab(str: string, char: string) {
    if (char === ' ')
        return str.replace(/^ */, '');
    return str.replace(/^\t*/, '');
}

function partition(str: string, sep: string) {
    const i = str.indexOf(sep);
    if (i >= 0) return [str.substring(0, i), sep, str.substring(i + sep.length)];
    return [str, '', ''];
}

class _ObjectState {
    start_line: number;
    current: Record<string, any>;
    target: XtnObject | null;
    in_array: boolean;
    mode: 'OBJECT' = 'OBJECT';

    constructor(start_line: number, current: Record<string, any>, target: XtnObject | null, in_array: boolean) {
        this.start_line = start_line;
        this.current = current;
        this.target = target;
        this.in_array = in_array;
    }

    set(name: string, value: Record<string, any> | any[] | string, raise_error: (code: XtnErrorCode, msg: string) => never, convert_spaces: boolean = true) {
        name = _convert_spaces(name, true);
        if (convert_spaces && typeof value === 'string') {
            value = _convert_spaces(value, false);
        }
        if (this.target == null) {
            this.current[name] = value;
            return null;
        }
        else {
            const child = _make_Xtn(value);
            this.current[name] = child;
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

    set(name: string, value: Record<string, any> | any[] | string, raise_error: (code: XtnErrorCode, msg: string) => never, convert_spaces: boolean = true) {
        name = _convert_spaces(name, true);
        if (convert_spaces && typeof value === 'string') {
            value = _convert_spaces(value, false);
        }
        if (name !== '+') {
            raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, 'An array element must start with a plus');
        }
        if (this.target === null) {
            this.current.push(value);
            return null;
        } else {
            const child = _make_Xtn(value);
            this.current.push(child);
            return child;
        }
    }
}

class _MultilineState {
    start_line: number;
    name: string;
    parent_state: _ObjectState | _ArrayState;
    indent: string;
    indent_char: string = ' ';
    exp_indent: string | null = null;
    cur_indent: string = '';
    text: string = '';
    target: any = null;
    mode: 'MULTILINE' = 'MULTILINE';

    constructor(start_line: number, name: string, parent_state: _ObjectState | _ArrayState, indent: string) {
        this.start_line = start_line;
        this.name = name;
        this.parent_state = parent_state;
        this.indent = indent;
    }
}

function breakIntoLines(document: string) {
    const lines = [...document.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)];
    lines.pop();
    return lines.map(m => m[0]);
}

function trimEndOfLine(line: string) {
    if (line.endsWith('\r\n'))
        return line.substring(0, line.length - 2);
    const last = line.substring(line.length - 1);
    if (last === '\r' || last === '\n')
        return line.substring(0, line.length - 1);
    return line;
}

function _load(document: string, target: XtnObject | null): Record<string, any> {
    const top_level: Record<string, any> = target == null ? {} : target.elements;
    const stack: (_ObjectState | _ArrayState | _MultilineState)[] = [
        new _ObjectState(-1, top_level, target, false)
    ];

    function raise_error(code: XtnErrorCode, msg: string): never {
        throw new XtnException(code, i, msg);
    }

    const comments: XtnComment[] | null = target != null ? [] : null;

    function record_comment(line: string): void {
        if (comments !== null) {
            if (line.length === 0) {
                comments.push(new XtnComment(''));
            } else {
                let value = line.replace(/^#*/, '');
                const prefix = '#'.repeat(line.length - value.length - 1);
                if (isWhiteSpace(value.substring(0, 1))) {
                    value = value.substring(1);
                }
                if (isWhiteSpace(value)) {
                    comments.push(new XtnComment(''));
                }
                else {
                    comments.push(new XtnComment(value, prefix));
                }
            }
        }
    }

    function attach_comments(target: XtnDataElement | null): void {
        if (target != null && comments?.length) {
            target.comments = comments.slice();
            comments.length = 0;
        }
    }

    function attach_trailing_comments(target: XtnDataElement | null): void {
        if (target != null && comments?.length) {
            target.trail_comments = comments.slice();
            comments.length = 0;
        }
    }

    let i = -1;
    for (const orig_line of breakIntoLines(document)) {
        i++;
        let line: string = orig_line;
        const state = stack[stack.length - 1];
        if (state.mode === 'MULTILINE') {
            if (state.exp_indent == null) {
                if (state.indent.length > 0) {
                    state.indent_char = state.indent[0];
                    state.exp_indent = state.indent + state.indent_char.repeat(state.indent_char === '\t' ? 1 : 4);
                } else if (line[0] === '\t') {
                    state.exp_indent = '\t';
                    state.indent_char = '\t';
                } else {
                    state.exp_indent = '    ';
                    state.indent_char = ' ';
                }
                state.cur_indent = state.exp_indent;
            }
            const cur_indent_len = state.cur_indent.length;
            let act_indent_len = 0;
            if (cur_indent_len > 0) {
                let prefix = line.substring(0, cur_indent_len);
                const act_indent = prefix.substring(0, prefix.length - trimLeadingSpaceOrTab(prefix, state.indent_char).length);
                act_indent_len = act_indent.length;
                prefix = prefix.substring(act_indent_len, act_indent_len + 1);
                if (act_indent_len < cur_indent_len && isWhiteSpace(prefix) && prefix !== '\n' && prefix !== '\r') {
                    raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 'Indentation for a complex text value can use either spaces or tabs but not both');
                }
                line = line.substring(act_indent_len);
                if (act_indent_len < cur_indent_len) {
                    state.cur_indent = act_indent;
                }
            }
            if (act_indent_len < state.exp_indent.length) {
                const close_ind = line.substring(0, state.exp_indent.length - act_indent_len).indexOf('--');
                if (close_ind >= 0) {
                    const prefix = line.substring(0, close_ind);
                    if (prefix.length === 0 || prefix.trimStart().length === 0) {
                        if (line.substring(close_ind, close_ind + 4) === '----' && line.substring(close_ind + 4).trimEnd().length === 0) {
                            if (act_indent_len + close_ind <= state.indent.length) {
                                if (state.indent.length > 0 && trimLeadingSpaceOrTab(prefix, state.indent_char).length !== 0) {
                                    raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 'Indentation for a complex text value can use either spaces or tabs but not both');
                                }
                                const child_target = state.parent_state.set(state.name, trimEndOfLine(state.text), raise_error, false);
                                if (child_target != null) {
                                    (child_target as XtnText).force_multiline = true;
                                    attach_comments(child_target);
                                }
                                stack.pop();
                                continue;
                            }
                            raise_error(XtnErrorCode.INSUFFICIENT_INDENTATION, 'Lines starting with two or more dashes must be indented by at least 4 spaces or a tab compared to the key line');
                        }
                    }
                }
            }
            state.text += line;
        }
        else {
            line = line.trim();
            if (line.startsWith('#')) {
                record_comment(line);
                continue;
            }
            if (line.length === 0) {
                record_comment(line);
                continue;
            }
            let [left, sep, right] = partition(line, ':');
            left = left.trimEnd();
            right = right.trimStart();
            if (sep === ':') {
                if (left.length === 0) {
                    raise_error(XtnErrorCode.LINE_MUST_NOT_START_WITH_COLON, 'A line cannot start with a colon');
                }
                else if (left.startsWith('+') && state.mode === 'OBJECT' && !state.in_array) {
                    raise_error(XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY, 'A line cannot start with a plus outside the context of an array');
                }

                if (left.endsWith('{}')) {
                    if (right.length > 0) {
                        raise_error(XtnErrorCode.OBJECT_MUST_BE_ON_NEW_LINE, 'An object must start on a new line');
                    }
                    const name = left.substring(0, left.length -2).trimEnd();
                    const obj: Record<string, any> = {};
                    const child_target = state.set(name, obj, raise_error);
                    attach_comments(child_target);
                    stack.push(new _ObjectState(i, obj, child_target as XtnObject, state.mode === 'ARRAY'));
                } else if (left.endsWith('[]')) {
                    if (right.length > 0) {
                        raise_error(XtnErrorCode.ARRAY_MUST_BE_ON_NEW_LINE, 'An array must start on a new line');
                    }
                    const name = left.substring(0, left.length -2).trimEnd();
                    const obj: any[] = [];
                    const child_target = state.set(name, obj, raise_error);
                    attach_comments(child_target);
                    stack.push(new _ArrayState(i, obj, child_target as XtnArray));
                } else if (left.endsWith("''")) {
                    const indent = orig_line.substring(0, orig_line.indexOf(left[0]));
                    if (indent.length > 0) {
                        const indent_char = indent[0];
                        if (indent_char != ' ' && indent_char != '\t') {
                            raise_error(XtnErrorCode.INDENTATION_MUST_BE_SPACE_OR_TAB, 'Indentation for a complex text value must be a space (32) or tab (9) character');
                        }
                        if (trimLeadingSpaceOrTab(indent, indent_char).length > 0) {
                            raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 'Indentation for a complex text value can use either spaces or tabs but not both');
                        }
                    }
                    const name = left.slice(0, left.length - 2).trimEnd();
                    if (right.length > 0) {
                        raise_error(XtnErrorCode.MULTILINE_MUST_BE_ON_NEW_LINE, 'A multiline value must start on a new line');
                    }
                    stack.push(new _MultilineState(i, name, state, indent));
                }
                else {
                    const child_target = state.set(left, right, raise_error);
                    attach_comments(child_target);
                }
            }
            else if (left.startsWith('----') && left.substring(4).trimEnd().length === 0) {
                attach_trailing_comments(stack[stack.length - 1].target);
                stack.pop();
                if (stack.length === 0) {
                    raise_error(XtnErrorCode.UNMATCHED_CLOSE_MARKER, 'The close marker ---- does not match any open object or array');
                }
            }
            else {
                raise_error(XtnErrorCode.MISSING_COLON, 'A colon was expected');
            }
        }
    }
    i += 1;
    if (stack.length > 1) {
        raise_error(XtnErrorCode.MISSING_CLOSE_MARKER, 'A close marker ---- was expected');
    }
    return top_level;
}

export function load(document: string): Record<string, XtnValue> {
    return _load(document, null);
}
