import xtn
from . import utils
from pathlib import Path
import io

def match_obj(obj: xtn.XtnObject, sample_name):
    sio = io.StringIO()
    obj.dump(sio)
    dumped = sio.getvalue()
    orig = utils.sample_xtn_path(sample_name).read_text()
    assert dumped == orig

def test_write_sample1():
    obj = utils.load_sample_xtn_obj('sample1')
    match_obj(obj, 'sample1')
    
    
def test_write_leading_space():
    obj = xtn.XtnObject()
    obj.elements['key1'] = xtn.XtnText(' a')
    match_obj(obj, 'leading_space')
        
def test_write_trailing_space():
    obj = xtn.XtnObject()
    obj.elements['key1'] = xtn.XtnText('a ')
    match_obj(obj, 'trailing_space')

def test_write_nbsp():
    obj = xtn.XtnObject()
    obj.elements['key1'] = xtn.XtnText('a\xa0b')
    match_obj(obj, 'retain_nbsp')
