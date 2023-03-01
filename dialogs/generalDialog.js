const axios = require('axios');
const { InputHints, MessageFactory, ActivityTypes } = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const GENERAL_DIALOG = 'generalDialog';
const TEXT_PROMPT = 'textPrompt';

class GeneralDialog extends CancelAndHelpDialog {
    constructor(id) {
        super(id || GENERAL_DIALOG);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog(GENERAL_DIALOG, [
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = GENERAL_DIALOG;
    }

    async actStep(stepContext) {
       const messageText = "How can I help you today?";
       const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
       return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
    }

    async finalStep(stepContext) {
        return await stepContext.beginDialog(GENERAL_DIALOG);
    }
}


module.exports.GeneralDialog = GeneralDialog;