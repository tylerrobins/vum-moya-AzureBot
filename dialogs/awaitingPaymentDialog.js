const { InputHints, MessageFactory} = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const AWAITING_PAYMENT_DIALOG = 'awaitingPaymentDialog';
const TEXT_PROMPT = 'textPrompt';

class AwaitingPaymentDialog extends CancelAndHelpDialog{
    constructor(id){
        super(id || AWAITING_PAYMENT_DIALOG);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog('awaitingPaymentDialog', [
                this.actStep.bind(this),
                this.finalStep.bind(this)
        ]));
        this.initialDialogId = AWAITING_PAYMENT_DIALOG;
    }

    async actStep(stepContext) {
        const result = stepContext.result
        const messageText = `Result is ${result}`;
        const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
    }

    async finalStep(stepContext) {
        return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG);
    }
}

module.exports.AwaitingPaymentDialog = AwaitingPaymentDialog;