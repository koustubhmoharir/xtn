import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    FoldingRangeParams,
    FoldingRange,
    DocumentFormattingParams,
    DocumentOnTypeFormattingParams,
    DocumentRangeFormattingParams
} from 'vscode-languageserver/node';

import {
    Position,
    TextDocument, TextEdit
} from 'vscode-languageserver-textdocument';
import { XtnArray, XtnComment, XtnDataElement, XtnElement, XtnErrorCode, XtnException, XtnObject, XtnText, breakIntoLines, convert_key, convert_simple_value, partition, trimEndOfLine } from './parser';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                triggerCharacters: ['{', '[', "'", ':', '+'],
                resolveProvider: true
            },
            foldingRangeProvider: true,
            documentFormattingProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: '-',
                moreTriggerCharacter: [':', '\n']
            },
            documentRangeFormattingProvider: true
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface ExampleSettings {
    maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

interface ParsedDocument {
    version: number;
    lines?: string[];
    obj?: XtnObject;
    error?: XtnException;
}

const parseCache: Map<string, ParsedDocument> = new Map();
function getParsedDocument(uri: string, doc?: TextDocument) {
    let entry = parseCache.get(uri);
    if (!doc) return entry;
    if (!entry || entry.version !== doc.version) {
        let obj;
        let lines = breakIntoLines(doc.getText());
        let error;
        try {
            obj = XtnObject.load(lines);
        }
        catch (ex) {
            if (ex instanceof XtnException)
                error = ex;
        }
        entry = ({
            version: doc.version,
            obj,
            lines,
            error
        });
        parseCache.set(doc.uri, entry);
    }
    return entry;
}

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        console.log("hasConfigurationCapability = true");
        documentSettings.clear();
    } else {
        globalSettings = <ExampleSettings>(
            (change.settings.xtnLanguageServer || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
    if (!hasConfigurationCapability) {
        console.log("hasConfigurationCapability is false");
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'xtnLanguageServer'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // In this simple example we get the settings for every validate run.
    const settings = (await getDocumentSettings(textDocument.uri)) || globalSettings;

    // The validator creates diagnostics for all uppercase words length 2 and more
    const diagnostics: Diagnostic[] = [];
    const entry = getParsedDocument(textDocument.uri, textDocument);
    const err = entry?.error;
    if (err instanceof XtnException) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: {
                    line: err.line_no,
                    character: err.colStart
                },
                end: {
                    line: err.line_no,
                    character: err.colEnd
                }
            },
            message: err.message,
            source: 'xtn'
        };
        // if (hasDiagnosticRelatedInformationCapability) {
        //     diagnostic.relatedInformation = [
        //         {
        //             location: {
        //                 uri: textDocument.uri,
        //                 range: Object.assign({}, diagnostic.range)
        //             },
        //             message: 'Spelling matters'
        //         },
        //         {
        //             location: {
        //                 uri: textDocument.uri,
        //                 range: Object.assign({}, diagnostic.range)
        //             },
        //             message: 'Particularly for names'
        //         }
        //     ];
        // }
        diagnostics.push(diagnostic);
    }
    

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
    connection.console.log('We received an file change event');
});


interface ObjScope {
    scopeType: "object";
    scope: XtnObject;
    key: string | null;
}

interface ArrScope {
    scopeType: "array";
    scope: XtnArray;
    key: number | null;
}

type LineType = "comment" | "complex" | "object" | "array" | "key" | "end";

interface PositionContext {
    scopes: (ObjScope | ArrScope)[];
    line: string;
    lineType: LineType;
}

