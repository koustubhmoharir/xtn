package xtn

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func readSample(t *testing.T, name string) []byte {
	absPath, _ := filepath.Abs("../samples/" + name)
	file, err := os.Open(absPath)
	if err != nil {
		t.Fatalf("Error reading sample %s: %v", name, err)
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		t.Fatalf("Error reading sample %s: %v", name, err)
	}
	return bytes
}

func loadSampleXtn(t *testing.T, name string, failOnError bool) (map[string]any, *ParseError) {
	xtnBytes := readSample(t, name+".xtn")

	var xtnMap map[string]interface{}
	err := UnmarshalToMap(xtnBytes, &xtnMap)
	if failOnError && err != nil {
		t.Fatal(err)
	}
	if pe, ok := err.(*ParseError); ok {
		return nil, pe
	} else if err != nil {
		t.Fatal(err)
	}
	return xtnMap, nil
}

func loadSampleXtnObj(t *testing.T, name string) *Object {
	xtnBytes := readSample(t, name+".xtn")

	var obj Object
	err := UnmarshalToMap(xtnBytes, &obj)
	if err != nil {
		t.Fatal(err)
	}
	return &obj
}

func exactMatch(t *testing.T, name string) {
	xtnMap, _ := loadSampleXtn(t, name, true)

	jsonBytes := readSample(t, name+".json")
	var jsonMap map[string]interface{}
	json.Unmarshal(jsonBytes, &jsonMap)

	if !reflect.DeepEqual(xtnMap, jsonMap) {
		t.Fatalf("sample %s was not parsed correctly", name+".xtn")
	}
}

func matchError(t *testing.T, name string, code string, line int) {
	_, err := loadSampleXtn(t, name, false)
	if err == nil {
		t.Fatalf("No error encountered parsing sample %s", name+".xtn")
	}
	if err.code != code {
		t.Fatalf("Expected error %s parsing sample %s but encountered error %s", code, name+".xtn", err.code)
	}
	if err.line != line {
		t.Fatalf("Expected error on line %d parsing sample %s but encountered error on line %d", line, name+".xtn", err.line)
	}
}

func assertSimpleKeyValue(t *testing.T, obj *Object, key string, value string) {
	v, ok := obj.elements[key]
	if !ok {
		t.Fatalf("Object does not have expected key %s", key)
	}
	text, ok := v.(*Text)
	if !ok {
		t.Fatalf("Expected key %s to have a pointer to xtn.Text", key)
	}
	if text.value != value {
		t.Fatalf("Expected xtn.Text at key %s to have a value of %s but encountered %s", key, value, text.value)
	}
}

func assertObject(t *testing.T, v any) *Object {
	obj, ok := v.(*Object)
	if !ok {
		t.Fatalf("Expected xtn.Object but encountered %v", v)
	}
	return obj
}

func assertArray(t *testing.T, v any) *Array {
	obj, ok := v.(*Array)
	if !ok {
		t.Fatalf("Expected xtn.Array but encountered %v", v)
	}
	return obj
}

func assertText(t *testing.T, v any) *Text {
	obj, ok := v.(*Text)
	if !ok {
		t.Fatalf("Expected xtn.Text but encountered %v", v)
	}
	return obj
}

func assertCondition(t *testing.T, condition bool, message string) {
	if !condition {
		t.Fatal(message)
	}
}

func TestLoadSample1(t *testing.T) {
	exactMatch(t, "sample1")
	obj := loadSampleXtnObj(t, "sample1")
	key2Val := assertObject(t, obj.elements["key2"])
	key7Val := assertText(t, key2Val.elements["key7"])
	assertCondition(t, key7Val.forceMultiline, "expected forceMultiline to be true")

	assertCondition(t, reflect.DeepEqual(key2Val.commentsAbove, []Comment{{}, {value: "This is a comment"}, {value: "This is a comment (same as above)"}, {}}), "comments of key2 do not match")

	assertCondition(t, reflect.DeepEqual(obj.commentsInnerBottom, []Comment{{}, {prefix: "meta", value: "This is a special comment"}, {prefix: "meta", value: "This is the same as above (still a special comment)"}}), "comments of key2 do not match")
}

