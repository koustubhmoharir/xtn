package xtn

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
)

const (
	ParseErrorUnknown                       = "Unknown"
	ParseErrorObjectMustBeOnNewLine         = "ObjectMustBeOnNewLine"
	ParseErrorArrayMustBeOnNewLine          = "ArrayMustBeOnNewLine"
	ParseErrorMultilineMustBeOnNewLine      = "MultilineMustBeOnNewLine"
	ParseErrorLineMustNotStartWithColon     = "LineMustNotStartWithColon"
	ParseErrorPlusEncounteredOutsideArray   = "PlusEncounteredOutsideArray"
	ParseErrorArrayElementMustStartWithPlus = "ArrayElementMustStartWithPlus"
	ParseErrorMissingColon                  = "MissingColon"
	ParseErrorUnmatchedCloseMarker          = "UnmatchedCloseMarker"
	ParseErrorMissingCloseMarker            = "MissingCloseMarker"
	ParseErrorIndentationMustBeSpaceOrTab   = "IndentationMustBeSpaceOrTab"
	ParseErrorIndentationMustNotBeMixed     = "IndentationMustNotBeMixed"
	ParseErrorInsufficientIndentation       = "InsufficientIndentation"
	ParseErrorArrayElementMustNotHaveAKey   = "ArrayElementMustNotHaveAKey"
	ParseErrorObjectKeysCannotBeRepeated    = "ObjectKeysCannotBeRepeated"
	ParseErrorIncorrectIndentation          = "IncorrectIndentation"
)

type ParseError struct {
	line int
	code string
	msg  string
}

func (e *ParseError) Error() string {
	return e.msg
}

type Comment struct {
	value  string
	prefix string
}

type Object struct {
	elements            map[string]interface{}
	commentsAbove       []Comment
	commentsInnerTop    []Comment
	commentsInnerBottom []Comment
	commentsBelow       []Comment
}

type Array struct {
	elements            []interface{}
	commentsAbove       []Comment
	commentsInnerTop    []Comment
	commentsInnerBottom []Comment
	commentsBelow       []Comment
}

type Text struct {
	commentsAbove  []Comment
	commentsBelow  []Comment
	value          string
	forceMultiline bool
}

type commented interface {
	setComments(comments []Comment, position string)
}

func (a *Array) setComments(comments []Comment, position string) {
	if position == "it" {
		a.commentsInnerTop = comments
	} else if position == "ib" {
		a.commentsInnerBottom = comments
	} else if position == "a" {
		a.commentsAbove = comments
	} else {
		a.commentsBelow = comments
	}
}

func (a *Object) setComments(comments []Comment, position string) {
	if position == "it" {
		a.commentsInnerTop = comments
	} else if position == "ib" {
		a.commentsInnerBottom = comments
	} else if position == "a" {
		a.commentsAbove = comments
	} else {
		a.commentsBelow = comments
	}
}

func (a *Text) setComments(comments []Comment, position string) {
	if position == "a" {
		a.commentsAbove = comments
	} else if position == "b" {
		a.commentsBelow = comments
	}
}

func cleanKeyName(key string) string {
	prevSpace := false
	return strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			if prevSpace {
				return -1
			}
			prevSpace = true
			return ' '
		}
		prevSpace = false
		return r
	}, key)
}

func convertToRegularSpace(value string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return ' '
		}
		return r
	}, value)
}

type objOrArray interface {
	validateKey(name string, ss *scannerState) *ParseError
	makeObjectState(name string, startLine int, ss *scannerState) *objectState
	makeArrayState(name string, startLine int, ss *scannerState) *arrayState
	makeMultilineState(name string, startLine int, indent string, ss *scannerState) *multilineState
	setSimpleText(name string, value string, ss *scannerState)
}

type objectState struct {
	startLine int
	current   map[string]interface{}
	target    *Object
	inArray   bool
}