function _getContextInner(scope: ObjScope | ArrScope, el: XtnDataElement, lineNo: number, line: string, scopes: (ObjScope | ArrScope)[]): PositionContext | undefined {
    if (lineNo === el.startLineNo) {
        scopes.push(scope);
        return ({ lineType: "key", scopes, line });
    }
    if (lineNo === el.endLineNo) {
        scopes.push(scope);
        return ({ lineType: "end", scopes, line });
    }
    if (lineNo < el.startLineNo!) {
        scopes.push({...scope, key: null});
        return ({ lineType: line.trimStart().startsWith('#') ? "comment" : scope.scopeType, scopes, line });
    }
    const effEndLineNo = el.endLineNo ?? (el instanceof XtnArray || el instanceof XtnObject || (el instanceof XtnText && el.force_multiline) ? lineNo + 1 : -1);
    if (lineNo < effEndLineNo) {
        scopes.push(scope);
        if (el instanceof XtnArray || el instanceof XtnObject) {
            return _getContextOuter(el, lineNo, line, scopes);
        }
        return ({ lineType: "complex", scopes, line })
    }
}

function _getContextOuter(obj: XtnObject | XtnArray, lineNo: number, line: string, scopes: (ObjScope | ArrScope)[]): PositionContext {
    if (obj instanceof XtnArray) {
        let i = -1;
        for (const el of obj.elements) {
            ++i;
            const result = _getContextInner({ scopeType: "array", scope: obj, key: i }, el, lineNo, line, scopes);
            if (result) return result;
        }
        scopes.push({ scopeType: "array", scope: obj, key: null });
    }
    else {
        for (const k in obj.elements) {
            const el = obj.elements[k];
            const result = _getContextInner({ scopeType: "object", scope: obj, key: k }, el, lineNo, line, scopes);
            if (result) return result;
        }
        scopes.push({ scopeType: "object", scope: obj, key: null });
    }
    return ({ lineType: line.trimStart().startsWith('#') ? "comment" : scopes[scopes.length - 1].scopeType, scopes, line });
}


function completeSyntax(item: string, p: TextDocumentPositionParams, offsetStart: number, offsetEnd: number, indent: string): CompletionItem {
    return {
        label: item,
        kind: CompletionItemKind.Text,
        textEdit: {
            newText: item,
            range: {
                start: { line: p.position.line, character: p.position.character + offsetStart },
                end: { line: p.position.line, character: p.position.character + offsetEnd }
            }
        },
        additionalTextEdits: item === ': ' || item === '+: ' ? undefined : [
            { newText: indent + '----\n', range: { start: { line: p.position.line + 1, character: 0 }, end: { line: p.position.line + 1, character: 0 } } }
        ]
    };
}

function getContext(pd: ParsedDocument | undefined, p: Position) {
    if (!pd?.lines || p.line >= pd.lines.length) return;
    if (pd.error && p.line > pd.error.line_no) return;
    const line = pd.lines[p.line];
    const obj = pd.obj ?? pd.error?.obj;
    if (!obj) return;
    return _getContextOuter(obj, p.line, line, []);
}

