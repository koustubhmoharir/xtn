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
    MULTILINE_MARKER_TOO_SHORT = 7
    UNMATCHED_CLOSE_MARKER = 8
    MISSING_CLOSE_MARKER = 9


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
    def __init__(self, comments: list[XtnComment] | None = None, trail_comments: list[XtnComment] | None = None) -> None:
        super().__init__()
        self.comments = comments
        self.trail_comments = trail_comments


class XtnText(XtnDataElement):
    def __init__(self, value: str, force_multiline: bool = False, comments: list[XtnComment] | None = None) -> None:
        super().__init__(comments)
        self.value = value
        self.force_multiline = force_multiline


class XtnArray(XtnDataElement):
    def __init__(self, elements: list[XtnDataElement], comments: list[XtnComment] | None = None, trail_comments: list[XtnComment] | None = None) -> None:
        super().__init__(comments, trail_comments)
        self.elements = elements


class XtnObject(XtnDataElement):
    def __init__(self, elements: dict[str, XtnDataElement] | None = None, comments: list[XtnComment] | None = None, trail_comments: list[XtnComment] | None = None) -> None:
        super().__init__(comments, trail_comments)
        self.elements = {} if elements is None else elements

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
            for line in lines:
                line = line.rstrip()
                if len(line) == 0:
                    write()
                else:
                    write(indent, '#', comment.prefix, '' if line[0:1].isspace() else ' ', line)

        def write_comments(comments: list[XtnComment] | None, indent: str):
            if comments is not None and len(comments) > 0:
                for comment in comments:
                    write_comment(comment, indent)

        def write_pair(name: str, data: XtnDataElement, indent: str, end: bool):
            write_comments(data.comments, indent)
            if isinstance(data, XtnArray):
                write(indent, name, '[]:')
                child_indent = indent + '    '
                for element in data.elements:
                    write_pair('+', element, child_indent, False)
                write_comments(data.trail_comments, child_indent)
                if end:
                    write(indent, '----')
            elif isinstance(data, XtnObject):
                write(indent, name, '{}:')
                child_indent = indent + '    '
                for child_name, child_value in data.elements.items():
                    write_pair(child_name, child_value, child_indent, True)
                write_comments(data.trail_comments, child_indent)
                if end:
                    write(indent, '----')
            elif isinstance(data, XtnText):
                sv = data.value
                lines = sv.splitlines()
                if sv.endswith('\n'):
                    lines.append('')
                if data.force_multiline or len(lines) > 1 or sv[0:1].isspace() or sv[-1:].isspace() or any(m.group(0) != ' ' for m in re.finditer(r'\s', sv)):
                    marker_len = max((len(m.group(0)) for m in re.finditer(r'`+', sv)), default=0)
                    marker_len = min(marker_len, 4)
                    marker = (4 if marker_len < 3 else marker_len + (3 if marker_len % 2 == 1 else 4)) * "'"
                    write(indent, name, "'':")
                    child_indent = indent + '    '
                    write(child_indent, marker)
                    for line in lines:
                        write(child_indent, line)
                    write(child_indent, marker)
                else:
                    write(indent, name, ': ', sv)

        write_comments(self.comments, '')
        for name, value in self.elements.items():
            write_pair(name, value, '', True)
        write_comments(self.trail_comments, '')


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

    def set(self, name: str, value: dict[str, Any] | list | str, raise_error: Callable[[XtnErrorCode, str], NoReturn], convert_spaces: bool = True):
        # verify that name does not have disallowed characters
        name = _convert_spaces(name, True)
        if convert_spaces and isinstance(value, str):
            value = _convert_spaces(value, False)
        if self.target is None:
            self.current[name] = value
            return None
        else:
            child = _make_Xtn(value)
            self.current[name] = child
            return child


@dataclass
class _ArrayState:
    start_line: int
    current: list
    target: XtnArray | None
    mode: Literal[_Mode.ARRAY] = _Mode.ARRAY

    def set(self, name: str, value: dict[str, Any] | list | str, raise_error: Callable[[XtnErrorCode, str], NoReturn], convert_spaces: bool = True):
        name = _convert_spaces(name, True)
        if convert_spaces and isinstance(value, str):
            value = _convert_spaces(value, False)
        if name != '+':
            raise_error(XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, "An array element must start with a plus")
        if self.target is None:
            self.current.append(value)
            return None
        else:
            child = _make_Xtn(value)
            self.current.append(child)
            return child