func (os *objectState) validateKey(name string, ss *scannerState) *ParseError {
	if _, ok := os.current[name]; ok {
		return ss.makeError(ParseErrorObjectKeysCannotBeRepeated, fmt.Sprintf("Object keys cannot be repeated. %s already exists.", name))
	}
	return nil
}

func (os *objectState) makeObjectState(name string, startLine int, ss *scannerState) *objectState {
	current := os.current
	state := &objectState{startLine: startLine, current: make(map[string]interface{})}
	if os.target == nil {
		current[name] = state.current
	} else {
		target := &Object{elements: state.current}
		ss.attachComments(target)
		state.target = target
		current[name] = target
	}
	return state
}

func (os *objectState) makeArrayState(name string, startLine int, ss *scannerState) *arrayState {
	current := os.current
	state := &arrayState{startLine: startLine}
	elements := make([]interface{}, 0, 1)
	if os.target == nil {
		state.current = elements
		current[name] = state.current
		state.updater = func(newElements []interface{}) {
			current[name] = newElements
		}
	} else {
		target := &Array{elements: elements}
		ss.attachComments(target)
		state.target = target
		current[name] = target
	}
	return state
}

func (os *objectState) makeMultilineState(name string, startLine int, indent string, ss *scannerState) *multilineState {
	current := os.current
	state := &multilineState{startLine: startLine, indent: indent}
	if os.target == nil {
		current[name] = ""
		state.setter = func(value string) {
			current[name] = value
		}
	} else {
		target := &Text{forceMultiline: true}
		ss.attachComments(target)
		state.target = target
		current[name] = target
		state.setter = func(value string) {
			target.value = value
		}
	}
	return state
}

func (os *objectState) setSimpleText(name string, value string, ss *scannerState) {
	value = convertToRegularSpace(value)
	if os.target == nil {
		os.current[name] = value
	} else {
		target := &Text{value: value}
		ss.attachComments(target)
		os.current[name] = target
	}
}

type arrayState struct {
	startLine int
	current   []interface{}
	updater   func([]interface{})
	target    *Array
}

func (os *arrayState) validateKey(name string, ss *scannerState) *ParseError {
	if name != "+" {
		if strings.HasPrefix(name, "+") {
			return ss.makeError(ParseErrorArrayElementMustNotHaveAKey, "An array element cannot be named")
		} else {
			return ss.makeError(ParseErrorArrayElementMustStartWithPlus, "An array element must start with a plus")
		}
	}
	return nil
}

func (as *arrayState) makeObjectState(name string, startLine int, ss *scannerState) *objectState {
	state := &objectState{startLine: startLine, current: make(map[string]interface{}), inArray: true}
	if as.target == nil {
		as.current = append(as.current, state.current)
		as.updater(as.current)
	} else {
		target := &Object{elements: state.current}
		ss.attachComments(target)
		state.target = target
		as.target.elements = append(as.target.elements, target)
	}
	return state
}

func (as *arrayState) makeArrayState(name string, startLine int, ss *scannerState) *arrayState {
	elements := make([]interface{}, 0, 1)
	state := &arrayState{startLine: startLine}
	if as.target == nil {
		state.current = elements
		index := len(as.current)
		state.updater = func(newElements []interface{}) {
			as.current[index] = newElements
		}
		as.current = append(as.current, state.current)
		as.updater(as.current)
	} else {
		target := &Array{elements: elements}
		ss.attachComments(target)
		state.target = target
		as.target.elements = append(as.target.elements, target)
	}
	return state
}

func (as *arrayState) makeMultilineState(name string, startLine int, indent string, ss *scannerState) *multilineState {
	state := &multilineState{startLine: startLine, indent: indent}
	if as.target == nil {
		index := len(as.current)
		as.current = append(as.current, "")
		as.updater(as.current)
		state.setter = func(value string) {
			as.current[index] = value
		}
	} else {
		target := &Text{forceMultiline: true}
		ss.attachComments(target)
		state.target = target
		as.target.elements = append(as.target.elements, target)
		state.setter = func(value string) {
			target.value = value
		}
	}
	return state
}

