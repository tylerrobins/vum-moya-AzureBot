const { ComponentDialog, WaterfallDialog , DialogSet, DialogTurnStatus, TextPrompt } = require('botbuilder-dialogs');

const MAIN_WATERFALL_DIALOG = 'waterfallDialog';
const TEXT_PROMPT = 'textPrompt';

class MainDialog extends ComponentDialog {
    constructor(inceptionDialog, generalDialog) {
        super('mainDialog');

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
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
    
    async actStep(stepContext) {
        console.log("ACT STEP")
        const clientDetails = {
            coverOption: 'A',
            businessName: 'Test Business',
            businessLocation:{
                pincoords:"-29.7962478,30.7905995",
                googlePlus:"5G2G6Q3R+G65",
                what3Words:"passport.dishwater.reconvenes",
                    address:{
                        street:"Old Main Road",
                        suburb:"Clifton Park",
                        area:"Gillitts",
                        province:"KwaZulu-Natal",
                        postalCode:"South Africa"
                    }
                },
            // inceptionDate: '2023-07-01',
            // incepted: false
        };
        console.log(`CLIENT DETAILS INCEPTION: ${clientDetails.incepted}`)
        if (clientDetails.incepted === true) {
            return await stepContext.beginDialog('generalDialog', clientDetails)
        }
        else{
            return await stepContext.beginDialog('inceptionDialog', clientDetails);            
        }
    }

    async finalStep(stepContext) {
        // const result = stepContext.result;
        // console.log(`RESULT: ${JSON.stringify(result)}`)
        // console.log(`BUSINESS LOCATION: ${JSON.stringify(result.businessLocation.pincoords)}`)
        // await stepContext.context.sendActivity(`The information you have provided is as follows:\n\nCover Option: ${result.coverOption}\n\nBusiness Name: ${result.businessName}\n\nPin Location: ${result.businessLocation.pincoords}\n\nGoogle Plus: ${result.businessLocation.googlePlus}\n\nWhat3Words: ${result.businessLocation.what3Words}\n\nStreet: ${result.businessLocation.address.street}\n\nArea: ${result.businessLocation.address.area}\n\nSuburb: ${result.businessLocation.address.suburb}\n\nPostal_Code: ${result.businessLocation.address.postalCode}\n\nProvince: ${result.businessLocation.address.province}\n\nInception Date: ${result.inceptionDate}`);
        return await stepContext.beginDialog('mainDialog')
    }
};

module.exports.MainDialog = MainDialog;