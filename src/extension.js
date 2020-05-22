const vscode = require('vscode');
const codebottle = require('codebottle');
const debounce = require('lodash.debounce');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

function snippetToItem(snippet) {
	return {
		snippet,
		label: snippet.title,
		description: `${snippet.votes > 0 ? '+' : ''} ${Math.abs(snippet.votes)} ${snippet.votes >= 0 ? 'upvotes' : 'downvotes'}`,
		detail: `${snippet.language.name} ${snippet.category.name} (${snippet.code.split('\n').length} LOC)`,
	};
}

function showPicker(value, snippets) {
	const quickPick = vscode.window.createQuickPick();


	quickPick.placeholder = 'Search CodeBottle';
	quickPick.value = value;

	if (snippets) {
		quickPick.items = snippets.map(snippetToItem);
	} else {
		quickPick.busy = true;
		codebottle.latest.then(snippets => {
			quickPick.items = snippets.map(snippetToItem);
			quickPick.busy = false;
		});
	}

	const updateResults = debounce(async query => {
		const snippets = await codebottle.search({
			query
		});

		quickPick.dispose();
		showPicker(query, snippets);
	}, 800);

	quickPick.onDidChangeValue(query => {
		quickPick.busy = true;
		updateResults(query);
	});

	quickPick.onDidAccept(() => {
		const textEditor = vscode.window.activeTextEditor

		if (!textEditor) {
			vscode.window.showWarningMessage('Open a file to insert snippets to');
			return;
		}

		const snippet = quickPick.selectedItems[0].snippet;

		textEditor.edit(edit => {
			edit.insert(textEditor.selection.start, snippet.code);
		});

		if (snippet.description) {
			const panel = vscode.window.createWebviewPanel('snippetView', snippet.title, vscode.ViewColumn.Beside);
			panel.webview.html = md.render(snippet.description);
		}

		quickPick.dispose();
	});

	quickPick.onDidHide(() => quickPick.dispose());
	quickPick.show();
}

function activate(context) {
	let disposable = vscode.commands.registerCommand('codebottle.search', async function () {
		showPicker();
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}