import * as vscode from "vscode";
import { RelativePattern, QuickPickItem, window, workspace } from "vscode";

interface Item extends QuickPickItem {
  path: string;
  type: "file" | "directory";
}

const extractDirectoryFromFile = (path: string): string | null => {
  const match = /^(.+)\/([^/]+)$/.exec(path);
  if (match) {
    return match[1];
  }

  return null;
};

const listFiles = async (searchPath: string | null): Promise<Item[]> => {
  if (!searchPath) {
    return [];
  }

  const d = new RelativePattern(searchPath, "*/*");
  const f = new RelativePattern(searchPath, "*");

  const directories = (await workspace.findFiles(d))
    .map(
      ({ path }): Item => {
        const dir = extractDirectoryFromFile(path);
        return {
          path: dir ? dir : path,
          label:
            "$(file-directory)  " +
            path.replace(`${searchPath}/`, "").split("/")[0] +
            "/",
          description: "[D]",
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
      label: "$(code)  " + path.replace(`${searchPath}/`, ""),
      description: "",
      type: "file",
    })
  );

  const list = [...directories, ...files];

  if (searchPath === workspace.rootPath) {
    return list;
  }

  const backItem: Item = {
    label: "$(reply)  ..",
    description: "up a dir",
    path: extractDirectoryFromFile(searchPath) || "",
    type: "directory",
    alwaysShow: true,
  };

  return [backItem, ...list];
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-filer" is now active!');

  const disposable = vscode.commands.registerCommand(
    "extension.showFiler",
    async () => {
      const rootPath = vscode.workspace.rootPath || null;
      const activePath = vscode.window.activeTextEditor?.document.uri.path;

      const quickPick = window.createQuickPick<Item>();
      quickPick.placeholder = rootPath || "/";

      const items = activePath
        ? await listFiles(extractDirectoryFromFile(activePath))
        : await listFiles(rootPath);

      quickPick.items = items;

      if (items.length > 1 && items[0].alwaysShow) {
        quickPick.activeItems = [quickPick.items[1]];
      }

      quickPick.onDidAccept(async () => {
        if (quickPick.selectedItems.length > 0) {
          const item = quickPick.selectedItems[0];

          if (item.type === "directory") {
            quickPick.value = "";
            quickPick.placeholder = item.path;
            const items = await listFiles(item.path);
            quickPick.items = items;

            if (items.length > 1 && items[0].alwaysShow) {
              quickPick.activeItems = [quickPick.items[1]];
            }

            return;
          }

          // Jump if it's a file
          const doc = await workspace.openTextDocument(item.path);
          await window.showTextDocument(doc);
        }
      });

      quickPick.show();
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
