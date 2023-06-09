# Human readable specification

## Basics
Newlines are significant. Other whitespace is insignificant in most (but not all) places. Indentation of 4 spaces (not tabs) per level of nesting is recommended for readability. Detailed specifications are in the sections below.

Casing is significant, but applications that consume this format may ignore it.

## Comments
Comments start with a #. Whitespace before the # is allowed. An entire line is either a comment or not a comment. A space after the # is recommended for readability. Trailing whitespace on a comment line is not considered significant.
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
Whitespace is allowed between the key and the first single quote, and between the second single quote and the colon, but not between the two single quotes. Unlike other places, whitespace used for indentation is significant in a key value pair with a complex text value. Indentation can use either spaces (ASCII 32) or tabs (ASCII 9, '\t' in most languages), but spaces and tabs cannot be mixed. The number of leading spaces on the line containing the key are counted. For this purpose, a tab is considered equivalent to 4 spaces. 4 more spaces are added to the count. All lines of text must be indented by exactly this count. This indentation is trimmed on each line and whitespace beyond this indentation is retained. The closing four dashes terminate the text and the indentation of these dashes must exactly match the indentation on the line containing the key.

The newline on the line immediately above the closing line is not part of the text value.

Complex text values may appear in key value pairs or in array elements.

## 'Attachment' of comments
Comment lines are normally attached to the first non-comment line downward in the document. However, a comment that starts with #### is attached upwards along with any comment lines in between itself and the non-comment line above it. If there is no non-comment line in the direction of attachment, the comment line applies to the document as a whole, along with other comment lines in the same direction.
```
# This comment applies to the whole document
####
# This comment too
####
# This comment describes the line below
key1: value1
# This comment describes the line above
####
# This comment describes the line below
key2{}:
    # This comment describes the line above
    ####
    # This comment describes the line below
    key3: value 3
    # This comment describes the line below
----
# This comment describes the line above
####
# This comment applies to the whole document
```

## Extensions via comments

A comment starting with ## is considered a "special" comment. The first word after the ## is considered part of the special syntax. It is recommended to not have a space between the ## and the first word after it. The significance of special comments is application defined. This specification merely standardizes a way to add metadata via comments.

This is an example of adding type metadata
```
##type TypeName
```