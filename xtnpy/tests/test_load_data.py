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
    m = re.search(r'^.*?:(\d+): error: ', ex.value.message)
    assert m is not None
    err_line = m.group(1)
    assert err_line == str(line)

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
    match_error('missing_braces2', xtn.XtnErrorCode.ARRAY_ELEMENT_MUST_START_WITH_PLUS, 6)

def test_load_missing_brackets():
    match_error('missing_brackets', xtn.XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY, 2)

def test_extra_close():
    match_error('extra_close', xtn.XtnErrorCode.UNMATCHED_CLOSE_MARKER, 9)

def test_missing_close():
    match_error('missing_close', xtn.XtnErrorCode.MISSING_CLOSE_MARKER, 8)

def test_missing_colon_in_arr_el():
    match_error('missing_colon_arr_el', xtn.XtnErrorCode.MISSING_COLON, 5)

def test_missing_colon_in_obj():
    match_error('missing_colon_obj', xtn.XtnErrorCode.MISSING_COLON, 5)

def test_complex_test_poor():
    exact_match('complex_text_poor')

def test_mixed_tabs_spaces1():
    match_error('mixed_tabs_spaces1', xtn.XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 3)

def test_mixed_tabs_spaces2():
    match_error('mixed_tabs_spaces2', xtn.XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 3)
    
def test_mixed_tabs_spaces3():
    match_error('mixed_tabs_spaces3', xtn.XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 4)
    
def test_mixed_tabs_spaces4():
    match_error('mixed_tabs_spaces4', xtn.XtnErrorCode.INDENTATION_MUST_NOT_BE_MIXED, 5)
    
def test_insufficient_indentation1():
    match_error('insufficient_indentation1', xtn.XtnErrorCode.INSUFFICIENT_INDENTATION, 5)

def test_insufficient_indentation2():
    match_error('insufficient_indentation2', xtn.XtnErrorCode.INSUFFICIENT_INDENTATION, 5)

def test_insufficient_indentation3():
    match_error('insufficient_indentation3', xtn.XtnErrorCode.INSUFFICIENT_INDENTATION, 5)

def test_bad_key_in_obj1():
    match_error('bad_key_in_obj1', xtn.XtnErrorCode.PLUS_ENCOUNTERED_OUTSIDE_ARRAY, 4)

def test_bad_key_in_arr1():
    match_error('bad_key_in_arr1', xtn.XtnErrorCode.ARRAY_ELEMENT_MUST_NOT_HAVE_A_KEY, 5)

def test_repeated_key_in_obj1():
    match_error('repeated_key_in_obj1', xtn.XtnErrorCode.OBJECT_KEYS_CANNOT_BE_REPEATED, 4)