import { test, expect } from "vitest";
import { loadJson, loadXtn } from "./testutils";
import { children } from "./parser";

test('match_sample1', () => {
    const xtn = loadXtn('sample1').data();
    const json = loadJson('sample1');

    expect(xtn).toEqual(json);
});

test('match_sample1_json', () => {
    const xtn = loadXtn('sample1', true).data()[children]![0];
    const json = loadJson('sample1');

    expect(xtn).toEqual(json);
});

test('convert_nbsp', () => {
    const xtn = loadXtn('convert_nbsp').data();

    expect(xtn['key1']).toBe('a  b    c d');
});


test('match_complex_text', () => {
    const xtn = loadXtn('complex_text').data();
    const json = loadJson('complex_text');

    expect(xtn).toEqual(json);
});

test('match_complex_text_json', () => {
    const xtn = loadXtn('complex_text', true).data()[children]![0];
    const json = loadJson('complex_text');

    expect(xtn).toEqual(json);
});


test('match_explicit_integers', () => {
    const xtn = loadXtn('integers').data();
    const json = loadJson('integers');

    expect(xtn).toEqual(json);
});

test('match_implicit_integers', () => {
    const xtn = loadXtn('integers2').data();
    const json = loadJson('integers');

    expect(xtn).toEqual(json);
});