func (as *arrayState) setSimpleText(name string, value string, ss *scannerState) {
	value = convertToRegularSpace(value)
	if as.target == nil {
		as.current = append(as.current, value)
		as.updater(as.current)
	} else {
		target := &Text{value: value}
		ss.attachComments(target)
		as.target.elements = append(as.target.elements, target)
	}
}

type multilineState struct {
	startLine  int
	target     *Text
	setter     func(value string)
	indent     string
	indentChar string
	expIndent  string
	text       string
}

type scannerState struct {
	full         bool
	stack        []interface{}
	commentsUp   []Comment
	commentsDown []Comment
	upProp       string
	upTarget     commented
	i            int
}

func isSpace(s string) bool {
	return len(s) > 0 && len(strings.TrimSpace(s)) == 0
}

func isEmptyOrSpace(s string) bool {
	return len(strings.TrimSpace(s)) == 0
}

func trimLeftSpace(s string) string {
	return strings.TrimLeftFunc(s, unicode.IsSpace)
}

func trimRightSpace(s string) string {
	return strings.TrimRightFunc(s, unicode.IsSpace)
}

func (ss *scannerState) makeError(code string, msg string) *ParseError {
	return &ParseError{line: ss.i + 1, code: code, msg: msg}
}

func (ss *scannerState) processLine(origLine string) error {
	ss.i++
	line := origLine
	state := ss.stack[len(ss.stack)-1]
	switch state := state.(type) {
	case *multilineState:
		if len(state.expIndent) == 0 {
			if len(state.indent) > 0 {
				state.indentChar = state.indent[:1]
				repLen := 1
				if state.indentChar != "\t" {
					repLen = 4
				}
				state.expIndent = state.indent + strings.Repeat(string(state.indentChar), repLen)
			} else if strings.HasPrefix(line, "\t") {
				state.expIndent = "\t"
				state.indentChar = "\t"
			} else {
				state.expIndent = "    "
				state.indentChar = " "
			}
		}
		expIndentLen := len(state.expIndent)
		actIndentLen := 0
		prefix := line[:min(expIndentLen, len(line))]
		actIndent := prefix[:len(prefix)-len(strings.TrimLeft(prefix, state.indentChar))]
		actIndentLen = len(actIndent)
		if actIndentLen < expIndentLen {
			prefix = prefix[actIndentLen : actIndentLen+1]
			if isSpace(prefix) && prefix != "\r" && prefix != "\n" {
				return ss.makeError(ParseErrorIndentationMustNotBeMixed, "Indentation for a complex text value can use either spaces or tabs but not both")
			}
		}
		line = line[actIndentLen:]
		if actIndentLen < expIndentLen {
			if strings.HasPrefix(line, "----") && isEmptyOrSpace(line[4:]) {
				if actIndentLen == len(state.indent) {
					if len(state.text) > 0 {
						state.setter(state.text[:len(state.text)-1])
					}
					ss.stack = ss.stack[0 : len(ss.stack)-1]
					return nil
				}
				return ss.makeError(ParseErrorIncorrectIndentation, "The indentation on the closing line for a complex text value must exactly match the key line")
			}
			if prefix != "\n" && prefix != "\r" {
				return ss.makeError(ParseErrorInsufficientIndentation, "Lines of complex text must be indented by 4 spaces or a tab compared to the key line")
			}
		}
		if strings.HasSuffix(line, "\r") {
			state.text = state.text + line[0:len(line)-1] + "\n"
		} else {
			state.text = state.text + line
		}
		state.setter(state.text)
	default:
		objOrArray := state.(objOrArray)
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") {
			ss.recordComment(line)
			return nil
		}
		if len(line) == 0 {
			ss.recordComment(line)
			return nil
		}
		left, right, sepFound := strings.Cut(line, ":")
		left = trimRightSpace(left)
		right = trimLeftSpace(right)
		if sepFound {
			if len(left) == 0 {
				return ss.makeError(ParseErrorLineMustNotStartWithColon, "A line cannot start with a colon")
			}
			if strings.HasPrefix(left, "+") {
				if _, ok := state.(*objectState); ok {
					return ss.makeError(ParseErrorPlusEncounteredOutsideArray, "A line cannot start with a plus outside the context of an array")
				}
			}
			if strings.HasSuffix(left, "{}") {
				if len(right) > 0 {
					return ss.makeError(ParseErrorObjectMustBeOnNewLine, "An object must start on a new line")
				}
				name := cleanKeyName(trimRightSpace(left[:len(left)-2]))
				if err := objOrArray.validateKey(name, ss); err != nil {
					return err
				}
				ss.stack = append(ss.stack, objOrArray.makeObjectState(name, ss.i, ss))
			} else if strings.HasSuffix(left, "[]") {
				if len(right) > 0 {
					return ss.makeError(ParseErrorArrayMustBeOnNewLine, "An array must start on a new line")
				}
				name := cleanKeyName(trimRightSpace(left[:len(left)-2]))
				if err := objOrArray.validateKey(name, ss); err != nil {
					return err
				}
				ss.stack = append(ss.stack, objOrArray.makeArrayState(name, ss.i, ss))
			} else if strings.HasSuffix(left, "''") {
				indent := origLine[:strings.IndexByte(origLine, left[0])]
				if len(indent) > 0 {
					indentChar := indent[0:1]
					if indentChar != " " && indentChar != "\t" {
						return ss.makeError(ParseErrorIndentationMustBeSpaceOrTab, "Indentation for a complex text value must be a space (32) or tab (9) character")
					}
					if len(strings.TrimLeft(indent, indentChar)) > 0 {
						return ss.makeError(ParseErrorIndentationMustNotBeMixed, "Indentation for a complex text value can use either spaces or tabs but not both")
					}
				}
				name := cleanKeyName(trimRightSpace(left[:len(left)-2]))
				if len(right) > 0 {
					return ss.makeError(ParseErrorMultilineMustBeOnNewLine, "A multi-line value must start on a new line")
				}
				if err := objOrArray.validateKey(name, ss); err != nil {
					return err
				}
				ss.stack = append(ss.stack, objOrArray.makeMultilineState(name, ss.i, indent, ss))
			} else {
				name := cleanKeyName(left)
				if err := objOrArray.validateKey(name, ss); err != nil {
					return err
				}
				objOrArray.setSimpleText(name, right, ss)
			}
		} else if strings.HasPrefix(left, "----") && isEmptyOrSpace(left[4:]) {
			ss.attachTrailingComments()
			ss.stack = ss.stack[:len(ss.stack)-1]
			if len(ss.stack) == 0 {
				return ss.makeError(ParseErrorUnmatchedCloseMarker, "The close marker ---- does not match any open object or array")
			}
		} else {
			if _, ok := state.(*arrayState); ok {
				if left[0] == '+' {
					return ss.makeError(ParseErrorMissingColon, "A colon was expected")
				} else {
					return ss.makeError(ParseErrorArrayElementMustStartWithPlus, "An array element must start with a plus")
				}
			} else {
				return ss.makeError(ParseErrorMissingColon, "A colon was expected")
			}
		}
	}
	return nil
}

