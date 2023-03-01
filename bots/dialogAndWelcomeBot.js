const { DialogBot } = require('./dialogBot');

class DialogAndWelcomeBot extends DialogBot {
    constructor(conversationState, userState, dialog, tableClient) {
        super(conversationState, userState, dialog, tableClient); // Call the base class constructor.

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    console.log(`MEMBERS ADDED: ${membersAdded[cnt].id}`)
                    try {
                        await tableClient.getEntity("", membersAdded[cnt].id);
                        console.log('Client ID is in table');
                    }
                    catch (err) {
                        console.log(`ERROR: ${err}`)
                        const data = {
                            partitionKey:"", 
                            rowKey:membersAdded[cnt].id, 
                            id:"", 
                            businessName:"", 
                            coverOption:"",
                            googlePlus:"",
                            pinCoords:"",
                            what3Words:"",
                            inceptionDate:"",
                            incepted:false,
                            street:"",
                            area:"",
                            suburb:"",
                            postalCode:"",
                            province:"",
                        }
                        await tableClient.createEntity(data)
                        console.log('Create new client ID in table');
                    }
                    await context.sendActivity("Hello world!");
                    console.log(`ENTITY ${JSON.stringify(await tableClient.getEntity("", membersAdded[cnt].id))}`)
                    await dialog.run(context, conversationState.createProperty('DialogState'), "TESTIIIASDAGFWA TESTING TESTING");
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;