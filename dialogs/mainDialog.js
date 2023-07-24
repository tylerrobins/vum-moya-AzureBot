const { ComponentDialog, WaterfallDialog , DialogSet, DialogTurnStatus, TextPrompt } = require('botbuilder-dialogs');

const MAIN_WATERFALL_DIALOG = 'waterfallDialog';
const TEXT_PROMPT = 'textPrompt';

class MainDialog extends ComponentDialog {
    constructor(inceptionDialog, generalDialog, awaitingPaymentDialog, clientTableClient) {
        super('mainDialog', clientTableClient);
        
        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(inceptionDialog)
            .addDialog(generalDialog)
            .addDialog(awaitingPaymentDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.actStep.bind(this),
                this.finalStep.bind(this)
        ]));
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
        this.clientTableClient = clientTableClient;
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
        console.log("RUNNING MAIN DIALOG FROM RUN")
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
    
    async actStep(stepContext) {
        console.log("ACT STEP")
        let clientDetails;
        try {
            clientDetails = await this.clientTableClient.getEntity("", stepContext.context.activity.from.id);
            console.log('Client ID is in table');
        }
        catch (err) {
            console.log(`ERROR: ${err}`)
            clientDetails = {
                partitionKey:"",
                rowKey:stepContext.context.activity.from.id,
                didNumber:"",
                firstName: "",
                lastName: "",
                idNumber: "",
                citizenship: "",
                deviceMake: "",
                deviceModel: "",
                deviceTac: "",
                displayName: "",
                moyaPay: "",
                moyaPayStatus: "",
                policyNumber:"",
                id:"",
                hasTradingName: "",
                businessName:"", 
                coverOption:"",
                businessActivity: "",
                googlePlus:"",
                pinCoords:"",
                what3Words:"",
                inceptionDate:"",
                dataPopulated: false,
                incepted:false,
                pro_rata:"",
                pro_rata_amt:"",
                premium_excl_sasria: "",
                premium_incl_sasria: "",
                premium_nett_excl_sasria: "",
                premium_nett_incl_sasria: "",
                premium_vat_excl_sasria: "",
                premium_vat_incl_sasria: "",
                street:"",
                area:"",
                suburb:"",
                postalCode:"",
                province:"",
            }
            await this.clientTableClient.createEntity(clientDetails)
            console.log('Create new client ID in table');
        }
        if (clientDetails.incepted === true) {
            return await stepContext.beginDialog('generalDialog', clientDetails)
        } else {
            console.log(`CLIENT DETAILS INCEPTED ${JSON.stringify(clientDetails.incepted)}`)
            return await stepContext.beginDialog('inceptionDialog', clientDetails);
        }
    };

    async finalStep(stepContext) {
        return await stepContext.beginDialog('mainDialog')
    }
};

module.exports.MainDialog = MainDialog;