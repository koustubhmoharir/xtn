import * as path from 'path';
import { SnippetString } from 'vscode';
import { Position } from 'vscode';
import { workspace, window, ExtensionContext } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
        }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for xtn documents
        documentSelector: [{ scheme: 'file', language: 'xtn' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        },
        middleware: {
            provideOnTypeFormattingEdits: async (document, position, ch, options, token, next) => {
                const edits = await next(document, position, ch, options, token);
                if (edits.length > 0 && edits[edits.length - 1].newText.startsWith('$$vscodesnippet$$')) {
                    const edit = edits.pop();
                    const insert = () => window.activeTextEditor.insertSnippet(new SnippetString(edit.newText.substring('$$vscodesnippet$$'.length)), new Position(edit.range.start.line, edit.range.start.character));
                    if (edits.length > 0) {
                        let disposable;
                        disposable = workspace.onDidChangeTextDocument(e => {
                            if (e.document.uri === document.uri) {
                                disposable.dispose();
                                insert();
                            }
                        });
                    }
                    else
                        insert();
                }
                return edits;
            },
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'xtnLanguageServer',
        'XTN Language Server',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
}

// Look at the link below to figure out how to create an extension that works in the browser too.
// https://www.hiro.so/blog/write-clarity-smart-contracts-with-zero-installations-how-we-built-an-in-browser-language-server-using-wasm

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}