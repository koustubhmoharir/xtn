# Human readable specification

## Basics
Newlines are significant. Other whitespace is insignificant in most (but not all) places. Indentation of 4 spaces (not tabs) per level of nesting is recommended for readability. Detailed specifications are in the sections below.

Casing is significant, but applications that consume this format may ignore it.

## Comments
Comments start with a #. Whitespace before the # is allowed. An entire line is either a comment or not a comment.
```
# This is a comment
```

## Key Value Pairs where the value is "simple" text
The basic unit is a key value pair like
```
key: value
```
Leading and trailing spaces on either side of key and value are trimmed. Multiple consecutive whitespaces within the key are trimmed to a single regular space (ASCII 32). Whitespace within the value is converted to regular space but not trimmed. The key cannot have the following characters in it: colon, plus, square brackets, braces. The definition of more complex values is described later.

A line with a key value pair cannot have anything else on it, not even a comment (A # would be interpreted as part of the value)

## Key Value Pairs where the value is an "object"
An object is a collection of key value pairs where the values can be text (simple or complex), objects, or arrays (defined later). A key value pair where the value is an object looks like
```
key{}:
    inner_key1: value1
    inner_key2: value2
----
```
Whitespace is allowed between the key and the opening brace, and between the closing brace and the colon, but not between the braces. A newline is required before the key value pairs in the object. In this example, the object contains two key value pairs with simple text values, but zero or more key value pairs are allowed and the values could be text, objects or arrays (defined later).

Keys in an object must be unique. The same key cannot appear more than once in the same object.

The closing four dashes terminate the object.

The contents of a file are the key value pairs in an implicit top-level object. This top-level object is not terminated with closing dashes because its opening and closing is implicit.

Indentation is recommended for readability but is not enforced.

## Arrays
An array is a sequence of text, objects, or arrays. A key value pair where the value is an array looks like
```
key[]:
    +: simple text value
    +{}:
        key1: value1
        key2: value2
    ----
    +[]:
        +: nested array element value
    ----
    +: another simple text value
----
```
Whitespace is allowed between the key and the opening bracket, and between the closing bracket and the colon, but not between the brackets. A newline is required before the elements in the array. In this example, the array contains four elements - a text value, an object, another array, and another text value - but zero or more elements are allowed. Usually, all elements will have the same shape. Each element of an array is like a key value pair in an object. The only difference is that + is used instead of the key.

The closing four dashes terminate the array.

Indentation is recommended for readability but is not enforced.

## Complex text values
When the restriction of no new-lines, and the whitespace trimming and conversion in a simple text value is not appropriate, the text is considered complex. A key value pair with a complex text value looks like
```
key'':
    Arbitrary text here
    Multiple lines are allowed including lines like the one below
    ----
    The line above does not terminate the value because it is indented.
----
```
Whitespace is allowed between the key and the first single quote, and between the second single quote and the colon, but not between the two single quotes. Unlike other places, whitespace used for indentation is significant in a key value pair with a complex text value. Indentation can use either spaces (ASCII 32) or tabs (ASCII 9, '\t' in most languages), but spaces and tabs cannot be mixed. The number of leading spaces on the line containing the key are counted. For this purpose, a tab is considered equivalent to 4 spaces. 4 more spaces are added to the count. It is recommended that all lines of text are indented by exactly this count. If this is the case, this indentation is trimmed on each line and whitespace beyond this indentation is retained. However, if this is not the case, the precise behavior is complex because it tries to allow most cases of poor indentation without causing unintended interpretation of the structure.

The logic is as follows. The count of spaces is taken as the starting value of maximum expected indentation. On each line of text, if the actual indentation is less than the current maximum expected indentation, the maximum expected indentation for the next line is reset to the actual indentation. Thus the maximum expected indentation can reduce but not increase. Indentation that is less than or equal to the maximum expected indentation is trimmed. Indentation must not be mixed. Any whitespace after the indentation is retained as part of the value and such whitespace is not restricted to the specific indentation character in use (tab or space), since it is not considered as indentation. The text may span as many lines as needed. The text is terminated by a line that contains 4 closing dashes with whitespace allowed on either side, but nothing else, provided the indentation on such a line is not more than the indentation on the key line. To avoid confusion, lines that start with a dash as the first non-whitespace character but insufficient indentation compared to the recommended indentation for the first line of text are not allowed.

The newline on the line immediately above the closing line is not part of the text value.

Complex text values may appear in key value pairs or in array elements.
