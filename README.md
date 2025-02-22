# xtn
xtn stands for eXtensible Text Notation. It is a format for defining "objects" in text - useful for configuration, object creation, and some kinds of DSLs. The main goal of the format is to avoid escaping rules for values enabling easy and robust definition of file paths, regular expressions, code fragments in any language, etc. This format was created because none of the options in widespread use (such as JSON, XML, YAML, TOML, INI) work well enough for this purpose.

## Specification

[Specification for end users of the format](spec.md)

## Principles

- Maintain compatibility with JSON and JSON5 for easier adoption. Any valid JSON / JSON5 file is also a valid XTN file.
- Avoid the need for escape sequences in text values as much as possible.
- Avoid the likelihood of syntax errors even when the file is edited by a user who does not understand the rules of JSON, JSON5, or XTN.
- Editing values in an existing file should not require consulting any documentation about the format. The syntax should be self-evident from examples.
- Avoid unnecessarily strict rules.
- Avoid keywords.

## Implementations
Python - [xtn package](https://pypi.org/project/xtn/)

