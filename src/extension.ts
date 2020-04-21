import * as vscode from "vscode";
import { RelativePattern, QuickPickItem, window, workspace } from "vscode";

interface Item extends QuickPickItem {
  path: string;
  type: "file" | "directory";
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-filer" is now active!');

  let disposable = vscode.commands.registerCommand(
    "extension.helloWorld",
    async () => {
      const rootPath = vscode.workspace.rootPath;
      const active = vscode.window.activeTextEditor?.document.uri;

      if (rootPath) {
        const d = new RelativePattern(rootPath, "*/*");
        const f = new RelativePattern(rootPath, "*");

        const directories = (await vscode.workspace.findFiles(d))
          .map(
            ({ path }): Item => ({
              // TODO: fix path
              path: path,
              label: path.replace(`${rootPath}/`, "").split("/")[0] + "/",
              description: "directory",
              type: "directory",
            })
          )
          .reduce<Item[]>((acc, cur) => {
            if (acc.filter(({ label }) => label === cur.label).length > 0) {
              return acc;
            }
            return [...acc, cur];
          }, []);

        const files: Item[] = (await vscode.workspace.findFiles(f)).map(
          ({ path }) => ({
            path: path,
            label: path.replace(`${rootPath}/`, ""),
            description: "file",
            type: "file",
          })
        );

        const all = [...directories, ...files];

        const quickPick = window.createQuickPick<Item>();
        quickPick.placeholder = "Search";
        quickPick.items = all;

        quickPick.onDidAccept(async () => {
          if (quickPick.selectedItems.length > 0) {
            const item = quickPick.selectedItems[0];
            if (item.type === "directory") {
							window.showInformationMessage("It's a directory");
							quickPick.items = [];
              return;
            }
            const doc = await workspace.openTextDocument(item.path);
            await window.showTextDocument(doc);
          }
        });

        quickPick.show();

        console.log(all);
      }

      vscode.window.showInformationMessage("Hello World Vscode!");
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
