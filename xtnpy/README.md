## xtn Repository

[On Github](https://github.com/koustubhmoharir/xtn)

## Sample code
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
