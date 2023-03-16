// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const path = require('path');

// Note: Ensure you have a .env file and include LuisAppId, LuisAPIKey and LuisAPIHostName.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

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
const { BlobServiceClient } = require('@azure/storage-blob');

// Azure Authentication client
const storageAccount = "vumbotstorage";
const tableName = "moyaClients"
const policyNumberTableName = "policyNumber"
const SAScredential = process.env.SAScredential;
const azureSASCredential = new AzureSASCredential(SAScredential);
// const azureCredentials = new DefaultAzureCredential();
const clientTableClient = new TableClient(
    `https://${storageAccount}.table.core.windows.net/`,
    tableName,
    azureSASCredential
);
const policyNumberTableClient = new TableClient(
    `https://${storageAccount}.table.core.windows.net/`,
    policyNumberTableName,
    azureSASCredential
);
const policyScheduleBlobClient = new BlobServiceClient(
    `https://${storageAccount}.blob.core.windows.net?${SAScredential}`
);


// Import the main bot classes.
const { DialogAndWelcomeBot } = require('./bots/dialogAndWelcomeBot');
const { MainDialog } = require('./dialogs/mainDialog');
const { InceptionDialog } = require('./dialogs/inceptionDialog');
const { GeneralDialog } = require('./dialogs/generalDialog');

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

    // Send a message to the user
    await context.sendActivity(`The error "${ error }"`);
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
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
const inceptionDialog = new InceptionDialog("inceptionDialog", generalDialog, clientTableClient, policyNumberTableClient, policyScheduleBlobClient);
const dialog = new MainDialog(inceptionDialog, generalDialog, clientTableClient);
const myBot = new DialogAndWelcomeBot(conversationState, userState, dialog, clientTableClient);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});
