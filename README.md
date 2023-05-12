# xtn
xtn stands for eXtensible Text Notation. It is a format for defining "objects" in text - useful for configuration or some kinds of DSLs. The main goal of the format is to avoid escaping rules for values enabling easy definition of file paths, regular expressions, code fragments in any language, etc. This format was created because none of the options in widespread use (such as JSON, XML, YAML, TOML, INI) work well enough for this purpose.

## Python implementation
An implementation of a parser in Python is in xtn.py
Validation of invalid syntax will be improved over time

Sample code
```
import xtn

# reads the data in the file (without comments) into a dict with key value pairs, the values can be dict, list, str
with open(r'path/to/file.xtn', 'r') as f:
    data = xtn.load(f)

# reads the file including comments into XtnObject
with open(r'path/to/file.xtn', 'r') as f:
    obj = xtn.XtnObject.load(f)

# writes the XtnObject with any changes back to a file with canonical indentation
with open(r'path/to/file.xtn', 'w') as f:
    obj.dump(f)
```