func TestLoadComments1(t *testing.T) {
	obj := loadSampleXtnObj(t, "comments1")

	assertCondition(t, reflect.DeepEqual(obj.commentsInnerTop, []Comment{{value: "inner top of root object"}, {value: "same"}, {prefix: "##"}}), "comments of root object do not match")

	assertCondition(t, reflect.DeepEqual(obj.commentsInnerBottom, []Comment{{}, {prefix: "meta", value: "This is a special comment (inner bottom of root object)"}, {prefix: "meta", value: "This is the same as above (still a special comment)"}}), "inner bottom comments of root object do not match")

	key1Val := assertText(t, obj.elements["key1"])
	assertCondition(t, reflect.DeepEqual(key1Val.commentsAbove, []Comment{{}, {value: "above key1"}}), "comments above key1 do not match")
	assertCondition(t, reflect.DeepEqual(key1Val.commentsBelow, []Comment{{value: "below key1"}, {prefix: "##", value: "because of this"}}), "comments below key1 do not match")

	key2Val := assertObject(t, obj.elements["key2"])
	assertCondition(t, reflect.DeepEqual(key2Val.commentsAbove, []Comment{{}, {value: "This is a comment above key2"}, {value: "This is a comment (same as above)"}}), "comments above key2 do not match")
	assertCondition(t, reflect.DeepEqual(key2Val.commentsInnerTop, []Comment{{value: "inner top of key2"}, {prefix: "##"}}), "inner top comments of key2 do not match")
	assertCondition(t, len(key2Val.commentsInnerBottom) == 0, "Expected no inner bottom comments for key2")
	assertCondition(t, reflect.DeepEqual(key2Val.commentsBelow, []Comment{{value: "below key2"}, {prefix: "##"}}), "comments below key2 do not match")

	key3Val := assertText(t, key2Val.elements["key3"])
	assertCondition(t, reflect.DeepEqual(key3Val.commentsAbove, []Comment{{value: "for key3 (above)"}}), "comments above key3 do not match")
	assertCondition(t, reflect.DeepEqual(key3Val.commentsBelow, []Comment{{value: "also for key3 (below)"}, {prefix: "##"}}), "comments below key2 do not match")

	key4Val := assertArray(t, key2Val.elements["key4"])
	assertCondition(t, reflect.DeepEqual(key4Val.commentsAbove, []Comment{{value: "for key4 (above)"}}), "comments above key4 do not match")
	assertCondition(t, reflect.DeepEqual(key4Val.commentsInnerTop, []Comment{{value: "inner top of key4"}, {prefix: "##"}}), "inner top comments of key4 do not match")
	assertCondition(t, reflect.DeepEqual(key4Val.commentsInnerBottom, []Comment{{value: "inner bottom of key4"}}), "inner bottom comments of key4 do not match")
	assertCondition(t, len(key4Val.commentsBelow) == 0, "Expected no comments below key4")

	val41 := assertText(t, key4Val.elements[0])
	assertCondition(t, reflect.DeepEqual(val41.commentsAbove, []Comment{{value: "for value41 (above)"}}), "comments above value41 do not match")
	assertCondition(t, reflect.DeepEqual(val41.commentsBelow, []Comment{{value: "for value41 (below)"}, {prefix: "##"}}), "comments below value41 do not match")

	val42 := assertText(t, key4Val.elements[1])
	assertCondition(t, reflect.DeepEqual(val42.commentsAbove, []Comment{{value: "for value42"}}), "comments above value41 do not match")
	assertCondition(t, reflect.DeepEqual(val42.commentsBelow, []Comment{{value: "for value42 (below)"}, {prefix: "##"}}), "comments below value42 do not match")

	key5Val := assertObject(t, key2Val.elements["key5"])
	assertCondition(t, len(key5Val.commentsAbove) == 0, "comments above key5 should be empty")
	assertCondition(t, len(key5Val.commentsInnerTop) == 0, "comments for inner top of key5 should be empty")
	assertCondition(t, reflect.DeepEqual(key5Val.commentsInnerBottom, []Comment{{value: "inner bottom of key5"}}), "inner bottom comments of key5 do not match")
	assertCondition(t, reflect.DeepEqual(key5Val.commentsBelow, []Comment{{value: "for key5 (below)"}, {prefix: "##"}}), "comments below key5 do not match")

	key6Val := assertText(t, key5Val.elements["key6"])
	assertCondition(t, reflect.DeepEqual(key6Val.commentsAbove, []Comment{{value: "for key6"}}), "comments above key6 do not match")
	assertCondition(t, len(key6Val.commentsBelow) == 0, "comments below key6 should be empty")

	key7Val := assertText(t, key2Val.elements["key7"])
	assertCondition(t, reflect.DeepEqual(key7Val.commentsAbove, []Comment{{value: "for key7"}}), "comments above key7 do not match")
	assertCondition(t, reflect.DeepEqual(key7Val.commentsBelow, []Comment{{value: "for key7 (below)"}, {prefix: "##"}}), "comments below key7 do not match")

	key8Val := assertArray(t, key2Val.elements["key8"])
	assertCondition(t, len(key8Val.commentsAbove) == 0, "comments above key8 should be empty")
	assertCondition(t, len(key8Val.commentsInnerTop) == 0, "inner top comments of key8 should be empty")
	assertCondition(t, len(key8Val.commentsInnerBottom) == 0, "inner bottom comments of key8 should be empty")
	assertCondition(t, len(key8Val.commentsBelow) == 0, "comments below key8 should be empty")

	key8_2Val := assertObject(t, key8Val.elements[2])
	assertCondition(t, len(key8_2Val.commentsAbove) == 0, "comments above 3rd element of key8 should be empty")
	assertCondition(t, reflect.DeepEqual(key8_2Val.commentsInnerTop, []Comment{{value: "inner top"}, {prefix: "##"}}), "inner top comments of 3rd element of key8 do not match")
	assertCondition(t, reflect.DeepEqual(key8_2Val.commentsInnerBottom, []Comment{{value: "inner bottom"}}), "inner bottom comments of 3rd element of key8 do not match")
	assertCondition(t, len(key8_2Val.commentsBelow) == 0, "comments below 3rd element of key8 should be empty")

	key8_3Val := assertObject(t, key8Val.elements[3])
	assertCondition(t, len(key8_3Val.commentsAbove) == 0, "comments above 4th element of key8 should be empty")
	assertCondition(t, len(key8_3Val.commentsInnerTop) == 0, "inner top comments of 4th element of key8 should be empty")
	assertCondition(t, reflect.DeepEqual(key8_3Val.commentsInnerBottom, []Comment{{value: "inner bottom"}}), "inner bottom comments of 4th element of key8 do not match")
	assertCondition(t, len(key8_3Val.commentsBelow) == 0, "comments below 4th element of key8 should be empty")

	key8_4Val := assertArray(t, key8Val.elements[4])
	assertCondition(t, len(key8_4Val.commentsAbove) == 0, "comments above 5th element of key8 should be empty")
	assertCondition(t, len(key8_4Val.commentsInnerTop) == 0, "inner top comments of 5th element of key8 should be empty")
	assertCondition(t, len(key8_4Val.commentsInnerBottom) == 0, "inner bottom comments of 5th element of key8 should be empty")
	assertCondition(t, reflect.DeepEqual(key8_4Val.commentsBelow, []Comment{{value: "for last child of key8"}, {prefix: "##"}, {value: "also for last child of key8"}, {prefix: "##"}}), "comments below 5th element of key8 do not match")
}

