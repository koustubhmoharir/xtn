import xtn
import json
from pathlib import Path

samples_dir = Path(__file__).parent.joinpath('../../samples')

def load_json(path: Path):
    with open(path, 'r') as f:
        return json.load(f)
    
def load_xtn(path: Path):
    with open(path, 'r') as f:
        return xtn.load(f)

def exact_match(name: str):
    x = load_xtn(samples_dir.joinpath(f'{name}.xtn'))
    j = load_json(samples_dir.joinpath(f'{name}.json'))
    assert x == j

def test_sample1():
    exact_match('sample1')