const { DialogBot } = require('./dialogBot');

class DialogAndWelcomeBot extends DialogBot {
    constructor(conversationState, userState, dialog, clientTableClient) {
        super(conversationState, userState, dialog, clientTableClient); // Call the base class constructor.

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    console.log(`MEMBERS ADDED: ${membersAdded[cnt].id}`)
                    // try {
                    //     await clientTableClient.getEntity("", membersAdded[cnt].id);
                    //     console.log('Client ID is in table');
                    // }
                    // catch (err) {
                    //     console.log(`ERROR: ${err}`)
                    //     const data = {
                    //         partitionKey:"",
                    //         rowKey:membersAdded[cnt].id,
                    //         didNumber:"",
                    //         firstName: "",
                    //         lastName: "",
                    //         idNumber: "",
                    //         citizenship: "",
                    //         deviceMake: "",
                    //         deviceModel: "",
                    //         deviceTac: "",
                    //         displayName: "",
                    //         moyaPay: "",
                    //         moyaPayStatus: "",
                    //         policyNumber:"",
                    //         id:"",
                    //         hasTradingName: "",
                    //         businessName:"", 
                    //         coverOption:"",
                    //         businessActivity: "",
                    //         googlePlus:"",
                    //         pinCoords:"",
                    //         what3Words:"",
                    //         inceptionDate:"",
                    //         dataPopulated: false,
                    //         incepted:false,
                    //         pro_rata:"",
                    //         pro_rata_amt:"",
                    //         premium_excl_sasria: "",
                    //         premium_incl_sasria: "",
                    //         premium_nett_excl_sasria: "",
                    //         premium_nett_incl_sasria: "",
                    //         premium_vat_excl_sasria: "",
                    //         premium_vat_incl_sasria: "",
                    //         street:"",
                    //         area:"",
                    //         suburb:"",
                    //         postalCode:"",
                    //         province:"",
                    //     }
                    //     await clientTableClient.createEntity(data)
                    //     console.log('Create new client ID in table');
                    // }
                    // await context.sendActivity("Hello, I'm a Bot.");
                    await dialog.run(context, conversationState.createProperty('DialogState'));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;