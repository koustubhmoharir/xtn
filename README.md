# xtn
xtn stands for eXtensible Text Notation. It is a format for defining "objects" in text - useful for configuration or some kinds of DSLs. The main goal of the format is to avoid escaping rules for values enabling easy and robust definition of file paths, regular expressions, code fragments in any language, etc. This format was created because none of the options in widespread use (such as JSON, XML, YAML, TOML, INI) work well enough for this purpose.

## Specification

[Specification for end users of the format](spec.md)

## Principles

- The format is generic and minimal and only codifies behavior that is common to a large number of applications. Applications should extend the format by specifying stricter rules.
    - The structure of data is encoded, not the type. Rules for interpretation of values as numbers, dates, booleans, etc are out of scope.
    - Any whitespace other than newlines is not used for the interpretation of structure.
    - The number of symbols used in the format is kept to the absolute possible minimum, and there are no textual keywords.
    - Case sensitivity rules for keys and values is out of scope.
    - The simplest possible syntax is reserved for the common case where values do not have newlines, leading or trailing whitespaces, or any whitespace that is different from the ASCII space (32). Such whitespace leads to bugs that are difficult to track, and is rarely useful. The format does allow the usage of values with arbitrary whitespace with a more complex syntax.
    - Keys are analogous to keywords or identifiers in a programming language, and hence are subject to stricter rules. This implies that 'keys' in an arbitrary dictionary or mapping should be encoded as values. However, other than regularizing whitespace, and disallowing characters that would cause ambiguity, no restrictions are imposed on keys. Applications can add restrictions or define their own interpretions for other characters in keys.
- The format is capable of representing arbitrary data provided it is representable as text.
    - In particular, it is possible to embed text in any format including xtn itself within a value, without requiring any transformations to the embedded text whatsoever.

## Implementations
Python - [xtn package](https://pypi.org/project/xtn/)

