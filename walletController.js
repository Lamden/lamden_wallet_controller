'use strict'

export default class WalletController {
    /**
     * Lamden Wallet Controller Class
     *
     * This Class interfaces with the Lamden Wallet's content script. It provids helper methods for creating a connection,
     * getting wallet info, sending transactions and retreiving tx information.
     *
     * The connection information for your DAPP can be supplied now or later by calling "sendConnection" manually.
     *
     * IMPORTANT: The window object needs to be available when creating this instance as it will attempt to create listeners.
     *
     *
     * @param {Object|undefined} connectionRequest  A connection request object
     * @param {string} connectionRequest.appName The name of your dApp
     * @param {string} connectionRequest.version Connection version. Older version will be over-written in the uers's wallet.
     * @param {string} connectionRequest.contractName The smart contract your DAPP will transact to
     * @param {string} connectionRequest.networkType Which Lamden network the approval is for (mainnet or testnet) are the only options
     * @param {string} connectionRequest.networkName Which Lamden Network, Arko being the newest.
     * @param {string} connectionRequest.logo The reletive path of an image on your webserver to use as a logo for your Lamden Wallet Linked Account
     * @param {string=} connectionRequest.background The reletive path of an image on your webserver to use as a background for your Lamden Wallet Linked Account
     * @param {string=} connectionRequest.charms.name Charm name
     * @param {string=} connectionRequest.charms.variableName Smart contract variable to pull data from
     * @param {string=} connectionRequest.charms.key Key assoicated to the value you want to lookup
     * @param {string=} connectionRequest.charms.formatAs What format the data is
     * @param {string=} connectionRequest.charms.iconPath An icon to display along with your charm
     * @fires newInfo
     * @return {WalletController}
     */
    constructor(connectionRequest = undefined) {
        this.connectionRequest = connectionRequest ? new WalletConnectionRequest(connectionRequest) : null;
        this.events = new MyEventEmitter();
        this.installed = null;
        this.locked = null;
        this.approvals = {};
        this.approved = false;
        this.verified_account = false
        this.autoTransactions = false;
        this.walletAddress = ""
        this.callbacks = {};
        this.nacl_setup = false

        document.addEventListener('lamdenWalletInfo', (e) => {
            this.installed = true;
            let data = e.detail;

            if (data){
                if (!data.errors){
                    if (typeof data.locked !== 'undefined') this.locked = data.locked

                    if (data.wallets.length > 0) this.walletAddress = data.wallets[0]
                    if (typeof data.approvals !== 'undefined' && this.connectionRequest) {

                        const { networkType, networkName } = this.connectionRequest

                        if (networkType && networkName){
                            this.approvals = data.approvals
                            let approval = null

                            if (networkName === "legacy" && networkType){
                                approval = this.approvals[networkType]
                            }else{
                                approval = this.approvals[networkName][networkType]
                            }
                            if (approval){
                                if (approval.contractName === this.connectionRequest.contractName){
                                    this.approved = true;
                                    this.autoTransactions = approval.trustedApp
                                }
                            }
                        }
                    }
                }else{
                    data.errors.forEach(err => {
                        if (err === "Wallet is Locked") this.locked = true
                    })
                }
                this.events.emit('newInfo', e.detail)
            }
        })
        document.addEventListener('lamdenWalletTxStatus', (e) => {
            const { data } = e.detail
            if (data) {
                let txResult = data

                const { errors, status, rejected, txData, txBlockResult } = txResult
    
                if (errors){
                    if (errors.length > 0) {
                        let uid  = txData ? txData.uid : undefined
    
                        if (status === "Transaction Cancelled" && rejected){
                            let rejectedTxData = JSON.parse(rejected)
                            uid = rejectedTxData.uid
                        }
                        if (uid){
                            if (this.callbacks[uid]) this.callbacks[uid](e.detail)
                        }
                    }
                }else{
                    if (txBlockResult && Object.keys(txBlockResult).length > 0){
                        const { uid } = txResult

                        if (uid && this.callbacks[uid]) this.callbacks[uid](e.detail)
                    }
                }
            }

            this.events.emit('txStatus', e.detail)
        })

        if (window){
            // Fire GetInfo when the content script is loaded
            window.addEventListener("load", this.getInfo);
        }
    }
    /**
     * Creates a "lamdenWalletGetInfo" CustomEvent to ask the Lamden Wallet for the current information.
     * This will fire the "newInfo" events.on event
     *
     * @fires newInfo
     */
    getInfo(){
        document.dispatchEvent(new CustomEvent('lamdenWalletGetInfo'));
    }
    /**
     * Check if the Lamden Wallet extention is installed in the user's broswer.
     *
     * This will fire the "newInfo" events.on event
     * @fires newInfo
     * @return {Promise} Wallet is Installed.
     */
    walletIsInstalled(){
        return new Promise((resolve, reject) => {
            const handleWalletInstalled = (e) => {
                this.installed = true;
                this.events.emit('installed', true)
                document.removeEventListener("lamdenWalletInfo", handleWalletInstalled);
                if (this.connectionRequest !== null) this.sendConnection();
                resolve(true);
            }
            document.addEventListener('lamdenWalletInfo', handleWalletInstalled, { once: true })
            this.getInfo();
            setTimeout(() => {
                if (!this.installed) resolve(false);
            }, 1000)
        })
    }
    /**
     * Store connectionRequest information but don't sent
     * If the connectionRequest object wasn't supplied to the construtor then it can be supplied or updated here
     *
     * @param {Object} connectionRequest  A connection request object
     * @return {undefined}
     */
    storeConnectionRequest(connectionRequest){
        if (!connectionRequest) throw new Error("no connection request provided")
        this.connectionRequest = new WalletConnectionRequest(connectionRequest)
    }
    /**
     * Send a connection to the Lamden Wallet for approval.
     * If the connectionRequest object wasn't supplied to the construtor then it must be supplied here.
     *
     * This will fire the "newInfo" events.on event
     * @param {Object|undefined} connectionRequest  A connection request object
     * @param {string} connectionRequest.appName The name of your dApp
     * @param {string} connectionRequest.version Connection version. Older version will be over-written in the uers's wallet.
     * @param {string} connectionRequest.contractName The smart contract your dApp will transact through
     * @param {string} connectionRequest.networkType Which Lamden network the approval is for (Mainnet or testnet)
     * @param {string} connectionRequest.networkName Which Lamden Network the tx if for (legacy or arko)
     * @param {string=} connectionRequest.background A reletive path to an image to override the default lamden wallet account background
     * @param {string} connectionRequest.logo A reletive path to an image to use as a logo in the Lamden Wallet
     * @param {string=} connectionRequest.charms.name Charm name
     * @param {string=} connectionRequest.charms.variableName Smart contract variable to pull data from
     * @param {string=} connectionRequest.charms.key Key assoicated to the value you want to lookup
     * @param {string=} connectionRequest.charms.formatAs What format the data is
     * @param {string=} connectionRequest.charms.iconPath An icon to display along with your charm
     * @fires newInfo
     * @return {Promise} The User's Lamden Wallet Account details or errors from the wallet
     */
    sendConnection(connectionRequest = undefined){
        if (connectionRequest) this.connectionRequest = new WalletConnectionRequest(connectionRequest)
        if (this.connectionRequest === null) throw new Error('No connetionRequest information.')
        return new Promise((resolve) => {
            const handleConnecionResponse = (e) => {
                this.events.emit('newInfo', e.detail)
                resolve(e.detail);
                document.removeEventListener("lamdenWalletInfo", handleConnecionResponse);
            }
            document.addEventListener('lamdenWalletInfo', handleConnecionResponse, { once: true })
            document.dispatchEvent(new CustomEvent('lamdenWalletConnect', {detail: this.connectionRequest.getInfo()}));
        })
    }
    /**
     * Creates a "lamdenWalletSendTx" event to send a transaction request to the Lamden Wallet.
     * If a callback is specified here then it will be called with the transaction result.
     *
     * This will fire the "txStatus" events.on event
     * @param {Object} tx  A connection request object
     * @param {string} tx.networkType Which Lamden network the tx is for (Mainnet or testnet)
     * @param {string} tx.stampLimit The max Stamps this tx is allowed to use. Cannot be more but can be less.
     * @param {string} tx.methodName The method on your approved smart contract to call
     * @param {string} tx.networkName Which Lamden Network the tx if for (legacy or arko)
     * @param {Object} tx.kwargs A keyword object to supply arguments to your method
     * @param {Function=} callback A function that will called and passed the tx results.
     * @fires txStatus
     */
    sendTransaction(tx, callback = undefined){
        tx.uid = new Date().toISOString()
        if (typeof callback === 'function') this.callbacks[tx.uid] = callback
        document.dispatchEvent(new CustomEvent('lamdenWalletSendTx', {detail: JSON.stringify(tx)}));
    }
    /**
     * Creates a "dappVerify" event to send challenge for the wallet to sign with the user's account.
     * If a callback is specified here then it will be called with the transaction result.
     *
     * This will fire the "dappVerified" events.on event
     * @param {string} dapp_challenge A string with a max length of 64 characters.
     * @param {Function=} callback An optional function that will provide the result of the verification.
     * @fires dappVerified
     */
    auth(dapp_challenge, callback = undefined){
        return new Promise((resolve, reject) => {
            const handleConnecionResponse = (e) => {
                try{
                    this.events.emit('auth', e.detail)
                    resolve(e.detail);
                    if (callback) callback(e.detail)
                }catch(e){
                    this.events.emit('auth', {error: e.message})
                    reject({error: e.message})
                    callback({error: e.message})
                }finally{
                    document.removeEventListener("authReturn", handleConnecionResponse);
                }

            }
            document.addEventListener('authReturn', handleConnecionResponse, { once: true })
            document.dispatchEvent(new CustomEvent('auth', {detail: JSON.stringify({dapp_challenge})}));
        })
    }
    /**
     * Returns a challenge_message from the 'dapp_challenge' and 'vault_challenge' string.
     *
     * This will fire the "dappVerified" events.on event
     * @param {string} dapp_challenge A string with a max length of 64 characters.
     * @param {string} vault_challenge A string provided in the auth() response.
     */
    get_challenge_message(dapp_challenge, vault_challenge){
        return `[VAULT_AUTH]__DAPP__${dapp_challenge}__VAULT__${vault_challenge}`
    }
  }