func (ss *scannerState) complete() error {
	ss.attachTrailingComments()
	ss.i++
	if len(ss.stack) > 1 {
		return ss.makeError(ParseErrorMissingCloseMarker, "A close marker ---- was expected")
	}
	return nil
}

func (ss *scannerState) attachComments(target commented) {
	if target != nil {
		if len(ss.commentsUp) > 0 {
			if ss.upTarget != nil {
				if ss.upProp == "inner" {
					ss.upTarget.setComments(ss.commentsUp, "it")
				} else {
					ss.upTarget.setComments(ss.commentsUp, "b")
				}
				ss.commentsUp = make([]Comment, 0)
			}
		}
		if len(ss.commentsDown) > 0 {
			if target != nil {
				target.setComments(ss.commentsDown, "a")
			}
			ss.commentsDown = make([]Comment, 0)
		}
		ss.upTarget = target
		if _, ok := target.(*Text); ok {
			ss.upProp = "below"
		} else {
			ss.upProp = "inner"
		}
	}
}

func (ss *scannerState) attachTrailingComments() {
	state := ss.stack[len(ss.stack)-1]
	var target commented
	switch state := state.(type) {
	case *arrayState:
		if state.target != nil {
			target = state.target
		}
	case *objectState:
		if state.target != nil {
			target = state.target
		}
	case *multilineState:
		if state.target != nil {
			target = state.target
		}
	}

	if len(ss.commentsUp) > 0 {
		if ss.upTarget != nil {
			if ss.upProp == "inner" {
				ss.upTarget.setComments(ss.commentsUp, "it")
			} else {
				ss.upTarget.setComments(ss.commentsUp, "b")
			}
		}
		ss.commentsUp = make([]Comment, 0)
	}
	if len(ss.commentsDown) > 0 {
		if target != nil {
			target.setComments(ss.commentsDown, "ib")
			ss.commentsDown = make([]Comment, 0)
		}
	}
	ss.upTarget = target
	ss.upProp = "below"
}

