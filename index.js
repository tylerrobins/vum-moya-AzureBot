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
    MemoryStorage,
    ConversationState,
    UserState
} = require('botbuilder');

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
const storageAccount = "vumstorage";
const tableName = "moyaClients"
const SAScredential = process.env.SAScredential;
// const azureCredentials = new DefaultAzureCredential();
const tableClient = new TableClient(
    `https://${storageAccount}.table.core.windows.net/`,
    tableName,
    new AzureSASCredential(SAScredential)
);

console.log(`https: ${ tableClient.url }`)
console.log(`Table: ${ tableName }`)
console.log(`SAS: ${ SAScredential }`)

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

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const generalDialog = new GeneralDialog("generalDialog");
const inceptionDialog = new InceptionDialog("inceptionDialog", generalDialog, tableClient);
const dialog = new MainDialog(inceptionDialog, generalDialog, tableClient);
const myBot = new DialogAndWelcomeBot(conversationState, userState, dialog, tableClient);

// Listen for incoming requests.
server.post('/api/messages', async (req, res) => {
    // Route received a request to adapter for processing
    await adapter.process(req, res, (context) => myBot.run(context));
});
