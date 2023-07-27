// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');
const os = require('os');

// Note: Ensure you have a .env file and include LuisAppId, LuisAPIKey and LuisAPIHostName.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });


// DEBUG MODE
const { debug, webAppEndpoint } = debugMode();

// Import required bot services.
const restify = require('restify');
const {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration,
    ConversationState,
    UserState
} = require('botbuilder');
const { CosmosDbPartitionedStorage } = require('botbuilder-azure');

// Import required bot configuration and setup credentials.
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppType: process.env.MicrosoftAppType,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});
const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Azure required imports
const { TableClient, AzureSASCredential } = require('@azure/data-tables');

// Azure Authentication client
const storageAccount = "vumbotstorage";
const tableName = "moyaClients";
const errorLogTableName = "errorLogs";
const SAScredential = process.env.SAScredential;
const azureSASCredential = new AzureSASCredential(SAScredential);

// const azureCredentials = new DefaultAzureCredential();
const clientTableClient = new TableClient(
    `https://${storageAccount}.table.core.windows.net/`,
    tableName,
    azureSASCredential
);
const errorLogTable = new TableClient(
    `https://${storageAccount}.table.core.windows.net/`,
    errorLogTableName,
    azureSASCredential
);

// Import the main bot classes.
const { DialogAndWelcomeBot } = require('./bots/dialogAndWelcomeBot');
const { MainDialog } = require('./dialogs/mainDialog');
const { InceptionDialog } = require('./dialogs/inceptionDialog');
const { GeneralDialog } = require('./dialogs/generalDialog');
const { AwaitingPaymentDialog } = require('./dialogs/awaitingPaymentDialog');

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
});

// Create adapter.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );
    
    try{
        let errorData = {participantId: context.activity.from.id, conversationId: context.activity.conversation.id, error: error, activity: context.activity.text, timestamp: new Date()}
        addSequentialRow(errorLogTable, errorData);
    } catch {
        console.log("ERROR IN LOGGING ERROR!!!!!")
    }
    if(debug == "true"){
        await context.sendActivity(`\n [onTurnError] unhandled error: ${ error }`);
    }
    // Send a message to the user
    await context.sendActivity("There has been an error processing your request, apologies for the inconvenience.\nWe will be in contact with your shortly to rectify it.");
};

const memoryStorage = new CosmosDbPartitionedStorage({
    cosmosDbEndpoint: process.env.CosmosDbEndpoint,
    authKey: process.env.CosmosDbAuthKey,
    databaseId: process.env.CosmosDbDatabaseId,
    containerId: process.env.CosmosDbContainerId,
    compatibilityMode: false
});
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const generalDialog = new GeneralDialog("generalDialog");
const awaitingPaymentDialog = new AwaitingPaymentDialog("awaitingPaymentDialog");
const inceptionDialog = new InceptionDialog("inceptionDialog",userState, conversationState);
const dialog = new MainDialog(inceptionDialog, generalDialog, awaitingPaymentDialog, clientTableClient);
const myBot = new DialogAndWelcomeBot(conversationState, userState, dialog);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});

// Listen for Health Check requests
server.get('/api/health', (req, res, next) => {
    res.send(200, 'Healthy');
    next();
});

async function addSequentialRow(tableClient, data) {
    // Query the table to find the highest existing RowKey.
    const tableEntities = tableClient.listEntities({
      queryOptions: { filter: `PartitionKey eq ''` },
      select: ["RowKey"]
    });
  
    let maxRowKey = 0;
  
    for await (const entity of tableEntities) {
      let rowKey = parseInt(entity.rowKey);
      if (rowKey > maxRowKey) {
        maxRowKey = rowKey;
      }
    }
  
    // Increment maxRowKey by 1 for the new row.
    const newRowKey = maxRowKey + 1;
  
    // Create a new row with the given data, plus the new RowKey.
    const newRow = { ...data, partitionKey:'', rowKey: newRowKey.toString()};
    const createEntityResponse = await tableClient.createEntity(newRow);
  
    return createEntityResponse;
}

function debugMode(){
    let debug = process.env.DEBUG_MODE;
    let webAppEndpoint;
    // Checking to make sure that debug isn't running while not in local host
    if (os.hostname() === "localhost" || os.hostname() === "127.0.0.1" || os.hostname() === "Kingsley-PC") {
        debug = process.env.DEBUG_MODE === "true" ? true: false;
    } else {
        debug = false;
    }
    webAppEndpoint = debug ? process.env.DEBUG_WEB_APP_ENDPOINT : process.env.WEB_APP_ENDPOINT;
    return {debug, webAppEndpoint}
}