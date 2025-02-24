import { test, expect } from "vitest";
import { loadJson, loadXtn, loadXtnWithErrors } from "./testutils";
import { XtnParseErrorCode, children, type XtnEnvironment, type XtnIdentifier, type XtnIdentifierSegment } from "./parser";

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


test('match_implicit_neg_reals', () => {
    const xtn = loadXtn('neg_reals').data();
    const json = loadJson('neg_reals');

    expect(xtn).toEqual(json);
});

test('match_implicit_neg_reals2', () => {
    const xtn = loadXtn('neg_reals2').data();
    const json = loadJson('neg_reals');

    expect(xtn).toEqual(json);
});

test('match_explicit_neg_reals3', () => {
    const xtn = loadXtn('neg_reals3').data();
    const json = loadJson('neg_reals');

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

function segToJSON(seg: XtnIdentifierSegment) {
    if (seg.args?.length) {
        return {
            name: seg.name,
            args: seg.args.map(a => identifierToJSON(a))
        };
    }
    else {
        return seg.name;
    }
}
function identifierToJSON(id: XtnIdentifier): any {
    if (id.segments.length > 1 || id.segments[0].args?.length) {
        return ({
            name: id.name,
            segments: id.segments.map(s => segToJSON(s))
        });
    }
    return id.name;
}

const env: XtnEnvironment = {
    construct(id, args, opts) {
        const obj = { $id: identifierToJSON(id) } as any;
        if (args && opts) {
            obj.$args = args;
            if (Object.keys(opts).length > 0)
                obj.$opts = opts;
        }
        return obj;
    },
};

test('match_expressions', () => {
    const xtn = loadXtn('expressions').data(env);
    const json = loadJson('expressions');

    expect(xtn[children]).toEqual(json);
});

test('match_expressions_type_args', () => {
    const xtn = loadXtn('expressions_type_args').data(env);
    const json = loadJson('expressions_type_args');

    expect(xtn[children]).toEqual(json);
});

function extractErrors(json: any) {
    if (!json) return [];
    const errors = json["$errors"] as any[];
    for (const e of errors) {
        if ("code" in e)
            e.code = XtnParseErrorCode[e.code];
    }
    delete json["$errors"];
    return errors;
}

function convert_children(json: any) {
    if (typeof json === "object" && json != null) {
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

function matchWithErrors(xtnName: string, jsonName?: string) {
    const { partial, errors } = loadXtnWithErrors(xtnName);
    const xtn = partial.data(env);
    const json = loadJson(jsonName ?? xtnName);
    convert_children(json);
    const expErrors = extractErrors(json);
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject(expErrors);
}

test('error_early_eof_comment', () => {
    matchWithErrors("early_eof_comment");
});

test('error_unexpected_slash', () => {
    matchWithErrors("unexpected_slash");
});

test('errors_string', () => {
    matchWithErrors("errors_string");
});

test('errors_string2', () => {
    matchWithErrors("errors_string2");
});

test('errors_string3', () => {
    matchWithErrors("errors_string3");
});

test('match_space_sep1', () => {
    const xtn = loadXtn('space_sep1').data();
    const json = loadJson('space_sep1');
    convert_children(json);
    expect(xtn).toEqual(json);
});

test('errors_space_sep1', () => {
    const { errors } = loadXtnWithErrors('errors_space_sep1');
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
    const { errors } = loadXtnWithErrors('bad_key_in_obj1');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.MissingKey,
        start: { line: 3, column: 7 }
    }]);
});

test('unexp_text_triple_string', () => {
    const { errors, partial } = loadXtnWithErrors('unexp_text_triple_string');
    const json = loadJson('unexp_text_triple_string');
    expect(errors).toMatchObject([{
        code: XtnParseErrorCode.UnexpectedTextOnStartTripleQuotes,
        start: { line: 0, column: 6 },
        end: { line: 0, column: 8 }
    }, {
        code: XtnParseErrorCode.UnexpectedTextOnStartTripleQuotes,
        start: { line: 2, column: 6 },
        end: { line: 2, column: 7 }
    }, {
        code: XtnParseErrorCode.UnexpectedTextOnStartTripleQuotes,
        start: { line: 4, column: 9 },
        end: { line: 4, column: 10 }
    }, {
        code: XtnParseErrorCode.UnexpectedTextOnStartTripleQuotes,
        start: { line: 7, column: 9 },
        end: { line: 7, column: 11 }
    }]);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
});

test('errors_string4', () => {
    const { errors, partial } = loadXtnWithErrors('errors_string4');
    const json = loadJson('errors_string4');
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 1, column: 0 }
        },
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 5, column: 3 }
        },
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 9, column: 0 }
        },
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 14, column: 0 }
        },
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 18, column: 0 },
            end: { line: 18, column: 4 }
        },
        {
            code: XtnParseErrorCode.BadIndentation,
            start: { line: 22, column: 2 },
            end: { line: 22, column: 4 }
        }
    ]);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
});

