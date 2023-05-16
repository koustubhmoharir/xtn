import xtn
import json
from pathlib import Path

samples_dir = Path(__file__).parent.joinpath('../../samples').resolve()

def sample_xtn_path(name: str):
    return samples_dir.joinpath(f'{name}.xtn')

def sample_json_path(name: str):
    return samples_dir.joinpath(f'{name}.json')

def load_sample_json(name: str):
    with open(sample_json_path(name), 'r') as f:
        return json.load(f)
    
def load_sample_xtn(name: str):
    with open(sample_xtn_path(name), 'r') as f:
        return xtn.load(f)
    
def load_sample_xtn_obj(name: str):
    with open(sample_xtn_path(name), 'r') as f:
        return xtn.XtnObject.load(f)