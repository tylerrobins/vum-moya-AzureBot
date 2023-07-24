const axios = require('axios');
const { InputHints, MessageFactory} = require('botbuilder');
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');
const { TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { MainDialog } = require('./mainDialog');

const AWAITING_PAYMENT_DIALOG = 'awaitingPaymentDialog';
const TEXT_PROMPT = 'textPrompt';
const MAIN_DIALOG = 'mainDialog';

const vumAPIKey = process.env.VUM_API_KEY;

class AwaitingPaymentDialog extends CancelAndHelpDialog{
    constructor(id){
        super(id || AWAITING_PAYMENT_DIALOG);

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog('awaitingPaymentDialog', [
                this.actStep.bind(this),
                this.checkingPaymentStatusStep.bind(this),
                this.confirmCancellationStep.bind(this),
                this.finalStep.bind(this)
        ]));
        this.initialDialogId = AWAITING_PAYMENT_DIALOG;
    }

    async actStep(stepContext) {
        const clientDetails = stepContext.options;
        if(clientDetails.restartAwaitingPaymentDialog){
            return await stepContext.next();
        }
        console.log("\n\nAwaitingPaymentDialog.actStep\n\n");
        const messageText = "Kindly make payment to receive your Policy Schedule and activate your cover";
        const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
    }

    async checkingPaymentStatusStep(stepContext) {
        const result = stepContext.result
        const clientDetails = stepContext.options;
        if (result === "PAYMENT APPROVED_xa#r5Go9t") {
            clientDetails.incepted = true;
            return await stepContext.beginDialog(MAIN_DIALOG, clientDetails);
        } else if (result === "PAYMENT CANCELED_xa#r5Go9t" || clientDetails.restartAwaitingPaymentDialog) {
            const messageText = "Your payment has been cancelled.\nWould you like the payment to be processed again?\nA- Yes\nB- No";
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        } else {
            stepContext.context.sendActivity("Your payment has not yet been received.");
            clientDetails.restartAwaitingPaymentDialog = true;
            return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG, clientDetails);
        }
    }

    async confirmCancellationStep(stepContext) {
        const result = stepContext.result;
        const clientDetails = stepContext.options;
        if (result === "A" || result === "a") {
            // LOGIC TO REPROCESS PAYMENT
            let populated_data_result = await VUMWebAppPostRequest(`https://vum-webapp-node.azurewebsites.net/populatePolicyData/`, clientDetails)
            clientDetails.pro_rata = populated_data_result.data.pro_rata;
            clientDetails.premium_due = populated_data_result.data.premium_due;
            clientDetails.policyNumber = populated_data_result.data.policyNumber;
            let proRataText = "";
            if (clientDetails.pro_rata) {
                proRataText = `the pro rata and the first months premium of R ${clientDetails.premium_due}`;
            } else {
                proRataText = `the first months premium of R ${clientDetails.premium_due}`;
            }
            await stepContext.context.sendActivity(`Your payment has been reinitiated, and your Policy will be incepted when your pay ${proRataText}`);
            return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG, clientDetails);
        } else if (result === "B" || result === "b") {
            const messageText = "Please note that if you do not make payment, your policy will not be incepted and you wont enjoy cover.\nA - Make Payment\nB - Cancel Policy Inception";
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        }
        else {
            stepContext.context.sendActivity("Please select a valid option.");
            clientDetails.restartAwaitingPaymentDialog = true;
            return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG, clientDetails);
        }
    }

    async finalStep(stepContext) {
        const result = stepContext.result;
        const clientDetails = stepContext.options;
        if (result === "A" || result === "a") {
            // LOGIC TO REPROCESS PAYMENT
            let populated_data_result = await VUMWebAppPostRequest(`https://vum-webapp-node.azurewebsites.net/populatePolicyData/`, clientDetails)
            clientDetails.pro_rata = populated_data_result.data.pro_rata;
            clientDetails.premium_due = populated_data_result.data.premium_due;
            clientDetails.policyNumber = populated_data_result.data.policyNumber;
            let proRataText = "";
            if (clientDetails.pro_rata) {
                proRataText = `the pro rata and the first months premium of R ${clientDetails.premium_due}`;
            } else {
                proRataText = `the first months premium of R ${clientDetails.premium_due}`;
            }
            await stepContext.context.sendActivity(`Your payment has been reinitiated, and your Policy will be incepted when your pay ${proRataText}`);
            return await stepContext.beginDialog(AWAITING_PAYMENT_DIALOG, clientDetails);
        }
        else if (result === "B" || result === "b") {
            const messageText = "Your policy will not be incepted.\nKindly restart the process should you wish to incept your policy.";
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            await stepContext.context.sendActivity(msg);
            return await stepContext.endDialog();
        }
    }   
}

async function VUMWebAppPostRequest(endpoint, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const url = endpoint + data.rowKey;
            console.log(`URL CREATED: ${url}`)
            const response = await axios.post(url, data, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${vumAPIKey}`,
              },
            });
      
            resolve(response.data);
          } catch (error) {
            console.error('Error while making the POST request:', error);
            reject(error);
          }
        });
}


module.exports.AwaitingPaymentDialog = AwaitingPaymentDialog;