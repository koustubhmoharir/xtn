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

test('match_implicit_integers3', () => {
    const xtn = loadXtn('integers3').data();
    const json = loadJson('integers');

    expect(xtn).toEqual(json);
});

test('match_explicit_integers4', () => {
    const xtn = loadXtn('integers4').data();
    const json = loadJson('integers');

    expect(xtn).toEqual(json);
});

test('match_keywords_as_keys', () => {
    const xtn = loadXtn('keywords_as_keys').data();
    const json = loadJson('keywords_as_keys');

    expect(xtn).toEqual(json);
});

test('match_strings', () => {
    const xtn = loadXtn('strings').data();
    const json = loadJson('strings');

    expect(xtn).toEqual(json);
});

test('match_booleans', () => {
    const xtn = loadXtn('booleans').data();
    const json = loadJson('booleans');

    expect(xtn).toEqual(json);
});

test('match_nulls', () => {
    const xtn = loadXtn('nulls').data();
    const json = loadJson('nulls');

    expect(xtn).toEqual(json);
});


test('match_implicit_reals', () => {
    const xtn = loadXtn('reals').data();
    const json = loadJson('reals');

    expect(xtn).toEqual(json);
});

test('match_implicit_reals2', () => {
    const xtn = loadXtn('reals2').data();
    const json = loadJson('reals');

    expect(xtn).toEqual(json);
});

test('match_explicit_reals3', () => {
    const xtn = loadXtn('reals3').data();
    const json = loadJson('reals');

    expect(xtn).toEqual(json);
});

test('test_named_reals', () => {
    const xtn = loadXtn('named_reals').data();

    expect(xtn["o"]).toEqual(Number.NaN);
    expect(xtn["p"]).toEqual(Number.NaN);
    expect(xtn["q"]).toEqual(Number.NaN);
    expect(xtn["r"]).toEqual(Number.POSITIVE_INFINITY);
    expect(xtn["s"]).toEqual(Number.NEGATIVE_INFINITY);
    expect(xtn["t"]).toEqual(Number.POSITIVE_INFINITY);
    expect(xtn["u"]).toEqual(Number.NaN);
    expect(xtn["v"]).toEqual(Number.NaN);
    expect(xtn["w"]).toEqual(Number.NaN);
    expect(xtn["x"]).toEqual(Number.POSITIVE_INFINITY);
    expect(xtn["y"]).toEqual(Number.NEGATIVE_INFINITY);
    expect(xtn["z"]).toEqual(Number.POSITIVE_INFINITY);
});