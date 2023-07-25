const os = require('os');

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

module.exports = { 
    debugMode, 
    addSequentialRow
}