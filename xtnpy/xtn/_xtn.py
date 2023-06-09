from typing import Any, Callable, Literal, NoReturn, TextIO
from enum import Enum
from dataclasses import dataclass
import re


class XtnErrorCode(Enum):
    OBJECT_MUST_BE_ON_NEW_LINE = 1
    ARRAY_MUST_BE_ON_NEW_LINE = 2
    MULTILINE_MUST_BE_ON_NEW_LINE = 3
    LINE_MUST_NOT_START_WITH_COLON = 4
    PLUS_ENCOUNTERED_OUTSIDE_ARRAY = 5
    ARRAY_ELEMENT_MUST_START_WITH_PLUS = 6
    MISSING_COLON = 7
    UNMATCHED_CLOSE_MARKER = 8
    MISSING_CLOSE_MARKER = 9
    INDENTATION_MUST_BE_SPACE_OR_TAB = 10
    INDENTATION_MUST_NOT_BE_MIXED = 11
    INSUFFICIENT_INDENTATION = 12
    ARRAY_ELEMENT_MUST_NOT_HAVE_A_KEY = 13
    OBJECT_KEYS_CANNOT_BE_REPEATED = 14
    INCORRECT_INDENTATION = 15


class XtnException(Exception):
    def __init__(self, code: XtnErrorCode, message: str, *args: object) -> None:
        super().__init__(message, *args)
        self.code = code
        self.message = message


class _Mode(Enum):
    OBJECT = 1
    ARRAY = 2
    MULTILINE = 3


class XtnElement:
    def __init__(self) -> None:
        pass


class XtnComment(XtnElement):
    def __init__(self, value: str, prefix: str = '') -> None:
        super().__init__()
        self.value = value
        self.prefix = prefix


class XtnDataElement(XtnElement):
    def __init__(self, comments_above: list[XtnComment] | None = None, comments_below: list[XtnComment] | None = None) -> None:
        super().__init__()
        self.comments_above = comments_above
        self.comments_below = comments_below


class XtnText(XtnDataElement):
    def __init__(self, value: str, force_multiline: bool = False, comments_above: list[XtnComment] | None = None, comments_below: list[XtnComment] | None = None) -> None:
        super().__init__(comments_above)
        self.value = value
        self.force_multiline = force_multiline


class XtnArray(XtnDataElement):
    def __init__(self, elements: list[XtnDataElement], comments_above: list[XtnComment] | None = None, comments_inner_top: list[XtnComment] | None = None, comments_inner_bottom: list[XtnComment] | None = None, comments_below: list[XtnComment] | None = None) -> None:
        super().__init__(comments_above, comments_below)
        self.elements = elements
        self.comments_inner_top = comments_inner_top
        self.comments_inner_bottom = comments_inner_bottom