func TestConvertNbsp(t *testing.T) {
	obj := loadSampleXtnObj(t, "convert_nbsp")
	assertSimpleKeyValue(t, obj, "key1", "a  b    c d")
}

func TestLoadMissingBraces(t *testing.T) {
	matchError(t, "missing_braces", ParseErrorUnmatchedCloseMarker, 3)
}
func TestLoadMissingBrackets(t *testing.T) {
	matchError(t, "missing_brackets", ParseErrorPlusEncounteredOutsideArray, 2)
}
func TestLoadExtraClose(t *testing.T) {
	matchError(t, "extra_close", ParseErrorUnmatchedCloseMarker, 9)
}
func TestLoadMissingClose(t *testing.T) {
	matchError(t, "missing_close", ParseErrorMissingCloseMarker, 8)
}
func TestLoadMissingColonInArrEl(t *testing.T) {
	matchError(t, "missing_colon_arr_el", ParseErrorMissingColon, 5)
}
func TestLoadMissingColonInObj(t *testing.T) {
	matchError(t, "missing_colon_obj", ParseErrorMissingColon, 5)
}
func TestLoadComplexText(t *testing.T) {
	exactMatch(t, "complex_text")
}
func TestMixedTabsSpaces1(t *testing.T) {
	matchError(t, "mixed_tabs_spaces1", ParseErrorIndentationMustNotBeMixed, 3)
}
func TestMixedTabsSpaces2(t *testing.T) {
	matchError(t, "mixed_tabs_spaces2", ParseErrorIndentationMustNotBeMixed, 3)
}
func TestMixedTabsSpaces3(t *testing.T) {
	matchError(t, "mixed_tabs_spaces3", ParseErrorIndentationMustNotBeMixed, 4)
}
func TestMixedTabsSpaces4(t *testing.T) {
	matchError(t, "mixed_tabs_spaces4", ParseErrorIndentationMustNotBeMixed, 5)
}
func TestInsufficientIndentation1(t *testing.T) {
	matchError(t, "insufficient_indentation1", ParseErrorInsufficientIndentation, 5)
}
func TestInsufficientIndentation2(t *testing.T) {
	matchError(t, "insufficient_indentation2", ParseErrorInsufficientIndentation, 5)
}
func TestInsufficientIndentation3(t *testing.T) {
	matchError(t, "insufficient_indentation3", ParseErrorInsufficientIndentation, 5)
}
func TestBadKeyInObj1(t *testing.T) {
	matchError(t, "bad_key_in_obj1", ParseErrorPlusEncounteredOutsideArray, 4)
}
func TestBadKeyInArr11(t *testing.T) {
	matchError(t, "bad_key_in_arr1", ParseErrorArrayElementMustNotHaveAKey, 5)
}
func TestRepeatedKeyInObj1(t *testing.T) {
	matchError(t, "repeated_key_in_obj1", ParseErrorObjectKeysCannotBeRepeated, 4)
}
