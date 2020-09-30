# [lamden_wallet_controller](https://github.com/Lamden/lamden_wallet_controller#readme) *0.5.0*

> An ES6 helper Class for handling the Lamden Wallet&#x27;s broswer event interface.


### walletController.js


#### constructor([connectionRequest]) 

Lamden Wallet Controller Class

This Class interfaces with the Lamden Wallet's content script. It provids helper methods for creating a connection,
getting wallet info, sending transactions and retreiving tx information.

The connection information for your DAPP can be supplied now or later by calling "sendConnection" manually.

IMPORTANT: The window object needs to be available when creating this instance as it will attempt to create listeners.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| connectionRequest | `Object`  | A connection request object | *Optional* |
| connectionRequest.appName | `string`  | The name of your dApp | &nbsp; |
| connectionRequest.version | `string`  | Connection version. Older version will be over-written in the uers's wallet. | &nbsp; |
| connectionRequest.contractName | `string`  | The smart contract your DAPP will transact to | &nbsp; |
| connectionRequest.networkType | `string`  | Which Lamden network the approval is for (mainnet or testnet) are the only options | &nbsp; |
| connectionRequest.logo | `string`  | The reletive path of an image on your webserver to use as a logo for your Lamden Wallet Linked Account | &nbsp; |
| connectionRequest.background | `string`  | The reletive path of an image on your webserver to use as a background for your Lamden Wallet Linked Account | *Optional* |
| connectionRequest.charms.name | `string`  | Charm name | *Optional* |
| connectionRequest.charms.variableName | `string`  | Smart contract variable to pull data from | *Optional* |
| connectionRequest.charms.key | `string`  | Key assoicated to the value you want to lookup | *Optional* |
| connectionRequest.charms.formatAs | `string`  | What format the data is | *Optional* |
| connectionRequest.charms.iconPath | `string`  | An icon to display along with your charm | *Optional* |




##### Returns


- `WalletController`  



#### getInfo() 

Creates a "lamdenWalletGetInfo" CustomEvent to ask the Lamden Wallet for the current information.
This will fire the "newInfo" events.on event






##### Returns


- `Void`



#### walletIsInstalled() 

Check if the Lamden Wallet extention is installed in the user's broswer.

This will fire the "newInfo" events.on event






##### Returns


- `Promise`  Wallet is Installed.



#### sendConnection([connectionRequest]) 

Send a connection to the Lamden Wallet for approval.
If the connectionRequest object wasn't supplied to the construtor then it must be supplied here.

This will fire the "newInfo" events.on event




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| connectionRequest | `Object`  | A connection request object | *Optional* |
| connectionRequest.appName | `string`  | The name of your dApp | &nbsp; |
| connectionRequest.version | `string`  | Connection version. Older version will be over-written in the uers's wallet. | &nbsp; |
| connectionRequest.contractName | `string`  | The smart contract your dApp will transact through | &nbsp; |
| connectionRequest.networkType | `string`  | Which Lamden network the approval is for (Mainnet or testnet) | &nbsp; |
| connectionRequest.background | `string`  | A reletive path to an image to override the default lamden wallet account background | *Optional* |
| connectionRequest.logo | `string`  | A reletive path to an image to use as a logo in the Lamden Wallet | &nbsp; |
| connectionRequest.charms.name | `string`  | Charm name | *Optional* |
| connectionRequest.charms.variableName | `string`  | Smart contract variable to pull data from | *Optional* |
| connectionRequest.charms.key | `string`  | Key assoicated to the value you want to lookup | *Optional* |
| connectionRequest.charms.formatAs | `string`  | What format the data is | *Optional* |
| connectionRequest.charms.iconPath | `string`  | An icon to display along with your charm | *Optional* |




##### Returns


- `Promise`  The User's Lamden Wallet Account details or errors from the wallet



#### sendTransaction(tx[, callback]) 

Creates a "lamdenWalletSendTx" event to send a transaction request to the Lamden Wallet.
If a callback is specified here then it will be called with the transaction result.

This will fire the "txStatus" events.on event




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| tx | `Object`  | A connection request object | &nbsp; |
| tx.networkType | `string`  | Which Lamden network the tx is for (Mainnet or testnet) | &nbsp; |
| tx.stampLimit | `string`  | The max Stamps this tx is allowed to use. Cannot be more but can be less. | &nbsp; |
| tx.methodName | `string`  | The method on your approved smart contract to call | &nbsp; |
| tx.kwargs | `Object`  | A keyword object to supply arguments to your method | &nbsp; |
| callback | `Function`  | A function that will called and passed the tx results. | *Optional* |




##### Returns


- `Void`



#### constructor(connectionRequest) 

Wallet Connection Request Class

Validates and stores the information from a connectionRequest object.  See WalletController constructor for connection request params.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| connectionRequest | `Object`  | - request object | &nbsp; |




##### Returns


- `WalletConnectionRequest`  



#### getInfo() 

Get a JSON string of the approval request information






##### Returns


- `string`  - JSON string of all request information




*Documentation generated with [doxdox](https://github.com/neogeek/doxdox).*
