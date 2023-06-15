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

    assert(key2_val.comments_above is not None and len(key2_val.comments_above) == 4)
    assert(key2_val.comments_above[1].prefix == '')
    assert(key2_val.comments_above[1].value == 'This is a comment')
    assert(key2_val.comments_above[2].value == 'This is a comment (same as above)')

    assert(obj.comments_inner_bottom is not None and len(obj.comments_inner_bottom) == 3)
    assert(obj.comments_inner_bottom[1].prefix == 'meta')
    assert(obj.comments_inner_bottom[1].value == 'This is a special comment')
    assert(obj.comments_inner_bottom[2].prefix == 'meta')
    assert(obj.comments_inner_bottom[2].value == 'This is the same as above (still a special comment)')

    
def test_load_comments1():
    obj = utils.load_sample_xtn_obj('comments1')
    assert(obj.comments_inner_top is not None and len(obj.comments_inner_top) == 3)
    assert(obj.comments_inner_top[0].value == 'inner top of root object')
    assert(obj.comments_inner_top[1].value == 'same')
    assert(obj.comments_inner_top[2].prefix == '##')
    assert(obj.comments_inner_top[2].value == '')
    
    assert(obj.comments_inner_bottom is not None and len(obj.comments_inner_bottom) == 3)
    assert(obj.comments_inner_bottom[0].value == '')
    assert(obj.comments_inner_bottom[1].prefix == 'meta')
    assert(obj.comments_inner_bottom[1].value == 'This is a special comment (inner bottom of root object)')
    assert(obj.comments_inner_bottom[2].prefix == 'meta')
    assert(obj.comments_inner_bottom[2].value == 'This is the same as above (still a special comment)')

    key1_val = obj.elements['key1']
    assert(key1_val.comments_above is not None and len(key1_val.comments_above) == 2)
    assert(key1_val.comments_above[0].value == '')
    assert(key1_val.comments_above[1].value == 'above key1')
    assert(key1_val.comments_below is not None and len(key1_val.comments_below) == 2)
    assert(key1_val.comments_below[0].value == 'below key1')
    assert(key1_val.comments_below[1].prefix == '##')
    assert(key1_val.comments_below[1].value == 'because of this')

    
    key2_val = obj.elements['key2']
    assert(key2_val.comments_above is not None and len(key2_val.comments_above) == 3)
    assert(key2_val.comments_above[0].value == '')
    assert(key2_val.comments_above[1].value == 'This is a comment above key2')
    assert(key2_val.comments_above[2].value == 'This is a comment (same as above)')
    assert(key2_val.comments_inner_top is not None and len(key2_val.comments_inner_top) == 2)
    assert(key2_val.comments_inner_top[0].value == 'inner top of key2')
    assert(key2_val.comments_inner_top[1].prefix == '##')
    assert(key2_val.comments_inner_top[1].value == '')
    assert(key2_val.comments_inner_bottom is None)
    assert(key2_val.comments_below is not None and len(key2_val.comments_below) == 2)
    assert(key2_val.comments_below[0].value == 'below key2')
    assert(key2_val.comments_below[1].prefix == '##')
    assert(key2_val.comments_below[1].value == '')

    key3_val = key2_val.elements['key3']
    assert(key3_val.comments_above is not None and len(key3_val.comments_above) == 1)
    assert(key3_val.comments_above[0].value == 'for key3 (above)')
    assert(key3_val.comments_below is not None and len(key3_val.comments_below) == 2)
    assert(key3_val.comments_below[0].value == 'also for key3 (below)')
    assert(key3_val.comments_below[1].prefix == '##')
    assert(key3_val.comments_below[1].value == '')
    
    
    key4_val = key2_val.elements['key4']
    assert(key4_val.comments_above is not None and len(key4_val.comments_above) == 1)
    assert(key4_val.comments_above[0].value == 'for key4 (above)')
    assert(key4_val.comments_inner_top is not None and len(key4_val.comments_inner_top) == 2)
    assert(key4_val.comments_inner_top[0].value == 'inner top of key4')
    assert(key4_val.comments_inner_top[1].prefix == '##')
    assert(key4_val.comments_inner_top[1].value == '')
    assert(key4_val.comments_inner_bottom is not None and len(key4_val.comments_inner_bottom) == 1)
    assert(key4_val.comments_inner_bottom[0].value == 'inner bottom of key4')
    assert(key4_val.comments_below is None)

    value41 = key4_val.elements[0]
    assert(value41.comments_above is not None and len(value41.comments_above) == 1)
    assert(value41.comments_above[0].value == 'for value41 (above)')
    assert(value41.comments_below is not None and len(value41.comments_below) == 2)
    assert(value41.comments_below[0].value == 'for value41 (below)')
    assert(value41.comments_below[1].prefix == '##')
    assert(value41.comments_below[1].value == '')

    value42 = key4_val.elements[1]
    assert(value42.comments_above is not None and len(value42.comments_above) == 1)
    assert(value42.comments_above[0].value == 'for value42')
    assert(value42.comments_below is not None and len(value42.comments_below) == 2)
    assert(value42.comments_below[0].value == 'for value42 (below)')
    assert(value42.comments_below[1].prefix == '##')
    assert(value42.comments_below[1].value == '')

    key5_val = key2_val.elements['key5']
    assert(key5_val.comments_above is None)
    assert(key5_val.comments_inner_top is None)
    assert(key5_val.comments_inner_bottom is not None and len(key5_val.comments_inner_bottom) == 1)
    assert(key5_val.comments_inner_bottom[0].value == 'inner bottom of key5')
    assert(key5_val.comments_below is not None and len(key5_val.comments_below) == 2)
    assert(key5_val.comments_below[0].value == 'for key5 (below)')
    assert(key5_val.comments_below[1].prefix == '##')
    assert(key5_val.comments_below[1].value == '')

    key6_val = key5_val.elements['key6']
    assert(key6_val.comments_above is not None and len(key6_val.comments_above) == 1)
    assert(key6_val.comments_above[0].value == 'for key6')

    key7_val = key2_val.elements['key7']
    assert(key7_val.comments_above is not None and len(key7_val.comments_above) == 1)
    assert(key7_val.comments_above[0].value == 'for key7')
    assert(key7_val.comments_below is not None and len(key7_val.comments_below) == 2)
    assert(key7_val.comments_below[0].value == 'for key7 (below)')
    assert(key7_val.comments_below[1].prefix == '##')
    assert(key7_val.comments_below[1].value == '')

    key8_val = key2_val.elements['key8']
    assert(key8_val.comments_above is None)
    assert(key8_val.comments_inner_top is None)
    assert(key8_val.comments_inner_bottom is None)
    assert(key8_val.comments_below is None)

    key8_2_val = key8_val.elements[2]
    assert(key8_2_val.comments_inner_top is not None and len(key8_2_val.comments_inner_top) == 2)
    assert(key8_2_val.comments_inner_top[0].value == 'inner top')
    assert(key8_2_val.comments_inner_top[1].prefix == '##')
    assert(key8_2_val.comments_inner_top[1].value == '')
    assert(key8_2_val.comments_inner_bottom is not None and len(key8_2_val.comments_inner_bottom) == 1)
    assert(key8_2_val.comments_inner_bottom[0].value == 'inner bottom')
    assert(key8_2_val.comments_below is None)

    key8_3_val = key8_val.elements[3]
    assert(key8_3_val.comments_inner_top is None)
    assert(key8_3_val.comments_inner_bottom is not None and len(key8_3_val.comments_inner_bottom) == 1)
    assert(key8_3_val.comments_inner_bottom[0].value == 'inner bottom')

    key8_4_val = key8_val.elements[4]
    assert(key8_4_val.comments_below is not None and len(key8_4_val.comments_below) == 4)
    assert(key8_4_val.comments_below[0].value == 'for last child of key8')
    assert(key8_4_val.comments_below[1].prefix == '##')
    assert(key8_4_val.comments_below[1].value == '')
    assert(key8_4_val.comments_below[2].value == 'also for last child of key8')
    assert(key8_4_val.comments_below[3].prefix == '##')
    assert(key8_4_val.comments_below[3].value == '')

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

def test_complex_test():
    exact_match('complex_text')

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