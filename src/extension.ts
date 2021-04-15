import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	registerTutorialWithDidact(context, `Lesson 1: Asynchronous Communication`, `./lesson1-async.didact.md`);
	registerTutorialWithDidact(context, `Lesson 2: Data Models`, `./lesson2-datamodels.didact.md`);
	registerTutorialWithDidact(context, `Lesson 3: Adapters`, `./lesson3-adapters.didact.md`);
}

export function deactivate() { }

async function registerTutorialWithDidact(context: vscode.ExtensionContext, tutorialName: string, tutorialFile: string) {
	try {
		const extensionId = 'redhat.vscode-didact';
		const didactExt: any = vscode.extensions.getExtension(extensionId);
		if (didactExt) {
			const commandId = 'vscode.didact.register';
			const tutorialPath = path.resolve(context.extensionPath, tutorialFile);
			const tutorialUri = vscode.Uri.file(`${tutorialPath}`);
			const tutorialCategory = `Integration Architectures`;
			await vscode.commands.executeCommand(
				commandId,
				tutorialName,
				tutorialUri,
				tutorialCategory
			);
		}
	} catch (error) {
		console.log(error);
	}
}