import { test, expect } from "vitest";
import { loadJson, loadXtn, loadXtnErrors } from "./testutils";
import { XtnParseErrorCode, children, type XtnEnvironment, type XtnTagName, type XtnTagNameSegment } from "./parser";

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

test('match_strings_ml', () => {
    const xtn = loadXtn('strings_ml').data();
    const json = loadJson('strings_ml');

    expect(xtn).toEqual(json);
});

function segToJSON(seg: XtnTagNameSegment) {
    if (seg.args?.length) {
        return {
            name: seg.name,
            args: seg.args.map(a => tagToJSON(a))
        };
    }
    else {
        return seg.name;
    }
}
function tagToJSON(tag: XtnTagName): any {
    if (tag.segments.length > 1 || tag.segments[0].args?.length) {
        return ({
            name: tag.name,
            segments: tag.segments.map(s => segToJSON(s))
        });
    }
    return tag.name;
}

const env: XtnEnvironment = {
    construct(tag, args, opts) {
        const obj = { $tag: tagToJSON(tag) } as any;
        if (args && opts) {
            obj.$args = args;
            if (Object.keys(opts).length > 0)
                obj.$opts = opts;
        }
        return obj;
    },
};

test('match_constructors', () => {
    const xtn = loadXtn('constructors').data(env);
    const json = loadJson('constructors');

    expect(xtn[children]).toEqual(json);
});

test('match_constructors_type_args', () => {
    const xtn = loadXtn('constructors_type_args').data(env);
    const json = loadJson('constructors_type_args');

    expect(xtn[children]).toEqual(json);
});

test('error_early_eof_comment', () => {
    const errors = loadXtnErrors('early_eof_comment');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnexpectedEndOfFile,
        start: { line: 3, column: 2 }
    }]);
});

test('error_unexpected_slash', () => {
    const errors = loadXtnErrors('unexpected_slash');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnexpectedSlash,
        start: { line: 0, column: 4 }
    }, {
        code: XtnParseErrorCode.UnexpectedSlash,
        start: { line: 1, column: 7 }
    }, {
        code: XtnParseErrorCode.UnexpectedSlash,
        start: { line: 2, column: 2 }
    }, {
        code: XtnParseErrorCode.UnexpectedSlash,
        start: { line: 3, column: 1 }
    }]);
});

test('errors_string', () => {
    const errors = loadXtnErrors('errors_string');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.InvalidEscapeSequence,
        start: { line: 0, column: 4 }
    }, {
        code: XtnParseErrorCode.InvalidEscapeSequence,
        start: { line: 3, column: 1 }
    }, {
        code: XtnParseErrorCode.InvalidEscapeSequence,
        start: { line: 5, column: 17 }
    }, {
        code: XtnParseErrorCode.InvalidEscapeSequence,
        start: { line: 7, column: 23 }
    }, {
        code: XtnParseErrorCode.UnescapedCRLF,
        start: { line: 9, column: 7 }
    }]);
});

test('errors_string2', () => {
    const errors = loadXtnErrors('errors_string2');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnescapedLF,
        start: { line: 0, column: 7 }
    }]);
});

test('errors_string3', () => {
    const errors = loadXtnErrors('errors_string3');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnescapedCR,
        start: { line: 0, column: 7 }
    }]);
});

function convert_children(json: any) {
    if (typeof json === "object") {
        if ('$children' in json) {
            const ch = json.$children;
            delete json.$children;
            json[children] = ch;
            convert_children(ch);
        }
        for (const key in json) {
            convert_children(json[key]);
        }
    }
}

test('match_space_sep1', () => {
    const xtn = loadXtn('space_sep1').data(env);
    const json = loadJson('space_sep1');
    convert_children(json);
    expect(xtn).toEqual(json);
});

test('errors_space_sep1', () => {
    const errors = loadXtnErrors('errors_space_sep1');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnrecognizedToken,
        start: { line: 0, column: 5 },
        end: { line: 0, column: 8 }
    }, {
        code: XtnParseErrorCode.UnrecognizedToken,
        start: { line: 1, column: 5 },
        end: { line: 1, column: 8 }
    }, {
        code: XtnParseErrorCode.UnrecognizedToken,
        start: { line: 2, column: 5 },
        end: { line: 2, column: 8 }
    }]);
});

test('bad_key_in_obj1', () => {
    const errors = loadXtnErrors('bad_key_in_obj1');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.MissingKey,
        start: { line: 3, column: 7 }
    }]);
});