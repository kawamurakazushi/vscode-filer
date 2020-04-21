import * as vscode from "vscode";
import { RelativePattern, QuickPickItem, window, workspace } from "vscode";

interface Item extends QuickPickItem {
  path: string;
  type: "file" | "directory";
}

const listFiles = async (searchPath: string): Promise<Item[]> => {
  const d = new RelativePattern(searchPath, "*/*");
  const f = new RelativePattern(searchPath, "*");

  const directories = (await workspace.findFiles(d))
    .map(
      ({ path }): Item => {
        const match = /^(.+)\/([^/]+)$/.exec(path);
        const dir = match ? match[1] : path;
        return {
          path: dir,
          label: path.replace(`${searchPath}/`, "").split("/")[0] + "/",
          description: "directory",
          type: "directory",
        };
      }
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
      label: path.replace(`${searchPath}/`, ""),
      description: "file",
      type: "file",
    })
  );

  return [...directories, ...files];
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-filer" is now active!');

  const disposable = vscode.commands.registerCommand(
    "extension.helloWorld",
    async () => {
      const rootPath = vscode.workspace.rootPath;
      const active = vscode.window.activeTextEditor?.document.uri;

      if (rootPath) {
        const quickPick = window.createQuickPick<Item>();
        quickPick.placeholder = rootPath;

        quickPick.items = await listFiles(rootPath);

        quickPick.onDidAccept(async () => {
          if (quickPick.selectedItems.length > 0) {
            const item = quickPick.selectedItems[0];
            if (item.type === "directory") {
              window.showInformationMessage(item.path);
              quickPick.value = "";
              quickPick.placeholder = item.path;
              quickPick.items = await listFiles(item.path);
              return;
            }

            // Jump if it's a file
            const doc = await workspace.openTextDocument(item.path);
            await window.showTextDocument(doc);
          }
        });

        quickPick.show();
      }

      vscode.window.showInformationMessage("Hello World Vscode!");
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