@dataclass
class _MultilineState:
    start_line: int
    name: str
    parent_state: _ObjectState | _ArrayState
    marker: str = ''
    text: str = ''
    indent: int = -1
    target = None
    mode: Literal[_Mode.MULTILINE] = _Mode.MULTILINE


def _load(f: TextIO, target: XtnObject | None) -> dict[str, Any]:
    top_level = {} if target is None else target.elements
    stack: list[_ObjectState | _ArrayState | _MultilineState] = [
        _ObjectState(current=top_level, target=target, start_line=-1, in_array=False)]

    def raise_error(code: XtnErrorCode, msg: str):
        raise XtnException(code, f"{f.name}:{i + 1}: error: {msg}")

    comments = [] if target is not None else None

    def record_comment(line: str):
        if comments is not None:
            if len(line) == 0:
                comments.append(XtnComment(''))
            else:
                value = line.lstrip('#')
                prefix = '#' * (len(line) - len(value) - 1)
                if value[0:1].isspace():
                    value = value[1:]
                if value.isspace():
                    comments.append(XtnComment(''))
                else:
                    comments.append(XtnComment(value, prefix))

    def attach_comments(target: XtnDataElement | None):
        if target is not None and comments is not None and len(comments) > 0:
            target.comments = comments.copy()
            comments.clear()

    def attach_trailing_comments(target: XtnDataElement | None):
        if target is not None and comments is not None and len(comments) > 0:
            target.trail_comments = comments.copy()
            comments.clear()

    i = -1
    for i, line in enumerate(f):
        state = stack[-1]
        if state.mode == _Mode.MULTILINE:
            if len(state.marker) == 0:
                state.indent = len(line)
                line = line.lstrip()
                state.indent -= len(line)
                if not line.startswith("''''"):
                    raise_error(XtnErrorCode.MULTILINE_MARKER_TOO_SHORT,
                                f"A multi-line marker must start with at least 4 single quote characters")
                state.marker = line.rstrip()
            else:
                cur_indent = state.indent
                prefix = line[0:cur_indent]
                if not prefix.isspace():
                    cur_indent = len(prefix)
                    prefix = prefix.lstrip()
                    cur_indent -= len(prefix)
                line = line[cur_indent:]
                if len(line) == 0:
                    line = '\n'
                if line.startswith(state.marker) and line[len(state.marker):].isspace():
                    child_target = state.parent_state.set(
                        state.name, state.text[0:-1], raise_error, convert_spaces=False)
                    if child_target is not None:
                        child_target.force_multiline = True  # type: ignore
                    attach_comments(child_target)
                    stack.pop()
                else:
                    state.text = state.text + line
        else:
            line = line.strip()
            if line.startswith('#'):
                record_comment(line)
                continue
            if (len(line) == 0):
                record_comment(line)
                continue
            left, sep, right = line.partition(':')
            left = left.strip()
            right = right.strip()
            if len(left) == 0:
                raise_error(XtnErrorCode.LINE_MUST_NOT_START_WITH_COLON,
                            f"A line cannot start with a colon")
            elif left.startswith('+') and state.mode == _Mode.OBJECT:
                if not state.in_array:
                    raise_error(XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY,
                                f"A line cannot start with a plus outside the context of an array")
                stack.pop()
                state = stack[-1]
                if state.mode != _Mode.ARRAY:
                    raise RuntimeError('Error in parsing logic. Expected an array mode')

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
                stack.append(_ArrayState(start_line=i, current=obj, target=child_target))  # type: ignore
            elif left.endswith("''"):
                name = left[0:-2].rstrip()
                if len(right) > 0:
                    raise_error(XtnErrorCode.MULTILINE_MUST_BE_ON_NEW_LINE,
                                f"A multi-line value must start on a new line")
                stack.append(_MultilineState(start_line=i, name=name, parent_state=state))
            elif not left.startswith('-'):
                child_target = state.set(left, right, raise_error)
                attach_comments(child_target)
            else:
                if state.mode == _Mode.OBJECT and state.in_array:
                    stack.pop()
                attach_trailing_comments(stack[-1].target)
                stack.pop()
                if len(stack) == 0:
                    raise_error(XtnErrorCode.UNMATCHED_CLOSE_MARKER, "The close marker ---- does not match any open object or array")
    i += 1
    if len(stack) > 1:
        raise_error(XtnErrorCode.MISSING_CLOSE_MARKER, "A close marker ---- was expected")
    return top_level


def load(f: TextIO):
    return _load(f, None)
