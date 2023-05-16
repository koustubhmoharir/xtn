from . import utils
from pathlib import Path
import xtn
import pytest
import re

def exact_match(name: str):
    x = utils.load_sample_xtn(name)
    j = utils.load_sample_json(name)
    assert x == j

def match_error(name: str, code: xtn.XtnErrorCode, line: int):
    with pytest.raises(xtn.XtnException) as ex:
        utils.load_sample_xtn(name)
    assert ex.value.code == code
    assert re.match(r'.*?:' + str(line) + ': error: ', ex.value.message) != None

def test_load_sample1():
    exact_match('sample1')
    obj = utils.load_sample_xtn_obj('sample1')
    key2_val = obj.elements['key2']
    assert(isinstance(key2_val, xtn.XtnObject))
    key7_val = key2_val.elements['key7']
    assert(isinstance(key7_val, xtn.XtnText))
    assert(key7_val.force_multiline)

def test_convert_nbsp():
    obj = utils.load_sample_xtn('convert_nbsp')
    assert obj['key1'] == 'a  b    c d'

def test_load_missing_braces():
    match_error('missing_braces', xtn.XtnErrorCode.UNMATCHED_CLOSE_MARKER, 3)

def test_load_missing_braces2():
    match_error('missing_braces2', xtn.XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, 5)

def test_load_missing_brackets():
    match_error('missing_brackets', xtn.XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY, 2)

def test_extra_close():
    match_error('extra_close', xtn.XtnErrorCode.UNMATCHED_CLOSE_MARKER, 7)

def test_missing_close():
    #with pytest.raises(xtn.XtnException):
        match_error('missing_close', xtn.XtnErrorCode.MISSING_CLOSE_MARKER, 6)