function analyzeLine(line: string) {
    const [left, sep, right] = partition(line, ':');
    let key = left.trim();
    let keyType = "";
    let open = false;
    if (key.endsWith('[]')) {
        keyType = "[";
    }
    else if (key.endsWith('[')) {
        keyType = "[";
        open = true;
    }
    else if (key.endsWith('{}')) {
        keyType = "{";
    }
    else if (key.endsWith('{')) {
        keyType = "{";
        open = true;
    }
    else if (key.endsWith("''")) {
        keyType = "'";
    }
    else if (key.endsWith("'")) {
        keyType = "'";
        open = true;
    }
    let keyTypeOpenChar = -1;
    let keyChar = key.length > 0 ? line.indexOf(key[0]) : -1;
    const indent = key.length > 0 ? line.substring(0, keyChar) : trimEndOfLine(left);
    if (keyType !== "") {
        keyTypeOpenChar = keyChar + key.length - (open ? 1 : 2);
        key = key.substring(0, key.length - (open ? 1 : 2)).trimEnd();
        if (key.length === 0)
            keyChar = -1;
    }
    return ({
        key,
        keyType,
        open,
        keyChar,
        keyTypeOpenChar,
        colonChar: sep.length ? line.indexOf(sep) : -1,
        indent,
        right
    })
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (p: TextDocumentPositionParams): CompletionItem[] | null => {
        const entry = getParsedDocument(p.textDocument.uri);
        const context = getContext(entry, p.position);
        if (!context) return null;
        const { line, lineType, scopes } = context;
        const scope = scopes[scopes.length - 1];
        if (lineType === "end" || lineType === "complex" || lineType === "comment")
            return null;
        const props = analyzeLine(line);
        const c = p.position.character;
        if (lineType === "key") {
            if (props.colonChar < 0) {
                console.error("lineType of key does not agree with colon not found on line");
                return null;
            }
            // Key suggestions
            if (c < props.colonChar) {
                // Suggest key that will replace everything to the left of colon
                // However, if keyType is changed, other adjustments will need to be made
                // To avoid dealing with this, the suggestions could be filtered to not change the keyType
            }
            // Syntax suggestions
            if (c === props.colonChar + 1) {
                if (props.keyType === '' && props.right.trim().length === 0) {
                    // Do this only if we don't have type information
                    return [
                        completeSyntax(': ', p, -1, 0, props.indent),
                        completeSyntax('{}:', p, -1, 0, props.indent),
                        completeSyntax('[]:', p, -1, 0, props.indent),
                        completeSyntax("'':", p, -1, 0, props.indent),
                    ]
                }
            }
        }
        if (lineType === "object") {
            // Key suggestions
            if (props.keyType === '') {
                // Suggest key that will replace entire line
            }
            else if (c < props.keyTypeOpenChar) {
                // Suggest key that will replace entire line
            }
        }
        if (lineType === "array") {
            if (props.keyType === '') {
                // Filter based on possible types within array
                if (props.keyChar < 0) {
                    return [
                        completeSyntax('+: ', p, 0, 0, props.indent),
                        completeSyntax('+{}:', p, 0, 0, props.indent),
                        completeSyntax('+[]:', p, 0, 0, props.indent),
                        completeSyntax("+'':", p, 0, 0, props.indent),
                    ];
                }
                else if (c > props.keyChar) {
                    return [
                        completeSyntax(': ', p, 0, 0, props.indent),
                        completeSyntax('{}:', p, 0, 0, props.indent),
                        completeSyntax('[]:', p, 0, 0, props.indent),
                        completeSyntax("'':", p, 0, 0, props.indent),
                    ];
                }
            }
        }

        if (lineType === 'object' || lineType === 'array') {
            // Syntax suggestions
            if (props.keyTypeOpenChar >= 0) {
                if (c === props.keyTypeOpenChar + 1)
                    return [completeSyntax(props.keyType === '[' ? '[]:' : props.keyType === '{' ? '{}:' : "'':", p, -1, props.open ? 0 : 1, props.indent)]
                if (c === props.keyTypeOpenChar + 2 && !props.open)
                    return [completeSyntax(props.keyType === '[' ? '[]:' : props.keyType === '{' ? '{}:' : "'':", p, -2, 0, props.indent)]
            }
        }
        return null;
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = 'TypeScript details';
            item.documentation = 'TypeScript documentation';
        } else if (item.data === 2) {
            item.detail = 'JavaScript details';
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
);

function appendFoldingRanges(el: XtnElement, ranges: FoldingRange[]) {
    if (el.startLineNo != null && el.endLineNo != null) {
        ranges.push({
            startLine: el.startLineNo,
            endLine: el.endLineNo
        });
    }
    if (el instanceof XtnObject) {
        for (const key in el.elements) {
            appendFoldingRanges(el.elements[key], ranges);
        }
    }
    else if (el instanceof XtnArray) {
        for (const ch of el.elements) {
            appendFoldingRanges(ch, ranges);
        }
    }
}

connection.onFoldingRanges((p: FoldingRangeParams) => {
    const entry = getParsedDocument(p.textDocument.uri);
    const obj = entry?.obj ?? entry?.error?.obj;
    if (!obj) return null;

    let ranges: FoldingRange[] = [];
    appendFoldingRanges(obj, ranges);
    return ranges;
});


function formatStartOrEndLine(lineNo: number | null, lines: string[], firstChar: string, expIndent: string, edits: TextEdit[]) {
    if (lineNo != null) {
        const origLine = lines[lineNo];
        if (origLine != null) {
            const actIndentLen = origLine.indexOf(firstChar);
            const actIndent = origLine.substring(0, Math.max(0, actIndentLen));
            if (expIndent !== actIndent) {
                edits.push({
                    newText: expIndent,
                    range: {
                        start: { line: lineNo, character: 0 },
                        end: { line: lineNo, character: actIndentLen }
                    }
                });
            }
            if (firstChar === '-') {
                const last = origLine.lastIndexOf('-');
                if (last >= 0) {
                    edits.push({
                        newText: '',
                        range: {
                            start: { line: lineNo, character: last + 1 },
                            end: { line: lineNo, character: origLine.length }
                        }
                    });
                }
            }
            else {
                const sepInd = origLine.indexOf(':');
                if (sepInd >= 0) {
                    const keyWithSuf = origLine.substring(actIndentLen, sepInd);
                    const trKeyWithSuf = keyWithSuf.trimEnd();
                    let trimAfterSep = false;
                    if (trKeyWithSuf.endsWith('{}') || trKeyWithSuf.endsWith('[]') || trKeyWithSuf.endsWith("''")) {
                        trimAfterSep = true;
                        const key = trKeyWithSuf.substring(0, trKeyWithSuf.length - 2).trimEnd();
                        const convKey = convert_key(key);
                        if (convKey !== key) {
                            edits.push({
                                newText: convKey,
                                range: {
                                    start: { line: lineNo, character: actIndentLen },
                                    end: { line: lineNo, character: actIndentLen + key.length }
                                }
                            });
                        }
                        if (key.length < trKeyWithSuf.length - 2) {
                            edits.push({
                                newText: '',
                                range: {
                                    start: { line: lineNo, character: actIndentLen + key.length },
                                    end: { line: lineNo, character: actIndentLen + trKeyWithSuf.length - 2 }
                                }
                            });
                        }
                    }
                    if (trKeyWithSuf.length < keyWithSuf.length) {
                        edits.push({
                            newText: '',
                            range: {
                                start: { line: lineNo, character: actIndentLen + trKeyWithSuf.length },
                                end: { line: lineNo, character: sepInd }
                            }
                        });
                    }
                    if (origLine.length > sepInd + 1) {
                        const c = origLine[sepInd + 1];
                        if (trimAfterSep) {
                            if (c !== '\r' && c !== '\n') {
                                edits.push({
                                    newText: '',
                                    range: {
                                        start: { line: lineNo, character: sepInd + 1 },
                                        end: { line: lineNo, character: origLine.length }
                                    }
                                });
                            }
                        }
                        else {
                            let vsInd = sepInd + 1;
                            if (c !== ' ') {
                                edits.push({
                                    newText: ' ',
                                    range: {
                                        start: { line: lineNo, character: vsInd },
                                        end: { line: lineNo, character: vsInd }
                                    }
                                });
                            }
                            else
                                vsInd++;
                            const value = origLine.substring(vsInd);
                            const tlValue = value.trimStart();
                            if (tlValue.length > 0) {
                                if (tlValue.length < value.length) {
                                    edits.push({
                                        newText: '',
                                        range: {
                                            start: { line: lineNo, character: vsInd },
                                            end: { line: lineNo, character: vsInd + value.length - tlValue.length }
                                        }
                                    });
                                    vsInd += value.length - tlValue.length
                                }
                                const tValue = tlValue.trimEnd();
                                const convValue = convert_simple_value(tValue);
                                if (convValue !== tValue) {
                                    edits.push({
                                        newText: convValue,
                                        range: {
                                            start: { line: lineNo, character: vsInd },
                                            end: { line: lineNo, character: vsInd + tValue.length }
                                        }
                                    });
                                }
                                if (origLine.length > vsInd + tValue.length + 1) {
                                    const c = origLine[vsInd + tValue.length + 1];
                                    if (c !== '\r' && c !== '\n') {
                                        edits.push({
                                            newText: '',
                                            range: {
                                                start: { line: lineNo, character: vsInd + tValue.length },
                                                end: { line: lineNo, character: origLine.length }
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function formatComplexTextLines(el: XtnText, lines: string[], expIndent: string, edits: TextEdit[]) {
    if (el.startLineNo != null && el.endLineNo != null) {
        const keyLine = lines[el.startLineNo];
        let indentChar: string | null = keyLine[0];
        let indentLen = 0;
        if (indentChar !== ' ' && indentChar !== '\t')
            indentChar = null;
        else
            indentLen = keyLine.length - keyLine.trimStart().length;
        for (let i = el.startLineNo + 1; i < el.endLineNo; i++) {
            const origLine = lines[i];
            if (indentChar == null && origLine.length > 0) {
                indentChar = origLine[0];
            }
            if (indentChar === '\t') {
                edits.push({
                    newText: expIndent,
                    range: {
                        start: { line: i, character: 0 },
                        end: { line: i, character: indentLen + 1 }
                    }
                });
            }
            else if (indentLen + 4 !== expIndent.length || origLine.substring(0, expIndent.length) !== expIndent) {
                edits.push({
                    newText: expIndent,
                    range: {
                        start: { line: i, character: 0 },
                        end: { line: i, character: indentLen + 4 }
                    }
                });
            }
        }
    }
}

function formatComments(comments: XtnComment[], lines: string[], expIndent: string, edits: TextEdit[]) {
    for (const comment of comments) {
        const lineNo = comment.startLineNo;
        if (lineNo != null) {
            const origLine = lines[lineNo];
            const line = origLine.trimStart();
            const indentLen = origLine.length - line.length;
            if (indentLen !== expIndent.length || origLine.substring(0, indentLen) !== expIndent) {
                edits.push({
                    newText: expIndent,
                    range: {
                        start: { line: lineNo, character: 0 },
                        end: { line: lineNo, character: indentLen }
                    }
                });
            }
            if (line.startsWith('##')) {
                const tlLine = line.substring(2).trimStart();
                if (tlLine.length !== line.length - 2) {
                    edits.push({
                        newText: '',
                        range: {
                            start: { line: lineNo, character: indentLen + 2 },
                            end: { line: lineNo, character: indentLen + line.length - tlLine.length }
                        }
                    });
                }
            }
            else if (line.startsWith('#')) {
                if (line.length > 1 && line[1] !== ' ') {
                    edits.push({
                        newText: ' ',
                        range: {
                            start: { line: lineNo, character: indentLen + 1 },
                            end: { line: lineNo, character: indentLen + 1 + (line[1].trimEnd().length === 0 ? 1 : 0) }
                        }
                    });
                }
            }
        }
    }
}

function appendFormatEdits(key: string, el: XtnDataElement, lines: string[], edits: TextEdit[], indent: string | null) {
    const expIndent = indent == null ? '' : indent;
    if (el.comments_above?.length) {
        formatComments(el.comments_above, lines, expIndent, edits);
    }
    if (el instanceof XtnObject) {
        formatStartOrEndLine(el.startLineNo, lines, key[0], expIndent, edits);
        const childIndent = indent == null ? '' : indent + '    ';
        for (const key in el.elements) {
            appendFormatEdits(key, el.elements[key], lines, edits, childIndent);
        }
        if (el.comments_below?.length) {
            formatComments(el.comments_below, lines, childIndent, edits);
        }
        formatStartOrEndLine(el.endLineNo, lines, '-', expIndent, edits);
    }
    else if (el instanceof XtnArray) {
        formatStartOrEndLine(el.startLineNo, lines, key[0], expIndent, edits);
        const childIndent = indent == null ? '' : indent + '    ';
        for (const ch of el.elements) {
            appendFormatEdits("+", ch, lines, edits, childIndent);
        }
        if (el.comments_below?.length) {
            formatComments(el.comments_below, lines, childIndent, edits);
        }
        formatStartOrEndLine(el.endLineNo, lines, '-', expIndent, edits);
    }
    else if (el instanceof XtnText) {
        formatStartOrEndLine(el.startLineNo, lines, key[0], expIndent, edits);
        formatComplexTextLines(el, lines, expIndent + '    ', edits);
        formatStartOrEndLine(el.endLineNo, lines, '-', expIndent, edits);
    }
}

connection.onDocumentFormatting((p: DocumentFormattingParams) => {
    const entry = getParsedDocument(p.textDocument.uri);
    if (!entry || entry.error || !entry.obj) return null;
    const lines = entry.lines!;
    const edits: TextEdit[] = [];
    appendFormatEdits("", entry.obj, lines, edits, null);
    return edits;
})

function getIndentLength(lines: string[], element: XtnDataElement, isRoot: boolean) {
    if (isRoot) return 0;
    if (element.startLineNo != null) {
        const startLine = lines![element.startLineNo];
        return startLine.length - startLine.trimStart().length + 4;
    }
}

function indentCurrentLine(pd: ParsedDocument, element: XtnDataElement, isRoot: boolean, line: number, actIndent: number, attemptAutoClose: boolean) {
    const indentLen = getIndentLength(pd.lines!, element, isRoot);
    if (indentLen != null) {
        const edits: TextEdit[] = [];
        if (actIndent < indentLen)
            edits.push({ newText: ' '.repeat(indentLen - actIndent), range: { start: { line, character: 0 }, end: { line, character: 0 } } });
        else if (actIndent > indentLen)
            edits.push({ newText: '', range: { start: { line, character: 0 }, end: { line, character: actIndent - indentLen } } });
        if (attemptAutoClose && shouldAutoClose(pd, line)) {
            edits.push({ newText: ' '.repeat(indentLen) + '----\n', range: { start: { line: line + 1, character: 0 }, end: { line: line + 1, character: 0 } } });
        }
        return edits;
    }
}

function shouldAutoClose(pd: ParsedDocument, lineNo: number) {
    if (!pd.error || !pd.lines) return false;
    const lines = pd.lines.slice();
    lines[lineNo] = '\n';
    try {
        XtnObject.load(lines);
        return true;
    }
    catch {
        return false;
    }
}

connection.onDocumentOnTypeFormatting((p: DocumentOnTypeFormattingParams) => {
    const entry = getParsedDocument(p.textDocument.uri);
    const context = getContext(entry, p.position);
    if (!context) return null;
    const { line, lineType, scopes } = context;
    const scope = scopes[scopes.length - 1];
    let parent = scope.scope;
    const isRoot = scopes.length === 1;
    if (p.ch === '\n' && line.substring(0, p.position.character).trimStart().length === 0) {
        if (lineType === "array" || lineType === "object" || lineType === "complex") {
            if (lineType === "complex")
                parent = (parent.elements as any)[scope.key!];
            const edits = indentCurrentLine(entry!, parent, isRoot, p.position.line, p.position.character, false);
            if (edits) return edits;
        }
    }
    if (p.ch === ':') {
        const props = analyzeLine(line);
        if (lineType === "key" && p.position.character === props.colonChar + 1) {
            const edits = indentCurrentLine(entry!, parent, isRoot, p.position.line, props.indent.length, true);
            if (edits) return edits;
        }
    }
    // if (lineType === "end" || lineType === "complex" || lineType === "comment")
    //     return null;
    return [];
})

connection.onDocumentRangeFormatting((p: DocumentRangeFormattingParams) => {
    return [];
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

