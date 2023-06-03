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
    TextDocument, TextEdit
} from 'vscode-languageserver-textdocument';
import { XtnArray, XtnElement, XtnException, XtnObject, XtnText, breakIntoLines, convert_key, convert_simple_value } from './parser';

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
                resolveProvider: true
            },
            foldingRangeProvider: true,
            documentFormattingProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: '----'
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

const parseCache: Map<string, { version: number; lines?: string[]; obj?: XtnObject; error?: XtnException }> = new Map();
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

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.
        return [
            {
                label: 'TypeScript',
                kind: CompletionItemKind.Text,
                data: 1
            },
            {
                label: 'JavaScript',
                kind: CompletionItemKind.Text,
                data: 2
            }
        ];
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
    if (!entry || entry.error || !entry.obj) return null;

    let ranges: FoldingRange[] = [];
    appendFoldingRanges(entry.obj, ranges);
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
            else if (indentLen + 4 !== expIndent.length) {
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

function appendFormatEdits(key: string, el: XtnElement, lines: string[], edits: TextEdit[], indent: string | null) {
    const expIndent = indent == null ? '' : indent;
    if (el instanceof XtnObject) {
        formatStartOrEndLine(el.startLineNo, lines, key[0], expIndent, edits);
        const childIndent = indent == null ? '' : indent + '    ';
        for (const key in el.elements) {
            appendFormatEdits(key, el.elements[key], lines, edits, childIndent);
        }
        formatStartOrEndLine(el.endLineNo, lines, '-', expIndent, edits);
    }
    else if (el instanceof XtnArray) {
        formatStartOrEndLine(el.startLineNo, lines, key[0], expIndent, edits);
        const childIndent = indent == null ? '' : indent + '    ';
        for (const ch of el.elements) {
            appendFormatEdits("+", ch, lines, edits, childIndent);
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

connection.onDocumentOnTypeFormatting((p: DocumentOnTypeFormattingParams) => {
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

