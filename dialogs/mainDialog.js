const { ComponentDialog, WaterfallDialog , DialogSet, DialogTurnStatus, TextPrompt } = require('botbuilder-dialogs');

const MAIN_WATERFALL_DIALOG = 'waterfallDialog';
const TEXT_PROMPT = 'textPrompt';

class MainDialog extends ComponentDialog {
    constructor(inceptionDialog, generalDialog, tableClient) {
        super('mainDialog', tableClient);

        if (!inceptionDialog) throw new Error('[MainDialog]: Missing parameter \'inceptionDialog\' is required');
        if (!generalDialog) throw new Error('[MainDialog]: Missing parameter \'inceptionDialog\' is required');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(inceptionDialog)
            .addDialog(generalDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.actStep.bind(this),
                this.finalStep.bind(this)
        ]));
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
        this.tableClient = tableClient;
    }

    /**
     * The run method handles the incoming activity (in thW form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        console.log(`DIALOG CONTEXT: ${dialogContext}`);
        const results = await dialogContext.continueDialog();
        console.log(`RESULTS: ${JSON.stringify(results)}`);
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
    
    async actStep(stepContext) {
        console.log("ACT STEP")
        const clientDetails = await this.tableClient.getEntity("", stepContext.context.activity.from.id);
        console.log(`CLIENT DETAILS ID: ${clientDetails.rowKey}`);
        if (clientDetails.incepted === true) {
            return await stepContext.beginDialog('generalDialog', clientDetails)
        }
        else{
            return await stepContext.beginDialog('inceptionDialog', clientDetails);            
        }
    };

    async finalStep(stepContext) {
        return await stepContext.beginDialog('mainDialog')
    }
};

module.exports.MainDialog = MainDialog;