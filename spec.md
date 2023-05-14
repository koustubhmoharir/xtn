# Human readable specification

## Basics
Newlines are significant. Other whitespace is insignificant in most places, but indentation of 4 spaces (not tabs) per level of nesting is recommended for readability. Detailed specifications are in the sections below.

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

## Objects
An object is a collection of key value pairs where the values can be text (simple or complex), objects, or arrays (defined later).

The content of an entire file is an object. A key value pair where the value is an object looks like
```
key{}:
    inner_key1: value1
    inner_key2: value2
----
```
Whitespace is allowed between the key and the opening brace, and between the closing brace and the colon, but not between the braces. A newline is required before the key value pairs in the object. In this example, the object contains two key value pairs with simple text values, but zero or more key value pairs are allowed and the values could be text, objects or arrays (defined later).

The closing four dashes terminate the object and are required for termination, except in an array.

Keys in an object must be unique. The same key cannot appear more than once in the same object.

Indentation is recommended for readability but is not enforced.

## Arrays
An array is a sequence of text, objects, or arrays. A key value pair where the value is an array looks like
```
key[]:
    +: simple text value
    +{}:
        key1: value1
        key2: value2
    +[]:
        +: nested array element value
    +: another simple text value
----
```
Whitespace is allowed between the key and the opening bracket, and between the closing bracket and the colon, but not between the brackets. A newline is required before the elements in the array. In this example, the array contains four elements - a text value, an object, another array, and another text value - but zero or more elements are allowed. Usually, all elements will have the same shape. Each element is like a key value pair in an object, with two differences. + is used instead of the key, and array elements are not terminated with four dashes.

The closing four dashes terminate the array and are required for termination, except if the array is itself an element in another array.

Indentation is recommended for readability but is not enforced.

## Complex text values
When the restriction of no new-lines, and the whitespace trimming and conversion in a simple text value is not appropriate, the text is considered complex. A key value pair with a complex text value looks like
```
key'':
    ''''
    Arbitrary text here
    Multiple lines are allowed
    ''''
```
Whitespace is allowed between the key and the first single quote, and between the second single quote and the colon, but not between the two single quotes. The text in the value is started and terminated by lines containing a minimum of four consecutive single quotes and nothing other than whitespace. More than 4 single quotes should be used if the text value has a sequence. The number of quotes on the start and termination lines must match. The indentation as defined by the start line is trimmed according to the following rule - the leading whitespace characters on the start line are counted and leading whitespace characters on each line of the text are trimmed up to a maximum of the count on the start line. In other words, any whitespace characters in excess of the indentation on the start line is retained. The final newline character just before the termination line is dropped.

Complex text values may appear in key value pairs or in array elements.

A comment is not allowed between the key line and the start line. This is the only place where a comment is not allowed.
