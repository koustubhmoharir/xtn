from . import utils
from pathlib import Path
import xtn

def exact_match(name: str):
    x = utils.load_sample_xtn(name)
    j = utils.load_sample_json(name)
    assert x == j

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