class WalletConnectionRequest {
    /**
     * Wallet Connection Request Class
     *
     * Validates and stores the information from a connectionRequest object.  See WalletController constructor for connection request params.
     * @param {Object} connectionRequest  - request object
     * @return {WalletConnectionRequest}
     */
    constructor(connectionRequest = {}) {
        const isUndefined = (value) => typeof value === "undefined";
        const populate = (request) => {
            Object.keys(request).forEach(p => {
                if (!isUndefined(this[p])) this[p] = request[p]
            })
        }
        this.request = connectionRequest
        this.appName = "";
        this.version = "";
        this.contractName = "";
        this.networkType = "";
        this.networkName = "legacy";
        this.logo = "";
        this.background = "";
        this.charms = []
        try{
            populate(connectionRequest)
        }catch (e){
            console.log(e)
            throw new Error(e.message)
        }
    }
    /**
     * Get a JSON string of the approval request information
     * @return {string} - JSON string of all request information
     */
    getInfo(){
        let info = {
            appName: this.appName,
            version: this.version,
            contractName: this.contractName,
            networkName: this.networkName,
            networkType: this.networkType, logo: this.logo}
        if (this.background.length > 0) info.background = this.background
        if (this.charms.length > 0) info.charms = this.charms
        return JSON.stringify(info)
    }
}


class MyEventEmitter {
    constructor() {
      this._events = {};
    }
  
    on(name, listener) {
      if (!this._events[name]) {
        this._events[name] = [];
      }
  
      this._events[name].push(listener);
    }
  
    removeListener(name, listenerToRemove) {
      if (!this._events[name]) {
        return
      }
  
      const filterListeners = (listener) => listener !== listenerToRemove;
  
      this._events[name] = this._events[name].filter(filterListeners);
    }

  
    emit(name, data) {
      if (!this._events[name]) {
        return
      }
  
      const fireCallbacks = (callback) => {
        callback(data);
      };
  
      this._events[name].forEach(fireCallbacks);
    }
  }