test('errors_numbers', () => {
    const { errors, partial } = loadXtnWithErrors('errors_numbers');
    const json = loadJson('errors_numbers');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 0, column: 4 },
            end: { line: 0, column: 7 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 1, column: 4 },
            end: { line: 1, column: 9 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 2, column: 3 },
            end: { line: 2, column: 6 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 3, column: 3 },
            end: { line: 3, column: 8 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 4, column: 4 },
            end: { line: 4, column: 7 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 5, column: 4 },
            end: { line: 5, column: 9 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 6, column: 3 },
            end: { line: 6, column: 6 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 7, column: 2 },
            end: { line: 7, column: 5 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 8, column: 3 },
            end: { line: 8, column: 6 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 9, column: 5 },
            end: { line: 9, column: 6 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 10, column: 5 },
            end: { line: 10, column: 13 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 11, column: 3 },
            end: { line: 11, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 12, column: 3 },
            end: { line: 12, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 13, column: 3 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 13, column: 5 },
            end: { line: 13, column: 6 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 14, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 14, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 15, column: 6 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 16, column: 3 },
            end: { line: 16, column: 4 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 16, column: 5 },
            end: { line: 16, column: 6 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 17, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 17, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 18, column: 6 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 19, column: 5 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 20, column: 5 },
            end: { line: 20, column: 8 },
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 21, column: 5 },
        }
    ]);
});



test('errors_bool', () => {
    const { errors, partial } = loadXtnWithErrors('errors_bool');
    const json = loadJson('errors_bool');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingBooleanOrNull,
            start: { line: 1, column: 5 }
        },
        {
            code: XtnParseErrorCode.MissingBooleanOrNull,
            start: { line: 4, column: 5 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 6, column: 5 }
        },
        {
            code: XtnParseErrorCode.MissingBooleanOrNull,
            start: { line: 7, column: 4 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 8, column: 4 },
            end: { line: 8, column: 9 }
        }
    ]);
});

test('error_extra_close_bracket', () => {
    const { errors, partial } = loadXtnWithErrors('extra_close_bracket');
    const json = loadJson('extra_close_bracket');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.UnmatchedClosingBracket,
            start: { line: 8, column: 0 }
        }
    ]);
});

test('error_extra_close_brace', () => {
    const { errors, partial } = loadXtnWithErrors('extra_close_brace');
    const json = loadJson('extra_close_brace');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.UnmatchedClosingBrace,
            start: { line: 7, column: 4 }
        },
        {
            code: XtnParseErrorCode.UnmatchedClosingBrace,
            start: { line: 9, column: 0 }
        }
    ]);
});


test('error_bad_key_in_arr1', () => {
    const { errors, partial } = loadXtnWithErrors('bad_key_in_arr1');
    const json = loadJson('bad_key_in_arr1');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 4, column: 4 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 4, column: 6 }
        },
        {
            code: XtnParseErrorCode.UnrecognizedToken,
            start: { line: 4, column: 7 }
        }
    ]);
});


test('error_missing_value', () => {
    const { errors, partial } = loadXtnWithErrors('missing_value');
    const json = loadJson('missing_value');
    convert_children(json);
    const xtn = partial.data(env);
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingValue,
            start: { line: 1, column: 6 }
        },
        {
            code: XtnParseErrorCode.MissingValue,
            start: { line: 4, column: 8 }
        },
        {
            code: XtnParseErrorCode.MissingRealNumberOrNull,
            start: { line: 5, column: 9 }
        },
        {
            code: XtnParseErrorCode.MissingBooleanOrNull,
            start: { line: 6, column: 9 }
        },
        {
            code: XtnParseErrorCode.MissingIntegerOrNull,
            start: { line: 7, column: 9 }
        }
    ]);
});

