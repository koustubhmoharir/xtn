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
    FoldingRangeParams
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';
import { XtnException, XtnObject } from './parser';

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
            //foldingRangeProvider: true
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

const parseCache: Map<string, { version: number; obj?: XtnObject; error?: XtnException }> = new Map();
function getParsedDocument(uri: string, doc?: TextDocument) {
    let entry = parseCache.get(uri);
    if (!doc) return entry;
    if (!entry || entry.version !== doc.version) {
        let obj;
        let error;
        try {
            obj = XtnObject.load(doc.getText());
        }
        catch (ex) {
            if (ex instanceof XtnException)
                error = ex;
        }
        entry = ({
            version: doc.version,
            obj,
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

// connection.onFoldingRanges((p: FoldingRangeParams) => {
//     const entry = getParsedDocument(p.textDocument.uri);
//     if (!entry || entry.error || !entry.obj) return null;
//     return [{
//         startLine: 2,
//         endLine: 30
//     }, {
//             startLine: 4,
//             endLine: 7
//         }, {
//             startLine: 8,
//             endLine: 10
//         }
//     ]
// })

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();