class XtnObject(XtnDataElement):
    def __init__(self, elements: dict[str, XtnDataElement] | None = None, comments_above: list[XtnComment] | None = None, comments_inner_top: list[XtnComment] | None = None, comments_inner_bottom: list[XtnComment] | None = None, comments_below: list[XtnComment] | None = None) -> None:
        super().__init__(comments_above, comments_below)
        self.elements = {} if elements is None else elements
        self.comments_inner_top = comments_inner_top
        self.comments_inner_bottom = comments_inner_bottom

    @staticmethod
    def load(f: TextIO):
        obj = XtnObject({})
        _load(f, obj)
        return obj

    def dump(self, f: TextIO):
        def write(*s: str):
            print(*s, sep='', file=f)

        def write_comment(comment: XtnComment, indent: str):
            value = comment.value
            lines = value.splitlines()
            if len(value) == 0 or value.endswith('\n'):
                lines.append('')
            i = -1
            for line in lines:
                i = i + 1
                line = line.rstrip()
                if i == 0 and len(comment.prefix) > 0:
                    write(indent, '##', comment.prefix, ' ', line)
                elif len(line) == 0:
                    write()
                else:
                    write(indent, '# ', line)

        def write_comments(comments: list[XtnComment] | None, indent: str):
            if comments is not None and len(comments) > 0:
                for comment in comments:
                    write_comment(comment, indent)

        def write_pair(name: str, data: XtnDataElement, indent: str):
            write_comments(data.comments_above, indent)
            if isinstance(data, XtnArray):
                write(indent, name, '[]:')
                child_indent = indent + '    '
                write_comments(data.comments_inner_top, child_indent)
                for element in data.elements:
                    write_pair('+', element, child_indent)
                write_comments(data.comments_inner_bottom, child_indent)
                write(indent, '----')
            elif isinstance(data, XtnObject):
                write(indent, name, '{}:')
                child_indent = indent + '    '
                write_comments(data.comments_inner_top, child_indent)
                for child_name, child_value in data.elements.items():
                    write_pair(child_name, child_value, child_indent)
                write_comments(data.comments_inner_bottom, child_indent)
                write(indent, '----')
            elif isinstance(data, XtnText):
                sv = data.value
                lines = sv.splitlines()
                if sv.endswith('\n'):
                    lines.append('')
                if data.force_multiline or len(lines) > 1 or sv[0:1].isspace() or sv[-1:].isspace() or any(m.group(0) != ' ' for m in re.finditer(r'\s', sv)):
                    write(indent, name, "'':")
                    child_indent = indent + '    '
                    for line in lines:
                        write(child_indent, line)
                    write(indent, '----')
                else:
                    write(indent, name, ': ', sv)
            write_comments(data.comments_below, indent)

        write_comments(self.comments_inner_top, '')
        for name, value in self.elements.items():
            write_pair(name, value, '')
        write_comments(self.comments_inner_bottom, '')


def _make_Xtn(value: dict[str, Any] | list | str):
    if isinstance(value, list):
        return XtnArray(value)
    elif isinstance(value, dict):
        return XtnObject(value)
    else:
        return XtnText(value)


def _convert_spaces(value: str, collapse: bool):
    return re.sub(r'\s+' if collapse else r'\s', ' ', value)


@dataclass
class _ObjectState:
    start_line: int
    current: dict[str, Any]
    target: XtnObject | None
    in_array: bool
    mode: Literal[_Mode.OBJECT] = _Mode.OBJECT

    def set(self, name: str, value: dict[str, Any] | list | str, raise_error: Callable[[XtnErrorCode, str], NoReturn], complex_setter: list[Callable[[str], None]] | None = None):
        # verify that name does not have disallowed characters
        name = _convert_spaces(name, True)
        if isinstance(value, str):
            value = _convert_spaces(value, False)
        if name in self.current:
            raise_error(XtnErrorCode.OBJECT_KEYS_CANNOT_BE_REPEATED,
                        f"Object keys cannot be repeated. {name} already exists.")
        if self.target is None:
            self.current[name] = value
            if (complex_setter is not None):
                dict = self.current
                n = name
                def updater(v: str):
                    dict[n] = v;
                complex_setter[0] = updater
            return None
        else:
            child = _make_Xtn(value)
            self.current[name] = child
            if (complex_setter is not None):
                def updater(v: str):
                    child.value = v;
                complex_setter[0] = updater
            return child


@dataclass
class _ArrayState:
    start_line: int
    current: list
    target: XtnArray | None
    mode: Literal[_Mode.ARRAY] = _Mode.ARRAY

    def set(self, name: str, value: dict[str, Any] | list | str, raise_error: Callable[[XtnErrorCode, str], NoReturn], complex_setter: list[Callable[[str], None]] | None = None):
        name = _convert_spaces(name, True)
        if isinstance(value, str):
            value = _convert_spaces(value, False)
        if name != '+':
            if name.startswith('+'):
                raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_NOT_HAVE_A_KEY,
                            "An array element cannot be named")
            else:
                raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS,
                            "An array element must start with a plus")
        if self.target is None:    
            self.current.append(value)
            if (complex_setter is not None):
                arr = self.current
                i = len(arr) - 1
                def updater(v: str):
                    arr[i] = v;
                complex_setter[0] = updater
            return None
        else:
            child = _make_Xtn(value)
            self.current.append(child)
            if (complex_setter is not None):
                def updater(v: str):
                    child.value = v;
                complex_setter[0] = updater
            return child


