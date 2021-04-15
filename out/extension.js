"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
function activate(context) {
    registerTutorialWithDidact(context, `Lesson 1: Asynchronous Communication`, `./lesson1-async.didact.md`);
    registerTutorialWithDidact(context, `Lesson 2: Data Models`, `./lesson2-datamodels.didact.md`);
    registerTutorialWithDidact(context, `Lesson 3: Adapters`, `./lesson3-adapters.didact.md`);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function registerTutorialWithDidact(context, tutorialName, tutorialFile) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const extensionId = 'redhat.vscode-didact';
            const didactExt = vscode.extensions.getExtension(extensionId);
            if (didactExt) {
                const commandId = 'vscode.didact.register';
                const tutorialPath = path.resolve(context.extensionPath, tutorialFile);
                const tutorialUri = vscode.Uri.file(`${tutorialPath}`);
                const tutorialCategory = `Integration Architectures`;
                yield vscode.commands.executeCommand(commandId, tutorialName, tutorialUri, tutorialCategory);
            }
        }
        catch (error) {
            console.log(error);
        }
    });
}
//# sourceMappingURL=extension.js.map