func (ss *scannerState) recordComment(line string) {
	if !ss.full {
		return
	}
	if len(line) == 0 {
		ss.commentsDown = append(ss.commentsDown, Comment{})
	} else {
		prefix := ""
		if strings.HasPrefix(line, "##") {
			if strings.HasPrefix(line, "####") {
				line = trimLeftSpace(line[4:])
				prefix = "##"
			} else {
				line = trimLeftSpace(line[2:])
				we := strings.IndexFunc(line, unicode.IsSpace)
				if we < 0 {
					prefix = line
				} else {
					prefix = line[:we]
					line = trimLeftSpace(line[we:])
				}
			}
		} else if len(line) > 0 {
			line = line[1:]
			if len(line) > 0 && unicode.IsSpace(rune(line[0])) {
				line = line[1:]
			}
		}
		if prefix == "##" {
			ss.commentsDown = append(ss.commentsDown, Comment{value: line, prefix: prefix})
			ss.commentsUp = append(ss.commentsUp, ss.commentsDown...)
			ss.commentsDown = make([]Comment, 0)
		} else if isSpace(line) {
			ss.commentsDown = append(ss.commentsDown, Comment{})
		} else {
			ss.commentsDown = append(ss.commentsDown, Comment{value: line, prefix: prefix})
		}
	}
}

func UnmarshalToMap(data []byte, v any) error {
	state := scannerState{}
	var target *Object
	var topLevel map[string]interface{}
	switch t := v.(type) {
	case *Object:
		state.full = true
		*t = Object{elements: make(map[string]interface{})}
		target = t
		topLevel = t.elements
	case *map[string]interface{}:
		state.full = false
		*t = make(map[string]interface{})
		topLevel = *t
	default:
		return errors.New("the second argument v must be a pointer to a xtn.Object or a pointer to map[string]any")
	}
	state.stack = append(state.stack, &objectState{
		startLine: -1,
		current:   topLevel,
		target:    target,
		inArray:   false,
	})
	state.upProp = "inner"
	state.upTarget = target
	state.i = -1

	si := 0
	ignoreNewLine := false
	for i, b := range data {
		if b == '\r' {
			ignoreNewLine = true
			err := state.processLine(string(data[si : i+1]))
			if err != nil {
				return err
			}
			si = i + 1
		} else {
			if b == '\n' {
				if !ignoreNewLine {
					err := state.processLine(string(data[si : i+1]))
					if err != nil {
						return err
					}
				}
				si = i + 1
			}
			ignoreNewLine = false
		}
	}
	if si < len(data) {
		err := state.processLine(string(data[si:]))
		if err != nil {
			return err
		}
	}
	err := state.complete()
	if err != nil {
		return err
	}
	return nil
}
