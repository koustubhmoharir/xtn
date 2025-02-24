import { test, expect } from "vitest";
import { loadJson, loadXtn, loadXtnWithErrors } from "./testutils";
import { XtnParseErrorCode, children, type XtnEnvironment, type XtnIdentifier, type XtnIdentifierSegment } from "./parser";



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

function matchValid(xtnName: string, jsonName?: string) {
    const xtn = loadXtn(xtnName).data(env);
    const json = loadJson(jsonName ?? xtnName);
    convert_children(json);
    expect(xtn).toEqual(json);
}

test('match_sample1', () => {
    matchValid("sample1");
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
    matchValid("complex_text");
});

test('match_complex_text_json', () => {
    const xtn = loadXtn('complex_text', true).data()[children]![0];
    const json = loadJson('complex_text');

    expect(xtn).toEqual(json);
});


test('match_explicit_integers', () => {
    matchValid("integers");
});

test('match_implicit_integers', () => {
    matchValid("integers2", "integers");
});

test('match_implicit_integers3', () => {
    matchValid("integers3", "integers");
});

test('match_explicit_integers4', () => {
    matchValid("integers4", "integers");
});

test('match_keywords_as_keys', () => {
    matchValid("keywords_as_keys");
});

test('match_strings', () => {
    matchValid("strings");
});

test('match_booleans', () => {
    matchValid("booleans");
});

test('match_nulls', () => {
    matchValid("nulls");
});


test('match_implicit_reals', () => {
    matchValid("reals");
});

test('match_implicit_reals2', () => {
    matchValid("reals2", "reals");
});

test('match_explicit_reals3', () => {
    matchValid("reals3", "reals");
});


test('match_implicit_neg_reals', () => {
    matchValid("neg_reals");
});

test('match_implicit_neg_reals2', () => {
    matchValid("neg_reals2", "neg_reals");
});

test('match_explicit_neg_reals3', () => {
    matchValid("neg_reals3", "neg_reals");
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
    matchValid("strings_ml");
});

test('match_expressions', () => {
    matchValid("expressions");
});

test('match_expressions_type_args', () => {
    matchValid("expressions_type_args");
});

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
    matchValid("space_sep1");
});

test('errors_space_sep1', () => {
    matchWithErrors("errors_space_sep1");
});

test('bad_key_in_obj1', () => {
    matchWithErrors("bad_key_in_obj1");
});

test('unexp_text_triple_string', () => {
    matchWithErrors("unexp_text_triple_string");
});

test('errors_string4', () => {
    matchWithErrors("errors_string4");
});

test('errors_numbers', () => {
    matchWithErrors("errors_numbers");
});



test('errors_bool', () => {
    matchWithErrors("errors_bool");
});

test('error_extra_close_bracket', () => {
    matchWithErrors("extra_close_bracket");
});

test('error_extra_close_brace', () => {
    matchWithErrors("extra_close_brace");
});


test('error_bad_key_in_arr1', () => {
    matchWithErrors("bad_key_in_arr1");
});


test('error_missing_value', () => {
    matchWithErrors("missing_value");
});

test('error_extra_close_paren', () => {
    matchWithErrors("extra_close_paren");
});

test('error_expressions', () => {
    matchWithErrors("errors_expressions");
});


test('match_eof1', () => {
    matchValid("eof1");
});


test('match_eof2', () => {
    matchValid("eof2", "eof1");
});


test('match_eof3', () => {
    matchValid("eof3", "eof1");
});


test('match_eof4', () => {
    matchValid("eof4", "eof1");
});


test('match_eof5', () => {
    matchValid("eof5", "eof1");
});


test('match_eof6', () => {
    matchValid("eof6");
});


test('match_eof7', () => {
    matchValid("eof7");
});


test('match_eof8', () => {
    matchValid("eof8", "eof7");
});


test('match_eof9', () => {
    matchValid("eof9");
});


test('match_eof10', () => {
    matchValid("eof10");
});


test('error_eof1', () => {
    matchWithErrors("error_eof1");
});

test('error_eof2', () => {
    matchWithErrors("error_eof2");
});

test('error_eof3', () => {
    matchWithErrors("error_eof3");
});

test('error_eof4', () => {
    matchWithErrors("error_eof4");
});

test('error_eof5', () => {
    matchWithErrors("error_eof5");
});

test('error_eof6', () => {
    matchWithErrors("error_eof6");
});

test('error_eof7', () => {
    matchWithErrors("error_eof7");
});

test('error_eof8', () => {
    matchWithErrors("error_eof8");
});

test('error_eof9', () => {
    matchWithErrors("error_eof9");
});

test('error_eof10', () => {
    matchWithErrors("error_eof10");
});

test('error_eof11', () => {
    matchWithErrors("error_eof11");
});

test('error_eof12', () => {
    matchWithErrors("error_eof12");
});

test('error_eof13', () => {
    matchWithErrors("error_eof13");
});

test('error_eof14', () => {
    matchWithErrors("error_eof14");
});

test('error_eof15', () => {
    matchWithErrors("error_eof15");
});

test('error_eof16', () => {
    matchWithErrors("error_eof16");
});

test('error_eof17', () => {
    matchWithErrors("error_eof17");
});

test('error_eof18', () => {
    matchWithErrors("error_eof18");
});

test('error_eof19', () => {
    matchWithErrors("error_eof19");
});

test('error_eof20', () => {
    matchWithErrors("error_eof20");
});

test('error_eof21', () => {
    matchWithErrors("error_eof21");
});

test('error_eof22', () => {
    matchWithErrors("error_eof22");
});

test('error_eof23', () => {
    matchWithErrors("error_eof23");
});

test('error_eof24', () => {
    matchWithErrors("error_eof24");
});

test('error_eof25', () => {
    matchWithErrors("error_eof25");
});

test('error_eof26', () => {
    matchWithErrors("error_eof26");
});

test('error_eof27', () => {
    matchWithErrors("error_eof27");
});