@dataclass
class _MultilineState:
    start_line: int
    target: XtnText | None
    setter: Callable[[str], None] | None
    indent: str
    indent_char: str = ' '
    exp_indent: str | None = None
    text: str = ''
    mode: Literal[_Mode.MULTILINE] = _Mode.MULTILINE


def _load(f: TextIO, target: XtnObject | None) -> dict[str, Any]:
    top_level = {} if target is None else target.elements
    stack: list[_ObjectState | _ArrayState | _MultilineState] = [
        _ObjectState(current=top_level, target=target, start_line=-1, in_array=False)]

    def raise_error(code: XtnErrorCode, msg: str):
        raise XtnException(code, f"{f.name}:{i + 1}: error: {msg}")

    comments_up = [] if target is not None else None
    comments_down = [] if target is not None else None

    def record_comment(line: str):
        if comments_down is not None:
            if len(line) == 0:
                comments_down.append(XtnComment(''))
            else:
                prefix = ''
                if line.startswith('##'):
                    if line.startswith('####'):
                        line = line[4:].lstrip()
                        prefix = '##'
                    else:
                        line = line[2:].lstrip()
                        m = re.match(r'^\s*([^\s]*)', line)
                        if m is not None:
                            prefix = m.group(1)
                            if len(prefix) > 0:
                                line = line[(line.find(prefix[0]) + len(prefix)):].lstrip()
                elif len(line) > 0:
                    line = line[(2 if line[1].isspace() else 1):]
                if prefix == '##':
                    comments_down.append(XtnComment(line, prefix))
                    comments_up.extend(comments_down)
                    comments_down.clear()
                elif line.isspace():
                    comments_down.append(XtnComment(''))
                else:
                    comments_down.append(XtnComment(line, prefix))

    up_prop = 'inner'
    up_target = target
    def attach_comments(target: XtnDataElement | None):
        nonlocal up_prop, up_target
        if target is not None:
            if comments_up is not None and len(comments_up) > 0:
                if up_prop == 'inner':
                    up_target.comments_inner_top = comments_up.copy()
                else:
                    up_target.comments_below = comments_up.copy()
                comments_up.clear()

            if comments_down is not None and len(comments_down) > 0:
                target.comments_above = comments_down.copy()
                comments_down.clear()
            up_target = target
            up_prop = 'below' if isinstance(target, XtnText) else 'inner'

    def attach_trailing_comments(target: XtnDataElement | None):
        nonlocal up_prop, up_target
        if target is not None:
            if comments_up is not None and len(comments_up) > 0:
                if up_prop == 'inner':
                    up_target.comments_inner_top = comments_up.copy()
                else:
                    up_target.comments_below = comments_up.copy()
                comments_up.clear()
            if comments_down is not None and len(comments_down) > 0:
                target.comments_inner_bottom = comments_down.copy()
                comments_down.clear()
            up_target = target
            up_prop = 'below'

    complex_setter = [None]
    i = -1
    for i, orig_line in enumerate(f):
        line = orig_line
        state = stack[-1]
        if state.mode == _Mode.MULTILINE:
            if state.exp_indent is None:
                if len(state.indent) > 0:
                    state.indent_char = state.indent[0]
                    state.exp_indent = state.indent + state.indent_char * \
                        (1 if state.indent_char == '\t' else 4)
                elif line[:1] == '\t':
                    state.exp_indent = '\t'
                    state.indent_char = '\t'
                else:
                    state.exp_indent = '    '
                    state.indent_char = ' '
            exp_indent_len = len(state.exp_indent)
            act_indent_len = 0
            prefix = line[0:exp_indent_len]
            act_indent = prefix[:(
                len(prefix) - len(prefix.lstrip(state.indent_char)))]
            act_indent_len = len(act_indent)
            prefix = prefix[act_indent_len:act_indent_len+1]
            if act_indent_len < exp_indent_len and prefix.isspace() and prefix != '\n':
                raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED,
                            f"Indentation for a complex text value can use either spaces or tabs but not both")
            line = line[act_indent_len:]
            if act_indent_len < exp_indent_len:
                if line.startswith('----') and (len(line) == 4 or line[4:].isspace()):
                    if act_indent_len == len(state.indent):
                        state.setter(state.text[0:-1])
                        stack.pop()
                        continue
                    raise_error(XtnErrorCode.INCORRECT_INDENTATION,
                                f"The indentation on the closing line for a complex text value must exactly match the key line")
                if prefix != '\n':
                    raise_error(XtnErrorCode.INSUFFICIENT_INDENTATION,
                                f"Lines of complex text must be indented by 4 spaces or a tab compared to the key line")

            state.text = state.text + line
            state.setter(state.text)
        else:
            line = line.strip()
            if line.startswith('#'):
                record_comment(line)
                continue
            if (len(line) == 0):
                record_comment(line)
                continue
            left, sep, right = line.partition(':')
            left = left.rstrip()
            right = right.lstrip()
            if sep == ':':
                if len(left) == 0:
                    raise_error(XtnErrorCode.LINE_MUST_NOT_START_WITH_COLON,
                                f"A line cannot start with a colon")
                elif left.startswith('+') and state.mode == _Mode.OBJECT:
                    raise_error(XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY,
                                f"A line cannot start with a plus outside the context of an array")

                if left.endswith('{}'):
                    if len(right) > 0:
                        raise_error(XtnErrorCode.OBJECT_MUST_BE_ON_NEW_LINE,
                                    f"An object must start on a new line")
                    name = left[0:-2].rstrip()
                    obj = {}
                    child_target = state.set(name, obj, raise_error)
                    attach_comments(child_target)
                    stack.append(_ObjectState(start_line=i, current=obj,
                                              target=child_target, in_array=state.mode == _Mode.ARRAY))  # type: ignore
                elif left.endswith('[]'):
                    if len(right) > 0:
                        raise_error(XtnErrorCode.ARRAY_MUST_BE_ON_NEW_LINE,
                                    f"An array must start on a new line")
                    name = left[0:-2].rstrip()
                    obj = []
                    child_target = state.set(name, obj, raise_error)
                    attach_comments(child_target)
                    # type: ignore
                    stack.append(_ArrayState(
                        start_line=i, current=obj, target=child_target))  # type: ignore
                elif left.endswith("''"):
                    indent = orig_line[:orig_line.find(left[0])]
                    if len(indent) > 0:
                        indent_char = indent[0]
                        if indent_char != ' ' and indent_char != '\t':
                            raise_error(XtnErrorCode.INDENTATION_MUST_BE_SPACE_OR_TAB,
                                        f"Indentation for a complex text value must be a space (32) or tab (9) character")
                        if len(indent.lstrip(indent_char)) > 0:
                            raise_error(XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED,
                                        f"Indentation for a complex text value can use either spaces or tabs but not both")

                    name = left[0:-2].rstrip()
                    if len(right) > 0:
                        raise_error(XtnErrorCode.MULTILINE_MUST_BE_ON_NEW_LINE,
                                    f"A multi-line value must start on a new line")
                    child_target = state.set(name, '', raise_error, complex_setter)
                    if child_target is not None:
                        child_target.force_multiline = True  # type: ignore
                        attach_comments(child_target)
                    stack.append(_MultilineState(start_line=i, target=child_target, setter=complex_setter[0], indent=indent))
                else:
                    child_target = state.set(left, right, raise_error)
                    attach_comments(child_target)

            elif left.startswith('----') and (len(left) == 4 or left[4:].isspace()):
                attach_trailing_comments(stack[-1].target)
                stack.pop()
                if len(stack) == 0:
                    raise_error(XtnErrorCode.UNMATCHED_CLOSE_MARKER,
                                "The close marker ---- does not match any open object or array")
            else:
                if state.mode == _Mode.ARRAY:
                    if left[0] == '+':
                        raise_error(XtnErrorCode.MISSING_COLON,
                                    f"A colon was expected")
                    else:
                        raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS,
                                    f"An array element must start with a plus")
                else:
                    raise_error(XtnErrorCode.MISSING_COLON,
                                f"A colon was expected")
    
    attach_trailing_comments(stack[-1].target)
    i += 1
    if len(stack) > 1:
        raise_error(XtnErrorCode.MISSING_CLOSE_MARKER,
                    "A close marker ---- was expected")
    return top_level


def load(f: TextIO):
    return _load(f, None)