test('error_extra_close_paren', () => {
    const { errors, partial } = loadXtnWithErrors('extra_close_paren');
    const json = loadJson('extra_close_paren');
    convert_children(json);
    const xtn = partial.data();
    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.UnmatchedClosingParenthesis,
            start: { line: 7, column: 4 }
        },
        {
            code: XtnParseErrorCode.UnmatchedClosingParenthesis,
            start: { line: 9, column: 0 }
        }
    ]);
});

test('error_expressions', () => {
    const { errors, partial } = loadXtnWithErrors('errors_expressions');
    const json = loadJson('errors_expressions');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingIdentifierName,
            start: { line: 0, column: 4 }
        },
        {
            code: XtnParseErrorCode.MissingIdentifierName,
            start: { line: 1, column: 7 }
        },
        {
            code: XtnParseErrorCode.MissingIdentifierName,
            start: { line: 2, column: 4 }
        },
        {
            code: XtnParseErrorCode.MissingClosingAngledBracket,
            start: { line: 3, column: 14 }
        },
        {
            code: XtnParseErrorCode.MissingClosingAngledBracket,
            start: { line: 4, column: 18 }
        },
        {
            code: XtnParseErrorCode.MissingIdentifierName,
            start: { line: 5, column: 19 }
        },
        {
            code: XtnParseErrorCode.MissingClosingAngledBracket,
            start: { line: 5, column: 19 }
        }
    ]);
});


test('match_eof1', () => {
    const xtn = loadXtn('eof1').data(env);
    const json = loadJson('eof1');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof2', () => {
    const xtn = loadXtn('eof2').data(env);
    const json = loadJson('eof1');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof3', () => {
    const xtn = loadXtn('eof3').data(env);
    const json = loadJson('eof1');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof4', () => {
    const xtn = loadXtn('eof4').data(env);
    const json = loadJson('eof1');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof5', () => {
    const xtn = loadXtn('eof5').data(env);
    const json = loadJson('eof1');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof6', () => {
    const xtn = loadXtn('eof6').data(env);
    const json = loadJson('eof6');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof7', () => {
    const xtn = loadXtn('eof7').data(env);
    const json = loadJson('eof7');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof8', () => {
    const xtn = loadXtn('eof8').data(env);
    const json = loadJson('eof7');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof9', () => {
    const xtn = loadXtn('eof9').data(env);
    const json = loadJson('eof9');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('match_eof10', () => {
    const xtn = loadXtn('eof10').data(env);
    const json = loadJson('eof10');
    convert_children(json);

    expect(xtn).toEqual(json);
});


test('error_eof1', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof1');
    const json = loadJson('error_eof1');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingValue,
            start: { line: 0, column: 2 }
        }
    ]);
});

test('error_eof2', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof2');
    const json = loadJson('error_eof1');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingValue,
            start: { line: 0, column: 2 }
        }
    ]);
});

test('error_eof3', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof3');
    const json = loadJson('error_eof1');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingRealNumberOrNull,
            start: { line: 0, column: 4 }
        }
    ]);
});

test('error_eof4', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof4');
    const json = loadJson('error_eof1');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingIntegerOrNull,
            start: { line: 0, column: 4 }
        }
    ]);
});

test('error_eof5', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof5');
    const json = loadJson('error_eof1');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingBooleanOrNull,
            start: { line: 0, column: 4 }
        }
    ]);
});

test('error_eof6', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof6');
    const json = loadJson('error_eof6');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingBracket,
            start: { line: 1, column: 8 }
        },
        {
            code: XtnParseErrorCode.MissingBrace,
            start: { line: 1, column: 8 }
        }
    ]);
});

test('error_eof7', () => {
    const { errors, partial } = loadXtnWithErrors('error_eof7');
    const json = loadJson('error_eof6');
    convert_children(json);
    const xtn = partial.data(env);

    expect(xtn).toEqual(json);
    expect(errors).toMatchObject([
        {
            code: XtnParseErrorCode.MissingBracket,
            start: { line: 1, column: 9 }
        },
        {
            code: XtnParseErrorCode.MissingBrace,
            start: { line: 1, column: 9 }
        }
    ]);
});